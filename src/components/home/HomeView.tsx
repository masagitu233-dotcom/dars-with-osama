import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  Sparkles,
  BookMarked,
  Clock,
  Calendar,
  HeartHandshake,
  MessageSquare,
  Lock,
  Send,
  HelpCircle,
  GraduationCap,
  CheckCircle2
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Category, Course, Enrollment, BlogPost, Consultation } from '../../types';
import { HeroSection } from './HeroSection';
import { CourseCard } from '../courses/CourseCard';
import { useSmoothScroll } from '../../context/SmoothScrollContext';
import { useAuth } from '../../context/AuthContext';
import { getPublishedPublicQA } from '../../firebase/services';
import { classifyFirestoreError } from '../../firebase/config';
import { canAttemptRetry, DEFAULT_RETRY_COOLDOWN_SECONDS } from '../../utils/serviceDisruptionHelper';
import AOS from 'aos';

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
      className="nb-card-interactive p-5 flex flex-col justify-between group cursor-pointer text-left space-y-4 h-full"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="nb-badge bg-[#123D32] text-[#D6AD52]">
            Tanya Jawab Syar'i
          </span>
          <span className="text-[11px] font-bold text-[#626A66] dark:text-[#B4C0D0]">
            {item.publishedAt
              ? new Date(item.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'Terbit'}
          </span>
        </div>

        <h3 className="font-serif font-bold text-base text-[#292D2B] dark:text-[#F1F4F8] line-clamp-2 leading-snug group-hover:text-[#123D32] dark:group-hover:text-[#D6AD52] transition-colors">
          {item.title}
        </h3>

        <p className="text-xs text-[#292D2B]/85 dark:text-[#F1F4F8]/85 line-clamp-2 leading-relaxed">
          <strong className="font-bold text-[#123D32] dark:text-[#D6AD52]">Pertanyaan: </strong>
          {shortQuestion}
        </p>

        {shortAnswer && (
          <div className="p-2.5 sm:p-3 rounded-md bg-[#FAF7F0] dark:bg-[#16263D] border-0 sm:border-2 border-l-2 sm:border-l-2 border-l-[#D6AD52] sm:border-[#292D2B] dark:border-[#34465D] text-xs text-[#292D2B] dark:text-[#F1F4F8] leading-relaxed line-clamp-2">
            <strong className="font-bold text-[#123D32] dark:text-[#D6AD52]">Jawaban Ustaz: </strong>
            {shortAnswer}
          </div>
        )}
      </div>

      <div className="pt-3 border-t-2 border-[#292D2B]/15 dark:border-[#34465D] flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1.5 font-extrabold text-[#123D32] dark:text-[#D6AD52]">
          <span>Baca Jawaban Lengkap</span>
          {!user ? (
            <Lock className="w-3.5 h-3.5 text-[#D6AD52] ml-1" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          )}
        </span>
        {!user && (
          <span className="text-[10px] font-bold text-[#123D32] bg-[#D6AD52] px-2 py-0.5 rounded border border-[#292D2B]">
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
      className="nb-card-interactive overflow-hidden flex flex-col justify-between group cursor-pointer h-full"
    >
      <div>
        <div className="relative aspect-video w-full overflow-hidden bg-[#123D32] dark:bg-[#16263D] border-b-2 border-[#292D2B] dark:border-[#34465D]">
          <img
            src={displayImg}
            alt={post.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
            loading="lazy"
          />
          {post.category && (
            <span className="absolute top-3 left-3 px-2.5 py-1 bg-[#D6AD52] text-[#123D32] font-extrabold text-[10px] uppercase tracking-wider rounded border-2 border-[#292D2B] shadow-[2px_2px_0px_#292D2B]">
              {post.category}
            </span>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-2.5 text-left">
          <div className="flex items-center gap-3 text-[11px] text-[#626A66] dark:text-[#B4C0D0] font-bold">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#123D32] dark:text-[#D6AD52]" />
              <span>{formattedDate}</span>
            </span>
            {post.readingTimeMinutes > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#237A70] dark:text-[#A9C5E8]" />
                <span>{post.readingTimeMinutes} mnt baca</span>
              </span>
            )}
          </div>

          <h3 className="font-serif font-bold text-base sm:text-lg text-[#292D2B] dark:text-[#F1F4F8] line-clamp-2 group-hover:text-[#123D32] dark:group-hover:text-[#D6AD52] transition-colors leading-snug">
            {post.title}
          </h3>

          <p className="text-xs text-[#626A66] dark:text-[#B4C0D0] line-clamp-2 leading-relaxed">
            {post.excerpt}
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-5 pb-4 pt-2 border-t-2 border-[#292D2B]/10 dark:border-[#34465D] text-left flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#123D32] dark:text-[#D6AD52]">
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
          AOS.refreshHard();
        }, 120);
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

      {/* SECTION 2: KATALOG KURSUS UNGGULAN */}
      <section
        ref={coursesSectionRef}
        className="max-w-6xl mx-auto px-4 sm:px-6"
      >
        <div className="nb-card p-5 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-[#292D2B] dark:border-[#34465D] pb-4">
            <div className="space-y-1">
              <span className="nb-badge bg-[#D6AD52] text-[#123D32]">
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                <span>Kurikulum Pilihan</span>
              </span>
              <h2 className="text-xl sm:text-3xl font-bold text-[#292D2B] dark:text-[#F1F4F8] font-serif pt-1">
                Katalog Kursus & Syarah Matan Unggulan
              </h2>
              <p className="text-xs sm:text-sm text-[#626A66] dark:text-[#B4C0D0]">
                Mulai belajar sekarang secara gratis untuk menyimak rekaman video, membaca naskah materi, dan mengerjakan evaluasi.
              </p>
            </div>

            <button
              onClick={() => handleGo('courses')}
              className="nb-btn nb-btn-primary px-4 py-2.5 text-xs self-start sm:self-auto shrink-0"
            >
              <span>Lihat Seluruh Katalog</span>
              <ArrowRight className="w-4 h-4 text-[#D6AD52]" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {courses.slice(0, 4).map((course) => (
              <div key={course.id} className="h-full">
                <CourseCard
                  course={course}
                  category={categories.find((c) => c.id === course.categoryId)}
                  enrollment={enrollmentsMap[course.id] || null}
                  onSelect={onSelectCourse}
                  disableAnimation={true}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: ARTIKEL TERBARU */}
      <section
        ref={articlesSectionRef}
        className="max-w-6xl mx-auto px-4 sm:px-6"
      >
        <div className="nb-card p-5 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-[#292D2B] dark:border-[#34465D] pb-4">
            <div className="space-y-1">
              <span className="nb-badge bg-[#123D32] text-[#D6AD52]">
                <BookMarked className="w-3.5 h-3.5 mr-1" />
                <span>Naskah & Faedah Keilmuan</span>
              </span>
              <h2 className="text-xl sm:text-3xl font-bold text-[#292D2B] dark:text-[#F1F4F8] font-serif pt-1">
                Artikel & Catatan Ilmiah Terbaru
              </h2>
              <p className="text-xs sm:text-sm text-[#626A66] dark:text-[#B4C0D0]">
                Baca tulisan, faedah kajian, dan catatan ilmiyyah terbaru untuk menambah wawasan dan pemahaman.
              </p>
            </div>

            <button
              onClick={() => handleGo('blog')}
              className="nb-btn nb-btn-secondary px-4 py-2.5 text-xs self-start sm:self-auto shrink-0"
            >
              <span>Lihat Semua Artikel</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {publishedArticles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {publishedArticles.slice(0, 3).map((article) => (
                <div key={article.id} className="h-full">
                  <HomeArticleCard
                    post={article}
                    onSelect={(post) => {
                      if (onSelectBlogPost) {
                        onSelectBlogPost(post);
                      } else {
                        handleGo('blog');
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-[#FAF7F0] dark:bg-[#16263D] border-2 border-dashed border-[#292D2B] dark:border-[#34465D] rounded-md space-y-3">
              <BookMarked className="w-8 h-8 text-[#123D32] dark:text-[#D6AD52] mx-auto" />
              <h4 className="text-sm font-bold text-[#292D2B] dark:text-[#F1F4F8] font-serif">
                Belum Ada Artikel Dipublikasikan
              </h4>
              <p className="text-xs text-[#626A66] dark:text-[#B4C0D0] max-w-sm mx-auto">
                Artikel ilmiah dan catatan keilmuan terbaru sedang disiapkan. Anda dapat menjelajahi materi kitab interaktif di atas.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 4: TANYA JAWAB PILIHAN */}
      <section
        ref={qaSectionRef}
        className="max-w-6xl mx-auto px-4 sm:px-6"
      >
        <div className="nb-card p-5 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-[#292D2B] dark:border-[#34465D] pb-4">
            <div className="space-y-1">
              <span className="nb-badge bg-[#237A70] text-white">
                <MessageSquare className="w-3.5 h-3.5 mr-1" />
                <span>Bimbingan & Konsultasi Syar'i</span>
              </span>
              <h2 className="text-xl sm:text-3xl font-bold text-[#292D2B] dark:text-[#F1F4F8] font-serif pt-1">
                Tanya Jawab Pilihan
              </h2>
              <p className="text-xs sm:text-sm text-[#626A66] dark:text-[#B4C0D0]">
                Arsip pertanyaan & jawaban materi pembelajaran pilihan yang telah dijawab oleh Ustaz & Pembimbing.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
              <button
                onClick={handleAskQuestion}
                className="nb-btn nb-btn-gold px-4 py-2.5 text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ajukan Pertanyaan</span>
              </button>

              <button
                onClick={() => handleGo('public-qa')}
                className="nb-btn nb-btn-secondary px-4 py-2.5 text-xs"
              >
                <span>Semua Tanya Jawab</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {publishedQA.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {publishedQA.slice(0, 3).map((item) => (
                <div key={item.id} className="h-full">
                  <HomeQACard
                    item={item}
                    onReadMore={() => handleReadQA(item.id)}
                  />
                </div>
              ))}
            </div>
          ) : qaError ? (
            <div className="p-8 text-center bg-[#D6AD52]/15 border-2 border-[#292D2B] dark:border-[#34465D] rounded-md space-y-3">
              <HelpCircle className="w-8 h-8 text-[#123D32] dark:text-[#D6AD52] mx-auto" />
              <h4 className="text-sm font-bold text-[#292D2B] dark:text-[#F1F4F8] font-serif">
                Sinkronisasi Tanya Jawab Terkendala ({qaError.category === 'resource-exhausted' ? 'Batas Kuota Firestore' : 'Jaringan'})
              </h4>
              <p className="text-xs text-[#626A66] dark:text-[#B4C0D0] max-w-sm mx-auto leading-relaxed">
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
            <div className="p-8 text-center bg-[#FAF7F0] dark:bg-[#16263D] border-2 border-dashed border-[#292D2B] dark:border-[#34465D] rounded-md space-y-3">
              <HelpCircle className="w-8 h-8 text-[#123D32] dark:text-[#D6AD52] mx-auto" />
              <h4 className="text-sm font-bold text-[#292D2B] dark:text-[#F1F4F8] font-serif">
                Belum Ada Tanya Jawab Dipublikasikan
              </h4>
              <p className="text-xs text-[#626A66] dark:text-[#B4C0D0] max-w-sm mx-auto leading-relaxed">
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
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-[#123D32] dark:bg-[#16263D] text-[#FAF7F0] dark:text-[#F1F4F8] border-2 border-[#292D2B] dark:border-[#34465D] rounded-lg p-6 sm:p-8 shadow-[6px_6px_0px_#292D2B] dark:shadow-[6px_6px_0px_#101B2D] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-md bg-[#0B3026] dark:bg-[#243A56] border-2 border-[#D6AD52] flex items-center justify-center shrink-0 shadow-[4px_4px_0px_#101B2D]">
              <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10 text-[#D6AD52]" />
            </div>
            <div className="space-y-2 text-left">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#D6AD52] text-[#123D32] font-extrabold text-[10px] uppercase tracking-wider rounded border border-[#292D2B]">
                Pengampu & Pembimbing Kajian
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-serif text-white">
                Mengenal Pengajar Dars with Osama
              </h2>
              <p className="text-xs sm:text-sm text-[#FAF7F0]/85 dark:text-[#B4C0D0] max-w-2xl leading-relaxed">
                Pelajari latar belakang pendidikan, riwayat talaqqi, metode pengajaran kitab turats, serta fokus keilmuan pengajar di Dars with Osama.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-[#D6AD52] font-bold">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Kurikulum Berjenjang</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Berbasis Matan & Kitab Ulama</span>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleGo('instructor-profile')}
            className="nb-btn nb-btn-gold px-5 py-3 text-xs sm:text-sm shrink-0 self-stretch md:self-center"
          >
            <span>Lihat Profil Pengajar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* SECTION 6: BAGIAN PENUTUP */}
      <section
        ref={closingRef}
        className="max-w-4xl mx-auto px-4 sm:px-6 text-center"
      >
        <div className="p-6 sm:p-8 bg-[#FAF7F0] dark:bg-[#16263D] border-2 border-[#292D2B] dark:border-[#34465D] rounded-lg space-y-3 shadow-[4px_4px_0px_#292D2B] dark:shadow-[4px_4px_0px_#101B2D]">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-[#123D32] dark:bg-[#243A56] text-[#D6AD52] border-2 border-[#292D2B] dark:border-[#34465D] mb-1 shadow-[2px_2px_0px_#292D2B] dark:shadow-[2px_2px_0px_#101B2D]">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <p className="text-sm sm:text-base md:text-lg font-serif font-bold text-[#292D2B] dark:text-[#F1F4F8] leading-relaxed max-w-2xl mx-auto">
            “Semoga Dars with Osama menjadi salah satu jalan bagi kita untuk terus belajar, memperluas wawasan, dan memperoleh ilmu yang bermanfaat.”
          </p>
          <p className="text-xs sm:text-sm text-[#123D32] dark:text-[#D6AD52] font-bold">
            “Selamat membaca, selamat belajar, dan semoga Allah memberkahi setiap langkah kita dalam menuntut ilmu.”
          </p>
        </div>
      </section>
    </div>
  );
};
