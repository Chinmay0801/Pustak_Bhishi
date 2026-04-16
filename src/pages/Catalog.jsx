import { useState, useEffect, useMemo } from 'react';
import { getBooks, deleteBook, borrowBook } from '../services/bookService';
import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────────
// Borrow Confirmation Modal
// ─────────────────────────────────────────────
function BorrowModal({ book, onConfirm, onCancel, loading }) {
  const today = new Date().toISOString().split('T')[0];
  const [borrowDate, setBorrowDate] = useState(today);

  const dueDate = useMemo(() => {
    const d = new Date(borrowDate);
    d.setDate(d.getDate() + 90);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [borrowDate]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-8 sm:pb-0">
      <div className="w-full max-w-sm bg-[#1e1e1e] border border-[#333] rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#2a2a2a]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-16 bg-indigo-900/40 rounded-lg flex items-center justify-center shrink-0 text-2xl shadow-inner">
              📚
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-indigo-400 font-semibold uppercase tracking-widest mb-1">Borrowing</p>
              <h2 className="text-base font-bold text-white leading-tight line-clamp-2">{book.title}</h2>
              <p className="text-sm text-gray-400 mt-0.5">by {book.author}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Borrow Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Borrow Date
            </label>
            <input
              type="date"
              value={borrowDate}
              max={today}
              onChange={(e) => setBorrowDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#141414] border border-[#333] rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Due Date Preview */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#141414] rounded-xl border border-[#2a2a2a]">
            <div className="flex items-center gap-2">
              <span className="text-lg">📅</span>
              <div>
                <p className="text-xs text-gray-500 leading-none">Due date</p>
                <p className="text-sm font-bold text-white mt-0.5">{dueDate}</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-indigo-400 bg-indigo-900/40 px-2 py-1 rounded-full">
              90 days
            </span>
          </div>

          {/* Fine Rule */}
          <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-950/30 border border-amber-900/40 rounded-xl">
            <span className="text-amber-400 text-sm mt-0.5">⚠️</span>
            <p className="text-xs text-amber-300/80 leading-relaxed">
              A flat fine of <strong className="text-amber-300">₹20</strong> applies if the book is not returned within 90 days.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 text-sm font-semibold text-gray-400 bg-[#141414] border border-[#333] rounded-xl hover:bg-[#242424] hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(borrowDate)}
            disabled={loading}
            className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Borrowing…
              </>
            ) : 'Confirm Borrow'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Fine / Status pill helper (for borrowed cards)
// ─────────────────────────────────────────────
function BorrowedStatusPill({ borrowedAt, dueDate: dueDateRaw }) {
  if (!borrowedAt) return null;
  const borrowedDate = borrowedAt?.toDate ? borrowedAt.toDate() : new Date(borrowedAt);
  const daysBorrowed = Math.floor((new Date() - borrowedDate) / (1000 * 60 * 60 * 24));
  const isOverdue = daysBorrowed > 90;

  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-900/40 border border-red-800/50 text-red-400 text-[10px] font-bold rounded-full">
        🔴 Overdue {daysBorrowed - 90}d — ₹20 fine
      </span>
    );
  }
  const daysLeft = 90 - daysBorrowed;
  if (daysLeft <= 10) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-900/40 border border-amber-800/50 text-amber-400 text-[10px] font-bold rounded-full">
        ⚠️ Due in {daysLeft}d
      </span>
    );
  }
  return null;
}

// ─────────────────────────────────────────────
// Main Catalog Page
// ─────────────────────────────────────────────
export default function Catalog() {
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [donorFilter, setDonorFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [borrowTarget, setBorrowTarget] = useState(null); // book to borrow
  const [borrowLoading, setBorrowLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const { currentUser, userProfile } = useAuth();

  async function fetchBooks() {
    try {
      setLoading(true);
      const booksList = await getBooks();
      setBooks(booksList);
      setFilteredBooks(booksList);
    } catch (err) {
      console.error('Failed to load books:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchBooks(); }, []);
  useEffect(() => { setFilteredBooks(books); }, [books]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function formatDate(value) {
    if (!value) return 'N/A';
    const date = value?.toDate ? value.toDate() : new Date(value);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const donors = useMemo(() => {
    const names = books.map((b) => b.contributor?.trim()).filter(Boolean);
    const unique = [];
    const seen = new Set();
    names.forEach(n => { if (!seen.has(n.toLowerCase())) { seen.add(n.toLowerCase()); unique.push(n); } });
    return ['all', ...unique];
  }, [books]);

  function applyFilters() {
    const q = searchQuery.trim().toLowerCase();
    setFilteredBooks(books.filter((book) => {
      const matchSearch = !q || [book.title, book.author, book.contributor, book.bookNumber]
        .filter(Boolean).some(f => f.toLowerCase().includes(q));
      const matchStatus = statusFilter === 'all' || book.status === statusFilter;
      const matchDonor = donorFilter === 'all' || book.contributor?.trim().toLowerCase() === donorFilter.toLowerCase();
      return matchSearch && matchStatus && matchDonor;
    }));
  }

  function handleResetFilters() {
    setSearchQuery('');
    setStatusFilter('all');
    setDonorFilter('all');
    setFilteredBooks(books);
  }

  async function handleDelete(bookId) {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    try {
      await deleteBook(bookId);
      fetchBooks();
    } catch (err) {
      showToast('Failed to delete: ' + err.message, 'error');
    }
  }

  async function handleConfirmBorrow(borrowDate) {
    if (!borrowTarget) return;
    setBorrowLoading(true);
    try {
      const borrowerName = userProfile?.displayName || currentUser.email;
      await borrowBook(borrowTarget.id, borrowTarget.title, currentUser.uid, borrowerName, borrowDate);
      showToast(`"${borrowTarget.title}" borrowed successfully!`);
      setBorrowTarget(null);
      fetchBooks();
    } catch (err) {
      showToast('Failed to borrow: ' + err.message, 'error');
    } finally {
      setBorrowLoading(false);
    }
  }

  return (
    <div className="max-w-7xl p-4 sm:p-6 mx-auto pb-28">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl text-sm font-semibold shadow-xl transition-all animate-fade-in
          ${toast.type === 'error' ? 'bg-red-900 text-red-100 border border-red-700' : 'bg-emerald-900 text-emerald-100 border border-emerald-700'}`}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      {/* Borrow Modal */}
      {borrowTarget && (
        <BorrowModal
          book={borrowTarget}
          onConfirm={handleConfirmBorrow}
          onCancel={() => setBorrowTarget(null)}
          loading={borrowLoading}
        />
      )}

      <h1 className="mb-6 text-2xl sm:text-3xl font-bold text-white">Library Catalog</h1>

      {/* Filter Bar */}
      <div className="grid gap-4 p-5 mb-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl shadow-xl md:grid-cols-4">
        {/* Search */}
        <div className="md:col-span-1">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Search</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-500 pointer-events-none">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              type="text"
              placeholder="Title, author, #..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#141414] border border-[#333] rounded-xl text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-[#141414] border border-[#333] rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="borrowed">Borrowed</option>
          </select>
        </div>

        {/* Donor */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Donated By</label>
          <select
            value={donorFilter}
            onChange={(e) => setDonorFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-[#141414] border border-[#333] rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            {donors.map(n => <option key={n} value={n}>{n === 'all' ? 'All Contributors' : n}</option>)}
          </select>
        </div>

        {/* Actions */}
        <div className="flex flex-col justify-end">
          <div className="flex gap-2">
            <button onClick={handleResetFilters} className="flex-1 py-2.5 text-sm font-semibold text-gray-400 bg-[#141414] border border-[#333] rounded-xl hover:text-white hover:bg-[#242424] transition-all">
              Reset
            </button>
            <button onClick={applyFilters} className="flex-1 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all">
              Filter
            </button>
          </div>
        </div>

        <div className="md:col-span-4 text-xs text-gray-600 font-medium">
          Showing {filteredBooks.length} of {books.length} books
        </div>
      </div>

      {/* Book Grid */}
      {loading && filteredBooks.length === 0 ? (
        <div className="flex justify-center p-16">
          <div className="w-8 h-8 rounded-full animate-spin border-2 border-[#333] border-t-indigo-500" />
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="p-12 text-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-400 font-medium">No matching books found.</p>
          <p className="mt-1 text-sm text-gray-600">Try a different search or reset the filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredBooks.map(book => {
            const isAvailable = book.status === 'available';
            const isMine = book.borrowedBy === currentUser?.uid;

            return (
              <div
                key={book.id}
                className={`relative flex flex-col p-5 rounded-2xl shadow-sm border transition-all hover:-translate-y-0.5 hover:shadow-lg
                  ${isAvailable
                    ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-indigo-800/50'
                    : 'bg-[#1a1a1a] border-[#2a2a2a] opacity-90'
                  }`}
              >
                {/* Admin delete button */}
                {userProfile?.isAdmin && (
                  <button
                    onClick={() => handleDelete(book.id)}
                    className="absolute top-3 right-3 p-1.5 text-gray-600 hover:text-red-500 hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete Book"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}

                {/* Top row: book number + status badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-gray-600 bg-[#141414] px-2 py-0.5 rounded-md border border-[#333]">
                    #{book.bookNumber || 'N/A'}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full
                    ${isAvailable ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/50' : 'bg-amber-900/40 text-amber-400 border border-amber-800/50'}`}>
                    {isAvailable ? '● Available' : '● Borrowed'}
                  </span>
                </div>

                {/* Book cover placeholder */}
                <div className="w-full h-32 bg-gradient-to-br from-indigo-900/30 to-purple-900/20 rounded-xl flex items-center justify-center my-4 border border-[#2a2a2a]">
                  <span className="text-4xl">📖</span>
                </div>

                {/* Title & Author */}
                <h3 className="text-sm font-bold text-white leading-tight line-clamp-2 mb-1">{book.title}</h3>
                <p className="text-xs text-gray-500 mb-3">{book.author}</p>

                {/* Meta info */}
                <div className="space-y-1 text-xs text-gray-600 mb-4 flex-1">
                  {book.contributor && <p>📦 {book.contributor}</p>}
                  {book.price && <p>💰 ₹{book.price}</p>}
                  {!isAvailable && book.borrowedAt && (
                    <p>📅 Borrowed: {formatDate(book.borrowedAt)}</p>
                  )}
                  {!isAvailable && book.dueDate && (
                    <p>⏰ Due: {formatDate(book.dueDate)}</p>
                  )}
                </div>

                {/* Overdue / urgency pill on borrowed cards */}
                {!isAvailable && book.borrowedAt && (
                  <div className="mb-3">
                    <BorrowedStatusPill borrowedAt={book.borrowedAt} dueDate={book.dueDate} />
                  </div>
                )}

                {/* CTA */}
                {isAvailable ? (
                  <button
                    onClick={() => setBorrowTarget(book)}
                    className="w-full py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                  >
                    Borrow Book
                  </button>
                ) : isMine ? (
                  <div className="w-full py-2.5 text-xs font-semibold text-center text-indigo-400 bg-indigo-900/20 border border-indigo-800/40 rounded-xl">
                    Borrowed by you
                  </div>
                ) : (
                  <div className="w-full py-2.5 text-xs font-semibold text-center text-gray-500 bg-[#141414] border border-[#2a2a2a] rounded-xl">
                    Borrowed by {book.borrowedByName || 'a member'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
