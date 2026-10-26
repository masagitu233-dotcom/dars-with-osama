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

  const cleanQuestionSnippet = useMemo(() => {
    if (!consultation?.content) return '';
    const plain = stripHtml(consultation.content);
    return plain.length > 200 ? plain.slice(0, 200) + '...' : plain;
  }, [consultation?.content]);

  const shareUrl = useMemo(() => {
    if (!consultation?.id) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://darswithosama.com';
    return `${origin}/qa/${encodeURIComponent(consultation.id)}`;
  }, [consultation?.id]);

  if (!isOpen || !consultation) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 animate-fade-in overflow-y-auto font-sans">
      <div className="relative w-full max-w-lg bg-[#FAF7F0] dark:bg-[#16263D] border-2 border-charcoal dark:border-[#D6AD52] rounded-lg shadow-[6px_6px_0px_#292D2B] dark:shadow-[6px_6px_0px_#000000] overflow-hidden my-auto flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#123D32] dark:bg-[#101B2D] text-white border-b-2 border-charcoal dark:border-[#D6AD52]/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#16263D] flex items-center justify-center text-[#D6AD52] border-2 border-[#D6AD52] shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-serif text-white leading-tight">
                Bagikan Pertanyaan
              </h3>
              <p className="text-[11px] text-[#D6AD52] font-bold">
                Dars with Osama • ILMU • KAJIAN • KITAB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md bg-[#16263D] hover:bg-[#D6AD52] text-offwhite hover:text-charcoal border border-[#D6AD52] flex items-center justify-center transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {!isEligibleToShare ? (
            <div className="p-6 bg-white dark:bg-[#16263D] border-2 border-charcoal dark:border-[#D6AD52] rounded-md text-center space-y-3">
              <div className="w-12 h-12 rounded-md bg-[#D6AD52] border-2 border-charcoal text-charcoal flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold font-serif text-charcoal dark:text-[#D6AD52]">
                Privasi Terlindungi: Tidak Dapat Dibagikan ke Publik
              </h4>
              <p className="text-xs text-slate-gray dark:text-blue-gray leading-relaxed max-w-md mx-auto">
                {consultation.category === 'private'
                  ? 'Pertanyaan ini merupakan Konsultasi Pribadi. Sesuai kebijakan syariat dan amanah privasi, konsultasi pribadi tidak diizinkan untuk dipublikasikan atau dibagikan ke publik.'
                  : 'Jawaban konsultasi ini belum disetujui / dipublikasikan oleh Admin.'}
              </p>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="nb-btn nb-btn-secondary px-5 py-2 text-xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Topic Overview Card */}
              <div className="p-4 rounded-md bg-white dark:bg-[#243A56] border-2 border-charcoal dark:border-[#34465D] space-y-2.5 shadow-[3px_3px_0px_#292D2B]">
                <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                  <span className="px-2 py-0.5 rounded bg-[#123D32] text-[#D6AD52] border border-charcoal dark:border-[#D6AD52]">
                    ❓ Pertanyaan Tanya Jawab
                  </span>
                  <span className="text-[#123D32] dark:text-[#D6AD52] font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3 text-[#D6AD52]" />
                    <span>Jawaban Terkunci (Perlu Klik Link)</span>
                  </span>
                </div>

                <h4 className="font-serif font-bold text-sm sm:text-base text-charcoal dark:text-offwhite">
                  {consultation.title}
                </h4>

                {cleanQuestionSnippet && (
                  <p className="text-xs text-slate-gray dark:text-blue-gray line-clamp-2 leading-relaxed font-sans border-l-4 border-[#D6AD52] pl-2.5">
                    &quot;{cleanQuestionSnippet}&quot;
                  </p>
                )}

                <div className="pt-2 text-[11px] font-medium text-charcoal dark:text-offwhite bg-[#FAF7F0] dark:bg-[#16263D] p-2.5 rounded border border-charcoal dark:border-[#34465D] flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#D6AD52] shrink-0" />
                  <span>Teks & pratinjau yang dibagikan hanya memuat <strong>pertanyaan</strong>. Pembaca harus mengklik link untuk membaca jawaban resmi dari Ustaz.</span>
                </div>
              </div>

              {/* Direct Link Section */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-charcoal dark:text-[#D6AD52] uppercase tracking-wider block">
                  Salin Link Permanen Pertanyaan:
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="nb-input w-full px-3.5 py-2.5 text-xs font-mono select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="nb-btn nb-btn-primary px-4 py-2.5 text-xs shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-[#D6AD52]" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-[#D6AD52]" />
                        <span>Salin Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Social Share Buttons Grid */}
              <div className="space-y-2.5">
                <label className="text-xs font-extrabold text-charcoal dark:text-[#D6AD52] uppercase tracking-wider block">
                  Pilih Platform Berbagi:
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={handleShareWhatsApp}
                    className="nb-btn nb-btn-primary p-3 text-xs justify-center"
                  >
                    <MessageCircle className="w-4 h-4 text-[#D6AD52]" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={handleShareTelegram}
                    className="nb-btn bg-[#3478F6] text-white p-3 text-xs justify-center"
                  >
                    <Send className="w-4 h-4 text-white" />
                    <span>Telegram</span>
                  </button>

                  <button
                    onClick={handleShareFacebook}
                    className="nb-btn nb-btn-secondary p-3 text-xs justify-center"
                  >
                    <Facebook className="w-4 h-4 text-[#3478F6]" />
                    <span>Facebook</span>
                  </button>

                  <button
                    onClick={handleShareTwitter}
                    className="nb-btn bg-charcoal text-white p-3 text-xs justify-center"
                  >
                    <Twitter className="w-4 h-4 text-[#D6AD52]" />
                    <span>X (Twitter)</span>
                  </button>
                </div>

                {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                  <button
                    onClick={handleNativeShare}
                    className="w-full mt-2 nb-btn nb-btn-secondary py-2.5 px-4 text-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#D6AD52]" />
                    <span>Gunakan Menu Berbagi Bawaan Perangkat</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white dark:bg-[#16263D] border-t-2 border-charcoal dark:border-[#34465D] text-center">
          <button
            type="button"
            onClick={onClose}
            className="nb-btn nb-btn-secondary w-full sm:w-auto px-6 py-2 text-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
