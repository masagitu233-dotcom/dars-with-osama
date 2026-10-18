import { useEffect } from 'react';
import { BlogPost } from '../types';

/**
 * Hook to inject dynamic OpenGraph, Twitter card, and Schema.org structured metadata
 * for the selected article in real time.
 */
export function useArticleSEO(article: BlogPost | null) {
  useEffect(() => {
    if (!article) {
      // Reset to default platform SEO
      document.title = 'Dars with Osama | ILMU • KAJIAN • KITAB';
      return;
    }

    const title = `${article.title} | Dars with Osama`;
    const description = article.excerpt || 'Kajian Islam, Fiqih, & Catatan Keilmuan Islam oleh Ustaz Osama Nur Samsil.';
    const imageUrl = article.coverImageUrl || 'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=1200&auto=format&fit=crop';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://darswithosama.com';
    const articleUrl = article.slug 
      ? `${origin}/article/${encodeURIComponent(article.slug)}`
      : `${origin}/?view=blog-detail&id=${encodeURIComponent(article.id)}`;

    // Update Document Title
    document.title = title;

    // Helper to update or inject meta elements
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
    setMetaTag('meta[name="description"]', 'name', 'description', description);

    // OpenGraph Social Media Tags
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', 'article');
    setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', 'Dars with Osama');
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', article.title);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', imageUrl);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', articleUrl);

    // Twitter / X Card Meta Tags
    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', article.title);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);

    // Canonical URL Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', articleUrl);

    // Schema.org JSON-LD Structured Data
    let jsonLdScript = document.querySelector('#article-json-ld');
    if (!jsonLdScript) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.id = 'article-json-ld';
      jsonLdScript.setAttribute('type', 'application/ld+json');
      document.head.appendChild(jsonLdScript);
    }

    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      'headline': article.title,
      'description': description,
      'image': [imageUrl],
      'author': {
        '@type': 'Person',
        'name': article.authorName || 'Ustaz Osama Nur Samsil'
      },
      'publisher': {
        '@type': 'Organization',
        'name': 'Dars with Osama',
        'logo': {
          '@type': 'ImageObject',
          'url': `${origin}/logo.png`
        }
      },
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': articleUrl
      },
      'datePublished': article.publishedAt || article.createdAt
    };

    jsonLdScript.textContent = JSON.stringify(schemaData);

    return () => {
      document.title = 'Dars with Osama | ILMU • KAJIAN • KITAB';
      const existingScript = document.querySelector('#article-json-ld');
      if (existingScript) existingScript.remove();
    };
  }, [article]);
}
