import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllUsers, getPendingInvites } from '../services/userService';
import { getAllTransactions, getBooks, linkContributors } from '../services/bookService';
import { initializeGlobalSettings } from '../services/settingsService';
import ProfileTab from './settings/ProfileTab';
import BooksTab from './settings/BooksTab';
import MembersTab from './settings/MembersTab';
import ConfigTab from './settings/ConfigTab';

const ADMIN_TABS = ['books', 'members', 'config'];

// Users, books, transactions and invites shared by the admin tabs.
async function fetchAdminData() {
  await initializeGlobalSettings();
  const [users, books, txns, invites] = await Promise.all([
    getAllUsers(),
    getBooks(),
    getAllTransactions(),
    getPendingInvites(),
  ]);
  // Backfill contributorUid for books whose owner has since joined.
  const linked = await linkContributors(books, users).catch((err) => {
    console.error('Failed to link contributors', err);
    return 0;
  });
  return { users, books: linked > 0 ? await getBooks() : books, txns, invites };
}

function useAdminData(enabled) {
  const [data, setData] = useState({ users: [], books: [], txns: [], invites: [] });
  const [loaded, setLoaded] = useState(false);
  const [reloading, setReloading] = useState(false);

  const apply = useCallback((promise) => promise
    .then(setData)
    .catch((err) => console.error("Failed to load admin data", err))
    .finally(() => { setLoaded(true); setReloading(false); }), []);

  useEffect(() => {
    if (enabled && !loaded) apply(fetchAdminData());
  }, [enabled, loaded, apply]);

  const reload = useCallback(() => {
    setReloading(true);
    return apply(fetchAdminData());
  }, [apply]);

  return { ...data, loading: !loaded || reloading, reload };
}

export default function Settings() {
  const { currentUser, userProfile } = useAuth();
  const location = useLocation();

  const defaultTab = new URLSearchParams(location.search).get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(defaultTab);
  useEffect(() => { setActiveTab(defaultTab); }, [defaultTab]);

  const isAdmin = !!userProfile?.isAdmin;
  const admin = useAdminData(isAdmin && ADMIN_TABS.includes(activeTab));

  const isMarathi = userProfile?.language === 'marathi';
  const TABS = [
    { id: 'profile', icon: '👤', label: isMarathi ? 'प्रोफाइल' : 'Profile', adminOnly: false },
    { id: 'books', icon: '📚', label: isMarathi ? 'पुस्तके' : 'Manage Books', adminOnly: true },
    { id: 'members', icon: '👥', label: isMarathi ? 'सभासद' : 'Members', adminOnly: true },
    { id: 'config', icon: '⚙️', label: isMarathi ? 'सेटिंग्ज' : 'Global Config', adminOnly: true },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-28">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{isMarathi ? 'सेटिंग्ज हब' : 'Settings Hub'}</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">{userProfile?.displayName || currentUser.email}</p>
      </div>

      <div className="flex items-center gap-1 mb-6 bg-[var(--bg-surface)] border border-[var(--border)] p-1 rounded-xl overflow-x-auto">
        {TABS.filter(t => !t.adminOnly || isAdmin).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5
              ${activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && <ProfileTab isMarathi={isMarathi} />}
      {activeTab === 'books' && isAdmin && <BooksTab admin={admin} />}
      {activeTab === 'members' && isAdmin && <MembersTab admin={admin} />}
      {activeTab === 'config' && isAdmin && <ConfigTab admin={admin} />}
    </div>
  );
}
