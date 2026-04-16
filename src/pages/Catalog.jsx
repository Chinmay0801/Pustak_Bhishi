import { useState, useEffect, useMemo } from 'react';
import { getBooks, deleteBook, borrowBook } from '../services/bookService';
import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────────
// Generate a stable accent color from book title
// ─────────────────────────────────────────────
function getAccentColor(str = '') {
  const palettes = [
    { from: '#6366f1', to: '#818cf8' }, // indigo
    { from: '#8b5cf6', to: '#a78bfa' }, // violet
    { from: '#ec4899', to: '#f472b6' }, // pink
    { from: '#14b8a6', to: '#2dd4bf' }, // teal
    { from: '#f59e0b', to: '#fbbf24' }, // amber
    { from: '#3b82f6', to: '#60a5fa' }, // blue
    { from: '#ef4444', to: '#f87171' }, // red
    { from: '#10b981', to: '#34d399' }, // emerald
    { from: '#f97316', to: '#fb923c' }, // orange
    { from: '#06b6d4', to: '#22d3ee' }, // cyan
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palettes[Math.abs(hash) % palettes.length];
}

function getInitials(title = '') {
  return title
    .split(' ')
    .filter(w => w.length > 2)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || title[0]?.toUpperCase() || '?';
}

// ─────────────────────────────────────────────
// Borrow Confirmation Modal
// ─────────────────────────────────────────────
function BorrowModal({ book, onConfirm, onCancel, loading }) {
  const today = new Date().toISOString().split('T')[0];
  const [borrowDate, setBorrowDate] = useState(today);
  const accent = getAccentColor(book.title);

  const dueDate = useMemo(() => {
    const d = new Date(borrowDate);
    d.setDate(d.getDate() + 90);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [borrowDate]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-8 sm:pb-0">
      <div className="w-full max-w-sm bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden">
        {/* Accent bar */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(to right, ${accent.from}, ${accent.to})` }} />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-start gap-4">
          <div
            className="w-11 h-14 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}
          >
            {getInitials(book.title)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-1">Borrowing</p>
            <h2 className="text-sm font-bold text-white leading-snug line-clamp-2">{book.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">by {book.author}</p>
          </div>
        </div>

        <div className="h-px bg-[#2a2a2a] mx-6" />

        {/* Body */}
        <div className="px-6 py-5 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Borrow Date</label>
            <input
              type="date"
              value={borrowDate}
              max={today}
              onChange={(e) => setBorrowDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#141414] border border-[#333] rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center justify-between px-4 py-3 bg-[#141414] rounded-xl border border-[#2a2a2a]">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Auto due date</p>
              <p className="text-sm font-bold text-white mt-0.5">{dueDate}</p>
            </div>
            <span className="text-xs font-bold text-indigo-400 bg-indigo-900/40 px-2.5 py-1 rounded-full border border-indigo-800/40">
              90 days
            </span>
          </div>

          <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-950/20 border border-amber-900/30 rounded-xl">
            <span className="text-sm">⚠️</span>
            <p className="text-xs text-amber-300/80">
              Fine of <strong className="text-amber-300">₹20</strong> applies after 90 days.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 text-sm font-semibold text-gray-400 bg-[#141414] border border-[#333] rounded-xl hover:bg-[#252525] hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(borrowDate)}
            disabled={loading}
            className="flex-1 py-3 text-sm font-bold text-white rounded-xl shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}
          >
            {loading ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Borrowing…</> : 'Confirm Borrow'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Book Card — compact, no image
// ─────────────────────────────────────────────
function BookCard({ book, currentUser, userProfile, onBorrow, onDelete }) {
  const isAvailable = book.status === 'available';
  const isMine = book.borrowedBy === currentUser?.uid;
  const accent = getAccentColor(book.title);

  // Overdue calculation
  let overdueInfo = null;
  if (!isAvailable && book.borrowedAt) {
    const borrowedDate = book.borrowedAt?.toDate ? book.borrowedAt.toDate() : new Date(book.borrowedAt);
    const daysBorrowed = Math.floor((new Date() - borrowedDate) / (1000 * 60 * 60 * 24));
    if (daysBorrowed > 90) {
      overdueInfo = { type: 'overdue', text: `Overdue ${daysBorrowed - 90}d — ₹20 fine` };
    } else if (daysBorrowed > 80) {
      overdueInfo = { type: 'warn', text: `Due in ${90 - daysBorrowed}d` };
    }
  }

  function formatDate(value) {
    if (!value) return null;
    const d = value?.toDate ? value.toDate() : new Date(value);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div className={`relative flex flex-col bg-[#161616] border rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl
      ${isAvailable ? 'border-[#252525] hover:border-[#383838]' : 'border-[#252525] opacity-80'}`}
    >
      {/* Top accent bar */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(to right, ${accent.from}, ${accent.to})` }} />

      <div className="p-4 flex-1 flex flex-col">
        {/* Row 1: Book number + status */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono text-gray-600 bg-[#1e1e1e] px-2 py-0.5 rounded border border-[#2a2a2a]">
            #{book.bookNumber || '—'}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1
            ${isAvailable
              ? 'text-emerald-400 bg-emerald-900/30 border border-emerald-800/40'
              : 'text-amber-400 bg-amber-900/30 border border-amber-800/40'
            }`}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: isAvailable ? '#4ade80' : '#fbbf24' }} />
            {isAvailable ? 'Available' : 'Borrowed'}
          </span>
        </div>

        {/* Row 2: Initials badge + Title/Author */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-12 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-white leading-tight text-center shadow-md"
            style={{ background: `linear-gradient(135deg, ${accent.from}cc, ${accent.to}cc)` }}
          >
            {getInitials(book.title)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">{book.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{book.author}</p>
          </div>
        </div>

        {/* Meta */}
        <div className="space-y-1 text-xs text-gray-600 flex-1">
          {book.contributor && (
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-[#2a2a2a] flex items-center justify-center text-[9px]">🎁</span>
              <span className="truncate">{book.contributor}</span>
            </div>
          )}
          {!isAvailable && book.borrowedAt && (
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-[#2a2a2a] flex items-center justify-center text-[9px]">📅</span>
              <span>{formatDate(book.borrowedAt)}</span>
            </div>
          )}
          {!isAvailable && book.dueDate && (
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-[#2a2a2a] flex items-center justify-center text-[9px]">⏰</span>
              <span>Due {formatDate(book.dueDate)}</span>
            </div>
          )}
        </div>

        {/* Overdue pill */}
        {overdueInfo && (
          <div className={`mt-2 px-2.5 py-1 rounded-lg text-[10px] font-bold text-center
            ${overdueInfo.type === 'overdue'
              ? 'bg-red-900/30 text-red-400 border border-red-800/30'
              : 'bg-amber-900/30 text-amber-400 border border-amber-800/30'
            }`}>
            {overdueInfo.type === 'overdue' ? '🔴' : '⚠️'} {overdueInfo.text}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="px-4 pb-4">
        {isAvailable ? (
          <button
            onClick={() => onBorrow(book)}
            className="w-full py-2.5 text-sm font-bold text-white rounded-xl transition-all active:scale-95 shadow-md hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}
          >
            Borrow
          </button>
        ) : isMine ? (
          <div className="w-full py-2.5 text-xs font-semibold text-center text-indigo-400 bg-indigo-900/20 border border-indigo-800/30 rounded-xl">
            Borrowed by you
          </div>
        ) : (
          <div className="w-full py-2.5 text-xs font-medium text-center text-gray-600 bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl">
            Borrowed by {book.borrowedByName || 'a member'}
          </div>
        )}
      </div>

      {/* Admin delete */}
      {userProfile?.isAdmin && (
        <button
          onClick={() => onDelete(book.id)}
          className="absolute top-3 right-3 p-1 text-gray-700 hover:text-red-500 hover:bg-red-900/20 rounded-md transition-colors"
          title="Delete"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
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
  const [borrowTarget, setBorrowTarget] = useState(null);
  const [borrowLoading, setBorrowLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const { currentUser, userProfile } = useAuth();

  async function fetchBooks() {
    try {
      setLoading(true);
      const list = await getBooks();
      setBooks(list);
      setFilteredBooks(list);
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

  const donors = useMemo(() => {
    const names = books.map(b => b.contributor?.trim()).filter(Boolean);
    const seen = new Set();
    const unique = [];
    names.forEach(n => { if (!seen.has(n.toLowerCase())) { seen.add(n.toLowerCase()); unique.push(n); } });
    return ['all', ...unique];
  }, [books]);

  function applyFilters() {
    const q = searchQuery.trim().toLowerCase();
    setFilteredBooks(books.filter(book => {
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
    if (!window.confirm('Delete this book?')) return;
    try { await deleteBook(bookId); fetchBooks(); }
    catch (err) { showToast('Failed to delete: ' + err.message, 'error'); }
  }

  async function handleConfirmBorrow(borrowDate) {
    if (!borrowTarget) return;
    setBorrowLoading(true);
    try {
      const borrowerName = userProfile?.displayName || currentUser.email;
      await borrowBook(borrowTarget.id, borrowTarget.title, currentUser.uid, borrowerName, borrowDate);
      showToast(`"${borrowTarget.title}" borrowed!`);
      setBorrowTarget(null);
      fetchBooks();
    } catch (err) {
      showToast('Failed: ' + err.message, 'error');
    } finally {
      setBorrowLoading(false);
    }
  }

  // Stats
  const available = books.filter(b => b.status === 'available').length;
  const borrowed  = books.filter(b => b.status === 'borrowed').length;

  return (
    <div className="max-w-7xl px-4 sm:px-6 mx-auto py-6 pb-28">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl text-sm font-semibold shadow-xl border
          ${toast.type === 'error' ? 'bg-red-950 text-red-200 border-red-800' : 'bg-[#0d2117] text-emerald-200 border-emerald-900'}`}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      {borrowTarget && (
        <BorrowModal book={borrowTarget} onConfirm={handleConfirmBorrow} onCancel={() => setBorrowTarget(null)} loading={borrowLoading} />
      )}

      {/* Page header */}
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Library Catalog</h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-0.5">
              <span className="text-emerald-400 font-medium">{available}</span> available
              {' · '}
              <span className="text-amber-400 font-medium">{borrowed}</span> borrowed
              {' · '}
              <span className="text-gray-400 font-medium">{books.length}</span> total
            </p>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-600 pointer-events-none">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyFilters()}
            placeholder="Search by title, author, number…"
            className="w-full pl-9 pr-4 py-2.5 bg-[#161616] border border-[#2a2a2a] rounded-xl text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-[#161616] border border-[#2a2a2a] rounded-xl text-sm text-gray-300 focus:ring-2 focus:ring-indigo-500 transition-all"
        >
          <option value="all">All statuses</option>
          <option value="available">Available</option>
          <option value="borrowed">Borrowed</option>
        </select>

        {/* Donor */}
        <select
          value={donorFilter}
          onChange={e => setDonorFilter(e.target.value)}
          className="px-3 py-2.5 bg-[#161616] border border-[#2a2a2a] rounded-xl text-sm text-gray-300 focus:ring-2 focus:ring-indigo-500 transition-all"
        >
          {donors.map(n => <option key={n} value={n}>{n === 'all' ? 'All contributors' : n}</option>)}
        </select>

        <div className="flex gap-2">
          <button onClick={handleResetFilters} className="px-4 py-2.5 text-sm font-semibold text-gray-500 bg-[#161616] border border-[#2a2a2a] rounded-xl hover:text-white hover:bg-[#222] transition-all whitespace-nowrap">
            Reset
          </button>
          <button onClick={applyFilters} className="px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 shadow-md shadow-indigo-500/20 transition-all whitespace-nowrap">
            Search
          </button>
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-xs text-gray-600 mb-4 font-medium">
          Showing {filteredBooks.length} of {books.length} books
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-8 h-8 rounded-full animate-spin border-2 border-[#333] border-t-indigo-500" />
          <p className="text-sm text-gray-600">Loading catalog…</p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="py-20 text-center bg-[#161616] border border-[#252525] rounded-2xl">
          <p className="text-3xl mb-3">🔍</p>
          <p className="text-gray-400 font-medium">No books match your search.</p>
          <button onClick={handleResetFilters} className="mt-4 px-4 py-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredBooks.map(book => (
            <BookCard
              key={book.id}
              book={book}
              currentUser={currentUser}
              userProfile={userProfile}
              onBorrow={setBorrowTarget}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
