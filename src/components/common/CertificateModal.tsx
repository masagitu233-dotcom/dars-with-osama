import React, { useEffect, useRef } from 'react';
import { X, Award, Printer, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Course } from '../../types';
import { useAuth } from '../../context/AuthContext';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#0B3026] border-3 border-[#171717] dark:border-[#D9AC45] rounded-lg shadow-[8px_8px_0px_#171717] flex flex-col my-auto overflow-hidden">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#06251D] border-b-2 border-[#171717] dark:border-[#D9AC45] text-white">
          <div className="flex items-center gap-2 text-[#D9AC45]">
            <Award className="w-5 h-5" />
            <span className="font-extrabold text-sm md:text-base text-white">
              Sertifikat Kelulusan &amp; Pengakuan Studi
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="nb-btn nb-btn-gold px-4 py-2 text-xs md:text-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-[#F04438] rounded-md border-2 border-[#D9AC45] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Canvas Area */}
        <div className="p-4 md:p-8 bg-[#F8F3E8] dark:bg-[#06251D] flex justify-center">
          <div
            ref={printRef}
            className="w-full max-w-3xl bg-[#F8F3E8] text-[#171717] p-8 md:p-12 rounded-md shadow-[6px_6px_0px_#171717] relative border-[8px] border-[#06251D] outline outline-2 outline-[#D9AC45] font-serif"
            style={{ minHeight: '520px' }}
          >
            {/* Corner Ornaments */}
            <div className="absolute top-2 left-2 text-[#D9AC45] text-xl select-none">⚜</div>
            <div className="absolute top-2 right-2 text-[#D9AC45] text-xl select-none">⚜</div>
            <div className="absolute bottom-2 left-2 text-[#D9AC45] text-xl select-none">⚜</div>
            <div className="absolute bottom-2 right-2 text-[#D9AC45] text-xl select-none">⚜</div>

            {/* Top Basmalah & Header */}
            <div className="text-center space-y-2">
              <p className="font-amiri text-2xl md:text-3xl text-[#06251D] font-bold tracking-wide">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </p>
              <div className="flex items-center justify-center gap-2 text-[#B88B28] uppercase tracking-widest text-xs font-sans font-extrabold">
                <span>✦</span>
                <span>Dars with Osama</span>
                <span>✦</span>
              </div>
              <h2 className="text-2xl md:text-4xl font-amiri font-bold text-[#171717] pt-1">
                شَهَادَةُ إِتْمَامِ مُقَرَّرٍ عِلْمِيّ
              </h2>
              <p className="text-xs uppercase tracking-wider text-[#171717]/75 font-sans font-extrabold">
                CERTIFICATE OF COURSE COMPLETION
              </p>
            </div>

            {/* Divider Line */}
            <div className="my-6 flex items-center justify-center">
              <div className="h-[2px] bg-[#171717] w-48"></div>
            </div>

            {/* Body */}
            <div className="text-center space-y-4 my-6">
              <p className="text-[#171717] text-sm md:text-base font-sans font-medium">
                Dengan memohon taufiq kepada Allah Ta&apos;ala, kami menerangkan bahwa:
              </p>

              <div className="py-2">
                <h3 className="text-2xl md:text-3xl font-extrabold text-[#06251D] underline decoration-[#D9AC45] decoration-3 underline-offset-8">
                  {studentName}
                </h3>
              </div>

              <p className="text-[#171717] text-sm md:text-base font-sans max-w-xl mx-auto leading-relaxed font-medium">
                Telah berhasil menyelesaikan seluruh rangkaian sesi pembelajaran serta lulus evaluasi kuis dalam program studi:
              </p>

              <div className="bg-white border-2 border-[#171717] shadow-[4px_4px_0px_#171717] rounded-md p-4 max-w-lg mx-auto">
                <p className="text-lg md:text-xl font-extrabold text-[#171717] font-sans">
                  {course.title}
                </p>
                {course.titleAr && (
                  <p className="text-xl md:text-2xl font-amiri font-bold text-[#06251D] mt-1">
                    {course.titleAr}
                  </p>
                )}
                <p className="text-xs text-[#171717]/80 font-sans font-bold mt-1">
                  Pensyarah: {course.instructor}
                </p>
              </div>
            </div>

            {/* Signatures & Verification */}
            <div className="mt-10 pt-6 border-t-2 border-[#171717]/20 flex flex-col md:flex-row items-center justify-between text-xs text-[#171717] font-sans gap-6">
              <div className="text-left space-y-1">
                <p className="font-extrabold">Nomor Verifikasi:</p>
                <code className="text-xs font-mono font-bold text-[#06251D] bg-white px-2 py-0.5 rounded-sm border-2 border-[#171717]">
                  {certId}
                </code>
                <p className="text-[11px] font-semibold text-[#171717]/75">Tanggal Selesai: {completionDate}</p>
              </div>

              {/* Gold Seal Graphic */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-md bg-[#D9AC45] border-2 border-[#171717] shadow-[3px_3px_0px_#171717] flex items-center justify-center text-[#171717]">
                  <Award className="w-8 h-8" />
                </div>
                <span className="text-[10px] font-extrabold text-[#06251D] uppercase tracking-wider mt-1">
                  VERIFIED PASS
                </span>
              </div>

              <div className="text-right space-y-1">
                <p className="font-extrabold text-[#171717]">Majelis Keilmuan &amp; Penguji</p>
                <p className="font-amiri text-base text-[#06251D] font-bold">لجنة التعليم والتأهيل العلمي</p>
                <p className="text-[11px] font-semibold text-[#171717]/75">Dars with Osama Online</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-[#F8F3E8] dark:bg-[#06251D] border-t-2 border-[#171717] dark:border-[#D9AC45]/50 text-[#171717] dark:text-[#F8F3E8] text-xs font-bold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-[#06251D] dark:text-[#D9AC45]" />
            Tersimpan secara resmi dalam akun Anda.
          </span>
          <span className="text-[#171717]/70 dark:text-[#F8F3E8]/70">
            Gunakan dialog cetak peramban untuk menyimpan sebagai PDF fisik
          </span>
        </div>
      </div>
    </div>
  );
};
