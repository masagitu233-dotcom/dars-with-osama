import React from 'react';
import { ArrowRight, X, Sparkles, BookOpen } from 'lucide-react';
import { LogoSymbol } from './Logo';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin?: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose, onLogin }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 animate-fade-in overflow-y-auto font-sans">
      <div className="relative w-full max-w-2xl bg-[#FAF7F0] dark:bg-[#243A56] border-3 border-[#292D2B] dark:border-[#D6AD52] rounded-lg shadow-[8px_8px_0px_#292D2B] dark:shadow-[8px_8px_0px_#000000] overflow-hidden my-auto transition-all">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#123D32] dark:bg-[#16263D] text-white border-b-2 border-[#292D2B] dark:border-[#D6AD52]/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[#243A56] flex items-center justify-center border-2 border-[#D6AD52] shrink-0">
              <LogoSymbol className="w-5 h-5 text-[#D6AD52]" />
            </div>
            <div>
              <span className="text-[11px] font-serif-brand tracking-widest text-[#D6AD52] uppercase font-extrabold block">
                Dars with Osama
              </span>
              <h3 className="text-sm font-extrabold text-white font-sans">
                Sambutan &amp; Perkenalan Platform
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md border-2 border-[#D6AD52] text-[#FAF7F0] hover:bg-[#D6AD52] hover:text-[#292D2B] transition cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visual Branding Hero Banner */}
        <div className="relative w-full p-7 sm:p-9 bg-[#243A56] text-[#FAF7F0] flex flex-col items-center justify-center text-center overflow-hidden border-b-2 border-[#292D2B] dark:border-[#D6AD52]/60 space-y-4">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-md bg-[#D6AD52] border-2 border-[#292D2B] text-[#292D2B] text-xs font-extrabold shadow-[2px_2px_0px_#292D2B]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Selamat Datang Penuntut Ilmu</span>
          </div>

          {/* Large Dars with Osama Logo Emblem */}
          <div className="relative z-10 p-3.5 rounded-lg bg-[#123D32] dark:bg-[#16263D] border-2 border-[#D6AD52] shadow-[4px_4px_0px_#292D2B]">
            <LogoSymbol className="w-16 h-16 sm:w-20 sm:h-20 text-[#D6AD52]" />
          </div>

          {/* Branding Title & Subtitle */}
          <div className="relative z-10 space-y-1 max-w-md">
            <h1 className="text-2xl sm:text-3xl font-extrabold font-serif-brand text-[#FAF7F0] tracking-tight">
              DARS WITH OSAMA
            </h1>
            <p className="text-xs sm:text-sm text-[#D6AD52] font-sans font-bold">
              Portal Pembelajaran Kitab Turats &amp; Keilmuan Islam Interaktif
            </p>
          </div>
        </div>

        {/* Content Body: Arabic Verse & Warm Welcome Text */}
        <div className="p-6 sm:p-8 space-y-5">
          <div className="text-center space-y-2">
            <h2 className="text-lg sm:text-2xl font-extrabold font-serif-brand text-[#123D32] dark:text-[#F1F4F8] dir-rtl">
              أهلاً وسهلاً — Selamat Datang di Dars with Osama
            </h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white dark:bg-[#16263D] border-2 border-[#292D2B] dark:border-[#D6AD52] text-[#123D32] dark:text-[#D6AD52] text-xs font-extrabold">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Platform Kajian &amp; Pembelajaran Kitab Turats</span>
            </div>
          </div>

          {/* Quranic Verse Callout */}
          <div className="p-4 sm:p-5 rounded-md bg-white dark:bg-[#16263D] border-2 border-[#292D2B] dark:border-[#D6AD52] text-center space-y-2 shadow-[4px_4px_0px_#292D2B]">
            <p className="text-xl sm:text-2xl font-arabic font-bold text-[#123D32] dark:text-[#D6AD52] leading-loose">
              وَقُلْ رَبِّ زِدْنِي عِلْمًا
            </p>
            <p className="text-xs sm:text-sm text-[#292D2B] dark:text-[#F1F4F8] italic font-medium">
              &quot;Dan katakanlah: Ya Tuhanku, tambahkanlah kepadaku ilmu pengetahuan.&quot;
            </p>
            <p className="text-[11px] font-extrabold text-[#D6AD52]">
              (QS. Taha: 114)
            </p>
          </div>

          {/* Welcome Message Paragraphs */}
          <div className="text-xs sm:text-sm text-[#292D2B] dark:text-[#F1F4F8]/90 leading-relaxed space-y-3 font-sans font-medium">
            <p>
              Selamat datang di <strong>Dars with Osama</strong>, platform pembelajaran Islam interaktif yang dirancang untuk memudahkan santri, penuntut ilmu, dan masyarakat umum dalam mempelajari kitab-kitab turats, matan ilmiah, serta materi keislaman secara sistematis.
            </p>
            <p>
              Di platform ini, Anda dapat menyimak rekaman video kajian, membaca naskah materi, mengunduh file PDF, mengikuti kuis evaluasi, serta mengajukan pertanyaan langsung di <strong>Ruang Konsultasi</strong> bersama Ustadz Osama.
            </p>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-3 border-t-2 border-[#292D2B]/20 dark:border-[#D6AD52]/30">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 nb-btn nb-btn-secondary text-xs"
            >
              Jelajahi sebagai Tamu
            </button>
            {onLogin && (
              <button
                onClick={onLogin}
                className="w-full sm:w-auto px-5 py-2.5 nb-btn nb-btn-gold text-xs"
              >
                Masuk / Login Akun
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 nb-btn nb-btn-primary text-xs"
            >
              <span>Mulai Belajar</span>
              <ArrowRight className="w-4 h-4 text-[#D6AD52] dark:text-[#292D2B]" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
