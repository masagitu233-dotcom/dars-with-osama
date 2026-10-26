import React, { useState, useEffect } from 'react';
import {
  Search,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  ChevronRight,
  UserCheck,
  Send,
  Lock,
  Share2,
  Copy,
  Check
} from 'lucide-react';
import { Consultation } from '../../types';
import { getPublishedPublicQA } from '../../firebase/services';
import { classifyFirestoreError } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { autoWrapArabicText } from '../../utils/arabicFontHelper';
import { ShareQAModal } from './ShareQAModal';
import { useQASEO } from '../../hooks/useQASEO';
import { ServiceDisruptionBanner } from '../common/ServiceDisruptionBanner';
import { canAttemptRetry, DEFAULT_RETRY_COOLDOWN_SECONDS } from '../../utils/serviceDisruptionHelper';

interface PublicQAViewProps {
  onNavigateToConsultation: () => void;
  initialQaId?: string | null;
}

function stripHtmlTags(html: string): string {
  if (!html) return '';
  const clean = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return clean;
}

export const PublicQAView: React.FC<PublicQAViewProps> = ({
  onNavigateToConsultation,
  initialQaId
}) => {
  const { user, openAuthModal, showToast } = useAuth();
  const [qaList, setQaList] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [qaError, setQaError] = useState<{ category: string; summary: string; code: string } | null>(null);
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState<number>(0);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [selectedQaForShare, setSelectedQaForShare] = useState<Consultation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeQAForSEO = qaList.find(q => q.id === expandedId) || null;
  useQASEO(activeQAForSEO);

  const loadPublicQA = async (isManualRetry = false) => {
    if (isManualRetry) {
      if (!canAttemptRetry(lastFetchTimestamp, DEFAULT_RETRY_COOLDOWN_SECONDS)) {
        return;
      }
      setIsRetrying(true);
    } else {
      setLoading(true);
    }
    setLastFetchTimestamp(Date.now());

    try {
      const list = await getPublishedPublicQA();
      setQaList(list);
      setQaError(null);
    } catch (err) {
      console.warn('Error loading public Q&A:', err);
      const diag = classifyFirestoreError(err);
      setQaError(diag);
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    loadPublicQA();
  }, []);

  useEffect(() => {
    if (!initialQaId && typeof window === 'undefined') return;
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const targetId = initialQaId || urlParams?.get('qaId');

    if (targetId) {
      setExpandedId(targetId);
      setTimeout(() => {
        const el = document.getElementById(`qa-${targetId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [initialQaId, qaList]);

  const handleToggleExpand = (itemId: string) => {
    if (expandedId === itemId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(itemId);
  };

  const handleAskQuestion = () => {
    if (!user) {
      openAuthModal('login', {
        type: 'enroll',
        onSuccess: () => {
          onNavigateToConsultation();
        }
      });
      return;
    }
    onNavigateToConsultation();
  };

  const handleOpenShareModal = (item: Consultation) => {
    setSelectedQaForShare(item);
    setShareModalOpen(true);
  };

  const handleCopyDirectLink = async (item: Consultation) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://darswithosama.com';
    const directUrl = `${origin}/qa/${encodeURIComponent(item.id)}`;

    try {
      await navigator.clipboard.writeText(directUrl);
      setCopiedId(item.id);
      showToast('Link pertanyaan berhasil disalin! Buka tautan untuk membaca jawaban lengkap.');
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      showToast('Gagal menyalin tautan.');
    }
  };

  const filteredQA = qaList.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const plainReply = stripHtmlTags(item.replyContent || '');
    return (
      item.title.toLowerCase().includes(q) ||
      item.content.toLowerCase().includes(q) ||
      plainReply.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto px-2.5 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-fade-in font-sans">
      {/* HEADER HERO BANNER */}
      <div className="relative overflow-hidden rounded-lg bg-[#06251D] text-[#F8F3E8] p-6 sm:p-10 border-2 border-[#171717] dark:border-[#D9AC45] shadow-[6px_6px_0px_#171717] dark:shadow-[6px_6px_0px_#000000]">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#D9AC45] border-2 border-[#171717] text-[#171717] text-xs font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#171717]" />
            <span>Arsip Tanya Jawab Pembelajaran Publik</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold font-serif text-white leading-tight">
            Tanya Jawab Syar'i & Pembelajaran
          </h1>

          <p className="text-xs sm:text-sm text-[#F8F3E8]/85 leading-relaxed font-sans">
            Kumpulan pertanyaan dan jawaban resmi seputar kajian, kitab turats, serta fiqih pembelajaran yang telah disetujui dan diverifikasi oleh Ustaz & Pembimbing Dars with Osama.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={handleAskQuestion}
              className="nb-btn nb-btn-gold px-5 py-2.5 text-xs"
            >
              <Send className="w-4 h-4" />
              <span>Ajukan Pertanyaan Baru</span>
            </button>

            <div className="flex items-center gap-1.5 text-xs text-[#D9AC45] font-bold">
              <Lock className="w-3.5 h-3.5 text-[#D9AC45]" />
              <span>Privasi Penanya Terjaga (Anonim)</span>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 nb-card p-4 sm:p-5">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#06251D] dark:text-[#D9AC45]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kata kunci pertanyaan atau jawaban..."
            className="nb-input pl-10 pr-4 py-2.5 text-xs"
          />
        </div>

        <div className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] shrink-0">
          Menampilkan <strong className="text-[#06251D] dark:text-[#D9AC45]">{filteredQA.length}</strong> Tanya Jawab Publik
        </div>
      </div>

      {/* SERVICE DISRUPTION BANNER WHEN DATA IS RETAINED IN MEMORY */}
      {qaError && qaList.length > 0 && (
        <ServiceDisruptionBanner
          category={qaError.category}
          code={qaError.code}
          onRetry={() => loadPublicQA(true)}
          isRetrying={isRetrying}
          lastAttemptTimestamp={lastFetchTimestamp}
          mode="banner"
          hasExistingData={true}
        />
      )}

      {/* QA LIST ACCORDION */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#06251D] dark:border-[#D9AC45] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-[#171717]/70 dark:text-[#F8F3E8]/70">
            Memuat arsip tanya jawab publik...
          </p>
        </div>
      ) : filteredQA.length === 0 ? (
        qaError && qaList.length === 0 ? (
          <ServiceDisruptionBanner
            category={qaError.category}
            code={qaError.code}
            onRetry={() => loadPublicQA(true)}
            isRetrying={isRetrying}
            lastAttemptTimestamp={lastFetchTimestamp}
            mode="full"
            hasExistingData={false}
          />
        ) : (
          <div className="p-12 text-center nb-card space-y-3">
            <HelpCircle className="w-10 h-10 text-[#06251D] dark:text-[#D9AC45] mx-auto" />
            <h3 className="text-base font-bold font-serif text-[#171717] dark:text-[#F8F3E8]">
              Belum Ada Tanya Jawab Publik
            </h3>
            <p className="text-xs text-[#171717]/75 dark:text-[#F8F3E8]/75 max-w-md mx-auto leading-relaxed">
              {searchQuery
                ? `Tidak ditemukan tanya jawab yang cocok dengan kata kunci "${searchQuery}".`
                : 'Belum ada pertanyaan materi yang dipublikasikan. Anda dapat menjadi yang pertama mengajukan pertanyaan.'}
            </p>
            <button
              onClick={handleAskQuestion}
              className="nb-btn nb-btn-primary mt-2 px-5 py-2.5 text-xs"
            >
              Kirim Pertanyaan Konsultasi
            </button>
          </div>
        )
      ) : (
        <div className="space-y-5">
          {filteredQA.map((item) => {
            const isExpanded = expandedId === item.id;
            const isDirectTarget = initialQaId === item.id;
            const plainAnswer = stripHtmlTags(item.replyContent || '');
            const shortAnswerPreview = plainAnswer.length > 150 ? plainAnswer.slice(0, 150) + '...' : plainAnswer;
            const shortQuestionPreview = item.content.length > 120 ? item.content.slice(0, 120) + '...' : item.content;

            return (
              <div
                key={item.id}
                id={`qa-${item.id}`}
                className={`nb-card p-3.5 sm:p-6 space-y-3.5 sm:space-y-4 ${
                  isDirectTarget
                    ? 'ring-2 ring-[#D9AC45]'
                    : ''
                }`}
              >
                {/* QA Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="px-2.5 py-0.5 rounded bg-[#06251D] text-[#D9AC45] font-extrabold uppercase tracking-wider border border-[#171717] dark:border-[#D9AC45]">
                        Materi & Pembelajaran
                      </span>
                      <span className="px-2.5 py-0.5 rounded bg-[#D9AC45] text-[#171717] font-extrabold uppercase tracking-wider border border-[#171717] flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Jawaban Resmi Ustaz</span>
                      </span>
                      {isDirectTarget && (
                        <span className="px-2 py-0.5 rounded bg-[#3478F6] text-white font-extrabold text-[10px] border border-[#171717]">
                          Tautan Langsung
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-xl font-bold font-serif text-[#171717] dark:text-[#F8F3E8] pt-1">
                      {item.title}
                    </h3>

                    {/* Anonymous Author Attribution */}
                    <div className="flex items-center gap-2 text-[11px] font-bold text-[#171717]/75 dark:text-[#F8F3E8]/75">
                      <UserCheck className="w-3.5 h-3.5 text-[#06251D] dark:text-[#D9AC45]" />
                      <span>Penanya: <strong>Penanya (Anonim)</strong></span>
                      <span>•</span>
                      <span>
                        {item.publishedAt
                          ? new Date(item.publishedAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })
                          : 'Terbit'}
                      </span>
                    </div>
                  </div>

                  {/* Header Quick Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenShareModal(item)}
                      className="nb-btn nb-btn-secondary p-2"
                      title="Bagikan Pertanyaan"
                    >
                      <Share2 className="w-4 h-4 text-[#06251D] dark:text-[#D9AC45]" />
                    </button>

                    <button
                      onClick={() => handleToggleExpand(item.id)}
                      className={`nb-btn px-3.5 py-2 text-xs ${
                        isExpanded ? 'nb-btn-secondary' : 'nb-btn-primary'
                      }`}
                      title={isExpanded ? 'Sembunyikan rincian' : 'Tampilkan rincian'}
                    >
                      {isExpanded ? (
                        <>
                          <span>Tutup</span>
                          <ChevronRight className="w-3.5 h-3.5 rotate-90 transition-transform" />
                        </>
                      ) : (
                        <>
                          <span>Baca Jawaban Lengkap</span>
                          <ChevronRight className="w-3.5 h-3.5 transition-transform text-[#D9AC45]" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Collapsed Preview State vs Expanded Full Content */}
                {!isExpanded ? (
                  <div className="p-3 sm:p-4 rounded-md bg-[#F8F3E8] dark:bg-[#06251D] border-0 sm:border-2 border-[#171717] dark:border-[#D9AC45]/60 space-y-2">
                    <p className="text-xs text-[#171717] dark:text-[#F8F3E8] line-clamp-2 leading-relaxed">
                      <strong className="font-extrabold text-[#06251D] dark:text-[#D9AC45]">Pertanyaan: </strong>
                      {shortQuestionPreview}
                    </p>
                    {plainAnswer && (
                      <p className="text-xs text-[#171717]/85 dark:text-[#F8F3E8]/85 line-clamp-2 leading-relaxed font-sans pt-2 border-t border-[#171717]/15 dark:border-[#D9AC45]/25">
                        <strong className="font-extrabold text-[#06251D] dark:text-[#D9AC45]">Cuplikan Jawaban: </strong>
                        {shortAnswerPreview}
                      </p>
                    )}

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => handleOpenShareModal(item)}
                          className="font-extrabold text-[#06251D] dark:text-[#D9AC45] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Bagikan</span>
                        </button>
                        <span>•</span>
                        <button
                          onClick={() => handleCopyDirectLink(item)}
                          className="font-extrabold text-[#171717] dark:text-[#F8F3E8] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {copiedId === item.id ? <Check className="w-3 h-3 text-[#06251D] dark:text-[#D9AC45]" /> : <Copy className="w-3 h-3 text-[#D9AC45]" />}
                          <span>{copiedId === item.id ? 'Tersalin' : 'Salin Link'}</span>
                        </button>
                      </div>

                      <button
                        onClick={() => handleToggleExpand(item.id)}
                        className="font-extrabold text-[#06251D] dark:text-[#D9AC45] hover:underline cursor-pointer"
                      >
                        Baca Selengkapnya →
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Expanded Full Detail */
                  <div className="space-y-4 animate-fade-in">
                    {/* Full Question Body */}
                    <div className="p-3 sm:p-4 rounded-md bg-[#F8F3E8] dark:bg-[#06251D] border-0 sm:border-2 border-[#171717] dark:border-[#D9AC45]/60 space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#06251D] dark:text-[#D9AC45] block">
                        Pertanyaan Lengkap:
                      </span>
                      <p className="text-xs sm:text-sm text-[#171717] dark:text-[#F8F3E8] leading-relaxed whitespace-pre-line font-sans">
                        {item.content}
                      </p>
                    </div>

                    {/* Full Formatted Rich-Text Answer */}
                    {item.replyContent && (
                      <div className="p-3 sm:p-6 rounded-md bg-white dark:bg-[#06251D] border-0 sm:border-2 border-t-2 sm:border-t-2 border-[#D9AC45] sm:border-[#171717] sm:border-l-8 sm:border-l-[#D9AC45] dark:border-[#D9AC45] dark:sm:border-[#D9AC45] space-y-3 sm:space-y-4">
                        <div className="flex items-center justify-between pb-2.5 border-b-2 border-[#171717]/15 dark:border-[#D9AC45]/25">
                          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold font-serif text-[#06251D] dark:text-[#D9AC45]">
                            <ShieldCheck className="w-4 h-4 text-[#D9AC45]" />
                            <span>Jawaban Resmi Ustaz / Pembimbing Dars with Osama:</span>
                          </div>
                          {item.repliedAt && (
                            <span className="text-[11px] font-bold text-[#171717]/70 dark:text-[#F8F3E8]/70">
                              {new Date(item.repliedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>

                        <div
                          className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-[#171717] dark:text-[#F8F3E8] leading-relaxed space-y-3 font-sans blog-content"
                          dangerouslySetInnerHTML={{ __html: autoWrapArabicText(item.replyContent) }}
                        />

                        {/* ACTION TOOLBAR: Bagikan Pertanyaan & Salin Link */}
                        <div className="pt-4 border-t-2 border-[#171717]/15 dark:border-[#D9AC45]/25 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                            <button
                              onClick={() => handleOpenShareModal(item)}
                              className="nb-btn nb-btn-gold px-3.5 py-2 text-xs"
                              title="Bagikan pertanyaan ke WhatsApp, Telegram, Facebook, dll"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Bagikan Pertanyaan</span>
                            </button>

                            <button
                              onClick={() => handleCopyDirectLink(item)}
                              className="nb-btn nb-btn-secondary px-3.5 py-2 text-xs"
                              title="Salin tautan permanen pertanyaan ini"
                            >
                              {copiedId === item.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-[#06251D] dark:text-[#D9AC45]" />
                                  <span>Tersalin</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-[#D9AC45]" />
                                  <span>Salin Link</span>
                                </>
                              )}
                            </button>
                          </div>

                          <span className="text-[11px] font-bold text-[#171717]/65 dark:text-[#F8F3E8]/65 italic">
                            Sarana dakwah & penyebaran ilmu
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* FOOTER CTA BANNER */}
      <div className="p-6 sm:p-8 bg-[#06251D] text-white border-2 border-[#171717] dark:border-[#D9AC45] rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[6px_6px_0px_#171717] dark:shadow-[6px_6px_0px_#000000]">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-base sm:text-lg font-bold font-serif">
            Memiliki Pertanyaan Seputar Pelajaran?
          </h4>
          <p className="text-xs text-[#F8F3E8]/85">
            Kirimkan pertanyaan Anda secara mudah melalui Ruang Konsultasi Siswa.
          </p>
        </div>
        <button
          onClick={handleAskQuestion}
          className="nb-btn nb-btn-gold px-6 py-2.5 text-xs shrink-0"
        >
          Masuk ke Ruang Konsultasi
        </button>
      </div>

      {/* SHARE MODAL */}
      <ShareQAModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        consultation={selectedQaForShare}
      />
    </div>
  );
};
