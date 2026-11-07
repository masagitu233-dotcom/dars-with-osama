import { BlogPost } from '../types';

export const LAST_READ_ARTICLE_STORAGE_KEY = 'dars_last_read_article_v1';

export interface LastReadRecord {
  articleId: string;
  timestamp: number;
}

export interface GenreGroup {
  name: string;
  articles: BlogPost[];
}

/**
 * Saves the ID of the article the user just opened into localStorage.
 */
export function recordLastReadArticle(articleId: string): void {
  if (typeof window === 'undefined' || !window.localStorage || !articleId) return;
  try {
    const record: LastReadRecord = {
      articleId: articleId.trim(),
      timestamp: Date.now()
    };
    window.localStorage.setItem(LAST_READ_ARTICLE_STORAGE_KEY, JSON.stringify(record));
  } catch (err) {
    // Gracefully ignore private browsing / quota errors
  }
}

/**
 * Retrieves the ID of the last read article from localStorage.
 */
export function getLastReadArticleId(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(LAST_READ_ARTICLE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastReadRecord;
    return parsed && typeof parsed.articleId === 'string' && parsed.articleId.trim()
      ? parsed.articleId.trim()
      : null;
  } catch (err) {
    return null;
  }
}

/**
 * Resolves the full BlogPost object for the user's last read article from the available posts list.
 * Returns null if the user hasn't opened any article or if the article was removed.
 */
export function resolveLastReadArticle(posts: BlogPost[]): BlogPost | null {
  const id = getLastReadArticleId();
  if (!id || !Array.isArray(posts) || posts.length === 0) return null;
  return posts.find((p) => p.id === id || p.slug === id) || null;
}

/**
 * Splits and cleans categories/genres from a post's category string.
 */
export function extractGenresFromCategory(categoryString?: string): string[] {
  if (!categoryString || typeof categoryString !== 'string') return [];
  return categoryString
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}

/**
 * Groups an array of blog posts into distinct genres based on their category field.
 * Handles comma-separated multi-categories cleanly and preserves proper casing.
 */
export function groupArticlesByGenre(posts: BlogPost[]): GenreGroup[] {
  if (!Array.isArray(posts) || posts.length === 0) return [];

  const genreMap = new Map<string, { displayName: string; articles: BlogPost[] }>();

  posts.forEach((post) => {
    const genres = extractGenresFromCategory(post.category);
    const assignedGenres = genres.length > 0 ? genres : ['Umum'];

    assignedGenres.forEach((rawGenre) => {
      const key = rawGenre.toLowerCase();
      if (!genreMap.has(key)) {
        // Format display name: title case for cleaner look
        const formatted = rawGenre.charAt(0).toUpperCase() + rawGenre.slice(1);
        genreMap.set(key, { displayName: formatted, articles: [] });
      }
      const entry = genreMap.get(key)!;
      if (!entry.articles.some((p) => p.id === post.id)) {
        entry.articles.push(post);
      }
    });
  });

  const groups: GenreGroup[] = [];
  genreMap.forEach((entry) => {
    if (entry.articles.length > 0) {
      groups.push({
        name: entry.displayName,
        articles: entry.articles
      });
    }
  });

  return groups;
}

/**
 * Finds all articles matching a specific genre name (case-insensitive).
 */
export function findArticlesByGenre(posts: BlogPost[], targetGenre: string): BlogPost[] {
  if (!Array.isArray(posts) || posts.length === 0 || !targetGenre) return [];
  const cleanTarget = targetGenre.trim().toLowerCase();

  return posts.filter((post) => {
    const genres = extractGenresFromCategory(post.category);
    if (genres.length === 0 && cleanTarget === 'umum') return true;
    return genres.some((g) => g.toLowerCase() === cleanTarget);
  });
}
