import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Clock,
  Layers,
  Share2,
  Check
} from 'lucide-react';
import { LibraryBook } from '../../types';
import {
  getLibraryCoverAspectClass,
  buildLibraryBookShareData,
  parseLibraryBookCategories,
  isMultiVolumeLibraryBook
} from '../../utils/libraryHelper';
import { copyCourseUrlToClipboard } from '../../utils/courseShareHelper';
import { autoWrapArabicText } from '../../utils/arabicFontHelper';
import { ResilientGoogleDriveImage } from '../common/ResilientGoogleDriveImage';

interface LibraryCardProps {
  book: LibraryBook;
  onSelect: (book: LibraryBook) => void;
  className?: string;
  testIdPrefix?: string;
  aosDelay?: number;
}

export const LibraryCard: React.FC<LibraryCardProps> = ({
  book,
  onSelect,
  className = '',
  testIdPrefix = 'library-book-card',
  aosDelay = 0
}) => {
  const [copied, setCopied] = useState(false);

  const aspectClass = getLibraryCoverAspectClass(book.coverAspectRatio);
  const isMultiVolume = isMultiVolumeLibraryBook(book);
  const isExternalDrive = !isMultiVolume && book.sourceType === 'google_drive' && Boolean(book.googleDriveUrl);
  const categories = parseLibraryBookCategories(book.category);
  const trimmedAuthor = (book.author || '').trim();
  const trimmedDescription = (book.description || '').trim();
  const hasReadingTime = !isMultiVolume && !isExternalDrive && typeof book.readingTimeMinutes === 'number' && book.readingTimeMinutes > 0;
  const publishedVolumesCount = isMultiVolume && typeof book.publishedVolumesCount === 'number' && book.publishedVolumesCount > 0
    ? book.publishedVolumesCount
    : 0;

  // Reuse the same share flow as CourseCard (Web Share API -> Clipboard fallback)
  // Always shares the public Book Detail Page URL (/library/:slug)
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://darswithosama.com';
    const shareData = buildLibraryBookShareData(book, origin);

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareData.title,
          text: shareData.text,
          url: shareData.url
        });
        return;
      } catch (err: any) {
        if (err && err.name === 'AbortError') {
          return;
        }
      }
    }

    const ok = await copyCourseUrlToClipboard(shareData.url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(book);
    }
  };

  return (
    <div
      onClick={() => onSelect(book)}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
      data-card-type="library"
      data-book-collection={isMultiVolume ? 'multi_volume' : 'single'}
      data-book-source={isMultiVolume ? 'multi_volume' : isExternalDrive ? 'google_drive' : 'internal'}
      data-testid={`${testIdPrefix}-${book.id}`}
      data-aos="fade-up"
      data-aos-delay={aosDelay > 0 ? String(aosDelay) : undefined}
      className={`library-card card-library group nb-card-interactive overflow-hidden flex flex-col cursor-pointer h-full w-full border-2 border-[#171717] shadow-[4px_4px_0px_#171717] ${className}`}
      style={{ backgroundColor: '#F0BE49', color: '#0F3D3A' }}
    >
      {/* 1. Sampul kitab pada bagian atas (proporsional, rasio terjaga tanpa cropping) */}
      <div className="relative w-full bg-[#FAF7F0] border-b-2 border-[#171717] px-3 py-2.5 flex items-center justify-center">
        <div
          className={`w-full max-w-[148px] sm:max-w-[160px] ${aspectClass} rounded-sm overflow-hidden bg-[#EFE5D2]/70 border border-[#171717]/20 flex items-center justify-center`}
        >
          {book.coverImageUrl ? (
            <ResilientGoogleDriveImage
              src={book.coverImageUrl}
              alt={book.title}
              aspectRatioClass={aspectClass}
              objectFit="contain"
              className="w-full h-full bg-[#FAF7F0]"
              imageClassName="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-300 ease-out"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-[#0F3D3A] gap-1.5">
              <BookOpen className="w-8 h-8 opacity-65" />
              <span className="text-[11px] font-bold opacity-80 line-clamp-2 leading-snug">
                {book.title}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Badan Card — Wheat Field Sunrise (#F0BE49) & Teks Hijau Gelap (#0F3D3A) */}
      <div
        className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5 sm:space-y-3 text-left"
        style={{ backgroundColor: '#F0BE49', color: '#0F3D3A' }}
      >
        <div className="space-y-2">
          {/* 2. Header Row: Judul Kitab & 7. Tombol Bagikan */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3
                className="font-serif font-bold text-sm sm:text-[15px] text-[#0B2E2B] group-hover:text-[#071F1D] transition-colors line-clamp-2 leading-snug"
                dangerouslySetInnerHTML={{ __html: autoWrapArabicText(book.title) }}
              />

              {book.titleAr && (
                <p
                  dir="rtl"
                  className="font-amiri text-sm sm:text-[15px] font-bold text-[#123D32] line-clamp-1 leading-[1.75] mt-0.5"
                >
                  {book.titleAr}
                </p>
              )}
            </div>

            {/* Tombol Bagikan (Web Share API + fallback salin tautan halaman detail kitab) */}
            <button
              type="button"
              onClick={handleShare}
              data-testid={`${testIdPrefix}-share-${book.id}`}
              className={`w-7 h-7 rounded-md border-2 border-[#171717] shadow-[1.5px_1.5px_0px_#171717] flex items-center justify-center transition cursor-pointer shrink-0 mt-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                copied
                  ? 'bg-[#0F3D3A] text-[#FAF7F0]'
                  : 'bg-[#FAF7F0] text-[#0F3D3A] hover:bg-[#0F3D3A] hover:text-[#FAF7F0]'
              }`}
              title={copied ? 'Tautan detail kitab berhasil disalin!' : 'Bagikan kitab ini'}
              aria-label={`Bagikan kitab ${book.title}`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* 5. Kategori Kitab & Info Tambahan (jumlah jilid / estimasi baca) */}
          {(categories.length > 0 || hasReadingTime || publishedVolumesCount > 0) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {categories.map((catName, idx) => (
                <span
                  key={idx}
                  data-testid={`${testIdPrefix}-category-${book.id}-${idx}`}
                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-[#0F3D3A] text-[#FAF7F0] border border-[#171717] shadow-[1.5px_1.5px_0px_#171717]"
                >
                  {catName}
                </span>
              ))}

              {publishedVolumesCount > 0 && (
                <span
                  data-testid={`${testIdPrefix}-volumes-count-${book.id}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#FAF7F0] text-[#0F3D3A] border border-[#171717] shadow-[1.5px_1.5px_0px_#171717] tabular-nums"
                >
                  <Layers className="w-3 h-3 shrink-0 text-[#0F3D3A]" />
                  <span>{publishedVolumesCount} Jilid</span>
                </span>
              )}

              {hasReadingTime && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#FAF7F0] text-[#0F3D3A] border border-[#171717] shadow-[1.5px_1.5px_0px_#171717]">
                  <Clock className="w-3 h-3 shrink-0 text-[#0F3D3A]" />
                  <span>{book.readingTimeMinutes} Menit</span>
                </span>
              )}
            </div>
          )}

          {/* 4. Deskripsi singkat jika tersedia */}
          {trimmedDescription && (
            <p className="text-[11px] sm:text-xs text-[#0F3D3A]/90 line-clamp-2 leading-relaxed font-sans font-medium">
              {trimmedDescription}
            </p>
          )}
        </div>

        {/* Footer: 3. Nama penulis/penyusun (jika tersedia) & 6. Aksi membuka detail kitab */}
        <div className="pt-2.5 border-t-2 border-[#0F3D3A]/20 space-y-1.5">
          {trimmedAuthor && (
            <div className="flex items-center justify-between text-[11px] font-bold text-[#0F3D3A] gap-2">
              <span className="truncate" title={trimmedAuthor}>
                {trimmedAuthor}
              </span>
              {copied && (
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#0F3D3A] text-[#FAF7F0] shrink-0">
                  Link disalin
                </span>
              )}
            </div>
          )}

          {!trimmedAuthor && copied && (
            <div className="flex justify-end">
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#0F3D3A] text-[#FAF7F0]">
                Link disalin
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] sm:text-xs font-extrabold text-[#0B2E2B] group-hover:text-[#071F1D]">
            <span>Lihat Detail Kitab</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#0B2E2B] group-hover:text-[#071F1D] transform group-hover:translate-x-1 transition-transform duration-200 shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
};
