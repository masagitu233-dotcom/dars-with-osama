import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  Sparkles,
  BookOpen,
  Video,
  FileText,
  Award,
  BookMarked,
  Clock,
  Calendar,
  User,
  HeartHandshake,
  Image as ImageIcon,
  MessageSquare,
  Lock,
  ShieldCheck,
  Send,
  HelpCircle
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Category, Course, Enrollment, BlogPost, Consultation } from '../../types';
import { HeroSection } from './HeroSection';
import { CourseCard } from '../courses/CourseCard';
import { useSmoothScroll } from '../../context/SmoothScrollContext';
import { useAuth } from '../../context/AuthContext';
import { getPublishedPublicQA } from '../../firebase/services';

gsap.registerPlugin(ScrollTrigger);

interface HomeViewProps {
  categories: Category[];
  courses: Course[];
  blogPosts?: BlogPost[];
  enrollmentsMap: Record<string, Enrollment>;
  onSelectCourse: (course: Course) => void;
  onSelectBlogPost?: (post: BlogPost) => void;
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
}> = ({ item, onReadMore }) => {
  const { user } = useAuth();
  const plainAnswer = stripHtmlTags(item.replyContent || '');
  const shortAnswer = plainAnswer.length > 130 ? plainAnswer.slice(0, 130) + '...' : plainAnswer;
  const shortQuestion = item.content.length > 100 ? item.content.slice(0, 100) + '...' : item.content;

  return (
    <div
      onClick={onReadMore}
      className="bg-white dark:bg-[#0c2b23] hover:bg-white dark:hover:bg-[#143e33] border border-[#073B2E]/10 dark:border-[#143e33] hover:border-[#C9A34E]/50 rounded-2xl p-5 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group cursor-pointer text-left space-y-3"
    >
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#073B2E]/10 dark:bg-[#C9A34E]/20 text-[#073B2E] dark:text-[#F4B942] font-bold text-[10px] border border-[#C9A34E]/30">
            📖 Materi & Pembelajaran
          </span>
          <span className="text-[10px] text-[#6B7C7A] dark:text-[#8C9E9B] font-medium">
            {item.publishedAt
              ? new Date(item.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'Terbit'}
          </span>
        </div>

        <h3 className="font-serif-brand font-bold text-sm text-[#073B2E] dark:text-[#F7F6EF] line-clamp-2 leading-snug group-hover:text-[#0EA5A4] dark:group-hover:text-[#F4B942] transition-colors">
          {item.title}
        </h3>

        <p className="text-xs text-[#6B7C7A] dark:text-[#8C9E9B] line-clamp-2 leading-relaxed">
          <strong className="text-[#073B2E] dark:text-[#F7F6EF]">Pertanyaan: </strong>
          {shortQuestion}
        </p>

        {shortAnswer && (
          <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border-l-3 border-[#0EA5A4] dark:border-[#F4B942] text-xs text-[#073B2E] dark:text-[#F7F6EF] leading-relaxed font-sans line-clamp-2">
            <strong className="text-[#0EA5A4] dark:text-[#F4B942]">Jawaban Ustaz: </strong>
            {shortAnswer}
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-[#073B2E]/10 dark:border-[#143e33] flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 font-semibold text-[#073B2E] dark:text-[#C9A34E] group-hover:text-[#0EA5A4] dark:group-hover:text-[#F4B942] transition-colors">
          <span>Baca Jawaban Lengkap</span>
          {!user ? (
            <Lock className="w-3.5 h-3.5 text-[#C9A34E] ml-1" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          )}
        </span>
        {!user && (
          <span className="text-[10px] font-medium text-[#C9A34E] bg-[#C9A34E]/10 px-2 py-0.5 rounded-md border border-[#C9A34E]/30">
            Daftar / Login
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
}> = ({ post, onSelect }) => {
  const [imgError, setImgError] = useState(false);

  const fallbackImg = 'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=800&auto=format&fit=crop';
  const displayImg = !imgError && post.coverImageUrl ? post.coverImageUrl : fallbackImg;

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
      className="bg-white dark:bg-[#0c2b23] hover:bg-white dark:hover:bg-[#143e33] border border-[#073B2E]/10 dark:border-[#143e33] hover:border-[#C9A34E]/50 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group cursor-pointer"
    >
      <div>
        <div className="relative aspect-video w-full overflow-hidden bg-[#073B2E]/10 dark:bg-[#071B16]">
          <img
            src={displayImg}
            alt={post.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
          
          {post.category && (
            <span className="absolute top-3 left-3 px-2.5 py-1 bg-[#073B2E]/90 dark:bg-[#071B16]/90 text-[#F4B942] font-semibold text-[10px] rounded-lg border border-[#C9A34E]/40 shadow-xs backdrop-blur-xs">
              {post.category}
            </span>
          )}
        </div>

        <div className="p-4 space-y-2 text-left">
          <div className="flex items-center gap-3 text-[11px] text-[#6B7C7A] dark:text-[#8C9E9B] font-medium">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#C9A34E]" />
              <span>{formattedDate}</span>
            </span>
            {post.readingTimeMinutes > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#0EA5A4]" />
                <span>{post.readingTimeMinutes} mnt baca</span>
              </span>
            )}
          </div>

          <h3 className="font-serif-brand font-bold text-base text-[#073B2E] dark:text-[#F7F6EF] line-clamp-2 group-hover:text-[#0EA5A4] dark:group-hover:text-[#F4B942] transition-colors leading-snug">
            {post.title}
          </h3>

          <p className="text-xs text-[#6B7C7A] dark:text-[#8C9E9B] line-clamp-2 leading-relaxed">
            {post.excerpt}
          </p>
        </div>
      </div>

      <div className="p-4 pt-0 text-left">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#073B2E] dark:text-[#C9A34E] group-hover:text-[#0EA5A4] dark:group-hover:text-[#F4B942] transition-colors">
          <span>Baca Selengkapnya</span>
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
  enrollmentsMap,
  onSelectCourse,
  onSelectBlogPost,
  onExplore,
  onSearch,
  onSelectCategory,
  onNavigate,
  onOpenAuthModal
}) => {
  const { velocity } = useSmoothScroll();
  const { user, openAuthModal } = useAuth();
  const rootRef = useRef<HTMLDivElement>(null);

  // Section & Element Refs
  const heroWrapperRef = useRef<HTMLDivElement>(null);
  const coursesSectionRef = useRef<HTMLDivElement>(null);
  const articlesSectionRef = useRef<HTMLDivElement>(null);
  const qaSectionRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef<HTMLDivElement>(null);

  // Home Q&A state
  const [publishedQA, setPublishedQA] = useState<Consultation[]>([]);

  useEffect(() => {
    getPublishedPublicQA()
      .then((list) => setPublishedQA(list))
      .catch((err) => console.warn('Home Q&A load notice:', err));
  }, []);

  // Filter only published blog posts for public view
  const publishedArticles = React.useMemo(() => {
    return blogPosts.filter((p) => p.status === 'published');
  }, [blogPosts]);

  // Helper for navigation
  const handleGo = (view: string, qaId?: string) => {
    if (onNavigate) {
      onNavigate(view, qaId);
    } else {
      onExplore();
    }
  };

  const handleReadQA = (itemId: string) => {
    if (!user) {
      openAuthModal('login', {
        type: 'enroll',
        onSuccess: () => {
          handleGo('public-qa', itemId);
        }
      });
      return;
    }
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
    <div ref={rootRef} className="space-y-12 sm:space-y-16 pb-16 overflow-x-hidden font-sans">
      
      {/* SECTION 1: HERO & KATA SAMBUTAN */}
      <div ref={heroWrapperRef} className="relative z-0">
        <HeroSection
          categories={categories}
          onSearch={onSearch}
          onSelectCategory={onSelectCategory}
          onExplore={onExplore}
          onNavigate={onNavigate}
          onOpenAuthModal={onOpenAuthModal}
        />
      </div>

      {/* SECTION 2: ARTIKEL TERBARU (BLOG POST THUMBNAILS CARD GRID) */}
      <section ref={articlesSectionRef} className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-white/95 dark:bg-[#071B16]/95 backdrop-blur-md border border-[#073B2E]/10 dark:border-[#C9A34E]/20 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-lg space-y-5 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0EA5A4] dark:text-[#C9A34E] flex items-center gap-1.5">
                <BookMarked className="w-3.5 h-3.5 text-[#F4B942]" />
                <span>Naskah & Faedah Keilmuan</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#073B2E] dark:text-[#F7F6EF] font-serif-brand">
                Artikel Terbaru
              </h2>
              <p className="text-xs text-[#6B7C7A] dark:text-[#8C9E9B]">
                Baca tulisan, faedah kajian, dan catatan ilmiyyah terbaru untuk menambah wawasan dan pemahaman.
              </p>
            </div>

            <button
              onClick={() => handleGo('blog')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#073B2E] dark:text-[#C9A34E] hover:text-[#0a4d3c] dark:hover:text-[#e5c778] transition cursor-pointer self-start sm:self-auto"
            >
              <span>Lihat Semua Artikel</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#F4B942]" />
            </button>
          </div>

          {/* Published Articles Grid */}
          {publishedArticles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {publishedArticles.slice(0, 3).map((article) => (
                <HomeArticleCard
                  key={article.id}
                  post={article}
                  onSelect={(post) => {
                    if (onSelectBlogPost) {
                      onSelectBlogPost(post);
                    } else {
                      handleGo('blog');
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-[#F7F6EF]/60 dark:bg-[#0c2b23] border border-dashed border-[#073B2E]/20 dark:border-[#C9A34E]/30 rounded-2xl space-y-3">
              <BookMarked className="w-8 h-8 text-[#C9A34E] mx-auto opacity-70" />
              <h4 className="text-sm font-bold text-[#073B2E] dark:text-[#F7F6EF] font-serif-brand">
                Belum Ada Artikel Dipublikasikan
              </h4>
              <p className="text-xs text-[#6B7C7A] dark:text-[#8C9E9B] max-w-sm mx-auto">
                Artikel ilmiah dan catatan keilmuan terbaru sedang disiapkan. Anda dapat menjelajahi materi kitab interaktif di bawah.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 3: TANYA JAWAB & KONSULTASI PREVIEW */}
      <section ref={qaSectionRef} className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-white/95 dark:bg-[#071B16]/95 backdrop-blur-md border border-[#073B2E]/10 dark:border-[#C9A34E]/20 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-lg space-y-5 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#073B2E] dark:text-[#C9A34E] flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#F4B942]" />
                <span>Bimbingan & Konsultasi Syar'i</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#073B2E] dark:text-[#F7F6EF] font-serif-brand">
                Tanya Jawab & Konsultasi
              </h2>
              <p className="text-xs text-[#6B7C7A] dark:text-[#8C9E9B]">
                Arsip pertanyaan & jawaban materi pembelajaran pilihan yang telah diverifikasi oleh Ustaz & Pembimbing.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                onClick={handleAskQuestion}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#C9A34E] hover:bg-[#b08e40] text-[#073B2E] font-bold text-xs rounded-xl shadow-xs transition cursor-pointer active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ajukan Pertanyaan</span>
              </button>

              <button
                onClick={() => handleGo('public-qa')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#073B2E] dark:text-[#C9A34E] hover:text-[#0a4d3c] dark:hover:text-[#e5c778] transition cursor-pointer px-2 py-1"
              >
                <span>Lihat Semua Tanya Jawab</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#F4B942]" />
              </button>
            </div>
          </div>

          {/* Q&A Cards Grid */}
          {publishedQA.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {publishedQA.slice(0, 3).map((item) => (
                <HomeQACard
                  key={item.id}
                  item={item}
                  onReadMore={() => handleReadQA(item.id)}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-[#F7F6EF]/60 dark:bg-[#0c2b23] border border-dashed border-[#073B2E]/20 dark:border-[#C9A34E]/30 rounded-2xl space-y-3">
              <HelpCircle className="w-8 h-8 text-[#C9A34E] mx-auto opacity-70" />
              <h4 className="text-sm font-bold text-[#073B2E] dark:text-[#F7F6EF] font-serif-brand">
                Belum Ada Tanya Jawab Dipublikasikan
              </h4>
              <p className="text-xs text-[#6B7C7A] dark:text-[#8C9E9B] max-w-sm mx-auto leading-relaxed">
                Pertanyaan materi pembelajaran yang telah disetujui akan ditampilkan di sini. Anda dapat mengajukan pertanyaan baru melalui Ruang Konsultasi.
              </p>
              <button
                onClick={handleAskQuestion}
                className="mt-1 px-4 py-2 bg-[#073B2E] text-white text-xs font-bold rounded-xl hover:bg-[#0a4d3c] transition cursor-pointer"
              >
                Kirim Pertanyaan Pertama
              </button>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 4: DAFTAR KURSUS POPULER (INTERACTIVE CATALOG) */}
      <section
        ref={coursesSectionRef}
        className="max-w-6xl mx-auto px-4 sm:px-6"
      >
        <div className="bg-white/95 dark:bg-[#071B16]/95 backdrop-blur-md border border-[#073B2E]/10 dark:border-[#C9A34E]/20 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-lg space-y-5 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#073B2E] dark:text-[#C9A34E] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#F4B942]" />
                <span>Kurikulum Pilihan</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#073B2E] dark:text-[#F7F6EF] font-serif-brand">
                Kajian & Syarah Matan Populer
              </h2>
              <p className="text-xs text-[#6B7C7A] dark:text-[#8C9E9B]">
                Mulai belajar sekarang secara gratis untuk menyimak rekaman video dan membaca naskah materi.
              </p>
            </div>

            <button
              onClick={() => handleGo('courses')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#073B2E] dark:text-[#C9A34E] hover:text-[#0a4d3c] dark:hover:text-[#e5c778] transition cursor-pointer self-start sm:self-auto"
            >
              <span>Lihat Seluruh Katalog</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#F4B942]" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {courses.slice(0, 4).map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                category={categories.find((c) => c.id === course.categoryId)}
                enrollment={enrollmentsMap[course.id] || null}
                onSelect={onSelectCourse}
                disableAnimation={true}
              />
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: BAGIAN PENUTUP */}
      <section ref={closingRef} className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div className="p-6 sm:p-8 bg-[#073B2E]/5 dark:bg-[#071B16] border border-[#073B2E]/15 dark:border-[#C9A34E]/25 rounded-2xl sm:rounded-3xl space-y-3 shadow-xs">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#C9A34E]/20 text-[#F4B942] mb-1">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <p className="text-xs sm:text-sm md:text-base font-serif-brand font-bold text-[#073B2E] dark:text-[#F7F6EF] leading-relaxed max-w-2xl mx-auto">
            “Semoga Dars with Osama menjadi salah satu jalan bagi kita untuk terus belajar, memperluas wawasan, dan memperoleh ilmu yang bermanfaat.”
          </p>
          <p className="text-xs sm:text-sm text-[#0EA5A4] dark:text-[#C9A34E] font-medium italic">
            “Selamat membaca, selamat belajar, dan semoga Allah memberkahi setiap langkah kita dalam menuntut ilmu.”
          </p>
        </div>
      </section>

    </div>
  );
};
