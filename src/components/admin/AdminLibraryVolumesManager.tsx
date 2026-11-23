import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  BookOpen,
  ExternalLink,
  Layers,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  X,
  PenLine,
  SlidersHorizontal,
  ListOrdered,
  Clock,
  EyeOff,
  FileText
} from 'lucide-react';
import { LibraryBook, LibraryBookVolume, LibraryBookSourceType } from '../../types';
import {
  getLibraryBookVolumes,
  saveLibraryBookVolume,
  deleteLibraryBookVolume,
  reorderLibraryBookVolumes
} from '../../firebase/services';
import {
  getLibraryCoverAspectClass,
  parseLibraryBookCategories,
  parseLibraryBookContent,
  validateLibraryExternalDriveUrl,
  validateLibraryPdfDriveUrl,
  resolveLibraryPdfViewerUrl,
  reorderLibraryBookVolumesList,
  classifyLibraryLoadError,
  LibraryLoadErrorInfo
} from '../../utils/libraryHelper';
import {
  countDocumentWords,
  buildLibraryVolumeDirtySnapshot,
  hasEditorUnsavedChanges
} from '../../utils/editorWorkspaceHelper';
import { AdminEditorModalShell, AdminEditorTab } from './AdminEditorModalShell';
import { RichTextEditor } from './RichTextEditor';
import { ConfirmModal } from '../common/ConfirmModal';
import { ResilientGoogleDriveImage } from '../common/ResilientGoogleDriveImage';

interface AdminLibraryVolumesManagerProps {
  book: LibraryBook;
  onBack: () => void;
  onEditMainBook: (book: LibraryBook) => void;
  onPreviewBook: (book: LibraryBook) => void;
  onVolumesChanged: () => void | Promise<void>;
}

export const AdminLibraryVolumesManager: React.FC<AdminLibraryVolumesManagerProps> = ({
  book,
  onBack,
  onEditMainBook,
  onPreviewBook,
  onVolumesChanged
}) => {
  const [volumes, setVolumes] = useState<LibraryBookVolume[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<LibraryLoadErrorInfo | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reordering, setReordering] = useState(false);

  // Volume Delete Confirmation
  const [volumeToDelete, setVolumeToDelete] = useState<LibraryBookVolume | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Independent Volume Editor Modal
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'naskah' | 'pengaturan' | 'daftar_isi'>('naskah');
  const [savingVolume, setSavingVolume] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [volumeForm, setVolumeForm] = useState<Partial<LibraryBookVolume>>({
    volumeNumber: 1,
    order: 1,
    title: '',
    titleAr: '',
    sourceType: 'internal',
    googleDriveUrl: '',
    pdfDriveUrl: '',
    content: '',
    status: 'published'
  });

  const settingsScrollRef = useRef<HTMLDivElement | null>(null);

  const loadVolumes = useCallback(
    async (forceRefresh = false) => {
      setLoading(true);
      setLoadError(null);
      try {
        const list = await getLibraryBookVolumes(book.id, true, forceRefresh);
        setVolumes(list);
      } catch (err) {
        setLoadError(classifyLibraryLoadError(err));
      } finally {
        setLoading(false);
      }
    },
    [book.id]
  );

  useEffect(() => {
    void loadVolumes(false);
  }, [loadVolumes]);

  const publishedCount = useMemo(
    () => volumes.filter(v => v.status === 'published').length,
    [volumes]
  );
  const draftCount = useMemo(
    () => volumes.filter(v => v.status === 'draft').length,
    [volumes]
  );

  const liveTocPreview = useMemo(() => {
    if (volumeForm.sourceType !== 'internal') return null;
    return parseLibraryBookContent(volumeForm.content || '');
  }, [volumeForm.sourceType, volumeForm.content]);

  const currentSnapshot = useMemo(
    () => buildLibraryVolumeDirtySnapshot(volumeForm),
    [volumeForm]
  );

  const hasUnsavedChanges = useMemo(
    () => isEditorOpen && hasEditorUnsavedChanges(currentSnapshot, initialSnapshot),
    [isEditorOpen, currentSnapshot, initialSnapshot]
  );

  const volumeWordCount = useMemo(
    () => (volumeForm.sourceType === 'internal' ? countDocumentWords(volumeForm.content) : null),
    [volumeForm.sourceType, volumeForm.content]
  );

  const handleOpenAddVolume = () => {
    setFeedback(null);
    const nextNumber = volumes.length + 1;
    const nextForm: Partial<LibraryBookVolume> = {
      id: undefined,
      bookId: book.id,
      volumeNumber: nextNumber,
      order: nextNumber,
      title: '',
      titleAr: '',
      sourceType: 'internal',
      googleDriveUrl: '',
      pdfDriveUrl: '',
      content: '',
      status: 'published'
    };
    setVolumeForm(nextForm);
    setInitialSnapshot(buildLibraryVolumeDirtySnapshot(nextForm));
    setActiveTab('naskah');
    setIsEditorOpen(true);
  };

  const handleOpenEditVolume = (vol: LibraryBookVolume) => {
    setFeedback(null);
    const nextForm: Partial<LibraryBookVolume> = { ...vol };
    setVolumeForm(nextForm);
    setInitialSnapshot(buildLibraryVolumeDirtySnapshot(nextForm));
    setActiveTab('naskah');
    setIsEditorOpen(true);
  };

  const handleSaveVolume = async (targetStatus: 'published' | 'draft') => {
    if (savingVolume) return;
    setFeedback(null);

    const titleText = (volumeForm.title || '').trim();
    if (!titleText) {
      setActiveTab('naskah');
      setFeedback({ type: 'error', text: 'Judul jilid wajib diisi terlebih dahulu.' });
      return;
    }

    const sourceType: LibraryBookSourceType =
      volumeForm.sourceType === 'google_drive' ? 'google_drive' : 'internal';

    let normalizedPdfDriveUrl = '';
    if (sourceType === 'google_drive') {
      const driveCheck = validateLibraryExternalDriveUrl(volumeForm.googleDriveUrl);
      if (!driveCheck.isValid) {
        setActiveTab('naskah');
        setFeedback({
          type: 'error',
          text: driveCheck.error || 'Tautan Google Drive jilid tidak valid.'
        });
        return;
      }
    } else {
      const rawContent = volumeForm.content || '';
      const plainText = rawContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      if (!plainText && !rawContent.includes('<img')) {
        setActiveTab('naskah');
        setFeedback({
          type: 'error',
          text: 'Isi naskah jilid internal wajib diisi terlebih dahulu.'
        });
        return;
      }

      const pdfCheck = validateLibraryPdfDriveUrl(volumeForm.pdfDriveUrl);
      if (!pdfCheck.isValid) {
        setActiveTab('pengaturan');
        setFeedback({
          type: 'error',
          text: pdfCheck.error || 'Format Link PDF (Google Drive) jilid tidak valid.'
        });
        return;
      }
      normalizedPdfDriveUrl = pdfCheck.normalizedUrl;
    }

    const volumeNumber = Math.max(1, Math.floor(Number(volumeForm.volumeNumber) || volumes.length + 1));
    const orderVal = volumeForm.id
      ? Math.max(1, Math.floor(Number(volumeForm.order) || volumeNumber))
      : volumeNumber;

    setSavingVolume(true);
    try {
      await saveLibraryBookVolume(book.id, {
        ...volumeForm,
        bookId: book.id,
        volumeNumber,
        order: orderVal,
        title: titleText,
        titleAr: (volumeForm.titleAr || '').trim(),
        sourceType,
        googleDriveUrl: sourceType === 'google_drive' ? (volumeForm.googleDriveUrl || '').trim() : '',
        pdfDriveUrl: sourceType === 'internal' ? normalizedPdfDriveUrl : '',
        content: sourceType === 'internal' ? (volumeForm.content || '') : '',
        status: targetStatus
      });

      setIsEditorOpen(false);
      await loadVolumes(true);
      await onVolumesChanged();
      setFeedback({
        type: 'success',
        text: `Jilid ${volumeNumber} ("${titleText}") berhasil disimpan sebagai ${targetStatus === 'published' ? 'Terbit (Published)' : 'Draf (Draft)'}.`
      });
    } catch (err: any) {
      let msg = err?.message || String(err);
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error) msg = parsed.error;
      } catch {}
      setFeedback({ type: 'error', text: 'Gagal menyimpan jilid: ' + msg });
    } finally {
      setSavingVolume(false);
    }
  };

  const handleToggleVolumeStatus = async (vol: LibraryBookVolume) => {
    const nextStatus = vol.status === 'published' ? 'draft' : 'published';
    setFeedback(null);
    try {
      await saveLibraryBookVolume(book.id, {
        ...vol,
        status: nextStatus
      });
      await loadVolumes(true);
      await onVolumesChanged();
      setFeedback({
        type: 'success',
        text: `Status Jilid ${vol.volumeNumber} ("${vol.title}") diubah menjadi ${nextStatus === 'published' ? 'Terbit (Publik)' : 'Draf (Privat Admin)'}.`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: 'Gagal mengubah status jilid: ' + (err?.message || String(err))
      });
    }
  };

  const handleMoveVolume = async (index: number, direction: 'up' | 'down') => {
    if (reordering) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= volumes.length) return;

    const previousVolumes = volumes;
    const nextVolumes = reorderLibraryBookVolumesList(volumes, index, targetIndex);
    setVolumes(nextVolumes);
    setReordering(true);
    setFeedback(null);

    try {
      await reorderLibraryBookVolumes(book.id, nextVolumes);
      await loadVolumes(true);
      await onVolumesChanged();
      setFeedback({
        type: 'success',
        text: 'Urutan jilid berhasil diperbarui dan disimpan.'
      });
    } catch (err: any) {
      setVolumes(previousVolumes);
      setFeedback({
        type: 'error',
        text: 'Gagal memperbarui urutan jilid: ' + (err?.message || String(err))
      });
    } finally {
      setReordering(false);
    }
  };

  const handleConfirmDeleteVolume = async () => {
    if (!volumeToDelete) return;
    setIsDeleting(true);
    setFeedback(null);
    const label = `Jilid ${volumeToDelete.volumeNumber} (${volumeToDelete.title})`;
    try {
      await deleteLibraryBookVolume(book.id, volumeToDelete.id);
      setVolumeToDelete(null);
      await loadVolumes(true);
      await onVolumesChanged();
      setFeedback({
        type: 'success',
        text: `${label} berhasil dihapus secara permanen.`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: 'Gagal menghapus jilid: ' + (err?.message || String(err))
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const coverAspectClass = getLibraryCoverAspectClass(book.coverAspectRatio);
  const categories = parseLibraryBookCategories(book.category);

  return (
    <div data-testid="admin-library-volumes-manager" className="space-y-6 animate-fade-in font-sans">
      {/* TOP BAR NAVIGATION */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          data-testid="admin-volumes-back-btn"
          onClick={onBack}
          className="nb-btn nb-btn-secondary px-3.5 py-2 text-xs inline-flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Library</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onPreviewBook(book)}
            className="nb-btn nb-btn-secondary px-3.5 py-2 text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Pratinjau Halaman Detail</span>
          </button>

          <button
            type="button"
            data-testid="admin-volumes-edit-main-book-btn"
            onClick={() => onEditMainBook(book)}
            className="nb-btn nb-btn-gold px-3.5 py-2 text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Edit className="w-4 h-4" />
            <span>Edit Info &amp; Sampul Utama</span>
          </button>
        </div>
      </div>

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

      {/* MAIN BOOK OVERVIEW CARD (SINGLE SHARED COVER & CORE METADATA) */}
      <div className="nb-card bg-white dark:bg-[#0D2B36] p-5 sm:p-7">
        <div className="flex flex-col md:flex-row items-start gap-5 sm:gap-7">
          {/* Shared Main Cover */}
          <div className="w-32 sm:w-36 shrink-0 mx-auto md:mx-0">
            <div
              className={`w-full ${coverAspectClass} rounded-md overflow-hidden bg-[#FAF7F0] dark:bg-[#001722] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[4px_4px_0px_#171717] flex items-center justify-center`}
            >
              {book.coverImageUrl ? (
                <ResilientGoogleDriveImage
                  src={book.coverImageUrl}
                  alt={book.title}
                  aspectRatioClass={coverAspectClass}
                  objectFit="contain"
                  className="w-full h-full"
                  imageClassName="w-full h-full object-contain"
                  isAdmin={true}
                />
              ) : (
                <div className="p-3 text-center text-[#525855] dark:text-[#A6D6C9] space-y-1">
                  <BookOpen className="w-6 h-6 mx-auto opacity-60" />
                  <p className="text-[10px] font-bold">Tanpa Sampul</p>
                </div>
              )}
            </div>
          </div>

          {/* Core Book Info */}
          <div className="flex-1 min-w-0 space-y-3 w-full">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#123D32] dark:bg-[#4CA7A1] text-[#FAF7F0] dark:text-[#001722] border border-[#171717] text-[10px] font-extrabold uppercase tracking-wider">
                <Layers className="w-3 h-3" />
                <span>Koleksi Berjilid</span>
              </span>

              <span
                className={`px-2.5 py-0.5 rounded border border-[#171717] text-[10px] font-extrabold uppercase tracking-wider ${
                  book.status === 'published'
                    ? 'bg-[#D9AC45] text-[#171717]'
                    : 'bg-[#FAF7F0] dark:bg-[#001722] text-[#525855] dark:text-[#A6D6C9]'
                }`}
              >
                {book.status === 'published' ? 'Induk Terbit (Publik)' : 'Induk Draf (Privat Admin)'}
              </span>

              {categories.map((cat, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-[#F0BE49] text-[#0F3D3A] border border-[#171717] text-[10px] font-extrabold uppercase tracking-wider"
                >
                  {cat}
                </span>
              ))}
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-extrabold font-serif-brand text-[#171717] dark:text-[#CEFEF1] leading-snug">
                {book.title}
              </h2>
              {book.titleAr && (
                <p dir="rtl" className="font-amiri text-lg sm:text-xl font-bold text-[#123D32] dark:text-[#D6AD52]">
                  {book.titleAr}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#525855] dark:text-[#A6D6C9] font-semibold">
              {book.author && <span>Penulis: <strong className="text-[#171717] dark:text-[#CEFEF1]">{book.author}</strong></span>}
              <span className="font-mono text-[11px]">/library/{book.slug}</span>
            </div>

            {book.description && (
              <p className="text-xs text-[#525855] dark:text-[#A6D6C9] leading-relaxed line-clamp-3">
                {book.description}
              </p>
            )}

            {/* Quick Volume Stats Strip */}
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-extrabold tabular-nums">
              <span className="text-[#171717] dark:text-[#CEFEF1]">
                Total Jilid: <span className="text-[#123D32] dark:text-[#D6AD52]">{volumes.length}</span>
              </span>
              <span aria-hidden="true" className="text-[#525855]/40">·</span>
              <span className="text-[#123D32] dark:text-[#4CA7A1]">
                Terbit: {publishedCount}
              </span>
              <span aria-hidden="true" className="text-[#525855]/40">·</span>
              <span className="text-[#8A5A00] dark:text-[#F0BE49]">
                Draf: {draftCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* VOLUMES MANAGEMENT PANEL */}
      <div className="nb-card bg-white dark:bg-[#0D2B36] p-5 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#171717] dark:border-[#4CA7A1]/50 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold font-serif-brand text-[#171717] dark:text-[#CEFEF1] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#123D32] dark:text-[#D6AD52]" />
              <span>Daftar Jilid Kitab ({volumes.length})</span>
            </h3>
            <p className="text-xs text-[#525855] dark:text-[#A6D6C9] mt-1">
              Setiap jilid tersimpan terpisah dengan konten atau tautan Google Drive masing-masing. Atur urutan atau pilih jilid untuk menyunting.
            </p>
          </div>

          <button
            type="button"
            data-testid="admin-add-volume-btn"
            onClick={handleOpenAddVolume}
            className="nb-btn nb-btn-primary px-4 py-2.5 text-xs inline-flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-[#001722]" />
            <span>Tambah Jilid</span>
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-lg bg-[#FAF7F0] dark:bg-[#001722]/60 animate-pulse border-2 border-[#171717]/15" />
            ))}
          </div>
        ) : loadError ? (
          <div className="p-6 rounded-lg border-2 border-[#171717] bg-[#FEF2F2] dark:bg-[#3A1E24] text-center space-y-3">
            <AlertTriangle className="w-7 h-7 mx-auto text-[#B91C1C] dark:text-[#FCA5A5]" />
            <p className="text-sm font-extrabold text-[#171717] dark:text-[#CEFEF1]">{loadError.title}</p>
            <p className="text-xs text-[#525855] dark:text-[#A6D6C9] max-w-md mx-auto">{loadError.message}</p>
            <button
              type="button"
              onClick={() => void loadVolumes(true)}
              className="nb-btn nb-btn-primary px-4 py-2 text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Muat Ulang</span>
            </button>
          </div>
        ) : volumes.length === 0 ? (
          <div
            data-testid="admin-volumes-empty-state"
            className="py-12 px-4 text-center rounded-lg border-2 border-dashed border-[#171717]/30 dark:border-[#4CA7A1]/40 bg-[#FAF7F0] dark:bg-[#001722]/50 space-y-3"
          >
            <Layers className="w-9 h-9 mx-auto text-[#123D32]/50 dark:text-[#4CA7A1]/60" />
            <div className="space-y-1">
              <p className="text-sm font-extrabold text-[#171717] dark:text-[#CEFEF1]">
                Belum Ada Jilid pada Kitab Ini
              </p>
              <p className="text-xs text-[#525855] dark:text-[#A6D6C9] max-w-md mx-auto leading-relaxed">
                Tambahkan jilid pertama dengan naskah internal (editor website) maupun tautan Google Drive.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddVolume}
              className="nb-btn nb-btn-gold px-4 py-2 text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jilid Pertama</span>
            </button>
          </div>
        ) : (
          <ol data-testid="admin-volumes-list" className="space-y-3.5 list-none p-0 m-0">
            {volumes.map((vol, idx) => {
              const isDraft = vol.status === 'draft';
              const isExternal = vol.sourceType === 'google_drive';

              return (
                <li
                  key={vol.id}
                  data-testid={`admin-volume-row-${vol.id}`}
                  data-volume-status={vol.status}
                  className={`p-4 sm:p-5 rounded-lg border-2 transition-all ${
                    isDraft
                      ? 'bg-[#FAF7F0] dark:bg-[#081F27] border-dashed border-[#8A5A00] dark:border-[#D6AD52]/70'
                      : 'bg-white dark:bg-[#0B2530] border-[#171717] dark:border-[#4CA7A1]/80 shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Reorder + Volume Number + Metadata */}
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      {/* Reorder Controls */}
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          data-testid={`volume-move-up-${vol.id}`}
                          disabled={idx === 0 || reordering}
                          onClick={() => void handleMoveVolume(idx, 'up')}
                          title="Geser jilid ke atas"
                          aria-label={`Geser Jilid ${vol.volumeNumber} ke atas`}
                          className="p-1.5 rounded border border-[#171717]/40 dark:border-[#4CA7A1]/50 bg-[#FAF7F0] dark:bg-[#001722] text-[#171717] dark:text-[#CEFEF1] hover:bg-[#F0BE49] hover:text-[#171717] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          data-testid={`volume-move-down-${vol.id}`}
                          disabled={idx === volumes.length - 1 || reordering}
                          onClick={() => void handleMoveVolume(idx, 'down')}
                          title="Geser jilid ke bawah"
                          aria-label={`Geser Jilid ${vol.volumeNumber} ke bawah`}
                          className="p-1.5 rounded border border-[#171717]/40 dark:border-[#4CA7A1]/50 bg-[#FAF7F0] dark:bg-[#001722] text-[#171717] dark:text-[#CEFEF1] hover:bg-[#F0BE49] hover:text-[#171717] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Volume Number Box */}
                      <div
                        className={`w-12 h-12 rounded-md border-2 border-[#171717] flex flex-col items-center justify-center shrink-0 ${
                          isDraft
                            ? 'bg-[#EFE5D2] dark:bg-[#1C2A32] text-[#525855] dark:text-[#D6AD52]'
                            : 'bg-[#123D32] dark:bg-[#1F5F63] text-[#FAF7F0] shadow-[2px_2px_0px_#171717]'
                        }`}
                      >
                        <span className="text-[9px] font-bold uppercase tracking-wider opacity-80 leading-none">
                          Jilid
                        </span>
                        <span className="text-base font-extrabold font-mono tabular-nums leading-tight">
                          {vol.volumeNumber}
                        </span>
                      </div>

                      {/* Volume Title & Status Badges */}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm sm:text-base font-extrabold text-[#171717] dark:text-[#CEFEF1] leading-snug">
                            {vol.title}
                          </h4>

                          {/* Clear Visual Distinction: Published vs Draft */}
                          <button
                            type="button"
                            data-testid={`volume-status-toggle-${vol.id}`}
                            onClick={() => void handleToggleVolumeStatus(vol)}
                            title="Klik untuk mengubah status publikasi jilid"
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border cursor-pointer transition ${
                              isDraft
                                ? 'bg-[#FEF3C7] dark:bg-[#3A2D0C] text-[#92400E] dark:text-[#FCD34D] border-[#92400E] dark:border-[#FCD34D]/60'
                                : 'bg-[#123D32] dark:bg-[#4CA7A1] text-[#FAF7F0] dark:text-[#001722] border-[#171717]'
                            }`}
                          >
                            {isDraft ? (
                              <>
                                <EyeOff className="w-3 h-3" />
                                <span>Draf (Privat Admin)</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                <span>Terbit (Publik)</span>
                              </>
                            )}
                          </button>
                        </div>

                        {vol.titleAr && (
                          <p dir="rtl" className="font-amiri text-base font-bold text-[#123D32] dark:text-[#D6AD52]">
                            {vol.titleAr}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-[#525855] dark:text-[#A6D6C9]">
                          <span className="inline-flex items-center gap-1">
                            {isExternal ? (
                              <>
                                <ExternalLink className="w-3 h-3" />
                                <span>Eksternal (Google Drive)</span>
                              </>
                            ) : (
                              <>
                                <BookOpen className="w-3 h-3" />
                                <span>Editor Internal</span>
                              </>
                            )}
                          </span>

                          {!isExternal && (vol.readingTimeMinutes || 0) > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{vol.readingTimeMinutes} Menit</span>
                              </span>
                            </>
                          )}

                          {!isExternal && resolveLibraryPdfViewerUrl(vol.pdfDriveUrl) && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 text-[#123D32] dark:text-[#D6AD52] font-bold">
                                <FileText className="w-3 h-3" />
                                <span>PDF Tersedia</span>
                              </span>
                            </>
                          )}

                          <span aria-hidden="true">·</span>
                          <span>
                            Diperbarui {new Date(vol.updatedAt || vol.createdAt).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#171717]/10 dark:border-[#4CA7A1]/20">
                      {isExternal && vol.googleDriveUrl && (
                        <a
                          href={vol.googleDriveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="nb-btn nb-btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1.5 no-underline"
                          title="Buka Tautan Google Drive Jilid"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Buka Drive</span>
                        </a>
                      )}

                      <button
                        type="button"
                        data-testid={`admin-edit-volume-${vol.id}`}
                        onClick={() => handleOpenEditVolume(vol)}
                        className="nb-btn nb-btn-gold px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit Jilid</span>
                      </button>

                      <button
                        type="button"
                        data-testid={`admin-delete-volume-${vol.id}`}
                        onClick={() => setVolumeToDelete(vol)}
                        disabled={isDeleting && volumeToDelete?.id === vol.id}
                        className="nb-btn nb-btn-danger p-1.5 cursor-pointer disabled:opacity-50"
                        title="Hapus Jilid"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* INDEPENDENT VOLUME EDITOR MODAL (REUSES FRAMELESS DOCUMENT STUDIO) */}
      <AdminEditorModalShell
        isOpen={isEditorOpen}
        onClose={() => {
          setActiveTab('naskah');
          setIsEditorOpen(false);
        }}
        title={volumeForm.id ? `Edit Jilid ${volumeForm.volumeNumber || 1}` : `Tambah Jilid ${volumeForm.volumeNumber || volumes.length + 1}`}
        subtitle={`${book.title}${volumeForm.title?.trim() ? ` — ${volumeForm.title.trim()}` : ''}`}
        icon={<Layers className="w-4 h-4 sm:w-5 sm:h-5 text-[#D9AC45]" />}
        hasUnsavedChanges={hasUnsavedChanges}
        wordCount={volumeWordCount}
        feedback={feedback}
        onDismissFeedback={() => setFeedback(null)}
        activeTabId={
          volumeForm.sourceType === 'google_drive' && activeTab === 'daftar_isi'
            ? 'naskah'
            : activeTab
        }
        onTabChange={(id) => setActiveTab(id as 'naskah' | 'pengaturan' | 'daftar_isi')}
        testId="admin-library-volume-editor-modal"
        tabs={([
          {
            id: 'naskah',
            label: volumeForm.sourceType === 'google_drive' ? 'Sumber Google Drive' : 'Naskah Jilid',
            shortLabel: volumeForm.sourceType === 'google_drive' ? 'Sumber' : 'Naskah',
            icon: volumeForm.sourceType === 'google_drive' ? <ExternalLink className="w-3.5 h-3.5" /> : <PenLine className="w-3.5 h-3.5" />,
            content:
              volumeForm.sourceType === 'google_drive' ? (
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-white dark:bg-[#0D2520]">
                  <div className="max-w-[74ch] mx-auto px-5 sm:px-10 lg:px-12 py-8 sm:py-12 space-y-6">
                    {/* Frameless Volume Title & Arabic Title */}
                    <div className="pb-5 border-b border-[#171717]/12 dark:border-white/12 space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#123D32] dark:text-[#D9AC45]">
                        <span>{book.title}</span>
                        <span aria-hidden="true">·</span>
                        <span>Jilid {volumeForm.volumeNumber || 1}</span>
                      </div>
                      <input
                        type="text"
                        data-testid="admin-volume-title-input"
                        aria-label="Judul Jilid"
                        value={volumeForm.title || ''}
                        onChange={(e) => setVolumeForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Judul Jilid (contoh: Jilid 1 — Kitab Thaharah)..."
                        className="w-full bg-transparent border-0 p-0 text-2xl sm:text-3xl lg:text-[2.1rem] font-extrabold font-serif-brand leading-tight tracking-tight text-[#171717] dark:text-[#F8F3E8] placeholder:text-[#171717]/25 dark:placeholder:text-[#F8F3E8]/25 focus:outline-hidden"
                      />
                      <input
                        type="text"
                        aria-label="Judul Arab Jilid (Opsional)"
                        value={volumeForm.titleAr || ''}
                        onChange={(e) => setVolumeForm(prev => ({ ...prev, titleAr: e.target.value }))}
                        placeholder="Judul Arab Jilid (opsional) — الجزء الأول..."
                        dir="rtl"
                        className="w-full bg-transparent border-0 p-0 text-lg sm:text-xl font-amiri font-bold text-[#06251D]/85 dark:text-[#D9AC45]/90 placeholder:text-[#171717]/25 dark:placeholder:text-[#D9AC45]/30 focus:outline-hidden"
                      />
                    </div>

                    {/* Google Drive Source Box */}
                    <div className="p-5 sm:p-6 bg-[#FAF7F0] dark:bg-[#0B2D26] rounded-lg border-2 border-[#171717] dark:border-[#D9AC45]/50 space-y-3.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 text-sm font-extrabold text-[#171717] dark:text-[#F8F3E8]">
                          <ExternalLink className="w-4 h-4 text-[#123D32] dark:text-[#D9AC45]" />
                          <span>Tautan Google Drive Jilid *</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setVolumeForm(prev => ({ ...prev, sourceType: 'internal' }))}
                          className="text-[11px] font-extrabold text-[#123D32] dark:text-[#D9AC45] underline cursor-pointer"
                        >
                          Beralih ke Editor Internal
                        </button>
                      </div>
                      <p className="text-xs text-[#525855] dark:text-[#A6D6C9] leading-relaxed">
                        Saat pengunjung memilih jilid ini pada halaman detail kitab, mereka langsung diarahkan ke tautan Google Drive khusus jilid ini.
                      </p>
                      <input
                        type="url"
                        data-testid="admin-volume-drive-input"
                        value={volumeForm.googleDriveUrl || ''}
                        onChange={(e) => setVolumeForm(prev => ({ ...prev, googleDriveUrl: e.target.value }))}
                        placeholder="https://drive.google.com/file/d/FILE_ID/view?usp=sharing"
                        className="nb-input w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#525855] dark:text-[#A6D6C9]">
                        <span>Pastikan akses berkas disetel ke &ldquo;Siapa saja yang memiliki tautan&rdquo;.</span>
                        {volumeForm.googleDriveUrl && validateLibraryExternalDriveUrl(volumeForm.googleDriveUrl).isValid && (
                          <a
                            href={volumeForm.googleDriveUrl}
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
                  value={volumeForm.content || ''}
                  onChange={(html) => setVolumeForm(prev => ({ ...prev, content: html }))}
                  placeholder="Mulai menulis naskah jilid di sini... Gunakan Heading 1 (H1) untuk Judul Bab dan Heading 2 (H2) untuk Subbab agar Daftar Isi jilid terbentuk otomatis."
                  minHeight="52vh"
                  workspaceMode={true}
                  documentHeader={
                    <div className="mb-6 pb-5 border-b border-[#171717]/12 dark:border-white/12 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold uppercase tracking-wider text-[#123D32] dark:text-[#D9AC45]">
                        <div className="flex items-center gap-2">
                          <span>{book.title}</span>
                          <span aria-hidden="true">·</span>
                          <span>Jilid {volumeForm.volumeNumber || 1}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('pengaturan')}
                          className="text-[11px] font-bold normal-case tracking-normal text-[#525855] dark:text-[#A6D6C9] hover:text-[#123D32] dark:hover:text-[#D9AC45] underline cursor-pointer"
                        >
                          Ubah Nomor / Sumber Jilid
                        </button>
                      </div>
                      <input
                        type="text"
                        data-testid="admin-volume-title-input"
                        aria-label="Judul Jilid"
                        value={volumeForm.title || ''}
                        onChange={(e) => setVolumeForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Judul Jilid (contoh: Jilid 1 — Kitab Thaharah)..."
                        className="w-full bg-transparent border-0 p-0 text-2xl sm:text-3xl lg:text-[2.1rem] font-extrabold font-serif-brand leading-tight tracking-tight text-[#171717] dark:text-[#F8F3E8] placeholder:text-[#171717]/25 dark:placeholder:text-[#F8F3E8]/25 focus:outline-hidden"
                      />
                      <input
                        type="text"
                        aria-label="Judul Arab Jilid (Opsional)"
                        value={volumeForm.titleAr || ''}
                        onChange={(e) => setVolumeForm(prev => ({ ...prev, titleAr: e.target.value }))}
                        placeholder="Judul Arab Jilid (opsional) — الجزء الأول..."
                        dir="rtl"
                        className="w-full bg-transparent border-0 p-0 text-lg sm:text-xl font-amiri font-bold text-[#06251D]/85 dark:text-[#D9AC45]/90 placeholder:text-[#171717]/25 dark:placeholder:text-[#D9AC45]/30 focus:outline-hidden"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-[#525855] dark:text-[#A6D6C9]">
                        <span>Gunakan Heading 1 (H1) untuk Bab &amp; Heading 2 (H2) untuk Subbab</span>
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setActiveTab('pengaturan')}
                            className="inline-flex items-center gap-1 font-bold text-[#123D32] dark:text-[#D9AC45] hover:underline cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            <span>
                              {resolveLibraryPdfViewerUrl(volumeForm.pdfDriveUrl)
                                ? 'Link PDF Terpasang'
                                : 'Atur Link PDF (Opsional)'}
                            </span>
                          </button>
                          {liveTocPreview && liveTocPreview.chapters.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setActiveTab('daftar_isi')}
                              className="font-bold text-[#123D32] dark:text-[#D9AC45] hover:underline cursor-pointer"
                            >
                              Lihat Daftar Isi ({liveTocPreview.chapters.length} Bab) →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  }
                />
              )
          },
          {
            id: 'pengaturan',
            label: 'Sumber & Nomor Jilid',
            shortLabel: 'Pengaturan',
            icon: <SlidersHorizontal className="w-3.5 h-3.5" />,
            content: (
              <div ref={settingsScrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-[#FAF7F0]/55 dark:bg-[#0A1F1B]">
                <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
                  {/* Volume Number */}
                  <div className="p-5 sm:p-6 bg-white dark:bg-[#0E2B24] rounded-lg border-2 border-[#171717] dark:border-[#D9AC45]/45 space-y-3">
                    <label className="text-sm font-extrabold text-[#171717] dark:text-[#F8F3E8] block">
                      Nomor Urut Jilid *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      data-testid="admin-volume-number-input"
                      value={volumeForm.volumeNumber ?? 1}
                      onChange={(e) => {
                        const num = Math.max(1, parseInt(e.target.value || '1', 10) || 1);
                        setVolumeForm(prev => ({ ...prev, volumeNumber: num, order: num }));
                      }}
                      className="nb-input w-36 px-3.5 py-2.5 text-sm font-mono font-extrabold tabular-nums"
                    />
                    <p className="text-xs text-[#525855] dark:text-[#A6D6C9] leading-relaxed">
                      Menentukan nomor jilid yang tampil di Daftar Jilid. Anda juga dapat memindahkan urutan naik/turun langsung dari halaman pengelolaan jilid.
                    </p>
                  </div>

                  {/* Source Type Switcher */}
                  <div className="p-5 sm:p-6 bg-white dark:bg-[#0E2B24] rounded-lg border-2 border-[#171717] dark:border-[#D9AC45]/45 space-y-3">
                    <label className="text-sm font-extrabold text-[#171717] dark:text-[#F8F3E8] block">
                      Sumber Buku untuk Jilid Ini *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        data-testid="admin-volume-source-internal"
                        onClick={() => setVolumeForm(prev => ({ ...prev, sourceType: 'internal' }))}
                        className={`p-3.5 rounded-lg border-2 text-left transition cursor-pointer ${
                          volumeForm.sourceType === 'internal'
                            ? 'bg-[#123D32] text-[#FAF7F0] border-[#171717] shadow-[3px_3px_0px_#171717]'
                            : 'bg-[#FAF7F0] dark:bg-[#0D2B36] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/40 dark:border-[#4CA7A1]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-extrabold text-xs">
                          <BookOpen className="w-4 h-4 shrink-0" />
                          <span>Internal (Editor Website)</span>
                        </div>
                        <p className={`text-[11px] mt-1 leading-snug ${volumeForm.sourceType === 'internal' ? 'text-[#FAF7F0]/85' : 'text-[#525855] dark:text-[#A6D6C9]'}`}>
                          Tulis naskah jilid langsung dengan Daftar Isi otomatis (H1 &amp; H2), tabel, tautan, dan teks Arab.
                        </p>
                      </button>

                      <button
                        type="button"
                        data-testid="admin-volume-source-drive"
                        onClick={() => setVolumeForm(prev => ({ ...prev, sourceType: 'google_drive' }))}
                        className={`p-3.5 rounded-lg border-2 text-left transition cursor-pointer ${
                          volumeForm.sourceType === 'google_drive'
                            ? 'bg-[#123D32] text-[#FAF7F0] border-[#171717] shadow-[3px_3px_0px_#171717]'
                            : 'bg-[#FAF7F0] dark:bg-[#0D2B36] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/40 dark:border-[#4CA7A1]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-extrabold text-xs">
                          <ExternalLink className="w-4 h-4 shrink-0" />
                          <span>Eksternal (Google Drive)</span>
                        </div>
                        <p className={`text-[11px] mt-1 leading-snug ${volumeForm.sourceType === 'google_drive' ? 'text-[#FAF7F0]/85' : 'text-[#525855] dark:text-[#A6D6C9]'}`}>
                          Arahkan pengunjung langsung ke berkas PDF / dokumen Google Drive khusus jilid ini.
                        </p>
                      </button>
                    </div>

                    {/* OPTIONAL PER-VOLUME PDF LINK (INTERNAL VOLUMES ONLY) */}
                    {volumeForm.sourceType === 'internal' && (() => {
                      const rawPdfUrl = volumeForm.pdfDriveUrl || '';
                      const pdfCheck = validateLibraryPdfDriveUrl(rawPdfUrl);
                      const hasInput = Boolean(rawPdfUrl.trim());
                      const validViewerUrl = resolveLibraryPdfViewerUrl(rawPdfUrl);
                      return (
                        <div
                          data-testid="admin-volume-pdf-drive-section"
                          className="mt-4 pt-4 border-t border-[#171717]/15 dark:border-[#D9AC45]/25 space-y-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <label
                              htmlFor="admin-volume-pdf-drive-input"
                              className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] inline-flex items-center gap-1.5"
                            >
                              <FileText className="w-3.5 h-3.5 text-[#123D32] dark:text-[#D9AC45]" />
                              <span>Link PDF (Google Drive)</span>
                              <span className="font-semibold text-[#525855] dark:text-[#A6D6C9]">(Opsional — Khusus Jilid Ini)</span>
                            </label>
                            {hasInput && (
                              <button
                                type="button"
                                data-testid="admin-volume-pdf-clear-btn"
                                onClick={() => setVolumeForm(prev => ({ ...prev, pdfDriveUrl: '' }))}
                                className="text-[11px] font-extrabold text-[#C94A4A] hover:underline cursor-pointer"
                              >
                                Kosongkan
                              </button>
                            )}
                          </div>
                          <input
                            id="admin-volume-pdf-drive-input"
                            type="url"
                            maxLength={2000}
                            data-testid="admin-volume-pdf-drive-input"
                            value={rawPdfUrl}
                            onChange={(e) => setVolumeForm(prev => ({ ...prev, pdfDriveUrl: e.target.value }))}
                            placeholder="https://drive.google.com/file/d/FILE_ID/view?usp=sharing"
                            className="nb-input w-full px-3.5 py-2.5 text-xs font-medium"
                          />
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#525855] dark:text-[#A6D6C9]">
                            <span>
                              Tautan PDF khusus untuk jilid ini. Jika diisi dan valid, tombol <strong>Lihat PDF</strong> tampil pada halaman pembaca jilid ini tanpa memengaruhi jilid lain.
                            </span>
                            {validViewerUrl && (
                              <a
                                href={validViewerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-extrabold text-[#123D32] dark:text-[#D9AC45] underline shrink-0"
                              >
                                <span>Uji Buka PDF</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          {hasInput && !pdfCheck.isValid && (
                            <p className="text-[11px] font-bold text-[#B42318] dark:text-[#FCA5A5] flex items-start gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>{pdfCheck.error}</span>
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Shared Main Cover Info Notice */}
                  <div className="p-4 sm:p-5 bg-white dark:bg-[#0E2B24] rounded-lg border border-[#171717]/20 dark:border-[#D9AC45]/30 flex items-center gap-4">
                    <div className={`w-14 shrink-0 ${coverAspectClass} rounded overflow-hidden bg-[#FAF7F0] dark:bg-[#001722] border border-[#171717]/30 flex items-center justify-center`}>
                      {book.coverImageUrl ? (
                        <ResilientGoogleDriveImage
                          src={book.coverImageUrl}
                          alt={book.title}
                          aspectRatioClass={coverAspectClass}
                          objectFit="contain"
                          className="w-full h-full"
                          imageClassName="w-full h-full object-contain"
                        />
                      ) : (
                        <BookOpen className="w-5 h-5 text-[#123D32] opacity-60" />
                      )}
                    </div>
                    <div className="space-y-1 text-xs">
                      <p className="font-extrabold text-[#171717] dark:text-[#F8F3E8]">
                        Sampul Utama Bersama: {book.title}
                      </p>
                      <p className="text-[#525855] dark:text-[#A6D6C9] leading-relaxed">
                        Seluruh jilid menggunakan sampul utama kitab induk secara otomatis. Perubahan konten jilid ini tidak memengaruhi jilid lainnya.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          },
          ...(volumeForm.sourceType === 'internal'
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
                              Pratinjau Daftar Isi Jilid {volumeForm.volumeNumber || 1}
                            </h4>
                            <p className="text-xs text-[#525855] dark:text-[#A6D6C9] mt-0.5">
                              Terbentuk otomatis dari Heading 1 (Bab) dan Heading 2 (Subbab) pada naskah jilid ini.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveTab('naskah')}
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
                                Tambahkan <strong>H1</strong> pada tab <strong>Naskah Jilid</strong> untuk membentuk daftar isi otomatis jilid ini.
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
                  setActiveTab('naskah');
                  setIsEditorOpen(false);
                }}
                disabled={savingVolume}
                className="nb-btn nb-btn-secondary px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs cursor-pointer"
              >
                Batal
              </button>

              {typeof volumeWordCount === 'number' && (
                <span className="md:hidden text-[11px] font-bold text-[#525855] dark:text-[#A6D6C9]">
                  {volumeWordCount.toLocaleString('id-ID')} kata
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <button
                type="button"
                data-testid="admin-volume-save-draft-btn"
                disabled={savingVolume}
                onClick={() => void handleSaveVolume('draft')}
                className="nb-btn nb-btn-secondary px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs cursor-pointer disabled:opacity-50"
              >
                {savingVolume ? 'Menyimpan...' : 'Simpan sebagai Draf'}
              </button>
              <button
                type="button"
                data-testid="admin-volume-save-publish-btn"
                disabled={savingVolume}
                onClick={() => void handleSaveVolume('published')}
                className="nb-btn nb-btn-primary px-4 sm:px-5 py-1.5 sm:py-2 text-xs cursor-pointer disabled:opacity-50"
              >
                {savingVolume ? 'Menyimpan...' : 'Simpan & Terbitkan'}
              </button>
            </div>
          </div>
        }
      />

      {/* DELETE VOLUME CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={Boolean(volumeToDelete)}
        onClose={() => setVolumeToDelete(null)}
        onConfirm={handleConfirmDeleteVolume}
        title="Hapus Jilid Kitab"
        itemName={volumeToDelete ? `Jilid ${volumeToDelete.volumeNumber} — ${volumeToDelete.title}` : ''}
        message="Jilid ini akan dihapus secara permanen. Jilid lain dalam kitab yang sama tidak akan terpengaruh."
        loading={isDeleting}
      />
    </div>
  );
};
