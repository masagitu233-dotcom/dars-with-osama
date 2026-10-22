export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Category {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  description: string;
  order: number;
  icon?: string;
  createdAt?: string;
}

export interface Question {
  id: string;
  questionText: string;
  questionTextAr?: string;
  type: 'multiple_choice' | 'true_false';
  options: string[];
  optionsAr?: string[];
  correctAnswerIndex: number; // 0-based
  explanation?: string;
  explanationAr?: string;
  points: number;
}

export interface Quiz {
  id: string;
  sessionId?: string;
  courseId: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  passingScore: number; // Percentage, e.g. 70
  timeLimitMinutes: number; // 0 = no limit
  maxAttempts: number; // 0 = unlimited
  showAnswersAfterSubmit: boolean;
  isPublished: boolean;
  questions: Question[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Session {
  id: string;
  courseId: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr?: string;
  order: number;
  youtubeUrl?: string; // YouTube video URL or ID
  pdfUrl?: string; // Download/view link
  pdfTitle?: string;
  googleDriveUrl?: string; // Link Google Drive PDF jika tersedia
  lessonNotes?: string; // Markdown or formatted text
  durationMinutes?: number;
  isPublished: boolean;
  quizId?: string; // Linked quiz if any
  createdAt?: string;
  updatedAt?: string;
}

export interface Course {
  id: string;
  title: string;
  titleAr: string;
  instructor: string;
  instructorTitle?: string;
  instructorAr?: string;
  categoryId: string;
  level: CourseLevel;
  description: string;
  descriptionAr?: string;
  coverImageUrl: string;
  isPublished: boolean;
  hasCertificate: boolean;
  passingGrade: number; // e.g. 75
  totalDuration?: string; // e.g. '12 Sesi' or '6 Jam'
  order: number;
  sessionsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Enrollment {
  id: string; // `${userId}_${courseId}`
  userId: string;
  courseId: string;
  enrolledAt: string;
  lastSessionId?: string;
  completedSessionIds: string[];
  progressPercent: number;
  isCompleted: boolean;
  completedAt?: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  quizId: string;
  sessionId?: string;
  courseId: string;
  score: number; // percentage (0 - 100)
  passed: boolean;
  totalPoints: number;
  maxPoints: number;
  answers: Record<string, number>; // questionId -> selectedOptionIndex
  submittedAt: string;
  attemptNumber: number;
  timeSpentSeconds?: number;
}

export interface UserProfile {
  id: string; // UID
  email: string;
  displayName: string;
  role: 'admin' | 'student';
  photoURL?: string;
  bio?: string;
  phoneNumber?: string;
  location?: string;
  kunyah?: string;
  preferredLanguage?: 'id' | 'ar';
  createdAt?: string;
  updatedAt?: string;
}

export interface BlogPostAudioConfig {
  enabled?: boolean;
  mode: 'speech' | 'custom';
  customAudioUrl?: string;
  customAudioDuration?: number;
  speechVoiceName?: string;
  speechRate?: number;
}

export interface BlogPost {
  id: string;
  title: string;
  titleAr?: string;
  slug: string;
  excerpt: string;
  content: string; // Formatted HTML / Rich text
  contentAr?: string;
  coverImageUrl: string;
  coverImageCaption?: string;
  category: string;
  tags: string[];
  status: 'published' | 'draft';
  isFeatured?: boolean;
  authorName: string;
  authorPhoto?: string;
  authorRole?: string;
  readingTimeMinutes: number;
  viewsCount?: number;
  audioConfig?: BlogPostAudioConfig;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Consultation {
  id: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  title: string;
  content: string;
  category: 'learning' | 'private';
  status: 'pending' | 'answered' | 'closed';
  replyContent?: string;
  repliedAt?: string;
  repliedBy?: string;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleComment {
  id: string;
  articleId: string;
  authorName: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
  userId?: string;
  moderatedAt?: string;
  moderatedBy?: string;
}

export interface InstructorProfileImage {
  id: string;
  url: string;
  caption?: string;
  order: number;
}

export interface InstructorProfileSection {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  imageCaption?: string;
  order: number;
}

export interface InstructorProfile {
  id: string;
  name: string;
  role: string;
  biography: string;
  title: string;
  mainContent: string;
  photoUrl: string;
  photoCaption?: string;
  supportingImages: InstructorProfileImage[];
  sections: InstructorProfileSection[];
  updatedAt: string;
  updatedBy?: string;
}



