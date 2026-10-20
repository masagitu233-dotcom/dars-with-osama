import {
  buildSessionMetaTagsHtml,
  canAccessSessionPublicly,
  injectSeoMetaIntoHtml,
  matchesSessionIdentifier
} from '../../src/utils/sessionShareHelper.ts';
import type { Course, Session } from '../../src/types/index.ts';

async function resolvePublishedSessionOnEdge(
  identifier: string,
  origin: string
): Promise<{ session: Session; course: Course | null } | null> {
  try {
    const manifestRes = await fetch(new URL('/session-seo-manifest.json', origin).toString());
    if (manifestRes.ok) {
      const manifest = await manifestRes.json();
      for (const entry of manifest.entries || []) {
        const session = entry.session as Session;
        const course = entry.course as Course;
        if (matchesSessionIdentifier(session, identifier)) {
          if (!canAccessSessionPublicly(session, course)) {
            return null;
          }
          return { session, course };
        }
      }
    }
  } catch {
    // Fallback if manifest unavailable
  }
  return null;
}

export default async function sessionSeoEdgeHandler(
  request: Request,
  context: { next: () => Promise<Response> }
): Promise<Response> {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  const url = new URL(request.url);
  const pathMatch = url.pathname.match(/^\/session\/([^/]+)\/?$/i);
  const identifier = pathMatch
    ? decodeURIComponent(pathMatch[1])
    : url.searchParams.get('session') || url.searchParams.get('sessionId');

  if (!identifier) {
    return response;
  }

  const html = await response.text();

  // If already statically pre-rendered with video.other OpenGraph tag, return directly
  if (html.includes('<meta property="og:type" content="video.other" />')) {
    return new Response(html, {
      status: response.status,
      headers: response.headers
    });
  }

  const resolved = await resolvePublishedSessionOnEdge(identifier, url.origin);
  if (!resolved) {
    return new Response(html, {
      status: response.status,
      headers: response.headers
    });
  }

  const seoMetaTags = buildSessionMetaTagsHtml(
    resolved.session,
    resolved.course,
    url.origin
  );
  const updatedHtml = injectSeoMetaIntoHtml(html, seoMetaTags);

  const headers = new Headers(response.headers);
  headers.set('content-type', 'text/html; charset=UTF-8');

  return new Response(updatedHtml, {
    status: response.status,
    headers
  });
}
