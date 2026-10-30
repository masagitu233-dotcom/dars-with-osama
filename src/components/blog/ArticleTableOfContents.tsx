import React, { useState } from 'react';
import {
  ListOrdered,
  ChevronDown,
  ChevronUp,
  Bookmark,
  ArrowRight
} from 'lucide-react';
import { TableOfContentsItem } from '../../utils/tableOfContentsHelper';
import { autoWrapArabicText } from '../../utils/arabicFontHelper';

interface ArticleTableOfContentsProps {
  items: TableOfContentsItem[];
  className?: string;
  onItemClick?: (id: string) => void;
}

export const ArticleTableOfContents: React.FC<ArticleTableOfContentsProps> = ({
  items,
  className = '',
  onItemClick
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  if (!items || items.length === 0) {
    return null;
  }

  const handleHeadingClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();

    if (onItemClick) {
      onItemClick(id);
      return;
    }

    const targetEl = document.getElementById(id);
    if (targetEl) {
      // Calculate precise offset to clear the sticky top header (header height ~64px + 24px margin = 88px)
      const headerOffset = 88;
      const elementPosition = targetEl.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth'
      });

      // Update URL hash without causing a page jump
      if (typeof window !== 'undefined' && window.history.pushState) {
        window.history.pushState(null, '', `#${id}`);
      }

      // Flash highlight animation on target heading
      targetEl.classList.add('heading-target-flash');
      setTimeout(() => {
        targetEl.classList.remove('heading-target-flash');
      }, 1600);
    }
  };

  return (
    <nav
      data-testid="article-table-of-contents"
      aria-label="Daftar Isi Artikel"
      className={`nb-card bg-[#FAF7F0] dark:bg-[#102C2B] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#071918] p-4 sm:p-6 my-6 rounded-md transition-all ${className}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 border-b-2 border-[#171717]/15 dark:border-[#4CA7A1]/30 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded bg-[#123D32] dark:bg-[#4CA7A1] text-[#D6AD52] dark:text-[#001722] flex items-center justify-center border border-[#171717] dark:border-[#001722] shadow-[2px_2px_0px_#171717] shrink-0">
            <ListOrdered className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h3 className="font-serif-brand font-bold text-sm sm:text-base text-[#171717] dark:text-[#CEFEF1] tracking-tight">
              Daftar Isi Artikel
            </h3>
            <span className="nb-badge bg-[#D6AD52] dark:bg-[#4CA7A1] text-[#171717] dark:text-[#001722] border-[#171717] text-[10px] font-extrabold px-2 py-0.5">
              {items.length} Bagian
            </span>
          </div>
        </div>

        {/* Toggle Collapse Button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          className="nb-btn nb-btn-secondary px-2.5 py-1 text-xs flex items-center gap-1 shrink-0"
          title={isExpanded ? 'Sembunyikan Daftar Isi' : 'Tampilkan Daftar Isi'}
        >
          <span className="hidden sm:inline font-bold">
            {isExpanded ? 'Sembunyikan' : 'Buka'}
          </span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Contents List */}
      {isExpanded && (
        <ol className="mt-4 space-y-2 text-xs sm:text-sm animate-fade-in list-none pl-0">
          {items.map((item) => (
            <li key={item.id} className="group">
              <a
                href={`#${item.id}`}
                onClick={(e) => handleHeadingClick(e, item.id)}
                className="flex items-start gap-2.5 p-2 rounded-md hover:bg-white dark:hover:bg-[#163835] border border-transparent hover:border-[#171717]/30 dark:hover:border-[#4CA7A1]/40 transition duration-150 cursor-pointer group"
              >
                {/* Number index badge */}
                <span className="px-1.5 py-0.5 rounded bg-[#123D32] text-[#D6AD52] dark:bg-[#4CA7A1] dark:text-[#001722] font-mono font-extrabold text-[11px] border border-[#171717] shrink-0 mt-0.5 shadow-2xs">
                  {String(item.index).padStart(2, '0')}
                </span>

                {/* Heading label */}
                <span
                  className="font-bold text-[#171717] dark:text-[#CEFEF1] group-hover:text-[#123D32] dark:group-hover:text-[#D6AD52] transition leading-snug flex-1"
                  dangerouslySetInnerHTML={{ __html: autoWrapArabicText(item.text) }}
                />

                <ArrowRight className="w-3.5 h-3.5 text-[#123D32] dark:text-[#4CA7A1] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
              </a>
            </li>
          ))}
        </ol>
      )}
    </nav>
  );
};
