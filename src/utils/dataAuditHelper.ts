import { BlogPost, Session } from '../types';

export const DUMMY_SEED_BLOG_POST_IDS = new Set<string>([
  'post-1',
  'post-2',
  'post-3'
]);

export const DUMMY_SEED_BLOG_POST_SLUGS = new Set<string>([
  'menuntut-ilmu-syari-keutamaan-niat-dan-adab',
  'panduan-tadabbur-al-quran-memahami-makna-dan-renungan',
  'panduan-tadabbur-al-quran-memahami-makna-ayat',
  'urgensi-mempelajari-bahasa-arab-dan-ilmu-nahwu'
]);

export const DUMMY_SEED_COURSE_IDS = new Set<string>([
  'course-tsalatsatil-ushul',
  'course-arbain-nawawi',
  'course-al-ajurrumiyyah',
  'course-fiqh-thaharah'
]);

export const DUMMY_SEED_QA_IDS = new Set<string>([
  'qa-1',
  'qa-2'
]);

/**
 * Determines whether a BlogPost record is an untouched/auto-seeded dummy article
 * that must not be displayed as production content.
 */
export function isDummySeedBlogPost(post?: Partial<BlogPost> | null): boolean {
  if (!post) return false;
  const id = (post.id || '').trim();
  const slug = (post.slug || '').trim().toLowerCase();

  if (DUMMY_SEED_BLOG_POST_IDS.has(id)) {
    return true;
  }
  if (DUMMY_SEED_BLOG_POST_SLUGS.has(slug)) {
    return true;
  }
  return false;
}

/**
 * Filters out dummy seed blog posts, sorts by publishedAt/createdAt descending,
 * and filters drafts when includeDrafts is false.
 */
export function filterProductionBlogPosts(
  posts: BlogPost[],
  includeDrafts = false
): BlogPost[] {
  if (!Array.isArray(posts)) return [];

  const nonDummy = posts.filter((p) => p && !isDummySeedBlogPost(p));

  const sorted = [...nonDummy].sort((a, b) => {
    const timeA = new Date(a.publishedAt || a.createdAt || 0).getTime() || 0;
    const timeB = new Date(b.publishedAt || b.createdAt || 0).getTime() || 0;
    return timeB - timeA;
  });

  if (!includeDrafts) {
    return sorted.filter((p) => p.status === 'published');
  }
  return sorted;
}

/**
 * Merges sessions from subcollection `courses/{courseId}/sessions` and top-level `sessions`
 * by choosing the record with the newest `updatedAt` (or `createdAt`) timestamp when duplicates exist.
 */
export function mergeCourseSessions(
  subSessions: Session[],
  topSessions: Session[],
  includeUnpublished = false
): Session[] {
  const sessionMap = new Map<string, Session>();

  const toTimestamp = (s: Partial<Session>): number => {
    const raw = s.updatedAt || s.createdAt || '';
    const parsed = raw ? Date.parse(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : 0;
  };

  for (const s of Array.isArray(subSessions) ? subSessions : []) {
    if (!s || !s.id) continue;
    sessionMap.set(s.id, s);
  }

  for (const s of Array.isArray(topSessions) ? topSessions : []) {
    if (!s || !s.id) continue;
    const existing = sessionMap.get(s.id);
    if (!existing) {
      sessionMap.set(s.id, s);
    } else {
      const existingTime = toTimestamp(existing);
      const candidateTime = toTimestamp(s);
      if (candidateTime > existingTime) {
        sessionMap.set(s.id, s);
      }
    }
  }

  const merged = Array.from(sessionMap.values()).sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );

  if (!includeUnpublished) {
    return merged.filter((s) => Boolean(s.isPublished));
  }
  return merged;
}

export interface LocalStorageAuditEntry {
  key: string;
  category: 'ui_preference' | 'instructor_profile_cache' | 'auth_session' | 'legacy_content' | 'other';
  sizeBytes: number;
  summary: string;
  rawValue: string;
}

export interface LocalStorageAuditReport {
  scannedAt: string;
  totalKeys: number;
  entries: LocalStorageAuditEntry[];
  hasUnsyncedLegacyContent: boolean;
}

/**
 * Audits a key-value map of browser localStorage items to identify preferences, caches,
 * or any legacy local content without mutating or overwriting server state.
 */
export function auditBrowserStorageEntries(
  storageMap: Record<string, string>
): LocalStorageAuditReport {
  const entries: LocalStorageAuditEntry[] = [];
  let hasUnsyncedLegacyContent = false;

  for (const [key, rawValue] of Object.entries(storageMap || {})) {
    const safeVal = typeof rawValue === 'string' ? rawValue : String(rawValue ?? '');
    const sizeBytes = safeVal.length;

    let category: LocalStorageAuditEntry['category'] = 'other';
    let summary = 'Data lokal browser lainnya';

    if (key === 'dars-theme' || key === 'dars_lang' || key === 'dars_welcome_seen') {
      category = 'ui_preference';
      summary = `Preferensi tampilan UI (${key}: ${safeVal.slice(0, 40)})`;
    } else if (key === 'dars_instructor_profile_v1') {
      category = 'instructor_profile_cache';
      try {
        const parsed = JSON.parse(safeVal);
        summary = `Cache lokal Profil Pengajar (${parsed?.name || 'Osama'}, diperbarui: ${parsed?.updatedAt || '-'})`;
      } catch {
        summary = 'Cache lokal Profil Pengajar';
      }
    } else if (key.startsWith('firebase:') || key.includes('firebaseLocalStorage')) {
      category = 'auth_session';
      summary = 'Sesi autentikasi Firebase Auth';
    } else if (
      key.toLowerCase().includes('post') ||
      key.toLowerCase().includes('article') ||
      key.toLowerCase().includes('course') ||
      key.toLowerCase().includes('session') ||
      key.toLowerCase().includes('qa') ||
      key.toLowerCase().includes('consultation')
    ) {
      category = 'legacy_content';
      hasUnsyncedLegacyContent = true;
      summary = `Data konten lokal terdeteksi pada kunci "${key}" (${sizeBytes} byte)`;
    }

    entries.push({
      key,
      category,
      sizeBytes,
      summary,
      rawValue: safeVal
    });
  }

  return {
    scannedAt: new Date().toISOString(),
    totalKeys: entries.length,
    entries,
    hasUnsyncedLegacyContent
  };
}

/**
 * Compares local candidate items with existing server items so that safe recovery
 * ONLY migrates items missing on the server and NEVER overwrites server records automatically.
 */
export function reconcileLocalWithServerEntities<T extends { id: string; updatedAt?: string }>(
  localItems: T[],
  serverItems: T[]
): {
  missingOnServer: T[];
  alreadyOnServer: T[];
} {
  const serverIds = new Set((serverItems || []).map((item) => item.id));
  const missingOnServer: T[] = [];
  const alreadyOnServer: T[] = [];

  for (const item of Array.isArray(localItems) ? localItems : []) {
    if (!item || !item.id) continue;
    if (serverIds.has(item.id)) {
      alreadyOnServer.push(item);
    } else {
      missingOnServer.push(item);
    }
  }

  return { missingOnServer, alreadyOnServer };
}
