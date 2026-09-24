import { useState } from 'react';
import { addBook, addBooksBulk, returnBook, bulkDeleteBooks } from '../../services/bookService';
import { addPendingInvite } from '../../services/userService';
import { parseBookRows } from '../../lib/excelImport';
import { matchUserByName, normName } from '../../lib/members';
import SectionTitle from './SectionTitle';
import { CARD, INPUT, LABEL, BTN_PRIMARY, BTN_DANGER, STATUS_PILL, fmtDate } from './ui';

const EMPTY_BOOK = { title: '', author: '', bookNumber: '', price: '', contributor: '' };

function withContributorUid(book, users) {
  const user = book.contributor ? matchUserByName(book.contributor, users) : null;
  return user ? { ...book, contributorUid: user.uid } : book;
}

export default function BooksTab({ admin }) {
  const { books, txns, users, invites, loading, reload } = admin;

  const [importMessage, setImportMessage] = useState('');
  const [importProgress, setImportProgress] = useState(0);
  const [importLoading, setImportLoading] = useState(false);
  const [singleBook, setSingleBook] = useState(EMPTY_BOOK);
  const [addingSingleBook, setAddingSingleBook] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  async function handleAddSingleBook(e) {
    e.preventDefault();
    if (!singleBook.title.trim()) {
      alert("Book Title is required.");
      return;
    }

    const bookNumber = singleBook.bookNumber.trim();
    if (bookNumber && books.some(b => b.bookNumber === bookNumber)) {
      alert(`Error: Serial Number "${bookNumber}" is already assigned to a book! Please use a unique number.`);
      return;
    }

    setAddingSingleBook(true);
    try {
      await addBook(withContributorUid({ ...singleBook, bookNumber, status: 'available' }, users));
      alert(`Successfully added "${singleBook.title}"`);
      setSingleBook(EMPTY_BOOK);
      reload();
    } catch (err) {
      alert("Failed to add book: " + err.message);
    }
    setAddingSingleBook(false);
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    e.target.value = null; // reset input
    if (!file) return;

    setImportLoading(true);
    setImportMessage('Parsing Excel file...');
    setImportProgress(0);

    try {
      const xlsx = await import('xlsx');
      const workbook = xlsx.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

      const { books: parsed, skipped } = parseBookRows(rawData, books.map(b => b.bookNumber));
      const toAdd = parsed.map(b => withContributorUid({ ...b, status: 'available' }, users));

      setImportMessage(`Uploading ${toAdd.length} books...`);
      await addBooksBulk(toAdd, (done, total) => setImportProgress(Math.round((done / total) * 100)));

      setImportMessage('Extracting member profiles from Owner column...');
      const known = new Set([...users.map(u => normName(u.displayName)), ...invites.map(i => normName(i.name))]);
      let newInvitesCount = 0;
      for (const book of toAdd) {
        const key = normName(book.contributor);
        if (!key || known.has(key)) continue;
        known.add(key);
        await addPendingInvite(book.contributor.trim(), 'Loaded from Excel');
        newInvitesCount++;
      }

      setImportMessage(`Successfully imported ${toAdd.length} books & generated ${newInvitesCount} pre-registered accounts! ${skipped > 0 ? `(Skipped ${skipped} items due to duplicate serial numbers)` : ''}`);
      await reload();
    } catch (err) {
      setImportMessage('Error parsing or uploading file: ' + err.message);
    }
    setImportLoading(false);
  }

  async function handleAdminReturn(transaction) {
    const fineNote = transaction.fineDue > 0 ? ` The ₹${transaction.fineDue} fine will be marked as collected.` : '';
    if (!window.confirm(`Are you sure you want to mark "${transaction.bookTitle}" as returned?${fineNote}`)) return;
    try {
      await returnBook(transaction.bookId, transaction.id, { markFinePaid: true });
      alert("Book marked as returned successfully!");
      reload();
    } catch (err) {
      alert("Failed to return book: " + err.message);
    }
  }

  function toggleSelection(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  async function executeBulkDelete() {
    if (selectedIds.length === 0) return;
    const onLoan = books.filter(b => selectedIds.includes(b.id) && b.status === 'borrowed').length;
    const loanNote = onLoan > 0 ? `\n\n${onLoan} of them are currently borrowed — their loans stay open until returned from the Transactions page.` : '';
    if (!window.confirm(`WARNING: You are about to permanently delete ${selectedIds.length} books.${loanNote}\n\nThis cannot be undone. Are you absolutely sure?`)) return;

    setBulkDeleting(true);
    try {
      await bulkDeleteBooks(selectedIds);
      alert(`Successfully deleted ${selectedIds.length} books.`);
      setSelectedIds([]);
      reload();
    } catch (err) {
      alert("Failed to delete books: " + err.message);
    } finally {
      setBulkDeleting(false);
    }
  }

  const activeBorrows = txns.filter(t => !t.isReturned);
  const query = searchQuery.trim().toLowerCase();
  const filteredLibraryBooks = books.filter(book =>
    query === '' || [book.title, book.author, book.bookNumber]
      .filter(Boolean)
      .some(field => String(field).toLowerCase().includes(query))
  );
  const allSelected = selectedIds.length === filteredLibraryBooks.length && filteredLibraryBooks.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className={CARD}>
          <SectionTitle>Bulk Import (Excel)</SectionTitle>
          <p className="mb-4 text-sm text-[var(--text-secondary)]">
            Select the <code className="px-1.5 py-0.5 rounded bg-[var(--bg-surface-2)] text-[var(--text-secondary)]">.xlsx</code> file containing the book records.
          </p>
          <label className="block p-6 text-center border-2 border-dashed border-[var(--border-strong)] rounded-xl cursor-pointer hover:border-indigo-500/60 hover:bg-[var(--bg-surface-2)] transition-colors">
            <span className="text-2xl block mb-2">📤</span>
            <span className="text-sm font-semibold text-[var(--text-secondary)]">Choose Excel File</span>
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={importLoading} className="hidden" />
          </label>
          {importLoading && importProgress > 0 && (
            <div className="w-full mt-4 bg-[var(--bg-hover)] rounded-full h-2">
              <div className="bg-indigo-500 h-2 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
            </div>
          )}
          {importMessage && <p className="mt-4 text-sm font-medium text-indigo-600 dark:text-indigo-400">{importMessage}</p>}
        </div>

        <div className={CARD}>
          <SectionTitle>Add Single Book</SectionTitle>
          <form onSubmit={handleAddSingleBook} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Book Num</label>
                <input type="text" value={singleBook.bookNumber} onChange={e => setSingleBook({...singleBook, bookNumber: e.target.value})} className={INPUT} placeholder="#123" />
              </div>
              <div>
                <label className={LABEL}>Price</label>
                <input type="text" value={singleBook.price} onChange={e => setSingleBook({...singleBook, price: e.target.value})} className={INPUT} placeholder="₹100" />
              </div>
            </div>
            <div>
              <label className={LABEL}>Title*</label>
              <input type="text" value={singleBook.title} onChange={e => setSingleBook({...singleBook, title: e.target.value})} required className={INPUT} placeholder="The Alchemist" />
            </div>
            <div>
              <label className={LABEL}>Author</label>
              <input type="text" value={singleBook.author} onChange={e => setSingleBook({...singleBook, author: e.target.value})} className={INPUT} placeholder="Paulo Coelho" />
            </div>
            <div>
              <label className={LABEL}>Donated By / Owner</label>
              <input type="text" list="member-names" value={singleBook.contributor} onChange={e => setSingleBook({...singleBook, contributor: e.target.value})} className={INPUT} placeholder="Library / Member Name" />
              <datalist id="member-names">
                {users.filter(u => u.displayName).map(u => <option key={u.uid} value={u.displayName} />)}
              </datalist>
            </div>
            <button type="submit" disabled={addingSingleBook} className={`w-full ${BTN_PRIMARY}`}>
              {addingSingleBook ? 'Adding...' : '+ Push Book to Catalog'}
            </button>
          </form>
        </div>
      </div>

      <div className={CARD}>
        <SectionTitle>Active Borrowed Books (Process Returns)</SectionTitle>
        {loading ? (
          <div className="py-4 text-sm text-[var(--text-muted)]">Loading active borrows...</div>
        ) : activeBorrows.length === 0 ? (
          <div className="py-8 text-center rounded-xl border border-dashed border-[var(--border-strong)] text-[var(--text-muted)]">
            <p>There are no actively borrowed books right now.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--bg-surface-2)] border-b border-[var(--border)]">
                    {['Book Title', 'Borrowed By', 'Borrowed Date', 'Fine', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {activeBorrows.map(txn => (
                    <tr key={txn.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)] max-w-[220px] truncate">{txn.bookTitle}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{txn.userName || txn.userId}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap">{fmtDate(txn.borrowedAt)}</td>
                      <td className="px-4 py-3 font-bold">
                        {txn.fineDue > 0 ? <span className="text-red-600 dark:text-red-400">₹{txn.fineDue}</span> : <span className="text-[var(--text-muted)]">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleAdminReturn(txn)} className="px-3 py-1.5 text-[11px] font-bold text-white bg-emerald-700 rounded-lg hover:bg-emerald-600 transition-colors whitespace-nowrap">Mark Returned</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden space-y-3">
              {activeBorrows.map(txn => (
                <div key={txn.id} className="p-4 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-xl">
                  <p className="font-bold text-[var(--text-primary)] text-sm truncate">{txn.bookTitle}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">👤 {txn.userName || txn.userId}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">📅 {fmtDate(txn.borrowedAt)}</p>
                  {txn.fineDue > 0 && <p className="text-xs font-bold text-red-600 dark:text-red-400 mt-1">Fine: ₹{txn.fineDue}</p>}
                  <button onClick={() => handleAdminReturn(txn)} className="mt-3 w-full py-2 text-xs font-bold text-white bg-emerald-700 rounded-lg hover:bg-emerald-600 transition-colors">Mark Returned</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className={CARD}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <SectionTitle>Library Catalog (Bulk Manage)</SectionTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Find book to delete..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${INPUT} sm:w-56`}
            />
            <button
              onClick={executeBulkDelete}
              disabled={selectedIds.length === 0 || bulkDeleting}
              className={`whitespace-nowrap ${selectedIds.length === 0 ? 'px-4 py-2.5 text-sm font-bold text-white bg-red-300 dark:bg-red-900/50 rounded-xl opacity-50 cursor-not-allowed' : BTN_DANGER}`}
            >
              {bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.length})`}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-4 text-sm text-[var(--text-muted)]">Loading catalog...</div>
        ) : filteredLibraryBooks.length === 0 ? (
          <div className="py-8 text-center rounded-xl border border-dashed border-[var(--border-strong)] text-[var(--text-muted)]">No books found.</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-y-auto max-h-[600px] rounded-xl border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[var(--bg-surface-2)] border-b border-[var(--border)]">
                    <th className="px-4 py-3 text-left w-12">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => setSelectedIds(allSelected ? [] : filteredLibraryBooks.map(b => b.id))}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Num</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Title</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredLibraryBooks.map(book => (
                    <tr
                      key={book.id}
                      onClick={() => toggleSelection(book.id)}
                      className={`cursor-pointer transition-colors ${selectedIds.includes(book.id) ? 'bg-indigo-50 dark:bg-indigo-950/40' : 'hover:bg-[var(--bg-hover)]'}`}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.includes(book.id)} onChange={() => toggleSelection(book.id)} />
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">#{book.bookNumber || 'N/A'}</td>
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)] max-w-[280px] truncate">{book.title}</td>
                      <td className="px-4 py-3"><span className={STATUS_PILL(book.status)}>{book.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredLibraryBooks.map(book => (
                <div
                  key={book.id}
                  onClick={() => toggleSelection(book.id)}
                  className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${selectedIds.includes(book.id) ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800/50' : 'bg-[var(--bg-surface-2)] border-[var(--border)]'}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(book.id)}
                    onChange={() => toggleSelection(book.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{book.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">#{book.bookNumber || 'N/A'}</p>
                  </div>
                  <span className={`shrink-0 ${STATUS_PILL(book.status)}`}>{book.status}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
