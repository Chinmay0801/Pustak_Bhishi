import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

// Route-level code splitting: each page (and heavy deps like xlsx) loads on demand.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Catalog = lazy(() => import('./pages/Catalog'));
const Login = lazy(() => import('./pages/Login'));
const MyBooks = lazy(() => import('./pages/MyBooks'));
const Settings = lazy(() => import('./pages/Settings'));
const SetupProfile = lazy(() => import('./pages/SetupProfile'));
const Transactions = lazy(() => import('./pages/Transactions'));

function PageLoader() {
  return (
    <div className="flex justify-center py-24">
      <div className="w-8 h-8 rounded-full animate-spin border-2 border-[var(--border-strong)] border-t-indigo-500" />
    </div>
  );
}

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
    <div className="min-h-screen bg-[var(--bg-app)] flex flex-col items-center">
      <Navbar />
      <main className="w-full md:max-w-none max-w-md pb-20 md:pb-6">
        <Suspense fallback={<PageLoader />}>
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
          <Route 
            path="/transactions" 
            element={
              <PrivateRoute requireAdmin={true}>
                <Transactions />
              </PrivateRoute>
            } 
          />
        </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default App;
