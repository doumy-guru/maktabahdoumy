/**
 * Aplikasi Koleksi Buku Pribadi
 * Mendukung Firebase Cloud Firestore & Auth, Tracking Peminjaman, Catatan/Review Buku,
 * serta LocalStorage Fallback (Mode Offline).
 */

import { 
  db, 
  auth,
  googleProvider,
  isFirebaseConfigured, 
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
  signInAnonymously
} from './firebase-config.js';

// Kunci penyimpanan LocalStorage
const STORAGE_KEY = 'PERSONAL_BOOKSHELF_APP_DATA';
const AUTH_STORAGE_KEY = 'PERSONAL_BOOKSHELF_MOCK_USER';

// State Aplikasi
let books = [];
let currentFilter = 'all'; // 'all' | 'unread' | 'read' | 'borrowed'
let searchQuery = '';
let isUsingFirebase = false;
let currentUser = null; // Object pengguna yang sedang aktif
let activeAuthTab = 'login'; // 'login' | 'register'
let selectedStarRating = 0;
let unsubscribeFirestore = null;

// ==========================================================================
// Selektor DOM
// ==========================================================================
// Form Tambah Buku
const bookForm = document.getElementById('book-form');
const titleInput = document.getElementById('book-title');
const authorInput = document.getElementById('book-author');
const isReadCheckbox = document.getElementById('book-is-read');
const titleError = document.getElementById('title-error');
const authorError = document.getElementById('author-error');

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

// Modal 1: Auth
const modalAuth = document.getElementById('modal-auth');
const authForm = document.getElementById('auth-form');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authModalTitle = document.getElementById('auth-modal-title');
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

// Toast
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

// Event listener tutup modal
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetModalId = btn.dataset.close;
    closeModal(document.getElementById(targetModalId));
  });
});

// Tutup modal jika klik overlay luar
[modalAuth, modalLoan, modalReview].forEach(modal => {
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
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
  }
});

// ==========================================================================
// Sistem Autentikasi Pengguna (Firebase Auth + Mock Offline)
// ==========================================================================
function updateAuthUI(user) {
  currentUser = user;

  if (user) {
    btnOpenAuth.classList.add('hidden');
    userProfile.classList.remove('hidden');

    const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Tamu');
    userName.textContent = displayName;
    userEmail.textContent = user.email || 'Mode Tamu / Offline';

    if (user.photoURL) {
      userAvatar.innerHTML = `<img src="${user.photoURL}" alt="${displayName}">`;
    } else {
      userAvatar.textContent = displayName.charAt(0).toUpperCase();
    }
  } else {
    btnOpenAuth.classList.remove('hidden');
    userProfile.classList.add('hidden');
    userName.textContent = '';
    userEmail.textContent = '';
    userAvatar.textContent = '👤';
  }
}

function setAuthError(msg) {
  if (!msg) {
    authErrorAlert.classList.add('hidden');
    authErrorAlert.textContent = '';
  } else {
    authErrorAlert.classList.remove('hidden');
    authErrorAlert.textContent = msg;
  }
}

btnOpenAuth.addEventListener('click', () => {
  setAuthError('');
  authForm.reset();
  openModal(modalAuth);
  setTimeout(() => authEmailInput.focus(), 100);
});

// Submit Form Email / Password (Hanya Login Pemilik Akun)
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
      const userCred = await signInWithEmailAndPassword(auth, email, password);
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

// Login Google
btnGoogleLogin.addEventListener('click', async () => {
  setAuthError('');
  if (isFirebaseConfigured() && auth) {
    try {
      const result = await signInWithPopup(auth, googleProvider);
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
      email: 'user.google@gmail.com',
      displayName: 'Pengguna Google',
      photoURL: null
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockUser));
    updateAuthUI(mockUser);
    showToast('👋 Masuk sebagai Pengguna Google (Mode Demo)');
    closeModal(modalAuth);
  }
});

// Login Tamu (Guest)
btnGuestLogin.addEventListener('click', async () => {
  if (isFirebaseConfigured() && auth) {
    try {
      const userCred = await signInAnonymously(auth);
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

// Logout
btnLogout.addEventListener('click', async () => {
  const confirmed = window.confirm('Apakah Anda yakin ingin keluar dari akun?');
  if (!confirmed) return;

  if (isFirebaseConfigured() && auth) {
    try {
      await signOut(auth);
      showToast('🚪 Anda telah keluar dari akun.');
    } catch (err) {
      console.error('Logout error:', err);
    }
  }
  localStorage.removeItem(AUTH_STORAGE_KEY);
  updateAuthUI(null);
  showToast('🚪 Berhasil keluar.');
});

// Inisialisasi Auth Listener
function initAuth() {
  if (isFirebaseConfigured() && auth) {
    onAuthStateChanged(auth, (user) => {
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
      books = JSON.parse(rawData);
    } else {
      // Data contoh awal
      books = [
        {
          id: 'sample-1',
          title: 'Filosofi Teras',
          author: 'Henry Manampiring',
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
    const booksCollection = collection(db, 'books');
    const booksQuery = query(booksCollection, orderBy('createdAt', 'desc'));

    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }

    unsubscribeFirestore = onSnapshot(booksQuery, (snapshot) => {
      isUsingFirebase = true;
      updateSyncStatus('online', '☁️ Tersinkronisasi Cloud (Firebase)');

      books = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || '',
          author: data.author || '',
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
      console.warn('Gagal menghubungkan ke Firestore Real-Time:', error.message);
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

  // Badge Status Baca
  const readBadge = document.createElement('span');
  readBadge.className = `status-badge ${book.isRead ? 'status-read' : 'status-unread'}`;
  readBadge.textContent = book.isRead ? '✓ Selesai Dibaca' : '⏳ Belum Dibaca';
  metaDiv.appendChild(readBadge);

  // Badge Status Pinjam
  const loanBadge = document.createElement('span');
  loanBadge.className = `status-badge ${book.isBorrowed ? 'status-borrowed' : 'status-available'}`;
  loanBadge.textContent = book.isBorrowed ? '🤝 Sedang Dipinjam' : '🟢 Tersedia';
  metaDiv.appendChild(loanBadge);

  detailsDiv.appendChild(titleEl);
  detailsDiv.appendChild(authorEl);
  detailsDiv.appendChild(metaDiv);
  mainRow.appendChild(detailsDiv);
  item.appendChild(mainRow);

  // 2. Info Peminjaman (Jika sedang dipinjam)
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

  // 4. Baris Tombol Aksi
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

  // Tombol Hapus Buku
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'btn btn-action btn-delete';
  deleteBtn.innerHTML = '<span>🗑️</span> Hapus';
  deleteBtn.setAttribute('aria-label', `Hapus buku ${book.title}`);
  deleteBtn.addEventListener('click', () => deleteBook(book.id, book.title));
  actionsBar.appendChild(deleteBtn);

  item.appendChild(actionsBar);

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
      (b.borrowerName && b.borrowerName.toLowerCase().includes(queryText))
    );
  }

  // Tampilan Kosong (Empty State)
  if (filteredBooks.length === 0) {
    emptyState.classList.remove('hidden');
    if (books.length === 0) {
      emptyText.textContent = 'Koleksi Anda masih kosong. Mulai tambahkan buku pertama Anda!';
    } else if (queryText) {
      emptyText.textContent = `Tidak ada buku yang cocok dengan pencarian "${searchQuery}".`;
    } else if (currentFilter === 'borrowed') {
      emptyText.textContent = 'Tidak ada buku yang sedang dipinjam saat ini.';
    } else if (currentFilter === 'unread') {
      emptyText.textContent = 'Hebat! Semua buku dalam koleksi telah selesai dibaca.';
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
async function addBook(title, author, isRead) {
  const formattedDate = new Date().toLocaleDateString('id-ID', { 
    day: 'numeric', month: 'short', year: 'numeric' 
  });

  const bookData = {
    title: title.trim(),
    author: author.trim(),
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
      await addDoc(collection(db, 'books'), {
        ...bookData,
        createdAt: serverTimestamp()
      });
      showToast(`☁️ Buku "${bookData.title}" tersimpan di Cloud!`);
    } catch (error) {
      console.error('Gagal menambahkan ke Firestore:', error);
      fallbackAddLocal(bookData);
    }
  } else {
    fallbackAddLocal(bookData);
  }

  bookForm.reset();
  titleInput.focus();
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
      const bookRef = doc(db, 'books', id);
      await updateDoc(bookRef, { isRead: newStatus });
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
      const bookRef = doc(db, 'books', id);
      await deleteDoc(bookRef);
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
  
  // Set default tanggal hari ini
  const today = new Date().toISOString().split('T')[0];
  borrowDateInput.value = today;

  // Set default tanggal kembali 14 hari ke depan
  const nextTwoWeeks = new Date();
  nextTwoWeeks.setDate(nextTwoWeeks.getDate() + 14);
  returnDeadlineInput.value = nextTwoWeeks.toISOString().split('T')[0];

  openModal(modalLoan);
  setTimeout(() => borrowerNameInput.focus(), 100);
}

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
      await updateDoc(doc(db, 'books', bookId), updateData);
      showToast(`🤝 Buku berhasil dipinjamkan ke ${borrowerName}!`);
    } catch (err) {
      console.error('Error pinjam Firestore:', err);
      localBorrowUpdate(bookId, updateData);
    }
  } else {
    localBorrowUpdate(bookId, updateData);
  }

  closeModal(modalLoan);
});

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
      await updateDoc(doc(db, 'books', bookId), returnData);
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
  starRatingText.textContent = rating > 0 ? ratingLabels[rating] : 'Pilih rating (opsional)';
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
      await updateDoc(doc(db, 'books', bookId), reviewData);
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

bookForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (validateBookForm()) {
    addBook(titleInput.value, authorInput.value, isReadCheckbox.checked);
  }
});

titleInput.addEventListener('input', () => {
  if (titleInput.value.trim()) {
    titleInput.classList.remove('invalid');
    titleError.textContent = '';
  }
});

authorInput.addEventListener('input', () => {
  if (authorInput.value.trim()) {
    authorInput.classList.remove('invalid');
    authorError.textContent = '';
  }
});

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

searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  if (searchQuery.trim().length > 0) {
    clearSearchBtn.classList.remove('hidden');
  } else {
    clearSearchBtn.classList.add('hidden');
  }
  renderBooks();
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  clearSearchBtn.classList.add('hidden');
  searchInput.focus();
  renderBooks();
});

// ==========================================================================
// Inisialisasi Aplikasi Saat Memuat Halaman
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initAuth();

  if (isFirebaseConfigured() && db) {
    initializeFirebaseSync();
  } else {
    updateSyncStatus('offline', 'Mode Offline (LocalStorage)');
    loadFromLocalStorage();
  }
});
