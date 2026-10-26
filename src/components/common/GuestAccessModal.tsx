import React, { useEffect } from 'react';
import { Lock, X, LogIn, UserPlus } from 'lucide-react';
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0B3026] border-3 border-[#171717] dark:border-[#D9AC45] rounded-lg shadow-[6px_6px_0px_#171717] dark:shadow-[6px_6px_0px_#000000] p-6 sm:p-8 text-[#171717] dark:text-[#F8F3E8] overflow-hidden animate-modal-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[#171717] dark:text-[#F8F3E8] hover:bg-[#F8F3E8] dark:hover:bg-[#06251D] rounded-md border-2 border-[#171717] dark:border-[#D9AC45]/60 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-md bg-[#06251D] border-2 border-[#171717] dark:border-[#D9AC45] text-[#D9AC45] shadow-[3px_3px_0px_#171717]">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl sm:text-2xl font-extrabold font-serif-brand text-[#171717] dark:text-white">
              Silakan Masuk ke Akun Dars with Osama
            </h3>
            <p className="text-xs sm:text-sm text-[#171717]/80 dark:text-[#F8F3E8]/85 leading-relaxed max-w-md mx-auto font-medium">
              Silakan masuk ke akun Dars with Osama untuk mulai belajar, memutar video syarah lengkap, menyimak naskah kajian, dan mengikuti kuis evaluasi.
            </p>
          </div>
        </div>

        {/* Optional Course Card Preview */}
        {course && (
          <div className="mt-5 p-3.5 bg-[#F8F3E8] dark:bg-[#06251D] border-2 border-[#171717] dark:border-[#D9AC45]/60 rounded-md flex items-center gap-3 text-left shadow-[3px_3px_0px_#171717]">
            <img
              src={course.coverImageUrl || 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=400&q=80'}
              alt={course.title}
              className="w-16 h-16 rounded-md object-cover border-2 border-[#171717] shrink-0"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-extrabold text-[#06251D] dark:text-[#D9AC45] tracking-wider">
                Materi Dikerjakan
              </span>
              <h4 className="text-xs sm:text-sm font-extrabold text-[#171717] dark:text-white truncate font-sans">
                {course.title}
              </h4>
              {course.titleAr && (
                <p className="text-xs text-[#06251D] dark:text-[#D9AC45] font-amiri font-bold truncate" dir="rtl">
                  {course.titleAr}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Main Action Buttons */}
        <div className="mt-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={onLogin}
              className="w-full py-3.5 px-4 nb-btn nb-btn-primary text-xs sm:text-sm"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk</span>
            </button>

            <button
              onClick={onRegister}
              className="w-full py-3.5 px-4 nb-btn nb-btn-gold text-xs sm:text-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Daftar Akun</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs font-extrabold text-[#171717]/75 hover:text-[#171717] dark:text-[#F8F3E8]/75 dark:hover:text-[#D9AC45] transition cursor-pointer"
          >
            Kembali ke Katalog Pembelajaran
          </button>
        </div>
      </div>
    </div>
  );
};
