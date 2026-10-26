import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  PlayCircle,
  Sparkles,
  ArrowRight,
  Settings
} from 'lucide-react';
import { Course, Enrollment, QuizAttempt } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getUserEnrollments, getUserQuizAttempts } from '../../firebase/services';

interface StudentDashboardProps {
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onOpenCertificate: (course: Course) => void;
  onExploreCourses: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  courses,
  onSelectCourse,
  onExploreCourses
}) => {
  const { user, userProfile, loading: authLoading, openProfileModal, openGuestModal } = useAuth();
  useLanguage();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attempts, setPastAttempts] = useState<QuizAttempt[]>([]);
  const [, setLoading] = useState(true);

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
        <div className="w-10 h-10 border-3 border-[#06251D] dark:border-[#D9AC45] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-[#171717] dark:text-[#F8F3E8] font-bold">Memeriksa status akun siswa...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6 animate-fade-in-up">
        <div className="w-16 h-16 mx-auto rounded-lg bg-[#D9AC45] border-2 border-[#171717] shadow-[4px_4px_0px_#171717] flex items-center justify-center text-[#171717]">
          <GraduationCap className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171717] dark:text-[#F8F3E8] font-serif-brand">
            Dashboard Pembelajaran Dars with Osama
          </h2>
          <p className="text-[#171717]/80 dark:text-[#F8F3E8]/80 text-sm max-w-lg mx-auto leading-relaxed">
            Silakan masuk ke akun Dars with Osama untuk mulai belajar, melihat riwayat kemajuan materi, catatan evaluasi kuis, dan sertifikat kelulusan Anda.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => openGuestModal()}
            className="nb-btn nb-btn-primary w-full sm:w-auto px-6 py-3.5 text-sm"
          >
            Masuk / Daftar Akun
          </button>
          <button
            onClick={onExploreCourses}
            className="nb-btn nb-btn-secondary w-full sm:w-auto px-5 py-3.5 text-sm"
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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 sm:space-y-10 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="nb-card bg-white dark:bg-[#06251D] text-[#171717] dark:text-[#F8F3E8] border-2 border-[#171717] dark:border-[#D9AC45] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#000000]">
        <div className="space-y-2.5">
          <div className="nb-badge bg-[#D9AC45] text-[#171717]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dashboard Penuntut Ilmu Syar'i</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] dark:text-[#F8F3E8] font-serif-brand flex flex-wrap items-center gap-3">
            <span>Ahlan wa Sahlan, {userProfile?.displayName || user.email?.split('@')[0]}</span>
            {userProfile?.kunyah && <span className="text-[#0B6B50] dark:text-[#D9AC45] font-amiri text-xl">({userProfile.kunyah})</span>}
          </h1>
          <p className="text-xs sm:text-sm text-[#57534E] dark:text-[#A7B5AE] max-w-xl">
            Lanjutkan sesi pembelajaran Anda dan pantau kemajuan pemahaman syarah matan secara mandiri.
          </p>
          <div className="pt-2">
            <button
              onClick={() => openProfileModal()}
              className="nb-btn nb-btn-gold px-4 py-2 text-xs"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Pengaturan Profil & Foto</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="bg-[#F5EFE2] dark:bg-[#0B3026] border-2 border-[#171717] dark:border-[#D9AC45] p-3.5 rounded-md text-center shadow-[3px_3px_0px_#171717]">
            <p className="text-xl sm:text-2xl font-extrabold text-[#0B6B50] dark:text-[#D9AC45]">{enrollments.length}</p>
            <p className="text-[11px] font-bold text-[#171717] dark:text-[#F8F3E8] mt-0.5">Kursus Diikuti</p>
          </div>
          <div className="bg-[#F5EFE2] dark:bg-[#0B3026] border-2 border-[#171717] dark:border-[#D9AC45] p-3.5 rounded-md text-center shadow-[3px_3px_0px_#171717]">
            <p className="text-xl sm:text-2xl font-extrabold text-[#0B6B50] dark:text-[#D9AC45]">{totalSessionsDone}</p>
            <p className="text-[11px] font-bold text-[#171717] dark:text-[#F8F3E8] mt-0.5">Sesi Tuntas</p>
          </div>
          <div className="bg-[#F5EFE2] dark:bg-[#0B3026] border-2 border-[#171717] dark:border-[#D9AC45] p-3.5 rounded-md text-center shadow-[3px_3px_0px_#171717]">
            <p className="text-xl sm:text-2xl font-extrabold text-[#0B6B50] dark:text-[#D9AC45]">{averageQuizScore}%</p>
            <p className="text-[11px] font-bold text-[#171717] dark:text-[#F8F3E8] mt-0.5">Rerata Nilai</p>
          </div>
          <div className="bg-[#F5EFE2] dark:bg-[#0B3026] border-2 border-[#171717] dark:border-[#D9AC45] p-3.5 rounded-md text-center shadow-[3px_3px_0px_#171717]">
            <p className="text-xl sm:text-2xl font-extrabold text-[#0B6B50] dark:text-[#D9AC45]">{completedCourses.length}</p>
            <p className="text-[11px] font-bold text-[#171717] dark:text-[#F8F3E8] mt-0.5">Kursus Selesai</p>
          </div>
        </div>
      </div>

      {/* Enrolled Courses Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#171717] dark:text-[#F8F3E8] font-serif-brand flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#0B6B50] dark:text-[#D9AC45]" />
              <span>Kursus yang Sedang Diikuti ({enrollments.length})</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#57534E] dark:text-[#A7B5AE]">
              Pilih kursus untuk melanjutkan sesi terakhir yang Anda pelajari.
            </p>
          </div>

          <button
            onClick={onExploreCourses}
            className="nb-btn nb-btn-secondary px-3.5 py-2 text-xs"
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
                  className="nb-card nb-card-interactive p-5 flex flex-col justify-between space-y-4 bg-white dark:bg-[#0B3026] group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`nb-badge ${enr.isCompleted ? 'bg-[#D9AC45] text-[#171717]' : 'bg-[#0B6B50] text-white dark:bg-[#06251D] dark:text-[#D9AC45]'}`}>
                        {enr.isCompleted ? 'Tuntas 100%' : 'Sedang Dipelajari'}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-base text-[#171717] dark:text-[#F8F3E8] group-hover:text-[#0B6B50] dark:group-hover:text-[#D9AC45] transition-colors line-clamp-1">
                        {course.title}
                      </h3>
                      {course.titleAr && (
                        <p className="font-amiri text-lg font-bold text-[#0B6B50] dark:text-[#D9AC45] line-clamp-1 mt-0.5" dir="rtl">
                          {course.titleAr}
                        </p>
                      )}
                      <p className="text-xs text-[#57534E] dark:text-[#A7B5AE] mt-1 line-clamp-1 font-semibold">
                        Pensyarah: {course.instructor}
                      </p>
                    </div>

                    {/* Progress details */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs font-bold text-[#171717] dark:text-[#F8F3E8]">
                        <span>Progres Penyelesaian</span>
                        <span className="text-[#0B6B50] dark:text-[#D9AC45]">{enr.progressPercent}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-[#F5EFE2] dark:bg-[#06251D] rounded-sm border border-[#171717] overflow-hidden">
                        <div
                          className="h-full bg-[#D9AC45] transition-all duration-700 ease-out"
                          style={{ width: `${enr.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t-2 border-[#171717]/15 dark:border-[#D9AC45]/30 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#171717] dark:text-[#F8F3E8] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0B6B50] dark:text-[#D9AC45]" />
                      <span>{enr.completedSessionIds?.length || 0} Sesi Selesai</span>
                    </span>

                    <button
                      onClick={() => onSelectCourse(course)}
                      className="nb-btn nb-btn-primary px-4 py-2 text-xs"
                    >
                      <PlayCircle className="w-4 h-4 text-[#D9AC45]" />
                      <span>Lanjutkan</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="nb-card p-8 text-center space-y-4 bg-white dark:bg-[#0B3026]">
            <BookOpen className="w-12 h-12 text-[#0B6B50] dark:text-[#D9AC45] mx-auto" />
            <h4 className="text-base font-extrabold text-[#171717] dark:text-[#F8F3E8]">Belum Ada Kursus yang Diikuti</h4>
            <p className="text-xs text-[#57534E] dark:text-[#A7B5AE] max-w-sm mx-auto">
              Jelajahi kurikulum ilmu syar'i kami dan daftarkan diri pada kajian yang ingin Anda pelajari.
            </p>
            <button
              onClick={onExploreCourses}
              className="nb-btn nb-btn-primary px-5 py-2.5 text-xs"
            >
              Jelajahi Katalog Kursus
            </button>
          </div>
        )}
      </div>

      {/* Quiz Scores & History Table */}
      <div className="space-y-4 pt-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#171717] dark:text-[#F8F3E8] font-serif-brand flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#0B6B50] dark:text-[#D9AC45]" />
            <span>Riwayat Ujian & Nilai Kuis ({attempts.length})</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#57534E] dark:text-[#A7B5AE]">
            Catatan pengerjaan kuis evaluasi pemahaman yang tersimpan permanen di akun Anda.
          </p>
        </div>

        {attempts.length > 0 ? (
          <div className="nb-card overflow-hidden bg-white dark:bg-[#0B3026]">
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[550px] text-left text-xs sm:text-sm">
                <thead className="bg-[#F5EFE2] dark:bg-[#06251D] text-[#171717] dark:text-[#D9AC45] uppercase text-[11px] font-extrabold border-b-2 border-[#171717]">
                  <tr>
                    <th className="px-5 py-3.5 whitespace-nowrap">Kursus & ID Kuis</th>
                    <th className="px-5 py-3.5 whitespace-nowrap">Tanggal</th>
                    <th className="px-5 py-3.5 whitespace-nowrap">Percobaan Ke-</th>
                    <th className="px-5 py-3.5 text-center whitespace-nowrap">Skor Poin</th>
                    <th className="px-5 py-3.5 text-center whitespace-nowrap">Nilai Akhir</th>
                    <th className="px-5 py-3.5 text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-[#171717]/15 dark:divide-[#D9AC45]/25 text-[#171717] dark:text-[#F8F3E8]">
                  {attempts.map((att) => {
                    const course = courseMap.get(att.courseId);
                    return (
                      <tr key={att.id} className="hover:bg-[#F5EFE2] dark:hover:bg-[#06251D]/60 transition">
                        <td className="px-5 py-4 min-w-[180px]">
                          <p className="font-extrabold text-[#171717] dark:text-[#F8F3E8] break-words">{course?.title || att.courseId}</p>
                          <p className="text-[11px] text-[#57534E] dark:text-[#A7B5AE] font-mono break-all">Kuis: {att.quizId}</p>
                        </td>
                        <td className="px-5 py-4 font-medium whitespace-nowrap">
                          {new Date(att.submittedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-5 py-4 font-bold">
                          Ke-{att.attemptNumber || 1}
                        </td>
                        <td className="px-5 py-4 text-center font-mono font-bold">
                          {att.totalPoints} / {att.maxPoints}
                        </td>
                        <td className="px-5 py-4 text-center font-extrabold">
                          <span className={att.passed ? 'text-[#0B6B50] dark:text-[#D9AC45]' : 'text-[#F04438]'}>
                            {att.score}%
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`nb-badge ${
                            att.passed
                              ? 'bg-[#0B6B50] text-white dark:bg-[#D9AC45] dark:text-[#171717]'
                              : 'bg-[#F04438] text-white'
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
          <div className="nb-card p-6 text-center text-[#57534E] dark:text-[#A7B5AE] text-xs bg-white dark:bg-[#0B3026]">
            Belum ada riwayat pengerjaan kuis. Kuis dapat dikerjakan setelah menyimak sesi pembelajaran.
          </div>
        )}
      </div>
    </div>
  );
};
