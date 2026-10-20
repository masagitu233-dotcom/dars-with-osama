import { useEffect } from 'react';
import { Course, Session } from '../types';
import {
  buildSessionShareData,
  canAccessSessionPublicly
} from '../utils/sessionShareHelper';

/**
 * Hook to dynamically update document title, OpenGraph tags, Twitter Card metadata,
 * canonical URL, browser history URL, and Schema.org JSON-LD for the active learning session.
 */
export function useSessionSEO(session: Session | null, course?: Course | null) {
  useEffect(() => {
    if (!session || !canAccessSessionPublicly(session, course)) {
      document.title = 'Dars with Osama | ILMU • KAJIAN • KITAB';
      return;
    }

    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://darswithosama.com';
    const shareData = buildSessionShareData(session, course, origin);

    // 1. Update Document Title
    document.title = shareData.pageTitle;

    // 2. Sync browser address bar cleanly while preserving internal navigation history state
    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      const targetPath = `/session/${encodeURIComponent(session.id)}`;
      const existingState =
        window.history.state && typeof window.history.state === 'object'
          ? window.history.state
          : null;
      if (
        existingState &&
        existingState.__darsNav === true &&
        (window.location.pathname !== targetPath || existingState.sessionId !== session.id)
      ) {
        window.history.replaceState(
          {
            ...existingState,
            __darsNav: true,
            view: 'session-view',
            courseId: course?.id ?? existingState.courseId ?? null,
            sessionId: session.id
          },
          shareData.pageTitle,
          targetPath
        );
      }
    }

    // 3. Helper to update or create <meta> tags
    const setMetaTag = (selector: string, attrName: string, attrVal: string, content: string) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Standard Meta Description
    setMetaTag('meta[name="description"]', 'name', 'description', shareData.ogDescription);

    // OpenGraph Meta Tags
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', 'video.other');
    setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', shareData.siteName);
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', shareData.ogTitle);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', shareData.ogDescription);
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', shareData.thumbnailUrl);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', shareData.url);

    // Twitter Card Meta Tags
    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', shareData.ogTitle);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', shareData.ogDescription);
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', shareData.thumbnailUrl);

    // Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', shareData.url);

    // Schema.org LearningResource / VideoObject JSON-LD
    let jsonLdScript = document.querySelector('#session-json-ld');
    if (!jsonLdScript) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.id = 'session-json-ld';
      jsonLdScript.setAttribute('type', 'application/ld+json');
      document.head.appendChild(jsonLdScript);
    }

    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      name: shareData.ogTitle,
      description: shareData.ogDescription,
      thumbnailUrl: shareData.thumbnailUrl,
      url: shareData.url,
      learningResourceType: 'Video & Catatan Kajian',
      provider: {
        '@type': 'Organization',
        name: 'Dars with Osama',
        url: origin
      }
    };

    jsonLdScript.textContent = JSON.stringify(schemaData);

    return () => {
      const existingScript = document.querySelector('#session-json-ld');
      if (existingScript) existingScript.remove();
    };
  }, [session, course]);
}
