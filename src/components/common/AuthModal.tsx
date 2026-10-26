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
          `Domain saat ini (${domain}) belum terdaftar di Authorized Domains Firebase.\n\n` +
          `Cara Mengatasi:\n` +
          `1. Buka Firebase Console > Authentication > Settings > Authorized Domains.\n` +
          `2. Klik "Add Domain" dan masukkan: ${domain}\n` +
          `3. Setelah disimpan, klik kembali tombol "Lanjutkan dengan Google".`
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/75 animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md my-auto bg-[#F8F3E8] dark:bg-[#0B3026] border-2 border-[#171717] dark:border-[#D9AC45] rounded-lg shadow-[6px_6px_0px_#171717] dark:shadow-[6px_6px_0px_#000000] text-[#171717] dark:text-[#F8F3E8] max-h-[92dvh] overflow-y-auto animate-modal-in">
        {/* Top Forest Green Header Strip */}
        <div className="bg-[#06251D] text-white px-5 py-4 border-b-2 border-[#171717] dark:border-[#D9AC45]/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoSymbol className="w-9 h-9" />
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-[#D9AC45]">
                Portal Tholabul Ilmi
              </span>
              <h2 className="text-base sm:text-lg font-bold font-serif text-white leading-tight">
                {authModalTab === 'login' && 'Masuk ke Dars with Osama'}
                {authModalTab === 'register' && 'Buat Akun Dars with Osama'}
                {authModalTab === 'forgot' && 'Pemulihan Password'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            aria-label="Tutup jendela login"
            className="p-2 bg-[#0B3026] text-[#F8F3E8] hover:bg-[#D9AC45] hover:text-[#171717] border-2 border-[#D9AC45]/60 rounded-md transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {/* Context Notice */}
          <p className="text-xs sm:text-sm text-[#171717]/80 dark:text-[#F8F3E8]/85 mb-4 leading-relaxed">
            {pendingAction ? (
              <span className="block p-3 bg-[#D9AC45]/20 border-2 border-[#171717] dark:border-[#D9AC45] rounded-md font-bold text-[#171717] dark:text-[#D9AC45]">
                {pendingAction.type === 'quiz' && 'Silakan masuk ke akun Dars with Osama untuk memulai evaluasi kuis dan menyimpan nilai Anda.'}
                {pendingAction.type === 'enroll' && 'Silakan masuk ke akun Dars with Osama untuk mulai belajar dan melacak kemajuan belajar.'}
                {pendingAction.type === 'session' && 'Silakan masuk ke akun Dars with Osama untuk mulai belajar dan memutar video syarah lengkap.'}
              </span>
            ) : (
              authModalTab === 'register'
                ? 'Daftar gratis untuk mengakses video syarah, naskah kajian, dan evaluasi kuis.'
                : authModalTab === 'forgot'
                ? 'Atur ulang password khusus akun Dars with Osama Anda.'
                : 'Akses penuh kelas syarah, evaluasi kuis, dan pencatatan progres belajar.'
            )}
          </p>

          {/* Tab Buttons (Login vs Register) */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-white dark:bg-[#06251D] border-2 border-[#171717] dark:border-[#D9AC45]/60 rounded-md mb-5">
            <button
              type="button"
              onClick={() => handleTabSwitch('login')}
              className={`py-2 text-xs sm:text-sm font-bold rounded transition-all cursor-pointer min-h-[40px] ${
                authModalTab === 'login'
                  ? 'bg-[#06251D] text-[#D9AC45] dark:bg-[#D9AC45] dark:text-[#171717] border border-[#171717]'
                  : 'text-[#171717]/70 dark:text-[#F8F3E8]/70 hover:text-[#171717] dark:hover:text-white'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('register')}
              className={`py-2 text-xs sm:text-sm font-bold rounded transition-all cursor-pointer min-h-[40px] ${
                authModalTab === 'register'
                  ? 'bg-[#06251D] text-[#D9AC45] dark:bg-[#D9AC45] dark:text-[#171717] border border-[#171717]'
                  : 'text-[#171717]/70 dark:text-[#F8F3E8]/70 hover:text-[#171717] dark:hover:text-white'
              }`}
            >
              Daftar Akun Baru
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-4 p-3.5 bg-[#F04438]/15 border-2 border-[#F04438] rounded-md text-[#171717] dark:text-white text-xs flex items-start gap-2.5 shadow-[3px_3px_0px_#F04438] whitespace-pre-line">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#F04438]" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 bg-[#06251D] border-2 border-[#D9AC45] rounded-md text-[#F8F3E8] text-xs flex items-start gap-2.5 shadow-[3px_3px_0px_#171717]">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#D9AC45]" />
              <span className="leading-relaxed font-medium">{successMsg}</span>
            </div>
          )}

          {/* Google Sign In Button */}
          {authModalTab !== 'forgot' && (
            <div className="mb-5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-[#06251D] hover:bg-[#D9AC45]/20 text-[#171717] dark:text-[#F8F3E8] rounded-md font-bold text-xs sm:text-sm transition-all border-2 border-[#171717] dark:border-[#D9AC45]/70 shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50 cursor-pointer min-h-[44px]"
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
                  <div className="w-full border-t-2 border-[#171717]/20 dark:border-[#D9AC45]/30"></div>
                </div>
                <div className="relative flex justify-center text-[11px] uppercase font-bold tracking-wider">
                  <span className="bg-[#F8F3E8] dark:bg-[#0B3026] px-3 text-[#171717]/70 dark:text-[#D9AC45]">
                    atau dengan email
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Dedicated Educational Banner on Registration */}
          {authModalTab === 'register' && (
            <div className="mb-4 p-3.5 bg-white dark:bg-[#06251D] border-2 border-[#171717] dark:border-[#D9AC45]/60 rounded-md text-[#171717] dark:text-[#F8F3E8] text-xs flex items-start gap-2.5 shadow-[3px_3px_0px_#171717]">
              <ShieldCheck className="w-5 h-5 text-[#06251D] dark:text-[#D9AC45] shrink-0 mt-0.5" />
              <div className="space-y-1.5 leading-relaxed">
                <strong className="block font-bold text-[#06251D] dark:text-[#D9AC45] text-xs sm:text-sm">
                  Gunakan email milikmu dan buat password baru
                </strong>
                <p className="text-[11px] sm:text-xs">
                  Gunakan alamat email yang kamu miliki dan buat password baru khusus untuk akun Dars with Osama. Password ini tidak harus sama dengan password Gmail atau email kamu. <strong className="underline decoration-[#D9AC45]">Kami tidak meminta password email pribadimu</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Email & Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {authModalTab === 'register' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#171717] dark:text-[#D9AC45] mb-1.5">
                  Nama Lengkap / Kunyah
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#171717]/60 dark:text-[#D9AC45]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Contoh: Abdullah bin Ahmad"
                    className="nb-input pl-10 pr-4 py-2.5 min-h-[44px]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#171717] dark:text-[#D9AC45] mb-1.5">
                {authModalTab === 'login'
                  ? 'Email Terdaftar'
                  : authModalTab === 'forgot'
                  ? 'Alamat Email Terdaftar'
                  : 'Alamat Email'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#171717]/60 dark:text-[#D9AC45]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="nb-input pl-10 pr-4 py-2.5 min-h-[44px]"
                />
              </div>
              {authModalTab === 'register' ? (
                <p className="text-[11px] text-[#171717]/70 dark:text-[#F8F3E8]/70 mt-1">
                  Gunakan email yang kamu miliki dan bisa kamu akses.
                </p>
              ) : authModalTab === 'forgot' ? (
                <p className="text-[11px] text-[#171717]/70 dark:text-[#F8F3E8]/70 mt-1">
                  Pastikan kamu masih bisa mengakses kotak masuk (inbox) atau folder spam email ini.
                </p>
              ) : null}
            </div>

            {authModalTab !== 'forgot' && (
              <div className="space-y-4">
                {/* Primary Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#171717] dark:text-[#D9AC45]">
                      Password Akun
                    </label>
                    {authModalTab === 'login' && (
                      <button
                        type="button"
                        onClick={() => handleTabSwitch('forgot')}
                        className="text-xs font-bold text-[#06251D] dark:text-[#D9AC45] hover:underline cursor-pointer"
                      >
                        Lupa password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#171717]/60 dark:text-[#D9AC45]">
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
                          ? 'Buat password baru (min. 6 karakter)'
                          : 'Masukkan password akun Dars with Osama'
                      }
                      minLength={6}
                      className="nb-input pl-10 pr-11 py-2.5 min-h-[44px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#171717]/60 dark:text-[#D9AC45] hover:text-[#171717] dark:hover:text-white transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#171717]/70 dark:text-[#F8F3E8]/70 mt-1 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 shrink-0 text-[#06251D] dark:text-[#D9AC45]" />
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#171717] dark:text-[#D9AC45] mb-1.5">
                      Ulangi Password Akun
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#171717]/60 dark:text-[#D9AC45]">
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
                        className="nb-input pl-10 pr-11 py-2.5 min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#171717]/60 dark:text-[#D9AC45] hover:text-[#171717] dark:hover:text-white transition cursor-pointer"
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
              className="w-full nb-btn nb-btn-gold py-3 text-xs sm:text-sm mt-2 min-h-[46px]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#171717]/30 border-t-[#171717] rounded-full animate-spin" />
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
                className="text-xs font-bold text-[#06251D] dark:text-[#D9AC45] hover:underline cursor-pointer min-h-[40px] inline-flex items-center"
              >
                ← Kembali ke halaman Masuk
              </button>
            </div>
          ) : authModalTab === 'login' ? (
            <div className="text-center mt-5 pt-3 border-t-2 border-[#171717]/15 dark:border-[#D9AC45]/20">
              <p className="text-xs text-[#171717]/80 dark:text-[#F8F3E8]/80">
                Belum memiliki akun?{' '}
                <button
                  type="button"
                  onClick={() => handleTabSwitch('register')}
                  className="font-bold text-[#06251D] dark:text-[#D9AC45] underline cursor-pointer ml-1"
                >
                  Daftar Akun Baru
                </button>
              </p>
            </div>
          ) : (
            <div className="text-center mt-5 pt-3 border-t-2 border-[#171717]/15 dark:border-[#D9AC45]/20">
              <p className="text-xs text-[#171717]/80 dark:text-[#F8F3E8]/80">
                Sudah memiliki akun?{' '}
                <button
                  type="button"
                  onClick={() => handleTabSwitch('login')}
                  className="font-bold text-[#06251D] dark:text-[#D9AC45] underline cursor-pointer ml-1"
                >
                  Masuk di Sini
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
