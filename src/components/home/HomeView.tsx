import React, { useEffect, useRef } from 'react';
import {
  ArrowRight,
  Sparkles,
  BookOpen,
  Video,
  FileText,
  Award,
  GraduationCap,
  BookMarked,
  UserCheck,
  Compass,
  CheckCircle2,
  LogIn,
  HeartHandshake
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Category, Course, Enrollment } from '../../types';
import { HeroSection } from './HeroSection';
import { CourseCard } from '../courses/CourseCard';
import { useSmoothScroll } from '../../context/SmoothScrollContext';
import { useAuth } from '../../context/AuthContext';

gsap.registerPlugin(ScrollTrigger);

interface HomeViewProps {
  categories: Category[];
  courses: Course[];
  enrollmentsMap: Record<string, Enrollment>;
  onSelectCourse: (course: Course) => void;
  onExplore: () => void;
  onSearch: (query: string) => void;
  onSelectCategory: (categoryId: string) => void;
  onNavigate?: (view: string) => void;
  onOpenAuthModal?: (tab: 'login' | 'register') => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  categories,
  courses,
  enrollmentsMap,
  onSelectCourse,
  onExplore,
  onSearch,
  onSelectCategory,
  onNavigate,
  onOpenAuthModal
}) => {
  const { user } = useAuth();
  const { velocity } = useSmoothScroll();
  const rootRef = useRef<HTMLDivElement>(null);

  // Section & Element Refs
  const heroWrapperRef = useRef<HTMLDivElement>(null);
  const introGuideRef = useRef<HTMLDivElement>(null);
  const coursesSectionRef = useRef<HTMLDivElement>(null);
  const userGuidesRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef<HTMLDivElement>(null);

  // Helper for navigation
  const handleGo = (view: string) => {
    if (onNavigate) {
      onNavigate(view);
    } else {
      onExplore();
    }
  };

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !rootRef.current) return;

    const isMobile = window.innerWidth < 768;

    const ctx = gsap.context(() => {
      // Intro Guide Section
      if (introGuideRef.current) {
        gsap.fromTo(
          introGuideRef.current,
          { opacity: 0, y: isMobile ? 25 : 45 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: introGuideRef.current,
              start: 'top 85%',
              toggleActions: 'play none none reverse'
            }
          }
        );
      }

      // User Guides Section
      if (userGuidesRef.current) {
        gsap.fromTo(
          userGuidesRef.current,
          { opacity: 0, y: isMobile ? 25 : 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: userGuidesRef.current,
              start: 'top 85%',
              toggleActions: 'play none none reverse'
            }
          }
        );
      }
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="space-y-12 sm:space-y-16 pb-16 overflow-x-hidden">
      
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

      {/* SECTION 2: BAGIAN PENGENALAN WEBSITE ("Jelajahi Dars with Osama") */}
      <section ref={introGuideRef} className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-white/95 dark:bg-[#071B16]/95 backdrop-blur-md border border-[#073B2E]/10 dark:border-[#C9A34E]/25 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 shadow-lg space-y-8 transition-colors">
          
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0EA5A4] dark:text-[#C9A34E] flex items-center justify-center gap-1.5">
              <Compass className="w-4 h-4 text-[#F4B942]" />
              <span>Panduan Fitur Website</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#073B2E] dark:text-[#F7F6EF] font-serif-brand">
              Jelajahi Dars with Osama
            </h2>
            <p className="text-xs sm:text-sm text-[#6B7C7A] dark:text-[#8C9E9B] leading-relaxed font-sans">
              “Temukan berbagai sumber belajar yang dirancang untuk menemani perjalanan Anda dalam membaca, memahami, dan memperdalam ilmu. Pilih bagian yang sesuai dengan kebutuhan Anda dan lanjutkan perjalanan belajar dengan mudah.”
            </p>
          </div>

          {/* 4 Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            
            {/* Card A: Blog & Artikel */}
            <div className="p-5 bg-[#F7F6EF]/60 dark:bg-[#0c2b23] hover:bg-white dark:hover:bg-[#143e33] border border-[#073B2E]/10 dark:border-[#143e33] hover:border-[#C9A34E]/50 rounded-2xl flex flex-col justify-between space-y-4 transition-all duration-300 hover:-translate-y-1 shadow-xs group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#073B2E]/10 dark:bg-[#C9A34E]/20 text-[#073B2E] dark:text-[#F4B942] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[#073B2E] dark:text-[#F7F6EF] text-base font-serif-brand">
                  Blog & Artikel
                </h3>
                <p className="text-xs text-[#6B7C7A] dark:text-[#8C9E9B] leading-relaxed">
                  “Baca tulisan, artikel, dan berbagai bahan bacaan untuk menambah wawasan dan memperluas pemahaman.”
                </p>
              </div>

              <button
                onClick={() => handleGo('blog')}
                className="w-full py-2.5 px-3 bg-[#073B2E] hover:bg-[#0a4d3c] text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>Baca Artikel</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#F4B942]" />
              </button>
            </div>

            {/* Card B: Materi Pembelajaran */}
            <div className="p-5 bg-[#F7F6EF]/60 dark:bg-[#0c2b23] hover:bg-white dark:hover:bg-[#143e33] border border-[#073B2E]/10 dark:border-[#143e33] hover:border-[#C9A34E]/50 rounded-2xl flex flex-col justify-between space-y-4 transition-all duration-300 hover:-translate-y-1 shadow-xs group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#C9A34E]/20 text-[#C9A34E] flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[#073B2E] dark:text-[#F7F6EF] text-base font-serif-brand">
                  Materi Pembelajaran
                </h3>
                <p className="text-xs text-[#6B7C7A] dark:text-[#8C9E9B] leading-relaxed">
                  “Pelajari materi secara terstruktur dan lanjutkan pembelajaran sesuai dengan akses yang tersedia bagi Anda.”
                </p>
              </div>

              <button
                onClick={() => handleGo('courses')}
                className="w-full py-2.5 px-3 bg-[#073B2E] hover:bg-[#0a4d3c] text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>Jelajahi Materi</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#F4B942]" />
              </button>
            </div>

            {/* Card C: Video & PDF */}
            <div className="p-5 bg-[#F7F6EF]/60 dark:bg-[#0c2b23] hover:bg-white dark:hover:bg-[#143e33] border border-[#073B2E]/10 dark:border-[#143e33] hover:border-[#C9A34E]/50 rounded-2xl flex flex-col justify-between space-y-4 transition-all duration-300 hover:-translate-y-1 shadow-xs group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#073B2E]/10 dark:bg-[#C9A34E]/20 text-[#073B2E] dark:text-[#F4B942] flex items-center justify-center">
                  <Video className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[#073B2E] dark:text-[#F7F6EF] text-base font-serif-brand">
                  Video & PDF
                </h3>
                <p className="text-xs text-[#6B7C7A] dark:text-[#8C9E9B] leading-relaxed">
                  “Akses video pembelajaran dan dokumen pendukung yang tersedia untuk membantu proses belajar.”
                </p>
              </div>

              <button
                onClick={() => handleGo('courses')}
                className="w-full py-2.5 px-3 bg-[#073B2E] hover:bg-[#0a4d3c] text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>Lihat Materi</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#F4B942]" />
              </button>
            </div>

            {/* Card D: Kuis & Evaluasi */}
            <div className="p-5 bg-[#F7F6EF]/60 dark:bg-[#0c2b23] hover:bg-white dark:hover:bg-[#143e33] border border-[#073B2E]/10 dark:border-[#143e33] hover:border-[#C9A34E]/50 rounded-2xl flex flex-col justify-between space-y-4 transition-all duration-300 hover:-translate-y-1 shadow-xs group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#C9A34E]/20 text-[#C9A34E] flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[#073B2E] dark:text-[#F7F6EF] text-base font-serif-brand">
                  Kuis & Evaluasi
                </h3>
                <p className="text-xs text-[#6B7C7A] dark:text-[#8C9E9B] leading-relaxed">
                  “Uji pemahaman Anda melalui kuis atau evaluasi yang tersedia sesuai dengan materi pembelajaran.”
                </p>
              </div>

              <button
                onClick={() => handleGo(user ? 'student-dashboard' : 'courses')}
                className="w-full py-2.5 px-3 bg-[#073B2E] hover:bg-[#0a4d3c] text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>Mulai Evaluasi</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#F4B942]" />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 3: DAFTAR KURSUS POPULER (INTERACTIVE CATALOG) */}
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
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#073B2E] dark:text-[#C9A34E] hover:text-[#0a4d3c] dark:hover:text-[#e5c778] transition cursor-pointer"
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

      {/* SECTION 4: BAGIAN KHUSUS PENGUNJUNG DAN SISWA */}
      <section ref={userGuidesRef} className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card untuk Pengunjung */}
          <div className="p-6 sm:p-8 bg-gradient-to-br from-white to-[#F7F6EF] dark:from-[#0c2b23] dark:to-[#071B16] border border-[#073B2E]/15 dark:border-[#C9A34E]/30 rounded-2xl sm:rounded-3xl shadow-md space-y-4 text-left flex flex-col justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#073B2E]/10 dark:bg-[#C9A34E]/20 text-[#073B2E] dark:text-[#F4B942] rounded-full text-xs font-semibold">
                <Compass className="w-3.5 h-3.5" />
                <span>Untuk Pengunjung Umum</span>
              </div>
              <h3 className="text-xl font-bold font-serif-brand text-[#073B2E] dark:text-[#F7F6EF]">
                “Mulai dari Rasa Ingin Tahu”
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7C7A] dark:text-[#8C9E9B] leading-relaxed">
                “Jelajahi artikel dan sumber bacaan yang tersedia secara terbuka. Temukan topik yang menarik bagi Anda dan mulailah perjalanan belajar dari sana.”
              </p>
            </div>

            <button
              onClick={() => handleGo('blog')}
              className="w-full sm:w-auto self-start px-5 py-2.5 bg-[#073B2E] hover:bg-[#0a4d3c] active:scale-95 text-white text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 border border-[#C9A34E]/30 shadow"
            >
              <span>Jelajahi Website</span>
              <ArrowRight className="w-4 h-4 text-[#F4B942]" />
            </button>
          </div>

          {/* Card untuk Siswa / Peserta */}
          <div className="p-6 sm:p-8 bg-gradient-to-br from-white to-[#F7F6EF] dark:from-[#0c2b23] dark:to-[#071B16] border border-[#073B2E]/15 dark:border-[#C9A34E]/30 rounded-2xl sm:rounded-3xl shadow-md space-y-4 text-left flex flex-col justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#C9A34E]/20 text-[#073B2E] dark:text-[#F4B942] rounded-full text-xs font-semibold">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Untuk Siswa & Peserta</span>
              </div>
              <h3 className="text-xl font-bold font-serif-brand text-[#073B2E] dark:text-[#F7F6EF]">
                “Lanjutkan Perjalanan Belajar”
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7C7A] dark:text-[#8C9E9B] leading-relaxed">
                “Masuk ke akun Anda untuk mengakses materi dan aktivitas pembelajaran yang memang tersedia bagi siswa.”
              </p>
            </div>

            <button
              onClick={() => {
                if (user) {
                  handleGo('student-dashboard');
                } else if (onOpenAuthModal) {
                  onOpenAuthModal('login');
                } else {
                  handleGo('courses');
                }
              }}
              className="w-full sm:w-auto self-start px-5 py-2.5 bg-[#123B6D] hover:bg-[#0EA5A4] active:scale-95 text-white text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 border border-[#C9A34E]/30 shadow"
            >
              {user ? (
                <>
                  <UserCheck className="w-4 h-4 text-[#F4B942]" />
                  <span>Buka Dashboard Saya</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-[#F4B942]" />
                  <span>Masuk dan Belajar</span>
                </>
              )}
            </button>
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
