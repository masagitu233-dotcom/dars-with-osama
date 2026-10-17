import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Filter, BookOpen, Sparkles, CheckCircle } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Course, Category, Enrollment } from '../../types';
import { CourseCard } from './CourseCard';
import { useLanguage } from '../../context/LanguageContext';

gsap.registerPlugin(ScrollTrigger);

interface CourseCatalogProps {
  courses: Course[];
  categories: Category[];
  enrollments: Record<string, Enrollment>;
  selectedCategoryId?: string;
  searchQuery?: string;
  onSelectCourse: (course: Course) => void;
  onClearFilters?: () => void;
}

export const CourseCatalog: React.FC<CourseCatalogProps> = ({
  courses,
  categories,
  enrollments,
  selectedCategoryId: initialCat = 'all',
  searchQuery: initialSearch = '',
  onSelectCourse
}) => {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string>(initialCat);
  const [activeLevel, setActiveLevel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>(initialSearch);

  const gridRef = useRef<HTMLDivElement>(null);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      // Category filter
      if (activeCategory !== 'all' && course.categoryId !== activeCategory) {
        return false;
      }
      // Level filter
      if (activeLevel !== 'all' && course.level !== activeLevel) {
        return false;
      }
      // Search term
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
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !gridRef.current) return;

    const ctx = gsap.context(() => {
      if (gridRef.current?.children.length) {
        gsap.fromTo(
          gridRef.current.children,
          { opacity: 0, y: 30, scale: 0.97 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.55,
            stagger: 0.07,
            ease: 'power2.out',
          }
        );
      }
    }, gridRef);

    return () => ctx.revert();
  }, [filteredCourses]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Catalog Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-400 text-xs font-semibold">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Katalog Materi & Kurikulum Resmi</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-stone-900 dark:text-white font-sans">
          Daftar Kursus & Syarah Matan
        </h1>
        <p className="text-stone-600 dark:text-stone-400 text-sm max-w-2xl">
          Pilih kurikulum yang ingin Anda pelajari. Seluruh video dan naskah materi terbuka untuk umum tanpa wajib login. Mendaftar akun diperlukan jika ingin menyimpan riwayat progres dan mengerjakan kuis evaluasi.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 md:p-5 rounded-2xl space-y-4 shadow-sm dark:shadow-lg transition-colors duration-250">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari judul matan, topik bahasan, atau pensyarah..."
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-xl text-stone-900 dark:text-stone-200 placeholder-stone-400 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Level Filter Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-stone-400 hidden sm:inline" />
            <select
              value={activeLevel}
              onChange={(e) => setActiveLevel(e.target.value)}
              className="w-full sm:w-auto px-3 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-xl text-stone-900 dark:text-stone-200 text-xs md:text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Semua Tingkatan (Tingkat Pemula s/d Mahir)</option>
              <option value="beginner">Tingkat Pemula (Mubtadi')</option>
              <option value="intermediate">Tingkat Menengah (Mutawassith)</option>
              <option value="advanced">Tingkat Mahir (Mutaqaddim)</option>
            </select>
          </div>
        </div>

        {/* Category Horizontal Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 hover:text-stone-900 dark:hover:text-white'
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <span>{cat.name}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Course Grid */}
      {filteredCourses.length > 0 ? (
        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              category={categoryMap.get(course.categoryId)}
              enrollment={enrollments[course.id] || null}
              onSelect={onSelectCourse}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 rounded-3xl p-8 space-y-4 shadow-sm">
          <BookOpen className="w-12 h-12 text-stone-400 dark:text-stone-600 mx-auto" />
          <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-200">Tidak ada kursus yang cocok</h3>
          <p className="text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto">
            Coba ubah kata kunci pencarian atau bersihkan filter untuk melihat seluruh materi kursus yang tersedia.
          </p>
          <button
            onClick={() => {
              setActiveCategory('all');
              setActiveLevel('all');
              setSearchTerm('');
            }}
            className="px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl text-xs font-medium transition cursor-pointer"
          >
            Reset Semua Filter
          </button>
        </div>
      )}
    </div>
  );
};
