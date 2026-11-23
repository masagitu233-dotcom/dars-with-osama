import React, { useState, useRef, useMemo } from 'react';
import {
  Library,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  CheckCircle,
  AlertCircle,
  X,
  Upload,
  Link as LinkIcon,
  ExternalLink,
  BookOpen,
  BarChart2,
  RefreshCw,
  ListOrdered,
  Image as ImageIcon,
  PenLine,
  SlidersHorizontal,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  LibraryBook,
  LibraryBookCollectionType,
  LibraryCoverAspectRatio,
  LibraryBookSourceType,
  LibraryVisitStats
} from '../../types';
import { RichTextEditor } from './RichTextEditor';
import { AdminEditorModalShell, AdminEditorTab } from './AdminEditorModalShell';
import { AdminLibraryVolumesManager } from './AdminLibraryVolumesManager';
import {
  countDocumentWords,
  buildLibraryBookDirtySnapshot,
  hasEditorUnsavedChanges
} from '../../utils/editorWorkspaceHelper';
import { ConfirmModal } from '../common/ConfirmModal';
import { ResilientGoogleDriveImage } from '../common/ResilientGoogleDriveImage';
import {
  saveLibraryBook,
  deleteLibraryBook,
  uploadFileToStorage
} from '../../firebase/services';
import {
  getLibraryCoverAspectClass,
  validateLibraryCoverFile,
  validateLibraryCoverUrl,
  validateLibraryExternalDriveUrl,
  parseLibraryBookContent,
  isMultiVolumeLibraryBook,
  normalizeLibraryCollectionType
} from '../../utils/libraryHelper';
import { extractGoogleDriveFileId, getGoogleDriveViewerUrl, isGoogleDriveUrl } from '../../utils/googleDriveHelper';

interface AdminLibraryManagerProps {
  books: LibraryBook[];
  visitStats: LibraryVisitStats;
  onRefreshBooks: () => void | Promise<void>;
  onRefreshStats: () => void | Promise<void>;
  onPreviewBook: (book: LibraryBook) => void;
}

type CoverInputMethod = 'upload' | 'google_drive';

export const AdminLibraryManager: React.FC<AdminLibraryManagerProps> = ({
  books,
  visitStats,
  onRefreshBooks,
  onRefreshStats,
  onPreviewBook
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | LibraryBookSourceType | 'multi_volume'>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [refreshingStats, setRefreshingStats] = useState(false);

  // Dedicated volume manager view for multi-volume books
  const [managedMultiVolumeBookId, setManagedMultiVolumeBookId] = useState<string | null>(null);
  const managedMultiVolumeBook = useMemo(
    () => (managedMultiVolumeBookId ? books.find(b => b.id === managedMultiVolumeBookId) || null : null),
    [books, managedMultiVolumeBookId]
  );

  // Delete modal
  const [bookToDelete, setBookToDelete] = useState<LibraryBook | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add / Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState<'naskah' | 'metadata' | 'daftar_isi'>('naskah');
  const [initialFormSnapshot, setInitialFormSnapshot] = useState('');
  const [saving, setSaving] = useState(false);
  const [coverMethod, setCoverMethod] = useState<CoverInputMethod>('upload');
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverLoadFailed, setCoverLoadFailed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const modalBodyRef = useRef<HTMLDivElement | null>(null);

  const [formData, setFormData] = useState<Partial<LibraryBook>>({
    title: '',
    titleAr: '',
    category: '',
    author: 'Osama',
    description: '',
    coverImageUrl: '',
    coverAspectRatio: '3:4',
    collectionType: 'single',
    sourceType: 'internal',
    googleDriveUrl: '',
    content: '',
    status: 'published'
  });

  const isFormMultiVolume = formData.collectionType === 'multi_volume';

  const publishedCount = useMemo(() => books.filter(b => b.status === 'published').length, [books]);
  const draftCount = useMemo(() => books.filter(b => b.status === 'draft').length, [books]);

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return books.filter(book => {
      const matchesSearch =
        !q ||
        book.title.toLowerCase().includes(q) ||
        (book.category && book.category.toLowerCase().includes(q)) ||
        (book.author && book.author.toLowerCase().includes(q)) ||
        (book.slug && book.slug.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'all' || book.status === statusFilter;
      const isMulti = isMultiVolumeLibraryBook(book);
      const matchesSource =
        sourceFilter === 'all' ||
        (sourceFilter === 'multi_volume' ? isMulti : !isMulti && book.sourceType === sourceFilter);
      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [books, searchQuery, statusFilter, sourceFilter]);

  // Live TOC preview for single internal books inside editor modal
  const liveTocPreview = useMemo(() => {
    if (isFormMultiVolume || formData.sourceType !== 'internal') return null;
    return parseLibraryBookContent(formData.content || '');
  }, [isFormMultiVolume, formData.sourceType, formData.content]);

  const currentFormSnapshot = useMemo(
    () => buildLibraryBookDirtySnapshot(formData),
    [formData]
  );

  const hasUnsavedChanges = useMemo(
    () => isModalOpen && hasEditorUnsavedChanges(currentFormSnapshot, initialFormSnapshot),
    [isModalOpen, currentFormSnapshot, initialFormSnapshot]
  );

  const bookWordCount = useMemo(
    () => (!isFormMultiVolume && formData.sourceType === 'internal' ? countDocumentWords(formData.content) : null),
    [isFormMultiVolume, formData.sourceType, formData.content]
  );

  const handleSwitchCollectionType = (nextType: LibraryBookCollectionType) => {
    setFormData(prev => ({ ...prev, collectionType: nextType }));
    if (nextType === 'multi_volume') {
      setActiveEditorTab('metadata');
    } else if (activeEditorTab === 'daftar_isi' && formData.sourceType === 'google_drive') {
      setActiveEditorTab('naskah');
    }
  };

  const handleOpenAddModal = () => {
    setFeedback(null);
    setCoverError(null);
    setCoverLoadFailed(false);
    setCoverMethod('upload');
    const nextFormData: Partial<LibraryBook> = {
      id: undefined,
      title: '',
      titleAr: '',
      category: '',
      author: 'Osama',
      description: '',
      coverImageUrl: '',
      coverAspectRatio: '3:4',
      collectionType: 'single',
      sourceType: 'internal',
      googleDriveUrl: '',
      content: '',
      status: 'published'
    };
    setFormData(nextFormData);
    setInitialFormSnapshot(buildLibraryBookDirtySnapshot(nextFormData));
    setActiveEditorTab('naskah');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (book: LibraryBook) => {
    setFeedback(null);
    setCoverError(null);
    setCoverLoadFailed(false);
    setCoverMethod(isGoogleDriveUrl(book.coverImageUrl) ? 'google_drive' : 'upload');
    const collectionType = normalizeLibraryCollectionType(book.collectionType);
    const nextFormData: Partial<LibraryBook> = { ...book, collectionType };
    setFormData(nextFormData);
    setInitialFormSnapshot(buildLibraryBookDirtySnapshot(nextFormData));
    setActiveEditorTab(collectionType === 'multi_volume' ? 'metadata' : 'naskah');
    setIsModalOpen(true);
  };

  const processCoverUploadFile = async (file: File) => {
    setCoverError(null);
    setCoverLoadFailed(false);

    const validation = validateLibraryCoverFile(file);
    if (!validation.isValid) {
      setCoverError(validation.error || 'Berkas cover tidak valid.');
      return;
    }

    setUploadingCover(true);
    setCoverProgress(10);
    try {
      const downloadUrl = await uploadFileToStorage(file, 'library_covers', (pct) => {
        setCoverProgress(pct);
      });
      setFormData(prev => ({ ...prev, coverImageUrl: downloadUrl }));
      setCoverLoadFailed(false);
    } catch (err: any) {
      setCoverError('Gagal mengunggah gambar cover: ' + (err?.message || String(err)));
    } finally {
      setUploadingCover(false);
    }
  };

  const handleCoverFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processCoverUploadFile(file);
    }
    e.target.value = '';
  };

  const handleCoverDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCover(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processCoverUploadFile(file);
    }
  };

  const handleRemoveCover = () => {
    setFormData(prev => ({ ...prev, coverImageUrl: '' }));
    setCoverError(null);
    setCoverLoadFailed(false);
  };

  const handleCoverUrlChange = (url: string) => {
    setFormData(prev => ({ ...prev, coverImageUrl: url }));
    setCoverLoadFailed(false);
    if (!url.trim()) {
      setCoverError(null);
      return;
    }
    const validation = validateLibraryCoverUrl(url);
    if (!validation.isValid) {
      setCoverError(validation.error || 'Format tautan gambar tidak valid.');
    } else {
      setCoverError(null);
    }
  };

  const handleSave = async (targetStatus: 'published' | 'draft') => {
    if (saving) return;
    setFeedback(null);

    const collectionType: LibraryBookCollectionType = normalizeLibraryCollectionType(formData.collectionType);
    const titleText = (formData.title || '').trim();
    if (!titleText) {
      setActiveEditorTab(collectionType === 'multi_volume' ? 'metadata' : 'naskah');
      setFeedback({ type: 'error', text: 'Judul buku wajib diisi terlebih dahulu.' });
      modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const coverUrl = (formData.coverImageUrl || '').trim();
    if (coverUrl) {
      const coverValidation = validateLibraryCoverUrl(coverUrl);
      if (!coverValidation.isValid) {
        setActiveEditorTab('metadata');
        setFeedback({
          type: 'error',
          text: `Gambar cover tidak valid: ${coverValidation.error || 'Periksa kembali tautan gambar.'}`
        });
        modalBodyRef.current?.scrollTo({ top: 150, behavior: 'smooth' });
        return;
      }
      if (coverLoadFailed) {
        setActiveEditorTab('metadata');
        setFeedback({
          type: 'error',
          text: 'Gambar cover gagal dimuat. Pastikan file Google Drive telah diatur ke "Siapa saja yang memiliki link" atau gunakan metode upload langsung.'
        });
        modalBodyRef.current?.scrollTo({ top: 150, behavior: 'smooth' });
        return;
      }
    }

    const sourceType: LibraryBookSourceType =
      formData.sourceType === 'google_drive' ? 'google_drive' : 'internal';

    if (collectionType === 'single') {
      if (sourceType === 'google_drive') {
        const driveValidation = validateLibraryExternalDriveUrl(formData.googleDriveUrl);
        if (!driveValidation.isValid) {
          setActiveEditorTab('naskah');
          setFeedback({
            type: 'error',
            text: driveValidation.error || 'Tautan Google Drive tidak valid.'
          });
          modalBodyRef.current?.scrollTo({ top: 300, behavior: 'smooth' });
          return;
        }
      } else {
        const rawContent = formData.content || '';
        const plainText = rawContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
        if (!plainText && !rawContent.includes('<img')) {
          setActiveEditorTab('naskah');
          setFeedback({
            type: 'error',
            text: 'Isi naskah buku internal wajib diisi terlebih dahulu.'
          });
          return;
        }
      }
    }

    setSaving(true);
    try {
      const isNewBook = !formData.id;
      const savedId = await saveLibraryBook({
        ...formData,
        title: titleText,
        category: (formData.category || '').trim(),
        coverImageUrl: coverUrl,
        coverAspectRatio: (formData.coverAspectRatio === '9:16' ? '9:16' : '3:4') as LibraryCoverAspectRatio,
        collectionType,
        sourceType: collectionType === 'multi_volume' ? 'internal' : sourceType,
        googleDriveUrl: collectionType === 'single' && sourceType === 'google_drive' ? (formData.googleDriveUrl || '').trim() : '',
        content: collectionType === 'single' && sourceType === 'internal' ? (formData.content || '') : '',
        status: targetStatus
      });

      setIsModalOpen(false);
      await onRefreshBooks();

      if (collectionType === 'multi_volume') {
        setManagedMultiVolumeBookId(savedId);
        setFeedback({
          type: 'success',
          text: isNewBook
            ? `Buku berjilid "${titleText}" berhasil dibuat. Silakan tambahkan jilid pada halaman pengelolaan jilid.`
            : `Informasi utama buku berjilid "${titleText}" berhasil diperbarui.`
        });
      } else {
        setFeedback({
          type: 'success',
          text: `Buku "${titleText}" berhasil disimpan sebagai ${targetStatus === 'published' ? 'Terbit (Published)' : 'Draf (Draft)'}.`
        });
      }
    } catch (err: any) {
      let msg = err?.message || String(err);
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error) msg = parsed.error;
      } catch {}
      setFeedback({ type: 'error', text: 'Gagal menyimpan buku: ' + msg });
      modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (book: LibraryBook) => {
    const nextStatus = book.status === 'published' ? 'draft' : 'published';
    setFeedback(null);
    try {
      await saveLibraryBook({
        ...book,
        status: nextStatus
      });
      await onRefreshBooks();
      setFeedback({
        type: 'success',
        text: `Status buku "${book.title}" diubah menjadi ${nextStatus === 'published' ? 'Terbit (Published)' : 'Draf (Draft)'}.`
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: 'Gagal mengubah status buku: ' + (err?.message || String(err)) });
    }
  };

  const handleConfirmDelete = async () => {
    if (!bookToDelete) return;
    setIsDeleting(true);
    setFeedback(null);
    const title = bookToDelete.title;
    const deletedId = bookToDelete.id;
    try {
      await deleteLibraryBook(deletedId);
      if (managedMultiVolumeBookId === deletedId) {
        setManagedMultiVolumeBookId(null);
      }
      await onRefreshBooks();
      setBookToDelete(null);
      setFeedback({
        type: 'success',
        text: `Buku "${title}" berhasil dihapus secara permanen dari Library Digital.`
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: 'Gagal menghapus buku: ' + (err?.message || String(err)) });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRefreshStatsClick = async () => {
    setRefreshingStats(true);
    try {
      await onRefreshStats();
    } finally {
      setRefreshingStats(false);
    }
  };

  const previewAspectClass = getLibraryCoverAspectClass(
    formData.coverAspectRatio === '9:16' ? '9:16' : '3:4'
  );

  const isCollectionTypeLocked = Boolean(
    formData.id &&
      normalizeLibraryCollectionType(formData.collectionType) === 'multi_volume' &&
      (formData.volumesCount || 0) > 0
  );

  const renderCollectionTypeSelector = (compact = false) => (
    <div
      data-testid="admin-library-collection-type-selector"
      className={
        compact
          ? 'flex flex-wrap items-center justify-between gap-2 pb-3 mb-2 border-b border-[#171717]/10 dark:border-white/10'
          : 'p-5 sm:p-6 bg-white dark:bg-[#0E2B24] rounded-lg border-2 border-[#171717] dark:border-[#D9AC45]/45 space-y-3'
      }
    >
      {compact ? (
        <>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#525855] dark:text-[#A6D6C9]">
            Jenis Koleksi:
          </span>
          <div className="inline-flex p-0.5 bg-[#FAF7F0] dark:bg-[#09211B] border-2 border-[#171717] dark:border-[#D9AC45]/50 rounded-md gap-1">
            <button
              type="button"
              data-testid="admin-library-type-single-quick"
              disabled={isCollectionTypeLocked}
              onClick={() => handleSwitchCollectionType('single')}
              className={`px-2.5 py-1 rounded text-[11px] font-extrabold inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 ${
                !isFormMultiVolume
                  ? 'bg-[#123D32] text-[#FAF7F0] dark:bg-[#D9AC45] dark:text-[#171717]'
                  : 'text-[#525855] dark:text-[#A6D6C9] hover:text-[#171717]'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>Buku Biasa</span>
            </button>
            <button
              type="button"
              data-testid="admin-library-type-multivolume-quick"
              disabled={isCollectionTypeLocked}
              onClick={() => handleSwitchCollectionType('multi_volume')}
              className={`px-2.5 py-1 rounded text-[11px] font-extrabold inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 ${
                isFormMultiVolume
                  ? 'bg-[#123D32] text-[#FAF7F0] dark:bg-[#D9AC45] dark:text-[#171717]'
                  : 'text-[#525855] dark:text-[#A6D6C9] hover:text-[#171717]'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Buku Berjilid</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-sm font-extrabold text-[#171717] dark:text-[#F8F3E8] block">
              Jenis Koleksi Buku *
            </label>
            {isCollectionTypeLocked && (
              <span className="text-[11px] font-bold text-[#9A3412] dark:text-[#FCD34D]">
                Terkunci karena buku ini sudah memiliki jilid.
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              data-testid="admin-library-type-single"
              disabled={isCollectionTypeLocked}
              onClick={() => handleSwitchCollectionType('single')}
              className={`p-3.5 rounded-lg border-2 text-left transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                !isFormMultiVolume
                  ? 'bg-[#123D32] text-[#FAF7F0] border-[#171717] shadow-[3px_3px_0px_#171717]'
                  : 'bg-[#FAF7F0] dark:bg-[#0D2B36] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/40 dark:border-[#4CA7A1]/50'
              }`}
            >
              <div className="flex items-center gap-2 font-extrabold text-xs">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Buku Biasa (Tunggal / Tidak Berjilid)</span>
              </div>
              <p
                className={`text-[11px] mt-1 leading-snug ${
                  !isFormMultiVolume ? 'text-[#FAF7F0]/85' : 'text-[#525855] dark:text-[#A6D6C9]'
                }`}
              >
                Satu kitab utuh dengan naskah editor internal atau satu tautan Google Drive.
              </p>
            </button>

            <button
              type="button"
              data-testid="admin-library-type-multivolume"
              disabled={isCollectionTypeLocked}
              onClick={() => handleSwitchCollectionType('multi_volume')}
              className={`p-3.5 rounded-lg border-2 text-left transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                isFormMultiVolume
                  ? 'bg-[#123D32] text-[#FAF7F0] border-[#171717] shadow-[3px_3px_0px_#171717]'
                  : 'bg-[#FAF7F0] dark:bg-[#0D2B36] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/40 dark:border-[#4CA7A1]/50'
              }`}
            >
              <div className="flex items-center gap-2 font-extrabold text-xs">
                <Layers className="w-4 h-4 shrink-0" />
                <span>Buku Berjilid (Multi-Jilid)</span>
              </div>
              <p
                className={`text-[11px] mt-1 leading-snug ${
                  isFormMultiVolume ? 'text-[#FAF7F0]/85' : 'text-[#525855] dark:text-[#A6D6C9]'
                }`}
              >
                Satu sampul utama bersama untuk banyak jilid. Tiap jilid punya judul &amp; sumber sendiri (Internal atau Google Drive).
              </p>
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {managedMultiVolumeBook ? (
        <AdminLibraryVolumesManager
          book={managedMultiVolumeBook}
          onBack={() => setManagedMultiVolumeBookId(null)}
          onEditMainBook={(b) => handleOpenEditModal(b)}
          onPreviewBook={onPreviewBook}
          onVolumesChanged={onRefreshBooks}
        />
      ) : (
        <>
      {/* FEEDBACK BANNER */}
      {feedback && (
        <div
          className={`p-4 rounded-md border-2 border-[#171717] shadow-[4px_4px_0px_#171717] text-xs sm:text-sm font-bold flex items-center justify-between gap-3 animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-[#D9AC45] text-[#171717]'
              : 'bg-[#F04438] text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-black/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ADMIN-ONLY STATISTICS & SUMMARY ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Kunjungan Library (Admin Only) */}
        <div
          data-testid="admin-library-visit-stats"
          className="nb-card bg-white dark:bg-[#0D2B36] p-5 flex items-center justify-between gap-3"
        >
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#171717] dark:text-[#CEFEF1] flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-[#123D32] dark:text-[#4CA7A1]" />
              <span>Total Kunjungan Library</span>
            </p>
            <p className="text-3xl font-extrabold font-serif-brand mt-1.5 tabular-nums text-[#171717] dark:text-[#FFFFFF]">
              {(visitStats?.totalVisits || 0).toLocaleString('id-ID')}
            </p>
            <p className="text-[10px] font-semibold text-[#374151] dark:text-[#A6D6C9] mt-1">
              Statistik pengunjung publik (khusus admin)
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefreshStatsClick}
            disabled={refreshingStats}
            title="Segarkan statistik kunjungan Library"
            className="p-2 rounded-md bg-[#FAF7F0] hover:bg-[#EFE5D2] dark:bg-[#1F5F63] dark:hover:bg-[#287A7F] border-2 border-[#171717] dark:border-[#4CA7A1] text-[#171717] dark:text-[#CEFEF1] cursor-pointer transition shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${refreshingStats ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Koleksi Terbit */}
        <div className="nb-card bg-white dark:bg-[#0D2B36] p-5">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#525855] dark:text-[#A6D6C9]">
            Buku Terbit (Publik)
          </p>
          <p className="text-3xl font-extrabold font-serif-brand mt-1.5 tabular-nums text-[#171717] dark:text-[#CEFEF1]">
            {publishedCount}
          </p>
          <p className="text-[10px] text-[#525855] dark:text-[#A6D6C9] mt-1 font-semibold">
            Tampil pada halaman Library Digital
          </p>
        </div>

        {/* Draf */}
        <div className="nb-card bg-white dark:bg-[#0D2B36] p-5">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#525855] dark:text-[#A6D6C9]">
            Buku Draf (Privat Admin)
          </p>
          <p className="text-3xl font-extrabold font-serif-brand mt-1.5 tabular-nums text-[#171717] dark:text-[#CEFEF1]">
            {draftCount}
          </p>
          <p className="text-[10px] text-[#525855] dark:text-[#A6D6C9] mt-1 font-semibold">
            Tersembunyi dari pengunjung publik
          </p>
        </div>
      </div>

      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 nb-card bg-white dark:bg-[#1F5F63] p-6">
        <div>
          <h2 className="text-lg font-extrabold font-serif-brand text-charcoal dark:text-[#FFFFFF] flex items-center gap-2">
            <Library className="w-5 h-5 text-[#123D32] dark:text-[#4CA7A1]" />
            <span>Manajemen Library Digital ({books.length})</span>
          </h2>
          <p className="text-xs text-slate-gray dark:text-[#A6D6C9] mt-1">
            Kelola koleksi buku Google Drive maupun buku internal berbab dengan daftar isi otomatis.
          </p>
        </div>

        <button
          type="button"
          data-testid="admin-add-library-book-btn"
          onClick={handleOpenAddModal}
          className="nb-btn nb-btn-primary px-4 py-2.5 text-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#001722]" />
          <span>Tambah Buku Baru</span>
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 nb-card bg-white dark:bg-[#1F5F63] p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray dark:text-[#A6D6C9]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul buku, penulis, atau slug..."
            className="nb-input w-full pl-10 pr-4 py-2 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="nb-input px-3 py-2 text-xs font-bold"
          >
            <option value="all">Semua Status</option>
            <option value="published">Terbit (Published)</option>
            <option value="draft">Draf (Draft)</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="nb-input px-3 py-2 text-xs font-bold"
          >
            <option value="all">Semua Sumber / Jenis</option>
            <option value="internal">Buku Biasa — Internal</option>
            <option value="google_drive">Buku Biasa — Google Drive</option>
            <option value="multi_volume">Buku Berjilid (Multi-Jilid)</option>
          </select>
        </div>
      </div>

      {/* BOOKS TABLE */}
      <div className="nb-card bg-white dark:bg-[#1F5F63] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#123D32] dark:bg-[#001722] text-[#FAF7F0] dark:text-[#CEFEF1] border-b-2 border-[#171717] dark:border-[#4CA7A1] font-extrabold uppercase text-[11px]">
                <th className="p-4">Cover &amp; Judul Buku</th>
                <th className="p-4">Sumber Buku</th>
                <th className="p-4">Rasio Cover</th>
                <th className="p-4">Status</th>
                <th className="p-4">Diperbarui</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-200 dark:divide-[#4CA7A1]/50 text-charcoal dark:text-[#CEFEF1]">
              {filteredBooks.length === 0 ? (
                <tr className="bg-white dark:bg-[#0D2B36]">
                  <td colSpan={6} className="p-8 text-center text-slate-gray dark:text-[#A6D6C9] font-semibold">
                    Belum ada buku di Library Digital. Klik &ldquo;Tambah Buku Baru&rdquo; untuk memulai.
                  </td>
                </tr>
              ) : (
                filteredBooks.map(book => {
                  const thumbAspect = getLibraryCoverAspectClass(book.coverAspectRatio);
                  const isMultiVolume = isMultiVolumeLibraryBook(book);
                  const totalVols = typeof book.volumesCount === 'number' ? book.volumesCount : 0;
                  const publishedVols = typeof book.publishedVolumesCount === 'number' ? book.publishedVolumesCount : 0;
                  return (
                    <tr
                      key={book.id}
                      className="bg-white dark:bg-[#0D2B36] even:dark:bg-[#1F5F63]/70 hover:bg-[#FAF7F0] dark:hover:bg-[#1F5F63] transition"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 shrink-0 ${thumbAspect} rounded-sm bg-[#FAF7F0] dark:bg-[#001722] overflow-hidden border-2 border-[#171717] dark:border-[#4CA7A1] flex items-center justify-center`}>
                            {book.coverImageUrl ? (
                              <ResilientGoogleDriveImage
                                src={book.coverImageUrl}
                                alt={book.title}
                                aspectRatioClass={thumbAspect}
                                objectFit="contain"
                                className="w-full h-full"
                                imageClassName="w-full h-full object-contain"
                              />
                            ) : (
                              <BookOpen className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1]" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs sm:max-w-sm">
                            <p className="font-extrabold text-charcoal dark:text-[#CEFEF1] truncate text-xs sm:text-sm">
                              {book.title}
                            </p>
                            {book.category && book.category.trim() && (
                              <span className="inline-block mt-0.5 mb-0.5 px-1.5 py-0.5 rounded bg-[#F0BE49] text-[#0F3D3A] border border-[#171717] text-[10px] font-extrabold uppercase tracking-wider">
                                {book.category}
                              </span>
                            )}
                            {book.author && (
                              <p className="text-[11px] text-slate-gray dark:text-[#A6D6C9] truncate">
                                {book.author}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-gray dark:text-[#A6D6C9] font-mono truncate">
                              /library/{book.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        {isMultiVolume ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="nb-badge bg-[#123D32] dark:bg-[#D9AC45] text-[#FAF7F0] dark:text-[#171717] border-[#171717] inline-flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              <span>Berjilid ({totalVols} Jilid)</span>
                            </span>
                            <span className="text-[10px] font-semibold text-slate-gray dark:text-[#A6D6C9]">
                              {publishedVols} terbit • {Math.max(0, totalVols - publishedVols)} draf
                            </span>
                          </div>
                        ) : book.sourceType === 'google_drive' ? (
                          <span className="nb-badge bg-[#EFE5D2] dark:bg-[#001722] text-[#171717] dark:text-[#CEFEF1] border-[#171717] dark:border-[#4CA7A1] inline-flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            <span>Google Drive</span>
                          </span>
                        ) : (
                          <span className="nb-badge bg-[#FAF7F0] dark:bg-[#001722] text-[#123D32] dark:text-[#4CA7A1] border-[#171717] dark:border-[#4CA7A1] inline-flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            <span>Editor Internal</span>
                          </span>
                        )}
                      </td>

                      <td className="p-4 font-mono font-bold text-xs">
                        {book.coverAspectRatio || '3:4'}
                      </td>

                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(book)}
                          className={`nb-badge cursor-pointer ${
                            book.status === 'published'
                              ? 'bg-[#123D32] dark:bg-[#4CA7A1] text-[#FAF7F0] dark:text-[#001722] border-[#171717] dark:border-[#001722]'
                              : 'bg-[#FAF7F0] dark:bg-[#001722] text-charcoal dark:text-[#A6D6C9] border-[#171717] dark:border-[#4CA7A1]'
                          }`}
                        >
                          {book.status === 'published' ? 'Terbit (Published)' : 'Draf (Draft)'}
                        </button>
                      </td>

                      <td className="p-4 text-[11px] font-medium text-charcoal dark:text-[#A6D6C9]">
                        {new Date(book.updatedAt || book.createdAt).toLocaleString('id-ID')}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onPreviewBook(book)}
                            className="nb-btn nb-btn-secondary p-1.5 cursor-pointer"
                            title="Pratinjau Halaman Detail Kitab"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {!isMultiVolume && book.sourceType === 'google_drive' && book.googleDriveUrl && (
                            <a
                              href={book.googleDriveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="nb-btn nb-btn-secondary p-1.5"
                              title="Buka Langsung di Google Drive"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}

                          {isMultiVolume ? (
                            <button
                              type="button"
                              data-testid={`admin-manage-volumes-${book.id}`}
                              onClick={() => {
                                setFeedback(null);
                                setManagedMultiVolumeBookId(book.id);
                              }}
                              className="nb-btn nb-btn-gold px-2.5 py-1.5 text-[11px] cursor-pointer"
                              title="Buka Halaman Pengelolaan Jilid"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>Kelola Jilid</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(book)}
                              className="nb-btn nb-btn-gold p-1.5 cursor-pointer"
                              title="Edit Buku"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setBookToDelete(book)}
                            disabled={isDeleting && bookToDelete?.id === book.id}
                            className="nb-btn nb-btn-danger p-1.5 disabled:opacity-50 cursor-pointer"
                            title="Hapus Buku"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* ADD / EDIT BOOK MULTI-PAGE DOCUMENT STUDIO MODAL */}
      <AdminEditorModalShell
        isOpen={isModalOpen}
        onClose={() => {
          setActiveEditorTab('naskah');
          setIsModalOpen(false);
        }}
        title={
          isFormMultiVolume
            ? formData.id
              ? 'Edit Info Utama Kitab Berjilid'
              : 'Kitab Berjilid Baru'
            : formData.id
            ? 'Edit Kitab Library'
            : 'Kitab Library Baru'
        }
        subtitle={formData.title?.trim() || 'Dokumen kitab tanpa judul'}
        icon={
          isFormMultiVolume ? (
            <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-[#D9AC45]" />
          ) : (
            <Library className="w-4 h-4 sm:w-5 sm:h-5 text-[#D9AC45]" />
          )
        }
        hasUnsavedChanges={hasUnsavedChanges}
        wordCount={bookWordCount}
        feedback={feedback}
        onDismissFeedback={() => setFeedback(null)}
        activeTabId={
          isFormMultiVolume
            ? 'metadata'
            : formData.sourceType === 'google_drive' && activeEditorTab === 'daftar_isi'
            ? 'naskah'
            : activeEditorTab
        }
        onTabChange={(id) => setActiveEditorTab(id as 'naskah' | 'metadata' | 'daftar_isi')}
        testId="admin-library-editor-modal"
        tabs={([
          ...(!isFormMultiVolume
            ? [
                {
                  id: 'naskah',
                  label: formData.sourceType === 'google_drive' ? 'Sumber Google Drive' : 'Naskah Kitab',
                  shortLabel: formData.sourceType === 'google_drive' ? 'Sumber' : 'Naskah',
                  icon:
                    formData.sourceType === 'google_drive' ? (
                      <ExternalLink className="w-3.5 h-3.5" />
                    ) : (
                      <PenLine className="w-3.5 h-3.5" />
                    ),
                  content:
                    formData.sourceType === 'google_drive' ? (
                      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-white dark:bg-[#0D2520]">
                        <div className="max-w-[74ch] mx-auto px-5 sm:px-10 lg:px-12 py-8 sm:py-12 space-y-6">
                          {!formData.id && renderCollectionTypeSelector(true)}

                          {/* Frameless Title & Arabic Title */}
                          <div className="pb-5 border-b border-[#171717]/12 dark:border-white/12 space-y-2.5">
                            <input
                              type="text"
                              aria-label="Judul Buku"
                              value={formData.title || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                              placeholder="Judul Kitab / Buku..."
                              className="w-full bg-transparent border-0 p-0 text-2xl sm:text-3xl lg:text-[2.1rem] font-extrabold font-serif-brand leading-tight tracking-tight text-[#171717] dark:text-[#F8F3E8] placeholder:text-[#171717]/25 dark:placeholder:text-[#F8F3E8]/25 focus:outline-hidden"
                            />
                            <input
                              type="text"
                              aria-label="Judul Bahasa Arab (Opsional)"
                              value={formData.titleAr || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, titleAr: e.target.value }))}
                              placeholder="Judul Bahasa Arab (opsional) — آدَابُ طَالِبِ العِلْمِ..."
                              dir="rtl"
                              className="w-full bg-transparent border-0 p-0 text-lg sm:text-xl font-amiri font-bold text-[#06251D]/85 dark:text-[#D9AC45]/90 placeholder:text-[#171717]/25 dark:placeholder:text-[#D9AC45]/30 focus:outline-hidden"
                            />
                          </div>

                          {/* Google Drive Source Box */}
                          <div className="p-5 sm:p-6 bg-[#FAF7F0] dark:bg-[#0B2D26] rounded-lg border-2 border-[#171717] dark:border-[#D9AC45]/50 space-y-3.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 text-sm font-extrabold text-[#171717] dark:text-[#F8F3E8]">
                                <ExternalLink className="w-4 h-4 text-[#123D32] dark:text-[#D9AC45]" />
                                <span>Tautan Google Drive Buku *</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, sourceType: 'internal' }))}
                                className="text-[11px] font-extrabold text-[#123D32] dark:text-[#D9AC45] underline cursor-pointer"
                              >
                                Beralih ke Editor Internal
                              </button>
                            </div>
                            <p className="text-xs text-[#525855] dark:text-[#A6D6C9] leading-relaxed">
                              Saat pengunjung membuka kitab ini di Library Digital, mereka dapat mengakses berkas PDF atau dokumen di Google Drive.
                            </p>
                            <input
                              type="url"
                              value={formData.googleDriveUrl || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, googleDriveUrl: e.target.value }))}
                              placeholder="https://drive.google.com/file/d/FILE_ID/view?usp=sharing"
                              className="nb-input w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium"
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#525855] dark:text-[#A6D6C9]">
                              <span>Pastikan akses file disetel ke &ldquo;Siapa saja yang memiliki tautan&rdquo;.</span>
                              {formData.googleDriveUrl && validateLibraryExternalDriveUrl(formData.googleDriveUrl).isValid && (
                                <a
                                  href={formData.googleDriveUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-extrabold text-[#123D32] dark:text-[#D9AC45] underline"
                                >
                                  <span>Uji Buka Tautan</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <RichTextEditor
                        value={formData.content || ''}
                        onChange={(html) => setFormData(prev => ({ ...prev, content: html }))}
                        placeholder="Mulai menulis naskah kitab di sini... Gunakan Heading 1 (H1) untuk Judul Bab dan Heading 2 (H2) untuk Subbab agar Daftar Isi terbentuk otomatis."
                        minHeight="52vh"
                        workspaceMode={true}
                        documentHeader={
                          <div className="mb-6 pb-5 border-b border-[#171717]/12 dark:border-white/12 space-y-2.5">
                            {!formData.id && renderCollectionTypeSelector(true)}
                            <input
                              type="text"
                              aria-label="Judul Buku"
                              value={formData.title || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                              placeholder="Judul Kitab / Buku..."
                              className="w-full bg-transparent border-0 p-0 text-2xl sm:text-3xl lg:text-[2.1rem] font-extrabold font-serif-brand leading-tight tracking-tight text-[#171717] dark:text-[#F8F3E8] placeholder:text-[#171717]/25 dark:placeholder:text-[#F8F3E8]/25 focus:outline-hidden"
                            />
                            <input
                              type="text"
                              aria-label="Judul Bahasa Arab (Opsional)"
                              value={formData.titleAr || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, titleAr: e.target.value }))}
                              placeholder="Judul Bahasa Arab (opsional) — آدَابُ طَالِبِ العِلْمِ..."
                              dir="rtl"
                              className="w-full bg-transparent border-0 p-0 text-lg sm:text-xl font-amiri font-bold text-[#06251D]/85 dark:text-[#D9AC45]/90 placeholder:text-[#171717]/25 dark:placeholder:text-[#D9AC45]/30 focus:outline-hidden"
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-[#525855] dark:text-[#A6D6C9]">
                              <span>Gunakan Heading 1 (H1) untuk Bab &amp; Heading 2 (H2) untuk Subbab</span>
                              {liveTocPreview && liveTocPreview.chapters.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setActiveEditorTab('daftar_isi')}
                                  className="font-bold text-[#123D32] dark:text-[#D9AC45] hover:underline cursor-pointer"
                                >
                                  Lihat Daftar Isi ({liveTocPreview.chapters.length} Bab) →
                                </button>
                              )}
                            </div>
                          </div>
                        }
                      />
                    )
                }
              ]
            : []),
          {
            id: 'metadata',
            label: isFormMultiVolume ? 'Info & Sampul Utama Kitab' : 'Detail & Sampul',
            shortLabel: isFormMultiVolume ? 'Info Utama' : 'Detail',
            icon: isFormMultiVolume ? <Layers className="w-3.5 h-3.5" /> : <SlidersHorizontal className="w-3.5 h-3.5" />,
            content: (
              <div ref={modalBodyRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-[#FAF7F0]/55 dark:bg-[#0A1F1B]">
                <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
                  {/* COLLECTION TYPE SELECTOR: SINGLE vs MULTI-VOLUME */}
                  {renderCollectionTypeSelector(false)}

                  {/* MULTI-VOLUME TITLE & GUIDANCE */}
                  {isFormMultiVolume && (
                    <div className="p-5 sm:p-6 bg-white dark:bg-[#0E2B24] rounded-lg border-2 border-[#171717] dark:border-[#D9AC45]/45 space-y-4">
                      <div className="space-y-2.5 pb-4 border-b border-[#171717]/12 dark:border-white/12">
                        <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#123D32] dark:text-[#D9AC45] block">
                          Judul Utama Kitab Berjilid *
                        </label>
                        <input
                          type="text"
                          data-testid="admin-library-multivolume-title-input"
                          aria-label="Judul Kitab Berjilid"
                          value={formData.title || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Contoh: Shahih Al-Bukhari / Al-Majmu' Syarh Al-Muhadzdzab..."
                          className="w-full bg-transparent border-0 p-0 text-xl sm:text-2xl lg:text-3xl font-extrabold font-serif-brand leading-tight tracking-tight text-[#171717] dark:text-[#F8F3E8] placeholder:text-[#171717]/25 dark:placeholder:text-[#F8F3E8]/25 focus:outline-hidden"
                        />
                        <input
                          type="text"
                          aria-label="Judul Bahasa Arab (Opsional)"
                          value={formData.titleAr || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, titleAr: e.target.value }))}
                          placeholder="Judul Bahasa Arab (opsional) — المجموع شرح المهذب..."
                          dir="rtl"
                          className="w-full bg-transparent border-0 p-0 text-lg sm:text-xl font-amiri font-bold text-[#06251D]/85 dark:text-[#D9AC45]/90 placeholder:text-[#171717]/25 dark:placeholder:text-[#D9AC45]/30 focus:outline-hidden"
                        />
                      </div>

                      <div className="p-3.5 rounded-md bg-[#FAF7F0] dark:bg-[#09211B] border border-[#171717]/20 dark:border-[#D9AC45]/30 text-xs text-[#525855] dark:text-[#A6D6C9] flex items-start gap-2.5">
                        <Layers className="w-4 h-4 shrink-0 text-[#123D32] dark:text-[#D9AC45] mt-0.5" />
                        <p className="leading-relaxed">
                          <strong className="text-[#171717] dark:text-[#F8F3E8]">Satu Sampul Bersama:</strong> Sampul utama yang Anda unggah di bawah akan dipakai bersama seluruh jilid. Setelah menyimpan informasi utama ini, Anda akan langsung diarahkan ke <strong>Halaman Pengelolaan Jilid</strong> untuk menambah, menyunting, dan mengurutkan tiap jilid secara terpisah.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* SOURCE TYPE SELECTOR (SINGLE BOOK ONLY): INTERNAL vs GOOGLE DRIVE */}
                  {!isFormMultiVolume && (
                    <div className="p-5 sm:p-6 bg-white dark:bg-[#0E2B24] rounded-lg border-2 border-[#171717] dark:border-[#D9AC45]/45 space-y-3">
                      <label className="text-sm font-extrabold text-[#171717] dark:text-[#F8F3E8] block">
                        Tipe Sumber Buku *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, sourceType: 'internal' }))}
                          className={`p-3.5 rounded-lg border-2 text-left transition cursor-pointer ${
                            formData.sourceType === 'internal'
                              ? 'bg-[#123D32] text-[#FAF7F0] border-[#171717] shadow-[3px_3px_0px_#171717]'
                              : 'bg-[#FAF7F0] dark:bg-[#0D2B36] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/40 dark:border-[#4CA7A1]/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 font-extrabold text-xs">
                            <BookOpen className="w-4 h-4 shrink-0" />
                            <span>Buku Internal (Editor Dars with Osama)</span>
                          </div>
                          <p className={`text-[11px] mt-1 leading-snug ${formData.sourceType === 'internal' ? 'text-[#FAF7F0]/85' : 'text-[#525855] dark:text-[#A6D6C9]'}`}>
                            Tulis naskah kitab lengkap dengan Daftar Isi otomatis dari H1 &amp; H2.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, sourceType: 'google_drive' }))}
                          className={`p-3.5 rounded-lg border-2 text-left transition cursor-pointer ${
                            formData.sourceType === 'google_drive'
                              ? 'bg-[#123D32] text-[#FAF7F0] border-[#171717] shadow-[3px_3px_0px_#171717]'
                              : 'bg-[#FAF7F0] dark:bg-[#0D2B36] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/40 dark:border-[#4CA7A1]/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 font-extrabold text-xs">
                            <ExternalLink className="w-4 h-4 shrink-0" />
                            <span>Buku Eksternal (Tautan Google Drive)</span>
                          </div>
                          <p className={`text-[11px] mt-1 leading-snug ${formData.sourceType === 'google_drive' ? 'text-[#FAF7F0]/85' : 'text-[#525855] dark:text-[#A6D6C9]'}`}>
                            Pengunjung langsung menuju tautan PDF / dokumen di Google Drive.
                          </p>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* METADATA KITAB */}
                  <div className="p-5 sm:p-6 bg-white dark:bg-[#0E2B24] rounded-lg border-2 border-[#171717] dark:border-[#D9AC45]/45 space-y-4">
                    <div className="pb-2 border-b border-[#171717]/15 dark:border-[#D9AC45]/25">
                      <h4 className="text-sm font-extrabold text-[#171717] dark:text-[#F8F3E8]">
                        Informasi Kitab
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] block mb-1">
                          Kategori Kitab (Opsional)
                        </label>
                        <input
                          type="text"
                          maxLength={150}
                          list="library-category-suggestions"
                          data-testid="admin-library-category-input"
                          value={formData.category || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                          placeholder="Contoh: Nahwu, Sharaf, Fiqih, Tafsir..."
                          className="nb-input w-full px-3.5 py-2.5 text-xs font-semibold"
                        />
                        <datalist id="library-category-suggestions">
                          <option value="Nahwu" />
                          <option value="Sharaf" />
                          <option value="Fiqih" />
                          <option value="Tafsir" />
                          <option value="Hadis" />
                          <option value="Akidah" />
                          <option value="Ushul Fiqih" />
                          <option value="Adab & Akhlak" />
                          <option value="Sirah Nabawiyah" />
                        </datalist>
                        <p className="text-[11px] text-[#525855] dark:text-[#A6D6C9] mt-1">
                          Bebas menuliskan kategori sendiri. Kosongkan jika belum ingin menampilkan badge kategori.
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] block mb-1">
                          Penulis / Penyusun (Opsional)
                        </label>
                        <input
                          type="text"
                          value={formData.author || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                          placeholder="Osama"
                          className="nb-input w-full px-3.5 py-2.5 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] block mb-1">
                        Deskripsi Singkat (Opsional)
                      </label>
                      <textarea
                        rows={3}
                        maxLength={2000}
                        value={formData.description || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Jelaskan secara singkat isi, tema, atau cakupan kitab..."
                        className="nb-input w-full px-3.5 py-2.5 text-xs leading-relaxed resize-y"
                      />
                      <p className="text-[11px] text-[#525855] dark:text-[#A6D6C9] mt-1">
                        Jika diisi, tampil pada halaman detail kitab dan halaman baca internal.
                      </p>
                    </div>
                  </div>

                  {/* COVER IMAGE MANAGEMENT (2 METHODS + 3:4 / 9:16 ASPECT RATIO) */}
                  <div className="p-5 sm:p-6 bg-white dark:bg-[#0E2B24] rounded-lg border-2 border-[#171717] dark:border-[#D9AC45]/45 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-[#171717]/15 dark:border-[#D9AC45]/25">
                      <div>
                        <h4 className="text-sm font-extrabold text-[#171717] dark:text-[#F8F3E8] flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4 text-[#123D32] dark:text-[#D9AC45]" />
                          <span>Gambar Cover Buku</span>
                        </h4>
                        <p className="text-xs text-[#525855] dark:text-[#A6D6C9] mt-0.5">
                          Mendukung upload drag &amp; drop atau tautan Google Drive dengan rasio 3:4 dan 9:16.
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-bold text-[#171717] dark:text-[#F8F3E8] mr-1">Rasio:</span>
                        {(['3:4', '9:16'] as LibraryCoverAspectRatio[]).map(ratio => (
                          <button
                            key={ratio}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, coverAspectRatio: ratio }))}
                            className={`px-3 py-1.5 rounded text-xs font-extrabold border-2 cursor-pointer transition ${
                              (formData.coverAspectRatio || '3:4') === ratio
                                ? 'bg-[#123D32] text-[#FAF7F0] border-[#171717] dark:bg-[#D9AC45] dark:text-[#171717]'
                                : 'bg-white dark:bg-[#0D2B36] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/40'
                            }`}
                          >
                            {ratio}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="inline-flex p-1 bg-[#FAF7F0] dark:bg-[#0D2B36] border-2 border-[#171717] rounded-md gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCoverMethod('upload');
                          setCoverError(null);
                        }}
                        className={`px-3 py-1.5 rounded text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition ${
                          coverMethod === 'upload'
                            ? 'bg-[#D6AD52] text-[#171717]'
                            : 'text-[#525855] dark:text-[#A6D6C9] hover:text-[#171717]'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Drag &amp; Drop</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCoverMethod('google_drive');
                          setCoverError(null);
                        }}
                        className={`px-3 py-1.5 rounded text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition ${
                          coverMethod === 'google_drive'
                            ? 'bg-[#D6AD52] text-[#171717]'
                            : 'text-[#525855] dark:text-[#A6D6C9] hover:text-[#171717]'
                        }`}
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>Tautan Google Drive</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                      <div className="md:col-span-8 space-y-3">
                        {coverMethod === 'upload' ? (
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsDraggingCover(true);
                            }}
                            onDragLeave={() => setIsDraggingCover(false)}
                            onDrop={handleCoverDrop}
                            className={`p-5 rounded-lg border-2 border-dashed text-center space-y-3 transition-colors ${
                              isDraggingCover
                                ? 'border-[#123D32] bg-[#E5EEE7] dark:bg-[#143331]'
                                : 'border-[#171717]/40 dark:border-[#4CA7A1]/50 bg-[#FAF7F0] dark:bg-[#0D2B36]'
                            }`}
                          >
                            <Upload className="w-6 h-6 mx-auto text-[#123D32] dark:text-[#D9AC45]" />
                            <div className="space-y-1">
                              <p className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8]">
                                Seret &amp; lepas gambar cover ke area ini
                              </p>
                              <p className="text-[11px] text-[#525855] dark:text-[#A6D6C9]">
                                Format JPG, PNG, WebP, atau GIF • Maksimal 5 MB
                              </p>
                            </div>

                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              onChange={handleCoverFileInputChange}
                              className="hidden"
                            />

                            <div className="flex flex-wrap items-center justify-center gap-2">
                              <button
                                type="button"
                                disabled={uploadingCover}
                                onClick={() => fileInputRef.current?.click()}
                                className="nb-btn nb-btn-gold px-3.5 py-2 text-xs cursor-pointer"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>{formData.coverImageUrl ? 'Ganti Cover' : 'Pilih Berkas Gambar'}</span>
                              </button>

                              {formData.coverImageUrl && (
                                <button
                                  type="button"
                                  onClick={handleRemoveCover}
                                  className="nb-btn nb-btn-danger px-3 py-2 text-xs cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Hapus Cover</span>
                                </button>
                              )}
                            </div>

                            {uploadingCover && (
                              <div className="space-y-1 max-w-xs mx-auto pt-1">
                                <div className="w-full h-2 bg-[#171717]/15 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[#123D32] dark:bg-[#D9AC45] transition-all"
                                    style={{ width: `${coverProgress}%` }}
                                  />
                                </div>
                                <p className="text-[10px] font-bold text-[#123D32] dark:text-[#D9AC45]">
                                  Mengunggah cover... {coverProgress}%
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2.5 bg-[#FAF7F0] dark:bg-[#0D2B36] p-4 rounded-lg border-2 border-[#171717]/30 dark:border-[#4CA7A1]/40">
                            <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] block">
                              Tautan Gambar Google Drive
                            </label>
                            <input
                              type="url"
                              value={formData.coverImageUrl || ''}
                              onChange={(e) => handleCoverUrlChange(e.target.value)}
                              placeholder="https://drive.google.com/file/d/FILE_ID/view?usp=sharing"
                              className="nb-input w-full px-3 py-2 text-xs font-medium"
                            />
                            <p className="text-[11px] text-[#525855] dark:text-[#A6D6C9] leading-relaxed">
                              Pastikan setelan berbagi di Google Drive diatur ke <strong>&ldquo;Siapa saja yang memiliki link&rdquo;</strong>.
                            </p>

                            {formData.coverImageUrl && isGoogleDriveUrl(formData.coverImageUrl) && extractGoogleDriveFileId(formData.coverImageUrl) && (
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                                <span className="font-bold text-[#123D32] dark:text-[#D9AC45]">
                                  ✓ ID Drive: <code className="font-mono">{extractGoogleDriveFileId(formData.coverImageUrl)}</code>
                                </span>
                                <a
                                  href={getGoogleDriveViewerUrl(formData.coverImageUrl)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline font-bold text-[#123D32] dark:text-[#4CA7A1]"
                                >
                                  Buka di Google Drive ↗
                                </a>
                              </div>
                            )}

                            {formData.coverImageUrl && (
                              <button
                                type="button"
                                onClick={handleRemoveCover}
                                className="text-[11px] font-extrabold text-[#C94A4A] hover:underline cursor-pointer"
                              >
                                Hapus tautan cover
                              </button>
                            )}
                          </div>
                        )}

                        {(coverError || coverLoadFailed) && (
                          <div className="p-3 rounded-md bg-[#F04438]/15 border border-[#F04438] text-[#B42318] dark:text-[#FCA5A5] text-xs font-bold flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>
                              {coverError ||
                                'Gambar cover tidak dapat dimuat. Periksa apakah file Google Drive masih dibatasi (Restricted) atau tautan sudah benar.'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="md:col-span-4 flex flex-col items-center">
                        <span className="text-[11px] font-bold text-[#171717]/80 dark:text-[#F8F3E8]/80 mb-1.5 self-start md:self-center">
                          Pratinjau ({formData.coverAspectRatio || '3:4'}):
                        </span>
                        <div
                          className={`w-36 sm:w-40 ${previewAspectClass} rounded-md bg-[#FAF7F0] dark:bg-[#0D2B36] overflow-hidden border-2 border-[#171717] dark:border-[#B8E8D8] flex items-center justify-center`}
                        >
                          {formData.coverImageUrl ? (
                            <ResilientGoogleDriveImage
                              src={formData.coverImageUrl}
                              alt="Pratinjau Cover Buku"
                              aspectRatioClass={previewAspectClass}
                              objectFit="contain"
                              className="w-full h-full"
                              imageClassName="w-full h-full object-contain"
                              isAdmin={true}
                              showAdminDiagnostic={true}
                              onLoadSuccess={() => setCoverLoadFailed(false)}
                              onAllFailed={() => setCoverLoadFailed(true)}
                            />
                          ) : (
                            <div className="p-3 text-center text-[#525855] dark:text-[#B9C9C5] text-[11px] font-bold space-y-1">
                              <BookOpen className="w-6 h-6 mx-auto opacity-50" />
                              <p>Belum ada cover</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          },
          ...(!isFormMultiVolume && formData.sourceType === 'internal'
            ? [
                {
                  id: 'daftar_isi',
                  label: 'Daftar Isi',
                  icon: <ListOrdered className="w-3.5 h-3.5" />,
                  badge: liveTocPreview?.chapters.length || 0,
                  content: (
                    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-white dark:bg-[#0D2520]">
                      <div className="max-w-3xl mx-auto px-5 sm:px-10 py-8 sm:py-10 space-y-6">
                        <div className="pb-4 border-b border-[#171717]/12 dark:border-white/12 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h4 className="text-lg font-extrabold font-serif-brand text-[#171717] dark:text-[#F8F3E8]">
                              Pratinjau Daftar Isi Otomatis
                            </h4>
                            <p className="text-xs text-[#525855] dark:text-[#A6D6C9] mt-0.5">
                              Terbentuk otomatis dari Heading 1 (Bab) dan Heading 2 (Subbab) pada naskah kitab Anda.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveEditorTab('naskah')}
                            className="nb-btn nb-btn-secondary px-3 py-1.5 text-xs cursor-pointer"
                          >
                            <PenLine className="w-3.5 h-3.5" />
                            <span>Kembali ke Naskah</span>
                          </button>
                        </div>

                        {liveTocPreview && liveTocPreview.hasTocEntries ? (
                          <ol className="space-y-3 list-none p-0 m-0">
                            {liveTocPreview.chapters.map(ch => (
                              <li
                                key={ch.id}
                                className="p-3.5 rounded-lg bg-[#FAF7F0] dark:bg-[#09211B] border border-[#171717]/15 dark:border-[#D9AC45]/25 space-y-1.5"
                              >
                                <div className="text-sm font-extrabold text-[#171717] dark:text-[#F8F3E8] flex items-baseline gap-2">
                                  <span className="font-mono text-xs text-[#123D32] dark:text-[#D9AC45] shrink-0">
                                    {String(ch.index).padStart(2, '0')}.
                                  </span>
                                  <span>{ch.title}</span>
                                </div>
                                {ch.subchapters.length > 0 && (
                                  <ul className="pl-7 space-y-1 list-none m-0">
                                    {ch.subchapters.map((sub, idx) => (
                                      <li key={idx} className="text-xs text-[#525855] dark:text-[#A6D6C9]">
                                        – {sub.title}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <div className="py-12 text-center space-y-3">
                            <ListOrdered className="w-8 h-8 mx-auto text-[#525855]/50 dark:text-[#A6D6C9]/50" />
                            <div className="space-y-1">
                              <p className="text-sm font-extrabold text-[#171717] dark:text-[#F8F3E8]">
                                Belum ada Bab (Heading 1) terdeteksi
                              </p>
                              <p className="text-xs text-[#525855] dark:text-[#A6D6C9] max-w-md mx-auto leading-relaxed">
                                Tambahkan <strong>H1</strong> pada tab <strong>Naskah Kitab</strong> untuk membentuk judul bab yang bisa diklik pembaca, dan <strong>H2</strong> untuk subbab.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }
              ]
            : [])
        ] as AdminEditorTab[])}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setActiveEditorTab('naskah');
                  setIsModalOpen(false);
                }}
                disabled={saving}
                className="nb-btn nb-btn-secondary px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs cursor-pointer"
              >
                Batal
              </button>

              {typeof bookWordCount === 'number' && (
                <span className="md:hidden text-[11px] font-bold text-[#525855] dark:text-[#A6D6C9]">
                  {bookWordCount.toLocaleString('id-ID')} kata
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <button
                type="button"
                disabled={saving || uploadingCover}
                onClick={() => handleSave('draft')}
                className="nb-btn nb-btn-secondary px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs cursor-pointer disabled:opacity-50"
              >
                {saving
                  ? 'Menyimpan...'
                  : isFormMultiVolume
                  ? 'Simpan sebagai Draf'
                  : 'Simpan sebagai Draf'}
              </button>
              <button
                type="button"
                disabled={saving || uploadingCover}
                onClick={() => handleSave('published')}
                className="nb-btn nb-btn-primary px-4 sm:px-5 py-1.5 sm:py-2 text-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <span>
                  {saving
                    ? 'Menyimpan...'
                    : isFormMultiVolume
                    ? formData.id
                      ? 'Simpan Info & Kelola Jilid'
                      : 'Terbitkan & Kelola Jilid'
                    : 'Simpan & Terbitkan'}
                </span>
                {isFormMultiVolume && !saving && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        }
      />

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={Boolean(bookToDelete)}
        onClose={() => setBookToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Buku Library Digital"
        itemName={bookToDelete?.title || ''}
        message={
          bookToDelete && isMultiVolumeLibraryBook(bookToDelete)
            ? 'Buku berjilid ini beserta seluruh daftar jilid di dalamnya akan dihapus secara permanen dari koleksi Library Digital dan tidak dapat dikembalikan.'
            : 'Buku ini akan dihapus secara permanen dari koleksi Library Digital dan tidak dapat dikembalikan.'
        }
        loading={isDeleting}
      />
    </div>
  );
};
