import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getActiveTransactions, getBooks, returnBook } from '../services/bookService';

function SectionLabel({ children }) {
  return <h2 className="text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase mb-4">{children}</h2>;
}

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
        <h1 className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)]">नमस्ते, {userProfile?.displayName?.split(' ')[0] || 'Member'} 🙏</h1>
        <p className="text-sm text-[var(--text-secondary)]">You have {activeBorrows.length} {activeBorrows.length === 1 ? 'book' : 'books'} borrowed</p>
      </div>

      {/* Fine Alert Banner */}
      {totalFines > 0 && (
        <div className="p-4 flex items-center mb-8 border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 rounded-xl shadow-lg">
          <div className="bg-red-500 rounded-full p-2 mr-4 shadow-sm shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-red-700 dark:text-red-100">Fine due: ₹{totalFines}</p>
            <p className="text-xs text-red-600/80 dark:text-red-300 mt-1">{overdueBookName} is {maxOverdueDays} days overdue</p>
          </div>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-3 lg:gap-8 lg:items-start">
        {/* My Books Section */}
        <div className="mb-8 lg:mb-0 lg:col-span-2">
          <SectionLabel>My Books</SectionLabel>
          {loading ? (
            <p className="text-[var(--text-muted)]">Loading...</p>
          ) : activeBorrows.length === 0 ? (
            <div className="p-8 text-center bg-[var(--bg-surface)] rounded-xl border border-[var(--border-strong)]">
              <p className="text-[var(--text-secondary)]">You don't have any actively borrowed books right now.</p>
            </div>
          ) : (
            <div className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 xl:grid-cols-3">
              {activeBorrows.map(book => {
                const daysLeft = 90 - book.daysBorrowed;

                let statusCls = 'bg-emerald-50 text-emerald-700 dark:bg-[#1a2f1c] dark:text-[#4ade80]';
                let statusMessage = `${daysLeft} days left`;

                if (book.isOverdue) {
                  statusCls = 'bg-red-50 text-red-700 dark:bg-[#3b1a1a] dark:text-[#f87171]';
                  statusMessage = `${book.daysBorrowed - 90} days overdue`;
                } else if (daysLeft <= 10) {
                  statusCls = 'bg-amber-50 text-amber-700 dark:bg-[#3a2d10] dark:text-[#eab308]';
                  statusMessage = `${daysLeft} days left — return soon`;
                }

                return (
                  <div key={book.id} className="p-4 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl flex items-center h-full">
                    <div className="w-12 h-16 bg-[var(--bg-hover)] rounded flex items-center justify-center shrink-0 mr-4 shadow-inner">
                      <span className="text-xl">📚</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-[var(--text-primary)] truncate">{book.bookTitle}</p>
                      <div className={`mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusCls}`}>
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
        <div className="lg:col-span-1">
          <SectionLabel>Quick Actions</SectionLabel>
          <Link
            to="/books"
            className="w-full flex justify-center py-4 bg-[var(--bg-hover)] hover:opacity-80 transition-opacity border border-[var(--border-strong)] rounded-xl text-[var(--text-primary)] font-semibold text-lg"
          >
            Browse all books
          </Link>
          <p className="mt-4 text-center lg:text-left text-xs text-[var(--text-muted)]">Books are due in <strong className="text-[var(--text-secondary)]">90 days</strong>. Fine after that: <strong className="text-red-500">₹20</strong></p>
        </div>
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
        <h1 className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)]">Admin panel</h1>
        <p className="text-sm text-[var(--text-secondary)]">Pustak Bhishi</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-strong)] flex flex-col items-center justify-center h-24">
          <span className="text-3xl font-light text-[var(--text-primary)]">{loading ? '-' : stats.books}</span>
          <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mt-1">Total books</span>
        </div>
        <div className="p-4 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-strong)] flex flex-col items-center justify-center h-24">
          <span className="text-3xl font-light text-[var(--text-primary)]">{loading ? '-' : stats.borrowed}</span>
          <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mt-1">Borrowed</span>
        </div>
        <div className="p-4 bg-red-50 dark:bg-[#211717] rounded-xl border border-red-200 dark:border-[#4a2626] flex flex-col items-center justify-center h-24">
          <span className="text-3xl font-light text-red-600 dark:text-[#f87171]">{loading ? '-' : stats.overdue}</span>
          <span className="text-[11px] text-red-500/80 dark:text-red-500/70 uppercase tracking-wider mt-1">Overdue</span>
        </div>
        <div className="p-4 bg-amber-50 dark:bg-[#231f13] rounded-xl border border-amber-200 dark:border-[#52441a] flex flex-col items-center justify-center h-24">
          <span className="text-3xl font-light text-amber-600 dark:text-[#fbbf24]">₹{loading ? '-' : stats.fines}</span>
          <span className="text-[11px] text-amber-600/80 dark:text-yellow-500/70 uppercase tracking-wider mt-1">Fines pending</span>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-8 lg:items-start">
        {/* Needs Attention Feed */}
        <div className="mb-8 lg:mb-0 lg:col-span-2">
          <SectionLabel>Needs Attention</SectionLabel>
          {loading ? (
            <p className="text-[var(--text-muted)]">Loading...</p>
          ) : attentionList.length === 0 ? (
            <div className="p-6 text-center bg-[var(--bg-surface)] rounded-xl border border-[var(--border-strong)]">
              <p className="text-[var(--text-secondary)]">No overdue books or fines. Perfect!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {attentionList.map(txn => (
                <div key={txn.id} className="p-4 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{txn.userName || txn.userId}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1 truncate">{txn.bookTitle}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="px-2 py-1 bg-amber-50 dark:bg-[#231f13] border border-amber-200 dark:border-[#52441a] rounded text-xs text-amber-700 dark:text-[#fbbf24] font-medium whitespace-nowrap">
                      ₹{txn.fineDue} fine
                    </div>
                    <button
                      onClick={() => handleMarkPaid(txn)}
                      className="w-8 h-8 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 dark:hover:border-emerald-600 flex items-center justify-center transition-colors"
                      title="Mark fine paid and return book"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions Grid */}
        <div className="lg:col-span-1">
          <SectionLabel>Quick Actions</SectionLabel>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/books" className="flex flex-col items-center justify-center p-6 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded-xl transition-colors">
              <span className="text-2xl mb-2">📚</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">Catalog</span>
            </Link>
            <Link to="/settings?tab=members" className="flex flex-col items-center justify-center p-6 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded-xl transition-colors">
              <span className="text-2xl mb-2">👥</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">All members</span>
            </Link>
            <Link to="/settings" className="flex flex-col items-center justify-center p-6 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded-xl transition-colors">
              <span className="text-2xl mb-2">⚙️</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">Settings</span>
            </Link>
            <Link to="/settings?tab=config" className="flex flex-col items-center justify-center p-6 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded-xl transition-colors">
              <span className="text-2xl mb-2">📊</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">Export</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { userProfile } = useAuth();

  return (
    <div className="max-w-md md:max-w-4xl lg:max-w-6xl mx-auto min-h-screen px-4 md:px-6 pt-8">
      {userProfile?.isAdmin ? <AdminDashboard /> : <MemberDashboard />}
    </div>
  );
}
