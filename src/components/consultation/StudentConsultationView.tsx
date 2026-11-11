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
  Check,
  ArrowLeft,
  ShieldAlert,
  Calendar,
  UserCheck,
  Trash2,
  CornerDownRight
} from 'lucide-react';
import { Consultation, ConsultationFollowup } from '../../types';
import {
  createConsultation,
  getStudentConsultations,
  getConsultationById,
  deleteConsultation,
  createConsultationFollowup,
  getConsultationFollowups
} from '../../firebase/services';
import { getWhatsAppConsultationUrl } from '../../config/whatsappConfig';
import { autoWrapArabicText } from '../../utils/arabicFontHelper';
import { useAuth } from '../../context/AuthContext';
import { ShareQAModal } from './ShareQAModal';
import { ReadingFontControls, useReadingFontSize } from '../common/ReadingFontControls';
import { validateWhatsAppNumber } from '../../utils/qaHelper';
import { QAReadingViewer } from './QAReadingViewer';
import { ConfirmModal } from '../common/ConfirmModal';

interface StudentConsultationViewProps {
  onNavigateToPublicQA?: () => void;
  initialConsultationId?: string | null;
  onSelectConsultation?: (consultationId: string | null) => void;
}

export const StudentConsultationView: React.FC<StudentConsultationViewProps> = ({
  onNavigateToPublicQA,
  initialConsultationId,
  onSelectConsultation
}) => {
  const { user, userProfile, loading: authLoading, openAuthModal, showToast } = useAuth();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Form states
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');
  const [category, setCategory] = useState<'learning' | 'private'>('learning');

  // Reading page state
  const [selectedReadingConsultation, setSelectedReadingConsultation] = useState<Consultation | null>(null);
  const [readingLoading, setReadingLoading] = useState<boolean>(false);
  const [readingError, setReadingError] = useState<string | null>(null);

  // Share Modal state
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [shareItem, setShareItem] = useState<Consultation | null>(null);
  const [shareTab, setShareTab] = useState<'share' | 'card'>('share');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fontControl = useReadingFontSize();

  // User deletion state
  const [consultationToDelete, setConsultationToDelete] = useState<Consultation | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Followups thread state
  const [followups, setFollowups] = useState<ConsultationFollowup[]>([]);
  const [followupsLoading, setFollowupsLoading] = useState<boolean>(false);
  const [followupInput, setFollowupInput] = useState<string>('');
  const [submittingFollowup, setSubmittingFollowup] = useState<boolean>(false);
  const [followupSuccess, setFollowupSuccess] = useState<string>('');
  const [followupError, setFollowupError] = useState<string>('');

  const loadFollowups = async (cId: string) => {
    setFollowupsLoading(true);
    try {
      const list = await getConsultationFollowups(cId);
      setFollowups(list);
    } catch (err) {
      console.warn('Error loading consultation followups:', err);
    } finally {
      setFollowupsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedReadingConsultation?.id) {
      loadFollowups(selectedReadingConsultation.id);
    } else {
      setFollowups([]);
      setFollowupInput('');
      setFollowupSuccess('');
      setFollowupError('');
    }
  }, [selectedReadingConsultation?.id]);

  const handleConfirmDeleteUserConsultation = async () => {
    if (!consultationToDelete || !user) return;
    setDeleting(true);
    try {
      await deleteConsultation(consultationToDelete.id, user.uid, userProfile?.role === 'admin');
      showToast('Pertanyaan beserta seluruh rangkaian diskusi berhasil dihapus.');
      setConsultations((prev) => prev.filter((c) => c.id !== consultationToDelete.id));
      if (selectedReadingConsultation?.id === consultationToDelete.id) {
        handleCloseReadingView();
      }
      setConsultationToDelete(null);
    } catch (err: any) {
      showToast(err?.message || 'Gagal menghapus pertanyaan.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSendFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReadingConsultation || !user) return;
    if (!followupInput.trim() || followupInput.trim().length < 5) {
      setFollowupError('Isi pertanyaan lanjutan minimal 5 karakter.');
      return;
    }

    setSubmittingFollowup(true);
    setFollowupError('');
    setFollowupSuccess('');

    try {
      await createConsultationFollowup({
        consultationId: selectedReadingConsultation.id,
        content: followupInput.trim()
      });
      setFollowupInput('');
      setFollowupSuccess('Pertanyaan lanjutan berhasil terkirim ke rangkaian diskusi ini!');
      await loadFollowups(selectedReadingConsultation.id);
    } catch (err: any) {
      setFollowupError(err?.message || 'Gagal mengirim pertanyaan lanjutan.');
    } finally {
      setSubmittingFollowup(false);
    }
  };

  const handleCopyDirectLink = async (item: Consultation) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://darswithosama.com';
    const directUrl = `${origin}/qa/${encodeURIComponent(item.id)}`;

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

  // Deep-link or selection resolution when initialConsultationId is set
  useEffect(() => {
    if (!initialConsultationId) {
      if (selectedReadingConsultation && !initialConsultationId) {
        setSelectedReadingConsultation(null);
      }
      return;
    }

    // Try finding within already loaded consultations
    const existing = consultations.find((c) => c.id === initialConsultationId);
    if (existing) {
      setSelectedReadingConsultation(existing);
      setReadingError(null);
      return;
    }

    // Otherwise fetch specifically from Firestore with security validation
    let isCancelled = false;
    setReadingLoading(true);
    setReadingError(null);

    getConsultationById(initialConsultationId, user?.uid, userProfile?.role === 'admin')
      .then((item) => {
        if (isCancelled) return;
        if (item) {
          setSelectedReadingConsultation(item);
          setReadingError(null);
        } else {
          setReadingError('Pertanyaan konsultasi tidak ditemukan atau telah dihapus.');
        }
      })
      .catch((err: any) => {
        if (isCancelled) return;
        console.warn('Unauthorized consultation view attempt:', err);
        setReadingError(
          err?.message ||
            'Akses ditolak: Konsultasi ini bersifat pribadi dan hanya dapat dibaca oleh penanya yang bersangkutan atau admin Dars with Osama.'
        );
      })
      .finally(() => {
        if (!isCancelled) setReadingLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [initialConsultationId, consultations, user?.uid, userProfile?.role]);

  const handleOpenReadingView = (item: Consultation) => {
    setSelectedReadingConsultation(item);
    setReadingError(null);
    onSelectConsultation?.(item.id);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCloseReadingView = () => {
    setSelectedReadingConsultation(null);
    setReadingError(null);
    onSelectConsultation?.(null);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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

    if (whatsappNumber.trim()) {
      const waCheck = validateWhatsAppNumber(whatsappNumber);
      if (!waCheck.isValid) {
        setErrorMsg(
          waCheck.error ||
            'Format nomor WhatsApp tidak valid. Masukkan nomor telepon yang benar (contoh: 08xxxxxxxxxx).'
        );
        return;
      }
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await createConsultation({
        title: title.trim(),
        content: content.trim(),
        category,
        whatsappNumber: whatsappNumber.trim() || undefined
      });

      setTitle('');
      setContent('');
      setWhatsappNumber('');
      setCategory('learning');
      setSuccessMsg(
        'Pertanyaan konsultasi Anda telah berhasil dikirim! Ustaz/Admin akan memberikan balasan segera.'
      );
      await loadMyConsultations();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal mengirim pertanyaan. Silakan coba kembali.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-fade-in font-sans">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-lg bg-[#0F3D3A] text-[#F5DABF] p-6 sm:p-10 border-2 border-[#171717] shadow-[6px_6px_0px_#171717]">
        <div className="relative z-10 max-w-2xl space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#D6AD52] border-2 border-[#171717] text-[#0F3D3A] text-xs font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#0F3D3A]" />
            <span>Ruang Bimbingan & Konsultasi Syar'i</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif text-[#F5DABF] leading-tight">
            Konsultasi & Tanya Jawab Pembelajaran
          </h1>

          <p className="text-xs sm:text-sm text-[#F5DABF]/90 leading-relaxed font-sans">
            Ajukan pertanyaan seputar materi pelajaran, pemahaman kitab, maupun pertanyaan pribadi secara tertutup dan aman bersama Ustaz & Pembimbing.
          </p>

          {onNavigateToPublicQA && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onNavigateToPublicQA}
                className="nb-btn nb-btn-gold px-4 py-2.5 text-xs inline-flex items-center gap-2"
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
        <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
          <div className="w-10 h-10 border-3 border-[#123D32] dark:border-[#4CA7A1] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[#171717] dark:text-[#CEFEF1] font-bold">
            Memeriksa status akun siswa...
          </p>
        </div>
      ) : !user ? (
        /* NON-LOGGED IN STATE NOTICE */
        <div className="p-8 text-center nb-card space-y-4">
          <div className="w-14 h-14 rounded-md bg-[#001722] border-2 border-[#171717] dark:border-[#4CA7A1] text-[#CEFEF1] flex items-center justify-center mx-auto shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-bold font-serif text-[#171717] dark:text-[#CEFEF1]">
              Silakan Masuk ke Akun Dars with Osama
            </h3>
            <p className="text-xs text-[#525855] dark:text-[#A6D6C9] leading-relaxed">
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
      ) : readingLoading ? (
        /* LOADING READING VIEW */
        <div className="nb-card p-12 text-center space-y-4">
          <div className="w-10 h-10 border-3 border-[#123D32] dark:border-[#4CA7A1] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-[#525855] dark:text-[#A6D6C9]">
            Memuat naskah konsultasi...
          </p>
        </div>
      ) : readingError ? (
        /* ERROR / ACCESS DENIED VIEW */
        <div className="nb-card p-8 space-y-5 border-2 border-[#C94A4A] bg-[#FFF5E9] dark:bg-[#1C1618]">
          <div className="flex items-center gap-3 text-[#B42318] dark:text-[#F04438]">
            <ShieldAlert className="w-8 h-8 shrink-0" />
            <div>
              <h3 className="font-extrabold text-base sm:text-lg font-serif text-[#171717] dark:text-[#CEFEF1]">
                Akses Konsultasi Terbatas
              </h3>
              <p className="text-xs text-[#B42318] dark:text-[#F04438] font-bold">
                {readingError}
              </p>
            </div>
          </div>
          <p className="text-xs text-[#525855] dark:text-[#A6D6C9] leading-relaxed">
            Konsultasi pribadi dilindungi oleh sistem keamanan Firebase dan hanya dapat diakses oleh penanya asli atau admin berwenang.
          </p>
          <button
            type="button"
            onClick={handleCloseReadingView}
            className="nb-btn nb-btn-primary px-4 py-2 text-xs inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Riwayat Konsultasi</span>
          </button>
        </div>
      ) : selectedReadingConsultation ? (
        /* ======================================================== */
        /* 3. HALAMAN BACA KONSULTASI (FULL READING PAGE VIEW)      */
        /* Format konsisten dengan Halaman Baca Tanya Jawab Biasa    */
        /* ======================================================== */
        (() => {
          const item = selectedReadingConsultation;
          const hasReply = Boolean(item.replyContent && item.replyContent.trim().length > 0);
          const isAnswered = item.status === 'answered' || (item.status === 'closed' && hasReply) || hasReply;

          return (
            <div className="space-y-6 animate-fade-in font-sans">
              {/* Top Navigation & Text Resizer Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 nb-card p-3.5 sm:p-4 bg-white dark:bg-[#16263D]">
                <button
                  type="button"
                  onClick={handleCloseReadingView}
                  className="nb-btn nb-btn-secondary px-3.5 py-2 text-xs flex items-center gap-2 font-extrabold"
                  title="Kembali ke formulir dan riwayat konsultasi saya"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali ke Riwayat Konsultasi</span>
                </button>

                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
                    Ukuran Teks:
                  </span>
                  <ReadingFontControls
                    step={fontControl.step}
                    percentage={fontControl.percentage}
                    canDecrease={fontControl.canDecrease}
                    canIncrease={fontControl.canIncrease}
                    isDefault={fontControl.isDefault}
                    onDecrease={fontControl.decrease}
                    onIncrease={fontControl.increase}
                    onReset={fontControl.reset}
                    compact={true}
                  />
                </div>
              </div>

              {/* Main Reading Card */}
              <article className="nb-card p-5 sm:p-8 bg-white dark:bg-[#16263D] space-y-6 border-2 border-charcoal dark:border-[#34465D]">
                {/* Header Information: Badges, Title, & Metadata */}
                <header className="space-y-3 pb-4 border-b-2 border-charcoal dark:border-[#34465D]">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Category Badge */}
                    <span
                      className={`nb-badge ${
                        item.category === 'private'
                          ? 'bg-[#001722] text-[#CEFEF1] border-[#171717]'
                          : 'bg-[#0D2B36] text-[#CEFEF1] border-[#171717]'
                      }`}
                    >
                      {item.category === 'private' ? (
                        <>
                          <Lock className="w-3 h-3 inline mr-1 shrink-0" />
                          <span>Konsultasi Pribadi</span>
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-3 h-3 inline mr-1 shrink-0" />
                          <span>Materi & Pelajaran</span>
                        </>
                      )}
                    </span>

                    {/* Answer Status Badge: Menunggu Jawaban vs Sudah Dijawab */}
                    <span
                      className={`nb-badge ${
                        isAnswered
                          ? 'bg-[#123D32] text-[#D6AD52] dark:bg-[#4CA7A1] dark:text-[#001722]'
                          : 'bg-[#C94A4A] text-white'
                      }`}
                    >
                      {isAnswered ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 inline mr-1 shrink-0" />
                          <span>Sudah Dijawab</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 inline mr-1 shrink-0" />
                          <span>Menunggu Jawaban</span>
                        </>
                      )}
                    </span>

                    {/* Publication Status Badge */}
                    {item.isPublished && (
                      <span className="nb-badge bg-[#3478F6] text-white">
                        <span>👁 Terbit di Q&A Publik</span>
                      </span>
                    )}
                  </div>

                  {/* Title / Topic */}
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-serif-brand text-charcoal dark:text-offwhite leading-tight">
                    {item.title}
                  </h1>

                  {/* Metadata Row: Anonymous Identity & Question Date */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span className="flex items-center gap-1.5 font-bold text-charcoal dark:text-offwhite">
                      <UserCheck className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1]" />
                      <span>Penanya: Penanya (Anonim)</span>
                    </span>

                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Diajukan pada{' '}
                        {new Date(item.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </span>
                  </div>
                </header>

                {/* Section: Pertanyaan Lengkap */}
                <section className="space-y-2">
                  <div className="p-4 sm:p-5 rounded-md bg-[#FAF7F0] dark:bg-[#0D2B36] border-2 border-charcoal dark:border-[#4CA7A1] space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#123D32] dark:text-[#A6D6C9] block border-b border-charcoal/15 dark:border-[#4CA7A1]/20 pb-1.5">
                      Pertanyaan Lengkap:
                    </span>
                    <div
                      style={fontControl.style}
                      className="reading-scalable-text text-[#171717] dark:text-[#CEFEF1] leading-relaxed whitespace-pre-line font-sans text-xs sm:text-sm"
                      dangerouslySetInnerHTML={{ __html: autoWrapArabicText(item.content) }}
                    />
                  </div>
                </section>

                {/* Section: Jawaban Resmi Ustaz / Pembimbing */}
                {hasReply ? (
                  <section className="space-y-4 pt-2">
                    <div className="p-4 sm:p-6 rounded-md bg-white dark:bg-[#0D2B36] border-2 border-charcoal dark:border-[#4CA7A1] border-l-4 border-l-[#123D32] dark:border-l-[#4CA7A1] space-y-4">
                      {/* Answer Header Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b-2 border-charcoal dark:border-[#4CA7A1]">
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold font-serif text-[#123D32] dark:text-[#CEFEF1]">
                          <ShieldCheck className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1]" />
                          <span>Jawaban Resmi Ustaz / Pembimbing Dars with Osama:</span>
                        </div>
                        {item.repliedAt && (
                          <span className="text-[11px] font-bold text-slate-500 dark:text-[#A6D6C9]">
                            {new Date(item.repliedAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                        )}
                      </div>

                      {/* SISTEM DAFTAR ISI DAN NAVIGASI SLIDE JAWABAN */}
                      <QAReadingViewer
                        replyContent={item.replyContent}
                        consultationId={item.id}
                        questionTitle={item.title}
                        fontControl={fontControl}
                        isAdmin={userProfile?.role === 'admin'}
                      />
                    </div>
                  </section>
                ) : (
                  /* Answer Not Yet Available Notice */
                  <section className="p-6 rounded-md bg-[#FAF7F0] dark:bg-[#0D2B36] border-2 border-charcoal dark:border-[#4CA7A1] border-l-4 border-l-amber-500 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold font-serif text-amber-800 dark:text-amber-400">
                      <Clock className="w-4 h-4 animate-pulse" />
                      <span>Jawaban Belum Tersedia</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-[#A6D6C9] leading-relaxed font-sans">
                      Pertanyaan Anda telah kami terima dan saat ini sedang dalam proses penelaahan oleh Ustaz & Pembimbing Dars with Osama. Silakan kembali ke halaman ini secara berkala untuk membaca jawaban resmi.
                    </p>
                  </section>
                )}

                {/* SECTION: RANGKAIAN DISKUSI LANJUTAN */}
                <section className="p-4 sm:p-6 rounded-md bg-[#FAF7F0] dark:bg-[#0D2B36] border-2 border-charcoal dark:border-[#4CA7A1] space-y-4 font-sans">
                  <div className="flex items-center justify-between border-b-2 border-charcoal/15 dark:border-[#4CA7A1]/30 pb-3">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold font-serif text-[#123D32] dark:text-[#CEFEF1]">
                      <CornerDownRight className="w-4.5 h-4.5 text-[#123D32] dark:text-[#4CA7A1]" />
                      <span>Rangkaian Diskusi Lanjutan ({followups.length})</span>
                    </div>
                    {followupsLoading && (
                      <span className="text-[11px] text-slate-500 dark:text-[#A6D6C9] font-bold animate-pulse">
                        Memuat diskusi...
                      </span>
                    )}
                  </div>

                  {followups.length > 0 && (
                    <div className="space-y-4">
                      {followups.map((f, idx) => (
                        <div
                          key={f.id}
                          className="p-4 rounded-md bg-white dark:bg-[#16263D] border-2 border-charcoal dark:border-[#34465D] space-y-3 shadow-2xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-[#A6D6C9] font-bold pb-2 border-b border-slate-200 dark:border-slate-700/60">
                            <span className="text-[#123D32] dark:text-[#CEFEF1]">
                              #{idx + 1} Pertanyaan Lanjutan ({f.studentName || 'Penanya'})
                            </span>
                            <span>
                              {new Date(f.createdAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>

                          <p className="text-xs sm:text-sm text-[#171717] dark:text-[#CEFEF1] leading-relaxed whitespace-pre-line font-sans">
                            {f.content}
                          </p>

                          {/* Admin Reply to Followup if present */}
                          {f.replyContent ? (
                            <div className="p-3.5 rounded-md bg-[#FAF7F0] dark:bg-[#0D2B36] border-2 border-charcoal dark:border-[#4CA7A1] border-l-4 border-l-[#123D32] space-y-1.5 mt-2">
                              <div className="flex items-center justify-between gap-2 text-[11px] font-extrabold text-[#123D32] dark:text-[#4CA7A1]">
                                <span className="flex items-center gap-1.5">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Jawaban Ustaz / Admin:</span>
                                </span>
                                {f.repliedAt && (
                                  <span className="font-normal text-slate-500 dark:text-[#A6D6C9]">
                                    {new Date(f.repliedAt).toLocaleDateString('id-ID', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#171717] dark:text-[#CEFEF1] leading-relaxed whitespace-pre-line font-sans">
                                {f.replyContent}
                              </p>
                            </div>
                          ) : (
                            <div className="p-2.5 rounded bg-amber-50 dark:bg-[#0D2B36] border border-amber-300 dark:border-amber-600/50 text-amber-800 dark:text-amber-400 text-[11px] font-extrabold flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 animate-pulse shrink-0" />
                              <span>Menunggu Balasan Ustaz / Admin untuk pertanyaan lanjutan ini</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input Form for Owner of Consultation */}
                  {user && (item.studentId === user.uid || userProfile?.role === 'admin') ? (
                    <form onSubmit={handleSendFollowup} className="pt-2 space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-extrabold uppercase tracking-wider text-charcoal dark:text-offwhite block">
                          Ajukan Pertanyaan Lanjutan / Lanjutkan Diskusi:
                        </label>
                        <textarea
                          rows={3}
                          value={followupInput}
                          onChange={(e) => setFollowupInput(e.target.value)}
                          placeholder="Tuliskan pertanyaan tambahan atau tanggapan Anda mengenai penjelasan di atas..."
                          maxLength={5000}
                          className="nb-input w-full px-3.5 py-2.5 text-xs resize-none leading-relaxed"
                        />
                      </div>

                      {followupError && (
                        <div className="p-2.5 bg-[#C94A4A]/20 border border-[#C94A4A] text-[#171717] dark:text-[#CEFEF1] text-xs font-bold rounded-md flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-[#C94A4A]" />
                          <span>{followupError}</span>
                        </div>
                      )}

                      {followupSuccess && (
                        <div className="p-2.5 bg-[#0D2B36] border border-[#4CA7A1] text-[#CEFEF1] text-xs font-bold rounded-md flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4CA7A1]" />
                          <span>{followupSuccess}</span>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={submittingFollowup}
                          className="nb-btn nb-btn-gold px-4 py-2.5 text-xs font-extrabold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>
                            {submittingFollowup ? 'Mengirim Diskusi...' : 'Kirim Pertanyaan Lanjutan'}
                          </span>
                        </button>
                      </div>
                    </form>
                  ) : null}
                </section>

                {/* Bottom Action Footer */}
                <footer className="pt-4 border-t-2 border-charcoal dark:border-[#34465D] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleCloseReadingView}
                    className="nb-btn nb-btn-secondary px-4 py-2 text-xs flex items-center gap-2 w-full sm:w-auto justify-center font-extrabold"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali ke Riwayat Konsultasi</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                    {/* Share Button if published */}
                    {item.isPublished && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShareItem(item);
                            setShareTab('share');
                            setShareModalOpen(true);
                          }}
                          className="nb-btn nb-btn-gold px-3.5 py-2 text-xs flex items-center gap-1.5"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Bagikan Jawaban</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyDirectLink(item)}
                          className="nb-btn nb-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedId === item.id ? 'Tersalin' : 'Salin Tautan'}</span>
                        </button>
                      </div>
                    )}

                    {/* WhatsApp Support Followup Link */}
                    <a
                      href={getWhatsAppConsultationUrl({
                        id: item.id,
                        title: item.title,
                        category: item.category,
                        studentName: userProfile?.displayName || user?.displayName || 'Santri'
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="nb-btn px-3.5 py-2 text-xs flex items-center gap-1.5 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-charcoal dark:text-offwhite border-2 border-charcoal"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                      <span>Tanya via WhatsApp</span>
                    </a>
                  </div>
                </footer>
              </article>
            </div>
          );
        })()
      ) : (
        /* ======================================================== */
        /* VERTICAL STACKED LAYOUT (DESKTOP & MOBILE)               */
        /* 1. Formulir "Kirim Pertanyaan Baru" di BAGIAN ATAS      */
        /* 2. Bagian "Riwayat Konsultasi Saya" di BAWAH FORMULIR    */
        /* ======================================================== */
        <div className="space-y-8 animate-fade-in font-sans">
          {/* 1. FORMULIR KIRIM PERTANYAAN BARU (TOP SECTION) */}
          <section className="nb-card p-6 sm:p-8 space-y-5 bg-white dark:bg-[#16263D] border-2 border-charcoal dark:border-[#34465D]">
            <div className="flex items-center gap-2.5 border-b-2 border-charcoal dark:border-[#4CA7A1] pb-3.5">
              <MessageSquare className="w-5 h-5 text-[#123D32] dark:text-[#4CA7A1]" />
              <h2 className="font-extrabold text-base sm:text-lg font-serif-brand text-charcoal dark:text-offwhite">
                Kirim Pertanyaan Baru
              </h2>
            </div>

            {successMsg && (
              <div className="p-4 bg-[#0D2B36] border-2 border-[#4CA7A1] text-[#CEFEF1] text-xs font-bold rounded-md flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4CA7A1] mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-4 bg-[#C94A4A]/20 border-2 border-[#C94A4A] text-[#171717] dark:text-[#CEFEF1] text-xs font-bold rounded-md flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#C94A4A] mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Category Radio Selector */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-charcoal dark:text-offwhite block">
                  Kategori Konsultasi:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCategory('learning')}
                    className={`p-3.5 rounded-md border-2 text-xs font-bold flex flex-col items-start gap-1 transition cursor-pointer text-left ${
                      category === 'learning'
                        ? 'bg-[#4CA7A1] text-[#001722] border-[#171717] dark:border-[#001722] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]'
                        : 'bg-[#FAF7F0] dark:bg-[#0D2B36] border-[#171717] dark:border-[#4CA7A1] text-charcoal dark:text-[#A6D6C9]'
                    }`}
                  >
                    <span className="font-extrabold flex items-center gap-1.5 text-xs sm:text-sm">
                      <BookOpen className="w-4 h-4" />
                      <span>Materi & Pelajaran</span>
                    </span>
                    <span className="text-[11px] opacity-90 leading-snug">
                      Dapat dipublikasikan di Q&A publik jika telah disetujui & diverifikasi
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('private')}
                    className={`p-3.5 rounded-md border-2 text-xs font-bold flex flex-col items-start gap-1 transition cursor-pointer text-left ${
                      category === 'private'
                        ? 'bg-[#4CA7A1] text-[#001722] border-[#171717] dark:border-[#001722] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]'
                        : 'bg-[#FAF7F0] dark:bg-[#0D2B36] border-[#171717] dark:border-[#4CA7A1] text-charcoal dark:text-[#A6D6C9]'
                    }`}
                  >
                    <span className="font-extrabold flex items-center gap-1.5 text-xs sm:text-sm">
                      <Lock className="w-4 h-4" />
                      <span>Konsultasi Pribadi</span>
                    </span>
                    <span className="text-[11px] opacity-90 leading-snug">
                      Tertutup secara default, hanya dibaca Anda & Admin
                    </span>
                  </button>
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-charcoal dark:text-offwhite block">
                  Judul Pertanyaan / Topik:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Hukum Fiqih seputar Masalah X..."
                  maxLength={200}
                  required
                  className="nb-input w-full px-3.5 py-2.5 text-xs"
                />
              </div>

              {/* Content Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-charcoal dark:text-offwhite block">
                  Isi Pertanyaan / Penjelasan Detail:
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Tuliskan pertanyaan Anda dengan jelas, santun, dan terperinci..."
                  rows={5}
                  maxLength={5000}
                  required
                  className="nb-input w-full px-3.5 py-2.5 text-xs resize-none leading-relaxed"
                />
              </div>

              {/* WhatsApp Number Input (Opsional) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-charcoal dark:text-offwhite flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-[#123D32] dark:text-[#4CA7A1]" />
                    <span>Nomor WhatsApp:</span>
                  </label>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-[#A6D6C9] bg-[#FAF7F0] dark:bg-[#0D2B36] px-2 py-0.5 rounded border border-[#171717]/20 dark:border-[#4CA7A1]/30">
                    Opsional
                  </span>
                </div>
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="Contoh: 08xxxxxxxxxx"
                  maxLength={25}
                  className="nb-input w-full px-3.5 py-2.5 text-xs"
                />
                <p className="text-[11px] text-[#525855] dark:text-[#A6D6C9] leading-relaxed bg-[#FAF7F0] dark:bg-[#0D2B36] p-2.5 rounded border border-[#171717]/15 dark:border-[#4CA7A1]/20">
                  Nomor WhatsApp (opsional). Jika Anda mencantumkannya, admin dapat mengirimkan jawaban secara langsung melalui WhatsApp setelah konsultasi selesai.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-3 text-xs sm:text-sm font-extrabold uppercase tracking-wider rounded-md border-2 border-[#171717] dark:border-[#001722] bg-[#4CA7A1] hover:bg-[#5EBEB7] text-[#001722] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Mengirim Pertanyaan...' : 'Ajukan Pertanyaan'}</span>
              </button>
            </form>
          </section>

          {/* 2. BAGIAN RIWAYAT KONSULTASI SAYA (UNDERNEATH FORM) */}
          <section className="nb-card p-6 sm:p-8 space-y-5 bg-white dark:bg-[#16263D] border-2 border-charcoal dark:border-[#34465D]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-charcoal dark:border-[#4CA7A1] pb-3.5">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-[#123D32] dark:text-[#4CA7A1]" />
                <h2 className="font-extrabold text-base sm:text-lg font-serif-brand text-charcoal dark:text-offwhite">
                  Riwayat Konsultasi Saya ({consultations.length})
                </h2>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs font-bold text-slate-500 dark:text-[#A6D6C9]">
                Memuat riwayat konsultasi Anda...
              </div>
            ) : consultations.length === 0 ? (
              <div className="py-12 text-center space-y-2 border-2 border-dashed border-charcoal dark:border-[#4CA7A1] rounded-md p-6 bg-[#FAF7F0] dark:bg-[#0D2B36]">
                <MessageSquare className="w-8 h-8 text-[#123D32] dark:text-[#4CA7A1] mx-auto" />
                <p className="text-xs font-bold font-serif text-charcoal dark:text-offwhite">
                  Belum Ada Pertanyaan Konsultasi
                </p>
                <p className="text-[11px] text-slate-500 dark:text-[#A6D6C9]">
                  Gunakan formulir di atas untuk mengajukan pertanyaan pertama Anda.
                </p>
              </div>
            ) : (
              /* Kumpulan Card Sederhana & Ringkas */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {consultations.map((item) => {
                  const hasReply = Boolean(item.replyContent && item.replyContent.trim().length > 0);
                  const isAnswered =
                    item.status === 'answered' || (item.status === 'closed' && hasReply) || hasReply;
                  const statusLabel = isAnswered ? 'Sudah Dijawab' : 'Menunggu Jawaban';

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleOpenReadingView(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleOpenReadingView(item);
                        }
                      }}
                      className="nb-card p-4 sm:p-5 bg-white dark:bg-[#16263D] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#171717] dark:hover:shadow-[5px_5px_0px_#001722] transition-all cursor-pointer flex flex-col justify-between gap-3 text-left border-2 border-charcoal dark:border-[#34465D]"
                    >
                      <div className="space-y-2">
                        {/* Header: Status Badge & Date */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`nb-badge text-[10px] font-extrabold ${
                              isAnswered
                                ? 'bg-[#123D32] text-[#D6AD52] dark:bg-[#4CA7A1] dark:text-[#001722]'
                                : 'bg-[#C94A4A] text-white'
                            }`}
                          >
                            {isAnswered ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 inline mr-1 shrink-0" />
                                <span>{statusLabel}</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 inline mr-1 shrink-0" />
                                <span>{statusLabel}</span>
                              </>
                            )}
                          </span>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                              {new Date(item.createdAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>

                            {item.studentId === user?.uid && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConsultationToDelete(item);
                                }}
                                className="p-1 rounded text-[#C94A4A] dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900 transition cursor-pointer"
                                title="Hapus pertanyaan ini dari riwayat saya"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Original Question Content - Truncated with line-clamp */}
                        <p className="font-medium text-xs sm:text-sm text-charcoal dark:text-offwhite line-clamp-3 leading-relaxed font-sans">
                          {item.content}
                        </p>
                      </div>

                      {/* Footer Cue: Click to open */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs text-[#123D32] dark:text-[#4CA7A1] font-extrabold">
                        <span>Buka Konsultasi</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Share Q&A Modal */}
      <ShareQAModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        consultation={shareItem}
        initialTab={shareTab}
      />

      {/* Confirmation Modal for Student Deleting Own Question */}
      <ConfirmModal
        isOpen={Boolean(consultationToDelete)}
        onClose={() => setConsultationToDelete(null)}
        onConfirm={handleConfirmDeleteUserConsultation}
        title="Hapus Pertanyaan Konsultasi Saya"
        itemName={consultationToDelete?.title}
        message="Apakah Anda yakin ingin menghapus pertanyaan ini secara permanen dari riwayat Anda? Seluruh balasan dan rangkaian diskusi lanjutan terkait juga akan terhapus secara permanen dari Cloud Firestore."
        confirmText="Hapus Permanen"
        isDangerous={true}
        loading={deleting}
      />
    </div>
  );
};
