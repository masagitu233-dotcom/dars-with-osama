import type { Category, Course, Session, Quiz } from '../types/index.ts';

export const SEED_CATEGORIES: Category[] = [
  {
    id: 'cat-aqidah',
    name: 'Aqidah & Tauhid',
    nameAr: 'العقيدة والتوحيد',
    slug: 'aqidah',
    description: 'Pembahasan rukun iman, pemurnian tauhid, dan manhaj ahlussunnah wal jama\'ah berdasarkan Al-Qur\'an dan As-Sunnah.',
    order: 1,
    icon: 'Shield'
  },
  {
    id: 'cat-hadith',
    name: 'Hadits & Ulumul Hadits',
    nameAr: 'الحديث وعلومه',
    slug: 'hadith',
    description: 'Kajian matan hadits-hadits shahih, musthalah hadits, dan syarah para ulama mu\'tabar.',
    order: 2,
    icon: 'BookOpen'
  },
  {
    id: 'cat-fiqh',
    name: 'Fiqh & Ushul Fiqh',
    nameAr: 'الفقه وأصوله',
    slug: 'fiqh',
    description: 'Hukum-hukum syariat dalam ibadah dan muamalah beserta kaidah-kaidah pengambilan hukum istinbath.',
    order: 3,
    icon: 'Scale'
  },
  {
    id: 'cat-arabic',
    name: 'Bahasa Arab & Nahwu',
    nameAr: 'اللغة العربية وقواعدها',
    slug: 'arabic',
    description: 'Kunci memahami Al-Qur\'an dan hadits melalui pembelajaran Nahwu, Sharaf, dan Balaghah.',
    order: 4,
    icon: 'Languages'
  },
  {
    id: 'cat-quran',
    name: 'Al-Qur\'an & Tafsir',
    nameAr: 'القرآن الكريم والتفسير',
    slug: 'quran',
    description: 'Tafsir ayat-ayat Al-Qur\'an, kaidah tafsir, dan tadabbur kalamullah.',
    order: 5,
    icon: 'Sparkles'
  }
];

export const SEED_COURSES: Course[] = [
  {
    id: 'course-tsalatsatil-ushul',
    title: 'Syarh Tsalatsatil Ushul (Tiga Landasan Utama)',
    titleAr: 'شرح الأصول الثلاثة وأدلتها',
    instructor: 'Syaikh Muhammad bin Abdul Wahhab (Syarh Syaikh Shalih Al-Fauzan)',
    instructorTitle: 'Ulama Anggota Hai\'ah Kibaril Ulama',
    instructorAr: 'الشيخ صالح بن فوزان الفوزان',
    categoryId: 'cat-aqidah',
    level: 'beginner',
    description: 'Mempelajari tiga pondasi utama yang wajib diketahui setiap muslim dalam kubur kelak: mengenal Allah Sang Pencipta, mengenal agama Islam dengan dalil-dalilnya, dan mengenal Nabi Muhammad shallallahu \'alaihi wa sallam.',
    descriptionAr: 'معرفة العبد ربه، ودينه، ونبيه محمداً صلى الله عليه وسلم، بالأدلة من الكتاب والسنة مع بيان مراتب الدين الثلاثة.',
    coverImageUrl: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=1200&q=80',
    isPublished: true,
    hasCertificate: true,
    passingGrade: 75,
    totalDuration: '5 Sesi Pembelajaran',
    order: 1
  },
  {
    id: 'course-arbain-nawawi',
    title: 'Syarh Al-Arba\'in An-Nawawiyyah',
    titleAr: 'شرح الأربعين النووية',
    instructor: 'Imam An-Nawawi (Syarh Syaikh Muhammad bin Shalih Al-Utsaimin)',
    instructorTitle: 'Faqih & Pendidik Islam Terkemuka',
    instructorAr: 'الشيخ محمد بن صالح العثيمين رحمه الله',
    categoryId: 'cat-hadith',
    level: 'beginner',
    description: 'Untaian 42 hadits agung yang merangkum kaidah-kaidah pokok agama Islam, dari niat, rukun Islam, ihsan, hingga akhlak mulia dan keselamatan lisan.',
    descriptionAr: 'أحاديث نبوية جامعة لقواعد الدين وأصول الشريعة من جمع الإمام محيي الدين النووي رحمه الله.',
    coverImageUrl: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1200&q=80',
    isPublished: true,
    hasCertificate: true,
    passingGrade: 70,
    totalDuration: '4 Sesi Pembelajaran',
    order: 2
  },
  {
    id: 'course-al-ajurrumiyyah',
    title: 'Pengantar Nahwu: Matan Al-Ajurrumiyyah',
    titleAr: 'شرح متن الآجرومية في قواعد النحو',
    instructor: 'Ibnu Ajurrum Ash-Shanhaji',
    instructorTitle: 'Pakar Tata Bahasa Arab Klasik',
    instructorAr: 'ابن آجروم الصنهاجي',
    categoryId: 'cat-arabic',
    level: 'intermediate',
    description: 'Kaidah dasar tata bahasa Arab yang sangat masyhur dipelajari penuntut ilmu pemula di seluruh dunia Islam, mengupas definisi Kalam, tanda-tanda I\'rab, dan susunan kalimat yang benar.',
    descriptionAr: 'المدخل الأساسي لطالب العلم لدراسة النحو العربي ومعرفة الإعراب وأحكام الكلمات في الجملة العربية.',
    coverImageUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80',
    isPublished: true,
    hasCertificate: true,
    passingGrade: 75,
    totalDuration: '3 Sesi Pembelajaran',
    order: 3
  },
  {
    id: 'course-fiqh-thaharah',
    title: 'Al-Fiqh Al-Muyassar: Kitab Thaharah & Shalat',
    titleAr: 'الفقه الميسر: كتاب الطهارة والصلاة',
    instructor: 'Kumpulan Ulama Madinah An-Nabawiyyah',
    instructorTitle: 'Fikih Praktis Sesuai Al-Qur\'an & Sunnah',
    instructorAr: 'نخبة من العلماء بالمدينة النبوية',
    categoryId: 'cat-fiqh',
    level: 'beginner',
    description: 'Panduan lengkap dan mudah seputar bersuci (wudhu, tayamum, mandi wajib) serta tata cara shalat yang benar sesuai tuntunan Rasulullah shallallahu \'alaihi wa sallam.',
    descriptionAr: 'بيان أحكام الطهارة وأنواع المياه ونواقض الوضوء وشروط الصلاة وأركانها وسننها بأسلوب ميسر.',
    coverImageUrl: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1200&q=80',
    isPublished: true,
    hasCertificate: true,
    passingGrade: 80,
    totalDuration: '3 Sesi Pembelajaran',
    order: 4
  }
];

export const SEED_SESSIONS: Session[] = [
  // Sessions for Syarh Tsalatsatil Ushul
  {
    id: 'session-tsalatsah-1',
    courseId: 'course-tsalatsatil-ushul',
    title: 'Sesi 1: Empat Perkara Wajib (Ilmu, Amal, Dakwah, Sabar)',
    titleAr: 'المجلس الأول: المسائل الأربع (العلم، والعمل به، والدعوة إليه، والصبر على الأذى فيه)',
    description: 'Membahas mukadimah risalah tentang 4 perkara penting yang wajib dipelajari setiap muslim berdasarkan dalil Surat Al-\'Ashr.',
    descriptionAr: 'شرح مقدمة المصنف رحمه الله في بيان المسائل الأربع المستنبطة من سورة العصر.',
    order: 1,
    youtubeUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    pdfUrl: 'https://archive.org/download/Thalathat-Al-Usool/Thalathat-Al-Usool-Matn.pdf',
    pdfTitle: 'Matan Tsalatsatil Ushul (PDF Naskah Asli Arab)',
    durationMinutes: 45,
    isPublished: true,
    quizId: 'quiz-tsalatsah-1',
    lessonNotes: `### Ringkasan Sesi 1: Empat Perkara Wajib

Imam Muhammad bin Abdul Wahhab rahimahullah memulai kitab ini dengan basmalah dan mendoakan kebaikan bagi pembaca:
> "اعلم رحمك الله أنه يجب علينا تعلم أربع مسائل: الأولى: العلم... الثانية: العمل به... الثالثة: الدعوة إليه... الرابعة: الصبر على الأذى فيه"

1. **Ilmu (العلم):** Yaitu mengenal Allah, mengenal Nabi-Nya, dan mengenal agama Islam dengan dalil-dalil yang shahih.
2. **Amal (العمل به):** Mengamalkan ilmu yang telah dipelajari dengan ikhlas dan ittiba' (mengikuti sunnah).
3. **Dakwah (الدعوة إليه):** Mengajak manusia ke jalan tauhid dan kebaikan dengan hikmah serta mau'izhah hasanah.
4. **Sabar (الصبر على الأذى فيه):** Bersabar menghadapi segala kesulitan dan ujian dalam menuntut ilmu, beramal, dan berdakwah.

**Dalil Pokok:**
Firman Allah Ta'ala dalam QS. Al-'Ashr:
> وَالْعَصْرِ ۝ إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ ۝ إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ`
  },
  {
    id: 'session-tsalatsah-2',
    courseId: 'course-tsalatsatil-ushul',
    title: 'Sesi 2: Tiga Perkara Wajib & Bantahan Terhadap Syirik',
    titleAr: 'المجلس الثاني: المسائل الثلاث وبطلان الشرك',
    description: 'Penjelasan tentang tauhid rububiyyah yang melazimkan tauhid uluhiyyah, serta bahaya menyekutukan Allah dalam ibadah.',
    order: 2,
    youtubeUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    pdfUrl: 'https://archive.org/download/Thalathat-Al-Usool/Thalathat-Al-Usool-Matn.pdf',
    pdfTitle: 'Matan Tsalatsatil Ushul - Bab 2',
    durationMinutes: 40,
    isPublished: true,
    lessonNotes: `### Ringkasan Sesi 2: Tiga Perkara Wajib
1. Allah telah menciptakan kita, memberi kita rezeki, dan tidak membiarkan kita terlantar begitu saja, melainkan mengutus seorang Rasul.
2. Allah tidak ridha disekutukan dalam ibadah kepada-Nya dengan siapapun, baik malaikat yang didekatkan maupun nabi yang diutus.
3. Siapa yang mentaati Rasul dan mentauhidkan Allah tidak boleh loyal/menjadikan musuh Allah sebagai penolong sejati.`,
    quizId: 'quiz-tsalatsah-2'
  },
  {
    id: 'session-tsalatsah-3',
    courseId: 'course-tsalatsatil-ushul',
    title: 'Sesi 3: Landasan Pertama - Mengenal Allah (Ma\'rifatullah)',
    titleAr: 'المجلس الثالث: الأصل الأول - معرفة العبد ربه',
    description: 'Bagaimana seorang hamba mengenal Rabbnya melalui ayat-ayat kauniyyah (alam semesta) dan ayat-ayat syar\'iyyah.',
    order: 3,
    youtubeUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    pdfUrl: 'https://archive.org/download/Thalathat-Al-Usool/Thalathat-Al-Usool-Matn.pdf',
    pdfTitle: 'Matan Tsalatsatil Ushul - Ma\'rifatullah',
    durationMinutes: 50,
    isPublished: true,
    lessonNotes: `Pertanyaan dalam kubur yang pertama adalah: "Man Rabbuka?" (Siapakah Rabbmu?).
Rabbku adalah Allah yang mentarbiyyahku dan seluruh alam semesta dengan nikmat-nikmat-Nya. Dialah sesembahanku yang haq, tiada sesembahan yang berhak diibadahi selain Dia.`
  },

  // Sessions for Arbain Nawawi
  {
    id: 'session-arbain-1',
    courseId: 'course-arbain-nawawi',
    title: 'Hadits 1: Niat & Ikhlas (Innamal A\'malu bin Niyyat)',
    titleAr: 'الحديث الأول: إنما الأعمال بالنيات',
    description: 'Hadits paling agung tentang pondasi amalan lahiriah dan batiniah, diriwayatkan oleh Amirul Mukminin Umar bin Khaththab radhiyallahu \'anhu.',
    order: 1,
    youtubeUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    pdfUrl: 'https://archive.org/download/40-hadith-nawawi/40_Hadith_Nawawi_Arabic_English.pdf',
    pdfTitle: 'Matan Al-Arba\'in An-Nawawiyyah (Lengkap 42 Hadits)',
    durationMinutes: 38,
    isPublished: true,
    quizId: 'quiz-arbain-1',
    lessonNotes: `### Hadits 1: Niat

عَنْ أَمِيرِ الْمُؤْمِنِينَ أَبِي حَفْصٍ عُمَرَ بْنِ الْخَطَّابِ رَضِيَ اللَّهُ عَنْهُ قَالَ: سَمِعْت رَسُولَ اللَّهِ صلى الله عليه وسلم يَقُولُ: **"إنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى، فَمَنْ كَانَتْ هِجْرَتُهُ إلَى اللَّهِ وَرَسُولِهِ فَهِجْرَتُهُ إلَى اللَّهِ وَرَسُولِهِ، وَمَنْ كَانَتْ هِجْرَتُهُ لِدُنْيَا يُصِيبُهَا أَوْ امْرَأَةٍ يَنْكِحُهَا فَهِجْرَتُهُ إلَى مَا هَاجَرَ إلَيْهِ"** (رواه البخاري ومسلم)

**Poin-poin Pelajaran:**
1. Kedudukan niat dalam membedakan antara ibadah dan kebiasaan, serta membedakan tujuan suatu amalan.
2. Setiap amalan tidak akan diterima kecuali memenuhi 2 syarat: Ikhlas karena Allah dan Ittiba' Rasulullah.
3. Hijrah demi dunia atau wanita tidak mendapat pahala hijrah syar'iyyah.`
  },
  {
    id: 'session-arbain-2',
    courseId: 'course-arbain-nawawi',
    title: 'Hadits 2: Hadits Jibril (Tingkatan Islam, Iman, dan Ihsan)',
    titleAr: 'الحديث الثاني: حديث جبريل عليه السلام في بيان مراتب الدين',
    description: 'Kisah kedatangan malaikat Jibril dengan wujud manusia berpakaian putih bersih untuk mengajarkan agama kepada para shahabat.',
    order: 2,
    youtubeUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    pdfUrl: 'https://archive.org/download/40-hadith-nawawi/40_Hadith_Nawawi_Arabic_English.pdf',
    pdfTitle: 'Hadits Jibril - Penjelasan Makna Iman & Ihsan',
    durationMinutes: 52,
    isPublished: true,
    lessonNotes: `Hadits Jibril \'alaihissalam disebut sebagai Ummus Sunnah (induk As-Sunnah) karena mencakup seluruh rukun Islam yang 5, rukun iman yang 6, dan tingkatan ihsan yang tertinggi.`
  },

  // Sessions for Ajurrumiyyah
  {
    id: 'session-ajurrum-1',
    courseId: 'course-al-ajurrumiyyah',
    title: 'Sesi 1: Bab Al-Kalam & Pembagian Kalimat dalam Bahasa Arab',
    titleAr: 'المجلس الأول: باب الكلام وأقسامه (اسم، وفعل، وحرف)',
    description: 'Memahami definisi kalam yang berfaedah (Al-Lafzhu Al-Murakkabu Al-Mufidu bil Wadh\'i) dan mengenali ciri-ciri Isim, Fi\'il, serta Huruf.',
    order: 1,
    youtubeUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    pdfUrl: 'https://archive.org/download/matn-ajurrumiyyah/ajurrumiyyah.pdf',
    pdfTitle: 'Naskah Matan Al-Ajurrumiyyah Lengkap',
    durationMinutes: 45,
    isPublished: true,
    quizId: 'quiz-ajurrum-1',
    lessonNotes: `### Bab Al-Kalam
قال ابن آجروم رحمه الله:
"الكلام هو: اللفظ المركب المفيد بالوضع. وأقسامه ثلاثة: اسم، وفعل، وحرف جاء لمعنى."

1. **Al-Ism (الاسم):** Kata benda atau nama yang tidak terikat waktu. Cirinya: menerima tanwin, alif lam (ال), dan huruf khafdh/jar.
2. **Al-Fi\'l (الفعل):** Kata kerja yang menunjukkan suatu peristiwa dan terikat masa lampau (madhi), sekarang (mudhari\'), atau perintah (amr).
3. **Al-Harf (الحرف):** Kata tugas yang tidak tampak maknanya secara sempurna kecuali bersambung dengan kata lainnya.`
  }
];

export const SEED_QUIZZES: Quiz[] = [
  {
    id: 'quiz-tsalatsah-1',
    sessionId: 'session-tsalatsah-1',
    courseId: 'course-tsalatsatil-ushul',
    title: 'Evaluasi Kuis Sesi 1: Empat Perkara Wajib',
    titleAr: 'اختبار المجلس الأول: المسائل الأربع',
    description: 'Uji pemahaman antum seputar empat perkara wajib yang tercantum dalam Surah Al-\'Ashr.',
    passingScore: 75,
    timeLimitMinutes: 10,
    maxAttempts: 3,
    showAnswersAfterSubmit: true,
    isPublished: true,
    questions: [
      {
        id: 'q1',
        questionText: 'Apa empat perkara wajib yang disebutkan oleh Syaikh Muhammad bin Abdul Wahhab dalam mukadimah?',
        questionTextAr: 'ما هي المسائل الأربع التي تجب على كل مسلم ومسلمة تعلمها؟',
        type: 'multiple_choice',
        options: [
          'Shalat, Puasa, Zakat, dan Haji',
          'Ilmu, Beramal dengannya, Berdakwah kepadanya, dan Sabar atas ujian',
          'Membaca, Menulis, Menghafal, dan Mengajar',
          'Khusyuk, Tawadhu, Qanaah, dan Wara\''
        ],
        correctAnswerIndex: 1,
        explanation: 'Empat perkara yang wajib dipelajari dan diamalkan adalah: Ilmu (mengenal Allah, Nabi, dan agama Islam), Amal, Dakwah, dan Sabar atas segala cobaan.',
        points: 25
      },
      {
        id: 'q2',
        questionText: 'Surat apakah dalam Al-Qur\'an yang dijadikan dalil oleh Imam Asy-Syafi\'i untuk empat perkara ini?',
        questionTextAr: 'ما هي السورة التي استدل بها الإمام الشافعي رحمه الله على المسائل الأربع؟',
        type: 'multiple_choice',
        options: [
          'Surat Al-Fatihah',
          'Surat Al-Ikhlas',
          'Surat Al-\'Ashr',
          'Surat Al-Mulk'
        ],
        correctAnswerIndex: 2,
        explanation: 'Imam Asy-Syafi\'i berkata: "Seandainya Allah tidak menurunkan hujjah kepada makhluk-Nya melainkan surat ini (Al-\'Ashr), niscaya surat itu telah mencukupi mereka."',
        points: 25
      },
      {
        id: 'q3',
        questionText: 'Beramal tanpa ilmu adalah perbuatan yang dicontohkan oleh kaum Nasrani yang tersesat (Adh-Dhallin).',
        questionTextAr: 'العمل بغير علم هو سبيل النصارى الضالين.',
        type: 'true_false',
        options: [
          'Benar (صحيح)',
          'Salah (خطأ)'
        ],
        correctAnswerIndex: 0,
        explanation: 'Benar, barangsiapa yang beramal tanpa ilmu menyerupai orang Nasrani, sedangkan berilmu tanpa amal menyerupai orang Yahudi (Al-Maghdhubi \'alaihim).',
        points: 25
      },
      {
        id: 'q4',
        questionText: 'Apa definisi "Ilmu" yang dimaksud dalam perkara pertama?',
        questionTextAr: 'ما هو المراد بالعلم في المسألة الأولى؟',
        type: 'multiple_choice',
        options: [
          'Menghafal rumus astronomi dan matematika modern',
          'Mengenal Allah, mengenal Nabi-Nya, dan mengenal agama Islam dengan dalil-dalilnya',
          'Membaca buku-buku filsafat dan perdebatan',
          'Mengetahui silsilah para pembesar dunia'
        ],
        correctAnswerIndex: 1,
        explanation: 'Ilmu syar\'i yang dimaksud adalah Ma\'rifatullah, Ma\'rifatu Nabiyyihi, dan Ma\'rifatu Dinil Islam bil Adillah.',
        points: 25
      }
    ]
  },
  {
    id: 'quiz-arbain-1',
    sessionId: 'session-arbain-1',
    courseId: 'course-arbain-nawawi',
    title: 'Kuis Evaluasi Hadits 1: Niat & Ikhlas',
    titleAr: 'اختبار الحديث الأول: إنما الأعمال بالنيات',
    description: 'Evaluasi pemahaman hadits pertama dari Al-Arba\'in An-Nawawiyyah.',
    passingScore: 70,
    timeLimitMinutes: 8,
    maxAttempts: 3,
    showAnswersAfterSubmit: true,
    isPublished: true,
    questions: [
      {
        id: 'qa1',
        questionText: 'Siapakah shahabat yang meriwayatkan hadits "Innamal a\'malu bin niyyat"?',
        questionTextAr: 'من هو الصحابي راوي حديث "إنما الأعمال بالنيات"؟',
        type: 'multiple_choice',
        options: [
          'Abu Hurairah radhiyallahu \'anhu',
          'Amirul Mukminin Umar bin Al-Khaththab radhiyallahu \'anhu',
          'Ali bin Abi Thalib radhiyallahu \'anhu',
          'Abdullah bin Mas\'ud radhiyallahu \'anhu'
        ],
        correctAnswerIndex: 1,
        explanation: 'Hadits ini diriwayatkan oleh Umar bin Al-Khaththab radhiyallahu \'anhu dalam Shahih Al-Bukhari dan Shahih Muslim.',
        points: 30
      },
      {
        id: 'qa2',
        questionText: 'Niat di dalam syariat Islam wajib dilafadzkan secara lisan dengan suara keras.',
        questionTextAr: 'النية في الشريعة يجب التلفظ بها بصوت مسموع.',
        type: 'true_false',
        options: [
          'Benar (صحيح)',
          'Salah (خطأ)'
        ],
        correctAnswerIndex: 1,
        explanation: 'Salah. Tempat niat adalah di dalam hati, dan melafadzkan niat tidak pernah dicontohkan oleh Rasulullah shallallahu \'alaihi wa sallam.',
        points: 35
      },
      {
        id: 'qa3',
        questionText: 'Apa dua syarat diterimanya suatu amalan ibadah di sisi Allah?',
        questionTextAr: 'ما هما شرطا قبول العمل الصالح؟',
        type: 'multiple_choice',
        options: [
          'Banyaknya jumlah dan waktu yang lama',
          'Ikhlas semata-mata karena Allah dan Mutaba\'ah (mengikuti tuntunan Rasulullah)',
          'Dilihat orang shalih dan dipuji masyarakat',
          'Dilakukan di Masjidil Haram saja'
        ],
        correctAnswerIndex: 1,
        explanation: 'Amal ibadah hanya diterima jika ikhlas lillahi ta\'ala dan sesuai dengan sunnah Rasulullah shallallahu \'alaihi wa sallam.',
        points: 35
      }
    ]
  },
  {
    id: 'quiz-ajurrum-1',
    sessionId: 'session-ajurrum-1',
    courseId: 'course-al-ajurrumiyyah',
    title: 'Kuis Nahwu Dasar: Bab Al-Kalam',
    titleAr: 'اختبار باب الكلام وأقسامه',
    description: 'Evaluasi kaidah kalam dan pembagian tiga unsur kalimat bahasa Arab.',
    passingScore: 75,
    timeLimitMinutes: 10,
    maxAttempts: 3,
    showAnswersAfterSubmit: true,
    isPublished: true,
    questions: [
      {
        id: 'qaj1',
        questionText: 'Kalam menurut istilah ulama Nahwu terbagi menjadi berapa bagian?',
        questionTextAr: 'كم قسماً للكلام عند علماء النحو؟',
        type: 'multiple_choice',
        options: [
          'Dua: Isim dan Fi\'il',
          'Tiga: Isim, Fi\'il, dan Huruf yang memiliki makna',
          'Empat: Isim, Fi\'il, Huruf, dan Sifat',
          'Lima bagian'
        ],
        correctAnswerIndex: 1,
        explanation: 'Dalam Matan Al-Ajurrumiyyah: "وأقسامه ثلاثة: اسم، وفعل، وحرف جاء لمعنى".',
        points: 50
      },
      {
        id: 'qaj2',
        questionText: 'Manakah di antara tanda berikut yang merupakan tanda khusus untuk Isim (kata benda)?',
        questionTextAr: 'أي من العلامات الآتية تختص بالاسم؟',
        type: 'multiple_choice',
        options: [
          'Kemasukan "Qad" (قد)',
          'Kemasukan "Saufa" (سوف)',
          'Menerima Tanwin dan Alif-Lam (ال)',
          'Huruf Ta Ta\'nits Sakinah (ت)'
        ],
        correctAnswerIndex: 2,
        explanation: 'Isim dikenali dengan tanda khafdh/jar, tanwin, dan masuknya Alif Lam (ال) serta huruf jar.',
        points: 50
      }
    ]
  }
];
