import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  const [dragSuppressed, setDragSuppressed] = useState(false);

  // Mouse drag state for desktop testing
  const [isMouseDown, setIsMouseDown] = useState(false);
  const mouseState = useRef<{ startX: number; startScrollLeft: number; hasMoved: boolean }>({
    startX: 0,
    startScrollLeft: 0,
    hasMoved: false
  });

  // Touch tracking solely for click suppression after deliberate swipe gestures
  const touchTracking = useRef<{ startX: number; startY: number; hasMoved: boolean }>({
    startX: 0,
    startY: 0,
    hasMoved: false
  });

  const itemCount = React.Children.count(children);

  // Smooth active index tracking via passive scroll observer
  const updateScrollState = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 15);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 15);

    // Accurately determine the card closest to the visible viewport start
    if (clientWidth > 0 && itemCount > 0) {
      const items = Array.from(el.children) as HTMLElement[];
      const containerLeft = el.getBoundingClientRect().left;

      let closestIdx = 0;
      let minDistance = Infinity;

      items.forEach((item, idx) => {
        const itemLeft = item.getBoundingClientRect().left;
        const distance = Math.abs(itemLeft - containerLeft);
        if (distance < minDistance) {
          minDistance = distance;
          closestIdx = idx;
        }
      });

      setActiveIndex(closestIdx);
    }
  }, [itemCount]);

  useEffect(() => {
    updateScrollState();
    const el = containerRef.current;
    if (!el) return;

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateScrollState();
          ticking = false;
        });
        ticking = true;
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  // Programmatic scroll (used by arrow buttons & dots)
  const scrollToCard = useCallback((index: number) => {
    const el = containerRef.current;
    if (!el) return;
    const items = el.children;
    const targetIdx = Math.min(Math.max(0, index), itemCount - 1);
    if (items[targetIdx]) {
      const itemEl = items[targetIdx] as HTMLElement;
      const containerRect = el.getBoundingClientRect();
      const itemRect = itemEl.getBoundingClientRect();
      const targetScrollLeft = el.scrollLeft + (itemRect.left - containerRect.left);

      el.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth'
      });
      setActiveIndex(targetIdx);
    }
  }, [itemCount]);

  const handleScrollPrev = () => {
    scrollToCard(activeIndex - 1);
  };

  const handleScrollNext = () => {
    scrollToCard(activeIndex + 1);
  };

  // --- NATIVE TOUCH HANDLERS (Non-blocking, purely for click suppression) ---
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    touchTracking.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      hasMoved: false
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    const diffX = Math.abs(touch.clientX - touchTracking.current.startX);
    const diffY = Math.abs(touch.clientY - touchTracking.current.startY);

    // If movement exceeds minimal threshold, mark as deliberate gesture
    if (diffX > 10 || diffY > 10) {
      touchTracking.current.hasMoved = true;
    }
  };

  const handleTouchEnd = () => {
    if (touchTracking.current.hasMoved) {
      setDragSuppressed(true);
      setTimeout(() => setDragSuppressed(false), 200);
    }
    touchTracking.current.hasMoved = false;
  };

  // --- MOUSE DRAG HANDLERS (for desktop / responsive emulator testing) ---
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = containerRef.current;
    if (!el) return;

    setIsMouseDown(true);
    mouseState.current = {
      startX: e.clientX,
      startScrollLeft: el.scrollLeft,
      hasMoved: false
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDown) return;
    const el = containerRef.current;
    if (!el) return;

    const diffX = e.clientX - mouseState.current.startX;
    if (Math.abs(diffX) > 5) {
      mouseState.current.hasMoved = true;
      el.scrollLeft = mouseState.current.startScrollLeft - diffX;
    }
  };

  const handleMouseUp = () => {
    if (!isMouseDown) return;
    setIsMouseDown(false);
    if (mouseState.current.hasMoved) {
      setDragSuppressed(true);
      setTimeout(() => setDragSuppressed(false), 200);
    }
    mouseState.current.hasMoved = false;
  };

  const handleMouseLeave = () => {
    if (isMouseDown) {
      setIsMouseDown(false);
      mouseState.current.hasMoved = false;
    }
  };

  // Prevent accidental card click after a deliberate drag/swipe
  const handleClickCapture = (e: React.MouseEvent) => {
    if (dragSuppressed) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  if (itemCount === 0) return null;

  return (
    <div className={`relative w-full ${className}`}>
      {/* Mobile Swipe / Carousel Container & Desktop Grid */}
      <div
        ref={containerRef}
        aria-label={ariaLabel}
        data-lenis-prevent="true"
        data-lenis-prevent-touch="true"
        data-lenis-prevent-wheel="true"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClickCapture={handleClickCapture}
        onDragStart={(e) => e.preventDefault()}
        className={`flex sm:grid overflow-x-auto overflow-y-hidden sm:overflow-visible pb-3 pt-1 px-1 sm:px-0 gap-4 sm:gap-6 snap-x snap-proximity scroll-smooth no-scrollbar -mx-2 px-2 sm:mx-0 ${
          isMouseDown ? 'cursor-grabbing select-none' : 'cursor-grab sm:cursor-auto'
        } ${desktopGridClass}`}
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x pan-y',
          overscrollBehaviorX: 'contain',
          scrollSnapType: 'x proximity',
          scrollBehavior: 'smooth'
        }}
      >
        {React.Children.map(children, (child, idx) => (
          <div
            key={idx}
            className="w-[84vw] max-w-[340px] shrink-0 snap-start sm:w-auto sm:max-w-none sm:shrink sm:snap-none h-auto sm:h-full flex flex-col"
            style={{
              scrollSnapAlign: 'start',
              scrollSnapStop: 'normal'
            }}
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
                  ? 'bg-white dark:bg-[#1F5F63] text-[#171717] dark:text-[#CEFEF1] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer'
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
                  ? 'bg-white dark:bg-[#1F5F63] text-[#171717] dark:text-[#CEFEF1] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer'
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
                className={`h-2 transition-all rounded-full cursor-pointer ${
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
