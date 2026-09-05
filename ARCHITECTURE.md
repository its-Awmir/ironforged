# IRONFORGED — Architecture & Engineering Reference

> **Source of Truth** for the IRONFORGED application. Any future AI agent or developer
> must read this file before modifying code.

---

## 1. Project Overview & Value Proposition

| Field | Detail |
|---|---|
| **Application Name** | IRONFORGED |
| **Type** | High-End Premium Fitness & Coaching SaaS Platform |
| **Target Audience** | Members / Students tracking workouts, nutrition, attendance, and purchasing premium coaching subscriptions |
| **Design Philosophy** | Strict dark-mode cyberpunk/neon aesthetic. 100% English UI. |
| **Primary Background** | `#070709` (near-black) |
| **Card / Sidebar Background** | `#0b0b0e` |
| **Input Background** | `#121216` |
| **Primary Accent** | Red-500 (`#ef4444`) — CTAs, active states, glows |
| **Secondary Accents** | Neon cyan (info), neon purple (PDF export), gold/amber (gift payments), emerald (success) |

---

## 2. Technical Core Stack

| Layer | Technology | Version |
|---|---|---|
| **Framework** | Next.js (App Router, Turbopack) | 16.2.10 |
| **Language** | TypeScript (strict) | ^5 |
| **React** | React + React DOM | 19.2.4 |
| **React Compiler** | `babel-plugin-react-compiler` | 1.0.0 (enabled via `next.config.ts`) |
| **Database** | PostgreSQL (Neon serverless) | — |
| **ORM** | Prisma Client | ^7.8.0 |
| **DB Adapter** | `@prisma/adapter-pg` (PrismaPg) | ^7.8.0 |
| **Driver** | `pg` (node-postgres) | ^8.22.0 |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/postcss`) | ^4 |
| **Charts** | Recharts | ^3.9.2 |
| **Icons** | Lucide React | ^1.24.0 |
| **PDF Export** | jsPDF + html2canvas | ^4.2.1 / ^1.4.1 |
| **Toasts** | Custom `showToast()` global pub/sub | — |
| **Notifications** | SweetAlert2 (available, not primary) | ^11.26.25 |

### Scripts

```bash
npm run dev       # Next.js dev server (Turbopack)
npm run build     # Production build
npm run start     # Production server
npm run lint      # ESLint
npx prisma db push   # Push schema to database
npx prisma generate  # Regenerate Prisma Client
```

---

## 3. Core Functional Features

### 3.1 Student Dashboard (`/dashboard`)

- **Stats Grid**: 8 real-time cards — Weight, Height, BMI, Goal, Enrolled Classes, Attendance Rate, Workout Streak, Subscription Status
- **Weight Progress Chart**: Recharts `<LineChart>` with retroactive date logging via date picker (capped at today)
- **Goal Progress Donut**: PieChart showing % progress toward target weight (75 kg)
- **Daily Nutrition**: 4 radial SVG progress rings — Calories, Protein, Carbs, Fat with inline goals
- **Physical Metrics Update**: Form for weight, height, age, fitness goal
- **My Classes**: Enrolled classes table with coach, schedule, and status
- **Gift a Friend**: Member-to-member subscription gifting with email lookup, plan selector, addon toggles, and live total

### 3.2 Weight Progress Tracker

- **Date picker** defaults to today, capped at `max={today}` via `<input type="date">`
- Retroactive logging: users can log entries for past dates to build chart data
- **One entry per day** enforced at API level (upsert on date match)
- Chart requires 2+ data points to render; otherwise shows fallback message

### 3.3 Member-to-Member Gift Subscription

- Buyer enters recipient email → `/api/users/lookup` validates existence (case-insensitive)
- Prevents self-gifting (`recipient.id === buyer.id` check)
- Payment gateway abstraction: all purchase/gift endpoints are gated behind `PAYMENTS_ENABLED` and return `501` until a real processor (Stripe/ZarinPal) is wired in
- Auto-expires recipient's existing active subscription before creating new one
- `giftedBy` metadata stored as `"Buyer Name (buyer@email.com)"`
- Plans: DAILY ($1.99), WEEKLY ($9.99), MONTHLY ($29.99), SIX_MONTH ($149.99), YEARLY ($249.99)
- Addons: Private Coach (+$50), Custom Meal Plan (+$20)

### 3.4 Cyberpunk PDF Export System

- Client-side DOM capture via `html2canvas` → `jsPDF` A4 multi-page rendering
- Dark-theme faithful: `#070709` background, neon borders, glowing text
- Targets: `#progress-report-container` (weight chart + nutrition), `#workout-printable` (workout log)
- Automatic multi-page slicing for content exceeding A4 height
- Downloads as `[Name]-[ReportType]-[YYYYMMDD].pdf`

### 3.5 Admin Panel (`/admin-panel`)

- **Members**: User table with role management (EditRoleModal)
- **Classes**: CRUD for gym classes with coach assignment and enrollment
- **Equipment**: CRUD with status tracking (Operational / Under Repair / Out of Order)
- **Attendance**: Mark student attendance per class
- **Subscriptions**: View all users with subscription status, manage plans, grant gift subscriptions
- **System Info**: Dashboard stats with real uptime, memory usage, user counts

### 3.6 Coach Dashboard (`/coach-dashboard`)

- View assigned classes and enrolled students
- Create individual and group workouts
- Mark attendance
- Message students

---

## 4. Database Models & Schema (Prisma)

### 4.1 Enums

| Enum | Values |
|---|---|
| `UserRole` | `ADMIN`, `COACH`, `MEMBER` |
| `EquipmentStatus` | `OPERATIONAL`, `UNDER_REPAIR`, `OUT_OF_ORDER` |
| `AttendanceStatus` | `PRESENT`, `ABSENT`, `LATE` |
| `MessageType` | `PUBLIC`, `PRIVATE`, `CONTACT` |
| `SubscriptionStatus` | `ACTIVE`, `EXPIRED` |
| `PlanType` | `DAILY`, `WEEKLY`, `MONTHLY`, `SIX_MONTH`, `YEARLY` |

### 4.2 Models

| Model | Table | Key Fields | Indexes |
|---|---|---|---|
| `User` | `users` | id (UUID), name, email (unique), password, role, goal, weight, height, age | — |
| `GymClass` | `classes` | id, className, timeSlots, capacity, coachId (nullable), isArchived | — |
| `Enrollment` | `enrollments` | userId, classId | `@@unique([userId, classId])` |
| `Equipment` | `equipment` | id, name, status, notes, date | — |
| `Attendance` | `attendance` | id, classId, studentId, status, date, savedAt | — |
| `GroupWorkout` | `group_workouts` | id, classId, date, workoutJson (JSON) | — |
| `IndividualWorkout` | `individual_workouts` | id, studentId, date, workoutJson (JSON) | — |
| `Message` | `messages` | id, content, type, fromId, fromName, targetId, targetName | — |
| `WeightHistory` | `weight_history` | id, userId, weight (Float), date | `@@unique([userId, date])` |
| `DailyMacros` | `daily_macros` | id, userId, calories, protein, carbs, fat, date | `@@unique([userId, date])` |
| `UserStats` | `user_stats` | id, userId (unique), currentStreak, longestStreak, lastAttendance | — |
| `Subscription` | `subscriptions` | id, userId, status, planType, hasPrivateCoach, hasMealPlan, startDate, endDate, amount, **giftedBy**, createdAt | `@@index([userId, status])` |

### 4.3 CamelCase Schema Alignment Policy

All Prisma model references **must** use camelCase. This is enforced throughout the codebase:

```typescript
// CORRECT
db.weightHistory.findMany(...)
db.dailyMacros.findFirst(...)
db.user.findUnique(...)
db.subscription.create(...)

// WRONG — will crash at runtime
db.WeightHistory.findMany(...)
db.DailyMacros.findFirst(...)
```

### 4.4 Subscription `giftedBy` Metadata Field

The `giftedBy` field on the `Subscription` model stores audit-trail metadata for gift subscriptions:

```
Format: "Buyer Name (buyer@email.com)"
Example: "John Doe (john@example.com)"
```

- Set by `/api/subscriptions/purchase-gift` (member-to-member gifting with real amounts)
- Set by `/api/admin/grant-subscription` (admin gifting with `amount: 0`)
- `NULL` for self-purchased subscriptions

---

## 5. API Routes Reference

### Authentication

| Route | Methods | Purpose |
|---|---|---|
| `/api/auth/login` | POST | Authenticate user, set session cookie |
| `/api/auth/register` | POST | Create new user account |

### User Management

| Route | Methods | Purpose |
|---|---|---|
| `/api/users` | GET, POST, DELETE | List users, update roles, delete (admin) |
| `/api/users/lookup` | GET | Case-insensitive email lookup (auth required) |
| `/api/user-profile` | GET, PUT | Get/update current user profile |

### Progress & Nutrition

| Route | Methods | Purpose |
|---|---|---|
| `/api/progress/weight` | GET, POST | Weight history + log (with optional date) |
| `/api/progress/macros` | GET, POST | Daily macros + log/update |
| `/api/progress/streak` | GET | Attendance streak calculation |

### Subscriptions & Payments

| Route | Methods | Purpose |
|---|---|---|
| `/api/subscription` | GET, POST | User's subscription status + purchase |
| `/api/subscriptions/purchase-gift` | POST | Member-to-member gift purchase |

### Admin

| Route | Methods | Purpose |
|---|---|---|
| `/api/admin/subscriptions` | GET, POST | List/manage all subscriptions |
| `/api/admin/grant-subscription` | POST | Admin gift subscription (amount: 0) |
| `/api/dashboard/stats` | GET | System stats (uptime, memory, users) |

### Classes & Attendance

| Route | Methods | Purpose |
|---|---|---|
| `/api/classes` | GET, POST | List/create gym classes |
| `/api/classes/[id]` | GET, PUT, DELETE | Single class CRUD |
| `/api/classes/[id]/enrollments` | GET, POST, DELETE | Class enrollment management |
| `/api/attendance` | GET, POST | Attendance records |

### Other

| Route | Methods | Purpose |
|---|---|---|
| `/api/workouts` | GET, POST | Individual + group workouts |
| `/api/messages` | GET, POST | Public/private messaging; `?type=contact` returns contact submissions (admin only) |
| `/api/equipment` | GET, POST | Equipment inventory |
| `/api/equipment/[id]` | GET, PUT, DELETE | Single equipment CRUD |
| `/api/contact` | POST | Contact form submission (stored as `MessageType.CONTACT`, excluded from all public/private message queries) |
| `/api/logs` | GET | Application logs |

---

## 6. Authentication Architecture

### Session Flow

1. User logs in via `/api/auth/login`
2. Server calls `setSessionCookie(userId, role)` — issues a signed token `userId.role.signature` (HMAC-SHA256 keyed on `SESSION_SECRET`) in an httpOnly `session` cookie (7-day expiry)
3. All subsequent API calls include the cookie automatically
4. `getSessionUser()` verifies the HMAC signature, then queries `db.user.findUnique()` → returns `SessionUser`
5. Role-based access via `requireRole("ADMIN")` / `requireRole("COACH")` / `requireRole("MEMBER")` (case-insensitive)
6. `src/proxy.ts` (middleware) performs UI-gating only — redirects logged-out users to `/login?redirect=...` and enforces the `ROLE_MAP` page allowlist. Real authorization always happens at the API layer via `requireRole()`.

### Client-Side Auth

- `useLocalUser()` / `setLocalUser()` from `@/hooks/useLocalUser` wrap `localStorage` (key `user_ironforged`) storing id, name, email, role
- The middleware redirect guards protected routes; component-level guards read `useLocalUser()`
- Logout clears both `localStorage` and the session cookie

### `requireAuth()` Pattern (Progress Routes)

Progress routes (`weight`, `macros`, `streak`) resolve identity exclusively from the session:

1. `requireAuth()` → `getSessionUser()` parses and verifies the HMAC token
2. DB lookup confirms the user exists
3. Client-sent `body.userId` is never trusted for identity — the session is the source of truth

---

## 7. File Structure

```
ironforged-modern/
├── prisma/
│   ├── schema.prisma          # Database schema (12 models, 6 enums)
│   └── seed.ts                # Database seeding
├── src/
│   ├── app/
│   │   ├── api/               # 23 API route files
│   │   │   ├── admin/         # grant-subscription, subscriptions
│   │   │   ├── auth/          # login, register
│   │   │   ├── classes/       # CRUD + enrollments
│   │   │   ├── equipment/     # CRUD
│   │   │   ├── progress/      # weight, macros, streak
│   │   │   ├── subscriptions/ # purchase-gift
│   │   │   ├── users/         # list, lookup
│   │   │   └── ...            # attendance, contact, dashboard, logs, messages, subscription, user-profile, workouts
│   │   ├── admin-panel/       # Admin dashboard page
│   │   ├── coach-dashboard/   # Coach dashboard page
│   │   ├── dashboard/         # Student dashboard page
│   │   ├── login/             # Login page
│   │   ├── register/          # Register page
│   │   ├── globals.css        # Theme + print CSS
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Landing page
│   ├── components/
│   │   ├── ConfirmModal.tsx   # Reusable confirmation dialog
│   │   ├── EditRoleModal.tsx  # Admin role editor
│   │   ├── Skeleton.tsx       # Loading skeletons (FullPage, Card, TableRow, ChatBubble)
│   │   ├── Spinner.tsx        # SVG loading spinner (sm/md/lg)
│   │   └── Toast.tsx          # Global showToast() + ToastContainer
│   ├── hooks/
│   │   ├── useCyberpunkPDF.ts # Client-side PDF generation hook
│   │   └── useLocalUser.ts    # localStorage user-state wrapper
│   ├── lib/
│   │   ├── apiError.ts        # Standardized JSON error handler (apiError())
│   │   ├── auth.ts            # Session signing/verification, role guards
│   │   ├── db.ts              # Prisma client singleton + isDbReady()
│   │   └── subscription.ts    # Shared plan pricing + feature gating (hasActiveFeature)
│   ├── generated/
│   │   └── prisma/            # Auto-generated Prisma Client
│   └── proxy.ts               # Middleware: UI-gating + protected-route redirects
├── public/
│   └── img/                   # Static assets (logo, etc.)
├── .env                       # Environment variables (DATABASE_URL)
├── next.config.ts             # Next.js config (reactCompiler: true)
├── package.json
└── tsconfig.json
```

---

## 8. Critical Infrastructure Hotfixes & Traps

> **WARNING**: The following sections document hard-won engineering breakthroughs.
> Do NOT remove or modify these patterns without understanding the underlying cause.

### 8.1 Next.js Static GET Caching Bypass

**Problem:** Next.js production builds statically cache `GET` route handlers by default. After a user logs weight via `POST /api/progress/weight`, a subsequent `GET` to the same route returns a stale cached empty array `[]` instead of the freshly inserted record. The chart always shows "Log at least 2 weight entries."

**Fix:** Add at the top of every GET route that queries user-specific data:

```typescript
export const dynamic = "force-dynamic";
```

**Affected files:**
- `src/app/api/progress/weight/route.ts`
- `src/app/api/progress/macros/route.ts`

**Rule:** Any API route that reads from the database based on the current user's session MUST have `force-dynamic` exported. Static generation is only appropriate for truly immutable content.

---

### 8.2 Tailwind CSS v4 Modern Color Parsing Crash in PDF

**Problem:** `html2canvas` cannot parse CSS Color Module Level 4 functions (`oklch()`, `oklab()`, `lab()`, `lch()`). Tailwind CSS v4 injects these into `<style>` elements globally. When `html2canvas` encounters them during stylesheet parsing, it throws:

```
Runtime Error: Attempting to parse an unsupported color function "oklab"
Runtime Error: Attempting to parse an unsupported color function "lab"
```

**Fix:** Inside the `html2canvas` `onclone` callback in `src/hooks/useCyberpunkPDF.ts`, we implement a three-layer sanitizer:

**Layer 1 — Stylesheet Sanitization:**
```typescript
const UNSAFE_COLOR_RE = /\b(oklch|oklab|lab|lch)\([^)]+\)/g;

// In onclone:
const styles = doc.querySelectorAll("style");
styles.forEach((style) => {
  if (style.innerHTML && UNSAFE_COLOR_RE.test(style.innerHTML)) {
    style.innerHTML = style.innerHTML.replace(UNSAFE_COLOR_RE, "#18181b");
  }
});
// Also strip external stylesheets:
doc.querySelectorAll("link[rel='stylesheet']").forEach((link) => link.remove());
```

**Layer 2 — Inline Style Sanitization:**
```typescript
// Tree-walk all cloned elements, replace oklch/oklab in inline styles
const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
while ((node = walker.nextNode())) {
  for (let i = 0; i < node.style.length; i++) {
    const val = node.style.getPropertyValue(node.style[i]);
    if (val && UNSAFE_COLOR_RE.test(val)) {
      node.style.setProperty(node.style[i], val.replace(UNSAFE_COLOR_RE, "#18181b"));
    }
  }
}
```

**Layer 3 — Safe Inline Override:**
All `.premium-glow-card`, text color, and border elements receive explicit hex overrides (`#0f0f12`, `#27272a`, `#fafafa`, etc.) to bypass Tailwind class resolution entirely.

**Safe fallback hex:** `#18181b` (zinc-900) — used as the universal replacement for all unrecognized modern color functions.

---

### 8.3 Recharts Animation PDF Freeze Fix

**Problem:** Recharts components (`<Line>`, `<Pie>`, `<Bar>`) animate their data vectors on mount. When `html2canvas` captures the DOM during the animation frame, it captures empty/zero-state charts — resulting in blank or line-less PDFs.

**Fix:** Disable animation on all chart components inside the dashboard:

```tsx
// Line chart
<Line isAnimationActive={false} ... />

// Pie chart
<Pie isAnimationActive={false} ... />

// RadialProgress SVG (custom component)
<circle style={{ transition: "none" }} ... />
```

**Rule:** Any chart or animated SVG that will be captured by `html2canvas` MUST have animation disabled. The React state already holds the final values — animation is purely cosmetic and harmful to canvas capture.

---

### 8.4 Date Calculation Year Offset Bug

**Problem:** Using deprecated JavaScript date methods like `date.getYear()` returns years since 1900 (e.g., `126` for 2026). If this value is used in date formatting without correction, dates render as `2006` instead of `2026`.

**Fix:** Always use standard ECMAScript date methods:

```typescript
// CORRECT
date.getFullYear()  // Returns 2026

// WRONG — produces year offset bug
date.getYear()      // Returns 126 (1900 + 126 = 2026, but formatted as "126" or miscalculated)
```

**Also:** When formatting for display, always specify `year: "numeric"` explicitly:

```typescript
date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
// Output: "16 Jul 2026"
```

---

### 8.5 Prisma `db` Initialization Guard

**Problem:** The PrismaPg adapter can fail to initialize (network issues, invalid `DATABASE_URL`). When it does, `db` is `undefined` at runtime due to the unsafe cast in `db.ts`. Any route calling `db.weightHistory.findFirst()` crashes with:

```
Cannot read properties of undefined (reading 'findFirst')
```

**Fix:** Every API route that uses `db` must check `isDbReady()` before any Prisma call:

```typescript
import { db, isDbReady } from "@/lib/db";

export async function GET() {
  if (!isDbReady()) {
    return NextResponse.json({ success: false, message: "Database unavailable." }, { status: 503 });
  }
  // ... safe to use db here
}
```

---

## 9. Design System & Theming

### Color Tokens

| Token | Hex | Usage |
|---|---|---|
| `--background` | `#070709` | Page background, PDF export background |
| `--foreground` | `#f4f4f5` | Primary text (zinc-100) |
| Card background | `#0b0b0e` / `#0f0f12` | Sidebars, modals, cards |
| Input background | `#121216` | Form inputs, dropdowns |
| Border subtle | `#27272a` | Card borders, dividers (zinc-800) |
| Border muted | `#18181b` | Table cell borders (zinc-900) |
| Primary accent | `#ef4444` | Red-500 — CTAs, active nav, glows |
| Success | `#34d399` | Emerald-400 — active status, streaks |
| Info | `#22d3ee` | Cyan-400 — email validation, info states |
| Warning | `#fbbf24` | Amber-400 — gift totals, caution |
| PDF export | `#a78bfa` | Purple-400 — Download PDF buttons |
| Chart line | `#ef4444` | Weight progress line stroke |

### Component Patterns

- **Cards**: `premium-glow-card rounded-2xl p-4 lg:p-6` with `border-zinc-900/60`
- **Buttons**: `text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg`
- **Inputs**: `bg-[#121216] border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white`
- **Section Headers**: `text-xs font-black text-white uppercase tracking-widest` with `border-b border-zinc-900/60 pb-3`
- **Badges**: `text-[8px] font-bold px-1.5 py-0.5 rounded border`

---

## 10. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Neon pooler) |
| `SESSION_SECRET` | Yes | HMAC-SHA256 key for signing session tokens. The app refuses to start without it. |
| `PAYMENTS_ENABLED` | No | Truthy to enable purchase/gift endpoints; otherwise they return `501` |

A `.env.example` (repo root) documents these variables; copy it to `.env` for local development.

---

## 11. Deployment Checklist

1. Ensure `DATABASE_URL` and `SESSION_SECRET` are set in the production environment (startup throws if `SESSION_SECRET` is missing); set `PAYMENTS_ENABLED` only once a real payment gateway is wired
2. Run `npx prisma db push` to sync schema changes
3. Run `npx prisma generate` to regenerate client
4. Run `npm run build` — verify 0 TypeScript errors
5. Verify all progress/nutrition GET routes have `export const dynamic = "force-dynamic"`
6. Verify no `oklch`/`oklab`/`lab`/`lch` functions remain unhandled in PDF export paths

---

## 12. Known Limitations & Future Work

- **Payment Processing**: Purchase/gift endpoints are gated behind `PAYMENTS_ENABLED` and return `501` until Stripe/ZarinPal integration is wired. Shared plan pricing, durations, and feature gating live in `src/lib/subscription.ts`.
- **PDF External Stylesheets**: `html2canvas` cannot process external CSS files reliably. All styling must be inline or in `<style>` tags within the cloned document.
- **Weight One-Per-Day**: The weight upsert logic enforces one entry per date. Multiple same-day entries overwrite. This is by design for clean chart data.
- **Session Cookie**: Signed `userId.role.signature` token (HMAC-SHA256 over `SESSION_SECRET`), its signature recalculated and verified on every request.
- **`.env.example`**: Present at repo root documenting `DATABASE_URL`, `SESSION_SECRET`, and `PAYMENTS_ENABLED`.

---

*Last updated: September 2026*
*Maintained by: IRONFORGED Engineering Team*
