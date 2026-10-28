import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Video,
  FileText,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Calendar,
  Clock,
  Compass,
  AlertCircle,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { Course, Category, BlogPost, Consultation, Session } from '../../types';
import { getSessionsByCourse, getPublishedPublicQA } from '../../firebase/services';
import { PRODUCTION_SESSIONS, PRODUCTION_CONSULTATIONS } from '../../data/productionCache.js';

export interface SearchResultItem {
  id: string;
  type: 'course' | 'session' | 'article' | 'qa';
  categoryLabel: string;
  title: string;
  titleAr?: string;
  subtitle?: string;
  snippet: string;
  matchedField?: string;
  metadata?: string;
  tags?: string[];
  courseId?: string;
  sessionId?: string;
  blogPostSlug?: string;
  blogPostId?: string;
  qaId?: string;
  relevanceScore: number;
}

interface SearchResultsViewProps {
  query: string;
  courses: Course[];
  categories: Category[];
  blogPosts: BlogPost[];
  onSelectCourse: (course: Course) => void;
  onSelectSession: (course: Course, session: Session) => void;
  onSelectBlogPost: (post: BlogPost) => void;
  onSelectQA: (qaId: string) => void;
  onBackToHome: () => void;
  onExploreCourses: () => void;
  onExploreBlog: () => void;
  onSearchChange: (newQuery: string) => void;
}

function stripHtml(html?: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractRelevantSnippet(text: string, terms: string[], maxLen = 160): string {
  if (!text) return '';
  const clean = text.trim();
  if (terms.length === 0) {
    return clean.length > maxLen ? clean.slice(0, maxLen) + '...' : clean;
  }

  const lower = clean.toLowerCase();
  let firstIdx = -1;
  for (const term of terms) {
    const idx = lower.indexOf(term);
    if (idx !== -1 && (firstIdx === -1 || idx < firstIdx)) {
      firstIdx = idx;
    }
  }

  if (firstIdx === -1) {
    return clean.length > maxLen ? clean.slice(0, maxLen) + '...' : clean;
  }

  const start = Math.max(0, firstIdx - 40);
  const end = Math.min(clean.length, start + maxLen);
  let snippet = clean.slice(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < clean.length) snippet = snippet + '...';
  return snippet;
}

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({
  query: initialQuery,
  courses,
  categories,
  blogPosts,
  onSelectCourse,
  onSelectSession,
  onSelectBlogPost,
  onSelectQA,
  onBackToHome,
  onExploreCourses,
  onExploreBlog,
  onSearchChange
}) => {
  const [searchInput, setSearchInput] = useState<string>(initialQuery || '');
  const [activeTab, setActiveTab] = useState<'all' | 'course' | 'session' | 'article' | 'qa'>('all');

  // Real data state for sessions across courses and public Q&A
  const [sessionsData, setSessionsData] = useState<{ course: Course; session: Session }[]>([]);
  const [qaData, setQaData] = useState<Consultation[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Sync internal searchInput when initialQuery prop updates from URL/navigation
  useEffect(() => {
    setSearchInput(initialQuery || '');
  }, [initialQuery]);

  // Fetch all sessions and published public QA once or when courses change
  const fetchSearchData = async () => {
    setIsLoadingData(true);
    setLoadError(null);

    try {
      // 1. Fetch public QA
      const qaPromise = getPublishedPublicQA(false).catch((err) => {
        console.warn('[SearchResults] QA fetch fallback notice:', err);
        return PRODUCTION_CONSULTATIONS.filter((c) => c.isPublished);
      });

      // 2. Fetch sessions for all published courses in parallel
      const sessionPromises = courses.map(async (course) => {
        try {
          const sessions = await getSessionsByCourse(course.id, false);
          return sessions.map((session) => ({ course, session }));
        } catch (e) {
          console.warn(`[SearchResults] Course ${course.id} session fallback notice:`, e);
          const fallback = PRODUCTION_SESSIONS.filter((s) => s.courseId === course.id && s.isPublished !== false);
          return fallback.map((session) => ({ course, session }));
        }
      });

      const [qaResults, ...sessionResults] = await Promise.all([qaPromise, ...sessionPromises]);

      setQaData(qaResults || []);
      const flatSessions = sessionResults.flat();
      setSessionsData(flatSessions);
    } catch (err: any) {
      console.warn('[SearchResults] Global search data fetch notice:', err);
      setLoadError('Sebagian data pencarian menggunakan salinan memori lokal cadangan.');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchSearchData();
  }, [courses]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchInput.trim().replace(/\s+/g, ' ');
    if (clean) {
      onSearchChange(clean);
    }
  };

  const handleClear = () => {
    setSearchInput('');
    onSearchChange('');
  };

  // Category ID to Category Map
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of categories) {
      map.set(cat.id, cat.name);
    }
    return map;
  }, [categories]);

  // Compute search results across real website data
  const { allResults, counts } = useMemo(() => {
    const trimmed = (initialQuery || '').trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      return {
        allResults: [] as SearchResultItem[],
        counts: { all: 0, course: 0, session: 0, article: 0, qa: 0 }
      };
    }

    const queryLower = trimmed.toLowerCase();
    const terms = queryLower.split(' ').filter(Boolean);

    const results: SearchResultItem[] = [];

    // Helper to test if any term matches
    const containsAny = (source?: string | null): boolean => {
      if (!source) return false;
      const sLower = source.toLowerCase();
      return terms.some((t) => sLower.includes(t));
    };

    // Helper to calculate relevance score
    const calcScore = (title?: string, content?: string, tags?: string[]): number => {
      let score = 0;
      const tLower = (title || '').toLowerCase();
      const cLower = (content || '').toLowerCase();

      // Exact phrase match in title
      if (tLower.includes(queryLower)) score += 50;
      // All terms in title
      if (terms.every((t) => tLower.includes(t))) score += 30;
      // Any term in title
      terms.forEach((t) => {
        if (tLower.includes(t)) score += 15;
      });

      // Tags matching
      if (tags) {
        tags.forEach((tag) => {
          if (terms.some((t) => tag.toLowerCase().includes(t))) score += 10;
        });
      }

      // Exact phrase in content
      if (cLower.includes(queryLower)) score += 15;
      // Terms in content
      terms.forEach((t) => {
        if (cLower.includes(t)) score += 5;
      });

      return score;
    };

    // 1. Search Courses / Kitab
    courses.forEach((course) => {
      const catName = categoryMap.get(course.categoryId) || '';
      const courseKitab = (course as any).kitabTitle || '';
      const courseAuthor = (course as any).author || course.instructor;
      const courseTags: string[] = Array.isArray((course as any).tags) ? (course as any).tags : [];

      const isTitleMatch = containsAny(course.title) || containsAny(course.titleAr);
      const isDescMatch = containsAny(course.description) || containsAny(course.descriptionAr);
      const isKitabMatch = containsAny(courseKitab) || containsAny(courseAuthor);
      const isInstructorMatch = containsAny(course.instructor) || containsAny(course.instructorTitle);
      const isCatMatch = containsAny(catName);
      const isTagMatch = courseTags.some((tg: string) => containsAny(tg));

      if (isTitleMatch || isDescMatch || isKitabMatch || isInstructorMatch || isCatMatch || isTagMatch) {
        const textToSnippet = isDescMatch
          ? course.description
          : isKitabMatch
          ? `Kitab: ${courseKitab} oleh ${courseAuthor}. ${course.description}`
          : course.description;

        const score = calcScore(course.title, course.description, courseTags) + (isTitleMatch ? 20 : 0);

        results.push({
          id: `course-${course.id}`,
          type: 'course',
          categoryLabel: 'Kitab & Kursus',
          title: course.title,
          titleAr: course.titleAr,
          subtitle: courseKitab ? `Kitab: ${courseKitab}` : `Kategori: ${catName || 'Kajian Syar\'i'}`,
          snippet: extractRelevantSnippet(textToSnippet, terms),
          metadata: `Tingkat: ${course.level === 'beginner' ? 'Pemula' : course.level === 'intermediate' ? 'Menengah' : 'Lanjutan'} • Pengajar: ${course.instructor}`,
          tags: courseTags,
          courseId: course.id,
          relevanceScore: score
        });
      }
    });

    // 2. Search Sessions
    sessionsData.forEach(({ course, session }) => {
      const isTitleMatch = containsAny(session.title) || containsAny(session.titleAr);
      const isDescMatch = containsAny(session.description) || containsAny(session.descriptionAr);
      const isNotesMatch = containsAny(session.lessonNotes);
      const isPdfMatch = containsAny(session.pdfTitle);
      const isChapterMatch = containsAny((session as any).chapterTitle) || containsAny((session as any).moduleTitle);
      const isParentCourseMatch = containsAny(course.title);

      if (isTitleMatch || isDescMatch || isNotesMatch || isPdfMatch || isChapterMatch || isParentCourseMatch) {
        const textToSnippet = isDescMatch
          ? session.description
          : isNotesMatch
          ? stripHtml(session.lessonNotes)
          : isPdfMatch
          ? `Naskah PDF: ${session.pdfTitle}. ${session.description || ''}`
          : `Sesi pembelajaran dalam kitab "${course.title}". ${session.description || ''}`;

        const score = calcScore(session.title, session.description) + (isTitleMatch ? 25 : 5);

        results.push({
          id: `session-${session.id}`,
          type: 'session',
          categoryLabel: 'Sesi Pembelajaran',
          title: session.title,
          titleAr: session.titleAr,
          subtitle: `Bagian dari: ${course.title}`,
          snippet: extractRelevantSnippet(textToSnippet, terms),
          metadata: `${session.durationMinutes ? `Durasi: ${session.durationMinutes} menit • ` : ''}Urutan Sesi #${session.order || 1}`,
          courseId: course.id,
          sessionId: session.id,
          relevanceScore: score
        });
      }
    });

    // 3. Search Blog Posts / Articles
    blogPosts.forEach((post) => {
      const plainContent = stripHtml(post.content);
      const tags = post.tags || [];
      const isTitleMatch = containsAny(post.title) || containsAny(post.titleAr);
      const isExcerptMatch = containsAny(post.excerpt);
      const isContentMatch = containsAny(plainContent);
      const isCategoryMatch = containsAny(post.category);
      const isTagMatch = tags.some((tg) => containsAny(tg));

      if (isTitleMatch || isExcerptMatch || isContentMatch || isCategoryMatch || isTagMatch) {
        const textToSnippet = isExcerptMatch ? post.excerpt : isContentMatch ? plainContent : post.excerpt || plainContent;
        const score = calcScore(post.title, plainContent, tags) + (isTitleMatch ? 20 : 0);

        results.push({
          id: `article-${post.id}`,
          type: 'article',
          categoryLabel: 'Artikel Ilmiah',
          title: post.title,
          titleAr: post.titleAr,
          subtitle: `Kategori: ${post.category || 'Kajian Umum'}`,
          snippet: extractRelevantSnippet(textToSnippet, terms),
          metadata: `Penulis: ${post.authorName || 'Ustaz Osama'} • Waktu baca: ${post.readingTimeMinutes || 3} menit`,
          tags: post.tags,
          blogPostSlug: post.slug,
          blogPostId: post.id,
          relevanceScore: score
        });
      }
    });

    // 4. Search Q&A / Consultations
    qaData.forEach((qa) => {
      const plainAnswer = stripHtml(qa.replyContent);
      const isTitleMatch = containsAny(qa.title);
      const isContentMatch = containsAny(qa.content);
      const isAnswerMatch = containsAny(plainAnswer);
      const isTopicMatch = containsAny((qa as any).topic) || containsAny(qa.category);

      if (isTitleMatch || isContentMatch || isAnswerMatch || isTopicMatch) {
        const textToSnippet = isAnswerMatch
          ? `Jawaban: ${plainAnswer}`
          : isContentMatch
          ? `Pertanyaan: ${qa.content}`
          : qa.title;

        const score = calcScore(qa.title, `${qa.content} ${plainAnswer}`) + (isTitleMatch ? 20 : 0);

        results.push({
          id: `qa-${qa.id}`,
          type: 'qa',
          categoryLabel: 'Tanya Jawab',
          title: qa.title,
          subtitle: 'Arsip Tanya Jawab Syar\'i',
          snippet: extractRelevantSnippet(textToSnippet, terms),
          metadata: `Status: Terjawab • ${qa.publishedAt ? new Date(qa.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Terbit'}`,
          qaId: qa.id,
          relevanceScore: score
        });
      }
    });

    // Sort by relevance score descending
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const counts = {
      all: results.length,
      course: results.filter((r) => r.type === 'course').length,
      session: results.filter((r) => r.type === 'session').length,
      article: results.filter((r) => r.type === 'article').length,
      qa: results.filter((r) => r.type === 'qa').length
    };

    return { allResults: results, counts };
  }, [initialQuery, courses, sessionsData, blogPosts, qaData, categoryMap]);

  // Filtered by active tab
  const displayedResults = useMemo(() => {
    if (activeTab === 'all') return allResults;
    return allResults.filter((r) => r.type === activeTab);
  }, [allResults, activeTab]);

  // Highlight search term in rendered text
  const renderHighlighted = (text: string) => {
    const trimmed = (initialQuery || '').trim().replace(/\s+/g, ' ');
    if (!trimmed || !text) return text;

    const terms = trimmed.toLowerCase().split(' ').filter(Boolean);
    if (terms.length === 0) return text;

    // Build regex to split and preserve matches
    const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) => {
      if (terms.some((t) => t.toLowerCase() === part.toLowerCase())) {
        return (
          <mark
            key={i}
            className="bg-[#D6AD52]/40 dark:bg-[#4CA7A1]/40 text-[#171717] dark:text-[#CEFEF1] font-extrabold px-1 py-0.5 rounded-xs"
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  const handleItemClick = (item: SearchResultItem) => {
    if (item.type === 'course' && item.courseId) {
      const course = courses.find((c) => c.id === item.courseId);
      if (course) onSelectCourse(course);
    } else if (item.type === 'session' && item.courseId && item.sessionId) {
      const pair = sessionsData.find((s) => s.session.id === item.sessionId && s.course.id === item.courseId);
      if (pair) {
        onSelectSession(pair.course, pair.session);
      } else {
        const parentCourse = courses.find((c) => c.id === item.courseId);
        if (parentCourse) onSelectCourse(parentCourse);
      }
    } else if (item.type === 'article') {
      const targetPost = blogPosts.find((p) => p.slug === item.blogPostSlug || p.id === item.blogPostId);
      if (targetPost) onSelectBlogPost(targetPost);
    } else if (item.type === 'qa' && item.qaId) {
      onSelectQA(item.qaId);
    }
  };

  const getItemBadgeIcon = (type: SearchResultItem['type']) => {
    switch (type) {
      case 'course':
        return <BookOpen className="w-3.5 h-3.5" />;
      case 'session':
        return <Video className="w-3.5 h-3.5" />;
      case 'article':
        return <FileText className="w-3.5 h-3.5" />;
      case 'qa':
        return <HelpCircle className="w-3.5 h-3.5" />;
    }
  };

  const getItemBadgeClass = (type: SearchResultItem['type']) => {
    switch (type) {
      case 'course':
        return 'bg-[#123D32] text-[#D6AD52] dark:bg-[#4CA7A1] dark:text-[#001722] border-[#171717] dark:border-[#CEFEF1]';
      case 'session':
        return 'bg-[#237A70] text-white dark:bg-[#1F5F63] dark:text-[#CEFEF1] border-[#171717] dark:border-[#4CA7A1]';
      case 'article':
        return 'bg-[#D6AD52] text-[#171717] dark:bg-[#EFE5D2] dark:text-[#171717] border-[#171717]';
      case 'qa':
        return 'bg-[#4CA7A1] text-[#001722] dark:bg-[#CEFEF1] dark:text-[#001722] border-[#171717]';
    }
  };

  const getItemActionLabel = (type: SearchResultItem['type']) => {
    switch (type) {
      case 'course':
        return 'Buka Pembelajaran';
      case 'session':
        return 'Putar Sesi Video';
      case 'article':
        return 'Baca Artikel Ilmiah';
      case 'qa':
        return 'Buka Tanya Jawab';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
      {/* Top Breadcrumb & Back Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white dark:bg-[#0D2B36] hover:bg-[#EFE5D2] dark:hover:bg-[#1F5F63] text-[#171717] dark:text-[#CEFEF1] border-2 border-[#171717] dark:border-[#4CA7A1] text-xs font-bold transition shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1]" />
          <span>Kembali ke Beranda</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-[#626A66] dark:text-[#A6D6C9]">
            Pencarian Terpadu Dars with Osama
          </span>
        </div>
      </div>

      {/* Main Search Query Bar */}
      <div className="bg-[#FAF7F0] dark:bg-[#0D2B36] p-4 sm:p-6 rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#001722] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold font-serif text-[#171717] dark:text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-[#123D32] dark:text-[#4CA7A1]" />
              <span>Hasil Pencarian Materi</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#525855] dark:text-[#A6D6C9] mt-0.5">
              Menelusuri kitab, kurikulum pembelajaran, sesi video halaqah, artikel ilmiah, dan arsip tanya jawab syar'i.
            </p>
          </div>

          {initialQuery && (
            <div className="text-xs font-extrabold px-3 py-1.5 rounded-md bg-[#EFE5D2] dark:bg-[#1F5F63] border-2 border-[#171717] dark:border-[#4CA7A1] text-[#123D32] dark:text-[#CEFEF1] shrink-0 self-start sm:self-auto">
              Total Ditemukan: {counts.all} Materi
            </div>
          )}
        </div>

        {/* Interactive Search Input Box */}
        <form onSubmit={handleFormSubmit} className="relative flex items-center">
          <div className="pl-3.5 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1]" />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari judul matan, kitab, kursus, atau artikel ilmiah..."
            className="w-full pl-3 pr-28 sm:pr-32 py-2.5 sm:py-3 rounded-md bg-white dark:bg-[#001722] border-2 border-[#171717] dark:border-[#4CA7A1] text-xs sm:text-sm font-bold text-[#171717] dark:text-[#CEFEF1] placeholder-[#626A66]/75 dark:placeholder-[#A6D6C9]/70 focus:outline-none focus:shadow-[3px_3px_0px_#123D32] dark:focus:shadow-[3px_3px_0px_#001722]"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Hapus kata kunci"
              className="absolute right-20 sm:right-24 top-1/2 -translate-y-1/2 text-[#626A66] dark:text-[#A6D6C9] hover:text-[#D9534F] p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 sm:px-5 bg-[#123D32] dark:bg-[#4CA7A1] hover:bg-[#195344] dark:hover:bg-[#5EBEB7] text-[#FAF7F0] dark:text-[#001722] font-extrabold text-xs uppercase tracking-wider rounded border-2 border-[#171717] dark:border-[#001722] transition-all flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] active:translate-x-[1px] active:translate-y-[1px]"
          >
            <span>Cari</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Active Query Status Indicator */}
        {initialQuery ? (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="text-xs text-[#171717] dark:text-[#CEFEF1]">
              Kata kunci aktif:{' '}
              <span className="font-extrabold underline decoration-[#D6AD52] decoration-2 underline-offset-2">
                "{initialQuery}"
              </span>
            </p>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-bold text-[#123D32] dark:text-[#4CA7A1] hover:underline cursor-pointer"
            >
              Reset Pencarian
            </button>
          </div>
        ) : (
          <p className="text-xs text-[#626A66] dark:text-[#A6D6C9] pt-1">
            Ketik kata kunci di atas untuk mencari di seluruh materi pembelajaran dan artikel.
          </p>
        )}
      </div>

      {/* Category Tabs */}
      {initialQuery && (
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-[#171717]/20 dark:border-[#1F5F63] pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md border-2 text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-[#123D32] text-white border-[#171717] dark:bg-[#4CA7A1] dark:text-[#001722] dark:border-[#CEFEF1] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]'
                : 'bg-white dark:bg-[#0D2B36] hover:bg-[#EFE5D2] dark:hover:bg-[#1F5F63] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/40 dark:border-[#4CA7A1]'
            }`}
          >
            <span>Semua Hasil</span>
            <span className="px-1.5 py-0.2 rounded-xs bg-black/20 dark:bg-black/30 text-[10px]">
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('course')}
            className={`px-3 py-1.5 rounded-md border-2 text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'course'
                ? 'bg-[#123D32] text-white border-[#171717] dark:bg-[#4CA7A1] dark:text-[#001722] dark:border-[#CEFEF1] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]'
                : 'bg-white dark:bg-[#0D2B36] hover:bg-[#EFE5D2] dark:hover:bg-[#1F5F63] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/40 dark:border-[#4CA7A1]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Kitab &amp; Kursus</span>
            <span className="px-1.5 py-0.2 rounded-xs bg-black/20 dark:bg-black/30 text-[10px]">
              {counts.course}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('session')}
            className={`px-3 py-1.5 rounded-md border-2 text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'session'
                ? 'bg-[#123D32] text-white border-[#171717] dark:bg-[#4CA7A1] dark:text-[#001722] dark:border-[#CEFEF1] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]'
                : 'bg-white dark:bg-[#0D2B36] hover:bg-[#EFE5D2] dark:hover:bg-[#1F5F63] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/40 dark:border-[#4CA7A1]'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Sesi Video</span>
            <span className="px-1.5 py-0.2 rounded-xs bg-black/20 dark:bg-black/30 text-[10px]">
              {counts.session}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('article')}
            className={`px-3 py-1.5 rounded-md border-2 text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'article'
                ? 'bg-[#123D32] text-white border-[#171717] dark:bg-[#4CA7A1] dark:text-[#001722] dark:border-[#CEFEF1] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]'
                : 'bg-white dark:bg-[#0D2B36] hover:bg-[#EFE5D2] dark:hover:bg-[#1F5F63] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/40 dark:border-[#4CA7A1]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Artikel Ilmiah</span>
            <span className="px-1.5 py-0.2 rounded-xs bg-black/20 dark:bg-black/30 text-[10px]">
              {counts.article}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qa')}
            className={`px-3 py-1.5 rounded-md border-2 text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'qa'
                ? 'bg-[#123D32] text-white border-[#171717] dark:bg-[#4CA7A1] dark:text-[#001722] dark:border-[#CEFEF1] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]'
                : 'bg-white dark:bg-[#0D2B36] hover:bg-[#EFE5D2] dark:hover:bg-[#1F5F63] text-[#171717] dark:text-[#CEFEF1] border-[#171717]/40 dark:border-[#4CA7A1]'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Tanya Jawab</span>
            <span className="px-1.5 py-0.2 rounded-xs bg-black/20 dark:bg-black/30 text-[10px]">
              {counts.qa}
            </span>
          </button>
        </div>
      )}

      {/* Loading State Indicator */}
      {isLoadingData && (
        <div className="p-8 text-center bg-white dark:bg-[#0D2B36] rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#001722] space-y-3">
          <div className="w-8 h-8 border-3 border-[#123D32] dark:border-[#4CA7A1] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs sm:text-sm font-bold text-[#171717] dark:text-[#CEFEF1]">
            Memindai seluruh kitab, sesi pembelajaran, naskah artikel, dan arsip tanya jawab...
          </p>
        </div>
      )}

      {/* Main Results Display */}
      {!isLoadingData && initialQuery && (
        <>
          {displayedResults.length > 0 ? (
            <div className="space-y-4">
              {displayedResults.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="p-4 sm:p-5 rounded-md bg-white dark:bg-[#0D2B36] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[4px_4px_0px_#001722] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#171717] dark:hover:shadow-[5px_5px_0px_#001722] transition-all cursor-pointer group space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-[11px] font-extrabold uppercase tracking-wide border ${getItemBadgeClass(
                          item.type
                        )}`}
                      >
                        {getItemBadgeIcon(item.type)}
                        <span>{item.categoryLabel}</span>
                      </span>

                      {item.subtitle && (
                        <span className="text-xs font-bold text-[#626A66] dark:text-[#A6D6C9]">
                          {item.subtitle}
                        </span>
                      )}
                    </div>

                    {item.metadata && (
                      <span className="text-[11px] font-semibold text-[#626A66] dark:text-[#A6D6C9]">
                        {item.metadata}
                      </span>
                    )}
                  </div>

                  {/* Title & Arabic Title */}
                  <div className="space-y-1">
                    <h3 className="font-serif font-bold text-base sm:text-lg text-[#171717] dark:text-white group-hover:text-[#123D32] dark:group-hover:text-[#CEFEF1] transition-colors leading-snug">
                      {renderHighlighted(item.title)}
                    </h3>
                    {item.titleAr && (
                      <p className="font-amiri text-base sm:text-lg text-[#123D32] dark:text-[#D6AD52] leading-relaxed" dir="rtl">
                        {item.titleAr}
                      </p>
                    )}
                  </div>

                  {/* Snippet */}
                  <p className="text-xs sm:text-sm text-[#525855] dark:text-[#CEFEF1]/90 leading-relaxed font-medium">
                    {renderHighlighted(item.snippet)}
                  </p>

                  {/* Tags & Action Link */}
                  <div className="pt-2 border-t border-[#171717]/15 dark:border-[#1F5F63] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.tags?.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-xs bg-[#FAF7F0] dark:bg-[#001722] border border-[#171717]/30 dark:border-[#4CA7A1]/40 text-[10px] font-bold text-[#171717] dark:text-[#A6D6C9]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemClick(item);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#123D32] dark:text-[#4CA7A1] group-hover:underline cursor-pointer"
                    >
                      <span>{getItemActionLabel(item.type)}</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Clear Communicative Empty State */
            <div className="p-8 sm:p-12 text-center bg-white dark:bg-[#0D2B36] rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#001722] space-y-4">
              <div className="w-14 h-14 rounded-md bg-[#EFE5D2] dark:bg-[#1F5F63] border-2 border-[#171717] dark:border-[#4CA7A1] flex items-center justify-center mx-auto text-[#123D32] dark:text-[#CEFEF1] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]">
                <FolderOpen className="w-7 h-7" />
              </div>

              <div className="space-y-1.5 max-w-lg mx-auto">
                <h3 className="font-serif font-bold text-lg sm:text-xl text-[#171717] dark:text-white">
                  Tidak Ada Hasil yang Cocok
                </h3>
                <p className="text-xs sm:text-sm text-[#525855] dark:text-[#A6D6C9] leading-relaxed">
                  Tidak ditemukan materi atau artikel yang cocok dengan kata kunci{' '}
                  <strong className="text-[#171717] dark:text-[#CEFEF1]">"{initialQuery}"</strong>
                  {activeTab !== 'all' ? ` pada kategori ${activeTab}.` : '.'}
                </p>
              </div>

              {/* Helpful Suggestions */}
              <div className="max-w-md mx-auto p-4 rounded-md bg-[#FAF7F0] dark:bg-[#001722] border-2 border-[#171717]/30 dark:border-[#4CA7A1]/40 text-left space-y-2">
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#123D32] dark:text-[#A6D6C9]">
                  Saran Pencarian:
                </p>
                <ul className="text-xs text-[#525855] dark:text-[#A6D6C9] space-y-1 list-disc pl-4">
                  <li>Periksa kembali ejaan kata kunci yang Anda masukkan.</li>
                  <li>Gunakan kata kunci yang lebih umum, seperti: <em className="text-[#123D32] dark:text-[#CEFEF1] font-bold">tajwid</em>, <em className="text-[#123D32] dark:text-[#CEFEF1] font-bold">arbain</em>, <em className="text-[#123D32] dark:text-[#CEFEF1] font-bold">syarah</em>, <em className="text-[#123D32] dark:text-[#CEFEF1] font-bold">fiqih</em>, atau <em className="text-[#123D32] dark:text-[#CEFEF1] font-bold">adab</em>.</li>
                  {activeTab !== 'all' && (
                    <li>
                      Coba pilih tab{' '}
                      <button
                        type="button"
                        onClick={() => setActiveTab('all')}
                        className="underline font-bold text-[#123D32] dark:text-[#4CA7A1] cursor-pointer"
                      >
                        Semua Hasil
                      </button>{' '}
                      untuk mencari di luar kategori ini.
                    </li>
                  )}
                </ul>
              </div>

              {/* Action Buttons to Explore Catalog & Blog */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onExploreCourses}
                  className="px-4 py-2 bg-[#123D32] dark:bg-[#4CA7A1] hover:bg-[#195344] dark:hover:bg-[#5EBEB7] text-[#FAF7F0] dark:text-[#001722] font-extrabold text-xs uppercase tracking-wider rounded border-2 border-[#171717] dark:border-[#001722] transition shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] active:translate-x-[1px] active:translate-y-[1px] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Jelajahi Katalog Kitab</span>
                </button>

                <button
                  type="button"
                  onClick={onExploreBlog}
                  className="px-4 py-2 bg-white dark:bg-[#1F5F63] hover:bg-[#EFE5D2] dark:hover:bg-[#0D2B36] text-[#171717] dark:text-[#CEFEF1] font-extrabold text-xs uppercase tracking-wider rounded border-2 border-[#171717] dark:border-[#4CA7A1] transition shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722] active:translate-x-[1px] active:translate-y-[1px] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Baca Artikel Ilmiah</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Prompt when query is empty */}
      {!isLoadingData && !initialQuery && (
        <div className="p-8 sm:p-12 text-center bg-white dark:bg-[#0D2B36] rounded-md border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#001722] space-y-4">
          <div className="w-12 h-12 rounded-md bg-[#FAF7F0] dark:bg-[#1F5F63] border-2 border-[#171717] dark:border-[#4CA7A1] flex items-center justify-center mx-auto text-[#123D32] dark:text-[#4CA7A1] shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#001722]">
            <Compass className="w-6 h-6" />
          </div>

          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-serif font-bold text-base sm:text-lg text-[#171717] dark:text-white">
              Cari Pembelajaran dan Artikel
            </h3>
            <p className="text-xs sm:text-sm text-[#525855] dark:text-[#A6D6C9]">
              Masukkan judul matan, nama kitab, topik fikih, atau istilah keilmuan yang ingin Anda pelajari.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="text-xs font-bold text-[#626A66] dark:text-[#A6D6C9]">Contoh pencarian:</span>
            {['Tajwid', 'Arbain', 'Thaharah', 'Adab Penuntut Ilmu', 'Hadits'].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setSearchInput(sample);
                  onSearchChange(sample);
                }}
                className="px-2.5 py-1 rounded-sm bg-[#FAF7F0] dark:bg-[#001722] hover:bg-[#D6AD52] dark:hover:bg-[#1F5F63] border border-[#171717] dark:border-[#4CA7A1] text-xs font-extrabold text-[#171717] dark:text-[#CEFEF1] transition cursor-pointer shadow-[1px_1px_0px_#171717] dark:shadow-[1px_1px_0px_#001722]"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
