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
import { LibraryListView } from './components/library/LibraryListView';
import { LibraryBookDetailView } from './components/library/LibraryBookDetailView';
import { LibraryDetailView } from './components/library/LibraryDetailView';
import { StudentConsultationView } from './components/consultation/StudentConsultationView';
import { PublicQAView } from './components/consultation/PublicQAView';
import { InstructorProfileView } from './components/profile/InstructorProfileView';
import { SearchResultsView } from './components/search/SearchResultsView';
import { UnsubscribePreferencesView } from './components/student/UnsubscribePreferencesView';
import { Course, Category, Session, Quiz, Enrollment, BlogPost, LibraryBook, LibraryBookVolume } from './types';
import { initGlobalAOS, refreshGlobalAOS, refreshHardGlobalAOS } from './utils/aosManager';
import {
  getCategories,
  getCourses,
  getCourseById,
  getSessionsByCourse,
  resolveSessionFromRoute,
  getQuizById,
  getUserEnrollments,
  getBlogPosts,
  getBlogPostBySlug,
  getLibraryBooks,
  getLibraryBookBySlugOrId,
  getLibraryBookVolumes,
  getLibraryBookVolumeById,
  invalidateServicesCache
} from './firebase/services';
import {
  classifyFirestoreError,
  getLatestFirestoreDiagnostic,
  getDataSourceStatus
} from './firebase/config';
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
import { recordLastReadArticle } from './utils/articleHistoryHelper';
import {
  classifyLibraryLoadError,
  LibraryLoadErrorInfo,
  matchLibraryBookByIdentifier,
  filterPublicLibraryVolumes
} from './utils/libraryHelper';

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
  const [selectedLibraryBook, setSelectedLibraryBook] = useState<LibraryBook | null>(null);
  const [selectedLibraryVolume, setSelectedLibraryVolume] = useState<LibraryBookVolume | null>(null);
  const [selectedLibrarySiblingVolumes, setSelectedLibrarySiblingVolumes] = useState<LibraryBookVolume[]>([]);
  const [libraryVolumeResolving, setLibraryVolumeResolving] = useState<boolean>(false);
  const [libraryVolumeNotFound, setLibraryVolumeNotFound] = useState<boolean>(false);
  const [libraryVolumeError, setLibraryVolumeError] = useState<LibraryLoadErrorInfo | null>(null);
  const [libraryBookResolving, setLibraryBookResolving] = useState<boolean>(false);
  const [libraryBookNotFound, setLibraryBookNotFound] = useState<boolean>(false);
  const [libraryBookError, setLibraryBookError] = useState<LibraryLoadErrorInfo | null>(null);
  const [libraryError, setLibraryError] = useState<LibraryLoadErrorInfo | null>(null);
  const [isRetryingLibrary, setIsRetryingLibrary] = useState<boolean>(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  // Certificate Modal State
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certCourse, setCertCourse] = useState<Course | null>(null);
  const [adminInitialTab, setAdminInitialTab] = useState<'dashboard' | 'courses' | 'categories' | 'sessions' | 'quizzes' | 'users' | 'attempts' | 'firebase' | 'blog' | 'library' | 'consultation' | 'comments' | 'instructor-profile' | undefined>(undefined);

  // Welcome & Video Intro Modal State (First visit in session, skipped on direct deep links)
  const [welcomeModalOpen, setWelcomeModalOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      const s = new URLSearchParams(window.location.search);
      if (
        p.startsWith('/session/') ||
        p.startsWith('/article/') ||
        p.startsWith('/library/') ||
        p.startsWith('/qa/') ||
        p === '/library' ||
        p === '/library/' ||
        p === '/perpustakaan' ||
        p === '/perpustakaan/' ||
        p === '/profil-pengajar' ||
        p === '/profil-pengajar/' ||
        p === '/profil' ||
        p === '/pengajar' ||
        p === '/artikel' ||
        p === '/artikel/' ||
        p === '/blog' ||
        p === '/blog/' ||
        p === '/tanya-jawab' ||
        p === '/tanya-jawab/' ||
        p === '/qa' ||
        p === '/qa/' ||
        s.has('session') ||
        s.has('sessionId') ||
        s.has('view') ||
        s.has('article') ||
        s.has('library') ||
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

  // Target direct link QA State & Consultation State
  const [targetQaId, setTargetQaId] = useState<string | null>(null);
  const [targetConsultationId, setTargetConsultationId] = useState<string | null>(null);

  // Initialize Global AOS once at root level (repeatable fade-up across all views & async loads)
  useEffect(() => {
    initGlobalAOS();
  }, []);

  // Search & Filter State
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Loaded Data States
  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseSessions, setCourseSessions] = useState<Session[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [libraryBooks, setLibraryBooks] = useState<LibraryBook[]>([]);
  const [enrollmentsMap, setEnrollmentsMap] = useState<Record<string, Enrollment>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Refresh AOS after async Firebase data loads or desktop sidebar width toggles
  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshGlobalAOS();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [loading, courses.length, blogPosts.length, libraryBooks.length, isSidebarCollapsed]);

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
  const libraryBooksRef = useRef<LibraryBook[]>(libraryBooks);
  libraryBooksRef.current = libraryBooks;
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
  const selectedLibraryBookRef = useRef<LibraryBook | null>(selectedLibraryBook);
  selectedLibraryBookRef.current = selectedLibraryBook;
  const selectedLibraryVolumeRef = useRef<LibraryBookVolume | null>(selectedLibraryVolume);
  selectedLibraryVolumeRef.current = selectedLibraryVolume;
  const selectedQuizRef = useRef<Quiz | null>(selectedQuiz);
  selectedQuizRef.current = selectedQuiz;
  const targetQaIdRef = useRef<string | null>(targetQaId);
  targetQaIdRef.current = targetQaId;
  const targetConsultationIdRef = useRef<string | null>(targetConsultationId);
  targetConsultationIdRef.current = targetConsultationId;
  const selectedGenreRef = useRef<string | null>(selectedGenre);
  selectedGenreRef.current = selectedGenre;

  // Map of internal history index -> DarsHistoryState to inspect previous entry on in-app Back buttons
  const historyEntriesRef = useRef<Record<number, DarsHistoryState>>({});
  const lastNavTransitionTimeRef = useRef<number>(0);

  // Synchronize React entities (selectedBlogPost, selectedLibraryBook, selectedCourse, selectedSession, etc.) with a DarsRouteState
  const applyRouteToState = useCallback(
    (
      route: DarsRouteState,
      postsList: BlogPost[],
      coursesList: Course[],
      adminFlag: boolean,
      booksList: LibraryBook[] = []
    ) => {
      if (route.filterCategoryId !== undefined) {
        setFilterCategoryId(route.filterCategoryId);
      }
      if (route.searchQuery !== undefined) {
        setSearchQuery(route.searchQuery);
      }

      if (route.view === 'search') {
        setCurrentView('search');
        return;
      }

      if (route.view === 'library-detail' || route.view === 'library-read') {
        const targetView = route.view;
        const slugOrId = route.libraryBookSlug || route.libraryBookId;
        const targetVolumeId = targetView === 'library-read' ? route.libraryVolumeId || null : null;
        setLibraryBookNotFound(false);
        setLibraryBookError(null);
        setLibraryVolumeNotFound(false);
        setLibraryVolumeError(null);

        const resolveTargetVolume = (book: LibraryBook) => {
          if (!targetVolumeId) {
            selectedLibraryVolumeRef.current = null;
            setSelectedLibraryVolume(null);
            setLibraryVolumeResolving(false);
            setLibraryVolumeNotFound(false);
            setLibraryVolumeError(null);
            return;
          }

          const currentVol = selectedLibraryVolumeRef.current;
          if (
            currentVol &&
            currentVol.id === targetVolumeId &&
            currentVol.bookId === book.id &&
            (currentVol.status === 'published' || adminFlag)
          ) {
            setLibraryVolumeResolving(false);
            setLibraryVolumeNotFound(false);
            setLibraryVolumeError(null);
            getLibraryBookVolumes(book.id, adminFlag, false)
              .then(vols => {
                setSelectedLibrarySiblingVolumes(adminFlag ? vols : filterPublicLibraryVolumes(vols));
              })
              .catch(() => {});
            return;
          }

          selectedLibraryVolumeRef.current = null;
          setSelectedLibraryVolume(null);
          setLibraryVolumeResolving(true);
          setLibraryVolumeNotFound(false);
          setLibraryVolumeError(null);

          Promise.all([
            getLibraryBookVolumeById(book.id, targetVolumeId, adminFlag),
            getLibraryBookVolumes(book.id, adminFlag, false).catch(() => [] as LibraryBookVolume[])
          ])
            .then(([vol, allVols]) => {
              if (vol && (vol.status === 'published' || adminFlag)) {
                selectedLibraryVolumeRef.current = vol;
                setSelectedLibraryVolume(vol);
                setSelectedLibrarySiblingVolumes(adminFlag ? allVols : filterPublicLibraryVolumes(allVols));
                setLibraryVolumeNotFound(false);
                setLibraryVolumeError(null);
              } else {
                selectedLibraryVolumeRef.current = null;
                setSelectedLibraryVolume(null);
                setLibraryVolumeError(null);
                setLibraryVolumeNotFound(true);
              }
            })
            .catch(err => {
              selectedLibraryVolumeRef.current = null;
              setSelectedLibraryVolume(null);
              setLibraryVolumeNotFound(false);
              setLibraryVolumeError(classifyLibraryLoadError(err, 'volumes'));
            })
            .finally(() => {
              setLibraryVolumeResolving(false);
            });
        };

        if (booksList.length > 0 && slugOrId) {
          const targetBook = matchLibraryBookByIdentifier(booksList, slugOrId);
          if (targetBook && (targetBook.status === 'published' || adminFlag)) {
            setSelectedLibraryBook(targetBook);
            setLibraryBookResolving(false);
            setLibraryBookError(null);
            resolveTargetVolume(targetBook);
            setCurrentView(targetView);
            return;
          }
        }

        if (
          selectedLibraryBookRef.current &&
          slugOrId &&
          matchLibraryBookByIdentifier([selectedLibraryBookRef.current], slugOrId) &&
          (selectedLibraryBookRef.current.status === 'published' || adminFlag)
        ) {
          setLibraryBookResolving(false);
          setLibraryBookError(null);
          resolveTargetVolume(selectedLibraryBookRef.current);
          setCurrentView(targetView);
          return;
        }

        if (slugOrId) {
          setSelectedLibraryBook(null);
          setSelectedLibraryVolume(null);
          setLibraryBookResolving(true);
          getLibraryBookBySlugOrId(slugOrId, adminFlag)
            .then(book => {
              if (book && (book.status === 'published' || adminFlag)) {
                setSelectedLibraryBook(book);
                setLibraryBookNotFound(false);
                setLibraryBookError(null);
                resolveTargetVolume(book);
              } else {
                setSelectedLibraryBook(null);
                setSelectedLibraryVolume(null);
                setLibraryBookError(null);
                setLibraryBookNotFound(true);
              }
            })
            .catch(err => {
              setSelectedLibraryBook(null);
              setSelectedLibraryVolume(null);
              setLibraryBookNotFound(false);
              setLibraryBookError(classifyLibraryLoadError(err));
            })
            .finally(() => {
              setLibraryBookResolving(false);
            });
        } else {
          setLibraryBookResolving(false);
          setSelectedLibraryVolume(null);
          setLibraryBookError(null);
          setLibraryBookNotFound(true);
        }

        setCurrentView(targetView);
        return;
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

      if (route.view === 'consultation') {
        setTargetConsultationId(route.consultationId || null);
        setCurrentView('consultation');
        return;
      }

      if (route.view === 'course-detail') {
        if (route.courseId) {
          const foundCourse = coursesList.find(c => c.id === route.courseId);
          if (foundCourse) {
            setSelectedCourse(foundCourse);
          } else {
            getCourseById(route.courseId).then(c => {
              if (c) setSelectedCourse(c);
            });
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

      if (route.view === 'blog') {
        setSelectedGenre(route.genre || null);
        setCurrentView('blog');
        return;
      }

      setSelectedGenre(null);
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
            libraryBookId: selectedLibraryBookRef.current?.id || null,
            libraryBookSlug: selectedLibraryBookRef.current?.slug || null,
            libraryVolumeId: selectedLibraryVolumeRef.current?.id || null,
            genre: selectedGenreRef.current || null,
            qaId: targetQaIdRef.current || null,
            consultationId: targetConsultationIdRef.current || null,
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
        applyRouteToState(nextRoute, blogPostsRef.current, coursesRef.current, isAdminRef.current, libraryBooksRef.current);
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
        libraryBookId: nextRoute.libraryBookId ?? null,
        libraryBookSlug: nextRoute.libraryBookSlug ?? null,
        libraryVolumeId: nextRoute.libraryVolumeId ?? null,
        genre: nextRoute.genre ?? null,
        qaId: nextRoute.qaId ?? null,
        consultationId: nextRoute.consultationId ?? null,
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

      applyRouteToState(nextState, blogPostsRef.current, coursesRef.current, isAdminRef.current, libraryBooksRef.current);
    },
    [applyRouteToState]
  );

  // Simple view-name navigation adapter for AppSidebar, AppHeader, and Footer
  const handleNavigateView = useCallback(
    (view: string) => {
      navigateTo({
        view,
        filterCategoryId: view === 'courses' ? filterCategoryIdRef.current : 'all',
        searchQuery: view === 'courses' || view === 'search' ? searchQueryRef.current : ''
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
        isAdminRef.current,
        libraryBooksRef.current
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

  // Resolve direct Library deep links (/library/:slug and /library/:slug/baca) immediately on mount
  // without waiting for auth, courses, or blogPosts to finish loading
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const initialRoute: DarsRouteState = isDarsHistoryState(window.history.state)
      ? window.history.state
      : parseUrlToRouteState(window.location.pathname, window.location.search);

    if (initialRoute.view === 'library-detail' || initialRoute.view === 'library-read') {
      applyRouteToState(
        initialRoute,
        blogPostsRef.current,
        coursesRef.current,
        isAdminRef.current,
        libraryBooksRef.current
      );
    }
  }, [applyRouteToState]);

  // Resolve route entities when initial Firestore data (blogPosts, courses, libraryBooks) finishes loading
  useEffect(() => {
    if (typeof window !== 'undefined' && (blogPosts.length > 0 || courses.length > 0 || libraryBooks.length > 0)) {
      const activeRoute: DarsRouteState = isDarsHistoryState(window.history.state)
        ? window.history.state
        : parseUrlToRouteState(window.location.pathname, window.location.search);

      applyRouteToState(activeRoute, blogPosts, courses, isAdmin, libraryBooks);
    }
  }, [blogPosts, courses, libraryBooks, isAdmin, applyRouteToState]);

  // Recalculate and re-scan newly mounted elements on view transitions and dynamic data loads
  useEffect(() => {
    const timer = setTimeout(() => {
      refreshHardGlobalAOS();
    }, 120);
    return () => clearTimeout(timer);
  }, [currentView, selectedCourse, selectedSession, selectedBlogPost, selectedLibraryBook, selectedLibraryVolume, courses.length, blogPosts.length, libraryBooks.length, loading]);

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
      let libraryLoadErr: LibraryLoadErrorInfo | null = null;
      const [cats, crss, posts, books] = await Promise.all([
        getCategories(bypassCache),
        getCourses(isAdmin, bypassCache), // admins can view all courses including drafts
        getBlogPosts(false, bypassCache), // published only for public blog
        getLibraryBooks(false, bypassCache).catch(err => {
          console.warn('Public library load error:', err);
          libraryLoadErr = classifyLibraryLoadError(err);
          return null as LibraryBook[] | null;
        })
      ]);
      setCategories(cats);
      setCourses(crss);
      setBlogPosts(posts);
      if (books !== null) {
        setLibraryBooks(books);
        setLibraryError(null);
      } else {
        setLibraryError(libraryLoadErr);
      }

      const sourceStatus = getDataSourceStatus();
      const latestDiag = getLatestFirestoreDiagnostic();
      if (sourceStatus.isUsingFallback && latestDiag) {
        setLoadError({
          category: latestDiag.category,
          summary: latestDiag.summary,
          code: latestDiag.code
        });
      } else {
        setLoadError(null);
      }

      setSelectedBlogPost(prev => {
        if (!prev) return null;
        return posts.find(p => p.id === prev.id) || prev;
      });
      if (books !== null) {
        setSelectedLibraryBook(prev => {
          if (!prev) return null;
          return books.find(b => b.id === prev.id) || prev;
        });
      }
      const isDirectSessionRoute =
        typeof window !== 'undefined' &&
        (window.location.pathname.startsWith('/session/') ||
          new URLSearchParams(window.location.search).has('session') ||
          new URLSearchParams(window.location.search).has('sessionId'));

      const directRouteCourseId = typeof window !== 'undefined'
        ? parseUrlToRouteState(window.location.pathname, window.location.search)?.courseId
        : null;

      setSelectedCourse(prev => {
        if (directRouteCourseId) {
          const directMatched = crss.find(c => c.id === directRouteCourseId);
          if (directMatched) return directMatched;
        }
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

  const handleRetryLoadLibrary = async () => {
    setIsRetryingLibrary(true);
    try {
      invalidateServicesCache('library');
      const books = await getLibraryBooks(false, true);
      setLibraryBooks(books);
      setLibraryError(null);
    } catch (err) {
      console.warn('Retry public library load error:', err);
      setLibraryError(classifyLibraryLoadError(err));
    } finally {
      setIsRetryingLibrary(false);
    }
  };

  const handleRetryResolveLibraryBook = () => {
    if (typeof window === 'undefined') return;
    invalidateServicesCache('library');
    selectedLibraryVolumeRef.current = null;
    setSelectedLibraryVolume(null);
    setLibraryVolumeError(null);
    setLibraryVolumeNotFound(false);
    const activeRoute: DarsRouteState = isDarsHistoryState(window.history.state)
      ? window.history.state
      : parseUrlToRouteState(window.location.pathname, window.location.search);
    applyRouteToState(activeRoute, blogPostsRef.current, coursesRef.current, isAdminRef.current, []);
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

    getSessionsByCourse(courseId, isAdminRef.current, bypassCache)
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
  }, [selectedCourse, isAdmin]);

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

  const handleStartQuiz = (quiz: Quiz, session?: Session) => {
    const targetSession = session || selectedSession;
    if (!user) {
      openGuestModal(selectedCourse, {
        type: 'quiz',
        courseId: selectedCourse?.id || quiz.courseId,
        sessionId: targetSession?.id || quiz.sessionId,
        quizId: quiz.id,
        onSuccess: () => {
          setSelectedQuiz(quiz);
          if (targetSession) setSelectedSession(targetSession);
          navigateTo({
            view: 'quiz-view',
            courseId: selectedCourse?.id || quiz.courseId || null,
            sessionId: targetSession?.id || quiz.sessionId || null,
            quizId: quiz.id
          });
        }
      });
      return;
    }
    setSelectedQuiz(quiz);
    if (targetSession) setSelectedSession(targetSession);
    navigateTo({
      view: 'quiz-view',
      courseId: selectedCourse?.id || quiz.courseId || null,
      sessionId: targetSession?.id || quiz.sessionId || null,
      quizId: quiz.id
    });
  };

  const handleSelectBlogPost = (post: BlogPost) => {
    recordLastReadArticle(post.id);
    setSelectedBlogPost(post);
    navigateTo({
      view: 'blog-detail',
      blogPostId: post.id,
      blogPostSlug: post.slug
    });
  };

  const handleSelectLibraryBook = (book: LibraryBook) => {
    selectedLibraryBookRef.current = book;
    selectedLibraryVolumeRef.current = null;
    setSelectedLibraryBook(book);
    setSelectedLibraryVolume(null);
    setLibraryVolumeNotFound(false);
    setLibraryVolumeError(null);
    setLibraryVolumeResolving(false);
    setLibraryBookNotFound(false);
    setLibraryBookError(null);
    setLibraryBookResolving(false);
    navigateTo({
      view: 'library-detail',
      libraryBookId: book.id,
      libraryBookSlug: book.slug,
      libraryVolumeId: null
    });
  };

  const handleOpenLibraryReader = (book: LibraryBook) => {
    selectedLibraryBookRef.current = book;
    selectedLibraryVolumeRef.current = null;
    setSelectedLibraryBook(book);
    setSelectedLibraryVolume(null);
    setLibraryVolumeNotFound(false);
    setLibraryVolumeError(null);
    setLibraryVolumeResolving(false);
    setLibraryBookNotFound(false);
    setLibraryBookError(null);
    setLibraryBookResolving(false);
    navigateTo({
      view: 'library-read',
      libraryBookId: book.id,
      libraryBookSlug: book.slug,
      libraryVolumeId: null
    });
  };

  const handleOpenLibraryVolumeReader = (
    book: LibraryBook,
    volume: LibraryBookVolume,
    siblingVolumes?: LibraryBookVolume[]
  ) => {
    selectedLibraryBookRef.current = book;
    selectedLibraryVolumeRef.current = volume;
    setSelectedLibraryBook(book);
    setSelectedLibraryVolume(volume);
    if (Array.isArray(siblingVolumes)) {
      setSelectedLibrarySiblingVolumes(siblingVolumes);
    }
    setLibraryBookNotFound(false);
    setLibraryBookError(null);
    setLibraryBookResolving(false);
    setLibraryVolumeNotFound(false);
    setLibraryVolumeError(null);
    setLibraryVolumeResolving(false);
    navigateTo({
      view: 'library-read',
      libraryBookId: book.id,
      libraryBookSlug: book.slug,
      libraryVolumeId: volume.id
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
    invalidateServicesCache('all');
    selectedLibraryBookRef.current = null;
    selectedLibraryVolumeRef.current = null;
    setSelectedLibraryBook(null);
    setSelectedLibraryVolume(null);
    setSelectedLibrarySiblingVolumes([]);
    setLibraryVolumeError(null);
    navigateTo({ view: 'home' });
  };

  const routeScrollKey =
    currentView === 'blog-detail'
      ? `blog-detail:${selectedBlogPost?.id || ''}`
      : currentView === 'library-detail'
      ? `library-detail:${selectedLibraryBook?.id || ''}`
      : currentView === 'library-read'
      ? `library-read:${selectedLibraryBook?.id || ''}:${selectedLibraryVolume?.id || ''}`
      : currentView === 'blog'
      ? `blog:${selectedGenre || 'catalog'}`
      : currentView === 'course-detail'
      ? `course-detail:${selectedCourse?.id || ''}`
      : currentView === 'session-view'
      ? `session-view:${selectedSession?.id || ''}`
      : currentView === 'quiz-view'
      ? `quiz-view:${selectedQuiz?.id || ''}`
      : currentView;

  const getPageBackgroundClass = () => {
    switch (currentView) {
      case 'course-detail':
      case 'session-view':
      case 'quiz-view':
        return 'bg-[#0F3D3A] text-[#FFF5E9]';
      case 'blog-detail':
        return 'bg-white sm:bg-[#6C151E] text-[#171717] sm:text-[#FFF5E9]';
      case 'library-detail':
      case 'library-read':
        return 'bg-white sm:bg-[#FAF7F0] dark:bg-[#0D2B36] text-[#171717] dark:text-[#CEFEF1]';
      case 'public-qa':
      case 'consultation':
        return 'bg-[#F5DABF] text-[#0F3D3A]';
      default:
        return 'bg-neo-grid text-[#171717] dark:text-[#CEFEF1]';
    }
  };

  return (
    <SmoothScrollProvider currentView={routeScrollKey}>
      <div className={`min-h-screen font-sans selection:bg-[#4CA7A1]/30 selection:text-[#171717] transition-colors duration-250 ${getPageBackgroundClass()}`}>
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
            onPreviewLibraryBook={(book) => {
              handleSelectLibraryBook(book);
            }}
            onPreviewQuiz={async (quiz, courseList, sessionsMap) => {
              const matchedCourse =
                courseList.find(c => c.id === quiz.courseId) ||
                courses.find(c => c.id === quiz.courseId) ||
                (quiz.courseId ? await getCourseById(quiz.courseId) : null);
              if (matchedCourse) {
                setSelectedCourse(matchedCourse);
                const courseSessionsList = sessionsMap[matchedCourse.id] || [];
                if (courseSessionsList.length > 0) {
                  setCourseSessions(courseSessionsList);
                }
                const matchedSession = courseSessionsList.find(
                  s => s.id === quiz.sessionId || s.quizId === quiz.id
                );
                handleStartQuiz(quiz, matchedSession);
              }
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
              isSidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-[232px]'
            }`}>
              {/* Top Page Header */}
              <AppHeader
                currentView={currentView}
                setCurrentView={handleNavigateView}
                mobileOpen={mobileMenuOpen}
                setMobileOpen={setMobileMenuOpen}
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setIsSidebarCollapsed}
                onOpenWelcomeModal={handleOpenWelcomeModal}
              />

              {/* Main Body Router */}
              <main className="flex-1 pb-10 sm:pb-12">
                {isAdmin && loadError && currentView === 'home' && (
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
                    <ServiceDisruptionBanner
                      category={loadError.category}
                      code={loadError.code}
                      onRetry={handleRetryLoadData}
                      isRetrying={isRetryingData}
                      lastAttemptTimestamp={lastDataFetchTimestamp}
                      mode="banner"
                      hasExistingData={true}
                      customTitle={
                        loadError.category === 'resource-exhausted'
                          ? 'Mode Cadangan Aktif (Kuota Baca Harian Firestore Tercapai)'
                          : undefined
                      }
                      customMessage={loadError.summary}
                    />
                  </div>
                )}
                <div key={currentView} className="animate-fade-in">
                  {/* VIEW 1: HOME */}
                  {currentView === 'home' && (
                    <HomeView
                      categories={categories}
                      courses={courses}
                      blogPosts={blogPosts}
                      libraryBooks={libraryBooks}
                      enrollmentsMap={enrollmentsMap}
                      onSelectCourse={handleSelectCourse}
                      onSelectBlogPost={(post) => {
                        handleSelectBlogPost(post);
                      }}
                      onSelectLibraryBook={(book) => {
                        handleSelectLibraryBook(book);
                      }}
                      onExplore={() => {
                        navigateTo({ view: 'courses' });
                      }}
                      onSearch={(query) => {
                        const clean = query.trim();
                        setSearchQuery(clean);
                        setFilterCategoryId('all');
                        navigateTo({ view: 'search', searchQuery: clean });
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
                          onStartQuiz={handleStartQuiz}
                        />
                      </div>
                    ) : (
                      loadError && isAdmin ? (
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
                      ) : (
                        <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
                          <div className="nb-card p-8 space-y-3">
                            <h3 className="text-lg font-bold font-serif text-[#171717] dark:text-[#CEFEF1]">
                              Detail Kursus Tidak Tersedia
                            </h3>
                            <p className="text-xs text-[#525855] dark:text-[#A6D6C9]">
                              Materi kursus yang Anda cari tidak ditemukan atau sedang diproses.
                            </p>
                            <button
                              onClick={() => handleBackOrNavigate(['courses'], { view: 'courses' })}
                              className="nb-btn nb-btn-primary px-4 py-2 text-xs"
                            >
                              Kembali ke Katalog Kursus
                            </button>
                          </div>
                        </div>
                      )
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
                      (sessionError || loadError) && isAdmin ? (
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
                      selectedGenre={selectedGenre}
                      onSelectGenre={(genre) => {
                        navigateTo({
                          view: 'blog',
                          genre: genre || null
                        });
                      }}
                      onBackToCatalog={() => {
                        handleBackOrNavigate(['blog'], {
                          view: 'blog',
                          genre: null
                        });
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
                      loadError && isAdmin ? (
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

                  {/* VIEW 8B: LIBRARY DIGITAL CATALOG */}
                  {currentView === 'library' && (
                    <LibraryListView
                      books={libraryBooks}
                      loading={loading}
                      error={libraryError}
                      retrying={isRetryingLibrary}
                      onRetry={handleRetryLoadLibrary}
                      onSelectBook={(book) => {
                        handleSelectLibraryBook(book);
                      }}
                    />
                  )}

                  {/* VIEW 8C: LIBRARY DIGITAL BOOK DETAIL PAGE (/library/:slug) */}
                  {currentView === 'library-detail' && (
                    selectedLibraryBook ? (
                      <LibraryBookDetailView
                        book={selectedLibraryBook}
                        onBack={() =>
                          handleBackOrNavigate(['library', 'home'], {
                            view: 'library'
                          })
                        }
                        onOpenReader={(book) => {
                          handleOpenLibraryReader(book);
                        }}
                        onOpenVolumeReader={(book, volume, visibleVolumes) => {
                          handleOpenLibraryVolumeReader(book, volume, visibleVolumes);
                        }}
                      />
                    ) : libraryBookError && !libraryBookResolving ? (
                      <div
                        data-testid="library-book-detail-error"
                        data-error-category={libraryBookError.category}
                        className="max-w-xl mx-auto px-4 py-14 text-center"
                      >
                        <div className="nb-card bg-white dark:bg-[#0D2B36] p-8 space-y-4">
                          <h2 className="text-lg font-bold font-serif text-[#171717] dark:text-[#CEFEF1]">
                            {libraryBookError.title}
                          </h2>
                          <p className="text-xs sm:text-sm text-[#525855] dark:text-[#A6D6C9] leading-relaxed">
                            {libraryBookError.message}
                          </p>
                          <p className="text-[11px] font-mono text-[#525855]/80 dark:text-[#A6D6C9]/80">
                            Kode: {libraryBookError.code}
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                            <button
                              type="button"
                              onClick={handleRetryResolveLibraryBook}
                              className="nb-btn nb-btn-primary px-5 py-2.5 text-xs cursor-pointer"
                            >
                              Coba Muat Ulang
                            </button>
                            <button
                              type="button"
                              onClick={() => navigateTo({ view: 'library' })}
                              className="nb-btn nb-btn-secondary px-5 py-2.5 text-xs cursor-pointer"
                            >
                              Kembali ke Library Digital
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : libraryBookNotFound && !libraryBookResolving ? (
                      <div className="max-w-xl mx-auto px-4 py-14 text-center">
                        <div className="nb-card bg-white dark:bg-[#0D2B36] p-8 space-y-4">
                          <h2 className="text-lg font-bold font-serif text-[#171717] dark:text-[#CEFEF1]">
                            Kitab Tidak Ditemukan
                          </h2>
                          <p className="text-xs sm:text-sm text-[#525855] dark:text-[#A6D6C9] leading-relaxed">
                            Halaman detail kitab yang Anda cari tidak tersedia atau belum dipublikasikan.
                          </p>
                          <button
                            type="button"
                            onClick={() => navigateTo({ view: 'library' })}
                            className="nb-btn nb-btn-primary px-5 py-2.5 text-xs cursor-pointer"
                          >
                            Kembali ke Library Digital
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
                        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm text-stone-600 dark:text-stone-400 font-medium">
                          Memuat detail kitab...
                        </p>
                      </div>
                    )
                  )}

                  {/* VIEW 8D: LIBRARY DIGITAL INTERNAL BOOK / VOLUME READER (/library/:slug/baca or /library/:slug/jilid/:volumeId) */}
                  {currentView === 'library-read' && (
                    selectedLibraryBook ? (
                      libraryVolumeResolving ? (
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
                          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                          <p className="text-sm text-stone-600 dark:text-stone-400 font-medium">
                            Memuat naskah jilid kitab...
                          </p>
                        </div>
                      ) : libraryVolumeError ? (
                        <div
                          data-testid="library-volume-reader-error"
                          data-error-category={libraryVolumeError.category}
                          className="max-w-xl mx-auto px-4 py-14 text-center"
                        >
                          <div className="nb-card bg-white dark:bg-[#0D2B36] p-8 space-y-4">
                            <h2 className="text-lg font-bold font-serif text-[#171717] dark:text-[#CEFEF1]">
                              {libraryVolumeError.title}
                            </h2>
                            <p className="text-xs sm:text-sm text-[#525855] dark:text-[#A6D6C9] leading-relaxed">
                              {libraryVolumeError.message}
                            </p>
                            <p className="text-[11px] font-mono text-[#525855]/80 dark:text-[#A6D6C9]/80">
                              Kode: {libraryVolumeError.code}
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                              <button
                                type="button"
                                onClick={handleRetryResolveLibraryBook}
                                className="nb-btn nb-btn-primary px-5 py-2.5 text-xs cursor-pointer"
                              >
                                Coba Muat Ulang
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelectLibraryBook(selectedLibraryBook)}
                                className="nb-btn nb-btn-secondary px-5 py-2.5 text-xs cursor-pointer"
                              >
                                Lihat Daftar Jilid
                              </button>
                              <button
                                type="button"
                                onClick={() => navigateTo({ view: 'library' })}
                                className="nb-btn nb-btn-secondary px-5 py-2.5 text-xs cursor-pointer"
                              >
                                Kembali ke Library Digital
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : libraryVolumeNotFound ? (
                        <div className="max-w-xl mx-auto px-4 py-14 text-center">
                          <div className="nb-card bg-white dark:bg-[#0D2B36] p-8 space-y-4">
                            <h2 className="text-lg font-bold font-serif text-[#171717] dark:text-[#CEFEF1]">
                              Jilid Kitab Tidak Ditemukan
                            </h2>
                            <p className="text-xs sm:text-sm text-[#525855] dark:text-[#A6D6C9] leading-relaxed">
                              Jilid yang Anda cari tidak tersedia atau belum dipublikasikan untuk umum.
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                              <button
                                type="button"
                                onClick={() => handleSelectLibraryBook(selectedLibraryBook)}
                                className="nb-btn nb-btn-primary px-5 py-2.5 text-xs cursor-pointer"
                              >
                                Lihat Daftar Jilid
                              </button>
                              <button
                                type="button"
                                onClick={() => navigateTo({ view: 'library' })}
                                className="nb-btn nb-btn-secondary px-5 py-2.5 text-xs cursor-pointer"
                              >
                                Kembali ke Library Digital
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <LibraryDetailView
                          book={selectedLibraryBook}
                          volume={selectedLibraryVolume}
                          siblingVolumes={selectedLibrarySiblingVolumes}
                          onSelectVolume={(vol) => {
                            handleOpenLibraryVolumeReader(selectedLibraryBook, vol, selectedLibrarySiblingVolumes);
                          }}
                          onBackToDetail={() =>
                            handleBackOrNavigate(['library-detail'], {
                              view: 'library-detail',
                              libraryBookId: selectedLibraryBook.id,
                              libraryBookSlug: selectedLibraryBook.slug
                            })
                          }
                          onBack={() =>
                            handleBackOrNavigate(['library', 'home'], {
                              view: 'library'
                            })
                          }
                        />
                      )
                    ) : libraryBookError && !libraryBookResolving ? (
                      <div
                        data-testid="library-book-reader-error"
                        data-error-category={libraryBookError.category}
                        className="max-w-xl mx-auto px-4 py-14 text-center"
                      >
                        <div className="nb-card bg-white dark:bg-[#0D2B36] p-8 space-y-4">
                          <h2 className="text-lg font-bold font-serif text-[#171717] dark:text-[#CEFEF1]">
                            {libraryBookError.title}
                          </h2>
                          <p className="text-xs sm:text-sm text-[#525855] dark:text-[#A6D6C9] leading-relaxed">
                            {libraryBookError.message}
                          </p>
                          <p className="text-[11px] font-mono text-[#525855]/80 dark:text-[#A6D6C9]/80">
                            Kode: {libraryBookError.code}
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                            <button
                              type="button"
                              onClick={handleRetryResolveLibraryBook}
                              className="nb-btn nb-btn-primary px-5 py-2.5 text-xs cursor-pointer"
                            >
                              Coba Muat Ulang
                            </button>
                            <button
                              type="button"
                              onClick={() => navigateTo({ view: 'library' })}
                              className="nb-btn nb-btn-secondary px-5 py-2.5 text-xs cursor-pointer"
                            >
                              Kembali ke Library Digital
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : libraryBookNotFound && !libraryBookResolving ? (
                      <div className="max-w-xl mx-auto px-4 py-14 text-center">
                        <div className="nb-card bg-white dark:bg-[#0D2B36] p-8 space-y-4">
                          <h2 className="text-lg font-bold font-serif text-[#171717] dark:text-[#CEFEF1]">
                            Naskah Kitab Tidak Ditemukan
                          </h2>
                          <p className="text-xs sm:text-sm text-[#525855] dark:text-[#A6D6C9] leading-relaxed">
                            Naskah baca internal yang Anda cari tidak tersedia atau belum dipublikasikan.
                          </p>
                          <button
                            type="button"
                            onClick={() => navigateTo({ view: 'library' })}
                            className="nb-btn nb-btn-primary px-5 py-2.5 text-xs cursor-pointer"
                          >
                            Kembali ke Library Digital
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
                        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm text-stone-600 dark:text-stone-400 font-medium">
                          Memuat naskah kitab...
                        </p>
                      </div>
                    )
                  )}

                  {/* VIEW 9: STUDENT CONSULTATION */}
                  {currentView === 'consultation' && (
                    <StudentConsultationView
                      initialConsultationId={targetConsultationId}
                      onNavigateToPublicQA={() => {
                        navigateTo({ view: 'public-qa' });
                      }}
                      onSelectConsultation={(cId) => {
                        setTargetConsultationId(cId);
                        if (cId) {
                          navigateTo({ view: 'consultation', consultationId: cId });
                        } else {
                          navigateTo({ view: 'consultation' });
                        }
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

                  {/* VIEW 12: SEARCH RESULTS */}
                  {currentView === 'search' && (
                    <SearchResultsView
                      query={searchQuery}
                      courses={courses}
                      categories={categories}
                      blogPosts={blogPosts}
                      onSelectCourse={handleSelectCourse}
                      onSelectSession={(course, session) => {
                        setSelectedCourse(course);
                        setSelectedSession(session);
                        loadCourseSessions(course.id, false, false);
                        navigateTo({
                          view: 'session-view',
                          courseId: course.id,
                          sessionId: session.id
                        });
                      }}
                      onSelectBlogPost={(post) => {
                        handleSelectBlogPost(post);
                      }}
                      onSelectQA={(qaId) => {
                        setTargetQaId(qaId);
                        navigateTo({ view: 'public-qa', qaId });
                      }}
                      onBackToHome={() => {
                        navigateTo({ view: 'home' });
                      }}
                      onExploreCourses={() => {
                        navigateTo({ view: 'courses' });
                      }}
                      onExploreBlog={() => {
                        navigateTo({ view: 'blog' });
                      }}
                      onSearchChange={(newQuery) => {
                        setSearchQuery(newQuery);
                        navigateTo({ view: 'search', searchQuery: newQuery });
                      }}
                    />
                  )}

                  {/* VIEW 13: UNSUBSCRIBE & NOTIFICATION PREFERENCES */}
                  {currentView === 'unsubscribe' && (
                    <UnsubscribePreferencesView
                      onBackToHome={() => navigateTo({ view: 'home' })}
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
