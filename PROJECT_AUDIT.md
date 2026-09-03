# PROJECT_AUDIT.md — MERIDIAN (IRONFORGED)

> Full technical audit for standards review. Generated 2026-09-03.

---

## 1. Tech Stack

- **Framework:** Next.js `16.2.10` — **App Router** (all routes in `src/app/`)
- **React:** `19.2.4`
- **TypeScript:** `^5` — **Strict mode enabled** (`"strict": true` in `tsconfig.json`)
- **Tailwind CSS:** `^4` — CSS-first config (no `tailwind.config.js`/`.ts`); PostCSS plugin: `@tailwindcss/postcss`
- **ORM:** Prisma `^7.8.0` (`@prisma/client ^7.8.0`, `prisma ^7.8.0`)
- **Database:** Neon PostgreSQL (serverless, via `@prisma/adapter-pg` + `pg ^8.22.0`)
- **Authentication:** Fully custom cookie-based auth (no NextAuth, no Clerk, no JWT). Session = raw UUID stored in httpOnly cookie.
- **React Compiler:** Enabled (`reactCompiler: true` in `next.config.ts`, `babel-plugin-react-compiler 1.0.0` in devDependencies)

### Full Dependency List (from `package.json`)

**Dependencies:**

| Package | Version |
|---------|---------|
| `@prisma/adapter-pg` | `^7.8.0` |
| `@prisma/client` | `^7.8.0` |
| `html2canvas` | `^1.4.1` |
| `jspdf` | `^4.2.1` |
| `lucide-react` | `^1.24.0` |
| `next` | `16.2.10` |
| `pg` | `^8.22.0` |
| `react` | `19.2.4` |
| `react-dom` | `19.2.4` |
| `recharts` | `^3.9.2` |
| `sweetalert2` | `^11.26.25` |

**Dev Dependencies:**

| Package | Version |
|---------|---------|
| `@tailwindcss/postcss` | `^4` |
| `@types/node` | `^20` |
| `@types/pg` | `^8.20.0` |
| `@types/react` | `^19` |
| `@types/react-dom` | `^19` |
| `babel-plugin-react-compiler` | `1.0.0` |
| `dotenv` | `^17.4.2` |
| `eslint` | `^9` |
| `eslint-config-next` | `16.2.10` |
| `prisma` | `^7.8.0` |
| `tailwindcss` | `^4` |
| `tsx` | `^4.23.0` |
| `typescript` | `^5` |

---

## 2. Data Model

### Full Prisma Schema (verbatim)

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

// ─── ENUMS ───────────────────────────────────────────

enum UserRole {
  ADMIN
  COACH
  MEMBER
}

enum EquipmentStatus {
  OPERATIONAL
  UNDER_REPAIR
  OUT_OF_ORDER
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
}

enum MessageType {
  PUBLIC
  PRIVATE
}

enum SubscriptionStatus {
  ACTIVE
  EXPIRED
}

enum PlanType {
  DAILY
  WEEKLY
  MONTHLY
  SIX_MONTH
  YEARLY
}

// ─── MODELS ──────────────────────────────────────────

model User {
  id        String   @id @default(uuid()) @db.Uuid
  name      String
  email     String   @unique
  password  String
  goal      String?
  weight    Float?
  height    Float?
  age       Int?
  role      UserRole @default(MEMBER)
  ipAddress String?
  createdAt DateTime @default(now())

  // Relations
  enrolledClasses      Enrollment[]
  coachClasses         GymClass[]
  attendanceRecords    Attendance[]    @relation("StudentAttendance")
  individualWorkouts   IndividualWorkout[]
  sentMessages         Message[]       @relation("SentMessages")
  receivedMessages     Message[]       @relation("ReceivedMessages")
  weightHistory        WeightHistory[]
  dailyMacros          DailyMacros[]
  userStats            UserStats?
  subscriptions        Subscription[]

  @@map("users")
}

model GymClass {
  id         String @id @default(uuid()) @db.Uuid
  className  String
  timeSlots  String
  capacity   Int    @default(20)
  coachId    String @db.Uuid
  createdAt  DateTime @default(now())

  // Relations
  coach          User               @relation(fields: [coachId], references: [id], onDelete: Cascade)
  enrollments    Enrollment[]
  attendances    Attendance[]
  groupWorkouts  GroupWorkout[]

  @@map("classes")
}

model Enrollment {
  id      String @id @default(uuid()) @db.Uuid
  userId  String @db.Uuid
  classId String @db.Uuid

  // Relations
  user  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  gymClass GymClass @relation(fields: [classId], references: [id], onDelete: Cascade)

  @@unique([userId, classId])
  @@map("enrollments")
}

model Equipment {
  id     String          @id @default(uuid()) @db.Uuid
  name   String
  status EquipmentStatus @default(OPERATIONAL)
  notes  String?
  date   DateTime        @default(now())

  @@map("equipment")
}

model Attendance {
  id        String           @id @default(uuid()) @db.Uuid
  classId   String           @db.Uuid
  studentId String           @db.Uuid
  status    AttendanceStatus
  date      DateTime         @default(now())
  savedAt   DateTime         @default(now())

  // Relations
  gymClass GymClass @relation(fields: [classId], references: [id], onDelete: Cascade)
  student  User     @relation("StudentAttendance", fields: [studentId], references: [id], onDelete: Cascade)

  @@map("attendance")
}

model GroupWorkout {
  id         String   @id @default(uuid()) @db.Uuid
  classId    String   @db.Uuid
  date       DateTime @default(now())
  workoutJson Json
  createdAt  DateTime @default(now())

  // Relations
  gymClass GymClass @relation(fields: [classId], references: [id], onDelete: Cascade)

  @@map("group_workouts")
}

model IndividualWorkout {
  id          String   @id @default(uuid()) @db.Uuid
  studentId   String   @db.Uuid
  date        DateTime @default(now())
  workoutJson Json
  createdAt   DateTime @default(now())

  // Relations
  student User @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@map("individual_workouts")
}

model Message {
  id         String      @id @default(uuid()) @db.Uuid
  content    String
  type       MessageType @default(PUBLIC)
  fromId     String      @db.Uuid
  fromName   String
  targetId   String?     @db.Uuid
  targetName String?
  createdAt  DateTime    @default(now())

  // Relations
  sender   User  @relation("SentMessages", fields: [fromId], references: [id], onDelete: Cascade)
  receiver User? @relation("ReceivedMessages", fields: [targetId], references: [id], onDelete: SetNull)

  @@map("messages")
}

model WeightHistory {
  id     String   @id @default(uuid()) @db.Uuid
  userId String   @db.Uuid
  weight Float
  date   DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, date])
  @@map("weight_history")
}

model DailyMacros {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  calories  Float    @default(0)
  protein   Float    @default(0)
  carbs     Float    @default(0)
  fat       Float    @default(0)
  date      DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@map("daily_macros")
}

model UserStats {
  id             String   @id @default(uuid()) @db.Uuid
  userId         String   @unique @db.Uuid
  currentStreak  Int      @default(0)
  longestStreak  Int      @default(0)
  lastAttendance DateTime?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_stats")
}

model Subscription {
  id              String             @id @default(uuid()) @db.Uuid
  userId          String             @db.Uuid
  status          SubscriptionStatus @default(ACTIVE)
  planType        PlanType           @default(MONTHLY)
  hasPrivateCoach Boolean            @default(false)
  hasMealPlan     Boolean            @default(false)
  startDate       DateTime           @default(now())
  endDate         DateTime
  amount          Float              @default(0)
  giftedBy        String?
  createdAt       DateTime           @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, status])
  @@map("subscriptions")
}
```

### Enums (6 total)

| Enum | Values |
|------|--------|
| `UserRole` | `ADMIN`, `COACH`, `MEMBER` |
| `EquipmentStatus` | `OPERATIONAL`, `UNDER_REPAIR`, `OUT_OF_ORDER` |
| `AttendanceStatus` | `PRESENT`, `ABSENT`, `LATE` |
| `MessageType` | `PUBLIC`, `PRIVATE` |
| `SubscriptionStatus` | `ACTIVE`, `EXPIRED` |
| `PlanType` | `DAILY`, `WEEKLY`, `MONTHLY`, `SIX_MONTH`, `YEARLY` |

### Relationships

- **User → GymClass** (1:N): A coach owns many classes (`coachId` FK)
- **User ↔ GymClass** (M:N): Through `Enrollment` join table; unique constraint on `(userId, classId)`
- **GymClass → Attendance** (1:N): Each class has many attendance records
- **User → Attendance** (1:N): Named relation `"StudentAttendance"` — a student has many attendance records
- **GymClass → GroupWorkout** (1:N): Each class has many group workout logs
- **User → IndividualWorkout** (1:N): A user has many individual workouts
- **User → Message** (1:N): Named relation `"SentMessages"` — a user sends many messages
- **User → Message** (1:0..N): Named relation `"ReceivedMessages"` — a user receives optional messages (`onDelete: SetNull`)
- **User → WeightHistory** (1:N): Indexed on `(userId, date)`
- **User → DailyMacros** (1:N): Unique constraint on `(userId, date)` — one entry per day
- **User ↔ UserStats** (1:0..1): One-to-one, `userId` is `@unique`
- **User → Subscription** (1:N): Indexed on `(userId, status)`
- **Equipment**: Isolated model, no foreign keys

---

## 3. Project Structure

### Folder Tree (max 3 levels, excluding `node_modules`/`.next`/`.git`)

```
ironforged-modern/
├── data base/                          # Legacy seed data (pipe-delimited + JSON-lines)
│   ├── attendance.txt
│   ├── classes.txt
│   ├── enrollments.txt
│   ├── equipment.txt
│   ├── individual_notes.txt
│   ├── messages.txt
│   ├── server_detail.log
│   ├── users.txt
│   └── workouts.txt
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   ├── file.svg
│   ├── globe.svg
│   ├── img/
│   │   └── logo.svg
│   ├── next.svg
│   ├── Pic/
│   │   ├── indexbg.jpeg
│   │   ├── loginbg.jpeg
│   │   └── midindex.jpeg
│   ├── vercel.svg
│   └── window.svg
├── src/
│   ├── app/
│   │   ├── admin-panel/
│   │   │   └── page.tsx
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   ├── grant-subscription/route.ts
│   │   │   │   └── subscriptions/route.ts
│   │   │   ├── attendance/route.ts
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   └── register/route.ts
│   │   │   ├── classes/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── enrollments/route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── contact/route.ts
│   │   │   ├── dashboard/stats/route.ts
│   │   │   ├── equipment/
│   │   │   │   ├── [id]/route.ts
│   │   │   │   └── route.ts
│   │   │   ├── logs/route.ts
│   │   │   ├── messages/route.ts
│   │   │   ├── progress/
│   │   │   │   ├── macros/route.ts
│   │   │   │   ├── streak/route.ts
│   │   │   │   └── weight/route.ts
│   │   │   ├── subscription/route.ts
│   │   │   ├── subscriptions/purchase-gift/route.ts
│   │   │   ├── user-profile/route.ts
│   │   │   ├── users/
│   │   │   │   ├── lookup/route.ts
│   │   │   │   └── route.ts
│   │   │   └── workouts/route.ts
│   │   ├── coach-dashboard/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── page.tsx
│   │   └── register/page.tsx
│   ├── components/
│   │   ├── ConfirmModal.tsx
│   │   ├── EditRoleModal.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Spinner.tsx
│   │   └── Toast.tsx
│   ├── generated/prisma/               # Auto-generated Prisma client (gitignored)
│   ├── hooks/
│   │   └── useCyberpunkPDF.ts
│   ├── lib/
│   │   ├── auth.ts
│   │   └── db.ts
│   └── middleware.ts
├── .env
├── .gitignore
├── ARCHITECTURE.md
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── prisma.config.ts
├── README.md
└── tsconfig.json
```

### Role of Each Main Folder

| Folder | Role |
|--------|------|
| `src/app/` | Next.js App Router: all page routes, API routes, root layout, global CSS |
| `src/app/api/` | All API route handlers (23 files, 20 unique paths) |
| `src/components/` | Shared UI components (5 total: Toast, Spinner, Skeleton, ConfirmModal, EditRoleModal) |
| `src/hooks/` | Custom React hooks (1: `useCyberpunkPDF`) |
| `src/lib/` | Core utilities: `auth.ts` (session/role management), `db.ts` (Prisma singleton) |
| `src/generated/prisma/` | Auto-generated Prisma client output (gitignored) |
| `prisma/` | Database schema and seed script |
| `public/` | Static assets: logo SVG, background JPEGs, default Next.js SVGs |
| `data base/` | Legacy seed data files (pipe-delimited text) for `prisma/seed.ts` |

---

## 4. API Routes

| # | Method(s) | Path | Description |
|---|-----------|------|-------------|
| 1 | POST | `/api/auth/login` | Authenticates user by email+password, sets session cookie |
| 2 | POST | `/api/auth/register` | Creates new user (MEMBER role), sets session cookie |
| 3 | GET, POST, DELETE | `/api/users` | GET: list users (role-scoped). POST: update user role. DELETE: delete user (admin) |
| 4 | GET | `/api/users/lookup` | Looks up a user by email query param |
| 5 | GET, PUT | `/api/user-profile` | GET: current user profile + `isProfileComplete`. PUT: update weight/height/age/goal |
| 6 | GET, POST | `/api/classes` | GET: list classes (role-scoped). POST: create class (coach/admin) |
| 7 | PUT, DELETE | `/api/classes/[id]` | Update or delete a gym class by ID |
| 8 | POST, DELETE | `/api/classes/[id]/enrollments` | Enroll or unenroll a user in/from a class |
| 9 | GET, POST | `/api/attendance` | GET: fetch attendance (role-scoped). POST: bulk-create attendance records |
| 10 | GET, POST | `/api/workouts` | GET: list group+individual workouts. POST: create workout (coach/admin) |
| 11 | GET, POST | `/api/messages` | GET: fetch messages (public/private). POST: send message |
| 12 | GET, POST, PUT | `/api/equipment` | GET: list equipment. POST: create item. PUT: update by body id |
| 13 | PUT, DELETE | `/api/equipment/[id]` | Update or delete equipment by URL param id |
| 14 | GET, POST | `/api/subscription` | GET: user's active/recent subscription. POST: purchase subscription (stacks) |
| 15 | POST | `/api/subscriptions/purchase-gift` | Purchase a gift subscription for another user by email |
| 16 | GET, POST | `/api/admin/subscriptions` | Admin-only: list all users' subs, create/update any user's sub |
| 17 | POST | `/api/admin/grant-subscription` | Admin-only: grant free subscription to a user |
| 18 | GET, POST | `/api/progress/weight` | GET: user's weight history (90 records). POST: upsert daily weight |
| 19 | GET, POST | `/api/progress/macros` | GET: today's macros. POST: upsert today's macros |
| 20 | GET | `/api/progress/streak` | Calculates current+longest attendance streak |
| 21 | GET | `/api/dashboard/stats` | Server stats: uptime, memory, user count, revenue, DB status |
| 22 | POST | `/api/contact` | Public contact form → creates PUBLIC message |
| 23 | GET | `/api/logs` | Returns last 200 lines from `server_detail.log` |

---

## 5. Design System

### Colors

**CSS Variables** (defined in `globals.css`):

```css
:root {
  --background: #070709;
  --foreground: #f4f4f5;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}
```

**Design palette** (used throughout the app):

| Role | Hex | Tailwind Class |
|------|-----|----------------|
| Page background | `#070709` | `bg-[#070709]` |
| Primary text | `#f4f4f5` | `text-[#f4f4f5]` / `text-zinc-100` |
| Card/sidebar bg | `#0b0b0e` / `#0f0f12` | `bg-[#0b0b0e]` / `bg-[#0f0f12]` |
| Input bg | `#121216` | `bg-[#121216]` |
| Border subtle | `#27272a` | `border-zinc-800` |
| Border muted | `#18181b` | `border-zinc-900` |
| Primary accent | `#ef4444` | `red-500` |
| Success | `#34d399` | `emerald-400` |
| Info | `#22d3ee` | `cyan-400` |
| Warning | `#fbbf24` | `amber-400` |
| PDF accent | `#a78bfa` | `purple-400` |

### Fonts

- **Sans-serif:** `Geist` — loaded via `next/font/google`, CSS variable `--font-geist-sans`, subsets: `latin`
- **Monospace:** `Geist_Mono` — loaded via `next/font/google`, CSS variable `--font-geist-mono`, subsets: `latin`
- **Tailwind mapping** (in `@theme inline`):
  - `--font-sans: var(--font-geist-sans)`
  - `--font-mono: var(--font-geist-mono)`
- **Body fallback:** `font-family: Arial, Helvetica, sans-serif` (in `globals.css`)
- **No self-hosted font files.** No `@font-face` declarations.

### Breakpoints

Tailwind CSS v4 defaults (not overridden):

| Prefix | Width |
|--------|-------|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

### Base UI Components

**There are no standalone reusable base components** (no Button, Card, Input, Select, Badge components). All UI elements are inline `<button>`, `<input>`, `<select>`, `<div>` elements styled with Tailwind classes directly in each page file.

| Component | File | Description |
|-----------|------|-------------|
| `Toast` / `ToastContainer` / `showToast()` | `src/components/Toast.tsx` | Global toast notification system (success/error/warning) |
| `Spinner` | `src/components/Spinner.tsx` | SVG loading spinner (sm/md/lg sizes) |
| `Skeleton`, `SkeletonCard`, `SkeletonTableRows`, `SkeletonChatBubble`, `SkeletonFullPage` | `src/components/Skeleton.tsx` | Loading placeholder variants |
| `ConfirmModal` | `src/components/ConfirmModal.tsx` | Confirmation dialog (danger/warning variants) |
| `EditRoleModal` | `src/components/EditRoleModal.tsx` | Admin role editor (Member/Coach/Admin toggles) |

---

## 6. Pages and Routes

| # | URL Path | File | Auth Required | Description |
|---|----------|------|---------------|-------------|
| 1 | `/` | `src/app/page.tsx` | No (public) | Landing page: hero, legacy section, features, contact form, footer |
| 2 | `/login` | `src/app/login/page.tsx` | No (public) | Email+password login, redirects by role on success |
| 3 | `/register` | `src/app/register/page.tsx` | No (public) | User registration with fitness goal selection |
| 4 | `/dashboard` | `src/app/dashboard/page.tsx` | Yes (member/coach/admin) | Member dashboard: profile, stats, weight chart, nutrition, classes, messages, PDF export, gift subscriptions |
| 5 | `/coach-dashboard` | `src/app/coach-dashboard/page.tsx` | Yes (coach) | Coach panel: classes, attendance marking, workout assignment, messaging |
| 6 | `/admin-panel` | `src/app/admin-panel/page.tsx` | Yes (admin) | Admin panel: member management, class CRUD, equipment, subscriptions, server logs |

**Public pages:** `/`, `/login`, `/register`
**Protected pages:** `/dashboard`, `/coach-dashboard`, `/admin-panel` (middleware checks session cookie existence)

---

## 7. Custom/Special Technical Logic

### Custom Hooks

| Hook | File | Description |
|------|------|-------------|
| `useCyberpunkPDF()` | `src/hooks/useCyberpunkPDF.ts` | Client-side PDF generation via `html2canvas` + `jsPDF`. Multi-page A4 slicing. Contains 3-layer workaround for Tailwind CSS v4 `oklch`/`oklab` color function incompatibility with `html2canvas`. |

### Library Utilities

| Function | File | Description |
|----------|------|-------------|
| `setSessionCookie(userId)` | `src/lib/auth.ts` | Sets httpOnly session cookie (7-day expiry) |
| `clearSessionCookie()` | `src/lib/auth.ts` | Deletes session cookie |
| `getSessionUser()` | `src/lib/auth.ts` | Resolves user from session cookie via DB lookup |
| `requireAuth()` | `src/lib/auth.ts` | Throws `UNAUTHORIZED` if no session |
| `requireRole(...roles)` | `src/lib/auth.ts` | Throws `FORBIDDEN` if role doesn't match |
| `unauthorizedResponse()` | `src/lib/auth.ts` | Returns 401 JSON response |
| `forbiddenResponse()` | `src/lib/auth.ts` | Returns 403 JSON response |
| `isDbReady()` | `src/lib/db.ts` | Checks if Prisma client initialized successfully |

### Unusual Workarounds / Fixes

1. **oklch/oklab regex sanitizer** (`useCyberpunkPDF.ts:19`): `/\b(oklch|oklab|lab|lch)\([^)]+\)/g` — Replaces CSS Color Level 4 functions that `html2canvas` can't render, falling back to hex `#18181b`. Applied in 3 layers: `<style>` tags, DOM tree inline styles, and explicit hex overrides.

2. **Force-dynamic caching bypass** (`progress/weight/route.ts:5`, `progress/macros/route.ts:5`): `export const dynamic = "force-dynamic"` — Prevents Next.js from statically caching GET handlers that return user-specific data.

3. **Unsafe PrismaClient cast** (`lib/db.ts:25`): `export const db = _db as PrismaClient` — Casts potentially `undefined` to `PrismaClient`, meaning runtime crashes if DB init failed.

4. **Height auto-conversion** (`api/user-profile/route.ts`): If height > 3, assumes centimeters and divides by 100 to convert to meters.

5. **Triple-fallback session resolution** (`api/progress/weight/route.ts`, `api/progress/macros/route.ts`): `resolveUserId()` tries `body.userId` → `cookies().get("session")` → raw `Cookie` header regex parse.

6. **Equipment status fuzzy mapper** (`api/equipment/route.ts`): Bidirectional mapping using `.includes("repair")`, `.includes("out")` for loose string matching.

7. **Middleware role map unused** (`middleware.ts`): `ROLE_MAP` is defined but only cookie **presence** is checked — no actual role validation at middleware level.

8. **Plaintext password storage** (`lib/auth.ts:21`, `api/auth/login/route.ts`): Passwords are stored and compared in plaintext with no hashing.

---

## 8. Performance & Optimization

- **`next/image` usage:** Not found. The project uses plain `<img>` tags exclusively.
- **Caching strategy:** No explicit caching layer. Two API routes use `export const dynamic = "force-dynamic"` to prevent stale data. No Redis, no `unstable_cache`, no `revalidateTag`, no `cacheLife`.
- **Lazy loading:** Not found. No `React.lazy()`, no `next/dynamic` imports. All components are statically imported.
- **Code splitting:** No manual code splitting. Relies entirely on Next.js default route-based splitting.
- **React Compiler:** Enabled (`reactCompiler: true` in `next.config.ts`).
- **Prisma singleton:** `globalThis` caching in non-production to survive hot-reload without multiple DB connections.

---

## 9. SEO & Metadata

- **Next.js Metadata API:** Used only in root `layout.tsx`:
  ```tsx
  export const metadata: Metadata = {
    title: "IRONFORGED | Gym Management",
    description: "The ultimate management system for elite bodybuilding facilities.",
    icons: {
      icon: "/img/logo.svg",
      shortcut: "/img/logo.svg",
      apple: "/img/logo.svg",
    },
  };
  ```
- **`generateMetadata`:** Not found.
- **Per-page metadata:** None. All page files are `"use client"` and cannot export `metadata`.
- **`sitemap.xml`:** Not found (no `sitemap.xml` file, no `sitemap.ts` route).
- **`robots.txt`:** Not found (no `robots.txt` file, no `robots.ts` route).
- **Open Graph tags:** Not configured. No `openGraph` property in metadata.

---

## 10. Testing & Code Quality

- **Tests:** None. No `*.test.ts`, `*.spec.ts`, `__tests__/`, `cypress/`, or `playwright.config.*` found.
- **Testing tools configured:** None. No Jest, Vitest, Playwright, or Cypress config.
- **ESLint:** Configured. Flat config format (ESLint v9) at `eslint.config.mjs`:
  ```js
  import { defineConfig, globalIgnores } from "eslint/config";
  import nextVitals from "eslint-config-next/core-web-vitals";
  import nextTs from "eslint-config-next/typescript";

  const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  ]);

  export default eslintConfig;
  ```
- **Prettier:** Not configured. No `.prettierrc` or equivalent found.
- **CI/CD:** None. No `.github/workflows/` directory or equivalent.

---

## 11. Responsive Design & Accessibility

- **Mobile breakpoints:** Tailwind v4 defaults are available (`sm:640`, `md:768`, `lg:1024`, `xl:1280`, `2xl:1536`). Used throughout (e.g., `md:text-7xl`, `md:flex-row`, `lg:p-6`). Responsive design is handled via Tailwind utility classes.
- **ARIA attributes:** Not found. No `aria-label`, `aria-describedby`, `role` attributes (except the CSS selector `[role='button']` in the PDF hook's hide-interactive logic).
- **Semantic HTML:** Minimal. The root layout uses `<html lang="en">`, but pages rely heavily on `<div>` elements rather than `<main>`, `<nav>`, `<header>`, `<section>`, `<article>`, `<aside>`, `<footer>`.
- **Keyboard navigation:** No custom keyboard handlers or focus management found.
- **Screen reader support:** Not found.

---

## 12. Environment Variables

| Variable | Referenced In | Purpose |
|----------|---------------|---------|
| `DATABASE_URL` | `src/lib/db.ts`, `prisma.config.ts` | PostgreSQL connection string (Neon) |
| `NODE_ENV` | `src/lib/db.ts`, `src/lib/auth.ts` | Controls Prisma singleton caching + cookie `secure` flag |

**No `.env.example` or `.env.local.example` exists.** Only `.env` exists (contains live Neon credentials).

---

## Risks & Incomplete Items

### Critical Security Issues

1. **Plaintext password storage** — Passwords are stored and compared without any hashing (bcrypt, argon2, etc.). This is the single most critical security vulnerability.
2. **No `.env.example`** — New developers have no reference for required environment variables.
3. **Live DB credentials in `.env`** — While `.env` is gitignored, there is no documentation of required env vars for deployment.
4. **Middleware doesn't validate roles** — `ROLE_MAP` is defined but unused; middleware only checks cookie existence, not the user's actual role. Any user with a session cookie can access `/admin-panel`.
5. **No auth on multiple API routes** — Equipment CRUD, `classes/[id]`, `classes/[id]/enrollments`, `/api/dashboard/stats`, `/api/logs` have no authentication checks.

### Architectural Concerns

6. **No reusable base UI components** — Buttons, inputs, cards, selects are all inline-styled `<div>`/`<button>` elements duplicated across pages. No component library abstraction.
7. **All pages are `"use client"`** — Every page is a client component, negating server-side rendering benefits (no SSR, no RSC streaming).
8. **No `loading.tsx`, `error.tsx`, or `not-found.tsx`** — No route-level error boundaries or loading states at the framework level.
9. **No `next/image`** — All images use raw `<img>` tags, missing automatic optimization, lazy loading, and responsive sizing.
10. **No lazy loading or code splitting** — All components are statically imported; dashboard pages are likely very large bundles.

### Quality & Operations

11. **Zero test coverage** — No unit tests, integration tests, or e2e tests of any kind.
12. **No Prettier** — No code formatting standard enforced.
13. **No CI/CD** — No automated builds, linting, or deployment pipelines.
14. **No sitemap.xml or robots.txt** — Missing basic SEO infrastructure.
15. **No Open Graph tags** — Social media sharing will show generic metadata.
16. **No ARIA or semantic HTML** — Accessibility is essentially non-existent.
17. **No 404 page** — Missing `not-found.tsx` means Next.js default 404 handling.
18. **`sweetalert2` is a dependency** but usage was not found in the source — may be dead code.
19. **`lucide-react` is a dependency** but usage was not found in the source — may be dead code.
20. **`data base/` directory** with space in the name contains legacy seed data and a `server_detail.log` — unusual naming and the log file being in the project tree is a code smell.
21. **`PrismaClient` unsafe cast** — `lib/db.ts:25` casts `_db as PrismaClient` even when `_db` is `undefined`, which will cause runtime crashes if the DB connection fails.
22. **Duplicate equipment endpoints** — Both `/api/equipment` (PUT by body id) and `/api/equipment/[id]` (PUT by URL param) exist with overlapping functionality.
23. **No `generateMetadata`** — All pages share the same static title/description from the root layout.
24. **Height auto-conversion heuristic** — Assuming `> 3` means centimeters is fragile and could break with imperial inputs or edge cases.
