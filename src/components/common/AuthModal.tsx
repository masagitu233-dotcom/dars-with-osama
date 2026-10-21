import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Eye,
  EyeOff,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { LogoSymbol } from './Logo';
import { auth } from '../../firebase/config';
import { enrollUser } from '../../firebase/services';

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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!authModalOpen) return null;

  const handleTabSwitch = (tab: 'login' | 'register' | 'forgot') => {
    setError(null);
    setSuccessMsg(null);
    setPassword('');
    setConfirmPassword('');
    openAuthModal(tab);
  };

  const executePending = async () => {
    try {
      if (pendingAction?.type === 'enroll' && pendingAction.courseId && auth.currentUser) {
        await enrollUser(auth.currentUser.uid, pendingAction.courseId).catch(err => {
          console.warn('Auto enrollment after auth error:', err);
        });
      }
      if (pendingAction?.onSuccess) {
        pendingAction.onSuccess();
      }
    } finally {
      clearPendingAction();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (authModalTab === 'login') {
        if (!email.trim() || !password) {
          throw new Error('Alamat email dan kata sandi wajib diisi.');
        }
        await loginWithEmail(email.trim(), password);
        await executePending();
      } else if (authModalTab === 'register') {
        if (!displayName.trim()) {
          throw new Error('Nama lengkap / Kunyah wajib diisi.');
        }
        if (!email.trim()) {
          throw new Error('Alamat email wajib diisi.');
        }
        if (!password || password.length < 6) {
          throw new Error('Kata sandi pendaftaran minimal 6 karakter.');
        }
        if (password !== confirmPassword) {
          throw new Error('Konfirmasi kata sandi tidak cocok. Harap pastikan kedua kolom kata sandi terisi sama.');
        }
        await signupWithEmail(email.trim(), password, displayName.trim());
        await executePending();
      } else if (authModalTab === 'forgot') {
        if (!email.trim()) {
          throw new Error('Masukkan alamat email yang terdaftar.');
        }
        await resetPassword(email.trim());
        setSuccessMsg(
          'Tautan pemulihan password telah dikirim ke email kamu. Silakan periksa kotak masuk (Inbox) atau folder Spam/Promosi, lalu ikuti petunjuk untuk membuat password baru khusus akun Dars with Osama.'
        );
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let message = 'Terjadi kesalahan saat memproses permintaan.';
      const code = err?.code || '';

      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        message = 'Email atau password akun tidak cocok. Harap periksa kembali atau gunakan tombol "Lupa password akun Dars with Osama?".';
      } else if (code === 'auth/email-already-in-use') {
        message = 'Email ini sudah terdaftar. Silakan beralih ke tab "Masuk" atau gunakan tautan "Lupa password akun Dars with Osama?" jika Anda lupa kata sandi.';
      } else if (code === 'auth/weak-password') {
        message = 'Password terlalu pendek. Gunakan minimal 6 karakter yang mudah Anda ingat.';
      } else if (code === 'auth/invalid-email') {
        message = 'Format alamat email tidak valid (contoh yang benar: nama@email.com).';
      } else if (code === 'auth/too-many-requests') {
        message = 'Terlalu banyak percobaan masuk yang gagal. Akses ditangguhkan sementara demi keamanan. Silakan tunggu beberapa saat atau pulihkan kata sandi.';
      } else if (code === 'auth/network-request-failed') {
        message = 'Gagal terhubung ke server. Periksa jaringan internet Anda lalu coba lagi.';
      } else if (code === 'auth/user-disabled') {
        message = 'Akun ini telah dinonaktifkan oleh administrator. Silakan hubungi pengelola Dars with Osama.';
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
        await executePending();
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('popup-closed-by-user')
      ) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 dark:bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md my-auto bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl p-5 sm:p-7 text-stone-900 dark:text-stone-100 max-h-[92dvh] overflow-y-auto animate-modal-in">
        {/* Soft Ambient Background Elements */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none animate-float-slow" />

        {/* Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          aria-label="Tutup jendela login"
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-white dark:hover:bg-stone-800 rounded-full transition-all duration-200 active:scale-95 cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand & Context Notice */}
        <div className="text-center mb-5 relative">
          <div className="inline-flex items-center justify-center mb-2.5">
            <LogoSymbol className="w-11 h-11" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-sans text-stone-900 dark:text-white">
            {authModalTab === 'login' && 'Masuk ke Dars with Osama'}
            {authModalTab === 'register' && 'Buat Akun Dars with Osama'}
            {authModalTab === 'forgot' && 'Pemulihan Password Akun Dars with Osama'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
            {pendingAction ? (
              <span className="text-amber-700 dark:text-amber-300 font-medium">
                {pendingAction.type === 'quiz' && 'Silakan masuk ke akun Dars with Osama untuk memulai evaluasi kuis dan menyimpan nilai Anda.'}
                {pendingAction.type === 'enroll' && 'Silakan masuk ke akun Dars with Osama untuk mulai belajar dan melacak kemajuan belajar.'}
                {pendingAction.type === 'session' && 'Silakan masuk ke akun Dars with Osama untuk mulai belajar dan memutar video syarah lengkap.'}
              </span>
            ) : (
              authModalTab === 'register'
                ? 'Daftar gratis untuk mengakses video syarah, naskah kajian, dan kuis.'
                : authModalTab === 'forgot'
                ? 'Atur ulang password khusus akun Dars with Osama Anda.'
                : 'Akses penuh kelas syarah, evaluasi kuis, dan pencatatan progres.'
            )}
          </p>
        </div>

        {/* Tab Buttons (Login vs Register) */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 mb-5 relative">
          <button
            type="button"
            onClick={() => handleTabSwitch('login')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 border-b-2 -mb-[2px] cursor-pointer min-h-[44px] ${
              authModalTab === 'login'
                ? 'border-emerald-600 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('register')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 border-b-2 -mb-[2px] cursor-pointer min-h-[44px] ${
              authModalTab === 'register'
                ? 'border-emerald-600 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            Daftar Akun Baru
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/80 border border-red-300 dark:border-red-800/90 rounded-2xl text-red-800 dark:text-red-200 text-xs flex items-start gap-2.5 animate-fade-in-up shadow-xs whitespace-pre-line">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2.5 animate-fade-in-up shadow-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* Google Sign In Button */}
        {authModalTab !== 'forgot' && (
          <div className="mb-5 relative">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800/90 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 border border-stone-200 dark:border-stone-700/80 hover:border-stone-300 dark:hover:border-stone-600 disabled:opacity-50 active:scale-[0.99] cursor-pointer shadow-xs min-h-[44px]"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 24 24">
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
                <span className="bg-white dark:bg-stone-900 px-3 text-stone-500 dark:text-stone-400 font-medium">
                  atau dengan email
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Educational Banner on Registration */}
        {authModalTab === 'register' && (
          <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/60 rounded-2xl text-emerald-950 dark:text-emerald-200 text-xs flex items-start gap-2.5 animate-fade-in-up">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 leading-relaxed">
              <strong className="block font-semibold text-emerald-900 dark:text-emerald-300 text-xs sm:text-sm">
                Gunakan email milikmu dan buat password baru
              </strong>
              <p className="text-[11px] sm:text-xs text-emerald-900/90 dark:text-emerald-200/90">
                Gunakan alamat email yang kamu miliki dan buat password baru khusus untuk akun Dars with Osama. Password ini tidak harus sama dengan password Gmail atau email kamu. <strong className="underline decoration-emerald-500">Kami tidak meminta password email pribadimu</strong>.
              </p>
              <div className="p-2 bg-emerald-100/70 dark:bg-emerald-900/40 rounded-xl text-[11px] text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                💡 <em>Jika kamu masih bisa mengakses email tersebut, kamu tetap bisa mendaftar meskipun lupa password email lama. Buat password baru khusus untuk akun Dars with Osama.</em>
              </div>
            </div>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {authModalTab === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Nama Lengkap / Kunyah
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 dark:text-stone-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Contoh: Abdullah bin Ahmad"
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-sm focus:outline-none focus:border-emerald-500 transition min-h-[44px]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              {authModalTab === 'login'
                ? 'Email yang kamu gunakan saat mendaftar'
                : authModalTab === 'forgot'
                ? 'Alamat email terdaftar'
                : 'Alamat email'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 dark:text-stone-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-sm focus:outline-none focus:border-emerald-500 transition min-h-[44px]"
              />
            </div>
            {authModalTab === 'register' ? (
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                Gunakan email yang kamu miliki dan bisa kamu akses.
              </p>
            ) : authModalTab === 'forgot' ? (
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                Pastikan kamu masih bisa mengakses kotak masuk (inbox) atau folder spam email ini.
              </p>
            ) : null}
          </div>

          {authModalTab !== 'forgot' && (
            <div className="space-y-4">
              {/* Primary Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Password akun Dars with Osama
                  </label>
                  {authModalTab === 'login' && (
                    <button
                      type="button"
                      onClick={() => handleTabSwitch('forgot')}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer py-1"
                    >
                      Lupa password akun Dars with Osama?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 dark:text-stone-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete={authModalTab === 'register' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      authModalTab === 'register'
                        ? 'Buat password baru untuk akunmu'
                        : 'Masukkan password akun Dars with Osama'
                    }
                    minLength={6}
                    className="w-full pl-10 pr-11 py-2.5 sm:py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-sm focus:outline-none focus:border-emerald-500 transition min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {authModalTab === 'register'
                      ? 'Bukan password Gmail atau password email kamu. Minimal 6 karakter.'
                      : 'Bukan password Gmail atau password email pribadimu.'}
                  </span>
                </p>
              </div>

              {/* Confirm Password Field (Register Only) */}
              {authModalTab === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                    Ulangi password akun Dars with Osama
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 dark:text-stone-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang password baru untuk akunmu"
                      minLength={6}
                      className="w-full pl-10 pr-11 py-2.5 sm:py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-sm focus:outline-none focus:border-emerald-500 transition min-h-[44px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 sm:py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white rounded-xl font-semibold text-xs sm:text-sm transition shadow-lg shadow-emerald-950/40 disabled:opacity-50 mt-2 cursor-pointer min-h-[44px]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {authModalTab === 'login' && 'Masuk Sekarang'}
                  {authModalTab === 'register' && 'Daftar Akun Dars with Osama'}
                  {authModalTab === 'forgot' && 'Kirim Link Pemulihan Password'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Bottom switch links */}
        {authModalTab === 'forgot' ? (
          <div className="text-center mt-5">
            <button
              type="button"
              onClick={() => handleTabSwitch('login')}
              className="text-xs text-stone-600 dark:text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition cursor-pointer min-h-[44px] inline-flex items-center"
            >
              ← Kembali ke halaman Masuk
            </button>
          </div>
        ) : authModalTab === 'login' ? (
          <div className="text-center mt-5 pt-3 border-t border-stone-200 dark:border-stone-800">
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Belum memiliki akun?{' '}
              <button
                type="button"
                onClick={() => handleTabSwitch('register')}
                className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer ml-1"
              >
                Daftar Akun Baru
              </button>
            </p>
          </div>
        ) : (
          <div className="text-center mt-5 pt-3 border-t border-stone-200 dark:border-stone-800">
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Sudah memiliki akun?{' '}
              <button
                type="button"
                onClick={() => handleTabSwitch('login')}
                className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer ml-1"
              >
                Masuk di Sini
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
