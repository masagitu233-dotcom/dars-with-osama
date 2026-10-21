import { BlogPost } from '../types';

/**
 * Strips HTML tags, trims entities, and produces clean narrative text.
 */
export function stripHtmlForSpeech(html: string): string {
  if (!html || typeof html !== 'string') return '';

  // 1. Remove script and style elements
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');

  // 2. Convert common block breaks to punctuation pauses
  text = text.replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|blockquote|tr)>/gi, '. ');
  text = text.replace(/<br\s*[\/]?>/gi, '. ');

  // 3. Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // 4. Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, 'dan')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&zwnj;/g, '')
    .replace(/&zwj;/g, '');

  return text.trim();
}

/**
 * Normalizes Islamic honorifics, abbreviations, and transliterations specifically
 * for clear, natural Indonesian text-to-speech pronunciation.
 * NOTE: The visual article text displayed on screen remains 100% unaltered.
 */
export function normalizeTextForSpeech(rawText: string): string {
  if (!rawText) return '';

  let speechText = rawText;

  // Replace honorific abbreviations with full spoken Indonesian equivalents
  speechText = speechText
    .replace(/\bSWT\b/g, "Subhanahu wa Ta'ala")
    .replace(/\bSAW\b/g, "Shallallahu 'alaihi wa sallam")
    .replace(/\bRA\b/g, "Radhiyallahu 'anhu")
    .replace(/\bQ\.?S\.?\s*(\d+)[:\.](\d+)/gi, 'Surah nomor $1 ayat $2')
    .replace(/\bQ\.?S\.?\s*([A-Za-z\-]+)[:\.](\d+)/gi, 'Surah $1 ayat $2')
    .replace(/\bQ\.?S\.?/gi, 'Surah')
    .replace(/\bH\.?R\.?\s*([A-Za-z]+)/gi, 'Hadis riwayat $1')
    .replace(/\bH\.?R\.?/gi, 'Hadis riwayat')
    .replace(/\bImam\s+an-Nawawi\b/gi, 'Imam An Nawawi')
    .replace(/\bIbnu\s+Taimiyah\b/gi, 'Ibnu Taimiyyah')
    .replace(/\bFiqh\b/gi, 'Fikih')
    .replace(/\bSyarh\b/gi, 'Syarah')
    .replace(/\bThaharah\b/gi, 'Thaharah')
    .replace(/\bWudhu\b/gi, 'Wudhu')
    .replace(/\bShalat\b/gi, 'Salat')
    .replace(/\bZakat\b/gi, 'Zakat')
    .replace(/\bMuamalah\b/gi, 'Muamalah');

  // Strip decorative Quranic brackets and symbols so TTS doesn't speak "tanda kurung kurawal"
  speechText = speechText.replace(/[﴿﴾۝۞ﷺﷻ﷽]/g, '');

  // Normalize special transliteration marks to simple readable characters
  speechText = speechText
    .replace(/[‘`ʼʻʿʾ]/g, "'")
    .replace(/ā/g, 'a')
    .replace(/ī/g, 'i')
    .replace(/ū/g, 'u')
    .replace(/ḍ/g, 'd')
    .replace(/ṣ/g, 's')
    .replace(/ṭ/g, 't')
    .replace(/ẓ/g, 'z')
    .replace(/ḥ/g, 'h');

  // Clean redundant whitespace and punctuation runs
  speechText = speechText
    .replace(/\s+/g, ' ')
    .replace(/\s*([.,!?;:])\s*/g, '$1 ')
    .replace(/\.{2,}/g, '.')
    .trim();

  return speechText;
}

/**
 * Extracts and prepares the complete article narration script:
 * Title, Excerpt, and Body text, excluding all UI elements.
 */
export function extractArticleSpeechScript(post: BlogPost): string {
  const parts: string[] = [];

  if (post.title) {
    parts.push(post.title.trim());
  }

  if (post.excerpt) {
    parts.push(post.excerpt.trim());
  }

  if (post.content) {
    const cleanContent = stripHtmlForSpeech(post.content);
    if (cleanContent) {
      parts.push(cleanContent);
    }
  }

  const combined = parts.join('. ');
  return normalizeTextForSpeech(combined);
}

/**
 * Splits text into natural sentence-level chunks (~120 - 220 chars) to prevent
 * browser Web Speech API synthesis buffer hang or mid-sentence timeouts.
 */
export function splitIntoSpeechChunks(text: string, maxChunkLength = 220): string[] {
  if (!text || typeof text !== 'string') return [];

  // Split on primary sentence terminators
  const rawSegments = text.split(/(?<=[.!?])\s+|\n+/);
  const chunks: string[] = [];

  for (const segment of rawSegments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    if (trimmed.length <= maxChunkLength) {
      chunks.push(trimmed);
    } else {
      // Further split longer clauses on commas, semicolons or spaces
      const clauses = trimmed.split(/(?<=[,;:])\s+/);
      let currentChunk = '';

      for (const clause of clauses) {
        if (!currentChunk) {
          currentChunk = clause;
        } else if ((currentChunk + ' ' + clause).length <= maxChunkLength) {
          currentChunk += ' ' + clause;
        } else {
          chunks.push(currentChunk.trim());
          currentChunk = clause;
        }
      }

      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
    }
  }

  return chunks.filter(c => c.length > 0);
}

/**
 * Estimates reading duration in seconds based on ~135 Indonesian words per minute at 1.0x rate.
 */
export function estimateReadingDurationSeconds(text: string, playbackRate = 1.0): number {
  if (!text) return 0;
  const wordCount = text.trim().split(/\s+/).length;
  const wordsPerMinute = 135 * Math.max(0.5, playbackRate);
  const minutes = wordCount / wordsPerMinute;
  return Math.max(10, Math.round(minutes * 60));
}

/**
 * Formats seconds into MM:SS string.
 */
export function formatSpeechTime(totalSeconds: number): string {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  const mm = m < 10 ? `0${m}` : `${m}`;
  const ss = s < 10 ? `0${s}` : `${s}`;
  return `${mm}:${ss}`;
}

/**
 * Locates the optimal Indonesian voice from the browser's available speech voices.
 */
export function findIndonesianVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  // Priority 1: Exact id-ID or in-ID
  const exactId = voices.find(
    v => v.lang === 'id-ID' || v.lang === 'in-ID' || v.lang === 'id_ID'
  );
  if (exactId) return exactId;

  // Priority 2: Language code starts with id or in
  const prefixId = voices.find(
    v => v.lang.toLowerCase().startsWith('id') || v.lang.toLowerCase().startsWith('in')
  );
  if (prefixId) return prefixId;

  // Priority 3: Name mentions Indonesia
  const namedId = voices.find(
    v => v.name.toLowerCase().includes('indonesia')
  );
  if (namedId) return namedId;

  // Default fallback voice
  return voices.find(v => v.default) || voices[0] || null;
}
