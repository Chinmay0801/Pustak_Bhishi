import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { currentUser, userProfile } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return null; // hide entirely on login screens
  }

  // Active state styling helper
  const isActive = (path) => location.pathname === path;
  const activeClass = "text-[#4ade80]"; // Green active
  const inactiveClass = "text-gray-500 hover:text-gray-300";

  return (
    <nav className="fixed bottom-0 w-full bg-[#1e1e1e] border-t border-[#333] z-50 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        <Link to="/" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/') ? activeClass : inactiveClass}`}>
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        
        <Link to="/books" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/books') ? activeClass : inactiveClass}`}>
          <span className="text-xl">📚</span>
          <span className="text-[10px] font-medium">Books</span>
        </Link>

        {userProfile?.isAdmin && (
          <Link to="/admin" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/admin') ? activeClass : inactiveClass}`}>
            <span className="text-xl">👥</span>
            <span className="text-[10px] font-medium">Members</span>
          </Link>
        )}

        <Link to="/settings" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/settings') ? activeClass : inactiveClass}`}>
          <span className="text-xl">{userProfile?.isAdmin ? '⚙️' : '👤'}</span>
          <span className="text-[10px] font-medium">{userProfile?.isAdmin ? 'Settings' : 'Profile'}</span>
        </Link>
      </div>
    </nav>
  );
}
