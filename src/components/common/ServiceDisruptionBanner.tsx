import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Database, ShieldCheck, WifiOff } from 'lucide-react';
import {
  formatDisruptionMessage,
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

  if (mode === 'full') {
    return (
      <div
        className="max-w-2xl mx-auto my-8 p-6 sm:p-8 bg-white dark:bg-[#243A56] border-2 border-[#292D2B] dark:border-[#D6AD52] rounded-lg shadow-[5px_5px_0px_#292D2B] dark:shadow-[5px_5px_0px_#000000] text-[#292D2B] dark:text-[#F1F4F8] space-y-5"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#D6AD52] border-2 border-[#292D2B] rounded-md text-[#292D2B] shrink-0 shadow-[2px_2px_0px_#292D2B]">
            {info.isQuota ? (
              <Database className="w-7 h-7" />
            ) : info.category === 'network-or-domain-blocked' ? (
              <WifiOff className="w-7 h-7" />
            ) : (
              <AlertTriangle className="w-7 h-7" />
            )}
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="nb-badge bg-[#D6AD52] text-[#292D2B]">
                {info.isQuota ? 'Batas Kuota Tercapai' : 'Kendala Server / Jaringan'}
              </span>
              {code && (
                <span className="text-[10px] font-mono font-bold text-[#292D2B]/70 dark:text-[#D6AD52]">
                  [{code}]
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-[#292D2B] dark:text-white font-serif-brand">
              {displayTitle}
            </h3>
            <p className="text-xs sm:text-sm text-[#292D2B]/80 dark:text-[#F1F4F8]/85 leading-relaxed font-medium">
              {displayMessage}
            </p>
          </div>
        </div>

        {/* REASSURANCE BADGE */}
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-md bg-[#FAF7F0] dark:bg-[#16263D] border-2 border-[#292D2B] dark:border-[#D6AD52]/50 text-xs text-[#292D2B] dark:text-[#F1F4F8]">
          <ShieldCheck className="w-4 h-4 text-[#123D32] dark:text-[#D6AD52] shrink-0" />
          <span>
            <strong>Keamanan Data:</strong> Data artikel, kurikulum, dan akun Anda tetap aman tersimpan di Google Cloud Firestore.
          </span>
        </div>

        {/* RETRY CONTROLS */}
        {onRetry && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t-2 border-[#292D2B]/15 dark:border-[#D6AD52]/30">
            <span className="text-[11px] font-semibold text-[#292D2B]/70 dark:text-[#F1F4F8]/70">
              {isCooldownActive
                ? `Jeda permintaan untuk mencegah beban berlebih (${remainingCooldown} dtk tersisa)`
                : 'Siap untuk mencoba menyinkronkan data kembali'}
            </span>

            <button
              onClick={handleRetryClick}
              disabled={isCooldownActive || isRetrying}
              className="nb-btn nb-btn-primary px-5 py-2.5 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
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

  return (
    <div
      className="p-3.5 sm:p-4 rounded-md bg-[#FAF7F0] dark:bg-[#243A56] border-2 border-[#292D2B] dark:border-[#D6AD52] text-[#292D2B] dark:text-[#F1F4F8] shadow-[4px_4px_0px_#292D2B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#D6AD52] border-2 border-[#292D2B] rounded-md text-[#292D2B] shrink-0">
          <Database className="w-4 h-4" />
        </div>
        <div className="text-xs space-y-0.5">
          <div className="font-extrabold text-[#292D2B] dark:text-white flex items-center gap-2">
            <span>{displayTitle}</span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-sm bg-[#123D32] text-[#D6AD52] border border-[#292D2B]">
              Data Tersimpan di Memori
            </span>
          </div>
          <p className="text-[#292D2B]/80 dark:text-[#F1F4F8]/85 line-clamp-1 sm:line-clamp-none font-medium">
            {displayMessage}
          </p>
        </div>
      </div>

      {onRetry && (
        <button
          onClick={handleRetryClick}
          disabled={isCooldownActive || isRetrying}
          className="shrink-0 nb-btn nb-btn-gold px-3.5 py-1.5 text-xs"
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
