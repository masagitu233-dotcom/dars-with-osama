import { BlogPost } from '../types';
import { useGlobalSEO } from './useGlobalSEO';

/**
 * Hook to synchronize article-specific SEO metadata, OpenGraph, Twitter Card,
 * canonical URL (https://darswithosama.netlify.app/article/:slug), and Schema.org Article JSON-LD.
 * Delegates to useGlobalSEO so there are never duplicate JSON-LD scripts or conflicting canonicals.
 */
export function useArticleSEO(article: BlogPost | null) {
  useGlobalSEO({
    view: article ? 'blog-detail' : 'blog',
    blogPost: article
  });
}
