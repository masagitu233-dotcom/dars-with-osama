import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType, auth, logFirestoreDiagnostic, classifyFirestoreError, firebaseConfig } from './config';
import { Category, Course, Session, Quiz, Enrollment, QuizAttempt, UserProfile, BlogPost, Consultation, ArticleComment, InstructorProfile } from '../types';
import { SEED_CATEGORIES, SEED_COURSES, SEED_SESSIONS, SEED_QUIZZES } from '../data/seedData';
import { matchesSessionIdentifier, canAccessSessionPublicly } from '../utils/sessionShareHelper';
import { sanitizeRichTextHtml } from '../utils/richTextHelper';
import {
  DEFAULT_INSTRUCTOR_PROFILE_ID,
  getDefaultInstructorProfile,
  normalizeProfileSections,
  normalizeSupportingImages,
  sanitizeInstructorProfilePayload
} from '../utils/instructorProfileHelper';
import {
  isDummySeedBlogPost,
  filterProductionBlogPosts,
  mergeCourseSessions
} from '../utils/dataAuditHelper';
import {
  PRODUCTION_CATEGORIES,
  PRODUCTION_COURSES,
  PRODUCTION_SESSIONS,
  PRODUCTION_QUIZZES,
  PRODUCTION_BLOG_POSTS,
  PRODUCTION_CONSULTATIONS,
  PRODUCTION_COMMENTS,
  PRODUCTION_INSTRUCTOR_PROFILE
} from '../data/productionCache.js';

// Fixed initial admin emails (User email from runtime and bootstrap admin)
export const INITIAL_ADMIN_EMAILS = [
  'masagitu233@gmail.com',
  'osamanursamsil@gmail.com'
];
export const INITIAL_ADMIN_EMAIL = 'masagitu233@gmail.com';

export function isPlatformAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return INITIAL_ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === clean);
}

export function logCrudDiagnostic(op: string, path: string, status: 'start' | 'success' | 'failed', error?: any): void {
  const user = auth.currentUser;
  const userEmail = user?.email || 'unauthenticated';
  const dbName = firebaseConfig.firestoreDatabaseId || 'ai-studio-remixdarswithosa-978e37b7-a164-496c-8e6a-39738edc5d93';
  if (status === 'start') {
    console.log(`[CRUD Diagnostic START] Op: ${op} | Path: ${path} | Db: ${dbName} | Auth: ${userEmail}`);
  } else if (status === 'success') {
    console.log(`[CRUD Diagnostic SUCCESS] Op: ${op} | Path: ${path} | Db: ${dbName} | Auth: ${userEmail}`);
  } else {
    const code = error?.code || 'ERR_UNKNOWN';
    const msg = error?.message || String(error);
    console.error(`[CRUD Diagnostic FAILED] Op: ${op} | Path: ${path} | Db: ${dbName} | Code: ${code} | Msg: ${msg} | Auth: ${userEmail}`);
  }
}

// ==========================================
// IN-MEMORY TTL CACHE (High Availability & Read Mitigation)
// ==========================================
const CACHE_TTL_MS = 300_000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

let categoriesCache: CacheEntry<Category[]> | null = null;
let coursesCache: CacheEntry<Course[]> | null = null;
let sessionCountsCache: CacheEntry<Record<string, number>> | null = null;
const sessionsByCourseCache = new Map<string, CacheEntry<Session[]>>();
let blogPostsCache: CacheEntry<BlogPost[]> | null = null;
let publicQACache: CacheEntry<Consultation[]> | null = null;

export function invalidateServicesCache(target?: 'categories' | 'courses' | 'sessions' | 'blog' | 'qa' | 'all') {
  if (!target || target === 'all') {
    categoriesCache = null;
    coursesCache = null;
    sessionCountsCache = null;
    sessionsByCourseCache.clear();
    blogPostsCache = null;
    publicQACache = null;
  } else if (target === 'categories') {
    categoriesCache = null;
  } else if (target === 'courses') {
    coursesCache = null;
    sessionCountsCache = null;
  } else if (target === 'sessions') {
    sessionCountsCache = null;
    sessionsByCourseCache.clear();
  } else if (target === 'blog') {
    blogPostsCache = null;
  } else if (target === 'qa') {
    publicQACache = null;
  }
}

// ==========================================
// CATEGORIES (Cloud Firestore with Production Fallback)
// ==========================================
export async function getCategories(): Promise<Category[]> {
  const now = Date.now();
  if (categoriesCache && now - categoriesCache.timestamp < CACHE_TTL_MS) {
    return categoriesCache.data;
  }

  try {
    const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Category));
      if (categoriesCache && Array.isArray(categoriesCache.data)) {
        const fetchedIds = new Set(list.map(c => c.id));
        const extraLocal = categoriesCache.data.filter(c => c && !fetchedIds.has(c.id));
        const merged = [...list, ...extraLocal];
        merged.sort((a, b) => (a.order || 0) - (b.order || 0));
        categoriesCache = { data: merged, timestamp: now };
        return merged;
      }
      categoriesCache = { data: list, timestamp: now };
      return list;
    }
    if (categoriesCache && Array.isArray(categoriesCache.data) && categoriesCache.data.length > 0) {
      return categoriesCache.data;
    }
    categoriesCache = { data: PRODUCTION_CATEGORIES, timestamp: now };
    return PRODUCTION_CATEGORIES;
  } catch (err) {
    logFirestoreDiagnostic({ operation: 'getCategories', collection: 'categories' }, err);
    if (categoriesCache && Array.isArray(categoriesCache.data) && categoriesCache.data.length > 0) {
      return categoriesCache.data;
    }
    return PRODUCTION_CATEGORIES;
  }
}

export async function saveCategory(category: Partial<Category> & { name: string; slug: string }): Promise<string> {
  const id = category.id || `cat-${Date.now()}`;
  const path = `categories/${id}`;
  logCrudDiagnostic('saveCategory', path, 'start');
  try {
    const data: Category = {
      id,
      name: category.name,
      nameAr: category.nameAr || '',
      slug: category.slug,
      description: category.description || '',
      order: category.order || 1,
      createdAt: category.createdAt || new Date().toISOString()
    };
    await setDoc(doc(db, 'categories', id), data, { merge: true });

    try {
      const vSnap = await getDoc(doc(db, 'categories', id));
      if (vSnap.exists()) {
        logCrudDiagnostic(`saveCategory Verification [ID: ${id}]`, path, 'success');
      }
    } catch (vErr) {
      console.warn('[saveCategory] Verification notice:', vErr);
    }

    if (categoriesCache && Array.isArray(categoriesCache.data)) {
      const idx = categoriesCache.data.findIndex((c) => c.id === id);
      if (idx >= 0) {
        categoriesCache.data[idx] = data;
      } else {
        categoriesCache.data.push(data);
      }
      categoriesCache.data.sort((a, b) => (a.order || 0) - (b.order || 0));
      categoriesCache.timestamp = Date.now();
    } else {
      categoriesCache = { data: [data], timestamp: Date.now() };
    }

    logCrudDiagnostic('saveCategory', path, 'success');
    return id;
  } catch (error) {
    logCrudDiagnostic('saveCategory', path, 'failed', error);
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const path = `categories/${id}`;
  logCrudDiagnostic('deleteCategory', path, 'start');
  try {
    await deleteDoc(doc(db, 'categories', id));
    if (categoriesCache && Array.isArray(categoriesCache.data)) {
      categoriesCache.data = categoriesCache.data.filter((c) => c.id !== id);
      categoriesCache.timestamp = Date.now();
    }
    logCrudDiagnostic('deleteCategory', path, 'success');
  } catch (error) {
    logCrudDiagnostic('deleteCategory', path, 'failed', error);
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function seedDefaultCategoriesIfEmpty(): Promise<Category[]> {
  try {
    const snap = await getDocs(collection(db, 'categories'));
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
    }
    // Only write if authenticated
    if (!auth.currentUser) return PRODUCTION_CATEGORIES;

    console.log('Seeding default categories to Cloud Firestore...');
    for (const cat of SEED_CATEGORIES) {
      await setDoc(doc(db, 'categories', cat.id), cat, { merge: true });
    }
    const fresh = await getCategories();
    return fresh;
  } catch (err) {
    console.warn('seedDefaultCategoriesIfEmpty notice:', err);
    return PRODUCTION_CATEGORIES;
  }
}

// ==========================================
// COURSES (Cloud Firestore with Production Fallback)
// ==========================================
export async function getSessionCountsByCourse(includeUnpublished = false): Promise<Record<string, number>> {
  const now = Date.now();
  if (sessionCountsCache && now - sessionCountsCache.timestamp < CACHE_TTL_MS) {
    return sessionCountsCache.data;
  }

  // Pre-calculate fallback counts directly from authentic PRODUCTION_SESSIONS
  const fallbackCounts: Record<string, number> = {};
  for (const s of PRODUCTION_SESSIONS) {
    if (s.courseId) {
      if (includeUnpublished || s.isPublished !== false) {
        fallbackCounts[s.courseId] = (fallbackCounts[s.courseId] || 0) + 1;
      }
    }
  }

  try {
    const countsMap: Record<string, Set<string>> = {};

    // 1. Scan courses and check subcollection sessions
    try {
      const coursesSnapshot = await getDocs(collection(db, 'courses'));
      if (!coursesSnapshot.empty) {
        for (const cDoc of coursesSnapshot.docs) {
          const courseId = cDoc.id;
          countsMap[courseId] = new Set();
          try {
            const subSnapshot = await getDocs(collection(db, 'courses', courseId, 'sessions'));
            subSnapshot.forEach(d => {
              const data = d.data();
              if (includeUnpublished || data.isPublished !== false) {
                countsMap[courseId].add(d.id);
              }
            });
          } catch (e) {
            // ignore subcollection read error
          }
        }
      }
    } catch (e) {
      logFirestoreDiagnostic({ operation: 'getSessionCountsByCourse (subcollection scan)', collection: 'courses' }, e);
    }

    // 2. Scan top-level sessions collection
    try {
      const topSnapshot = await getDocs(collection(db, 'sessions'));
      topSnapshot.forEach(d => {
        const data = d.data();
        if (data.courseId) {
          if (!countsMap[data.courseId]) {
            countsMap[data.courseId] = new Set();
          }
          if (includeUnpublished || data.isPublished !== false) {
            countsMap[data.courseId].add(d.id);
          }
        }
      });
    } catch (e) {
      logFirestoreDiagnostic({ operation: 'getSessionCountsByCourse (top-level scan)', collection: 'sessions' }, e);
    }

    const result: Record<string, number> = {};
    for (const courseId in countsMap) {
      result[courseId] = countsMap[courseId].size;
    }

    // If live queries returned 0 results (or failed/quota-exhausted), merge fallback counts
    for (const courseId in fallbackCounts) {
      if (!result[courseId] || result[courseId] === 0) {
        result[courseId] = fallbackCounts[courseId];
      }
    }

    sessionCountsCache = { data: result, timestamp: now };
    return result;
  } catch (err) {
    logFirestoreDiagnostic({ operation: 'getSessionCountsByCourse (fallback)', collection: 'sessions' }, err);
    sessionCountsCache = { data: fallbackCounts, timestamp: now };
    return fallbackCounts;
  }
}

export async function getCourses(includeUnpublished = false): Promise<Course[]> {
  const now = Date.now();
  if (coursesCache && now - coursesCache.timestamp < CACHE_TTL_MS) {
    let cached = coursesCache.data;
    if (!includeUnpublished) {
      cached = cached.filter(c => c.isPublished);
    }
    return cached;
  }

  // Pre-calculate authentic production courses with session counts
  const fallbackCounts: Record<string, number> = await getSessionCountsByCourse(includeUnpublished).catch((): Record<string, number> => ({}));
  const enrichedProductionCourses = PRODUCTION_COURSES.map(c => {
    const actualCount = fallbackCounts[c.id] ?? c.sessionsCount ?? 0;
    return {
      ...c,
      sessionsCount: actualCount,
      totalDuration: `${actualCount} Sesi`
    };
  });

  try {
    const snapshot = await getDocs(collection(db, 'courses'));
    if (!snapshot.empty) {
      let courses = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Course));
      courses.sort((a, b) => (a.order || 0) - (b.order || 0));

      try {
        const counts = await getSessionCountsByCourse(includeUnpublished);
        courses = courses.map(c => {
          const actualCount = counts[c.id] ?? c.sessionsCount ?? 0;
          return {
            ...c,
            sessionsCount: actualCount,
            totalDuration: `${actualCount} Sesi`
          };
        });
      } catch (e) {
        console.warn('Failed to attach dynamic session counts:', e);
      }

      if (coursesCache && Array.isArray(coursesCache.data)) {
        const fetchedIds = new Set(courses.map(c => c.id));
        const extraLocal = coursesCache.data.filter(c => c && !fetchedIds.has(c.id));
        const merged = [...courses, ...extraLocal];
        merged.sort((a, b) => (a.order || 0) - (b.order || 0));
        coursesCache = { data: merged, timestamp: now };
        return includeUnpublished ? merged : merged.filter(c => c.isPublished);
      }

      coursesCache = { data: courses, timestamp: now };
      if (!includeUnpublished) {
        courses = courses.filter(c => c.isPublished);
      }
      return courses;
    }

    if (coursesCache && Array.isArray(coursesCache.data) && coursesCache.data.length > 0) {
      let filtered = coursesCache.data;
      if (!includeUnpublished) {
        filtered = filtered.filter(c => c.isPublished);
      }
      return filtered;
    }

    // Server empty: return authentic production courses
    coursesCache = { data: enrichedProductionCourses, timestamp: now };
    let filtered = enrichedProductionCourses;
    if (!includeUnpublished) {
      filtered = filtered.filter(c => c.isPublished);
    }
    return filtered;
  } catch (err) {
    logFirestoreDiagnostic({ operation: 'getCourses', collection: 'courses' }, err);
    if (coursesCache && Array.isArray(coursesCache.data) && coursesCache.data.length > 0) {
      let filtered = coursesCache.data;
      if (!includeUnpublished) {
        filtered = filtered.filter(c => c.isPublished);
      }
      return filtered;
    }
    let filtered = enrichedProductionCourses;
    if (!includeUnpublished) {
      filtered = filtered.filter(c => c.isPublished);
    }
    return filtered;
  }
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  try {
    const d = await getDoc(doc(db, 'courses', courseId));
    if (d.exists()) {
      return { id: d.id, ...d.data() } as Course;
    }
  } catch (error) {
    console.warn('getCourseById live fetch notice:', error);
  }
  return PRODUCTION_COURSES.find(c => c.id === courseId) || null;
}

export async function saveCourse(course: Partial<Course> & { title: string; categoryId: string }): Promise<string> {
  const id = course.id || `course-${Date.now()}`;
  const path = `courses/${id}`;
  logCrudDiagnostic('saveCourse', path, 'start');
  try {
    const courseData: Course = {
      ...course,
      id,
      isPublished: course.isPublished ?? true,
      hasCertificate: course.hasCertificate ?? true,
      passingGrade: course.passingGrade ?? 75,
      order: course.order || 1,
      updatedAt: new Date().toISOString(),
      createdAt: course.createdAt || new Date().toISOString()
    } as Course;

    await setDoc(doc(db, 'courses', id), courseData, { merge: true });

    try {
      const vSnap = await getDoc(doc(db, 'courses', id));
      if (vSnap.exists()) {
        logCrudDiagnostic(`saveCourse Verification [ID: ${id}]`, path, 'success');
      }
    } catch (vErr) {
      console.warn('[saveCourse] Verification notice:', vErr);
    }

    if (coursesCache && Array.isArray(coursesCache.data)) {
      const idx = coursesCache.data.findIndex((c) => c.id === id);
      if (idx >= 0) {
        coursesCache.data[idx] = courseData;
      } else {
        coursesCache.data.push(courseData);
      }
      coursesCache.data.sort((a, b) => (a.order || 0) - (b.order || 0));
      coursesCache.timestamp = Date.now();
    } else {
      coursesCache = { data: [courseData], timestamp: Date.now() };
    }

    logCrudDiagnostic('saveCourse', path, 'success');
    return id;
  } catch (error) {
    logCrudDiagnostic('saveCourse', path, 'failed', error);
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteCourse(courseId: string): Promise<void> {
  const path = `courses/${courseId}`;
  logCrudDiagnostic('deleteCourse', path, 'start');
  try {
    // 1. Delete course document from Cloud Firestore
    await deleteDoc(doc(db, 'courses', courseId));
    if (coursesCache && Array.isArray(coursesCache.data)) {
      coursesCache.data = coursesCache.data.filter((c) => c.id !== courseId);
      coursesCache.timestamp = Date.now();
    }

    // 2. Cascading delete subcollection sessions: courses/{courseId}/sessions
    try {
      const subSessions = await getDocs(collection(db, 'courses', courseId, 'sessions'));
      if (!subSessions.empty) {
        for (const sDoc of subSessions.docs) {
          await deleteDoc(doc(db, 'courses', courseId, 'sessions', sDoc.id)).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Subcollection sessions cleanup notice:', e);
    }

    // 3. Cascading delete top-level sessions for this course
    try {
      const topSessions = await getDocs(query(collection(db, 'sessions'), where('courseId', '==', courseId)));
      if (!topSessions.empty) {
        for (const sDoc of topSessions.docs) {
          await deleteDoc(doc(db, 'sessions', sDoc.id)).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Top sessions cleanup notice:', e);
    }

    // 4. Cascading delete quizzes for this course
    try {
      const courseQuizzes = await getDocs(query(collection(db, 'quizzes'), where('courseId', '==', courseId)));
      if (!courseQuizzes.empty) {
        for (const qDoc of courseQuizzes.docs) {
          await deleteDoc(doc(db, 'quizzes', qDoc.id)).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Quizzes cleanup notice:', e);
    }

    // 5. Cascading delete enrollments for this course
    try {
      const enrollments = await getDocs(query(collection(db, 'enrollments'), where('courseId', '==', courseId)));
      if (!enrollments.empty) {
        for (const eDoc of enrollments.docs) {
          await deleteDoc(doc(db, 'enrollments', eDoc.id)).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Enrollments cleanup notice:', e);
    }

    // 6. Cascading delete quizAttempts for this course
    try {
      const attempts = await getDocs(query(collection(db, 'quizAttempts'), where('courseId', '==', courseId)));
      if (!attempts.empty) {
        for (const aDoc of attempts.docs) {
          await deleteDoc(doc(db, 'quizAttempts', aDoc.id)).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Attempts cleanup notice:', e);
    }
    logCrudDiagnostic('deleteCourse', path, 'success');
  } catch (error) {
    logCrudDiagnostic('deleteCourse', path, 'failed', error);
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// ==========================================
// SESSIONS (Cloud Firestore with Production Fallback)
// ==========================================
export async function getSessionsByCourse(courseId: string, includeUnpublished = false): Promise<Session[]> {
  const now = Date.now();
  const cached = sessionsByCourseCache.get(courseId);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    let list = cached.data;
    if (!includeUnpublished) {
      list = list.filter(s => s.isPublished !== false);
    }
    return list;
  }

  const fallbackSessions = PRODUCTION_SESSIONS
    .filter(s => s.courseId === courseId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  try {
    const subSessions: Session[] = [];
    const topSessions: Session[] = [];

    // 1. Check subcollection: courses/{courseId}/sessions
    try {
      const subCol = collection(db, 'courses', courseId, 'sessions');
      const subSnapshot = await getDocs(subCol);
      subSnapshot.forEach(d => {
        subSessions.push({ id: d.id, courseId, ...d.data() } as Session);
      });
    } catch (e) {
      logFirestoreDiagnostic({ operation: 'getSessionsByCourse (subcollection)', path: `courses/${courseId}/sessions` }, e);
    }

    // 2. Also check top-level sessions collection
    try {
      const q = query(collection(db, 'sessions'), where('courseId', '==', courseId));
      const topSnapshot = await getDocs(q);
      topSnapshot.forEach(d => {
        topSessions.push({ id: d.id, ...d.data() } as Session);
      });
    } catch (e) {
      logFirestoreDiagnostic({ operation: 'getSessionsByCourse (top-level)', collection: 'sessions' }, e);
    }

    const merged = mergeCourseSessions(subSessions, topSessions, true);
    if (merged.length > 0) {
      sessionsByCourseCache.set(courseId, { data: merged, timestamp: now });
      return includeUnpublished ? merged : merged.filter(s => s.isPublished !== false);
    }

    // If server returned empty, fallback to authentic production sessions
    sessionsByCourseCache.set(courseId, { data: fallbackSessions, timestamp: now });
    return includeUnpublished ? fallbackSessions : fallbackSessions.filter(s => s.isPublished !== false);
  } catch (err) {
    logFirestoreDiagnostic(
      { operation: 'getSessionsByCourse', collection: 'sessions', path: `courses/${courseId}/sessions` },
      err
    );
    // On quota exhaustion or network disruption, return authentic production sessions
    sessionsByCourseCache.set(courseId, { data: fallbackSessions, timestamp: now });
    return includeUnpublished ? fallbackSessions : fallbackSessions.filter(s => s.isPublished !== false);
  }
}

export async function getSessionById(courseId: string, sessionId: string): Promise<Session | null> {
  try {
    const [subSnap, topSnap] = await Promise.all([
      getDoc(doc(db, 'courses', courseId, 'sessions', sessionId)).catch(() => null),
      getDoc(doc(db, 'sessions', sessionId)).catch(() => null)
    ]);

    const subSession = subSnap && subSnap.exists()
      ? ({ id: subSnap.id, courseId, ...subSnap.data() } as Session)
      : null;
    const topSession = topSnap && topSnap.exists()
      ? ({ id: topSnap.id, ...topSnap.data() } as Session)
      : null;

    if (subSession && topSession) {
      const merged = mergeCourseSessions([subSession], [topSession], true);
      return merged[0] || subSession;
    }
    if (subSession || topSession) {
      return subSession || topSession;
    }
  } catch (err) {
    console.warn('getSessionById live fetch notice:', err);
  }
  return (
    PRODUCTION_SESSIONS.find(
      s => s.id === sessionId || (s.courseId === courseId && matchesSessionIdentifier(s, sessionId))
    ) || null
  );
}

export async function resolveSessionFromRoute(
  sessionIdentifier?: string | null,
  coursesList?: Course[],
  preferredCourseId?: string | null,
  includeUnpublished = false
): Promise<{
  course: Course;
  session: Session;
  allCourseSessions: Session[];
  isRestricted?: boolean;
} | null> {
  try {
    const allCourses =
      coursesList && coursesList.length > 0 ? coursesList : await getCourses(true);
    if (allCourses.length === 0) return null;

    // Sort courses so preferredCourseId is checked first if provided
    const orderedCourses = [...allCourses].sort((a, b) => {
      if (preferredCourseId) {
        if (a.id === preferredCourseId) return -1;
        if (b.id === preferredCourseId) return 1;
      }
      return (a.order || 0) - (b.order || 0);
    });

    const courseWithSessions = await Promise.all(
      orderedCourses.map(async (course) => {
        const sessions = await getSessionsByCourse(course.id, true);
        return { course, sessions };
      })
    );

    if (sessionIdentifier && sessionIdentifier.trim()) {
      for (const { course, sessions } of courseWithSessions) {
        const match = sessions.find((s) => matchesSessionIdentifier(s, sessionIdentifier));
        if (match) {
          const isPublic = canAccessSessionPublicly(match, course);
          if (!isPublic && !includeUnpublished) {
            return {
              course,
              session: {
                id: match.id,
                courseId: course.id,
                title: 'Sesi Pembelajaran Belum Dipublikasikan',
                titleAr: '',
                description: '',
                order: match.order || 1,
                youtubeUrl: '',
                durationMinutes: 0,
                isPublished: false
              },
              allCourseSessions: [],
              isRestricted: true
            };
          }

          const visibleSessions = sessions.filter(
            (s) => includeUnpublished || s.isPublished
          );
          return {
            course,
            session: match,
            allCourseSessions: visibleSessions,
            isRestricted: false
          };
        }
      }
    }

    // Fallback when no specific sessionIdentifier was given (e.g. ?view=session-view)
    for (const { course, sessions } of courseWithSessions) {
      if (!includeUnpublished && !course.isPublished) continue;
      const visibleSessions = sessions.filter((s) => includeUnpublished || s.isPublished);
      if (visibleSessions.length > 0) {
        return {
          course,
          session: visibleSessions[0],
          allCourseSessions: visibleSessions,
          isRestricted: false
        };
      }
    }

    return null;
  } catch (err) {
    console.warn('resolveSessionFromRoute error:', err);
    return null;
  }
}

export async function saveSession(courseId: string, session: Partial<Session> & { title: string }): Promise<string> {
  const id = session.id || `session-${Date.now()}`;
  const path = `courses/${courseId}/sessions/${id}`;
  logCrudDiagnostic('saveSession', path, 'start');
  try {
    const rawData = {
      id,
      courseId,
      title: session.title || `Sesi ${session.order || 1}`,
      titleAr: session.titleAr || '',
      description: session.description || '',
      descriptionAr: session.descriptionAr || '',
      order: Number(session.order) || 1,
      youtubeUrl: session.youtubeUrl || '',
      pdfUrl: session.pdfUrl || '',
      pdfTitle: session.pdfTitle || (session.pdfUrl ? 'Naskah Pembelajaran PDF' : ''),
      googleDriveUrl: session.googleDriveUrl || '',
      lessonNotes: session.lessonNotes || '',
      durationMinutes: Number(session.durationMinutes) || 45,
      isPublished: session.isPublished ?? true,
      quizId: session.quizId || '',
      updatedAt: new Date().toISOString(),
      createdAt: session.createdAt || new Date().toISOString()
    };

    // Sanitize any undefined properties & validate string size before writing to Firestore
    const sessionData: Record<string, any> = {};
    for (const [key, value] of Object.entries(rawData)) {
      if (value !== undefined) {
        if (typeof value === 'string' && value.startsWith('data:') && value.length > 500000) {
          throw new Error(`Data "${key}" berisi berkas lokal terlalu besar (${Math.round(value.length / 1024)} KB) untuk disimpan langsung di Firestore (Batas maksimal dokumen Firestore adalah 1 MB). Harap gunakan Tautan Google Drive PDF atau unggah berkas yang lebih kecil.`);
        }
        sessionData[key] = value;
      }
    }

    // 1. Save to subcollection for clean hierarchy
    await setDoc(doc(db, 'courses', courseId, 'sessions', id), sessionData, { merge: true });
    // 2. Also save to top-level sessions for flat queries
    await setDoc(doc(db, 'sessions', id), sessionData, { merge: true });

    // 3. Update parent course sessionsCount
    try {
      const courseRef = doc(db, 'courses', courseId);
      const courseDoc = await getDoc(courseRef);
      if (courseDoc.exists()) {
        const subSnap = await getDocs(collection(db, 'courses', courseId, 'sessions'));
        await updateDoc(courseRef, {
          sessionsCount: subSnap.size,
          updatedAt: new Date().toISOString()
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Update course sessionsCount notice:', e);
    }

    // Update write-through cache
    const savedSessionObj = { id, courseId, ...sessionData } as Session;
    const cachedEntry = sessionsByCourseCache.get(courseId);
    if (cachedEntry && Array.isArray(cachedEntry.data)) {
      const idx = cachedEntry.data.findIndex((s) => s.id === id);
      if (idx >= 0) {
        cachedEntry.data[idx] = savedSessionObj;
      } else {
        cachedEntry.data.push(savedSessionObj);
      }
      cachedEntry.data.sort((a, b) => (a.order || 0) - (b.order || 0));
      cachedEntry.timestamp = Date.now();
    } else {
      sessionsByCourseCache.set(courseId, { data: [savedSessionObj], timestamp: Date.now() });
    }

    invalidateServicesCache('courses');
    logCrudDiagnostic('saveSession', path, 'success');
    return id;
  } catch (error) {
    logCrudDiagnostic('saveSession', path, 'failed', error);
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteSession(courseId: string, sessionId: string): Promise<void> {
  const path = `courses/${courseId}/sessions/${sessionId}`;
  logCrudDiagnostic('deleteSession', path, 'start');
  try {
    // 1. Delete from subcollection
    await deleteDoc(doc(db, 'courses', courseId, 'sessions', sessionId)).catch(() => {});
    // 2. Delete from top-level sessions
    await deleteDoc(doc(db, 'sessions', sessionId)).catch(() => {});

    // Update write-through cache
    const cachedEntry = sessionsByCourseCache.get(courseId);
    if (cachedEntry && Array.isArray(cachedEntry.data)) {
      cachedEntry.data = cachedEntry.data.filter((s) => s.id !== sessionId);
      cachedEntry.timestamp = Date.now();
    }

    // 3. Unlink from any quizzes that reference this sessionId
    try {
      const quizzes = await getDocs(query(collection(db, 'quizzes'), where('sessionId', '==', sessionId)));
      if (!quizzes.empty) {
        for (const qDoc of quizzes.docs) {
          await updateDoc(doc(db, 'quizzes', qDoc.id), { sessionId: '' }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Quiz unlink notice:', e);
    }
    // 4. Update parent course sessionsCount
    try {
      const courseRef = doc(db, 'courses', courseId);
      const courseDoc = await getDoc(courseRef);
      if (courseDoc.exists()) {
        const subSnap = await getDocs(collection(db, 'courses', courseId, 'sessions'));
        await updateDoc(courseRef, {
          sessionsCount: subSnap.size,
          updatedAt: new Date().toISOString()
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Update course sessionsCount on delete notice:', e);
    }
    invalidateServicesCache('courses');
    logCrudDiagnostic('deleteSession', path, 'success');
  } catch (error) {
    logCrudDiagnostic('deleteSession', path, 'failed', error);
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// ==========================================
// QUIZZES (Cloud Firestore with Production Fallback)
// ==========================================
export async function getQuizById(quizId: string): Promise<Quiz | null> {
  try {
    const d = await getDoc(doc(db, 'quizzes', quizId));
    if (d.exists()) {
      return { id: d.id, ...d.data() } as Quiz;
    }
  } catch (error) {
    console.warn('getQuizById live fetch notice:', error);
  }
  return PRODUCTION_QUIZZES.find(q => q.id === quizId) || null;
}

export async function getQuizzesByCourse(courseId: string): Promise<Quiz[]> {
  try {
    const q = query(collection(db, 'quizzes'), where('courseId', '==', courseId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Quiz));
    }
  } catch (err) {
    console.warn('getQuizzesByCourse live fetch notice:', err);
  }
  return PRODUCTION_QUIZZES.filter(q => q.courseId === courseId);
}

export async function getAllQuizzes(): Promise<Quiz[]> {
  try {
    const snapshot = await getDocs(collection(db, 'quizzes'));
    if (!snapshot.empty) {
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Quiz));
    }
  } catch (err) {
    console.warn('getAllQuizzes live fetch notice:', err);
  }
  return PRODUCTION_QUIZZES;
}

export async function saveQuiz(quiz: Partial<Quiz> & { title: string; courseId: string; questions: any[] }): Promise<string> {
  const id = quiz.id || `quiz-${Date.now()}`;
  const path = `quizzes/${id}`;
  logCrudDiagnostic('saveQuiz', path, 'start');
  try {
    const quizData = {
      ...quiz,
      id,
      passingScore: quiz.passingScore ?? 75,
      timeLimitMinutes: quiz.timeLimitMinutes ?? 0,
      maxAttempts: quiz.maxAttempts ?? 3,
      showAnswersAfterSubmit: quiz.showAnswersAfterSubmit ?? true,
      isPublished: quiz.isPublished ?? true,
      updatedAt: new Date().toISOString(),
      createdAt: quiz.createdAt || new Date().toISOString()
    };
    await setDoc(doc(db, 'quizzes', id), quizData, { merge: true });

    // Verification read-back
    try {
      const vSnap = await getDoc(doc(db, 'quizzes', id));
      if (vSnap.exists()) {
        logCrudDiagnostic(`saveQuiz Verification [ID: ${id}]`, path, 'success');
      }
    } catch (vErr) {
      console.warn('[saveQuiz] Verification notice:', vErr);
    }

    // If quiz has sessionId, update that session's quizId
    if (quiz.sessionId && quiz.courseId) {
      await updateDoc(doc(db, 'courses', quiz.courseId, 'sessions', quiz.sessionId), { quizId: id }).catch(() => {});
      await updateDoc(doc(db, 'sessions', quiz.sessionId), { quizId: id }).catch(() => {});
    }

    logCrudDiagnostic('saveQuiz', path, 'success');
    return id;
  } catch (error) {
    logCrudDiagnostic('saveQuiz', path, 'failed', error);
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteQuiz(quizId: string): Promise<void> {
  const path = `quizzes/${quizId}`;
  logCrudDiagnostic('deleteQuiz', path, 'start');
  try {
    await deleteDoc(doc(db, 'quizzes', quizId));
    // Clear quizId from any sessions
    const sessions = await getDocs(query(collection(db, 'sessions'), where('quizId', '==', quizId))).catch(() => null);
    if (sessions && !sessions.empty) {
      for (const sDoc of sessions.docs) {
        await updateDoc(doc(db, 'sessions', sDoc.id), { quizId: '' }).catch(() => {});
        const sessionData = sDoc.data();
        if (sessionData.courseId) {
          await updateDoc(doc(db, 'courses', sessionData.courseId, 'sessions', sDoc.id), { quizId: '' }).catch(() => {});
        }
      }
    }
    logCrudDiagnostic('deleteQuiz', path, 'success');
  } catch (error) {
    logCrudDiagnostic('deleteQuiz', path, 'failed', error);
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// ==========================================
// ENROLLMENTS & LEARNING PROGRESS
// ==========================================
export async function getEnrollment(userId: string, courseId: string): Promise<Enrollment | null> {
  const enrollmentId = `${userId}_${courseId}`;
  try {
    const d = await getDoc(doc(db, 'enrollments', enrollmentId));
    if (d.exists()) {
      return { id: d.id, ...d.data() } as Enrollment;
    }
    return null;
  } catch (error) {
    console.warn('Could not fetch enrollment:', error);
    return null;
  }
}

export async function getUserEnrollments(userId: string): Promise<Enrollment[]> {
  try {
    const q = query(collection(db, 'enrollments'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment));
  } catch (error) {
    console.warn('Could not fetch user enrollments:', error);
    return [];
  }
}

export async function enrollUser(userId: string, courseId: string): Promise<Enrollment> {
  const enrollmentId = `${userId}_${courseId}`;
  const path = `enrollments/${enrollmentId}`;
  try {
    const newEnrollment: Enrollment = {
      id: enrollmentId,
      userId,
      courseId,
      enrolledAt: new Date().toISOString(),
      completedSessionIds: [],
      progressPercent: 0,
      isCompleted: false
    };
    await setDoc(doc(db, 'enrollments', enrollmentId), newEnrollment, { merge: true });
    return newEnrollment;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function markSessionCompleted(
  userId: string,
  courseId: string,
  sessionId: string,
  totalSessionsCount: number
): Promise<Enrollment> {
  const enrollmentId = `${userId}_${courseId}`;
  const path = `enrollments/${enrollmentId}`;
  try {
    const existing = await getEnrollment(userId, courseId);
    let completed = existing ? [...(existing.completedSessionIds || [])] : [];
    if (!completed.includes(sessionId)) {
      completed.push(sessionId);
    }
    const progressPercent = totalSessionsCount > 0 
      ? Math.min(100, Math.round((completed.length / totalSessionsCount) * 100))
      : 100;
    const isCompleted = progressPercent >= 100;

    const data: Partial<Enrollment> = {
      id: enrollmentId,
      userId,
      courseId,
      lastSessionId: sessionId,
      completedSessionIds: completed,
      progressPercent,
      isCompleted,
      ...(isCompleted && !existing?.isCompleted ? { completedAt: new Date().toISOString() } : {})
    };

    await setDoc(doc(db, 'enrollments', enrollmentId), data, { merge: true });
    return {
      ...(existing || { enrolledAt: new Date().toISOString() }),
      ...data
    } as Enrollment;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// QUIZ ATTEMPTS & GRADING
// ==========================================
export async function saveQuizAttempt(attempt: Omit<QuizAttempt, 'id'>): Promise<string> {
  const attemptId = `${attempt.userId}_${attempt.quizId}_${Date.now()}`;
  const path = `quizAttempts/${attemptId}`;
  try {
    await setDoc(doc(db, 'quizAttempts', attemptId), {
      ...attempt,
      id: attemptId
    });
    return attemptId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getUserQuizAttempts(userId: string): Promise<QuizAttempt[]> {
  try {
    const q = query(collection(db, 'quizAttempts'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QuizAttempt));
  } catch (error) {
    console.warn('Could not fetch user quiz attempts:', error);
    return [];
  }
}

export async function getAllQuizAttempts(): Promise<QuizAttempt[]> {
  try {
    const snapshot = await getDocs(collection(db, 'quizAttempts'));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QuizAttempt));
  } catch (error) {
    console.warn('Could not fetch all quiz attempts:', error);
    return [];
  }
}

// ==========================================
// USER PROFILES & ADMIN ROLE
// ==========================================
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const d = await getDoc(doc(db, 'users', userId));
    if (d.exists()) {
      return { id: d.id, ...d.data() } as UserProfile;
    }
    return null;
  } catch (error) {
    console.warn('Could not fetch user profile:', error);
    return null;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const path = `users/${profile.id}`;
  try {
    await setDoc(doc(db, 'users', profile.id), profile, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function checkIsAdmin(userId: string, email?: string | null): Promise<boolean> {
  if (isPlatformAdminEmail(email)) {
    return true;
  }
  try {
    const adminDoc = await getDoc(doc(db, 'admins', userId));
    if (adminDoc.exists()) {
      return true;
    }
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists() && userDoc.data()?.role === 'admin') {
      return true;
    }
  } catch (err) {
    // If not readable or doesn't exist, check email fallback
  }
  return false;
}

export async function bootstrapAdmin(userId: string, email: string): Promise<void> {
  try {
    await setDoc(doc(db, 'admins', userId), {
      id: userId,
      email,
      role: 'admin',
      addedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Admin bootstrap notice:', err);
  }
}

export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
  } catch (error) {
    console.warn('Could not fetch users list:', error);
    return [];
  }
}

// ==========================================
// FILE STORAGE UPLOAD WITH FALLBACK
// ==========================================
async function compressImageForUpload(file: File, maxDim = 500): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  return new Promise((resolve) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(file);
      }
    }, 3000);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(file);
          }
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              if (!blob) {
                resolve(file);
                return;
              }
              const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressed);
            }
          },
          'image/jpeg',
          0.70
        );
      };
      img.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(file);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(file);
      }
    };
    reader.readAsDataURL(file);
  });
}

function readAsDataURLFallback(file: File, onProgress?: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    // STRICT CHECK: Cloud Firestore has a 1,048,576 bytes (1 MB) document limit.
    // If a raw file is > 450 KB, converting to Base64 data URL yields > 600 KB string which risks exceeding Firestore document limit.
    if (file.size > 450 * 1024) {
      reject(new Error(`Ukuran berkas (${(file.size / (1024 * 1024)).toFixed(1)} MB) terlalu besar untuk disimpan langsung sebagai Data URL di Firestore (Batas maksimal dokumen Firestore adalah 1 MB). Harap pastikan koneksi internet Anda stabil untuk mengunggah ke Firebase Storage, atau gunakan Tautan Google Drive PDF.`));
      return;
    }

    if (onProgress) onProgress(40);
    const reader = new FileReader();
    reader.onload = () => {
      if (onProgress) onProgress(100);
      if (typeof reader.result === 'string') {
        if (reader.result.length > 550000) {
          reject(new Error(`Teks data URL berkas terlalu panjang (${Math.round(reader.result.length / 1024)} KB). Harap gunakan Tautan Google Drive PDF.`));
          return;
        }
        resolve(reader.result);
      } else {
        reject(new Error('Gagal membaca berkas lokal.'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas lokal.'));
    reader.readAsDataURL(file);
  });
}

export async function uploadFileToStorage(
  file: File,
  folder: 'covers' | 'pdfs' | 'documents' | 'avatars' | 'blog_covers' | 'blog_images' | 'article_audio' | 'instructor_profile',
  onProgress?: (percent: number) => void
): Promise<string> {
  const targetFile = file.type.startsWith('image/')
    ? await compressImageForUpload(file, folder === 'avatars' ? 400 : 800)
    : file;

  console.log(`[Storage Upload] Starting upload for ${targetFile.name} (${targetFile.size} bytes, type: ${targetFile.type}) to folder /${folder}`);
  if (onProgress) onProgress(10);

  return new Promise<string>((resolve, reject) => {
    let completed = false;
    let uploadTask: any = null;

    // Timeout duration: Images get 20s, PDFs get 90s to complete upload to Firebase Storage
    const maxTimeoutMs = targetFile.size > 1000000 ? 90000 : 20000;
    let timeoutTimer: any = null;

    const resetTimeout = () => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      timeoutTimer = setTimeout(() => {
        if (!completed) {
          completed = true;
          console.warn(`[Storage Upload] Firebase Storage upload timed out after ${maxTimeoutMs / 1000}s without completion.`);
          try {
            if (uploadTask && typeof uploadTask.cancel === 'function') {
              uploadTask.cancel();
            }
          } catch (e) {
            // Ignore
          }
          readAsDataURLFallback(targetFile, onProgress).then(resolve).catch(reject);
        }
      }, maxTimeoutMs);
    };

    resetTimeout();

    try {
      const fileExt = targetFile.name.split('.').pop() || 'jpg';
      const cleanFileName = targetFile.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      const storageRef = ref(storage, `${folder}/${Date.now()}_${cleanFileName}.${fileExt}`);

      uploadTask = uploadBytesResumable(storageRef, targetFile);

      uploadTask.on(
        'state_changed',
        (snapshot: any) => {
          if (completed) return;
          resetTimeout(); // Keep extending timeout as long as progress is happening
          const total = snapshot.totalBytes || targetFile.size || 1;
          const transferred = snapshot.bytesTransferred || 0;
          const pct = Math.min(99, Math.max(10, Math.round((transferred / total) * 100)));

          if (onProgress) onProgress(pct);
          console.log(`[Storage Upload] Task progress: ${pct}% (${transferred}/${total} bytes), state: ${snapshot.state}`);
        },
        (error: any) => {
          if (completed) return;
          completed = true;
          if (timeoutTimer) clearTimeout(timeoutTimer);
          console.warn('[Storage Upload] Firebase Storage task error:', error?.code || error?.message || error);
          readAsDataURLFallback(targetFile, onProgress).then(resolve).catch(reject);
        },
        async () => {
          if (completed) return;
          completed = true;
          if (timeoutTimer) clearTimeout(timeoutTimer);
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('[Storage Upload] Upload succeeded! Download URL generated successfully.');
            if (onProgress) onProgress(100);
            resolve(downloadUrl);
          } catch (err) {
            console.warn('[Storage Upload] getDownloadURL failed, switching to Data URL fallback:', err);
            readAsDataURLFallback(targetFile, onProgress).then(resolve).catch(reject);
          }
        }
      );
    } catch (err) {
      if (!completed) {
        completed = true;
        if (timeoutTimer) clearTimeout(timeoutTimer);
        console.warn('[Storage Upload] Exception initializing uploadTask:', err);
        readAsDataURLFallback(targetFile, onProgress).then(resolve).catch(reject);
      }
    }
  });
}

// ==========================================
// EXPLICIT DATABASE SEEDING (Admin Triggered)
// ==========================================
export async function seedInitialDatabase(): Promise<{ categories: number; courses: number; sessions: number; quizzes: number }> {
  let catCount = 0;
  let courseCount = 0;
  let sessionCount = 0;
  let quizCount = 0;

  try {
    // 1. Categories
    for (const cat of SEED_CATEGORIES) {
      await setDoc(doc(db, 'categories', cat.id), cat, { merge: true });
      catCount++;
    }

    // 2. Courses
    for (const crs of SEED_COURSES) {
      await setDoc(doc(db, 'courses', crs.id), crs, { merge: true });
      courseCount++;
    }

    // 3. Sessions
    for (const ses of SEED_SESSIONS) {
      await setDoc(doc(db, 'courses', ses.courseId, 'sessions', ses.id), ses, { merge: true });
      await setDoc(doc(db, 'sessions', ses.id), ses, { merge: true });
      sessionCount++;
    }

    // 4. Quizzes
    for (const qz of SEED_QUIZZES) {
      await setDoc(doc(db, 'quizzes', qz.id), qz, { merge: true });
      quizCount++;
    }

    // Set initialization marker
    await setDoc(doc(db, 'system', 'initialized'), {
      initialized: true,
      seededAt: new Date().toISOString(),
      version: '1.0'
    }, { merge: true });

    return { categories: catCount, courses: courseCount, sessions: sessionCount, quizzes: quizCount };
  } catch (error) {
    console.error('Error during database seed:', error);
    throw error;
  }
}

// ==========================================
// CLEANUP SEED/DUMMY DATA FROM FIRESTORE
// ==========================================
export async function deleteSeedDummyDataFromFirestore(): Promise<{ deletedCourses: number; deletedCategories: number; deletedQuizzes: number }> {
  let deletedCourses = 0;
  let deletedCategories = 0;
  let deletedQuizzes = 0;

  try {
    // Delete seed courses
    for (const crs of SEED_COURSES) {
      const d = await getDoc(doc(db, 'courses', crs.id)).catch(() => null);
      if (d && d.exists()) {
        await deleteCourse(crs.id);
        deletedCourses++;
      }
    }

    // Delete seed categories if requested
    for (const cat of SEED_CATEGORIES) {
      const d = await getDoc(doc(db, 'categories', cat.id)).catch(() => null);
      if (d && d.exists()) {
        await deleteCategory(cat.id);
        deletedCategories++;
      }
    }

    // Delete seed quizzes
    for (const qz of SEED_QUIZZES) {
      const d = await getDoc(doc(db, 'quizzes', qz.id)).catch(() => null);
      if (d && d.exists()) {
        await deleteQuiz(qz.id);
        deletedQuizzes++;
      }
    }

    // Also delete dummy seed blog posts if present
    await deleteDummyBlogPostsFromFirestore().catch(() => 0);

    return { deletedCourses, deletedCategories, deletedQuizzes };
  } catch (error) {
    console.error('Error deleting seed dummy data:', error);
    throw error;
  }
}

// ==========================================
// BLOG POSTS (Cloud Firestore)
// ==========================================

export const INITIAL_BLOG_POSTS: BlogPost[] = [
  {
    id: 'post-1',
    title: "Menuntut Ilmu Syar'i: Keutamaan, Niat, dan Adab Para Penuntut Ilmu",
    titleAr: "طَلَبُ العِلْمِ الشَّرْعِيِّ: فَضْلُهُ وَنِيَّتُهُ وَآدَابُهُ",
    slug: 'menuntut-ilmu-syari-keutamaan-niat-dan-adab',
    excerpt: "Memahami betapa tingginya kedudukan ilmu agama dalam Islam serta pentingnya meluruskan niat dan menjaga adab dalam majelis ilmu.",
    content: `
      <h2>Keutamaan Menuntut Ilmu Agama dalam Al-Qur'an dan As-Sunnah</h2>
      <p>Ilmu syar'i adalah lentera penerang jalan seorang hamba menuju keridhaan Allah Subhanahu wa Ta'ala. Dalam Al-Qur'an, Allah menegaskan kedudukan mulia orang-orang yang berilmu:</p>
      <blockquote class="my-4 border-l-4 border-emerald-600 pl-4 italic text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-stone-900/60 p-3 rounded-r-xl">
        "Niscaya Allah akan meninggikan orang-orang yang beriman di antaramu dan orang-orang yang diberi ilmu pengetahuan beberapa derajat." (QS. Al-Mujadilah: 11)
      </blockquote>
      <p>Rasulullah صلى الله عليه وسلم juga bersabda dalam hadits shahih riwayat Muslim:</p>
      <div class="my-4 p-4 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-right font-amiri text-xl text-emerald-800 dark:text-emerald-300" dir="rtl">
        مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا، سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ
      </div>
      <p class="text-xs text-stone-500 mb-4">"Barangsiapa menempuh suatu jalan untuk mencari ilmu, maka Allah akan memudahkan baginya jalan menuju surga." (HR. Muslim)</p>
      
      <h2>3 Adab Utama Penuntut Ilmu</h2>
      <ol class="list-decimal pl-6 space-y-2 my-3">
        <li><strong>Ikhlas Niat Karena Allah:</strong> Membersihkan niat dari mencari pujian, kedudukan, atau popularitas duniawi.</li>
        <li><strong>Menghormati Guru & Majelis:</strong> Mendengarkan dengan khusyuk dan mencatat faedah ilmu dengan cermat.</li>
        <li><strong>Mengamalkan Ilmu:</strong> Buah dari ilmu adalah amal shalih dan akhlak yang mulia.</li>
      </ol>
    `,
    coverImageUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=1200&auto=format&fit=crop',
    coverImageCaption: 'Kitab-kitab turats dan naskah klasik keilmuan Islam',
    category: 'Adab & Akhlak',
    tags: ['Ilmu Syar\'i', 'Adab', 'Keutamaan Ilmu', 'Tazkiyah'],
    status: 'published',
    isFeatured: true,
    authorName: 'Osama',
    authorRole: 'Pengasuh Dars with Osama',
    readingTimeMinutes: 4,
    viewsCount: 142,
    publishedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'post-2',
    title: "Panduan Tadabbur Al-Qur'an: Memahami Makna dan Meresapi Renungan Ayat",
    titleAr: "دَلِيلُ تَدَبُّرِ القُرْآنِ الكَرِيمِ",
    slug: 'panduan-tadabbur-al-quran-memahami-makna-dan-renungan',
    excerpt: "Langkah-langkah praktis bagi setiap muslim untuk menyelami keindahan serta hikmah Al-Qur'an dalam kehidupan sehari-hari.",
    content: `
      <h2>Apa itu Tadabbur Al-Qur'an?</h2>
      <p>Tadabbur adalah merenungkan makna ayat-ayat Al-Qur'an secara mendalam hingga pesan Allah meresap ke dalam jiwa dan menggerakkan anggota badan untuk beramal.</p>
      <h2>Langkah Praktis Bertadabbur</h2>
      <ul class="list-disc pl-6 space-y-2 my-3">
        <li>Membaca dengan tartil dan perlahan.</li>
        <li>Merujuk kitab tafsir mu'tabar seperti Tafsir Ibn Katsir atau Tafsir As-Sa'di.</li>
        <li>Menghubungkan pesan ayat dengan kondisi diri dan berdoa memohon taufik.</li>
      </ul>
    `,
    coverImageUrl: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?q=80&w=1200&auto=format&fit=crop',
    coverImageCaption: 'Membaca Al-Qur\'an dengan khusyuk dan tadabbur',
    category: 'Tafsir & Al-Qur\'an',
    tags: ['Al-Qur\'an', 'Tadabbur', 'Tafsir', 'Ibadah'],
    status: 'published',
    isFeatured: false,
    authorName: 'Osama',
    authorRole: 'Pengasuh Dars with Osama',
    readingTimeMinutes: 5,
    viewsCount: 98,
    publishedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 7).toISOString()
  }
];

export async function getBlogPosts(includeDrafts = false): Promise<BlogPost[]> {
  const now = Date.now();
  if (blogPostsCache && now - blogPostsCache.timestamp < CACHE_TTL_MS) {
    let posts = blogPostsCache.data;
    return filterProductionBlogPosts(posts, includeDrafts);
  }

  try {
    const snapshot = await getDocs(collection(db, 'blogPosts'));
    if (!snapshot.empty) {
      const rawPosts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BlogPost));

      // If an admin session detects auto-seeded dummy articles in Firestore, clean them up non-destructively
      if (auth.currentUser && isPlatformAdminEmail(auth.currentUser.email)) {
        for (const p of rawPosts) {
          if (isDummySeedBlogPost(p)) {
            deleteDoc(doc(db, 'blogPosts', p.id)).catch(() => {});
          }
        }
      }

      const filtered = filterProductionBlogPosts(rawPosts, true);
      if (filtered.length > 0) {
        if (blogPostsCache && Array.isArray(blogPostsCache.data)) {
          const fetchedIds = new Set(filtered.map(p => p.id));
          const extraLocal = blogPostsCache.data.filter(p => p && !fetchedIds.has(p.id));
          const merged = [...extraLocal, ...filtered];
          blogPostsCache = { data: merged, timestamp: now };
          return filterProductionBlogPosts(merged, includeDrafts);
        }
        blogPostsCache = { data: filtered, timestamp: now };
        return filterProductionBlogPosts(filtered, includeDrafts);
      }
    }

    if (blogPostsCache && Array.isArray(blogPostsCache.data) && blogPostsCache.data.length > 0) {
      return filterProductionBlogPosts(blogPostsCache.data, includeDrafts);
    }

    blogPostsCache = { data: PRODUCTION_BLOG_POSTS, timestamp: now };
    return filterProductionBlogPosts(PRODUCTION_BLOG_POSTS, includeDrafts);
  } catch (err) {
    logFirestoreDiagnostic({ operation: 'getBlogPosts', collection: 'blogPosts' }, err);
    if (blogPostsCache && Array.isArray(blogPostsCache.data) && blogPostsCache.data.length > 0) {
      return filterProductionBlogPosts(blogPostsCache.data, includeDrafts);
    }
    blogPostsCache = { data: PRODUCTION_BLOG_POSTS, timestamp: now };
    return filterProductionBlogPosts(PRODUCTION_BLOG_POSTS, includeDrafts);
  }
}

export async function deleteDummyBlogPostsFromFirestore(): Promise<number> {
  let count = 0;
  for (const post of INITIAL_BLOG_POSTS) {
    try {
      await deleteDoc(doc(db, 'blogPosts', post.id));
      count++;
    } catch (err) {
      // ignore if not exists
    }
  }
  return count;
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const q = query(collection(db, 'blogPosts'), where('slug', '==', slug));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      const post = { id: docSnap.id, ...docSnap.data() } as BlogPost;
      if (!isDummySeedBlogPost(post)) return post;
    }
  } catch (error) {
    console.warn('getBlogPostBySlug live fetch notice:', error);
  }
  return PRODUCTION_BLOG_POSTS.find(p => p.slug === slug || p.id === slug) || null;
}

export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  try {
    const d = await getDoc(doc(db, 'blogPosts', id));
    if (d.exists()) {
      const post = { id: d.id, ...d.data() } as BlogPost;
      if (!isDummySeedBlogPost(post)) return post;
    }
  } catch (error) {
    console.warn('getBlogPostById live fetch notice:', error);
  }
  return PRODUCTION_BLOG_POSTS.find(p => p.id === id) || null;
}

export async function saveBlogPost(post: Partial<BlogPost> & { title: string }): Promise<string> {
  const id = post.id || `post-${Date.now()}`;
  const path = `blogPosts/${id}`;
  logCrudDiagnostic('saveBlogPost', path, 'start');

  let baseSlug = (post.slug || post.title)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  if (!baseSlug) baseSlug = `artikel-${Date.now()}`;

  let finalSlug = baseSlug;
  try {
    const existingWithSlug = await getBlogPostBySlug(finalSlug);
    if (existingWithSlug && existingWithSlug.id !== id) {
      finalSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }
  } catch (err) {
    // ignore
  }

  const sanitizedContent = sanitizeRichTextHtml(post.content || '');
  const wordCount = sanitizedContent.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 180));

  const now = new Date().toISOString();
  const status: 'published' | 'draft' = post.status === 'draft' ? 'draft' : 'published';

  // Manage publishedAt date based on status
  let publishedAt = post.publishedAt || '';
  if (status === 'published') {
    if (!publishedAt) publishedAt = now;
  } else {
    // For drafts, retain existing publishedAt if present or keep empty
    publishedAt = post.publishedAt || '';
  }

  const data: Record<string, any> = {
    id,
    title: post.title.trim(),
    titleAr: post.titleAr || '',
    slug: finalSlug,
    excerpt: post.excerpt || '',
    content: sanitizedContent,
    contentAr: post.contentAr || '',
    coverImageUrl: post.coverImageUrl || '',
    coverImageCaption: post.coverImageCaption || '',
    category: post.category || 'Kajian Umum',
    tags: Array.isArray(post.tags) ? post.tags : [],
    status,
    isFeatured: Boolean(post.isFeatured),
    authorName: post.authorName || 'Osama',
    authorPhoto: post.authorPhoto || '',
    authorRole: post.authorRole || 'Pengasuh Dars with Osama',
    readingTimeMinutes,
    viewsCount: Number(post.viewsCount) || 0,
    publishedAt,
    createdAt: post.createdAt || now,
    updatedAt: now
  };

  if (post.audioConfig) {
    data.audioConfig = {
      enabled: Boolean(post.audioConfig.enabled),
      mode: post.audioConfig.mode || 'speech',
      speechRate: Number(post.audioConfig.speechRate) || 1.0,
      speechVoiceName: post.audioConfig.speechVoiceName || '',
      customAudioUrl: post.audioConfig.customAudioUrl || ''
    };
  }

  try {
    // 1. Write document to Firestore
    await setDoc(doc(db, 'blogPosts', id), data, { merge: true });

    // 2. Perform verification read-back from server/cache
    let verifiedPost: BlogPost = data as BlogPost;
    try {
      const verifySnap = await getDoc(doc(db, 'blogPosts', id));
      if (verifySnap.exists()) {
        verifiedPost = { id: verifySnap.id, ...verifySnap.data() } as BlogPost;
        logCrudDiagnostic(`saveBlogPost Verification [ID: ${verifiedPost.id}, Status: ${verifiedPost.status}, Title: "${verifiedPost.title}"]`, path, 'success');
      }
    } catch (vErr) {
      console.warn('[saveBlogPost] Verification read-back notice:', vErr);
    }

    // 3. Immediately update in-memory cache with the verified/saved post
    if (blogPostsCache && Array.isArray(blogPostsCache.data)) {
      const idx = blogPostsCache.data.findIndex((p) => p.id === id);
      if (idx >= 0) {
        blogPostsCache.data[idx] = verifiedPost;
      } else {
        blogPostsCache.data.unshift(verifiedPost);
      }
      blogPostsCache.timestamp = Date.now();
    } else {
      blogPostsCache = {
        data: [verifiedPost, ...PRODUCTION_BLOG_POSTS.filter((p) => p.id !== id)],
        timestamp: Date.now()
      };
    }

    logCrudDiagnostic('saveBlogPost', path, 'success');
    return id;
  } catch (error) {
    logCrudDiagnostic('saveBlogPost', path, 'failed', error);
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteBlogPost(id: string): Promise<void> {
  const path = `blogPosts/${id}`;
  logCrudDiagnostic('deleteBlogPost', path, 'start');
  try {
    await deleteDoc(doc(db, 'blogPosts', id));
    if (blogPostsCache && Array.isArray(blogPostsCache.data)) {
      blogPostsCache.data = blogPostsCache.data.filter((p) => p.id !== id);
      blogPostsCache.timestamp = Date.now();
    }
    logCrudDiagnostic('deleteBlogPost', path, 'success');
  } catch (error) {
    logCrudDiagnostic('deleteBlogPost', path, 'failed', error);
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function incrementBlogPostViews(id: string): Promise<void> {
  try {
    const postRef = doc(db, 'blogPosts', id);
    const snap = await getDoc(postRef);
    if (snap.exists()) {
      const currentViews = snap.data().viewsCount || 0;
      await updateDoc(postRef, { viewsCount: currentViews + 1 });
    }
  } catch (err) {
    // ignore
  }
}

export async function seedDefaultBlogPostsIfEmpty(): Promise<BlogPost[]> {
  try {
    const snap = await getDocs(collection(db, 'blogPosts'));
    if (!snap.empty) {
      const posts = snap.docs.map(d => ({ id: d.id, ...d.data() } as BlogPost));
      return posts;
    }

    if (!auth.currentUser) return [];

    console.log('Seeding default blog posts to Cloud Firestore...');
    for (const post of INITIAL_BLOG_POSTS) {
      await setDoc(doc(db, 'blogPosts', post.id), post, { merge: true });
    }
    return await getBlogPosts(true);
  } catch (err) {
    console.warn('seedDefaultBlogPostsIfEmpty notice:', err);
    return [];
  }
}

// ==========================================
// CONSULTATION SERVICES (Ruang Konsultasi)
// ==========================================

export async function createConsultation(data: {
  title: string;
  content: string;
  category: 'learning' | 'private';
}): Promise<string> {
  if (!auth.currentUser) {
    throw new Error('Harus login terlebih dahulu untuk mengajukan pertanyaan konsultasi.');
  }

  const newRef = doc(collection(db, 'consultations'));
  const now = new Date().toISOString();
  
  const payload: Consultation = {
    id: newRef.id,
    studentId: auth.currentUser.uid,
    studentName: auth.currentUser.displayName || 'Santri',
    studentEmail: auth.currentUser.email || '',
    title: data.title.trim(),
    content: data.content.trim(),
    category: data.category,
    status: 'pending',
    isPublished: false,
    createdAt: now,
    updatedAt: now
  };

  const path = `consultations/${newRef.id}`;
  try {
    await setDoc(newRef, payload);
    invalidateServicesCache('qa');
    return newRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function getStudentConsultations(studentId: string): Promise<Consultation[]> {
  const path = `consultations`;
  try {
    const q = query(collection(db, 'consultations'), where('studentId', '==', studentId));
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Consultation));
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (error) {
    console.warn('getStudentConsultations live fetch notice:', error);
    return PRODUCTION_CONSULTATIONS.filter(c => c.studentId === studentId);
  }
}

export async function getAllConsultationsForAdmin(): Promise<Consultation[]> {
  const path = `consultations`;
  try {
    const snapshot = await getDocs(collection(db, 'consultations'));
    if (!snapshot.empty) {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Consultation));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    }
  } catch (error) {
    console.warn('getAllConsultationsForAdmin live fetch notice:', error);
  }
  return [...PRODUCTION_CONSULTATIONS].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getPublishedPublicQA(): Promise<Consultation[]> {
  const now = Date.now();
  if (publicQACache && now - publicQACache.timestamp < CACHE_TTL_MS) {
    return publicQACache.data;
  }

  const fallbackQA = PRODUCTION_CONSULTATIONS
    .filter(c => c.isPublished)
    .sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());

  try {
    const q = query(
      collection(db, 'consultations'),
      where('category', '==', 'learning'),
      where('isPublished', '==', true)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Consultation));
      list.sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());

      if (publicQACache && Array.isArray(publicQACache.data)) {
        const fetchedIds = new Set(list.map(c => c.id));
        const extraLocal = publicQACache.data.filter(c => c && !fetchedIds.has(c.id));
        const merged = [...list, ...extraLocal];
        merged.sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());
        publicQACache = { data: merged, timestamp: now };
        return merged;
      }

      publicQACache = { data: list, timestamp: now };
      return list;
    }

    if (publicQACache && Array.isArray(publicQACache.data) && publicQACache.data.length > 0) {
      return publicQACache.data;
    }

    publicQACache = { data: fallbackQA, timestamp: now };
    return fallbackQA;
  } catch (error) {
    logFirestoreDiagnostic({ operation: 'getPublishedPublicQA', collection: 'consultations' }, error);
    if (publicQACache && Array.isArray(publicQACache.data) && publicQACache.data.length > 0) {
      return publicQACache.data;
    }
    publicQACache = { data: fallbackQA, timestamp: now };
    return fallbackQA;
  }
}

export async function replyConsultation(
  consultationId: string,
  replyContent: string,
  newStatus: 'answered' | 'closed' = 'answered'
): Promise<void> {
  const path = `consultations/${consultationId}`;
  const now = new Date().toISOString();
  logCrudDiagnostic('replyConsultation', path, 'start');
  
  try {
    const docRef = doc(db, 'consultations', consultationId);
    await updateDoc(docRef, {
      replyContent: replyContent.trim(),
      repliedAt: now,
      repliedBy: 'Ustaz / Admin',
      status: newStatus,
      updatedAt: now
    });
    invalidateServicesCache('qa');
    logCrudDiagnostic('replyConsultation', path, 'success');
  } catch (error) {
    logCrudDiagnostic('replyConsultation', path, 'failed', error);
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function togglePublishConsultation(
  consultationId: string,
  isPublished: boolean
): Promise<void> {
  const path = `consultations/${consultationId}`;
  const now = new Date().toISOString();
  logCrudDiagnostic('togglePublishConsultation', path, 'start');

  try {
    const docRef = doc(db, 'consultations', consultationId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Consultation;
      // Private consultations can NEVER be published
      if (data.category === 'private' && isPublished) {
        throw new Error('Konsultasi bersifat pribadi dan tidak diperkenankan untuk dipublikasikan.');
      }
    }

    await updateDoc(docRef, {
      isPublished,
      publishedAt: isPublished ? now : null,
      updatedAt: now
    });
    invalidateServicesCache('qa');
    logCrudDiagnostic('togglePublishConsultation', path, 'success');
  } catch (error) {
    logCrudDiagnostic('togglePublishConsultation', path, 'failed', error);
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function updateConsultationStatus(
  consultationId: string,
  status: 'pending' | 'answered' | 'closed'
): Promise<void> {
  const path = `consultations/${consultationId}`;
  const now = new Date().toISOString();
  logCrudDiagnostic('updateConsultationStatus', path, 'start');

  try {
    const docRef = doc(db, 'consultations', consultationId);
    await updateDoc(docRef, {
      status,
      updatedAt: now
    });
    invalidateServicesCache('qa');
    logCrudDiagnostic('updateConsultationStatus', path, 'success');
  } catch (error) {
    logCrudDiagnostic('updateConsultationStatus', path, 'failed', error);
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// ==========================================
// ARTICLE COMMENTS SERVICES (Komentar Pembaca)
// ==========================================

export async function createArticleComment(data: {
  articleId: string;
  authorName: string;
  content: string;
  userId?: string;
}): Promise<string> {
  const cleanName = data.authorName.trim();
  const cleanContent = data.content.trim();

  if (!cleanName || cleanName.length < 2 || cleanName.length > 100) {
    throw new Error('Nama pembaca harus antara 2 hingga 100 karakter.');
  }

  if (!cleanContent || cleanContent.length < 5 || cleanContent.length > 1000) {
    throw new Error('Isi komentar harus antara 5 hingga 1000 karakter.');
  }

  const newRef = doc(collection(db, 'articleComments'));
  const now = new Date().toISOString();

  const payload: ArticleComment = {
    id: newRef.id,
    articleId: data.articleId,
    authorName: cleanName,
    content: cleanContent,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    ...(data.userId ? { userId: data.userId } : {})
  };

  const path = `articleComments/${newRef.id}`;
  try {
    await setDoc(newRef, payload);
    return newRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function getApprovedArticleComments(articleId: string): Promise<ArticleComment[]> {
  const path = `articleComments`;
  try {
    const q = query(
      collection(db, 'articleComments'),
      where('articleId', '==', articleId),
      where('status', '==', 'approved')
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ArticleComment));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    }
  } catch (error) {
    logFirestoreDiagnostic({ operation: 'getApprovedArticleComments', collection: 'articleComments', path }, error);
  }
  return (PRODUCTION_COMMENTS || [])
    .filter(c => c.articleId === articleId && c.status === 'approved')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getAllArticleCommentsForAdmin(articleId?: string): Promise<ArticleComment[]> {
  const path = `articleComments`;
  try {
    let q;
    if (articleId) {
      q = query(collection(db, 'articleComments'), where('articleId', '==', articleId));
    } else {
      q = query(collection(db, 'articleComments'));
    }
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ArticleComment));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    }
  } catch (error) {
    logFirestoreDiagnostic({ operation: 'getAllArticleCommentsForAdmin', collection: 'articleComments', path }, error);
  }
  return (PRODUCTION_COMMENTS || [])
    .filter(c => !articleId || c.articleId === articleId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function moderateArticleComment(
  commentId: string,
  newStatus: 'approved' | 'rejected',
  moderatedBy = 'Admin'
): Promise<void> {
  const path = `articleComments/${commentId}`;
  const now = new Date().toISOString();

  try {
    const docRef = doc(db, 'articleComments', commentId);
    await updateDoc(docRef, {
      status: newStatus,
      moderatedAt: now,
      moderatedBy,
      updatedAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteArticleComment(commentId: string): Promise<void> {
  const path = `articleComments/${commentId}`;
  try {
    const docRef = doc(db, 'articleComments', commentId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// ==========================================
// INSTRUCTOR PROFILE SERVICES (Profil Pengajar)
// ==========================================

const INSTRUCTOR_PROFILE_CACHE_KEY = 'dars_instructor_profile_v1';

function readCachedInstructorProfile(): InstructorProfile | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(INSTRUCTOR_PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InstructorProfile;
    if (parsed && parsed.name && parsed.role) {
      return {
        ...getDefaultInstructorProfile(),
        ...parsed,
        supportingImages: normalizeSupportingImages(parsed.supportingImages),
        sections: normalizeProfileSections(parsed.sections)
      };
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function writeCachedInstructorProfile(profile: InstructorProfile): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(INSTRUCTOR_PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch {
    // ignore quota or storage errors
  }
}

export async function getInstructorProfile(): Promise<InstructorProfile> {
  const docId = DEFAULT_INSTRUCTOR_PROFILE_ID;
  try {
    const snap = await getDoc(doc(db, 'instructorProfiles', docId));
    if (snap.exists()) {
      const data = snap.data() as Partial<InstructorProfile>;
      const defaults = getDefaultInstructorProfile();
      const merged: InstructorProfile = {
        id: docId,
        name: (data.name ?? defaults.name).trim() || defaults.name,
        role: (data.role ?? defaults.role).trim() || defaults.role,
        title: (data.title ?? defaults.title).trim() || defaults.title,
        biography: sanitizeRichTextHtml(data.biography ?? defaults.biography),
        mainContent: sanitizeRichTextHtml(data.mainContent ?? defaults.mainContent),
        photoUrl: data.photoUrl || '',
        photoCaption: data.photoCaption || '',
        supportingImages: normalizeSupportingImages(data.supportingImages),
        sections: normalizeProfileSections(data.sections),
        updatedAt: data.updatedAt || defaults.updatedAt,
        ...(data.updatedBy ? { updatedBy: data.updatedBy } : {})
      };
      writeCachedInstructorProfile(merged);
      return merged;
    }
    // Document does not exist on server: return authentic production profile
    if (PRODUCTION_INSTRUCTOR_PROFILE) {
      return PRODUCTION_INSTRUCTOR_PROFILE;
    }
    return getDefaultInstructorProfile();
  } catch (err) {
    logFirestoreDiagnostic({ operation: 'getInstructorProfile', collection: 'instructorProfiles' }, err);
    // Use local cache or authentic production profile when offline or quota exhausted
    const cached = readCachedInstructorProfile();
    if (cached) {
      return cached;
    }
    if (PRODUCTION_INSTRUCTOR_PROFILE) {
      return PRODUCTION_INSTRUCTOR_PROFILE;
    }
    return getDefaultInstructorProfile();
  }
}

export async function saveInstructorProfile(
  input: Partial<InstructorProfile>
): Promise<InstructorProfile> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Akses ditolak: Anda harus login sebagai administrator untuk menyimpan Profil Pengajar.');
  }

  const isVerifiedAdmin = await checkIsAdmin(currentUser.uid, currentUser.email);
  if (!isVerifiedAdmin) {
    throw new Error('Akses ditolak: Hanya administrator terautentikasi yang berhak mengubah Profil Pengajar.');
  }

  const sanitizedProfile = sanitizeInstructorProfilePayload(
    input,
    currentUser.email || currentUser.uid
  );

  // Guard against oversized inline Base64 data URLs exceeding Firestore 1MB document limit
  const serializedSize = JSON.stringify(sanitizedProfile).length;
  if (serializedSize > 900000) {
    throw new Error(
      `Ukuran data profil (${Math.round(serializedSize / 1024)} KB) mendekati batas 1 MB dokumen Cloud Firestore. Harap kurangi ukuran gambar pendukung atau gunakan URL gambar terkompresi.`
    );
  }

  const path = `instructorProfiles/${DEFAULT_INSTRUCTOR_PROFILE_ID}`;
  try {
    await setDoc(doc(db, 'instructorProfiles', DEFAULT_INSTRUCTOR_PROFILE_ID), sanitizedProfile, { merge: true });
    writeCachedInstructorProfile(sanitizedProfile);
    return sanitizedProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}



