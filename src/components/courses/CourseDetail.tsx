import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Video,
  FileText,
  Award,
  Clock,
  CheckCircle2,
  PlayCircle,
  HelpCircle,
  Share2,
  Lock,
  Sparkles
} from 'lucide-react';
import { Course, Session, Category, Enrollment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { enrollUser } from '../../firebase/services';

interface CourseDetailProps {
  course: Course;
  category?: Category;
  sessions: Session[];
  enrollment?: Enrollment | null;
  onBack: () => void;
  onSelectSession: (session: Session) => void;
  onOpenCertificate: (course: Course) => void;
  onRefreshEnrollment: () => void;
}

export const CourseDetail: React.FC<CourseDetailProps> = ({
  course,
  category,
  sessions,
  enrollment,
  onBack,
  onSelectSession,
  onOpenCertificate,
  onRefreshEnrollment
}) => {
  const { user, openGuestModal } = useAuth();
  const { t } = useLanguage();
  const [enrolling, setEnrolling] = useState(false);

  const handleEnrollClick = async () => {
    if (!user) {
      openGuestModal(course, {
        type: 'enroll',
        courseId: course.id,
        onSuccess: async () => {
          onRefreshEnrollment();
        }
      });
      return;
    }

    try {
      setEnrolling(true);
      await enrollUser(user.uid, course.id);
      onRefreshEnrollment();
    } catch (err) {
      console.error('Enrollment error:', err);
    } finally {
      setEnrolling(false);
    }
  };

  const handleStartOrContinue = () => {
    if (!user) {
      openGuestModal(course, {
        type: 'enroll',
        courseId: course.id
      });
      return;
    }
    if (sessions.length === 0) return;
    if (enrollment?.lastSessionId) {
      const last = sessions.find(s => s.id === enrollment.lastSessionId);
      if (last) {
        onSelectSession(last);
        return;
      }
    }
    // Default to first session
    onSelectSession(sessions[0]);
  };

  const isCompleted = enrollment?.isCompleted || false;
  const completedIds = new Set(enrollment?.completedSessionIds || []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white transition-all duration-200 hover:-translate-x-0.5 active:scale-95 text-sm font-medium cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Katalog Kursus</span>
      </button>

      {/* Hero Header Card */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl overflow-hidden shadow-sm dark:shadow-2xl relative transition-colors duration-250">
        <div className="absolute top-0 right-1/3 w-80 h-80 bg-emerald-500/10 dark:bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none animate-pulse-glow" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 relative">
          {/* Left Details */}
          <div className="lg:col-span-7 p-6 sm:p-8 md:p-10 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Category & Level Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {category && (
                  <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-400 text-xs font-semibold rounded-lg">
                    {category.name}
                  </span>
                )}
                <span className="px-2.5 py-1 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-lg capitalize border border-stone-200 dark:border-stone-700">
                  Level: {course.level}
                </span>
              </div>

              {/* Course Titles */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-stone-900 dark:text-white font-sans leading-tight">
                {course.title}
              </h1>

              {course.titleAr && (
                <p className="font-amiri text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-400 leading-relaxed" dir="rtl">
                  {course.titleAr}
                </p>
              )}

              {/* Description */}
              <p className="text-stone-600 dark:text-stone-300 text-sm md:text-base leading-relaxed">
                {course.description}
              </p>

              {/* Instructor Box */}
              <div className="p-4 bg-stone-50 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800/80 rounded-2xl flex items-center justify-between text-xs sm:text-sm">
                <div>
                  <p className="text-stone-500 dark:text-stone-400 text-xs">Pensyarah / Pengajar:</p>
                  <p className="font-semibold text-stone-900 dark:text-stone-100 text-sm md:text-base mt-0.5">{course.instructor}</p>
                  {course.instructorTitle && (
                    <p className="text-stone-500 dark:text-stone-400 text-xs">{course.instructorTitle}</p>
                  )}
                </div>
                {course.instructorAr && (
                  <p className="font-amiri text-lg font-bold text-amber-700 dark:text-amber-400/90 text-right" dir="rtl">
                    {course.instructorAr}
                  </p>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center gap-4">
              {enrollment ? (
                <button
                  onClick={handleStartOrContinue}
                  className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl font-semibold text-sm transition-all duration-200 flex items-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer"
                >
                  <PlayCircle className="w-5 h-5" />
                  <span>Lanjutkan Belajar ({enrollment.progressPercent}%)</span>
                </button>
              ) : (
                <button
                  onClick={handleEnrollClick}
                  disabled={enrolling}
                  className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl font-semibold text-sm transition-all duration-200 flex items-center gap-2 shadow-lg shadow-emerald-950/50 disabled:opacity-50 cursor-pointer"
                >
                  {enrolling ? (
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                  <span>{enrolling ? 'Mendaftar...' : 'Mulai Belajar Kursus Ini'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Cover & Quick Info */}
          <div className="lg:col-span-5 relative bg-stone-50 dark:bg-stone-950 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-stone-200 dark:border-stone-800">
            <div className="relative aspect-[16/10] lg:aspect-auto lg:h-64 w-full overflow-hidden">
              <img
                src={course.coverImageUrl || 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=1200&q=80'}
                alt={course.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=1200&q=80';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-50 dark:from-stone-950 via-transparent to-transparent" />
            </div>

            <div className="p-6 space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Rincian Program</h4>
              <div className="space-y-3 text-xs md:text-sm">
                <div className="flex items-center justify-between text-stone-700 dark:text-stone-300 py-1 border-b border-stone-200 dark:border-stone-800">
                  <span className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                    <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Jumlah Sesi:</span>
                  </span>
                  <span className="font-semibold text-stone-900 dark:text-white">{sessions.length} Sesi Pembelajaran</span>
                </div>

                <div className="flex items-center justify-between text-stone-700 dark:text-stone-300 py-1 border-b border-stone-200 dark:border-stone-800">
                  <span className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Batas Nilai Kelulusan:</span>
                  </span>
                  <span className="font-semibold text-stone-900 dark:text-white">{course.passingGrade}%</span>
                </div>
              </div>

              {/* Guest Information Notice */}
              <div className="p-3 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-600 dark:text-stone-400 text-xs space-y-1">
                <p className="font-semibold text-stone-800 dark:text-stone-200">Akses Terbuka untuk Kaum Muslimin:</p>
                <p>Pengunjung bebas menonton rekaman dan membaca materi. Daftarkan akun untuk menyimpan riwayat nilai dan kemajuan belajar Anda.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Syllabus / Sessions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white font-sans">
              Daftar Sesi Pembelajaran ({sessions.length})
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
              Klik pada sesi untuk mulai menyimak materi video, naskah PDF, catatan kajian, dan evaluasi kuis.
            </p>
          </div>
        </div>

        {sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((session, idx) => {
              const isSessionDone = completedIds.has(session.id);
              return (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session)}
                  className="group bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-850 border border-stone-200 dark:border-stone-800 hover:border-emerald-500/40 dark:hover:border-emerald-600/40 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition shadow-xs hover:shadow-md dark:shadow-none"
                >
                  <div className="flex items-start gap-4">
                    {/* Index Circle or Completion Checkmark */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition ${
                      isSessionDone
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950 group-hover:text-emerald-700 dark:group-hover:text-emerald-400'
                    }`}>
                      {isSessionDone ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : idx + 1}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm sm:text-base text-stone-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                          {session.title}
                        </h4>
                        {isSessionDone && (
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-[10px] font-semibold rounded-md border border-emerald-300 dark:border-emerald-500/20">
                            Selesai
                          </span>
                        )}
                      </div>

                      {session.titleAr && (
                        <p className="font-amiri text-base font-bold text-emerald-700 dark:text-emerald-400/90 leading-tight" dir="rtl">
                          {session.titleAr}
                        </p>
                      )}

                      <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-1 max-w-2xl">
                        {session.description}
                      </p>
                    </div>
                  </div>

                  {/* Badges on Right */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {session.youtubeUrl && (
                      <span className="flex items-center gap-1 text-[11px] text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700">
                        <Video className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Video</span>
                      </span>
                    )}
                    {session.pdfUrl && (
                      <span className="flex items-center gap-1 text-[11px] text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700">
                        <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>PDF</span>
                      </span>
                    )}
                    {session.quizId && (
                      <span className="flex items-center gap-1 text-[11px] text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700">
                        <HelpCircle className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        <span>Kuis</span>
                      </span>
                    )}
                    <span className="p-2 text-stone-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all">
                      <PlayCircle className="w-6 h-6" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl text-center text-stone-600 dark:text-stone-400 text-sm shadow-sm">
            Belum ada sesi pembelajaran yang dipublikasikan untuk kursus ini.
          </div>
        )}
      </div>
    </div>
  );
};
