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
import { ReadingFontControls, useReadingFontSize } from '../common/ReadingFontControls';
import { FeatureShareModal } from '../common/FeatureShareModal';
import { TANYA_JAWAB_SHARE_CONFIG } from '../../utils/featureShareHelper';

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
  const fontControl = useReadingFontSize();

  const [qaError, setQaError] = useState<{ category: string; summary: string; code: string } | null>(null);
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState<number>(0);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [featureShareModalOpen, setFeatureShareModalOpen] = useState<boolean>(false);
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
      <div className="relative overflow-hidden rounded-lg bg-[#123D32] dark:bg-[#1F5F63] text-[#FAF7F0] dark:text-[#CEFEF1] p-6 sm:p-10 border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[6px_6px_0px_#171717] dark:shadow-[6px_6px_0px_#001722]">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#4CA7A1] border-2 border-[#171717] dark:border-[#001722] text-[#001722] text-xs font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#001722]" />
            <span>Arsip Tanya Jawab Pembelajaran Publik</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif text-white leading-tight">
            Tanya Jawab Syar'i & Pembelajaran
          </h1>

          <p className="text-xs sm:text-sm text-[#FAF7F0]/90 dark:text-[#A6D6C9] leading-relaxed font-sans">
            Kumpulan pertanyaan dan jawaban resmi seputar kajian, kitab turats, serta fiqih pembelajaran yang telah disetujui dan diverifikasi oleh Ustaz & Pembimbing Dars with Osama.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={handleAskQuestion}
              className="px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-md border-2 border-[#171717] dark:border-[#001722] bg-[#4CA7A1] hover:bg-[#5EBEB7] text-[#001722] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722] transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Ajukan Pertanyaan Baru</span>
            </button>

            <button
              type="button"
              data-testid="share-qa-page-btn"
              onClick={() => setFeatureShareModalOpen(true)}
              className="px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-md border-2 border-[#171717] dark:border-[#001722] bg-[#D6AD52] hover:bg-[#E5BE65] text-[#171923] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722] transition-all inline-flex items-center gap-2 cursor-pointer"
              title="Bagikan tautan halaman utama Tanya Jawab"
            >
              <Share2 className="w-4 h-4 text-[#171923]" />
              <span>Bagikan Tanya Jawab</span>
            </button>

            <div className="flex items-center gap-1.5 text-xs text-[#CEFEF1] font-bold">
              <Lock className="w-3.5 h-3.5 text-[#CEFEF1]" />
              <span>Privasi Penanya Terjaga (Anonim)</span>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTER BAR + READING FONT CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 nb-card p-4 sm:p-5">
        <div className="relative w-full md:max-w-md flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#123D32] dark:text-[#4CA7A1]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kata kunci pertanyaan atau jawaban..."
            className="nb-input pl-10 pr-4 py-2.5 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 shrink-0">
          <div className="text-xs font-extrabold text-[#171717] dark:text-[#A6D6C9]">
            Menampilkan <strong className="text-[#123D32] dark:text-[#CEFEF1]">{filteredQA.length}</strong> Tanya Jawab
          </div>

          <ReadingFontControls
            step={fontControl.step}
            percentage={fontControl.percentage}
            canDecrease={fontControl.canDecrease}
            canIncrease={fontControl.canIncrease}
            isDefault={fontControl.isDefault}
            onDecrease={fontControl.decrease}
            onIncrease={fontControl.increase}
            onReset={fontControl.reset}
          />
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
          <div className="w-8 h-8 border-3 border-[#123D32] dark:border-[#4CA7A1] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-[#525855] dark:text-[#A6D6C9]">
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
            <HelpCircle className="w-10 h-10 text-[#123D32] dark:text-[#4CA7A1] mx-auto" />
            <h3 className="text-base font-bold font-serif text-[#171717] dark:text-[#CEFEF1]">
              Belum Ada Tanya Jawab Publik
            </h3>
            <p className="text-xs text-[#525855] dark:text-[#A6D6C9] max-w-md mx-auto leading-relaxed">
              {searchQuery
                ? `Tidak ditemukan tanya jawab yang cocok dengan kata kunci "${searchQuery}".`
                : 'Belum ada pertanyaan materi yang dipublikasikan. Anda dapat menjadi yang pertama mengajukan pertanyaan.'}
            </p>
            <button
              onClick={handleAskQuestion}
              className="px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-md border-2 border-[#171717] dark:border-[#001722] bg-[#4CA7A1] hover:bg-[#5EBEB7] text-[#001722] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722] transition-all inline-flex items-center gap-2 mt-2 cursor-pointer"
            >
              Kirim Pertanyaan Konsultasi
            </button>
          </div>
        )
      ) : (
        <div style={fontControl.style} className="space-y-5">
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
                    ? 'ring-2 ring-[#4CA7A1]'
                    : ''
                }`}
              >
                {/* QA Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="px-2.5 py-0.5 rounded bg-[#001722] text-[#CEFEF1] font-extrabold uppercase tracking-wider border border-[#171717] dark:border-[#4CA7A1]">
                        Materi & Pembelajaran
                      </span>
                      <span className="px-2.5 py-0.5 rounded bg-[#4CA7A1] text-[#001722] font-extrabold uppercase tracking-wider border border-[#171717] dark:border-[#001722] flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Jawaban Resmi Ustaz</span>
                      </span>
                      {isDirectTarget && (
                        <span className="px-2 py-0.5 rounded bg-[#0D2B36] text-[#CEFEF1] font-extrabold text-[10px] border border-[#4CA7A1]">
                          Tautan Langsung
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold font-serif text-[#171717] dark:text-[#CEFEF1] pt-1 leading-snug">
                      {item.title}
                    </h3>

                    {/* Anonymous Author Attribution */}
                    <div className="flex items-center gap-2 text-[11px] font-bold text-[#525855] dark:text-[#A6D6C9]">
                      <UserCheck className="w-3.5 h-3.5 text-[#123D32] dark:text-[#4CA7A1]" />
                      <span>Penanya: <strong className="text-[#171717] dark:text-[#CEFEF1]">Penanya (Anonim)</strong></span>
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
                      <Share2 className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1]" />
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
                          <ChevronRight className="w-3.5 h-3.5 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Collapsed Preview State vs Expanded Full Content */}
                {!isExpanded ? (
                  <div className="pt-3 border-t-2 border-[#171717] dark:border-[#4CA7A1] space-y-2">
                    <p
                      className="reading-scalable-text text-[#171717] dark:text-[#CEFEF1] line-clamp-2 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: `<strong class="font-bold text-[#123D32] dark:text-[#A6D6C9]">Pertanyaan: </strong>${autoWrapArabicText(shortQuestionPreview)}`
                      }}
                    />
                    {plainAnswer && (
                      <div className="p-3 rounded bg-[#FAF7F0] dark:bg-[#0D2B36] border border-[#171717] dark:border-[#4CA7A1] mt-1.5">
                        <p
                          className="reading-scalable-text text-[#171717] dark:text-[#CEFEF1] line-clamp-2 leading-relaxed font-sans"
                          dangerouslySetInnerHTML={{
                            __html: `<strong class="font-bold text-[#123D32] dark:text-[#4CA7A1]">Cuplikan Jawaban Ustaz: </strong>${autoWrapArabicText(shortAnswerPreview)}`
                          }}
                        />
                      </div>
                    )}

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => handleOpenShareModal(item)}
                          className="font-bold text-[#123D32] dark:text-[#A6D6C9] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Bagikan</span>
                        </button>
                        <span className="text-[#525855] dark:text-[#A6D6C9]">•</span>
                        <button
                          onClick={() => handleCopyDirectLink(item)}
                          className="font-bold text-[#171717] dark:text-[#CEFEF1] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {copiedId === item.id ? <Check className="w-3 h-3 text-[#123D32] dark:text-[#4CA7A1]" /> : <Copy className="w-3 h-3 text-[#123D32] dark:text-[#4CA7A1]" />}
                          <span>{copiedId === item.id ? 'Tersalin' : 'Salin Link'}</span>
                        </button>
                      </div>

                      <button
                        onClick={() => handleToggleExpand(item.id)}
                        className="font-extrabold text-[#123D32] dark:text-[#4CA7A1] hover:underline cursor-pointer"
                      >
                        Baca Selengkapnya →
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Expanded Full Detail */
                  <div className="space-y-4 pt-3 border-t-2 border-[#171717] dark:border-[#4CA7A1] animate-fade-in">
                    {/* Full Question Body */}
                    <div className="p-3.5 sm:p-4 rounded-md bg-[#FAF7F0] dark:bg-[#0D2B36] border-2 border-[#171717] dark:border-[#4CA7A1] space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#123D32] dark:text-[#A6D6C9] block">
                        Pertanyaan Lengkap:
                      </span>
                      <div
                        className="reading-scalable-text text-[#171717] dark:text-[#CEFEF1] leading-relaxed whitespace-pre-line font-sans"
                        dangerouslySetInnerHTML={{ __html: autoWrapArabicText(item.content) }}
                      />
                    </div>

                    {/* Full Formatted Rich-Text Answer */}
                    {item.replyContent && (
                      <div className="p-4 sm:p-6 rounded-md bg-white dark:bg-[#0D2B36] border-2 border-[#171717] dark:border-[#4CA7A1] border-l-4 border-l-[#123D32] dark:border-l-[#4CA7A1] space-y-3 sm:space-y-4">
                        <div className="flex items-center justify-between pb-2.5 border-b-2 border-[#171717] dark:border-[#4CA7A1]">
                          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold font-serif text-[#123D32] dark:text-[#CEFEF1]">
                            <ShieldCheck className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1]" />
                            <span>Jawaban Resmi Ustaz / Pembimbing Dars with Osama:</span>
                          </div>
                          {item.repliedAt && (
                            <span className="text-[11px] font-bold text-[#525855] dark:text-[#A6D6C9]">
                              {new Date(item.repliedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>

                        <div
                          className="prose dark:prose-invert max-w-none text-[#171717] dark:text-[#CEFEF1] leading-relaxed space-y-3 font-sans blog-content"
                          dangerouslySetInnerHTML={{ __html: autoWrapArabicText(item.replyContent) }}
                        />

                        {/* ACTION TOOLBAR: Bagikan Pertanyaan & Salin Link */}
                        <div className="pt-4 border-t-2 border-[#171717] dark:border-[#4CA7A1] flex flex-col sm:flex-row items-center justify-between gap-3">
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
                                  <Check className="w-3.5 h-3.5 text-[#123D32] dark:text-[#CEFEF1]" />
                                  <span>Tersalin</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-[#123D32] dark:text-[#4CA7A1]" />
                                  <span>Salin Link</span>
                                </>
                              )}
                            </button>
                          </div>

                          <span className="text-[11px] font-medium text-[#525855] dark:text-[#A6D6C9] italic">
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
      <div className="p-6 sm:p-8 bg-[#123D32] dark:bg-[#1F5F63] text-white dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[6px_6px_0px_#171717] dark:shadow-[6px_6px_0px_#001722]">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-base sm:text-lg font-bold font-serif text-white">
            Memiliki Pertanyaan Seputar Pelajaran?
          </h4>
          <p className="text-xs text-[#FAF7F0]/90 dark:text-[#A6D6C9]">
            Kirimkan pertanyaan Anda secara mudah melalui Ruang Konsultasi Siswa.
          </p>
        </div>
        <button
          onClick={handleAskQuestion}
          className="px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-md border-2 border-[#171717] dark:border-[#001722] bg-[#4CA7A1] hover:bg-[#5EBEB7] text-[#001722] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722] transition-all shrink-0 cursor-pointer"
        >
          Ajukan Pertanyaan
        </button>
      </div>

      {/* INDIVIDUAL QA SHARE MODAL */}
      <ShareQAModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        consultation={selectedQaForShare}
      />

      {/* MAIN FEATURE SHARE MODAL (TANYA JAWAB) */}
      <FeatureShareModal
        isOpen={featureShareModalOpen}
        onClose={() => setFeatureShareModalOpen(false)}
        config={TANYA_JAWAB_SHARE_CONFIG}
      />
    </div>
  );
};
