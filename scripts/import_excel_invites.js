import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc } from 'firebase/firestore';
import fs from 'fs';
import xlsx from 'xlsx';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
    env[key] = value;
  }
});

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
});

const db = getFirestore(app);

async function run() {
  const workbook = xlsx.readFile('./Data/Book_Data_final.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  const owners = new Set();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row && row[4]) owners.add(row[4].toString().trim());
  }

  const invitesRef = collection(db, 'pendingInvites');
  const existingDocs = await getDocs(invitesRef);
  const existingNames = new Set(existingDocs.docs.map(d => (d.data().name || '').toLowerCase()));

  let added = 0;
  for (const name of owners) {
    if (!name || name === 'Owner') continue;
    if (!existingNames.has(name.toLowerCase())) {
      await addDoc(invitesRef, { name, phone: '', createdAt: new Date() });
      added++;
      console.log('Added pending invite for:', name);
    }
  }
  console.log('Total added: ' + added + ' unique owners as pending invites.');
  process.exit(0);
}
run();
