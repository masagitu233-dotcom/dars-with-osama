import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Library,
  Search,
  BookOpen,
  ExternalLink,
  Clock,
  X
} from 'lucide-react';
import { LibraryBook } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { recordLibraryVisit } from '../../firebase/services';
import {
  getLibraryCoverAspectClass,
  LIBRARY_VISIT_SESSION_KEY,
  shouldRecordLibraryVisit
} from '../../utils/libraryHelper';
import { autoWrapArabicText } from '../../utils/arabicFontHelper';
import { ResilientGoogleDriveImage } from '../common/ResilientGoogleDriveImage';

interface LibraryListViewProps {
  books: LibraryBook[];
  loading?: boolean;
  onSelectBook: (book: LibraryBook) => void;
}

export const LibraryListView: React.FC<LibraryListViewProps> = ({
  books,
  loading = false,
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
        /* RESPONSIVE BOOK COLLECTION GRID */
        <div
          data-testid="library-book-grid"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 items-start"
        >
          {filteredBooks.map(book => {
            const aspectClass = getLibraryCoverAspectClass(book.coverAspectRatio);
            const isExternalDrive = book.sourceType === 'google_drive' && Boolean(book.googleDriveUrl);

            const cardInner = (
              <>
                {/* Cover Frame respecting 3:4 or 9:16 proportion without auto-cropping */}
                <div className="w-full bg-[#FAF7F0] dark:bg-[#001722] border-b-2 border-[#171717] dark:border-[#4CA7A1] p-2.5 sm:p-3 flex items-center justify-center">
                  <div className={`w-full ${aspectClass} rounded-sm overflow-hidden bg-[#EFE5D2]/70 dark:bg-[#0D2B36] border border-[#171717]/20 dark:border-[#4CA7A1]/30 relative flex items-center justify-center`}>
                    {book.coverImageUrl ? (
                      <ResilientGoogleDriveImage
                        src={book.coverImageUrl}
                        alt={book.title}
                        aspectRatioClass={aspectClass}
                        objectFit="contain"
                        className="w-full h-full bg-[#FAF7F0] dark:bg-[#0D2B36]"
                        imageClassName="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-[#123D32] dark:text-[#A6D6C9] gap-2">
                        <BookOpen className="w-8 h-8 opacity-60" />
                        <span className="text-[11px] font-bold opacity-75 line-clamp-2">
                          {book.title}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Book Title & Subtle Source Cue */}
                <div className="p-3 sm:p-4 space-y-1.5 flex-1 flex flex-col justify-between bg-white dark:bg-[#0D2B36]">
                  <div className="space-y-1">
                    <h3
                      className="font-serif font-bold text-sm sm:text-base text-[#171717] dark:text-[#CEFEF1] group-hover:text-[#123D32] dark:group-hover:text-[#D6AD52] leading-snug line-clamp-2 transition-colors"
                      dangerouslySetInnerHTML={{ __html: autoWrapArabicText(book.title) }}
                    />
                    {book.titleAr && (
                      <p
                        dir="rtl"
                        className="font-amiri text-sm text-[#123D32] dark:text-[#A6D6C9] font-bold truncate leading-relaxed"
                      >
                        {book.titleAr}
                      </p>
                    )}
                    {book.author && (
                      <p className="text-[11px] font-semibold text-[#525855] dark:text-[#A6D6C9]/85 truncate">
                        {book.author}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 mt-1 border-t border-[#171717]/10 dark:border-[#4CA7A1]/25 flex items-center justify-between gap-2 text-[11px] font-extrabold text-[#123D32] dark:text-[#4CA7A1]">
                    {isExternalDrive ? (
                      <>
                        <span className="inline-flex items-center gap-1">
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span>Google Drive</span>
                        </span>
                        <span>Lihat Detail →</span>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{book.readingTimeMinutes || 1} min</span>
                        </span>
                        <span>Lihat Detail →</span>
                      </>
                    )}
                  </div>
                </div>
              </>
            );

            return (
              <button
                key={book.id}
                type="button"
                onClick={() => onSelectBook(book)}
                data-testid={`library-book-card-${book.id}`}
                data-book-source={isExternalDrive ? 'google_drive' : 'internal'}
                className="nb-card-interactive overflow-hidden flex flex-col group text-left h-full w-full cursor-pointer"
              >
                {cardInner}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
