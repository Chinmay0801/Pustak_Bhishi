import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore";
import fs from "fs";
import path from "path";

// Manually parse .env since dotenv is not installed
const envPath = path.resolve(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
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

const members = [
  { name: "Ashwini Phadake", phone: "96739 94943" },
  { name: "Sujata Bhave", phone: "98815 65979" },
  { name: "Shreya Bedekar", phone: "98602 70404" },
  { name: "Yogita Deshpande", phone: "9922810630" },
  { name: "Vaishali Ubhe", phone: "98228 44185" },
  { name: "Radhika Kondejkar", phone: "90110 62763" },
  { name: "Sanika Aavalaskar", phone: "99232 79494" },
  { name: "Suvarna Khadilkar", phone: "98226 19887" },
  { name: "Mihika Bhat", phone: "98501 00671" },
  { name: "Sunita Wagh", phone: "98505 25990" },
  { name: "Sunita Nashikkar", phone: "98221 99111" },
  { name: "Manisha Deshpande", phone: "90110 63570" },
  { name: "Neha Gogate", phone: "96236 63571" },
  { name: "Sucheta Kulkarni", phone: "99229 01972" },
  { name: "Manasi Dhotre", phone: "95112 29763" },
  { name: "Madhura Gaydhani", phone: "94220 59258" },
  { name: "Jyotsna Chaudhuri", phone: "98227 99493" },
  { name: "Amruta Jog", phone: "98230 74238" },
  { name: "Padmashree Risbud", phone: "93710 21235" },
];

async function importMembers() {
  console.log("Starting member import...");
  const invitesRef = collection(db, "pendingInvites");

  for (const member of members) {
    // Check if member already exists by phone
    const q = query(invitesRef, where("phone", "==", member.phone));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      await addDoc(invitesRef, {
        name: member.name,
        phone: member.phone,
        createdAt: new Date(),
      });
      console.log(`✅ Added: ${member.name}`);
    } else {
      console.log(`⏩ Skipped (Already exists): ${member.name}`);
    }
  }
  console.log("Import finished.");
  process.exit(0);
}

importMembers().catch((err) => {
  console.error("❌ Error importing members:", err);
  process.exit(1);
});
