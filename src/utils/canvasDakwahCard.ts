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

    // Check for reference / source block
    const isReference = /^(sumber|referensi|maraji['’]?|rujukan|kitab)\s*[:\-]/i.test(cleanText);
    if (isReference) {
      blocks.push({
        id: `b-${blockIdCounter++}`,
        type: 'reference',
        text: cleanText,
        isArabic: false
      });
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

  // Default character measurement fallback for Node tests (~16px per char for 32px font)
  const measure = measureFn || ((str: string) => str.length * 16.5);

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
 * Target Font Sizes for 1080x1350 Canvas:
 * - Heading in answer: 36px (target 34-38px)
 * - Arabic quote: 44px (target 40-48px)
 * - Answer body / list item: 32px (target 30-34px)
 * - Quote: 30px
 * - Reference: 26px (target 24-28px)
 */
export function calculateBlockHeight(
  block: RenderableBlock,
  contentWidth: number,
  measureFn?: (text: string, font: string) => number
): { height: number; lines: string[] } {
  if (block.type === 'heading') {
    const font = '700 32px "Plus Jakarta Sans", sans-serif';
    const lines = wrapTextLines(block.text, contentWidth, (s) => (measureFn ? measureFn(s, font) : s.length * 17));
    const height = lines.length * 46 + 18;
    return { height, lines };
  }

  if (block.type === 'arabic') {
    const font = 'bold 42px "Amiri", "Noto Sans Arabic", serif';
    // Arabic box has inner padding (24px left + 24px right = 48px)
    const boxInnerWidth = contentWidth - 48;
    const lines = wrapTextLines(block.text, boxInnerWidth, (s) => (measureFn ? measureFn(s, font) : s.length * 21));
    // 68px line-height for harakat clearance + 40px vertical padding + 20px margin
    const height = lines.length * 68 + 40 + 20;
    return { height, lines };
  }

  if (block.type === 'list-item') {
    const font = '500 30px "Plus Jakarta Sans", sans-serif';
    const listInnerWidth = contentWidth - 38; // indent for bullet
    const lines = wrapTextLines(block.text, listInnerWidth, (s) => (measureFn ? measureFn(s, font) : s.length * 15.5));
    const height = lines.length * 44 + 12;
    return { height, lines };
  }

  if (block.type === 'quote') {
    const font = 'italic 500 28px "Plus Jakarta Sans", sans-serif';
    const quoteInnerWidth = contentWidth - 40;
    const lines = wrapTextLines(block.text, quoteInnerWidth, (s) => (measureFn ? measureFn(s, font) : s.length * 14.5));
    const height = lines.length * 42 + 22;
    return { height, lines };
  }

  if (block.type === 'reference') {
    const font = '500 24px "Plus Jakarta Sans", sans-serif';
    const lines = wrapTextLines(block.text, contentWidth - 32, (s) => (measureFn ? measureFn(s, font) : s.length * 12.5));
    const height = lines.length * 36 + 14;
    return { height, lines };
  }

  // Regular paragraph (500 30px)
  const font = '500 30px "Plus Jakarta Sans", sans-serif';
  const lines = wrapTextLines(block.text, contentWidth, (s) => (measureFn ? measureFn(s, font) : s.length * 15.5));
  const height = lines.length * 44 + 18;
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
    if (currentText.length + sentence.length > 220 && currentText.trim()) {
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
  const contentWidth = 952; // 1080 - 128px margins

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
    if (height > 380) {
      normalizedBlocks.push(...splitBlockIntoSentenceChunks(block));
    } else {
      normalizedBlocks.push(block);
    }
  }

  // Calculate Question Box Height for Slide 1
  const cleanQ = stripHtml(question);
  const qTitleLines = wrapTextLines(title, contentWidth - 48, (s) => s.length * 19);
  const qBodyLines = cleanQ && cleanQ !== title ? wrapTextLines(cleanQ.slice(0, 160) + (cleanQ.length > 160 ? '...' : ''), contentWidth - 48, (s) => s.length * 15.5) : [];
  const qBoxHeight = 32 + qTitleLines.length * 46 + (qBodyLines.length > 0 ? qBodyLines.length * 40 + 10 : 0) + 14;

  // Header & Footer dimensions (compacted to grant maximum vertical space to answer content)
  const headerHeightSlide1 = 76;
  const headerHeightContinuation = 44;
  const footerHeight = 58;
  const answerLabelHeight = 28;

  // Available vertical budget for answers with comfortable editorial breathing room
  const budgetSlide1 = Math.max(400, Math.min(canvasHeight - headerHeightSlide1 - qBoxHeight - answerLabelHeight - footerHeight - 30, ratio === '4:5' ? 1040 : 720));
  const budgetContinuation = Math.max(500, Math.min(canvasHeight - headerHeightContinuation - answerLabelHeight - footerHeight - 30, ratio === '4:5' ? 1160 : 880));

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

  // Social media carousel safety cap: up to 10 slides
  const MAX_SLIDES = 10;
  let finalPages = pages;
  if (pages.length > MAX_SLIDES) {
    const cappedPages = pages.slice(0, MAX_SLIDES - 1);
    // Combine remaining summary on the final slide
    const finalSlideBlocks = pages[MAX_SLIDES - 1].slice(0, 2);
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
      document.fonts.load('bold 44px "Amiri"'),
      document.fonts.load('400 36px "Amiri"'),
      document.fonts.load('800 28px "Plus Jakarta Sans"'),
      document.fonts.load('700 44px "Plus Jakarta Sans"'),
      document.fonts.load('700 36px "Plus Jakarta Sans"'),
      document.fonts.load('500 34px "Plus Jakarta Sans"'),
      document.fonts.load('500 32px "Plus Jakarta Sans"'),
      document.fonts.load('500 26px "Plus Jakarta Sans"'),
      document.fonts.load('800 24px "Plus Jakarta Sans"'),
      document.fonts.load('600 22px "Plus Jakarta Sans"')
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
    qBoxText: isLight ? '#334155' : 'rgba(255, 255, 255, 0.88)',
    ansLabel: isLight ? brandTeal : brandGold,
    ansBody: isLight ? '#0F172A' : 'rgba(255, 255, 255, 0.96)',
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
  const ambientGlow = ctx.createRadialGradient(width / 2, 140, 20, width / 2, 140, 480);
  ambientGlow.addColorStop(0, isLight ? 'rgba(14, 165, 164, 0.05)' : 'rgba(244, 185, 66, 0.12)');
  ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = ambientGlow;
  ctx.fillRect(0, 0, width, 550);

  // 2. Editorial Border Frame
  // 2. Editorial Border Frame (Clean single border, no stacked frames or corner diamond clutter)
  const marginOuter = 36;
  ctx.strokeStyle = colors.borderOuter;
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, marginOuter, marginOuter, width - marginOuter * 2, height - marginOuter * 2, 22);
  ctx.stroke();

  // Content Coordinates with generous padding
  const contentX = 64;
  const contentWidth = width - contentX * 2; // 952px

  let cursorY = 54;

  // 3. HEADER SECTION (Balanced, Giving Primary Room to Answer Content)
  if (!slide.isContinuation) {
    // Slide 1: Refined Editorial Header with Brand Identity
    drawOfficialLogoEmblem(
      ctx,
      width / 2,
      cursorY + 14,
      30,
      isLight ? brandNavy : brandGold,
      isLight ? brandGold : '#FFFFFF'
    );
    cursorY += 36;

    // Brand Name (24px bold)
    ctx.fillStyle = colors.headerTitle;
    ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '2px';
    ctx.fillText('DARS WITH OSAMA', width / 2, cursorY);
    ctx.letterSpacing = '0px';
    cursorY += 20;

    // Subtitle & Topic Pill (Unified, 12px)
    const pillText = "ILMU • KAJIAN • KITAB   |   TANYA JAWAB & KONSULTASI SYAR'I";
    ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
    const pillMetrics = ctx.measureText(pillText);
    const pillW = pillMetrics.width + 26;
    const pillX = (width - pillW) / 2;

    ctx.fillStyle = colors.badgeBg;
    drawRoundedRect(ctx, pillX, cursorY - 12, pillW, 24, 12);
    ctx.fill();

    ctx.strokeStyle = colors.badgeBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = colors.badgeText;
    ctx.textAlign = 'center';
    ctx.fillText(pillText, width / 2, cursorY + 4);
    cursorY += 24;
  } else {
    // Continuation Slide: Minimal Space-Saving Header Bar (~38px)
    drawOfficialLogoEmblem(
      ctx,
      contentX + 14,
      cursorY + 10,
      24,
      isLight ? brandNavy : brandGold,
      isLight ? brandGold : '#FFFFFF'
    );

    ctx.textAlign = 'left';
    ctx.fillStyle = colors.headerTitle;
    ctx.font = '800 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('DARS WITH OSAMA', contentX + 34, cursorY + 16);

    const pillCont = 'LANJUTAN PEMBAHASAN';
    ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
    const pW = ctx.measureText(pillCont).width + 18;
    const pX = contentX + contentWidth - pW;

    ctx.fillStyle = colors.badgeBg;
    drawRoundedRect(ctx, pX, cursorY, pW, 22, 11);
    ctx.fill();

    ctx.strokeStyle = colors.badgeBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = colors.badgeText;
    ctx.textAlign = 'center';
    ctx.fillText(pillCont, pX + pW / 2, cursorY + 15);

    cursorY += 34;
  }

  // 4. QUESTION SECTION
  if (!slide.isContinuation) {
    // Slide 1: Balanced Question Box (Judul: 34px, Teks: 26px)
    const qBoxY = cursorY;
    ctx.textAlign = 'left';

    ctx.font = '700 34px "Plus Jakarta Sans", sans-serif';
    const titleLines = wrapTextLines(slide.questionTitle, contentWidth - 48, (s) => ctx.measureText(s).width);
    
    const hasExcerpt = slide.questionExcerpt && slide.questionExcerpt !== slide.questionTitle;
    ctx.font = '500 26px "Plus Jakarta Sans", sans-serif';
    const excerptLines = hasExcerpt
      ? wrapTextLines(slide.questionExcerpt.slice(0, 160) + (slide.questionExcerpt.length > 160 ? '...' : ''), contentWidth - 48, (s) => ctx.measureText(s).width)
      : [];

    const qBoxHeight = 28 + titleLines.length * 46 + (excerptLines.length > 0 ? excerptLines.length * 38 + 10 : 0) + 14;

    // Background card
    ctx.fillStyle = colors.qBoxBg;
    drawRoundedRect(ctx, contentX, qBoxY, contentWidth, qBoxHeight, 14);
    ctx.fill();

    ctx.strokeStyle = colors.qBoxBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Left Accent Bar (Gold 5px)
    ctx.fillStyle = colors.qBoxBar;
    drawRoundedRect(ctx, contentX, qBoxY, 5, qBoxHeight, 2);
    ctx.fill();

    // Topik / Kategori Label
    let textY = qBoxY + 22;
    ctx.fillStyle = colors.qBoxLabel;
    ctx.font = '800 12px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = '1.2px';
    ctx.fillText('TOPIK / PERTANYAAN:', contentX + 22, textY);
    ctx.letterSpacing = '0px';
    textY += 30;

    // Title (34px)
    ctx.fillStyle = colors.qBoxTitle;
    ctx.font = '700 34px "Plus Jakarta Sans", sans-serif';
    for (const tLine of titleLines) {
      ctx.fillText(tLine, contentX + 22, textY);
      textY += 46;
    }

    // Excerpt (26px)
    if (excerptLines.length > 0) {
      textY += 4;
      ctx.fillStyle = colors.qBoxText;
      ctx.font = '500 26px "Plus Jakarta Sans", sans-serif';
      for (const eLine of excerptLines) {
        ctx.fillText(eLine, contentX + 22, textY);
        textY += 38;
      }
    }

    cursorY = qBoxY + qBoxHeight + 18;
  } else {
    // Continuation Slide: Sleek Topic Bar
    const contBoxY = cursorY;
    const contBoxH = 42;

    ctx.fillStyle = colors.qBoxBg;
    drawRoundedRect(ctx, contentX, contBoxY, contentWidth, contBoxH, 10);
    ctx.fill();

    ctx.strokeStyle = colors.qBoxBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = colors.qBoxBar;
    drawRoundedRect(ctx, contentX, contBoxY, 4, contBoxH, 2);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = colors.qBoxLabel;
    ctx.font = '800 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('TOPIK:', contentX + 16, contBoxY + 26);

    ctx.fillStyle = colors.qBoxTitle;
    ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
    const maxTWidth = contentWidth - 140;
    let truncatedTitle = slide.questionTitle;
    while (ctx.measureText(truncatedTitle).width > maxTWidth && truncatedTitle.length > 10) {
      truncatedTitle = truncatedTitle.slice(0, -4) + '...';
    }
    ctx.fillText(truncatedTitle, contentX + 80, contBoxY + 27);

    cursorY = contBoxY + contBoxH + 18;
  }

  // 5. ANSWER SECTION LABEL
  ctx.textAlign = 'left';
  ctx.fillStyle = colors.ansLabel;
  ctx.font = '800 13px "Plus Jakarta Sans", sans-serif';
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

  // Strictly protect footer boundary
  const maxY = height - 74;

  for (const block of blocksToRender) {
    if (cursorY >= maxY) break;

    // A. HEADING BLOCK (32px)
    if (block.type === 'heading') {
      ctx.fillStyle = colors.qBoxTitle;
      ctx.font = '700 32px "Plus Jakarta Sans", sans-serif';
      const lines = wrapTextLines(block.text, contentWidth, (s) => ctx.measureText(s).width);
      for (const line of lines) {
        if (cursorY + 46 > maxY) break;
        ctx.fillText(line, contentX, cursorY + 32);
        cursorY += 46;
      }
      cursorY += 12;
      continue;
    }

    // B. ARABIC BLOCK (42px Amiri Font, RTL)
    if (block.type === 'arabic' || block.isArabic) {
      const boxW = contentWidth;
      const boxInnerW = boxW - 48;

      ctx.font = 'bold 42px "Amiri", "Noto Sans Arabic", serif';
      const arLines = wrapTextLines(block.text, boxInnerW, (s) => ctx.measureText(s).width);
      const boxH = 38 + arLines.length * 68;

      // Draw Dalil frame
      ctx.fillStyle = colors.arabicBoxBg;
      drawRoundedRect(ctx, contentX, cursorY, boxW, boxH, 14);
      ctx.fill();

      ctx.strokeStyle = colors.arabicBoxBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Right-side accent marker for Arabic (Gold 5px)
      ctx.fillStyle = isLight ? goldAntique : brandGold;
      drawRoundedRect(ctx, contentX + boxW - 5, cursorY, 5, boxH, 2);
      ctx.fill();

      // Draw Arabic text lines (Right-to-Left, 42px font, 68px line-height for harakat)
      ctx.save();
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.fillStyle = colors.arabicText;
      ctx.font = 'bold 42px "Amiri", "Noto Sans Arabic", serif';

      const rightEdgeX = contentX + boxW - 24;
      let lineY = cursorY + 54;

      for (const arLine of arLines) {
        if (lineY > maxY) break;
        ctx.fillText(arLine, rightEdgeX, lineY);
        lineY += 68;
      }
      ctx.restore();

      cursorY += boxH + 18;
      continue;
    }

    // C. LIST ITEM BLOCK (30px)
    if (block.type === 'list-item') {
      ctx.fillStyle = colors.ansBody;
      ctx.font = '500 30px "Plus Jakarta Sans", sans-serif';
      const listW = contentWidth - 38;
      const lines = wrapTextLines(block.text, listW, (s) => ctx.measureText(s).width);

      // Bullet dot (Radius 4.5px)
      ctx.fillStyle = isLight ? brandTeal : brandGold;
      ctx.beginPath();
      ctx.arc(contentX + 10, cursorY + 16, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = colors.ansBody;
      let lY = cursorY + 26;
      for (const line of lines) {
        if (lY > maxY) break;
        ctx.fillText(line, contentX + 34, lY);
        lY += 44;
      }
      cursorY = lY + 8;
      continue;
    }

    // D. QUOTE BLOCK (28px)
    if (block.type === 'quote') {
      ctx.fillStyle = colors.qBoxBg;
      const quoteW = contentWidth;
      const lines = wrapTextLines(block.text, quoteW - 40, (s) => ctx.measureText(s).width);
      const qH = lines.length * 42 + 24;

      drawRoundedRect(ctx, contentX, cursorY, quoteW, qH, 12);
      ctx.fill();

      ctx.fillStyle = isLight ? brandTeal : brandGold;
      drawRoundedRect(ctx, contentX, cursorY, 4, qH, 2);
      ctx.fill();

      ctx.fillStyle = colors.ansBody;
      ctx.font = 'italic 500 28px "Plus Jakarta Sans", sans-serif';
      let qY = cursorY + 30;
      for (const line of lines) {
        if (qY > maxY) break;
        ctx.fillText(line, contentX + 22, qY);
        qY += 42;
      }
      cursorY = qY + 12;
      continue;
    }

    // E. REFERENCE / SUMBER BLOCK (24px)
    if (block.type === 'reference') {
      ctx.fillStyle = isLight ? '#64748B' : 'rgba(255, 255, 255, 0.72)';
      ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
      const lines = wrapTextLines(block.text, contentWidth - 32, (s) => ctx.measureText(s).width);

      let rY = cursorY + 22;
      for (const line of lines) {
        if (rY > maxY) break;
        ctx.fillText(line, contentX + 8, rY);
        rY += 36;
      }
      cursorY = rY + 10;
      continue;
    }

    // F. REGULAR PARAGRAPH (30px)
    ctx.fillStyle = colors.ansBody;
    ctx.font = '500 30px "Plus Jakarta Sans", sans-serif';
    const lines = wrapTextLines(block.text, contentWidth, (s) => ctx.measureText(s).width);

    let pY = cursorY + 26;
    for (const line of lines) {
      if (pY > maxY) break;
      ctx.fillText(line, contentX, pY);
      pY += 44;
    }
    cursorY = pY + 14;
  }

  // 7. FOOTER SECTION
  const footerY = height - 44;

  // Footer Divider Line
  ctx.strokeStyle = colors.footerDivider;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(contentX, footerY - 24);
  ctx.lineTo(contentX + contentWidth, footerY - 24);
  ctx.stroke();

  // Footer Left: Brand (20px)
  ctx.textAlign = 'left';
  ctx.fillStyle = colors.footerBrand;
  ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Dars with Osama', contentX, footerY);

  // Footer Center: Website & Callout (18px)
  ctx.fillStyle = colors.footerLink;
  ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`•  ${siteUrl}  •  Baca fatwa & kajian lengkap`, contentX + 200, footerY);

  // Footer Right: Slide Page Counter (19px)
  ctx.textAlign = 'right';
  ctx.fillStyle = colors.footerBadge;
  ctx.font = '700 19px "Plus Jakarta Sans", sans-serif';
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
