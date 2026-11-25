import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Copy,
  Check,
  Clock,
  ListOrdered,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  FileText
} from 'lucide-react';
import { LibraryBook, LibraryBookVolume } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ReadingFontControls, useReadingFontSize } from '../common/ReadingFontControls';
import { ResilientGoogleDriveImage } from '../common/ResilientGoogleDriveImage';
import {
  parseLibraryBookContent,
  isMultiVolumeLibraryBook,
  buildLibraryVolumeReadUrl,
  resolveLibraryPdfViewerUrl
} from '../../utils/libraryHelper';
import { autoWrapArabicText, renderFormattedContentHtml } from '../../utils/arabicFontHelper';
import { sanitizeRichTextHtml } from '../../utils/richTextHelper';
import {
  normalizeArticleHtmlImages,
  getGoogleDriveImageCandidates,
  getGoogleDriveViewerUrl,
  extractGoogleDriveFileId,
  isGoogleDriveUrl
} from '../../utils/googleDriveHelper';

interface LibraryDetailViewProps {
  book: LibraryBook;
  volume?: LibraryBookVolume | null;
  siblingVolumes?: LibraryBookVolume[];
  onSelectVolume?: (volume: LibraryBookVolume) => void;
  onBack: () => void;
  onBackToDetail?: () => void;
}

type BookReadingMode = 'all' | 'chapter';

export const LibraryDetailView: React.FC<LibraryDetailViewProps> = ({
  book,
  volume = null,
  siblingVolumes = [],
  onSelectVolume,
  onBack,
  onBackToDetail
}) => {
  const { isAdmin } = useAuth();
  const fontControl = useReadingFontSize();
  const [copied, setCopied] = useState(false);
  const [tocOpen, setTocOpen] = useState<boolean>(true);
  const [readingMode, setReadingMode] = useState<BookReadingMode>('all');
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const contentBodyRef = useRef<HTMLDivElement | null>(null);
  const readingAnchorRef = useRef<HTMLDivElement | null>(null);

  const isMultiVolume = isMultiVolumeLibraryBook(book);
  const activeContentHtml = volume ? (volume.content || '') : (book.content || '');
  const activeSourceType = volume ? volume.sourceType : book.sourceType;
  const activeDriveUrl = volume ? volume.googleDriveUrl : book.googleDriveUrl;
  const activePdfUrl =
    activeSourceType === 'internal'
      ? resolveLibraryPdfViewerUrl(
          volume ? volume.pdfDriveUrl : isMultiVolume ? '' : book.pdfDriveUrl
        )
      : null;
  const activeReadingMinutes = volume ? volume.readingTimeMinutes : book.readingTimeMinutes;
  const activeStatus = volume ? volume.status : book.status;

  // Parse internal book or volume HTML into structured TOC (H1 clickable + H2 non-clickable) and full HTML
  const parsed = useMemo(() => {
    const raw = activeContentHtml;
    const sanitized = sanitizeRichTextHtml(raw);
    const normalized = normalizeArticleHtmlImages(sanitized);
    return parseLibraryBookContent(normalized);
  }, [activeContentHtml]);

  // Reset reading state whenever book or volume changes
  useEffect(() => {
    setReadingMode('all');
    setActiveChapterId(parsed.chapters[0]?.id || null);
    setTocOpen(true);
  }, [book.id, volume?.id]);

  // Keep activeChapterId valid if admin edits headings
  useEffect(() => {
    if (parsed.chapters.length > 0) {
      setActiveChapterId(prev =>
        prev && parsed.chapters.some(c => c.id === prev) ? prev : parsed.chapters[0].id
      );
    } else {
      setActiveChapterId(null);
    }
  }, [parsed.chapters]);

  // Resilient handling for inline Google Drive images inside book content (mirrors BlogDetailView)
  useEffect(() => {
    if (!contentBodyRef.current) return;
    const container = contentBodyRef.current;
    const images = Array.from(container.querySelectorAll('img'));
    const cleanups: Array<() => void> = [];

    images.forEach((img) => {
      const src = img.getAttribute('src') || '';
      const driveId = img.getAttribute('data-drive-id') || extractGoogleDriveFileId(src);
      const isDrive = isGoogleDriveUrl(src) || Boolean(driveId);
      if (!isDrive && !src) return;

      const candidates = isDrive ? getGoogleDriveImageCandidates(src) : [src];
      let currentIndex = 0;

      const handleError = () => {
        currentIndex++;
        if (currentIndex < candidates.length) {
          img.src = candidates[currentIndex];
        } else {
          img.style.display = 'none';
          const existingNotice = img.parentElement?.querySelector('.inline-drive-fallback-notice');
          if (!existingNotice) {
            const fallbackDiv = document.createElement('div');
            fallbackDiv.className = 'inline-drive-fallback-notice my-4 p-4 rounded-md bg-[#FAF7F0] dark:bg-[#1A283C] border-2 border-dashed border-[#D6AD52] text-xs text-[#171717] dark:text-[#F8F3E8] space-y-2 select-none';
            const viewerUrl = driveId ? getGoogleDriveViewerUrl(driveId) : src;
            fallbackDiv.innerHTML = `
              <div class="font-extrabold text-[#123D32] dark:text-[#D6AD52]">Gambar Sisipan Tidak Dapat Dimuat</div>
              <p class="text-[11px] text-[#525855] dark:text-[#A6D6C9]">
                ${isDrive ? 'Pastikan izin akses berkas Google Drive diatur ke "Siapa saja yang memiliki link".' : 'Tautan gambar tidak dapat diakses.'}
              </p>
              ${viewerUrl ? `<a href="${viewerUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-3 py-1 rounded bg-[#123D32] text-[#D6AD52] text-xs font-bold">Buka Berkas ↗</a>` : ''}
            `;
            img.parentElement?.appendChild(fallbackDiv);
          }
        }
      };

      img.addEventListener('error', handleError);
      cleanups.push(() => img.removeEventListener('error', handleError));
    });

    return () => {
      cleanups.forEach(fn => fn());
    };
  }, [activeContentHtml, readingMode, activeChapterId]);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://darswithosama.com';
  const readerUrl = volume
    ? buildLibraryVolumeReadUrl(book, volume.id, origin)
    : `${origin}/library/${encodeURIComponent(book.slug || book.id)}/baca`;

  const handleCopyLink = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(readerUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = readerUrl;
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
      console.error('Failed to copy library reader link:', err);
    }
  };

  const scrollToAnchorId = (anchorId: string) => {
    if (typeof window === 'undefined') return;
    const targetEl = document.getElementById(anchorId);
    if (targetEl) {
      const headerOffset = 88;
      const top = targetEl.getBoundingClientRect().top + window.pageYOffset - headerOffset;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      targetEl.classList.add('heading-target-flash');
      setTimeout(() => targetEl.classList.remove('heading-target-flash'), 1600);
    }
  };

  const scrollToReaderTop = () => {
    if (typeof window === 'undefined' || !readingAnchorRef.current) return;
    const top = readingAnchorRef.current.getBoundingClientRect().top + window.pageYOffset - 88;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  };

  const handleSelectChapterFromToc = (chapterId: string) => {
    setActiveChapterId(chapterId);
    if (readingMode === 'all') {
      // Remain in "Baca Semua" and jump directly to that H1 anchor ID
      setTimeout(() => scrollToAnchorId(chapterId), 30);
    } else {
      setTimeout(scrollToReaderTop, 30);
    }
  };

  const handleSwitchToReadAll = () => {
    setReadingMode('all');
    setTimeout(scrollToReaderTop, 40);
  };

  const handleSwitchToChapterMode = (chapterId?: string) => {
    const targetId = chapterId || activeChapterId || parsed.chapters[0]?.id || null;
    if (targetId) setActiveChapterId(targetId);
    setReadingMode('chapter');
    setTimeout(scrollToReaderTop, 40);
  };

  const activeChapterIndex = parsed.chapters.findIndex(c => c.id === activeChapterId);
  const currentChapter =
    activeChapterIndex >= 0 ? parsed.chapters[activeChapterIndex] : parsed.chapters[0] || null;
  const prevChapter = activeChapterIndex > 0 ? parsed.chapters[activeChapterIndex - 1] : null;
  const nextChapter =
    activeChapterIndex >= 0 && activeChapterIndex < parsed.chapters.length - 1
      ? parsed.chapters[activeChapterIndex + 1]
      : null;

  const trimmedAuthor = (book.author || '').trim();
  const trimmedDescription = (book.description || '').trim();
  const handleBackAction = onBackToDetail || onBack;

  const currentVolumeIndex = volume ? siblingVolumes.findIndex(v => v.id === volume.id) : -1;
  const prevVolume = currentVolumeIndex > 0 ? siblingVolumes[currentVolumeIndex - 1] : null;
  const nextVolume =
    currentVolumeIndex >= 0 && currentVolumeIndex < siblingVolumes.length - 1
      ? siblingVolumes[currentVolumeIndex + 1]
      : null;

  // Guard: Multi-volume collection opened on /baca without selecting a specific volume
  if (isMultiVolume && !volume) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6 animate-fade-in font-sans">
        <div className="nb-card bg-white dark:bg-[#0D2B36] p-6 sm:p-8 text-center space-y-4">
          <Layers className="w-10 h-10 mx-auto text-[#123D32] dark:text-[#D6AD52]" />
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#171717] dark:text-[#CEFEF1]">
            Pilih Jilid Terlebih Dahulu
          </h1>
          <p className="text-xs sm:text-sm text-[#525855] dark:text-[#A6D6C9] max-w-md mx-auto leading-relaxed">
            Kitab &ldquo;{book.title}&rdquo; merupakan koleksi berjilid. Silakan pilih jilid yang ingin Anda baca melalui halaman detail kitab.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleBackAction}
              className="nb-btn nb-btn-gold px-5 py-2.5 text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Buka Daftar Jilid</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Guard: Direct reader URL opened for an external Google Drive book or external volume
  if (activeSourceType === 'google_drive' && activeDriveUrl) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 animate-fade-in font-sans">
        <button
          type="button"
          onClick={handleBackAction}
          className="nb-btn nb-btn-secondary px-3.5 py-2 text-xs inline-flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{onBackToDetail ? 'Kembali ke Detail Kitab' : 'Kembali ke Library Digital'}</span>
        </button>

        <div data-aos="fade-up" className="nb-card bg-white dark:bg-[#0D2B36] p-5 sm:p-7 flex flex-col items-center text-center gap-4">
          {book.coverImageUrl && (
            <div className="w-full max-w-[210px] sm:max-w-[250px] aspect-[3/4] rounded-md overflow-hidden bg-[#FAF7F0] dark:bg-[#001722] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[4px_4px_0px_#171717]">
              <ResilientGoogleDriveImage
                src={book.coverImageUrl}
                alt={book.title}
                aspectRatioClass="aspect-[3/4]"
                objectFit="contain"
                className="w-full h-full"
                imageClassName="w-full h-full object-contain"
              />
            </div>
          )}
          <div className="space-y-3 max-w-xl">
            {volume && (
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#123D32] dark:text-[#D6AD52]">
                {book.title} · Jilid {volume.volumeNumber}
              </p>
            )}
            <h1 className="text-2xl font-bold font-serif text-[#171717] dark:text-[#CEFEF1]">
              {volume ? volume.title : book.title}
            </h1>
            {!volume && trimmedDescription && (
              <p className="text-sm text-[#525855] dark:text-[#A6D6C9] leading-relaxed whitespace-pre-line">
                {trimmedDescription}
              </p>
            )}
            <div className="pt-2">
              <a
                href={activeDriveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="nb-btn nb-btn-gold px-6 py-3 text-xs sm:text-sm inline-flex items-center gap-2 no-underline"
              >
                <ExternalLink className="w-4 h-4" />
                <span>{volume ? `Buka Jilid ${volume.volumeNumber} di Google Drive` : 'Buka Kitab di Google Drive'}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="library-reader-page"
      className="max-w-[880px] mx-auto px-0 sm:px-5 lg:px-6 space-y-4 sm:space-y-5 py-3 sm:py-5 pb-12 font-sans"
    >
      {/* 1. NAVIGASI KEMBALI & SALIN LINK */}
      <div data-aos="fade-up" className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 sm:px-0">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="library-reader-back-btn"
            onClick={handleBackAction}
            className="px-3.5 py-2 text-xs font-extrabold rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] text-[#171717] dark:text-[#CEFEF1] bg-white dark:bg-[#0D2B36] hover:bg-[#EFE5D2] dark:hover:bg-[#1F5F63] transition-all inline-flex items-center gap-2 cursor-pointer shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{onBackToDetail ? 'Kembali ke Detail Kitab' : 'Kembali ke Library'}</span>
          </button>

          {onBackToDetail && (
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-2 text-xs font-bold rounded-md border border-[#171717]/40 dark:border-[#4CA7A1]/50 text-[#525855] dark:text-[#A6D6C9] hover:text-[#171717] dark:hover:text-[#CEFEF1] bg-transparent hover:bg-[#EFE5D2]/60 dark:hover:bg-[#1F5F63]/50 transition-all cursor-pointer"
            >
              Library
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activePdfUrl && (
            <a
              href={activePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="library-reader-pdf-btn"
              className="px-3.5 py-2 text-xs font-extrabold rounded-md border-2 border-[#171717] dark:border-[#D6AD52] text-[#171717] dark:text-[#171717] bg-[#F0BE49] hover:bg-[#D6AD52] transition-all inline-flex items-center gap-1.5 no-underline shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]"
              title="Buka berkas PDF di Google Drive pada tab baru"
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Lihat PDF</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-80" />
            </a>
          )}

          <button
            type="button"
            data-testid="library-reader-copy-link-btn"
            onClick={handleCopyLink}
            className="px-3.5 py-2 text-xs font-extrabold rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] text-[#171717] dark:text-[#CEFEF1] bg-white dark:bg-[#0D2B36] hover:bg-[#EFE5D2] dark:hover:bg-[#1F5F63] transition-all inline-flex items-center gap-2 cursor-pointer shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]"
            title="Salin tautan permanen halaman baca kitab ini"
          >
            {copied ? (
              <Check className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1]" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>{copied ? 'Link Disalin!' : 'Salin Link'}</span>
          </button>
        </div>
      </div>

      {/* EDITORIAL BOOK READING SURFACE — STRICT VERTICAL FLOW ON BOTH MOBILE & DESKTOP */}
      <article
        style={fontControl.style}
        className="w-full bg-white sm:bg-[#FFF5E9] dark:bg-[#0D2B36] text-[#171717] dark:text-[#CEFEF1] border-0 sm:border-2 sm:border-[#171717] sm:dark:border-[#4CA7A1] rounded-none sm:rounded-lg shadow-none sm:shadow-[5px_5px_0px_#171717] dark:sm:shadow-[5px_5px_0px_#001722] px-4 py-5 sm:p-7 md:p-9 space-y-5 sm:space-y-6"
      >
        {/* BOOK HEADER: COVER ALWAYS ON TOP (FIXED 3:4, PROPORTIONAL), ALL INFO STRICTLY BELOW */}
        <header data-aos="fade-up" className="border-b-2 border-[#171717] dark:border-[#4CA7A1]/50 pb-5 space-y-5">
          {/* 2. COVER KITAB PROPORSIONAL DENGAN RASIO TETAP 3:4 DI BAGIAN PALING ATAS */}
          {book.coverImageUrl && (
            <div
              data-testid="library-reader-cover-container"
              className="w-full flex justify-center"
            >
              <div className="w-full max-w-[205px] sm:max-w-[240px] md:max-w-[265px] aspect-[3/4] rounded-md overflow-hidden bg-[#FAF7F0] dark:bg-[#001722] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#001722] flex items-center justify-center">
                <ResilientGoogleDriveImage
                  src={book.coverImageUrl}
                  alt={book.title}
                  aspectRatioClass="aspect-[3/4]"
                  objectFit="contain"
                  className="w-full h-full bg-[#FAF7F0] dark:bg-[#001722]"
                  imageClassName="w-full h-full object-contain"
                  isAdmin={isAdmin}
                  showAdminDiagnostic={isAdmin}
                />
              </div>
            </div>
          )}

          {/* SELURUH INFORMASI KITAB DI BAWAH COVER (BERURUTAN VERTIKAL) */}
          <div className="max-w-[68ch] mx-auto w-full space-y-4 text-left">
            {/* 3. LABEL LIBRARY DIGITAL, NOMOR JILID & ESTIMASI WAKTU BACA */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-extrabold text-[#123D32] dark:text-[#A6D6C9]">
              <span className="px-2.5 py-0.5 bg-[#123D32] dark:bg-[#4CA7A1] text-[#FAF7F0] dark:text-[#001722] rounded border border-[#171717] text-[10px] uppercase tracking-wider">
                Library Digital
              </span>
              {volume && (
                <span
                  data-testid="library-reader-volume-badge"
                  className="px-2.5 py-0.5 bg-[#F0BE49] text-[#0F3D3A] rounded border border-[#171717] text-[10px] uppercase tracking-wider tabular-nums"
                >
                  Jilid {volume.volumeNumber}
                </span>
              )}
              {activeStatus === 'draft' && isAdmin && (
                <span className="px-2.5 py-0.5 bg-[#D6AD52] text-[#171717] rounded border border-[#171717] text-[10px] uppercase tracking-wider">
                  Pratinjau Draf
                </span>
              )}
              {(activeReadingMinutes || 0) > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{activeReadingMinutes} Menit Baca</span>
                </span>
              )}
            </div>

            {/* 4. JUDUL LENGKAP KITAB / JILID (+ JUDUL ARAB JIKA ADA) */}
            <div className="space-y-2">
              {volume && (
                <p className="text-xs sm:text-sm font-bold text-[#525855] dark:text-[#A6D6C9]">
                  Koleksi Kitab:{' '}
                  <button
                    type="button"
                    onClick={handleBackAction}
                    className="text-[#123D32] dark:text-[#D6AD52] hover:underline cursor-pointer font-extrabold"
                  >
                    {book.title}
                  </button>
                </p>
              )}

              <h1
                data-testid="library-reader-title"
                className="dars-page-title font-bold text-[#123D32] dark:text-[#CEFEF1] leading-tight font-serif tracking-tight"
                dangerouslySetInnerHTML={{
                  __html: autoWrapArabicText(volume ? volume.title : book.title)
                }}
              />

              {(volume ? volume.titleAr : book.titleAr) && (
                <p
                  dir="rtl"
                  className="font-amiri text-lg sm:text-xl text-[#0F3D3A] dark:text-[#D6AD52] font-bold leading-[1.9]"
                >
                  {volume ? volume.titleAr : book.titleAr}
                </p>
              )}
            </div>

            {/* 5. NAMA PENULIS ATAU PENYUSUN (JIKA TERSEDIA) */}
            {trimmedAuthor && (
              <p className="text-xs sm:text-sm font-bold text-[#525855] dark:text-[#A6D6C9]">
                Penulis / Penyusun:{' '}
                <span className="text-[#171717] dark:text-[#CEFEF1]">{trimmedAuthor}</span>
              </p>
            )}

            {/* 6. DESKRIPSI KITAB (JIKA TERSEDIA & BUKU TUNGGAL — DIHILANGKAN JIKA KOSONG) */}
            {!volume && trimmedDescription && (
              <p
                data-testid="library-reader-description"
                className="text-sm sm:text-[15px] text-[#525855] dark:text-[#A6D6C9] leading-relaxed whitespace-pre-line"
              >
                {trimmedDescription}
              </p>
            )}

            {/* 7. KONTROL UKURAN HURUF */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#525855] dark:text-[#A6D6C9]">
                Pengaturan Teks Baca
              </span>
              <ReadingFontControls
                step={fontControl.step}
                percentage={fontControl.percentage}
                canDecrease={fontControl.canDecrease}
                canIncrease={fontControl.canIncrease}
                isDefault={fontControl.isDefault}
                onDecrease={fontControl.decrease}
                onIncrease={fontControl.increase}
                onReset={fontControl.reset}
              />
            </div>
          </div>
        </header>

        {/* =====================================================================
            8. DAFTAR ISI OTOMATIS (UNIFIED SINGLE CONTAINER, COLLAPSIBLE)
            - Strictly ONE container (NO individual cards/boxes/borders per item)
            - H1 = Clickable primary chapter navigation item (unique stable anchor IDs)
            - H2 = Indented non-clickable subchapter text beneath its parent H1
           ===================================================================== */}
        {parsed.hasTocEntries && (
          <div data-aos="fade-up" className="max-w-[68ch] mx-auto w-full space-y-3.5">
            <nav
              data-testid="library-toc-container"
              aria-label="Daftar Isi Kitab"
              className="rounded-lg bg-[#FAF7F0] dark:bg-[#001722] border-2 border-[#171717] dark:border-[#4CA7A1] px-4 py-3 sm:px-5 sm:py-4 space-y-2.5"
            >
              {/* TOC Collapse Header */}
              <div className="flex items-center justify-between gap-2.5">
                <button
                  type="button"
                  data-testid="library-toc-toggle"
                  onClick={() => setTocOpen(prev => !prev)}
                  aria-expanded={tocOpen}
                  className="w-full flex items-center justify-between gap-2 text-left cursor-pointer group"
                >
                  <span className="flex items-center gap-2">
                    <ListOrdered className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1] shrink-0" />
                    <span className="font-serif font-bold text-sm sm:text-base text-[#171717] dark:text-[#CEFEF1] group-hover:text-[#123D32] dark:group-hover:text-[#D6AD52] transition-colors">
                      Daftar Isi
                    </span>
                    {parsed.chapters.length > 0 && (
                      <span className="text-[11px] font-bold text-[#525855] dark:text-[#A6D6C9]">
                        ({parsed.chapters.length} Bab)
                      </span>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#123D32] dark:text-[#4CA7A1] shrink-0">
                    <span>{tocOpen ? 'Tutup' : 'Buka'}</span>
                    {tocOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </button>
              </div>

              {/* Unified Collapsible TOC List (NO separate cards/boxes/borders per item) */}
              {tocOpen && (
                <div
                  data-testid="library-toc-list"
                  className="pt-2.5 border-t border-[#171717]/15 dark:border-[#4CA7A1]/25 space-y-2"
                >
                  {/* Any H2 appearing before the first H1 (non-clickable) */}
                  {parsed.orphanSubchapters.length > 0 && (
                    <ul className="space-y-1 pl-4 list-none m-0">
                      {parsed.orphanSubchapters.map((sub, sIdx) => (
                        <li
                          key={`orphan-h2-${sIdx}`}
                          data-testid={`toc-subchapter-orphan-${sIdx}`}
                          className="text-xs sm:text-sm text-[#525855] dark:text-[#A6D6C9] flex items-baseline gap-2 py-0.5 cursor-default select-text"
                        >
                          <span aria-hidden="true" className="text-[#525855]/60 dark:text-[#A6D6C9]/60">—</span>
                          <span dangerouslySetInnerHTML={{ __html: autoWrapArabicText(sub.title) }} />
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* H1 Chapters (Clickable) with Nested H2 Subchapters (Non-clickable) */}
                  {parsed.chapters.length > 0 && (
                    <ol className="space-y-2 list-none p-0 m-0">
                      {parsed.chapters.map((chapter) => {
                        const isActive = activeChapterId === chapter.id;
                        return (
                          <li key={chapter.id} className="space-y-1">
                            {/* H1 Primary Item — Clickable Navigation */}
                            <button
                              type="button"
                              data-testid={`toc-h1-${chapter.index}`}
                              onClick={() => handleSelectChapterFromToc(chapter.id)}
                              className={`w-full text-left flex items-baseline gap-2.5 py-1 px-1.5 rounded transition-colors cursor-pointer group ${
                                isActive
                                  ? 'text-[#123D32] dark:text-[#D6AD52] font-extrabold'
                                  : 'text-[#171717] dark:text-[#CEFEF1] hover:text-[#123D32] dark:hover:text-[#D6AD52] font-bold'
                              }`}
                            >
                              <span className="font-mono text-xs font-extrabold text-[#123D32]/80 dark:text-[#4CA7A1] shrink-0 tabular-nums">
                                {String(chapter.index).padStart(2, '0')}.
                              </span>
                              <span
                                className="text-sm sm:text-[15px] leading-snug group-hover:underline"
                                dangerouslySetInnerHTML={{ __html: autoWrapArabicText(chapter.title) }}
                              />
                            </button>

                            {/* H2 Subchapters — Indented Static Text (STRICTLY NOT CLICKABLE) */}
                            {chapter.subchapters.length > 0 && (
                              <ul className="pl-7 sm:pl-9 space-y-0.5 list-none m-0">
                                {chapter.subchapters.map((sub, subIdx) => (
                                  <li
                                    key={`${chapter.id}-sub-${subIdx}`}
                                    data-testid={`toc-h2-${chapter.index}-${subIdx}`}
                                    className="text-xs sm:text-[13px] font-medium text-[#525855] dark:text-[#A6D6C9]/90 flex items-baseline gap-2 py-0.5 cursor-default select-text leading-snug"
                                  >
                                    <span aria-hidden="true" className="text-[#525855]/55 dark:text-[#A6D6C9]/55 shrink-0">–</span>
                                    <span dangerouslySetInnerHTML={{ __html: autoWrapArabicText(sub.title) }} />
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              )}
            </nav>

            {/* 9. OPSI BACA SEMUA (& PER BAB) */}
            {parsed.chapters.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                <span className="text-xs font-bold text-[#525855] dark:text-[#A6D6C9]">
                  Mode Membaca:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="library-read-all-btn"
                    onClick={handleSwitchToReadAll}
                    className={`px-3.5 py-2 rounded-md text-xs font-extrabold border-2 transition cursor-pointer inline-flex items-center gap-1.5 ${
                      readingMode === 'all'
                        ? 'bg-[#D6AD52] text-[#171717] border-[#171717] shadow-[2px_2px_0px_#171717]'
                        : 'bg-white dark:bg-[#0D2B36] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/40 dark:border-[#4CA7A1]/60 hover:border-[#171717]'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Baca Semua</span>
                  </button>

                  {parsed.chapters.length > 1 && (
                    <button
                      type="button"
                      data-testid="library-chapter-mode-btn"
                      onClick={() => handleSwitchToChapterMode()}
                      className={`px-3.5 py-2 rounded-md text-xs font-extrabold border-2 transition cursor-pointer ${
                        readingMode === 'chapter'
                          ? 'bg-[#123D32] text-[#FAF7F0] border-[#171717] dark:bg-[#4CA7A1] dark:text-[#001722] shadow-[2px_2px_0px_#171717]'
                          : 'bg-white dark:bg-[#0D2B36] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/40 dark:border-[#4CA7A1]/60 hover:border-[#171717]'
                      }`}
                    >
                      Per Bab
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 10. KONTEN ISI KITAB */}
        <div ref={readingAnchorRef} className="space-y-6">
          {readingMode === 'chapter' && currentChapter ? (
            /* PER-CHAPTER READING VIEW */
            <div data-testid="library-chapter-content" className="space-y-6 max-w-[68ch] mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#171717]/15 dark:border-[#4CA7A1]/25">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#123D32] dark:text-[#4CA7A1]">
                  Bab {currentChapter.index} dari {parsed.chapters.length}
                </span>
                <button
                  type="button"
                  onClick={handleSwitchToReadAll}
                  className="text-xs font-extrabold text-[#123D32] dark:text-[#D6AD52] underline cursor-pointer"
                >
                  Tampilkan Semua Bab (Baca Semua)
                </button>
              </div>

              <div
                ref={contentBodyRef}
                className="prose dark:prose-invert max-w-none text-[#171717] dark:text-[#CEFEF1] leading-relaxed space-y-4 font-sans blog-content"
              >
                <h1
                  id={currentChapter.id}
                  className="scroll-mt-24 sm:scroll-mt-28"
                  dangerouslySetInnerHTML={{ __html: autoWrapArabicText(currentChapter.titleHtml || currentChapter.title) }}
                />
                {currentChapter.htmlContent ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: renderFormattedContentHtml(currentChapter.htmlContent)
                    }}
                  />
                ) : (
                  <p className="text-xs italic text-[#525855] dark:text-[#A6D6C9]">
                    Belum ada isi teks di bawah bab ini.
                  </p>
                )}
              </div>

              {/* Chapter Prev / Next Navigation */}
              <div className="pt-6 border-t-2 border-[#171717]/15 dark:border-[#4CA7A1]/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {prevChapter && (
                    <button
                      type="button"
                      onClick={() => handleSwitchToChapterMode(prevChapter.id)}
                      className="nb-btn nb-btn-secondary px-4 py-2 text-xs font-bold flex items-center gap-2 max-w-full w-full sm:w-auto cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 shrink-0" />
                      <span className="truncate">Bab Sebelumnya: {prevChapter.title}</span>
                    </button>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex justify-end">
                  {nextChapter && (
                    <button
                      type="button"
                      onClick={() => handleSwitchToChapterMode(nextChapter.id)}
                      className="nb-btn nb-btn-gold px-4 py-2 text-xs font-bold flex items-center justify-end gap-2 max-w-full w-full sm:w-auto cursor-pointer"
                    >
                      <span className="truncate">Bab Berikutnya: {nextChapter.title}</span>
                      <ChevronRight className="w-4 h-4 shrink-0" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* "BACA SEMUA" SEQUENTIAL FULL BOOK VIEW */
            <div data-testid="library-full-content" className="space-y-4">
              {parsed.fullHtml ? (
                <div
                  ref={contentBodyRef}
                  className="prose dark:prose-invert max-w-none sm:max-w-[68ch] mx-auto text-[#171717] dark:text-[#CEFEF1] leading-relaxed space-y-4 font-sans blog-content"
                  dangerouslySetInnerHTML={{
                    __html: renderFormattedContentHtml(parsed.fullHtml)
                  }}
                />
              ) : (
                <div className="py-10 text-center text-sm text-[#525855] dark:text-[#A6D6C9]">
                  Isi naskah buku belum tersedia.
                </div>
              )}
            </div>
          )}
        </div>
        {/* NAVIGASI ANTAR-JILID (KHUSUS BUKU BERJILID) */}
        {volume && (prevVolume || nextVolume) && (
          <div
            data-testid="library-volume-footer-nav"
            className="max-w-[68ch] mx-auto pt-6 border-t-2 border-[#171717]/15 dark:border-[#4CA7A1]/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              {prevVolume && (
                prevVolume.sourceType === 'google_drive' && prevVolume.googleDriveUrl ? (
                  <a
                    href={prevVolume.googleDriveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nb-btn nb-btn-secondary px-4 py-2.5 text-xs font-bold inline-flex items-center gap-2 max-w-full w-full sm:w-auto no-underline"
                  >
                    <ChevronLeft className="w-4 h-4 shrink-0" />
                    <span className="truncate">Jilid {prevVolume.volumeNumber}: {prevVolume.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectVolume?.(prevVolume)}
                    className="nb-btn nb-btn-secondary px-4 py-2.5 text-xs font-bold flex items-center gap-2 max-w-full w-full sm:w-auto cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 shrink-0" />
                    <span className="truncate">Jilid {prevVolume.volumeNumber}: {prevVolume.title}</span>
                  </button>
                )
              )}
            </div>

            <div className="flex-1 min-w-0 flex justify-end">
              {nextVolume && (
                nextVolume.sourceType === 'google_drive' && nextVolume.googleDriveUrl ? (
                  <a
                    href={nextVolume.googleDriveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nb-btn nb-btn-gold px-4 py-2.5 text-xs font-bold inline-flex items-center justify-end gap-2 max-w-full w-full sm:w-auto no-underline"
                  >
                    <span className="truncate">Jilid {nextVolume.volumeNumber}: {nextVolume.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectVolume?.(nextVolume)}
                    className="nb-btn nb-btn-gold px-4 py-2.5 text-xs font-bold flex items-center justify-end gap-2 max-w-full w-full sm:w-auto cursor-pointer"
                  >
                    <span className="truncate">Jilid {nextVolume.volumeNumber}: {nextVolume.title}</span>
                    <ChevronRight className="w-4 h-4 shrink-0" />
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </article>
    </div>
  );
};
