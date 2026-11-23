/**
 * Library Digital Helper for Dars with Osama.
 *
 * Pure utility functions covering:
 * - Automatic Table of Contents (TOC) parsing from H1 (clickable chapters) & H2 (non-clickable subchapters)
 * - Stable, collision-free anchor ID injection strictly on <h1> elements (even with duplicate headings)
 * - Cover aspect ratio mapping (3:4 and 9:16) without destructive cropping
 * - Google Drive cover & book link validation and normalization
 * - Upload file format & size validation
 * - Admin-excluded, deduplicated visit recording guard
 */

import { LibraryCoverAspectRatio } from '../types/index.js';
import {
  extractGoogleDriveFileId,
  getGoogleDriveViewerUrl,
  isGoogleDriveUrl,
  resolveDisplayImageUrl,
  validateArticleImageSource
} from './googleDriveHelper.js';
import { extractCleanHeadingText } from './tableOfContentsHelper.js';

export const MAX_LIBRARY_COVER_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_LIBRARY_COVER_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
];
export const LIBRARY_VISIT_SESSION_KEY = 'dars_library_visit_recorded_v1';

export interface LibrarySubchapterItem {
  title: string;
  isClickable: false;
}

export interface LibraryChapterItem {
  id: string;
  index: number; // 1-based chapter index
  title: string;
  titleHtml: string;
  htmlContent: string;
  subchapters: LibrarySubchapterItem[];
  isClickable: true;
}

export interface ParsedLibraryBookContent {
  hasChapters: boolean;
  hasTocEntries: boolean;
  chapters: LibraryChapterItem[];
  orphanSubchapters: LibrarySubchapterItem[];
  fullHtml: string;
  preambleHtml: string;
}

export interface LibraryFileValidationResult {
  isValid: boolean;
  error?: string;
}

export interface LibraryExternalUrlValidationResult {
  isValid: boolean;
  normalizedUrl: string;
  fileId: string | null;
  error?: string;
}

export function normalizeCoverAspectRatio(value?: string | null): LibraryCoverAspectRatio {
  return value === '9:16' ? '9:16' : '3:4';
}

export function getLibraryCoverAspectClass(ratio?: LibraryCoverAspectRatio | null): string {
  return ratio === '9:16' ? 'aspect-[9/16]' : 'aspect-[3/4]';
}

export function generateLibraryBookSlug(title: string, customSlug?: string): string {
  const source = (customSlug || title || '').trim().toLowerCase();
  const slug = source
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || `buku-${Date.now()}`;
}

/**
 * Parses an optional admin-defined category string into clean display labels.
 * Supports single category ("Fiqih") or comma-separated categories ("Nahwu, Sharaf").
 * Returns an empty array when unset/blank — never invents fallback categories.
 */
export function parseLibraryBookCategories(rawCategory?: string | null): string[] {
  if (!rawCategory || typeof rawCategory !== 'string') return [];
  return rawCategory
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

/**
 * Validates an uploaded cover file's format and size before invoking Firebase Storage upload.
 */
export function validateLibraryCoverFile(file: {
  name: string;
  type: string;
  size: number;
}): LibraryFileValidationResult {
  if (!file) {
    return { isValid: false, error: 'Berkas gambar sampul tidak ditemukan.' };
  }

  const mime = (file.type || '').toLowerCase();
  const hasValidMime = ALLOWED_LIBRARY_COVER_MIME_TYPES.includes(mime);
  const hasValidExt = /\.(jpe?g|png|webp|gif)$/i.test(file.name || '');

  if (!hasValidMime && !hasValidExt) {
    return {
      isValid: false,
      error: 'Format gambar tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.'
    };
  }

  if (file.size <= 0) {
    return {
      isValid: false,
      error: 'Berkas gambar kosong atau rusak.'
    };
  }

  if (file.size > MAX_LIBRARY_COVER_SIZE_BYTES) {
    return {
      isValid: false,
      error: 'Ukuran berkas gambar terlalu besar. Maksimal 5 MB.'
    };
  }

  return { isValid: true };
}

/**
 * Validates a cover image URL (Google Drive sharing link or direct HTTPS/data image URL).
 */
export function validateLibraryCoverUrl(rawUrl: string | null | undefined): {
  isValid: boolean;
  isGoogleDrive: boolean;
  fileId: string | null;
  directUrl: string;
  warning?: string;
  error?: string;
} {
  const result = validateArticleImageSource(rawUrl);
  return {
    isValid: result.isValid,
    isGoogleDrive: result.isGoogleDrive,
    fileId: result.fileId,
    directUrl: result.directUrl,
    warning: result.warning,
    error: result.error
  };
}

/**
 * Validates an external Google Drive book URL (PDF, Docs, Folder, or Viewer link).
 */
export function validateLibraryExternalDriveUrl(
  rawUrl: string | null | undefined
): LibraryExternalUrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return {
      isValid: false,
      normalizedUrl: '',
      fileId: null,
      error: 'Tautan Google Drive wajib diisi untuk buku bertipe eksternal.'
    };
  }

  const trimmed = rawUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      isValid: false,
      normalizedUrl: '',
      fileId: null,
      error: 'Format tautan tidak valid. Pastikan diawali dengan https://drive.google.com/...'
    };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      isValid: false,
      normalizedUrl: '',
      fileId: null,
      error: 'Tautan harus menggunakan protokol https:// atau http://.'
    };
  }

  const host = parsed.hostname.toLowerCase();
  const isAllowedGoogleHost =
    host === 'drive.google.com' ||
    host === 'docs.google.com' ||
    host.endsWith('.google.com');

  if (!isAllowedGoogleHost && !isGoogleDriveUrl(trimmed)) {
    return {
      isValid: false,
      normalizedUrl: '',
      fileId: null,
      error: 'Harap masukkan tautan Google Drive atau Google Docs yang valid (drive.google.com / docs.google.com).'
    };
  }

  const fileId = extractGoogleDriveFileId(trimmed);

  // Check for folder links or docs links which may not have /file/d/
  const isFolderOrDocsLink =
    /\/drive\/(u\/\d+\/)?folders\/[a-zA-Z0-9_-]+/i.test(trimmed) ||
    /docs\.google\.com\/(document|presentation|spreadsheets|viewer)\//i.test(trimmed);

  if (!fileId && !isFolderOrDocsLink) {
    return {
      isValid: false,
      normalizedUrl: '',
      fileId: null,
      error: 'ID berkas Google Drive tidak terdeteksi. Gunakan tautan berbagi seperti https://drive.google.com/file/d/ID_BERKAS/view.'
    };
  }

  return {
    isValid: true,
    normalizedUrl: trimmed,
    fileId
  };
}

/**
 * Validates an OPTIONAL Google Drive PDF link attached to an internal Library book or volume.
 * - Blank/empty input is valid (`normalizedUrl: ''`) because the PDF link is optional.
 * - Non-empty input must be a valid Google Drive / Google Docs URL with a detectable file/document/folder ID.
 * - Converts direct-download Google Drive URLs (e.g. `uc?export=download`) into standard viewer links
 *   so clicking "Lihat PDF" opens Google Drive's viewer in a new tab instead of forcing an auto-download.
 */
export function validateLibraryPdfDriveUrl(
  rawUrl: string | null | undefined
): LibraryExternalUrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return {
      isValid: true,
      normalizedUrl: '',
      fileId: null
    };
  }

  const trimmed = rawUrl.trim();
  const baseCheck = validateLibraryExternalDriveUrl(trimmed);
  if (!baseCheck.isValid) {
    return {
      isValid: false,
      normalizedUrl: '',
      fileId: null,
      error:
        'Format Link PDF (Google Drive) tidak valid. Gunakan tautan berbagi Google Drive seperti https://drive.google.com/file/d/ID_BERKAS/view?usp=sharing.'
    };
  }

  const lower = trimmed.toLowerCase();
  const isDirectDownloadPattern =
    lower.includes('export=download') ||
    lower.includes('/uc?') ||
    lower.includes('/open?');

  const normalizedUrl =
    baseCheck.fileId && isDirectDownloadPattern
      ? getGoogleDriveViewerUrl(baseCheck.fileId)
      : baseCheck.normalizedUrl;

  return {
    isValid: true,
    normalizedUrl,
    fileId: baseCheck.fileId
  };
}

/**
 * Resolves a safe Google Drive viewer URL for the reader's "Lihat PDF" button.
 * Returns `null` when empty or invalid so the button is strictly hidden unless a valid link is present.
 */
export function resolveLibraryPdfViewerUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return null;
  }
  const result = validateLibraryPdfDriveUrl(rawUrl);
  if (!result.isValid || !result.normalizedUrl) {
    return null;
  }
  return result.normalizedUrl;
}

/**
 * Generates a deterministic, collision-free anchor ID for a chapter H1.
 * Includes the 1-based chapter index prefix so duplicate H1 titles ALWAYS produce unique stable IDs.
 */
export function buildChapterAnchorId(
  cleanTitle: string,
  chapterIndex: number,
  existingIds: Set<string>
): string {
  const slug = cleanTitle
    .trim()
    .toLowerCase()
    .replace(/[\s\t\n_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);

  const baseId = slug ? `bab-${chapterIndex}-${slug}` : `bab-${chapterIndex}`;
  let uniqueId = baseId;
  let suffix = 2;
  while (existingIds.has(uniqueId)) {
    uniqueId = `${baseId}-${suffix}`;
    suffix++;
  }
  existingIds.add(uniqueId);
  return uniqueId;
}

/**
 * Extracts non-clickable H2 subchapter titles from an HTML slice.
 */
function extractH2Subchapters(htmlSlice: string): LibrarySubchapterItem[] {
  if (!htmlSlice) return [];
  const items: LibrarySubchapterItem[] = [];
  const h2Regex = /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi;
  let match: RegExpExecArray | null;
  while ((match = h2Regex.exec(htmlSlice)) !== null) {
    const cleanText = extractCleanHeadingText(match[1] || '');
    if (cleanText) {
      items.push({
        title: cleanText,
        isClickable: false
      });
    }
  }
  return items;
}

/**
 * Parses full book HTML written inside a single RichTextEditor into:
 * - Hierarchical TOC: H1 chapters (clickable, unique anchor IDs) -> nested H2 subchapters (NOT clickable)
 * - fullHtml: Complete book HTML with stable `id="..."` and scroll-margin classes injected ONLY on <h1> elements
 * - chapters: Structured per-chapter slices preserving all inner HTML formatting (H2, H3, paragraphs, Arabic text, images, tables)
 */
export function parseLibraryBookContent(rawHtml: string | null | undefined): ParsedLibraryBookContent {
  if (!rawHtml || typeof rawHtml !== 'string' || !rawHtml.trim()) {
    return {
      hasChapters: false,
      hasTocEntries: false,
      chapters: [],
      orphanSubchapters: [],
      fullHtml: '',
      preambleHtml: ''
    };
  }

  const trimmed = rawHtml.trim();
  const h1Regex = /<h1\b([^>]*)>([\s\S]*?)<\/h1>/gi;

  interface RawH1Match {
    startIndex: number;
    fullLength: number;
    attrs: string;
    innerHtml: string;
    cleanText: string;
    anchorId: string;
    chapterNumber: number;
    replacementTag: string;
  }

  const matches: RawH1Match[] = [];
  const existingIds = new Set<string>();
  let regexMatch: RegExpExecArray | null;
  let chapterCounter = 0;

  while ((regexMatch = h1Regex.exec(trimmed)) !== null) {
    const rawAttrs = regexMatch[1] || '';
    const innerHtml = regexMatch[2] || '';
    const cleanText = extractCleanHeadingText(innerHtml);
    if (!cleanText) continue;

    chapterCounter++;
    const anchorId = buildChapterAnchorId(cleanText, chapterCounter, existingIds);

    let updatedAttrs = rawAttrs;
    if (/\bid\s*=\s*["'][^"']*["']/i.test(updatedAttrs)) {
      updatedAttrs = updatedAttrs.replace(/\bid\s*=\s*["'][^"']*["']/i, `id="${anchorId}"`);
    } else {
      updatedAttrs = ` id="${anchorId}"${updatedAttrs}`;
    }

    if (/\bclass\s*=\s*["']([^"']*)["']/i.test(updatedAttrs)) {
      updatedAttrs = updatedAttrs.replace(
        /\bclass\s*=\s*["']([^"']*)["']/i,
        (_m: string, cls: string) => {
          const nextCls = cls.includes('scroll-mt-') ? cls : `${cls} scroll-mt-24 sm:scroll-mt-28`;
          return `class="${nextCls}"`;
        }
      );
    } else {
      updatedAttrs = ` class="scroll-mt-24 sm:scroll-mt-28"${updatedAttrs}`;
    }

    matches.push({
      startIndex: regexMatch.index,
      fullLength: regexMatch[0].length,
      attrs: rawAttrs,
      innerHtml,
      cleanText,
      anchorId,
      chapterNumber: chapterCounter,
      replacementTag: `<h1${updatedAttrs}>${innerHtml}</h1>`
    });
  }

  // No H1 headings found: keep fullHtml untouched and detect any top-level H2s (non-clickable)
  if (matches.length === 0) {
    const orphanSubchapters = extractH2Subchapters(trimmed);
    return {
      hasChapters: false,
      hasTocEntries: orphanSubchapters.length > 0,
      chapters: [],
      orphanSubchapters,
      fullHtml: trimmed,
      preambleHtml: trimmed
    };
  }

  // Preamble before the first H1
  const preambleHtml = trimmed.slice(0, matches[0].startIndex).trim();
  const orphanSubchapters = extractH2Subchapters(preambleHtml);

  // Build fullHtml with unique anchor IDs injected ONLY on H1 elements
  let fullHtmlParts: string[] = [];
  let cursor = 0;
  const chapters: LibraryChapterItem[] = [];

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    fullHtmlParts.push(trimmed.slice(cursor, current.startIndex));
    fullHtmlParts.push(current.replacementTag);
    cursor = current.startIndex + current.fullLength;

    const bodyStart = current.startIndex + current.fullLength;
    const bodyEnd = i < matches.length - 1 ? matches[i + 1].startIndex : trimmed.length;
    const bodyHtml = trimmed.slice(bodyStart, bodyEnd).trim();
    const subchapters = extractH2Subchapters(bodyHtml);

    chapters.push({
      id: current.anchorId,
      index: current.chapterNumber,
      title: current.cleanText,
      titleHtml: current.innerHtml.trim(),
      htmlContent: bodyHtml,
      subchapters,
      isClickable: true
    });
  }

  fullHtmlParts.push(trimmed.slice(cursor));
  const fullHtml = fullHtmlParts.join('');

  return {
    hasChapters: chapters.length > 0,
    hasTocEntries: chapters.length > 0 || orphanSubchapters.length > 0,
    chapters,
    orphanSubchapters,
    fullHtml,
    preambleHtml
  };
}

/**
 * Estimates reading time in minutes for internal book HTML content.
 */
export function estimateBookReadingMinutes(html: string | null | undefined): number {
  if (!html) return 1;
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return Math.max(1, Math.ceil(words / 180));
}

/**
 * Determines whether a visit to the main Library page should increment the public visit counter.
 * - Excludes admins so admin QA/management never inflates visitor statistics.
 * - Waits until auth state finishes resolving so admins are not miscounted before role loads.
 * - Prevents duplicate increments on React re-renders or repeated visits within the same browser session.
 */
export function shouldRecordLibraryVisit(params: {
  isAdmin: boolean;
  authLoading: boolean;
  alreadyRecordedInMemory: boolean;
  alreadyRecordedInSession: boolean;
}): boolean {
  if (params.authLoading) return false;
  if (params.isAdmin) return false;
  if (params.alreadyRecordedInMemory) return false;
  if (params.alreadyRecordedInSession) return false;
  return true;
}

/**
 * Resolves a cover image URL cleanly for display (supports Google Drive & direct storage URLs).
 */
export function resolveLibraryCoverUrl(rawUrl: string | null | undefined): string {
  return resolveDisplayImageUrl(rawUrl);
}

/**
 * Builds the canonical shareable URL for a Library Digital book.
 * ALWAYS points to the public Book Detail Page (`/library/:slug`), NEVER directly to Google Drive
 * or the internal reader (`/baca`), so recipients see the book overview without needing to log in.
 */
export function buildLibraryBookShareUrl(
  book: { id: string; slug?: string },
  origin = 'https://darswithosama.com'
): string {
  const cleanOrigin = (origin || 'https://darswithosama.com').replace(/\/+$/, '');
  const key = (book.slug || book.id || '').trim();
  if (!key) return `${cleanOrigin}/library`;
  return `${cleanOrigin}/library/${encodeURIComponent(key)}`;
}

/**
 * Prepares Web Share API payload for sharing a Library Digital book (both Google Drive & internal).
 */
export function buildLibraryBookShareData(
  book: { id: string; slug?: string; title: string; author?: string },
  origin = 'https://darswithosama.com'
): { title: string; text: string; url: string } {
  const url = buildLibraryBookShareUrl(book, origin);
  const title = (book.title || 'Kitab Library Digital').trim();
  const author = (book.author || '').trim();
  const text = author
    ? `Yuk, baca kitab "${title}" karya ${author} di Library Digital Dars with Osama:`
    : `Yuk, baca kitab "${title}" di Library Digital Dars with Osama:`;
  return { title, text, url };
}

export type LibraryLoadErrorCategory =
  | 'permission-denied'
  | 'network-error'
  | 'quota-exceeded'
  | 'index-required'
  | 'unknown-error';

export interface LibraryLoadErrorInfo {
  category: LibraryLoadErrorCategory;
  code: string;
  title: string;
  message: string;
  canRetry: boolean;
}

/**
 * Classifies Firestore errors during public Library Digital reads so failures are NEVER
 * disguised as an empty library collection or "book not found".
 */
export function classifyLibraryLoadError(
  error: unknown,
  scope: 'books' | 'volumes' = 'books'
): LibraryLoadErrorInfo {
  const rawMsg = error instanceof Error ? error.message : String(error || '');
  const lowerMsg = rawMsg.toLowerCase();
  const code = (error as any)?.code ? String((error as any).code).toLowerCase() : '';

  if (
    code.includes('permission-denied') ||
    lowerMsg.includes('missing or insufficient permissions') ||
    lowerMsg.includes('permission-denied')
  ) {
    return {
      category: 'permission-denied',
      code: code || 'permission-denied',
      title:
        scope === 'volumes'
          ? 'Akses Pembacaan Jilid Publik Ditolak'
          : 'Akses Pembacaan Library Publik Ditolak',
      message:
        scope === 'volumes'
          ? 'Permintaan ke subkoleksi jilid (libraryBooks/{bookId}/volumes) ditolak oleh aturan keamanan Firestore (permission-denied). Pastikan aturan keamanan terbaru untuk subkoleksi volumes sudah dipublikasikan pada database aktif.'
          : 'Permintaan ke database Library ditolak oleh aturan keamanan Firestore (permission-denied). Pastikan aturan keamanan terbaru untuk koleksi libraryBooks sudah dipublikasikan pada database aktif.',
      canRetry: true
    };
  }

  if (
    code.includes('resource-exhausted') ||
    lowerMsg.includes('quota exceeded') ||
    lowerMsg.includes('resource-exhausted')
  ) {
    return {
      category: 'quota-exceeded',
      code: code || 'resource-exhausted',
      title: 'Kuota Pembacaan Server Tercapai',
      message:
        'Batas harian pembacaan database Firestore sedang tercapai sehingga koleksi Library belum dapat dimuat saat ini. Silakan coba lagi nanti.',
      canRetry: true
    };
  }

  if (
    code.includes('unavailable') ||
    code.includes('deadline-exceeded') ||
    lowerMsg.includes('client is offline') ||
    lowerMsg.includes('failed to get document') ||
    lowerMsg.includes('network') ||
    lowerMsg.includes('unavailable')
  ) {
    return {
      category: 'network-error',
      code: code || 'unavailable',
      title: 'Gagal Terhubung ke Server Library',
      message:
        'Koneksi ke Cloud Firestore sedang terputus atau tidak stabil. Periksa koneksi internet Anda lalu coba muat ulang.',
      canRetry: true
    };
  }

  if (code.includes('failed-precondition') || lowerMsg.includes('requires an index')) {
    return {
      category: 'index-required',
      code: code || 'failed-precondition',
      title: 'Konfigurasi Indeks Kueri Belum Siap',
      message:
        'Kueri pencarian kitab membutuhkan indeks Firestore yang belum aktif. Silakan muat ulang atau hubungi administrator.',
      canRetry: true
    };
  }

  return {
    category: 'unknown-error',
    code: code || 'firestore-error',
    title: 'Gagal Memuat Data Library Digital',
    message:
      'Terjadi kendala saat mengambil data koleksi kitab dari server. Silakan coba muat ulang beberapa saat lagi.',
    canRetry: true
  };
}

/**
 * Matches a Library book against a URL slug or document ID safely (case-insensitive slug, exact ID).
 */
export function matchLibraryBookByIdentifier<T extends { id: string; slug?: string }>(
  books: T[],
  identifier: string | null | undefined
): T | undefined {
  const cleanId = (identifier || '').trim();
  if (!cleanId) return undefined;
  const cleanSlug = cleanId.toLowerCase();
  return books.find(
    b => b.id === cleanId || (b.slug || '').trim().toLowerCase() === cleanSlug
  );
}

/**
 * Normalizes collectionType with full backward compatibility for existing books without this field.
 */
export function normalizeLibraryCollectionType(value?: string | null): 'single' | 'multi_volume' {
  return value === 'multi_volume' ? 'multi_volume' : 'single';
}

export function isMultiVolumeLibraryBook(book?: { collectionType?: string | null } | null): boolean {
  return normalizeLibraryCollectionType(book?.collectionType) === 'multi_volume';
}

/**
 * Sorts volumes deterministically ascending by `order`, then `volumeNumber`, then `createdAt`.
 */
export function sortLibraryBookVolumes<
  T extends { order?: number; volumeNumber?: number; createdAt?: string }
>(volumes: T[]): T[] {
  return [...volumes].sort((a, b) => {
    const orderA = typeof a.order === 'number' && Number.isFinite(a.order) ? a.order : (a.volumeNumber || 0);
    const orderB = typeof b.order === 'number' && Number.isFinite(b.order) ? b.order : (b.volumeNumber || 0);
    if (orderA !== orderB) return orderA - orderB;

    const numA = typeof a.volumeNumber === 'number' && Number.isFinite(a.volumeNumber) ? a.volumeNumber : 0;
    const numB = typeof b.volumeNumber === 'number' && Number.isFinite(b.volumeNumber) ? b.volumeNumber : 0;
    if (numA !== numB) return numA - numB;

    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeA - timeB;
  });
}

/**
 * Returns a new reordered volume list with sequential 1-based `order` and `volumeNumber`.
 * Pure & immutable — never mutates individual volume content or links.
 */
export function reorderLibraryBookVolumesList<
  T extends { id: string; order: number; volumeNumber: number }
>(volumes: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= volumes.length ||
    toIndex >= volumes.length ||
    fromIndex === toIndex
  ) {
    return volumes.map((v, idx) => ({ ...v, order: idx + 1, volumeNumber: idx + 1 }));
  }

  const next = [...volumes];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);

  return next.map((vol, idx) => ({
    ...vol,
    order: idx + 1,
    volumeNumber: idx + 1
  }));
}

/**
 * Strictly filters volumes visible to unauthenticated/public visitors (published only).
 */
export function filterPublicLibraryVolumes<T extends { status?: string }>(volumes: T[]): T[] {
  return volumes.filter(v => v.status === 'published');
}

/**
 * Builds the canonical URL for reading a specific internal volume of a multi-volume book.
 */
export function buildLibraryVolumeReadUrl(
  book: { id: string; slug?: string },
  volumeId: string,
  origin = 'https://darswithosama.com'
): string {
  const cleanOrigin = (origin || 'https://darswithosama.com').replace(/\/+$/, '');
  const bookKey = (book.slug || book.id || '').trim();
  const cleanVolId = (volumeId || '').trim();
  if (!bookKey) return `${cleanOrigin}/library`;
  if (!cleanVolId) return `${cleanOrigin}/library/${encodeURIComponent(bookKey)}`;
  return `${cleanOrigin}/library/${encodeURIComponent(bookKey)}/jilid/${encodeURIComponent(cleanVolId)}`;
}



