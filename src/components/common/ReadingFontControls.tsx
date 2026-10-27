import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Type } from 'lucide-react';

const STORAGE_KEY = 'dars_reading_font_step';
const SYNC_EVENT = 'dars-reading-font-change';

export type FontScaleStep = -2 | -1 | 0 | 1 | 2;

const STEP_TO_SCALE: Record<FontScaleStep, number> = {
  [-2]: 0.85,
  [-1]: 0.92,
  [0]: 1,
  [1]: 1.1,
  [2]: 1.22,
};

function getStoredStep(): FontScaleStep {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return 0;
    const parsed = parseInt(raw, 10);
    if (parsed === -2 || parsed === -1 || parsed === 0 || parsed === 1 || parsed === 2) {
      return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return 0;
}

export function useReadingFontSize() {
  const [step, setStep] = useState<FontScaleStep>(() => getStoredStep());

  const updateStep = useCallback((nextStep: FontScaleStep) => {
    setStep(nextStep);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(nextStep));
      } catch {
        // ignore storage errors
      }
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: nextStep }));
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSync = (e: Event) => {
      const custom = e as CustomEvent<FontScaleStep>;
      if (typeof custom.detail === 'number') {
        setStep(custom.detail);
      } else {
        setStep(getStoredStep());
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setStep(getStoredStep());
      }
    };

    window.addEventListener(SYNC_EVENT, handleSync);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(SYNC_EVENT, handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const decrease = useCallback(() => {
    const next = Math.max(-2, step - 1) as FontScaleStep;
    updateStep(next);
  }, [step, updateStep]);

  const increase = useCallback(() => {
    const next = Math.min(2, step + 1) as FontScaleStep;
    updateStep(next);
  }, [step, updateStep]);

  const reset = useCallback(() => {
    updateStep(0);
  }, [updateStep]);

  const scale = STEP_TO_SCALE[step] ?? 1;
  const percentage = Math.round(scale * 100);

  const style: React.CSSProperties = {
    '--reading-font-scale': String(scale),
  } as React.CSSProperties;

  return {
    step,
    scale,
    percentage,
    canDecrease: step > -2,
    canIncrease: step < 2,
    isDefault: step === 0,
    decrease,
    increase,
    reset,
    style,
  };
}

interface ReadingFontControlsProps {
  step: FontScaleStep;
  percentage: number;
  canDecrease: boolean;
  canIncrease: boolean;
  isDefault: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  onReset: () => void;
  label?: string;
  compact?: boolean;
  className?: string;
}

export const ReadingFontControls: React.FC<ReadingFontControlsProps> = ({
  percentage,
  canDecrease,
  canIncrease,
  isDefault,
  onDecrease,
  onIncrease,
  onReset,
  label = 'Ukuran Teks',
  compact = false,
  className = '',
}) => {
  return (
    <div
      role="group"
      aria-label="Pengaturan ukuran teks bacaan"
      className={`inline-flex flex-wrap items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-md bg-[#FAF7F0] dark:bg-[#001722] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] text-xs ${className}`}
    >
      {!compact && (
        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#171717] dark:text-[#A6D6C9] mr-0.5 select-none">
          <Type className="w-3.5 h-3.5 text-[#123D32] dark:text-[#4CA7A1] shrink-0" />
          <span className="hidden xs:inline">{label}:</span>
        </span>
      )}

      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={onDecrease}
          disabled={!canDecrease}
          title="Perkecil ukuran teks bacaan (A−)"
          aria-label="Perkecil ukuran teks bacaan"
          className="px-2 py-1 min-w-[32px] min-h-[28px] rounded border-2 border-[#171717] dark:border-[#4CA7A1] bg-white dark:bg-[#0D2B36] hover:bg-[#123D32] hover:text-white dark:hover:bg-[#4CA7A1] dark:hover:text-[#001722] text-[#171717] dark:text-[#CEFEF1] font-extrabold text-xs leading-none transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none select-none flex items-center justify-center"
        >
          A−
        </button>

        <span
          title="Persentase ukuran teks saat ini"
          className="px-1.5 min-w-[42px] text-center font-mono text-[11px] font-extrabold text-[#123D32] dark:text-[#CEFEF1] select-none"
        >
          {percentage}%
        </span>

        <button
          type="button"
          onClick={onIncrease}
          disabled={!canIncrease}
          title="Perbesar ukuran teks bacaan (A+)"
          aria-label="Perbesar ukuran teks bacaan"
          className="px-2 py-1 min-w-[32px] min-h-[28px] rounded border-2 border-[#171717] dark:border-[#4CA7A1] bg-white dark:bg-[#0D2B36] hover:bg-[#123D32] hover:text-white dark:hover:bg-[#4CA7A1] dark:hover:text-[#001722] text-[#171717] dark:text-[#CEFEF1] font-extrabold text-xs leading-none transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none select-none flex items-center justify-center"
        >
          A+
        </button>

        <button
          type="button"
          onClick={onReset}
          disabled={isDefault}
          title="Kembalikan ukuran teks ke standar (Reset 100%)"
          aria-label="Kembalikan ukuran teks ke standar"
          className="px-2 py-1 min-h-[28px] rounded border-2 border-[#171717] dark:border-[#4CA7A1] bg-[#EFE5D2] dark:bg-[#1F5F63] hover:bg-[#123D32] hover:text-white dark:hover:bg-[#4CA7A1] dark:hover:text-[#001722] text-[#171717] dark:text-[#CEFEF1] font-extrabold text-[11px] leading-none transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none select-none inline-flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3 shrink-0" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};
