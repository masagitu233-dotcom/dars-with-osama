import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Headphones,
  Sparkles,
  Info,
  CheckCircle2,
  Radio
} from 'lucide-react';
import { BlogPost } from '../../types';
import {
  extractArticleSpeechScript,
  splitIntoSpeechChunks,
  estimateReadingDurationSeconds,
  formatSpeechTime,
  findIndonesianVoice
} from '../../utils/articleAudioHelper';

interface ArticleAudioPlayerProps {
  post: BlogPost;
  className?: string;
}

export const ArticleAudioPlayer: React.FC<ArticleAudioPlayerProps> = ({
  post,
  className = ''
}) => {
  // If audio reading is disabled or not configured, do not render player
  if (!post.audioConfig?.enabled) {
    return null;
  }

  const isCustomMode = post.audioConfig?.mode === 'custom' && Boolean(post.audioConfig?.customAudioUrl);
  const customAudioUrl = post.audioConfig?.customAudioUrl;

  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused' | 'ended'>('idle');
  const [playbackRate, setPlaybackRate] = useState<number>(post.audioConfig?.speechRate || 1.0);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
  const [chunks, setChunks] = useState<string[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [totalEstimatedSeconds, setTotalEstimatedSeconds] = useState<number>(0);
  const [activeVoiceName, setActiveVoiceName] = useState<string>('');

  // Custom Audio Ref
  const customAudioRef = useRef<HTMLAudioElement | null>(null);

  // Speech API Refs
  const chunksRef = useRef<string[]>([]);
  const chunkIndexRef = useRef<number>(0);
  const statusRef = useRef<'idle' | 'playing' | 'paused' | 'ended'>('idle');
  const rateRef = useRef<number>(post.audioConfig?.speechRate || 1.0);
  const timerRef = useRef<any>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Keep refs synchronized
  chunksRef.current = chunks;
  chunkIndexRef.current = currentChunkIndex;
  statusRef.current = status;
  rateRef.current = playbackRate;

  // Initialize playback rate from post audioConfig if configured
  useEffect(() => {
    if (post.audioConfig?.speechRate) {
      setPlaybackRate(post.audioConfig.speechRate);
      rateRef.current = post.audioConfig.speechRate;
    }
  }, [post.audioConfig?.speechRate]);

  // Setup for Custom Audio Mode vs Web Speech Mode
  useEffect(() => {
    // Stop any ongoing audio immediately when article changes
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (customAudioRef.current) {
      customAudioRef.current.pause();
      customAudioRef.current.currentTime = 0;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setStatus('idle');
    setElapsedSeconds(0);
    setCurrentChunkIndex(0);

    if (isCustomMode) {
      // In custom audio mode, we rely on HTML5 Audio
      setIsSupported(true);
      return;
    }

    // In Web Speech API mode:
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const script = extractArticleSpeechScript(post);
    const speechChunks = splitIntoSpeechChunks(script);
    setChunks(speechChunks);

    const estDuration = estimateReadingDurationSeconds(script, playbackRate);
    setTotalEstimatedSeconds(estDuration);

    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      voicesRef.current = allVoices;

      // Prefer admin-configured voice name if matching
      const configuredVoiceName = post.audioConfig?.speechVoiceName;
      if (configuredVoiceName) {
        const matching = allVoices.find(v => v.name === configuredVoiceName);
        if (matching) {
          setActiveVoiceName(matching.name);
          return;
        }
      }

      const idVoice = findIndonesianVoice(allVoices);
      if (idVoice) {
        setActiveVoiceName(idVoice.name);
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (customAudioRef.current) {
        customAudioRef.current.pause();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [post.id, isCustomMode, customAudioUrl]);

  // Speech mode: Recalculate duration when rate changes
  useEffect(() => {
    if (!isCustomMode) {
      const script = extractArticleSpeechScript(post);
      setTotalEstimatedSeconds(estimateReadingDurationSeconds(script, playbackRate));
    }
  }, [playbackRate, post, isCustomMode]);

  // Speech mode timer for elapsed seconds
  useEffect(() => {
    if (!isCustomMode) {
      if (status === 'playing') {
        timerRef.current = setInterval(() => {
          setElapsedSeconds(prev => prev + 1);
        }, 1000);
      } else {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [status, isCustomMode]);

  // Speak sequential chunk for Speech API
  const speakChunk = useCallback((index: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const currentChunks = chunksRef.current;

    if (index >= currentChunks.length) {
      setStatus('ended');
      setCurrentChunkIndex(currentChunks.length);
      return;
    }

    window.speechSynthesis.cancel();

    const textToSpeak = currentChunks[index];
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = rateRef.current;
    utterance.lang = 'id-ID';

    // Voice selection: prefer configured voice, then best Indonesian voice
    const configuredVoiceName = post.audioConfig?.speechVoiceName;
    const matchingVoice = configuredVoiceName
      ? voicesRef.current.find(v => v.name === configuredVoiceName)
      : null;
    const selectedVoice = matchingVoice || findIndonesianVoice(voicesRef.current);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    }

    utterance.onend = () => {
      if (statusRef.current !== 'playing') return;

      const nextIndex = index + 1;
      setCurrentChunkIndex(nextIndex);
      if (nextIndex < currentChunks.length) {
        speakChunk(nextIndex);
      } else {
        setStatus('ended');
      }
    };

    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      console.warn('SpeechSynthesis error:', e.error);
      setStatus('paused');
    };

    window.speechSynthesis.speak(utterance);
  }, [post.audioConfig?.speechVoiceName]);

  // Play handler (supports both custom audio and speech mode)
  const handlePlay = () => {
    if (isCustomMode) {
      const audio = customAudioRef.current;
      if (!audio) return;
      audio.playbackRate = playbackRate;
      audio.play().then(() => {
        setStatus('playing');
      }).catch(err => {
        console.warn('Custom audio play error:', err);
      });
      return;
    }

    // Web Speech API mode
    if (chunks.length === 0) return;

    if (status === 'paused') {
      setStatus('playing');
      speakChunk(chunkIndexRef.current);
    } else if (status === 'ended') {
      setCurrentChunkIndex(0);
      setElapsedSeconds(0);
      setStatus('playing');
      speakChunk(0);
    } else {
      setStatus('playing');
      speakChunk(0);
    }
  };

  // Pause handler
  const handlePause = () => {
    if (isCustomMode) {
      const audio = customAudioRef.current;
      if (audio) {
        audio.pause();
        setStatus('paused');
      }
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setStatus('paused');
  };

  // Stop / Reset handler
  const handleStop = () => {
    if (isCustomMode) {
      const audio = customAudioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setStatus('idle');
      setElapsedSeconds(0);
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setStatus('idle');
    setCurrentChunkIndex(0);
    setElapsedSeconds(0);
  };

  // Rate change handler
  const handleRateChange = (newRate: number) => {
    setPlaybackRate(newRate);
    rateRef.current = newRate;

    if (isCustomMode) {
      if (customAudioRef.current) {
        customAudioRef.current.playbackRate = newRate;
      }
      return;
    }

    if (status === 'playing') {
      speakChunk(chunkIndexRef.current);
    }
  };

  // Custom audio element event listeners
  const onCustomLoadedMetadata = () => {
    if (customAudioRef.current) {
      const dur = Math.round(customAudioRef.current.duration || 0);
      setTotalEstimatedSeconds(dur);
    }
  };

  const onCustomTimeUpdate = () => {
    if (customAudioRef.current) {
      setElapsedSeconds(Math.round(customAudioRef.current.currentTime || 0));
    }
  };

  const onCustomEnded = () => {
    setStatus('ended');
  };

  // Seek bar click for custom audio
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCustomMode || !customAudioRef.current || totalEstimatedSeconds === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * totalEstimatedSeconds;
    customAudioRef.current.currentTime = newTime;
    setElapsedSeconds(Math.round(newTime));
  };

  // Progress percentage calculation
  const progressPercent = isCustomMode
    ? totalEstimatedSeconds > 0
      ? Math.min(100, Math.round((elapsedSeconds / totalEstimatedSeconds) * 100))
      : 0
    : chunks.length > 0
    ? Math.min(100, Math.round((currentChunkIndex / chunks.length) * 100))
    : 0;

  if (!isSupported) {
    return (
      <div className={`p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 text-xs flex items-center gap-2.5 ${className}`}>
        <Info className="w-4 h-4 text-amber-600 shrink-0" />
        <span>Fitur Audio Reading tidak didukung pada peramban ini. Anda tetap dapat membaca naskah artikel lengkap di bawah.</span>
      </div>
    );
  }

  return (
    <div
      data-testid="article-audio-player"
      className={`bg-gradient-to-r from-emerald-50/80 via-white to-amber-50/40 dark:from-stone-900 dark:via-stone-900 dark:to-emerald-950/30 border border-emerald-200/90 dark:border-emerald-800/60 rounded-2xl p-4 sm:p-5 shadow-xs transition-all ${className}`}
    >
      {/* Hidden HTML5 Audio Element for custom audio files */}
      {isCustomMode && customAudioUrl && (
        <audio
          ref={customAudioRef}
          src={customAudioUrl}
          preload="metadata"
          onLoadedMetadata={onCustomLoadedMetadata}
          onTimeUpdate={onCustomTimeUpdate}
          onEnded={onCustomEnded}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-100 dark:border-stone-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 dark:bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
            <Headphones className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-stone-900 dark:text-white text-xs sm:text-sm font-sans">
                {isCustomMode ? 'Rekaman Audio Artikel' : 'Audio Reading Artikel'}
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800">
                {isCustomMode
                  ? 'Rekaman Resmi'
                  : status === 'playing'
                  ? 'Sedang Membaca'
                  : status === 'paused'
                  ? 'Dijeda'
                  : status === 'ended'
                  ? 'Selesai'
                  : 'Suara Otomatis'}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              {isCustomMode
                ? 'Dengarkan rekaman audio kajian resmi untuk artikel ini.'
                : activeVoiceName
                ? `Pembacaan otomatis (${activeVoiceName}) tanpa musik pengiring.`
                : 'Dengarkan pembacaan naskah artikel ini secara otomatis tanpa musik pengiring.'}
            </p>
          </div>
        </div>

        {/* Playback Rate Selector */}
        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
          <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium mr-1">
            Kecepatan:
          </span>
          {[0.75, 1.0, 1.25, 1.5].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => handleRateChange(rate)}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-95 ${
                playbackRate === rate
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700'
              }`}
            >
              {rate}×
            </button>
          ))}
        </div>
      </div>

      {/* Main Controls & Progress Bar */}
      <div className="pt-3.5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {status === 'playing' ? (
              <button
                type="button"
                onClick={handlePause}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                title="Jeda pemutaran audio"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Jeda</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePlay}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                title="Putar audio artikel"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>
                  {status === 'paused'
                    ? 'Lanjutkan'
                    : status === 'ended'
                    ? 'Putar Ulang'
                    : isCustomMode
                    ? 'Putar Audio Rekaman'
                    : 'Dengarkan Artikel'}
                </span>
              </button>
            )}

            {(status === 'playing' || status === 'paused' || status === 'ended') && (
              <button
                type="button"
                onClick={handleStop}
                className="inline-flex items-center gap-1 px-3 py-2 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-medium transition cursor-pointer active:scale-95"
                title="Hentikan dan mulai dari awal"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>

          {/* Time & Chunk Progress Indicator */}
          <div className="text-right">
            <span className="font-mono text-xs font-semibold text-stone-800 dark:text-stone-200">
              {formatSpeechTime(elapsedSeconds)} / {formatSpeechTime(totalEstimatedSeconds)}
            </span>
            <span className="text-[10px] text-stone-400 block">
              {progressPercent}% selesai
            </span>
          </div>
        </div>

        {/* Visual Progress Bar (Clickable/Seekable for custom audio) */}
        <div
          onClick={handleSeek}
          className={`w-full bg-stone-200/80 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden shadow-inner ${
            isCustomMode ? 'cursor-pointer' : ''
          }`}
          title={isCustomMode ? 'Klik untuk melompat ke detik tertentu' : undefined}
        >
          <div
            className="bg-gradient-to-r from-emerald-600 to-amber-500 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
