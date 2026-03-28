import { collection, doc, updateDoc, getDocs, getDoc, deleteDoc, query } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db, auth } from "../firebase";

const USERS_COLLECTION = "users";

// Get all users (Admin only)
export async function getAllUsers() {
  const q = query(collection(db, USERS_COLLECTION));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
}

// Update User Profile (Firestore + Firebase Auth)
export async function updateUserProfile(uid, data) {
  // 1. Update Firestore doc
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, data);

  // 2. Try to sync Firebase Auth display name if it changed
  if (data.displayName && auth.currentUser && auth.currentUser.uid === uid) {
    await updateProfile(auth.currentUser, {
      displayName: data.displayName
    });
  }
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
