import React, { useEffect } from 'react';
import { LogOut, X } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  loading?: boolean;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md bg-white dark:bg-[#0B3026] border-3 border-[#171717] dark:border-[#D9AC45] rounded-lg shadow-[6px_6px_0px_#171717] dark:shadow-[6px_6px_0px_#000000] p-6 sm:p-8 text-[#171717] dark:text-[#F8F3E8] overflow-hidden animate-modal-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 text-[#171717] dark:text-[#F8F3E8] hover:bg-[#F8F3E8] dark:hover:bg-[#06251D] rounded-md border-2 border-[#171717] dark:border-[#D9AC45]/60 transition cursor-pointer disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-md bg-[#F04438] border-2 border-[#171717] text-white shadow-[3px_3px_0px_#171717]">
            <LogOut className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl sm:text-2xl font-extrabold font-serif-brand text-[#171717] dark:text-white">
              Yakin ingin keluar?
            </h3>
            <p className="text-xs sm:text-sm text-[#171717]/80 dark:text-[#F8F3E8]/85 leading-relaxed font-medium">
              Anda akan keluar dari akun Dars with Osama. Riwayat progres dan nilai kuis Anda tetap tersimpan aman.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-7 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:flex-1 py-3 px-4 nb-btn nb-btn-secondary text-xs sm:text-sm"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:flex-1 py-3 px-4 nb-btn nb-btn-danger text-xs sm:text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                <span>Ya, Keluar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
