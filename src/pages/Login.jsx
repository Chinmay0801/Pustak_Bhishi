import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // ✅ GOOGLE LOGIN
  async function handleGoogleLogin() {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      setError('Google login failed. Please try again.');
    }
    setLoading(false);
  }

  // ✅ EMAIL/PASSWORD LOGIN
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      navigate('/');
    } catch (err) {
      // 🔥 SMART ERROR HANDLING
      switch (err.code) {
        case 'auth/invalid-credential':
          setError('This account uses Google Sign-In. Please click "Continue with Google".');
          break;
        case 'auth/user-not-found':
          setError('No account found. Please register first.');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password. Try again.');
          break;
        case 'auth/email-already-in-use':
          setError('Email already registered. Please login instead.');
          break;
        case 'auth/weak-password':
          setError('Password should be at least 6 characters.');
          break;
        default:
          setError('Something went wrong. Please try again.');
      }
    }

    setLoading(false);
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-gray-100 text-gray-900 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">

        {/* 🔥 TITLE */}
        <h2 className="text-3xl font-bold text-center">
          {isLogin ? 'Sign In' : 'Register'}
        </h2>

        {/* ❌ ERROR MESSAGE */}
        {error && (
          <div className="p-3 text-red-700 bg-red-100 rounded text-sm text-center">
            {error}
          </div>
        )}

        {/* 🟢 GOOGLE LOGIN */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center px-4 py-3 border rounded-md hover:bg-gray-50 disabled:opacity-50 transition font-semibold shadow-sm"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-5 h-5 mr-3"
          />
          Continue with Google
        </button>

        {/* DIVIDER */}
        <div className="relative flex items-center py-3">
          <div className="flex-grow border-t"></div>
          <span className="px-3 text-sm text-gray-500">or use email</span>
          <div className="flex-grow border-t"></div>
        </div>

        {/* 📧 EMAIL FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 mt-1 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading
              ? 'Please wait...'
              : isLogin
                ? 'Login'
                : 'Sign Up'}
          </button>
        </form>

        {/* 🔁 TOGGLE */}
        <div className="text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            {isLogin
              ? 'Need an account? Register'
              : 'Already have an account? Login'}
          </button>
        </div>

      </div>
    </div>
  );
}