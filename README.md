# Tài chính cá nhân · Personal Finance Web App

A production-oriented **personal finance management** web application: track **expenses**, **savings**, and **categories**, with **Firebase Authentication**, **Firestore** persistence, and an extra **6-digit PIN** layer for sensitive areas (savings and dashboard savings summary).

---

## 🧠 Project Overview

This project is a **personal finance management system** for individuals who want to:

- Record and review **expenses** with categories, notes, and generated transaction codes.
- Monitor **savings** balances with **PIN-gated** access so sensitive totals are not shown without verification.
- Organize spending with **categories** (CRUD, soft delete).
- See **dashboard analytics** (charts, comparisons, recent activity) with **real-time** Firestore updates.
- Manage **profile** and **security** (display name, photo URL, change login password, change security PIN).
- Navigate quickly via a **command palette** (**Ctrl+K** / **⌘+K**).

The stack follows **Next.js App Router**, **Tailwind CSS v4**, **shadcn/ui**, and **Firebase** (Auth + Firestore), with a consistent architecture: **UI → Hooks → Services → Firebase**.

---

## 🚀 Features

| Area | Details |
|------|---------|
| **Authentication** | Email/password and **Google** sign-in; session cookie for route protection; Firestore user provisioning and soft-deactivate checks. |
| **Dashboard** | **Analytics**: bar (by month), line (daily or cumulative by year), pie (by category); filters **month/year**; KPI cards; **recent expenses** table (live data, not mock). |
| **Categories** | Full **CRUD**; **soft delete** via `deletedAt`. |
| **Expenses** | Create/update with **category**, **amount**, **note**; **transaction code** pattern; list with filters and pagination; **soft delete**. |
| **Savings** | **PIN gate** before access: set PIN or verify PIN; **SHA-256** hashed PIN in Firestore; **lockout** after failed attempts; soft-deleted savings. |
| **Settings / Profile** | Update **display name** and **photo URL** (email read-only); **change password** (email/password accounts); **change security PIN** (verify current PIN, lock rules). |
| **Dashboard savings card** | **Total savings** on the dashboard is **hidden** until the user enters PIN (short-lived cookie on `/dashboard`). |
| **Command search** | **Ctrl+K** / **⌘+K** palette (`cmdk`) for fast navigation to dashboard routes; trigger in header with shortcut hint. |
| **Responsive UI** | Mobile-friendly layouts, touch targets, sidebar + shell. |
| **Feedback** | **Sonner** toasts, **skeleton** loaders, **AlertDialog** confirmations (logout, deletes), tooltips on key actions. |

---

## 🧱 Tech Stack

| Layer | Technology |
|--------|------------|
| Framework | **Next.js 16** (App Router) |
| Styling | **Tailwind CSS v4** (`@tailwindcss/postcss`) |
| UI | **shadcn/ui** (Radix primitives, `components/ui`) |
| Forms | **react-hook-form**, **zod**, **@hookform/resolvers** |
| Data / Auth | **Firebase** v12 (Auth, Firestore) |
| Charts | **Recharts** (dashboard analytics) |
| Command palette | **cmdk** |
| Icons | **lucide-react** |
| Notifications | **sonner** |

---

## 📁 Project Structure

```text
app/                      # App Router: routes, layouts, metadata
  (auth)/                 # Login, register, forgot-password
  dashboard/              # Protected shell: overview, categories, expenses, savings, settings
  layout.tsx              # Root layout
  globals.css             # Tailwind v4 + theme tokens

components/
  ui/                     # shadcn primitives (Button, Card, Dialog, Table, …)
  layout/                 # Shell, sidebar, header, command search
  dashboard/              # Stats, charts, recent expenses
  expenses/               # Expense table, forms
  categories/             # Category forms
  savings/                # PIN gate, table, forms
  settings/               # Profile form, change PIN dialog

hooks/                    # useAuth, useAnalytics, useExpenses, useProfile, useLogout, …

services/                 # Firestore + Auth orchestration (no UI)
  auth.service.ts
  expense.service.ts
  category.service.ts
  savings.service.ts
  security.service.ts     # PIN hash (SHA-256), verify, change PIN
  analytics.service.ts    # Pure aggregation helpers
  user.service.ts

lib/
  firebase.ts             # Single Firebase app init; export auth + db
  utils.ts                # cn(), etc.
  auth-session.ts         # Cookie name for middleware
  savings-pin-session.ts  # PIN session cookie (savings route)
  dashboard-savings-pin-session.ts
```

### Architecture

```text
UI (components/pages, "use client" where needed)
  → Hooks (state, subscriptions, orchestration)
    → Services (Firestore queries, Auth APIs, pure analytics helpers)
      → Firebase (lib/firebase.ts)
```

- **Hooks** subscribe with `onSnapshot` where real-time updates are required (e.g. expenses, categories, savings, analytics).
- **Services** keep collection names, mapping, and business rules in one place.
- **PIN values** are never logged; hashes use **SHA-256** with a per-user salt pattern in `security.service.ts`.

---

## ⚙️ Setup & Installation

### Prerequisites

- **Node.js** 20+ (recommended)
- **pnpm** (or npm / yarn)

### 1. Clone the repository

```bash
git clone <your-repo-url> my-app
cd my-app
```

### 2. Install dependencies

```bash
pnpm install
```

*(Or `npm install` / `yarn`.)*

### 3. Environment variables

Create **`.env.local`** in the project root (do **not** commit real keys):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

These must match your Firebase project. Enable **Email/Password** and **Google** sign-in in the Firebase console as needed.

### 4. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Authenticated users hitting `/` are redirected to `/dashboard` (see middleware).

### 5. Production build

```bash
pnpm build
pnpm start
```

---

## 🔐 Authentication Flow

1. **Sign-in** via **email/password** or **Google** (`services/auth.service.ts`): after success, a Firestore user document is ensured and a **session cookie** stores the Firebase **ID token** (client-side refresh).
2. **Middleware** (`middleware.ts`) checks the **auth session cookie** for `/dashboard/*` and `/`; unauthenticated users are redirected to `/login` (with optional `from` query).
3. **Client gate** (`DashboardAuthGate`) aligns UI with auth state and handles edge cases (e.g. deactivated accounts).
4. **Logout** clears the session cookie and related PIN preview cookies where applicable.

> **Note:** Middleware only sees **cookies**, not Firebase’s full client session. The app relies on the persisted ID token cookie for route protection; client-side Firebase listeners still enforce data access—**Firestore Security Rules** must be configured for production.

---

## 🔒 Security

| Topic | Implementation |
|--------|------------------|
| **Soft delete** | Expenses, categories, savings use `deletedAt` (server timestamp) instead of hard deletes. |
| **Savings PIN** | Stored in `user_security` as **SHA-256** hash (not plaintext). |
| **Lockout** | Wrong PIN increments `failedAttempts`; after **5** failures, **`lockUntil`** is set (**5 minutes**). |
| **Change PIN** | Requires current PIN verification; resets lock state on success. |
| **Login password** | Change password uses Firebase **reauthentication** + `updatePassword` (email/password accounts only). |
| **Dashboard savings** | Total savings on the overview can be **masked** until PIN is entered; short-lived cookie on `/dashboard`. |

Always deploy **Firestore Security Rules** so users can only read/write their own documents.

---

## 📊 Analytics

- **Real-time** updates: dashboard **useAnalytics** subscribes to expenses, categories, and savings.
- **Charts** (Recharts): monthly bars, line (daily in selected month or cumulative by year), category pie.
- **Filters**: view by **month** or **year**; compare periods and show **% change** where applicable.
- **Recent expenses**: latest active expenses on the dashboard, driven by the same subscription pipeline.

---

## 🎨 UI/UX Principles

- **shadcn/ui** components for a consistent design system (cards, dialogs, tables, forms).
- **Responsive** layouts (`sm:`, `md:`, `lg:`), readable typography, adequate touch targets.
- **SaaS-style** dashboard: rounded cards, subtle shadows, clear hierarchy.
- **Tooltips** on important actions; **dialogs** for PIN, confirmations, and command palette.
- **Toasts** (Sonner) for success and error feedback; **skeletons** during loading.

---

## 🖼️ Screenshots

> Add your own screenshots under `docs/screenshots/` or `.github/` and link them here.

| Screen | Suggested capture |
|--------|-------------------|
| **Dashboard** | Overview with stats cards, charts, and recent expenses. |
| **Expenses** | Table with categories, amounts, codes, filters. |
| **Savings PIN** | PIN dialog (set or verify) before accessing savings content. |

Example (after you add images):

```markdown
![Dashboard](./docs/screenshots/dashboard.png)
![Expenses](./docs/screenshots/expenses.png)
![Savings PIN](./docs/screenshots/savings-pin.png)
```

---

## 🧪 Known Issues / Notes

- **Middleware** validates presence of a **session cookie**, not live Firebase token revocation. Treat middleware as a **first line of defense**; combine with **Firestore rules** and client auth checks.
- **PIN flows** (savings, settings change PIN, dashboard savings reveal) are enforced in the **UI** and **Firestore**; cookies only skip repeated prompts for a short time.
- Next.js may show notices about **middleware** naming in newer versions—follow the framework upgrade guide when bumping Next.js.

---

## 📦 Future Improvements

- **Export** (CSV / Excel) for expenses and savings reports.
- **Budgets** and spending alerts per category.
- **Notifications** (email or push) for large transactions or goals.
- **Multi-user / household** sharing with roles (long-term).
- **Offline** or **PWA** enhancements.

---

## 👨‍💻 Author

- **Name:** *Your name*
- **GitHub:** [github.com/your-username](https://github.com/your-username)

---

## 📄 License

This project is **private** by default (`"private": true` in `package.json`). Add a `LICENSE` file if you open-source it.

---

*Built with Next.js App Router, Tailwind CSS v4, shadcn/ui, and Firebase.*
