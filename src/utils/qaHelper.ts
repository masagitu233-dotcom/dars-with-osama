/**
 * QA & Consultation Helper for Dars with Osama
 *
 * Implements:
 * 1. Consultation count calculations (Unanswered / Merah vs Answered / Hijau)
 * 2. Explicit Admin Selection-based Section Marking (Jawaban Ringkas vs Jawaban Mendetail)
 *    - With visual boundary banners in editor: [AWAL JAWABAN RINGKAS] ... [AKHIR JAWABAN RINGKAS]
 *    - Stripped on public page so boundaries never appear in public views
 *    - Strict zero-guessing: legacy / unmarked answers are never randomly split
 * 3. Automatic Answer Table of Contents based strictly on Heading 1 (<h1>)
 * 4. Hierarchical TOC structure: Main Sections (Ringkas & Mendetail) with Heading 1 sub-items
 * 5. Privacy-preserving share message generation (no title, no category, no student name, no ID)
 */

import { Consultation } from '../types';
import {
  hasMeaningfulContent,
  splitSessionContentIntoSlides,
  getSlideNavInfo,
  SessionSlide,
  SlideNavInfo
} from './sessionSlideHelper.js';

export interface ConsultationCounts {
  unansweredCount: number;
  answeredCount: number;
}

/**
 * Computes unanswered vs answered consultation counts.
 * - Unanswered (Merah): questions awaiting answer (status 'pending' or no replyContent)
 * - Answered (Hijau): questions with saved/published replies (status 'answered' or (replyContent and isPublished))
 * Each active question is counted at most once.
 */
export function computeConsultationCounts(consultations: Consultation[]): ConsultationCounts {
  if (!Array.isArray(consultations)) {
    return { unansweredCount: 0, answeredCount: 0 };
  }

  let unansweredCount = 0;
  let answeredCount = 0;

  for (const c of consultations) {
    if (!c || !c.id) continue;

    const hasReply = Boolean(c.replyContent && c.replyContent.trim().length > 0);
    const isAnswered = c.status === 'answered' || (c.isPublished && hasReply) || (hasReply && c.status !== 'pending');

    if (isAnswered) {
      answeredCount++;
    } else if (c.status === 'pending' || !hasReply) {
      unansweredCount++;
    }
  }

  return { unansweredCount, answeredCount };
}

export interface QATocHeading {
  id: string;
  text: string;
}

export interface QATocMainSection {
  id: 'ringkas' | 'mendetail';
  label: string;
  targetId: string;
  headings: QATocHeading[];
}

export interface QATableOfContentsItem {
  id: string;
  label: string;
  targetId: string;
}

export interface SplitQAAnswerResult {
  hasRingkas: boolean;
  ringkasHtml: string;
  hasMendetail: boolean;
  mendetailHtml: string;
  isExplicitlyMarked: boolean;
  unmarkedHtml: string;
  items: QATableOfContentsItem[];
  sections: QATocMainSection[];
  totalHeadings: number;
}

/**
 * Strips HTML tags and entities to evaluate text content.
 */
export function stripHtmlTags(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Constructs marked section HTML with visual boundary indicators for the editor.
 * The boundary tags have contenteditable="false" and data-qa-boundary attributes.
 */
export function buildMarkedSectionHtml(type: 'ringkas' | 'mendetail', innerContentHtml: string): string {
  const isRingkas = type === 'ringkas';
  const label = isRingkas ? 'RINGKAS' : 'MENDETAIL';
  const startBannerText = `📌 [AWAL JAWABAN ${label}]`;
  const endBannerText = `🏁 [AKHIR JAWABAN ${label}]`;

  const borderClass = isRingkas ? 'border-[#123D32]' : 'border-[#D6AD52]';
  const bgClass = isRingkas ? 'bg-[#FAF7F0] dark:bg-[#102C2B]' : 'bg-[#FDFBF7] dark:bg-[#16263D]';
  const shadowClass = isRingkas ? 'shadow-[3px_3px_0px_#123D32]' : 'shadow-[3px_3px_0px_#D6AD52]';
  const badgeHeaderBg = isRingkas ? 'bg-[#123D32] text-[#D6AD52]' : 'bg-[#D6AD52] text-[#171717]';

  return `<section data-qa-section="${type}" class="dars-qa-marked-section ${type} my-4 p-3.5 sm:p-4 rounded-md border-2 ${borderClass} ${bgClass} text-[#171717] dark:text-[#CEFEF1] ${shadowClass} transition-all">
<div data-qa-boundary="start" contenteditable="false" class="dars-qa-boundary-start select-none py-1.5 px-3 mb-2.5 rounded text-[11px] font-extrabold uppercase tracking-wider flex items-center justify-between border ${badgeHeaderBg} border-[#171717]">
<span>${startBannerText}</span>
<span class="text-[9px] font-mono opacity-80">Panduan Visual Editor</span>
</div>
<div data-section-content="${type}" class="dars-qa-section-content space-y-2">
${innerContentHtml || '<p></p>'}
</div>
<div data-qa-boundary="end" contenteditable="false" class="dars-qa-boundary-end select-none py-1.5 px-3 mt-2.5 rounded text-[11px] font-extrabold uppercase tracking-wider flex items-center justify-between border ${badgeHeaderBg} border-[#171717]">
<span>${endBannerText}</span>
<span class="text-[9px] font-mono opacity-80">Batas Akhir</span>
</div>
</section>`;
}

/**
 * Extracts pure content from a marked section by completely stripping the visual boundary indicators,
 * wrapper elements, and any leftover boundary text.
 */
export function extractCleanSectionContent(rawSectionHtml: string): string {
  if (!rawSectionHtml || typeof rawSectionHtml !== 'string') return '';

  let clean = rawSectionHtml;

  // 1. Remove start boundary div
  clean = clean.replace(/<div\b[^>]*data-qa-boundary=["']?start["']?[^>]*>[\s\S]*?<\/div>/gi, '');

  // 2. Remove end boundary div
  clean = clean.replace(/<div\b[^>]*data-qa-boundary=["']?end["']?[^>]*>[\s\S]*?<\/div>/gi, '');

  // 3. Extract content inside data-section-content if present
  const contentMatch = clean.match(/<div\b[^>]*data-section-content=["'][^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  if (contentMatch && contentMatch[1] !== undefined) {
    clean = contentMatch[1];
  }

  // 4. Strip outer section tag
  clean = clean.replace(/<\/?section\b[^>]*>/gi, '');

  // 5. Clean up any literal text markers if written in text
  clean = clean.replace(/\[\s*AWAL JAWABAN (?:RINGKAS|MENDETAIL)\s*\]/gi, '');
  clean = clean.replace(/\[\s*AKHIR JAWABAN (?:RINGKAS|MENDETAIL)\s*\]/gi, '');
  clean = clean.replace(/📌/g, '');
  clean = clean.replace(/🏁/g, '');

  return clean.trim();
}

/**
 * Checks whether an HTML string contains explicitly marked sections.
 */
export function hasExplicitSectionMarking(html: string): {
  hasRingkas: boolean;
  hasMendetail: boolean;
  isExplicitlyMarked: boolean;
} {
  if (!html || typeof html !== 'string') {
    return { hasRingkas: false, hasMendetail: false, isExplicitlyMarked: false };
  }

  const hasRingkas = /data-qa-section=["']?ringkas["']?/i.test(html);
  const hasMendetail = /data-qa-section=["']?mendetail["']?/i.test(html);

  return {
    hasRingkas,
    hasMendetail,
    isExplicitlyMarked: hasRingkas || hasMendetail
  };
}

/**
 * Checks whether an HTML string contains a specific marked section type.
 */
export function hasMarkedSection(html: string, type: 'ringkas' | 'mendetail'): boolean {
  if (!html || typeof html !== 'string') return false;
  return new RegExp(`data-qa-section=["']?${type}["']?`, 'i').test(html);
}

/**
 * Unmarks a section in an HTML string, keeping its inner text intact while removing
 * the boundary markers and section container.
 */
export function unmarkSectionInHtml(html: string, type: 'ringkas' | 'mendetail'): string {
  if (!html || typeof html !== 'string') return '';

  const regex = new RegExp(
    `<section\\b[^>]*data-qa-section=["']?${type}["']?[^>]*>([\\s\\S]*?)<\\/section>`,
    'i'
  );

  return html.replace(regex, (_match, inner) => {
    return extractCleanSectionContent(inner);
  });
}

/**
 * Wraps selected HTML into a marked section within the full document HTML.
 * Ensures any previously existing section of the same type is unmarked first to avoid duplicates.
 */
export function wrapSelectionInHtml(
  fullHtml: string,
  selectedHtml: string,
  type: 'ringkas' | 'mendetail'
): string {
  if (!fullHtml) return buildMarkedSectionHtml(type, selectedHtml);
  if (!selectedHtml || !stripHtmlTags(selectedHtml).trim()) return fullHtml;

  // Unmark previous section of this type to prevent multiple blocks
  let baseHtml = unmarkSectionInHtml(fullHtml, type);

  // If selectedHtml exists in baseHtml, replace it
  const cleanSelected = selectedHtml.trim();
  if (baseHtml.includes(cleanSelected)) {
    const wrapped = buildMarkedSectionHtml(type, cleanSelected);
    return baseHtml.replace(cleanSelected, wrapped);
  }

  // Fallback: append marked section
  return `${baseHtml}\n${buildMarkedSectionHtml(type, cleanSelected)}`;
}

/**
 * Extracts ONLY <h1> tags from an HTML segment and injects unique anchors with sticky header clearance (`scroll-mt-28`).
 * Heading 2 (<h2>), Heading 3 (<h3>), and paragraphs are STRICTLY excluded from the TOC.
 */
export function extractHeadingsAndInjectAnchors(
  html: string,
  consultationId: string,
  prefix: 'r' | 'm' | 'u'
): { processedHtml: string; headings: QATocHeading[] } {
  if (!html || typeof html !== 'string') {
    return { processedHtml: '', headings: [] };
  }

  const headings: QATocHeading[] = [];
  let headingIndex = 0;

  // Regex strictly matches <h1>...</h1>, ignoring <h2>, <h3>, <p>, etc.
  const processedHtml = html.replace(
    /<h1(\b[^>]*)>([\s\S]*?)<\/h1>/gi,
    (fullMatch, attrString: string, innerHtml: string) => {
      const plainText = stripHtmlTags(innerHtml).trim();
      if (!plainText) {
        return fullMatch;
      }

      const headingId = `qa-h1-${consultationId}-${prefix}-${headingIndex}`;
      headingIndex++;

      headings.push({
        id: headingId,
        text: plainText
      });

      // Strip existing id to avoid duplicated or conflicting anchors
      let cleanAttrs = (attrString || '')
        .replace(/\sid=["'][^"']*["']/gi, '')
        .trim();

      // Inject scroll-mt-28 to clear sticky header (~96px)
      if (/class=["']/i.test(cleanAttrs)) {
        cleanAttrs = cleanAttrs.replace(/class=["']([^"']*)["']/i, (_m, existingClass) => {
          return `class="${existingClass} scroll-mt-28"`;
        });
      } else {
        cleanAttrs = `${cleanAttrs} class="scroll-mt-28"`.trim();
      }

      return `<h1 id="${headingId}" ${cleanAttrs}>${innerHtml}</h1>`;
    }
  );

  return { processedHtml, headings };
}

/**
 * Regex matching legacy divider if present from earlier migration
 */
export const QA_DIVIDER_REGEX =
  /(?:<!--dars-qa-split-->|<div\b[^>]*data-qa-divider=["']?mendetail["']?[^>]*>[\s\S]*?<\/div>|<div\b[^>]*class=["'][^"']*dars-qa-divider[^"']*["'][^>]*>[\s\S]*?<\/div>|<hr\b[^>]*data-qa-divider=["']?mendetail["']?[^>]*\/?>|<hr\b[^>]*class=["'][^"']*dars-qa-divider[^"']*["'][^>]*\/?>)/i;

/**
 * Splits an answer HTML into Jawaban Ringkas and Jawaban Mendetail strictly based on
 * explicit admin designation (NO GUESSING!).
 *
 * Rules:
 * 1. Only texts enclosed in data-qa-section="ringkas" or data-qa-section="mendetail" are treated as designated.
 * 2. Visual boundary headers/footers ([AWAL ...], [AKHIR ...]) are stripped cleanly for public rendering.
 * 3. Heading 1 (<h1>) in each section are extracted to TOC. Heading 2 & 3 are strictly excluded.
 * 4. If neither section is designated (legacy answer):
 *    - hasRingkas = false, hasMendetail = false, isExplicitlyMarked = false
 *    - unmarkedHtml contains the full unmodified answer, rendered without empty boxes.
 * 5. If only one section is designated, only that section is rendered (no empty box for the other).
 */
export function splitQAAnswer(rawHtml: string, consultationId: string): SplitQAAnswerResult {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return {
      hasRingkas: false,
      ringkasHtml: '',
      hasMendetail: false,
      mendetailHtml: '',
      isExplicitlyMarked: false,
      unmarkedHtml: '',
      items: [],
      sections: [],
      totalHeadings: 0
    };
  }

  const clean = rawHtml.trim();
  const ringkasAnchorId = `jawaban-ringkas-${consultationId}`;
  const mendetailAnchorId = `jawaban-mendetail-${consultationId}`;

  // 1. Check for explicit marked sections
  const ringkasMatch = clean.match(/<section\b[^>]*data-qa-section=["']?ringkas["']?[^>]*>([\s\S]*?)<\/section>/i);
  const mendetailMatch = clean.match(/<section\b[^>]*data-qa-section=["']?mendetail["']?[^>]*>([\s\S]*?)<\/section>/i);

  let rawRingkas = '';
  let rawMendetail = '';
  let isExplicitlyMarked = false;

  if (ringkasMatch || mendetailMatch) {
    isExplicitlyMarked = true;
    if (ringkasMatch && ringkasMatch[1]) {
      rawRingkas = extractCleanSectionContent(ringkasMatch[1]);
    }
    if (mendetailMatch && mendetailMatch[1]) {
      rawMendetail = extractCleanSectionContent(mendetailMatch[1]);
    }
  } else {
    // Check legacy divider fallback if previously saved with divider
    const dividerMatch = clean.match(QA_DIVIDER_REGEX);
    if (dividerMatch && dividerMatch.index !== undefined) {
      isExplicitlyMarked = true;
      rawRingkas = clean.slice(0, dividerMatch.index).trim();
      rawMendetail = clean.slice(dividerMatch.index + dividerMatch[0].length).trim();
    }
  }

  const hasRingkasText = isExplicitlyMarked && stripHtmlTags(rawRingkas).length > 0;
  const hasMendetailText = isExplicitlyMarked && stripHtmlTags(rawMendetail).length > 0;

  // Process explicitly marked sections
  if (isExplicitlyMarked && (hasRingkasText || hasMendetailText)) {
    const ringkasProcessed = extractHeadingsAndInjectAnchors(rawRingkas, consultationId, 'r');
    const mendetailProcessed = extractHeadingsAndInjectAnchors(rawMendetail, consultationId, 'm');

    const totalHeadings = ringkasProcessed.headings.length + mendetailProcessed.headings.length;

    const sections: QATocMainSection[] = [];
    const items: QATableOfContentsItem[] = [];

    if (hasRingkasText) {
      sections.push({
        id: 'ringkas',
        label: 'Jawaban Ringkas',
        targetId: ringkasAnchorId,
        headings: ringkasProcessed.headings
      });
      items.push({
        id: 'ringkas',
        label: 'Jawaban Ringkas',
        targetId: ringkasAnchorId
      });
    }

    if (hasMendetailText) {
      sections.push({
        id: 'mendetail',
        label: 'Jawaban Mendetail',
        targetId: mendetailAnchorId,
        headings: mendetailProcessed.headings
      });
      items.push({
        id: 'mendetail',
        label: 'Jawaban Mendetail',
        targetId: mendetailAnchorId
      });
    }

    return {
      hasRingkas: hasRingkasText,
      ringkasHtml: ringkasProcessed.processedHtml,
      hasMendetail: hasMendetailText,
      mendetailHtml: mendetailProcessed.processedHtml,
      isExplicitlyMarked: true,
      unmarkedHtml: '',
      items,
      sections,
      totalHeadings
    };
  }

  // Legacy or unmarked answer: Strict Zero-Guessing Rule!
  // Do NOT guess paragraph 1 as Ringkas or paragraph 2 as Mendetail.
  // No TOC sections are displayed until admin explicitly designates sections.
  return {
    hasRingkas: false,
    ringkasHtml: '',
    hasMendetail: false,
    mendetailHtml: '',
    isExplicitlyMarked: false,
    unmarkedHtml: clean,
    items: [],
    sections: [],
    totalHeadings: 0
  };
}

/**
 * Calculates quick stats on answer composition for admin UI indicators.
 */
export function getAnswerSectionStats(html: string, consultationId: string = 'preview') {
  const result = splitQAAnswer(html, consultationId);
  const ringkasWords = stripHtmlTags(result.ringkasHtml).split(/\s+/).filter(Boolean).length;
  const mendetailWords = stripHtmlTags(result.mendetailHtml).split(/\s+/).filter(Boolean).length;
  const unmarkedWords = stripHtmlTags(result.unmarkedHtml || html).split(/\s+/).filter(Boolean).length;

  const ringkasH1Count = result.sections.find((s) => s.id === 'ringkas')?.headings.length || 0;
  const mendetailH1Count = result.sections.find((s) => s.id === 'mendetail')?.headings.length || 0;

  return {
    isExplicitlyMarked: result.isExplicitlyMarked,
    hasRingkas: result.hasRingkas,
    hasMendetail: result.hasMendetail,
    ringkasWords,
    mendetailWords,
    unmarkedWords,
    totalWords: ringkasWords + mendetailWords + unmarkedWords,
    ringkasH1Count,
    mendetailH1Count,
    totalH1Count: result.totalHeadings,
    sections: result.sections
  };
}

/**
 * Builds the canonical, privacy-preserving share message for a Q&A question.
 * Strictly excludes:
 * - Category
 * - Question title
 * - Consultation ID
 * - Student name
 *
 * Includes:
 * - Full question text intact (no truncation)
 * - Standard invitation narration
 * - Direct link to the question detail page
 */
export function buildQAShareMessage(
  questionContent: string,
  directUrl: string
): {
  plainText: string;
  shareUrl: string;
} {
  const cleanQuestion = (questionContent || '').trim();

  const plainText = `Ada pertanyaan seputar persoalan keislaman yang telah dibahas di Dars with Osama:

"${cleanQuestion}"

Silakan membaca pertanyaan dan jawaban lengkapnya melalui tautan berikut:

${directUrl}`;

  return {
    plainText,
    shareUrl: directUrl
  };
}

export interface QASlide extends SessionSlide {
  sectionType?: 'ringkas' | 'mendetail' | 'general';
}

export interface QASlideResult {
  hasMultipleSlides: boolean;
  slides: QASlide[];
  fallbackUsed: boolean;
  isExplicitlyMarked: boolean;
  fullCleanHtml: string;
}

/**
 * Splits Q&A answer HTML into structured slides for the reading viewer.
 *
 * Rules:
 * 1. If explicitly marked (Ringkas / Mendetail):
 *    - Ringkas section: if it has <h1>, split into H1 slides; otherwise 1 slide named "Jawaban Ringkas".
 *    - Mendetail section: if it has <h1>, split into H1 slides; otherwise 1 slide named "Jawaban Mendetail & Pembahasan Lengkap".
 *    - Visual boundary indicators ([AWAL ...], [AKHIR ...]) are cleanly excluded.
 * 2. If unmarked:
 *    - If it has <h1> headings, split by <h1> using splitSessionContentIntoSlides.
 *    - If no <h1> headings, fallback to a single slide named fallbackTitle ("Jawaban Resmi Ustaz").
 * 3. Builds clean combined HTML for full reading mode ("Baca Semua").
 */
export function splitQAContentIntoSlides(
  rawHtml: string | undefined | null,
  fallbackTitle: string = 'Jawaban Resmi Ustaz',
  consultationId: string = 'qa'
): QASlideResult {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return {
      hasMultipleSlides: false,
      slides: [],
      fallbackUsed: false,
      isExplicitlyMarked: false,
      fullCleanHtml: ''
    };
  }

  const clean = rawHtml.trim();
  if (!hasMeaningfulContent(clean)) {
    return {
      hasMultipleSlides: false,
      slides: [],
      fallbackUsed: false,
      isExplicitlyMarked: false,
      fullCleanHtml: ''
    };
  }

  const qaAnswer = splitQAAnswer(clean, consultationId);

  // Case 1: Explicitly marked sections (Ringkas / Mendetail)
  if (qaAnswer.isExplicitlyMarked && (qaAnswer.hasRingkas || qaAnswer.hasMendetail)) {
    const slides: QASlide[] = [];

    // Process Jawaban Ringkas
    if (qaAnswer.hasRingkas) {
      const ringkasSlideResult = splitSessionContentIntoSlides(
        qaAnswer.ringkasHtml,
        'Jawaban Ringkas'
      );

      if (ringkasSlideResult.hasH1 && ringkasSlideResult.slides.length > 0) {
        ringkasSlideResult.slides.forEach((s) => {
          slides.push({
            ...s,
            sectionType: 'ringkas'
          });
        });
      } else {
        slides.push({
          id: `qa-slide-ringkas`,
          title: 'Jawaban Ringkas',
          titleHtml: 'Jawaban Ringkas',
          htmlContent: qaAnswer.ringkasHtml,
          index: slides.length,
          sectionType: 'ringkas'
        });
      }
    }

    // Process Jawaban Mendetail
    if (qaAnswer.hasMendetail) {
      const mendetailSlideResult = splitSessionContentIntoSlides(
        qaAnswer.mendetailHtml,
        'Jawaban Mendetail & Pembahasan Lengkap'
      );

      if (mendetailSlideResult.hasH1 && mendetailSlideResult.slides.length > 0) {
        mendetailSlideResult.slides.forEach((s) => {
          slides.push({
            ...s,
            sectionType: 'mendetail'
          });
        });
      } else {
        slides.push({
          id: `qa-slide-mendetail`,
          title: 'Jawaban Mendetail & Pembahasan Lengkap',
          titleHtml: 'Jawaban Mendetail & Pembahasan Lengkap',
          htmlContent: qaAnswer.mendetailHtml,
          index: slides.length,
          sectionType: 'mendetail'
        });
      }
    }

    // Normalize indices and IDs
    const normalizedSlides: QASlide[] = slides.map((slide, idx) => ({
      ...slide,
      id: `qa-slide-${idx + 1}`,
      index: idx
    }));

    // Build clean HTML for full reading mode
    let fullCleanHtml = '';
    if (qaAnswer.hasRingkas) {
      fullCleanHtml += `<div class="qa-section-ringkas mb-6 space-y-2">
        ${qaAnswer.hasMendetail ? '<div class="flex items-center gap-2 text-xs font-bold font-serif text-[#123D32] dark:text-[#4CA7A1] pb-1 border-b border-[#171717]/10 dark:border-[#4CA7A1]/20"><span class="w-2 h-2 rounded-full bg-[#123D32] dark:bg-[#4CA7A1]"></span><span>Jawaban Ringkas</span></div>' : ''}
        <div class="prose dark:prose-invert max-w-none text-[#171717] dark:text-[#CEFEF1] leading-relaxed space-y-3 font-sans blog-content">${qaAnswer.ringkasHtml}</div>
      </div>`;
    }
    if (qaAnswer.hasMendetail) {
      fullCleanHtml += `<div class="qa-section-mendetail space-y-2 ${qaAnswer.hasRingkas ? 'pt-4 border-t-2 border-[#171717]/15 dark:border-[#4CA7A1]/30' : ''}">
        <div class="flex items-center gap-2 text-xs sm:text-sm font-bold font-serif text-[#123D32] dark:text-[#CEFEF1] pb-1 border-b border-[#171717]/10 dark:border-[#4CA7A1]/20"><span class="w-2 h-2 rounded-full bg-[#D6AD52]"></span><span>Jawaban Mendetail & Pembahasan Lengkap</span></div>
        <div class="prose dark:prose-invert max-w-none text-[#171717] dark:text-[#CEFEF1] leading-relaxed space-y-3 font-sans blog-content">${qaAnswer.mendetailHtml}</div>
      </div>`;
    }

    return {
      hasMultipleSlides: normalizedSlides.length > 1,
      slides: normalizedSlides,
      fallbackUsed: false,
      isExplicitlyMarked: true,
      fullCleanHtml
    };
  }

  // Case 2: Unmarked answer (Zero-guessing rule)
  // Splits by <h1> if present, or creates a single fallback slide
  const sessionResult = splitSessionContentIntoSlides(
    clean,
    fallbackTitle || 'Jawaban Resmi Ustaz'
  );

  const normalizedSlides: QASlide[] = sessionResult.slides.map((s, idx) => ({
    ...s,
    id: `qa-slide-${idx + 1}`,
    index: idx,
    sectionType: 'general'
  }));

  return {
    hasMultipleSlides: normalizedSlides.length > 1,
    slides: normalizedSlides,
    fallbackUsed: sessionResult.fallbackUsed,
    isExplicitlyMarked: false,
    fullCleanHtml: clean
  };
}

/**
 * Validates an optional WhatsApp number for student consultations.
 * - Empty/null/undefined is valid because WhatsApp number is optional.
 * - If provided, checks that it only contains allowed digits/symbols and has reasonable length (9-16 digits).
 */
export function validateWhatsAppNumber(phone: string | undefined | null): {
  isValid: boolean;
  cleanDigits?: string;
  normalized?: string;
  error?: string;
} {
  if (!phone || typeof phone !== 'string') {
    return { isValid: true, cleanDigits: '', normalized: '' };
  }

  const trimmed = phone.trim();
  if (!trimmed) {
    return { isValid: true, cleanDigits: '', normalized: '' };
  }

  // Must not contain letters
  if (/[a-zA-Z]/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Nomor WhatsApp tidak boleh mengandung huruf. Masukkan nomor telepon yang valid.'
    };
  }

  // Extract all digits
  const cleanDigits = trimmed.replace(/\D/g, '');

  // Reasonable length check: Indonesian & international numbers are between 9 and 16 digits
  if (cleanDigits.length < 9) {
    return {
      isValid: false,
      error: 'Nomor WhatsApp terlalu pendek. Masukkan minimal 9 digit (contoh: 08xxxxxxxxxx).'
    };
  }

  if (cleanDigits.length > 16) {
    return {
      isValid: false,
      error: 'Nomor WhatsApp terlalu panjang (maksimal 16 digit).'
    };
  }

  const normalized = normalizeWhatsAppForWaMe(trimmed);

  return {
    isValid: true,
    cleanDigits,
    normalized
  };
}

/**
 * Normalizes a phone number for wa.me URL consumption:
 * E.g.:
 * - '081234567890' -> '6281234567890'
 * - '+6281234567890' -> '6281234567890'
 * - '81234567890' -> '6281234567890'
 * - '6281234567890' -> '6281234567890'
 */
export function normalizeWhatsAppForWaMe(phone: string | undefined | null): string {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.trim().replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }
  if (digits.startsWith('8')) {
    return `62${digits}`;
  }
  return digits;
}

/**
 * Builds an official WhatsApp link for admin to initiate contact with the student penanya.
 */
export function buildAdminWhatsAppUrl(
  consultation: {
    id: string;
    title: string;
    whatsappNumber?: string;
    studentName?: string;
    replyContent?: string;
    isPublished?: boolean;
  },
  customMessage?: string
): string {
  const normalizedNumber = normalizeWhatsAppForWaMe(consultation.whatsappNumber);
  if (!normalizedNumber) return '';

  if (customMessage && customMessage.trim()) {
    return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(customMessage.trim())}`;
  }

  const name = consultation.studentName || 'Bapak/Ibu/Saudara/i';
  const hasReply = Boolean(consultation.replyContent && consultation.replyContent.trim().length > 0);
  const consultationLink = consultation.isPublished
    ? `https://darswithosama.com/qa/${consultation.id}`
    : `https://darswithosama.com/`;

  const defaultMessage = `Assalamu'alaikum Warahmatullahi Wabarakatuh ${name},

Pemberitahuan dari Dars with Osama seputar konsultasi Anda:
*Topik:* ${consultation.title}

${hasReply ? 'Alhamdulillah, balasan dan arahan resmi untuk pertanyaan Anda telah selesai dijawab oleh Ustaz / Admin Dars with Osama di website.' : 'Pertanyaan Anda telah kami terima dan sedang ditinjau oleh Ustaz / Admin Dars with Osama.'}

${consultation.isPublished ? `Anda juga dapat membaca pertanyaan dan jawaban lengkap melalui tautan berikut:\n${consultationLink}` : 'Silakan masuk ke Ruang Konsultasi pada akun website Anda untuk membaca balasan lengkap.'}

Jazakumullahu khairan.
_Admin Dars with Osama_`;

  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(defaultMessage)}`;
}

export interface ConsultationAdminStatusInfo {
  isPrivate: boolean;
  isPublished: boolean;
  privacyLabel: 'Konsultasi Privat' | 'Publik' | 'Materi & Pelajaran';
  privacyBadgeClass: string;
  isAnswered: boolean;
  resolutionLabel: 'Menunggu Jawaban' | 'Selesai' | 'Selesai & Publik';
  resolutionBadgeClass: string;
}

/**
 * Returns clean, unmixed consultation status labels distinguishing resolution from privacy.
 */
export function getConsultationAdminStatus(item: Consultation): ConsultationAdminStatusInfo {
  const isPublished = Boolean(item.isPublished);
  const isPrivate = item.category === 'private';
  const hasReply = Boolean(item.replyContent && item.replyContent.trim().length > 0);
  const isAnswered = item.status === 'answered' || item.status === 'closed' || hasReply;

  let privacyLabel: 'Konsultasi Privat' | 'Publik' | 'Materi & Pelajaran' = 'Materi & Pelajaran';
  let privacyBadgeClass = 'bg-[#0D2B36] text-[#CEFEF1] border-[#171717] dark:border-[#4CA7A1]';

  if (isPublished) {
    privacyLabel = 'Publik';
    privacyBadgeClass = 'bg-[#123D32] text-[#CEFEF1] border-[#171717] dark:border-[#4CA7A1]';
  } else if (isPrivate) {
    privacyLabel = 'Konsultasi Privat';
    privacyBadgeClass = 'bg-[#6C151E] text-[#FFF5E9] border-[#171717]';
  }

  let resolutionLabel: 'Menunggu Jawaban' | 'Selesai' | 'Selesai & Publik' = 'Menunggu Jawaban';
  let resolutionBadgeClass = 'bg-[#3478F6] text-white border-[#171717]';

  if (isPublished && isAnswered) {
    resolutionLabel = 'Selesai & Publik';
    resolutionBadgeClass = 'bg-[#123D32] text-[#CEFEF1] border-[#171717]';
  } else if (isAnswered) {
    resolutionLabel = 'Selesai';
    resolutionBadgeClass = 'bg-[#D6AD52] text-[#171717] border-[#171717]';
  } else {
    resolutionLabel = 'Menunggu Jawaban';
    resolutionBadgeClass = 'bg-[#C94A4A] text-white border-[#171717]';
  }

  return {
    isPrivate,
    isPublished,
    privacyLabel,
    privacyBadgeClass,
    isAnswered,
    resolutionLabel,
    resolutionBadgeClass
  };
}

/**
 * Sanitizes consultation data for public views.
 * Strictly guarantees that WhatsApp numbers, student emails, and private identities are never leaked.
 */
export function sanitizeConsultationForPublic(item: Consultation): Consultation {
  return {
    ...item,
    whatsappNumber: undefined,
    studentEmail: undefined,
    studentName: item.category === 'private' ? 'Penanya (Anonim)' : (item.studentName || 'Penanya (Anonim)')
  };
}

