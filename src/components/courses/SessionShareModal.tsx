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

  // Native Web Share API if supported
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

  // WhatsApp Share Handler
  const handleWhatsAppShare = () => {
    const waText = `Yuk, pelajari sesi *${session.title}* (${course.title}) bersama *Dars with Osama*.\n\nTonton videonya di sini:\n${shareData.url}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Telegram Share Handler
  const handleTelegramShare = () => {
    const tgText = `Yuk, pelajari sesi ${session.title} (${course.title}) bersama Dars with Osama. Tonton videonya di sini:`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareData.url)}&text=${encodeURIComponent(tgText)}`;
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
  };

  // Facebook Share Handler
  const handleFacebookShare = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`;
    window.open(fbUrl, '_blank', 'noopener,noreferrer');
  };

  // X / Twitter Share Handler
  const handleTwitterShare = () => {
    const tweetText = `Yuk, pelajari sesi ${session.title} bersama Dars with Osama. Tonton videonya di sini:`;
    const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareData.url)}`;
    window.open(twUrl, '_blank', 'noopener,noreferrer');
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs animate-fade-in font-sans"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-share-modal-title"
    >
      <div
        className="bg-white dark:bg-[#071B16] border border-[#073B2E]/20 dark:border-[#C9A34E]/30 rounded-3xl w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl space-y-0 relative text-stone-800 dark:text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#073B2E] via-[#094838] to-[#0D5B46] text-white flex items-center justify-between border-b border-[#C9A34E]/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-[#F4B942] border border-white/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="session-share-modal-title" className="font-bold text-base text-white leading-tight">
                Bagikan Sesi Pembelajaran
              </h3>
              <p className="text-[11px] text-[#F4B942] font-medium">
                Dars with Osama • ILMU • KAJIAN • KITAB
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            title="Tutup"
            aria-label="Tutup modal bagikan sesi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 flex-1 min-h-0 overflow-y-auto">
          {/* SOCIAL PREVIEW CARD (THUMBNAIL + TITLE + INVITATION + DOMAIN) */}
          <div className="rounded-2xl bg-stone-50 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
            <div className="relative aspect-video w-full bg-stone-900 overflow-hidden">
              <img
                src={shareData.thumbnailUrl}
                alt={session.title}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    course.coverImageUrl || DEFAULT_SESSION_COVER_IMAGE;
                }}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute top-3 left-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#073B2E]/90 text-[#F4B942] border border-[#C9A34E]/40 text-[10px] font-bold backdrop-blur-xs">
                  <Video className="w-3 h-3" />
                  <span>{course.title}</span>
                </span>
              </div>
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <p className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Dars with Osama • Preview Tautan Sosial</span>
                </p>
                <h4 className="font-bold text-sm sm:text-base text-white line-clamp-1 mt-0.5">
                  {session.title}
                </h4>
              </div>
            </div>

            <div className="p-3.5 space-y-1.5">
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed line-clamp-2">
                {shareData.ogDescription}
              </p>
            </div>
          </div>

          {/* FEEDBACK BANNER */}
          {(copiedUrl || copiedInvite) && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 text-xs flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
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
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C9A34E]" />
                <span>Teks Ajakan Menonton Sesi:</span>
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(shareData.shareMessage, 'invite')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-semibold transition cursor-pointer active:scale-95"
              >
                {copiedInvite ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedInvite ? 'Tersalin!' : 'Salin Ajakan'}</span>
              </button>
            </div>
            <p className="text-xs text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 leading-relaxed select-all">
              {shareData.shareMessage}
            </p>
          </div>

          {/* SOCIAL PLATFORMS GRID */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider block">
              Bagikan Langsung ke Platform:
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              {/* WHATSAPP */}
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-2.5 justify-center shadow-xs cursor-pointer active:scale-95"
              >
                <MessageCircle className="w-4 h-4 text-emerald-200" />
                <span>WhatsApp</span>
              </button>

              {/* TELEGRAM */}
              <button
                type="button"
                onClick={handleTelegramShare}
                className="p-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition flex items-center gap-2.5 justify-center shadow-xs cursor-pointer active:scale-95"
              >
                <Send className="w-4 h-4 text-sky-200" />
                <span>Telegram</span>
              </button>

              {/* FACEBOOK */}
              <button
                type="button"
                onClick={handleFacebookShare}
                className="p-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition flex items-center gap-2.5 justify-center shadow-xs cursor-pointer active:scale-95"
              >
                <Facebook className="w-4 h-4 text-blue-200" />
                <span>Facebook</span>
              </button>

              {/* X / TWITTER */}
              <button
                type="button"
                onClick={handleTwitterShare}
                className="p-3 rounded-xl bg-stone-900 dark:bg-stone-800 hover:bg-stone-800 dark:hover:bg-stone-700 text-white text-xs font-bold transition flex items-center gap-2.5 justify-center shadow-xs cursor-pointer active:scale-95 border border-stone-700"
              >
                <Share2 className="w-4 h-4 text-stone-300" />
                <span>X (Twitter)</span>
              </button>
            </div>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full mt-2 p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Bagikan melalui Menu Perangkat...</span>
              </button>
            )}
          </div>

          {/* DIRECT COPY LINK INPUT */}
          <div className="space-y-1.5 pt-2 border-t border-stone-200 dark:border-stone-800">
            <label
              htmlFor="session-permanent-url-input"
              className="text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider block"
            >
              Salin Tautan Permanen Sesi:
            </label>
            <div className="flex items-center gap-2">
              <input
                id="session-permanent-url-input"
                type="text"
                readOnly
                value={shareData.url}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs text-stone-800 dark:text-stone-200 font-mono focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(shareData.url, 'url')}
                className="px-4 py-2.5 bg-[#073B2E] hover:bg-[#0a4d3c] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 shadow-xs"
              >
                {copiedUrl ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-[#F4B942]" />
                )}
                <span>{copiedUrl ? 'Tersalin!' : 'Salin Link'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-3.5 bg-stone-50 dark:bg-[#051511] border-t border-stone-200 dark:border-stone-800/60 text-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold hover:bg-stone-300 dark:hover:bg-stone-700 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
