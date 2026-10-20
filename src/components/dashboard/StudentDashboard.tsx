import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  Award,
  CheckCircle2,
  Clock,
  PlayCircle,
  TrendingUp,
  FileText,
  Calendar,
  Sparkles,
  ArrowRight,
  Settings,
  User
} from 'lucide-react';
import { Course, Enrollment, QuizAttempt } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getUserEnrollments, getUserQuizAttempts } from '../../firebase/services';
import { ProfileSettingsModal } from '../common/ProfileSettingsModal';

interface StudentDashboardProps {
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onOpenCertificate: (course: Course) => void;
  onExploreCourses: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  courses,
  onSelectCourse,
  onOpenCertificate,
  onExploreCourses
}) => {
  const { user, userProfile, loading: authLoading, openProfileModal, openGuestModal } = useAuth();
  const { t } = useLanguage();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attempts, setPastAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getUserEnrollments(user.uid),
      getUserQuizAttempts(user.uid)
    ]).then(([enrList, attList]) => {
      setEnrollments(enrList);
      setPastAttempts(attList.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
      setLoading(false);
    }).catch(err => {
      console.warn('Dashboard fetch error:', err);
      setLoading(false);
    });
  }, [user]);

  if (authLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-stone-600 dark:text-stone-400 font-medium">Memeriksa status akun siswa...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6 animate-fade-in-up">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center text-emerald-800 dark:text-emerald-400 shadow-xl">
          <GraduationCap className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white font-sans">
            Dashboard Pembelajaran Dars with Osama
          </h2>
          <p className="text-stone-600 dark:text-stone-300 text-sm max-w-lg mx-auto leading-relaxed">
            Silakan masuk atau buat akun terlebih dahulu untuk melihat riwayat kemajuan materi, catatan evaluasi kuis, dan sertifikat kelulusan Anda.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => openGuestModal()}
            className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm transition shadow-lg cursor-pointer active:scale-95"
          >
            Masuk / Daftar Akun
          </button>
          <button
            onClick={onExploreCourses}
            className="w-full sm:w-auto px-5 py-3.5 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-xl font-medium text-sm transition cursor-pointer active:scale-95 shadow-xs"
          >
            Jelajahi Katalog Pembelajaran
          </button>
        </div>
      </div>
    );
  }

  const courseMap = new Map<string, Course>();
  courses.forEach(c => courseMap.set(c.id, c));

  const totalSessionsDone = enrollments.reduce((acc, curr) => acc + (curr.completedSessionIds?.length || 0), 0);
  const completedCourses = enrollments.filter(e => e.isCompleted);
  const averageQuizScore = attempts.length > 0 
    ? Math.round(attempts.reduce((acc, a) => acc + a.score, 0) / attempts.length) 
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-stone-800 to-stone-900 dark:from-emerald-950 dark:via-stone-900 dark:to-stone-950 border border-emerald-600/30 dark:border-emerald-800/40 p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 text-white">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-900/60 text-emerald-300 text-xs font-semibold rounded-full border border-emerald-700/50">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Dashboard Penuntut Ilmu Syar'i</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-sans flex flex-wrap items-center gap-3">
            <span>Ahlan wa Sahlan, {userProfile?.displayName || user.email?.split('@')[0]}</span>
            {userProfile?.kunyah && <span className="text-emerald-400 font-amiri text-xl">({userProfile.kunyah})</span>}
          </h1>
          <p className="text-xs sm:text-sm text-stone-200 dark:text-stone-300 max-w-xl">
            Lanjutkan sesi pembelajaran Anda dan pantau kemajuan pemahaman syarah matan secara mandiri.
          </p>
          <div className="pt-2">
            <button
              onClick={() => openProfileModal()}
              className="px-4 py-2 bg-emerald-700/70 hover:bg-emerald-600/80 text-emerald-100 border border-emerald-500/40 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow active:scale-95"
            >
              <Settings className="w-3.5 h-3.5 text-emerald-300" />
              <span>Pengaturan Profil & Foto</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Pill Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 hover:border-emerald-600/40 p-3.5 rounded-2xl text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg animate-fade-in-up animation-delay-100 shadow-xs">
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{enrollments.length}</p>
            <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">Kursus Diikuti</p>
          </div>
          <div className="bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 hover:border-amber-600/40 p-3.5 rounded-2xl text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg animate-fade-in-up animation-delay-200 shadow-xs">
            <p className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400">{totalSessionsDone}</p>
            <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">Sesi Tuntas</p>
          </div>
          <div className="bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 hover:border-emerald-600/40 p-3.5 rounded-2xl text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg animate-fade-in-up animation-delay-300 shadow-xs">
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-300">{averageQuizScore}%</p>
            <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">Rerata Nilai</p>
          </div>
          <div className="bg-white/95 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 hover:border-amber-600/40 p-3.5 rounded-2xl text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg animate-fade-in-up animation-delay-400 shadow-xs">
            <p className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-300">{completedCourses.length}</p>
            <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">Kursus Selesai</p>
          </div>
        </div>
      </div>

      {/* Enrolled Courses Section */}
      <div className="space-y-4 animate-fade-in-up animation-delay-200">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white font-sans flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Kursus yang Sedang Diikuti ({enrollments.length})</span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
              Pilih kursus untuk melanjutkan sesi terakhir yang Anda pelajari.
            </p>
          </div>

          <button
            onClick={onExploreCourses}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer"
          >
            <span>Tambah Kursus Baru</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {enrollments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrollments.map((enr) => {
              const course = courseMap.get(enr.courseId);
              if (!course) return null;

              return (
                <div
                  key={enr.id}
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-emerald-500/40 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-xl dark:shadow-none hover:-translate-y-1.5 transition-all duration-300 group animate-fade-in-up"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-[10px] font-semibold rounded-lg transition-transform duration-200 group-hover:scale-105">
                        {enr.isCompleted ? 'Tuntas 100%' : 'Sedang Dipelajari'}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-stone-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200 line-clamp-1">
                        {course.title}
                      </h3>
                      {course.titleAr && (
                        <p className="font-amiri text-lg font-bold text-emerald-700 dark:text-emerald-400/90 line-clamp-1 mt-0.5" dir="rtl">
                          {course.titleAr}
                        </p>
                      )}
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-1">
                        Pensyarah: {course.instructor}
                      </p>
                    </div>

                    {/* Progress details */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                        <span>Progres Penyelesaian</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{enr.progressPercent}%</span>
                      </div>
                      <div className="w-full h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${enr.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
                      <span>{enr.completedSessionIds?.length || 0} Sesi Selesai</span>
                    </span>

                    <button
                      onClick={() => onSelectCourse(course)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 shadow hover:shadow-emerald-900/50 cursor-pointer"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>Lanjutkan</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 text-center space-y-4 shadow-xs">
            <BookOpen className="w-12 h-12 text-stone-400 dark:text-stone-600 mx-auto" />
            <h4 className="text-base font-semibold text-stone-800 dark:text-stone-200">Belum Ada Kursus yang Diikuti</h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
              Jelajahi kurikulum ilmu syar'i kami dan daftarkan diri pada kajian yang ingin Anda pelajari.
            </p>
            <button
              onClick={onExploreCourses}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-semibold transition shadow cursor-pointer"
            >
              Jelajahi Katalog Kursus
            </button>
          </div>
        )}
      </div>

      {/* Quiz Scores & History Table */}
      <div className="space-y-4 pt-4 animate-fade-in-up animation-delay-300">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white font-sans flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Riwayat Ujian & Nilai Kuis ({attempts.length})</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
            Catatan pengerjaan kuis evaluasi pemahaman yang tersimpan permanen di akun Anda.
          </p>
        </div>

        {attempts.length > 0 ? (
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs dark:shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-stone-50 dark:bg-stone-950 text-stone-600 dark:text-stone-400 uppercase text-[11px] font-semibold border-b border-stone-200 dark:border-stone-800">
                  <tr>
                    <th className="px-5 py-3.5">Kursus & ID Kuis</th>
                    <th className="px-5 py-3.5">Tanggal</th>
                    <th className="px-5 py-3.5">Percobaan Ke-</th>
                    <th className="px-5 py-3.5 text-center">Skor Poin</th>
                    <th className="px-5 py-3.5 text-center">Nilai Akhir</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800 text-stone-700 dark:text-stone-300">
                  {attempts.map((att) => {
                    const course = courseMap.get(att.courseId);
                    return (
                      <tr key={att.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-stone-900 dark:text-white">{course?.title || att.courseId}</p>
                          <p className="text-[11px] text-stone-500 font-mono">Kuis: {att.quizId}</p>
                        </td>
                        <td className="px-5 py-4 text-stone-500 dark:text-stone-400 whitespace-nowrap">
                          {new Date(att.submittedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-5 py-4 text-stone-500 dark:text-stone-400">
                          Ke-{att.attemptNumber || 1}
                        </td>
                        <td className="px-5 py-4 text-center font-mono">
                          {att.totalPoints} / {att.maxPoints}
                        </td>
                        <td className="px-5 py-4 text-center font-bold">
                          <span className={att.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {att.score}%
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            att.passed
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                          }`}>
                            {att.passed ? 'Lulus' : 'Belum Lulus'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 text-center text-stone-500 dark:text-stone-400 text-xs shadow-xs">
            Belum ada riwayat pengerjaan kuis. Kuis dapat dikerjakan setelah menyimak sesi pembelajaran.
          </div>
        )}
      </div>
    </div>
  );
};
