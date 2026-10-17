import React, { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { LogoSymbol } from './Logo';

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    authModalTab,
    openAuthModal,
    closeAuthModal,
    loginWithEmail,
    signupWithEmail,
    loginWithGoogle,
    resetPassword,
    pendingAction,
    clearPendingAction
  } = useAuth();
  const { t, language } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (authModalTab === 'login') {
        await loginWithEmail(email, password);
      } else if (authModalTab === 'register') {
        if (!displayName.trim()) {
          throw new Error('Nama lengkap wajib diisi');
        }
        await signupWithEmail(email, password, displayName);
      } else if (authModalTab === 'forgot') {
        await resetPassword(email);
        setSuccessMsg('Tautan pemulihan kata sandi telah dikirim ke email Anda.');
        setLoading(false);
        return;
      }

      if (pendingAction?.onSuccess) {
        pendingAction.onSuccess();
      }
      clearPendingAction();
    } catch (err: any) {
      console.error('Auth error:', err);
      let message = 'Terjadi kesalahan saat memproses permintaan.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        message = 'Email atau kata sandi tidak cocok. Silakan periksa kembali.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'Email ini sudah terdaftar. Silakan masuk menggunakan akun tersebut.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Kata sandi minimal 6 karakter.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Format alamat email tidak valid.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const success = await loginWithGoogle();
      if (success) {
        if (pendingAction?.onSuccess) {
          pendingAction.onSuccess();
        }
        clearPendingAction();
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('popup-closed-by-user')
      ) {
        // User closed or cancelled popup window, nothing to alert
        return;
      }
      if (err?.code === 'auth/popup-blocked') {
        setError('Jendela popup diblokir oleh browser. Silakan izinkan popup untuk situs ini atau gunakan pendaftaran Email & Kata Sandi.');
      } else if (err?.code === 'auth/unauthorized-domain') {
        const domain = typeof window !== 'undefined' ? window.location.hostname : 'Netlify';
        setError(
          `Domain (${domain}) belum didaftarkan di Authorized Domains Firebase.\n\n` +
          `Cara Mengatasi:\n` +
          `1. Buka Firebase Console > Authentication > Settings > Authorized Domains.\n` +
          `2. Klik "Add Domain" dan masukkan "${domain}".\n` +
          `3. Pengguna sekarang dapat login dengan Google.`
        );
      } else if (err?.code === 'auth/operation-not-allowed') {
        setError('Metode login Google belum diaktifkan di Firebase Console (Authentication > Sign-in method > Google).');
      } else {
        setError(err?.message || 'Gagal masuk dengan Google. Anda juga dapat menggunakan Email & Kata Sandi.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl p-6 md:p-8 text-stone-900 dark:text-stone-100 overflow-hidden animate-modal-in">
        {/* Soft Ambient Background Elements */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none animate-float-slow" />

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-white dark:hover:bg-stone-800 rounded-full transition-all duration-200 active:scale-95 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand & Pending Action Notice */}
        <div className="text-center mb-6 relative">
          <div className="inline-flex items-center justify-center mb-3">
            <LogoSymbol className="w-12 h-12" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-sans text-stone-900 dark:text-white">
            {authModalTab === 'login' && 'Masuk ke Dars with Osama'}
            {authModalTab === 'register' && 'Buat Akun Penuntut Ilmu'}
            {authModalTab === 'forgot' && 'Pemulihan Kata Sandi'}
          </h2>
          <p className="text-xs md:text-sm text-stone-600 dark:text-stone-400 mt-1">
            {pendingAction ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {pendingAction.type === 'quiz' && 'Masuk untuk memulai evaluasi kuis dan menyimpan nilai Anda.'}
                {pendingAction.type === 'enroll' && 'Masuk untuk mendaftar kursus dan melacak kemajuan belajar.'}
                {pendingAction.type === 'session' && 'Masuk untuk menyimpan riwayat sesi Anda.'}
              </span>
            ) : (
              'Akses fitur evaluasi kuis dan pelacakan progres pembelajaran'
            )}
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 mb-6 relative">
          <button
            onClick={() => { setError(null); setSuccessMsg(null); openAuthModal('login'); }}
            className={`flex-1 py-2.5 text-xs md:text-sm font-semibold transition-all duration-200 border-b-2 -mb-[2px] cursor-pointer ${
              authModalTab === 'login'
                ? 'border-emerald-600 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            Masuk
          </button>
          <button
            onClick={() => { setError(null); setSuccessMsg(null); openAuthModal('register'); }}
            className={`flex-1 py-2.5 text-xs md:text-sm font-semibold transition-all duration-200 border-b-2 -mb-[2px] cursor-pointer ${
              authModalTab === 'register'
                ? 'border-emerald-600 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            Daftar Akun
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3.5 bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-800/90 rounded-xl text-red-800 dark:text-red-200 text-xs flex items-start gap-2.5 animate-fade-in-up shadow whitespace-pre-line">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800/80 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2 animate-fade-in-up shadow">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Google Sign In Button */}
        {authModalTab !== 'forgot' && (
          <div className="mb-5 relative">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800/90 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 rounded-xl font-medium text-sm transition-all duration-200 border border-stone-200 dark:border-stone-700/80 hover:border-stone-300 dark:hover:border-stone-600 disabled:opacity-50 active:scale-[0.99] cursor-pointer shadow-xs"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Lanjutkan dengan Google</span>
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200 dark:border-stone-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-stone-900 px-3 text-stone-500 dark:text-stone-400">atau dengan email</span>
              </div>
            </div>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {authModalTab === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">Nama Lengkap / Kunyah</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 dark:text-stone-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Contoh: Abdullah bin Ahmad"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-sm focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">Alamat Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 dark:text-stone-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {authModalTab !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">Kata Sandi</label>
                {authModalTab === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setError(null); setSuccessMsg(null); openAuthModal('forgot'); }}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Lupa sandi?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 dark:text-stone-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-sm focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white rounded-xl font-semibold text-sm transition shadow-lg shadow-emerald-950/40 disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {authModalTab === 'login' && 'Masuk Sekarang'}
                  {authModalTab === 'register' && 'Daftar Akun Baru'}
                  {authModalTab === 'forgot' && 'Kirim Link Pemulihan'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Bottom switch link */}
        {authModalTab === 'forgot' && (
          <div className="text-center mt-5">
            <button
              onClick={() => { setError(null); setSuccessMsg(null); openAuthModal('login'); }}
              className="text-xs text-stone-600 dark:text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition cursor-pointer"
            >
              ← Kembali ke halaman Masuk
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
