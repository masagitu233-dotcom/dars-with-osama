import { InstructorProfile, InstructorProfileSection, InstructorProfileImage } from '../types';
import { sanitizeRichTextHtml, isValidSafeImageSrc } from './richTextHelper';

export const DEFAULT_INSTRUCTOR_PROFILE_ID = 'main';

/**
 * Returns the truthful baseline profile for Osama Nur Samsil, S.H.
 * Strictly avoids fabricating any unverified biography, educational background, experience, or achievements.
 */
export function getDefaultInstructorProfile(): InstructorProfile {
  return {
    id: DEFAULT_INSTRUCTOR_PROFILE_ID,
    name: 'Osama Nur Samsil, S.H.',
    role: 'Pembuat & Pengajar Dars with Osama',
    title: 'Profil Pengajar Dars with Osama',
    biography:
      '<p style="text-align: justify;"><strong>Osama Nur Samsil, S.H.</strong> adalah pembuat dan pengajar pada ruang belajar daring <strong>Dars with Osama</strong> yang menyelenggarakan kajian terstruktur kitab turats, bahasa Arab, dan ilmu syar\'i.</p>',
    mainContent:
      '<p style="text-align: justify;">Melalui <strong>Dars with Osama</strong>, beliau menyusun dan menyampaikan materi pembelajaran ilmu syar\'i dan kaidah bahasa Arab secara bertahap agar dapat dipelajari dengan tertib oleh para penuntut ilmu.</p>',
    photoUrl: '',
    photoCaption: 'Osama Nur Samsil, S.H. — Pembuat & Pengajar Dars with Osama',
    supportingImages: [],
    sections: [],
    updatedAt: new Date(0).toISOString()
  };
}

/**
 * Normalizes and sorts profile sections by `order` ascending, sanitizing HTML content.
 */
export function normalizeProfileSections(sections?: InstructorProfileSection[] | null): InstructorProfileSection[] {
  if (!Array.isArray(sections)) return [];
  return sections
    .filter(s => s && typeof s === 'object' && (s.title?.trim() || s.content?.trim() || s.imageUrl?.trim()))
    .map((s, idx) => ({
      id: s.id && String(s.id).trim() ? String(s.id).trim() : `sec-${idx + 1}`,
      title: String(s.title || '').trim(),
      content: sanitizeRichTextHtml(String(s.content || '')),
      imageUrl: s.imageUrl && isValidSafeImageSrc(s.imageUrl) ? s.imageUrl.trim() : '',
      imageCaption: String(s.imageCaption || '').trim(),
      order: typeof s.order === 'number' && !Number.isNaN(s.order) ? s.order : idx + 1
    }))
    .sort((a, b) => a.order - b.order)
    .map((s, idx) => ({ ...s, order: idx + 1 }));
}

/**
 * Normalizes and sorts supporting images by `order` ascending.
 */
export function normalizeSupportingImages(images?: InstructorProfileImage[] | null): InstructorProfileImage[] {
  if (!Array.isArray(images)) return [];
  return images
    .filter(img => img && typeof img === 'object' && img.url && isValidSafeImageSrc(img.url))
    .map((img, idx) => ({
      id: img.id && String(img.id).trim() ? String(img.id).trim() : `img-${idx + 1}`,
      url: img.url.trim(),
      caption: String(img.caption || '').trim(),
      order: typeof img.order === 'number' && !Number.isNaN(img.order) ? img.order : idx + 1
    }))
    .sort((a, b) => a.order - b.order)
    .map((img, idx) => ({ ...img, order: idx + 1 }));
}

/**
 * Reorders a section up or down and re-indexes `order` from 1..N.
 */
export function moveProfileSection(
  sections: InstructorProfileSection[],
  sectionId: string,
  direction: 'up' | 'down'
): InstructorProfileSection[] {
  const ordered = [...sections].sort((a, b) => a.order - b.order);
  const index = ordered.findIndex(s => s.id === sectionId);
  if (index === -1) return ordered.map((s, idx) => ({ ...s, order: idx + 1 }));

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= ordered.length) {
    return ordered.map((s, idx) => ({ ...s, order: idx + 1 }));
  }

  const swapped = [...ordered];
  const temp = swapped[index];
  swapped[index] = swapped[targetIndex];
  swapped[targetIndex] = temp;

  return swapped.map((s, idx) => ({
    ...s,
    order: idx + 1
  }));
}

/**
 * Validates and sanitizes an InstructorProfile payload before saving to Firestore.
 */
export function sanitizeInstructorProfilePayload(
  input: Partial<InstructorProfile>,
  updatedBy?: string
): InstructorProfile {
  const defaults = getDefaultInstructorProfile();
  const cleanName = (input.name ?? defaults.name).trim();
  const cleanRole = (input.role ?? defaults.role).trim();
  const cleanTitle = (input.title ?? defaults.title).trim();

  if (!cleanName) {
    throw new Error('Nama pengajar tidak boleh kosong.');
  }
  if (!cleanRole) {
    throw new Error('Peran pengajar tidak boleh kosong.');
  }
  if (!cleanTitle) {
    throw new Error('Judul halaman profil tidak boleh kosong.');
  }

  const rawPhoto = (input.photoUrl ?? '').trim();
  const safePhotoUrl = rawPhoto && isValidSafeImageSrc(rawPhoto) ? rawPhoto : '';

  return {
    id: DEFAULT_INSTRUCTOR_PROFILE_ID,
    name: cleanName,
    role: cleanRole,
    title: cleanTitle,
    biography: sanitizeRichTextHtml(input.biography ?? defaults.biography),
    mainContent: sanitizeRichTextHtml(input.mainContent ?? defaults.mainContent),
    photoUrl: safePhotoUrl,
    photoCaption: (input.photoCaption ?? '').trim(),
    supportingImages: normalizeSupportingImages(input.supportingImages),
    sections: normalizeProfileSections(input.sections),
    updatedAt: new Date().toISOString(),
    ...(updatedBy ? { updatedBy } : {})
  };
}
