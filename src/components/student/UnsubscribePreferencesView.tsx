import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, ShieldCheck, ArrowLeft, Bell } from 'lucide-react';
import { StudentNotificationPreferences } from '../../types';
import { updateStudentNotificationPreferences } from '../../firebase/services';

interface UnsubscribePreferencesViewProps {
  onBackToHome: () => void;
}

export const UnsubscribePreferencesView: React.FC<UnsubscribePreferencesViewProps> = ({
  onBackToHome
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [preferences, setPreferences] = useState<StudentNotificationPreferences>({
    courses: false,
    articles: false,
    qa: true,
    announcements: false,
    unsubscribedAll: true
  });

  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Parse email query param from URL if present
    const params = new URLSearchParams(window.location.search);
    const em = params.get('email');
    if (em) {
      setEmailInput(em.trim());
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      alert('Harap masukkan alamat email Anda.');
      return;
    }

    setSaving(true);
    try {
      // Clean email address as identifier
      const cleanEmail = emailInput.trim().toLowerCase();
      
      // Update by email via API or service
      await updateStudentNotificationPreferences(cleanEmail, preferences);
      setSubmitted(true);
    } catch (err: any) {
      alert(`Gagal memperbarui preferensi email: ${err?.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 sm:py-16 space-y-6">
      {/* Header */}
      <button
        onClick={onBackToHome}
        className="nb-btn nb-btn-secondary px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Kembali ke Halaman Utama</span>
      </button>

      <div className="p-6 sm:p-8 rounded-md bg-white dark:bg-[#163835] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[6px_6px_0px_#171717] space-y-6">
        <div className="flex items-center gap-3 border-b border-[#171717]/15 dark:border-[#4CA7A1]/30 pb-4">
          <div className="w-10 h-10 rounded bg-[#123D32] text-[#D6AD52] border border-[#171717] flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif-brand font-extrabold text-xl text-[#171717] dark:text-[#CEFEF1]">
              Pengaturan Preferensi Notifikasi Email
            </h2>
            <p className="text-xs text-[#525856] dark:text-[#A6D6C9]">
              Dars with Osama • Halaman Berhenti Menerima Email (Unsubscribe)
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="p-6 rounded-md bg-emerald-50 text-emerald-900 border-2 border-emerald-500 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-base">Preferensi Email Berhasil Diperbarui!</h3>
            <p className="text-xs text-emerald-800 leading-relaxed max-w-md mx-auto">
              Permintaan Anda untuk alamat email <strong>{emailInput}</strong> telah berhasil disimpan. Preferensi Anda akan selalu dihormati oleh sistem Dars with Osama.
            </p>
            <div className="pt-2">
              <button
                onClick={onBackToHome}
                className="nb-btn nb-btn-gold px-5 py-2.5 text-xs font-bold"
              >
                Kembali ke Website Dars with Osama
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#171717] dark:text-[#CEFEF1] block">
                Alamat Email Akun Siswa Anda <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="nama@email.com"
                className="w-full px-3.5 py-2.5 text-xs rounded bg-[#FAF7F0] dark:bg-[#0D2B36] border-2 border-[#171717] dark:border-[#4CA7A1] text-[#171717] dark:text-[#CEFEF1]"
              />
            </div>

            <div className="p-4 rounded bg-[#FAF7F0] dark:bg-[#0D2B36] border border-[#171717]/20 dark:border-[#4CA7A1]/40 space-y-3 text-xs">
              <span className="font-extrabold text-[#123D32] dark:text-[#D6AD52] block">
                Pilih Opsi Preferensi Notifikasi:
              </span>

              <label className="flex items-center justify-between p-2.5 rounded bg-white dark:bg-[#163835] border cursor-pointer">
                <div className="space-y-0.5">
                  <span className="font-bold block text-rose-700 dark:text-rose-400">
                    🚫 Berhenti Menerima Semua Email Notifikasi Umum (Unsubscribe)
                  </span>
                  <span className="text-[11px] text-[#525856] dark:text-[#A6D6C9] block">
                    Tidak lagi menerima email artikel ilmiah, pembelajaran baru, dan pengumuman.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.unsubscribedAll}
                  onChange={(e) => {
                    const unsub = e.target.checked;
                    setPreferences({
                      courses: !unsub,
                      articles: !unsub,
                      qa: true,
                      announcements: !unsub,
                      unsubscribedAll: unsub
                    });
                  }}
                  className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-gray-300"
                />
              </label>

              {!preferences.unsubscribedAll && (
                <div className="space-y-2 pt-2 border-t border-[#171717]/10 dark:border-[#4CA7A1]/20">
                  <label className="flex items-center justify-between p-2 rounded bg-white dark:bg-[#163835] border cursor-pointer">
                    <span>📚 Notifikasi Pembelajaran & Sesi Baru</span>
                    <input
                      type="checkbox"
                      checked={preferences.courses}
                      onChange={(e) => setPreferences({ ...preferences, courses: e.target.checked })}
                      className="w-4 h-4 text-[#123D32]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded bg-white dark:bg-[#163835] border cursor-pointer">
                    <span>📝 Notifikasi Artikel Ilmiah Baru</span>
                    <input
                      type="checkbox"
                      checked={preferences.articles}
                      onChange={(e) => setPreferences({ ...preferences, articles: e.target.checked })}
                      className="w-4 h-4 text-[#123D32]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded bg-white dark:bg-[#163835] border cursor-pointer">
                    <span>📢 Notifikasi Pengumuman Website</span>
                    <input
                      type="checkbox"
                      checked={preferences.announcements}
                      onChange={(e) => setPreferences({ ...preferences, announcements: e.target.checked })}
                      className="w-4 h-4 text-[#123D32]"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="nb-btn nb-btn-gold w-full py-3 text-xs font-bold justify-center"
              >
                {saving ? 'Menyimpan...' : 'Simpan Preferensi Unsubscribe'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
