# 📚 Pustak Bhishi - Library Management Application

A complete web application built to manage a Marathi library of 800+ books. Built with React, Tailwind CSS, and Firebase, this application ensures that both members and the administrator can easily track available books, borrow transactions, and catalog imports.

## ✨ Current Features (As of Phase 1 & 2 completion)

### 1. Authentication & Security
- Secure Email & Password Registration via Firebase Auth.
- Real-time login/logout state management.
- **Admin Role-Based Access (RBAC):** Users with an `isAdmin` flag in the Firestore database receive special routing permissions and UI access.

### 2. Library Catalog (Member View)
- A highly performant grid layout showing all library books.
- **Marathi Metadata Support:** Flawlessly reads and renders Marathi Excel fields.
  - `नंबर` (Book Number)
  - `पुस्तकाचे नाव` (Title)
  - `लेखकाचे नाव` (Author)
  - `कोणाची भिशी` (Contributor/Donor)
  - `किंमत` (Price)
  - `कधी` (Date Received)
- Dynamic layout tags for status (`Available`, `Borrowed`, `Repair`).

### 3. Borrow & Return Flow
- **Members** can click "Borrow Book" on any available book to instantly register a transaction in the database and mark the book as unavailable.
- **My Books Page:** A secure route showing members exactly what books they currently hold. Members can physically return books and click "Return Book" to update the library manifest.
- **Admin Override:** The `/admin` dashboard lists *all* active library borrows, allowing administrators to record a return on behalf of any member.

### 4. Admin Dashboard & Bulk Tooling
- **Bulk Import Engine (Excel):** Utilizing `xlsx`, the Admin dashboard accepts the legacy `.xlsx` file, parses the Marathi headers, and bulk-uploads hundreds of books into Firestore concurrently with a real-time progress bar.
- **Bulk Delete System:** A tabular management view allowing the Admin to select multiple books via checkboxes and permanently purge them from the database using Firestore Batched Writes.
- **Single Item Deletion:** Admins can single-click delete individual books straight from the Catalog.

## 🛠️ Tech Stack & Architecture

- **Frontend:** React (Vite SPA)
- **Styling:** Tailwind CSS v4 (Mobile Responsive first)
- **Routing:** React Router v6 (Protected / Private Routes)
- **Database Backend:** Firebase Firestore (NoSQL Document Store)
- **Authentication:** Firebase Auth
- **Data Parsing:** SheetJS (`xlsx`) for client-side Excel ingestion.
- **Hosting / CI-CD:** Vercel

## 🚀 Upcoming Roadmap

This project is actively developed. Upcoming features based on our roadmap schedule:

- **Auth Expansion:** One-tap Google Sign-in to remove friction for older members.
- **Real-time Search:** Powerful client-side filtering by active status, book number, or Marathi title.
- **Member Profiles & Admin Settings:** Robust transaction histories, password resettability, dark mode toggles, and UI optimizations for senior accessibility (larger buttons, simplified terminology).
- **Overdue Flagging:** Visual warnings for books held longer than 30 days.

## 👩‍💻 How to Run Locally

1. Clone the repository:
   ```bash
   git clone [your-github-repo-url]
   cd Pustak_Bhishi
   ```
2. Install standard Node dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory mirroring `.env.example` with your Firebase Configuration strings.
4. Boot up the Vite dev server:
   ```bash
   npm run dev
   ```
