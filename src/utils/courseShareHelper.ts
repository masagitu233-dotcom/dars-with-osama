import type { Course } from '../types/index.ts';

export const DEFAULT_COURSE_COVER_IMAGE =
  'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=1200&q=80';

/**
 * Builds the permanent canonical share URL for a whole course.
 * Uses query parameter `/?view=course-detail&courseId={id}` which is universally supported
 * on all hosting environments, direct page reloads, and browser history transitions.
 */
export function buildCourseShareUrl(
  course: Pick<Course, 'id' | 'title'>,
  origin = 'https://darswithosama.com'
): string {
  const cleanOrigin = (origin || 'https://darswithosama.com').replace(/\/+$/, '');
  return `${cleanOrigin}/?view=course-detail&courseId=${encodeURIComponent(course.id)}`;
}

/**
 * Builds the path-based slug/id URL for a course.
 */
export function buildCoursePathUrl(
  course: Pick<Course, 'id' | 'title'>,
  origin = 'https://darswithosama.com'
): string {
  const cleanOrigin = (origin || 'https://darswithosama.com').replace(/\/+$/, '');
  return `${cleanOrigin}/course/${encodeURIComponent(course.id)}`;
}

export interface CourseShareData {
  url: string;
  pathUrl: string;
  title: string;
  ogTitle: string;
  description: string;
  thumbnailUrl: string;
  instructor: string;
  shareMessage: string;
}

/**
 * Prepares all social share text, URLs, and OpenGraph metadata for sharing a whole course.
 */
export function buildCourseShareData(
  course: Course,
  origin = 'https://darswithosama.com'
): CourseShareData {
  const url = buildCourseShareUrl(course, origin);
  const pathUrl = buildCoursePathUrl(course, origin);
  const instructor = course.instructor || 'Osama Nur Samsil, S.H.';
  const title = course.title || 'Pembelajaran Dars with Osama';
  const ogTitle = `${title} - Bersama ${instructor} | Dars with Osama`;
  const description =
    course.description ||
    `Pelajari kurikulum resmi "${title}" bersama ${instructor} di platform Dars with Osama.`;
  const thumbnailUrl = course.coverImageUrl || DEFAULT_COURSE_COVER_IMAGE;

  const shareMessage = `Yuk, pelajari kurikulum *${title}* bersama *${instructor}* di platform *Dars with Osama*.\n\nSimak rekaman video syarah lengkap, naskah materi, dan kurikulum pembelajarannya di sini:\n${url}`;

  return {
    url,
    pathUrl,
    title,
    ogTitle,
    description,
    thumbnailUrl,
    instructor,
    shareMessage
  };
}

/**
 * Helper to copy text to clipboard across legacy and modern browser environments.
 */
export async function copyCourseUrlToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
    return false;
  } catch (err) {
    console.error('Failed to copy course URL:', err);
    return false;
  }
}
