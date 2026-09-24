# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Pustak Bhishi is a React SPA (Vite) for managing a Marathi library of 800+ books, backed directly by Firebase (Auth + Firestore) with no custom backend server — all data access happens client-side through the Firebase JS SDK.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build to dist/
npm run lint      # ESLint over the whole repo
npm run preview   # Preview a production build locally
npm test          # Vitest — pure logic in src/lib (fines, Excel parsing, member matching)
firebase deploy --only firestore:rules,firestore:indexes   # project: pustakbhishi-152e3 (.firebaserc)
```

Firebase-touching one-off scripts (run from repo root, read config from `.env` directly since `dotenv` isn't installed). They run unauthenticated, so under `firestore.rules` their writes are denied — use the admin UI instead, or relax rules temporarily:
```bash
node scripts/wipe_books.js            # Deletes ALL docs in `books` and `transactions` — destructive, confirm with user first
node scripts/import_members.js        # Seeds a hardcoded member list into `pendingInvites`
node scripts/import_excel_invites.js  # Extracts unique owner names from Data/Book_Data_final.xlsx into `pendingInvites`
node get_excel_headers.js             # Prints headers/first row of Data/Book_Data_final.xlsx (debugging import mappings)
```

## Architecture

**Data layer**: `src/firebase.js` initializes the Firebase app from `VITE_FIREBASE_*` env vars and exports `auth`/`db`. All Firestore access is centralized in `src/services/*.js` — pages never call Firestore directly:
- `bookService.js` — books & transactions collections (borrow/return, bulk delete, fine calculation)
- `userService.js` — `users` and `pendingInvites` collections
- `settingsService.js` — `settings/global` doc for library-wide config, incl. loan policy (`loanDays`, `fineAmount`; `getLoanPolicy()` caches it)

Pure logic lives in `src/lib/` (`loanPolicy.js`, `excelImport.js`, `members.js`) with Vitest tests alongside. `firestore.rules` is the real access control — client-side `isAdmin` checks are UI only.

**Auth/profile flow**: `src/context/AuthContext.jsx` wraps the app and exposes `currentUser` (Firebase Auth user) and `userProfile` (the Firestore `users/{uid}` doc, which carries `isAdmin`, `displayName`, `phoneNumber`). `App.jsx`'s `PrivateRoute` gates on both: unauthenticated → `/login`; authenticated but missing `displayName`/`phoneNumber` → `/setup-profile`; `requireAdmin` routes check `userProfile.isAdmin`.

**Member onboarding via pending invites**: Admins pre-register members (manually or via Excel owner-column extraction) into `pendingInvites` (`{name, phone}`). A new signup lands on `SetupProfile.jsx`, picks their name from that list, and the invite is claimed atomically via `claimInvite` (Firestore transaction: copy into `users/{uid}` with `claimedInviteId`, delete invite), or they self-register as a plain member. Only when no admin exists and the `settings/bootstrap` marker is absent does the first user become admin (`bootstrapFirstAdmin` writes the marker in the same batch; rules enforce it once). Any admin sign-in writes the marker if missing.

**Role-based page rendering**: Several pages branch entirely on `userProfile.isAdmin` rather than having separate routes — e.g. `Dashboard.jsx` renders `MemberDashboard` vs `AdminDashboard` from one exported component, and `Settings.jsx` (despite the name) is the general admin console, a shell over `src/pages/settings/{Profile,Books,Members,Config}Tab.jsx`; it loads shared admin data and backfills `books.contributorUid` from contributor names.

**Excel import (Marathi headers)**: Bulk book import (`src/pages/settings/BooksTab.jsx`, parsing in `src/lib/excelImport.js`) lazy-loads `xlsx` to parse an uploaded workbook, locates the header row heuristically (first row with multiple non-empty string cells), then matches columns by substring against both Marathi and English header variants (e.g. `नाव`/`name`/`title`, `लेखक`/`author`, `नंबर`/`number`, `किंमत`/`price`, `भिशी`/`owner`/`contributor`). Duplicate `bookNumber`s are skipped; unique contributor names not already a user or pending invite are auto-added to `pendingInvites`. `Data/Book_Data_final.xlsx` is the legacy source workbook this format is derived from.

**Borrow/return & fines**: `borrowBook`/`returnBook` in `bookService.js` run as Firestore transactions over the book doc and its `transactions` doc (borrow fails if the book isn't available). Active-loan fines are computed at read time (`computeLoanStatus`): flat `fineAmount` once past the stored `dueDate`. On return the fine is recorded as `fineAmount`; a member's own return leaves `finePaid: false` if overdue, admins pass `markFinePaid: true` or use `markFinePaid()` later (Transactions page).

**Member linkage**: books carry `contributor` (name text) and `contributorUid`; `isContributedBy` prefers the uid and falls back to name match.

**Styling**: Tailwind CSS v4 (via `@tailwindcss/postcss`), dark-themed by default (`bg-[#121212]` app shell), utility classes inline in JSX — no component library.

## Known open issues (`Data/Issues.txt`)

- Switching from Google sign-in to email/password for the same account throws `auth/invalid-credential`.
- New users sometimes can't sign in via the pre-approved (pending invite) path.
- Catalog search can show duplicate-looking entries for books with the same name.
- Member list/profile should surface per-member borrow history and total donated books, not just contact info — not yet implemented.
