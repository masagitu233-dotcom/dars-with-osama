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

      {/* SECTION 2: DAFTAR KURSUS POPULER (INTERACTIVE CATALOG) */}
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
