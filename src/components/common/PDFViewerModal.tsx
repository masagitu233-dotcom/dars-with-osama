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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/75 animate-fade-in">
      <div className="relative w-full max-w-5xl h-[88vh] bg-white dark:bg-[#0B3026] border-3 border-[#171717] dark:border-[#D9AC45] rounded-lg flex flex-col shadow-[8px_8px_0px_#171717] overflow-hidden animate-modal-in text-[#171717] dark:text-[#F8F3E8]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#06251D] border-b-2 border-[#171717] dark:border-[#D9AC45] text-[#F8F3E8]">
          <div className="flex items-center gap-3 truncate pr-4">
            <div className="p-2 bg-[#D9AC45] text-[#171717] border-2 border-[#171717] rounded-md shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="font-extrabold text-white text-sm md:text-base truncate">{pdfTitle}</h3>
              <p className="text-xs text-[#D9AC45] font-semibold">Pratinjau Berkas Dokumen PDF</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="nb-btn nb-btn-secondary px-3 py-1.5 text-xs"
              title="Unduh Berkas"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Unduh PDF</span>
            </a>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="nb-btn nb-btn-gold px-3 py-1.5 text-xs"
              title="Buka di Tab Baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tab Baru</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-white hover:bg-[#F04438] rounded-md border-2 border-[#D9AC45] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Embedded Frame or Viewer */}
        <div className="flex-1 w-full bg-[#F8F3E8] dark:bg-[#06251D] relative">
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=1`}
            className="w-full h-full border-0"
            title={pdfTitle}
          />
          {/* Fallback bar if browser blocks iframe embed */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white dark:bg-[#0B3026] text-[#171717] dark:text-[#F8F3E8] text-xs px-4 py-2 rounded-md border-2 border-[#171717] dark:border-[#D9AC45] shadow-[3px_3px_0px_#171717] flex items-center gap-2 font-bold">
            <span>Jika dokumen tidak tampil otomatis:</span>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#06251D] dark:text-[#D9AC45] underline flex items-center gap-1 font-extrabold"
            >
              Buka Langsung <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
