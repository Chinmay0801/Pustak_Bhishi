import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { fetchSignInMethodsForEmail } from 'firebase/auth';
import { auth } from '../firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

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
      // If credentials fail on login, check whether this email is actually a
      // Google-only account (no password ever set) so we can point them
      // straight at the fix instead of a generic "wrong password" message.
      if (isLogin && ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(err.code)) {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          if (methods.includes('google.com') && !methods.includes('password')) {
            setError('This email is registered via Google Sign-In and has no password yet. Click "Continue with Google" above — you can add a password afterwards from Settings.');
            setLoading(false);
            return;
          }
        } catch {
          // Lookup failed (e.g. enumeration protection) — fall through to the generic message below.
        }
      }
      switch (err.code) {
        case 'auth/invalid-credential':
          setError('Invalid email or password. (If you registered via Google, please click "Continue with Google").');
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
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-10">
      <div className="w-full max-w-md lg:max-w-4xl lg:grid lg:grid-cols-2 lg:overflow-hidden lg:rounded-3xl lg:border lg:border-[var(--border)] lg:shadow-2xl">

        {/* Branding panel — desktop only */}
        <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-indigo-700 via-indigo-800 to-[var(--bg-surface-2)] relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute -left-10 bottom-0 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <span className="text-3xl">📚</span>
              <span className="text-xl font-bold text-white">Pustak Bhishi</span>
            </div>
            <p className="mt-6 text-2xl font-semibold text-white leading-snug">
              Track, borrow &amp; share our Marathi library — together.
            </p>
          </div>
          <p className="relative text-sm text-indigo-200/80">
            800+ books · Borrow &amp; return tracking · Member contributions
          </p>
        </div>

        {/* Form panel */}
        <div className="w-full p-6 sm:p-8 lg:p-10 space-y-6 bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl lg:border-0 lg:rounded-none">
          {/* Mobile-only brand header */}
          <div className="lg:hidden flex flex-col items-center text-center gap-1 mb-2">
            <span className="text-4xl">📚</span>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Pustak Bhishi</h1>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center lg:text-left">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)] text-center lg:text-left">
              {isLogin ? 'Sign in to continue to your library.' : 'Register to start borrowing books.'}
            </p>
          </div>

          {error && (
            <div className="p-3 text-sm text-center text-red-700 bg-red-50 border border-red-200 dark:text-red-300 dark:bg-red-950/60 dark:border-red-900 rounded-xl">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-surface-2)] border border-[var(--border-strong)] rounded-xl hover:bg-[var(--bg-hover)] disabled:opacity-50 transition-all"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
              className="w-5 h-5"
            />
            Continue with Google
          </button>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-[var(--border)]" />
            <span className="px-3 text-xs text-[var(--text-muted)] uppercase tracking-wider">or use email</span>
            <div className="flex-grow border-t border-[var(--border)]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all active:scale-[0.99]"
            >
              {loading
                ? 'Please wait…'
                : isLogin
                  ? 'Sign In'
                  : 'Sign Up'}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {isLogin
                ? "Need an account? Register"
                : 'Already have an account? Login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
