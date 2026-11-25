import type {
  BlogPost,
  Category,
  Consultation,
  Course,
  LibraryBook,
  LibraryBookVolume,
  Session
} from '../types';
import type { PortfolioInstructorSummary } from './portfolioProfileHelper';

export const CANONICAL_SITE_ORIGIN = 'https://darswithosama.netlify.app';
export const SITE_NAME = 'Dars with Osama';
export const DEFAULT_OG_IMAGE = `${CANONICAL_SITE_ORIGIN}/covers/course-1792229735274.jpg`;
export const PORTFOLIO_CANONICAL_URL = 'https://cvosamanursamsil.netlify.app/';

export const DEFAULT_HOME_TITLE =
  'Dars with Osama – Belajar Fikih, Ilmu Nahwu, dan Kajian Islam';
export const DEFAULT_HOME_DESCRIPTION =
  'Platform pembelajaran Islam online Dars with Osama bersama Ustaz Osama Nur Samsil. Belajar Fikih, Ilmu Nahwu, syarah kitab, artikel ilmiah, tanya jawab syar\'i, dan perpustakaan digital gratis.';

export const PUBLIC_ROBOTS_DIRECTIVE =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
export const PRIVATE_ROBOTS_DIRECTIVE = 'noindex, nofollow';

export const NON_INDEXABLE_VIEWS = new Set<string>([
  'student-dashboard',
  'admin-dashboard',
  'quiz-view',
  'session-view',
  'consultation',
  'search',
  'unsubscribe'
]);

export const INDEXABLE_VIEWS = new Set<string>([
  'home',
  'courses',
  'course-detail',
  'blog',
  'blog-detail',
  'library',
  'library-detail',
  'library-read',
  'public-qa',
  'instructor-profile'
]);

export interface PageSeoInput {
  view: string;
  pathname?: string;
  course?: Course | null;
  category?: Category | null;
  sessionsCount?: number;
  session?: Session | null;
  blogPost?: BlogPost | null;
  libraryBook?: LibraryBook | null;
  libraryVolume?: LibraryBookVolume | null;
  qaItem?: Consultation | null;
  instructorProfile?: PortfolioInstructorSummary | null;
  searchQuery?: string;
  isNotFound?: boolean;
}

export interface PageSeoOutput {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: string;
  indexable: boolean;
  ogType: 'website' | 'article' | 'book' | 'profile';
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  ogSiteName: string;
  ogLocale: string;
  twitterCard: 'summary_large_image' | 'summary';
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  jsonLd: Record<string, unknown>[];
}

export interface SitemapEntry {
  loc: string;
  lastmod?: string | null;
  changefreq?: 'daily' | 'weekly' | 'monthly';
  priority?: number;
}

/**
 * Strips HTML tags and normalizes whitespace for clean meta descriptions and JSON-LD text.
 */
export function stripHtmlForSeo(input?: string | null, maxLength?: number): string {
  if (!input || typeof input !== 'string') return '';
  const cleaned = input
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();

  if (maxLength && cleaned.length > maxLength) {
    const sliced = cleaned.slice(0, maxLength - 1);
    const lastSpace = sliced.lastIndexOf(' ');
    return `${(lastSpace > maxLength * 0.65 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
  }
  return cleaned;
}

/**
 * Parses a timestamp strictly into a valid ISO 8601 string.
 * Returns undefined if the source value is missing or invalid (never invents current date).
 */
export function toValidIsoDate(value?: unknown): string | undefined {
  if (!value) return undefined;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return undefined;
    // Guard against bogus dates outside reasonable range
    const year = parsed.getUTCFullYear();
    if (year < 2000 || year > 2100) return undefined;
    return parsed.toISOString();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return undefined;
    const year = parsed.getUTCFullYear();
    if (year < 2000 || year > 2100) return undefined;
    return parsed.toISOString();
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof obj.toDate === 'function') {
      try {
        const d = obj.toDate();
        return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
      } catch {
        return undefined;
      }
    }
    const sec = typeof obj.seconds === 'number' ? obj.seconds : obj._seconds;
    if (typeof sec === 'number' && Number.isFinite(sec)) {
      const d = new Date(sec * 1000);
      return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
    }
  }

  return undefined;
}

/**
 * Converts a Google Drive share URL or relative asset path to a public direct HTTPS URL for OG/JSON-LD.
 */
export function normalizeSeoImageUrl(rawUrl?: string | null): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return DEFAULT_OG_IMAGE;

  // Convert Google Drive sharing links to publicly renderable direct image URL
  const driveFileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveFileMatch?.[1]) {
    return `https://lh3.googleusercontent.com/d/${driveFileMatch[1]}=w1200`;
  }
  const driveIdParam = trimmed.match(/drive\.google\.com\/(?:open|uc|thumbnail)\?[^#]*[?&]id=([a-zA-Z0-9_-]+)/i);
  if (driveIdParam?.[1]) {
    return `https://lh3.googleusercontent.com/d/${driveIdParam[1]}=w1200`;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return `${CANONICAL_SITE_ORIGIN}${trimmed}`;
  }

  return `${CANONICAL_SITE_ORIGIN}/${trimmed}`;
}

/**
 * Builds a clean absolute canonical URL anchored strictly to https://darswithosama.netlify.app.
 * Strips query parameters, hash fragments, and trailing slashes on subpaths.
 */
export function buildCanonicalUrl(pathname: string): string {
  const raw = (pathname || '/').trim();
  const withoutOrigin = raw.replace(/^https?:\/\/[^/]+/i, '');
  const withoutQueryOrHash = withoutOrigin.split(/[?#]/)[0] || '/';
  const ensuredLeading = withoutQueryOrHash.startsWith('/')
    ? withoutQueryOrHash
    : `/${withoutQueryOrHash}`;
  const collapsed = ensuredLeading.replace(/\/{2,}/g, '/');
  if (collapsed === '/') {
    return `${CANONICAL_SITE_ORIGIN}/`;
  }
  return `${CANONICAL_SITE_ORIGIN}${collapsed.replace(/\/+$/, '')}`;
}

/**
 * Checks whether a URL pathname matches a known public route in Dars with Osama.
 * Prevents unknown/broken paths from being marked indexable (soft-404 protection).
 */
export function isKnownPublicPath(pathname?: string): boolean {
  if (!pathname) return true;
  const clean = pathname.split(/[?#]/)[0].replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
  if (clean === '/' || clean === '/index.html') return true;
  if (
    clean === '/courses' ||
    clean === '/kursus' ||
    clean === '/katalog' ||
    clean === '/blog' ||
    clean === '/artikel' ||
    clean === '/library' ||
    clean === '/perpustakaan' ||
    clean === '/tanya-jawab' ||
    clean === '/qa' ||
    clean === '/profil-pengajar' ||
    clean === '/profil' ||
    clean === '/pengajar'
  ) {
    return true;
  }
  if (
    clean.startsWith('/course/') ||
    clean.startsWith('/article/') ||
    clean.startsWith('/library/') ||
    clean.startsWith('/qa/') ||
    clean.startsWith('/tanya-jawab/')
  ) {
    return true;
  }
  return false;
}

/**
 * Determines whether a given route state should be indexed by search engines.
 */
export function isIndexableRoute(
  view: string,
  options?: {
    isDraftOrUnpublished?: boolean;
    isNotFound?: boolean;
    pathname?: string;
  }
): boolean {
  if (options?.isNotFound) return false;
  if (options?.isDraftOrUnpublished) return false;
  if (NON_INDEXABLE_VIEWS.has(view)) return false;
  if (!INDEXABLE_VIEWS.has(view)) return false;
  if (options?.pathname && !isKnownPublicPath(options.pathname)) return false;
  return true;
}

export function buildWebsiteJsonLd(): Record<string, unknown> {
  return {
    '@type': 'WebSite',
    '@id': `${CANONICAL_SITE_ORIGIN}/#website`,
    name: SITE_NAME,
    alternateName: 'Dars with Osama – Belajar Fikih, Ilmu Nahwu, dan Kajian Islam',
    url: `${CANONICAL_SITE_ORIGIN}/`,
    description: DEFAULT_HOME_DESCRIPTION,
    inLanguage: 'id-ID',
    publisher: {
      '@type': 'EducationalOrganization',
      '@id': `${CANONICAL_SITE_ORIGIN}/#organization`,
      name: SITE_NAME,
      url: `${CANONICAL_SITE_ORIGIN}/`,
      logo: {
        '@type': 'ImageObject',
        url: DEFAULT_OG_IMAGE
      }
    }
  };
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; url: string }>
): Record<string, unknown> {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url
    }))
  };
}

export function buildPersonJsonLd(
  profile?: PortfolioInstructorSummary | null
): Record<string, unknown> {
  const fullName = profile?.fullName?.trim() || 'Ustaz Osama Nur Samsil';
  const headline = profile?.headline?.trim() || 'Pengajar Fikih, Ilmu Nahwu, dan Kajian Kitab Islam';
  const description =
    stripHtmlForSeo(profile?.shortBio, 260) ||
    'Pengajar di Dars with Osama yang mengampu kajian Fikih, Ilmu Nahwu, dan syarah kitab Islam.';

  const sameAs = new Set<string>([PORTFOLIO_CANONICAL_URL]);
  if (profile?.portfolioUrl && /^https?:\/\//i.test(profile.portfolioUrl)) {
    sameAs.add(profile.portfolioUrl);
  }

  const schema: Record<string, unknown> = {
    '@type': 'Person',
    '@id': `${CANONICAL_SITE_ORIGIN}/profil-pengajar#person`,
    name: fullName,
    jobTitle: headline,
    description,
    url: `${CANONICAL_SITE_ORIGIN}/profil-pengajar`,
    mainEntityOfPage: `${CANONICAL_SITE_ORIGIN}/profil-pengajar`,
    sameAs: Array.from(sameAs),
    worksFor: {
      '@type': 'EducationalOrganization',
      name: SITE_NAME,
      url: `${CANONICAL_SITE_ORIGIN}/`
    }
  };

  if (profile?.photoUrl) {
    schema.image = normalizeSeoImageUrl(profile.photoUrl);
  }

  if (profile?.education && profile.education.length > 0) {
    const institutions = Array.from(
      new Set(
        profile.education
          .map((e) => e.institution?.trim())
          .filter((inst): inst is string => Boolean(inst))
      )
    );
    if (institutions.length > 0) {
      schema.alumniOf = institutions.map((name) => ({
        '@type': 'EducationalOrganization',
        name
      }));
    }
  }

  if (profile?.skills && profile.skills.length > 0) {
    const knows = Array.from(
      new Set(
        profile.skills
          .map((s) => s.name?.trim())
          .filter((name): name is string => Boolean(name))
      )
    );
    if (knows.length > 0) {
      schema.knowsAbout = knows;
    }
  }

  return schema;
}

export function buildCourseJsonLd(
  course: Course,
  canonicalUrl: string,
  category?: Category | null
): Record<string, unknown> {
  const levelMap: Record<string, string> = {
    beginner: 'Pemula',
    intermediate: 'Menengah',
    advanced: 'Lanjutan'
  };

  const description =
    stripHtmlForSeo(course.description, 280) ||
    `Kurikulum pembelajaran ${course.title} bersama ${course.instructor || 'Ustaz Osama Nur Samsil'} di Dars with Osama.`;

  const schema: Record<string, unknown> = {
    '@type': 'Course',
    '@id': `${canonicalUrl}#course`,
    name: course.title,
    description,
    url: canonicalUrl,
    image: normalizeSeoImageUrl(course.coverImageUrl),
    inLanguage: 'id-ID',
    isAccessibleForFree: true,
    courseMode: 'online',
    provider: {
      '@type': 'EducationalOrganization',
      name: SITE_NAME,
      url: `${CANONICAL_SITE_ORIGIN}/`
    }
  };

  if (course.titleAr?.trim()) {
    schema.alternateName = course.titleAr.trim();
  }
  if (course.level && levelMap[course.level]) {
    schema.educationalLevel = levelMap[course.level];
  }
  if (category?.name?.trim()) {
    schema.about = category.name.trim();
  }
  if (course.instructor?.trim()) {
    schema.instructor = {
      '@type': 'Person',
      name: course.instructor.trim(),
      url: `${CANONICAL_SITE_ORIGIN}/profil-pengajar`
    };
  }

  return schema;
}

export function buildArticleJsonLd(
  article: BlogPost,
  canonicalUrl: string
): Record<string, unknown> {
  const description =
    stripHtmlForSeo(article.excerpt || article.content, 240) ||
    `Artikel ilmiah ${article.title} di Dars with Osama.`;
  const image = normalizeSeoImageUrl(article.coverImageUrl);
  const datePublished = toValidIsoDate(article.publishedAt || article.createdAt);
  const dateModified = toValidIsoDate(article.updatedAt || article.publishedAt || article.createdAt);

  const schema: Record<string, unknown> = {
    '@type': 'Article',
    '@id': `${canonicalUrl}#article`,
    headline: article.title,
    description,
    image: [image],
    inLanguage: 'id-ID',
    author: {
      '@type': 'Person',
      name: article.authorName?.trim() || 'Ustaz Osama Nur Samsil',
      url: `${CANONICAL_SITE_ORIGIN}/profil-pengajar`
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: `${CANONICAL_SITE_ORIGIN}/`,
      logo: {
        '@type': 'ImageObject',
        url: DEFAULT_OG_IMAGE
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl
    }
  };

  if (article.titleAr?.trim()) {
    schema.alternativeHeadline = article.titleAr.trim();
  }
  if (datePublished) {
    schema.datePublished = datePublished;
  }
  if (dateModified) {
    schema.dateModified = dateModified;
  }
  if (article.category?.trim()) {
    schema.articleSection = article.category.trim();
  }
  if (Array.isArray(article.tags) && article.tags.length > 0) {
    schema.keywords = article.tags.filter(Boolean).join(', ');
  }

  return schema;
}

export function buildBookJsonLd(
  book: LibraryBook,
  canonicalUrl: string,
  volume?: LibraryBookVolume | null
): Record<string, unknown> {
  const name = volume
    ? `${book.title} – ${volume.title || `Jilid ${volume.volumeNumber}`}`
    : book.title;
  const description =
    stripHtmlForSeo(
      volume?.content || book.description || book.content,
      260
    ) || `Koleksi kitab digital ${name} di Library Digital Dars with Osama.`;

  const schema: Record<string, unknown> = {
    '@type': 'Book',
    '@id': `${canonicalUrl}#book`,
    name,
    description,
    url: canonicalUrl,
    image: normalizeSeoImageUrl(book.coverImageUrl),
    bookFormat: 'https://schema.org/EBook',
    inLanguage: 'id-ID',
    isAccessibleForFree: true,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: `${CANONICAL_SITE_ORIGIN}/`
    }
  };

  if (book.titleAr?.trim()) {
    schema.alternateName = book.titleAr.trim();
  }
  if (book.author?.trim()) {
    schema.author = {
      '@type': 'Person',
      name: book.author.trim()
    };
  }
  if (book.category?.trim()) {
    schema.genre = book.category.trim();
  }
  const datePublished = toValidIsoDate(
    volume?.publishedAt || book.publishedAt || book.createdAt
  );
  if (datePublished) {
    schema.datePublished = datePublished;
  }
  const dateModified = toValidIsoDate(
    volume?.updatedAt || book.updatedAt
  );
  if (dateModified) {
    schema.dateModified = dateModified;
  }

  return schema;
}

export function buildQaJsonLd(
  qa: Consultation,
  canonicalUrl: string
): Record<string, unknown> {
  const cleanQuestion = stripHtmlForSeo(qa.content, 400);
  const cleanAnswer = stripHtmlForSeo(qa.replyContent, 600);
  const dateCreated = toValidIsoDate(qa.createdAt);
  const answerDate = toValidIsoDate(qa.repliedAt || qa.publishedAt);

  const mainEntity: Record<string, unknown> = {
    '@type': 'Question',
    name: qa.title,
    text: cleanQuestion || qa.title,
    answerCount: cleanAnswer ? 1 : 0,
    author: {
      '@type': 'Person',
      name: 'Penanya (Anonim)'
    }
  };

  if (dateCreated) {
    mainEntity.dateCreated = dateCreated;
  }

  if (cleanAnswer) {
    const answerNode: Record<string, unknown> = {
      '@type': 'Answer',
      text: cleanAnswer,
      url: canonicalUrl,
      author: {
        '@type': 'Person',
        name: 'Ustaz Osama Nur Samsil',
        url: `${CANONICAL_SITE_ORIGIN}/profil-pengajar`
      }
    };
    if (answerDate) {
      answerNode.dateCreated = answerDate;
    }
    mainEntity.acceptedAnswer = answerNode;
  }

  return {
    '@type': 'QAPage',
    '@id': `${canonicalUrl}#qapage`,
    url: canonicalUrl,
    name: qa.title,
    inLanguage: 'id-ID',
    mainEntity
  };
}

/**
 * Generates complete, unique, factual SEO metadata + JSON-LD for every route in Dars with Osama.
 */
export function buildPageSeoMetadata(input: PageSeoInput): PageSeoOutput {
  const {
    view,
    pathname,
    course,
    category,
    session,
    blogPost,
    libraryBook,
    libraryVolume,
    qaItem,
    instructorProfile,
    searchQuery,
    isNotFound
  } = input;

  const makeOutput = (params: {
    title: string;
    description: string;
    canonicalPath: string;
    indexable: boolean;
    ogType?: 'website' | 'article' | 'book' | 'profile';
    ogTitle?: string;
    ogImage?: string;
    jsonLd?: Record<string, unknown>[];
  }): PageSeoOutput => {
    const canonicalUrl = buildCanonicalUrl(params.canonicalPath);
    const ogTitle = params.ogTitle || params.title;
    const ogImage = normalizeSeoImageUrl(params.ogImage);
    const cleanDesc = stripHtmlForSeo(params.description, 165) || DEFAULT_HOME_DESCRIPTION;

    return {
      title: params.title,
      description: cleanDesc,
      canonicalUrl,
      robots: params.indexable ? PUBLIC_ROBOTS_DIRECTIVE : PRIVATE_ROBOTS_DIRECTIVE,
      indexable: params.indexable,
      ogType: params.ogType || 'website',
      ogTitle,
      ogDescription: cleanDesc,
      ogImage,
      ogUrl: canonicalUrl,
      ogSiteName: SITE_NAME,
      ogLocale: 'id_ID',
      twitterCard: 'summary_large_image',
      twitterTitle: ogTitle,
      twitterDescription: cleanDesc,
      twitterImage: ogImage,
      jsonLd: params.indexable ? (params.jsonLd || []) : []
    };
  };

  // Non-indexable private / internal / student-gated views
  if (view === 'admin-dashboard') {
    return makeOutput({
      title: 'Panel Admin | Dars with Osama',
      description: 'Halaman administrasi internal Dars with Osama.',
      canonicalPath: '/admin',
      indexable: false
    });
  }

  if (view === 'student-dashboard') {
    return makeOutput({
      title: 'Dashboard Siswa | Dars with Osama',
      description: 'Progres pembelajaran dan riwayat evaluasi pribadi siswa Dars with Osama.',
      canonicalPath: '/student',
      indexable: false
    });
  }

  if (view === 'quiz-view') {
    return makeOutput({
      title: course ? `Evaluasi & Kuis – ${course.title} | Dars with Osama` : 'Evaluasi & Kuis Siswa | Dars with Osama',
      description: 'Halaman evaluasi dan kuis pemahaman khusus siswa terdaftar di Dars with Osama.',
      canonicalPath: course ? `/course/${encodeURIComponent(course.id)}` : '/courses',
      indexable: false
    });
  }

  if (view === 'session-view') {
    const sessionTitle = session
      ? `${session.title}${course ? ` – ${course.title}` : ''} | Dars with Osama`
      : 'Sesi Pembelajaran | Dars with Osama';
    const sessionDesc = session
      ? stripHtmlForSeo(
          session.description ||
            `Sesi pembelajaran ${session.title} dalam kurikulum ${course?.title || 'Dars with Osama'} khusus siswa terdaftar.`,
          160
        )
      : 'Halaman sesi video dan materi kajian khusus siswa di Dars with Osama.';

    return makeOutput({
      title: sessionTitle,
      description: sessionDesc,
      canonicalPath: session ? `/session/${encodeURIComponent(session.id)}` : '/courses',
      ogImage: course?.coverImageUrl,
      indexable: false
    });
  }

  if (view === 'consultation') {
    return makeOutput({
      title: 'Konsultasi & Tanya Ustaz | Dars with Osama',
      description: 'Ruang konsultasi syar\'i privat khusus siswa terdaftar Dars with Osama.',
      canonicalPath: '/consultation',
      indexable: false
    });
  }

  if (view === 'search') {
    const cleanQ = (searchQuery || '').trim();
    return makeOutput({
      title: cleanQ ? `Pencarian: "${cleanQ}" | Dars with Osama` : 'Pencarian Materi | Dars with Osama',
      description: 'Hasil pencarian internal kursus, artikel ilmiah, dan kitab di Dars with Osama.',
      canonicalPath: '/search',
      indexable: false
    });
  }

  if (view === 'unsubscribe') {
    return makeOutput({
      title: 'Preferensi Notifikasi | Dars with Osama',
      description: 'Pengaturan langganan notifikasi email Dars with Osama.',
      canonicalPath: '/unsubscribe',
      indexable: false
    });
  }

  // Public Indexable Routes
  if (view === 'courses') {
    const canonicalUrl = buildCanonicalUrl('/courses');
    return makeOutput({
      title: 'Katalog Pembelajaran Fikih, Ilmu Nahwu & Kajian Kitab | Dars with Osama',
      description:
        'Jelajahi katalog kursus dan syarah matan terstruktur di Dars with Osama: Fikih, Ilmu Nahwu, Aqidah, dan kajian kitab Islam bersama Ustaz Osama Nur Samsil.',
      canonicalPath: '/courses',
      indexable: isIndexableRoute('courses', { isNotFound }),
      jsonLd: [
        {
          '@type': 'CollectionPage',
          '@id': `${canonicalUrl}#webpage`,
          url: canonicalUrl,
          name: 'Katalog Pembelajaran Dars with Osama',
          description: 'Daftar lengkap kursus Fikih, Ilmu Nahwu, dan syarah kitab di Dars with Osama.',
          inLanguage: 'id-ID'
        },
        buildBreadcrumbJsonLd([
          { name: 'Beranda', url: `${CANONICAL_SITE_ORIGIN}/` },
          { name: 'Katalog Pembelajaran', url: canonicalUrl }
        ])
      ]
    });
  }

  if (view === 'course-detail') {
    if (!course) {
      return makeOutput({
        title: 'Kurikulum Pembelajaran | Dars with Osama',
        description: DEFAULT_HOME_DESCRIPTION,
        canonicalPath: '/courses',
        indexable: false
      });
    }
    const isDraft = course.isPublished === false;
    const canonicalPath = `/course/${encodeURIComponent(course.id)}`;
    const canonicalUrl = buildCanonicalUrl(canonicalPath);
    const desc =
      stripHtmlForSeo(course.description, 160) ||
      `Pelajari kurikulum dan silabus ${course.title} bersama ${course.instructor || 'Ustaz Osama Nur Samsil'} di Dars with Osama.`;

    return makeOutput({
      title: `${course.title} – Silabus & Materi | Dars with Osama`,
      description: desc,
      canonicalPath,
      ogImage: course.coverImageUrl,
      ogTitle: `${course.title} | Dars with Osama`,
      indexable: isIndexableRoute('course-detail', { isDraftOrUnpublished: isDraft, isNotFound }),
      jsonLd: [
        buildCourseJsonLd(course, canonicalUrl, category),
        buildBreadcrumbJsonLd([
          { name: 'Beranda', url: `${CANONICAL_SITE_ORIGIN}/` },
          { name: 'Katalog Pembelajaran', url: `${CANONICAL_SITE_ORIGIN}/courses` },
          { name: course.title, url: canonicalUrl }
        ])
      ]
    });
  }

  if (view === 'blog') {
    const canonicalUrl = buildCanonicalUrl('/blog');
    return makeOutput({
      title: 'Artikel Ilmiah, Fikih & Catatan Kajian Islam | Dars with Osama',
      description:
        'Baca kumpulan artikel ilmiah, faedah kitab, pembahasan Fikih, Ilmu Nahwu, dan catatan keilmuan Islam di Dars with Osama.',
      canonicalPath: '/blog',
      indexable: isIndexableRoute('blog', { isNotFound }),
      jsonLd: [
        {
          '@type': 'CollectionPage',
          '@id': `${canonicalUrl}#webpage`,
          url: canonicalUrl,
          name: 'Artikel Ilmiah & Catatan Ilmu – Dars with Osama',
          description: 'Kumpulan artikel ilmiah Fikih, Ilmu Nahwu, dan catatan kajian Islam.',
          inLanguage: 'id-ID'
        },
        buildBreadcrumbJsonLd([
          { name: 'Beranda', url: `${CANONICAL_SITE_ORIGIN}/` },
          { name: 'Artikel Ilmiah', url: canonicalUrl }
        ])
      ]
    });
  }

  if (view === 'blog-detail') {
    if (!blogPost) {
      return makeOutput({
        title: 'Artikel Tidak Ditemukan | Dars with Osama',
        description: 'Artikel ilmiah di Dars with Osama.',
        canonicalPath: '/blog',
        indexable: false
      });
    }
    const isDraft = blogPost.status !== 'published';
    const slugOrId = blogPost.slug?.trim() || blogPost.id;
    const canonicalPath = `/article/${encodeURIComponent(slugOrId)}`;
    const canonicalUrl = buildCanonicalUrl(canonicalPath);
    const desc =
      stripHtmlForSeo(blogPost.excerpt || blogPost.content, 160) ||
      `Baca artikel ilmiah "${blogPost.title}" oleh ${blogPost.authorName || 'Ustaz Osama Nur Samsil'} di Dars with Osama.`;

    return makeOutput({
      title: `${blogPost.title} | Dars with Osama`,
      description: desc,
      canonicalPath,
      ogType: 'article',
      ogTitle: blogPost.title,
      ogImage: blogPost.coverImageUrl,
      indexable: isIndexableRoute('blog-detail', { isDraftOrUnpublished: isDraft, isNotFound }),
      jsonLd: [
        buildArticleJsonLd(blogPost, canonicalUrl),
        buildBreadcrumbJsonLd([
          { name: 'Beranda', url: `${CANONICAL_SITE_ORIGIN}/` },
          { name: 'Artikel Ilmiah', url: `${CANONICAL_SITE_ORIGIN}/blog` },
          { name: blogPost.title, url: canonicalUrl }
        ])
      ]
    });
  }

  if (view === 'library') {
    const canonicalUrl = buildCanonicalUrl('/library');
    return makeOutput({
      title: 'Perpustakaan Digital Kitab & Naskah Islam | Dars with Osama',
      description:
        'Akses perpustakaan digital Dars with Osama: koleksi kitab Fikih, Ilmu Nahwu, matan klasik, dan buku rujukan Islam dalam format pembaca internal dan PDF.',
      canonicalPath: '/library',
      indexable: isIndexableRoute('library', { isNotFound }),
      jsonLd: [
        {
          '@type': 'CollectionPage',
          '@id': `${canonicalUrl}#webpage`,
          url: canonicalUrl,
          name: 'Library Digital – Dars with Osama',
          description: 'Koleksi kitab dan naskah digital kajian Islam di Dars with Osama.',
          inLanguage: 'id-ID'
        },
        buildBreadcrumbJsonLd([
          { name: 'Beranda', url: `${CANONICAL_SITE_ORIGIN}/` },
          { name: 'Library Digital', url: canonicalUrl }
        ])
      ]
    });
  }

  if (view === 'library-detail') {
    if (!libraryBook) {
      return makeOutput({
        title: 'Kitab Tidak Ditemukan | Library Digital Dars with Osama',
        description: 'Koleksi perpustakaan digital Dars with Osama.',
        canonicalPath: '/library',
        indexable: false
      });
    }
    const isDraft = libraryBook.status !== 'published';
    const slugOrId = libraryBook.slug?.trim() || libraryBook.id;
    const canonicalPath = `/library/${encodeURIComponent(slugOrId)}`;
    const canonicalUrl = buildCanonicalUrl(canonicalPath);
    const authorSuffix = libraryBook.author?.trim() ? ` karya ${libraryBook.author.trim()}` : '';
    const desc =
      stripHtmlForSeo(libraryBook.description, 160) ||
      `Baca dan pelajari kitab ${libraryBook.title}${authorSuffix} di Library Digital Dars with Osama.`;

    return makeOutput({
      title: `${libraryBook.title} – Library Digital | Dars with Osama`,
      description: desc,
      canonicalPath,
      ogType: 'book',
      ogTitle: libraryBook.title,
      ogImage: libraryBook.coverImageUrl,
      indexable: isIndexableRoute('library-detail', { isDraftOrUnpublished: isDraft, isNotFound }),
      jsonLd: [
        buildBookJsonLd(libraryBook, canonicalUrl),
        buildBreadcrumbJsonLd([
          { name: 'Beranda', url: `${CANONICAL_SITE_ORIGIN}/` },
          { name: 'Library Digital', url: `${CANONICAL_SITE_ORIGIN}/library` },
          { name: libraryBook.title, url: canonicalUrl }
        ])
      ]
    });
  }

  if (view === 'library-read') {
    if (!libraryBook) {
      return makeOutput({
        title: 'Pembaca Kitab | Library Digital Dars with Osama',
        description: 'Pembaca naskah kitab digital Dars with Osama.',
        canonicalPath: '/library',
        indexable: false
      });
    }
    const isBookDraft = libraryBook.status !== 'published';
    const isVolDraft = Boolean(libraryVolume && libraryVolume.status !== 'published');
    const slugOrId = libraryBook.slug?.trim() || libraryBook.id;
    const canonicalPath = libraryVolume
      ? `/library/${encodeURIComponent(slugOrId)}/jilid/${encodeURIComponent(libraryVolume.id)}`
      : `/library/${encodeURIComponent(slugOrId)}/baca`;
    const canonicalUrl = buildCanonicalUrl(canonicalPath);
    const volLabel = libraryVolume
      ? libraryVolume.title?.trim() || `Jilid ${libraryVolume.volumeNumber}`
      : 'Baca Naskah';
    const desc =
      stripHtmlForSeo(
        libraryBook.description || libraryVolume?.content || libraryBook.content,
        160
      ) || `Baca ${libraryBook.title} (${volLabel}) secara online di Library Digital Dars with Osama.`;

    return makeOutput({
      title: `${libraryBook.title} – ${volLabel} | Dars with Osama`,
      description: desc,
      canonicalPath,
      ogType: 'book',
      ogTitle: `${libraryBook.title} – ${volLabel}`,
      ogImage: libraryBook.coverImageUrl,
      indexable: isIndexableRoute('library-read', {
        isDraftOrUnpublished: isBookDraft || isVolDraft,
        isNotFound
      }),
      jsonLd: [
        buildBookJsonLd(libraryBook, canonicalUrl, libraryVolume),
        buildBreadcrumbJsonLd([
          { name: 'Beranda', url: `${CANONICAL_SITE_ORIGIN}/` },
          { name: 'Library Digital', url: `${CANONICAL_SITE_ORIGIN}/library` },
          { name: libraryBook.title, url: buildCanonicalUrl(`/library/${encodeURIComponent(slugOrId)}`) },
          { name: volLabel, url: canonicalUrl }
        ])
      ]
    });
  }

  if (view === 'public-qa') {
    if (qaItem) {
      const isDraft = qaItem.isPublished !== true;
      const canonicalPath = `/qa/${encodeURIComponent(qaItem.id)}`;
      const canonicalUrl = buildCanonicalUrl(canonicalPath);
      const qSnippet = stripHtmlForSeo(qaItem.content, 115);
      const desc = qSnippet
        ? `Pertanyaan: "${qSnippet}" — Simak jawaban syar'i dari Ustaz Osama Nur Samsil di Dars with Osama.`
        : `Tanya jawab syar'i tentang ${qaItem.title} bersama Ustaz Osama Nur Samsil di Dars with Osama.`;

      return makeOutput({
        title: `${qaItem.title} | Tanya Jawab Dars with Osama`,
        description: desc,
        canonicalPath,
        ogType: 'article',
        ogTitle: qaItem.title,
        indexable: isIndexableRoute('public-qa', { isDraftOrUnpublished: isDraft, isNotFound }),
        jsonLd: [
          buildQaJsonLd(qaItem, canonicalUrl),
          buildBreadcrumbJsonLd([
            { name: 'Beranda', url: `${CANONICAL_SITE_ORIGIN}/` },
            { name: 'Tanya Jawab Syar\'i', url: `${CANONICAL_SITE_ORIGIN}/tanya-jawab` },
            { name: qaItem.title, url: canonicalUrl }
          ])
        ]
      });
    }

    const canonicalUrl = buildCanonicalUrl('/tanya-jawab');
    return makeOutput({
      title: 'Tanya Jawab Syar\'i, Fikih & Pembelajaran | Dars with Osama',
      description:
        'Arsip tanya jawab syar\'i seputar Fikih, Ilmu Nahwu, ibadah, dan keilmuan Islam yang dijawab langsung oleh Ustaz Osama Nur Samsil.',
      canonicalPath: '/tanya-jawab',
      indexable: isIndexableRoute('public-qa', { isNotFound }),
      jsonLd: [
        {
          '@type': 'CollectionPage',
          '@id': `${canonicalUrl}#webpage`,
          url: canonicalUrl,
          name: 'Tanya Jawab Syar\'i – Dars with Osama',
          description: 'Arsip tanya jawab publik seputar Fikih dan kajian Islam di Dars with Osama.',
          inLanguage: 'id-ID'
        },
        buildBreadcrumbJsonLd([
          { name: 'Beranda', url: `${CANONICAL_SITE_ORIGIN}/` },
          { name: 'Tanya Jawab Syar\'i', url: canonicalUrl }
        ])
      ]
    });
  }

  if (view === 'instructor-profile') {
    const fullName = instructorProfile?.fullName?.trim() || 'Ustaz Osama Nur Samsil';
    const canonicalUrl = buildCanonicalUrl('/profil-pengajar');
    const desc =
      stripHtmlForSeo(instructorProfile?.shortBio, 160) ||
      `Profil pengajar ${fullName} di Dars with Osama: latar belakang pendidikan, bidang keahlian Fikih & Ilmu Nahwu, serta tautan portofolio resmi.`;

    return makeOutput({
      title: `Profil Pengajar – ${fullName} | Dars with Osama`,
      description: desc,
      canonicalPath: '/profil-pengajar',
      ogType: 'profile',
      ogTitle: `Profil Pengajar – ${fullName}`,
      ogImage: instructorProfile?.photoUrl || DEFAULT_OG_IMAGE,
      indexable: isIndexableRoute('instructor-profile', { isNotFound }),
      jsonLd: [
        buildPersonJsonLd(instructorProfile),
        buildBreadcrumbJsonLd([
          { name: 'Beranda', url: `${CANONICAL_SITE_ORIGIN}/` },
          { name: 'Profil Pengajar', url: canonicalUrl }
        ])
      ]
    });
  }

  // Default: Home (or unrecognized path -> noindex protection against soft 404)
  const homeIndexable = isIndexableRoute('home', { pathname, isNotFound });
  return makeOutput({
    title: DEFAULT_HOME_TITLE,
    description: DEFAULT_HOME_DESCRIPTION,
    canonicalPath: '/',
    indexable: homeIndexable,
    jsonLd: [buildWebsiteJsonLd()]
  });
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const DISALLOWED_SITEMAP_PATH_PREFIXES = [
  '/admin',
  '/student',
  '/session',
  '/quiz',
  '/consultation',
  '/konsultasi',
  '/search',
  '/unsubscribe',
  '/preferences',
  '/login',
  '/register'
];

/**
 * Validates whether a URL is allowed in sitemap.xml:
 * - Strictly HTTPS on https://darswithosama.netlify.app
 * - Zero query parameters or hash fragments
 * - Zero private, admin, student, session, search, or auth paths
 */
export function isValidPublicSitemapUrl(url: string): boolean {
  const trimmed = (url || '').trim();
  if (!trimmed.startsWith(`${CANONICAL_SITE_ORIGIN}/`)) return false;
  if (trimmed.includes('?') || trimmed.includes('#')) return false;

  const path = trimmed.slice(CANONICAL_SITE_ORIGIN.length) || '/';
  const lower = path.toLowerCase();
  for (const forbidden of DISALLOWED_SITEMAP_PATH_PREFIXES) {
    if (lower === forbidden || lower.startsWith(`${forbidden}/`)) {
      return false;
    }
  }
  return true;
}

/**
 * Generates a strictly valid XML Sitemap (sitemaps.org 0.9) for Dars with Osama.
 * - Deduplicates URLs
 * - Filters out any non-canonical, query, or private URLs
 * - Includes <lastmod> ONLY when a real, valid timestamp is supplied
 */
export function buildSitemapXml(entries: SitemapEntry[]): string {
  const seen = new Set<string>();
  const urlBlocks: string[] = [];

  for (const entry of entries) {
    const normalizedLoc = buildCanonicalUrl(entry.loc);
    if (!isValidPublicSitemapUrl(normalizedLoc)) continue;
    if (seen.has(normalizedLoc)) continue;
    seen.add(normalizedLoc);

    const validLastmod = toValidIsoDate(entry.lastmod);
    const lines: string[] = [
      '  <url>',
      `    <loc>${escapeXml(normalizedLoc)}</loc>`
    ];
    if (validLastmod) {
      lines.push(`    <lastmod>${escapeXml(validLastmod)}</lastmod>`);
    }
    if (entry.changefreq) {
      lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    }
    if (typeof entry.priority === 'number' && entry.priority >= 0 && entry.priority <= 1) {
      lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
    }
    lines.push('  </url>');
    urlBlocks.push(lines.join('\n'));
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urlBlocks,
    '</urlset>',
    ''
  ].join('\n');
}

/**
 * Generates the official robots.txt for https://darswithosama.netlify.app/robots.txt.
 * Allows all public pages and static assets (CSS/JS/images), blocks private/internal routes,
 * and references the canonical sitemap.xml URL.
 */
export function buildRobotsTxt(): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /student',
    'Disallow: /consultation',
    'Disallow: /konsultasi',
    'Disallow: /unsubscribe',
    'Disallow: /preferences',
    'Disallow: /search',
    '',
    `Sitemap: ${CANONICAL_SITE_ORIGIN}/sitemap.xml`,
    ''
  ].join('\n');
}
