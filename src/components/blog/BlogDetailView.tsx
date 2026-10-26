import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Eye,
  Share2,
  Copy,
  Check,
  Tag,
  BookOpen
} from 'lucide-react';
import { BlogPost } from '../../types';
import { incrementBlogPostViews } from '../../firebase/services';
import { autoWrapArabicText } from '../../utils/arabicFontHelper';
import { sanitizeRichTextHtml } from '../../utils/richTextHelper';
import { ArticleShareModal } from './ArticleShareModal';
import { useArticleSEO } from '../../hooks/useArticleSEO';
import { ArticleAudioPlayer } from './ArticleAudioPlayer';
import { ArticleCommentsSection } from './ArticleCommentsSection';

interface BlogDetailViewProps {
  post: BlogPost;
  allPosts: BlogPost[];
  onBack: () => void;
  onSelectArticle: (article: BlogPost) => void;
}

export const BlogDetailView: React.FC<BlogDetailViewProps> = ({
  post,
  allPosts,
  onBack,
  onSelectArticle
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);

  // Dynamically inject OpenGraph, Twitter cards, and Schema.org metadata for crawlers & social media
  useArticleSEO(post);

  useEffect(() => {
    if (post && post.id) {
      incrementBlogPostViews(post.id);
    }
  }, [post.id]);

  // Find related articles (same category or shared tags, excluding current post)
  const relatedArticles = allPosts
    .filter(p => p.id !== post.id && (p.category === post.category || p.tags.some(t => post.tags.includes(t))))
    .slice(0, 3);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://darswithosama.com';

  // Permanent canonical URL for this article
  const articleUrl = post.slug
    ? `${origin}/article/${encodeURIComponent(post.slug)}`
    : `${origin}/?view=blog-detail&id=${encodeURIComponent(post.id)}`;

  const handleCopyLink = () => {
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
      setCopied(true);
      setTimeout(() => setCopied(false), 3500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: articleUrl
        });
      } catch (err) {
        // User cancelled native share
      }
    } else {
      setShareModalOpen(true);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-2.5 sm:px-6 lg:px-8 space-y-5 sm:space-y-8 py-4 sm:py-6 pb-16 animate-fade-in font-sans">
      {/* BREADCRUMB & TOP ACTIONS */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="nb-btn nb-btn-secondary px-3.5 py-2 text-xs"
        >
          <ArrowLeft className="w-4 h-4 text-[#06251D] dark:text-[#D9AC45]" />
          <span>Kembali ke Daftar Artikel</span>
        </button>

        <div className="flex items-center gap-2.5">
          {/* Salin Link Button */}
          <button
            onClick={handleCopyLink}
            className="nb-btn nb-btn-secondary px-3.5 py-2 text-xs"
            title="Salin tautan permanen artikel ini"
          >
            {copied ? <Check className="w-4 h-4 text-[#06251D] dark:text-[#D9AC45]" /> : <Copy className="w-4 h-4 text-[#D9AC45]" />}
            <span>{copied ? 'Link Disalin!' : 'Salin Link'}</span>
          </button>

          {/* Bagikan Artikel Button */}
          <button
            onClick={handleShare}
            className="nb-btn nb-btn-gold px-3.5 py-2 text-xs"
            title="Bagikan artikel ke WhatsApp, Telegram, Facebook, X, atau Instagram"
          >
            <Share2 className="w-4 h-4" />
            <span>Bagikan Artikel</span>
          </button>
        </div>
      </div>

      {/* COPIED TOAST NOTIFICATION BANNER */}
      {copied && (
        <div className="p-3.5 rounded-md bg-[#06251D] border-2 border-[#D9AC45] text-[#F8F3E8] text-xs flex items-center justify-between shadow-[4px_4px_0px_#171717] animate-fade-in">
          <div className="flex items-center gap-2.5">
            <Check className="w-4 h-4 text-[#D9AC45] shrink-0" />
            <div>
              <strong>Link artikel berhasil disalin!</strong> Tautan permanen siap dibagikan ke WhatsApp, Telegram, atau media sosial.
            </div>
          </div>
          <span className="text-[10px] font-mono bg-[#0B3026] px-2 py-0.5 rounded border border-[#D9AC45]/40 text-[#D9AC45] hidden sm:inline-block">
            {articleUrl}
          </span>
        </div>
      )}

      {/* CALM EDITORIAL ARTICLE READING CARD */}
      <article className="nb-reading-surface p-3.5 sm:p-8 md:p-12 space-y-5 sm:space-y-8 border-0 sm:border-2 shadow-none sm:shadow-[4px_4px_0px_rgba(23,23,23,0.18)]">
        {/* Editorial Header */}
        <div className="space-y-4 border-b-2 border-[#171717]/15 dark:border-[#D9AC45]/25 pb-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 bg-[#06251D] text-[#D9AC45] font-extrabold text-xs uppercase tracking-wider rounded border-2 border-[#171717] dark:border-[#D9AC45]">
              {post.category}
            </span>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[#171717]/75 dark:text-[#F8F3E8]/75 font-bold">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#06251D] dark:text-[#D9AC45]" />
                {new Date(post.publishedAt || post.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#3478F6]" />
                {post.readingTimeMinutes} Menit Baca
              </span>
              {post.viewsCount !== undefined && post.viewsCount > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-[#D9AC45]" />
                    {post.viewsCount} Dibaca
                  </span>
                </>
              )}
            </div>
          </div>

          <h1
            className="text-2xl sm:text-4xl font-bold text-[#171717] dark:text-[#F8F3E8] leading-tight font-serif tracking-tight"
            dangerouslySetInnerHTML={{ __html: autoWrapArabicText(post.title) }}
          />

          {post.titleAr && (
            <p className="font-amiri text-2xl sm:text-3xl text-[#06251D] dark:text-[#D9AC45] font-bold leading-relaxed" dir="rtl">
              {post.titleAr}
            </p>
          )}

          <p
            className="text-xs sm:text-base text-[#171717]/85 dark:text-[#F8F3E8]/85 leading-relaxed border-l-3 sm:border-l-4 border-[#D9AC45] pl-3 sm:pl-4 py-2 bg-[#F8F3E8] dark:bg-[#06251D] rounded-r-md font-medium"
            dangerouslySetInnerHTML={{ __html: autoWrapArabicText(post.excerpt) }}
          />
        </div>

        {/* AUDIO READING PLAYER (Hanya tampil jika diaktifkan admin) */}
        {post.audioConfig?.enabled && (
          <ArticleAudioPlayer post={post} />
        )}

        {/* COVER IMAGE */}
        {post.coverImageUrl && (
          <figure className="space-y-2">
            <div className="aspect-video w-full rounded-md overflow-hidden bg-[#06251D] border-2 border-[#171717] dark:border-[#D9AC45]/60">
              <img
                src={post.coverImageUrl}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
            {post.coverImageCaption && (
              <figcaption className="text-center text-xs text-[#171717]/70 dark:text-[#F8F3E8]/70 italic">
                {post.coverImageCaption}
              </figcaption>
            )}
          </figure>
        )}

        {/* MAIN BODY HTML CONTENT — Calm reading zone */}
        <div
          data-testid="article-body-content"
          className="prose dark:prose-invert max-w-none sm:max-w-[68ch] mx-auto text-[#171717] dark:text-[#F8F3E8] text-sm sm:text-base leading-relaxed space-y-3.5 sm:space-y-4 font-sans blog-content"
          dangerouslySetInnerHTML={{ __html: autoWrapArabicText(sanitizeRichTextHtml(post.content)) }}
        />

        {/* ARABIC CONTENT SECTION (IF PRESENT) */}
        {post.contentAr && (
          <div
            className="p-3.5 sm:p-6 bg-[#F8F3E8] dark:bg-[#06251D] border-0 sm:border-2 border-[#171717] dark:border-[#D9AC45] rounded-md space-y-3 font-amiri text-right text-base sm:text-lg text-[#06251D] dark:text-[#F8F3E8]"
            dir="rtl"
          >
            <div dangerouslySetInnerHTML={{ __html: post.contentAr }} />
          </div>
        )}

        {/* TAGS */}
        {post.tags && post.tags.length > 0 && (
          <div className="pt-6 border-t-2 border-[#171717]/15 dark:border-[#D9AC45]/25 flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold text-[#171717] dark:text-[#D9AC45] uppercase flex items-center gap-1 mr-2">
              <Tag className="w-3.5 h-3.5" /> Tag:
            </span>
            {post.tags.map(t => (
              <span
                key={t}
                className="px-3 py-1 rounded bg-[#F8F3E8] dark:bg-[#06251D] border border-[#171717] dark:border-[#D9AC45]/60 text-[#171717] dark:text-[#F8F3E8] text-xs font-bold"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* AUTHOR BIO CARD */}
        <div className="p-5 sm:p-6 bg-[#F8F3E8] dark:bg-[#06251D] rounded-md border-2 border-[#171717] dark:border-[#D9AC45]/60 flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="w-14 h-14 rounded-md bg-[#06251D] dark:bg-[#0B3026] text-[#D9AC45] font-bold text-xl flex items-center justify-center shrink-0 border-2 border-[#171717] dark:border-[#D9AC45] overflow-hidden">
            {post.authorPhoto ? (
              <img src={post.authorPhoto} alt={post.authorName} className="w-full h-full object-cover" />
            ) : (
              <span>{post.authorName.charAt(0)}</span>
            )}
          </div>
          <div className="text-center sm:text-left space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h4 className="font-bold font-serif text-[#171717] dark:text-[#F8F3E8] text-base">
                {post.authorName}
              </h4>
              <span className="px-2.5 py-0.5 rounded bg-[#D9AC45] text-[#171717] border border-[#171717] text-[10px] font-extrabold uppercase">
                {post.authorRole || 'Pengasuh & Pengajar'}
              </span>
            </div>
            <p className="text-xs text-[#171717]/80 dark:text-[#F8F3E8]/80 leading-relaxed">
              Membagikan ilmu syar'i, faedah kajian, tazkiyatun nufs, serta catatan keilmuan Islam untuk membina santri dan pembaca setia Dars with Osama.
            </p>
          </div>
        </div>

        {/* BOTTOM SHARE & COPY BAR */}
        <div className="pt-4 border-t-2 border-[#171717]/15 dark:border-[#D9AC45]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#171717] dark:text-[#D9AC45]">
              Bagikan atau Simpan Artikel:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleShare}
              className="nb-btn nb-btn-gold px-4 py-2.5 text-xs"
              title="Bagikan artikel via WhatsApp, Telegram, Facebook, X, atau Instagram"
            >
              <Share2 className="w-4 h-4" />
              <span>Bagikan Artikel</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="nb-btn nb-btn-secondary px-4 py-2.5 text-xs"
              title="Salin tautan permanen artikel ke clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-[#06251D] dark:text-[#D9AC45]" /> : <Copy className="w-4 h-4 text-[#D9AC45]" />}
              <span>{copied ? 'Tautan Disalin!' : 'Salin Link'}</span>
            </button>
          </div>
        </div>
      </article>

      {/* ARTICLE READER COMMENTS & MODERATION SECTION */}
      <ArticleCommentsSection articleId={post.id} articleTitle={post.title} />

      {/* RELATED ARTICLES SECTION */}
      {relatedArticles.length > 0 && (
        <div className="space-y-4 pt-4">
          <h3 className="text-lg font-bold font-serif text-[#171717] dark:text-[#F8F3E8] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#06251D] dark:text-[#D9AC45]" />
            <span>Artikel Terkait Lainnya</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedArticles.map(rel => (
              <div
                key={rel.id}
                onClick={() => onSelectArticle(rel)}
                className="nb-card-interactive p-4 space-y-2 cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#06251D] text-[#D9AC45] border border-[#171717]">
                    {rel.category}
                  </span>
                  <h4 className="font-bold font-serif text-[#171717] dark:text-[#F8F3E8] text-xs sm:text-sm line-clamp-2 group-hover:text-[#06251D] dark:group-hover:text-[#D9AC45] transition">
                    {rel.title}
                  </h4>
                  <p className="text-[11px] text-[#171717]/75 dark:text-[#F8F3E8]/75 line-clamp-2">
                    {rel.excerpt}
                  </p>
                </div>
                <div className="pt-2 border-t border-[#171717]/15 dark:border-[#D9AC45]/25 text-[11px] font-bold text-[#171717]/70 dark:text-[#F8F3E8]/70 flex items-center justify-between">
                  <span>{rel.readingTimeMinutes} min baca</span>
                  <span className="text-[#06251D] dark:text-[#D9AC45] font-extrabold group-hover:translate-x-1 transition">Baca →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ARTICLE SHARE MODAL */}
      <ArticleShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        post={post}
      />
    </div>
  );
};
