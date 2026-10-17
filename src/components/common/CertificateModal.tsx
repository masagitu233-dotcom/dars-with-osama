import React, { useEffect, useRef } from 'react';
import { X, Award, Printer, Download, CheckCircle, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Course } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  completionDate?: string;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  course,
  completionDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}) => {
  const { userProfile, user } = useAuth();
  const { language } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const studentName = userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Penuntut Ilmu';
  const certId = `CERT-${course.id.substring(0, 8).toUpperCase()}-${(user?.uid || 'GUEST').substring(0, 6).toUpperCase()}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 dark:bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl flex flex-col my-auto overflow-hidden">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-50 dark:bg-stone-900/90 border-b border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Award className="w-5 h-5" />
            <span className="font-semibold text-sm md:text-base text-stone-900 dark:text-white">Sertifikat Kelulusan & Pengakuan Studi</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs md:text-sm font-medium transition shadow cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-200 dark:text-stone-400 dark:hover:text-white dark:hover:bg-stone-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Canvas Area */}
        <div className="p-4 md:p-8 bg-stone-100 dark:bg-stone-950 flex justify-center">
          <div
            ref={printRef}
            className="w-full max-w-3xl bg-[#fffef9] text-stone-900 p-8 md:p-12 rounded-2xl shadow-xl relative border-[12px] border-emerald-950 border-double outline outline-2 outline-amber-500/80 font-serif"
            style={{ minHeight: '520px' }}
          >
            {/* Corner Ornaments */}
            <div className="absolute top-2 left-2 text-amber-600/40 text-xl select-none">⚜</div>
            <div className="absolute top-2 right-2 text-amber-600/40 text-xl select-none">⚜</div>
            <div className="absolute bottom-2 left-2 text-amber-600/40 text-xl select-none">⚜</div>
            <div className="absolute bottom-2 right-2 text-amber-600/40 text-xl select-none">⚜</div>

            {/* Top Basmalah & Header */}
            <div className="text-center space-y-2">
              <p className="font-amiri text-2xl md:text-3xl text-emerald-900 font-bold tracking-wide">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </p>
              <div className="flex items-center justify-center gap-2 text-amber-700 uppercase tracking-widest text-xs font-sans font-bold">
                <span>✦</span>
                <span>Dars with Osama</span>
                <span>✦</span>
              </div>
              <h2 className="text-2xl md:text-4xl font-amiri font-bold text-stone-900 pt-1">
                شَهَادَةُ إِتْمَامِ مُقَرَّرٍ عِلْمِيّ
              </h2>
              <p className="text-xs uppercase tracking-wider text-stone-600 font-sans font-semibold">
                CERTIFICATE OF COURSE COMPLETION
              </p>
            </div>

            {/* Divider Line */}
            <div className="my-6 flex items-center justify-center">
              <div className="h-[1px] bg-gradient-to-r from-transparent via-amber-600 to-transparent w-48"></div>
            </div>

            {/* Body */}
            <div className="text-center space-y-4 my-6">
              <p className="text-stone-700 text-sm md:text-base font-sans">
                Dengan memohon taufiq kepada Allah Ta'ala, kami menerangkan bahwa:
              </p>

              <div className="py-2">
                <h3 className="text-2xl md:text-3xl font-bold text-emerald-900 underline decoration-amber-500 decoration-2 underline-offset-8">
                  {studentName}
                </h3>
              </div>

              <p className="text-stone-700 text-sm md:text-base font-sans max-w-xl mx-auto leading-relaxed">
                Telah berhasil menyelesaikan seluruh rangkaian sesi pembelajaran serta lulus evaluasi kuis dalam program studi:
              </p>

              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 max-w-lg mx-auto">
                <p className="text-lg md:text-xl font-bold text-stone-900 font-sans">
                  {course.title}
                </p>
                {course.titleAr && (
                  <p className="text-xl md:text-2xl font-amiri font-bold text-emerald-900 mt-1">
                    {course.titleAr}
                  </p>
                )}
                <p className="text-xs text-stone-600 font-sans mt-1">
                  Pensyarah: {course.instructor}
                </p>
              </div>
            </div>

            {/* Signatures & Verification */}
            <div className="mt-10 pt-6 border-t border-stone-200 flex flex-col md:flex-row items-center justify-between text-xs text-stone-600 font-sans gap-6">
              <div className="text-left space-y-1">
                <p className="font-semibold text-stone-800">Nomor Verifikasi:</p>
                <code className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{certId}</code>
                <p className="text-[11px] text-stone-500">Tanggal Selesai: {completionDate}</p>
              </div>

              {/* Gold Seal Graphic */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 border-4 border-amber-100 shadow-md flex items-center justify-center text-white">
                  <Award className="w-8 h-8 drop-shadow" />
                </div>
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mt-1">VERIFIED PASS</span>
              </div>

              <div className="text-right space-y-1">
                <p className="font-semibold text-stone-800">Majelis Keilmuan & Penguji</p>
                <p className="font-amiri text-base text-emerald-950 font-bold">لجنة التعليم والتأهيل العلمي</p>
                <p className="text-[11px] text-stone-500">Dars with Osama Online</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-stone-100 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 text-xs flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Tersimpan secara resmi dalam akun Anda.
          </span>
          <span className="text-stone-500 dark:text-stone-400">Gunakan dialog cetak peramban untuk menyimpan sebagai PDF fisik</span>
        </div>
      </div>
    </div>
  );
};
