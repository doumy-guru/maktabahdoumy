/**
 * Konfigurasi Firebase & Cloud Firestore
 *
 * PANDUAN PENGISIAN:
 * 1. Buka Firebase Console (https://console.firebase.google.com/)
 * 2. Buat Project baru atau pilih project yang sudah ada.
 * 3. Tambahkan Web App (ikon </>) lalu salin objek `firebaseConfig` ke bawah ini.
 * 4. Aktifkan Cloud Firestore di menu "Build > Firestore Database" (Pilih Start in Test Mode).
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

// Salin konfigurasi Firebase project Anda di sini:
export const firebaseConfig = {
  apiKey: "AIzaSyBjW9T-yz4kg6W97hcXZ1uWCdGnDSDTpUA",
  authDomain: "maktabahdoumy.firebaseapp.com",
  projectId: "maktabahdoumy",
  storageBucket: "maktabahdoumy.firebasestorage.app",
  messagingSenderId: "140772969230",
  appId: "1:140772969230:web:83eea7851afb205ee5a55f"
};

/**
 * Mengecek apakah pengguna telah mengisi konfigurasi Firebase yang valid
 * @returns {boolean}
 */
export function isFirebaseConfigured() {
  return (
    Boolean(firebaseConfig.projectId) &&
    firebaseConfig.projectId !== "maktabahdoumy" &&
    Boolean(firebaseConfig.apiKey) &&
    firebaseConfig.apiKey !== "AIzaSyBjW9T-yz4kg6W97hcXZ1uWCdGnDSDTpUA"
  );
}

// Inisialisasi Firebase & Firestore jika konfigurasi sudah diisi
let app = null;
let db = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("🔥 Firebase Cloud Firestore berhasil diinisialisasi.");
  } catch (error) {
    console.error("Gagal menginisialisasi Firebase:", error);
  }
} else {
  console.info("ℹ️ Firebase belum dikonfigurasi. Aplikasi berjalan dalam mode LocalStorage.");
}

export { 
  db, 
  collection, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  serverTimestamp 
};
