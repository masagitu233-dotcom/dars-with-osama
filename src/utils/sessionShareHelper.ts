import type { Course, Session } from '../types/index.ts';

export const DEFAULT_SESSION_COVER_IMAGE =
  'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=1200&q=80';

/**
 * Extracts an 11-character YouTube video ID from standard watch URLs, short links,
 * embed URLs, shorts, or raw 11-character IDs.
 */
export function extractYouTubeVideoId(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Direct 11-character YouTube ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Standard YouTube URL patterns (watch?v=, youtu.be/, embed/, shorts/, v/)
  const regExp =
    /(?:youtube(?:-nocookie)?\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);
  return match && match[1] ? match[1] : null;
}

/**
 * Resolves the public thumbnail image URL for a learning session.
 * Priority:
 * 1. YouTube high-quality video thumbnail (https://i.ytimg.com/vi/{videoId}/hqdefault.jpg)
 * 2. Course cover image URL (if publicly accessible HTTP/HTTPS URL)
 * 3. Default public Dars with Osama cover image
 */
export function getSessionThumbnailUrl(
  session?: Pick<Session, 'youtubeUrl'> | null,
  course?: Pick<Course, 'id' | 'coverImageUrl'> | null,
  origin = 'https://darswithosama.com'
): string {
  const videoId = extractYouTubeVideoId(session?.youtubeUrl);
  if (videoId) {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }

  if (course?.coverImageUrl && typeof course.coverImageUrl === 'string') {
    const trimmedCover = course.coverImageUrl.trim();
    if (/^https?:\/\//i.test(trimmedCover)) {
      return trimmedCover;
    }
    if (/^data:image\//i.test(trimmedCover) && course.id) {
      const cleanOrigin = (origin || 'https://darswithosama.com').replace(/\/+$/, '');
      return `${cleanOrigin}/covers/${encodeURIComponent(course.id)}.jpg`;
    }
  }

  return DEFAULT_SESSION_COVER_IMAGE;
}

/**
 * Generates a clean URL-friendly slug from a session title, with fallback to session ID.
 * E.g. "sesi 01: kalam" -> "sesi-01-kalam"
 *      "sesi 02: I'rab dan Bina'" -> "sesi-02-irab-dan-bina"
 */
export function generateSessionSlug(title?: string, fallbackId?: string): string {
  if (!title || typeof title !== 'string') {
    return fallbackId || 'sesi-pembelajaran';
  }

  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/['’`ʼʻ]/g, '') // remove apostrophes / hamzah transliteration marks
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumeric to hyphen
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
    .replace(/-{2,}/g, '-');

  return slug || fallbackId || 'sesi-pembelajaran';
}

/**
 * Checks whether a URL route parameter (ID, slug, or slug--id) matches a given session.
 */
export function matchesSessionIdentifier(
  session: Pick<Session, 'id' | 'title'>,
  identifier?: string | null
): boolean {
  if (!session || !identifier) return false;
  const cleanParam = decodeURIComponent(identifier).trim().replace(/\/+$/, '');
  if (!cleanParam) return false;

  if (session.id === cleanParam || session.id.toLowerCase() === cleanParam.toLowerCase()) {
    return true;
  }

  const slug = generateSessionSlug(session.title, session.id);
  if (slug.toLowerCase() === cleanParam.toLowerCase()) {
    return true;
  }

  if (cleanParam.toLowerCase().endsWith(`--${session.id.toLowerCase()}`)) {
    return true;
  }

  return false;
}

/**
 * Determines whether a session is safe for public access and social metadata generation
 * without leaking unpublished or draft content.
 */
export function canAccessSessionPublicly(
  session?: Pick<Session, 'isPublished'> | null,
  course?: Pick<Course, 'isPublished'> | null
): boolean {
  if (!session || session.isPublished !== true) {
    return false;
  }
  if (course && course.isPublished !== true) {
    return false;
  }
  return true;
}

/**
 * Builds the permanent canonical URL for a session.
 * Uses /session/{id} as the unambiguous permanent identifier (and /session/{slug} is also supported by the router).
 */
export function buildSessionShareUrl(
  session: Pick<Session, 'id' | 'title'>,
  origin = 'https://darswithosama.com'
): string {
  const cleanOrigin = (origin || 'https://darswithosama.com').replace(/\/+$/, '');
  return `${cleanOrigin}/session/${encodeURIComponent(session.id)}`;
}

/**
 * Builds the human-readable slug URL variant for a session.
 */
export function buildSessionSlugUrl(
  session: Pick<Session, 'id' | 'title'>,
  origin = 'https://darswithosama.com'
): string {
  const cleanOrigin = (origin || 'https://darswithosama.com').replace(/\/+$/, '');
  const slug = generateSessionSlug(session.title, session.id);
  return `${cleanOrigin}/session/${encodeURIComponent(slug)}`;
}

/**
 * Strips HTML tags and normalizes whitespace for clean plain-text descriptions.
 */
export function stripSessionHtml(text?: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Escapes special characters for safe HTML attribute and tag injection.
 */
export function escapeHtmlAttr(value?: string): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Builds all share titles, invitation descriptions, and formatted share text for a session.
 */
export function buildSessionShareData(
  session: Pick<Session, 'id' | 'title' | 'description' | 'youtubeUrl'>,
  course?: Pick<Course, 'id' | 'title' | 'coverImageUrl'> | null,
  origin = 'https://darswithosama.com'
) {
  const url = buildSessionShareUrl(session, origin);
  const slugUrl = buildSessionSlugUrl(session, origin);
  const thumbnailUrl = getSessionThumbnailUrl(session, course, origin);
  const courseName = course?.title ? course.title.trim() : '';

  const pageTitle = courseName
    ? `${session.title} — ${courseName} | Dars with Osama`
    : `${session.title} | Dars with Osama`;

  const ogTitle = courseName
    ? `${session.title} (${courseName}) | Dars with Osama`
    : `${session.title} | Dars with Osama`;

  const cleanDesc = stripSessionHtml(session.description || '');
  const invitationPrefix = courseName
    ? `Yuk, pelajari sesi "${session.title}" pada kajian ${courseName} bersama Dars with Osama.`
    : `Yuk, pelajari sesi "${session.title}" bersama Dars with Osama.`;

  const ogDescription = cleanDesc
    ? `${invitationPrefix} ${cleanDesc} Tonton video pembelajaran dan simak catatannya di sini.`
    : `${invitationPrefix} Tonton video pembelajaran, catatan ilmiah, dan faedah kajian selengkapnya di Dars with Osama.`;

  // Truncate ogDescription cleanly to ~220 chars for optimal social card display
  const finalOgDescription =
    ogDescription.length > 240 ? `${ogDescription.slice(0, 237).trim()}...` : ogDescription;

  const shareMessage = `Yuk, pelajari sesi ${session.title} bersama Dars with Osama. Tonton videonya di sini: ${url}`;

  return {
    url,
    slugUrl,
    thumbnailUrl,
    pageTitle,
    ogTitle,
    ogDescription: finalOgDescription,
    shareMessage,
    siteName: 'Dars with Osama'
  };
}

/**
 * Generates the HTML meta tags string for a learning session (<title>, OpenGraph, Twitter Card, Canonical).
 */
export function buildSessionMetaTagsHtml(
  session: Pick<Session, 'id' | 'title' | 'description' | 'youtubeUrl'>,
  course?: Pick<Course, 'id' | 'title' | 'coverImageUrl'> | null,
  origin = 'https://darswithosama.com'
): string {
  const data = buildSessionShareData(session, course, origin);

  return `
      <title>${escapeHtmlAttr(data.pageTitle)}</title>
      <meta name="description" content="${escapeHtmlAttr(data.ogDescription)}" />
      <meta property="og:type" content="video.other" />
      <meta property="og:site_name" content="${escapeHtmlAttr(data.siteName)}" />
      <meta property="og:title" content="${escapeHtmlAttr(data.ogTitle)}" />
      <meta property="og:description" content="${escapeHtmlAttr(data.ogDescription)}" />
      <meta property="og:image" content="${escapeHtmlAttr(data.thumbnailUrl)}" />
      <meta property="og:image:secure_url" content="${escapeHtmlAttr(data.thumbnailUrl)}" />
      <meta property="og:image:alt" content="${escapeHtmlAttr(session.title)}" />
      <meta property="og:url" content="${escapeHtmlAttr(data.url)}" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${escapeHtmlAttr(data.ogTitle)}" />
      <meta name="twitter:description" content="${escapeHtmlAttr(data.ogDescription)}" />
      <meta name="twitter:image" content="${escapeHtmlAttr(data.thumbnailUrl)}" />
      <link rel="canonical" href="${escapeHtmlAttr(data.url)}" />`;
}

/**
 * Replaces existing title, description, OpenGraph, Twitter, and canonical tags in an HTML template
 * with the specific route's SEO meta tags so social media crawlers read the exact tags in the initial HTML.
 */
export function injectSeoMetaIntoHtml(baseHtml: string, seoMetaTags: string): string {
  let html = baseHtml.replace(/(href|src)="\.\//g, '$1="/');
  html = html.replace(/<title>[\s\S]*?<\/title>/gi, '');
  html = html.replace(/<meta\s+name="description"[^>]*>/gi, '');
  html = html.replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '');
  html = html.replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '');
  html = html.replace(/<link\s+rel="canonical"[^>]*>/gi, '');
  html = html.replace('</head>', `${seoMetaTags}\n</head>`);
  return html;
}
