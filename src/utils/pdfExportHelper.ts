import { Consultation, BlogPost } from '../types';
import { isPureArabicText, autoWrapArabicText } from './arabicFontHelper';

/**
 * Sanitizes a string to produce a clean, safe filename for PDF downloads.
 * Removes illegal characters, trims whitespace, and converts to kebab-case.
 */
export function sanitizePdfFilename(prefix: string, rawTitle: string): string {
  const cleanTitle = (rawTitle || 'dokumen')
    .toLowerCase()
    .replace(/<[^>]*>/g, '') // remove HTML tags
    .replace(/[^a-z0-9\u0600-\u06FF\s-_]/gi, '') // keep alphanumeric, Arabic, spaces, hyphens
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);

  const cleanPrefix = prefix.toLowerCase().replace(/[^a-z0-9-_]/gi, '').trim();
  return `${cleanPrefix}-${cleanTitle || 'arsip'}.pdf`;
}

/**
 * Strips HTML tags while preserving line breaks and paragraph separations
 */
export function stripHtmlToText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Generates official vector SVG emblem markup of Dars with Osama for the PDF letterhead
 */
export function getPdfOfficialLogoSvg(width: number = 44, height: number = 44): string {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" rx="40" fill="#073B2E"/>
      <path d="M100 22 C125 58 142 85 142 118 C142 136 128 152 100 152 C72 152 58 136 58 118 C58 85 75 58 100 22 Z" fill="#C9A34E"/>
      <path d="M100 26 L100 96" stroke="#073B2E" stroke-width="4"/>
      <circle cx="100" cy="98" r="5" fill="#073B2E"/>
      <path d="M96 156 C68 140 38 142 16 154 C24 132 54 126 96 142 Z" fill="#F7F6EF"/>
      <path d="M104 156 C132 140 162 142 184 154 C176 132 146 126 104 142 Z" fill="#F7F6EF"/>
    </svg>
  `;
}

/**
 * Standard A4 Print Stylesheet with Academic Typography, Orphan Prevention, and Arabic Font Support
 */
export const PDF_ACADEMIC_STYLES = `
  @page {
    size: A4 portrait;
    margin: 18mm 16mm 20mm 16mm;
    @bottom-left {
      content: "Dars with Osama • Dokumen Arsip Resmi";
      font-size: 8pt;
      font-family: 'Plus Jakarta Sans', Arial, sans-serif;
      color: #64748B;
    }
    @bottom-right {
      content: "Halaman " counter(page);
      font-size: 8pt;
      font-family: 'Plus Jakarta Sans', Arial, sans-serif;
      font-weight: bold;
      color: #073B2E;
    }
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    padding: 0;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1E293B;
    background-color: #FFFFFF;
    font-size: 10pt;
    line-height: 1.65;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .pdf-container {
    max-width: 100%;
    margin: 0 auto;
  }

  /* Academic Header & Letterhead */
  .pdf-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 12px;
    border-bottom: 2px solid #073B2E;
    margin-bottom: 16px;
    position: relative;
  }

  .pdf-header-brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .pdf-header-titles h1 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 15pt;
    font-weight: 800;
    color: #073B2E;
    margin: 0;
    line-height: 1.15;
    letter-spacing: 0.5px;
  }

  .pdf-header-titles p {
    font-size: 7.5pt;
    font-weight: 700;
    color: #C9A34E;
    margin: 2px 0 0 0;
    letter-spacing: 2px;
  }

  .pdf-header-meta {
    text-align: right;
    font-size: 8pt;
    color: #64748B;
  }

  .pdf-header-meta strong {
    color: #073B2E;
    display: block;
    font-size: 8pt;
  }

  /* Metadata Info Grid */
  .pdf-meta-box {
    background-color: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-left: 4px solid #C9A34E;
    border-radius: 6px;
    padding: 8px 14px;
    margin-bottom: 16px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 8px 14px;
    font-size: 8pt;
  }

  .pdf-meta-item label {
    display: block;
    font-size: 7pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #64748B;
    margin-bottom: 2px;
  }

  .pdf-meta-item span {
    font-weight: 600;
    color: #0F172A;
  }

  /* Question Section in Q&A */
  .pdf-question-card {
    background-color: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-left: 4px solid #0EA5A4;
    border-radius: 6px;
    padding: 12px 16px;
    margin-bottom: 16px;
  }

  .pdf-section-title {
    font-size: 8pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #073B2E;
    margin: 0 0 6px 0;
  }

  .pdf-question-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 13pt;
    font-weight: 700;
    color: #0F172A;
    margin: 0 0 8px 0;
    line-height: 1.35;
  }

  .pdf-question-content {
    font-size: 10pt;
    line-height: 1.6;
    color: #334155;
    margin: 0;
    white-space: pre-line;
  }

  /* Answer Section */
  .pdf-answer-card {
    margin-top: 10px;
  }

  .pdf-answer-badge {
    background-color: #ECFDF5;
    border: 1px solid #A7F3D0;
    color: #065F46;
    display: inline-block;
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 7.5pt;
    font-weight: 700;
    margin-bottom: 12px;
  }

  /* Headings & Typography */
  h1, h2, h3, h4 {
    color: #073B2E;
    font-family: 'Playfair Display', Georgia, serif;
  }

  h1 {
    font-size: 16pt;
    font-weight: 800;
    line-height: 1.25;
    margin: 0 0 10px 0;
  }

  h2 {
    font-size: 12.5pt;
    margin-top: 14px;
    margin-bottom: 6px;
    font-weight: 700;
    line-height: 1.3;
  }

  h3 {
    font-size: 11pt;
    margin-top: 12px;
    margin-bottom: 5px;
    font-weight: 700;
    line-height: 1.35;
  }

  p {
    margin: 0 0 10px 0;
    text-align: justify;
    text-justify: inter-word;
    font-size: 10pt;
    line-height: 1.65;
    color: #1E293B;
  }

  ul, ol {
    margin: 0 0 10px 0;
    padding-left: 20px;
    font-size: 10pt;
  }

  li {
    margin-bottom: 5px;
    line-height: 1.6;
  }

  /* Arabic Typography */
  .font-amiri, [dir="rtl"], [lang="ar"], .pdf-arabic-text {
    font-family: 'Amiri', 'Traditional Arabic', serif !important;
  }

  .pdf-arabic-box {
    background-color: #FDFBF7;
    border: 1px solid #E9DDC2;
    border-right: 4px solid #C9A34E;
    border-radius: 6px;
    padding: 12px 16px;
    margin: 12px 0;
    text-align: right;
    direction: rtl;
  }

  .pdf-arabic-text {
    font-family: 'Amiri', 'Traditional Arabic', serif;
    font-size: 15pt;
    line-height: 2.2;
    color: #073B2E;
    font-weight: 700;
    margin: 0;
  }

  .pdf-arabic-translation {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 9pt;
    font-style: italic;
    color: #475569;
    direction: ltr;
    text-align: left;
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px dashed #E2E8F0;
  }

  .inline-arabic {
    font-family: 'Amiri', 'Traditional Arabic', serif;
    font-size: 1.15em;
    line-height: 1.8;
    direction: rtl;
    unicode-bidi: isolate;
  }

  /* Blockquote */
  blockquote {
    border-left: 3.5px solid #C9A34E;
    margin: 10px 0;
    padding: 8px 14px;
    background-color: #FDFBF7;
    font-style: italic;
    color: #334155;
    border-radius: 0 6px 6px 0;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 8.5pt;
    line-height: 1.5;
  }

  table th, table td {
    border: 1px solid #CBD5E1;
    padding: 6px 8px;
    text-align: left;
  }

  table th {
    background-color: #F1F5F9;
    color: #073B2E;
    font-weight: 700;
  }

  /* Figures & Images */
  .pdf-cover-figure {
    margin: 10px 0 14px 0;
    text-align: center;
  }

  .pdf-cover-image {
    max-width: 100%;
    max-height: 220px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid #E2E8F0;
    display: block;
    margin: 0 auto;
  }

  .pdf-cover-caption {
    font-size: 7.5pt;
    color: #64748B;
    font-style: italic;
    margin-top: 4px;
    text-align: center;
  }

  /* Kolofon */
  .pdf-kolofon {
    margin-top: 18px;
    padding-top: 10px;
    border-top: 1px solid #E2E8F0;
    font-size: 7.5pt;
    color: #64748B;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .pdf-kolofon-brand {
    font-weight: 700;
    color: #073B2E;
  }

  .pdf-kolofon-link {
    color: #0EA5A4;
    text-decoration: none;
    font-weight: 600;
  }

  /* Multi-page styling for A4 Paginated Export */
  .a4-page {
    width: 794px;
    height: 1123px;
    box-sizing: border-box;
    padding: 24px 44px 20px 44px;
    background: #FFFFFF;
    color: #1E293B;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    position: relative;
    page-break-after: always;
    break-after: page;
  }

  .a4-header {
    flex-shrink: 0;
    margin-bottom: 12px;
  }

  .a4-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .a4-footer {
    flex-shrink: 0;
    margin-top: 12px;
  }
`;

/**
 * Builds printable HTML document for Public Q&A
 */
export function buildQAPdfHtml(qa: Consultation): string {
  // Validate public authorization: Must be published AND answered
  if (!qa.isPublished || qa.status !== 'answered') {
    throw new Error('Hanya arsip Tanya Jawab publik yang telah dijawab yang boleh diekspor ke PDF.');
  }

  const docId = `DW-QA-${(qa.id || 'ARCHIVE').slice(0, 8).toUpperCase()}`;
  const repliedDate = qa.repliedAt
    ? new Date(qa.repliedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Arsip Resmi';
  const category = qa.category || 'Hukum Syar\'i & Konsultasi';
  const cleanQuestion = stripHtmlToText(qa.content || '');
  const cleanTitle = qa.title || 'Tanya Jawab Syar\'i';

  // Format reply content to detect Arabic verses and enhance styling
  let replyContentHtml = autoWrapArabicText(qa.replyContent || '<p>Jawaban lengkap tersedia di platform Dars with Osama.</p>');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${sanitizePdfFilename('tanya-jawab', cleanTitle)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,600;0,700;0,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    ${PDF_ACADEMIC_STYLES}
  </style>
</head>
<body>
  <div class="pdf-container">
    
    <!-- Letterhead -->
    <header class="pdf-header">
      <div class="pdf-header-brand">
        ${getPdfOfficialLogoSvg(48, 48)}
        <div class="pdf-header-titles">
          <h1>DARS WITH OSAMA</h1>
          <p>ILMU • KAJIAN • KITAB</p>
        </div>
      </div>
      <div class="pdf-header-meta">
        <strong>LEMBAR ARSIP TANYA JAWAB SYAR'I</strong>
        <span>Dokumen ID: ${docId}</span>
      </div>
    </header>

    <!-- Metadata Grid -->
    <div class="pdf-meta-box">
      <div class="pdf-meta-item">
        <label>Topik / Kategori</label>
        <span>${category}</span>
      </div>
      <div class="pdf-meta-item">
        <label>Tanggal Rilis Jawaban</label>
        <span>${repliedDate}</span>
      </div>
      <div class="pdf-meta-item">
        <label>Penjawab Resmi</label>
        <span>Ustaz / Pembimbing Syar'i</span>
      </div>
      <div class="pdf-meta-item">
        <label>Status Dokumen</label>
        <span style="color: #065F46;">✔ Terverifikasi & Terpublikasi</span>
      </div>
    </div>

    <!-- Question Box -->
    <section class="pdf-question-card">
      <div class="pdf-section-title">
        <span>PERTANYAAN SANTRI / PENANYA:</span>
      </div>
      <h2 class="pdf-question-title">${cleanTitle}</h2>
      <p class="pdf-question-content">${cleanQuestion}</p>
    </section>

    <!-- Answer Section -->
    <section class="pdf-answer-card">
      <div class="pdf-answer-badge">
        JAWABAN & PENJELASAN RESMI USTAZ / PEMBIMBING DARS WITH OSAMA
      </div>

      <div class="pdf-answer-body">
        ${replyContentHtml}
      </div>
    </section>

    <!-- Kolofon & Reference -->
    <footer class="pdf-kolofon">
      <div>
        <span class="pdf-kolofon-brand">Dars with Osama — Platform Kajian & Fiqih Islam Terstruktur</span><br/>
        <span>Naskah resmi hasil kajian & fatwa syar'i. Boleh disebarluaskan untuk kepentingan dakwah non-komersial.</span>
      </div>
      <div style="text-align: right;">
        <span>Akses Pembahasan Online:</span><br/>
        <span class="pdf-kolofon-link">https://darswithosama.com</span>
      </div>
    </footer>

  </div>
</body>
</html>`;
}

/**
 * Builds printable HTML document for Published Article / Blog Post
 */
export function buildArticlePdfHtml(article: BlogPost): string {
  if (article.status !== 'published') {
    throw new Error('Hanya artikel yang telah dipublikasikan yang dapat diekspor ke format PDF.');
  }

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date(article.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const authorName = article.authorName || 'Ustaz Osama Nur Samsil';
  const authorRole = article.authorRole || 'Pengasuh & Pengajar Dars with Osama';
  const category = article.category || 'Kajian Islam & Fiqih';
  const readingTime = article.readingTimeMinutes ? `${article.readingTimeMinutes} Menit Baca` : 'Kajian Lengkap';

  // Apply autoWrapArabicText to preserve bidirectional Arabic shaping and prevent character order reversals
  const processedContent = autoWrapArabicText(article.content || '');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${sanitizePdfFilename('artikel', article.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,600;0,700;0,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    ${PDF_ACADEMIC_STYLES}
  </style>
</head>
<body>
  <div class="pdf-container">
    
    <!-- Letterhead -->
    <header class="pdf-header">
      <div class="pdf-header-brand">
        ${getPdfOfficialLogoSvg(48, 48)}
        <div class="pdf-header-titles">
          <h1>DARS WITH OSAMA</h1>
          <p>ILMU • KAJIAN • KITAB</p>
        </div>
      </div>
      <div class="pdf-header-meta">
        <strong>NASKAH ARTIKEL & KAJIAN ILMIAH</strong>
        <span>Publikasi: ${publishedDate}</span>
      </div>
    </header>

    <!-- Metadata Grid -->
    <div class="pdf-meta-box">
      <div class="pdf-meta-item">
        <label>Kategori Artikel</label>
        <span>${category}</span>
      </div>
      <div class="pdf-meta-item">
        <label>Penyusun / Penulis</label>
        <span>${authorName}</span>
      </div>
      <div class="pdf-meta-item">
        <label>Peran Penulis</label>
        <span>${authorRole}</span>
      </div>
      <div class="pdf-meta-item">
        <label>Waktu Baca Estimasi</label>
        <span>${readingTime}</span>
      </div>
    </div>

    <!-- Article Title -->
    <article>
      <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 18pt; font-weight: 800; color: #073B2E; line-height: 1.25; margin: 0 0 10px 0;">
        ${article.title}
      </h1>

      ${article.titleAr ? `
        <div style="font-family: 'Amiri', serif; font-size: 18pt; font-weight: 700; color: #C9A34E; direction: rtl; text-align: right; margin-bottom: 12px; line-height: 2;">
          ${article.titleAr}
        </div>
      ` : ''}

      ${article.excerpt ? `
        <div style="font-size: 10pt; font-style: italic; color: #475569; border-left: 3px solid #0EA5A4; padding: 6px 14px; background-color: #F8FAFC; margin-bottom: 18px; border-radius: 0 4px 4px 0;">
          ${article.excerpt}
        </div>
      ` : ''}

      ${article.coverImageUrl ? `
        <figure class="pdf-cover-figure">
          <img src="${article.coverImageUrl}" alt="${article.title}" class="pdf-cover-image" />
          ${article.coverImageCaption ? `<figcaption class="pdf-cover-caption">${article.coverImageCaption}</figcaption>` : ''}
        </figure>
      ` : ''}

      <!-- Main Body Content -->
      <div class="pdf-article-body">
        ${processedContent}
      </div>

      ${article.contentAr ? `
        <div class="pdf-arabic-box" style="margin-top: 20px;">
          <div class="pdf-arabic-text">${article.contentAr}</div>
        </div>
      ` : ''}

      ${article.tags && article.tags.length > 0 ? `
        <div style="margin-top: 18px; font-size: 8pt; color: #64748B;">
          <strong>Kata Kunci / Tag:</strong> ${article.tags.map(t => `#${t}`).join(', ')}
        </div>
      ` : ''}
    </article>

    <!-- Kolofon & Reference -->
    <footer class="pdf-kolofon">
      <div>
        <span class="pdf-kolofon-brand">Dars with Osama — Kajian Islam & Matan Kitab Turats</span><br/>
        <span>Hak cipta keilmuan dilindungi. Didistribusikan untuk pembelajaran santri & kaum muslimin.</span>
      </div>
      <div style="text-align: right;">
        <span>Artikel Asli:</span><br/>
        <span class="pdf-kolofon-link">https://darswithosama.com</span>
      </div>
    </footer>

  </div>
</body>
</html>`;
}

/**
 * Builds Page 1 Header HTML markup (Official Letterhead)
 */
function buildPage1HeaderMarkup(category: string, publishedDate: string): string {
  return `
    <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 10px; border-bottom: 2px solid #073B2E;">
      <div style="display: flex; align-items: center; gap: 12px;">
        ${getPdfOfficialLogoSvg(38, 38)}
        <div>
          <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 14pt; font-weight: 800; color: #073B2E; line-height: 1.1; letter-spacing: 0.5px;">DARS WITH OSAMA</div>
          <div style="font-size: 7.5pt; font-weight: 700; color: #C9A34E; letter-spacing: 2px; margin-top: 1px;">ILMU • KAJIAN • KITAB</div>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 7.5pt; font-weight: 800; color: #073B2E; text-transform: uppercase; letter-spacing: 0.5px;">NASKAH RESMI ARSIP</div>
        <div style="font-size: 7pt; color: #64748B; margin-top: 1px;">${category} ${publishedDate ? '• ' + publishedDate : ''}</div>
      </div>
    </div>
  `;
}

/**
 * Builds Running Header HTML markup for Page 2 and subsequent pages
 */
function buildRunningHeaderMarkup(title: string, category: string): string {
  return `
    <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 8px; border-bottom: 1.5px solid #073B2E;">
      <div style="display: flex; align-items: center; gap: 8px;">
        ${getPdfOfficialLogoSvg(22, 22)}
        <span style="font-family: 'Playfair Display', Georgia, serif; font-size: 9pt; font-weight: 800; color: #073B2E; letter-spacing: 0.5px;">DARS WITH OSAMA</span>
        <span style="color: #CBD5E1; font-size: 8pt;">•</span>
        <span style="font-size: 8pt; color: #475569; font-weight: 600; max-width: 420px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</span>
      </div>
      <div style="font-size: 7pt; font-weight: 700; color: #C9A34E; text-transform: uppercase; letter-spacing: 0.5px; background: #FDFBF7; padding: 2px 7px; border-radius: 4px; border: 1px solid #E9DDC2;">
        ${category}
      </div>
    </div>
  `;
}

/**
 * Builds Running Footer HTML markup on every page
 */
function buildFooterMarkup(pageNumPlaceholder: number | string = 'X', totalPagesPlaceholder: number | string = 'Y'): string {
  return `
    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 8px; border-top: 1.5px solid #E2E8F0; font-size: 7.5pt; color: #64748B;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <strong style="color: #073B2E; font-weight: 700;">Dars with Osama</strong>
        <span style="color: #CBD5E1;">—</span>
        <span style="color: #0EA5A4; font-weight: 600;">https://darswithosama.com</span>
        <span style="color: #CBD5E1;">•</span>
        <span>Platform Kajian Islam & Matan Kitab Turats</span>
      </div>
      <div style="font-weight: 700; color: #073B2E; font-size: 8pt;">
        Halaman <span class="page-num-placeholder">${pageNumPlaceholder}</span> dari <span class="total-pages-placeholder">${totalPagesPlaceholder}</span>
      </div>
    </div>
  `;
}

/**
 * Generates an authentic, professionally paginated binary PDF file (.pdf) directly in the browser and triggers an automated download.
 * Ensures:
 * 1. Fixed A4 Portrait dimensions on every single page (210 x 297 mm).
 * 2. Dedicated running header on every page with official logo, titles, and emerald divider.
 * 3. Dedicated running footer on every page with "https://darswithosama.com" and "Halaman X dari Y".
 * 4. Content is strictly bounded so text never touches or collides with headers or footers.
 * 5. Automatic page flow with orphan heading prevention and clean paragraph distribution.
 * 6. High-fidelity Arabic typography with Amiri font, harakat, and RTL bidirectional shaping.
 * 7. Multi-page high-resolution vector-like sharpness via 2x DPI canvas rendering.
 */
export async function exportDocumentToPdf(htmlContent: string, filename: string): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Ekspor PDF hanya dapat dilakukan di lingkungan peramban (browser).');
  }

  const { jsPDF } = await import('jspdf');
  const html2canvasModule = await import('html2canvas');
  const html2canvas = html2canvasModule.default || html2canvasModule;

  // Ensure clean .pdf file extension
  const cleanFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;

  // Create isolated render iframe to isolate from parent document's Tailwind v4 oklch styles
  const iframe = document.createElement('iframe');
  iframe.className = 'dars-pdf-render-frame';
  iframe.style.position = 'fixed';
  iframe.style.left = '0';
  iframe.style.top = '0';
  iframe.style.width = '794px'; // Exact 210mm A4 width at 96 DPI
  iframe.style.height = '1123px'; // A4 height at 96 DPI
  iframe.style.border = 'none';
  iframe.style.backgroundColor = '#FFFFFF';
  iframe.style.opacity = '0.01';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-9999';

  document.body.appendChild(iframe);

  try {
    const iframeWin = iframe.contentWindow;
    const iframeDoc = iframeWin?.document;
    if (!iframeDoc || !iframeWin) {
      throw new Error('Gagal menyiapkan jendela isolasi dokumen PDF.');
    }

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // 1. Wait for web fonts (Amiri, Playfair, Plus Jakarta Sans) inside iframe
    if (iframeDoc.fonts && iframeDoc.fonts.ready) {
      try {
        await Promise.race([
          iframeDoc.fonts.ready,
          new Promise(r => setTimeout(r, 1500))
        ]);
      } catch {
        // Continue if font wait times out
      }
    }

    // 2. Pre-process and wait for all images inside iframe
    const rawImages = Array.from(iframeDoc.querySelectorAll('img'));
    if (rawImages.length > 0) {
      await Promise.all(
        rawImages.map(img => {
          if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve();
            img.onerror = () => {
              img.style.display = 'none';
              resolve();
            };
            setTimeout(resolve, 2000);
          });
        })
      );
    }

    // Small delay for DOM layout shaper to complete Arabic font glyph shaping
    await new Promise(resolve => setTimeout(resolve, 200));

    // 3. Extract metadata and content blocks
    const docTitle = iframeDoc.querySelector('article h1, .pdf-question-title, h1')?.textContent?.trim() || 'Dokumen Ilmiah';
    const docTitleArEl = iframeDoc.querySelector('article [style*="Amiri"], .pdf-arabic-box .pdf-arabic-text');
    const docTitleAr = docTitleArEl?.textContent?.trim() || '';
    const category = iframeDoc.querySelector('.pdf-meta-item:nth-child(1) span, .pdf-meta-box span')?.textContent?.trim() || 'Kajian Islam';
    const authorName = iframeDoc.querySelector('.pdf-meta-item:nth-child(2) span')?.textContent?.trim() || 'Ustaz Osama Nur Samsil';
    const authorRole = iframeDoc.querySelector('.pdf-meta-item:nth-child(3) span')?.textContent?.trim() || 'Pengasuh Dars with Osama';
    const readingTime = iframeDoc.querySelector('.pdf-meta-item:nth-child(4) span')?.textContent?.trim() || '';
    const publishedDate = iframeDoc.querySelector('.pdf-header-meta span')?.textContent?.replace(/Publikasi:\s*/i, '')?.trim() || '';
    const excerptEl = iframeDoc.querySelector('article > div[style*="italic"]');
    const coverFigureEl = iframeDoc.querySelector('.pdf-cover-figure');

    // Collect blocks to layout
    const blocksToFlow: HTMLElement[] = [];
    const articleBody = iframeDoc.querySelector('.pdf-article-body');
    const answerBody = iframeDoc.querySelector('.pdf-answer-body');

    if (articleBody) {
      Array.from(articleBody.children).forEach(ch => blocksToFlow.push(ch as HTMLElement));
      const extraArabicBoxes = Array.from(iframeDoc.querySelectorAll('article > .pdf-arabic-box'));
      extraArabicBoxes.forEach(box => blocksToFlow.push(box as HTMLElement));
      const tagsEl = iframeDoc.querySelector('article > div[style*="Kata Kunci"]');
      if (tagsEl) blocksToFlow.push(tagsEl as HTMLElement);
      const kolofonEl = iframeDoc.querySelector('footer.pdf-kolofon');
      if (kolofonEl) blocksToFlow.push(kolofonEl as HTMLElement);
    } else if (answerBody) {
      Array.from(answerBody.children).forEach(ch => blocksToFlow.push(ch as HTMLElement));
      const kolofonEl = iframeDoc.querySelector('footer.pdf-kolofon');
      if (kolofonEl) blocksToFlow.push(kolofonEl as HTMLElement);
    } else {
      // Generic fallback
      const container = iframeDoc.querySelector('.pdf-container') || iframeDoc.body;
      Array.from(container.children).forEach(ch => {
        if (!ch.matches('.pdf-header, .pdf-kolofon')) {
          blocksToFlow.push(ch as HTMLElement);
        }
      });
    }

    // 4. Build Paginated Multi-Page Structure
    // Hide original container and create .pdf-pages-mount
    const originalContainer = iframeDoc.querySelector('.pdf-container');
    if (originalContainer) {
      (originalContainer as HTMLElement).style.display = 'none';
    }

    const targetDoc = iframeDoc;
    if (!targetDoc) {
      throw new Error('Gagal mengakses dokumen iframe untuk pengolah PDF.');
    }

    const pagesMount = targetDoc.createElement('div');
    pagesMount.className = 'pdf-pages-mount';
    targetDoc.body.appendChild(pagesMount);

    interface PageEntry {
      page: HTMLElement;
      content: HTMLElement;
      footer: HTMLElement;
      pageIndex: number;
    }

    const pages: PageEntry[] = [];

    function createPage(index: number): PageEntry {
      const page = targetDoc.createElement('div');
      page.className = 'a4-page';

      // Header
      const header = targetDoc.createElement('div');
      header.className = 'a4-header';
      if (index === 0) {
        header.innerHTML = buildPage1HeaderMarkup(category, publishedDate);
      } else {
        header.innerHTML = buildRunningHeaderMarkup(docTitle, category);
      }
      page.appendChild(header);

      // Content Box
      const content = targetDoc.createElement('div');
      content.className = 'a4-content';
      page.appendChild(content);

      // Footer
      const footer = targetDoc.createElement('div');
      footer.className = 'a4-footer';
      footer.innerHTML = buildFooterMarkup(index + 1);
      page.appendChild(footer);

      pagesMount.appendChild(page);
      const entry: PageEntry = { page, content, footer, pageIndex: index };
      pages.push(entry);
      return entry;
    }

    // Initialize Page 1
    let currentPage = createPage(0);

    // If Article, construct Title & Metadata block on Page 1
    if (articleBody) {
      const titleBlock = iframeDoc.createElement('div');
      titleBlock.className = 'pdf-title-block';
      titleBlock.style.marginBottom = '14px';

      let titleHtml = `<h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 16pt; font-weight: 800; color: #073B2E; line-height: 1.25; margin: 0 0 8px 0;">${docTitle}</h1>`;
      if (docTitleAr) {
        titleHtml += `<div style="font-family: 'Amiri', serif; font-size: 16pt; font-weight: 700; color: #C9A34E; direction: rtl; text-align: right; margin-bottom: 10px; line-height: 2;">${docTitleAr}</div>`;
      }
      titleHtml += `
        <div class="pdf-meta-box">
          <div class="pdf-meta-item"><label>Kategori</label><span>${category}</span></div>
          <div class="pdf-meta-item"><label>Penulis</label><span>${authorName}</span></div>
          <div class="pdf-meta-item"><label>Peran Penulis</label><span>${authorRole}</span></div>
          <div class="pdf-meta-item"><label>Estimasi Baca</label><span>${readingTime || 'Lengkap'}</span></div>
        </div>
      `;
      if (excerptEl) {
        titleHtml += excerptEl.outerHTML;
      }
      if (coverFigureEl) {
        titleHtml += coverFigureEl.outerHTML;
      }

      titleBlock.innerHTML = titleHtml;
      currentPage.content.appendChild(titleBlock);
    } else if (answerBody) {
      // Q&A Title & Question Block
      const questionCard = iframeDoc.querySelector('.pdf-question-card');
      const answerBadge = iframeDoc.querySelector('.pdf-answer-badge');
      const metaBox = iframeDoc.querySelector('.pdf-meta-box');

      const qaTopBlock = iframeDoc.createElement('div');
      qaTopBlock.style.marginBottom = '14px';

      let qaHtml = '';
      if (metaBox) qaHtml += metaBox.outerHTML;
      if (questionCard) qaHtml += questionCard.outerHTML;
      if (answerBadge) qaHtml += answerBadge.outerHTML;

      qaTopBlock.innerHTML = qaHtml;
      currentPage.content.appendChild(qaTopBlock);
    }

    // 5. Flow Content Elements across Pages
    for (let i = 0; i < blocksToFlow.length; i++) {
      const elem = blocksToFlow[i];
      const clone = elem.cloneNode(true) as HTMLElement;

      currentPage.content.appendChild(clone);

      const maxHeight = currentPage.pageIndex === 0 ? 920 : 950;
      const currentHeight = currentPage.content.scrollHeight;

      if (currentHeight <= maxHeight) {
        // Element fits comfortably. Check orphan heading rule:
        const isHeading = ['H1', 'H2', 'H3', 'H4'].includes(elem.tagName);
        if (isHeading && currentHeight > maxHeight - 65) {
          // Heading is too close to bottom without room for content below it
          currentPage.content.removeChild(clone);
          currentPage = createPage(pages.length);
          currentPage.content.appendChild(clone);
        }
        continue;
      }

      // Does not fit on this page!
      currentPage.content.removeChild(clone);

      // Paragraph splitting for long texts to avoid gaping blank areas
      if (elem.tagName === 'P' && elem.textContent && elem.textContent.length > 200) {
        const rawHtml = elem.innerHTML;
        const sentences = rawHtml.split(/(?<=[.?!؟۔])\s+/);
        if (sentences.length >= 2) {
          const p1 = iframeDoc.createElement('p');
          p1.className = elem.className;
          currentPage.content.appendChild(p1);

          let splitIndex = 0;
          for (let s = 0; s < sentences.length; s++) {
            p1.innerHTML = sentences.slice(0, s + 1).join(' ');
            if (currentPage.content.scrollHeight > maxHeight) {
              if (s > 0) {
                p1.innerHTML = sentences.slice(0, s).join(' ');
                splitIndex = s;
              } else {
                currentPage.content.removeChild(p1);
                splitIndex = 0;
              }
              break;
            }
          }

          if (splitIndex > 0) {
            currentPage = createPage(pages.length);
            const p2 = iframeDoc.createElement('p');
            p2.className = elem.className;
            p2.innerHTML = sentences.slice(splitIndex).join(' ');
            currentPage.content.appendChild(p2);
            continue;
          }
        }
      }

      // Atomic elements (headings, tables, blockquotes, arabic boxes, images, or unbroken paragraphs)
      currentPage = createPage(pages.length);
      currentPage.content.appendChild(clone);
    }

    // 6. Update Total Page Numbers across all Footers
    const totalPages = Math.max(pages.length, 1);
    for (let p = 0; p < totalPages; p++) {
      const pageEl = pages[p].page;
      const pageNumEl = pageEl.querySelector('.page-num-placeholder');
      const totalPagesEl = pageEl.querySelector('.total-pages-placeholder');
      if (pageNumEl) pageNumEl.textContent = String(p + 1);
      if (totalPagesEl) totalPagesEl.textContent = String(totalPages);
    }

    // 7. Initialize jsPDF in A4 portrait format (210 x 297 mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // 8. Render each page element to high-res canvas (2x DPI for crisp print quality)
    for (let p = 0; p < pages.length; p++) {
      const pageEl = pages[p].page;
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        windowWidth: 794,
        windowHeight: 1123,
        scrollX: 0,
        scrollY: 0,
        logging: false,
        window: iframeWin
      } as any);

      if (p > 0) {
        pdf.addPage('a4', 'portrait');
      }

      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.96),
        'JPEG',
        0,
        0,
        210,
        297,
        undefined,
        'FAST'
      );
    }

    // 9. Trigger native browser file download of the PDF
    pdf.save(cleanFilename);

  } catch (err) {
    console.error('exportDocumentToPdf error:', err);
    throw err instanceof Error ? err : new Error('Terjadi kegagalan saat menyusun naskah dokumen PDF.');
  } finally {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
}

/**
 * Triggers the browser's native print engine for physical printing or system print preview.
 */
export async function printDocumentViaDialog(htmlContent: string, filename: string): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Pencetakan hanya dapat dilakukan di lingkungan peramban.');
  }

  return new Promise((resolve, reject) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.border = 'none';
      iframe.style.opacity = '0.01';

      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        throw new Error('Tidak dapat menginisialisasi dialog cetak.');
      }

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      const win = iframe.contentWindow;
      if (!win) {
        document.body.removeChild(iframe);
        throw new Error('Jendela pencetakan tidak tersedia.');
      }

      iframeDoc.title = filename.replace(/\.pdf$/i, '');

      const triggerPrint = () => {
        try {
          win.focus();
          win.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            resolve();
          }, 1500);
        } catch (err) {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          reject(err);
        }
      };

      setTimeout(triggerPrint, 600);
    } catch (err) {
      reject(err);
    }
  });
}
