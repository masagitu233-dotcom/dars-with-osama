import { Question } from '../types';

export interface ParsedImportQuestion {
  id: string;
  originalNumber?: number | string;
  questionText: string;
  questionTextAr?: string;
  options: string[];
  optionsAr?: string[];
  correctAnswerIndex: number; // 0-based; -1 if missing/invalid
  detectedKeyLetter?: string;
  explanation?: string;
  explanationAr?: string;
  points: number;
  type: 'multiple_choice';
  status: 'valid' | 'missing_key' | 'invalid_key' | 'missing_options';
  warningMessage?: string;
}

export interface ParseResult {
  questions: ParsedImportQuestion[];
  totalParsed: number;
  validCount: number;
  needsReviewCount: number;
  errors: string[];
}

/**
 * Normalizes question numbering patterns:
 * Matches:
 * - 1. or 1) or 1: or 1 -
 * - Soal 1: or Soal 1. or Soal #1: or Soal 1
 * - Nomor 1: or No 1: or No. 1.
 * - (1) or [1]
 */
const QUESTION_START_REGEX = /^\s*(?:(?:Soal|Nomor|No\.?|Q)\s*#?\s*(\d+)[:.)\-]?|(\d+)[:.)\-]|\((\d+)\)|\[(\d+)\])\s*(.*)/i;

/**
 * Normalizes option letter markers:
 * Matches:
 * - A. or A) or A: or A -
 * - a. or a) or a: or a -
 * - (A) or (a)
 * - [A] or [a]
 */
const OPTION_START_REGEX = /^\s*(?:\(([A-Ha-h])\)|\[([A-Ha-h])\]|([A-Ha-h])(?:\.|\)|:|\-))\s+(.*)/;

/**
 * Matches answer key markers:
 * Matches:
 * - Kunci: B or Kunci : B
 * - Kunci Jawaban: B or Kunci Jawaban : B
 * - Jawaban: B or Jawaban : B
 * - Jawaban Benar: B
 * - Key: B or Answer: B
 * - Kunci: [B] or Kunci: (B) or Kunci: Opsi B
 */
const ANSWER_KEY_REGEX = /^\s*(?:Kunci\s*Jawaban|Jawaban\s*Benar|Kunci|Jawaban|Key|Answer)\s*[:=\-]?\s*(?:opsi|pilihan)?\s*[(["]?\s*([A-Ha-h])\s*[)\]"]?(?:\s*[:.\-]?\s*(.*))?$/i;

/**
 * Matches explanation markers:
 * Matches:
 * - Pembahasan: ...
 * - Penjelasan: ...
 * - Explanation: ...
 * - Keterangan: ...
 */
const EXPLANATION_REGEX = /^\s*(?:Pembahasan|Penjelasan|Explanation|Keterangan)\s*[:=\-]?\s*(.*)/i;

/**
 * Parses raw text copied and pasted from external documents into structured quiz questions.
 * Handles multi-line questions, Arabic characters with harakat, multiple option styles, and key detection.
 */
export function parseQuizImportText(rawText: string): ParseResult {
  const result: ParseResult = {
    questions: [],
    totalParsed: 0,
    validCount: 0,
    needsReviewCount: 0,
    errors: []
  };

  if (!rawText || !rawText.trim()) {
    return result;
  }

  const lines = rawText.split(/\r?\n/);

  interface RawAccQuestion {
    num?: number | string;
    questionLines: string[];
    options: { letter: string; lines: string[] }[];
    detectedKey?: string;
    explanationLines: string[];
  }

  const rawQuestions: RawAccQuestion[] = [];
  let currentQ: RawAccQuestion | null = null;
  let currentTarget: 'question' | 'option' | 'explanation' | 'none' = 'none';

  const flushCurrentQuestion = () => {
    if (currentQ) {
      const qText = currentQ.questionLines.join('\n').trim();
      const hasContent = qText.length > 0 || currentQ.options.length > 0;
      if (hasContent) {
        rawQuestions.push(currentQ);
      }
      currentQ = null;
      currentTarget = 'none';
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i];
    const trimmedLine = originalLine.trim();

    if (!trimmedLine) {
      // Empty line: preserve paragraph breaks within multiline questions or explanations
      if (currentQ) {
        if (currentTarget === 'question' && currentQ.questionLines.length > 0) {
          // If the last line wasn't empty, add empty line
          if (currentQ.questionLines[currentQ.questionLines.length - 1] !== '') {
            currentQ.questionLines.push('');
          }
        } else if (currentTarget === 'explanation' && currentQ.explanationLines.length > 0) {
          if (currentQ.explanationLines[currentQ.explanationLines.length - 1] !== '') {
            currentQ.explanationLines.push('');
          }
        }
      }
      continue;
    }

    // Check Question Start
    const qMatch = trimmedLine.match(QUESTION_START_REGEX);
    if (qMatch) {
      const detectedNum = qMatch[1] || qMatch[2] || qMatch[3] || qMatch[4];
      const initialText = qMatch[5] || '';

      flushCurrentQuestion();

      currentQ = {
        num: detectedNum,
        questionLines: initialText ? [initialText] : [],
        options: [],
        explanationLines: []
      };
      currentTarget = 'question';
      continue;
    }

    // If no active question yet, create one implicitly
    if (!currentQ) {
      currentQ = {
        questionLines: [trimmedLine],
        options: [],
        explanationLines: []
      };
      currentTarget = 'question';
      continue;
    }

    // Check Answer Key
    const keyMatch = trimmedLine.match(ANSWER_KEY_REGEX);
    if (keyMatch) {
      const keyLetter = keyMatch[1]?.toUpperCase();
      currentQ.detectedKey = keyLetter;
      const extraExplanation = keyMatch[2]?.trim();
      if (extraExplanation) {
        currentQ.explanationLines.push(extraExplanation);
        currentTarget = 'explanation';
      } else {
        currentTarget = 'none';
      }
      continue;
    }

    // Check Explanation
    const expMatch = trimmedLine.match(EXPLANATION_REGEX);
    if (expMatch) {
      const expText = expMatch[1]?.trim() || '';
      if (expText) {
        currentQ.explanationLines.push(expText);
      }
      currentTarget = 'explanation';
      continue;
    }

    // Check Option Start
    const optMatch = trimmedLine.match(OPTION_START_REGEX);
    if (optMatch) {
      const letter = (optMatch[1] || optMatch[2] || optMatch[3]).toUpperCase();
      const text = optMatch[4] || '';
      currentQ.options.push({
        letter,
        lines: text ? [text] : []
      });
      currentTarget = 'option';
      continue;
    }

    // Continuation line based on current target
    if (currentTarget === 'question') {
      currentQ.questionLines.push(trimmedLine);
    } else if (currentTarget === 'option' && currentQ.options.length > 0) {
      const lastOpt = currentQ.options[currentQ.options.length - 1];
      lastOpt.lines.push(trimmedLine);
    } else if (currentTarget === 'explanation') {
      currentQ.explanationLines.push(trimmedLine);
    } else {
      // Default fallback: if options haven't started, append to question
      if (currentQ.options.length === 0) {
        currentQ.questionLines.push(trimmedLine);
        currentTarget = 'question';
      } else {
        // Options already exist: append to last option
        const lastOpt = currentQ.options[currentQ.options.length - 1];
        lastOpt.lines.push(trimmedLine);
        currentTarget = 'option';
      }
    }
  }

  flushCurrentQuestion();

  // Process raw questions into structured ParsedImportQuestion
  result.questions = rawQuestions.map((rq, idx) => {
    const questionText = rq.questionLines.join('\n').trim();
    const explanation = rq.explanationLines.join('\n').trim();
    const options = rq.options.map(opt => opt.lines.join(' ').trim());

    const parsedQ: ParsedImportQuestion = {
      id: `q_import_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      originalNumber: rq.num ? (isNaN(Number(rq.num)) ? rq.num : Number(rq.num)) : idx + 1,
      questionText,
      options,
      correctAnswerIndex: -1,
      detectedKeyLetter: rq.detectedKey,
      explanation: explanation || undefined,
      points: 10,
      type: 'multiple_choice',
      status: 'valid'
    };

    // Validation
    if (options.length < 2) {
      parsedQ.status = 'missing_options';
      parsedQ.warningMessage = `Hanya ${options.length} pilihan terdeteksi. Minimal 2 pilihan jawaban diperlukan.`;
    } else if (rq.detectedKey) {
      const keyLetter = rq.detectedKey.toUpperCase();
      const keyIndex = keyLetter.charCodeAt(0) - 65; // A=0, B=1, C=2...

      if (keyIndex >= 0 && keyIndex < options.length) {
        parsedQ.correctAnswerIndex = keyIndex;
        parsedQ.status = 'valid';
      } else {
        parsedQ.status = 'invalid_key';
        parsedQ.warningMessage = `Kunci jawaban '${keyLetter}' tidak sesuai dengan jumlah pilihan (${options.length} pilihan: A-${String.fromCharCode(64 + options.length)}).`;
      }
    } else {
      parsedQ.status = 'missing_key';
      parsedQ.warningMessage = 'Kunci belum terdeteksi. Silakan pilih kunci jawaban secara manual.';
    }

    return parsedQ;
  });

  result.totalParsed = result.questions.length;
  result.validCount = result.questions.filter(q => q.status === 'valid').length;
  result.needsReviewCount = result.totalParsed - result.validCount;

  return result;
}

/**
 * Converts validated ParsedImportQuestion items into production Question objects ready for Firebase save.
 */
export function convertImportQuestionsToQuestions(parsedList: ParsedImportQuestion[]): Question[] {
  return parsedList.map((pq, idx) => ({
    id: pq.id || `q_${Date.now()}_${idx}`,
    questionText: pq.questionText,
    questionTextAr: pq.questionTextAr || '',
    type: pq.type || 'multiple_choice',
    options: pq.options,
    optionsAr: pq.optionsAr || [],
    correctAnswerIndex: pq.correctAnswerIndex >= 0 ? pq.correctAnswerIndex : 0,
    explanation: pq.explanation || '',
    explanationAr: pq.explanationAr || '',
    points: pq.points || 10
  }));
}
