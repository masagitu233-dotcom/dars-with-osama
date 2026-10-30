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
import { ReadingFontControls, useReadingFontSize } from '../common/ReadingFontControls';
import { ResilientGoogleDriveImage } from '../common/ResilientGoogleDriveImage';
import {
  normalizeArticleHtmlImages,
  getGoogleDriveImageCandidates,
  getGoogleDriveViewerUrl,
  extractGoogleDriveFileId,
  isGoogleDriveUrl
} from '../../utils/googleDriveHelper';
import { useAuth } from '../../context/AuthContext';

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
  const fontControl = useReadingFontSize();

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

  const { userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'admin';
  const contentBodyRef = React.useRef<HTMLDivElement>(null);

  // Resilient handling for inline images in article content:
  // Auto-fallbacks across Google Drive endpoints and displays an actionable card if all fail
  useEffect(() => {
    if (!contentBodyRef.current) return;
    const container = contentBodyRef.current;
    const images = Array.from(container.querySelectorAll('img'));

    const cleanups: Array<() => void> = [];

    images.forEach((img) => {
      const src = img.getAttribute('src') || '';
      const driveId = img.getAttribute('data-drive-id') || extractGoogleDriveFileId(src);
      const isDrive = isGoogleDriveUrl(src) || Boolean(driveId);

      if (!isDrive && !src) return;

      const candidates = isDrive ? getGoogleDriveImageCandidates(src) : [src];
      let currentIndex = 0;

      const handleError = () => {
        currentIndex++;
        if (currentIndex < candidates.length) {
          img.src = candidates[currentIndex];
        } else {
          // All candidate endpoints failed. Replace or append diagnostic guidance.
          img.style.display = 'none';

          const existingNotice = img.parentElement?.querySelector('.inline-drive-fallback-notice');
          if (!existingNotice) {
            const fallbackDiv = document.createElement('div');
            fallbackDiv.className = 'inline-drive-fallback-notice my-4 p-4 rounded-md bg-[#FAF7F0] dark:bg-[#1A283C] border-2 border-dashed border-[#D6AD52] text-xs text-[#171717] dark:text-[#F8F3E8] space-y-2 select-none shadow-xs';

            const viewerUrl = driveId ? getGoogleDriveViewerUrl(driveId) : src;
            const headingText = isDrive
              ? 'Gambar Google Drive Tidak Dapat Dimuat'
              : 'Gambar Sisipan Tidak Dapat Dimuat';
            const reasonText = isDrive
              ? (isAdmin
                  ? 'Akses berkas di Google Drive masih dibatasi (Restricted). Silakan buka Google Drive > Bagikan > Ubah ke "Siapa saja yang memiliki link" (Anyone with the link).'
                  : 'Akses berkas dibatasi oleh pemilik di Google Drive.')
              : 'Tautan gambar tidak dapat diakses atau berkas tidak tersedia.';

            fallbackDiv.innerHTML = `
              <div class="flex items-center gap-2 font-extrabold text-[#123D32] dark:text-[#D6AD52]">
                <span>⚠️ ${headingText}</span>
              </div>
              <p class="text-[11px] text-[#525855] dark:text-[#A6D6C9] leading-relaxed">
                ${reasonText}
              </p>
              ${
                viewerUrl
                  ? `<div class="pt-1"><a href="${viewerUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#123D32] hover:bg-[#1C4D40] text-[#D6AD52] border border-[#171717] dark:border-[#D6AD52] text-xs font-bold transition">Buka Berkas di Google Drive ↗</a></div>`
                  : ''
              }
            `;

            if (img.parentElement) {
              img.parentElement.appendChild(fallbackDiv);
            }
          }
        }
      };

      img.addEventListener('error', handleError);
      cleanups.push(() => img.removeEventListener('error', handleError));
    });

    return () => {
      cleanups.forEach(fn => fn());
    };
  }, [post.content, isAdmin]);

  return (
    <div className="max-w-4xl mx-auto px-2.5 sm:px-6 lg:px-8 space-y-5 sm:space-y-8 py-4 sm:py-6 pb-16 animate-fade-in font-sans">
      {/* BREADCRUMB & TOP ACTIONS */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="nb-btn nb-btn-secondary px-3.5 py-2 text-xs"
        >
          <ArrowLeft className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1]" />
          <span>Kembali ke Daftar Artikel</span>
        </button>

        <div className="flex items-center gap-2.5">
          {/* Salin Link Button */}
          <button
            onClick={handleCopyLink}
            className="nb-btn nb-btn-secondary px-3.5 py-2 text-xs"
            title="Salin tautan permanen artikel ini"
          >
            {copied ? <Check className="w-4 h-4 text-[#123D32] dark:text-[#CEFEF1]" /> : <Copy className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1]" />}
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
        <div className="p-3.5 rounded-md bg-[#123D32] dark:bg-[#1F5F63] border-2 border-[#171717] dark:border-[#4CA7A1] text-[#FAF7F0] dark:text-[#CEFEF1] text-xs flex items-center justify-between shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#001722] animate-fade-in">
          <div className="flex items-center gap-2.5">
            <Check className="w-4 h-4 text-[#CEFEF1] shrink-0" />
            <div>
              <strong>Link artikel berhasil disalin!</strong> Tautan permanen siap dibagikan ke WhatsApp, Telegram, atau media sosial.
            </div>
          </div>
          <span className="text-[10px] font-mono bg-[#001722] px-2 py-0.5 rounded border border-[#4CA7A1] text-[#CEFEF1] hidden sm:inline-block">
            {articleUrl}
          </span>
        </div>
      )}

      {/* EDITORIAL ARTICLE READING CARD */}
      <article
        style={fontControl.style}
        className="nb-reading-surface p-4 sm:p-8 md:p-12 space-y-5 sm:space-y-8"
      >
        {/* Editorial Header */}
        <div className="space-y-4 border-b-2 border-[#171717] dark:border-[#4CA7A1] pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 bg-[#4CA7A1] text-[#001722] font-extrabold text-xs uppercase tracking-wider rounded border-2 border-[#171717] dark:border-[#001722]">
                {post.category}
              </span>

              <div className="flex flex-wrap items-center gap-3 text-xs text-[#525855] dark:text-[#A6D6C9] font-bold">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#123D32] dark:text-[#A6D6C9]" />
                  {new Date(post.publishedAt || post.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#123D32] dark:text-[#A6D6C9]" />
                  {post.readingTimeMinutes} Menit Baca
                </span>
                {post.viewsCount !== undefined && post.viewsCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-[#123D32] dark:text-[#4CA7A1]" />
                      {post.viewsCount} Dibaca
                    </span>
                  </>
                )}
              </div>
            </div>

            <ReadingFontControls
              step={fontControl.step}
              percentage={fontControl.percentage}
              canDecrease={fontControl.canDecrease}
              canIncrease={fontControl.canIncrease}
              isDefault={fontControl.isDefault}
              onDecrease={fontControl.decrease}
              onIncrease={fontControl.increase}
              onReset={fontControl.reset}
            />
          </div>

          <h1
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#171717] dark:text-[#CEFEF1] leading-tight font-serif tracking-tight"
            dangerouslySetInnerHTML={{ __html: autoWrapArabicText(post.title) }}
          />

          {post.titleAr && (
            <p className="font-amiri text-xl sm:text-2xl text-[#123D32] dark:text-[#CEFEF1] font-bold leading-[2.0]" dir="rtl">
              {post.titleAr}
            </p>
          )}

          <p
            className="reading-scalable-excerpt text-[#171717] dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] border-l-4 border-l-[#123D32] dark:border-l-[#4CA7A1] pl-3 sm:pl-4 py-2.5 pr-3 bg-[#FAF7F0] dark:bg-[#0D2B36] rounded-md font-medium"
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
            <div className="aspect-video w-full rounded-md overflow-hidden bg-[#123D32] dark:bg-[#0D2B36] border-2 border-[#171717] dark:border-[#4CA7A1]">
              <ResilientGoogleDriveImage
                src={post.coverImageUrl}
                alt={post.title}
                aspectRatioClass="aspect-video"
                imageClassName="w-full h-full object-cover"
                isAdmin={isAdmin}
                showAdminDiagnostic={isAdmin}
              />
            </div>
            {post.coverImageCaption && (
              <figcaption className="text-center text-xs text-[#525855] dark:text-[#A6D6C9] italic">
                {post.coverImageCaption}
              </figcaption>
            )}
          </figure>
        )}

        {/* MAIN BODY HTML CONTENT — Calm reading zone */}
        <div
          ref={contentBodyRef}
          data-testid="article-body-content"
          className="prose dark:prose-invert max-w-none sm:max-w-[68ch] mx-auto text-[#171717] dark:text-[#CEFEF1] leading-relaxed space-y-3.5 sm:space-y-4 font-sans blog-content"
          dangerouslySetInnerHTML={{
            __html: autoWrapArabicText(
              normalizeArticleHtmlImages(sanitizeRichTextHtml(post.content))
            )
          }}
        />

        {/* ARABIC CONTENT SECTION (IF PRESENT) */}
        {post.contentAr && (
          <div
            className="p-4 sm:p-6 bg-[#FAF7F0] dark:bg-[#0D2B36] border-2 border-[#171717] dark:border-[#4CA7A1] rounded-md space-y-3 font-amiri text-right reading-scalable-arabic text-[#171717] dark:text-[#CEFEF1]"
            dir="rtl"
          >
            <div dangerouslySetInnerHTML={{ __html: post.contentAr }} />
          </div>
        )}

        {/* TAGS */}
        {post.tags && post.tags.length > 0 && (
          <div className="pt-6 border-t-2 border-[#171717] dark:border-[#4CA7A1] flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold text-[#171717] dark:text-[#CEFEF1] uppercase flex items-center gap-1 mr-2">
              <Tag className="w-3.5 h-3.5 text-[#4CA7A1]" /> Tag:
            </span>
            {post.tags.map(t => (
              <span
                key={t}
                className="px-3 py-1 rounded bg-[#FAF7F0] dark:bg-[#0D2B36] border-2 border-[#171717] dark:border-[#4CA7A1] text-[#171717] dark:text-[#CEFEF1] text-xs font-bold"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* AUTHOR BIO CARD */}
        <div className="p-5 sm:p-6 bg-[#FAF7F0] dark:bg-[#0D2B36] rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="w-14 h-14 rounded-md bg-[#001722] text-[#CEFEF1] font-bold text-xl flex items-center justify-center shrink-0 border-2 border-[#171717] dark:border-[#4CA7A1] overflow-hidden">
            {post.authorPhoto ? (
              <img src={post.authorPhoto} alt={post.authorName} className="w-full h-full object-cover" />
            ) : (
              <span>{post.authorName.charAt(0)}</span>
            )}
          </div>
          <div className="text-center sm:text-left space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h4 className="font-bold font-serif text-[#171717] dark:text-[#CEFEF1] text-base">
                {post.authorName}
              </h4>
              <span className="px-2.5 py-0.5 rounded bg-[#4CA7A1] text-[#001722] border border-[#171717] dark:border-[#001722] text-[10px] font-extrabold uppercase">
                {post.authorRole || 'Pengasuh & Pengajar'}
              </span>
            </div>
            <p className="text-xs text-[#525855] dark:text-[#A6D6C9] leading-relaxed">
              Membagikan ilmu syar'i, faedah kajian, tazkiyatun nufs, serta catatan keilmuan Islam untuk membina santri dan pembaca setia Dars with Osama.
            </p>
          </div>
        </div>

        {/* BOTTOM SHARE & COPY BAR */}
        <div className="pt-4 border-t-2 border-[#171717] dark:border-[#4CA7A1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#171717] dark:text-[#CEFEF1]">
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
              {copied ? <Check className="w-4 h-4 text-[#123D32] dark:text-[#CEFEF1]" /> : <Copy className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1]" />}
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
          <h3 className="text-lg font-bold font-serif text-[#171717] dark:text-[#CEFEF1] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#123D32] dark:text-[#4CA7A1]" />
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
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#4CA7A1] text-[#001722] border border-[#171717] dark:border-[#001722]">
                    {rel.category}
                  </span>
                  <h4 className="font-bold font-serif text-[#171717] dark:text-[#CEFEF1] text-xs sm:text-sm line-clamp-2 group-hover:text-[#123D32] dark:group-hover:text-white transition">
                    {rel.title}
                  </h4>
                  <p className="text-[11px] text-[#525855] dark:text-[#A6D6C9] line-clamp-2">
                    {rel.excerpt}
                  </p>
                </div>
                <div className="pt-2 border-t border-[#171717] dark:border-[#4CA7A1] text-[11px] font-bold text-[#525855] dark:text-[#A6D6C9] flex items-center justify-between">
                  <span>{rel.readingTimeMinutes} min baca</span>
                  <span className="text-[#123D32] dark:text-[#4CA7A1] font-extrabold group-hover:translate-x-1 transition">Baca Artikel →</span>
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
