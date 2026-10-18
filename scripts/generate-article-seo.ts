import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

function generateArticleSeoHtml() {
  const distPath = path.resolve(__dirname, '../dist');
  const templatePath = path.join(distPath, 'index.html');

  if (!fs.existsSync(templatePath)) {
    console.warn('generate-article-seo notice: dist/index.html not found, skipping static SEO build.');
    return;
  }

  const baseHtml = fs.readFileSync(templatePath, 'utf-8');
  let generatedCount = 0;

  for (const post of INITIAL_BLOG_POSTS) {
    if (post.status !== 'published') continue;

    const title = `${post.title} | Dars with Osama`;
    const description = post.excerpt || 'Kajian Islam & Catatan Keilmuan Islam oleh Ustaz Osama Nur Samsil.';
    const imageUrl = post.coverImageUrl || 'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=1200&auto=format&fit=crop';
    const canonicalUrl = `https://darswithosama.com/article/${encodeURIComponent(post.slug || post.id)}`;

    // Build OpenGraph and Twitter meta tags string
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

    // Ensure all asset href/src paths start with absolute / rather than relative ./
    let articleHtml = baseHtml.replace(/(href|src)="\.\//g, '$1="/');
    articleHtml = articleHtml.replace(/<title>.*?<\/title>/gi, '');
    articleHtml = articleHtml.replace(/<meta name="description".*?>/gi, '');
    articleHtml = articleHtml.replace(/<meta property="og:.*?".*?>/gi, '');
    articleHtml = articleHtml.replace(/<meta name="twitter:.*?".*?>/gi, '');
    articleHtml = articleHtml.replace('</head>', `${seoMetaTags}\n</head>`);

    // Write to /dist/article/[slug]/index.html
    if (post.slug) {
      const slugDir = path.join(distPath, 'article', post.slug);
      fs.mkdirSync(slugDir, { recursive: true });
      fs.writeFileSync(path.join(slugDir, 'index.html'), articleHtml, 'utf-8');
      generatedCount++;
    }

    // Write to /dist/article/[id]/index.html
    const idDir = path.join(distPath, 'article', post.id);
    fs.mkdirSync(idDir, { recursive: true });
    fs.writeFileSync(path.join(idDir, 'index.html'), articleHtml, 'utf-8');
    generatedCount++;
  }

  console.log(`Successfully generated static OpenGraph SEO HTML for ${generatedCount} article routes.`);
}

generateArticleSeoHtml();
