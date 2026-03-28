import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  }

  return (
    <nav className="bg-indigo-600 shadow-md">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-white shrink-0">
              Pustak Bhishi
            </Link>
            <div className="block ml-10">
              <div className="flex items-baseline space-x-4">
                <Link to="/" className="px-3 py-2 text-sm font-medium text-white rounded-md hover:bg-indigo-500">
                  Home
                </Link>
                {currentUser && (
                  <Link to="/my-books" className="px-3 py-2 text-sm font-medium text-white rounded-md hover:bg-indigo-500">
                    My Books
                  </Link>
                )}
                {userProfile?.isAdmin && (
                  <Link to="/admin" className="px-3 py-2 text-sm font-medium text-white rounded-md hover:bg-indigo-500">
                    Admin
                  </Link>
                )}
                {currentUser && (
                  <Link to="/settings" className="px-3 py-2 text-sm font-medium text-white rounded-md hover:bg-indigo-500">
                    ⚙️ Settings
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="block">
            <div className="flex items-center ml-4 md:ml-6">
              {currentUser ? (
                <div className="flex items-center space-x-4 text-white">
                  <span className="text-sm">{currentUser.email}</span>
                  {userProfile?.isAdmin && (
                    <span className="px-2 py-1 text-xs font-bold text-indigo-800 bg-yellow-400 rounded-full">
                      Admin
                    </span>
                  )}
                  <button
                    onClick={handleLogout}
                    className="px-3 py-2 text-sm font-medium text-white bg-indigo-700 rounded-md hover:bg-indigo-800"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-3 py-2 text-sm font-medium text-indigo-600 bg-white rounded-md hover:bg-gray-100"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
