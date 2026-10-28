import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, Video, Lock, Sparkles, UserPlus, LogIn, Clock } from 'lucide-react';

interface YouTubeEmbedProps {
  url?: string;
  title?: string;
  className?: string;
  isGuest?: boolean;
  sessionId?: string;
  courseId?: string;
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
}

export function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  // Match youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, shorts/ID
  const regExp = /(?:youtube(?:-nocookie)?\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);
  return (match && match[1]?.length === 11) ? match[1] : null;
}

const GUEST_MAX_PREVIEW_SECONDS = 60;

export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({
  url,
  title = 'Video Pembelajaran',
  className = '',
  isGuest = false,
  sessionId,
  courseId,
  onOpenLogin,
  onOpenRegister
}) => {
  const videoId = extractYouTubeId(url);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerRef = useRef<any>(null);
  const tickerIntervalRef = useRef<number | null>(null);

  // Storage key for persisting cumulative watched seconds across reloads/seeks
  const storageKey = videoId
    ? `dars_guest_watch_${videoId}`
    : (sessionId ? `dars_guest_watch_${sessionId}` : 'dars_guest_watch_preview');

  // Check if guest has already consumed the 60-second quota
  const getInitialSeconds = (): number => {
    if (!isGuest || typeof window === 'undefined') return 0;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = parseInt(stored, 10);
        return isNaN(parsed) ? 0 : Math.max(0, parsed);
      }
    } catch {
      // Ignore localStorage errors
    }
    return 0;
  };

  const [playedSeconds, setPlayedSeconds] = useState<number>(getInitialSeconds);
  const [isExpired, setIsExpired] = useState<boolean>(() => {
    return isGuest && getInitialSeconds() >= GUEST_MAX_PREVIEW_SECONDS;
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const playedSecondsRef = useRef<number>(playedSeconds);
  playedSecondsRef.current = playedSeconds;

  // Reset expired state if user status changes to authenticated
  useEffect(() => {
    if (!isGuest) {
      setIsExpired(false);
      if (tickerIntervalRef.current !== null) {
        window.clearInterval(tickerIntervalRef.current);
        tickerIntervalRef.current = null;
      }
    }
  }, [isGuest]);

  // Handle active playing ticker for guest mode
  const stopTicker = () => {
    if (tickerIntervalRef.current !== null) {
      window.clearInterval(tickerIntervalRef.current);
      tickerIntervalRef.current = null;
    }
    setIsPlaying(false);
  };

  const startTicker = () => {
    if (!isGuest || isExpired) return;
    if (tickerIntervalRef.current !== null) return;

    setIsPlaying(true);
    tickerIntervalRef.current = window.setInterval(() => {
      const nextSeconds = playedSecondsRef.current + 1;
      playedSecondsRef.current = nextSeconds;
      setPlayedSeconds(nextSeconds);

      try {
        localStorage.setItem(storageKey, String(nextSeconds));
      } catch {
        // Ignore localStorage quota errors
      }

      if (nextSeconds >= GUEST_MAX_PREVIEW_SECONDS) {
        // Enforce 60s hard stop
        stopTicker();
        setIsExpired(true);
        // Pause iframe video via YouTube postMessage command
        try {
          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
              '*'
            );
          }
          if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
            playerRef.current.pauseVideo();
          }
        } catch {
          // Ignore iframe command errors
        }
      }
    }, 1000);
  };

  // Clean up ticker on unmount or session/video change
  useEffect(() => {
    return () => {
      stopTicker();
    };
  }, [videoId, sessionId, isGuest]);

  // Initialize YouTube IFrame API and postMessage event listener
  useEffect(() => {
    if (!isGuest || !videoId || isExpired) return;

    // Listen for postMessage from YouTube iframe
    const handleMessage = (event: MessageEvent) => {
      try {
        if (typeof event.data === 'string') {
          const data = JSON.parse(event.data);
          // YouTube API onStateChange events
          if (data.event === 'onStateChange') {
            const state = data.info;
            // 1 = PLAYING
            if (state === 1) {
              startTicker();
            } else if (state === 2 || state === 0 || state === 3) {
              // 2 = PAUSED, 0 = ENDED, 3 = BUFFERING
              stopTicker();
            }
          }
        }
      } catch {
        // Not a JSON message, ignore
      }
    };

    window.addEventListener('message', handleMessage);

    // Also attempt official YT.Player hook if YT API script is loaded or loads
    const setupYTApi = () => {
      if ((window as any).YT && (window as any).YT.Player && iframeRef.current) {
        try {
          playerRef.current = new (window as any).YT.Player(iframeRef.current, {
            events: {
              onStateChange: (e: any) => {
                if (e.data === 1) {
                  startTicker();
                } else {
                  stopTicker();
                }
              }
            }
          });
        } catch {
          // Fallback to postMessage
        }
      }
    };

    if ((window as any).YT && (window as any).YT.Player) {
      setupYTApi();
    } else {
      // Inject YT iframe api if not present
      const existingScript = document.getElementById('youtube-iframe-api-tag');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api-tag';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }
      const prevOnReady = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (typeof prevOnReady === 'function') prevOnReady();
        setupYTApi();
      };
    }

    return () => {
      window.removeEventListener('message', handleMessage);
      stopTicker();
    };
  }, [videoId, isGuest, isExpired]);

  if (!url) {
    return (
      <div className={`bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 aspect-video rounded-2xl flex flex-col items-center justify-center text-stone-500 dark:text-stone-400 p-6 ${className}`}>
        <Video className="w-12 h-12 mb-3 text-stone-400 dark:text-stone-600" />
        <p className="text-sm font-medium">Belum ada video rekaman untuk sesi ini</p>
      </div>
    );
  }

  if (!videoId) {
    return (
      <div className={`bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 aspect-video rounded-2xl flex flex-col items-center justify-center text-stone-800 dark:text-stone-200 p-6 ${className}`}>
        <Video className="w-12 h-12 mb-3 text-emerald-600 dark:text-emerald-400" />
        <p className="text-base font-semibold mb-2">Tautan Video Eksternal</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition cursor-pointer shadow-md"
        >
          <span>Buka Pemutar Video</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    );
  }

  const remainingSeconds = Math.max(0, GUEST_MAX_PREVIEW_SECONDS - playedSeconds);

  return (
    <div className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-lg border-2 border-[#171717] dark:border-[#4CA7A1] ${className}`}>
      {/* 60s Preview Expired Overlay */}
      {isGuest && isExpired ? (
        <div className="absolute inset-0 z-30 bg-[#123D32] dark:bg-[#0D2B36] text-[#FAF7F0] dark:text-[#CEFEF1] flex flex-col items-center justify-center p-4 sm:p-8 text-center animate-fade-in select-none">
          {/* Lock Icon */}
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-[#D6AD52] border-2 border-[#171717] flex items-center justify-center text-[#123D32] shadow-[3px_3px_0px_#171717] mb-3 sm:mb-4">
            <Lock className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>

          {/* Heading & Explicit User-Specified Message */}
          <div className="space-y-2 max-w-lg px-2">
            <span className="nb-badge bg-[#FAF7F0] text-[#123D32] border-[#171717] text-[10px] sm:text-xs">
              Batas Pratinjau 60 Detik Tercapai
            </span>
            <h3 className="text-base sm:text-xl md:text-2xl font-extrabold font-serif-brand text-white leading-snug">
              Lanjutkan Pembelajaran Anda
            </h3>
            <p className="text-xs sm:text-sm text-[#FAF7F0]/95 dark:text-[#A6D6C9] leading-relaxed pt-1 font-sans">
              Anda telah mencapai batas pratinjau video. Daftar atau masuk ke akun Dars with Osama untuk melanjutkan pembelajaran.
            </p>
          </div>

          {/* Direct Auth Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 sm:pt-5">
            {onOpenRegister && (
              <button
                type="button"
                onClick={onOpenRegister}
                className="nb-btn nb-btn-gold px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-extrabold flex items-center gap-2 cursor-pointer shadow-[3px_3px_0px_#171717]"
              >
                <UserPlus className="w-4 h-4 text-[#123D32]" />
                <span>Daftar Akun Baru</span>
              </button>
            )}
            {onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="nb-btn nb-btn-secondary px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-extrabold flex items-center gap-2 cursor-pointer shadow-[3px_3px_0px_#171717]"
              >
                <LogIn className="w-4 h-4 text-[#123D32] dark:text-[#4CA7A1]" />
                <span>Masuk ke Akun</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* YouTube Video iFrame */}
          <iframe
            ref={iframeRef}
            id={`yt-player-${videoId}`}
            className="w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />

          {/* Guest Mode Indicator Badge */}
          {isGuest && (
            <div className="absolute top-3 left-3 z-10 pointer-events-none">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#123D32]/90 backdrop-blur-xs text-[#FAF7F0] border border-[#D6AD52] text-[11px] font-bold shadow-md">
                <Clock className="w-3.5 h-3.5 text-[#D6AD52]" />
                <span>Pratinjau Tamu: {remainingSeconds}d tersisa</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
