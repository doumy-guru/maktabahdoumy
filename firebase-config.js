/**
 * Konfigurasi Firebase, Cloud Firestore, dan Firebase Authentication
 */

// Import SDK Firebase modular melalui CDN resmi Google
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// Konfigurasi Firebase project
export const firebaseConfig = {
  apiKey: "AIzaSyBjW9T-yz4kg6W97hcXZ1uWCdGnDSDTpUA",
  authDomain: "maktabahdoumy.firebaseapp.com",
  projectId: "maktabahdoumy",
  storageBucket: "maktabahdoumy.firebasestorage.app",
  messagingSenderId: "140772969230",
  appId: "1:140772969230:web:83eea7851afb205ee5a55f"
};

/**
 * Mengecek apakah konfigurasi Firebase valid dan bukan placeholder
 * @returns {boolean}
 */
export function isFirebaseConfigured() {
  return (
    Boolean(firebaseConfig.projectId) &&
    !firebaseConfig.projectId.includes("GANTI_DENGAN") &&
    Boolean(firebaseConfig.apiKey) &&
    !firebaseConfig.apiKey.includes("GANTI_DENGAN")
  );
}

// Inisialisasi Firebase, Firestore, dan Auth
let app = null;
let db = null;
let auth = null;
const googleProvider = new GoogleAuthProvider();

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("🔥 Firebase Cloud Firestore & Auth berhasil diinisialisasi.");
  } catch (error) {
    console.error("Gagal menginisialisasi Firebase:", error);
  }
} else {
  console.info("ℹ️ Firebase belum dikonfigurasi. Aplikasi berjalan dalam mode LocalStorage.");
}

export { 
  app,
  db, 
  auth,
  googleProvider,
  collection, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  serverTimestamp,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  updateProfile
};
