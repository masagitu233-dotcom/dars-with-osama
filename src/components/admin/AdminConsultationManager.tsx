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
  Share2
} from 'lucide-react';
import { Consultation } from '../../types';
import {
  getAllConsultationsForAdmin,
  replyConsultation,
  togglePublishConsultation,
  updateConsultationStatus
} from '../../firebase/services';
import { getWhatsAppConsultationUrl } from '../../config/whatsappConfig';
import { RichTextEditor } from './RichTextEditor';
import { ShareQAModal } from '../consultation/ShareQAModal';
import { useAuth } from '../../context/AuthContext';

export const AdminConsultationManager: React.FC = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'learning' | 'private'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'answered' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active modal for reply/manage
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [replyInput, setReplyInput] = useState<string>('');

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
    setErrorMessage('');
    setToastMessage('');
  };

  const closeManageModal = () => {
    setSelectedConsultation(null);
    setReplyInput('');
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
      setToastMessage('Balasan berhasil dikirim kepada siswa!');
      await loadConsultations();
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

  const handleTogglePublish = async (item: Consultation) => {
    if (item.category === 'private') {
      setErrorMessage('Konsultasi bersifat pribadi dan TIDAK BOLEH dipublikasikan!');
      return;
    }

    const nextState = !item.isPublished;
    setActionLoading(`publish-${item.id}`);
    try {
      await togglePublishConsultation(item.id, nextState);
      setToastMessage(
        nextState
          ? 'Pertanyaan berhasil dipublikasikan di Halaman Q&A Publik!'
          : 'Pertanyaan berhasil disembunyikan dari Halaman Q&A Publik.'
      );
      await loadConsultations();
      if (selectedConsultation?.id === item.id) {
        setSelectedConsultation((prev) => (prev ? { ...prev, isPublished: nextState } : null));
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
      setToastMessage(`Status konsultasi diperbarui menjadi ${newStatus}.`);
      await loadConsultations();
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
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchContent = item.content.toLowerCase().includes(q);
      const matchName = (item.studentName || '').toLowerCase().includes(q);
      const matchEmail = (item.studentEmail || '').toLowerCase().includes(q);
      return matchTitle || matchContent || matchName || matchEmail;
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
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 nb-card bg-white dark:bg-[#16263D] p-4">
        {/* Search Input (Col 5) */}
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray dark:text-blue-gray" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul, isi, nama atau email siswa..."
            className="nb-input w-full pl-10 pr-3 py-2 text-xs"
          />
        </div>

        {/* Category Filter (Col 4) */}
        <div className="md:col-span-4 flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#123D32] dark:text-[#D6AD52] shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="nb-input w-full px-3 py-2 text-xs font-bold"
          >
            <option value="all">Semua Kategori</option>
            <option value="learning">📖 Materi & Pembelajaran</option>
            <option value="private">🔒 Konsultasi Pribadi</option>
          </select>
        </div>

        {/* Status Filter (Col 3) */}
        <div className="md:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="nb-input w-full px-3 py-2 text-xs font-bold"
          >
            <option value="all">Semua Status</option>
            <option value="pending">⏳ Menunggu</option>
            <option value="answered">✓ Sudah Dijawab</option>
            <option value="closed">Selesai</option>
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
          {filteredList.map((item) => (
            <div
              key={item.id}
              className="nb-card bg-white dark:bg-[#16263D] p-5 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`nb-badge ${
                        item.category === 'private'
                          ? 'bg-[#F04438] text-white'
                          : 'bg-[#123D32] text-[#D6AD52]'
                      }`}
                    >
                      {item.category === 'private' ? '🔒 Konsultasi Pribadi' : '📖 Materi & Pembelajaran'}
                    </span>

                    <span
                      className={`nb-badge ${
                        item.status === 'answered'
                          ? 'bg-[#D6AD52] text-charcoal'
                          : item.status === 'closed'
                          ? 'bg-[#FAF7F0] dark:bg-[#243A56] text-charcoal dark:text-offwhite'
                          : 'bg-[#3478F6] text-white'
                      }`}
                    >
                      {item.status === 'answered'
                        ? '✓ Sudah Dijawab'
                        : item.status === 'closed'
                        ? 'Selesai'
                        : '⏳ Menunggu Balasan'}
                    </span>

                    {item.isPublished && (
                      <span className="nb-badge bg-[#3478F6] text-white">
                        <Eye className="w-3 h-3" />
                        <span>Terbit di Q&A Publik</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-extrabold font-serif-brand text-charcoal dark:text-offwhite">
                    {item.title}
                  </h3>

                  {/* Student Identity Information */}
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

              {/* Publication Control for Learning Category */}
              <div className="pt-3 border-t-2 border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                {item.category === 'private' ? (
                  <span className="text-[11px] text-[#F04438] font-extrabold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Konsultasi Pribadi (Dilarang Dipublikasi)</span>
                  </span>
                ) : (
                  <button
                    onClick={() => handleTogglePublish(item)}
                    disabled={actionLoading === `publish-${item.id}`}
                    className={`nb-btn px-3 py-1.5 text-xs ${
                      item.isPublished
                        ? 'nb-btn-danger'
                        : 'nb-btn-gold'
                    }`}
                  >
                    {item.isPublished ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Sembunyikan dari Q&A Publik</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Setujui & Terbitkan ke Q&A Publik</span>
                      </>
                    )}
                  </button>
                )}

                {item.isPublished && item.category === 'learning' && item.replyContent && (
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

                <a
                  href={getWhatsAppConsultationUrl({
                    id: item.id,
                    title: item.title,
                    category: item.category,
                    studentName: item.studentName
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#123D32] dark:text-[#D6AD52] font-extrabold hover:underline"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Hubungi Siswa di WhatsApp</span>
                </a>
              </div>
            </div>
          ))}
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

            {/* Reply Rich Text Editor Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-charcoal dark:text-offwhite">
                Tulis Balasan Resmi Ustaz / Admin (Format Teks Kaya & Ayat Al-Qur'an):
              </label>
              <RichTextEditor
                value={replyInput}
                onChange={setReplyInput}
                placeholder="Tuliskan balasan, dalil, dan penjelasan ilmiah secara santun..."
                minHeight="220px"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t-2 border-charcoal dark:border-[#D6AD52]/50">
              {selectedConsultation.category === 'learning' ? (
                <button
                  type="button"
                  onClick={() => handleTogglePublish(selectedConsultation)}
                  className={`nb-btn px-3.5 py-2 text-xs ${
                    selectedConsultation.isPublished
                      ? 'nb-btn-danger'
                      : 'nb-btn-gold'
                  }`}
                >
                  {selectedConsultation.isPublished ? 'Sembunyikan dari Publik' : 'Terbitkan ke Q&A Publik'}
                </button>
              ) : (
                <span className="text-[11px] text-[#F04438] font-extrabold">
                  🔒 Privat (TIDAK Boleh Dipublikasi)
                </span>
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
