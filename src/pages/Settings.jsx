import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile, getAllUsers, updateUserRole, deleteUserDoc } from '../services/userService';
import { getPastTransactions, getAllTransactions, getBooks } from '../services/bookService';
import { getGlobalSettings, updateGlobalSettings, initializeGlobalSettings } from '../services/settingsService';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import * as xlsx from 'xlsx';

export default function Settings() {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  // --- Member State ---
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [language, setLanguage] = useState('english');
  const [savingProfile, setSavingProfile] = useState(false);
  const [pastTransactions, setPastTransactions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // --- Admin State ---
  const [allUsers, setAllUsers] = useState([]);
  const [globalSettings, setGlobalSettings] = useState({ libraryName: '', maxBorrowDays: 30, contactNumber: '' });
  const [stats, setStats] = useState({ totalBooks: 0, totalBorrows: 0 });
  const [adminLoading, setAdminLoading] = useState(false);

  // Initialize Member data
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setPhoneNumber(userProfile.phoneNumber || '');
      setLanguage(userProfile.language || 'english');
    }
  }, [userProfile]);

  // Load Member History
  useEffect(() => {
    if (activeTab === 'profile' && currentUser) {
      loadHistory();
    }
  }, [activeTab, currentUser]);

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
      alert("Profile updated successfully!");
    } catch (err) {
      alert("Failed to update profile: " + err.message);
    }
    setSavingProfile(false);
  }

  // --- Admin Functions ---
  useEffect(() => {
    if (activeTab === 'admin' && userProfile?.isAdmin) {
      loadAdminData();
    }
  }, [activeTab, userProfile]);

  async function loadAdminData() {
    setAdminLoading(true);
    try {
      await initializeGlobalSettings();
      
      const [users, settings, books, allTxns] = await Promise.all([
        getAllUsers(),
        getGlobalSettings(),
        getBooks(),
        getAllTransactions()
      ]);
      
      setAllUsers(users);
      if (settings) setGlobalSettings(settings);
      setStats({
        totalBooks: books.length,
        totalBorrows: allTxns.length
      });
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
      const txns = await getAllTransactions();
      const exportData = txns.map(t => ({
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

  return (
    <div className="max-w-6xl p-6 mx-auto mt-8">
      <h1 className="mb-6 text-3xl font-bold text-gray-800">Settings</h1>

      {/* Tabs */}
      <div className="flex px-2 mb-6 space-x-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('profile')}
          className={`py-2 px-4 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'profile' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          My Profile
        </button>
        {userProfile?.isAdmin && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`py-2 px-4 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'admin' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Admin Console
          </button>
        )}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Profile Form */}
          <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-gray-800">Personal Information</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="+91..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Display Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="english">English</option>
                  <option value="marathi">मराठी (Marathi)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address (Read-only)</label>
                <input
                  type="email"
                  disabled
                  value={currentUser.email}
                  className="block w-full px-3 py-2 mt-1 bg-gray-100 border border-gray-300 rounded-md text-gray-500"
                />
              </div>
              <button
                type="submit"
                disabled={savingProfile}
                className="w-full px-4 py-2 font-bold text-white transition-colors bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </div>

          {/* Borrow History */}
          <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-gray-800">My Borrow History</h2>
            {loadingHistory ? (
              <p className="text-gray-500">Loading history...</p>
            ) : pastTransactions.length === 0 ? (
              <p className="text-gray-500">No past transactions found.</p>
            ) : (
              <div className="overflow-y-auto max-h-[400px] border border-gray-100 rounded">
                <ul className="divide-y divide-gray-200">
                  {pastTransactions.map(txn => (
                    <li key={txn.id} className="p-3 hover:bg-gray-50">
                      <p className="font-semibold text-gray-800">{txn.bookTitle}</p>
                      <p className="text-xs text-gray-500">
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

      {/* Admin Tab */}
      {activeTab === 'admin' && userProfile?.isAdmin && (
        <div className="space-y-8">
          
          {/* Dashboard Stats & Actions */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col items-center justify-center">
              <h3 className="text-sm font-bold text-gray-500 uppercase">Total Books</h3>
              <p className="mt-2 text-4xl font-extrabold text-indigo-600">{adminLoading ? '-' : stats.totalBooks}</p>
            </div>
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col items-center justify-center">
              <h3 className="text-sm font-bold text-gray-500 uppercase">Total Transactions</h3>
              <p className="mt-2 text-4xl font-extrabold text-indigo-600">{adminLoading ? '-' : stats.totalBorrows}</p>
            </div>
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col items-center justify-center space-y-3">
              <h3 className="text-sm font-bold text-gray-500 uppercase text-center">Data Management</h3>
              <button 
                onClick={handleExportExcel}
                className="w-full px-4 py-2 font-semibold text-white bg-green-600 rounded hover:bg-green-700"
              >
                Export All Data (.xlsx)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Global Settings */}
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm lg:col-span-1 h-fit">
              <h2 className="mb-4 text-xl font-bold text-gray-800">Global Configuration</h2>
              <form onSubmit={handleUpdateGlobalSettings} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Library Name</label>
                  <input
                    type="text"
                    value={globalSettings.libraryName}
                    onChange={(e) => setGlobalSettings({...globalSettings, libraryName: e.target.value})}
                    className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Borrow Days</label>
                  <input
                    type="number"
                    value={globalSettings.maxBorrowDays}
                    onChange={(e) => setGlobalSettings({...globalSettings, maxBorrowDays: parseInt(e.target.value)})}
                    className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Admin Contact WhatsApp</label>
                  <input
                    type="tel"
                    value={globalSettings.contactNumber}
                    onChange={(e) => setGlobalSettings({...globalSettings, contactNumber: e.target.value})}
                    className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
                  />
                </div>
                <button type="submit" className="w-full px-4 py-2 font-bold text-white bg-gray-800 rounded hover:bg-gray-900">
                  Save Globally
                </button>
              </form>
            </div>

            {/* Member Management */}
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm lg:col-span-2">
              <h2 className="mb-4 text-xl font-bold text-gray-800">Member Management</h2>
              {adminLoading ? (
                <p className="text-gray-500">Loading members...</p>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Role</th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allUsers.map(user => (
                        <tr key={user.uid} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{user.displayName || 'No Name'}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.isAdmin ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}`}>
                              {user.isAdmin ? 'Admin' : 'Member'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap space-x-3">
                            <button 
                              onClick={() => handleResetPassword(user.email)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Reset Pass
                            </button>
                            {user.uid !== currentUser.uid && (
                              <button 
                                onClick={() => handleToggleAdmin(user.uid, user.isAdmin)}
                                className={`${user.isAdmin ? 'text-orange-600 hover:text-orange-900' : 'text-indigo-600 hover:text-indigo-900'}`}
                              >
                                {user.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
