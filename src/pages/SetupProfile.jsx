import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile, getPendingInvites, deletePendingInvite } from '../services/userService';

export default function SetupProfile() {
  const { currentUser, userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [pendingInvites, setPendingInvites] = useState([]);
  const [selectedInviteId, setSelectedInviteId] = useState('');
  const [fetchingInvites, setFetchingInvites] = useState(true);
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

  useEffect(() => {
    async function load() {
      try {
        const invites = await getPendingInvites();
        setPendingInvites(invites);
      } catch (err) {
        setError('Could not load member list: ' + err.message);
      }
      setFetchingInvites(false);
    }
    load();
  }, []);

  async function handleCompleteSetup(e) {
    if (e) e.preventDefault();
    if (!selectedInviteId) {
      setError('Please select your name from the list.');
      return;
    }

    const invite = pendingInvites.find(inv => inv.id === selectedInviteId);
    if (!invite) return;

    setLoading(true);
    setError('');

    try {
      await updateUserProfile(currentUser.uid, {
        displayName: invite.name,
        phoneNumber: invite.phone,
        language: 'english'
      });
      await deletePendingInvite(invite.id);
      await refreshProfile();
      navigate('/');
    } catch (err) {
      setError('Failed to claim profile: ' + err.message);
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

        {fetchingInvites ? (
          <div className="mt-8 text-center"><p className="text-gray-500">Loading your profile options...</p></div>
        ) : pendingInvites.length === 0 ? (
          <div className="mt-8 p-4 text-center bg-yellow-50 rounded-lg border border-yellow-200 shadow-sm">
            <p className="text-yellow-800 font-semibold mb-2">No Profiles Available</p>
            <p className="text-sm text-yellow-700">The Administrator has not created any member invites yet. Please ask them to add your name inside their Admin Console.</p>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleCompleteSetup}>
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-100 rounded border border-red-200 shadow-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              <p className="text-center font-semibold text-gray-700 pb-2">Select Your Name:</p>
              {pendingInvites.map(invite => (
                <label 
                  key={invite.id} 
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors shadow-sm ${selectedInviteId === invite.id ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                >
                  <input 
                    type="radio" 
                    name="profileSelection" 
                    value={invite.id} 
                    checked={selectedInviteId === invite.id}
                    onChange={(e) => setSelectedInviteId(e.target.value)}
                    className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <div className="ml-4 flex flex-col">
                    <span className="block text-md font-bold text-gray-900">{invite.name}</span>
                    <span className="block text-xs text-gray-500">{invite.phone}</span>
                  </div>
                </label>
              ))}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || !selectedInviteId}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-extrabold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors shadow-md"
              >
                {loading ? 'Linking...' : 'Link This Profile'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
