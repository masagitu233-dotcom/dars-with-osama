import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Clock,
  Calendar,
  ChevronRight,
  Sparkles,
  Share2,
  ArrowLeft,
  Layers
} from 'lucide-react';
import { BlogPost } from '../../types';
import { autoWrapArabicText } from '../../utils/arabicFontHelper';
import { ServiceDisruptionBanner } from '../common/ServiceDisruptionBanner';
import { ReadingFontControls, useReadingFontSize } from '../common/ReadingFontControls';
import { FeatureShareModal } from '../common/FeatureShareModal';
import { ARTIKEL_ILMIAH_SHARE_CONFIG } from '../../utils/featureShareHelper';
import { ResilientGoogleDriveImage } from '../common/ResilientGoogleDriveImage';
import { getInstructorProfile } from '../../firebase/services';
import { resolveDisplayImageUrl } from '../../utils/googleDriveHelper';
import { MobileCarousel } from '../common/MobileCarousel';
import { useAuth } from '../../context/AuthContext';
import {
  resolveLastReadArticle,
  groupArticlesByGenre,
  findArticlesByGenre
} from '../../utils/articleHistoryHelper';

interface BlogListViewProps {
  posts: BlogPost[];
  loading?: boolean;
  onSelectArticle: (post: BlogPost) => void;
  selectedGenre?: string | null;
  onSelectGenre?: (genre: string | null) => void;
  onBackToCatalog?: () => void;
  loadError?: { category: string; summary: string; code: string } | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  lastAttemptTimestamp?: number;
}

const DEFAULT_COVER_IMAGE =
  'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=1200&auto=format&fit=crop';

export const BlogListView: React.FC<BlogListViewProps> = ({
  posts,
  loading = false,
  onSelectArticle,
  selectedGenre: externalSelectedGenre,
  onSelectGenre: externalOnSelectGenre,
  onBackToCatalog: externalOnBackToCatalog,
  loadError = null,
  onRetry,
  isRetrying = false,
  lastAttemptTimestamp = 0
}) => {
  const { isAdmin } = useAuth();

  // Desktop filtering state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileSearchQuery, setMobileSearchQuery] = useState<string>('');
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const fontControl = useReadingFontSize();

  // Internal genre state fallback when not controlled externally
  const [internalSelectedGenre, setInternalSelectedGenre] = useState<string | null>(null);
  const activeGenre =
    externalSelectedGenre !== undefined ? externalSelectedGenre : internalSelectedGenre;

  const handleSelectGenre = (genre: string | null) => {
    if (externalOnSelectGenre) {
      externalOnSelectGenre(genre);
    } else {
      setInternalSelectedGenre(genre);
    }
  };

  const handleBackToCatalog = () => {
    if (externalOnBackToCatalog) {
      externalOnBackToCatalog();
    } else {
      setInternalSelectedGenre(null);
    }
  };

  const [instructorPhoto, setInstructorPhoto] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('dars_instructor_profile_v1');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.photoUrl) return parsed.photoUrl;
        }
      } catch {}
    }
    return '';
  });
  const [featuredPhotoError, setFeaturedPhotoError] = useState(false);

  React.useEffect(() => {
    let mounted = true;
    getInstructorProfile()
      .then((profile) => {
        if (mounted && profile?.photoUrl) {
          setInstructorPhoto(profile.photoUrl);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Desktop Categories
  const categories = useMemo(() => {
    return Array.from(new Set(posts.map((p) => p.category).filter(Boolean)));
  }, [posts]);

  // Desktop Filtered Posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
      const searchLower = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        post.title.toLowerCase().includes(searchLower) ||
        (post.titleAr && post.titleAr.includes(searchLower)) ||
        post.excerpt.toLowerCase().includes(searchLower) ||
        post.tags.some((t) => t.toLowerCase().includes(searchLower));
      return matchesCategory && matchesSearch;
    });
  }, [posts, selectedCategory, searchQuery]);

  // Desktop Featured post
  const featuredPost = useMemo(() => {
    return posts.find((p) => p.isFeatured) || posts[0];
  }, [posts]);

  const regularPosts = useMemo(() => {
    return filteredPosts.filter((p) => p.id !== featuredPost?.id);
  }, [filteredPosts, featuredPost]);

  // Mobile: Last Read Article (Actual user reading history from localStorage)
  const lastReadArticle = useMemo(() => {
    return resolveLastReadArticle(posts);
  }, [posts]);

  // Mobile: Grouped Genres
  const genreGroups = useMemo(() => {
    return groupArticlesByGenre(posts);
  }, [posts]);

  // Mobile: Detail Genre articles
  const currentGenreArticles = useMemo(() => {
    if (!activeGenre) return [];
    return findArticlesByGenre(posts, activeGenre);
  }, [posts, activeGenre]);

  // Mobile: Search Filtered Articles
  const mobileSearchResults = useMemo(() => {
    const q = mobileSearchQuery.toLowerCase().trim();
    if (!q) return [];
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.titleAr && p.titleAr.includes(q)) ||
        p.excerpt.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [posts, mobileSearchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 animate-fade-in font-sans">
      {/* =========================================================================
          MOBILE VIEW (md:hidden) — REDESAIN HALAMAN ARTIKEL KHUSUS MOBILE
          1. Artikel Terakhir Dibaca di alur normal (bukan sticky/fixed).
          2. Katalog Genre dalam frame terpisah (3 kolom, maksimal 3 card per baris).
          3. Tampilan Detail Genre (3 kolom, menampilkan seluruh artikel genre).
          4. Navigasi kembali yang responsif dan mempertahankan posisi scroll.
          5. Setiap card hanya menampilkan thumbnail dan judul (tanpa deskripsi/tanggal).
         ========================================================================= */}
      <div className="block md:hidden space-y-5 pb-16">
        {/* MOBILE TOP BAR / HEADER */}
        <div className="flex items-center justify-between gap-3 pb-2 border-b-2 border-[#171717] dark:border-[#4CA7A1]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-md bg-[#123D32] dark:bg-[#4CA7A1] text-white dark:text-[#001722] border border-[#171717] dark:border-[#001722] shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold font-serif text-[#171717] dark:text-[#CEFEF1] leading-tight truncate">
                Artikel & Catatan Ilmu
              </h1>
              <p className="text-[10px] text-[#525855] dark:text-[#A6D6C9] font-medium">
                Dars with Osama
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              data-testid="mobile-share-blog-page-btn"
              onClick={() => setShareModalOpen(true)}
              className="p-2 rounded-md border-2 border-[#171717] dark:border-[#001722] bg-[#D6AD52] text-[#171923] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] active:scale-95 transition cursor-pointer"
              title="Bagikan tautan Artikel"
              aria-label="Bagikan Halaman Artikel"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* MOBILE SEARCH BAR */}
        <div className="relative flex items-center bg-white dark:bg-[#001722] border-2 border-[#171717] dark:border-[#4CA7A1] rounded-lg shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]">
          <Search className="w-4 h-4 absolute left-3 text-[#123D32] dark:text-[#4CA7A1]" />
          <input
            type="text"
            value={mobileSearchQuery}
            onChange={(e) => setMobileSearchQuery(e.target.value)}
            placeholder="Cari artikel atau topik..."
            className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-[#171717] dark:text-[#CEFEF1] placeholder:text-[#525855] dark:placeholder:text-[#A6D6C9] focus:outline-none bg-transparent"
          />
          {mobileSearchQuery && (
            <button
              type="button"
              onClick={() => setMobileSearchQuery('')}
              className="pr-3 text-[11px] font-bold text-[#525855] dark:text-[#A6D6C9] hover:text-[#171717]"
            >
              Batal
            </button>
          )}
        </div>

        {/* SERVICE DISRUPTION BANNER WHEN DATA HAS ISSUES */}
        {isAdmin && loadError && posts.length > 0 && (
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

        {/* LOADING STATE */}
        {loading ? (
          <div className="space-y-4">
            <div className="rounded-xl border-2 border-[#171717]/20 p-3 bg-white/50 space-y-2 animate-pulse">
              <div className="h-3 bg-[#171717]/10 rounded w-1/3" />
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="aspect-[4/3] bg-[#171717]/10 rounded-md" />
                    <div className="h-2.5 bg-[#171717]/10 rounded w-full" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border-2 border-[#171717]/20 p-3 bg-white/50 space-y-2 animate-pulse">
              <div className="h-3 bg-[#171717]/10 rounded w-1/4" />
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="aspect-[4/3] bg-[#171717]/10 rounded-md" />
                    <div className="h-2.5 bg-[#171717]/10 rounded w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : mobileSearchQuery.trim() ? (
          /* =========================================================================
             MOBILE SEARCH RESULTS VIEW (3 Kolom)
             ========================================================================= */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-[#171717] dark:text-[#CEFEF1]">
              <span>Hasil Pencarian: "{mobileSearchQuery}"</span>
              <span className="text-[11px] text-[#525855] dark:text-[#A6D6C9]">
                {mobileSearchResults.length} artikel
              </span>
            </div>

            {mobileSearchResults.length === 0 ? (
              <div className="p-8 text-center rounded-xl border-2 border-dashed border-[#171717]/30 dark:border-[#4CA7A1]/30 bg-white/50 dark:bg-[#001722]/50 space-y-2">
                <BookOpen className="w-8 h-8 text-[#123D32] dark:text-[#4CA7A1] mx-auto opacity-70" />
                <p className="text-xs font-bold text-[#171717] dark:text-[#CEFEF1]">
                  Tidak ada artikel yang cocok.
                </p>
                <button
                  type="button"
                  onClick={() => setMobileSearchQuery('')}
                  className="px-3 py-1 rounded bg-[#123D32] text-white text-[11px] font-bold"
                >
                  Lihat Semua Genre
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {mobileSearchResults.map((article) => (
                  <div
                    key={article.id}
                    onClick={() => onSelectArticle(article)}
                    className="group cursor-pointer flex flex-col active:scale-[0.97] transition-transform"
                  >
                    <div className="aspect-[4/3] w-full rounded-md overflow-hidden bg-[#123D32]/10 dark:bg-[#0D2B36] border border-[#171717]/20 dark:border-[#4CA7A1]/30 relative shadow-xs">
                      <ResilientGoogleDriveImage
                        src={article.coverImageUrl || DEFAULT_COVER_IMAGE}
                        fallbackSrc={DEFAULT_COVER_IMAGE}
                        alt={article.title}
                        aspectRatioClass="aspect-[4/3]"
                        imageClassName="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                      />
                    </div>
                    <h4
                      className="text-[11px] font-bold font-serif line-clamp-2 leading-tight mt-1.5 text-[#171717] dark:text-[#CEFEF1] group-hover:text-[#123D32] dark:group-hover:text-[#4CA7A1] transition"
                      dangerouslySetInnerHTML={{ __html: autoWrapArabicText(article.title) }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeGenre ? (
          /* =========================================================================
             4 & 5. HALAMAN DETAIL GENRE KHUSUS MOBILE
             - Tampilkan judul genre di bagian atas dengan tombol kembali.
             - Tampilkan SELURUH artikel yang termasuk dalam genre tersebut (grid 3 kolom).
             - Setiap card hanya menampilkan thumbnail dan judul.
             - Tombol kembali dan Back browser berfungsi menuju katalog genre.
             ========================================================================= */
          <div className="space-y-4">
            {/* Header Detail Genre dengan Tombol Kembali */}
            <div className="flex items-center gap-3 pb-3 border-b-2 border-[#171717] dark:border-[#4CA7A1]">
              <button
                type="button"
                onClick={handleBackToCatalog}
                className="p-2 rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] bg-white dark:bg-[#001722] text-[#171717] dark:text-[#CEFEF1] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] hover:bg-[#FAF7F0] active:scale-95 transition cursor-pointer flex items-center justify-center shrink-0"
                aria-label="Kembali ke Katalog Genre"
                title="Kembali ke Katalog Genre"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#525855] dark:text-[#A6D6C9]">
                  Genre Artikel
                </div>
                <h2 className="text-base font-bold font-serif text-[#171717] dark:text-[#CEFEF1] truncate">
                  {activeGenre}
                </h2>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#D6AD52] text-[#171923] border border-[#171717] shrink-0">
                {currentGenreArticles.length} Artikel
              </span>
            </div>

            {/* Grid 3 Kolom untuk Seluruh Artikel dalam Genre Ini */}
            {currentGenreArticles.length === 0 ? (
              <div className="p-8 text-center rounded-xl border-2 border-dashed border-[#171717]/30 dark:border-[#4CA7A1]/30 bg-white/50 dark:bg-[#001722]/50 space-y-2">
                <p className="text-xs text-[#525855] dark:text-[#A6D6C9]">
                  Belum ada artikel pada genre ini.
                </p>
                <button
                  type="button"
                  onClick={handleBackToCatalog}
                  className="px-3 py-1 rounded bg-[#123D32] text-white text-xs font-bold"
                >
                  Kembali ke Katalog
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {currentGenreArticles.map((article) => (
                  <div
                    key={article.id}
                    onClick={() => onSelectArticle(article)}
                    className="group cursor-pointer flex flex-col active:scale-[0.97] transition-transform"
                  >
                    <div className="aspect-[4/3] w-full rounded-md overflow-hidden bg-[#123D32]/10 dark:bg-[#0D2B36] border border-[#171717]/20 dark:border-[#4CA7A1]/30 relative shadow-xs">
                      <ResilientGoogleDriveImage
                        src={article.coverImageUrl || DEFAULT_COVER_IMAGE}
                        fallbackSrc={DEFAULT_COVER_IMAGE}
                        alt={article.title}
                        aspectRatioClass="aspect-[4/3]"
                        imageClassName="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                      />
                    </div>
                    <h4
                      className="text-[11px] font-bold font-serif line-clamp-2 leading-tight mt-1.5 text-[#171717] dark:text-[#CEFEF1] group-hover:text-[#123D32] dark:group-hover:text-[#4CA7A1] transition"
                      dangerouslySetInnerHTML={{ __html: autoWrapArabicText(article.title) }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* =========================================================================
             2 & 3. KATALOG UTAMA MOBILE
             1. Bagian Artikel Terakhir Dibaca (alur normal, 1 card, thumbnail + judul).
             2. Katalog Genre Artikel (frame terpisah, 3 kolom, maks 3 card per baris).
             ========================================================================= */
          <div className="space-y-4">
            {/* BAGIAN 1: ARTIKEL TERAKHIR DIBACA (ALUR NORMAL, BUKAN STICKY/FIXED) */}
            {lastReadArticle && (
              <div className="rounded-xl border-2 border-[#171717] dark:border-[#4CA7A1] bg-[#123D32] dark:bg-[#1F5F63] text-[#FAF7F0] p-3 shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722] space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#D6AD52] dark:text-[#CEFEF1]">
                  <Clock className="w-3 h-3 text-[#D6AD52] dark:text-[#CEFEF1]" />
                  <span>Artikel Terakhir Dibaca</span>
                </div>
                <div
                  onClick={() => onSelectArticle(lastReadArticle)}
                  className="flex items-center gap-3 cursor-pointer group active:scale-[0.98] transition-transform bg-white/10 dark:bg-black/25 p-2 rounded-lg border border-white/15"
                >
                  <div className="w-20 h-14 shrink-0 rounded overflow-hidden bg-black/20 border border-white/20 relative">
                    <ResilientGoogleDriveImage
                      src={lastReadArticle.coverImageUrl || DEFAULT_COVER_IMAGE}
                      fallbackSrc={DEFAULT_COVER_IMAGE}
                      alt={lastReadArticle.title}
                      aspectRatioClass="w-full h-full"
                      imageClassName="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                    />
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    <h3
                      className="text-xs font-bold font-serif line-clamp-2 leading-snug text-white group-hover:text-[#D6AD52] dark:group-hover:text-[#CEFEF1] transition"
                      dangerouslySetInnerHTML={{ __html: autoWrapArabicText(lastReadArticle.title) }}
                    />
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/60 group-hover:text-white shrink-0" />
                </div>
              </div>
            )}

            {/* BAGIAN 2: KATALOG GENRE ARTIKEL (FRAME TERPISAH DENGAN BATAS VISUAL JELAS) */}
            {genreGroups.length === 0 ? (
              <div className="p-8 text-center rounded-xl border-2 border-dashed border-[#171717]/30 dark:border-[#4CA7A1]/30 bg-white/50 dark:bg-[#001722]/50 space-y-2">
                <BookOpen className="w-8 h-8 text-[#123D32] dark:text-[#4CA7A1] mx-auto opacity-70" />
                <p className="text-xs font-bold text-[#171717] dark:text-[#CEFEF1]">
                  Belum ada artikel yang tersedia.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {genreGroups.map((genre) => (
                  <div
                    key={genre.name}
                    className="rounded-xl border-2 border-[#171717] dark:border-[#4CA7A1] bg-white dark:bg-[#001722] p-3 shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722] space-y-2.5"
                  >
                    {/* Header Frame Genre (Dapat diklik untuk membuka Halaman Detail Genre) */}
                    <div
                      onClick={() => handleSelectGenre(genre.name)}
                      className="flex items-center justify-between cursor-pointer group pb-2 border-b border-[#171717]/10 dark:border-[#4CA7A1]/20 active:opacity-75"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-[#D6AD52] shrink-0" />
                        <h3 className="font-serif font-bold text-xs sm:text-sm text-[#171717] dark:text-[#CEFEF1] group-hover:text-[#123D32] dark:group-hover:text-white transition truncate">
                          {genre.name}
                        </h3>
                        <span className="text-[10px] font-bold text-[#525855] dark:text-[#A6D6C9] shrink-0">
                          ({genre.articles.length})
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-extrabold text-[#123D32] dark:text-[#4CA7A1] group-hover:underline shrink-0">
                        <span>Lihat Semua</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Susunan Tiga Kolom dalam Satu Baris (Maksimal 3 Card) */}
                    <div className="grid grid-cols-3 gap-2">
                      {genre.articles.slice(0, 3).map((article) => (
                        <div
                          key={article.id}
                          onClick={() => onSelectArticle(article)}
                          className="group cursor-pointer flex flex-col active:scale-[0.97] transition-transform"
                        >
                          {/* Thumbnail */}
                          <div className="aspect-[4/3] w-full rounded-md overflow-hidden bg-[#123D32]/10 dark:bg-[#0D2B36] border border-[#171717]/20 dark:border-[#4CA7A1]/30 relative shadow-xs">
                            <ResilientGoogleDriveImage
                              src={article.coverImageUrl || DEFAULT_COVER_IMAGE}
                              fallbackSrc={DEFAULT_COVER_IMAGE}
                              alt={article.title}
                              aspectRatioClass="aspect-[4/3]"
                              imageClassName="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                            />
                          </div>
                          {/* Judul Artikel (Tanpa metadata/deskripsi/tanggal) */}
                          <h4
                            className="text-[11px] font-bold font-serif line-clamp-2 leading-tight mt-1.5 text-[#171717] dark:text-[#CEFEF1] group-hover:text-[#123D32] dark:group-hover:text-[#4CA7A1] transition"
                            dangerouslySetInnerHTML={{ __html: autoWrapArabicText(article.title) }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          DESKTOP VIEW (hidden md:block) — TETAP PERSIS SEPERTI SEKARANG
          - Hero banner dengan search & share button
          - Tombol filter kategori
          - Artikel Unggulan Utama
          - Daftar Artikel Terbaru (Grid desktop dengan MobileCarousel container)
         ========================================================================= */}
      <div className="hidden md:block space-y-8 sm:space-y-10">
        {/* HERO BANNER SECTION */}
        <div className="relative overflow-hidden rounded-lg bg-[#123D32] dark:bg-[#1F5F63] text-[#FAF7F0] dark:text-[#CEFEF1] p-6 sm:p-10 border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[6px_6px_0px_#171717] dark:shadow-[6px_6px_0px_#001722]">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#4CA7A1] border-2 border-[#171717] dark:border-[#001722] text-[#001722] text-xs font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#001722]" />
              <span>Blog & Catatan Ilmu</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif tracking-tight text-white leading-tight">
              Naskah, Faedah Kajian, & Artikel Dars with Osama
            </h1>
            <p className="text-[#FAF7F0]/90 dark:text-[#A6D6C9] text-xs sm:text-sm leading-relaxed">
              Temukan artikel ilmiah, rangkuman tazkiyatun nufs, panduan tadabbur Al-Qur'an, serta catatan keilmuan Islam untuk membina pembaca setia.
            </p>

            {/* SEARCH BAR & SHARE BUTTON */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex items-center flex-1 max-w-lg bg-white dark:bg-[#001722] border-2 border-[#171717] dark:border-[#4CA7A1] rounded-md shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#001722]">
                <Search className="w-4 h-4 absolute left-3.5 text-[#123D32] dark:text-[#4CA7A1]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari artikel, topik, atau kata kunci..."
                  className="w-full pl-10 pr-4 py-3 bg-transparent text-xs sm:text-sm font-semibold text-[#171717] dark:text-[#CEFEF1] placeholder:text-[#525855] dark:placeholder:text-[#A6D6C9] focus:outline-none"
                />
              </div>

              <button
                type="button"
                data-testid="share-blog-page-btn"
                onClick={() => setShareModalOpen(true)}
                className="px-4 py-3 text-xs font-extrabold uppercase tracking-wider rounded-md border-2 border-[#171717] dark:border-[#001722] bg-[#D6AD52] hover:bg-[#E5BE65] text-[#171923] shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#001722] transition-all inline-flex items-center justify-center gap-2 cursor-pointer shrink-0"
                title="Bagikan tautan halaman utama Artikel Ilmiah"
              >
                <Share2 className="w-4 h-4 text-[#171923]" />
                <span>Bagikan Artikel Ilmiah</span>
              </button>
            </div>
          </div>
        </div>

        {/* CATEGORY FILTER BUTTONS */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-md text-xs font-extrabold whitespace-nowrap border-2 transition cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#123D32] text-[#FAF7F0] border-[#171717] shadow-[3px_3px_0px_#171717] dark:bg-[#4CA7A1] dark:text-[#001722] dark:border-[#001722] dark:shadow-[3px_3px_0px_#001722]'
                : 'bg-white dark:bg-[#1F5F63] text-[#171717] dark:text-[#CEFEF1] border-[#171717] dark:border-[#4CA7A1] hover:bg-[#FAF7F0] dark:hover:bg-[#277277]'
            }`}
          >
            Semua Artikel ({posts.length})
          </button>

          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-md text-xs font-extrabold whitespace-nowrap border-2 transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#123D32] text-[#FAF7F0] border-[#171717] shadow-[3px_3px_0px_#171717] dark:bg-[#4CA7A1] dark:text-[#001722] dark:border-[#001722] dark:shadow-[3px_3px_0px_#001722]'
                  : 'bg-white dark:bg-[#1F5F63] text-[#171717] dark:text-[#CEFEF1] border-[#171717] dark:border-[#4CA7A1] hover:bg-[#FAF7F0] dark:hover:bg-[#277277]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FEATURED ARTICLE (IF AVAILABLE) */}
        {featuredPost && selectedCategory === 'all' && !searchQuery && (
          <div className="space-y-3">
            <h2 className="text-xs font-extrabold text-[#123D32] dark:text-[#CEFEF1] uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1]" />
              <span>Artikel Unggulan Utama</span>
            </h2>

            <div
              onClick={() => onSelectArticle(featuredPost)}
              className="nb-card-interactive overflow-hidden group cursor-pointer grid grid-cols-1 lg:grid-cols-12"
            >
              <div className="lg:col-span-7 aspect-video lg:aspect-auto relative overflow-hidden bg-[#123D32] dark:bg-[#0D2B36] border-b-2 lg:border-b-0 lg:border-r-2 border-[#171717] dark:border-[#4CA7A1]">
                <ResilientGoogleDriveImage
                  src={featuredPost.coverImageUrl || DEFAULT_COVER_IMAGE}
                  fallbackSrc={DEFAULT_COVER_IMAGE}
                  alt={featuredPost.title}
                  aspectRatioClass="w-full h-full aspect-video lg:aspect-auto"
                  imageClassName="w-full h-full object-cover group-hover:scale-103 transition duration-300"
                />
                <span className="absolute top-4 left-4 px-3 py-1 bg-[#4CA7A1] text-[#001722] font-extrabold text-xs uppercase tracking-wider rounded border-2 border-[#171717] dark:border-[#001722] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722] flex items-center gap-1.5 z-10">
                  <Sparkles className="w-3.5 h-3.5" /> Artikel Unggulan
                </span>
              </div>

              <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs text-[#525855] dark:text-[#A6D6C9] font-bold">
                    <span className="px-2.5 py-0.5 rounded bg-[#4CA7A1] text-[#001722] border border-[#171717] dark:border-[#001722] font-extrabold text-[10px] uppercase">
                      {featuredPost.category}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#123D32] dark:text-[#A6D6C9]" />
                      {featuredPost.readingTimeMinutes} min baca
                    </span>
                  </div>

                  <h3
                    className="text-lg sm:text-xl font-bold font-serif text-[#171717] dark:text-[#CEFEF1] leading-snug group-hover:text-[#123D32] dark:group-hover:text-white transition"
                    dangerouslySetInnerHTML={{ __html: autoWrapArabicText(featuredPost.title) }}
                  />

                  {featuredPost.titleAr && (
                    <p
                      className="font-amiri text-base sm:text-lg text-[#123D32] dark:text-[#CEFEF1] font-bold leading-[1.9]"
                      dir="rtl"
                    >
                      {featuredPost.titleAr}
                    </p>
                  )}

                  <p
                    style={fontControl.style}
                    className="reading-scalable-text text-[#525855] dark:text-[#A6D6C9] line-clamp-3 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: autoWrapArabicText(featuredPost.excerpt) }}
                  />
                </div>

                <div className="pt-4 border-t-2 border-[#171717] dark:border-[#4CA7A1] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-md bg-[#001722] text-[#CEFEF1] font-bold text-xs flex items-center justify-center border-2 border-[#171717] dark:border-[#4CA7A1] overflow-hidden shrink-0">
                      {(featuredPost.authorPhoto || instructorPhoto) && !featuredPhotoError ? (
                        <img
                          src={resolveDisplayImageUrl(featuredPost.authorPhoto || instructorPhoto)}
                          alt={featuredPost.authorName}
                          onError={() => setFeaturedPhotoError(true)}
                          className="w-full h-full object-cover object-top sm:object-center"
                        />
                      ) : (
                        <span>{featuredPost.authorName.charAt(0)}</span>
                      )}
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-[#171717] dark:text-[#A6D6C9]">
                        {featuredPost.authorName}
                      </p>
                      <p className="text-[11px] text-[#525855] dark:text-[#A6D6C9]/80">
                        {new Date(
                          featuredPost.publishedAt || featuredPost.createdAt
                        ).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded border border-[#171717] dark:border-[#4CA7A1] text-xs font-extrabold text-[#123D32] dark:text-[#4CA7A1] flex items-center gap-1 group-hover:bg-[#123D32] group-hover:text-white dark:group-hover:bg-[#4CA7A1] dark:group-hover:text-[#001722] transition">
                    Baca Artikel <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SERVICE DISRUPTION BANNER WHEN DATA IS RETAINED IN MEMORY */}
        {isAdmin && loadError && posts.length > 0 && (
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#171717] dark:border-[#4CA7A1] pb-3">
            <h2 className="text-lg sm:text-xl font-bold font-serif text-[#171717] dark:text-[#CEFEF1]">
              Daftar Artikel Terbaru ({filteredPosts.length})
            </h2>

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

          {loading ? (
            <div className="flex sm:grid overflow-x-auto sm:overflow-visible pb-3 pt-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 no-scrollbar -mx-2 px-2 sm:mx-0">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-[84vw] max-w-[340px] shrink-0 sm:w-auto sm:shrink nb-card p-4 animate-pulse space-y-3"
                >
                  <div className="aspect-video bg-[#171717]/10 dark:bg-[#0D2B36] rounded-md" />
                  <div className="h-4 bg-[#171717]/10 dark:bg-[#0D2B36] rounded w-3/4" />
                  <div className="h-3 bg-[#171717]/10 dark:bg-[#0D2B36] rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            loadError && posts.length === 0 && isAdmin ? (
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
                <BookOpen className="w-12 h-12 text-[#123D32] dark:text-[#4CA7A1] mx-auto" />
                <p className="text-sm font-bold text-[#171717] dark:text-[#CEFEF1]">
                  Tidak ada artikel yang ditemukan.
                </p>
                <p className="text-xs text-[#525855] dark:text-[#A6D6C9]">
                  Coba gunakan kata kunci pencarian lain atau pilih kategori artikel yang tersedia.
                </p>
              </div>
            )
          ) : (
            <MobileCarousel
              desktopGridClass="sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-6"
              ariaLabel="Daftar Artikel Ilmiah"
            >
              {(selectedCategory === 'all' && !searchQuery ? regularPosts : filteredPosts).map(
                (post) => (
                  <div
                    key={post.id}
                    onClick={() => onSelectArticle(post)}
                    data-card-type="article"
                    className="article-card card-artikel nb-card-interactive overflow-hidden flex flex-col justify-between group cursor-pointer h-full border-2 border-[#171717] shadow-[4px_4px_0px_#171717]"
                    style={{ backgroundColor: '#6C151E', color: '#FFF5E9' }}
                  >
                    <div>
                      {/* Image cover */}
                      <div className="aspect-video w-full bg-[#4A0E14] overflow-hidden relative border-b-2 border-[#171717]">
                        <ResilientGoogleDriveImage
                          src={post.coverImageUrl || DEFAULT_COVER_IMAGE}
                          fallbackSrc={DEFAULT_COVER_IMAGE}
                          alt={post.title}
                          aspectRatioClass="aspect-video"
                          imageClassName="w-full h-full object-cover group-hover:scale-103 transition duration-300"
                        />
                      </div>

                      {/* Title & Metadata */}
                      <div className="p-4 sm:p-5 space-y-2.5 bg-[#6C151E] text-[#FFF5E9]">
                        <div className="flex items-center gap-2 text-[11px] text-[#F5DABF] font-bold">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#F5DABF]" />
                            <span className="truncate">
                              {new Date(post.publishedAt || post.createdAt).toLocaleDateString(
                                'id-ID',
                                { day: 'numeric', month: 'short', year: 'numeric' }
                              )}
                            </span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 shrink-0">
                            <Clock className="w-3.5 h-3.5 text-[#F5DABF]" />
                            <span>{post.readingTimeMinutes} min</span>
                          </span>
                        </div>

                        <h3
                          className="font-serif font-bold text-white group-hover:text-[#F5DABF] text-base sm:text-lg leading-snug transition line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: autoWrapArabicText(post.title) }}
                        />

                        {post.titleAr && (
                          <p
                            className="font-amiri text-sm sm:text-base text-[#F5DABF] font-bold truncate leading-[1.85]"
                            dir="rtl"
                          >
                            {post.titleAr}
                          </p>
                        )}

                        {/* Category Badge(s) in Info Area */}
                        {post.category && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {post.category
                              .split(',')
                              .map((c) => c.trim())
                              .filter(Boolean)
                              .map((catName, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider bg-[#F5DABF] text-[#6C151E] border border-[#171717] shadow-[1.5px_1.5px_0px_#171717] inline-block"
                                >
                                  {catName}
                                </span>
                              ))}
                          </div>
                        )}

                        <p
                          style={fontControl.style}
                          className="reading-scalable-text text-[#FFF5E9]/90 text-xs line-clamp-2 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: autoWrapArabicText(post.excerpt) }}
                        />
                      </div>
                    </div>

                    {/* Footer info */}
                    <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-t-2 border-[#F5DABF]/20 bg-[#6C151E] text-[#FFF5E9] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-[#FAF7F0] text-[#6C151E] border border-[#171717] font-bold text-[10px] flex items-center justify-center shrink-0">
                          {post.authorName.charAt(0)}
                        </div>
                        <span className="font-bold text-[#F5DABF] text-xs truncate max-w-[120px] sm:max-w-none">
                          {post.authorName}
                        </span>
                      </div>

                      <span className="px-2.5 py-0.5 rounded border-2 border-[#F5DABF] text-[#F5DABF] font-extrabold text-[11px] flex items-center gap-0.5 group-hover:bg-[#F5DABF] group-hover:text-[#6C151E] transition shrink-0">
                        Baca Artikel <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                )
              )}
            </MobileCarousel>
          )}
        </div>
      </div>

      {/* FEATURE SHARE MODAL (ARTIKEL ILMIAH) */}
      <FeatureShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        config={ARTIKEL_ILMIAH_SHARE_CONFIG}
      />
    </div>
  );
};
