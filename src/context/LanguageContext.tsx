import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'id' | 'ar';

interface Translations {
  [key: string]: {
    id: string;
    ar: string;
  };
}

const UI_STRINGS: Translations = {
  // Navigation & Branding
  brandName: { id: 'Dars with Osama', ar: 'Dars with Osama' },
  brandTagline: { id: 'Platform Pembelajaran & Kajian Islam Terstruktur', ar: 'منصة الدروس والشروح العلمية التأصيلية' },
  home: { id: 'Beranda', ar: 'الرئيسية' },
  courses: { id: 'Katalog Kursus', ar: 'دليل المقررات' },
  categories: { id: 'Kategori Ilmu', ar: 'الفنون العلمية' },
  myLearning: { id: 'Pembelajaran Saya', ar: 'لوحة الدارس' },
  adminPortal: { id: 'Admin Panel', ar: 'لوحة الإدارة' },
  login: { id: 'Masuk Akun', ar: 'تسجيل الدخول' },
  register: { id: 'Daftar Baru', ar: 'إنشاء حساب جديد' },
  logout: { id: 'Keluar', ar: 'تسجيل الخروج' },
  
  // Hero & Search
  heroTitle: { id: 'Menuntut Warisan Kenabian dengan Terstruktur & Berjenjang', ar: 'تأصيل علمي رصين.. بأسلوب ميسر وشامل' },
  heroSubtitle: { id: 'Akses materi kajian ilmu-ilmu syar\'i, naskah PDF asli, serta evaluasi kuis pemahaman gratis untuk kaum muslimin.', ar: 'شروح لأمهات المتون والكتب المعتمدة في العقيدة والحديث والفقه واللغة، مع اختبارات مرحلية لقياس الفهم.' },
  searchPlaceholder: { id: 'Cari judul matan, nama ustadz/ulama, atau topik...', ar: 'ابحث عن عنوان المتن، الشيخ، أو الفن العلمي...' },
  exploreCourses: { id: 'Jelajahi Kursus', ar: 'تصفح المقررات' },
  allLevels: { id: 'Semua Tingkatan', ar: 'جميع المستويات' },
  beginner: { id: 'Tingkat Pemula', ar: 'المستوى المبتدئ' },
  intermediate: { id: 'Tingkat Menengah', ar: 'المستوى المتوسط' },
  advanced: { id: 'Tingkat Mahir', ar: 'المستوى المتقدم' },
  
  // Course Details & Sessions
  instructor: { id: 'Pengajar / Pensyarah', ar: 'الشارح / المدرس' },
  sessions: { id: 'Sesi Pembelajaran', ar: 'المجالس والدروس' },
  duration: { id: 'Durasi Total', ar: 'المدة المقدرة' },
  enrollNow: { id: 'Ikuti Kursus Ini', ar: 'الالتحاق بالمقرر' },
  enrolled: { id: 'Telah Terdaftar', ar: 'ملتحق بالفعل' },
  continueLearning: { id: 'Lanjutkan Belajar', ar: 'متابعة الدرس الأخير' },
  courseSyllabus: { id: 'Silabus & Urutan Sesi', ar: 'المفردات وجدول الدروس' },
  watchVideo: { id: 'Tonton Rekaman Video', ar: 'مشاهدة المجلس' },
  downloadPdf: { id: 'Materi & Naskah PDF', ar: 'تحميل المتن (PDF)' },
  lessonNotes: { id: 'Catatan & Faedah Pembahasan', ar: 'الفوائد والتقريرات' },
  startQuiz: { id: 'Mulai Evaluasi Kuis', ar: 'أداء الاختبار المرحلي' },
  markComplete: { id: 'Tandai Selesai', ar: 'تحديد كمكتمل' },
  completed: { id: 'Selesai', ar: 'مكتمل' },
  
  // Quiz
  quizTitle: { id: 'Kuis Evaluasi Pemahaman', ar: 'اختبار قياس الفهم' },
  passingScore: { id: 'Nilai Kelulusan Minimal', ar: 'درجة النجاح المطلوبة' },
  timeRemaining: { id: 'Sisa Waktu', ar: 'الوقت المتبقي' },
  submitQuiz: { id: 'Kumpulkan Jawaban', ar: 'إرسال الإجابات' },
  passedBadge: { id: 'Selamat, Anda Lulus!', ar: 'مبارك، لقد اجتزت الاختبار بنجاح!' },
  failedBadge: { id: 'Belum Mencapai Batas Kelulusan', ar: 'لم تجتز درجة النجاح، يمكنك الإعادة' },
  retakeQuiz: { id: 'Ulangi Kuis', ar: 'إعادة الاختبار' },
  yourScore: { id: 'Nilai Anda', ar: 'درجتك الحاصل عليها' },
  
  // Status
  certificate: { id: 'Penyelesaian Kurikulum', ar: 'إتمام المقرر' },
  claimCertificate: { id: 'Lihat Ringkasan Progres', ar: 'عرض تقرير الإنجاز' },
  certificateDesc: { id: 'Telah menuntaskan seluruh materi dan evaluasi pemahaman.', ar: 'تم إتمام جميع مجالس المقرر واختباراته بنجاح.' },
  
  // Dashboard
  myCourses: { id: 'Kursus yang Diikuti', ar: 'مقرراتي المسجلة' },
  progress: { id: 'Progres Belajar', ar: 'نسبة الإنجاز' },
  quizHistory: { id: 'Riwayat Kuis & Nilai', ar: 'سجل الاختبارات والدرجات' },
  
  // Admin & Management
  manageCourses: { id: 'Kelola Kursus', ar: 'إدارة المقررات' },
  manageCategories: { id: 'Kelola Kategori', ar: 'إدارة الفنون' },
  manageSessions: { id: 'Kelola Sesi', ar: 'إدارة المجالس' },
  manageQuizzes: { id: 'Kelola Kuis', ar: 'إدارة الاختبارات' },
  manageUsers: { id: 'Laporan & Peserta', ar: 'الدارسون والتقارير' },
  firebaseSettings: { id: 'Pengaturan & Koneksi Firebase', ar: 'إعدادات فايربيس' },
  save: { id: 'Simpan', ar: 'حفظ' },
  cancel: { id: 'Batal', ar: 'إلغاء' },
  delete: { id: 'Hapus', ar: 'حذف' },
  edit: { id: 'Edit', ar: 'تعديل' },
  add: { id: 'Tambah Baru', ar: 'إضافة جديد' },
  published: { id: 'Dipublikasikan', ar: 'منشور' },
  draft: { id: 'Draf', ar: 'مسودة' },
  actions: { id: 'Aksi', ar: 'الإجراءات' }
};

interface LanguageContextType {
  language: Language;
  direction: 'ltr' | 'rtl';
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const language: Language = 'id';
  const direction = 'ltr';

  useEffect(() => {
    localStorage.setItem('al_sharh_lang', 'id');
    document.documentElement.lang = 'id';
    document.documentElement.dir = 'ltr';
  }, []);

  const setLanguage = (_lang: Language) => {};
  const toggleLanguage = () => {};

  const t = (key: string): string => {
    if (UI_STRINGS[key]) {
      return UI_STRINGS[key]['id'] || key;
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, direction, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
