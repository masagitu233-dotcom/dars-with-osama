import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  CheckCircle,
  AlertCircle,
  FileText,
  X,
  Globe,
  Sparkles,
  RefreshCw,
  Headphones,
  Volume2,
  Mic,
  Music,
  Play,
  Square,
  MessageSquare,
  Info
} from 'lucide-react';
import { BlogPost } from '../../types';
import { RichTextEditor } from './RichTextEditor';
import { saveBlogPost, deleteBlogPost, uploadFileToStorage, deleteDummyBlogPostsFromFirestore } from '../../firebase/services';
import { ConfirmModal } from '../common/ConfirmModal';
import { resolveAudioSourceCandidates, describeAudioPlaybackError } from '../../utils/articleAudioHelper';
import { sanitizeRichTextHtml } from '../../utils/richTextHelper';
import { autoWrapArabicText } from '../../utils/arabicFontHelper';
import { ResilientGoogleDriveImage } from '../common/ResilientGoogleDriveImage';
import {
  isGoogleDriveUrl,
  extractGoogleDriveFileId,
  resolveDisplayImageUrl,
  getGoogleDriveViewerUrl,
  validateArticleImageSource,
  normalizeArticleHtmlImages
} from '../../utils/googleDriveHelper';

interface AdminBlogManagerProps {
  posts: BlogPost[];
  onRefreshPosts: () => void | Promise<void>;
  onPreviewPost: (post: BlogPost) => void;
  onNavigateToComments?: (articleId?: string) => void;
}

export const AdminBlogManager: React.FC<AdminBlogManagerProps> = ({
  posts,
  onRefreshPosts,
  onPreviewPost,
  onNavigateToComments
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDummyModal, setShowDeleteDummyModal] = useState(false);
  const [isDeletingDummy, setIsDeletingDummy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInModalPreview, setIsInModalPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPreviewSpeaking, setIsPreviewSpeaking] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const [formData, setFormData] = useState<Partial<BlogPost>>({
    title: '',
    titleAr: '',
    slug: '',
    excerpt: '',
    content: '',
    contentAr: '',
    coverImageUrl: '',
    coverImageCaption: '',
    category: 'Kajian Umum',
    tags: [],
    status: 'published',
    isFeatured: false,
    authorName: 'Osama',
    authorRole: 'Pengasuh Dars with Osama'
  });

  const [tagInput, setTagInput] = useState('');

  const categories = Array.from(new Set(posts.map(p => p.category).filter(Boolean)));

  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchQuery || (
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || post.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const modalBodyRef = React.useRef<HTMLDivElement>(null);

  const handleOpenAddModal = () => {
    setFeedback(null);
    setFormData({
      id: undefined,
      title: '',
      titleAr: '',
      slug: '',
      excerpt: '',
      content: '',
      contentAr: '',
      coverImageUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=1200&auto=format&fit=crop',
      coverImageCaption: '',
      category: 'Kajian Umum',
      tags: ['Kajian', 'Ilmu Syar\'i'],
      status: 'published',
      isFeatured: false,
      authorName: 'Osama',
      authorRole: 'Pengasuh Dars with Osama',
      audioConfig: {
        enabled: false,
        mode: 'speech',
        speechRate: 1.0,
        speechVoiceName: '',
        customAudioUrl: ''
      }
    });
    setTagInput('Kajian, Ilmu Syar\'i');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (post: BlogPost) => {
    setFeedback(null);
    setFormData({
      ...post,
      audioConfig: post.audioConfig
        ? {
            enabled: Boolean(post.audioConfig.enabled),
            mode: post.audioConfig.mode || 'speech',
            speechRate: post.audioConfig.speechRate || 1.0,
            speechVoiceName: post.audioConfig.speechVoiceName || '',
            customAudioUrl: post.audioConfig.customAudioUrl || ''
          }
        : {
            enabled: false,
            mode: 'speech',
            speechRate: 1.0,
            speechVoiceName: '',
            customAudioUrl: ''
          }
    });
    setTagInput(post.tags ? post.tags.join(', ') : '');
    setIsModalOpen(true);
  };

  const handlePreviewVoice = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setFeedback({ type: 'error', text: 'Peramban Anda saat ini belum mendukung Web Speech API.' });
      return;
    }

    if (isPreviewSpeaking) {
      window.speechSynthesis.cancel();
      setIsPreviewSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const sampleText = formData.title
      ? `Mendengarkan artikel: ${formData.title}. Selamat menyimak sajian ilmu di Dars with Osama.`
      : 'Alhamdulillah, ini adalah contoh suara pemutar audio Dars with Osama pada artikel ini.';

    const utterance = new SpeechSynthesisUtterance(sampleText);
    utterance.rate = formData.audioConfig?.speechRate || 1.0;

    if (formData.audioConfig?.speechVoiceName) {
      const matched = availableVoices.find(v => v.name === formData.audioConfig?.speechVoiceName);
      if (matched) utterance.voice = matched;
    } else {
      const idVoice = availableVoices.find(v => v.lang.startsWith('id') || v.lang.startsWith('in'));
      if (idVoice) utterance.voice = idVoice;
    }

    utterance.onend = () => setIsPreviewSpeaking(false);
    utterance.onerror = () => setIsPreviewSpeaking(false);

    setIsPreviewSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
      setFeedback({ type: 'error', text: 'Harap pilih berkas audio yang valid (.mp3, .m4a, .wav, .ogg, .aac).' });
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setFeedback({ type: 'error', text: 'Ukuran berkas audio maksimal 25 MB.' });
      return;
    }

    setUploadingAudio(true);
    setAudioProgress(10);

    try {
      const downloadUrl = await uploadFileToStorage(file, 'article_audio', (pct) => {
        setAudioProgress(pct);
      });
      setFormData(prev => ({
        ...prev,
        audioConfig: {
          ...(prev.audioConfig || { mode: 'custom' }),
          mode: 'custom',
          customAudioUrl: downloadUrl
        }
      }));
    } catch (err: any) {
      setFeedback({ type: 'error', text: 'Gagal mengunggah berkas audio: ' + (err.message || String(err)) });
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleCoverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', text: 'Harap pilih berkas gambar sampul yang valid.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', text: 'Ukuran berkas gambar maksimal 5 MB.' });
      return;
    }

    setUploadingCover(true);
    setCoverProgress(10);

    try {
      const downloadUrl = await uploadFileToStorage(file, 'blog_covers', (pct) => {
        setCoverProgress(pct);
      });
      setFormData(prev => ({ ...prev, coverImageUrl: downloadUrl }));
    } catch (err: any) {
      setFeedback({ type: 'error', text: 'Gagal mengunggah sampul: ' + err.message });
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSave = async (status: 'published' | 'draft') => {
    if (saving) return;
    setFeedback(null);

    const titleText = formData.title?.trim() || '';
    if (!titleText) {
      setFeedback({ type: 'error', text: 'Judul artikel wajib diisi terlebih dahulu.' });
      if (modalBodyRef.current) modalBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const rawContent = formData.content || '';
    const cleanContentText = rawContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (!cleanContentText && !rawContent.includes('<img')) {
      setFeedback({ type: 'error', text: 'Isi naskah artikel wajib diisi terlebih dahulu.' });
      if (modalBodyRef.current) modalBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const coverUrl = (formData.coverImageUrl || '').trim();
    if (coverUrl) {
      const coverValidation = validateArticleImageSource(coverUrl);
      if (!coverValidation.isValid) {
        setFeedback({
          type: 'error',
          text: `Gambar sampul tidak valid: ${coverValidation.error || 'Periksa kembali URL gambar.'}`
        });
        if (modalBodyRef.current) modalBodyRef.current.scrollTo({ top: 300, behavior: 'smooth' });
        return;
      }
    }

    setSaving(true);
    try {
      const parsedTags = tagInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const normalizedContent = normalizeArticleHtmlImages(rawContent);

      await saveBlogPost({
        ...formData,
        title: titleText,
        coverImageUrl: coverUrl,
        content: normalizedContent,
        tags: parsedTags,
        status
      });

      setIsModalOpen(false);
      await onRefreshPosts();
      setFeedback({
        type: 'success',
        text: `Artikel "${titleText}" berhasil disimpan sebagai ${status === 'published' ? 'Terbit (Published)' : 'Draf'}.`
      });
    } catch (err: any) {
      let msg = err?.message || String(err);
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error) msg = parsed.error;
      } catch {}
      setFeedback({
        type: 'error',
        text: 'Gagal menyimpan artikel: ' + msg
      });
      if (modalBodyRef.current) modalBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    setIsDeleting(true);
    setFeedback(null);
    const targetTitle = postToDelete.title;
    try {
      await deleteBlogPost(postToDelete.id);
      await onRefreshPosts();
      setPostToDelete(null);
      setFeedback({
        type: 'success',
        text: `Artikel "${targetTitle}" berhasil dihapus secara permanen dari database.`
      });
    } catch (err: any) {
      let msg = err?.message || String(err);
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error) msg = parsed.error;
      } catch {}
      setFeedback({
        type: 'error',
        text: `Gagal menghapus artikel: ${msg}`
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteDummy = async () => {
    setIsDeletingDummy(true);
    setFeedback(null);
    try {
      const count = await deleteDummyBlogPostsFromFirestore();
      await onRefreshPosts();
      setShowDeleteDummyModal(false);
      setFeedback({
        type: 'success',
        text: `Berhasil menghapus ${count} artikel contoh (dummy) dari Firestore.`
      });
    } catch (err: any) {
      let msg = err?.message || String(err);
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error) msg = parsed.error;
      } catch {}
      setFeedback({
        type: 'error',
        text: `Gagal menghapus artikel dummy: ${msg}`
      });
    } finally {
      setIsDeletingDummy(false);
    }
  };

  const handleToggleStatus = async (post: BlogPost) => {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    try {
      await saveBlogPost({
        ...post,
        status: newStatus
      });
      await onRefreshPosts();
      setFeedback({
        type: 'success',
        text: `Status artikel "${post.title}" diubah menjadi ${newStatus === 'published' ? 'Terbit' : 'Draf'}.`
      });
    } catch (err: any) {
      let msg = err?.message || String(err);
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error) msg = parsed.error;
      } catch {}
      setFeedback({
        type: 'error',
        text: 'Gagal mengubah status: ' + msg
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* FEEDBACK STATUS BANNER */}
      {feedback && (
        <div className={`p-4 rounded-md border-2 border-[#171717] shadow-[4px_4px_0px_#171717] text-xs sm:text-sm font-bold flex items-center justify-between gap-3 animate-fade-in ${
          feedback.type === 'success'
            ? 'bg-[#D9AC45] text-[#171717]'
            : 'bg-[#F04438] text-white'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-black/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 nb-card bg-white dark:bg-[#1F5F63] p-6">
        <div>
          <h2 className="text-lg font-extrabold font-serif-brand text-charcoal dark:text-[#FFFFFF] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#123D32] dark:text-[#4CA7A1]" />
            <span>Manajemen Blog & Artikel ({posts.length})</span>
          </h2>
          <p className="text-xs text-slate-gray dark:text-[#A6D6C9] mt-1">
            Kelola publikasi naskah ilmu, catatan kajian, artikel tazkiyah, serta faedah Islam.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowDeleteDummyModal(true)}
            className="nb-btn nb-btn-danger px-3.5 py-2.5 text-xs"
            title="Hapus seluruh artikel dummy / contoh bawaan"
          >
            <Trash2 className="w-4 h-4" />
            <span>Hapus Artikel Dummy</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="nb-btn nb-btn-primary px-4 py-2.5 text-xs"
          >
            <Plus className="w-4 h-4 text-[#001722]" />
            <span>+ Buat Artikel Baru</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 nb-card bg-white dark:bg-[#1F5F63] p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray dark:text-[#A6D6C9]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul artikel, ringkasan, atau kategori..."
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
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="nb-input px-3 py-2 text-xs font-bold"
          >
            <option value="all">Semua Kategori</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ARTICLES TABLE */}
      <div className="nb-card bg-white dark:bg-[#1F5F63] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#123D32] dark:bg-[#001722] text-[#FAF7F0] dark:text-[#CEFEF1] border-b-2 border-[#171717] dark:border-[#4CA7A1] font-extrabold uppercase text-[11px]">
                <th className="p-4">Sampul & Judul Artikel</th>
                <th className="p-4">Kategori</th>
                <th className="p-4">Status</th>
                <th className="p-4">Waktu Baca & Pembaca</th>
                <th className="p-4">Tanggal Diperbarui</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-200 dark:divide-[#4CA7A1]/50 text-charcoal dark:text-[#CEFEF1]">
              {filteredPosts.length === 0 ? (
                <tr className="bg-white dark:bg-[#0D2B36]">
                  <td colSpan={6} className="p-8 text-center text-slate-gray dark:text-[#A6D6C9] font-semibold">
                    Belum ada artikel yang sesuai. Klik "+ Buat Artikel Baru" untuk memublikasikan tulisan.
                  </td>
                </tr>
              ) : (
                filteredPosts.map(post => (
                  <tr key={post.id} className="bg-white dark:bg-[#0D2B36] even:dark:bg-[#1F5F63]/70 hover:bg-[#FAF7F0] dark:hover:bg-[#1F5F63] transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-10 rounded-md bg-[#FAF7F0] dark:bg-[#001722] overflow-hidden shrink-0 border-2 border-[#171717] dark:border-[#4CA7A1]">
                          {post.coverImageUrl ? (
                            <ResilientGoogleDriveImage
                              src={post.coverImageUrl}
                              alt={post.title}
                              aspectRatioClass=""
                              className="w-full h-full"
                              imageClassName="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#123D32] dark:text-[#4CA7A1]">
                              <FileText className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 max-w-xs sm:max-w-md">
                          <p className="font-extrabold text-charcoal dark:text-[#CEFEF1] truncate text-xs sm:text-sm">
                            {post.title}
                          </p>
                          {post.titleAr && (
                            <p className="font-amiri text-xs text-[#123D32] dark:text-[#A6D6C9] font-bold truncate">
                              {post.titleAr}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-gray dark:text-[#A6D6C9] font-mono truncate">
                            /{post.slug}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="nb-badge bg-[#FAF7F0] dark:bg-[#001722] text-charcoal dark:text-[#CEFEF1] border-[#171717] dark:border-[#4CA7A1]">
                        {post.category}
                      </span>
                    </td>

                    <td className="p-4">
                      <button
                        onClick={() => handleToggleStatus(post)}
                        className={`nb-badge cursor-pointer ${
                          post.status === 'published'
                            ? 'bg-[#123D32] dark:bg-[#4CA7A1] text-[#FAF7F0] dark:text-[#001722] border-[#171717] dark:border-[#001722]'
                            : 'bg-[#FAF7F0] dark:bg-[#001722] text-charcoal dark:text-[#A6D6C9] border-[#171717] dark:border-[#4CA7A1]'
                        }`}
                      >
                        {post.status === 'published' ? 'Terbit (Published)' : 'Draf (Draft)'}
                      </button>
                    </td>

                    <td className="p-4">
                      <p className="font-bold text-charcoal dark:text-[#CEFEF1]">{post.readingTimeMinutes} min baca</p>
                      <p className="text-[10px] text-slate-gray dark:text-[#A6D6C9]">{post.viewsCount || 0} pembaca</p>
                      {post.audioConfig?.mode === 'custom' && post.audioConfig.customAudioUrl ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#123D32] dark:text-[#4CA7A1] mt-1">
                          <Mic className="w-3 h-3" /> Audio Rekaman
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-gray dark:text-[#A6D6C9] mt-1 font-semibold">
                          <Volume2 className="w-3 h-3 text-[#123D32] dark:text-[#4CA7A1]" /> TTS {post.audioConfig?.speechRate ? `${post.audioConfig.speechRate}×` : '1×'}
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-[11px] font-medium text-charcoal dark:text-[#A6D6C9]">
                      {new Date(post.updatedAt || post.createdAt).toLocaleString('id-ID')}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onNavigateToComments && (
                          <button
                            onClick={() => onNavigateToComments(post.id)}
                            className="nb-btn nb-btn-secondary p-1.5"
                            title="Lihat & Moderasi Komentar Artikel Ini"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => onPreviewPost(post)}
                          className="nb-btn nb-btn-secondary p-1.5"
                          title="Lihat Pratinjau Artikel"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(post)}
                          className="nb-btn nb-btn-gold p-1.5"
                          title="Edit Artikel"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setPostToDelete(post)}
                          disabled={isDeleting && postToDelete?.id === post.id}
                          className="nb-btn nb-btn-danger p-1.5 disabled:opacity-50"
                          title="Hapus Artikel"
                        >
                          {isDeleting && postToDelete?.id === post.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ARTICLE EDITOR MODAL / DRAWER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="nb-card bg-white dark:bg-[#0B3026] w-full max-w-4xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b-2 border-[#171717] dark:border-[#D9AC45]/50 flex items-center justify-between bg-[#06251D] text-[#F8F3E8] shrink-0">
              <div>
                <h3 className="text-lg font-extrabold text-[#F8F3E8] font-serif-brand flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#D9AC45]" />
                  <span>{formData.id ? 'Edit Artikel Blog' : 'Buat Artikel Blog Baru'}</span>
                </h3>
                <p className="text-xs text-[#F8F3E8]/80 mt-0.5">
                  Tulis isi naskah, sampul, kategori, dan kelola publikasi artikel.
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="nb-btn nb-btn-secondary p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <div ref={modalBodyRef} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
              {/* MODAL INLINE FEEDBACK BANNER */}
              {feedback && (
                <div className={`p-4 rounded-md border-2 border-[#171717] text-xs sm:text-sm font-bold flex items-center justify-between gap-3 animate-fade-in ${
                  feedback.type === 'success'
                    ? 'bg-[#D9AC45] text-[#171717]'
                    : 'bg-[#F04438] text-white'
                }`}>
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

              {/* Judul & Judul Arab */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] block mb-1">
                    Judul Artikel (Indonesia) *
                  </label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Contoh: Menuntut Ilmu Syar'i: Keutamaan & Adab"
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
                    placeholder="طَلَبُ العِلْمِ الشَّرْعِيِّ..."
                    dir="rtl"
                    className="nb-input w-full px-3.5 py-2.5 text-xs font-amiri font-bold text-[#06251D] dark:text-[#D9AC45]"
                  />
                </div>
              </div>

              {/* Kategori, Tag & Unggulan */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] block mb-1">
                    Kategori Artikel *
                  </label>
                  <input
                    type="text"
                    value={formData.category || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="misal: Kajian Fiqih, Adab & Akhlak, Tafsir"
                    className="nb-input w-full px-3.5 py-2.5 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] block mb-1">
                    Tag Artikel (Pisahkan dengan Koma)
                  </label>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="ilmu, tazkiyah, adab"
                    className="nb-input w-full px-3.5 py-2.5 text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                      className="w-4 h-4 accent-[#06251D] rounded"
                    />
                    <span className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#D9AC45]" /> Jadikan Artikel Unggulan
                    </span>
                  </label>
                </div>
              </div>

              {/* Ringkasan / Excerpt */}
              <div>
                <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] block mb-1">
                  Ringkasan / Teaser Singkat (Excerpt) *
                </label>
                <textarea
                  rows={2}
                  value={formData.excerpt || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Ringkasan 1-2 kalimat untuk ditampilkan di kartu daftar artikel..."
                  className="nb-input w-full p-3 text-xs"
                />
              </div>

              {/* Gambar Sampul */}
              <div className="p-4 bg-[#F8F3E8] dark:bg-[#06251D] rounded-lg border-2 border-[#171717] dark:border-[#D9AC45]/50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] block">
                    Gambar Sampul Artikel (Cover Image)
                  </label>
                  <span className="text-[10px] text-[#525855] dark:text-[#A6D6C9] font-bold">
                    Rasio 16:9 disarankan
                  </span>
                </div>

                <div className="p-2.5 rounded bg-white dark:bg-[#102C2B] border border-[#171717]/20 text-[11px] text-[#525855] dark:text-[#A6D6C9] leading-relaxed">
                  💡 <strong>Metode sumber gambar yang didukung:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-[10.5px]">
                    <li><strong>Unggah Berkas Langsung (Firebase Storage)</strong>: Paling stabil dan direkomendasikan untuk situs publik.</li>
                    <li><strong>Tautan Google Drive</strong>: Pastikan akses file di Google Drive telah disetel ke <em>&quot;Siapa saja yang memiliki link&quot;</em>. Sistem otomatis mengonversi ke tautan gambar langsung.</li>
                    <li><strong>URL Gambar Publik</strong>: Tautan gambar langsung (.jpg, .png, .webp).</li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#171717]/80 dark:text-[#F8F3E8]/80 block">
                      1. Unggah Berkas Gambar Sampul (Direkomendasikan):
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverFileUpload}
                      className="w-full text-xs text-[#171717] dark:text-[#F8F3E8] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-2 file:border-[#171717] file:text-xs file:font-extrabold file:bg-[#D9AC45] file:text-[#171717] cursor-pointer"
                    />
                    {uploadingCover && (
                      <p className="text-[10px] font-bold text-[#06251D] dark:text-[#D9AC45]">Mengunggah sampul... {coverProgress}%</p>
                    )}

                    <label className="text-[11px] font-bold text-[#171717]/80 dark:text-[#F8F3E8]/80 block pt-2">
                      2. Atau Masukkan Tautan / URL Sampul:
                    </label>
                    <input
                      type="url"
                      value={formData.coverImageUrl || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, coverImageUrl: e.target.value }))}
                      placeholder="https://drive.google.com/file/d/... atau https://images.unsplash.com/..."
                      className="nb-input w-full px-3 py-2 text-xs font-medium"
                    />

                    {formData.coverImageUrl && isGoogleDriveUrl(formData.coverImageUrl) && (
                      <div className="p-2 rounded bg-amber-50 dark:bg-[#16263D] border border-[#D6AD52] text-[11px] space-y-1 animate-fade-in">
                        <div className="flex items-center gap-1.5 font-bold text-[#123D32] dark:text-[#D6AD52]">
                          <span>✓ Tautan Google Drive Terdeteksi</span>
                          {extractGoogleDriveFileId(formData.coverImageUrl) && (
                            <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-white dark:bg-[#102C2B] border border-[#171717]">
                              ID: {extractGoogleDriveFileId(formData.coverImageUrl)}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#525855] dark:text-[#A6D6C9]">
                          Sistem akan memuat gambar resolusi tinggi langsung. Pastikan izin file disetel ke <strong>&quot;Siapa saja yang memiliki link&quot;</strong>.
                        </p>
                        {extractGoogleDriveFileId(formData.coverImageUrl) && (
                          <a
                            href={getGoogleDriveViewerUrl(formData.coverImageUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#123D32] dark:text-[#D6AD52] underline hover:opacity-80 pt-0.5"
                          >
                            Buka di Google Drive ↗
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[#171717]/80 dark:text-[#F8F3E8]/80 block">
                      Pratinjau Sampul:
                    </span>
                    <div className="aspect-video w-full rounded-md bg-white dark:bg-[#214743] overflow-hidden relative border-2 border-[#171717] dark:border-[#B8E8D8]">
                      {formData.coverImageUrl ? (
                        <ResilientGoogleDriveImage
                          src={formData.coverImageUrl}
                          alt="Sampul"
                          aspectRatioClass="aspect-video"
                          imageClassName="w-full h-full object-cover"
                          isAdmin={true}
                          showAdminDiagnostic={true}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#525855] dark:text-[#B9C9C5] text-xs font-bold">
                          Belum ada sampul
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* PENGATURAN AUDIO READING */}
              <div className="p-5 bg-[#FAF7F0] dark:bg-[#143331] rounded-lg border-2 border-[#171717] dark:border-[#B8E8D8] space-y-4">
                <div className="flex items-center justify-between p-4 bg-white dark:bg-[#193A37] rounded-md border-2 border-[#171717] dark:border-[#B8E8D8]">
                  <div className="flex items-start sm:items-center gap-3">
                    <input
                      type="checkbox"
                      id="checkbox-audio-enabled"
                      checked={formData.audioConfig?.enabled ?? false}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          audioConfig: {
                            mode: 'speech',
                            speechRate: 1.0,
                            speechVoiceName: '',
                            customAudioUrl: '',
                            ...prev.audioConfig,
                            enabled: e.target.checked
                          }
                        }))
                      }
                      className="w-5 h-5 mt-0.5 sm:mt-0 accent-[#123D32] rounded cursor-pointer shrink-0"
                    />
                    <label htmlFor="checkbox-audio-enabled" className="cursor-pointer">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-extrabold text-[#171717] dark:text-[#F0F7F5] flex items-center gap-1.5">
                          <Headphones className="w-4 h-4 text-[#123D32] dark:text-[#F2D98A]" />
                          <span>Aktifkan Audio Reading pada Artikel Ini</span>
                        </span>
                        {formData.audioConfig?.enabled ? (
                          <span className="nb-badge bg-[#123D32] text-[#F2D98A]">
                            Aktif (Tampil di Publik)
                          </span>
                        ) : (
                          <span className="nb-badge bg-[#FAF7F0] dark:bg-[#214743] text-[#525856] dark:text-[#B9C9C5]">
                            Nonaktif (Tidak Ditampilkan)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#525856] dark:text-[#B9C9C5] mt-0.5">
                        {formData.audioConfig?.enabled
                          ? 'Tombol Audio Reading akan ditampilkan di halaman publik artikel ini sehingga pembaca dapat menyimak audio.'
                          : 'Tombol Audio Reading tidak akan ditampilkan pada artikel publik ini (fitur audio dinonaktifkan).'}
                      </p>
                    </label>
                  </div>
                </div>

                {formData.audioConfig?.enabled ? (
                  <div className="space-y-4 pt-1 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#171717]/20 dark:border-[#D9AC45]/30 pb-3">
                      <div>
                        <h4 className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8]">
                          Pilih Sumber & Suara Audio Reading
                        </h4>
                        <p className="text-[11px] text-[#171717]/75 dark:text-[#F8F3E8]/75 mt-0.5">
                          Gunakan suara otomatis peramban (Web Speech) atau berkas audio rekaman asli.
                        </p>
                      </div>

                      <div className="inline-flex p-1 bg-white dark:bg-[#0B3026] border-2 border-[#171717] rounded-md shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData(prev => ({
                              ...prev,
                              audioConfig: {
                                enabled: true,
                                mode: 'speech',
                                speechRate: prev.audioConfig?.speechRate || 1.0,
                                speechVoiceName: prev.audioConfig?.speechVoiceName || '',
                                customAudioUrl: prev.audioConfig?.customAudioUrl || ''
                              }
                            }))
                          }
                          className={`px-3 py-1.5 rounded-sm text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                            formData.audioConfig?.mode !== 'custom'
                              ? 'bg-[#06251D] text-[#D9AC45]'
                              : 'text-[#171717] dark:text-[#F8F3E8]'
                          }`}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Suara Otomatis (Web Speech API)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setFormData(prev => ({
                              ...prev,
                              audioConfig: {
                                enabled: true,
                                mode: 'custom',
                                speechRate: prev.audioConfig?.speechRate || 1.0,
                                speechVoiceName: prev.audioConfig?.speechVoiceName || '',
                                customAudioUrl: prev.audioConfig?.customAudioUrl || ''
                              }
                            }))
                          }
                          className={`px-3 py-1.5 rounded-sm text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                            formData.audioConfig?.mode === 'custom'
                              ? 'bg-[#06251D] text-[#D9AC45]'
                              : 'text-[#171717] dark:text-[#F8F3E8]'
                          }`}
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span>File Audio Rekaman (MP3)</span>
                        </button>
                      </div>
                    </div>

                    {formData.audioConfig?.mode !== 'custom' && (
                      <div className="space-y-4 animate-fade-in text-xs">
                        <div className="p-3 bg-white dark:bg-[#0B3026] border-2 border-[#171717] rounded-md flex items-start gap-2.5 text-[#171717] dark:text-[#F8F3E8]">
                          <Info className="w-4 h-4 text-[#06251D] dark:text-[#D9AC45] shrink-0 mt-0.5" />
                          <div className="text-[11px] leading-relaxed">
                            <strong className="text-[#06251D] dark:text-[#D9AC45]">Pilihan Tanpa Biaya Penyimpanan:</strong> Artikel akan dibacakan langsung oleh teknologi sintesis suara peramban pengunjung.
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[11px] font-extrabold text-[#171717] dark:text-[#F8F3E8] block mb-1">
                              Pilihan Suara Pembaca (Browser Voice):
                            </label>
                            <select
                              value={formData.audioConfig?.speechVoiceName || ''}
                              onChange={(e) =>
                                setFormData(prev => ({
                                  ...prev,
                                  audioConfig: {
                                    ...(prev.audioConfig || { mode: 'speech', enabled: true }),
                                    enabled: true,
                                    mode: 'speech',
                                    speechVoiceName: e.target.value
                                  }
                                }))
                              }
                              className="nb-input w-full px-3 py-2 text-xs font-bold"
                            >
                              <option value="">Otomatis Deteksi Bahasa Indonesia (Rekomendasi)</option>
                              {availableVoices.length > 0 ? (
                                availableVoices.map((v, idx) => {
                                  const isId = v.lang.startsWith('id') || v.lang.startsWith('in');
                                  return (
                                    <option key={`${v.name}_${idx}`} value={v.name}>
                                      {isId ? `🇮🇩 [Bahasa Indonesia] ${v.name}` : `${v.name} (${v.lang})`}
                                    </option>
                                  );
                                })
                              ) : (
                                <option disabled value="__none">
                                  Daftar suara akan dimuat oleh peramban pengguna
                                </option>
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-extrabold text-[#171717] dark:text-[#F8F3E8] block mb-1">
                              Kecepatan Bicara Awal (Speech Rate):
                            </label>
                            <div className="flex items-center gap-2">
                              <select
                                value={formData.audioConfig?.speechRate ?? 1.0}
                                onChange={(e) =>
                                  setFormData(prev => ({
                                    ...prev,
                                    audioConfig: {
                                      ...(prev.audioConfig || { mode: 'speech', enabled: true }),
                                      enabled: true,
                                      mode: 'speech',
                                      speechRate: parseFloat(e.target.value) || 1.0
                                    }
                                  }))
                                }
                                className="nb-input w-full px-3 py-2 text-xs font-bold"
                              >
                                <option value="0.75">0,75× (Lambat / Tartil)</option>
                                <option value="0.85">0,85× (Santai & Khusyuk)</option>
                                <option value="1.0">1,00× (Normal / Standar - Rekomendasi)</option>
                                <option value="1.1">1,10× (Sedikit Cepat)</option>
                                <option value="1.25">1,25× (Cepat)</option>
                                <option value="1.5">1,50× (Sangat Cepat)</option>
                              </select>

                              <button
                                type="button"
                                onClick={handlePreviewVoice}
                                className={`nb-btn px-3 py-2 text-xs shrink-0 ${
                                  isPreviewSpeaking
                                    ? 'nb-btn-gold'
                                    : 'nb-btn-primary'
                                }`}
                                title="Uji coba pelafalan suara peramban ini"
                              >
                                {isPreviewSpeaking ? (
                                  <>
                                    <Square className="w-3.5 h-3.5 fill-current" />
                                    <span>Hentikan</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    <span>Uji Suara</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {formData.audioConfig?.mode === 'custom' && (() => {
                      const resolvedAdminAudio = resolveAudioSourceCandidates(formData.audioConfig?.customAudioUrl);
                      return (
                        <div className="space-y-4 animate-fade-in text-xs">
                          <div className="p-3 bg-white dark:bg-[#0B3026] border-2 border-[#171717] rounded-md flex items-start gap-2.5 text-[#171717] dark:text-[#F8F3E8]">
                            <Music className="w-4 h-4 text-[#D9AC45] shrink-0 mt-0.5" />
                            <div className="text-[11px] leading-relaxed">
                              <strong className="text-[#06251D] dark:text-[#D9AC45]">Mode Rekaman Suara Asli (Google Drive / MP3):</strong> Masukkan tautan berbagi berkas audio dari Google Drive atau unggah berkas audio (.mp3, .m4a, .wav).
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            <div className="space-y-2">
                              <label className="text-[11px] font-extrabold text-[#171717] dark:text-[#F8F3E8] block">
                                Unggah Berkas Audio Rekaman (.mp3, .m4a, .wav):
                              </label>
                              <input
                                type="file"
                                accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac"
                                onChange={handleAudioFileUpload}
                                disabled={uploadingAudio}
                                className="w-full text-xs text-[#171717] dark:text-[#F8F3E8] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-2 file:border-[#171717] file:text-xs file:font-extrabold file:bg-[#D9AC45] file:text-[#171717] cursor-pointer disabled:opacity-50"
                              />
                              {uploadingAudio && (
                                <div className="space-y-1">
                                  <p className="text-[10px] text-[#06251D] dark:text-[#D9AC45] font-extrabold">
                                    Mengunggah berkas audio rekaman... {audioProgress}%
                                  </p>
                                  <div className="w-full bg-white h-2 rounded-sm border border-[#171717] overflow-hidden">
                                    <div
                                      className="bg-[#D9AC45] h-full transition-all duration-300"
                                      style={{ width: `${audioProgress}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <label className="text-[11px] font-extrabold text-[#171717] dark:text-[#F8F3E8] block">
                                Tautan Google Drive Audio atau URL MP3 Langsung:
                              </label>
                              <input
                                type="url"
                                value={formData.audioConfig?.customAudioUrl || ''}
                                onChange={(e) =>
                                  setFormData(prev => ({
                                    ...prev,
                                    audioConfig: {
                                      ...(prev.audioConfig || { mode: 'custom', enabled: true }),
                                      enabled: true,
                                      mode: 'custom',
                                      customAudioUrl: e.target.value
                                    }
                                  }))
                                }
                                placeholder="https://drive.google.com/file/d/.../view?usp=drive_link"
                                className="nb-input w-full px-3 py-2 text-xs"
                              />
                            </div>
                          </div>

                          {formData.audioConfig?.customAudioUrl && (
                            <div className="p-3 bg-white dark:bg-[#0B3026] rounded-md border-2 border-[#171717] space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[11px] font-extrabold text-[#171717] dark:text-[#F8F3E8] flex items-center gap-1.5">
                                  {resolvedAdminAudio.isGoogleDrive && !resolvedAdminAudio.fileId ? (
                                    <>
                                      <AlertCircle className="w-3.5 h-3.5 text-[#F04438]" />
                                      <span className="text-[#F04438]">Tautan Google Drive Tidak Valid</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-3.5 h-3.5 text-[#06251D] dark:text-[#D9AC45]" />
                                      <span>
                                        {resolvedAdminAudio.isGoogleDrive
                                          ? `Google Drive Audio Terdeteksi (ID: ${resolvedAdminAudio.fileId})`
                                          : 'Berkas Audio Rekaman Terpasang'}
                                      </span>
                                    </>
                                  )}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFormData(prev => ({
                                      ...prev,
                                      audioConfig: {
                                        ...(prev.audioConfig || { mode: 'custom', enabled: true }),
                                        enabled: true,
                                        mode: 'custom',
                                        customAudioUrl: ''
                                      }
                                    }))
                                  }
                                  className="text-[10px] text-[#F04438] font-bold underline cursor-pointer"
                                >
                                  Hapus Berkas Audio
                                </button>
                              </div>

                              {resolvedAdminAudio.isGoogleDrive && !resolvedAdminAudio.fileId ? (
                                <p className="text-[11px] text-[#F04438]">
                                  {describeAudioPlaybackError({
                                    isGoogleDrive: true,
                                    isGoogleDriveFolder: resolvedAdminAudio.isGoogleDriveFolder,
                                    fileId: null
                                  })}
                                </p>
                              ) : (
                                <audio
                                  controls
                                  preload="metadata"
                                  src={resolvedAdminAudio.primaryUrl}
                                  className="w-full h-9 rounded-md"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-3.5 bg-white dark:bg-[#0B3026] rounded-md border-2 border-dashed border-[#171717]/40 text-center">
                    <p className="text-xs text-[#171717]/75 dark:text-[#F8F3E8]/75">
                      Audio Reading saat ini <strong>dinonaktifkan</strong> untuk artikel ini.
                    </p>
                  </div>
                )}
              </div>

              {/* Rich Text Editor for Content + Live Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] block">
                    Isi Artikel Utama (Bahasa Indonesia) *
                  </label>
                  <button
                    type="button"
                    data-testid="blog-modal-preview-toggle"
                    onClick={() => setIsInModalPreview(prev => !prev)}
                    className={`nb-btn px-3 py-1.5 text-xs ${
                      isInModalPreview
                        ? 'nb-btn-gold'
                        : 'nb-btn-secondary'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isInModalPreview ? 'Kembali ke Editor' : 'Pratinjau Format Konten'}</span>
                  </button>
                </div>

                {isInModalPreview ? (
                  <div
                    data-testid="blog-modal-preview-content"
                    className="nb-reading-surface p-6 bg-[#F8F3E8] dark:bg-[#06251D] space-y-4 min-h-[350px]"
                  >
                    <div className="pb-3 border-b-2 border-[#171717]/20 dark:border-[#D9AC45]/30 flex items-center justify-between text-[11px] text-[#06251D] dark:text-[#D9AC45] font-extrabold uppercase tracking-wider">
                      <span>Pratinjau Tampilan Publik</span>
                      <span>Format tersimpan & tervalidasi</span>
                    </div>
                    {formData.title && (
                      <h2 className="text-xl sm:text-2xl font-extrabold font-serif-brand text-[#171717] dark:text-[#F8F3E8]">
                        {formData.title}
                      </h2>
                    )}
                    <div
                      className="prose dark:prose-invert max-w-none text-[#171717] dark:text-[#F8F3E8] text-sm sm:text-base leading-relaxed space-y-4 font-sans blog-content"
                      dangerouslySetInnerHTML={{
                        __html: autoWrapArabicText(sanitizeRichTextHtml(formData.content || '<p class="text-stone-400 italic">Belum ada isi konten...</p>'))
                      }}
                    />
                  </div>
                ) : (
                  <RichTextEditor
                    value={formData.content || ''}
                    onChange={(html) => setFormData(prev => ({ ...prev, content: html }))}
                    placeholder="Tuliskan naskah ilmu, paragraf, poin-poin, dan sisipkan gambar di sini..."
                    minHeight="350px"
                  />
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t-2 border-[#171717] dark:border-[#D9AC45]/50 bg-[#F8F3E8] dark:bg-[#06251D] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              {feedback && (
                <div className={`w-full sm:w-auto px-3 py-1.5 rounded-md border-2 border-[#171717] text-xs font-bold flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-[#D9AC45] text-[#171717]'
                    : 'bg-[#F04438] text-white'
                }`}>
                  {feedback.type === 'success' ? (
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="truncate max-w-xs">{feedback.text}</span>
                </div>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsInModalPreview(false);
                    setIsModalOpen(false);
                  }}
                  className="nb-btn nb-btn-secondary px-4 py-2 text-xs"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={() => setIsInModalPreview(prev => !prev)}
                  className="nb-btn nb-btn-secondary px-3.5 py-2 text-xs"
                >
                  <Eye className="w-3.5 h-3.5 text-[#06251D] dark:text-[#D9AC45]" />
                  <span>{isInModalPreview ? 'Edit' : 'Pratinjau'}</span>
                </button>

                <button
                  type="button"
                  data-testid="btn-save-draft"
                  onClick={() => handleSave('draft')}
                  disabled={saving || uploadingCover || uploadingAudio}
                  className="nb-btn nb-btn-gold px-4 py-2 text-xs disabled:opacity-50"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{saving ? 'Menyimpan Draf...' : 'Simpan Draf'}</span>
                </button>

                <button
                  type="button"
                  data-testid="btn-save-publish"
                  onClick={() => handleSave('published')}
                  disabled={saving || uploadingCover || uploadingAudio}
                  className="nb-btn nb-btn-primary px-5 py-2 text-xs disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Globe className="w-4 h-4 text-[#D9AC45]" />
                  )}
                  <span>{saving ? 'Menyimpan...' : (formData.id ? 'Perbarui & Terbitkan' : 'Terbitkan Sekarang')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL (SINGLE ARTICLE) */}
      <ConfirmModal
        isOpen={!!postToDelete}
        onClose={() => {
          if (!isDeleting) setPostToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Hapus Artikel Blog"
        itemName={postToDelete ? `${postToDelete.title} (${postToDelete.slug})` : undefined}
        message="Apakah Anda yakin ingin menghapus artikel ini secara permanen dari database Cloud Firestore? Artikel yang dihapus tidak akan dapat dipulihkan."
        confirmText="Hapus Permanen"
        cancelText="Batal"
        isDangerous={true}
        loading={isDeleting}
      />

      {/* CONFIRM DELETE MODAL (DUMMY ARTICLES) */}
      <ConfirmModal
        isOpen={showDeleteDummyModal}
        onClose={() => {
          if (!isDeletingDummy) setShowDeleteDummyModal(false);
        }}
        onConfirm={handleConfirmDeleteDummy}
        title="Hapus Seluruh Artikel Contoh (Dummy)"
        itemName="Artikel dummy bawaan sistem"
        message="Apakah Anda yakin ingin menghapus seluruh artikel contoh bawaan (dummy) dari database? Tindakan ini akan membersihkan artikel contoh."
        confirmText="Hapus Semua Dummy"
        cancelText="Batal"
        isDangerous={true}
        loading={isDeletingDummy}
      />
    </div>
  );
};
