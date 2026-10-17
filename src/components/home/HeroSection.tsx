import React, { useState, useEffect, useRef } from 'react';
import { Search, BookOpen, Video, FileText, ArrowRight, Sparkles, BookMarked, Compass } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLanguage } from '../../context/LanguageContext';
import { Category } from '../../types';

gsap.registerPlugin(ScrollTrigger);

interface HeroSectionProps {
  categories: Category[];
  onSearch: (query: string) => void;
  onSelectCategory: (categoryId: string) => void;
  onExplore: () => void;
  onNavigate?: (view: string) => void;
  onOpenAuthModal?: (tab: 'login' | 'register') => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  categories,
  onSearch,
  onSelectCategory,
  onExplore,
  onNavigate,
  onOpenAuthModal
}) => {
  const { t } = useLanguage();
  const [searchInput, setSearchInput] = useState('');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const hadithRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const pillarsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !containerRef.current || !contentRef.current) return;

    const isMobile = window.innerWidth < 768;

    const ctx = gsap.context(() => {
      // Entrance timeline
      const entranceTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      if (glowRef.current) {
        entranceTl.fromTo(
          glowRef.current,
          { opacity: 0, scale: 0.8 },
          { opacity: 1, scale: 1, duration: 1.1 }
        );
      }

      if (headerRef.current) {
        entranceTl.fromTo(
          headerRef.current,
          { opacity: 0, y: -20, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.8 },
          glowRef.current ? '-=0.8' : 0
        );
      }

      if (hadithRef.current) {
        entranceTl.fromTo(
          hadithRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7 },
          '-=0.5'
        );
      }

      if (buttonsRef.current) {
        entranceTl.fromTo(
          buttonsRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6 },
          '-=0.4'
        );
      }

      if (searchRef.current) {
        entranceTl.fromTo(
          searchRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6 },
          '-=0.3'
        );
      }

      if (pillarsRef.current) {
        const pillarCards = pillarsRef.current.children;
        entranceTl.fromTo(
          pillarCards,
          { opacity: 0, y: 20, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.1 },
          '-=0.3'
        );
      }

      // Parallax effect on scroll
      gsap.to(contentRef.current, {
        y: isMobile ? 25 : 50,
        opacity: 0.6,
        ease: 'none',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput);
      onExplore();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden bg-gradient-to-b from-[#073B2E]/10 via-[#F7F6EF] to-[#F7F6EF] dark:from-[#071B16] dark:via-[#071B16] dark:to-[#071B16] text-[#073B2E] dark:text-[#F7F6EF] pt-8 sm:pt-10 pb-10 sm:pb-14 border-b border-[#073B2E]/10 dark:border-[#C9A34E]/20 rounded-b-2xl sm:rounded-b-[2rem] shadow-sm transition-colors duration-250"
    >
      {/* Background Islamic Pattern Accent */}
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-5 pointer-events-none bg-[radial-gradient(#C9A34E_1px,transparent_1px)] [background-size:24px_24px]" />
      
      {/* Soft Ambient Floating Glows */}
      <div
        ref={glowRef}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[550px] h-[280px] bg-[#C9A34E]/10 dark:bg-[#C9A34E]/10 blur-[110px] rounded-full pointer-events-none"
      />

      <div ref={contentRef} className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6 will-change-transform">
        
        {/* Main Title & Subtitle Header */}
        <div ref={headerRef} className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-[#C9A34E]/15 border border-[#C9A34E]/30 text-[#073B2E] dark:text-[#F4B942] rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#F4B942]" />
            <span>Ruang Belajar & Berbagi Ilmu</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-serif-brand text-[#073B2E] dark:text-[#F7F6EF] leading-tight">
            <span className="font-amiri text-[#C9A34E] dark:text-[#F4B942] block sm:inline sm:mr-2" dir="rtl">
              أهلاً وسهلاً
            </span>
            — Selamat Datang di Dars with Osama
          </h1>

          <p className="text-sm sm:text-base font-semibold text-[#0EA5A4] dark:text-[#C9A34E] font-serif-brand tracking-wide">
            Belajar, Memahami, Bertumbuh.
          </p>
        </div>

        {/* Hadith Verse */}
        <p
          ref={hadithRef}
          className="font-amiri text-lg sm:text-xl md:text-2xl text-[#073B2E] dark:text-[#C9A34E] font-bold tracking-wide transition-all duration-300 drop-shadow-xs max-w-2xl mx-auto"
        >
          مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ
        </p>

        {/* Search Bar for Quick Subject Lookup */}
        <div ref={searchRef} className="max-w-xl mx-auto pt-1">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center shadow-sm dark:shadow-xl rounded-xl group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7C7A] group-focus-within:text-[#073B2E] dark:group-focus-within:text-[#C9A34E] transition-colors">
              <Search className="w-4 h-4 text-[#C9A34E] group-focus-within:scale-110 transition-transform" />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari judul matan, kitab, atau artikel..."
              className="w-full pl-10 pr-14 py-2.5 bg-white dark:bg-[#0c2b23] hover:bg-white dark:hover:bg-[#0c2b23] focus:bg-white dark:focus:bg-[#0c2b23] border border-[#073B2E]/20 dark:border-[#143e33] focus:border-[#C9A34E] dark:focus:border-[#C9A34E] rounded-xl text-[#073B2E] dark:text-[#F7F6EF] placeholder-[#6B7C7A] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A34E]/20 transition-all duration-300 shadow-xs"
            />
            <button
              type="submit"
              aria-label="Cari"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-[#073B2E] hover:bg-[#0a4d3c] active:scale-[0.98] text-[#F7F6EF] rounded-lg transition-all duration-200 flex items-center justify-center shadow hover:shadow-md cursor-pointer border border-[#C9A34E]/30"
            >
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </form>
        </div>

        {/* 3 Pillars Feature Banner */}
        <div ref={pillarsRef} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 max-w-2xl mx-auto pt-1">
          <div className="p-3 bg-white dark:bg-[#0c2b23] hover:border-[#C9A34E]/50 border border-[#073B2E]/10 dark:border-[#143e33] rounded-xl text-left flex items-start gap-2.5 transition-all duration-300 hover:-translate-y-0.5 shadow-xs group">
            <div className="p-2 bg-[#073B2E]/10 dark:bg-[#C9A34E]/20 text-[#073B2E] dark:text-[#C9A34E] rounded-lg shrink-0 transition-colors">
              <Video className="w-4 h-4 transition-transform group-hover:scale-110" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#073B2E] dark:text-[#F7F6EF] group-hover:text-[#C9A34E] transition-colors font-serif-brand">Video Rekaman</h4>
              <p className="text-[10px] text-[#6B7C7A] dark:text-[#8C9E9B] mt-0.5">Penjelasan audio visual per sesi halaqah</p>
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-[#0c2b23] hover:border-[#C9A34E]/50 border border-[#073B2E]/10 dark:border-[#143e33] rounded-xl text-left flex items-start gap-2.5 transition-all duration-300 hover:-translate-y-0.5 shadow-xs group">
            <div className="p-2 bg-[#C9A34E]/20 text-[#C9A34E] rounded-lg shrink-0 transition-colors">
              <FileText className="w-4 h-4 transition-transform group-hover:scale-110" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#073B2E] dark:text-[#F7F6EF] group-hover:text-[#C9A34E] transition-colors font-serif-brand">Naskah Asli PDF</h4>
              <p className="text-[10px] text-[#6B7C7A] dark:text-[#8C9E9B] mt-0.5">Buku panduan & matan Arab lengkap</p>
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-[#0c2b23] hover:border-[#C9A34E]/50 border border-[#073B2E]/10 dark:border-[#143e33] rounded-xl text-left flex items-start gap-2.5 transition-all duration-300 hover:-translate-y-0.5 shadow-xs group">
            <div className="p-2 bg-[#073B2E]/10 dark:bg-[#C9A34E]/20 text-[#073B2E] dark:text-[#C9A34E] rounded-lg shrink-0 transition-colors">
              <BookOpen className="w-4 h-4 transition-transform group-hover:scale-110" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#073B2E] dark:text-[#F7F6EF] group-hover:text-[#C9A34E] transition-colors font-serif-brand">Evaluasi Kuis</h4>
              <p className="text-[10px] text-[#6B7C7A] dark:text-[#8C9E9B] mt-0.5">Koreksi otomatis & pengukuran nilai</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
