import { getGoogleDriveImageCandidates } from './googleDriveHelper';
import { PORTFOLIO_WEBSITE_URL } from '../firebase/portfolioConfig';

export interface PortfolioRawProfile {
  id?: string;
  fullName?: string;
  headline?: string;
  shortBio?: string;
  biography?: string;
  domicile?: string;
  vision?: string;
  mission?: string;
  careerFocus?: string;
  photoUrl?: string;
  cvUrl?: string;
  status?: string;
  isVisible?: boolean;
  updatedAt?: unknown;
}

export interface PortfolioRawEducation {
  id?: string;
  institution?: string;
  degree?: string;
  fieldOfStudy?: string;
  graduationYear?: string;
  period?: string;
  location?: string;
  description?: string;
  category?: string;
  displayOrder?: number;
  status?: string;
  isVisible?: boolean;
}

export interface PortfolioRawExperience {
  id?: string;
  institution?: string;
  role?: string;
  category?: string;
  period?: string;
  duration?: string;
  location?: string;
  description?: string;
  responsibilities?: string[];
  featured?: boolean;
  displayOrder?: number;
  status?: string;
  isVisible?: boolean;
}

export interface PortfolioRawSkill {
  id?: string;
  name?: string;
  category?: string;
  proficiencyLabel?: string;
  description?: string;
  displayOrder?: number;
  status?: string;
  isVisible?: boolean;
}

export interface PortfolioEducationSummary {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  period: string;
  graduationYear: string;
  location: string;
  category: string;
  description: string;
  displayOrder: number;
}

export interface PortfolioExperienceSummary {
  id: string;
  role: string;
  institution: string;
  category: string;
  categoryLabel: string;
  period: string;
  duration: string;
  location: string;
  summary: string;
  responsibilities: string[];
  featured: boolean;
  displayOrder: number;
}

export interface PortfolioSkillSummary {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  proficiencyLabel: string;
  description: string;
  displayOrder: number;
}

export interface PortfolioInstructorSummary {
  fullName: string;
  headline: string;
  shortBio: string;
  domicile: string;
  photoUrl: string;
  photoCandidates: string[];
  portfolioUrl: string;
  education: PortfolioEducationSummary[];
  experiences: PortfolioExperienceSummary[];
  skills: PortfolioSkillSummary[];
  updatedAtMs: number | null;
}

const EXPERIENCE_CATEGORY_LABELS: Record<string, string> = {
  mentoring: 'Pembinaan',
  teaching: 'Pengajaran',
  committee: 'Kepanitiaan',
  work: 'Profesional'
};

const SKILL_CATEGORY_LABELS: Record<string, string> = {
  technical: 'Teknis',
  soft: 'Komunikasi & Kepemimpinan',
  academic: 'Keilmuan & Akademik',
  language: 'Bahasa',
  tool: 'Perangkat & Media'
};

const BARE_DRIVE_ID_REGEX = /^[a-zA-Z0-9_-]{20,80}$/;

function cleanString(value: unknown, maxLength = 2000): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function parseTimestampMs(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === 'object' && value !== null) {
    const maybeTs = value as { toMillis?: () => number; seconds?: number };
    if (typeof maybeTs.toMillis === 'function') {
      try {
        return maybeTs.toMillis();
      } catch {
        return null;
      }
    }
    if (typeof maybeTs.seconds === 'number') {
      return maybeTs.seconds * 1000;
    }
  }
  return null;
}

/**
 * Checks whether a portfolio document is explicitly published and visible to public visitors.
 */
export function isPublicPortfolioItem(item: { status?: string; isVisible?: boolean } | null | undefined): boolean {
  if (!item || typeof item !== 'object') return false;
  return item.status === 'published' && item.isVisible === true;
}

/**
 * Resolves a profile photo field (Google Drive share link, direct URL, or bare Drive file ID)
 * into an ordered array of public, unauthenticated-friendly direct image URL candidates.
 */
export function resolvePortfolioPhotoCandidates(rawPhotoUrl: string | null | undefined): string[] {
  const trimmed = cleanString(rawPhotoUrl, 2048);
  if (!trimmed) return [];

  // Handle bare Google Drive file IDs if ever stored directly without URL wrapper
  if (!trimmed.includes('://') && !trimmed.startsWith('/') && !trimmed.startsWith('data:') && BARE_DRIVE_ID_REGEX.test(trimmed)) {
    return getGoogleDriveImageCandidates(`https://drive.google.com/file/d/${trimmed}/view`);
  }

  return getGoogleDriveImageCandidates(trimmed);
}

/**
 * Produces a concise summary paragraph so long portfolio descriptions remain scannable on Dars with Osama.
 */
export function extractConciseText(rawText: string | null | undefined, maxChars = 280): string {
  const cleaned = cleanString(rawText, 5000);
  if (!cleaned) return '';

  // Take first non-empty paragraph
  const firstParagraph = cleaned
    .split(/\n+/)
    .map((p) => p.trim())
    .find((p) => p.length > 0) || '';

  if (firstParagraph.length <= maxChars) {
    return firstParagraph;
  }

  // Try to cut cleanly at the end of a sentence within maxChars
  const slice = firstParagraph.slice(0, maxChars);
  const lastPeriod = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
  if (lastPeriod >= Math.floor(maxChars * 0.55)) {
    return slice.slice(0, lastPeriod + 1).trim();
  }

  // Otherwise cut cleanly at word boundary
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > 40 ? slice.slice(0, lastSpace) : slice;
  return `${cut.replace(/[,;:\-\s]+$/, '')}...`;
}

function getDisplayOrder(value: unknown, fallback = 9999): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sortByDisplayOrder<T extends { displayOrder: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Normalizes raw public Firestore documents from the portfolio project into a concise,
 * consistent Instructor Profile summary for Dars with Osama.
 *
 * Returns null if no published & visible profile document exists.
 */
export function normalizePortfolioInstructorSummary(
  rawProfiles: PortfolioRawProfile[],
  rawEducation: PortfolioRawEducation[],
  rawExperiences: PortfolioRawExperience[],
  rawSkills: PortfolioRawSkill[],
  portfolioUrl: string = PORTFOLIO_WEBSITE_URL
): PortfolioInstructorSummary | null {
  const publicProfiles = (Array.isArray(rawProfiles) ? rawProfiles : []).filter(isPublicPortfolioItem);
  const selectedProfile =
    publicProfiles.find((p) => p.id === 'main') ||
    publicProfiles[0] ||
    null;

  if (!selectedProfile) {
    return null;
  }

  const fullName = cleanString(selectedProfile.fullName, 160);
  const headline = cleanString(selectedProfile.headline, 260);
  const shortBio =
    cleanString(selectedProfile.shortBio, 900) ||
    extractConciseText(selectedProfile.biography, 420);
  const domicile = cleanString(selectedProfile.domicile, 160);
  const photoUrl = cleanString(selectedProfile.photoUrl, 2048);
  const photoCandidates = resolvePortfolioPhotoCandidates(photoUrl);

  const education: PortfolioEducationSummary[] = sortByDisplayOrder(
    (Array.isArray(rawEducation) ? rawEducation : [])
      .filter(isPublicPortfolioItem)
      .map((item, idx) => ({
        id: cleanString(item.id, 120) || `edu-${idx}`,
        institution: cleanString(item.institution, 200),
        degree: cleanString(item.degree, 160),
        fieldOfStudy: cleanString(item.fieldOfStudy, 200),
        period: cleanString(item.period, 100),
        graduationYear: cleanString(item.graduationYear, 60),
        location: cleanString(item.location, 160),
        category: cleanString(item.category, 80),
        description: extractConciseText(item.description, 220),
        displayOrder: getDisplayOrder(item.displayOrder, idx + 1)
      }))
      .filter((item) => Boolean(item.institution || item.degree || item.fieldOfStudy))
  );

  const experiences: PortfolioExperienceSummary[] = sortByDisplayOrder(
    (Array.isArray(rawExperiences) ? rawExperiences : [])
      .filter(isPublicPortfolioItem)
      .map((item, idx) => {
        const rawCategory = cleanString(item.category, 60).toLowerCase();
        const responsibilities = Array.isArray(item.responsibilities)
          ? item.responsibilities
              .map((r) => cleanString(r, 240))
              .filter((r) => r.length > 0)
              .slice(0, 4)
          : [];

        return {
          id: cleanString(item.id, 120) || `exp-${idx}`,
          role: cleanString(item.role, 200),
          institution: cleanString(item.institution, 200),
          category: rawCategory,
          categoryLabel: EXPERIENCE_CATEGORY_LABELS[rawCategory] || '',
          period: cleanString(item.period, 100),
          duration: cleanString(item.duration, 100),
          location: cleanString(item.location, 160),
          summary: extractConciseText(item.description, 260),
          responsibilities,
          featured: Boolean(item.featured),
          displayOrder: getDisplayOrder(item.displayOrder, idx + 1)
        };
      })
      .filter((item) => Boolean(item.role || item.institution))
  );

  const skills: PortfolioSkillSummary[] = sortByDisplayOrder(
    (Array.isArray(rawSkills) ? rawSkills : [])
      .filter(isPublicPortfolioItem)
      .map((item, idx) => {
        const rawCategory = cleanString(item.category, 60).toLowerCase();
        return {
          id: cleanString(item.id, 120) || `skill-${idx}`,
          name: cleanString(item.name, 140),
          category: rawCategory,
          categoryLabel: SKILL_CATEGORY_LABELS[rawCategory] || '',
          proficiencyLabel: cleanString(item.proficiencyLabel, 120),
          description: extractConciseText(item.description, 160),
          displayOrder: getDisplayOrder(item.displayOrder, idx + 1)
        };
      })
      .filter((item) => Boolean(item.name))
  );

  if (!fullName && !headline && !shortBio && education.length === 0 && experiences.length === 0 && skills.length === 0) {
    return null;
  }

  return {
    fullName,
    headline,
    shortBio,
    domicile,
    photoUrl,
    photoCandidates,
    portfolioUrl,
    education,
    experiences,
    skills,
    updatedAtMs: parseTimestampMs(selectedProfile.updatedAt)
  };
}
