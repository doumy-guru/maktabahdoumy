# 📚 Aplikasi Koleksi Buku Pribadi (Firebase & GitHub Pages)

Aplikasi web modern, dinamis, dan *mobile-friendly* untuk mencatat koleksi buku pribadi dengan sinkronisasi cloud *real-time* berbasis **Firebase Cloud Firestore**, serta siap di-deploy secara publik menggunakan **GitHub Pages**.

---

## ✨ Fitur Utama

- ☁️ **Cloud Real-Time Sync**: Terhubung ke Firebase Cloud Firestore. Setiap perubahan status buku atau penambahan buku di ponsel akan langsung tersinkronisasi otomatis di laptop atau perangkat lain secara instan (*real-time*).
- 💾 **Hybrid / Graceful Offline Fallback**: Jika Firebase belum dikonfigurasi atau jaringan offline, aplikasi otomatis beralih ke penyimpanan lokal browser (**LocalStorage**) tanpa galat.
- 📱 **Mobile-First & Touch Optimized**: Dirancang dengan target sentuh tombol minimal 44px, pencegahan *auto-zoom* iOS Safari, serta tata letak kartu yang nyaman dioperasikan satu tangan.
- 🔍 **Pencarian & Filter Instan**: Bilah pencarian *real-time* (judul atau nama penulis) dan tab penyaringan status (*Semua*, *Belum Dibaca*, *Selesai*).
- 🚀 **Siap Deploy ke GitHub Pages**: Struktur berkas statis terintegrasi dengan **GitHub Actions** untuk deployment otomatis setiap kali melakukan `git push`.

---

## 🛠️ Panduan Langkah Demi Langkah

### Langkah 1: Pengaturan Firebase Cloud Firestore (Gratis)

1. Buka [Firebase Console](https://console.firebase.google.com/) dan login menggunakan akun Google.
2. Klik **"Add project"** (Tambah proyek) dan beri nama proyek Anda (misalnya: `koleksi-buku-saya`).
3. Pada menu sebelah kiri, pilih **Build > Firestore Database**, lalu klik **Create database**.
4. Pilih lokasi database terdekat (misalnya: `asia-southeast2` untuk Jakarta atau `asia-southeast1` untuk Singapura).
5. Pilih **"Start in test mode"** agar aplikasi dapat membaca dan menulis data buku secara langsung.
   > **Catatan Security Rules:**
   > Aturan database akan mengizinkan baca/tulis. Anda dapat memeriksanya di tab **Rules**:
   > ```javascript
   > rules_version = '2';
   > service cloud.firestore {
   >   match /databases/{database}/documents {
   >     match /{document=**} {
   >       allow read, write: if true;
   >     }
   >   }
   > }
   > ```
6. Di halaman beranda Project Overview, klik ikon Web **`</>`** untuk mendaftarkan Web App.
7. Salin konfigurasi objek `firebaseConfig` yang ditampilkan.

---

### Langkah 2: Memasukkan Kredensial ke `firebase-config.js`

Buka berkas `firebase-config.js` pada proyek ini, lalu ganti nilai konfigurasi dengan kredensial dari Firebase Anda:

```javascript
export const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "koleksi-buku-saya.firebaseapp.com",
  projectId: "koleksi-buku-saya",
  storageBucket: "koleksi-buku-saya.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef..."
};
```

---

### Langkah 3: Menguji Aplikasi Secara Lokal

Karena aplikasi menggunakan **JavaScript ES Modules** (`import` / `export`), peramban memerlukan protokol HTTP/HTTPS (bukan `file://`).

Anda dapat menjalankannya dengan salah satu cara berikut:
- **VS Code:** Klik kanan `index.html` lalu pilih **Open with Live Server**.
- **Python:** Buka terminal pada folder proyek dan ketik:
  ```powershell
  python -m http.server 8000
  ```
  Lalu buka `http://localhost:8000` di peramban.

---

### Langkah 4: Publikasi (Deploy) ke GitHub Pages

1. Buat repositori baru di [GitHub](https://github.com/new) (beri nama misalnya: `koleksi-buku-pribadi`).
2. Di terminal folder proyek Anda, jalankan perintah git berikut:
   ```powershell
   git init
   git add .
   git commit -m "feat: inisialisasi aplikasi koleksi buku firebase & github pages"
   git branch -M main
   git remote add origin https://github.com/<USERNAME-GITHUB-ANDA>/koleksi-buku-pribadi.git
   git push -u origin main
   ```
3. Buka repositori Anda di GitHub melalui peramban:
   - Masuk ke tab **Settings** > **Pages**.
   - Pada bagian **Build and deployment > Source**, pilih **GitHub Actions**.
4. GitHub Actions akan otomatis menjalankan alur kerja `.github/workflows/deploy.yml`.
5. Dalam 1-2 menit, aplikasi Anda sudah online dan dapat diakses di:
   ```
   https://<USERNAME-GITHUB-ANDA>.github.io/koleksi-buku-pribadi/
   ```

Sekarang Anda dapat membuka tautan tersebut dari ponsel maupun komputer manapun di seluruh dunia! 📱💻
