import React, { useEffect } from 'react';
import { Lock, X, LogIn, UserPlus, ArrowRight, BookOpen, GraduationCap } from 'lucide-react';
import { Course } from '../../types';

interface GuestAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onRegister: () => void;
  course?: Course | null;
}

export const GuestAccessModal: React.FC<GuestAccessModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onRegister,
  course
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 dark:bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl p-6 sm:p-8 text-stone-900 dark:text-stone-100 overflow-hidden animate-modal-in">
        {/* Soft Ambient Floating Glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-white dark:hover:bg-stone-800 rounded-full transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-400 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl sm:text-2xl font-bold font-sans text-stone-900 dark:text-white">
              Silakan Masuk ke Akun Dars with Osama
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed max-w-md mx-auto">
              Silakan masuk ke akun Dars with Osama untuk mulai belajar, memutar video syarah lengkap, menyimak naskah kajian, dan mengikuti kuis evaluasi.
            </p>
          </div>
        </div>

        {/* Optional Course Card Preview */}
        {course && (
          <div className="mt-5 p-3.5 bg-stone-50 dark:bg-stone-950/80 border border-stone-200 dark:border-stone-800 rounded-2xl flex items-center gap-3 text-left">
            <img
              src={course.coverImageUrl || 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=400&q=80'}
              alt={course.title}
              className="w-16 h-16 rounded-xl object-cover border border-stone-200 dark:border-stone-800 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Materi Dikerjakan</span>
              <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white truncate font-sans">{course.title}</h4>
              {course.titleAr && (
                <p className="text-xs text-amber-600 dark:text-amber-300 font-amiri truncate" dir="rtl">{course.titleAr}</p>
              )}
            </div>
          </div>
        )}

        {/* Main Action Buttons */}
        <div className="mt-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={onLogin}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs sm:text-sm transition duration-200 cursor-pointer shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk</span>
            </button>

            <button
              onClick={onRegister}
              className="w-full py-3.5 px-4 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-100 border border-stone-300 dark:border-stone-700 rounded-xl font-semibold text-xs sm:text-sm transition duration-200 cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Daftar Akun</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 font-medium transition cursor-pointer"
          >
            Kembali ke Katalog Pembelajaran
          </button>
        </div>
      </div>
    </div>
  );
};
