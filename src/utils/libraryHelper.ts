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
