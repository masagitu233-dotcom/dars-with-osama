import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, ArrowRight, X, Sparkles, AlertCircle, VideoOff } from 'lucide-react';
import { LogoSymbol } from './Logo';
import { INTRO_VIDEO_URL } from '../../config/videoConfig';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setHasError(false);
      setIsPlaying(true);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {
          // Auto-play might be blocked or file missing
        });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setHasError(true));
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleRestart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setHasError(true));
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 1;
    setProgress((curr / dur) * 100);
    setDuration(dur);
  };

  const handleVideoError = () => {
    setHasError(true);
    setIsPlaying(false);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#F7F6EF] dark:bg-[#071B16] border border-[#073B2E]/20 dark:border-[#C9A34E]/30 rounded-3xl shadow-2xl overflow-hidden my-auto transition-all">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#073B2E] text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#C9A34E]/20 flex items-center justify-center border border-[#C9A34E]/40">
              <LogoSymbol className="w-5 h-5 text-[#C9A34E]" />
            </div>
            <div>
              <span className="text-xs font-serif-brand tracking-widest text-[#C9A34E] uppercase font-bold block">
                Dars with Osama
              </span>
              <h3 className="text-sm font-semibold text-white font-sans">
                Video Intro Logo & Sambutan
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-stone-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Section */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden border-b border-[#073B2E]/10 dark:border-[#C9A34E]/20">
          {!hasError ? (
            <>
              <video
                ref={videoRef}
                src={INTRO_VIDEO_URL}
                autoPlay
                muted={isMuted}
                playsInline
                onTimeUpdate={handleTimeUpdate}
                onError={handleVideoError}
                onEnded={() => setIsPlaying(false)}
                className="w-full h-full object-contain"
              />

              {/* Video Overlay Controls */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 flex flex-col gap-2 transition-opacity opacity-90 hover:opacity-100">
                {/* Progress Bar */}
                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden cursor-pointer">
                  <div
                    className="h-full bg-[#C9A34E] transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-white text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlay}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                      title={isPlaying ? 'Jeda Video' : 'Putar Video'}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                    </button>
                    <button
                      onClick={toggleMute}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                      title={isMuted ? 'Buka Suara' : 'Mute Suara'}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={handleRestart}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                      title="Putar Ulang Video"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <span className="text-stone-300 font-mono text-[11px] hidden sm:inline">
                      {formatTime(videoRef.current?.currentTime || 0)} / {formatTime(duration)}
                    </span>
                  </div>

                  <span className="text-[10px] uppercase font-semibold text-[#C9A34E] tracking-wider px-2 py-0.5 rounded bg-[#C9A34E]/10 border border-[#C9A34E]/30">
                    Intro Dars with Osama
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* Clear, explicit error state when video file is missing or fails to load */
            <div className="p-8 text-center flex flex-col items-center justify-center gap-3 max-w-md">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-1">
                <VideoOff className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-stone-200 font-serif-brand">
                Video Intro Belum Tersedia di Path
              </h4>
              <p className="text-xs text-stone-400 leading-relaxed font-mono bg-stone-900/80 p-2.5 rounded-xl border border-stone-800 w-full text-left">
                URL: <span className="text-amber-400">{INTRO_VIDEO_URL}</span>
              </p>
              <p className="text-xs text-stone-300 leading-relaxed">
                Berkas video intro asli belum berada di lokasi <code className="text-[#C9A34E]">public/video/intro-logo.mp4</code>. Silakan tempatkan file video intro `.mp4` Anda di folder tersebut agar langsung diputar secara otomatis.
              </p>
            </div>
          )}
        </div>

        {/* Content Body: Arabic Verse & Warm Welcome Text */}
        <div className="p-6 sm:p-8 space-y-5">
          <div className="text-center space-y-2">
            <h2 className="text-lg sm:text-2xl font-bold font-serif-brand text-[#073B2E] dark:text-[#F7F6EF] dir-rtl">
              أهلاً وسهلاً — Selamat Datang di Dars with Osama
            </h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#073B2E]/5 dark:bg-[#C9A34E]/10 text-[#073B2E] dark:text-[#C9A34E] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Portal Kajian & Pembelajaran Kitab Turats
            </div>
          </div>

          {/* Quranic Verse Callout */}
          <div className="p-4 rounded-2xl bg-[#073B2E]/5 dark:bg-[#0c2b23] border border-[#073B2E]/10 dark:border-[#143e33] text-center space-y-2">
            <p className="text-xl sm:text-2xl font-arabic font-bold text-[#073B2E] dark:text-[#C9A34E] leading-loose">
              وَقُلْ رَبِّ زِدْنِي عِلْمًا
            </p>
            <p className="text-xs sm:text-sm text-[#073B2E]/80 dark:text-[#F7F6EF]/80 italic">
              &quot;Dan katakanlah: Ya Tuhanku, tambahkanlah kepadaku ilmu pengetahuan.&quot;
            </p>
            <p className="text-[11px] font-semibold text-[#C9A34E]">
              (QS. Taha: 114)
            </p>
          </div>

          {/* Welcome Message Paragraphs */}
          <div className="text-xs sm:text-sm text-[#073B2E]/80 dark:text-[#F7F6EF]/80 leading-relaxed space-y-3 font-sans">
            <p>
              Selamat datang di <strong>Dars with Osama</strong>, platform pembelajaran Islam interaktif yang dirancang untuk memudahkan santri, penuntut ilmu, dan masyarakat umum dalam mempelajari kitab-kitab turats, matan ilmiah, serta materi keislaman secara sistematis.
            </p>
            <p>
              Di platform ini, Anda dapat menyimak rekaman video kajian, membaca naskah materi, mengunduh file PDF, mengikuti kuis evaluasi, serta mengajukan pertanyaan langsung di <strong>Ruang Konsultasi</strong> bersama Ustadz Osama.
            </p>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-[#073B2E]/10 dark:border-[#C9A34E]/20">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#073B2E]/20 dark:border-[#C9A34E]/30 text-[#073B2E] dark:text-[#F7F6EF] hover:bg-[#073B2E]/5 dark:hover:bg-[#C9A34E]/10 text-xs font-semibold transition cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#073B2E] hover:bg-[#0a4d3c] text-white text-xs font-semibold shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Mulai Menjelajahi</span>
              <ArrowRight className="w-4 h-4 text-[#C9A34E]" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
