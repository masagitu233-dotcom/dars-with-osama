import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Send,
  Facebook,
  Twitter,
  Sparkles,
  Lock
} from 'lucide-react';
import { Consultation } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface ShareQAModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultation: Consultation | null;
  initialTab?: string;
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export const ShareQAModal: React.FC<ShareQAModalProps> = ({
  isOpen,
  onClose,
  consultation
}) => {
  const { showToast } = useAuth();
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

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

  if (!isOpen || !consultation) return null;

  // SAFETY & PRIVACY CHECK: Only approved learning Q&As can be shared publicly.
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-fade-in overflow-y-auto font-sans">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#071B16] border border-[#073B2E]/20 dark:border-[#C9A34E]/30 rounded-3xl shadow-2xl overflow-hidden my-auto transition-all flex flex-col">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#073B2E] via-[#0c2b23] to-[#123B6D] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#F4B942] border border-white/20 shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-serif-brand text-white leading-tight">
                Bagikan Pertanyaan
              </h3>
              <p className="text-[11px] text-[#F4B942] font-medium">
                Dars with Osama • ILMU • KAJIAN • KITAB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6">
          
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
                  : 'Jawaban konsultasi ini belum disetujui / dipublikasikan oleh Admin.'}
              </p>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          ) : (
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
                  <span>Salin Link Permanen Pertanyaan:</span>
                  <span className="text-[10px] text-stone-500 font-normal">Membuka langsung halaman tanya jawab ini</span>
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
                        <span>Salin Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Social Share Buttons Grid */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-[#073B2E] dark:text-[#F7F6EF] uppercase tracking-wider block">
                  Pilih Platform Berbagi:
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* WhatsApp */}
                  <button
                    onClick={handleShareWhatsApp}
                    className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-2.5 justify-center shadow-xs cursor-pointer active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-200" />
                    <span>WhatsApp</span>
                  </button>

                  {/* Telegram */}
                  <button
                    onClick={handleShareTelegram}
                    className="p-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition flex items-center gap-2.5 justify-center shadow-xs cursor-pointer active:scale-95"
                  >
                    <Send className="w-4 h-4 text-sky-200" />
                    <span>Telegram</span>
                  </button>

                  {/* Facebook */}
                  <button
                    onClick={handleShareFacebook}
                    className="p-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition flex items-center gap-2.5 justify-center shadow-xs cursor-pointer active:scale-95"
                  >
                    <Facebook className="w-4 h-4 text-blue-200" />
                    <span>Facebook</span>
                  </button>

                  {/* Twitter / X */}
                  <button
                    onClick={handleShareTwitter}
                    className="p-3 rounded-xl bg-stone-900 dark:bg-stone-800 hover:bg-stone-800 text-white text-xs font-bold transition flex items-center gap-2.5 justify-center shadow-xs cursor-pointer active:scale-95 border border-stone-700"
                  >
                    <Twitter className="w-4 h-4 text-stone-300" />
                    <span>X (Twitter)</span>
                  </button>
                </div>

                {/* Web Share API */}
                {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                  <button
                    onClick={handleNativeShare}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#073B2E]/5 dark:bg-[#0c2b23] hover:bg-[#073B2E]/10 text-[#073B2E] dark:text-[#F7F6EF] text-xs font-semibold border border-[#073B2E]/15 dark:border-[#143e33] transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#C9A34E]" />
                    <span>Gunakan Menu Berbagi Bawaan Perangkat</span>
                  </button>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 dark:bg-[#051511] border-t border-stone-200 dark:border-stone-800/60 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold hover:bg-stone-300 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
