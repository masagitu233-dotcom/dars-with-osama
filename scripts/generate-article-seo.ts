import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCourses, getSessionsByCourse, getBlogPosts } from '../src/firebase/services';
import { SEED_COURSES, SEED_SESSIONS } from '../src/data/seedData';
import {
  buildSessionMetaTagsHtml,
  canAccessSessionPublicly,
  generateSessionSlug,
  injectSeoMetaIntoHtml
} from '../src/utils/sessionShareHelper';
import { Course, Session } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initial published articles for static SEO generation
const INITIAL_BLOG_POSTS = [
  {
    id: 'post-1',
    title: "Menuntut Ilmu Syar'i: Keutamaan, Niat, dan Adab Para Penuntut Ilmu",
    slug: 'menuntut-ilmu-syari-keutamaan-niat-dan-adab',
    excerpt: "Memahami betapa tingginya kedudukan ilmu agama dalam Islam serta pentingnya meluruskan niat dan menjaga adab dalam majelis ilmu.",
    coverImageUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=1200&auto=format&fit=crop',
    category: 'Adab & Akhlak',
    status: 'published'
  },
  {
    id: 'post-2',
    title: "Panduan Tadabbur Al-Qur'an: Memahami Makna dan Meresapi Renungan Ayat",
    slug: 'panduan-tadabbur-al-quran-memahami-makna-dan-renungan',
    excerpt: "Langkah-langkah praktis bagi setiap muslim untuk menyelami keindahan serta hikmah Al-Qur'an dalam kehidupan sehari-hari.",
    coverImageUrl: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?q=80&w=1200&auto=format&fit=crop',
    category: "Tafsir & Al-Qur'an",
    status: 'published'
  },
  {
    id: 'post-3',
    title: 'Kisah tentang al kalam dalam ilmu nahwu',
    slug: 'kisah-tentang-al-kalam-dalam-ilmu-nahwu',
    excerpt: 'Latar belakang penamaan al kalam dalam tradisi ilmu nahwu serta urgensinya dalam memahami lisan Arab.',
    coverImageUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=1200&auto=format&fit=crop',
    category: 'Bahasa Arab',
    status: 'published'
  }
];

// Initial published Q&As for static SEO generation (QUESTION ONLY in description so readers must click to see answer)
const INITIAL_PUBLIC_QAS = [
  {
    id: 'qa-1',
    title: 'Bagaimana Hukum Shalat Berjamaah Bagi Masbuq?',
    content: 'Apabila seseorang terlambat masuk shalat berjamaah dan mendapati imam pada rakaat kedua atau ketiga, bagaimana tata cara menyempurnakan rakaat shalat yang tertinggal?'
  },
  {
    id: 'qa-2',
    title: 'Syarat Sah Wudhu Menurut Madzhab Syafi\'i',
    content: 'Mohon penjelasan rinci mengenai syarat-syarat sah wudhu serta hal-hal yang membatalkannya sesuai rujukan kitab matan Safinatun Naja.'
  }
];

async function generateAllSeoHtml() {
  const distPath = path.resolve(__dirname, '../dist');
  const publicPath = path.resolve(__dirname, '../public');
  const templatePath = path.join(distPath, 'index.html');

  if (!fs.existsSync(templatePath)) {
    console.warn('generate-seo notice: dist/index.html not found, skipping static SEO build.');
    return;
  }

  const baseHtml = fs.readFileSync(templatePath, 'utf-8');
  let generatedArticleCount = 0;

  // Merge initial blog posts with live Firestore published blog posts
  const allPostsMap = new Map<string, any>();
  for (const p of INITIAL_BLOG_POSTS) {
    allPostsMap.set(p.id, p);
  }
  try {
    const livePosts = await getBlogPosts(false);
    for (const lp of livePosts) {
      if (lp.status === 'published') {
        allPostsMap.set(lp.id, lp);
      }
    }
  } catch {
    // Ignore offline error during build
  }

  // 1. Generate Article Static OpenGraph Pages
  for (const post of allPostsMap.values()) {
    if (post.status !== 'published') continue;

    const title = `${post.title} | Dars with Osama`;
    const description = post.excerpt || 'Kajian Islam & Catatan Keilmuan Islam oleh Ustaz Osama Nur Samsil.';
    const imageUrl =
      post.coverImageUrl && /^https?:\/\//i.test(post.coverImageUrl)
        ? post.coverImageUrl
        : 'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=1200&auto=format&fit=crop';
    const canonicalUrl = `https://darswithosama.com/article/${encodeURIComponent(post.slug || post.id)}`;

    const seoMetaTags = `
      <title>${title}</title>
      <meta name="description" content="${description}" />
      <meta property="og:type" content="article" />
      <meta property="og:site_name" content="Dars with Osama" />
      <meta property="og:title" content="${post.title}" />
      <meta property="og:description" content="${description}" />
      <meta property="og:image" content="${imageUrl}" />
      <meta property="og:url" content="${canonicalUrl}" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${post.title}" />
      <meta name="twitter:description" content="${description}" />
      <meta name="twitter:image" content="${imageUrl}" />
      <link rel="canonical" href="${canonicalUrl}" />
    `;

    const articleHtml = injectSeoMetaIntoHtml(baseHtml, seoMetaTags);

    if (post.slug) {
      const slugDir = path.join(distPath, 'article', post.slug);
      fs.mkdirSync(slugDir, { recursive: true });
      fs.writeFileSync(path.join(slugDir, 'index.html'), articleHtml, 'utf-8');
      generatedArticleCount++;
    }

    const idDir = path.join(distPath, 'article', post.id);
    fs.mkdirSync(idDir, { recursive: true });
    fs.writeFileSync(path.join(idDir, 'index.html'), articleHtml, 'utf-8');
    generatedArticleCount++;
  }

  // 2. Generate Q&A Static OpenGraph Pages (Question ONLY in description)
  let qaCount = 0;
  for (const qa of INITIAL_PUBLIC_QAS) {
    const title = `${qa.title} | Tanya Jawab Dars with Osama`;
    const description = `Pertanyaan: "${qa.content}" • Klik tautan ini untuk membaca jawaban resmi dari Ustaz Osama Nur Samsil di Dars with Osama.`;
    const imageUrl = 'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=1200&auto=format&fit=crop';
    const canonicalUrl = `https://darswithosama.com/qa/${encodeURIComponent(qa.id)}`;

    const qaMetaTags = `
      <title>${title}</title>
      <meta name="description" content="${description}" />
      <meta property="og:type" content="article" />
      <meta property="og:site_name" content="Dars with Osama" />
      <meta property="og:title" content="${qa.title}" />
      <meta property="og:description" content="${description}" />
      <meta property="og:image" content="${imageUrl}" />
      <meta property="og:url" content="${canonicalUrl}" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${qa.title}" />
      <meta name="twitter:description" content="${description}" />
      <meta name="twitter:image" content="${imageUrl}" />
      <link rel="canonical" href="${canonicalUrl}" />
    `;

    const qaHtml = injectSeoMetaIntoHtml(baseHtml, qaMetaTags);

    const qaDir = path.join(distPath, 'qa', qa.id);
    fs.mkdirSync(qaDir, { recursive: true });
    fs.writeFileSync(path.join(qaDir, 'index.html'), qaHtml, 'utf-8');
    qaCount++;
  }

  // 3. Generate Learning Session Static OpenGraph Pages (for both ID and Slug routes)
  const coursesMap = new Map<string, Course>();
  const sessionsByCourseMap = new Map<string, Session[]>();

  // Include seed courses and sessions as baseline
  for (const c of SEED_COURSES) {
    if (c.isPublished) {
      coursesMap.set(c.id, c);
      sessionsByCourseMap.set(
        c.id,
        SEED_SESSIONS.filter((s) => s.courseId === c.id && s.isPublished)
      );
    }
  }

  // Fetch live published courses and sessions from Cloud Firestore
  try {
    const liveCourses = await getCourses(false);
    for (const c of liveCourses) {
      if (!c.isPublished) continue;
      coursesMap.set(c.id, c);

      // Export base64 course cover image to public/covers and dist/covers so social crawlers get a public HTTP image URL
      if (c.coverImageUrl && c.coverImageUrl.startsWith('data:image/')) {
        const match = c.coverImageUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (match) {
          const buf = Buffer.from(match[2], 'base64');
          fs.mkdirSync(path.join(publicPath, 'covers'), { recursive: true });
          fs.mkdirSync(path.join(distPath, 'covers'), { recursive: true });
          fs.writeFileSync(path.join(publicPath, 'covers', `${c.id}.jpg`), buf);
          fs.writeFileSync(path.join(distPath, 'covers', `${c.id}.jpg`), buf);
        }
      }

      const liveSessions = await getSessionsByCourse(c.id, false);
      sessionsByCourseMap.set(c.id, liveSessions.filter((s) => s.isPublished));
    }
  } catch (err) {
    console.warn('generate-seo notice: live Firestore session fetch fallback to seed data:', err);
  }

  let sessionRouteCount = 0;
  const manifestEntries: Array<{ course: Course; session: Session }> = [];

  for (const [courseId, course] of coursesMap.entries()) {
    const sessions = sessionsByCourseMap.get(courseId) || [];
    for (const session of sessions) {
      // Never generate public HTML metadata for private or draft sessions
      if (!canAccessSessionPublicly(session, course)) continue;

      manifestEntries.push({
        course: {
          id: course.id,
          title: course.title,
          titleAr: course.titleAr || '',
          instructor: course.instructor,
          categoryId: course.categoryId,
          level: course.level,
          description: course.description,
          coverImageUrl: course.coverImageUrl?.startsWith('data:image/')
            ? `https://darswithosama.com/covers/${course.id}.jpg`
            : course.coverImageUrl,
          isPublished: true,
          hasCertificate: course.hasCertificate,
          passingGrade: course.passingGrade,
          order: course.order
        },
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

      const sessionMetaTags = buildSessionMetaTagsHtml(
        session,
        course,
        'https://darswithosama.com'
      );
      const sessionHtml = injectSeoMetaIntoHtml(baseHtml, sessionMetaTags);

      // Write by session ID: /session/{id}/index.html
      const idDir = path.join(distPath, 'session', session.id);
      fs.mkdirSync(idDir, { recursive: true });
      fs.writeFileSync(path.join(idDir, 'index.html'), sessionHtml, 'utf-8');
      sessionRouteCount++;

      // Write by session slug: /session/{slug}/index.html
      const slug = generateSessionSlug(session.title, session.id);
      if (slug && slug !== session.id) {
        const slugDir = path.join(distPath, 'session', slug);
        fs.mkdirSync(slugDir, { recursive: true });
        fs.writeFileSync(path.join(slugDir, 'index.html'), sessionHtml, 'utf-8');
        sessionRouteCount++;
      }
    }
  }

  // Write session-seo-manifest.json to both public/ and dist/ for instant SSR & Edge Function lookup
  const manifestJson = JSON.stringify({ updatedAt: new Date().toISOString(), entries: manifestEntries }, null, 2);
  fs.mkdirSync(publicPath, { recursive: true });
  fs.writeFileSync(path.join(publicPath, 'session-seo-manifest.json'), manifestJson, 'utf-8');
  fs.writeFileSync(path.join(distPath, 'session-seo-manifest.json'), manifestJson, 'utf-8');

  console.log(
    `Successfully generated static OpenGraph SEO HTML for ${generatedArticleCount} article routes, ${qaCount} Q&A routes, and ${sessionRouteCount} learning session routes.`
  );
}

generateAllSeoHtml()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('generate-seo error:', err);
    process.exit(0);
  });
