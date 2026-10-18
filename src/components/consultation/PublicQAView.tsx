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
  Image as ImageIcon,
  Copy,
  Check,
  ArrowRight,
  FileText,
  Download
} from 'lucide-react';
import { Consultation } from '../../types';
import { getPublishedPublicQA } from '../../firebase/services';
import { useAuth } from '../../context/AuthContext';
import { autoWrapArabicText } from '../../utils/arabicFontHelper';
import { ShareQAModal } from './ShareQAModal';
import { useQASEO } from '../../hooks/useQASEO';

interface PublicQAViewProps {
  onNavigateToConsultation: () => void;
  initialQaId?: string | null;
}

/**
 * Strips HTML tags and normalizes whitespace to generate a clean text preview
 */
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

  // Sharing Modal State
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [selectedQaForShare, setSelectedQaForShare] = useState<Consultation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dynamic OpenGraph / Twitter metadata for active expanded Q&A item
  const activeQAForSEO = qaList.find(q => q.id === expandedId) || null;
  useQASEO(activeQAForSEO);

  const loadPublicQA = async () => {
    setLoading(true);
    try {
      const list = await getPublishedPublicQA();
      setQaList(list);
    } catch (err) {
      console.warn('Error loading public Q&A:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPublicQA();
  }, []);

  // Handle direct deep link `qaId`
  useEffect(() => {
    if (!initialQaId && typeof window === 'undefined') return;
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const targetId = initialQaId || urlParams?.get('qaId');

    if (targetId) {
      setExpandedId(targetId);
      // Wait for DOM render then scroll to target
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

    // If opening via direct link or user is logged in, allow full view
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8 animate-fade-in font-sans">
      
      {/* HEADER HERO BANNER */}
      <div
        data-aos="fade-up"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#073B2E] via-[#0c2b23] to-[#123B6D] text-[#F7F6EF] p-6 sm:p-10 border border-[#073B2E]/30 shadow-xl"
      >
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#C9A34E]/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A34E]/20 border border-[#C9A34E]/30 text-[#F4B942] text-xs font-semibold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#F4B942]" />
            <span>Arsip Tanya Jawab Pembelajaran Publik</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold font-serif-brand text-[#F7F6EF] leading-tight">
            Tanya Jawab Syar'i & Pembelajaran
          </h1>

          <p className="text-xs sm:text-sm text-[#F7F6EF]/80 leading-relaxed font-sans">
            Kumpulan pertanyaan dan jawaban resmi seputar kajian, kitab turats, serta fiqih pembelajaran yang telah disetujui dan diverifikasi oleh Ustaz & Pembimbing Dars with Osama.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={handleAskQuestion}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C9A34E] hover:bg-[#b08e40] text-[#073B2E] font-bold text-xs rounded-xl shadow-md transition cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Ajukan Pertanyaan Baru</span>
            </button>
            
            <div className="flex items-center gap-1.5 text-xs text-[#F7F6EF]/70 font-medium">
              <Lock className="w-3.5 h-3.5 text-[#F4B942]" />
              <span>Privasi Penanya Terjaga (Anonim)</span>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div
        data-aos="fade-up"
        className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#071B16] border border-[#073B2E]/15 dark:border-[#C9A34E]/25 rounded-2xl p-4 shadow-sm"
      >
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7C7A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kata kunci pertanyaan atau jawaban..."
            className="w-full pl-10 pr-4 py-2 bg-[#F7F6EF]/80 dark:bg-[#0c2b23] border border-[#073B2E]/20 dark:border-[#143e33] rounded-xl text-xs text-[#073B2E] dark:text-[#F7F6EF] focus:outline-hidden focus:ring-2 focus:ring-[#C9A34E]"
          />
        </div>

        <div className="text-xs font-semibold text-[#6B7C7A] dark:text-[#8C9E9B] shrink-0">
          Menampilkan <strong className="text-[#073B2E] dark:text-[#F4B942]">{filteredQA.length}</strong> Tanya Jawab Publik
        </div>
      </div>

      {/* QA LIST ACCORDION */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#073B2E] dark:border-[#C9A34E] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#6B7C7A] dark:text-[#8C9E9B]">
            Memuat arsip tanya jawab publik...
          </p>
        </div>
      ) : filteredQA.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#071B16] border border-[#073B2E]/15 dark:border-[#C9A34E]/25 rounded-3xl space-y-3">
          <HelpCircle className="w-10 h-10 text-[#C9A34E] mx-auto opacity-70" />
          <h3 className="text-base font-bold font-serif-brand text-[#073B2E] dark:text-[#F7F6EF]">
            Belum Ada Tanya Jawab Publik
          </h3>
          <p className="text-xs text-[#6B7C7A] dark:text-[#8C9E9B] max-w-md mx-auto leading-relaxed">
            {searchQuery
              ? `Tidak ditemukan tanya jawab yang cocok dengan kata kunci "${searchQuery}".`
              : 'Belum ada pertanyaan materi yang dipublikasikan. Anda dapat menjadi yang pertama mengajukan pertanyaan.'}
          </p>
          <button
            onClick={handleAskQuestion}
            className="mt-2 px-5 py-2 bg-[#073B2E] dark:bg-[#123B6D] hover:bg-[#0a4d3c] text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Kirim Pertanyaan Konsultasi
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredQA.map((item, idx) => {
            const isExpanded = expandedId === item.id;
            const isDirectTarget = initialQaId === item.id;
            const plainAnswer = stripHtmlTags(item.replyContent || '');
            const shortAnswerPreview = plainAnswer.length > 150 ? plainAnswer.slice(0, 150) + '...' : plainAnswer;
            const shortQuestionPreview = item.content.length > 120 ? item.content.slice(0, 120) + '...' : item.content;

            return (
              <div
                key={item.id}
                id={`qa-${item.id}`}
                data-aos="fade-up"
                data-aos-delay={(idx % 4) * 100}
                className={`bg-white dark:bg-[#071B16] border rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all space-y-4 ${
                  isDirectTarget
                    ? 'border-[#C9A34E] ring-2 ring-[#C9A34E]/40 shadow-lg'
                    : 'border-[#073B2E]/15 dark:border-[#C9A34E]/25'
                }`}
              >
                {/* QA Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#073B2E]/10 dark:bg-[#C9A34E]/20 text-[#073B2E] dark:text-[#F4B942] font-bold border border-[#C9A34E]/30">
                        📖 Materi & Pembelajaran
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300/60 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Jawaban Resmi Admin / Ustaz</span>
                      </span>
                      {isDirectTarget && (
                        <span className="px-2 py-0.5 rounded-full bg-[#F4B942] text-[#073B2E] font-bold text-[10px]">
                          Tautan Langsung
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold font-serif-brand text-[#073B2E] dark:text-[#F7F6EF] pt-1">
                      {item.title}
                    </h3>

                    {/* Anonymous Author Attribution */}
                    <div className="flex items-center gap-2 text-[11px] text-[#6B7C7A] dark:text-[#8C9E9B]">
                      <UserCheck className="w-3.5 h-3.5 text-[#C9A34E]" />
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
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Quick Share Icon Button */}
                    <button
                      onClick={() => handleOpenShareModal(item)}
                      className="p-2 rounded-xl bg-[#073B2E]/5 dark:bg-[#0c2b23] hover:bg-[#073B2E]/15 dark:hover:bg-[#143e33] text-[#073B2E] dark:text-[#F4B942] transition cursor-pointer"
                      title="Bagikan Pertanyaan"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    {/* Toggle Details Button */}
                    <button
                      onClick={() => handleToggleExpand(item.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#073B2E]/5 dark:bg-[#0c2b23] hover:bg-[#073B2E]/10 dark:hover:bg-[#143e33] text-[#073B2E] dark:text-[#F7F6EF] text-xs font-bold transition cursor-pointer"
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
                  /* Clean Preview Snippet (Visible to all) */
                  <div className="p-4 rounded-xl bg-[#F7F6EF]/60 dark:bg-[#0c2b23] border border-[#073B2E]/10 dark:border-[#143e33] space-y-2">
                    <p className="text-xs text-[#073B2E]/80 dark:text-[#F7F6EF]/80 line-clamp-2 leading-relaxed">
                      <strong className="text-[#073B2E] dark:text-[#F4B942]">Pertanyaan: </strong>
                      {shortQuestionPreview}
                    </p>
                    {plainAnswer && (
                      <p className="text-xs text-emerald-900 dark:text-emerald-300 line-clamp-2 leading-relaxed font-sans pt-1 border-t border-[#073B2E]/10 dark:border-[#143e33]">
                        <strong className="text-[#0EA5A4] dark:text-[#F4B942]">Cuplikan Jawaban: </strong>
                        {shortAnswerPreview}
                      </p>
                    )}

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleOpenShareModal(item)}
                          className="font-bold text-[#073B2E] dark:text-[#F4B942] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Bagikan</span>
                        </button>
                        <span>•</span>
                        <button
                          onClick={() => handleCopyDirectLink(item)}
                          className="font-bold text-stone-600 dark:text-stone-300 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-[#C9A34E]" />}
                          <span>{copiedId === item.id ? 'Tersalin' : 'Salin Link'}</span>
                        </button>
                      </div>

                      <button
                        onClick={() => handleToggleExpand(item.id)}
                        className="font-bold text-[#073B2E] dark:text-[#F4B942] hover:underline"
                      >
                        Baca Selengkapnya →
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Expanded Full Detail */
                  <div className="space-y-4 animate-fade-in">
                    {/* Full Question Body */}
                    <div className="p-4 rounded-xl bg-[#F7F6EF]/80 dark:bg-[#0c2b23] border border-[#073B2E]/10 dark:border-[#143e33] space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A34E] block">
                        Pertanyaan Lengkap:
                      </span>
                      <p className="text-xs sm:text-sm text-[#073B2E] dark:text-[#F7F6EF] leading-relaxed whitespace-pre-line font-sans">
                        {item.content}
                      </p>
                    </div>

                    {/* Full Formatted Rich-Text Answer */}
                    {item.replyContent && (
                      <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/60 border-l-4 border-[#0EA5A4] dark:border-[#F4B942] space-y-4 shadow-xs">
                        <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 dark:border-emerald-800/60">
                          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#073B2E] dark:text-[#F4B942]">
                            <ShieldCheck className="w-4 h-4 text-[#C9A34E]" />
                            <span>Jawaban Resmi Ustaz / Pembimbing Dars with Osama:</span>
                          </div>
                          {item.repliedAt && (
                            <span className="text-[11px] text-stone-500 dark:text-stone-400 font-normal">
                              {new Date(item.repliedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>

                        {/* Rich HTML Content Renderer with Auto Arabic RTL Wrapping */}
                        <div
                          className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-[#073B2E] dark:text-[#F7F6EF] leading-relaxed space-y-3 font-sans blog-content"
                          dangerouslySetInnerHTML={{ __html: autoWrapArabicText(item.replyContent) }}
                        />

                        {/* ACTION TOOLBAR: Bagikan Pertanyaan & Salin Link */}
                        <div className="pt-4 border-t border-emerald-200/60 dark:border-emerald-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            {/* 1. Bagikan Pertanyaan */}
                            <button
                              onClick={() => handleOpenShareModal(item)}
                              className="px-3.5 py-2 rounded-xl bg-[#073B2E] dark:bg-[#123B6D] hover:bg-[#0a4d3c] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                              title="Bagikan pertanyaan ke WhatsApp, Telegram, Facebook, dll"
                            >
                              <Share2 className="w-3.5 h-3.5 text-[#F4B942]" />
                              <span>Bagikan Pertanyaan</span>
                            </button>

                            {/* 2. Salin Link */}
                            <button
                              onClick={() => handleCopyDirectLink(item)}
                              className="px-3 py-2 rounded-xl bg-white dark:bg-[#0c2b23] border border-[#073B2E]/20 dark:border-[#C9A34E]/30 text-[#073B2E] dark:text-[#F7F6EF] text-xs font-semibold hover:bg-stone-50 dark:hover:bg-[#143e33] transition flex items-center gap-1.5 cursor-pointer"
                              title="Salin tautan permanen pertanyaan ini"
                            >
                              {copiedId === item.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Tersalin</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-[#C9A34E]" />
                                  <span>Salin Link</span>
                                </>
                              )}
                            </button>
                          </div>

                          <span className="text-[11px] text-stone-500 dark:text-stone-400 italic">
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
      <div className="p-6 sm:p-8 bg-gradient-to-r from-[#073B2E] to-[#123B6D] text-white rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-base font-bold font-serif-brand">
            Memiliki Pertanyaan Seputar Pelajaran?
          </h4>
          <p className="text-xs text-white/80">
            Kirimkan pertanyaan Anda secara mudah melalui Ruang Konsultasi Siswa.
          </p>
        </div>
        <button
          onClick={handleAskQuestion}
          className="px-6 py-2.5 bg-[#C9A34E] hover:bg-[#b08e40] text-[#073B2E] font-bold text-xs rounded-xl shadow-md transition cursor-pointer shrink-0 active:scale-95"
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
