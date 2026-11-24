import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { getPortfolioFirestore, PORTFOLIO_WEBSITE_URL } from './portfolioConfig';
import {
  normalizePortfolioInstructorSummary,
  PortfolioInstructorSummary,
  PortfolioRawEducation,
  PortfolioRawExperience,
  PortfolioRawProfile,
  PortfolioRawSkill
} from '../utils/portfolioProfileHelper';

/**
 * Public-only Firestore collections audited from https://cvosamanursamsil.netlify.app/.
 * Private/admin collections (admins, contactMessages, activityLogs, mediaAssets) are NEVER accessed.
 */
const PORTFOLIO_PUBLIC_COLLECTIONS = {
  profile: 'profile',
  education: 'education',
  experiences: 'experiences',
  skills: 'skills'
} as const;

function buildPublicCollectionQuery(collectionName: string) {
  const portfolioDb = getPortfolioFirestore();
  return query(
    collection(portfolioDb, collectionName),
    where('status', '==', 'published'),
    where('isVisible', '==', true)
  );
}

/**
 * Fetches the public instructor profile summary once from the portfolio Firestore database.
 * Requires NO authentication.
 */
export async function fetchPortfolioInstructorProfile(): Promise<PortfolioInstructorSummary> {
  const profileSnap = await getDocs(buildPublicCollectionQuery(PORTFOLIO_PUBLIC_COLLECTIONS.profile));
  const rawProfiles: PortfolioRawProfile[] = profileSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>)
  }));

  // Secondary summary sections are fetched resiliently so a single missing/restricted sub-section
  // never prevents the core instructor profile from rendering.
  const [eduRes, expRes, skillRes] = await Promise.allSettled([
    getDocs(buildPublicCollectionQuery(PORTFOLIO_PUBLIC_COLLECTIONS.education)),
    getDocs(buildPublicCollectionQuery(PORTFOLIO_PUBLIC_COLLECTIONS.experiences)),
    getDocs(buildPublicCollectionQuery(PORTFOLIO_PUBLIC_COLLECTIONS.skills))
  ]);

  const rawEducation: PortfolioRawEducation[] =
    eduRes.status === 'fulfilled'
      ? eduRes.value.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }))
      : [];

  const rawExperiences: PortfolioRawExperience[] =
    expRes.status === 'fulfilled'
      ? expRes.value.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }))
      : [];

  const rawSkills: PortfolioRawSkill[] =
    skillRes.status === 'fulfilled'
      ? skillRes.value.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }))
      : [];

  const normalized = normalizePortfolioInstructorSummary(
    rawProfiles,
    rawEducation,
    rawExperiences,
    rawSkills,
    PORTFOLIO_WEBSITE_URL
  );

  if (!normalized) {
    throw new Error('Data profil publik belum tersedia di website portofolio.');
  }

  return normalized;
}

/**
 * Subscribes in real time (via Firestore onSnapshot) to the public portfolio data
 * (profile, education, experiences, skills).
 *
 * Any update made on https://cvosamanursamsil.netlify.app/ (bio, photo, education,
 * experiences, skills) automatically reflects on Dars with Osama without manual syncing.
 *
 * Returns an unsubscribe cleanup function.
 */
export function subscribePortfolioInstructorProfile(
  onUpdate: (summary: PortfolioInstructorSummary | null) => void,
  onError?: (error: Error) => void
): () => void {
  let isActive = true;
  let profileLoaded = false;

  let rawProfiles: PortfolioRawProfile[] = [];
  let rawEducation: PortfolioRawEducation[] = [];
  let rawExperiences: PortfolioRawExperience[] = [];
  let rawSkills: PortfolioRawSkill[] = [];

  const emitNormalized = () => {
    if (!isActive || !profileLoaded) return;
    const summary = normalizePortfolioInstructorSummary(
      rawProfiles,
      rawEducation,
      rawExperiences,
      rawSkills,
      PORTFOLIO_WEBSITE_URL
    );
    onUpdate(summary);
  };

  const unsubscribers: Array<() => void> = [];

  try {
    // 1. Primary profile document listener (required)
    unsubscribers.push(
      onSnapshot(
        buildPublicCollectionQuery(PORTFOLIO_PUBLIC_COLLECTIONS.profile),
        (snapshot) => {
          if (!isActive) return;
          profileLoaded = true;
          rawProfiles = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Record<string, unknown>)
          }));
          emitNormalized();
        },
        (err) => {
          if (!isActive) return;
          console.warn('[PortfolioProfileService] Gagal membaca koleksi publik profile:', err);
          onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      )
    );

    // 2. Education listener (optional summary section)
    unsubscribers.push(
      onSnapshot(
        buildPublicCollectionQuery(PORTFOLIO_PUBLIC_COLLECTIONS.education),
        (snapshot) => {
          if (!isActive) return;
          rawEducation = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Record<string, unknown>)
          }));
          emitNormalized();
        },
        (err) => {
          if (!isActive) return;
          console.warn('[PortfolioProfileService] Koleksi education tidak dapat dimuat:', err);
          rawEducation = [];
          emitNormalized();
        }
      )
    );

    // 3. Experiences listener (optional summary section)
    unsubscribers.push(
      onSnapshot(
        buildPublicCollectionQuery(PORTFOLIO_PUBLIC_COLLECTIONS.experiences),
        (snapshot) => {
          if (!isActive) return;
          rawExperiences = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Record<string, unknown>)
          }));
          emitNormalized();
        },
        (err) => {
          if (!isActive) return;
          console.warn('[PortfolioProfileService] Koleksi experiences tidak dapat dimuat:', err);
          rawExperiences = [];
          emitNormalized();
        }
      )
    );

    // 4. Skills listener (optional summary section)
    unsubscribers.push(
      onSnapshot(
        buildPublicCollectionQuery(PORTFOLIO_PUBLIC_COLLECTIONS.skills),
        (snapshot) => {
          if (!isActive) return;
          rawSkills = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Record<string, unknown>)
          }));
          emitNormalized();
        },
        (err) => {
          if (!isActive) return;
          console.warn('[PortfolioProfileService] Koleksi skills tidak dapat dimuat:', err);
          rawSkills = [];
          emitNormalized();
        }
      )
    );
  } catch (err) {
    console.warn('[PortfolioProfileService] Inisialisasi listener portofolio gagal:', err);
    onError?.(err instanceof Error ? err : new Error(String(err)));
  }

  return () => {
    isActive = false;
    unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch {
        // Ignore cleanup errors
      }
    });
  };
}
