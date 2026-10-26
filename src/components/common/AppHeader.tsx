import React from 'react';
import {
  Sun,
  Moon,
  User as UserIcon,
  Settings,
  LogOut,
  Search,
  X
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { LogoSymbol } from './Logo';

interface AppHeaderProps {
  currentView: string;
  setCurrentView: (view: any) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  onOpenWelcomeModal?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentView,
  setCurrentView,
  mobileOpen,
  setMobileOpen,
  isCollapsed = false,
  setIsCollapsed,
  searchQuery = '',
  setSearchQuery
}) => {
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const {
    user,
    userProfile,
    openAuthModal,
    openLogoutConfirmModal,
    openProfileModal
  } = useAuth();

  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-30 w-full bg-white dark:bg-[#16263D] border-b-2 border-[#292D2B] dark:border-[#34465D] transition-colors duration-200"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-3">
        
        {/* Left: Interactive Logo as Sidebar Toggle & Desktop Search */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
          {/* Mobile: Logo acts as the unified interactive sidebar toggle button */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Tutup sidebar" : "Buka sidebar"}
            title={mobileOpen ? "Tutup sidebar" : "Buka sidebar"}
            className="lg:hidden flex items-center gap-2 p-1 -ml-1 rounded-md border-2 border-transparent hover:border-[#292D2B] dark:hover:border-[#34465D] hover:bg-[#EFE5D2] dark:hover:bg-[#243A56] active:translate-x-[1px] active:translate-y-[1px] transition cursor-pointer group text-left"
          >
            <div className="w-9 h-9 rounded-md border-2 border-[#292D2B] dark:border-[#34465D] shadow-[2px_2px_0px_#292D2B] dark:shadow-[2px_2px_0px_#0A111C] bg-[#123D32] dark:bg-[#16263D] flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
              <LogoSymbol className="w-8 h-8" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif-brand font-extrabold text-sm tracking-tight leading-none text-[#292D2B] dark:text-[#F1F4F8]">
                Dars <span className="font-normal italic text-[#D6AD52]">with</span> Osama
              </span>
              <span className="text-[8px] font-sans font-extrabold tracking-[0.16em] uppercase text-[#237A70] dark:text-[#D6AD52] mt-1">
                {mobileOpen ? 'TUTUP SIDEBAR' : 'BUKA SIDEBAR'}
              </span>
            </div>
          </button>

          {/* Desktop: Header Logo also toggles sidebar collapse/expansion */}
          {setIsCollapsed && (
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              aria-label={isCollapsed ? "Buka sidebar" : "Tutup sidebar"}
              title={isCollapsed ? "Buka sidebar" : "Tutup sidebar"}
              className="hidden lg:flex items-center gap-2 px-2 py-1 rounded-md border-2 border-transparent hover:border-[#292D2B]/40 dark:hover:border-[#34465D] hover:bg-[#EFE5D2] dark:hover:bg-[#243A56] transition cursor-pointer group text-left"
            >
              <div className="w-8 h-8 rounded-md border-2 border-[#292D2B] dark:border-[#34465D] shadow-[2px_2px_0px_#292D2B] dark:shadow-[2px_2px_0px_#0A111C] bg-[#123D32] dark:bg-[#16263D] flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
                <LogoSymbol className="w-7 h-7" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif-brand font-extrabold text-xs tracking-tight leading-none text-[#292D2B] dark:text-[#F1F4F8]">
                  Dars <span className="font-normal italic text-[#D6AD52]">with</span> Osama
                </span>
                <span className="text-[8px] font-sans font-extrabold tracking-[0.14em] uppercase text-[#237A70] dark:text-[#D6AD52] mt-0.5">
                  {isCollapsed ? 'BUKA SIDEBAR' : 'CIUTKAN'}
                </span>
              </div>
            </button>
          )}

          {/* Desktop Quick Search & Context Pill */}
          <div className="hidden lg:flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md bg-[#123D32] dark:bg-[#243A56] text-[#FAF7F0] dark:text-[#D6AD52] border-2 border-[#292D2B] dark:border-[#34465D] text-xs uppercase tracking-wider font-extrabold shadow-[2px_2px_0px_#292D2B] dark:shadow-[2px_2px_0px_#0A111C] shrink-0">
              Dars Online
            </span>
            {setSearchQuery && (
              <div className="relative w-64 xl:w-80">
                <Search className="w-3.5 h-3.5 text-[#626A66] dark:text-[#A9C5E8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (currentView !== 'courses') {
                      setCurrentView('courses');
                    }
                  }}
                  placeholder="Cari kitab, kursus, atau materi..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-md bg-[#FAF7F0] dark:bg-[#101B2D] border-2 border-[#292D2B] dark:border-[#34465D] text-xs font-bold text-[#292D2B] dark:text-[#F1F4F8] placeholder-[#626A66]/70 dark:placeholder-[#B4C0D0]/50 focus:outline-none focus:border-[#123D32] dark:focus:border-[#D6AD52] focus:shadow-[2px_2px_0px_#123D32] dark:focus:shadow-[2px_2px_0px_#D6AD52]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#626A66] dark:text-[#B4C0D0]/60 hover:text-[#F04438] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Controls: Theme Toggle & User Auth / Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Theme Toggle (Light / Dark) */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
            className="p-2 rounded-md border-2 border-[#292D2B] dark:border-[#34465D] bg-[#EFE5D2] dark:bg-[#243A56] text-[#292D2B] dark:text-[#D6AD52] shadow-[2px_2px_0px_#292D2B] dark:shadow-[2px_2px_0px_#0A111C] hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[#D6AD52]" />
            ) : (
              <Moon className="w-4 h-4 text-[#123D32]" />
            )}
          </button>

          {/* User Profile or Login CTA */}
          {user ? (
            <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2 border-l-2 border-[#292D2B]/20 dark:border-[#34465D]/40">
              <button
                type="button"
                onClick={openProfileModal}
                title="Pengaturan Profil & Akun"
                className="flex items-center gap-1.5 sm:gap-2 py-1 px-1.5 sm:px-2 rounded-md border-2 border-[#292D2B] dark:border-[#34465D] bg-white dark:bg-[#16263D] hover:bg-[#EFE5D2] dark:hover:bg-[#243A56] transition cursor-pointer shadow-[2px_2px_0px_#292D2B] dark:shadow-[2px_2px_0px_#0A111C]"
              >
                <div className="w-6 h-6 rounded-sm bg-[#D6AD52] text-[#101B2D] flex items-center justify-center font-extrabold text-xs uppercase border border-[#292D2B] overflow-hidden shrink-0">
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
                <span className="text-xs font-extrabold text-[#292D2B] dark:text-[#F1F4F8] max-w-[100px] truncate hidden md:block">
                  {userProfile?.displayName || user.displayName || user.email?.split('@')[0]}
                </span>
                <Settings className="w-3.5 h-3.5 text-[#626A66] dark:text-[#A9C5E8] hidden sm:block" />
              </button>

              <button
                type="button"
                onClick={openLogoutConfirmModal}
                className="hidden sm:flex p-2 text-[#292D2B] dark:text-[#F1F4F8] hover:text-white hover:bg-[#F04438] rounded-md border-2 border-[#292D2B] dark:border-[#34465D] bg-white dark:bg-[#16263D] shadow-[2px_2px_0px_#292D2B] dark:shadow-[2px_2px_0px_#0A111C] transition cursor-pointer"
                title={t('nav.logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[#123D32] dark:bg-[#D6AD52] hover:bg-[#0E2F26] dark:hover:bg-[#c29a3e] text-white dark:text-[#101B2D] rounded-md text-xs font-extrabold transition border-2 border-[#292D2B] dark:border-[#34465D] shadow-[3px_3px_0px_#292D2B] dark:shadow-[3px_3px_0px_#0A111C] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer shrink-0"
            >
              <UserIcon className="w-3.5 h-3.5 text-[#D6AD52] dark:text-[#101B2D]" />
              <span className="whitespace-nowrap">{t('nav.login')}</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
