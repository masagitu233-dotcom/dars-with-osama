import React, { useEffect, useRef } from 'react';
import {
  ArrowRight,
  Sparkles,
  BookOpen,
  Video,
  FileText,
  Award,
  GraduationCap
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Category, Course, Enrollment } from '../../types';
import { HeroSection } from './HeroSection';
import { CourseCard } from '../courses/CourseCard';
import { useSmoothScroll } from '../../context/SmoothScrollContext';

gsap.registerPlugin(ScrollTrigger);

interface HomeViewProps {
  categories: Category[];
  courses: Course[];
  enrollmentsMap: Record<string, Enrollment>;
  onSelectCourse: (course: Course) => void;
  onExplore: () => void;
  onSearch: (query: string) => void;
  onSelectCategory: (categoryId: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  categories,
  courses,
  enrollmentsMap,
  onSelectCourse,
  onExplore,
  onSearch,
  onSelectCategory
}) => {
  const { velocity } = useSmoothScroll();
  const rootRef = useRef<HTMLDivElement>(null);

  // Section & Element Refs
  const heroWrapperRef = useRef<HTMLDivElement>(null);
  const coursesSectionRef = useRef<HTMLDivElement>(null);
  const coursesHeadingRef = useRef<HTMLDivElement>(null);
  const coursesGridRef = useRef<HTMLDivElement>(null);

  const workflowSectionRef = useRef<HTMLDivElement>(null);
  const workflowHeadingRef = useRef<HTMLDivElement>(null);
  const workflowCardsRef = useRef<HTMLDivElement>(null);

  const featuresSectionRef = useRef<HTMLDivElement>(null);
  const featuresHeadingRef = useRef<HTMLDivElement>(null);
  const featuresGridRef = useRef<HTMLDivElement>(null);

  const ctaSectionRef = useRef<HTMLDivElement>(null);
  const ctaContentRef = useRef<HTMLDivElement>(null);

  // Velocity scroll effect on course cards container
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !coursesGridRef.current) return;

    const clampedVelocity = Math.max(-20, Math.min(20, velocity));
    const skewAmount = clampedVelocity * 0.025;

    gsap.to(coursesGridRef.current, {
      skewY: skewAmount,
      duration: 0.35,
      ease: 'power1.out',
      overwrite: 'auto'
    });
  }, [velocity]);

  // Main GSAP ScrollTrigger Animations Setup
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !rootRef.current) return;

    const isMobile = window.innerWidth < 768;

    const ctx = gsap.context(() => {
      // 1. SECTION 2 OVERLAP / STACKING WITH SCRUB OVER HERO
      if (coursesSectionRef.current) {
        gsap.fromTo(
          coursesSectionRef.current,
          { y: isMobile ? 30 : 65 },
          {
            y: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: coursesSectionRef.current,
              start: 'top 98%',
              end: 'top 70%',
              scrub: 1,
            }
          }
        );
      }

      // 2. HEADING 1: COURSES SECTION HEADING (fade + slide-up)
      if (coursesHeadingRef.current && coursesSectionRef.current) {
        gsap.fromTo(
          coursesHeadingRef.current,
          { opacity: 0, y: isMobile ? 20 : 35 },
          {
            opacity: 1,
            y: 0,
            duration: 0.65,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: coursesSectionRef.current,
              start: 'top 85%',
              toggleActions: 'play none none reverse'
            }
          }
        );
      }

      // 3. COURSE CARDS: STAGGER + SCALE ON THUMBNAIL
      if (coursesGridRef.current) {
        const cardElements = coursesGridRef.current.querySelectorAll('.course-card');
        const thumbElements = coursesGridRef.current.querySelectorAll('.course-card-thumb');

        if (cardElements.length > 0) {
          gsap.fromTo(
            cardElements,
            { opacity: 0, y: isMobile ? 25 : 45, scale: 0.96 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.65,
              stagger: 0.12,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: coursesGridRef.current,
                start: 'top 85%',
                toggleActions: 'play none none reverse'
              }
            }
          );
        }

        if (thumbElements.length > 0) {
          gsap.fromTo(
            thumbElements,
            { scale: 1.14 },
            {
              scale: 1,
              duration: 0.85,
              stagger: 0.12,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: coursesGridRef.current,
                start: 'top 85%',
                toggleActions: 'play none none reverse'
              }
            }
          );
        }
      }

      // 4. WORKFLOW / MANHAJ SECTION: HEADING + STAGGERED STEP CARDS
      if (workflowSectionRef.current) {
        if (workflowHeadingRef.current) {
          gsap.fromTo(
            workflowHeadingRef.current,
            { opacity: 0, y: isMobile ? 20 : 35 },
            {
              opacity: 1,
              y: 0,
              duration: 0.65,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: workflowSectionRef.current,
                start: 'top 85%',
                toggleActions: 'play none none reverse'
              }
            }
          );
        }

        if (workflowCardsRef.current) {
          const stepCards = workflowCardsRef.current.children;
          gsap.fromTo(
            stepCards,
            { opacity: 0, y: isMobile ? 20 : 35, scale: 0.95 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.6,
              stagger: 0.1,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: workflowCardsRef.current,
                start: 'top 85%',
                toggleActions: 'play none none reverse'
              }
            }
          );
        }
      }

      // 5. FEATURES SECTION: HEADING + STAGGERED FEATURE CARDS
      if (featuresSectionRef.current) {
        if (featuresHeadingRef.current) {
          gsap.fromTo(
            featuresHeadingRef.current,
            { opacity: 0, y: isMobile ? 20 : 35 },
            {
              opacity: 1,
              y: 0,
              duration: 0.65,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: featuresSectionRef.current,
                start: 'top 85%',
                toggleActions: 'play none none reverse'
              }
            }
          );
        }

        if (featuresGridRef.current) {
          const featureItems = featuresGridRef.current.children;
          gsap.fromTo(
            featureItems,
            { opacity: 0, y: isMobile ? 20 : 35, scale: 0.96 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.65,
              stagger: 0.12,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: featuresGridRef.current,
                start: 'top 85%',
                toggleActions: 'play none none reverse'
              }
            }
          );
        }
      }

      // 6. CTA BANNER: FADE + SLIDE-UP
      if (ctaSectionRef.current && ctaContentRef.current) {
        gsap.fromTo(
          ctaContentRef.current,
          { opacity: 0, y: isMobile ? 25 : 40, scale: 0.97 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.7,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: ctaSectionRef.current,
              start: 'top 85%',
              toggleActions: 'play none none reverse'
            }
          }
        );
      }
    }, rootRef);

    // Refresh ScrollTrigger after DOM has settled and courses are rendered
    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 120);

    return () => {
      clearTimeout(refreshTimer);
      ctx.revert();
    };
  }, [courses]);

  return (
    <div ref={rootRef} className="space-y-14 sm:space-y-20 pb-20 overflow-x-hidden">
      {/* SECTION 1: HERO SECTION */}
      <div ref={heroWrapperRef} className="relative z-0">
        <HeroSection
          categories={categories}
          onSearch={onSearch}
          onSelectCategory={onSelectCategory}
          onExplore={onExplore}
        />
      </div>

      {/* SECTION 2: DAFTAR KURSUS POPULER (OVERLAPPING & STACKING SECTION) */}
      <section
        ref={coursesSectionRef}
        className="relative z-10 -mt-12 sm:-mt-20 lg:-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 will-change-transform"
      >
        <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-200/80 dark:border-stone-800/80 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 shadow-xl dark:shadow-2xl space-y-8 transition-colors duration-250">
          <div
            ref={coursesHeadingRef}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 will-change-transform"
          >
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                <span>Kurikulum Pilihan</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white font-sans">
                Kajian & Syarah Matan Populer
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
                Mulai belajar sekarang tanpa login untuk menyimak rekaman video dan membaca naskah materi.
              </p>
            </div>

            <button
              onClick={() => {
                onSelectCategory('all');
                onSearch('');
                onExplore();
              }}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer self-start sm:self-auto"
            >
              <span>Lihat Seluruh Katalog</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div
            ref={coursesGridRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 will-change-transform"
          >
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

      {/* SECTION 3: MANHAJ PEMBELAJARAN */}
      <section
        ref={workflowSectionRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="bg-gradient-to-br from-white via-stone-50 to-emerald-50/40 dark:from-stone-900 dark:via-stone-900 dark:to-stone-950 border border-stone-200 dark:border-stone-800 rounded-3xl p-8 sm:p-12 space-y-8 shadow-sm dark:shadow-2xl relative overflow-hidden group transition-colors duration-250">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none animate-pulse-glow" />

          <div ref={workflowHeadingRef} className="max-w-3xl space-y-3 relative will-change-transform">
            <span className="px-3 py-1 bg-amber-100 dark:bg-amber-500/10 border border-amber-300/80 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-semibold rounded-full inline-block">
              Manhaj Pembelajaran
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-stone-900 dark:text-white font-sans">
              Bagaimana Sistem Pembelajaran Berjalan?
            </h2>
            <p className="text-stone-600 dark:text-stone-300 text-sm sm:text-base leading-relaxed">
              Dirancang mengadopsi kemudahan dan ketertiban sistem daurah ma'had ilmi terstruktur:
            </p>
          </div>

          <div
            ref={workflowCardsRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 relative will-change-transform"
          >
            <div className="p-5 bg-white dark:bg-stone-950/70 hover:bg-stone-50 dark:hover:bg-stone-950/90 border border-stone-200 dark:border-stone-800/80 hover:border-emerald-600/40 rounded-2xl space-y-3 transition-all duration-300 hover:-translate-y-1 shadow-xs hover:shadow-md dark:shadow-none group/step cursor-default">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 group-hover/step:bg-emerald-200 dark:group-hover/step:bg-emerald-800/80 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-bold text-base transition-colors">
                1
              </div>
              <h3 className="font-bold text-stone-900 dark:text-white text-base group-hover/step:text-emerald-700 dark:group-hover/step:text-emerald-300 transition-colors">
                Akses Bebas Pengunjung
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Siapa saja dapat membuka katalog, menonton rekaman video kajian, dan mengunduh PDF matan tanpa kewajiban mendaftar.
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-stone-950/70 hover:bg-stone-50 dark:hover:bg-stone-950/90 border border-stone-200 dark:border-stone-800/80 hover:border-emerald-600/40 rounded-2xl space-y-3 transition-all duration-300 hover:-translate-y-1 shadow-xs hover:shadow-md dark:shadow-none group/step cursor-default">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 group-hover/step:bg-emerald-200 dark:group-hover/step:bg-emerald-800/80 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-bold text-base transition-colors">
                2
              </div>
              <h3 className="font-bold text-stone-900 dark:text-white text-base group-hover/step:text-emerald-700 dark:group-hover/step:text-emerald-300 transition-colors">
                Daftar Akun Peserta
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Ketika ingin mencatat riwayat progres selesai dan mengerjakan kuis evaluasi, masuklah dengan akun Anda.
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-stone-950/70 hover:bg-stone-50 dark:hover:bg-stone-950/90 border border-stone-200 dark:border-stone-800/80 hover:border-emerald-600/40 rounded-2xl space-y-3 transition-all duration-300 hover:-translate-y-1 shadow-xs hover:shadow-md dark:shadow-none group/step cursor-default">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 group-hover/step:bg-emerald-200 dark:group-hover/step:bg-emerald-800/80 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-bold text-base transition-colors">
                3
              </div>
              <h3 className="font-bold text-stone-900 dark:text-white text-base group-hover/step:text-emerald-700 dark:group-hover/step:text-emerald-300 transition-colors">
                Evaluasi Kuis Otomatis
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Sistem mengoreksi jawaban secara akurat di Cloud Firestore dan memberikan pembahasan serta batas waktu pengerjaan.
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-stone-950/70 hover:bg-stone-50 dark:hover:bg-stone-950/90 border border-stone-200 dark:border-stone-800/80 hover:border-emerald-600/40 rounded-2xl space-y-3 transition-all duration-300 hover:-translate-y-1 shadow-xs hover:shadow-md dark:shadow-none group/step cursor-default">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 group-hover/step:bg-emerald-200 dark:group-hover/step:bg-emerald-800/80 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-bold text-base transition-colors">
                4
              </div>
              <h3 className="font-bold text-stone-900 dark:text-white text-base group-hover/step:text-emerald-700 dark:group-hover/step:text-emerald-300 transition-colors">
                Pencatatan Progres Mandiri
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Pantau kemajuan pemahaman syarah matan dan riwayat skor evaluasi Anda secara mandiri kapan saja.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: FITUR PEMBELAJARAN & FITUR PLATFORM */}
      <section
        ref={featuresSectionRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8"
      >
        <div ref={featuresHeadingRef} className="text-center space-y-2 max-w-2xl mx-auto will-change-transform">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Fasilitas & Fitur Unggulan
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white font-sans">
            Pengalaman Belajar Syar'i Modern & Premium
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
            Setiap komponen dibuat untuk membantu Anda menguasai ilmu agama dengan mudah, nyaman, dan terukur.
          </p>
        </div>

        <div ref={featuresGridRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 will-change-transform">
          <div className="feature-item p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-4 hover:border-emerald-600/40 transition-all duration-300 hover:-translate-y-1 shadow-xs hover:shadow-md dark:shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300/80 dark:border-emerald-800/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-white">Video Rekaman Pembahasan</h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Setiap materi dilengkapi rekaman video penjelasan per bab yang terhubung langsung dengan YouTube tanpa iklan pengganggu.
            </p>
          </div>

          <div className="feature-item p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-4 hover:border-amber-600/40 transition-all duration-300 hover:-translate-y-1 shadow-xs hover:shadow-md dark:shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 border border-amber-300/80 dark:border-amber-800/60 flex items-center justify-center text-amber-700 dark:text-amber-400">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-white">Modul & Naskah Kitab PDF</h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Unduh dan baca PDF naskah asli bahasa Arab beserta terjemahan dan catatan syarah untuk memudahkan muqobalah.
            </p>
          </div>

          <div className="feature-item p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl space-y-4 hover:border-emerald-600/40 transition-all duration-300 hover:-translate-y-1 shadow-xs hover:shadow-md dark:shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300/80 dark:border-emerald-800/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-white">Kuis & Sertifikat Digital</h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Uji pemahaman Anda dengan kuis pilihan ganda otomatis dan terbitkan sertifikat digital kelulusan sebagai bukti ikhtiar.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 5: CTA / INVITE BANNER */}
      <section
        ref={ctaSectionRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-amber-950 border border-emerald-700/40 rounded-3xl p-8 sm:p-12 text-center shadow-2xl">
          <div ref={ctaContentRef} className="cta-content max-w-3xl mx-auto space-y-6 will-change-transform">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-900/60 border border-emerald-600/40 text-emerald-300 text-xs font-semibold">
              <GraduationCap className="w-4 h-4 text-amber-300" />
              <span>Mulai Langkah Ilmu Hari Ini</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-white font-sans leading-tight">
              Siap Memulai Kajian Terstruktur Matan-Matan Ilmiah?
            </h2>

            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-xl mx-auto">
              Seluruh materi, naskah PDF, dan video terbuka secara gratis. Pilih kitab yang ingin disimak dan mulai perjalanan tholabul 'ilmi Anda sekarang.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button
                onClick={() => {
                  onSelectCategory('all');
                  onSearch('');
                  onExplore();
                }}
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer"
              >
                <span>Jelajahi Katalog Kitab</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
