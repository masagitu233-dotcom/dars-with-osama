import { Session, Quiz, QuizAttempt, UserProfile } from '../types/index';

export interface QuizFlowOptions {
  isAdmin?: boolean;
}

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
 * Safely extracts a non-empty string quiz ID, guarding against null, undefined, boolean, or non-string values.
 */
export function extractValidQuizId(quizId: unknown): string | null {
  if (typeof quizId === 'string') {
    const trimmed = quizId.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
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
  const targetQuizId = extractValidQuizId(session?.quizId);

  if (!targetQuizId) {
    return {
      hasQuiz: false,
      status: 'no_quiz',
      attemptsCount: 0,
      passingScore: 70,
      canCompleteSession: true,
      actionLabel: ''
    };
  }

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
 * Verified admins bypass sequential quiz completion locks.
 */
export function canCompleteSession(
  session: Session,
  quiz: Quiz | null | undefined,
  attempts: QuizAttempt[] = [],
  options?: QuizFlowOptions
): { allowed: boolean; reason?: string; status: SessionQuizStatus } {
  const status = evaluateSessionQuizStatus(session, quiz, attempts);

  if (options?.isAdmin === true) {
    return { allowed: true, status };
  }

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
  attempts: QuizAttempt[] = [],
  options?: QuizFlowOptions
): { allowed: boolean; reason?: string; status: SessionQuizStatus } {
  const check = canCompleteSession(currentSession, currentQuiz, attempts, options);
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
 * Verified admins bypass sequential locking (`options.isAdmin === true`).
 */
export function findFirstUncompletedPrecedingQuizSession(
  allSessions: Session[],
  targetSession: Session,
  attempts: QuizAttempt[] = [],
  quizzesMap: Record<string, Quiz> = {},
  options?: QuizFlowOptions
): {
  hasBlockingQuiz: boolean;
  blockingSession?: Session;
  blockingQuiz?: Quiz | null;
  status?: SessionQuizStatus;
  message?: string;
} {
  if (options?.isAdmin === true) {
    return { hasBlockingQuiz: false };
  }

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
    const prevQuizId = extractValidQuizId(prevSession.quizId);
    if (!prevQuizId) {
      continue;
    }
    const quiz = quizzesMap[prevQuizId] || null;
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

/**
 * Determines whether a quiz attempt belongs to an administrator account
 * (either via explicit attempt flags or legacy admin userId/email attribution)
 * so admin quiz activity never pollutes student progress or score statistics.
 */
export function isAdminQuizAttempt(
  attempt: QuizAttempt,
  adminUserIds?: Set<string>,
  adminEmails?: Set<string>
): boolean {
  if (!attempt) return false;
  if (attempt.isAdminAttempt === true || attempt.submitterRole === 'admin') {
    return true;
  }
  if (adminUserIds && attempt.userId && adminUserIds.has(attempt.userId)) {
    return true;
  }
  const cleanEmail = typeof attempt.userEmail === 'string' ? attempt.userEmail.trim().toLowerCase() : '';
  if (cleanEmail && adminEmails && adminEmails.has(cleanEmail)) {
    return true;
  }
  return false;
}

/**
 * Separates raw QuizAttempt records into studentAttempts vs adminAttempts
 * without mutating historical data.
 */
export function separateQuizAttemptsByRole(
  attempts: QuizAttempt[] = [],
  users: UserProfile[] = [],
  platformAdminEmails: string[] = []
): {
  studentAttempts: QuizAttempt[];
  adminAttempts: QuizAttempt[];
  adminUserIds: Set<string>;
  adminEmails: Set<string>;
} {
  const adminUserIds = new Set<string>();
  const adminEmails = new Set<string>();

  for (const email of platformAdminEmails) {
    if (typeof email === 'string' && email.trim().length > 0) {
      adminEmails.add(email.trim().toLowerCase());
    }
  }

  for (const u of users) {
    const cleanEmail = typeof u?.email === 'string' ? u.email.trim().toLowerCase() : '';
    const isUserAdmin = u?.role === 'admin' || (cleanEmail && adminEmails.has(cleanEmail));
    if (isUserAdmin) {
      if (u.id) adminUserIds.add(u.id);
      if (cleanEmail) adminEmails.add(cleanEmail);
    }
  }

  const studentAttempts: QuizAttempt[] = [];
  const adminAttempts: QuizAttempt[] = [];

  for (const att of attempts) {
    if (isAdminQuizAttempt(att, adminUserIds, adminEmails)) {
      adminAttempts.push(att);
    } else {
      studentAttempts.push(att);
    }
  }

  return {
    studentAttempts,
    adminAttempts,
    adminUserIds,
    adminEmails
  };
}

/**
 * Computes aggregate quiz statistics exclusively from student attempts.
 */
export function computeStudentQuizStatistics(
  attempts: QuizAttempt[] = [],
  users: UserProfile[] = [],
  platformAdminEmails: string[] = []
): {
  studentAttempts: QuizAttempt[];
  adminAttempts: QuizAttempt[];
  totalStudentAttempts: number;
  averageScore: number;
  passCount: number;
  passRate: number;
} {
  const { studentAttempts, adminAttempts } = separateQuizAttemptsByRole(
    attempts,
    users,
    platformAdminEmails
  );
  const totalStudentAttempts = studentAttempts.length;
  const averageScore =
    totalStudentAttempts > 0
      ? Math.round(
          studentAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalStudentAttempts
        )
      : 0;
  const passCount = studentAttempts.filter((a) => a.passed).length;
  const passRate =
    totalStudentAttempts > 0 ? Math.round((passCount / totalStudentAttempts) * 100) : 0;

  return {
    studentAttempts,
    adminAttempts,
    totalStudentAttempts,
    averageScore,
    passCount,
    passRate
  };
}
