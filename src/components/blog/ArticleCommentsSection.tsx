import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  User,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Check,
  X,
  Sparkles,
  Info
} from 'lucide-react';
import { ArticleComment } from '../../types';
import {
  createArticleComment,
  getApprovedArticleComments,
  getAllArticleCommentsForAdmin,
  moderateArticleComment,
  deleteArticleComment
} from '../../firebase/services';
import { useAuth } from '../../context/AuthContext';

interface ArticleCommentsSectionProps {
  articleId: string;
  articleTitle: string;
}

export const ArticleCommentsSection: React.FC<ArticleCommentsSectionProps> = ({
  articleId,
  articleTitle
}) => {
  const { user, userProfile, isAdmin, showToast } = useAuth();

  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [authorName, setAuthorName] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [recentlySubmitted, setRecentlySubmitted] = useState<ArticleComment | null>(null);
  const [lastSubmitTime, setLastSubmitTime] = useState<number>(0);
  const [showAdminAll, setShowAdminAll] = useState<boolean>(false);

  // Autofill name from authenticated user if available
  useEffect(() => {
    if (!authorName && (userProfile?.displayName || user?.displayName)) {
      setAuthorName(userProfile?.displayName || user?.displayName || '');
    }
  }, [userProfile, user]);

  const loadComments = async () => {
    setLoading(true);
    try {
      if (isAdmin && showAdminAll) {
        const adminList = await getAllArticleCommentsForAdmin(articleId);
        setComments(adminList);
      } else {
        const approvedList = await getApprovedArticleComments(articleId);
        setComments(approvedList);
      }
    } catch (err) {
      console.warn('Failed to load article comments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [articleId, isAdmin, showAdminAll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedName = authorName.trim();
    const trimmedContent = content.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMsg('Nama atau kunyah harus minimal 2 karakter.');
      return;
    }
    if (trimmedName.length > 100) {
      setErrorMsg('Nama tidak boleh melebihi 100 karakter.');
      return;
    }

    if (!trimmedContent || trimmedContent.length < 5) {
      setErrorMsg('Isi komentar harus minimal 5 karakter.');
      return;
    }
    if (trimmedContent.length > 1000) {
      setErrorMsg('Isi komentar tidak boleh melebihi 1000 karakter.');
      return;
    }

    // Rate-limiting / Anti-Spam protection: 10 seconds between submissions
    const now = Date.now();
    if (now - lastSubmitTime < 10000) {
      setErrorMsg('Harap tunggu beberapa detik sebelum mengirim komentar kembali.');
      return;
    }

    setSubmitting(true);

    try {
      const commentId = await createArticleComment({
        articleId,
        authorName: trimmedName,
        content: trimmedContent,
        userId: user?.uid
      });

      const tempComment: ArticleComment = {
        id: commentId,
        articleId,
        authorName: trimmedName,
        content: trimmedContent,
        status: 'pending',
        createdAt: new Date().toISOString(),
        userId: user?.uid
      };

      setRecentlySubmitted(tempComment);
      setContent('');
      setLastSubmitTime(now);
      setSuccessMsg(
        'Alhamdulillah, komentar Anda telah berhasil dikirim! Komentar akan ditinjau oleh moderator sebelum tampil untuk publik.'
      );
      if (showToast) {
        showToast('Komentar berhasil dikirim untuk moderasi.');
      }

      // If user is admin and viewing all comments, reload list
      if (isAdmin && showAdminAll) {
        await loadComments();
      }
    } catch (err: any) {
      console.error('Error submitting comment:', err);
      setErrorMsg(err?.message || 'Gagal mengirim komentar. Silakan periksa koneksi lalu coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleModerate = async (commentId: string, newStatus: 'approved' | 'rejected') => {
    if (!isAdmin) return;
    try {
      await moderateArticleComment(commentId, newStatus, userProfile?.displayName || user?.email || 'Admin');
      if (showToast) {
        showToast(`Komentar telah di-${newStatus === 'approved' ? 'setujui' : 'tolak'}.`);
      }
      await loadComments();
    } catch (err: any) {
      alert(`Gagal memoderasi komentar: ${err.message}`);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!isAdmin) return;
    if (!window.confirm('Yakin ingin menghapus komentar ini secara permanen?')) return;
    try {
      await deleteArticleComment(commentId);
      if (showToast) {
        showToast('Komentar telah dihapus.');
      }
      await loadComments();
    } catch (err: any) {
      alert(`Gagal menghapus komentar: ${err.message}`);
    }
  };

  return (
    <section
      data-testid="article-comments-section"
      className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-5 sm:p-8 space-y-8 shadow-xs"
    >
      {/* HEADER WITH TITLE & ADMIN TOGGLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold font-serif-brand text-stone-900 dark:text-white">
              Komentar & Diskusi Pembaca ({comments.length})
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-sans">
              Ruang faedah ilmiah, tanggapan, dan catatan pembahasan artikel ini.
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setShowAdminAll(!showAdminAll)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer active:scale-95 ${
                showAdminAll
                  ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-750'
              }`}
            >
              {showAdminAll ? 'Mode Admin: Semua Komentar' : 'Mode Publik: Hanya Disetujui'}
            </button>
          </div>
        )}
      </div>

      {/* RECENTLY SUBMITTED PREVIEW BANNER (IF ANY) */}
      {recentlySubmitted && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl space-y-2 animate-fade-in text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-300">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Komentar Anda Sedang Menunggu Peninjauan Moderator</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-[10px] font-bold uppercase tracking-wider">
              Pending
            </span>
          </div>
          <p className="text-stone-700 dark:text-stone-300 italic pl-6 border-l-2 border-amber-400">
            "{recentlySubmitted.content}"
          </p>
          <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 pl-6">
            Oleh: <strong>{recentlySubmitted.authorName}</strong> • Komentar akan ditampilkan untuk umum setelah disetujui.
          </p>
        </div>
      )}

      {/* COMMENTS LIST */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-10 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Memuat komentar pembaca...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="py-10 px-4 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl space-y-2 bg-stone-50/50 dark:bg-stone-950/40">
            <MessageSquare className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto" />
            <h4 className="text-sm font-bold text-stone-700 dark:text-stone-300 font-sans">
              Belum Ada Komentar Publik
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
              Jadilah pembaca pertama yang memberikan tanggapan atau faedah ilmiah berharga melalui formulir di bawah ini.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {comments.map((comment) => {
              const dateStr = new Date(comment.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              });

              return (
                <div
                  key={comment.id}
                  className="bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 space-y-2.5 transition hover:border-emerald-500/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-700 dark:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center uppercase shrink-0 shadow-xs">
                        {comment.authorName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white font-sans">
                            {comment.authorName}
                          </h5>
                          {isAdmin && (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                comment.status === 'approved'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  : comment.status === 'rejected'
                                  ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800'
                                  : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              }`}
                            >
                              {comment.status}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-stone-500 dark:text-stone-400">
                          {dateStr}
                        </span>
                      </div>
                    </div>

                    {/* Admin Moderation Actions */}
                    {isAdmin && (
                      <div className="flex items-center gap-1 self-end sm:self-center">
                        {comment.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleModerate(comment.id, 'approved')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer active:scale-95"
                            title="Setujui komentar agar tampil ke publik"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Setujui</span>
                          </button>
                        )}
                        {comment.status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => handleModerate(comment.id, 'rejected')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer active:scale-95"
                            title="Tolak komentar"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(comment.id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
                          title="Hapus komentar permanen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed pl-10 whitespace-pre-line font-sans">
                    {comment.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD COMMENT FORM */}
      <div className="pt-6 border-t border-stone-200 dark:border-stone-800 space-y-4">
        <div className="space-y-1">
          <h4 className="text-base sm:text-lg font-bold font-serif-brand text-stone-900 dark:text-white flex items-center gap-2">
            <span>Tinggalkan Komentar Pembaca</span>
            <Sparkles className="w-4 h-4 text-[#C9A34E]" />
          </h4>
          <p className="text-xs text-stone-500 dark:text-stone-400 font-sans">
            Sampaikan tanggapan, faedah ilmiah, atau pertanyaan terkait artikel dengan bahasa yang santun dan adab islami.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/80 border border-red-300 dark:border-red-800 rounded-xl text-red-800 dark:text-red-200 text-xs flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              Nama Lengkap / Kunyah <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                maxLength={100}
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Contoh: Abu Maryam atau Fulanah"
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition min-h-[44px]"
              />
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              Nama yang akan ditampilkan pada komentar artikel ini (2 - 100 karakter).
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Isi Komentar / Tanggapan <span className="text-red-500">*</span>
              </label>
              <span className={`text-[11px] ${content.length > 950 ? 'text-amber-600 font-bold' : 'text-stone-400'}`}>
                {content.length} / 1000 karakter
              </span>
            </div>
            <textarea
              required
              rows={4}
              maxLength={1000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tuliskan tanggapan, faedah ilmiah, atau pertanyaan yang berkaitan dengan artikel ini..."
              className="w-full p-3.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition resize-y min-h-[110px]"
            />
          </div>

          {/* Moderation Policy Notice */}
          <div className="p-3 bg-stone-100 dark:bg-stone-800/60 rounded-xl text-[11px] text-stone-600 dark:text-stone-400 flex items-start gap-2 border border-stone-200 dark:border-stone-750">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Komentar akan ditinjau oleh tim moderator sebelum dipublikasikan demi menjaga adab, kesopanan, dan fokus pada pembahasan ilmiah.
            </span>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Mengirimkan...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim Komentar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
