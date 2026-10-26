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
  RefreshCw,
  X
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
  const isCustomMode = post.audioConfig?.mode === 'custom';
  const customAudioUrl = (post.audioConfig?.customAudioUrl || '').trim();
  const hasConfiguredAudio =
    Boolean(post.audioConfig?.enabled) &&
    (isCustomMode ? Boolean(customAudioUrl) : post.audioConfig?.mode === 'speech');

  if (!hasConfiguredAudio) {
    return null;
  }

  const resolvedSource = useMemo(
    () => resolveAudioSourceCandidates(customAudioUrl),
    [customAudioUrl]
  );

  // Dynamic open/close player state (initially collapsed to a clean button)
  const [isPlayerOpen, setIsPlayerOpen] = useState<boolean>(false);
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

  useEffect(() => {
    if (post.audioConfig?.speechRate) {
      setPlaybackRate(post.audioConfig.speechRate);
      rateRef.current = post.audioConfig.speechRate;
    }
  }, [post.audioConfig?.speechRate]);

  useEffect(() => {
    return () => {
      if (blobAudioUrl) {
        URL.revokeObjectURL(blobAudioUrl);
      }
    };
  }, [blobAudioUrl]);

  useEffect(() => {
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

  useEffect(() => {
    if (!isCustomMode) {
      const script = extractArticleSpeechScript(post);
      setTotalEstimatedSeconds(estimateReadingDurationSeconds(script, playbackRate));
    }
  }, [playbackRate, post, isCustomMode]);

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

  const handleCustomAudioError = useCallback(async () => {
    const audioEl = customAudioRef.current;
    const mediaErrCode = audioEl?.error?.code ?? null;

    if (!blobAudioUrl && candidateIndex + 1 < resolvedSource.candidates.length) {
      setCandidateIndex(prev => prev + 1);
      return;
    }

    const recoveredViaBlob = await attemptGoogleDriveBlobFallback();
    if (recoveredViaBlob) {
      return;
    }

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
        // Ignore network error
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
        if (audio.error) {
          handleCustomAudioError();
        }
      });
      return;
    }

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

  const progressPercent = isCustomMode
    ? totalEstimatedSeconds > 0
      ? Math.min(100, Math.round((elapsedSeconds / totalEstimatedSeconds) * 100))
      : 0
    : chunks.length > 0
    ? Math.min(100, Math.round((currentChunkIndex / chunks.length) * 100))
    : 0;

  if (!isSupported) {
    return (
      <div className={`p-4 rounded-md bg-[#F8F3E8] dark:bg-[#06251D] border-2 border-[#171717] dark:border-[#D9AC45] text-[#171717] dark:text-[#F8F3E8] text-xs flex items-center gap-2.5 ${className}`}>
        <Info className="w-4 h-4 text-[#D9AC45] shrink-0" />
        <span>Fitur Audio Reading tidak didukung pada peramban ini. Anda tetap dapat membaca naskah artikel lengkap di bawah.</span>
      </div>
    );
  }

  // When player is collapsed (default initial state), only show the clean "Dengarkan Artikel" headphone button
  if (!isPlayerOpen) {
    return (
      <div className={`my-4 ${className}`}>
        <button
          type="button"
          onClick={() => setIsPlayerOpen(true)}
          data-testid="article-audio-toggle-btn"
          aria-expanded={false}
          aria-label="Dengarkan Artikel"
          title="Buka pemutar audio artikel"
          className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-md bg-[#F5EFE2] dark:bg-[#06251D] hover:bg-[#D9AC45] dark:hover:bg-[#D9AC45] text-[#06251D] dark:text-[#F8F3E8] hover:text-[#171717] dark:hover:text-[#171717] border-2 border-[#171717] dark:border-[#D9AC45] shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all duration-150 font-extrabold text-xs sm:text-sm cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-sm bg-[#06251D] dark:bg-[#D9AC45] text-[#D9AC45] dark:text-[#06251D] group-hover:bg-[#171717] group-hover:text-[#D9AC45] flex items-center justify-center transition-colors shadow-xs">
            <Headphones className="w-4 h-4" />
          </div>
          <span className="font-serif tracking-wide font-bold">Dengarkan Artikel</span>
          {status === 'playing' ? (
            <span className="text-[10px] px-2 py-0.5 rounded-xs bg-[#0B6B50] text-white dark:bg-[#0B3026] dark:text-[#D9AC45] font-extrabold uppercase animate-pulse border border-[#171717]/30">
              Sedang Diputar
            </span>
          ) : status === 'paused' ? (
            <span className="text-[10px] px-2 py-0.5 rounded-xs bg-[#D9AC45] text-[#171717] font-extrabold uppercase border border-[#171717]">
              Dijeda
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-xs bg-[#D9AC45]/20 dark:bg-[#D9AC45]/15 text-[#171717] dark:text-[#D9AC45] font-extrabold uppercase border border-[#171717]/20 dark:border-[#D9AC45]/30">
              {isCustomMode ? 'Rekaman' : 'Otomatis'}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={`my-4 space-y-2.5 animate-fade-in ${className}`}>
      {/* Dynamic Player Header Bar with Active Toggle and Close Button */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setIsPlayerOpen(false)}
          data-testid="article-audio-toggle-btn"
          aria-expanded={true}
          aria-label="Tutup pemutar audio artikel"
          title="Sembunyikan pemutar audio"
          className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-md bg-[#D9AC45] text-[#171717] border-2 border-[#171717] shadow-[2px_2px_0px_#171717] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all duration-150 font-extrabold text-xs sm:text-sm cursor-pointer group"
        >
          <div className="w-6 h-6 rounded-sm bg-[#06251D] text-[#D9AC45] flex items-center justify-center">
            <Headphones className="w-3.5 h-3.5" />
          </div>
          <span className="font-serif tracking-wide font-bold">Dengarkan Artikel</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-[#06251D] text-[#D9AC45] font-extrabold uppercase">
            Terbuka
          </span>
        </button>

        <button
          type="button"
          onClick={() => setIsPlayerOpen(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border-2 border-[#171717] dark:border-[#D9AC45]/60 bg-[#F5EFE2] dark:bg-[#0B3026] text-[#171717] dark:text-[#F8F3E8] hover:bg-[#F04438] hover:text-white dark:hover:bg-[#F04438] dark:hover:text-white transition text-xs font-bold cursor-pointer shadow-[2px_2px_0px_#171717]"
          title="Sembunyikan pemutar audio"
          aria-label="Sembunyikan pemutar audio"
        >
          <X className="w-3.5 h-3.5" />
          <span>Tutup Pemutar</span>
        </button>
      </div>

      <div
        data-testid="article-audio-player"
        className="bg-[#F8F3E8] dark:bg-[#06251D] border-2 border-[#171717] dark:border-[#D9AC45] rounded-md p-4 sm:p-5 shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#000000] transition-all"
      >
      {/* Integrated HTML5 Audio Element */}
      {isCustomMode && effectiveAudioSrc && (
        <audio
          key={`${effectiveAudioSrc}_${effectiveCrossOrigin || 'nocors'}`}
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#171717]/15 dark:border-[#D9AC45]/25">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-[#06251D] dark:bg-[#0B3026] border-2 border-[#171717] dark:border-[#D9AC45] text-[#D9AC45] flex items-center justify-center shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-[#171717] dark:text-white text-xs sm:text-sm font-serif">
                {isCustomMode ? 'Rekaman Audio Artikel' : 'Audio Reading Artikel'}
              </h4>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border ${
                  audioError
                    ? 'bg-[#F04438] text-white border-[#171717]'
                    : 'bg-[#D9AC45] text-[#171717] border-[#171717]'
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
            <p className="text-[11px] text-[#171717]/75 dark:text-[#F8F3E8]/75 mt-0.5">
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
          <span className="text-[11px] text-[#171717]/75 dark:text-[#F8F3E8]/75 font-bold mr-1">
            Kecepatan:
          </span>
          {[0.75, 1.0, 1.25, 1.5].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => handleRateChange(rate)}
              className={`px-2 py-1 rounded text-xs font-extrabold border transition cursor-pointer ${
                playbackRate === rate
                  ? 'bg-[#06251D] text-[#D9AC45] border-[#171717] dark:bg-[#D9AC45] dark:text-[#171717]'
                  : 'bg-white dark:bg-[#0B3026] text-[#171717] dark:text-[#F8F3E8] border-[#171717]/50 dark:border-[#D9AC45]/50'
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
          className="mt-3 p-3 rounded-md bg-[#F04438]/15 border-2 border-[#F04438] text-[#171717] dark:text-white text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#F04438] shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{audioError}</span>
          </div>
          <button
            type="button"
            onClick={handleRetryAudio}
            className="nb-btn nb-btn-secondary px-3 py-1.5 text-[11px] shrink-0 self-start sm:self-center"
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
                className="nb-btn nb-btn-gold px-4 py-2 text-xs"
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
                className="nb-btn nb-btn-primary px-4 py-2 text-xs"
                title="Putar audio artikel"
              >
                {isCustomMode && isLoadingAudio && pendingAutoPlayRef.current ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current text-[#D9AC45]" />
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
                className="nb-btn nb-btn-secondary px-3 py-2 text-xs"
                title="Hentikan dan mulai dari awal"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>

          {/* Right side: Volume Control + Duration Display */}
          <div className="flex items-center gap-3 ml-auto">
            {isCustomMode && (
              <div className="flex items-center gap-1.5 bg-white dark:bg-[#0B3026] px-2.5 py-1.5 rounded border-2 border-[#171717] dark:border-[#D9AC45]/60">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  aria-label={isMuted ? 'Aktifkan suara audio' : 'Bisukan suara audio'}
                  title={isMuted ? 'Aktifkan suara' : 'Bisukan suara'}
                  className="text-[#171717] dark:text-[#D9AC45] cursor-pointer"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-[#F04438]" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-[#06251D] dark:text-[#D9AC45]" />
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
                  className="w-16 sm:w-20 h-1.5 accent-[#06251D] dark:accent-[#D9AC45] cursor-pointer"
                />
              </div>
            )}

            <div className="text-right">
              <span
                data-testid="article-audio-time"
                className="font-mono text-xs font-bold text-[#171717] dark:text-[#F8F3E8]"
              >
                {formatSpeechTime(elapsedSeconds)} / {formatSpeechTime(totalEstimatedSeconds)}
              </span>
              <span className="text-[10px] font-bold text-[#06251D] dark:text-[#D9AC45] block">
                {progressPercent}% selesai
              </span>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar & Seek Control */}
        <div className="relative flex items-center">
          <div
            onClick={handleSeek}
            className={`w-full bg-white dark:bg-[#0B3026] h-3 rounded-sm overflow-hidden border-2 border-[#171717] dark:border-[#D9AC45]/60 ${
              isCustomMode && totalEstimatedSeconds > 0 ? 'cursor-pointer' : ''
            }`}
            title={isCustomMode ? 'Klik atau geser untuk melompat ke detik tertentu' : undefined}
          >
            <div
              className="bg-[#D9AC45] h-full transition-all duration-200 ease-out"
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
    </div>
  );
};
