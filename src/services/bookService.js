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
} from "firebase/firestore";
import { db } from "../firebase";

const BOOKS_COLLECTION = "books";
const TRANSACTIONS_COLLECTION = "transactions";

// Helper for dynamic read-time fine calculation
function attachFineCalculations(data) {
  if (!data.borrowedAt || data.isReturned || data.finePaid) {
    return { ...data, daysBorrowed: 0, isOverdue: false, fineDue: 0 };
  }
  
  const borrowedDate = data.borrowedAt.toDate ? data.borrowedAt.toDate() : new Date(data.borrowedAt);
  const diffTime = new Date() - borrowedDate;
  const daysBorrowed = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
  
  // Flat ₹20 fine if crossed 90 days.
  const isOverdue = daysBorrowed > 90;
  const fineDue = isOverdue ? 20 : 0;
  
  return { ...data, daysBorrowed, isOverdue, fineDue };
}

// Add a new book
export async function addBook(bookData) {
  return addDoc(collection(db, BOOKS_COLLECTION), {
    ...bookData,
    createdAt: serverTimestamp(),
  });
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
  const chunks = [];
  // Firestore limit is 500 writes per batch
  for (let i = 0; i < bookIds.length; i += 500) {
    chunks.push(bookIds.slice(i, i + 500));
  }

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((id) => {
      const bookRef = doc(db, BOOKS_COLLECTION, id);
      batch.delete(bookRef);
    });
    await batch.commit();
  }
}

// Borrow a book
export async function borrowBook(bookId, bookTitle, userId, userName) {
  // 1. Update book status
  await updateBook(bookId, {
    status: "borrowed",
    borrowedBy: userId,
    borrowedByName: userName,
    borrowedAt: serverTimestamp(),
  });

  // 2. Create transaction record
  return addDoc(collection(db, TRANSACTIONS_COLLECTION), {
    bookId,
    bookTitle,
    userId,
    userName,
    borrowedAt: serverTimestamp(),
    returnedAt: null,
    isReturned: false,
  });
}

// Return a book AND automatically clear fine if one existed
export async function returnBook(bookId, transactionId) {
  // 1. Update book status back to available
  await updateBook(bookId, {
    status: "available",
    borrowedBy: null,
    borrowedByName: null,
    borrowedAt: null,
  });

  // 2. Mark transaction as returned and perfectly settled
  const transactionRef = doc(db, TRANSACTIONS_COLLECTION, transactionId);
  return updateDoc(transactionRef, {
    isReturned: true,
    finePaid: true, // Clears the record so it doesn't surface as a pending debt
    returnedAt: serverTimestamp(),
  });
}

// Get active transactions (for a specific user or all if userId is omitted)
export async function getActiveTransactions(userId = null) {
  let q;
  if (userId) {
    q = query(
      collection(db, TRANSACTIONS_COLLECTION),
      where("userId", "==", userId),
      where("isReturned", "==", false),
      orderBy("borrowedAt", "desc")
    );
  } else {
    // Admin query
    q = query(
      collection(db, TRANSACTIONS_COLLECTION),
      where("isReturned", "==", false),
      orderBy("borrowedAt", "desc")
    );
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => attachFineCalculations({ id: doc.id, ...doc.data() }));
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
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Get ALL transactions (returned and active) for Admin Export
export async function getAllTransactions() {
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    orderBy("borrowedAt", "desc")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => attachFineCalculations({ id: doc.id, ...doc.data() }));
}
