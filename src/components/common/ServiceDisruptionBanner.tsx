import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Database, ShieldCheck, WifiOff } from 'lucide-react';
import {
  formatDisruptionMessage,
  canAttemptRetry,
  getRemainingCooldownSeconds,
  DEFAULT_RETRY_COOLDOWN_SECONDS
} from '../../utils/serviceDisruptionHelper';

export interface ServiceDisruptionBannerProps {
  category?: string;
  code?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  cooldownSeconds?: number;
  lastAttemptTimestamp?: number;
  mode?: 'full' | 'banner';
  hasExistingData?: boolean;
  customTitle?: string;
  customMessage?: string;
}

export const ServiceDisruptionBanner: React.FC<ServiceDisruptionBannerProps> = ({
  category,
  code,
  onRetry,
  isRetrying = false,
  cooldownSeconds = DEFAULT_RETRY_COOLDOWN_SECONDS,
  lastAttemptTimestamp = 0,
  mode = 'full',
  hasExistingData = false,
  customTitle,
  customMessage
}) => {
  const [remainingCooldown, setRemainingCooldown] = useState<number>(() =>
    getRemainingCooldownSeconds(lastAttemptTimestamp, cooldownSeconds)
  );

  useEffect(() => {
    const updateCooldown = () => {
      const remaining = getRemainingCooldownSeconds(lastAttemptTimestamp, cooldownSeconds);
      setRemainingCooldown(remaining);
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [lastAttemptTimestamp, cooldownSeconds]);

  const info = formatDisruptionMessage(category, code);
  const displayTitle = customTitle || info.title;
  const displayMessage = customMessage || info.message;
  const isCooldownActive = remainingCooldown > 0;

  const handleRetryClick = () => {
    if (isCooldownActive || isRetrying) return;
    if (onRetry) {
      onRetry();
    }
  };

  // FULL MODE: Used when 0 items exist because of the disruption
  if (mode === 'full') {
    return (
      <div
        data-aos="fade-up"
        className="max-w-2xl mx-auto my-8 p-6 sm:p-8 bg-amber-50/90 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 rounded-3xl shadow-lg backdrop-blur-xs text-stone-800 dark:text-stone-200 space-y-5"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-500/15 dark:bg-amber-400/10 border border-amber-400/40 rounded-2xl text-amber-700 dark:text-amber-400 shrink-0">
            {info.isQuota ? (
              <Database className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            ) : info.category === 'network-or-domain-blocked' ? (
              <WifiOff className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            ) : (
              <AlertTriangle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            )}
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                {info.isQuota ? 'Batas Kuota Tercapai' : 'Kendala Server / Jaringan'}
              </span>
              {code && (
                <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400">
                  [{code}]
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-amber-950 dark:text-amber-100 font-serif-brand">
              {displayTitle}
            </h3>
            <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
              {displayMessage}
            </p>
          </div>
        </div>

        {/* REASSURANCE BADGE */}
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-100/70 dark:bg-amber-900/30 border border-amber-300/60 dark:border-amber-800 text-xs text-stone-700 dark:text-stone-300">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            <strong>Keamanan Data:</strong> Data artikel, kurikulum, dan akun Anda tetap aman tersimpan di Google Cloud Firestore.
          </span>
        </div>

        {/* RETRY CONTROLS */}
        {onRetry && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-amber-200 dark:border-amber-800/80">
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              {isCooldownActive
                ? `Jeda permintaan untuk mencegah beban berlebih (${remainingCooldown} dtk tersisa)`
                : 'Siap untuk mencoba menyinkronkan data kembali'}
            </span>

            <button
              onClick={handleRetryClick}
              disabled={isCooldownActive || isRetrying}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm ${
                isCooldownActive || isRetrying
                  ? 'bg-stone-300 dark:bg-stone-800 text-stone-500 dark:text-stone-400 cursor-not-allowed opacity-75'
                  : 'bg-amber-600 hover:bg-amber-700 active:scale-95 text-white shadow-amber-600/20'
              }`}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`}
              />
              <span>
                {isRetrying
                  ? 'Menyinkronkan...'
                  : isCooldownActive
                  ? `Coba Lagi (${remainingCooldown}s)`
                  : 'Coba Lagi'}
              </span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // BANNER MODE: Displayed when existing in-memory data is retained and shown
  return (
    <div
      data-aos="fade-down"
      className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/95 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 text-stone-800 dark:text-stone-200 shadow-md backdrop-blur-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-500/15 dark:bg-amber-400/15 rounded-xl text-amber-700 dark:text-amber-400 shrink-0">
          <Database className="w-4 h-4" />
        </div>
        <div className="text-xs space-y-0.5">
          <div className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
            <span>{displayTitle}</span>
            <span className="text-[10px] font-normal px-2 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              Data Tersimpan di Memori
            </span>
          </div>
          <p className="text-stone-600 dark:text-stone-300 line-clamp-1 sm:line-clamp-none">
            {displayMessage}
          </p>
        </div>
      </div>

      {onRetry && (
        <button
          onClick={handleRetryClick}
          disabled={isCooldownActive || isRetrying}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
            isCooldownActive || isRetrying
              ? 'bg-stone-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400 cursor-not-allowed'
              : 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
          }`}
        >
          <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>
            {isRetrying
              ? 'Memuat...'
              : isCooldownActive
              ? `Coba Lagi (${remainingCooldown}s)`
              : 'Coba Lagi'}
          </span>
        </button>
      )}
    </div>
  );
};
