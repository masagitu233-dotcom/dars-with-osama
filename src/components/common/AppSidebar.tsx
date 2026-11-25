import React from 'react';
import {
  Home,
  BookOpen,
  FileText,
  GraduationCap,
  ShieldAlert,
  Sparkles,
  HelpCircle,
  MessageSquare,
  UserCheck,
  Info,
  Library
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

interface AppSidebarProps {
  currentView: string;
  setCurrentView: (view: any) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  onOpenWelcomeModal?: () => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentView,
  setCurrentView,
  mobileOpen,
  setMobileOpen,
  onOpenWelcomeModal,
  isCollapsed = false
}) => {
  const { t } = useLanguage();
  const { user, isAdmin, openAuthModal } = useAuth();

  const isCoursesActive =
    currentView === 'courses' ||
    currentView === 'course-detail' ||
    currentView === 'session-view' ||
    currentView === 'quiz-view';

  const isBlogActive = currentView === 'blog' || currentView === 'blog-detail';
  const isLibraryActive =
    currentView === 'library' ||
    currentView === 'library-detail' ||
    currentView === 'library-read';
  const isStudentDashboardActive = currentView === 'student-dashboard';
  const isAdminDashboardActive = currentView === 'admin-dashboard';

  const navItems: Array<{
    id: string;
    href?: string;
    label: string;
    sublabel: string;
    icon: typeof Home;
    active: boolean;
  }> = [
    {
      id: 'home',
      href: '/',
      label: 'Beranda',
      sublabel: 'Ringkasan & Sorotan',
      icon: Home,
      active: currentView === 'home'
    },
    {
      id: 'blog',
      href: '/blog',
      label: 'Artikel & Catatan',
      sublabel: 'Kajian & Faedah Ilmiah',
      icon: FileText,
      active: isBlogActive
    },
    {
      id: 'library',
      href: '/library',
      label: 'Library Digital',
      sublabel: 'Koleksi Buku & Kitab',
      icon: Library,
      active: isLibraryActive
    },
    {
      id: 'public-qa',
      href: '/tanya-jawab',
      label: 'Tanya Jawab (Q&A)',
      sublabel: 'Arsip Jawaban Ilmiah',
      icon: HelpCircle,
      active: currentView === 'public-qa'
    },
    {
      id: 'courses',
      href: '/courses',
      label: 'Katalog Pembelajaran',
      sublabel: 'Kitab, Video & Kuis',
      icon: BookOpen,
      active: isCoursesActive
    },
    {
      id: 'instructor-profile',
      href: '/profil-pengajar',
      label: 'Profil Pengajar',
      sublabel: 'Biografi & Sanad Keilmuan',
      icon: UserCheck,
      active: currentView === 'instructor-profile'
    },
    {
      id: 'consultation',
      label: 'Ruang Konsultasi',
      sublabel: 'Tanya Ustaz & Privat',
      icon: MessageSquare,
      active: currentView === 'consultation'
    }
  ];

  const handleNavClick = (view: string) => {
    setCurrentView(view);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-x-0 top-[var(--app-header-height,54px)] bottom-0 z-30 bg-black/60 backdrop-blur-xs lg:hidden animate-fade-in cursor-pointer"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Panel: Strictly full-width open or completely hidden */}
      <aside
        id="app-sidebar"
        data-testid="app-sidebar"
        data-desktop-open={!isCollapsed ? 'true' : 'false'}
        data-mobile-open={mobileOpen ? 'true' : 'false'}
        aria-label="Navigasi Utama Dars with Osama"
        className={`fixed top-[var(--app-header-height,54px)] lg:top-0 left-0 bottom-0 z-[35] lg:z-40 flex flex-col bg-[#FAF7F0] dark:bg-[#001722] text-[#171717] dark:text-[#CEFEF1] border-r-2 border-[#171717] dark:border-[#4CA7A1] transition-[transform,opacity,visibility] duration-300 ease-in-out select-none w-[272px] sm:w-[300px] max-w-[85vw] lg:w-[232px] lg:max-w-none ${
          mobileOpen
            ? 'translate-x-0 opacity-100 visible pointer-events-auto shadow-[8px_0px_0px_#171717] dark:shadow-[8px_0px_0px_#001722]'
            : '-translate-x-full opacity-0 invisible pointer-events-none shadow-none'
        } ${
          isCollapsed
            ? 'lg:-translate-x-full lg:opacity-0 lg:invisible lg:pointer-events-none lg:shadow-none'
            : 'lg:translate-x-0 lg:opacity-100 lg:visible lg:pointer-events-auto lg:shadow-none'
        }`}
      >
        {/* Navigation Links Area */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 bg-[#FAF7F0] dark:bg-[#001722]">
          {/* Primary Public & Learning Navigation */}
          <div className="space-y-1.5">
            <p className="px-2 text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#123D32] dark:text-[#A6D6C9] mb-1.5">
              Menu Utama
            </p>

            {navItems.map((item) => {
              const Icon = item.icon;
              const sharedClassName = `w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-all duration-150 cursor-pointer group relative border-2 ${
                item.active
                  ? 'bg-[#D6AD52] text-[#171717] font-extrabold border-[#171717] dark:bg-[#1F5F63] dark:text-[#CEFEF1] dark:border-[#4CA7A1] dark:border-l-4 dark:border-l-[#4CA7A1] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]'
                  : 'bg-white dark:bg-[#0D2B36] hover:bg-[#EFE5D2] dark:hover:bg-[#1F5F63] text-[#171717] dark:text-[#A6D6C9] dark:hover:text-[#CEFEF1] border-[#171717]/35 dark:border-[#4CA7A1] hover:border-[#171717] dark:hover:border-[#A6D6C9]'
              }`;

              const innerContent = (
                <>
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors border-[1.5px] ${
                      item.active
                        ? 'bg-[#123D32] text-[#D6AD52] border-[#171717] dark:bg-[#4CA7A1] dark:text-[#001722] dark:border-[#CEFEF1]'
                        : 'bg-[#EFE5D2] dark:bg-[#001722] text-[#123D32] dark:text-[#A6D6C9] border-[#171717]/25 dark:border-[#4CA7A1] group-hover:border-[#171717] dark:group-hover:border-[#CEFEF1]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  <div className="overflow-hidden flex-1">
                    <p className={`text-xs font-extrabold truncate leading-tight ${
                      item.active ? 'text-[#171717] dark:text-[#CEFEF1]' : 'text-[#171717] dark:text-[#A6D6C9] group-hover:dark:text-[#CEFEF1]'
                    }`}>
                      {item.label}
                    </p>
                    <p
                      className={`text-[10px] truncate mt-0.5 font-semibold ${
                        item.active
                          ? 'text-[#171717]/80 dark:text-[#A6D6C9]'
                          : 'text-[#626A66] dark:text-[#A6D6C9]/85'
                      }`}
                    >
                      {item.sublabel}
                    </p>
                  </div>

                  {/* Active Indicator Pill */}
                  {item.active && (
                    <span className="w-2 h-2 rounded-full bg-[#123D32] dark:bg-[#4CA7A1] shrink-0" />
                  )}
                </>
              );

              if (item.href) {
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    data-testid={`nav-${item.id}`}
                    aria-current={item.active ? 'page' : undefined}
                    onClick={(e) => {
                      if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
                        e.preventDefault();
                        handleNavClick(item.id);
                      }
                    }}
                    className={sharedClassName}
                  >
                    {innerContent}
                  </a>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`nav-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={sharedClassName}
                >
                  {innerContent}
                </button>
              );
            })}
          </div>

          {/* Student Dashboard & Admin Navigation */}
          <div className="space-y-1.5 pt-2.5 border-t-2 border-[#171717]/15 dark:border-[#1F5F63]">
            <p className="px-2 text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#123D32] dark:text-[#A6D6C9] mb-1.5">
              Ruang Siswa
            </p>

            <button
              type="button"
              data-testid="nav-student-dashboard"
              onClick={() => {
                if (user) {
                  handleNavClick('student-dashboard');
                } else {
                  openAuthModal('login');
                }
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-all duration-150 cursor-pointer group border-2 ${
                isStudentDashboardActive
                  ? 'bg-[#D6AD52] text-[#171717] font-extrabold border-[#171717] dark:bg-[#1F5F63] dark:text-[#CEFEF1] dark:border-[#4CA7A1] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]'
                  : 'bg-white dark:bg-[#0D2B36] hover:bg-[#EFE5D2] dark:hover:bg-[#1F5F63] text-[#171717] dark:text-[#A6D6C9] dark:hover:text-[#CEFEF1] border-[#171717]/35 dark:border-[#4CA7A1]'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border-[1.5px] ${
                  isStudentDashboardActive
                    ? 'bg-[#123D32] text-[#D6AD52] border-[#171717] dark:bg-[#4CA7A1] dark:text-[#001722] dark:border-[#CEFEF1]'
                    : 'bg-[#EFE5D2] dark:bg-[#001722] text-[#123D32] dark:text-[#A6D6C9] border-[#171717]/25 dark:border-[#4CA7A1]'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-extrabold truncate leading-tight">
                  Dashboard Siswa
                </p>
                <p
                  className={`text-[10px] truncate mt-0.5 font-semibold ${
                    isStudentDashboardActive
                      ? 'text-[#171717]/80 dark:text-[#A6D6C9]'
                      : 'text-[#626A66] dark:text-[#A6D6C9]/85'
                  }`}
                >
                  {user ? 'Progres, Nilai & Sertifikat' : 'Masuk untuk Melihat Progres'}
                </p>
              </div>
            </button>

            {isAdmin && (
              <button
                type="button"
                data-testid="nav-admin-dashboard"
                onClick={() => handleNavClick('admin-dashboard')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-all duration-150 cursor-pointer group border-2 ${
                  isAdminDashboardActive
                    ? 'bg-[#D6AD52] text-[#171717] font-extrabold border-[#171717] dark:bg-[#1F5F63] dark:text-[#CEFEF1] dark:border-[#4CA7A1] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]'
                    : 'bg-white dark:bg-[#0D2B36] hover:bg-[#EFE5D2] dark:hover:bg-[#1F5F63] text-[#123D32] dark:text-[#A6D6C9] dark:hover:text-[#CEFEF1] border-[#171717]/35 dark:border-[#4CA7A1]'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border-[1.5px] ${
                    isAdminDashboardActive
                      ? 'bg-[#123D32] text-[#D6AD52] border-[#171717] dark:bg-[#4CA7A1] dark:text-[#001722] dark:border-[#CEFEF1]'
                      : 'bg-[#EFE5D2] dark:bg-[#001722] text-[#123D32] dark:text-[#A6D6C9] border-[#171717]/25 dark:border-[#4CA7A1]'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-xs font-extrabold truncate leading-tight">
                    Admin Panel
                  </p>
                  <p
                    className={`text-[10px] truncate mt-0.5 font-semibold ${
                      isAdminDashboardActive
                        ? 'text-[#171717]/80 dark:text-[#A6D6C9]'
                        : 'text-[#626A66] dark:text-[#A6D6C9]/85'
                    }`}
                  >
                    Kelola Materi &amp; Artikel
                  </p>
                </div>
              </button>
            )}
          </div>

          {/* Callout Quote Card & Welcome Info */}
          <div className="mt-3 p-3.5 rounded-md bg-[#E5EEE7] dark:bg-[#1F5F63] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722] space-y-1.5 text-[#171717] dark:text-[#CEFEF1]">
            <div className="flex items-center justify-between text-[#123D32] dark:text-[#CEFEF1] text-[10px] font-extrabold uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#123D32] dark:text-[#4CA7A1]" />
                <span>Majelis Ilmu</span>
              </span>
              {onOpenWelcomeModal && (
                <button
                  type="button"
                  onClick={onOpenWelcomeModal}
                  className="hover:underline flex items-center gap-0.5 cursor-pointer text-[#123D32] dark:text-[#A6D6C9]"
                  title="Tentang Platform"
                >
                  <Info className="w-3 h-3" />
                  <span>Info</span>
                </button>
              )}
            </div>
            <p className="font-amiri text-base text-[#123D32] dark:text-[#CEFEF1] leading-relaxed text-right" dir="rtl">
              مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا
            </p>
            <p className="text-[11px] text-[#626A66] dark:text-[#A6D6C9] leading-snug font-medium">
              Pelajari matan ilmiah, simak video syarah, dan uji pemahaman secara bertahap.
            </p>
          </div>
        </div>

        {/* Bottom Platform Identity Footer (duplicate collapse button removed) */}
        <div className="p-3 border-t-2 border-[#171717] dark:border-[#1F5F63] bg-[#EFE5D2] dark:bg-[#001722] shrink-0">
          <div className="text-center py-1">
            <p className="text-[10px] font-bold text-[#626A66] dark:text-[#A6D6C9]">
              Dars with Osama • Platform Ilmu Syar'i
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
