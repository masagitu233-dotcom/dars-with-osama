import React from 'react';
import { ArrowRight, X, Sparkles, HeartHandshake } from 'lucide-react';
import { LogoSymbol } from './Logo';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 lg:p-6 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl my-auto bg-[#F7F6EF] dark:bg-[#071B16] border border-[#073B2E]/20 dark:border-[#C9A34E]/30 rounded-3xl shadow-2xl text-[#073B2E] dark:text-[#F7F6EF] overflow-hidden flex flex-col max-h-[88vh] transition-all duration-300">
        
        {/* Header Bar with Logo & Close */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#073B2E]/10 dark:border-[#C9A34E]/20 flex items-center justify-between shrink-0 bg-[#073B2E]/5 dark:bg-[#073B2E]/30">
          <div className="flex items-center gap-3">
            <LogoSymbol className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
            <div>
              <h3 className="font-serif-brand font-bold text-sm sm:text-base text-[#073B2E] dark:text-[#F7F6EF] leading-tight">
                Dars with Osama
              </h3>
              <p className="text-[10px] sm:text-[11px] font-semibold text-[#0EA5A4] dark:text-[#C9A34E] tracking-wider uppercase">
                Kata Sambutan & Pengantar
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#6B7C7A] hover:text-[#073B2E] dark:hover:text-[#F7F6EF] hover:bg-[#073B2E]/10 dark:hover:bg-[#C9A34E]/10 rounded-full transition cursor-pointer"
            aria-label="Tutup Sambutan"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
          
          {/* Main Title & Subtitle */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#C9A34E]/15 border border-[#C9A34E]/30 text-[#073B2E] dark:text-[#F4B942] rounded-full text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#F4B942]" />
              <span>Marhaban Bikum</span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif-brand text-[#073B2E] dark:text-[#F7F6EF] leading-tight">
              <span className="font-amiri text-[#C9A34E] dark:text-[#F4B942] block sm:inline sm:mr-2" dir="rtl">
                أهلاً وسهلاً
              </span>
              — Selamat Datang di Dars with Osama
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-[#0EA5A4] dark:text-[#C9A34E] font-serif-brand tracking-wide">
              Belajar, Memahami, Bertumbuh.
            </p>
          </div>

          {/* Warm Islamic Welcome Text Paragraphs */}
          <div className="space-y-4 text-xs sm:text-sm md:text-base text-[#073B2E]/90 dark:text-[#F7F6EF]/90 leading-relaxed font-sans text-left">
            <p className="font-bold text-sm sm:text-base text-[#073B2E] dark:text-[#F4B942]">
              Assalamu’alaikum warahmatullahi wabarakatuh.
            </p>

            <p>
              Selamat datang di <strong>Dars with Osama</strong>, ruang belajar dan berbagi ilmu bagi siapa saja yang ingin terus bertumbuh, memperluas wawasan, dan memperdalam pemahaman.
            </p>

            <p>
              Kami percaya bahwa setiap perjalanan ilmu dimulai dari langkah kecil, rasa ingin tahu, dan kemauan untuk terus belajar. Karena itu, platform ini hadir untuk menemani perjalanan Anda melalui materi pembelajaran, kajian, artikel, dan berbagai sumber pengetahuan yang dapat dipelajari secara bertahap.
            </p>

            <p>
              Bagi Anda yang baru berkunjung, silakan menjelajahi berbagai tulisan dan materi yang tersedia. Semoga setiap halaman yang Anda baca membawa manfaat dan membuka wawasan baru.
            </p>

            <p>
              Bagi para siswa, selamat melanjutkan perjalanan belajar. Pelajarilah setiap materi dengan saksama, kerjakan evaluasi dengan sungguh-sungguh, dan jangan pernah berhenti bertanya serta memperbaiki diri.
            </p>

            <p>
              Semoga Allah Subhanahu wa Ta’ala memberkahi setiap langkah kita dalam menuntut ilmu, menjadikan ilmu yang kita pelajari sebagai ilmu yang bermanfaat, serta memudahkan kita untuk mengamalkannya dalam kehidupan sehari-hari.
            </p>

            <p className="font-semibold text-[#0EA5A4] dark:text-[#C9A34E]">
              Selamat belajar, selamat membaca, dan selamat bertumbuh bersama Dars with Osama.
            </p>

            {/* Quranic Verse Accent Box */}
            <div className="my-4 p-4 bg-[#073B2E]/5 dark:bg-[#071B16] border-l-4 border-[#C9A34E] dark:border-[#F4B942] rounded-r-2xl space-y-2">
              <p
                dir="rtl"
                className="font-amiri text-2xl sm:text-3xl text-[#073B2E] dark:text-[#F4B942] font-bold text-right leading-loose"
              >
                وَقُلْ رَبِّ زِدْنِي عِلْمًا
              </p>
              <p className="text-xs sm:text-sm text-[#6B7C7A] dark:text-[#8C9E9B] italic font-sans text-left">
                “Ya Tuhanku, tambahkanlah ilmu kepadaku.” (QS. Taha: 114)
              </p>
            </div>

            <p className="font-bold text-sm text-[#073B2E] dark:text-[#F4B942]">
              Wassalamu’alaikum warahmatullahi wabarakatuh.
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#073B2E]/10 dark:border-[#C9A34E]/20 bg-[#073B2E]/5 dark:bg-[#073B2E]/30 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#6B7C7A] dark:text-[#8C9E9B] hover:text-[#073B2E] dark:hover:text-[#F7F6EF] hover:bg-[#073B2E]/10 dark:hover:bg-[#C9A34E]/10 rounded-xl transition cursor-pointer text-center border border-[#073B2E]/10 dark:border-[#C9A34E]/20"
          >
            Tutup
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#073B2E] dark:bg-[#123B6D] hover:bg-[#0a4d3c] dark:hover:bg-[#0EA5A4] active:scale-[0.98] text-[#F7F6EF] font-bold text-xs sm:text-sm rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer border border-[#C9A34E]/40"
          >
            <span>Mulai Menjelajahi</span>
            <ArrowRight className="w-4 h-4 text-[#F4B942]" />
          </button>
        </div>

      </div>
    </div>
  );
};
