import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  writeBatch,
  runTransaction,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { getLoanPolicy } from "./settingsService";
import { computeDueDate, computeLoanStatus, fineAtReturn } from "../lib/loanPolicy";
import { matchUserByName } from "../lib/members";

const BOOKS_COLLECTION = "books";
const TRANSACTIONS_COLLECTION = "transactions";
const BATCH_LIMIT = 500;

async function withLoanStatus(docs) {
  const policy = await getLoanPolicy();
  return docs.map((d) => {
    const data = { id: d.id, ...d.data() };
    return { ...data, ...computeLoanStatus(data, policy) };
  });
}

// Add a new book
export async function addBook(bookData) {
  return addDoc(collection(db, BOOKS_COLLECTION), {
    ...bookData,
    createdAt: serverTimestamp(),
  });
}

// Add many books with batched writes (Excel import).
export async function addBooksBulk(books, onProgress) {
  let done = 0;
  for (let i = 0; i < books.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    books.slice(i, i + BATCH_LIMIT).forEach((book) => {
      batch.set(doc(collection(db, BOOKS_COLLECTION)), { ...book, createdAt: serverTimestamp() });
    });
    await batch.commit();
    done = Math.min(i + BATCH_LIMIT, books.length);
    onProgress?.(done, books.length);
  }
  return done;
}

// Get all books
export async function getBooks() {
  const q = query(collection(db, BOOKS_COLLECTION), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Update a book
export async function updateBook(bookId, updatedData) {
  const bookRef = doc(db, BOOKS_COLLECTION, bookId);
  return updateDoc(bookRef, updatedData);
}

// Delete a book
export async function deleteBook(bookId) {
  const bookRef = doc(db, BOOKS_COLLECTION, bookId);
  return deleteDoc(bookRef);
}

// Bulk delete books (handles arrays > 500 by chunking)
export async function bulkDeleteBooks(bookIds) {
  for (let i = 0; i < bookIds.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    bookIds.slice(i, i + BATCH_LIMIT).forEach((id) => {
      batch.delete(doc(db, BOOKS_COLLECTION, id));
    });
    await batch.commit();
  }
}

// Set contributorUid on books whose contributor name uniquely matches a member.
// Returns the number of books linked. Admin only (rules).
export async function linkContributors(books, users) {
  const updates = [];
  for (const book of books) {
    if (book.contributorUid || !book.contributor) continue;
    const user = matchUserByName(book.contributor, users);
    if (user) updates.push([book.id, user.uid]);
  }
  for (let i = 0; i < updates.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    updates.slice(i, i + BATCH_LIMIT).forEach(([id, uid]) => {
      batch.update(doc(db, BOOKS_COLLECTION, id), { contributorUid: uid });
    });
    await batch.commit();
  }
  return updates.length;
}

// Borrow a book. Runs as a Firestore transaction so two members can't borrow
// the same copy, and the book + transaction docs are written together.
export async function borrowBook(bookId, bookTitle, userId, userName, borrowDate = null) {
  const policy = await getLoanPolicy();
  const bDate = borrowDate ? new Date(borrowDate) : new Date();
  const borrowedAtTs = borrowDate ? Timestamp.fromDate(bDate) : serverTimestamp();
  const dueDateTs = Timestamp.fromDate(computeDueDate(bDate, policy));

  const bookRef = doc(db, BOOKS_COLLECTION, bookId);
  const txnRef = doc(collection(db, TRANSACTIONS_COLLECTION));

  await runTransaction(db, async (t) => {
    const snap = await t.get(bookRef);
    if (!snap.exists()) throw new Error("This book no longer exists.");
    if ((snap.data().status ?? "available") !== "available") {
      throw new Error("Someone just borrowed this book. Refresh to see the latest status.");
    }

    t.update(bookRef, {
      status: "borrowed",
      borrowedBy: userId,
      borrowedByName: userName,
      borrowedAt: borrowedAtTs,
      dueDate: dueDateTs,
      currentTransactionId: txnRef.id,
    });
    t.set(txnRef, {
      bookId,
      bookTitle,
      userId,
      userName,
      borrowedAt: borrowedAtTs,
      dueDate: dueDateTs,
      returnedAt: null,
      isReturned: false,
    });
  });

  return txnRef;
}

// Return a book. The fine owed at this moment is recorded on the transaction.
// Only an admin may pass markFinePaid (they collected the cash); a member's own
// return leaves any fine outstanding until an admin marks it paid.
export async function returnBook(bookId, transactionId, { markFinePaid = false } = {}) {
  const policy = await getLoanPolicy();
  const bookRef = doc(db, BOOKS_COLLECTION, bookId);
  const txnRef = doc(db, TRANSACTIONS_COLLECTION, transactionId);

  await runTransaction(db, async (t) => {
    const [txnSnap, bookSnap] = await Promise.all([t.get(txnRef), t.get(bookRef)]);
    if (!txnSnap.exists()) throw new Error("Borrow record not found.");
    const txn = txnSnap.data();
    if (txn.isReturned) throw new Error("This book has already been returned.");

    const fineAmount = fineAtReturn(txn, policy);

    // The book may have been deleted while on loan — still close the record.
    if (bookSnap.exists() && bookSnap.data().borrowedBy === txn.userId) {
      t.update(bookRef, {
        status: "available",
        borrowedBy: null,
        borrowedByName: null,
        borrowedAt: null,
        dueDate: null,
        currentTransactionId: null,
      });
    }
    t.update(txnRef, {
      isReturned: true,
      returnedAt: serverTimestamp(),
      fineAmount,
      finePaid: fineAmount === 0 || markFinePaid,
    });
  });
}

// Admin: record that an outstanding fine on a returned book was collected.
export async function markFinePaid(transactionId) {
  return updateDoc(doc(db, TRANSACTIONS_COLLECTION, transactionId), {
    finePaid: true,
    finePaidAt: serverTimestamp(),
  });
}

// Get active transactions (for a specific user or all if userId is omitted)
export async function getActiveTransactions(userId = null) {
  const filters = [where("isReturned", "==", false)];
  if (userId) filters.unshift(where("userId", "==", userId));
  const q = query(collection(db, TRANSACTIONS_COLLECTION), ...filters, orderBy("borrowedAt", "desc"));
  const snapshot = await getDocs(q);
  return withLoanStatus(snapshot.docs);
}

// Get historic past transactions for a specific user
export async function getPastTransactions(userId) {
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where("userId", "==", userId),
    where("isReturned", "==", true),
    orderBy("returnedAt", "desc")
  );
  const snapshot = await getDocs(q);
  return withLoanStatus(snapshot.docs);
}

// Get ALL transactions (returned and active) for Admin Export
export async function getAllTransactions() {
  const q = query(collection(db, TRANSACTIONS_COLLECTION), orderBy("borrowedAt", "desc"));
  const snapshot = await getDocs(q);
  return withLoanStatus(snapshot.docs);
}
