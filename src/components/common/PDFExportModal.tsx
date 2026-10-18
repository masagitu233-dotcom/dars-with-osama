import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Copy,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Consultation, BlogPost } from '../../types';
import {
  buildQAPdfHtml,
  buildArticlePdfHtml,
  exportDocumentToPdf,
  printDocumentViaDialog,
  sanitizePdfFilename,
  stripHtmlToText
} from '../../utils/pdfExportHelper';

interface PDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'qa' | 'article';
  qaData?: Consultation | null;
  articleData?: BlogPost | null;
}

export const PDFExportModal: React.FC<PDFExportModalProps> = ({
  isOpen,
  onClose,
  type,
  qaData,
  articleData
}) => {
  const [exporting, setExporting] = useState<boolean>(false);
  const [printing, setPrinting] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const title = type === 'qa' ? (qaData?.title || 'Tanya Jawab Syar\'i') : (articleData?.title || 'Artikel');
  const category = type === 'qa' ? (qaData?.category || 'Konsultasi Syar\'i') : (articleData?.category || 'Kajian');
  const filename = sanitizePdfFilename(type === 'qa' ? 'tanya-jawab' : 'artikel', title);

  const getHtmlContent = (): string => {
    if (type === 'qa' && qaData) {
      return buildQAPdfHtml(qaData);
    }
    if (type === 'article' && articleData) {
      return buildArticlePdfHtml(articleData);
    }
    throw new Error('Data konten tidak ditemukan untuk diekspor ke PDF.');
  };

  const handleExportPdf = async () => {
    setErrorMsg(null);
    setDownloadSuccess(false);
    setExporting(true);

    try {
      const html = getHtmlContent();
      await exportDocumentToPdf(html, filename);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err: unknown) {
      console.error('PDF Export Error:', err);
      const msg = err instanceof Error ? err.message : 'Terjadi kendala saat menyusun dan mengunduh file PDF.';
      setErrorMsg(msg);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = async () => {
    setErrorMsg(null);
    setPrinting(true);

    try {
      const html = getHtmlContent();
      await printDocumentViaDialog(html, filename);
    } catch (err: unknown) {
      console.error('Print Error:', err);
      const msg = err instanceof Error ? err.message : 'Terjadi kendala saat membuka dialog cetak.';
      setErrorMsg(msg);
    } finally {
      setPrinting(false);
    }
  };

  const handleCopyText = async () => {
    try {
      let fullText = '';
      if (type === 'qa' && qaData) {
        fullText = `DARS WITH OSAMA - ARSIP TANYA JAWAB SYAR'I\n` +
          `Topik: ${qaData.title}\n` +
          `Kategori: ${qaData.category || 'Umum'}\n\n` +
          `PERTANYAAN:\n${stripHtmlToText(qaData.content)}\n\n` +
          `JAWABAN RESMI USTAZ / PEMBIMBING:\n${stripHtmlToText(qaData.replyContent || '')}\n\n` +
          `Sumber: https://darswithosama.com`;
      } else if (type === 'article' && articleData) {
        fullText = `DARS WITH OSAMA - ARTIKEL KAJIAN ILMIAH\n` +
          `Judul: ${articleData.title}\n` +
          `Penulis: ${articleData.authorName || 'Ustaz Osama Nur Samsil'}\n` +
          `Kategori: ${articleData.category || 'Kajian'}\n\n` +
          `${stripHtmlToText(articleData.content)}\n\n` +
          `Sumber: https://darswithosama.com`;
      }

      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setErrorMsg('Gagal menyalin teks ke papan klip.');
    }
  };

  const handleOpenRawPreview = () => {
    try {
      const html = getHtmlContent();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal membuka pratinjau tab baru.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#071B16] rounded-3xl border border-[#073B2E]/20 dark:border-[#C9A34E]/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#073B2E] via-[#0c2b23] to-[#123B6D] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C9A34E]/20 border border-[#C9A34E]/30 flex items-center justify-center text-[#F4B942] shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#F4B942]">
                <Sparkles className="w-3 h-3" />
                <span>Naskah Dokumen Ilmiah A4</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold font-serif-brand text-[#F7F6EF]">
                Unduh Dokumen PDF
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-[#073B2E] dark:text-[#F7F6EF]">
          
          {/* Document Summary Card */}
          <div className="p-4 rounded-2xl bg-[#F7F6EF]/80 dark:bg-[#0c2b23] border border-[#073B2E]/10 dark:border-[#143e33] space-y-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="px-2.5 py-0.5 rounded-md bg-[#0EA5A4]/15 text-[#0EA5A4] dark:text-[#F4B942] font-bold">
                {category}
              </span>
              <span className="text-stone-500 dark:text-stone-400">
                Format: <strong className="text-[#073B2E] dark:text-[#F7F6EF]">A4 (Vektor & Teks Asli)</strong>
              </span>
            </div>

            <h4 className="text-sm font-bold font-serif-brand text-[#073B2E] dark:text-white leading-snug line-clamp-2">
              {title}
            </h4>

            <div className="text-[11px] text-stone-500 dark:text-stone-400 space-y-1 pt-2 border-t border-[#073B2E]/10 dark:border-[#143e33]">
              <div className="flex items-center justify-between">
                <span>Nama File Rekomendasi:</span>
                <code className="text-[#073B2E] dark:text-[#F4B942] font-mono text-[10px] bg-white dark:bg-stone-900 px-1.5 py-0.5 rounded">
                  {filename}
                </code>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold pt-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Teks Arab Amiri berharakat utuh & dapat disalin (bukan gambar raster).</span>
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {downloadSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 text-xs flex items-center gap-2.5 animate-fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <strong>Berhasil Mengunduh!</strong> Dokumen PDF telah tersimpan di folder Unduhan (Downloads) perangkat Anda.
              </div>
            </div>
          )}

          {/* Error Banner if any */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* User Guide Box */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed space-y-1">
            <strong className="block font-bold text-amber-950 dark:text-amber-100">
              💡 Petunjuk Pengunduhan & Pencetakan:
            </strong>
            <p>
              Klik <span className="font-bold text-[#073B2E] dark:text-[#F4B942]">"Unduh File PDF"</span> untuk langsung mengunduh file dokumen asli (.pdf) ke perangkat Anda. Jika Anda ingin mencetak langsung menggunakan mesin printer fisik, gunakan tombol <span className="font-bold">"Cetak"</span>.
            </p>
          </div>

        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div className="p-4 sm:p-5 bg-stone-50 dark:bg-[#071B16] border-t border-[#073B2E]/10 dark:border-[#C9A34E]/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyText}
              className="flex-1 sm:flex-initial px-3 py-2.5 rounded-xl border border-[#073B2E]/20 dark:border-[#C9A34E]/30 text-[#073B2E] dark:text-[#F7F6EF] text-xs font-semibold hover:bg-white dark:hover:bg-stone-800 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#C9A34E]" />}
              <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={printing || exporting}
              className="px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Buka dialog pencetakan printer perangkat"
            >
              <Printer className="w-3.5 h-3.5 text-stone-500" />
              <span>{printing ? 'Membuka...' : 'Cetak'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenRawPreview}
              className="px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition flex items-center justify-center gap-1 cursor-pointer"
              title="Pratinjau naskah dokumen pada tab baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pratinjau</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            >
              Tutup
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exporting}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#073B2E] hover:bg-[#0a4d3c] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {exporting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[#F4B942] border-t-transparent rounded-full animate-spin" />
                  <span>Mengunduh PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-[#F4B942]" />
                  <span>Unduh File PDF (.pdf)</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
