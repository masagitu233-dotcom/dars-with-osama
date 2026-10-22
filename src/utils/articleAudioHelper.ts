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

export interface ResolvedAudioSource {
  originalUrl: string;
  isGoogleDrive: boolean;
  isGoogleDriveFolder: boolean;
  fileId: string | null;
  primaryUrl: string;
  directCorsUrl: string | null;
  legacyUcUrl: string | null;
  candidates: Array<{
    url: string;
    label: 'proxy' | 'gdrive-cors' | 'gdrive-uc' | 'direct';
    useCrossOrigin: boolean;
  }>;
}

/**
 * Checks whether a string looks like a valid Google Drive file ID.
 */
export function isValidGoogleDriveFileId(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  const trimmed = id.trim();
  return /^[a-zA-Z0-9_-]{10,120}$/.test(trimmed);
}

/**
 * Checks if a URL points to Google Drive or Google UserContent.
 */
export function isGoogleDriveUrl(rawUrl: string | null | undefined): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'drive.google.com' ||
      host === 'www.drive.google.com' ||
      host === 'drive.usercontent.google.com' ||
      (host === 'docs.google.com' && parsed.pathname.startsWith('/uc'))
    );
  } catch {
    return /drive\.google\.com|drive\.usercontent\.google\.com/i.test(trimmed);
  }
}

/**
 * Checks if a Google Drive URL points to a folder instead of a single file.
 */
export function isGoogleDriveFolderUrl(rawUrl: string | null | undefined): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  return /drive\.google\.com\/(?:drive\/(?:u\/\d+\/)?)?folders\//i.test(rawUrl.trim());
}

/**
 * Extracts the Google Drive file ID from common sharing/download URL formats:
 * - https://drive.google.com/file/d/{FILE_ID}/view?usp=drive_link
 * - https://drive.google.com/file/u/0/d/{FILE_ID}/view?usp=sharing
 * - https://drive.google.com/open?id={FILE_ID}
 * - https://drive.google.com/uc?export=download&id={FILE_ID}
 * - https://drive.usercontent.google.com/download?id={FILE_ID}&export=download
 */
export function extractGoogleDriveFileId(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Reject folder URLs explicitly
  if (isGoogleDriveFolderUrl(trimmed)) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const isDriveHost =
      host === 'drive.google.com' ||
      host === 'www.drive.google.com' ||
      host === 'drive.usercontent.google.com' ||
      (host === 'docs.google.com' && parsed.pathname.startsWith('/uc'));

    if (!isDriveHost) {
      return null;
    }

    // Pattern 1: /file/d/{fileId} or /file/u/0/d/{fileId}
    const pathMatch = parsed.pathname.match(/\/file\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/);
    if (pathMatch && isValidGoogleDriveFileId(pathMatch[1])) {
      return pathMatch[1];
    }

    // Pattern 2: ?id={fileId} (used by /open, /uc, /download)
    const queryId = parsed.searchParams.get('id');
    if (queryId && isValidGoogleDriveFileId(queryId)) {
      return queryId.trim();
    }
  } catch {
    // Fallback regex parsing if URL lacks protocol
    const match = trimmed.match(/\/file\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]{10,120})/);
    if (match && isValidGoogleDriveFileId(match[1])) {
      return match[1];
    }
    const idParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{10,120})/);
    if (idParam && isValidGoogleDriveFileId(idParam[1])) {
      return idParam[1];
    }
  }

  return null;
}

/**
 * Resolves any custom audio URL (Google Drive share URL or direct audio URL)
 * into ordered playback source candidates for HTML5 <audio>.
 */
export function resolveAudioSourceCandidates(rawUrl: string | null | undefined): ResolvedAudioSource {
  const originalUrl = (rawUrl || '').trim();
  if (!originalUrl) {
    return {
      originalUrl: '',
      isGoogleDrive: false,
      isGoogleDriveFolder: false,
      fileId: null,
      primaryUrl: '',
      directCorsUrl: null,
      legacyUcUrl: null,
      candidates: []
    };
  }

  const isFolder = isGoogleDriveFolderUrl(originalUrl);
  const isGDrive = isGoogleDriveUrl(originalUrl) || isFolder;
  const fileId = extractGoogleDriveFileId(originalUrl);

  if (isGDrive) {
    if (!fileId) {
      return {
        originalUrl,
        isGoogleDrive: true,
        isGoogleDriveFolder: isFolder,
        fileId: null,
        primaryUrl: '',
        directCorsUrl: null,
        legacyUcUrl: null,
        candidates: []
      };
    }

    const encodedId = encodeURIComponent(fileId);
    const proxyUrl = `/api/gdrive-audio?id=${encodedId}`;
    const directCorsUrl = `https://drive.usercontent.google.com/download?id=${encodedId}&export=download&confirm=t`;
    const legacyUcUrl = `https://drive.google.com/uc?export=download&id=${encodedId}`;

    return {
      originalUrl,
      isGoogleDrive: true,
      isGoogleDriveFolder: false,
      fileId,
      primaryUrl: proxyUrl,
      directCorsUrl,
      legacyUcUrl,
      candidates: [
        { url: proxyUrl, label: 'proxy', useCrossOrigin: false },
        { url: directCorsUrl, label: 'gdrive-cors', useCrossOrigin: true },
        { url: legacyUcUrl, label: 'gdrive-uc', useCrossOrigin: false }
      ]
    };
  }

  // Non-Google Drive direct URL (e.g., Firebase Storage, CDN MP3/M4A/WAV/OGG, or local /api/ path)
  return {
    originalUrl,
    isGoogleDrive: false,
    isGoogleDriveFolder: false,
    fileId: null,
    primaryUrl: originalUrl,
    directCorsUrl: null,
    legacyUcUrl: null,
    candidates: [
      { url: originalUrl, label: 'direct', useCrossOrigin: false }
    ]
  };
}

/**
 * Produces a user-friendly Indonesian diagnostic message when audio playback fails.
 */
export function describeAudioPlaybackError(params: {
  isGoogleDrive: boolean;
  isGoogleDriveFolder?: boolean;
  fileId: string | null;
  mediaErrorCode?: number | null;
  serverMessage?: string | null;
}): string {
  if (params.serverMessage) {
    return params.serverMessage;
  }

  if (params.isGoogleDriveFolder) {
    return 'Tautan Google Drive yang dimasukkan adalah tautan Folder, bukan berkas audio. Silakan gunakan tautan berbagi langsung dari berkas audio (.mp3, .m4a, .wav).';
  }

  if (params.isGoogleDrive && !params.fileId) {
    return 'Format tautan Google Drive tidak valid atau ID berkas tidak ditemukan. Gunakan format https://drive.google.com/file/d/ID_FILE/view?usp=drive_link.';
  }

  if (params.isGoogleDrive) {
    return 'Berkas audio dari Google Drive tidak dapat diputar. Pastikan: (1) Akses umum berkas di Google Drive telah diatur ke "Siapa saja yang memiliki link" (Anyone with the link), dan (2) Berkas berformat audio yang didukung peramban (.mp3, .m4a, .wav, .ogg).';
  }

  if (params.mediaErrorCode === 2) {
    return 'Terjadi gangguan jaringan saat mengunduh aliran audio. Periksa koneksi internet Anda lalu coba kembali.';
  }

  if (params.mediaErrorCode === 3) {
    return 'Berkas audio rusak atau format pengkodean (codec) tidak didukung oleh peramban ini.';
  }

  return 'Gagal memuat berkas audio. Pastikan tautan audio valid, dapat diakses secara publik, dan berformat MP3/M4A/WAV/OGG.';
}

