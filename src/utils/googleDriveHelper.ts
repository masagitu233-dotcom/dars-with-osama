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
