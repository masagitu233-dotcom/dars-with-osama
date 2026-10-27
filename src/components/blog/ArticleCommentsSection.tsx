import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  User,
  Clock,
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
      className="nb-card p-5 sm:p-8 space-y-8"
    >
      {/* HEADER WITH TITLE & ADMIN TOGGLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b-2 border-slate-200 dark:border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-[#123D32] dark:bg-[#16263D] border-2 border-[#123D32] dark:border-[#D6AD52] text-[#D6AD52] flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold font-serif text-charcoal dark:text-offwhite">
              Komentar & Diskusi Pembaca ({comments.length})
            </h3>
            <p className="text-xs text-slate-gray dark:text-blue-gray font-sans">
              Ruang faedah ilmiah, tanggapan, dan catatan pembahasan artikel ini.
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setShowAdminAll(!showAdminAll)}
              className={`px-3 py-1.5 rounded-md text-xs font-extrabold border-2 transition cursor-pointer ${
                showAdminAll
                  ? 'bg-[#D6AD52] text-charcoal border-charcoal'
                  : 'bg-[#FAF7F0] dark:bg-[#16263D] text-charcoal dark:text-offwhite border-charcoal dark:border-[#D6AD52]'
              }`}
            >
              {showAdminAll ? 'Mode Admin: Semua Komentar' : 'Mode Publik: Hanya Disetujui'}
            </button>
          </div>
        )}
      </div>

      {/* RECENTLY SUBMITTED PREVIEW BANNER (IF ANY) */}
      {recentlySubmitted && (
        <div className="p-4 bg-[#D6AD52]/20 border-2 border-charcoal dark:border-[#D6AD52] rounded-md space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-charcoal dark:text-[#D6AD52]">
              <Clock className="w-4 h-4 text-[#123D32] dark:text-[#D6AD52]" />
              <span>Komentar Anda Sedang Menunggu Peninjauan Moderator</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-[#D6AD52] text-charcoal border border-charcoal text-[10px] font-extrabold uppercase tracking-wider">
              Pending
            </span>
          </div>
          <p className="text-charcoal dark:text-offwhite italic pl-4 border-l-2 border-charcoal dark:border-[#D6AD52]">
            "{recentlySubmitted.content}"
          </p>
          <p className="text-[11px] text-slate-gray dark:text-blue-gray pl-4">
            Oleh: <strong>{recentlySubmitted.authorName}</strong> • Komentar akan ditampilkan untuk umum setelah disetujui.
          </p>
        </div>
      )}

      {/* COMMENTS LIST */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-10 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#123D32] dark:border-[#D6AD52] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-gray dark:text-blue-gray font-bold">Memuat komentar pembaca...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="py-10 px-4 text-center border-2 border-dashed border-slate-300 dark:border-[#34465D] rounded-md space-y-2 bg-[#EFE5D2]/60 dark:bg-[#16263D]/60">
            <MessageSquare className="w-8 h-8 text-[#123D32] dark:text-[#D6AD52] mx-auto" />
            <h4 className="text-sm font-bold font-serif text-charcoal dark:text-offwhite">
              Belum Ada Komentar Publik
            </h4>
            <p className="text-xs text-slate-gray dark:text-blue-gray max-w-sm mx-auto">
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
                  className="bg-[#FAF7F0] dark:bg-[#214743] border-2 border-[#171717] dark:border-[#B8E8D8] rounded-md p-4 sm:p-5 space-y-2.5 shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#071918]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-[#123D32] text-[#F2D98A] border-2 border-[#171717] dark:border-[#B8E8D8] font-bold text-xs flex items-center justify-center uppercase shrink-0">
                        {comment.authorName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-xs sm:text-sm text-[#171717] dark:text-[#F0F7F5] font-sans">
                            {comment.authorName}
                          </h5>
                          {isAdmin && (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border ${
                                comment.status === 'approved'
                                  ? 'bg-[#123D32] text-[#F2D98A] border-[#171717] dark:border-[#B8E8D8]'
                                  : comment.status === 'rejected'
                                  ? 'bg-[#F04438] text-white border-[#171717] dark:border-[#B8E8D8]'
                                  : 'bg-[#F2D98A] text-[#102C2B] border-[#171717] dark:border-[#B8E8D8]'
                              }`}
                            >
                              {comment.status}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-[#525856] dark:text-[#B9C9C5]">
                          {dateStr}
                        </span>
                      </div>
                    </div>

                    {/* Admin Moderation Actions */}
                    {isAdmin && (
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        {comment.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleModerate(comment.id, 'approved')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#123D32] text-[#F2D98A] border border-[#171717] dark:border-[#B8E8D8] rounded text-xs font-bold cursor-pointer"
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#F2D98A] text-[#102C2B] border border-[#171717] dark:border-[#B8E8D8] rounded text-xs font-bold cursor-pointer"
                            title="Tolak komentar"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(comment.id)}
                          className="p-1.5 bg-[#F04438] text-white border border-[#171717] dark:border-[#B8E8D8] rounded transition cursor-pointer"
                          title="Hapus komentar permanen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-[#171717] dark:text-[#F0F7F5] leading-relaxed pl-0 sm:pl-10 pt-1 sm:pt-0 whitespace-pre-line font-sans">
                    {comment.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD COMMENT FORM */}
      <div className="pt-6 border-t-2 border-[#171717] dark:border-[#B8E8D8] space-y-4">
        <div className="space-y-1">
          <h4 className="text-base sm:text-lg font-bold font-serif text-[#171717] dark:text-[#F0F7F5] flex items-center gap-2">
            <span>Tinggalkan Komentar Pembaca</span>
            <Sparkles className="w-4 h-4 text-[#D6AD52] dark:text-[#F2D98A]" />
          </h4>
          <p className="text-xs text-[#525856] dark:text-[#B9C9C5] font-sans">
            Sampaikan tanggapan, faedah ilmiah, atau pertanyaan terkait artikel dengan bahasa yang santun dan adab islami.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-[#F04438]/15 border-2 border-[#F04438] rounded-md text-[#171717] dark:text-[#F0F7F5] text-xs font-bold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#F04438]" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-[#123D32] dark:bg-[#214743] border-2 border-[#171717] dark:border-[#B8E8D8] rounded-md text-[#F0F7F5] text-xs font-bold flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#F2D98A]" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#171717] dark:text-[#F0F7F5] mb-1.5">
              Nama Lengkap / Kunyah <span className="text-[#F04438]">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#525856] dark:text-[#B8E8D8]">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                maxLength={100}
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Contoh: Abu Maryam atau Fulanah"
                className="nb-input pl-10 pr-4 py-2.5 min-h-[44px]"
              />
            </div>
            <p className="text-[11px] text-[#525856] dark:text-[#B9C9C5] mt-1">
              Nama yang akan ditampilkan pada komentar artikel ini (2 - 100 karakter).
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#171717] dark:text-[#F0F7F5]">
                Isi Komentar / Tanggapan <span className="text-[#F04438]">*</span>
              </label>
              <span className={`text-[11px] font-bold ${content.length > 950 ? 'text-[#F04438]' : 'text-[#525856] dark:text-[#B9C9C5]'}`}>
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
              className="nb-input p-3.5 resize-y min-h-[110px]"
            />
          </div>

          {/* Moderation Policy Notice */}
          <div className="p-3 bg-[#FAF7F0] dark:bg-[#214743] rounded-md text-[11px] text-[#171717] dark:text-[#F0F7F5] flex items-start gap-2 border-2 border-[#171717] dark:border-[#B8E8D8]">
            <Info className="w-4 h-4 text-[#123D32] dark:text-[#F2D98A] shrink-0 mt-0.5" />
            <span>
              Komentar akan ditinjau oleh tim moderator sebelum dipublikasikan demi menjaga adab, kesopanan, dan fokus pada pembahasan ilmiah.
            </span>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="nb-btn nb-btn-gold px-6 py-3 text-xs sm:text-sm min-h-[44px]"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-charcoal/30 border-t-charcoal rounded-full animate-spin" />
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
