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
import { db, storage, handleFirestoreError, OperationType, auth } from './config';
import { Category, Course, Session, Quiz, Enrollment, QuizAttempt, UserProfile, BlogPost } from '../types';
import { SEED_CATEGORIES, SEED_COURSES, SEED_SESSIONS, SEED_QUIZZES } from '../data/seedData';

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

// ==========================================
// CATEGORIES (Cloud Firestore Only)
// ==========================================
export async function getCategories(): Promise<Category[]> {
  try {
    const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Category));
    }
    // Return empty array - no prototype memory fallback!
    return [];
  } catch (err) {
    console.warn('getCategories error, returning empty list:', err);
    return [];
  }
}

export async function saveCategory(category: Partial<Category> & { name: string; slug: string }): Promise<string> {
  const id = category.id || `cat-${Date.now()}`;
  const path = `categories/${id}`;
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
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const path = `categories/${id}`;
  try {
    await deleteDoc(doc(db, 'categories', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedDefaultCategoriesIfEmpty(): Promise<Category[]> {
  try {
    const snap = await getDocs(collection(db, 'categories'));
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
    }
    // Only write if authenticated
    if (!auth.currentUser) return [];

    console.log('Seeding default categories to Cloud Firestore...');
    for (const cat of SEED_CATEGORIES) {
      await setDoc(doc(db, 'categories', cat.id), cat, { merge: true });
    }
    const fresh = await getCategories();
    return fresh;
  } catch (err) {
    console.warn('seedDefaultCategoriesIfEmpty notice:', err);
    return [];
  }
}

// ==========================================
// COURSES (Cloud Firestore Only)
// ==========================================
export async function getCourses(includeUnpublished = false): Promise<Course[]> {
  try {
    const snapshot = await getDocs(collection(db, 'courses'));
    if (!snapshot.empty) {
      const courses = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Course));
      courses.sort((a, b) => (a.order || 0) - (b.order || 0));
      if (!includeUnpublished) {
        return courses.filter(c => c.isPublished);
      }
      return courses;
    }
    // Pure Firestore source - never fallback to in-memory dummy arrays!
    return [];
  } catch (err) {
    console.warn('getCourses read error:', err);
    return [];
  }
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  try {
    const d = await getDoc(doc(db, 'courses', courseId));
    if (d.exists()) {
      return { id: d.id, ...d.data() } as Course;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `courses/${courseId}`);
  }
}

export async function saveCourse(course: Partial<Course> & { title: string; categoryId: string }): Promise<string> {
  const id = course.id || `course-${Date.now()}`;
  const path = `courses/${id}`;
  try {
    await setDoc(doc(db, 'courses', id), {
      ...course,
      id,
      isPublished: course.isPublished ?? true,
      hasCertificate: course.hasCertificate ?? true,
      passingGrade: course.passingGrade ?? 75,
      order: course.order || 1,
      updatedAt: new Date().toISOString(),
      createdAt: course.createdAt || new Date().toISOString()
    }, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCourse(courseId: string): Promise<void> {
  const path = `courses/${courseId}`;
  try {
    // 1. Delete course document from Cloud Firestore
    await deleteDoc(doc(db, 'courses', courseId));

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
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// SESSIONS (Cloud Firestore Only)
// ==========================================
export async function getSessionsByCourse(courseId: string, includeUnpublished = false): Promise<Session[]> {
  try {
    const sessionMap = new Map<string, Session>();

    // 1. Check subcollection: courses/{courseId}/sessions
    try {
      const subCol = collection(db, 'courses', courseId, 'sessions');
      const subSnapshot = await getDocs(subCol);
      subSnapshot.forEach(d => {
        sessionMap.set(d.id, { id: d.id, courseId, ...d.data() } as Session);
      });
    } catch (e) {
      console.warn('Error reading subcollection sessions:', e);
    }

    // 2. Also check top-level sessions collection
    try {
      const q = query(collection(db, 'sessions'), where('courseId', '==', courseId));
      const topSnapshot = await getDocs(q);
      topSnapshot.forEach(d => {
        if (!sessionMap.has(d.id)) {
          sessionMap.set(d.id, { id: d.id, ...d.data() } as Session);
        }
      });
    } catch (e) {
      console.warn('Error reading top-level sessions:', e);
    }

    const sessions = Array.from(sessionMap.values());
    sessions.sort((a, b) => (a.order || 0) - (b.order || 0));

    if (!includeUnpublished) {
      return sessions.filter(s => s.isPublished);
    }
    return sessions;
  } catch (err) {
    console.warn('getSessionsByCourse error, returning empty list:', err);
    return [];
  }
}

export async function getSessionById(courseId: string, sessionId: string): Promise<Session | null> {
  try {
    // Check subcollection
    const d = await getDoc(doc(db, 'courses', courseId, 'sessions', sessionId));
    if (d.exists()) {
      return { id: d.id, courseId, ...d.data() } as Session;
    }
    // Check top-level
    const topD = await getDoc(doc(db, 'sessions', sessionId));
    if (topD.exists()) {
      return { id: topD.id, ...topD.data() } as Session;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `courses/${courseId}/sessions/${sessionId}`);
  }
}

export async function saveSession(courseId: string, session: Partial<Session> & { title: string }): Promise<string> {
  const id = session.id || `session-${Date.now()}`;
  const path = `courses/${courseId}/sessions/${id}`;
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

    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSession(courseId: string, sessionId: string): Promise<void> {
  const path = `courses/${courseId}/sessions/${sessionId}`;
  try {
    // 1. Delete from subcollection
    await deleteDoc(doc(db, 'courses', courseId, 'sessions', sessionId)).catch(() => {});
    // 2. Delete from top-level sessions
    await deleteDoc(doc(db, 'sessions', sessionId)).catch(() => {});
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
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// QUIZZES (Cloud Firestore Only)
// ==========================================
export async function getQuizById(quizId: string): Promise<Quiz | null> {
  try {
    const d = await getDoc(doc(db, 'quizzes', quizId));
    if (d.exists()) {
      return { id: d.id, ...d.data() } as Quiz;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `quizzes/${quizId}`);
  }
}

export async function getQuizzesByCourse(courseId: string): Promise<Quiz[]> {
  try {
    const q = query(collection(db, 'quizzes'), where('courseId', '==', courseId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Quiz));
    }
    return [];
  } catch (err) {
    return [];
  }
}

export async function getAllQuizzes(): Promise<Quiz[]> {
  try {
    const snapshot = await getDocs(collection(db, 'quizzes'));
    if (!snapshot.empty) {
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Quiz));
    }
    return [];
  } catch (err) {
    return [];
  }
}

export async function saveQuiz(quiz: Partial<Quiz> & { title: string; courseId: string; questions: any[] }): Promise<string> {
  const id = quiz.id || `quiz-${Date.now()}`;
  const path = `quizzes/${id}`;
  try {
    await setDoc(doc(db, 'quizzes', id), {
      ...quiz,
      id,
      passingScore: quiz.passingScore ?? 75,
      timeLimitMinutes: quiz.timeLimitMinutes ?? 0,
      maxAttempts: quiz.maxAttempts ?? 3,
      showAnswersAfterSubmit: quiz.showAnswersAfterSubmit ?? true,
      isPublished: quiz.isPublished ?? true,
      updatedAt: new Date().toISOString(),
      createdAt: quiz.createdAt || new Date().toISOString()
    }, { merge: true });

    // If quiz has sessionId, update that session's quizId
    if (quiz.sessionId && quiz.courseId) {
      await updateDoc(doc(db, 'courses', quiz.courseId, 'sessions', quiz.sessionId), { quizId: id }).catch(() => {});
      await updateDoc(doc(db, 'sessions', quiz.sessionId), { quizId: id }).catch(() => {});
    }

    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteQuiz(quizId: string): Promise<void> {
  const path = `quizzes/${quizId}`;
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
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
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
  folder: 'covers' | 'pdfs' | 'documents' | 'avatars' | 'blog_covers' | 'blog_images',
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
  try {
    const snapshot = await getDocs(collection(db, 'blogPosts'));
    if (!snapshot.empty) {
      const posts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BlogPost));
      posts.sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());
      if (!includeDrafts) {
        return posts.filter(p => p.status === 'published');
      }
      return posts;
    }
    // Pure Firestore source - never resurrect ghost posts if deleted
    return [];
  } catch (err) {
    console.warn('getBlogPosts read error:', err);
    return [];
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
      return { id: docSnap.id, ...docSnap.data() } as BlogPost;
    }
    return null;
  } catch (error) {
    console.warn('getBlogPostBySlug error:', error);
    return null;
  }
}

export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  try {
    const d = await getDoc(doc(db, 'blogPosts', id));
    if (d.exists()) {
      return { id: d.id, ...d.data() } as BlogPost;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `blogPosts/${id}`);
  }
}

export async function saveBlogPost(post: Partial<BlogPost> & { title: string }): Promise<string> {
  const id = post.id || `post-${Date.now()}`;
  const path = `blogPosts/${id}`;

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

  const wordCount = (post.content || '').replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
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

  const data: BlogPost = {
    id,
    title: post.title.trim(),
    titleAr: post.titleAr || '',
    slug: finalSlug,
    excerpt: post.excerpt || '',
    content: post.content || '',
    contentAr: post.contentAr || '',
    coverImageUrl: post.coverImageUrl || '',
    coverImageCaption: post.coverImageCaption || '',
    category: post.category || 'Kajian Umum',
    tags: Array.isArray(post.tags) ? post.tags : [],
    status,
    isFeatured: post.isFeatured || false,
    authorName: post.authorName || 'Osama',
    authorPhoto: post.authorPhoto || '',
    authorRole: post.authorRole || 'Pengasuh Dars with Osama',
    readingTimeMinutes,
    viewsCount: post.viewsCount || 0,
    publishedAt,
    createdAt: post.createdAt || now,
    updatedAt: now
  };

  try {
    await setDoc(doc(db, 'blogPosts', id), data, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteBlogPost(id: string): Promise<void> {
  const path = `blogPosts/${id}`;
  try {
    await deleteDoc(doc(db, 'blogPosts', id));
  } catch (error) {
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

