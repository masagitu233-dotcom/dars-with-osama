import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Clock,
  Calendar,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { BlogPost } from '../../types';
import { autoWrapArabicText } from '../../utils/arabicFontHelper';
import { ServiceDisruptionBanner } from '../common/ServiceDisruptionBanner';

interface BlogListViewProps {
  posts: BlogPost[];
  loading?: boolean;
  onSelectArticle: (post: BlogPost) => void;
  loadError?: { category: string; summary: string; code: string } | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  lastAttemptTimestamp?: number;
}

export const BlogListView: React.FC<BlogListViewProps> = ({
  posts,
  loading = false,
  onSelectArticle,
  loadError = null,
  onRetry,
  isRetrying = false,
  lastAttemptTimestamp = 0
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract unique categories from posts
  const categories = Array.from(
    new Set(posts.map(p => p.category).filter(Boolean))
  );

  // Filter posts
  const filteredPosts = posts.filter(post => {
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesSearch = !searchLower || (
      post.title.toLowerCase().includes(searchLower) ||
      (post.titleAr && post.titleAr.includes(searchLower)) ||
      post.excerpt.toLowerCase().includes(searchLower) ||
      post.tags.some(t => t.toLowerCase().includes(searchLower))
    );
    return matchesCategory && matchesSearch;
  });

  // Featured post (first featured post or first published post)
  const featuredPost = posts.find(p => p.isFeatured) || posts[0];
  const regularPosts = filteredPosts.filter(p => p.id !== featuredPost?.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 sm:space-y-10 pb-16 animate-fade-in font-sans">
      {/* HERO BANNER SECTION */}
      <div className="relative overflow-hidden rounded-lg bg-[#06251D] text-[#F8F3E8] p-6 sm:p-10 border-2 border-[#171717] dark:border-[#D9AC45] shadow-[6px_6px_0px_#171717] dark:shadow-[6px_6px_0px_#000000]">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#D9AC45] border-2 border-[#171717] text-[#171717] text-xs font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#171717]" />
            <span>Blog & Catatan Ilmu</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold font-serif tracking-tight text-white leading-tight">
            Naskah, Faedah Kajian, & Artikel Dars with Osama
          </h1>
          <p className="text-[#F8F3E8]/85 text-xs sm:text-sm leading-relaxed">
            Temukan artikel ilmiah, rangkuman tazkiyatun nufs, panduan tadabbur Al-Qur'an, serta catatan keilmuan Islam untuk membina pembaca setia.
          </p>

          {/* SEARCH BAR */}
          <div className="pt-2">
            <div className="relative flex items-center max-w-lg bg-[#F8F3E8] border-2 border-[#171717] rounded-md shadow-[4px_4px_0px_#000000]">
              <Search className="w-4 h-4 absolute left-3.5 text-[#06251D]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari artikel, topik, atau kata kunci..."
                className="w-full pl-10 pr-4 py-3 bg-transparent text-xs sm:text-sm font-semibold text-[#171717] placeholder:text-[#171717]/60 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORY FILTER BUTTONS */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-md text-xs font-extrabold whitespace-nowrap border-2 transition cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-[#06251D] text-[#D9AC45] border-[#171717] dark:bg-[#D9AC45] dark:text-[#171717] shadow-[3px_3px_0px_#171717]'
              : 'bg-white dark:bg-[#0B3026] text-[#171717] dark:text-[#F8F3E8] border-[#171717] dark:border-[#D9AC45]/60 hover:bg-[#D9AC45]/20'
          }`}
        >
          Semua Artikel ({posts.length})
        </button>

        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-md text-xs font-extrabold whitespace-nowrap border-2 transition cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[#06251D] text-[#D9AC45] border-[#171717] dark:bg-[#D9AC45] dark:text-[#171717] shadow-[3px_3px_0px_#171717]'
                : 'bg-white dark:bg-[#0B3026] text-[#171717] dark:text-[#F8F3E8] border-[#171717] dark:border-[#D9AC45]/60 hover:bg-[#D9AC45]/20'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* FEATURED ARTICLE (IF AVAILABLE) */}
      {featuredPost && selectedCategory === 'all' && !searchQuery && (
        <div className="space-y-3">
          <h2 className="text-xs font-extrabold text-[#06251D] dark:text-[#D9AC45] uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D9AC45]" />
            <span>Artikel Unggulan Utama</span>
          </h2>

          <div
            onClick={() => onSelectArticle(featuredPost)}
            className="nb-card-interactive overflow-hidden group cursor-pointer grid grid-cols-1 lg:grid-cols-12"
          >
            <div className="lg:col-span-7 aspect-video lg:aspect-auto relative overflow-hidden bg-[#06251D] border-b-2 lg:border-b-0 lg:border-r-2 border-[#171717] dark:border-[#D9AC45]/60">
              <img
                src={featuredPost.coverImageUrl || 'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=1200&auto=format&fit=crop'}
                alt={featuredPost.title}
                className="w-full h-full object-cover group-hover:scale-103 transition duration-300"
              />
              <span className="absolute top-4 left-4 px-3 py-1 bg-[#D9AC45] text-[#171717] font-extrabold text-xs uppercase tracking-wider rounded border-2 border-[#171717] shadow-[3px_3px_0px_#171717] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Artikel Unggulan
              </span>
            </div>

            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs text-[#171717]/75 dark:text-[#F8F3E8]/80 font-bold">
                  <span className="px-2.5 py-0.5 rounded bg-[#06251D] text-[#D9AC45] border border-[#171717] dark:border-[#D9AC45] font-extrabold text-[10px] uppercase">
                    {featuredPost.category}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#3478F6]" />
                    {featuredPost.readingTimeMinutes} min baca
                  </span>
                </div>

                <h3
                  className="text-xl sm:text-2xl font-bold font-serif text-[#171717] dark:text-[#F8F3E8] leading-snug group-hover:text-[#06251D] dark:group-hover:text-[#D9AC45] transition"
                  dangerouslySetInnerHTML={{ __html: autoWrapArabicText(featuredPost.title) }}
                />

                {featuredPost.titleAr && (
                  <p className="font-amiri text-lg text-[#06251D] dark:text-[#D9AC45] font-bold" dir="rtl">
                    {featuredPost.titleAr}
                  </p>
                )}

                <p
                  className="text-xs sm:text-sm text-[#171717]/80 dark:text-[#F8F3E8]/80 line-clamp-3 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: autoWrapArabicText(featuredPost.excerpt) }}
                />
              </div>

              <div className="pt-4 border-t-2 border-[#171717]/15 dark:border-[#D9AC45]/25 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-md bg-[#06251D] text-[#D9AC45] font-bold text-xs flex items-center justify-center border-2 border-[#171717] dark:border-[#D9AC45] overflow-hidden">
                    {featuredPost.authorPhoto ? (
                      <img src={featuredPost.authorPhoto} alt={featuredPost.authorName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{featuredPost.authorName.charAt(0)}</span>
                    )}
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-[#171717] dark:text-[#F8F3E8]">{featuredPost.authorName}</p>
                    <p className="text-[11px] text-[#171717]/65 dark:text-[#F8F3E8]/65">
                      {new Date(featuredPost.publishedAt || featuredPost.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-extrabold text-[#06251D] dark:text-[#D9AC45] flex items-center gap-1 group-hover:translate-x-1 transition">
                  Baca Artikel <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SERVICE DISRUPTION BANNER WHEN DATA IS RETAINED IN MEMORY */}
      {loadError && posts.length > 0 && (
        <ServiceDisruptionBanner
          category={loadError.category}
          code={loadError.code}
          onRetry={onRetry}
          isRetrying={isRetrying}
          lastAttemptTimestamp={lastAttemptTimestamp}
          mode="banner"
          hasExistingData={true}
        />
      )}

      {/* REGULAR ARTICLES GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-[#171717] dark:border-[#D9AC45]/50 pb-2">
          <h2 className="text-lg font-bold font-serif text-[#171717] dark:text-[#F8F3E8]">
            Daftar Artikel Terbaru ({filteredPosts.length})
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="nb-card p-4 animate-pulse space-y-3">
                <div className="aspect-video bg-[#171717]/10 dark:bg-[#06251D] rounded-md" />
                <div className="h-4 bg-[#171717]/10 dark:bg-[#06251D] rounded w-3/4" />
                <div className="h-3 bg-[#171717]/10 dark:bg-[#06251D] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          loadError && posts.length === 0 ? (
            <ServiceDisruptionBanner
              category={loadError.category}
              code={loadError.code}
              onRetry={onRetry}
              isRetrying={isRetrying}
              lastAttemptTimestamp={lastAttemptTimestamp}
              mode="full"
              hasExistingData={false}
            />
          ) : (
            <div className="p-12 text-center nb-card space-y-3">
              <BookOpen className="w-12 h-12 text-[#06251D] dark:text-[#D9AC45] mx-auto" />
              <p className="text-sm font-bold text-[#171717] dark:text-[#F8F3E8]">
                Tidak ada artikel yang ditemukan.
              </p>
              <p className="text-xs text-[#171717]/70 dark:text-[#F8F3E8]/70">
                Coba gunakan kata kunci pencarian lain atau pilih kategori artikel yang tersedia.
              </p>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(selectedCategory === 'all' && !searchQuery ? regularPosts : filteredPosts).map((post) => (
              <div
                key={post.id}
                onClick={() => onSelectArticle(post)}
                className="nb-card-interactive overflow-hidden flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  {/* Image cover */}
                  <div className="aspect-video w-full bg-[#06251D] overflow-hidden relative border-b-2 border-[#171717] dark:border-[#D9AC45]/60">
                    <img
                      src={post.coverImageUrl || 'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=1200&auto=format&fit=crop'}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-103 transition duration-300"
                    />
                    <span className="absolute top-2.5 left-2.5 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded bg-[#D9AC45] text-[#171717] border-2 border-[#171717] shadow-[2px_2px_0px_#171717]">
                      {post.category}
                    </span>
                  </div>

                  {/* Title & Metadata */}
                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center gap-2 text-[11px] text-[#171717]/75 dark:text-[#F8F3E8]/75 font-bold">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#06251D] dark:text-[#D9AC45]" />
                        {new Date(post.publishedAt || post.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#3478F6]" />
                        {post.readingTimeMinutes} min
                      </span>
                    </div>

                    <h3
                      className="font-serif font-bold text-[#171717] dark:text-[#F8F3E8] text-base sm:text-lg leading-snug group-hover:text-[#06251D] dark:group-hover:text-[#D9AC45] transition line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: autoWrapArabicText(post.title) }}
                    />

                    {post.titleAr && (
                      <p className="font-amiri text-base text-[#06251D] dark:text-[#D9AC45] font-bold truncate" dir="rtl">
                        {post.titleAr}
                      </p>
                    )}

                    <p
                      className="text-xs text-[#171717]/80 dark:text-[#F8F3E8]/80 line-clamp-2 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: autoWrapArabicText(post.excerpt) }}
                    />
                  </div>
                </div>

                {/* Footer info */}
                <div className="px-5 py-3.5 border-t-2 border-[#171717]/15 dark:border-[#D9AC45]/25 bg-[#F8F3E8]/60 dark:bg-[#06251D]/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-[#06251D] text-[#D9AC45] border border-[#171717] dark:border-[#D9AC45] font-bold text-[10px] flex items-center justify-center shrink-0">
                      {post.authorName.charAt(0)}
                    </div>
                    <span className="font-bold text-[#171717] dark:text-[#F8F3E8] text-xs">
                      {post.authorName}
                    </span>
                  </div>

                  <span className="text-[#06251D] dark:text-[#D9AC45] font-extrabold text-xs flex items-center gap-0.5 group-hover:translate-x-1 transition">
                    Baca <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
