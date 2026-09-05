# 📚 Aplikasi Koleksi Buku Pribadi (Firebase & GitHub Pages)

Aplikasi web modern, dinamis, dan *mobile-friendly* untuk mencatat koleksi buku pribadi dengan sinkronisasi cloud *real-time* berbasis **Firebase Cloud Firestore**, serta siap di-deploy secara publik menggunakan **GitHub Pages**.

---

## ✨ Fitur Utama

- 🔐 **Autentikasi Pengguna (Login & Logout)**: Mendukung login dengan Email & Password, Google Sign-In, dan Mode Tamu (Guest) yang fleksibel baik saat online maupun offline.
- 🤝 **Tracking Peminjaman Buku**: Pantau buku yang sedang dipinjamkan, catat nama peminjam dan target tanggal pengembalian, serta kembalikan buku dengan sekali klik.
- ⭐ **Catatan & Review Buku**: Berikan rating bintang (1-5 ⭐) dan simpan catatan, ringkasan, atau ulasan mendalam pada buku yang telah selesai dibaca.
- ☁️ **Cloud Real-Time Sync**: Terhubung ke Firebase Cloud Firestore. Setiap perubahan status buku atau peminjaman langsung tersinkronisasi otomatis antar perangkat secara instan (*real-time*).
- 💾 **Hybrid / Graceful Offline Fallback**: Jika jaringan offline atau Firebase belum diaktifkan, aplikasi otomatis beralih ke penyimpanan lokal browser (**LocalStorage**) tanpa galat.
- 📱 **Mobile-First & Touch Optimized**: Dirancang dengan target sentuh tombol minimal 44px, pencegahan *auto-zoom* iOS Safari, serta modal responsif di layar ponsel.
- 🔍 **Pencarian & Filter Instan**: Bilah pencarian *real-time* (judul, nama penulis, nama peminjam) dan filter status (*Semua*, *Belum Dibaca*, *Selesai*, *Dipinjam*).
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
6. **Aktivasi Firebase Authentication:**
   - Di menu sebelah kiri, pilih **Build > Authentication**, lalu klik **Get Started**.
   - Pada tab **Sign-in method**, aktifkan penyedia yang ingin digunakan:
     - **Email/Password**: Aktifkan toggle Email/Password lalu simpan.
     - **Google**: Aktifkan toggle Google, masukkan email dukungan proyek, lalu simpan.
     - **Anonymous**: Aktifkan opsi Anonymous untuk mode tamu.
   - Pada tab **Settings > Authorized domains**, pastikan `localhost` serta domain GitHub Pages Anda (`<username>.github.io`) sudah terdaftar dalam daftar domain yang diizinkan.

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
