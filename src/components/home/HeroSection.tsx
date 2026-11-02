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
    const clean = searchInput.trim().replace(/\s+/g, ' ');
    if (clean) {
      onSearch(clean);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden py-8 sm:py-12 transition-colors"
    >
      {/* Welcome Area Main Container (Green #013E37 Frame) */}
      <div
        ref={contentRef}
        className="relative max-w-5xl mx-auto px-4 sm:px-8 md:px-10 py-8 sm:py-10 bg-[#013E37] border-2 border-[#171717] rounded-xl shadow-[6px_6px_0px_#171717] text-center space-y-6 sm:space-y-8"
      >
        {/* Main Title & Subtitle Header */}
        <div ref={headerRef} className="space-y-3.5">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif text-[#FFF3D5] leading-tight tracking-tight">
            <span className="font-amiri text-[#FFF3D5] block sm:inline sm:mr-2.5 text-2xl sm:text-3xl lg:text-4xl leading-[1.8]" dir="rtl">
              أهلاً وسهلاً
            </span>
            <span className="block sm:inline">— Selamat Datang di Dars with Osama</span>
          </h1>

          <p className="text-xs sm:text-sm font-extrabold text-[#FFF3D5]/90 uppercase tracking-widest">
            Belajar, Memahami, Bertumbuh.
          </p>
        </div>

        {/* Hadith Verse Box (Butter #FFEFB3 Frame) */}
        <div
          ref={hadithRef}
          className="max-w-3xl mx-auto bg-[#FFEFB3] border-2 border-[#171717] rounded-lg p-4 sm:p-6 shadow-[4px_4px_0px_#171717]"
        >
          <p
            dir="rtl"
            className="font-amiri text-lg sm:text-xl md:text-[23px] text-[#013E37] font-bold leading-[2.1] break-words"
          >
            مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ
          </p>
          <p className="text-xs sm:text-sm text-[#013E37] mt-2 font-bold">
            “Barangsiapa menempuh suatu jalan untuk menuntut ilmu, maka Allah akan mudahkan baginya jalan menuju Surga.” (HR. Muslim)
          </p>
        </div>

        {/* Primary CTA & Search Bar */}
        <div ref={searchRef} className="max-w-2xl mx-auto space-y-4 pt-1">
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex items-center bg-[#FAF7F0] border-2 border-[#171717] rounded-lg shadow-[4px_4px_0px_#171717]"
          >
            <div className="pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-[#013E37]" />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari judul matan, kitab, kursus, atau artikel ilmiah..."
              className="w-full pl-3 pr-24 sm:pr-28 py-3.5 bg-transparent text-[#171717] placeholder-[#525855] text-xs sm:text-sm font-semibold focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Cari"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 sm:px-4 bg-[#FFEFB3] hover:bg-[#FFE58A] text-[#013E37] font-extrabold text-xs uppercase tracking-wider rounded border-2 border-[#171717] transition-all flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#171717] active:translate-x-[1px] active:translate-y-[1px]"
            >
              <span>Cari</span>
              <ArrowRight className="w-4 h-4 text-[#013E37]" />
            </button>
          </form>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onExplore}
              className="px-5 py-2.5 bg-[#FFEFB3] hover:bg-[#FFE58A] text-[#013E37] font-extrabold text-xs sm:text-sm rounded-lg border-2 border-[#171717] shadow-[3px_3px_0px_#171717] transition-all inline-flex items-center gap-2 cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
            >
              <Compass className="w-4 h-4 text-[#013E37]" />
              <span>Jelajahi Katalog Kitab</span>
            </button>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('instructor-profile')}
                className="px-5 py-2.5 bg-[#FAF7F0] hover:bg-white text-[#013E37] font-bold text-xs sm:text-sm rounded-lg border-2 border-[#171717] shadow-[3px_3px_0px_#171717] transition-all inline-flex items-center gap-2 cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
              >
                <GraduationCap className="w-4 h-4 text-[#013E37]" />
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
            className="p-4 bg-[#FAF7F0] text-[#171717] border-2 border-[#171717] rounded-lg text-left flex items-start gap-3.5 shadow-[3px_3px_0px_#171717] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#171717] transition-all cursor-pointer group"
          >
            <div className="p-2.5 bg-[#013E37] text-[#FFF3D5] border-2 border-[#171717] rounded-md shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#171717] font-serif group-hover:text-[#013E37]">
                Video Pembelajaran
              </h4>
              <p className="text-xs text-[#525855] mt-0.5 leading-snug">
                Penjelasan audio visual terstruktur per sesi halaqah kitab
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onExplore}
            className="p-4 bg-[#FAF7F0] text-[#171717] border-2 border-[#171717] rounded-lg text-left flex items-start gap-3.5 shadow-[3px_3px_0px_#171717] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#171717] transition-all cursor-pointer group"
          >
            <div className="p-2.5 bg-[#FFEFB3] text-[#013E37] border-2 border-[#171717] rounded-md shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#171717] font-serif group-hover:text-[#013E37]">
                Naskah Asli PDF
              </h4>
              <p className="text-xs text-[#525855] mt-0.5 leading-snug">
                Unduh dan simak buku panduan serta matan Arab lengkap
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onExplore}
            className="p-4 bg-[#FAF7F0] text-[#171717] border-2 border-[#171717] rounded-lg text-left flex items-start gap-3.5 shadow-[3px_3px_0px_#171717] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#171717] transition-all cursor-pointer group"
          >
            <div className="p-2.5 bg-[#013E37] text-[#FFF3D5] border-2 border-[#171717] rounded-md shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#171717] font-serif group-hover:text-[#013E37]">
                Evaluasi Kuis
              </h4>
              <p className="text-xs text-[#525855] mt-0.5 leading-snug">
                Uji pemahaman materi dengan koreksi otomatis & sertifikat
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
