import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Award,
  Video,
  FileText,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SmoothScrollProvider } from './context/SmoothScrollContext';
import { AppSidebar } from './components/common/AppSidebar';
import { AppHeader } from './components/common/AppHeader';
import { Footer } from './components/common/Footer';
import { AuthModal } from './components/common/AuthModal';
import { ProfileSettingsModal } from './components/common/ProfileSettingsModal';
import { CertificateModal } from './components/common/CertificateModal';
import { LogoutConfirmModal } from './components/common/LogoutConfirmModal';
import { GuestAccessModal } from './components/common/GuestAccessModal';
import { WelcomeModal } from './components/common/WelcomeModal';
import { Toast } from './components/common/Toast';
import { HomeView } from './components/home/HomeView';
import { HeroSection } from './components/home/HeroSection';
import { CourseCatalog } from './components/courses/CourseCatalog';
import { CourseCard } from './components/courses/CourseCard';
import { CourseDetail } from './components/courses/CourseDetail';
import { SessionView } from './components/courses/SessionView';
import { QuizView } from './components/courses/QuizView';
import { StudentDashboard } from './components/dashboard/StudentDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { BlogListView } from './components/blog/BlogListView';
import { BlogDetailView } from './components/blog/BlogDetailView';
import { StudentConsultationView } from './components/consultation/StudentConsultationView';
import { PublicQAView } from './components/consultation/PublicQAView';
import { Course, Category, Session, Quiz, Enrollment, BlogPost } from './types';
import AOS from 'aos';
import 'aos/dist/aos.css';
import {
  getCategories,
  getCourses,
  getSessionsByCourse,
  resolveSessionFromRoute,
  getQuizById,
  getUserEnrollments,
  getBlogPosts
} from './firebase/services';

function MainApp() {
  const {
    user,
    isAdmin,
    logout,
    openAuthModal,
    profileModalOpen,
    closeProfileModal,
    logoutConfirmModalOpen,
    closeLogoutConfirmModal,
    guestModalOpen,
    guestModalCourse,
    openGuestModal,
    closeGuestModal,
    toastMessage,
    clearToast
  } = useAuth();
  const { t, language } = useLanguage();

  // Mobile drawer & sidebar collapse state
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Navigation View State (Initialized from deep-link URL if present so initial render never overwrites URL)
  const [currentView, setCurrentView] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      const s = new URLSearchParams(window.location.search);
      if (
        p.startsWith('/session/') ||
        s.has('session') ||
        s.has('sessionId') ||
        s.get('view') === 'session-view'
      ) {
        return 'session-view';
      }
      if (
        p.startsWith('/article/') ||
        s.has('article') ||
        s.get('view') === 'blog-detail'
      ) {
        return 'blog-detail';
      }
      if (p.startsWith('/qa/') || s.has('qaId')) {
        return 'public-qa';
      }
      const v = s.get('view');
      if (v) return v;
    }
    return 'home';
  });

  // Selected Entities State
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [selectedBlogPost, setSelectedBlogPost] = useState<BlogPost | null>(null);

  // Certificate Modal State
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certCourse, setCertCourse] = useState<Course | null>(null);

  // Welcome & Video Intro Modal State (First visit in session, skipped on direct deep links)
  const [welcomeModalOpen, setWelcomeModalOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      const s = new URLSearchParams(window.location.search);
      if (
        p.startsWith('/session/') ||
        p.startsWith('/article/') ||
        p.startsWith('/qa/') ||
        s.has('session') ||
        s.has('sessionId') ||
        s.has('view') ||
        s.has('article') ||
        s.has('qaId')
      ) {
        return false;
      }
    }
    return !sessionStorage.getItem('dars_intro_shown');
  });

  const handleCloseWelcomeModal = () => {
    sessionStorage.setItem('dars_intro_shown', 'true');
    setWelcomeModalOpen(false);
  };

  const handleOpenWelcomeModal = () => {
    setWelcomeModalOpen(true);
  };

  // Target direct link QA State
  const [targetQaId, setTargetQaId] = useState<string | null>(null);

  // Initialize AOS once at root level with proper trigger offsets and repeated scroll responsiveness
  useEffect(() => {
    AOS.init({
      duration: 700,
      easing: 'ease-out-cubic',
      once: false,
      mirror: false,
      offset: 120,
    });
  }, []);

  // Search & Filter State
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Loaded Data States
  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseSessions, setCourseSessions] = useState<Session[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [enrollmentsMap, setEnrollmentsMap] = useState<Record<string, Enrollment>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && (blogPosts.length > 0 || courses.length > 0)) {
      const params = new URLSearchParams(window.location.search);
      const urlQaId = params.get('qaId');
      const urlView = params.get('view');
      const urlArticleId = params.get('id');
      const urlArticle = params.get('article');
      const urlCourseId = params.get('courseId');
      const urlSessionParam = params.get('session') || params.get('sessionId');
      const pathname = window.location.pathname;

      let targetPost: BlogPost | undefined;

      if (urlArticle) {
        targetPost = blogPosts.find(p => p.slug === urlArticle || p.id === urlArticle);
      } else if (urlView === 'blog-detail') {
        targetPost = blogPosts.find(p => p.id === urlArticleId || p.slug === urlArticleId) || blogPosts[0];
      } else if (pathname.startsWith('/article/')) {
        const articleParam = decodeURIComponent(pathname.replace('/article/', '')).replace(/\/$/, '');
        targetPost = blogPosts.find(p => p.slug === articleParam || p.id === articleParam);
      }

      const pathSessionParam = pathname.startsWith('/session/')
        ? decodeURIComponent(pathname.replace('/session/', '')).replace(/\/$/, '')
        : null;
      const effectiveSessionParam = pathSessionParam || urlSessionParam;

      if (targetPost && targetPost.status === 'published') {
        setSelectedBlogPost(targetPost);
        setCurrentView('blog-detail');
      } else if (pathname.startsWith('/qa/')) {
        const qaParam = decodeURIComponent(pathname.replace('/qa/', '')).replace(/\/$/, '');
        setTargetQaId(qaParam);
        setCurrentView('public-qa');
      } else if (urlQaId) {
        setTargetQaId(urlQaId);
        setCurrentView('public-qa');
      } else if (effectiveSessionParam || urlView === 'session-view') {
        resolveSessionFromRoute(effectiveSessionParam, courses, urlCourseId, isAdmin).then(resolved => {
          if (resolved) {
            setSelectedCourse(resolved.course);
            setCourseSessions(resolved.allCourseSessions);
            setSelectedSession(resolved.session);
            if (resolved.session.quizId && !resolved.isRestricted) {
              getQuizById(resolved.session.quizId).then(q => setSelectedQuiz(q));
            } else {
              setSelectedQuiz(null);
            }
            setCurrentView('session-view');
          }
        });
      } else if (urlView) {
        setCurrentView(urlView);
      }
    }
  }, [blogPosts, courses, isAdmin]);

  // Reset URL bar cleanly when user navigates away from deep-linked views
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      !loading &&
      currentView !== 'session-view' &&
      currentView !== 'blog-detail' &&
      currentView !== 'public-qa' &&
      window.location.pathname.startsWith('/session/')
    ) {
      window.history.replaceState({}, 'Dars with Osama', '/');
    }
  }, [currentView, loading]);

  // Recalculate and re-scan newly mounted elements on view transitions and dynamic data loads
  useEffect(() => {
    const timer = setTimeout(() => {
      AOS.refreshHard();
    }, 150);
    return () => clearTimeout(timer);
  }, [currentView, selectedCourse, selectedSession, selectedBlogPost, courses.length, blogPosts.length, loading]);

  // Fetch initial categories, published courses, and blog posts from Cloud Firestore
  const loadData = async () => {
    try {
      const [cats, crss, posts] = await Promise.all([
        getCategories(),
        getCourses(false), // published only for main app
        getBlogPosts(false) // published only for public blog
      ]);
      setCategories(cats);
      setCourses(crss);
      setBlogPosts(posts);
      const isDirectSessionRoute =
        typeof window !== 'undefined' &&
        (window.location.pathname.startsWith('/session/') ||
          new URLSearchParams(window.location.search).has('session') ||
          new URLSearchParams(window.location.search).has('sessionId'));
      if (crss.length > 0 && !selectedCourse && !isDirectSessionRoute) {
        setSelectedCourse(crss[0]);
      }
    } catch (err) {
      console.warn('Initial data load notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch user enrollments when user changes
  const loadUserEnrollments = async () => {
    if (!user) {
      setEnrollmentsMap({});
      return;
    }
    try {
      const list = await getUserEnrollments(user.uid);
      const map: Record<string, Enrollment> = {};
      list.forEach(e => { map[e.courseId] = e; });
      setEnrollmentsMap(map);
    } catch (err) {
      console.warn('Enrollment load error:', err);
    }
  };

  useEffect(() => {
    loadUserEnrollments();
  }, [user]);

  // When selectedCourse changes, fetch its sessions while preserving an already-selected session of the same course
  useEffect(() => {
    if (!selectedCourse) {
      setCourseSessions([]);
      return;
    }
    getSessionsByCourse(selectedCourse.id, false).then(sessions => {
      setCourseSessions(sessions);
      setSelectedSession(prev => {
        if (prev && prev.courseId === selectedCourse.id) {
          return prev;
        }
        return sessions.length > 0 ? sessions[0] : null;
      });
    });
  }, [selectedCourse]);

  // Handlers for navigation
  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setCurrentView('course-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectSession = (session: Session) => {
    setSelectedSession(session);
    if (session.quizId) {
      getQuizById(session.quizId).then(q => setSelectedQuiz(q));
    } else {
      setSelectedQuiz(null);
    }
    setCurrentView('session-view');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartQuiz = (quiz: Quiz) => {
    if (!user) {
      openGuestModal(selectedCourse, {
        type: 'quiz',
        courseId: selectedCourse?.id,
        quizId: quiz.id,
        onSuccess: () => {
          setSelectedQuiz(quiz);
          setCurrentView('quiz-view');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
      return;
    }
    setSelectedQuiz(quiz);
    setCurrentView('quiz-view');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCertificate = (course: Course) => {
    setCertCourse(course);
    setCertModalOpen(true);
  };

  const handleConfirmLogout = async () => {
    await logout();
    setCurrentView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <SmoothScrollProvider currentView={currentView}>
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-300 transition-colors duration-250">
        {currentView === 'admin-dashboard' && isAdmin ? (
          <AdminDashboard
            onNavigateToSiswa={() => {
              setCurrentView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onPreviewBlogPost={(post) => {
              setSelectedBlogPost(post);
              setCurrentView('blog-detail');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onRefreshData={() => {
              loadData();
              loadUserEnrollments();
            }}
          />
        ) : (
          <div className="flex min-h-screen w-full relative overflow-x-clip">
            {/* Left Sidebar Navigation (Desktop Permanent / Mobile Drawer) */}
            <AppSidebar
              currentView={currentView}
              setCurrentView={setCurrentView}
              mobileOpen={mobileMenuOpen}
              setMobileOpen={setMobileMenuOpen}
              onOpenWelcomeModal={handleOpenWelcomeModal}
              isCollapsed={isSidebarCollapsed}
              setIsCollapsed={setIsSidebarCollapsed}
            />

            {/* Right Main Content Column - Properly offset on desktop to prevent overlap */}
            <div className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 ${
              isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
            }`}>
              {/* Top Page Header */}
              <AppHeader
                currentView={currentView}
                setCurrentView={setCurrentView}
                mobileOpen={mobileMenuOpen}
                setMobileOpen={setMobileMenuOpen}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onOpenWelcomeModal={handleOpenWelcomeModal}
              />

              {/* Main Body Router */}
              <main className="flex-1">
                <div key={currentView} className="animate-fade-in">
                  {/* VIEW 1: HOME */}
                  {currentView === 'home' && (
                    <HomeView
                      categories={categories}
                      courses={courses}
                      blogPosts={blogPosts}
                      enrollmentsMap={enrollmentsMap}
                      onSelectCourse={handleSelectCourse}
                      onSelectBlogPost={(post) => {
                        setSelectedBlogPost(post);
                        setCurrentView('blog-detail');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onExplore={() => {
                        setCurrentView('courses');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onSearch={(query) => {
                        setSearchQuery(query);
                        setFilterCategoryId('all');
                      }}
                      onSelectCategory={(catId) => {
                        setFilterCategoryId(catId);
                        setCurrentView('courses');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onNavigate={(view, qaId) => {
                        if (qaId) setTargetQaId(qaId);
                        setCurrentView(view);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onOpenAuthModal={(tab) => {
                        openAuthModal(tab);
                      }}
                    />
                  )}

                  {/* VIEW 2: COURSE CATALOG */}
                  {currentView === 'courses' && (
                    <CourseCatalog
                      courses={courses}
                      categories={categories}
                      enrollments={enrollmentsMap}
                      selectedCategoryId={filterCategoryId}
                      searchQuery={searchQuery}
                      onSelectCourse={handleSelectCourse}
                      onClearFilters={() => {
                        setFilterCategoryId('all');
                        setSearchQuery('');
                      }}
                    />
                  )}

                  {/* VIEW 3: COURSE DETAIL */}
                  {currentView === 'course-detail' && selectedCourse && (
                    <CourseDetail
                      course={selectedCourse}
                      category={categories.find(c => c.id === selectedCourse.categoryId)}
                      sessions={courseSessions}
                      enrollment={enrollmentsMap[selectedCourse.id] || null}
                      onBack={() => setCurrentView('courses')}
                      onSelectSession={handleSelectSession}
                      onOpenCertificate={handleOpenCertificate}
                      onRefreshEnrollment={loadUserEnrollments}
                    />
                  )}

                  {/* VIEW 4: SESSION CLASSROOM */}
                  {currentView === 'session-view' && (
                    selectedCourse && selectedSession ? (
                      <SessionView
                        course={selectedCourse}
                        session={selectedSession}
                        allSessions={courseSessions}
                        quiz={selectedQuiz}
                        enrollment={enrollmentsMap[selectedCourse.id] || null}
                        onBackToCourse={() => setCurrentView('course-detail')}
                        onSelectSession={handleSelectSession}
                        onStartQuiz={handleStartQuiz}
                        onOpenCertificate={handleOpenCertificate}
                        onRefreshEnrollment={loadUserEnrollments}
                      />
                    ) : (
                      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
                        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm text-stone-600 dark:text-stone-400 font-medium">
                          Memuat sesi pembelajaran...
                        </p>
                      </div>
                    )
                  )}

                  {/* VIEW 5: QUIZ VIEW */}
                  {currentView === 'quiz-view' && selectedCourse && selectedQuiz && (
                    <QuizView
                      quiz={selectedQuiz}
                      course={selectedCourse}
                      session={selectedSession || undefined}
                      onBackToSession={() => setCurrentView('session-view')}
                      onOpenCertificate={handleOpenCertificate}
                      onRefreshEnrollment={loadUserEnrollments}
                    />
                  )}

                  {/* VIEW 6: STUDENT DASHBOARD */}
                  {currentView === 'student-dashboard' && (
                    <StudentDashboard
                      courses={courses}
                      onSelectCourse={handleSelectCourse}
                      onOpenCertificate={handleOpenCertificate}
                      onExploreCourses={() => {
                        setFilterCategoryId('all');
                        setSearchQuery('');
                        setCurrentView('courses');
                      }}
                    />
                  )}

                  {/* VIEW 7: BLOG LIST */}
                  {currentView === 'blog' && (
                    <BlogListView
                      posts={blogPosts}
                      onSelectArticle={(article) => {
                        setSelectedBlogPost(article);
                        setCurrentView('blog-detail');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  )}

                  {/* VIEW 8: BLOG DETAIL */}
                  {currentView === 'blog-detail' && (selectedBlogPost || blogPosts[0]) && (
                    <BlogDetailView
                      post={selectedBlogPost || blogPosts[0]}
                      allPosts={blogPosts}
                      onBack={() => setCurrentView('blog')}
                      onSelectArticle={(article) => {
                        setSelectedBlogPost(article);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  )}

                  {/* VIEW 9: STUDENT CONSULTATION */}
                  {currentView === 'consultation' && (
                    <StudentConsultationView
                      onNavigateToPublicQA={() => {
                        setCurrentView('public-qa');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  )}

                  {/* VIEW 10: PUBLIC Q&A */}
                  {currentView === 'public-qa' && (
                    <PublicQAView
                      initialQaId={targetQaId}
                      onNavigateToConsultation={() => {
                        setCurrentView('consultation');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  )}
                </div>
              </main>

              {/* Footer */}
              <Footer
                onNavigate={(view) => {
                  setFilterCategoryId('all');
                  setSearchQuery('');
                  setCurrentView(view);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          </div>
        )}

        {/* Global Modals */}
        <WelcomeModal isOpen={welcomeModalOpen} onClose={handleCloseWelcomeModal} />
        <AuthModal />
        <ProfileSettingsModal isOpen={profileModalOpen} onClose={closeProfileModal} />

        <GuestAccessModal
          isOpen={guestModalOpen}
          onClose={closeGuestModal}
          course={guestModalCourse}
          onLogin={() => {
            closeGuestModal();
            openAuthModal('login');
          }}
          onRegister={() => {
            closeGuestModal();
            openAuthModal('register');
          }}
        />

        <LogoutConfirmModal
          isOpen={logoutConfirmModalOpen}
          onClose={closeLogoutConfirmModal}
          onConfirm={handleConfirmLogout}
        />

        <Toast message={toastMessage} onClose={clearToast} />

        {certCourse && (
          <CertificateModal
            isOpen={certModalOpen}
            onClose={() => setCertModalOpen(false)}
            course={certCourse}
          />
        )}
      </div>
    </SmoothScrollProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
