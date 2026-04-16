import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile, getAllUsers, updateUserRole, deleteUserDoc, addPendingInvite, getPendingInvites, deletePendingInvite } from '../services/userService';
import { getPastTransactions, getAllTransactions, getBooks, addBook, returnBook, bulkDeleteBooks } from '../services/bookService';
import { getGlobalSettings, updateGlobalSettings, initializeGlobalSettings } from '../services/settingsService';
import { sendPasswordResetEmail, updatePassword } from 'firebase/auth';
import { auth } from '../firebase';
import * as xlsx from 'xlsx';
import { useNavigate, useLocation } from 'react-router-dom';



export default function Settings() {
  const { currentUser, userProfile, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const defaultTab = queryParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(defaultTab);

  // --- Theme State ---
  const [isDarkMode, setIsDarkMode] = useState(true); // Default dark

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

  function toggleTheme() {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.body.style.backgroundColor = "#121212";
      document.body.style.color = "#ffffff";
    } else {
      document.body.style.backgroundColor = "#f9fafb";
      document.body.style.color = "#111827";
    }
  }

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

  return (
    <div className={`max-w-6xl p-6 mx-auto mt-8 rounded-lg shadow-md ${isDarkMode ? 'bg-[#1e1e1e] text-gray-200' : 'bg-white text-gray-900'}`}>
      <h1 className="mb-6 text-3xl font-bold">{isMarathi ? 'सेटिंग्ज हब' : 'Settings Hub'}</h1>

      {/* TABS */}
      <div className="flex px-2 mb-6 space-x-4 border-b border-gray-700 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('profile')}
          className={`py-2 px-4 whitespace-nowrap font-semibold text-sm transition-colors border-b-2 ${activeTab === 'profile' ? 'border-[#4ade80] text-[#4ade80]' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
        >
          👤 {isMarathi ? 'प्रोफाइल' : 'Profile & Preferences'}
        </button>
        {userProfile?.isAdmin && (
          <>
            <button
              onClick={() => setActiveTab('books')}
              className={`py-2 px-4 whitespace-nowrap font-semibold text-sm transition-colors border-b-2 ${activeTab === 'books' ? 'border-[#4ade80] text-[#4ade80]' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            >
              📚 {isMarathi ? 'पुस्तके व्यवस्थापित करा' : 'Manage Books'}
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`py-2 px-4 whitespace-nowrap font-semibold text-sm transition-colors border-b-2 ${activeTab === 'members' ? 'border-[#4ade80] text-[#4ade80]' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            >
              👥 {isMarathi ? 'सभासद यादी' : 'Member List'}
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`py-2 px-4 whitespace-nowrap font-semibold text-sm transition-colors border-b-2 ${activeTab === 'config' ? 'border-[#4ade80] text-[#4ade80]' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            >
              ⚙️ {isMarathi ? 'सेटिंग्ज' : 'Global Config'}
            </button>
          </>
        )}
      </div>

      {/* --- TAB: PROFILE AND PREFERENCES --- */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <div className={`p-6 border rounded-lg shadow-sm ${isDarkMode ? 'bg-[#252525] border-[#333]' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">Personal Information</h2>
              </div>
              const t = {
                personalInfo: isMarathi ? 'वैयक्तिक माहिती' : 'Personal Information',
                displayName: isMarathi ? 'तुमचे नाव' : 'Display Name',
                phone: isMarathi ? 'फोन नंबर' : 'Phone Number',
                language: isMarathi ? 'भाषा' : 'Display Language',
                email: isMarathi ? 'ईमेल' : 'Email Address (Read-only)',
                save: isMarathi ? 'सेव्ह करा' : 'Save Profile',
                saving: isMarathi ? 'सेव्ह करत आहे...' : 'Saving...'
              };
              
              return (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold">{t.displayName}</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="block w-full px-3 py-2 mt-1 border rounded-md"
                    style={{ background: isDarkMode ? '#1e1e1e' : '#fff', borderColor: isDarkMode ? '#444' : '#ccc' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold">{t.phone}</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="block w-full px-3 py-2 mt-1 border rounded-md"
                    style={{ background: isDarkMode ? '#1e1e1e' : '#fff', borderColor: isDarkMode ? '#444' : '#ccc' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold">{t.language}</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="block w-full px-3 py-2 mt-1 border rounded-md"
                    style={{ background: isDarkMode ? '#1e1e1e' : '#fff', borderColor: isDarkMode ? '#444' : '#ccc' }}
                  >
                    <option value="english">English</option>
                    <option value="marathi">मराठी (Marathi)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium opacity-70">{t.email}</label>
                  <input
                    type="email"
                    disabled
                    value={currentUser.email}
                    className="block w-full px-3 py-2 mt-1 rounded-md opacity-50"
                    style={{ background: isDarkMode ? '#111' : '#f1f1f1', borderColor: isDarkMode ? '#222' : '#ddd' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full px-4 py-2 font-bold text-[#1e1e1e] transition-colors bg-[#4ade80] rounded-md hover:bg-[#3bca6b] disabled:opacity-50"
                >
                  {savingProfile ? t.saving : t.save}
                </button>
              </form>
              );
            })()}
            </div>

            <div className={`p-6 border rounded-lg shadow-sm ${isDarkMode ? 'bg-[#252525] border-[#333]' : 'bg-white border-gray-200'}`}>
              <h2 className="mb-4 text-xl font-bold">Preferences & Security</h2>
              
              <div className="flex items-center justify-between p-4 border rounded-md mb-6" style={{ borderColor: isDarkMode ? '#444' : '#eee' }}>
                <div>
                  <h3 className="font-bold">Dark Mode</h3>
                  <p className="text-sm opacity-70">Toggle between Light and Dark app themes.</p>
                </div>
                <button 
                  onClick={toggleTheme}
                  className="px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  {isDarkMode ? '☀️ Switch to Light' : '🌙 Switch to Dark'}
                </button>
              </div>

              {isGoogleUser ? (
                <div className="pt-4 border-t" style={{ borderColor: isDarkMode ? '#444' : '#eee' }}>
                  <h3 className="font-bold mb-2">Change Password</h3>
                  <p className="text-sm opacity-80 border p-3 rounded" style={{ background: isDarkMode ? '#1e1e1e' : '#f9f9f9', borderColor: isDarkMode ? '#444' : '#ddd' }}>
                    🟢 You are signed in via Google. Your password is securely managed by Google.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-4 pt-4 border-t" style={{ borderColor: isDarkMode ? '#444' : '#eee' }}>
                  <div>
                    <h3 className="font-bold mb-2">Change Password</h3>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      minLength={6}
                      className="block w-full px-3 py-2 mt-1 border rounded-md"
                      style={{ background: isDarkMode ? '#1e1e1e' : '#fff', borderColor: isDarkMode ? '#444' : '#ccc' }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={changingPass || !newPassword}
                    className="px-4 py-2 font-bold text-white transition-colors bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {changingPass ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className={`p-6 border rounded-lg shadow-sm h-fit ${isDarkMode ? 'bg-[#252525] border-[#333]' : 'bg-white border-gray-200'}`}>
            <h2 className="mb-4 text-xl font-bold">My Borrow History</h2>
            {loadingHistory ? (
              <p className="opacity-70">Loading history...</p>
            ) : pastTransactions.length === 0 ? (
              <p className="opacity-70">No past transactions found.</p>
            ) : (
              <div className="overflow-y-auto max-h-[400px] border rounded" style={{ borderColor: isDarkMode ? '#444' : '#eee' }}>
                <ul className="divide-y" style={{ borderColor: isDarkMode ? '#444' : '#eee' }}>
                  {pastTransactions.map(txn => (
                    <li key={txn.id} className="p-3" style={{ background: isDarkMode ? '#1e1e1e' : '#f9fafb' }}>
                      <p className="font-semibold">{txn.bookTitle}</p>
                      <p className="text-xs opacity-70">
                        Borrowed: {txn.borrowedAt ? new Date(txn.borrowedAt.toDate()).toLocaleDateString() : 'N/A'} <br/>
                        Returned: {txn.returnedAt ? new Date(txn.returnedAt.toDate()).toLocaleDateString() : 'N/A'}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB: BOOKS MANAGEMENT --- */}
      {activeTab === 'books' && userProfile?.isAdmin && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className={`p-6 border rounded-lg ${isDarkMode ? 'bg-[#252525] border-[#333]' : 'bg-white border-gray-200'}`}>
              <h2 className="mb-4 text-xl font-bold">Bulk Import (Excel)</h2>
              <p className="mb-4 text-sm opacity-80">
                Select the <code className="px-1 rounded bg-black/20">Books_Data.xlsx</code> file containing the records.
              </p>
              <label className="block p-4 mt-2 text-center border-2 border-dashed rounded-md cursor-pointer transition-colors" style={{ borderColor: isDarkMode ? '#555' : '#ccc' }}>
                <span className="text-sm font-medium">Choose Excel File</span>
                <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={importLoading} className="hidden" />
              </label>
              {importLoading && importProgress > 0 && (
                <div className="w-full mt-4 bg-gray-700 rounded-full h-2.5">
                  <div className="bg-[#4ade80] h-2.5 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
                </div>
              )}
              {importMessage && <p className="mt-4 text-sm font-medium text-[#4ade80]">{importMessage}</p>}
            </div>

            <div className={`p-6 border rounded-lg ${isDarkMode ? 'bg-[#252525] border-[#333]' : 'bg-white border-gray-200'}`}>
              <h2 className="mb-4 text-xl font-bold">Add Single Book</h2>
              <form onSubmit={handleAddSingleBook} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase opacity-70">Book Num</label>
                    <input type="text" value={singleBook.bookNumber} onChange={e => setSingleBook({...singleBook, bookNumber: e.target.value})} className="w-full px-3 py-2 mt-1 border rounded-md text-sm" style={{ background: isDarkMode?'#1e1e1e':'#fff', borderColor: isDarkMode?'#444':'#ccc' }} placeholder="#123" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase opacity-70">Price</label>
                    <input type="text" value={singleBook.price} onChange={e => setSingleBook({...singleBook, price: e.target.value})} className="w-full px-3 py-2 mt-1 border rounded-md text-sm" style={{ background: isDarkMode?'#1e1e1e':'#fff', borderColor: isDarkMode?'#444':'#ccc' }} placeholder="₹100" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase opacity-70">Title*</label>
                  <input type="text" value={singleBook.title} onChange={e => setSingleBook({...singleBook, title: e.target.value})} required className="w-full px-3 py-2 mt-1 border rounded-md text-sm" style={{ background: isDarkMode?'#1e1e1e':'#fff', borderColor: isDarkMode?'#444':'#ccc' }} placeholder="The Alchemist" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase opacity-70">Author</label>
                  <input type="text" value={singleBook.author} onChange={e => setSingleBook({...singleBook, author: e.target.value})} className="w-full px-3 py-2 mt-1 border rounded-md text-sm" style={{ background: isDarkMode?'#1e1e1e':'#fff', borderColor: isDarkMode?'#444':'#ccc' }} placeholder="Paulo Coelho" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase opacity-70">Donated By / Owner</label>
                  <input type="text" value={singleBook.contributor} onChange={e => setSingleBook({...singleBook, contributor: e.target.value})} className="w-full px-3 py-2 mt-1 border rounded-md text-sm" style={{ background: isDarkMode?'#1e1e1e':'#fff', borderColor: isDarkMode?'#444':'#ccc' }} placeholder="Library / Member Name" />
                </div>
                <button type="submit" disabled={addingSingleBook} className="w-full mt-2 px-4 py-2 font-bold text-[#1e1e1e] bg-[#4ade80] rounded hover:bg-[#3bca6b] disabled:opacity-50 transition-colors">
                  {addingSingleBook ? 'Adding...' : '+ Push Book to Catalog'}
                </button>
              </form>
            </div>
          </div>

          <div className={`p-6 border rounded-lg ${isDarkMode ? 'bg-[#252525] border-[#333]' : 'bg-white border-gray-200'}`}>
            <h2 className="mb-4 text-xl font-bold">Active Borrowed Books (Process Returns)</h2>
            {adminLoading ? (
              <div className="py-4 text-sm opacity-50">Loading active borrows...</div>
            ) : activeBorrows.length === 0 ? (
              <div className="py-8 text-center rounded-lg border border-dashed opacity-70">
                <p>There are no actively borrowed books right now.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-md">
                <table className="min-w-full divide-y" style={{ borderColor: isDarkMode ? '#444' : '#eee' }}>
                  <thead style={{ background: isDarkMode ? '#1e1e1e' : '#f9fafb' }}>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Book Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Borrowed By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Borrowed Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Fine</th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: isDarkMode ? '#444' : '#eee', background: isDarkMode ? '#222' : '#fff' }}>
                    {activeBorrows.map(txn => (
                      <tr key={txn.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{txn.bookTitle}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm opacity-80">{txn.userName || txn.userId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm opacity-80">{txn.borrowedAt ? new Date(txn.borrowedAt.toDate()).toLocaleDateString() : 'Unknown'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                          {txn.fineDue > 0 ? <span className="text-red-500">₹{txn.fineDue}</span> : <span className="text-green-500">None</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={() => handleAdminReturn(txn)} className="text-[#4ade80] hover:text-[#3bca6b] font-semibold">Mark Returned</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={`p-6 border rounded-lg ${isDarkMode ? 'bg-[#252525] border-[#333]' : 'bg-white border-gray-200'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
              <div>
                <h2 className="text-xl font-bold">Library Catalog (Bulk Manage)</h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Find book to delete..."
                  value={adminSearchQuery}
                  onChange={(e) => setAdminSearchQuery(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                  style={{ background: isDarkMode ? '#1e1e1e' : '#fff', borderColor: isDarkMode ? '#444' : '#ccc' }}
                />
                <button
                  onClick={executeBulkDelete}
                  disabled={selectedIds.length === 0 || bulkDeleting}
                  className={`px-4 py-2 font-bold text-white transition-colors rounded ${selectedIds.length === 0 ? 'bg-red-400 opacity-50 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.length})`}
                </button>
              </div>
            </div>

            {adminLoading ? (
              <div className="py-4 text-sm opacity-50">Loading catalog...</div>
            ) : filteredLibraryBooks.length === 0 ? (
              <div className="py-8 text-center rounded-lg border border-dashed opacity-70">No books found.</div>
            ) : (
              <div className="overflow-y-auto max-h-[600px] border rounded-md">
                <table className="min-w-full divide-y" style={{ borderColor: isDarkMode ? '#444' : '#eee' }}>
                  <thead className="sticky top-0 z-10" style={{ background: isDarkMode ? '#1e1e1e' : '#f9fafb' }}>
                    <tr>
                      <th className="px-6 py-3 text-left w-12">
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
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Num</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: isDarkMode ? '#444' : '#eee', background: isDarkMode ? '#222' : '#fff' }}>
                    {filteredLibraryBooks.map(book => (
                      <tr key={book.id} onClick={() => toggleSelection(book.id)} className="cursor-pointer" style={{ background: selectedIds.includes(book.id) ? (isDarkMode ? '#333' : '#e0e7ff') : 'transparent' }}>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.includes(book.id)} onChange={() => toggleSelection(book.id)} />
                        </td>
                        <td className="px-6 py-4 text-sm opacity-80">#{book.bookNumber || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm font-medium">{book.title}</td>
                        <td className="px-6 py-4 text-sm">{book.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB: MEMBERS MANAGEMENT --- */}
      {activeTab === 'members' && userProfile?.isAdmin && (
        <div className="space-y-8">
          <div className={`p-6 border rounded-lg ${isDarkMode ? 'bg-[#252525] border-[#333]' : 'bg-white border-gray-200'}`}>
            <h2 className="mb-4 text-xl font-bold">Registered Member List</h2>
            {adminLoading ? (
              <p className="opacity-50">Loading...</p>
            ) : (
              <div className="overflow-x-auto border rounded-md">
                <table className="min-w-full divide-y" style={{ borderColor: isDarkMode ? '#444' : '#eee' }}>
                  <thead style={{ background: isDarkMode ? '#1e1e1e' : '#f9fafb' }}>
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase opacity-70">Member Details</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase opacity-70">Role</th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase opacity-70">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: isDarkMode ? '#444' : '#eee', background: isDarkMode ? '#222' : '#fff' }}>
                    {allUsers.map(user => {
                      const userTxns = adminTxns.filter(t => t.userId === user.uid && !t.isReturned);
                      const countBorrowed = userTxns.length;
                      const totalDonated = adminBooks.filter(b => b.contributor && b.contributor.trim().toLowerCase() === (user.displayName || '').trim().toLowerCase()).length;
                      
                      return (
                      <tr key={user.uid}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold">{user.displayName || 'No Name'}</div>
                          <div className="text-sm opacity-70">{user.phoneNumber || 'No phone'} | {user.email}</div>
                          <div className="text-xs text-[#4ade80] mt-1 font-semibold">
                            Donated: {totalDonated} books | Borrows: {countBorrowed} active
                          </div>
                          {userTxns.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {userTxns.map(t => {
                                const bookInfo = adminBooks.find(b => b.id === t.bookId);
                                const donor = bookInfo?.contributor ? bookInfo.contributor : 'Library';
                                return (
                                  <p key={t.id} className="text-xs opacity-70 border-l-2 border-[#4ade80] pl-2">
                                    📖 <span className="font-semibold">{t.bookTitle}</span> 
                                    <span className="italic ml-1">(from {donor})</span>
                                  </p>
                                );
                              })}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.isAdmin ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}`}>
                            {user.isAdmin ? 'Admin' : 'Member'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap space-x-3">
                          <button onClick={() => handleResetPassword(user.email)} className="text-blue-500 hover:text-blue-400">Reset Pass</button>
                          {user.uid !== currentUser.uid && (
                            <>
                              <button onClick={() => handleToggleAdmin(user.uid, user.isAdmin)} className="text-indigo-400 hover:text-indigo-300">
                                {user.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                              </button>
                              <button onClick={() => handleDeleteMember(user.uid, user.email)} className="text-red-500 font-semibold">Remove</button>
                            </>
                          )}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={`p-6 border rounded-lg ${isDarkMode ? 'bg-[#252525] border-[#333]' : 'bg-white border-gray-200'}`}>
            <h2 className="mb-4 text-xl font-bold">Pre-Registered Members Setup</h2>
            <form onSubmit={handleAddInvite} className="flex flex-col md:flex-row gap-4 mb-4">
              <input type="text" placeholder="Full Name" value={newInviteName} onChange={(e) => setNewInviteName(e.target.value)} className="flex-1 px-3 py-2 border rounded-md text-gray-900" required />
              <input type="tel" placeholder="Phone Number" value={newInvitePhone} onChange={(e) => setNewInvitePhone(e.target.value)} className="flex-1 px-3 py-2 border rounded-md text-gray-900" required />
              <button type="submit" disabled={adminLoading} className="px-6 py-2 font-bold text-[#1e1e1e] bg-[#4ade80] rounded hover:bg-[#3bca6b] disabled:opacity-50">Add Invite</button>
            </form>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingInvites.map(invite => (
                <div key={invite.id} className="p-4 border rounded-lg shadow-sm relative group bg-indigo-50 border-indigo-200 text-gray-900">
                  <p className="font-bold">{invite.name}</p>
                  <p className="text-sm">{invite.phone}</p>
                  <button onClick={() => handleDeleteInvite(invite.id)} className="absolute right-3 top-4 text-red-500 font-bold opacity-0 group-hover:opacity-100">X</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB: GLOBAL CONFIGURATION --- */}
      {activeTab === 'config' && userProfile?.isAdmin && (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className={`p-6 border rounded-lg ${isDarkMode ? 'bg-[#252525] border-[#333]' : 'bg-white border-gray-200'}`}>
            <h2 className="mb-4 text-xl font-bold">Global Configuration</h2>
            <form onSubmit={handleUpdateGlobalSettings} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Library Name</label>
                <input type="text" value={globalSettings.libraryName} onChange={(e) => setGlobalSettings({...globalSettings, libraryName: e.target.value})} className="block w-full px-3 py-2 mt-1 border rounded-md text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium">Max Borrow Days</label>
                <input type="number" value={globalSettings.maxBorrowDays} onChange={(e) => setGlobalSettings({...globalSettings, maxBorrowDays: parseInt(e.target.value)})} className="block w-full px-3 py-2 mt-1 border rounded-md text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium">Admin WhatsApp</label>
                <input type="tel" value={globalSettings.contactNumber} onChange={(e) => setGlobalSettings({...globalSettings, contactNumber: e.target.value})} className="block w-full px-3 py-2 mt-1 border rounded-md text-gray-900" />
              </div>
              <button type="submit" className="w-full px-4 py-2 font-bold text-[#1e1e1e] bg-[#4ade80] rounded hover:bg-[#3bca6b]">Save Globally</button>
            </form>
          </div>

          <div className={`p-6 border rounded-lg flex flex-col justify-center items-center ${isDarkMode ? 'bg-[#252525] border-[#333]' : 'bg-white border-gray-200'}`}>
            <h3 className="text-sm font-bold uppercase opacity-70 mb-2">Data Export</h3>
            <button onClick={handleExportExcel} className="w-full px-4 py-3 font-semibold text-white bg-blue-600 rounded hover:bg-blue-700">Export Transactions (.xlsx)</button>
          </div>
        </div>
      )}
    </div>
  );
}
