import React from 'react';
import {
  Home,
  BookOpen,
  FileText,
  GraduationCap,
  ShieldAlert,
  LogOut,
  Settings,
  User as UserIcon,
  Sun,
  Moon,
  Sparkles,
  X,
  HelpCircle,
  MessageSquare,
  UserCheck,
  Info
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
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
  const { theme, toggleTheme } = useTheme();
  const {
    user,
    userProfile,
    isAdmin,
    openAuthModal,
    openLogoutConfirmModal,
    openProfileModal
  } = useAuth();

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
      label: t('nav.home') || 'Beranda',
      sublabel: 'Ringkasan & Sorotan',
      icon: Home,
      active: currentView === 'home'
    },
    {
      id: 'blog',
      label: t('nav.blog') || 'Artikel & Catatan',
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
      label: t('nav.courses') || 'Katalog Pembelajaran',
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
        className={`fixed top-0 left-0 bottom-0 z-50 flex flex-col bg-[#FAF7F0] dark:bg-[#16263D] text-[#292D2B] dark:text-[#F1F4F8] border-r-2 border-[#292D2B] dark:border-[#34465D] transition-all duration-300 select-none ${
          effectiveCollapsed ? 'lg:w-20' : 'lg:w-64'
        } ${
          mobileOpen
            ? 'translate-x-0 w-[280px] sm:w-[320px] max-w-[85vw] shadow-[8px_0px_0px_#292D2B] dark:shadow-[8px_0px_0px_#0A111C]'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Brand Section — Logo serves as the interactive sidebar toggle */}
        <div
          className={`h-16 px-4 flex items-center border-b-2 border-[#292D2B] dark:border-[#34465D] bg-white dark:bg-[#16263D] shrink-0 ${
            effectiveCollapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          {effectiveCollapsed ? (
            <button
              type="button"
              onClick={handleToggleCollapse}
              aria-label="Buka / Perluas sidebar"
              title="Buka / Perluas sidebar"
              className="p-1 rounded-md border-2 border-transparent hover:border-[#292D2B] dark:hover:border-[#34465D] hover:bg-[#EFE5D2] dark:hover:bg-[#243A56] transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer group"
            >
              <div className="rounded-md border-2 border-[#292D2B] dark:border-[#34465D] shadow-[2px_2px_0px_#292D2B] dark:shadow-[2px_2px_0px_#0A111C] bg-[#123D32] dark:bg-[#16263D] p-0.5">
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
              className="flex items-center gap-3 cursor-pointer group text-left p-1 -ml-1 rounded-md border-2 border-transparent hover:border-[#292D2B]/40 dark:hover:border-[#34465D] hover:bg-[#EFE5D2] dark:hover:bg-[#243A56] transition"
            >
              <div className="rounded-md border-2 border-[#292D2B] dark:border-[#34465D] shadow-[2px_2px_0px_#292D2B] dark:shadow-[2px_2px_0px_#0A111C] bg-[#123D32] dark:bg-[#16263D] p-0.5 transition-transform duration-150 group-hover:scale-105">
                <LogoSymbol className="w-9 h-9 shrink-0" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif-brand font-extrabold text-base tracking-tight leading-none text-[#292D2B] dark:text-[#F1F4F8] group-hover:text-[#123D32] dark:group-hover:text-[#D6AD52] transition-colors">
                  Dars <span className="font-normal italic text-[#D6AD52]">with</span> Osama
                </span>
                <span className="text-[9px] font-sans font-extrabold tracking-[0.2em] uppercase text-[#237A70] dark:text-[#D6AD52] mt-1">
                  ILMU • KAJIAN • KITAB
                </span>
              </div>
            </button>
          )}

          {/* Mobile Close Button with explicit text & icon */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border-2 border-[#292D2B] dark:border-[#34465D] bg-[#EFE5D2] dark:bg-[#243A56] text-[#292D2B] dark:text-[#F1F4F8] hover:bg-[#D6AD52] hover:text-[#101B2D] transition cursor-pointer text-xs font-bold"
            aria-label="Tutup menu"
          >
            <X className="w-4 h-4" />
            <span className="text-[11px]">Tutup</span>
          </button>
        </div>

        {/* Navigation Links Area */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {/* Primary Public & Learning Navigation */}
          <div className="space-y-1.5">
            {!effectiveCollapsed && (
              <p className="px-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#123D32] dark:text-[#D6AD52] mb-2">
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
                      ? 'bg-[#D6AD52] text-[#101B2D] font-extrabold border-[#292D2B] dark:border-[#34465D] shadow-[3px_3px_0px_#292D2B] dark:shadow-[3px_3px_0px_#0A111C]'
                      : 'bg-transparent hover:bg-[#E5EEE7] dark:hover:bg-[#243A56] text-[#292D2B] dark:text-[#F1F4F8] border-transparent hover:border-[#292D2B]/30 dark:hover:border-[#34465D]'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors border ${
                      item.active
                        ? 'bg-[#123D32] text-[#D6AD52] border-[#292D2B] dark:bg-[#16263D] dark:text-[#D6AD52] dark:border-[#34465D]'
                        : 'bg-[#EFE5D2] dark:bg-[#243A56] text-[#123D32] dark:text-[#A9C5E8] border-[#292D2B]/20 dark:border-[#34465D] group-hover:border-[#292D2B] dark:group-hover:border-[#D6AD52]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {!effectiveCollapsed && (
                    <div className="overflow-hidden flex-1">
                      <p className="text-xs font-extrabold truncate leading-tight">
                        {item.label}
                      </p>
                      <p
                        className={`text-[10px] truncate mt-0.5 font-semibold ${
                          item.active
                            ? 'text-[#101B2D]/80 dark:text-[#101B2D]/90'
                            : 'text-[#626A66] dark:text-[#B4C0D0]'
                        }`}
                      >
                        {item.sublabel}
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Personal & Admin Area */}
          {(user || isAdmin) && (
            <div className="space-y-1.5 pt-3 border-t-2 border-[#292D2B]/15 dark:border-[#34465D]/40">
              {!effectiveCollapsed && (
                <p className="px-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#123D32] dark:text-[#D6AD52] mb-2">
                  Ruang Pengguna
                </p>
              )}

              {user && (
                <button
                  type="button"
                  onClick={() => handleNavClick('student-dashboard')}
                  title={effectiveCollapsed ? t('nav.dashboard') : undefined}
                  className={`w-full flex items-center ${
                    effectiveCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
                  } rounded-md text-left transition-all duration-150 cursor-pointer group border-2 ${
                    isStudentDashboardActive
                      ? 'bg-[#D6AD52] text-[#101B2D] font-extrabold border-[#292D2B] dark:border-[#34465D] shadow-[3px_3px_0px_#292D2B] dark:shadow-[3px_3px_0px_#0A111C]'
                      : 'bg-transparent hover:bg-[#E5EEE7] dark:hover:bg-[#243A56] text-[#292D2B] dark:text-[#F1F4F8] border-transparent hover:border-[#292D2B]/30 dark:hover:border-[#34465D]'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border ${
                      isStudentDashboardActive
                        ? 'bg-[#123D32] text-[#D6AD52] border-[#292D2B] dark:bg-[#16263D] dark:text-[#D6AD52] dark:border-[#34465D]'
                        : 'bg-[#EFE5D2] dark:bg-[#243A56] text-[#123D32] dark:text-[#A9C5E8] border-[#292D2B]/20 dark:border-[#34465D]'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  {!effectiveCollapsed && (
                    <div className="overflow-hidden flex-1">
                      <p className="text-xs font-extrabold truncate leading-tight">
                        {t('nav.dashboard')}
                      </p>
                      <p
                        className={`text-[10px] truncate mt-0.5 font-semibold ${
                          isStudentDashboardActive
                            ? 'text-[#101B2D]/80 dark:text-[#101B2D]/90'
                            : 'text-[#626A66] dark:text-[#B4C0D0]'
                        }`}
                      >
                        Progres, Nilai &amp; Sertifikat
                      </p>
                    </div>
                  )}
                </button>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleNavClick('admin-dashboard')}
                  title={effectiveCollapsed ? t('nav.admin') : undefined}
                  className={`w-full flex items-center ${
                    effectiveCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
                  } rounded-md text-left transition-all duration-150 cursor-pointer group border-2 ${
                    isAdminDashboardActive
                      ? 'bg-[#D6AD52] text-[#101B2D] font-extrabold border-[#292D2B] dark:border-[#34465D] shadow-[3px_3px_0px_#292D2B] dark:shadow-[3px_3px_0px_#0A111C]'
                      : 'bg-transparent hover:bg-[#E5EEE7] dark:hover:bg-[#243A56] text-[#123D32] dark:text-[#D6AD52] border-transparent hover:border-[#292D2B]/30 dark:hover:border-[#34465D]'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border ${
                      isAdminDashboardActive
                        ? 'bg-[#123D32] text-[#D6AD52] border-[#292D2B] dark:bg-[#16263D] dark:text-[#D6AD52] dark:border-[#34465D]'
                        : 'bg-[#EFE5D2] dark:bg-[#243A56] text-[#123D32] dark:text-[#A9C5E8] border-[#292D2B]/20 dark:border-[#34465D]'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  {!effectiveCollapsed && (
                    <div className="overflow-hidden flex-1">
                      <p className="text-xs font-extrabold truncate leading-tight">
                        {t('nav.admin')}
                      </p>
                      <p
                        className={`text-[10px] truncate mt-0.5 font-semibold ${
                          isAdminDashboardActive
                            ? 'text-[#101B2D]/80 dark:text-[#101B2D]/90'
                            : 'text-[#626A66] dark:text-[#B4C0D0]'
                        }`}
                      >
                        Kelola Materi &amp; Artikel
                      </p>
                    </div>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Callout Quote Card & Welcome Info when Expanded */}
          {!effectiveCollapsed && (
            <div className="mt-3 p-3 rounded-md bg-[#E5EEE7] dark:bg-[#243A56] border-2 border-[#292D2B] dark:border-[#34465D] shadow-[3px_3px_0px_#292D2B] dark:shadow-[3px_3px_0px_#0A111C] space-y-1.5 text-[#292D2B] dark:text-[#F1F4F8]">
              <div className="flex items-center justify-between text-[#123D32] dark:text-[#D6AD52] text-[10px] font-extrabold uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Majelis Ilmu</span>
                </span>
                {onOpenWelcomeModal && (
                  <button
                    type="button"
                    onClick={onOpenWelcomeModal}
                    className="hover:underline flex items-center gap-0.5 cursor-pointer text-[#123D32] dark:text-[#D6AD52]"
                    title="Tentang Platform"
                  >
                    <Info className="w-3 h-3" />
                    <span>Info</span>
                  </button>
                )}
              </div>
              <p className="font-amiri text-base text-[#123D32] dark:text-[#F1F4F8] leading-relaxed text-right" dir="rtl">
                مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا
              </p>
              <p className="text-[11px] text-[#626A66] dark:text-[#B4C0D0] leading-snug font-medium">
                Pelajari matan ilmiah, simak video syarah, dan uji pemahaman secara bertahap.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Controls: Theme Toggle & User Account */}
        <div className="p-3 border-t-2 border-[#292D2B] dark:border-[#34465D] bg-[#EFE5D2] dark:bg-[#101B2D] space-y-2.5 shrink-0">
          {/* Quick Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`w-full flex items-center ${
              effectiveCollapsed ? 'justify-center py-2.5' : 'justify-between px-3 py-2'
            } rounded-md bg-white dark:bg-[#243A56] hover:bg-[#D6AD52] dark:hover:bg-[#D6AD52] text-[#292D2B] dark:text-[#F1F4F8] hover:text-[#101B2D] dark:hover:text-[#101B2D] border-2 border-[#292D2B] dark:border-[#34465D] text-xs font-extrabold transition cursor-pointer group shadow-[2px_2px_0px_#292D2B] dark:shadow-none`}
            title={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
          >
            <div className="flex items-center gap-2.5">
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#D6AD52] group-hover:text-[#101B2D]" />
              ) : (
                <Moon className="w-4 h-4 text-[#123D32] group-hover:text-[#101B2D]" />
              )}
              {!effectiveCollapsed && (
                <span>{theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}</span>
              )}
            </div>
            {!effectiveCollapsed && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#D6AD52] text-[#101B2D] font-extrabold uppercase border border-[#292D2B]">
                {theme === 'dark' ? 'Dark' : 'Light'}
              </span>
            )}
          </button>

          {/* User Profile or Login Button */}
          {user ? (
            <div className="space-y-2">
              <div
                onClick={openProfileModal}
                title="Pengaturan Profil"
                className={`flex items-center ${
                  effectiveCollapsed ? 'justify-center' : 'justify-between gap-2'
                } p-2 rounded-md bg-white dark:bg-[#243A56] hover:bg-[#FAF7F0] dark:hover:bg-[#1F334E] border-2 border-[#292D2B] dark:border-[#34465D] cursor-pointer transition shadow-[2px_2px_0px_#292D2B] dark:shadow-none`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-sm bg-[#D6AD52] text-[#101B2D] font-extrabold text-xs flex items-center justify-center uppercase shrink-0 overflow-hidden border border-[#292D2B]">
                    {userProfile?.photoURL || user.photoURL ? (
                      <img
                        src={userProfile?.photoURL || user.photoURL || ''}
                        alt={userProfile?.displayName || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (userProfile?.displayName || user.displayName || user.email || 'U')[0]
                    )}
                  </div>
                  {!effectiveCollapsed && (
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-[#292D2B] dark:text-[#F1F4F8] truncate">
                        {userProfile?.displayName || user.displayName || 'Penuntut Ilmu'}
                      </p>
                      <p className="text-[10px] text-[#626A66] dark:text-[#D6AD52] truncate font-medium">
                        {user.email}
                      </p>
                    </div>
                  )}
                </div>
                {!effectiveCollapsed && <Settings className="w-3.5 h-3.5 text-[#626A66] dark:text-[#A9C5E8] shrink-0" />}
              </div>

              <button
                type="button"
                onClick={openLogoutConfirmModal}
                title={t('nav.logout')}
                className={`w-full flex items-center justify-center ${
                  effectiveCollapsed ? 'py-2' : 'gap-2 py-2 px-3'
                } rounded-md bg-[#F04438] hover:bg-[#d9382d] text-white border-2 border-[#292D2B] shadow-[2px_2px_0px_#292D2B] text-xs font-extrabold transition cursor-pointer`}
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                {!effectiveCollapsed && <span>{t('nav.logout')}</span>}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              title={t('nav.login')}
              className={`w-full flex items-center justify-center ${
                effectiveCollapsed ? 'py-2.5' : 'gap-2 py-2.5 px-4'
              } rounded-md bg-[#D6AD52] hover:bg-[#c29a3e] text-[#101B2D] font-extrabold text-xs border-2 border-[#292D2B] shadow-[3px_3px_0px_#292D2B] dark:shadow-[3px_3px_0px_#0A111C] transition cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none`}
            >
              <UserIcon className="w-4 h-4 shrink-0" />
              {!effectiveCollapsed && <span>{t('nav.login')}</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
