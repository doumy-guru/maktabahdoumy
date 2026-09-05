/**
 * Konfigurasi Firebase, Cloud Firestore, dan Firebase Authentication
 * Menggunakan Firebase Compat SDK agar berjalan mulus tanpa masalah CORS baik saat
 * dibuka langsung (protokol file://) maupun saat di-deploy secara online (https://).
 */

const firebaseConfig = {
  apiKey: "AIzaSyBjW9T-yz4kg6W97hcXZ1uWCdGnDSDTpUA",
  authDomain: "maktabahdoumy.firebaseapp.com",
  projectId: "maktabahdoumy",
  storageBucket: "maktabahdoumy.firebasestorage.app",
  messagingSenderId: "140772969230",
  appId: "1:140772969230:web:83eea7851afb205ee5a55f"
};

/**
 * Memeriksa apakah SDK Firebase tersedia dan konfigurasi project telah diisi
 * @returns {boolean}
 */
function isFirebaseConfigured() {
  return (
    typeof firebase !== 'undefined' &&
    Boolean(firebaseConfig.projectId) &&
    !firebaseConfig.projectId.includes("GANTI_DENGAN") &&
    Boolean(firebaseConfig.apiKey) &&
    !firebaseConfig.apiKey.includes("GANTI_DENGAN")
  );
}

let db = null;
let auth = null;
let googleProvider = null;

if (isFirebaseConfigured()) {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    auth = firebase.auth();
    googleProvider = new firebase.auth.GoogleAuthProvider();
    console.log("🔥 Firebase Cloud Firestore & Auth berhasil diinisialisasi.");
  } catch (error) {
    console.error("Gagal menginisialisasi Firebase:", error);
  }
} else {
  console.info("ℹ️ Firebase belum terhubung. Aplikasi menggunakan mode LocalStorage.");
}
