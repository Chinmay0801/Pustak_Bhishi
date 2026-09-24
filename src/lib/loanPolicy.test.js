import { describe, it, expect } from 'vitest';
import { computeLoanStatus, computeDueDate, fineAtReturn, normalizePolicy, DEFAULT_LOAN_POLICY } from './loanPolicy';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-06-01T12:00:00Z');
const daysAgo = (n) => new Date(now.getTime() - n * DAY);
const ts = (d) => ({ toDate: () => d }); // Firestore Timestamp stand-in

describe('computeLoanStatus', () => {
  it('is not overdue within the loan period', () => {
    const txn = { borrowedAt: ts(daysAgo(30)), dueDate: ts(computeDueDate(daysAgo(30))) };
    const s = computeLoanStatus(txn, DEFAULT_LOAN_POLICY, now);
    expect(s).toMatchObject({ daysBorrowed: 30, daysLeft: 60, isOverdue: false, fineDue: 0 });
  });

  it('charges the flat fine once past the due date', () => {
    const txn = { borrowedAt: ts(daysAgo(95)), dueDate: ts(computeDueDate(daysAgo(95))) };
    const s = computeLoanStatus(txn, DEFAULT_LOAN_POLICY, now);
    expect(s).toMatchObject({ isOverdue: true, daysOverdue: 5, fineDue: 20, daysLeft: 0 });
  });

  it('uses the stored dueDate, not the current policy', () => {
    const borrowed = daysAgo(40);
    const txn = { borrowedAt: ts(borrowed), dueDate: ts(new Date(borrowed.getTime() + 30 * DAY)) };
    expect(computeLoanStatus(txn, DEFAULT_LOAN_POLICY, now).isOverdue).toBe(true);
  });

  it('falls back to borrowedAt + loanDays when dueDate is missing', () => {
    const txn = { borrowedAt: daysAgo(15) };
    expect(computeLoanStatus(txn, { loanDays: 14, fineAmount: 50 }, now)).toMatchObject({ isOverdue: true, fineDue: 50 });
  });

  it('treats a pending serverTimestamp (null borrowedAt) as a fresh loan', () => {
    expect(computeLoanStatus({ borrowedAt: null }, DEFAULT_LOAN_POLICY, now)).toMatchObject({ isOverdue: false, fineDue: 0 });
  });

  it('returned loans owe only the unpaid recorded fine', () => {
    expect(computeLoanStatus({ isReturned: true, fineAmount: 20, finePaid: false }).fineDue).toBe(20);
    expect(computeLoanStatus({ isReturned: true, fineAmount: 20, finePaid: true }).fineDue).toBe(0);
    // legacy returns: no fineAmount, finePaid true
    expect(computeLoanStatus({ isReturned: true, finePaid: true }).fineDue).toBe(0);
  });
});

describe('fineAtReturn', () => {
  it('records the fine for an overdue loan and zero otherwise', () => {
    const late = { borrowedAt: ts(daysAgo(100)), dueDate: ts(computeDueDate(daysAgo(100))) };
    const onTime = { borrowedAt: ts(daysAgo(10)), dueDate: ts(computeDueDate(daysAgo(10))) };
    expect(fineAtReturn(late, DEFAULT_LOAN_POLICY, now)).toBe(20);
    expect(fineAtReturn(onTime, DEFAULT_LOAN_POLICY, now)).toBe(0);
  });
});

describe('normalizePolicy', () => {
  it('fills defaults and coerces strings', () => {
    expect(normalizePolicy(null)).toEqual(DEFAULT_LOAN_POLICY);
    expect(normalizePolicy({ loanDays: '30', fineAmount: '10' })).toEqual({ loanDays: 30, fineAmount: 10 });
    expect(normalizePolicy({ loanDays: 0, fineAmount: -5 })).toEqual(DEFAULT_LOAN_POLICY);
  });
});
