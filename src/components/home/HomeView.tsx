import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  Sparkles,
  BookMarked,
  Clock,
  Calendar,
  HeartHandshake,
  Library,
  MessageSquare,
  Lock,
  Send,
  HelpCircle,
  GraduationCap,
  CheckCircle2
} from 'lucide-react';
import { Category, Course, Enrollment, BlogPost, Consultation, LibraryBook } from '../../types';
import { HeroSection } from './HeroSection';
import { CourseCard } from '../courses/CourseCard';
import { LibraryCard } from '../library/LibraryCard';
import { MobileCarousel } from '../common/MobileCarousel';
import { useAuth } from '../../context/AuthContext';
import { getPublishedPublicQA } from '../../firebase/services';
import { classifyFirestoreError } from '../../firebase/config';
import { canAttemptRetry, DEFAULT_RETRY_COOLDOWN_SECONDS } from '../../utils/serviceDisruptionHelper';
import { ResilientGoogleDriveImage } from '../common/ResilientGoogleDriveImage';
import { getAosDelay, refreshHardGlobalAOS } from '../../utils/aosManager';

interface HomeViewProps {
  categories: Category[];
  courses: Course[];
  blogPosts?: BlogPost[];
  libraryBooks?: LibraryBook[];
  enrollmentsMap: Record<string, Enrollment>;
  onSelectCourse: (course: Course) => void;
  onSelectBlogPost?: (post: BlogPost) => void;
  onSelectLibraryBook?: (book: LibraryBook) => void;
  onExplore: () => void;
  onSearch: (query: string) => void;
  onSelectCategory: (categoryId: string) => void;
  onNavigate?: (view: string, qaId?: string) => void;
  onOpenAuthModal?: (tab: 'login' | 'register') => void;
}

function stripHtmlTags(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Subcomponent: Individual Q&A Preview Card for Home Page
const HomeQACard: React.FC<{
  item: Consultation;
  onReadMore: () => void;
  aosDelay?: number;
}> = ({ item, onReadMore, aosDelay = 0 }) => {
  const { user } = useAuth();
  const plainAnswer = stripHtmlTags(item.replyContent || '');
  const shortAnswer = plainAnswer.length > 120 ? plainAnswer.slice(0, 120) + '...' : plainAnswer;
  const shortQuestion = item.content.length > 95 ? item.content.slice(0, 95) + '...' : item.content;

  return (
    <div
      onClick={onReadMore}
      data-card-type="qa"
      data-aos="fade-up"
      data-aos-delay={aosDelay > 0 ? String(aosDelay) : undefined}
      className="qa-card card-tanya-jawab nb-card-interactive p-3.5 sm:p-4 flex flex-col justify-between group cursor-pointer text-left space-y-3 h-full border-2 border-[#171717] shadow-[4px_4px_0px_#171717]"
      style={{ backgroundColor: '#F5DABF', color: '#0F3D3A' }}
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="nb-badge bg-[#6C151E] text-[#FFF5E9] border-[#171717] shadow-[1.5px_1.5px_0px_#171717] text-[10px] px-2 py-0.5 font-extrabold">
            Tanya Jawab Syar'i
          </span>
          <span className="text-[10.5px] font-bold text-[#6C151E]">
            {item.publishedAt
              ? new Date(item.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'Terbit'}
          </span>
        </div>

        <h3 className="font-serif font-bold text-sm sm:text-[15px] text-[#0F3D3A] group-hover:text-[#6C151E] line-clamp-2 leading-snug transition-colors">
          {item.title}
        </h3>

        <p className="text-[11px] sm:text-xs text-[#0F3D3A] line-clamp-2 leading-relaxed">
          <strong className="font-bold text-[#6C151E]">Pertanyaan: </strong>
          {shortQuestion}
        </p>

        {shortAnswer && (
          <div className="p-2.5 rounded-md bg-[#FFF5E9] border-2 border-[#171717] text-[11px] sm:text-xs text-[#0F3D3A] leading-relaxed line-clamp-2">
            <strong className="font-bold text-[#6C151E]">Jawaban: </strong>
            {shortAnswer}
          </div>
        )}
      </div>

      <div className="pt-2.5 border-t-2 border-[#6C151E]/20 flex items-center justify-between text-[11px] sm:text-xs bg-[#F5DABF]">
        <span className="inline-flex items-center gap-1.5 font-extrabold text-[#0F3D3A] group-hover:text-[#6C151E] transition-colors">
          <span>Baca Jawaban Lengkap</span>
          {!user ? (
            <Lock className="w-3.5 h-3.5 text-[#6C151E] ml-0.5 shrink-0" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5 text-[#0F3D3A] group-hover:text-[#6C151E] transition-transform group-hover:translate-x-1 shrink-0" />
          )}
        </span>
        {!user && (
          <span className="text-[10px] font-extrabold text-[#FFF5E9] bg-[#6C151E] px-2 py-0.5 rounded border border-[#171717] shrink-0">
            Login
          </span>
        )}
      </div>
    </div>
  );
};

// Subcomponent: Individual Article Card with Thumbnail & Fallback
const HomeArticleCard: React.FC<{
  post: BlogPost;
  onSelect?: (post: BlogPost) => void;
  aosDelay?: number;
}> = ({ post, onSelect, aosDelay = 0 }) => {
  const fallbackImg = 'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=800&auto=format&fit=crop';

  const formattedDate = React.useMemo(() => {
    try {
      const d = new Date(post.publishedAt || post.createdAt);
      if (isNaN(d.getTime())) return 'Faedah Keilmuan';
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Faedah Keilmuan';
    }
  }, [post.publishedAt, post.createdAt]);

  return (
    <div
      onClick={() => onSelect?.(post)}
      data-card-type="article"
      data-aos="fade-up"
      data-aos-delay={aosDelay > 0 ? String(aosDelay) : undefined}
      className="article-card card-artikel nb-card-interactive overflow-hidden flex flex-col justify-between group cursor-pointer h-full border-2 border-[#171717] shadow-[4px_4px_0px_#171717]"
      style={{ backgroundColor: '#6C151E', color: '#FFF5E9' }}
    >
      <div>
        <div className="relative aspect-video w-full overflow-hidden bg-[#4A0E14] border-b-2 border-[#171717]">
          <ResilientGoogleDriveImage
            src={post.coverImageUrl || fallbackImg}
            fallbackSrc={fallbackImg}
            alt={post.title}
            aspectRatioClass="aspect-video"
            imageClassName="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
          />
        </div>

        <div className="p-3.5 sm:p-4 space-y-2 text-left bg-[#6C151E] text-[#FFF5E9]">
          <div className="flex items-center gap-2.5 text-[10.5px] text-[#F5DABF] font-bold">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#F5DABF]" />
              <span className="truncate">{formattedDate}</span>
            </span>
            {post.readingTimeMinutes > 0 && (
              <span className="flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3 text-[#F5DABF]" />
                <span>{post.readingTimeMinutes} mnt baca</span>
              </span>
            )}
          </div>

          <h3 className="font-serif font-bold text-sm sm:text-[15px] text-white group-hover:text-[#F5DABF] transition-colors leading-snug line-clamp-2">
            {post.title}
          </h3>

          {/* Category Badge(s) in Info Area */}
          {post.category && (
            <div className="flex flex-wrap items-center gap-1.5">
              {post.category
                .split(',')
                .map((c) => c.trim())
                .filter(Boolean)
                .map((catName, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-[#F5DABF] text-[#6C151E] border border-[#171717] shadow-[1.5px_1.5px_0px_#171717] inline-block"
                  >
                    {catName}
                  </span>
                ))}
            </div>
          )}

          <p className="text-[11px] sm:text-xs text-[#FFF5E9]/90 line-clamp-2 leading-relaxed">
            {post.excerpt}
          </p>
        </div>
      </div>

      <div className="px-3.5 sm:px-4 pb-3.5 pt-2.5 border-t-2 border-[#F5DABF]/20 text-left flex items-center justify-between bg-[#6C151E]">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border-2 border-[#F5DABF] text-[11px] font-extrabold text-[#F5DABF] bg-transparent group-hover:bg-[#F5DABF] group-hover:text-[#6C151E] transition-colors">
          <span>Baca Artikel</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </div>
  );
};

export const HomeView: React.FC<HomeViewProps> = ({
  categories,
  courses,
  blogPosts = [],
  libraryBooks = [],
  enrollmentsMap,
  onSelectCourse,
  onSelectBlogPost,
  onSelectLibraryBook,
  onExplore,
  onSearch,
  onSelectCategory,
  onNavigate,
  onOpenAuthModal
}) => {
  const { user, openAuthModal } = useAuth();
  const rootRef = useRef<HTMLDivElement>(null);

  // Home Q&A state with disruption handling
  const [publishedQA, setPublishedQA] = useState<Consultation[]>([]);
  const [qaError, setQaError] = useState<{ category: string; summary: string; code: string } | null>(null);
  const [lastQaFetchTime, setLastQaFetchTime] = useState<number>(0);
  const [isRetryingQa, setIsRetryingQa] = useState<boolean>(false);

  const loadHomeQA = (isManual = false) => {
    if (isManual) {
      if (!canAttemptRetry(lastQaFetchTime, DEFAULT_RETRY_COOLDOWN_SECONDS)) return;
      setIsRetryingQa(true);
    }
    setLastQaFetchTime(Date.now());
    getPublishedPublicQA()
      .then((list) => {
        setPublishedQA(list);
        setQaError(null);
        setTimeout(() => {
          refreshHardGlobalAOS();
        }, 100);
      })
      .catch((err) => {
        console.warn('Home Q&A load notice:', err);
        const diag = classifyFirestoreError(err);
        setQaError(diag);
      })
      .finally(() => {
        setIsRetryingQa(false);
      });
  };

  useEffect(() => {
    loadHomeQA();
  }, []);

  const publishedArticles = React.useMemo(() => {
    return blogPosts.filter((p) => p.status === 'published');
  }, [blogPosts]);

  const publishedLibraryBooks = React.useMemo(() => {
    return libraryBooks.filter((b) => b.status === 'published');
  }, [libraryBooks]);

  const handleGo = (view: string, qaId?: string) => {
    if (onNavigate) {
      onNavigate(view, qaId);
    } else {
      onExplore();
    }
  };

  const handleReadQA = (itemId: string) => {
    handleGo('public-qa', itemId);
  };

  const handleAskQuestion = () => {
    if (!user) {
      openAuthModal('login', {
        type: 'enroll',
        onSuccess: () => {
          handleGo('consultation');
        }
      });
      return;
    }
    handleGo('consultation');
  };

  return (
    <div ref={rootRef} className="space-y-7 sm:space-y-9 pb-10 overflow-x-clip font-sans">
      {/* SECTION 1: HERO & KATA SAMBUTAN */}
      <div className="relative z-0">
        <HeroSection
          categories={categories}
          onSearch={onSearch}
          onSelectCategory={onSelectCategory}
          onExplore={onExplore}
          onNavigate={onNavigate}
          onOpenAuthModal={onOpenAuthModal}
        />
      </div>

      {/* SECTION 2: KATALOG KURSUS UNGGULAN */}
      <section className="max-w-[1320px] mx-auto px-3 sm:px-6">
        <div className="nb-card p-4 sm:p-5 lg:p-6 space-y-4">
          <div data-aos="fade-up" className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b-2 border-[#171717] dark:border-[#4CA7A1] pb-3.5">
            <div className="space-y-1">
              <span className="nb-badge bg-[#4CA7A1] text-[#001722] border-[#171717] dark:border-[#001722] text-[10px]">
                <Sparkles className="w-3 h-3 mr-1" />
                <span>Kurikulum Pilihan</span>
              </span>
              <h2 className="dars-section-title font-bold text-[#171717] dark:text-[#CEFEF1] font-serif pt-0.5">
                Katalog Kursus &amp; Syarah Matan Unggulan
              </h2>
              <p className="text-xs text-[#525855] dark:text-[#A6D6C9]">
                Mulai belajar sekarang secara gratis untuk menyimak rekaman video, membaca naskah materi, dan mengerjakan evaluasi.
              </p>
            </div>

            <button
              onClick={() => handleGo('courses')}
              className="px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-wider rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] bg-transparent text-[#123D32] dark:text-[#4CA7A1] hover:bg-[#123D32] hover:text-white dark:hover:bg-[#4CA7A1] dark:hover:text-[#001722] transition-all inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 cursor-pointer shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]"
            >
              <span>Lihat Seluruh Katalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <MobileCarousel
            desktopGridClass="sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-4"
            ariaLabel="Materi Pembelajaran Pilihan"
            showSwipeHint={true}
          >
            {courses.slice(0, 4).map((course, idx) => (
              <CourseCard
                key={course.id}
                course={course}
                category={categories.find((c) => c.id === course.categoryId)}
                enrollment={enrollmentsMap[course.id] || null}
                onSelect={onSelectCourse}
                aosDelay={getAosDelay(idx, 4)}
              />
            ))}
          </MobileCarousel>
        </div>
      </section>

      {/* SECTION 2B: LIBRARY DIGITAL (DITAMPILKAN SEBELUM ARTIKEL, HANYA JIKA ADA KITAB PUBLISHED) */}
      {publishedLibraryBooks.length > 0 && (
        <section
          data-testid="home-library-section"
          className="max-w-[1320px] mx-auto px-3 sm:px-6"
        >
          <div className="nb-card p-4 sm:p-5 lg:p-6 space-y-4">
            <div data-aos="fade-up" className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b-2 border-[#171717] dark:border-[#4CA7A1] pb-3.5">
              <div className="space-y-1">
                <span className="nb-badge bg-[#4CA7A1] text-[#001722] border-[#171717] dark:border-[#001722] text-[10px]">
                  <Library className="w-3 h-3 mr-1" />
                  <span>Koleksi Kitab &amp; Referensi</span>
                </span>
                <h2 className="dars-section-title font-bold text-[#171717] dark:text-[#CEFEF1] font-serif pt-0.5">
                  Library Digital
                </h2>
                <p className="text-xs text-[#525855] dark:text-[#A6D6C9]">
                  Jelajahi koleksi kitab pilihan, panduan ilmiah, dan naskah rujukan yang telah diterbitkan di Library Digital.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleGo('library')}
                className="px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-wider rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] bg-transparent text-[#123D32] dark:text-[#4CA7A1] hover:bg-[#123D32] hover:text-white dark:hover:bg-[#4CA7A1] dark:hover:text-[#001722] transition-all inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 cursor-pointer shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]"
              >
                <span>Lihat Semua Library</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <MobileCarousel
              desktopGridClass="sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-4"
              mobileItemClassName="w-[74vw] max-w-[270px]"
              ariaLabel="Koleksi Library Digital"
              showSwipeHint={true}
            >
              {publishedLibraryBooks.slice(0, 8).map((book, idx) => (
                <LibraryCard
                  key={book.id}
                  book={book}
                  testIdPrefix="home-library-card"
                  aosDelay={getAosDelay(idx, 4)}
                  onSelect={(selectedBook) => {
                    if (onSelectLibraryBook) {
                      onSelectLibraryBook(selectedBook);
                    } else {
                      handleGo('library');
                    }
                  }}
                />
              ))}
            </MobileCarousel>
          </div>
        </section>
      )}

      {/* SECTION 3: ARTIKEL TERBARU */}
      <section className="max-w-[1320px] mx-auto px-3 sm:px-6">
        <div className="nb-card p-4 sm:p-5 lg:p-6 space-y-4">
          <div data-aos="fade-up" className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b-2 border-[#171717] dark:border-[#4CA7A1] pb-3.5">
            <div className="space-y-1">
              <span className="nb-badge bg-[#4CA7A1] text-[#001722] border-[#171717] dark:border-[#001722] text-[10px]">
                <BookMarked className="w-3 h-3 mr-1" />
                <span>Naskah &amp; Faedah Keilmuan</span>
              </span>
              <h2 className="dars-section-title font-bold text-[#171717] dark:text-[#CEFEF1] font-serif pt-0.5">
                Artikel &amp; Catatan Ilmiah Terbaru
              </h2>
              <p className="text-xs text-[#525855] dark:text-[#A6D6C9]">
                Baca tulisan, faedah kajian, dan catatan ilmiyyah terbaru untuk menambah wawasan dan pemahaman.
              </p>
            </div>

            <button
              onClick={() => handleGo('blog')}
              className="px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-wider rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] bg-transparent text-[#123D32] dark:text-[#4CA7A1] hover:bg-[#123D32] hover:text-white dark:hover:bg-[#4CA7A1] dark:hover:text-[#001722] transition-all inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 cursor-pointer shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]"
            >
              <span>Lihat Semua Artikel</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {publishedArticles.length > 0 ? (
            <MobileCarousel
              desktopGridClass="sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-4"
              ariaLabel="Artikel Ilmiah Terbaru"
              showSwipeHint={true}
            >
              {publishedArticles.slice(0, 4).map((article, idx) => (
                <HomeArticleCard
                  key={article.id}
                  post={article}
                  aosDelay={getAosDelay(idx, 4)}
                  onSelect={(post) => {
                    if (onSelectBlogPost) {
                      onSelectBlogPost(post);
                    } else {
                      handleGo('blog');
                    }
                  }}
                />
              ))}
            </MobileCarousel>
          ) : (
            <div className="p-6 text-center bg-[#FAF7F0] dark:bg-[#0D2B36] border-2 border-dashed border-[#171717] dark:border-[#4CA7A1] rounded-md space-y-2.5">
              <BookMarked className="w-7 h-7 text-[#123D32] dark:text-[#4CA7A1] mx-auto" />
              <h4 className="text-sm font-bold text-[#171717] dark:text-[#CEFEF1] font-serif">
                Belum Ada Artikel Dipublikasikan
              </h4>
              <p className="text-xs text-[#525855] dark:text-[#A6D6C9] max-w-sm mx-auto">
                Artikel ilmiah dan catatan keilmuan terbaru sedang disiapkan. Anda dapat menjelajahi materi kitab interaktif di atas.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 4: TANYA JAWAB PILIHAN */}
      <section className="max-w-[1320px] mx-auto px-3 sm:px-6">
        <div className="nb-card p-4 sm:p-5 lg:p-6 space-y-4">
          <div data-aos="fade-up" className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b-2 border-[#171717] dark:border-[#4CA7A1] pb-3.5">
            <div className="space-y-1">
              <span className="nb-badge bg-[#4CA7A1] text-[#001722] border-[#171717] dark:border-[#001722] text-[10px]">
                <MessageSquare className="w-3 h-3 mr-1" />
                <span>Bimbingan &amp; Konsultasi Syar'i</span>
              </span>
              <h2 className="dars-section-title font-bold text-[#171717] dark:text-[#CEFEF1] font-serif pt-0.5">
                Tanya Jawab Pilihan
              </h2>
              <p className="text-xs text-[#525855] dark:text-[#A6D6C9]">
                Arsip pertanyaan &amp; jawaban materi pembelajaran pilihan yang telah dijawab oleh Ustaz &amp; Pembimbing.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                onClick={handleAskQuestion}
                className="px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-wider rounded-md border-2 border-[#171717] dark:border-[#001722] bg-[#4CA7A1] hover:bg-[#5EBEB7] text-[#001722] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ajukan Pertanyaan</span>
              </button>

              <button
                onClick={() => handleGo('public-qa')}
                className="px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-wider rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] bg-transparent text-[#123D32] dark:text-[#4CA7A1] hover:bg-[#123D32] hover:text-white dark:hover:bg-[#4CA7A1] dark:hover:text-[#001722] transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]"
              >
                <span>Semua Tanya Jawab</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {publishedQA.length > 0 ? (
            <MobileCarousel
              desktopGridClass="sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-4"
              ariaLabel="Tanya Jawab Pilihan"
              showSwipeHint={true}
            >
              {publishedQA.slice(0, 4).map((item, idx) => (
                <HomeQACard
                  key={item.id}
                  item={item}
                  aosDelay={getAosDelay(idx, 4)}
                  onReadMore={() => handleReadQA(item.id)}
                />
              ))}
            </MobileCarousel>
          ) : qaError ? (
            <div className="p-6 text-center bg-[#0D2B36] border-2 border-[#171717] dark:border-[#4CA7A1] rounded-md space-y-2.5">
              <HelpCircle className="w-7 h-7 text-[#123D32] dark:text-[#4CA7A1] mx-auto" />
              <h4 className="text-sm font-bold text-[#171717] dark:text-[#CEFEF1] font-serif">
                Sinkronisasi Tanya Jawab Terkendala ({qaError.category === 'resource-exhausted' ? 'Batas Kuota Firestore' : 'Jaringan'})
              </h4>
              <p className="text-xs text-[#525855] dark:text-[#A6D6C9] max-w-sm mx-auto leading-relaxed">
                Data konsultasi tetap aman tersimpan di Google Cloud Firestore. Anda dapat mencoba memuat ulang kembali.
              </p>
              <button
                onClick={() => loadHomeQA(true)}
                disabled={isRetryingQa}
                className="nb-btn nb-btn-gold px-4 py-2 text-xs"
              >
                {isRetryingQa ? 'Memuat...' : 'Coba Muat Ulang'}
              </button>
            </div>
          ) : (
            <div className="p-6 text-center bg-[#FAF7F0] dark:bg-[#0D2B36] border-2 border-dashed border-[#171717] dark:border-[#4CA7A1] rounded-md space-y-2.5">
              <HelpCircle className="w-7 h-7 text-[#123D32] dark:text-[#4CA7A1] mx-auto" />
              <h4 className="text-sm font-bold text-[#171717] dark:text-[#CEFEF1] font-serif">
                Belum Ada Tanya Jawab Dipublikasikan
              </h4>
              <p className="text-xs text-[#525855] dark:text-[#A6D6C9] max-w-sm mx-auto leading-relaxed">
                Pertanyaan materi pembelajaran yang telah disetujui akan ditampilkan di sini. Anda dapat mengajukan pertanyaan baru melalui Ruang Konsultasi.
              </p>
              <button
                onClick={handleAskQuestion}
                className="nb-btn nb-btn-primary px-4 py-2 text-xs"
              >
                Kirim Pertanyaan Pertama
              </button>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 5: PROFIL PENGAJAR & PERKENALAN */}
      <section className="max-w-[1320px] mx-auto px-3 sm:px-6">
        <div
          data-aos="fade-up"
          className="bg-[#123D32] dark:bg-[#1F5F63] text-[#FAF7F0] dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] rounded-lg p-5 sm:p-6 shadow-[5px_5px_0px_#171717] dark:shadow-[5px_5px_0px_#001722] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-5"
        >
          <div className="flex items-start gap-3.5 sm:gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-md bg-[#0B3026] dark:bg-[#001722] border-2 border-[#4CA7A1] flex items-center justify-center shrink-0 shadow-[3px_3px_0px_#001722]">
              <GraduationCap className="w-7 h-7 sm:w-8 sm:h-8 text-[#CEFEF1]" />
            </div>
            <div className="space-y-1.5 text-left">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#4CA7A1] text-[#001722] font-extrabold text-[10px] uppercase tracking-wider rounded border border-[#171717] dark:border-[#001722]">
                Pengampu &amp; Pembimbing Kajian
              </span>
              <h2 className="dars-section-title font-bold font-serif text-white">
                Mengenal Pengajar Dars with Osama
              </h2>
              <p className="text-xs text-[#FAF7F0]/90 dark:text-[#A6D6C9] max-w-2xl leading-relaxed">
                Pelajari latar belakang pendidikan, riwayat talaqqi, metode pengajaran kitab turats, serta fokus keilmuan pengajar di Dars with Osama.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px] text-[#CEFEF1] font-bold">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#4CA7A1]" />
                  <span>Kurikulum Berjenjang</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#4CA7A1]" />
                  <span>Berbasis Matan &amp; Kitab Ulama</span>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleGo('instructor-profile')}
            className="nb-btn nb-btn-gold px-4 py-2.5 text-xs shrink-0 self-stretch md:self-center"
          >
            <span>Lihat Profil Pengajar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* SECTION 6: BAGIAN PENUTUP */}
      <section className="max-w-4xl mx-auto px-3 sm:px-6 text-center">
        <div
          data-aos="fade-up"
          className="p-5 sm:p-6 bg-[#FAF7F0] dark:bg-[#1F5F63] border-2 border-[#171717] dark:border-[#4CA7A1] rounded-lg space-y-2.5 shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#001722]"
        >
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-[#123D32] dark:bg-[#001722] text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <p className="text-sm sm:text-base font-serif font-bold text-[#171717] dark:text-[#CEFEF1] leading-relaxed max-w-2xl mx-auto">
            “Semoga Dars with Osama menjadi salah satu jalan bagi kita untuk terus belajar, memperluas wawasan, dan memperoleh ilmu yang bermanfaat.”
          </p>
          <p className="text-xs text-[#123D32] dark:text-[#A6D6C9] font-bold">
            “Selamat membaca, selamat belajar, dan semoga Allah memberkahi setiap langkah kita dalam menuntut ilmu.”
          </p>
        </div>
      </section>
    </div>
  );
};
