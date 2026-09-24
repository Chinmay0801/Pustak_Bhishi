// Shared style tokens for the Settings tabs (theme-aware via CSS vars, kept
// visually consistent with Catalog / MyBooks / Transactions).
export const CARD = 'bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 sm:p-6';
export const INPUT = 'w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all';
export const LABEL = 'block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5';
export const BTN_PRIMARY = 'px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50';
export const BTN_DANGER = 'px-4 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all disabled:opacity-50';
export const STATUS_PILL = (status) => `px-2 py-0.5 rounded-full text-[10px] font-bold border ${status === 'available'
  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/40'
  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/40'}`;

export function fmtDate(value) {
  if (!value) return 'N/A';
  const d = value.toDate ? value.toDate() : new Date(value);
  return d.toLocaleDateString();
}
