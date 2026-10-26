import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Copy,
  Check,
  Share2,
  MessageCircle,
  Send,
  Facebook,
  ShieldCheck,
  Video,
  Sparkles
} from 'lucide-react';
import { Course, Session } from '../../types';
import { buildSessionShareData, DEFAULT_SESSION_COVER_IMAGE } from '../../utils/sessionShareHelper';

interface SessionShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session;
  course: Course;
}

export const SessionShareModal: React.FC<SessionShareModalProps> = ({
  isOpen,
  onClose,
  session,
  course
}) => {
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [copiedInvite, setCopiedInvite] = useState<boolean>(false);

  if (!isOpen || !session) return null;

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://darswithosama.com';
  const shareData = buildSessionShareData(session, course, origin);

  const copyToClipboard = (text: string, type: 'url' | 'invite') => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      if (type === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 3500);
      } else {
        setCopiedInvite(true);
        setTimeout(() => setCopiedInvite(false), 3500);
      }
    } catch (err) {
      console.error('Failed to copy session share text:', err);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareData.ogTitle,
          text: `Yuk, pelajari sesi ${session.title} bersama Dars with Osama. Tonton videonya di sini:`,
          url: shareData.url
        });
      } catch {
        // User cancelled native share sheet
      }
    } else {
      copyToClipboard(shareData.shareMessage, 'invite');
    }
  };

  const handleWhatsAppShare = () => {
    const waText = `Yuk, pelajari sesi *${session.title}* (${course.title}) bersama *Dars with Osama*.\n\nTonton videonya di sini:\n${shareData.url}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleTelegramShare = () => {
    const tgText = `Yuk, pelajari sesi ${session.title} (${course.title}) bersama Dars with Osama. Tonton videonya di sini:`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareData.url)}&text=${encodeURIComponent(tgText)}`;
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
  };

  const handleFacebookShare = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`;
    window.open(fbUrl, '_blank', 'noopener,noreferrer');
  };

  const handleTwitterShare = () => {
    const tweetText = `Yuk, pelajari sesi ${session.title} bersama Dars with Osama. Tonton videonya di sini:`;
    const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareData.url)}`;
    window.open(twUrl, '_blank', 'noopener,noreferrer');
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in font-sans"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-share-modal-title"
    >
      <div
        className="nb-card w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden bg-white dark:bg-[#0B3026] text-[#171717] dark:text-[#F8F3E8]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-4 sm:p-5 bg-[#06251D] text-[#F8F3E8] flex items-center justify-between border-b-2 border-[#171717] dark:border-[#D9AC45]/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-[#D9AC45] flex items-center justify-center text-[#171717] border-2 border-[#171717]">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="session-share-modal-title" className="font-extrabold text-base text-[#F8F3E8] leading-tight">
                Bagikan Sesi Pembelajaran
              </h3>
              <p className="text-[11px] text-[#D9AC45] font-bold">
                Dars with Osama • ILMU • KAJIAN • KITAB
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-md bg-[#F8F3E8]/15 hover:bg-[#F8F3E8]/25 text-[#F8F3E8] border border-[#D9AC45]/50 flex items-center justify-center transition cursor-pointer"
            title="Tutup"
            aria-label="Tutup modal bagikan sesi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 flex-1 min-h-0 overflow-y-auto">
          {/* SOCIAL PREVIEW CARD */}
          <div className="rounded-lg bg-[#F8F3E8] dark:bg-[#06251D] border-2 border-[#171717] dark:border-[#D9AC45]/60 overflow-hidden">
            <div className="relative aspect-video w-full bg-[#171717] overflow-hidden border-b-2 border-[#171717]">
              <img
                src={shareData.thumbnailUrl}
                alt={session.title}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    course.coverImageUrl || DEFAULT_SESSION_COVER_IMAGE;
                }}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <div className="absolute top-3 left-3">
                <span className="nb-badge bg-[#06251D] text-[#D9AC45]">
                  <Video className="w-3 h-3" />
                  <span>{course.title}</span>
                </span>
              </div>
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <p className="text-[10px] uppercase tracking-wider text-[#D9AC45] font-extrabold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Dars with Osama • Preview Tautan Sosial</span>
                </p>
                <h4 className="font-extrabold text-sm sm:text-base text-white line-clamp-1 mt-0.5">
                  {session.title}
                </h4>
              </div>
            </div>

            <div className="p-3.5 space-y-1.5">
              <p className="text-xs text-[#171717]/80 dark:text-[#F8F3E8]/80 leading-relaxed line-clamp-2">
                {shareData.ogDescription}
              </p>
            </div>
          </div>

          {/* FEEDBACK BANNER */}
          {(copiedUrl || copiedInvite) && (
            <div className="p-3 rounded-md bg-[#D9AC45] border-2 border-[#171717] text-[#171717] text-xs font-bold flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 shrink-0" />
              <span>
                <strong>
                  {copiedInvite
                    ? 'Pesan ajakan & tautan sesi berhasil disalin!'
                    : 'Link permanen sesi berhasil disalin!'}
                </strong>{' '}
                Siap dibagikan ke rekan penuntut ilmu.
              </span>
            </div>
          )}

          {/* INVITATION MESSAGE BOX */}
          <div className="p-3.5 rounded-lg bg-[#F8F3E8] dark:bg-[#06251D] border-2 border-[#171717] dark:border-[#D9AC45]/60 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold text-[#06251D] dark:text-[#D9AC45] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Teks Ajakan Menonton Sesi:</span>
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(shareData.shareMessage, 'invite')}
                className="nb-btn nb-btn-primary px-2.5 py-1 text-[11px]"
              >
                {copiedInvite ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedInvite ? 'Tersalin!' : 'Salin Ajakan'}</span>
              </button>
            </div>
            <p className="text-xs text-[#171717] dark:text-[#F8F3E8] bg-white dark:bg-[#0B3026] p-2.5 rounded-md border-2 border-[#171717] dark:border-[#D9AC45]/50 leading-relaxed select-all">
              {shareData.shareMessage}
            </p>
          </div>

          {/* SOCIAL PLATFORMS GRID */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] uppercase tracking-wider block">
              Bagikan Langsung ke Platform:
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="nb-btn nb-btn-primary p-2.5 text-xs justify-center"
              >
                <MessageCircle className="w-4 h-4 text-[#D9AC45]" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleTelegramShare}
                className="nb-btn bg-[#3478F6] text-white border-2 border-[#171717] p-2.5 text-xs justify-center"
              >
                <Send className="w-4 h-4" />
                <span>Telegram</span>
              </button>

              <button
                type="button"
                onClick={handleFacebookShare}
                className="nb-btn nb-btn-secondary p-2.5 text-xs justify-center"
              >
                <Facebook className="w-4 h-4 text-[#3478F6]" />
                <span>Facebook</span>
              </button>

              <button
                type="button"
                onClick={handleTwitterShare}
                className="nb-btn bg-[#171717] text-white border-2 border-[#171717] p-2.5 text-xs justify-center"
              >
                <Share2 className="w-4 h-4 text-[#D9AC45]" />
                <span>X (Twitter)</span>
              </button>
            </div>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="nb-btn nb-btn-secondary w-full mt-2 p-2.5 text-xs justify-center"
              >
                <Share2 className="w-4 h-4 text-[#06251D] dark:text-[#D9AC45]" />
                <span>Bagikan melalui Menu Perangkat...</span>
              </button>
            )}
          </div>

          {/* DIRECT COPY LINK INPUT */}
          <div className="space-y-1.5 pt-2 border-t-2 border-[#171717]/20 dark:border-[#D9AC45]/30">
            <label
              htmlFor="session-permanent-url-input"
              className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] uppercase tracking-wider block"
            >
              Salin Tautan Permanen Sesi:
            </label>
            <div className="flex items-center gap-2">
              <input
                id="session-permanent-url-input"
                type="text"
                readOnly
                value={shareData.url}
                className="nb-input flex-1 px-3 py-2 text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(shareData.url, 'url')}
                className="nb-btn nb-btn-gold px-4 py-2 text-xs shrink-0"
              >
                {copiedUrl ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{copiedUrl ? 'Tersalin!' : 'Salin Link'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-3.5 bg-[#F8F3E8] dark:bg-[#06251D] border-t-2 border-[#171717] dark:border-[#D9AC45]/50 text-center shrink-0">
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

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
