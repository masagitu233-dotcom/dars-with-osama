import React, { useState, useEffect } from 'react';
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
  X
} from 'lucide-react';
import { InstructorProfile, InstructorProfileImage } from '../../types';
import { getInstructorProfile } from '../../firebase/services';
import { getDefaultInstructorProfile, normalizeProfileSections, normalizeSupportingImages } from '../../utils/instructorProfileHelper';
import { sanitizeRichTextHtml } from '../../utils/richTextHelper';
import { autoWrapArabicText } from '../../utils/arabicFontHelper';
import { useAuth } from '../../context/AuthContext';

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
              <ArrowLeft className="w-4 h-4 text-[#06251D] dark:text-[#D9AC45]" />
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
              {copied ? <Check className="w-4 h-4 text-[#06251D] dark:text-[#D9AC45]" /> : <Copy className="w-4 h-4 text-[#D9AC45]" />}
              <span>{copied ? 'Tautan Disalin!' : 'Salin Link'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareProfile}
              className="nb-btn nb-btn-primary px-3.5 py-2 text-xs"
            >
              <Share2 className="w-4 h-4 text-[#D9AC45]" />
              <span>Bagikan Profil</span>
            </button>
          </div>
        </div>
      )}

      {/* HERO PROFILE HEADER CARD */}
      <section className="relative overflow-hidden rounded-lg bg-[#06251D] text-[#F8F3E8] border-2 border-[#171717] dark:border-[#D9AC45] shadow-[6px_6px_0px_#171717] dark:shadow-[6px_6px_0px_#000000] p-6 sm:p-10">
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
          {/* Instructor Portrait / Emblem */}
          <div className="shrink-0 flex flex-col items-center space-y-2.5">
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-md overflow-hidden border-2 border-[#D9AC45] bg-[#0B3026] shadow-[4px_4px_0px_#000000] flex items-center justify-center relative">
              {profile.photoUrl && !photoError ? (
                <img
                  data-testid="instructor-profile-photo"
                  src={profile.photoUrl}
                  alt={profile.name}
                  onError={() => setPhotoError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  data-testid="instructor-profile-monogram"
                  className="w-full h-full flex flex-col items-center justify-center bg-[#0B3026] text-[#D9AC45] select-none"
                >
                  <span className="font-serif text-4xl sm:text-5xl font-bold tracking-wider">
                    {initials}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-[#F8F3E8]/80 mt-1 font-extrabold">
                    Dars with Osama
                  </span>
                </div>
              )}
            </div>
            {profile.photoCaption && (
              <p className="text-[11px] text-[#D9AC45] text-center max-w-[200px] leading-snug italic">
                {profile.photoCaption}
              </p>
            )}
          </div>

          {/* Instructor Identity & Biography */}
          <div className="flex-1 text-center md:text-left space-y-4 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#D9AC45] border-2 border-[#171717] text-[#171717] text-xs font-extrabold uppercase tracking-wider">
              <UserCheck className="w-3.5 h-3.5" />
              <span data-testid="instructor-profile-title">{profile.title || 'Profil Pengajar Dars with Osama'}</span>
            </div>

            <div className="space-y-1.5">
              <h1
                data-testid="instructor-profile-name"
                className="text-2xl sm:text-4xl font-bold font-serif tracking-tight text-white leading-tight"
              >
                {profile.name}
              </h1>
              <p
                data-testid="instructor-profile-role"
                className="text-sm sm:text-base font-bold text-[#D9AC45]"
              >
                {profile.role}
              </p>
            </div>

            {/* Biography Rich Text */}
            {profile.biography && (
              <div
                data-testid="instructor-profile-biography"
                className="pt-2 text-sm sm:text-base text-[#F8F3E8]/90 leading-relaxed space-y-3 blog-content"
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
                  className="px-4 py-2 rounded-md bg-[#0B3026] hover:bg-[#124638] text-[#F8F3E8] border-2 border-[#D9AC45] font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-[3px_3px_0px_#000000]"
                >
                  <FileText className="w-3.5 h-3.5 text-[#D9AC45]" />
                  <span>Artikel & Naskah Ilmu</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('public-qa')}
                  className="px-4 py-2 rounded-md bg-[#0B3026] hover:bg-[#124638] text-[#F8F3E8] border-2 border-[#D9AC45] font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-[3px_3px_0px_#000000]"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[#D9AC45]" />
                  <span>Arsip Tanya Jawab</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* LOADING INDICATOR */}
      {loading && (
        <div className="nb-card p-8 text-center text-xs font-bold text-[#171717]/70 dark:text-[#F8F3E8]/70">
          Memuat data Profil Pengajar...
        </div>
      )}

      {/* MAIN NARRATIVE CONTENT ("ISI TULISAN") */}
      {profile.mainContent && profile.mainContent.replace(/<[^>]*>/g, '').trim() !== '' && (
        <article className="nb-reading-surface p-6 sm:p-10 space-y-4">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#06251D] dark:text-[#D9AC45] border-b-2 border-[#171717]/15 dark:border-[#D9AC45]/25 pb-3">
            <Sparkles className="w-4 h-4 text-[#D9AC45]" />
            <span>Pengantar & Catatan Profil</span>
          </div>

          <div
            data-testid="instructor-profile-main-content"
            className="prose dark:prose-invert max-w-none text-[#171717] dark:text-[#F8F3E8] text-sm sm:text-base leading-relaxed space-y-4 font-sans blog-content"
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
                <div className="border-b-2 border-[#171717]/15 dark:border-[#D9AC45]/25 pb-3">
                  <h2 className="text-lg sm:text-2xl font-bold text-[#171717] dark:text-white font-serif">
                    {sec.title}
                  </h2>
                </div>
              )}

              {sec.imageUrl && (
                <figure className="space-y-2">
                  <div className="rounded-md overflow-hidden bg-[#06251D] border-2 border-[#171717] dark:border-[#D9AC45]/60 max-h-[460px] flex items-center justify-center">
                    <img
                      src={sec.imageUrl}
                      alt={sec.imageCaption || sec.title || 'Gambar Bagian Profil'}
                      className="w-full h-auto max-h-[460px] object-cover"
                      loading="lazy"
                    />
                  </div>
                  {sec.imageCaption && (
                    <figcaption className="text-center text-xs text-[#171717]/70 dark:text-[#F8F3E8]/70 italic">
                      {sec.imageCaption}
                    </figcaption>
                  )}
                </figure>
              )}

              {sec.content && (
                <div
                  className="prose dark:prose-invert max-w-none text-[#171717] dark:text-[#F8F3E8] text-sm sm:text-base leading-relaxed space-y-4 font-sans blog-content"
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
          <div className="flex items-center justify-between border-b-2 border-[#171717]/15 dark:border-[#D9AC45]/25 pb-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#171717] dark:text-white font-serif flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#06251D] dark:text-[#D9AC45]" />
              <span>Galeri & Dokumentasi Pendukung</span>
            </h2>
            <span className="text-xs text-[#06251D] dark:text-[#D9AC45] font-extrabold">
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
                <div className="aspect-video w-full overflow-hidden bg-[#06251D] border-b-2 border-[#171717] dark:border-[#D9AC45]/60">
                  <img
                    src={img.url}
                    alt={img.caption || profile.name}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                {img.caption && (
                  <figcaption className="p-3 text-xs text-[#171717] dark:text-[#F8F3E8] font-bold line-clamp-2">
                    {img.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* LIGHTBOX MODAL FOR SUPPORTING IMAGES */}
      {selectedLightboxImage && (
        <div
          onClick={() => setSelectedLightboxImage(null)}
          className="fixed inset-0 z-70 bg-black/85 flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#F8F3E8] dark:bg-[#0B3026] border-2 border-[#171717] dark:border-[#D9AC45] rounded-lg overflow-hidden max-w-3xl w-full shadow-[6px_6px_0px_#171717]"
          >
            <div className="p-4 bg-[#06251D] text-white border-b-2 border-[#171717] dark:border-[#D9AC45]/60 flex items-center justify-between">
              <span className="text-xs font-bold text-[#D9AC45] truncate">
                {selectedLightboxImage.caption || profile.name}
              </span>
              <button
                type="button"
                onClick={() => setSelectedLightboxImage(null)}
                className="p-1.5 rounded bg-[#0B3026] border border-[#D9AC45] text-[#F8F3E8] hover:bg-[#D9AC45] hover:text-[#171717] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-[#171717] flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img
                src={selectedLightboxImage.url}
                alt={selectedLightboxImage.caption || profile.name}
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
            {selectedLightboxImage.caption && (
              <div className="p-4 text-center text-xs sm:text-sm font-bold text-[#171717] dark:text-[#F8F3E8]">
                {selectedLightboxImage.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
