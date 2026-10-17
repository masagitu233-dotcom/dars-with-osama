/**
 * DARS WITH OSAMA — DAKWAH CARD CANVAS ENGINE
 * Professional, Elegant, High-Resolution Social Media Card Generator
 *
 * Visual Brand Constitution:
 * - Primary Navy: #123B6D
 * - Secondary Teal: #0EA5A4
 * - Accent Gold: #F4B942 / #C9A34E
 * - Editorial Light Background: #FCFBF7 (Clean, High Contrast, Sunlight-readable)
 * - Typography: Amiri (Arabic), Plus Jakarta Sans (Indonesian Body/UI), Playfair Display (Brand)
 * - Default Format: Portrait 4:5 (1080 × 1350 px)
 */

export type CardTheme = 'light' | 'navy' | 'emerald';
export type CardRatio = '4:5' | '1:1';

export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'arabic'
  | 'list-item'
  | 'quote'
  | 'reference';

export interface RenderableBlock {
  id: string;
  type: BlockType;
  text: string;
  isArabic: boolean;
  prefix?: string;
  level?: number;
}

export interface SlideData {
  pageNumber: number;
  totalPages: number;
  questionTitle: string;
  questionExcerpt: string;
  answerText: string;
  arabicSnippet?: string;
  isContinuation?: boolean;
  blocks: RenderableBlock[];
}

export interface DakwahCardOptions {
  theme: CardTheme;
  ratio: CardRatio;
  slide: SlideData;
  siteUrl?: string;
}

// Arabic Unicode Range
const ARABIC_CHAR_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/**
 * Strips HTML tags and normalizes entities
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Checks if a string is predominantly or purely Arabic
 */
export function isArabicBlock(str: string): boolean {
  if (!str) return false;
  const arabicMatches = str.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g);
  const arabicCount = arabicMatches ? arabicMatches.length : 0;
  const latinMatches = str.match(/[a-zA-Z]/g);
  const latinCount = latinMatches ? latinMatches.length : 0;

  // If there are no latin letters and at least 3 arabic chars
  if (latinCount === 0 && arabicCount >= 3) return true;
  // If arabic characters make up more than 55% of all letters
  if (arabicCount > 0 && arabicCount > latinCount * 1.2) return true;
  return false;
}

/**
 * Parses raw HTML / formatted text from rich text editor into semantic renderable blocks.
 * If mixed Arabic-Indonesian text is detected, extracts Arabic quotations into separate dedicated blocks.
 */
export function parseContentToBlocks(rawHtml: string): RenderableBlock[] {
  if (!rawHtml) return [];

  // Normalize breaks
  const normalized = rawHtml
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n\n')
    .replace(/<\/blockquote>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/ul>/gi, '\n\n')
    .replace(/<\/ol>/gi, '\n\n');

  // Split into raw chunks
  const chunks = normalized.split(/\n\s*\n+/);
  const blocks: RenderableBlock[] = [];
  let blockIdCounter = 1;

  for (const rawChunk of chunks) {
    const trimmedChunk = rawChunk.trim();
    if (!trimmedChunk) continue;

    // Check for list items inside this chunk
    if (trimmedChunk.includes('<li') || trimmedChunk.includes('• ') || /^\d+\.\s/m.test(trimmedChunk)) {
      const liMatches = trimmedChunk.split(/<li[^>]*>|\n(?=[•\-\*]|\d+\.)/i);
      for (const li of liMatches) {
        const cleanLi = stripHtml(li).replace(/^[•\-\*]\s*|^\d+\.\s*/, '').trim();
        if (cleanLi) {
          blocks.push({
            id: `b-${blockIdCounter++}`,
            type: 'list-item',
            text: cleanLi,
            isArabic: isArabicBlock(cleanLi),
            prefix: '•'
          });
        }
      }
      continue;
    }

    // Check if it's a heading
    if (/<h[1-6]/i.test(trimmedChunk) || /^#{1,3}\s/m.test(trimmedChunk)) {
      const cleanH = stripHtml(trimmedChunk).replace(/^#{1,3}\s*/, '').trim();
      if (cleanH) {
        blocks.push({
          id: `b-${blockIdCounter++}`,
          type: 'heading',
          text: cleanH,
          isArabic: isArabicBlock(cleanH)
        });
      }
      continue;
    }

    // Check if it's a blockquote
    const isQuoteTag = /<blockquote/i.test(trimmedChunk) || /^>\s/m.test(trimmedChunk);
    const cleanText = stripHtml(trimmedChunk).replace(/^>\s*/, '').trim();
    if (!cleanText) continue;

    // Check for pure Arabic block
    if (isArabicBlock(cleanText)) {
      blocks.push({
        id: `b-${blockIdCounter++}`,
        type: 'arabic',
        text: cleanText,
        isArabic: true
      });
      continue;
    }

    // Check for mixed Arabic in quotation marks or brackets: e.g. "قَالَ رَسُولُ اللَّهِ..." (at least 22 chars for meaningful quote)
    const arabicQuoteRegex = /([“"'\(\[\{])([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\u064B-\u065F\u0670]{22,})([”"'\)\]\}])/;
    const arabicMatch = cleanText.match(arabicQuoteRegex);

    if (arabicMatch && arabicMatch.index !== undefined) {
      const before = cleanText.substring(0, arabicMatch.index).trim();
      const arabicPart = arabicMatch[2].trim();
      const after = cleanText.substring(arabicMatch.index + arabicMatch[0].length).trim();

      if (before) {
        blocks.push({
          id: `b-${blockIdCounter++}`,
          type: isQuoteTag ? 'quote' : 'paragraph',
          text: before,
          isArabic: false
        });
      }

      blocks.push({
        id: `b-${blockIdCounter++}`,
        type: 'arabic',
        text: arabicPart,
        isArabic: true
      });

      if (after) {
        blocks.push({
          id: `b-${blockIdCounter++}`,
          type: isQuoteTag ? 'quote' : 'paragraph',
          text: after,
          isArabic: false
        });
      }
      continue;
    }

    // Regular paragraph or quote
    blocks.push({
      id: `b-${blockIdCounter++}`,
      type: isQuoteTag ? 'quote' : 'paragraph',
      text: cleanText,
      isArabic: false
    });
  }

  return blocks;
}

/**
 * Robust line wrapper that breaks text accurately and prevents any text overflow.
 * If measureFn is provided (Canvas context), uses exact pixel width; otherwise uses character estimate.
 */
export function wrapTextLines(
  text: string,
  maxWidth: number,
  measureFn?: (line: string) => number
): string[] {
  if (!text) return [];

  // Default character measurement fallback for Node tests (~11px per char for 21px font)
  const measure = measureFn || ((str: string) => str.length * 11.2);

  const paragraphs = text.split('\n');
  const resultLines: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    const words = trimmed.split(/\s+/);
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      let word = words[i];

      // Handle extra-long unbreakable words or URLs by splitting characters
      if (measure(word) > maxWidth) {
        if (currentLine) {
          resultLines.push(currentLine);
          currentLine = '';
        }
        let partialWord = '';
        for (const char of word) {
          if (measure(partialWord + char) > maxWidth) {
            resultLines.push(partialWord);
            partialWord = char;
          } else {
            partialWord += char;
          }
        }
        if (partialWord) {
          currentLine = partialWord;
        }
        continue;
      }

      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (measure(testLine) <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          resultLines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      resultLines.push(currentLine);
    }
  }

  return resultLines;
}

/**
 * Calculates the exact height in pixels required by a block on canvas
 */
export function calculateBlockHeight(
  block: RenderableBlock,
  contentWidth: number,
  measureFn?: (text: string, font: string) => number
): { height: number; lines: string[] } {
  if (block.type === 'heading') {
    const font = '700 24px "Plus Jakarta Sans", sans-serif';
    const lines = wrapTextLines(block.text, contentWidth, (s) => (measureFn ? measureFn(s, font) : s.length * 13));
    const height = lines.length * 34 + 18; // 34px line-height + 18px margin
    return { height, lines };
  }

  if (block.type === 'arabic') {
    const font = 'bold 28px "Amiri", "Noto Sans Arabic", serif';
    // Arabic box has inner padding (24px left + 24px right = 48px)
    const boxInnerWidth = contentWidth - 48;
    const lines = wrapTextLines(block.text, boxInnerWidth, (s) => (measureFn ? measureFn(s, font) : s.length * 15));
    // 46px line-height for harakat clearance + 36px vertical padding + 20px margin
    const height = lines.length * 46 + 40 + 20;
    return { height, lines };
  }

  if (block.type === 'list-item') {
    const font = '500 21px "Plus Jakarta Sans", sans-serif';
    const listInnerWidth = contentWidth - 32; // indent for bullet
    const lines = wrapTextLines(block.text, listInnerWidth, (s) => (measureFn ? measureFn(s, font) : s.length * 11));
    const height = lines.length * 32 + 12;
    return { height, lines };
  }

  if (block.type === 'quote') {
    const font = 'italic 500 21px "Plus Jakarta Sans", sans-serif';
    const quoteInnerWidth = contentWidth - 36;
    const lines = wrapTextLines(block.text, quoteInnerWidth, (s) => (measureFn ? measureFn(s, font) : s.length * 11));
    const height = lines.length * 32 + 24;
    return { height, lines };
  }

  // Regular paragraph
  const font = '500 21px "Plus Jakarta Sans", sans-serif';
  const lines = wrapTextLines(block.text, contentWidth, (s) => (measureFn ? measureFn(s, font) : s.length * 11));
  const height = lines.length * 32 + 18;
  return { height, lines };
}

/**
 * Splits a very long paragraph into smaller sentence chunks so it can span across pages cleanly
 */
function splitBlockIntoSentenceChunks(block: RenderableBlock): RenderableBlock[] {
  if (block.type === 'arabic' || block.type === 'heading') return [block];

  const sentences = block.text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [block.text];
  if (sentences.length <= 1) return [block];

  const chunks: RenderableBlock[] = [];
  let currentText = '';

  for (const sentence of sentences) {
    if (currentText.length + sentence.length > 280 && currentText.trim()) {
      chunks.push({
        ...block,
        id: `${block.id}-${chunks.length}`,
        text: currentText.trim()
      });
      currentText = sentence;
    } else {
      currentText += (currentText ? ' ' : '') + sentence.trim();
    }
  }

  if (currentText.trim()) {
    chunks.push({
      ...block,
      id: `${block.id}-${chunks.length}`,
      text: currentText.trim()
    });
  }

  return chunks.length > 0 ? chunks : [block];
}

/**
 * True height-based pagination engine.
 * Measures blocks against canvas safe heights (4:5 or 1:1) and partitions into 1..N pages.
 * Never clips text and ensures totalPages is exact.
 */
export function partitionContentIntoSlides(
  title: string,
  question: string,
  rawReply: string,
  ratio: CardRatio = '4:5'
): SlideData[] {
  const canvasHeight = ratio === '4:5' ? 1350 : 1080;
  const contentWidth = 936; // 1080 - 144px margins

  // Parse reply into semantic blocks
  const initialBlocks = parseContentToBlocks(rawReply);

  // If no blocks parsed, create a default paragraph
  if (initialBlocks.length === 0) {
    initialBlocks.push({
      id: 'b-0',
      type: 'paragraph',
      text: stripHtml(rawReply) || 'Jawaban lengkap tersedia di darswithosama.com',
      isArabic: false
    });
  }

  // Expand overly long blocks into sentence chunks so pagination can flow naturally
  const normalizedBlocks: RenderableBlock[] = [];
  for (const block of initialBlocks) {
    const { height } = calculateBlockHeight(block, contentWidth);
    if (height > 450) {
      normalizedBlocks.push(...splitBlockIntoSentenceChunks(block));
    } else {
      normalizedBlocks.push(block);
    }
  }

  // Calculate Question Box Height for Slide 1
  const cleanQ = stripHtml(question);
  const qTitleLines = wrapTextLines(title, contentWidth - 44);
  const qBodyLines = cleanQ && cleanQ !== title ? wrapTextLines(cleanQ.slice(0, 160) + (cleanQ.length > 160 ? '...' : ''), contentWidth - 44) : [];
  const qBoxHeight = 44 + qTitleLines.length * 32 + (qBodyLines.length > 0 ? qBodyLines.length * 26 + 12 : 0) + 20;

  // Header & Footer dimensions
  const headerHeightSlide1 = 175;
  const headerHeightContinuation = 120;
  const footerHeight = 80;
  const answerLabelHeight = 42;

  // Available vertical budget for answers with comfortable editorial breathing room
  const budgetSlide1 = Math.max(280, Math.min(canvasHeight - headerHeightSlide1 - qBoxHeight - answerLabelHeight - footerHeight - 30, ratio === '4:5' ? 560 : 420));
  const budgetContinuation = Math.max(380, Math.min(canvasHeight - headerHeightContinuation - answerLabelHeight - footerHeight - 30, ratio === '4:5' ? 880 : 680));

  // Multi-page grouping
  const pages: RenderableBlock[][] = [];
  let currentPageBlocks: RenderableBlock[] = [];
  let currentUsedHeight = 0;
  let isFirstPage = true;

  for (const block of normalizedBlocks) {
    const { height: blockH } = calculateBlockHeight(block, contentWidth);
    const maxBudget = isFirstPage ? budgetSlide1 : budgetContinuation;

    // Check if block fits on current page
    if (currentUsedHeight + blockH <= maxBudget || currentPageBlocks.length === 0) {
      currentPageBlocks.push(block);
      currentUsedHeight += blockH;
    } else {
      // Push completed page and start next page
      pages.push(currentPageBlocks);
      currentPageBlocks = [block];
      currentUsedHeight = blockH;
      isFirstPage = false;
    }
  }

  if (currentPageBlocks.length > 0) {
    pages.push(currentPageBlocks);
  }

  // Social media carousel safety cap: maximum 5 slides
  const MAX_SLIDES = 5;
  let finalPages = pages;
  if (pages.length > MAX_SLIDES) {
    const cappedPages = pages.slice(0, MAX_SLIDES - 1);
    // Combine remaining summary on the final slide
    const finalSlideBlocks = pages[MAX_SLIDES - 1].slice(0, 3);
    finalSlideBlocks.push({
      id: 'b-closing-callout',
      type: 'quote',
      text: 'Pembahasan lengkap, rincian fatwa, dalil kitab turats, dan daftar maraji\' selengkapnya dapat dibaca di darswithosama.com',
      isArabic: false
    });
    cappedPages.push(finalSlideBlocks);
    finalPages = cappedPages;
  }

  const totalPages = Math.max(1, finalPages.length);

  // Extract clean plain text for compatibility
  const plainReply = stripHtml(rawReply);
  const { arabic: extractedArabic } = extractArabicSnippet(plainReply);

  return finalPages.map((pageBlocks, index) => {
    const pageNum = index + 1;
    const isFirst = pageNum === 1;

    // Gather answer text for this slide
    const slideAnswerText = pageBlocks.map((b) => b.text).join('\n\n');

    return {
      pageNumber: pageNum,
      totalPages,
      questionTitle: title,
      questionExcerpt: cleanQ.slice(0, 140) + (cleanQ.length > 140 ? '...' : ''),
      answerText: slideAnswerText,
      arabicSnippet: isFirst ? extractedArabic || undefined : undefined,
      isContinuation: !isFirst,
      blocks: pageBlocks
    };
  });
}

/**
 * Extracts any Quranic verse or Arabic dalil from text (for backward compatibility)
 */
export function extractArabicSnippet(text: string): { arabic: string; remaining: string } {
  if (!text) return { arabic: '', remaining: '' };

  const paragraphs = text.split(/\n+/);
  const arabicParas: string[] = [];
  const remainingParas: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    if (isArabicBlock(trimmed)) {
      arabicParas.push(trimmed);
    } else {
      remainingParas.push(trimmed);
    }
  }

  return {
    arabic: arabicParas.slice(0, 2).join('\n'),
    remaining: remainingParas.join('\n\n')
  };
}

/**
 * Draws rounded rectangle path on canvas
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Draws the official Dars with Osama Logo Emblem on Canvas
 * Fountain Pen Nib + Open Book Pages Wings
 */
function drawOfficialLogoEmblem(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  primaryColor: string,
  accentColor: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  const scale = size / 200;
  ctx.scale(scale, scale);
  ctx.translate(-100, -100);

  // 1. Fountain Pen Nib (Petal Silhouette)
  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  ctx.moveTo(100, 22);
  ctx.bezierCurveTo(125, 58, 142, 85, 142, 118);
  ctx.bezierCurveTo(142, 136, 128, 152, 100, 152);
  ctx.bezierCurveTo(72, 152, 58, 136, 58, 118);
  ctx.bezierCurveTo(58, 85, 75, 58, 100, 22);
  ctx.closePath();
  ctx.fill();

  // Nib Slit Line
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(100, 26);
  ctx.lineTo(100, 96);
  ctx.stroke();

  // Breather Hole Circle
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(100, 98, 5, 0, Math.PI * 2);
  ctx.fill();

  // 2. Open Book Pages (Left Wings)
  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  ctx.moveTo(96, 156);
  ctx.bezierCurveTo(68, 140, 38, 142, 16, 154);
  ctx.bezierCurveTo(24, 132, 54, 126, 96, 142);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.moveTo(96, 168);
  ctx.bezierCurveTo(68, 152, 38, 154, 12, 168);
  ctx.bezierCurveTo(22, 144, 54, 138, 96, 154);
  ctx.closePath();
  ctx.fill();

  // 3. Open Book Pages (Right Wings)
  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  ctx.moveTo(104, 156);
  ctx.bezierCurveTo(132, 140, 162, 142, 184, 154);
  ctx.bezierCurveTo(176, 132, 146, 126, 104, 142);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.moveTo(104, 168);
  ctx.bezierCurveTo(132, 152, 162, 154, 188, 168);
  ctx.bezierCurveTo(178, 144, 146, 138, 104, 154);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Preloads essential fonts before rendering canvas
 */
export async function ensureFontsLoaded(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.allSettled([
      document.fonts.load('bold 28px "Amiri"'),
      document.fonts.load('400 24px "Amiri"'),
      document.fonts.load('800 24px "Plus Jakarta Sans"'),
      document.fonts.load('700 24px "Plus Jakarta Sans"'),
      document.fonts.load('500 21px "Plus Jakarta Sans"'),
      document.fonts.load('700 26px "Playfair Display"')
    ]);
    await document.fonts.ready;
  } catch (err) {
    console.warn('Font loading notice:', err);
  }
}

/**
 * Renders the High-Resolution Dakwah Card onto Canvas
 */
export async function renderDakwahCardToCanvas(options: DakwahCardOptions): Promise<HTMLCanvasElement> {
  await ensureFontsLoaded();

  const { theme = 'light', ratio = '4:5', slide, siteUrl = 'darswithosama.com' } = options;
  const width = 1080;
  const height = ratio === '4:5' ? 1350 : 1080;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context tidak tersedia.');

  // Color Tokens
  const isLight = theme === 'light';
  const isNavy = theme === 'navy';
  const isEmerald = theme === 'emerald';

  const brandNavy = '#123B6D';
  const brandTeal = '#0EA5A4';
  const brandGold = '#F4B942';
  const goldAntique = '#C9A34E';

  // Palette Configuration
  const colors = {
    bgTop: isLight ? '#FCFBF7' : isNavy ? '#0E243D' : '#09362A',
    bgBottom: isLight ? '#F5F3EB' : isNavy ? '#061321' : '#041712',
    borderOuter: isLight ? 'rgba(18, 59, 109, 0.22)' : isNavy ? 'rgba(244, 185, 66, 0.4)' : 'rgba(201, 163, 78, 0.4)',
    borderInner: isLight ? 'rgba(14, 165, 164, 0.35)' : isNavy ? 'rgba(244, 185, 66, 0.2)' : 'rgba(201, 163, 78, 0.2)',
    headerTitle: isLight ? brandNavy : '#FFFFFF',
    headerTagline: isLight ? brandTeal : brandGold,
    badgeBg: isLight ? 'rgba(14, 165, 164, 0.1)' : 'rgba(244, 185, 66, 0.15)',
    badgeBorder: isLight ? 'rgba(14, 165, 164, 0.4)' : 'rgba(244, 185, 66, 0.5)',
    badgeText: isLight ? brandNavy : brandGold,
    qBoxBg: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.05)',
    qBoxBorder: isLight ? 'rgba(18, 59, 109, 0.14)' : 'rgba(255, 255, 255, 0.12)',
    qBoxBar: isLight ? brandGold : brandGold,
    qBoxLabel: isLight ? brandTeal : brandGold,
    qBoxTitle: isLight ? brandNavy : '#FFFFFF',
    qBoxText: isLight ? '#475569' : 'rgba(255, 255, 255, 0.8)',
    ansLabel: isLight ? brandTeal : brandGold,
    ansBody: isLight ? '#1E293B' : 'rgba(255, 255, 255, 0.94)',
    arabicBoxBg: isLight ? '#F7F5EE' : 'rgba(244, 185, 66, 0.08)',
    arabicBoxBorder: isLight ? 'rgba(201, 163, 78, 0.4)' : 'rgba(244, 185, 66, 0.35)',
    arabicText: isLight ? '#063B2F' : '#FDE68A',
    footerDivider: isLight ? 'rgba(18, 59, 109, 0.15)' : 'rgba(244, 185, 66, 0.25)',
    footerBrand: isLight ? brandNavy : brandGold,
    footerLink: isLight ? '#475569' : 'rgba(255, 255, 255, 0.75)',
    footerBadge: isLight ? brandNavy : '#FFFFFF'
  };

  // 1. Draw Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, colors.bgTop);
  bgGrad.addColorStop(1, colors.bgBottom);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle ambient glow
  const ambientGlow = ctx.createRadialGradient(width / 2, 160, 20, width / 2, 160, 480);
  ambientGlow.addColorStop(0, isLight ? 'rgba(14, 165, 164, 0.05)' : 'rgba(244, 185, 66, 0.12)');
  ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = ambientGlow;
  ctx.fillRect(0, 0, width, 550);

  // 2. Editorial Border Frame
  const marginOuter = 36;
  const marginInner = 46;

  ctx.strokeStyle = colors.borderOuter;
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, marginOuter, marginOuter, width - marginOuter * 2, height - marginOuter * 2, 28);
  ctx.stroke();

  ctx.strokeStyle = colors.borderInner;
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, marginInner, marginInner, width - marginInner * 2, height - marginInner * 2, 22);
  ctx.stroke();

  // Corner Diamond Accents
  const drawDiamond = (cx: number, cy: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx + 5, cy);
    ctx.lineTo(cx, cy + 5);
    ctx.lineTo(cx - 5, cy);
    ctx.closePath();
    ctx.fill();
  };
  drawDiamond(marginInner + 2, marginInner + 2, isLight ? goldAntique : brandGold);
  drawDiamond(width - marginInner - 2, marginInner + 2, isLight ? goldAntique : brandGold);
  drawDiamond(marginInner + 2, height - marginInner - 2, isLight ? goldAntique : brandGold);
  drawDiamond(width - marginInner - 2, height - marginInner - 2, isLight ? goldAntique : brandGold);

  // Content Coordinates
  const contentX = 72;
  const contentWidth = width - contentX * 2; // 936px

  let cursorY = 72;

  // 3. HEADER SECTION
  // Official Logo Emblem
  drawOfficialLogoEmblem(
    ctx,
    width / 2,
    cursorY + 22,
    46,
    isLight ? brandNavy : brandGold,
    isLight ? brandGold : '#FFFFFF'
  );
  cursorY += 60;

  // Brand Name
  ctx.fillStyle = colors.headerTitle;
  ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '2px';
  ctx.fillText('DARS WITH OSAMA', width / 2, cursorY);
  ctx.letterSpacing = '0px';
  cursorY += 22;

  // Brand Tagline
  ctx.fillStyle = colors.headerTagline;
  ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
  ctx.letterSpacing = '2.5px';
  ctx.fillText('ILMU • KAJIAN • KITAB', width / 2, cursorY);
  ctx.letterSpacing = '0px';
  cursorY += 26;

  // Category Topic Pill
  const pillText = "📖  TANYA JAWAB & KONSULTASI SYAR'I";
  ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
  const pillMetrics = ctx.measureText(pillText);
  const pillW = pillMetrics.width + 30;
  const pillX = (width - pillW) / 2;

  ctx.fillStyle = colors.badgeBg;
  drawRoundedRect(ctx, pillX, cursorY - 14, pillW, 26, 13);
  ctx.fill();

  ctx.strokeStyle = colors.badgeBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = colors.badgeText;
  ctx.textAlign = 'center';
  ctx.fillText(pillText, width / 2, cursorY + 3);
  cursorY += 32;

  // 4. QUESTION SECTION
  if (!slide.isContinuation) {
    // Slide 1: Full Question Box
    const qBoxY = cursorY;
    ctx.textAlign = 'left';

    // Measure Title lines
    ctx.font = '700 23px "Plus Jakarta Sans", sans-serif';
    const titleLines = wrapTextLines(slide.questionTitle, contentWidth - 48, (s) => ctx.measureText(s).width);
    
    // Measure Excerpt lines (if distinct)
    const hasExcerpt = slide.questionExcerpt && slide.questionExcerpt !== slide.questionTitle;
    ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
    const excerptLines = hasExcerpt
      ? wrapTextLines(slide.questionExcerpt, contentWidth - 48, (s) => ctx.measureText(s).width)
      : [];

    const qBoxHeight = 36 + titleLines.length * 32 + (excerptLines.length > 0 ? excerptLines.length * 26 + 10 : 0) + 16;

    // Background card
    ctx.fillStyle = colors.qBoxBg;
    drawRoundedRect(ctx, contentX, qBoxY, contentWidth, qBoxHeight, 16);
    ctx.fill();

    ctx.strokeStyle = colors.qBoxBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Left Accent Bar (Gold)
    ctx.fillStyle = colors.qBoxBar;
    drawRoundedRect(ctx, contentX, qBoxY, 6, qBoxHeight, 2);
    ctx.fill();

    // Label
    let textY = qBoxY + 24;
    ctx.fillStyle = colors.qBoxLabel;
    ctx.font = '800 12px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('PERTANYAAN:', contentX + 24, textY);
    ctx.letterSpacing = '0px';
    textY += 28;

    // Title
    ctx.fillStyle = colors.qBoxTitle;
    ctx.font = '700 23px "Plus Jakarta Sans", sans-serif';
    for (const tLine of titleLines) {
      ctx.fillText(tLine, contentX + 24, textY);
      textY += 32;
    }

    // Excerpt
    if (excerptLines.length > 0) {
      textY += 4;
      ctx.fillStyle = colors.qBoxText;
      ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
      for (const eLine of excerptLines) {
        ctx.fillText(eLine, contentX + 24, textY);
        textY += 26;
      }
    }

    cursorY = qBoxY + qBoxHeight + 26;
  } else {
    // Continuation Slide: Compact header
    const contBoxY = cursorY;
    const contBoxH = 46;

    ctx.fillStyle = colors.qBoxBg;
    drawRoundedRect(ctx, contentX, contBoxY, contentWidth, contBoxH, 12);
    ctx.fill();

    ctx.strokeStyle = colors.qBoxBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = colors.qBoxBar;
    drawRoundedRect(ctx, contentX, contBoxY, 5, contBoxH, 2);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = colors.qBoxLabel;
    ctx.font = '800 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('LANJUTAN PEMBAHASAN:', contentX + 18, contBoxY + 28);

    ctx.fillStyle = colors.qBoxTitle;
    ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
    const maxTWidth = contentWidth - 250;
    let truncatedTitle = slide.questionTitle;
    while (ctx.measureText(truncatedTitle).width > maxTWidth && truncatedTitle.length > 10) {
      truncatedTitle = truncatedTitle.slice(0, -4) + '...';
    }
    ctx.fillText(truncatedTitle, contentX + 200, contBoxY + 28);

    cursorY = contBoxY + contBoxH + 24;
  }

  // 5. ANSWER SECTION LABEL
  ctx.textAlign = 'left';
  ctx.fillStyle = colors.ansLabel;
  ctx.font = '800 12px "Plus Jakarta Sans", sans-serif';
  ctx.letterSpacing = '1.2px';
  const answerSectionLabel = slide.isContinuation
    ? 'PENJELASAN LANJUTAN & DALIL SYAR\'I:'
    : 'JAWABAN RESMI USTAZ / PEMBIMBING DARS WITH OSAMA:';
  ctx.fillText(answerSectionLabel, contentX, cursorY);
  ctx.letterSpacing = '0px';
  cursorY += 22;

  // 6. RENDER BLOCKS ON THIS SLIDE
  const blocksToRender = slide.blocks && slide.blocks.length > 0
    ? slide.blocks
    : parseContentToBlocks(slide.answerText);

  const maxY = height - 110; // strictly protect footer boundary

  for (const block of blocksToRender) {
    if (cursorY >= maxY) break;

    // A. HEADING BLOCK
    if (block.type === 'heading') {
      ctx.fillStyle = colors.qBoxTitle;
      ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
      const lines = wrapTextLines(block.text, contentWidth, (s) => ctx.measureText(s).width);
      for (const line of lines) {
        if (cursorY + 34 > maxY) break;
        ctx.fillText(line, contentX, cursorY + 24);
        cursorY += 34;
      }
      cursorY += 12;
      continue;
    }

    // B. ARABIC BLOCK (Mushaf Card, Amiri Font, RTL)
    if (block.type === 'arabic' || block.isArabic) {
      const boxW = contentWidth;
      const boxInnerW = boxW - 48;

      ctx.font = 'bold 28px "Amiri", "Noto Sans Arabic", serif';
      const arLines = wrapTextLines(block.text, boxInnerW, (s) => ctx.measureText(s).width);
      const boxH = 40 + arLines.length * 46;

      // Draw Dalil frame
      ctx.fillStyle = colors.arabicBoxBg;
      drawRoundedRect(ctx, contentX, cursorY, boxW, boxH, 16);
      ctx.fill();

      ctx.strokeStyle = colors.arabicBoxBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Right-side accent marker for Arabic
      ctx.fillStyle = isLight ? goldAntique : brandGold;
      drawRoundedRect(ctx, contentX + boxW - 6, cursorY, 6, boxH, 2);
      ctx.fill();

      // Draw Arabic text lines (Right-to-Left)
      ctx.save();
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.fillStyle = colors.arabicText;
      ctx.font = 'bold 28px "Amiri", "Noto Sans Arabic", serif';

      const rightEdgeX = contentX + boxW - 24;
      let lineY = cursorY + 44;

      for (const arLine of arLines) {
        if (lineY > maxY) break;
        ctx.fillText(arLine, rightEdgeX, lineY);
        lineY += 46;
      }
      ctx.restore();

      cursorY += boxH + 20;
      continue;
    }

    // C. LIST ITEM BLOCK
    if (block.type === 'list-item') {
      ctx.fillStyle = colors.ansBody;
      ctx.font = '500 21px "Plus Jakarta Sans", sans-serif';
      const listW = contentWidth - 32;
      const lines = wrapTextLines(block.text, listW, (s) => ctx.measureText(s).width);

      // Bullet dot
      ctx.fillStyle = isLight ? brandTeal : brandGold;
      ctx.beginPath();
      ctx.arc(contentX + 8, cursorY + 12, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = colors.ansBody;
      let lY = cursorY + 18;
      for (const line of lines) {
        if (lY > maxY) break;
        ctx.fillText(line, contentX + 28, lY);
        lY += 32;
      }
      cursorY = lY + 8;
      continue;
    }

    // D. QUOTE BLOCK
    if (block.type === 'quote') {
      ctx.fillStyle = colors.qBoxBg;
      const quoteW = contentWidth;
      const lines = wrapTextLines(block.text, quoteW - 40, (s) => ctx.measureText(s).width);
      const qH = lines.length * 32 + 24;

      drawRoundedRect(ctx, contentX, cursorY, quoteW, qH, 12);
      ctx.fill();

      ctx.fillStyle = isLight ? brandTeal : brandGold;
      drawRoundedRect(ctx, contentX, cursorY, 4, qH, 2);
      ctx.fill();

      ctx.fillStyle = colors.ansBody;
      ctx.font = 'italic 500 21px "Plus Jakarta Sans", sans-serif';
      let qY = cursorY + 22;
      for (const line of lines) {
        if (qY > maxY) break;
        ctx.fillText(line, contentX + 20, qY);
        qY += 32;
      }
      cursorY = qY + 14;
      continue;
    }

    // E. REGULAR PARAGRAPH
    ctx.fillStyle = colors.ansBody;
    ctx.font = '500 21px "Plus Jakarta Sans", sans-serif';
    const lines = wrapTextLines(block.text, contentWidth, (s) => ctx.measureText(s).width);

    let pY = cursorY + 18;
    for (const line of lines) {
      if (pY > maxY) break;
      ctx.fillText(line, contentX, pY);
      pY += 32;
    }
    cursorY = pY + 14;
  }

  // 7. FOOTER SECTION
  const footerY = height - 56;

  // Footer Divider Line
  ctx.strokeStyle = colors.footerDivider;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(contentX, footerY - 26);
  ctx.lineTo(contentX + contentWidth, footerY - 26);
  ctx.stroke();

  // Footer Left: Brand & Direct Website Callout
  ctx.textAlign = 'left';
  ctx.fillStyle = colors.footerBrand;
  ctx.font = '800 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Dars with Osama', contentX, footerY);

  ctx.fillStyle = colors.footerLink;
  ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`•  ${siteUrl}  •  Baca pembahasan lengkap & dalil`, contentX + 130, footerY);

  // Footer Right: Slide Page Counter (e.g. "Halaman 1 dari 3" or "1/3")
  ctx.textAlign = 'right';
  ctx.fillStyle = colors.footerBadge;
  ctx.font = '800 13px "Plus Jakarta Sans", sans-serif';
  const pageCounterText = slide.totalPages > 1
    ? `Halaman ${slide.pageNumber} / ${slide.totalPages}`
    : 'Arsip Tanya Jawab Syar\'i';
  ctx.fillText(pageCounterText, contentX + contentWidth, footerY);

  return canvas;
}

/**
 * Converts HTML5 Canvas to a PNG Blob
 */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Gagal mengekspor file gambar dari canvas.'));
    }, 'image/png');
  });
}

/**
 * Downloads Canvas as a PNG file directly in the browser
 */
export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string) {
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
