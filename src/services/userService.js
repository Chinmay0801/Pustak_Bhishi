import { collection, doc, updateDoc, setDoc, getDoc, getDocs, deleteDoc, query, where, limit, addDoc, runTransaction, writeBatch, serverTimestamp } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db, auth } from "../firebase";

const USERS_COLLECTION = "users";
const BOOTSTRAP_DOC = "settings/bootstrap";

async function syncAuthDisplayName(uid, displayName) {
  if (displayName && auth.currentUser && auth.currentUser.uid === uid) {
    await updateProfile(auth.currentUser, { displayName });
  }
}

// Get all users (Admin only)
export async function getAllUsers() {
  const q = query(collection(db, USERS_COLLECTION));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
}

// Update User Profile (Firestore + Firebase Auth). Never changes isAdmin —
// roles go through updateUserRole / bootstrapFirstAdmin.
export async function updateUserProfile(uid, data) {
  // eslint-disable-next-line no-unused-vars
  const { isAdmin, ...profile } = data;
  const userRef = doc(db, USERS_COLLECTION, uid);
  await setDoc(userRef, profile, { merge: true });
  await syncAuthDisplayName(uid, profile.displayName);
}

// Update User Role (Admin only)
export async function updateUserRole(uid, isAdmin) {
  const userRef = doc(db, USERS_COLLECTION, uid);
  return updateDoc(userRef, { isAdmin });
}

// Delete User Document (Admin only - note this does not delete the Auth record due to client SDK limits, requires Cloud Functions for full deletion)
export async function deleteUserDoc(uid) {
  const userRef = doc(db, USERS_COLLECTION, uid);
  return deleteDoc(userRef);
}

// --- FIRST-ADMIN BOOTSTRAP ---
// The settings/bootstrap marker records that the library already has an
// admin. Rules only allow a self-grant of isAdmin in the same batch that
// creates this marker, so the bootstrap path works exactly once.

export async function canBootstrapAdmin() {
  const marker = await getDoc(doc(db, BOOTSTRAP_DOC));
  if (marker.exists()) return false;
  const admins = await getDocs(query(collection(db, USERS_COLLECTION), where("isAdmin", "==", true), limit(1)));
  return admins.empty;
}

export async function bootstrapFirstAdmin(uid, profile) {
  const batch = writeBatch(db);
  batch.set(doc(db, USERS_COLLECTION, uid), { ...profile, isAdmin: true }, { merge: true });
  batch.set(doc(db, BOOTSTRAP_DOC), { by: uid, at: serverTimestamp() });
  await batch.commit();
  await syncAuthDisplayName(uid, profile.displayName);
}

// Called when an admin signs in, so libraries that had admins before the
// marker existed get it written and the bootstrap path closes.
export async function ensureBootstrapMarker(uid) {
  const ref = doc(db, BOOTSTRAP_DOC);
  const snap = await getDoc(ref);
  if (!snap.exists()) await setDoc(ref, { by: uid, at: serverTimestamp() });
}

// --- PENDING INVITES (Pre-registered Members) ---
const INVITES_COLLECTION = "pendingInvites";

export async function addPendingInvite(name, phone) {
  return addDoc(collection(db, INVITES_COLLECTION), {
    name: name,
    phone: phone,
    createdAt: new Date(),
  });
}

export async function getPendingInvites() {
  const snapshot = await getDocs(collection(db, INVITES_COLLECTION));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function deletePendingInvite(inviteId) {
  return deleteDoc(doc(db, INVITES_COLLECTION, inviteId));
}

// Claim an invite atomically: copy it into users/{uid} and delete it, failing
// if someone else claimed it first.
export async function claimInvite(uid, inviteId, extra = {}) {
  const inviteRef = doc(db, INVITES_COLLECTION, inviteId);
  let displayName;
  await runTransaction(db, async (t) => {
    const snap = await t.get(inviteRef);
    if (!snap.exists()) {
      throw new Error("Someone else just claimed this name. Please reload and pick again, or contact an admin.");
    }
    const { name, phone } = snap.data();
    displayName = name;
    t.set(doc(db, USERS_COLLECTION, uid), {
      ...extra,
      displayName: name,
      phoneNumber: extra.phoneNumber || phone,
      claimedInviteId: inviteId,
    }, { merge: true });
    t.delete(inviteRef);
  });
  await syncAuthDisplayName(uid, displayName);
}
