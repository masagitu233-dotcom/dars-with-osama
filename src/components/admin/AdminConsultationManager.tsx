import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Lock,
  CheckCircle2,
  Send,
  Eye,
  EyeOff,
  Filter,
  Search,
  ShieldAlert,
  User,
  Mail,
  Calendar,
  AlertCircle,
  MessageCircle,
  X,
  ShieldCheck,
  Share2,
  Scissors,
  Split,
  FileText,
  Heading1 as Heading1Icon,
  HelpCircle,
  Hash,
  BookmarkCheck,
  Phone,
  Copy,
  ExternalLink,
  Check,
  Globe
} from 'lucide-react';
import { Consultation } from '../../types';
import {
  getAllConsultationsForAdmin,
  replyConsultation,
  togglePublishConsultation,
  updateConsultationStatus,
  dispatchNotificationEmail
} from '../../firebase/services';
import { getWhatsAppConsultationUrl } from '../../config/whatsappConfig';
import { RichTextEditor, RichTextEditorRef } from './RichTextEditor';
import { ShareQAModal } from '../consultation/ShareQAModal';
import { QATableOfContents } from '../consultation/QATableOfContents';
import {
  getAnswerSectionStats,
  splitQAAnswer,
  unmarkSectionInHtml,
  getConsultationAdminStatus,
  buildAdminWhatsAppUrl,
  normalizeWhatsAppForWaMe
} from '../../utils/qaHelper';
import { useAuth } from '../../context/AuthContext';

interface AdminConsultationManagerProps {
  onConsultationUpdated?: () => void;
}

export const AdminConsultationManager: React.FC<AdminConsultationManagerProps> = ({
  onConsultationUpdated
}) => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'learning' | 'private'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'answered' | 'closed'>('all');
  const [publicationFilter, setPublicationFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Confirmation modal for publishing private consultations
  const [confirmPrivatePublishItem, setConfirmPrivatePublishItem] = useState<Consultation | null>(null);

  // WhatsApp dispatch modal state
  const [whatsappModalItem, setWhatsappModalItem] = useState<Consultation | null>(null);
  const [whatsappDraftMessage, setWhatsappDraftMessage] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Active modal for reply/manage
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [replyInput, setReplyInput] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // Share & Dakwah Card Modal State for Admin
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [selectedQaForShare, setSelectedQaForShare] = useState<Consultation | null>(null);
  const [shareTab, setShareTab] = useState<'share' | 'card'>('share');

  const loadConsultations = async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      const list = await getAllConsultationsForAdmin();
      setConsultations(list);
    } catch (err) {
      console.warn('Error loading admin consultations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConsultations();
  }, [user?.uid, isAdmin, authLoading]);

  const openManageModal = (item: Consultation) => {
    setSelectedConsultation(item);
    setReplyInput(item.replyContent || '');
    setShowPreview(false);
    setErrorMessage('');
    setToastMessage('');
  };

  const closeManageModal = () => {
    setSelectedConsultation(null);
    setReplyInput('');
    setShowPreview(false);
  };

  const openWhatsAppModal = (item: Consultation) => {
    if (!item.whatsappNumber) return;
    setWhatsappModalItem(item);
    const name = item.studentName || 'Bapak/Ibu/Saudara/i';
    const hasReply = Boolean(item.replyContent && item.replyContent.trim().length > 0);
    const consultationLink = item.isPublished
      ? `https://darswithosama.com/qa/${item.id}`
      : `https://darswithosama.com/`;

    const defaultMessage = `Assalamu'alaikum Warahmatullahi Wabarakatuh ${name},

Pemberitahuan dari Dars with Osama seputar konsultasi Anda:
*Topik:* ${item.title}

${hasReply ? 'Alhamdulillah, balasan dan arahan resmi untuk pertanyaan Anda telah selesai dijawab oleh Ustaz / Admin Dars with Osama di website.' : 'Pertanyaan Anda telah kami terima dan sedang ditinjau oleh Ustaz / Admin Dars with Osama.'}

${item.isPublished ? `Anda juga dapat membaca pertanyaan dan jawaban lengkap melalui tautan berikut:\n${consultationLink}` : 'Silakan masuk ke Ruang Konsultasi pada akun website Anda untuk membaca balasan lengkap.'}

Jazakumullahu khairan.
_Admin Dars with Osama_`;

    setWhatsappDraftMessage(defaultMessage);
    setCopiedKey(null);
  };

  const closeWhatsAppModal = () => {
    setWhatsappModalItem(null);
    setWhatsappDraftMessage('');
    setCopiedKey(null);
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2500);
  };

  const handleOpenWhatsAppUrl = () => {
    if (!whatsappModalItem?.whatsappNumber) return;
    const url = buildAdminWhatsAppUrl(whatsappModalItem, whatsappDraftMessage);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const editorRef = React.useRef<RichTextEditorRef>(null);

  const handleMarkSelection = (type: 'ringkas' | 'mendetail') => {
    setErrorMessage('');
    const res = editorRef.current?.markSelectionAs(type);
    if (!res?.success) {
      if (res?.reason === 'no_selection') {
        setErrorMessage(
          `Silakan blok atau seleksi teks pada editor yang ingin dijadikan Jawaban ${
            type === 'ringkas' ? 'Ringkas' : 'Mendetail'
          } terlebih dahulu.`
        );
      } else {
        setErrorMessage('Gagal menandai seleksi. Pastikan kursor berada di dalam editor.');
      }
    } else {
      setToastMessage(
        `Teks yang dipilih berhasil ditandai sebagai Jawaban ${
          type === 'ringkas' ? 'Ringkas' : 'Mendetail'
        }.`
      );
    }
  };

  const handleUnmarkSection = (type: 'ringkas' | 'mendetail') => {
    editorRef.current?.unmarkSection(type);
    setToastMessage(
      `Penandaan Jawaban ${type === 'ringkas' ? 'Ringkas' : 'Mendetail'} berhasil dihapus. Teks tetap tersimpan utuh.`
    );
  };

  const handleSendReply = async () => {
    if (!selectedConsultation) return;
    if (!replyInput.trim()) {
      setErrorMessage('Isi balasan tidak boleh kosong.');
      return;
    }

    setActionLoading('reply');
    setErrorMessage('');
    try {
      await replyConsultation(selectedConsultation.id, replyInput.trim(), 'answered');

      if (selectedConsultation.studentEmail) {
        dispatchNotificationEmail({
          type: 'qa',
          title: selectedConsultation.title,
          summary: selectedConsultation.content.substring(0, 160),
          targetUrl: `https://darswithosama.com/qa/${selectedConsultation.id}`,
          recipientEmails: [selectedConsultation.studentEmail],
          idempotencyKey: `qa-${selectedConsultation.id}-replied-${Date.now()}`
        }).catch(err => console.warn('QA notification notice:', err));
      }

      setToastMessage('Balasan berhasil disimpan ke Cloud Firebase dan dikirim kepada siswa!');
      await loadConsultations();
      onConsultationUpdated?.();
      setSelectedConsultation((prev) =>
        prev
          ? {
              ...prev,
              replyContent: replyInput.trim(),
              status: 'answered',
              repliedBy: 'Ustaz / Admin',
              repliedAt: new Date().toISOString()
            }
          : null
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal mengirim balasan.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestTogglePublish = (item: Consultation) => {
    setErrorMessage('');
    const nextState = !item.isPublished;

    if (nextState) {
      const hasReply = Boolean(item.replyContent && item.replyContent.trim().length > 0);
      if (!hasReply) {
        setErrorMessage('Konsultasi belum memiliki balasan dari admin. Tuliskan jawaban terlebih dahulu sebelum memublikasikannya.');
        return;
      }

      if (item.category === 'private') {
        setConfirmPrivatePublishItem(item);
        return;
      }

      handleExecutePublish(item, true, false);
    } else {
      handleExecutePublish(item, false, false);
    }
  };

  const handleExecutePublish = async (item: Consultation, nextState: boolean, withConsent: boolean = false) => {
    setActionLoading(`publish-${item.id}`);
    setErrorMessage('');
    try {
      await togglePublishConsultation(item.id, nextState, withConsent);
      setToastMessage(
        nextState
          ? item.category === 'private'
            ? 'Konsultasi privat berhasil dipublikasikan dengan persetujuan penanya (identitas penanya dianonimkan untuk publik)!'
            : 'Pertanyaan berhasil dipublikasikan ke Cloud Firebase (Halaman Q&A Publik)!'
          : 'Pertanyaan berhasil disembunyikan dari Q&A Publik di Cloud Firebase.'
      );
      setConfirmPrivatePublishItem(null);
      await loadConsultations();
      onConsultationUpdated?.();
      if (selectedConsultation?.id === item.id) {
        setSelectedConsultation((prev) =>
          prev
            ? {
                ...prev,
                isPublished: nextState,
                publishedWithConsent: withConsent ? true : prev.publishedWithConsent,
                publishedWithConsentAt: withConsent ? new Date().toISOString() : prev.publishedWithConsentAt
              }
            : null
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal mengubah status publikasi.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (item: Consultation, newStatus: 'pending' | 'answered' | 'closed') => {
    setActionLoading(`status-${item.id}`);
    try {
      await updateConsultationStatus(item.id, newStatus);
      setToastMessage(`Status konsultasi berhasil diperbarui menjadi ${newStatus} di Cloud Firebase.`);
      await loadConsultations();
      onConsultationUpdated?.();
      if (selectedConsultation?.id === item.id) {
        setSelectedConsultation((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal memperbarui status.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredList = consultations.filter((item) => {
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (publicationFilter === 'published' && !item.isPublished) return false;
    if (publicationFilter === 'unpublished' && item.isPublished) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchContent = item.content.toLowerCase().includes(q);
      const matchName = (item.studentName || '').toLowerCase().includes(q);
      const matchEmail = (item.studentEmail || '').toLowerCase().includes(q);
      const matchPhone = (item.whatsappNumber || '').toLowerCase().includes(q);
      return matchTitle || matchContent || matchName || matchEmail || matchPhone;
    }
    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* HEADER TITLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 nb-card bg-white dark:bg-[#16263D] p-6">
        <div className="space-y-1.5">
          <div className="nb-badge bg-[#D6AD52] text-charcoal">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Panel Administrasi Konsultasi</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold font-serif-brand text-charcoal dark:text-offwhite">
            Kelola Konsultasi & Q&A Siswa
          </h2>
          <p className="text-xs text-slate-gray dark:text-blue-gray">
            Membaca pertanyaan masuk, memberikan balasan resmi, mengelola status, serta menyetujui publikasi Q&A.
          </p>
        </div>

        <button
          onClick={loadConsultations}
          className="nb-btn nb-btn-primary px-4 py-2.5 text-xs shrink-0"
        >
          Refresh Data
        </button>
      </div>

      {toastMessage && (
        <div className="p-4 bg-[#D6AD52] border-2 border-charcoal shadow-[4px_4px_0px_#292D2B] text-charcoal font-bold text-xs rounded-md flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage('')} className="p-1 hover:bg-black/10 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FILTER & SEARCH CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 nb-card bg-white dark:bg-[#16263D] p-4">
        {/* Search Input (Col 4) */}
        <div className="md:col-span-4 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray dark:text-blue-gray" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul, nama, email, nomor WA..."
            className="nb-input w-full pl-10 pr-3 py-2 text-xs"
          />
        </div>

        {/* Category Filter (Col 3) */}
        <div className="md:col-span-3 flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-[#123D32] dark:text-[#D6AD52] shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="nb-input w-full px-2.5 py-2 text-xs font-bold"
          >
            <option value="all">Semua Kategori</option>
            <option value="learning">📖 Materi & Pelajaran</option>
            <option value="private">🔒 Konsultasi Privat</option>
          </select>
        </div>

        {/* Status Filter (Col 2) */}
        <div className="md:col-span-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="nb-input w-full px-2.5 py-2 text-xs font-bold"
          >
            <option value="all">Semua Respon</option>
            <option value="pending">⏳ Menunggu</option>
            <option value="answered">✓ Sudah Dijawab</option>
            <option value="closed">Selesai</option>
          </select>
        </div>

        {/* Publication Filter (Col 3) */}
        <div className="md:col-span-3">
          <select
            value={publicationFilter}
            onChange={(e) => setPublicationFilter(e.target.value as any)}
            className="nb-input w-full px-2.5 py-2 text-xs font-bold"
          >
            <option value="all">Semua Status Publikasi</option>
            <option value="published">👁 Terbit di Q&A Publik</option>
            <option value="unpublished">🔒 Belum Terbit (Privat/Draft)</option>
          </select>
        </div>
      </div>

      {/* TABLE / LIST OF CONSULTATIONS */}
      {loading ? (
        <div className="py-16 text-center text-xs font-bold text-slate-gray dark:text-blue-gray">
          Memuat data konsultasi siswa...
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-12 text-center nb-card bg-white dark:bg-[#16263D] space-y-2">
          <MessageSquare className="w-8 h-8 text-[#D6AD52] mx-auto" />
          <p className="text-sm font-extrabold text-charcoal dark:text-offwhite">
            Tidak Ada Konsultasi Ditemukan
          </p>
          <p className="text-xs text-slate-gray dark:text-blue-gray">
            Coba ubah kata kunci pencarian atau filter status/kategori.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map((item) => {
            const statusInfo = getConsultationAdminStatus(item);
            return (
              <div
                key={item.id}
                className="nb-card bg-white dark:bg-[#16263D] p-5 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    {/* Clear Separate Badges: Privacy vs Resolution */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Privacy Badge */}
                      <span className={`nb-badge ${statusInfo.privacyBadgeClass}`}>
                        {item.category === 'private' ? (
                          <Lock className="w-3 h-3 inline mr-1 shrink-0" />
                        ) : (
                          <Globe className="w-3 h-3 inline mr-1 shrink-0" />
                        )}
                        <span>{statusInfo.privacyLabel}</span>
                      </span>

                      {/* Resolution Badge */}
                      <span className={`nb-badge ${statusInfo.resolutionBadgeClass}`}>
                        {statusInfo.isAnswered ? (
                          <CheckCircle2 className="w-3 h-3 inline mr-1 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3 h-3 inline mr-1 shrink-0" />
                        )}
                        <span>{statusInfo.resolutionLabel}</span>
                      </span>

                      {/* Explicit Consent Badge for Private Consultations */}
                      {item.publishedWithConsent && (
                        <span className="nb-badge bg-[#D6AD52] text-charcoal border-charcoal font-bold text-[10px]">
                          <Check className="w-3 h-3 inline mr-0.5 shrink-0" />
                          <span>Izin Publikasi Diperoleh</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-extrabold font-serif-brand text-charcoal dark:text-offwhite">
                      {item.title}
                    </h3>

                    {/* Student Identity Information (Admin Only) */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-gray dark:text-blue-gray font-medium">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-[#123D32] dark:text-[#D6AD52]" />
                        <strong>{item.studentName}</strong>
                      </span>
                      {item.studentEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          <span>{item.studentEmail}</span>
                        </span>
                      )}
                      {item.whatsappNumber ? (
                        <span className="flex items-center gap-1 text-[#25D366] font-bold">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{item.whatsappNumber}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-400 text-[11px] italic">
                          <span>(Tanpa WhatsApp)</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {new Date(item.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Actions Button Bar */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openManageModal(item)}
                      className="nb-btn nb-btn-primary px-3.5 py-2 text-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#D6AD52]" />
                      <span>{item.replyContent ? 'Edit Balasan' : 'Jawab Pertanyaan'}</span>
                    </button>
                  </div>
                </div>

                {/* Question Preview */}
                <div className="p-3.5 bg-[#FAF7F0] dark:bg-[#243A56] border-2 border-charcoal dark:border-[#34465D] rounded-md text-xs text-charcoal dark:text-offwhite line-clamp-3 whitespace-pre-line font-sans">
                  {item.content}
                </div>

                {/* Admin Reply Preview */}
                {item.replyContent && (
                  <div className="p-3.5 bg-white dark:bg-[#243A56] border-2 border-charcoal border-l-4 border-l-[#D6AD52] rounded-md text-xs text-charcoal dark:text-offwhite space-y-1 font-sans">
                    <span className="font-extrabold text-[11px] text-[#123D32] dark:text-[#D6AD52] block">
                      Balasan Admin Saat Ini:
                    </span>
                    <p className="line-clamp-2 whitespace-pre-line">{item.replyContent}</p>
                  </div>
                )}

                {/* Publication Control & WhatsApp Action Bar */}
                <div className="pt-3 border-t-2 border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.isPublished ? (
                      <button
                        type="button"
                        onClick={() => handleRequestTogglePublish(item)}
                        disabled={actionLoading === `publish-${item.id}`}
                        className="nb-btn nb-btn-danger px-3 py-1.5 text-xs flex items-center gap-1.5"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Sembunyikan dari Q&A Publik</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRequestTogglePublish(item)}
                        disabled={actionLoading === `publish-${item.id}`}
                        className={`nb-btn px-3 py-1.5 text-xs flex items-center gap-1.5 ${
                          item.category === 'private'
                            ? 'bg-[#123D32] hover:bg-[#1a4f41] text-[#D6AD52] border-2 border-charcoal'
                            : 'nb-btn-gold'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>
                          {item.category === 'private'
                            ? 'Publikasikan Konsultasi (Perlu Izin)'
                            : 'Setujui & Terbitkan ke Q&A Publik'}
                        </span>
                      </button>
                    )}

                    {item.isPublished && item.replyContent && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedQaForShare(item);
                          setShareTab('share');
                          setShareModalOpen(true);
                        }}
                        className="nb-btn bg-[#3478F6] text-white border-2 border-charcoal px-3 py-1.5 text-xs"
                        title="Bagikan Tautan / Buat Gambar Kartu Dakwah"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Bagikan / Buat Kartu</span>
                      </button>
                    )}
                  </div>

                  {/* WhatsApp Direct Contact / Notification Button */}
                  {item.whatsappNumber ? (
                    <button
                      type="button"
                      onClick={() => openWhatsAppModal(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/50 text-xs text-[#123D32] dark:text-[#CEFEF1] font-extrabold transition cursor-pointer"
                      title="Buka dialog pengiriman balasan ke nomor WhatsApp siswa"
                    >
                      <MessageCircle className="w-4 h-4 text-[#25D366]" />
                      <span>Hubungi Siswa di WhatsApp</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 opacity-40" />
                      <span>Nomor WhatsApp tidak dicantumkan oleh penanya</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL EDIT BALASAN & STATUS */}
      {selectedConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl nb-card bg-white dark:bg-[#16263D] p-6 sm:p-8 space-y-6 my-auto">
            <div className="flex items-center justify-between border-b-2 border-charcoal dark:border-[#D6AD52]/50 pb-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-[#123D32] dark:text-[#D6AD52]" />
                <div>
                  <h3 className="font-extrabold text-lg font-serif-brand text-charcoal dark:text-offwhite">
                    Respon & Kelola Konsultasi
                  </h3>
                  <p className="text-xs text-slate-gray dark:text-blue-gray font-mono">
                    ID: {selectedConsultation.id}
                  </p>
                </div>
              </div>

              <button
                onClick={closeManageModal}
                className="nb-btn nb-btn-secondary p-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-[#F04438] text-white border-2 border-charcoal text-xs font-bold rounded-md flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Student Info Card */}
            <div className="p-4 rounded-md bg-[#FAF7F0] dark:bg-[#243A56] border-2 border-charcoal dark:border-[#34465D] space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-extrabold text-[#123D32] dark:text-[#D6AD52]">
                  Informasi Penanya:
                </span>
                <span
                  className={`nb-badge ${
                    selectedConsultation.category === 'private'
                      ? 'bg-[#F04438] text-white'
                      : 'bg-[#123D32] text-[#D6AD52]'
                  }`}
                >
                  {selectedConsultation.category === 'private' ? '🔒 Konsultasi Pribadi' : '📖 Materi & Pembelajaran'}
                </span>
              </div>

              <p className="text-charcoal dark:text-offwhite">
                <strong>Nama:</strong> {selectedConsultation.studentName} ({selectedConsultation.studentEmail || 'Tanpa Email'})
                {selectedConsultation.whatsappNumber && (
                  <span className="ml-2 inline-flex items-center gap-1 font-bold text-[#25D366]">
                    <Phone className="w-3.5 h-3.5" />
                    <span>WA: {selectedConsultation.whatsappNumber}</span>
                  </span>
                )}
              </p>

              <div className="pt-1">
                <strong className="block text-[#123D32] dark:text-[#D6AD52]">Judul:</strong>
                <span className="font-serif-brand font-extrabold text-sm text-charcoal dark:text-offwhite">
                  {selectedConsultation.title}
                </span>
              </div>

              <div className="pt-1">
                <strong className="block text-[#123D32] dark:text-[#D6AD52]">Isi Pertanyaan:</strong>
                <p className="mt-1 p-3 rounded-md bg-white dark:bg-[#16263D] border-2 border-charcoal dark:border-[#34465D] text-xs text-charcoal dark:text-offwhite leading-relaxed whitespace-pre-line font-sans">
                  {selectedConsultation.content}
                </p>
              </div>
            </div>

            {/* Status Change Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-charcoal dark:text-offwhite">
                Ubah Status Konsultasi:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedConsultation, 'pending')}
                  className={`nb-btn py-2 px-3 text-xs justify-center ${
                    selectedConsultation.status === 'pending'
                      ? 'nb-btn-gold'
                      : 'nb-btn-secondary'
                  }`}
                >
                  ⏳ Menunggu
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedConsultation, 'answered')}
                  className={`nb-btn py-2 px-3 text-xs justify-center ${
                    selectedConsultation.status === 'answered'
                      ? 'nb-btn-primary'
                      : 'nb-btn-secondary'
                  }`}
                >
                  ✓ Sudah Dijawab
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedConsultation, 'closed')}
                  className={`nb-btn py-2 px-3 text-xs justify-center ${
                    selectedConsultation.status === 'closed'
                      ? 'bg-charcoal text-white border-2 border-charcoal'
                      : 'nb-btn-secondary'
                  }`}
                >
                  Selesai
                </button>
              </div>
            </div>

            {/* Reply Rich Text Editor with Explicit Selection-Based Section Marking */}
            {(() => {
              const stats = getAnswerSectionStats(replyInput, selectedConsultation.id);
              const previewSections = splitQAAnswer(replyInput, selectedConsultation.id);

              return (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-extrabold text-charcoal dark:text-offwhite flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#123D32] dark:text-[#D6AD52]" />
                      <span>Tulis Balasan Resmi Ustaz / Admin:</span>
                    </label>

                    {/* Mode Status Pill */}
                    <div className="flex items-center gap-1.5 text-[11px] font-bold">
                      {stats.isExplicitlyMarked ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#123D32]/10 dark:bg-[#4CA7A1]/20 text-[#123D32] dark:text-[#CEFEF1] border border-[#123D32]/30 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#123D32] dark:bg-[#4CA7A1] animate-pulse" />
                          <span>
                            {stats.hasRingkas && stats.hasMendetail
                              ? 'Bagian Ringkas & Mendetail Ditandai'
                              : stats.hasRingkas
                              ? 'Hanya Jawaban Ringkas Ditandai'
                              : 'Hanya Jawaban Mendetail Ditandai'}
                          </span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-[#16263D] text-[#8C6D1F] dark:text-[#D6AD52] border border-[#8C6D1F]/30 flex items-center gap-1.5 font-bold">
                          <span className="w-2 h-2 rounded-full bg-[#D6AD52]" />
                          <span>Belum Ditentukan (Jawaban Utuh)</span>
                        </span>
                      )}

                      {stats.totalH1Count > 0 && (
                        <span className="px-2 py-0.5 rounded bg-[#D6AD52]/20 text-[#171717] dark:text-[#CEFEF1] border border-[#D6AD52]/40 font-mono text-[10px] font-bold">
                          {stats.totalH1Count} H1 TOC
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Section Controls Toolbar */}
                  <div className="p-3 sm:p-3.5 rounded-md bg-[#FAF7F0] dark:bg-[#102C2B] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#071918] space-y-2.5">
                    {/* Guidance Prompt as requested by user */}
                    <div className="flex items-start gap-2 text-xs text-[#171717] dark:text-[#CEFEF1]">
                      <HelpCircle className="w-4 h-4 shrink-0 text-[#123D32] dark:text-[#D6AD52] mt-0.5" />
                      <p className="leading-snug">
                        <strong className="font-extrabold text-[#123D32] dark:text-[#D6AD52]">Petunjuk Penandaan: </strong>
                        Seleksi teks yang ingin ditandai, lalu pilih jenis jawaban. Anda dapat mengubah penandaan kapan saja sebelum menerbitkan.
                      </p>
                    </div>

                    {/* Main Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#171717]/15 dark:border-[#4CA7A1]/30">
                      {/* Button: Tandai sebagai Jawaban Ringkas */}
                      <button
                        type="button"
                        data-testid="mark-as-ringkas-btn"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleMarkSelection('ringkas')}
                        className="nb-btn px-3 py-2 text-xs flex items-center gap-1.5 bg-[#123D32] hover:bg-[#1a4f41] text-[#D6AD52] border-2 border-[#171717] shadow-2xs font-extrabold cursor-pointer transition active:translate-y-0.5"
                        title="Blok teks pada editor lalu klik tombol ini untuk menetapkannya sebagai Jawaban Ringkas"
                      >
                        <BookmarkCheck className="w-4 h-4 text-[#D6AD52]" />
                        <span>Tandai sebagai Jawaban Ringkas</span>
                      </button>

                      {/* Button: Tandai sebagai Jawaban Mendetail */}
                      <button
                        type="button"
                        data-testid="mark-as-mendetail-btn"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleMarkSelection('mendetail')}
                        className="nb-btn px-3 py-2 text-xs flex items-center gap-1.5 bg-[#D6AD52] hover:bg-[#e2bb63] text-[#171717] border-2 border-[#171717] shadow-2xs font-extrabold cursor-pointer transition active:translate-y-0.5"
                        title="Blok teks pada editor lalu klik tombol ini untuk menetapkannya sebagai Jawaban Mendetail"
                      >
                        <BookmarkCheck className="w-4 h-4 text-[#171717]" />
                        <span>Tandai sebagai Jawaban Mendetail</span>
                      </button>

                      {/* Button: Pratinjau Struktur & TOC */}
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setShowPreview(!showPreview)}
                        className={`nb-btn px-3 py-2 text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs font-bold transition ml-auto ${
                          showPreview ? 'nb-btn-primary' : 'nb-btn-secondary'
                        }`}
                        title="Lihat hasil pemisahan dan Daftar Isi sebelum publikasi"
                      >
                        {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showPreview ? 'Tutup Pratinjau' : 'Pratinjau Struktur & TOC'}</span>
                      </button>
                    </div>

                    {/* Status & Unmark Controls Strip */}
                    <div className="pt-2 border-t border-[#171717]/10 dark:border-[#4CA7A1]/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                      {!stats.isExplicitlyMarked ? (
                        <div className="p-2 rounded bg-amber-50 dark:bg-[#16263D] border border-amber-300 dark:border-amber-600 text-amber-900 dark:text-amber-200 text-[11px] font-semibold w-full flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                          <span>
                            <strong>Pemberitahuan:</strong> Bagian jawaban belum ditentukan. Silakan seleksi teks dan pilih salah satu tombol di atas jika ingin membagi menjadi Jawaban Ringkas dan Mendetail.
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                          <div className="flex flex-wrap items-center gap-2.5">
                            {stats.hasRingkas && (
                              <div className="flex items-center gap-1.5 p-1.5 rounded bg-white dark:bg-[#163835] border border-[#123D32]/30 text-[11px]">
                                <span className="w-2 h-2 rounded-full bg-[#123D32]" />
                                <span className="font-bold text-[#123D32] dark:text-[#CEFEF1]">
                                  Jawaban Ringkas: {stats.ringkasWords} kata
                                  {stats.ringkasH1Count > 0 ? ` (${stats.ringkasH1Count} H1)` : ''}
                                </span>
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => handleUnmarkSection('ringkas')}
                                  className="text-red-600 dark:text-red-400 hover:underline font-bold text-[10px] ml-1 flex items-center gap-0.5 cursor-pointer"
                                  title="Hapus penandaan Jawaban Ringkas (teks tetap tersimpan)"
                                >
                                  <X className="w-3 h-3" />
                                  <span>Hapus Penandaan</span>
                                </button>
                              </div>
                            )}

                            {stats.hasMendetail && (
                              <div className="flex items-center gap-1.5 p-1.5 rounded bg-white dark:bg-[#163835] border border-[#D6AD52]/40 text-[11px]">
                                <span className="w-2 h-2 rounded-full bg-[#D6AD52]" />
                                <span className="font-bold text-[#171717] dark:text-[#CEFEF1]">
                                  Jawaban Mendetail: {stats.mendetailWords} kata
                                  {stats.mendetailH1Count > 0 ? ` (${stats.mendetailH1Count} H1)` : ''}
                                </span>
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => handleUnmarkSection('mendetail')}
                                  className="text-red-600 dark:text-red-400 hover:underline font-bold text-[10px] ml-1 flex items-center gap-0.5 cursor-pointer"
                                  title="Hapus penandaan Jawaban Mendetail (teks tetap tersimpan)"
                                >
                                  <X className="w-3 h-3" />
                                  <span>Hapus Penandaan</span>
                                </button>
                              </div>
                            )}
                          </div>

                          <span className="text-[11px] text-[#525856] dark:text-[#A6D6C9] font-medium flex items-center gap-1 ml-auto">
                            <Hash className="w-3 h-3 text-[#123D32] dark:text-[#D6AD52]" />
                            <span>Judul <strong>Heading 1 (H1)</strong> otomatis masuk TOC.</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rich Text Editor with Ref and qaSectionMode enabled */}
                  <RichTextEditor
                    ref={editorRef}
                    qaSectionMode={true}
                    value={replyInput}
                    onChange={setReplyInput}
                    placeholder="Tuliskan balasan, dalil, dan penjelasan ilmiah secara santun..."
                    minHeight="220px"
                  />

                  {/* Live Preview Panel when showPreview is active */}
                  {showPreview && (
                    <div className="p-3.5 sm:p-4 rounded-md bg-[#FAF7F0] dark:bg-[#0D2B36] border-2 border-[#123D32] dark:border-[#4CA7A1] shadow-[3px_3px_0px_#123D32] dark:shadow-[3px_3px_0px_#071918] space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between pb-2 border-b border-[#171717]/15 dark:border-[#4CA7A1]/30">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#123D32] dark:text-[#CEFEF1] font-serif">
                          <Eye className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1]" />
                          <span>Pratinjau Hasil Jawaban & Daftar Isi Otomatis:</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-[#525856] dark:text-[#A6D6C9]">
                          Live Real-time
                        </span>
                      </div>

                      {/* Realtime Table of Contents */}
                      {previewSections.sections.length > 0 ? (
                        <QATableOfContents sections={previewSections.sections} />
                      ) : (
                        <div className="p-2.5 rounded bg-white dark:bg-[#163835] border border-dashed border-[#171717]/30 text-xs text-[#525856] dark:text-[#A6D6C9] italic text-center">
                          Daftar isi belum memiliki sub-bab. Tambahkan judul dengan format <strong>Heading 1</strong> di dalam editor untuk memunculkannya di sini.
                        </div>
                      )}

                      {/* Split Preview Boxes: ONLY render sections that actually exist */}
                      {previewSections.isExplicitlyMarked ? (
                        <div className={`grid gap-3 pt-1 ${previewSections.hasRingkas && previewSections.hasMendetail ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                          {previewSections.hasRingkas && (
                            <div className="p-3 rounded bg-white dark:bg-[#163835] border border-[#171717]/20 dark:border-[#4CA7A1]/30 space-y-1.5">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#123D32] dark:text-[#4CA7A1] block border-b pb-1">
                                1. Jawaban Ringkas ({stats.ringkasWords} kata):
                              </span>
                              <div
                                className="prose dark:prose-invert max-w-none text-xs leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: previewSections.ringkasHtml }}
                              />
                            </div>
                          )}

                          {previewSections.hasMendetail && (
                            <div className="p-3 rounded bg-white dark:bg-[#163835] border border-[#171717]/20 dark:border-[#4CA7A1]/30 space-y-1.5">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#D6AD52] block border-b pb-1">
                                2. Jawaban Mendetail ({stats.mendetailWords} kata):
                              </span>
                              <div
                                className="prose dark:prose-invert max-w-none text-xs leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: previewSections.mendetailHtml }}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Unmarked / Legacy Answer Preview */
                        <div className="p-3 rounded bg-white dark:bg-[#163835] border border-[#171717]/20 dark:border-[#4CA7A1]/30 space-y-1.5">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#525856] dark:text-[#A6D6C9] block border-b pb-1">
                            Jawaban Lengkap (Belum Dibagi):
                          </span>
                          <div
                            className="prose dark:prose-invert max-w-none text-xs leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: previewSections.unmarkedHtml || replyInput }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t-2 border-charcoal dark:border-[#D6AD52]/50">
              {selectedConsultation.isPublished ? (
                <button
                  type="button"
                  onClick={() => handleRequestTogglePublish(selectedConsultation)}
                  disabled={actionLoading === `publish-${selectedConsultation.id}`}
                  className="nb-btn nb-btn-danger px-3.5 py-2 text-xs flex items-center gap-1.5"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Sembunyikan dari Publik</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRequestTogglePublish(selectedConsultation)}
                  disabled={actionLoading === `publish-${selectedConsultation.id}`}
                  className={`nb-btn px-3.5 py-2 text-xs flex items-center gap-1.5 ${
                    selectedConsultation.category === 'private'
                      ? 'bg-[#123D32] hover:bg-[#1a4f41] text-[#D6AD52] border-2 border-charcoal'
                      : 'nb-btn-gold'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>
                    {selectedConsultation.category === 'private'
                      ? 'Publikasikan Konsultasi (Perlu Izin)'
                      : 'Terbitkan ke Q&A Publik'}
                  </span>
                </button>
              )}

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={closeManageModal}
                  className="nb-btn nb-btn-secondary px-4 py-2 text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={actionLoading === 'reply'}
                  className="nb-btn nb-btn-primary px-5 py-2 text-xs disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-[#D6AD52]" />
                  <span>{actionLoading === 'reply' ? 'Menyimpan...' : 'Kirim Balasan'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG KONFIRMASI PUBLIKASI KONSULTASI PRIBADI */}
      {confirmPrivatePublishItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-lg nb-card bg-white dark:bg-[#16263D] p-6 space-y-5 border-3 border-charcoal shadow-[6px_6px_0px_#292D2B]">
            <div className="flex items-center gap-3 text-[#B42318] dark:text-[#F04438] border-b-2 border-charcoal/20 pb-3">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-extrabold text-base font-serif-brand text-charcoal dark:text-offwhite">
                  Konfirmasi Publikasi Konsultasi Pribadi
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  ID: {confirmPrivatePublishItem.id}
                </p>
              </div>
            </div>

            {/* Exact Prompt Required by User Brief */}
            <div className="p-4 rounded-md bg-[#FFF5E9] dark:bg-[#201515] border-2 border-[#D6AD52] text-xs text-charcoal dark:text-offwhite leading-relaxed space-y-2">
              <p className="font-bold text-[#6C151E] dark:text-[#FFB3B8]">
                Pertanyaan ini merupakan konsultasi pribadi. Pastikan Anda telah menghubungi penanya dan memperoleh persetujuannya untuk menampilkan pertanyaan beserta jawaban kepada publik.
              </p>
              <div className="pt-2 border-t border-charcoal/10 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                <p>
                  <strong>Catatan Privasi:</strong> Ketika dipublikasikan, identitas penanya akan secara otomatis diubah menjadi <em>"Penanya (Anonim)"</em> pada tampilan publik, dan seluruh nomor WhatsApp serta email siswa tetap terlindungi (hanya dapat diakses oleh Admin).
                </p>
                <p>
                  <strong>Topik:</strong> {confirmPrivatePublishItem.title}
                </p>
                <p>
                  <strong>Penanya:</strong> {confirmPrivatePublishItem.studentName}
                </p>
              </div>
            </div>

            {/* Action Buttons with Exact Labels */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPrivatePublishItem(null)}
                className="w-full sm:w-auto nb-btn nb-btn-secondary px-4 py-2.5 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleExecutePublish(confirmPrivatePublishItem, true, true)}
                disabled={actionLoading === `publish-${confirmPrivatePublishItem.id}`}
                className="w-full sm:w-auto nb-btn px-4 py-2.5 text-xs font-extrabold bg-[#123D32] hover:bg-[#1a4f41] text-[#D6AD52] border-2 border-charcoal shadow-2xs"
              >
                Saya telah memperoleh persetujuan, lanjutkan publikasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PENGIRIMAN BALASAN KE WHATSAPP SISWA */}
      {whatsappModalItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-lg nb-card bg-white dark:bg-[#16263D] p-6 space-y-5 border-3 border-charcoal shadow-[6px_6px_0px_#292D2B]">
            <div className="flex items-center justify-between border-b-2 border-charcoal/20 pb-3">
              <div className="flex items-center gap-2.5 text-[#123D32] dark:text-[#25D366]">
                <MessageCircle className="w-6 h-6 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-base font-serif-brand text-charcoal dark:text-offwhite">
                    Hubungi Siswa di WhatsApp
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Tujuan: {normalizeWhatsAppForWaMe(whatsappModalItem.whatsappNumber)}
                  </p>
                </div>
              </div>
              <button
                onClick={closeWhatsAppModal}
                className="nb-btn nb-btn-secondary p-1.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Recipient Details Card */}
            <div className="p-3 rounded-md bg-[#FAF7F0] dark:bg-[#243A56] border-2 border-charcoal text-xs space-y-1 text-charcoal dark:text-offwhite">
              <div className="flex items-center justify-between">
                <span><strong>Penerima:</strong> {whatsappModalItem.studentName}</span>
                <span className="nb-badge bg-[#25D366] text-charcoal font-bold text-[10px]">
                  {whatsappModalItem.whatsappNumber}
                </span>
              </div>
              <p className="line-clamp-1"><strong>Topik:</strong> {whatsappModalItem.title}</p>
            </div>

            {/* Draft Message Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-extrabold text-charcoal dark:text-offwhite">
                <span>Pratinjau / Sesuaikan Isi Pesan WhatsApp:</span>
                <span className="text-[10px] text-slate-500 font-normal">Dapat diedit bebas</span>
              </div>
              <textarea
                value={whatsappDraftMessage}
                onChange={(e) => setWhatsappDraftMessage(e.target.value)}
                rows={8}
                className="nb-input w-full p-3 text-xs leading-relaxed font-sans"
                placeholder="Tuliskan pesan..."
              />
              <p className="text-[11px] text-slate-500 italic">
                * Pesan tidak akan dikirim otomatis oleh sistem. Mengklik tombol di bawah akan membuka aplikasi WhatsApp resmi dengan pesan yang sudah terisi.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-charcoal/15">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyText(whatsappDraftMessage, 'msg')}
                  className="nb-btn nb-btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
                >
                  {copiedKey === 'msg' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'msg' ? 'Tersalin!' : 'Salin Pesan'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const link = whatsappModalItem.isPublished
                      ? `https://darswithosama.com/qa/${whatsappModalItem.id}`
                      : `https://darswithosama.com/`;
                    handleCopyText(link, 'link');
                  }}
                  className="nb-btn nb-btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
                >
                  {copiedKey === 'link' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'link' ? 'Tautan Tersalin!' : 'Salin Tautan'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeWhatsAppModal}
                  className="nb-btn nb-btn-secondary px-3.5 py-1.5 text-xs"
                >
                  Tutup
                </button>

                <button
                  type="button"
                  onClick={handleOpenWhatsAppUrl}
                  className="nb-btn px-4 py-1.5 text-xs flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-charcoal border-2 border-charcoal font-extrabold shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BAGIKAN & BUAT KARTU DAKWAH */}
      <ShareQAModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        consultation={selectedQaForShare}
        initialTab={shareTab}
      />
    </div>
  );
};
