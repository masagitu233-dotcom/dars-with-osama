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
