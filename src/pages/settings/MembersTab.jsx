import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { updateUserRole, deleteUserDoc, addPendingInvite, deletePendingInvite } from '../../services/userService';
import { isContributedBy } from '../../lib/members';
import SectionTitle from './SectionTitle';
import { CARD, INPUT, BTN_PRIMARY } from './ui';

function Stat({ label, value, tone = '' }) {
  return (
    <div className="px-2 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-center">
      <p className={`text-base font-semibold ${tone || 'text-[var(--text-primary)]'}`}>{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
    </div>
  );
}

function MemberCard({ user, books, txns, isSelf, onResetPassword, onToggleAdmin, onDelete }) {
  const donated = books.filter(b => isContributedBy(b, user));
  const donatedOut = donated.filter(b => b.status === 'borrowed');
  const myTxns = txns.filter(t => t.userId === user.uid);
  const active = myTxns.filter(t => !t.isReturned);
  const finesDue = myTxns.reduce((s, t) => s + (t.fineDue || 0), 0);
  const timesLent = txns.filter(t => donated.some(b => b.id === t.bookId)).length;

  return (
    <div className="p-4 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-xl">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--text-primary)] truncate">{user.displayName || 'No Name'}</p>
          <p className="text-xs text-[var(--text-muted)] truncate">📞 {user.phoneNumber || 'No phone'} · {user.email}</p>
        </div>
        <span className={`shrink-0 px-2 py-1 text-[10px] font-bold rounded-full border ${user.isAdmin ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-400 dark:border-indigo-800/40' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] border-[var(--border-strong)]'}`}>
          {user.isAdmin ? 'Admin' : 'Member'}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        <Stat label="Donated" value={donated.length} />
        <Stat label="Times lent" value={timesLent} />
        <Stat label="Borrowed" value={`${active.length}/${myTxns.length}`} />
        <Stat label="Fine due" value={`₹${finesDue}`} tone={finesDue > 0 ? 'text-red-600 dark:text-red-400' : ''} />
      </div>

      {active.length > 0 && (
        <div className="mb-3 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Currently reading</p>
          {active.map(t => {
            const book = books.find(b => b.id === t.bookId);
            return (
              <p key={t.id} className="text-xs text-[var(--text-muted)] border-l-2 border-emerald-500/60 pl-2">
                <span className="font-medium text-[var(--text-secondary)]">{t.bookTitle}</span>
                <span className="italic ml-1">(from {book?.contributor || 'Library'})</span>
                {t.isOverdue && <span className="ml-1 font-semibold text-red-600 dark:text-red-400">overdue</span>}
              </p>
            );
          })}
        </div>
      )}

      {donatedOut.length > 0 && (
        <div className="mb-3 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Their books out on loan</p>
          {donatedOut.map(b => (
            <p key={b.id} className="text-xs text-[var(--text-muted)] border-l-2 border-amber-500/60 pl-2">
              <span className="font-medium text-[var(--text-secondary)]">{b.title}</span>
              <span className="italic ml-1">→ {b.borrowedByName || 'a member'}</span>
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
        <button onClick={() => onResetPassword(user.email)} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500">Reset Pass</button>
        {!isSelf && (
          <>
            <span className="text-[var(--border-strong)]">·</span>
            <button onClick={() => onToggleAdmin(user.uid, user.isAdmin)} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
              {user.isAdmin ? 'Revoke Admin' : 'Make Admin'}
            </button>
            <span className="text-[var(--border-strong)]">·</span>
            <button onClick={() => onDelete(user.uid, user.email)} className="text-xs font-semibold text-red-600 dark:text-red-500 hover:text-red-500">Remove</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function MembersTab({ admin }) {
  const { currentUser } = useAuth();
  const { users, books, txns, invites, loading, reload } = admin;
  const [newInviteName, setNewInviteName] = useState('');
  const [newInvitePhone, setNewInvitePhone] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleResetPassword(email) {
    if (!window.confirm(`Send password reset email to ${email}?`)) return;
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent successfully.");
    } catch (err) {
      alert("Error sending email: " + err.message);
    }
  }

  async function handleToggleAdmin(uid, currentStatus) {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'revoke' : 'grant'} Admin privileges?`)) return;
    try {
      await updateUserRole(uid, !currentStatus);
      reload();
    } catch (err) {
      alert("Failed to update role: " + err.message);
    }
  }

  async function handleDeleteMember(uid, email) {
    if (!window.confirm(`CRITICAL WARNING: Are you absolutely sure you want to permanently delete the profile for ${email}? This action cannot be undone.`)) return;
    try {
      await deleteUserDoc(uid);
      reload();
    } catch (err) {
      alert("Failed to delete member: " + err.message);
    }
  }

  async function handleAddInvite(e) {
    e.preventDefault();
    if (!newInviteName.trim() || !newInvitePhone.trim()) return;
    setBusy(true);
    try {
      await addPendingInvite(newInviteName.trim(), newInvitePhone.trim());
      setNewInviteName('');
      setNewInvitePhone('');
      await reload();
    } catch (err) {
      alert("Error adding invite: " + err.message);
    }
    setBusy(false);
  }

  async function handleDeleteInvite(id) {
    if (!window.confirm("Delete this pending invite?")) return;
    setBusy(true);
    try {
      await deletePendingInvite(id);
      await reload();
    } catch (err) {
      alert("Error deleting invite: " + err.message);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <div className={CARD}>
        <SectionTitle>Registered Member List</SectionTitle>
        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {users.map(user => (
              <MemberCard
                key={user.uid}
                user={user}
                books={books}
                txns={txns}
                isSelf={user.uid === currentUser.uid}
                onResetPassword={handleResetPassword}
                onToggleAdmin={handleToggleAdmin}
                onDelete={handleDeleteMember}
              />
            ))}
          </div>
        )}
      </div>

      <div className={CARD}>
        <SectionTitle>Pre-Registered Members Setup</SectionTitle>
        <form onSubmit={handleAddInvite} className="flex flex-col md:flex-row gap-3 mb-5">
          <input type="text" placeholder="Full Name" value={newInviteName} onChange={(e) => setNewInviteName(e.target.value)} className={`${INPUT} flex-1`} required />
          <input type="tel" placeholder="Phone Number" value={newInvitePhone} onChange={(e) => setNewInvitePhone(e.target.value)} className={`${INPUT} flex-1`} required />
          <button type="submit" disabled={busy || loading} className={BTN_PRIMARY}>Add Invite</button>
        </form>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {invites.map(invite => (
            <div key={invite.id} className="p-4 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-xl relative group">
              <p className="font-bold text-[var(--text-primary)] text-sm">{invite.name}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{invite.phone}</p>
              <button onClick={() => handleDeleteInvite(invite.id)} disabled={busy} className="absolute right-3 top-3 text-[var(--text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold">✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
