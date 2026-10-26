import { Session, Quiz, QuizAttempt } from '../types/index';

export type SessionQuizStatusType =
  | 'no_quiz'
  | 'not_attempted'
  | 'failed'
  | 'passed';

export interface SessionQuizStatus {
  hasQuiz: boolean;
  quizId?: string;
  status: SessionQuizStatusType;
  bestScore?: number;
  bestAttempt?: QuizAttempt;
  latestAttempt?: QuizAttempt;
  attemptsCount: number;
  passingScore: number;
  canCompleteSession: boolean;
  actionLabel: string;
}

/**
 * Evaluates the quiz status for a given session against a student's past attempts.
 */
export function evaluateSessionQuizStatus(
  session: Session,
  quiz: Quiz | null | undefined,
  attempts: QuizAttempt[] = []
): SessionQuizStatus {
  // If session has no quizId or quiz is explicitly unpublished/empty
  const hasQuizId = Boolean(session.quizId && session.quizId.trim().length > 0);

  if (!hasQuizId) {
    return {
      hasQuiz: false,
      status: 'no_quiz',
      attemptsCount: 0,
      passingScore: 70,
      canCompleteSession: true,
      actionLabel: ''
    };
  }

  const targetQuizId = session.quizId!.trim();
  const passingScore = typeof quiz?.passingScore === 'number' ? quiz.passingScore : 70;

  // Filter attempts belonging to this quiz or this session
  const relevantAttempts = attempts.filter((a) => {
    if (a.quizId === targetQuizId) return true;
    if (a.sessionId && a.sessionId === session.id) return true;
    return false;
  });

  if (relevantAttempts.length === 0) {
    return {
      hasQuiz: true,
      quizId: targetQuizId,
      status: 'not_attempted',
      attemptsCount: 0,
      passingScore,
      canCompleteSession: false,
      actionLabel: 'Kerjakan Kuis'
    };
  }

  // Sort by submittedAt descending to find latest
  const sorted = [...relevantAttempts].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
  const latestAttempt = sorted[0];

  // Best attempt (highest score)
  const bestAttempt = [...relevantAttempts].sort((a, b) => (b.score || 0) - (a.score || 0))[0];
  const bestScore = bestAttempt?.score ?? 0;

  // Check if passed: either explicit flag or score >= passingScore
  const hasPassed = relevantAttempts.some(
    (a) => a.passed === true || (typeof a.score === 'number' && a.score >= passingScore)
  );

  if (hasPassed) {
    return {
      hasQuiz: true,
      quizId: targetQuizId,
      status: 'passed',
      bestScore,
      bestAttempt,
      latestAttempt,
      attemptsCount: relevantAttempts.length,
      passingScore,
      canCompleteSession: true,
      actionLabel: `Kuis Selesai (${bestScore}%)`
    };
  }

  return {
    hasQuiz: true,
    quizId: targetQuizId,
    status: 'failed',
    bestScore,
    bestAttempt,
    latestAttempt,
    attemptsCount: relevantAttempts.length,
    passingScore,
    canCompleteSession: false,
    actionLabel: `Ulangi Kuis (${bestScore}%)`
  };
}

/**
 * Determines whether a session can be marked complete by the user.
 */
export function canCompleteSession(
  session: Session,
  quiz: Quiz | null | undefined,
  attempts: QuizAttempt[] = []
): { allowed: boolean; reason?: string; status: SessionQuizStatus } {
  const status = evaluateSessionQuizStatus(session, quiz, attempts);

  if (!status.hasQuiz) {
    return { allowed: true, status };
  }

  // If quiz is provided but explicitly not published, don't trap student
  if (quiz && quiz.isPublished === false) {
    return { allowed: true, status };
  }

  if (status.status === 'not_attempted') {
    return {
      allowed: false,
      reason: 'Silakan kerjakan kuis sesi ini terlebih dahulu sebelum menyelesaikan pembelajaran.',
      status
    };
  }

  if (status.status === 'failed') {
    return {
      allowed: false,
      reason: `Nilai kuis antum (${status.bestScore}%) belum memenuhi batas kelulusan (${status.passingScore}%). Silakan kerjakan ulang kuis sesi ini terlebih dahulu.`,
      status
    };
  }

  return { allowed: true, status };
}

/**
 * Determines whether the user can advance to the next session.
 */
export function canAdvanceToNextSession(
  currentSession: Session,
  currentQuiz: Quiz | null | undefined,
  attempts: QuizAttempt[] = []
): { allowed: boolean; reason?: string; status: SessionQuizStatus } {
  const check = canCompleteSession(currentSession, currentQuiz, attempts);
  if (!check.allowed) {
    return {
      allowed: false,
      reason:
        check.status.status === 'not_attempted'
          ? 'Silakan kerjakan kuis sesi ini terlebih dahulu sebelum melanjutkan ke sesi berikutnya.'
          : check.reason,
      status: check.status
    };
  }
  return { allowed: true, status: check.status };
}

/**
 * Checks all sessions preceding targetSession (i.e. sessions with order < targetSession.order,
 * or preceding it in the course syllabus) to see if any has an uncompleted or failed quiz.
 * Returns information about the first preceding session that has an uncompleted quiz.
 */
export function findFirstUncompletedPrecedingQuizSession(
  allSessions: Session[],
  targetSession: Session,
  attempts: QuizAttempt[] = [],
  quizzesMap: Record<string, Quiz> = {}
): {
  hasBlockingQuiz: boolean;
  blockingSession?: Session;
  blockingQuiz?: Quiz | null;
  status?: SessionQuizStatus;
  message?: string;
} {
  if (!allSessions || allSessions.length === 0 || !targetSession) {
    return { hasBlockingQuiz: false };
  }

  // Sort sessions by syllabus order
  const sorted = [...allSessions].sort((a, b) => (a.order || 0) - (b.order || 0));
  const targetIdx = sorted.findIndex((s) => s.id === targetSession.id);
  if (targetIdx <= 0) {
    // Target is the first session, or not found in list -> no preceding sessions
    return { hasBlockingQuiz: false };
  }

  const precedingSessions = sorted.slice(0, targetIdx);

  for (const prevSession of precedingSessions) {
    if (!prevSession.quizId || prevSession.quizId.trim().length === 0) {
      continue;
    }
    const quiz = quizzesMap[prevSession.quizId] || null;
    // If quiz is known to be unpublished, do not trap student
    if (quiz && quiz.isPublished === false) {
      continue;
    }

    const status = evaluateSessionQuizStatus(prevSession, quiz, attempts);
    if (!status.canCompleteSession) {
      return {
        hasBlockingQuiz: true,
        blockingSession: prevSession,
        blockingQuiz: quiz,
        status,
        message:
          'Anda masih memiliki kuis yang belum dikerjakan pada sesi sebelumnya. Silakan kerjakan kuis tersebut terlebih dahulu agar dapat melanjutkan pembelajaran.'
      };
    }
  }

  return { hasBlockingQuiz: false };
}
