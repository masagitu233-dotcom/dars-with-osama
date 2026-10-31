import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Filter, BookOpen } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Course, Category, Enrollment } from '../../types';
import { CourseCard } from './CourseCard';
import { useLanguage } from '../../context/LanguageContext';
import { ServiceDisruptionBanner } from '../common/ServiceDisruptionBanner';
import { MobileCarousel } from '../common/MobileCarousel';

gsap.registerPlugin(ScrollTrigger);

interface CourseCatalogProps {
  courses: Course[];
  categories: Category[];
  enrollments: Record<string, Enrollment>;
  selectedCategoryId?: string;
  searchQuery?: string;
  onSelectCourse: (course: Course) => void;
  onClearFilters?: () => void;
  loadError?: { category: string; summary: string; code: string } | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  lastAttemptTimestamp?: number;
}

export const CourseCatalog: React.FC<CourseCatalogProps> = ({
  courses,
  categories,
  enrollments,
  selectedCategoryId: initialCat = 'all',
  searchQuery: initialSearch = '',
  onSelectCourse,
  loadError = null,
  onRetry,
  isRetrying = false,
  lastAttemptTimestamp = 0
}) => {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string>(initialCat);
  const [activeLevel, setActiveLevel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>(initialSearch);

  const gridRef = useRef<HTMLDivElement>(null);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      if (activeCategory !== 'all' && course.categoryId !== activeCategory) {
        return false;
      }
      if (activeLevel !== 'all' && course.level !== activeLevel) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = course.title.toLowerCase().includes(query);
        const matchesTitleAr = course.titleAr?.toLowerCase().includes(query) || false;
        const matchesInstructor = course.instructor.toLowerCase().includes(query);
        const matchesDesc = course.description.toLowerCase().includes(query);
        if (!matchesTitle && !matchesTitleAr && !matchesInstructor && !matchesDesc) {
          return false;
        }
      }
      return true;
    });
  }, [courses, activeCategory, activeLevel, searchTerm]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach(c => map.set(c.id, c));
    return map;
  }, [categories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      import('aos').then(AOS => AOS.default.refreshHard());
    }, 50);
    return () => clearTimeout(timer);
  }, [filteredCourses]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
      {/* Catalog Header */}
      <div className="bg-[#123D32] dark:bg-[#1F5F63] text-[#FAF7F0] dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] rounded-lg p-5 sm:p-8 shadow-[4px_4px_0px_#171717] sm:shadow-[6px_6px_0px_#171717] dark:shadow-[4px_4px_0px_#001722] sm:dark:shadow-[6px_6px_0px_#001722] space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#4CA7A1] border-2 border-[#171717] dark:border-[#001722] text-[#001722] text-xs font-extrabold uppercase tracking-wider">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Katalog Materi & Kurikulum Resmi</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white font-serif">
          Daftar Kursus & Syarah Matan
        </h1>
        <p className="text-[#FAF7F0]/90 dark:text-[#A6D6C9] text-xs sm:text-sm max-w-2xl leading-relaxed">
          Pilih kurikulum yang ingin Anda pelajari. Seluruh video dan naskah materi terbuka untuk umum tanpa wajib login. Mendaftar akun diperlukan jika ingin menyimpan riwayat progres dan mengerjakan kuis evaluasi.
        </p>
      </div>

      {/* SERVICE DISRUPTION BANNER WHEN DATA IS RETAINED IN MEMORY */}
      {loadError && courses.length > 0 && (
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

      {/* Filter and Search Bar */}
      <div className="nb-card p-4 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#123D32] dark:text-[#4CA7A1]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari judul matan, topik bahasan, atau pensyarah..."
              className="nb-input pl-10 pr-4 py-2.5"
            />
          </div>

          {/* Level Filter Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1] hidden sm:inline" />
            <select
              value={activeLevel}
              onChange={(e) => setActiveLevel(e.target.value)}
              className="nb-input w-full sm:w-auto px-3 py-2.5 text-xs md:text-sm font-bold cursor-pointer"
            >
              <option value="all">Semua Tingkatan (Pemula s/d Mahir)</option>
              <option value="beginner">Tingkat Pemula (Mubtadi')</option>
              <option value="intermediate">Tingkat Menengah (Mutawassith)</option>
              <option value="advanced">Tingkat Mahir (Mutaqaddim)</option>
            </select>
          </div>
        </div>

        {/* Category Filter Buttons */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-2 rounded-md text-xs font-extrabold whitespace-nowrap border-2 transition-all cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-[#123D32] text-[#FAF7F0] border-[#171717] dark:bg-[#4CA7A1] dark:text-[#001722] dark:border-[#001722] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]'
                : 'bg-[#FAF7F0] dark:bg-[#0D2B36] text-[#171717] dark:text-[#A6D6C9] border-[#171717] dark:border-[#4CA7A1] hover:bg-white dark:hover:bg-[#1F5F63] dark:hover:text-[#CEFEF1]'
            }`}
          >
            Semua Bidang ({courses.length})
          </button>
          {categories.map((cat) => {
            const count = courses.filter(c => c.categoryId === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-2 rounded-md text-xs font-extrabold whitespace-nowrap border-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === cat.id
                    ? 'bg-[#123D32] text-[#FAF7F0] border-[#171717] dark:bg-[#4CA7A1] dark:text-[#001722] dark:border-[#001722] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]'
                    : 'bg-[#FAF7F0] dark:bg-[#0D2B36] text-[#171717] dark:text-[#A6D6C9] border-[#171717] dark:border-[#4CA7A1] hover:bg-white dark:hover:bg-[#1F5F63] dark:hover:text-[#CEFEF1]'
                }`}
              >
                <span>{cat.name}</span>
                <span className="text-[10px] opacity-85">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Course Grid & Mobile Carousel */}
      {filteredCourses.length > 0 ? (
        <div ref={gridRef}>
          <MobileCarousel
            desktopGridClass="sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-6"
            ariaLabel="Katalog Pembelajaran"
          >
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                category={categoryMap.get(course.categoryId)}
                enrollment={enrollments[course.id] || null}
                onSelect={onSelectCourse}
                disableAnimation={true}
              />
            ))}
          </MobileCarousel>
        </div>
      ) : loadError && courses.length === 0 ? (
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
        <div className="text-center py-16 nb-card p-8 space-y-4">
          <BookOpen className="w-12 h-12 text-[#123D32] dark:text-[#4CA7A1] mx-auto" />
          <h3 className="text-lg font-bold font-serif text-[#171717] dark:text-[#CEFEF1]">
            Tidak ada kursus yang cocok
          </h3>
          <p className="text-sm text-[#525855] dark:text-[#A6D6C9] max-w-md mx-auto">
            Coba ubah kata kunci pencarian atau bersihkan filter untuk melihat seluruh materi kursus yang tersedia.
          </p>
          <button
            onClick={() => {
              setActiveCategory('all');
              setActiveLevel('all');
              setSearchTerm('');
            }}
            className="nb-btn nb-btn-gold px-5 py-2.5 text-xs"
          >
            Reset Semua Filter
          </button>
        </div>
      )}
    </div>
  );
};
