import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Copy,
  Check,
  Clock,
  Calendar,
  ExternalLink,
  Library,
  User
} from 'lucide-react';
import { LibraryBook } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ResilientGoogleDriveImage } from '../common/ResilientGoogleDriveImage';
import {
  getLibraryCoverAspectClass,
  parseLibraryBookCategories
} from '../../utils/libraryHelper';
import { autoWrapArabicText } from '../../utils/arabicFontHelper';

interface LibraryBookDetailViewProps {
  book: LibraryBook;
  onBack: () => void;
  onOpenReader: (book: LibraryBook) => void;
}

export const LibraryBookDetailView: React.FC<LibraryBookDetailViewProps> = ({
  book,
  onBack,
  onOpenReader
}) => {
  const { isAdmin } = useAuth();
  const [copied, setCopied] = useState(false);

  const aspectClass = getLibraryCoverAspectClass(book.coverAspectRatio);
  const isExternalDrive = book.sourceType === 'google_drive' && Boolean(book.googleDriveUrl);
  const categories = parseLibraryBookCategories(book.category);
  const trimmedDescription = (book.description || '').trim();
  const trimmedAuthor = (book.author || '').trim();

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://darswithosama.com';
  const detailUrl = `${origin}/library/${encodeURIComponent(book.slug || book.id)}`;

  const formattedPublishedDate = useMemo(() => {
    const rawDate = book.publishedAt || book.createdAt;
    if (!rawDate) return '';
    try {
      const parsedDate = new Date(rawDate);
      if (Number.isNaN(parsedDate.getTime())) return '';
      return parsedDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  }, [book.publishedAt, book.createdAt]);

  const handleCopyLink = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(detailUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = detailUrl;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy book detail link:', err);
    }
  };

  return (
    <div
      data-testid="library-book-detail-page"
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-9 pb-16 space-y-5 sm:space-y-7 animate-fade-in font-sans"
    >
      {/* TOP NAVIGATION & SHARE BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          data-testid="library-detail-back-btn"
          onClick={onBack}
          className="px-3.5 py-2 text-xs font-extrabold rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] text-[#171717] dark:text-[#CEFEF1] bg-white dark:bg-[#0D2B36] hover:bg-[#EFE5D2] dark:hover:bg-[#1F5F63] transition-all inline-flex items-center gap-2 cursor-pointer shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Library</span>
        </button>

        <button
          type="button"
          data-testid="library-detail-copy-link-btn"
          onClick={handleCopyLink}
          className="px-3.5 py-2 text-xs font-extrabold rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] text-[#171717] dark:text-[#CEFEF1] bg-white dark:bg-[#0D2B36] hover:bg-[#EFE5D2] dark:hover:bg-[#1F5F63] transition-all inline-flex items-center gap-2 cursor-pointer shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]"
          title="Salin tautan halaman detail kitab ini"
        >
          {copied ? (
            <Check className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1]" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          <span>{copied ? 'Link Disalin!' : 'Salin Link Kitab'}</span>
        </button>
      </div>

      {/* MAIN BOOK DETAIL CARD */}
      <section className="nb-card bg-white dark:bg-[#0D2B36] overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 p-5 sm:p-8 lg:p-10 items-start">
          {/* BOOK COVER COLUMN (Respects stored 3:4 or 9:16 ratio without cropping) */}
          <div className="md:col-span-5 flex justify-center">
            <div className="w-full max-w-[260px] sm:max-w-[300px] md:max-w-[320px]">
              <div
                className={`w-full ${aspectClass} rounded-md overflow-hidden bg-[#FAF7F0] dark:bg-[#001722] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[5px_5px_0px_#171717] dark:shadow-[5px_5px_0px_#001722] flex items-center justify-center`}
              >
                {book.coverImageUrl ? (
                  <ResilientGoogleDriveImage
                    src={book.coverImageUrl}
                    alt={book.title}
                    aspectRatioClass={aspectClass}
                    objectFit="contain"
                    className="w-full h-full bg-[#FAF7F0] dark:bg-[#001722]"
                    imageClassName="w-full h-full object-contain"
                    isAdmin={isAdmin}
                    showAdminDiagnostic={isAdmin}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-[#123D32] dark:text-[#A6D6C9] gap-3">
                    <BookOpen className="w-12 h-12 opacity-60" />
                    <span className="text-xs font-bold opacity-80 leading-snug">
                      {book.title}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BOOK METADATA & PRIMARY ACTION COLUMN */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              {/* Metadata Badges Row */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#123D32] dark:bg-[#4CA7A1] text-[#FAF7F0] dark:text-[#001722] border border-[#171717] text-[10px] uppercase tracking-wider">
                  <Library className="w-3 h-3" />
                  <span>Library Digital</span>
                </span>

                {categories.map((catName, idx) => (
                  <span
                    key={idx}
                    data-testid={`library-detail-category-${idx}`}
                    className="inline-flex items-center px-2.5 py-1 rounded bg-[#F0BE49] text-[#0F3D3A] border border-[#171717] text-[10px] uppercase tracking-wider shadow-[1.5px_1.5px_0px_#171717]"
                  >
                    {catName}
                  </span>
                ))}

                {book.status === 'draft' && isAdmin && (
                  <span className="px-2.5 py-1 rounded bg-[#D6AD52] text-[#171717] border border-[#171717] text-[10px] uppercase tracking-wider">
                    Pratinjau Draf (Admin)
                  </span>
                )}
              </div>

              {/* Full Book Title & Optional Arabic Title */}
              <div className="space-y-2">
                <h1
                  data-testid="library-detail-title"
                  className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif text-[#123D32] dark:text-[#CEFEF1] leading-tight tracking-tight"
                  dangerouslySetInnerHTML={{ __html: autoWrapArabicText(book.title) }}
                />

                {book.titleAr && (
                  <p
                    dir="rtl"
                    className="font-amiri text-xl sm:text-2xl text-[#0F3D3A] dark:text-[#D6AD52] font-bold leading-[2.0]"
                  >
                    {book.titleAr}
                  </p>
                )}
              </div>

              {/* Author & Additional Metadata */}
              {(trimmedAuthor || (!isExternalDrive && book.readingTimeMinutes) || formattedPublishedDate) && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3 border-y-2 border-[#171717]/15 dark:border-[#4CA7A1]/30 text-xs sm:text-sm">
                  {trimmedAuthor && (
                    <div className="inline-flex items-center gap-1.5 text-[#525855] dark:text-[#A6D6C9] font-semibold">
                      <User className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1] shrink-0" />
                      <span>Penulis / Penyusun:</span>
                      <span className="font-extrabold text-[#171717] dark:text-[#CEFEF1]">
                        {trimmedAuthor}
                      </span>
                    </div>
                  )}

                  {!isExternalDrive && (book.readingTimeMinutes || 0) > 0 && (
                    <div className="inline-flex items-center gap-1.5 text-[#525855] dark:text-[#A6D6C9] font-bold">
                      <Clock className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1] shrink-0" />
                      <span>Estimasi {book.readingTimeMinutes} Menit Baca</span>
                    </div>
                  )}

                  {formattedPublishedDate && (
                    <div className="inline-flex items-center gap-1.5 text-[#525855] dark:text-[#A6D6C9] font-semibold">
                      <Calendar className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1] shrink-0" />
                      <span>{formattedPublishedDate}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Optional Short Description (Omitted completely when empty) */}
              {trimmedDescription && (
                <div
                  data-testid="library-detail-description"
                  className="space-y-1.5"
                >
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#123D32] dark:text-[#4CA7A1]">
                    Tentang Kitab Ini
                  </h2>
                  <p className="text-sm sm:text-[15px] text-[#171717]/90 dark:text-[#CEFEF1]/90 leading-relaxed whitespace-pre-line">
                    {trimmedDescription}
                  </p>
                </div>
              )}
            </div>

            {/* PRIMARY CALL-TO-ACTION BUTTON ("Buka Kitab" / "Baca Kitab") */}
            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {isExternalDrive ? (
                <a
                  href={book.googleDriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="library-detail-open-book-btn"
                  className="nb-btn nb-btn-gold px-6 py-3.5 text-sm font-extrabold inline-flex items-center justify-center gap-2.5 no-underline"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  <span>Buka Kitab</span>
                </a>
              ) : (
                <button
                  type="button"
                  data-testid="library-detail-open-book-btn"
                  onClick={() => onOpenReader(book)}
                  className="nb-btn nb-btn-gold px-6 py-3.5 text-sm font-extrabold inline-flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>Baca Kitab</span>
                </button>
              )}

              <button
                type="button"
                onClick={onBack}
                className="nb-btn nb-btn-secondary px-5 py-3.5 text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Library className="w-4 h-4 shrink-0" />
                <span>Lihat Koleksi Lainnya</span>
              </button>
            </div>

            <p className="text-[11px] text-[#525855] dark:text-[#A6D6C9] leading-relaxed">
              {isExternalDrive
                ? 'Kitab ini tersedia melalui tautan Google Drive resmi dan akan dibuka di tab baru.'
                : 'Kitab ini dapat dibaca langsung di halaman baca internal lengkap dengan daftar isi otomatis dan pengaturan ukuran huruf.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
