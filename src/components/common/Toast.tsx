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
      <div
        className={`p-4 rounded-md border-2 border-[#292D2B] shadow-[4px_4px_0px_#292D2B] flex items-start gap-3 text-xs sm:text-sm font-bold ${
          type === 'success'
            ? 'bg-[#123D32] text-[#FAF7F0] dark:border-[#D6AD52]'
            : type === 'error'
            ? 'bg-[#F04438] text-white'
            : 'bg-[#FAF7F0] dark:bg-[#243A56] text-[#292D2B] dark:text-[#F1F4F8] dark:border-[#D6AD52]'
        }`}
      >
        {type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#D6AD52] shrink-0 mt-0.5" />}
        {type === 'error' && <AlertCircle className="w-5 h-5 text-white shrink-0 mt-0.5" />}
        {type === 'info' && <Info className="w-5 h-5 text-[#42658A] dark:text-[#D6AD52] shrink-0 mt-0.5" />}

        <div className="flex-1 leading-snug">{message}</div>

        <button
          onClick={onClose}
          className="p-1 rounded-sm border border-current/30 hover:bg-black/15 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
