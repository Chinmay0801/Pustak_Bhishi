import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';
import Login from './pages/Login';
import MyBooks from './pages/MyBooks';
import Settings from './pages/Settings';
import SetupProfile from './pages/SetupProfile';

// Protected Route Component
function PrivateRoute({ children, requireAdmin }) {
  const { currentUser, userProfile } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  const isProfileComplete = userProfile?.displayName && userProfile?.phoneNumber;
  if (!isProfileComplete && location.pathname !== '/setup-profile') {
    return <Navigate to="/setup-profile" />;
  }

  if (requireAdmin && !userProfile?.isAdmin) {
    return <Navigate to="/" />;
  }

  return children;
}

function App() {
  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center">
      <Navbar />
      <main className="w-full md:max-w-none max-w-md pb-20 md:pb-6">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/books" 
            element={
              <PrivateRoute>
                <Catalog />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/my-books" 
            element={
              <PrivateRoute>
                <MyBooks />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/setup-profile" 
            element={
              <PrivateRoute>
                <SetupProfile />
              </PrivateRoute>
            } 
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
