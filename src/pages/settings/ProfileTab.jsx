import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updatePassword, EmailAuthProvider, linkWithCredential, deleteUser } from 'firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { updateUserProfile, deleteUserDoc } from '../../services/userService';
import { getPastTransactions, getActiveTransactions } from '../../services/bookService';
import { getGlobalSettings } from '../../services/settingsService';
import SectionTitle from './SectionTitle';
import { CARD, INPUT, LABEL, BTN_PRIMARY, BTN_DANGER, fmtDate } from './ui';

const APP_VERSION = '1.0.0';

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const options = [
    { id: 'light', label: '☀️ Light' },
    { id: 'dark', label: '🌙 Dark' },
  ];
  return (
    <div className="flex items-center gap-1 bg-[var(--bg-input)] border border-[var(--border-strong)] p-1 rounded-xl w-fit">
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => setTheme(opt.id)}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap
            ${theme === opt.id
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function ProfileTab({ isMarathi }) {
  const { currentUser, userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(userProfile?.phoneNumber || '');
  const [language, setLanguage] = useState(userProfile?.language || 'english');
  const [savingProfile, setSavingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [linkPassword, setLinkPassword] = useState('');
  const [linkingPassword, setLinkingPassword] = useState(false);
  const [pastTransactions, setPastTransactions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [libraryInfo, setLibraryInfo] = useState({ libraryName: '', contactNumber: '' });

  useEffect(() => {
    let cancelled = false;
    getPastTransactions(currentUser.uid)
      .then((data) => { if (!cancelled) setPastTransactions(data); })
      .catch((err) => console.error('Failed to load history', err))
      .finally(() => { if (!cancelled) setLoadingHistory(false); });
    return () => { cancelled = true; };
  }, [currentUser.uid]);

  // Library name / contact are shown to every user in the About card.
  useEffect(() => {
    getGlobalSettings()
      .then((settings) => { if (settings) setLibraryInfo((prev) => ({ ...prev, ...settings })); })
      .catch((err) => console.error('Failed to load library info', err));
  }, []);

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

  async function handleLinkPassword(e) {
    e.preventDefault();
    if (!linkPassword.trim() || linkPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    setLinkingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, linkPassword);
      await linkWithCredential(currentUser, credential);
      alert('Password added! You can now sign in with either Google or your email + password.');
      setLinkPassword('');
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        alert('For security, please sign out, sign back in with Google, then try again.');
      } else {
        alert('Failed to add password: ' + err.message);
      }
    }
    setLinkingPassword(false);
  }

  async function handleDeleteAccount() {
    if (!window.confirm('This will permanently delete your Pustak Bhishi account and profile. This cannot be undone. Continue?')) return;
    setDeletingAccount(true);
    try {
      const active = await getActiveTransactions(currentUser.uid);
      if (active.length > 0) {
        alert(`You still have ${active.length} book(s) borrowed. Please return them before deleting your account.`);
        setDeletingAccount(false);
        return;
      }
      await deleteUserDoc(currentUser.uid);
      await deleteUser(currentUser);
      navigate('/login');
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        alert('For security, please log out and log back in, then try deleting your account again.');
      } else {
        alert('Failed to delete account: ' + err.message);
      }
      setDeletingAccount(false);
    }
  }

  const isGoogleUser = currentUser?.providerData?.some(p => p.providerId === 'google.com');

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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="space-y-6">
        <div className={CARD}>
          <SectionTitle>{t.personalInfo}</SectionTitle>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className={LABEL}>{t.displayName}</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>{t.phone}</label>
              <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>{t.language}</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className={INPUT}>
                <option value="english">English</option>
                <option value="marathi">मराठी (Marathi)</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>{t.email}</label>
              <input type="email" disabled value={currentUser.email} className={`${INPUT} opacity-50 cursor-not-allowed`} />
            </div>
            <button type="submit" disabled={savingProfile} className={`w-full ${BTN_PRIMARY}`}>
              {savingProfile ? t.saving : t.save}
            </button>
          </form>
        </div>

        <div className={CARD}>
          <SectionTitle>Appearance</SectionTitle>
          <p className="text-sm text-[var(--text-secondary)] mb-3">Choose how Pustak Bhishi looks on this device.</p>
          <ThemeSwitcher />
        </div>

        <div className={CARD}>
          <SectionTitle>Security</SectionTitle>
          {isGoogleUser ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)] border border-[var(--border-strong)] p-3 rounded-xl bg-[var(--bg-surface-2)]">
                🟢 You're signed in via Google. Add a password below so you can also sign in with just your email — handy if Google sign-in isn't available.
              </p>
              <form onSubmit={handleLinkPassword} className="space-y-4">
                <div>
                  <label className={LABEL}>Add a Password</label>
                  <input type="password" value={linkPassword} onChange={(e) => setLinkPassword(e.target.value)} placeholder="Choose a password (min 6 characters)" minLength={6} className={INPUT} />
                </div>
                <button type="submit" disabled={linkingPassword || !linkPassword} className={BTN_PRIMARY}>
                  {linkingPassword ? 'Adding...' : 'Add Password'}
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className={LABEL}>Change Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" minLength={6} className={INPUT} />
              </div>
              <button type="submit" disabled={changingPass || !newPassword} className={BTN_DANGER}>
                {changingPass ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>

        <div className={CARD}>
          <SectionTitle>About</SectionTitle>
          <div className="space-y-2 text-sm text-[var(--text-secondary)]">
            <p><span className="font-semibold text-[var(--text-primary)]">Pustak Bhishi</span> · v{APP_VERSION}</p>
            {libraryInfo.libraryName && <p>{libraryInfo.libraryName}</p>}
            {libraryInfo.contactNumber && (
              <a
                href={`https://wa.me/${libraryInfo.contactNumber.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                💬 Contact library admin
              </a>
            )}
          </div>
        </div>

        <div className={`${CARD} border-red-200 dark:border-red-900/50`}>
          <h2 className="text-lg font-bold text-red-600 dark:text-red-500 mb-2">Danger Zone</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Permanently delete your account and profile. Your borrow history stays on the library's record, but you'll lose access immediately. Return any borrowed books first.
          </p>
          <button onClick={handleDeleteAccount} disabled={deletingAccount} className={BTN_DANGER}>
            {deletingAccount ? 'Deleting...' : 'Delete My Account'}
          </button>
        </div>
      </div>

      <div className={`${CARD} h-fit`}>
        <SectionTitle>My Borrow History</SectionTitle>
        {loadingHistory ? (
          <p className="text-sm text-[var(--text-muted)]">Loading history...</p>
        ) : pastTransactions.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No past transactions found.</p>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {pastTransactions.map(txn => (
              <div key={txn.id} className="p-3 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-xl">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{txn.bookTitle}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Borrowed: {fmtDate(txn.borrowedAt)} · Returned: {fmtDate(txn.returnedAt)}
                </p>
                {txn.fineDue > 0 && <p className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1">Fine ₹{txn.fineDue} unpaid</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
