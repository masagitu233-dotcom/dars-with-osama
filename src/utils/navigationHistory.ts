export interface DarsRouteState {
  view: string;
  courseId?: string | null;
  sessionId?: string | null;
  quizId?: string | null;
  blogPostId?: string | null;
  blogPostSlug?: string | null;
  qaId?: string | null;
  filterCategoryId?: string;
  searchQuery?: string;
}

export interface DarsHistoryState extends DarsRouteState {
  __darsNav: true;
  index: number;
  scrollY: number;
  isFallbackHome?: boolean;
  prevView?: string | null;
  prevIsFallbackHome?: boolean;
}

export type InitialHistorySetup =
  | {
      mode: 'preserve-existing';
      activeState: DarsHistoryState;
      activeUrl: string;
    }
  | {
      mode: 'direct-home';
      activeState: DarsHistoryState;
      activeUrl: string;
    }
  | {
      mode: 'direct-internal-with-fallback';
      fallbackHomeState: DarsHistoryState;
      fallbackUrl: string;
      activeState: DarsHistoryState;
      activeUrl: string;
    };

/**
 * Type guard checking if a browser history.state object was created by Dars with Osama navigation.
 */
export function isDarsHistoryState(state: unknown): state is DarsHistoryState {
  return (
    Boolean(state) &&
    typeof state === 'object' &&
    (state as Record<string, unknown>).__darsNav === true &&
    typeof (state as Record<string, unknown>).view === 'string' &&
    typeof (state as Record<string, unknown>).index === 'number'
  );
}

/**
 * Parses a URL pathname and query string into a normalized DarsRouteState.
 */
export function parseUrlToRouteState(pathname: string, search: string): DarsRouteState {
  const cleanPath = (pathname || '/').trim();
  const params = new URLSearchParams(search || '');

  const urlCourseId = params.get('courseId') || null;
  const urlSessionParam = params.get('session') || params.get('sessionId') || null;
  const urlQuizId = params.get('quizId') || null;
  const urlArticle = params.get('article') || null;
  const urlArticleId = params.get('id') || null;
  const urlQaId = params.get('qaId') || null;
  const urlView = params.get('view') || null;
  const filterCategoryId = params.get('category') || 'all';
  const searchQuery = params.get('q') || '';

  if (cleanPath.startsWith('/session/')) {
    const rawSession = cleanPath.slice('/session/'.length).replace(/\/+$/, '');
    const sessionId = rawSession ? decodeURIComponent(rawSession) : urlSessionParam;
    return {
      view: 'session-view',
      sessionId: sessionId || null,
      courseId: urlCourseId,
      filterCategoryId,
      searchQuery
    };
  }

  if (urlSessionParam || urlView === 'session-view') {
    return {
      view: 'session-view',
      sessionId: urlSessionParam,
      courseId: urlCourseId,
      filterCategoryId,
      searchQuery
    };
  }

  if (cleanPath.startsWith('/article/')) {
    const rawSlug = cleanPath.slice('/article/'.length).replace(/\/+$/, '');
    const decodedSlug = rawSlug ? decodeURIComponent(rawSlug) : null;
    return {
      view: 'blog-detail',
      blogPostSlug: decodedSlug,
      blogPostId: urlArticleId || decodedSlug,
      filterCategoryId,
      searchQuery
    };
  }

  if (urlArticle || urlView === 'blog-detail') {
    const identifier = urlArticle || urlArticleId || null;
    return {
      view: 'blog-detail',
      blogPostSlug: identifier,
      blogPostId: identifier,
      filterCategoryId,
      searchQuery
    };
  }

  if (cleanPath.startsWith('/qa/')) {
    const rawQa = cleanPath.slice('/qa/'.length).replace(/\/+$/, '');
    const decodedQa = rawQa ? decodeURIComponent(rawQa) : urlQaId;
    return {
      view: 'public-qa',
      qaId: decodedQa || null,
      filterCategoryId,
      searchQuery
    };
  }

  if (urlQaId) {
    return {
      view: 'public-qa',
      qaId: urlQaId,
      filterCategoryId,
      searchQuery
    };
  }

  if (urlView === 'course-detail') {
    return {
      view: 'course-detail',
      courseId: urlCourseId,
      filterCategoryId,
      searchQuery
    };
  }

  if (urlView === 'quiz-view') {
    return {
      view: 'quiz-view',
      courseId: urlCourseId,
      sessionId: urlSessionParam,
      quizId: urlQuizId,
      filterCategoryId,
      searchQuery
    };
  }

  if (
    cleanPath === '/profil-pengajar' ||
    cleanPath === '/profil-pengajar/' ||
    cleanPath === '/profil' ||
    cleanPath === '/pengajar' ||
    urlView === 'instructor-profile'
  ) {
    return {
      view: 'instructor-profile',
      filterCategoryId,
      searchQuery
    };
  }

  if (urlView) {
    return {
      view: urlView,
      courseId: urlCourseId,
      sessionId: urlSessionParam,
      quizId: urlQuizId,
      blogPostId: urlArticleId,
      blogPostSlug: urlArticle,
      qaId: urlQaId,
      filterCategoryId,
      searchQuery
    };
  }

  return {
    view: 'home',
    filterCategoryId: 'all',
    searchQuery: ''
  };
}

/**
 * Builds the canonical relative URL (pathname + search) for a given DarsRouteState.
 */
export function buildUrlFromRouteState(route: DarsRouteState): string {
  switch (route.view) {
    case 'home':
      return '/';

    case 'instructor-profile':
      return '/profil-pengajar';

    case 'blog':
      return '/?view=blog';

    case 'blog-detail': {
      if (route.blogPostSlug) {
        return `/article/${encodeURIComponent(route.blogPostSlug)}`;
      }
      if (route.blogPostId) {
        return `/?view=blog-detail&id=${encodeURIComponent(route.blogPostId)}`;
      }
      return '/?view=blog';
    }

    case 'courses': {
      const params = new URLSearchParams();
      params.set('view', 'courses');
      if (route.filterCategoryId && route.filterCategoryId !== 'all') {
        params.set('category', route.filterCategoryId);
      }
      if (route.searchQuery && route.searchQuery.trim()) {
        params.set('q', route.searchQuery.trim());
      }
      return `/?${params.toString()}`;
    }

    case 'course-detail': {
      const params = new URLSearchParams();
      params.set('view', 'course-detail');
      if (route.courseId) {
        params.set('courseId', route.courseId);
      }
      return `/?${params.toString()}`;
    }

    case 'session-view': {
      if (route.sessionId) {
        return `/session/${encodeURIComponent(route.sessionId)}`;
      }
      return '/?view=session-view';
    }

    case 'quiz-view': {
      const params = new URLSearchParams();
      params.set('view', 'quiz-view');
      if (route.courseId) params.set('courseId', route.courseId);
      if (route.sessionId) params.set('sessionId', route.sessionId);
      if (route.quizId) params.set('quizId', route.quizId);
      return `/?${params.toString()}`;
    }

    case 'public-qa': {
      if (route.qaId) {
        return `/qa/${encodeURIComponent(route.qaId)}`;
      }
      return '/?view=public-qa';
    }

    case 'consultation':
      return '/?view=consultation';

    case 'student-dashboard':
      return '/?view=student-dashboard';

    case 'admin-dashboard':
      return '/?view=admin-dashboard';

    default:
      return `/?view=${encodeURIComponent(route.view)}`;
  }
}

/**
 * Checks whether two route states represent the same logical destination so we avoid pushing
 * duplicate consecutive history entries.
 */
export function isSameRouteState(a: DarsRouteState, b: DarsRouteState): boolean {
  if (a.view !== b.view) return false;

  switch (a.view) {
    case 'blog-detail': {
      const aKey = a.blogPostSlug || a.blogPostId || '';
      const bKey = b.blogPostSlug || b.blogPostId || '';
      return aKey === bKey;
    }
    case 'course-detail':
      return (a.courseId || '') === (b.courseId || '');
    case 'session-view':
      return (a.sessionId || '') === (b.sessionId || '');
    case 'quiz-view':
      return (a.quizId || '') === (b.quizId || '');
    case 'public-qa':
      return (a.qaId || '') === (b.qaId || '');
    case 'courses':
      return (
        (a.filterCategoryId || 'all') === (b.filterCategoryId || 'all') &&
        (a.searchQuery || '') === (b.searchQuery || '')
      );
    default:
      return true;
  }
}

/**
 * Computes the initial History API setup when the application boots or refreshes.
 * - If entering directly on an internal page (article, session, Q&A, catalog, etc.) without
 *   existing internal history state, inserts a single fallback Homepage entry at index 0
 *   and pushes the target internal page at index 1 so the first Back press lands on Homepage,
 *   while a second Back press exits naturally without any history trap or loop.
 * - If refreshing an already-initialized page, preserves the existing history index and stack.
 */
export function computeInitialHistorySetup(
  pathname: string,
  search: string,
  existingHistoryState: unknown
): InitialHistorySetup {
  const route = parseUrlToRouteState(pathname, search);
  const currentUrl = `${pathname || '/'}${search || ''}`;

  if (isDarsHistoryState(existingHistoryState)) {
    return {
      mode: 'preserve-existing',
      activeState: {
        ...existingHistoryState,
        ...route,
        __darsNav: true
      },
      activeUrl: currentUrl || buildUrlFromRouteState(route)
    };
  }

  if (route.view === 'home') {
    return {
      mode: 'direct-home',
      activeState: {
        __darsNav: true,
        ...route,
        index: 0,
        scrollY: 0,
        prevView: null,
        prevIsFallbackHome: false
      },
      activeUrl: currentUrl || '/'
    };
  }

  const fallbackHomeState: DarsHistoryState = {
    __darsNav: true,
    view: 'home',
    filterCategoryId: 'all',
    searchQuery: '',
    index: 0,
    scrollY: 0,
    isFallbackHome: true,
    prevView: null,
    prevIsFallbackHome: false
  };

  const activeState: DarsHistoryState = {
    __darsNav: true,
    ...route,
    index: 1,
    scrollY: 0,
    prevView: 'home',
    prevIsFallbackHome: true
  };

  return {
    mode: 'direct-internal-with-fallback',
    fallbackHomeState,
    fallbackUrl: '/',
    activeState,
    activeUrl: currentUrl || buildUrlFromRouteState(route)
  };
}
