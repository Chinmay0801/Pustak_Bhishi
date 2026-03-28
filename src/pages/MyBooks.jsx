import { useState, useEffect } from 'react';
import { getActiveTransactions, returnBook } from '../services/bookService';
import { useAuth } from '../context/AuthContext';

export default function MyBooks() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  async function fetchMyBooks() {
    try {
      setLoading(true);
      setError(null);
      const data = await getActiveTransactions(currentUser.uid);
      setTransactions(data);
    } catch (err) {
      console.error("Failed to load my books:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMyBooks();
  }, [currentUser]);

  function formatDate(value) {
    if (!value) return 'N/A';
    const date = value.toDate ? value.toDate() : new Date(value);
    return date.toLocaleDateString();
  }

  async function handleReturn(transaction) {
    if (!window.confirm(`Are you sure you want to return "${transaction.bookTitle}"?`)) return;
    
    try {
      await returnBook(transaction.bookId, transaction.id);
      alert("Book returned successfully!");
      fetchMyBooks();
    } catch (err) {
      console.error("Failed to return book:", err);
      alert("Failed to return book: " + err.message);
    }
  }

  return (
    <div className="max-w-4xl p-6 mx-auto mt-8 bg-white rounded-lg shadow-md text-gray-900">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">My Borrowed Books</h1>
      
      {error ? (
        <div className="p-6 text-red-700 bg-red-100 rounded-lg border border-red-200">
          <h3 className="font-bold text-lg mb-2">Firestore Database Error</h3>
          <p className="mb-2">Firebase requires a "Composite Index" to run this page's search query.</p>
          <p className="text-sm font-mono break-all bg-white p-3 rounded">{error}</p>
          <p className="mt-4 text-sm font-bold text-indigo-700">Action Required: Copy the URL seen in the error message above, paste it in your browser, and click "Create Index" in the Firebase Console. Then come back and refresh.</p>
        </div>
      ) : loading && transactions.length === 0 ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 rounded-full animate-spin border-b-2 border-indigo-600"></div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600">You don't have any borrowed books right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map(txn => (
            <div key={txn.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4 sm:mb-0">
                <h3 className="text-xl font-semibold text-gray-800">{txn.bookTitle}</h3>
                <div className="flex flex-col mt-1 space-y-1">
                  <p className="text-sm text-gray-500">
                    Borrowed on: {txn.borrowedAt ? new Date(txn.borrowedAt.toDate()).toLocaleDateString() : 'Unknown'}
                  </p>
                  {txn.dueDate && (
                    <p className="text-sm text-gray-500">
                      Due by: {new Date(txn.dueDate.toDate()).toLocaleDateString()}
                    </p>
                  )}
                  {txn.fineDue > 0 && (
                    <p className="text-sm font-bold text-red-600">
                      Fine: ₹{txn.fineDue} (Overdue)
                    </p>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => handleReturn(txn)}
                className="px-6 py-2 text-sm font-semibold text-white transition-colors bg-green-600 rounded-md hover:bg-green-700 whitespace-nowrap"
              >
                Return Book
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
