import { useState, useEffect } from 'react';
import { getBooks, deleteBook, borrowBook } from '../services/bookService';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, userProfile } = useAuth();
  
  async function fetchBooks() {
    try {
      setLoading(true);
      const booksList = await getBooks();
      setBooks(booksList);
    } catch (err) {
      console.error("Failed to load books:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBooks();
  }, []);

  async function handleDelete(bookId) {
    if (window.confirm("Are you sure you want to delete this book?")) {
      try {
        await deleteBook(bookId);
        fetchBooks();
      } catch (err) {
        console.error("Failed to delete book:", err);
        alert("Failed to delete book: " + err.message);
      }
    }
  }

  async function handleBorrow(book) {
    if (!window.confirm(`Do you want to borrow "${book.title}"?`)) return;
    
    try {
      await borrowBook(book.id, book.title, currentUser.uid, currentUser.email);
      alert("Book borrowed successfully!");
      fetchBooks(); // refresh UI
    } catch (err) {
      console.error("Failed to borrow book:", err);
      alert("Failed to borrow book: " + err.message);
    }
  }

  return (
    <div className="max-w-7xl p-6 mx-auto">
      <h1 className="mb-8 text-3xl font-bold text-gray-800">Library Catalog</h1>
      
      {loading && books.length === 0 ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 rounded-full animate-spin border-b-2 border-indigo-600"></div>
        </div>
      ) : books.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-lg shadow">
          <p className="text-gray-500">No books found in the library.</p>
          <p className="mt-2 text-sm text-gray-400">If you are an admin, go to the Admin tab to upload the Excel file.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {books.map(book => (
            <div key={book.id} className="relative flex flex-col p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              
              {userProfile?.isAdmin && (
                <button 
                  onClick={() => handleDelete(book.id)}
                  className="absolute top-2 right-2 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                  title="Delete Book"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              )}

              <div className="flex items-start justify-between mt-6">
                <span className="px-2 py-1 text-xs font-bold text-gray-500 bg-gray-100 rounded">
                  #{book.bookNumber || 'N/A'}
                </span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                  ${book.status === 'available' ? 'bg-green-100 text-green-800' :
                    book.status === 'borrowed' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'}`}>
                  {book.status?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
              
              <h3 className="mt-3 text-lg font-bold text-gray-800 line-clamp-2">{book.title}</h3>
              <p className="mt-1 text-sm font-medium text-gray-600">{book.author}</p>
              
              <div className="pt-4 mt-auto mb-4 space-y-1 text-xs text-gray-500">
                {book.contributor && (
                  <p><span className="font-semibold text-gray-700">भिशी (Donor):</span> {book.contributor}</p>
                )}
                {book.price && (
                  <p><span className="font-semibold text-gray-700">किंमत (Price):</span> ₹{book.price}</p>
                )}
                {book.dateReceived && (
                  <p><span className="font-semibold text-gray-700">कधी (Date):</span> {book.dateReceived}</p>
                )}
              </div>

              {/* Borrow Button */}
              {book.status === 'available' ? (
                <button
                  onClick={() => handleBorrow(book)}
                  className="w-full px-4 py-2 mt-2 text-sm font-semibold text-white transition-colors bg-indigo-600 rounded hover:bg-indigo-700"
                >
                  Borrow Book
                </button>
              ) : book.borrowedByName ? (
                <div className="w-full px-4 py-2 mt-2 text-sm font-medium text-center text-yellow-800 bg-yellow-100 rounded">
                  Borrowed by {book.borrowedByName === currentUser.email ? 'You' : book.borrowedByName}
                </div>
              ) : (
                <div className="w-full px-4 py-2 mt-2 text-sm font-medium text-center text-gray-500 bg-gray-100 rounded">
                  Unavailable
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
