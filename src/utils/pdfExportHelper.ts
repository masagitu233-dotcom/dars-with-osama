import { Consultation, BlogPost } from '../types';
import { isPureArabicText } from './arabicFontHelper';

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
    font-size: 10.5pt;
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
    padding-bottom: 14px;
    border-bottom: 2px solid #073B2E;
    margin-bottom: 18px;
    position: relative;
  }

  .pdf-header-brand {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .pdf-header-titles h1 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 16pt;
    font-weight: 800;
    color: #073B2E;
    margin: 0;
    line-height: 1.15;
    letter-spacing: 0.5px;
  }

  .pdf-header-titles p {
    font-size: 8pt;
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
    font-size: 8.5pt;
  }

  /* Metadata Info Grid */
  .pdf-meta-box {
    background-color: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-left: 4px solid #C9A34E;
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 20px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 8px 16px;
    font-size: 8.5pt;
  }

  .pdf-meta-item label {
    display: block;
    font-size: 7.5pt;
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
    margin-bottom: 20px;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .pdf-section-title {
    font-size: 8.5pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #073B2E;
    margin: 0 0 8px 0;
    display: flex;
    align-items: center;
    gap: 6px;
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
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 8pt;
    font-weight: 700;
    margin-bottom: 14px;
  }

  /* Rich Text & Typography */
  h1, h2, h3, h4, .pdf-orphan-prevent {
    page-break-after: avoid;
    break-after: avoid;
    color: #073B2E;
  }

  h2 {
    font-size: 13pt;
    margin-top: 18px;
    margin-bottom: 8px;
    font-weight: 700;
  }

  h3 {
    font-size: 11.5pt;
    margin-top: 14px;
    margin-bottom: 6px;
    font-weight: 700;
  }

  p {
    margin: 0 0 12px 0;
    text-align: justify;
    text-justify: inter-word;
    orphans: 3;
    widows: 3;
  }

  ul, ol {
    margin: 0 0 12px 0;
    padding-left: 22px;
  }

  li {
    margin-bottom: 6px;
    line-height: 1.6;
  }

  /* Arabic Dalil Mushaf Box */
  .pdf-arabic-box {
    background-color: #FDFBF7;
    border: 1px solid #E9DDC2;
    border-right: 4px solid #C9A34E;
    border-radius: 6px;
    padding: 14px 18px;
    margin: 16px 0;
    page-break-inside: avoid;
    break-inside: avoid;
    text-align: right;
    direction: rtl;
  }

  .pdf-arabic-text {
    font-family: 'Amiri', 'Traditional Arabic', serif;
    font-size: 15.5pt;
    line-height: 2.3;
    color: #073B2E;
    font-weight: 700;
    margin: 0;
  }

  .pdf-arabic-translation {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 9.5pt;
    font-style: italic;
    color: #475569;
    direction: ltr;
    text-align: left;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px dashed #E2E8F0;
  }

  /* Blockquote */
  blockquote {
    border-left: 3px solid #C9A34E;
    margin: 14px 0;
    padding: 8px 16px;
    background-color: #FDFBF7;
    font-style: italic;
    color: #334155;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Reference Box */
  .pdf-reference-box {
    background-color: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 10px 14px;
    margin-top: 20px;
    font-size: 8.5pt;
    color: #475569;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .pdf-reference-box strong {
    color: #073B2E;
    display: block;
    margin-bottom: 4px;
  }

  /* Table styling */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 9pt;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  table th, table td {
    border: 1px solid #CBD5E1;
    padding: 8px 10px;
    text-align: left;
  }

  table th {
    background-color: #F1F5F9;
    color: #073B2E;
    font-weight: 700;
  }

  /* Article Cover Image */
  .pdf-cover-figure {
    margin: 16px 0 20px 0;
    text-align: center;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .pdf-cover-image {
    max-width: 100%;
    max-height: 280px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid #E2E8F0;
  }

  .pdf-cover-caption {
    font-size: 8pt;
    color: #64748B;
    font-style: italic;
    margin-top: 6px;
  }

  /* Kolofon / Footer Callout */
  .pdf-kolofon {
    margin-top: 26px;
    padding-top: 14px;
    border-top: 1px solid #E2E8F0;
    font-size: 8pt;
    color: #64748B;
    display: flex;
    align-items: center;
    justify-content: space-between;
    page-break-inside: avoid;
    break-inside: avoid;
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
  let replyContentHtml = qa.replyContent || '<p>Jawaban lengkap tersedia di platform Dars with Osama.</p>';
  
  // Format pure Arabic verses with Amiri class if detected
  if (isPureArabicText(cleanQuestion)) {
    // Already handled in layout
  }

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
        ${article.content}
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
 * Triggers the browser's native vector PDF print/save engine via an isolated iframe.
 * Ensures:
 * 1. 100% selectable and copyable vector text.
 * 2. True A4 paging with CSS page-break rules and orphan prevention.
 * 3. Correct Arabic RTL text shaping with embedded Amiri font.
 * 4. Sets document title so the browser defaults the filename to e.g. tanya-jawab-topik.pdf
 */
export async function exportDocumentToPdf(htmlContent: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Create hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.visibility = 'hidden';

      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        throw new Error('Tidak dapat menginisialisasi lingkungan pencetakan dokumen PDF.');
      }

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      // Wait for fonts & images to load in the iframe
      const win = iframe.contentWindow;
      if (!win) {
        document.body.removeChild(iframe);
        throw new Error('Window pencetakan tidak tersedia.');
      }

      // Set document title so the print dialog uses it as the default PDF filename
      iframeDoc.title = filename.replace(/\.pdf$/i, '');

      const triggerPrint = () => {
        try {
          win.focus();
          win.print();
          // Cleanup after print dialog closes
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            resolve();
          }, 1500);
        } catch (printErr) {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          reject(printErr);
        }
      };

      // Check if document.fonts API is available in iframe
      if (iframeDoc.fonts && typeof iframeDoc.fonts.ready !== 'undefined') {
        iframeDoc.fonts.ready.then(() => {
          setTimeout(triggerPrint, 500);
        }).catch(() => {
          setTimeout(triggerPrint, 600);
        });
      } else {
        setTimeout(triggerPrint, 700);
      }
    } catch (err) {
      reject(err);
    }
  });
}
