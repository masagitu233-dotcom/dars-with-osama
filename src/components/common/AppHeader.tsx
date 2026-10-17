import React, { useState, useEffect } from 'react';
import {
  Menu,
  BookOpen,
  Search,
  Sun,
  Moon,
  User,
  LogIn,
  GraduationCap,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface AppHeaderProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentView,
  setCurrentView,
  mobileOpen,
  setMobileOpen,
  searchQuery = '',
  setSearchQuery
}) => {
  const { user, userProfile, isAdmin, openAuthModal, openProfileModal } = useAuth();
  const { effectiveTheme, setTheme } = useTheme();

  const avatarURL = userProfile?.photoURL || user?.photoURL || '';
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatarURL]);

  // Compute readable page title / breadcrumb based on currentView
  const getPageTitle = () => {
    switch (currentView) {
      case 'home':
        return 'Beranda Utama';
      case 'courses':
        return 'Katalog Kursus & Matan';
      case 'course-detail':
        return 'Detail Kursus & Kurikulum';
      case 'session-view':
        return 'Ruang Pembelajaran Sesi';
      case 'quiz-view':
        return 'Kuis Evaluasi Sesi';
      case 'student-dashboard':
        return 'Pembelajaran Saya & Progress';
      case 'admin-dashboard':
        return 'Dashboard Administrasi';
      default:
        return 'Pembelajaran';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#F7F6EF]/90 dark:bg-[#071B16]/95 backdrop-blur-md border-b border-[#073B2E]/10 dark:border-[#C9A34E]/20 text-[#073B2E] dark:text-[#F7F6EF] px-4 sm:px-6 py-3 flex items-center justify-between gap-4 transition-colors">
      {/* Left: Hamburger Toggle Button (Mobile) & Breadcrumb Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 rounded-xl text-[#073B2E] dark:text-[#F7F6EF] hover:bg-[#073B2E]/10 dark:hover:bg-[#C9A34E]/20 transition cursor-pointer"
          title="Buka Navigasi Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-serif-brand font-bold uppercase tracking-wider text-[#C9A34E] hidden sm:inline">
            Dars with Osama
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-[#073B2E]/30 dark:text-[#C9A34E]/40 hidden sm:inline" />
          <h1 className="text-sm sm:text-base font-bold text-[#073B2E] dark:text-[#F7F6EF] font-sans tracking-tight">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Center: Quick Search Input if on catalog view or handler passed */}
      {setSearchQuery && (currentView === 'courses' || currentView === 'home') && (
        <div className="hidden md:flex items-center flex-1 max-w-xs relative">
          <Search className="w-3.5 h-3.5 absolute left-3 text-[#6B7C7A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari matan / kursus..."
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-[#0c2b23] border border-[#073B2E]/20 dark:border-[#143e33] rounded-xl text-xs text-[#073B2E] dark:text-[#F7F6EF] focus:outline-hidden focus:ring-2 focus:ring-[#C9A34E]/50"
          />
        </div>
      )}

      {/* Right Controls: Theme Toggle, User Avatar / Login CTA */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl bg-[#073B2E]/5 hover:bg-[#073B2E]/10 dark:bg-[#0c2b23] dark:hover:bg-[#143e33] border border-[#073B2E]/10 dark:border-[#143e33] text-[#073B2E] dark:text-[#F7F6EF] transition cursor-pointer active:scale-95"
          title="Toggle Mode Terang/Gelap"
        >
          {effectiveTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-[#C9A34E]" />
          ) : (
            <Moon className="w-4 h-4 text-[#073B2E]" />
          )}
        </button>

        {user ? (
          <button
            onClick={openProfileModal}
            className="flex items-center gap-2 p-1.5 pl-2.5 rounded-xl bg-[#073B2E]/5 hover:bg-[#073B2E]/10 dark:bg-[#0c2b23] dark:hover:bg-[#143e33] border border-[#073B2E]/10 dark:border-[#143e33] text-[#073B2E] dark:text-[#F7F6EF] transition text-xs font-semibold cursor-pointer active:scale-95"
          >
            <span className="hidden sm:inline font-semibold max-w-[100px] truncate">
              {userProfile?.displayName?.split(' ')[0] || 'Santri'}
            </span>
            <div className="w-6.5 h-6.5 rounded-full bg-[#073B2E] text-[#F7F6EF] font-bold text-[10px] flex items-center justify-center shrink-0 border border-[#C9A34E]/40 overflow-hidden">
              {avatarURL && !imgError ? (
                <img
                  src={avatarURL}
                  alt={userProfile?.displayName || 'Profil'}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'S'}</span>
              )}
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => openAuthModal('login')}
              className="px-3.5 py-1.5 bg-[#073B2E] hover:bg-[#0a4d3c] text-white rounded-xl text-xs font-semibold shadow transition cursor-pointer active:scale-95"
            >
              Masuk
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
