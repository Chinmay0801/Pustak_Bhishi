import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const SETTINGS_DOC = "settings/global";

// Initialize default settings if they don't exist
export async function initializeGlobalSettings() {
  const settingsRef = doc(db, SETTINGS_DOC);
  const snap = await getDoc(settingsRef);
  
  if (!snap.exists()) {
    await setDoc(settingsRef, {
      libraryName: "Pustak Bhishi",
      maxBorrowDays: 30,
      contactNumber: "",
    });
  }
}

// Fetch Global Settings
export async function getGlobalSettings() {
  const settingsRef = doc(db, SETTINGS_DOC);
  const snap = await getDoc(settingsRef);
  return snap.exists() ? snap.data() : null;
}

// Update Global Settings (Admin)
export async function updateGlobalSettings(data) {
  const settingsRef = doc(db, SETTINGS_DOC);
  return setDoc(settingsRef, data, { merge: true });
}
