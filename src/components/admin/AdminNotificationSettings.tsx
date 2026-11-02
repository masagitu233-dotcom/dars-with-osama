import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Users,
  Settings,
  Bell,
  Sparkles,
  RefreshCw,
  Eye,
  Info,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { EmailNotification, SystemNotificationSettings, NotificationDispatchPayload } from '../../types';
import {
  getSystemNotificationSettings,
  saveSystemNotificationSettings,
  getEmailNotificationLogs,
  dispatchNotificationEmail
} from '../../firebase/services';
import { generateEmailHtml, generateEmailPlainText } from '../../utils/emailTemplateHelper';

export const AdminNotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemNotificationSettings>({
    enabled: true,
    coursesEnabled: true,
    articlesEnabled: true,
    qaEnabled: true,
    announcementsEnabled: true,
    senderName: 'Dars with Osama',
    senderEmail: 'notifikasi@darswithosama.com'
  });

  const [logs, setLogs] = useState<EmailNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Broadcast Form State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastSubtitle, setBroadcastSubtitle] = useState('PENGUMUMAN PENTING DARS WITH OSAMA');
  const [broadcastSummary, setBroadcastSummary] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcastTargetUrl, setBroadcastTargetUrl] = useState('https://darswithosama.com');
  const [broadcastButtonText, setBroadcastButtonText] = useState('Buka Informasi Website');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<any | null>(null);

  // Modal State for viewing email log detail
  const [selectedLog, setSelectedLog] = useState<EmailNotification | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sData, lData] = await Promise.all([
        getSystemNotificationSettings(),
        getEmailNotificationLogs()
      ]);
      setSettings(sData);
      setLogs(lData);
    } catch (err) {
      console.warn('Error loading notification settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSaveSuccessMsg(null);
    try {
      const updated = await saveSystemNotificationSettings(settings);
      setSettings(updated);
      setSaveSuccessMsg('Pengaturan notifikasi email berhasil diperbarui!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Gagal menyimpan pengaturan: ${err?.message || err}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastSummary.trim()) {
      alert('Harap isi judul dan ringkasan pengumuman.');
      return;
    }

    if (!confirm('Apakah Anda yakin ingin mengirimkan pengumuman ini ke seluruh siswa yang memenuhi syarat?')) {
      return;
    }

    setSendingBroadcast(true);
    setBroadcastResult(null);

    const payload: NotificationDispatchPayload = {
      type: 'announcement',
      title: broadcastTitle.trim(),
      subtitle: broadcastSubtitle.trim(),
      summary: broadcastSummary.trim(),
      contentHtml: broadcastContent.trim() ? `<p>${broadcastContent.trim().replace(/\n/g, '<br/>')}</p>` : undefined,
      targetUrl: broadcastTargetUrl.trim() || 'https://darswithosama.com',
      targetButtonText: broadcastButtonText.trim() || 'Buka Informasi Website',
      idempotencyKey: `announcement-${Date.now()}`,
      isManualBroadcast: true
    };

    try {
      const res = await dispatchNotificationEmail(payload);
      setBroadcastResult(res);
      if (res.success) {
        setBroadcastTitle('');
        setBroadcastSummary('');
        setBroadcastContent('');
        loadData(); // Reload email logs
      }
    } catch (err: any) {
      setBroadcastResult({
        success: false,
        error: err?.message || String(err)
      });
    } finally {
      setSendingBroadcast(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-[#123D32] dark:border-[#4CA7A1] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-[#171717] dark:text-[#CEFEF1]">Memuat Pengaturan Notifikasi Email...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-md bg-[#FAF7F0] dark:bg-[#102C2B] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#071918] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded bg-[#123D32] text-[#D6AD52] border border-[#171717]">
              <Mail className="w-4 h-4" />
            </span>
            <h2 className="font-serif-brand font-extrabold text-lg sm:text-xl text-[#171717] dark:text-[#CEFEF1]">
              Sistem Notifikasi Email Siswa
            </h2>
          </div>
          <p className="text-xs text-[#525856] dark:text-[#A6D6C9] max-w-2xl leading-relaxed">
            Kelola pemberitahuan email otomatis untuk materi pembelajaran baru, artikel ilmiah, jawaban Q&A, serta pengiriman pengumuman khusus kepada siswa Dars with Osama.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="nb-btn nb-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Audit & Evaluasi Provider Service Banner */}
      <div className="p-4 sm:p-5 rounded-md bg-white dark:bg-[#163835] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#171717]/15 dark:border-[#4CA7A1]/30 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#123D32] dark:text-[#D6AD52] uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Audit Infrastruktur Pengiriman Email Backend</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#123D32] text-[#D6AD52] font-extrabold border border-[#171717]">
            Server Route: /api/send-notification-email
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded bg-[#FAF7F0] dark:bg-[#0D2B36] border border-[#171717]/20 dark:border-[#4CA7A1]/30 space-y-1">
            <div className="font-bold text-[#171717] dark:text-[#CEFEF1] flex items-center gap-1.5">
              <span>📧 Resend API (Rekomendasi Utama)</span>
            </div>
            <p className="text-[11px] text-[#525856] dark:text-[#A6D6C9] leading-relaxed">
              <strong>Batas Gratis:</strong> 3,000 email/bulan (100 email/hari).<br />
              <strong>Potensi Biaya:</strong> $0 (Gratis) untuk kuota dasar.<br />
              <strong>Konfigurasi:</strong> Pasang env <code>RESEND_API_KEY</code> di server.
            </p>
          </div>

          <div className="p-3 rounded bg-[#FAF7F0] dark:bg-[#0D2B36] border border-[#171717]/20 dark:border-[#4CA7A1]/30 space-y-1">
            <div className="font-bold text-[#171717] dark:text-[#CEFEF1] flex items-center gap-1.5">
              <span>📬 Brevo / Sendinblue</span>
            </div>
            <p className="text-[11px] text-[#525856] dark:text-[#A6D6C9] leading-relaxed">
              <strong>Batas Gratis:</strong> 300 email/hari.<br />
              <strong>Potensi Biaya:</strong> $0 (Gratis) tanpa kartu kredit.<br />
              <strong>Konfigurasi:</strong> Pasang env <code>BREVO_API_KEY</code>.
            </p>
          </div>

          <div className="p-3 rounded bg-[#FAF7F0] dark:bg-[#0D2B36] border border-[#171717]/20 dark:border-[#4CA7A1]/30 space-y-1">
            <div className="font-bold text-[#171717] dark:text-[#CEFEF1] flex items-center gap-1.5">
              <span>🛡️ Mode Simulasi Aman (Default)</span>
            </div>
            <p className="text-[11px] text-[#525856] dark:text-[#A6D6C9] leading-relaxed">
              Jika belum ada API key, sistem berjalan dalam <strong>Mode Simulasi</strong>. Riwayat, sampel penerima, dan template visual lengkap tetap dicatat tanpa risiko eror atau biaya.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Settings & Broadcast Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Form Pengaturan Notifikasi */}
        <form onSubmit={handleSaveSettings} className="p-5 rounded-md bg-white dark:bg-[#163835] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#071918] space-y-5">
          <div className="flex items-center justify-between border-b border-[#171717]/15 dark:border-[#4CA7A1]/30 pb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#123D32] dark:text-[#D6AD52]" />
              <h3 className="font-serif-brand font-extrabold text-sm sm:text-base text-[#171717] dark:text-[#CEFEF1]">
                Pengaturan Kategori Notifikasi
              </h3>
            </div>
            {saveSuccessMsg && (
              <span className="text-[11px] font-bold text-[#123D32] dark:text-[#CEFEF1] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#4CA7A1]" />
                <span>{saveSuccessMsg}</span>
              </span>
            )}
          </div>

          {/* Master Global Toggle */}
          <div className="p-3.5 rounded bg-[#FAF7F0] dark:bg-[#0D2B36] border border-[#171717]/20 dark:border-[#4CA7A1]/40 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-extrabold text-[#171717] dark:text-[#CEFEF1] block">
                Status Notifikasi Email Website
              </span>
              <span className="text-[11px] text-[#525856] dark:text-[#A6D6C9] block">
                Izinkan sistem mengirimkan notifikasi email otomatis ke siswa
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#123D32]" />
            </label>
          </div>

          {/* Individual Category Toggles */}
          <div className="space-y-3 pt-1">
            <span className="text-xs font-extrabold text-[#123D32] dark:text-[#D6AD52] uppercase tracking-wider block">
              Kategori Yang Diizinkan Mengirim Email:
            </span>

            <div className="space-y-2">
              {/* Category: Courses */}
              <label className="flex items-center justify-between p-2.5 rounded bg-white dark:bg-[#0D2B36] border border-[#171717]/15 dark:border-[#4CA7A1]/30 cursor-pointer hover:bg-[#FAF7F0] dark:hover:bg-[#163835] transition">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📚</span>
                  <span className="text-xs font-bold text-[#171717] dark:text-[#CEFEF1]">
                    Pembelajaran & Sesi Baru
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.coursesEnabled}
                  onChange={(e) => setSettings({ ...settings, coursesEnabled: e.target.checked })}
                  disabled={!settings.enabled}
                  className="w-4 h-4 rounded text-[#123D32] focus:ring-[#123D32] border-gray-300 cursor-pointer"
                />
              </label>

              {/* Category: Articles */}
              <label className="flex items-center justify-between p-2.5 rounded bg-white dark:bg-[#0D2B36] border border-[#171717]/15 dark:border-[#4CA7A1]/30 cursor-pointer hover:bg-[#FAF7F0] dark:hover:bg-[#163835] transition">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📝</span>
                  <span className="text-xs font-bold text-[#171717] dark:text-[#CEFEF1]">
                    Artikel Ilmiah Baru
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.articlesEnabled}
                  onChange={(e) => setSettings({ ...settings, articlesEnabled: e.target.checked })}
                  disabled={!settings.enabled}
                  className="w-4 h-4 rounded text-[#123D32] focus:ring-[#123D32] border-gray-300 cursor-pointer"
                />
              </label>

              {/* Category: QA */}
              <label className="flex items-center justify-between p-2.5 rounded bg-white dark:bg-[#0D2B36] border border-[#171717]/15 dark:border-[#4CA7A1]/30 cursor-pointer hover:bg-[#FAF7F0] dark:hover:bg-[#163835] transition">
                <div className="flex items-center gap-2">
                  <span className="text-sm">❓</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#171717] dark:text-[#CEFEF1]">
                      Tanya Jawab & Konsultasi Syar'i
                    </span>
                    <span className="text-[10px] text-[#525856] dark:text-[#A6D6C9]">
                      (Dikirim khusus ke penanya yang bersangkutan)
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.qaEnabled}
                  onChange={(e) => setSettings({ ...settings, qaEnabled: e.target.checked })}
                  disabled={!settings.enabled}
                  className="w-4 h-4 rounded text-[#123D32] focus:ring-[#123D32] border-gray-300 cursor-pointer"
                />
              </label>

              {/* Category: Announcements */}
              <label className="flex items-center justify-between p-2.5 rounded bg-white dark:bg-[#0D2B36] border border-[#171717]/15 dark:border-[#4CA7A1]/30 cursor-pointer hover:bg-[#FAF7F0] dark:hover:bg-[#163835] transition">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📢</span>
                  <span className="text-xs font-bold text-[#171717] dark:text-[#CEFEF1]">
                    Pengumuman Khusus Website
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.announcementsEnabled}
                  onChange={(e) => setSettings({ ...settings, announcementsEnabled: e.target.checked })}
                  disabled={!settings.enabled}
                  className="w-4 h-4 rounded text-[#123D32] focus:ring-[#123D32] border-gray-300 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Sender Information Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#171717] dark:text-[#CEFEF1] block">
                Nama Pengirim (Display Name)
              </label>
              <input
                type="text"
                value={settings.senderName}
                onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-[#0D2B36] border border-[#171717] dark:border-[#4CA7A1] text-[#171717] dark:text-[#CEFEF1]"
                placeholder="Dars with Osama"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#171717] dark:text-[#CEFEF1] block">
                Email Pengirim (Sender Email)
              </label>
              <input
                type="email"
                value={settings.senderEmail}
                onChange={(e) => setSettings({ ...settings, senderEmail: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded bg-white dark:bg-[#0D2B36] border border-[#171717] dark:border-[#4CA7A1] text-[#171717] dark:text-[#CEFEF1]"
                placeholder="notifikasi@darswithosama.com"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              className="nb-btn nb-btn-gold px-4 py-2.5 text-xs font-bold w-full justify-center"
            >
              {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan Notifikasi'}
            </button>
          </div>
        </form>

        {/* Card 2: Form Broadcast Pengumuman Khusus */}
        <form onSubmit={handleSendBroadcast} className="p-5 rounded-md bg-white dark:bg-[#163835] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#071918] space-y-4">
          <div className="flex items-center justify-between border-b border-[#171717]/15 dark:border-[#4CA7A1]/30 pb-3">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-[#123D32] dark:text-[#D6AD52]" />
              <h3 className="font-serif-brand font-extrabold text-sm sm:text-base text-[#171717] dark:text-[#CEFEF1]">
                Kirim Pengumuman Khusus ke Siswa
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#D6AD52] text-[#171717] font-extrabold border border-[#171717]">
              Manual Action Only
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-[#171717] dark:text-[#CEFEF1] block">
                Subjek / Judul Pengumuman <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                required
                placeholder="Contoh: Jadwal Sesi Pembelajaran Kitab Daurah Syawwal"
                className="w-full px-3 py-2 rounded bg-white dark:bg-[#0D2B36] border border-[#171717] dark:border-[#4CA7A1] text-[#171717] dark:text-[#CEFEF1]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#171717] dark:text-[#CEFEF1] block">
                Sub-Header / Label Pengumuman
              </label>
              <input
                type="text"
                value={broadcastSubtitle}
                onChange={(e) => setBroadcastSubtitle(e.target.value)}
                placeholder="PENGUMUMAN PENTING DARS WITH OSAMA"
                className="w-full px-3 py-2 rounded bg-white dark:bg-[#0D2B36] border border-[#171717] dark:border-[#4CA7A1] text-[#171717] dark:text-[#CEFEF1]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#171717] dark:text-[#CEFEF1] block">
                Ringkasan Singkat Pesan <span className="text-red-500">*</span>
              </label>
              <textarea
                value={broadcastSummary}
                onChange={(e) => setBroadcastSummary(e.target.value)}
                required
                rows={2}
                placeholder="Ringkasan 1-2 kalimat yang akan tampil di kotak utama email..."
                className="w-full px-3 py-2 rounded bg-white dark:bg-[#0D2B36] border border-[#171717] dark:border-[#4CA7A1] text-[#171717] dark:text-[#CEFEF1]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#171717] dark:text-[#CEFEF1] block">
                Detail Pesan Tambahan (Opsional)
              </label>
              <textarea
                value={broadcastContent}
                onChange={(e) => setBroadcastContent(e.target.value)}
                rows={3}
                placeholder="Penjelasan detail jika ada..."
                className="w-full px-3 py-2 rounded bg-white dark:bg-[#0D2B36] border border-[#171717] dark:border-[#4CA7A1] text-[#171717] dark:text-[#CEFEF1]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="space-y-1">
                <label className="font-bold text-[#171717] dark:text-[#CEFEF1] block">
                  Target Link URL
                </label>
                <input
                  type="url"
                  value={broadcastTargetUrl}
                  onChange={(e) => setBroadcastTargetUrl(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-[#0D2B36] border border-[#171717] dark:border-[#4CA7A1] text-[#171717] dark:text-[#CEFEF1]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#171717] dark:text-[#CEFEF1] block">
                  Teks Tombol CTA
                </label>
                <input
                  type="text"
                  value={broadcastButtonText}
                  onChange={(e) => setBroadcastButtonText(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-[#0D2B36] border border-[#171717] dark:border-[#4CA7A1] text-[#171717] dark:text-[#CEFEF1]"
                />
              </div>
            </div>
          </div>

          {/* Broadcast Results Notification */}
          {broadcastResult && (
            <div
              className={`p-3 rounded text-xs border ${
                broadcastResult.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                {broadcastResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>
                  {broadcastResult.success
                    ? 'Pengumuman Berhasil Disiarkan!'
                    : 'Gagal Mengirimkan Pengumuman'}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed">
                Penerima Total: <strong>{broadcastResult.totalRecipients || 0}</strong> • Sukses:{' '}
                <strong>{broadcastResult.successCount || 0}</strong> • Mode:{' '}
                <strong>{broadcastResult.provider || 'Simulasi'}</strong>
              </p>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={sendingBroadcast}
              className="nb-btn nb-btn-primary px-4 py-2.5 text-xs font-bold w-full justify-center flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sendingBroadcast ? 'Mengirimkan Pengumuman...' : 'Kirim Pengumuman Sekarang'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Riwayat & Status Pengiriman Email Table */}
      <div className="p-5 sm:p-6 rounded-md bg-white dark:bg-[#163835] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#071918] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#171717]/15 dark:border-[#4CA7A1]/30 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#123D32] dark:text-[#D6AD52]" />
            <h3 className="font-serif-brand font-extrabold text-sm sm:text-base text-[#171717] dark:text-[#CEFEF1]">
              Riwayat & Status Pengiriman Email Notification
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-[#123D32] dark:text-[#D6AD52]">
            Total Catatan: {logs.length} Log
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center space-y-2 border-2 border-dashed border-[#171717]/20 dark:border-[#4CA7A1]/30 rounded">
            <Info className="w-8 h-8 text-[#123D32]/40 dark:text-[#D6AD52]/40 mx-auto" />
            <p className="text-xs font-bold text-[#171717] dark:text-[#CEFEF1]">
              Belum ada riwayat pengiriman notifikasi email.
            </p>
            <p className="text-[11px] text-[#525856] dark:text-[#A6D6C9]">
              Setiap pembaruan materi, artikel, atau jawaban Q&A yang diterbitkan akan tercatat di sini secara otomatis.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAF7F0] dark:bg-[#0D2B36] border-b-2 border-[#171717] dark:border-[#4CA7A1] text-[#171717] dark:text-[#CEFEF1] font-serif-brand">
                  <th className="p-2.5 font-bold">Waktu</th>
                  <th className="p-2.5 font-bold">Kategori</th>
                  <th className="p-2.5 font-bold">Judul / Subjek</th>
                  <th className="p-2.5 font-bold text-center">Penerima</th>
                  <th className="p-2.5 font-bold text-center">Status & Provider</th>
                  <th className="p-2.5 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171717]/10 dark:divide-[#4CA7A1]/20">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FAF7F0]/60 dark:hover:bg-[#0D2B36]/60 transition">
                    <td className="p-2.5 font-mono text-[11px] text-[#525856] dark:text-[#A6D6C9] whitespace-nowrap">
                      {new Date(log.sentAt).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>

                    <td className="p-2.5 whitespace-nowrap">
                      <span className="nb-badge bg-[#123D32] text-[#D6AD52] dark:bg-[#4CA7A1] dark:text-[#001722] text-[10px]">
                        {log.type.toUpperCase()}
                      </span>
                    </td>

                    <td className="p-2.5 font-extrabold text-[#171717] dark:text-[#CEFEF1] max-w-xs truncate">
                      {log.title}
                    </td>

                    <td className="p-2.5 text-center font-mono font-bold">
                      <span className="text-emerald-700 dark:text-emerald-400">{log.successCount}</span>
                      <span className="text-gray-400 px-0.5">/</span>
                      <span>{log.totalRecipients}</span>
                    </td>

                    <td className="p-2.5 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border border-[#171717] ${
                          log.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 'simulated'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        <span>{log.status.toUpperCase()}</span>
                        <span className="opacity-60">({log.provider})</span>
                      </span>
                    </td>

                    <td className="p-2.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLog(log);
                          setShowPreviewModal(true);
                        }}
                        className="nb-btn nb-btn-secondary px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {showPreviewModal && selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#163835] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[8px_8px_0px_#171717] rounded-md max-w-2xl w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#171717]/15 dark:border-[#4CA7A1]/30 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#123D32] dark:text-[#D6AD52]" />
                <h3 className="font-serif-brand font-extrabold text-base text-[#171717] dark:text-[#CEFEF1]">
                  Detail Catatan Pengiriman Notifikasi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="nb-btn nb-btn-secondary p-1 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded bg-[#FAF7F0] dark:bg-[#0D2B36] border border-[#171717]/20 dark:border-[#4CA7A1]/30 space-y-1">
                <p className="font-bold text-[#171717] dark:text-[#CEFEF1]">
                  Judul: {selectedLog.title}
                </p>
                <p className="text-[#525856] dark:text-[#A6D6C9]">
                  Ringkasan: {selectedLog.summary}
                </p>
                <p className="text-[11px] font-mono text-[#123D32] dark:text-[#D6AD52]">
                  Target URL: {selectedLog.targetUrl}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded bg-gray-50 dark:bg-[#0D2B36] border">
                  <div className="text-[10px] text-gray-500">Penerima</div>
                  <div className="font-extrabold">{selectedLog.totalRecipients}</div>
                </div>
                <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300">
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400">Berhasil</div>
                  <div className="font-extrabold text-emerald-700 dark:text-emerald-400">{selectedLog.successCount}</div>
                </div>
                <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-300">
                  <div className="text-[10px] text-rose-700 dark:text-rose-400">Gagal</div>
                  <div className="font-extrabold text-rose-700 dark:text-rose-400">{selectedLog.failureCount}</div>
                </div>
                <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300">
                  <div className="text-[10px] text-amber-700 dark:text-amber-400">Provider</div>
                  <div className="font-extrabold text-amber-700 dark:text-amber-400 uppercase">{selectedLog.provider}</div>
                </div>
              </div>

              {selectedLog.recipientsSample && selectedLog.recipientsSample.length > 0 && (
                <div className="space-y-1">
                  <span className="font-bold text-[#171717] dark:text-[#CEFEF1] block">
                    Sampel Email Penerima:
                  </span>
                  <div className="p-2 rounded bg-gray-100 dark:bg-[#0D2B36] font-mono text-[11px] space-y-0.5">
                    {selectedLog.recipientsSample.map((em, idx) => (
                      <div key={idx}>• {em}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Template Email Preview */}
              <div className="space-y-1.5 pt-2">
                <span className="font-bold text-[#171717] dark:text-[#CEFEF1] block">
                  Pratinjau HTML Template Email:
                </span>
                <div className="p-3 rounded bg-white border border-gray-300 text-black max-h-60 overflow-y-auto font-sans text-xs">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateEmailHtml({
                        type: selectedLog.type,
                        title: selectedLog.title,
                        summary: selectedLog.summary,
                        targetUrl: selectedLog.targetUrl,
                        publishedAt: selectedLog.sentAt
                      })
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="nb-btn nb-btn-primary px-4 py-2 text-xs"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
