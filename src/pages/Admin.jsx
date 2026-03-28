import { useState, useEffect } from 'react';
import { addBook, getActiveTransactions, returnBook, getBooks, bulkDeleteBooks } from '../services/bookService';
import * as xlsx from 'xlsx';

const SAMPLE_BOOKS = [
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald", status: "available" },
  { title: "To Kill a Mockingbird", author: "Harper Lee", status: "borrowed" },
  { title: "1984", author: "George Orwell", status: "available" },
  { title: "Pride and Prejudice", author: "Jane Austen", status: "repair" },
  { title: "The Catcher in the Rye", author: "J.D. Salinger", status: "available" }
];

export default function Admin() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  
  const [activeBorrows, setActiveBorrows] = useState([]);
  const [borrowsLoading, setBorrowsLoading] = useState(true);
  const [borrowsError, setBorrowsError] = useState(null);

  const [libraryBooks, setLibraryBooks] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  async function fetchLibraryBooks() {
    try {
      setLibraryLoading(true);
      const data = await getBooks();
      setLibraryBooks(data);
      setSelectedIds([]);
    } catch (err) {
      console.error("Failed to load catalog:", err);
    } finally {
      setLibraryLoading(false);
    }
  }

  async function fetchActiveBorrows() {
    try {
      setBorrowsLoading(true);
      setBorrowsError(null);
      const data = await getActiveTransactions(); // No userId = fetch all
      setActiveBorrows(data);
    } catch (err) {
      console.error("Failed to load active borrows:", err);
      setBorrowsError(err.message);
    } finally {
      setBorrowsLoading(false);
    }
  }

  useEffect(() => {
    fetchActiveBorrows();
    fetchLibraryBooks();
  }, []);

  async function handleAddSampleBooks() {
    setLoading(true);
    setMessage('');
    try {
      for (const book of SAMPLE_BOOKS) {
        await addBook(book);
      }
      setMessage('Successfully added sample books!');
      fetchActiveBorrows();
      fetchLibraryBooks();
    } catch (err) {
      setMessage('Error adding books: ' + err.message);
    }
    setLoading(false);
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setMessage('Parsing Excel file...');
    setProgress(0);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = xlsx.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Read the excel data (skipping the first row because it has headers)
        const jsonData = xlsx.utils.sheet_to_json(worksheet);
        
        setMessage(`Uploading ${jsonData.length} books...`);
        let importedCount = 0;

        for (const row of jsonData) {
          const bookData = {
            bookNumber: row['नंबर']?.toString() || '',
            title: row['पुस्तकाचे नाव'] || 'Unknown Title',
            author: row['लेखकाचे नाव'] || 'Unknown Author',
            price: row['किंमत']?.toString() || '',
            contributor: row['कोणाची भिशी'] || '',
            dateReceived: row['कधी']?.toString() || '',
            status: 'available',
          };

          if (!bookData.title && !bookData.author && !bookData.bookNumber) continue;

          await addBook(bookData);
          importedCount++;
          setProgress(Math.round((importedCount / jsonData.length) * 100));
        }

        setMessage(`Successfully imported ${importedCount} books!`);
        fetchLibraryBooks();
      } catch (err) {
        setMessage('Error parsing or uploading file: ' + err.message);
      }
      setLoading(false);
    };

    reader.readAsArrayBuffer(file);
    e.target.value = null; // reset input
  }

  async function handleAdminReturn(transaction) {
    if (!window.confirm(`Are you sure you want to mark "${transaction.bookTitle}" as returned?`)) return;
    
    try {
      await returnBook(transaction.bookId, transaction.id);
      alert("Book marked as returned successfully!");
      fetchActiveBorrows();
    } catch (err) {
      console.error("Failed to process return:", err);
      alert("Failed to return book: " + err.message);
    }
  }

  function toggleSelection(id) {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === libraryBooks.length && libraryBooks.length > 0) {
      setSelectedIds([]); // Deselect all
    } else {
      setSelectedIds(libraryBooks.map(b => b.id)); // Select all
    }
  }

  async function executeBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`WARNING: You are about to permanently delete ${selectedIds.length} books.\n\nThis cannot be undone. Are you absolutely sure?`)) return;

    setBulkDeleting(true);
    try {
      await bulkDeleteBooks(selectedIds);
      alert(`Successfully deleted ${selectedIds.length} books.`);
      fetchLibraryBooks();
      fetchActiveBorrows(); // refresh just in case
    } catch (err) {
      alert("Error deleting books: " + err.message);
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div className="max-w-6xl p-6 mx-auto mt-8 bg-white rounded-lg shadow-md">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Bulk Import Section */}
        <div className="p-6 border border-gray-200 rounded-lg">
          <h2 className="mb-4 text-xl font-semibold">Bulk Import (Excel)</h2>
          <p className="mb-4 text-sm text-gray-600">
            Select the <code className="px-1 bg-gray-100 rounded">Books_Data.xlsx</code> file containing the Marathi records.
          </p>
          
          <div className="mt-4">
            <label className="block p-4 mt-2 text-center border-2 border-indigo-200 border-dashed rounded-md cursor-pointer hover:bg-indigo-50">
              <span className="text-sm font-medium text-indigo-600">Choose Excel File</span>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                onChange={handleFileUpload}
                disabled={loading}
                className="hidden" 
              />
            </label>
          </div>
          
          {loading && progress > 0 && (
            <div className="w-full mt-4 bg-gray-200 rounded-full h-2.5">
              <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          )}

          {message && (
            <p className="mt-4 text-sm font-medium text-indigo-600">{message}</p>
          )}
        </div>

        {/* Dummy Data Section */}
        <div className="p-6 border border-gray-200 rounded-lg">
          <h2 className="mb-4 text-xl font-semibold">Test Data</h2>
          <p className="mb-4 text-sm text-gray-600">
            Load initial dummy data into the Firestore database for testing purposes.
          </p>
          
          <button
            onClick={handleAddSampleBooks}
            disabled={loading}
            className="w-full px-4 py-3 font-bold text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading && progress === 0 ? 'Adding Books...' : 'Add Sample Books'}
          </button>
        </div>
      </div>

      {/* Admin Return Management */}
      <div className="p-6 mt-8 border border-gray-200 rounded-lg">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">Active Borrowed Books (Library Wide)</h2>
        <p className="mb-4 text-sm text-gray-600">
          Monitor all books currently checked out by members. Process physical returns here.
        </p>

        {borrowsError ? (
          <div className="p-6 text-red-700 bg-red-100 rounded-lg border border-red-200">
            <h3 className="font-bold text-lg mb-2">Firestore Database Error</h3>
            <p className="mb-2">Firebase requires a "Composite Index" to run this page's search query.</p>
            <p className="text-sm font-mono break-all bg-white p-3 rounded">{borrowsError}</p>
            <p className="mt-4 text-sm font-bold text-indigo-700">Action Required: Copy the URL seen in the error message above, paste it in your browser, and click "Create Index" in the Firebase Console. Then come back and refresh.</p>
          </div>
        ) : borrowsLoading ? (
          <div className="py-4 text-sm text-gray-500">Loading active borrows...</div>
        ) : activeBorrows.length === 0 ? (
          <div className="py-8 text-center bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-600">There are no actively borrowed books right now.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Borrowed By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Borrowed Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fine</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeBorrows.map(txn => (
                  <tr key={txn.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{txn.bookTitle}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{txn.userName || txn.userId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {txn.borrowedAt ? new Date(txn.borrowedAt.toDate()).toLocaleDateString() : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {txn.dueDate ? new Date(txn.dueDate.toDate()).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                      {txn.fineDue > 0 ? (
                        <span className="text-red-600">₹{txn.fineDue}</span>
                      ) : (
                        <span className="text-green-600">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleAdminReturn(txn)}
                        className="text-indigo-600 hover:text-indigo-900 font-semibold"
                      >
                        Mark Returned
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Manage Catalog */}
      <div className="p-6 mt-8 border border-gray-200 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Library Catalog (Bulk Manage)</h2>
            <p className="text-sm text-gray-600">
              Select multiple books to delete them permanently from the database.
            </p>
          </div>
          <button
            onClick={executeBulkDelete}
            disabled={selectedIds.length === 0 || bulkDeleting}
            className={`mt-4 sm:mt-0 px-4 py-2 font-bold text-white transition-colors rounded whitespace-nowrap ${
              selectedIds.length === 0
                ? 'bg-red-300 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.length})`}
          </button>
        </div>

        {libraryLoading ? (
          <div className="py-4 text-sm text-gray-500">Loading catalog...</div>
        ) : libraryBooks.length === 0 ? (
          <div className="py-8 text-center bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-600">The library is currently empty.</p>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[600px] border border-gray-200 rounded-md">
            <table className="min-w-full divide-y divide-gray-200 relative">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                      checked={selectedIds.length === libraryBooks.length && libraryBooks.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {libraryBooks.map(book => (
                  <tr 
                    key={book.id} 
                    className={`hover:bg-gray-50 ${selectedIds.includes(book.id) ? 'bg-indigo-50' : ''}`}
                    onClick={() => toggleSelection(book.id)}
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                        checked={selectedIds.includes(book.id)}
                        onChange={() => toggleSelection(book.id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      #{book.bookNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs truncate">
                      {book.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {book.author}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                        ${book.status === 'available' ? 'bg-green-100 text-green-800' :
                          book.status === 'borrowed' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'}`}>
                        {book.status?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
