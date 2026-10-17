import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Lock,
  BookOpen,
  CheckCircle2,
  Clock,
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
  ChevronRight,
  ShieldCheck
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
import { autoWrapArabicText } from '../../utils/arabicFontHelper';

export const AdminConsultationManager: React.FC = () => {
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

  const loadConsultations = async () => {
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
  }, []);

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
      // Update local active state
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#071B16] border border-[#073B2E]/15 dark:border-[#C9A34E]/25 rounded-3xl p-6 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-300">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>Panel Administrasi Konsultasi</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif-brand text-[#073B2E] dark:text-[#F7F6EF]">
            Kelola Konsultasi & Q&A Siswa
          </h2>
          <p className="text-xs text-[#6B7C7A] dark:text-[#8C9E9B]">
            Membaca pertanyaan masuk, memberikan balasan resmi, mengelola status, serta menyetujui publikasi Q&A.
          </p>
        </div>

        <button
          onClick={loadConsultations}
          className="px-4 py-2 bg-[#073B2E] text-white hover:bg-[#0a4d3c] rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
        >
          Refresh Data
        </button>
      </div>

      {toastMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-2xl flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage('')} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FILTER & SEARCH CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white dark:bg-[#071B16] border border-[#073B2E]/15 dark:border-[#C9A34E]/25 rounded-2xl p-4 shadow-xs">
        
        {/* Search Input (Col 5) */}
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7C7A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul, isi, nama atau email siswa..."
            className="w-full pl-10 pr-3 py-2 bg-[#F7F6EF]/80 dark:bg-[#0c2b23] border border-[#073B2E]/20 dark:border-[#143e33] rounded-xl text-xs text-[#073B2E] dark:text-[#F7F6EF] focus:outline-hidden focus:ring-2 focus:ring-[#C9A34E]"
          />
        </div>

        {/* Category Filter (Col 3.5) */}
        <div className="md:col-span-4 flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#C9A34E] shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="w-full px-3 py-2 bg-[#F7F6EF]/80 dark:bg-[#0c2b23] border border-[#073B2E]/20 dark:border-[#143e33] rounded-xl text-xs text-[#073B2E] dark:text-[#F7F6EF] focus:outline-hidden"
          >
            <option value="all">Semua Kategori</option>
            <option value="learning">📖 Materi & Pembelajaran</option>
            <option value="private">🔒 Konsultasi Pribadi</option>
          </select>
        </div>

        {/* Status Filter (Col 3.5) */}
        <div className="md:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 bg-[#F7F6EF]/80 dark:bg-[#0c2b23] border border-[#073B2E]/20 dark:border-[#143e33] rounded-xl text-xs text-[#073B2E] dark:text-[#F7F6EF] focus:outline-hidden"
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
        <div className="py-16 text-center text-xs text-[#6B7C7A] dark:text-[#8C9E9B]">
          Memuat data konsultasi siswa...
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#071B16] border border-[#073B2E]/15 dark:border-[#C9A34E]/25 rounded-3xl space-y-2">
          <MessageSquare className="w-8 h-8 text-[#C9A34E] mx-auto opacity-70" />
          <p className="text-sm font-bold text-[#073B2E] dark:text-[#F7F6EF]">
            Tidak Ada Konsultasi Ditemukan
          </p>
          <p className="text-xs text-[#6B7C7A] dark:text-[#8C9E9B]">
            Coba ubah kata kunci pencarian atau filter status/kategori.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-[#071B16] border border-[#073B2E]/15 dark:border-[#C9A34E]/25 rounded-2xl p-5 shadow-xs hover:shadow-md transition space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                        item.category === 'private'
                          ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300'
                          : 'bg-[#073B2E]/10 dark:bg-[#C9A34E]/20 text-[#073B2E] dark:text-[#F4B942] border-[#C9A34E]/40'
                      }`}
                    >
                      {item.category === 'private' ? '🔒 Konsultasi Pribadi' : '📖 Materi & Pembelajaran'}
                    </span>

                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                        item.status === 'answered'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                          : item.status === 'closed'
                          ? 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300'
                          : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 animate-pulse'
                      }`}
                    >
                      {item.status === 'answered'
                        ? '✓ Sudah Dijawab'
                        : item.status === 'closed'
                        ? 'Selesai'
                        : '⏳ Menunggu Balasan'}
                    </span>

                    {item.isPublished && (
                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 flex items-center gap-1">
                        <Eye className="w-3 h-3 text-blue-600" />
                        <span>Terbit di Q&A Publik</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold font-serif-brand text-[#073B2E] dark:text-[#F7F6EF]">
                    {item.title}
                  </h3>

                  {/* Student Identity Information */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B7C7A] dark:text-[#8C9E9B]">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-[#C9A34E]" />
                      <strong>{item.studentName}</strong>
                    </span>
                    {item.studentEmail && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-[#6B7C7A]" />
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
                    className="px-3.5 py-2 bg-[#073B2E] dark:bg-[#123B6D] hover:bg-[#0a4d3c] text-white rounded-xl text-xs font-bold shadow transition cursor-pointer flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#F4B942]" />
                    <span>{item.replyContent ? 'Edit Balasan' : 'Jawab Pertanyaan'}</span>
                  </button>
                </div>
              </div>

              {/* Question Preview */}
              <div className="p-3.5 bg-[#F7F6EF]/60 dark:bg-[#0c2b23] border border-[#073B2E]/10 dark:border-[#143e33] rounded-xl text-xs text-[#073B2E]/80 dark:text-[#F7F6EF]/80 line-clamp-3 whitespace-pre-line font-sans">
                {item.content}
              </div>

              {/* Admin Reply Preview */}
              {item.replyContent && (
                <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/50 border-l-4 border-[#0EA5A4] rounded-r-xl text-xs text-[#073B2E] dark:text-[#F7F6EF] space-y-1 font-sans">
                  <span className="font-bold text-[11px] text-[#0EA5A4] block">
                    Balasan Admin Saat Ini:
                  </span>
                  <p className="line-clamp-2 whitespace-pre-line">{item.replyContent}</p>
                </div>
              )}

              {/* Publication Control for Learning Category */}
              <div className="pt-2 border-t border-[#073B2E]/10 dark:border-[#143e33] flex flex-wrap items-center justify-between gap-2 text-xs">
                {item.category === 'private' ? (
                  <span className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Konsultasi Pribadi (Dilarang Dipublikasi)</span>
                  </span>
                ) : (
                  <button
                    onClick={() => handleTogglePublish(item)}
                    disabled={actionLoading === `publish-${item.id}`}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      item.isPublished
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 hover:bg-rose-200 border border-rose-300'
                        : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 border border-emerald-300'
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

                <a
                  href={getWhatsAppConsultationUrl({
                    id: item.id,
                    title: item.title,
                    category: item.category,
                    studentName: item.studentName
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Hubungi Siswa di WhatsApp</span>
                </a>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* MODAL EDIT BALASAN & STATUS */}
      {selectedConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#071B16] border border-[#073B2E]/20 dark:border-[#C9A34E]/30 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 my-auto">
            
            <div className="flex items-center justify-between border-b border-[#073B2E]/10 dark:border-[#C9A34E]/20 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-[#C9A34E]" />
                <div>
                  <h3 className="font-bold text-lg font-serif-brand text-[#073B2E] dark:text-[#F7F6EF]">
                    Respon & Kelola Konsultasi
                  </h3>
                  <p className="text-xs text-[#6B7C7A] dark:text-[#8C9E9B]">
                    ID: {selectedConsultation.id}
                  </p>
                </div>
              </div>

              <button
                onClick={closeManageModal}
                className="p-2 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 text-rose-800 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Student Info Card */}
            <div className="p-4 rounded-2xl bg-[#F7F6EF]/80 dark:bg-[#0c2b23] border border-[#073B2E]/10 dark:border-[#143e33] space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-[#073B2E] dark:text-[#F4B942]">
                  Informasi Penanya:
                </span>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                    selectedConsultation.category === 'private'
                      ? 'bg-purple-100 text-purple-800 border-purple-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                >
                  {selectedConsultation.category === 'private' ? '🔒 Konsultasi Pribadi' : '📖 Materi & Pembelajaran'}
                </span>
              </div>

              <p className="text-[#073B2E] dark:text-[#F7F6EF]">
                <strong>Nama:</strong> {selectedConsultation.studentName} ({selectedConsultation.studentEmail || 'Tanpa Email'})
              </p>

              <div className="pt-1">
                <strong className="block text-[#073B2E] dark:text-[#F4B942]">Judul:</strong>
                <span className="font-serif-brand font-bold text-sm text-[#073B2E] dark:text-[#F7F6EF]">
                  {selectedConsultation.title}
                </span>
              </div>

              <div className="pt-1">
                <strong className="block text-[#073B2E] dark:text-[#F4B942]">Isi Pertanyaan:</strong>
                <p className="mt-1 p-3 rounded-xl bg-white dark:bg-[#071B16] border border-[#073B2E]/10 dark:border-[#143e33] text-xs text-[#073B2E] dark:text-[#F7F6EF] leading-relaxed whitespace-pre-line font-sans">
                  {selectedConsultation.content}
                </p>
              </div>
            </div>

            {/* Status Change Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#073B2E] dark:text-[#F7F6EF]">
                Ubah Status Konsultasi:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedConsultation, 'pending')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    selectedConsultation.status === 'pending'
                      ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-500 text-amber-900 dark:text-amber-300'
                      : 'bg-stone-50 dark:bg-[#0c2b23] border-stone-200 dark:border-[#143e33] text-stone-600 dark:text-stone-400'
                  }`}
                >
                  ⏳ Menunggu
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedConsultation, 'answered')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    selectedConsultation.status === 'answered'
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-emerald-300'
                      : 'bg-stone-50 dark:bg-[#0c2b23] border-stone-200 dark:border-[#143e33] text-stone-600 dark:text-stone-400'
                  }`}
                >
                  ✓ Sudah Dijawab
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedConsultation, 'closed')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    selectedConsultation.status === 'closed'
                      ? 'bg-stone-200 dark:bg-stone-800 border-stone-500 text-stone-900 dark:text-stone-200'
                      : 'bg-stone-50 dark:bg-[#0c2b23] border-stone-200 dark:border-[#143e33] text-stone-600 dark:text-stone-400'
                  }`}
                >
                  Selesai
                </button>
              </div>
            </div>

            {/* Reply Rich Text Editor Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#073B2E] dark:text-[#F7F6EF]">
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#073B2E]/10 dark:border-[#C9A34E]/20">
              {selectedConsultation.category === 'learning' ? (
                <button
                  type="button"
                  onClick={() => handleTogglePublish(selectedConsultation)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    selectedConsultation.isPublished
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  }`}
                >
                  {selectedConsultation.isPublished ? 'Sembunyikan dari Publik' : 'Terbitkan ke Q&A Publik'}
                </button>
              ) : (
                <span className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold">
                  🔒 Privat (TIDAK Boleh Dipublikasi)
                </span>
              )}

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={closeManageModal}
                  className="px-4 py-2 bg-stone-100 dark:bg-[#0c2b23] text-[#073B2E] dark:text-[#F7F6EF] rounded-xl text-xs font-bold border border-stone-200 dark:border-[#143e33] transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={actionLoading === 'reply'}
                  className="px-5 py-2 bg-[#073B2E] dark:bg-[#123B6D] hover:bg-[#0a4d3c] text-white rounded-xl text-xs font-bold shadow transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-[#F4B942]" />
                  <span>{actionLoading === 'reply' ? 'Menyimpan...' : 'Kirim Balasan'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
