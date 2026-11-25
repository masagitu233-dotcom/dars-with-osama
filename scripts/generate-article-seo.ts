import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getCategories,
  getCourses,
  getSessionsByCourse,
  getBlogPosts,
  getPublishedPublicQA,
  getLibraryBooks,
  getLibraryBookVolumes
} from '../src/firebase/services';
import { fetchPortfolioInstructorProfile } from '../src/firebase/portfolioProfileService';
import {
  buildSessionMetaTagsHtml,
  canAccessSessionPublicly,
  generateSessionSlug
} from '../src/utils/sessionShareHelper';
import { isDummySeedBlogPost } from '../src/utils/dataAuditHelper';
import { isMultiVolumeLibraryBook } from '../src/utils/libraryHelper';
import {
  CANONICAL_SITE_ORIGIN,
  PRIVATE_ROBOTS_DIRECTIVE,
  PageSeoOutput,
  SitemapEntry,
  buildPageSeoMetadata,
  buildRobotsTxt,
  buildSitemapXml,
  stripHtmlForSeo,
  toValidIsoDate
} from '../src/utils/seoConfig';
import {
  BlogPost,
  Category,
  Consultation,
  Course,
  LibraryBook,
  LibraryBookVolume,
  Session
} from '../src/types';
import { PortfolioInstructorSummary } from '../src/utils/portfolioProfileHelper';
import {
  PRODUCTION_BLOG_POSTS,
  PRODUCTION_CONSULTATIONS,
  PRODUCTION_COURSES,
  PRODUCTION_SESSIONS
} from '../src/data/productionCache';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function escapeHtmlAttr(val: string): string {
  return (val || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(val: string): string {
  return (val || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderHeadSeoBlock(seo: PageSeoOutput): string {
  const lines: string[] = [
    `<title>${escapeHtmlText(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtmlAttr(seo.description)}" />`,
    `<meta name="robots" content="${escapeHtmlAttr(seo.robots)}" />`,
    `<meta name="googlebot" content="${escapeHtmlAttr(seo.robots)}" />`,
    `<link rel="canonical" href="${escapeHtmlAttr(seo.canonicalUrl)}" />`,
    `<meta property="og:type" content="${escapeHtmlAttr(seo.ogType)}" />`,
    `<meta property="og:site_name" content="${escapeHtmlAttr(seo.ogSiteName)}" />`,
    `<meta property="og:locale" content="${escapeHtmlAttr(seo.ogLocale)}" />`,
    `<meta property="og:title" content="${escapeHtmlAttr(seo.ogTitle)}" />`,
    `<meta property="og:description" content="${escapeHtmlAttr(seo.ogDescription)}" />`,
    `<meta property="og:image" content="${escapeHtmlAttr(seo.ogImage)}" />`,
    `<meta property="og:url" content="${escapeHtmlAttr(seo.ogUrl)}" />`,
    `<meta name="twitter:card" content="${escapeHtmlAttr(seo.twitterCard)}" />`,
    `<meta name="twitter:title" content="${escapeHtmlAttr(seo.twitterTitle)}" />`,
    `<meta name="twitter:description" content="${escapeHtmlAttr(seo.twitterDescription)}" />`,
    `<meta name="twitter:image" content="${escapeHtmlAttr(seo.twitterImage)}" />`
  ];

  const gscToken = (process.env.VITE_GOOGLE_SITE_VERIFICATION || '').trim();
  if (gscToken) {
    lines.push(
      `<meta name="google-site-verification" content="${escapeHtmlAttr(gscToken)}" />`
    );
  }

  if (seo.jsonLd.length > 0) {
    const payload =
      seo.jsonLd.length === 1
        ? { '@context': 'https://schema.org', ...seo.jsonLd[0] }
        : { '@context': 'https://schema.org', '@graph': seo.jsonLd };
    const safeJson = JSON.stringify(payload).replace(/<\/script>/gi, '<\\/script>');
    lines.push(`<script id="dars-seo-jsonld" type="application/ld+json">${safeJson}</script>`);
  }

  return lines.join('\n    ');
}

function injectFullSeoAndNoscript(
  baseHtml: string,
  headTags: string,
  noscriptHtml?: string
): string {
  let result = baseHtml
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\s+name=["']description["'][^>]*\/?>/gi, '')
    .replace(/<meta\s+name=["']robots["'][^>]*\/?>/gi, '')
    .replace(/<meta\s+name=["']googlebot["'][^>]*\/?>/gi, '')
    .replace(/<meta\s+name=["']google-site-verification["'][^>]*\/?>/gi, '')
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*\/?>/gi, '')
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*\/?>/gi, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*\/?>/gi, '')
    .replace(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');

  if (result.includes('</head>')) {
    result = result.replace('</head>', `    ${headTags}\n  </head>`);
  } else {
    result = `${headTags}\n${result}`;
  }

  if (noscriptHtml) {
    const block = `<noscript>\n      <main style="max-width:960px;margin:2rem auto;padding:1.5rem;font-family:sans-serif;line-height:1.6;">\n${noscriptHtml}\n      </main>\n    </noscript>`;
    if (/<noscript>[\s\S]*?<\/noscript>/i.test(result)) {
      result = result.replace(/<noscript>[\s\S]*?<\/noscript>/i, block);
    } else if (result.includes('<div id="root"></div>')) {
      result = result.replace('<div id="root"></div>', `<div id="root"></div>\n    ${block}`);
    }
  }

  return result;
}

function writeStaticRoute(distPath: string, routePath: string, html: string) {
  const clean = routePath.replace(/^\/+/, '').replace(/\/+$/, '');
  const targetFile = clean
    ? path.join(distPath, clean, 'index.html')
    : path.join(distPath, 'index.html');
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.writeFileSync(targetFile, html, 'utf-8');
}

function buildNavFooterHtml(): string {
  return `<nav aria-label="Navigasi Utama Dars with Osama"><ul>
          <li><a href="${CANONICAL_SITE_ORIGIN}/">Beranda</a></li>
          <li><a href="${CANONICAL_SITE_ORIGIN}/courses">Katalog Pembelajaran</a></li>
          <li><a href="${CANONICAL_SITE_ORIGIN}/blog">Artikel Ilmiah</a></li>
          <li><a href="${CANONICAL_SITE_ORIGIN}/library">Library Digital</a></li>
          <li><a href="${CANONICAL_SITE_ORIGIN}/tanya-jawab">Tanya Jawab Syar'i</a></li>
          <li><a href="${CANONICAL_SITE_ORIGIN}/profil-pengajar">Profil Pengajar</a></li>
        </ul></nav>`;
}

async function generateAllSeoAssets() {
  const distPath = path.resolve(__dirname, '../dist');
  const publicPath = path.resolve(__dirname, '../public');
  const templatePath = path.join(distPath, 'index.html');

  const hasDistTemplate = fs.existsSync(templatePath);
  const baseHtml = hasDistTemplate ? fs.readFileSync(templatePath, 'utf-8') : '';

  // 1. Fetch categories & courses (live Firestore or authentic production snapshot fallback)
  let categories: Category[] = [];
  try {
    categories = await withTimeout(getCategories(), 4000);
  } catch {
    categories = [];
  }
  const categoryById = new Map<string, Category>(categories.map((c) => [c.id, c]));

  const coursesMap = new Map<string, Course>();
  const sessionsByCourseMap = new Map<string, Session[]>();

  try {
    const liveCourses = await withTimeout(getCourses(false), 5000);
    for (const c of liveCourses) {
      if (!c.isPublished) continue;
      coursesMap.set(c.id, c);

      if (c.coverImageUrl && c.coverImageUrl.startsWith('data:image/')) {
        const match = c.coverImageUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (match) {
          const buf = Buffer.from(match[2], 'base64');
          fs.mkdirSync(path.join(publicPath, 'covers'), { recursive: true });
          fs.writeFileSync(path.join(publicPath, 'covers', `${c.id}.jpg`), buf);
          if (hasDistTemplate) {
            fs.mkdirSync(path.join(distPath, 'covers'), { recursive: true });
            fs.writeFileSync(path.join(distPath, 'covers', `${c.id}.jpg`), buf);
          }
        }
      }

      try {
        const liveSessions = await withTimeout(getSessionsByCourse(c.id, false), 4000);
        sessionsByCourseMap.set(c.id, liveSessions.filter((s) => s.isPublished));
      } catch {
        sessionsByCourseMap.set(c.id, []);
      }
    }
  } catch {
    // Fallback below
  }

  if (coursesMap.size === 0) {
    for (const c of PRODUCTION_COURSES) {
      if (!c.isPublished) continue;
      coursesMap.set(c.id, c);

      if (c.coverImageUrl && c.coverImageUrl.startsWith('data:image/')) {
        const match = c.coverImageUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (match) {
          const buf = Buffer.from(match[2], 'base64');
          fs.mkdirSync(path.join(publicPath, 'covers'), { recursive: true });
          fs.writeFileSync(path.join(publicPath, 'covers', `${c.id}.jpg`), buf);
          if (hasDistTemplate) {
            fs.mkdirSync(path.join(distPath, 'covers'), { recursive: true });
            fs.writeFileSync(path.join(distPath, 'covers', `${c.id}.jpg`), buf);
          }
        }
      }

      const cSessions = PRODUCTION_SESSIONS.filter((s) => s.courseId === c.id && s.isPublished);
      sessionsByCourseMap.set(c.id, cSessions);
    }
  }

  // 2. Fetch published blog posts
  const publishedPostsMap = new Map<string, BlogPost>();
  try {
    const livePosts = await withTimeout(getBlogPosts(false), 5000);
    for (const lp of livePosts) {
      if (lp.status === 'published' && !isDummySeedBlogPost(lp)) {
        publishedPostsMap.set(lp.id, lp);
      }
    }
  } catch {
    // Fallback below
  }

  if (publishedPostsMap.size === 0) {
    for (const lp of PRODUCTION_BLOG_POSTS) {
      if (lp.status === 'published' && !isDummySeedBlogPost(lp)) {
        publishedPostsMap.set(lp.id, lp);
      }
    }
  }

  // 3. Fetch published Library Books & published volumes for multi-volume books
  const publishedBooks: LibraryBook[] = [];
  const publishedVolumesByBookId = new Map<string, LibraryBookVolume[]>();
  try {
    const liveBooks = await withTimeout(getLibraryBooks(false), 5000);
    for (const book of liveBooks) {
      if (book.status !== 'published') continue;
      publishedBooks.push(book);
      if (isMultiVolumeLibraryBook(book)) {
        try {
          const vols = await withTimeout(getLibraryBookVolumes(book.id, false), 4000);
          publishedVolumesByBookId.set(
            book.id,
            vols.filter((v) => v.status === 'published')
          );
        } catch {
          publishedVolumesByBookId.set(book.id, []);
        }
      }
    }
  } catch {
    // Library remains empty if unreachable
  }

  // 4. Fetch published public Q&A
  let publishedQAs: Consultation[] = [];
  try {
    const liveQAs = await withTimeout(getPublishedPublicQA(), 5000);
    publishedQAs = liveQAs.filter((qa) => qa.isPublished === true);
  } catch {
    // Fallback below
  }

  if (publishedQAs.length === 0) {
    publishedQAs = PRODUCTION_CONSULTATIONS.filter(
      (qa) => qa.category === 'learning' && qa.isPublished === true
    );
  }

  // 5. Fetch real public instructor profile from portfolio Firestore (read-only)
  let instructorProfile: PortfolioInstructorSummary | null = null;
  try {
    instructorProfile = await withTimeout(fetchPortfolioInstructorProfile(), 5000);
  } catch {
    instructorProfile = null;
  }

  // =========================================================================
  // BUILD SITEMAP ENTRIES (STRICTLY PUBLIC PUBLISHED PAGES ONLY)
  // =========================================================================
  const sitemapEntries: SitemapEntry[] = [
    { loc: '/', changefreq: 'daily', priority: 1.0 },
    { loc: '/courses', changefreq: 'weekly', priority: 0.9 },
    { loc: '/blog', changefreq: 'daily', priority: 0.9 },
    { loc: '/library', changefreq: 'weekly', priority: 0.9 },
    { loc: '/tanya-jawab', changefreq: 'weekly', priority: 0.8 },
    { loc: '/profil-pengajar', changefreq: 'monthly', priority: 0.8 }
  ];

  for (const course of coursesMap.values()) {
    sitemapEntries.push({
      loc: `/course/${encodeURIComponent(course.id)}`,
      lastmod: toValidIsoDate(course.updatedAt || course.createdAt),
      changefreq: 'weekly',
      priority: 0.8
    });
  }

  for (const post of publishedPostsMap.values()) {
    const slugOrId = post.slug?.trim() || post.id;
    sitemapEntries.push({
      loc: `/article/${encodeURIComponent(slugOrId)}`,
      lastmod: toValidIsoDate(post.updatedAt || post.publishedAt || post.createdAt),
      changefreq: 'monthly',
      priority: 0.8
    });
  }

  for (const book of publishedBooks) {
    const slugOrId = book.slug?.trim() || book.id;
    sitemapEntries.push({
      loc: `/library/${encodeURIComponent(slugOrId)}`,
      lastmod: toValidIsoDate(book.updatedAt || book.publishedAt || book.createdAt),
      changefreq: 'monthly',
      priority: 0.8
    });

    if (isMultiVolumeLibraryBook(book)) {
      const vols = publishedVolumesByBookId.get(book.id) || [];
      for (const vol of vols) {
        if (vol.status === 'published' && vol.sourceType === 'internal') {
          sitemapEntries.push({
            loc: `/library/${encodeURIComponent(slugOrId)}/jilid/${encodeURIComponent(vol.id)}`,
            lastmod: toValidIsoDate(vol.updatedAt || vol.publishedAt || vol.createdAt),
            changefreq: 'monthly',
            priority: 0.7
          });
        }
      }
    } else if (book.sourceType === 'internal') {
      sitemapEntries.push({
        loc: `/library/${encodeURIComponent(slugOrId)}/baca`,
        lastmod: toValidIsoDate(book.updatedAt || book.publishedAt || book.createdAt),
        changefreq: 'monthly',
        priority: 0.7
      });
    }
  }

  for (const qa of publishedQAs) {
    sitemapEntries.push({
      loc: `/qa/${encodeURIComponent(qa.id)}`,
      lastmod: toValidIsoDate(qa.publishedAt || qa.repliedAt || qa.createdAt),
      changefreq: 'monthly',
      priority: 0.7
    });
  }

  // Write robots.txt and sitemap.xml to BOTH public/ and dist/
  const robotsTxt = buildRobotsTxt();
  const sitemapXml = buildSitemapXml(sitemapEntries);

  fs.mkdirSync(publicPath, { recursive: true });
  fs.writeFileSync(path.join(publicPath, 'robots.txt'), robotsTxt, 'utf-8');
  fs.writeFileSync(path.join(publicPath, 'sitemap.xml'), sitemapXml, 'utf-8');

  if (hasDistTemplate) {
    fs.writeFileSync(path.join(distPath, 'robots.txt'), robotsTxt, 'utf-8');
    fs.writeFileSync(path.join(distPath, 'sitemap.xml'), sitemapXml, 'utf-8');
  }

  if (!hasDistTemplate) {
    console.log(
      `[SEO] Generated public/robots.txt and public/sitemap.xml (${sitemapEntries.length} public URLs). dist/index.html not present yet.`
    );
    return;
  }

  // =========================================================================
  // PRERENDER STATIC HTML FOR PUBLIC ROUTES IN dist/
  // =========================================================================
  let staticPagesCount = 0;

  // A. Home Page (dist/index.html)
  const homeSeo = buildPageSeoMetadata({ view: 'home' });
  const homeLinks = [
    ...Array.from(coursesMap.values()).map(
      (c) => `<li><a href="${CANONICAL_SITE_ORIGIN}/course/${encodeURIComponent(c.id)}">${escapeHtmlText(c.title)}</a></li>`
    ),
    ...Array.from(publishedPostsMap.values()).slice(0, 12).map(
      (p) => `<li><a href="${CANONICAL_SITE_ORIGIN}/article/${encodeURIComponent(p.slug || p.id)}">${escapeHtmlText(p.title)}</a></li>`
    ),
    ...publishedBooks.slice(0, 12).map(
      (b) => `<li><a href="${CANONICAL_SITE_ORIGIN}/library/${encodeURIComponent(b.slug || b.id)}">${escapeHtmlText(b.title)}</a></li>`
    )
  ].join('\n');

  const homeHtml = injectFullSeoAndNoscript(
    baseHtml,
    renderHeadSeoBlock(homeSeo),
    `        <h1>${escapeHtmlText(homeSeo.title)}</h1>
        <p>${escapeHtmlText(homeSeo.description)}</p>
        ${buildNavFooterHtml()}
        ${homeLinks ? `<section><h2>Konten Publik Terbaru</h2><ul>${homeLinks}</ul></section>` : ''}`
  );
  writeStaticRoute(distPath, '', homeHtml);
  staticPagesCount++;

  // B. Course Catalog (/courses) & Course Detail (/course/:id)
  const coursesSeo = buildPageSeoMetadata({ view: 'courses' });
  const coursesListHtml = Array.from(coursesMap.values())
    .map(
      (c) =>
        `<li><a href="${CANONICAL_SITE_ORIGIN}/course/${encodeURIComponent(c.id)}">${escapeHtmlText(c.title)}</a> – ${escapeHtmlText(stripHtmlForSeo(c.description, 160))}</li>`
    )
    .join('\n');
  writeStaticRoute(
    distPath,
    'courses',
    injectFullSeoAndNoscript(
      baseHtml,
      renderHeadSeoBlock(coursesSeo),
      `        <h1>Katalog Pembelajaran – Dars with Osama</h1>
        <p>${escapeHtmlText(coursesSeo.description)}</p>
        <ul>${coursesListHtml}</ul>
        ${buildNavFooterHtml()}`
    )
  );
  staticPagesCount++;

  for (const course of coursesMap.values()) {
    const normalizedCourse: Course = {
      ...course,
      coverImageUrl: course.coverImageUrl?.startsWith('data:image/')
        ? `${CANONICAL_SITE_ORIGIN}/covers/${course.id}.jpg`
        : course.coverImageUrl
    };
    const courseSeo = buildPageSeoMetadata({
      view: 'course-detail',
      course: normalizedCourse,
      category: categoryById.get(course.categoryId) || null
    });
    const sessions = sessionsByCourseMap.get(course.id) || [];
    const syllabusItems = sessions
      .map((s, idx) => `<li>Sesi ${s.order || idx + 1}: ${escapeHtmlText(s.title)}</li>`)
      .join('\n');

    writeStaticRoute(
      distPath,
      `course/${course.id}`,
      injectFullSeoAndNoscript(
        baseHtml,
        renderHeadSeoBlock(courseSeo),
        `        <h1>${escapeHtmlText(course.title)}</h1>
        <p>${escapeHtmlText(stripHtmlForSeo(course.description, 500))}</p>
        <p>Pengajar: ${escapeHtmlText(course.instructor || 'Ustaz Osama Nur Samsil')}</p>
        ${syllabusItems ? `<section><h2>Silabus & Daftar Sesi</h2><ol>${syllabusItems}</ol></section>` : ''}
        ${buildNavFooterHtml()}`
      )
    );
    staticPagesCount++;
  }

  // C. Blog Catalog (/blog) & Article Detail (/article/:slug and /article/:id)
  const blogSeo = buildPageSeoMetadata({ view: 'blog' });
  const blogListHtml = Array.from(publishedPostsMap.values())
    .map(
      (p) =>
        `<li><a href="${CANONICAL_SITE_ORIGIN}/article/${encodeURIComponent(p.slug || p.id)}">${escapeHtmlText(p.title)}</a> – ${escapeHtmlText(stripHtmlForSeo(p.excerpt || p.content, 160))}</li>`
    )
    .join('\n');
  writeStaticRoute(
    distPath,
    'blog',
    injectFullSeoAndNoscript(
      baseHtml,
      renderHeadSeoBlock(blogSeo),
      `        <h1>Artikel Ilmiah & Catatan Kajian Islam – Dars with Osama</h1>
        <p>${escapeHtmlText(blogSeo.description)}</p>
        <ul>${blogListHtml}</ul>
        ${buildNavFooterHtml()}`
    )
  );
  staticPagesCount++;

  for (const post of publishedPostsMap.values()) {
    const postSeo = buildPageSeoMetadata({ view: 'blog-detail', blogPost: post });
    const bodyExcerpt = stripHtmlForSeo(post.content || post.excerpt, 1800);
    const articleHtml = injectFullSeoAndNoscript(
      baseHtml,
      renderHeadSeoBlock(postSeo),
      `        <article>
          <h1>${escapeHtmlText(post.title)}</h1>
          <p>Oleh ${escapeHtmlText(post.authorName || 'Ustaz Osama Nur Samsil')}</p>
          <p>${escapeHtmlText(bodyExcerpt)}</p>
        </article>
        ${buildNavFooterHtml()}`
    );

    if (post.slug?.trim()) {
      writeStaticRoute(distPath, `article/${post.slug.trim()}`, articleHtml);
      staticPagesCount++;
    }
    if (post.id && post.id !== post.slug?.trim()) {
      writeStaticRoute(distPath, `article/${post.id}`, articleHtml);
      staticPagesCount++;
    }
  }

  // D. Library Catalog (/library), Book Detail (/library/:slug), and Internal Readers
  const librarySeo = buildPageSeoMetadata({ view: 'library' });
  const libraryListHtml = publishedBooks
    .map(
      (b) =>
        `<li><a href="${CANONICAL_SITE_ORIGIN}/library/${encodeURIComponent(b.slug || b.id)}">${escapeHtmlText(b.title)}</a>${b.author ? ` – ${escapeHtmlText(b.author)}` : ''}</li>`
    )
    .join('\n');
  writeStaticRoute(
    distPath,
    'library',
    injectFullSeoAndNoscript(
      baseHtml,
      renderHeadSeoBlock(librarySeo),
      `        <h1>Library Digital – Dars with Osama</h1>
        <p>${escapeHtmlText(librarySeo.description)}</p>
        <ul>${libraryListHtml}</ul>
        ${buildNavFooterHtml()}`
    )
  );
  staticPagesCount++;

  for (const book of publishedBooks) {
    const slugOrId = book.slug?.trim() || book.id;
    const bookSeo = buildPageSeoMetadata({ view: 'library-detail', libraryBook: book });
    const vols = publishedVolumesByBookId.get(book.id) || [];
    const volLinks = vols
      .filter((v) => v.sourceType === 'internal')
      .map(
        (v) =>
          `<li><a href="${CANONICAL_SITE_ORIGIN}/library/${encodeURIComponent(slugOrId)}/jilid/${encodeURIComponent(v.id)}">${escapeHtmlText(v.title || `Jilid ${v.volumeNumber}`)}</a></li>`
      )
      .join('\n');
    const singleReadLink =
      !isMultiVolumeLibraryBook(book) && book.sourceType === 'internal'
        ? `<p><a href="${CANONICAL_SITE_ORIGIN}/library/${encodeURIComponent(slugOrId)}/baca">Baca Naskah Lengkap</a></p>`
        : '';

    const detailHtml = injectFullSeoAndNoscript(
      baseHtml,
      renderHeadSeoBlock(bookSeo),
      `        <article>
          <h1>${escapeHtmlText(book.title)}</h1>
          ${book.author ? `<p>Penulis: ${escapeHtmlText(book.author)}</p>` : ''}
          <p>${escapeHtmlText(stripHtmlForSeo(book.description, 800))}</p>
          ${singleReadLink}
          ${volLinks ? `<section><h2>Daftar Jilid</h2><ul>${volLinks}</ul></section>` : ''}
        </article>
        ${buildNavFooterHtml()}`
    );
    writeStaticRoute(distPath, `library/${slugOrId}`, detailHtml);
    staticPagesCount++;

    if (isMultiVolumeLibraryBook(book)) {
      for (const vol of vols) {
        if (vol.status !== 'published' || vol.sourceType !== 'internal') continue;
        const volSeo = buildPageSeoMetadata({
          view: 'library-read',
          libraryBook: book,
          libraryVolume: vol
        });
        const volText = stripHtmlForSeo(vol.content || book.description, 1600);
        writeStaticRoute(
          distPath,
          `library/${slugOrId}/jilid/${vol.id}`,
          injectFullSeoAndNoscript(
            baseHtml,
            renderHeadSeoBlock(volSeo),
            `        <article>
          <h1>${escapeHtmlText(book.title)} – ${escapeHtmlText(vol.title || `Jilid ${vol.volumeNumber}`)}</h1>
          <p>${escapeHtmlText(volText)}</p>
        </article>
        ${buildNavFooterHtml()}`
          )
        );
        staticPagesCount++;
      }
    } else if (book.sourceType === 'internal') {
      const readSeo = buildPageSeoMetadata({ view: 'library-read', libraryBook: book });
      const bookText = stripHtmlForSeo(book.content || book.description, 1600);
      writeStaticRoute(
        distPath,
        `library/${slugOrId}/baca`,
        injectFullSeoAndNoscript(
          baseHtml,
          renderHeadSeoBlock(readSeo),
          `        <article>
          <h1>${escapeHtmlText(book.title)}</h1>
          <p>${escapeHtmlText(bookText)}</p>
        </article>
        ${buildNavFooterHtml()}`
        )
      );
      staticPagesCount++;
    }
  }

  // E. Public Q&A Archive (/tanya-jawab) & Individual Q&A (/qa/:id & /tanya-jawab/:id)
  const qaListSeo = buildPageSeoMetadata({ view: 'public-qa' });
  const qaListItems = publishedQAs
    .map(
      (qa) =>
        `<li><a href="${CANONICAL_SITE_ORIGIN}/qa/${encodeURIComponent(qa.id)}">${escapeHtmlText(qa.title)}</a></li>`
    )
    .join('\n');
  writeStaticRoute(
    distPath,
    'tanya-jawab',
    injectFullSeoAndNoscript(
      baseHtml,
      renderHeadSeoBlock(qaListSeo),
      `        <h1>Tanya Jawab Syar'i – Dars with Osama</h1>
        <p>${escapeHtmlText(qaListSeo.description)}</p>
        <ul>${qaListItems}</ul>
        ${buildNavFooterHtml()}`
    )
  );
  staticPagesCount++;

  for (const qa of publishedQAs) {
    const qaSeo = buildPageSeoMetadata({ view: 'public-qa', qaItem: qa });
    const qaHtml = injectFullSeoAndNoscript(
      baseHtml,
      renderHeadSeoBlock(qaSeo),
      `        <article>
          <h1>${escapeHtmlText(qa.title)}</h1>
          <p><strong>Pertanyaan:</strong> ${escapeHtmlText(stripHtmlForSeo(qa.content, 600))}</p>
          ${qa.replyContent ? `<p><strong>Jawaban:</strong> ${escapeHtmlText(stripHtmlForSeo(qa.replyContent, 1200))}</p>` : ''}
        </article>
        ${buildNavFooterHtml()}`
    );
    writeStaticRoute(distPath, `qa/${qa.id}`, qaHtml);
    writeStaticRoute(distPath, `tanya-jawab/${qa.id}`, qaHtml);
    staticPagesCount += 2;
  }

  // F. Instructor Profile (/profil-pengajar)
  const profileSeo = buildPageSeoMetadata({
    view: 'instructor-profile',
    instructorProfile
  });
  const profileName = instructorProfile?.fullName?.trim() || 'Ustaz Osama Nur Samsil';
  const profileBio = stripHtmlForSeo(instructorProfile?.shortBio, 1200);
  writeStaticRoute(
    distPath,
    'profil-pengajar',
    injectFullSeoAndNoscript(
      baseHtml,
      renderHeadSeoBlock(profileSeo),
      `        <article>
          <h1>Profil Pengajar – ${escapeHtmlText(profileName)}</h1>
          <p>${escapeHtmlText(profileBio || profileSeo.description)}</p>
          <p><a href="https://cvosamanursamsil.netlify.app/">Portofolio Resmi Osama Nur Samsil</a></p>
        </article>
        ${buildNavFooterHtml()}`
    )
  );
  staticPagesCount++;

  // G. Session OG Preview Pages (kept ONLY for WhatsApp/Telegram sharing, explicitly NOINDEX and EXCLUDED from sitemap.xml)
  let sessionRouteCount = 0;
  const manifestEntries: Array<{ course: Course; session: Session }> = [];

  for (const [courseId, course] of coursesMap.entries()) {
    const sessions = sessionsByCourseMap.get(courseId) || [];
    for (const session of sessions) {
      if (!canAccessSessionPublicly(session, course)) continue;

      const normalizedCourse: Course = {
        id: course.id,
        title: course.title,
        titleAr: course.titleAr || '',
        instructor: course.instructor,
        categoryId: course.categoryId,
        level: course.level,
        description: course.description,
        coverImageUrl: course.coverImageUrl?.startsWith('data:image/')
          ? `${CANONICAL_SITE_ORIGIN}/covers/${course.id}.jpg`
          : course.coverImageUrl,
        isPublished: true,
        hasCertificate: course.hasCertificate,
        passingGrade: course.passingGrade,
        order: course.order
      };

      manifestEntries.push({
        course: normalizedCourse,
        session: {
          id: session.id,
          courseId: course.id,
          title: session.title,
          titleAr: session.titleAr || '',
          description: session.description || '',
          order: session.order || 1,
          youtubeUrl: session.youtubeUrl || '',
          durationMinutes: session.durationMinutes || 45,
          isPublished: true
        }
      });

      const sessionMetaTags = [
        buildSessionMetaTagsHtml(session, normalizedCourse, CANONICAL_SITE_ORIGIN),
        `<meta name="robots" content="${PRIVATE_ROBOTS_DIRECTIVE}" />`,
        `<meta name="googlebot" content="${PRIVATE_ROBOTS_DIRECTIVE}" />`
      ].join('\n    ');

      const sessionHtml = injectFullSeoAndNoscript(baseHtml, sessionMetaTags);

      writeStaticRoute(distPath, `session/${session.id}`, sessionHtml);
      sessionRouteCount++;

      const slug = generateSessionSlug(session.title, session.id);
      if (slug && slug !== session.id) {
        writeStaticRoute(distPath, `session/${slug}`, sessionHtml);
        sessionRouteCount++;
      }
    }
  }

  // H. 404.html with explicit noindex, nofollow (soft-404 protection)
  const notFoundSeo = buildPageSeoMetadata({ view: 'home', isNotFound: true });
  const notFoundHtml = injectFullSeoAndNoscript(
    baseHtml,
    renderHeadSeoBlock({
      ...notFoundSeo,
      title: 'Halaman Tidak Ditemukan | Dars with Osama',
      description: 'Halaman yang Anda cari tidak tersedia di Dars with Osama.'
    })
  );
  fs.writeFileSync(path.join(distPath, '404.html'), notFoundHtml, 'utf-8');

  // Write session-seo-manifest.json for edge function OG preview lookup
  const manifestJson = JSON.stringify(
    { updatedAt: new Date().toISOString(), entries: manifestEntries },
    null,
    2
  );
  fs.writeFileSync(path.join(publicPath, 'session-seo-manifest.json'), manifestJson, 'utf-8');
  fs.writeFileSync(path.join(distPath, 'session-seo-manifest.json'), manifestJson, 'utf-8');

  console.log(
    `[SEO] Generated ${staticPagesCount} indexable static pages, ${sessionRouteCount} noindex session OG pages, robots.txt, and sitemap.xml (${sitemapEntries.length} public URLs).`
  );
}

generateAllSeoAssets()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[SEO] generate-article-seo error:', err);
    process.exit(0);
  });
