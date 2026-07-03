import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile, getAllUsers, updateUserRole, deleteUserDoc, addPendingInvite, getPendingInvites, deletePendingInvite } from '../services/userService';
import { getPastTransactions, getAllTransactions, getBooks, addBook, returnBook, bulkDeleteBooks } from '../services/bookService';
import { getGlobalSettings, updateGlobalSettings, initializeGlobalSettings } from '../services/settingsService';
import { sendPasswordResetEmail, updatePassword } from 'firebase/auth';
import { auth } from '../firebase';
import * as xlsx from 'xlsx';
import { useNavigate, useLocation } from 'react-router-dom';

// ─────────────────────────────────────────────
// Shared style tokens (keeps the page visually consistent with
// Catalog / MyBooks / Transactions)
// ─────────────────────────────────────────────
const CARD = 'bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 sm:p-6';
const INPUT = 'w-full px-4 py-2.5 bg-[#141414] border border-[#333] rounded-xl text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all';
const LABEL = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5';
const BTN_PRIMARY = 'px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50';
const BTN_DANGER = 'px-4 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all disabled:opacity-50';

function SectionTitle({ children }) {
  return <h2 className="text-lg font-bold text-white mb-4">{children}</h2>;
}

export default function Settings() {
  const { currentUser, userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const defaultTab = queryParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(defaultTab);

  // --- Profile State ---
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [language, setLanguage] = useState('english');
  const [savingProfile, setSavingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [pastTransactions, setPastTransactions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // --- Admin State ---
  const [adminLoading, setAdminLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [newInviteName, setNewInviteName] = useState('');
  const [newInvitePhone, setNewInvitePhone] = useState('');
  const [globalSettings, setGlobalSettings] = useState({ libraryName: '', maxBorrowDays: 30, contactNumber: '' });
  const [stats, setStats] = useState({ totalBooks: 0, totalBorrows: 0 });
  const [adminBooks, setAdminBooks] = useState([]);
  const [adminTxns, setAdminTxns] = useState([]);

  // --- Books Management State ---
  const [importMessage, setImportMessage] = useState('');
  const [importProgress, setImportProgress] = useState(0);
  const [importLoading, setImportLoading] = useState(false);
  const [singleBook, setSingleBook] = useState({ title: '', author: '', bookNumber: '', price: '', contributor: '' });
  const [addingSingleBook, setAddingSingleBook] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // ===================== EFFECTS =====================

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setPhoneNumber(userProfile.phoneNumber || '');
      setLanguage(userProfile.language || 'english');
    }
  }, [userProfile]);

  useEffect(() => {
    if (activeTab === 'profile' && currentUser) {
      loadHistory();
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (['books', 'members', 'config'].includes(activeTab) && userProfile?.isAdmin) {
      loadAdminData();
    }
  }, [activeTab, userProfile]);

  // ===================== PROFILE FUCNTIONS =====================
  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const data = await getPastTransactions(currentUser.uid);
      setPastTransactions(data);
    } catch (err) {
      console.error("Failed to load history", err);
    }
    setLoadingHistory(false);
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateUserProfile(currentUser.uid, { displayName, phoneNumber, language });
      await refreshProfile();
      alert("Profile updated successfully!");
    } catch (err) {
      alert("Failed to update profile: " + err.message);
    }
    setSavingProfile(false);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (!newPassword.trim()) return;
    setChangingPass(true);
    try {
      await updatePassword(currentUser, newPassword);
      alert("Password updated successfully!");
      setNewPassword('');
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        alert("For security reasons, your login session must be fresh before changing your password. Please log out and back in, then try again.");
      } else {
        alert("Failed to update password. Error: " + err.message);
      }
    }
    setChangingPass(false);
  }

  // Check if they are a Google Sign In user
  const isGoogleUser = currentUser?.providerData?.some(p => p.providerId === 'google.com');

  // ===================== ADMIN FUNCTIONS =====================
  async function loadAdminData() {
    setAdminLoading(true);
    try {
      await initializeGlobalSettings();
      const [users, settings, books, allTxns, invites] = await Promise.all([
        getAllUsers(),
        getGlobalSettings(),
        getBooks(),
        getAllTransactions(),
        getPendingInvites()
      ]);
      setAllUsers(users);
      setAdminBooks(books);
      setAdminTxns(allTxns);
      setPendingInvites(invites || []);
      if (settings) setGlobalSettings(settings);
      setStats({
        totalBooks: books.length,
        totalBorrows: allTxns.length
      });
      setSelectedIds([]); // clear selection whenever we reload
    } catch (err) {
      console.error("Failed to load admin data", err);
    }
    setAdminLoading(false);
  }

  async function handleUpdateGlobalSettings(e) {
    e.preventDefault();
    try {
      await updateGlobalSettings(globalSettings);
      alert("Global settings saved.");
    } catch (err) {
      alert("Error saving settings: " + err.message);
    }
  }

  async function handleExportExcel() {
    try {
      const exportData = adminTxns.map(t => ({
        'Book Title': t.bookTitle,
        'Member Email': t.userName,
        'Member ID': t.userId,
        'Borrowed Date': t.borrowedAt ? new Date(t.borrowedAt.toDate()).toLocaleString() : 'N/A',
        'Returned Date': t.returnedAt ? new Date(t.returnedAt.toDate()).toLocaleString() : 'Not Returned',
        'Status': t.isReturned ? 'Returned' : 'Active'
      }));

      const worksheet = xlsx.utils.json_to_sheet(exportData);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, "Borrow History");
      xlsx.writeFile(workbook, "Library_Transactions_Export.xlsx");
    } catch (err) {
      alert("Failed to export: " + err.message);
    }
  }

  async function handleAddSingleBook(e) {
    e.preventDefault();
    if (!singleBook.title.trim()) {
      alert("Book Title is required.");
      return;
    }

    // Unique Book Number Check
    if (singleBook.bookNumber && singleBook.bookNumber.trim() !== '') {
      const exists = adminBooks.some(b => b.bookNumber === singleBook.bookNumber.trim());
      if (exists) {
        alert(`Error: Serial Number "${singleBook.bookNumber}" is already assigned to a book! Please use a unique number.`);
        return;
      }
    }

    setAddingSingleBook(true);
    try {
      await addBook({
        ...singleBook,
        status: 'available'
      });
      alert(`Successfully added "${singleBook.title}"`);
      setSingleBook({ title: '', author: '', bookNumber: '', price: '', contributor: '' });
      loadAdminData();
    } catch (err) {
      alert("Failed to add book: " + err.message);
    }
    setAddingSingleBook(false);
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setImportLoading(true);
    setImportMessage('Parsing Excel file...');
    setImportProgress(0);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = xlsx.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

        // Find the first row that actually has string data (the headers)
        const headerIndex = rawData.findIndex(row => row && row.length > 1 && row.some(cell => typeof cell === 'string' && cell.trim() !== ''));
        if (headerIndex === -1) throw new Error("Could not find any readable data in the Excel file.");

        const headers = rawData[headerIndex].map(h => typeof h === 'string' ? h.toLowerCase().trim() : '');

        const titleIdx = headers.findIndex(h => h.includes('नाव') || h.includes("name") || h.includes("title"));
        const authorIdx = headers.findIndex(h => h.includes('लेखक') || h.includes("author"));
        const numIdx = headers.findIndex(h => h.includes('नंबर') || h.includes("number"));
        const priceIdx = headers.findIndex(h => h.includes('किंमत') || h.includes("price"));
        const ownerIdx = headers.findIndex(h => h.includes('भिशी') || h.includes("owner") || h.includes("contributor"));

        const dataRows = rawData.slice(headerIndex + 1);
        setImportMessage(`Uploading ${dataRows.length} books...`);
        let importedCount = 0;
        let skippedCount = 0;
        const uniqueContributors = new Set();

        // Track existing book numbers for validation (skip duplicates)
        const existingBookNumbers = new Set(adminBooks.map(b => b.bookNumber).filter(Boolean));

        for (const row of dataRows) {
          if (!row || row.length === 0 || !row[titleIdx]) continue; // Skip totally empty rows

          const parsedNum = numIdx !== -1 && row[numIdx] ? row[numIdx].toString().trim() : '';

          // Duplicate Serial Number constraint
          if (parsedNum && existingBookNumbers.has(parsedNum)) {
             skippedCount++;
             continue; // Skip this duplicate
          }
          if (parsedNum) {
             existingBookNumbers.add(parsedNum); // prevent duplicates within the same sheet
          }

          const bookData = {
            bookNumber: parsedNum,
            title: titleIdx !== -1 && row[titleIdx] ? row[titleIdx].toString() : 'Unknown Title',
            author: authorIdx !== -1 && row[authorIdx] ? row[authorIdx].toString() : 'Unknown Author',
            price: priceIdx !== -1 && row[priceIdx] ? row[priceIdx].toString() : '',
            contributor: ownerIdx !== -1 && row[ownerIdx] ? row[ownerIdx].toString() : '',
            status: 'available',
          };

          if (bookData.title === 'Unknown Title' && bookData.author === 'Unknown Author') continue;

          if (bookData.contributor) {
            uniqueContributors.add(bookData.contributor.trim());
          }

          await addBook(bookData);
          importedCount++;
          setImportProgress(Math.round((importedCount / dataRows.length) * 100));
        }

        setImportMessage(`Extracting member profiles from Owner column...`);
        let newInvitesCount = 0;
        for (const contributorName of uniqueContributors) {
          if(!contributorName) continue;

          const lowerName = contributorName.toLowerCase();
          const userExists = allUsers.some(u => u.displayName?.trim().toLowerCase() === lowerName);
          const inviteExists = pendingInvites.some(i => i.name?.trim().toLowerCase() === lowerName);

          if (!userExists && !inviteExists) {
             await addPendingInvite(contributorName, 'Loaded from Excel');
             newInvitesCount++;
          }
        }

        setImportMessage(`Successfully imported ${importedCount} books & generated ${newInvitesCount} pre-registered accounts! ${skippedCount > 0 ? `(Skipped ${skippedCount} items due to duplicate serial numbers)` : ''}`);
        await loadAdminData();
      } catch (err) {
        setImportMessage('Error parsing or uploading file: ' + err.message);
      }
      setImportLoading(false);
    };

    reader.readAsArrayBuffer(file);
    e.target.value = null; // reset input
  }

  async function handleAdminReturn(transaction) {
    if (!window.confirm(`Are you sure you want to mark "${transaction.bookTitle}" as returned?`)) return;
    try {
      await returnBook(transaction.bookId, transaction.id);
      alert("Book marked as returned successfully!");
      loadAdminData();
    } catch (err) {
      alert("Failed to return book: " + err.message);
    }
  }

  function toggleSelection(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  async function executeBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`WARNING: You are about to permanently delete ${selectedIds.length} books.\n\nThis cannot be undone. Are you absolutely sure?`)) return;

    setBulkDeleting(true);
    try {
      await bulkDeleteBooks(selectedIds);
      alert(`Successfully deleted ${selectedIds.length} books.`);
      loadAdminData();
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleResetPassword(email) {
    if (!window.confirm(`Send password reset email to ${email}?`)) return;
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent successfully.");
    } catch (err) {
      alert("Error sending email: " + err.message);
    }
  }

  async function handleToggleAdmin(uid, currentStatus) {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'revoke' : 'grant'} Admin privileges?`)) return;
    try {
      await updateUserRole(uid, !currentStatus);
      loadAdminData();
    } catch (err) {
      alert("Failed to update role: " + err.message);
    }
  }

  async function handleDeleteMember(uid, email) {
    if (!window.confirm(`CRITICAL WARNING: Are you absolutely sure you want to permanently delete the profile for ${email}? This action cannot be undone.`)) return;
    try {
      await deleteUserDoc(uid);
      loadAdminData();
    } catch (err) {
      alert("Failed to delete member: " + err.message);
    }
  }

  async function handleAddInvite(e) {
    e.preventDefault();
    if(!newInviteName.trim() || !newInvitePhone.trim()) return;
    setAdminLoading(true);
    try {
      await addPendingInvite(newInviteName.trim(), newInvitePhone.trim());
      setNewInviteName('');
      setNewInvitePhone('');
      loadAdminData();
    } catch(err) {
      alert("Error adding invite: " + err.message);
      setAdminLoading(false);
    }
  }

  async function handleDeleteInvite(id) {
    if(!window.confirm("Delete this pending invite?")) return;
    setAdminLoading(true);
    try {
      await deletePendingInvite(id);
      loadAdminData();
    } catch(err) {
      alert("Error deleting invite: " + err.message);
      setAdminLoading(false);
    }
  }

  // --- Derived Data ---
  const activeBorrows = adminTxns.filter(t => !t.isReturned);
  const filteredLibraryBooks = adminBooks.filter(book => {
    const query = adminSearchQuery.trim().toLowerCase();
    return query === '' || [book.title, book.author, book.bookNumber]
      .filter(Boolean)
      .some(field => field.toLowerCase().includes(query));
  });

  const isMarathi = userProfile?.language === 'marathi';

  const tProfile = {
    personalInfo: isMarathi ? 'वैयक्तिक माहिती' : 'Personal Information',
    displayName: isMarathi ? 'तुमचे नाव' : 'Display Name',
    phone: isMarathi ? 'फोन नंबर' : 'Phone Number',
    language: isMarathi ? 'भाषा' : 'Display Language',
    email: isMarathi ? 'ईमेल' : 'Email Address (Read-only)',
    save: isMarathi ? 'सेव्ह करा' : 'Save Profile',
    saving: isMarathi ? 'सेव्ह करत आहे...' : 'Saving...'
  };

  const TABS = [
    { id: 'profile', icon: '👤', label: isMarathi ? 'प्रोफाइल' : 'Profile', adminOnly: false },
    { id: 'books', icon: '📚', label: isMarathi ? 'पुस्तके' : 'Manage Books', adminOnly: true },
    { id: 'members', icon: '👥', label: isMarathi ? 'सभासद' : 'Members', adminOnly: true },
    { id: 'config', icon: '⚙️', label: isMarathi ? 'सेटिंग्ज' : 'Global Config', adminOnly: true },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-28">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{isMarathi ? 'सेटिंग्ज हब' : 'Settings Hub'}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{userProfile?.displayName || currentUser.email}</p>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-1 mb-6 bg-[#1a1a1a] border border-[#2a2a2a] p-1 rounded-xl overflow-x-auto">
        {TABS.filter(t => !t.adminOnly || userProfile?.isAdmin).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5
              ${activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#242424]'
              }`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* --- TAB: PROFILE AND PREFERENCES --- */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <div className={CARD}>
              <SectionTitle>{tProfile.personalInfo}</SectionTitle>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className={LABEL}>{tProfile.displayName}</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className={LABEL}>{tProfile.phone}</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className={LABEL}>{tProfile.language}</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className={INPUT}
                  >
                    <option value="english">English</option>
                    <option value="marathi">मराठी (Marathi)</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>{tProfile.email}</label>
                  <input
                    type="email"
                    disabled
                    value={currentUser.email}
                    className={`${INPUT} opacity-50 cursor-not-allowed`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className={`w-full ${BTN_PRIMARY}`}
                >
                  {savingProfile ? tProfile.saving : tProfile.save}
                </button>
              </form>
            </div>

            <div className={CARD}>
              <SectionTitle>Security</SectionTitle>

              {isGoogleUser ? (
                <p className="text-sm text-gray-400 border border-[#333] p-3 rounded-xl bg-[#141414]">
                  🟢 You are signed in via Google. Your password is securely managed by Google.
                </p>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className={LABEL}>Change Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      minLength={6}
                      className={INPUT}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={changingPass || !newPassword}
                    className={BTN_DANGER}
                  >
                    {changingPass ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className={`${CARD} h-fit`}>
            <SectionTitle>My Borrow History</SectionTitle>
            {loadingHistory ? (
              <p className="text-sm text-gray-500">Loading history...</p>
            ) : pastTransactions.length === 0 ? (
              <p className="text-sm text-gray-500">No past transactions found.</p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {pastTransactions.map(txn => (
                  <div key={txn.id} className="p-3 bg-[#141414] border border-[#2a2a2a] rounded-xl">
                    <p className="text-sm font-semibold text-white">{txn.bookTitle}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Borrowed: {txn.borrowedAt ? new Date(txn.borrowedAt.toDate()).toLocaleDateString() : 'N/A'}
                      {' · '}
                      Returned: {txn.returnedAt ? new Date(txn.returnedAt.toDate()).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB: BOOKS MANAGEMENT --- */}
      {activeTab === 'books' && userProfile?.isAdmin && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className={CARD}>
              <SectionTitle>Bulk Import (Excel)</SectionTitle>
              <p className="mb-4 text-sm text-gray-500">
                Select the <code className="px-1.5 py-0.5 rounded bg-[#141414] text-gray-300">.xlsx</code> file containing the book records.
              </p>
              <label className="block p-6 text-center border-2 border-dashed border-[#333] rounded-xl cursor-pointer hover:border-indigo-600/60 hover:bg-[#141414] transition-colors">
                <span className="text-2xl block mb-2">📤</span>
                <span className="text-sm font-semibold text-gray-300">Choose Excel File</span>
                <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={importLoading} className="hidden" />
              </label>
              {importLoading && importProgress > 0 && (
                <div className="w-full mt-4 bg-[#2a2a2a] rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
                </div>
              )}
              {importMessage && <p className="mt-4 text-sm font-medium text-indigo-400">{importMessage}</p>}
            </div>

            <div className={CARD}>
              <SectionTitle>Add Single Book</SectionTitle>
              <form onSubmit={handleAddSingleBook} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>Book Num</label>
                    <input type="text" value={singleBook.bookNumber} onChange={e => setSingleBook({...singleBook, bookNumber: e.target.value})} className={INPUT} placeholder="#123" />
                  </div>
                  <div>
                    <label className={LABEL}>Price</label>
                    <input type="text" value={singleBook.price} onChange={e => setSingleBook({...singleBook, price: e.target.value})} className={INPUT} placeholder="₹100" />
                  </div>
                </div>
                <div>
                  <label className={LABEL}>Title*</label>
                  <input type="text" value={singleBook.title} onChange={e => setSingleBook({...singleBook, title: e.target.value})} required className={INPUT} placeholder="The Alchemist" />
                </div>
                <div>
                  <label className={LABEL}>Author</label>
                  <input type="text" value={singleBook.author} onChange={e => setSingleBook({...singleBook, author: e.target.value})} className={INPUT} placeholder="Paulo Coelho" />
                </div>
                <div>
                  <label className={LABEL}>Donated By / Owner</label>
                  <input type="text" value={singleBook.contributor} onChange={e => setSingleBook({...singleBook, contributor: e.target.value})} className={INPUT} placeholder="Library / Member Name" />
                </div>
                <button type="submit" disabled={addingSingleBook} className={`w-full ${BTN_PRIMARY}`}>
                  {addingSingleBook ? 'Adding...' : '+ Push Book to Catalog'}
                </button>
              </form>
            </div>
          </div>

          <div className={CARD}>
            <SectionTitle>Active Borrowed Books (Process Returns)</SectionTitle>
            {adminLoading ? (
              <div className="py-4 text-sm text-gray-500">Loading active borrows...</div>
            ) : activeBorrows.length === 0 ? (
              <div className="py-8 text-center rounded-xl border border-dashed border-[#333] text-gray-500">
                <p>There are no actively borrowed books right now.</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-[#2a2a2a]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#141414] border-b border-[#2a2a2a]">
                        {['Book Title', 'Borrowed By', 'Borrowed Date', 'Fine', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e1e1e]">
                      {activeBorrows.map(txn => (
                        <tr key={txn.id} className="hover:bg-[#1f1f1f] transition-colors">
                          <td className="px-4 py-3 font-medium text-white max-w-[220px] truncate">{txn.bookTitle}</td>
                          <td className="px-4 py-3 text-gray-400">{txn.userName || txn.userId}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{txn.borrowedAt ? new Date(txn.borrowedAt.toDate()).toLocaleDateString() : 'Unknown'}</td>
                          <td className="px-4 py-3 font-bold">
                            {txn.fineDue > 0 ? <span className="text-red-400">₹{txn.fineDue}</span> : <span className="text-gray-600">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => handleAdminReturn(txn)} className="px-3 py-1.5 text-[11px] font-bold text-white bg-emerald-700 rounded-lg hover:bg-emerald-600 transition-colors whitespace-nowrap">Mark Returned</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list */}
                <div className="md:hidden space-y-3">
                  {activeBorrows.map(txn => (
                    <div key={txn.id} className="p-4 bg-[#141414] border border-[#2a2a2a] rounded-xl">
                      <p className="font-bold text-white text-sm truncate">{txn.bookTitle}</p>
                      <p className="text-xs text-gray-400 mt-1">👤 {txn.userName || txn.userId}</p>
                      <p className="text-xs text-gray-600 mt-0.5">📅 {txn.borrowedAt ? new Date(txn.borrowedAt.toDate()).toLocaleDateString() : 'Unknown'}</p>
                      {txn.fineDue > 0 && <p className="text-xs font-bold text-red-400 mt-1">Fine: ₹{txn.fineDue}</p>}
                      <button onClick={() => handleAdminReturn(txn)} className="mt-3 w-full py-2 text-xs font-bold text-white bg-emerald-700 rounded-lg hover:bg-emerald-600 transition-colors">Mark Returned</button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className={CARD}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <SectionTitle>Library Catalog (Bulk Manage)</SectionTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Find book to delete..."
                  value={adminSearchQuery}
                  onChange={(e) => setAdminSearchQuery(e.target.value)}
                  className={`${INPUT} sm:w-56`}
                />
                <button
                  onClick={executeBulkDelete}
                  disabled={selectedIds.length === 0 || bulkDeleting}
                  className={`whitespace-nowrap ${selectedIds.length === 0 ? 'px-4 py-2.5 text-sm font-bold text-white bg-red-900/50 rounded-xl opacity-50 cursor-not-allowed' : BTN_DANGER}`}
                >
                  {bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.length})`}
                </button>
              </div>
            </div>

            {adminLoading ? (
              <div className="py-4 text-sm text-gray-500">Loading catalog...</div>
            ) : filteredLibraryBooks.length === 0 ? (
              <div className="py-8 text-center rounded-xl border border-dashed border-[#333] text-gray-500">No books found.</div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-y-auto max-h-[600px] rounded-xl border border-[#2a2a2a]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-[#141414] border-b border-[#2a2a2a]">
                        <th className="px-4 py-3 text-left w-12">
                          <input
                            type="checkbox"
                            checked={selectedIds.length === filteredLibraryBooks.length && filteredLibraryBooks.length > 0}
                            onChange={() => {
                              if (selectedIds.length === filteredLibraryBooks.length && filteredLibraryBooks.length > 0) {
                                setSelectedIds([]);
                              } else {
                                setSelectedIds(filteredLibraryBooks.map(b => b.id));
                              }
                            }}
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Num</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Title</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e1e1e]">
                      {filteredLibraryBooks.map(book => (
                        <tr
                          key={book.id}
                          onClick={() => toggleSelection(book.id)}
                          className={`cursor-pointer transition-colors ${selectedIds.includes(book.id) ? 'bg-indigo-950/40' : 'hover:bg-[#1f1f1f]'}`}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={selectedIds.includes(book.id)} onChange={() => toggleSelection(book.id)} />
                          </td>
                          <td className="px-4 py-3 text-gray-500">#{book.bookNumber || 'N/A'}</td>
                          <td className="px-4 py-3 font-medium text-white max-w-[280px] truncate">{book.title}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${book.status === 'available' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/40' : 'bg-amber-900/30 text-amber-400 border-amber-800/40'}`}>
                              {book.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list */}
                <div className="md:hidden space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {filteredLibraryBooks.map(book => (
                    <div
                      key={book.id}
                      onClick={() => toggleSelection(book.id)}
                      className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${selectedIds.includes(book.id) ? 'bg-indigo-950/40 border-indigo-800/50' : 'bg-[#141414] border-[#2a2a2a]'}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(book.id)}
                        onChange={() => toggleSelection(book.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{book.title}</p>
                        <p className="text-xs text-gray-500">#{book.bookNumber || 'N/A'}</p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${book.status === 'available' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/40' : 'bg-amber-900/30 text-amber-400 border-amber-800/40'}`}>
                        {book.status}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* --- TAB: MEMBERS MANAGEMENT --- */}
      {activeTab === 'members' && userProfile?.isAdmin && (
        <div className="space-y-6">
          <div className={CARD}>
            <SectionTitle>Registered Member List</SectionTitle>
            {adminLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {allUsers.map(user => {
                  const userTxns = adminTxns.filter(t => t.userId === user.uid && !t.isReturned);
                  const countBorrowed = userTxns.length;
                  const totalDonated = adminBooks.filter(b => b.contributor && b.contributor.trim().toLowerCase() === (user.displayName || '').trim().toLowerCase()).length;

                  return (
                    <div key={user.uid} className="p-4 bg-[#141414] border border-[#2a2a2a] rounded-xl">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{user.displayName || 'No Name'}</p>
                          <p className="text-xs text-gray-500 truncate">{user.phoneNumber || 'No phone'} · {user.email}</p>
                        </div>
                        <span className={`shrink-0 px-2 py-1 text-[10px] font-bold rounded-full ${user.isAdmin ? 'bg-indigo-900/40 text-indigo-400 border border-indigo-800/40' : 'bg-[#242424] text-gray-400 border border-[#333]'}`}>
                          {user.isAdmin ? 'Admin' : 'Member'}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-emerald-400 mb-2">
                        📗 Donated: {totalDonated} · 📖 Borrowed: {countBorrowed} active
                      </p>

                      {userTxns.length > 0 && (
                        <div className="mb-3 space-y-1">
                          {userTxns.map(t => {
                            const bookInfo = adminBooks.find(b => b.id === t.bookId);
                            const donor = bookInfo?.contributor ? bookInfo.contributor : 'Library';
                            return (
                              <p key={t.id} className="text-xs text-gray-500 border-l-2 border-emerald-700/60 pl-2">
                                <span className="font-medium text-gray-300">{t.bookTitle}</span>
                                <span className="italic ml-1">(from {donor})</span>
                              </p>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#2a2a2a]">
                        <button onClick={() => handleResetPassword(user.email)} className="text-xs font-semibold text-blue-400 hover:text-blue-300">Reset Pass</button>
                        {user.uid !== currentUser.uid && (
                          <>
                            <span className="text-[#333]">·</span>
                            <button onClick={() => handleToggleAdmin(user.uid, user.isAdmin)} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                              {user.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                            </button>
                            <span className="text-[#333]">·</span>
                            <button onClick={() => handleDeleteMember(user.uid, user.email)} className="text-xs font-semibold text-red-500 hover:text-red-400">Remove</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={CARD}>
            <SectionTitle>Pre-Registered Members Setup</SectionTitle>
            <form onSubmit={handleAddInvite} className="flex flex-col md:flex-row gap-3 mb-5">
              <input type="text" placeholder="Full Name" value={newInviteName} onChange={(e) => setNewInviteName(e.target.value)} className={`${INPUT} flex-1`} required />
              <input type="tel" placeholder="Phone Number" value={newInvitePhone} onChange={(e) => setNewInvitePhone(e.target.value)} className={`${INPUT} flex-1`} required />
              <button type="submit" disabled={adminLoading} className={BTN_PRIMARY}>Add Invite</button>
            </form>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingInvites.map(invite => (
                <div key={invite.id} className="p-4 bg-[#141414] border border-[#2a2a2a] rounded-xl relative group">
                  <p className="font-bold text-white text-sm">{invite.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{invite.phone}</p>
                  <button onClick={() => handleDeleteInvite(invite.id)} className="absolute right-3 top-3 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold">✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB: GLOBAL CONFIGURATION --- */}
      {activeTab === 'config' && userProfile?.isAdmin && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className={CARD}>
            <SectionTitle>Global Configuration</SectionTitle>
            <form onSubmit={handleUpdateGlobalSettings} className="space-y-4">
              <div>
                <label className={LABEL}>Library Name</label>
                <input type="text" value={globalSettings.libraryName} onChange={(e) => setGlobalSettings({...globalSettings, libraryName: e.target.value})} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Max Borrow Days</label>
                <input type="number" value={globalSettings.maxBorrowDays} onChange={(e) => setGlobalSettings({...globalSettings, maxBorrowDays: parseInt(e.target.value)})} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Admin WhatsApp</label>
                <input type="tel" value={globalSettings.contactNumber} onChange={(e) => setGlobalSettings({...globalSettings, contactNumber: e.target.value})} className={INPUT} />
              </div>
              <button type="submit" className={`w-full ${BTN_PRIMARY}`}>Save Globally</button>
            </form>
          </div>

          <div className={`${CARD} flex flex-col justify-center items-center text-center`}>
            <span className="text-3xl mb-2">📊</span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Data Export</h3>
            <button onClick={handleExportExcel} className={`w-full ${BTN_PRIMARY}`}>Export Transactions (.xlsx)</button>
          </div>
        </div>
      )}
    </div>
  );
}
