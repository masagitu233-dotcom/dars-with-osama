import React from 'react';
import { ListOrdered, ArrowDown, ChevronRight } from 'lucide-react';
import { QATocMainSection, QATableOfContentsItem } from '../../utils/qaHelper';

interface QATableOfContentsProps {
  sections?: QATocMainSection[];
  items?: QATableOfContentsItem[];
  className?: string;
  onNavigate?: (targetId: string) => void;
}

export const QATableOfContents: React.FC<QATableOfContentsProps> = ({
  sections,
  items,
  className = '',
  onNavigate
}) => {
  // Normalize input: use sections if available, fallback to items
  const resolvedSections: QATocMainSection[] = React.useMemo(() => {
    if (sections && sections.length > 0) {
      return sections;
    }
    if (items && items.length > 0) {
      return items.map((it) => ({
        id: (it.id === 'mendetail' ? 'mendetail' : 'ringkas') as 'ringkas' | 'mendetail',
        label: it.label,
        targetId: it.targetId,
        headings: []
      }));
    }
    return [];
  }, [sections, items]);

  if (resolvedSections.length === 0) {
    return null;
  }

  const totalHeadings = resolvedSections.reduce((acc, s) => acc + (s.headings?.length || 0), 0);

  const handleScrollTo = (e: React.MouseEvent, targetId: string) => {
    e.preventDefault();

    if (onNavigate) {
      onNavigate(targetId);
      return;
    }

    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      // Calculate precise offset to clear sticky header (~96px)
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
      className={`p-3.5 sm:p-4 rounded-md bg-[#FAF7F0] dark:bg-[#102C2B] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#071918] space-y-3 transition-all ${className}`}
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

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#D6AD52] dark:bg-[#4CA7A1] text-[#171717] dark:text-[#001722] font-mono font-extrabold border border-[#171717] shadow-2xs">
            {resolvedSections.length} Bagian Utama
          </span>
          {totalHeadings > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#123D32] dark:bg-[#163835] text-[#D6AD52] dark:text-[#CEFEF1] font-mono font-bold border border-[#171717]/40">
              {totalHeadings} Bab H1
            </span>
          )}
        </div>
      </div>

      {/* Main Sections Grid */}
      <div className={`grid gap-3 ${resolvedSections.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {resolvedSections.map((sec, secIdx) => {
          const isMendetail = sec.id === 'mendetail';
          const hasSubHeadings = sec.headings && sec.headings.length > 0;

          return (
            <div
              key={sec.targetId}
              className="p-2.5 sm:p-3 rounded bg-white dark:bg-[#163835] border border-[#171717]/30 dark:border-[#4CA7A1]/50 shadow-2xs space-y-2 flex flex-col justify-between"
            >
              {/* Main Section Link Button */}
              <a
                href={`#${sec.targetId}`}
                onClick={(e) => handleScrollTo(e, sec.targetId)}
                className="flex items-center justify-between p-2 rounded bg-[#FAF7F0] dark:bg-[#0D2B36] hover:bg-[#EFE5D2] dark:hover:bg-[#1f4a46] border border-[#171717]/20 dark:border-[#4CA7A1]/40 text-xs font-extrabold text-[#171717] dark:text-[#CEFEF1] hover:text-[#123D32] dark:hover:text-[#D6AD52] transition group cursor-pointer shadow-2xs"
              >
                <span className="flex items-center gap-2 truncate">
                  <span
                    className={`w-5 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center border border-[#171717] shrink-0 ${
                      isMendetail
                        ? 'bg-[#D6AD52] text-[#171717]'
                        : 'bg-[#123D32] text-[#D6AD52] dark:bg-[#4CA7A1] dark:text-[#001722]'
                    }`}
                  >
                    {secIdx + 1}
                  </span>
                  <span className="truncate">{sec.label}</span>
                </span>

                <ArrowDown className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-y-0.5 transition-all text-[#123D32] dark:text-[#4CA7A1] shrink-0 ml-1" />
              </a>

              {/* Heading 1 Sub-items (if any) */}
              {hasSubHeadings && (
                <div className="pt-2 border-t border-[#171717]/10 dark:border-[#4CA7A1]/20 space-y-1">
                  {sec.headings.map((h) => (
                    <a
                      key={h.id}
                      href={`#${h.id}`}
                      onClick={(e) => handleScrollTo(e, h.id)}
                      className="flex items-start justify-between gap-2 p-1.5 rounded hover:bg-[#FAF7F0] dark:hover:bg-[#0D2B36] text-[11px] font-bold text-[#171717] dark:text-[#CEFEF1] hover:text-[#123D32] dark:hover:text-[#D6AD52] transition group cursor-pointer"
                      title={h.text}
                    >
                      <span className="line-clamp-2 leading-snug group-hover:underline">
                        {h.text}
                      </span>
                      <ChevronRight className="w-3 h-3 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#123D32] dark:text-[#4CA7A1] shrink-0 ml-auto mt-0.5" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
};
