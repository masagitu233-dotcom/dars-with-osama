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
  Menu,
  GraduationCap,
  PanelLeftClose,
  PanelLeftOpen
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
  seedDefaultBlogPostsIfEmpty
} from '../../firebase/services';
import { firebaseConfig } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ConfirmModal } from '../common/ConfirmModal';
import { YouTubeEmbed } from '../common/YouTubeEmbed';
import { AdminBlogManager } from './AdminBlogManager';

export const AdminDashboard: React.FC<{
  initialCourseId?: string;
  initialTab?: 'dashboard' | 'courses' | 'categories' | 'sessions' | 'quizzes' | 'users' | 'attempts' | 'firebase' | 'blog';
  autoOpenAddSession?: boolean;
  onClearAutoOpen?: () => void;
  onNavigateToSiswa?: () => void;
  onPreviewBlogPost?: (post: BlogPost) => void;
  onRefreshData: () => void;
}> = ({
  initialCourseId,
  initialTab,
  autoOpenAddSession,
  onClearAutoOpen,
  onNavigateToSiswa,
  onPreviewBlogPost,
  onRefreshData
}) => {
  const { user, userProfile, isAdmin, openLogoutConfirmModal } = useAuth();
  const { theme, effectiveTheme, setTheme } = useTheme();

  // Active Menu / Tab in Sidebar
  const [activeTab, setActiveTab] = useState<'dashboard' | 'courses' | 'categories' | 'sessions' | 'quizzes' | 'users' | 'attempts' | 'firebase' | 'blog'>(initialTab || 'dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');

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

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [cats, crss, qzs, usrs, atts, posts] = await Promise.all([
        getCategories(),
        getCourses(true), // include unpublished
        getAllQuizzes(),
        getAllUsers(),
        getAllQuizAttempts(),
        getBlogPosts(true)
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
        const sList = await getSessionsByCourse(crs.id, true);
        sessMap[crs.id] = sList;
      }
      setAllSessionsMap(sessMap);

      if (crss.length > 0) {
        setSelectedCourseId(prev => (prev && crss.some(c => c.id === prev) ? prev : crss[0].id));
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

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
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col lg:flex-row font-sans transition-colors duration-200">
      {/* ========================================================= */}
      {/* MOBILE TOP BAR (Hamburger & Brand Title on Small Screens) */}
      {/* ========================================================= */}
      <div className="lg:hidden sticky top-0 z-30 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 px-4 py-3 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            aria-label="Buka Sidebar Admin"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-800 to-emerald-600 border border-emerald-500/30 flex items-center justify-center text-amber-300 shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-stone-900 dark:text-stone-100 font-sans">
              Dars with Osama Admin
            </span>
          </div>
        </div>

        <button
          onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
          className="p-2 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer"
          title="Toggle Dark Mode"
        >
          {effectiveTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-600" />}
        </button>
      </div>

      {/* ========================================================= */}
      {/* CENTRALIZED LEFT SIDEBAR NAV (DESKTOP STICKY & MOBILE DRAWER) */}
      {/* ========================================================= */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'
      } w-72 ${
        sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0 shadow-none'
      }`}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* BRAND HEADER */}
          <div className={`p-4 border-b border-stone-200 dark:border-stone-800 flex items-center shrink-0 ${sidebarCollapsed ? 'lg:justify-center' : 'justify-between'} bg-stone-50/50 dark:bg-stone-900/50`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-800 to-emerald-600 border border-emerald-500/30 flex items-center justify-center text-amber-300 shadow-md shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              {!sidebarCollapsed && (
                <div className="hidden lg:block truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-base text-stone-900 dark:text-stone-100 tracking-tight font-sans truncate">
                      Dars with Osama
                    </span>
                  </div>
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 font-semibold truncate">
                    Admin Dashboard
                  </span>
                </div>
              )}
              <div className="lg:hidden truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base text-stone-900 dark:text-stone-100 tracking-tight font-sans truncate">
                    Dars with Osama
                  </span>
                </div>
                <span className="inline-block text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 font-semibold truncate">
                  Admin Dashboard
                </span>
              </div>
            </div>

            {/* Desktop Collapse Toggle Button */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer shrink-0"
              title={sidebarCollapsed ? 'Perluas Sidebar' : 'Kecilkan Sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>

            {/* Close drawer button on mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg transition cursor-pointer shrink-0"
              aria-label="Tutup Sidebar Admin"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* QUICK SEARCH BAR IN SIDEBAR */}
          <div className="p-3.5 border-b border-stone-100 dark:border-stone-800/80">
            <div className={`relative flex items-center ${sidebarCollapsed ? 'lg:justify-center' : ''}`}>
              <Search className={`w-3.5 h-3.5 text-stone-400 ${sidebarCollapsed ? 'lg:static' : 'absolute left-3'}`} />
              {!sidebarCollapsed && (
                <input
                  type="text"
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  placeholder="Pencarian cepat data..."
                  className="w-full pl-9 pr-7 py-2 bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-white"
                />
              )}
              {!sidebarCollapsed && quickSearch && (
                <button
                  onClick={() => setQuickSearch('')}
                  className="absolute right-2.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* SCROLLABLE MENU ITEMS AREA */}
          <div className={`py-4 space-y-6 overflow-y-auto flex-1 ${sidebarCollapsed ? 'px-2' : 'px-4'}`}>
            {/* GROUP 1: UTAMA */}
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <p className="px-3 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider truncate">
                  UTAMA
                </p>
              )}
              <button
                onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
                title="Dashboard Overview"
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60'
                }`}
              >
                <BarChart2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">Dashboard Overview</span>}
              </button>
            </div>

            {/* GROUP 2: KONTEN PEMBELAJARAN */}
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <p className="px-3 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider truncate">
                  KONTEN PEMBELAJARAN
                </p>
              )}
              <button
                onClick={() => { setActiveTab('courses'); setSidebarOpen(false); }}
                title={`Mata Pelajaran (${courses.length})`}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'courses'
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">Mata Pelajaran</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 font-bold shrink-0">
                    {courses.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab('categories'); setSidebarOpen(false); }}
                title={`Bab / Modul (${categories.length})`}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'categories'
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">Bab / Modul</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 font-bold shrink-0">
                    {categories.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab('sessions'); setSidebarOpen(false); }}
                title={`Sesi Pembelajaran (${totalSessionsCount})`}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'sessions'
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Video className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">Sesi Pembelajaran</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 font-bold shrink-0">
                    {totalSessionsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab('quizzes'); setSidebarOpen(false); }}
                title={`Kuis Evaluasi (${quizzes.length})`}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'quizzes'
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">Kuis Evaluasi</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 font-bold shrink-0">
                    {quizzes.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab('blog'); setSidebarOpen(false); }}
                title={`Blog & Artikel (${blogPosts.length})`}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'blog'
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">Blog & Artikel</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 font-bold shrink-0">
                    {blogPosts.length}
                  </span>
                )}
              </button>
            </div>

            {/* GROUP 3: PENGGUNA & MONITORING */}
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <p className="px-3 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider truncate">
                  PENGGUNA & MONITORING
                </p>
              )}
              <button
                onClick={() => { setActiveTab('users'); setSidebarOpen(false); }}
                title={`Pengguna Terdaftar (${users.length})`}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">Pengguna Terdaftar</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 font-bold shrink-0">
                    {users.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab('attempts'); setSidebarOpen(false); }}
                title={`Hasil Kuis & Nilai (${attempts.length})`}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'attempts'
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">Hasil Kuis & Nilai</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 font-bold shrink-0">
                    {attempts.length}
                  </span>
                )}
              </button>
            </div>

            {/* GROUP 4: AKSI & NAVIGASI ADMIN */}
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <p className="px-3 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider truncate">
                  AKSI & NAVIGASI
                </p>
              )}
              {onNavigateToSiswa && (
                <button
                  onClick={() => { onNavigateToSiswa(); setSidebarOpen(false); }}
                  title="Lihat Web Siswa"
                  className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3.5 py-2.5'} rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-400 transition cursor-pointer`}
                >
                  <ExternalLink className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">Lihat Web Siswa</span>}
                </button>
              )}

              <button
                onClick={handleExportReport}
                title="Ekspor Laporan (CSV)"
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3.5 py-2.5'} rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/60 transition cursor-pointer`}
              >
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">Ekspor Laporan (CSV)</span>}
              </button>

              <button
                onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
                title={`Mode Tampilan (${effectiveTheme === 'dark' ? 'Gelap' : 'Terang'})`}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/60 transition cursor-pointer`}
              >
                <div className="flex items-center gap-3 truncate">
                  {effectiveTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400 shrink-0" /> : <Moon className="w-4 h-4 text-stone-600 shrink-0" />}
                  {!sidebarCollapsed && <span className="truncate">Mode Tampilan</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-[10px] font-bold uppercase text-stone-500 shrink-0">
                    {effectiveTheme === 'dark' ? 'Gelap' : 'Terang'}
                  </span>
                )}
              </button>
            </div>

            {/* GROUP 5: PENGATURAN */}
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <p className="px-3 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider truncate">
                  PENGATURAN
                </p>
              )}
              <button
                onClick={() => { setActiveTab('firebase'); setSidebarOpen(false); }}
                title="Status Firebase & Data"
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'firebase'
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60'
                }`}
              >
                <Database className="w-4 h-4 text-amber-500 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">Status Firebase & Data</span>}
              </button>
            </div>
          </div>

          {/* BOTTOM PROFILE & LOGOUT */}
          <div className={`p-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 space-y-3 ${sidebarCollapsed ? 'px-2' : 'px-3.5'}`}>
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between gap-2'}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden border border-emerald-500/30 shadow-xs">
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
                    <p className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                      {userProfile?.displayName || user?.displayName || 'Admin Dars with Osama'}
                    </p>
                    <p className="text-stone-500 dark:text-stone-400 truncate text-[10px]">
                      {user?.email}
                    </p>
                  </div>
                )}
              </div>

              {!sidebarCollapsed && (
                <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 font-bold border border-emerald-300 dark:border-emerald-800">
                  Admin
                </span>
              )}
            </div>

            <button
              onClick={openLogoutConfirmModal}
              title="Keluar / Logout Admin"
              className={`w-full flex items-center justify-center ${sidebarCollapsed ? 'px-0 py-2.5' : 'gap-2 py-2 px-3'} bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs font-semibold transition cursor-pointer active:scale-95`}
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
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-40 lg:hidden cursor-pointer"
          aria-hidden="true"
        />
      )}

        {/* RIGHT CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Status Alert Notification */}
          {statusMessage && (
            <div className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center gap-3 animate-fade-in-up shadow-lg ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200'
            }`}>
              {statusMessage.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* HEADER SECTION WITH BREADCRUMB & QUICK ACTION BUTTONS */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
            <div>
              <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 font-medium mb-1">
                <span>Admin</span>
                <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold capitalize">
                  {activeTab === 'dashboard' ? 'Dashboard Overview' : activeTab}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white font-sans tracking-tight">
                Dashboard Administrasi Dars with Osama
              </h1>
              <p className="text-stone-500 dark:text-stone-400 text-xs sm:text-sm mt-0.5">
                Kelola kurikulum ilmu, sesi pembelajaran, kuis evaluasi, dan pemantauan santri.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
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
                className="px-3.5 py-2 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
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
                className="px-3.5 py-2 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>+ Bab / Modul</span>
              </button>

              <button
                onClick={() => handleOpenAddSessionModal()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
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
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-xs hover:border-emerald-500/50 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Mata Pelajaran</span>
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-xl group-hover:scale-110 transition">
                      <BookOpen className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-stone-900 dark:text-white mt-2 font-sans">
                    {courses.length}
                  </p>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                    {courses.filter(c => c.isPublished).length} Terpublikasi
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('categories')}
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-xs hover:border-emerald-500/50 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Bab / Modul</span>
                    <div className="p-2 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 rounded-xl group-hover:scale-110 transition">
                      <Layers className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-stone-900 dark:text-white mt-2 font-sans">
                    {categories.length}
                  </p>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                    Kategori Matan & Ilmu
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('sessions')}
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-xs hover:border-emerald-500/50 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Sesi Pembelajaran</span>
                    <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 rounded-xl group-hover:scale-110 transition">
                      <Video className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-stone-900 dark:text-white mt-2 font-sans">
                    {totalSessionsCount}
                  </p>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                    Total video & materi
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('users')}
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-xs hover:border-emerald-500/50 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Pengguna Terdaftar</span>
                    <div className="p-2 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 rounded-xl group-hover:scale-110 transition">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-stone-900 dark:text-white mt-2 font-sans">
                    {users.length}
                  </p>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                    Santri & Siswa aktif
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('quizzes')}
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-xs hover:border-emerald-500/50 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Kuis Evaluasi</span>
                    <div className="p-2 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 rounded-xl group-hover:scale-110 transition">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-stone-900 dark:text-white mt-2 font-sans">
                    {quizzes.length}
                  </p>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                    Bank soal evaluasi
                  </p>
                </div>
              </div>

              {/* BAGIAN STATISTIK TAMBAHAN */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 rounded-2xl flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-2xl shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Rata-Rata Skor Kuis</p>
                    <p className="text-xl font-bold text-stone-900 dark:text-white mt-0.5">{averageQuizScore}%</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 rounded-2xl flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-2xl shrink-0">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Tingkat Kelulusan</p>
                    <p className="text-xl font-bold text-stone-900 dark:text-white mt-0.5">{passRate}%</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 rounded-2xl flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 rounded-2xl shrink-0">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Total Percobaan Kuis</p>
                    <p className="text-xl font-bold text-stone-900 dark:text-white mt-0.5">{attempts.length}</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 rounded-2xl flex items-center gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 rounded-2xl shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Status Pembelajaran</p>
                    <p className="text-xl font-bold text-stone-900 dark:text-white mt-0.5">
                      {courses.filter(c => c.isPublished).length} / {courses.length} Pub
                    </p>
                  </div>
                </div>
              </div>

              {/* STRUKTUR KURIKULUM: MAPEL -> BAB -> SESI */}
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 space-y-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-stone-900 dark:text-white font-sans flex items-center gap-2">
                      <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span>Struktur Kurikulum: Mapel → Bab → Sesi Pembelajaran</span>
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      Hierarki pembelajaran lengkap dari Mata Pelajaran hingga Sesi & Kuis Evaluasi.
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenAddSessionModal()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow transition flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tambah Sesi Saja</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {courses.length === 0 ? (
                    <p className="text-xs text-stone-500 text-center py-8">Belum ada mata pelajaran terdaftar.</p>
                  ) : (
                    courses.map(crs => {
                      const cat = categories.find(c => c.id === crs.categoryId);
                      const sList = allSessionsMap[crs.id] || [];

                      return (
                        <div key={crs.id} className="border border-stone-200 dark:border-stone-800 rounded-2xl p-4 bg-stone-50/50 dark:bg-stone-900/50 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800/80 pb-3">
                            <div className="flex items-center gap-2.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                              <h4 className="font-bold text-stone-900 dark:text-white text-sm sm:text-base">
                                {crs.title}
                              </h4>
                              {crs.titleAr && (
                                <span className="font-amiri text-base text-emerald-700 dark:text-emerald-400 font-bold ml-1">
                                  {crs.titleAr}
                                </span>
                              )}
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-medium">
                                Bab: {cat?.name || 'Umum'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenAddSessionModal(crs.id)}
                                className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Tambah Sesi</span>
                              </button>
                              <button
                                onClick={() => setEditingCourse(crs)}
                                className="p-1.5 text-stone-500 hover:text-stone-900 dark:hover:text-white transition"
                                title="Edit Kursus"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Sessions List in Course */}
                          <div className="pl-2 sm:pl-4 space-y-2">
                            {sList.length === 0 ? (
                              <p className="text-xs text-stone-400 italic py-1">Belum ada sesi pada mata pelajaran ini.</p>
                            ) : (
                              sList.map(s => (
                                <div key={s.id} className="flex flex-wrap items-center justify-between p-2.5 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700/60 text-xs gap-2 hover:border-emerald-400/50 transition">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="w-6 h-6 rounded-lg bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                                      {s.order}
                                    </span>
                                    <div className="truncate">
                                      <p className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                                        {s.title}
                                      </p>
                                      {s.titleAr && (
                                        <p className="font-amiri text-xs text-emerald-600 dark:text-emerald-400 truncate">
                                          {s.titleAr}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {s.youtubeUrl && (
                                      <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 text-[10px] font-medium flex items-center gap-1">
                                        <Video className="w-3 h-3" /> YouTube
                                      </span>
                                    )}
                                    {s.pdfUrl && (
                                      <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-[10px] font-medium flex items-center gap-1">
                                        <FileText className="w-3 h-3" /> PDF
                                      </span>
                                    )}
                                    {s.googleDriveUrl && (
                                      <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-[10px] font-medium flex items-center gap-1">
                                        <ExternalLink className="w-3 h-3" /> Drive
                                      </span>
                                    )}
                                    {s.quizId && (
                                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                                        <HelpCircle className="w-3 h-3" /> Kuis Sesi
                                      </span>
                                    )}

                                    <button
                                      onClick={() => handleOpenEditSessionModal(s)}
                                      className="p-1.5 text-stone-600 dark:text-stone-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                                      title="Edit Sesi & Kuis"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSession(s)}
                                      className="p-1.5 text-stone-400 hover:text-rose-600 transition"
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
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 space-y-4 shadow-xs">
                <h3 className="text-base font-bold text-stone-900 dark:text-white font-sans flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Aktivitas Hasil Kuis Santri Terbaru</span>
                </h3>

                {attempts.length === 0 ? (
                  <p className="text-xs text-stone-500 py-4 italic">Belum ada pengerjaan kuis oleh santri.</p>
                ) : (
                  <div className="space-y-2">
                    {attempts.slice(0, 5).map(att => (
                      <div key={att.id} className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl text-xs border border-stone-200/60 dark:border-stone-700/50">
                        <div>
                          <p className="font-semibold text-stone-900 dark:text-stone-100">
                            {att.userName || att.userEmail}
                          </p>
                          <p className="text-[10px] text-stone-500 dark:text-stone-400">
                            Disubmit: {new Date(att.submittedAt).toLocaleString('id-ID')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            att.passed
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
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
                <h2 className="text-lg font-bold text-stone-900 dark:text-white">
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Mata Pelajaran</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedCourses.map(course => (
                  <div key={course.id} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between">
                    <div className="p-5 space-y-3">
                      <div className="aspect-video w-full rounded-xl bg-stone-100 dark:bg-stone-800 overflow-hidden relative border border-stone-200 dark:border-stone-700">
                        {course.coverImageUrl ? (
                          <img src={course.coverImageUrl} alt={course.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400">
                            <BookOpen className="w-8 h-8" />
                          </div>
                        )}
                        <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-md shadow ${
                          course.isPublished ? 'bg-emerald-500 text-white' : 'bg-stone-600 text-white'
                        }`}>
                          {course.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-stone-900 dark:text-white text-base">
                          {course.title}
                        </h3>
                        {course.titleAr && (
                          <p className="font-amiri text-lg text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                            {course.titleAr}
                          </p>
                        )}
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2">
                          {course.description}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 border-t border-stone-100 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-900/50 flex items-center justify-between">
                      <span className="text-[11px] text-stone-500 font-medium">
                        {allSessionsMap[course.id]?.length || 0} Sesi
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenAddSessionModal(course.id)}
                          className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-semibold hover:bg-emerald-200 transition cursor-pointer"
                        >
                          + Sesi
                        </button>
                        <button
                          onClick={() => setEditingCourse(course)}
                          className="p-1.5 text-stone-600 dark:text-stone-300 hover:text-emerald-600 transition cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(course)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 transition cursor-pointer"
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
                <h2 className="text-lg font-bold text-stone-900 dark:text-white">
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Bab / Modul</span>
                </button>
              </div>

              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-semibold">
                      <th className="p-3.5">Urutan</th>
                      <th className="p-3.5">Nama Bab / Modul</th>
                      <th className="p-3.5">Nama Arab</th>
                      <th className="p-3.5">Slug</th>
                      <th className="p-3.5">Deskripsi</th>
                      <th className="p-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                    {displayedCategories.map(cat => (
                      <tr key={cat.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition">
                        <td className="p-3.5 font-bold text-stone-700 dark:text-stone-300">{cat.order}</td>
                        <td className="p-3.5 font-semibold text-stone-900 dark:text-white">{cat.name}</td>
                        <td className="p-3.5 font-amiri text-base font-bold text-emerald-600 dark:text-emerald-400">{cat.nameAr}</td>
                        <td className="p-3.5 text-stone-500">{cat.slug}</td>
                        <td className="p-3.5 text-stone-500 max-w-xs truncate">{cat.description}</td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingCategory(cat)}
                              className="p-1.5 text-stone-600 dark:text-stone-300 hover:text-emerald-600 transition cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 transition cursor-pointer"
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
                <div>
                  <label className="text-xs font-semibold text-stone-500 dark:text-stone-400 block mb-1">
                    Pilih Mata Pelajaran:
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-900 dark:text-white"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => handleOpenAddSessionModal(selectedCourseId)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow transition flex items-center gap-1.5 cursor-pointer active:scale-95 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Sesi Pembelajaran Baru</span>
                </button>
              </div>

              {/* Sessions Table */}
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-semibold">
                      <th className="p-3.5">Urutan</th>
                      <th className="p-3.5">Judul Sesi</th>
                      <th className="p-3.5">Video YouTube</th>
                      <th className="p-3.5">Materi PDF & Drive</th>
                      <th className="p-3.5">Kuis Sesi</th>
                      <th className="p-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                    {displayedCourseSessions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-stone-500">
                          Belum ada sesi pembelajaran untuk mata pelajaran ini. Klik "+ Tambah Sesi Pembelajaran Baru".
                        </td>
                      </tr>
                    ) : (
                      displayedCourseSessions.map(s => (
                        <tr key={s.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition">
                          <td className="p-3.5 font-bold text-stone-700 dark:text-stone-300">{s.order}</td>
                          <td className="p-3.5">
                            <p className="font-semibold text-stone-900 dark:text-white">{s.title}</p>
                            {s.titleAr && (
                              <p className="font-amiri text-sm text-emerald-600 dark:text-emerald-400 font-bold">{s.titleAr}</p>
                            )}
                          </td>
                          <td className="p-3.5">
                            {s.youtubeUrl ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Ada Video
                              </span>
                            ) : (
                              <span className="text-stone-400">-</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              {s.pdfUrl && (
                                <span className="text-amber-600 dark:text-amber-400 font-medium block">
                                  • {s.pdfTitle || 'Naskah PDF'}
                                </span>
                              )}
                              {s.googleDriveUrl && (
                                <span className="text-blue-600 dark:text-blue-400 font-medium block">
                                  • Drive PDF Link
                                </span>
                              )}
                              {!s.pdfUrl && !s.googleDriveUrl && <span className="text-stone-400">-</span>}
                            </div>
                          </td>
                          <td className="p-3.5">
                            {s.quizId ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                                Kuis Aktif
                              </span>
                            ) : (
                              <span className="text-stone-400">Tidak ada kuis</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditSessionModal(s)}
                                className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-semibold hover:bg-emerald-200 transition cursor-pointer"
                              >
                                Edit Sesi & Kuis
                              </button>
                              <button
                                onClick={() => handleDeleteSession(s)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 transition cursor-pointer"
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
                <h2 className="text-lg font-bold text-stone-900 dark:text-white">
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Kuis Bebas</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedQuizzes.map(q => {
                  const linkedCourse = courses.find(c => c.id === q.courseId);

                  return (
                    <div key={q.id} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-4 shadow-xs flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                            {linkedCourse?.title || 'Umum'}
                          </span>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            Pass: {q.passingScore}%
                          </span>
                        </div>

                        <h3 className="font-bold text-stone-900 dark:text-white text-base">
                          {q.title}
                        </h3>

                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          Jumlah Soal: <strong>{q.questions?.length || 0} Soal</strong>
                        </p>
                      </div>

                      <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                        <span className="text-[11px] text-stone-400">ID: {q.id}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingQuiz(q)}
                            className="p-1.5 text-stone-600 dark:text-stone-300 hover:text-emerald-600 transition cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuiz(q)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 transition cursor-pointer"
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
                const updated = await getBlogPosts(true);
                setBlogPosts(updated);
                if (onRefreshData) onRefreshData();
              }}
              onPreviewPost={(post) => {
                if (onPreviewBlogPost) {
                  onPreviewBlogPost(post);
                }
              }}
            />
          )}

          {/* ========================================================= */}
          {/* VIEW: PENGGUNA TERDAFTAR */}
          {/* ========================================================= */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-lg font-bold text-stone-900 dark:text-white">
                Daftar Santri / Pengguna Terdaftar ({users.length})
              </h2>

              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-semibold">
                      <th className="p-3.5">Nama</th>
                      <th className="p-3.5">Email</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Kunyah / Bio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                    {displayedUsers.map(u => (
                      <tr key={u.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition">
                        <td className="p-3.5 font-semibold text-stone-900 dark:text-white">{u.displayName || 'Santri'}</td>
                        <td className="p-3.5 text-stone-600 dark:text-stone-300">{u.email}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            u.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {u.role || 'student'}
                          </span>
                        </td>
                        <td className="p-3.5 text-stone-500">{u.kunyah || u.bio || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW: HASIL KUIS & NILAI (ATTEMPTS) */}
          {/* ========================================================= */}
          {activeTab === 'attempts' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-lg font-bold text-stone-900 dark:text-white">
                Hasil & Rekapitulasi Nilai Kuis Santri ({attempts.length})
              </h2>

              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-semibold">
                      <th className="p-3.5">Nama Santri</th>
                      <th className="p-3.5">Email</th>
                      <th className="p-3.5">Skor</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Waktu Submit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                    {displayedAttempts.map(att => (
                      <tr key={att.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition">
                        <td className="p-3.5 font-semibold text-stone-900 dark:text-white">{att.userName || 'Santri'}</td>
                        <td className="p-3.5 text-stone-600 dark:text-stone-300">{att.userEmail}</td>
                        <td className="p-3.5 font-bold text-stone-900 dark:text-white">{att.score}%</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            att.passed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            {att.passed ? 'Lulus' : 'Belum Lulus'}
                          </span>
                        </td>
                        <td className="p-3.5 text-stone-500">{new Date(att.submittedAt).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW: FIREBASE STATUS & DATA MANAGEMENT */}
          {/* ========================================================= */}
          {activeTab === 'firebase' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-lg font-bold text-stone-900 dark:text-white">
                Status Integrasi Cloud Firestore & Data Seed
              </h2>

              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="font-semibold text-sm text-stone-900 dark:text-white">
                    Cloud Firestore Terhubung Real-Time
                  </p>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Seluruh perubahan data mata pelajaran, sesi pembelajaran, PDF, dan kuis evaluasi disimpan secara persisten di Cloud Firestore project ID: <strong>{firebaseConfig.projectId}</strong>.
                </p>

                <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      setConfirmDialog({
                        isOpen: true,
                        title: 'Muat Data Contoh Awal',
                        itemName: 'Koleksi Contoh Kursus & Kuis',
                        message: 'Memuat data contoh ke Cloud Firestore jika koleksi masih kosong.',
                        loading: false,
                        onConfirm: async () => {
                          setConfirmDialog(prev => ({ ...prev, loading: true }));
                          try {
                            await seedInitialDatabase();
                            showStatus('success', 'Data contoh berhasil dimuat.');
                            await loadAllAdminData();
                            onRefreshData();
                            setConfirmDialog(prev => ({ ...prev, isOpen: false, loading: false }));
                          } catch (err: any) {
                            showStatus('error', 'Gagal memuat data: ' + err.message);
                            setConfirmDialog(prev => ({ ...prev, loading: false }));
                          }
                        }
                      });
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition shadow cursor-pointer"
                  >
                    Muat Data Contoh Awal
                  </button>

                  <button
                    onClick={() => {
                      setConfirmDialog({
                        isOpen: true,
                        title: 'Hapus Data Contoh (Dummy)',
                        itemName: 'Pembersihan Dokumen Prototype',
                        message: 'Menghapus dokumen kursus contoh bawaan agar menyisakan data asli buatan Anda.',
                        loading: false,
                        onConfirm: async () => {
                          setConfirmDialog(prev => ({ ...prev, loading: true }));
                          try {
                            await deleteSeedDummyDataFromFirestore();
                            showStatus('success', 'Pembersihan data contoh selesai.');
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
                    className="px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Bersihkan Data Contoh (Dummy)
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

      {/* ========================================================= */}
      {/* 3. MULTI-STEP MODAL: FORM "TAMBAH / EDIT SESI PEMBELAJARAN BARU" */}
      {/* ========================================================= */}
      {editingSessionModalOpen && (
        <div className="fixed inset-0 z-70 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-900/50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-stone-900 dark:text-white font-sans flex items-center gap-2">
                  <Video className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>{sessionFormData.id ? 'Edit Sesi Pembelajaran' : 'Tambah Sesi Pembelajaran Baru'}</span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Isi informasi sesi, video YouTube, PDF/Drive, materi teks, dan kuis evaluasi dalam SATU sesi ini.
                </p>
              </div>

              <button
                onClick={() => setEditingSessionModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 4 Tabs Navigation Bar */}
            <div className="flex border-b border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-800/50 text-xs font-semibold shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setSessionFormTab(1)}
                className={`flex-1 min-w-[120px] py-3 px-4 text-center border-b-2 transition cursor-pointer ${
                  sessionFormTab === 1
                    ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300 bg-white dark:bg-stone-900'
                    : 'border-transparent text-stone-500 hover:text-stone-900 dark:text-stone-400'
                }`}
              >
                1. Informasi Sesi
              </button>
              <button
                type="button"
                onClick={() => setSessionFormTab(2)}
                className={`flex-1 min-w-[120px] py-3 px-4 text-center border-b-2 transition cursor-pointer ${
                  sessionFormTab === 2
                    ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300 bg-white dark:bg-stone-900'
                    : 'border-transparent text-stone-500 hover:text-stone-900 dark:text-stone-400'
                }`}
              >
                2. Video & PDF
              </button>
              <button
                type="button"
                onClick={() => setSessionFormTab(3)}
                className={`flex-1 min-w-[120px] py-3 px-4 text-center border-b-2 transition cursor-pointer ${
                  sessionFormTab === 3
                    ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300 bg-white dark:bg-stone-900'
                    : 'border-transparent text-stone-500 hover:text-stone-900 dark:text-stone-400'
                }`}
              >
                3. Materi Teks (ID/AR)
              </button>
              <button
                type="button"
                onClick={() => setSessionFormTab(4)}
                className={`flex-1 min-w-[120px] py-3 px-4 text-center border-b-2 transition cursor-pointer ${
                  sessionFormTab === 4
                    ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300 bg-white dark:bg-stone-900'
                    : 'border-transparent text-stone-500 hover:text-stone-900 dark:text-stone-400'
                }`}
              >
                4. Kuis ({sessionFormData.enableQuiz ? `${sessionFormData.questions.length} Soal` : 'Non-aktif'})
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveMultiStepSession} className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* TAB 1: INFORMASI SESI */}
              {sessionFormTab === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                      Mata Pelajaran (Course) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={sessionFormData.courseId}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, courseId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-900 dark:text-white"
                      required
                    >
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                        Judul Sesi (Bahasa Indonesia) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={sessionFormData.title}
                        onChange={(e) => setSessionFormData({ ...sessionFormData, title: e.target.value })}
                        placeholder="Contoh: Sesi 1 - Pengantar Kitab"
                        className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-900 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                        Judul Sesi (Bahasa Arab / Matan)
                      </label>
                      <input
                        type="text"
                        value={sessionFormData.titleAr}
                        onChange={(e) => setSessionFormData({ ...sessionFormData, titleAr: e.target.value })}
                        placeholder="المجلس الأول - مقدمة الكتاب"
                        dir="rtl"
                        className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 font-amiri"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                      Deskripsi Ringkas Sesi
                    </label>
                    <textarea
                      rows={3}
                      value={sessionFormData.description}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, description: e.target.value })}
                      placeholder="Penjelasan singkat pokok bahasan pada sesi ini..."
                      className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                        Urutan Sesi (#)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={sessionFormData.order}
                        onChange={(e) => setSessionFormData({ ...sessionFormData, order: Number(e.target.value) || 1 })}
                        className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                        Estimasi Durasi (Menit)
                      </label>
                      <input
                        type="number"
                        min={5}
                        value={sessionFormData.durationMinutes}
                        onChange={(e) => setSessionFormData({ ...sessionFormData, durationMinutes: Number(e.target.value) || 45 })}
                        className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                        Status Publikasi
                      </label>
                      <select
                        value={sessionFormData.isPublished ? 'published' : 'draft'}
                        onChange={(e) => setSessionFormData({ ...sessionFormData, isPublished: e.target.value === 'published' })}
                        className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white font-semibold"
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
                  <div className="space-y-3 bg-stone-50 dark:bg-stone-800/50 p-4 rounded-2xl border border-stone-200 dark:border-stone-700">
                    <h4 className="font-bold text-xs text-stone-900 dark:text-white flex items-center gap-2">
                      <Video className="w-4 h-4 text-rose-500" />
                      <span>Video Rekaman Pembelajaran (YouTube Embed)</span>
                    </h4>

                    <div>
                      <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                        Tautan Video YouTube
                      </label>
                      <input
                        type="url"
                        value={sessionFormData.youtubeUrl}
                        onChange={(e) => setSessionFormData({ ...sessionFormData, youtubeUrl: e.target.value })}
                        placeholder="https://www.youtube.com/watch?v=... atau https://youtu.be/..."
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white"
                      />
                    </div>

                    {sessionFormData.youtubeUrl && (
                      <div className="mt-2 space-y-1">
                        <p className="text-[10px] text-stone-500 font-semibold">Pratinjau Embedded Video Player:</p>
                        <YouTubeEmbed url={sessionFormData.youtubeUrl} title={sessionFormData.title} />
                      </div>
                    )}
                  </div>

                  {/* PDF & Google Drive Section */}
                  <div className="space-y-4 bg-stone-50 dark:bg-stone-800/50 p-4 rounded-2xl border border-stone-200 dark:border-stone-700">
                    <h4 className="font-bold text-xs text-stone-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-500" />
                      <span>Naskah Matan / Modul PDF & Tautan Google Drive</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                          Judul Berkas PDF
                        </label>
                        <input
                          type="text"
                          value={sessionFormData.pdfTitle}
                          onChange={(e) => setSessionFormData({ ...sessionFormData, pdfTitle: e.target.value })}
                          placeholder="Naskah Matan PDF Sesi 1"
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                          Unggah Berkas PDF (Firebase Storage)
                        </label>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => handleFileUpload(e, 'pdfs', (url) => {
                            setSessionFormData(prev => ({ ...prev, pdfUrl: url }));
                          })}
                          className="w-full text-xs text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                        URL Direct Link PDF (atau Hasil Upload)
                      </label>
                      <input
                        type="url"
                        value={sessionFormData.pdfUrl}
                        onChange={(e) => setSessionFormData({ ...sessionFormData, pdfUrl: e.target.value })}
                        placeholder="https://firebasestorage.googleapis.com/... atau URL PDF direct"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                        Link Google Drive PDF (Jika ada)
                      </label>
                      <input
                        type="url"
                        value={sessionFormData.googleDriveUrl}
                        onChange={(e) => setSessionFormData({ ...sessionFormData, googleDriveUrl: e.target.value })}
                        placeholder="https://drive.google.com/file/d/..."
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: MATERI TEKS (ID/AR) */}
              {sessionFormTab === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                      Materi Teks / Catatan Pembelajaran (Bahasa Indonesia)
                    </label>
                    <textarea
                      rows={6}
                      value={sessionFormData.lessonNotes}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, lessonNotes: e.target.value })}
                      placeholder="Ringkasan poin penting, faedah ilmiah, dan penjelasan materi Bahasa Indonesia..."
                      className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white font-sans"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                      Materi Teks / Matan Bahasa Arab
                    </label>
                    <textarea
                      rows={6}
                      value={sessionFormData.descriptionAr}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, descriptionAr: e.target.value })}
                      placeholder="Naskah asli matan Bahasa Arab, syarah, atau terjemahan..."
                      dir="rtl"
                      className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 font-amiri leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: KUIS EVALUASI SESI */}
              {sessionFormTab === 4 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-200">
                        Aktifkan Kuis Evaluasi untuk Sesi Ini
                      </h4>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                        Santri akan mengerjakan kuis evaluasi setelah menyelesaikan materi sesi ini.
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={sessionFormData.enableQuiz}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, enableQuiz: e.target.checked })}
                      className="w-5 h-5 accent-emerald-600 rounded-md cursor-pointer"
                    />
                  </div>

                  {sessionFormData.enableQuiz && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                            Judul Kuis Sesi
                          </label>
                          <input
                            type="text"
                            value={sessionFormData.quizTitle}
                            onChange={(e) => setSessionFormData({ ...sessionFormData, quizTitle: e.target.value })}
                            placeholder={`Kuis Evaluasi - ${sessionFormData.title || 'Sesi'}`}
                            className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                            Passing Grade (%)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={sessionFormData.passingScore}
                            onChange={(e) => setSessionFormData({ ...sessionFormData, passingScore: Number(e.target.value) || 75 })}
                            className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-900 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* QUESTIONS EDITOR LIST */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-stone-900 dark:text-white">
                            Daftar Soal Pertanyaan ({sessionFormData.questions.length})
                          </h4>

                          <button
                            type="button"
                            onClick={handleAddQuestionToSessionForm}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow transition flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Tambah Soal</span>
                          </button>
                        </div>

                        {sessionFormData.questions.length === 0 ? (
                          <p className="text-xs text-stone-500 py-4 italic text-center bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-dashed border-stone-200 dark:border-stone-700">
                            Belum ada soal ditambahkan. Klik "+ Tambah Soal".
                          </p>
                        ) : (
                          sessionFormData.questions.map((q, qIndex) => (
                            <div key={q.id || qIndex} className="p-4 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-2xl space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-emerald-800 dark:text-emerald-300">
                                  Soal #{qIndex + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveQuestionFromSessionForm(qIndex)}
                                  className="text-xs text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                                >
                                  Hapus Soal
                                </button>
                              </div>

                              <div>
                                <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                                  Pertanyaan (Bahasa Indonesia)
                                </label>
                                <input
                                  type="text"
                                  value={q.questionText}
                                  onChange={(e) => {
                                    const updated = [...sessionFormData.questions];
                                    updated[qIndex].questionText = e.target.value;
                                    setSessionFormData({ ...sessionFormData, questions: updated });
                                  }}
                                  className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white"
                                />
                              </div>

                              {/* Options */}
                              <div className="space-y-2 pt-1">
                                <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block">
                                  Pilihan Jawaban & Tentukan Jawaban Benar (Radio):
                                </label>

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
                                      className="accent-emerald-600 cursor-pointer"
                                    />
                                    <span className="text-xs font-bold text-stone-500 w-4">
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
                                      className="flex-1 px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white"
                                    />
                                  </div>
                                ))}
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
              <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingSessionModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>

                <div className="flex items-center gap-2">
                  {sessionFormTab < 4 && (
                    <button
                      type="button"
                      onClick={() => setSessionFormTab((sessionFormTab + 1) as any)}
                      className="px-4 py-2 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 text-stone-900 dark:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      Lanjut ({sessionFormTab + 1}/4)
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={savingSession}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
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
        <div className="fixed inset-0 z-70 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-stone-900 dark:text-white text-base">
                {editingCategory.id ? 'Edit Bab / Modul' : 'Tambah Bab / Modul Baru'}
              </h3>
              <button onClick={() => setEditingCategory(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Nama Bab / Modul (Bahasa Indonesia) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingCategory.name || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  placeholder="Contoh: Fiqh Ibadah, Aqidah, Nahwu"
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Nama Arab
                </label>
                <input
                  type="text"
                  value={editingCategory.nameAr || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, nameAr: e.target.value })}
                  placeholder="فقه العبادات"
                  dir="rtl"
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-emerald-600 font-amiri"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Deskripsi
                </label>
                <textarea
                  rows={2}
                  value={editingCategory.description || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow"
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
        <div className="fixed inset-0 z-70 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 w-full max-w-2xl rounded-3xl p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-stone-900 dark:text-white text-base">
                {editingCourse.id ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
              </h3>
              <button onClick={() => setEditingCourse(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Bab / Modul Kategori <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editingCourse.categoryId || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, categoryId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-900 dark:text-white"
                  required
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Judul Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingCourse.title || ''}
                    onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
                    placeholder="Syarah Matan Al-Ajurumiyah"
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Judul Bahasa Arab
                  </label>
                  <input
                    type="text"
                    value={editingCourse.titleAr || ''}
                    onChange={(e) => setEditingCourse({ ...editingCourse, titleAr: e.target.value })}
                    placeholder="شرح الآجرومية"
                    dir="rtl"
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-emerald-600 font-amiri"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Pengajar / Pengampu
                </label>
                <input
                  type="text"
                  value={editingCourse.instructor || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, instructor: e.target.value })}
                  placeholder="Ustadz Osama, Lc."
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Deskripsi Pembelajaran
                </label>
                <textarea
                  rows={3}
                  value={editingCourse.description || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Gambar Thumbnail Cover (URL / Upload)
                </label>
                <div className="space-y-2">
                  <input
                    type="url"
                    value={editingCourse.coverImageUrl || ''}
                    onChange={(e) => setEditingCourse({ ...editingCourse, coverImageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'covers', (url) => setEditingCourse({ ...editingCourse, coverImageUrl: url }))}
                    className="w-full text-xs text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow"
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
        <div className="fixed inset-0 z-70 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 w-full max-w-2xl rounded-3xl p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-stone-900 dark:text-white text-base">
                {editingQuiz.id ? 'Edit Kuis Evaluasi' : 'Tambah Kuis Evaluasi Baru'}
              </h3>
              <button onClick={() => setEditingQuiz(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuiz} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Judul Kuis Evaluasi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingQuiz.title || ''}
                  onChange={(e) => setEditingQuiz({ ...editingQuiz, title: e.target.value })}
                  placeholder="Kuis Evaluasi Pemahaman"
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editingQuiz.courseId || ''}
                    onChange={(e) => setEditingQuiz({ ...editingQuiz, courseId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white"
                    required
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Passing Grade (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editingQuiz.passingScore ?? 75}
                    onChange={(e) => setEditingQuiz({ ...editingQuiz, passingScore: Number(e.target.value) || 75 })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingQuiz(null)}
                  className="px-4 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow"
                >
                  Simpan Kuis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
