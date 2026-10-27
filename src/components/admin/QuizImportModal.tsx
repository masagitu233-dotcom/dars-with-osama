import React, { useState } from 'react';
import {
  FileText,
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Plus,
  Trash2,
  ArrowRight,
  RotateCcw,
  BookOpen,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { Question } from '../../types';
import {
  parseQuizImportText,
  ParsedImportQuestion,
  convertImportQuestionsToQuestions
} from '../../utils/quizImportParser';

interface QuizImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportQuestions: (questions: Question[], mode: 'append' | 'replace') => void;
  existingQuestionsCount?: number;
}

const SAMPLE_QUIZ_TEXT = `1. Apa pengertian kalam menurut ilmu Nahwu?
A. Lafaz yang tidak memiliki makna
B. Lafaz yang memberikan pengertian sempurna menurut ketentuan bahasa
C. Semua kata yang terdiri dari tiga huruf
D. Kalimat yang selalu diawali isim
Kunci: B
Pembahasan: Kalam menurut Ibnu Ajurrum adalah lafaz yang tersusun, berfaedah (memberikan kepahaman sempurna), dan berbahasa Arab.

2. Manakah contoh susunan kalam yang sah?
A. زيد
B. قائم
C. زيد قائم
D. في
Kunci: C
Pembahasan: 'Zaidun Qaimun' terdiri dari musnad dan musnad ilayh serta memberikan faedah sempurna kepada pendengar.

3. Di bawah ini yang BUKAN termasuk tanda isim adalah:
A. Khafadh (jar)
B. Tanwin
C. Kemasukan Alif dan Lam (ال)
D. Kemasukan huruf jazm (لم)
Kunci: D
Pembahasan: Huruf jazm adalah tanda khusus untuk fi'il mudhari, bukan isim.`;

export const QuizImportModal: React.FC<QuizImportModalProps> = ({
  isOpen,
  onClose,
  onImportQuestions,
  existingQuestionsCount = 0
}) => {
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [rawText, setRawText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<ParsedImportQuestion[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [confirmReplaceWarning, setConfirmReplaceWarning] = useState(false);

  if (!isOpen) return null;

  const handleProcessText = () => {
    if (!rawText.trim()) return;
    const result = parseQuizImportText(rawText);
    setParsedQuestions(result.questions);
    setStep('preview');
  };

  const handleUseSampleText = () => {
    setRawText(SAMPLE_QUIZ_TEXT);
  };

  const handleUpdateQuestionText = (index: number, text: string) => {
    setParsedQuestions(prev => {
      const next = [...prev];
      next[index] = { ...next[index], questionText: text };
      return next;
    });
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, text: string) => {
    setParsedQuestions(prev => {
      const next = [...prev];
      const opts = [...next[qIndex].options];
      opts[optIndex] = text;
      next[qIndex] = { ...next[qIndex], options: opts };
      return next;
    });
  };

  const handleSetCorrectAnswer = (qIndex: number, optIndex: number) => {
    setParsedQuestions(prev => {
      const next = [...prev];
      const q = next[qIndex];
      const letter = String.fromCharCode(65 + optIndex);
      next[qIndex] = {
        ...q,
        correctAnswerIndex: optIndex,
        detectedKeyLetter: letter,
        status: q.options.length >= 2 ? 'valid' : 'missing_options',
        warningMessage: undefined
      };
      return next;
    });
  };

  const handleAddOption = (qIndex: number) => {
    setParsedQuestions(prev => {
      const next = [...prev];
      const q = next[qIndex];
      const nextLetter = String.fromCharCode(65 + q.options.length);
      next[qIndex] = {
        ...q,
        options: [...q.options, `Pilihan ${nextLetter}`]
      };
      return next;
    });
  };

  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    setParsedQuestions(prev => {
      const next = [...prev];
      const q = next[qIndex];
      if (q.options.length <= 2) return prev;
      const opts = q.options.filter((_, i) => i !== optIndex);
      let newKeyIndex = q.correctAnswerIndex;
      if (newKeyIndex === optIndex) {
        newKeyIndex = -1;
      } else if (newKeyIndex > optIndex) {
        newKeyIndex -= 1;
      }

      next[qIndex] = {
        ...q,
        options: opts,
        correctAnswerIndex: newKeyIndex,
        status: newKeyIndex >= 0 ? 'valid' : 'missing_key',
        warningMessage: newKeyIndex >= 0 ? undefined : 'Kunci belum dipilih setelah opsi dihapus.'
      };
      return next;
    });
  };

  const handleDeleteQuestion = (qIndex: number) => {
    setParsedQuestions(prev => prev.filter((_, i) => i !== qIndex));
  };

  const handleUpdateExplanation = (qIndex: number, exp: string) => {
    setParsedQuestions(prev => {
      const next = [...prev];
      next[qIndex] = { ...next[qIndex], explanation: exp };
      return next;
    });
  };

  const validQuestions = parsedQuestions.filter(q => q.status === 'valid');
  const needsReviewCount = parsedQuestions.length - validQuestions.length;

  const handleConfirmImport = () => {
    if (validQuestions.length === 0) return;

    if (importMode === 'replace' && existingQuestionsCount > 0 && !confirmReplaceWarning) {
      setConfirmReplaceWarning(true);
      return;
    }

    const converted = convertImportQuestionsToQuestions(parsedQuestions);
    onImportQuestions(converted, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-80 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="bg-[#FAF7F0] dark:bg-[#0A3D4A] border-3 border-[#292D2B] dark:border-[#1B6A78] w-full max-w-4xl rounded-lg overflow-hidden shadow-[8px_8px_0px_#292D2B] dark:shadow-[8px_8px_0px_#02141A] my-6 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-white dark:bg-[#0D4E5B] border-b-2 border-[#292D2B] dark:border-[#1B6A78] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-[#1D8B94] text-white border-2 border-[#292D2B] dark:border-[#1B6A78] shadow-[2px_2px_0px_#292D2B] dark:shadow-[2px_2px_0px_#02141A]">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-serif-brand font-black text-base sm:text-lg text-[#292D2B] dark:text-[#E2F4F0] leading-tight">
                Salin & Tempel Impor Kuis
              </h3>
              <p className="text-xs text-[#626A66] dark:text-[#B8DAD5] font-semibold mt-0.5">
                {step === 'input'
                  ? 'Tempel kumpulan soal teks dari dokumen eksternal untuk diproses otomatis'
                  : `Pratinjau & Periksa Soal (${parsedQuestions.length} Soal)`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-[#292D2B] dark:text-[#E2F4F0] hover:bg-[#EFE5D2] dark:hover:bg-[#10606F] border-2 border-transparent hover:border-[#292D2B] dark:hover:border-[#1B6A78] transition cursor-pointer"
            aria-label="Tutup modal impor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {step === 'input' ? (
            <div className="space-y-4">
              {/* Instructions and Format Guide */}
              <div className="p-4 rounded-md bg-white dark:bg-[#10606F] border-2 border-[#292D2B] dark:border-[#1B6A78] space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold uppercase tracking-wider text-[#123D32] dark:text-[#98D8D0] flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#1D8B94] dark:text-[#4FB8B4]" />
                    Format Teks yang Dikenali Otomatis:
                  </span>
                  <button
                    type="button"
                    onClick={handleUseSampleText}
                    className="text-[11px] font-black text-[#1D8B94] dark:text-[#4FB8B4] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Muat Contoh Soal Nahwu
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[#292D2B] dark:text-[#E2F4F0] font-medium pt-1">
                  <div className="p-2 rounded bg-[#FAF7F0] dark:bg-[#0A3D4A] border border-[#292D2B]/20 dark:border-[#1B6A78]">
                    <strong>Penomoran Soal:</strong>
                    <p className="text-[#626A66] dark:text-[#B8DAD5]">1. atau 1) atau Soal 1: atau Nomor 1:</p>
                  </div>
                  <div className="p-2 rounded bg-[#FAF7F0] dark:bg-[#0A3D4A] border border-[#292D2B]/20 dark:border-[#1B6A78]">
                    <strong>Pilihan Jawaban:</strong>
                    <p className="text-[#626A66] dark:text-[#B8DAD5]">A., B., C., D. atau A), a., dll.</p>
                  </div>
                  <div className="p-2 rounded bg-[#FAF7F0] dark:bg-[#0A3D4A] border border-[#292D2B]/20 dark:border-[#1B6A78]">
                    <strong>Kunci & Pembahasan:</strong>
                    <p className="text-[#626A66] dark:text-[#B8DAD5]">Kunci: B · Pembahasan: ...</p>
                  </div>
                </div>
                <p className="text-[10px] text-[#626A66] dark:text-[#B8DAD5] italic pt-1">
                  * Teks Arab berharakat, kutipan hadits, dan pertanyaan yang terdiri dari beberapa baris akan diproses utuh.
                </p>
              </div>

              {/* Large Multiline Textarea */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-[#292D2B] dark:text-[#E2F4F0] block mb-1.5">
                  Kolom Tempel Kumpulan Soal (Multibaris) <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <textarea
                  rows={14}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Tempelkan soal kuis Anda di sini...\n\nContoh:\n1. Apa pengertian kalam menurut ilmu Nahwu?\n   A. Lafaz yang tidak memiliki makna\n   B. Lafaz yang memberikan pengertian sempurna menurut ketentuan bahasa\n   C. Semua kata yang terdiri dari tiga huruf\n   D. Kalimat yang selalu diawali isim\n   Kunci: B\n   Pembahasan: Kalam adalah lafaz murakkab mufid bil-wadh'i.`}
                  className="nb-input w-full p-3.5 text-xs sm:text-sm font-sans leading-relaxed resize-y min-h-[260px]"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview Summary Bar */}
              <div className="p-3.5 rounded-md bg-white dark:bg-[#10606F] border-2 border-[#292D2B] dark:border-[#1B6A78] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-[#292D2B] dark:text-[#E2F4F0]">
                    Total: <strong>{parsedQuestions.length} Soal</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {validQuestions.length} Siap Diimpor
                  </span>
                  {needsReviewCount > 0 && (
                    <span className="inline-flex items-center gap-1 font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {needsReviewCount} Perlu Ditentukan Kunci
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="text-xs font-bold text-[#1D8B94] dark:text-[#4FB8B4] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Edit Teks Sumber
                </button>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {parsedQuestions.map((q, qIndex) => (
                  <div
                    key={q.id || qIndex}
                    className="p-4 sm:p-5 bg-white dark:bg-[#10606F] border-2 border-[#292D2B] dark:border-[#1B6A78] rounded-md space-y-3.5 shadow-[3px_3px_0px_#292D2B] dark:shadow-[3px_3px_0px_#02141A]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#292D2B]/15 dark:border-[#1B6A78] pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="nb-badge bg-[#FAF7F0] dark:bg-[#0A3D4A] text-[#292D2B] dark:text-[#E2F4F0] border-[#292D2B] dark:border-[#1B6A78]">
                          Soal #{qIndex + 1}
                        </span>

                        {q.status === 'valid' ? (
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Siap (Kunci: {String.fromCharCode(65 + q.correctAnswerIndex)})
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {q.warningMessage || 'Kunci belum dipilih'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddOption(qIndex)}
                          className="text-[11px] font-bold text-[#1D8B94] dark:text-[#4FB8B4] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          Tambah Opsi
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(qIndex)}
                          className="text-[11px] font-black text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer ml-2"
                        >
                          <Trash2 className="w-3 h-3" />
                          Hapus Soal
                        </button>
                      </div>
                    </div>

                    {/* Question Text Editor (Multiline) */}
                    <div>
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#292D2B] dark:text-[#E2F4F0] block mb-1">
                        Teks Pertanyaan:
                      </label>
                      <textarea
                        rows={3}
                        value={q.questionText}
                        onChange={(e) => handleUpdateQuestionText(qIndex, e.target.value)}
                        className="nb-input w-full p-2.5 text-xs sm:text-sm font-bold leading-relaxed resize-y"
                      />
                    </div>

                    {/* Options list with interactive radio selection */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#292D2B] dark:text-[#E2F4F0]">
                          Pilihan Jawaban (Klik radio pada jawaban yang BENAR):
                        </label>
                        <span className="text-[10px] text-[#626A66] dark:text-[#B8DAD5]">
                          Kunci saat ini: <strong>{q.correctAnswerIndex >= 0 ? String.fromCharCode(65 + q.correctAnswerIndex) : 'Belum Dipilih'}</strong>
                        </span>
                      </div>

                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = q.correctAnswerIndex === optIdx;
                          const letter = String.fromCharCode(65 + optIdx);

                          return (
                            <div
                              key={optIdx}
                              onClick={() => handleSetCorrectAnswer(qIndex, optIdx)}
                              className={`flex items-center gap-2 p-1.5 sm:p-2 rounded-md border-2 transition cursor-pointer ${
                                isCorrect
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-600 dark:border-emerald-500'
                                  : 'bg-[#FAF7F0] dark:bg-[#0A3D4A] border-[#292D2B]/20 dark:border-[#1B6A78] hover:border-[#1D8B94]'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`import-correct-${qIndex}`}
                                checked={isCorrect}
                                onChange={() => handleSetCorrectAnswer(qIndex, optIdx)}
                                className="w-4 h-4 accent-[#1D8B94] cursor-pointer shrink-0 ml-1"
                              />
                              <span className={`text-xs font-black w-6 text-center shrink-0 ${
                                isCorrect ? 'text-emerald-800 dark:text-emerald-300' : 'text-[#292D2B] dark:text-[#E2F4F0]'
                              }`}>
                                {letter}.
                              </span>
                              <input
                                type="text"
                                value={opt}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleUpdateOption(qIndex, optIdx, e.target.value)}
                                className="flex-1 nb-input py-1 px-2.5 text-xs font-medium"
                                placeholder={`Pilihan ${letter}...`}
                              />
                              {q.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveOption(qIndex, optIdx);
                                  }}
                                  className="p-1 text-stone-400 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 cursor-pointer"
                                  title="Hapus opsi ini"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Explanation */}
                    <div>
                      <label className="text-[11px] font-bold text-[#626A66] dark:text-[#B8DAD5] block mb-1">
                        Pembahasan / Penjelasan Jawaban (Opsional):
                      </label>
                      <textarea
                        rows={2}
                        value={q.explanation || ''}
                        onChange={(e) => handleUpdateExplanation(qIndex, e.target.value)}
                        placeholder="Tuliskan pembahasan rujukan ilmiah atau alasan jawaban benar..."
                        className="nb-input w-full p-2 text-xs font-normal"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Import Options: Append or Replace */}
              {existingQuestionsCount > 0 && (
                <div className="p-4 rounded-md bg-[#FAF7F0] dark:bg-[#0A3D4A] border-2 border-[#292D2B] dark:border-[#1B6A78] space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[#292D2B] dark:text-[#E2F4F0] block">
                    Metode Pemasukan Soal ke Kuis yang Ada:
                  </span>
                  <div className="flex flex-col sm:flex-row gap-4 text-xs font-bold text-[#292D2B] dark:text-[#E2F4F0]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'append'}
                        onChange={() => {
                          setImportMode('append');
                          setConfirmReplaceWarning(false);
                        }}
                        className="accent-[#1D8B94] w-4 h-4 cursor-pointer"
                      />
                      <span>Tambahkan ke daftar yang sudah ada ({existingQuestionsCount} soal saat ini + {parsedQuestions.length} baru)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="accent-[#1D8B94] w-4 h-4 cursor-pointer"
                      />
                      <span className="text-rose-700 dark:text-rose-400">Ganti seluruh soal lama dengan hasil impor</span>
                    </label>
                  </div>
                  {confirmReplaceWarning && importMode === 'replace' && (
                    <div className="p-3 bg-rose-100 dark:bg-rose-950/60 border border-rose-400 dark:border-rose-700 text-rose-800 dark:text-rose-200 text-xs rounded font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Konfirmasi: Tindakan ini akan menggantikan {existingQuestionsCount} soal lama kuis. Klik sekali lagi untuk melanjutkan.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-white dark:bg-[#0D4E5B] border-t-2 border-[#292D2B] dark:border-[#1B6A78] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={step === 'preview' ? () => setStep('input') : onClose}
            className="nb-btn nb-btn-secondary text-xs py-2 px-4 cursor-pointer w-full sm:w-auto"
          >
            {step === 'preview' ? '« Kembali ke Teks' : 'Batal'}
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {step === 'input' ? (
              <button
                type="button"
                onClick={handleProcessText}
                disabled={!rawText.trim()}
                className="nb-btn nb-btn-primary text-xs py-2 px-5 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 w-full sm:w-auto"
              >
                <span>Proses & Pratinjau Soal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={validQuestions.length === 0}
                className="nb-btn nb-btn-primary text-xs py-2 px-5 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 w-full sm:w-auto"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Tambahkan ke Kuis ({validQuestions.length} Soal Siap)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
