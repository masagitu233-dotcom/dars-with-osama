import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  BookOpen,
  Layers,
  Video,
  HelpCircle,
  Users,
  Settings,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Upload,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Award,
  Database,
  Search,
  Loader2,
  FileText,
  ChevronRight,
  ChevronDown,
  Download,
  BarChart2,
  Eye,
  LogOut,
  Sun,
  Moon,
  Sparkles,
  Filter,
  Check,
  Play,
  Clock,
  GraduationCap,
  FolderOpen,
  FileQuestion
} from 'lucide-react';
import { Category, Course, Session, Quiz, Question, UserProfile, QuizAttempt, BlogPost } from '../../types';
import {
  getCategories,
  saveCategory,
  deleteCategory,
  seedDefaultCategoriesIfEmpty,
  getCourses,
  saveCourse,
  deleteCourse,
  getSessionsByCourse,
  saveSession,
  deleteSession,
  getAllQuizzes,
  saveQuiz,
  deleteQuiz,
  getAllUsers,
  getAllQuizAttempts,
  uploadFileToStorage,
  seedInitialDatabase,
  deleteSeedDummyDataFromFirestore,
  getQuizById,
  getBlogPosts,
  seedDefaultBlogPostsIfEmpty,
  invalidateServicesCache
} from '../../firebase/services';
import { firebaseConfig, getLatestFirestoreDiagnostic, getDataSourceStatus, ensureFreshFirestoreAuthToken } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ConfirmModal } from '../common/ConfirmModal';
import { Logo, LogoSymbol } from '../common/Logo';
import { YouTubeEmbed } from '../common/YouTubeEmbed';
import { AdminBlogManager } from './AdminBlogManager';
import { AdminConsultationManager } from './AdminConsultationManager';
import { AdminCommentsManager } from './AdminCommentsManager';
import { AdminInstructorProfileManager } from './AdminInstructorProfileManager';
import { RichTextEditor } from './RichTextEditor';
import { QuizImportModal } from './QuizImportModal';
import { MessageSquare, UserCheck } from 'lucide-react';
import { getAllArticleCommentsForAdmin } from '../../firebase/services';
import { auditBrowserStorageEntries } from '../../utils/dataAuditHelper';

export const AdminDashboard: React.FC<{
  initialCourseId?: string;
  initialTab?: 'dashboard' | 'courses' | 'categories' | 'sessions' | 'quizzes' | 'users' | 'attempts' | 'firebase' | 'blog' | 'consultation' | 'comments' | 'instructor-profile';
  autoOpenAddSession?: boolean;
  onClearAutoOpen?: () => void;
  onNavigateToSiswa?: () => void;
  onNavigateToInstructorProfile?: () => void;
  onPreviewBlogPost?: (post: BlogPost) => void;
  onRefreshData: () => void;
}> = ({
  initialCourseId,
  initialTab,
  autoOpenAddSession,
  onClearAutoOpen,
  onNavigateToSiswa,
  onNavigateToInstructorProfile,
  onPreviewBlogPost,
  onRefreshData
}) => {
  const { user, userProfile, isAdmin, openLogoutConfirmModal } = useAuth();
  const { theme, effectiveTheme, setTheme } = useTheme();

  // Active Menu / Tab in Sidebar
  const [activeTab, setActiveTab] = useState<'dashboard' | 'courses' | 'categories' | 'sessions' | 'quizzes' | 'users' | 'attempts' | 'firebase' | 'blog' | 'consultation' | 'comments' | 'instructor-profile'>(initialTab || 'dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');

  // Comments state for badge & filtering
  const [commentsCount, setCommentsCount] = useState<number>(0);
  const [pendingCommentsCount, setPendingCommentsCount] = useState<number>(0);
  const [selectedArticleIdForComments, setSelectedArticleIdForComments] = useState<string>('all');

  // Keyboard Escape listener to close drawer on mobile/tablet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  // Window resize listener: automatically close mobile drawer when switching to desktop screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allSessionsMap, setAllSessionsMap] = useState<Record<string, Session[]>>({});
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selected course for managing sessions tab
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId || '');
  const [courseSessions, setCourseSessions] = useState<Session[]>([]);
  const [savingSession, setSavingSession] = useState(false);

  // Modal / Form editing states
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);

  // =========================================================
  // MULTI-STEP SESSION FORM STATE (4 TABS)
  // =========================================================
  const [editingSessionModalOpen, setEditingSessionModalOpen] = useState(false);
  const [sessionFormTab, setSessionFormTab] = useState<1 | 2 | 3 | 4>(1);
  const [sessionFormData, setSessionFormData] = useState<{
    id?: string;
    courseId: string;
    title: string;
    titleAr: string;
    description: string;
    descriptionAr: string;
    order: number;
    durationMinutes: number;
    isPublished: boolean;
    // Tab 2: Video & PDF & Drive
    youtubeUrl: string;
    pdfUrl: string;
    pdfTitle: string;
    googleDriveUrl: string;
    // Tab 3: Notes & Text
    lessonNotes: string;
    // Tab 4: Quiz
    enableQuiz: boolean;
    quizId?: string;
    quizTitle: string;
    passingScore: number;
    timeLimitMinutes: number;
    maxAttempts: number;
    questions: Question[];
  }>({
    courseId: '',
    title: '',
    titleAr: '',
    description: '',
    descriptionAr: '',
    order: 1,
    durationMinutes: 45,
    isPublished: true,
    youtubeUrl: '',
    pdfUrl: '',
    pdfTitle: '',
    googleDriveUrl: '',
    lessonNotes: '',
    enableQuiz: false,
    quizTitle: '',
    passingScore: 75,
    timeLimitMinutes: 0,
    maxAttempts: 3,
    questions: []
  });

  // Independent Quiz modal editing
  const [editingQuiz, setEditingQuiz] = useState<Partial<Quiz> | null>(null);

  // Quiz Import via Copy & Paste
  const [showQuizImportModal, setShowQuizImportModal] = useState(false);
  const [quizImportTarget, setQuizImportTarget] = useState<'session' | 'independent'>('session');

  const handleImportedQuestions = (imported: Question[], mode: 'append' | 'replace') => {
    if (quizImportTarget === 'session') {
      setSessionFormData(prev => ({
        ...prev,
        enableQuiz: true,
        questions: mode === 'replace' ? imported : [...prev.questions, ...imported]
      }));
      showStatus('success', `${imported.length} soal berhasil ${mode === 'replace' ? 'menggantikan daftar soal' : 'ditambahkan ke'} kuis sesi.`);
    } else if (editingQuiz) {
      setEditingQuiz(prev => ({
        ...prev,
        questions: mode === 'replace' ? imported : [...(prev?.questions || []), ...imported]
      }));
      showStatus('success', `${imported.length} soal berhasil ${mode === 'replace' ? 'menggantikan daftar soal' : 'ditambahkan ke'} kuis evaluasi.`);
    }
  };

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // In-app Confirm Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    itemName: string;
    message: string;
    onConfirm: () => Promise<void>;
    loading: boolean;
  }>({
    isOpen: false,
    title: '',
    itemName: '',
    message: '',
    onConfirm: async () => {},
    loading: false
  });

  const loadAllAdminData = async (forceRefresh = true) => {
    setLoading(true);
    try {
      if (forceRefresh) {
        invalidateServicesCache('all');
      }
      const [cats, crss, qzs, usrs, atts, posts] = await Promise.all([
        getCategories(forceRefresh),
        getCourses(true, forceRefresh), // include unpublished
        getAllQuizzes(),
        getAllUsers(),
        getAllQuizAttempts(),
        getBlogPosts(true, forceRefresh)
      ]);
      setCategories(cats);
      setCourses(crss);
      setQuizzes(qzs);
      setUsers(usrs);
      setAttempts(atts.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
      setBlogPosts(posts);

      // Load sessions for all courses
      const sessMap: Record<string, Session[]> = {};
      for (const crs of crss) {
        const sList = await getSessionsByCourse(crs.id, true, forceRefresh);
        sessMap[crs.id] = sList;
      }
      setAllSessionsMap(sessMap);

      if (crss.length > 0) {
        setSelectedCourseId(prev => (prev && crss.some(c => c.id === prev) ? prev : crss[0].id));
      }

      // Load comments stats for sidebar badge
      try {
        const comms = await getAllArticleCommentsForAdmin();
        setCommentsCount(comms.length);
        setPendingCommentsCount(comms.filter(c => c.status === 'pending').length);
      } catch (err) {
        // Non-blocking for offline or restricted mode
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, [user?.uid, isAdmin]);

  // Sync tab if initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Sync course if initialCourseId prop changes
  useEffect(() => {
    if (initialCourseId) {
      setSelectedCourseId(initialCourseId);
    }
  }, [initialCourseId]);

  // Update courseSessions when selectedCourseId changes
  useEffect(() => {
    if (!selectedCourseId) {
      setCourseSessions([]);
      return;
    }
    if (allSessionsMap[selectedCourseId]) {
      setCourseSessions(allSessionsMap[selectedCourseId]);
    } else {
      getSessionsByCourse(selectedCourseId, true).then(sessions => {
        setCourseSessions(sessions);
        setAllSessionsMap(prev => ({ ...prev, [selectedCourseId]: sessions }));
      });
    }
  }, [selectedCourseId, allSessionsMap]);

  // Auto-open add session modal
  useEffect(() => {
    if (autoOpenAddSession && selectedCourseId) {
      handleOpenAddSessionModal(selectedCourseId);
      if (onClearAutoOpen) {
        onClearAutoOpen();
      }
    }
  }, [autoOpenAddSession, selectedCourseId]);

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Total sessions across all courses
  const totalSessionsCount = Object.values(allSessionsMap).reduce((acc, list) => acc + list.length, 0);

  // Compute quiz stats
  const averageQuizScore = attempts.length > 0
    ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length)
    : 0;
  const passCount = attempts.filter(a => a.passed).length;
  const passRate = attempts.length > 0 ? Math.round((passCount / attempts.length) * 100) : 0;

  // Quick Search Filtered Data
  const searchLower = quickSearch.trim().toLowerCase();
  const displayedCourses = searchLower
    ? courses.filter(c => c.title.toLowerCase().includes(searchLower) || (c.titleAr && c.titleAr.includes(searchLower)) || c.description?.toLowerCase().includes(searchLower))
    : courses;

  const displayedCategories = searchLower
    ? categories.filter(cat => cat.name.toLowerCase().includes(searchLower) || (cat.nameAr && cat.nameAr.includes(searchLower)))
    : categories;

  const displayedCourseSessions = searchLower
    ? courseSessions.filter(s => s.title.toLowerCase().includes(searchLower) || (s.titleAr && s.titleAr.includes(searchLower)))
    : courseSessions;

  const displayedQuizzes = searchLower
    ? quizzes.filter(q => q.title.toLowerCase().includes(searchLower))
    : quizzes;

  const displayedUsers = searchLower
    ? users.filter(u => (u.displayName && u.displayName.toLowerCase().includes(searchLower)) || (u.email && u.email.toLowerCase().includes(searchLower)))
    : users;

  const displayedAttempts = searchLower
    ? attempts.filter(a => (a.userName && a.userName.toLowerCase().includes(searchLower)) || (a.userEmail && a.userEmail.toLowerCase().includes(searchLower)))
    : attempts;

  // ==========================================
  // OPEN MULTI-STEP SESSION MODAL
  // ==========================================
  const handleOpenAddSessionModal = (targetCourseId?: string) => {
    const cid = targetCourseId || selectedCourseId || courses[0]?.id || '';
    const currentList = allSessionsMap[cid] || [];

    setSessionFormData({
      courseId: cid,
      title: '',
      titleAr: '',
      description: '',
      descriptionAr: '',
      order: currentList.length + 1,
      durationMinutes: 45,
      isPublished: true,
      youtubeUrl: '',
      pdfUrl: '',
      pdfTitle: '',
      googleDriveUrl: '',
      lessonNotes: '',
      enableQuiz: false,
      quizTitle: '',
      passingScore: 75,
      timeLimitMinutes: 0,
      maxAttempts: 3,
      questions: []
    });
    setSessionFormTab(1);
    setEditingSessionModalOpen(true);
  };

  const handleOpenEditSessionModal = async (session: Session) => {
    let existingQuiz: Quiz | null = null;
    if (session.quizId) {
      existingQuiz = await getQuizById(session.quizId);
    }

    setSessionFormData({
      id: session.id,
      courseId: session.courseId,
      title: session.title || '',
      titleAr: session.titleAr || '',
      description: session.description || '',
      descriptionAr: session.descriptionAr || '',
      order: session.order || 1,
      durationMinutes: session.durationMinutes || 45,
      isPublished: session.isPublished ?? true,
      youtubeUrl: session.youtubeUrl || '',
      pdfUrl: session.pdfUrl || '',
      pdfTitle: session.pdfTitle || '',
      googleDriveUrl: session.googleDriveUrl || '',
      lessonNotes: session.lessonNotes || '',
      enableQuiz: !!existingQuiz,
      quizId: existingQuiz?.id || session.quizId || '',
      quizTitle: existingQuiz?.title || `Kuis Evaluasi - ${session.title}`,
      passingScore: existingQuiz?.passingScore ?? 75,
      timeLimitMinutes: existingQuiz?.timeLimitMinutes ?? 0,
      maxAttempts: existingQuiz?.maxAttempts ?? 3,
      questions: existingQuiz?.questions || []
    });
    setSessionFormTab(1);
    setEditingSessionModalOpen(true);
  };

  // ==========================================
  // SAVE MULTI-STEP SESSION (SESSION + QUIZ)
  // ==========================================
  const handleSaveMultiStepSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionFormData.courseId) {
      showStatus('error', 'Silakan pilih mata pelajaran terlebih dahulu.');
      return;
    }

    setSavingSession(true);
    try {
      await ensureFreshFirestoreAuthToken();

      const sessionTitle = sessionFormData.title.trim()
        ? sessionFormData.title.trim()
        : `Sesi ${sessionFormData.order}`;

      const sessionIdToSave = sessionFormData.id && sessionFormData.id.trim() !== ''
        ? sessionFormData.id
        : `session-${Date.now()}`;

      let linkedQuizId = sessionFormData.quizId || '';

      // Save Quiz first if enabled
      if (sessionFormData.enableQuiz) {
        const quizTitleToSave = sessionFormData.quizTitle.trim()
          ? sessionFormData.quizTitle.trim()
          : `Kuis Evaluasi - ${sessionTitle}`;

        const savedQuizId = await saveQuiz({
          id: linkedQuizId || `quiz-${Date.now()}`,
          title: quizTitleToSave,
          titleAr: sessionFormData.titleAr ? `اختبار - ${sessionFormData.titleAr}` : '',
          courseId: sessionFormData.courseId,
          sessionId: sessionIdToSave,
          passingScore: Number(sessionFormData.passingScore) || 75,
          timeLimitMinutes: Number(sessionFormData.timeLimitMinutes) || 0,
          maxAttempts: Number(sessionFormData.maxAttempts) || 3,
          showAnswersAfterSubmit: true,
          isPublished: sessionFormData.isPublished,
          questions: sessionFormData.questions || []
        });
        linkedQuizId = savedQuizId || linkedQuizId;
      }

      // Save Session
      await saveSession(sessionFormData.courseId, {
        id: sessionIdToSave,
        courseId: sessionFormData.courseId,
        title: sessionTitle,
        titleAr: sessionFormData.titleAr || '',
        description: sessionFormData.description || '',
        descriptionAr: sessionFormData.descriptionAr || '',
        order: Number(sessionFormData.order) || 1,
        youtubeUrl: sessionFormData.youtubeUrl || '',
        pdfUrl: sessionFormData.pdfUrl || '',
        pdfTitle: sessionFormData.pdfTitle || (sessionFormData.pdfUrl ? 'Naskah Pembelajaran PDF' : ''),
        googleDriveUrl: sessionFormData.googleDriveUrl || '',
        lessonNotes: sessionFormData.lessonNotes || '',
        durationMinutes: Number(sessionFormData.durationMinutes) || 45,
        isPublished: sessionFormData.isPublished,
        quizId: sessionFormData.enableQuiz ? linkedQuizId : ''
      });

      showStatus('success', `Sesi "${sessionTitle}" ${sessionFormData.enableQuiz ? '& Kuis Evaluasi ' : ''}berhasil disimpan ke Cloud Firestore.`);
      setEditingSessionModalOpen(false);

      // Refresh data
      await loadAllAdminData();
      onRefreshData();
    } catch (err: any) {
      showStatus('error', 'Gagal menyimpan sesi: ' + (err.message || String(err)));
    } finally {
      setSavingSession(false);
    }
  };

  // Add question to multi-step session quiz
  const handleAddQuestionToSessionForm = () => {
    const newQ: Question = {
      id: `q-${Date.now()}`,
      questionText: 'Tulis pertanyaan baru di sini...',
      type: 'multiple_choice',
      options: ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'],
      correctAnswerIndex: 0,
      points: 25,
      explanation: ''
    };
    setSessionFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQ]
    }));
  };

  const handleRemoveQuestionFromSessionForm = (index: number) => {
    setSessionFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  // ==========================================
  // CATEGORIES CRUD
  // ==========================================
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.name) return;
    try {
      await saveCategory({
        ...editingCategory,
        name: editingCategory.name,
        nameAr: editingCategory.nameAr || '',
        slug: editingCategory.slug || editingCategory.name.toLowerCase().replace(/\s+/g, '-'),
        description: editingCategory.description || '',
        order: Number(editingCategory.order) || 1
      });
      showStatus('success', 'Bab / Modul berhasil disimpan.');
      setEditingCategory(null);
      await loadAllAdminData();
      onRefreshData();
    } catch (err: any) {
      showStatus('error', 'Gagal menyimpan Bab / Modul: ' + err.message);
    }
  };

  const handleDeleteCategory = (cat: Category) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Bab / Modul Permanen',
      itemName: `${cat.name} (ID: ${cat.id})`,
      message: 'Bab / Modul ini akan dihapus secara permanen dari Cloud Firestore. Apakah Anda yakin?',
      loading: false,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, loading: true }));
        try {
          await deleteCategory(cat.id);
          showStatus('success', `Bab / Modul "${cat.name}" berhasil dihapus.`);
          await loadAllAdminData();
          onRefreshData();
          setConfirmDialog(prev => ({ ...prev, isOpen: false, loading: false }));
        } catch (err: any) {
          showStatus('error', 'Gagal menghapus: ' + err.message);
          setConfirmDialog(prev => ({ ...prev, loading: false }));
        }
      }
    });
  };

  // ==========================================
  // COURSES CRUD
  // ==========================================
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse?.title || !editingCourse?.categoryId) {
      showStatus('error', 'Judul mata pelajaran dan Bab/Modul wajib diisi.');
      return;
    }
    try {
      await saveCourse({
        ...editingCourse,
        title: editingCourse.title,
        titleAr: editingCourse.titleAr || '',
        instructor: editingCourse.instructor || '',
        instructorTitle: editingCourse.instructorTitle || '',
        instructorAr: editingCourse.instructorAr || '',
        categoryId: editingCourse.categoryId,
        level: editingCourse.level || 'beginner',
        description: editingCourse.description || '',
        descriptionAr: editingCourse.descriptionAr || '',
        coverImageUrl: editingCourse.coverImageUrl || '',
        isPublished: editingCourse.isPublished ?? true,
        hasCertificate: editingCourse.hasCertificate ?? true,
        passingGrade: Number(editingCourse.passingGrade) || 75,
        totalDuration: editingCourse.totalDuration || '5 Sesi',
        order: Number(editingCourse.order) || 1
      });
      showStatus('success', 'Mata Pelajaran berhasil disimpan.');
      setEditingCourse(null);
      await loadAllAdminData();
      onRefreshData();
    } catch (err: any) {
      showStatus('error', 'Gagal menyimpan mata pelajaran: ' + err.message);
    }
  };

  const handleDeleteCourse = (course: Course) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Mata Pelajaran Permanen',
      itemName: `${course.title} (ID: ${course.id})`,
      message: 'Mata pelajaran ini beserta seluruh sesi dan kuis di dalamnya akan dihapus secara permanen dari Cloud Firestore.',
      loading: false,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, loading: true }));
        try {
          await deleteCourse(course.id);
          showStatus('success', `Mata Pelajaran "${course.title}" berhasil dihapus.`);
          await loadAllAdminData();
          onRefreshData();
          setConfirmDialog(prev => ({ ...prev, isOpen: false, loading: false }));
        } catch (err: any) {
          showStatus('error', 'Gagal menghapus: ' + err.message);
          setConfirmDialog(prev => ({ ...prev, loading: false }));
        }
      }
    });
  };

  // ==========================================
  // DELETE SESSION HANDLER
  // ==========================================
  const handleDeleteSession = (session: Session) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Sesi Pembelajaran',
      itemName: `${session.title} (ID: ${session.id})`,
      message: 'Sesi pembelajaran ini beserta tautan video, berkas PDF, dan kuis terkait akan dihapus permanen.',
      loading: false,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, loading: true }));
        try {
          await deleteSession(session.courseId, session.id);
          showStatus('success', `Sesi "${session.title}" berhasil dihapus.`);
          await loadAllAdminData();
          onRefreshData();
          setConfirmDialog(prev => ({ ...prev, isOpen: false, loading: false }));
        } catch (err: any) {
          showStatus('error', 'Gagal menghapus sesi: ' + err.message);
          setConfirmDialog(prev => ({ ...prev, loading: false }));
        }
      }
    });
  };

  // ==========================================
  // QUIZ CRUD HANDLERS
  // ==========================================
  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuiz?.title || !editingQuiz?.courseId) {
      showStatus('error', 'Judul kuis dan mata pelajaran terkait wajib diisi.');
      return;
    }
    try {
      await saveQuiz({
        ...editingQuiz,
        title: editingQuiz.title,
        titleAr: editingQuiz.titleAr || '',
        courseId: editingQuiz.courseId,
        sessionId: editingQuiz.sessionId || '',
        description: editingQuiz.description || '',
        passingScore: Number(editingQuiz.passingScore) || 75,
        timeLimitMinutes: Number(editingQuiz.timeLimitMinutes) || 0,
        maxAttempts: Number(editingQuiz.maxAttempts) || 3,
        showAnswersAfterSubmit: editingQuiz.showAnswersAfterSubmit ?? true,
        isPublished: editingQuiz.isPublished ?? true,
        questions: editingQuiz.questions || []
      });
      showStatus('success', 'Kuis evaluasi berhasil disimpan.');
      setEditingQuiz(null);
      await loadAllAdminData();
      onRefreshData();
    } catch (err: any) {
      showStatus('error', 'Gagal menyimpan kuis: ' + err.message);
    }
  };

  const handleDeleteQuiz = (quiz: Quiz) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Kuis Evaluasi',
      itemName: `${quiz.title} (ID: ${quiz.id})`,
      message: 'Kuis evaluasi ini dan seluruh butir pertanyaan di dalamnya akan dihapus permanen.',
      loading: false,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, loading: true }));
        try {
          await deleteQuiz(quiz.id);
          showStatus('success', `Kuis "${quiz.title}" berhasil dihapus.`);
          await loadAllAdminData();
          onRefreshData();
          setConfirmDialog(prev => ({ ...prev, isOpen: false, loading: false }));
        } catch (err: any) {
          showStatus('error', 'Gagal menghapus kuis: ' + err.message);
          setConfirmDialog(prev => ({ ...prev, loading: false }));
        }
      }
    });
  };

  // File Upload Helper
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    folder: 'covers' | 'pdfs',
    onSuccess: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (folder === 'covers') {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!file.type || !allowedTypes.includes(file.type.toLowerCase())) {
        showStatus('error', 'Format gambar thumbnail tidak didukung. Pilihlah JPG, PNG, atau WebP.');
        if (e.target) e.target.value = '';
        return;
      }
    }

    setUploadingFile(true);
    setUploadProgress(0);
    try {
      const url = await uploadFileToStorage(file, folder, (pct) => {
        setUploadProgress(pct);
      });
      onSuccess(url);
      showStatus('success', `Berkas ${file.name} berhasil diunggah.`);
    } catch (err: any) {
      showStatus('error', 'Gagal mengunggah berkas: ' + (err.message || String(err)));
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
      if (e.target) e.target.value = '';
    }
  };

  // Export CSV Report
  const handleExportReport = () => {
    try {
      const headers = ['Type', 'ID', 'Title', 'Category/Course', 'Order/Status'];
      const rows: string[][] = [headers];

      courses.forEach(c => {
        rows.push(['Mata Pelajaran', c.id, `"${c.title.replace(/"/g, '""')}"`, c.categoryId, c.isPublished ? 'Published' : 'Draft']);
      });

      Object.values(allSessionsMap).flat().forEach(s => {
        rows.push(['Sesi Pembelajaran', s.id, `"${s.title.replace(/"/g, '""')}"`, s.courseId, `Order ${s.order}`]);
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Dars_with_Osama_Report_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showStatus('success', 'Laporan administrasi berhasil diunduh dalam format CSV.');
    } catch (err: any) {
      showStatus('error', 'Gagal mengekspor laporan: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] dark:bg-[#0D2B36] text-charcoal dark:text-[#CEFEF1] flex flex-col lg:flex-row font-sans transition-colors duration-200">
      {/* ========================================================= */}
      {/* MOBILE TOP BAR (Logo acts as Sidebar Toggle) */}
      {/* ========================================================= */}
      <div className="lg:hidden sticky top-0 z-30 bg-white dark:bg-[#0D2B36] text-charcoal dark:text-[#CEFEF1] border-b-2 border-charcoal dark:border-[#1F5F63] px-4 py-3 flex items-center justify-between gap-3 shadow-[0_3px_0_#292D2B]">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? "Tutup Sidebar Admin" : "Buka Sidebar Admin"}
          title={sidebarOpen ? "Tutup Sidebar Admin" : "Buka Sidebar Admin"}
          className="flex items-center gap-2.5 p-1 -ml-1 rounded-md border-2 border-transparent hover:border-charcoal dark:hover:border-[#4CA7A1] hover:bg-[#EFE5D2] dark:hover:bg-[#1F5F63] active:translate-x-[1px] active:translate-y-[1px] transition cursor-pointer text-left group"
        >
          <div className="w-8 h-8 rounded-md border-2 border-charcoal dark:border-[#4CA7A1] shadow-[2px_2px_0px_#292D2B] bg-[#123D32] dark:bg-[#1F5F63] flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
            <LogoSymbol className="w-7 h-7" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif-brand font-bold text-sm tracking-tight text-charcoal dark:text-[#CEFEF1] group-hover:text-[#237A70] dark:group-hover:text-[#4CA7A1] transition-colors">
              Dars with Osama
            </span>
            <span className="text-[9px] text-[#237A70] dark:text-[#A6D6C9] font-extrabold tracking-wider uppercase">
              Admin Panel {sidebarOpen ? '• Tutup' : '• Menu'}
            </span>
          </div>
        </button>

        <button
          onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
          className="p-2 bg-[#EFE5D2] dark:bg-[#1F5F63] text-[#237A70] dark:text-[#CEFEF1] border-2 border-charcoal dark:border-[#4CA7A1] rounded-md hover:bg-[#4CA7A1] hover:text-[#001722] transition cursor-pointer"
          title="Toggle Dark Mode"
        >
          {effectiveTheme === 'dark' ? <Sun className="w-4 h-4 text-[#CEFEF1]" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* ========================================================= */}
      {/* CENTRALIZED LEFT SIDEBAR NAV (FIXED VIEWPORT & MOBILE DRAWER) */}
      {/* ========================================================= */}
      <aside className={`fixed top-0 left-0 z-40 h-screen h-[100dvh] bg-[#FFFDF7] dark:bg-[#001722] text-[#171717] dark:text-[#CEFEF1] border-r-2 border-[#171717] dark:border-[#4CA7A1] flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'w-20' : 'w-72'
      } ${
        sidebarOpen ? 'translate-x-0 shadow-[6px_0_0_#171717] z-50' : '-translate-x-full lg:translate-x-0 shadow-none'
      }`}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* BRAND HEADER & LOGO SIDEBAR TOGGLE */}
          <div className={`p-4 border-b-2 border-[#171717] dark:border-[#4CA7A1] flex items-center shrink-0 ${sidebarCollapsed ? 'lg:justify-center' : 'justify-between'} bg-white dark:bg-[#001722]`}>
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth >= 1024) {
                  setSidebarCollapsed(!sidebarCollapsed);
                } else {
                  setSidebarOpen(false);
                }
              }}
              aria-label={sidebarCollapsed ? "Buka Sidebar Admin" : "Tutup Sidebar Admin"}
              title={sidebarCollapsed ? "Buka / Perluas Sidebar Admin" : "Tutup / Kecilkan Sidebar Admin"}
              className={`flex items-center gap-3 overflow-hidden text-left p-1 -ml-1 rounded-md border-2 border-transparent hover:border-[#171717]/30 dark:hover:border-[#4CA7A1] hover:bg-[#F5EFE2] dark:hover:bg-[#1F5F63] transition cursor-pointer group ${
                sidebarCollapsed ? 'lg:justify-center lg:m-0' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[2px_2px_0px_#171717] bg-[#123D32] dark:bg-[#1F5F63] flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
                <LogoSymbol className="w-9 h-9 shrink-0" />
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="font-serif-brand font-bold text-base text-[#171717] dark:text-[#FFFFFF] tracking-tight truncate group-hover:text-[#0B6B50] dark:group-hover:text-[#4CA7A1] transition-colors">
                      Dars with Osama
                    </span>
                  </div>
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded-sm bg-[#D6AD52] dark:bg-[#4CA7A1] text-[#171717] dark:text-[#001722] border border-[#171717] dark:border-[#001722] font-extrabold uppercase tracking-wider truncate">
                    Admin Dashboard
                  </span>
                </div>
              )}
            </button>

            {/* Close drawer button on mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 text-[#171717] dark:text-[#CEFEF1] hover:text-[#171717] hover:bg-[#4CA7A1] dark:hover:text-[#001722] rounded-md border border-[#171717]/40 dark:border-[#4CA7A1] transition cursor-pointer shrink-0"
              aria-label="Tutup Sidebar Admin"
              title="Tutup Sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* QUICK SEARCH BAR IN SIDEBAR */}
          <div className="p-3.5 border-b-2 border-[#171717] dark:border-[#4CA7A1] bg-[#F5EFE2] dark:bg-[#0D2B36]">
            <div className={`relative flex items-center ${sidebarCollapsed ? 'lg:justify-center' : ''}`}>
              <Search className={`w-3.5 h-3.5 text-[#0B6B50] dark:text-[#4CA7A1] ${sidebarCollapsed ? 'lg:static' : 'absolute left-3'}`} />
              {!sidebarCollapsed && (
                <input
                  type="text"
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  placeholder="Pencarian cepat data..."
                  className="w-full pl-9 pr-7 py-2 bg-white dark:bg-[#001722] border-2 border-[#171717]/30 dark:border-[#4CA7A1] rounded-md text-xs focus:outline-hidden focus:border-[#0B6B50] dark:focus:border-[#CEFEF1] text-[#171717] dark:text-[#CEFEF1] placeholder:text-[#57534E]/70 dark:placeholder:text-[#A6D6C9] font-semibold"
                />
              )}
              {!sidebarCollapsed && quickSearch && (
                <button
                  onClick={() => setQuickSearch('')}
                  className="absolute right-2.5 text-[#57534E] dark:text-[#A6D6C9] hover:text-[#0B6B50] dark:hover:text-[#CEFEF1]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* SCROLLABLE MENU ITEMS AREA */}
          <div className={`py-4 space-y-6 overflow-y-auto flex-1 ${sidebarCollapsed ? 'px-2' : 'px-4'}`}>
            {/* GROUP 1: UTAMA */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <p className="px-3 text-[10px] font-extrabold text-[#0B6B50] dark:text-[#A6D6C9] uppercase tracking-wider truncate">
                  UTAMA
                </p>
              )}
              <button
                onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
                title="Dashboard Overview"
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3.5 py-2.5'} rounded-md text-xs font-extrabold transition cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-[#123D32] dark:bg-[#1F5F63] text-[#FAF7F0] dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] border-l-4 dark:border-l-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]'
                    : 'bg-[#F5EFE2]/60 dark:bg-[#0D2B36] text-[#171717] dark:text-[#A6D6C9] hover:bg-[#F5EFE2] dark:hover:bg-[#1F5F63] dark:hover:text-[#CEFEF1] border-2 border-[#171717]/40 dark:border-[#4CA7A1]'
                }`}
              >
                <BarChart2 className={`w-4 h-4 shrink-0 ${activeTab === 'dashboard' ? 'text-[#FAF7F0] dark:text-[#CEFEF1]' : 'text-[#0B6B50] dark:text-[#4CA7A1]'}`} />
                {!sidebarCollapsed && <span className="truncate">Dashboard Overview</span>}
              </button>
            </div>

            {/* GROUP 2: KONTEN PEMBELAJARAN */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <p className="px-3 text-[10px] font-extrabold text-[#0B6B50] dark:text-[#A6D6C9] uppercase tracking-wider truncate">
                  KONTEN PEMBELAJARAN
                </p>
              )}
              <button
                onClick={() => { setActiveTab('courses'); setSidebarOpen(false); }}
                title={`Mata Pelajaran (${courses.length})`}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2.5'} rounded-md text-xs font-extrabold transition cursor-pointer ${
                  activeTab === 'courses'
                    ? 'bg-[#123D32] dark:bg-[#1F5F63] text-[#FAF7F0] dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] border-l-4 dark:border-l-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]'
                    : 'bg-[#F5EFE2]/60 dark:bg-[#0D2B36] text-[#171717] dark:text-[#A6D6C9] hover:bg-[#F5EFE2] dark:hover:bg-[#1F5F63] dark:hover:text-[#CEFEF1] border-2 border-[#171717]/40 dark:border-[#4CA7A1]'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <BookOpen className={`w-4 h-4 shrink-0 ${activeTab === 'courses' ? 'text-[#FAF7F0] dark:text-[#CEFEF1]' : 'text-[#0B6B50] dark:text-[#4CA7A1]'}`} />
                  {!sidebarCollapsed && <span className="truncate">Mata Pelajaran</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-sm font-extrabold shrink-0 border ${
                    activeTab === 'courses'
                      ? 'bg-[#4CA7A1] text-[#001722] border-[#171717] dark:border-[#001722]'
                      : 'bg-[#F5EFE2] dark:bg-[#001722] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/30 dark:border-[#4CA7A1]'
                  }`}>
                    {courses.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab('categories'); setSidebarOpen(false); }}
                title={`Bab / Modul (${categories.length})`}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2.5'} rounded-md text-xs font-extrabold transition cursor-pointer ${
                  activeTab === 'categories'
                    ? 'bg-[#123D32] dark:bg-[#1F5F63] text-[#FAF7F0] dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] border-l-4 dark:border-l-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]'
                    : 'bg-[#F5EFE2]/60 dark:bg-[#0D2B36] text-[#171717] dark:text-[#A6D6C9] hover:bg-[#F5EFE2] dark:hover:bg-[#1F5F63] dark:hover:text-[#CEFEF1] border-2 border-[#171717]/40 dark:border-[#4CA7A1]'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Layers className={`w-4 h-4 shrink-0 ${activeTab === 'categories' ? 'text-[#FAF7F0] dark:text-[#CEFEF1]' : 'text-[#0B6B50] dark:text-[#4CA7A1]'}`} />
                  {!sidebarCollapsed && <span className="truncate">Bab / Modul</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-sm font-extrabold shrink-0 border ${
                    activeTab === 'categories'
                      ? 'bg-[#4CA7A1] text-[#001722] border-[#171717] dark:border-[#001722]'
                      : 'bg-[#F5EFE2] dark:bg-[#001722] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/30 dark:border-[#4CA7A1]'
                  }`}>
                    {categories.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab('sessions'); setSidebarOpen(false); }}
                title={`Sesi Pembelajaran (${totalSessionsCount})`}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2.5'} rounded-md text-xs font-extrabold transition cursor-pointer ${
                  activeTab === 'sessions'
                    ? 'bg-[#123D32] dark:bg-[#1F5F63] text-[#FAF7F0] dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] border-l-4 dark:border-l-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]'
                    : 'bg-[#F5EFE2]/60 dark:bg-[#0D2B36] text-[#171717] dark:text-[#A6D6C9] hover:bg-[#F5EFE2] dark:hover:bg-[#1F5F63] dark:hover:text-[#CEFEF1] border-2 border-[#171717]/40 dark:border-[#4CA7A1]'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Video className={`w-4 h-4 shrink-0 ${activeTab === 'sessions' ? 'text-[#FAF7F0] dark:text-[#CEFEF1]' : 'text-[#0B6B50] dark:text-[#4CA7A1]'}`} />
                  {!sidebarCollapsed && <span className="truncate">Sesi Pembelajaran</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-sm font-extrabold shrink-0 border ${
                    activeTab === 'sessions'
                      ? 'bg-[#4CA7A1] text-[#001722] border-[#171717] dark:border-[#001722]'
                      : 'bg-[#F5EFE2] dark:bg-[#001722] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/30 dark:border-[#4CA7A1]'
                  }`}>
                    {totalSessionsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab('quizzes'); setSidebarOpen(false); }}
                title={`Kuis Evaluasi (${quizzes.length})`}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2.5'} rounded-md text-xs font-extrabold transition cursor-pointer ${
                  activeTab === 'quizzes'
                    ? 'bg-[#123D32] dark:bg-[#1F5F63] text-[#FAF7F0] dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] border-l-4 dark:border-l-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]'
                    : 'bg-[#F5EFE2]/60 dark:bg-[#0D2B36] text-[#171717] dark:text-[#A6D6C9] hover:bg-[#F5EFE2] dark:hover:bg-[#1F5F63] dark:hover:text-[#CEFEF1] border-2 border-[#171717]/40 dark:border-[#4CA7A1]'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <HelpCircle className={`w-4 h-4 shrink-0 ${activeTab === 'quizzes' ? 'text-[#FAF7F0] dark:text-[#CEFEF1]' : 'text-[#0B6B50] dark:text-[#4CA7A1]'}`} />
                  {!sidebarCollapsed && <span className="truncate">Kuis Evaluasi</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-sm font-extrabold shrink-0 border ${
                    activeTab === 'quizzes'
                      ? 'bg-[#4CA7A1] text-[#001722] border-[#171717] dark:border-[#001722]'
                      : 'bg-[#F5EFE2] dark:bg-[#001722] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/30 dark:border-[#4CA7A1]'
                  }`}>
                    {quizzes.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab('blog'); setSidebarOpen(false); }}
                title={`Blog & Artikel (${blogPosts.length})`}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2.5'} rounded-md text-xs font-extrabold transition cursor-pointer ${
                  activeTab === 'blog'
                    ? 'bg-[#123D32] dark:bg-[#1F5F63] text-[#FAF7F0] dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] border-l-4 dark:border-l-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]'
                    : 'bg-[#F5EFE2]/60 dark:bg-[#0D2B36] text-[#171717] dark:text-[#A6D6C9] hover:bg-[#F5EFE2] dark:hover:bg-[#1F5F63] dark:hover:text-[#CEFEF1] border-2 border-[#171717]/40 dark:border-[#4CA7A1]'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <FileText className={`w-4 h-4 shrink-0 ${activeTab === 'blog' ? 'text-[#FAF7F0] dark:text-[#CEFEF1]' : 'text-[#0B6B50] dark:text-[#4CA7A1]'}`} />
                  {!sidebarCollapsed && <span className="truncate">Blog & Artikel</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-sm font-extrabold shrink-0 border ${
                    activeTab === 'blog'
                      ? 'bg-[#4CA7A1] text-[#001722] border-[#171717] dark:border-[#001722]'
                      : 'bg-[#F5EFE2] dark:bg-[#001722] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/30 dark:border-[#4CA7A1]'
                  }`}>
                    {blogPosts.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab('comments'); setSidebarOpen(false); }}
                title={`Komentar Pembaca Artikel (${commentsCount})`}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2.5'} rounded-md text-xs font-extrabold transition cursor-pointer ${
                  activeTab === 'comments'
                    ? 'bg-[#123D32] dark:bg-[#1F5F63] text-[#FAF7F0] dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] border-l-4 dark:border-l-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]'
                    : 'bg-[#F5EFE2]/60 dark:bg-[#0D2B36] text-[#171717] dark:text-[#A6D6C9] hover:bg-[#F5EFE2] dark:hover:bg-[#1F5F63] dark:hover:text-[#CEFEF1] border-2 border-[#171717]/40 dark:border-[#4CA7A1]'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <MessageSquare className={`w-4 h-4 shrink-0 ${activeTab === 'comments' ? 'text-[#FAF7F0] dark:text-[#CEFEF1]' : 'text-[#0B6B50] dark:text-[#4CA7A1]'}`} />
                  {!sidebarCollapsed && <span className="truncate">Komentar Artikel</span>}
                </div>
                {!sidebarCollapsed && pendingCommentsCount > 0 ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-sm bg-[#C94A4A] text-white border border-[#171717] font-extrabold shrink-0 animate-pulse">
                    {pendingCommentsCount} baru
                  </span>
                ) : !sidebarCollapsed && commentsCount > 0 ? (
                  <span className={`text-[10px] px-2 py-0.5 rounded-sm font-extrabold shrink-0 border ${
                    activeTab === 'comments'
                      ? 'bg-[#4CA7A1] text-[#001722] border-[#171717] dark:border-[#001722]'
                      : 'bg-[#F5EFE2] dark:bg-[#001722] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/30 dark:border-[#4CA7A1]'
                  }`}>
                    {commentsCount}
                  </span>
                ) : null}
              </button>

              <button
                onClick={() => { setActiveTab('consultation'); setSidebarOpen(false); }}
                title="Konsultasi & Q&A Siswa"
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2.5'} rounded-md text-xs font-extrabold transition cursor-pointer ${
                  activeTab === 'consultation'
                    ? 'bg-[#123D32] dark:bg-[#1F5F63] text-[#FAF7F0] dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] border-l-4 dark:border-l-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]'
                    : 'bg-[#F5EFE2]/60 dark:bg-[#0D2B36] text-[#171717] dark:text-[#A6D6C9] hover:bg-[#F5EFE2] dark:hover:bg-[#1F5F63] dark:hover:text-[#CEFEF1] border-2 border-[#171717]/40 dark:border-[#4CA7A1]'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <MessageSquare className={`w-4 h-4 shrink-0 ${activeTab === 'consultation' ? 'text-[#FAF7F0] dark:text-[#CEFEF1]' : 'text-[#0B6B50] dark:text-[#4CA7A1]'}`} />
                  {!sidebarCollapsed && <span className="truncate">Konsultasi & Q&A</span>}
                </div>
              </button>

              <button
                onClick={() => { setActiveTab('instructor-profile'); setSidebarOpen(false); }}
                data-testid="admin-tab-instructor-profile"
                title="Kelola Halaman Profil Pengajar"
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2.5'} rounded-md text-xs font-extrabold transition cursor-pointer ${
                  activeTab === 'instructor-profile'
                    ? 'bg-[#123D32] dark:bg-[#1F5F63] text-[#FAF7F0] dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] border-l-4 dark:border-l-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]'
                    : 'bg-[#F5EFE2]/60 dark:bg-[#0D2B36] text-[#171717] dark:text-[#A6D6C9] hover:bg-[#F5EFE2] dark:hover:bg-[#1F5F63] dark:hover:text-[#CEFEF1] border-2 border-[#171717]/40 dark:border-[#4CA7A1]'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <UserCheck className={`w-4 h-4 shrink-0 ${activeTab === 'instructor-profile' ? 'text-[#FAF7F0] dark:text-[#CEFEF1]' : 'text-[#0B6B50] dark:text-[#4CA7A1]'}`} />
                  {!sidebarCollapsed && <span className="truncate">Profil Pengajar</span>}
                </div>
              </button>
            </div>

            {/* GROUP 3: PENGGUNA & MONITORING */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <p className="px-3 text-[10px] font-extrabold text-[#0B6B50] dark:text-[#A6D6C9] uppercase tracking-wider truncate">
                  PENGGUNA & MONITORING
                </p>
              )}
              <button
                onClick={() => { setActiveTab('users'); setSidebarOpen(false); }}
                title={`Pengguna Terdaftar (${users.length})`}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2.5'} rounded-md text-xs font-extrabold transition cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-[#123D32] dark:bg-[#1F5F63] text-[#FAF7F0] dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] border-l-4 dark:border-l-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]'
                    : 'bg-[#F5EFE2]/60 dark:bg-[#0D2B36] text-[#171717] dark:text-[#A6D6C9] hover:bg-[#F5EFE2] dark:hover:bg-[#1F5F63] dark:hover:text-[#CEFEF1] border-2 border-[#171717]/40 dark:border-[#4CA7A1]'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Users className={`w-4 h-4 shrink-0 ${activeTab === 'users' ? 'text-[#FAF7F0] dark:text-[#CEFEF1]' : 'text-[#0B6B50] dark:text-[#4CA7A1]'}`} />
                  {!sidebarCollapsed && <span className="truncate">Pengguna Terdaftar</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-sm font-extrabold shrink-0 border ${
                    activeTab === 'users'
                      ? 'bg-[#4CA7A1] text-[#001722] border-[#171717] dark:border-[#001722]'
                      : 'bg-[#F5EFE2] dark:bg-[#001722] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/30 dark:border-[#4CA7A1]'
                  }`}>
                    {users.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab('attempts'); setSidebarOpen(false); }}
                title={`Hasil Kuis & Nilai (${attempts.length})`}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2.5'} rounded-md text-xs font-extrabold transition cursor-pointer ${
                  activeTab === 'attempts'
                    ? 'bg-[#123D32] dark:bg-[#1F5F63] text-[#FAF7F0] dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] border-l-4 dark:border-l-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]'
                    : 'bg-[#F5EFE2]/60 dark:bg-[#0D2B36] text-[#171717] dark:text-[#A6D6C9] hover:bg-[#F5EFE2] dark:hover:bg-[#1F5F63] dark:hover:text-[#CEFEF1] border-2 border-[#171717]/40 dark:border-[#4CA7A1]'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Award className={`w-4 h-4 shrink-0 ${activeTab === 'attempts' ? 'text-[#FAF7F0] dark:text-[#CEFEF1]' : 'text-[#0B6B50] dark:text-[#4CA7A1]'}`} />
                  {!sidebarCollapsed && <span className="truncate">Hasil Kuis & Nilai</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-sm font-extrabold shrink-0 border ${
                    activeTab === 'attempts'
                      ? 'bg-[#4CA7A1] text-[#001722] border-[#171717] dark:border-[#001722]'
                      : 'bg-[#F5EFE2] dark:bg-[#001722] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/30 dark:border-[#4CA7A1]'
                  }`}>
                    {attempts.length}
                  </span>
                )}
              </button>
            </div>

            {/* GROUP 4: AKSI & PINTASAN ADMIN */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <p className="px-3 text-[10px] font-extrabold text-[#0B6B50] dark:text-[#A6D6C9] uppercase tracking-wider truncate">
                  AKSI & PINTASAN
                </p>
              )}
              {onNavigateToSiswa && (
                <button
                  onClick={() => { onNavigateToSiswa(); setSidebarOpen(false); }}
                  title="Lihat Web Siswa"
                  className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3.5 py-2.5'} rounded-md text-xs font-extrabold bg-[#F5EFE2]/60 dark:bg-[#0D2B36] text-[#171717] dark:text-[#A6D6C9] hover:bg-[#F5EFE2] dark:hover:bg-[#1F5F63] dark:hover:text-[#CEFEF1] border-2 border-[#171717]/40 dark:border-[#4CA7A1] transition cursor-pointer`}
                >
                  <ExternalLink className="w-4 h-4 text-[#0B6B50] dark:text-[#4CA7A1] shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">Lihat Web Siswa</span>}
                </button>
              )}

              <button
                onClick={handleExportReport}
                title="Ekspor Laporan (CSV)"
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3.5 py-2.5'} rounded-md text-xs font-extrabold bg-[#F5EFE2]/60 dark:bg-[#0D2B36] text-[#171717] dark:text-[#A6D6C9] hover:bg-[#F5EFE2] dark:hover:bg-[#1F5F63] dark:hover:text-[#CEFEF1] border-2 border-[#171717]/40 dark:border-[#4CA7A1] transition cursor-pointer`}
              >
                <Download className="w-4 h-4 text-[#0B6B50] dark:text-[#4CA7A1] shrink-0" />
                {!sidebarCollapsed && <span className="truncate">Ekspor Laporan (CSV)</span>}
              </button>

              <button
                onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
                title={`Mode Tampilan (${effectiveTheme === 'dark' ? 'Gelap' : 'Terang'})`}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2.5'} rounded-md text-xs font-extrabold bg-[#F5EFE2]/60 dark:bg-[#0D2B36] text-[#171717] dark:text-[#A6D6C9] hover:bg-[#F5EFE2] dark:hover:bg-[#1F5F63] dark:hover:text-[#CEFEF1] border-2 border-[#171717]/40 dark:border-[#4CA7A1] transition cursor-pointer`}
              >
                <div className="flex items-center gap-3 truncate">
                  {effectiveTheme === 'dark' ? <Sun className="w-4 h-4 text-[#4CA7A1] shrink-0" /> : <Moon className="w-4 h-4 text-[#0B6B50] shrink-0" />}
                  {!sidebarCollapsed && <span className="truncate">Mode Tampilan</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-[10px] font-extrabold uppercase text-[#0B6B50] dark:text-[#CEFEF1] shrink-0">
                    {effectiveTheme === 'dark' ? 'Gelap' : 'Terang'}
                  </span>
                )}
              </button>
            </div>

            {/* GROUP 5: PENGATURAN */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <p className="px-3 text-[10px] font-extrabold text-[#0B6B50] dark:text-[#A6D6C9] uppercase tracking-wider truncate">
                  PENGATURAN
                </p>
              )}
              <button
                onClick={() => { setActiveTab('firebase'); setSidebarOpen(false); }}
                title="Status Firebase & Data"
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3.5 py-2.5'} rounded-md text-xs font-extrabold transition cursor-pointer ${
                  activeTab === 'firebase'
                    ? 'bg-[#123D32] dark:bg-[#1F5F63] text-[#FAF7F0] dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] border-l-4 dark:border-l-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722]'
                    : 'bg-[#F5EFE2]/60 dark:bg-[#0D2B36] text-[#171717] dark:text-[#A6D6C9] hover:bg-[#F5EFE2] dark:hover:bg-[#1F5F63] dark:hover:text-[#CEFEF1] border-2 border-[#171717]/40 dark:border-[#4CA7A1]'
                }`}
              >
                <Database className={`w-4 h-4 shrink-0 ${activeTab === 'firebase' ? 'text-[#FAF7F0] dark:text-[#CEFEF1]' : 'text-[#0B6B50] dark:text-[#4CA7A1]'}`} />
                {!sidebarCollapsed && <span className="truncate">Status Firebase & Data</span>}
              </button>
            </div>
          </div>

          {/* BOTTOM PROFILE & LOGOUT */}
          <div className={`p-3.5 border-t-2 border-[#171717] dark:border-[#4CA7A1] bg-[#F5EFE2] dark:bg-[#0D2B36] space-y-3 ${sidebarCollapsed ? 'px-2' : 'px-3.5'}`}>
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between gap-2'}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-md bg-[#4CA7A1] text-[#001722] font-extrabold text-xs flex items-center justify-center shrink-0 overflow-hidden border-2 border-[#171717] dark:border-[#A6D6C9] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]">
                  {(userProfile?.photoURL || user?.photoURL) ? (
                    <img
                      src={userProfile?.photoURL || user?.photoURL || ''}
                      alt={userProfile?.displayName || 'Admin'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'A'}</span>
                  )}
                </div>
                {!sidebarCollapsed && (
                  <div className="overflow-hidden text-xs">
                    <p className="font-bold text-[#171717] dark:text-[#CEFEF1] truncate">
                      {userProfile?.displayName || user?.displayName || 'Admin Dars with Osama'}
                    </p>
                    <p className="text-[#57534E] dark:text-[#A6D6C9] truncate text-[10px]">
                      {user?.email}
                    </p>
                  </div>
                )}
              </div>

              {!sidebarCollapsed && (
                <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-sm bg-[#4CA7A1] text-[#001722] font-extrabold border border-[#171717] dark:border-[#001722] uppercase">
                  Admin
                </span>
              )}
            </div>

            <button
              onClick={openLogoutConfirmModal}
              title="Keluar / Logout Admin"
              className={`w-full flex items-center justify-center ${sidebarCollapsed ? 'px-0 py-2.5' : 'gap-2 py-2 px-3'} rounded-md font-extrabold bg-[#C94A4A] hover:bg-[#D9534F] text-[#FFFFFF] border-2 border-[#171717] dark:border-[#A6D6C9] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] transition cursor-pointer text-xs`}
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              {!sidebarCollapsed && <span>Keluar / Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop overlay for mobile drawer - ONLY rendered when open */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-[#001722]/80 z-40 lg:hidden cursor-pointer"
          aria-hidden="true"
        />
      )}

        {/* RIGHT CONTENT AREA - Offset by fixed sidebar width on desktop */}
        <div className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}>
          <main className="flex-1 p-3 sm:p-6 lg:p-8 space-y-6 min-w-0">
          {/* Status Alert Notification */}
          {statusMessage && (
            <div className={`p-4 rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#001722] text-xs sm:text-sm font-bold flex items-center gap-3 animate-fade-in-up ${
              statusMessage.type === 'success'
                ? 'bg-[#1F5F63] text-[#CEFEF1]'
                : 'bg-[#C94A4A] text-white'
            }`}>
              {statusMessage.type === 'success' ? <CheckCircle className="w-5 h-5 text-[#4CA7A1] shrink-0" /> : <AlertCircle className="w-5 h-5 text-white shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Forensic Data Source & Quota Protection Banner */}
          {getDataSourceStatus().isUsingFallback && (
            <div className="p-4 rounded-md bg-[#FFFBEB] dark:bg-[#1F5F63] border-2 border-[#4CA7A1] text-[#171717] dark:text-[#CEFEF1] shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#001722] space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-[#4CA7A1] shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <p className="font-extrabold text-sm text-[#171717] dark:text-[#FFFFFF]">
                      Proteksi Data Aktif — Menampilkan Data Cadangan Statis (Snapshot 22 Okt 2026)
                    </p>
                    <p className="text-[#171717]/85 dark:text-[#A6D6C9] leading-relaxed">
                      Server Cloud Firestore (<code className="font-mono font-bold">{firebaseConfig.firestoreDatabaseId}</code>) saat ini mengembalikan status{' '}
                      <code className="font-mono font-bold text-[#B42318] dark:text-[#CEFEF1]">
                        {getLatestFirestoreDiagnostic()?.code || 'resource-exhausted'}
                      </code>{' '}
                      (Batas kuota baca harian gratis tercapai). <strong>Seluruh data terbaru Anda setelah 22 Okt 2026 tetap aman di server Firestore dan TIDAK tertimpa.</strong> Hindari menyimpan perubahan pada item lama di bawah ini hingga kuota baca harian kembali normal.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => loadAllAdminData(true)}
                  className="shrink-0 px-3 py-1.5 rounded-md bg-[#4CA7A1] text-[#001722] border-2 border-[#171717] dark:border-[#001722] font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Cek Server</span>
                </button>
              </div>
            </div>
          )}

          {/* HEADER SECTION WITH BREADCRUMB & QUICK ACTION BUTTONS */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-[#171717] dark:border-[#4CA7A1]">
            <div>
              <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-[#A6D6C9] font-bold uppercase tracking-wider mb-1">
                <span>Admin</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#4CA7A1]" />
                <span className="text-[#06251D] dark:text-[#CEFEF1] font-extrabold capitalize">
                  {activeTab === 'dashboard' ? 'Dashboard Overview' : activeTab}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#171717] dark:text-[#FFFFFF] font-serif-brand tracking-tight">
                Dashboard Administrasi Dars with Osama
              </h1>
              <p className="text-stone-600 dark:text-[#A6D6C9] text-xs sm:text-sm mt-0.5 font-medium">
                Kelola kurikulum ilmu, sesi pembelajaran, kuis evaluasi, dan pemantauan santri.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setEditingCourse({
                  title: '',
                  titleAr: '',
                  instructor: '',
                  instructorTitle: '',
                  instructorAr: '',
                  categoryId: categories[0]?.id || '',
                  level: 'beginner',
                  description: '',
                  descriptionAr: '',
                  coverImageUrl: '',
                  isPublished: true,
                  hasCertificate: true,
                  passingGrade: 75,
                  totalDuration: '5 Sesi',
                  order: courses.length + 1
                })}
                className="px-3.5 py-2 nb-btn nb-btn-secondary text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#06251D] dark:text-[#4CA7A1]" />
                <span>+ Mata Pelajaran</span>
              </button>

              <button
                onClick={() => setEditingCategory({
                  name: '',
                  nameAr: '',
                  slug: '',
                  description: '',
                  order: categories.length + 1
                })}
                className="px-3.5 py-2 nb-btn nb-btn-secondary text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#06251D] dark:text-[#4CA7A1]" />
                <span>+ Bab / Modul</span>
              </button>

              <button
                onClick={() => handleOpenAddSessionModal()}
                className="px-4 py-2 nb-btn nb-btn-primary text-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-[#001722]" />
                <span>+ Sesi Baru</span>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* VIEW: DASHBOARD OVERVIEW */}
          {/* ========================================================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fade-in">
              {/* KARTU STATISTIK UTAMA (5 CARDS) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div
                  onClick={() => setActiveTab('courses')}
                  className="nb-card p-4 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#171717] dark:hover:shadow-[6px_6px_0px_#001722] transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-600 dark:text-[#A6D6C9] uppercase tracking-wider">Mata Pelajaran</span>
                    <div className="p-2 bg-[#4CA7A1] text-[#001722] border-2 border-[#171717] dark:border-[#001722] rounded-sm group-hover:scale-110 transition">
                      <BookOpen className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-[#171717] dark:text-[#CEFEF1] mt-2 font-serif-brand">
                    {courses.length}
                  </p>
                  <p className="text-[10px] text-stone-600 dark:text-[#A6D6C9] mt-0.5 font-bold">
                    {courses.filter(c => c.isPublished).length} Terpublikasi
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('categories')}
                  className="nb-card p-4 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#171717] dark:hover:shadow-[6px_6px_0px_#001722] transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-600 dark:text-[#A6D6C9] uppercase tracking-wider">Bab / Modul</span>
                    <div className="p-2 bg-[#4CA7A1] text-[#001722] border-2 border-[#171717] dark:border-[#001722] rounded-sm group-hover:scale-110 transition">
                      <Layers className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-[#171717] dark:text-[#CEFEF1] mt-2 font-serif-brand">
                    {categories.length}
                  </p>
                  <p className="text-[10px] text-stone-600 dark:text-[#A6D6C9] mt-0.5 font-bold">
                    Kategori Matan & Ilmu
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('sessions')}
                  className="nb-card p-4 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#171717] dark:hover:shadow-[6px_6px_0px_#001722] transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-600 dark:text-[#A6D6C9] uppercase tracking-wider">Sesi Belajar</span>
                    <div className="p-2 bg-[#0D2B36] text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] rounded-sm group-hover:scale-110 transition">
                      <Video className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-[#171717] dark:text-[#CEFEF1] mt-2 font-serif-brand">
                    {totalSessionsCount}
                  </p>
                  <p className="text-[10px] text-stone-600 dark:text-[#A6D6C9] mt-0.5 font-bold">
                    Total video & materi
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('users')}
                  className="nb-card p-4 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#171717] dark:hover:shadow-[6px_6px_0px_#001722] transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-600 dark:text-[#A6D6C9] uppercase tracking-wider">Pengguna</span>
                    <div className="p-2 bg-[#001722] text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] rounded-sm group-hover:scale-110 transition">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-[#171717] dark:text-[#CEFEF1] mt-2 font-serif-brand">
                    {users.length}
                  </p>
                  <p className="text-[10px] text-stone-600 dark:text-[#A6D6C9] mt-0.5 font-bold">
                    Santri terdaftar
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('quizzes')}
                  className="nb-card p-4 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#171717] dark:hover:shadow-[6px_6px_0px_#001722] transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-600 dark:text-[#A6D6C9] uppercase tracking-wider">Kuis</span>
                    <div className="p-2 bg-[#4CA7A1] text-[#001722] border-2 border-[#171717] dark:border-[#001722] rounded-sm group-hover:scale-110 transition">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-[#171717] dark:text-[#CEFEF1] mt-2 font-serif-brand">
                    {quizzes.length}
                  </p>
                  <p className="text-[10px] text-stone-600 dark:text-[#A6D6C9] mt-0.5 font-bold">
                    Bank soal evaluasi
                  </p>
                </div>
              </div>

              {/* BAGIAN STATISTIK TAMBAHAN */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="nb-card p-5 flex items-center gap-4">
                  <div className="p-3 bg-[#4CA7A1] text-[#001722] border-2 border-[#171717] dark:border-[#001722] rounded-md shrink-0 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-600 dark:text-[#A6D6C9] font-bold uppercase">Rata-Rata Skor Kuis</p>
                    <p className="text-xl font-extrabold text-[#171717] dark:text-[#CEFEF1] mt-0.5">{averageQuizScore}%</p>
                  </div>
                </div>

                <div className="nb-card p-5 flex items-center gap-4">
                  <div className="p-3 bg-[#001722] text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] rounded-md shrink-0 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-600 dark:text-[#A6D6C9] font-bold uppercase">Tingkat Kelulusan</p>
                    <p className="text-xl font-extrabold text-[#171717] dark:text-[#CEFEF1] mt-0.5">{passRate}%</p>
                  </div>
                </div>

                <div className="nb-card p-5 flex items-center gap-4">
                  <div className="p-3 bg-[#0D2B36] text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] rounded-md shrink-0 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-600 dark:text-[#A6D6C9] font-bold uppercase">Percobaan Kuis</p>
                    <p className="text-xl font-extrabold text-[#171717] dark:text-[#CEFEF1] mt-0.5">{attempts.length}</p>
                  </div>
                </div>

                <div className="nb-card p-5 flex items-center gap-4">
                  <div className="p-3 bg-[#4CA7A1] text-[#001722] border-2 border-[#171717] dark:border-[#001722] rounded-md shrink-0 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-600 dark:text-[#A6D6C9] font-bold uppercase">Status Pembelajaran</p>
                    <p className="text-xl font-extrabold text-[#171717] dark:text-[#CEFEF1] mt-0.5">
                      {courses.filter(c => c.isPublished).length} / {courses.length} Pub
                    </p>
                  </div>
                </div>
              </div>

              {/* STRUKTUR KURIKULUM: MAPEL -> BAB -> SESI */}
              <div className="nb-card p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#171717] dark:border-[#4CA7A1] pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#171717] dark:text-[#FFFFFF] font-serif-brand flex items-center gap-2">
                      <Layers className="w-5 h-5 text-[#4CA7A1]" />
                      <span>Struktur Kurikulum: Mapel → Bab → Sesi Pembelajaran</span>
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-[#A6D6C9] mt-0.5">
                      Hierarki pembelajaran lengkap dari Mata Pelajaran hingga Sesi & Kuis Evaluasi.
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenAddSessionModal()}
                    className="px-4 py-2 nb-btn nb-btn-primary text-xs flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-[#001722]" />
                    <span>+ Tambah Sesi Saja</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {courses.length === 0 ? (
                    <p className="text-xs text-stone-500 dark:text-[#A6D6C9] text-center py-8">Belum ada mata pelajaran terdaftar.</p>
                  ) : (
                    courses.map(crs => {
                      const cat = categories.find(c => c.id === crs.categoryId);
                      const sList = allSessionsMap[crs.id] || [];

                      return (
                        <div key={crs.id} className="border-2 border-[#171717] dark:border-[#4CA7A1] rounded-md p-4 bg-white/70 dark:bg-[#0D2B36] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#001722] space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#171717]/20 dark:border-[#4CA7A1]/50 pb-3">
                            <div className="flex items-center gap-2.5">
                              <span className="w-3 h-3 rounded-xs bg-[#4CA7A1] border border-[#171717] dark:border-[#001722] shrink-0" />
                              <h4 className="font-bold text-[#171717] dark:text-[#CEFEF1] text-sm sm:text-base">
                                {crs.title}
                              </h4>
                              {crs.titleAr && (
                                <span className="font-amiri text-base text-[#06251D] dark:text-[#A6D6C9] font-bold ml-1">
                                  {crs.titleAr}
                                </span>
                              )}
                              <span className="text-[10px] px-2 py-0.5 rounded-sm bg-[#4CA7A1] text-[#001722] border border-[#171717] dark:border-[#001722] font-bold">
                                Bab: {cat?.name || 'Umum'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenAddSessionModal(crs.id)}
                                className="text-xs text-[#06251D] dark:text-[#4CA7A1] hover:underline font-extrabold flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Tambah Sesi</span>
                              </button>
                              <button
                                onClick={() => setEditingCourse(crs)}
                                className="p-1.5 text-stone-700 dark:text-[#CEFEF1] hover:text-[#4CA7A1] transition"
                                title="Edit Kursus"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Sessions List in Course */}
                          <div className="pl-2 sm:pl-4 space-y-2">
                            {sList.length === 0 ? (
                              <p className="text-xs text-stone-500 dark:text-[#A6D6C9] italic py-1">Belum ada sesi pada mata pelajaran ini.</p>
                            ) : (
                              sList.map(s => (
                                <div key={s.id} className="flex flex-wrap items-center justify-between p-2.5 bg-white dark:bg-[#1F5F63] rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] text-xs gap-2 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] hover:border-[#CEFEF1] transition">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="w-6 h-6 rounded-sm bg-[#4CA7A1] text-[#001722] border border-[#171717] dark:border-[#001722] font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                                      {s.order}
                                    </span>
                                    <div className="truncate">
                                      <p className="font-bold text-[#171717] dark:text-[#CEFEF1] truncate">
                                        {s.title}
                                      </p>
                                      {s.titleAr && (
                                        <p className="font-amiri text-xs text-[#06251D] dark:text-[#A6D6C9] font-bold truncate">
                                          {s.titleAr}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {s.youtubeUrl && (
                                      <span className="px-2 py-0.5 rounded-sm bg-[#C94A4A] text-white border border-[#171717] text-[10px] font-bold flex items-center gap-1">
                                        <Video className="w-3 h-3" /> YouTube
                                      </span>
                                    )}
                                    {s.pdfUrl && (
                                      <span className="px-2 py-0.5 rounded-sm bg-[#4CA7A1] text-[#001722] border border-[#171717] dark:border-[#001722] text-[10px] font-bold flex items-center gap-1">
                                        <FileText className="w-3 h-3" /> PDF
                                      </span>
                                    )}
                                    {s.googleDriveUrl && (
                                      <span className="px-2 py-0.5 rounded-sm bg-[#001722] text-[#CEFEF1] border border-[#171717] dark:border-[#4CA7A1] text-[10px] font-bold flex items-center gap-1">
                                        <ExternalLink className="w-3 h-3" /> Drive
                                      </span>
                                    )}
                                    {s.quizId && (
                                      <span className="px-2 py-0.5 rounded-sm bg-[#0D2B36] text-[#CEFEF1] border border-[#171717] dark:border-[#4CA7A1] text-[10px] font-extrabold flex items-center gap-1">
                                        <HelpCircle className="w-3 h-3" /> Kuis Sesi
                                      </span>
                                    )}

                                    <button
                                      onClick={() => handleOpenEditSessionModal(s)}
                                      className="p-1.5 text-stone-700 dark:text-[#CEFEF1] hover:text-[#4CA7A1] transition cursor-pointer"
                                      title="Edit Sesi & Kuis"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSession(s)}
                                      className="p-1.5 text-[#C94A4A] hover:opacity-80 transition cursor-pointer"
                                      title="Hapus Sesi"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* AKTIVITAS TERBARU & ATTEMPTS */}
              <div className="nb-card p-6 space-y-4">
                <h3 className="text-base font-bold text-[#171717] dark:text-[#FFFFFF] font-serif-brand flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#4CA7A1]" />
                  <span>Aktivitas Hasil Kuis Santri Terbaru</span>
                </h3>

                {attempts.length === 0 ? (
                  <p className="text-xs text-stone-500 dark:text-[#A6D6C9] py-4 italic">Belum ada pengerjaan kuis oleh santri.</p>
                ) : (
                  <div className="space-y-2">
                    {attempts.slice(0, 5).map(att => (
                      <div key={att.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#0D2B36] rounded-md text-xs border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]">
                        <div>
                          <p className="font-bold text-[#171717] dark:text-[#CEFEF1]">
                            {att.userName || att.userEmail}
                          </p>
                          <p className="text-[10px] text-stone-500 dark:text-[#A6D6C9] font-semibold">
                            Disubmit: {new Date(att.submittedAt).toLocaleString('id-ID')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-sm text-xs font-extrabold border-2 border-[#171717] dark:border-[#001722] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] ${
                            att.passed
                              ? 'bg-[#4CA7A1] text-[#001722]'
                              : 'bg-[#C94A4A] text-white'
                          }`}>
                            Skor: {att.score}% ({att.passed ? 'Lulus' : 'Belum Lulus'})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW: MATA PELAJARAN (COURSES) */}
          {/* ========================================================= */}
          {activeTab === 'courses' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#171717] dark:text-[#FFFFFF] font-serif-brand">
                  Daftar Mata Pelajaran ({courses.length})
                </h2>
                <button
                  onClick={() => setEditingCourse({
                    title: '',
                    titleAr: '',
                    instructor: '',
                    instructorTitle: '',
                    instructorAr: '',
                    categoryId: categories[0]?.id || '',
                    level: 'beginner',
                    description: '',
                    descriptionAr: '',
                    coverImageUrl: '',
                    isPublished: true,
                    hasCertificate: true,
                    passingGrade: 75,
                    totalDuration: '5 Sesi',
                    order: courses.length + 1
                  })}
                  className="px-4 py-2 nb-btn nb-btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#001722]" />
                  <span>+ Tambah Mata Pelajaran</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedCourses.map(course => (
                  <div key={course.id} className="nb-card overflow-hidden flex flex-col justify-between">
                    <div className="p-5 space-y-3">
                      <div className="aspect-video w-full rounded-xs bg-[#001722] overflow-hidden relative border-2 border-[#171717] dark:border-[#4CA7A1]">
                        {course.coverImageUrl ? (
                          <img src={course.coverImageUrl} alt={course.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#4CA7A1]">
                            <BookOpen className="w-8 h-8" />
                          </div>
                        )}
                        <span className={`absolute top-2 right-2 text-[10px] font-extrabold px-2 py-0.5 rounded-sm border-2 border-[#171717] dark:border-[#001722] uppercase tracking-wider ${
                          course.isPublished ? 'bg-[#4CA7A1] text-[#001722]' : 'bg-[#001722] text-[#A6D6C9] border-[#4CA7A1]'
                        }`}>
                          {course.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-[#171717] dark:text-[#CEFEF1] text-base font-serif-brand">
                          {course.title}
                        </h3>
                        {course.titleAr && (
                          <p className="font-amiri text-lg text-[#06251D] dark:text-[#A6D6C9] font-bold mt-1">
                            {course.titleAr}
                          </p>
                        )}
                        <p className="text-xs text-stone-600 dark:text-[#A6D6C9] mt-1 line-clamp-2 font-medium">
                          {course.description}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 border-t-2 border-[#171717] dark:border-[#4CA7A1] bg-stone-100/60 dark:bg-[#0D2B36] flex items-center justify-between">
                      <span className="text-[11px] font-bold text-stone-700 dark:text-[#A6D6C9]">
                        {allSessionsMap[course.id]?.length || 0} Sesi
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenAddSessionModal(course.id)}
                          className="px-2.5 py-1 nb-btn nb-btn-gold text-xs"
                        >
                          + Sesi
                        </button>
                        <button
                          onClick={() => setEditingCourse(course)}
                          className="p-1.5 text-stone-700 dark:text-[#CEFEF1] hover:text-[#4CA7A1] transition cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(course)}
                          className="p-1.5 text-[#C94A4A] hover:opacity-80 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW: BAB / MODUL (CATEGORIES) */}
          {/* ========================================================= */}
          {activeTab === 'categories' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#171717] dark:text-[#FFFFFF] font-serif-brand">
                  Daftar Bab / Modul / Kategori ({categories.length})
                </h2>
                <button
                  onClick={() => setEditingCategory({
                    name: '',
                    nameAr: '',
                    slug: '',
                    description: '',
                    order: categories.length + 1
                  })}
                  className="px-4 py-2 nb-btn nb-btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#001722]" />
                  <span>+ Tambah Bab / Modul</span>
                </button>
              </div>

              <div className="nb-card overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#06251D] dark:bg-[#001722] text-[#FAF7F0] dark:text-[#CEFEF1] border-b-2 border-[#171717] dark:border-[#4CA7A1] font-extrabold uppercase tracking-wider">
                      <th className="p-3.5">Urutan</th>
                      <th className="p-3.5">Nama Bab / Modul</th>
                      <th className="p-3.5">Nama Arab</th>
                      <th className="p-3.5">Slug</th>
                      <th className="p-3.5">Deskripsi</th>
                      <th className="p-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-[#171717]/10 dark:divide-[#4CA7A1]/50">
                    {displayedCategories.map(cat => (
                      <tr key={cat.id} className="bg-white dark:bg-[#0D2B36] even:dark:bg-[#1F5F63]/70 hover:bg-[#FAF7F0] dark:hover:bg-[#1F5F63] transition">
                        <td className="p-3.5 font-extrabold text-[#171717] dark:text-[#CEFEF1]">{cat.order}</td>
                        <td className="p-3.5 font-bold text-[#171717] dark:text-[#CEFEF1]">{cat.name}</td>
                        <td className="p-3.5 font-amiri text-base font-bold text-[#06251D] dark:text-[#A6D6C9]">{cat.nameAr}</td>
                        <td className="p-3.5 font-mono text-[11px] text-stone-600 dark:text-[#A6D6C9]">{cat.slug}</td>
                        <td className="p-3.5 text-stone-600 dark:text-[#A6D6C9] max-w-xs truncate">{cat.description}</td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingCategory(cat)}
                              className="p-1.5 text-stone-700 dark:text-[#CEFEF1] hover:text-[#4CA7A1] transition cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat)}
                              className="p-1.5 text-[#C94A4A] hover:opacity-80 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW: SESI PEMBELAJARAN (SESSIONS) */}
          {/* ========================================================= */}
          {activeTab === 'sessions' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 nb-card p-4">
                <div>
                  <label className="text-xs font-bold text-stone-700 dark:text-[#A6D6C9] block mb-1 uppercase tracking-wider">
                    Pilih Mata Pelajaran:
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="nb-input px-3.5 py-2 text-xs font-bold"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => handleOpenAddSessionModal(selectedCourseId)}
                  className="px-4 py-2 nb-btn nb-btn-primary text-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4 text-[#001722]" />
                  <span>+ Tambah Sesi Pembelajaran Baru</span>
                </button>
              </div>

              {/* Sessions Table */}
              <div className="nb-card overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#06251D] dark:bg-[#001722] text-[#FAF7F0] dark:text-[#CEFEF1] border-b-2 border-[#171717] dark:border-[#4CA7A1] font-extrabold uppercase tracking-wider">
                      <th className="p-3.5">Urutan</th>
                      <th className="p-3.5">Judul Sesi</th>
                      <th className="p-3.5">Video YouTube</th>
                      <th className="p-3.5">Materi PDF & Drive</th>
                      <th className="p-3.5">Kuis Sesi</th>
                      <th className="p-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-[#171717]/10 dark:divide-[#4CA7A1]/50">
                    {displayedCourseSessions.length === 0 ? (
                      <tr className="bg-white dark:bg-[#0D2B36]">
                        <td colSpan={6} className="p-8 text-center text-stone-500 dark:text-[#A6D6C9] font-semibold">
                          Belum ada sesi pembelajaran untuk mata pelajaran ini. Klik "+ Tambah Sesi Pembelajaran Baru".
                        </td>
                      </tr>
                    ) : (
                      displayedCourseSessions.map(s => (
                        <tr key={s.id} className="bg-white dark:bg-[#0D2B36] even:dark:bg-[#1F5F63]/70 hover:bg-[#FAF7F0] dark:hover:bg-[#1F5F63] transition">
                          <td className="p-3.5 font-extrabold text-[#171717] dark:text-[#CEFEF1]">{s.order}</td>
                          <td className="p-3.5">
                            <p className="font-bold text-[#171717] dark:text-[#CEFEF1]">{s.title}</p>
                            {s.titleAr && (
                              <p className="font-amiri text-sm text-[#06251D] dark:text-[#A6D6C9] font-bold">{s.titleAr}</p>
                            )}
                          </td>
                          <td className="p-3.5">
                            {s.youtubeUrl ? (
                              <span className="text-[#06251D] dark:text-[#CEFEF1] font-extrabold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5 text-[#4CA7A1]" /> Ada Video
                              </span>
                            ) : (
                              <span className="text-stone-400 dark:text-[#A6D6C9]">-</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              {s.pdfUrl && (
                                <span className="text-[#06251D] dark:text-[#CEFEF1] font-bold block">
                                  • {s.pdfTitle || 'Naskah PDF'}
                                </span>
                              )}
                              {s.googleDriveUrl && (
                                <span className="text-[#4CA7A1] font-bold block">
                                  • Drive PDF Link
                                </span>
                              )}
                              {!s.pdfUrl && !s.googleDriveUrl && <span className="text-stone-400 dark:text-[#A6D6C9]">-</span>}
                            </div>
                          </td>
                          <td className="p-3.5">
                            {s.quizId ? (
                              <span className="px-2 py-0.5 rounded-sm bg-[#4CA7A1] text-[#001722] border border-[#171717] dark:border-[#001722] font-extrabold text-[10px]">
                                Kuis Aktif
                              </span>
                            ) : (
                              <span className="text-stone-400 dark:text-[#A6D6C9] font-medium">Tidak ada kuis</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditSessionModal(s)}
                                className="px-2.5 py-1 nb-btn nb-btn-gold text-xs"
                              >
                                Edit Sesi & Kuis
                              </button>
                              <button
                                onClick={() => handleDeleteSession(s)}
                                className="p-1.5 text-[#C94A4A] hover:opacity-80 transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW: KUIS EVALUASI (QUIZZES BANK) */}
          {/* ========================================================= */}
          {activeTab === 'quizzes' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#171717] dark:text-[#FFFFFF] font-serif-brand">
                  Bank Kuis Evaluasi ({quizzes.length})
                </h2>
                <button
                  onClick={() => setEditingQuiz({
                    title: '',
                    titleAr: '',
                    courseId: courses[0]?.id || '',
                    sessionId: '',
                    description: '',
                    passingScore: 75,
                    timeLimitMinutes: 0,
                    maxAttempts: 3,
                    showAnswersAfterSubmit: true,
                    isPublished: true,
                    questions: []
                  })}
                  className="px-4 py-2 nb-btn nb-btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#001722]" />
                  <span>+ Tambah Kuis Bebas</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedQuizzes.map(q => {
                  const linkedCourse = courses.find(c => c.id === q.courseId);

                  return (
                    <div key={q.id} className="nb-card p-5 space-y-4 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-sm bg-[#4CA7A1] text-[#001722] border border-[#171717] dark:border-[#001722]">
                            {linkedCourse?.title || 'Umum'}
                          </span>
                          <span className="text-xs font-extrabold text-[#06251D] dark:text-[#CEFEF1]">
                            Pass: {q.passingScore}%
                          </span>
                        </div>

                        <h3 className="font-bold text-[#171717] dark:text-[#CEFEF1] text-base font-serif-brand">
                          {q.title}
                        </h3>

                        <p className="text-xs text-stone-600 dark:text-[#A6D6C9] font-semibold">
                          Jumlah Soal: <strong className="text-[#171717] dark:text-[#CEFEF1]">{q.questions?.length || 0} Soal</strong>
                        </p>
                      </div>

                      <div className="pt-3 border-t-2 border-[#171717]/20 dark:border-[#4CA7A1]/50 flex items-center justify-between">
                        <span className="text-[11px] font-mono text-stone-500 dark:text-[#A6D6C9]">ID: {q.id}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingQuiz(q)}
                            className="p-1.5 text-stone-700 dark:text-[#CEFEF1] hover:text-[#4CA7A1] transition cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuiz(q)}
                            className="p-1.5 text-[#C94A4A] hover:opacity-80 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW: BLOG & ARTIKEL */}
          {/* ========================================================= */}
          {activeTab === 'blog' && (
            <AdminBlogManager
              posts={blogPosts}
              onRefreshPosts={async () => {
                const updated = await getBlogPosts(true, true);
                setBlogPosts(updated);
                if (onRefreshData) onRefreshData();
              }}
              onPreviewPost={(post) => {
                if (onPreviewBlogPost) {
                  onPreviewBlogPost(post);
                }
              }}
              onNavigateToComments={(articleId) => {
                if (articleId) setSelectedArticleIdForComments(articleId);
                setActiveTab('comments');
              }}
            />
          )}

          {/* ========================================================= */}
          {/* VIEW: MODERASI KOMENTAR PEMBACA ARTIKEL */}
          {/* ========================================================= */}
          {activeTab === 'comments' && (
            <div className="animate-fade-in">
              <AdminCommentsManager
                posts={blogPosts}
                initialArticleFilter={selectedArticleIdForComments}
                onNavigateToPost={(post) => {
                  if (onPreviewBlogPost) {
                    onPreviewBlogPost(post);
                  }
                }}
              />
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW: PENGGUNA TERDAFTAR */}
          {/* ========================================================= */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-stone-900 dark:text-[#FFFFFF] tracking-tight">
                    Daftar Santri / Pengguna Terdaftar ({users.length})
                  </h2>
                  <p className="text-xs text-stone-600 dark:text-[#A6D6C9] mt-1">
                    Seluruh akun santri dan pengajar yang terdaftar di sistem.
                  </p>
                </div>
                <span className="nb-badge bg-[#4CA7A1] text-[#001722] border-[#171717] dark:border-[#001722]">
                  {users.length} Akun
                </span>
              </div>

              <div className="nb-card overflow-hidden p-0">
                <div className="overflow-x-auto w-full">
                  <table className="w-full min-w-[550px] text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#06251D] dark:bg-[#001722] border-b-2 border-[#171717] dark:border-[#4CA7A1] text-[#FAF7F0] dark:text-[#CEFEF1] font-black uppercase tracking-wider">
                        <th className="p-3.5 whitespace-nowrap">Nama</th>
                        <th className="p-3.5 whitespace-nowrap">Email</th>
                        <th className="p-3.5 whitespace-nowrap">Peran (Role)</th>
                        <th className="p-3.5 whitespace-nowrap">Kunyah / Bio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-stone-200 dark:divide-[#4CA7A1]/50">
                      {displayedUsers.map(u => (
                        <tr key={u.id} className="bg-white dark:bg-[#0D2B36] even:dark:bg-[#1F5F63]/70 hover:bg-[#FAF7F0] dark:hover:bg-[#1F5F63] transition">
                          <td className="p-3.5 font-bold text-stone-900 dark:text-[#CEFEF1] whitespace-nowrap">{u.displayName || 'Santri'}</td>
                          <td className="p-3.5 font-mono text-stone-600 dark:text-[#A6D6C9] break-all">{u.email}</td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide border-2 ${
                              u.role === 'admin' 
                                ? 'bg-[#4CA7A1] text-[#001722] border-[#171717] dark:border-[#001722]' 
                                : 'bg-[#FAF7F0] text-[#06251D] border-[#171717] dark:bg-[#001722] dark:text-[#A6D6C9] dark:border-[#4CA7A1]'
                            }`}>
                              {u.role || 'student'}
                            </span>
                          </td>
                          <td className="p-3.5 text-stone-500 dark:text-[#A6D6C9]">{u.kunyah || u.bio || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW: HASIL KUIS & NILAI (ATTEMPTS) */}
          {/* ========================================================= */}
          {activeTab === 'attempts' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-stone-900 dark:text-[#FFFFFF] tracking-tight">
                    Hasil & Rekapitulasi Nilai Kuis Santri ({attempts.length})
                  </h2>
                  <p className="text-xs text-stone-600 dark:text-[#A6D6C9] mt-1">
                    Riwayat pengerjaan evaluasi dan evaluasi kelulusan santri secara real-time.
                  </p>
                </div>
                <span className="nb-badge bg-white dark:bg-[#1F5F63] text-stone-800 dark:text-[#CEFEF1] border-[#171717] dark:border-[#4CA7A1]">
                  {attempts.length} Pengerjaan
                </span>
              </div>

              <div className="nb-card overflow-hidden p-0">
                <div className="overflow-x-auto w-full">
                  <table className="w-full min-w-[550px] text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#06251D] dark:bg-[#001722] border-b-2 border-[#171717] dark:border-[#4CA7A1] text-[#FAF7F0] dark:text-[#CEFEF1] font-black uppercase tracking-wider">
                        <th className="p-3.5 whitespace-nowrap">Nama Santri</th>
                        <th className="p-3.5 whitespace-nowrap">Email</th>
                        <th className="p-3.5 whitespace-nowrap">Skor</th>
                        <th className="p-3.5 whitespace-nowrap">Status</th>
                        <th className="p-3.5 whitespace-nowrap">Waktu Submit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-stone-200 dark:divide-[#4CA7A1]/50">
                      {displayedAttempts.map(att => (
                        <tr key={att.id} className="bg-white dark:bg-[#0D2B36] even:dark:bg-[#1F5F63]/70 hover:bg-[#FAF7F0] dark:hover:bg-[#1F5F63] transition">
                          <td className="p-3.5 font-bold text-stone-900 dark:text-[#CEFEF1] whitespace-nowrap">{att.userName || 'Santri'}</td>
                          <td className="p-3.5 font-mono text-stone-600 dark:text-[#A6D6C9] break-all">{att.userEmail}</td>
                          <td className="p-3.5 font-black text-stone-900 dark:text-[#CEFEF1] text-sm">{att.score}%</td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide border-2 ${
                              att.passed 
                                ? 'bg-[#4CA7A1] text-[#001722] border-[#171717] dark:border-[#001722]' 
                                : 'bg-[#C94A4A] text-white border-[#171717]'
                            }`}>
                              {att.passed ? 'Lulus' : 'Belum Lulus'}
                            </span>
                          </td>
                          <td className="p-3.5 text-stone-500 dark:text-[#A6D6C9] whitespace-nowrap">{new Date(att.submittedAt).toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW: FIREBASE STATUS & DATA MANAGEMENT */}
          {/* ========================================================= */}
          {activeTab === 'firebase' && (() => {
            const storageSnapshot: Record<string, string> = {};
            if (typeof window !== 'undefined' && window.localStorage) {
              for (let i = 0; i < window.localStorage.length; i++) {
                const k = window.localStorage.key(i);
                if (k) {
                  storageSnapshot[k] = window.localStorage.getItem(k) || '';
                }
              }
            }
            const localAudit = auditBrowserStorageEntries(storageSnapshot);

            const handleDownloadFullBackup = () => {
              const payload = {
                exportedAt: new Date().toISOString(),
                projectId: firebaseConfig.projectId,
                firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
                collections: {
                  categories,
                  courses,
                  sessionsByCourse: allSessionsMap,
                  quizzes,
                  blogPosts,
                  users,
                  quizAttempts: attempts
                },
                localStorageAudit: localAudit
              };
              const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `dars-backup-${new Date().toISOString().slice(0, 10)}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              showStatus('success', 'Cadangan data lengkap (Server + Lokal) berhasil diunduh sebagai berkas JSON.');
            };

            return (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-xl font-black text-stone-900 dark:text-white tracking-tight">
                    Status Integrasi Cloud Firestore & Pencadangan Data
                  </h2>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                    Pantau konektivitas basis data, pencadangan berkas JSON, dan audit penyimpanan lokal browser.
                  </p>
                </div>

                <div className="nb-card p-6 space-y-5">
                  <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b-2 border-stone-200 dark:border-stone-800">
                    <div className="flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#171717] animate-pulse" />
                      <div>
                        <p className="font-black text-sm text-[#06251D] dark:text-white">
                          Cloud Firestore Terhubung Persisten
                        </p>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          Sumber data utama lintas perangkat terverifikasi aktif
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadFullBackup}
                      className="nb-btn nb-btn-gold text-xs flex items-center gap-1.5 cursor-pointer py-2 px-4"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh Cadangan Data (Backup JSON)</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-md bg-[#F8F3E8] dark:bg-[#0B3026] border-2 border-[#171717] dark:border-[#D9AC45]/40 text-xs space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-bold text-[#06251D] dark:text-stone-200">
                        Target Named Database ID: <code className="px-2 py-0.5 bg-white dark:bg-[#06251D] text-[#06251D] dark:text-[#D9AC45] border border-[#171717] dark:border-[#D9AC45]/50 rounded font-mono text-[11px] font-bold">{firebaseConfig.firestoreDatabaseId}</code>
                      </span>
                      <span className="nb-badge bg-emerald-100 text-emerald-900 border-[#171717] dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-400">
                        Named Database Terverifikasi
                      </span>
                    </div>
                    {(() => {
                      const diag = getLatestFirestoreDiagnostic();
                      if (!diag) {
                        return (
                          <p className="text-[11px] text-stone-600 dark:text-stone-400">
                            Status kueri: Normal • Seluruh pembacaan database ditujukan langsung ke named database produksi.
                          </p>
                        );
                      }
                      return (
                        <div className="text-[11px] text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 p-2.5 rounded-md border-2 border-[#171717] dark:border-amber-400/50 mt-1 font-medium">
                          <strong>Diagnostik Terakhir ({diag.category}):</strong> {diag.summary} (Kode: {diag.code})
                        </div>
                      );
                    })()}
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-medium">
                    Seluruh data artikel, tanya jawab konsultasi, video pembelajaran, kurikulum, kuis evaluasi, dan profil pengajar disimpan secara persisten di Cloud Firestore project ID: <strong className="text-stone-900 dark:text-white font-mono">{firebaseConfig.projectId}</strong> (Database: <strong className="text-stone-900 dark:text-white font-mono">{firebaseConfig.firestoreDatabaseId}</strong>). Penyimpanan lokal browser tidak pernah menimpa data server secara otomatis.
                  </p>

                  {/* Live Server Data Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
                    <div className="p-3.5 rounded-md bg-[#F8F3E8] dark:bg-[#0B3026] border-2 border-[#171717] dark:border-[#D9AC45]/40 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#06251D]">
                      <div className="text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider">Bab/Kategori</div>
                      <div className="text-lg font-black text-stone-900 dark:text-white mt-1">{categories.length}</div>
                    </div>
                    <div className="p-3.5 rounded-md bg-[#F8F3E8] dark:bg-[#0B3026] border-2 border-[#171717] dark:border-[#D9AC45]/40 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#06251D]">
                      <div className="text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider">Mata Pelajaran</div>
                      <div className="text-lg font-black text-stone-900 dark:text-white mt-1">{courses.length}</div>
                    </div>
                    <div className="p-3.5 rounded-md bg-[#F8F3E8] dark:bg-[#0B3026] border-2 border-[#171717] dark:border-[#D9AC45]/40 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#06251D]">
                      <div className="text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider">Video / Sesi</div>
                      <div className="text-lg font-black text-stone-900 dark:text-white mt-1">{totalSessionsCount}</div>
                    </div>
                    <div className="p-3.5 rounded-md bg-[#F8F3E8] dark:bg-[#0B3026] border-2 border-[#171717] dark:border-[#D9AC45]/40 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#06251D]">
                      <div className="text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider">Kuis Evaluasi</div>
                      <div className="text-lg font-black text-stone-900 dark:text-white mt-1">{quizzes.length}</div>
                    </div>
                    <div className="p-3.5 rounded-md bg-[#F8F3E8] dark:bg-[#0B3026] border-2 border-[#171717] dark:border-[#D9AC45]/40 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#06251D]">
                      <div className="text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider">Artikel Asli</div>
                      <div className="text-lg font-black text-[#D9AC45] mt-1">{blogPosts.length}</div>
                    </div>
                    <div className="p-3.5 rounded-md bg-[#F8F3E8] dark:bg-[#0B3026] border-2 border-[#171717] dark:border-[#D9AC45]/40 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#06251D]">
                      <div className="text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider">Akun Santri</div>
                      <div className="text-lg font-black text-stone-900 dark:text-white mt-1">{users.length}</div>
                    </div>
                  </div>

                  <div className="pt-4 border-t-2 border-stone-200 dark:border-stone-800 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: 'Hapus Data Contoh (Dummy)',
                          itemName: 'Pembersihan Dokumen Prototype & Artikel Dummy',
                          message: 'Menghapus dokumen contoh bawaan (termasuk post-1 dan post-2 jika ada) tanpa menyentuh artikel, kursus, atau sesi produksi asli Anda.',
                          loading: false,
                          onConfirm: async () => {
                            setConfirmDialog(prev => ({ ...prev, loading: true }));
                            try {
                              await deleteSeedDummyDataFromFirestore();
                              showStatus('success', 'Pembersihan data contoh selesai. Seluruh konten produksi asli tetap aman.');
                              await loadAllAdminData();
                              onRefreshData();
                              setConfirmDialog(prev => ({ ...prev, isOpen: false, loading: false }));
                            } catch (err: any) {
                              showStatus('error', 'Gagal menghapus: ' + err.message);
                              setConfirmDialog(prev => ({ ...prev, loading: false }));
                            }
                          }
                        });
                      }}
                      className="nb-btn nb-btn-secondary text-xs cursor-pointer py-2 px-4"
                    >
                      Bersihkan Data Contoh (Dummy)
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        invalidateServicesCache('all');
                        await loadAllAdminData(true);
                        onRefreshData();
                        showStatus('success', 'Data berhasil disinkronkan ulang dari Cloud Firestore.');
                      }}
                      className="nb-btn nb-btn-primary text-xs flex items-center gap-1.5 cursor-pointer py-2 px-4"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Sinkronkan Ulang dari Server</span>
                    </button>
                  </div>
                </div>

                {/* Browser LocalStorage Audit Panel */}
                <div className="nb-card p-6 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="font-black text-sm text-stone-900 dark:text-white">
                        Audit Penyimpanan Lokal Browser Ini (localStorage)
                      </h3>
                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                        Memeriksa apakah terdapat data lama yang tersimpan secara lokal di browser ini ({localAudit.totalKeys} kunci terdeteksi).
                      </p>
                    </div>
                    <span className="nb-badge bg-emerald-100 text-emerald-900 border-[#171717] dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-400">
                      Aman • Tidak Menimpa Server
                    </span>
                  </div>

                  {localAudit.entries.length === 0 ? (
                    <p className="text-xs text-stone-500 italic">Tidak ada item localStorage pada browser ini.</p>
                  ) : (
                    <div className="divide-y-2 divide-stone-200 dark:divide-stone-800 border-2 border-[#171717] dark:border-[#D9AC45]/40 rounded-md overflow-hidden text-xs">
                      {localAudit.entries.map((entry) => (
                        <div key={entry.key} className="p-3 flex items-center justify-between gap-4 bg-stone-50/60 dark:bg-[#0B3026]/40">
                          <div>
                            <div className="font-mono font-bold text-[#06251D] dark:text-[#D9AC45]">{entry.key}</div>
                            <div className="text-[11px] text-stone-500 dark:text-stone-400">{entry.summary}</div>
                          </div>
                          <span className="text-[11px] font-mono text-stone-400 shrink-0">{entry.sizeBytes} B</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          {/* ========================================================= */}
          {/* VIEW: CONSULTATION & Q&A MANAGER */}
          {/* ========================================================= */}
          {activeTab === 'consultation' && (
            <div className="animate-fade-in">
              <AdminConsultationManager />
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW: INSTRUCTOR PROFILE MANAGER */}
          {/* ========================================================= */}
          {activeTab === 'instructor-profile' && (
            <div className="animate-fade-in">
              <AdminInstructorProfileManager
                onOpenPublicProfile={onNavigateToInstructorProfile}
              />
            </div>
          )}
        </main>
        </div>

      {/* ========================================================= */}
      {/* 3. MULTI-STEP MODAL: FORM "TAMBAH / EDIT SESI PEMBELAJARAN BARU" */}
      {/* ========================================================= */}
      {editingSessionModalOpen && (
        <div className="fixed inset-0 z-70 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-[#06251D] border-3 border-[#171717] dark:border-[#D9AC45] w-full max-w-3xl rounded-md shadow-[8px_8px_0px_#171717] overflow-hidden my-8 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b-2 border-[#171717] dark:border-[#D9AC45]/40 flex items-center justify-between bg-stone-100 dark:bg-[#0B3026] shrink-0">
              <div>
                <h3 className="text-lg font-black text-[#06251D] dark:text-white flex items-center gap-2">
                  <Video className="w-5 h-5 text-[#D9AC45]" />
                  <span>{sessionFormData.id ? 'Edit Sesi Pembelajaran' : 'Tambah Sesi Pembelajaran Baru'}</span>
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
                  Isi informasi sesi, video YouTube, PDF/Drive, materi teks, dan kuis evaluasi dalam SATU sesi ini.
                </p>
              </div>

              <button
                onClick={() => setEditingSessionModalOpen(false)}
                className="p-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white border-2 border-transparent hover:border-[#171717] rounded-md transition"
                aria-label="Tutup modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 4 Tabs Navigation Bar */}
            <div className="flex border-b-2 border-[#171717] dark:border-[#D9AC45]/40 bg-stone-200/80 dark:bg-[#0B3026] text-xs font-black uppercase tracking-wider shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setSessionFormTab(1)}
                className={`flex-1 min-w-[130px] py-3.5 px-4 text-center border-b-3 transition cursor-pointer ${
                  sessionFormTab === 1
                    ? 'border-[#D9AC45] text-[#06251D] dark:text-[#D9AC45] bg-white dark:bg-[#06251D]'
                    : 'border-transparent text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
                }`}
              >
                1. Info Sesi
              </button>
              <button
                type="button"
                onClick={() => setSessionFormTab(2)}
                className={`flex-1 min-w-[130px] py-3.5 px-4 text-center border-b-3 transition cursor-pointer ${
                  sessionFormTab === 2
                    ? 'border-[#D9AC45] text-[#06251D] dark:text-[#D9AC45] bg-white dark:bg-[#06251D]'
                    : 'border-transparent text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
                }`}
              >
                2. Video & PDF
              </button>
              <button
                type="button"
                onClick={() => setSessionFormTab(3)}
                className={`flex-1 min-w-[130px] py-3.5 px-4 text-center border-b-3 transition cursor-pointer ${
                  sessionFormTab === 3
                    ? 'border-[#D9AC45] text-[#06251D] dark:text-[#D9AC45] bg-white dark:bg-[#06251D]'
                    : 'border-transparent text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
                }`}
              >
                3. Materi Teks
              </button>
              <button
                type="button"
                onClick={() => setSessionFormTab(4)}
                className={`flex-1 min-w-[130px] py-3.5 px-4 text-center border-b-3 transition cursor-pointer ${
                  sessionFormTab === 4
                    ? 'border-[#D9AC45] text-[#06251D] dark:text-[#D9AC45] bg-white dark:bg-[#06251D]'
                    : 'border-transparent text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
                }`}
              >
                4. Kuis ({sessionFormData.enableQuiz ? `${sessionFormData.questions.length} Soal` : 'Non-aktif'})
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveMultiStepSession} className="p-6 space-y-6 overflow-y-auto flex-1">
              {statusMessage && (
                <div className={`p-3.5 rounded-md border-2 border-[#171717] dark:border-[#D9AC45] text-xs sm:text-sm font-bold flex items-center gap-3 animate-fade-in ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-200'
                    : 'bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-200'
                }`}>
                  {statusMessage.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
                  <span>{statusMessage.text}</span>
                </div>
              )}
              {/* TAB 1: INFORMASI SESI */}
              {sessionFormTab === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 block mb-1.5">
                      Mata Pelajaran (Course) <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={sessionFormData.courseId}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, courseId: e.target.value })}
                      className="nb-input font-bold"
                      required
                    >
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 block mb-1.5">
                        Judul Sesi (Bahasa Indonesia) <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={sessionFormData.title}
                        onChange={(e) => setSessionFormData({ ...sessionFormData, title: e.target.value })}
                        placeholder="Contoh: Sesi 1 - Pengantar Kitab"
                        className="nb-input font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 block mb-1.5">
                        Judul Sesi (Bahasa Arab / Matan)
                      </label>
                      <input
                        type="text"
                        value={sessionFormData.titleAr}
                        onChange={(e) => setSessionFormData({ ...sessionFormData, titleAr: e.target.value })}
                        placeholder="المجلس الأول - مقدمة الكتاب"
                        dir="rtl"
                        className="nb-input font-bold text-emerald-700 dark:text-emerald-400 font-amiri text-base"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 block mb-1.5">
                      Deskripsi Ringkas Sesi
                    </label>
                    <textarea
                      rows={3}
                      value={sessionFormData.description}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, description: e.target.value })}
                      placeholder="Penjelasan singkat pokok bahasan pada sesi ini..."
                      className="nb-input"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 block mb-1.5">
                        Urutan Sesi (#)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={sessionFormData.order}
                        onChange={(e) => setSessionFormData({ ...sessionFormData, order: Number(e.target.value) || 1 })}
                        className="nb-input font-black"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 block mb-1.5">
                        Estimasi Durasi (Menit)
                      </label>
                      <input
                        type="number"
                        min={5}
                        value={sessionFormData.durationMinutes}
                        onChange={(e) => setSessionFormData({ ...sessionFormData, durationMinutes: Number(e.target.value) || 45 })}
                        className="nb-input font-black"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 block mb-1.5">
                        Status Publikasi
                      </label>
                      <select
                        value={sessionFormData.isPublished ? 'published' : 'draft'}
                        onChange={(e) => setSessionFormData({ ...sessionFormData, isPublished: e.target.value === 'published' })}
                        className="nb-input font-bold"
                      >
                        <option value="published">Published (Aktif)</option>
                        <option value="draft">Draft (Tersembunyi)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: VIDEO & PDF & DRIVE */}
              {sessionFormTab === 2 && (
                <div className="space-y-6 animate-fade-in">
                  {/* YouTube Video Section */}
                  <div className="space-y-3 bg-[#F8F3E8] dark:bg-[#0B3026] p-4 rounded-md border-2 border-[#171717] dark:border-[#D9AC45]/40 shadow-[2px_2px_0px_#171717]">
                    <h4 className="font-black text-xs uppercase tracking-wider text-stone-900 dark:text-white flex items-center gap-2">
                      <Video className="w-4 h-4 text-rose-600" />
                      <span>Video Rekaman Pembelajaran (YouTube Embed)</span>
                    </h4>

                    <div>
                      <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                        Tautan Video YouTube
                      </label>
                      <input
                        type="url"
                        value={sessionFormData.youtubeUrl}
                        onChange={(e) => setSessionFormData({ ...sessionFormData, youtubeUrl: e.target.value })}
                        placeholder="https://www.youtube.com/watch?v=... atau https://youtu.be/..."
                        className="nb-input"
                      />
                    </div>

                    {sessionFormData.youtubeUrl && (
                      <div className="mt-2 space-y-1">
                        <p className="text-[10px] text-stone-600 dark:text-stone-400 font-bold uppercase tracking-wider">Pratinjau Embedded Video Player:</p>
                        <YouTubeEmbed url={sessionFormData.youtubeUrl} title={sessionFormData.title} />
                      </div>
                    )}
                  </div>

                  {/* PDF & Google Drive Section */}
                  <div className="space-y-4 bg-[#F8F3E8] dark:bg-[#0B3026] p-4 rounded-md border-2 border-[#171717] dark:border-[#D9AC45]/40 shadow-[2px_2px_0px_#171717]">
                    <h4 className="font-black text-xs uppercase tracking-wider text-stone-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#D9AC45]" />
                      <span>Naskah Matan / Modul PDF & Tautan Google Drive</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                          Judul Berkas PDF
                        </label>
                        <input
                          type="text"
                          value={sessionFormData.pdfTitle}
                          onChange={(e) => setSessionFormData({ ...sessionFormData, pdfTitle: e.target.value })}
                          placeholder="Naskah Matan PDF Sesi 1"
                          className="nb-input"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                          Unggah Berkas PDF (Firebase Storage)
                        </label>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => handleFileUpload(e, 'pdfs', (url) => {
                            setSessionFormData(prev => ({ ...prev, pdfUrl: url }));
                          })}
                          className="w-full text-xs text-stone-600 dark:text-stone-400 font-medium file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-2 file:border-[#171717] file:text-xs file:font-black file:bg-[#D9AC45] file:text-[#06251D] hover:file:bg-[#c99b35] file:cursor-pointer"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                        URL Direct Link PDF (atau Hasil Upload)
                      </label>
                      <input
                        type="url"
                        value={sessionFormData.pdfUrl}
                        onChange={(e) => setSessionFormData({ ...sessionFormData, pdfUrl: e.target.value })}
                        placeholder="https://firebasestorage.googleapis.com/... atau URL PDF direct"
                        className="nb-input"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                        Link Google Drive PDF (Jika ada)
                      </label>
                      <input
                        type="url"
                        value={sessionFormData.googleDriveUrl}
                        onChange={(e) => setSessionFormData({ ...sessionFormData, googleDriveUrl: e.target.value })}
                        placeholder="https://drive.google.com/file/d/..."
                        className="nb-input"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: MATERI TEKS (ID/AR) */}
              {sessionFormTab === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 block mb-1.5">
                      Materi Teks / Catatan Pembelajaran & Faedah Ilmiah (Format Teks Kaya / Markdown)
                    </label>
                    <RichTextEditor
                      value={sessionFormData.lessonNotes}
                      onChange={(html) => setSessionFormData({ ...sessionFormData, lessonNotes: html })}
                      placeholder="Ringkasan poin penting, faedah ilmiah, dan penjelasan materi..."
                      minHeight="220px"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 block mb-1.5">
                      Materi Teks / Matan Bahasa Arab
                    </label>
                    <textarea
                      rows={6}
                      value={sessionFormData.descriptionAr}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, descriptionAr: e.target.value })}
                      placeholder="Naskah asli matan Bahasa Arab, syarah, atau terjemahan..."
                      dir="rtl"
                      className="nb-input font-bold text-emerald-800 dark:text-emerald-300 font-amiri text-base leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: KUIS EVALUASI SESI */}
              {sessionFormTab === 4 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="p-4 bg-[#D9AC45]/20 dark:bg-[#0B3026] border-2 border-[#171717] dark:border-[#D9AC45]/50 rounded-md flex items-center justify-between shadow-[2px_2px_0px_#171717]">
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-wider text-[#06251D] dark:text-[#D9AC45]">
                        Aktifkan Kuis Evaluasi untuk Sesi Ini
                      </h4>
                      <p className="text-[11px] text-stone-700 dark:text-stone-300 font-medium mt-0.5">
                        Santri akan mengerjakan kuis evaluasi setelah menyelesaikan materi sesi ini.
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={sessionFormData.enableQuiz}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, enableQuiz: e.target.checked })}
                      className="w-5 h-5 accent-[#06251D] border-2 border-[#171717] rounded cursor-pointer"
                    />
                  </div>

                  {sessionFormData.enableQuiz && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 block mb-1.5">
                            Judul Kuis Sesi
                          </label>
                          <input
                            type="text"
                            value={sessionFormData.quizTitle}
                            onChange={(e) => setSessionFormData({ ...sessionFormData, quizTitle: e.target.value })}
                            placeholder={`Kuis Evaluasi - ${sessionFormData.title || 'Sesi'}`}
                            className="nb-input font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 block mb-1.5">
                            Passing Grade (%)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={sessionFormData.passingScore}
                            onChange={(e) => setSessionFormData({ ...sessionFormData, passingScore: Number(e.target.value) || 75 })}
                            className="nb-input font-black"
                          />
                        </div>
                      </div>

                      {/* QUESTIONS EDITOR LIST */}
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="font-black text-xs uppercase tracking-wider text-stone-900 dark:text-[#E2F4F0]">
                            Daftar Soal Pertanyaan ({sessionFormData.questions.length})
                          </h4>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setQuizImportTarget('session');
                                setShowQuizImportModal(true);
                              }}
                              className="nb-btn nb-btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                              title="Impor kumpulan soal sekaligus dari teks yang disalin"
                            >
                              <FileText className="w-3.5 h-3.5 text-[#1D8B94] dark:text-[#4FB8B4]" />
                              <span>Salin &amp; Tempel Soal</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleAddQuestionToSessionForm}
                              className="nb-btn nb-btn-gold text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Tambah Soal</span>
                            </button>
                          </div>
                        </div>

                        {sessionFormData.questions.length === 0 ? (
                          <div className="p-6 text-center bg-stone-100 dark:bg-[#0A3D4A] rounded-md border-2 border-dashed border-[#171717]/40 dark:border-[#1B6A78] space-y-2">
                            <p className="text-xs text-stone-600 dark:text-[#B8DAD5] italic font-medium">
                              Belum ada soal ditambahkan untuk kuis sesi ini.
                            </p>
                            <div className="flex items-center justify-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setQuizImportTarget('session');
                                  setShowQuizImportModal(true);
                                }}
                                className="nb-btn nb-btn-primary text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Salin &amp; Tempel Kumpulan Soal</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          sessionFormData.questions.map((q, qIndex) => (
                            <div key={q.id || qIndex} className="p-4 sm:p-5 bg-white dark:bg-[#0A3D4A] border-2 border-[#171717] dark:border-[#1B6A78] rounded-md space-y-3.5 shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#02141A]">
                              <div className="flex items-center justify-between border-b border-[#171717]/15 dark:border-[#1B6A78] pb-2">
                                <span className="nb-badge bg-[#FAF7F0] dark:bg-[#10606F] text-[#06251D] dark:text-[#E2F4F0] border-[#171717] dark:border-[#1B6A78]">
                                  Soal #{qIndex + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveQuestionFromSessionForm(qIndex)}
                                  className="text-xs text-rose-600 hover:text-rose-800 dark:text-rose-400 font-black uppercase tracking-wider cursor-pointer underline"
                                >
                                  Hapus Soal
                                </button>
                              </div>

                              {/* Question Indonesian Text (Multiline Textarea) */}
                              <div>
                                <label className="text-[11px] font-bold text-stone-700 dark:text-[#B8DAD5] block mb-1">
                                  Pertanyaan (Bahasa Indonesia) *
                                </label>
                                <textarea
                                  rows={2}
                                  value={q.questionText}
                                  onChange={(e) => {
                                    const updated = [...sessionFormData.questions];
                                    updated[qIndex].questionText = e.target.value;
                                    setSessionFormData({ ...sessionFormData, questions: updated });
                                  }}
                                  placeholder="Tuliskan pertanyaan soal secara lengkap..."
                                  className="nb-input w-full p-2.5 text-xs sm:text-sm font-bold leading-relaxed resize-y min-h-[58px]"
                                />
                              </div>

                              {/* Question Arabic Text (Multiline Textarea) */}
                              <div>
                                <label className="text-[11px] font-bold text-stone-700 dark:text-[#B8DAD5] block mb-1">
                                  Teks Arab Pertanyaan (Opsional)
                                </label>
                                <textarea
                                  rows={2}
                                  dir="rtl"
                                  value={q.questionTextAr || ''}
                                  onChange={(e) => {
                                    const updated = [...sessionFormData.questions];
                                    updated[qIndex].questionTextAr = e.target.value;
                                    setSessionFormData({ ...sessionFormData, questions: updated });
                                  }}
                                  placeholder="نَصُّ السُّؤَالِ بِالْعَرَبِيَّةِ مَعَ الشَّكْلِ..."
                                  className="nb-input w-full p-2.5 text-xs sm:text-sm font-amiri font-bold text-right leading-relaxed resize-y"
                                />
                              </div>

                              {/* Options */}
                              <div className="space-y-2 pt-1">
                                <div className="flex items-center justify-between">
                                  <label className="text-[11px] font-bold text-stone-700 dark:text-[#B8DAD5] block">
                                    Pilihan Jawaban &amp; Tentukan Jawaban Benar (Radio):
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...sessionFormData.questions];
                                      const nextLetter = String.fromCharCode(65 + updated[qIndex].options.length);
                                      updated[qIndex].options.push(`Pilihan ${nextLetter}`);
                                      setSessionFormData({ ...sessionFormData, questions: updated });
                                    }}
                                    className="text-[11px] font-bold text-[#1D8B94] dark:text-[#4FB8B4] hover:underline cursor-pointer"
                                  >
                                    + Tambah Opsi
                                  </button>
                                </div>

                                {q.options.map((opt, optIdx) => (
                                  <div key={optIdx} className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name={`correct-${qIndex}`}
                                      checked={q.correctAnswerIndex === optIdx}
                                      onChange={() => {
                                        const updated = [...sessionFormData.questions];
                                        updated[qIndex].correctAnswerIndex = optIdx;
                                        setSessionFormData({ ...sessionFormData, questions: updated });
                                      }}
                                      className="w-4 h-4 accent-[#1D8B94] cursor-pointer"
                                      title="Tandai sebagai jawaban benar"
                                    />
                                    <span className="text-xs font-black text-stone-700 dark:text-[#E2F4F0] w-5">
                                      {String.fromCharCode(65 + optIdx)}.
                                    </span>
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => {
                                        const updated = [...sessionFormData.questions];
                                        updated[qIndex].options[optIdx] = e.target.value;
                                        setSessionFormData({ ...sessionFormData, questions: updated });
                                      }}
                                      className="flex-1 nb-input py-1.5 px-2.5 text-xs font-medium"
                                    />
                                    {q.options.length > 2 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = [...sessionFormData.questions];
                                          updated[qIndex].options = updated[qIndex].options.filter((_, i) => i !== optIdx);
                                          if (updated[qIndex].correctAnswerIndex === optIdx) {
                                            updated[qIndex].correctAnswerIndex = 0;
                                          } else if (updated[qIndex].correctAnswerIndex > optIdx) {
                                            updated[qIndex].correctAnswerIndex -= 1;
                                          }
                                          setSessionFormData({ ...sessionFormData, questions: updated });
                                        }}
                                        className="p-1 text-stone-400 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 cursor-pointer"
                                        title="Hapus opsi"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Explanation */}
                              <div>
                                <label className="text-[11px] font-bold text-stone-700 dark:text-[#B8DAD5] block mb-1">
                                  Pembahasan / Penjelasan Jawaban (Opsional)
                                </label>
                                <textarea
                                  rows={2}
                                  value={q.explanation || ''}
                                  onChange={(e) => {
                                    const updated = [...sessionFormData.questions];
                                    updated[qIndex].explanation = e.target.value;
                                    setSessionFormData({ ...sessionFormData, questions: updated });
                                  }}
                                  placeholder="Penjelasan rujukan kitab atau alasan jawaban benar..."
                                  className="nb-input w-full p-2 text-xs font-normal resize-y"
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t-2 border-[#171717] dark:border-[#D9AC45]/30 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingSessionModalOpen(false)}
                  className="nb-btn nb-btn-secondary text-xs py-2 px-4 cursor-pointer"
                >
                  Batal
                </button>

                <div className="flex items-center gap-3">
                  {sessionFormTab < 4 && (
                    <button
                      type="button"
                      onClick={() => setSessionFormTab((sessionFormTab + 1) as any)}
                      className="nb-btn nb-btn-secondary text-xs py-2 px-4 cursor-pointer"
                    >
                      Lanjut ({sessionFormTab + 1}/4)
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={savingSession}
                    className="nb-btn nb-btn-primary text-xs py-2 px-5 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {savingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Simpan Sesi {sessionFormData.enableQuiz ? '& Kuis' : ''}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT CATEGORY */}
      {editingCategory && (
        <div className="fixed inset-0 z-70 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-[#06251D] border-3 border-[#171717] dark:border-[#D9AC45] w-full max-w-lg rounded-md p-6 space-y-5 shadow-[8px_8px_0px_#171717]">
            <div className="flex items-center justify-between border-b-2 border-[#171717] dark:border-[#D9AC45]/30 pb-3">
              <h3 className="font-black text-[#06251D] dark:text-white text-base flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-[#D9AC45]" />
                <span>{editingCategory.id ? 'Edit Bab / Modul' : 'Tambah Bab / Modul Baru'}</span>
              </h3>
              <button 
                onClick={() => setEditingCategory(null)} 
                className="p-1 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white rounded-md border-2 border-transparent hover:border-[#171717] transition"
                aria-label="Tutup modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              {statusMessage && (
                <div className={`p-3.5 rounded-md border-2 border-[#171717] dark:border-[#D9AC45] text-xs sm:text-sm font-bold flex items-center gap-3 animate-fade-in ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-200'
                    : 'bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-200'
                }`}>
                  {statusMessage.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
                  <span>{statusMessage.text}</span>
                </div>
              )}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 block mb-1.5">
                  Nama Bab / Modul (Bahasa Indonesia) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={editingCategory.name || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  placeholder="Contoh: Fiqh Ibadah, Aqidah, Nahwu"
                  className="nb-input font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 block mb-1.5">
                  Nama Arab
                </label>
                <input
                  type="text"
                  value={editingCategory.nameAr || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, nameAr: e.target.value })}
                  placeholder="فقه العبادات"
                  dir="rtl"
                  className="nb-input font-bold text-emerald-700 dark:text-emerald-400 font-amiri text-base"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 block mb-1.5">
                  Deskripsi
                </label>
                <textarea
                  rows={2}
                  value={editingCategory.description || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  className="nb-input"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-[#171717] dark:border-[#D9AC45]/30">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="nb-btn nb-btn-secondary text-xs py-2 px-4"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="nb-btn nb-btn-primary text-xs py-2 px-5"
                >
                  Simpan Bab / Modul
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT COURSE */}
      {editingCourse && (
        <div className="fixed inset-0 z-70 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-[#06251D] border-3 border-[#171717] dark:border-[#D9AC45] w-full max-w-2xl rounded-md p-6 space-y-5 shadow-[8px_8px_0px_#171717] my-8">
            <div className="flex items-center justify-between border-b-2 border-[#171717] dark:border-[#D9AC45]/30 pb-3">
              <h3 className="font-black text-[#06251D] dark:text-white text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#D9AC45]" />
                <span>{editingCourse.id ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}</span>
              </h3>
              <button 
                onClick={() => setEditingCourse(null)} 
                className="p-1 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white rounded-md border-2 border-transparent hover:border-[#171717] transition"
                aria-label="Tutup modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {statusMessage && (
                <div className={`p-3.5 rounded-md border-2 border-[#171717] dark:border-[#D9AC45] text-xs sm:text-sm font-bold flex items-center gap-3 animate-fade-in ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-200'
                    : 'bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-200'
                }`}>
                  {statusMessage.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
                  <span>{statusMessage.text}</span>
                </div>
              )}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 block mb-1.5">
                  Bab / Modul Kategori <span className="text-rose-600">*</span>
                </label>
                <select
                  value={editingCourse.categoryId || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, categoryId: e.target.value })}
                  className="nb-input font-bold"
                  required
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 block mb-1.5">
                    Judul Mata Pelajaran <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingCourse.title || ''}
                    onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
                    placeholder="Syarah Matan Al-Ajurumiyah"
                    className="nb-input font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 block mb-1.5">
                    Judul Bahasa Arab
                  </label>
                  <input
                    type="text"
                    value={editingCourse.titleAr || ''}
                    onChange={(e) => setEditingCourse({ ...editingCourse, titleAr: e.target.value })}
                    placeholder="شرح الآجرومية"
                    dir="rtl"
                    className="nb-input font-bold text-emerald-700 dark:text-emerald-400 font-amiri text-base"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 block mb-1.5">
                  Pengajar / Pengampu
                </label>
                <input
                  type="text"
                  value={editingCourse.instructor || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, instructor: e.target.value })}
                  placeholder="Ustadz Osama, Lc."
                  className="nb-input font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 block mb-1.5">
                  Deskripsi Pembelajaran
                </label>
                <textarea
                  rows={3}
                  value={editingCourse.description || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                  className="nb-input"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 block mb-1.5">
                  Gambar Thumbnail Cover (URL / Upload)
                </label>
                <div className="space-y-2">
                  <input
                    type="url"
                    value={editingCourse.coverImageUrl || ''}
                    onChange={(e) => setEditingCourse({ ...editingCourse, coverImageUrl: e.target.value })}
                    placeholder="https://..."
                    className="nb-input"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'covers', (url) => setEditingCourse({ ...editingCourse, coverImageUrl: url }))}
                    className="w-full text-xs text-stone-600 dark:text-stone-400 font-medium file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-2 file:border-[#171717] file:text-xs file:font-black file:bg-[#D9AC45] file:text-[#06251D] hover:file:bg-[#c99b35] file:cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-[#171717] dark:border-[#D9AC45]/30">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="nb-btn nb-btn-secondary text-xs py-2 px-4"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="nb-btn nb-btn-primary text-xs py-2 px-5"
                >
                  Simpan Mata Pelajaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT INDEPENDENT QUIZ */}
      {editingQuiz && (
        <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-[#0A3D4A] border-3 border-[#171717] dark:border-[#1B6A78] w-full max-w-3xl rounded-md p-6 space-y-5 shadow-[8px_8px_0px_#171717] dark:shadow-[8px_8px_0px_#02141A] my-8">
            <div className="flex items-center justify-between border-b-2 border-[#171717] dark:border-[#1B6A78] pb-3">
              <h3 className="font-black text-[#06251D] dark:text-[#E2F4F0] text-base flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-[#1D8B94] dark:text-[#4FB8B4]" />
                <span>{editingQuiz.id ? 'Edit Kuis Evaluasi' : 'Tambah Kuis Evaluasi Baru'}</span>
              </h3>
              <button 
                onClick={() => setEditingQuiz(null)} 
                className="p-1 text-stone-500 hover:text-stone-900 dark:text-[#B8DAD5] dark:hover:text-white rounded-md border-2 border-transparent hover:border-[#171717] dark:hover:border-[#1B6A78] transition"
                aria-label="Tutup modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuiz} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-[#B8DAD5] block mb-1.5">
                  Judul Kuis Evaluasi <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={editingQuiz.title || ''}
                  onChange={(e) => setEditingQuiz({ ...editingQuiz, title: e.target.value })}
                  placeholder="Kuis Evaluasi Pemahaman"
                  className="nb-input font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-[#B8DAD5] block mb-1.5">
                    Mata Pelajaran <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <select
                    value={editingQuiz.courseId || ''}
                    onChange={(e) => setEditingQuiz({ ...editingQuiz, courseId: e.target.value })}
                    className="nb-input font-bold"
                    required
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-[#B8DAD5] block mb-1.5">
                    Passing Grade (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editingQuiz.passingScore ?? 75}
                    onChange={(e) => setEditingQuiz({ ...editingQuiz, passingScore: Number(e.target.value) || 75 })}
                    className="nb-input font-black"
                  />
                </div>
              </div>

              {/* Questions in independent quiz */}
              <div className="space-y-4 pt-3 border-t-2 border-[#171717] dark:border-[#1B6A78]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-black text-xs uppercase tracking-wider text-stone-900 dark:text-[#E2F4F0]">
                    Daftar Butir Soal ({editingQuiz.questions?.length || 0})
                  </h4>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setQuizImportTarget('independent');
                        setShowQuizImportModal(true);
                      }}
                      className="nb-btn nb-btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                      title="Salin &amp; Tempel kumpulan soal sekaligus"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#1D8B94] dark:text-[#4FB8B4]" />
                      <span>Salin &amp; Tempel Soal</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const newQ: Question = {
                          id: `q-${Date.now()}`,
                          questionText: 'Tulis pertanyaan baru...',
                          type: 'multiple_choice',
                          options: ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'],
                          correctAnswerIndex: 0,
                          points: 10,
                          explanation: ''
                        };
                        setEditingQuiz(prev => ({
                          ...prev,
                          questions: [...(prev?.questions || []), newQ]
                        }));
                      }}
                      className="nb-btn nb-btn-gold text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Tambah Soal</span>
                    </button>
                  </div>
                </div>

                {(!editingQuiz.questions || editingQuiz.questions.length === 0) ? (
                  <div className="p-4 text-center bg-stone-100 dark:bg-[#10606F] rounded-md border-2 border-dashed border-[#171717]/40 dark:border-[#1B6A78]">
                    <p className="text-xs text-stone-600 dark:text-[#B8DAD5] italic font-medium">
                      Belum ada butir pertanyaan. Tambah manual atau gunakan "Salin &amp; Tempel Soal".
                    </p>
                  </div>
                ) : (
                  editingQuiz.questions.map((q, qIndex) => (
                    <div key={q.id || qIndex} className="p-4 bg-[#FAF7F0] dark:bg-[#10606F] border-2 border-[#171717] dark:border-[#1B6A78] rounded-md space-y-3">
                      <div className="flex items-center justify-between border-b border-[#171717]/15 dark:border-[#1B6A78] pb-1.5">
                        <span className="nb-badge bg-white dark:bg-[#0A3D4A] text-[#06251D] dark:text-[#E2F4F0] border-[#171717] dark:border-[#1B6A78]">
                          Soal #{qIndex + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingQuiz(prev => ({
                              ...prev,
                              questions: prev?.questions?.filter((_, i) => i !== qIndex) || []
                            }));
                          }}
                          className="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-stone-700 dark:text-[#B8DAD5] block mb-1">
                          Pertanyaan *
                        </label>
                        <textarea
                          rows={2}
                          value={q.questionText}
                          onChange={(e) => {
                            const updated = [...(editingQuiz.questions || [])];
                            updated[qIndex].questionText = e.target.value;
                            setEditingQuiz({ ...editingQuiz, questions: updated });
                          }}
                          className="nb-input w-full p-2.5 text-xs font-bold leading-relaxed resize-y"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-stone-700 dark:text-[#B8DAD5] block">
                          Pilihan &amp; Jawaban Benar (Radio):
                        </label>
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`editing-correct-${qIndex}`}
                              checked={q.correctAnswerIndex === optIdx}
                              onChange={() => {
                                const updated = [...(editingQuiz.questions || [])];
                                updated[qIndex].correctAnswerIndex = optIdx;
                                setEditingQuiz({ ...editingQuiz, questions: updated });
                              }}
                              className="w-4 h-4 accent-[#1D8B94] cursor-pointer"
                            />
                            <span className="text-xs font-black text-stone-700 dark:text-[#E2F4F0] w-5">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const updated = [...(editingQuiz.questions || [])];
                                updated[qIndex].options[optIdx] = e.target.value;
                                setEditingQuiz({ ...editingQuiz, questions: updated });
                              }}
                              className="flex-1 nb-input py-1 px-2.5 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-[#171717] dark:border-[#1B6A78]">
                <button
                  type="button"
                  onClick={() => setEditingQuiz(null)}
                  className="nb-btn nb-btn-secondary text-xs py-2 px-4 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="nb-btn nb-btn-primary text-xs py-2 px-5 cursor-pointer"
                >
                  Simpan Kuis ({editingQuiz.questions?.length || 0} Soal)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL QUIZ IMPORT COPY & PASTE */}
      <QuizImportModal
        isOpen={showQuizImportModal}
        onClose={() => setShowQuizImportModal(false)}
        existingQuestionsCount={
          quizImportTarget === 'session'
            ? sessionFormData.questions.length
            : (editingQuiz?.questions?.length || 0)
        }
        onImportQuestions={handleImportedQuestions}
      />

      {/* CONFIRM MODAL */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        itemName={confirmDialog.itemName}
        message={confirmDialog.message}
        loading={confirmDialog.loading}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
