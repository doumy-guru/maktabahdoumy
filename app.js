/**
 * Aplikasi Koleksi Buku Pribadi - Maktabah Doumy
 * Mendukung Firebase Cloud Firestore & Auth (Compat SDK), Tracking Peminjaman, Catatan/Review Buku,
 * serta LocalStorage Fallback (Mode Offline).
 */

// Kunci penyimpanan LocalStorage
const STORAGE_KEY = 'PERSONAL_BOOKSHELF_APP_DATA';
const AUTH_STORAGE_KEY = 'PERSONAL_BOOKSHELF_MOCK_USER';

// State Aplikasi
let books = [];
let currentFilter = 'all'; // 'all' | 'unread' | 'read' | 'borrowed'
let searchQuery = '';
let isUsingFirebase = false;
let currentUser = null; // Object pengguna yang sedang aktif (null jika pengunjung umum)
let selectedStarRating = 0;
let unsubscribeFirestore = null;

// ==========================================================================
// Selektor DOM
// ==========================================================================
// Sidebar & Form Tambah Buku
const formCard = document.getElementById('form-card');
const authPromptCard = document.getElementById('auth-prompt-card');
const btnLoginPrompt = document.getElementById('btn-login-prompt');
const bookForm = document.getElementById('book-form');
const titleInput = document.getElementById('book-title');
const authorInput = document.getElementById('book-author');
const descriptionInput = document.getElementById('book-description');
const isReadCheckbox = document.getElementById('book-is-read');
const titleError = document.getElementById('title-error');
const authorError = document.getElementById('author-error');
const collectionSubtext = document.getElementById('collection-subtext');

// Daftar & Pencarian
const bookList = document.getElementById('book-list');
const emptyState = document.getElementById('empty-state');
const emptyText = document.getElementById('empty-text');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const filterButtons = document.querySelectorAll('.filter-btn');

// Statistik
const statTotal = document.getElementById('stat-total');
const statUnread = document.getElementById('stat-unread');
const statRead = document.getElementById('stat-read');
const statBorrowed = document.getElementById('stat-borrowed');

// Status Sinkronisasi
const syncBadge = document.getElementById('sync-badge');
const syncText = document.getElementById('sync-text');

// Header Auth & Profil
const btnOpenAuth = document.getElementById('btn-open-auth');
const userProfile = document.getElementById('user-profile');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const btnLogout = document.getElementById('btn-logout');

// Modal 1: Auth Pemilik
const modalAuth = document.getElementById('modal-auth');
const authForm = document.getElementById('auth-form');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authErrorAlert = document.getElementById('auth-error-alert');
const btnGoogleLogin = document.getElementById('btn-google-login');
const btnGuestLogin = document.getElementById('btn-guest-login');

// Modal 2: Peminjaman
const modalLoan = document.getElementById('modal-loan');
const loanForm = document.getElementById('loan-form');
const loanBookIdInput = document.getElementById('loan-book-id');
const loanBookTitleDisplay = document.getElementById('loan-book-title-display');
const borrowerNameInput = document.getElementById('borrower-name');
const borrowerNameError = document.getElementById('borrower-name-error');
const borrowDateInput = document.getElementById('borrow-date');
const returnDeadlineInput = document.getElementById('return-deadline');

// Modal 3: Review & Catatan
const modalReview = document.getElementById('modal-review');
const reviewForm = document.getElementById('review-form');
const reviewBookIdInput = document.getElementById('review-book-id');
const reviewBookTitleDisplay = document.getElementById('review-book-title-display');
const starButtons = document.querySelectorAll('#star-rating-container .star-btn');
const starRatingText = document.getElementById('star-rating-text');
const reviewTextInput = document.getElementById('review-text');

// Modal 4: Edit Koleksi Buku
const modalEditBook = document.getElementById('modal-edit-book');
const editBookForm = document.getElementById('edit-book-form');
const editBookIdInput = document.getElementById('edit-book-id');
const editBookTitleInput = document.getElementById('edit-book-title');
const editBookAuthorInput = document.getElementById('edit-book-author');
const editBookDescInput = document.getElementById('edit-book-description');
const editTitleError = document.getElementById('edit-title-error');
const editAuthorError = document.getElementById('edit-author-error');

// Fitur Input ISBN & Barcode Scanner
const isbnInput = document.getElementById('isbn-input');
const btnLookupIsbn = document.getElementById('btn-lookup-isbn');
const btnOpenScanner = document.getElementById('btn-open-scanner');
const isbnStatusMessage = document.getElementById('isbn-status-message');

// Modal 5: Barcode Scanner Kamera
const modalBarcodeScanner = document.getElementById('modal-barcode-scanner');
const scannerStatusEl = document.getElementById('scanner-status');
let html5QrCodeScanner = null;
let isScanning = false;

// Fitur Aksi Bantuan Perpusnas & Smart Paste
const btnOpenPerpusnas = document.getElementById('btn-open-perpusnas');
const btnOpenPasteModal = document.getElementById('btn-open-paste-modal');
const modalPastePerpusnas = document.getElementById('modal-paste-perpusnas');
const pastePerpusnasForm = document.getElementById('paste-perpusnas-form');
const pastePerpusnasInput = document.getElementById('paste-perpusnas-input');

// Timer toast
let toastTimeout;

// ==========================================================================
// Helper Notifikasi Toast & Status
// ==========================================================================
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

function updateSyncStatus(status, text) {
  if (!syncBadge || !syncText) return;
  syncBadge.className = `sync-badge status-${status}`;
  syncText.textContent = text;
}

// ==========================================================================
// Manajemen Modal Dialog
// ==========================================================================
function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.add('hidden');
  document.body.style.overflow = '';
}

// Event listener tombol tutup modal [data-close]
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetModalId = btn.dataset.close;
    if (targetModalId === 'modal-barcode-scanner') {
      stopBarcodeScanner();
    }
    closeModal(document.getElementById(targetModalId));
  });
});

// Tutup modal jika klik overlay luar
[modalAuth, modalLoan, modalReview, modalEditBook, modalBarcodeScanner, modalPastePerpusnas].forEach(modal => {
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (modal === modalBarcodeScanner) {
          stopBarcodeScanner();
        }
        closeModal(modal);
      }
    });
  }
});

// Tutup modal dengan tombol Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal(modalAuth);
    closeModal(modalLoan);
    closeModal(modalReview);
    closeModal(modalEditBook);
    closeModal(modalPastePerpusnas);
    if (modalBarcodeScanner && !modalBarcodeScanner.classList.contains('hidden')) {
      stopBarcodeScanner();
      closeModal(modalBarcodeScanner);
    }
  }
});

// ==========================================================================
// Sistem Autentikasi Pengguna & Hak Akses Pemilik vs Pengunjung
// ==========================================================================
function updateAuthUI(user) {
  currentUser = user;

  if (user) {
    // 1. SUDAH LOGIN SEBAGAI PEMILIK
    document.body.classList.add('user-logged-in');
    document.body.classList.remove('user-logged-out');

    if (btnOpenAuth) btnOpenAuth.classList.add('hidden');
    if (userProfile) userProfile.classList.remove('hidden');

    // Tampilkan Form Tambah Buku, Sembunyikan Sambutan Pengunjung
    if (formCard) formCard.classList.remove('hidden');
    if (authPromptCard) authPromptCard.classList.add('hidden');
    if (collectionSubtext) collectionSubtext.textContent = 'Mode Pengelola: Anda dapat menambah buku, mengelola peminjaman, mencatat status baca, dan menulis ulasan.';

    // Tampilkan elemen khusus pemilik (Statistik baca & Filter status baca)
    document.querySelectorAll('.owner-only-stat, .owner-only-filter').forEach(el => {
      el.classList.remove('hidden');
    });

    const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Pemilik');
    if (userName) userName.textContent = displayName;
    if (userEmail) userEmail.textContent = user.email || 'Mode Tamu / Offline';

    if (userAvatar) {
      if (user.photoURL) {
        userAvatar.innerHTML = `<img src="${user.photoURL}" alt="${displayName}">`;
      } else {
        userAvatar.textContent = displayName.charAt(0).toUpperCase();
      }
    }
  } else {
    // 2. BELUM LOGIN (PENGUNJUNG UMUM)
    document.body.classList.add('user-logged-out');
    document.body.classList.remove('user-logged-in');

    if (btnOpenAuth) btnOpenAuth.classList.remove('hidden');
    if (userProfile) userProfile.classList.add('hidden');

    // Sembunyikan Form Tambah Buku, Tampilkan Sambutan Pengunjung
    if (formCard) formCard.classList.add('hidden');
    if (authPromptCard) authPromptCard.classList.remove('hidden');
    if (collectionSubtext) collectionSubtext.textContent = 'Katalog Pustaka: Jelajahi khazanah koleksi buku Maktabah Doumy.';

    // Sembunyikan elemen khusus pemilik (Statistik baca & Filter status baca)
    document.querySelectorAll('.owner-only-stat, .owner-only-filter').forEach(el => {
      el.classList.add('hidden');
    });

    // Jika filter yang aktif sebelum logout adalah filter baca privat, kembalikan ke 'all'
    if (currentFilter === 'unread' || currentFilter === 'read') {
      currentFilter = 'all';
      filterButtons.forEach(btn => {
        if (btn.dataset.filter === 'all') {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    if (userName) userName.textContent = '';
    if (userEmail) userEmail.textContent = '';
    if (userAvatar) userAvatar.textContent = '👤';
  }

  // Re-render buku agar badge status baca dan tombol aksi disesuaikan dengan hak akses
  renderBooks();
}

function setAuthError(msg) {
  if (!authErrorAlert) return;
  if (!msg) {
    authErrorAlert.classList.add('hidden');
    authErrorAlert.textContent = '';
  } else {
    authErrorAlert.classList.remove('hidden');
    authErrorAlert.textContent = msg;
  }
}

// Buka modal login dari tombol header
if (btnOpenAuth) {
  btnOpenAuth.addEventListener('click', () => {
    setAuthError('');
    if (authForm) authForm.reset();
    openModal(modalAuth);
    if (authEmailInput) setTimeout(() => authEmailInput.focus(), 100);
  });
}

// Buka modal login dari tombol kartu sambutan
if (btnLoginPrompt) {
  btnLoginPrompt.addEventListener('click', () => {
    setAuthError('');
    if (authForm) authForm.reset();
    openModal(modalAuth);
    if (authEmailInput) setTimeout(() => authEmailInput.focus(), 100);
  });
}

// Submit Form Login Email & Password
if (authForm) {
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value;

    if (!email || !password) return;

    setAuthError('');
    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = 'Memproses...';

    if (isFirebaseConfigured() && auth) {
      try {
        const userCred = await auth.signInWithEmailAndPassword(email, password);
        showToast(`👋 Selamat datang kembali, ${userCred.user.email}!`);
        closeModal(modalAuth);
      } catch (err) {
        console.error('Auth error:', err);
        let errMsg = 'Terjadi kesalahan saat masuk.';
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          errMsg = 'Email atau kata sandi salah. Pastikan akun sudah dibuat di Firebase Console.';
        } else if (err.code === 'auth/invalid-email') {
          errMsg = 'Format email tidak valid.';
        } else if (err.code === 'auth/too-many-requests') {
          errMsg = 'Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat.';
        }
        setAuthError(errMsg);
      }
    } else {
      // Mock Auth (Offline mode)
      const mockUser = {
        uid: 'offline-' + Date.now(),
        email: email,
        displayName: email.split('@')[0],
        photoURL: null
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockUser));
      updateAuthUI(mockUser);
      showToast(`👋 Masuk dalam mode offline: ${mockUser.displayName}`);
      closeModal(modalAuth);
    }

    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = 'Masuk Sekarang';
  });
}

// Login dengan Google
if (btnGoogleLogin) {
  btnGoogleLogin.addEventListener('click', async () => {
    setAuthError('');
    if (isFirebaseConfigured() && auth && googleProvider) {
      try {
        const result = await auth.signInWithPopup(googleProvider);
        showToast(`👋 Selamat datang, ${result.user.displayName || result.user.email}!`);
        closeModal(modalAuth);
      } catch (err) {
        console.error('Google Auth Error:', err);
        if (err.code === 'auth/unauthorized-domain') {
          setAuthError('Domain peramban ini belum diizinkan di Firebase Console > Authentication > Settings > Authorized domains.');
        } else if (err.code !== 'auth/popup-closed-by-user') {
          setAuthError('Gagal masuk dengan Google: ' + err.message);
        }
      }
    } else {
      const mockUser = {
        uid: 'google-mock-' + Date.now(),
        email: 'pemilik.google@gmail.com',
        displayName: 'Pemilik (Google)',
        photoURL: null
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockUser));
      updateAuthUI(mockUser);
      showToast('👋 Masuk sebagai Pemilik (Mode Demo)');
      closeModal(modalAuth);
    }
  });
}

// Login Tamu (Demo / Offline)
if (btnGuestLogin) {
  btnGuestLogin.addEventListener('click', async () => {
    if (isFirebaseConfigured() && auth) {
      try {
        const userCred = await auth.signInAnonymously();
        showToast('👤 Masuk sebagai Tamu (Guest)');
        closeModal(modalAuth);
      } catch (err) {
        console.warn('Gagal login anonim Firebase, menggunakan local guest:', err);
        createLocalGuest();
      }
    } else {
      createLocalGuest();
    }
  });
}

function createLocalGuest() {
  const guestUser = {
    uid: 'guest-' + Date.now(),
    email: null,
    displayName: 'Tamu (Guest)',
    photoURL: null
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(guestUser));
  updateAuthUI(guestUser);
  showToast('👤 Masuk sebagai Tamu (Mode Offline)');
  closeModal(modalAuth);
}

// Tombol Keluar (Logout)
if (btnLogout) {
  btnLogout.addEventListener('click', async () => {
    const confirmed = window.confirm('Apakah Anda yakin ingin keluar dari akun?');
    if (!confirmed) return;

    if (isFirebaseConfigured() && auth) {
      try {
        await auth.signOut();
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    localStorage.removeItem(AUTH_STORAGE_KEY);
    updateAuthUI(null);
    showToast('🚪 Anda telah keluar.');
  });
}

// Inisialisasi Auth Listener
function initAuth() {
  if (isFirebaseConfigured() && auth) {
    auth.onAuthStateChanged((user) => {
      updateAuthUI(user);
    });
  } else {
    try {
      const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedUser) {
        updateAuthUI(JSON.parse(savedUser));
      } else {
        updateAuthUI(null);
      }
    } catch (e) {
      updateAuthUI(null);
    }
  }
}

// ==========================================================================
// Penyimpanan Data (Firestore & LocalStorage)
// ==========================================================================
function isLocalStorageAvailable() {
  try {
    const testKey = '__test_storage__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

function loadFromLocalStorage() {
  if (!isLocalStorageAvailable()) return;
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (rawData) {
      books = JSON.parse(rawData).map(b => ({
        ...b,
        description: b.description || ''
      }));
    } else {
      // Data contoh awal
      books = [
        {
          id: 'sample-1',
          title: 'Filosofi Teras',
          author: 'Henry Manampiring',
          description: 'Penerbit Kompas, Cetakan ke-33, 346 Halaman',
          isRead: true,
          isBorrowed: false,
          borrowerName: '',
          borrowDate: '',
          returnDeadline: '',
          rating: 5,
          review: 'Buku pengantar stoikisme yang sangat aplikatif untuk ketenangan mental sehari-hari.',
          reviewDate: '3 Sep 2026',
          createdAt: '1 Sep 2026'
        },
        {
          id: 'sample-2',
          title: 'Atomic Habits',
          author: 'James Clear',
          description: 'Penerbit Gramedia Pustaka Utama, Edisi Bahasa Indonesia, 352 Halaman',
          isRead: false,
          isBorrowed: true,
          borrowerName: 'Budi Santoso',
          borrowDate: '2026-09-02',
          returnDeadline: '2026-09-16',
          rating: 0,
          review: '',
          reviewDate: '',
          createdAt: '2 Sep 2026'
        }
      ];
      saveToLocalStorage();
    }
    renderBooks();
  } catch (error) {
    console.error('Gagal membaca data dari LocalStorage:', error);
    books = [];
    renderBooks();
  }
}

function saveToLocalStorage() {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  } catch (error) {
    console.error('Gagal menyimpan data ke LocalStorage:', error);
  }
}

function initializeFirebaseSync() {
  updateSyncStatus('connecting', 'Menghubungkan ke Cloud...');

  try {
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }

    const booksRef = db.collection('books').orderBy('createdAt', 'desc');

    unsubscribeFirestore = booksRef.onSnapshot((snapshot) => {
      isUsingFirebase = true;
      updateSyncStatus('online', '☁️ Tersinkronisasi Cloud (Firebase)');

      books = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || '',
          author: data.author || '',
          description: data.description || '',
          isRead: Boolean(data.isRead),
          isBorrowed: Boolean(data.isBorrowed),
          borrowerName: data.borrowerName || '',
          borrowDate: data.borrowDate || '',
          returnDeadline: data.returnDeadline || '',
          rating: Number(data.rating) || 0,
          review: data.review || '',
          reviewDate: data.reviewDate || '',
          createdAt: data.createdAtFormatted || 'Baru saja',
          userId: data.userId || null
        };
      });

      saveToLocalStorage();
      renderBooks();
    }, (error) => {
      console.warn('Firestore onSnapshot error:', error.message);
      isUsingFirebase = false;
      updateSyncStatus('offline', 'Mode Offline (LocalStorage)');
      showToast('⚠️ Firestore offline / periksa izin Rules');
      loadFromLocalStorage();
    });

  } catch (error) {
    console.warn('Error inisialisasi query Firestore:', error);
    isUsingFirebase = false;
    updateSyncStatus('offline', 'Mode Offline (LocalStorage)');
    loadFromLocalStorage();
  }
}

// ==========================================================================
// Statistik & Ringkasan
// ==========================================================================
function updateStats() {
  const total = books.length;
  const readCount = books.filter(b => b.isRead).length;
  const unreadCount = total - readCount;
  const borrowedCount = books.filter(b => b.isBorrowed).length;

  if (statTotal) statTotal.textContent = total;
  if (statRead) statRead.textContent = readCount;
  if (statUnread) statUnread.textContent = unreadCount;
  if (statBorrowed) statBorrowed.textContent = borrowedCount;
}

// ==========================================================================
// Render Kartu Buku di DOM
// ==========================================================================
function createBookElement(book) {
  const item = document.createElement('article');
  item.className = 'book-item';
  item.dataset.id = book.id;

  // 1. Baris Utama (Judul, Penulis, Badges)
  const mainRow = document.createElement('div');
  mainRow.className = 'book-main-row';

  const detailsDiv = document.createElement('div');
  detailsDiv.className = 'book-details';

  const titleEl = document.createElement('h3');
  titleEl.className = 'book-title';
  titleEl.textContent = book.title;

  const authorEl = document.createElement('p');
  authorEl.className = 'book-author';
  const authorIcon = document.createElement('span');
  authorIcon.className = 'author-icon';
  authorIcon.textContent = '✍️';
  const authorText = document.createElement('span');
  authorText.textContent = book.author;
  authorEl.appendChild(authorIcon);
  authorEl.appendChild(authorText);

  // Meta Badges
  const metaDiv = document.createElement('div');
  metaDiv.className = 'book-meta';

  // Badge Status Baca: HANYA TAMPIL JIKA PEMILIK SUDAH LOGIN!
  if (currentUser) {
    const readBadge = document.createElement('span');
    readBadge.className = `status-badge ${book.isRead ? 'status-read' : 'status-unread'}`;
    readBadge.textContent = book.isRead ? '✓ Selesai Dibaca' : '⏳ Belum Dibaca';
    metaDiv.appendChild(readBadge);
  }

  // Badge Status Pinjam / Ketersediaan: Tampil untuk Publik dan Pemilik
  const loanBadge = document.createElement('span');
  loanBadge.className = `status-badge ${book.isBorrowed ? 'status-borrowed' : 'status-available'}`;
  loanBadge.textContent = book.isBorrowed ? '🤝 Sedang Dipinjam' : '🟢 Tersedia';
  metaDiv.appendChild(loanBadge);

  detailsDiv.appendChild(titleEl);
  detailsDiv.appendChild(authorEl);
  detailsDiv.appendChild(metaDiv);
  mainRow.appendChild(detailsDiv);
  item.appendChild(mainRow);

  // 2. Keterangan / Deskripsi Buku (Edisi, Penerbit, Jilid, Pentahqiq, dll.)
  if (book.description && book.description.trim()) {
    const descBox = document.createElement('div');
    descBox.className = 'book-description';

    const descIcon = document.createElement('span');
    descIcon.className = 'book-desc-icon';
    descIcon.textContent = '📑';

    const descText = document.createElement('div');
    descText.className = 'book-desc-text';
    descText.textContent = book.description;

    descBox.appendChild(descIcon);
    descBox.appendChild(descText);
    item.appendChild(descBox);
  }

  // 3. Info Peminjaman (Jika sedang dipinjam)
  if (book.isBorrowed && book.borrowerName) {
    const loanBox = document.createElement('div');
    loanBox.className = 'loan-info-box';

    const infoText = document.createElement('span');
    infoText.className = 'loan-info-text';
    infoText.innerHTML = `👤 Dipinjam oleh: <strong>${escapeHtml(book.borrowerName)}</strong>`;

    const deadlineText = document.createElement('span');
    deadlineText.className = 'loan-deadline-text';
    if (book.returnDeadline) {
      deadlineText.textContent = `📅 Batas Kembali: ${formatDisplayDate(book.returnDeadline)}`;
    } else {
      deadlineText.textContent = `📅 Tanggal Pinjam: ${formatDisplayDate(book.borrowDate || 'Hari ini')}`;
    }

    loanBox.appendChild(infoText);
    loanBox.appendChild(deadlineText);
    item.appendChild(loanBox);
  }

  // 3. Catatan & Review Buku (Jika sudah direview)
  if (book.rating > 0 || (book.review && book.review.trim())) {
    const reviewCard = document.createElement('div');
    reviewCard.className = 'book-review-card';

    if (book.rating > 0) {
      const starsDisplay = document.createElement('div');
      starsDisplay.className = 'review-stars-display';
      starsDisplay.textContent = '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating);
      reviewCard.appendChild(starsDisplay);
    }

    if (book.review && book.review.trim()) {
      const reviewTextEl = document.createElement('p');
      reviewTextEl.className = 'review-text-display';
      reviewTextEl.textContent = `"${book.review}"`;
      reviewCard.appendChild(reviewTextEl);
    }

    if (book.reviewDate) {
      const reviewDateEl = document.createElement('span');
      reviewDateEl.className = 'review-date-display';
      reviewDateEl.textContent = `Ulasan ditulis: ${book.reviewDate}`;
      reviewCard.appendChild(reviewDateEl);
    }

    item.appendChild(reviewCard);
  }

  // 4. Baris Tombol Aksi (HANYA DITAMPILKAN JIKA PEMILIK SUDAH LOGIN!)
  if (currentUser) {
    const actionsBar = document.createElement('div');
    actionsBar.className = 'book-actions-bar';

    // Tombol Toggle Status Baca
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'btn btn-action btn-toggle';
    toggleBtn.innerHTML = book.isRead 
      ? '<span>🔄</span> Belum Dibaca' 
      : '<span>✅</span> Selesai';
    toggleBtn.setAttribute('aria-label', `Ubah status baca ${book.title}`);
    toggleBtn.addEventListener('click', () => toggleBookStatus(book.id));
    actionsBar.appendChild(toggleBtn);

    // Tombol Peminjaman
    const loanBtn = document.createElement('button');
    loanBtn.type = 'button';
    loanBtn.className = 'btn btn-action btn-loan-action';
    if (book.isBorrowed) {
      loanBtn.innerHTML = '<span>↩️</span> Kembalikan';
      loanBtn.setAttribute('aria-label', `Kembalikan buku ${book.title}`);
      loanBtn.addEventListener('click', () => returnBook(book.id, book.title));
    } else {
      loanBtn.innerHTML = '<span>🤝</span> Pinjamkan';
      loanBtn.setAttribute('aria-label', `Pinjamkan buku ${book.title}`);
      loanBtn.addEventListener('click', () => openLoanModal(book));
    }
    actionsBar.appendChild(loanBtn);

    // Tombol Catatan / Review (Hanya jika Selesai Dibaca)
    if (book.isRead) {
      const reviewBtn = document.createElement('button');
      reviewBtn.type = 'button';
      reviewBtn.className = 'btn btn-action btn-review-action';
      const hasReview = (book.rating > 0 || (book.review && book.review.trim()));
      reviewBtn.innerHTML = hasReview ? '<span>✏️</span> Edit Review' : '<span>📝</span> Beri Review';
      reviewBtn.setAttribute('aria-label', `Catatan dan review ${book.title}`);
      reviewBtn.addEventListener('click', () => openReviewModal(book));
      actionsBar.appendChild(reviewBtn);
    }

    // Tombol Edit Buku (Judul, Penulis, Deskripsi)
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn-action btn-edit-action';
    editBtn.innerHTML = '<span>✏️</span> Edit';
    editBtn.setAttribute('aria-label', `Edit buku ${book.title}`);
    editBtn.addEventListener('click', () => openEditBookModal(book));
    actionsBar.appendChild(editBtn);

    // Tombol Hapus Buku
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-action btn-delete';
    deleteBtn.innerHTML = '<span>🗑️</span> Hapus';
    deleteBtn.setAttribute('aria-label', `Hapus buku ${book.title}`);
    deleteBtn.addEventListener('click', () => deleteBook(book.id, book.title));
    actionsBar.appendChild(deleteBtn);

    item.appendChild(actionsBar);
  }

  return item;
}

function escapeHtml(string) {
  const div = document.createElement('div');
  div.textContent = string;
  return div.innerHTML;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  } catch (e) {}
  return dateStr;
}

// ==========================================================================
// Render Seluruh Koleksi Buku
// ==========================================================================
function renderBooks() {
  if (!bookList) return;
  bookList.innerHTML = '';

  let filteredBooks = books;

  // Filter Tab
  if (currentFilter === 'unread') {
    filteredBooks = books.filter(b => !b.isRead);
  } else if (currentFilter === 'read') {
    filteredBooks = books.filter(b => b.isRead);
  } else if (currentFilter === 'borrowed') {
    filteredBooks = books.filter(b => b.isBorrowed);
  }

  // Filter Pencarian
  const queryText = searchQuery.trim().toLowerCase();
  if (queryText) {
    filteredBooks = filteredBooks.filter(b => 
      b.title.toLowerCase().includes(queryText) || 
      b.author.toLowerCase().includes(queryText) ||
      (b.description && b.description.toLowerCase().includes(queryText)) ||
      (b.borrowerName && b.borrowerName.toLowerCase().includes(queryText))
    );
  }

  // Tampilan Kosong (Empty State)
  if (filteredBooks.length === 0) {
    emptyState.classList.remove('hidden');
    if (books.length === 0) {
      emptyText.textContent = currentUser 
        ? 'Koleksi Anda masih kosong. Mulai tambahkan buku pertama Anda menggunakan formulir!' 
        : 'Koleksi buku saat ini masih kosong.';
    } else if (queryText) {
      emptyText.textContent = `Tidak ada buku yang cocok dengan pencarian "${searchQuery}".`;
    } else if (currentFilter === 'borrowed') {
      emptyText.textContent = 'Tidak ada buku yang sedang dipinjam saat ini.';
    } else if (currentFilter === 'unread') {
      emptyText.textContent = 'Semua buku dalam koleksi telah selesai dibaca.';
    } else if (currentFilter === 'read') {
      emptyText.textContent = 'Belum ada buku yang selesai dibaca.';
    }
  } else {
    emptyState.classList.add('hidden');
    const fragment = document.createDocumentFragment();
    filteredBooks.forEach(book => {
      fragment.appendChild(createBookElement(book));
    });
    bookList.appendChild(fragment);
  }

  updateStats();
}

// ==========================================================================
// Operasi CRUD Buku
// ==========================================================================
async function addBook(title, author, isRead, description = '') {
  const formattedDate = new Date().toLocaleDateString('id-ID', { 
    day: 'numeric', month: 'short', year: 'numeric' 
  });

  const bookData = {
    title: title.trim(),
    author: author.trim(),
    description: (description || '').trim(),
    isRead: Boolean(isRead),
    isBorrowed: false,
    borrowerName: '',
    borrowDate: '',
    returnDeadline: '',
    rating: 0,
    review: '',
    reviewDate: '',
    userId: currentUser ? currentUser.uid : null,
    createdAtFormatted: formattedDate
  };

  if (isUsingFirebase && db) {
    try {
      showToast('☁️ Menyimpan ke Cloud...');
      await db.collection('books').add({
        ...bookData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      showToast(`☁️ Buku "${bookData.title}" tersimpan di Cloud!`);
    } catch (error) {
      console.error('Gagal menambahkan ke Firestore:', error);
      fallbackAddLocal(bookData);
    }
  } else {
    fallbackAddLocal(bookData);
  }

  if (bookForm) bookForm.reset();
  if (isbnInput) isbnInput.value = '';
  setIsbnStatus('', '');
  if (titleInput) titleInput.focus();
}

function fallbackAddLocal(bookData) {
  const newBook = {
    id: 'book-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    ...bookData,
    createdAt: bookData.createdAtFormatted
  };
  books.unshift(newBook);
  saveToLocalStorage();
  renderBooks();
  showToast(`💾 Buku "${newBook.title}" tersimpan di LocalStorage!`);
}

async function toggleBookStatus(id) {
  const target = books.find(b => b.id === id);
  if (!target) return;

  const newStatus = !target.isRead;
  const statusLabel = newStatus ? 'Selesai Dibaca' : 'Belum Dibaca';

  if (isUsingFirebase && db) {
    try {
      await db.collection('books').doc(id).update({ isRead: newStatus });
      showToast(`☁️ Status: ${statusLabel}`);
    } catch (error) {
      console.error('Firestore update error:', error);
      target.isRead = newStatus;
      saveToLocalStorage();
      renderBooks();
      showToast(`🔄 Status diubah: ${statusLabel}`);
    }
  } else {
    target.isRead = newStatus;
    saveToLocalStorage();
    renderBooks();
    showToast(`🔄 Status diubah: ${statusLabel}`);
  }
}

async function deleteBook(id, title) {
  const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus buku "${title}" dari koleksi?`);
  if (!confirmed) return;

  if (isUsingFirebase && db) {
    try {
      showToast('🗑️ Menghapus...');
      await db.collection('books').doc(id).delete();
      showToast(`🗑️ Buku "${title}" berhasil dihapus.`);
    } catch (error) {
      console.error('Firestore delete error:', error);
      books = books.filter(b => b.id !== id);
      saveToLocalStorage();
      renderBooks();
      showToast(`🗑️ Buku dihapus secara lokal.`);
    }
  } else {
    books = books.filter(b => b.id !== id);
    saveToLocalStorage();
    renderBooks();
    showToast(`🗑️ Buku "${title}" dihapus dari LocalStorage.`);
  }
}

// ==========================================================================
// Logika Fitur Tracking Peminjaman Buku
// ==========================================================================
function openLoanModal(book) {
  loanBookIdInput.value = book.id;
  loanBookTitleDisplay.textContent = `Buku: "${book.title}"`;
  borrowerNameInput.value = '';
  borrowerNameError.textContent = '';
  
  const today = new Date().toISOString().split('T')[0];
  borrowDateInput.value = today;

  const nextTwoWeeks = new Date();
  nextTwoWeeks.setDate(nextTwoWeeks.getDate() + 14);
  returnDeadlineInput.value = nextTwoWeeks.toISOString().split('T')[0];

  openModal(modalLoan);
  setTimeout(() => borrowerNameInput.focus(), 100);
}

if (loanForm) {
  loanForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bookId = loanBookIdInput.value;
    const borrowerName = borrowerNameInput.value.trim();
    const borrowDate = borrowDateInput.value;
    const returnDeadline = returnDeadlineInput.value;

    if (!borrowerName) {
      borrowerNameError.textContent = 'Nama peminjam wajib diisi.';
      borrowerNameInput.focus();
      return;
    }

    const updateData = {
      isBorrowed: true,
      borrowerName: borrowerName,
      borrowDate: borrowDate,
      returnDeadline: returnDeadline
    };

    if (isUsingFirebase && db) {
      try {
        showToast('🤝 Menyimpan peminjaman...');
        await db.collection('books').doc(bookId).update(updateData);
        showToast(`🤝 Buku dipinjamkan ke ${borrowerName}!`);
      } catch (err) {
        console.error('Error pinjam Firestore:', err);
        localBorrowUpdate(bookId, updateData);
      }
    } else {
      localBorrowUpdate(bookId, updateData);
    }

    closeModal(modalLoan);
  });
}

function localBorrowUpdate(bookId, updateData) {
  const target = books.find(b => b.id === bookId);
  if (target) {
    Object.assign(target, updateData);
    saveToLocalStorage();
    renderBooks();
    showToast(`🤝 Buku dipinjamkan ke ${updateData.borrowerName}!`);
  }
}

async function returnBook(bookId, title) {
  const confirmed = window.confirm(`Konfirmasi pengembalian buku "${title}"? Buku akan ditandai kembali tersedia.`);
  if (!confirmed) return;

  const returnData = {
    isBorrowed: false,
    borrowerName: '',
    borrowDate: '',
    returnDeadline: ''
  };

  if (isUsingFirebase && db) {
    try {
      showToast('↩️ Memproses pengembalian...');
      await db.collection('books').doc(bookId).update(returnData);
      showToast(`✅ Buku "${title}" telah dikembalikan.`);
    } catch (err) {
      console.error('Error return Firestore:', err);
      localReturnUpdate(bookId, returnData, title);
    }
  } else {
    localReturnUpdate(bookId, returnData, title);
  }
}

function localReturnUpdate(bookId, returnData, title) {
  const target = books.find(b => b.id === bookId);
  if (target) {
    Object.assign(target, returnData);
    saveToLocalStorage();
    renderBooks();
    showToast(`✅ Buku "${title}" telah dikembalikan.`);
  }
}

// ==========================================================================
// Logika Fitur Catatan & Review Buku
// ==========================================================================
function updateStarRatingUI(rating) {
  selectedStarRating = rating;
  starButtons.forEach(btn => {
    const starVal = Number(btn.dataset.star);
    if (starVal <= rating) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const ratingLabels = ['', 'Sangat Kurang ⭐', 'Kurang ⭐⭐', 'Cukup ⭐⭐⭐', 'Bagus ⭐⭐⭐⭐', 'Luar Biasa! ⭐⭐⭐⭐⭐'];
  if (starRatingText) {
    starRatingText.textContent = rating > 0 ? ratingLabels[rating] : 'Pilih rating (opsional)';
  }
}

starButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const starVal = Number(btn.dataset.star);
    updateStarRatingUI(starVal === selectedStarRating ? 0 : starVal);
  });
});

function openReviewModal(book) {
  reviewBookIdInput.value = book.id;
  reviewBookTitleDisplay.textContent = `Buku: "${book.title}"`;
  updateStarRatingUI(book.rating || 0);
  reviewTextInput.value = book.review || '';

  openModal(modalReview);
  setTimeout(() => reviewTextInput.focus(), 100);
}

if (reviewForm) {
  reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bookId = reviewBookIdInput.value;
    const rating = selectedStarRating;
    const reviewText = reviewTextInput.value.trim();

    const formattedDate = new Date().toLocaleDateString('id-ID', { 
      day: 'numeric', month: 'short', year: 'numeric' 
    });

    const reviewData = {
      rating: rating,
      review: reviewText,
      reviewDate: formattedDate
    };

    if (isUsingFirebase && db) {
      try {
        showToast('📝 Menyimpan review...');
        await db.collection('books').doc(bookId).update(reviewData);
        showToast('⭐ Catatan & review berhasil disimpan ke Cloud!');
      } catch (err) {
        console.error('Error save review Firestore:', err);
        localReviewUpdate(bookId, reviewData);
      }
    } else {
      localReviewUpdate(bookId, reviewData);
    }

    closeModal(modalReview);
  });
}

function localReviewUpdate(bookId, reviewData) {
  const target = books.find(b => b.id === bookId);
  if (target) {
    Object.assign(target, reviewData);
    saveToLocalStorage();
    renderBooks();
    showToast('⭐ Catatan & review berhasil disimpan!');
  }
}

// ==========================================================================
// Logika Fitur Edit Koleksi Buku
// ==========================================================================
function openEditBookModal(book) {
  editBookIdInput.value = book.id;
  editBookTitleInput.value = book.title || '';
  editBookAuthorInput.value = book.author || '';
  editBookDescInput.value = book.description || '';

  if (editTitleError) editTitleError.textContent = '';
  if (editAuthorError) editAuthorError.textContent = '';
  editBookTitleInput.classList.remove('invalid');
  editBookAuthorInput.classList.remove('invalid');

  openModal(modalEditBook);
  setTimeout(() => editBookTitleInput.focus(), 100);
}

if (editBookTitleInput) {
  editBookTitleInput.addEventListener('input', () => {
    if (editBookTitleInput.value.trim()) {
      editBookTitleInput.classList.remove('invalid');
      if (editTitleError) editTitleError.textContent = '';
    }
  });
}

if (editBookAuthorInput) {
  editBookAuthorInput.addEventListener('input', () => {
    if (editBookAuthorInput.value.trim()) {
      editBookAuthorInput.classList.remove('invalid');
      if (editAuthorError) editAuthorError.textContent = '';
    }
  });
}

if (editBookForm) {
  editBookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bookId = editBookIdInput.value;
    const newTitle = editBookTitleInput.value.trim();
    const newAuthor = editBookAuthorInput.value.trim();
    const newDesc = editBookDescInput.value.trim();

    let isValid = true;
    if (!newTitle) {
      editBookTitleInput.classList.add('invalid');
      if (editTitleError) editTitleError.textContent = 'Judul buku wajib diisi.';
      isValid = false;
    } else {
      editBookTitleInput.classList.remove('invalid');
      if (editTitleError) editTitleError.textContent = '';
    }

    if (!newAuthor) {
      editBookAuthorInput.classList.add('invalid');
      if (editAuthorError) editAuthorError.textContent = 'Nama penulis wajib diisi.';
      isValid = false;
    } else {
      editBookAuthorInput.classList.remove('invalid');
      if (editAuthorError) editAuthorError.textContent = '';
    }

    if (!isValid) return;

    const updateData = {
      title: newTitle,
      author: newAuthor,
      description: newDesc
    };

    if (isUsingFirebase && db) {
      try {
        showToast('💾 Menyimpan perubahan...');
        await db.collection('books').doc(bookId).update(updateData);
        showToast(`✅ Data buku "${newTitle}" berhasil diperbarui!`);
      } catch (err) {
        console.error('Error edit Firestore:', err);
        localEditUpdate(bookId, updateData);
      }
    } else {
      localEditUpdate(bookId, updateData);
    }

    closeModal(modalEditBook);
  });
}

function localEditUpdate(bookId, updateData) {
  const target = books.find(b => b.id === bookId);
  if (target) {
    Object.assign(target, updateData);
    saveToLocalStorage();
    renderBooks();
    showToast(`✅ Data buku "${updateData.title}" berhasil diperbarui!`);
  }
}

// ==========================================================================
// Fitur Pencarian Data Buku via ISBN (Google Books & Open Library)
// serta Pemindai Barcode Kamera (Html5Qrcode)
// ==========================================================================
function cleanIsbn(raw) {
  if (!raw) return '';
  return raw.replace(/[^0-9X]/gi, '').toUpperCase();
}

function setIsbnStatus(type, message) {
  if (!isbnStatusMessage) return;
  if (!message) {
    isbnStatusMessage.className = 'isbn-status-message hidden';
    isbnStatusMessage.innerHTML = '';
    return;
  }
  isbnStatusMessage.className = `isbn-status-message ${type}`;
  isbnStatusMessage.innerHTML = message;
  isbnStatusMessage.classList.remove('hidden');
}

async function lookupBookByIsbn(isbnRaw) {
  const isbn = cleanIsbn(isbnRaw);
  if (!isbn || (isbn.length !== 10 && isbn.length !== 13)) {
    setIsbnStatus('error', '⚠️ Format ISBN tidak valid (harus 10 atau 13 digit).');
    showToast('⚠️ Masukkan nomor ISBN 10 atau 13 digit.');
    return;
  }

  setIsbnStatus('loading', '<span>🔄</span> Mencari di database buku online...');
  if (btnLookupIsbn) btnLookupIsbn.disabled = true;

  try {
    let bookInfo = null;

    // 1. Coba Google Books API terlebih dahulu (sertakan key jika ada)
    try {
      let gBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`;
      if (typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey) {
        gBooksUrl += `&key=${encodeURIComponent(firebaseConfig.apiKey)}`;
      }
      const gRes = await fetch(gBooksUrl);
      if (gRes.ok) {
        const gData = await gRes.json();
        if (gData.items && gData.items.length > 0) {
          const info = gData.items[0].volumeInfo;
          bookInfo = {
            source: 'Google Books',
            title: info.title || '',
            subtitle: info.subtitle || '',
            authors: (info.authors && info.authors.length) ? info.authors.join(', ') : '',
            publisher: info.publisher || '',
            publishedDate: info.publishedDate || '',
            pageCount: info.pageCount ? `${info.pageCount} Halaman` : '',
            description: info.description || '',
            categories: (info.categories && info.categories.length) ? info.categories.join(', ') : '',
            isbn: isbn
          };
        }
      }
    } catch (gErr) {
      console.warn('Google Books API lookup error:', gErr);
    }

    // 2. Jika tidak ditemukan di Google Books, coba Open Library API
    if (!bookInfo) {
      try {
        const olUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`;
        const olRes = await fetch(olUrl);
        if (olRes.ok) {
          const olData = await olRes.json();
          const olKey = `ISBN:${isbn}`;
          if (olData[olKey]) {
            const data = olData[olKey];
            const authorsList = data.authors ? data.authors.map(a => a.name).join(', ') : '';
            const publisherList = data.publishers ? data.publishers.map(p => p.name).join(', ') : '';
            bookInfo = {
              source: 'Open Library',
              title: data.title || '',
              subtitle: data.subtitle || '',
              authors: authorsList,
              publisher: publisherList,
              publishedDate: data.publish_date || '',
              pageCount: data.number_of_pages ? `${data.number_of_pages} Halaman` : '',
              description: typeof data.notes === 'string' ? data.notes : '',
              categories: data.subjects ? data.subjects.slice(0, 3).map(s => s.name).join(', ') : '',
              isbn: isbn
            };
          }
        }
      } catch (olErr) {
        console.warn('Open Library API lookup error:', olErr);
      }
    }

    if (!bookInfo) {
      setIsbnStatus(
        'error', 
        `⚠️ Buku dengan ISBN <strong>${escapeHtml(isbn)}</strong> belum terindeks di Google Books / Open Library.<br>` +
        `Buku lokal Indonesia umumnya terdaftar di <strong>Perpusnas RI</strong>. Klik <strong>"Buka di Perpusnas"</strong> di bawah (nomor ISBN otomatis disalin), lalu salin baris data dari web Perpusnas dan klik <strong>"Tempel Data Perpusnas"</strong>.`
      );
      showToast('⚠️ Belum ada di Google Books. Cek Perpusnas di bawah.');
      return;
    }

    // Gabungkan judul & subjudul jika ada
    const fullTitle = bookInfo.subtitle ? `${bookInfo.title}: ${bookInfo.subtitle}` : bookInfo.title;

    // Susun deskripsi otomatis yang rapi dan informatif
    const descParts = [];
    if (bookInfo.publisher) descParts.push(`Penerbit: ${bookInfo.publisher}`);
    if (bookInfo.publishedDate) descParts.push(`Tahun: ${bookInfo.publishedDate}`);
    if (bookInfo.pageCount) descParts.push(bookInfo.pageCount);
    if (bookInfo.isbn) descParts.push(`ISBN: ${bookInfo.isbn}`);
    if (bookInfo.categories) descParts.push(`Kategori: ${bookInfo.categories}`);
    if (bookInfo.description) {
      const cleanDesc = bookInfo.description.replace(/\s+/g, ' ').trim();
      const shortDesc = cleanDesc.length > 250 ? cleanDesc.slice(0, 247) + '...' : cleanDesc;
      descParts.push(`Sinopsis: "${shortDesc}"`);
    }

    // Isi ke form
    if (titleInput) {
      titleInput.value = fullTitle;
      titleInput.classList.remove('invalid');
      if (titleError) titleError.textContent = '';
    }
    if (authorInput) {
      authorInput.value = bookInfo.authors || 'Penulis Tidak Diketahui';
      authorInput.classList.remove('invalid');
      if (authorError) authorError.textContent = '';
    }
    if (descriptionInput) {
      descriptionInput.value = descParts.join(' • ');
    }

    setIsbnStatus('success', `✅ Data ditemukan via ${bookInfo.source}: <strong>${escapeHtml(fullTitle)}</strong>`);
    showToast(`✅ Data buku ditemukan via ${bookInfo.source}!`);

  } catch (err) {
    console.error('Lookup error:', err);
    setIsbnStatus('error', '⚠️ Terjadi kendala saat menghubungi database buku. Periksa koneksi internet Anda.');
    showToast('⚠️ Gagal menghubungi database buku.');
  } finally {
    if (btnLookupIsbn) btnLookupIsbn.disabled = false;
  }
}

async function startBarcodeScanner() {
  if (typeof Html5Qrcode === 'undefined') {
    showToast('⚠️ Library scanner belum siap. Coba muat ulang halaman.');
    return;
  }

  openModal(modalBarcodeScanner);
  if (scannerStatusEl) {
    scannerStatusEl.className = 'scanner-status';
    scannerStatusEl.innerHTML = '<span class="scanner-spinner">🔄</span> Menghubungkan ke kamera...';
  }

  try {
    if (!html5QrCodeScanner) {
      html5QrCodeScanner = new Html5Qrcode('scanner-reader');
    }

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 160 },
      aspectRatio: 1.0,
      formatsToSupport: (typeof Html5QrcodeSupportedFormats !== 'undefined') ? [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.UPC_A
      ] : undefined
    };

    isScanning = true;

    await html5QrCodeScanner.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        onBarcodeScannedSuccess(decodedText);
      },
      () => {}
    );

    if (scannerStatusEl) {
      scannerStatusEl.innerHTML = '🟢 Kamera aktif. Arahkan ke barcode buku (EAN-13 / ISBN).';
    }

  } catch (err) {
    console.error('Scanner camera error:', err);
    isScanning = false;
    if (scannerStatusEl) {
      scannerStatusEl.className = 'scanner-status error';
      scannerStatusEl.innerHTML = '⚠️ Tidak dapat membuka kamera. Pastikan izin kamera telah disetujui di peramban Anda.';
    }
  }
}

async function stopBarcodeScanner() {
  if (html5QrCodeScanner && isScanning) {
    try {
      await html5QrCodeScanner.stop();
      html5QrCodeScanner.clear();
    } catch (e) {
      console.warn('Error stopping scanner:', e);
    }
    isScanning = false;
  }
}

function onBarcodeScannedSuccess(decodedText) {
  if (navigator.vibrate) {
    try { navigator.vibrate(120); } catch(e) {}
  }

  const clean = cleanIsbn(decodedText);
  if (isbnInput) {
    isbnInput.value = clean || decodedText;
  }

  showToast(`📷 Barcode terdeteksi: ${clean || decodedText}`);

  stopBarcodeScanner();
  closeModal(modalBarcodeScanner);

  lookupBookByIsbn(clean || decodedText);
}

// Event Listeners Fitur ISBN & Scanner
if (btnLookupIsbn) {
  btnLookupIsbn.addEventListener('click', () => {
    const val = isbnInput ? isbnInput.value.trim() : '';
    if (!val) {
      setIsbnStatus('error', '⚠️ Masukkan nomor ISBN terlebih dahulu.');
      if (isbnInput) isbnInput.focus();
      return;
    }
    lookupBookByIsbn(val);
  });
}

if (isbnInput) {
  isbnInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = isbnInput.value.trim();
      if (val) lookupBookByIsbn(val);
    }
  });

  isbnInput.addEventListener('input', () => {
    if (isbnStatusMessage && !isbnStatusMessage.classList.contains('hidden')) {
      setIsbnStatus('', '');
    }
  });
}

if (btnOpenScanner) {
  btnOpenScanner.addEventListener('click', () => {
    startBarcodeScanner();
  });
}

// Tombol Buka Pencarian Perpusnas
if (btnOpenPerpusnas) {
  btnOpenPerpusnas.addEventListener('click', async () => {
    const rawVal = isbnInput ? isbnInput.value.trim() : '';
    const isbn = cleanIsbn(rawVal);
    if (isbn) {
      try {
        await navigator.clipboard.writeText(isbn);
        showToast(`📋 ISBN ${isbn} disalin ke clipboard! Membuka Perpusnas...`);
      } catch (err) {
        showToast('🌐 Membuka pencarian Perpusnas...');
      }
    } else {
      showToast('🌐 Membuka pencarian Perpusnas...');
    }
    window.open('https://isbn.perpusnas.go.id/landing_page/search', '_blank', 'noopener,noreferrer');
  });
}

// Tombol Buka Modal Tempel Data Perpusnas
if (btnOpenPasteModal) {
  btnOpenPasteModal.addEventListener('click', () => {
    if (pastePerpusnasInput) {
      pastePerpusnasInput.value = '';
    }
    openModal(modalPastePerpusnas);
    setTimeout(() => {
      if (pastePerpusnasInput) pastePerpusnasInput.focus();
    }, 100);
  });
}

// Form Handler Smart Paste Perpusnas
if (pastePerpusnasForm) {
  pastePerpusnasForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = pastePerpusnasInput ? pastePerpusnasInput.value.trim() : '';
    if (!text) return;

    parseAndApplyPerpusnasData(text);
    closeModal(modalPastePerpusnas);
  });
}

function parseAndApplyPerpusnasData(rawText) {
  let title = '';
  let author = '';
  let publisher = '';
  let year = '';
  let isbn = '';

  // 1. Ekstrak ISBN jika ditemukan pola 978/979
  const isbnMatch = rawText.match(/\b(97[89][\d\-\s]{10,17}\b)/);
  if (isbnMatch) {
    isbn = cleanIsbn(isbnMatch[1]);
  }

  // 2. Ekstrak Tahun Terbit (4 digit 19xx atau 20xx)
  const yearMatch = rawText.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch) {
    year = yearMatch[1];
  }

  // 3. Deteksi format berbasis Tab (hasil salinan baris tabel DataTables Perpusnas)
  if (rawText.includes('\t')) {
    const parts = rawText.split('\t').map(p => p.trim()).filter(Boolean);
    parts.forEach((part, idx) => {
      if (!title && idx <= 1 && part.length > 1 && !/^(cetak|elektronik|\d+)$/i.test(part)) {
        title = part;
      } else if (!author && idx >= 2 && idx <= 4 && !/^(cetak|elektronik|non terjemahan|terjemahan|97[89]|\d{4})$/i.test(part)) {
        author = part;
      } else if (!publisher && idx >= 3 && idx <= 5 && !/^(cetak|elektronik|non terjemahan|terjemahan|97[89]|\d{4})$/i.test(part) && part !== author) {
        publisher = part;
      }
    });
  } else {
    // 4. Deteksi format berbasis Baris Baru (Newline)
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const candidateLines = lines.filter(line => {
      return !/^(cetak|elektronik|non terjemahan|terjemahan|aktif|lihat kdt|link buku|link kdt|isbn)$/i.test(line) &&
             !/^\b(19\d\d|20\d\d)\b$/.test(line) &&
             !/^(97[89][\d\-\s]{10,17})$/.test(line);
    });

    if (candidateLines.length > 0) title = candidateLines[0];
    if (candidateLines.length > 1) author = candidateLines[1];
    if (candidateLines.length > 2) publisher = candidateLines[2];
  }

  // Jika author masih kosong tetapi ada separator " / " pada judul
  if (!author && title.includes(' / ')) {
    const [t, a] = title.split(' / ');
    title = t.trim();
    author = a.trim();
  }

  // Terapkan ke formulir
  if (title && titleInput) {
    titleInput.value = title;
    titleInput.classList.remove('invalid');
    if (titleError) titleError.textContent = '';
  }

  if (author && authorInput) {
    authorInput.value = author;
    authorInput.classList.remove('invalid');
    if (authorError) authorError.textContent = '';
  }

  // Susun deskripsi rapi
  const descParts = [];
  if (publisher) descParts.push(`Penerbit: ${publisher}`);
  if (year) descParts.push(`Tahun: ${year}`);
  if (isbn) descParts.push(`ISBN: ${isbn}`);

  if (descParts.length > 0 && descriptionInput) {
    descriptionInput.value = descParts.join(' • ');
  }

  if (isbn && isbnInput && !isbnInput.value) {
    isbnInput.value = isbn;
  }

  setIsbnStatus('success', `✅ Data dari Perpusnas berhasil dimasukkan: <strong>${escapeHtml(title || 'Buku')}</strong>`);
  showToast('✅ Data dari Perpusnas berhasil dimasukkan!');
}




// ==========================================================================
// Validasi & Event Form Tambah Buku
// ==========================================================================
function validateBookForm() {
  let isValid = true;
  const titleVal = titleInput.value.trim();
  const authorVal = authorInput.value.trim();

  if (!titleVal) {
    titleInput.classList.add('invalid');
    titleError.textContent = 'Judul buku wajib diisi.';
    isValid = false;
  } else {
    titleInput.classList.remove('invalid');
    titleError.textContent = '';
  }

  if (!authorVal) {
    authorInput.classList.add('invalid');
    authorError.textContent = 'Nama penulis wajib diisi.';
    isValid = false;
  } else {
    authorInput.classList.remove('invalid');
    authorError.textContent = '';
  }

  return isValid;
}

if (bookForm) {
  bookForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (validateBookForm()) {
      const descriptionVal = descriptionInput ? descriptionInput.value : '';
      addBook(titleInput.value, authorInput.value, isReadCheckbox.checked, descriptionVal);
    }
  });
}

if (titleInput) {
  titleInput.addEventListener('input', () => {
    if (titleInput.value.trim()) {
      titleInput.classList.remove('invalid');
      titleError.textContent = '';
    }
  });
}

if (authorInput) {
  authorInput.addEventListener('input', () => {
    if (authorInput.value.trim()) {
      authorInput.classList.remove('invalid');
      authorError.textContent = '';
    }
  });
}

// ==========================================================================
// Pencarian & Filter Tabs
// ==========================================================================
filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderBooks();
  });
});

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    if (searchQuery.trim().length > 0) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }
    renderBooks();
  });
}

if (clearSearchBtn) {
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    searchInput.focus();
    renderBooks();
  });
}

// ==========================================================================
// Inisialisasi Aplikasi (Kompatibel dengan segala kondisi loading DOM)
// ==========================================================================
function initApp() {
  initAuth();

  if (isFirebaseConfigured() && db) {
    initializeFirebaseSync();
  } else {
    updateSyncStatus('offline', 'Mode Offline (LocalStorage)');
    loadFromLocalStorage();
  }
}

// Menjalankan aplikasi secara andal tanpa terpengaruh race-condition
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
