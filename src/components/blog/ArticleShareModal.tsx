import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  MessageCircle,
  Send,
  Facebook,
  Instagram,
  ShieldCheck
} from 'lucide-react';
import { BlogPost } from '../../types';

interface ArticleShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: BlogPost;
}

export const ArticleShareModal: React.FC<ArticleShareModalProps> = ({
  isOpen,
  onClose,
  post
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [instagramCopied, setInstagramCopied] = useState<boolean>(false);

  if (!isOpen || !post) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://darswithosama.com';

  const articleUrl = post.slug
    ? `${origin}/article/${encodeURIComponent(post.slug)}`
    : `${origin}/?view=blog-detail&id=${encodeURIComponent(post.id)}`;

  const shareTitle = post.title;
  const shareExcerpt = post.excerpt || 'Kajian & Catatan Keilmuan Islam oleh Ustaz Osama Nur Samsil di Dars with Osama.';

  const handleCopyLink = (forInstagram = false) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(articleUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = articleUrl;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      if (forInstagram) {
        setInstagramCopied(true);
        setTimeout(() => setInstagramCopied(false), 4000);
      } else {
        setCopied(true);
        setTimeout(() => setCopied(false), 4000);
      }
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleWhatsAppShare = () => {
    const waText = `*${shareTitle}*\n\n${shareExcerpt}\n\nBaca artikel selengkapnya di:\n${articleUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleTelegramShare = () => {
    const tgText = `${shareTitle} - ${shareExcerpt}`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(articleUrl)}&text=${encodeURIComponent(tgText)}`;
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
  };

  const handleFacebookShare = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`;
    window.open(fbUrl, '_blank', 'noopener,noreferrer');
  };

  const handleTwitterShare = () => {
    const tweetText = `${shareTitle} - Dars with Osama`;
    const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(articleUrl)}`;
    window.open(twUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-fade-in font-sans">
      <div
        className="bg-[#FAF7F0] dark:bg-[#243A56] border-2 border-[#292D2B] dark:border-[#D6AD52] rounded-lg w-full max-w-lg overflow-hidden shadow-[6px_6px_0px_#292D2B] dark:shadow-[6px_6px_0px_#000000] space-y-0 relative text-[#292D2B] dark:text-[#F1F4F8]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-5 bg-[#123D32] dark:bg-[#16263D] text-white flex items-center justify-between border-b-2 border-[#292D2B] dark:border-[#D6AD52]/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#243A56] flex items-center justify-center text-[#D6AD52] border-2 border-[#D6AD52]">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold font-serif text-base text-white leading-tight">Bagikan Artikel</h3>
              <p className="text-[11px] text-[#D6AD52] font-bold">Dars with Osama • ILMU • KAJIAN • KITAB</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md bg-[#243A56] hover:bg-[#D6AD52] text-[#FAF7F0] hover:text-[#292D2B] border border-[#D6AD52] flex items-center justify-center transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* ARTICLE PREVIEW CARD */}
          <div className="p-3.5 rounded-md bg-white dark:bg-[#16263D] border-2 border-[#292D2B] dark:border-[#D6AD52]/60 flex gap-3.5 items-center shadow-[3px_3px_0px_#292D2B]">
            {post.coverImageUrl ? (
              <img
                src={post.coverImageUrl}
                alt={post.title}
                className="w-20 h-20 rounded-md object-cover shrink-0 border-2 border-[#292D2B] dark:border-[#D6AD52]"
              />
            ) : (
              <div className="w-20 h-20 rounded-md bg-[#123D32] dark:bg-[#16263D] text-[#D6AD52] font-bold text-xl flex items-center justify-center shrink-0 border-2 border-[#292D2B]">
                DW
              </div>
            )}
            <div className="space-y-1 min-w-0 flex-1">
              <span className="px-2 py-0.5 rounded bg-[#D6AD52] text-[#292D2B] border border-[#292D2B] font-extrabold text-[10px] uppercase inline-block">
                {post.category || 'Kajian'}
              </span>
              <h4 className="font-bold font-serif text-xs sm:text-sm text-[#292D2B] dark:text-white line-clamp-2 leading-snug">
                {post.title}
              </h4>
              <p className="text-[11px] text-[#292D2B]/75 dark:text-[#F1F4F8]/75 line-clamp-1">
                {post.excerpt}
              </p>
              <div className="text-[10px] text-[#123D32] dark:text-[#D6AD52] font-bold flex items-center gap-1 pt-0.5">
                <ShieldCheck className="w-3 h-3" />
                <span>darswithosama.com</span>
              </div>
            </div>
          </div>

          {/* SUCCESS COPY TOAST */}
          {copied && (
            <div className="p-3 rounded-md bg-[#123D32] border-2 border-[#D6AD52] text-[#FAF7F0] text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-[#D6AD52] shrink-0" />
              <span><strong>Link artikel berhasil disalin!</strong> Siap ditempel ke media sosial atau pesan.</span>
            </div>
          )}

          {/* SOCIAL PLATFORMS GRID */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-[#292D2B] dark:text-[#D6AD52] uppercase tracking-wider block">
              Pilih Platform Berbagi:
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="nb-btn nb-btn-primary p-3 text-xs justify-center"
              >
                <MessageCircle className="w-4 h-4 text-[#D6AD52]" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleTelegramShare}
                className="nb-btn bg-[#42658A] text-white p-3 text-xs justify-center"
              >
                <Send className="w-4 h-4 text-white" />
                <span>Telegram</span>
              </button>

              <button
                type="button"
                onClick={handleFacebookShare}
                className="nb-btn nb-btn-secondary p-3 text-xs justify-center"
              >
                <Facebook className="w-4 h-4 text-[#42658A]" />
                <span>Facebook</span>
              </button>

              <button
                type="button"
                onClick={handleTwitterShare}
                className="nb-btn bg-[#292D2B] text-white p-3 text-xs justify-center"
              >
                <Share2 className="w-4 h-4 text-[#D6AD52]" />
                <span>X (Twitter)</span>
              </button>
            </div>
          </div>

          {/* INSTAGRAM LINK GUIDE BOX */}
          <div className="p-3.5 rounded-md bg-white dark:bg-[#16263D] border-2 border-[#292D2B] dark:border-[#D6AD52]/60 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#292D2B] dark:text-[#D6AD52]">
              <Instagram className="w-4 h-4 text-[#F04438]" />
              <span>Petunjuk Berbagi ke Instagram:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#292D2B]/80 dark:text-[#F1F4F8]/80">
              Salin tautan ini, lalu tempelkan di Bio Profil, Story (Sticker Tautan), atau Pesan Langsung (DM) Instagram Anda.
            </p>
            <button
              type="button"
              onClick={() => handleCopyLink(true)}
              className="w-full nb-btn nb-btn-gold py-2 text-xs"
            >
              {instagramCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{instagramCopied ? 'Tautan Instagram Tersalin!' : 'Salin Tautan untuk Instagram'}</span>
            </button>
          </div>

          {/* DIRECT COPY LINK INPUT */}
          <div className="space-y-1.5 pt-2 border-t-2 border-[#292D2B]/15 dark:border-[#D6AD52]/25">
            <label className="text-xs font-extrabold text-[#292D2B] dark:text-[#D6AD52] uppercase tracking-wider block">
              Salin Tautan Permanen Artikel:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={articleUrl}
                className="nb-input flex-1 px-3.5 py-2.5 text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => handleCopyLink(false)}
                className="nb-btn nb-btn-primary px-4 py-2.5 text-xs shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-[#D6AD52]" /> : <Copy className="w-4 h-4 text-[#D6AD52]" />}
                <span>{copied ? 'Tersalin!' : 'Salin Link'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-white dark:bg-[#16263D] border-t-2 border-[#292D2B] dark:border-[#D6AD52]/60 text-center">
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
