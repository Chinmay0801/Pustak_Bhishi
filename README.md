# 📚 Pustak Bhishi - Library Management Application

A complete web application built to manage a Marathi library of 800+ books. Built with React, Tailwind CSS, and Firebase, this application ensures that both members and the administrator can easily track available books, borrow transactions, and catalog imports.

## ✨ Features

### 1. Authentication & Security
- Secure Email & Password Registration via Firebase Auth.
- Real-time login/logout state management.
- **Admin Role-Based Access (RBAC):** Users with an `isAdmin` flag in the Firestore database receive special routing permissions, UI access, and invite-code generation tools.
- Member Profile setup and password management via the personalized Settings dashboard.

### 2. Library Catalog (Member View)
- A highly performant grid layout showing all library books.
- **Marathi Metadata Support:** Flawlessly reads and renders Marathi Excel fields:
  - `नंबर` (Book Number)
  - `पुस्तकाचे नाव` (Title)
  - `लेखकाचे नाव` (Author)
  - `कोणाची भिशी` (Contributor/Donor)
  - `किंमत` (Price)
  - `कधी` (Date Received)
- Dynamic layout tags for status (`Available`, `Borrowed`, `Repair`).
- **Real-time Search & Filtering:** Powerful client-side filtering by book status, number, or Marathi title.

### 3. Borrow & Return Flow
- **Members** can click "Borrow Book" on any available book to instantly register a transaction in the database and mark the book as unavailable.
- **My Books Page:** A secure route showing members exactly what books they currently hold. Members can physically return books and click "Return Book" to update the library manifest.
- **Transactions & Overdue Flagging:** Visual warnings for books held past the maximum borrow duration. The system supports fines and status tracking (`Returned`, `Returned Late`, `Overdue`, `Active`).

### 4. Admin Dashboard & Bulk Tooling
- **Bulk Import Engine (Excel):** Utilizing `xlsx`, the Admin dashboard accepts the legacy `.xlsx` file, parses the Marathi headers, and bulk-uploads hundreds of books into Firestore concurrently with a real-time progress bar.
- **Transactions Manager:** A dedicated tabular view for administrators to monitor all active and historical borrows, handle manual returns, and **Export to CSV**.
- **User & Invite Management:** Admins can invite new users, revoke access, and change roles directly from the Settings panel.
- **Global Settings:** Configure global library parameters like maximum borrow days and library name.
- **Bulk & Single Delete:** Admins can select multiple books via checkboxes to delete them permanently using Firestore Batched Writes, or single-click delete directly from the Catalog.

### 5. UI/UX Enhancements
- **Dark & Light Mode:** Built-in theme switcher to toggle between dark and light interfaces for accessibility.
- **Responsive Design:** Mobile-first Tailwind CSS v4 layout providing a seamless experience on phones and desktops.
- **Senior Accessibility:** Simplified terminology, large readable typography, and intuitive transaction histories.

## 🛠️ Tech Stack & Architecture

- **Frontend:** React (Vite SPA)
- **Styling:** Tailwind CSS v4
- **Routing:** React Router v7
- **Database Backend:** Firebase Firestore (NoSQL Document Store)
- **Authentication:** Firebase Auth
- **Data Parsing:** SheetJS (`xlsx`) for client-side Excel ingestion & CSV exporting.
- **Hosting / CI-CD:** Vercel

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
