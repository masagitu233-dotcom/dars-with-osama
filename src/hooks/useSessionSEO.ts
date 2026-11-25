import { useEffect } from 'react';
import { Course, Session } from '../types';
import {
  buildSessionShareData,
  canAccessSessionPublicly
} from '../utils/sessionShareHelper';
import { CANONICAL_SITE_ORIGIN } from '../utils/seoConfig';
import { useGlobalSEO } from './useGlobalSEO';

/**
 * Hook for active learning session view:
 * 1. Keeps clean /session/:id browser history sync while preserving internal navigation state.
 * 2. Delegates document metadata to useGlobalSEO with noindex, nofollow (student-gated video & learning session)
 *    and canonical origin anchored to https://darswithosama.netlify.app.
 */
export function useSessionSEO(session: Session | null, course?: Course | null) {
  useGlobalSEO({
    view: 'session-view',
    course: course || null,
    session: session || null
  });

  useEffect(() => {
    if (!session || !canAccessSessionPublicly(session, course)) {
      return;
    }

    const shareData = buildSessionShareData(session, course, CANONICAL_SITE_ORIGIN);

    // Sync browser address bar cleanly while preserving internal navigation history state
    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      const targetPath = `/session/${encodeURIComponent(session.id)}`;
      const existingState =
        window.history.state && typeof window.history.state === 'object'
          ? window.history.state
          : null;
      if (
        existingState &&
        existingState.__darsNav === true &&
        (window.location.pathname !== targetPath || existingState.sessionId !== session.id)
      ) {
        window.history.replaceState(
          {
            ...existingState,
            __darsNav: true,
            view: 'session-view',
            courseId: course?.id ?? existingState.courseId ?? null,
            sessionId: session.id
          },
          shareData.pageTitle,
          targetPath
        );
      }
    }
  }, [session, course]);
}
