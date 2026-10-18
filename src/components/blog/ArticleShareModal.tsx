import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  ExternalLink,
  MessageCircle,
  Send,
  Facebook,
  Instagram,
  Sparkles,
  ShieldCheck,
  AlertCircle
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
  
  // Permanent article URL
  const articleUrl = post.slug 
    ? `${origin}/article/${encodeURIComponent(post.slug)}`
    : `${origin}/?view=blog-detail&id=${encodeURIComponent(post.id)}`;

  const shareTitle = post.title;
  const shareExcerpt = post.excerpt || 'Kajian & Catatan Keilmuan Islam oleh Ustaz Osama Nur Samsil di Dars with Osama.';

  // Fallback Copy Function supporting all browsers
  const handleCopyLink = (forInstagram = false) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(articleUrl);
      } else {
        // Fallback for older browsers
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

  // WhatsApp Share Handler
  const handleWhatsAppShare = () => {
    const waText = `*${shareTitle}*\n\n${shareExcerpt}\n\nBaca artikel selengkapnya di:\n${articleUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Telegram Share Handler
  const handleTelegramShare = () => {
    const tgText = `${shareTitle} - ${shareExcerpt}`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(articleUrl)}&text=${encodeURIComponent(tgText)}`;
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
  };

  // Facebook Share Handler
  const handleFacebookShare = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`;
    window.open(fbUrl, '_blank', 'noopener,noreferrer');
  };

  // X / Twitter Share Handler
  const handleTwitterShare = () => {
    const tweetText = `${shareTitle} - Dars with Osama`;
    const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(articleUrl)}`;
    window.open(twUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-fade-in font-sans">
      <div
        className="bg-white dark:bg-[#071B16] border border-[#073B2E]/20 dark:border-[#C9A34E]/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-0 relative text-stone-800 dark:text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-5 bg-gradient-to-r from-[#073B2E] via-[#094838] to-[#0D5B46] text-white flex items-center justify-between border-b border-[#C9A34E]/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-[#F4B942] border border-white/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white leading-tight">Bagikan Artikel</h3>
              <p className="text-[11px] text-[#F4B942] font-medium">Dars with Osama • ILMU • KAJIAN • KITAB</p>
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

        <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* ARTICLE PREVIEW CARD */}
          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800 flex gap-3.5 items-center">
            {post.coverImageUrl ? (
              <img
                src={post.coverImageUrl}
                alt={post.title}
                className="w-20 h-20 rounded-xl object-cover shrink-0 border border-stone-200 dark:border-stone-700"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-emerald-900 text-[#F4B942] font-bold text-xl flex items-center justify-center shrink-0">
                DW
              </div>
            )}
            <div className="space-y-1 min-w-0 flex-1">
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] inline-block">
                {post.category || 'Kajian'}
              </span>
              <h4 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white line-clamp-2 leading-snug">
                {post.title}
              </h4>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1">
                {post.excerpt}
              </p>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 pt-0.5">
                <ShieldCheck className="w-3 h-3" />
                <span>darswithosama.com</span>
              </div>
            </div>
          </div>

          {/* SUCCESS COPY TOAST */}
          {copied && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 text-xs flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span><strong>Link artikel berhasil disalin!</strong> Siap ditempel ke media sosial atau pesan.</span>
            </div>
          )}

          {/* SOCIAL PLATFORMS GRID */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider block">
              Pilih Platform Berbagi:
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
          </div>

          {/* INSTAGRAM LINK GUIDE BOX */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-100">
              <Instagram className="w-4 h-4 text-pink-600" />
              <span>Petunjuk Berbagi ke Instagram:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">
              Instagram tidak mendukung pengiriman tautan langsung secara otomatis melalui web. Anda dapat menyalin tautan ini, lalu menempelkannya di **Bio Profil**, **Story (Sticker Tautan)**, atau **Pesan Langsung (DM)** Instagram Anda.
            </p>
            <button
              type="button"
              onClick={() => handleCopyLink(true)}
              className="w-full py-2 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:opacity-90 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              {instagramCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{instagramCopied ? 'Tautan Instagram Tersalin!' : 'Salin Tautan untuk Instagram'}</span>
            </button>
          </div>

          {/* DIRECT COPY LINK INPUT */}
          <div className="space-y-1.5 pt-2 border-t border-stone-200 dark:border-stone-800">
            <label className="text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider block">
              Salin Tautan Permanen Artikel:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={articleUrl}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs text-stone-800 dark:text-stone-200 font-mono focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => handleCopyLink(false)}
                className="px-4 py-2.5 bg-[#073B2E] hover:bg-[#0a4d3c] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 shadow-xs"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#F4B942]" />}
                <span>{copied ? 'Tersalin!' : 'Salin Link'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-4 bg-stone-50 dark:bg-[#051511] border-t border-stone-200 dark:border-stone-800/60 text-center">
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
};
