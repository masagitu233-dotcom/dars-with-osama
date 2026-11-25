import { useEffect } from 'react';
import { buildPageSeoMetadata, PageSeoInput } from '../utils/seoConfig';

const MANAGED_JSONLD_ID = 'dars-seo-jsonld';
const LEGACY_JSONLD_IDS = ['article-json-ld', 'qa-json-ld', 'session-json-ld', 'dars-base-jsonld'];

function upsertMetaTag(
  selector: string,
  attrName: 'name' | 'property',
  attrVal: string,
  content: string
) {
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrVal);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonicalLink(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Global runtime SEO synchronization hook mounted at the root of App.tsx.
 * Dynamically updates <title>, meta description, robots (index vs noindex),
 * canonical URL (always https://darswithosama.netlify.app/...), OpenGraph, Twitter Cards,
 * optional Google Search Console verification tag (via VITE_GOOGLE_SITE_VERIFICATION),
 * and clean non-duplicated Schema.org JSON-LD (@graph) for every SPA route transition.
 */
export function useGlobalSEO(input: PageSeoInput, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const currentPathname =
      input.pathname ??
      (typeof window !== 'undefined' ? window.location.pathname : '/');

    const seo = buildPageSeoMetadata({
      ...input,
      pathname: currentPathname
    });

    // 1. Document language and title
    if (document.documentElement.getAttribute('lang') !== 'id') {
      document.documentElement.setAttribute('lang', 'id');
    }
    document.title = seo.title;

    // 2. Standard SEO meta tags
    upsertMetaTag('meta[name="description"]', 'name', 'description', seo.description);
    upsertMetaTag('meta[name="robots"]', 'name', 'robots', seo.robots);
    upsertMetaTag('meta[name="googlebot"]', 'name', 'googlebot', seo.robots);

    // Optional Google Search Console HTML tag verification (ONLY if user sets real env var)
    const gscToken = (
      (import.meta as unknown as { env?: Record<string, string | undefined> }).env
        ?.VITE_GOOGLE_SITE_VERIFICATION || ''
    ).trim();
    if (gscToken) {
      upsertMetaTag(
        'meta[name="google-site-verification"]',
        'name',
        'google-site-verification',
        gscToken
      );
    }

    // 3. Canonical URL (strictly https://darswithosama.netlify.app/...)
    upsertCanonicalLink(seo.canonicalUrl);

    // 4. Open Graph tags
    upsertMetaTag('meta[property="og:type"]', 'property', 'og:type', seo.ogType);
    upsertMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', seo.ogSiteName);
    upsertMetaTag('meta[property="og:locale"]', 'property', 'og:locale', seo.ogLocale);
    upsertMetaTag('meta[property="og:title"]', 'property', 'og:title', seo.ogTitle);
    upsertMetaTag('meta[property="og:description"]', 'property', 'og:description', seo.ogDescription);
    upsertMetaTag('meta[property="og:image"]', 'property', 'og:image', seo.ogImage);
    upsertMetaTag('meta[property="og:url"]', 'property', 'og:url', seo.ogUrl);

    // 5. Twitter Card tags
    upsertMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', seo.twitterCard);
    upsertMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', seo.twitterTitle);
    upsertMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', seo.twitterDescription);
    upsertMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', seo.twitterImage);

    // 6. Clean up any legacy JSON-LD tags to guarantee zero duplicate structured data
    for (const legacyId of LEGACY_JSONLD_IDS) {
      const legacyEl = document.getElementById(legacyId);
      if (legacyEl) legacyEl.remove();
    }

    const existingScript = document.getElementById(MANAGED_JSONLD_ID);
    if (seo.jsonLd.length === 0) {
      if (existingScript) existingScript.remove();
    } else {
      let scriptEl = existingScript as HTMLScriptElement | null;
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = MANAGED_JSONLD_ID;
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      const payload =
        seo.jsonLd.length === 1
          ? { '@context': 'https://schema.org', ...seo.jsonLd[0] }
          : { '@context': 'https://schema.org', '@graph': seo.jsonLd };
      scriptEl.textContent = JSON.stringify(payload);
    }
  }, [
    enabled,
    input.view,
    input.pathname,
    input.course?.id,
    input.course?.title,
    input.course?.isPublished,
    input.category?.id,
    input.session?.id,
    input.session?.title,
    input.blogPost?.id,
    input.blogPost?.slug,
    input.blogPost?.status,
    input.blogPost?.updatedAt,
    input.libraryBook?.id,
    input.libraryBook?.slug,
    input.libraryBook?.status,
    input.libraryVolume?.id,
    input.libraryVolume?.status,
    input.qaItem?.id,
    input.qaItem?.isPublished,
    input.instructorProfile?.fullName,
    input.instructorProfile?.photoUrl,
    input.searchQuery,
    input.isNotFound
  ]);
}
