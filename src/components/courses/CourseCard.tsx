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
          <h3 className="font-bold text-base md:text-lg text-stone-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200 line-clamp-2 leading-snug font-sans">
            {course.title}
          </h3>

          {course.titleAr && (
            <p className="font-amiri text-lg md:text-xl font-bold text-emerald-600 dark:text-emerald-400 line-clamp-1 leading-normal" dir="rtl">
              {course.titleAr}
            </p>
          )}

          {/* Description */}
          <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed">
            {course.description}
          </p>
        </div>

        {/* Footer Meta & Progress */}
        <div className="pt-3 border-t border-stone-200 dark:border-stone-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
            <span className="truncate max-w-[170px]" title={course.instructor}>
              {course.instructor}
            </span>
            <span className="flex items-center gap-1 text-stone-500 dark:text-stone-400 shrink-0">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>{course.totalDuration || 'Sesi Mandiri'}</span>
            </span>
          </div>

          {/* Enrollment Progress if logged in & enrolled */}
          {enrollment ? (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  {enrollment.isCompleted ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Tuntas 100%</span>
                    </>
                  ) : (
                    `Progres: ${enrollment.progressPercent}%`
                  )}
                </span>
                <span className="text-stone-500 dark:text-stone-400">{enrollment.completedSessionIds?.length || 0} Sesi Selesai</span>
              </div>
              <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${enrollment.progressPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
              <span>Buka Kurikulum</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
