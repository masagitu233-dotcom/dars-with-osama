/**
 * Google Drive Image & Media URL Helper for Dars with Osama.
 *
 * Resolves Google Drive file links into direct-renderable image endpoints,
 * handles multi-tier fallback candidates (thumbnail -> lh3 CDN -> uc?export=view),
 * and provides diagnostic and recovery helpers for restricted / inaccessible files.
 */

// Google Drive file IDs typically consist of 25 to 50 alphanumeric characters, hyphens, and underscores.
const GOOGLE_DRIVE_ID_REGEX = /^[a-zA-Z0-9_-]{10,100}$/;

/**
 * Extracts the unique Google Drive file ID from various link formats:
 * - https://drive.google.com/file/d/{FILE_ID}/view?usp=sharing
 * - https://drive.google.com/file/d/{FILE_ID}/view
 * - https://drive.google.com/file/d/{FILE_ID}
 * - https://drive.google.com/open?id={FILE_ID}
 * - https://drive.google.com/uc?id={FILE_ID}&export=download
 * - https://drive.google.com/uc?export=view&id={FILE_ID}
 * - https://drive.google.com/thumbnail?id={FILE_ID}
 * - https://lh3.googleusercontent.com/d/{FILE_ID}
 * - https://docs.google.com/file/d/{FILE_ID}/edit
 */
export function extractGoogleDriveFileId(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Check 1: /file/d/{FILE_ID} pattern
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1] && GOOGLE_DRIVE_ID_REGEX.test(fileDMatch[1])) {
    return fileDMatch[1];
  }

  // Check 2: /d/{FILE_ID} pattern (e.g. lh3.googleusercontent.com/d/{FILE_ID})
  const cdnDMatch = trimmed.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (cdnDMatch && cdnDMatch[1] && GOOGLE_DRIVE_ID_REGEX.test(cdnDMatch[1])) {
    return cdnDMatch[1];
  }

  // Check 3: Query parameter id={FILE_ID} (e.g. open?id=..., uc?id=..., thumbnail?id=...)
  try {
    const urlObj = new URL(trimmed);
    const idParam = urlObj.searchParams.get('id');
    if (idParam && GOOGLE_DRIVE_ID_REGEX.test(idParam)) {
      return idParam;
    }
  } catch {
    // If not a full URL with scheme, fallback to regex search for ?id= or &id=
    const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idParamMatch && idParamMatch[1] && GOOGLE_DRIVE_ID_REGEX.test(idParamMatch[1])) {
      return idParamMatch[1];
    }
  }

  return null;
}

/**
 * Returns true if the URL points to Google Drive or Google Docs file hosting.
 */
export function isGoogleDriveUrl(rawUrl: string | null | undefined): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim().toLowerCase();
  if (
    trimmed.includes('drive.google.com') ||
    trimmed.includes('docs.google.com/file') ||
    trimmed.includes('lh3.googleusercontent.com/d/')
  ) {
    return true;
  }
  return extractGoogleDriveFileId(rawUrl) !== null;
}

/**
 * Returns an ordered array of candidate image URLs to attempt rendering.
 *
 * For Google Drive:
 * 1. Thumbnail API with high-resolution width sz=w1600 (official, reliable, CORS enabled)
 * 2. lh3 Google CDN direct endpoint with width constraint
 * 3. Direct uc?export=view endpoint
 * 4. Original URL as ultimate fallback
 *
 * For non-Drive images: returns an array containing just the trimmed URL.
 */
export function getGoogleDriveImageCandidates(rawUrl: string | null | undefined): string[] {
  if (!rawUrl || typeof rawUrl !== 'string') return [];
  const trimmed = rawUrl.trim();
  if (!trimmed) return [];

  const fileId = extractGoogleDriveFileId(trimmed);
  if (!fileId) {
    return [trimmed];
  }

  const candidates: string[] = [
    // 1. High resolution thumbnail (Most robust across browsers & CORS)
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
    // 2. Google User Content CDN
    `https://lh3.googleusercontent.com/d/${fileId}=w1600`,
    // 3. User Content export view
    `https://drive.google.com/uc?export=view&id=${fileId}`
  ];

  // If the raw URL was none of the above, append it as a last-resort fallback
  if (!candidates.includes(trimmed)) {
    candidates.push(trimmed);
  }

  return candidates;
}

/**
 * Returns the best primary direct image URL for a given input.
 * Useful for immediate preview or default src assignment.
 */
export function resolveDisplayImageUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  const fileId = extractGoogleDriveFileId(trimmed);
  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
  }

  return trimmed;
}

/**
 * Returns a canonical Google Drive viewer web URL to open the file in a new tab.
 */
export function getGoogleDriveViewerUrl(fileIdOrUrl: string): string {
  const fileId = extractGoogleDriveFileId(fileIdOrUrl) || fileIdOrUrl.trim();
  return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
}

export interface ArticleImageValidationResult {
  isValid: boolean;
  isGoogleDrive: boolean;
  fileId: string | null;
  directUrl: string;
  originalUrl: string;
  warning?: string;
  error?: string;
}

/**
 * Validates an image URL for an article (thumbnail or inline image).
 * Differentiates Google Drive sharing/preview URLs from direct renderable image endpoints.
 */
export function validateArticleImageSource(rawUrl: string | null | undefined): ArticleImageValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      isValid: false,
      isGoogleDrive: false,
      fileId: null,
      directUrl: '',
      originalUrl: '',
      error: 'URL gambar tidak boleh kosong.'
    };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      isValid: false,
      isGoogleDrive: false,
      fileId: null,
      directUrl: '',
      originalUrl: '',
      error: 'URL gambar tidak boleh kosong.'
    };
  }

  const isDrive = isGoogleDriveUrl(trimmed);
  if (isDrive) {
    const fileId = extractGoogleDriveFileId(trimmed);
    if (!fileId) {
      return {
        isValid: false,
        isGoogleDrive: true,
        fileId: null,
        directUrl: '',
        originalUrl: trimmed,
        error: 'Format tautan Google Drive tidak valid atau ID berkas tidak ditemukan. Pastikan tautan berbentuk https://drive.google.com/file/d/FILE_ID/view.'
      };
    }

    const directUrl = resolveDisplayImageUrl(trimmed);
    return {
      isValid: true,
      isGoogleDrive: true,
      fileId,
      directUrl,
      originalUrl: trimmed,
      warning: 'Pastikan setelan berbagi di Google Drive telah diatur ke "Siapa saja yang memiliki link" (Anyone with the link) agar gambar dapat tampil untuk seluruh pengunjung.'
    };
  }

  // Non-Google Drive URL
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return {
        isValid: true,
        isGoogleDrive: false,
        fileId: null,
        directUrl: trimmed,
        originalUrl: trimmed
      };
    }
  } catch {
    // If relative or data URL
    if (trimmed.startsWith('/') || trimmed.startsWith('data:image/')) {
      return {
        isValid: true,
        isGoogleDrive: false,
        fileId: null,
        directUrl: trimmed,
        originalUrl: trimmed
      };
    }
  }

  return {
    isValid: false,
    isGoogleDrive: false,
    fileId: null,
    directUrl: '',
    originalUrl: trimmed,
    error: 'Format URL tidak valid. Gunakan tautan yang diawali http:// atau https://.'
  };
}

/**
 * Normalizes all <img> elements inside article HTML content:
 * - Detects Google Drive sharing links in src
 * - Converts them automatically to high-resolution direct image endpoints
 * - Stores the original URL in data-original-src for data preservation
 * - Injects data-drive-id for runtime fallback cascading
 * - Ensures responsive styling: w-full h-auto max-w-full rounded-lg border-2 border-[#171717] dark:border-[#4CA7A1]
 * - Ensures lazy loading
 */
export function normalizeArticleHtmlImages(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  return rawHtml.replace(/<img\b([^>]*)\/?>/gi, (_fullMatch, rawAttrs: string) => {
    // Extract src
    const srcMatch = rawAttrs.match(/src\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const rawSrc = srcMatch ? (srcMatch[1] ?? srcMatch[2] ?? srcMatch[3] ?? '') : '';
    const decodedSrc = rawSrc.replace(/&amp;/g, '&');

    if (!decodedSrc) {
      return '';
    }

    // Extract alt
    const altMatch = rawAttrs.match(/alt\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const altText = altMatch ? (altMatch[1] ?? altMatch[2] ?? '') : 'Gambar Artikel';

    // Extract caption / title if present
    const titleMatch = rawAttrs.match(/title\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const titleAttr = titleMatch ? ` title="${titleMatch[1] ?? titleMatch[2] ?? ''}"` : '';

    // Check if Google Drive
    const isDrive = isGoogleDriveUrl(decodedSrc);
    const fileId = extractGoogleDriveFileId(decodedSrc);

    let finalSrc = decodedSrc;
    let driveAttrs = '';

    if (isDrive && fileId) {
      finalSrc = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
      driveAttrs = ` data-drive-id="${fileId}" data-original-src="${decodedSrc.replace(/"/g, '&quot;')}"`;
    }

    // Check existing classes or apply responsive classes
    const classMatch = rawAttrs.match(/class\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    let classVal = classMatch ? (classMatch[1] ?? classMatch[2] ?? '') : '';

    if (!classVal) {
      classVal = 'w-full h-auto max-w-full rounded-lg border-2 border-[#171717] dark:border-[#4CA7A1] my-2 shadow-xs';
    } else {
      // Ensure max-w-full and h-auto are present for mobile responsiveness
      if (!classVal.includes('max-w-full')) classVal += ' max-w-full';
      if (!classVal.includes('h-auto')) classVal += ' h-auto';
    }

    return `<img src="${finalSrc.replace(/"/g, '&quot;')}" alt="${altText.replace(/"/g, '&quot;')}" class="${classVal.replace(/"/g, '&quot;')}" loading="lazy"${driveAttrs}${titleAttr} />`;
  });
}

/**
 * Extracts metadata for all images found inside article HTML content.
 */
export function extractArticleImages(html: string): Array<{
  src: string;
  isDrive: boolean;
  fileId: string | null;
  alt: string;
}> {
  if (!html || typeof html !== 'string') return [];
  const results: Array<{ src: string; isDrive: boolean; fileId: string | null; alt: string }> = [];

  const regex = /<img\b([^>]*)\/?>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const rawAttrs = match[1] || '';
    const srcMatch = rawAttrs.match(/src\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const rawSrc = srcMatch ? (srcMatch[1] ?? srcMatch[2] ?? srcMatch[3] ?? '').replace(/&amp;/g, '&') : '';

    const altMatch = rawAttrs.match(/alt\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const alt = altMatch ? (altMatch[1] ?? altMatch[2] ?? '') : '';

    if (rawSrc) {
      results.push({
        src: rawSrc,
        isDrive: isGoogleDriveUrl(rawSrc),
        fileId: extractGoogleDriveFileId(rawSrc),
        alt
      });
    }
  }

  return results;
}

/**
 * Tests in the browser if an image URL can be loaded successfully.
 * Attempts candidate URLs sequentially if candidate is Google Drive.
 */
export async function testLoadImage(
  rawUrl: string,
  timeoutMs = 7000
): Promise<{ success: boolean; resolvedUrl?: string; error?: string }> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return { success: true, resolvedUrl: rawUrl };
  }

  const candidates = getGoogleDriveImageCandidates(rawUrl);
  if (candidates.length === 0) {
    return { success: false, error: 'URL tidak valid.' };
  }

  for (const candidate of candidates) {
    const outcome = await new Promise<boolean>((resolve) => {
      const img = new Image();
      let finished = false;

      const timer = setTimeout(() => {
        if (!finished) {
          finished = true;
          img.onload = null;
          img.onerror = null;
          resolve(false);
        }
      }, timeoutMs);

      img.onload = () => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          resolve(true);
        }
      };

      img.onerror = () => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          resolve(false);
        }
      };

      img.src = candidate;
    });

    if (outcome) {
      return { success: true, resolvedUrl: candidate };
    }
  }

  const isDrive = isGoogleDriveUrl(rawUrl);
  const errorMsg = isDrive
    ? 'Gambar tidak dapat dimuat dari Google Drive. Pastikan setelan berbagi di Google Drive telah diatur ke "Siapa saja yang memiliki link" (Anyone with the link).'
    : 'Gambar tidak dapat dimuat dari tautan yang diberikan. Periksa kembali keabsahan URL.';

  return { success: false, error: errorMsg };
}

