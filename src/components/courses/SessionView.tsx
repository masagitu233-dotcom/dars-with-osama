import React, { useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FileText,
  Download,
  Eye,
  CheckCircle2,
  HelpCircle,
  Award,
  Video,
  ListOrdered,
  Lock,
  ExternalLink
} from 'lucide-react';
import { Course, Session, Quiz, Enrollment } from '../../types';
import { YouTubeEmbed } from '../common/YouTubeEmbed';
import { PDFViewerModal } from '../common/PDFViewerModal';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { markSessionCompleted } from '../../firebase/services';
import { autoWrapArabicText, renderFormattedContentHtml } from '../../utils/arabicFontHelper';

interface SessionViewProps {
  course: Course;
  session: Session;
  allSessions: Session[];
  quiz?: Quiz | null;
  enrollment?: Enrollment | null;
  onBackToCourse: () => void;
  onSelectSession: (session: Session) => void;
  onStartQuiz: (quiz: Quiz) => void;
  onOpenCertificate: (course: Course) => void;
  onRefreshEnrollment: () => void;
}

export const SessionView: React.FC<SessionViewProps> = ({
  course,
  session,
  allSessions,
  quiz,
  enrollment,
  onBackToCourse,
  onSelectSession,
  onStartQuiz,
  onOpenCertificate,
  onRefreshEnrollment
}) => {
  const { user, openGuestModal } = useAuth();
  const { t } = useLanguage();
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6 animate-fade-in-up">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center text-emerald-800 dark:text-emerald-400 shadow-xl">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white font-sans">
            Akses Sesi Pembelajaran Terbatas
          </h2>
          <p className="text-stone-600 dark:text-stone-300 text-sm max-w-lg mx-auto leading-relaxed">
            Silakan masuk atau buat akun terlebih dahulu untuk mengakses video pembahasan, naskah PDF, dan kuis evaluasi pada sesi <strong className="text-emerald-700 dark:text-emerald-300">{session.title}</strong>.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => openGuestModal(course, { type: 'session', courseId: course.id, sessionId: session.id })}
            className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg shadow-emerald-950/50 cursor-pointer active:scale-95"
          >
            Masuk / Daftar Akun
          </button>
          <button
            onClick={onBackToCourse}
            className="w-full sm:w-auto px-5 py-3.5 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-xl font-medium text-sm transition duration-200 cursor-pointer active:scale-95 shadow-xs"
          >
            Kembali ke Kurikulum
          </button>
        </div>
      </div>
    );
  }

  // Compute Prev / Next session
  const currentIndex = allSessions.findIndex(s => s.id === session.id);
  const prevSession = currentIndex > 0 ? allSessions[currentIndex - 1] : null;
  const nextSession = currentIndex >= 0 && currentIndex < allSessions.length - 1 ? allSessions[currentIndex + 1] : null;

  const isCompleted = enrollment?.completedSessionIds?.includes(session.id) || false;

  const handleToggleComplete = async () => {
    if (!user) {
      openGuestModal(course, {
        type: 'session',
        courseId: course.id,
        sessionId: session.id,
        onSuccess: async () => {
          onRefreshEnrollment();
        }
      });
      return;
    }

    try {
      setMarkingDone(true);
      await markSessionCompleted(user.uid, course.id, session.id, allSessions.length);
      onRefreshEnrollment();
    } catch (err) {
      console.error('Error marking session complete:', err);
    } finally {
      setMarkingDone(false);
    }
  };

  const handleStartQuizClick = () => {
    if (!quiz) return;
    if (!user) {
      openGuestModal(course, {
        type: 'quiz',
        courseId: course.id,
        sessionId: session.id,
        quizId: quiz.id,
        onSuccess: () => {
          onStartQuiz(quiz);
        }
      });
      return;
    }
    onStartQuiz(quiz);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200 dark:border-stone-800">
        <button
          onClick={onBackToCourse}
          className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white transition text-sm font-medium cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Kurikulum: <strong className="text-stone-900 dark:text-stone-200">{course.title}</strong></span>
        </button>

        <div className="flex items-center gap-2">
          {prevSession && (
            <button
              onClick={() => onSelectSession(prevSession)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-medium transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sesi Sebelumnya</span>
            </button>
          )}

          {nextSession && (
            <button
              onClick={() => onSelectSession(nextSession)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition cursor-pointer shadow-xs"
            >
              <span>Sesi Berikutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Two-Column Classroom Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Primary Learning Content (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* YouTube Video Player (Kept completely stable, non-animated for distraction-free learning) */}
          <div className="space-y-4">
            <YouTubeEmbed url={session.youtubeUrl} title={session.title} />

            {/* Session Headings & Info Panel with gentle fade on session switch */}
            <div
              key={session.id}
              data-aos="fade-up"
              className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 rounded-2xl space-y-4 shadow-sm dark:shadow-lg transition-colors duration-250"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-400 text-xs font-semibold rounded-lg">
                  Sesi #{currentIndex + 1} dari {allSessions.length}
                </span>

                <button
                  onClick={handleToggleComplete}
                  disabled={markingDone}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 shadow-xs active:scale-95 cursor-pointer disabled:opacity-50 ${
                    isCompleted
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 hover:bg-emerald-200 dark:hover:bg-emerald-500/30'
                      : 'bg-stone-100 dark:bg-stone-800 hover:bg-emerald-600 text-stone-700 dark:text-stone-200 hover:text-white border border-stone-200 dark:border-stone-700'
                  }`}
                >
                  {markingDone ? (
                    <div className="w-4 h-4 border-2 border-emerald-600 dark:border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{isCompleted ? 'Telah Diselesaikan' : 'Tandai Selesai Sesi Ini'}</span>
                </button>
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white font-sans leading-snug">
                  {session.title}
                </h1>
                {session.titleAr && (
                  <p className="font-amiri text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-2 leading-relaxed" dir="rtl">
                    {session.titleAr}
                  </p>
                )}
              </div>

              <p className="text-stone-600 dark:text-stone-300 text-sm leading-relaxed">
                {session.description}
              </p>
            </div>
          </div>

          {/* PDF Resource Card (if available) */}
          {session.pdfUrl && (
            <div
              data-aos="fade-up"
              className="bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-600/30 hover:border-amber-500/50 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm dark:shadow-lg transition-all duration-300 hover:shadow-md"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-xl shrink-0 border border-amber-300/80 dark:border-amber-500/20">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-stone-900 dark:text-white text-sm md:text-base">
                    {session.pdfTitle || 'Materi & Naskah Matan PDF'}
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Naskah rujukan asli berbahasa Arab / terjemahan yang dibahas pada sesi ini.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => setPdfModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-95 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer shadow-xs"
                >
                  <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Baca di Web</span>
                </button>
                <a
                  href={session.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white rounded-xl text-xs font-semibold transition-all duration-200 shadow cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh PDF</span>
                </a>
              </div>
            </div>
          )}

          {/* Google Drive PDF Card (if available) */}
          {session.googleDriveUrl && (
            <div
              data-aos="fade-up"
              className="bg-white dark:bg-stone-900 border border-blue-200 dark:border-blue-800/40 hover:border-blue-500/50 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm dark:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-xl shrink-0 border border-blue-200 dark:border-blue-800/40">
                  <ExternalLink className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-stone-900 dark:text-white text-sm md:text-base">
                    Google Drive PDF Modul / Rujukan
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Tautan langsung ke dokumen / folder Google Drive untuk sesi ini.
                  </p>
                </div>
              </div>

              <a
                href={session.googleDriveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs font-semibold transition-all duration-200 shadow cursor-pointer self-end sm:self-center shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Buka di Google Drive</span>
              </a>
            </div>
          )}

          {/* Arabic Matan / Syarah Naskah Box (if present) */}
          {session.descriptionAr && (
            <div
              data-aos="fade-up"
              className="bg-stone-50 dark:bg-stone-900/90 border border-emerald-200 dark:border-emerald-800/60 p-6 md:p-8 rounded-2xl space-y-3 shadow-xs transition-colors"
            >
              <div className="text-xs font-sans font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 border-b border-emerald-200 dark:border-emerald-800/60 pb-2 flex items-center justify-between">
                <span>Matan & Naskah Bahasa Arab</span>
                <span className="text-[10px] font-normal text-stone-400">Naskah Asli</span>
              </div>
              <div
                className="font-amiri text-right text-lg sm:text-xl text-emerald-900 dark:text-emerald-300 leading-loose space-y-3"
                dir="rtl"
                dangerouslySetInnerHTML={{ __html: autoWrapArabicText(session.descriptionAr) }}
              />
            </div>
          )}

          {/* Lesson Notes & Faedah Ilmiah Section with Blog-Quality Typography */}
          {session.lessonNotes && (
            <div
              data-aos="fade-up"
              className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 md:p-8 rounded-2xl space-y-5 shadow-sm dark:shadow-lg transition-colors duration-250"
            >
              <div className="flex items-center gap-2.5 border-b border-stone-200 dark:border-stone-800 pb-4">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/60 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-serif-brand text-stone-900 dark:text-white leading-snug">
                    Catatan Pelajaran & Faedah Ilmiah
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-sans">
                    Rangkuman poin penting, syarah, dan dalil-dalil ilmiah pada sesi ini.
                  </p>
                </div>
              </div>

              {/* Rich Blog-Quality Typography Content Renderer */}
              <div
                className="prose dark:prose-invert max-w-none text-stone-800 dark:text-stone-200 text-sm sm:text-base leading-relaxed space-y-4 font-sans blog-content"
                dangerouslySetInnerHTML={{ __html: renderFormattedContentHtml(session.lessonNotes) }}
              />
            </div>
          )}

          {/* Quiz Evaluation Banner */}
          {quiz && (
            <div
              data-aos="fade-up"
              className="bg-gradient-to-r from-emerald-50 via-white to-stone-50 dark:from-emerald-950/70 dark:via-stone-900 dark:to-stone-900 border border-emerald-300 dark:border-emerald-600/40 hover:border-emerald-500/60 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-sm dark:shadow-xl transition-all duration-300 hover:shadow-md group"
            >
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold rounded-md border border-emerald-300 dark:border-emerald-700/50">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Ujian Evaluasi Pemahaman</span>
                </div>
                <h3 className="text-lg font-bold text-stone-900 dark:text-white font-sans group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                  {quiz.title}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {quiz.questions?.length || 0} Pertanyaan • Batas Kelulusan: {quiz.passingScore}% • Waktu: {quiz.timeLimitMinutes > 0 ? `${quiz.timeLimitMinutes} Menit` : 'Tanpa Batas'}
                </p>
              </div>

              <button
                onClick={handleStartQuizClick}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-md shadow-emerald-950/20 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <span>Mulai Kuis Sekarang</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar: Sessions Playlist & Progress */}
        <div className="lg:col-span-4 space-y-6" data-aos="fade-left">
          {/* Completed Notice */}
          {enrollment?.isCompleted && (
            <div className="bg-gradient-to-tr from-emerald-50 to-white dark:from-emerald-950/60 dark:to-stone-900 border border-emerald-300 dark:border-emerald-500/40 p-5 rounded-2xl text-center space-y-2 shadow-sm dark:shadow-lg animate-fade-in-up">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-300 dark:border-emerald-500/30">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-stone-900 dark:text-white text-sm">Alhamdulillah! Seluruh Sesi Selesai</h4>
              <p className="text-xs text-stone-600 dark:text-stone-300">
                Anda telah menyelesaikan seluruh materi pembahasan pada kurikulum ini.
              </p>
            </div>
          )}

          {/* Playlist Card */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-lg sticky top-24 transition-colors duration-250">
            <div className="p-4 bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-semibold text-stone-900 dark:text-white text-sm">Daftar Sesi Kursus</h3>
              </div>
              <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                {enrollment?.completedSessionIds?.length || 0}/{allSessions.length} Selesai
              </span>
            </div>

            {/* Progress Bar */}
            {enrollment && (
              <div className="w-full bg-stone-200 dark:bg-stone-800 h-1">
                <div
                  className="bg-emerald-500 h-1 transition-all duration-700 ease-out"
                  style={{ width: `${enrollment.progressPercent}%` }}
                />
              </div>
            )}

            <div className="p-2 space-y-1.5 max-h-[500px] overflow-y-auto">
              {allSessions.map((s, idx) => {
                const isActive = s.id === session.id;
                const isItemDone = enrollment?.completedSessionIds?.includes(s.id);

                return (
                  <button
                    key={s.id}
                    onClick={() => onSelectSession(s)}
                    className={`w-full text-left p-3 rounded-xl text-xs transition-all duration-200 flex items-start gap-3 cursor-pointer ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/90 border border-emerald-400 dark:border-emerald-600/70 text-emerald-900 dark:text-white shadow-xs ring-1 ring-emerald-500/20 scale-[1.01]'
                        : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white border border-transparent'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 transition-transform duration-200 ${
                      isItemDone
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        : isActive
                        ? 'bg-emerald-600 text-white scale-105'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                    }`}>
                      {isItemDone ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : idx + 1}
                    </div>

                    <div className="flex-1 truncate">
                      <p className={`font-semibold truncate transition-colors ${isActive ? 'text-emerald-800 dark:text-emerald-300' : 'text-stone-800 dark:text-stone-200'}`}>
                        {s.title}
                      </p>
                      {s.titleAr && (
                        <p className="font-amiri text-xs text-emerald-700 dark:text-emerald-400/80 truncate text-right mt-0.5" dir="rtl">
                          {s.titleAr}
                        </p>
                      )}
                    </div>

                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse ml-1 self-center shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* PDF Viewer Modal */}
      <PDFViewerModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        pdfUrl={session.pdfUrl}
        pdfTitle={session.pdfTitle || session.title}
      />
    </div>
  );
};
