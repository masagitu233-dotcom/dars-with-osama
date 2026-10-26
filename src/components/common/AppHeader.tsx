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
      className="sticky top-0 z-30 w-full bg-white dark:bg-[#06251D] border-b-2 border-[#171717] dark:border-[#D9AC45]/40 transition-colors duration-200"
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
            className="lg:hidden flex items-center gap-2 p-1 -ml-1 rounded-md border-2 border-transparent hover:border-[#171717] dark:hover:border-[#D9AC45] hover:bg-[#F5EFE2] dark:hover:bg-[#0B3026] active:translate-x-[1px] active:translate-y-[1px] transition cursor-pointer group text-left"
          >
            <div className="w-9 h-9 rounded-md border-2 border-[#171717] dark:border-[#D9AC45] shadow-[2px_2px_0px_#171717] bg-[#06251D] flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
              <LogoSymbol className="w-8 h-8" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif-brand font-extrabold text-sm tracking-tight leading-none text-[#171717] dark:text-[#F8F3E8]">
                Dars <span className="font-normal italic text-[#D9AC45]">with</span> Osama
              </span>
              <span className="text-[8px] font-sans font-extrabold tracking-[0.16em] uppercase text-[#0B6B50] dark:text-[#D9AC45] mt-1">
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
              className="hidden lg:flex items-center gap-2 px-2 py-1 rounded-md border-2 border-transparent hover:border-[#171717]/40 dark:hover:border-[#D9AC45]/60 hover:bg-[#F5EFE2] dark:hover:bg-[#0B3026] transition cursor-pointer group text-left"
            >
              <div className="w-8 h-8 rounded-md border-2 border-[#171717] dark:border-[#D9AC45] shadow-[2px_2px_0px_#171717] bg-[#06251D] flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
                <LogoSymbol className="w-7 h-7" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif-brand font-extrabold text-xs tracking-tight leading-none text-[#171717] dark:text-[#F8F3E8]">
                  Dars <span className="font-normal italic text-[#D9AC45]">with</span> Osama
                </span>
                <span className="text-[8px] font-sans font-extrabold tracking-[0.14em] uppercase text-[#0B6B50] dark:text-[#D9AC45] mt-0.5">
                  {isCollapsed ? 'BUKA SIDEBAR' : 'CIUTKAN'}
                </span>
              </div>
            </button>
          )}

          {/* Desktop Quick Search & Context Pill */}
          <div className="hidden lg:flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md bg-[#0B6B50] dark:bg-[#0B3026] text-[#F8F3E8] dark:text-[#D9AC45] border-2 border-[#171717] dark:border-[#D9AC45] text-xs uppercase tracking-wider font-extrabold shadow-[2px_2px_0px_#171717] shrink-0">
              Dars Online
            </span>
            {setSearchQuery && (
              <div className="relative w-64 xl:w-80">
                <Search className="w-3.5 h-3.5 text-[#57534E] dark:text-[#D9AC45] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                  className="w-full pl-8 pr-7 py-1.5 rounded-md bg-[#F5EFE2] dark:bg-[#06251D] border-2 border-[#171717] dark:border-[#D9AC45]/60 text-xs font-bold text-[#171717] dark:text-[#F8F3E8] placeholder-[#57534E]/70 dark:placeholder-[#F8F3E8]/50 focus:outline-none focus:border-[#0B6B50] dark:focus:border-[#D9AC45] focus:shadow-[2px_2px_0px_#0B6B50]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#57534E] dark:text-[#F8F3E8]/60 hover:text-[#F04438] cursor-pointer"
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
            className="p-2 rounded-md border-2 border-[#171717] dark:border-[#D9AC45] bg-[#F5EFE2] dark:bg-[#06251D] text-[#171717] dark:text-[#D9AC45] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[#D9AC45]" />
            ) : (
              <Moon className="w-4 h-4 text-[#0B6B50]" />
            )}
          </button>

          {/* User Profile or Login CTA */}
          {user ? (
            <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2 border-l-2 border-[#171717]/20 dark:border-[#D9AC45]/30">
              <button
                type="button"
                onClick={openProfileModal}
                title="Pengaturan Profil & Akun"
                className="flex items-center gap-1.5 sm:gap-2 py-1 px-1.5 sm:px-2 rounded-md border-2 border-[#171717] dark:border-[#D9AC45]/60 bg-white dark:bg-[#06251D] hover:bg-[#F5EFE2] dark:hover:bg-[#0B3026] transition cursor-pointer shadow-[2px_2px_0px_#171717]"
              >
                <div className="w-6 h-6 rounded-sm bg-[#D9AC45] text-[#171717] flex items-center justify-center font-extrabold text-xs uppercase border border-[#171717] overflow-hidden shrink-0">
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
                <span className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] max-w-[100px] truncate hidden md:block">
                  {userProfile?.displayName || user.displayName || user.email?.split('@')[0]}
                </span>
                <Settings className="w-3.5 h-3.5 text-[#57534E] dark:text-[#D9AC45] hidden sm:block" />
              </button>

              <button
                type="button"
                onClick={openLogoutConfirmModal}
                className="hidden sm:flex p-2 text-[#171717] dark:text-[#F8F3E8] hover:text-white hover:bg-[#F04438] rounded-md border-2 border-[#171717] dark:border-[#F04438] bg-white dark:bg-[#06251D] shadow-[2px_2px_0px_#171717] transition cursor-pointer"
                title={t('nav.logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[#0B6B50] dark:bg-[#D9AC45] hover:bg-[#08553F] dark:hover:bg-[#e5ba54] text-white dark:text-[#171717] rounded-md text-xs font-extrabold transition border-2 border-[#171717] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer shrink-0"
            >
              <UserIcon className="w-3.5 h-3.5 text-[#D9AC45] dark:text-[#171717]" />
              <span className="whitespace-nowrap">{t('nav.login')}</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
