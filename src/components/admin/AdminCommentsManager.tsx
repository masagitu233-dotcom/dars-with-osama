import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  CheckCircle,
  XCircle,
  Trash2,
  Search,
  Filter,
  Clock,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Eye,
  User,
  Calendar,
  Sparkles
} from 'lucide-react';
import { ArticleComment, BlogPost } from '../../types';
import {
  getAllArticleCommentsForAdmin,
  moderateArticleComment,
  deleteArticleComment
} from '../../firebase/services';
import { useAuth } from '../../context/AuthContext';
import { ConfirmModal } from '../common/ConfirmModal';

interface AdminCommentsManagerProps {
  posts: BlogPost[];
  onNavigateToPost?: (post: BlogPost) => void;
  initialArticleFilter?: string;
}

export const AdminCommentsManager: React.FC<AdminCommentsManagerProps> = ({
  posts,
  onNavigateToPost,
  initialArticleFilter
}) => {
  const { userProfile, user, showToast } = useAuth();

  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [articleFilter, setArticleFilter] = useState<string>(initialArticleFilter || 'all');
  const [selectedComment, setSelectedComment] = useState<ArticleComment | null>(null);

  useEffect(() => {
    if (initialArticleFilter) {
      setArticleFilter(initialArticleFilter);
    }
  }, [initialArticleFilter]);

  // Deletion state
  const [commentToDelete, setCommentToDelete] = useState<ArticleComment | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Feedback state
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAllComments = async () => {
    setLoading(true);
    try {
      const list = await getAllArticleCommentsForAdmin();
      setComments(list);
    } catch (err: any) {
      console.warn('Error loading comments for admin:', err);
      setFeedback({
        type: 'error',
        text: 'Gagal memuat daftar komentar: ' + (err.message || String(err))
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllComments();
  }, []);

  const adminName = userProfile?.displayName || user?.email || 'Admin';

  const handleModerate = async (comment: ArticleComment, newStatus: 'approved' | 'rejected') => {
    setActionLoadingId(comment.id);
    setFeedback(null);
    try {
      await moderateArticleComment(comment.id, newStatus, adminName);
      setComments(prev =>
        prev.map(c => (c.id === comment.id ? { ...c, status: newStatus, moderatedAt: new Date().toISOString(), moderatedBy: adminName } : c))
      );
      const actionText = newStatus === 'approved' ? 'disetujui dan tampil publik' : 'ditolak';
      setFeedback({
        type: 'success',
        text: `Komentar dari "${comment.authorName}" berhasil ${actionText}.`
      });
      if (showToast) {
        showToast(`Komentar telah di-${newStatus === 'approved' ? 'setujui' : 'tolak'}.`);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: 'Gagal memoderasi komentar: ' + (err.message || String(err))
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!commentToDelete) return;
    setIsDeleting(true);
    setFeedback(null);
    try {
      await deleteArticleComment(commentToDelete.id);
      setComments(prev => prev.filter(c => c.id !== commentToDelete.id));
      setFeedback({
        type: 'success',
        text: `Komentar dari "${commentToDelete.authorName}" berhasil dihapus secara permanen.`
      });
      if (showToast) {
        showToast('Komentar berhasil dihapus.');
      }
      setCommentToDelete(null);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: 'Gagal menghapus komentar: ' + (err.message || String(err))
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to map articleId to title
  const postMap = new Map<string, BlogPost>();
  posts.forEach(p => postMap.set(p.id, p));

  // Filtered comments
  const filteredComments = comments.filter(c => {
    const postTitle = postMap.get(c.articleId)?.title || '';
    const matchesSearch =
      !searchQuery ||
      c.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      postTitle.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesArticle = articleFilter === 'all' || c.articleId === articleFilter;

    return matchesSearch && matchesStatus && matchesArticle;
  });

  const pendingCount = comments.filter(c => c.status === 'pending').length;
  const approvedCount = comments.filter(c => c.status === 'approved').length;
  const rejectedCount = comments.filter(c => c.status === 'rejected').length;

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* FEEDBACK STATUS BANNER */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center justify-between gap-3 animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
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

      {/* HEADER & SUMMARY STATS */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-400 flex items-center justify-center shadow-inner">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif-brand text-stone-900 dark:text-white">
                Moderasi Komentar Artikel ({comments.length})
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Tinjau, setujui, tolak, atau bersihkan komentar publik dari pembaca artikel ilmiah Dars with Osama.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadAllComments}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer active:scale-95 self-start sm:self-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Segarkan Data</span>
          </button>
        </div>

        {/* STATUS COUNTER CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div
            onClick={() => setStatusFilter('all')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-stone-100 dark:bg-stone-800 border-stone-400 dark:border-stone-600 shadow-xs'
                : 'bg-stone-50/50 dark:bg-stone-950/40 border-stone-200 dark:border-stone-800 hover:border-stone-300'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Total Masuk</span>
            <p className="text-xl font-bold text-stone-900 dark:text-white mt-1">{comments.length}</p>
          </div>

          <div
            onClick={() => setStatusFilter('pending')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-400 dark:border-amber-700 shadow-xs'
                : 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-800/40 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 tracking-wider">
                Menunggu
              </span>
              {pendingCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </div>
            <p className="text-xl font-bold text-amber-900 dark:text-amber-300 mt-1">{pendingCount}</p>
          </div>

          <div
            onClick={() => setStatusFilter('approved')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer ${
              statusFilter === 'approved'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-700 shadow-xs'
                : 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-800/40 hover:border-emerald-300'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 tracking-wider">
              Disetujui Publik
            </span>
            <p className="text-xl font-bold text-emerald-900 dark:text-emerald-300 mt-1">{approvedCount}</p>
          </div>

          <div
            onClick={() => setStatusFilter('rejected')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer ${
              statusFilter === 'rejected'
                ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 dark:border-rose-700 shadow-xs'
                : 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200/70 dark:border-rose-800/40 hover:border-rose-300'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 tracking-wider">
              Ditolak
            </span>
            <p className="text-xl font-bold text-rose-900 dark:text-rose-300 mt-1">{rejectedCount}</p>
          </div>
        </div>

        {/* SEARCH & FILTER CONTROLS */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-3 border-t border-stone-200 dark:border-stone-800">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari komentar berdasarkan nama, isi, atau judul artikel..."
              className="w-full pl-10 pr-4 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Filter by Article */}
            <select
              value={articleFilter}
              onChange={(e) => setArticleFilter(e.target.value)}
              className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-medium text-stone-800 dark:text-stone-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer max-w-[220px] truncate"
            >
              <option value="all">Semua Artikel ({posts.length})</option>
              {posts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* COMMENTS LIST TABLE / CARDS */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Memuat data komentar...</p>
          </div>
        ) : filteredComments.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-2">
            <MessageSquare className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto" />
            <h4 className="text-sm font-bold text-stone-700 dark:text-stone-300 font-sans">
              Tidak Ada Komentar Ditemukan
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
              Tidak ada data komentar yang cocok dengan filter atau kata kunci pencarian Anda.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-200 dark:divide-stone-800">
            {filteredComments.map((comment) => {
              const post = postMap.get(comment.articleId);
              const dateStr = new Date(comment.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              const isActing = actionLoadingId === comment.id;

              return (
                <div
                  key={comment.id}
                  className="p-5 sm:p-6 space-y-3 hover:bg-stone-50/70 dark:hover:bg-stone-850/50 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-700 dark:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center uppercase shrink-0 shadow-xs">
                        {comment.authorName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-stone-900 dark:text-white font-sans">
                            {comment.authorName}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              comment.status === 'approved'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : comment.status === 'rejected'
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            }`}
                          >
                            {comment.status === 'approved'
                              ? 'Disetujui'
                              : comment.status === 'rejected'
                              ? 'Ditolak'
                              : 'Menunggu Moderasi'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{dateStr}</span>
                          {comment.moderatedBy && (
                            <>
                              <span>•</span>
                              <span>Ditinjau oleh {comment.moderatedBy}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {comment.status !== 'approved' && (
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => handleModerate(comment, 'approved')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer active:scale-95 disabled:opacity-50"
                          title="Setujui komentar agar tampil secara publik"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Setujui</span>
                        </button>
                      )}

                      {comment.status !== 'rejected' && (
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => handleModerate(comment, 'rejected')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer active:scale-95 disabled:opacity-50"
                          title="Tolak komentar (tidak tampil di publik)"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Tolak</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setCommentToDelete(comment)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-750 transition cursor-pointer"
                        title="Hapus komentar permanen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Comment Body */}
                  <div className="bg-stone-50/70 dark:bg-stone-800/40 rounded-xl p-3.5 border border-stone-200/80 dark:border-stone-800 text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-line font-sans">
                    {comment.content}
                  </div>

                  {/* Linked Article Metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                    <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 truncate">
                      <span className="font-semibold text-stone-700 dark:text-stone-300">Artikel:</span>
                      {post ? (
                        <span className="truncate max-w-md font-medium text-emerald-700 dark:text-emerald-400">
                          {post.title}
                        </span>
                      ) : (
                        <span className="font-mono text-[11px] text-stone-400">{comment.articleId}</span>
                      )}
                    </div>

                    {post && onNavigateToPost && (
                      <button
                        type="button"
                        onClick={() => onNavigateToPost(post)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        <span>Lihat Artikel</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={Boolean(commentToDelete)}
        onClose={() => setCommentToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Komentar Pembaca"
        message={`Apakah Anda yakin ingin menghapus komentar dari "${commentToDelete?.authorName}" secara permanen? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus Komentar"
        isDangerous={true}
        loading={isDeleting}
      />
    </div>
  );
};
