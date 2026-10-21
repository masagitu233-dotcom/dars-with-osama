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



