import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Headphones,
  Info,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { BlogPost } from '../../types';
import {
  extractArticleSpeechScript,
  splitIntoSpeechChunks,
  estimateReadingDurationSeconds,
  formatSpeechTime,
  findIndonesianVoice,
  resolveAudioSourceCandidates,
  describeAudioPlaybackError
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
  const customAudioUrl = post.audioConfig?.customAudioUrl || '';

  const resolvedSource = useMemo(
    () => resolveAudioSourceCandidates(customAudioUrl),
    [customAudioUrl]
  );

  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused' | 'ended'>('idle');
  const [playbackRate, setPlaybackRate] = useState<number>(post.audioConfig?.speechRate || 1.0);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
  const [chunks, setChunks] = useState<string[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [totalEstimatedSeconds, setTotalEstimatedSeconds] = useState<number>(0);
  const [activeVoiceName, setActiveVoiceName] = useState<string>('');

  // Custom HTML5 Audio state
  const [candidateIndex, setCandidateIndex] = useState<number>(0);
  const [blobAudioUrl, setBlobAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Custom Audio Ref
  const customAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingAutoPlayRef = useRef<boolean>(false);
  const triedBlobFallbackRef = useRef<boolean>(false);

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

  // Clean up blob object URL when unmounting or changing
  useEffect(() => {
    return () => {
      if (blobAudioUrl) {
        URL.revokeObjectURL(blobAudioUrl);
      }
    };
  }, [blobAudioUrl]);

  // Setup for Custom Audio Mode vs Web Speech Mode
  useEffect(() => {
    // Stop any ongoing audio immediately when article or source changes
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
    setCandidateIndex(0);
    setBlobAudioUrl(null);
    pendingAutoPlayRef.current = false;
    triedBlobFallbackRef.current = false;

    if (isCustomMode) {
      setIsSupported(true);
      setTotalEstimatedSeconds(0);

      // Validate if Google Drive link has a valid file ID
      if (resolvedSource.isGoogleDrive && !resolvedSource.fileId) {
        setIsLoadingAudio(false);
        setAudioError(
          describeAudioPlaybackError({
            isGoogleDrive: true,
            isGoogleDriveFolder: resolvedSource.isGoogleDriveFolder,
            fileId: null
          })
        );
      } else if (resolvedSource.candidates.length === 0) {
        setIsLoadingAudio(false);
        setAudioError('Tautan berkas audio kosong atau tidak valid.');
      } else {
        setAudioError(null);
        setIsLoadingAudio(true);
      }
      return;
    }

    // In Web Speech API mode:
    setAudioError(null);
    setIsLoadingAudio(false);

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
  }, [post.id, isCustomMode, customAudioUrl, resolvedSource]);

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

  // Active candidate for custom audio
  const activeCandidate =
    isCustomMode && resolvedSource.candidates.length > 0
      ? resolvedSource.candidates[Math.min(candidateIndex, resolvedSource.candidates.length - 1)]
      : null;

  const effectiveAudioSrc = blobAudioUrl || activeCandidate?.url || '';
  const effectiveCrossOrigin = blobAudioUrl
    ? undefined
    : activeCandidate?.useCrossOrigin
    ? 'anonymous'
    : undefined;

  // Attempt CORS fetch -> Blob URL fallback for Google Drive if direct <audio> candidates fail
  const attemptGoogleDriveBlobFallback = useCallback(async (): Promise<boolean> => {
    if (!resolvedSource.isGoogleDrive || !resolvedSource.directCorsUrl || triedBlobFallbackRef.current) {
      return false;
    }
    triedBlobFallbackRef.current = true;

    try {
      const response = await fetch(resolvedSource.directCorsUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      });

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (!response.ok || contentType.includes('text/html')) {
        return false;
      }

      const rawBlob = await response.blob();
      if (rawBlob.size < 128) {
        return false;
      }

      const audioBlob = contentType.startsWith('audio/')
        ? rawBlob
        : new Blob([rawBlob], { type: 'audio/mpeg' });

      const objUrl = URL.createObjectURL(audioBlob);
      setBlobAudioUrl(objUrl);
      setAudioError(null);
      setIsLoadingAudio(false);
      return true;
    } catch {
      return false;
    }
  }, [resolvedSource]);

  // Handle HTML5 <audio> load error and advance through fallback candidates
  const handleCustomAudioError = useCallback(async () => {
    const audioEl = customAudioRef.current;
    const mediaErrCode = audioEl?.error?.code ?? null;

    // 1. Try next candidate in list if available
    if (!blobAudioUrl && candidateIndex + 1 < resolvedSource.candidates.length) {
      setCandidateIndex(prev => prev + 1);
      return;
    }

    // 2. Try CORS fetch -> Blob URL fallback for Google Drive
    const recoveredViaBlob = await attemptGoogleDriveBlobFallback();
    if (recoveredViaBlob) {
      return;
    }

    // 3. Inspect proxy response if Google Drive to surface exact server error reason
    let serverErrorMsg: string | null = null;
    if (resolvedSource.isGoogleDrive && resolvedSource.fileId) {
      try {
        const checkRes = await fetch(`/api/gdrive-audio?id=${encodeURIComponent(resolvedSource.fileId)}`, {
          method: 'HEAD'
        });
        if (!checkRes.ok && (checkRes.status === 403 || checkRes.status === 404 || checkRes.status === 400)) {
          serverErrorMsg =
            'Berkas audio di Google Drive tidak dapat diakses atau belum dibagikan secara publik. Pastikan akses umum berkas di Google Drive diatur ke "Siapa saja yang memiliki link" (Anyone with the link) dan berkas berformat audio (.mp3, .m4a, .wav).';
        }
      } catch {
        // Ignore network error during diagnostic probe
      }
    }

    setIsLoadingAudio(false);
    setStatus('idle');
    pendingAutoPlayRef.current = false;
    setAudioError(
      describeAudioPlaybackError({
        isGoogleDrive: resolvedSource.isGoogleDrive,
        isGoogleDriveFolder: resolvedSource.isGoogleDriveFolder,
        fileId: resolvedSource.fileId,
        mediaErrorCode: mediaErrCode,
        serverMessage: serverErrorMsg
      })
    );
  }, [blobAudioUrl, candidateIndex, resolvedSource, attemptGoogleDriveBlobFallback]);

  // Retry loading audio from the first candidate
  const handleRetryAudio = () => {
    setAudioError(null);
    setIsLoadingAudio(true);
    setBlobAudioUrl(null);
    triedBlobFallbackRef.current = false;
    setCandidateIndex(0);
    if (customAudioRef.current) {
      customAudioRef.current.load();
    }
  };

  // Play handler (supports both custom audio and speech mode)
  const handlePlay = () => {
    if (isCustomMode) {
      if (audioError) {
        handleRetryAudio();
      }
      const audio = customAudioRef.current;
      if (!audio) return;
      audio.playbackRate = playbackRate;
      audio.volume = volume;
      audio.muted = isMuted;
      pendingAutoPlayRef.current = true;
      setIsLoadingAudio(true);

      audio.play().then(() => {
        pendingAutoPlayRef.current = false;
        setIsLoadingAudio(false);
        setAudioError(null);
        setStatus('playing');
      }).catch(() => {
        // If browser is still switching candidate or loading metadata, onCanPlay will resume
        if (audio.error) {
          handleCustomAudioError();
        }
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
    pendingAutoPlayRef.current = false;
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
    pendingAutoPlayRef.current = false;
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

  // Volume & Mute handlers for HTML5 Audio
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (customAudioRef.current) {
      customAudioRef.current.muted = nextMuted;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVol = Math.max(0, Math.min(1, parseFloat(e.target.value) || 0));
    setVolume(nextVol);
    const shouldMute = nextVol === 0;
    setIsMuted(shouldMute);
    if (customAudioRef.current) {
      customAudioRef.current.volume = nextVol;
      customAudioRef.current.muted = shouldMute;
    }
  };

  // Custom audio element event listeners
  const onCustomLoadedMetadata = () => {
    setIsLoadingAudio(false);
    setAudioError(null);
    if (customAudioRef.current) {
      const dur = customAudioRef.current.duration;
      if (Number.isFinite(dur) && dur > 0) {
        setTotalEstimatedSeconds(Math.round(dur));
      }
      customAudioRef.current.playbackRate = playbackRate;
      customAudioRef.current.volume = volume;
      customAudioRef.current.muted = isMuted;
    }
  };

  const onCustomCanPlay = () => {
    setIsLoadingAudio(false);
    setAudioError(null);
    if (customAudioRef.current) {
      const dur = customAudioRef.current.duration;
      if (Number.isFinite(dur) && dur > 0) {
        setTotalEstimatedSeconds(Math.round(dur));
      }
      if (pendingAutoPlayRef.current) {
        pendingAutoPlayRef.current = false;
        customAudioRef.current
          .play()
          .then(() => {
            setStatus('playing');
          })
          .catch(() => {
            setStatus('idle');
          });
      }
    }
  };

  const onCustomTimeUpdate = () => {
    if (customAudioRef.current) {
      setElapsedSeconds(Math.floor(customAudioRef.current.currentTime || 0));
      const dur = customAudioRef.current.duration;
      if (Number.isFinite(dur) && dur > 0 && totalEstimatedSeconds === 0) {
        setTotalEstimatedSeconds(Math.round(dur));
      }
    }
  };

  const onCustomEnded = () => {
    setStatus('ended');
  };

  // Seek bar click / range input for custom audio
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCustomMode || !customAudioRef.current || totalEstimatedSeconds <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * totalEstimatedSeconds;
    customAudioRef.current.currentTime = newTime;
    setElapsedSeconds(Math.floor(newTime));
  };

  const handleSeekSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isCustomMode || !customAudioRef.current || totalEstimatedSeconds <= 0) return;
    const newTime = Math.max(0, Math.min(totalEstimatedSeconds, Number(e.target.value) || 0));
    customAudioRef.current.currentTime = newTime;
    setElapsedSeconds(Math.floor(newTime));
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
      {/* Integrated HTML5 Audio Element for custom audio / Google Drive stream */}
      {isCustomMode && effectiveAudioSrc && (
        <audio
          key={`${effectiveAudioSrc}_${ effectiveCrossOrigin || 'nocors' }`}
          ref={customAudioRef}
          src={effectiveAudioSrc}
          crossOrigin={effectiveCrossOrigin}
          preload="metadata"
          onLoadedMetadata={onCustomLoadedMetadata}
          onCanPlay={onCustomCanPlay}
          onTimeUpdate={onCustomTimeUpdate}
          onEnded={onCustomEnded}
          onWaiting={() => setIsLoadingAudio(true)}
          onPlaying={() => {
            setIsLoadingAudio(false);
            setAudioError(null);
            setStatus('playing');
          }}
          onPause={() => {
            if (customAudioRef.current && !customAudioRef.current.ended) {
              setStatus('paused');
            }
          }}
          onError={handleCustomAudioError}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-100 dark:border-stone-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 dark:bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
            <Headphones className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-stone-900 dark:text-white text-xs sm:text-sm font-sans">
                {isCustomMode ? 'Rekaman Audio Artikel' : 'Audio Reading Artikel'}
              </h4>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  audioError
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300/60 dark:border-rose-800'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-800'
                }`}
              >
                {audioError
                  ? 'Gangguan Audio'
                  : isLoadingAudio && isCustomMode
                  ? 'Memuat Audio...'
                  : status === 'playing'
                  ? 'Sedang Diputar'
                  : status === 'paused'
                  ? 'Dijeda'
                  : status === 'ended'
                  ? 'Selesai'
                  : isCustomMode
                  ? 'Rekaman Resmi'
                  : 'Suara Otomatis'}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              {isCustomMode
                ? 'Dengarkan rekaman audio kajian sambil membaca naskah artikel di bawah ini.'
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

      {/* Diagnostic Error Alert if Custom / Google Drive Audio fails */}
      {isCustomMode && audioError && (
        <div
          role="alert"
          data-testid="article-audio-error"
          className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 text-rose-800 dark:text-rose-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{audioError}</span>
          </div>
          <button
            type="button"
            onClick={handleRetryAudio}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-stone-800 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 text-[11px] font-bold hover:bg-rose-100/60 transition cursor-pointer shrink-0 self-start sm:self-center"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Muat Ulang Audio</span>
          </button>
        </div>
      )}

      {/* Main Controls, Volume & Progress Bar */}
      <div className="pt-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
                disabled={isCustomMode && Boolean(audioError) && !resolvedSource.fileId && resolvedSource.isGoogleDrive}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                title="Putar audio artikel"
              >
                {isCustomMode && isLoadingAudio && pendingAutoPlayRef.current ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
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

          {/* Right side: Volume Control (for HTML5 Custom Audio) + Duration Display */}
          <div className="flex items-center gap-3 ml-auto">
            {isCustomMode && (
              <div className="flex items-center gap-1.5 bg-white/80 dark:bg-stone-800/80 px-2.5 py-1.5 rounded-xl border border-stone-200/80 dark:border-stone-700/80">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  aria-label={isMuted ? 'Aktifkan suara audio' : 'Bisukan suara audio'}
                  title={isMuted ? 'Aktifkan suara' : 'Bisukan suara'}
                  className="text-stone-600 dark:text-stone-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-500" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  aria-label="Volume audio"
                  className="w-16 sm:w-20 h-1.5 accent-emerald-600 cursor-pointer"
                />
              </div>
            )}

            {/* Time & Progress Indicator */}
            <div className="text-right">
              <span
                data-testid="article-audio-time"
                className="font-mono text-xs font-semibold text-stone-800 dark:text-stone-200"
              >
                {formatSpeechTime(elapsedSeconds)} / {formatSpeechTime(totalEstimatedSeconds)}
              </span>
              <span className="text-[10px] text-stone-400 block">
                {progressPercent}% selesai
              </span>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar & Seek Control */}
        <div className="relative flex items-center">
          <div
            onClick={handleSeek}
            className={`w-full bg-stone-200/80 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden shadow-inner ${
              isCustomMode && totalEstimatedSeconds > 0 ? 'cursor-pointer' : ''
            }`}
            title={isCustomMode ? 'Klik atau geser untuk melompat ke detik tertentu' : undefined}
          >
            <div
              className="bg-gradient-to-r from-emerald-600 to-amber-500 h-full rounded-full transition-all duration-200 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {isCustomMode && totalEstimatedSeconds > 0 && (
            <input
              type="range"
              min={0}
              max={totalEstimatedSeconds}
              step={1}
              value={elapsedSeconds}
              onChange={handleSeekSliderChange}
              aria-label="Progres pemutaran audio"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          )}
        </div>
      </div>
    </div>
  );
};
