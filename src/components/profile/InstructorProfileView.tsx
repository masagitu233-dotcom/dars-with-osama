import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  HelpCircle,
  Edit,
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
  ChevronRight
} from 'lucide-react';
import { InstructorProfile, InstructorProfileImage } from '../../types';
import { getInstructorProfile } from '../../firebase/services';
import { getDefaultInstructorProfile, normalizeProfileSections, normalizeSupportingImages } from '../../utils/instructorProfileHelper';
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

export const InstructorProfileView: React.FC<InstructorProfileViewProps> = ({
  profileData,
  isPreviewMode = false,
  onBack,
  onNavigate,
  onEditInAdmin
}) => {
  const { isAdmin } = useAuth();
  const [profile, setProfile] = useState<InstructorProfile>(() => profileData || getDefaultInstructorProfile());
  const [loading, setLoading] = useState<boolean>(!profileData);
  const [copied, setCopied] = useState<boolean>(false);
  const [photoError, setPhotoError] = useState<boolean>(false);
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
      setProfile({
        ...profileData,
        sections: normalizeProfileSections(profileData.sections),
        supportingImages: normalizeSupportingImages(profileData.supportingImages)
      });
      setPhotoError(false);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    getInstructorProfile()
      .then((loaded) => {
        if (active) {
          setProfile(loaded);
          setPhotoError(false);
        }
      })
      .catch((err) => {
        console.warn('InstructorProfileView load notice:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [profileData]);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://darswithosama.com';
  const profileUrl = `${origin}/profil-pengajar`;

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
          title: `${profile.name} — ${profile.title}`,
          text: `${profile.name} (${profile.role}) di Dars with Osama`,
          url: profileUrl
        });
        return;
      } catch {
        // Fallback to copy link
      }
    }
    handleCopyProfileLink();
  };

  const orderedSections = normalizeProfileSections(profile.sections);
  const orderedImages = normalizeSupportingImages(profile.supportingImages);

  // Reset zoom & scroll position whenever modal image changes
  useEffect(() => {
    setLightboxZoom(1);
    setLightboxMode('fit');
    if (lightboxScrollRef.current) {
      lightboxScrollRef.current.scrollTop = 0;
      lightboxScrollRef.current.scrollLeft = 0;
    }
  }, [selectedLightboxImage?.id]);

  // Lock body scroll and bind keyboard navigation (Esc, Arrow keys)
  useEffect(() => {
    if (!selectedLightboxImage) return;

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
      } else if (e.key === 'ArrowRight') {
        if (!selectedLightboxImage || orderedImages.length <= 1) return;
        const currentIndex = orderedImages.findIndex(img => img.id === selectedLightboxImage.id);
        if (currentIndex !== -1) {
          const nextIndex = (currentIndex + 1) % orderedImages.length;
          setSelectedLightboxImage(orderedImages[nextIndex]);
        }
      } else if (e.key === 'ArrowLeft') {
        if (!selectedLightboxImage || orderedImages.length <= 1) return;
        const currentIndex = orderedImages.findIndex(img => img.id === selectedLightboxImage.id);
        if (currentIndex !== -1) {
          const prevIndex = (currentIndex - 1 + orderedImages.length) % orderedImages.length;
          setSelectedLightboxImage(orderedImages[prevIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedLightboxImage, orderedImages]);

  const handleNextImage = () => {
    if (!selectedLightboxImage || orderedImages.length <= 1) return;
    const currentIndex = orderedImages.findIndex(img => img.id === selectedLightboxImage.id);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % orderedImages.length;
    setSelectedLightboxImage(orderedImages[nextIndex]);
  };

  const handlePrevImage = () => {
    if (!selectedLightboxImage || orderedImages.length <= 1) return;
    const currentIndex = orderedImages.findIndex(img => img.id === selectedLightboxImage.id);
    if (currentIndex === -1) return;
    const prevIndex = (currentIndex - 1 + orderedImages.length) % orderedImages.length;
    setSelectedLightboxImage(orderedImages[prevIndex]);
  };

  const handleZoomIn = () => {
    setLightboxZoom(prev => Math.min(3.0, Number((prev + 0.25).toFixed(2))));
  };

  const handleZoomOut = () => {
    setLightboxZoom(prev => Math.max(0.75, Number((prev - 0.25).toFixed(2))));
  };

  const handleResetZoom = () => {
    setLightboxZoom(1);
    setLightboxMode('fit');
    if (lightboxScrollRef.current) {
      lightboxScrollRef.current.scrollTop = 0;
      lightboxScrollRef.current.scrollLeft = 0;
    }
  };

  const handleToggleMode = () => {
    setLightboxMode(prev => (prev === 'fit' ? 'scroll' : 'fit'));
    setLightboxZoom(1);
    if (lightboxScrollRef.current) {
      lightboxScrollRef.current.scrollTop = 0;
      lightboxScrollRef.current.scrollLeft = 0;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!lightboxScrollRef.current) return;
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      scrollLeft: lightboxScrollRef.current.scrollLeft,
      scrollTop: lightboxScrollRef.current.scrollTop
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !lightboxScrollRef.current) return;
    e.preventDefault();
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    lightboxScrollRef.current.scrollLeft = dragStart.scrollLeft - dx;
    lightboxScrollRef.current.scrollTop = dragStart.scrollTop - dy;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const initials = (profile.name || 'Osama Nur Samsil')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');

  return (
    <div
      data-testid="instructor-profile-view"
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 py-6 pb-16 animate-fade-in font-sans"
    >
      {/* TOP NAVIGATION & ACTION BAR */}
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
            {isAdmin && onEditInAdmin && (
              <button
                type="button"
                data-testid="profile-admin-edit-btn"
                onClick={onEditInAdmin}
                className="nb-btn nb-btn-gold px-3.5 py-2 text-xs"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Kelola Profil (Admin)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyProfileLink}
              className="nb-btn nb-btn-secondary px-3.5 py-2 text-xs"
              title="Salin tautan halaman Profil Pengajar"
            >
              {copied ? <Check className="w-4 h-4 text-[#123D32] dark:text-[#D6AD52]" /> : <Copy className="w-4 h-4 text-[#D6AD52]" />}
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

      {/* HERO PROFILE HEADER CARD */}
      <section className="relative overflow-hidden rounded-lg bg-[#123D32] dark:bg-[#16263D] text-[#FAF7F0] dark:text-[#F1F4F8] border-2 border-[#292D2B] dark:border-[#D6AD52] shadow-[6px_6px_0px_#292D2B] dark:shadow-[6px_6px_0px_#000000] p-6 sm:p-10">
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
          {/* Instructor Portrait / Emblem */}
          <div className="shrink-0 flex flex-col items-center space-y-2.5">
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-md overflow-hidden border-2 border-[#D6AD52] bg-[#243A56] shadow-[4px_4px_0px_#000000] flex items-center justify-center relative">
              {profile.photoUrl && !photoError ? (
                <img
                  data-testid="instructor-profile-photo"
                  src={resolveDisplayImageUrl(profile.photoUrl)}
                  alt={profile.name}
                  onError={() => setPhotoError(true)}
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
            {profile.photoCaption && (
              <p className="text-[11px] text-[#D6AD52] text-center max-w-[200px] leading-snug italic">
                {profile.photoCaption}
              </p>
            )}
          </div>

          {/* Instructor Identity & Biography */}
          <div className="flex-1 text-center md:text-left space-y-4 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#C6A75E] border-2 border-[#171717] text-[#171923] text-xs font-extrabold uppercase tracking-wider">
              <UserCheck className="w-3.5 h-3.5 text-[#171923]" />
              <span data-testid="instructor-profile-title">{profile.title || 'Profil Pengajar Dars with Osama'}</span>
            </div>

            <div className="space-y-1.5">
              <h1
                data-testid="instructor-profile-name"
                className="text-2xl sm:text-4xl font-bold font-serif tracking-tight text-[#F0EEE8] leading-tight"
              >
                {profile.name}
              </h1>
              <p
                data-testid="instructor-profile-role"
                className="text-sm sm:text-base font-bold text-[#C6A75E]"
              >
                {profile.role}
              </p>
            </div>

            {/* Biography Rich Text */}
            {profile.biography && (
              <div
                data-testid="instructor-profile-biography"
                className="pt-2 text-sm sm:text-base text-[#F0EEE8] leading-relaxed space-y-3 blog-content instructor-dark-panel-content"
                dangerouslySetInnerHTML={{
                  __html: autoWrapArabicText(sanitizeRichTextHtml(profile.biography))
                }}
              />
            )}

            {/* Quick Navigation Links to Platform Learning Modules */}
            {!isPreviewMode && onNavigate && (
              <div className="pt-3 flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                <button
                  type="button"
                  onClick={() => onNavigate('courses')}
                  className="nb-btn nb-btn-gold px-4 py-2 text-xs"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Katalog Kursus & Matan</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('blog')}
                  className="px-4 py-2 rounded-md bg-[#243A56] hover:bg-[#42658A] text-[#FAF7F0] border-2 border-[#D6AD52] font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-[3px_3px_0px_#000000]"
                >
                  <FileText className="w-3.5 h-3.5 text-[#D6AD52]" />
                  <span>Artikel & Naskah Ilmu</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('public-qa')}
                  className="px-4 py-2 rounded-md bg-[#243A56] hover:bg-[#42658A] text-[#FAF7F0] border-2 border-[#D6AD52] font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-[3px_3px_0px_#000000]"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[#D6AD52]" />
                  <span>Arsip Tanya Jawab</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* LOADING INDICATOR */}
      {loading && (
        <div className="nb-card p-8 text-center text-xs font-bold text-[#292D2B]/70 dark:text-[#F1F4F8]/70">
          Memuat data Profil Pengajar...
        </div>
      )}

      {/* MAIN NARRATIVE CONTENT ("ISI TULISAN") */}
      {profile.mainContent && profile.mainContent.replace(/<[^>]*>/g, '').trim() !== '' && (
        <article className="nb-reading-surface p-6 sm:p-10 space-y-4">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#123D32] dark:text-[#D6AD52] border-b-2 border-[#292D2B]/15 dark:border-[#D6AD52]/25 pb-3">
            <Sparkles className="w-4 h-4 text-[#D6AD52]" />
            <span>Pengantar & Catatan Profil</span>
          </div>

          <div
            data-testid="instructor-profile-main-content"
            className="prose dark:prose-invert max-w-none text-[#292D2B] dark:text-[#F1F4F8] text-sm sm:text-base leading-relaxed space-y-4 font-sans blog-content"
            dangerouslySetInnerHTML={{
              __html: autoWrapArabicText(sanitizeRichTextHtml(profile.mainContent))
            }}
          />
        </article>
      )}

      {/* DYNAMIC ORDERED CONTENT SECTIONS ("BAGIAN KONTEN") */}
      {orderedSections.length > 0 && (
        <div data-testid="instructor-profile-sections" className="space-y-6">
          {orderedSections.map((sec) => (
            <section
              key={sec.id}
              data-testid={`instructor-section-${sec.id}`}
              className="nb-reading-surface p-6 sm:p-10 space-y-5"
            >
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
                  {sec.imageCaption && (
                    <figcaption className="text-center text-xs text-[#292D2B]/70 dark:text-[#F1F4F8]/70 italic">
                      {sec.imageCaption}
                    </figcaption>
                  )}
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

      {/* SUPPORTING IMAGES GALLERY ("GAMBAR PENDUKUNG") */}
      {orderedImages.length > 0 && (
        <section
          data-testid="instructor-supporting-images"
          className="nb-card p-6 sm:p-10 space-y-5"
        >
          <div className="flex items-center justify-between border-b-2 border-[#292D2B]/15 dark:border-[#D6AD52]/25 pb-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#292D2B] dark:text-white font-serif flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#123D32] dark:text-[#D6AD52]" />
              <span>Galeri & Dokumentasi Pendukung</span>
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
                    alt={img.caption || profile.name}
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

      {/* CERTIFICATE / SUPPORTING IMAGE LIGHTBOX MODAL */}
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
            {/* Top Header Control Bar */}
            <div className="p-3 sm:p-4 bg-[#123D32] dark:bg-[#16263D] text-[#FAF7F0] border-b-2 border-[#292D2B] dark:border-[#D6AD52]/60 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded bg-[#C6A75E] text-[#171923] text-[10px] font-extrabold uppercase tracking-wider shrink-0">
                  Sertifikat / Dokumen
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-[#D6AD52] truncate">
                  {selectedLightboxImage.caption || profile.name}
                </h3>
              </div>

              {/* Controls Toolbar */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Zoom Out */}
                <button
                  type="button"
                  data-testid="cert-zoom-out"
                  onClick={handleZoomOut}
                  disabled={lightboxZoom <= 0.75}
                  title="Perkecil (-)"
                  className="p-1.5 sm:p-2 rounded bg-[#243A56] hover:bg-[#345275] text-[#FAF7F0] border border-[#D6AD52]/60 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-xs"
                >
                  <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D6AD52]" />
                </button>

                {/* Zoom Level Indicator / Reset */}
                <button
                  type="button"
                  data-testid="cert-zoom-reset"
                  onClick={handleResetZoom}
                  title="Reset Ukuran (100%)"
                  className="px-2 py-1 sm:px-2.5 sm:py-1 rounded bg-[#243A56] hover:bg-[#345275] text-[#D6AD52] border border-[#D6AD52]/60 text-[11px] font-extrabold cursor-pointer transition min-w-[48px] text-center"
                >
                  {Math.round(lightboxZoom * 100)}%
                </button>

                {/* Zoom In */}
                <button
                  type="button"
                  data-testid="cert-zoom-in"
                  onClick={handleZoomIn}
                  disabled={lightboxZoom >= 3.0}
                  title="Perbesar (+)"
                  className="p-1.5 sm:p-2 rounded bg-[#243A56] hover:bg-[#345275] text-[#FAF7F0] border border-[#D6AD52]/60 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-xs"
                >
                  <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D6AD52]" />
                </button>

                {/* Mode Toggle: Fit vs Scroll View */}
                <button
                  type="button"
                  data-testid="cert-mode-toggle"
                  onClick={handleToggleMode}
                  title={lightboxMode === 'fit' ? 'Beralih ke Ukuran Bebas Gulir' : 'Beralih ke Ukuran Pas Layar'}
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#243A56] hover:bg-[#345275] text-[#FAF7F0] border border-[#D6AD52]/60 text-[11px] font-bold cursor-pointer transition"
                >
                  {lightboxMode === 'fit' ? (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-[#D6AD52]" />
                      <span>Gulir Penuh</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 text-[#D6AD52]" />
                      <span>Pas Layar</span>
                    </>
                  )}
                </button>

                {/* External Link */}
                <a
                  href={isGoogleDriveUrl(selectedLightboxImage.url) ? getGoogleDriveViewerUrl(selectedLightboxImage.url) : selectedLightboxImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Buka Berkas di Tab Baru / Google Drive"
                  className="p-1.5 sm:p-2 rounded bg-[#243A56] hover:bg-[#345275] text-[#FAF7F0] border border-[#D6AD52]/60 cursor-pointer transition shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D6AD52]" />
                </a>

                {/* Close Button */}
                <button
                  type="button"
                  data-testid="cert-modal-close"
                  onClick={() => setSelectedLightboxImage(null)}
                  title="Tutup Modal (Esc)"
                  className="p-1.5 sm:p-2 rounded bg-[#243A56] hover:bg-[#F04438] text-[#FAF7F0] border border-[#D6AD52] transition cursor-pointer shadow-xs ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Certificate Preview Scroll Area */}
            <div
              ref={lightboxScrollRef}
              data-testid="certificate-preview-scroll-area"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`flex-1 min-h-[260px] overflow-auto overscroll-contain bg-[#171923] dark:bg-[#0D1520] p-3 sm:p-6 flex items-center justify-center relative touch-pan-x touch-pan-y select-none transition-colors ${
                isDragging ? 'cursor-grabbing' : lightboxZoom > 1 || lightboxMode === 'scroll' ? 'cursor-grab' : 'cursor-default'
              }`}
              style={{
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {/* Prev Image Button */}
              {orderedImages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevImage();
                  }}
                  aria-label="Gambar Sebelumnya"
                  className="absolute left-2 sm:left-4 z-20 p-2 rounded-full bg-[#123D32]/90 hover:bg-[#123D32] text-[#D6AD52] border-2 border-[#D6AD52] shadow-md transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}

              {/* Next Image Button */}
              {orderedImages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextImage();
                  }}
                  aria-label="Gambar Berikutnya"
                  className="absolute right-2 sm:right-4 z-20 p-2 rounded-full bg-[#123D32]/90 hover:bg-[#123D32] text-[#D6AD52] border-2 border-[#D6AD52] shadow-md transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}

              {/* Zoomable Image Wrapper */}
              <div
                className="transition-transform duration-150 ease-out flex items-center justify-center"
                style={{
                  transform: `scale(${lightboxZoom})`,
                  transformOrigin: 'center center'
                }}
              >
                <ResilientGoogleDriveImage
                  src={selectedLightboxImage.url}
                  alt={selectedLightboxImage.caption || profile.name}
                  isAdmin={isAdmin}
                  showAdminDiagnostic={isAdmin}
                  aspectRatioClass=""
                  overflowClass="overflow-visible"
                  forceFillParent={false}
                  objectFit="contain"
                  className="flex items-center justify-center"
                  imageClassName={`transition-all duration-200 object-contain rounded shadow-xl border border-[#292D2B]/50 dark:border-[#D6AD52]/40 ${
                    lightboxMode === 'scroll'
                      ? 'w-full max-w-none min-w-[620px] sm:min-w-[850px] h-auto'
                      : 'max-w-full max-h-[64vh] sm:max-h-[70vh] w-auto h-auto'
                  }`}
                />
              </div>
            </div>

            {/* Bottom Caption & Navigation Bar */}
            <div className="p-3 sm:p-4 bg-[#FAF7F0] dark:bg-[#16263D] border-t-2 border-[#292D2B] dark:border-[#D6AD52]/60 text-xs text-[#292D2B] dark:text-[#F1F4F8] flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
              <div className="text-center sm:text-left font-bold min-w-0">
                {selectedLightboxImage.caption ? (
                  <p className="truncate max-w-lg">{selectedLightboxImage.caption}</p>
                ) : (
                  <p className="italic text-[#626A66] dark:text-[#B4C0D0]">Dokumentasi &amp; Sertifikat Pengajar</p>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px] text-[#626A66] dark:text-[#B4C0D0] shrink-0 font-medium">
                <span className="hidden md:inline">
                  💡 Geser/scroll gambar untuk melihat seluruh bagian sertifikat
                </span>
                {orderedImages.length > 1 && (
                  <span className="px-2 py-0.5 rounded bg-[#FAF7F0] dark:bg-[#243A56] border border-[#292D2B]/20 dark:border-[#D6AD52]/40 font-bold text-[#123D32] dark:text-[#D6AD52]">
                    {orderedImages.findIndex(img => img.id === selectedLightboxImage.id) + 1} / {orderedImages.length}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
