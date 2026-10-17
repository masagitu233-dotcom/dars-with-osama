import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  type?: 'success' | 'info' | 'error';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[120] max-w-sm w-full animate-fade-in-up">
      <div className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-lg flex items-start gap-3 text-xs sm:text-sm ${
        type === 'success'
          ? 'bg-emerald-50 dark:bg-emerald-950/95 border-emerald-300 dark:border-emerald-700/80 text-emerald-900 dark:text-emerald-100 shadow-xl'
          : type === 'error'
          ? 'bg-rose-50 dark:bg-rose-950/95 border-rose-300 dark:border-rose-700/80 text-rose-900 dark:text-rose-100 shadow-xl'
          : 'bg-white dark:bg-stone-900/95 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 shadow-xl'
      }`}>
        {type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />}
        {type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
        {type === 'info' && <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />}

        <div className="flex-1 leading-snug">{message}</div>

        <button
          onClick={onClose}
          className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-white transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
