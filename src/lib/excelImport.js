// Pure parsing for the Marathi/English book workbook. Takes the output of
// xlsx.utils.sheet_to_json(sheet, { header: 1 }) (array of row arrays).

const COLUMN_MATCHERS = {
  title: ['नाव', 'name', 'title'],
  author: ['लेखक', 'author'],
  bookNumber: ['नंबर', 'number'],
  price: ['किंमत', 'price'],
  contributor: ['भिशी', 'owner', 'contributor'],
};

// First row with more than one non-empty string cell is treated as the header.
export function findHeaderRow(rawData) {
  return rawData.findIndex(
    (row) => row && row.length > 1 && row.some((cell) => typeof cell === 'string' && cell.trim() !== '')
  );
}

export function mapColumns(headerRow) {
  const headers = headerRow.map((h) => (typeof h === 'string' ? h.toLowerCase().trim() : ''));
  const columns = {};
  for (const [field, needles] of Object.entries(COLUMN_MATCHERS)) {
    columns[field] = headers.findIndex((h) => needles.some((n) => h.includes(n)));
  }
  return columns;
}

function cell(row, idx) {
  if (idx === -1 || row[idx] === undefined || row[idx] === null || row[idx] === '') return '';
  return row[idx].toString().trim();
}

// Returns { books, skipped } where skipped counts rows dropped for a duplicate
// book number (against existingBookNumbers or earlier rows in the same sheet).
export function parseBookRows(rawData, existingBookNumbers = []) {
  const headerIndex = findHeaderRow(rawData);
  if (headerIndex === -1) throw new Error('Could not find any readable data in the Excel file.');

  const cols = mapColumns(rawData[headerIndex]);
  if (cols.title === -1) throw new Error('Could not find a title column (नाव / name / title).');

  const seen = new Set([...existingBookNumbers].filter(Boolean).map(String));
  const books = [];
  let skipped = 0;

  for (const row of rawData.slice(headerIndex + 1)) {
    if (!row || row.length === 0 || !cell(row, cols.title)) continue;

    const bookNumber = cell(row, cols.bookNumber);
    if (bookNumber) {
      if (seen.has(bookNumber)) {
        skipped++;
        continue;
      }
      seen.add(bookNumber);
    }

    books.push({
      bookNumber,
      title: cell(row, cols.title),
      author: cell(row, cols.author) || 'Unknown Author',
      price: cell(row, cols.price),
      contributor: cell(row, cols.contributor),
    });
  }

  return { books, skipped };
}
