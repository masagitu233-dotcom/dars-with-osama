import React from 'react';
import { ArrowRight, X, Sparkles, BookOpen, ShieldCheck } from 'lucide-react';
import { LogoSymbol } from './Logo';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin?: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose, onLogin }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto font-sans">
      <div className="relative w-full max-w-2xl bg-[#F7F6EF] dark:bg-[#071B16] border border-[#073B2E]/20 dark:border-[#C9A34E]/30 rounded-3xl shadow-2xl overflow-hidden my-auto transition-all">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#073B2E] text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#C9A34E]/20 flex items-center justify-center border border-[#C9A34E]/40 shrink-0">
              <LogoSymbol className="w-5 h-5 text-[#C9A34E]" />
            </div>
            <div>
              <span className="text-xs font-serif-brand tracking-widest text-[#C9A34E] uppercase font-bold block">
                Dars with Osama
              </span>
              <h3 className="text-sm font-semibold text-white font-sans">
                Sambutan & Perkenalan Platform
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-stone-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lightweight Visual Branding Hero Banner (Replaces Video Player) */}
        <div className="relative w-full p-8 sm:p-10 bg-gradient-to-br from-[#073B2E] via-[#0c2b23] to-[#123B6D] text-[#F7F6EF] flex flex-col items-center justify-center text-center overflow-hidden border-b border-[#073B2E]/20 dark:border-[#C9A34E]/30 space-y-4">
          {/* Ambient Radial Background Glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-12 w-64 h-64 rounded-full bg-[#C9A34E]/15 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 -mr-12 -mb-12 w-48 h-48 rounded-full bg-[#0EA5A4]/15 blur-2xl pointer-events-none" />

          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#C9A34E]/20 border border-[#C9A34E]/30 text-[#F4B942] text-xs font-semibold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#F4B942]" />
            <span>Selamat Datang Penuntut Ilmu</span>
          </div>

          {/* Large Dars with Osama Logo Emblem */}
          <div className="relative z-10 p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl transform hover:scale-105 transition-transform duration-300">
            <LogoSymbol className="w-16 h-16 sm:w-20 sm:h-20 text-[#C9A34E] drop-shadow-md" />
          </div>

          {/* Branding Title & Subtitle */}
          <div className="relative z-10 space-y-1 max-w-md">
            <h1 className="text-2xl sm:text-3xl font-bold font-serif-brand text-[#F7F6EF] tracking-tight">
              DARS WITH OSAMA
            </h1>
            <p className="text-xs sm:text-sm text-[#F7F6EF]/80 font-sans font-medium">
              Portal Pembelajaran Kitab Turats & Keilmuan Islam Interaktif
            </p>
          </div>
        </div>

        {/* Content Body: Arabic Verse & Warm Welcome Text */}
        <div className="p-6 sm:p-8 space-y-5">
          <div className="text-center space-y-2">
            <h2 className="text-lg sm:text-2xl font-bold font-serif-brand text-[#073B2E] dark:text-[#F7F6EF] dir-rtl">
              أهلاً وسهلاً — Selamat Datang di Dars with Osama
            </h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#073B2E]/5 dark:bg-[#C9A34E]/10 text-[#073B2E] dark:text-[#C9A34E] text-xs font-semibold">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Platform Kajian & Pembelajaran Kitab Turats</span>
            </div>
          </div>

          {/* Quranic Verse Callout */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#073B2E]/5 dark:bg-[#0c2b23] border border-[#073B2E]/10 dark:border-[#143e33] text-center space-y-2 shadow-xs">
            <p className="text-xl sm:text-2xl font-arabic font-bold text-[#073B2E] dark:text-[#C9A34E] leading-loose">
              وَقُلْ رَبِّ زِدْنِي عِلْمًا
            </p>
            <p className="text-xs sm:text-sm text-[#073B2E]/80 dark:text-[#F7F6EF]/80 italic">
              &quot;Dan katakanlah: Ya Tuhanku, tambahkanlah kepadaku ilmu pengetahuan.&quot;
            </p>
            <p className="text-[11px] font-semibold text-[#C9A34E]">
              (QS. Taha: 114)
            </p>
          </div>

          {/* Welcome Message Paragraphs */}
          <div className="text-xs sm:text-sm text-[#073B2E]/80 dark:text-[#F7F6EF]/80 leading-relaxed space-y-3 font-sans">
            <p>
              Selamat datang di <strong>Dars with Osama</strong>, platform pembelajaran Islam interaktif yang dirancang untuk memudahkan santri, penuntut ilmu, dan masyarakat umum dalam mempelajari kitab-kitab turats, matan ilmiah, serta materi keislaman secara sistematis.
            </p>
            <p>
              Di platform ini, Anda dapat menyimak rekaman video kajian, membaca naskah materi, mengunduh file PDF, mengikuti kuis evaluasi, serta mengajukan pertanyaan langsung di <strong>Ruang Konsultasi</strong> bersama Ustadz Osama.
            </p>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-[#073B2E]/10 dark:border-[#C9A34E]/20">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#073B2E]/20 dark:border-[#C9A34E]/30 text-[#073B2E] dark:text-[#F7F6EF] hover:bg-[#073B2E]/5 dark:hover:bg-[#C9A34E]/10 text-xs font-semibold transition cursor-pointer"
            >
              Jelajahi sebagai Tamu
            </button>
            {onLogin && (
              <button
                onClick={onLogin}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-emerald-600/40 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition cursor-pointer"
              >
                Masuk / Login Akun
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#073B2E] hover:bg-[#0a4d3c] text-white text-xs font-bold shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Mulai Belajar</span>
              <ArrowRight className="w-4 h-4 text-[#C9A34E]" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
