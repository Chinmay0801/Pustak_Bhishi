import { useState, useEffect, useMemo } from 'react';
import { getBooks, deleteBook, borrowBook } from '../services/bookService';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [donorFilter, setDonorFilter] = useState('all');
  const [borrowDate, setBorrowDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const { currentUser, userProfile } = useAuth();
  
  async function fetchBooks() {
    try {
      setLoading(true);
      const booksList = await getBooks();
      setBooks(booksList);
      setFilteredBooks(booksList);
    } catch (err) {
      console.error("Failed to load books:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    setFilteredBooks(books);
  }, [books]);

  function formatDate(value) {
    if (!value) return 'N/A';
    const date = value.toDate ? value.toDate() : new Date(value);
    return date.toLocaleDateString();
  }

  const donors = useMemo(() => {
    const names = books.map((book) => book.contributor).filter(Boolean);
    return ["all", ...Array.from(new Set(names))];
  }, [books]);

  function applyFilters() {
    const query = searchQuery.trim().toLowerCase();
    const result = books.filter((book) => {
      const matchesSearch = query === '' || [book.title, book.author, book.contributor, book.bookNumber]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(query));

      const matchesStatus = statusFilter === 'all' || book.status === statusFilter;
      const matchesDonor = donorFilter === 'all' || book.contributor === donorFilter;
      return matchesSearch && matchesStatus && matchesDonor;
    });
    setFilteredBooks(result);
  }

  function handleResetFilters() {
    setSearchQuery('');
    setStatusFilter('all');
    setDonorFilter('all');
    setFilteredBooks(books);
  }

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
      const borrowerName = userProfile?.displayName || currentUser.email;
      await borrowBook(book.id, book.title, currentUser.uid, borrowerName, borrowDate);
      alert("Book borrowed successfully!");
      fetchBooks(); // refresh UI
    } catch (err) {
      console.error("Failed to borrow book:", err);
      alert("Failed to borrow book: " + err.message);
    }
  }

  return (
    <div className="max-w-7xl p-6 mx-auto pb-24">
      <h1 className="mb-8 text-3xl font-bold text-white">Library Catalog</h1>

      <div className="grid gap-6 p-6 mb-8 bg-gray-900 border border-gray-800 rounded-2xl shadow-xl md:grid-cols-4">
        <div className="md:col-span-1">
          <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Search Catalog</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              type="text"
              placeholder="Title, author, or #..."
              className="w-full pl-10 pr-4 py-3 bg-[#1e1e1e] border-0 rounded-xl text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-3 bg-[#1e1e1e] border-0 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option value="all">All Statuses</option>
            <option value="available">Available Only</option>
            <option value="borrowed">Borrowed Only</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Donated By</label>
          <select
            value={donorFilter}
            onChange={(e) => setDonorFilter(e.target.value)}
            className="w-full px-4 py-3 bg-[#1e1e1e] border-0 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            {donors.map((name) => (
              <option key={name} value={name}>{name === 'all' ? 'All Contributors' : name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Borrow Date</label>
          <input
            type="date"
            value={borrowDate}
            onChange={(e) => setBorrowDate(e.target.value)}
            className="w-full px-4 py-3 bg-[#1e1e1e] border-0 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div className="md:col-span-4 flex justify-between items-center pt-2">
          <div className="text-gray-500 text-xs font-medium">
            Showing {filteredBooks.length} of {books.length} books
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleResetFilters}
              className="px-6 py-2.5 text-sm font-bold text-gray-400 hover:text-white transition-colors"
            >
              Reset All
            </button>
            <button
              onClick={applyFilters}
              className="px-8 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transform hover:-translate-y-0.5 transition-all active:translate-y-0"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>

      {loading && filteredBooks.length === 0 ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 rounded-full animate-spin border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-lg shadow">
          <p className="text-gray-500">No matching books found.</p>
          <p className="mt-2 text-sm text-gray-400">Try a different query or reset the filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredBooks.map(book => (
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
                {book.status === 'borrowed' && book.borrowedAt && (
                  <p><span className="font-semibold text-gray-700">Borrowed on:</span> {formatDate(book.borrowedAt)}</p>
                )}
                {book.status === 'borrowed' && book.dueDate && (
                  <p><span className="font-semibold text-gray-700">Due by:</span> {formatDate(book.dueDate)}</p>
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
