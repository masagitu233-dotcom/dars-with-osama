import React, { useState, useEffect, useRef } from 'react';
import { Search, BookOpen, Video, FileText, ArrowRight, Sparkles } from 'lucide-react';
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
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  categories,
  onSearch,
  onSelectCategory,
  onExplore
}) => {
  const { t } = useLanguage();
  const [searchInput, setSearchInput] = useState('');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const hadithRef = useRef<HTMLParagraphElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const pillarsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !containerRef.current || !contentRef.current) return;

    const isMobile = window.innerWidth < 768;

    const ctx = gsap.context(() => {
      // 1. Entrance animation on mount
      const entranceTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      if (glowRef.current) {
        entranceTl.fromTo(
          glowRef.current,
          { opacity: 0, scale: 0.8 },
          { opacity: 1, scale: 1, duration: 1.1 }
        );
      }

      if (hadithRef.current) {
        entranceTl.fromTo(
          hadithRef.current,
          { opacity: 0, y: -25, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.85 },
          glowRef.current ? '-=0.8' : 0
        );
      }

      if (subtitleRef.current) {
        entranceTl.fromTo(
          subtitleRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7 },
          '-=0.6'
        );
      }

      if (searchRef.current) {
        entranceTl.fromTo(
          searchRef.current,
          { opacity: 0, y: 25, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.7 },
          '-=0.5'
        );
      }

      if (pillarsRef.current) {
        const pillarCards = pillarsRef.current.children;
        entranceTl.fromTo(
          pillarCards,
          { opacity: 0, y: 25, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.1 },
          '-=0.4'
        );
      }

      // 2. Hero Parallax & Fade-out effect when scrolling down (with scrub)
      gsap.to(contentRef.current, {
        y: isMobile ? 35 : 75,
        scale: isMobile ? 0.98 : 0.95,
        opacity: 0.35,
        ease: 'none',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        }
      });

      // Background ambient glow parallax with scrub
      if (glowRef.current) {
        gsap.to(glowRef.current, {
          y: isMobile ? 25 : 60,
          scale: 1.15,
          ease: 'none',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 1,
          }
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchInput);
    onExplore();
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden bg-gradient-to-b from-emerald-50/70 via-stone-100 to-stone-50 dark:from-stone-900 dark:via-stone-900 dark:to-stone-950 text-stone-900 dark:text-stone-100 pt-12 pb-24 sm:pb-32 border-b border-stone-200 dark:border-stone-800/80 rounded-b-3xl sm:rounded-b-[2.5rem] shadow-sm dark:shadow-2xl transition-colors duration-250"
    >
      {/* Background Islamic Pattern Accent */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-5 pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px]" />
      
      {/* Soft Ambient Floating Glows */}
      <div
        ref={glowRef}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[320px] bg-emerald-500/10 dark:bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none"
      />
      <div className="absolute top-20 right-1/4 w-[350px] h-[220px] bg-amber-500/10 dark:bg-amber-500/5 blur-[100px] rounded-full pointer-events-none animate-float-slow" />

      <div ref={contentRef} className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 will-change-transform">
        {/* Title & Hadith */}
        <div className="space-y-4 max-w-4xl mx-auto">
          <p
            ref={hadithRef}
            className="font-amiri text-2xl sm:text-3xl md:text-4xl text-emerald-800 dark:text-amber-300/90 font-bold tracking-wide transition-all duration-300 hover:text-emerald-700 dark:hover:text-amber-200 drop-shadow-xs"
          >
            مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ
          </p>

          <p
            ref={subtitleRef}
            className="text-sm sm:text-base text-stone-600 dark:text-stone-300 max-w-2xl mx-auto leading-relaxed"
          >
            {t('heroSubtitle')}
          </p>
        </div>

        {/* Search Bar */}
        <div ref={searchRef} className="max-w-2xl mx-auto">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center shadow-lg dark:shadow-2xl rounded-2xl group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors">
              <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-focus-within:scale-110 transition-transform" />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari judul matan..."
              className="w-full pl-12 pr-16 py-4 bg-white dark:bg-stone-800/90 hover:bg-stone-50 dark:hover:bg-stone-800 focus:bg-white dark:focus:bg-stone-850 border border-stone-300 dark:border-stone-700 focus:border-emerald-600 dark:focus:border-emerald-500 rounded-2xl text-stone-900 dark:text-stone-100 placeholder-stone-400 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300 shadow-sm"
            />
            <button
              type="submit"
              aria-label="Cari"
              className="absolute right-2 top-2 bottom-2 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl transition-all duration-200 flex items-center justify-center shadow hover:shadow-emerald-900/40 hover:shadow-md cursor-pointer"
            >
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </form>
        </div>

        {/* 3 Pillars Feature Banner */}
        <div ref={pillarsRef} className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto pt-8">
          <div className="p-4 bg-white/90 dark:bg-stone-800/40 hover:bg-white dark:hover:bg-stone-800/70 border border-stone-200 dark:border-stone-800 hover:border-emerald-600/40 rounded-2xl text-left flex items-start gap-3 transition-all duration-300 hover:-translate-y-1 shadow-xs hover:shadow-md dark:shadow-none group">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/60 text-emerald-700 dark:text-emerald-400 rounded-xl shrink-0 transition-colors">
              <Video className="w-5 h-5 transition-transform group-hover:scale-110" />
            </div>
            <div>
              <h4 className="text-xs md:text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">Video Rekaman</h4>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">Penjelasan audio visual per sesi halaqah</p>
            </div>
          </div>

          <div className="p-4 bg-white/90 dark:bg-stone-800/40 hover:bg-white dark:hover:bg-stone-800/70 border border-stone-200 dark:border-stone-800 hover:border-amber-600/40 rounded-2xl text-left flex items-start gap-3 transition-all duration-300 hover:-translate-y-1 shadow-xs hover:shadow-md dark:shadow-none group">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/40 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/60 text-amber-700 dark:text-amber-400 rounded-xl shrink-0 transition-colors">
              <FileText className="w-5 h-5 transition-transform group-hover:scale-110" />
            </div>
            <div>
              <h4 className="text-xs md:text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">Naskah Asli PDF</h4>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">Buku panduan & matan Arab lengkap</p>
            </div>
          </div>

          <div className="p-4 bg-white/90 dark:bg-stone-800/40 hover:bg-white dark:hover:bg-stone-800/70 border border-stone-200 dark:border-stone-800 hover:border-emerald-600/40 rounded-2xl text-left flex items-start gap-3 transition-all duration-300 hover:-translate-y-1 shadow-xs hover:shadow-md dark:shadow-none group">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/60 text-emerald-700 dark:text-emerald-400 rounded-xl shrink-0 transition-colors">
              <BookOpen className="w-5 h-5 transition-transform group-hover:scale-110" />
            </div>
            <div>
              <h4 className="text-xs md:text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">Evaluasi Kuis</h4>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">Koreksi otomatis & pengukuran nilai</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
