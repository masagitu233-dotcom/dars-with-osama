import React, { useState } from 'react';
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  ShieldAlert,
  User,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Globe,
  Menu,
  X,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { ProfileSettingsModal } from './ProfileSettingsModal';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  onSelectCategory?: (categoryId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView }) => {
  const { user, userProfile, isAdmin, openLogoutConfirmModal, openAuthModal, openProfileModal, firebaseConnected } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const { theme, effectiveTheme, setTheme } = useTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const avatarURL = userProfile?.photoURL || user?.photoURL || '';

  React.useEffect(() => {
    setImgError(false);
  }, [avatarURL]);

  const navigate = (view: string) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 transition-colors">

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo & Brand */}
          <div
            onClick={() => navigate('home')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-emerald-600 border border-emerald-500/30 flex items-center justify-center text-amber-300 shadow-md group-hover:scale-105 transition">
              <BookOpen className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg md:text-xl text-stone-900 dark:text-stone-100 tracking-tight font-sans">
                  Dars with Osama
                </span>
              </div>
              <p className="text-[10px] md:text-xs text-stone-500 dark:text-stone-400 -mt-0.5 font-medium">
                Kajian & Pembelajaran Online Terstruktur
              </p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button
              onClick={() => navigate('home')}
              className={`relative px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                currentView === 'home'
                  ? 'bg-emerald-100/70 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold shadow-xs ring-1 ring-emerald-500/30'
                  : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-300 dark:hover:text-white dark:hover:bg-stone-800/60 active:scale-95'
              }`}
            >
              {t('home')}
              {currentView === 'home' && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-emerald-500 dark:bg-emerald-400 rounded-full" />
              )}
            </button>

            <button
              onClick={() => navigate('courses')}
              className={`relative px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                currentView === 'courses' || currentView === 'course-detail' || currentView === 'session-view'
                  ? 'bg-emerald-100/70 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold shadow-xs ring-1 ring-emerald-500/30'
                  : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-300 dark:hover:text-white dark:hover:bg-stone-800/60 active:scale-95'
              }`}
            >
              {t('courses')}
              {(currentView === 'courses' || currentView === 'course-detail' || currentView === 'session-view') && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-emerald-500 dark:bg-emerald-400 rounded-full" />
              )}
            </button>

            {user && (
              <button
                onClick={() => navigate('student-dashboard')}
                className={`relative px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'student-dashboard'
                    ? 'bg-emerald-100/70 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold shadow-xs ring-1 ring-emerald-500/30'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-300 dark:hover:text-white dark:hover:bg-stone-800/60 active:scale-95'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{t('myLearning')}</span>
                {currentView === 'student-dashboard' && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-emerald-500 dark:bg-emerald-400 rounded-full" />
                )}
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => navigate('admin-dashboard')}
                className={`relative px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                  currentView.startsWith('admin')
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-600/50 font-semibold shadow-xs'
                    : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 active:scale-95'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>{t('adminPortal')}</span>
              </button>
            )}
          </nav>

          {/* Desktop Auth & Language Controls */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800/80 dark:hover:bg-stone-700/80 border border-stone-200 dark:border-stone-700/60 text-stone-700 dark:text-stone-200 transition text-xs font-semibold cursor-pointer active:scale-95"
              title="Ganti Bahasa / تغيير اللغة"
            >
              <Globe className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
              <span className="font-arabic" style={{ fontFamily: "'Tajawal', 'Amiri', sans-serif" }}>
                {language === 'id' ? 'العربية (AR)' : 'Bahasa (ID)'}
              </span>
            </button>

            {/* Theme Switcher */}
            <div className="relative">
              <button
                onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800/80 dark:hover:bg-stone-700/80 border border-stone-200 dark:border-stone-700/60 text-stone-700 dark:text-stone-200 transition text-xs font-semibold cursor-pointer active:scale-95"
                title="Pengaturan Tema / Theme Settings"
              >
                {theme === 'light' ? (
                  <Sun className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                ) : theme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Monitor className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                )}
                <span className="capitalize">{theme === 'light' ? 'Terang' : theme === 'dark' ? 'Gelap' : 'Sistem'}</span>
                <ChevronDown className={`w-3 h-3 text-stone-500 dark:text-stone-400 transition-transform duration-200 ${themeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {themeDropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl dark:shadow-2xl py-1.5 text-stone-800 dark:text-stone-200 z-50 animate-modal-in">
                  <button
                    onClick={() => {
                      setTheme('light');
                      setThemeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 transition cursor-pointer ${
                      theme === 'light' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold' : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    <span>Mode Terang</span>
                  </button>

                  <button
                    onClick={() => {
                      setTheme('dark');
                      setThemeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 transition cursor-pointer ${
                      theme === 'dark' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold' : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Mode Gelap</span>
                  </button>

                  <button
                    onClick={() => {
                      setTheme('system');
                      setThemeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 transition cursor-pointer ${
                      theme === 'system' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold' : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span>Ikuti Sistem</span>
                  </button>
                </div>
              )}
            </div>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700/80 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 transition-all duration-200 hover:border-emerald-500/40 cursor-pointer shadow-xs active:scale-95"
                >
                  {avatarURL && !imgError ? (
                    <img
                      src={avatarURL}
                      alt={userProfile?.displayName || 'Avatar'}
                      className="w-8 h-8 rounded-full object-cover border border-emerald-500/50 shadow-inner shrink-0"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs uppercase shadow-inner shrink-0">
                      {(userProfile?.displayName || user.email || 'P')[0]}
                    </div>
                  )}
                  <div className="text-left text-xs max-w-[120px] truncate">
                    <p className="font-semibold text-stone-900 dark:text-white truncate">{userProfile?.displayName || user.email?.split('@')[0]}</p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{isAdmin ? 'Administrator' : 'Peserta'}</p>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-stone-500 dark:text-stone-400 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl dark:shadow-2xl py-2 text-stone-800 dark:text-stone-200 z-50 animate-modal-in">
                    <div className="px-4 py-2 border-b border-stone-200 dark:border-stone-800">
                      <p className="text-xs text-stone-500 dark:text-stone-400">Masuk sebagai</p>
                      <p className="text-sm font-semibold truncate text-stone-900 dark:text-white">{user.email}</p>
                    </div>

                    <button
                      onClick={() => navigate('student-dashboard')}
                      className="w-full text-left px-4 py-2.5 text-xs hover:bg-stone-100 dark:hover:bg-stone-800/80 flex items-center gap-2 text-stone-700 dark:text-stone-200 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{t('myLearning')}</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => navigate('admin-dashboard')}
                        className="w-full text-left px-4 py-2.5 text-xs hover:bg-amber-50 dark:hover:bg-stone-800/80 flex items-center gap-2 text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 transition-colors cursor-pointer"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        <span>{t('adminPortal')}</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        openProfileModal();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs hover:bg-stone-100 dark:hover:bg-stone-800/80 flex items-center gap-2 text-stone-700 dark:text-stone-200 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Pengaturan Profil</span>
                    </button>

                    <div className="border-t border-stone-200 dark:border-stone-800 my-1"></div>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        openLogoutConfirmModal();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t('logout')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-4 py-2 text-xs md:text-sm font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-200 dark:hover:text-white dark:hover:bg-stone-800/80 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                >
                  {t('login')}
                </button>
                <button
                  onClick={() => openAuthModal('register')}
                  className="px-4 py-2 text-xs md:text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-950/50 active:scale-95 cursor-pointer shadow-md"
                >
                  {t('register')}
                </button>
              </div>
            )}
          </div>

          {/* Mobile Language & Menu Buttons */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 transition-all active:scale-95 text-[11px] font-semibold"
              title="Ganti Bahasa / تغيير اللغة"
            >
              <Globe className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
              <span>{language === 'id' ? 'AR' : 'ID'}</span>
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-all active:scale-95"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 pt-3 pb-6 space-y-3 animate-fade-in shadow-xl dark:shadow-2xl">
          <nav className="space-y-1">
            <button
              onClick={() => navigate('home')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                currentView === 'home'
                  ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-semibold border-l-2 border-emerald-500'
                  : 'text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800'
              }`}
            >
              {t('home')}
            </button>
            <button
              onClick={() => navigate('courses')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                currentView === 'courses' || currentView === 'course-detail' || currentView === 'session-view'
                  ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-semibold border-l-2 border-emerald-500'
                  : 'text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800'
              }`}
            >
              {t('courses')}
            </button>
            {user && (
              <button
                onClick={() => navigate('student-dashboard')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
                  currentView === 'student-dashboard'
                    ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-semibold border-l-2 border-emerald-500'
                    : 'text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{t('myLearning')}</span>
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => navigate('admin-dashboard')}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-2"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>{t('adminPortal')}</span>
              </button>
            )}
          </nav>
          {/* Mobile Theme Switcher Group */}
          <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
            <p className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2 px-1">Pilihan Mode Tampilan</p>
            <div className="flex items-center bg-stone-100 dark:bg-stone-800/80 p-1 rounded-xl border border-stone-200 dark:border-stone-700/70 justify-between gap-1">
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  theme === 'light' ? 'bg-emerald-600 text-white shadow' : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Terang</span>
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  theme === 'dark' ? 'bg-emerald-600 text-white shadow' : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-emerald-300" />
                <span>Gelap</span>
              </button>

              <button
                onClick={() => setTheme('system')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  theme === 'system' ? 'bg-emerald-600 text-white shadow' : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5 text-sky-400" />
                <span>Sistem</span>
              </button>
            </div>
          </div>

          <div className="border-t border-stone-200 dark:border-stone-800 pt-3">
            {user ? (
              <div className="space-y-2">
                <div className="px-3 py-2 bg-stone-100 dark:bg-stone-800/60 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {avatarURL && !imgError ? (
                      <img
                        src={avatarURL}
                        alt={userProfile?.displayName || 'Avatar'}
                        className="w-8 h-8 rounded-full object-cover border border-emerald-500/50 shrink-0"
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {(userProfile?.displayName || user.email || 'P')[0]}
                      </div>
                    )}
                    <div className="truncate">
                      <p className="text-xs font-semibold text-stone-900 dark:text-white truncate">{userProfile?.displayName || user.email?.split('@')[0]}</p>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openProfileModal();
                    }}
                    className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition cursor-pointer shrink-0"
                    title="Pengaturan Profil"
                  >
                    <User className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openProfileModal();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl flex items-center gap-2 transition font-medium cursor-pointer"
                >
                  <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Pengaturan Profil & Foto</span>
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openLogoutConfirmModal();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl flex items-center gap-2 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('logout')}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { openAuthModal('login'); setMobileMenuOpen(false); }}
                  className="py-2.5 text-center text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 dark:text-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 rounded-xl transition active:scale-95 cursor-pointer"
                >
                  {t('login')}
                </button>
                <button
                  onClick={() => { openAuthModal('register'); setMobileMenuOpen(false); }}
                  className="py-2.5 text-center text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition active:scale-95 shadow cursor-pointer"
                >
                  {t('register')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
