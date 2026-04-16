import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";
import fs from "fs";
import path from "path";

// Manually parse .env since dotenv is not installed
const envPath = path.resolve(process.cwd(), ".env");
let envContent;
try {
  envContent = fs.readFileSync(envPath, "utf-8");
} catch (err) {
  console.error("Could not read .env file. Please ensure you are running this from the project root.");
  process.exit(1);
}

const env = {};
envContent.split("\n").forEach((line) => {
  const [key, ...value] = line.split("=");
  if (key && value) {
    env[key.trim()] = value.join("=").trim().replace(/^"|"$/g, "");
  }
});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function wipeCollection(collectionName) {
  console.log(`Fetching documents from '${collectionName}'...`);
  const snapshot = await getDocs(collection(db, collectionName));
  const docs = snapshot.docs;
  
  if (docs.length === 0) {
    console.log(`Collection '${collectionName}' is already empty.`);
    return;
  }

  console.log(`Found ${docs.length} documents. Preparing for bulk deletion in batches of 500...`);

  // Firestore batch limit is 500 operations
  const chunks = [];
  for (let i = 0; i < docs.length; i += 500) {
    chunks.push(docs.slice(i, i + 500));
  }

  let deletedCount = 0;
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((d) => {
      batch.delete(doc(db, collectionName, d.id));
    });
    await batch.commit();
    deletedCount += chunk.length;
    console.log(` -> Deleted ${deletedCount}/${docs.length} from '${collectionName}'`);
  }
}

async function wipeDatabase() {
  console.log("⚠️ STARTING DATABASE WIPE SCRIPT ⚠️");
  try {
    // Delete all books
    await wipeCollection("books");
    
    // Delete all transactions to clear pending fines and borrow histories
    await wipeCollection("transactions");
    
    console.log("\n✅ Database wiped completely and cleanly! All hooks have been reset.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal Error occurred while wiping database:", error);
    process.exit(1);
  }
}

wipeDatabase();
