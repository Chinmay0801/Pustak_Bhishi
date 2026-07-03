import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`w-9 h-9 flex items-center justify-center rounded-full border border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors ${className}`}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!currentUser) return null;

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  }

  const isActive = (path) => location.pathname === path;
  const activeClass = 'text-[#4ade80]';
  const inactiveClass = 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]';

  const isMarathi = userProfile?.language === 'marathi';
  const t = {
    home:         isMarathi ? 'मुख्य पृष्ठ' : 'Home',
    dashboard:    isMarathi ? 'डॅशबोर्ड' : 'Dashboard',
    books:        isMarathi ? 'पुस्तके' : 'Catalog',
    mobileBooks:  isMarathi ? 'पुस्तके' : 'Books',
    myBooks:      isMarathi ? 'माझी पुस्तके' : 'My Books',
    transactions: isMarathi ? 'व्यवहार' : 'Transactions',
    settings:     isMarathi ? 'सेटिंग्ज' : 'Settings',
    profile:      isMarathi ? 'माझे खाते' : 'Profile',
    myProfile:    isMarathi ? 'माझे खाते' : 'My Profile',
    logout:       isMarathi ? 'बाहेर पडा' : 'Logout',
  };

  const isAdmin = userProfile?.isAdmin;

  return (
    <>
      {/* ─── MOBILE BOTTOM NAV ─── */}
      <nav className="md:hidden fixed bottom-0 w-full bg-[var(--bg-surface)] border-t border-[var(--border)] z-50 pb-safe">
        <div className={`flex justify-around items-center h-16 max-w-md mx-auto`}>

          {/* Home */}
          <Link to="/" className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 ${isActive('/') ? activeClass : inactiveClass}`}>
            <span className="text-xl">🏠</span>
            <span className="text-[10px] font-medium">{t.home}</span>
          </Link>

          {/* Catalog */}
          <Link to="/books" className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 ${isActive('/books') ? activeClass : inactiveClass}`}>
            <span className="text-xl">📚</span>
            <span className="text-[10px] font-medium">{t.mobileBooks}</span>
          </Link>

          {/* My Books (members) OR Transactions (admin) */}
          {isAdmin ? (
            <Link to="/transactions" className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 ${isActive('/transactions') ? activeClass : inactiveClass}`}>
              <span className="text-xl">📋</span>
              <span className="text-[10px] font-medium">{t.transactions}</span>
            </Link>
          ) : (
            <Link to="/my-books" className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 ${isActive('/my-books') ? activeClass : inactiveClass}`}>
              <span className="text-xl">📖</span>
              <span className="text-[10px] font-medium">{t.myBooks}</span>
            </Link>
          )}

          {/* Settings / Profile */}
          <Link to="/settings" className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 ${isActive('/settings') ? activeClass : inactiveClass}`}>
            <span className="text-xl">{isAdmin ? '⚙️' : '👤'}</span>
            <span className="text-[10px] font-medium">{isAdmin ? t.settings : t.profile}</span>
          </Link>
        </div>
      </nav>

      {/* ─── DESKTOP TOP NAV ─── */}
      <nav className="hidden md:block w-full bg-[var(--bg-surface)] border-b border-[var(--border)] shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand + links */}
            <div className="flex items-center gap-8">
              <Link to="/" className="text-xl font-bold text-[var(--text-primary)] shrink-0">
                Pustak Bhishi
              </Link>
              <div className="flex items-center gap-1">
                <Link to="/" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/') ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}>
                  {t.dashboard}
                </Link>
                <Link to="/books" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/books') ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}>
                  {t.books}
                </Link>
                {!isAdmin && (
                  <Link to="/my-books" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/my-books') ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}>
                    {t.myBooks}
                  </Link>
                )}
                {isAdmin && (
                  <Link to="/transactions" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/transactions') ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}>
                    {t.transactions}
                  </Link>
                )}
                <Link to="/settings" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/settings') ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}>
                  {isAdmin ? t.settings : t.myProfile}
                </Link>
              </div>
            </div>

            {/* Right: theme toggle + user info + logout */}
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <span className="text-sm text-[var(--text-secondary)]">{userProfile?.displayName || currentUser.email}</span>
              {isAdmin && (
                <span className="px-2 py-1 text-xs font-bold text-[#1e1e1e] bg-[#4ade80] rounded-full">Admin</span>
              )}
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm font-medium text-white transition-colors bg-red-600 rounded-md hover:bg-red-700"
              >
                {t.logout}
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

export { ThemeToggle };
