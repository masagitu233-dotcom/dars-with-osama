import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ListOrdered,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Info,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { splitSessionContentIntoSlides, getSlideNavInfo } from '../../utils/sessionSlideHelper.js';
import { renderFormattedContentHtml, autoWrapArabicText } from '../../utils/arabicFontHelper.js';
import { ReadingFontControls, useReadingFontSize } from '../common/ReadingFontControls.js';

export type ReadingMode = 'toc' | 'slide' | 'full';

interface ArticleReadingViewerProps {
  rawContent: string | undefined | null;
  articleTitle: string;
  fontControl: ReturnType<typeof useReadingFontSize>;
  isAdmin?: boolean;
  onTextClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  contentBodyRef?: React.RefObject<HTMLDivElement | null>;
  postId?: string;
}

export const ArticleReadingViewer: React.FC<ArticleReadingViewerProps> = ({
  rawContent,
  articleTitle,
  fontControl,
  isAdmin = false,
  onTextClick,
  contentBodyRef,
  postId
}) => {
  // Reading mode state: 'toc' (initial Table of Contents), 'slide' (single H1 section), or 'full' (Baca Semua)
  const [readingMode, setReadingMode] = useState<ReadingMode>('toc');
  const [activeSlideIndex, setActiveSlideIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Automatically parse slides based on Heading 1 (<h1>) elements
  const slideResult = useMemo(() => {
    return splitSessionContentIntoSlides(rawContent, articleTitle);
  }, [rawContent, articleTitle]);

  const { slides, fallbackUsed } = slideResult;

  // Whenever the article changes (postId or title), ALWAYS reset initial view to Table of Contents!
  // This satisfies the rule: "Ketika pengguna membuka kembali artikel, tampilan awal harus selalu kembali ke Daftar Isi."
  useEffect(() => {
    setReadingMode('toc');
    setActiveSlideIndex(null);
  }, [postId, articleTitle]);

  const scrollToViewerTop = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const targetY = rect.top + scrollTop - 88;
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    }
  };

  const handleSelectSlide = (index: number) => {
    if (index >= 0 && index < slides.length) {
      setActiveSlideIndex(index);
      setReadingMode('slide');
      setTimeout(scrollToViewerTop, 40);
    }
  };

  const handleReadFullArticle = () => {
    setReadingMode('full');
    setActiveSlideIndex(null);
    setTimeout(scrollToViewerTop, 40);
  };

  const handleBackToToc = () => {
    setReadingMode('toc');
    setActiveSlideIndex(null);
    setTimeout(scrollToViewerTop, 40);
  };

  // If there are no slides and no readable content, return null gracefully
  if (slides.length === 0) {
    return null;
  }

  // Active slide details when in 'slide' mode
  const currentSlide =
    readingMode === 'slide' && activeSlideIndex !== null && activeSlideIndex >= 0 && activeSlideIndex < slides.length
      ? slides[activeSlideIndex]
      : null;

  const navInfo =
    readingMode === 'slide' && activeSlideIndex !== null
      ? getSlideNavInfo(slides, activeSlideIndex)
      : null;

  return (
    <div
      ref={containerRef}
      style={fontControl.style}
      className="space-y-6 animate-fade-in font-sans"
    >
      {/* =========================================================================
          VIEW 1: DAFTAR ISI PEMBAHASAN (Initial View when opening an article)
          - Do NOT display article body yet
          - Shows list of all H1 points in order with original text
          - Features prominent "Baca Semua" button to read the full article
         ========================================================================= */}
      {readingMode === 'toc' && (
        <div
          data-testid="article-toc-view"
          className="nb-reading-surface p-4 sm:p-6 md:p-8 space-y-6 bg-white dark:bg-[#102C2B] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[5px_5px_0px_#171717] dark:shadow-[5px_5px_0px_#071918] rounded-lg transition-all"
        >
          {/* Top Bar: Title, Count, "Baca Semua" button, and Font Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#171717]/15 dark:border-[#4CA7A1]/30 pb-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 rounded-md bg-[#123D32] dark:bg-[#4CA7A1] text-[#FAF7F0] dark:text-[#001722] border-2 border-[#171717] dark:border-[#001722] shadow-[2px_2px_0px_#171717] shrink-0">
                <ListOrdered className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-extrabold font-serif-brand text-[#171717] dark:text-[#CEFEF1] leading-tight">
                    Daftar Isi Pembahasan
                  </h3>
                  <span className="nb-badge bg-[#123D32] text-[#CEFEF1] border-[#171717] text-[10px] font-bold">
                    {slides.length} {slides.length === 1 ? 'Poin' : 'Poin Pembahasan'}
                  </span>
                </div>
                <p className="text-xs text-[#525855] dark:text-[#A6D6C9] mt-0.5 leading-relaxed">
                  Pilih salah satu poin pembahasan di bawah untuk membaca bagian tersebut, atau pilih <strong>Baca Semua</strong> untuk membaca naskah secara utuh.
                </p>
              </div>
            </div>

            {/* Actions: Baca Semua & Font Controls */}
            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto shrink-0">
              <button
                type="button"
                data-testid="read-all-articles-btn"
                onClick={handleReadFullArticle}
                className="px-4 py-2 rounded-md border-2 border-[#171717] dark:border-[#001722] bg-[#D6AD52] hover:bg-[#E5BE65] text-[#171923] text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722] active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
                title="Baca seluruh isi artikel sekaligus dalam satu tampilan utuh"
              >
                <BookOpen className="w-4 h-4 text-[#171923]" />
                <span>Baca Semua</span>
              </button>

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

          {/* Admin Guidance Notice (when article has no H1 and fallback is active) */}
          {fallbackUsed && isAdmin && (
            <div className="p-3.5 rounded-md bg-[#FAF7F0] dark:bg-[#0D2B36] border-2 border-[#D6AD52] text-[#171717] dark:text-[#CEFEF1] text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#D6AD52] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[#123D32] dark:text-[#D6AD52]">Panduan Format Artikel Admin:</strong>
                Artikel ini saat ini disajikan dalam 1 pembahasan utuh. Anda dapat membaginya menjadi beberapa bagian dan memperbarui daftar isi secara otomatis dengan menandai judul pembahasan menggunakan format <strong>Heading 1 (H1)</strong> di editor.
              </div>
            </div>
          )}

          {/* Table of Contents Item Cards */}
          <div className="space-y-3">
            {slides.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => handleSelectSlide(idx)}
                className="w-full text-left p-4 sm:p-5 rounded-lg bg-[#FAF7F0] dark:bg-[#0D2B36] hover:bg-[#F5DABF] dark:hover:bg-[#1A4542] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722] hover:shadow-[4px_4px_0px_#171717] hover:-translate-y-0.5 transition-all duration-150 flex items-center justify-between gap-4 cursor-pointer group"
                data-testid={`article-toc-item-${idx}`}
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-[#6C151E] dark:bg-[#4CA7A1] text-[#FAF7F0] dark:text-[#001722] font-black text-sm sm:text-base flex items-center justify-center shrink-0 border-2 border-[#171717] group-hover:scale-105 transition-transform">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <h4
                      className="text-sm sm:text-base font-extrabold font-serif text-[#171717] dark:text-[#CEFEF1] group-hover:text-[#6C151E] dark:group-hover:text-white leading-snug"
                      dangerouslySetInnerHTML={{ __html: autoWrapArabicText(slide.title) }}
                    />
                    <span className="text-[11px] text-[#525855] dark:text-[#A6D6C9] font-medium block mt-0.5">
                      Klik untuk membuka bagian pembahasan #{idx + 1}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-xs font-black text-[#6C151E] dark:text-[#4CA7A1] group-hover:translate-x-1 transition-transform">
                  <span className="hidden sm:inline">Buka Bagian</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>

          {/* Bottom Callout to Read Full Article */}
          <div className="pt-4 border-t-2 border-[#171717]/10 dark:border-[#4CA7A1]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#FAF7F0]/60 dark:bg-[#0D2B36]/60 p-3.5 rounded-lg">
            <div className="text-xs text-[#525855] dark:text-[#A6D6C9]">
              Ingin membaca keseluruhan naskah secara berurutan dalam satu tampilan utuh tanpa jeda slide?
            </div>
            <button
              type="button"
              onClick={handleReadFullArticle}
              className="px-3.5 py-1.5 rounded-md border border-[#171717] dark:border-[#4CA7A1] bg-[#123D32] text-[#FAF7F0] dark:bg-[#4CA7A1] dark:text-[#001722] text-xs font-bold hover:opacity-90 transition cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Buka Mode Baca Semua</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: TAMPILAN POIN PEMBAHASAN / SLIDE AKTIF
          - Menampilkan pembahasan yang berkaitan dengan H1 yang dipilih
          - Mempertahankan seluruh format (H2, H3, paragraf, teks Arab, tabel, gambar)
          - Navigasi: Sebelumnya (dengan judul tujuan), Selanjutnya, Kembali ke Daftar Isi
          - Judul H1 dapat diklik untuk kembali ke Daftar Isi
         ========================================================================= */}
      {readingMode === 'slide' && currentSlide && navInfo && (
        <div
          data-testid="article-slide-view"
          className="nb-reading-surface p-4 sm:p-6 md:p-8 space-y-6 bg-white dark:bg-[#102C2B] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[5px_5px_0px_#171717] dark:shadow-[5px_5px_0px_#071918] rounded-lg transition-all"
        >
          {/* Top Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#171717] dark:border-[#4CA7A1] pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleBackToToc}
                className="nb-btn nb-btn-secondary px-3.5 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer"
                title="Kembali ke Daftar Isi Pembahasan"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Daftar Isi</span>
              </button>

              <span className="nb-badge bg-[#6C151E] text-[#FFF5E9] border-[#171717] text-[11px] font-bold">
                Pembahasan {currentSlide.index + 1} dari {slides.length}
              </span>

              <button
                type="button"
                onClick={handleReadFullArticle}
                className="px-3 py-1 text-xs font-bold rounded border border-[#171717] dark:border-[#4CA7A1] bg-[#FAF7F0] dark:bg-[#0D2B36] text-[#171717] dark:text-[#CEFEF1] hover:bg-[#D6AD52] hover:text-[#171717] transition flex items-center gap-1.5 cursor-pointer ml-1"
                title="Beralih ke mode Baca Semua"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Baca Semua</span>
              </button>
            </div>

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

          {/* Heading 1 as Slide Title (Clickable to return to Table of Contents) */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={handleBackToToc}
              className="text-left w-full group cursor-pointer"
              title="Klik judul untuk kembali ke daftar isi"
            >
              <h2
                className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-[#6C151E] dark:text-[#CEFEF1] group-hover:text-[#123D32] dark:group-hover:text-[#F5DABF] transition-colors leading-snug"
                dangerouslySetInnerHTML={{ __html: autoWrapArabicText(currentSlide.title) }}
              />
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#6C151E] dark:text-[#4CA7A1] underline group-hover:text-[#171717] dark:group-hover:text-white mt-1 transition-colors">
                <ListOrdered className="w-3 h-3" />
                <span>Klik judul untuk kembali ke daftar isi</span>
              </span>
            </button>
          </div>

          {/* Slide Body Content (H2, H3, paragraphs, Arabic verses, tables, etc.) */}
          {currentSlide.htmlContent ? (
            <div
              className="prose dark:prose-invert max-w-none text-[#171717] dark:text-[#CEFEF1] leading-relaxed space-y-4 font-sans blog-content"
              onClick={onTextClick}
              dangerouslySetInnerHTML={{
                __html: renderFormattedContentHtml(currentSlide.htmlContent)
              }}
            />
          ) : (
            <p className="text-xs italic text-[#525855] dark:text-[#A6D6C9]">
              Tidak ada catatan tambahan di bawah judul ini. Silakan lanjut ke pembahasan berikutnya.
            </p>
          )}

          {/* Bottom Slide Navigation Bar */}
          <div className="pt-6 border-t-2 border-[#171717] dark:border-[#4CA7A1] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Tombol Sebelumnya */}
            <div className="flex-1 min-w-0">
              {!navInfo.isFirst && navInfo.prevSlide ? (
                <button
                  type="button"
                  onClick={() => handleSelectSlide(currentSlide.index - 1)}
                  className="nb-btn nb-btn-secondary px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 max-w-full text-left truncate cursor-pointer w-full sm:w-auto"
                  title={`Sebelumnya: ${navInfo.prevSlide.title}`}
                >
                  <ChevronLeft className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    Sebelumnya: <strong className="font-extrabold">{navInfo.prevSlide.title}</strong>
                  </span>
                </button>
              ) : (
                <div />
              )}
            </div>

            {/* Tombol Tengah: Kembali ke Daftar Isi */}
            <button
              type="button"
              onClick={handleBackToToc}
              className="nb-btn nb-btn-secondary px-4 py-2 text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              title="Lihat seluruh daftar isi artikel"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Daftar Isi</span>
            </button>

            {/* Tombol Selanjutnya / Kembali ke Daftar Isi */}
            <div className="flex-1 min-w-0 flex justify-end">
              {!navInfo.isLast && navInfo.nextSlide ? (
                <button
                  type="button"
                  onClick={() => handleSelectSlide(currentSlide.index + 1)}
                  className="nb-btn nb-btn-gold px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-end gap-2 max-w-full text-right truncate cursor-pointer w-full sm:w-auto"
                  title={`Selanjutnya: ${navInfo.nextSlide.title}`}
                >
                  <span className="truncate">
                    Selanjutnya: <strong className="font-extrabold">{navInfo.nextSlide.title}</strong>
                  </span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBackToToc}
                  className="nb-btn nb-btn-primary px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-end gap-2 cursor-pointer w-full sm:w-auto"
                  title="Anda telah mencapai akhir artikel. Kembali ke daftar isi."
                >
                  <span>Kembali ke Daftar Isi</span>
                  <ListOrdered className="w-4 h-4 shrink-0" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: MODE BACA SEMUA (Full Article Content)
          - Menampilkan seluruh isi artikel secara berurutan dalam satu tampilan utuh
          - Tidak memecah artikel menjadi slide terpisah
          - Menyediakan tombol untuk kembali ke Daftar Isi
         ========================================================================= */}
      {readingMode === 'full' && (
        <div
          data-testid="article-full-view"
          className="space-y-6 animate-fade-in"
        >
          {/* Top Control Bar for Full Mode */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#FAF7F0] dark:bg-[#102C2B] rounded-lg border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[3px_3px_0px_#171717]">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleBackToToc}
                className="nb-btn nb-btn-secondary px-3.5 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer font-bold"
                title="Kembali ke Daftar Isi Pembahasan"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Daftar Isi</span>
              </button>

              <span className="nb-badge bg-[#123D32] text-[#CEFEF1] border-[#171717] text-[11px] font-extrabold flex items-center gap-1.5">
                <BookOpen className="w-3 h-3" />
                <span>Mode Baca Semua (Naskah Utuh)</span>
              </span>
            </div>

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

          {/* Full Article Content */}
          <div
            ref={contentBodyRef}
            data-testid="article-body-content"
            className="prose dark:prose-invert max-w-none sm:max-w-[68ch] mx-auto text-[#171717] dark:text-[#CEFEF1] leading-relaxed space-y-3.5 sm:space-y-4 font-sans blog-content"
            onClick={onTextClick}
            dangerouslySetInnerHTML={{
              __html: renderFormattedContentHtml(rawContent || '')
            }}
          />

          {/* Bottom Bar: Back to TOC Button */}
          <div className="pt-6 border-t-2 border-[#171717]/15 dark:border-[#4CA7A1]/30 flex items-center justify-between">
            <button
              type="button"
              onClick={handleBackToToc}
              className="nb-btn nb-btn-secondary px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer"
              title="Kembali ke Daftar Isi"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Daftar Isi</span>
            </button>

            <span className="text-xs text-[#525855] dark:text-[#A6D6C9] font-medium">
              Selesai membaca seluruh naskah
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
