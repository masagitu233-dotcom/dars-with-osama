import React from 'react';
import {
  Home,
  BookOpen,
  FileText,
  GraduationCap,
  ShieldAlert,
  Sparkles,
  X,
  HelpCircle,
  MessageSquare,
  UserCheck,
  Info,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { LogoSymbol } from './Logo';

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
  isCollapsed = false,
  setIsCollapsed
}) => {
  const { t } = useLanguage();
  const { user, isAdmin, openAuthModal } = useAuth();

  const effectiveCollapsed = isCollapsed && !mobileOpen;

  const isCoursesActive =
    currentView === 'courses' ||
    currentView === 'course-detail' ||
    currentView === 'session-view' ||
    currentView === 'quiz-view';

  const isBlogActive = currentView === 'blog' || currentView === 'blog-detail';
  const isStudentDashboardActive = currentView === 'student-dashboard';
  const isAdminDashboardActive = currentView === 'admin-dashboard';

  const navItems = [
    {
      id: 'home',
      label: 'Beranda',
      sublabel: 'Ringkasan & Sorotan',
      icon: Home,
      active: currentView === 'home'
    },
    {
      id: 'blog',
      label: 'Artikel & Catatan',
      sublabel: 'Kajian & Faedah Ilmiah',
      icon: FileText,
      active: isBlogActive
    },
    {
      id: 'public-qa',
      label: 'Tanya Jawab (Q&A)',
      sublabel: 'Arsip Jawaban Ilmiah',
      icon: HelpCircle,
      active: currentView === 'public-qa'
    },
    {
      id: 'courses',
      label: 'Katalog Pembelajaran',
      sublabel: 'Kitab, Video & Kuis',
      icon: BookOpen,
      active: isCoursesActive
    },
    {
      id: 'instructor-profile',
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

  const handleToggleCollapse = () => {
    if (setIsCollapsed) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden animate-fade-in cursor-pointer"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Panel */}
      <aside
        aria-label="Navigasi Utama Dars with Osama"
        className={`fixed top-0 left-0 bottom-0 z-50 flex flex-col bg-[#FAF7F0] dark:bg-[#001722] text-[#171717] dark:text-[#CEFEF1] border-r-2 border-[#171717] dark:border-[#4CA7A1] transition-all duration-300 select-none ${
          effectiveCollapsed ? 'lg:w-20' : 'lg:w-64'
        } ${
          mobileOpen
            ? 'translate-x-0 w-[280px] sm:w-[320px] max-w-[85vw] shadow-[8px_0px_0px_#171717] dark:shadow-[8px_0px_0px_#001722]'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Brand Section — Logo serves as the interactive sidebar toggle */}
        <div
          className={`h-16 px-4 flex items-center border-b-2 border-[#171717] dark:border-[#1F5F63] bg-white dark:bg-[#001722] shrink-0 ${
            effectiveCollapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          {effectiveCollapsed ? (
            <button
              type="button"
              onClick={handleToggleCollapse}
              aria-label="Buka / Perluas sidebar"
              title="Buka / Perluas sidebar"
              className="p-1 rounded-md border-2 border-transparent hover:border-[#171717] dark:hover:border-[#4CA7A1] hover:bg-[#EFE5D2] dark:hover:bg-[#1F5F63] transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer group"
            >
              <div className="rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] bg-[#123D32] dark:bg-[#1F5F63] p-0.5">
                <LogoSymbol className="w-9 h-9" />
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (setIsCollapsed && window.innerWidth >= 1024) {
                  setIsCollapsed(true);
                } else {
                  setMobileOpen(false);
                }
              }}
              aria-label="Tutup / Ciutkan sidebar"
              title="Tutup / Ciutkan sidebar"
              className="flex items-center gap-3 cursor-pointer group text-left p-1 -ml-1 rounded-md border-2 border-transparent hover:border-[#171717]/40 dark:hover:border-[#4CA7A1] hover:bg-[#EFE5D2] dark:hover:bg-[#1F5F63] transition"
            >
              <div className="rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] bg-[#123D32] dark:bg-[#1F5F63] p-0.5 transition-transform duration-150 group-hover:scale-105">
                <LogoSymbol className="w-9 h-9 shrink-0" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif-brand font-extrabold text-base tracking-tight leading-none text-[#171717] dark:text-[#CEFEF1] group-hover:text-[#123D32] dark:group-hover:text-white transition-colors">
                  Dars <span className="font-normal italic text-[#D6AD52] dark:text-[#4CA7A1]">with</span> Osama
                </span>
                <span className="text-[9px] font-sans font-extrabold tracking-[0.2em] uppercase text-[#237A70] dark:text-[#A6D6C9] mt-1">
                  ILMU • KAJIAN • KITAB
                </span>
              </div>
            </button>
          )}

          {/* Mobile Close Button with explicit text & icon */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] bg-[#EFE5D2] dark:bg-[#0D2B36] text-[#171717] dark:text-[#CEFEF1] hover:bg-[#D6AD52] dark:hover:bg-[#1F5F63] transition cursor-pointer text-xs font-bold"
            aria-label="Tutup menu"
          >
            <X className="w-4 h-4" />
            <span className="text-[11px]">Tutup</span>
          </button>
        </div>

        {/* Navigation Links Area */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 bg-[#FAF7F0] dark:bg-[#001722]">
          {/* Primary Public & Learning Navigation */}
          <div className="space-y-2">
            {!effectiveCollapsed && (
              <p className="px-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#123D32] dark:text-[#A6D6C9] mb-2">
                Menu Utama
              </p>
            )}

            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`nav-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  title={effectiveCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${
                    effectiveCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
                  } rounded-md text-left transition-all duration-150 cursor-pointer group relative border-2 ${
                    item.active
                      ? 'bg-[#D6AD52] text-[#171717] font-extrabold border-[#171717] dark:bg-[#1F5F63] dark:text-[#CEFEF1] dark:border-[#4CA7A1] dark:border-l-4 dark:border-l-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]'
                      : 'bg-white dark:bg-[#0D2B36] hover:bg-[#EFE5D2] dark:hover:bg-[#1F5F63] text-[#171717] dark:text-[#A6D6C9] dark:hover:text-[#CEFEF1] border-[#171717]/40 dark:border-[#4CA7A1] hover:border-[#171717] dark:hover:border-[#A6D6C9]'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors border-2 ${
                      item.active
                        ? 'bg-[#123D32] text-[#D6AD52] border-[#171717] dark:bg-[#4CA7A1] dark:text-[#001722] dark:border-[#CEFEF1]'
                        : 'bg-[#EFE5D2] dark:bg-[#001722] text-[#123D32] dark:text-[#A6D6C9] border-[#171717]/30 dark:border-[#4CA7A1] group-hover:border-[#171717] dark:group-hover:border-[#CEFEF1]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {!effectiveCollapsed && (
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
                  )}

                  {/* Active Indicator Pill */}
                  {item.active && !effectiveCollapsed && (
                    <span className="w-2 h-2 rounded-full bg-[#123D32] dark:bg-[#4CA7A1] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Student Dashboard & Admin Navigation */}
          <div className="space-y-2 pt-3 border-t-2 border-[#171717]/15 dark:border-[#1F5F63]">
            {!effectiveCollapsed && (
              <p className="px-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#123D32] dark:text-[#A6D6C9] mb-2">
                Ruang Siswa
              </p>
            )}

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
              title={effectiveCollapsed ? 'Dashboard Siswa' : undefined}
              className={`w-full flex items-center ${
                effectiveCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
              } rounded-md text-left transition-all duration-150 cursor-pointer group border-2 ${
                isStudentDashboardActive
                  ? 'bg-[#D6AD52] text-[#171717] font-extrabold border-[#171717] dark:bg-[#1F5F63] dark:text-[#CEFEF1] dark:border-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]'
                  : 'bg-white dark:bg-[#0D2B36] hover:bg-[#EFE5D2] dark:hover:bg-[#1F5F63] text-[#171717] dark:text-[#A6D6C9] dark:hover:text-[#CEFEF1] border-[#171717]/40 dark:border-[#4CA7A1]'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border-2 ${
                  isStudentDashboardActive
                    ? 'bg-[#123D32] text-[#D6AD52] border-[#171717] dark:bg-[#4CA7A1] dark:text-[#001722] dark:border-[#CEFEF1]'
                    : 'bg-[#EFE5D2] dark:bg-[#001722] text-[#123D32] dark:text-[#A6D6C9] border-[#171717]/30 dark:border-[#4CA7A1]'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
              </div>
              {!effectiveCollapsed && (
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
              )}
            </button>

            {isAdmin && (
              <button
                type="button"
                data-testid="nav-admin-dashboard"
                onClick={() => handleNavClick('admin-dashboard')}
                title={effectiveCollapsed ? 'Admin Panel' : undefined}
                className={`w-full flex items-center ${
                  effectiveCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
                } rounded-md text-left transition-all duration-150 cursor-pointer group border-2 ${
                  isAdminDashboardActive
                    ? 'bg-[#D6AD52] text-[#171717] font-extrabold border-[#171717] dark:bg-[#1F5F63] dark:text-[#CEFEF1] dark:border-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]'
                    : 'bg-white dark:bg-[#0D2B36] hover:bg-[#EFE5D2] dark:hover:bg-[#1F5F63] text-[#123D32] dark:text-[#A6D6C9] dark:hover:text-[#CEFEF1] border-[#171717]/40 dark:border-[#4CA7A1]'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border-2 ${
                    isAdminDashboardActive
                      ? 'bg-[#123D32] text-[#D6AD52] border-[#171717] dark:bg-[#4CA7A1] dark:text-[#001722] dark:border-[#CEFEF1]'
                      : 'bg-[#EFE5D2] dark:bg-[#001722] text-[#123D32] dark:text-[#A6D6C9] border-[#171717]/30 dark:border-[#4CA7A1]'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                </div>
                {!effectiveCollapsed && (
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
                )}
              </button>
            )}
          </div>

          {/* Callout Quote Card & Welcome Info when Expanded */}
          {!effectiveCollapsed && (
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
          )}
        </div>

        {/* Bottom Section: Desktop Collapse/Expand Toggle & Mobile Platform Identity (Duplicates removed) */}
        <div className="p-3 border-t-2 border-[#171717] dark:border-[#1F5F63] bg-[#EFE5D2] dark:bg-[#001722] shrink-0">
          {/* Desktop Collapse/Expand Control */}
          <button
            type="button"
            onClick={handleToggleCollapse}
            aria-label={effectiveCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
            title={effectiveCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
            className={`hidden lg:flex w-full items-center ${
              effectiveCollapsed ? 'justify-center py-2.5' : 'justify-between px-3 py-2'
            } rounded-md bg-white dark:bg-[#0D2B36] hover:bg-[#D6AD52] dark:hover:bg-[#1F5F63] text-[#171717] dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] text-xs font-extrabold transition cursor-pointer shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none`}
          >
            <div className="flex items-center gap-2">
              {effectiveCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1]" />
              ) : (
                <>
                  <PanelLeftClose className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1]" />
                  <span>Ciutkan Navigasi</span>
                </>
              )}
            </div>
            {!effectiveCollapsed && (
              <span className="text-[9px] font-sans font-extrabold uppercase tracking-widest text-[#237A70] dark:text-[#A6D6C9]">
                CIUTKAN
              </span>
            )}
          </button>

          {/* Minimal Brand Footer on Mobile */}
          <div className="lg:hidden text-center py-1">
            <p className="text-[10px] font-bold text-[#626A66] dark:text-[#A6D6C9]">
              Dars with Osama • Platform Ilmu Syar'i
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
