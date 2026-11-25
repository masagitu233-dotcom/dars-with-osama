import { Consultation } from '../types';
import { useGlobalSEO } from './useGlobalSEO';

/**
 * Hook to synchronize Q&A SEO metadata, OpenGraph, Twitter Card,
 * canonical URL (https://darswithosama.netlify.app/qa/:id), and Schema.org QAPage JSON-LD.
 * Delegates to useGlobalSEO to avoid duplicate JSON-LD or preview-origin canonical leaks.
 */
export function useQASEO(consultation: Consultation | null) {
  useGlobalSEO({
    view: 'public-qa',
    qaItem: consultation
  });
}
