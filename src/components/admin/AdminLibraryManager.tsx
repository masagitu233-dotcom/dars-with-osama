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
  Image as ImageIcon
} from 'lucide-react';
import { LibraryBook, LibraryCoverAspectRatio, LibraryBookSourceType, LibraryVisitStats } from '../../types';
import { RichTextEditor } from './RichTextEditor';
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
  parseLibraryBookContent
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
  const [sourceFilter, setSourceFilter] = useState<'all' | LibraryBookSourceType>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [refreshingStats, setRefreshingStats] = useState(false);

  // Delete modal
  const [bookToDelete, setBookToDelete] = useState<LibraryBook | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add / Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    author: 'Osama',
    description: '',
    coverImageUrl: '',
    coverAspectRatio: '3:4',
    sourceType: 'internal',
    googleDriveUrl: '',
    content: '',
    status: 'published'
  });

  const publishedCount = useMemo(() => books.filter(b => b.status === 'published').length, [books]);
  const draftCount = useMemo(() => books.filter(b => b.status === 'draft').length, [books]);

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return books.filter(book => {
      const matchesSearch =
        !q ||
        book.title.toLowerCase().includes(q) ||
        (book.author && book.author.toLowerCase().includes(q)) ||
        (book.slug && book.slug.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'all' || book.status === statusFilter;
      const matchesSource = sourceFilter === 'all' || book.sourceType === sourceFilter;
      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [books, searchQuery, statusFilter, sourceFilter]);

  // Live TOC preview for internal books inside editor modal
  const liveTocPreview = useMemo(() => {
    if (formData.sourceType !== 'internal') return null;
    return parseLibraryBookContent(formData.content || '');
  }, [formData.sourceType, formData.content]);

  const handleOpenAddModal = () => {
    setFeedback(null);
    setCoverError(null);
    setCoverLoadFailed(false);
    setCoverMethod('upload');
    setFormData({
      id: undefined,
      title: '',
      titleAr: '',
      author: 'Osama',
      description: '',
      coverImageUrl: '',
      coverAspectRatio: '3:4',
      sourceType: 'internal',
      googleDriveUrl: '',
      content: '',
      status: 'published'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (book: LibraryBook) => {
    setFeedback(null);
    setCoverError(null);
    setCoverLoadFailed(false);
    setCoverMethod(isGoogleDriveUrl(book.coverImageUrl) ? 'google_drive' : 'upload');
    setFormData({ ...book });
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

    const titleText = (formData.title || '').trim();
    if (!titleText) {
      setFeedback({ type: 'error', text: 'Judul buku wajib diisi terlebih dahulu.' });
      modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const coverUrl = (formData.coverImageUrl || '').trim();
    if (coverUrl) {
      const coverValidation = validateLibraryCoverUrl(coverUrl);
      if (!coverValidation.isValid) {
        setFeedback({
          type: 'error',
          text: `Gambar cover tidak valid: ${coverValidation.error || 'Periksa kembali tautan gambar.'}`
        });
        modalBodyRef.current?.scrollTo({ top: 150, behavior: 'smooth' });
        return;
      }
      if (coverLoadFailed) {
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

    if (sourceType === 'google_drive') {
      const driveValidation = validateLibraryExternalDriveUrl(formData.googleDriveUrl);
      if (!driveValidation.isValid) {
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
        setFeedback({
          type: 'error',
          text: 'Isi naskah buku internal wajib diisi terlebih dahulu.'
        });
        return;
      }
    }

    setSaving(true);
    try {
      await saveLibraryBook({
        ...formData,
        title: titleText,
        coverImageUrl: coverUrl,
        coverAspectRatio: (formData.coverAspectRatio === '9:16' ? '9:16' : '3:4') as LibraryCoverAspectRatio,
        sourceType,
        googleDriveUrl: sourceType === 'google_drive' ? (formData.googleDriveUrl || '').trim() : '',
        content: sourceType === 'internal' ? (formData.content || '') : '',
        status: targetStatus
      });

      setIsModalOpen(false);
      await onRefreshBooks();
      setFeedback({
        type: 'success',
        text: `Buku "${titleText}" berhasil disimpan sebagai ${targetStatus === 'published' ? 'Terbit (Published)' : 'Draf (Draft)'}.`
      });
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
    try {
      await deleteLibraryBook(bookToDelete.id);
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

  return (
    <div className="space-y-6 animate-fade-in font-sans">
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
            <option value="all">Semua Sumber</option>
            <option value="internal">Buku Internal (Editor)</option>
            <option value="google_drive">Eksternal (Google Drive)</option>
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
                        {book.sourceType === 'google_drive' ? (
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

                          {book.sourceType === 'google_drive' && book.googleDriveUrl && (
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

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(book)}
                            className="nb-btn nb-btn-gold p-1.5 cursor-pointer"
                            title="Edit Buku"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

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

      {/* ADD / EDIT BOOK MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="nb-card bg-white dark:bg-[#0B3026] w-full max-w-4xl overflow-hidden my-8 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b-2 border-[#171717] dark:border-[#D9AC45]/50 flex items-center justify-between bg-[#06251D] text-[#F8F3E8] shrink-0">
              <div>
                <h3 className="text-lg font-extrabold text-[#F8F3E8] font-serif-brand flex items-center gap-2">
                  <Library className="w-5 h-5 text-[#D9AC45]" />
                  <span>{formData.id ? 'Edit Buku Library Digital' : 'Tambah Buku Library Digital'}</span>
                </h3>
                <p className="text-xs text-[#F8F3E8]/80 mt-0.5">
                  Atur judul, cover (3:4 atau 9:16), sumber buku Google Drive atau editor internal, serta status publikasi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="nb-btn nb-btn-secondary p-2 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div ref={modalBodyRef} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
              {feedback && (
                <div
                  className={`p-3.5 rounded-md border-2 border-[#171717] text-xs font-bold flex items-center justify-between gap-2 ${
                    feedback.type === 'success'
                      ? 'bg-[#D9AC45] text-[#171717]'
                      : 'bg-[#F04438] text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{feedback.text}</span>
                  </div>
                  <button type="button" onClick={() => setFeedback(null)} className="p-1 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* BASIC METADATA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] block mb-1">
                    Judul Buku *
                  </label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Contoh: Panduan Adab Penuntut Ilmu"
                    className="nb-input w-full px-3.5 py-2.5 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] block mb-1">
                    Judul Bahasa Arab (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.titleAr || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, titleAr: e.target.value }))}
                    placeholder="آدَابُ طَالِبِ العِلْمِ..."
                    dir="rtl"
                    className="nb-input w-full px-3.5 py-2.5 text-xs font-amiri font-bold text-[#06251D] dark:text-[#D9AC45]"
                  />
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

                <div className="md:col-span-2">
                  <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] block mb-1">
                    Deskripsi Singkat (Opsional)
                  </label>
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Jelaskan secara singkat isi, tema, atau cakupan kitab (opsional — boleh dikosongkan)..."
                    className="nb-input w-full px-3.5 py-2.5 text-xs leading-relaxed resize-y"
                  />
                  <p className="text-[11px] text-[#525855] dark:text-[#A6D6C9] mt-1">
                    Tidak wajib diisi. Jika diisi, deskripsi akan tampil pada halaman detail kitab dan halaman baca internal.
                  </p>
                </div>
              </div>

              {/* COVER IMAGE MANAGEMENT (2 METHODS + 3:4 / 9:16 ASPECT RATIO) */}
              <div className="p-4 sm:p-5 bg-[#F8F3E8] dark:bg-[#06251D] rounded-lg border-2 border-[#171717] dark:border-[#D9AC45]/50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-[#171717] dark:text-[#F8F3E8] flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-[#123D32] dark:text-[#D9AC45]" />
                      <span>Gambar Cover Buku</span>
                    </h4>
                    <p className="text-[11px] text-[#525855] dark:text-[#A6D6C9] mt-0.5">
                      Mendukung upload drag &amp; drop atau tautan Google Drive dengan rasio 3:4 dan 9:16 tanpa pemotongan.
                    </p>
                  </div>

                  {/* Aspect Ratio Selector */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-bold text-[#171717] dark:text-[#F8F3E8] mr-1">Rasio:</span>
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

                {/* Method Switch Tabs */}
                <div className="inline-flex p-1 bg-white dark:bg-[#0D2B36] border-2 border-[#171717] rounded-md gap-1">
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
                  {/* Left: Active Cover Input Method */}
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
                            : 'border-[#171717]/40 dark:border-[#4CA7A1]/50 bg-white dark:bg-[#0D2B36]'
                        }`}
                      >
                        <Upload className="w-7 h-7 mx-auto text-[#123D32] dark:text-[#D9AC45]" />
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
                      <div className="space-y-2.5 bg-white dark:bg-[#0D2B36] p-4 rounded-lg border-2 border-[#171717]/30 dark:border-[#4CA7A1]/40">
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
                          Sistem otomatis mengonversi tautan Google Drive menjadi gambar langsung. Pastikan setelan berbagi file di Google Drive diatur ke{' '}
                          <strong>&ldquo;Siapa saja yang memiliki link&rdquo;</strong>.
                        </p>

                        {formData.coverImageUrl && isGoogleDriveUrl(formData.coverImageUrl) && extractGoogleDriveFileId(formData.coverImageUrl) && (
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                            <span className="font-bold text-[#123D32] dark:text-[#D9AC45]">
                              ✓ ID Drive Terdeteksi: <code className="font-mono">{extractGoogleDriveFileId(formData.coverImageUrl)}</code>
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

                    {/* Explicit Cover Error Message */}
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

                  {/* Right: Proportional Cover Preview */}
                  <div className="md:col-span-4 flex flex-col items-center">
                    <span className="text-[11px] font-bold text-[#171717]/80 dark:text-[#F8F3E8]/80 mb-1.5 self-start md:self-center">
                      Pratinjau Cover ({formData.coverAspectRatio || '3:4'}):
                    </span>
                    <div
                      className={`w-36 sm:w-40 ${previewAspectClass} rounded-md bg-white dark:bg-[#0D2B36] overflow-hidden border-2 border-[#171717] dark:border-[#B8E8D8] flex items-center justify-center`}
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

              {/* SOURCE TYPE SELECTOR: GOOGLE DRIVE vs INTERNAL EDITOR */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] block mb-2">
                    Tipe Sumber Buku *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, sourceType: 'internal' }))}
                      className={`p-3.5 rounded-lg border-2 text-left transition cursor-pointer ${
                        formData.sourceType === 'internal'
                          ? 'bg-[#123D32] text-[#FAF7F0] border-[#171717] shadow-[3px_3px_0px_#171717]'
                          : 'bg-white dark:bg-[#0D2B36] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/40 dark:border-[#4CA7A1]/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-extrabold text-xs">
                        <BookOpen className="w-4 h-4 shrink-0" />
                        <span>Buku Internal (Editor Dars with Osama)</span>
                      </div>
                      <p className={`text-[11px] mt-1 ${formData.sourceType === 'internal' ? 'text-[#FAF7F0]/85' : 'text-[#525855] dark:text-[#A6D6C9]'}`}>
                        Tulis seluruh isi buku dalam satu editor panjang dengan Daftar Isi otomatis dari H1 &amp; H2.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, sourceType: 'google_drive' }))}
                      className={`p-3.5 rounded-lg border-2 text-left transition cursor-pointer ${
                        formData.sourceType === 'google_drive'
                          ? 'bg-[#123D32] text-[#FAF7F0] border-[#171717] shadow-[3px_3px_0px_#171717]'
                          : 'bg-white dark:bg-[#0D2B36] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/40 dark:border-[#4CA7A1]/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-extrabold text-xs">
                        <ExternalLink className="w-4 h-4 shrink-0" />
                        <span>Buku Eksternal (Tautan Google Drive)</span>
                      </div>
                      <p className={`text-[11px] mt-1 ${formData.sourceType === 'google_drive' ? 'text-[#FAF7F0]/85' : 'text-[#525855] dark:text-[#A6D6C9]'}`}>
                        Saat pengunjung mengklik buku, langsung menuju tautan PDF / dokumen di Google Drive.
                      </p>
                    </button>
                  </div>
                </div>

                {/* CONDITIONAL SOURCE INPUT */}
                {formData.sourceType === 'google_drive' ? (
                  <div className="p-4 bg-[#FAF7F0] dark:bg-[#0D2B36] rounded-lg border-2 border-[#171717] dark:border-[#4CA7A1] space-y-2.5">
                    <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] block">
                      Tautan Google Drive Buku *
                    </label>
                    <input
                      type="url"
                      value={formData.googleDriveUrl || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, googleDriveUrl: e.target.value }))}
                      placeholder="https://drive.google.com/file/d/FILE_ID/view?usp=sharing"
                      className="nb-input w-full px-3.5 py-2.5 text-xs font-medium"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#525855] dark:text-[#A6D6C9]">
                      <span>Pastikan file dapat dibuka oleh siapa saja yang memiliki tautan.</span>
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
                ) : (
                  <div className="space-y-4">
                    {/* Single Full-Length RichTextEditor reused from Article Manager */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8]">
                          Isi Buku Lengkap (Satu Editor Utuh) *
                        </label>
                        <span className="text-[11px] font-bold text-[#123D32] dark:text-[#D9AC45]">
                          H1 = Judul Bab (bisa diklik) • H2 = Subbab (teks hierarki, tidak diklik)
                        </span>
                      </div>

                      <RichTextEditor
                        value={formData.content || ''}
                        onChange={(html) => setFormData(prev => ({ ...prev, content: html }))}
                        placeholder="Tuliskan seluruh isi buku di sini. Gunakan Heading 1 (H1) untuk judul bab dan Heading 2 (H2) untuk subbab..."
                        minHeight="420px"
                      />
                    </div>

                    {/* Live TOC Structure Preview for Admin Verification */}
                    {liveTocPreview && liveTocPreview.hasTocEntries && (
                      <div className="p-4 rounded-lg bg-[#FAF7F0] dark:bg-[#001722] border-2 border-[#171717]/40 dark:border-[#4CA7A1]/50 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-extrabold text-[#123D32] dark:text-[#D9AC45]">
                          <ListOrdered className="w-4 h-4" />
                          <span>
                            Pratinjau Daftar Isi Otomatis ({liveTocPreview.chapters.length} Bab H1)
                          </span>
                        </div>
                        <ol className="space-y-1.5 text-xs list-none p-0 m-0">
                          {liveTocPreview.chapters.map(ch => (
                            <li key={ch.id} className="space-y-0.5">
                              <div className="font-bold text-[#171717] dark:text-[#CEFEF1]">
                                <span className="font-mono text-[#123D32] dark:text-[#4CA7A1] mr-1.5">
                                  {String(ch.index).padStart(2, '0')}.
                                </span>
                                {ch.title}
                              </div>
                              {ch.subchapters.length > 0 && (
                                <ul className="pl-6 space-y-0.5 list-none m-0">
                                  {ch.subchapters.map((sub, idx) => (
                                    <li key={idx} className="text-[11px] text-[#525855] dark:text-[#A6D6C9]">
                                      – {sub.title}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t-2 border-[#171717] dark:border-[#D9AC45]/50 bg-[#F8F3E8] dark:bg-[#06251D] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                className="nb-btn nb-btn-secondary px-4 py-2 text-xs cursor-pointer"
              >
                Batal
              </button>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={saving || uploadingCover}
                  onClick={() => handleSave('draft')}
                  className="nb-btn nb-btn-secondary px-4 py-2 text-xs cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan sebagai Draf'}
                </button>
                <button
                  type="button"
                  disabled={saving || uploadingCover}
                  onClick={() => handleSave('published')}
                  className="nb-btn nb-btn-primary px-5 py-2 text-xs cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan & Terbitkan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={Boolean(bookToDelete)}
        onClose={() => setBookToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Buku Library Digital"
        itemName={bookToDelete?.title || ''}
        message="Buku ini akan dihapus secara permanen dari koleksi Library Digital dan tidak dapat dikembalikan."
        loading={isDeleting}
      />
    </div>
  );
};
