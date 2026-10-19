import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Home,
  Layers,
  GraduationCap,
  User,
  ShieldAlert,
  LogOut,
  LogIn,
  UserPlus,
  Sun,
  Moon,
  X,
  Settings,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  MessageSquare,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Logo } from './Logo';

interface AppSidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
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
  isCollapsed: externalIsCollapsed,
  setIsCollapsed: externalSetIsCollapsed
}) => {
  const { user, userProfile, isAdmin, openAuthModal, openProfileModal, openLogoutConfirmModal } = useAuth();
  const { t } = useLanguage();
  const { effectiveTheme, setTheme } = useTheme();

  // Desktop collapse state (internal or controlled via props)
  const [internalIsCollapsed, setInternalIsCollapsed] = useState<boolean>(false);
  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed;
  const setIsCollapsed = externalSetIsCollapsed || setInternalIsCollapsed;

  const avatarURL = userProfile?.photoURL || user?.photoURL || '';
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatarURL]);

  // Keyboard Escape listener to close drawer on mobile/tablet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, setMobileOpen]);

  // Window resize listener: automatically close mobile drawer when switching to desktop screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setMobileOpen]);

  const navigate = (view: string) => {
    setCurrentView(view);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isCoursesActive = currentView === 'courses' || currentView === 'course-detail' || currentView === 'session-view' || currentView === 'quiz-view';

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop - ONLY rendered when drawer is open */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-[#071B16]/70 backdrop-blur-xs lg:hidden transition-opacity duration-300 cursor-pointer"
          aria-hidden="true"
        />
      )}

      {/* Main Left Sidebar (Fixed to Viewport on Desktop & Mobile Drawer) */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen h-[100dvh] bg-[#F7F6EF] dark:bg-[#071B16] border-r border-[#073B2E]/10 dark:border-[#C9A34E]/20 flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0 ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0 shadow-2xl z-50' : '-translate-x-full lg:translate-x-0 shadow-none'
        }`}
      >
        {/* Top Header & Brand */}
        <div className={`p-4 border-b border-[#073B2E]/10 dark:border-[#C9A34E]/20 flex items-center shrink-0 ${isCollapsed ? 'lg:justify-center' : 'justify-between'}`}>
          <div
            onClick={() => navigate('home')}
            className="flex items-center cursor-pointer group select-none overflow-hidden"
            title="Dars with Osama - Beranda Utama"
          >
            {isCollapsed ? (
              <Logo variant="icon" size="sm" />
            ) : (
              <Logo variant="horizontal" size="sm" />
            )}
          </div>

          {/* Desktop Collapse Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            title={isCollapsed ? 'Perluas Sidebar' : 'Kecilkan Sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>

          {/* Close drawer button on mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            aria-label="Tutup Drawer Navigasi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links Area */}
        <div className={`flex-1 overflow-y-auto py-5 space-y-6 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          {/* Section Label */}
          <div>
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2 truncate">
                {user ? 'MENU SISWA' : 'MENU NAVIGASI'}
              </p>
            )}

            <nav className="space-y-1.5">
              {/* Beranda */}
              <button
                onClick={() => navigate('home')}
                title="Beranda Utama"
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'gap-3.5 px-3.5 py-3'} rounded-2xl text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-95 ${
                  currentView === 'home'
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-l-4 border-emerald-600 dark:border-emerald-500 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <Home className={`w-4 h-4 shrink-0 ${currentView === 'home' ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                {!isCollapsed && <span className="truncate">{t('home')}</span>}
              </button>

              {/* Katalog Kursus / Mata Pelajaran */}
              <button
                onClick={() => navigate('courses')}
                title="Katalog Kursus & Matan"
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'gap-3.5 px-3.5 py-3'} rounded-2xl text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-95 ${
                  isCoursesActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-l-4 border-emerald-600 dark:border-emerald-500 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <Layers className={`w-4 h-4 shrink-0 ${isCoursesActive ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                {!isCollapsed && <span className="truncate">{t('courses')}</span>}
              </button>

              {/* Blog Artikel */}
              <button
                onClick={() => navigate('blog')}
                title="Blog & Artikel Public"
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'gap-3.5 px-3.5 py-3'} rounded-2xl text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-95 ${
                  currentView === 'blog' || currentView === 'blog-detail'
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-l-4 border-emerald-600 dark:border-emerald-500 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <FileText className={`w-4 h-4 shrink-0 ${currentView === 'blog' || currentView === 'blog-detail' ? 'text-[#073B2E] dark:text-[#C9A34E]' : ''}`} />
                {!isCollapsed && <span className="truncate">Blog & Artikel</span>}
              </button>

              {/* Ruang Konsultasi Siswa */}
              <button
                onClick={() => navigate('consultation')}
                title="Ruang Konsultasi Siswa & Tanya Jawab"
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'gap-3.5 px-3.5 py-3'} rounded-2xl text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-95 ${
                  currentView === 'consultation'
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-l-4 border-emerald-600 dark:border-emerald-500 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <MessageSquare className={`w-4 h-4 shrink-0 ${currentView === 'consultation' ? 'text-[#073B2E] dark:text-[#C9A34E]' : ''}`} />
                {!isCollapsed && <span className="truncate">Ruang Konsultasi</span>}
              </button>

              {/* Tanya Jawab Publik */}
              <button
                onClick={() => navigate('public-qa')}
                title="Arsip Tanya Jawab Pembelajaran Publik"
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'gap-3.5 px-3.5 py-3'} rounded-2xl text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-95 ${
                  currentView === 'public-qa'
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-l-4 border-emerald-600 dark:border-emerald-500 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <HelpCircle className={`w-4 h-4 shrink-0 ${currentView === 'public-qa' ? 'text-[#073B2E] dark:text-[#C9A34E]' : ''}`} />
                {!isCollapsed && <span className="truncate">Tanya Jawab Publik</span>}
              </button>

              {/* Sambutan & Perkenalan Trigger Button */}
              {onOpenWelcomeModal && (
                <button
                  onClick={() => {
                    onOpenWelcomeModal();
                    setMobileOpen(false);
                  }}
                  title="Sambutan & Perkenalan Dars with Osama"
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'gap-3.5 px-3.5 py-3'} rounded-2xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-stone-100 transition-all duration-200 cursor-pointer active:scale-95`}
                >
                  <Sparkles className="w-4 h-4 shrink-0 text-[#C9A34E]" />
                  {!isCollapsed && <span className="truncate">Sambutan & Perkenalan</span>}
                </button>
              )}

              {/* Logged in student specific items */}
              {user && (
                <button
                  onClick={() => navigate('student-dashboard')}
                  title="Pembelajaran Saya & Progress"
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'gap-3.5 px-3.5 py-3'} rounded-2xl text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-95 ${
                    currentView === 'student-dashboard'
                      ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-l-4 border-emerald-600 dark:border-emerald-500 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  <GraduationCap className={`w-4 h-4 shrink-0 ${currentView === 'student-dashboard' ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                  {!isCollapsed && <span className="truncate">{t('myLearning')}</span>}
                </button>
              )}

              {/* Admin Panel button if user is Admin */}
              {isAdmin && (
                <button
                  onClick={() => navigate('admin-dashboard')}
                  title="Portal Administrasi"
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'gap-3.5 px-3.5 py-3'} rounded-2xl text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-95 ${
                    currentView === 'admin-dashboard'
                      ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border-l-4 border-amber-500 shadow-xs'
                      : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  {!isCollapsed && <span className="truncate">{t('adminPortal')}</span>}
                </button>
              )}
            </nav>
          </div>

          {/* Guest Specific Authentication Buttons */}
          {!user && (
            <div className="pt-2 space-y-2 border-t border-stone-200 dark:border-stone-800">
              {!isCollapsed && (
                <p className="px-3 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2">
                  AKUN SAYA
                </p>
              )}
              <button
                onClick={() => {
                  setMobileOpen(false);
                  openAuthModal('login');
                }}
                title="Masuk / Login Akun"
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3.5 py-2.5'} rounded-2xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition cursor-pointer active:scale-95`}
              >
                <LogIn className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">Masuk / Login</span>}
              </button>

              <button
                onClick={() => {
                  setMobileOpen(false);
                  openAuthModal('register');
                }}
                title="Daftar Akun Baru"
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3.5 py-2.5'} rounded-2xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 transition cursor-pointer active:scale-95`}
              >
                <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                {!isCollapsed && <span className="truncate">Daftar Akun Baru</span>}
              </button>
            </div>
          )}

          {/* Theme Switcher Toggle */}
          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-2">
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                PENGATURAN TAMPILAN
              </p>
            )}

            <button
              onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
              title={`Ubah Tampilan (${effectiveTheme === 'dark' ? 'Mode Terang' : 'Mode Gelap'})`}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5 px-0' : 'justify-between py-2.5 px-3.5'} rounded-2xl bg-stone-50 hover:bg-stone-100 dark:bg-stone-800/60 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700/60 text-stone-700 dark:text-stone-300 text-xs font-semibold transition cursor-pointer active:scale-95`}
            >
              <div className="flex items-center gap-2.5">
                {effectiveTheme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <Moon className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                {!isCollapsed && <span>{effectiveTheme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}</span>}
              </div>
              {!isCollapsed && <span className="text-[10px] text-stone-400 capitalize">{effectiveTheme}</span>}
            </button>
          </div>
        </div>

        {/* Bottom User Card / Logout Section */}
        {user && (
          <div className={`p-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 shrink-0 space-y-3 ${isCollapsed ? 'px-2' : 'px-4'}`}>
            <div
              onClick={() => {
                setMobileOpen(false);
                openProfileModal();
              }}
              title={`Pengaturan Profil (${userProfile?.displayName || 'Santri'})`}
              className={`flex items-center ${isCollapsed ? 'justify-center p-1' : 'justify-between p-2'} rounded-2xl hover:bg-stone-200/60 dark:hover:bg-stone-800/80 transition cursor-pointer group`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/30 overflow-hidden">
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
                {!isCollapsed && (
                  <div className="overflow-hidden text-xs">
                    <p className="font-semibold text-stone-900 dark:text-stone-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                      {userProfile?.displayName || 'Santri'}
                    </p>
                    <p className="text-stone-500 dark:text-stone-400 truncate text-[10px]">
                      {user.email}
                    </p>
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <Settings className="w-4 h-4 text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-200 transition shrink-0" />
              )}
            </div>

            <button
              onClick={() => {
                setMobileOpen(false);
                openLogoutConfirmModal();
              }}
              title="Keluar / Logout Akun"
              className={`w-full flex items-center justify-center ${isCollapsed ? 'px-0 py-2.5' : 'gap-2 py-2 px-3'} rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 text-xs font-semibold transition cursor-pointer active:scale-95`}
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              {!isCollapsed && <span>Keluar / Logout</span>}
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

