import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Copy,
  Check,
  Clock,
  Calendar,
  ExternalLink,
  Library,
  User,
  Layers,
  AlertTriangle,
  RefreshCw,
  EyeOff
} from 'lucide-react';
import { LibraryBook, LibraryBookVolume } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getLibraryBookVolumes } from '../../firebase/services';
import { ResilientGoogleDriveImage } from '../common/ResilientGoogleDriveImage';
import {
  getLibraryCoverAspectClass,
  parseLibraryBookCategories,
  isMultiVolumeLibraryBook,
  filterPublicLibraryVolumes,
  classifyLibraryLoadError,
  LibraryLoadErrorInfo
} from '../../utils/libraryHelper';
import { autoWrapArabicText } from '../../utils/arabicFontHelper';
import { getAosDelay } from '../../utils/aosManager';

interface LibraryBookDetailViewProps {
  book: LibraryBook;
  onBack: () => void;
  onOpenReader: (book: LibraryBook) => void;
  onOpenVolumeReader?: (book: LibraryBook, volume: LibraryBookVolume, allVisibleVolumes: LibraryBookVolume[]) => void;
}

export const LibraryBookDetailView: React.FC<LibraryBookDetailViewProps> = ({
  book,
  onBack,
  onOpenReader,
  onOpenVolumeReader
}) => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [copied, setCopied] = useState(false);

  const isMultiVolume = isMultiVolumeLibraryBook(book);
  const [volumes, setVolumes] = useState<LibraryBookVolume[]>([]);
  const [volumesLoading, setVolumesLoading] = useState<boolean>(isMultiVolume);
  const [volumesError, setVolumesError] = useState<LibraryLoadErrorInfo | null>(null);
  const volumesSectionRef = useRef<HTMLElement | null>(null);

  const aspectClass = getLibraryCoverAspectClass(book.coverAspectRatio);
  const isExternalDrive = !isMultiVolume && book.sourceType === 'google_drive' && Boolean(book.googleDriveUrl);
  const categories = parseLibraryBookCategories(book.category);
  const trimmedDescription = (book.description || '').trim();
  const trimmedAuthor = (book.author || '').trim();

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://darswithosama.com';
  const detailUrl = `${origin}/library/${encodeURIComponent(book.slug || book.id)}`;

  const loadVolumes = useCallback(
    async (forceRefresh = false) => {
      if (!isMultiVolume) {
        setVolumes([]);
        setVolumesLoading(false);
        setVolumesError(null);
        return;
      }

      setVolumesLoading(true);
      setVolumesError(null);
      try {
        const fetched = await getLibraryBookVolumes(book.id, isAdmin, forceRefresh);
        const visible = isAdmin ? fetched : filterPublicLibraryVolumes(fetched);
        setVolumes(visible);
      } catch (err) {
        setVolumes([]);
        setVolumesError(classifyLibraryLoadError(err, 'volumes'));
      } finally {
        setVolumesLoading(false);
      }
    },
    [book.id, isMultiVolume, isAdmin]
  );

  useEffect(() => {
    if (!isMultiVolume) return;
    if (authLoading) return;
    void loadVolumes(false);
  }, [isMultiVolume, authLoading, loadVolumes]);

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

  const scrollToVolumes = () => {
    if (volumesSectionRef.current) {
      volumesSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const publishedVolumesCount = useMemo(
    () => volumes.filter(v => v.status === 'published').length,
    [volumes]
  );

  return (
    <div
      data-testid="library-book-detail-page"
      data-book-collection={isMultiVolume ? 'multi_volume' : 'single'}
      className="max-w-[1080px] mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 pb-12 space-y-5 sm:space-y-6 font-sans"
    >
      {/* TOP NAVIGATION & SHARE BAR */}
      <div data-aos="fade-up" className="flex flex-wrap items-center justify-between gap-3">
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
      <section data-aos="fade-up" className="nb-card bg-white dark:bg-[#0D2B36] overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-7 p-4 sm:p-6 lg:p-7 items-start">
          {/* BOOK COVER COLUMN (Respects stored 3:4 or 9:16 ratio without cropping) */}
          <div className="md:col-span-4 flex justify-center">
            <div className="w-full max-w-[205px] sm:max-w-[235px] md:max-w-[250px]">
              <div
                className={`w-full ${aspectClass} rounded-md overflow-hidden bg-[#FAF7F0] dark:bg-[#001722] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#001722] flex items-center justify-center`}
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
          <div className="md:col-span-8 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              {/* Metadata Badges Row */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#123D32] dark:bg-[#4CA7A1] text-[#FAF7F0] dark:text-[#001722] border border-[#171717] text-[10px] uppercase tracking-wider">
                  <Library className="w-3 h-3" />
                  <span>Library Digital</span>
                </span>

                {isMultiVolume && (
                  <span
                    data-testid="library-detail-multivolume-badge"
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#FAF7F0] dark:bg-[#001722] text-[#123D32] dark:text-[#CEFEF1] border border-[#171717] dark:border-[#4CA7A1] text-[10px] uppercase tracking-wider tabular-nums"
                  >
                    <Layers className="w-3 h-3" />
                    <span>
                      Kitab Berjilid
                      {!volumesLoading && publishedVolumesCount > 0 ? ` • ${publishedVolumesCount} Jilid` : ''}
                    </span>
                  </span>
                )}

                {categories.map((catName, idx) => (
                  <span
                    key={idx}
                    data-testid={`library-detail-category-${idx}`}
                    className="inline-flex items-center px-2.5 py-0.5 rounded bg-[#F0BE49] text-[#0F3D3A] border border-[#171717] text-[10px] uppercase tracking-wider shadow-[1.5px_1.5px_0px_#171717]"
                  >
                    {catName}
                  </span>
                ))}

                {book.status === 'draft' && isAdmin && (
                  <span className="px-2.5 py-0.5 rounded bg-[#D6AD52] text-[#171717] border border-[#171717] text-[10px] uppercase tracking-wider">
                    Pratinjau Draf (Admin)
                  </span>
                )}
              </div>

              {/* Full Book Title & Optional Arabic Title */}
              <div className="space-y-1.5">
                <h1
                  data-testid="library-detail-title"
                  className="dars-page-title font-bold font-serif text-[#123D32] dark:text-[#CEFEF1] leading-tight tracking-tight"
                  dangerouslySetInnerHTML={{ __html: autoWrapArabicText(book.title) }}
                />

                {book.titleAr && (
                  <p
                    dir="rtl"
                    className="font-amiri text-lg sm:text-xl text-[#0F3D3A] dark:text-[#D6AD52] font-bold leading-[1.9]"
                  >
                    {book.titleAr}
                  </p>
                )}
              </div>

              {/* Author & Additional Metadata */}
              {(trimmedAuthor || (!isMultiVolume && !isExternalDrive && book.readingTimeMinutes) || formattedPublishedDate) && (
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

                  {!isMultiVolume && !isExternalDrive && (book.readingTimeMinutes || 0) > 0 && (
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

            {/* PRIMARY CALL-TO-ACTION BUTTONS */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {isMultiVolume ? (
                <button
                  type="button"
                  data-testid="library-detail-scroll-volumes-btn"
                  onClick={scrollToVolumes}
                  className="nb-btn nb-btn-gold px-5 py-2.5 text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Layers className="w-4 h-4 shrink-0" />
                  <span>Pilih Jilid ({volumesLoading ? '...' : volumes.length})</span>
                </button>
              ) : isExternalDrive ? (
                <a
                  href={book.googleDriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="library-detail-open-book-btn"
                  className="nb-btn nb-btn-gold px-5 py-2.5 text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 no-underline"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  <span>Buka Kitab</span>
                </a>
              ) : (
                <button
                  type="button"
                  data-testid="library-detail-open-book-btn"
                  onClick={() => onOpenReader(book)}
                  className="nb-btn nb-btn-gold px-5 py-2.5 text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>Baca Kitab</span>
                </button>
              )}

              <button
                type="button"
                onClick={onBack}
                className="nb-btn nb-btn-secondary px-4 py-2.5 text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Library className="w-4 h-4 shrink-0" />
                <span>Lihat Koleksi Lainnya</span>
              </button>
            </div>

            <p className="text-[11px] text-[#525855] dark:text-[#A6D6C9] leading-relaxed">
              {isMultiVolume
                ? 'Koleksi ini terdiri atas beberapa jilid. Pilih jilid yang ingin Anda baca pada Daftar Jilid di bawah ini.'
                : isExternalDrive
                ? 'Kitab ini tersedia melalui tautan Google Drive resmi dan akan dibuka di tab baru.'
                : 'Kitab ini dapat dibaca langsung di halaman baca internal lengkap dengan daftar isi otomatis dan pengaturan ukuran huruf.'}
            </p>
          </div>
        </div>
      </section>

      {/* DAFTAR JILID SECTION (STRICTLY FOR MULTI-VOLUME BOOKS) */}
      {isMultiVolume && (
        <section
          ref={volumesSectionRef}
          id="daftar-jilid"
          data-aos="fade-up"
          data-testid="library-volumes-section"
          className="nb-card bg-white dark:bg-[#0D2B36] p-4 sm:p-6 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#171717] dark:border-[#4CA7A1]/50 pb-3">
            <div className="space-y-0.5">
              <h2 className="dars-section-title font-bold font-serif text-[#123D32] dark:text-[#CEFEF1] flex items-center gap-2">
                <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-[#123D32] dark:text-[#D6AD52] shrink-0" />
                <span>Daftar Jilid</span>
              </h2>
              <p className="text-xs text-[#525855] dark:text-[#A6D6C9]">
                Pilih salah satu jilid di bawah ini untuk langsung membaca naskah atau membuka tautan dokumennya.
              </p>
            </div>

            {!volumesLoading && volumes.length > 0 && (
              <span className="text-xs font-extrabold text-[#123D32] dark:text-[#D6AD52] tabular-nums">
                {volumes.length} Jilid Tersedia
              </span>
            )}
          </div>

          {volumesLoading ? (
            <div className="space-y-3" data-testid="library-volumes-loading">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="p-4 rounded-lg border-2 border-[#171717]/15 dark:border-[#4CA7A1]/25 bg-[#FAF7F0] dark:bg-[#001722]/60 animate-pulse flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 flex-1">
                    <div className="w-12 h-12 rounded-md bg-[#171717]/10 dark:bg-[#1F5F63]" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-[#171717]/10 dark:bg-[#1F5F63] rounded w-2/3" />
                      <div className="h-3 bg-[#171717]/10 dark:bg-[#1F5F63] rounded w-1/3" />
                    </div>
                  </div>
                  <div className="h-9 w-24 rounded-md bg-[#171717]/10 dark:bg-[#1F5F63]" />
                </div>
              ))}
            </div>
          ) : volumesError ? (
            <div
              data-testid="library-volumes-error"
              className="p-6 rounded-lg border-2 border-[#171717] dark:border-[#F87171] bg-[#FEF2F2] dark:bg-[#3A1E24] text-center space-y-3"
            >
              <AlertTriangle className="w-7 h-7 mx-auto text-[#B91C1C] dark:text-[#FCA5A5]" />
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-[#171717] dark:text-[#CEFEF1]">
                  {volumesError.title}
                </h3>
                <p className="text-xs text-[#525855] dark:text-[#A6D6C9] max-w-lg mx-auto leading-relaxed">
                  {volumesError.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadVolumes(true)}
                className="nb-btn nb-btn-primary px-4 py-2 text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Muat Ulang Daftar Jilid</span>
              </button>
            </div>
          ) : volumes.length === 0 ? (
            <div
              data-testid="library-volumes-empty"
              className="py-10 px-4 text-center rounded-lg bg-[#FAF7F0] dark:bg-[#001722]/60 border-2 border-dashed border-[#171717]/25 dark:border-[#4CA7A1]/40 space-y-2"
            >
              <Layers className="w-8 h-8 mx-auto text-[#123D32]/50 dark:text-[#4CA7A1]/60" />
              <p className="text-sm font-bold text-[#171717] dark:text-[#CEFEF1]">
                Belum Ada Jilid yang Diterbitkan
              </p>
              <p className="text-xs text-[#525855] dark:text-[#A6D6C9] max-w-md mx-auto leading-relaxed">
                Jilid untuk koleksi kitab ini sedang disiapkan dan akan segera ditampilkan setelah diterbitkan.
              </p>
            </div>
          ) : (
            <ol
              data-testid="library-volumes-list"
              className="space-y-3 list-none p-0 m-0"
            >
              {volumes.map((vol, volIdx) => {
                const isVolExternal = vol.sourceType === 'google_drive' && Boolean(vol.googleDriveUrl);
                const isDraftPreview = vol.status === 'draft';

                const innerContent = (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 w-full">
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                      {/* Nomor Jilid */}
                      <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-md bg-[#123D32] dark:bg-[#1F5F63] text-[#FAF7F0] dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[2px_2px_0px_#171717] flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold uppercase tracking-wider opacity-85 leading-none">
                          Jilid
                        </span>
                        <span className="text-base sm:text-lg font-extrabold font-mono tabular-nums leading-tight">
                          {vol.volumeNumber}
                        </span>
                      </div>

                      {/* Judul Jilid & Info Sumber Tambahan */}
                      <div className="min-w-0 flex-1 space-y-1 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className="text-sm sm:text-base font-extrabold text-[#171717] dark:text-[#CEFEF1] group-hover:text-[#123D32] dark:group-hover:text-[#D6AD52] transition-colors leading-snug"
                            dangerouslySetInnerHTML={{ __html: autoWrapArabicText(vol.title) }}
                          />
                          {isDraftPreview && isAdmin && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#D6AD52] text-[#171717] border border-[#171717] text-[10px] font-extrabold uppercase tracking-wider">
                              <EyeOff className="w-3 h-3" />
                              <span>Draf (Admin)</span>
                            </span>
                          )}
                        </div>

                        {vol.titleAr && (
                          <p
                            dir="rtl"
                            className="font-amiri text-base sm:text-lg font-bold text-[#0F3D3A] dark:text-[#D6AD52] leading-relaxed"
                          >
                            {vol.titleAr}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold text-[#525855] dark:text-[#A6D6C9]">
                          <span>
                            {isVolExternal ? 'Google Drive' : 'Baca Internal'}
                          </span>
                          {!isVolExternal && (vol.readingTimeMinutes || 0) > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>Estimasi {vol.readingTimeMinutes} Menit Baca</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action CTA */}
                    <div className="flex items-center justify-end shrink-0 pt-1 sm:pt-0">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-extrabold border-2 border-[#171717] shadow-[2px_2px_0px_#171717] transition-all whitespace-nowrap ${
                          isVolExternal
                            ? 'bg-[#FAF7F0] text-[#123D32] group-hover:bg-[#F0BE49] group-hover:text-[#171717]'
                            : 'bg-[#F0BE49] text-[#0F3D3A] group-hover:bg-[#123D32] group-hover:text-[#FAF7F0]'
                        }`}
                      >
                        {isVolExternal ? (
                          <>
                            <span>Buka Jilid</span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          </>
                        ) : (
                          <>
                            <span>Baca Jilid</span>
                            <ArrowRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                );

                return (
                  <li
                    key={vol.id}
                    data-aos="fade-up"
                    data-aos-delay={getAosDelay(volIdx, 2)}
                    data-testid={`library-volume-item-${vol.id}`}
                    data-volume-source={vol.sourceType}
                  >
                    {isVolExternal ? (
                      <a
                        href={vol.googleDriveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block w-full p-3.5 sm:p-4 rounded-lg bg-[#FAF7F0] dark:bg-[#07202A] hover:bg-[#F4EBDA] dark:hover:bg-[#123442] border-2 border-[#171717] dark:border-[#4CA7A1]/70 shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722] transition-all no-underline"
                      >
                        {innerContent}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenVolumeReader) {
                            onOpenVolumeReader(book, vol, volumes);
                          }
                        }}
                        className="group block w-full p-3.5 sm:p-4 rounded-lg bg-[#FAF7F0] dark:bg-[#07202A] hover:bg-[#F4EBDA] dark:hover:bg-[#123442] border-2 border-[#171717] dark:border-[#4CA7A1]/70 shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722] transition-all cursor-pointer text-left"
                      >
                        {innerContent}
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      )}
    </div>
  );
};
