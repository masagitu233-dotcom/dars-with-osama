import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Lock,
  BookOpen,
  CheckCircle2,
  Clock,
  MessageCircle,
  Sparkles,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  Share2,
  Image as ImageIcon,
  Copy,
  Check
} from 'lucide-react';
import { Consultation } from '../../types';
import { createConsultation, getStudentConsultations } from '../../firebase/services';
import { getWhatsAppConsultationUrl } from '../../config/whatsappConfig';
import { autoWrapArabicText } from '../../utils/arabicFontHelper';
import { ShareQAModal } from './ShareQAModal';
import { useAuth } from '../../context/AuthContext';

interface StudentConsultationViewProps {
  onNavigateToPublicQA?: () => void;
}

export const StudentConsultationView: React.FC<StudentConsultationViewProps> = ({
  onNavigateToPublicQA
}) => {
  const { user, userProfile, loading: authLoading, openAuthModal, showToast } = useAuth();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [category, setCategory] = useState<'learning' | 'private'>('learning');

  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [shareItem, setShareItem] = useState<Consultation | null>(null);
  const [shareTab, setShareTab] = useState<'share' | 'card'>('share');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyDirectLink = async (item: Consultation) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://darswithosama.com';
    const directUrl = `${origin}?view=public-qa&qaId=${item.id}`;

    try {
      await navigator.clipboard.writeText(directUrl);
      setCopiedId(item.id);
      showToast('Tautan langsung jawaban berhasil disalin!');
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      showToast('Gagal menyalin tautan.');
    }
  };

  const loadMyConsultations = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await getStudentConsultations(user.uid);
      setConsultations(list);
    } catch (err) {
      console.warn('Error loading consultations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyConsultations();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('login');
      return;
    }

    if (!title.trim() || !content.trim()) {
      setErrorMsg('Judul dan isi pertanyaan tidak boleh kosong.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await createConsultation({
        title: title.trim(),
        content: content.trim(),
        category
      });

      setTitle('');
      setContent('');
      setCategory('learning');
      setSuccessMsg('Pertanyaan konsultasi Anda telah berhasil dikirim! Ustaz/Admin akan memberikan balasan segera.');
      await loadMyConsultations();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal mengirim pertanyaan. Silakan coba kembali.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-2.5 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-fade-in font-sans">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-lg bg-[#123D32] dark:bg-[#16263D] text-[#FAF7F0] dark:text-[#F1F4F8] p-6 sm:p-10 border-2 border-[#292D2B] dark:border-[#D6AD52] shadow-[6px_6px_0px_#292D2B] dark:shadow-[6px_6px_0px_#000000]">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#D6AD52] border-2 border-[#292D2B] text-[#292D2B] text-xs font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#292D2B]" />
            <span>Ruang Bimbingan & Konsultasi Syar'i</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold font-serif text-white leading-tight">
            Konsultasi & Tanya Jawab Pembelajaran
          </h1>

          <p className="text-xs sm:text-sm text-[#FAF7F0]/85 dark:text-[#F1F4F8]/85 leading-relaxed font-sans">
            Ajukan pertanyaan seputar materi pelajaran, pemahaman kitab, maupun pertanyaan pribadi secara tertutup dan aman bersama Ustaz & Pembimbing.
          </p>

          {onNavigateToPublicQA && (
            <div className="pt-2">
              <button
                onClick={onNavigateToPublicQA}
                className="nb-btn nb-btn-gold px-4 py-2.5 text-xs"
              >
                <BookOpen className="w-4 h-4" />
                <span>Lihat Arsip Tanya Jawab Publik (Q&A)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {authLoading ? (
        <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
          <div className="w-10 h-10 border-3 border-[#123D32] dark:border-[#D6AD52] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[#292D2B] dark:text-[#F1F4F8] font-bold">Memeriksa status akun siswa...</p>
        </div>
      ) : !user ? (
        /* NON-LOGGED IN STATE NOTICE */
        <div className="p-8 text-center nb-card space-y-4">
          <div className="w-14 h-14 rounded-md bg-[#123D32] border-2 border-[#292D2B] dark:border-[#D6AD52] text-[#D6AD52] flex items-center justify-center mx-auto shadow-[3px_3px_0px_#292D2B]">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-bold font-serif text-[#292D2B] dark:text-[#F1F4F8]">
              Silakan Masuk ke Akun Dars with Osama
            </h3>
            <p className="text-xs text-[#292D2B]/75 dark:text-[#F1F4F8]/75 leading-relaxed">
              Silakan masuk ke akun Dars with Osama untuk mengajukan pertanyaan konsultasi baru dan menerima balasan resmi dari admin/ustaz.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => openAuthModal('login')}
              className="nb-btn nb-btn-gold px-6 py-2.5 text-xs sm:text-sm"
            >
              Masuk
            </button>
            <button
              onClick={() => openAuthModal('register')}
              className="nb-btn nb-btn-secondary px-6 py-2.5 text-xs sm:text-sm"
            >
              Daftar Akun Baru
            </button>
          </div>
        </div>
      ) : (
        /* LOGGED IN STUDENT CONSULTATION INTERFACE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: FORM KONSULTASI BARU */}
          <div className="lg:col-span-5 space-y-6 relative">
            <div className="nb-card p-6 space-y-5 lg:sticky lg:top-20">
              <div className="flex items-center gap-2 border-b-2 border-[#292D2B]/15 dark:border-[#D6AD52]/25 pb-3">
                <MessageSquare className="w-5 h-5 text-[#123D32] dark:text-[#D6AD52]" />
                <h3 className="font-bold text-base font-serif text-[#292D2B] dark:text-[#F1F4F8]">
                  Kirim Pertanyaan Baru
                </h3>
              </div>

              {successMsg && (
                <div className="p-3.5 bg-[#123D32] border-2 border-[#D6AD52] text-[#FAF7F0] text-xs font-bold rounded-md flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#D6AD52] mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3.5 bg-[#F04438]/15 border-2 border-[#F04438] text-[#292D2B] dark:text-white text-xs font-bold rounded-md flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#F04438] mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Category Radio / Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#292D2B] dark:text-[#D6AD52]">
                    Kategori Konsultasi
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setCategory('learning')}
                      className={`p-3 rounded-md border-2 text-xs font-bold flex flex-col items-start gap-1 transition cursor-pointer text-left ${
                        category === 'learning'
                          ? 'bg-[#123D32] text-[#D6AD52] border-[#292D2B] dark:border-[#D6AD52] shadow-[3px_3px_0px_#292D2B]'
                          : 'bg-[#FAF7F0] dark:bg-[#101B2D] border-[#292D2B]/40 dark:border-[#D6AD52]/40 text-[#292D2B] dark:text-[#F1F4F8]'
                      }`}
                    >
                      <span className="font-extrabold flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Materi & Pelajaran</span>
                      </span>
                      <span className="text-[10px] opacity-85">Dapat dipublikasikan di Q&A jika disetujui</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory('private')}
                      className={`p-3 rounded-md border-2 text-xs font-bold flex flex-col items-start gap-1 transition cursor-pointer text-left ${
                        category === 'private'
                          ? 'bg-[#123D32] text-[#D6AD52] border-[#292D2B] dark:border-[#D6AD52] shadow-[3px_3px_0px_#292D2B]'
                          : 'bg-[#FAF7F0] dark:bg-[#101B2D] border-[#292D2B]/40 dark:border-[#D6AD52]/40 text-[#292D2B] dark:text-[#F1F4F8]'
                      }`}
                    >
                      <span className="font-extrabold flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Konsultasi Pribadi</span>
                      </span>
                      <span className="text-[10px] opacity-85">Privat 100% dan TIDAK AKAN dipublikasi</span>
                    </button>
                  </div>
                </div>

                {/* Title Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#292D2B] dark:text-[#D6AD52] block">
                    Judul Pertanyaan / Topik
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Hukum Fiqih seputar Masalah X..."
                    maxLength={200}
                    required
                    className="nb-input px-3.5 py-2.5 text-xs"
                  />
                </div>

                {/* Content Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#292D2B] dark:text-[#D6AD52] block">
                    Isi Pertanyaan / Penjelasan Detail
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Tuliskan pertanyaan Anda dengan jelas dan santun..."
                    rows={5}
                    maxLength={5000}
                    required
                    className="nb-input px-3.5 py-2.5 text-xs resize-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full nb-btn nb-btn-gold py-3 text-xs sm:text-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Mengirim...' : 'Kirim Pertanyaan Konsultasi'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT: RIWAYAT KONSULTASI SISWA */}
          <div className="lg:col-span-7 space-y-6">
            <div className="nb-card p-6 space-y-5">
              <div className="flex items-center justify-between border-b-2 border-[#292D2B]/15 dark:border-[#D6AD52]/25 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#42658A]" />
                  <h3 className="font-bold text-base font-serif text-[#292D2B] dark:text-[#F1F4F8]">
                    Riwayat Konsultasi Saya
                  </h3>
                </div>
                <span className="text-xs font-extrabold text-[#123D32] dark:text-[#D6AD52]">
                  {consultations.length} Pertanyaan
                </span>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs font-bold text-[#292D2B]/70 dark:text-[#F1F4F8]/70">
                  Memuat riwayat konsultasi Anda...
                </div>
              ) : consultations.length === 0 ? (
                <div className="py-12 text-center space-y-2 border-2 border-dashed border-[#292D2B]/30 dark:border-[#D6AD52]/40 rounded-md p-6">
                  <MessageSquare className="w-8 h-8 text-[#123D32] dark:text-[#D6AD52] mx-auto" />
                  <p className="text-xs font-bold font-serif text-[#292D2B] dark:text-[#F1F4F8]">
                    Belum Ada Pertanyaan Konsultasi
                  </p>
                  <p className="text-[11px] text-[#292D2B]/75 dark:text-[#F1F4F8]/75">
                    Gunakan formulir di samping untuk mengajukan pertanyaan pertama Anda.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                  {consultations.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 sm:p-5 bg-[#FAF7F0] dark:bg-[#101B2D] border-0 sm:border-2 border-[#292D2B] dark:border-[#D6AD52]/60 rounded-md space-y-3 shadow-none sm:shadow-[3px_3px_0px_#292D2B] border-b sm:border-b-2 border-b-[#292D2B]/15"
                    >
                      {/* Header Row: Status Badge & Category Tag */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded border ${
                              item.category === 'private'
                                ? 'bg-[#292D2B] text-[#D6AD52] border-[#D6AD52]'
                                : 'bg-[#123D32] text-[#D6AD52] border-[#292D2B] dark:border-[#D6AD52]'
                            }`}
                          >
                            {item.category === 'private' ? '🔒 Konsultasi Pribadi' : '📖 Materi & Pembelajaran'}
                          </span>

                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded border ${
                              item.status === 'answered'
                                ? 'bg-[#D6AD52] text-[#292D2B] border-[#292D2B]'
                                : item.status === 'closed'
                                ? 'bg-white text-[#292D2B] border-[#292D2B]'
                                : 'bg-[#42658A] text-white border-[#292D2B]'
                            }`}
                          >
                            {item.status === 'answered'
                              ? '✓ Sudah Dijawab'
                              : item.status === 'closed'
                              ? 'Selesai'
                              : '⏳ Menunggu Jawaban'}
                          </span>
                        </div>

                        <span className="text-[11px] font-bold text-[#292D2B]/70 dark:text-[#F1F4F8]/70">
                          {new Date(item.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      {/* Question Title & Content */}
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-[#292D2B] dark:text-[#F1F4F8] font-serif">
                          {item.title}
                        </h4>
                        <p className="text-xs text-[#292D2B]/85 dark:text-[#F1F4F8]/85 leading-relaxed font-sans whitespace-pre-line">
                          {item.content}
                        </p>
                      </div>

                      {/* Admin Reply Box if Answered */}
                      {item.replyContent && (
                        <div className="p-3 sm:p-4 bg-white dark:bg-[#243A56] border-0 sm:border-2 border-t-2 sm:border-t-2 border-[#D6AD52] sm:border-[#292D2B] sm:border-l-8 sm:border-l-[#D6AD52] dark:border-[#D6AD52] dark:sm:border-[#D6AD52] rounded-md space-y-2 mt-2">
                          <div className="flex items-center justify-between text-[11px] font-bold text-[#123D32] dark:text-[#D6AD52]">
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#D6AD52]" />
                              <span>Balasan {item.repliedBy || 'Ustaz / Admin'}:</span>
                            </span>
                            {item.repliedAt && (
                              <span className="text-[10px] font-normal opacity-80">
                                {new Date(item.repliedAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            )}
                          </div>
                          <div
                            className="prose dark:prose-invert max-w-none text-xs text-[#292D2B] dark:text-[#F1F4F8] leading-relaxed space-y-2 font-sans blog-content"
                            dangerouslySetInnerHTML={{ __html: autoWrapArabicText(item.replyContent) }}
                          />
                        </div>
                      )}

                      {/* Sharing actions if approved learning QA */}
                      {item.category === 'learning' && item.isPublished && item.replyContent && (
                        <div className="pt-2 border-t border-[#292D2B]/15 dark:border-[#D6AD52]/25 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[10px] text-[#123D32] dark:text-[#D6AD52] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Dipublikasikan ke Tanya Jawab Publik</span>
                          </span>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setShareItem(item);
                                setShareTab('share');
                                setShareModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-[#123D32] text-[#D6AD52] border border-[#292D2B] rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Share2 className="w-3 h-3" />
                              <span>Bagikan Jawaban</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setShareItem(item);
                                setShareTab('card');
                                setShareModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-[#D6AD52] text-[#292D2B] border border-[#292D2B] rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <ImageIcon className="w-3 h-3" />
                              <span>Buat Gambar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyDirectLink(item)}
                              className="px-2 py-1 bg-white dark:bg-[#243A56] border border-[#292D2B] dark:border-[#D6AD52] text-[#292D2B] dark:text-[#F1F4F8] rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              {copiedId === item.id ? (
                                <>
                                  <Check className="w-3 h-3 text-[#123D32] dark:text-[#D6AD52]" />
                                  <span>Tersalin</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-[#D6AD52]" />
                                  <span>Salin Tautan</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* WhatsApp Escalation Action */}
                      <div className="pt-2 border-t border-[#292D2B]/15 dark:border-[#D6AD52]/25 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#292D2B]/70 dark:text-[#F1F4F8]/70">
                          Ingin respon langsung di WhatsApp?
                        </span>
                        <a
                          href={getWhatsAppConsultationUrl({
                            id: item.id,
                            title: item.title,
                            category: item.category,
                            studentName: userProfile?.displayName || user?.displayName || 'Santri'
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#123D32] text-[#D6AD52] border border-[#292D2B] dark:border-[#D6AD52] rounded text-[11px] font-extrabold transition cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-[#D6AD52]" />
                          <span>Lanjut ke WhatsApp Admin</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Q&A Modal */}
      <ShareQAModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        consultation={shareItem}
        initialTab={shareTab}
      />
    </div>
  );
};
