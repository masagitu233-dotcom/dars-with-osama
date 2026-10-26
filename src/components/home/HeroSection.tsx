import React, { useState, useEffect, useRef } from 'react';
import { Search, BookOpen, Video, FileText, ArrowRight, Sparkles, Compass, GraduationCap } from 'lucide-react';
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
      className="relative overflow-hidden bg-white dark:bg-[#06251D] text-[#171717] dark:text-[#F8F3E8] pt-8 sm:pt-12 pb-12 sm:pb-16 border-b-2 border-[#171717] dark:border-[#D9AC45]/40 transition-colors"
    >
      {/* Subtle Neo-Brutalist Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none bg-[linear-gradient(to_right,#06251D_1px,transparent_1px),linear-gradient(to_bottom,#06251D_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#D9AC45_1px,transparent_1px),linear-gradient(to_bottom,#D9AC45_1px,transparent_1px)] [background-size:32px_32px]" />

      <div ref={contentRef} className="relative max-w-5xl mx-auto px-3 sm:px-6 text-center space-y-6">
        {/* Main Title & Subtitle Header */}
        <div ref={headerRef} className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#D9AC45] border-2 border-[#171717] text-[#171717] rounded-md text-xs font-extrabold uppercase tracking-wider shadow-[3px_3px_0px_#171717]">
            <Sparkles className="w-3.5 h-3.5 text-[#171717]" />
            <span>Platform Pembelajaran Ilmu Syar'i Terstruktur</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold font-serif text-[#171717] dark:text-white leading-tight tracking-tight">
            <span className="font-amiri text-[#0B6B50] dark:text-[#D9AC45] block sm:inline sm:mr-3 text-3xl sm:text-5xl" dir="rtl">
              أهلاً وسهلاً
            </span>
            <span className="block sm:inline">— Selamat Datang di Dars with Osama</span>
          </h1>

          <p className="text-sm sm:text-base font-extrabold text-[#0B6B50] dark:text-[#D9AC45] uppercase tracking-widest">
            Belajar, Memahami, Bertumbuh.
          </p>
        </div>

        {/* Hadith Verse Box */}
        <div
          ref={hadithRef}
          className="max-w-3xl mx-auto bg-[#F5EFE2] dark:bg-[#0B3026] border-2 border-[#171717] dark:border-[#D9AC45]/70 rounded-md p-4 sm:p-5 shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#000000]"
        >
          <p
            dir="rtl"
            className="font-amiri text-xl sm:text-2xl md:text-3xl text-[#171717] dark:text-[#F8F3E8] font-bold leading-relaxed break-words"
          >
            مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ
          </p>
          <p className="text-xs sm:text-sm text-[#0B6B50] dark:text-[#D9AC45] mt-2 font-bold">
            “Barangsiapa menempuh suatu jalan untuk menuntut ilmu, maka Allah akan mudahkan baginya jalan menuju Surga.” (HR. Muslim)
          </p>
        </div>

        {/* Primary CTA & Search Bar */}
        <div ref={searchRef} className="max-w-2xl mx-auto space-y-4 pt-1">
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex items-center bg-white dark:bg-[#0B3026] border-2 border-[#171717] dark:border-[#D9AC45]/70 rounded-md shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#000000]"
          >
            <div className="pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-[#0B6B50] dark:text-[#D9AC45]" />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari judul matan, kitab, kursus, atau artikel ilmiah..."
              className="w-full pl-3 pr-24 sm:pr-28 py-3.5 bg-transparent text-[#171717] dark:text-[#F8F3E8] placeholder-[#57534E]/70 dark:placeholder-[#F8F3E8]/60 text-xs sm:text-sm font-semibold focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Cari"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 sm:px-4 bg-[#D9AC45] hover:bg-[#c99c38] text-[#171717] font-extrabold text-xs uppercase tracking-wider rounded border-2 border-[#171717] transition-all flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#171717] active:translate-x-[1px] active:translate-y-[1px]"
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
              className="nb-btn nb-btn-gold px-5 py-2.5 text-xs sm:text-sm shadow-[3px_3px_0px_#171717]"
            >
              <Compass className="w-4 h-4" />
              <span>Jelajahi Katalog Kitab</span>
            </button>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('instructor-profile')}
                className="px-5 py-2.5 bg-white dark:bg-[#0B3026] hover:bg-[#F5EFE2] dark:hover:bg-[#124638] text-[#171717] dark:text-[#F8F3E8] font-bold text-xs sm:text-sm rounded-md border-2 border-[#171717] dark:border-[#D9AC45] shadow-[3px_3px_0px_#171717] dark:shadow-[4px_4px_0px_#000000] transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <GraduationCap className="w-4 h-4 text-[#0B6B50] dark:text-[#D9AC45]" />
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
            className="p-4 bg-[#F5EFE2] dark:bg-[#0B3026] text-[#171717] dark:text-[#F8F3E8] border-2 border-[#171717] dark:border-[#D9AC45]/50 rounded-md text-left flex items-start gap-3.5 shadow-[3px_3px_0px_#171717] dark:shadow-[4px_4px_0px_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#D9AC45] transition-all cursor-pointer group"
          >
            <div className="p-2.5 bg-[#0B6B50] dark:bg-[#06251D] text-[#F8F3E8] dark:text-[#D9AC45] border-2 border-[#171717] rounded-md shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#171717] dark:text-[#F8F3E8] font-serif group-hover:text-[#0B6B50] dark:group-hover:text-[#D9AC45]">
                Video Pembelajaran
              </h4>
              <p className="text-xs text-[#57534E] dark:text-[#A7B5AE] mt-0.5 leading-snug">
                Penjelasan audio visual terstruktur per sesi halaqah kitab
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onExplore}
            className="p-4 bg-[#F5EFE2] dark:bg-[#0B3026] text-[#171717] dark:text-[#F8F3E8] border-2 border-[#171717] dark:border-[#D9AC45]/50 rounded-md text-left flex items-start gap-3.5 shadow-[3px_3px_0px_#171717] dark:shadow-[4px_4px_0px_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#D9AC45] transition-all cursor-pointer group"
          >
            <div className="p-2.5 bg-[#D9AC45] text-[#171717] border-2 border-[#171717] rounded-md shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#171717] dark:text-[#F8F3E8] font-serif group-hover:text-[#0B6B50] dark:group-hover:text-[#D9AC45]">
                Naskah Asli PDF
              </h4>
              <p className="text-xs text-[#57534E] dark:text-[#A7B5AE] mt-0.5 leading-snug">
                Unduh dan simak buku panduan serta matan Arab lengkap
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onExplore}
            className="p-4 bg-[#F5EFE2] dark:bg-[#0B3026] text-[#171717] dark:text-[#F8F3E8] border-2 border-[#171717] dark:border-[#D9AC45]/50 rounded-md text-left flex items-start gap-3.5 shadow-[3px_3px_0px_#171717] dark:shadow-[4px_4px_0px_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#D9AC45] transition-all cursor-pointer group"
          >
            <div className="p-2.5 bg-[#3478F6] text-white border-2 border-[#171717] rounded-md shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#171717] dark:text-[#F8F3E8] font-serif group-hover:text-[#0B6B50] dark:group-hover:text-[#D9AC45]">
                Evaluasi Kuis
              </h4>
              <p className="text-xs text-[#57534E] dark:text-[#A7B5AE] mt-0.5 leading-snug">
                Uji pemahaman materi dengan koreksi otomatis & sertifikat
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
