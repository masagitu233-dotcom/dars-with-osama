import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';
import {
  FeatureShareConfig,
  getFeatureShareUrl,
  formatFeatureShareMessage,
  getWhatsAppShareUrl
} from '../../utils/featureShareHelper';
import { useAuth } from '../../context/AuthContext';

export interface FeatureShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: FeatureShareConfig;
  customUrl?: string;
}

/**
 * Reusable Share Modal component dedicated to main features (Artikel Ilmiah and Tanya Jawab).
 * Provides:
 * - Salin tautan beserta narasi ajakan
 * - Bagikan melalui WhatsApp
 * - Bagikan menggunakan fitur bawaan perangkat (navigator.share) jika didukung
 */
export const FeatureShareModal: React.FC<FeatureShareModalProps> = ({
  isOpen,
  onClose,
  config,
  customUrl
}) => {
  const { showToast } = useAuth();
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [copiedUrlOnly, setCopiedUrlOnly] = useState<boolean>(false);

  const targetUrl = useMemo(() => {
    return customUrl || getFeatureShareUrl(config.id);
  }, [config.id, customUrl]);

  const fullMessage = useMemo(() => {
    return formatFeatureShareMessage(config.narration, targetUrl);
  }, [config.narration, targetUrl]);

  const isNativeShareSupported = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  // Reset copy state on open
  useEffect(() => {
    if (isOpen) {
      setCopiedText(false);
      setCopiedUrlOnly(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyFullMessage = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullMessage);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = fullMessage;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedText(true);
      showToast('Tautan dan pesan ajakan berhasil disalin!');
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      showToast('Gagal menyalin pesan.');
    }
  };

  const handleCopyUrlOnly = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(targetUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = targetUrl;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedUrlOnly(true);
      showToast('Tautan berhasil disalin!');
      setTimeout(() => setCopiedUrlOnly(false), 2500);
    } catch {
      showToast('Gagal menyalin tautan.');
    }
  };

  const handleShareWhatsApp = () => {
    const waUrl = getWhatsAppShareUrl(config.narration, targetUrl);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    if (isNativeShareSupported) {
      try {
        await navigator.share({
          title: `${config.title} — Dars with Osama`,
          text: config.narration,
          url: targetUrl
        });
      } catch {
        // User dismissed share dialog
      }
    } else {
      handleCopyFullMessage();
    }
  };

  return (
    <div
      data-testid="feature-share-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-80 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in"
    >
      <div
        data-testid="feature-share-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FAF7F0] dark:bg-[#1A283C] border-3 border-[#171717] dark:border-[#D6AD52] rounded-lg max-w-lg w-full text-[#171717] dark:text-[#FAF7F0] shadow-[6px_6px_0px_#171717] dark:shadow-[6px_6px_0px_#000000] overflow-hidden flex flex-col my-auto animate-modal-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feature-share-modal-title"
      >
        {/* Modal Top Header Bar */}
        <div className="p-4 sm:p-5 bg-[#123D32] dark:bg-[#16263D] text-[#FAF7F0] border-b-2 border-[#171717] dark:border-[#D6AD52]/60 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-md bg-[#D6AD52] text-[#123D32] flex items-center justify-center border-2 border-[#171717] shadow-[2px_2px_0px_#171717] shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3
                id="feature-share-modal-title"
                data-testid="feature-share-title"
                className="text-sm sm:text-base font-extrabold font-serif-brand text-white leading-tight"
              >
                Bagikan {config.title}
              </h3>
              <p className="text-[11px] font-bold text-[#D6AD52]">
                Dars with Osama — Ruang Belajar Fikih &amp; Turats
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="feature-share-close-btn"
            onClick={onClose}
            className="p-1.5 rounded bg-[#243A56] hover:bg-[#F04438] text-[#FAF7F0] border border-[#D6AD52] transition cursor-pointer shadow-xs shrink-0"
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 text-xs">
          {/* Badge & Introduction */}
          <div className="flex items-center justify-between gap-2 border-b-2 border-[#171717]/15 dark:border-[#D6AD52]/20 pb-3">
            <span
              data-testid="feature-share-badge"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#C6A75E] text-[#171923] text-[10px] font-extrabold uppercase tracking-wider border border-[#171717]"
            >
              <Sparkles className="w-3 h-3 text-[#171923]" />
              <span>{config.badge}</span>
            </span>
            <span className="text-[11px] text-[#626A66] dark:text-[#B4C0D0] font-bold">
              Tautan Langsung Resmi
            </span>
          </div>

          {/* Narration Preview Card */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-[#123D32] dark:text-[#D6AD52] block uppercase tracking-wider">
              Pesan &amp; Narasi Ajakan:
            </label>
            <div
              data-testid="feature-share-narration-box"
              className="p-4 rounded-lg bg-white dark:bg-[#101B2D] border-2 border-[#171717] dark:border-[#34465D] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#000000] space-y-3"
            >
              <p className="text-xs sm:text-[13px] leading-relaxed text-[#292D2B] dark:text-[#F1F4F8] font-medium italic">
                &ldquo;{config.narration}&rdquo;
              </p>

              {/* URL Display Box */}
              <div className="pt-2 border-t border-[#171717]/10 dark:border-[#34465D] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#123D32] dark:text-[#D6AD52] truncate font-bold">
                  <LinkIcon className="w-3.5 h-3.5 shrink-0 text-[#123D32] dark:text-[#D6AD52]" />
                  <span data-testid="feature-share-target-url" className="truncate">
                    {targetUrl}
                  </span>
                </div>
                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded bg-[#FAF7F0] dark:bg-[#243A56] hover:bg-[#D6AD52] text-[#171717] dark:text-[#FAF7F0] border border-[#171717]/40 dark:border-[#D6AD52]/40 transition shrink-0"
                  title="Buka Tautan di Tab Baru"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Action Buttons Section */}
          <div className="space-y-2.5 pt-1">
            {/* Primary Action: Copy Full Invitation Message & Link */}
            <button
              type="button"
              data-testid="feature-share-copy-full-btn"
              onClick={handleCopyFullMessage}
              className={`w-full py-2.5 px-4 rounded-md font-extrabold text-xs flex items-center justify-center gap-2 border-2 border-[#171717] transition-all cursor-pointer shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#000000] ${
                copiedText
                  ? 'bg-[#123D32] text-[#FAF7F0]'
                  : 'bg-[#D6AD52] hover:bg-[#E5BE65] text-[#171923]'
              }`}
            >
              {copiedText ? (
                <>
                  <Check className="w-4 h-4 text-[#D6AD52]" />
                  <span>Pesan &amp; Tautan Berhasil Disalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#171923]" />
                  <span>Salin Tautan Beserta Pesan Ajakan</span>
                </>
              )}
            </button>

            {/* WhatsApp Share Button */}
            <button
              type="button"
              data-testid="feature-share-whatsapp-btn"
              onClick={handleShareWhatsApp}
              className="w-full py-2.5 px-4 rounded-md font-extrabold text-xs flex items-center justify-center gap-2 border-2 border-[#171717] bg-[#25D366] hover:bg-[#20BD5A] text-[#FAF7F0] transition-all cursor-pointer shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#000000]"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Bagikan Melalui WhatsApp</span>
            </button>

            {/* Native Device Share (if supported) */}
            {isNativeShareSupported && (
              <button
                type="button"
                data-testid="feature-share-native-btn"
                onClick={handleNativeShare}
                className="w-full py-2.5 px-4 rounded-md font-extrabold text-xs flex items-center justify-center gap-2 border-2 border-[#171717] dark:border-[#D6AD52] bg-white dark:bg-[#243A56] hover:bg-[#FAF7F0] dark:hover:bg-[#345275] text-[#171717] dark:text-[#FAF7F0] transition-all cursor-pointer shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#000000]"
              >
                <Share2 className="w-4 h-4 text-[#123D32] dark:text-[#D6AD52]" />
                <span>Bagikan via Menu Bawaan Perangkat</span>
              </button>
            )}

            {/* Quick URL Only Copy Option */}
            <div className="pt-2 text-center">
              <button
                type="button"
                data-testid="feature-share-copy-url-only-btn"
                onClick={handleCopyUrlOnly}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#626A66] dark:text-[#B4C0D0] hover:text-[#123D32] dark:hover:text-[#D6AD52] transition cursor-pointer hover:underline"
              >
                {copiedUrlOnly ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tautan tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Hanya salin tautan saja (tanpa narasi)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer Info */}
        <div className="px-5 py-3 bg-[#FAF7F0] dark:bg-[#16263D] border-t-2 border-[#171717]/15 dark:border-[#D6AD52]/40 text-center text-[10px] text-[#626A66] dark:text-[#B4C0D0] font-medium">
          Tautan ini mengarah langsung ke halaman utama {config.title} dan dapat dibuka dari semua perangkat.
        </div>
      </div>
    </div>
  );
};
