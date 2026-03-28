import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getActiveTransactions, getBooks, returnBook } from '../services/bookService';

function MemberDashboard() {
  const { currentUser, userProfile } = useAuth();
  const [activeBorrows, setActiveBorrows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMyBooks() {
      try {
        const data = await getActiveTransactions(currentUser.uid);
        setActiveBorrows(data);
      } catch (err) {
        console.error("Failed to load active borrows", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMyBooks();
  }, [currentUser.uid]);

  const totalFines = activeBorrows.reduce((sum, txn) => sum + (txn.fineDue || 0), 0);
  const overdueBookName = totalFines > 0 ? activeBorrows.find(b => b.isOverdue)?.bookTitle : null;
  const maxOverdueDays = totalFines > 0 ? Math.max(...activeBorrows.filter(b => b.isOverdue).map(b => b.daysBorrowed)) - 90 : 0;

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold text-white">नमस्ते, {userProfile?.displayName?.split(' ')[0] || 'Member'} 🙏</h1>
        <p className="text-sm text-gray-400">You have {activeBorrows.length} {activeBorrows.length === 1 ? 'book' : 'books'} borrowed</p>
      </div>

      {/* Fine Alert Banner */}
      {totalFines > 0 && (
        <div className="p-4 flex items-center mb-8 border border-red-900 bg-red-950 rounded-xl shadow-lg">
          <div className="bg-red-500 rounded-full p-2 mr-4 shadow-sm shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-red-100">Fine due: ₹{totalFines}</p>
            <p className="text-xs text-red-300 mt-1">{overdueBookName} is {maxOverdueDays} days overdue</p>
          </div>
        </div>
      )}

      {/* My Books Section */}
      <div className="mb-8">
        <h2 className="text-xs font-bold tracking-widest text-[#888] uppercase mb-4">My Books</h2>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : activeBorrows.length === 0 ? (
          <div className="p-8 text-center bg-[#1a1a1a] rounded-xl border border-[#333]">
            <p className="text-gray-400">You don't have any actively borrowed books right now.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeBorrows.map(book => {
              const daysLeft = 90 - book.daysBorrowed;
              
              let statusBg = 'bg-[#1a2f1c]';
              let statusText = 'text-[#4ade80]';
              let statusMessage = `${daysLeft} days left`;
              
              if (book.isOverdue) {
                statusBg = 'bg-[#3b1a1a]';
                statusText = 'text-[#f87171]';
                statusMessage = `${book.daysBorrowed - 90} days overdue`;
              } else if (daysLeft <= 10) {
                statusBg = 'bg-[#3a2d10]';
                statusText = 'text-[#eab308]';
                statusMessage = `${daysLeft} days left — return soon`;
              }

              return (
                <div key={book.id} className="p-4 bg-[#1a1a1a] border border-[#333] rounded-xl flex items-center">
                  <div className="w-12 h-16 bg-[#262626] rounded flex items-center justify-center shrink-0 mr-4 shadow-inner">
                    <span className="text-xl">📚</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">#{book.bookTitle}</p>
                    <p className="text-base font-semibold text-gray-100 truncate">{book.bookTitle}</p>
                    <div className={`mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBg} ${statusText}`}>
                      {statusMessage}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-bold tracking-widest text-[#888] uppercase mb-4">Quick Actions</h2>
        <Link 
          to="/books" 
          className="w-full flex justify-center py-4 bg-[#262626] hover:bg-[#333] transition-colors border border-[#444] rounded-xl text-white font-semibold text-lg"
        >
          Browse all books
        </Link>
        <p className="mt-4 text-center text-xs text-gray-500">Books are due in <strong className="text-gray-300">90 days</strong>. Fine after that: <strong className="text-red-400">₹20</strong></p>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState({ books: 0, borrowed: 0, overdue: 0, fines: 0 });
  const [attentionList, setAttentionList] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      const [allBooks, allTransactions] = await Promise.all([
        getBooks(),
        getActiveTransactions() // Admin query fetches everything
      ]);

      const overdueTxns = allTransactions.filter(t => t.isOverdue);
      const totalFines = overdueTxns.reduce((sum, t) => sum + t.fineDue, 0);

      setStats({
        books: allBooks.length,
        borrowed: allTransactions.length,
        overdue: overdueTxns.length,
        fines: totalFines
      });

      setAttentionList(overdueTxns);
    } catch (err) {
      console.error("Admin dashboard error", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function handleMarkPaid(transaction) {
    if (!window.confirm(`Mark fine paid and process physical return for ${transaction.userName}?`)) return;
    try {
      await returnBook(transaction.bookId, transaction.id);
      fetchDashboardData(); // Refetch perfectly
    } catch (err) {
      alert("Failed to process return: " + err.message);
    }
  }

  return (
    <div className="pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Admin panel</h1>
        <p className="text-sm text-gray-400">Pustak Bhishi</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-[#1a1a1a] rounded-xl border border-[#333] flex flex-col items-center justify-center h-24">
          <span className="text-3xl font-light text-white">{loading ? '-' : stats.books}</span>
          <span className="text-[11px] text-gray-500 uppercase tracking-wider mt-1">Total books</span>
        </div>
        <div className="p-4 bg-[#1a1a1a] rounded-xl border border-[#333] flex flex-col items-center justify-center h-24">
          <span className="text-3xl font-light text-white">{loading ? '-' : stats.borrowed}</span>
          <span className="text-[11px] text-gray-500 uppercase tracking-wider mt-1">Borrowed</span>
        </div>
        <div className="p-4 bg-[#211717] rounded-xl border border-[#4a2626] flex flex-col items-center justify-center h-24">
          <span className="text-3xl font-light text-[#f87171]">{loading ? '-' : stats.overdue}</span>
          <span className="text-[11px] text-red-500/70 uppercase tracking-wider mt-1">Overdue</span>
        </div>
        <div className="p-4 bg-[#231f13] rounded-xl border border-[#52441a] flex flex-col items-center justify-center h-24">
          <span className="text-3xl font-light text-[#fbbf24]">₹{loading ? '-' : stats.fines}</span>
          <span className="text-[11px] text-yellow-500/70 uppercase tracking-wider mt-1">Fines pending</span>
        </div>
      </div>

      {/* Needs Attention Feed */}
      <div className="mb-8">
        <h2 className="text-xs font-bold tracking-widest text-[#888] uppercase mb-4">Needs Attention</h2>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : attentionList.length === 0 ? (
          <div className="p-6 text-center bg-[#1a1a1a] rounded-xl border border-[#333]">
            <p className="text-gray-400">No overdue books or fines. Perfect!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attentionList.map(txn => (
              <div key={txn.id} className="p-4 bg-[#1a1a1a] border border-[#333] rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-100">{txn.userName || txn.userId}</p>
                  <p className="text-xs text-gray-500 mt-1">{txn.bookTitle}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="px-2 py-1 bg-[#231f13] border border-[#52441a] rounded text-xs text-[#fbbf24] font-medium">
                    ₹{txn.fineDue} fine
                  </div>
                  <button 
                    onClick={() => handleMarkPaid(txn)}
                    className="w-6 h-6 rounded border border-gray-500 flex items-center justify-center bg-transparent hover:bg-green-900 hover:border-green-500 transition-colors"
                    title="Mark fine paid and return book"
                  >
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-xs font-bold tracking-widest text-[#888] uppercase mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          <Link to="/books" className="flex flex-col items-center justify-center p-6 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded-xl transition-colors">
            <span className="text-2xl mb-2">📚</span>
            <span className="text-sm font-medium text-white">Catalog</span>
          </Link>
          <Link to="/admin" className="flex flex-col items-center justify-center p-6 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded-xl transition-colors">
            <span className="text-2xl mb-2">👥</span>
            <span className="text-sm font-medium text-white">All members</span>
          </Link>
          <Link to="/settings" className="flex flex-col items-center justify-center p-6 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded-xl transition-colors">
            <span className="text-2xl mb-2">⚙️</span>
            <span className="text-sm font-medium text-white">Settings</span>
          </Link>
          <button onClick={() => window.alert('Export logic moved to Admin Settings tab')} className="flex flex-col items-center justify-center p-6 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded-xl transition-colors">
            <span className="text-2xl mb-2">📊</span>
            <span className="text-sm font-medium text-white">Export</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { userProfile } = useAuth();
  
  return (
    <div className="max-w-md mx-auto min-h-screen p-4 pt-8">
      {userProfile?.isAdmin ? <AdminDashboard /> : <MemberDashboard />}
    </div>
  );
}
