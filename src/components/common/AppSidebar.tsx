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
        className={`fixed top-0 left-0 bottom-0 z-50 flex flex-col bg-[#FFFDF7] dark:bg-[#082A21] text-[#171717] dark:text-[#F8F3E8] border-r-2 border-[#171717] dark:border-[#D9AC45]/40 transition-all duration-300 select-none ${
          effectiveCollapsed ? 'lg:w-20' : 'lg:w-64'
        } ${
          mobileOpen
            ? 'translate-x-0 w-[280px] sm:w-[320px] max-w-[85vw] shadow-[8px_0px_0px_#171717]'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Brand Section — Logo serves as the interactive sidebar toggle */}
        <div
          className={`h-16 px-4 flex items-center border-b-2 border-[#171717] dark:border-[#D9AC45]/40 bg-white dark:bg-[#06251D] shrink-0 ${
            effectiveCollapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          {effectiveCollapsed ? (
            <button
              type="button"
              onClick={handleToggleCollapse}
              aria-label="Buka / Perluas sidebar"
              title="Buka / Perluas sidebar"
              className="p-1 rounded-md border-2 border-transparent hover:border-[#171717] dark:hover:border-[#D9AC45] hover:bg-[#F5EFE2] dark:hover:bg-[#0B3026] transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer group"
            >
              <div className="rounded-md border-2 border-[#171717] dark:border-[#D9AC45] shadow-[2px_2px_0px_#171717] bg-[#06251D] p-0.5">
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
              className="flex items-center gap-3 cursor-pointer group text-left p-1 -ml-1 rounded-md border-2 border-transparent hover:border-[#171717]/40 dark:hover:border-[#D9AC45]/60 hover:bg-[#F5EFE2] dark:hover:bg-[#0B3026] transition"
            >
              <div className="rounded-md border-2 border-[#171717] dark:border-[#D9AC45] shadow-[2px_2px_0px_#171717] bg-[#06251D] p-0.5 transition-transform duration-150 group-hover:scale-105">
                <LogoSymbol className="w-9 h-9 shrink-0" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif-brand font-extrabold text-base tracking-tight leading-none text-[#171717] dark:text-[#F8F3E8] group-hover:text-[#0B6B50] dark:group-hover:text-[#D9AC45] transition-colors">
                  Dars <span className="font-normal italic text-[#D9AC45]">with</span> Osama
                </span>
                <span className="text-[9px] font-sans font-extrabold tracking-[0.2em] uppercase text-[#0B6B50] dark:text-[#D9AC45] mt-1">
                  ILMU • KAJIAN • KITAB
                </span>
              </div>
            </button>
          )}

          {/* Mobile Close Button with explicit text & icon */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border-2 border-[#171717] dark:border-[#D9AC45] bg-[#F5EFE2] dark:bg-[#0B3026] text-[#171717] dark:text-[#F8F3E8] hover:bg-[#D9AC45] hover:text-[#171717] transition cursor-pointer text-xs font-bold"
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
              <p className="px-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#0B6B50] dark:text-[#D9AC45] mb-2">
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
                      ? 'bg-[#D9AC45] text-[#171717] font-extrabold border-[#171717] shadow-[3px_3px_0px_#171717]'
                      : 'bg-transparent hover:bg-[#F5EFE2] dark:hover:bg-[#0B3026] text-[#171717] dark:text-[#F8F3E8] border-transparent hover:border-[#171717]/40 dark:hover:border-[#D9AC45]/70'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors border ${
                      item.active
                        ? 'bg-[#06251D] text-[#D9AC45] border-[#171717]'
                        : 'bg-[#F5EFE2] dark:bg-[#06251D] text-[#0B6B50] dark:text-[#D9AC45] border-[#171717]/20 dark:border-[#D9AC45]/40 group-hover:border-[#171717] dark:group-hover:border-[#D9AC45]'
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
                            ? 'text-[#171717]/80'
                            : 'text-[#57534E] dark:text-[#A7B5AE]'
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
            <div className="space-y-1.5 pt-3 border-t-2 border-[#171717]/15 dark:border-[#D9AC45]/30">
              {!effectiveCollapsed && (
                <p className="px-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#0B6B50] dark:text-[#D9AC45] mb-2">
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
                      ? 'bg-[#D9AC45] text-[#171717] font-extrabold border-[#171717] shadow-[3px_3px_0px_#171717]'
                      : 'bg-transparent hover:bg-[#F5EFE2] dark:hover:bg-[#0B3026] text-[#171717] dark:text-[#F8F3E8] border-transparent hover:border-[#171717]/40 dark:hover:border-[#D9AC45]/70'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border ${
                      isStudentDashboardActive
                        ? 'bg-[#06251D] text-[#D9AC45] border-[#171717]'
                        : 'bg-[#F5EFE2] dark:bg-[#06251D] text-[#0B6B50] dark:text-[#D9AC45] border-[#171717]/20 dark:border-[#D9AC45]/40'
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
                            ? 'text-[#171717]/80'
                            : 'text-[#57534E] dark:text-[#A7B5AE]'
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
                      ? 'bg-[#D9AC45] text-[#171717] font-extrabold border-[#171717] shadow-[3px_3px_0px_#171717]'
                      : 'bg-transparent hover:bg-[#F5EFE2] dark:hover:bg-[#0B3026] text-[#0B6B50] dark:text-[#D9AC45] border-transparent hover:border-[#171717]/40 dark:hover:border-[#D9AC45]'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border ${
                      isAdminDashboardActive
                        ? 'bg-[#06251D] text-[#D9AC45] border-[#171717]'
                        : 'bg-[#F5EFE2] dark:bg-[#06251D] text-[#0B6B50] dark:text-[#D9AC45] border-[#171717]/20 dark:border-[#D9AC45]/50'
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
                            ? 'text-[#171717]/80'
                            : 'text-[#57534E] dark:text-[#A7B5AE]'
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
            <div className="mt-3 p-3 rounded-md bg-[#F5EFE2] dark:bg-[#0B3026] border-2 border-[#171717] dark:border-[#D9AC45] shadow-[3px_3px_0px_#171717] space-y-1.5 text-[#171717] dark:text-[#F8F3E8]">
              <div className="flex items-center justify-between text-[#0B6B50] dark:text-[#D9AC45] text-[10px] font-extrabold uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Majelis Ilmu</span>
                </span>
                {onOpenWelcomeModal && (
                  <button
                    type="button"
                    onClick={onOpenWelcomeModal}
                    className="hover:underline flex items-center gap-0.5 cursor-pointer text-[#0B6B50] dark:text-[#D9AC45]"
                    title="Tentang Platform"
                  >
                    <Info className="w-3 h-3" />
                    <span>Info</span>
                  </button>
                )}
              </div>
              <p className="font-amiri text-base text-[#171717] dark:text-[#F8F3E8] leading-relaxed text-right" dir="rtl">
                مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا
              </p>
              <p className="text-[11px] text-[#57534E] dark:text-[#A7B5AE] leading-snug font-medium">
                Pelajari matan ilmiah, simak video syarah, dan uji pemahaman secara bertahap.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Controls: Theme Toggle & User Account */}
        <div className="p-3 border-t-2 border-[#171717] dark:border-[#D9AC45]/40 bg-[#F5EFE2] dark:bg-[#041A14] space-y-2.5 shrink-0">
          {/* Quick Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`w-full flex items-center ${
              effectiveCollapsed ? 'justify-center py-2.5' : 'justify-between px-3 py-2'
            } rounded-md bg-white dark:bg-[#06251D] hover:bg-[#D9AC45] dark:hover:bg-[#D9AC45] text-[#171717] dark:text-[#F8F3E8] hover:text-[#171717] dark:hover:text-[#171717] border-2 border-[#171717] dark:border-[#D9AC45]/60 text-xs font-extrabold transition cursor-pointer group shadow-[2px_2px_0px_#171717] dark:shadow-none`}
            title={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
          >
            <div className="flex items-center gap-2.5">
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#D9AC45] group-hover:text-[#171717]" />
              ) : (
                <Moon className="w-4 h-4 text-[#0B6B50] group-hover:text-[#171717]" />
              )}
              {!effectiveCollapsed && (
                <span>{theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}</span>
              )}
            </div>
            {!effectiveCollapsed && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#D9AC45] text-[#171717] font-extrabold uppercase border border-[#171717]">
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
                } p-2 rounded-md bg-white dark:bg-[#06251D] hover:bg-neutral-100 dark:hover:bg-[#06251D]/80 border-2 border-[#171717] dark:border-[#D9AC45]/50 cursor-pointer transition shadow-[2px_2px_0px_#171717] dark:shadow-none`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-sm bg-[#D9AC45] text-[#171717] font-extrabold text-xs flex items-center justify-center uppercase shrink-0 overflow-hidden border border-[#171717]">
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
                      <p className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] truncate">
                        {userProfile?.displayName || user.displayName || 'Penuntut Ilmu'}
                      </p>
                      <p className="text-[10px] text-[#57534E] dark:text-[#D9AC45] truncate font-medium">
                        {user.email}
                      </p>
                    </div>
                  )}
                </div>
                {!effectiveCollapsed && <Settings className="w-3.5 h-3.5 text-[#57534E] dark:text-[#D9AC45] shrink-0" />}
              </div>

              <button
                type="button"
                onClick={openLogoutConfirmModal}
                title={t('nav.logout')}
                className={`w-full flex items-center justify-center ${
                  effectiveCollapsed ? 'py-2' : 'gap-2 py-2 px-3'
                } rounded-md bg-[#F04438] hover:bg-[#d9382d] text-white border-2 border-[#171717] shadow-[2px_2px_0px_#171717] text-xs font-extrabold transition cursor-pointer`}
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
              } rounded-md bg-[#D9AC45] hover:bg-[#e5ba54] text-[#171717] font-extrabold text-xs border-2 border-[#171717] shadow-[3px_3px_0px_#171717] transition cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none`}
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
