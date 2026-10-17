import React from 'react';
import { X, Download, ExternalLink, FileText } from 'lucide-react';

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl?: string;
  pdfTitle?: string;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  pdfTitle = 'Dokumen Materi Pembelajaran'
}) => {
  if (!isOpen || !pdfUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-5xl h-[88vh] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-modal-in text-stone-900 dark:text-stone-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-stone-50 dark:bg-stone-900/95 border-b border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200">
          <div className="flex items-center gap-3 truncate pr-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-sm md:text-base truncate">{pdfTitle}</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">Pratinjau Berkas Dokumen PDF</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 hover:text-stone-900 dark:hover:text-white rounded-lg text-xs font-medium transition cursor-pointer"
              title="Unduh Berkas"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Unduh PDF</span>
            </a>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition cursor-pointer"
              title="Buka di Tab Baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tab Baru</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Embedded Frame or Viewer */}
        <div className="flex-1 w-full bg-stone-100 dark:bg-stone-950 relative">
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=1`}
            className="w-full h-full border-0"
            title={pdfTitle}
          />
          {/* Fallback bar if browser blocks iframe embed */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-stone-900/90 text-stone-700 dark:text-stone-300 text-xs px-4 py-2 rounded-full border border-stone-200 dark:border-stone-800 shadow-md flex items-center gap-2">
            <span>Jika dokumen tidak tampil otomatis di peramban Anda:</span>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1">
              Buka Langsung <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
