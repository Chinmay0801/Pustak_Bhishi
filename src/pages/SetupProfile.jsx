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
  const [isNewUser, setIsNewUser] = useState(false);
  
  // Manual bootstrap state
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');

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
    setLoading(true);
    setError('');

    try {
      if (isNewUser) {
        if (!manualName.trim() || !manualPhone.trim()) {
           throw new Error("Name and phone are required.");
        }
        await updateUserProfile(currentUser.uid, {
          displayName: manualName.trim(),
          phoneNumber: manualPhone.trim(),
          language: 'english'
        });
      } else {
        if (!selectedInviteId) {
          throw new Error('Please select your name from the list.');
        }

        const invite = pendingInvites.find(inv => inv.id === selectedInviteId);
        if (!invite) throw new Error("Invalid selection");

        await updateUserProfile(currentUser.uid, {
          displayName: invite.name,
          phoneNumber: invite.phone,
          language: 'english'
        });
        await deletePendingInvite(invite.id);
      }
      
      await refreshProfile();
      navigate('/');
    } catch (err) {
      setError('Failed to claim profile: ' + err.message);
      setLoading(false);
    }
  }

  async function handleManualBootstrap(e) {
    e.preventDefault();
    if (!manualName.trim() || !manualPhone.trim()) {
      setError('Name and Phone are required.');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      // Force admin rights for the first user bootstrapping the system
      await updateUserProfile(currentUser.uid, {
        displayName: manualName.trim(),
        phoneNumber: manualPhone.trim(),
        language: 'english',
        isAdmin: true
      });
      await refreshProfile();
      navigate('/');
    } catch (err) {
      setError('Failed to bootstrap profile: ' + err.message);
      setLoading(false);
    }
  }

  // Prevent UI flashing if the redirect hooks are computing
  if (!currentUser || (userProfile?.displayName && userProfile?.phoneNumber)) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 text-gray-900">
      <div className="w-full max-w-md space-y-8 p-10 bg-white rounded-xl shadow-lg border border-gray-100 text-gray-900">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Welcome to Pustak Bhishi!</h2>
          <p className="mt-2 text-sm text-gray-600">
            Let's finish setting up your profile before we let you browse the library.
          </p>
        </div>

        {fetchingInvites ? (
          <div className="mt-8 text-center"><p className="text-gray-500">Loading your profile options...</p></div>
        ) : pendingInvites.length === 0 ? (
          <div className="mt-8 p-6 text-center bg-yellow-50 rounded-xl border border-yellow-200 shadow-sm">
            <h3 className="text-yellow-800 font-bold mb-2 text-lg">System Bootstrap (Admin Setup)</h3>
            <p className="text-sm text-yellow-700 mb-6">Since the database indicates no invitations have been created, you will be registered as the Administrator.</p>
            
            {error && (
              <div className="p-3 mb-4 text-sm text-red-600 bg-red-100 rounded border border-red-200 text-left">
                {error}
              </div>
            )}

            <form onSubmit={handleManualBootstrap} className="space-y-4 text-left">
              <div>
                <label className="block text-sm font-bold text-gray-900">Full Name</label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-yellow-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-gray-900 bg-white"
                  placeholder="Library Admin Name"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-yellow-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-gray-900 bg-white"
                  placeholder="Contact Number"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-yellow-600 border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
              >
                {loading ? 'Bootstrapping...' : 'Initialize System as Admin'}
              </button>
            </form>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleCompleteSetup}>
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-100 rounded border border-red-200 shadow-sm">
                {error}
              </div>
            )}
            
            {!isNewUser ? (
              <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                <p className="text-center font-semibold text-gray-700 pb-2">Select Your Pre-Registered Name:</p>
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

                <div className="pt-4 text-center">
                  <button type="button" onClick={() => setIsNewUser(true)} className="text-sm text-indigo-600 font-bold hover:underline">
                    My name is not on the list (Create New Profile)
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-left">
                <button type="button" onClick={() => setIsNewUser(false)} className="mb-4 text-sm text-indigo-600 font-bold hover:underline">
                    &larr; Back to Name List
                </button>
                <div>
                  <label className="block text-sm font-bold text-gray-900">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 bg-white"
                    placeholder="E.g. Sachin Tendulkar"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900">Your Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 bg-white"
                    placeholder="98XXXXXX"
                  />
                </div>
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || (!isNewUser && !selectedInviteId) || (isNewUser && (!manualName || !manualPhone))}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-extrabold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors shadow-md"
              >
                {loading ? 'Linking...' : (isNewUser ? 'Create Profile' : 'Link This Profile')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
