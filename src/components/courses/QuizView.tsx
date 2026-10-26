import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Quiz, Course, Session, QuizAttempt } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { saveQuizAttempt, getUserQuizAttempts } from '../../firebase/services';

interface QuizViewProps {
  quiz: Quiz;
  course: Course;
  session?: Session;
  onBackToSession: () => void;
  onOpenCertificate: (course: Course) => void;
  onRefreshEnrollment: () => void;
}

export const QuizView: React.FC<QuizViewProps> = ({
  quiz,
  course,
  session,
  onBackToSession,
  onRefreshEnrollment
}) => {
  const { user, userProfile, loading: authLoading, openGuestModal } = useAuth();

  if (authLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 border-3 border-[#06251D] dark:border-[#D9AC45] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-[#171717] dark:text-[#F8F3E8] font-bold">Memeriksa status akun siswa...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6 animate-fade-in-up">
        <div className="w-16 h-16 mx-auto rounded-lg bg-[#D9AC45] border-2 border-[#171717] shadow-[4px_4px_0px_#171717] flex items-center justify-center text-[#171717]">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171717] dark:text-[#F8F3E8] font-serif-brand">
            Akses Kuis Evaluasi Terbatas
          </h2>
          <p className="text-[#171717]/80 dark:text-[#F8F3E8]/80 text-sm max-w-lg mx-auto leading-relaxed">
            Silakan masuk ke akun Dars with Osama untuk mulai belajar, mengerjakan kuis evaluasi <strong className="text-[#06251D] dark:text-[#D9AC45]">{quiz.title}</strong>, dan menyimpan nilai kelulusan Anda.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => openGuestModal(course, { type: 'quiz', courseId: course.id, quizId: quiz.id })}
            className="nb-btn nb-btn-primary w-full sm:w-auto px-6 py-3.5 text-sm"
          >
            Masuk / Daftar Akun
          </button>
          <button
            onClick={onBackToSession}
            className="nb-btn nb-btn-secondary w-full sm:w-auto px-5 py-3.5 text-sm"
          >
            Kembali ke Sesi Materi
          </button>
        </div>
      </div>
    );
  }

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scoreResult, setScoreResult] = useState<{
    score: number;
    passed: boolean;
    totalPoints: number;
    maxPoints: number;
    correctCount: number;
    totalCount: number;
  } | null>(null);

  const [pastAttempts, setPastAttempts] = useState<QuizAttempt[]>([]);
  const [, setLoadingAttempts] = useState(true);

  const [timeLeft, setTimeLeft] = useState<number>(
    quiz.timeLimitMinutes > 0 ? quiz.timeLimitMinutes * 60 : 0
  );

  const questions = quiz.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    if (!user) return;
    getUserQuizAttempts(user.uid).then((all) => {
      const filtered = all.filter(a => a.quizId === quiz.id);
      setPastAttempts(filtered);
      setLoadingAttempts(false);
    });
  }, [user, quiz.id]);

  useEffect(() => {
    if (submitted || quiz.timeLimitMinutes <= 0) return;

    if (timeLeft <= 0) {
      handleAutoSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, submitted, quiz.timeLimitMinutes]);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (submitted) return;
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleAutoSubmit = () => {
    if (!submitted) {
      calculateAndSaveScore();
    }
  };

  const calculateAndSaveScore = async () => {
    if (submitting || !user) return;
    setSubmitting(true);

    let totalPoints = 0;
    let maxPoints = 0;
    let correctCount = 0;

    questions.forEach((q) => {
      const qPoints = q.points || 10;
      maxPoints += qPoints;
      const chosen = answers[q.id];
      if (chosen !== undefined && chosen === q.correctAnswerIndex) {
        totalPoints += qPoints;
        correctCount++;
      }
    });

    const score = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 100;
    const passed = score >= (quiz.passingScore || 70);

    const result = {
      score,
      passed,
      totalPoints,
      maxPoints,
      correctCount,
      totalCount: questions.length
    };

    setScoreResult(result);
    setSubmitted(true);

    if (passed) {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 }
      });
    }

    try {
      const attemptNumber = pastAttempts.length + 1;
      await saveQuizAttempt({
        userId: user.uid,
        userName: userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Peserta',
        userEmail: user.email || '',
        quizId: quiz.id,
        sessionId: session?.id,
        courseId: course.id,
        score,
        passed,
        totalPoints,
        maxPoints,
        answers,
        submittedAt: new Date().toISOString(),
        attemptNumber
      });
      onRefreshEnrollment();
    } catch (err) {
      console.error('Error saving quiz attempt:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setSubmitted(false);
    setScoreResult(null);
    setCurrentQuestionIndex(0);
    setTimeLeft(quiz.timeLimitMinutes > 0 ? quiz.timeLimitMinutes * 60 : 0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const remainingAttempts = quiz.maxAttempts > 0 
    ? Math.max(0, quiz.maxAttempts - pastAttempts.length - (submitted ? 1 : 0)) 
    : 999;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b-2 border-[#171717] dark:border-[#D9AC45]/50">
        <button
          onClick={onBackToSession}
          className="nb-btn nb-btn-secondary px-4 py-2 text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Sesi Belajar</span>
        </button>

        {/* Timer Badge if time limit */}
        {quiz.timeLimitMinutes > 0 && !submitted && (
          <div className={`nb-badge px-3.5 py-1.5 text-xs font-mono ${
            timeLeft < 60
              ? 'bg-[#F04438] text-white animate-pulse'
              : 'bg-[#D9AC45] text-[#171717]'
          }`}>
            <Clock className="w-4 h-4" />
            <span>Sisa Waktu: {formatTime(timeLeft)}</span>
          </div>
        )}
      </div>

      {/* Result Screen upon submission */}
      {submitted && scoreResult ? (
        <div className="nb-card p-6 sm:p-10 space-y-8 bg-white dark:bg-[#0B3026]">
          {/* Result Card */}
          <div className="text-center space-y-4">
            <div className={`w-20 h-20 rounded-lg mx-auto flex items-center justify-center text-3xl border-2 border-[#171717] shadow-[4px_4px_0px_#171717] ${
              scoreResult.passed
                ? 'bg-[#D9AC45] text-[#171717]'
                : 'bg-[#F04438] text-white'
            }`}>
              {scoreResult.passed ? <Award className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
            </div>

            <div className="space-y-1.5">
              <span className={`nb-badge ${
                scoreResult.passed
                  ? 'bg-[#06251D] text-[#D9AC45]'
                  : 'bg-[#F04438] text-white'
              }`}>
                {scoreResult.passed ? 'Lulus Evaluasi' : 'Belum Memenuhi Batas Kelulusan'}
              </span>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#171717] dark:text-[#F8F3E8] font-serif-brand pt-1">
                Nilai Anda: {scoreResult.score}%
              </h2>

              <p className="text-xs sm:text-sm text-[#171717]/80 dark:text-[#F8F3E8]/80 font-medium">
                Menjawab benar {scoreResult.correctCount} dari {scoreResult.totalCount} pertanyaan (Total Skor: {scoreResult.totalPoints}/{scoreResult.maxPoints} poin).
                Batas kelulusan: {quiz.passingScore}%.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t-2 border-[#171717]/20 dark:border-[#D9AC45]/30">
            {(!scoreResult.passed || quiz.maxAttempts === 0 || remainingAttempts > 0) && (
              <button
                onClick={handleRetake}
                className="nb-btn nb-btn-secondary px-5 py-3 text-sm"
              >
                <RotateCcw className="w-4 h-4 text-[#06251D] dark:text-[#D9AC45]" />
                <span>Ulangi Kuis {quiz.maxAttempts > 0 ? `(Sisa ${remainingAttempts}x)` : ''}</span>
              </button>
            )}

            <button
              onClick={onBackToSession}
              className="nb-btn nb-btn-primary px-5 py-3 text-sm"
            >
              Lanjutkan ke Sesi Pelajaran
            </button>
          </div>

          {/* Answer Review & Explanations (if allowed) */}
          {quiz.showAnswersAfterSubmit && (
            <div className="space-y-4 pt-6 border-t-2 border-[#171717] dark:border-[#D9AC45]/50">
              <h3 className="font-extrabold text-[#171717] dark:text-[#F8F3E8] text-lg font-serif-brand">
                Pembahasan dan Kunci Jawaban
              </h3>
              <div className="space-y-4">
                {questions.map((q, idx) => {
                  const userAnswer = answers[q.id];
                  const isCorrect = userAnswer === q.correctAnswerIndex;

                  return (
                    <div
                      key={q.id}
                      className={`p-5 rounded-lg border-2 border-[#171717] text-left space-y-3 ${
                        isCorrect
                          ? 'bg-[#F8F3E8] dark:bg-[#06251D]'
                          : 'bg-rose-50 dark:bg-rose-950/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-[#06251D] dark:text-[#D9AC45]">
                            Pertanyaan #{idx + 1}
                          </span>
                          <h4 className="font-extrabold text-[#171717] dark:text-[#F8F3E8] text-sm sm:text-base">{q.questionText}</h4>
                          {q.questionTextAr && (
                            <p className="font-amiri text-lg font-bold text-[#06251D] dark:text-[#D9AC45]" dir="rtl">
                              {q.questionTextAr}
                            </p>
                          )}
                        </div>

                        <span className={`nb-badge shrink-0 ${
                          isCorrect ? 'bg-[#06251D] text-[#D9AC45]' : 'bg-[#F04438] text-white'
                        }`}>
                          {isCorrect ? 'Benar (+ ' + q.points + ')' : 'Salah (0)'}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs sm:text-sm">
                        {q.options.map((opt, oIdx) => {
                          const isChosen = userAnswer === oIdx;
                          const isTarget = q.correctAnswerIndex === oIdx;

                          let optClass = 'bg-white dark:bg-[#0B3026] border-[#171717]/40 text-[#171717] dark:text-[#F8F3E8]';
                          if (isTarget) {
                            optClass = 'bg-[#D9AC45]/25 dark:bg-[#D9AC45]/20 border-[#171717] dark:border-[#D9AC45] text-[#171717] dark:text-[#F8F3E8] font-extrabold';
                          } else if (isChosen && !isTarget) {
                            optClass = 'bg-[#F04438]/15 border-[#F04438] text-[#F04438] font-bold line-through';
                          }

                          return (
                            <div key={oIdx} className={`p-3 rounded-md border-2 flex items-center justify-between ${optClass}`}>
                              <span>{opt}</span>
                              {isTarget && <CheckCircle2 className="w-4 h-4 text-[#06251D] dark:text-[#D9AC45] shrink-0" />}
                              {isChosen && !isTarget && <XCircle className="w-4 h-4 text-[#F04438] shrink-0" />}
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <div className="p-3 bg-white dark:bg-[#0B3026] border-2 border-[#171717] dark:border-[#D9AC45]/50 rounded-md text-xs text-[#171717] dark:text-[#F8F3E8]">
                          <strong className="text-[#06251D] dark:text-[#D9AC45]">Pembahasan:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Examination Interface (Taking the quiz) */
        <div className="nb-card p-6 sm:p-8 space-y-6 bg-white dark:bg-[#0B3026]">
          {/* Header info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-[#171717] dark:border-[#D9AC45]/50">
            <div>
              <span className="text-xs text-[#06251D] dark:text-[#D9AC45] font-extrabold uppercase tracking-wider">
                {course.title}
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#171717] dark:text-[#F8F3E8] font-serif-brand">
                {quiz.title}
              </h2>
            </div>

            <div className="nb-badge bg-[#F8F3E8] dark:bg-[#06251D] text-[#171717] dark:text-[#F8F3E8]">
              <HelpCircle className="w-4 h-4 text-[#06251D] dark:text-[#D9AC45]" />
              <span>Pertanyaan {currentQuestionIndex + 1} dari {questions.length}</span>
            </div>
          </div>

          {/* Progress Bar of Questions */}
          <div className="w-full bg-[#F8F3E8] dark:bg-[#06251D] h-3 rounded-sm border-2 border-[#171717] overflow-hidden">
            <div
              className="bg-[#D9AC45] h-full transition-all duration-300 ease-out"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Active Question Box */}
          {currentQuestion && (
            <div key={currentQuestion.id} className="space-y-6 py-2">
              <div className="space-y-2">
                <span className="nb-badge bg-[#06251D] text-[#D9AC45]">
                  Bobot: {currentQuestion.points || 10} Poin
                </span>

                <h3 className="text-base sm:text-xl font-extrabold text-[#171717] dark:text-[#F8F3E8] font-sans leading-snug pt-1">
                  {currentQuestion.questionText}
                </h3>

                {currentQuestion.questionTextAr && (
                  <p className="font-amiri text-2xl font-bold text-[#06251D] dark:text-[#D9AC45] leading-relaxed mt-2" dir="rtl">
                    {currentQuestion.questionTextAr}
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, optIdx) => {
                  const isSelected = answers[currentQuestion.id] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(currentQuestion.id, optIdx)}
                      className={`w-full text-left p-4 rounded-md border-2 text-sm sm:text-base font-bold transition-all duration-150 flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-[#D9AC45] border-[#171717] text-[#171717] shadow-[4px_4px_0px_#171717] -translate-y-0.5'
                          : 'bg-[#F8F3E8] dark:bg-[#06251D] hover:bg-[#D9AC45]/20 border-[#171717] dark:border-[#D9AC45]/60 text-[#171717] dark:text-[#F8F3E8]'
                      }`}
                    >
                      <span className="leading-snug">{option}</span>
                      <div className={`w-5 h-5 rounded-sm border-2 border-[#171717] flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-[#06251D] text-[#D9AC45]' : 'bg-white dark:bg-[#0B3026]'
                      }`}>
                        {isSelected && <span className="w-2.5 h-2.5 bg-[#D9AC45] rounded-xs" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Question Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t-2 border-[#171717] dark:border-[#D9AC45]/50">
            <button
              type="button"
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
              className="nb-btn nb-btn-secondary px-4 py-2.5 text-xs sm:text-sm disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            {currentQuestionIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                className="nb-btn nb-btn-primary px-5 py-2.5 text-xs sm:text-sm"
              >
                <span>Pertanyaan Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting || Object.keys(answers).length === 0}
                onClick={calculateAndSaveScore}
                className="nb-btn nb-btn-gold px-6 py-2.5 text-xs sm:text-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#171717]/40 border-t-[#171717] rounded-full animate-spin" />
                    <span>Mengoreksi...</span>
                  </>
                ) : (
                  <span>Selesaikan & Kumpulkan Jawaban</span>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
