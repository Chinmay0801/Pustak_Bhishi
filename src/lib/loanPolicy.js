// Pure loan/fine logic shared by services, pages, and tests.
// The policy lives in settings/global (loanDays, fineAmount); these are the
// fallbacks used when that doc is missing or doesn't set them.
export const DEFAULT_LOAN_POLICY = { loanDays: 90, fineAmount: 20 };

const DAY_MS = 24 * 60 * 60 * 1000;

export function toDate(value) {
  if (!value) return null;
  return value.toDate ? value.toDate() : new Date(value);
}

export function normalizePolicy(settings) {
  const loanDays = Number(settings?.loanDays);
  const fineAmount = Number(settings?.fineAmount);
  return {
    loanDays: Number.isFinite(loanDays) && loanDays > 0 ? loanDays : DEFAULT_LOAN_POLICY.loanDays,
    fineAmount: Number.isFinite(fineAmount) && fineAmount >= 0 ? fineAmount : DEFAULT_LOAN_POLICY.fineAmount,
  };
}

export function computeDueDate(borrowDate, policy = DEFAULT_LOAN_POLICY) {
  return new Date(borrowDate.getTime() + policy.loanDays * DAY_MS);
}

// Loan status for a transaction (or a borrowed book doc) at `now`.
// Active loans: overdue once past dueDate, fine = policy.fineAmount (flat).
// Returned loans: owe whatever fine was recorded at return time and not yet paid.
export function computeLoanStatus(txn, policy = DEFAULT_LOAN_POLICY, now = new Date()) {
  if (txn.isReturned) {
    const fineDue = txn.finePaid ? 0 : Number(txn.fineAmount) || 0;
    return { daysBorrowed: 0, daysLeft: 0, daysOverdue: 0, isOverdue: false, fineDue };
  }

  const borrowed = toDate(txn.borrowedAt);
  if (!borrowed) {
    return { daysBorrowed: 0, daysLeft: policy.loanDays, daysOverdue: 0, isOverdue: false, fineDue: 0 };
  }

  const due = toDate(txn.dueDate) ?? computeDueDate(borrowed, policy);
  const daysBorrowed = Math.floor((now - borrowed) / DAY_MS);
  const isOverdue = now > due;
  return {
    daysBorrowed,
    daysLeft: isOverdue ? 0 : Math.ceil((due - now) / DAY_MS),
    daysOverdue: isOverdue ? Math.floor((now - due) / DAY_MS) : 0,
    isOverdue,
    fineDue: isOverdue ? policy.fineAmount : 0,
  };
}

// Fine to record on a transaction at the moment it is returned.
export function fineAtReturn(txn, policy = DEFAULT_LOAN_POLICY, now = new Date()) {
  return computeLoanStatus({ ...txn, isReturned: false }, policy, now).fineDue;
}
