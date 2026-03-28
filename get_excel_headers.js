import xlsx from 'xlsx';
const workbook = xlsx.readFile('./Data/Books_Data.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
console.log("Headers:", data[0]);
console.log("First row data:", data[1]);
