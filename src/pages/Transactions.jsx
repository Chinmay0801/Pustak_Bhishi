import { useState, useEffect, useMemo } from 'react';
import { getAllTransactions, returnBook } from '../services/bookService';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function fmtDate(value) {
  if (!value) return '—';
  const d = value?.toDate ? value.toDate() : new Date(value);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getStatus(txn) {
  if (txn.isReturned) {
    const borrowedDate = txn.borrowedAt?.toDate ? txn.borrowedAt.toDate() : new Date(txn.borrowedAt ?? 0);
    const returnedDate = txn.returnedAt?.toDate ? txn.returnedAt.toDate() : new Date(txn.returnedAt ?? 0);
    const dueDate = txn.dueDate?.toDate ? txn.dueDate.toDate() : new Date(txn.dueDate ?? 0);
    return returnedDate <= dueDate ? 'on-time' : 'late';
  }
  if (txn.isOverdue) return 'overdue';
  return 'active';
}

const STATUS_CONFIG = {
  'on-time': { label: 'Returned ✓', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/40' },
  'late':    { label: 'Returned Late', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/40' },
  'overdue': { label: 'Overdue ⚠', cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/40' },
  'active':  { label: 'Active', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-400 dark:border-indigo-800/40' },
};

// ─────────────────────────────────────────────
// CSV Export
// ─────────────────────────────────────────────
function exportCSV(transactions) {
  const headers = ['Book Title', 'Member', 'Borrowed On', 'Due Date', 'Returned On', 'Status', 'Fine (₹)'];
  const rows = transactions.map(txn => {
    const status = getStatus(txn);
    return [
      `"${txn.bookTitle || ''}"`,
      `"${txn.userName || txn.userId || ''}"`,
      fmtDate(txn.borrowedAt),
      fmtDate(txn.dueDate),
      fmtDate(txn.returnedAt),
      STATUS_CONFIG[status]?.label || status,
      txn.fineDue || 0,
    ].join(',');
  });
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────
// Main Transactions Page (Admin Only)
// ─────────────────────────────────────────────
export default function Transactions() {
  const { userProfile } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toast, setToast] = useState(null);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function fetchAll() {
    setLoading(true);
    try {
      const data = await getAllTransactions();
      setTransactions(data);
    } catch (err) {
      showToast('Failed to load transactions: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, [/* fetchAll is stable enough, but strictly should be wrapped in useCallback if included, empty array is fine for now */]);

  async function handleReturn(txn) {
    if (!window.confirm(`Mark "${txn.bookTitle}" as returned and fine cleared for ${txn.userName}?`)) return;
    try {
      await returnBook(txn.bookId, txn.id);
      showToast('Book returned and fine cleared!');
      fetchAll();
    } catch (err) {
      showToast('Failed: ' + err.message, 'error');
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter(txn => {
      const status = getStatus(txn);
      const matchSearch = !q || [txn.bookTitle, txn.userName, txn.userId]
        .filter(Boolean).some(f => f.toLowerCase().includes(q));
      const matchStatus = statusFilter === 'all' || status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [transactions, search, statusFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const active = transactions.filter(t => !t.isReturned).length;
    const overdue = transactions.filter(t => t.isOverdue && !t.isReturned).length;
    const fines = transactions.reduce((s, t) => s + (t.fineDue || 0), 0);
    const returned = transactions.filter(t => t.isReturned).length;
    return { active, overdue, fines, returned };
  }, [transactions]);

  if (!userProfile?.isAdmin) return <Navigate to="/" />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-28">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl text-sm font-semibold shadow-xl border
          ${toast.type === 'error' ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-700' : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-100 dark:border-emerald-700'}`}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">All Transactions</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Complete borrow & return log</p>
        </div>
        <button
          onClick={() => exportCSV(filtered)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Active', value: stats.active, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-900/40' },
          { label: 'Overdue', value: stats.overdue, color: 'text-red-600 dark:text-red-400', bg: stats.overdue > 0 ? 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-900/50' : 'bg-[var(--bg-surface)] border-[var(--border)]' },
          { label: 'Fines Pending', value: `₹${stats.fines}`, color: stats.fines > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--text-primary)]', bg: stats.fines > 0 ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/50' : 'bg-[var(--bg-surface)] border-[var(--border)]' },
          { label: 'Returned', value: stats.returned, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-[var(--bg-surface)] border-[var(--border)]' },
        ].map(s => (
          <div key={s.label} className={`p-4 border rounded-xl text-center ${s.bg}`}>
            <p className={`text-2xl font-light ${s.color}`}>{loading ? '—' : s.value}</p>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center text-[var(--text-muted)] pointer-events-none">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search book or member…"
            className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-indigo-500 transition-all"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="overdue">Overdue</option>
          <option value="on-time">Returned on time</option>
          <option value="late">Returned late</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full animate-spin border-2 border-[var(--border-strong)] border-t-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-[var(--text-secondary)]">No transactions found.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-surface-2)] border-b border-[var(--border)]">
                  {['Book', 'Member', 'Borrowed On', 'Due Date', 'Returned On', 'Status', 'Fine', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map(txn => {
                  const status = getStatus(txn);
                  const cfg = STATUS_CONFIG[status];
                  return (
                    <tr
                      key={txn.id}
                      className={`transition-colors hover:bg-[var(--bg-hover)]
                        ${status === 'overdue' ? 'bg-red-50/60 dark:bg-red-950/10' : 'bg-[var(--bg-surface)]'}`}
                    >
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)] max-w-[180px] truncate">{txn.bookTitle}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{txn.userName || txn.userId}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap">{fmtDate(txn.borrowedAt)}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap">{fmtDate(txn.dueDate)}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap">{fmtDate(txn.returnedAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-bold ${txn.fineDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-muted)]'}`}>
                        {txn.fineDue > 0 ? `₹${txn.fineDue}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {!txn.isReturned && (
                          <button
                            onClick={() => handleReturn(txn)}
                            className="px-3 py-1.5 text-[11px] font-bold text-white bg-emerald-700 rounded-lg hover:bg-emerald-600 transition-colors whitespace-nowrap"
                          >
                            {txn.isOverdue ? 'Return + Clear Fine' : 'Mark Returned'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {filtered.map(txn => {
              const status = getStatus(txn);
              const cfg = STATUS_CONFIG[status];
              return (
                <div key={txn.id} className={`p-4 rounded-xl border ${status === 'overdue' ? 'bg-red-50/60 border-red-200 dark:bg-red-950/10 dark:border-red-900/40' : 'bg-[var(--bg-surface)] border-[var(--border)]'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-[var(--text-primary)] text-sm flex-1 pr-2 truncate">{txn.bookTitle}</p>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">👤 {txn.userName || txn.userId}</p>
                  <p className="text-xs text-[var(--text-muted)]">📅 {fmtDate(txn.borrowedAt)} → ⏰ {fmtDate(txn.dueDate)}</p>
                  {txn.returnedAt && <p className="text-xs text-[var(--text-muted)] mt-0.5">✅ Returned: {fmtDate(txn.returnedAt)}</p>}
                  {txn.fineDue > 0 && <p className="text-xs font-bold text-red-600 dark:text-red-400 mt-1">Fine: ₹{txn.fineDue}</p>}
                  {!txn.isReturned && (
                    <button
                      onClick={() => handleReturn(txn)}
                      className="mt-3 w-full py-2 text-xs font-bold text-white bg-emerald-700 rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                      {txn.isOverdue ? 'Return + Clear Fine' : 'Mark Returned'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-[var(--text-muted)] text-right">{filtered.length} of {transactions.length} records</p>
        </>
      )}
    </div>
  );
}
