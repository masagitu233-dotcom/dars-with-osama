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
  User,
  ArrowRight
} from 'lucide-react';
import { Consultation } from '../../types';
import { createConsultation, getStudentConsultations } from '../../firebase/services';
import { useAuth } from '../../context/AuthContext';
import { getWhatsAppConsultationUrl } from '../../config/whatsappConfig';
import { autoWrapArabicText } from '../../utils/arabicFontHelper';

interface StudentConsultationViewProps {
  onNavigateToPublicQA?: () => void;
}

export const StudentConsultationView: React.FC<StudentConsultationViewProps> = ({
  onNavigateToPublicQA
}) => {
  const { user, userProfile, openAuthModal } = useAuth();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Form State
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [category, setCategory] = useState<'learning' | 'private'>('learning');

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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8 animate-fade-in font-sans">
      
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#073B2E] via-[#071B16] to-[#123B6D] text-[#F7F6EF] p-6 sm:p-10 border border-[#073B2E]/30 shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#C9A34E]/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A34E]/20 border border-[#C9A34E]/30 text-[#F4B942] text-xs font-semibold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#F4B942]" />
            <span>Ruang Bimbingan & Konsultasi Syar'i</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold font-serif-brand text-[#F7F6EF] leading-tight">
            Konsultasi & Tanya Jawab Pembelajaran
          </h1>

          <p className="text-xs sm:text-sm text-[#F7F6EF]/80 leading-relaxed font-sans">
            Ajukan pertanyaan seputar materi pelajaran, pemahaman kitab, maupun pertanyaan pribadi secara tertutup dan aman bersama Ustaz & Pembimbing.
          </p>

          {onNavigateToPublicQA && (
            <div className="pt-2">
              <button
                onClick={onNavigateToPublicQA}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A34E]/20 hover:bg-[#C9A34E]/30 text-[#F4B942] rounded-xl text-xs font-semibold border border-[#C9A34E]/40 transition cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Lihat Arsip Tanya Jawab Publik (Q&A)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {!user ? (
        /* NON-LOGGED IN STATE NOTICE */
        <div className="p-8 text-center bg-white dark:bg-[#071B16] border border-[#073B2E]/15 dark:border-[#C9A34E]/25 rounded-3xl shadow-md space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#073B2E]/10 dark:bg-[#C9A34E]/20 text-[#073B2E] dark:text-[#F4B942] flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-bold font-serif-brand text-[#073B2E] dark:text-[#F7F6EF]">
              Login Diberlakukan untuk Konsultasi
            </h3>
            <p className="text-xs text-[#6B7C7A] dark:text-[#8C9E9B] leading-relaxed">
              Hanya pengguna dan siswa terdaftar yang dapat mengajukan pertanyaan dan menerima balasan resmi dari admin/ustaz.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => openAuthModal('login')}
              className="px-6 py-2.5 bg-[#073B2E] dark:bg-[#123B6D] hover:bg-[#0a4d3c] dark:hover:bg-[#0EA5A4] text-white font-bold text-xs sm:text-sm rounded-xl transition shadow cursor-pointer"
            >
              Masuk / Login Akun
            </button>
            <button
              onClick={() => openAuthModal('register')}
              className="px-6 py-2.5 bg-white dark:bg-[#0c2b23] hover:bg-stone-100 dark:hover:bg-[#143e33] text-[#073B2E] dark:text-[#F7F6EF] font-bold text-xs sm:text-sm rounded-xl border border-[#073B2E]/20 dark:border-[#C9A34E]/30 transition cursor-pointer"
            >
              Daftar Akun Baru
            </button>
          </div>
        </div>
      ) : (
        /* LOGGED IN STUDENT CONSULTATION INTERFACE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: FORM KONSULTASI BARU (COL 5) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-[#071B16] border border-[#073B2E]/15 dark:border-[#C9A34E]/25 rounded-3xl p-6 shadow-md space-y-5">
              <div className="flex items-center gap-2 border-b border-[#073B2E]/10 dark:border-[#C9A34E]/20 pb-3">
                <MessageSquare className="w-5 h-5 text-[#C9A34E]" />
                <h3 className="font-bold text-base font-serif-brand text-[#073B2E] dark:text-[#F7F6EF]">
                  Kirim Pertanyaan Baru
                </h3>
              </div>

              {successMsg && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Category Radio / Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#073B2E] dark:text-[#F7F6EF]">
                    Kategori Konsultasi
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCategory('learning')}
                      className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-start gap-1 transition cursor-pointer text-left ${
                        category === 'learning'
                          ? 'bg-[#073B2E]/10 dark:bg-[#C9A34E]/20 border-[#073B2E] dark:border-[#C9A34E] text-[#073B2E] dark:text-[#F4B942]'
                          : 'bg-white dark:bg-[#0c2b23] border-[#073B2E]/15 dark:border-[#143e33] text-[#6B7C7A] dark:text-[#8C9E9B]'
                      }`}
                    >
                      <span className="font-bold flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Materi & Pelajaran</span>
                      </span>
                      <span className="text-[10px] opacity-80">Dapat dipublikasikan di Q&A jika disetujui</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory('private')}
                      className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-start gap-1 transition cursor-pointer text-left ${
                        category === 'private'
                          ? 'bg-[#073B2E]/10 dark:bg-[#C9A34E]/20 border-[#073B2E] dark:border-[#C9A34E] text-[#073B2E] dark:text-[#F4B942]'
                          : 'bg-white dark:bg-[#0c2b23] border-[#073B2E]/15 dark:border-[#143e33] text-[#6B7C7A] dark:text-[#8C9E9B]'
                      }`}
                    >
                      <span className="font-bold flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Konsultasi Pribadi</span>
                      </span>
                      <span className="text-[10px] opacity-80">Privat 100% dan TIDAK AKAN dipublikasi</span>
                    </button>
                  </div>
                </div>

                {/* Title Input */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#073B2E] dark:text-[#F7F6EF]">
                    Judul Pertanyaan / Topik
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Hukum Fiqih seputar Masalah X..."
                    maxLength={200}
                    required
                    className="w-full px-3.5 py-2.5 bg-[#F7F6EF]/60 dark:bg-[#0c2b23] border border-[#073B2E]/20 dark:border-[#143e33] rounded-xl text-xs text-[#073B2E] dark:text-[#F7F6EF] focus:outline-hidden focus:ring-2 focus:ring-[#C9A34E]"
                  />
                </div>

                {/* Content Input */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#073B2E] dark:text-[#F7F6EF]">
                    Isi Pertanyaan / Penjelasan Detail
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Tuliskan pertanyaan Anda dengan jelas dan santun..."
                    rows={5}
                    maxLength={5000}
                    required
                    className="w-full px-3.5 py-2.5 bg-[#F7F6EF]/60 dark:bg-[#0c2b23] border border-[#073B2E]/20 dark:border-[#143e33] rounded-xl text-xs text-[#073B2E] dark:text-[#F7F6EF] focus:outline-hidden focus:ring-2 focus:ring-[#C9A34E] resize-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-[#073B2E] dark:bg-[#123B6D] hover:bg-[#0a4d3c] dark:hover:bg-[#0EA5A4] active:scale-[0.98] text-[#F7F6EF] font-bold text-xs sm:text-sm rounded-xl transition shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4 text-[#F4B942]" />
                  <span>{submitting ? 'Mengirim...' : 'Kirim Pertanyaan Konsultasi'}</span>
                </button>

              </form>
            </div>
          </div>

          {/* RIGHT: RIWAYAT KONSULTASI SISWA (COL 7) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-[#071B16] border border-[#073B2E]/15 dark:border-[#C9A34E]/25 rounded-3xl p-6 shadow-md space-y-5">
              <div className="flex items-center justify-between border-b border-[#073B2E]/10 dark:border-[#C9A34E]/20 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#0EA5A4]" />
                  <h3 className="font-bold text-base font-serif-brand text-[#073B2E] dark:text-[#F7F6EF]">
                    Riwayat Konsultasi Saya
                  </h3>
                </div>
                <span className="text-xs font-semibold text-[#6B7C7A] dark:text-[#8C9E9B]">
                  {consultations.length} Pertanyaan
                </span>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-[#6B7C7A] dark:text-[#8C9E9B]">
                  Memuat riwayat konsultasi Anda...
                </div>
              ) : consultations.length === 0 ? (
                <div className="py-12 text-center space-y-2 border border-dashed border-[#073B2E]/20 dark:border-[#C9A34E]/30 rounded-2xl p-6">
                  <MessageSquare className="w-8 h-8 text-[#C9A34E] mx-auto opacity-70" />
                  <p className="text-xs font-bold text-[#073B2E] dark:text-[#F7F6EF]">
                    Belum Ada Pertanyaan Konsultasi
                  </p>
                  <p className="text-[11px] text-[#6B7C7A] dark:text-[#8C9E9B]">
                    Gunakan formulir di samping untuk mengajukan pertanyaan pertama Anda.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                  {consultations.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 sm:p-5 bg-[#F7F6EF]/60 dark:bg-[#0c2b23] border border-[#073B2E]/10 dark:border-[#143e33] rounded-2xl space-y-3 transition-colors"
                    >
                      {/* Header Row: Status Badge & Category Tag */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                              item.category === 'private'
                                ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300/80'
                                : 'bg-[#073B2E]/10 dark:bg-[#C9A34E]/20 text-[#073B2E] dark:text-[#F4B942] border-[#C9A34E]/40'
                            }`}
                          >
                            {item.category === 'private' ? '🔒 Konsultasi Pribadi' : '📖 Materi & Pembelajaran'}
                          </span>

                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                              item.status === 'answered'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300/80'
                                : item.status === 'closed'
                                ? 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300'
                                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300/80 animate-pulse'
                            }`}
                          >
                            {item.status === 'answered'
                              ? '✓ Sudah Dijawab'
                              : item.status === 'closed'
                              ? 'Selesai'
                              : '⏳ Menunggu Jawaban'}
                          </span>
                        </div>

                        <span className="text-[10px] text-[#6B7C7A] dark:text-[#8C9E9B]">
                          {new Date(item.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      {/* Question Title & Content */}
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-[#073B2E] dark:text-[#F7F6EF] font-serif-brand">
                          {item.title}
                        </h4>
                        <p className="text-xs text-[#073B2E]/80 dark:text-[#F7F6EF]/80 leading-relaxed font-sans whitespace-pre-line">
                          {item.content}
                        </p>
                      </div>

                      {/* Admin Reply Box if Answered */}
                      {item.replyContent && (
                        <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/50 border-l-4 border-[#0EA5A4] dark:border-[#F4B942] rounded-r-2xl space-y-1.5 mt-2">
                          <div className="flex items-center justify-between text-[11px] font-bold text-[#073B2E] dark:text-[#F4B942]">
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#C9A34E]" />
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
                            className="prose dark:prose-invert max-w-none text-xs text-[#073B2E] dark:text-[#F7F6EF] leading-relaxed space-y-2 font-sans blog-content"
                            dangerouslySetInnerHTML={{ __html: autoWrapArabicText(item.replyContent) }}
                          />
                        </div>
                      )}

                      {/* WhatsApp Escalation Action */}
                      <div className="pt-2 border-t border-[#073B2E]/10 dark:border-[#143e33] flex items-center justify-between">
                        <span className="text-[10px] text-[#6B7C7A] dark:text-[#8C9E9B]">
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition shadow-xs cursor-pointer active:scale-95"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-amber-300" />
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

    </div>
  );
};
