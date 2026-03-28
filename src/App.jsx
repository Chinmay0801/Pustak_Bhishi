import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Admin from './pages/Admin';
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
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/" 
            element={
              <PrivateRoute>
                <Home />
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
            path="/admin" 
            element={
              <PrivateRoute requireAdmin={true}>
                <Admin />
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
