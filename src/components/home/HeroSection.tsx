import React, { useState } from 'react';
import { Search, BookOpen, Video, FileText, ArrowRight, Compass, GraduationCap } from 'lucide-react';
import { Category } from '../../types';

interface HeroSectionProps {
  categories: Category[];
  onSearch: (query: string) => void;
  onSelectCategory: (categoryId: string) => void;
  onExplore: () => void;
  onNavigate?: (view: string) => void;
  onOpenAuthModal?: (tab: 'login' | 'register') => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSearch,
  onExplore,
  onNavigate
}) => {
  const [searchInput, setSearchInput] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchInput.trim().replace(/\s+/g, ' ');
    if (clean) {
      onSearch(clean);
    }
  };

  return (
    <div className="relative overflow-x-clip py-4 sm:py-6 px-3 sm:px-6 transition-colors">
      {/* Welcome Area Main Container (Green #013E37 Frame) */}
      <div
        className="relative max-w-[1160px] mx-auto px-4 sm:px-7 md:px-9 py-5 sm:py-6 lg:py-7 bg-[#013E37] border-2 border-[#171717] rounded-xl shadow-[5px_5px_0px_#171717] text-center space-y-4 sm:space-y-5"
      >
        {/* Main Title & Subtitle Header */}
        <div data-aos="fade-up" className="space-y-1.5">
          <h1 className="dars-hero-title font-bold font-serif text-[#FFF3D5] tracking-tight">
            <span className="font-amiri text-[#FFF3D5] block sm:inline sm:mr-2 text-2xl sm:text-3xl leading-[1.6]" dir="rtl">
              أهلاً وسهلاً
            </span>
            <span className="block sm:inline">— Selamat Datang di Dars with Osama</span>
          </h1>

          <p className="text-[11px] sm:text-xs font-extrabold text-[#FFF3D5]/90 uppercase tracking-[0.18em]">
            Belajar, Memahami, Bertumbuh.
          </p>
        </div>

        {/* Hadith Verse Box (Butter #FFEFB3 Frame) */}
        <div
          data-aos="fade-up"
          data-aos-delay="50"
          className="max-w-3xl mx-auto bg-[#FFEFB3] border-2 border-[#171717] rounded-lg px-4 py-3 sm:px-5 sm:py-3.5 shadow-[3px_3px_0px_#171717]"
        >
          <p
            dir="rtl"
            className="font-amiri text-base sm:text-lg md:text-[20px] text-[#013E37] font-bold leading-[1.9] break-words"
          >
            مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ
          </p>
          <p className="text-[11px] sm:text-xs text-[#013E37] mt-1 font-bold leading-snug">
            “Barangsiapa menempuh suatu jalan untuk menuntut ilmu, maka Allah akan mudahkan baginya jalan menuju Surga.” (HR. Muslim)
          </p>
        </div>

        {/* Primary CTA & Search Bar */}
        <div data-aos="fade-up" data-aos-delay="100" className="max-w-2xl mx-auto space-y-3">
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex items-center bg-[#FAF7F0] border-2 border-[#171717] rounded-lg shadow-[3px_3px_0px_#171717]"
          >
            <div className="pl-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-[#013E37]" />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari judul matan, kitab, kursus, atau artikel ilmiah..."
              className="w-full pl-2.5 pr-24 sm:pr-28 py-2.5 bg-transparent text-[#171717] placeholder-[#525855] text-xs sm:text-sm font-semibold focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Cari"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3 sm:px-3.5 bg-[#FFEFB3] hover:bg-[#FFE58A] text-[#013E37] font-extrabold text-[11px] sm:text-xs uppercase tracking-wider rounded border-2 border-[#171717] transition-all flex items-center gap-1 cursor-pointer shadow-[2px_2px_0px_#171717] active:translate-x-[1px] active:translate-y-[1px]"
            >
              <span>Cari</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#013E37]" />
            </button>
          </form>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onExplore}
              className="px-4 py-2 bg-[#FFEFB3] hover:bg-[#FFE58A] text-[#013E37] font-extrabold text-xs rounded-lg border-2 border-[#171717] shadow-[2.5px_2.5px_0px_#171717] transition-all inline-flex items-center gap-1.5 cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
            >
              <Compass className="w-3.5 h-3.5 text-[#013E37]" />
              <span>Jelajahi Katalog Kitab</span>
            </button>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('instructor-profile')}
                className="px-4 py-2 bg-[#FAF7F0] hover:bg-white text-[#013E37] font-bold text-xs rounded-lg border-2 border-[#171717] shadow-[2.5px_2.5px_0px_#171717] transition-all inline-flex items-center gap-1.5 cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
              >
                <GraduationCap className="w-3.5 h-3.5 text-[#013E37]" />
                <span>Profil Pengajar</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Pillars Feature Shortcuts (Video, Naskah PDF, Evaluasi Kuis) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 max-w-4xl mx-auto pt-1">
          <button
            type="button"
            data-aos="fade-up"
            data-aos-delay="50"
            onClick={onExplore}
            className="p-3 bg-[#FAF7F0] text-[#171717] border-2 border-[#171717] rounded-lg text-left flex items-start gap-2.5 shadow-[2.5px_2.5px_0px_#171717] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#171717] transition-all cursor-pointer group"
          >
            <div className="p-2 bg-[#013E37] text-[#FFF3D5] border-2 border-[#171717] rounded-md shrink-0">
              <Video className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-[13px] font-bold text-[#171717] font-serif group-hover:text-[#013E37] leading-snug">
                Video Pembelajaran
              </h4>
              <p className="text-[11px] text-[#525855] mt-0.5 leading-snug">
                Penjelasan audio visual terstruktur per sesi halaqah kitab
              </p>
            </div>
          </button>

          <button
            type="button"
            data-aos="fade-up"
            data-aos-delay="100"
            onClick={onExplore}
            className="p-3 bg-[#FAF7F0] text-[#171717] border-2 border-[#171717] rounded-lg text-left flex items-start gap-2.5 shadow-[2.5px_2.5px_0px_#171717] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#171717] transition-all cursor-pointer group"
          >
            <div className="p-2 bg-[#FFEFB3] text-[#013E37] border-2 border-[#171717] rounded-md shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-[13px] font-bold text-[#171717] font-serif group-hover:text-[#013E37] leading-snug">
                Naskah Asli PDF
              </h4>
              <p className="text-[11px] text-[#525855] mt-0.5 leading-snug">
                Unduh dan simak buku panduan serta matan Arab lengkap
              </p>
            </div>
          </button>

          <button
            type="button"
            data-aos="fade-up"
            data-aos-delay="150"
            onClick={onExplore}
            className="p-3 bg-[#FAF7F0] text-[#171717] border-2 border-[#171717] rounded-lg text-left flex items-start gap-2.5 shadow-[2.5px_2.5px_0px_#171717] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#171717] transition-all cursor-pointer group"
          >
            <div className="p-2 bg-[#013E37] text-[#FFF3D5] border-2 border-[#171717] rounded-md shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-[13px] font-bold text-[#171717] font-serif group-hover:text-[#013E37] leading-snug">
                Evaluasi Kuis
              </h4>
              <p className="text-[11px] text-[#525855] mt-0.5 leading-snug">
                Uji pemahaman materi dengan koreksi otomatis & sertifikat
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
