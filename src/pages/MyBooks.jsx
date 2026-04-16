import { useState, useEffect } from 'react';
import { getActiveTransactions, getPastTransactions, returnBook, getBooks } from '../services/bookService';
import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function fmtDate(value) {
  if (!value) return '—';
  const d = value?.toDate ? value.toDate() : new Date(value);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function OverdueTag({ daysBorrowed }) {
  const daysLeft = 90 - daysBorrowed;
  if (daysBorrowed > 90) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-900/40 border border-red-800/50 text-red-400 text-xs font-bold rounded-full">
        🔴 Overdue by {daysBorrowed - 90} day{daysBorrowed - 90 !== 1 ? 's' : ''} — Fine ₹20 applicable
      </span>
    );
  }
  if (daysLeft <= 10) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-900/40 border border-amber-800/50 text-amber-400 text-xs font-bold rounded-full">
        ⚠️ Due in {daysLeft} day{daysLeft !== 1 ? 's' : ''} — Return soon
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-900/30 border border-emerald-800/40 text-emerald-400 text-xs font-medium rounded-full">
      ✅ {daysLeft} days left
    </span>
  );
}

// ─────────────────────────────────────────────
// Tab: Currently Borrowed
// ─────────────────────────────────────────────
function ActiveTab({ transactions, onReturn, loading }) {
  if (loading)
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 rounded-full animate-spin border-2 border-[#333] border-t-indigo-500" />
      </div>
    );

  if (transactions.length === 0)
    return (
      <div className="py-16 text-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-gray-400 font-medium">No books currently borrowed.</p>
        <p className="text-sm text-gray-600 mt-1">Head to the Catalog to find your next read!</p>
      </div>
    );

  return (
    <div className="space-y-4">
      {transactions.map(txn => (
        <div key={txn.id} className="p-5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#3a3a3a] transition-colors">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-11 h-14 bg-indigo-900/30 rounded-lg flex items-center justify-center shrink-0 text-xl">
              📚
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-white truncate">{txn.bookTitle}</p>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>📅 Borrowed: {fmtDate(txn.borrowedAt)}</span>
                <span>⏰ Due: {fmtDate(txn.dueDate)}</span>
              </div>
              <div className="mt-2.5">
                <OverdueTag daysBorrowed={txn.daysBorrowed || 0} />
              </div>
            </div>
          </div>

          <button
            onClick={() => onReturn(txn)}
            className="shrink-0 px-5 py-2.5 text-sm font-bold text-white bg-emerald-700 rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-700/20 transition-all active:scale-95 whitespace-nowrap"
          >
            Return Book
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Tab: History (returned books)
// ─────────────────────────────────────────────
function HistoryTab({ history, loading }) {
  if (loading)
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 rounded-full animate-spin border-2 border-[#333] border-t-indigo-500" />
      </div>
    );

  if (history.length === 0)
    return (
      <div className="py-16 text-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl">
        <p className="text-4xl mb-3">📜</p>
        <p className="text-gray-400 font-medium">No borrowing history yet.</p>
      </div>
    );

  return (
    <div className="space-y-3">
      {history.map(txn => {
        const borrowedDate = txn.borrowedAt?.toDate ? txn.borrowedAt.toDate() : new Date(txn.borrowedAt ?? 0);
        const returnedDate = txn.returnedAt?.toDate ? txn.returnedAt.toDate() : new Date(txn.returnedAt ?? 0);
        const dueDate = txn.dueDate?.toDate ? txn.dueDate.toDate() : new Date(txn.dueDate ?? 0);
        const returnedOnTime = txn.returnedAt && returnedDate <= dueDate;

        return (
          <div key={txn.id} className="p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex items-center justify-between gap-4 hover:border-[#3a3a3a] transition-colors">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-11 bg-[#222] rounded-lg flex items-center justify-center shrink-0 text-lg">
                📖
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{txn.bookTitle}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {fmtDate(txn.borrowedAt)} → {fmtDate(txn.returnedAt)}
                </p>
              </div>
            </div>
            <span className={`shrink-0 px-2.5 py-1 text-xs font-bold rounded-full
              ${returnedOnTime
                ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/40'
                : 'bg-red-900/40 text-red-400 border border-red-800/40'
              }`}>
              {returnedOnTime ? '✓ On time' : '⚠ Late'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Tab: Books I Contributed
// ─────────────────────────────────────────────
function ContributedTab({ books, loading }) {
  if (loading)
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 rounded-full animate-spin border-2 border-[#333] border-t-indigo-500" />
      </div>
    );

  if (books.length === 0)
    return (
      <div className="py-16 text-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl">
        <p className="text-4xl mb-3">📦</p>
        <p className="text-gray-400 font-medium">You haven't contributed any books yet.</p>
      </div>
    );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {books.map(book => (
        <div key={book.id} className="p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex items-center gap-4 hover:border-indigo-800/40 transition-colors">
          <div className="w-11 h-14 bg-indigo-900/20 rounded-lg flex items-center justify-center shrink-0 text-xl border border-indigo-900/30">
            📚
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{book.title}</p>
            <p className="text-xs text-gray-500">by {book.author}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] font-mono text-gray-600">#{book.bookNumber || 'N/A'}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                ${book.status === 'borrowed'
                  ? 'bg-amber-900/40 text-amber-400 border border-amber-800/40'
                  : 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/40'
                }`}>
                {book.status === 'borrowed' ? '● Borrowed' : '● Available'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main MyBooks Page
// ─────────────────────────────────────────────
export default function MyBooks() {
  const [activeTab, setActiveTab] = useState('active');
  const [transactions, setTransactions] = useState([]);
  const [history, setHistory] = useState([]);
  const [donatedBooks, setDonatedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const { currentUser, userProfile } = useAuth();

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function fetchActive() {
    try {
      setLoading(true);
      setError(null);
      const [data, allBooks] = await Promise.all([
        getActiveTransactions(currentUser.uid),
        getBooks(),
      ]);
      setTransactions(data);
      const donated = allBooks.filter(
        b => b.contributor?.trim().toLowerCase() === userProfile?.displayName?.trim().toLowerCase()
      );
      setDonatedBooks(donated);
    } catch (err) {
      console.error('Failed to load my books:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchHistory() {
    setHistoryLoading(true);
    try {
      const data = await getPastTransactions(currentUser.uid);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    fetchActive();
  }, [currentUser]);

  // Lazy-load history on tab switch
  useEffect(() => {
    if (activeTab === 'history' && history.length === 0 && !historyLoading) {
      fetchHistory();
    }
  }, [activeTab]);

  async function handleReturn(txn) {
    if (!window.confirm(`Return "${txn.bookTitle}"?`)) return;
    try {
      await returnBook(txn.bookId, txn.id);
      showToast(`"${txn.bookTitle}" returned!`);
      // Refresh active list + clear history cache so it re-loads
      setHistory([]);
      fetchActive();
    } catch (err) {
      showToast('Failed to return: ' + err.message, 'error');
    }
  }

  // Stats
  const overdueCount = transactions.filter(t => t.isOverdue).length;
  const totalFine = transactions.reduce((s, t) => s + (t.fineDue || 0), 0);

  const tabs = [
    { id: 'active', label: 'Currently Borrowed', count: transactions.length },
    { id: 'history', label: 'History', count: history.length || null },
    { id: 'contributed', label: 'Contributed', count: donatedBooks.length || null },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-28">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl text-sm font-semibold shadow-xl
          ${toast.type === 'error'
            ? 'bg-red-900 text-red-100 border border-red-700'
            : 'bg-emerald-900 text-emerald-100 border border-emerald-700'}`}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">My Books</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {userProfile?.displayName || currentUser?.email}
        </p>
      </div>

      {/* Summary Cards */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-center">
            <p className="text-2xl font-light text-white">{transactions.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Borrowed</p>
          </div>
          <div className={`p-4 border rounded-xl text-center ${overdueCount > 0 ? 'bg-red-950/40 border-red-900/50' : 'bg-[#1a1a1a] border-[#2a2a2a]'}`}>
            <p className={`text-2xl font-light ${overdueCount > 0 ? 'text-red-400' : 'text-white'}`}>{overdueCount}</p>
            <p className={`text-[10px] uppercase tracking-wider mt-1 ${overdueCount > 0 ? 'text-red-500/70' : 'text-gray-500'}`}>Overdue</p>
          </div>
          <div className={`p-4 border rounded-xl text-center ${totalFine > 0 ? 'bg-amber-950/40 border-amber-900/50' : 'bg-[#1a1a1a] border-[#2a2a2a]'}`}>
            <p className={`text-2xl font-light ${totalFine > 0 ? 'text-amber-400' : 'text-white'}`}>₹{totalFine}</p>
            <p className={`text-[10px] uppercase tracking-wider mt-1 ${totalFine > 0 ? 'text-amber-500/70' : 'text-gray-500'}`}>Fine due</p>
          </div>
        </div>
      )}

      {/* Firestore index error helper */}
      {error && (
        <div className="p-5 mb-6 text-red-300 bg-red-950/60 rounded-xl border border-red-900">
          <h3 className="font-bold text-base mb-1">⚠️ Database Index Required</h3>
          <p className="text-xs mb-2">Firebase needs a composite index. Copy the URL in the error below into your browser and click <strong>Create Index</strong>:</p>
          <p className="text-[11px] font-mono break-all bg-black/40 p-2 rounded">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 bg-[#1a1a1a] border border-[#2a2a2a] p-1 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5
              ${activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#242424]'
              }`}
          >
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
                ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[#333] text-gray-400'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'active' && (
        <ActiveTab transactions={transactions} onReturn={handleReturn} loading={loading} />
      )}
      {activeTab === 'history' && (
        <HistoryTab history={history} loading={historyLoading} />
      )}
      {activeTab === 'contributed' && (
        <ContributedTab books={donatedBooks} loading={loading} />
      )}
    </div>
  );
}
