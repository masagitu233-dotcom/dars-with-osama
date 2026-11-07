import { extractCleanHeadingText } from './tableOfContentsHelper.js';

export interface SessionSlide {
  id: string;
  title: string;
  titleHtml?: string;
  htmlContent: string;
  index: number;
}

export interface SessionSlideResult {
  hasH1: boolean;
  slides: SessionSlide[];
  fallbackUsed: boolean;
}

/**
 * Checks if raw HTML contains meaningful readable content beyond empty tags/spaces.
 */
export function hasMeaningfulContent(html: string | undefined | null): boolean {
  if (!html || typeof html !== 'string') return false;
  // If there's an image or table or iframe, it's meaningful
  if (/<(img|table|iframe|video|audio)\b/i.test(html)) return true;
  const stripped = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  return stripped.length > 0;
}

/**
 * Splits session HTML content (lessonNotes / Faedah Ilmiah) into an automated Table of Contents and Slides.
 *
 * Rules:
 * - Each Heading 1 (<h1>) marks the beginning of a slide and a TOC item.
 * - All content following that <h1> up to before the next <h1> belongs to that slide.
 * - Heading 2, Heading 3, paragraphs, Arabic text with harakat, images, tables, quotes are preserved.
 * - If no <h1> is found, fallback preserves the entire content as a single slide so old material is never lost.
 */
export function splitSessionContentIntoSlides(
  rawHtml: string | undefined | null,
  fallbackTitle: string = 'Materi Pembahasan'
): SessionSlideResult {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return { hasH1: false, slides: [], fallbackUsed: false };
  }

  const trimmedHtml = rawHtml.trim();
  if (!hasMeaningfulContent(trimmedHtml)) {
    return { hasH1: false, slides: [], fallbackUsed: false };
  }

  // Regex matching only <h1>...</h1> tags
  const h1Regex = /<h1\b([^>]*)>([\s\S]*?)<\/h1>/gi;
  const matches: { index: number; fullLength: number; attrs: string; innerHtml: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = h1Regex.exec(trimmedHtml)) !== null) {
    matches.push({
      index: match.index,
      fullLength: match[0].length,
      attrs: match[1] || '',
      innerHtml: match[2] || ''
    });
  }

  // Case: No <h1> found -> Safe compatibility fallback
  if (matches.length === 0) {
    const singleSlide: SessionSlide = {
      id: 'slide-1',
      title: fallbackTitle.trim() || 'Materi Pembahasan',
      titleHtml: fallbackTitle.trim() || 'Materi Pembahasan',
      htmlContent: trimmedHtml,
      index: 0
    };
    return {
      hasH1: false,
      slides: [singleSlide],
      fallbackUsed: true
    };
  }

  // Case: One or more <h1> found
  const slides: SessionSlide[] = [];
  const preamble = trimmedHtml.slice(0, matches[0].index).trim();
  const hasSubstantialPreamble = hasMeaningfulContent(preamble);

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const cleanTitle = extractCleanHeadingText(current.innerHtml) || `Pembahasan ${i + 1}`;
    const startOfBody = current.index + current.fullLength;
    const endOfBody = i < matches.length - 1 ? matches[i + 1].index : trimmedHtml.length;
    let bodyHtml = trimmedHtml.slice(startOfBody, endOfBody).trim();

    // If preamble text was present before the first <h1>, attach it before the first slide's body
    if (i === 0 && hasSubstantialPreamble) {
      bodyHtml = bodyHtml ? `${preamble}\n${bodyHtml}` : preamble;
    }

    slides.push({
      id: `slide-${i + 1}`,
      title: cleanTitle,
      titleHtml: current.innerHtml.trim(),
      htmlContent: bodyHtml,
      index: i
    });
  }

  return {
    hasH1: true,
    slides,
    fallbackUsed: false
  };
}

export interface SlideNavInfo {
  prevSlide: SessionSlide | null;
  nextSlide: SessionSlide | null;
  isFirst: boolean;
  isLast: boolean;
  prevButtonLabel: string | null;
  nextButtonLabel: string;
}

/**
 * Calculates navigational context for the currently active slide.
 */
export function getSlideNavInfo(slides: SessionSlide[], activeIndex: number): SlideNavInfo {
  const isFirst = activeIndex <= 0;
  const isLast = activeIndex >= slides.length - 1;

  const prevSlide = !isFirst && activeIndex - 1 < slides.length ? slides[activeIndex - 1] : null;
  const nextSlide = !isLast && activeIndex + 1 < slides.length ? slides[activeIndex + 1] : null;

  return {
    prevSlide,
    nextSlide,
    isFirst,
    isLast,
    prevButtonLabel: prevSlide ? `← Sebelumnya: ${prevSlide.title}` : null,
    nextButtonLabel: nextSlide ? `Selanjutnya: ${nextSlide.title} →` : 'Kembali ke Daftar Isi'
  };
}
