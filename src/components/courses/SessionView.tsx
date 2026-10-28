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
  X,
  RotateCcw
} from 'lucide-react';
import { Course, Session, Quiz, Enrollment, QuizAttempt } from '../../types';
import { YouTubeEmbed } from '../common/YouTubeEmbed';
import { PDFViewerModal } from '../common/PDFViewerModal';
import { SessionShareModal } from './SessionShareModal';
import { CourseShareModal } from './CourseShareModal';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { markSessionCompleted, getQuizById, getUserQuizAttempts } from '../../firebase/services';
import { autoWrapArabicText, renderFormattedContentHtml } from '../../utils/arabicFontHelper';
import { useSessionSEO } from '../../hooks/useSessionSEO';
import { buildSessionShareData, canAccessSessionPublicly } from '../../utils/sessionShareHelper';
import { buildCourseShareUrl, copyCourseUrlToClipboard } from '../../utils/courseShareHelper';
import {
  canCompleteSession,
  canAdvanceToNextSession,
  evaluateSessionQuizStatus,
  findFirstUncompletedPrecedingQuizSession,
  SessionQuizStatus
} from '../../utils/quizFlowHelper';
import { QuizRequiredModal } from './QuizRequiredModal';
import { ReadingFontControls, useReadingFontSize } from '../common/ReadingFontControls';

interface SessionViewProps {
  course: Course;
  session: Session;
  allSessions: Session[];
  quiz?: Quiz | null;
  enrollment?: Enrollment | null;
  onBackToCourse: () => void;
  onSelectSession: (session: Session) => void;
  onStartQuiz: (quiz: Quiz, session?: Session) => void;
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
  const { user, isAdmin, loading: authLoading, openGuestModal, openAuthModal, showToast } = useAuth();
  useLanguage();
  const fontControl = useReadingFontSize();
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [courseShareModalOpen, setCourseShareModalOpen] = useState(false);
  const [copiedCourseLink, setCopiedCourseLink] = useState(false);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(true);
  const [userAttempts, setUserAttempts] = useState<QuizAttempt[]>([]);
  const [quizzesMap, setQuizzesMap] = useState<Record<string, Quiz>>({});
  const [quizWarningModalOpen, setQuizWarningModalOpen] = useState(false);
  const [pendingBlockingSession, setPendingBlockingSession] = useState<Session | null>(null);
  const [pendingBlockingQuiz, setPendingBlockingQuiz] = useState<Quiz | null>(null);
  const [pendingQuizStatus, setPendingQuizStatus] = useState<SessionQuizStatus | null>(null);

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

  const handleShareCourse = async () => {
    const courseUrl = buildCourseShareUrl(course, origin);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${course.title} - Dars with Osama`,
          text: `Yuk, pelajari kurikulum "${course.title}" bersama ${course.instructor} di platform Dars with Osama:`,
          url: courseUrl
        });
        return;
      } catch {
        // Fallback to modal
      }
    }
    const success = await copyCourseUrlToClipboard(courseUrl);
    if (success) {
      setCopiedCourseLink(true);
      setTimeout(() => setCopiedCourseLink(false), 3000);
    }
    setCourseShareModalOpen(true);
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

  // Fetch user's quiz attempts whenever user or enrollment changes
  useEffect(() => {
    if (!user) {
      setUserAttempts([]);
      return;
    }
    getUserQuizAttempts(user.uid).then(attempts => {
      setUserAttempts(attempts);
    });
  }, [user, enrollment]);

  // Pre-load quiz data for any session with a linked quiz
  useEffect(() => {
    const quizIdsToFetch = allSessions
      .map(s => s.quizId)
      .filter((id): id is string => Boolean(id && id.trim().length > 0));

    if (quizIdsToFetch.length === 0) return;

    Promise.all(
      quizIdsToFetch.map(async id => {
        if (quiz && quiz.id === id) return quiz;
        return getQuizById(id);
      })
    ).then(fetched => {
      const map: Record<string, Quiz> = {};
      fetched.forEach(q => {
        if (q) map[q.id] = q;
      });
      setQuizzesMap(prev => ({ ...prev, ...map }));
    });
  }, [allSessions, quiz]);

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

  const handleStartQuizForSession = async (targetSession: Session, preloadedQuiz?: Quiz | null) => {
    const targetQuizId = targetSession.quizId;
    if (!targetQuizId) return;

    if (!user) {
      openGuestModal(course, {
        type: 'quiz',
        courseId: course.id,
        sessionId: targetSession.id,
        quizId: targetQuizId,
        onSuccess: async () => {
          const q = preloadedQuiz || quizzesMap[targetQuizId] || (await getQuizById(targetQuizId));
          if (q) onStartQuiz(q, targetSession);
        }
      });
      return;
    }

    // Verify preceding sessions in this course do not have uncompleted quizzes
    const blockCheck = findFirstUncompletedPrecedingQuizSession(
      allSessions,
      targetSession,
      userAttempts,
      quizzesMap
    );
    if (blockCheck.hasBlockingQuiz && blockCheck.blockingSession) {
      setPendingBlockingSession(blockCheck.blockingSession);
      setPendingBlockingQuiz(blockCheck.blockingQuiz || null);
      setPendingQuizStatus(blockCheck.status || null);
      setQuizWarningModalOpen(true);
      return;
    }

    let q: Quiz | null = preloadedQuiz || quizzesMap[targetQuizId] || null;
    if (!q || q.id !== targetQuizId) {
      q = await getQuizById(targetQuizId);
    }
    if (q) {
      onStartQuiz(q, targetSession);
    }
  };

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

    // 1. Strict sequential validation: Verify preceding sessions in course have passed their quizzes
    const precedingQuizCheck = findFirstUncompletedPrecedingQuizSession(
      allSessions,
      session,
      userAttempts,
      quizzesMap
    );
    if (precedingQuizCheck.hasBlockingQuiz && precedingQuizCheck.blockingSession) {
      showToast(
        `Anda masih memiliki kuis yang belum diselesaikan pada sesi sebelumnya (${precedingQuizCheck.blockingSession.title}). Silakan selesaikan kuis sesi tersebut terlebih dahulu.`
      );
      setPendingBlockingSession(precedingQuizCheck.blockingSession);
      setPendingBlockingQuiz(precedingQuizCheck.blockingQuiz || null);
      setPendingQuizStatus(precedingQuizCheck.status || null);
      setQuizWarningModalOpen(true);
      return;
    }

    // 2. Mandatory current session quiz validation before marking session complete
    const quizValidation = canCompleteSession(session, quiz, userAttempts);
    if (!quizValidation.allowed) {
      showToast(
        quizValidation.reason ||
          'Silakan kerjakan kuis sesi ini terlebih dahulu sebelum menyelesaikan pembelajaran.'
      );
      // Automatically redirect student to the session quiz
      await handleStartQuizForSession(session, quiz);
      return;
    }

    try {
      setMarkingDone(true);
      await markSessionCompleted(user.uid, course.id, session.id, allSessions.length);
      onRefreshEnrollment();
    } catch (err: any) {
      if (err?.code === 'QUIZ_REQUIRED') {
        showToast(
          err.message ||
            'Silakan kerjakan kuis sesi ini terlebih dahulu sebelum menyelesaikan pembelajaran.'
        );
        handleStartQuizForSession(session, quiz || err.quiz);
      } else {
        console.error('Error marking session complete:', err);
      }
    } finally {
      setMarkingDone(false);
    }
  };

  const handleNextSessionClick = () => {
    if (!nextSession) return;
    // Authenticated students can watch all video sessions without quiz gate
    onSelectSession(nextSession);
  };

  const handlePlaylistSelectSession = (targetSession: Session) => {
    if (targetSession.id === session.id) return;
    // Authenticated students can watch all video sessions without quiz gate
    onSelectSession(targetSession);
  };

  const precedingCheck = findFirstUncompletedPrecedingQuizSession(
    allSessions,
    session,
    userAttempts,
    quizzesMap
  );
  const currentQuizCheck = canCompleteSession(session, quiz, userAttempts);
  const isCompletionEligible = !precedingCheck.hasBlockingQuiz && currentQuizCheck.allowed;

  const playlistMarginClass = isPlaylistOpen ? 'lg:mr-[340px] xl:mr-[400px]' : 'mr-0';


  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-3 sm:py-6 space-y-3.5 sm:space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b-2 border-[#171717] dark:border-[#4CA7A1] transition-all duration-300 ${playlistMarginClass}`}>
        <button
          onClick={onBackToCourse}
          className="inline-flex items-center gap-2 text-[#171717] dark:text-[#CEFEF1] hover:text-[#123D32] dark:hover:text-white transition text-sm font-bold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1]" />
          <span>Kembali ke Kurikulum: <strong className="underline decoration-[#4CA7A1] decoration-2">{course.title}</strong></span>
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
              <Check className="w-3.5 h-3.5 text-[#123D32] dark:text-[#CEFEF1]" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#123D32] dark:text-[#4CA7A1]" />
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
            <Share2 className="w-3.5 h-3.5" />
            <span>Bagikan Sesi</span>
          </button>

          {/* Bagikan Pembelajaran / Kurikulum Utuh Button */}
          <button
            type="button"
            onClick={handleShareCourse}
            className="nb-btn nb-btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
            title="Bagikan tautan kurikulum pembelajaran secara keseluruhan"
          >
            {copiedCourseLink ? (
              <Check className="w-3.5 h-3.5 text-[#123D32] dark:text-[#CEFEF1]" />
            ) : (
              <BookOpen className="w-3.5 h-3.5 text-[#123D32] dark:text-[#4CA7A1]" />
            )}
            <span>{copiedCourseLink ? 'Link Kursus Disalin!' : 'Bagikan Kursus'}</span>
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
              onClick={handleNextSessionClick}
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
          <div className={`mb-4 ${playlistMarginClass} p-3.5 rounded-lg bg-[#EFE5D2] dark:bg-[#1F5F63] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#001722] text-[#171717] dark:text-[#CEFEF1] text-xs flex items-center justify-between animate-fade-in`}>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#123D32] dark:text-[#CEFEF1] shrink-0" />
              <span>
                <strong>Link sesi berhasil disalin!</strong> ({shareData.url}) — Siap dibagikan ke WhatsApp, Telegram, atau media sosial.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="text-[#123D32] dark:text-[#CEFEF1] font-extrabold underline ml-2 shrink-0 cursor-pointer"
            >
              Opsi Bagikan
            </button>
          </div>
        )}

        {/* Sticky Mobile Video Wrapper: sticks directly below AppHeader (--app-header-height) on mobile (< lg), static on desktop (lg:) */}
        <div
          data-testid="session-video-sticky-wrapper"
          className={`sticky top-[var(--app-header-height,57px)] z-20 lg:static lg:z-auto -mx-3 px-3 py-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 lg:py-0 bg-white/95 dark:bg-[#0D2B36]/95 lg:bg-transparent dark:lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none border-b-2 border-[#171717] dark:border-[#4CA7A1] lg:border-none shadow-sm lg:shadow-none transition-all duration-300 ${playlistMarginClass} mb-4 lg:mb-6`}
        >
          {authLoading ? (
            <div className="w-full aspect-video rounded-lg bg-white dark:bg-[#1F5F63] border-2 border-[#171717] dark:border-[#4CA7A1] flex flex-col items-center justify-center p-6 text-center space-y-3 max-lg:max-h-[min(36dvh,calc(100dvh-var(--app-header-height,57px)-11rem))] max-lg:mx-auto">
              <div className="w-8 h-8 border-3 border-[#123D32] dark:border-[#4CA7A1] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-[#525855] dark:text-[#A6D6C9] font-bold">Memeriksa status akun siswa...</p>
            </div>
          ) : (
            <YouTubeEmbed
              url={session.youtubeUrl}
              title={session.title}
              className="max-lg:max-h-[min(36dvh,calc(100dvh-var(--app-header-height,57px)-11rem))] max-lg:mx-auto"
              isGuest={!user}
              sessionId={session.id}
              courseId={course.id}
              onOpenLogin={() => openAuthModal('login', { type: 'session', courseId: course.id, sessionId: session.id })}
              onOpenRegister={() => openAuthModal('register', { type: 'session', courseId: course.id, sessionId: session.id })}
            />
          )}
        </div>

        {/* Left Primary Learning Content (Scrolls smoothly beneath sticky video on mobile) */}
        <div className={`space-y-6 transition-all duration-300 ${playlistMarginClass}`}>
          {/* Session Headings & Info Panel */}
          <div
            key={session.id}
            className="nb-card p-4 sm:p-6 space-y-3.5 sm:space-y-4 bg-white dark:bg-[#1F5F63]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="nb-badge bg-[#4CA7A1] text-[#001722] border-[#171717] dark:border-[#001722]">
                Sesi #{currentIndex >= 0 ? currentIndex + 1 : session.order || 1} dari {allSessions.length || 1}
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShareModalOpen(true)}
                  className="nb-btn nb-btn-secondary px-3.5 py-2 text-xs"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#123D32] dark:text-[#4CA7A1]" />
                  <span>Bagikan Sesi</span>
                </button>

                <button
                  onClick={handleToggleComplete}
                  disabled={markingDone}
                  title={
                    isCompleted
                      ? 'Sesi ini telah diselesaikan'
                      : !isCompletionEligible
                      ? (precedingCheck.hasBlockingQuiz
                          ? `Selesaikan kuis sesi sebelumnya (${precedingCheck.blockingSession?.title}) terlebih dahulu`
                          : currentQuizCheck.reason || 'Kuis sesi ini harus diselesaikan terlebih dahulu')
                      : 'Tandai sesi ini selesai'
                  }
                  className={`nb-btn px-4 py-2 text-xs disabled:opacity-50 ${
                    isCompleted
                      ? 'nb-btn-gold'
                      : isCompletionEligible
                      ? 'nb-btn-primary'
                      : 'nb-btn-secondary opacity-95'
                  }`}
                >
                  {markingDone ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : !isCompletionEligible ? (
                    <Lock className="w-3.5 h-3.5 text-[#D6AD52]" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>
                    {isCompleted
                      ? 'Telah Diselesaikan'
                      : !isCompletionEligible
                      ? 'Kuis Wajib Belum Selesai'
                      : 'Tandai Selesai Sesi Ini'}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#171717] dark:text-[#CEFEF1] font-serif-brand leading-snug">
                {session.title}
              </h1>
              {session.titleAr && (
                <p className="font-amiri text-lg sm:text-xl font-bold text-[#123D32] dark:text-[#CEFEF1] mt-1.5 leading-[2.0]" dir="rtl">
                  {session.titleAr}
                </p>
              )}
            </div>

            <p className="text-[#525855] dark:text-[#A6D6C9] text-sm leading-relaxed">
              {session.description}
            </p>
          </div>

          {/* PDF Resource Card (if available) */}
          {session.pdfUrl && (
            <div className="nb-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAF7F0] dark:bg-[#1F5F63]">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-[#4CA7A1] text-[#001722] rounded-md shrink-0 border-2 border-[#171717] dark:border-[#001722]">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-[#171717] dark:text-[#CEFEF1] text-sm md:text-base">
                    {session.pdfTitle || 'Materi & Naskah Matan PDF'}
                  </h4>
                  <p className="text-xs text-[#525855] dark:text-[#A6D6C9] mt-0.5">
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
                  <Eye className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1]" />
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
            <div className="nb-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1F5F63]">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-[#001722] text-[#CEFEF1] rounded-md shrink-0 border-2 border-[#171717] dark:border-[#4CA7A1]">
                  <ExternalLink className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-[#171717] dark:text-[#CEFEF1] text-sm md:text-base">
                    Google Drive PDF Modul / Rujukan
                  </h4>
                  <p className="text-xs text-[#525855] dark:text-[#A6D6C9] mt-0.5">
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
                className="nb-btn nb-btn-primary px-4 py-2 text-xs self-end sm:self-center shrink-0 min-h-[40px]"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Buka di Google Drive</span>
              </button>
            </div>
          )}

          {/* Arabic Matan / Syarah Naskah Box (if present) - Reading Surface */}
          {session.descriptionAr && (
            <div
              style={fontControl.style}
              className="nb-reading-surface p-4 sm:p-6 md:p-8 space-y-3 bg-[#FAF7F0] dark:bg-[#1F5F63]"
            >
              <div className="text-xs font-sans font-extrabold uppercase tracking-wider text-[#123D32] dark:text-[#CEFEF1] border-b-2 border-[#171717] dark:border-[#4CA7A1] pb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span>Matan & Naskah Bahasa Arab</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#001722] text-[#CEFEF1] border border-[#171717] dark:border-[#4CA7A1]">
                    Naskah Asli
                  </span>
                </div>
                {!session.lessonNotes && (
                  <ReadingFontControls
                    step={fontControl.step}
                    percentage={fontControl.percentage}
                    canDecrease={fontControl.canDecrease}
                    canIncrease={fontControl.canIncrease}
                    isDefault={fontControl.isDefault}
                    onDecrease={fontControl.decrease}
                    onIncrease={fontControl.increase}
                    onReset={fontControl.reset}
                  />
                )}
              </div>
              <div
                className="font-amiri text-right reading-scalable-arabic text-[#171717] dark:text-[#CEFEF1] space-y-3"
                dir="rtl"
                dangerouslySetInnerHTML={{ __html: autoWrapArabicText(session.descriptionAr) }}
              />
            </div>
          )}

          {/* Lesson Notes & Faedah Ilmiah Section - Reading Surface */}
          {session.lessonNotes && (
            <div
              style={fontControl.style}
              className="nb-reading-surface p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5 bg-white dark:bg-[#1F5F63]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#171717] dark:border-[#4CA7A1] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-md bg-[#001722] text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold font-serif-brand text-[#171717] dark:text-[#CEFEF1] leading-snug">
                      Catatan Pelajaran & Faedah Ilmiah
                    </h3>
                    <p className="text-xs text-[#525855] dark:text-[#A6D6C9] font-sans">
                      Rangkuman poin penting, syarah, dan dalil-dalil ilmiah pada sesi ini.
                    </p>
                  </div>
                </div>

                <ReadingFontControls
                  step={fontControl.step}
                  percentage={fontControl.percentage}
                  canDecrease={fontControl.canDecrease}
                  canIncrease={fontControl.canIncrease}
                  isDefault={fontControl.isDefault}
                  onDecrease={fontControl.decrease}
                  onIncrease={fontControl.increase}
                  onReset={fontControl.reset}
                />
              </div>

              {/* Rich Blog-Quality Typography Content Renderer */}
              <div
                className="prose dark:prose-invert max-w-none text-[#171717] dark:text-[#CEFEF1] leading-relaxed space-y-3.5 sm:space-y-4 font-sans blog-content"
                dangerouslySetInnerHTML={{ __html: renderFormattedContentHtml(session.lessonNotes) }}
              />
            </div>
          )}
        </div>


        {/* Right Sidebar: Sessions Playlist & Progress (Fixed to Viewport on Desktop & Responsive on Mobile) */}
        <aside className={`${isPlaylistOpen ? 'flex' : 'hidden'} lg:fixed lg:top-[72px] lg:right-4 xl:right-8 lg:w-[320px] xl:w-[380px] lg:h-[calc(100dvh-5.5rem)] lg:z-20 flex-col space-y-4 mt-8 lg:mt-0 animate-fade-in`}>
          {/* Completed Notice */}
          {enrollment?.isCompleted && (
            <div className="nb-card bg-[#4CA7A1] text-[#001722] p-4 text-center space-y-1.5 shrink-0">
              <div className="w-8 h-8 rounded-md bg-[#001722] text-[#CEFEF1] flex items-center justify-center mx-auto border-2 border-[#001722]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h4 className="font-extrabold text-[#001722] text-xs">Alhamdulillah! Seluruh Sesi Selesai</h4>
              <p className="text-[11px] text-[#001722]/90 font-medium">
                Anda telah menyelesaikan seluruh materi pembahasan pada kurikulum ini.
              </p>
            </div>
          )}

          {/* Playlist Card - Fixed Container with Internal Scroll */}
          <div className="nb-card overflow-hidden flex flex-col flex-1 min-h-0 bg-white dark:bg-[#1F5F63]">
            <div className="p-4 bg-[#123D32] dark:bg-[#001722] text-[#FAF7F0] dark:text-[#CEFEF1] border-b-2 border-[#171717] dark:border-[#4CA7A1] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-[#4CA7A1]" />
                <h3 className="font-extrabold text-[#FAF7F0] dark:text-[#CEFEF1] text-sm">Daftar Sesi Kursus</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#A6D6C9] font-bold">
                  {enrollment?.completedSessionIds?.length || 0}/{allSessions.length} Selesai
                </span>
                <button
                  type="button"
                  onClick={() => setIsPlaylistOpen(false)}
                  className="p-1 rounded text-[#FAF7F0] dark:text-[#CEFEF1] hover:bg-black/20 dark:hover:bg-[#1F5F63] transition cursor-pointer"
                  title="Sembunyikan Panel Sesi"
                  aria-label="Sembunyikan panel sesi"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {enrollment && (
              <div className="w-full bg-[#EFE5D2] dark:bg-[#001722] h-2 border-b-2 border-[#171717] dark:border-[#4CA7A1] shrink-0">
                <div
                  className="bg-[#4CA7A1] h-full transition-all duration-700 ease-out"
                  style={{ width: `${enrollment.progressPercent}%` }}
                />
              </div>
            )}

            <div ref={playlistScrollRef} className="p-2.5 space-y-2.5 flex-1 min-h-0 overflow-y-auto bg-[#FAF7F0] dark:bg-[#001722]/40">
              {allSessions.map((s, idx) => {
                const isActive = s.id === session.id;
                const isItemDone = enrollment?.completedSessionIds?.includes(s.id);
                const sQuiz = s.quizId ? (quizzesMap[s.quizId] || (s.id === session.id ? quiz : null)) : null;
                const quizStatus = evaluateSessionQuizStatus(s, sQuiz, userAttempts);

                return (
                  <div
                    key={s.id}
                    data-active-session={isActive ? 'true' : 'false'}
                    className={`w-full rounded-md text-xs transition-all duration-150 border-2 overflow-hidden ${
                      isActive
                        ? 'bg-[#EFE5D2] dark:bg-[#1F5F63] border-[#171717] dark:border-[#4CA7A1] text-[#171717] dark:text-[#CEFEF1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]'
                        : 'bg-white dark:bg-[#0D2B36] text-[#171717] dark:text-[#A6D6C9] hover:bg-[#FAF7F0] dark:hover:bg-[#1F5F63]/70 border-[#171717] dark:border-[#4CA7A1]'
                    }`}
                  >
                    {/* Session Selection Item */}
                    <button
                      type="button"
                      onClick={() => handlePlaylistSelectSession(s)}
                      className="w-full text-left p-2.5 sm:p-3 flex items-start gap-2.5 cursor-pointer"
                    >
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center font-extrabold text-[11px] shrink-0 border-2 border-[#171717] dark:border-[#4CA7A1] ${
                        isItemDone
                          ? 'bg-[#4CA7A1] text-[#001722] dark:border-[#001722]'
                          : isActive
                          ? 'bg-[#123D32] text-[#FAF7F0] dark:bg-[#001722] dark:text-[#CEFEF1]'
                          : 'bg-[#FAF7F0] dark:bg-[#001722] text-[#171717] dark:text-[#A6D6C9]'
                      }`}>
                        {isItemDone ? <CheckCircle2 className="w-3.5 h-3.5 text-[#001722]" /> : idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`font-extrabold truncate ${isActive ? 'text-[#123D32] dark:text-[#CEFEF1]' : 'text-[#171717] dark:text-[#A6D6C9]'}`}>
                          {s.title}
                        </p>
                        {s.titleAr && (
                          <p className="font-amiri text-xs text-[#123D32] dark:text-[#CEFEF1] truncate text-right mt-0.5" dir="rtl">
                            {s.titleAr}
                          </p>
                        )}
                      </div>

                      {isActive && (
                        <span className="w-2.5 h-2.5 rounded-sm bg-[#4CA7A1] border border-[#171717] dark:border-[#001722] ml-1 self-center shrink-0" />
                      )}
                    </button>

                    {/* Dedicated Quiz Button/Status Directly Under This Session */}
                    {s.quizId && (
                      <div className="px-2.5 sm:px-3 pb-2.5 pt-0">
                        {quizStatus.status === 'passed' ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartQuizForSession(s, sQuiz);
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-[#FAF7F0] dark:bg-[#001722] text-[#123D32] dark:text-[#CEFEF1] border border-[#171717] dark:border-[#4CA7A1] text-[11px] font-bold hover:bg-[#4CA7A1] hover:text-[#001722] transition cursor-pointer"
                            title={`Kuis sesi ${s.title} telah selesai dan lulus dengan nilai ${quizStatus.bestScore}%. Klik untuk melihat hasil.`}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#123D32] dark:text-[#4CA7A1] shrink-0" />
                              <span className="truncate">Kuis Selesai ({quizStatus.bestScore}%)</span>
                            </span>
                            <span className="text-[10px] underline font-extrabold shrink-0 ml-1">Lihat Hasil</span>
                          </button>
                        ) : quizStatus.status === 'failed' ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartQuizForSession(s, sQuiz);
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-[#FAF7F0] dark:bg-[#001722] text-[#123D32] dark:text-[#CEFEF1] border border-[#171717] dark:border-[#4CA7A1] text-[11px] font-bold hover:bg-[#1F5F63] transition cursor-pointer"
                            title={`Nilai kuis antum (${quizStatus.bestScore}%) belum memenuhi batas kelulusan (${quizStatus.passingScore}%). Klik untuk mengulang kuis.`}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <RotateCcw className="w-3.5 h-3.5 text-[#123D32] dark:text-[#4CA7A1] shrink-0" />
                              <span className="truncate">Ulangi Kuis ({quizStatus.bestScore}%)</span>
                            </span>
                            <span className="text-[10px] underline font-extrabold shrink-0 ml-1 text-[#4CA7A1]">Kerjakan Lagi</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartQuizForSession(s, sQuiz);
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-[#FAF7F0] dark:bg-[#001722] text-[#123D32] dark:text-[#CEFEF1] border border-[#171717] dark:border-[#4CA7A1] text-[11px] font-bold hover:bg-[#4CA7A1] hover:text-[#001722] transition cursor-pointer"
                            title={`Kerjakan kuis evaluasi pemahaman untuk sesi ${s.title}`}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <HelpCircle className="w-3.5 h-3.5 text-[#123D32] dark:text-[#4CA7A1] shrink-0" />
                              <span className="truncate">Kerjakan Kuis</span>
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 opacity-80 shrink-0 ml-1" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
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

      {/* Course Share Modal */}
      <CourseShareModal
        isOpen={courseShareModalOpen}
        onClose={() => setCourseShareModalOpen(false)}
        course={course}
      />

      {/* Session Share Modal */}
      <SessionShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        session={session}
        course={course}
      />

      {/* Quiz Required Warning Modal */}
      <QuizRequiredModal
        isOpen={quizWarningModalOpen}
        onClose={() => {
          setQuizWarningModalOpen(false);
          setPendingBlockingSession(null);
          setPendingBlockingQuiz(null);
          setPendingQuizStatus(null);
        }}
        onGoToQuiz={() => {
          const targetS = pendingBlockingSession;
          const targetQ = pendingBlockingQuiz;
          setQuizWarningModalOpen(false);
          setPendingBlockingSession(null);
          setPendingBlockingQuiz(null);
          setPendingQuizStatus(null);
          if (targetS) {
            handleStartQuizForSession(targetS, targetQ);
          }
        }}
        blockingSession={pendingBlockingSession}
        blockingQuiz={pendingBlockingQuiz}
        quizStatus={pendingQuizStatus}
      />
    </div>
  );
};
