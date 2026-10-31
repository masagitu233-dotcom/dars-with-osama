import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MobileCarouselProps {
  children: React.ReactNode[];
  desktopGridClass?: string;
  className?: string;
  ariaLabel?: string;
}

export const MobileCarousel: React.FC<MobileCarouselProps> = ({
  children,
  desktopGridClass = 'sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-6',
  className = '',
  ariaLabel = 'Daftar Konten'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const itemCount = React.Children.count(children);

  const updateScrollState = () => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

    // Approximate active card based on scroll progress
    if (clientWidth > 0 && itemCount > 0) {
      // Each card is ~84vw + 16px gap
      const step = clientWidth * 0.85;
      const idx = Math.round(scrollLeft / (step || 1));
      setActiveIndex(Math.min(Math.max(0, idx), itemCount - 1));
    }
  };

  useEffect(() => {
    updateScrollState();
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      requestAnimationFrame(updateScrollState);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [itemCount]);

  const scrollToCard = (index: number) => {
    if (!containerRef.current) return;
    const items = containerRef.current.children;
    if (items[index]) {
      (items[index] as HTMLElement).scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'start'
      });
    }
  };

  const handleScrollPrev = () => {
    if (!containerRef.current) return;
    const scrollAmount = containerRef.current.clientWidth * 0.85;
    containerRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  };

  const handleScrollNext = () => {
    if (!containerRef.current) return;
    const scrollAmount = containerRef.current.clientWidth * 0.85;
    containerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  if (itemCount === 0) return null;

  return (
    <div className={`relative w-full ${className}`}>
      {/* Mobile Swipe / Carousel Container & Desktop Grid */}
      <div
        ref={containerRef}
        aria-label={ariaLabel}
        className={`flex sm:grid overflow-x-auto sm:overflow-visible pb-3 pt-1 px-1 sm:px-0 gap-4 sm:gap-6 snap-x snap-mandatory scroll-smooth no-scrollbar -mx-2 px-2 sm:mx-0 ${desktopGridClass}`}
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y'
        }}
      >
        {React.Children.map(children, (child, idx) => (
          <div
            key={idx}
            className="w-[84vw] max-w-[340px] shrink-0 snap-start sm:w-auto sm:max-w-none sm:shrink sm:snap-none h-auto sm:h-full flex flex-col"
          >
            {child}
          </div>
        ))}
      </div>

      {/* Mobile Carousel Pagination Dots & Swipe Indicator (Hidden on Desktop) */}
      {itemCount > 1 && (
        <div className="flex sm:hidden items-center justify-between mt-2.5 px-1 pt-1 border-t border-[#171717]/10 dark:border-[#4CA7A1]/20">
          {/* Quick arrow controls for accessibility / ease of use */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleScrollPrev}
              disabled={!canScrollLeft}
              aria-label="Geser ke kiri"
              className={`w-7 h-7 rounded flex items-center justify-center border-2 border-[#171717] dark:border-[#4CA7A1] transition-all ${
                canScrollLeft
                  ? 'bg-white dark:bg-[#1F5F63] text-[#171717] dark:text-[#CEFEF1] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] active:translate-x-0.5 active:translate-y-0.5'
                  : 'bg-transparent text-[#171717]/30 dark:text-[#CEFEF1]/30 border-[#171717]/30 dark:border-[#4CA7A1]/30 cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleScrollNext}
              disabled={!canScrollRight}
              aria-label="Geser ke kanan"
              className={`w-7 h-7 rounded flex items-center justify-center border-2 border-[#171717] dark:border-[#4CA7A1] transition-all ${
                canScrollRight
                  ? 'bg-white dark:bg-[#1F5F63] text-[#171717] dark:text-[#CEFEF1] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] active:translate-x-0.5 active:translate-y-0.5'
                  : 'bg-transparent text-[#171717]/30 dark:text-[#CEFEF1]/30 border-[#171717]/30 dark:border-[#4CA7A1]/30 cursor-not-allowed'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-bold text-[#525855] dark:text-[#A6D6C9] ml-1">
              Geser card ({activeIndex + 1}/{itemCount})
            </span>
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.min(itemCount, 8) }).map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={() => scrollToCard(dotIdx)}
                aria-label={`Lihat card ${dotIdx + 1}`}
                className={`h-2 transition-all rounded-full ${
                  dotIdx === activeIndex
                    ? 'w-5 bg-[#123D32] dark:bg-[#4CA7A1]'
                    : 'w-2 bg-[#171717]/25 dark:bg-[#4CA7A1]/30 hover:bg-[#171717]/50'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
