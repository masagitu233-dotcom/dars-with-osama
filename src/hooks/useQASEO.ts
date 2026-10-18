import { useEffect } from 'react';
import { Consultation } from '../types';

/**
 * Strips HTML tags and normalizes whitespace for clean text preview
 */
function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Hook to inject dynamic OpenGraph, Twitter card, and Schema.org structured metadata
 * for the selected Q&A item in real time.
 * Note: Only the QUESTION is included in the meta description so users must click the link to read the answer!
 */
export function useQASEO(consultation: Consultation | null) {
  useEffect(() => {
    if (!consultation) {
      document.title = 'Tanya Jawab Syar\'i & Pembelajaran | Dars with Osama';
      return;
    }

    const title = `${consultation.title} | Tanya Jawab Dars with Osama`;
    const cleanQuestion = stripHtml(consultation.content || '');
    const shortQuestion = cleanQuestion.length > 160 ? cleanQuestion.slice(0, 160) + '...' : cleanQuestion;
    const description = `Pertanyaan: "${shortQuestion}" • Klik tautan ini untuk membaca jawaban resmi dari Ustaz Osama Nur Samsil di Dars with Osama.`;
    
    // Official platform fallback image
    const imageUrl = 'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=1200&auto=format&fit=crop';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://darswithosama.com';
    const qaUrl = `${origin}/qa/${encodeURIComponent(consultation.id)}`;

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
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', consultation.title);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', imageUrl);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', qaUrl);

    // Twitter / X Card Meta Tags
    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', consultation.title);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);

    // Canonical URL Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', qaUrl);

    // Schema.org JSON-LD Structured Data
    let jsonLdScript = document.querySelector('#qa-json-ld');
    if (!jsonLdScript) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.id = 'qa-json-ld';
      jsonLdScript.setAttribute('type', 'application/ld+json');
      document.head.appendChild(jsonLdScript);
    }

    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'QAPage',
      'mainEntity': {
        '@type': 'Question',
        'name': consultation.title,
        'text': cleanQuestion,
        'answerCount': consultation.replyContent ? 1 : 0,
        'author': {
          '@type': 'Person',
          'name': 'Penanya (Anonim)'
        }
      }
    };

    jsonLdScript.textContent = JSON.stringify(schemaData);

    return () => {
      document.title = 'Tanya Jawab Syar\'i & Pembelajaran | Dars with Osama';
      const existingScript = document.querySelector('#qa-json-ld');
      if (existingScript) existingScript.remove();
    };
  }, [consultation]);
}
