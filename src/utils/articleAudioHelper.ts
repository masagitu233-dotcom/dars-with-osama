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
 * Extracts and prepares the article narration script:
 * By default, starts directly on the article body content (isi artikel) to maintain
 * 100% parity with the reading highlight position.
 */
export function extractArticleSpeechScript(
  post: BlogPost,
  options?: { includeHeader?: boolean }
): string {
  const parts: string[] = [];

  if (options?.includeHeader) {
    if (post.title) {
      parts.push(post.title.trim());
    }
    if (post.excerpt) {
      parts.push(post.excerpt.trim());
    }
  }

  if (post.content) {
    const cleanContent = stripHtmlForSpeech(post.content);
    if (cleanContent) {
      parts.push(cleanContent);
    }
  }

  if (post.contentAr) {
    const cleanContentAr = stripHtmlForSpeech(post.contentAr);
    if (cleanContentAr) {
      parts.push(cleanContentAr);
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

export type AudioFormatType = 'mp3' | 'wav' | 'm4a' | 'ogg' | 'aac' | 'unknown';

export interface WavHeaderInfo {
  validWav: boolean;
  formatCode: number;
  formatName: string;
  isLinearPcm: boolean;
  isIeeeFloat: boolean;
  isSupportedByBrowser: boolean;
  numChannels: number;
  channelLayout: 'Mono' | 'Stereo' | 'Multi-channel';
  sampleRate: number;
  bitsPerSample: number;
  byteRate: number;
  blockAlign: number;
  diagnosticSummary: string;
  unsupportedReason?: string;
}

export interface AudioAccessibilityResult {
  accessible: boolean;
  statusCode?: number;
  detectedFormat: AudioFormatType;
  mimeType: string;
  fileSizeBytes?: number;
  errorMessage?: string;
  isGoogleDrive: boolean;
  fileId: string | null;
  canBrowserPlay: boolean;
  codecDetail: string;
  wavInfo?: WavHeaderInfo;
}

export interface ResolvedAudioSource {
  originalUrl: string;
  isGoogleDrive: boolean;
  isGoogleDriveFolder: boolean;
  fileId: string | null;
  detectedFormat: AudioFormatType;
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
 * Detects audio format from file extension, URL parameters, or MIME hints.
 */
export function detectAudioFormatFromUrl(rawUrl: string | null | undefined): AudioFormatType {
  if (!rawUrl || typeof rawUrl !== 'string') return 'unknown';
  const clean = rawUrl.trim().toLowerCase();
  if (/\.wav(\?|#|$)/i.test(clean) || clean.includes('audio/wav') || clean.includes('format=wav')) {
    return 'wav';
  }
  if (/\.mp3(\?|#|$)/i.test(clean) || clean.includes('audio/mpeg') || clean.includes('audio/mp3') || clean.includes('format=mp3')) {
    return 'mp3';
  }
  if (/\.m4a(\?|#|$)/i.test(clean) || clean.includes('audio/mp4') || clean.includes('audio/m4a') || clean.includes('format=m4a')) {
    return 'm4a';
  }
  if (/\.ogg(\?|#|$)/i.test(clean) || clean.includes('audio/ogg') || clean.includes('format=ogg')) {
    return 'ogg';
  }
  if (/\.aac(\?|#|$)/i.test(clean) || clean.includes('audio/aac')) {
    return 'aac';
  }
  return 'unknown';
}

/**
 * Checks if the browser's native HTML5 audio decoder supports the given audio format and codec.
 */
export function checkBrowserAudioCodecSupport(format: AudioFormatType): {
  supported: boolean;
  canPlayConfidence: 'probably' | 'maybe' | 'none';
  detail: string;
} {
  if (typeof document === 'undefined') {
    return { supported: true, canPlayConfidence: 'maybe', detail: 'Periksa di peramban' };
  }
  const audio = document.createElement('audio');

  if (format === 'wav') {
    const canPlayGeneral = audio.canPlayType('audio/wav');
    const canPlayPcm = audio.canPlayType('audio/wav; codecs="1"'); // Standard uncompressed Linear PCM
    if (canPlayPcm === 'probably' || canPlayGeneral === 'probably') {
      return { supported: true, canPlayConfidence: 'probably', detail: 'Mendukung WAV standar (Linear PCM)' };
    }
    if (canPlayGeneral === 'maybe') {
      return { supported: true, canPlayConfidence: 'maybe', detail: 'Mendukung WAV dasar (Linear PCM)' };
    }
    return {
      supported: false,
      canPlayConfidence: 'none',
      detail: 'Peramban tidak mendukung format atau codec WAV ini (pastikan menggunakan Linear PCM)'
    };
  }

  if (format === 'mp3') {
    const canPlayMp3 = audio.canPlayType('audio/mpeg');
    return {
      supported: Boolean(canPlayMp3),
      canPlayConfidence: canPlayMp3 === 'probably' ? 'probably' : canPlayMp3 === 'maybe' ? 'maybe' : 'none',
      detail: 'Mendukung MP3 (MPEG-1/2 Audio Layer 3)'
    };
  }

  return { supported: true, canPlayConfidence: 'maybe', detail: 'Format audio didukung peramban' };
}

export const isAudioFormatSupportedByBrowser = checkBrowserAudioCodecSupport;

/**
 * Writes an ASCII string into a DataView at the given byte offset.
 */
function writeAsciiString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Parses binary RIFF/WAVE header and extracts audio format, codec, sample rate,
 * bit depth, channel layout, and browser compatibility.
 */
export function parseWavHeader(buffer: ArrayBuffer | Uint8Array): WavHeaderInfo {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  if (bytes.length < 12) {
    return {
      validWav: false,
      formatCode: 0,
      formatName: 'Tidak Diketahui',
      isLinearPcm: false,
      isIeeeFloat: false,
      isSupportedByBrowser: false,
      numChannels: 0,
      channelLayout: 'Mono',
      sampleRate: 0,
      bitsPerSample: 0,
      byteRate: 0,
      blockAlign: 0,
      diagnosticSummary: 'Data audio terlalu pendek atau terpotong (kurang dari 12 byte).'
    };
  }

  // Verify 'RIFF' and 'WAVE' chunk tags
  const isRiff =
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46; // 'RIFF'
  const isWave =
    bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45; // 'WAVE'

  if (!isRiff || !isWave) {
    return {
      validWav: false,
      formatCode: 0,
      formatName: 'Bukan RIFF/WAVE',
      isLinearPcm: false,
      isIeeeFloat: false,
      isSupportedByBrowser: false,
      numChannels: 0,
      channelLayout: 'Mono',
      sampleRate: 0,
      bitsPerSample: 0,
      byteRate: 0,
      blockAlign: 0,
      diagnosticSummary: 'Header berkas bukan merupakan kontainer RIFF/WAVE yang valid.'
    };
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // Search for the 'fmt ' subchunk
  let offset = 12;
  let fmtOffset = -1;
  let fmtSize = 0;

  while (offset + 8 <= bytes.length) {
    const chunkId = String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3]
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'fmt ') {
      fmtOffset = offset + 8;
      fmtSize = chunkSize;
      break;
    }

    const nextOffset = offset + 8 + chunkSize + (chunkSize % 2);
    if (nextOffset <= offset) break;
    offset = nextOffset;
  }

  if (fmtOffset === -1 || fmtOffset + 14 > bytes.length) {
    return {
      validWav: true,
      formatCode: 0,
      formatName: 'Format chunk hilang',
      isLinearPcm: false,
      isIeeeFloat: false,
      isSupportedByBrowser: false,
      numChannels: 0,
      channelLayout: 'Mono',
      sampleRate: 0,
      bitsPerSample: 0,
      byteRate: 0,
      blockAlign: 0,
      diagnosticSummary: 'Subchunk "fmt " tidak ditemukan dalam header berkas WAV.'
    };
  }

  let formatCode = view.getUint16(fmtOffset, true);
  const numChannels = view.getUint16(fmtOffset + 2, true);
  const sampleRate = view.getUint32(fmtOffset + 4, true);
  const byteRate = view.getUint32(fmtOffset + 8, true);
  const blockAlign = view.getUint16(fmtOffset + 12, true);
  const bitsPerSample = fmtSize >= 16 && fmtOffset + 16 <= bytes.length ? view.getUint16(fmtOffset + 14, true) : 16;

  // If WAVE_FORMAT_EXTENSIBLE (0xFFFE), inspect SubFormat GUID
  if (formatCode === 0xFFFE && fmtOffset + 26 <= bytes.length) {
    const subFormat = view.getUint16(fmtOffset + 24, true);
    if (subFormat > 0) {
      formatCode = subFormat;
    }
  }

  const isLinearPcm = formatCode === 1;
  const isIeeeFloat = formatCode === 3;
  // Modern browsers natively decode Linear PCM (8/16/24/32-bit) and IEEE Float (32/64-bit)
  const isSupportedByBrowser = isLinearPcm || isIeeeFloat;

  const channelLayout: 'Mono' | 'Stereo' | 'Multi-channel' =
    numChannels === 1 ? 'Mono' : numChannels === 2 ? 'Stereo' : 'Multi-channel';

  let formatName = `Format ID ${formatCode}`;
  let unsupportedReason: string | undefined = undefined;

  switch (formatCode) {
    case 1:
      formatName = 'Linear PCM (Integer PCM)';
      break;
    case 3:
      formatName = 'IEEE Float';
      break;
    case 2:
      formatName = 'Microsoft ADPCM';
      unsupportedReason = 'Peramban web tidak mendukung decoding codec kompresi Microsoft ADPCM. Rekaman harus diekspor sebagai Linear PCM 16-bit standar atau MP3.';
      break;
    case 6:
      formatName = 'ITU-T G.711 A-law';
      unsupportedReason = 'Codec kompresi A-law tidak didukung secara native oleh sebagian besar peramban web.';
      break;
    case 7:
      formatName = 'ITU-T G.711 μ-law';
      unsupportedReason = 'Codec kompresi μ-law tidak didukung secara native oleh sebagian besar peramban web.';
      break;
    case 17:
      formatName = 'IMA / DVI ADPCM';
      unsupportedReason = 'Codec kompresi IMA ADPCM tidak didukung oleh mesin decoding HTML5 audio peramban.';
      break;
    case 49:
      formatName = 'GSM 6.10';
      unsupportedReason = 'Codec GSM 6.10 tidak didukung oleh peramban web.';
      break;
    case 85:
      formatName = 'MPEG Layer 3 (MP3 di dalam kontainer WAV)';
      unsupportedReason = 'Format MP3 yang dibungkus di dalam kontainer WAV tidak didukung oleh pemutar audio HTML5. Gunakan berkas .mp3 langsung.';
      break;
    default:
      formatName = `Codec WAV Kustom (ID: ${formatCode})`;
      unsupportedReason = `Codec audio dengan ID ${formatCode} tidak didukung oleh peramban web modern.`;
      break;
  }

  const diagnosticSummary = isSupportedByBrowser
    ? `${formatName}, ${sampleRate.toLocaleString()} Hz, ${bitsPerSample}-bit, ${numChannels} ch (${channelLayout}) - Kompatibel dengan peramban`
    : `${formatName}, ${sampleRate.toLocaleString()} Hz, ${bitsPerSample}-bit, ${numChannels} ch (${channelLayout}) - Tidak didukung peramban`;

  return {
    validWav: true,
    formatCode,
    formatName,
    isLinearPcm,
    isIeeeFloat,
    isSupportedByBrowser,
    numChannels,
    channelLayout,
    sampleRate,
    bitsPerSample,
    byteRate,
    blockAlign,
    diagnosticSummary,
    unsupportedReason
  };
}

/**
 * Converts a Web Audio API AudioBuffer into an uncompressed 16-bit Linear PCM WAV Blob.
 * Used for lossless in-memory playback normalization without modifying the original file on Google Drive.
 */
export function audioBufferToWavBlob(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numSamples = audioBuffer.length;
  const dataSize = numSamples * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // 'RIFF' chunk descriptor
  writeAsciiString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // ChunkSize
  writeAsciiString(view, 8, 'WAVE');

  // 'fmt ' subchunk
  writeAsciiString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat 1 = Linear PCM
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample

  // 'data' subchunk
  writeAsciiString(view, 36, 'data');
  view.setUint32(40, dataSize, true); // Subchunk2Size

  // Interleave audio samples into 16-bit PCM
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = channels[ch][i];
      // Clamp between -1.0 and 1.0
      sample = Math.max(-1, Math.min(1, sample));
      // Convert float [-1.0, 1.0] to signed 16-bit integer [-32768, 32767]
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
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
      host === 'docs.google.com'
    );
  } catch {
    return /drive\.google\.com|drive\.usercontent\.google\.com|docs\.google\.com/i.test(trimmed);
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
      host === 'docs.google.com';

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
 * into ordered playback source candidates for HTML5 <audio>, supporting MP3 and WAV.
 */
export function resolveAudioSourceCandidates(rawUrl: string | null | undefined): ResolvedAudioSource {
  const originalUrl = (rawUrl || '').trim();
  const detectedFormat = detectAudioFormatFromUrl(originalUrl);

  if (!originalUrl) {
    return {
      originalUrl: '',
      isGoogleDrive: false,
      isGoogleDriveFolder: false,
      fileId: null,
      detectedFormat: 'unknown',
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
        detectedFormat,
        primaryUrl: '',
        directCorsUrl: null,
        legacyUcUrl: null,
        candidates: []
      };
    }

    const encodedId = encodeURIComponent(fileId);
    const formatQuery = detectedFormat !== 'unknown' ? `&format=${detectedFormat}` : '';
    const proxyUrl = `/api/gdrive-audio?id=${encodedId}${formatQuery}`;
    const directCorsUrl = `https://drive.usercontent.google.com/download?id=${encodedId}&export=download&confirm=t`;
    const legacyUcUrl = `https://drive.google.com/uc?export=download&id=${encodedId}`;

    return {
      originalUrl,
      isGoogleDrive: true,
      isGoogleDriveFolder: false,
      fileId,
      detectedFormat,
      primaryUrl: proxyUrl,
      directCorsUrl,
      legacyUcUrl,
      candidates: [
        { url: proxyUrl, label: 'proxy', useCrossOrigin: false },
        { url: directCorsUrl, label: 'gdrive-cors', useCrossOrigin: false },
        { url: legacyUcUrl, label: 'gdrive-uc', useCrossOrigin: false }
      ]
    };
  }

  // Non-Google Drive direct URL (e.g., Firebase Storage, CDN MP3/WAV/M4A/OGG, or local /api/ path)
  return {
    originalUrl,
    isGoogleDrive: false,
    isGoogleDriveFolder: false,
    fileId: null,
    detectedFormat,
    primaryUrl: originalUrl,
    directCorsUrl: null,
    legacyUcUrl: null,
    candidates: [
      { url: originalUrl, label: 'direct', useCrossOrigin: false }
    ]
  };
}

/**
 * Asynchronously verifies if an audio file (Google Drive or direct URL) is accessible,
 * extracts content length and MIME type, and checks browser codec compatibility.
 */
export async function verifyAudioAccessibility(rawUrl: string | null | undefined): Promise<AudioAccessibilityResult> {
  const resolved = resolveAudioSourceCandidates(rawUrl);

  if (!resolved.originalUrl) {
    return {
      accessible: false,
      detectedFormat: 'unknown',
      mimeType: '',
      isGoogleDrive: false,
      fileId: null,
      canBrowserPlay: false,
      codecDetail: 'Tautan kosong',
      errorMessage: 'Tautan berkas audio belum dimasukkan.'
    };
  }

  if (resolved.isGoogleDriveFolder) {
    return {
      accessible: false,
      detectedFormat: 'unknown',
      mimeType: '',
      isGoogleDrive: true,
      fileId: null,
      canBrowserPlay: false,
      codecDetail: 'Tautan Folder',
      errorMessage: 'Tautan Google Drive yang dimasukkan adalah Folder, bukan berkas audio.'
    };
  }

  if (resolved.isGoogleDrive && !resolved.fileId) {
    return {
      accessible: false,
      detectedFormat: 'unknown',
      mimeType: '',
      isGoogleDrive: true,
      fileId: null,
      canBrowserPlay: false,
      codecDetail: 'ID tidak ditemukan',
      errorMessage: 'Format tautan Google Drive tidak valid atau ID berkas tidak ditemukan.'
    };
  }

  const candidateUrl = resolved.primaryUrl || resolved.originalUrl;

  try {
    const res = await fetch(candidateUrl, {
      method: 'GET',
      headers: { Range: 'bytes=0-1024' }
    });

    const contentType = (res.headers.get('content-type') || res.headers.get('x-audio-format') || '').toLowerCase();
    const contentLength = parseInt(res.headers.get('content-length') || '0', 10);
    const contentDisp = (res.headers.get('content-disposition') || '').toLowerCase();
    const xAudioFormat = (res.headers.get('x-audio-format') || '').toLowerCase();

    if (!res.ok || contentType.includes('text/html')) {
      let specificMessage = '';
      try {
        const errJson = await res.json();
        if (errJson && errJson.error) {
          specificMessage = errJson.error;
        }
      } catch {
        // Not JSON
      }

      if (!specificMessage) {
        if (res.status === 404) {
          specificMessage = 'Berkas audio tidak ditemukan di Google Drive (404). Periksa kembali apakah berkas masih ada.';
        } else if (res.status === 429) {
          specificMessage = 'Batas kuota pengunduhan Google Drive untuk berkas ini sedang terlampaui (429). Coba beberapa saat lagi.';
        } else if (res.status === 403) {
          specificMessage = 'Akses berkas Google Drive ditolak (403). Pastikan akses umum disetel ke "Siapa saja yang memiliki link".';
        } else if (res.status === 415) {
          specificMessage = 'Tautan yang dimasukkan mengarah ke Google Dokumen/Spreadsheet, bukan berkas audio (.mp3 atau .wav).';
        } else {
          specificMessage = `Server penyimpanan audio merespons dengan status ${res.status}. Aliran berkas audio tidak dapat diputar.`;
        }
      }

      return {
        accessible: false,
        statusCode: res.status,
        detectedFormat: resolved.detectedFormat,
        mimeType: contentType,
        fileSizeBytes: contentLength || undefined,
        isGoogleDrive: resolved.isGoogleDrive,
        fileId: resolved.fileId,
        canBrowserPlay: false,
        codecDetail: 'Akses terhambat',
        errorMessage: specificMessage
      };
    }

    // Format detection from Content-Type, X-Audio-Format, or Content-Disposition
    let finalFormat: AudioFormatType = resolved.detectedFormat;
    if (xAudioFormat === 'wav' || contentType.includes('wav') || contentDisp.includes('.wav')) {
      finalFormat = 'wav';
    } else if (xAudioFormat === 'mp3' || contentType.includes('mpeg') || contentType.includes('mp3') || contentDisp.includes('.mp3')) {
      finalFormat = 'mp3';
    } else if (xAudioFormat === 'm4a' || contentType.includes('mp4') || contentType.includes('m4a') || contentDisp.includes('.m4a')) {
      finalFormat = 'm4a';
    } else if (xAudioFormat === 'ogg' || contentType.includes('ogg') || contentDisp.includes('.ogg')) {
      finalFormat = 'ogg';
    }

    let parsedWav: WavHeaderInfo | undefined = undefined;
    if (finalFormat === 'wav') {
      try {
        const headerBuf = await res.arrayBuffer();
        if (headerBuf && headerBuf.byteLength >= 12) {
          parsedWav = parseWavHeader(headerBuf);
        }
      } catch {
        // arrayBuffer read error
      }
    }

    const codecSupport = checkBrowserAudioCodecSupport(finalFormat);
    const canPlay = parsedWav ? parsedWav.isSupportedByBrowser : codecSupport.supported;
    const detail = parsedWav ? parsedWav.diagnosticSummary : codecSupport.detail;
    const specificErr = parsedWav && !parsedWav.isSupportedByBrowser ? parsedWav.unsupportedReason : undefined;

    return {
      accessible: true,
      statusCode: res.status,
      detectedFormat: finalFormat,
      mimeType: contentType,
      fileSizeBytes: contentLength > 0 ? contentLength : undefined,
      isGoogleDrive: resolved.isGoogleDrive,
      fileId: resolved.fileId,
      canBrowserPlay: canPlay,
      codecDetail: detail,
      errorMessage: specificErr,
      wavInfo: parsedWav
    };
  } catch (err: any) {
    return {
      accessible: false,
      detectedFormat: resolved.detectedFormat,
      mimeType: '',
      isGoogleDrive: resolved.isGoogleDrive,
      fileId: resolved.fileId,
      canBrowserPlay: false,
      codecDetail: 'Gangguan Jaringan',
      errorMessage: 'Gagal menghubungi server audio. Periksa koneksi internet atau tautan berkas.'
    };
  }
}

/**
 * Produces an accurate, actionable Indonesian diagnostic message when audio playback fails,
 * with explicit guidance for MP3, WAV (PCM codec), and Google Drive error causes.
 */
export function describeAudioPlaybackError(params: {
  isGoogleDrive: boolean;
  isGoogleDriveFolder?: boolean;
  fileId: string | null;
  detectedFormat?: AudioFormatType;
  mediaErrorCode?: number | null;
  serverMessage?: string | null;
  wavInfo?: WavHeaderInfo | null;
}): string {
  // 1. If explicit WAV header audit identified an incompatible codec, present precise codec diagnostic
  if (params.wavInfo) {
    if (!params.wavInfo.validWav) {
      return `Format berkas bukan kontainer audio WAV/RIFF yang valid. ${params.wavInfo.diagnosticSummary}`;
    }
    if (!params.wavInfo.isSupportedByBrowser) {
      return `Codec audio WAV tidak didukung peramban: ${params.wavInfo.formatName} (Format ID: ${params.wavInfo.formatCode}), ${params.wavInfo.sampleRate.toLocaleString()} Hz, ${params.wavInfo.bitsPerSample}-bit, ${params.wavInfo.channelLayout}. Peramban web modern hanya mendukung berkas WAV berformat uncompressed Linear PCM (16-bit integer) atau MP3 standar. ${params.wavInfo.unsupportedReason || ''}`;
    }
  }

  // 2. Specific server message (404, 403 domain restriction, 429 quota, etc.)
  if (params.serverMessage) {
    return params.serverMessage;
  }

  // 3. Tautan folder
  if (params.isGoogleDriveFolder) {
    return 'Tautan Google Drive yang dimasukkan adalah tautan Folder, bukan berkas audio. Silakan gunakan tautan berbagi langsung dari berkas audio (.mp3 atau .wav).';
  }

  // 4. File ID hilang
  if (params.isGoogleDrive && !params.fileId) {
    return 'Format tautan Google Drive tidak valid atau ID berkas tidak ditemukan. Gunakan tautan berbagi file seperti https://drive.google.com/file/d/ID_BERKAS/view?usp=sharing.';
  }

  // 5. Kesalahan MediaError dari elemen audio HTML5
  if (params.mediaErrorCode === 4) {
    if (params.detectedFormat === 'wav') {
      return 'Format atau codec audio WAV tidak didukung oleh peramban ini. Peramban web hanya mendukung berkas WAV berformat standar uncompressed Linear PCM (8/16/24/32-bit integer). Jika rekaman menggunakan ADPCM, GSM, atau format terkompresi non-standar, simpan rekaman sebagai Linear PCM WAV (16-bit) atau MP3 standar.';
    }
    if (params.detectedFormat === 'mp3') {
      return 'Berkas audio MP3 tidak dapat didekode atau diputar oleh peramban. Pastikan berkas MP3 tidak rusak dan menggunakan encoding MPEG Audio Layer 3 standar.';
    }
    if (params.isGoogleDrive) {
      return 'Berkas audio Google Drive tidak dapat dimuat oleh pemutar peramban. Kemungkinan penyebab: (1) Berkas menggunakan format/codec yang tidak didukung (misalnya rekaman WAV non-PCM), (2) Google Drive meminta konfirmasi unduhan antivirus manual, atau (3) Izin akses belum dibuka untuk umum.';
    }
    return 'Format atau sumber audio tidak didukung oleh peramban web ini. Pastikan format berkas adalah MP3 atau WAV standar (Linear PCM).';
  }

  if (params.mediaErrorCode === 3) {
    if (params.detectedFormat === 'wav') {
      return 'Terjadi kegagalan dekode audio pada berkas WAV. Pastikan rekaman menggunakan codec uncompressed Linear PCM standar dan data tidak terpotong.';
    }
    return 'Terjadi kerusakan pada data audio (Decode Error) saat memutar rekaman. Periksa kembali keutuhan berkas audio Anda.';
  }

  if (params.mediaErrorCode === 2) {
    return 'Terjadi gangguan jaringan saat mengunduh aliran data audio dari server. Periksa koneksi internet Anda lalu coba kembali.';
  }

  if (params.mediaErrorCode === 1) {
    return 'Proses pemuatan audio dibatalkan oleh pengguna atau peramban.';
  }

  if (params.isGoogleDrive) {
    return 'Berkas audio Google Drive tidak dapat diputar. Pastikan berkas berformat MP3 atau WAV standar dan tautan dapat diakses publik.';
  }

  return 'Gagal memuat berkas audio. Pastikan tautan audio valid, dapat diakses secara publik, dan berformat MP3 atau WAV.';
}


