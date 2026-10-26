import React, { useState } from 'react';
import {
  ArrowLeft,
  Video,
  FileText,
  Clock,
  CheckCircle2,
  PlayCircle,
  HelpCircle,
  Share2,
  Sparkles,
  Copy,
  Check
} from 'lucide-react';
import { Course, Session, Category, Enrollment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { enrollUser } from '../../firebase/services';
import { SessionShareModal } from './SessionShareModal';
import { buildSessionShareUrl } from '../../utils/sessionShareHelper';

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
  onRefreshEnrollment
}) => {
  const { user, loading: authLoading, openGuestModal } = useAuth();
  useLanguage();
  const [enrolling, setEnrolling] = useState(false);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [sharingSession, setSharingSession] = useState<Session | null>(null);

  const handleCopySessionUrl = (e: React.MouseEvent, session: Session) => {
    e.stopPropagation();
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://darswithosama.com';
    const url = buildSessionShareUrl(session, origin);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedSessionId(session.id);
      setTimeout(() => {
        setCopiedSessionId(prev => (prev === session.id ? null : prev));
      }, 3000);
    } catch (err) {
      console.error('Failed to copy session link:', err);
    }
  };

  const handleOpenShareModal = (e: React.MouseEvent, session: Session) => {
    e.stopPropagation();
    setSharingSession(session);
  };

  const handleEnrollClick = async () => {
    if (authLoading) return;
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
    if (authLoading) return;
    if (!user) {
      openGuestModal(course, {
        type: 'enroll',
        courseId: course.id,
        onSuccess: () => {
          if (sessions.length > 0) {
            onSelectSession(sessions[0]);
          }
        }
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
    onSelectSession(sessions[0]);
  };

  const completedIds = new Set(enrollment?.completedSessionIds || []);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-fade-in-up">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="nb-btn nb-btn-secondary px-4 py-2 text-xs"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Katalog Kursus</span>
      </button>

      {/* Hero Header Card */}
      <div className="nb-card overflow-hidden relative bg-white dark:bg-[#16263D]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 relative">
          {/* Left Details */}
          <div className="lg:col-span-7 p-6 sm:p-8 md:p-10 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Category & Level Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {category && (
                  <span className="nb-badge bg-[#123D32] text-[#D6AD52] border-[#292D2B] dark:border-[#34465D]">
                    {category.name}
                  </span>
                )}
                <span className="nb-badge bg-[#FAF7F0] dark:bg-[#243A56] text-[#292D2B] dark:text-[#F1F4F8] capitalize">
                  Level: {course.level}
                </span>
              </div>

              {/* Course Titles */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#292D2B] dark:text-[#F1F4F8] font-serif-brand leading-tight">
                {course.title}
              </h1>

              {course.titleAr && (
                <p className="font-amiri text-2xl sm:text-3xl font-bold text-[#123D32] dark:text-[#D6AD52] leading-relaxed" dir="rtl">
                  {course.titleAr}
                </p>
              )}

              {/* Description */}
              <p className="text-[#626A66] dark:text-[#B4C0D0] text-sm md:text-base leading-relaxed">
                {course.description}
              </p>

              {/* Instructor Box */}
              <div className="p-4 bg-[#FAF7F0] dark:bg-[#243A56] border-2 border-[#292D2B] dark:border-[#34465D] rounded-lg flex items-center justify-between text-xs sm:text-sm">
                <div>
                  <p className="text-[#626A66] dark:text-[#B4C0D0] text-xs font-bold uppercase tracking-wider">Pensyarah / Pengajar:</p>
                  <p className="font-extrabold text-[#292D2B] dark:text-[#F1F4F8] text-sm md:text-base mt-0.5">{course.instructor}</p>
                  {course.instructorTitle && (
                    <p className="text-[#626A66] dark:text-[#D6AD52] text-xs font-semibold">{course.instructorTitle}</p>
                  )}
                </div>
                {course.instructorAr && (
                  <p className="font-amiri text-lg font-bold text-[#123D32] dark:text-[#D6AD52] text-right" dir="rtl">
                    {course.instructorAr}
                  </p>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t-2 border-[#292D2B] dark:border-[#34465D] flex flex-wrap items-center gap-4">
              {enrollment ? (
                <button
                  onClick={handleStartOrContinue}
                  className="nb-btn nb-btn-gold px-6 py-3.5 text-sm"
                >
                  <PlayCircle className="w-5 h-5" />
                  <span>Lanjutkan Belajar ({enrollment.progressPercent}%)</span>
                </button>
              ) : (
                <button
                  onClick={handleEnrollClick}
                  disabled={enrolling}
                  className="nb-btn nb-btn-primary px-6 py-3.5 text-sm disabled:opacity-50"
                >
                  {enrolling ? (
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-[#D6AD52]" />
                  )}
                  <span>{enrolling ? 'Mendaftar...' : 'Mulai Belajar Kursus Ini'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Cover & Quick Info */}
          <div className="lg:col-span-5 relative bg-[#FAF7F0] dark:bg-[#16263D] flex flex-col justify-between border-t-2 lg:border-t-0 lg:border-l-2 border-[#292D2B] dark:border-[#34465D]">
            <div className="relative aspect-[16/10] lg:aspect-auto lg:h-64 w-full overflow-hidden border-b-2 border-[#292D2B] dark:border-[#34465D]">
              <img
                src={course.coverImageUrl || 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=1200&q=80'}
                alt={course.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=1200&q=80';
                }}
              />
            </div>

            <div className="p-6 space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#123D32] dark:text-[#D6AD52]">Rincian Program</h4>
              <div className="space-y-3 text-xs md:text-sm">
                <div className="flex items-center justify-between text-[#292D2B] dark:text-[#F1F4F8] py-1.5 border-b-2 border-[#292D2B]/15 dark:border-[#34465D]">
                  <span className="flex items-center gap-2 font-semibold">
                    <Clock className="w-4 h-4 text-[#123D32] dark:text-[#D6AD52]" />
                    <span>Jumlah Sesi:</span>
                  </span>
                  <span className="font-extrabold">{sessions.length} Sesi Pembelajaran</span>
                </div>

                <div className="flex items-center justify-between text-[#292D2B] dark:text-[#F1F4F8] py-1.5 border-b-2 border-[#292D2B]/15 dark:border-[#34465D]">
                  <span className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#123D32] dark:text-[#D6AD52]" />
                    <span>Batas Nilai Kelulusan:</span>
                  </span>
                  <span className="font-extrabold">{course.passingGrade}%</span>
                </div>
              </div>

              {/* Guest Information Notice */}
              <div className="p-3.5 bg-white dark:bg-[#243A56] border-2 border-[#292D2B] dark:border-[#34465D] rounded-md text-[#292D2B] dark:text-[#F1F4F8] text-xs space-y-1">
                <p className="font-extrabold text-[#123D32] dark:text-[#D6AD52]">Akses Terbuka untuk Kaum Muslimin:</p>
                <p className="text-[#626A66] dark:text-[#B4C0D0]">Pengunjung bebas menonton rekaman dan membaca materi. Daftarkan akun untuk menyimpan riwayat nilai dan kemajuan belajar Anda.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Syllabus / Sessions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#292D2B] dark:text-[#F1F4F8] font-serif-brand">
              Daftar Sesi Pembelajaran ({sessions.length})
            </h2>
            <p className="text-xs sm:text-sm text-[#626A66] dark:text-[#B4C0D0]">
              Klik pada sesi untuk mulai menyimak materi video, naskah PDF, catatan kajian, dan evaluasi kuis.
            </p>
          </div>
        </div>

        {sessions.length > 0 ? (
          <div className="space-y-3.5">
            {sessions.map((session, idx) => {
              const isSessionDone = completedIds.has(session.id);
              return (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session)}
                  className="group nb-card nb-card-interactive p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer bg-white dark:bg-[#16263D]"
                >
                  <div className="flex items-start gap-4">
                    {/* Index Box or Completion Checkmark */}
                    <div className={`w-10 h-10 rounded-md flex items-center justify-center font-extrabold text-sm shrink-0 border-2 border-[#292D2B] transition ${
                      isSessionDone
                        ? 'bg-[#D6AD52] text-[#123D32]'
                        : 'bg-[#FAF7F0] dark:bg-[#243A56] text-[#292D2B] dark:text-[#F1F4F8] group-hover:bg-[#123D32] group-hover:text-[#D6AD52]'
                    }`}>
                      {isSessionDone ? <CheckCircle2 className="w-5 h-5 text-[#123D32]" /> : idx + 1}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-sm sm:text-base text-[#292D2B] dark:text-[#F1F4F8] group-hover:text-[#123D32] dark:group-hover:text-[#D6AD52] transition">
                          {session.title}
                        </h4>
                        {isSessionDone && (
                          <span className="nb-badge bg-[#D6AD52] text-[#123D32] text-[10px]">
                            Selesai
                          </span>
                        )}
                      </div>

                      {session.titleAr && (
                        <p className="font-amiri text-base font-bold text-[#123D32] dark:text-[#D6AD52] leading-tight" dir="rtl">
                          {session.titleAr}
                        </p>
                      )}

                      <p className="text-xs text-[#626A66] dark:text-[#B4C0D0] line-clamp-1 max-w-2xl">
                        {session.description}
                      </p>
                    </div>
                  </div>

                  {/* Badges & Share Actions on Right */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
                    {session.youtubeUrl && (
                      <span className="nb-badge bg-[#FAF7F0] dark:bg-[#243A56] text-[#292D2B] dark:text-[#F1F4F8]">
                        <Video className="w-3.5 h-3.5 text-[#123D32] dark:text-[#D6AD52]" />
                        <span>Video</span>
                      </span>
                    )}
                    {session.pdfUrl && (
                      <span className="nb-badge bg-[#FAF7F0] dark:bg-[#243A56] text-[#292D2B] dark:text-[#F1F4F8]">
                        <FileText className="w-3.5 h-3.5 text-[#D6AD52]" />
                        <span>PDF</span>
                      </span>
                    )}
                    {session.quizId && (
                      <span className="nb-badge bg-[#FAF7F0] dark:bg-[#243A56] text-[#292D2B] dark:text-[#F1F4F8]">
                        <HelpCircle className="w-3.5 h-3.5 text-[#237A70] dark:text-[#A9C5E8]" />
                        <span>Kuis</span>
                      </span>
                    )}

                    {/* Quick Copy Link */}
                    <button
                      type="button"
                      onClick={(e) => handleCopySessionUrl(e, session)}
                      className="nb-btn nb-btn-secondary px-2.5 py-1.5 text-[11px]"
                      title={`Salin link ${session.title}`}
                    >
                      {copiedSessionId === session.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#123D32] dark:text-[#D6AD52]" />
                          <span>Disalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#D6AD52]" />
                          <span>Salin Link</span>
                        </>
                      )}
                    </button>

                    {/* Quick Share Session */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenShareModal(e, session)}
                      className="nb-btn nb-btn-primary px-2.5 py-1.5 text-[11px]"
                      title={`Bagikan ${session.title}`}
                    >
                      <Share2 className="w-3.5 h-3.5 text-[#D6AD52]" />
                      <span>Bagikan</span>
                    </button>

                    <span className="p-1.5 text-[#123D32] dark:text-[#D6AD52] group-hover:translate-x-1 transition-all">
                      <PlayCircle className="w-6 h-6" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 nb-card text-center text-[#626A66] dark:text-[#B4C0D0] text-sm">
            Belum ada sesi pembelajaran yang dipublikasikan untuk kursus ini.
          </div>
        )}
      </div>

      {/* Session Share Modal */}
      {sharingSession && (
        <SessionShareModal
          isOpen={Boolean(sharingSession)}
          onClose={() => setSharingSession(null)}
          session={sharingSession}
          course={course}
        />
      )}
    </div>
  );
};
