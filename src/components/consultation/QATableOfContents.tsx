import React from 'react';
import { ListOrdered, ArrowDown } from 'lucide-react';
import { QATableOfContentsItem } from '../../utils/qaHelper';

interface QATableOfContentsProps {
  items: QATableOfContentsItem[];
  className?: string;
  onNavigate?: (targetId: string) => void;
}

export const QATableOfContents: React.FC<QATableOfContentsProps> = ({
  items,
  className = '',
  onNavigate
}) => {
  if (!items || items.length === 0) {
    return null;
  }

  const handleScrollTo = (e: React.MouseEvent, targetId: string) => {
    e.preventDefault();

    if (onNavigate) {
      onNavigate(targetId);
      return;
    }

    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      // Calculate precise offset to clear sticky header (~88px)
      const headerOffset = 96;
      const elementPosition = targetEl.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth'
      });

      // Target flash animation
      targetEl.classList.add('heading-target-flash');
      setTimeout(() => {
        targetEl.classList.remove('heading-target-flash');
      }, 1600);
    }
  };

  return (
    <nav
      data-testid="qa-table-of-contents"
      aria-label="Daftar Isi Jawaban"
      className={`p-3 sm:p-4 rounded-md bg-[#FAF7F0] dark:bg-[#102C2B] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#071918] space-y-2.5 transition-all ${className}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 border-b border-[#171717]/15 dark:border-[#4CA7A1]/30 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#123D32] dark:bg-[#4CA7A1] text-[#D6AD52] dark:text-[#001722] flex items-center justify-center border border-[#171717] dark:border-[#001722] shadow-2xs shrink-0">
            <ListOrdered className="w-3.5 h-3.5" />
          </div>
          <span className="font-serif-brand font-bold text-xs sm:text-sm text-[#171717] dark:text-[#CEFEF1]">
            Daftar Isi Jawaban
          </span>
        </div>

        <span className="text-[10px] px-2 py-0.5 rounded bg-[#D6AD52] dark:bg-[#4CA7A1] text-[#171717] dark:text-[#001722] font-mono font-extrabold border border-[#171717] shadow-2xs">
          {items.length} Pilihan
        </span>
      </div>

      {/* Navigation Buttons: 1. Jawaban Ringkas, 2. Jawaban Mendetail */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
        {items.map((item, idx) => (
          <a
            key={item.id}
            href={`#${item.targetId}`}
            onClick={(e) => handleScrollTo(e, item.targetId)}
            className="flex items-center justify-between p-2 sm:p-2.5 rounded bg-white dark:bg-[#163835] hover:bg-[#FAF7F0] dark:hover:bg-[#1f4a46] border border-[#171717]/30 dark:border-[#4CA7A1]/50 text-xs font-extrabold text-[#171717] dark:text-[#CEFEF1] hover:text-[#123D32] dark:hover:text-[#D6AD52] transition group cursor-pointer shadow-2xs"
          >
            <span className="flex items-center gap-2 truncate">
              <span className="w-5 h-5 rounded bg-[#123D32] text-[#D6AD52] dark:bg-[#4CA7A1] dark:text-[#001722] text-[10px] font-mono font-bold flex items-center justify-center border border-[#171717] shrink-0">
                {idx + 1}
              </span>
              <span className="truncate">{item.label}</span>
            </span>

            <ArrowDown className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-y-0.5 transition-all text-[#123D32] dark:text-[#4CA7A1] shrink-0 ml-1" />
          </a>
        ))}
      </div>
    </nav>
  );
};
