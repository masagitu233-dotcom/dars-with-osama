import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Copy,
  Check,
  Share2,
  BookOpen,
  Send,
  Facebook,
  ExternalLink
} from 'lucide-react';
import { Course } from '../../types';
import {
  buildCourseShareData,
  copyCourseUrlToClipboard,
  DEFAULT_COURSE_COVER_IMAGE
} from '../../utils/courseShareHelper';

interface CourseShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
}

export const CourseShareModal: React.FC<CourseShareModalProps> = ({
  isOpen,
  onClose,
  course
}) => {
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [copiedInvite, setCopiedInvite] = useState<boolean>(false);

  if (!isOpen || !course) return null;

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://darswithosama.com';
  const shareData = buildCourseShareData(course, origin);

  const handleCopyUrl = async () => {
    const success = await copyCourseUrlToClipboard(shareData.url);
    if (success) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 3500);
    }
  };

  const handleCopyInvite = async () => {
    const success = await copyCourseUrlToClipboard(shareData.shareMessage);
    if (success) {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 3500);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareData.ogTitle,
          text: `Yuk, pelajari kurikulum "${course.title}" bersama ${course.instructor} di Dars with Osama:`,
          url: shareData.url
        });
        return;
      } catch {
        // User cancelled native share sheet
      }
    }
    handleCopyInvite();
  };

  const handleWhatsAppShare = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareData.shareMessage)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleTelegramShare = () => {
    const tgText = `Yuk, pelajari kurikulum ${course.title} bersama ${course.instructor} di Dars with Osama. Simak selengkapnya di sini:`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareData.url)}&text=${encodeURIComponent(tgText)}`;
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
  };

  const handleFacebookShare = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`;
    window.open(fbUrl, '_blank', 'noopener,noreferrer');
  };

  const handleTwitterShare = () => {
    const tweetText = `Yuk, pelajari kurikulum ${course.title} bersama ${course.instructor} di Dars with Osama:`;
    const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareData.url)}`;
    window.open(twUrl, '_blank', 'noopener,noreferrer');
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in font-sans"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-share-modal-title"
    >
      <div
        className="nb-card w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden bg-white dark:bg-[#1F5F63] text-[#171717] dark:text-[#CEFEF1]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-4 sm:p-5 bg-[#123D32] dark:bg-[#001722] text-[#FAF7F0] flex items-center justify-between border-b-2 border-[#171717] dark:border-[#4CA7A1] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-[#D6AD52] flex items-center justify-center text-[#123D32] border-2 border-[#171717]">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="course-share-modal-title" className="font-extrabold text-base text-[#FAF7F0] leading-tight">
                Bagikan Pembelajaran
              </h3>
              <p className="text-[11px] text-[#D6AD52] font-bold">
                Dars with Osama • KURIKULUM & MATERI
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-md bg-[#FAF7F0]/15 hover:bg-[#FAF7F0]/25 text-[#FAF7F0] border border-[#D6AD52]/50 flex items-center justify-center transition cursor-pointer"
            title="Tutup"
            aria-label="Tutup modal bagikan pembelajaran"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-4 sm:p-5 space-y-4 flex-1 min-h-0 overflow-y-auto">
          {/* COURSE PREVIEW CARD */}
          <div className="rounded-lg bg-[#FAF7F0] dark:bg-[#0D2B36] border-2 border-[#171717] dark:border-[#4CA7A1] overflow-hidden">
            <div className="relative aspect-video w-full bg-[#123D32] overflow-hidden border-b-2 border-[#171717] dark:border-[#4CA7A1]">
              <img
                src={shareData.thumbnailUrl}
                alt={course.title}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_COURSE_COVER_IMAGE;
                }}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <div className="absolute top-3 left-3">
                <span className="nb-badge bg-[#123D32] text-[#D6AD52] border-[#171717]">
                  Level: {course.level || 'Umum'}
                </span>
              </div>
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#D6AD52] block">
                  Kurikulum Pembelajaran
                </span>
                <p className="font-serif font-extrabold text-sm sm:text-base text-white line-clamp-1 drop-shadow-sm">
                  {course.title}
                </p>
              </div>
            </div>

            <div className="p-3.5 space-y-1 text-xs">
              <div className="flex items-center justify-between text-[#525855] dark:text-[#A6D6C9]">
                <span>Pengajar: <strong className="text-[#171717] dark:text-[#CEFEF1]">{course.instructor}</strong></span>
                <span>{course.sessionsCount ? `${course.sessionsCount} Sesi` : (course.totalDuration || 'Lengkap')}</span>
              </div>
              <p className="text-[#525855] dark:text-[#A6D6C9] line-clamp-2 pt-1 text-[11px] leading-relaxed">
                {course.description}
              </p>
            </div>
          </div>

          {/* PERMANENT URL COPY BOX */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#171717] dark:text-[#CEFEF1] flex items-center justify-between">
              <span>Tautan Permanen Pembelajaran:</span>
              <span className="text-[11px] text-[#525855] dark:text-[#A6D6C9] font-normal">
                Mengarahkan ke kurikulum utuh
              </span>
            </label>
            <div className="flex items-stretch gap-2">
              <div className="flex-1 px-3 py-2 bg-[#FAF7F0] dark:bg-[#0D2B36] border-2 border-[#171717] dark:border-[#4CA7A1] rounded-md text-xs font-mono text-[#171717] dark:text-[#CEFEF1] truncate flex items-center select-all">
                {shareData.url}
              </div>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="nb-btn nb-btn-gold px-3.5 py-2 text-xs shrink-0 flex items-center gap-1.5"
                title="Salin link pembelajaran"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-4 h-4 text-[#123D32]" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* SOCIAL SHARING BUTTONS */}
          <div className="space-y-2 pt-1">
            <p className="text-xs font-bold text-[#171717] dark:text-[#CEFEF1]">
              Bagikan Langsung ke Media Sosial:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* WhatsApp */}
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="nb-btn px-2.5 py-2 text-xs bg-[#25D366] text-white hover:bg-[#1EBE5D] flex items-center justify-center gap-1.5"
              >
                <span>WhatsApp</span>
              </button>

              {/* Telegram */}
              <button
                type="button"
                onClick={handleTelegramShare}
                className="nb-btn px-2.5 py-2 text-xs bg-[#229ED9] text-white hover:bg-[#1B8BC0] flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Telegram</span>
              </button>

              {/* Twitter / X */}
              <button
                type="button"
                onClick={handleTwitterShare}
                className="nb-btn px-2.5 py-2 text-xs bg-black text-white hover:bg-neutral-800 flex items-center justify-center gap-1.5"
              >
                <span>Twitter / X</span>
              </button>

              {/* Facebook */}
              <button
                type="button"
                onClick={handleFacebookShare}
                className="nb-btn px-2.5 py-2 text-xs bg-[#1877F2] text-white hover:bg-[#166FE5] flex items-center justify-center gap-1.5"
              >
                <Facebook className="w-3.5 h-3.5" />
                <span>Facebook</span>
              </button>
            </div>
          </div>

          {/* NATIVE SHARE & COPY MESSAGE */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={handleNativeShare}
              className="nb-btn nb-btn-primary flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Bagikan Lewat Menu Ponsel</span>
            </button>
            <button
              type="button"
              onClick={handleCopyInvite}
              className="nb-btn nb-btn-secondary py-2.5 px-3 text-xs flex items-center justify-center gap-1.5"
              title="Salin pesan ajakan lengkap dengan teks dan tautan"
            >
              {copiedInvite ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#123D32] dark:text-[#CEFEF1]" />
                  <span>Pesan Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Pesan Ajakan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* FOOTER NOTICE */}
        <div className="p-3 bg-[#FAF7F0] dark:bg-[#0D2B36] border-t-2 border-[#171717] dark:border-[#4CA7A1] text-center text-[11px] text-[#525855] dark:text-[#A6D6C9] shrink-0">
          Tautan ini dapat diakses oleh siapa saja untuk melihat kurikulum, menyimak video, dan membaca materi.
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
};
