import React, { useState } from 'react';
import { Clock, ArrowRight, CheckCircle2, Share2, Check } from 'lucide-react';
import { Course, Category, Enrollment } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { buildCourseShareUrl, copyCourseUrlToClipboard } from '../../utils/courseShareHelper';

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
  const [copied, setCopied] = useState(false);

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'beginner':
        return { text: 'Pemula', ar: 'مبتدئ', color: 'bg-[#FAF7F0] text-[#0F3D3A] border-[#171717]' };
      case 'intermediate':
        return { text: 'Menengah', ar: 'متوسط', color: 'bg-[#D6AD52] text-[#171717] border-[#171717]' };
      case 'advanced':
        return { text: 'Mahir', ar: 'متقدم', color: 'bg-[#4CA7A1] text-[#001722] border-[#171717]' };
      default:
        return { text: 'Umum', ar: 'عام', color: 'bg-[#F5DABF] text-[#0F3D3A] border-[#171717]' };
    }
  };

  const levelInfo = getLevelLabel(course.level);

  const activeSessionCount = sessionCount !== undefined
    ? sessionCount
    : (course.sessionsCount !== undefined ? course.sessionsCount : null);

  const sessionDisplay = activeSessionCount !== null
    ? `${activeSessionCount} Sesi`
    : (course.totalDuration || '0 Sesi');

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://darswithosama.com';
    const url = buildCourseShareUrl(course, origin);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: course.title,
          text: `Yuk, pelajari kurikulum "${course.title}" bersama ${course.instructor}:`,
          url
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    const ok = await copyCourseUrlToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      onClick={() => onSelect(course)}
      data-card-type="course"
      className={`course-card card-pembelajaran group nb-card-interactive overflow-hidden flex flex-col cursor-pointer h-full border-2 border-[#171717] shadow-[4px_4px_0px_#171717] ${!disableAnimation ? 'animate-fade-in-up' : ''} ${className}`}
      style={{ backgroundColor: '#0F3D3A', color: '#FFF5E9' }}
    >
      {/* Cover Image - Clean without any overlays */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#092624] border-b-2 border-[#171717]">
        <img
          src={course.coverImageUrl || 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=1200&q=80'}
          alt={course.title}
          className="course-card-thumb w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 ease-out"
          loading="lazy"
        />
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 sm:space-y-4 bg-[#0F3D3A] text-[#FFF5E9]">
        <div className="space-y-2.5 text-left">
          {/* Header Row: Title & Share Button */}
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex-1 min-w-0">
              <h3 className="font-serif font-bold text-sm sm:text-base md:text-lg text-white group-hover:text-[#F5DABF] transition-colors line-clamp-2 leading-snug">
                {course.title}
              </h3>

              {course.titleAr && (
                <p className="font-amiri text-sm sm:text-[17px] font-bold text-[#F5DABF] line-clamp-1 leading-[1.85] mt-0.5" dir="rtl">
                  {course.titleAr}
                </p>
              )}
            </div>

            {/* Share Button relocated to info area */}
            <button
              type="button"
              onClick={handleShare}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-[#FAF7F0] text-[#0F3D3A] border-2 border-[#171717] shadow-[2px_2px_0px_#171717] flex items-center justify-center hover:bg-[#D6AD52] transition cursor-pointer shrink-0 mt-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                copied ? 'bg-[#D6AD52] text-[#0F3D3A]' : ''
              }`}
              title={copied ? 'Tautan berhasil disalin!' : 'Bagikan Pembelajaran ini'}
              aria-label="Bagikan pembelajaran"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Badges: Level & Category side by side below title */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {/* Level Badge with distinct colors */}
            <span
              className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider border shadow-[1.5px_1.5px_0px_#171717] ${levelInfo.color}`}
            >
              {levelInfo.text}
            </span>

            {/* Category Badges (supporting multi-categories) */}
            {category && category.name
              .split(',')
              .map((c) => c.trim())
              .filter(Boolean)
              .map((catName, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider bg-[#F5DABF] text-[#0F3D3A] border border-[#171717] shadow-[1.5px_1.5px_0px_#171717] inline-block"
                >
                  {catName}
                </span>
              ))}
          </div>

          {/* Description */}
          <p className="text-xs text-[#FAF7F0]/90 line-clamp-2 leading-relaxed font-sans">
            {course.description}
          </p>
        </div>

        {/* Footer Meta & Progress */}
        <div className="pt-2.5 sm:pt-3 border-t-2 border-[#F5DABF]/25 space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-[#F5DABF] gap-1">
            <span className="truncate max-w-[130px] sm:max-w-[165px]" title={course.instructor}>
              {course.instructor}
            </span>
            <span className="flex items-center gap-1 shrink-0 px-2 py-0.5 bg-[#FAF7F0] text-[#0F3D3A] border border-[#171717] rounded text-[10px] sm:text-[11px]">
              <Clock className="w-3.5 h-3.5 text-[#0F3D3A]" />
              <span>{sessionDisplay}</span>
            </span>
          </div>

          {/* Enrollment Progress if logged in & enrolled */}
          {enrollment ? (
            <div className="space-y-1.5 pt-0.5 sm:pt-1">
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold">
                <span className="text-[#F5DABF] flex items-center gap-1">
                  {enrollment.isCompleted ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#D6AD52]" />
                      <span>Tuntas 100%</span>
                    </>
                  ) : (
                    `Progres: ${enrollment.progressPercent}%`
                  )}
                </span>
                <span className="text-[#FAF7F0]/80 truncate">
                  {enrollment.completedSessionIds?.length || 0} Sesi Selesai
                </span>
              </div>
              <div className="w-full h-2 sm:h-2.5 bg-[#092624] border border-[#171717] rounded-xs sm:rounded-sm overflow-hidden">
                <div
                  className="h-full bg-[#D6AD52] transition-all duration-500"
                  style={{ width: `${enrollment.progressPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs font-extrabold text-[#F5DABF] group-hover:text-white">
              <span>Buka Kurikulum</span>
              <ArrowRight className="w-4 h-4 text-[#F5DABF] group-hover:text-white transform group-hover:translate-x-1 transition-transform duration-200" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
