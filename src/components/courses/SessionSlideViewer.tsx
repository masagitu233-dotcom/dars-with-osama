import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  ArrowLeft,
  Info
} from 'lucide-react';
import { splitSessionContentIntoSlides, getSlideNavInfo } from '../../utils/sessionSlideHelper.js';
import { renderFormattedContentHtml } from '../../utils/arabicFontHelper.js';
import { ReadingFontControls, useReadingFontSize } from '../common/ReadingFontControls.js';

interface SessionSlideViewerProps {
  rawContent: string | undefined | null;
  sessionTitle: string;
  fontControl: ReturnType<typeof useReadingFontSize>;
  isAdmin?: boolean;
}

export const SessionSlideViewer: React.FC<SessionSlideViewerProps> = ({
  rawContent,
  sessionTitle,
  fontControl,
  isAdmin = false
}) => {
  // Initial view is always Table of Contents (activeSlideIndex === null)
  const [activeSlideIndex, setActiveSlideIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Automatically parse slides from H1 elements
  const slideResult = splitSessionContentIntoSlides(rawContent, sessionTitle);
  const { slides, fallbackUsed } = slideResult;

  // Whenever session or raw content changes, reset to Table of Contents view
  useEffect(() => {
    setActiveSlideIndex(null);
  }, [sessionTitle, rawContent]);

  const scrollToViewerTop = () => {
    if (containerRef.current) {
      // Calculate top position with headroom for sticky header
      const rect = containerRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const targetY = rect.top + scrollTop - 80;
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    }
  };

  const handleSelectSlide = (index: number) => {
    if (index >= 0 && index < slides.length) {
      setActiveSlideIndex(index);
      setTimeout(scrollToViewerTop, 40);
    }
  };

  const handleBackToToc = () => {
    setActiveSlideIndex(null);
    setTimeout(scrollToViewerTop, 40);
  };

  // If there are no slides and no meaningful content, do not render an empty box
  if (slides.length === 0) {
    return null;
  }

  // Active slide info
  const isSlideOpen = activeSlideIndex !== null && activeSlideIndex >= 0 && activeSlideIndex < slides.length;
  const currentSlide = isSlideOpen ? slides[activeSlideIndex] : null;
  const navInfo = isSlideOpen ? getSlideNavInfo(slides, activeSlideIndex) : null;

  return (
    <div
      ref={containerRef}
      style={fontControl.style}
      className="nb-reading-surface p-4 sm:p-6 md:p-8 space-y-5 bg-white dark:bg-[#1F5F63] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[5px_5px_0px_#171717] dark:shadow-[5px_5px_0px_#001722] rounded-lg transition-all"
    >
      {/* =========================================================================
          VIEW A: DAFTAR ISI OTOMATIS (Initial & Table of Contents Overview)
          ========================================================================= */}
      {!isSlideOpen && (
        <div className="space-y-6 animate-fade-in" data-testid="session-toc-view">
          {/* Top Bar: TOC Title & Font Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#171717] dark:border-[#4CA7A1] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-md bg-[#001722] text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] shrink-0">
                <ListOrdered className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-extrabold font-serif-brand text-[#171717] dark:text-[#CEFEF1] leading-snug">
                    Daftar Isi Pembahasan
                  </h3>
                  <span className="nb-badge bg-[#123D32] text-[#CEFEF1] border-[#171717] text-[10px]">
                    {slides.length} {slides.length === 1 ? 'Poin Pembahasan' : 'Poin Pembahasan (Slide)'}
                  </span>
                </div>
                <p className="text-xs text-[#525855] dark:text-[#A6D6C9] font-sans mt-0.5">
                  Pilih salah satu poin pembahasan di bawah untuk membaca materi pembelajaran dan faedah ilmiah.
                </p>
              </div>
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

          {/* Fallback Notice for Admin (if legacy content has no H1) */}
          {fallbackUsed && isAdmin && (
            <div className="p-3.5 rounded-md bg-[#FAF7F0] dark:bg-[#0D2B36] border-2 border-[#D6AD52] text-[#171717] dark:text-[#CEFEF1] text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#D6AD52] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[#123D32] dark:text-[#D6AD52]">Panduan Format Sesi Admin:</strong>
                Materi sesi ini saat ini disajikan dalam 1 slide utuh. Anda dapat membaginya menjadi beberapa slide pembahasan dan memperbarui daftar isi secara otomatis dengan menandai judul pembahasan menggunakan format <strong>Heading 1 (H1)</strong> di editor.
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
                className="w-full text-left p-4 sm:p-5 rounded-lg bg-[#FAF7F0] dark:bg-[#0D2B36] hover:bg-[#F5DABF] dark:hover:bg-[#254F55] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722] hover:shadow-[4px_4px_0px_#171717] hover:-translate-y-0.5 transition-all duration-150 flex items-center justify-between gap-4 cursor-pointer group"
                data-testid={`session-toc-item-${idx}`}
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-[#123D32] text-[#FAF7F0] font-black text-sm sm:text-base flex items-center justify-center shrink-0 border-2 border-[#171717] group-hover:bg-[#001722] transition-colors">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm sm:text-base font-extrabold font-serif-brand text-[#171717] dark:text-[#CEFEF1] group-hover:text-[#001722] dark:group-hover:text-white leading-snug">
                      {slide.title}
                    </h4>
                    <span className="text-[11px] text-[#525855] dark:text-[#A6D6C9] font-medium block mt-0.5">
                      Klik untuk membuka slide pembahasan #{idx + 1}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-xs font-black text-[#123D32] dark:text-[#CEFEF1] group-hover:translate-x-1 transition-transform">
                  <span className="hidden sm:inline">Buka Slide</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW B: SLIDE PEMBAHASAN AKTIF (Slide View & Navigation)
          ========================================================================= */}
      {isSlideOpen && currentSlide && navInfo && (
        <div className="space-y-6 animate-fade-in" data-testid="session-slide-view">
          {/* Top Slide Control Bar */}
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

              <span className="nb-badge bg-[#001722] text-[#CEFEF1] border-[#171717] text-[11px] font-bold">
                Pembahasan {currentSlide.index + 1} dari {slides.length}
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

          {/* Heading 1 as Slide Title (Clickable to return to Table of Contents) */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={handleBackToToc}
              className="text-left w-full group cursor-pointer"
              title="Klik judul untuk kembali ke daftar isi"
            >
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold font-serif-brand text-[#171717] dark:text-[#CEFEF1] group-hover:text-[#123D32] dark:group-hover:text-[#F5DABF] transition-colors leading-snug">
                {currentSlide.title}
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#123D32] dark:text-[#4CA7A1] underline group-hover:text-[#001722] dark:group-hover:text-white mt-1 transition-colors">
                <ListOrdered className="w-3 h-3" />
                <span>Klik judul untuk kembali ke daftar isi</span>
              </span>
            </button>
          </div>

          {/* Slide Body Content (H2, H3, paragraphs, Arabic verses, tables, etc.) */}
          {currentSlide.htmlContent ? (
            <div
              className="prose dark:prose-invert max-w-none text-[#171717] dark:text-[#CEFEF1] leading-relaxed space-y-4 font-sans blog-content"
              dangerouslySetInnerHTML={{ __html: renderFormattedContentHtml(currentSlide.htmlContent) }}
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
              title="Lihat seluruh daftar isi sesi"
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
                  title="Anda telah mencapai akhir materi. Kembali ke daftar isi."
                >
                  <span>Kembali ke Daftar Isi</span>
                  <ListOrdered className="w-4 h-4 shrink-0" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
