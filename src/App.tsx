import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { InstructorProfileView } from './components/profile/InstructorProfileView';
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
  getBlogPosts,
  getBlogPostBySlug,
  invalidateServicesCache
} from './firebase/services';
import { classifyFirestoreError } from './firebase/config';
import { ServiceDisruptionBanner } from './components/common/ServiceDisruptionBanner';
import { canAttemptRetry, DEFAULT_RETRY_COOLDOWN_SECONDS } from './utils/serviceDisruptionHelper';
import {
  DarsRouteState,
  DarsHistoryState,
  isDarsHistoryState,
  parseUrlToRouteState,
  buildUrlFromRouteState,
  isSameRouteState,
  computeInitialHistorySetup
} from './utils/navigationHistory';

function MainApp() {
  const {
    user,
    isAdmin,
    logout,
    authModalOpen,
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

  // Navigation View State (Initialized from deep-link URL or preserved history state)
  const [currentView, setCurrentView] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      if (isDarsHistoryState(window.history.state)) {
        return window.history.state.view;
      }
      return parseUrlToRouteState(window.location.pathname, window.location.search).view;
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
  const [adminInitialTab, setAdminInitialTab] = useState<'dashboard' | 'courses' | 'categories' | 'sessions' | 'quizzes' | 'users' | 'attempts' | 'firebase' | 'blog' | 'consultation' | 'comments' | 'instructor-profile' | undefined>(undefined);

  // Welcome & Video Intro Modal State (First visit in session, skipped on direct deep links)
  const [welcomeModalOpen, setWelcomeModalOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      const s = new URLSearchParams(window.location.search);
      if (
        p.startsWith('/session/') ||
        p.startsWith('/article/') ||
        p.startsWith('/qa/') ||
        p === '/profil-pengajar' ||
        p === '/profil-pengajar/' ||
        p === '/profil' ||
        p === '/pengajar' ||
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

  // Firestore disruption state & debounce retry tracking
  const [loadError, setLoadError] = useState<{ category: string; summary: string; code: string } | null>(null);
  const [lastDataFetchTimestamp, setLastDataFetchTimestamp] = useState<number>(0);
  const [isRetryingData, setIsRetryingData] = useState<boolean>(false);

  const [sessionError, setSessionError] = useState<{ category: string; summary: string; code: string } | null>(null);
  const [lastSessionFetchTimestamp, setLastSessionFetchTimestamp] = useState<number>(0);
  const [isRetryingSession, setIsRetryingSession] = useState<boolean>(false);

  // Refs to keep latest state accessible inside popstate listener without stale closures
  const currentViewRef = useRef<string>(currentView);
  currentViewRef.current = currentView;
  const blogPostsRef = useRef<BlogPost[]>(blogPosts);
  blogPostsRef.current = blogPosts;
  const coursesRef = useRef<Course[]>(courses);
  coursesRef.current = courses;
  const isAdminRef = useRef<boolean>(isAdmin);
  isAdminRef.current = isAdmin;
  const filterCategoryIdRef = useRef<string>(filterCategoryId);
  filterCategoryIdRef.current = filterCategoryId;
  const searchQueryRef = useRef<string>(searchQuery);
  searchQueryRef.current = searchQuery;
  const selectedCourseRef = useRef<Course | null>(selectedCourse);
  selectedCourseRef.current = selectedCourse;
  const selectedSessionRef = useRef<Session | null>(selectedSession);
  selectedSessionRef.current = selectedSession;
  const selectedBlogPostRef = useRef<BlogPost | null>(selectedBlogPost);
  selectedBlogPostRef.current = selectedBlogPost;
  const selectedQuizRef = useRef<Quiz | null>(selectedQuiz);
  selectedQuizRef.current = selectedQuiz;
  const targetQaIdRef = useRef<string | null>(targetQaId);
  targetQaIdRef.current = targetQaId;

  // Map of internal history index -> DarsHistoryState to inspect previous entry on in-app Back buttons
  const historyEntriesRef = useRef<Record<number, DarsHistoryState>>({});
  const lastNavTransitionTimeRef = useRef<number>(0);

  // Synchronize React entities (selectedBlogPost, selectedCourse, selectedSession, etc.) with a DarsRouteState
  const applyRouteToState = useCallback(
    (
      route: DarsRouteState,
      postsList: BlogPost[],
      coursesList: Course[],
      adminFlag: boolean
    ) => {
      if (route.filterCategoryId !== undefined) {
        setFilterCategoryId(route.filterCategoryId);
      }
      if (route.searchQuery !== undefined) {
        setSearchQuery(route.searchQuery);
      }

      if (route.view === 'blog-detail') {
        const slugOrId = route.blogPostSlug || route.blogPostId;
        if (postsList.length > 0) {
          const targetPost = slugOrId
            ? postsList.find(p => p.slug === slugOrId || p.id === slugOrId)
            : selectedBlogPostRef.current || postsList[0];
          if (targetPost && (targetPost.status === 'published' || adminFlag)) {
            setSelectedBlogPost(targetPost);
            setCurrentView('blog-detail');
            return;
          }
        }
        if (slugOrId) {
          getBlogPostBySlug(slugOrId).then(post => {
            if (post && (post.status === 'published' || adminFlag)) {
              setSelectedBlogPost(post);
            }
          });
        }
        setCurrentView('blog-detail');
        return;
      }

      if (route.view === 'public-qa') {
        setTargetQaId(route.qaId || null);
        setCurrentView('public-qa');
        return;
      }

      if (route.view === 'course-detail') {
        if (coursesList.length > 0 && route.courseId) {
          const foundCourse = coursesList.find(c => c.id === route.courseId);
          if (foundCourse) {
            setSelectedCourse(foundCourse);
          }
        }
        setCurrentView('course-detail');
        return;
      }

      if (route.view === 'session-view') {
        setCurrentView('session-view');
        if (coursesList.length > 0 && (route.sessionId || selectedSessionRef.current)) {
          const sessionIdentifier = route.sessionId || selectedSessionRef.current?.id || null;
          const preferredCourseId = route.courseId || selectedCourseRef.current?.id || null;
          resolveSessionFromRoute(sessionIdentifier, coursesList, preferredCourseId, adminFlag).then(
            resolved => {
              if (resolved) {
                setSelectedCourse(resolved.course);
                setCourseSessions(resolved.allCourseSessions);
                setSelectedSession(resolved.session);
                if (resolved.session.quizId && !resolved.isRestricted) {
                  getQuizById(resolved.session.quizId).then(q => setSelectedQuiz(q));
                } else {
                  setSelectedQuiz(null);
                }
              }
            }
          );
        }
        return;
      }

      if (route.view === 'quiz-view') {
        if (coursesList.length > 0 && route.courseId) {
          const foundCourse = coursesList.find(c => c.id === route.courseId);
          if (foundCourse) setSelectedCourse(foundCourse);
        }
        if (route.quizId && (!selectedQuizRef.current || selectedQuizRef.current.id !== route.quizId)) {
          getQuizById(route.quizId).then(q => {
            if (q) setSelectedQuiz(q);
          });
        }
        setCurrentView('quiz-view');
        return;
      }

      setCurrentView(route.view || 'home');
    },
    []
  );

  // Central navigation helper that records internal page transitions in Browser History API
  const navigateTo = useCallback(
    (nextRoute: DarsRouteState, options?: { replace?: boolean }) => {
      if (typeof window === 'undefined') {
        setCurrentView(nextRoute.view);
        return;
      }

      lastNavTransitionTimeRef.current = Date.now();
      const rawCurrentState = window.history.state;
      const currentScrollY = Math.max(0, Math.round(window.scrollY || 0));

      const currentState: DarsHistoryState = isDarsHistoryState(rawCurrentState)
        ? {
            ...rawCurrentState,
            scrollY: currentScrollY,
            isFallbackHome: false
          }
        : {
            __darsNav: true,
            view: currentViewRef.current,
            courseId: selectedCourseRef.current?.id || null,
            sessionId: selectedSessionRef.current?.id || null,
            quizId: selectedQuizRef.current?.id || null,
            blogPostId: selectedBlogPostRef.current?.id || null,
            blogPostSlug: selectedBlogPostRef.current?.slug || null,
            qaId: targetQaIdRef.current || null,
            filterCategoryId: filterCategoryIdRef.current,
            searchQuery: searchQueryRef.current,
            index: 0,
            scrollY: currentScrollY,
            isFallbackHome: false,
            prevView: null,
            prevIsFallbackHome: false
          };

      // Save current scroll position into the current history entry before leaving
      window.history.replaceState(
        currentState,
        '',
        `${window.location.pathname}${window.location.search}`
      );
      historyEntriesRef.current[currentState.index] = currentState;

      // Avoid pushing duplicate consecutive entries for the exact same route
      if (!options?.replace && isSameRouteState(currentState, nextRoute)) {
        applyRouteToState(nextRoute, blogPostsRef.current, coursesRef.current, isAdminRef.current);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const nextIndex = options?.replace ? currentState.index : currentState.index + 1;
      const nextState: DarsHistoryState = {
        __darsNav: true,
        view: nextRoute.view,
        courseId: nextRoute.courseId ?? null,
        sessionId: nextRoute.sessionId ?? null,
        quizId: nextRoute.quizId ?? null,
        blogPostId: nextRoute.blogPostId ?? null,
        blogPostSlug: nextRoute.blogPostSlug ?? null,
        qaId: nextRoute.qaId ?? null,
        filterCategoryId: nextRoute.filterCategoryId ?? filterCategoryIdRef.current,
        searchQuery: nextRoute.searchQuery ?? searchQueryRef.current,
        index: nextIndex,
        scrollY: 0,
        isFallbackHome: false,
        prevView: options?.replace ? currentState.prevView ?? null : currentState.view,
        prevIsFallbackHome: options?.replace ? Boolean(currentState.prevIsFallbackHome) : false
      };

      const nextUrl = buildUrlFromRouteState(nextState);
      if (options?.replace) {
        window.history.replaceState(nextState, '', nextUrl);
      } else {
        window.history.pushState(nextState, '', nextUrl);
      }
      historyEntriesRef.current[nextIndex] = nextState;

      applyRouteToState(nextState, blogPostsRef.current, coursesRef.current, isAdminRef.current);
    },
    [applyRouteToState]
  );

  // Simple view-name navigation adapter for AppSidebar, AppHeader, and Footer
  const handleNavigateView = useCallback(
    (view: string) => {
      navigateTo({
        view,
        filterCategoryId: view === 'courses' ? filterCategoryIdRef.current : 'all',
        searchQuery: view === 'courses' ? searchQueryRef.current : ''
      });
    },
    [navigateTo]
  );

  // Initialize Browser History API stack on mount & listen to hardware/browser Back/Forward (popstate)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const setup = computeInitialHistorySetup(
      window.location.pathname,
      window.location.search,
      window.history.state
    );

    if (setup.mode === 'direct-internal-with-fallback') {
      // Insert Homepage at index 0 as fallback, then push the direct deep-link page at index 1
      window.history.replaceState(setup.fallbackHomeState, '', setup.fallbackUrl);
      historyEntriesRef.current[0] = setup.fallbackHomeState;
      window.history.pushState(setup.activeState, '', setup.activeUrl);
      historyEntriesRef.current[1] = setup.activeState;
    } else {
      window.history.replaceState(setup.activeState, '', setup.activeUrl);
      historyEntriesRef.current[setup.activeState.index] = setup.activeState;
    }

    const handlePopState = (event: PopStateEvent) => {
      lastNavTransitionTimeRef.current = Date.now();
      setMobileMenuOpen(false);

      const poppedState: DarsRouteState = isDarsHistoryState(event.state)
        ? event.state
        : parseUrlToRouteState(window.location.pathname, window.location.search);

      if (isDarsHistoryState(event.state)) {
        historyEntriesRef.current[event.state.index] = event.state;
      }

      applyRouteToState(
        poppedState,
        blogPostsRef.current,
        coursesRef.current,
        isAdminRef.current
      );
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [applyRouteToState]);

  // Keep current history entry's scrollY updated passively when scrolling
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let timeoutId: number | null = null;

    const handleScrollSave = () => {
      // Ignore transient scroll events while SmoothScrollProvider is restoring scroll on route/popstate transitions
      if (Date.now() - lastNavTransitionTimeRef.current < 350) return;
      if (timeoutId !== null) return;
      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        if (Date.now() - lastNavTransitionTimeRef.current < 350) return;
        if (isDarsHistoryState(window.history.state)) {
          const updated: DarsHistoryState = {
            ...window.history.state,
            scrollY: Math.max(0, Math.round(window.scrollY || 0))
          };
          window.history.replaceState(
            updated,
            '',
            `${window.location.pathname}${window.location.search}`
          );
          historyEntriesRef.current[updated.index] = updated;
        }
      }, 150);
    };

    window.addEventListener('scroll', handleScrollSave, { passive: true });
    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleScrollSave);
    };
  }, []);

  // Resolve route entities when initial Firestore data (blogPosts, courses) finishes loading
  useEffect(() => {
    if (typeof window !== 'undefined' && (blogPosts.length > 0 || courses.length > 0)) {
      const activeRoute: DarsRouteState = isDarsHistoryState(window.history.state)
        ? window.history.state
        : parseUrlToRouteState(window.location.pathname, window.location.search);

      applyRouteToState(activeRoute, blogPosts, courses, isAdmin);
    }
  }, [blogPosts, courses, isAdmin, applyRouteToState]);

  // Recalculate and re-scan newly mounted elements on view transitions and dynamic data loads
  useEffect(() => {
    const timer = setTimeout(() => {
      AOS.refreshHard();
    }, 150);
    return () => clearTimeout(timer);
  }, [currentView, selectedCourse, selectedSession, selectedBlogPost, courses.length, blogPosts.length, loading]);

  // Fetch initial categories, published courses, and blog posts from Cloud Firestore
  const loadData = async (isManualRetry = false, forceRefresh = false) => {
    const bypassCache = isManualRetry || forceRefresh;
    if (isManualRetry) {
      if (!canAttemptRetry(lastDataFetchTimestamp, DEFAULT_RETRY_COOLDOWN_SECONDS)) {
        return;
      }
      setIsRetryingData(true);
    } else if (!forceRefresh) {
      setLoading(true);
    }
    setLastDataFetchTimestamp(Date.now());

    try {
      if (bypassCache) {
        invalidateServicesCache('all');
      }
      const [cats, crss, posts] = await Promise.all([
        getCategories(bypassCache),
        getCourses(false, bypassCache), // published only for main app
        getBlogPosts(false, bypassCache) // published only for public blog
      ]);
      setCategories(cats);
      setCourses(crss);
      setBlogPosts(posts);
      setLoadError(null);

      setSelectedBlogPost(prev => {
        if (!prev) return null;
        return posts.find(p => p.id === prev.id) || prev;
      });
      const isDirectSessionRoute =
        typeof window !== 'undefined' &&
        (window.location.pathname.startsWith('/session/') ||
          new URLSearchParams(window.location.search).has('session') ||
          new URLSearchParams(window.location.search).has('sessionId'));
      setSelectedCourse(prev => {
        if (prev) {
          const updatedCourse = crss.find(c => c.id === prev.id);
          if (updatedCourse) return updatedCourse;
        }
        if (crss.length > 0 && !prev && !isDirectSessionRoute) {
          return crss[0];
        }
        return prev;
      });

      if (bypassCache && selectedCourseRef.current) {
        loadCourseSessions(selectedCourseRef.current.id, false, true);
      }
    } catch (err) {
      console.warn('Initial data load notice / error caught:', err);
      const diag = classifyFirestoreError(err);
      setLoadError(diag);
      // IN-MEMORY RETENTION: categories, courses, and blogPosts are NOT cleared!
    } finally {
      setLoading(false);
      setIsRetryingData(false);
    }
  };

  const handleRetryLoadData = () => {
    loadData(true, true);
  };

  useEffect(() => {
    loadData();
  }, [user?.uid, isAdmin]);

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

  // When selectedCourse changes, fetch its sessions and refresh selectedSession with the latest server version
  const loadCourseSessions = (courseId: string, isManualRetry = false, forceRefresh = false) => {
    const bypassCache = isManualRetry || forceRefresh;
    if (isManualRetry) {
      if (!canAttemptRetry(lastSessionFetchTimestamp, DEFAULT_RETRY_COOLDOWN_SECONDS)) {
        return;
      }
      setIsRetryingSession(true);
    }
    setLastSessionFetchTimestamp(Date.now());

    getSessionsByCourse(courseId, false, bypassCache)
      .then(sessions => {
        setCourseSessions(sessions);
        setSessionError(null);
        setSelectedSession(prev => {
          const nextSession =
            prev && prev.courseId === courseId
              ? sessions.find(s => s.id === prev.id) || (sessions.length > 0 ? sessions[0] : null)
              : sessions.length > 0
              ? sessions[0]
              : null;
          if (nextSession?.quizId) {
            getQuizById(nextSession.quizId).then(q => setSelectedQuiz(q));
          } else if (nextSession) {
            setSelectedQuiz(null);
          }
          return nextSession;
        });
      })
      .catch(err => {
        console.warn('Session load notice:', err);
        const diag = classifyFirestoreError(err);
        setSessionError(diag);
        // IN-MEMORY RETENTION: do not wipe courseSessions!
      })
      .finally(() => {
        setIsRetryingSession(false);
      });
  };

  useEffect(() => {
    if (!selectedCourse) {
      setCourseSessions([]);
      setSessionError(null);
      return;
    }
    loadCourseSessions(selectedCourse.id);
  }, [selectedCourse]);

  // Handlers for navigation
  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    navigateTo({
      view: 'course-detail',
      courseId: course.id
    });
  };

  const handleSelectSession = (session: Session) => {
    setSelectedSession(session);
    if (session.quizId) {
      getQuizById(session.quizId).then(q => setSelectedQuiz(q));
    } else {
      setSelectedQuiz(null);
    }
    navigateTo({
      view: 'session-view',
      courseId: session.courseId || selectedCourse?.id || null,
      sessionId: session.id
    });
  };

  const handleStartQuiz = (quiz: Quiz) => {
    if (!user) {
      openGuestModal(selectedCourse, {
        type: 'quiz',
        courseId: selectedCourse?.id,
        quizId: quiz.id,
        onSuccess: () => {
          setSelectedQuiz(quiz);
          navigateTo({
            view: 'quiz-view',
            courseId: selectedCourse?.id || quiz.courseId || null,
            sessionId: selectedSession?.id || null,
            quizId: quiz.id
          });
        }
      });
      return;
    }
    setSelectedQuiz(quiz);
    navigateTo({
      view: 'quiz-view',
      courseId: selectedCourse?.id || quiz.courseId || null,
      sessionId: selectedSession?.id || null,
      quizId: quiz.id
    });
  };

  const handleSelectBlogPost = (post: BlogPost) => {
    setSelectedBlogPost(post);
    navigateTo({
      view: 'blog-detail',
      blogPostId: post.id,
      blogPostSlug: post.slug
    });
  };

  // Smart in-app Back handlers: pop browser history if previous entry matches target section, else navigate cleanly
  const handleBackOrNavigate = (expectedPrevViews: string[], fallbackRoute: DarsRouteState) => {
    if (typeof window !== 'undefined' && isDarsHistoryState(window.history.state)) {
      const currentState = window.history.state;
      const prevIdx = currentState.index - 1;
      const prevEntry = historyEntriesRef.current[prevIdx];
      const prevView = prevEntry ? prevEntry.view : currentState.prevView;
      const prevIsFallback = prevEntry
        ? Boolean(prevEntry.isFallbackHome)
        : Boolean(currentState.prevIsFallbackHome);
      if (prevView && !prevIsFallback && expectedPrevViews.includes(prevView)) {
        window.history.back();
        return;
      }
    }
    navigateTo(fallbackRoute);
  };

  const handleOpenCertificate = (course: Course) => {
    setCertCourse(course);
    setCertModalOpen(true);
  };

  const handleConfirmLogout = async () => {
    await logout();
    navigateTo({ view: 'home' });
  };

  const routeScrollKey =
    currentView === 'blog-detail'
      ? `blog-detail:${selectedBlogPost?.id || ''}`
      : currentView === 'course-detail'
      ? `course-detail:${selectedCourse?.id || ''}`
      : currentView === 'session-view'
      ? `session-view:${selectedSession?.id || ''}`
      : currentView === 'quiz-view'
      ? `quiz-view:${selectedQuiz?.id || ''}`
      : currentView;

  return (
    <SmoothScrollProvider currentView={routeScrollKey}>
      <div className="min-h-screen bg-[#F8F3E8] dark:bg-[#06251D] text-[#171717] dark:text-[#F8F3E8] font-sans selection:bg-[#D9AC45]/30 selection:text-[#171717] dark:selection:text-[#F8F3E8] transition-colors duration-250">
        {currentView === 'admin-dashboard' && isAdmin ? (
          <AdminDashboard
            initialTab={adminInitialTab}
            onNavigateToSiswa={() => {
              setAdminInitialTab(undefined);
              navigateTo({ view: 'home' });
            }}
            onNavigateToInstructorProfile={() => {
              setAdminInitialTab(undefined);
              navigateTo({ view: 'instructor-profile' });
            }}
            onPreviewBlogPost={(post) => {
              handleSelectBlogPost(post);
            }}
            onRefreshData={() => {
              loadData(false, true);
              loadUserEnrollments();
            }}
          />
        ) : (
          <div className="flex min-h-screen w-full relative overflow-x-clip">
            {/* Left Sidebar Navigation (Desktop Permanent / Mobile Drawer) */}
            <AppSidebar
              currentView={currentView}
              setCurrentView={handleNavigateView}
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
                setCurrentView={handleNavigateView}
                mobileOpen={mobileMenuOpen}
                setMobileOpen={setMobileMenuOpen}
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setIsSidebarCollapsed}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onOpenWelcomeModal={handleOpenWelcomeModal}
              />

              {/* Main Body Router */}
              <main className="flex-1 pb-12 sm:pb-16">
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
                        handleSelectBlogPost(post);
                      }}
                      onExplore={() => {
                        navigateTo({ view: 'courses' });
                      }}
                      onSearch={(query) => {
                        setSearchQuery(query);
                        setFilterCategoryId('all');
                      }}
                      onSelectCategory={(catId) => {
                        setFilterCategoryId(catId);
                        navigateTo({ view: 'courses', filterCategoryId: catId });
                      }}
                      onNavigate={(view, qaId) => {
                        if (qaId) setTargetQaId(qaId);
                        navigateTo({ view, qaId: qaId || null });
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
                      loadError={loadError}
                      onRetry={handleRetryLoadData}
                      isRetrying={isRetryingData}
                      lastAttemptTimestamp={lastDataFetchTimestamp}
                    />
                  )}

                  {/* VIEW 3: COURSE DETAIL */}
                  {currentView === 'course-detail' && (
                    selectedCourse ? (
                      <div className="space-y-4">
                        {sessionError && courseSessions.length > 0 && (
                          <ServiceDisruptionBanner
                            category={sessionError.category}
                            code={sessionError.code}
                            onRetry={() => loadCourseSessions(selectedCourse.id, true)}
                            isRetrying={isRetryingSession}
                            lastAttemptTimestamp={lastSessionFetchTimestamp}
                            mode="banner"
                            hasExistingData={true}
                          />
                        )}
                        {sessionError && courseSessions.length === 0 && (
                          <ServiceDisruptionBanner
                            category={sessionError.category}
                            code={sessionError.code}
                            onRetry={() => loadCourseSessions(selectedCourse.id, true)}
                            isRetrying={isRetryingSession}
                            lastAttemptTimestamp={lastSessionFetchTimestamp}
                            mode="full"
                            hasExistingData={false}
                            customTitle="Sesi Kursus Sedang Tidak Dapat Dimuat"
                          />
                        )}
                        <CourseDetail
                          course={selectedCourse}
                          category={categories.find(c => c.id === selectedCourse.categoryId)}
                          sessions={courseSessions}
                          enrollment={enrollmentsMap[selectedCourse.id] || null}
                          onBack={() =>
                            handleBackOrNavigate(['courses', 'student-dashboard', 'home'], {
                              view: 'courses'
                            })
                          }
                          onSelectSession={handleSelectSession}
                          onOpenCertificate={handleOpenCertificate}
                          onRefreshEnrollment={loadUserEnrollments}
                        />
                      </div>
                    ) : (
                      loadError ? (
                        <div className="max-w-4xl mx-auto px-4 py-12">
                          <ServiceDisruptionBanner
                            category={loadError.category}
                            code={loadError.code}
                            onRetry={handleRetryLoadData}
                            isRetrying={isRetryingData}
                            lastAttemptTimestamp={lastDataFetchTimestamp}
                            mode="full"
                            customTitle="Detail Kursus Tidak Dapat Dimuat"
                          />
                        </div>
                      ) : null
                    )
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
                        onBackToCourse={() =>
                          handleBackOrNavigate(['course-detail', 'courses'], {
                            view: 'course-detail',
                            courseId: selectedCourse.id
                          })
                        }
                        onSelectSession={handleSelectSession}
                        onStartQuiz={handleStartQuiz}
                        onOpenCertificate={handleOpenCertificate}
                        onRefreshEnrollment={loadUserEnrollments}
                      />
                    ) : (
                      (sessionError || loadError) ? (
                        <div className="max-w-4xl mx-auto px-4 py-12">
                          <ServiceDisruptionBanner
                            category={(sessionError || loadError)?.category}
                            code={(sessionError || loadError)?.code}
                            onRetry={() => {
                              if (selectedCourse) {
                                loadCourseSessions(selectedCourse.id, true);
                              } else {
                                handleRetryLoadData();
                              }
                            }}
                            isRetrying={isRetryingSession || isRetryingData}
                            lastAttemptTimestamp={sessionError ? lastSessionFetchTimestamp : lastDataFetchTimestamp}
                            mode="full"
                            customTitle="Tidak Dapat Memuat Sesi Pembelajaran"
                          />
                        </div>
                      ) : (
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
                          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                          <p className="text-sm text-stone-600 dark:text-stone-400 font-medium">
                            Memuat sesi pembelajaran...
                          </p>
                        </div>
                      )
                    )
                  )}

                  {/* VIEW 5: QUIZ VIEW */}
                  {currentView === 'quiz-view' && selectedCourse && selectedQuiz && (
                    <QuizView
                      quiz={selectedQuiz}
                      course={selectedCourse}
                      session={selectedSession || undefined}
                      onBackToSession={() =>
                        handleBackOrNavigate(['session-view'], {
                          view: 'session-view',
                          courseId: selectedCourse.id,
                          sessionId: selectedSession?.id || null
                        })
                      }
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
                        navigateTo({ view: 'courses', filterCategoryId: 'all', searchQuery: '' });
                      }}
                    />
                  )}

                  {/* VIEW 7: BLOG LIST */}
                  {currentView === 'blog' && (
                    <BlogListView
                      posts={blogPosts}
                      loading={loading}
                      onSelectArticle={(article) => {
                        handleSelectBlogPost(article);
                      }}
                      loadError={loadError}
                      onRetry={handleRetryLoadData}
                      isRetrying={isRetryingData}
                      lastAttemptTimestamp={lastDataFetchTimestamp}
                    />
                  )}

                  {/* VIEW 8: BLOG DETAIL */}
                  {currentView === 'blog-detail' && (
                    (selectedBlogPost || blogPosts[0]) ? (
                      <BlogDetailView
                        post={selectedBlogPost || blogPosts[0]}
                        allPosts={blogPosts}
                        onBack={() =>
                          handleBackOrNavigate(['blog', 'home'], {
                            view: 'blog'
                          })
                        }
                        onSelectArticle={(article) => {
                          handleSelectBlogPost(article);
                        }}
                      />
                    ) : (
                      loadError ? (
                        <div className="max-w-4xl mx-auto px-4 py-12">
                          <ServiceDisruptionBanner
                            category={loadError.category}
                            code={loadError.code}
                            onRetry={handleRetryLoadData}
                            isRetrying={isRetryingData}
                            lastAttemptTimestamp={lastDataFetchTimestamp}
                            mode="full"
                            customTitle="Tidak Dapat Memuat Naskah Artikel"
                          />
                        </div>
                      ) : (
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
                          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                          <p className="text-sm text-stone-600 dark:text-stone-400 font-medium">
                            Memuat naskah artikel...
                          </p>
                        </div>
                      )
                    )
                  )}

                  {/* VIEW 9: STUDENT CONSULTATION */}
                  {currentView === 'consultation' && (
                    <StudentConsultationView
                      onNavigateToPublicQA={() => {
                        navigateTo({ view: 'public-qa' });
                      }}
                    />
                  )}

                  {/* VIEW 10: PUBLIC Q&A */}
                  {currentView === 'public-qa' && (
                    <PublicQAView
                      initialQaId={targetQaId}
                      onNavigateToConsultation={() => {
                        navigateTo({ view: 'consultation' });
                      }}
                    />
                  )}

                  {/* VIEW 11: INSTRUCTOR PROFILE */}
                  {currentView === 'instructor-profile' && (
                    <InstructorProfileView
                      onBack={() =>
                        handleBackOrNavigate(['home', 'courses', 'blog', 'public-qa'], {
                          view: 'home'
                        })
                      }
                      onNavigate={(view) => {
                        navigateTo({ view });
                      }}
                      onEditInAdmin={() => {
                        setAdminInitialTab('instructor-profile');
                        navigateTo({ view: 'admin-dashboard' });
                      }}
                    />
                  )}
                </div>
              </main>
            </div>
          </div>
        )}

        {/* Global Modals */}
        <WelcomeModal
          isOpen={welcomeModalOpen && !authModalOpen && !user}
          onClose={handleCloseWelcomeModal}
          onLogin={() => {
            handleCloseWelcomeModal();
            openAuthModal('login');
          }}
        />
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
