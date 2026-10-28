import React from 'react';
import {
  Sun,
  Moon,
  User as UserIcon,
  Settings,
  LogOut
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
  setIsCollapsed
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
      className="sticky top-0 z-30 w-full bg-white dark:bg-[#0D2B36] border-b-2 border-[#171717] dark:border-[#1F5F63] transition-colors duration-200"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-3">
        
        {/* Left: Interactive Logo as Sidebar Toggle & Dars Online Direct Link */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
          {/* Mobile: Logo acts as the unified interactive sidebar toggle button */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Tutup sidebar" : "Buka sidebar"}
            title={mobileOpen ? "Tutup sidebar" : "Buka sidebar"}
            className="lg:hidden flex items-center gap-2 p-1 -ml-1 rounded-md border-2 border-transparent hover:border-[#171717] dark:hover:border-[#4CA7A1] hover:bg-[#EFE5D2] dark:hover:bg-[#1F5F63] active:translate-x-[1px] active:translate-y-[1px] transition cursor-pointer group text-left"
          >
            <div className="w-9 h-9 rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] bg-[#123D32] dark:bg-[#1F5F63] flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
              <LogoSymbol className="w-8 h-8" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif-brand font-extrabold text-sm tracking-tight leading-none text-[#171717] dark:text-[#CEFEF1]">
                Dars <span className="font-normal italic text-[#D6AD52] dark:text-[#4CA7A1]">with</span> Osama
              </span>
              <span className="text-[8px] font-sans font-extrabold tracking-[0.16em] uppercase text-[#237A70] dark:text-[#A6D6C9] mt-1">
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
              className="hidden lg:flex items-center gap-2 px-2 py-1 rounded-md border-2 border-transparent hover:border-[#171717]/40 dark:hover:border-[#4CA7A1] hover:bg-[#EFE5D2] dark:hover:bg-[#1F5F63] transition cursor-pointer group text-left"
            >
              <div className="w-8 h-8 rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] bg-[#123D32] dark:bg-[#1F5F63] flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
                <LogoSymbol className="w-7 h-7" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif-brand font-extrabold text-xs tracking-tight leading-none text-[#171717] dark:text-[#CEFEF1]">
                  Dars <span className="font-normal italic text-[#D6AD52] dark:text-[#4CA7A1]">with</span> Osama
                </span>
                <span className="text-[8px] font-sans font-extrabold tracking-[0.14em] uppercase text-[#237A70] dark:text-[#A6D6C9] mt-0.5">
                  {isCollapsed ? 'BUKA SIDEBAR' : 'CIUTKAN'}
                </span>
              </div>
            </button>
          )}

          {/* Dars Online Pill Button */}
          <button
            type="button"
            onClick={() => setCurrentView('courses')}
            title="Katalog Pembelajaran Dars Online"
            className="hidden sm:inline-flex items-center px-3 py-1 rounded-md bg-[#123D32] dark:bg-[#1F5F63] hover:bg-[#195344] dark:hover:bg-[#287A7F] text-[#FAF7F0] dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] text-xs uppercase tracking-wider font-extrabold shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] shrink-0 cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition"
          >
            Dars Online
          </button>
        </div>

        {/* Right Controls: Theme Toggle & User Auth / Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Theme Toggle (Light / Dark) */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
            className="p-2 rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] bg-[#EFE5D2] dark:bg-[#1F5F63] text-[#171717] dark:text-[#CEFEF1] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[#CEFEF1]" />
            ) : (
              <Moon className="w-4 h-4 text-[#123D32]" />
            )}
          </button>

          {/* User Profile or Login CTA */}
          {user ? (
            <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2 border-l-2 border-[#171717]/20 dark:border-[#1F5F63]">
              <button
                type="button"
                onClick={openProfileModal}
                title="Pengaturan Profil & Akun"
                className="flex items-center gap-1.5 sm:gap-2 py-1 px-1.5 sm:px-2 rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] bg-white dark:bg-[#1F5F63] hover:bg-[#EFE5D2] dark:hover:bg-[#0D2B36] transition cursor-pointer shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]"
              >
                <div className="w-6 h-6 rounded-sm bg-[#D6AD52] dark:bg-[#4CA7A1] text-[#171717] dark:text-[#001722] flex items-center justify-center font-extrabold text-xs uppercase border border-[#171717] dark:border-[#A6D6C9] overflow-hidden shrink-0">
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
                <span className="text-xs font-extrabold text-[#171717] dark:text-[#CEFEF1] max-w-[100px] truncate hidden md:block">
                  {userProfile?.displayName || user.displayName || user.email?.split('@')[0]}
                </span>
                <Settings className="w-3.5 h-3.5 text-[#626A66] dark:text-[#A6D6C9] hidden sm:block" />
              </button>

              <button
                type="button"
                onClick={openLogoutConfirmModal}
                className="flex p-2 text-white hover:bg-[#B83D3D] rounded-md border-2 border-[#171717] dark:border-[#A6D6C9] bg-[#D9534F] dark:bg-[#C94A4A] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] transition cursor-pointer"
                title="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[#123D32] dark:bg-[#4CA7A1] hover:bg-[#0E2F26] dark:hover:bg-[#5BB7B1] text-white dark:text-[#001722] rounded-md text-xs font-extrabold transition border-2 border-[#171717] dark:border-[#A6D6C9] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer shrink-0"
            >
              <UserIcon className="w-3.5 h-3.5 text-[#D6AD52] dark:text-[#001722]" />
              <span className="whitespace-nowrap">Masuk Akun</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
