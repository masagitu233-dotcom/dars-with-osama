import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getCourses,
  getSessionsByCourse,
  getBlogPosts,
  getPublishedPublicQA
} from '../src/firebase/services';
import {
  buildSessionMetaTagsHtml,
  canAccessSessionPublicly,
  generateSessionSlug,
  injectSeoMetaIntoHtml
} from '../src/utils/sessionShareHelper';
import { isDummySeedBlogPost } from '../src/utils/dataAuditHelper';
import { Course, Session, Consultation } from '../src/types';

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

  // Fetch strictly live Firestore published blog posts (no dummy seed data)
  const allPostsMap = new Map<string, any>();
  try {
    const livePosts = await withTimeout(getBlogPosts(false), 8000);
    for (const lp of livePosts) {
      if (lp.status === 'published' && !isDummySeedBlogPost(lp)) {
        allPostsMap.set(lp.id, lp);
      }
    }
  } catch (err) {
    console.warn('generate-seo notice: live Firestore blogPosts fetch notice:', err);
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

  // 2. Generate Q&A Static OpenGraph Pages from live Firestore published Q&As
  let qaCount = 0;
  let liveQAs: Consultation[] = [];
  try {
    liveQAs = await withTimeout(getPublishedPublicQA(), 8000);
  } catch (err) {
    console.warn('generate-seo notice: live Firestore Q&A fetch notice:', err);
  }

  for (const qa of liveQAs) {
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

  // 3. Generate Learning Session Static OpenGraph Pages (strictly from live Firestore courses & sessions)
  const coursesMap = new Map<string, Course>();
  const sessionsByCourseMap = new Map<string, Session[]>();

  try {
    const liveCourses = await withTimeout(getCourses(false), 8000);
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

      const liveSessions = await withTimeout(getSessionsByCourse(c.id, false), 8000);
      sessionsByCourseMap.set(c.id, liveSessions.filter((s) => s.isPublished));
    }
  } catch (err) {
    console.warn('generate-seo notice: live Firestore session fetch notice:', err);
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
