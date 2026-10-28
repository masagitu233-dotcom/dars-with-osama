import React, { useState, useEffect, useMemo } from 'react';
import { ExternalLink, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import {
  isGoogleDriveUrl,
  getGoogleDriveImageCandidates,
  getGoogleDriveViewerUrl,
  extractGoogleDriveFileId
} from '../../utils/googleDriveHelper';

export interface ResilientGoogleDriveImageProps {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  isAdmin?: boolean;
  showAdminDiagnostic?: boolean;
  aspectRatioClass?: string;
  overflowClass?: string;
  objectFit?: 'cover' | 'contain';
  loading?: 'lazy' | 'eager';
  dataTestId?: string;
  containerStyle?: React.CSSProperties;
  imageStyle?: React.CSSProperties;
  forceFillParent?: boolean;
  onLoadSuccess?: () => void;
  onAllFailed?: () => void;
  onClick?: () => void;
}

/**
 * Resilient image renderer that automatically handles Google Drive links:
 * 1. Converts Google Drive links into high-res direct thumbnail / CDN candidate URLs.
 * 2. Cascades through fallback endpoints if a candidate encounters an error.
 * 3. If all candidates fail (e.g. file is set to Restricted/Private in Google Drive),
 *    renders an informative diagnostic message with guidance on how to set access permissions,
 *    and a direct button to open the file in Google Drive.
 */
export const ResilientGoogleDriveImage: React.FC<ResilientGoogleDriveImageProps> = ({
  src,
  alt,
  className = '',
  imageClassName = '',
  isAdmin = false,
  showAdminDiagnostic = false,
  aspectRatioClass = 'aspect-video',
  overflowClass = 'overflow-hidden',
  objectFit = 'cover',
  loading = 'lazy',
  dataTestId,
  containerStyle,
  imageStyle,
  forceFillParent = true,
  onLoadSuccess,
  onAllFailed,
  onClick
}) => {
  const isDrive = useMemo(() => isGoogleDriveUrl(src), [src]);
  const candidates = useMemo(() => getGoogleDriveImageCandidates(src), [src]);
  const fileId = useMemo(() => extractGoogleDriveFileId(src), [src]);

  const [candidateIndex, setCandidateIndex] = useState<number>(0);
  const [hasFailedAll, setHasFailedAll] = useState<boolean>(false);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  // Reset state whenever the source URL changes
  useEffect(() => {
    setCandidateIndex(0);
    setHasFailedAll(false);
    setHasLoaded(false);
  }, [src]);

  const currentCandidateUrl = candidates[candidateIndex] || '';

  const handleImageError = () => {
    if (candidateIndex + 1 < candidates.length) {
      // Advance to next candidate URL in fallback order
      setCandidateIndex(prev => prev + 1);
    } else {
      // All candidates exhausted
      setHasFailedAll(true);
      onAllFailed?.();
    }
  };

  const handleImageLoad = () => {
    setHasLoaded(true);
    setHasFailedAll(false);
    onLoadSuccess?.();
  };

  // If completely failed to render the image
  if (hasFailedAll || !currentCandidateUrl) {
    const viewerUrl = fileId ? getGoogleDriveViewerUrl(fileId) : src;
    const shouldShowAdminGuidance = isAdmin || showAdminDiagnostic;

    return (
      <div
        data-testid={dataTestId ? `${dataTestId}-fallback` : 'google-drive-image-fallback'}
        onClick={onClick}
        className={`w-full ${aspectRatioClass} flex flex-col items-center justify-center p-3 text-center bg-[#FAF7F0] dark:bg-[#1A283C] border-2 border-dashed border-[#D6AD52]/80 text-[#292D2B] dark:text-[#F1F4F8] select-none ${className}`}
      >
        <div className="w-9 h-9 rounded-full bg-[#D6AD52]/20 border border-[#D6AD52] flex items-center justify-center text-[#D6AD52] mb-1.5 shrink-0">
          {isDrive ? <AlertTriangle className="w-4 h-4 text-[#C6A75E]" /> : <ImageIcon className="w-4 h-4 text-[#626A66] dark:text-[#B4C0D0]" />}
        </div>

        {isDrive ? (
          <div className="space-y-1 max-w-[280px]">
            <p className="text-[11px] font-extrabold text-[#292D2B] dark:text-[#FAF7F0] leading-tight">
              Gambar Google Drive Tidak Dapat Dimuat
            </p>
            {shouldShowAdminGuidance ? (
              <p className="text-[10px] text-[#626A66] dark:text-[#B4C0D0] leading-tight">
                Pastikan setelan berbagi di Google Drive diatur ke:{' '}
                <strong className="text-[#123D32] dark:text-[#D6AD52]">
                  &quot;Siapa saja yang memiliki link&quot;
                </strong>{' '}
                (Anyone with the link).
              </p>
            ) : (
              <p className="text-[10px] text-[#626A66] dark:text-[#B4C0D0] leading-tight line-clamp-2">
                Akses file dibatasi oleh pemilik di Google Drive.
              </p>
            )}

            <div className="pt-1.5 flex items-center justify-center gap-1.5">
              <a
                href={viewerUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#243A56] hover:bg-[#345275] text-[#FAF7F0] border border-[#D6AD52] text-[10px] font-bold transition shadow-xs"
              >
                <ExternalLink className="w-3 h-3 text-[#D6AD52]" />
                <span>Buka di Google Drive</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-[#626A66] dark:text-[#B4C0D0]">
              Berkas gambar tidak dapat dimuat
            </p>
            <p className="text-[10px] text-[#626A66]/80 dark:text-[#B4C0D0]/80">
              Periksa kembali tautan berkas
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={containerStyle}
      className={`relative ${aspectRatioClass} ${overflowClass} ${className}`}
    >
      <img
        data-testid={dataTestId}
        src={currentCandidateUrl}
        alt={alt}
        loading={loading}
        style={imageStyle}
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={`${forceFillParent ? 'w-full h-full' : ''} ${
          objectFit === 'contain' ? 'object-contain' : 'object-cover'
        } transition-opacity duration-200 ${
          hasLoaded ? 'opacity-100' : 'opacity-80'
        } ${imageClassName}`}
      />
    </div>
  );
};
