import { BlogPost, LibraryBook, LibraryBookVolume } from '../types';

/**
 * Menghitung jumlah kata bersih dari konten HTML editor (termasuk teks Arab/Latin).
 */
export function countDocumentWords(html?: string | null): number {
  if (!html) return 0;
  const plainText = html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .trim();

  if (!plainText) return 0;
  return plainText.split(/\s+/).filter(Boolean).length;
}

/**
 * Membangun snapshot deterministik state formulir Artikel untuk mendeteksi
 * perubahan yang belum disimpan secara akurat saat berpindah antarhalaman tab.
 */
export function buildArticleDirtySnapshot(
  formData: Partial<BlogPost>,
  tagInput: string
): string {
  return JSON.stringify({
    title: formData.title || '',
    titleAr: formData.titleAr || '',
    category: formData.category || '',
    excerpt: formData.excerpt || '',
    content: formData.content || '',
    coverImageUrl: formData.coverImageUrl || '',
    isFeatured: Boolean(formData.isFeatured),
    tagInput: tagInput || '',
    audioConfig: {
      enabled: Boolean(formData.audioConfig?.enabled),
      mode: formData.audioConfig?.mode || 'speech',
      speechRate: formData.audioConfig?.speechRate ?? 1.0,
      speechVoiceName: formData.audioConfig?.speechVoiceName || '',
      customAudioUrl: formData.audioConfig?.customAudioUrl || ''
    }
  });
}

/**
 * Membangun snapshot deterministik state formulir Library Digital untuk mendeteksi
 * perubahan yang belum disimpan secara akurat saat berpindah antarhalaman tab.
 */
export function buildLibraryBookDirtySnapshot(
  formData: Partial<LibraryBook>
): string {
  return JSON.stringify({
    title: formData.title || '',
    titleAr: formData.titleAr || '',
    category: formData.category || '',
    author: formData.author || '',
    description: formData.description || '',
    coverImageUrl: formData.coverImageUrl || '',
    coverAspectRatio: formData.coverAspectRatio || '3:4',
    collectionType: formData.collectionType === 'multi_volume' ? 'multi_volume' : 'single',
    sourceType: formData.sourceType || 'internal',
    googleDriveUrl: formData.googleDriveUrl || '',
    pdfDriveUrl: formData.pdfDriveUrl || '',
    content: formData.content || ''
  });
}

/**
 * Membangun snapshot deterministik state formulir Jilid Buku Berjilid untuk mendeteksi
 * perubahan yang belum disimpan secara independen per jilid.
 */
export function buildLibraryVolumeDirtySnapshot(
  formData: Partial<LibraryBookVolume>
): string {
  return JSON.stringify({
    volumeNumber: Number(formData.volumeNumber) || 1,
    title: formData.title || '',
    titleAr: formData.titleAr || '',
    sourceType: formData.sourceType || 'internal',
    googleDriveUrl: formData.googleDriveUrl || '',
    pdfDriveUrl: formData.pdfDriveUrl || '',
    content: formData.content || '',
    status: formData.status || 'published'
  });
}

/**
 * Mengembalikan true apabila snapshot saat ini berbeda dari snapshot awal.
 */
export function hasEditorUnsavedChanges(
  currentSnapshot: string,
  initialSnapshot: string
): boolean {
  if (!initialSnapshot) return false;
  return currentSnapshot !== initialSnapshot;
}

