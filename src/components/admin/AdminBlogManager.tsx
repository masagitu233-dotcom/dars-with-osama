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
  Upload,
  X,
  Save,
  Globe,
  Tag,
  Clock,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Headphones,
  Volume2,
  Mic,
  Music,
  Play,
  Square,
  MessageSquare,
  Info,
  Radio
} from 'lucide-react';
import { BlogPost, BlogPostAudioConfig } from '../../types';
import { RichTextEditor } from './RichTextEditor';
import { saveBlogPost, deleteBlogPost, uploadFileToStorage, deleteDummyBlogPostsFromFirestore } from '../../firebase/services';
import { ConfirmModal } from '../common/ConfirmModal';
import { resolveAudioSourceCandidates, describeAudioPlaybackError } from '../../utils/articleAudioHelper';

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

  // Deletion Modal & Feedback states
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDummyModal, setShowDeleteDummyModal] = useState(false);
  const [isDeletingDummy, setIsDeletingDummy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Editor Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);

  // Audio Upload & TTS Preview states
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPreviewSpeaking, setIsPreviewSpeaking] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  // Load available browser voices for Web Speech API
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

  // Form state
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

  // Extract unique categories
  const categories = Array.from(new Set(posts.map(p => p.category).filter(Boolean)));

  // Filtered posts
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

  const handleOpenAddModal = () => {
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
      alert('Peramban Anda saat ini belum mendukung Web Speech API.');
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
      alert('Harap pilih berkas audio yang valid (.mp3, .m4a, .wav, .ogg, .aac).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert('Ukuran berkas audio maksimal 25 MB.');
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
      alert('Gagal mengunggah berkas audio: ' + (err.message || String(err)));
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleCoverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Harap pilih berkas gambar sampul yang valid.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran berkas gambar maksimal 5 MB.');
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
      alert('Gagal mengunggah sampul: ' + err.message);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSave = async (status: 'published' | 'draft') => {
    if (saving) return; // Prevent double-clicks / duplicate submissions

    if (!formData.title?.trim()) {
      alert('Judul artikel tidak boleh kosong.');
      return;
    }

    if (!formData.content?.trim()) {
      alert('Isi artikel tidak boleh kosong.');
      return;
    }

    setSaving(true);
    try {
      const parsedTags = tagInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      await saveBlogPost({
        ...formData,
        title: formData.title.trim(),
        tags: parsedTags,
        status
      });

      setIsModalOpen(false);
      await onRefreshPosts();
      setFeedback({
        type: 'success',
        text: `Artikel "${formData.title}" berhasil disimpan sebagai ${status === 'published' ? 'Terbit (Published)' : 'Draf'}.`
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
        <div className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center justify-between gap-3 animate-fade-in ${
          feedback.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Manajemen Blog & Artikel ({posts.length})</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Kelola publikasi naskah ilmu, catatan kajian, artikel tazkiyah, serta faedah Islam.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowDeleteDummyModal(true)}
            className="px-3.5 py-2.5 bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Hapus seluruh artikel dummy / contoh bawaan"
          >
            <Trash2 className="w-4 h-4" />
            <span>Hapus Artikel Dummy</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Buat Artikel Baru</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul artikel, ringkasan, atau kategori..."
            className="w-full pl-10 pr-4 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-900 dark:text-white"
          >
            <option value="all">Semua Status</option>
            <option value="published">Terbit (Published)</option>
            <option value="draft">Draf (Draft)</option>
          </select>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-900 dark:text-white"
          >
            <option value="all">Semua Kategori</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ARTICLES TABLE */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-semibold">
              <th className="p-4">Sampul & Judul Artikel</th>
              <th className="p-4">Kategori</th>
              <th className="p-4">Status</th>
              <th className="p-4">Waktu Baca & Pembaca</th>
              <th className="p-4">Tanggal Diperbarui</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
            {filteredPosts.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-stone-500">
                  Belum ada artikel yang sesuai. Klik "+ Buat Artikel Baru" untuk memublikasikan tulisan.
                </td>
              </tr>
            ) : (
              filteredPosts.map(post => (
                <tr key={post.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-10 rounded-lg bg-stone-100 dark:bg-stone-800 overflow-hidden shrink-0 border border-stone-200 dark:border-stone-700">
                        {post.coverImageUrl ? (
                          <img src={post.coverImageUrl} alt={post.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400">
                            <FileText className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 max-w-xs sm:max-w-md">
                        <p className="font-bold text-stone-900 dark:text-white truncate text-xs sm:text-sm">
                          {post.title}
                        </p>
                        {post.titleAr && (
                          <p className="font-amiri text-xs text-emerald-600 dark:text-emerald-400 truncate">
                            {post.titleAr}
                          </p>
                        )}
                        <p className="text-[10px] text-stone-400 truncate">
                          /{post.slug}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-[10px]">
                      {post.category}
                    </span>
                  </td>

                  <td className="p-4">
                    <button
                      onClick={() => handleToggleStatus(post)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                        post.status === 'published'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {post.status === 'published' ? 'Terbit (Published)' : 'Draf (Draft)'}
                    </button>
                  </td>

                  <td className="p-4 text-stone-500">
                    <p className="font-medium text-stone-900 dark:text-stone-100">{post.readingTimeMinutes} min baca</p>
                    <p className="text-[10px] text-stone-400">{post.viewsCount || 0} pembaca</p>
                    {post.audioConfig?.mode === 'custom' && post.audioConfig.customAudioUrl ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                        <Mic className="w-3 h-3" /> Audio Rekaman
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-stone-500 dark:text-stone-400 mt-1">
                        <Volume2 className="w-3 h-3 text-emerald-600" /> TTS {post.audioConfig?.speechRate ? `${post.audioConfig.speechRate}×` : '1×'}
                      </span>
                    )}
                  </td>

                  <td className="p-4 text-stone-500 text-[11px]">
                    {new Date(post.updatedAt || post.createdAt).toLocaleString('id-ID')}
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onNavigateToComments && (
                        <button
                          onClick={() => onNavigateToComments(post.id)}
                          className="p-1.5 text-stone-600 dark:text-stone-300 hover:text-emerald-600 transition cursor-pointer"
                          title="Lihat & Moderasi Komentar Artikel Ini"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => onPreviewPost(post)}
                        className="p-1.5 text-stone-600 dark:text-stone-300 hover:text-emerald-600 transition cursor-pointer"
                        title="Lihat Pratinjau Artikel"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(post)}
                        className="p-1.5 text-stone-600 dark:text-stone-300 hover:text-emerald-600 transition cursor-pointer"
                        title="Edit Artikel"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setPostToDelete(post)}
                        disabled={isDeleting && postToDelete?.id === post.id}
                        className="p-1.5 text-rose-500 hover:text-rose-700 transition cursor-pointer disabled:opacity-50"
                        title="Hapus Artikel"
                      >
                        {isDeleting && postToDelete?.id === post.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
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

      {/* ARTICLE EDITOR MODAL / DRAWER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-900/50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-stone-900 dark:text-white font-sans flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>{formData.id ? 'Edit Artikel Blog' : 'Buat Artikel Blog Baru'}</span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Tulis isi naskah, sampul, kategori, dan kelola publikasi artikel.
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
              {/* Judul & Judul Arab */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Judul Artikel (Indonesia) *
                  </label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Contoh: Menuntut Ilmu Syar'i: Keutamaan & Adab"
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Judul Bahasa Arab (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.titleAr || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, titleAr: e.target.value }))}
                    placeholder="طَلَبُ العِلْمِ الشَّرْعِيِّ..."
                    dir="rtl"
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-amiri font-bold text-emerald-800 dark:text-emerald-300 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Kategori, Tag & Unggulan */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Kategori Artikel *
                  </label>
                  <input
                    type="text"
                    value={formData.category || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="misal: Kajian Fiqih, Adab & Akhlak, Tafsir"
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Tag Artikel (Pisahkan dengan Koma)
                  </label>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="ilmu, tazkiyah, adab"
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                    <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Jadikan Artikel Unggulan
                    </span>
                  </label>
                </div>
              </div>

              {/* Ringkasan / Excerpt */}
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Ringkasan / Teaser Singkat (Excerpt) *
                </label>
                <textarea
                  rows={2}
                  value={formData.excerpt || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Ringkasan 1-2 kalimat untuk ditampilkan di kartu daftar artikel..."
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-white"
                />
              </div>

              {/* Gambar Sampul */}
              <div className="p-4 bg-stone-50/50 dark:bg-stone-800/40 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
                <label className="text-xs font-bold text-stone-900 dark:text-white block">
                  Gambar Sampul Artikel (Cover Image)
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="space-y-2">
                    <label className="text-[11px] text-stone-500 block">
                      Unggah Berkas Gambar Sampul:
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverFileUpload}
                      className="w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                    />
                    {uploadingCover && (
                      <p className="text-[10px] text-emerald-600">Mengunggah sampul... {coverProgress}%</p>
                    )}

                    <label className="text-[11px] text-stone-500 block pt-2">
                      Atau Masukkan URL Sampul Langsung:
                    </label>
                    <input
                      type="url"
                      value={formData.coverImageUrl || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, coverImageUrl: e.target.value }))}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white"
                    />
                  </div>

                  <div className="aspect-video w-full rounded-xl bg-stone-200 dark:bg-stone-800 overflow-hidden relative border border-stone-300 dark:border-stone-700">
                    {formData.coverImageUrl ? (
                      <img src={formData.coverImageUrl} alt="Sampul" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">
                        Belum ada sampul
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* PENGATURAN AUDIO READING (FITUR DENGAR ARTIKEL) */}
              <div className="p-5 bg-stone-50/70 dark:bg-stone-800/50 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-4">
                {/* 1. PRIMARY TOGGLE: AKTIFKAN AUDIO READING */}
                <div className="flex items-center justify-between p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-xs">
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
                      className="w-5 h-5 mt-0.5 sm:mt-0 accent-emerald-600 rounded cursor-pointer shrink-0"
                    />
                    <label htmlFor="checkbox-audio-enabled" className="cursor-pointer">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                          <Headphones className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Aktifkan Audio Reading pada Artikel Ini</span>
                        </span>
                        {formData.audioConfig?.enabled ? (
                          <span className="px-2 py-0.5 text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full font-bold">
                            Aktif (Tampil di Publik)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-500 rounded-full font-bold">
                            Nonaktif (Tidak Ditampilkan)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                        {formData.audioConfig?.enabled
                          ? 'Tombol Audio Reading akan ditampilkan di halaman publik artikel ini sehingga pembaca dapat menyimak audio.'
                          : 'Tombol Audio Reading tidak akan ditampilkan pada artikel publik ini (fitur audio dinonaktifkan).'}
                      </p>
                    </label>
                  </div>
                </div>

                {/* 2. SUB-OPTIONS (Hanya jika diaktifkan) */}
                {formData.audioConfig?.enabled ? (
                  <div className="space-y-4 pt-1 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 dark:border-stone-700/60 pb-3">
                      <div>
                        <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">
                          Pilih Sumber & Suara Audio Reading
                        </h4>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                          Gunakan suara otomatis peramban (Web Speech) atau berkas audio rekaman asli.
                        </p>
                      </div>

                      {/* Mode Selector Buttons */}
                      <div className="inline-flex p-1 bg-stone-200/80 dark:bg-stone-900 rounded-xl shrink-0">
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
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                            formData.audioConfig?.mode !== 'custom'
                              ? 'bg-white dark:bg-stone-750 text-emerald-700 dark:text-emerald-400 shadow-xs'
                              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
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
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                            formData.audioConfig?.mode === 'custom'
                              ? 'bg-white dark:bg-stone-750 text-emerald-700 dark:text-emerald-400 shadow-xs'
                              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                          }`}
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span>File Audio Rekaman (MP3)</span>
                        </button>
                      </div>
                    </div>

                    {/* MODE 1: WEB SPEECH API */}
                    {formData.audioConfig?.mode !== 'custom' && (
                      <div className="space-y-4 animate-fade-in text-xs">
                        <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/40 rounded-xl flex items-start gap-2.5 text-stone-700 dark:text-stone-300">
                          <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="text-[11px] leading-relaxed">
                            <strong className="text-emerald-800 dark:text-emerald-300">Pilihan Tanpa Biaya Penyimpanan:</strong> Artikel akan dibacakan langsung oleh teknologi sintesis suara peramban pengunjung. Pembaca di situs publik dapat memutar, menjeda, dan mengatur laju pemutaran. <em>(Catatan: Web Speech API tidak memproduksi file audio fisik)</em>.
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Pilihan Suara Peramban */}
                          <div>
                            <label className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 block mb-1">
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
                              className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-900 dark:text-white"
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
                            <p className="text-[10px] text-stone-500 mt-1">
                              Jika opsi otomatis dipilih, sistem akan memprioritaskan suara resmi Bahasa Indonesia (id-ID) pada perangkat pembaca.
                            </p>
                          </div>

                          {/* Kecepatan Bicara Default */}
                          <div>
                            <label className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 block mb-1">
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
                                className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-900 dark:text-white"
                              >
                                <option value="0.75">0,75× (Lambat / Tartil)</option>
                                <option value="0.85">0,85× (Santai & Khusyuk)</option>
                                <option value="1.0">1,00× (Normal / Standar - Rekomendasi)</option>
                                <option value="1.1">1,10× (Sedikit Cepat)</option>
                                <option value="1.25">1,25× (Cepat)</option>
                                <option value="1.5">1,50× (Sangat Cepat)</option>
                              </select>

                              {/* Tombol Uji Suara */}
                              <button
                                type="button"
                                onClick={handlePreviewVoice}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 ${
                                  isPreviewSpeaking
                                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                                    : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                                }`}
                                title="Uji coba pelafalan suara peramban ini"
                              >
                                {isPreviewSpeaking ? (
                                  <>
                                    <Square className="w-3.5 h-3.5 fill-current text-amber-700" />
                                    <span>Hentikan</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3.5 h-3.5 fill-current text-emerald-700" />
                                    <span>Uji Suara</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <p className="text-[10px] text-stone-500 mt-1">
                              Pembaca tetap memiliki kendali penuh untuk menaikkan/menurunkan kecepatan saat mendengarkan artikel.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* MODE 2: CUSTOM AUDIO FILE / RECORDING */}
                    {formData.audioConfig?.mode === 'custom' && (() => {
                      const resolvedAdminAudio = resolveAudioSourceCandidates(formData.audioConfig?.customAudioUrl);
                      return (
                        <div className="space-y-4 animate-fade-in text-xs">
                          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl flex items-start gap-2.5 text-stone-700 dark:text-stone-300">
                            <Music className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-[11px] leading-relaxed">
                              <strong className="text-amber-900 dark:text-amber-300">Mode Rekaman Suara Asli (Google Drive / MP3):</strong> Masukkan tautan berbagi berkas audio dari Google Drive (pastikan akses disetel ke <em>"Siapa saja yang memiliki link"</em>) atau unggah berkas audio (.mp3, .m4a, .wav). Audio akan diputar langsung di halaman artikel.
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            {/* Upload Audio File */}
                            <div className="space-y-2">
                              <label className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 block">
                                Unggah Berkas Audio Rekaman (.mp3, .m4a, .wav):
                              </label>
                              <input
                                type="file"
                                accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac"
                                onChange={handleAudioFileUpload}
                                disabled={uploadingAudio}
                                className="w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer disabled:opacity-50"
                              />
                              {uploadingAudio && (
                                <div className="space-y-1">
                                  <p className="text-[10px] text-emerald-600 font-bold">
                                    Mengunggah berkas audio rekaman... {audioProgress}%
                                  </p>
                                  <div className="w-full bg-stone-200 dark:bg-stone-700 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className="bg-emerald-600 h-full transition-all duration-300"
                                      style={{ width: `${audioProgress}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              <p className="text-[10px] text-stone-400">
                                Maksimal ukuran file 25 MB. Berkas akan disimpan aman di Cloud Storage.
                              </p>
                            </div>

                            {/* Atau Masukkan URL Audio / Google Drive */}
                            <div className="space-y-2">
                              <label className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 block">
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
                                className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white"
                              />
                              <p className="text-[10px] text-stone-400">
                                Mendukung tautan berbagi Google Drive (<code>drive.google.com/file/d/...</code>) maupun tautan audio langsung (.mp3, .m4a, .wav).
                              </p>
                            </div>
                          </div>

                          {/* Audio Player Preview & Google Drive Diagnostic */}
                          {formData.audioConfig?.customAudioUrl && (
                            <div className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                                  {resolvedAdminAudio.isGoogleDrive && !resolvedAdminAudio.fileId ? (
                                    <>
                                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                      <span className="text-rose-600 dark:text-rose-400">Tautan Google Drive Tidak Valid</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
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
                                  className="text-[10px] text-rose-500 hover:text-rose-700 underline cursor-pointer"
                                >
                                  Hapus Berkas Audio
                                </button>
                              </div>

                              {resolvedAdminAudio.isGoogleDrive && !resolvedAdminAudio.fileId ? (
                                <p className="text-[11px] text-rose-600 dark:text-rose-400">
                                  {describeAudioPlaybackError({
                                    isGoogleDrive: true,
                                    isGoogleDriveFolder: resolvedAdminAudio.isGoogleDriveFolder,
                                    fileId: null
                                  })}
                                </p>
                              ) : (
                                <>
                                  <audio
                                    controls
                                    preload="metadata"
                                    src={resolvedAdminAudio.primaryUrl}
                                    className="w-full h-9 rounded-lg"
                                  />
                                  {resolvedAdminAudio.isGoogleDrive && (
                                    <p className="text-[10px] text-stone-500 dark:text-stone-400">
                                      Pastikan berkas di Google Drive memiliki izin akses umum <strong>"Siapa saja yang memiliki link" (Anyone with the link)</strong> agar dapat diputar oleh seluruh pembaca.
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-3.5 bg-stone-100/60 dark:bg-stone-900/40 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 text-center">
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Audio Reading saat ini <strong>dinonaktifkan</strong> untuk artikel ini. Centang opsi di atas jika ingin menampilkan pemutar audio bagi pembaca publik.
                    </p>
                  </div>
                )}
              </div>

              {/* Rich Text Editor for Content */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                  Isi Artikel Utama (Bahasa Indonesia) *
                </label>
                <RichTextEditor
                  value={formData.content || ''}
                  onChange={(html) => setFormData(prev => ({ ...prev, content: html }))}
                  placeholder="Tuliskan naskah ilmu, paragraf, poin-poin, dan sisipkan gambar di sini..."
                  minHeight="350px"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold hover:bg-stone-200 transition cursor-pointer"
              >
                Batal
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSave('draft')}
                  disabled={saving || uploadingCover}
                  className="px-4 py-2 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 hover:bg-amber-200 disabled:opacity-50 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Draf'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSave('published')}
                  disabled={saving || uploadingCover}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <Globe className="w-4 h-4" />
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
