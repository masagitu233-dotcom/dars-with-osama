/**
 * QA & Consultation Helper for Dars with Osama
 *
 * Implements:
 * 1. Consultation count calculations (Unanswered / Merah vs Answered / Hijau)
 * 2. Automatic Answer Table of Contents (Jawaban Ringkas vs Jawaban Mendetail)
 * 3. Privacy-preserving share message generation (no title, no category, no student name, no ID)
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
  items: QATableOfContentsItem[];
}

/**
 * Strips HTML tags and entities to evaluate text content.
 */
export function stripHtmlTags(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Splits an answer HTML into Jawaban Ringkas and Jawaban Mendetail.
 * Detects natural heading markers, explicit sections, or splits between summary paragraphs and detailed points.
 */
export function splitQAAnswer(rawHtml: string, consultationId: string): SplitQAAnswerResult {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return {
      hasRingkas: false,
      ringkasHtml: '',
      hasMendetail: false,
      mendetailHtml: '',
      items: []
    };
  }

  const clean = rawHtml.trim();
  const ringkasAnchorId = `jawaban-ringkas-${consultationId}`;
  const mendetailAnchorId = `jawaban-mendetail-${consultationId}`;

  // Check for explicit markers or headings like <h1>...Rincian...</h1> or <h2>...
  // Matches phrases such as "Berikut ini adalah Rinciannya", "Rincian Jawaban", "Jawaban Mendetail",
  // "Pembahasan Terperinci", "Berikut pembahasannya secara terperinci", or any H1/H2 with detailed keywords
  const markerPatterns = [
    /<(?:h[1-3]|p|div)\b[^>]*>(?:<strong>)?(?:Berikut\s+(?:ini\s+adalah\s+)?(?:pembahasannya\s+secara\s+terperinci|rinciannya|penjelasannya)|Rincian|Jawaban\s+Mendetail|Pembahasan\s+Terperinci)[^<]*<\/(?:h[1-3]|p|div)>/i,
    /<h[12]\b[^>]*>[\s\S]*?(?:rincian|mendetail|pembahasan|dalil|penjelasan|takhrij)[\s\S]*?<\/h[12]>/i
  ];

  let splitIndex = -1;

  for (const pattern of markerPatterns) {
    const match = clean.match(pattern);
    if (match && match.index !== undefined && match.index > 50) {
      splitIndex = match.index;
      break;
    }
  }

  // Fallback: If no explicit keyword marker, check if there is an H1/H2 heading that starts the detailed body
  if (splitIndex === -1) {
    const firstHeadingMatch = clean.match(/<h[12]\b[^>]*>/i);
    // If there is significant summary content before the first heading (> 100 chars), split there
    if (firstHeadingMatch && firstHeadingMatch.index !== undefined && firstHeadingMatch.index >= 80) {
      splitIndex = firstHeadingMatch.index;
    }
  }

  // If a valid split point is found
  if (splitIndex > 0) {
    const ringkasPart = clean.slice(0, splitIndex).trim();
    const mendetailPart = clean.slice(splitIndex).trim();

    const ringkasText = stripHtmlTags(ringkasPart);
    const mendetailText = stripHtmlTags(mendetailPart);

    if (ringkasText.length > 0 && mendetailText.length > 0) {
      return {
        hasRingkas: true,
        ringkasHtml: ringkasPart,
        hasMendetail: true,
        mendetailHtml: mendetailPart,
        items: [
          {
            id: 'ringkas',
            label: 'Jawaban Ringkas',
            targetId: ringkasAnchorId
          },
          {
            id: 'mendetail',
            label: 'Jawaban Mendetail',
            targetId: mendetailAnchorId
          }
        ]
      };
    }
  }

  // Single section answer: only brief/entire answer exists
  const text = stripHtmlTags(clean);
  if (text.length > 0) {
    return {
      hasRingkas: true,
      ringkasHtml: clean,
      hasMendetail: false,
      mendetailHtml: '',
      // Only 1 section exists, so TOC is omitted per requirement D
      items: []
    };
  }

  return {
    hasRingkas: false,
    ringkasHtml: '',
    hasMendetail: false,
    mendetailHtml: '',
    items: []
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
