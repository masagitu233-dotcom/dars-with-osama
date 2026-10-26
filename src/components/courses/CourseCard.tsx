import React from 'react';
import { Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Course, Category, Enrollment } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface CourseCardProps {
  course: Course;
  category?: Category;
  enrollment?: Enrollment | null;
  sessionCount?: number;
  onSelect: (course: Course) => void;
  className?: string;
  disableAnimation?: boolean;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  category,
  enrollment,
  sessionCount,
  onSelect,
  className = '',
  disableAnimation = false
}) => {
  const { t } = useLanguage();

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'beginner':
        return { text: 'Pemula', ar: 'مبتدئ', color: 'bg-[#06251D] text-[#D9AC45] border-[#171717]' };
      case 'intermediate':
        return { text: 'Menengah', ar: 'متوسط', color: 'bg-[#D9AC45] text-[#171717] border-[#171717]' };
      case 'advanced':
        return { text: 'Mahir', ar: 'متقدم', color: 'bg-[#3478F6] text-white border-[#171717]' };
      default:
        return { text: 'Umum', ar: 'عام', color: 'bg-[#F8F3E8] text-[#171717] border-[#171717]' };
    }
  };

  const levelInfo = getLevelLabel(course.level);

  const activeSessionCount = sessionCount !== undefined
    ? sessionCount
    : (course.sessionsCount !== undefined ? course.sessionsCount : null);

  const sessionDisplay = activeSessionCount !== null
    ? `${activeSessionCount} Sesi`
    : (course.totalDuration || '0 Sesi');

  return (
    <div
      onClick={() => onSelect(course)}
      className={`course-card group nb-card-interactive overflow-hidden flex flex-col cursor-pointer h-full ${!disableAnimation ? 'animate-fade-in-up' : ''} ${className}`}
    >
      {/* Cover Image */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#06251D] border-b-2 border-[#171717] dark:border-[#D9AC45]/60">
        <img
          src={course.coverImageUrl || 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=1200&q=80'}
          alt={course.title}
          className="course-card-thumb w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 ease-out"
          loading="lazy"
        />

        {/* Badges on Top */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider border-2 shadow-[2px_2px_0px_#171717] ${levelInfo.color}`}>
            {levelInfo.text}
          </span>
        </div>

        {/* Category Badge on bottom cover */}
        {category && (
          <div className="absolute bottom-2.5 left-3">
            <span className="text-[11px] font-bold text-[#F8F3E8] bg-[#171717] px-2.5 py-0.5 rounded border border-[#D9AC45]">
              {category.name}
            </span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2 text-left">
          {/* Titles */}
          <h3 className="font-serif font-bold text-base md:text-lg text-[#171717] dark:text-[#F8F3E8] group-hover:text-[#06251D] dark:group-hover:text-[#D9AC45] transition-colors line-clamp-2 leading-snug">
            {course.title}
          </h3>

          {course.titleAr && (
            <p className="font-amiri text-lg md:text-xl font-bold text-[#06251D] dark:text-[#D9AC45] line-clamp-1 leading-normal" dir="rtl">
              {course.titleAr}
            </p>
          )}

          {/* Description */}
          <p className="text-xs text-[#171717]/80 dark:text-[#F8F3E8]/80 line-clamp-2 leading-relaxed font-sans">
            {course.description}
          </p>
        </div>

        {/* Footer Meta & Progress */}
        <div className="pt-3 border-t-2 border-[#171717]/15 dark:border-[#D9AC45]/25 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-[#171717]/75 dark:text-[#F8F3E8]/80">
            <span className="truncate max-w-[165px]" title={course.instructor}>
              {course.instructor}
            </span>
            <span className="flex items-center gap-1 shrink-0 px-2 py-0.5 bg-[#F8F3E8] dark:bg-[#06251D] border border-[#171717] dark:border-[#D9AC45]/50 rounded text-[11px]">
              <Clock className="w-3.5 h-3.5 text-[#06251D] dark:text-[#D9AC45]" />
              <span>{sessionDisplay}</span>
            </span>
          </div>

          {/* Enrollment Progress if logged in & enrolled */}
          {enrollment ? (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-[#06251D] dark:text-[#D9AC45] flex items-center gap-1">
                  {enrollment.isCompleted ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#06251D] dark:text-[#D9AC45]" />
                      <span>Tuntas 100%</span>
                    </>
                  ) : (
                    `Progres: ${enrollment.progressPercent}%`
                  )}
                </span>
                <span className="text-[#171717]/70 dark:text-[#F8F3E8]/70">
                  {enrollment.completedSessionIds?.length || 0} Sesi Selesai
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#F8F3E8] dark:bg-[#06251D] border border-[#171717] dark:border-[#D9AC45] rounded-sm overflow-hidden">
                <div
                  className="h-full bg-[#D9AC45] transition-all duration-500"
                  style={{ width: `${enrollment.progressPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs font-extrabold text-[#06251D] dark:text-[#D9AC45]">
              <span>Buka Kurikulum</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
