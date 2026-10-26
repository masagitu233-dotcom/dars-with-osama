import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, AlertTriangle, X, ArrowRight, RotateCcw } from 'lucide-react';
import { Session, Quiz } from '../../types';
import { SessionQuizStatus } from '../../utils/quizFlowHelper';

interface QuizRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToQuiz: () => void;
  blockingSession?: Session | null;
  blockingQuiz?: Quiz | null;
  quizStatus?: SessionQuizStatus | null;
}

export const QuizRequiredModal: React.FC<QuizRequiredModalProps> = ({
  isOpen,
  onClose,
  onGoToQuiz,
  blockingSession,
  blockingQuiz,
  quizStatus
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const isFailed = quizStatus?.status === 'failed';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-required-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#16263D] border-2 border-[#292D2B] dark:border-[#34465D] rounded-lg shadow-[8px_8px_0px_#292D2B] dark:shadow-[8px_8px_0px_#101B2D] p-5 sm:p-6 space-y-5 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-start justify-between gap-3 border-b-2 border-[#292D2B]/15 dark:border-[#34465D] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-[#D6AD52] border-2 border-[#292D2B] flex items-center justify-center text-[#123D32] shrink-0 shadow-[2px_2px_0px_#292D2B]">
              {isFailed ? (
                <RotateCcw className="w-5 h-5 text-[#123D32]" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[#123D32]" />
              )}
            </div>
            <div>
              <h3
                id="quiz-required-title"
                className="font-extrabold text-base sm:text-lg text-[#292D2B] dark:text-[#F1F4F8] font-serif-brand leading-tight"
              >
                Kuis Sesi Sebelumnya Belum Selesai
              </h3>
              <p className="text-xs text-[#626A66] dark:text-[#B4C0D0]">
                Kewajiban Evaluasi Pemahaman Materi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-[#626A66] dark:text-[#B4C0D0] hover:text-[#292D2B] dark:hover:text-[#F1F4F8] hover:bg-[#FAF7F0] dark:hover:bg-[#243A56] transition border border-transparent hover:border-[#292D2B] cursor-pointer"
            aria-label="Tutup peringatan dan tetap di sesi ini"
            title="Tutup (Tetap di Sesi Ini)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Friendly Message Body */}
        <div className="space-y-3.5 text-xs sm:text-sm">
          <p className="text-[#292D2B] dark:text-[#F1F4F8] font-medium leading-relaxed">
            Anda masih memiliki kuis yang belum dikerjakan pada sesi sebelumnya. Silakan kerjakan kuis tersebut terlebih dahulu agar dapat melanjutkan pembelajaran.
          </p>

          {blockingSession && (
            <div className="p-3.5 bg-[#FAF7F0] dark:bg-[#101B2D] border-2 border-[#292D2B]/25 dark:border-[#34465D] rounded-md space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-[#123D32] dark:text-[#D6AD52] uppercase tracking-wider text-[11px]">
                  Kuis Yang Belum Diselesaikan:
                </span>
                {quizStatus && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      isFailed
                        ? 'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700'
                        : 'bg-red-50 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-200 dark:border-red-800'
                    }`}
                  >
                    {isFailed ? 'Belum Lulus' : 'Belum Dikerjakan'}
                  </span>
                )}
              </div>

              <p className="font-extrabold text-sm text-[#292D2B] dark:text-[#F1F4F8]">
                {blockingSession.title}
              </p>

              {blockingSession.titleAr && (
                <p className="font-amiri text-sm font-bold text-[#123D32] dark:text-[#D6AD52]" dir="rtl">
                  {blockingSession.titleAr}
                </p>
              )}

              {quizStatus && isFailed && (
                <p className="text-xs text-amber-900 dark:text-amber-200 font-semibold pt-1">
                  Nilai terbaik: {quizStatus.bestScore}% (Batas kelulusan minimum: {quizStatus.passingScore}%)
                </p>
              )}

              {blockingQuiz?.title && (
                <p className="text-[11px] text-[#626A66] dark:text-[#B4C0D0]">
                  Judul Kuis: <span className="font-semibold">{blockingQuiz.title}</span>
                </p>
              )}
            </div>
          )}

          <p className="text-[11px] text-[#626A66] dark:text-[#B4C0D0] italic leading-normal">
            Catatan: Posisi belajar Anda saat ini tetap aman. Anda dapat memilih untuk mengerjakan kuis sekarang atau tetap di sesi ini untuk mengulang materi.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t-2 border-[#292D2B]/15 dark:border-[#34465D]">
          <button
            type="button"
            onClick={onClose}
            className="nb-btn nb-btn-secondary px-4 py-2.5 text-xs font-bold justify-center"
          >
            Tetap di Sesi Ini
          </button>

          <button
            type="button"
            onClick={onGoToQuiz}
            className="nb-btn nb-btn-gold px-4 py-2.5 text-xs font-extrabold justify-center flex items-center gap-1.5"
          >
            <HelpCircle className="w-4 h-4 text-[#123D32]" />
            <span>Kerjakan Kuis Sekarang</span>
            <ArrowRight className="w-4 h-4 text-[#123D32]" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
