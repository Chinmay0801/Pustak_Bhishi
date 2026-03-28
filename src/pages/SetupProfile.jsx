import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../services/userService';

export default function SetupProfile() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Protect the route - only for authenticated users who actually need to finish setup
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    } else if (userProfile?.displayName && userProfile?.phoneNumber) {
      // Profile is already complete, send them to the catalog
      navigate('/');
    }
  }, [currentUser, userProfile, navigate]);

  async function handleCompleteSetup(e) {
    e.preventDefault();
    if (!displayName.trim() || !phoneNumber.trim()) {
      setError('Both Name and Phone Number are strictly required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await updateUserProfile(currentUser.uid, {
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim(),
        language: 'english' // default language for new signups
      });
      // Context will auto-update userProfile, which will trigger the useEffect redirect above
    } catch (err) {
      setError('Failed to save profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Prevent UI flashing if the redirect hooks are computing
  if (!currentUser || (userProfile?.displayName && userProfile?.phoneNumber)) {
    return null; 
  }

  return (
    <div className="flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="w-full max-w-md space-y-8 p-10 bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Welcome to Pustak Bhishi!</h2>
          <p className="mt-2 text-sm text-gray-600">
            Let's finish setting up your profile before we let you browse the library.
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleCompleteSetup}>
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-100 rounded border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name (Required)
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none relative block w-full px-3 py-3 mt-1 border border-gray-300 placeholder-gray-500 text-gray-900 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm shadow-sm"
                placeholder="First Last"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                WhatsApp / Phone Number (Required)
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                className="appearance-none relative block w-full px-3 py-3 mt-1 border border-gray-300 placeholder-gray-500 text-gray-900 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm shadow-sm"
                placeholder="+91..."
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-extrabold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving Profile...' : 'Complete Profile & Enter Library'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
