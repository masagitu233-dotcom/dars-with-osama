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
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 pb-16 animate-fade-in font-sans"
    >
      {/* TOP NAVIGATION & ACTION BAR */}
      {!isPreviewMode && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-stone-800 transition cursor-pointer active:scale-95 shadow-xs"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Kembali</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && onEditInAdmin && (
              <button
                type="button"
                data-testid="profile-admin-edit-btn"
                onClick={onEditInAdmin}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold hover:bg-amber-200 transition cursor-pointer active:scale-95 shadow-xs"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Kelola Profil (Admin)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyProfileLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 text-xs font-bold hover:bg-stone-50 dark:hover:bg-stone-800 transition cursor-pointer active:scale-95 shadow-xs"
              title="Salin tautan halaman Profil Pengajar"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[#C9A34E]" />}
              <span>{copied ? 'Tautan Disalin!' : 'Salin Link'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareProfile}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#073B2E] hover:bg-[#0a4d3c] text-white text-xs font-bold transition cursor-pointer active:scale-95 shadow-xs"
            >
              <Share2 className="w-4 h-4 text-[#C9A34E]" />
              <span>Bagikan Profil</span>
            </button>
          </div>
        </div>
      )}

      {/* HERO PROFILE HEADER CARD */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#073B2E] via-[#094838] to-[#052920] text-[#F7F6EF] border border-[#C9A34E]/30 shadow-xl p-6 sm:p-10">
        {/* Subtle decorative geometric accent */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#C9A34E]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
          {/* Instructor Portrait / Emblem */}
          <div className="shrink-0 flex flex-col items-center space-y-2.5">
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl overflow-hidden border-2 border-[#C9A34E]/60 bg-[#052920] shadow-2xl flex items-center justify-center relative">
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
                  className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#073B2E] to-[#04221a] text-[#C9A34E] select-none"
                >
                  <span className="font-serif-brand text-4xl sm:text-5xl font-bold tracking-wider">
                    {initials}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-[#F7F6EF]/70 mt-1 font-semibold">
                    Dars with Osama
                  </span>
                </div>
              )}
            </div>
            {profile.photoCaption && (
              <p className="text-[11px] text-[#F7F6EF]/75 text-center max-w-[200px] leading-snug italic">
                {profile.photoCaption}
              </p>
            )}
          </div>

          {/* Instructor Identity & Biography */}
          <div className="flex-1 text-center md:text-left space-y-4 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[#C9A34E]/20 border border-[#C9A34E]/40 text-[#F4B942] text-xs font-bold">
              <UserCheck className="w-3.5 h-3.5" />
              <span data-testid="instructor-profile-title">{profile.title || 'Profil Pengajar Dars with Osama'}</span>
            </div>

            <div className="space-y-1.5">
              <h1
                data-testid="instructor-profile-name"
                className="text-2xl sm:text-4xl font-bold font-serif-brand tracking-tight text-white leading-tight"
              >
                {profile.name}
              </h1>
              <p
                data-testid="instructor-profile-role"
                className="text-sm sm:text-base font-semibold text-[#C9A34E]"
              >
                {profile.role}
              </p>
            </div>

            {/* Biography Rich Text */}
            {profile.biography && (
              <div
                data-testid="instructor-profile-biography"
                className="pt-2 text-sm sm:text-base text-[#F7F6EF]/90 leading-relaxed space-y-3 blog-content"
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
                  className="px-4 py-2 rounded-xl bg-[#C9A34E] hover:bg-[#d8b15a] text-[#071B16] font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Katalog Kursus & Matan</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('blog')}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#C9A34E]" />
                  <span>Artikel & Naskah Ilmu</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('public-qa')}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[#C9A34E]" />
                  <span>Arsip Tanya Jawab</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* LOADING INDICATOR */}
      {loading && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-8 text-center text-xs text-stone-500">
          Memuat data Profil Pengajar...
        </div>
      )}

      {/* MAIN NARRATIVE CONTENT ("ISI TULISAN") */}
      {profile.mainContent && profile.mainContent.replace(/<[^>]*>/g, '').trim() !== '' && (
        <article className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 sm:p-10 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 border-b border-stone-100 dark:border-stone-800 pb-3">
            <Sparkles className="w-4 h-4 text-[#C9A34E]" />
            <span>Pengantar & Catatan Profil</span>
          </div>

          <div
            data-testid="instructor-profile-main-content"
            className="prose dark:prose-invert max-w-none text-stone-800 dark:text-stone-200 text-sm sm:text-base leading-relaxed space-y-4 font-sans blog-content"
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
              className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 sm:p-10 shadow-xs space-y-5"
            >
              {sec.title && (
                <div className="border-b border-stone-200 dark:border-stone-800 pb-3">
                  <h2 className="text-lg sm:text-2xl font-bold text-stone-900 dark:text-white font-serif-brand">
                    {sec.title}
                  </h2>
                </div>
              )}

              {sec.imageUrl && (
                <figure className="space-y-2">
                  <div className="rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 max-h-[460px] flex items-center justify-center">
                    <img
                      src={sec.imageUrl}
                      alt={sec.imageCaption || sec.title || 'Gambar Bagian Profil'}
                      className="w-full h-auto max-h-[460px] object-cover"
                      loading="lazy"
                    />
                  </div>
                  {sec.imageCaption && (
                    <figcaption className="text-center text-xs text-stone-500 dark:text-stone-400 italic">
                      {sec.imageCaption}
                    </figcaption>
                  )}
                </figure>
              )}

              {sec.content && (
                <div
                  className="prose dark:prose-invert max-w-none text-stone-800 dark:text-stone-200 text-sm sm:text-base leading-relaxed space-y-4 font-sans blog-content"
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
          className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 sm:p-10 shadow-xs space-y-5"
        >
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white font-serif-brand flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Galeri & Dokumentasi Pendukung</span>
            </h2>
            <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
              {orderedImages.length} Gambar
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {orderedImages.map((img) => (
              <figure
                key={img.id}
                onClick={() => setSelectedLightboxImage(img)}
                className="group rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 flex flex-col justify-between cursor-pointer hover:border-emerald-500/50 transition shadow-xs"
              >
                <div className="aspect-video w-full overflow-hidden bg-stone-100 dark:bg-stone-800">
                  <img
                    src={img.url}
                    alt={img.caption || profile.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                {img.caption && (
                  <figcaption className="p-3 text-xs text-stone-600 dark:text-stone-300 font-medium line-clamp-2">
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
          className="fixed inset-0 z-70 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl overflow-hidden max-w-3xl w-full shadow-2xl"
          >
            <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300 truncate">
                {selectedLightboxImage.caption || profile.name}
              </span>
              <button
                type="button"
                onClick={() => setSelectedLightboxImage(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-stone-950 flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img
                src={selectedLightboxImage.url}
                alt={selectedLightboxImage.caption || profile.name}
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
            {selectedLightboxImage.caption && (
              <div className="p-4 text-center text-xs sm:text-sm text-stone-700 dark:text-stone-300">
                {selectedLightboxImage.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
