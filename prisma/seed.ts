import "dotenv/config";
import { PrismaClient, UserRole, EquipmentStatus, AttendanceStatus } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";

// ══════════════════════════════════════════════════════════
//  IRONFORGED GYM — COMPREHENSIVE DATABASE SEEDER
//  Reads legacy text files from the `data base` directory
//  and migrates all records to Neon PostgreSQL via Prisma.
// ══════════════════════════════════════════════════════════

// ─── Constants ───────────────────────────────────────────

const DATA_DIR = path.resolve("D:\\Personal\\web\\ironforged-modern\\data_base");

// ─── Database Connection ─────────────────────────────────

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");

  if (url.startsWith("prisma+postgres://")) {
    const parsed = new URL(url);
    const apiKey = parsed.searchParams.get("api_key");
    if (!apiKey) throw new Error("api_key not found in DATABASE_URL.");
    return JSON.parse(Buffer.from(apiKey, "base64").toString()).databaseUrl;
  }

  return url;
}

const connectionString = resolveDatabaseUrl();
console.log(`\n🔌  Database: ${connectionString.split("?")[0]}\n`);

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ─── Helper: Deterministic UUID Mapping ──────────────────
// Legacy integer ID "1" → "00000000-0000-0000-0000-000000000001"
// Preserves FK relationships across all tables.

function legacyIdToUuid(legacyId: string | number): string {
  const numeric = typeof legacyId === "number" ? legacyId : parseInt(legacyId, 10);
  if (isNaN(numeric)) throw new Error(`Invalid legacy ID: "${legacyId}"`);
  return `00000000-0000-0000-0000-${numeric.toString().padStart(12, "0")}`;
}

// ─── Helper: Parse Pipe-Delimited Lines ──────────────────

function readPipeFile(filename: string): string[][] {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${filename}`);
    return [];
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim() !== "");

  return lines
    .filter((line) => {
      const t = line.trim();
      return !t.startsWith("---") && !t.startsWith("ID") &&
        !t.startsWith("USER_ID") && !t.startsWith("CLASS_ID") &&
        !t.startsWith("STUDENT_ID") && !t.startsWith("JSON_LINES");
    })
    .map((line) => line.split("|").map((p) => p.trim()));
}

// ─── Helper: Read JSON Lines File ────────────────────────

function readJsonLinesFile(filename: string): Record<string, unknown>[] {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${filename}`);
    return [];
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim() !== "");

  return lines
    .filter((line) => {
      const t = line.trim();
      return !t.startsWith("JSON_LINES") && !t.startsWith("---");
    })
    .map((line) => {
      try {
        return JSON.parse(line.trim()) as Record<string, unknown>;
      } catch {
        console.warn(`⚠️  Invalid JSON line, skipping: ${line.slice(0, 80)}...`);
        return null;
      }
    })
    .filter((obj): obj is Record<string, unknown> => obj !== null);
}

// ─── Helper: Parse Legacy Date ───────────────────────────
// Format: DD/MM/YYYY HH:mm:ss

function parseLegacyDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const [datePart, timePart] = dateStr.trim().split(" ");
  const [day, month, year] = datePart.split("/").map(Number);
  const [hours, minutes, seconds] = timePart ? timePart.split(":").map(Number) : [0, 0, 0];
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

// ─── Helper: Normalize Role ──────────────────────────────

function normalizeRole(raw: string): UserRole {
  const lower = raw.trim().toLowerCase();
  if (lower.startsWith("admin")) return "ADMIN";
  if (lower.startsWith("coach")) return "COACH";
  return "MEMBER";
}

// ─── Helper: Map Equipment Status ────────────────────────
// Legacy: "bg-ok" → OPERATIONAL, "bg-repair" → UNDER_REPAIR

function mapEquipmentStatus(raw: string): EquipmentStatus {
  const lower = raw.trim().toLowerCase();
  if (lower.includes("repair")) return "UNDER_REPAIR";
  if (lower.includes("out") || lower.includes("order")) return "OUT_OF_ORDER";
  return "OPERATIONAL";
}

// ─── Helper: Equipment String ID → UUID ──────────────────
// "EQ-001" → deterministic UUID based on the string

function equipmentIdToUuid(equipmentId: string): string {
  let hash = 0;
  for (let i = 0; i < equipmentId.length; i++) {
    const char = equipmentId.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(12, "0");
  return `e0000000-0000-0000-0000-${hex.slice(0, 12)}`;
}

// ─── Helper: Map Attendance Status ───────────────────────

function mapAttendanceStatus(raw: string): AttendanceStatus {
  const lower = raw.trim().toLowerCase();
  if (lower === "present") return "PRESENT";
  if (lower === "late") return "LATE";
  return "ABSENT";
}

// ─── Counters ────────────────────────────────────────────

const stats = {
  users: { created: 0, updated: 0, skipped: 0 },
  classes: { created: 0, updated: 0, skipped: 0 },
  enrollments: { created: 0, skipped: 0 },
  equipment: { created: 0, updated: 0, skipped: 0 },
  attendance: { created: 0, skipped: 0 },
  groupWorkouts: { created: 0, skipped: 0 },
  individualWorkouts: { created: 0, skipped: 0 },
  messages: { created: 0, skipped: 0 },
};

// ══════════════════════════════════════════════════════════
//  STEP 1: USERS
// ══════════════════════════════════════════════════════════

async function seedUsers(): Promise<Map<string, string>> {
  console.log("─── STEP 1/8: SEEDING USERS ───");

  const rows = readPipeFile("users.txt");
  const emailToUuid = new Map<string, string>();

  for (const parts of rows) {
    if (parts.length < 8) {
      console.warn(`⚠️  [USERS] Malformed row (${parts.length} cols), skipping: ${parts[0] || "?"}`);
      stats.users.skipped++;
      continue;
    }

    const [id, name, email, password, goal, dateTimeStr, ipAddress, role] = parts;
    const normalizedEmail = email.toLowerCase();
    const uuid = legacyIdToUuid(id);
    const userRole = normalizeRole(role);
    const createdAt = parseLegacyDate(dateTimeStr);
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });

      await prisma.user.upsert({
        where: { email: normalizedEmail },
        create: {
          id: uuid,
          name,
          email: normalizedEmail,
          password: hashedPassword,
          goal: goal || null,
          role: userRole,
          ipAddress: ipAddress || null,
          createdAt,
        },
        update: {
          name,
          password: hashedPassword,
          goal: goal || null,
          role: userRole,
          ipAddress: ipAddress || null,
        },
      });

      emailToUuid.set(normalizedEmail, uuid);
      if (existing) stats.users.updated++;
      else stats.users.created++;
    } catch (err) {
      console.error(`❌  [USER] ${name} <${normalizedEmail}>: ${(err as Error).message?.slice(0, 120)}`);
      stats.users.skipped++;
    }
  }

  console.log(`    ✅ Created: ${stats.users.created} | Updated: ${stats.users.updated} | Skipped: ${stats.users.skipped}\n`);
  return emailToUuid;
}

// ══════════════════════════════════════════════════════════
//  STEP 2: GYM CLASSES
// ══════════════════════════════════════════════════════════

async function seedClasses(): Promise<Map<string, string>> {
  console.log("─── STEP 2/8: SEEDING CLASSES ───");

  const rows = readPipeFile("classes.txt");
  const classNameToUuid = new Map<string, string>();
  const nameToUuid = new Map<string, string>();

  // Build a name→UUID lookup for coaches by querying existing users
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  });
  for (const u of allUsers) {
    nameToUuid.set(u.name.toLowerCase(), u.id);
  }

  for (const parts of rows) {
    if (parts.length < 5) {
      console.warn(`⚠️  [CLASS] Malformed row, skipping: ${parts.join("|")}`);
      stats.classes.skipped++;
      continue;
    }

    const [id, className, instructor, timeSlots, capacity] = parts;
    const uuid = legacyIdToUuid(id);

    // Resolve coachId by matching instructor name to a User
    const instructorLower = instructor.toLowerCase();
    let coachId = nameToUuid.get(instructorLower);

    // Fuzzy fallback: find any user whose name contains the instructor name
    if (!coachId) {
      const match = allUsers.find((u) =>
        u.name.toLowerCase().includes(instructorLower) ||
        instructorLower.includes(u.name.toLowerCase())
      );
      if (match) coachId = match.id;
    }

    if (!coachId) {
      // Fallback: use the first coach user
      const anyCoach = allUsers.find((u) => u.id);
      coachId = anyCoach?.id;
    }

    if (!coachId) {
      console.warn(`⚠️  [CLASS] No coach found for "${instructor}", skipping class "${className}"`);
      stats.classes.skipped++;
      continue;
    }

    try {
      const existing = await prisma.gymClass.findUnique({
        where: { id: uuid },
        select: { id: true },
      });

      await prisma.gymClass.upsert({
        where: { id: uuid },
        create: {
          id: uuid,
          className,
          timeSlots,
          capacity: parseInt(capacity, 10) || 20,
          coachId,
        },
        update: {
          className,
          timeSlots,
          capacity: parseInt(capacity, 10) || 20,
          coachId,
        },
      });

      classNameToUuid.set(className.toLowerCase(), uuid);
      if (existing) stats.classes.updated++;
      else stats.classes.created++;
      console.log(`    ✅ [${id}] ${className} — Coach: ${instructor} (${timeSlots})`);
    } catch (err) {
      console.error(`❌  [CLASS] ${className}: ${(err as Error).message?.slice(0, 120)}`);
      stats.classes.skipped++;
    }
  }

  console.log(`    ✅ Created: ${stats.classes.created} | Updated: ${stats.classes.updated} | Skipped: ${stats.classes.skipped}\n`);
  return classNameToUuid;
}

// ══════════════════════════════════════════════════════════
//  STEP 3: ENROLLMENTS
// ══════════════════════════════════════════════════════════

async function seedEnrollments(knownUserUuids: Set<string>, knownClassUuids: Set<string>) {
  console.log("─── STEP 3/8: SEEDING ENROLLMENTS ───");

  const rows = readPipeFile("enrollments.txt");

  for (const parts of rows) {
    if (parts.length < 3) {
      stats.enrollments.skipped++;
      continue;
    }

    const [userIdStr, classIdStr, _dateEnrolled] = parts;
    const userUuid = legacyIdToUuid(userIdStr);
    const classUuid = legacyIdToUuid(classIdStr);

    // Skip FK violations — user or class doesn't exist
    if (!knownUserUuids.has(userUuid)) {
      stats.enrollments.skipped++;
      continue;
    }
    if (!knownClassUuids.has(classUuid)) {
      stats.enrollments.skipped++;
      continue;
    }

    try {
      await prisma.enrollment.upsert({
        where: { userId_classId: { userId: userUuid, classId: classUuid } },
        create: { userId: userUuid, classId: classUuid },
        update: {},
      });
      stats.enrollments.created++;
    } catch (err) {
      console.error(`❌  [ENROLLMENT] User ${userIdStr} → Class ${classIdStr}: ${(err as Error).message?.slice(0, 100)}`);
      stats.enrollments.skipped++;
    }
  }

  console.log(`    ✅ Created: ${stats.enrollments.created} | Skipped: ${stats.enrollments.skipped}\n`);
}

// ══════════════════════════════════════════════════════════
//  STEP 4: EQUIPMENT
// ══════════════════════════════════════════════════════════

async function seedEquipment() {
  console.log("─── STEP 4/8: SEEDING EQUIPMENT ───");

  const records = readJsonLinesFile("equipment.txt");

  for (const rec of records) {
    const rawId = rec.id as string;
    const name = rec.name as string;
    const rawStatus = rec.status as string;
    const notes = (rec.notes as string) || null;
    const dateStr = rec.date as string;

    if (!rawId || !name) {
      stats.equipment.skipped++;
      continue;
    }

    const id = equipmentIdToUuid(rawId);
    const status = mapEquipmentStatus(rawStatus);
    const date = dateStr ? new Date(dateStr) : new Date();

    try {
      const existing = await prisma.equipment.findUnique({
        where: { id },
        select: { id: true },
      });

      await prisma.equipment.upsert({
        where: { id },
        create: { id, name, status, notes, date },
        update: { name, status, notes, date },
      });

      if (existing) stats.equipment.updated++;
      else stats.equipment.created++;
    } catch (err) {
      console.error(`❌  [EQUIPMENT] ${name}: ${(err as Error).message?.slice(0, 100)}`);
      stats.equipment.skipped++;
    }
  }

  console.log(`    ✅ Created: ${stats.equipment.created} | Updated: ${stats.equipment.updated} | Skipped: ${stats.equipment.skipped}\n`);
}

// ══════════════════════════════════════════════════════════
//  STEP 5: ATTENDANCE
// ══════════════════════════════════════════════════════════

async function seedAttendance(knownUserUuids: Set<string>, knownClassUuids: Set<string>) {
  console.log("─── STEP 5/8: SEEDING ATTENDANCE ───");

  const records = readJsonLinesFile("attendance.txt");

  for (const rec of records) {
    const classId = String(rec.classId || "");
    const studentId = String(rec.studentId || "");
    const rawStatus = String(rec.status || "Absent");
    const dateStr = String(rec.date || "");
    const savedAtStr = String(rec.savedAt || "");

    const classUuid = legacyIdToUuid(classId);
    const studentUuid = legacyIdToUuid(studentId);

    if (!knownClassUuids.has(classUuid)) {
      stats.attendance.skipped++;
      continue;
    }
    if (!knownUserUuids.has(studentUuid)) {
      stats.attendance.skipped++;
      continue;
    }

    const status = mapAttendanceStatus(rawStatus);
    const date = dateStr ? new Date(dateStr) : new Date();
    const savedAt = savedAtStr ? new Date(savedAtStr) : new Date();

    try {
      // Deduplicate: skip if same student+class+date already exists
      const existingAtt = await prisma.attendance.findFirst({
        where: { classId: classUuid, studentId: studentUuid, date },
        select: { id: true },
      });
      if (existingAtt) {
        stats.attendance.skipped++;
        continue;
      }

      await prisma.attendance.create({
        data: {
          classId: classUuid,
          studentId: studentUuid,
          status,
          date,
          savedAt,
        },
      });
      stats.attendance.created++;
    } catch (err) {
      console.error(`❌  [ATTENDANCE] Student ${studentId} → Class ${classId}: ${(err as Error).message?.slice(0, 100)}`);
      stats.attendance.skipped++;
    }
  }

  console.log(`    ✅ Created: ${stats.attendance.created} | Skipped: ${stats.attendance.skipped}\n`);
}

// ══════════════════════════════════════════════════════════
//  STEP 6: GROUP WORKOUTS
// ══════════════════════════════════════════════════════════

async function seedGroupWorkouts(knownClassUuids: Set<string>) {
  console.log("─── STEP 6/8: SEEDING GROUP WORKOUTS ───");

  const rows = readPipeFile("workouts.txt");

  for (const parts of rows) {
    if (parts.length < 3) {
      stats.groupWorkouts.skipped++;
      continue;
    }

    const [classIdStr, dateStr, jsonPayload] = parts;
    const classUuid = legacyIdToUuid(classIdStr);

    if (!knownClassUuids.has(classUuid)) {
      stats.groupWorkouts.skipped++;
      continue;
    }

    const date = parseLegacyDate(dateStr);

    // Parse the JSON payload — could be an array or object
    let workoutData: unknown;
    try {
      workoutData = JSON.parse(jsonPayload);
    } catch {
      workoutData = jsonPayload;
    }

    try {
      // Deduplicate: skip if same class+date already exists
      const existingGw = await prisma.groupWorkout.findFirst({
        where: { classId: classUuid, date },
        select: { id: true },
      });
      if (existingGw) {
        stats.groupWorkouts.skipped++;
        continue;
      }

      await prisma.groupWorkout.create({
        data: {
          classId: classUuid,
          date,
          workoutJson: workoutData as any,
          createdAt: new Date(),
        },
      });
      stats.groupWorkouts.created++;
    } catch (err) {
      console.error(`❌  [GROUP_WORKOUT] Class ${classIdStr} @ ${dateStr}: ${(err as Error).message?.slice(0, 100)}`);
      stats.groupWorkouts.skipped++;
    }
  }

  console.log(`    ✅ Created: ${stats.groupWorkouts.created} | Skipped: ${stats.groupWorkouts.skipped}\n`);
}

// ══════════════════════════════════════════════════════════
//  STEP 7: INDIVIDUAL WORKOUTS
// ══════════════════════════════════════════════════════════

async function seedIndividualWorkouts(knownUserUuids: Set<string>) {
  console.log("─── STEP 7/8: SEEDING INDIVIDUAL WORKOUTS ───");

  const rows = readPipeFile("individual_notes.txt");

  for (const parts of rows) {
    if (parts.length < 3) {
      stats.individualWorkouts.skipped++;
      continue;
    }

    const [studentIdStr, dateStr, jsonPayload] = parts;
    const studentUuid = legacyIdToUuid(studentIdStr);

    if (!knownUserUuids.has(studentUuid)) {
      stats.individualWorkouts.skipped++;
      continue;
    }

    const date = parseLegacyDate(dateStr);

    let workoutData: unknown;
    try {
      workoutData = JSON.parse(jsonPayload);
    } catch {
      workoutData = jsonPayload;
    }

    try {
      // Deduplicate: skip if same student+date already exists
      const existingIw = await prisma.individualWorkout.findFirst({
        where: { studentId: studentUuid, date },
        select: { id: true },
      });
      if (existingIw) {
        stats.individualWorkouts.skipped++;
        continue;
      }

      await prisma.individualWorkout.create({
        data: {
          studentId: studentUuid,
          date,
          workoutJson: workoutData as any,
          createdAt: new Date(),
        },
      });
      stats.individualWorkouts.created++;
    } catch (err) {
      console.error(`❌  [IND_WORKOUT] Student ${studentIdStr} @ ${dateStr}: ${(err as Error).message?.slice(0, 100)}`);
      stats.individualWorkouts.skipped++;
    }
  }

  console.log(`    ✅ Created: ${stats.individualWorkouts.created} | Skipped: ${stats.individualWorkouts.skipped}\n`);
}

// ══════════════════════════════════════════════════════════
//  STEP 8: MESSAGES
// ══════════════════════════════════════════════════════════

async function seedMessages(knownUserUuids: Set<string>) {
  console.log("─── STEP 8/8: SEEDING MESSAGES ───");

  const records = readJsonLinesFile("messages.txt");

  if (records.length === 0) {
    console.log("    ℹ️  No messages found in messages.txt (file is empty or headers only).\n");
    return;
  }

  for (const rec of records) {
    const content = String(rec.content || "");
    const type = String(rec.type || "public").toLowerCase() === "private" ? "PRIVATE" : "PUBLIC";
    const fromId = String(rec.fromId || "");
    const fromName = String(rec.fromName || "");
    const targetId = rec.targetId ? String(rec.targetId) : null;
    const targetName = rec.targetName ? String(rec.targetName) : null;
    const createdAt = rec.createdAt ? new Date(String(rec.createdAt)) : new Date();

    if (!content || !fromId) {
      stats.messages.skipped++;
      continue;
    }

    const senderUuid = legacyIdToUuid(fromId);
    if (!knownUserUuids.has(senderUuid)) {
      stats.messages.skipped++;
      continue;
    }

    const receiverUuid = targetId ? legacyIdToUuid(targetId) : null;

    try {
      await prisma.message.create({
        data: {
          content,
          type: type as "PUBLIC" | "PRIVATE",
          fromId: senderUuid,
          fromName,
          targetId: receiverUuid,
          targetName,
          createdAt,
        },
      });
      stats.messages.created++;
    } catch (err) {
      console.error(`❌  [MESSAGE] From ${fromName}: ${(err as Error).message?.slice(0, 100)}`);
      stats.messages.skipped++;
    }
  }

  console.log(`    ✅ Created: ${stats.messages.created} | Skipped: ${stats.messages.skipped}\n`);
}

// ══════════════════════════════════════════════════════════
//  MAIN EXECUTION
// ══════════════════════════════════════════════════════════

async function main() {
  console.log("╔═══════════════════════════════════════════════╗");
  console.log("║   IRONFORGED GYM — DATABASE SEEDER v2.0      ║");
  console.log("║   Source: " + DATA_DIR.slice(-35).padEnd(35) + "║");
  console.log("╚═══════════════════════════════════════════════╝\n");

  // ── Step 1: Users ──
  const emailToUuid = await seedUsers();

  // Build a reverse lookup: legacy numeric ID → UUID
  // We need this because enrollments reference user IDs, not emails
  const allUsers = await prisma.user.findMany({ select: { id: true } });
  const knownUserUuids = new Set(allUsers.map((u) => u.id));

  // ── Step 2: Classes ──
  const classNameToUuid = await seedClasses();

  // Build known class UUIDs set
  const allClasses = await prisma.gymClass.findMany({ select: { id: true } });
  const knownClassUuids = new Set(allClasses.map((c) => c.id));

  // ── Step 3: Enrollments ──
  await seedEnrollments(knownUserUuids, knownClassUuids);

  // ── Step 4: Equipment ──
  await seedEquipment();

  // ── Step 5: Attendance ──
  await seedAttendance(knownUserUuids, knownClassUuids);

  // ── Step 6: Group Workouts ──
  await seedGroupWorkouts(knownClassUuids);

  // ── Step 7: Individual Workouts ──
  await seedIndividualWorkouts(knownUserUuids);

  // ── Step 8: Messages ──
  await seedMessages(knownUserUuids);

  // ── Final Summary ──
  console.log("╔═══════════════════════════════════════════════╗");
  console.log("║            SEED COMPLETE — SUMMARY           ║");
  console.log("╠═══════════════════════════════════════════════╣");
  console.log(`║  Users:          ${String(stats.users.created).padStart(4)} created  ${String(stats.users.updated).padStart(4)} updated ║`);
  console.log(`║  Classes:        ${String(stats.classes.created).padStart(4)} created  ${String(stats.classes.updated).padStart(4)} updated ║`);
  console.log(`║  Enrollments:    ${String(stats.enrollments.created).padStart(4)} created                    ║`);
  console.log(`║  Equipment:      ${String(stats.equipment.created).padStart(4)} created  ${String(stats.equipment.updated).padStart(4)} updated ║`);
  console.log(`║  Attendance:     ${String(stats.attendance.created).padStart(4)} created                    ║`);
  console.log(`║  Group Workouts: ${String(stats.groupWorkouts.created).padStart(4)} created                    ║`);
  console.log(`║  Ind. Workouts:  ${String(stats.individualWorkouts.created).padStart(4)} created                    ║`);
  console.log(`║  Messages:       ${String(stats.messages.created).padStart(4)} created                    ║`);
  console.log("╚═══════════════════════════════════════════════╝\n");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("\n❌  Fatal seed error:", err);
  prisma.$disconnect();
  process.exit(1);
});
