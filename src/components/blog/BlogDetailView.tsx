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
  BookOpen,
  User,
  ChevronRight,
  Bookmark,
  Sparkles,
  FileText,
  Download
} from 'lucide-react';
import { BlogPost } from '../../types';
import { incrementBlogPostViews } from '../../firebase/services';
import { autoWrapArabicText } from '../../utils/arabicFontHelper';
import { PDFExportModal } from '../common/PDFExportModal';

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
  const [copied, setCopied] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  useEffect(() => {
    // Increment view count in Firestore when article opens
    if (post && post.id) {
      incrementBlogPostViews(post.id);
    }
  }, [post.id]);

  // Find related articles (same category or shared tags, excluding current post)
  const relatedArticles = allPosts
    .filter(p => p.id !== post.id && (p.category === post.category || p.tags.some(t => post.tags.includes(t))))
    .slice(0, 3);

  const articleUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: articleUrl
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(articleUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-fade-in font-sans">
      {/* BREADCRUMB & BACK BUTTON */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-stone-800 transition cursor-pointer active:scale-95 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Kembali ke Daftar Artikel</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-500 font-medium">
            <span>Blog</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{post.category}</span>
          </div>

          <button
            onClick={() => setPdfModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold transition cursor-pointer active:scale-95 shadow-xs"
            title="Unduh naskah artikel lengkap format PDF A4"
          >
            <FileText className="w-4 h-4 text-amber-300" />
            <span>Unduh PDF</span>
          </button>
        </div>
      </div>

      {/* ARTICLE HEADER BLOCK */}
      <article className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 sm:p-10 space-y-8 shadow-sm">
        <div data-aos="fade-up" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-300 dark:border-emerald-800">
              {post.category}
            </span>

            <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                {new Date(post.publishedAt || post.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                {post.readingTimeMinutes} Menit Baca
              </span>
              {post.viewsCount !== undefined && post.viewsCount > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-stone-400" />
                    {post.viewsCount} Dibaca
                  </span>
                </>
              )}
            </div>
          </div>

          <h1
            className="text-2xl sm:text-4xl font-bold text-stone-900 dark:text-white leading-tight font-sans tracking-tight"
            dangerouslySetInnerHTML={{ __html: autoWrapArabicText(post.title) }}
          />

          {post.titleAr && (
            <p className="font-amiri text-2xl sm:text-3xl text-emerald-700 dark:text-emerald-400 font-bold leading-relaxed" dir="rtl">
              {post.titleAr}
            </p>
          )}

          <p
            className="text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed italic border-l-4 border-emerald-500 pl-4 py-1 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-r-xl"
            dangerouslySetInnerHTML={{ __html: autoWrapArabicText(post.excerpt) }}
          />
        </div>

        {/* COVER IMAGE */}
        {post.coverImageUrl && (
          <figure data-aos="fade-up" className="space-y-2">
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-800 shadow-xs">
              <img
                src={post.coverImageUrl}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
            {post.coverImageCaption && (
              <figcaption className="text-center text-xs text-stone-500 dark:text-stone-400 italic">
                {post.coverImageCaption}
              </figcaption>
            )}
          </figure>
        )}

        {/* MAIN BODY HTML CONTENT */}
        <div
          data-aos="fade-up"
          className="prose dark:prose-invert max-w-none text-stone-800 dark:text-stone-200 text-sm sm:text-base leading-relaxed space-y-4 font-sans blog-content"
          dangerouslySetInnerHTML={{ __html: autoWrapArabicText(post.content) }}
        />

        {/* ARABIC CONTENT SECTION (IF PRESENT) */}
        {post.contentAr && (
          <div
            data-aos="fade-up"
            className="p-6 bg-stone-50 dark:bg-stone-900/80 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl space-y-3 font-amiri text-right text-lg text-emerald-900 dark:text-emerald-300"
            dir="rtl"
          >
            <div dangerouslySetInnerHTML={{ __html: post.contentAr }} />
          </div>
        )}

        {/* TAGS */}
        {post.tags && post.tags.length > 0 && (
          <div className="pt-6 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase flex items-center gap-1 mr-2">
              <Tag className="w-3.5 h-3.5" /> Tag:
            </span>
            {post.tags.map(t => (
              <span key={t} className="px-3 py-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-medium">
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* AUTHOR BIO CARD */}
        <div
          data-aos="fade-up"
          className="p-6 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center sm:items-start gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white font-bold text-xl flex items-center justify-center shrink-0 border border-emerald-500/30 overflow-hidden shadow-sm">
            {post.authorPhoto ? (
              <img src={post.authorPhoto} alt={post.authorName} className="w-full h-full object-cover" />
            ) : (
              <span>{post.authorName.charAt(0)}</span>
            )}
          </div>
          <div className="text-center sm:text-left space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h4 className="font-bold text-stone-900 dark:text-white text-base">
                {post.authorName}
              </h4>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                {post.authorRole || 'Pengasuh & Pengajar'}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              Membagikan ilmu syar'i, faedah kajian, tazkiyatun nufs, serta catatan keilmuan Islam untuk membina santri dan pembaca setia Dars with Osama.
            </p>
          </div>
        </div>

        {/* SHARE BAR */}
        <div
          data-aos="fade-up"
          className="pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-600 dark:text-stone-300">Bagikan atau Simpan Artikel:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bagikan Artikel */}
            <button
              onClick={handleShare}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
              title="Bagikan artikel via aplikasi atau media sosial"
            >
              <Share2 className="w-4 h-4" />
              <span>Bagikan Artikel</span>
            </button>

            {/* Unduh PDF */}
            <button
              onClick={() => setPdfModalOpen(true)}
              className="px-4 py-2 bg-sky-700 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
              title="Unduh naskah lengkap artikel ilmiah dalam format PDF A4"
            >
              <FileText className="w-4 h-4 text-amber-300" />
              <span>Unduh PDF</span>
            </button>

            {/* Salin Tautan */}
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tautan Disalin!' : 'Salin Tautan'}</span>
            </button>
          </div>
        </div>
      </article>

      {/* RELATED ARTICLES SECTION */}
      {relatedArticles.length > 0 && (
        <div className="space-y-4 pt-4">
          <h3 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Artikel Terkait Lainnya</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedArticles.map(rel => (
              <div
                key={rel.id}
                onClick={() => onSelectArticle(rel)}
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 space-y-2 hover:border-emerald-500/50 transition cursor-pointer group shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                    {rel.category}
                  </span>
                  <h4 className="font-bold text-stone-900 dark:text-white text-xs sm:text-sm line-clamp-2 group-hover:text-emerald-600 transition">
                    {rel.title}
                  </h4>
                  <p className="text-[11px] text-stone-500 line-clamp-2">
                    {rel.excerpt}
                  </p>
                </div>
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 text-[10px] text-stone-400 flex items-center justify-between">
                  <span>{rel.readingTimeMinutes} min baca</span>
                  <span className="text-emerald-600 font-semibold group-hover:translate-x-1 transition">Baca →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PDF EXPORT MODAL */}
      <PDFExportModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        type="article"
        articleData={post}
      />

    </div>
  );
};
