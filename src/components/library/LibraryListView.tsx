import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Library,
  Search,
  BookOpen,
  X,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { LibraryBook } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { recordLibraryVisit } from '../../firebase/services';
import {
  LIBRARY_VISIT_SESSION_KEY,
  LibraryLoadErrorInfo,
  shouldRecordLibraryVisit
} from '../../utils/libraryHelper';
import { LibraryCard } from './LibraryCard';

interface LibraryListViewProps {
  books: LibraryBook[];
  loading?: boolean;
  error?: LibraryLoadErrorInfo | null;
  retrying?: boolean;
  onRetry?: () => void;
  onSelectBook: (book: LibraryBook) => void;
}

export const LibraryListView: React.FC<LibraryListViewProps> = ({
  books,
  loading = false,
  error = null,
  retrying = false,
  onRetry,
  onSelectBook
}) => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const visitRecordedRef = useRef<boolean>(false);

  // Non-blocking public visit tracking:
  // - Never blocks page render
  // - Never counts admin activity
  // - Prevents duplicate counting on React re-renders and within the same browser session
  useEffect(() => {
    let alreadyRecordedInSession = false;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        alreadyRecordedInSession = window.sessionStorage.getItem(LIBRARY_VISIT_SESSION_KEY) === '1';
      } catch {
        alreadyRecordedInSession = false;
      }
    }

    const shouldRecord = shouldRecordLibraryVisit({
      isAdmin,
      authLoading,
      alreadyRecordedInMemory: visitRecordedRef.current,
      alreadyRecordedInSession
    });

    if (!shouldRecord) return;

    visitRecordedRef.current = true;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        window.sessionStorage.setItem(LIBRARY_VISIT_SESSION_KEY, '1');
      } catch {
        // ignore storage quota restrictions
      }
    }

    // Fire-and-forget Firestore increment
    void recordLibraryVisit();
  }, [isAdmin, authLoading]);

  // Public page ALWAYS displays only published books (never drafts)
  const publishedBooks = useMemo(
    () => books.filter(book => book.status === 'published'),
    [books]
  );

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return publishedBooks;
    return publishedBooks.filter(book =>
      book.title.toLowerCase().includes(q) ||
      (book.titleAr && book.titleAr.includes(q)) ||
      (book.category && book.category.toLowerCase().includes(q)) ||
      (book.author && book.author.toLowerCase().includes(q)) ||
      (book.description && book.description.toLowerCase().includes(q))
    );
  }, [publishedBooks, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8 animate-fade-in font-sans">
      {/* HERO / HEADER SECTION */}
      <div className="relative overflow-hidden rounded-lg bg-[#123D32] dark:bg-[#1F5F63] text-[#FAF7F0] dark:text-[#CEFEF1] p-5 sm:p-9 border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[5px_5px_0px_#171717] dark:shadow-[5px_5px_0px_#001722]">
        <div className="max-w-2xl space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#D6AD52] border-2 border-[#171717] text-[#171717] text-[11px] font-extrabold uppercase tracking-wider">
            <Library className="w-3.5 h-3.5" />
            <span>Library Digital</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif tracking-tight text-white leading-tight">
            Koleksi Buku &amp; Kitab Ilmiah Dars with Osama
          </h1>

          <p className="text-[#FAF7F0]/90 dark:text-[#A6D6C9] text-xs sm:text-sm leading-relaxed">
            Akses koleksi buku pilihan, panduan ilmiah, serta naskah kitab yang dapat dibaca langsung maupun melalui tautan dokumen resmi.
          </p>

          {/* SEARCH BAR */}
          <div className="pt-1 max-w-lg">
            <div className="relative flex items-center bg-white dark:bg-[#001722] border-2 border-[#171717] dark:border-[#4CA7A1] rounded-md shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]">
              <Search className="w-4 h-4 absolute left-3.5 text-[#123D32] dark:text-[#4CA7A1]" />
              <input
                type="text"
                data-testid="library-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul buku, kitab, atau penulis..."
                className="w-full pl-10 pr-9 py-2.5 sm:py-3 bg-transparent text-xs sm:text-sm font-semibold text-[#171717] dark:text-[#CEFEF1] placeholder:text-[#525855] dark:placeholder:text-[#A6D6C9] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Hapus pencarian"
                  className="absolute right-2.5 p-1 text-[#525855] dark:text-[#A6D6C9] hover:text-[#171717] dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION HEADER */}
      <div className="flex items-center justify-between gap-3 border-b-2 border-[#171717] dark:border-[#4CA7A1] pb-3">
        <h2 className="text-base sm:text-xl font-bold font-serif text-[#171717] dark:text-[#CEFEF1] flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#123D32] dark:text-[#4CA7A1]" />
          <span>Koleksi Tersedia ({filteredBooks.length})</span>
        </h2>
      </div>

      {/* LOADING SKELETON */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="nb-card p-3 sm:p-4 space-y-3 animate-pulse">
              <div className="aspect-[3/4] w-full rounded bg-[#171717]/10 dark:bg-[#0D2B36]" />
              <div className="h-4 bg-[#171717]/10 dark:bg-[#0D2B36] rounded w-4/5" />
              <div className="h-3 bg-[#171717]/10 dark:bg-[#0D2B36] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error && publishedBooks.length === 0 ? (
        /* DISTINCT ERROR STATE — NEVER DISGUISE PERMISSION OR NETWORK FAILURES AS EMPTY LIBRARY */
        <div
          data-testid="library-error-state"
          data-error-category={error.category}
          className="nb-card bg-white dark:bg-[#0D2B36] p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto border-2 border-[#171717] dark:border-[#D6AD52]"
        >
          <div className="w-14 h-14 mx-auto rounded-lg bg-[#FEF2F2] dark:bg-[#3A1E24] border-2 border-[#171717] dark:border-[#F87171] flex items-center justify-center shadow-[3px_3px_0px_#171717]">
            <AlertTriangle className="w-7 h-7 text-[#B91C1C] dark:text-[#FCA5A5]" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold font-serif text-[#171717] dark:text-[#CEFEF1]">
              {error.title}
            </h3>
            <p className="text-xs sm:text-sm text-[#525855] dark:text-[#A6D6C9] leading-relaxed">
              {error.message}
            </p>
            {error.code && (
              <p className="text-[11px] font-mono text-[#525855]/80 dark:text-[#A6D6C9]/80">
                Kode: {error.code}
              </p>
            )}
          </div>
          {error.canRetry && onRetry && (
            <button
              type="button"
              data-testid="library-retry-btn"
              disabled={retrying}
              onClick={onRetry}
              className="nb-btn nb-btn-primary px-5 py-2.5 text-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
              <span>{retrying ? 'Memuat Ulang...' : 'Coba Muat Ulang'}</span>
            </button>
          )}
        </div>
      ) : publishedBooks.length === 0 ? (
        /* CLEAN EMPTY STATE WHEN NO PUBLISHED BOOKS EXIST */
        <div
          data-testid="library-empty-state"
          className="nb-card bg-white dark:bg-[#0D2B36] p-10 sm:p-14 text-center space-y-3 max-w-xl mx-auto"
        >
          <div className="w-14 h-14 mx-auto rounded-lg bg-[#FAF7F0] dark:bg-[#1F5F63] border-2 border-[#171717] dark:border-[#4CA7A1] flex items-center justify-center shadow-[3px_3px_0px_#171717]">
            <Library className="w-7 h-7 text-[#123D32] dark:text-[#CEFEF1]" />
          </div>
          <h3 className="text-lg font-bold font-serif text-[#171717] dark:text-[#CEFEF1]">
            Koleksi Library Digital Belum Tersedia
          </h3>
          <p className="text-xs sm:text-sm text-[#525855] dark:text-[#A6D6C9] leading-relaxed">
            Saat ini belum ada buku atau kitab yang diterbitkan di Library Digital. Silakan kunjungi kembali dalam waktu dekat.
          </p>
        </div>
      ) : filteredBooks.length === 0 ? (
        /* EMPTY SEARCH STATE */
        <div className="nb-card bg-white dark:bg-[#0D2B36] p-10 text-center space-y-3 max-w-lg mx-auto">
          <Search className="w-9 h-9 mx-auto text-[#123D32] dark:text-[#4CA7A1] opacity-75" />
          <p className="text-sm font-bold text-[#171717] dark:text-[#CEFEF1]">
            Tidak ditemukan buku untuk kata kunci &ldquo;{searchQuery}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="nb-btn nb-btn-primary px-4 py-2 text-xs cursor-pointer"
          >
            Tampilkan Semua Buku
          </button>
        </div>
      ) : (
        /* RESPONSIVE BOOK COLLECTION GRID (Aligned with CourseCatalog) */
        <div
          data-testid="library-book-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6 items-stretch"
        >
          {filteredBooks.map(book => (
            <LibraryCard
              key={book.id}
              book={book}
              onSelect={onSelectBook}
            />
          ))}
        </div>
      )}
    </div>
  );
};
