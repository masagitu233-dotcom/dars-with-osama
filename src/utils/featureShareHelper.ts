/**
 * Feature Share Helper for Dars with Osama.
 *
 * Configures sharing metadata, official invitation narrations,
 * canonical target URLs, and WhatsApp / native share helpers
 * specifically and exclusively for:
 * 1. Artikel Ilmiah (Blog / Catatan Ilmu)
 * 2. Tanya Jawab (Ruang Tanya Jawab Pembelajaran)
 */

export interface FeatureShareConfig {
  id: 'blog' | 'public-qa';
  title: string;
  badge: string;
  narration: string;
  targetPath: string;
}

export const ARTIKEL_ILMIAH_SHARE_CONFIG: FeatureShareConfig = {
  id: 'blog',
  title: 'Artikel Ilmiah',
  badge: 'Artikel Ilmiah Dars with Osama',
  narration:
    'Mari menambah wawasan dan memperluas pemahaman terhadap berbagai persoalan keislaman melalui artikel-artikel ilmiah di Dars with Osama. Silakan kunjungi dan baca berbagai pembahasannya melalui tautan berikut:',
  targetPath: '/?view=blog'
};

export const TANYA_JAWAB_SHARE_CONFIG: FeatureShareConfig = {
  id: 'public-qa',
  title: 'Tanya Jawab',
  badge: 'Ruang Tanya Jawab Dars with Osama',
  narration:
    'Memiliki pertanyaan seputar persoalan keislaman? Mari manfaatkan Ruang Tanya Jawab Dars with Osama untuk menyampaikan pertanyaan, membaca berbagai pembahasan, dan mengambil manfaat dari jawaban yang tersedia. Kunjungi melalui tautan berikut:',
  targetPath: '/?view=public-qa'
};

/**
 * Returns the canonical URL for sharing a specific feature.
 * Defaults to the current window.location.origin in the browser,
 * or https://darswithosama.com during server/static evaluation.
 */
export function getFeatureShareUrl(feature: 'blog' | 'public-qa', baseOrigin?: string): string {
  const origin =
    baseOrigin ||
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://darswithosama.com');

  const path = feature === 'blog' ? '/?view=blog' : '/?view=public-qa';
  return `${origin}${path}`;
}

/**
 * Combines the invitation narration text with the direct target URL.
 */
export function formatFeatureShareMessage(narration: string, url: string): string {
  const cleanNarration = (narration || '').trim();
  const cleanUrl = (url || '').trim();
  if (!cleanNarration) return cleanUrl;
  if (!cleanUrl) return cleanNarration;
  return `${cleanNarration}\n\n${cleanUrl}`;
}

/**
 * Generates the WhatsApp web/api intent URL with pre-filled narration and link.
 */
export function getWhatsAppShareUrl(narration: string, url: string): string {
  const fullMessage = formatFeatureShareMessage(narration, url);
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(fullMessage)}`;
}
