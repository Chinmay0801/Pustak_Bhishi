import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_LOAN_POLICY, normalizePolicy } from "../lib/loanPolicy";

const SETTINGS_DOC = "settings/global";

// Initialize default settings if they don't exist
export async function initializeGlobalSettings() {
  const settingsRef = doc(db, SETTINGS_DOC);
  const snap = await getDoc(settingsRef);

  if (!snap.exists()) {
    await setDoc(settingsRef, {
      libraryName: "Pustak Bhishi",
      contactNumber: "",
      ...DEFAULT_LOAN_POLICY,
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
  await setDoc(settingsRef, data, { merge: true });
  policyPromise = null;
}

// Loan period + fine amount, cached for the session.
let policyPromise = null;
export function getLoanPolicy() {
  if (!policyPromise) {
    policyPromise = getGlobalSettings()
      .then(normalizePolicy)
      .catch((err) => {
        console.error("Failed to load loan policy, using defaults", err);
        policyPromise = null;
        return { ...DEFAULT_LOAN_POLICY };
      });
  }
  return policyPromise;
}
