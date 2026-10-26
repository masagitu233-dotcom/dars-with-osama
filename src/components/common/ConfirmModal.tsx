import React from 'react';
import { AlertTriangle, Trash2, X, RefreshCw } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  itemName?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  message,
  confirmText = 'Hapus Permanen',
  cancelText = 'Batal',
  isDangerous = true,
  loading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-black/75 animate-fade-in">
      <div
        className="bg-white dark:bg-[#0B3026] border-3 border-[#171717] dark:border-[#D9AC45] rounded-lg p-6 sm:p-7 max-w-md w-full text-[#171717] dark:text-[#F8F3E8] shadow-[6px_6px_0px_#171717] dark:shadow-[6px_6px_0px_#000000] space-y-5 animate-modal-in"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-[#171717]/15 dark:border-[#D9AC45]/30 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 border-2 border-[#171717] shadow-[2px_2px_0px_#171717] ${
                isDangerous
                  ? 'bg-[#F04438] text-white'
                  : 'bg-[#D9AC45] text-[#171717]'
              }`}
            >
              {isDangerous ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-[#171717] dark:text-white font-serif-brand">
                {title}
              </h3>
              <p className="text-xs font-bold text-[#171717]/65 dark:text-[#D9AC45]">
                Konfirmasi Operasi Cloud Firestore
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-[#171717] dark:text-[#F8F3E8] hover:bg-[#F8F3E8] dark:hover:bg-[#06251D] rounded-md border-2 border-[#171717] dark:border-[#D9AC45]/60 transition disabled:opacity-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {itemName && (
          <div className="p-3 bg-[#F8F3E8] dark:bg-[#06251D] border-2 border-[#171717] dark:border-[#D9AC45]/50 rounded-md space-y-1">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-[#06251D] dark:text-[#D9AC45]">
              Target Dokumen:
            </span>
            <p className="font-bold text-sm text-[#171717] dark:text-[#F8F3E8] line-clamp-2">
              {itemName}
            </p>
          </div>
        )}

        <p className="text-xs sm:text-sm text-[#171717]/85 dark:text-[#F8F3E8]/90 leading-relaxed font-medium">
          {message ||
            'Apakah Anda yakin ingin menghapus data ini secara permanen dari Cloud Firestore? Tindakan ini tidak dapat dibatalkan.'}
        </p>

        <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-[#171717]/15 dark:border-[#D9AC45]/30">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="nb-btn nb-btn-secondary px-4 py-2.5 text-xs"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`nb-btn px-5 py-2.5 text-xs ${
              isDangerous ? 'nb-btn-danger' : 'nb-btn-primary'
            }`}
          >
            {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>{loading ? 'Menghapus...' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
