<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project conventions

## Technology stack

- **Framework:** Next.js (App Router).
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`).
- **UI:** shadcn/ui (Radix primitives, `components/ui`).
- **Backend / auth / data:** Firebase (initialize and export the app from `lib/firebase.ts`).

## Directory structure (standard)

Use this layout unless the project already diverges for a good reason:

```text
app/                    # Routes, layouts, loading.tsx, error.tsx, route handlers
  (routes)/             # Optional route groups
  api/                  # Route handlers if needed
components/
  ui/                   # shadcn primitives and shared UI
  ...                   # Feature-specific components (e.g. auth/, dashboard/)
lib/
  firebase.ts           # Firebase app init + shared exports (Auth, Firestore, etc.)
  utils.ts              # Shared helpers (e.g. cn)
hooks/                  # Custom React hooks (optional)
public/                 # Static assets
```

- Colocate feature-specific components and small helpers near their routes when it improves clarity.
- Keep Firebase configuration and singleton initialization in **`lib/firebase.ts`**; avoid scattering `initializeApp` across the codebase.

## UI / UX

- **Confirmation dialogs:** Any important or destructive action must use a clear confirmation step — for example **delete**, **log out**, **discard changes**, **remove payment method**, **revoke access**, or **bulk operations**. Use shadcn `AlertDialog` (or `Dialog`) with an explicit primary action label (e.g. “Delete”, “Log out”) and a safe default focus/cancel path.
- **Responsiveness:** Layouts and components must work from **large viewports down to small** — fluid spacing, readable typography, touch-friendly targets on mobile, and no horizontal overflow on narrow screens. Prefer Tailwind responsive modifiers (`sm:`, `md:`, etc.) and test at least desktop and mobile widths.
- **Loading and feedback:** Show loading states for async actions (buttons with pending state, skeletons where appropriate). Surface errors in a user-visible way (toast or inline message), not only in the console.
- **Accessibility:** Interactive elements must be keyboard reachable; dialogs must trap focus and restore it on close; use semantic HTML and sufficient contrast.
- **Consistency:** Reuse shadcn patterns (Button, Card, Input, Form) and shared layout primitives so screens feel cohesive.

## Code quality

- **TypeScript:** Prefer strict typing; avoid `any` unless unavoidable and documented.
- **Env and secrets:** Firebase and other secrets belong in environment variables (e.g. `.env.local`); never commit real keys. Document required env vars in README when adding new ones.
- **Client vs server:** Mark client components with `"use client"` only where needed (browser APIs, hooks, interactivity). Prefer server components for data-fetching when compatible with Firebase usage.
- **Firebase:** Centralize auth and Firestore access patterns; handle unauthenticated or permission-denied states explicitly in the UI.

## What to avoid

- Destructive or irreversible actions without a confirmation dialog.
- One-off inline styles that fight the Tailwind / shadcn system without reason.
- Duplicating Firebase initialization outside `lib/firebase.ts`.
