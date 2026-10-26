import React, { useState, useEffect, useRef } from 'react';
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
  ListOrdered,
  Lock,
  ExternalLink,
  Copy,
  Check,
  Share2,
  X
} from 'lucide-react';
import { Course, Session, Quiz, Enrollment } from '../../types';
import { YouTubeEmbed } from '../common/YouTubeEmbed';
import { PDFViewerModal } from '../common/PDFViewerModal';
import { SessionShareModal } from './SessionShareModal';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { markSessionCompleted } from '../../firebase/services';
import { autoWrapArabicText, renderFormattedContentHtml } from '../../utils/arabicFontHelper';
import { useSessionSEO } from '../../hooks/useSessionSEO';
import { buildSessionShareData, canAccessSessionPublicly } from '../../utils/sessionShareHelper';

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
  onRefreshEnrollment
}) => {
  const { user, isAdmin, loading: authLoading, openGuestModal, openAuthModal } = useAuth();
  useLanguage();
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(true);

  // Dynamically inject OpenGraph, Twitter Card, and Canonical URL metadata for this session
  useSessionSEO(session, course);

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://darswithosama.com';
  const shareData = buildSessionShareData(session, course, origin);

  const handleCopySessionLink = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareData.url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareData.url;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3500);
    } catch (err) {
      console.error('Failed to copy session link:', err);
    }
  };

  const handleShareSession = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareData.ogTitle,
          text: `Yuk, pelajari sesi ${session.title} bersama Dars with Osama. Tonton videonya di sini:`,
          url: shareData.url
        });
        return;
      } catch {
        // Fallback to copying share invitation + opening share modal
      }
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareData.shareMessage);
      }
    } catch {
      // Ignore clipboard permission errors on fallback
    }
    setShareModalOpen(true);
  };

  // Ensure active session is kept in view inside playlist container when session changes
  const playlistScrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      const container = playlistScrollRef.current;
      if (!container) return;
      const activeEl = container.querySelector('[data-active-session="true"]') as HTMLElement | null;
      if (activeEl && container.scrollHeight > container.clientHeight) {
        const targetTop = activeEl.offsetTop - container.offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2;
        container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [session.id]);

  // Block public access to unpublished / draft sessions unless user is admin
  if (!canAccessSessionPublicly(session, course) && !isAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6 animate-fade-in-up">
        <div className="w-16 h-16 mx-auto rounded-lg bg-[#D6AD52] border-2 border-[#292D2B] shadow-[4px_4px_0px_#292D2B] flex items-center justify-center text-[#123D32]">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#292D2B] dark:text-[#F1F4F8] font-serif-brand">
            Sesi Pembelajaran Belum Dipublikasikan
          </h2>
          <p className="text-[#626A66] dark:text-[#B4C0D0] text-sm max-w-lg mx-auto leading-relaxed">
            Mohon maaf, sesi pembelajaran ini masih berstatus draf atau tidak tersedia untuk akses publik saat ini.
          </p>
        </div>
        <div className="flex items-center justify-center pt-2">
          <button
            onClick={onBackToCourse}
            className="nb-btn nb-btn-primary px-5 py-3 text-sm"
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

  const playlistMarginClass = isPlaylistOpen ? 'lg:mr-[340px] xl:mr-[400px]' : 'mr-0';

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-3 sm:py-6 space-y-3.5 sm:space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b-2 border-[#292D2B] dark:border-[#34465D] transition-all duration-300 ${playlistMarginClass}`}>
        <button
          onClick={onBackToCourse}
          className="inline-flex items-center gap-2 text-[#292D2B] dark:text-[#F1F4F8] hover:text-[#123D32] dark:hover:text-[#D6AD52] transition text-sm font-bold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Kurikulum: <strong className="underline decoration-[#D6AD52] decoration-2">{course.title}</strong></span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Session Playlist Button */}
          <button
            type="button"
            onClick={() => setIsPlaylistOpen(!isPlaylistOpen)}
            className={`nb-btn ${isPlaylistOpen ? 'nb-btn-secondary' : 'nb-btn-gold'} px-3 py-1.5 text-xs flex items-center gap-1.5`}
            title={isPlaylistOpen ? 'Sembunyikan Panel Sesi (Perluas Tampilan)' : 'Buka Daftar Sesi Kursus'}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isPlaylistOpen ? 'Sembunyikan Sesi' : 'Buka Daftar Sesi'}</span>
            <span className="sm:hidden">{isPlaylistOpen ? 'Tutup Sesi' : 'Daftar Sesi'}</span>
          </button>

          {/* Salin Link Button */}
          <button
            type="button"
            onClick={handleCopySessionLink}
            className="nb-btn nb-btn-secondary px-3 py-1.5 text-xs"
            title="Salin tautan permanen sesi pembelajaran ini"
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5 text-[#123D32] dark:text-[#D6AD52]" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#D6AD52]" />
            )}
            <span>{copiedLink ? 'Link Disalin!' : 'Salin Link'}</span>
          </button>

          {/* Bagikan Sesi Button */}
          <button
            type="button"
            onClick={handleShareSession}
            className="nb-btn nb-btn-primary px-3 py-1.5 text-xs"
            title="Bagikan sesi pembelajaran ini"
          >
            <Share2 className="w-3.5 h-3.5 text-[#D6AD52]" />
            <span>Bagikan</span>
          </button>

          {prevSession && (
            <button
              onClick={() => onSelectSession(prevSession)}
              className="nb-btn nb-btn-secondary px-3 py-1.5 text-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sesi Sebelumnya</span>
            </button>
          )}

          {nextSession && (
            <button
              onClick={() => onSelectSession(nextSession)}
              className="nb-btn nb-btn-gold px-3 py-1.5 text-xs"
            >
              <span>Sesi Berikutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Classroom Layout Container */}
      <div className="relative">
        {copiedLink && (
          <div className={`mb-4 ${playlistMarginClass} p-3.5 rounded-lg bg-[#EFE5D2] dark:bg-[#16263D] border-2 border-[#292D2B] dark:border-[#34465D] shadow-[4px_4px_0px_#292D2B] dark:shadow-[4px_4px_0px_#101B2D] text-[#292D2B] dark:text-[#F1F4F8] text-xs flex items-center justify-between animate-fade-in`}>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#123D32] dark:text-[#D6AD52] shrink-0" />
              <span>
                <strong>Link sesi berhasil disalin!</strong> ({shareData.url}) — Siap dibagikan ke WhatsApp, Telegram, atau media sosial.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="text-[#123D32] dark:text-[#D6AD52] font-extrabold underline ml-2 shrink-0 cursor-pointer"
            >
              Opsi Bagikan
            </button>
          </div>
        )}

        {/* Sticky Mobile Video Wrapper: sticks directly below AppHeader (--app-header-height) on mobile (< lg), static on desktop (lg:) */}
        <div
          data-testid="session-video-sticky-wrapper"
          className={`sticky top-[var(--app-header-height,57px)] z-20 lg:static lg:z-auto -mx-3 px-3 py-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 lg:py-0 bg-white/95 dark:bg-[#101B2D]/95 lg:bg-transparent dark:lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none border-b-2 border-[#292D2B] dark:border-[#34465D] lg:border-none shadow-sm lg:shadow-none transition-all duration-300 ${playlistMarginClass} mb-4 lg:mb-6`}
        >
          {authLoading ? (
            <div className="w-full aspect-video rounded-lg bg-white dark:bg-[#16263D] border-2 border-[#292D2B] dark:border-[#34465D] flex flex-col items-center justify-center p-6 text-center space-y-3 max-lg:max-h-[min(36dvh,calc(100dvh-var(--app-header-height,57px)-11rem))] max-lg:mx-auto">
              <div className="w-8 h-8 border-3 border-[#123D32] dark:border-[#D6AD52] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-[#626A66] dark:text-[#B4C0D0] font-bold">Memeriksa status akun siswa...</p>
            </div>
          ) : !user ? (
            <div className="w-full aspect-video rounded-lg bg-[#123D32] dark:bg-[#16263D] border-2 border-[#292D2B] dark:border-[#34465D] shadow-[4px_4px_0px_#292D2B] text-[#FAF7F0] flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-2.5 sm:space-y-3 relative overflow-hidden max-lg:max-h-[min(36dvh,calc(100dvh-var(--app-header-height,57px)-11rem))] max-lg:mx-auto">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-[#D6AD52] border-2 border-[#292D2B] text-[#123D32]">
                <Lock className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="space-y-1 max-w-md px-2">
                <h3 className="text-xs sm:text-base font-extrabold text-[#FAF7F0] font-serif-brand">
                  Video Pembelajaran Khusus Siswa Terdaftar
                </h3>
                <p className="text-[11px] sm:text-xs text-[#FAF7F0]/85 leading-relaxed line-clamp-2 sm:line-clamp-none">
                  Silakan masuk ke akun Dars with Osama untuk mulai belajar, memutar video syarah lengkap, menyimak naskah materi, dan mengikuti evaluasi pemahaman.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => openAuthModal('login', { type: 'session', courseId: course.id, sessionId: session.id })}
                  className="nb-btn nb-btn-gold px-3.5 sm:px-4 py-2 text-xs min-h-[36px]"
                >
                  Masuk Sekarang
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('register', { type: 'session', courseId: course.id, sessionId: session.id })}
                  className="nb-btn nb-btn-secondary px-3.5 sm:px-4 py-2 text-xs min-h-[36px]"
                >
                  Daftar Akun Baru
                </button>
              </div>
            </div>
          ) : (
            <YouTubeEmbed
              url={session.youtubeUrl}
              title={session.title}
              className="max-lg:max-h-[min(36dvh,calc(100dvh-var(--app-header-height,57px)-11rem))] max-lg:mx-auto"
            />
          )}
        </div>

        {/* Left Primary Learning Content (Scrolls smoothly beneath sticky video on mobile) */}
        <div className={`space-y-6 transition-all duration-300 ${playlistMarginClass}`}>
          {/* Session Headings & Info Panel */}
          <div
            key={session.id}
            className="nb-card p-3.5 sm:p-6 space-y-3.5 sm:space-y-4 bg-white dark:bg-[#16263D] border-0 sm:border-2 shadow-none sm:shadow-[4px_4px_0px_#292D2B] dark:sm:shadow-[4px_4px_0px_#101B2D]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="nb-badge bg-[#123D32] text-[#D6AD52]">
                Sesi #{currentIndex >= 0 ? currentIndex + 1 : session.order || 1} dari {allSessions.length || 1}
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShareModalOpen(true)}
                  className="nb-btn nb-btn-secondary px-3.5 py-2 text-xs"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#123D32] dark:text-[#D6AD52]" />
                  <span>Bagikan Sesi</span>
                </button>

                <button
                  onClick={handleToggleComplete}
                  disabled={markingDone}
                  className={`nb-btn px-4 py-2 text-xs disabled:opacity-50 ${
                    isCompleted
                      ? 'nb-btn-gold'
                      : 'nb-btn-primary'
                  }`}
                >
                  {markingDone ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{isCompleted ? 'Telah Diselesaikan' : 'Tandai Selesai Sesi Ini'}</span>
                </button>
              </div>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#292D2B] dark:text-[#F1F4F8] font-serif-brand leading-snug">
                {session.title}
              </h1>
              {session.titleAr && (
                <p className="font-amiri text-2xl font-bold text-[#123D32] dark:text-[#D6AD52] mt-2 leading-relaxed" dir="rtl">
                  {session.titleAr}
                </p>
              )}
            </div>

            <p className="text-[#626A66] dark:text-[#B4C0D0] text-sm leading-relaxed">
              {session.description}
            </p>
          </div>

          {/* PDF Resource Card (if available) */}
          {session.pdfUrl && (
            <div className="nb-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAF7F0] dark:bg-[#16263D]">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-[#D6AD52] text-[#123D32] rounded-md shrink-0 border-2 border-[#292D2B]">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-[#292D2B] dark:text-[#F1F4F8] text-sm md:text-base">
                    {session.pdfTitle || 'Materi & Naskah Matan PDF'}
                  </h4>
                  <p className="text-xs text-[#626A66] dark:text-[#B4C0D0] mt-0.5">
                    Naskah rujukan asli berbahasa Arab / terjemahan yang dibahas pada sesi ini.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      openGuestModal(course, {
                        type: 'session',
                        courseId: course.id,
                        sessionId: session.id,
                        onSuccess: () => setPdfModalOpen(true)
                      });
                      return;
                    }
                    setPdfModalOpen(true);
                  }}
                  className="nb-btn nb-btn-secondary px-3.5 py-2 text-xs min-h-[40px]"
                >
                  <Eye className="w-4 h-4 text-[#123D32] dark:text-[#D6AD52]" />
                  <span>Baca di Web</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      openGuestModal(course, {
                        type: 'session',
                        courseId: course.id,
                        sessionId: session.id
                      });
                      return;
                    }
                    if (session.pdfUrl) {
                      window.open(session.pdfUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className="nb-btn nb-btn-gold px-3.5 py-2 text-xs min-h-[40px]"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh PDF</span>
                </button>
              </div>
            </div>
          )}

          {/* Google Drive PDF Card (if available) */}
          {session.googleDriveUrl && (
            <div className="nb-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#16263D]">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-[#237A70] text-white rounded-md shrink-0 border-2 border-[#292D2B]">
                  <ExternalLink className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-[#292D2B] dark:text-[#F1F4F8] text-sm md:text-base">
                    Google Drive PDF Modul / Rujukan
                  </h4>
                  <p className="text-xs text-[#626A66] dark:text-[#B4C0D0] mt-0.5">
                    Tautan langsung ke dokumen / folder Google Drive untuk sesi ini.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    openGuestModal(course, {
                      type: 'session',
                      courseId: course.id,
                      sessionId: session.id
                    });
                    return;
                  }
                  if (session.googleDriveUrl) {
                    window.open(session.googleDriveUrl, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="nb-btn bg-[#237A70] text-white border-2 border-[#292D2B] px-4 py-2 text-xs self-end sm:self-center shrink-0 min-h-[40px]"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Buka di Google Drive</span>
              </button>
            </div>
          )}

          {/* Arabic Matan / Syarah Naskah Box (if present) - Calm Reading Surface */}
          {session.descriptionAr && (
            <div className="nb-reading-surface p-3.5 sm:p-6 md:p-8 space-y-3 bg-[#FAF7F0] dark:bg-[#16263D] border-0 sm:border-2 shadow-none sm:shadow-[4px_4px_0px_rgba(41,45,43,0.12)]">
              <div className="text-xs font-sans font-extrabold uppercase tracking-wider text-[#123D32] dark:text-[#D6AD52] border-b-2 border-[#292D2B]/15 dark:border-[#34465D] pb-2 flex items-center justify-between">
                <span>Matan & Naskah Bahasa Arab</span>
                <span className="text-[10px] font-bold text-[#626A66] dark:text-[#B4C0D0]">Naskah Asli</span>
              </div>
              <div
                className="font-amiri text-right text-base sm:text-xl text-[#123D32] dark:text-[#F1F4F8] leading-loose space-y-3"
                dir="rtl"
                dangerouslySetInnerHTML={{ __html: autoWrapArabicText(session.descriptionAr) }}
              />
            </div>
          )}

          {/* Lesson Notes & Faedah Ilmiah Section - Calm Reading Surface */}
          {session.lessonNotes && (
            <div className="nb-reading-surface p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-5 bg-white dark:bg-[#16263D] border-0 sm:border-2 shadow-none sm:shadow-[4px_4px_0px_rgba(41,45,43,0.12)]">
              <div className="flex items-center gap-2.5 border-b-2 border-[#292D2B]/15 dark:border-[#34465D] pb-4">
                <div className="p-2 rounded-md bg-[#123D32] text-[#D6AD52] border-2 border-[#292D2B] shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold font-serif-brand text-[#292D2B] dark:text-[#F1F4F8] leading-snug">
                    Catatan Pelajaran & Faedah Ilmiah
                  </h3>
                  <p className="text-xs text-[#626A66] dark:text-[#B4C0D0] font-sans">
                    Rangkuman poin penting, syarah, dan dalil-dalil ilmiah pada sesi ini.
                  </p>
                </div>
              </div>

              {/* Rich Blog-Quality Typography Content Renderer */}
              <div
                className="prose dark:prose-invert max-w-none text-[#292D2B] dark:text-[#F1F4F8] text-xs sm:text-base leading-relaxed space-y-3.5 sm:space-y-4 font-sans blog-content"
                dangerouslySetInnerHTML={{ __html: renderFormattedContentHtml(session.lessonNotes) }}
              />
            </div>
          )}

          {/* Quiz Evaluation Banner */}
          {quiz && (
            <div className="nb-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-[#123D32] dark:bg-[#16263D] text-[#FAF7F0] dark:text-[#F1F4F8]">
              <div className="space-y-1.5">
                <div className="nb-badge bg-[#D6AD52] text-[#123D32]">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Ujian Evaluasi Pemahaman</span>
                </div>
                <h3 className="text-lg font-extrabold text-[#FAF7F0] dark:text-[#F1F4F8] font-serif-brand">
                  {quiz.title}
                </h3>
                <p className="text-xs text-[#FAF7F0]/80 dark:text-[#B4C0D0]">
                  {quiz.questions?.length || 0} Pertanyaan • Batas Kelulusan: {quiz.passingScore}% • Waktu: {quiz.timeLimitMinutes > 0 ? `${quiz.timeLimitMinutes} Menit` : 'Tanpa Batas'}
                </p>
              </div>

              <button
                onClick={handleStartQuizClick}
                className="nb-btn nb-btn-gold px-6 py-3 text-sm shrink-0"
              >
                <span>Mulai Kuis Sekarang</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar: Sessions Playlist & Progress (Fixed to Viewport on Desktop & Responsive on Mobile) */}
        <aside className={`${isPlaylistOpen ? 'flex' : 'hidden'} lg:fixed lg:top-[72px] lg:right-4 xl:right-8 lg:w-[320px] xl:w-[380px] lg:h-[calc(100dvh-5.5rem)] lg:z-20 flex-col space-y-4 mt-8 lg:mt-0 animate-fade-in`}>
          {/* Completed Notice */}
          {enrollment?.isCompleted && (
            <div className="nb-card bg-[#D6AD52] text-[#123D32] p-4 text-center space-y-1.5 shrink-0">
              <div className="w-8 h-8 rounded-md bg-[#123D32] text-[#D6AD52] flex items-center justify-center mx-auto border-2 border-[#292D2B]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h4 className="font-extrabold text-[#123D32] text-xs">Alhamdulillah! Seluruh Sesi Selesai</h4>
              <p className="text-[11px] text-[#123D32]/85 font-medium">
                Anda telah menyelesaikan seluruh materi pembahasan pada kurikulum ini.
              </p>
            </div>
          )}

          {/* Playlist Card - Fixed Container with Internal Scroll */}
          <div className="nb-card overflow-hidden flex flex-col flex-1 min-h-0 bg-white dark:bg-[#16263D]">
            <div className="p-4 bg-[#123D32] dark:bg-[#16263D] text-[#FAF7F0] border-b-2 border-[#292D2B] dark:border-[#34465D] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-[#D6AD52]" />
                <h3 className="font-extrabold text-[#FAF7F0] text-sm">Daftar Sesi Kursus</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#D6AD52] font-bold">
                  {enrollment?.completedSessionIds?.length || 0}/{allSessions.length} Selesai
                </span>
                <button
                  type="button"
                  onClick={() => setIsPlaylistOpen(false)}
                  className="p-1 rounded text-[#FAF7F0] dark:text-[#D6AD52] hover:bg-black/20 dark:hover:bg-white/10 transition cursor-pointer"
                  title="Sembunyikan Panel Sesi"
                  aria-label="Sembunyikan panel sesi"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {enrollment && (
              <div className="w-full bg-[#EFE5D2] dark:bg-[#101B2D] h-2 border-b-2 border-[#292D2B] dark:border-[#34465D] shrink-0">
                <div
                  className="bg-[#D6AD52] h-full transition-all duration-700 ease-out"
                  style={{ width: `${enrollment.progressPercent}%` }}
                />
              </div>
            )}

            <div ref={playlistScrollRef} className="p-2.5 space-y-2 flex-1 min-h-0 overflow-y-auto">
              {allSessions.map((s, idx) => {
                const isActive = s.id === session.id;
                const isItemDone = enrollment?.completedSessionIds?.includes(s.id);

                return (
                  <button
                    key={s.id}
                    data-active-session={isActive ? 'true' : 'false'}
                    onClick={() => onSelectSession(s)}
                    className={`w-full text-left p-3 rounded-md text-xs transition-all duration-150 flex items-start gap-3 cursor-pointer border-2 ${
                      isActive
                        ? 'bg-[#EFE5D2] dark:bg-[#243A56] border-[#292D2B] dark:border-[#34465D] text-[#292D2B] dark:text-[#F1F4F8] shadow-[3px_3px_0px_#292D2B] dark:shadow-[3px_3px_0px_#101B2D]'
                        : 'text-[#292D2B] dark:text-[#F1F4F8] hover:bg-[#FAF7F0] dark:hover:bg-[#243A56]/70 border-transparent hover:border-[#292D2B]/30'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center font-extrabold text-[11px] shrink-0 border-2 border-[#292D2B] ${
                      isItemDone
                        ? 'bg-[#D6AD52] text-[#123D32]'
                        : isActive
                        ? 'bg-[#123D32] text-[#FAF7F0] dark:bg-[#243A56] dark:text-[#D6AD52]'
                        : 'bg-[#FAF7F0] dark:bg-[#243A56] text-[#292D2B] dark:text-[#F1F4F8]'
                    }`}>
                      {isItemDone ? <CheckCircle2 className="w-3.5 h-3.5 text-[#123D32]" /> : idx + 1}
                    </div>

                    <div className="flex-1 truncate">
                      <p className={`font-extrabold truncate ${isActive ? 'text-[#123D32] dark:text-[#D6AD52]' : 'text-[#292D2B] dark:text-[#F1F4F8]'}`}>
                        {s.title}
                      </p>
                      {s.titleAr && (
                        <p className="font-amiri text-xs text-[#123D32] dark:text-[#D6AD52] truncate text-right mt-0.5" dir="rtl">
                          {s.titleAr}
                        </p>
                      )}
                    </div>

                    {isActive && (
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#D6AD52] border border-[#292D2B] ml-1 self-center shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* PDF Viewer Modal */}
      <PDFViewerModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        pdfUrl={session.pdfUrl}
        pdfTitle={session.pdfTitle || session.title}
      />

      {/* Session Share Modal */}
      <SessionShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        session={session}
        course={course}
      />
    </div>
  );
};
