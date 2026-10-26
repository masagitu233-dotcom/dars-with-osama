import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  CheckCircle,
  Trash2,
  Search,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Calendar
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

  useEffect(() => {
    if (initialArticleFilter) {
      setArticleFilter(initialArticleFilter);
    }
  }, [initialArticleFilter]);

  const [commentToDelete, setCommentToDelete] = useState<ArticleComment | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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

  const postMap = new Map<string, BlogPost>();
  posts.forEach(p => postMap.set(p.id, p));

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
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-black/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER & SUMMARY STATS */}
      <div className="nb-card bg-white dark:bg-[#0B3026] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-[#06251D] border-2 border-[#171717] text-[#D9AC45] flex items-center justify-center shadow-[3px_3px_0px_#171717]">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold font-serif-brand text-[#171717] dark:text-[#F8F3E8]">
                Moderasi Komentar Artikel ({comments.length})
              </h2>
              <p className="text-xs text-[#171717]/75 dark:text-[#F8F3E8]/75">
                Tinjau, setujui, tolak, atau bersihkan komentar publik dari pembaca artikel ilmiah Dars with Osama.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadAllComments}
            disabled={loading}
            className="nb-btn nb-btn-secondary px-3.5 py-2 text-xs self-start sm:self-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#06251D] dark:text-[#D9AC45]' : ''}`} />
            <span>Segarkan Data</span>
          </button>
        </div>

        {/* STATUS COUNTER CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div
            onClick={() => setStatusFilter('all')}
            className={`p-3.5 rounded-md border-2 border-[#171717] transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#06251D] text-[#D9AC45] shadow-[3px_3px_0px_#171717]'
                : 'bg-[#F8F3E8] dark:bg-[#06251D]/60 text-[#171717] dark:text-[#F8F3E8]'
            }`}
          >
            <span className="text-[10px] uppercase font-extrabold tracking-wider">Total Masuk</span>
            <p className="text-xl font-extrabold mt-1">{comments.length}</p>
          </div>

          <div
            onClick={() => setStatusFilter('pending')}
            className={`p-3.5 rounded-md border-2 border-[#171717] transition cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-[#D9AC45] text-[#171717] shadow-[3px_3px_0px_#171717]'
                : 'bg-[#F8F3E8] dark:bg-[#06251D]/60 text-[#171717] dark:text-[#F8F3E8]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-extrabold tracking-wider">
                Menunggu
              </span>
              {pendingCount > 0 && (
                <span className="w-2.5 h-2.5 rounded-sm bg-[#F04438] border border-[#171717] animate-pulse" />
              )}
            </div>
            <p className="text-xl font-extrabold mt-1">{pendingCount}</p>
          </div>

          <div
            onClick={() => setStatusFilter('approved')}
            className={`p-3.5 rounded-md border-2 border-[#171717] transition cursor-pointer ${
              statusFilter === 'approved'
                ? 'bg-[#06251D] text-[#D9AC45] shadow-[3px_3px_0px_#171717]'
                : 'bg-[#F8F3E8] dark:bg-[#06251D]/60 text-[#171717] dark:text-[#F8F3E8]'
            }`}
          >
            <span className="text-[10px] uppercase font-extrabold tracking-wider">
              Disetujui Publik
            </span>
            <p className="text-xl font-extrabold mt-1">{approvedCount}</p>
          </div>

          <div
            onClick={() => setStatusFilter('rejected')}
            className={`p-3.5 rounded-md border-2 border-[#171717] transition cursor-pointer ${
              statusFilter === 'rejected'
                ? 'bg-[#F04438] text-white shadow-[3px_3px_0px_#171717]'
                : 'bg-[#F8F3E8] dark:bg-[#06251D]/60 text-[#171717] dark:text-[#F8F3E8]'
            }`}
          >
            <span className="text-[10px] uppercase font-extrabold tracking-wider">
              Ditolak
            </span>
            <p className="text-xl font-extrabold mt-1">{rejectedCount}</p>
          </div>
        </div>

        {/* SEARCH & FILTER CONTROLS */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-3 border-t-2 border-[#171717]/20 dark:border-[#D9AC45]/30">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#171717]/60 dark:text-[#F8F3E8]/60">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari komentar berdasarkan nama, isi, atau judul artikel..."
              className="nb-input w-full pl-10 pr-4 py-2 text-xs sm:text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={articleFilter}
              onChange={(e) => setArticleFilter(e.target.value)}
              className="nb-input px-3 py-2 text-xs font-bold max-w-[240px] truncate"
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
      <div className="nb-card bg-white dark:bg-[#0B3026] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#06251D] dark:border-[#D9AC45] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#171717]/75 dark:text-[#F8F3E8]/75 font-bold">Memuat data komentar...</p>
          </div>
        ) : filteredComments.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-2">
            <MessageSquare className="w-10 h-10 text-[#D9AC45] mx-auto" />
            <h4 className="text-sm font-extrabold text-[#171717] dark:text-[#F8F3E8] font-sans">
              Tidak Ada Komentar Ditemukan
            </h4>
            <p className="text-xs text-[#171717]/70 dark:text-[#F8F3E8]/70 max-w-sm mx-auto">
              Tidak ada data komentar yang cocok dengan filter atau kata kunci pencarian Anda.
            </p>
          </div>
        ) : (
          <div className="divide-y-2 divide-[#171717]/15 dark:divide-[#D9AC45]/25">
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
                  className="p-5 sm:p-6 space-y-3 hover:bg-[#F8F3E8]/60 dark:hover:bg-[#06251D]/50 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-[#06251D] text-[#D9AC45] border-2 border-[#171717] font-extrabold text-xs flex items-center justify-center uppercase shrink-0">
                        {comment.authorName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-[#171717] dark:text-[#F8F3E8] font-sans">
                            {comment.authorName}
                          </h4>
                          <span
                            className={`nb-badge ${
                              comment.status === 'approved'
                                ? 'bg-[#06251D] text-[#D9AC45]'
                                : comment.status === 'rejected'
                                ? 'bg-[#F04438] text-white'
                                : 'bg-[#D9AC45] text-[#171717]'
                            }`}
                          >
                            {comment.status === 'approved'
                              ? 'Disetujui'
                              : comment.status === 'rejected'
                              ? 'Ditolak'
                              : 'Menunggu Moderasi'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#171717]/70 dark:text-[#F8F3E8]/70 mt-0.5 font-medium">
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
                          className="nb-btn nb-btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
                          title="Setujui komentar agar tampil secara publik"
                        >
                          <Check className="w-3.5 h-3.5 text-[#D9AC45]" />
                          <span>Setujui</span>
                        </button>
                      )}

                      {comment.status !== 'rejected' && (
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => handleModerate(comment, 'rejected')}
                          className="nb-btn nb-btn-gold px-3 py-1.5 text-xs disabled:opacity-50"
                          title="Tolak komentar (tidak tampil di publik)"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Tolak</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setCommentToDelete(comment)}
                        className="nb-btn nb-btn-danger p-1.5"
                        title="Hapus komentar permanen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Comment Body */}
                  <div className="bg-[#F8F3E8] dark:bg-[#06251D] rounded-md p-3.5 border-2 border-[#171717] dark:border-[#D9AC45]/50 text-xs sm:text-sm text-[#171717] dark:text-[#F8F3E8] leading-relaxed whitespace-pre-line font-sans">
                    {comment.content}
                  </div>

                  {/* Linked Article Metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                    <div className="flex items-center gap-2 text-[#171717]/75 dark:text-[#F8F3E8]/75 truncate">
                      <span className="font-extrabold text-[#171717] dark:text-[#F8F3E8]">Artikel:</span>
                      {post ? (
                        <span className="truncate max-w-md font-bold text-[#06251D] dark:text-[#D9AC45]">
                          {post.title}
                        </span>
                      ) : (
                        <span className="font-mono text-[11px]">{comment.articleId}</span>
                      )}
                    </div>

                    {post && onNavigateToPost && (
                      <button
                        type="button"
                        onClick={() => onNavigateToPost(post)}
                        className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#06251D] dark:text-[#D9AC45] hover:underline cursor-pointer"
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
