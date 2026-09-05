/**
 * Aplikasi Koleksi Buku Pribadi
 * Mendukung Firebase Cloud Firestore (Real-Time Sync) & LocalStorage (Fallback/Offline)
 */

import { 
  db, 
  isFirebaseConfigured, 
  collection, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp 
} from './firebase-config.js';

// Kunci penyimpanan LocalStorage (digunakan untuk fallback & mode offline)
const STORAGE_KEY = 'PERSONAL_BOOKSHELF_APP_DATA';

// State aplikasi
let books = [];
let currentFilter = 'all'; // 'all' | 'unread' | 'read'
let searchQuery = '';
let isUsingFirebase = false;

// Elemen DOM
const bookForm = document.getElementById('book-form');
const titleInput = document.getElementById('book-title');
const authorInput = document.getElementById('book-author');
const isReadCheckbox = document.getElementById('book-is-read');
const titleError = document.getElementById('title-error');
const authorError = document.getElementById('author-error');
const bookList = document.getElementById('book-list');
const emptyState = document.getElementById('empty-state');
const emptyText = document.getElementById('empty-text');

// Elemen Pencarian & Filter
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const filterButtons = document.querySelectorAll('.filter-btn');

// Elemen Statistik
const statTotal = document.getElementById('stat-total');
const statUnread = document.getElementById('stat-unread');
const statRead = document.getElementById('stat-read');

// Elemen Status Sinkronisasi
const syncBadge = document.getElementById('sync-badge');
const syncText = document.getElementById('sync-text');

// Timer toast notifikasi
let toastTimeout;

/**
 * Menampilkan pesan toast notifikasi ke pengguna
 * @param {string} message 
 */
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

/**
 * Memperbarui tampilan indikator sinkronisasi di header
 * @param {'online' | 'offline' | 'connecting'} status 
 * @param {string} text 
 */
function updateSyncStatus(status, text) {
  if (!syncBadge || !syncText) return;
  syncBadge.className = `sync-badge status-${status}`;
  syncText.textContent = text;
}

/**
 * Memeriksa apakah fitur LocalStorage didukung dan dapat diakses
 */
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

/**
 * Memuat data buku dari LocalStorage
 */
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
          createdAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        },
        {
          id: 'sample-2',
          title: 'Atomic Habits',
          author: 'James Clear',
          isRead: false,
          createdAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
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

/**
 * Menyimpan data buku ke LocalStorage
 */
function saveToLocalStorage() {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  } catch (error) {
    console.error('Gagal menyimpan data ke LocalStorage:', error);
  }
}

/**
 * Menginisialisasi koneksi Cloud Firestore dengan Real-Time Listener
 */
function initializeFirebaseSync() {
  updateSyncStatus('connecting', 'Menghubungkan ke Cloud...');

  try {
    const booksCollection = collection(db, 'books');
    const booksQuery = query(booksCollection, orderBy('createdAt', 'desc'));

    // Real-Time listener onSnapshot
    onSnapshot(booksQuery, (snapshot) => {
      isUsingFirebase = true;
      updateSyncStatus('online', '☁️ Tersinkronisasi Cloud (Firebase)');

      books = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || '',
          author: data.author || '',
          isRead: Boolean(data.isRead),
          createdAt: data.createdAtFormatted || 'Baru saja'
        };
      });

      // Cadangkan juga ke localStorage untuk akses cepat
      saveToLocalStorage();
      renderBooks();
    }, (error) => {
      console.warn('Gagal menghubungkan ke Firestore Real-Time:', error.message);
      isUsingFirebase = false;
      updateSyncStatus('offline', 'Mode Offline (LocalStorage)');
      showToast('⚠️ Firestore offline / periksa izin database');
      loadFromLocalStorage();
    });

  } catch (error) {
    console.warn('Error inisialisasi query Firestore:', error);
    isUsingFirebase = false;
    updateSyncStatus('offline', 'Mode Offline (LocalStorage)');
    loadFromLocalStorage();
  }
}

/**
 * Memperbarui ringkasan statistik buku
 */
function updateStats() {
  const total = books.length;
  const readCount = books.filter(b => b.isRead).length;
  const unreadCount = total - readCount;

  if (statTotal) statTotal.textContent = total;
  if (statRead) statRead.textContent = readCount;
  if (statUnread) statUnread.textContent = unreadCount;
}

/**
 * Membuat elemen kartu buku di DOM secara aman (mencegah XSS)
 * @param {Object} book
 * @returns {HTMLElement}
 */
function createBookElement(book) {
  const item = document.createElement('article');
  item.className = 'book-item';
  item.dataset.id = book.id;

  // Bagian Detail Buku
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

  // Meta info (Badge status)
  const metaDiv = document.createElement('div');
  metaDiv.className = 'book-meta';

  const statusBadge = document.createElement('span');
  statusBadge.className = `status-badge ${book.isRead ? 'status-read' : 'status-unread'}`;
  statusBadge.textContent = book.isRead ? '✓ Selesai Dibaca' : '⏳ Belum Dibaca';

  metaDiv.appendChild(statusBadge);

  detailsDiv.appendChild(titleEl);
  detailsDiv.appendChild(authorEl);
  detailsDiv.appendChild(metaDiv);

  // Bagian Tombol Aksi
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'book-actions';

  // Tombol Toggle Status
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'btn btn-action btn-toggle';
  toggleBtn.innerHTML = book.isRead 
    ? '<span>🔄</span> Tandai Belum Dibaca' 
    : '<span>✅</span> Tandai Selesai';
  toggleBtn.setAttribute('aria-label', `Ubah status baca buku ${book.title}`);
  toggleBtn.addEventListener('click', () => toggleBookStatus(book.id));

  // Tombol Hapus Buku
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'btn btn-action btn-delete';
  deleteBtn.innerHTML = '<span>🗑️</span> Hapus';
  deleteBtn.setAttribute('aria-label', `Hapus buku ${book.title} dari koleksi`);
  deleteBtn.addEventListener('click', () => deleteBook(book.id, book.title));

  actionsDiv.appendChild(toggleBtn);
  actionsDiv.appendChild(deleteBtn);

  item.appendChild(detailsDiv);
  item.appendChild(actionsDiv);

  return item;
}

/**
 * Me-render daftar buku sesuai filter status dan kata kunci pencarian yang aktif
 */
function renderBooks() {
  bookList.innerHTML = '';

  // Filter berdasarkan status baca
  let filteredBooks = books;
  if (currentFilter === 'unread') {
    filteredBooks = books.filter(b => !b.isRead);
  } else if (currentFilter === 'read') {
    filteredBooks = books.filter(b => b.isRead);
  }

  // Filter berdasarkan kata kunci pencarian
  const queryText = searchQuery.trim().toLowerCase();
  if (queryText) {
    filteredBooks = filteredBooks.filter(b => 
      b.title.toLowerCase().includes(queryText) || 
      b.author.toLowerCase().includes(queryText)
    );
  }

  // Cek apakah daftar kosong
  if (filteredBooks.length === 0) {
    emptyState.classList.remove('hidden');
    if (books.length === 0) {
      emptyText.textContent = 'Koleksi Anda masih kosong. Mulai tambahkan buku pertama Anda menggunakan formulir!';
    } else if (queryText) {
      emptyText.textContent = `Tidak ada buku yang cocok dengan pencarian "${searchQuery}".`;
    } else if (currentFilter === 'unread') {
      emptyText.textContent = 'Hebat! Tidak ada buku yang belum dibaca.';
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

  // Perbarui statistik
  updateStats();
}

/**
 * Menambahkan buku baru (Firestore / LocalStorage)
 * @param {string} title 
 * @param {string} author 
 * @param {boolean} isRead 
 */
async function addBook(title, author, isRead) {
  const formattedDate = new Date().toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });

  const bookData = {
    title: title.trim(),
    author: author.trim(),
    isRead: Boolean(isRead),
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
      console.error('Gagal menambahkan buku ke Firestore:', error);
      showToast('⚠️ Gagal menyimpan ke cloud, menyimpan lokal...');
      fallbackAddLocal(bookData);
    }
  } else {
    fallbackAddLocal(bookData);
  }

  // Reset form
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

/**
 * Mengubah status baca buku (Firestore / LocalStorage)
 * @param {string} id 
 */
async function toggleBookStatus(id) {
  const target = books.find(b => b.id === id);
  if (!target) return;

  const newStatus = !target.isRead;
  const statusLabel = newStatus ? 'Selesai Dibaca' : 'Belum Dibaca';

  if (isUsingFirebase && db) {
    try {
      const bookRef = doc(db, 'books', id);
      await updateDoc(bookRef, { isRead: newStatus });
      showToast(`☁️ Status diubah: ${statusLabel}`);
    } catch (error) {
      console.error('Gagal mengupdate status di Firestore:', error);
      target.isRead = newStatus;
      saveToLocalStorage();
      renderBooks();
      showToast(`🔄 Status diubah secara lokal: ${statusLabel}`);
    }
  } else {
    target.isRead = newStatus;
    saveToLocalStorage();
    renderBooks();
    showToast(`🔄 Status diubah: ${statusLabel}`);
  }
}

/**
 * Menghapus buku (Firestore / LocalStorage)
 * @param {string} id 
 * @param {string} title 
 */
async function deleteBook(id, title) {
  const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus buku "${title}" dari koleksi?`);
  if (!confirmed) return;

  if (isUsingFirebase && db) {
    try {
      showToast('🗑️ Menghapus dari Cloud...');
      const bookRef = doc(db, 'books', id);
      await deleteDoc(bookRef);
      showToast(`🗑️ Buku "${title}" dihapus dari Cloud`);
    } catch (error) {
      console.error('Gagal menghapus buku dari Firestore:', error);
      books = books.filter(b => b.id !== id);
      saveToLocalStorage();
      renderBooks();
      showToast(`🗑️ Buku "${title}" dihapus secara lokal`);
    }
  } else {
    books = books.filter(b => b.id !== id);
    saveToLocalStorage();
    renderBooks();
    showToast(`🗑️ Buku "${title}" dihapus dari LocalStorage`);
  }
}

/**
 * Validasi form tambah buku
 * @returns {boolean}
 */
function validateForm() {
  let isValid = true;
  const titleVal = titleInput.value.trim();
  const authorVal = authorInput.value.trim();

  // Validasi judul
  if (!titleVal) {
    titleInput.classList.add('invalid');
    titleError.textContent = 'Judul buku wajib diisi.';
    isValid = false;
  } else {
    titleInput.classList.remove('invalid');
    titleError.textContent = '';
  }

  // Validasi penulis
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

// ==========================================================================
// Event Listeners
// ==========================================================================

// Handle submit form
bookForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (validateForm()) {
    addBook(titleInput.value, authorInput.value, isReadCheckbox.checked);
  }
});

// Bersihkan error saat pengguna mengetik
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

// Handle tab filter status
filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderBooks();
  });
});

// Handle pencarian realtime
searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  if (searchQuery.trim().length > 0) {
    clearSearchBtn.classList.remove('hidden');
  } else {
    clearSearchBtn.classList.add('hidden');
  }
  renderBooks();
});

// Handle tombol reset pencarian (✕)
clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  clearSearchBtn.classList.add('hidden');
  searchInput.focus();
  renderBooks();
});

// ==========================================================================
// Inisialisasi Aplikasi
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  if (isFirebaseConfigured() && db) {
    initializeFirebaseSync();
  } else {
    updateSyncStatus('offline', 'Mode Offline (LocalStorage)');
    loadFromLocalStorage();
  }
});
