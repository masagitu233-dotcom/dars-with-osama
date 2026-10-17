import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Clock,
  Eye,
  Calendar,
  ChevronRight,
  Sparkles,
  Tag,
  Filter,
  ArrowRight,
  User
} from 'lucide-react';
import { BlogPost } from '../../types';
import { autoWrapArabicText } from '../../utils/arabicFontHelper';

interface BlogListViewProps {
  posts: BlogPost[];
  loading?: boolean;
  onSelectArticle: (post: BlogPost) => void;
}

export const BlogListView: React.FC<BlogListViewProps> = ({
  posts,
  loading = false,
  onSelectArticle
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
    <div className="space-y-8 sm:space-y-12 pb-16 animate-fade-in font-sans">
      {/* HERO BANNER SECTION */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-stone-900 to-emerald-950 text-white p-6 sm:p-10 border border-emerald-800/40 shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Blog & Catatan Ilmu</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold font-sans tracking-tight text-white leading-tight">
            Naskah, Faedah Kajian, & Artikel Dars with Osama
          </h1>
          <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
            Temukan artikel ilmiah, rangkuman tazkiyatun nufs, panduan tadabbur Al-Qur'an, serta catatan keilmuan Islam untuk membina pembaca setia.
          </p>

          {/* SEARCH BAR */}
          <div className="pt-2">
            <div className="relative flex items-center max-w-lg">
              <Search className="w-4 h-4 absolute left-3.5 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari artikel, topik, atau kata kunci..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/10 dark:bg-stone-900/60 backdrop-blur-md border border-white/20 rounded-2xl text-xs sm:text-sm text-white placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORY FILTER PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer active:scale-95 ${
            selectedCategory === 'all'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-emerald-500/50'
          }`}
        >
          Semua Artikel ({posts.length})
        </button>

        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer active:scale-95 ${
              selectedCategory === cat
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-emerald-500/50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* FEATURED ARTICLE (IF AVAILABLE) */}
      {featuredPost && selectedCategory === 'all' && !searchQuery && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Artikel Unggulan Utama</span>
          </h2>

          <div
            onClick={() => onSelectArticle(featuredPost)}
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:border-emerald-500/40 transition duration-300 group cursor-pointer grid grid-cols-1 lg:grid-cols-12"
          >
            <div className="lg:col-span-7 aspect-video lg:aspect-auto relative overflow-hidden bg-stone-100 dark:bg-stone-800">
              <img
                src={featuredPost.coverImageUrl || 'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=1200&auto=format&fit=crop'}
                alt={featuredPost.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <span className="absolute top-4 left-4 px-3 py-1 bg-amber-500 text-stone-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Artikel Unggulan
              </span>
            </div>

            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 font-medium">
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                    {featuredPost.category}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    {featuredPost.readingTimeMinutes} min baca
                  </span>
                </div>

                <h3
                  className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition"
                  dangerouslySetInnerHTML={{ __html: autoWrapArabicText(featuredPost.title) }}
                />

                {featuredPost.titleAr && (
                  <p className="font-amiri text-lg text-emerald-700 dark:text-emerald-400 font-bold" dir="rtl">
                    {featuredPost.titleAr}
                  </p>
                )}

                <p
                  className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 line-clamp-3 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: autoWrapArabicText(featuredPost.excerpt) }}
                />
              </div>

              <div className="pt-4 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center border border-emerald-500/30 overflow-hidden">
                    {featuredPost.authorPhoto ? (
                      <img src={featuredPost.authorPhoto} alt={featuredPost.authorName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{featuredPost.authorName.charAt(0)}</span>
                    )}
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-stone-900 dark:text-white">{featuredPost.authorName}</p>
                    <p className="text-[10px] text-stone-400">
                      {new Date(featuredPost.publishedAt || featuredPost.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition">
                  Baca <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REGULAR ARTICLES GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-900 dark:text-white">
            Daftar Artikel Terbaru ({filteredPosts.length})
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-stone-900 rounded-3xl p-4 border border-stone-200 dark:border-stone-800 animate-pulse space-y-3">
                <div className="aspect-video bg-stone-200 dark:bg-stone-800 rounded-2xl" />
                <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded-md w-3/4" />
                <div className="h-3 bg-stone-200 dark:bg-stone-800 rounded-md w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl space-y-3">
            <BookOpen className="w-12 h-12 text-stone-300 mx-auto" />
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
              Tidak ada artikel yang ditemukan.
            </p>
            <p className="text-xs text-stone-500">
              Coba gunakan kata kunci pencarian lain atau pilih kategori artikel yang tersedia.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(selectedCategory === 'all' && !searchQuery ? regularPosts : filteredPosts).map(post => (
              <div
                key={post.id}
                onClick={() => onSelectArticle(post)}
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl overflow-hidden shadow-xs hover:shadow-lg hover:border-emerald-500/40 transition duration-300 flex flex-col justify-between group cursor-pointer"
              >
                <div className="p-4 sm:p-5 space-y-3">
                  {/* Image cover */}
                  <div className="aspect-video w-full rounded-2xl bg-stone-100 dark:bg-stone-800 overflow-hidden relative border border-stone-200 dark:border-stone-700">
                    <img
                      src={post.coverImageUrl || 'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=1200&auto=format&fit=crop'}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <span className="absolute top-2 left-2 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-stone-900/80 text-emerald-300 backdrop-blur-xs border border-emerald-500/30">
                      {post.category}
                    </span>
                  </div>

                  {/* Title & Metadata */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        {new Date(post.publishedAt || post.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-stone-400" />
                        {post.readingTimeMinutes} min
                      </span>
                    </div>

                    <h3
                      className="font-bold text-stone-900 dark:text-white text-base leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: autoWrapArabicText(post.title) }}
                    />

                    {post.titleAr && (
                      <p className="font-amiri text-sm text-emerald-600 dark:text-emerald-400 font-bold truncate" dir="rtl">
                        {post.titleAr}
                      </p>
                    )}

                    <p
                      className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: autoWrapArabicText(post.excerpt) }}
                    />
                  </div>
                </div>

                {/* Footer info */}
                <div className="p-4 border-t border-stone-100 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-900/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      {post.authorName.charAt(0)}
                    </div>
                    <span className="font-semibold text-stone-700 dark:text-stone-300 text-xs">
                      {post.authorName}
                    </span>
                  </div>

                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-0.5 group-hover:translate-x-1 transition">
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
