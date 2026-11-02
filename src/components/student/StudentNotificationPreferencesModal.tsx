import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, XCircle, AlertCircle, ShieldCheck, Mail, Info } from 'lucide-react';
import { StudentNotificationPreferences, UserProfile } from '../../types';
import { updateStudentNotificationPreferences, saveUserProfile } from '../../firebase/services';
import { useAuth } from '../../context/AuthContext';

interface StudentNotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: UserProfile | null;
}

export const StudentNotificationPreferencesModal: React.FC<StudentNotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
  userProfile: propUserProfile
}) => {
  const { userProfile: authUserProfile, updateUserProfile, user } = useAuth();
  const profile = propUserProfile || authUserProfile;

  const [preferences, setPreferences] = useState<StudentNotificationPreferences>({
    courses: true,
    articles: true,
    qa: true,
    announcements: true,
    unsubscribedAll: false
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.notificationPreferences) {
      setPreferences({
        courses: profile.notificationPreferences.courses !== false,
        articles: profile.notificationPreferences.articles !== false,
        qa: profile.notificationPreferences.qa !== false,
        announcements: profile.notificationPreferences.announcements !== false,
        unsubscribedAll: !!profile.notificationPreferences.unsubscribedAll
      });
    }
  }, [profile]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);

    try {
      if (user?.uid) {
        await updateStudentNotificationPreferences(user.uid, preferences);
        await updateUserProfile({
          notificationPreferences: preferences
        });
      }
      setSuccessMsg('Preferensi notifikasi email Anda berhasil disimpan!');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      alert(`Gagal menyimpan preferensi: ${err?.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUnsubscribeAll = (unsubAll: boolean) => {
    if (unsubAll) {
      setPreferences({
        courses: false,
        articles: false,
        qa: true, // Keep QA response for their own question enabled
        announcements: false,
        unsubscribedAll: true
      });
    } else {
      setPreferences({
        courses: true,
        articles: true,
        qa: true,
        announcements: true,
        unsubscribedAll: false
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#163835] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[8px_8px_0px_#171717] rounded-md max-w-lg w-full p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#171717]/15 dark:border-[#4CA7A1]/30 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded bg-[#123D32] text-[#D6AD52] border border-[#171717]">
              <Bell className="w-4 h-4" />
            </span>
            <h3 className="font-serif-brand font-extrabold text-base text-[#171717] dark:text-[#CEFEF1]">
              Preferensi Notifikasi Email Siswa
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="nb-btn nb-btn-secondary p-1 text-xs"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-[#525856] dark:text-[#A6D6C9] leading-relaxed">
          Atur jenis pemberitahuan yang ingin Anda terima melalui email. Kami menghormati privasi dan pilihan preferensi Anda.
        </p>

        {successMsg && (
          <div className="p-3 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Master Unsubscribe Toggle */}
          <div className="p-3.5 rounded bg-[#FAF7F0] dark:bg-[#0D2B36] border border-[#171717]/20 dark:border-[#4CA7A1]/40 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-extrabold text-[#171717] dark:text-[#CEFEF1] block">
                  Berhenti Menerima Notifikasi Umum
                </span>
                <span className="text-[11px] text-[#525856] dark:text-[#A6D6C9] block">
                  Nonaktifkan seluruh email pemberitahuan materi, artikel, dan pengumuman
                </span>
              </div>

              <input
                type="checkbox"
                checked={preferences.unsubscribedAll}
                onChange={(e) => handleToggleUnsubscribeAll(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-gray-300 cursor-pointer"
              />
            </div>
          </div>

          {/* Detailed Category Checkboxes */}
          <div className="space-y-2.5 pt-1">
            <span className="text-xs font-extrabold text-[#123D32] dark:text-[#D6AD52] uppercase tracking-wider block">
              Pilihan Kategori Email:
            </span>

            {/* Courses */}
            <label className="flex items-center justify-between p-2.5 rounded bg-white dark:bg-[#0D2B36] border border-[#171717]/15 dark:border-[#4CA7A1]/30 cursor-pointer hover:bg-[#FAF7F0] dark:hover:bg-[#163835] transition">
              <div className="flex items-center gap-2">
                <span className="text-sm">📚</span>
                <span className="text-xs font-bold text-[#171717] dark:text-[#CEFEF1]">
                  Materi Pembelajaran & Sesi Baru
                </span>
              </div>
              <input
                type="checkbox"
                checked={preferences.courses && !preferences.unsubscribedAll}
                disabled={preferences.unsubscribedAll}
                onChange={(e) => setPreferences({ ...preferences, courses: e.target.checked })}
                className="w-4 h-4 rounded text-[#123D32] focus:ring-[#123D32] border-gray-300 cursor-pointer"
              />
            </label>

            {/* Articles */}
            <label className="flex items-center justify-between p-2.5 rounded bg-white dark:bg-[#0D2B36] border border-[#171717]/15 dark:border-[#4CA7A1]/30 cursor-pointer hover:bg-[#FAF7F0] dark:hover:bg-[#163835] transition">
              <div className="flex items-center gap-2">
                <span className="text-sm">📝</span>
                <span className="text-xs font-bold text-[#171717] dark:text-[#CEFEF1]">
                  Artikel Ilmiah Baru
                </span>
              </div>
              <input
                type="checkbox"
                checked={preferences.articles && !preferences.unsubscribedAll}
                disabled={preferences.unsubscribedAll}
                onChange={(e) => setPreferences({ ...preferences, articles: e.target.checked })}
                className="w-4 h-4 rounded text-[#123D32] focus:ring-[#123D32] border-gray-300 cursor-pointer"
              />
            </label>

            {/* QA */}
            <label className="flex items-center justify-between p-2.5 rounded bg-white dark:bg-[#0D2B36] border border-[#171717]/15 dark:border-[#4CA7A1]/30 cursor-pointer hover:bg-[#FAF7F0] dark:hover:bg-[#163835] transition">
              <div className="flex items-center gap-2">
                <span className="text-sm">❓</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#171717] dark:text-[#CEFEF1]">
                    Jawaban Tanya Jawab Saya
                  </span>
                  <span className="text-[10px] text-[#525856] dark:text-[#A6D6C9]">
                    Notifikasi ketika pertanyaan Anda telah dijawab
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.qa}
                onChange={(e) => setPreferences({ ...preferences, qa: e.target.checked })}
                className="w-4 h-4 rounded text-[#123D32] focus:ring-[#123D32] border-gray-300 cursor-pointer"
              />
            </label>

            {/* Announcements */}
            <label className="flex items-center justify-between p-2.5 rounded bg-white dark:bg-[#0D2B36] border border-[#171717]/15 dark:border-[#4CA7A1]/30 cursor-pointer hover:bg-[#FAF7F0] dark:hover:bg-[#163835] transition">
              <div className="flex items-center gap-2">
                <span className="text-sm">📢</span>
                <span className="text-xs font-bold text-[#171717] dark:text-[#CEFEF1]">
                  Pengumuman Penting Website
                </span>
              </div>
              <input
                type="checkbox"
                checked={preferences.announcements && !preferences.unsubscribedAll}
                disabled={preferences.unsubscribedAll}
                onChange={(e) => setPreferences({ ...preferences, announcements: e.target.checked })}
                className="w-4 h-4 rounded text-[#123D32] focus:ring-[#123D32] border-gray-300 cursor-pointer"
              />
            </label>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#171717]/10 dark:border-[#4CA7A1]/20">
            <button
              type="button"
              onClick={onClose}
              className="nb-btn nb-btn-secondary px-4 py-2 text-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="nb-btn nb-btn-gold px-5 py-2 text-xs font-bold"
            >
              {saving ? 'Menyimpan...' : 'Simpan Preferensi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
