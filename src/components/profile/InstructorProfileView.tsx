import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  HelpCircle,
  Share2,
  Copy,
  Check,
  Sparkles,
  UserCheck,
  Image as ImageIcon,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Briefcase,
  Award,
  MapPin,
  Calendar,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { InstructorProfile, InstructorProfileImage } from '../../types';
import { PORTFOLIO_WEBSITE_URL } from '../../firebase/portfolioConfig';
import { subscribePortfolioInstructorProfile } from '../../firebase/portfolioProfileService';
import { PortfolioInstructorSummary } from '../../utils/portfolioProfileHelper';
import { normalizeProfileSections, normalizeSupportingImages } from '../../utils/instructorProfileHelper';
import { sanitizeRichTextHtml } from '../../utils/richTextHelper';
import { autoWrapArabicText } from '../../utils/arabicFontHelper';
import { useAuth } from '../../context/AuthContext';
import { ResilientGoogleDriveImage } from '../common/ResilientGoogleDriveImage';
import { resolveDisplayImageUrl, getGoogleDriveViewerUrl, isGoogleDriveUrl } from '../../utils/googleDriveHelper';

interface InstructorProfileViewProps {
  profileData?: InstructorProfile;
  isPreviewMode?: boolean;
  onBack?: () => void;
  onNavigate?: (view: string) => void;
  onEditInAdmin?: () => void;
}

const getInitials = (name: string): string =>
  (name || 'Osama Nur Samsil')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

/**
 * Resilient portrait renderer for public Google Drive profile photos.
 * Cycles automatically across public Google Drive CDN/thumbnail candidates without requiring login,
 * and falls back gracefully to the instructor monogram if unavailable.
 */
const PortfolioPortrait: React.FC<{
  photoCandidates: string[];
  fullName: string;
}> = ({ photoCandidates, fullName }) => {
  const candidatesKey = photoCandidates.join('|');
  const [candidateIndex, setCandidateIndex] = useState<number>(0);
  const [failedAll, setFailedAll] = useState<boolean>(false);

  useEffect(() => {
    setCandidateIndex(0);
    setFailedAll(false);
  }, [candidatesKey]);

  const currentSrc = photoCandidates[candidateIndex] || '';
  const initials = getInitials(fullName);

  const handleError = () => {
    if (candidateIndex + 1 < photoCandidates.length) {
      setCandidateIndex((prev) => prev + 1);
    } else {
      setFailedAll(true);
    }
  };

  return (
    <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-md overflow-hidden border-2 border-[#D6AD52] bg-[#243A56] shadow-[4px_4px_0px_#000000] flex items-center justify-center relative">
      {currentSrc && !failedAll ? (
        <img
          data-testid="instructor-profile-photo"
          src={currentSrc}
          alt={fullName || 'Profil Pengajar'}
          referrerPolicy="no-referrer"
          loading="eager"
          onError={handleError}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          data-testid="instructor-profile-monogram"
          className="w-full h-full flex flex-col items-center justify-center bg-[#243A56] text-[#D6AD52] select-none"
        >
          <span className="font-serif text-4xl sm:text-5xl font-bold tracking-wider">
            {initials}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-[#FAF7F0]/80 mt-1 font-extrabold">
            Dars with Osama
          </span>
        </div>
      )}
    </div>
  );
};

export const InstructorProfileView: React.FC<InstructorProfileViewProps> = ({
  profileData,
  isPreviewMode = false,
  onBack,
  onNavigate
}) => {
  const { isAdmin } = useAuth();

  // Live portfolio data state (used on public /profil-pengajar page)
  const [portfolio, setPortfolio] = useState<PortfolioInstructorSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(!profileData);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  // Legacy admin preview states (only used when profileData prop is explicitly passed)
  const [previewPhotoError, setPreviewPhotoError] = useState<boolean>(false);
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<InstructorProfileImage | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);
  const [lightboxMode, setLightboxMode] = useState<'fit' | 'scroll'>('fit');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0
  });
  const lightboxScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profileData) {
      setPreviewPhotoError(false);
      setLoading(false);
      setLoadError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setLoadError(null);

    const unsubscribe = subscribePortfolioInstructorProfile(
      (summary) => {
        if (!isMounted) return;
        if (summary) {
          setPortfolio(summary);
          setLoadError(null);
        } else {
          setPortfolio(null);
          setLoadError('Data profil publik pengajar belum tersedia saat ini.');
        }
        setLoading(false);
      },
      () => {
        if (!isMounted) return;
        setLoadError('Data profil pengajar sedang tidak dapat dimuat dari portofolio. Silakan coba beberapa saat lagi atau buka halaman portofolio secara langsung.');
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [profileData, retryNonce]);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://darswithosama.com';
  const profileUrl = `${origin}/profil-pengajar`;

  const displayName = profileData?.name || portfolio?.fullName || 'Osama Nur Samsil';
  const displayRole = profileData?.role || portfolio?.headline || 'Pengajar Dars with Osama';
  const portfolioWebsiteUrl = portfolio?.portfolioUrl || PORTFOLIO_WEBSITE_URL;

  const handleCopyProfileLink = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(profileUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = profileUrl;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.warn('Copy link error:', err);
    }
  };

  const handleShareProfile = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${displayName} — Profil Pengajar Dars with Osama`,
          text: `${displayName} (${displayRole}) di Dars with Osama`,
          url: profileUrl
        });
        return;
      } catch {
        // Fallback to copy link
      }
    }
    handleCopyProfileLink();
  };

  // Legacy admin preview helpers (only active when profileData is supplied)
  const orderedSections = profileData ? normalizeProfileSections(profileData.sections) : [];
  const orderedImages = profileData ? normalizeSupportingImages(profileData.supportingImages) : [];

  useEffect(() => {
    if (!profileData) return;
    setLightboxZoom(1);
    setLightboxMode('fit');
    if (lightboxScrollRef.current) {
      lightboxScrollRef.current.scrollTop = 0;
      lightboxScrollRef.current.scrollLeft = 0;
    }
  }, [profileData, selectedLightboxImage?.id]);

  useEffect(() => {
    if (!profileData || !selectedLightboxImage) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedLightboxImage(null);
      } else if (e.key === 'ArrowRight' && orderedImages.length > 1) {
        const currentIndex = orderedImages.findIndex((img) => img.id === selectedLightboxImage.id);
        if (currentIndex !== -1) {
          setSelectedLightboxImage(orderedImages[(currentIndex + 1) % orderedImages.length]);
        }
      } else if (e.key === 'ArrowLeft' && orderedImages.length > 1) {
        const currentIndex = orderedImages.findIndex((img) => img.id === selectedLightboxImage.id);
        if (currentIndex !== -1) {
          setSelectedLightboxImage(orderedImages[(currentIndex - 1 + orderedImages.length) % orderedImages.length]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileData, selectedLightboxImage, orderedImages]);

  // =========================================================================
  // LEGACY ADMIN PREVIEW MODE (only when explicit profileData prop is passed)
  // =========================================================================
  if (profileData) {
    const previewInitials = getInitials(profileData.name);

    const handleNextImage = () => {
      if (!selectedLightboxImage || orderedImages.length <= 1) return;
      const currentIndex = orderedImages.findIndex((img) => img.id === selectedLightboxImage.id);
      if (currentIndex === -1) return;
      setSelectedLightboxImage(orderedImages[(currentIndex + 1) % orderedImages.length]);
    };

    const handlePrevImage = () => {
      if (!selectedLightboxImage || orderedImages.length <= 1) return;
      const currentIndex = orderedImages.findIndex((img) => img.id === selectedLightboxImage.id);
      if (currentIndex === -1) return;
      setSelectedLightboxImage(orderedImages[(currentIndex - 1 + orderedImages.length) % orderedImages.length]);
    };

    const handleZoomIn = () => setLightboxZoom((prev) => Math.min(3.0, Number((prev + 0.25).toFixed(2))));
    const handleZoomOut = () => setLightboxZoom((prev) => Math.max(0.75, Number((prev - 0.25).toFixed(2))));
    const handleResetZoom = () => {
      setLightboxZoom(1);
      setLightboxMode('fit');
      if (lightboxScrollRef.current) {
        lightboxScrollRef.current.scrollTop = 0;
        lightboxScrollRef.current.scrollLeft = 0;
      }
    };
    const handleToggleMode = () => {
      setLightboxMode((prev) => (prev === 'fit' ? 'scroll' : 'fit'));
      setLightboxZoom(1);
      if (lightboxScrollRef.current) {
        lightboxScrollRef.current.scrollTop = 0;
        lightboxScrollRef.current.scrollLeft = 0;
      }
    };

    return (
      <div
        data-testid="instructor-profile-view"
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 py-6 pb-16 animate-fade-in font-sans"
      >
        <section className="relative overflow-hidden rounded-lg bg-[#123D32] dark:bg-[#16263D] text-[#FAF7F0] dark:text-[#F1F4F8] border-2 border-[#292D2B] dark:border-[#D6AD52] shadow-[6px_6px_0px_#292D2B] dark:shadow-[6px_6px_0px_#000000] p-6 sm:p-10">
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
            <div className="shrink-0 flex flex-col items-center space-y-2.5">
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-md overflow-hidden border-2 border-[#D6AD52] bg-[#243A56] shadow-[4px_4px_0px_#000000] flex items-center justify-center relative">
                {profileData.photoUrl && !previewPhotoError ? (
                  <img
                    data-testid="instructor-profile-photo"
                    src={resolveDisplayImageUrl(profileData.photoUrl)}
                    alt={profileData.name}
                    onError={() => setPreviewPhotoError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    data-testid="instructor-profile-monogram"
                    className="w-full h-full flex flex-col items-center justify-center bg-[#243A56] text-[#D6AD52] select-none"
                  >
                    <span className="font-serif text-4xl sm:text-5xl font-bold tracking-wider">
                      {previewInitials}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-[#FAF7F0]/80 mt-1 font-extrabold">
                      Dars with Osama
                    </span>
                  </div>
                )}
              </div>
              {profileData.photoCaption && (
                <p className="text-[11px] text-[#D6AD52] text-center max-w-[200px] leading-snug italic">
                  {profileData.photoCaption}
                </p>
              )}
            </div>

            <div className="flex-1 text-center md:text-left space-y-4 min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#C6A75E] border-2 border-[#171717] text-[#171923] text-xs font-extrabold uppercase tracking-wider">
                <UserCheck className="w-3.5 h-3.5 text-[#171923]" />
                <span data-testid="instructor-profile-title">{profileData.title || 'Profil Pengajar Dars with Osama'}</span>
              </div>

              <div className="space-y-1.5">
                <h1
                  data-testid="instructor-profile-name"
                  className="text-2xl sm:text-4xl font-bold font-serif tracking-tight text-[#F0EEE8] leading-tight"
                >
                  {profileData.name}
                </h1>
                <p
                  data-testid="instructor-profile-role"
                  className="text-sm sm:text-base font-bold text-[#C6A75E]"
                >
                  {profileData.role}
                </p>
              </div>

              {profileData.biography && (
                <div
                  data-testid="instructor-profile-biography"
                  className="pt-2 text-sm sm:text-base text-[#F0EEE8] leading-relaxed space-y-3 blog-content instructor-dark-panel-content"
                  dangerouslySetInnerHTML={{
                    __html: autoWrapArabicText(sanitizeRichTextHtml(profileData.biography))
                  }}
                />
              )}
            </div>
          </div>
        </section>

        {profileData.mainContent && profileData.mainContent.replace(/<[^>]*>/g, '').trim() !== '' && (
          <article className="nb-reading-surface p-6 sm:p-10 space-y-4">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#123D32] dark:text-[#D6AD52] border-b-2 border-[#292D2B]/15 dark:border-[#D6AD52]/25 pb-3">
              <Sparkles className="w-4 h-4 text-[#D6AD52]" />
              <span>Pengantar &amp; Catatan Profil</span>
            </div>
            <div
              data-testid="instructor-profile-main-content"
              className="prose dark:prose-invert max-w-none text-[#292D2B] dark:text-[#F1F4F8] text-sm sm:text-base leading-relaxed space-y-4 font-sans blog-content"
              dangerouslySetInnerHTML={{
                __html: autoWrapArabicText(sanitizeRichTextHtml(profileData.mainContent))
              }}
            />
          </article>
        )}

        {orderedSections.length > 0 && (
          <div data-testid="instructor-profile-sections" className="space-y-6">
            {orderedSections.map((sec) => (
              <section key={sec.id} className="nb-reading-surface p-6 sm:p-10 space-y-5">
                {sec.title && (
                  <div className="border-b-2 border-[#292D2B]/15 dark:border-[#D6AD52]/25 pb-3">
                    <h2 className="text-lg sm:text-2xl font-bold text-[#292D2B] dark:text-white font-serif">
                      {sec.title}
                    </h2>
                  </div>
                )}
                {sec.imageUrl && (
                  <figure className="space-y-2">
                    <div className="rounded-md overflow-hidden bg-[#123D32] dark:bg-[#16263D] border-2 border-[#292D2B] dark:border-[#D6AD52]/60 max-h-[460px] flex items-center justify-center">
                      <ResilientGoogleDriveImage
                        src={sec.imageUrl}
                        alt={sec.imageCaption || sec.title || 'Gambar Bagian Profil'}
                        aspectRatioClass="w-full max-h-[460px]"
                        isAdmin={isAdmin}
                      />
                    </div>
                  </figure>
                )}
                {sec.content && (
                  <div
                    className="prose dark:prose-invert max-w-none text-[#292D2B] dark:text-[#F1F4F8] text-sm sm:text-base leading-relaxed space-y-4 font-sans blog-content"
                    dangerouslySetInnerHTML={{
                      __html: autoWrapArabicText(sanitizeRichTextHtml(sec.content))
                    }}
                  />
                )}
              </section>
            ))}
          </div>
        )}

        {orderedImages.length > 0 && (
          <section data-testid="instructor-supporting-images" className="nb-card p-6 sm:p-10 space-y-5">
            <div className="flex items-center justify-between border-b-2 border-[#292D2B]/15 dark:border-[#D6AD52]/25 pb-3">
              <h2 className="text-lg sm:text-xl font-bold text-[#292D2B] dark:text-white font-serif flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#123D32] dark:text-[#D6AD52]" />
                <span>Galeri &amp; Dokumentasi Pendukung</span>
              </h2>
              <span className="text-xs text-[#123D32] dark:text-[#D6AD52] font-extrabold">
                {orderedImages.length} Gambar
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {orderedImages.map((img) => (
                <figure
                  key={img.id}
                  onClick={() => setSelectedLightboxImage(img)}
                  className="group nb-card-interactive overflow-hidden flex flex-col justify-between cursor-pointer"
                >
                  <div className="aspect-video w-full overflow-hidden bg-[#123D32] dark:bg-[#16263D] border-b-2 border-[#292D2B] dark:border-[#D6AD52]/60">
                    <ResilientGoogleDriveImage
                      src={img.url}
                      alt={img.caption || profileData.name}
                      isAdmin={isAdmin}
                      showAdminDiagnostic={isAdmin}
                      aspectRatioClass="aspect-video"
                      imageClassName="group-hover:scale-103 transition-transform duration-300"
                    />
                  </div>
                  {img.caption && (
                    <figcaption className="p-3 text-xs text-[#292D2B] dark:text-[#F1F4F8] font-bold line-clamp-2">
                      {img.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </section>
        )}

        {selectedLightboxImage && (
          <div
            data-testid="certificate-modal-backdrop"
            onClick={() => setSelectedLightboxImage(null)}
            className="fixed inset-0 z-70 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fade-in overscroll-none"
          >
            <div
              data-testid="certificate-modal-dialog"
              onClick={(e) => e.stopPropagation()}
              className="bg-[#FAF7F0] dark:bg-[#1A283C] border-2 border-[#292D2B] dark:border-[#D6AD52] rounded-lg overflow-hidden max-w-5xl w-full max-h-[94dvh] sm:max-h-[90vh] flex flex-col shadow-[8px_8px_0px_#292D2B] dark:shadow-[8px_8px_0px_#000000]"
            >
              <div className="p-3 sm:p-4 bg-[#123D32] dark:bg-[#16263D] text-[#FAF7F0] border-b-2 border-[#292D2B] dark:border-[#D6AD52]/60 flex items-center justify-between gap-3 shrink-0">
                <h3 className="text-xs sm:text-sm font-bold text-[#D6AD52] truncate">
                  {selectedLightboxImage.caption || profileData.name}
                </h3>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button type="button" onClick={handleZoomOut} disabled={lightboxZoom <= 0.75} className="p-1.5 rounded bg-[#243A56] text-[#FAF7F0] border border-[#D6AD52]/60 disabled:opacity-40 cursor-pointer">
                    <ZoomOut className="w-4 h-4 text-[#D6AD52]" />
                  </button>
                  <button type="button" onClick={handleResetZoom} className="px-2 py-1 rounded bg-[#243A56] text-[#D6AD52] border border-[#D6AD52]/60 text-[11px] font-extrabold cursor-pointer">
                    {Math.round(lightboxZoom * 100)}%
                  </button>
                  <button type="button" onClick={handleZoomIn} disabled={lightboxZoom >= 3.0} className="p-1.5 rounded bg-[#243A56] text-[#FAF7F0] border border-[#D6AD52]/60 disabled:opacity-40 cursor-pointer">
                    <ZoomIn className="w-4 h-4 text-[#D6AD52]" />
                  </button>
                  <button type="button" onClick={handleToggleMode} className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#243A56] text-[#FAF7F0] border border-[#D6AD52]/60 text-[11px] font-bold cursor-pointer">
                    {lightboxMode === 'fit' ? <Maximize2 className="w-3.5 h-3.5 text-[#D6AD52]" /> : <RotateCcw className="w-3.5 h-3.5 text-[#D6AD52]" />}
                    <span>{lightboxMode === 'fit' ? 'Gulir Penuh' : 'Pas Layar'}</span>
                  </button>
                  <a
                    href={isGoogleDriveUrl(selectedLightboxImage.url) ? getGoogleDriveViewerUrl(selectedLightboxImage.url) : selectedLightboxImage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded bg-[#243A56] text-[#FAF7F0] border border-[#D6AD52]/60"
                  >
                    <ExternalLink className="w-4 h-4 text-[#D6AD52]" />
                  </a>
                  <button type="button" onClick={() => setSelectedLightboxImage(null)} className="p-1.5 rounded bg-[#243A56] hover:bg-[#F04438] text-[#FAF7F0] border border-[#D6AD52] cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div
                ref={lightboxScrollRef}
                onMouseDown={(e) => {
                  if (!lightboxScrollRef.current || e.button !== 0) return;
                  setIsDragging(true);
                  setDragStart({
                    x: e.clientX,
                    y: e.clientY,
                    scrollLeft: lightboxScrollRef.current.scrollLeft,
                    scrollTop: lightboxScrollRef.current.scrollTop
                  });
                }}
                onMouseMove={(e) => {
                  if (!isDragging || !lightboxScrollRef.current) return;
                  e.preventDefault();
                  lightboxScrollRef.current.scrollLeft = dragStart.scrollLeft - (e.clientX - dragStart.x);
                  lightboxScrollRef.current.scrollTop = dragStart.scrollTop - (e.clientY - dragStart.y);
                }}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                className="flex-1 min-h-[260px] overflow-auto bg-[#171923] dark:bg-[#0D1520] p-4 flex items-center justify-center relative"
              >
                {orderedImages.length > 1 && (
                  <>
                    <button type="button" onClick={(e) => { e.stopPropagation(); handlePrevImage(); }} className="absolute left-3 z-20 p-2 rounded-full bg-[#123D32]/90 text-[#D6AD52] border-2 border-[#D6AD52] cursor-pointer">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleNextImage(); }} className="absolute right-3 z-20 p-2 rounded-full bg-[#123D32]/90 text-[#D6AD52] border-2 border-[#D6AD52] cursor-pointer">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
                <div style={{ transform: `scale(${lightboxZoom})`, transformOrigin: 'center center' }}>
                  <ResilientGoogleDriveImage
                    src={selectedLightboxImage.url}
                    alt={selectedLightboxImage.caption || profileData.name}
                    isAdmin={isAdmin}
                    aspectRatioClass=""
                    overflowClass="overflow-visible"
                    forceFillParent={false}
                    objectFit="contain"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // PUBLIC INSTRUCTOR PROFILE (LIVE REAL-TIME SYNC FROM PORTFOLIO FIREBASE)
  // =========================================================================
  return (
    <div
      data-testid="instructor-profile-view"
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 py-6 pb-16 animate-fade-in font-sans"
    >
      {/* TOP NAVIGATION & SHARE BAR */}
      {!isPreviewMode && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="nb-btn nb-btn-secondary px-3.5 py-2 text-xs"
            >
              <ArrowLeft className="w-4 h-4 text-[#123D32] dark:text-[#D6AD52]" />
              <span>Kembali</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyProfileLink}
              className="nb-btn nb-btn-secondary px-3.5 py-2 text-xs"
              title="Salin tautan halaman Profil Pengajar"
            >
              {copied ? (
                <Check className="w-4 h-4 text-[#123D32] dark:text-[#D6AD52]" />
              ) : (
                <Copy className="w-4 h-4 text-[#D6AD52]" />
              )}
              <span>{copied ? 'Tautan Disalin!' : 'Salin Link'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareProfile}
              className="nb-btn nb-btn-primary px-3.5 py-2 text-xs"
            >
              <Share2 className="w-4 h-4 text-[#D6AD52]" />
              <span>Bagikan Profil</span>
            </button>
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && !portfolio && (
        <section
          data-testid="instructor-profile-loading"
          className="rounded-lg bg-[#123D32] dark:bg-[#16263D] text-[#FAF7F0] border-2 border-[#292D2B] dark:border-[#D6AD52] shadow-[6px_6px_0px_#292D2B] dark:shadow-[6px_6px_0px_#000000] p-6 sm:p-10"
        >
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 animate-pulse">
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-md bg-[#243A56] border-2 border-[#D6AD52]/50 shrink-0" />
            <div className="flex-1 w-full space-y-4">
              <div className="h-5 w-44 rounded bg-[#FAF7F0]/20 mx-auto md:mx-0" />
              <div className="h-9 w-64 max-w-full rounded bg-[#FAF7F0]/25 mx-auto md:mx-0" />
              <div className="h-5 w-80 max-w-full rounded bg-[#D6AD52]/30 mx-auto md:mx-0" />
              <div className="space-y-2 pt-2">
                <div className="h-4 w-full rounded bg-[#FAF7F0]/15" />
                <div className="h-4 w-5/6 rounded bg-[#FAF7F0]/15" />
              </div>
            </div>
          </div>
          <p className="mt-6 text-center md:text-left text-xs font-bold text-[#D6AD52]">
            Memuat profil pengajar...
          </p>
        </section>
      )}

      {/* GRACEFUL ERROR FALLBACK (WHEN EXTERNAL PORTFOLIO DATA IS UNAVAILABLE) */}
      {!loading && loadError && !portfolio && (
        <section
          data-testid="instructor-profile-error"
          className="nb-card p-6 sm:p-10 text-center space-y-5"
        >
          <div className="w-12 h-12 rounded-md bg-[#D6AD52]/20 border-2 border-[#292D2B] dark:border-[#D6AD52] flex items-center justify-center mx-auto text-[#123D32] dark:text-[#D6AD52]">
            <AlertCircle className="w-6 h-6" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#292D2B] dark:text-white">
              Profil Pengajar Sementara Tidak Tersedia
            </h1>
            <p className="text-sm text-[#292D2B]/80 dark:text-[#F1F4F8]/80 leading-relaxed">
              {loadError}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              data-testid="instructor-profile-retry-btn"
              onClick={() => setRetryNonce((prev) => prev + 1)}
              className="nb-btn nb-btn-primary px-4 py-2.5 text-xs"
            >
              <RefreshCw className="w-4 h-4 text-[#D6AD52]" />
              <span>Coba Muat Ulang</span>
            </button>

            <a
              href={portfolioWebsiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="view-portfolio-btn"
              className="nb-btn nb-btn-gold px-4 py-2.5 text-xs"
            >
              <span>Lihat Portofolio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>
      )}

      {/* PORTFOLIO-SYNCED INSTRUCTOR PROFILE */}
      {portfolio && (
        <>
          {/* HERO PROFILE SUMMARY CARD */}
          <section className="relative overflow-hidden rounded-lg bg-[#123D32] dark:bg-[#16263D] text-[#FAF7F0] dark:text-[#F1F4F8] border-2 border-[#292D2B] dark:border-[#D6AD52] shadow-[6px_6px_0px_#292D2B] dark:shadow-[6px_6px_0px_#000000] p-6 sm:p-10">
            <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
              {/* Public Google Drive Portrait */}
              <div className="shrink-0 flex flex-col items-center space-y-2.5">
                <PortfolioPortrait
                  photoCandidates={portfolio.photoCandidates}
                  fullName={portfolio.fullName}
                />
              </div>

              {/* Core Identity & Short Bio */}
              <div className="flex-1 text-center md:text-left space-y-4 min-w-0">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#C6A75E] border-2 border-[#171717] text-[#171923] text-xs font-extrabold uppercase tracking-wider">
                  <UserCheck className="w-3.5 h-3.5 text-[#171923]" />
                  <span data-testid="instructor-profile-title">Profil Pengajar Dars with Osama</span>
                </div>

                <div className="space-y-1.5">
                  {portfolio.fullName && (
                    <h1
                      data-testid="instructor-profile-name"
                      className="text-2xl sm:text-4xl font-bold font-serif tracking-tight text-[#F0EEE8] leading-tight"
                    >
                      {portfolio.fullName}
                    </h1>
                  )}
                  {portfolio.headline && (
                    <p
                      data-testid="instructor-profile-role"
                      className="text-sm sm:text-base font-bold text-[#D6AD52] leading-snug"
                    >
                      {portfolio.headline}
                    </p>
                  )}
                  {portfolio.domicile && (
                    <p className="inline-flex items-center justify-center md:justify-start gap-1.5 text-xs sm:text-sm text-[#FAF7F0]/80 pt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#D6AD52] shrink-0" />
                      <span>{portfolio.domicile}</span>
                    </p>
                  )}
                </div>

                {portfolio.shortBio && (
                  <p
                    data-testid="instructor-profile-biography"
                    className="pt-1 text-sm sm:text-base text-[#F0EEE8]/95 leading-relaxed max-w-3xl"
                  >
                    {portfolio.shortBio}
                  </p>
                )}

                {/* Primary Portfolio CTA + Platform Navigation */}
                <div className="pt-3 flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                  <a
                    href={portfolioWebsiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="view-portfolio-btn"
                    className="nb-btn nb-btn-gold px-4 py-2.5 text-xs sm:text-sm"
                  >
                    <span>Lihat Portofolio</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {!isPreviewMode && onNavigate && (
                    <>
                      <button
                        type="button"
                        onClick={() => onNavigate('courses')}
                        className="px-4 py-2.5 rounded-md bg-[#243A56] hover:bg-[#42658A] text-[#FAF7F0] border-2 border-[#D6AD52] font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-[3px_3px_0px_#000000]"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-[#D6AD52]" />
                        <span>Katalog Kursus &amp; Matan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('blog')}
                        className="px-4 py-2.5 rounded-md bg-[#243A56] hover:bg-[#42658A] text-[#FAF7F0] border-2 border-[#D6AD52] font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-[3px_3px_0px_#000000]"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#D6AD52]" />
                        <span>Artikel &amp; Naskah Ilmu</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('public-qa')}
                        className="px-4 py-2.5 rounded-md bg-[#243A56] hover:bg-[#42658A] text-[#FAF7F0] border-2 border-[#D6AD52] font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-[3px_3px_0px_#000000]"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-[#D6AD52]" />
                        <span>Arsip Tanya Jawab</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* RINGKASAN PENDIDIKAN (OMITTED AUTOMATICALLY IF EMPTY) */}
          {portfolio.education.length > 0 && (
            <section
              data-testid="instructor-education-section"
              className="nb-reading-surface p-6 sm:p-8 space-y-5"
            >
              <div className="flex items-center gap-2.5 border-b-2 border-[#292D2B]/15 dark:border-[#D6AD52]/25 pb-3">
                <div className="w-9 h-9 rounded-md bg-[#123D32] dark:bg-[#243A56] border-2 border-[#292D2B] dark:border-[#D6AD52] flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4 text-[#D6AD52]" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[#292D2B] dark:text-white font-serif">
                  Ringkasan Pendidikan
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {portfolio.education.map((edu) => (
                  <article
                    key={edu.id}
                    className="rounded-md bg-[#FAF7F0] dark:bg-[#1A283C] border-2 border-[#292D2B]/20 dark:border-[#D6AD52]/35 p-4 sm:p-5 space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <h3 className="text-base sm:text-lg font-bold text-[#123D32] dark:text-[#FAF7F0] font-serif leading-snug">
                          {edu.institution}
                        </h3>
                        {(edu.degree || edu.fieldOfStudy) && (
                          <p className="text-sm font-semibold text-[#292D2B] dark:text-[#D6AD52]">
                            {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(' — ')}
                          </p>
                        )}
                      </div>

                      {(edu.period || edu.graduationYear) && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#123D32]/10 dark:bg-[#243A56] border border-[#123D32]/25 dark:border-[#D6AD52]/40 text-xs font-bold text-[#123D32] dark:text-[#D6AD52] shrink-0 self-start">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>{edu.period || `Lulus ${edu.graduationYear}`}</span>
                        </div>
                      )}
                    </div>

                    {edu.location && (
                      <p className="inline-flex items-center gap-1.5 text-xs text-[#626A66] dark:text-[#B4C0D0] font-medium">
                        <MapPin className="w-3.5 h-3.5 text-[#D6AD52] shrink-0" />
                        <span>{edu.location}</span>
                      </p>
                    )}

                    {edu.description && (
                      <p className="text-sm text-[#292D2B]/85 dark:text-[#F1F4F8]/85 leading-relaxed pt-1">
                        {edu.description}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* RINGKASAN PENGALAMAN (OMITTED AUTOMATICALLY IF EMPTY) */}
          {portfolio.experiences.length > 0 && (
            <section
              data-testid="instructor-experiences-section"
              className="nb-reading-surface p-6 sm:p-8 space-y-5"
            >
              <div className="flex items-center gap-2.5 border-b-2 border-[#292D2B]/15 dark:border-[#D6AD52]/25 pb-3">
                <div className="w-9 h-9 rounded-md bg-[#123D32] dark:bg-[#243A56] border-2 border-[#292D2B] dark:border-[#D6AD52] flex items-center justify-center shrink-0">
                  <Briefcase className="w-4 h-4 text-[#D6AD52]" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[#292D2B] dark:text-white font-serif">
                  Ringkasan Pengalaman
                </h2>
              </div>

              <div className="space-y-4">
                {portfolio.experiences.map((exp) => (
                  <article
                    key={exp.id}
                    className="rounded-md bg-[#FAF7F0] dark:bg-[#1A283C] border-2 border-[#292D2B]/20 dark:border-[#D6AD52]/35 p-4 sm:p-5 space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base sm:text-lg font-bold text-[#123D32] dark:text-[#FAF7F0] font-serif leading-snug">
                            {exp.role || exp.institution}
                          </h3>
                          {exp.categoryLabel && (
                            <span className="px-2 py-0.5 rounded bg-[#C6A75E]/25 dark:bg-[#D6AD52]/15 border border-[#C6A75E]/60 text-[11px] font-bold text-[#123D32] dark:text-[#D6AD52]">
                              {exp.categoryLabel}
                            </span>
                          )}
                        </div>
                        {exp.role && exp.institution && (
                          <p className="text-sm font-semibold text-[#292D2B] dark:text-[#D6AD52]">
                            {exp.institution}
                          </p>
                        )}
                      </div>

                      {(exp.period || exp.duration) && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#123D32]/10 dark:bg-[#243A56] border border-[#123D32]/25 dark:border-[#D6AD52]/40 text-xs font-bold text-[#123D32] dark:text-[#D6AD52] shrink-0 self-start">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>{[exp.period, exp.duration].filter(Boolean).join(' · ')}</span>
                        </div>
                      )}
                    </div>

                    {exp.location && (
                      <p className="inline-flex items-center gap-1.5 text-xs text-[#626A66] dark:text-[#B4C0D0] font-medium">
                        <MapPin className="w-3.5 h-3.5 text-[#D6AD52] shrink-0" />
                        <span>{exp.location}</span>
                      </p>
                    )}

                    {exp.summary && (
                      <p className="text-sm text-[#292D2B]/85 dark:text-[#F1F4F8]/85 leading-relaxed">
                        {exp.summary}
                      </p>
                    )}

                    {exp.responsibilities.length > 0 && (
                      <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-[#292D2B]/85 dark:text-[#F1F4F8]/85">
                        {exp.responsibilities.map((item, index) => (
                          <li key={`${exp.id}-resp-${index}`}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* KEAHLIAN / BIDANG KOMPETENSI (OMITTED AUTOMATICALLY IF EMPTY) */}
          {portfolio.skills.length > 0 && (
            <section
              data-testid="instructor-skills-section"
              className="nb-reading-surface p-6 sm:p-8 space-y-5"
            >
              <div className="flex items-center gap-2.5 border-b-2 border-[#292D2B]/15 dark:border-[#D6AD52]/25 pb-3">
                <div className="w-9 h-9 rounded-md bg-[#123D32] dark:bg-[#243A56] border-2 border-[#292D2B] dark:border-[#D6AD52] flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4 text-[#D6AD52]" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[#292D2B] dark:text-white font-serif">
                  Keahlian &amp; Bidang Kompetensi
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {portfolio.skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="rounded-md bg-[#FAF7F0] dark:bg-[#1A283C] border-2 border-[#292D2B]/20 dark:border-[#D6AD52]/35 p-4 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-[#123D32] dark:text-[#FAF7F0] leading-snug">
                        {skill.name}
                      </h3>
                      {skill.proficiencyLabel && (
                        <span className="px-2 py-0.5 rounded bg-[#123D32]/10 dark:bg-[#243A56] text-[10px] font-bold text-[#123D32] dark:text-[#D6AD52] shrink-0">
                          {skill.proficiencyLabel}
                        </span>
                      )}
                    </div>
                    {skill.categoryLabel && (
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#626A66] dark:text-[#B4C0D0]">
                        {skill.categoryLabel}
                      </p>
                    )}
                    {skill.description && (
                      <p className="text-xs text-[#292D2B]/80 dark:text-[#F1F4F8]/80 leading-relaxed">
                        {skill.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* PORTFOLIO REDIRECT FOOTER BANNER */}
          <section className="nb-card p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left space-y-1">
              <h2 className="text-base sm:text-lg font-bold font-serif text-[#123D32] dark:text-[#FAF7F0]">
                Ingin Melihat Rekam Jejak Lengkap?
              </h2>
              <p className="text-xs sm:text-sm text-[#292D2B]/80 dark:text-[#F1F4F8]/80">
                Kunjungi website portofolio resmi untuk melihat daftar pengalaman lengkap, sertifikat, karya, publikasi, dan CV.
              </p>
            </div>

            <a
              href={portfolioWebsiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="view-portfolio-footer-btn"
              className="nb-btn nb-btn-primary px-5 py-2.5 text-xs sm:text-sm shrink-0"
            >
              <span>Lihat Portofolio</span>
              <ExternalLink className="w-4 h-4 text-[#D6AD52]" />
            </a>
          </section>
        </>
      )}
    </div>
  );
};
