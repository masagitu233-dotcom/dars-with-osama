import { BlogPost } from '../types';
import { normalizeTextForSpeech } from './articleAudioHelper';
import { autoWrapArabicText, isPureArabicText } from './arabicFontHelper';

export interface ArticleSpokenWord {
  wordId: string;
  wordIndex: number;
  text: string;
  spokenText: string;
  charStart: number;
  charEnd: number;
}

export interface ArticleSpokenSentence {
  sentenceId: string;
  sentenceIndex: number;
  text: string;
  spokenText: string;
  lang: 'id-ID' | 'ar-SA';
  words: ArticleSpokenWord[];
  elementId?: string;
  isTitle?: boolean;
  isExcerpt?: boolean;
  isArabicSection?: boolean;
  startWordIndex?: number;
  endWordIndex?: number;
}

export interface PreparedArticleSpeech {
  preparedTitleHtml: string;
  preparedTitleArHtml?: string;
  preparedExcerptHtml: string;
  preparedBodyHtml: string;
  preparedContentArHtml?: string;
  sentences: ArticleSpokenSentence[];
  totalWords: number;
}

/**
 * Splits plain text into words while keeping trailing whitespace intact.
 */
export function tokenizeWords(text: string): Array<{ word: string; trailingSpace: string }> {
  if (!text) return [];
  const tokens: Array<{ word: string; trailingSpace: string }> = [];
  const regex = /(\S+)(\s*)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      word: match[1],
      trailingSpace: match[2]
    });
  }
  return tokens;
}

/**
 * Checks if a word is an abbreviation that ends with a dot but should NOT terminate a sentence.
 */
export function isAbbreviation(word: string): boolean {
  const clean = word.toLowerCase().replace(/^[("«'‘]+|[)"»'’,;:!?]+$/g, '');
  const abbreviations = new Set([
    'dr.', 'prof.', 'ust.', 'ustadz.', 'kyai.', 'h.', 'hj.', 'no.', 'hlm.', 'hal.',
    'dll.', 'dsb.', 'dst.', 'tsb.', 'yaitu.', 'yakni.', 'eg.', 'e.g.', 'ie.', 'i.e.',
    'q.s.', 'qs.', 'h.r.', 'hr.', 'al.', 'ibn.', 'bin.', 'bint.'
  ]);
  return abbreviations.has(clean) || /^\d+\.$/.test(clean);
}

/**
 * Checks if a word ends with a sentence-terminating punctuation.
 */
export function isSentenceEnd(word: string): boolean {
  if (isAbbreviation(word)) return false;
  return /[.!?؟]$/.test(word.trim());
}

/**
 * Builds speech segment tokens for text-to-speech synthesis and auto-scroll tracking.
 */
export function buildSpokenSentence(
  sentenceId: string,
  sentenceIndex: number,
  wordTokens: Array<{ wordId: string; wordIndex: number; text: string }>,
  options?: { isTitle?: boolean; isExcerpt?: boolean; isArabicSection?: boolean; elementId?: string }
): ArticleSpokenSentence {
  const rawSentenceText = wordTokens.map(w => w.text).join(' ');
  const isArabic = options?.isArabicSection || isPureArabicText(rawSentenceText);
  const lang: 'id-ID' | 'ar-SA' = isArabic ? 'ar-SA' : 'id-ID';

  let runningSpokenText = '';
  const spokenWords: ArticleSpokenWord[] = [];

  for (let i = 0; i < wordTokens.length; i++) {
    const wt = wordTokens[i];
    let spokenWord = isArabic ? wt.text : normalizeTextForSpeech(wt.text);
    if (!spokenWord || !spokenWord.trim()) {
      spokenWord = wt.text;
    }

    if (i > 0) {
      runningSpokenText += ' ';
    }
    const charStart = runningSpokenText.length;
    runningSpokenText += spokenWord;
    const charEnd = runningSpokenText.length;

    spokenWords.push({
      wordId: wt.wordId,
      wordIndex: wt.wordIndex,
      text: wt.text,
      spokenText: spokenWord,
      charStart,
      charEnd
    });
  }

  const startWordIdx = spokenWords.length > 0 ? spokenWords[0].wordIndex : 0;
  const endWordIdx = spokenWords.length > 0 ? spokenWords[spokenWords.length - 1].wordIndex : 0;

  return {
    sentenceId,
    sentenceIndex,
    text: rawSentenceText,
    spokenText: runningSpokenText || rawSentenceText,
    lang,
    words: spokenWords,
    elementId: options?.elementId,
    isTitle: options?.isTitle,
    isExcerpt: options?.isExcerpt,
    isArabicSection: options?.isArabicSection,
    startWordIndex: startWordIdx,
    endWordIndex: endWordIdx
  };
}

/**
 * Finds the corresponding spoken word by charIndex.
 */
export function findSpokenWordByCharIndex(
  words: ArticleSpokenWord[],
  charIndex: number
): ArticleSpokenWord | null {
  if (!words || words.length === 0) return null;
  if (charIndex <= 0) return words[0];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (charIndex >= w.charStart && charIndex < w.charEnd) {
      return w;
    }
  }

  for (let i = words.length - 1; i >= 0; i--) {
    if (charIndex >= words[i].charStart) {
      return words[i];
    }
  }

  return words[0];
}

/**
 * Finds the corresponding sentence and word for a given progress ratio (0 to 1).
 */
export function findSentenceByProgressRatio(
  sentences: ArticleSpokenSentence[],
  progressRatio: number
): { sentence: ArticleSpokenSentence; sentenceIndex: number; activeWord?: ArticleSpokenWord } | null {
  if (!sentences || sentences.length === 0) return null;

  const clamped = Math.max(0, Math.min(1, progressRatio));
  const totalWords = sentences.reduce((sum, s) => sum + s.words.length, 0);
  if (totalWords === 0) {
    return { sentence: sentences[0], sentenceIndex: 0 };
  }

  const targetWordGlobal = Math.min(totalWords - 1, Math.floor(clamped * totalWords));

  let accumulated = 0;
  for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
    const s = sentences[sIdx];
    const sentenceWordCount = s.words.length;
    if (accumulated + sentenceWordCount > targetWordGlobal || sIdx === sentences.length - 1) {
      const wordOffsetInsideSentence = targetWordGlobal - accumulated;
      const activeWord = s.words[Math.max(0, Math.min(sentenceWordCount - 1, wordOffsetInsideSentence))];
      return {
        sentence: s,
        sentenceIndex: sIdx,
        activeWord
      };
    }
    accumulated += sentenceWordCount;
  }

  return { sentence: sentences[0], sentenceIndex: 0 };
}

/**
 * Prepares article speech narration segments without polluting the visual DOM with highlight tags.
 * Preserves the pristine original HTML, image containers, styling, and Arabic typography.
 */
export function prepareArticleSpeechContent(
  title: string,
  excerpt: string,
  bodyHtml: string,
  options?: {
    titleAr?: string;
    contentArHtml?: string;
    includeHeader?: boolean;
  }
): PreparedArticleSpeech {
  const includeHeader = Boolean(options?.includeHeader);
  let globalSentenceIdx = 0;
  let globalWordIdx = 0;
  const allSentences: ArticleSpokenSentence[] = [];

  // 1. Process Title & Excerpt if explicitly requested (default is false)
  if (includeHeader) {
    if (title && title.trim()) {
      const tokens = tokenizeWords(title);
      if (tokens.length > 0) {
        const wordList = tokens.map(t => ({
          wordId: `dars-w-${globalWordIdx++}`,
          wordIndex: globalWordIdx - 1,
          text: t.word
        }));
        allSentences.push(
          buildSpokenSentence(`dars-s-${globalSentenceIdx++}`, globalSentenceIdx - 1, wordList, {
            isTitle: true
          })
        );
      }
    }

    if (options?.titleAr && options.titleAr.trim()) {
      const tokens = tokenizeWords(options.titleAr.trim());
      if (tokens.length > 0) {
        const wordList = tokens.map(t => ({
          wordId: `dars-w-${globalWordIdx++}`,
          wordIndex: globalWordIdx - 1,
          text: t.word
        }));
        allSentences.push(
          buildSpokenSentence(`dars-s-${globalSentenceIdx++}`, globalSentenceIdx - 1, wordList, {
            isArabicSection: true
          })
        );
      }
    }

    if (excerpt && excerpt.trim()) {
      const tokens = tokenizeWords(excerpt);
      let curList: Array<{ wordId: string; wordIndex: number; text: string }> = [];
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        curList.push({
          wordId: `dars-w-${globalWordIdx++}`,
          wordIndex: globalWordIdx - 1,
          text: t.word
        });
        if (isSentenceEnd(t.word) || i === tokens.length - 1) {
          allSentences.push(
            buildSpokenSentence(`dars-s-${globalSentenceIdx++}`, globalSentenceIdx - 1, curList, {
              isExcerpt: true
            })
          );
          curList = [];
        }
      }
    }
  }

  // 2. Extract speech segments from article body without altering visual DOM
  if (bodyHtml) {
    const blockRegex = /<(p|h[1-6]|li|blockquote|td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let match: RegExpExecArray | null;
    let hasBlocks = false;

    while ((match = blockRegex.exec(bodyHtml)) !== null) {
      hasBlocks = true;
      const innerHtml = match[2];
      const textOnly = innerHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const tokens = tokenizeWords(textOnly);
      if (tokens.length === 0) continue;

      let curList: Array<{ wordId: string; wordIndex: number; text: string }> = [];
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        curList.push({
          wordId: `dars-w-${globalWordIdx++}`,
          wordIndex: globalWordIdx - 1,
          text: t.word
        });

        if (isSentenceEnd(t.word) || i === tokens.length - 1) {
          allSentences.push(
            buildSpokenSentence(`dars-s-${globalSentenceIdx++}`, globalSentenceIdx - 1, curList)
          );
          curList = [];
        }
      }
    }

    if (!hasBlocks) {
      const rawText = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const tokens = tokenizeWords(rawText);
      let curList: Array<{ wordId: string; wordIndex: number; text: string }> = [];
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        curList.push({
          wordId: `dars-w-${globalWordIdx++}`,
          wordIndex: globalWordIdx - 1,
          text: t.word
        });
        if (isSentenceEnd(t.word) || i === tokens.length - 1) {
          allSentences.push(
            buildSpokenSentence(`dars-s-${globalSentenceIdx++}`, globalSentenceIdx - 1, curList)
          );
          curList = [];
        }
      }
    }
  }

  // 3. Extract Arabic content section if present
  if (options?.contentArHtml && options.contentArHtml.trim()) {
    const arRaw = options.contentArHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const tokens = tokenizeWords(arRaw);
    let curList: Array<{ wordId: string; wordIndex: number; text: string }> = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      curList.push({
        wordId: `dars-w-${globalWordIdx++}`,
        wordIndex: globalWordIdx - 1,
        text: t.word
      });
      if (isSentenceEnd(t.word) || i === tokens.length - 1) {
        allSentences.push(
          buildSpokenSentence(`dars-s-${globalSentenceIdx++}`, globalSentenceIdx - 1, curList, {
            isArabicSection: true
          })
        );
        curList = [];
      }
    }
  }

  return {
    preparedTitleHtml: autoWrapArabicText(title || ''),
    preparedTitleArHtml: options?.titleAr ? autoWrapArabicText(options.titleAr) : undefined,
    preparedExcerptHtml: autoWrapArabicText(excerpt || ''),
    preparedBodyHtml: autoWrapArabicText(bodyHtml || ''),
    preparedContentArHtml: options?.contentArHtml ? autoWrapArabicText(options.contentArHtml) : undefined,
    sentences: allSentences,
    totalWords: globalWordIdx
  };
}

/**
 * Text highlight is fully disabled per user request.
 * Maintained as a safe no-op to ensure backward compatibility.
 */
export function applyActiveReadingHighlight(
  _sentenceIndex: number,
  _wordIndex: number | null | undefined
): void {
  // Highlights completely removed. No visual styles applied to DOM elements.
}

/**
 * Clears any residual highlights if present in the document.
 */
export function clearAllReadingHighlights(): void {
  if (typeof document === 'undefined') return;
  const legacyActive = document.querySelectorAll('.dars-sentence-active, .dars-word-active');
  legacyActive.forEach((el) => {
    el.classList.remove('dars-sentence-active', 'dars-word-active');
  });
}

/**
 * Local storage key for saving reader's preferred auto-scroll speed without touching Firebase.
 */
export const AUTO_SCROLL_SPEED_STORAGE_KEY = 'dars_article_autoscroll_speed';

/**
 * Retrieves the saved auto-scroll speed from localStorage or defaults to 1.0 (normal).
 */
export function getSavedAutoScrollSpeed(): number {
  try {
    const storage =
      typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : typeof localStorage !== 'undefined'
        ? localStorage
        : null;
    if (!storage) return 1.0;
    const raw = storage.getItem(AUTO_SCROLL_SPEED_STORAGE_KEY);
    if (!raw) return 1.0;
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed) && parsed >= 0.4 && parsed <= 2.5) {
      return parsed;
    }
  } catch {}
  return 1.0;
}

/**
 * Persists the auto-scroll speed multiplier to localStorage locally.
 */
export function saveAutoScrollSpeed(speed: number): void {
  try {
    const storage =
      typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : typeof localStorage !== 'undefined'
        ? localStorage
        : null;
    if (!storage) return;
    const clamped = Math.max(0.5, Math.min(2.0, speed));
    storage.setItem(AUTO_SCROLL_SPEED_STORAGE_KEY, String(clamped));
  } catch {}
}

/**
 * Returns human-readable label for the selected auto-scroll speed.
 */
export function getAutoScrollSpeedLabel(speed: number): string {
  const formatted = speed % 1 === 0 ? speed.toFixed(1) : speed.toString();
  if (speed <= 0.55) return `${formatted}× (Sangat Lambat)`;
  if (speed <= 0.85) return `${formatted}× (Santai)`;
  if (speed <= 1.15) return `${formatted}× (Normal)`;
  if (speed <= 1.35) return `${formatted}× (Cepat)`;
  if (speed <= 1.75) return `${formatted}× (Sangat Cepat)`;
  return `${formatted}× (Maksimal)`;
}

/**
 * High-performance continuous auto-scroller powered by requestAnimationFrame.
 * Features time-delta (performance.now()) frame-rate independence, sub-pixel precision,
 * zero-jump pause/resume, and user scroll deferral.
 */
export class DynamicArticleAutoScroller {
  private rafId: number | null = null;
  private targetY: number | null = null;
  private currentVirtualY: number | null = null;
  private speedMultiplier = 1.0;
  private isRunning = false;
  private isSuspendedByUser = false;
  private lastTimestamp: number | null = null;

  constructor(initialSpeed = 1.0) {
    this.speedMultiplier = initialSpeed;
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange, { passive: true });
    }
  }

  private handleVisibilityChange = (): void => {
    if (typeof document !== 'undefined' && document.hidden) {
      if (this.rafId !== null) {
        if (typeof cancelAnimationFrame !== 'undefined') {
          cancelAnimationFrame(this.rafId);
        }
        this.rafId = null;
      }
      this.lastTimestamp = null;
    } else if (this.isRunning && !this.isSuspendedByUser) {
      this.scheduleFrame();
    }
  };

  public setSpeed(multiplier: number): void {
    this.speedMultiplier = Math.max(0.4, Math.min(2.5, multiplier));
  }

  public getSpeed(): number {
    return this.speedMultiplier;
  }

  public setTargetY(targetY: number | null, forceImmediate = false): void {
    this.targetY = targetY;
    if (forceImmediate || this.currentVirtualY === null) {
      if (typeof window !== 'undefined') {
        const actualY = window.pageYOffset || document.documentElement?.scrollTop || 0;
        this.currentVirtualY = targetY !== null ? targetY : actualY;
      }
    }
    if (this.isRunning && !this.isSuspendedByUser && this.rafId === null) {
      this.scheduleFrame();
    }
  }

  public start(initialTargetY: number | null, speedMultiplier?: number): void {
    if (speedMultiplier !== undefined) {
      this.setSpeed(speedMultiplier);
    }
    if (typeof window !== 'undefined') {
      const actualY = window.pageYOffset || document.documentElement?.scrollTop || 0;
      this.currentVirtualY = initialTargetY !== null ? initialTargetY : actualY;
    }
    this.targetY = initialTargetY;
    this.isRunning = true;
    this.isSuspendedByUser = false;
    this.lastTimestamp = null;
    this.scheduleFrame();
  }

  public pause(): void {
    this.isRunning = false;
    this.lastTimestamp = null;
    if (this.rafId !== null) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.rafId);
      }
      this.rafId = null;
    }
  }

  public resume(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isSuspendedByUser = false;
    this.lastTimestamp = null;
    if (typeof window !== 'undefined') {
      const actualY = window.pageYOffset || document.documentElement?.scrollTop || 0;
      this.currentVirtualY = actualY;
    }
    this.scheduleFrame();
  }

  public stop(): void {
    this.pause();
    this.targetY = null;
    this.currentVirtualY = null;
    this.isSuspendedByUser = false;
  }

  public setUserSuspended(suspended: boolean): void {
    this.isSuspendedByUser = suspended;
    if (suspended) {
      if (this.rafId !== null) {
        if (typeof cancelAnimationFrame !== 'undefined') {
          cancelAnimationFrame(this.rafId);
        }
        this.rafId = null;
      }
      this.lastTimestamp = null;
    } else if (this.isRunning && this.rafId === null) {
      this.lastTimestamp = null;
      if (typeof window !== 'undefined') {
        this.currentVirtualY = window.pageYOffset || document.documentElement?.scrollTop || 0;
      }
      this.scheduleFrame();
    }
  }

  public getIsRunning(): boolean {
    return this.isRunning && !this.isSuspendedByUser;
  }

  public getTargetY(): number | null {
    return this.targetY;
  }

  public isUserSuspended(): boolean {
    return this.isSuspendedByUser;
  }

  private scheduleFrame(): void {
    if (
      typeof window === 'undefined' ||
      typeof requestAnimationFrame === 'undefined' ||
      !this.isRunning ||
      this.isSuspendedByUser
    ) {
      return;
    }
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(this.tick);
  }

  private tick = (now: number): void => {
    this.rafId = null;
    if (typeof window === 'undefined' || !this.isRunning || this.isSuspendedByUser) {
      return;
    }

    const actualY = window.pageYOffset || document.documentElement?.scrollTop || 0;

    if (this.currentVirtualY === null || Math.abs(actualY - this.currentVirtualY) > 90) {
      // If user moved page significantly or virtual Y uninitialized, sync to actual
      this.currentVirtualY = actualY;
    }

    if (this.lastTimestamp === null) {
      this.lastTimestamp = now;
    }

    // Delta time in seconds (capped to 0.064s to prevent runaway leaps on tab resume)
    const dt = Math.min(0.064, Math.max(0.001, (now - this.lastTimestamp) / 1000));
    this.lastTimestamp = now;

    if (this.targetY !== null) {
      const diff = this.targetY - this.currentVirtualY;
      const absDiff = Math.abs(diff);

      // Smooth time-based lerp tracking:
      const lerpRate = 3.2 * this.speedMultiplier;
      const step = diff * Math.min(1.0, lerpRate * dt);

      if (absDiff > 0.1) {
        this.currentVirtualY += step;
        // Sub-pixel floating point scrolling for silky-smooth motion
        window.scrollTo(0, this.currentVirtualY);
      }
    }

    if (this.isRunning && !this.isSuspendedByUser) {
      this.scheduleFrame();
    }
  };
}

export const globalArticleAutoScroller = new DynamicArticleAutoScroller();

interface ArticleLayoutCache {
  container: HTMLElement;
  topOnPage: number;
  height: number;
  viewportHeight: number;
  timestamp: number;
}

let articleLayoutCache: ArticleLayoutCache | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => { articleLayoutCache = null; }, { passive: true });
}

/**
 * Calculates the exact target window.scrollY coordinate for smooth auto-scrolling
 * based on actual audio playback progress through the article body container.
 * Keeps the reading focus comfortably in the upper-middle of the screen (~32-35% from top).
 */
export function calculateArticleScrollTarget(
  container: HTMLElement | null,
  progressRatio: number,
  viewportHeight: number = typeof window !== 'undefined' ? window.innerHeight : 800,
  currentScrollY: number = typeof window !== 'undefined' ? (window.pageYOffset || document.documentElement?.scrollTop || 0) : 0
): number | null {
  if (!container) return null;

  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

  let topOnPage: number;
  let height: number;

  if (
    articleLayoutCache &&
    articleLayoutCache.container === container &&
    now - articleLayoutCache.timestamp < 1500 &&
    articleLayoutCache.viewportHeight === viewportHeight
  ) {
    topOnPage = articleLayoutCache.topOnPage;
    height = articleLayoutCache.height;
  } else {
    const rect = container.getBoundingClientRect();
    topOnPage = rect.top + currentScrollY;
    height = rect.height;
    articleLayoutCache = {
      container,
      topOnPage,
      height,
      viewportHeight,
      timestamp: now
    };
  }

  // If container fits easily on screen without scrolling, no movement needed
  if (height < viewportHeight * 0.7) {
    return null;
  }

  // Reading band: keep the active content comfortable (~32% from viewport top)
  const readingBandOffset = viewportHeight * 0.32;
  const startScrollY = Math.max(0, topOnPage - readingBandOffset);
  const maxScrollY = Math.max(
    startScrollY,
    topOnPage + height - (viewportHeight * 0.65)
  );

  const clampedProgress = Math.max(0, Math.min(1, progressRatio));
  const targetScrollY = startScrollY + clampedProgress * (maxScrollY - startScrollY);

  return targetScrollY;
}

/**
 * Smoothly updates target scroll position with fallback support.
 */
export function smoothScrollToArticleProgress(
  targetY: number | null,
  isUserScrolling: boolean,
  scrollerInstance?: DynamicArticleAutoScroller | null,
  options?: { minDelta?: number; speedMultiplier?: number }
): void {
  const scroller = scrollerInstance || globalArticleAutoScroller;
  if (targetY === null || isUserScrolling || typeof window === 'undefined') {
    scroller.pause();
    return;
  }

  if (options?.speedMultiplier) {
    scroller.setSpeed(options.speedMultiplier);
  }
  scroller.setTargetY(targetY);

  if (!scroller.getIsRunning()) {
    scroller.resume();
  }

  // Fallback for tests or environments without rAF
  if (typeof requestAnimationFrame === 'undefined') {
    const currentY = window.pageYOffset || document.documentElement?.scrollTop || 0;
    const delta = Math.abs(currentY - targetY);
    const minDelta = options?.minDelta ?? 35;
    if (delta > minDelta) {
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  }
}

/**
 * Legacy alias for smooth scrolling kept for compatibility.
 */
export function smoothScrollReadingIntoView(
  targetElement: HTMLElement | null,
  isUserScrolling: boolean
): void {
  if (!targetElement || isUserScrolling || typeof window === 'undefined') return;

  const rect = targetElement.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;

  const topSafeLimit = Math.max(80, vh * 0.18);
  const bottomSafeLimit = vh * 0.72;

  if (rect.top >= topSafeLimit && rect.bottom <= bottomSafeLimit) {
    return;
  }

  const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
  const targetScrollY = currentScrollY + rect.top - vh * 0.35;

  smoothScrollToArticleProgress(Math.max(0, targetScrollY), false);
}
