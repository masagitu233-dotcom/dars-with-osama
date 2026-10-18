import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Share2,
  Image as ImageIcon,
  Copy,
  Check,
  Download,
  ExternalLink,
  MessageCircle,
  Send,
  Facebook,
  Twitter,
  Sparkles,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Lock,
  Layers,
  FileCheck
} from 'lucide-react';
import { Consultation } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  CardTheme,
  CardRatio,
  partitionContentIntoSlides,
  renderDakwahCardToCanvas,
  canvasToBlob,
  downloadCanvasAsPng,
  stripHtml
} from '../../utils/canvasDakwahCard';

interface ShareQAModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultation: Consultation | null;
  initialTab?: 'share' | 'card';
}

export const ShareQAModal: React.FC<ShareQAModalProps> = ({
  isOpen,
  onClose,
  consultation,
  initialTab = 'share'
}) => {
  const { showToast } = useAuth();
  const [activeTab, setActiveTab] = useState<'share' | 'card'>(initialTab);
  const [theme, setTheme] = useState<CardTheme>('light');
  const [ratio, setRatio] = useState<CardRatio>('4:5');
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setCurrentSlideIndex(0);
      setCopied(false);
    }
  }, [isOpen, initialTab]);

  // Compute slides dynamically based on consultation and selected ratio
  const slides = useMemo(() => {
    if (!consultation) return [];
    return partitionContentIntoSlides(
      consultation.title,
      consultation.content,
      consultation.replyContent || '',
      ratio
    );
  }, [consultation, ratio]);

  useEffect(() => {
    if (currentSlideIndex >= slides.length && slides.length > 0) {
      setCurrentSlideIndex(0);
    }
  }, [slides.length, currentSlideIndex]);

  // Clean question snippet (WITHOUT the answer) so readers must open link to see answer
  const cleanQuestionSnippet = useMemo(() => {
    if (!consultation?.content) return '';
    const plain = stripHtml(consultation.content);
    return plain.length > 200 ? plain.slice(0, 200) + '...' : plain;
  }, [consultation?.content]);

  // Direct share link
  const shareUrl = useMemo(() => {
    if (!consultation?.id) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://darswithosama.com';
    return `${origin}/qa/${encodeURIComponent(consultation.id)}`;
  }, [consultation?.id]);

  // Re-generate canvas preview when tab is 'card', or theme, ratio, slide changes
  useEffect(() => {
    if (!isOpen || activeTab !== 'card' || !consultation || slides.length === 0) return;

    let isMounted = true;
    setGenerating(true);

    const slideData = slides[currentSlideIndex] || slides[0];

    renderDakwahCardToCanvas({
      theme,
      ratio,
      slide: slideData,
      siteUrl: 'darswithosama.com'
    })
      .then((canvas) => {
        if (!isMounted) return;
        canvasRef.current = canvas;
        const dataUrl = canvas.toDataURL('image/png');
        setPreviewUrl(dataUrl);
      })
      .catch((err) => {
        console.warn('Gagal merender kartu dakwah:', err);
      })
      .finally(() => {
        if (isMounted) setGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeTab, theme, ratio, currentSlideIndex, consultation, slides]);

  if (!isOpen || !consultation) return null;

  // SAFETY & PRIVACY CHECK:
  // Only approved learning Q&As can be shared publicly.
  const isEligibleToShare = consultation.category === 'learning' && consultation.isPublished === true;

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast('Tautan pertanyaan berhasil disalin!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Gagal menyalin tautan.');
    }
  };

  const handleNativeShare = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Tanya Jawab Syar'i: ${consultation.title}`,
          text: `*Tanya Jawab Syar'i — Dars with Osama*\n\n📌 *Pertanyaan:*\n*${consultation.title}*\n\n💡 *Ingin tahu jawaban resmi Ustaz?*\nBuka tautan berikut untuk membaca jawaban lengkap:`,
          url: shareUrl
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  const handleShareWhatsApp = () => {
    const text = `*Tanya Jawab Syar'i — Dars with Osama*\n\n📌 *Pertanyaan:*\n*${consultation.title}*\n\n"${cleanQuestionSnippet}"\n\n💡 *Ingin mengetahui jawaban resmi Ustaz?*\nKlik tautan berikut untuk membaca jawaban lengkap & pembahasan dalilnya:\n${shareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareTelegram = () => {
    const text = `*Tanya Jawab Syar'i — Dars with Osama*\n\n📌 *Pertanyaan:* ${consultation.title}\n\n"${cleanQuestionSnippet}"\n\n💡 Klik tautan untuk membaca jawaban resmi Ustaz:`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareTwitter = () => {
    const text = `Tanya Jawab Syar'i Dars with Osama: ${consultation.title}\n\n💡 Klik link untuk membaca jawaban resmi Ustaz:`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadSingleImage = () => {
    if (!canvasRef.current) return;
    const pageNum = slides[currentSlideIndex]?.pageNumber || 1;
    const totalPages = slides[currentSlideIndex]?.totalPages || slides.length || 1;
    const filename = `dars-dakwah-${consultation.id}-hal-${pageNum}-dari-${totalPages}.png`;
    downloadCanvasAsPng(canvasRef.current, filename);
    showToast(`Kartu dakwah halaman ${pageNum}/${totalPages} berhasil diunduh!`);
  };

  const handleDownloadAllSlides = async () => {
    if (slides.length <= 1) {
      handleDownloadSingleImage();
      return;
    }

    setDownloading(true);
    try {
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const canvas = await renderDakwahCardToCanvas({
          theme,
          ratio,
          slide,
          siteUrl: 'darswithosama.com'
        });
        const filename = `dars-dakwah-${consultation.id}-hal-${slide.pageNumber}-dari-${slide.totalPages}.png`;
        downloadCanvasAsPng(canvas, filename);
        // Small delay between multiple downloads for browser safety
        await new Promise((r) => setTimeout(r, 400));
      }
      showToast(`Seluruh ${slides.length} halaman kartu dakwah berhasil diunduh!`);
    } catch (err) {
      console.warn('Gagal mengunduh semua slide:', err);
      showToast('Terjadi kendala saat mengunduh gambar.');
    } finally {
      setDownloading(false);
    }
  };

  const handleShareImageDirectly = async () => {
    if (!canvasRef.current) return;

    try {
      const blob = await canvasToBlob(canvasRef.current);
      const file = new File([blob], `dars-dakwah-${consultation.id}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Tanya Jawab: ${consultation.title}`,
          text: `Tanya Jawab Syar'i Dars with Osama:\n${consultation.title}\n${shareUrl}`
        });
      } else {
        // Fallback: download image and copy link
        handleDownloadSingleImage();
        handleCopyLink();
      }
    } catch (err) {
      // User cancelled share or unsupported
      handleDownloadSingleImage();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto font-sans">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#071B16] border border-[#073B2E]/20 dark:border-[#C9A34E]/30 rounded-3xl shadow-2xl overflow-hidden my-auto transition-all flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#073B2E] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#C9A34E]/20 flex items-center justify-center border border-[#C9A34E]/40 shrink-0">
              <Share2 className="w-4 h-4 text-[#F4B942]" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-serif-brand text-white leading-tight">
                Bagikan Jawaban & Buat Kartu Dakwah
              </h3>
              <p className="text-[11px] text-[#F7F6EF]/80 font-sans">
                Sebarkan faedah ilmu syar'i secara mudah ke media sosial
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-stone-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#073B2E]/10 dark:border-[#C9A34E]/20 bg-[#F7F6EF]/60 dark:bg-[#0c2b23] shrink-0 px-6">
          <button
            onClick={() => setActiveTab('share')}
            className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'share'
                ? 'border-[#C9A34E] text-[#073B2E] dark:text-[#F4B942]'
                : 'border-transparent text-[#6B7C7A] dark:text-[#8C9E9B] hover:text-[#073B2E] dark:hover:text-[#F7F6EF]'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Bagikan Tautan & Medsos</span>
          </button>

          <button
            onClick={() => setActiveTab('card')}
            className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'card'
                ? 'border-[#C9A34E] text-[#073B2E] dark:text-[#F4B942]'
                : 'border-transparent text-[#6B7C7A] dark:text-[#8C9E9B] hover:text-[#073B2E] dark:hover:text-[#F7F6EF]'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Buat Gambar Kartu Dakwah</span>
            <span className="px-1.5 py-0.2 bg-[#F4B942]/20 text-[#073B2E] dark:text-[#F4B942] rounded-md text-[10px] font-bold">
              HD
            </span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* PRIVACY & SECURITY GUARD */}
          {!isEligibleToShare ? (
            <div className="p-6 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold font-serif-brand text-amber-900 dark:text-amber-300">
                Privasi Terlindungi: Tidak Dapat Dibagikan ke Publik
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed max-w-md mx-auto">
                {consultation.category === 'private'
                  ? 'Pertanyaan ini merupakan Konsultasi Pribadi. Sesuai kebijakan syariat dan amanah privasi, konsultasi pribadi tidak diizinkan untuk dipublikasikan atau dibagikan ke publik.'
                  : 'Jawaban konsultasi ini belum disetujui / dipublikasikan oleh Admin. Tautan dan kartu dakwah hanya dapat dibuat setelah jawaban disetujui.'}
              </p>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-xl"
                >
                  Tutup
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* TAB 1: BAGIKAN TAUTAN & MEDSOS */}
              {activeTab === 'share' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Topic Overview Card */}
                  <div className="p-4 rounded-2xl bg-[#F7F6EF]/80 dark:bg-[#0c2b23] border border-[#073B2E]/10 dark:border-[#143e33] space-y-2">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-[#073B2E] dark:text-[#F4B942]">
                      <span className="px-2 py-0.5 rounded-full bg-[#073B2E]/10 dark:bg-[#C9A34E]/20">
                        ❓ Pertanyaan Tanya Jawab
                      </span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <Lock className="w-3 h-3 text-[#C9A34E]" />
                        <span>Jawaban Terkunci (Perlu Klik Link)</span>
                      </span>
                    </div>

                    <h4 className="font-serif-brand font-bold text-sm sm:text-base text-[#073B2E] dark:text-[#F7F6EF]">
                      {consultation.title}
                    </h4>

                    {cleanQuestionSnippet && (
                      <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2 leading-relaxed font-sans border-l-2 border-[#C9A34E] pl-2.5">
                        &quot;{cleanQuestionSnippet}&quot;
                      </p>
                    )}

                    <div className="pt-2 text-[11px] font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#C9A34E] shrink-0" />
                      <span>Teks & pratinjau yang dibagikan hanya memuat <strong>pertanyaan</strong>. Pembaca harus mengklik link untuk membaca jawaban resmi dari Ustaz.</span>
                    </div>
                  </div>

                  {/* Direct Link Section */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#073B2E] dark:text-[#F7F6EF] flex items-center justify-between">
                      <span>Tautan Langsung Unik (Direct Link):</span>
                      <span className="text-[10px] text-stone-500 font-normal">Akan membuka langsung jawaban ini</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={shareUrl}
                        className="w-full px-3.5 py-2.5 bg-[#F7F6EF]/60 dark:bg-[#0c2b23] border border-[#073B2E]/20 dark:border-[#143e33] rounded-xl text-xs text-[#073B2E] dark:text-[#F7F6EF] font-mono select-all focus:outline-hidden"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="px-4 py-2.5 bg-[#073B2E] hover:bg-[#0a4d3c] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 transition shadow-xs cursor-pointer active:scale-95"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-[#F4B942]" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Social Share Buttons Grid */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold text-[#073B2E] dark:text-[#F7F6EF]">
                      Bagikan Cepat ke Media Sosial & Pesan:
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {/* WhatsApp */}
                      <button
                        onClick={handleShareWhatsApp}
                        className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-xs"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        <span>WhatsApp</span>
                      </button>

                      {/* Telegram */}
                      <button
                        onClick={handleShareTelegram}
                        className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs font-bold hover:bg-sky-100 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-xs"
                      >
                        <Send className="w-4 h-4 text-sky-500" />
                        <span>Telegram</span>
                      </button>

                      {/* Facebook */}
                      <button
                        onClick={handleShareFacebook}
                        className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-xs"
                      >
                        <Facebook className="w-4 h-4 text-blue-600" />
                        <span>Facebook</span>
                      </button>

                      {/* Twitter / X */}
                      <button
                        onClick={handleShareTwitter}
                        className="p-3 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold hover:bg-stone-200 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-xs"
                      >
                        <Twitter className="w-4 h-4 text-stone-600 dark:text-stone-300" />
                        <span>Twitter / X</span>
                      </button>
                    </div>

                    {/* Web Share API */}
                    {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                      <button
                        onClick={handleNativeShare}
                        className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#073B2E]/5 dark:bg-[#0c2b23] hover:bg-[#073B2E]/10 text-[#073B2E] dark:text-[#F7F6EF] text-xs font-semibold border border-[#073B2E]/15 dark:border-[#143e33] transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#C9A34E]" />
                        <span>Gunakan Menu Berbagi Bawaan Perangkat (Android / iOS / macOS)</span>
                      </button>
                    )}
                  </div>

                  {/* Banner CTA to Switch to Card Generator */}
                  <div
                    onClick={() => setActiveTab('card')}
                    className="p-4 bg-gradient-to-r from-[#073B2E] to-[#123B6D] text-white rounded-2xl flex items-center justify-between gap-3 shadow-md hover:shadow-lg transition cursor-pointer group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#F4B942]">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="font-bold font-serif-brand text-xs sm:text-sm text-[#F7F6EF]">
                          Ingin Membagikan dalam Bentuk Gambar?
                        </h5>
                        <p className="text-[11px] text-[#F7F6EF]/80">
                          Buat kartu dakwah rapi beresolusi tinggi untuk Instagram & Status WhatsApp
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 bg-[#C9A34E] text-[#073B2E] rounded-xl text-xs font-bold group-hover:bg-[#b08e40] transition shrink-0">
                      Buka Desain
                    </span>
                  </div>

                </div>
              )}

              {/* TAB 2: BUAT GAMBAR KARTU DAKWAH */}
              {activeTab === 'card' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Customization Controls Toolbar */}
                  <div className="p-4 bg-[#F7F6EF]/80 dark:bg-[#0c2b23] border border-[#073B2E]/15 dark:border-[#143e33] rounded-2xl space-y-4 text-xs">
                    
                    {/* Theme Selector */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-[#073B2E] dark:text-[#F7F6EF] flex items-center justify-between">
                        <span>Pilihan Tema Warna:</span>
                        <span className="text-[10px] text-[#0EA5A4] dark:text-[#F4B942] font-normal">Latar terang direkomendasikan</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setTheme('light')}
                          className={`py-2 px-2.5 rounded-xl border text-center transition cursor-pointer font-bold truncate ${
                            theme === 'light'
                              ? 'bg-[#FCFBF7] text-[#123B6D] border-[#123B6D] ring-2 ring-[#0EA5A4]/40 shadow-xs'
                              : 'bg-white dark:bg-[#071B16] text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                          }`}
                        >
                          Editorial Terang
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme('navy')}
                          className={`py-2 px-2.5 rounded-xl border text-center transition cursor-pointer font-bold truncate ${
                            theme === 'navy'
                              ? 'bg-[#123B6D] text-[#F4B942] border-[#F4B942] shadow-xs'
                              : 'bg-white dark:bg-[#071B16] text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                          }`}
                        >
                          Royal Navy
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme('emerald')}
                          className={`py-2 px-2.5 rounded-xl border text-center transition cursor-pointer font-bold truncate ${
                            theme === 'emerald'
                              ? 'bg-[#073B2E] text-[#C9A34E] border-[#C9A34E] shadow-xs'
                              : 'bg-white dark:bg-[#071B16] text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                          }`}
                        >
                          Deep Forest
                        </button>
                      </div>
                    </div>

                    {/* Ratio & Slide Selector Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {/* Ratio */}
                      <div className="space-y-1.5">
                        <label className="font-bold text-[#073B2E] dark:text-[#F7F6EF] block">
                          Format Ukuran:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setRatio('4:5')}
                            className={`py-1.5 px-3 rounded-xl border text-center transition cursor-pointer font-bold ${
                              ratio === '4:5'
                                ? 'bg-[#123B6D] text-white border-[#F4B942]'
                                : 'bg-white dark:bg-[#071B16] text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                            }`}
                          >
                            Potret 4:5 (Utama)
                          </button>
                          <button
                            type="button"
                            onClick={() => setRatio('1:1')}
                            className={`py-1.5 px-3 rounded-xl border text-center transition cursor-pointer font-bold ${
                              ratio === '1:1'
                                ? 'bg-[#123B6D] text-white border-[#F4B942]'
                                : 'bg-white dark:bg-[#071B16] text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                            }`}
                          >
                            Persegi 1:1
                          </button>
                        </div>
                      </div>

                      {/* Multi-Slide Navigation (if > 1) */}
                      {slides.length > 1 && (
                        <div className="space-y-1.5">
                          <label className="font-bold text-[#073B2E] dark:text-[#F7F6EF] flex items-center justify-between">
                            <span>Pilih Slide Halaman:</span>
                            <span className="text-[#0EA5A4] dark:text-[#F4B942] font-bold">
                              Halaman {currentSlideIndex + 1} / {slides.length}
                            </span>
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {slides.map((_, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setCurrentSlideIndex(idx)}
                                className={`py-1.5 px-2.5 rounded-xl border text-center transition cursor-pointer font-bold text-xs ${
                                  currentSlideIndex === idx
                                    ? 'bg-[#123B6D] text-[#F4B942] border-[#F4B942] shadow-xs'
                                    : 'bg-white dark:bg-[#071B16] text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                                }`}
                              >
                                Hal {idx + 1}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Card Visual Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 font-semibold">
                      <span>Pratinjau Hasil Gambar HD:</span>
                      {slides.length > 1 && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={currentSlideIndex === 0}
                            onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                            className="p-1 rounded-lg bg-stone-100 dark:bg-stone-800 disabled:opacity-40 cursor-pointer hover:bg-stone-200"
                            title="Halaman Sebelumnya"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-bold text-[#123B6D] dark:text-[#F4B942]">
                            {currentSlideIndex + 1} / {slides.length}
                          </span>
                          <button
                            type="button"
                            disabled={currentSlideIndex >= slides.length - 1}
                            onClick={() => setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))}
                            className="p-1 rounded-lg bg-stone-100 dark:bg-stone-800 disabled:opacity-40 cursor-pointer hover:bg-stone-200"
                            title="Halaman Berikutnya"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className={`relative w-full max-w-md mx-auto ${ratio === '4:5' ? 'aspect-[4/5]' : 'aspect-square'} rounded-2xl overflow-hidden border border-[#073B2E]/20 dark:border-[#C9A34E]/30 bg-stone-900 shadow-xl flex items-center justify-center transition-all`}>
                      {generating || !previewUrl ? (
                        <div className="text-center space-y-2 text-stone-300 text-xs p-6">
                          <div className="w-8 h-8 border-3 border-[#C9A34E] border-t-transparent rounded-full animate-spin mx-auto" />
                          <p>Menyiapkan tipografi dan kartu dakwah...</p>
                        </div>
                      ) : (
                        <img
                          src={previewUrl}
                          alt="Kartu Dakwah Dars with Osama"
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#073B2E]/10 dark:border-[#C9A34E]/20">
                    <button
                      onClick={handleCopyLink}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#073B2E]/20 dark:border-[#C9A34E]/30 text-[#073B2E] dark:text-[#F7F6EF] text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#C9A34E]" />
                      <span>{copied ? 'Tautan Tersalin' : 'Salin Tautan'}</span>
                    </button>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      {/* Share Image directly if available */}
                      <button
                        type="button"
                        onClick={handleShareImageDirectly}
                        className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Bagikan Gambar</span>
                      </button>

                      {/* Download Single PNG */}
                      <button
                        type="button"
                        onClick={handleDownloadSingleImage}
                        disabled={generating || !previewUrl}
                        className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#073B2E] dark:bg-[#123B6D] hover:bg-[#0a4d3c] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5 text-[#F4B942]" />
                        <span>Unduh PNG</span>
                      </button>

                      {/* Download All Slides Button if multi-slide */}
                      {slides.length > 1 && (
                        <button
                          type="button"
                          onClick={handleDownloadAllSlides}
                          disabled={downloading}
                          className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-900 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
                          title="Unduh seluruh halaman gambar secara berurutan"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>{downloading ? 'Mengunduh...' : 'Unduh Semua'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </>
          )}

        </div>

      </div>
    </div>
  );
};
