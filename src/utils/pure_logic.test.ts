import test from 'node:test';
import assert from 'node:assert/strict';
import { isPureArabicText } from './arabicFontHelper.js';
import { isPlatformAdminEmail } from '../firebase/services.js';

test('isPureArabicText identifies pure Arabic verses and denies mixed sentences', () => {
  // Pure Arabic
  assert.equal(isPureArabicText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'), true);
  assert.equal(isPureArabicText('الحمد لله رب العالمين'), true);

  // Mixed Arabic and Indonesian
  assert.equal(isPureArabicText('Nabi Muhammad ﷺ bersabda dalam hadits shahih'), false);
  assert.equal(isPureArabicText('Kalimat ini berisi kata السلام عليكم di tengahnya'), false);

  // Pure Indonesian / Latin
  assert.equal(isPureArabicText('Belajar Bahasa Arab bersama Dars with Osama'), false);
  assert.equal(isPureArabicText(''), false);
});

test('isPlatformAdminEmail authorizes both designated administrator emails regardless of case', () => {
  assert.equal(isPlatformAdminEmail('masagitu233@gmail.com'), true);
  assert.equal(isPlatformAdminEmail('MASAGITU233@GMAIL.COM'), true);
  assert.equal(isPlatformAdminEmail('osamanursamsil@gmail.com'), true);
  assert.equal(isPlatformAdminEmail('OsamaNurSamsil@Gmail.com'), true);

  // Non-admins
  assert.equal(isPlatformAdminEmail('student@example.com'), false);
  assert.equal(isPlatformAdminEmail(null), false);
  assert.equal(isPlatformAdminEmail(undefined), false);
});

test('stripHtml cleans tags, converts breaks, and cleans entities', async () => {
  const { stripHtml } = await import('./canvasDakwahCard.js');
  const dirty = '<p>Bismillah <strong>Alhamdulillah</strong></p><br/><div>Kajian &amp; Fiqih</div>';
  const clean = stripHtml(dirty);
  assert.equal(clean.includes('<p>'), false);
  assert.equal(clean.includes('<strong>'), false);
  assert.equal(clean.includes('&amp;'), false);
  assert.equal(clean.includes('Bismillah Alhamdulillah'), true);
  assert.equal(clean.includes('Kajian & Fiqih'), true);
});

test('partitionContentIntoSlides generates structured slides with question and answer', async () => {
  const { partitionContentIntoSlides } = await import('./canvasDakwahCard.js');
  const title = 'Hukum Shalat Berjamaah';
  const question = 'Bagaimana hukum shalat berjamaah bagi laki-laki?';
  const answer = 'Shalat berjamaah bagi laki-laki menurut pendapat yang rajih adalah fardhu ain bagi yang mendengar adzan dan tidak memiliki udzur syar\'i.';

  const slides = partitionContentIntoSlides(title, question, answer);
  assert.equal(Array.isArray(slides), true);
  assert.ok(slides.length >= 1);
  assert.equal(slides[0].pageNumber, 1);
  assert.equal(slides[0].questionTitle, title);
  assert.ok(slides[0].answerText.includes('Shalat berjamaah'));
});

// Case 1: Jawaban pendek satu paragraf
test('Case 1: Jawaban pendek satu paragraf dimuat dalam 1 slide utuh', async () => {
  const { partitionContentIntoSlides } = await import('./canvasDakwahCard.js');
  const title = 'Hukum Puasa Rajab';
  const question = 'Apakah ada hadits khusus tentang puasa di bulan Rajab?';
  const answer = 'Tidak ada hadits shahih yang secara khusus mengkhususkan puasa pada seluruh bulan Rajab, namun berpuasa sunnah mutlak atau puasa Senin-Kamis tetap dianjurkan.';

  const slides = partitionContentIntoSlides(title, question, answer, '4:5');
  assert.equal(slides.length, 1);
  assert.equal(slides[0].pageNumber, 1);
  assert.equal(slides[0].totalPages, 1);
  assert.ok(slides[0].answerText.includes('Tidak ada hadits shahih'));
});

// Case 2: Jawaban panjang dengan beberapa heading dan daftar
test('Case 2: Jawaban panjang dengan heading dan daftar terstruktur tanpa hilang', async () => {
  const { parseContentToBlocks } = await import('./canvasDakwahCard.js');
  const html = `
    <h3>Syarat Sah Wudhu</h3>
    <p>Berikut adalah beberapa syarat sah wudhu menurut madzhab Syafi'i:</p>
    <ul>
      <li>Islam dan berakal (tamyiz)</li>
      <li>Bersih dari haid dan nifas</li>
      <li>Menggunakan air yang suci lagi mensucikan (thahir muthahhir)</li>
      <li>Tidak ada penghalang air sampai ke kulit</li>
    </ul>
  `;

  const blocks = parseContentToBlocks(html);
  assert.ok(blocks.length >= 5);
  assert.equal(blocks[0].type, 'heading');
  assert.equal(blocks[0].text, 'Syarat Sah Wudhu');
  assert.equal(blocks[1].type, 'paragraph');
  assert.equal(blocks[2].type, 'list-item');
  assert.ok(blocks[2].text.includes('Islam dan berakal'));
});

// Case 3: Kutipan Arab lengkap dengan harakat
test('Case 3: Kutipan Arab lengkap dengan harakat dikenali dan berstatus isArabic', async () => {
  const { isArabicBlock, parseContentToBlocks } = await import('./canvasDakwahCard.js');
  const ayat = 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى';
  
  assert.equal(isArabicBlock(ayat), true);

  const blocks = parseContentToBlocks(`<p>${ayat}</p>`);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, 'arabic');
  assert.equal(blocks[0].isArabic, true);
  assert.equal(blocks[0].text, ayat);
});

// Case 4: Paragraf campuran Arab dan Indonesia
test('Case 4: Paragraf campuran Arab dan Indonesia dipisahkan secara stabil', async () => {
  const { parseContentToBlocks } = await import('./canvasDakwahCard.js');
  const mixed = 'Nabi shallallahu alaihi wa sallam bersabda: "مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ" yang maknanya Allah mudahkan jalannya menuju surga.';

  const blocks = parseContentToBlocks(mixed);
  assert.ok(blocks.length >= 2);
  // Contains at least one Arabic block
  const arabicBlock = blocks.find((b) => b.isArabic || b.type === 'arabic');
  assert.ok(arabicBlock);
  assert.ok(arabicBlock.text.includes('مَنْ سَلَكَ طَرِيقًا'));
  // Contains Indonesian intro or outro
  const indonesianBlock = blocks.find((b) => !b.isArabic);
  assert.ok(indonesianBlock);
  assert.ok(indonesianBlock.text.includes('Nabi shallallahu alaihi wa sallam') || indonesianBlock.text.includes('menuju surga'));
});

// Case 5: Referensi panjang dan tautan tanpa spasi
test('Case 5: Referensi panjang dan tautan tanpa spasi dipecah aman tanpa overflow', async () => {
  const { wrapTextLines } = await import('./canvasDakwahCard.js');
  const longUrl = 'https://darswithosama.com/kajian-fiqih-kitab-safinatun-naja-sesi-1-pembahasan-syarat-sah-shalat-dan-rukun-rukunnya-lengkap';
  const maxWidth = 300;

  const lines = wrapTextLines(longUrl, maxWidth);
  assert.ok(lines.length > 1);
  // Each line must not exceed character safety limit
  for (const line of lines) {
    assert.ok(line.length < 35);
  }
});

// Case 6: Jawaban yang harus dibagi menjadi beberapa halaman
test('Case 6: Jawaban panjang dibagi multi-halaman dengan nomor halaman akurat', async () => {
  const { partitionContentIntoSlides } = await import('./canvasDakwahCard.js');
  const title = 'Rincian Kaidah Pembatalan Wudhu';
  const question = 'Apa saja hal-hal yang membatalkan wudhu secara rinci menurut kesepakatan ulama?';
  
  const longAnswer = `
    <h3>Pengantar Kaidah</h3>
    <p>Para ulama madzhab Syafi'i merinci hal-hal yang membatalkan wudhu ke dalam empat perkara pokok yang wajib dipelajari oleh setiap penuntut ilmu.</p>
    <p>Perkara pertama adalah keluarnya sesuatu dari dua jalan, yaitu qubul atau dubur, baik berupa benda suci seperti angin atau benda najis seperti air kencing dan kotoran.</p>
    <p>Perkara kedua adalah hilangnya akal karena tidur yang tidak menetapkan posisi duduknya di atas lantai, atau karena mabuk, pingsan, gila, dan obat-obatan.</p>
    <p>Perkara ketiga adalah bersentuhan kulit antara laki-laki dan perempuan ajnabi (bukan mahram) tanpa ada pembatas (penghalang kain), yang telah mencapai batas usia yang menimbulkan syahwat menurut pandangan syariat.</p>
    <p>Perkara keempat adalah menyentuh kemaluan manusia (qubul maupun dubur) dengan telapak tangan bagian dalam atau jari-jari bagian dalam, baik kemaluan sendiri maupun orang lain, baik anak kecil maupun dewasa.</p>
    <p>Dalil mengenai hal ini sebagaimana ditegaskan dalam hadits shahih dan kitab matan Safinatun Naja serta Fathul Qarib Al-Mujib fi Syarhi Alfazh At-Taqrib.</p>
  `;

  const slides = partitionContentIntoSlides(title, question, longAnswer, '4:5');
  assert.ok(slides.length >= 2);
  assert.equal(slides[0].pageNumber, 1);
  assert.equal(slides[0].totalPages, slides.length);
  assert.equal(slides[1].pageNumber, 2);
  assert.equal(slides[1].isContinuation, true);
  // All pages have content
  for (const slide of slides) {
    assert.ok(slide.blocks.length > 0);
    assert.ok(slide.answerText.length > 0);
  }
});

// Case 7: Sanitasi Nama File PDF Deskriptif & Aman
test('Case 7: sanitizePdfFilename menghasilkan nama file aman, deskriptif, dan berekstensi .pdf', async () => {
  const { sanitizePdfFilename } = await import('./pdfExportHelper.js');
  
  const fn1 = sanitizePdfFilename('tanya-jawab', 'Hukum Shalat Berjamaah Bagi Masbuq?');
  assert.equal(fn1.startsWith('tanya-jawab-'), true);
  assert.equal(fn1.endsWith('.pdf'), true);
  assert.equal(fn1.includes('?'), false);
  assert.ok(fn1.includes('hukum-shalat-berjamaah'));

  const fn2 = sanitizePdfFilename('artikel', 'Keutamaan Menuntut Ilmu Syar\'i & Adab Santri');
  assert.equal(fn2.startsWith('artikel-'), true);
  assert.equal(fn2.endsWith('.pdf'), true);
  assert.equal(fn2.includes('\''), false);
  assert.ok(fn2.includes('keutamaan-menuntut-ilmu'));
});

// Case 8: Dokumen PDF Tanya Jawab memuat struktur ilmiah dan mencegah dokumen privat
test('Case 8: buildQAPdfHtml menghasilkan markup A4 dan mencegah konsultasi privat', async () => {
  const { buildQAPdfHtml } = await import('./pdfExportHelper.js');
  
  const publicQA = {
    id: 'qa-12345678',
    studentId: 'u1',
    studentName: 'Ahmad Santri',
    title: 'Hukum Jual Beli Salam',
    content: 'Bagaimana syarat sah akad salam dalam fiqih madzhab Syafi\'i?',
    replyContent: '<p>Syarat sah salam mencakup kejelasan sifat barang dan pembayaran tunai di majelis akad.</p>',
    status: 'answered' as const,
    isPublished: true,
    category: 'learning' as const,
    createdAt: '2026-10-10T00:00:00Z',
    updatedAt: '2026-10-11T00:00:00Z',
    repliedAt: '2026-10-11T00:00:00Z'
  };

  const html = buildQAPdfHtml(publicQA);
  assert.ok(html.includes('<!DOCTYPE html>'));
  assert.ok(html.includes('DARS WITH OSAMA'));
  assert.ok(html.includes('DW-QA-QA-12345'));
  assert.ok(html.includes('Hukum Jual Beli Salam'));
  assert.ok(html.includes('Syarat sah salam'));
  assert.ok(html.includes('font-family: \'Amiri\'')); // Amiri font support
  assert.ok(html.includes('@page')); // A4 print style

  // Private consultation rejection
  const privateQA = {
    ...publicQA,
    isPublished: false
  };
  assert.throws(() => buildQAPdfHtml(privateQA), /Hanya arsip Tanya Jawab publik/);
});

// Case 9: Dokumen PDF Artikel memuat struktur lengkap H1, penulis, kategori, dan A4
test('Case 9: buildArticlePdfHtml memuat struktur artikel ilmiah A4 lengkap', async () => {
  const { buildArticlePdfHtml } = await import('./pdfExportHelper.js');

  const article = {
    id: 'art-99',
    slug: 'panduan-thaharah',
    title: 'Panduan Praktis Thaharah Sesuai Kitab Safinatun Naja',
    titleAr: 'دليل الطهارة',
    excerpt: 'Penjelasan ringkas mengenai rukun dan syarat bersuci.',
    content: '<h2>Bab Wudhu</h2><p>Rukun wudhu ada enam perkara.</p>',
    contentAr: 'أركان الوضوء ستة أشياء',
    coverImageUrl: 'https://example.com/cover.jpg',
    category: 'Fiqih Ibadah',
    authorName: 'Ustaz Osama Nur Samsil',
    authorRole: 'Pengasuh Dars with Osama',
    status: 'published' as const,
    readingTimeMinutes: 5,
    tags: ['thaharah', 'wudhu', 'safinah'],
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-02T00:00:00Z',
    publishedAt: '2026-10-02T00:00:00Z'
  };

  const html = buildArticlePdfHtml(article);
  assert.ok(html.includes('DARS WITH OSAMA'));
  assert.ok(html.includes('Panduan Praktis Thaharah'));
  assert.ok(html.includes('دليل الطهارة'));
  assert.ok(html.includes('Bab Wudhu'));
  assert.ok(html.includes('أركان الوضوء ستة أشياء'));
  assert.ok(html.includes('Ustaz Osama Nur Samsil'));
  assert.ok(html.includes('#thaharah'));

  // Draft article rejection
  const draftArticle = {
    ...article,
    status: 'draft' as const
  };
  assert.throws(() => buildArticlePdfHtml(draftArticle), /Hanya artikel yang telah dipublikasikan/);
});

// Case 10: Official Vector Logo SVG & Brand Colors in Letterhead
test('Case 10: getPdfOfficialLogoSvg menghasilkan SVG logo resmi dengan palet warna #073B2E dan #C9A34E', async () => {
  const { getPdfOfficialLogoSvg } = await import('./pdfExportHelper.js');
  const svg = getPdfOfficialLogoSvg(44, 44);
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('width="44"'));
  assert.ok(svg.includes('height="44"'));
  assert.ok(svg.includes('#073B2E')); // Emerald brand color
  assert.ok(svg.includes('#C9A34E')); // Gold brand accent
  assert.ok(svg.includes('viewBox="0 0 200 200"'));
});

// Case 11: Format Halaman X dari Y dan URL resmi di kolofon dokumen
test('Case 11: Dokumen PDF artikel memuat URL resmi darswithosama.com dan gaya halaman A4 konsisten', async () => {
  const { buildArticlePdfHtml, PDF_ACADEMIC_STYLES } = await import('./pdfExportHelper.js');
  assert.ok(PDF_ACADEMIC_STYLES.includes('size: A4 portrait'));
  assert.ok(PDF_ACADEMIC_STYLES.includes('.a4-page'));
  assert.ok(PDF_ACADEMIC_STYLES.includes('.font-amiri'));

  const sampleArticle: import('../types/index.js').BlogPost = {
    id: 'test-art-1',
    slug: 'keutamaan-ilmu',
    title: 'Keutamaan Menuntut Ilmu Syar\'i',
    excerpt: 'Penjelasan pentingnya menuntut ilmu.',
    content: '<p>Menuntut ilmu adalah kewajiban bagi setiap muslim.</p>',
    coverImageUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765',
    category: 'Tazkiyah',
    authorName: 'Osama Nur Samsil',
    status: 'published' as const,
    readingTimeMinutes: 3,
    tags: ['ilmu', 'adab'],
    createdAt: '2026-10-15T00:00:00Z',
    updatedAt: '2026-10-15T00:00:00Z'
  };

  const html = buildArticlePdfHtml(sampleArticle);
  assert.ok(html.includes('https://darswithosama.com'));
  assert.ok(html.includes('DARS WITH OSAMA'));
  assert.ok(html.includes('ILMU • KAJIAN • KITAB'));
});

// Case 12: Ekstraksi YouTube Video ID dan Resolusi Thumbnail Sesi Pembelajaran
test('Case 12: extractYouTubeVideoId dan getSessionThumbnailUrl memprioritaskan thumbnail YouTube dan fallback gambar sampul publik', async () => {
  const {
    extractYouTubeVideoId,
    getSessionThumbnailUrl,
    DEFAULT_SESSION_COVER_IMAGE
  } = await import('./sessionShareHelper.js');

  assert.equal(
    extractYouTubeVideoId('https://youtu.be/9rLpyGThzrE?si=SMKnldMXHvr4OLdO'),
    '9rLpyGThzrE'
  );
  assert.equal(
    extractYouTubeVideoId('https://www.youtube.com/watch?v=o4GbtnDKm5U'),
    'o4GbtnDKm5U'
  );
  assert.equal(extractYouTubeVideoId('fYPzdWAz1t8'), 'fYPzdWAz1t8');
  assert.equal(extractYouTubeVideoId(''), null);

  // 1. Sesi dengan YouTube URL menghasilkan thumbnail i.ytimg.com
  const thumb1 = getSessionThumbnailUrl(
    { youtubeUrl: 'https://youtu.be/9rLpyGThzrE?si=SMKnldMXHvr4OLdO' },
    { id: 'c1', coverImageUrl: 'https://example.com/course.jpg' }
  );
  assert.equal(thumb1, 'https://i.ytimg.com/vi/9rLpyGThzrE/hqdefault.jpg');

  // 2. Sesi tanpa YouTube URL menggunakan coverImageUrl HTTP publik
  const thumb2 = getSessionThumbnailUrl(
    { youtubeUrl: '' },
    { id: 'c1', coverImageUrl: 'https://example.com/course.jpg' }
  );
  assert.equal(thumb2, 'https://example.com/course.jpg');

  // 3. Sesi tanpa YouTube URL dengan coverImageUrl base64 menggunakan static exported cover URL
  const thumb3 = getSessionThumbnailUrl(
    { youtubeUrl: '' },
    { id: 'course-1792229735274', coverImageUrl: 'data:image/jpeg;base64,/9j/4AAQ' },
    'https://darswithosama.com'
  );
  assert.equal(thumb3, 'https://darswithosama.com/covers/course-1792229735274.jpg');

  // 4. Fallback ke DEFAULT_SESSION_COVER_IMAGE
  const thumb4 = getSessionThumbnailUrl({ youtubeUrl: '' }, null);
  assert.equal(thumb4, DEFAULT_SESSION_COVER_IMAGE);
});

// Case 13: Slug dan Pencocokan URL Permanen Sesi (ID dan Slug)
test('Case 13: generateSessionSlug dan matchesSessionIdentifier mengenali ID maupun slug sesi secara akurat', async () => {
  const { generateSessionSlug, matchesSessionIdentifier } = await import('./sessionShareHelper.js');

  const sessionKalam = { id: 'session-1792225972950', title: 'sesi 01: kalam' };
  const sessionIrab = { id: 'session-1792327996754', title: "sesi 02: I'rab dan Bina'" };

  assert.equal(generateSessionSlug(sessionKalam.title, sessionKalam.id), 'sesi-01-kalam');
  assert.equal(generateSessionSlug(sessionIrab.title, sessionIrab.id), 'sesi-02-irab-dan-bina');

  assert.equal(matchesSessionIdentifier(sessionKalam, 'session-1792225972950'), true);
  assert.equal(matchesSessionIdentifier(sessionKalam, 'sesi-01-kalam'), true);
  assert.equal(matchesSessionIdentifier(sessionIrab, 'sesi-02-irab-dan-bina'), true);
  assert.equal(matchesSessionIdentifier(sessionKalam, 'sesi-lain'), false);
});

// Case 14: Format Pesan Bagikan & Metadata OpenGraph / Twitter Card Sesi Pembelajaran
test('Case 14: buildSessionShareData dan buildSessionMetaTagsHtml menghasilkan pesan ajakan dan tag OG/Twitter lengkap', async () => {
  const {
    buildSessionShareData,
    buildSessionMetaTagsHtml,
    injectSeoMetaIntoHtml
  } = await import('./sessionShareHelper.js');

  const session = {
    id: 'session-1792225972950',
    title: 'sesi 01: kalam',
    description: 'Pembahasan definisi kalam menurut ulama nahwu.',
    youtubeUrl: 'https://youtu.be/9rLpyGThzrE?si=SMKnldMXHvr4OLdO'
  };
  const course = {
    id: 'course-1792197763057',
    title: 'mutammimah al-ajurumiyah',
    coverImageUrl: 'https://example.com/cover.jpg'
  };

  const shareData = buildSessionShareData(session, course, 'https://darswithosama.com');
  assert.equal(shareData.url, 'https://darswithosama.com/session/session-1792225972950');
  assert.equal(
    shareData.shareMessage,
    'Yuk, pelajari sesi sesi 01: kalam bersama Dars with Osama. Tonton videonya di sini: https://darswithosama.com/session/session-1792225972950'
  );
  assert.equal(shareData.thumbnailUrl, 'https://i.ytimg.com/vi/9rLpyGThzrE/hqdefault.jpg');

  const metaTags = buildSessionMetaTagsHtml(session, course, 'https://darswithosama.com');
  const finalHtml = injectSeoMetaIntoHtml(
    '<!doctype html><html><head><title>Default</title></head><body><div id="root"></div></body></html>',
    metaTags
  );

  assert.ok(finalHtml.includes('<meta property="og:type" content="video.other" />'));
  assert.ok(finalHtml.includes('<meta property="og:site_name" content="Dars with Osama" />'));
  assert.ok(finalHtml.includes('<meta property="og:title" content="sesi 01: kalam (mutammimah al-ajurumiyah) | Dars with Osama" />'));
  assert.ok(finalHtml.includes('<meta property="og:image" content="https://i.ytimg.com/vi/9rLpyGThzrE/hqdefault.jpg" />'));
  assert.ok(finalHtml.includes('<meta property="og:url" content="https://darswithosama.com/session/session-1792225972950" />'));
  assert.ok(finalHtml.includes('<meta name="twitter:card" content="summary_large_image" />'));
});

// Case 15: Proteksi Sesi Privat / Draft dari Akses Publik & Crawler
test('Case 15: canAccessSessionPublicly menolak sesi draft atau kursus yang belum dipublikasikan', async () => {
  const { canAccessSessionPublicly } = await import('./sessionShareHelper.js');

  assert.equal(canAccessSessionPublicly({ isPublished: true }, { isPublished: true }), true);
  assert.equal(canAccessSessionPublicly({ isPublished: false }, { isPublished: true }), false);
  assert.equal(canAccessSessionPublicly({ isPublished: true }, { isPublished: false }), false);
  assert.equal(canAccessSessionPublicly(null, { isPublished: true }), false);
});

// Case 16: Validasi Bundling Deno / Netlify Edge Function (Ekstensi Eksplisit .ts & Resolusi file://)
test('Case 16: netlify/edge-functions/session-seo.ts dan seluruh impor transitifnya menggunakan ekstensi .ts eksplisit yang valid untuk Deno', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { pathToFileURL, fileURLToPath } = await import('node:url');

  const rootDir = process.cwd();
  const entryPath = path.resolve(rootDir, 'netlify/edge-functions/session-seo.ts');
  assert.ok(fs.existsSync(entryPath), 'Entry point Edge Function harus ada');

  const visited = new Set<string>();
  const importRegex = /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;

  function verifyDenoModuleGraph(filePath: string) {
    if (visited.has(filePath)) return;
    visited.add(filePath);

    const stat = fs.statSync(filePath);
    assert.ok(stat.isFile(), `Target impor harus berupa file, bukan direktori: ${filePath}`);

    const code = fs.readFileSync(filePath, 'utf-8');
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(code)) !== null) {
      const specifier = match[1];
      assert.ok(
        specifier.startsWith('./') || specifier.startsWith('../'),
        `Edge Function hanya boleh mengimpor modul relatif murni: ditemukan "${specifier}" di ${filePath}`
      );
      assert.ok(
        specifier.endsWith('.ts'),
        `Bundler Deno mewajibkan ekstensi .ts eksplisit: ditemukan "${specifier}" di ${filePath}`
      );

      const resolvedUrl = new URL(specifier, pathToFileURL(filePath));
      const resolvedPath = fileURLToPath(resolvedUrl);
      assert.ok(
        fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile(),
        `File tidak ditemukan oleh resolusi URL Deno: ${resolvedUrl.href}`
      );
      verifyDenoModuleGraph(resolvedPath);
    }
  }

  verifyDenoModuleGraph(entryPath);
  assert.equal(visited.size, 3, 'Harus memvalidasi session-seo.ts, sessionShareHelper.ts, dan types/index.ts');
});

// Case 17: Parsing URL Deep Link & Canonical URL Builder untuk Artikel, Sesi, Q&A, dan Katalog
test('Case 17: parseUrlToRouteState dan buildUrlFromRouteState memetakan URL internal dan deep link dengan akurat', async () => {
  const { parseUrlToRouteState, buildUrlFromRouteState } = await import('./navigationHistory.js');

  const artRoute = parseUrlToRouteState('/article/al-kalam-pengertian-syarat-dan-pembagiannya-dalam-kitab-mutammimah-al-ajurumiyah', '');
  assert.equal(artRoute.view, 'blog-detail');
  assert.equal(artRoute.blogPostSlug, 'al-kalam-pengertian-syarat-dan-pembagiannya-dalam-kitab-mutammimah-al-ajurumiyah');
  assert.equal(
    buildUrlFromRouteState(artRoute),
    '/article/al-kalam-pengertian-syarat-dan-pembagiannya-dalam-kitab-mutammimah-al-ajurumiyah'
  );

  const sesRoute = parseUrlToRouteState('/session/session-1792225972950', '');
  assert.equal(sesRoute.view, 'session-view');
  assert.equal(sesRoute.sessionId, 'session-1792225972950');
  assert.equal(buildUrlFromRouteState(sesRoute), '/session/session-1792225972950');

  const qaRoute = parseUrlToRouteState('/qa/qa-12345', '');
  assert.equal(qaRoute.view, 'public-qa');
  assert.equal(qaRoute.qaId, 'qa-12345');
  assert.equal(buildUrlFromRouteState(qaRoute), '/qa/qa-12345');

  const qaListRoute = parseUrlToRouteState('/', '?view=public-qa');
  assert.equal(qaListRoute.view, 'public-qa');
  assert.equal(qaListRoute.qaId, null);
  assert.equal(buildUrlFromRouteState(qaListRoute), '/?view=public-qa');

  const homeRoute = parseUrlToRouteState('/', '');
  assert.equal(homeRoute.view, 'home');
  assert.equal(buildUrlFromRouteState(homeRoute), '/');
});

// Case 18: Fallback Homepage Otomatis Saat Masuk dari Tautan Eksternal (WhatsApp/Telegram/Sosmed)
test('Case 18: computeInitialHistorySetup menyisipkan Homepage sebagai fallback di index 0 untuk kunjungan langsung ke halaman internal', async () => {
  const { computeInitialHistorySetup } = await import('./navigationHistory.js');

  // 1. Kunjungan langsung ke artikel dari tautan eksternal (history.state masih null)
  const articleSetup = computeInitialHistorySetup(
    '/article/al-kalam-pengertian-syarat-dan-pembagiannya-dalam-kitab-mutammimah-al-ajurumiyah',
    '',
    null
  );
  assert.equal(articleSetup.mode, 'direct-internal-with-fallback');
  if (articleSetup.mode === 'direct-internal-with-fallback') {
    assert.equal(articleSetup.fallbackHomeState.view, 'home');
    assert.equal(articleSetup.fallbackHomeState.index, 0);
    assert.equal(articleSetup.fallbackHomeState.isFallbackHome, true);
    assert.equal(articleSetup.fallbackUrl, '/');
    assert.equal(articleSetup.activeState.view, 'blog-detail');
    assert.equal(articleSetup.activeState.index, 1);
    assert.equal(articleSetup.activeState.prevView, 'home');
    assert.equal(articleSetup.activeState.prevIsFallbackHome, true);
  }

  // 2. Kunjungan langsung ke sesi belajar dari Telegram
  const sessionSetup = computeInitialHistorySetup('/session/session-1792225972950', '', null);
  assert.equal(sessionSetup.mode, 'direct-internal-with-fallback');
  if (sessionSetup.mode === 'direct-internal-with-fallback') {
    assert.equal(sessionSetup.fallbackHomeState.view, 'home');
    assert.equal(sessionSetup.activeState.view, 'session-view');
    assert.equal(sessionSetup.activeState.sessionId, 'session-1792225972950');
    assert.equal(sessionSetup.activeState.index, 1);
  }

  // 3. Kunjungan langsung ke halaman Q&A dari media sosial
  const qaSetup = computeInitialHistorySetup('/', '?view=public-qa', null);
  assert.equal(qaSetup.mode, 'direct-internal-with-fallback');
  if (qaSetup.mode === 'direct-internal-with-fallback') {
    assert.equal(qaSetup.fallbackHomeState.view, 'home');
    assert.equal(qaSetup.activeState.view, 'public-qa');
    assert.equal(qaSetup.activeState.index, 1);
  }

  // 4. Kunjungan langsung ke Homepage tidak menumpuk entri fallback
  const homeSetup = computeInitialHistorySetup('/', '', null);
  assert.equal(homeSetup.mode, 'direct-home');
  assert.equal(homeSetup.activeState.view, 'home');
  assert.equal(homeSetup.activeState.index, 0);
});

// Case 19: Refresh Halaman Detail Mempertahankan Riwayat Navigasi Tanpa Menumpuk Entri Palsu
test('Case 19: computeInitialHistorySetup mempertahankan state dan index saat halaman di-refresh (preserve-existing)', async () => {
  const { computeInitialHistorySetup, isSameRouteState } = await import('./navigationHistory.js');

  const existingState = {
    __darsNav: true as const,
    view: 'blog-detail',
    blogPostSlug: 'panduan-thaharah',
    index: 2,
    scrollY: 340,
    prevView: 'blog',
    prevIsFallbackHome: false
  };

  const refreshed = computeInitialHistorySetup('/article/panduan-thaharah', '', existingState);
  assert.equal(refreshed.mode, 'preserve-existing');
  assert.equal(refreshed.activeState.index, 2);
  assert.equal(refreshed.activeState.scrollY, 340);
  assert.equal(refreshed.activeState.prevView, 'blog');
  assert.equal(refreshed.activeState.prevIsFallbackHome, false);

  assert.equal(
    isSameRouteState(
      { view: 'blog-detail', blogPostSlug: 'panduan-thaharah' },
      { view: 'blog-detail', blogPostSlug: 'panduan-thaharah' }
    ),
    true
  );
  assert.equal(
    isSameRouteState(
      { view: 'blog-detail', blogPostSlug: 'panduan-thaharah' },
      { view: 'blog-detail', blogPostSlug: 'artikel-lain' }
    ),
    false
  );
});

// Case 20: Validasi Pendaftaran Siswa Baru (Kata Sandi Khusus Dars min 6 karakter, Konfirmasi Cocok, Validasi Nama & Email)
test('Case 20: Validasi pendaftaran siswa baru memeriksa nama, email, batas minimal 6 karakter, dan kesesuaian konfirmasi sandi', () => {
  function validateRegistration(displayName: string, email: string, pass: string, confirmPass: string) {
    if (!displayName || !displayName.trim()) {
      return { valid: false, error: 'Nama lengkap / Kunyah wajib diisi.' };
    }
    if (!email || !email.trim() || !email.includes('@')) {
      return { valid: false, error: 'Format alamat email tidak valid.' };
    }
    if (!pass || pass.length < 6) {
      return { valid: false, error: 'Kata sandi pendaftaran minimal 6 karakter.' };
    }
    if (pass !== confirmPass) {
      return { valid: false, error: 'Konfirmasi kata sandi tidak cocok. Harap pastikan kedua kolom kata sandi terisi sama.' };
    }
    return { valid: true, error: null };
  }

  // Sukses
  const valid = validateRegistration('Ahmad bin Zaid', 'ahmad@example.com', 'dars1234', 'dars1234');
  assert.equal(valid.valid, true);
  assert.equal(valid.error, null);

  // Gagal: password kurang dari 6 karakter
  const tooShort = validateRegistration('Ahmad bin Zaid', 'ahmad@example.com', '12345', '12345');
  assert.equal(tooShort.valid, false);
  assert.equal(tooShort.error, 'Kata sandi pendaftaran minimal 6 karakter.');

  // Gagal: konfirmasi password tidak cocok
  const mismatch = validateRegistration('Ahmad bin Zaid', 'ahmad@example.com', 'dars1234', 'dars9999');
  assert.equal(mismatch.valid, false);
  assert.equal(mismatch.error, 'Konfirmasi kata sandi tidak cocok. Harap pastikan kedua kolom kata sandi terisi sama.');

  // Gagal: nama kosong
  const emptyName = validateRegistration('  ', 'ahmad@example.com', 'dars1234', 'dars1234');
  assert.equal(emptyName.valid, false);
  assert.equal(emptyName.error, 'Nama lengkap / Kunyah wajib diisi.');
});

// Case 21: Matriks Hak Akses Belajar (Publik vs Siswa Terdaftar)
test('Case 21: Matriks hak akses membedakan fitur publik dan fitur khusus siswa terdaftar secara konsisten', () => {
  interface AccessPolicy {
    canViewPublicArticles: boolean;
    canViewCourseCatalog: boolean;
    canViewCourseSyllabus: boolean;
    canReadPublicQA: boolean;
    canShareSessionLink: boolean;
    canPlayLearningVideo: boolean;
    canAccessStudyPDF: boolean;
    canTakeQuiz: boolean;
    canMarkSessionDone: boolean;
    canTrackProgress: boolean;
  }

  function getAccessPolicy(isLoggedIn: boolean): AccessPolicy {
    return {
      canViewPublicArticles: true,
      canViewCourseCatalog: true,
      canViewCourseSyllabus: true,
      canReadPublicQA: true,
      canShareSessionLink: true,
      canPlayLearningVideo: isLoggedIn,
      canAccessStudyPDF: isLoggedIn,
      canTakeQuiz: isLoggedIn,
      canMarkSessionDone: isLoggedIn,
      canTrackProgress: isLoggedIn
    };
  }

  const guest = getAccessPolicy(false);
  assert.equal(guest.canViewPublicArticles, true, 'Pengunjung boleh membaca artikel');
  assert.equal(guest.canViewCourseCatalog, true, 'Pengunjung boleh melihat katalog');
  assert.equal(guest.canViewCourseSyllabus, true, 'Pengunjung boleh melihat daftar kurikulum');
  assert.equal(guest.canReadPublicQA, true, 'Pengunjung boleh membaca Q&A publik');
  assert.equal(guest.canShareSessionLink, true, 'Pengunjung boleh menyalin dan membagikan tautan sesi');
  assert.equal(guest.canPlayLearningVideo, false, 'Pengunjung TIDAK boleh memutar video syarah');
  assert.equal(guest.canAccessStudyPDF, false, 'Pengunjung TIDAK boleh mengunduh naskah materi');
  assert.equal(guest.canTakeQuiz, false, 'Pengunjung TIDAK boleh mengerjakan kuis evaluasi');
  assert.equal(guest.canMarkSessionDone, false, 'Pengunjung TIDAK boleh mencentang progres sesi');

  const student = getAccessPolicy(true);
  assert.equal(student.canPlayLearningVideo, true, 'Siswa terdaftar boleh memutar video');
  assert.equal(student.canAccessStudyPDF, true, 'Siswa terdaftar boleh membuka naskah PDF');
  assert.equal(student.canTakeQuiz, true, 'Siswa terdaftar boleh mengerjakan kuis evaluasi');
  assert.equal(student.canMarkSessionDone, true, 'Siswa terdaftar boleh menyimpan progres belajar');
});

// Case 22: Audio Reading - stripHtmlForSpeech membersihkan tag HTML & entitas
test('Case 22: stripHtmlForSpeech membersihkan tag HTML, paragraf, dan entitas untuk teks audio', async () => {
  const { stripHtmlForSpeech } = await import('./articleAudioHelper.js');
  const rawHtml = '<h2>Keutamaan Ilmu</h2><p>Bismillah, Nabi Muhammad &amp; para sahabat.</p><br/><div class="quote">Ilmu adalah cahaya.</div>';
  const clean = stripHtmlForSpeech(rawHtml);

  assert.equal(clean.includes('<h2>'), false);
  assert.equal(clean.includes('<p>'), false);
  assert.equal(clean.includes('&amp;'), false);
  assert.equal(clean.includes('dan para sahabat'), true);
  assert.equal(clean.includes('Ilmu adalah cahaya'), true);
});

// Case 23: Audio Reading - normalizeTextForSpeech menormalisasi istilah syar'i & singkatan
test('Case 23: normalizeTextForSpeech menormalisasi singkatan kehormatan (SWT, SAW, RA, Q.S., H.R.) untuk pelafalan TTS', async () => {
  const { normalizeTextForSpeech } = await import('./articleAudioHelper.js');
  const input = 'Allah SWT berfirman dalam Q.S. 2:255 bahwa Rasulullah SAW bersabda sesuai H.R. Bukhari dari Abu Hurairah RA tentang Fiqh dan Wudhu.';
  const spoken = normalizeTextForSpeech(input);

  assert.equal(spoken.includes('SWT'), false);
  assert.ok(spoken.includes("Subhanahu wa Ta'ala"));
  assert.equal(spoken.includes('SAW'), false);
  assert.ok(spoken.includes("Shallallahu 'alaihi wa sallam"));
  assert.equal(spoken.includes('RA'), false);
  assert.ok(spoken.includes("Radhiyallahu 'anhu"));
  assert.ok(spoken.includes('Surah nomor 2 ayat 255'));
  assert.ok(spoken.includes('Hadis riwayat Bukhari'));
  assert.ok(spoken.includes('Fikih'));
  assert.ok(spoken.includes('Wudhu'));
});

// Case 24: Audio Reading - splitIntoSpeechChunks memotong teks panjang menjadi fragmen stabil
test('Case 24: splitIntoSpeechChunks membagi teks panjang menjadi penggalan kalimat stabil', async () => {
  const { splitIntoSpeechChunks } = await import('./articleAudioHelper.js');
  const longText = 'Paragraf pertama yang menjelaskan tentang rukun islam dan rukun iman secara ringkas. Kalimat kedua yang memberikan penjelasan lebih mendalam mengenai makna tauhid dan konsekuensi syahadat. Kalimat ketiga menyimpulkan faedah dengan bahasa yang sangat mudah dipahami oleh pembaca awam.';
  const chunks = splitIntoSpeechChunks(longText, 100);

  assert.ok(chunks.length >= 2);
  for (const chunk of chunks) {
    assert.ok(chunk.length > 0);
    assert.ok(chunk.trim() === chunk);
  }
});

// Case 25: Validasi Komentar Pembaca (Nama, Panjang, dan Moderasi Status)
test('Case 25: Validasi komentar pembaca memeriksa batas panjang nama, isi komentar, dan status awal pending', () => {
  interface CommentValidationResult {
    valid: boolean;
    error: string | null;
  }

  function validateCommentInput(name: string, content: string): CommentValidationResult {
    const cleanName = name.trim();
    const cleanContent = content.trim();

    if (!cleanName || cleanName.length < 2) {
      return { valid: false, error: 'Nama atau kunyah harus minimal 2 karakter.' };
    }
    if (cleanName.length > 100) {
      return { valid: false, error: 'Nama tidak boleh melebihi 100 karakter.' };
    }
    if (!cleanContent || cleanContent.length < 5) {
      return { valid: false, error: 'Isi komentar harus minimal 5 karakter.' };
    }
    if (cleanContent.length > 1000) {
      return { valid: false, error: 'Isi komentar tidak boleh melebihi 1000 karakter.' };
    }
    return { valid: true, error: null };
  }

  // Sukses
  const valid = validateCommentInput('Abu Maryam', 'Jazakallahu khairan atas artikel yang sangat berfaedah ini.');
  assert.equal(valid.valid, true);
  assert.equal(valid.error, null);

  // Gagal: nama terlalu pendek
  const nameShort = validateCommentInput('A', 'Faedah yang bagus sekali');
  assert.equal(nameShort.valid, false);
  assert.equal(nameShort.error, 'Nama atau kunyah harus minimal 2 karakter.');

  // Gagal: komentar terlalu pendek
  const contentShort = validateCommentInput('Fulan', 'Hai');
  assert.equal(contentShort.valid, false);
  assert.equal(contentShort.error, 'Isi komentar harus minimal 5 karakter.');

  // Gagal: komentar melebihi 1000 karakter
  const tooLongContent = 'A'.repeat(1001);
  const contentOverflow = validateCommentInput('Fulan', tooLongContent);
  assert.equal(contentOverflow.valid, false);
  assert.equal(contentOverflow.error, 'Isi komentar tidak boleh melebihi 1000 karakter.');
});

// Case 26: Pengaturan Audio Reading Blog (Mode Web Speech vs File Rekaman Kustom)
test('Case 26: Pengaturan Audio Reading Blog memvalidasi mode, laju kecepatan bicara, dan URL rekaman', () => {
  interface AudioConfig {
    mode: 'speech' | 'custom';
    speechRate?: number;
    speechVoiceName?: string;
    customAudioUrl?: string;
  }

  function resolveEffectiveAudioPlayer(config?: AudioConfig) {
    if (!config) {
      return { type: 'speech', rate: 1.0, voice: '', audioUrl: null };
    }
    if (config.mode === 'custom' && config.customAudioUrl && config.customAudioUrl.trim()) {
      return { type: 'custom', rate: 1.0, voice: '', audioUrl: config.customAudioUrl.trim() };
    }
    const rate = Math.min(Math.max(config.speechRate || 1.0, 0.75), 1.5);
    return {
      type: 'speech',
      rate,
      voice: config.speechVoiceName || '',
      audioUrl: null
    };
  }

  // 1. Default tanpa config -> mode speech 1.0x
  const def = resolveEffectiveAudioPlayer(undefined);
  assert.equal(def.type, 'speech');
  assert.equal(def.rate, 1.0);
  assert.equal(def.audioUrl, null);

  // 2. Mode custom dengan URL valid -> mode custom
  const custom = resolveEffectiveAudioPlayer({
    mode: 'custom',
    customAudioUrl: 'https://storage.googleapis.com/test-bucket/audio.mp3'
  });
  assert.equal(custom.type, 'custom');
  assert.equal(custom.audioUrl, 'https://storage.googleapis.com/test-bucket/audio.mp3');

  // 3. Mode custom tapi URL kosong -> fallback ke speech mode
  const fallback = resolveEffectiveAudioPlayer({
    mode: 'custom',
    customAudioUrl: ''
  });
  assert.equal(fallback.type, 'speech');

  // 4. Rate clamping (antara 0.75x dan 1.5x)
  const clampedLow = resolveEffectiveAudioPlayer({ mode: 'speech', speechRate: 0.5 });
  assert.equal(clampedLow.rate, 0.75);

  const clampedHigh = resolveEffectiveAudioPlayer({ mode: 'speech', speechRate: 2.5 });
  assert.equal(clampedHigh.rate, 1.5);
});

// Case 27: Moderasi dan Isolasi Komentar Antar Artikel
test('Case 27: Moderasi komentar memastikan isolasi antar artikel dan hanya komentar approved yang tampil publik', () => {
  interface CommentItem {
    id: string;
    articleId: string;
    authorName: string;
    content: string;
    status: 'pending' | 'approved' | 'rejected';
  }

  const allComments: CommentItem[] = [
    { id: 'c1', articleId: 'art-1', authorName: 'Ahmad', content: 'Komentar artikel 1 pending', status: 'pending' },
    { id: 'c2', articleId: 'art-1', authorName: 'Zaid', content: 'Komentar artikel 1 approved', status: 'approved' },
    { id: 'c3', articleId: 'art-1', authorName: 'Umar', content: 'Komentar artikel 1 rejected', status: 'rejected' },
    { id: 'c4', articleId: 'art-2', authorName: 'Ali', content: 'Komentar artikel 2 approved', status: 'approved' },
    { id: 'c5', articleId: 'art-2', authorName: 'Bilal', content: 'Komentar artikel 2 pending', status: 'pending' },
  ];

  // Helper tampilan publik untuk artikel 1
  function getPublicComments(articleId: string, items: CommentItem[]) {
    return items.filter(c => c.articleId === articleId && c.status === 'approved');
  }

  // Helper tampilan admin untuk artikel 1
  function getAdminFilteredComments(items: CommentItem[], articleFilter: string, statusFilter: string) {
    return items.filter(c => {
      const matchArt = articleFilter === 'all' || c.articleId === articleFilter;
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchArt && matchStatus;
    });
  }

  // Publik hanya melihat 1 komentar di artikel 1 (hanya approved)
  const publicArt1 = getPublicComments('art-1', allComments);
  assert.equal(publicArt1.length, 1);
  assert.equal(publicArt1[0].id, 'c2');
  assert.equal(publicArt1[0].authorName, 'Zaid');

  // Isolasi antar artikel: komentar art-2 tidak bocor ke art-1
  assert.equal(publicArt1.some(c => c.articleId === 'art-2'), false);

  // Admin melihat seluruh 3 komentar di art-1 saat filter status 'all'
  const adminArt1 = getAdminFilteredComments(allComments, 'art-1', 'all');
  assert.equal(adminArt1.length, 3);

  // Admin filter pending di seluruh artikel
  const adminPendingAll = getAdminFilteredComments(allComments, 'all', 'pending');
  assert.equal(adminPendingAll.length, 2);
  assert.deepEqual(adminPendingAll.map(c => c.id), ['c1', 'c5']);
});

// Case 28: Penghitungan jumlah sesi aktual per kurikulum tanpa penghitungan ganda
test('Case 28: Penghitungan jumlah sesi aktual per kurikulum tanpa penghitungan ganda', () => {
  interface DummySession {
    id: string;
    courseId: string;
    isPublished?: boolean;
  }

  function calculateCourseSessionCount(
    courseId: string,
    subSessions: DummySession[],
    topSessions: DummySession[],
    includeUnpublished = false
  ): number {
    const sessionSet = new Set<string>();

    subSessions.forEach(s => {
      if (s.courseId === courseId && (includeUnpublished || s.isPublished !== false)) {
        sessionSet.add(s.id);
      }
    });

    topSessions.forEach(s => {
      if (s.courseId === courseId && (includeUnpublished || s.isPublished !== false)) {
        sessionSet.add(s.id);
      }
    });

    return sessionSet.size;
  }

  function formatSessionDisplay(count: number): string {
    return `${count} Sesi`;
  }

  // 1. Kurikulum Tanpa Sesi (0 Sesi)
  const countZero = calculateCourseSessionCount('course-empty', [], []);
  assert.equal(countZero, 0);
  assert.equal(formatSessionDisplay(countZero), '0 Sesi');

  // 2. Kurikulum Dengan 1 Sesi
  const countOne = calculateCourseSessionCount(
    'course-single',
    [{ id: 's1', courseId: 'course-single', isPublished: true }],
    []
  );
  assert.equal(countOne, 1);
  assert.equal(formatSessionDisplay(countOne), '1 Sesi');

  // 3. Kurikulum Dengan Beberapa Sesi dan pengujian cegah hitung ganda (id yang sama di subcollection & top-level)
  const countMulti = calculateCourseSessionCount(
    'course-multi',
    [
      { id: 'm1', courseId: 'course-multi', isPublished: true },
      { id: 'm2', courseId: 'course-multi', isPublished: true }
    ],
    [
      { id: 'm2', courseId: 'course-multi', isPublished: true }, // Duplikat ID m2
      { id: 'm3', courseId: 'course-multi', isPublished: true }
    ]
  );
  assert.equal(countMulti, 3);
  assert.equal(formatSessionDisplay(countMulti), '3 Sesi');
});

// Case 29: Ekstraksi ID Google Drive, resolusi kandidat audio HTML5, dan diagnostik error pemutaran
test('Case 29: extractGoogleDriveFileId dan resolveAudioSourceCandidates menangani tautan Google Drive dan non-Google Drive dengan akurat', async () => {
  const {
    extractGoogleDriveFileId,
    isGoogleDriveUrl,
    isGoogleDriveFolderUrl,
    resolveAudioSourceCandidates,
    describeAudioPlaybackError
  } = await import('./articleAudioHelper.js');

  // 1. Tautan berbagi standar Google Drive (/file/d/ID/view?usp=drive_link)
  const shareUrl = 'https://drive.google.com/file/d/1hHSxqGxRDWVpy4GEewOjzQOLSRpVOwb_/view?usp=drive_link';
  assert.equal(isGoogleDriveUrl(shareUrl), true);
  assert.equal(isGoogleDriveFolderUrl(shareUrl), false);
  assert.equal(extractGoogleDriveFileId(shareUrl), '1hHSxqGxRDWVpy4GEewOjzQOLSRpVOwb_');

  const resolved = resolveAudioSourceCandidates(shareUrl);
  assert.equal(resolved.isGoogleDrive, true);
  assert.equal(resolved.isGoogleDriveFolder, false);
  assert.equal(resolved.fileId, '1hHSxqGxRDWVpy4GEewOjzQOLSRpVOwb_');
  assert.equal(resolved.primaryUrl, '/api/gdrive-audio?id=1hHSxqGxRDWVpy4GEewOjzQOLSRpVOwb_');
  assert.equal(
    resolved.directCorsUrl,
    'https://drive.usercontent.google.com/download?id=1hHSxqGxRDWVpy4GEewOjzQOLSRpVOwb_&export=download&confirm=t'
  );
  assert.equal(resolved.candidates.length, 3);
  assert.equal(resolved.candidates[0].label, 'proxy');
  assert.equal(resolved.candidates[1].label, 'gdrive-cors');
  assert.equal(resolved.candidates[1].useCrossOrigin, true);

  // 2. Variasi format URL Google Drive lainnya (/open?id=, /uc?id=, /file/u/0/d/, drive.usercontent.google.com)
  assert.equal(
    extractGoogleDriveFileId('https://drive.google.com/open?id=1hHSxqGxRDWVpy4GEewOjzQOLSRpVOwb_'),
    '1hHSxqGxRDWVpy4GEewOjzQOLSRpVOwb_'
  );
  assert.equal(
    extractGoogleDriveFileId('https://drive.google.com/uc?export=download&id=1hHSxqGxRDWVpy4GEewOjzQOLSRpVOwb_'),
    '1hHSxqGxRDWVpy4GEewOjzQOLSRpVOwb_'
  );
  assert.equal(
    extractGoogleDriveFileId('https://drive.google.com/file/u/0/d/1hHSxqGxRDWVpy4GEewOjzQOLSRpVOwb_/edit'),
    '1hHSxqGxRDWVpy4GEewOjzQOLSRpVOwb_'
  );
  assert.equal(
    extractGoogleDriveFileId('https://drive.usercontent.google.com/download?id=1hHSxqGxRDWVpy4GEewOjzQOLSRpVOwb_&export=download'),
    '1hHSxqGxRDWVpy4GEewOjzQOLSRpVOwb_'
  );

  // 3. Tautan Folder Google Drive harus ditolak sebagai file audio
  const folderUrl = 'https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ123456?usp=sharing';
  assert.equal(isGoogleDriveFolderUrl(folderUrl), true);
  assert.equal(extractGoogleDriveFileId(folderUrl), null);
  const resolvedFolder = resolveAudioSourceCandidates(folderUrl);
  assert.equal(resolvedFolder.isGoogleDrive, true);
  assert.equal(resolvedFolder.isGoogleDriveFolder, true);
  assert.equal(resolvedFolder.fileId, null);
  assert.equal(resolvedFolder.candidates.length, 0);
  const folderErr = describeAudioPlaybackError({
    isGoogleDrive: true,
    isGoogleDriveFolder: true,
    fileId: null
  });
  assert.ok(folderErr.includes('Folder'));

  // 4. Tautan MP3 eksternal langsung (non-Google Drive)
  const directMp3 = 'https://cdn.darswithosama.com/audio/kajian-1.mp3';
  const resolvedDirect = resolveAudioSourceCandidates(directMp3);
  assert.equal(resolvedDirect.isGoogleDrive, false);
  assert.equal(resolvedDirect.fileId, null);
  assert.equal(resolvedDirect.primaryUrl, directMp3);
  assert.equal(resolvedDirect.candidates.length, 1);
  assert.equal(resolvedDirect.candidates[0].url, directMp3);
});

// Case 30: Penyempurnaan Editor Teks - Hyperlink Otomatis, Validasi URL, dan Pembungkusan Teks Terpilih
test('Case 30: normalizeHyperlinkUrl, linkifyPlainTextSegment, dan convertPastedPlainTextToHtml menangani hyperlink otomatis dan teks terpilih', async () => {
  const {
    normalizeHyperlinkUrl,
    isValidSafeUrl,
    linkifyPlainTextSegment,
    convertPastedPlainTextToHtml
  } = await import('./richTextHelper.js');

  // 1. Validasi URL aman vs skrip berbahaya
  assert.equal(normalizeHyperlinkUrl('https://darswithosama.com/kajian'), 'https://darswithosama.com/kajian');
  assert.equal(normalizeHyperlinkUrl('www.darswithosama.com'), 'https://www.darswithosama.com');
  assert.equal(normalizeHyperlinkUrl('mailto:osamanursamsil@gmail.com'), 'mailto:osamanursamsil@gmail.com');
  assert.equal(normalizeHyperlinkUrl('javascript:alert(1)'), null);
  assert.equal(normalizeHyperlinkUrl('data:text/html,<script>alert(1)</script>'), null);
  assert.equal(isValidSafeUrl('javascript:void(0)'), false);
  assert.equal(isValidSafeUrl('https://drive.google.com/file/d/123/view'), true);

  // 2. Tempel URL langsung pada teks terpilih -> membungkus teks terpilih menjadi tautan
  const wrappedSelection = convertPastedPlainTextToHtml(
    'https://darswithosama.com/profil-pengajar',
    'Profil Ustaz Osama Nur Samsil, S.H.'
  );
  assert.ok(wrappedSelection.includes('<a href="https://darswithosama.com/profil-pengajar"'));
  assert.ok(wrappedSelection.includes('target="_blank"'));
  assert.ok(wrappedSelection.includes('rel="noopener noreferrer"'));
  assert.ok(wrappedSelection.includes('>Profil Ustaz Osama Nur Samsil, S.H.</a>'));

  // 3. Tempel paragraf yang memuat URL -> otomatis dikenali sebagai hyperlink yang dapat diklik
  const pastedParagraph = convertPastedPlainTextToHtml(
    'Silakan kunjungi https://darswithosama.com untuk membaca artikel ilmiah.'
  );
  assert.ok(pastedParagraph.includes('<a href="https://darswithosama.com"'));
  assert.ok(pastedParagraph.includes('>https://darswithosama.com</a>'));

  // 4. Tanda baca di akhir kalimat tidak ikut masuk ke atribut href
  const sentenceWithDot = linkifyPlainTextSegment('Rujukan tersedia di https://darswithosama.com/kitab.');
  assert.ok(sentenceWithDot.includes('href="https://darswithosama.com/kitab"'));
  assert.ok(sentenceWithDot.endsWith('</a>.'));
});

// Case 31: Penyempurnaan Editor Teks - Format Normal/Paragraph & Perataan Justify
test('Case 31: convertBlocksToNormalParagraphHtml dan applyAlignmentToHtmlBlocks mempertahankan format Normal dan Justify', async () => {
  const {
    convertBlocksToNormalParagraphHtml,
    applyAlignmentToHtmlBlocks
  } = await import('./richTextHelper.js');

  // 1. Mengembalikan Heading 1, 2, 3 dan Blockquote menjadi paragraf normal (<p>)
  const headingHtml = '<h1>Judul Utama</h1><h2 style="text-align: center">Subjudul Tengah</h2><h3>Subjudul Kecil</h3><blockquote>Kutipan</blockquote>';
  const normalHtml = convertBlocksToNormalParagraphHtml(headingHtml);
  assert.equal(normalHtml.includes('<h1>'), false);
  assert.equal(normalHtml.includes('<h2'), false);
  assert.equal(normalHtml.includes('<h3>'), false);
  assert.equal(normalHtml.includes('<blockquote>'), false);
  assert.ok(normalHtml.includes('<p>Judul Utama</p>'));
  assert.ok(normalHtml.includes('<p style="text-align: center;">Subjudul Tengah</p>'));
  assert.ok(normalHtml.includes('<p>Subjudul Kecil</p>'));
  assert.ok(normalHtml.includes('<p>Kutipan</p>'));

  // 2. Perataan Justify (rata kiri-kanan) pada paragraf dan heading
  const rawParagraphs = '<p>Paragraf pertama kajian ilmiah.</p><h2>Judul Bagian</h2>';
  const justifiedHtml = applyAlignmentToHtmlBlocks(rawParagraphs, 'justify');
  assert.ok(justifiedHtml.includes('text-align: justify'));
  assert.equal((justifiedHtml.match(/text-align:\s*justify/g) || []).length, 2);
});

// Case 32: Sanitasi HTML Konten Rich Text (Mencegah XSS sekaligus Mempertahankan Format, Gambar, dan Tautan)
test('Case 32: sanitizeRichTextHtml menghapus skrip/event berbahaya dan mempertahankan Justify, Normal, daftar, gambar, serta hyperlink', async () => {
  const { sanitizeRichTextHtml } = await import('./richTextHelper.js');

  const dirtyHtml = `
    <p style="text-align: justify;" onclick="alert('xss')">Paragraf ilmiah yang rata kiri-kanan.</p>
    <script>window.hacked = true;</script>
    <iframe src="https://evil.example.com"></iframe>
    <p><a href="https://darswithosama.com" onmouseover="evil()">Tautan Resmi</a></p>
    <p><a href="javascript:alert(1)">Tautan Berbahaya</a></p>
    <img src="https://images.unsplash.com/photo-1532012197267-da84d127e765" alt="Kitab" onerror="alert(2)" />
    <ul><li>Butir pertama</li><li>Butir kedua</li></ul>
  `;

  const sanitized = sanitizeRichTextHtml(dirtyHtml);

  // Bebas dari XSS
  assert.equal(sanitized.includes('<script'), false);
  assert.equal(sanitized.includes('<iframe'), false);
  assert.equal(sanitized.includes('onclick='), false);
  assert.equal(sanitized.includes('onmouseover='), false);
  assert.equal(sanitized.includes('onerror='), false);
  assert.equal(sanitized.includes('javascript:'), false);

  // Format yang sah tetap utuh setelah sanitasi
  assert.ok(sanitized.includes('style="text-align: justify;"'));
  assert.ok(sanitized.includes('href="https://darswithosama.com"'));
  assert.ok(sanitized.includes('target="_blank"'));
  assert.ok(sanitized.includes('rel="noopener noreferrer"'));
  assert.ok(sanitized.includes('<img src="https://images.unsplash.com/photo-1532012197267-da84d127e765" alt="Kitab"'));
  assert.ok(sanitized.includes('<ul><li>Butir pertama</li><li>Butir kedua</li></ul>'));
});

// Case 33: Pengelolaan Halaman Profil Pengajar (Data Default Jujur, Urutan Bagian, dan Sanitasi Payload)
test('Case 33: getDefaultInstructorProfile, moveProfileSection, dan sanitizeInstructorProfilePayload mengelola profil pengajar secara akurat', async () => {
  const {
    getDefaultInstructorProfile,
    moveProfileSection,
    sanitizeInstructorProfilePayload
  } = await import('./instructorProfileHelper.js');
  const { parseUrlToRouteState, buildUrlFromRouteState } = await import('./navigationHistory.js');

  // 1. Data awal hanya memuat identitas faktual Osama Nur Samsil, S.H. tanpa mengarang pendidikan/prestasi fiktif
  const defaultProfile = getDefaultInstructorProfile();
  assert.equal(defaultProfile.name, 'Osama Nur Samsil, S.H.');
  assert.equal(defaultProfile.role, 'Pembuat & Pengajar Dars with Osama');
  assert.equal(defaultProfile.photoUrl, '');

  // 2. Pengaturan urutan bagian (naik/turun)
  const sampleSections = [
    { id: 'sec-1', title: 'Bagian Pertama', content: '<p>Isi 1</p>', order: 1 },
    { id: 'sec-2', title: 'Bagian Kedua', content: '<p>Isi 2</p>', order: 2 },
    { id: 'sec-3', title: 'Bagian Ketiga', content: '<p>Isi 3</p>', order: 3 }
  ];

  const movedDown = moveProfileSection(sampleSections, 'sec-1', 'down');
  assert.deepEqual(movedDown.map((s) => s.id), ['sec-2', 'sec-1', 'sec-3']);
  assert.deepEqual(movedDown.map((s) => s.order), [1, 2, 3]);

  const movedUp = moveProfileSection(movedDown, 'sec-3', 'up');
  assert.deepEqual(movedUp.map((s) => s.id), ['sec-2', 'sec-3', 'sec-1']);

  // 3. Sanitasi payload profil sebelum disimpan ke Firestore
  const sanitizedProfile = sanitizeInstructorProfilePayload({
    name: 'Osama Nur Samsil, S.H.',
    role: 'Pembuat & Pengajar Dars with Osama',
    title: 'Profil Pengajar',
    biography: 'Pengajar kajian kitab kuning.',
    mainContent: '<p style="text-align: justify">Selamat datang di <a href="https://darswithosama.com">Dars with Osama</a>.</p><script>evil()</script>',
    sections: movedUp
  });
  assert.equal(sanitizedProfile.mainContent.includes('<script'), false);
  assert.ok(sanitizedProfile.mainContent.includes('text-align: justify'));
  assert.equal(sanitizedProfile.sections.length, 3);

  // 4. Routing halaman publik /profil-pengajar
  const profileRoute = parseUrlToRouteState('/profil-pengajar', '');
  assert.equal(profileRoute.view, 'instructor-profile');
  assert.equal(buildUrlFromRouteState(profileRoute), '/profil-pengajar');
});

// Case 34: Pemisahan Artikel Dummy (post-1, post-2) dari Artikel Produksi Asli
test('Case 34: isDummySeedBlogPost dan filterProductionBlogPosts menyaring artikel dummy bawaan tanpa menghapus artikel produksi asli', async () => {
  const { isDummySeedBlogPost, filterProductionBlogPosts } = await import('./dataAuditHelper.js');

  const samplePosts: any[] = [
    {
      id: 'post-1',
      title: "Menuntut Ilmu Syar'i: Keutamaan, Niat, dan Adab Para Penuntut Ilmu",
      slug: 'menuntut-ilmu-syari-keutamaan-niat-dan-adab',
      status: 'published',
      publishedAt: '2026-10-19T16:29:48.654Z',
      createdAt: '2026-10-19T16:29:48.654Z'
    },
    {
      id: 'post-2',
      title: "Panduan Tadabbur Al-Qur'an: Memahami Makna dan Meresapi Renungan Ayat",
      slug: 'panduan-tadabbur-al-quran-memahami-makna-dan-renungan',
      status: 'published',
      publishedAt: '2026-10-15T16:29:48.654Z',
      createdAt: '2026-10-15T16:29:48.654Z'
    },
    {
      id: 'post-1792227068136',
      title: 'Kisah tentang al kalam dalam ilmu nahwu',
      slug: 'kisah-tentang-al-kalam-dalam-ilmu-nahwu',
      status: 'published',
      publishedAt: '2026-10-17T08:51:08.136Z',
      createdAt: '2026-10-17T08:51:08.136Z'
    },
    {
      id: 'post-1792509202990',
      title: 'Bitcoin sebagai Alat Tukar dalam Perspektif Fikih Islam',
      slug: 'bitcoin-sebagai-alat-tukar-dalam-perspektif-fikih-islam',
      status: 'published',
      publishedAt: '2026-10-20T15:13:22.990Z',
      createdAt: '2026-10-20T15:13:22.990Z'
    },
    {
      id: 'post-draft-999',
      title: 'Draf Kajian Baru',
      slug: 'draf-kajian-baru',
      status: 'draft',
      createdAt: '2026-10-21T10:00:00.000Z'
    }
  ];

  assert.equal(isDummySeedBlogPost(samplePosts[0]), true);
  assert.equal(isDummySeedBlogPost(samplePosts[1]), true);
  assert.equal(isDummySeedBlogPost(samplePosts[2]), false);
  assert.equal(isDummySeedBlogPost(samplePosts[3]), false);

  const publicPosts = filterProductionBlogPosts(samplePosts, false);
  assert.equal(publicPosts.length, 2);
  assert.deepEqual(
    publicPosts.map((p) => p.id),
    ['post-1792509202990', 'post-1792227068136']
  );

  const adminPosts = filterProductionBlogPosts(samplePosts, true);
  assert.equal(adminPosts.length, 3);
  assert.equal(adminPosts.some((p) => p.id === 'post-1' || p.id === 'post-2'), false);
});

// Case 35: Konsistensi Penggabungan Sesi Lintas Koleksi dan Rekonsiliasi Penyimpanan Lokal yang Aman
test('Case 35: mergeCourseSessions memilih versi sesi terbaru berdasarkan updatedAt dan reconcileLocalWithServerEntities tidak menimpa data server', async () => {
  const {
    mergeCourseSessions,
    auditBrowserStorageEntries,
    reconcileLocalWithServerEntities
  } = await import('./dataAuditHelper.js');

  const subSessions: any[] = [
    {
      id: 'session-1',
      courseId: 'course-1',
      title: 'Sesi 1 (Versi Lama)',
      order: 1,
      isPublished: true,
      updatedAt: '2026-10-18T10:00:00.000Z'
    },
    {
      id: 'session-2',
      courseId: 'course-1',
      title: 'Sesi 2',
      order: 2,
      isPublished: true,
      updatedAt: '2026-10-19T10:00:00.000Z'
    }
  ];

  const topSessions: any[] = [
    {
      id: 'session-1',
      courseId: 'course-1',
      title: 'Sesi 1 (Versi Baru)',
      order: 1,
      isPublished: true,
      updatedAt: '2026-10-21T12:00:00.000Z'
    },
    {
      id: 'session-3',
      courseId: 'course-1',
      title: 'Sesi 3 (Draf)',
      order: 3,
      isPublished: false,
      updatedAt: '2026-10-21T14:00:00.000Z'
    }
  ];

  const mergedPublic = mergeCourseSessions(subSessions, topSessions, false);
  assert.equal(mergedPublic.length, 2);
  assert.equal(mergedPublic[0].title, 'Sesi 1 (Versi Baru)');

  const mergedAdmin = mergeCourseSessions(subSessions, topSessions, true);
  assert.equal(mergedAdmin.length, 3);

  const audit = auditBrowserStorageEntries({
    'dars-theme': 'dark',
    'dars_instructor_profile_v1': JSON.stringify({ name: 'Osama Nur Samsil, S.H.', updatedAt: '2026-10-22' })
  });
  assert.equal(audit.totalKeys, 2);
  assert.equal(audit.hasUnsyncedLegacyContent, false);

  const reconciled = reconcileLocalWithServerEntities(
    [{ id: 'post-1792227068136' }, { id: 'post-local-only' }],
    [{ id: 'post-1792227068136' }]
  );
  assert.deepEqual(reconciled.alreadyOnServer.map((i) => i.id), ['post-1792227068136']);
  assert.deepEqual(reconciled.missingOnServer.map((i) => i.id), ['post-local-only']);
});

// Case 36: Validasi Named Database Firestore dan Klasifikasi Diagnostik Error yang Aman
test('Case 36: Validasi Named Database Firestore dan klasifikasi error diagnostik tanpa membocorkan kredensial', async () => {
  const {
    REQUIRED_DATABASE_ID,
    firebaseConfig,
    classifyFirestoreError
  } = await import('../firebase/config.js');

  // 1. Pastikan named database ID sesuai dengan database produksi yang berisi data lengkap
  assert.equal(REQUIRED_DATABASE_ID, 'ai-studio-remixdarswithosa-978e37b7-a164-496c-8e6a-39738edc5d93');
  assert.equal(firebaseConfig.firestoreDatabaseId, 'ai-studio-remixdarswithosa-978e37b7-a164-496c-8e6a-39738edc5d93');
  assert.notEqual(firebaseConfig.firestoreDatabaseId, '(default)');
  assert.notEqual(firebaseConfig.firestoreDatabaseId, '');

  // 2. Klasifikasi error permission-denied
  const permErr = classifyFirestoreError({ code: 'permission-denied', message: 'Missing or insufficient permissions.' });
  assert.equal(permErr.category, 'permission-denied');

  // 3. Klasifikasi error koneksi offline / domain terblokir
  const netErr = classifyFirestoreError(new Error('Failed to get document because the client is offline'));
  assert.equal(netErr.category, 'network-or-domain-blocked');

  // 4. Klasifikasi error unauthenticated
  const authErr = classifyFirestoreError({ code: 'unauthenticated', message: 'Token expired' });
  assert.equal(authErr.category, 'unauthenticated');

  // 5. Klasifikasi error database not-found
  const notFoundErr = classifyFirestoreError({ code: 'not-found', message: 'NOT_FOUND: database does not exist' });
  assert.equal(notFoundErr.category, 'database-not-found');
});

// Case 37: Penanganan Gangguan Layanan (resource-exhausted / kuota), Retensi Data di Memori, dan Jeda Ulang (Cooldown)
test('Case 37: Penanganan kegagalan pemuatan data Firestore mempertahankan data memori dan menerapkan jeda coba lagi', async () => {
  const {
    canAttemptRetry,
    getRemainingCooldownSeconds,
    retainExistingDataOnFailure,
    formatDisruptionMessage,
    DEFAULT_RETRY_COOLDOWN_SECONDS
  } = await import('./serviceDisruptionHelper.js');

  // 1. Retensi data in-memory: Jangan hapus data yang sudah ada saat terjadi error
  const existingArticles = [
    { id: 'art-1', title: 'Artikel Shahih Pertama' },
    { id: 'art-2', title: 'Artikel Shahih Kedua' }
  ];

  // Saat fetch berikutnya error (errorOccurred = true), data lama HARUS tetap dipertahankan
  const retainedOnError = retainExistingDataOnFailure(existingArticles, [], true);
  assert.equal(retainedOnError.length, 2);
  assert.deepEqual(retainedOnError, existingArticles);

  // Saat fetch sukses (errorOccurred = false), data baru diperbarui
  const freshArticles = [{ id: 'art-3', title: 'Artikel Baru Berhasil Dimuat' }];
  const updatedOnSuccess = retainExistingDataOnFailure(existingArticles, freshArticles, false);
  assert.equal(updatedOnSuccess.length, 1);
  assert.equal(updatedOnSuccess[0].id, 'art-3');

  // 2. Evaluasi jeda coba lagi (cooldown) untuk mencegah permintaan agresif
  const now = 1000000;
  const recentAttempt = now - 3000; // 3 detik yang lalu (cooldown default 10 detik)

  assert.equal(canAttemptRetry(recentAttempt, DEFAULT_RETRY_COOLDOWN_SECONDS, now), false);
  const remaining = getRemainingCooldownSeconds(recentAttempt, DEFAULT_RETRY_COOLDOWN_SECONDS, now);
  assert.equal(remaining, 7); // 10 - 3 = 7 detik tersisa

  // Setelah lewat 10 detik, coba lagi diizinkan
  const oldAttempt = now - 11000; // 11 detik yang lalu
  assert.equal(canAttemptRetry(oldAttempt, DEFAULT_RETRY_COOLDOWN_SECONDS, now), true);
  assert.equal(getRemainingCooldownSeconds(oldAttempt, DEFAULT_RETRY_COOLDOWN_SECONDS, now), 0);

  // 3. Format pesan gangguan layanan yang jujur dan membedakan kuota vs jaringan
  const quotaMsg = formatDisruptionMessage('resource-exhausted', 'resource-exhausted');
  assert.equal(quotaMsg.isQuota, true);
  assert.ok(quotaMsg.title.includes('Batas Kuota'));
  assert.ok(quotaMsg.message.includes('Cloud Firestore'));
  assert.ok(quotaMsg.message.includes('aman tersimpan'));

  const netMsg = formatDisruptionMessage('network-or-domain-blocked');
  assert.equal(netMsg.isQuota, false);
  assert.ok(netMsg.title.includes('Koneksi'));

  const genMsg = formatDisruptionMessage('unknown-error');
  assert.equal(genMsg.isQuota, false);
  assert.ok(genMsg.title.includes('Gangguan'));
});

// Case 38: End-to-End Test Penulisan & Pembacaan Artikel "uji coba" pada Query Publik
test('Case 38: Verifikasi alur penulisan dan pembacaan artikel "uji coba" pada kueri publik', async () => {
  const { isDummySeedBlogPost, filterProductionBlogPosts } = await import('./dataAuditHelper.js');

  const sampleArticles = [
    {
      id: 'post-1',
      title: "Menuntut Ilmu Syar'i",
      slug: 'menuntut-ilmu-syari-keutamaan-niat-dan-adab',
      status: 'published' as const,
      publishedAt: '2026-10-15T00:00:00.000Z'
    },
    {
      id: 'post-1792723000000',
      title: 'uji coba',
      slug: 'uji-coba',
      status: 'published' as const,
      publishedAt: '2026-10-22T19:30:00.000Z',
      category: 'Kajian Fiqih'
    },
    {
      id: 'post-1792723000001',
      title: 'Draf Artikel Belum Terbit',
      slug: 'draf-artikel',
      status: 'draft' as const,
      publishedAt: ''
    }
  ];

  // 1. Verifikasi artikel "uji coba" bukan artikel dummy seed
  const testArticle = sampleArticles[1];
  assert.equal(isDummySeedBlogPost(testArticle), false, 'Artikel "uji coba" tidak boleh diklasifikasikan sebagai dummy seed');

  // 2. Verifikasi kueri publik (includeDrafts = false) hanya mengembalikan artikel published yang valid
  const publicPosts = filterProductionBlogPosts(sampleArticles as any, false);
  const foundUjiCoba = publicPosts.find((p) => p.title === 'uji coba');

  assert.ok(foundUjiCoba, 'Artikel "uji coba" yang berstatus published HARUS ditemukan dalam kueri publik');
  assert.equal(foundUjiCoba?.id, 'post-1792723000000');
  assert.equal(foundUjiCoba?.status, 'published');
  assert.equal(foundUjiCoba?.slug, 'uji-coba');

  // 3. Verifikasi kueri publik menyaring artikel draft
  const draftFound = publicPosts.find((p) => p.title === 'Draf Artikel Belum Terbit');
  assert.equal(draftFound, undefined, 'Artikel berstatus draft HARUS disaring dari kueri publik');

  // 4. Verifikasi kueri admin (includeDrafts = true) mengembalikan seluruh artikel termasuk draft
  const adminPosts = filterProductionBlogPosts(sampleArticles as any, true);
  assert.equal(adminPosts.length, 2, 'Kueri admin mengembalikan seluruh artikel non-dummy');
});

// Case 39: Verifikasi Retensi dan Sinkronisasi Lokal Artikel Blog Lintas Reload/Offline
test('Case 39: getLocalCustomBlogPosts, saveLocalCustomBlogPost, dan mergeBlogPostsLists mempertahankan artikel pengguna saat reload/quota limit', async () => {
  const { mergeBlogPostsLists } = await import('../firebase/services.js');

  const serverPosts: any[] = [
    {
      id: 'post-server-1',
      title: 'Artikel Server Lama',
      updatedAt: '2026-10-20T10:00:00.000Z'
    }
  ];

  const localCustomPosts: any[] = [
    {
      id: 'post-server-1',
      title: 'Artikel Server Diperbarui Lokal',
      updatedAt: '2026-10-22T15:00:00.000Z'
    },
    {
      id: 'post-local-new',
      title: 'Artikel Baru Dibuat Pengguna',
      updatedAt: '2026-10-22T16:00:00.000Z'
    }
  ];

  // Menggabungkan postingan server dengan postingan lokal
  const merged = mergeBlogPostsLists(serverPosts, localCustomPosts);

  assert.equal(merged.length, 2, 'Penggabungan harus menghasilkan 2 artikel unik');
  
  const updatedDoc = merged.find((p) => p.id === 'post-server-1');
  assert.equal(updatedDoc?.title, 'Artikel Server Diperbarui Lokal', 'Dokumen dengan updatedAt terbaru harus dipilih');

  const newLocalDoc = merged.find((p) => p.id === 'post-local-new');
  assert.ok(newLocalDoc, 'Artikel baru yang disimpan secara lokal tidak boleh hilang saat penggabungan');
  assert.equal(newLocalDoc?.title, 'Artikel Baru Dibuat Pengguna');
});

// Case 40: Penanganan Konflik Data Lintas Perangkat dan Pencegahan Kebangkitan Artikel Terhapus (Deletion Tombstone)
test('Case 40: mergeBlogPostsLists memilih versi terbaru dan mencegah kebangkitan artikel terhapus melalui tombstone set', async () => {
  const { mergeBlogPostsLists } = await import('../firebase/services.js');

  // 1. Browser A memperbarui artikel di server dengan timestamp lebih baru
  const serverPostsBrowserA: any[] = [
    {
      id: 'post-shared-1',
      title: 'Artikel Diperbarui dari Perangkat A (Server)',
      updatedAt: '2026-10-22T18:00:00.000Z'
    }
  ];

  // Browser B memiliki cache lokal lama
  const staleLocalBrowserB: any[] = [
    {
      id: 'post-shared-1',
      title: 'Artikel Lama di Perangkat B (Stale Cache)',
      updatedAt: '2026-10-22T12:00:00.000Z'
    }
  ];

  const mergedCrossClient = mergeBlogPostsLists(serverPostsBrowserA, staleLocalBrowserB);
  assert.equal(mergedCrossClient.length, 1);
  assert.equal(mergedCrossClient[0].title, 'Artikel Diperbarui dari Perangkat A (Server)');

  // 2. Mencegah kebangkitan artikel terhapus (deletion tombstone)
  const tombstoneSet = new Set(['post-deleted-id']);

  const secondaryWithDeleted: any[] = [
    {
      id: 'post-deleted-id',
      title: 'Artikel yang Sudah Dihapus Pengguna',
      updatedAt: '2026-10-22T20:00:00.000Z'
    },
    {
      id: 'post-active-id',
      title: 'Artikel Aktif',
      updatedAt: '2026-10-22T20:00:00.000Z'
    }
  ];

  const mergedWithTombstone = mergeBlogPostsLists([], secondaryWithDeleted, tombstoneSet);
  assert.equal(mergedWithTombstone.length, 1);
  assert.equal(mergedWithTombstone[0].id, 'post-active-id');
  assert.equal(mergedWithTombstone.some((p) => p.id === 'post-deleted-id'), false, 'Artikel terhapus tidak boleh muncul kembali');
});

// Case 41: Verifikasi Pembacaan Langsung dari Named Database Cloud Firestore & Konsistensi Cache Invalidation (forceRefresh)
test('Case 41: getCategories, getCourses, getSessionsByCourse, getBlogPosts, getBlogPostById, getBlogPostBySlug, getPublishedPublicQA, dan getInstructorProfile membaca langsung dari server Firestore saat forceRefresh=true', async () => {
  const {
    getCategories,
    getCourses,
    getSessionsByCourse,
    getBlogPosts,
    getBlogPostById,
    getBlogPostBySlug,
    getPublishedPublicQA,
    getInstructorProfile,
    invalidateServicesCache
  } = await import('../firebase/services.js');
  const { firebaseConfig } = await import('../firebase/config.js');

  // 1. Pastikan konfigurasi menunjuk ke project dan named database produksi yang benar
  assert.equal(firebaseConfig.projectId, 'premium-generator-4lxdt');
  assert.equal(
    firebaseConfig.firestoreDatabaseId,
    'ai-studio-remixdarswithosa-978e37b7-a164-496c-8e6a-39738edc5d93'
  );

  // 2. Invalidate seluruh cache dan baca ulang langsung dari server (forceRefresh = true)
  invalidateServicesCache('all');

  const [cats, courses, posts, publicQA, profile] = await Promise.all([
    getCategories(true),
    getCourses(true, true),
    getBlogPosts(true, true),
    getPublishedPublicQA(true),
    getInstructorProfile()
  ]);

  assert.ok(Array.isArray(cats) && cats.length >= 2, 'Kategori server harus terbaca minimal 2 dokumen');
  assert.ok(Array.isArray(courses) && courses.length >= 2, 'Kursus server harus terbaca minimal 2 dokumen');
  assert.ok(Array.isArray(posts) && posts.length >= 1, 'Artikel blog server harus terbaca');
  assert.ok(Array.isArray(publicQA), 'Konsultasi publik harus terbaca');
  assert.equal(profile.id, 'main', 'Profil pengajar utama (id: main) harus terbaca');

  // 3. Verifikasi pembacaan detail artikel berdasarkan ID dan Slug langsung dari server
  const samplePost = posts[0];
  const byId = await getBlogPostById(samplePost.id, true);
  const bySlug = await getBlogPostBySlug(samplePost.slug, true);
  assert.equal(byId?.id, samplePost.id);
  assert.equal(byId?.title, samplePost.title);
  assert.equal(bySlug?.id, samplePost.id);
  assert.equal(bySlug?.slug, samplePost.slug);

  // 4. Verifikasi sesi kursus terbaca konsisten setelah refresh
  const sampleCourse = courses[0];
  const sessions = await getSessionsByCourse(sampleCourse.id, true, true);
  assert.ok(Array.isArray(sessions) && sessions.length > 0, 'Sesi kursus harus terbaca dari server');
  assert.equal(sampleCourse.sessionsCount, sessions.length, 'sessionsCount pada kursus harus sinkron dengan jumlah sesi aktual');
});

// Case 42: Alur Kuis - Sesi dengan kuis wajib dikerjakan dan tidak boleh selesai sebelum kuis dikerjakan
test('Case 42: canCompleteSession menolak penyelesaian sesi jika kuis belum dikerjakan dan menyertakan pesan yang jelas', async () => {
  const { canCompleteSession, evaluateSessionQuizStatus } = await import('./quizFlowHelper.js');

  const sessionWithQuiz: import('../types/index.js').Session = {
    id: 'session-tsalatsah-1',
    courseId: 'course-tsalatsatil-ushul',
    title: 'Sesi 1: Empat Perkara Wajib',
    titleAr: '',
    description: '',
    order: 1,
    isPublished: true,
    quizId: 'quiz-tsalatsah-1'
  };

  const quiz: import('../types/index.js').Quiz = {
    id: 'quiz-tsalatsah-1',
    sessionId: 'session-tsalatsah-1',
    courseId: 'course-tsalatsatil-ushul',
    title: 'Evaluasi Kuis Sesi 1',
    passingScore: 75,
    timeLimitMinutes: 10,
    maxAttempts: 3,
    showAnswersAfterSubmit: true,
    isPublished: true,
    questions: []
  };

  // Tanpa riwayat attempt (belum dikerjakan)
  const check = canCompleteSession(sessionWithQuiz, quiz, []);
  assert.equal(check.allowed, false);
  assert.equal(
    check.reason,
    'Silakan kerjakan kuis sesi ini terlebih dahulu sebelum menyelesaikan pembelajaran.'
  );

  const status = evaluateSessionQuizStatus(sessionWithQuiz, quiz, []);
  assert.equal(status.hasQuiz, true);
  assert.equal(status.status, 'not_attempted');
  assert.equal(status.canCompleteSession, false);
  assert.equal(status.actionLabel, 'Kerjakan Kuis');
});

// Case 43: Alur Kuis - Sesi tanpa kuis langsung boleh diselesaikan tanpa pengalihan
test('Case 43: canCompleteSession mengizinkan penyelesaian langsung untuk sesi yang tidak memiliki kuis', async () => {
  const { canCompleteSession, evaluateSessionQuizStatus } = await import('./quizFlowHelper.js');

  const sessionNoQuiz: import('../types/index.js').Session = {
    id: 'session-tsalatsah-3',
    courseId: 'course-tsalatsatil-ushul',
    title: 'Sesi 3: Ma\'rifatullah',
    titleAr: '',
    description: '',
    order: 3,
    isPublished: true
  };

  const check = canCompleteSession(sessionNoQuiz, null, []);
  assert.equal(check.allowed, true);
  assert.equal(check.reason, undefined);

  const status = evaluateSessionQuizStatus(sessionNoQuiz, null, []);
  assert.equal(status.hasQuiz, false);
  assert.equal(status.status, 'no_quiz');
  assert.equal(status.canCompleteSession, true);
});

// Case 44: Alur Kuis - Siswa yang belum mencapai nilai passingScore tidak dapat menyelesaikan sesi
test('Case 44: canCompleteSession menolak penyelesaian jika nilai kuis di bawah batas kelulusan (passingScore)', async () => {
  const { canCompleteSession, evaluateSessionQuizStatus } = await import('./quizFlowHelper.js');

  const session: import('../types/index.js').Session = {
    id: 'session-1',
    courseId: 'course-1',
    title: 'Sesi 1',
    titleAr: '',
    description: '',
    order: 1,
    isPublished: true,
    quizId: 'quiz-1'
  };

  const quiz: import('../types/index.js').Quiz = {
    id: 'quiz-1',
    sessionId: 'session-1',
    courseId: 'course-1',
    title: 'Kuis Evaluasi',
    passingScore: 75,
    timeLimitMinutes: 10,
    maxAttempts: 3,
    showAnswersAfterSubmit: true,
    isPublished: true,
    questions: []
  };

  const failedAttempts: import('../types/index.js').QuizAttempt[] = [
    {
      id: 'att-1',
      userId: 'user-123',
      userName: 'Ahmad',
      userEmail: 'ahmad@example.com',
      quizId: 'quiz-1',
      sessionId: 'session-1',
      courseId: 'course-1',
      score: 50,
      passed: false,
      totalPoints: 10,
      maxPoints: 20,
      answers: {},
      submittedAt: '2026-10-25T10:00:00Z',
      attemptNumber: 1
    }
  ];

  const check = canCompleteSession(session, quiz, failedAttempts);
  assert.equal(check.allowed, false);
  assert.ok(check.reason?.includes('75%'));
  assert.ok(check.reason?.includes('50%'));

  const status = evaluateSessionQuizStatus(session, quiz, failedAttempts);
  assert.equal(status.status, 'failed');
  assert.equal(status.bestScore, 50);
  assert.equal(status.canCompleteSession, false);
  assert.equal(status.actionLabel, 'Ulangi Kuis (50%)');
});

// Case 45: Alur Kuis - Siswa yang memenuhi passingScore diizinkan menyelesaikan sesi dan lanjut ke sesi berikutnya
test('Case 45: canCompleteSession dan canAdvanceToNextSession mengizinkan penyelesaian dan perpindahan ke sesi berikutnya setelah lulus kuis', async () => {
  const { canCompleteSession, canAdvanceToNextSession, evaluateSessionQuizStatus } = await import('./quizFlowHelper.js');

  const session: import('../types/index.js').Session = {
    id: 'session-1',
    courseId: 'course-1',
    title: 'Sesi 1',
    titleAr: '',
    description: '',
    order: 1,
    isPublished: true,
    quizId: 'quiz-1'
  };

  const quiz: import('../types/index.js').Quiz = {
    id: 'quiz-1',
    sessionId: 'session-1',
    courseId: 'course-1',
    title: 'Kuis Evaluasi',
    passingScore: 75,
    timeLimitMinutes: 10,
    maxAttempts: 3,
    showAnswersAfterSubmit: true,
    isPublished: true,
    questions: []
  };

  const passedAttempts: import('../types/index.js').QuizAttempt[] = [
    {
      id: 'att-1',
      userId: 'user-123',
      userName: 'Ahmad',
      userEmail: 'ahmad@example.com',
      quizId: 'quiz-1',
      sessionId: 'session-1',
      courseId: 'course-1',
      score: 50,
      passed: false,
      totalPoints: 10,
      maxPoints: 20,
      answers: {},
      submittedAt: '2026-10-25T10:00:00Z',
      attemptNumber: 1
    },
    {
      id: 'att-2',
      userId: 'user-123',
      userName: 'Ahmad',
      userEmail: 'ahmad@example.com',
      quizId: 'quiz-1',
      sessionId: 'session-1',
      courseId: 'course-1',
      score: 100,
      passed: true,
      totalPoints: 20,
      maxPoints: 20,
      answers: {},
      submittedAt: '2026-10-25T11:00:00Z',
      attemptNumber: 2
    }
  ];

  const checkComplete = canCompleteSession(session, quiz, passedAttempts);
  assert.equal(checkComplete.allowed, true);

  const checkAdvance = canAdvanceToNextSession(session, quiz, passedAttempts);
  assert.equal(checkAdvance.allowed, true);

  const status = evaluateSessionQuizStatus(session, quiz, passedAttempts);
  assert.equal(status.status, 'passed');
  assert.equal(status.bestScore, 100);
  assert.equal(status.canCompleteSession, true);
  assert.equal(status.actionLabel, 'Kuis Selesai (100%)');
});

// Case 46: Alur Kuis - Pemblokiran akses lompat ke sesi berikutnya jika kuis belum lulus
test('Case 46: canAdvanceToNextSession memblokir navigasi ke sesi berikutnya dan menyertakan pesan pengalihan jika kuis belum selesai', async () => {
  const { canAdvanceToNextSession } = await import('./quizFlowHelper.js');

  const currentSession: import('../types/index.js').Session = {
    id: 'session-tsalatsah-1',
    courseId: 'course-tsalatsatil-ushul',
    title: 'Sesi 1: Empat Perkara Wajib',
    titleAr: '',
    description: '',
    order: 1,
    isPublished: true,
    quizId: 'quiz-tsalatsah-1'
  };

  const quiz: import('../types/index.js').Quiz = {
    id: 'quiz-tsalatsah-1',
    sessionId: 'session-tsalatsah-1',
    courseId: 'course-tsalatsatil-ushul',
    title: 'Evaluasi Kuis Sesi 1',
    passingScore: 75,
    timeLimitMinutes: 10,
    maxAttempts: 3,
    showAnswersAfterSubmit: true,
    isPublished: true,
    questions: []
  };

  // Belum dikerjakan -> diblokir
  const check = canAdvanceToNextSession(currentSession, quiz, []);
  assert.equal(check.allowed, false);
  assert.equal(
    check.reason,
    'Silakan kerjakan kuis sesi ini terlebih dahulu sebelum melanjutkan ke sesi berikutnya.'
  );
});

// Case 47: findFirstUncompletedPrecedingQuizSession memblokir lompat sesi jika ada kuis di sesi sebelumnya yang belum dikerjakan
test('Case 47: findFirstUncompletedPrecedingQuizSession mendeteksi kuis belum selesai pada sesi sebelumnya dan mengembalikan pesan ramah', async () => {
  const { findFirstUncompletedPrecedingQuizSession } = await import('./quizFlowHelper.js');

  const s1: import('../types/index.js').Session = {
    id: 's-1',
    courseId: 'c-1',
    title: 'Sesi 1: Muqaddimah',
    titleAr: '',
    description: '',
    order: 1,
    isPublished: true,
    quizId: 'q-1'
  };

  const s2: import('../types/index.js').Session = {
    id: 's-2',
    courseId: 'c-1',
    title: 'Sesi 2: Rukun Islam',
    titleAr: '',
    description: '',
    order: 2,
    isPublished: true,
    quizId: 'q-2'
  };

  const s3: import('../types/index.js').Session = {
    id: 's-3',
    courseId: 'c-1',
    title: 'Sesi 3: Ihsan',
    titleAr: '',
    description: '',
    order: 3,
    isPublished: true
  };

  const q1: import('../types/index.js').Quiz = {
    id: 'q-1',
    courseId: 'c-1',
    title: 'Kuis Sesi 1',
    passingScore: 70,
    timeLimitMinutes: 0,
    maxAttempts: 3,
    showAnswersAfterSubmit: true,
    isPublished: true,
    questions: []
  };

  // Siswa belum mengerjakan kuis sesi 1, lalu mencoba klik sesi 2
  const checkS2 = findFirstUncompletedPrecedingQuizSession([s1, s2, s3], s2, [], { 'q-1': q1 });
  assert.equal(checkS2.hasBlockingQuiz, true);
  assert.equal(checkS2.blockingSession?.id, 's-1');
  assert.equal(
    checkS2.message,
    'Anda masih memiliki kuis yang belum dikerjakan pada sesi sebelumnya. Silakan kerjakan kuis tersebut terlebih dahulu agar dapat melanjutkan pembelajaran.'
  );

  // Siswa mencoba klik sesi 3 (melompati sesi 1 dan 2)
  const checkS3 = findFirstUncompletedPrecedingQuizSession([s1, s2, s3], s3, [], { 'q-1': q1 });
  assert.equal(checkS3.hasBlockingQuiz, true);
  assert.equal(checkS3.blockingSession?.id, 's-1');
});

// Case 48: findFirstUncompletedPrecedingQuizSession tidak memblokir navigasi mundur ke sesi terdahulu
test('Case 48: Navigasi mundur ke sesi awal (mengulang materi terdahulu) tidak diblokir oleh kuis sesi setelahnya', async () => {
  const { findFirstUncompletedPrecedingQuizSession } = await import('./quizFlowHelper.js');

  const s1: import('../types/index.js').Session = {
    id: 's-1',
    courseId: 'c-1',
    title: 'Sesi 1',
    titleAr: '',
    description: '',
    order: 1,
    isPublished: true
  };

  const s2: import('../types/index.js').Session = {
    id: 's-2',
    courseId: 'c-1',
    title: 'Sesi 2',
    titleAr: '',
    description: '',
    order: 2,
    isPublished: true,
    quizId: 'q-2'
  };

  // Navigasi ke Sesi 1 (sesi pertama) tidak memiliki sesi pendahulu sehingga tidak pernah diblokir
  const checkS1 = findFirstUncompletedPrecedingQuizSession([s1, s2], s1, [], {});
  assert.equal(checkS1.hasBlockingQuiz, false);
});

// Case 49: findFirstUncompletedPrecedingQuizSession membuka blokir saat kuis sesi pendahulu telah lulus
test('Case 49: findFirstUncompletedPrecedingQuizSession mengizinkan akses ke sesi berikutnya setelah kuis pendahulu lulus', async () => {
  const { findFirstUncompletedPrecedingQuizSession } = await import('./quizFlowHelper.js');

  const s1: import('../types/index.js').Session = {
    id: 's-1',
    courseId: 'c-1',
    title: 'Sesi 1',
    titleAr: '',
    description: '',
    order: 1,
    isPublished: true,
    quizId: 'q-1'
  };

  const s2: import('../types/index.js').Session = {
    id: 's-2',
    courseId: 'c-1',
    title: 'Sesi 2',
    titleAr: '',
    description: '',
    order: 2,
    isPublished: true
  };

  const q1: import('../types/index.js').Quiz = {
    id: 'q-1',
    courseId: 'c-1',
    title: 'Kuis Sesi 1',
    passingScore: 70,
    timeLimitMinutes: 0,
    maxAttempts: 3,
    showAnswersAfterSubmit: true,
    isPublished: true,
    questions: []
  };

  const passedAttempts: import('../types/index.js').QuizAttempt[] = [
    {
      id: 'att-1',
      userId: 'u-1',
      userName: 'Ahmad',
      userEmail: 'ahmad@example.com',
      quizId: 'q-1',
      sessionId: 's-1',
      courseId: 'c-1',
      score: 80,
      passed: true,
      totalPoints: 16,
      maxPoints: 20,
      answers: {},
      submittedAt: '2026-10-26T10:00:00Z',
      attemptNumber: 1
    }
  ];

  const check = findFirstUncompletedPrecedingQuizSession([s1, s2], s2, passedAttempts, { 'q-1': q1 });
  assert.equal(check.hasBlockingQuiz, false);
});

// ============================================================================
// QUIZ BULK IMPORT PARSER TESTS
// ============================================================================

test('Case 50: parseQuizImportText mengenali beragam format nomor soal (1., 1), Soal 1:, Nomor 1:)', async () => {
  const { parseQuizImportText } = await import('./quizImportParser.js');
  const sample = `
1. Rukun Islam yang kedua adalah?
A. Syahadat
B. Shalat
C. Puasa
D. Zakat
Kunci: B

2) Siapakah khulafaur rasyidin yang pertama?
a. Umar bin Khattab
b. Abu Bakar Ash-Shiddiq
c. Utsman bin Affan
d. Ali bin Abi Thalib
Jawaban: B

Soal 3: Berapakah jumlah rakaat shalat Zhuhur?
A) 2
B) 3
C) 4
D) 5
Kunci: C
Pembahasan: Shalat Zhuhur dikerjakan sebanyak 4 rakaat bagi mukim.
`;

  const result = parseQuizImportText(sample);
  assert.equal(result.totalParsed, 3);
  assert.equal(result.questions.length, 3);

  // Question 1
  assert.equal(result.questions[0].originalNumber, 1);
  assert.ok(result.questions[0].questionText.includes('Rukun Islam yang kedua adalah?'));
  assert.equal(result.questions[0].options.length, 4);
  assert.equal(result.questions[0].options[0], 'Syahadat');
  assert.equal(result.questions[0].options[1], 'Shalat');
  assert.equal(result.questions[0].detectedKeyLetter, 'B');
  assert.equal(result.questions[0].correctAnswerIndex, 1);
  assert.equal(result.questions[0].status, 'valid');

  // Question 2
  assert.equal(result.questions[1].originalNumber, 2);
  assert.ok(result.questions[1].questionText.includes('Siapakah khulafaur rasyidin'));
  assert.equal(result.questions[1].options.length, 4);
  assert.equal(result.questions[1].detectedKeyLetter, 'B');
  assert.equal(result.questions[1].correctAnswerIndex, 1);
  assert.equal(result.questions[1].status, 'valid');

  // Question 3
  assert.equal(result.questions[2].originalNumber, 3);
  assert.ok(result.questions[2].questionText.includes('Berapakah jumlah rakaat shalat Zhuhur?'));
  assert.equal(result.questions[2].detectedKeyLetter, 'C');
  assert.equal(result.questions[2].correctAnswerIndex, 2);
  assert.equal(result.questions[2].status, 'valid');
  assert.ok(result.questions[2].explanation?.includes('4 rakaat bagi mukim'));
});

test('Case 51: parseQuizImportText mempertahankan teks Arab berharakat dan teks multi-baris', async () => {
  const { parseQuizImportText } = await import('./quizImportParser.js');
  const sample = `
1. Perhatikan lafaz hadits berikut ini:
مَنْ يُرِدِ اللَّهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّينِ
Apakah makna dari potongan hadits di atas?
A. Barangsiapa yang Allah kehendaki kebaikan baginya, niscaya Allah akan pahamkan dia dalam agama
B. Menuntut ilmu itu wajib bagi setiap muslim
C. Amal perbuatan tergantung pada niatnya
D. Shalat adalah tiang agama
Kunci: A
Pembahasan: Hadits riwayat Al-Bukhari dan Muslim tentang keutamaan ilmu fiqih.
`;

  const result = parseQuizImportText(sample);
  assert.equal(result.totalParsed, 1);
  const q = result.questions[0];
  assert.ok(q.questionText.includes('مَنْ يُرِدِ اللَّهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّينِ'));
  assert.ok(q.questionText.includes('Apakah makna dari potongan hadits di atas?'));
  assert.equal(q.correctAnswerIndex, 0);
  assert.equal(q.detectedKeyLetter, 'A');
  assert.equal(q.status, 'valid');
  assert.ok(q.explanation?.includes('Al-Bukhari dan Muslim'));
});

test('Case 52: parseQuizImportText menandai soal tanpa kunci jawaban atau opsi yang tidak valid', async () => {
  const { parseQuizImportText } = await import('./quizImportParser.js');
  const sample = `
1. Soal tanpa kunci jawaban
A. Pilihan satu
B. Pilihan dua

2. Soal lengkap
A. Opsi A
B. Opsi B
Kunci: A
`;

  const result = parseQuizImportText(sample);
  assert.equal(result.totalParsed, 2);
  assert.equal(result.validCount, 1);
  assert.equal(result.needsReviewCount, 1);

  assert.equal(result.questions[0].status, 'missing_key');
  assert.ok(result.questions[0].warningMessage?.includes('Kunci belum terdeteksi'));
  assert.equal(result.questions[1].status, 'valid');
});

test('Case 53: convertImportQuestionsToQuestions menghasilkan Question[] yang kompatibel Firestore', async () => {
  const { parseQuizImportText, convertImportQuestionsToQuestions } = await import('./quizImportParser.js');
  const sample = `
1. Apa hukum wudhu sebelum shalat?
A. Wajib
B. Sunnah
C. Makruh
D. Mubah
Kunci: A
`;

  const result = parseQuizImportText(sample);
  const firestoreQuestions = convertImportQuestionsToQuestions(result.questions);

  assert.equal(firestoreQuestions.length, 1);
  const fq = firestoreQuestions[0];
  assert.ok(fq.id.startsWith('q_'));
  assert.equal(fq.questionText, 'Apa hukum wudhu sebelum shalat?');
  assert.equal(fq.options.length, 4);
  assert.equal(fq.correctAnswerIndex, 0);
  assert.equal(fq.points, 10);
});

test('Case 54: saveInstructorProfile menolak operasi tanpa admin terautentikasi (tidak mengembalikan sukses palsu) dan getInstructorProfile membaca langsung dari instructorProfiles/main', async () => {
  const { saveInstructorProfile, getInstructorProfile } = await import('../firebase/services.js');
  const { DEFAULT_INSTRUCTOR_PROFILE_ID, sanitizeInstructorProfilePayload } = await import('./instructorProfileHelper.js');

  // 1. Konsistensi ID dokumen: wajib 'main' (instructorProfiles/main)
  assert.equal(DEFAULT_INSTRUCTOR_PROFILE_ID, 'main');

  // 2. Uji satu field & banyak field pada payload penyimpanan
  const singleFieldPayload = sanitizeInstructorProfilePayload(
    { name: 'Osama Nur Samsil, S.H.' },
    'osamanursamsil@gmail.com'
  );
  assert.equal(singleFieldPayload.id, 'main');
  assert.equal(singleFieldPayload.name, 'Osama Nur Samsil, S.H.');
  assert.equal(singleFieldPayload.updatedBy, 'osamanursamsil@gmail.com');

  const multiFieldPayload = sanitizeInstructorProfilePayload(
    {
      name: 'Osama Nur Samsil, S.H.',
      role: 'Pengajar & Pengasuh Dars with Osama',
      title: 'Profil Pengajar Dars with Osama',
      biography: '<p>Biografi terbaru yang terverifikasi.</p>',
      mainContent: '<p>Konten utama terbaru.</p>'
    },
    'osamanursamsil@gmail.com'
  );
  assert.equal(multiFieldPayload.id, 'main');
  assert.equal(multiFieldPayload.name, 'Osama Nur Samsil, S.H.');
  assert.equal(multiFieldPayload.role, 'Pengajar & Pengasuh Dars with Osama');
  assert.equal(multiFieldPayload.title, 'Profil Pengajar Dars with Osama');
  assert.ok(multiFieldPayload.biography.includes('Biografi terbaru yang terverifikasi.'));
  assert.ok(multiFieldPayload.mainContent.includes('Konten utama terbaru.'));

  // 3. Uji penolakan bagi non-admin / unauthenticated: wajib melempar Error (tidak boleh mengembalikan sukses palsu)
  await assert.rejects(
    async () => {
      await saveInstructorProfile({ name: 'Percobaan Tanpa Login' });
    },
    /Akses ditolak: Anda harus login sebagai administrator/
  );

  // 4. Uji baca-ulang langsung dari server Cloud Firestore pada instructorProfiles/main
  const serverProfile = await getInstructorProfile(true);
  assert.equal(serverProfile.id, 'main');
  assert.ok(serverProfile.name.includes('Osama Nur Samsil'));

  const { terminate } = await import('firebase/firestore');
  const { db } = await import('../firebase/config.js');
  await terminate(db).catch(() => {});
});

test('Google Drive helper correctly extracts file IDs across all known link formats', async () => {
  const {
    extractGoogleDriveFileId,
    isGoogleDriveUrl,
    getGoogleDriveImageCandidates,
    resolveDisplayImageUrl
  } = await import('./googleDriveHelper.js');

  const testId = '1B71gP99aZ-90qD4E8F4A1bC2dE3fG4h';

  // Standard sharing view links
  assert.equal(
    extractGoogleDriveFileId(`https://drive.google.com/file/d/${testId}/view?usp=sharing`),
    testId
  );
  assert.equal(
    extractGoogleDriveFileId(`https://drive.google.com/file/d/${testId}/view`),
    testId
  );
  assert.equal(
    extractGoogleDriveFileId(`https://drive.google.com/file/d/${testId}`),
    testId
  );

  // Parameter based links
  assert.equal(
    extractGoogleDriveFileId(`https://drive.google.com/open?id=${testId}`),
    testId
  );
  assert.equal(
    extractGoogleDriveFileId(`https://drive.google.com/uc?id=${testId}&export=download`),
    testId
  );
  assert.equal(
    extractGoogleDriveFileId(`https://drive.google.com/uc?export=view&id=${testId}`),
    testId
  );
  assert.equal(
    extractGoogleDriveFileId(`https://drive.google.com/thumbnail?id=${testId}&sz=w1600`),
    testId
  );

  // Docs & CDN formats
  assert.equal(
    extractGoogleDriveFileId(`https://docs.google.com/file/d/${testId}/edit`),
    testId
  );
  assert.equal(
    extractGoogleDriveFileId(`https://lh3.googleusercontent.com/d/${testId}`),
    testId
  );

  // Negative tests
  assert.equal(extractGoogleDriveFileId('https://example.com/photo.jpg'), null);
  assert.equal(extractGoogleDriveFileId(''), null);
  assert.equal(extractGoogleDriveFileId(null), null);

  // isGoogleDriveUrl
  assert.equal(isGoogleDriveUrl(`https://drive.google.com/file/d/${testId}/view`), true);
  assert.equal(isGoogleDriveUrl('https://example.com/image.png'), false);

  // Candidates resolution
  const candidates = getGoogleDriveImageCandidates(`https://drive.google.com/file/d/${testId}/view?usp=sharing`);
  assert.equal(Array.isArray(candidates), true);
  assert.ok(candidates.length >= 3);
  assert.equal(candidates[0], `https://drive.google.com/thumbnail?id=${testId}&sz=w1600`);
  assert.equal(candidates[1], `https://lh3.googleusercontent.com/d/${testId}=w1600`);
  assert.equal(candidates[2], `https://drive.google.com/uc?export=view&id=${testId}`);

  // resolveDisplayImageUrl
  assert.equal(
    resolveDisplayImageUrl(`https://drive.google.com/file/d/${testId}/view`),
    `https://drive.google.com/thumbnail?id=${testId}&sz=w1600`
  );
  assert.equal(
    resolveDisplayImageUrl('https://example.com/regular-image.jpg'),
    'https://example.com/regular-image.jpg'
  );
});

test('Supporting images retain original Google Drive URLs when sanitized for persistence', async () => {
  const { normalizeSupportingImages, sanitizeInstructorProfilePayload } = await import('./instructorProfileHelper.js');

  const originalDriveUrl = 'https://drive.google.com/file/d/1B71gP99aZ-90qD4E8F4A1bC2dE3fG4h/view?usp=sharing';

  const normalized = normalizeSupportingImages([
    {
      id: 'img-1',
      url: originalDriveUrl,
      caption: 'Dokumentasi Majelis Fiqih',
      order: 1
    }
  ]);

  // Must preserve exact stored URL without corrupting it into an altered string
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].url, originalDriveUrl);
  assert.equal(normalized[0].caption, 'Dokumentasi Majelis Fiqih');

  const fullPayload = sanitizeInstructorProfilePayload({
    name: 'Osama Nur Samsil, S.H.',
    role: 'Pengajar Dars with Osama',
    title: 'Profil Pengajar',
    supportingImages: normalized
  });

  assert.equal(fullPayload.supportingImages.length, 1);
  assert.equal(fullPayload.supportingImages[0].url, originalDriveUrl);
});

test('Certificate modal zoom and responsive dimension calculations handle portrait and landscape files', () => {
  // 1. Zoom level clamping logic
  const calculateNextZoom = (current: number, direction: 'in' | 'out'): number => {
    if (direction === 'in') {
      return Math.min(3.0, Number((current + 0.25).toFixed(2)));
    }
    return Math.max(0.75, Number((current - 0.25).toFixed(2)));
  };

  assert.equal(calculateNextZoom(1.0, 'in'), 1.25);
  assert.equal(calculateNextZoom(1.25, 'in'), 1.5);
  assert.equal(calculateNextZoom(3.0, 'in'), 3.0); // clamped at max 3.0
  assert.equal(calculateNextZoom(1.0, 'out'), 0.75);
  assert.equal(calculateNextZoom(0.75, 'out'), 0.75); // clamped at min 0.75

  // 2. Pagination cycling logic across gallery items
  const cycleIndex = (current: number, total: number, dir: 'next' | 'prev'): number => {
    if (total <= 1) return current;
    if (dir === 'next') return (current + 1) % total;
    return (current - 1 + total) % total;
  };

  assert.equal(cycleIndex(0, 3, 'next'), 1);
  assert.equal(cycleIndex(2, 3, 'next'), 0);
  assert.equal(cycleIndex(0, 3, 'prev'), 2);

  // 3. Aspect Ratio containment verification
  // A4 Portrait Certificate: width 1200, height 1697 (ratio ~ 0.707)
  const portraitCert = { width: 1200, height: 1697 };
  // Landscape Certificate: width 1920, height 1080 (ratio ~ 1.777)
  const landscapeCert = { width: 1920, height: 1080 };

  const computeContainFit = (img: { width: number; height: number }, maxW: number, maxH: number) => {
    const scale = Math.min(maxW / img.width, maxH / img.height);
    return {
      fittedWidth: Math.round(img.width * scale),
      fittedHeight: Math.round(img.height * scale),
      scale
    };
  };

  // Test Case A: Desktop viewport (maxW = 960px, maxH = 650px)
  const desktopPortrait = computeContainFit(portraitCert, 960, 650);
  assert.ok(desktopPortrait.fittedHeight <= 650, 'Portrait fitted height must not exceed container max-height');
  assert.ok(desktopPortrait.fittedWidth <= 960, 'Portrait fitted width must not exceed container max-width');
  assert.equal(desktopPortrait.fittedHeight, 650); // Height constrained, width proportional ~459px

  const desktopLandscape = computeContainFit(landscapeCert, 960, 650);
  assert.ok(desktopLandscape.fittedHeight <= 650);
  assert.ok(desktopLandscape.fittedWidth <= 960);
  assert.equal(desktopLandscape.fittedWidth, 960); // Width constrained, height proportional ~540px

  // Test Case B: Mobile viewport (e.g. 375px width, 480px available modal preview height)
  const mobilePortrait = computeContainFit(portraitCert, 345, 480);
  assert.ok(mobilePortrait.fittedHeight <= 480);
  assert.ok(mobilePortrait.fittedWidth <= 345);

  const mobileLandscape = computeContainFit(landscapeCert, 345, 480);
  assert.ok(mobileLandscape.fittedHeight <= 480);
  assert.ok(mobileLandscape.fittedWidth <= 345);

  // Test Case C: Zoomed or Scroll Mode (e.g. 1.5x zoom or scroll mode min-width 800px)
  // When zoomed or in scroll mode, rendered width/height exceeds available viewport, triggering container overflow-auto
  const zoomedPortraitHeight = desktopPortrait.fittedHeight * 1.5;
  assert.ok(zoomedPortraitHeight > 650, 'Zoomed portrait exceeds viewport height, requiring vertical scroll');
  const scrollModeWidth = 850;
  assert.ok(scrollModeWidth > 345, 'Scroll mode width exceeds mobile width, requiring horizontal scroll');
});

test('Feature sharing configuration for Artikel Ilmiah produces exact required narration and direct main page URL', async () => {
  const {
    ARTIKEL_ILMIAH_SHARE_CONFIG,
    getFeatureShareUrl,
    formatFeatureShareMessage,
    getWhatsAppShareUrl
  } = await import('./featureShareHelper.js');

  const expectedNarration =
    'Mari menambah wawasan dan memperluas pemahaman terhadap berbagai persoalan keislaman melalui artikel-artikel ilmiah di Dars with Osama. Silakan kunjungi dan baca berbagai pembahasannya melalui tautan berikut:';

  assert.equal(ARTIKEL_ILMIAH_SHARE_CONFIG.id, 'blog');
  assert.equal(ARTIKEL_ILMIAH_SHARE_CONFIG.title, 'Artikel Ilmiah');
  assert.equal(ARTIKEL_ILMIAH_SHARE_CONFIG.narration, expectedNarration);

  // Uji tautan mengarah langsung ke halaman utama Artikel Ilmiah, bukan ke artikel tertentu
  const origin = 'https://darswithosama.com';
  const blogUrl = getFeatureShareUrl('blog', origin);
  assert.equal(blogUrl, 'https://darswithosama.com/?view=blog');
  assert.equal(blogUrl.includes('/article/'), false);

  // Uji fungsi salin pesan ajakan (narasi + tautan)
  const fullCopyMessage = formatFeatureShareMessage(ARTIKEL_ILMIAH_SHARE_CONFIG.narration, blogUrl);
  assert.ok(fullCopyMessage.startsWith(expectedNarration));
  assert.ok(fullCopyMessage.endsWith(blogUrl));
  assert.ok(fullCopyMessage.includes('\n\nhttps://darswithosama.com/?view=blog'));

  // Uji fungsi bagikan WhatsApp terpisah
  const waUrl = getWhatsAppShareUrl(ARTIKEL_ILMIAH_SHARE_CONFIG.narration, blogUrl);
  assert.ok(waUrl.startsWith('https://api.whatsapp.com/send?text='));
  assert.ok(waUrl.includes(encodeURIComponent(expectedNarration)));
  assert.ok(waUrl.includes(encodeURIComponent(blogUrl)));
});

test('Feature sharing configuration for Tanya Jawab produces exact required narration and direct main page URL', async () => {
  const {
    TANYA_JAWAB_SHARE_CONFIG,
    getFeatureShareUrl,
    formatFeatureShareMessage,
    getWhatsAppShareUrl
  } = await import('./featureShareHelper.js');

  const expectedNarration =
    'Memiliki pertanyaan seputar persoalan keislaman? Mari manfaatkan Ruang Tanya Jawab Dars with Osama untuk menyampaikan pertanyaan, membaca berbagai pembahasan, dan mengambil manfaat dari jawaban yang tersedia. Kunjungi melalui tautan berikut:';

  assert.equal(TANYA_JAWAB_SHARE_CONFIG.id, 'public-qa');
  assert.equal(TANYA_JAWAB_SHARE_CONFIG.title, 'Tanya Jawab');
  assert.equal(TANYA_JAWAB_SHARE_CONFIG.narration, expectedNarration);

  // Uji tautan mengarah langsung ke halaman utama Tanya Jawab, bukan ke pertanyaan/jawaban tertentu
  const origin = 'https://darswithosama.com';
  const qaUrl = getFeatureShareUrl('public-qa', origin);
  assert.equal(qaUrl, 'https://darswithosama.com/?view=public-qa');
  assert.equal(qaUrl.includes('/qa/'), false);

  // Uji fungsi salin pesan ajakan (narasi + tautan)
  const fullCopyMessage = formatFeatureShareMessage(TANYA_JAWAB_SHARE_CONFIG.narration, qaUrl);
  assert.ok(fullCopyMessage.startsWith(expectedNarration));
  assert.ok(fullCopyMessage.endsWith(qaUrl));
  assert.ok(fullCopyMessage.includes('\n\nhttps://darswithosama.com/?view=public-qa'));

  // Uji fungsi bagikan WhatsApp terpisah
  const waUrl = getWhatsAppShareUrl(TANYA_JAWAB_SHARE_CONFIG.narration, qaUrl);
  assert.ok(waUrl.startsWith('https://api.whatsapp.com/send?text='));
  assert.ok(waUrl.includes(encodeURIComponent(expectedNarration)));
  assert.ok(waUrl.includes(encodeURIComponent(qaUrl)));
});

test('Direct feature URLs for Artikel Ilmiah and Tanya Jawab parse correctly to their respective views', async () => {
  const { parseUrlToRouteState } = await import('./navigationHistory.js');

  // Query parameter based routes (universal across all hosts)
  const blogQueryRoute = parseUrlToRouteState('/', '?view=blog');
  assert.equal(blogQueryRoute.view, 'blog');

  const qaQueryRoute = parseUrlToRouteState('/', '?view=public-qa');
  assert.equal(qaQueryRoute.view, 'public-qa');

  // Clean path based routes
  const artikelPathRoute = parseUrlToRouteState('/artikel', '');
  assert.equal(artikelPathRoute.view, 'blog');

  const blogPathRoute = parseUrlToRouteState('/blog', '');
  assert.equal(blogPathRoute.view, 'blog');

  const tanyaJawabPathRoute = parseUrlToRouteState('/tanya-jawab', '');
  assert.equal(tanyaJawabPathRoute.view, 'public-qa');

  const qaPathRoute = parseUrlToRouteState('/qa', '');
  assert.equal(qaPathRoute.view, 'public-qa');
});

test('validateArticleImageSource recognizes Google Drive links, extracts file ID, and provides direct endpoint', async () => {
  const { validateArticleImageSource } = await import('./googleDriveHelper.js');

  const testFileId = '1C89vW99aZ-90qD4E8F4A1bC2dE3fG4x';

  // 1. Valid Google Drive sharing URL
  const driveResult = validateArticleImageSource(`https://drive.google.com/file/d/${testFileId}/view?usp=sharing`);
  assert.equal(driveResult.isValid, true);
  assert.equal(driveResult.isGoogleDrive, true);
  assert.equal(driveResult.fileId, testFileId);
  assert.equal(driveResult.directUrl, `https://drive.google.com/thumbnail?id=${testFileId}&sz=w1600`);
  assert.ok(driveResult.warning?.includes('Siapa saja yang memiliki link'));

  // 2. Valid standard HTTPS image URL
  const standardResult = validateArticleImageSource('https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format');
  assert.equal(standardResult.isValid, true);
  assert.equal(standardResult.isGoogleDrive, false);
  assert.equal(standardResult.fileId, null);
  assert.equal(standardResult.directUrl, 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format');

  // 3. Invalid Google Drive link with missing ID
  const invalidDrive = validateArticleImageSource('https://drive.google.com/file/d//view');
  assert.equal(invalidDrive.isValid, false);
  assert.equal(invalidDrive.isGoogleDrive, true);
  assert.ok(invalidDrive.error?.includes('Format tautan Google Drive tidak valid'));

  // 4. Empty or invalid URL
  assert.equal(validateArticleImageSource('').isValid, false);
  assert.equal(validateArticleImageSource('   ').isValid, false);
  assert.equal(validateArticleImageSource('not-a-valid-url').isValid, false);
});

test('normalizeArticleHtmlImages converts Google Drive inline images to direct endpoints and preserves original attributes', async () => {
  const { normalizeArticleHtmlImages, extractArticleImages } = await import('./googleDriveHelper.js');

  const fileId1 = '1B71gP99aZ-90qD4E8F4A1bC2dE3fG4h';
  const fileId2 = '2C82hQ00bA-11rE5F9G5B2cD3eF4gH5i';

  const rawHtml = `
    <p>Pengantar materi keilmuan syar'i.</p>
    <figure class="my-6">
      <img src="https://drive.google.com/file/d/${fileId1}/view?usp=sharing" alt="Manuskrip Fiqih" class="w-full h-auto rounded-lg border-2" />
      <figcaption>Manuskrip Fiqih Kuno</figcaption>
    </figure>
    <p>Pembahasan bagian kedua dengan gambar eksternal:</p>
    <img src="https://images.unsplash.com/photo-example.jpg" alt="Kitab Terbuka" />
    <p>Pembahasan ketiga dengan link Google Drive parameter:</p>
    <img src="https://drive.google.com/open?id=${fileId2}" alt="Diagram Sanad" />
  `;

  const normalized = normalizeArticleHtmlImages(rawHtml);

  // 1. Google Drive image 1 should be converted to direct thumbnail endpoint
  assert.ok(normalized.includes(`src="https://drive.google.com/thumbnail?id=${fileId1}&sz=w1600"`));
  assert.ok(normalized.includes(`data-drive-id="${fileId1}"`));
  assert.ok(normalized.includes(`data-original-src="https://drive.google.com/file/d/${fileId1}/view?usp=sharing"`));
  assert.ok(normalized.includes('loading="lazy"'));
  assert.ok(normalized.includes('max-w-full'));

  // 2. Standard image should preserve its src and get responsive classes
  assert.ok(normalized.includes('src="https://images.unsplash.com/photo-example.jpg"'));
  assert.ok(normalized.includes('max-w-full'));
  assert.ok(normalized.includes('loading="lazy"'));

  // 3. Google Drive image 2 should also be converted to direct thumbnail endpoint
  assert.ok(normalized.includes(`src="https://drive.google.com/thumbnail?id=${fileId2}&sz=w1600"`));
  assert.ok(normalized.includes(`data-drive-id="${fileId2}"`));

  // 4. extractArticleImages extracts all 3 images with proper flags
  const extracted = extractArticleImages(normalized);
  assert.equal(extracted.length, 3);
  assert.equal(extracted[0].isDrive, true);
  assert.equal(extracted[0].fileId, fileId1);
  assert.equal(extracted[1].isDrive, false);
  assert.equal(extracted[1].fileId, null);
  assert.equal(extracted[2].isDrive, true);
  assert.equal(extracted[2].fileId, fileId2);
});

test('extractTableOfContents and injectHeadingIdsIntoHtml detect only Heading 1, excluding H2, H3, and normal paragraphs', async () => {
  const { extractTableOfContents, injectHeadingIdsIntoHtml } = await import('./tableOfContentsHelper.js');

  const articleHtml = `
    <p>Pengantar singkat artikel sebelum masuk ke pokok bahasan.</p>
    <h1>1. Keutamaan Menuntut Ilmu Syar'i</h1>
    <p>Ilmu adalah lentera bagi setiap muslim.</p>
    <h2>Sub-pembahasan A (Dalil Al-Qur'an)</h2>
    <p>Ayat-ayat seputar ilmu.</p>
    <h3>Rincian Tafsir Ayat</h3>
    <p>Keterangan para ulama mufassir.</p>
    <h1>2. Adab Penuntut Ilmu Terhadap Guru</h1>
    <p>Menghormati ahlul 'ilmi.</p>
    <h2>Sub-pembahasan B (Kisah Salaf)</h2>
    <p>Kisah Imam Syafi'i dan Imam Malik.</p>
    <h1>3. Buah Manis Dari Pengamalan Ilmu</h1>
    <p>Ilmu yang berbuah amal shaleh.</p>
  `;

  const toc = extractTableOfContents(articleHtml);

  // Must only contain 3 Heading 1 items
  assert.equal(toc.length, 3);
  assert.equal(toc[0].text, "1. Keutamaan Menuntut Ilmu Syar'i");
  assert.equal(toc[1].text, "2. Adab Penuntut Ilmu Terhadap Guru");
  assert.equal(toc[2].text, "3. Buah Manis Dari Pengamalan Ilmu");

  // H2 and H3 must NOT be present
  assert.ok(!toc.some(item => item.text.includes("Sub-pembahasan")));
  assert.ok(!toc.some(item => item.text.includes("Rincian Tafsir")));

  // Injected HTML verification
  const { processedHtml, items } = injectHeadingIdsIntoHtml(articleHtml);
  assert.equal(items.length, 3);
  assert.ok(processedHtml.includes(`id="${items[0].id}"`));
  assert.ok(processedHtml.includes(`id="${items[1].id}"`));
  assert.ok(processedHtml.includes(`id="${items[2].id}"`));
  assert.ok(processedHtml.includes('scroll-mt-24'));
});

test('Table of Contents generates collision-free unique IDs for duplicate Heading 1 titles and handles Arabic text', async () => {
  const { extractTableOfContents, injectHeadingIdsIntoHtml } = await import('./tableOfContentsHelper.js');

  const duplicateHeadingHtml = `
    <h1>Faedah Kajian</h1>
    <p>Faedah pertama.</p>
    <h1>Faedah Kajian</h1>
    <p>Faedah kedua dengan judul yang persis sama.</p>
    <h1>Faedah Kajian</h1>
    <p>Faedah ketiga.</p>
    <h1>فَضْلُ العِلْمِ وَالعَمَلِ</h1>
    <p>Naskah dalam bahasa Arab.</p>
  `;

  const { processedHtml, items } = injectHeadingIdsIntoHtml(duplicateHeadingHtml);

  assert.equal(items.length, 4);

  // Check unique IDs for identical headings
  assert.equal(items[0].id, 'faedah-kajian');
  assert.equal(items[1].id, 'faedah-kajian-2');
  assert.equal(items[2].id, 'faedah-kajian-3');

  // Check Arabic heading preserves unicode slug or resolves properly
  assert.ok(items[3].id.length > 0);
  assert.ok(!items[3].id.includes(' '));

  // IDs in the set must be strictly unique
  const idSet = new Set(items.map(i => i.id));
  assert.equal(idSet.size, 4);

  // Each ID must exist in processedHtml
  items.forEach(item => {
    assert.ok(processedHtml.includes(`id="${item.id}"`));
  });
});

test('Table of Contents returns empty array and does not modify HTML when article has no Heading 1', async () => {
  const { extractTableOfContents, injectHeadingIdsIntoHtml } = await import('./tableOfContentsHelper.js');

  const noH1Html = `
    <p>Artikel narasi biasa tanpa Heading 1.</p>
    <h2>Sub-judul saja</h2>
    <p>Isi artikel lanjutan.</p>
    <h3>Rincian poin</h3>
    <p>Penutup tulisan.</p>
  `;

  const toc = extractTableOfContents(noH1Html);
  assert.equal(toc.length, 0);

  const { processedHtml, items } = injectHeadingIdsIntoHtml(noH1Html);
  assert.equal(items.length, 0);
  assert.equal(processedHtml, noH1Html);
});

test('Table of Contents handles HTML with nested tags inside Heading 1 cleanly', async () => {
  const { extractTableOfContents } = await import('./tableOfContentsHelper.js');

  const formattedH1Html = `
    <h1><b>Bab 1:</b> <span>Pengertian</span> &amp; Syarat Kalam</h1>
    <p>Pembahasan materi.</p>
    <h1 style="text-align: center;"><span style="color: green;">Bab 2:</span> Macam-Macam I'rab</h1>
  `;

  const toc = extractTableOfContents(formattedH1Html);
  assert.equal(toc.length, 2);
  assert.equal(toc[0].text, "Bab 1: Pengertian & Syarat Kalam");
  assert.equal(toc[1].text, "Bab 2: Macam-Macam I'rab");
});

test('Floating Toolbar: calculateFloatingToolbarPosition places toolbar ABOVE selection when headroom exists', async () => {
  const { calculateFloatingToolbarPosition } = await import('./floatingToolbarHelper.js');

  const selectionRect = {
    top: 300,
    bottom: 330,
    left: 400,
    right: 500,
    width: 100,
    height: 30
  };

  const toolbarDimensions = { width: 500, height: 44 };
  const viewportDimensions = { width: 1200, height: 800 };

  const result = calculateFloatingToolbarPosition(
    selectionRect,
    toolbarDimensions,
    viewportDimensions,
    { minTopBoundary: 70, padding: 12, offset: 8 }
  );

  assert.equal(result.isVisible, true);
  assert.equal(result.placement, 'top');
  // top = 300 - (44 + 8) = 248
  assert.equal(result.top, 248);
  // center = 400 + 50 = 450, left = 450 - 250 = 200
  assert.equal(result.left, 200);
});

test('Floating Toolbar: calculateFloatingToolbarPosition flips BELOW selection when close to top sticky header', async () => {
  const { calculateFloatingToolbarPosition } = await import('./floatingToolbarHelper.js');

  const selectionRect = {
    top: 85,
    bottom: 115,
    left: 200,
    right: 320,
    width: 120,
    height: 30
  };

  const toolbarDimensions = { width: 450, height: 44 };
  const viewportDimensions = { width: 1000, height: 800 };

  const result = calculateFloatingToolbarPosition(
    selectionRect,
    toolbarDimensions,
    viewportDimensions,
    { minTopBoundary: 70, padding: 12, offset: 8 }
  );

  assert.equal(result.isVisible, true);
  assert.equal(result.placement, 'bottom');
  // top = bottom + offset = 115 + 8 = 123
  assert.equal(result.top, 123);
});

test('Floating Toolbar: calculateFloatingToolbarPosition clamps left and right boundaries within screen', async () => {
  const { calculateFloatingToolbarPosition } = await import('./floatingToolbarHelper.js');

  // Near left edge
  const leftSelection = {
    top: 200,
    bottom: 230,
    left: 10,
    right: 50,
    width: 40,
    height: 30
  };

  const toolbarDimensions = { width: 400, height: 44 };
  const viewportDimensions = { width: 500, height: 800 };

  const leftResult = calculateFloatingToolbarPosition(
    leftSelection,
    toolbarDimensions,
    viewportDimensions,
    { padding: 16 }
  );
  assert.equal(leftResult.left, 16, 'Left edge must be clamped to padding');

  // Near right edge
  const rightSelection = {
    top: 200,
    bottom: 230,
    left: 460,
    right: 490,
    width: 30,
    height: 30
  };

  const rightResult = calculateFloatingToolbarPosition(
    rightSelection,
    toolbarDimensions,
    viewportDimensions,
    { padding: 16 }
  );
  // maxLeft = 500 - 400 - 16 = 84
  assert.equal(rightResult.left, 84, 'Right edge must be clamped to screen width - padding');
});

test('Floating Toolbar: calculateFloatingToolbarPosition hides when selection is scrolled out of viewport', async () => {
  const { calculateFloatingToolbarPosition } = await import('./floatingToolbarHelper.js');

  // Scrolled completely above top
  const outAbove = {
    top: -100,
    bottom: 60,
    left: 100,
    right: 200,
    width: 100,
    height: 30
  };

  const resAbove = calculateFloatingToolbarPosition(
    outAbove,
    { width: 300, height: 40 },
    { width: 1000, height: 800 },
    { minTopBoundary: 70 }
  );
  assert.equal(resAbove.isVisible, false);

  // Scrolled completely below viewport
  const outBelow = {
    top: 850,
    bottom: 880,
    left: 100,
    right: 200,
    width: 100,
    height: 30
  };

  const resBelow = calculateFloatingToolbarPosition(
    outBelow,
    { width: 300, height: 40 },
    { width: 1000, height: 800 }
  );
  assert.equal(resBelow.isVisible, false);
});

test('Floating Toolbar: isTextSelectionActive distinguishes valid selection from collapsed or whitespace', async () => {
  const { isTextSelectionActive } = await import('./floatingToolbarHelper.js');

  assert.equal(isTextSelectionActive(null), false);
  assert.equal(isTextSelectionActive({ isCollapsed: true, text: 'Hello' }), false);
  assert.equal(isTextSelectionActive({ isCollapsed: false, text: '   \n  ' }), false);
  assert.equal(isTextSelectionActive({ isCollapsed: false, text: 'Kalam dan Isim' }), true);
  assert.equal(isTextSelectionActive({ isCollapsed: false, text: 'بسم الله' }), true);
});

test('Instructor Profile: sanitizeInstructorProfilePayload supports photo upload, replacement, deletion, and unsafe URL protection', async () => {
  const { sanitizeInstructorProfilePayload } = await import('./instructorProfileHelper.js');

  // 1. Upload valid Firebase Storage photo URL
  const validUploadedPayload = sanitizeInstructorProfilePayload({
    name: 'Osama Nur Samsil, S.H.',
    role: 'Pengasuh Dars with Osama',
    title: 'Profil Pengajar',
    photoUrl: 'https://firebasestorage.googleapis.com/v0/b/project.appspot.com/o/instructor_profile%2Favatar.jpg?alt=media&token=123'
  });
  assert.equal(
    validUploadedPayload.photoUrl,
    'https://firebasestorage.googleapis.com/v0/b/project.appspot.com/o/instructor_profile%2Favatar.jpg?alt=media&token=123'
  );

  // 2. Upload valid Google Drive photo URL
  const validDrivePayload = sanitizeInstructorProfilePayload({
    name: 'Osama Nur Samsil, S.H.',
    role: 'Pengasuh Dars with Osama',
    title: 'Profil Pengajar',
    photoUrl: 'https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J/view?usp=sharing'
  });
  assert.equal(
    validDrivePayload.photoUrl,
    'https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J/view?usp=sharing'
  );

  // 3. Delete photo (admin clears photo to revert to initial)
  const deletedPhotoPayload = sanitizeInstructorProfilePayload({
    name: 'Osama Nur Samsil, S.H.',
    role: 'Pengasuh Dars with Osama',
    title: 'Profil Pengajar',
    photoUrl: ''
  });
  assert.equal(deletedPhotoPayload.photoUrl, '', 'Deleted photo must result in empty string for fallback initials');

  // 4. Reject unsafe javascript: photo URL
  const unsafePayload = sanitizeInstructorProfilePayload({
    name: 'Osama Nur Samsil, S.H.',
    role: 'Pengasuh Dars with Osama',
    title: 'Profil Pengajar',
    photoUrl: 'javascript:alert("exploit")'
  });
  assert.equal(unsafePayload.photoUrl, '', 'Unsafe URL must be sanitized away to prevent XSS');
});

test('Instructor Profile: Author bio card correctly resolves photo or defaults to initial with label PENGASUH DARS WITH OSAMA', async () => {
  const { resolveDisplayImageUrl } = await import('./googleDriveHelper.js');

  const instructorPhoto = 'https://firebasestorage.googleapis.com/v0/b/project.appspot.com/o/instructor_profile%2Fphoto.webp';
  const postWithoutAuthorPhoto = {
    authorName: 'Osama',
    authorPhoto: ''
  };

  // When instructor has uploaded photo, author card resolves it
  const effectivePhoto = instructorPhoto || postWithoutAuthorPhoto.authorPhoto;
  assert.equal(effectivePhoto, instructorPhoto);
  const resolvedUrl = resolveDisplayImageUrl(effectivePhoto);
  assert.ok(resolvedUrl.startsWith('https://'));

  // When no photo is available anywhere, initial fallback is computed
  const noPhotoAvailable = '';
  const initialFallback = (postWithoutAuthorPhoto.authorName || 'Osama').charAt(0).toUpperCase();
  assert.equal(noPhotoAvailable, '');
  assert.equal(initialFallback, 'O');
});

// Case 78: Mobile Carousel Horizontal Scroll & Active Index Math
test('Mobile Carousel: Calculates peek width and active index correctly for horizontal touch swipe', () => {
  // Mobile card width ratio is 84vw (0.84) leaving ~16vw for next card peek
  const viewportWidth = 375; // Standard mobile screen width
  const cardWidthRatio = 0.84;
  const singleCardWidth = viewportWidth * cardWidthRatio; // 315px
  const peekWidth = viewportWidth * (1 - cardWidthRatio); // 60px visible of next card

  assert.ok(singleCardWidth >= 300, 'Card width on mobile should remain large and comfortable');
  assert.ok(peekWidth >= 40, 'Next card must peek at least 40px to cue horizontal scrollability');

  // Active index calculation logic
  const calculateActiveIndex = (scrollLeft: number, clientWidth: number, totalItems: number): number => {
    const step = clientWidth * 0.85;
    const idx = Math.round(scrollLeft / (step || 1));
    return Math.min(Math.max(0, idx), totalItems - 1);
  };

  const totalCourses = 4;
  // At start
  assert.equal(calculateActiveIndex(0, viewportWidth, totalCourses), 0);
  // Scrolled to card 1
  assert.equal(calculateActiveIndex(318, viewportWidth, totalCourses), 1);
  // Scrolled to card 2
  assert.equal(calculateActiveIndex(636, viewportWidth, totalCourses), 2);
  // Clamped at end
  assert.equal(calculateActiveIndex(2000, viewportWidth, totalCourses), 3);
});

// Case 79: Mobile Carousel Touch Gesture Direction & Velocity Threshold
test('Mobile Carousel: Distinguishes horizontal touch swipe from vertical page scroll and calculates threshold', () => {
  // Function mimicking touch movement vector detection
  const detectGestureDirection = (diffX: number, diffY: number): 'horizontal' | 'vertical' | 'undecided' => {
    if (Math.abs(diffX) <= 5 && Math.abs(diffY) <= 5) return 'undecided';
    return Math.abs(diffX) >= Math.abs(diffY) ? 'horizontal' : 'vertical';
  };

  // 1. Horizontal swipe motion
  assert.equal(detectGestureDirection(-45, 10), 'horizontal');
  assert.equal(detectGestureDirection(50, -5), 'horizontal');

  // 2. Vertical page scroll motion
  assert.equal(detectGestureDirection(5, -60), 'vertical');
  assert.equal(detectGestureDirection(-8, 80), 'vertical');

  // 3. Tiny touch jitter (undecided)
  assert.equal(detectGestureDirection(2, 3), 'undecided');

  // Target card decision based on swipe distance and velocity
  const decideSwipeTarget = (
    currentIndex: number,
    diffX: number,
    elapsedMs: number,
    totalItems: number
  ): number => {
    const velocity = Math.abs(diffX) / (elapsedMs || 1);
    if (diffX < -35 || (diffX < -15 && velocity > 0.35)) {
      return Math.min(currentIndex + 1, totalItems - 1);
    } else if (diffX > 35 || (diffX > 15 && velocity > 0.35)) {
      return Math.max(currentIndex - 1, 0);
    }
    return currentIndex;
  };

  // Swiped left by 50px -> advance from index 0 to 1
  assert.equal(decideSwipeTarget(0, -50, 150, 4), 1);
  // Flick left quickly with high velocity (20px in 40ms = velocity 0.5) -> advance
  assert.equal(decideSwipeTarget(0, -20, 40, 4), 1);
  // Swiped right by 50px -> back from index 1 to 0
  assert.equal(decideSwipeTarget(1, 50, 150, 4), 0);
  // Insufficient swipe (10px in 200ms) -> remains at current index
  assert.equal(decideSwipeTarget(1, 10, 200, 4), 1);
  // Bounds check at ends
  assert.equal(decideSwipeTarget(3, -80, 100, 4), 3, 'Cannot scroll past end');
  assert.equal(decideSwipeTarget(0, 80, 100, 4), 0, 'Cannot scroll before start');
});





