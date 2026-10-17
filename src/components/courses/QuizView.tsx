import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Award,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  Sparkles,
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
  onOpenCertificate,
  onRefreshEnrollment
}) => {
  const { user, userProfile, openGuestModal } = useAuth();

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6 animate-fade-in-up">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center text-emerald-800 dark:text-emerald-400 shadow-xl">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white font-sans">
            Akses Kuis Evaluasi Terbatas
          </h2>
          <p className="text-stone-600 dark:text-stone-300 text-sm max-w-lg mx-auto leading-relaxed">
            Silakan masuk atau buat akun terlebih dahulu untuk mengerjakan kuis evaluasi <strong className="text-emerald-700 dark:text-emerald-300">{quiz.title}</strong> dan menyimpan skor kelulusan Anda.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => openGuestModal(course, { type: 'quiz', courseId: course.id, quizId: quiz.id })}
            className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg shadow-emerald-950/50 cursor-pointer active:scale-95"
          >
            Masuk / Daftar Akun
          </button>
          <button
            onClick={onBackToSession}
            className="w-full sm:w-auto px-5 py-3.5 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-xl font-medium text-sm transition duration-200 cursor-pointer active:scale-95 shadow-xs"
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

  // User attempts tracking
  const [pastAttempts, setPastAttempts] = useState<QuizAttempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(true);

  // Timer countdown in seconds
  const [timeLeft, setTimeLeft] = useState<number>(
    quiz.timeLimitMinutes > 0 ? quiz.timeLimitMinutes * 60 : 0
  );

  const questions = quiz.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  // Fetch past attempts for this user and quiz
  useEffect(() => {
    if (!user) return;
    getUserQuizAttempts(user.uid).then((all) => {
      const filtered = all.filter(a => a.quizId === quiz.id);
      setPastAttempts(filtered);
      setLoadingAttempts(false);
    });
  }, [user, quiz.id]);

  // Timer countdown effect
  useEffect(() => {
    if (submitted || quiz.timeLimitMinutes <= 0) return;

    if (timeLeft <= 0) {
      // Time is up! Auto submit
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

    // Save attempt to Cloud Firestore
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

  // Format time mm:ss
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
      <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
        <button
          onClick={onBackToSession}
          className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white transition text-sm font-medium cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Sesi Belajar</span>
        </button>

        {/* Timer Badge if time limit */}
        {quiz.timeLimitMinutes > 0 && !submitted && (
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-mono font-bold shadow-xs ${
            timeLeft < 60
              ? 'bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 animate-pulse'
              : 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-emerald-800 dark:text-emerald-400'
          }`}>
            <Clock className="w-4 h-4" />
            <span>Sisa Waktu: {formatTime(timeLeft)}</span>
          </div>
        )}
      </div>

      {/* Result Screen upon submission */}
      {submitted && scoreResult ? (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 sm:p-10 shadow-sm dark:shadow-2xl space-y-8 animate-modal-in transition-colors duration-250">
          {/* Result Card */}
          <div className="text-center space-y-4">
            <div className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-3xl shadow-md border transition-transform duration-300 hover:scale-105 ${
              scoreResult.passed
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30'
                : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/30'
            }`}>
              {scoreResult.passed ? <Award className="w-10 h-10 animate-pulse" /> : <XCircle className="w-10 h-10" />}
            </div>

            <div className="space-y-1">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                scoreResult.passed
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
              }`}>
                {scoreResult.passed ? 'Lulus Evaluasi' : 'Belum Memenuhi Batas Kelulusan'}
              </span>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-white font-sans">
                Nilai Anda: {scoreResult.score}%
              </h2>

              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
                Menjawab benar {scoreResult.correctCount} dari {scoreResult.totalCount} pertanyaan (Total Skor: {scoreResult.totalPoints}/{scoreResult.maxPoints} poin).
                Batas kelulusan: {quiz.passingScore}%.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-stone-200 dark:border-stone-800">
            {(!scoreResult.passed || quiz.maxAttempts === 0 || remainingAttempts > 0) && (
              <button
                onClick={handleRetake}
                className="px-5 py-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-95 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Ulangi Kuis {quiz.maxAttempts > 0 ? `(Sisa ${remainingAttempts}x)` : ''}</span>
              </button>
            )}

            <button
              onClick={onBackToSession}
              className="px-5 py-3 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer shadow-md"
            >
              Lanjutkan ke Sesi Pelajaran
            </button>
          </div>

          {/* Answer Review & Explanations (if allowed) */}
          {quiz.showAnswersAfterSubmit && (
            <div className="space-y-4 pt-6 border-t border-stone-200 dark:border-stone-800 animate-fade-in-up">
              <h3 className="font-bold text-stone-900 dark:text-white text-lg">Pembahasan dan Kunci Jawaban</h3>
              <div className="space-y-4">
                {questions.map((q, idx) => {
                  const userAnswer = answers[q.id];
                  const isCorrect = userAnswer === q.correctAnswerIndex;

                  return (
                    <div
                      key={q.id}
                      className={`p-5 rounded-2xl border text-left space-y-3 transition-all duration-200 ${
                        isCorrect
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 hover:border-emerald-300 dark:hover:border-emerald-700/60'
                          : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40 hover:border-rose-300 dark:hover:border-rose-700/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Pertanyaan #{idx + 1}</span>
                          <h4 className="font-semibold text-stone-900 dark:text-white text-sm sm:text-base">{q.questionText}</h4>
                          {q.questionTextAr && (
                            <p className="font-amiri text-lg font-bold text-emerald-700 dark:text-emerald-400" dir="rtl">
                              {q.questionTextAr}
                            </p>
                          )}
                        </div>

                        <span className={`px-2 py-0.5 rounded text-xs font-bold shrink-0 ${
                          isCorrect ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300'
                        }`}>
                          {isCorrect ? 'Benar (+ ' + q.points + ')' : 'Salah (0)'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs sm:text-sm">
                        {q.options.map((opt, oIdx) => {
                          const isChosen = userAnswer === oIdx;
                          const isTarget = q.correctAnswerIndex === oIdx;

                          let optClass = 'bg-white dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300';
                          if (isTarget) {
                            optClass = 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200 font-semibold shadow-xs';
                          } else if (isChosen && !isTarget) {
                            optClass = 'bg-rose-100 dark:bg-rose-950/80 border-rose-400 dark:border-rose-600 text-rose-900 dark:text-rose-200 font-semibold line-through opacity-80';
                          }

                          return (
                            <div key={oIdx} className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${optClass}`}>
                              <span>{opt}</span>
                              {isTarget && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                              {isChosen && !isTarget && <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <div className="p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-700 dark:text-stone-300">
                          <strong className="text-amber-700 dark:text-amber-400">Pembahasan:</strong> {q.explanation}
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
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-2xl space-y-6 transition-colors duration-250">
          {/* Header info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200 dark:border-stone-800">
            <div>
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                {course.title}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white font-sans">
                {quiz.title}
              </h2>
            </div>

            <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
              <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Pertanyaan {currentQuestionIndex + 1} dari {questions.length}</span>
            </div>
          </div>

          {/* Progress Bar of Questions */}
          <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Active Question Box with smooth slide-in transition */}
          {currentQuestion && (
            <div key={currentQuestion.id} className="space-y-6 py-2 animate-question-slide">
              <div className="space-y-2">
                <span className="inline-block px-2.5 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-md border border-stone-200 dark:border-stone-700">
                  Bobot: {currentQuestion.points || 10} Poin
                </span>

                <h3 className="text-base sm:text-xl font-bold text-stone-900 dark:text-white font-sans leading-snug">
                  {currentQuestion.questionText}
                </h3>

                {currentQuestion.questionTextAr && (
                  <p className="font-amiri text-2xl font-bold text-emerald-700 dark:text-emerald-400 leading-relaxed mt-2" dir="rtl">
                    {currentQuestion.questionTextAr}
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {currentQuestion.options.map((option, optIdx) => {
                  const isSelected = answers[currentQuestion.id] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(currentQuestion.id, optIdx)}
                      className={`w-full text-left p-4 rounded-2xl border text-sm sm:text-base font-medium transition-all duration-200 flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-sm ring-2 ring-emerald-500/30 translate-x-1'
                          : 'bg-stone-50 dark:bg-stone-950/70 hover:bg-stone-100 dark:hover:bg-stone-800/90 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 text-stone-800 dark:text-stone-200'
                      }`}
                    >
                      <span className="leading-snug">{option}</span>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-200 ${
                        isSelected ? 'border-emerald-500 bg-emerald-500 text-white scale-110 shadow' : 'border-stone-300 dark:border-stone-600'
                      }`}>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-white dark:bg-stone-950" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Question Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
              className="px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-95 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            {currentQuestionIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 shadow hover:shadow-emerald-950/50 cursor-pointer"
              >
                <span>Pertanyaan Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting || Object.keys(answers).length === 0}
                onClick={calculateAndSaveScore}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 shadow-lg shadow-emerald-950/50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
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
