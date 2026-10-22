/**
 * Helper utilities for handling Firestore service disruptions,
 * quota exhaustion (resource-exhausted), in-memory retention,
 * and debounced retry mechanisms with cooldown countdowns.
 */

export const DEFAULT_RETRY_COOLDOWN_SECONDS = 10;

export interface DisruptionMessageInfo {
  title: string;
  message: string;
  isQuota: boolean;
  category: string;
}

/**
 * Checks if enough time has passed since the last retry attempt.
 */
export function canAttemptRetry(
  lastAttemptTimestamp: number,
  cooldownSeconds: number = DEFAULT_RETRY_COOLDOWN_SECONDS,
  nowTimestamp: number = Date.now()
): boolean {
  if (!lastAttemptTimestamp || lastAttemptTimestamp <= 0) return true;
  const elapsedSeconds = Math.floor((nowTimestamp - lastAttemptTimestamp) / 1000);
  return elapsedSeconds >= cooldownSeconds;
}

/**
 * Computes remaining seconds of cooldown before another retry is allowed.
 */
export function getRemainingCooldownSeconds(
  lastAttemptTimestamp: number,
  cooldownSeconds: number = DEFAULT_RETRY_COOLDOWN_SECONDS,
  nowTimestamp: number = Date.now()
): number {
  if (!lastAttemptTimestamp || lastAttemptTimestamp <= 0) return 0;
  const elapsedSeconds = Math.floor((nowTimestamp - lastAttemptTimestamp) / 1000);
  const remaining = cooldownSeconds - elapsedSeconds;
  return remaining > 0 ? remaining : 0;
}

/**
 * Ensures in-memory data is never wiped or overwritten with empty arrays
 * when a fetch operation encounters an error (such as quota exhaustion).
 */
export function retainExistingDataOnFailure<T>(
  prevData: T[],
  fetchedData: T[] | null | undefined,
  errorOccurred: boolean
): T[] {
  if (errorOccurred) {
    // Preserve whatever data was already in memory
    return prevData;
  }
  return fetchedData ?? [];
}

/**
 * Returns user-friendly and honest explanation of the disruption,
 * clearly distinguishing quota exhaustion (resource-exhausted)
 * from network errors and general issues.
 */
export function formatDisruptionMessage(
  category?: string,
  code?: string
): DisruptionMessageInfo {
  const normCat = (category || '').toLowerCase();
  const normCode = (code || '').toLowerCase();
  const isQuota =
    normCat === 'resource-exhausted' ||
    normCode.includes('resource-exhausted') ||
    normCode.includes('quota');

  if (isQuota) {
    return {
      title: 'Batas Kuota Harian Firestore Terlampaui',
      message:
        'Layanan Cloud Firestore (Free Tier) sedang mencapai batas maksimal pembacaan data per hari. Seluruh data artikel, kurikulum, dan tanya jawab Anda tetap aman tersimpan di server dan tidak terhapus. Batas kuota akan diperbarui otomatis oleh Google Cloud atau Anda dapat mencoba memuat ulang kembali.',
      isQuota: true,
      category: 'resource-exhausted'
    };
  }

  if (normCat === 'network-or-domain-blocked' || normCode.includes('unavailable') || normCode.includes('offline')) {
    return {
      title: 'Koneksi ke Basis Data Terganggu',
      message:
        'Gagal berkomunikasi dengan Cloud Firestore. Perangkat mungkin sedang offline atau jaringan internet mengalami kendala. Data Anda aman di server.',
      isQuota: false,
      category: 'network-or-domain-blocked'
    };
  }

  if (normCat === 'permission-denied' || normCode.includes('permission-denied')) {
    return {
      title: 'Izin Akses Terbatas',
      message:
        'Akses data dibatasi oleh aturan keamanan server. Pastikan Anda masuk menggunakan akun yang sesuai.',
      isQuota: false,
      category: 'permission-denied'
    };
  }

  return {
    title: 'Gangguan Akses Basis Data Sementara',
    message:
      'Terjadi kendala saat menyinkronkan data dari Cloud Firestore. Data di server tetap utuh dan aman. Silakan klik tombol Coba Lagi setelah jeda.',
    isQuota: false,
    category: category || 'unknown-error'
  };
}
