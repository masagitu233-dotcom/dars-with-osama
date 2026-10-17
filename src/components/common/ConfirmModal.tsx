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
    <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 sm:p-7 max-w-md w-full text-stone-900 dark:text-stone-100 shadow-2xl space-y-5 animate-modal-in"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
              isDangerous ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-500/20' : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-500/20'
            }`}>
              {isDangerous ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white font-sans">{title}</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">Konfirmasi Operasi Cloud Firestore</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-white rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {itemName && (
          <div className="p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800/80 rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">Target Dokumen:</span>
            <p className="font-semibold text-sm text-stone-800 dark:text-stone-200 line-clamp-2">{itemName}</p>
          </div>
        )}

        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
          {message || 'Apakah Anda yakin ingin menghapus data ini secara permanen dari Cloud Firestore? Tindakan ini tidak dapat dibatalkan.'}
        </p>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 active:scale-95 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold transition-all duration-200 disabled:opacity-50 cursor-pointer border border-stone-300 dark:border-stone-700"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold text-white transition-all duration-200 flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer ${
              isDangerous
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/50'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50'
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
