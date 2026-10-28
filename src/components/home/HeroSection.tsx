import React, { useState, useEffect, useRef } from 'react';
import { Search, BookOpen, Video, FileText, ArrowRight, Compass, GraduationCap } from 'lucide-react';
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
  const headerRef = useRef<HTMLDivElement>(null);
  const hadithRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const pillarsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !containerRef.current || !contentRef.current) return;

    const ctx = gsap.context(() => {
      const entranceTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      if (headerRef.current) {
        entranceTl.fromTo(
          headerRef.current,
          { opacity: 0, y: -16 },
          { opacity: 1, y: 0, duration: 0.6 }
        );
      }

      if (hadithRef.current) {
        entranceTl.fromTo(
          hadithRef.current,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.5 },
          '-=0.35'
        );
      }

      if (searchRef.current) {
        entranceTl.fromTo(
          searchRef.current,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.5 },
          '-=0.3'
        );
      }

      if (pillarsRef.current) {
        const pillarCards = pillarsRef.current.children;
        entranceTl.fromTo(
          pillarCards,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.4, stagger: 0.08 },
          '-=0.25'
        );
      }
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
      className="relative overflow-hidden bg-white dark:bg-[#0D2B36] text-[#171717] dark:text-[#CEFEF1] pt-8 sm:pt-12 pb-12 sm:pb-16 border-b-2 border-[#171717] dark:border-[#4CA7A1] transition-colors"
    >
      {/* Subtle Neo-Brutalist Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none bg-[linear-gradient(to_right,#123D32_1px,transparent_1px),linear-gradient(to_bottom,#123D32_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#4CA7A1_1px,transparent_1px),linear-gradient(to_bottom,#4CA7A1_1px,transparent_1px)] [background-size:32px_32px]" />

      <div ref={contentRef} className="relative max-w-5xl mx-auto px-3 sm:px-6 text-center space-y-6">
        {/* Main Title & Subtitle Header */}
        <div ref={headerRef} className="space-y-3.5">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif text-[#171717] dark:text-white leading-tight tracking-tight">
            <span className="font-amiri text-[#123D32] dark:text-[#CEFEF1] block sm:inline sm:mr-2.5 text-2xl sm:text-3xl lg:text-4xl leading-[1.8]" dir="rtl">
              أهلاً وسهلاً
            </span>
            <span className="block sm:inline">— Selamat Datang di Dars with Osama</span>
          </h1>

          <p className="text-xs sm:text-sm font-extrabold text-[#123D32] dark:text-[#A6D6C9] uppercase tracking-widest">
            Belajar, Memahami, Bertumbuh.
          </p>
        </div>

        {/* Hadith Verse Box */}
        <div
          ref={hadithRef}
          className="max-w-3xl mx-auto bg-[#EFE5D2] dark:bg-[#1F5F63] border-2 border-[#171717] dark:border-[#4CA7A1] rounded-md p-4 sm:p-5 shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#001722]"
        >
          <p
            dir="rtl"
            className="font-amiri text-lg sm:text-xl md:text-[23px] text-[#171717] dark:text-[#FFFFFF] font-bold leading-[2.1] break-words"
          >
            مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ
          </p>
          <p className="text-xs sm:text-sm text-[#171923] dark:text-white mt-2 font-bold">
            “Barangsiapa menempuh suatu jalan untuk menuntut ilmu, maka Allah akan mudahkan baginya jalan menuju Surga.” (HR. Muslim)
          </p>
        </div>

        {/* Primary CTA & Search Bar */}
        <div ref={searchRef} className="max-w-2xl mx-auto space-y-4 pt-1">
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex items-center bg-white dark:bg-[#001722] border-2 border-[#171717] dark:border-[#4CA7A1] rounded-md shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#001722]"
          >
            <div className="pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-[#123D32] dark:text-[#4CA7A1]" />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari judul matan, kitab, kursus, atau artikel ilmiah..."
              className="w-full pl-3 pr-24 sm:pr-28 py-3.5 bg-transparent text-[#171717] dark:text-[#CEFEF1] placeholder-[#525855] dark:placeholder-[#A6D6C9]/80 text-xs sm:text-sm font-semibold focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Cari"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 sm:px-4 bg-[#123D32] dark:bg-[#4CA7A1] hover:bg-[#195344] dark:hover:bg-[#5EBEB7] text-[#FAF7F0] dark:text-[#001722] font-extrabold text-xs uppercase tracking-wider rounded border-2 border-[#171717] dark:border-[#001722] transition-all flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] active:translate-x-[1px] active:translate-y-[1px]"
            >
              <span>Cari</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onExplore}
              className="nb-btn nb-btn-gold px-5 py-2.5 text-xs sm:text-sm"
            >
              <Compass className="w-4 h-4" />
              <span>Jelajahi Katalog Kitab</span>
            </button>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('instructor-profile')}
                className="px-5 py-2.5 bg-white dark:bg-[#0D2B36] hover:bg-[#EFE5D2] dark:hover:bg-[#1F5F63] text-[#171717] dark:text-[#CEFEF1] font-bold text-xs sm:text-sm rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[4px_4px_0px_#001722] transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <GraduationCap className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1]" />
                <span>Profil Pengajar</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Pillars Feature Shortcuts (Video, Naskah PDF, Evaluasi Kuis) */}
        <div ref={pillarsRef} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-4xl mx-auto pt-3">
          <button
            type="button"
            onClick={onExplore}
            className="p-4 bg-[#FAF7F0] dark:bg-[#1F5F63] text-[#171717] dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] rounded-md text-left flex items-start gap-3.5 shadow-[3px_3px_0px_#171717] dark:shadow-[4px_4px_0px_#001722] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#171717] dark:hover:shadow-[5px_5px_0px_#001722] dark:hover:border-[#CEFEF1] transition-all cursor-pointer group"
          >
            <div className="p-2.5 bg-[#123D32] dark:bg-[#001722] text-[#FAF7F0] dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] rounded-md shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#171717] dark:text-[#CEFEF1] font-serif group-hover:text-[#123D32] dark:group-hover:text-white">
                Video Pembelajaran
              </h4>
              <p className="text-xs text-[#525855] dark:text-[#A6D6C9] mt-0.5 leading-snug">
                Penjelasan audio visual terstruktur per sesi halaqah kitab
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onExplore}
            className="p-4 bg-[#FAF7F0] dark:bg-[#1F5F63] text-[#171717] dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] rounded-md text-left flex items-start gap-3.5 shadow-[3px_3px_0px_#171717] dark:shadow-[4px_4px_0px_#001722] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#171717] dark:hover:shadow-[5px_5px_0px_#001722] dark:hover:border-[#CEFEF1] transition-all cursor-pointer group"
          >
            <div className="p-2.5 bg-[#4CA7A1] text-[#001722] border-2 border-[#171717] dark:border-[#001722] rounded-md shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#171717] dark:text-[#CEFEF1] font-serif group-hover:text-[#123D32] dark:group-hover:text-white">
                Naskah Asli PDF
              </h4>
              <p className="text-xs text-[#525855] dark:text-[#A6D6C9] mt-0.5 leading-snug">
                Unduh dan simak buku panduan serta matan Arab lengkap
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onExplore}
            className="p-4 bg-[#FAF7F0] dark:bg-[#1F5F63] text-[#171717] dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] rounded-md text-left flex items-start gap-3.5 shadow-[3px_3px_0px_#171717] dark:shadow-[4px_4px_0px_#001722] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#171717] dark:hover:shadow-[5px_5px_0px_#001722] dark:hover:border-[#CEFEF1] transition-all cursor-pointer group"
          >
            <div className="p-2.5 bg-[#123D32] dark:bg-[#0D2B36] text-white dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] rounded-md shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#171717] dark:text-[#CEFEF1] font-serif group-hover:text-[#123D32] dark:group-hover:text-white">
                Evaluasi Kuis
              </h4>
              <p className="text-xs text-[#525855] dark:text-[#A6D6C9] mt-0.5 leading-snug">
                Uji pemahaman materi dengan koreksi otomatis & sertifikat
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
