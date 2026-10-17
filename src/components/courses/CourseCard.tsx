import React from 'react';
import { BookOpen, Video, Award, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Course, Category, Enrollment } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface CourseCardProps {
  course: Course;
  category?: Category;
  enrollment?: Enrollment | null;
  onSelect: (course: Course) => void;
  className?: string;
  disableAnimation?: boolean;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  category,
  enrollment,
  onSelect,
  className = '',
  disableAnimation = false
}) => {
  const { t } = useLanguage();

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'beginner': return { text: 'Pemula', ar: 'مبتدئ', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'intermediate': return { text: 'Menengah', ar: 'متوسط', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'advanced': return { text: 'Mahir', ar: 'متقدم', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
      default: return { text: 'Umum', ar: 'عام', color: 'bg-stone-500/10 text-stone-400 border-stone-500/20' };
    }
  };

  const levelInfo = getLevelLabel(course.level);

  return (
    <div
      onClick={() => onSelect(course)}
      className={`course-card group bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-300 shadow-xs hover:shadow-xl dark:hover:shadow-emerald-950/30 hover:-translate-y-1.5 active:scale-[0.99] ${!disableAnimation ? 'animate-fade-in-up' : ''} ${className}`}
    >
      {/* Cover Image */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-stone-100 dark:bg-stone-950">
        <img
          src={course.coverImageUrl || 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=1200&q=80'}
          alt={course.title}
          className="course-card-thumb w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out will-change-transform"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 dark:from-stone-950 via-black/20 dark:via-stone-950/30 to-transparent transition-opacity duration-300 group-hover:opacity-90" />

        {/* Badges on Top */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border backdrop-blur-md transition-transform duration-200 group-hover:scale-105 ${levelInfo.color}`}>
            {levelInfo.text}
          </span>
        </div>

        {/* Category Pill on bottom cover */}
        {category && (
          <div className="absolute bottom-2.5 left-3">
            <span className="text-[11px] font-medium text-emerald-300 bg-stone-900/90 px-2 py-0.5 rounded-md backdrop-blur-sm border border-stone-700/60 transition-colors duration-200 group-hover:border-emerald-600/50">
              {category.name}
            </span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Titles */}
          <h3 className="font-serif-brand font-bold text-base md:text-lg text-[#073B2E] dark:text-[#F7F6EF] group-hover:text-[#C9A34E] dark:group-hover:text-[#C9A34E] transition-colors duration-200 line-clamp-2 leading-snug">
            {course.title}
          </h3>

          {course.titleAr && (
            <p className="font-amiri text-lg md:text-xl font-bold text-[#C9A34E] line-clamp-1 leading-normal" dir="rtl">
              {course.titleAr}
            </p>
          )}

          {/* Description */}
          <p className="text-xs text-[#6B7C7A] dark:text-[#8C9E9B] line-clamp-2 leading-relaxed font-sans">
            {course.description}
          </p>
        </div>

        {/* Footer Meta & Progress */}
        <div className="pt-3 border-t border-[#073B2E]/10 dark:border-[#143e33] space-y-3">
          <div className="flex items-center justify-between text-xs text-[#6B7C7A] dark:text-[#8C9E9B]">
            <span className="truncate max-w-[170px]" title={course.instructor}>
              {course.instructor}
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <Clock className="w-3.5 h-3.5 text-[#C9A34E]" />
              <span>{course.totalDuration || 'Sesi Mandiri'}</span>
            </span>
          </div>

          {/* Enrollment Progress if logged in & enrolled */}
          {enrollment ? (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#073B2E] dark:text-[#C9A34E] font-medium flex items-center gap-1">
                  {enrollment.isCompleted ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#C9A34E]" />
                      <span>Tuntas 100%</span>
                    </>
                  ) : (
                    `Progres: ${enrollment.progressPercent}%`
                  )}
                </span>
                <span className="text-[#6B7C7A] dark:text-[#8C9E9B]">{enrollment.completedSessionIds?.length || 0} Sesi Selesai</span>
              </div>
              <div className="w-full h-1.5 bg-[#073B2E]/10 dark:bg-[#143e33] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C9A34E] rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${enrollment.progressPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs font-semibold text-[#073B2E] dark:text-[#C9A34E] group-hover:text-[#C9A34E] transition-colors">
              <span>Buka Kurikulum</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200 text-[#C9A34E]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
