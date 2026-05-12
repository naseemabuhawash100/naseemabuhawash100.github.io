/**
 * Firebase Configuration for Talaea Kindergarten
 *
 * IMPORTANT: Replace the config values below with your actual Firebase project config.
 * You can find these in Firebase Console > Project Settings > General > Your apps
 */

// ── Firebase Config ──
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ── Initialize Firebase ──
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  limit
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ── Auth Functions ──

/**
 * Sign in with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<UserCredential>}
 */
export async function signIn(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
}

/**
 * Sign out current user
 * @returns {Promise<void>}
 */
export async function signOutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Listen to auth state changes
 * @param {Function} callback
 * @returns {Function} unsubscribe
 */
export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get current user
 * @returns {User|null}
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Create a new teacher account
 * @param {string} email
 * @param {string} password
 * @param {string} name
 * @param {string} role - 'manager' or 'teacher'
 * @param {string} subject - subject for teachers
 * @returns {Promise<Object>}
 */
export async function createTeacherAccount(email, password, name, role = 'teacher', subject = '') {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });

    // Save user data to Firestore
    await setDoc(doc(db, "users", userCredential.user.uid), {
      email,
      name,
      role,
      subject,
      createdAt: serverTimestamp(),
      active: true
    });

    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
}

// ── Firestore Functions ──

/**
 * Add a student to Firestore
 */
export async function addStudent(studentData) {
  try {
    const docRef = await addDoc(collection(db, "students"), {
      ...studentData,
      createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding student:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all students for a kindergarten
 */
export async function getStudents(kindergartenId = "kg_talaea") {
  try {
    const q = query(
      collection(db, "students"),
      where("kindergartenId", "==", kindergartenId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    const students = [];
    snapshot.forEach(doc => {
      students.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: students };
  } catch (error) {
    console.error("Error getting students:", error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Delete a student
 */
export async function deleteStudent(studentId) {
  try {
    await deleteDoc(doc(db, "students", studentId));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Add a result to Firestore
 */
export async function addResult(resultData) {
  try {
    const docRef = await addDoc(collection(db, "results"), {
      ...resultData,
      createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding result:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all results for a kindergarten
 */
export async function getResults(kindergartenId = "kg_talaea") {
  try {
    const q = query(
      collection(db, "results"),
      where("kindergartenId", "==", kindergartenId),
      orderBy("createdAt", "desc"),
      limit(500)
    );
    const snapshot = await getDocs(q);
    const results = [];
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: results };
  } catch (error) {
    console.error("Error getting results:", error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Get user data from Firestore
 */
export async function getUserData(uid) {
  try {
    const docSnap = await getDoc(doc(db, "users", uid));
    if (docSnap.exists()) {
      return { success: true, data: docSnap.data() };
    }
    return { success: false, error: "User not found" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get teacher data
 */
export async function getTeachers(kindergartenId = "kg_talaea") {
  try {
    const q = query(
      collection(db, "users"),
      where("kindergartenId", "==", kindergartenId),
      where("role", "==", "teacher")
    );
    const snapshot = await getDocs(q);
    const teachers = [];
    snapshot.forEach(doc => {
      teachers.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: teachers };
  } catch (error) {
    console.error("Error getting teachers:", error);
    return { success: false, error: error.message, data: [] };
  }
}

// ── Helpers ──

/**
 * Convert Firebase auth error code to Arabic message
 */
function getAuthErrorMessage(code) {
  const messages = {
    'auth/invalid-email': 'البريد الإلكتروني غير صالح',
    'auth/user-disabled': 'تم تعطيل حساب هذا المستخدم',
    'auth/user-not-found': 'لا يوجد حساب بهذا البريد الإلكتروني',
    'auth/wrong-password': 'كلمة المرور غير صحيحة',
    'auth/email-already-in-use': 'البريد الإلكتروني مستخدم بالفعل',
    'auth/weak-password': 'كلمة المرور ضعيفة جداً',
    'auth/operation-not-allowed': 'هذه العملية غير مسموحة',
    'auth/network-request-failed': 'خطأ في الاتصال بالإنترنت',
    'auth/too-many-requests': 'محاولات كثيرة جداً، يرجى المحاولة لاحقاً'
  };
  return messages[code] || 'حدث خطأ غير متوقع';
}

/**
 * Format Firestore timestamp to readable date
 */
export function formatDate(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isNaN(date)) return "";
  return date.toLocaleDateString("ar-EG", {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format date for display (short)
 */
export function formatShortDate(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isNaN(date)) return "";
  return date.toLocaleDateString("ar-EG");
}

// ── Export for CDN usage ──
// Make functions available globally for non-module scripts
if (typeof window !== 'undefined') {
  window.firebaseAuth = {
    signIn,
    signOutUser,
    onAuthStateChange,
    getCurrentUser,
    createTeacherAccount
  };

  window.firestore = {
    db,
    addStudent,
    getStudents,
    deleteStudent,
    addResult,
    getResults,
    getUserData,
    getTeachers,
    formatDate,
    formatShortDate
  };
}

export { db, auth, app };
