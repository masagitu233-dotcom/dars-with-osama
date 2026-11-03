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
  X,
  ScrollText,
  Compass
} from 'lucide-react';
import { BlogPost } from '../../types';
import {
  extractArticleSpeechScript,
  splitIntoSpeechChunks,
  estimateReadingDurationSeconds,
  formatSpeechTime,
  findIndonesianVoice,
  resolveAudioSourceCandidates,
  describeAudioPlaybackError,
  parseWavHeader,
  audioBufferToWavBlob,
  AudioFormatType,
  WavHeaderInfo
} from '../../utils/articleAudioHelper';
import {
  ArticleSpokenSentence,
  calculateArticleScrollTarget,
  smoothScrollToArticleProgress,
  clearAllReadingHighlights,
  getSavedAutoScrollSpeed,
  saveAutoScrollSpeed,
  getAutoScrollSpeedLabel,
  DynamicArticleAutoScroller
} from '../../utils/articleSpeechSync';

interface ArticleAudioPlayerProps {
  post: BlogPost;
  sentences?: ArticleSpokenSentence[];
  className?: string;
  onJumpToSentenceRef?: React.MutableRefObject<((sentenceIndex: number) => void) | null>;
}

export const ArticleAudioPlayer: React.FC<ArticleAudioPlayerProps> = ({
  post,
  sentences = [],
  className = '',
  onJumpToSentenceRef
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
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [totalEstimatedSeconds, setTotalEstimatedSeconds] = useState<number>(0);
  const [activeVoiceName, setActiveVoiceName] = useState<string>('');
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState<boolean>(true);
  const [isAutoScrollPausedByUser, setIsAutoScrollPausedByUser] = useState<boolean>(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState<number>(() => getSavedAutoScrollSpeed());

  // Continuous rAF Auto-Scroller instance
  const autoScrollerRef = useRef<DynamicArticleAutoScroller | null>(null);
  if (!autoScrollerRef.current) {
    autoScrollerRef.current = new DynamicArticleAutoScroller(autoScrollSpeed);
  }

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
  const parsedWavInfoRef = useRef<WavHeaderInfo | null>(null);

  // Speech API Refs & Auto-Scroll Synchronization
  const sentencesRef = useRef<ArticleSpokenSentence[]>([]);
  const sentenceIndexRef = useRef<number>(0);
  const statusRef = useRef<'idle' | 'playing' | 'paused' | 'ended'>('idle');
  const rateRef = useRef<number>(post.audioConfig?.speechRate || 1.0);
  const timerRef = useRef<any>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Auto-scroll manual override tracking
  const isUserScrollingRef = useRef<boolean>(false);
  const userScrollTimeoutRef = useRef<any>(null);

  // Keep refs synchronized
  sentencesRef.current = sentences;
  sentenceIndexRef.current = currentSentenceIndex;
  statusRef.current = status;
  rateRef.current = playbackRate;

  // Listen for user manual scrolls to temporarily defer auto-scroll without fighting the reader
  useEffect(() => {
    const handleUserScrollInput = () => {
      if (statusRef.current !== 'playing') return;

      isUserScrollingRef.current = true;
      setIsAutoScrollPausedByUser(prev => (prev ? prev : true));
      autoScrollerRef.current?.setUserSuspended(true);

      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }

      // Resume auto-scroll gracefully after 4 seconds of user scroll inactivity
      userScrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
        autoScrollerRef.current?.setUserSuspended(false);
        setIsAutoScrollPausedByUser(false);
      }, 4000);
    };

    window.addEventListener('wheel', handleUserScrollInput, { passive: true });
    window.addEventListener('touchmove', handleUserScrollInput, { passive: true });
    window.addEventListener('keydown', handleUserScrollInput, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleUserScrollInput);
      window.removeEventListener('touchmove', handleUserScrollInput);
      window.removeEventListener('keydown', handleUserScrollInput);
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, []);

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

  // Clean resets on article change or unmount
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

    clearAllReadingHighlights();
    autoScrollerRef.current?.stop();

    setStatus('idle');
    setElapsedSeconds(0);
    setCurrentSentenceIndex(0);
    setCandidateIndex(0);
    setBlobAudioUrl(null);
    pendingAutoPlayRef.current = false;
    triedBlobFallbackRef.current = false;
    isUserScrollingRef.current = false;
    setIsAutoScrollPausedByUser(false);

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
      clearAllReadingHighlights();
      autoScrollerRef.current?.stop();
    };
  }, [post.id, isCustomMode, customAudioUrl, resolvedSource]);

  useEffect(() => {
    if (!isCustomMode) {
      const totalWords = sentences.reduce((sum, s) => sum + s.words.length, 0);
      if (totalWords > 0) {
        const estSec = Math.max(10, Math.round((totalWords / (150 * playbackRate)) * 60));
        setTotalEstimatedSeconds(estSec);
      } else {
        const script = extractArticleSpeechScript(post);
        setTotalEstimatedSeconds(estimateReadingDurationSeconds(script, playbackRate));
      }
    }
  }, [playbackRate, post, isCustomMode, sentences]);

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

  // Pure auto-scroll coordinator that calculates smooth target position along the original article content
  const triggerAutoScroll = useCallback((progressRatio: number, forceImmediate = false) => {
    if (!isAutoScrollEnabled) return;
    if (isUserScrollingRef.current && !forceImmediate) return;

    const articleBodyEl =
      document.querySelector('[data-testid="article-body-content"]') ||
      document.querySelector('article') ||
      document.querySelector('.prose');

    if (!articleBodyEl) return;

    const targetY = calculateArticleScrollTarget(articleBodyEl as HTMLElement, progressRatio);
    if (targetY !== null) {
      if (forceImmediate) {
        autoScrollerRef.current?.setUserSuspended(false);
      }
      smoothScrollToArticleProgress(
        targetY,
        isUserScrollingRef.current && !forceImmediate,
        autoScrollerRef.current
      );
    }
  }, [isAutoScrollEnabled]);

  const handleAutoScrollSpeedChange = useCallback((newSpeed: number) => {
    const clampedSpeed = Math.max(0.5, Math.min(2.0, Number(newSpeed.toFixed(2))));
    setAutoScrollSpeed(clampedSpeed);
    saveAutoScrollSpeed(clampedSpeed);
    autoScrollerRef.current?.setSpeed(clampedSpeed);
  }, []);

  const handleResumeAutoScroll = useCallback(() => {
    isUserScrollingRef.current = false;
    setIsAutoScrollPausedByUser(false);
    autoScrollerRef.current?.setUserSuspended(false);
    const curRatio = isCustomMode
      ? totalEstimatedSeconds > 0
        ? elapsedSeconds / totalEstimatedSeconds
        : 0
      : sentences.length > 0
      ? currentSentenceIndex / sentences.length
      : 0;
    triggerAutoScroll(curRatio, true);
    autoScrollerRef.current?.resume();
  }, [isCustomMode, totalEstimatedSeconds, elapsedSeconds, sentences.length, currentSentenceIndex, triggerAutoScroll]);

  const handleToggleAutoScroll = useCallback(() => {
    setIsAutoScrollEnabled(prev => {
      const next = !prev;
      if (!next) {
        autoScrollerRef.current?.pause();
      } else if (statusRef.current === 'playing' && !isUserScrollingRef.current) {
        autoScrollerRef.current?.resume();
      }
      return next;
    });
  }, []);

  // Unified Speech Utterance Synthesizer synchronized with smooth auto-scroll
  const speakSentence = useCallback((index: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const currentSentences = sentencesRef.current;

    if (!currentSentences || currentSentences.length === 0) {
      // Fallback if sentences are not yet parsed
      const script = extractArticleSpeechScript(post);
      const chunks = splitIntoSpeechChunks(script);
      if (index >= chunks.length) {
        setStatus('ended');
        clearAllReadingHighlights();
        return;
      }
      const utt = new SpeechSynthesisUtterance(chunks[index]);
      utt.rate = rateRef.current;
      utt.lang = 'id-ID';
      utt.onstart = () => {
        if (statusRef.current !== 'playing') return;
        setCurrentSentenceIndex(index);
        sentenceIndexRef.current = index;
        const progressRatio = chunks.length > 0 ? index / chunks.length : 0;
        triggerAutoScroll(progressRatio);
      };
      utt.onend = () => {
        if (statusRef.current !== 'playing') return;
        if (index + 1 < chunks.length) {
          speakSentence(index + 1);
        } else {
          setStatus('ended');
          clearAllReadingHighlights();
          autoScrollerRef.current?.stop();
        }
      };
      window.speechSynthesis.speak(utt);
      return;
    }

    if (index >= currentSentences.length) {
      setStatus('ended');
      setCurrentSentenceIndex(currentSentences.length);
      clearAllReadingHighlights();
      return;
    }

    window.speechSynthesis.cancel();

    const sentence = currentSentences[index];
    const utterance = new SpeechSynthesisUtterance(sentence.spokenText);
    utterance.rate = rateRef.current;

    // Detect language: Arabic vs Indonesian
    if (sentence.lang === 'ar-SA') {
      utterance.lang = 'ar-SA';
      const arabicVoice = voicesRef.current.find(v => v.lang.startsWith('ar'));
      if (arabicVoice) utterance.voice = arabicVoice;
    } else {
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
    }

    utterance.onstart = () => {
      if (statusRef.current !== 'playing') return;

      setCurrentSentenceIndex(index);
      sentenceIndexRef.current = index;

      // Auto-scroll smoothly following the speech progress along the original article
      const progressRatio = currentSentences.length > 0 ? index / currentSentences.length : 0;
      triggerAutoScroll(progressRatio);
    };

    utterance.onend = () => {
      if (statusRef.current !== 'playing') return;

      const nextIndex = index + 1;
      setCurrentSentenceIndex(nextIndex);
      sentenceIndexRef.current = nextIndex;

      if (nextIndex < currentSentences.length) {
        speakSentence(nextIndex);
      } else {
        setStatus('ended');
        clearAllReadingHighlights();
        autoScrollerRef.current?.stop();
      }
    };

    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      console.warn('SpeechSynthesis error:', e.error);
      setStatus('paused');
    };

    window.speechSynthesis.speak(utterance);
  }, [post, post.audioConfig?.speechVoiceName, triggerAutoScroll]);

  // Wire Jump-to-Sentence ref callback if provided by parent (supports both TTS and Custom Audio)
  useEffect(() => {
    if (onJumpToSentenceRef) {
      onJumpToSentenceRef.current = (targetSentenceIdx: number) => {
        const curSentences = sentencesRef.current;
        if (targetSentenceIdx >= 0 && targetSentenceIdx < curSentences.length) {
          setCurrentSentenceIndex(targetSentenceIdx);
          sentenceIndexRef.current = targetSentenceIdx;

          const progressRatio = curSentences.length > 0 ? targetSentenceIdx / curSentences.length : 0;
          triggerAutoScroll(progressRatio, true);

          if (isCustomMode) {
            const audio = customAudioRef.current;
            const dur = audio?.duration || totalEstimatedSeconds;
            const totalWords = curSentences.reduce((sum, s) => sum + s.words.length, 0);
            if (audio && dur > 0 && totalWords > 0) {
              const targetSentence = curSentences[targetSentenceIdx];
              const startWord = targetSentence?.startWordIndex ?? 0;
              const targetTime = (startWord / totalWords) * dur;
              audio.currentTime = targetTime;
              setElapsedSeconds(Math.floor(targetTime));
              audio.play().then(() => {
                setStatus('playing');
              }).catch(() => {});
            }
          } else {
            setStatus('playing');
            statusRef.current = 'playing';
            speakSentence(targetSentenceIdx);
          }
        }
      };
    }
    return () => {
      if (onJumpToSentenceRef) {
        onJumpToSentenceRef.current = null;
      }
    };
  }, [onJumpToSentenceRef, speakSentence, isCustomMode, totalEstimatedSeconds, triggerAutoScroll]);

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
    if (!resolvedSource.isGoogleDrive || !resolvedSource.primaryUrl || triedBlobFallbackRef.current) {
      return false;
    }
    triedBlobFallbackRef.current = true;

    try {
      const response = await fetch(resolvedSource.primaryUrl, {
        method: 'GET'
      });

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (!response.ok || contentType.includes('text/html')) {
        return false;
      }

      const rawBlob = await response.blob();
      if (rawBlob.size < 128) {
        return false;
      }

      const isWav =
        contentType.includes('wav') ||
        contentType.includes('wave') ||
        resolvedSource.detectedFormat === 'wav';

      if (isWav) {
        const arrayBuf = await rawBlob.arrayBuffer();
        const wavInfo = parseWavHeader(arrayBuf);
        parsedWavInfoRef.current = wavInfo;

        // If codec is genuinely not supported by browser (e.g. ADPCM or GSM), do not attempt to play
        if (!wavInfo.isSupportedByBrowser) {
          return false;
        }

        // Lossless in-memory normalization via Web Audio API decode to standard 16-bit PCM WAV
        try {
          const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtxClass) {
            const audioCtx = new AudioCtxClass();
            const decoded = await audioCtx.decodeAudioData(arrayBuf.slice(0));
            const pcmBlob = audioBufferToWavBlob(decoded);
            const objUrl = URL.createObjectURL(pcmBlob);
            setBlobAudioUrl(objUrl);
            setAudioError(null);
            setIsLoadingAudio(false);
            return true;
          }
        } catch {
          // If decode fails, continue with direct blob creation
        }
      }

      const finalMime = isWav
        ? 'audio/wav'
        : contentType.includes('mp4') || contentType.includes('m4a')
        ? 'audio/mp4'
        : 'audio/mpeg';

      const audioBlob = new Blob([rawBlob], { type: finalMime });
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
    let finalFormat: AudioFormatType = resolvedSource.detectedFormat;
    let currentWavInfo: WavHeaderInfo | null = parsedWavInfoRef.current;

    if (resolvedSource.isGoogleDrive && resolvedSource.fileId) {
      try {
        const checkRes = await fetch(`/api/gdrive-audio?id=${encodeURIComponent(resolvedSource.fileId)}`, {
          method: 'GET',
          headers: { Range: 'bytes=0-1024' }
        });

        const xFmt = checkRes.headers.get('x-audio-format') as AudioFormatType;
        if (xFmt) {
          finalFormat = xFmt;
        }

        if (!checkRes.ok) {
          try {
            const data = await checkRes.json();
            if (data?.error) {
              serverErrorMsg = data.error;
            }
          } catch {
            // Non-JSON response
          }
        } else {
          // Inspect binary header if not parsed yet
          if (!currentWavInfo && (finalFormat === 'wav' || checkRes.headers.get('content-type')?.includes('wav'))) {
            finalFormat = 'wav';
            try {
              const headerBuf = await checkRes.arrayBuffer();
              if (headerBuf && headerBuf.byteLength >= 12) {
                currentWavInfo = parseWavHeader(headerBuf);
                parsedWavInfoRef.current = currentWavInfo;
              }
            } catch {
              // buffer read failed
            }
          }

          // Server returned 200/206 with binary audio stream, but the browser decoder errored!
          if (mediaErrCode === 4) {
            if (currentWavInfo && !currentWavInfo.isSupportedByBrowser) {
              serverErrorMsg = `Codec audio WAV di dalam berkas tidak didukung: ${currentWavInfo.formatName} (Format ID: ${currentWavInfo.formatCode}), ${currentWavInfo.sampleRate.toLocaleString()} Hz, ${currentWavInfo.bitsPerSample}-bit, ${currentWavInfo.channelLayout}. Peramban web modern hanya mendukung berkas WAV berformat uncompressed Linear PCM (16-bit integer) atau MP3 standar. ${currentWavInfo.unsupportedReason || ''}`;
            } else if (finalFormat === 'wav') {
              serverErrorMsg =
                'Berkas rekaman WAV berhasil dialirkan, namun peramban mengalami kendala memuat data audio ini. Pastikan rekaman diekspor dengan format uncompressed Linear PCM standar (16-bit integer), atau gunakan format MP3.';
            } else {
              serverErrorMsg =
                'Berkas audio berhasil dialirkan dari Google Drive, namun peramban gagal mendekode data audio ini. Pastikan berkas rekaman utuh dan berformat MP3 atau WAV standar.';
            }
          }
        }
      } catch {
        if (mediaErrCode === 2) {
          serverErrorMsg = 'Gangguan koneksi internet saat mengunduh data audio dari Google Drive.';
        }
      }
    } else if (finalFormat === 'wav' && !currentWavInfo) {
      // Direct WAV URL error handling
      try {
        const headRes = await fetch(effectiveAudioSrc, {
          method: 'GET',
          headers: { Range: 'bytes=0-512' }
        });
        if (headRes.ok) {
          const buf = await headRes.arrayBuffer();
          currentWavInfo = parseWavHeader(buf);
          parsedWavInfoRef.current = currentWavInfo;
        }
      } catch {
        // range read failed
      }
    }

    setIsLoadingAudio(false);
    setStatus('idle');
    pendingAutoPlayRef.current = false;
    clearAllReadingHighlights();
    setAudioError(
      describeAudioPlaybackError({
        isGoogleDrive: resolvedSource.isGoogleDrive,
        isGoogleDriveFolder: resolvedSource.isGoogleDriveFolder,
        fileId: resolvedSource.fileId,
        mediaErrorCode: mediaErrCode,
        serverMessage: serverErrorMsg,
        detectedFormat: finalFormat,
        wavInfo: currentWavInfo
      })
    );
  }, [blobAudioUrl, candidateIndex, resolvedSource, attemptGoogleDriveBlobFallback, effectiveAudioSrc]);

  const handleRetryAudio = () => {
    setAudioError(null);
    setIsLoadingAudio(true);
    setBlobAudioUrl(null);
    triedBlobFallbackRef.current = false;
    parsedWavInfoRef.current = null;
    setCandidateIndex(0);
    if (customAudioRef.current) {
      customAudioRef.current.load();
    }
  };

  const handlePlay = () => {
    autoScrollerRef.current?.resume();
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
        autoScrollerRef.current?.resume();
      }).catch((playErr) => {
        if (playErr?.name === 'NotAllowedError') {
          // Browser requires user interaction before autoplay
          setIsLoadingAudio(false);
          setStatus('paused');
          autoScrollerRef.current?.pause();
          return;
        }
        if (audio.error) {
          handleCustomAudioError();
        }
      });
      return;
    }

    // Web Speech API Mode
    if (status === 'paused') {
      setStatus('playing');
      statusRef.current = 'playing';
      autoScrollerRef.current?.resume();
      speakSentence(sentenceIndexRef.current);
    } else if (status === 'ended') {
      setCurrentSentenceIndex(0);
      setElapsedSeconds(0);
      setStatus('playing');
      statusRef.current = 'playing';
      autoScrollerRef.current?.resume();
      speakSentence(0);
    } else {
      setStatus('playing');
      statusRef.current = 'playing';
      autoScrollerRef.current?.resume();
      speakSentence(0);
    }
  };

  const handlePause = () => {
    pendingAutoPlayRef.current = false;
    autoScrollerRef.current?.pause();
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
    clearAllReadingHighlights();
    autoScrollerRef.current?.stop();

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
    setCurrentSentenceIndex(0);
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
      speakSentence(sentenceIndexRef.current);
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
    if (!customAudioRef.current) return;

    const curTime = customAudioRef.current.currentTime || 0;
    setElapsedSeconds(Math.floor(curTime));

    const dur = customAudioRef.current.duration;
    if (Number.isFinite(dur) && dur > 0) {
      if (totalEstimatedSeconds === 0) {
        setTotalEstimatedSeconds(Math.round(dur));
      }
      const progressRatio = Math.max(0, Math.min(1, curTime / dur));
      triggerAutoScroll(progressRatio);
    }
  };

  const onCustomEnded = () => {
    setStatus('ended');
    clearAllReadingHighlights();
    autoScrollerRef.current?.stop();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCustomMode || !customAudioRef.current || totalEstimatedSeconds <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * totalEstimatedSeconds;
    customAudioRef.current.currentTime = newTime;
    setElapsedSeconds(Math.floor(newTime));
    triggerAutoScroll(ratio, true);
  };

  const handleSeekSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isCustomMode || !customAudioRef.current || totalEstimatedSeconds <= 0) return;
    const newTime = Math.max(0, Math.min(totalEstimatedSeconds, Number(e.target.value) || 0));
    customAudioRef.current.currentTime = newTime;
    setElapsedSeconds(Math.floor(newTime));
    const ratio = newTime / totalEstimatedSeconds;
    triggerAutoScroll(ratio, true);
  };

  const progressPercent = isCustomMode
    ? totalEstimatedSeconds > 0
      ? Math.min(100, Math.round((elapsedSeconds / totalEstimatedSeconds) * 100))
      : 0
    : sentences.length > 0
    ? Math.min(100, Math.round(((currentSentenceIndex + 1) / sentences.length) * 100))
    : 0;

  if (!isSupported) {
    return (
      <div className={`p-4 rounded-md bg-[#FAF7F0] dark:bg-[#16263D] border-2 border-[#292D2B] dark:border-[#34465D] text-[#292D2B] dark:text-[#F1F4F8] text-xs flex items-center gap-2.5 ${className}`}>
        <Info className="w-4 h-4 text-[#D6AD52] shrink-0" />
        <span>Fitur Audio Reading tidak didukung pada peramban ini. Anda tetap dapat membaca naskah artikel lengkap di bawah.</span>
      </div>
    );
  }

  return (
    <div className={`my-4 ${className}`}>
      {/* Integrated HTML5 Audio Element always mounted in DOM */}
      {isCustomMode && effectiveAudioSrc && (
        <audio
          key={`${effectiveAudioSrc}_${effectiveCrossOrigin || 'nocors'}`}
          ref={customAudioRef}
          src={effectiveAudioSrc}
          crossOrigin={effectiveCrossOrigin}
          preload="metadata"
          className="hidden"
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

      {/* When player is collapsed (default initial state), only show the clean "Dengarkan Artikel" button */}
      {!isPlayerOpen ? (
        <button
          type="button"
          onClick={() => {
            setIsPlayerOpen(true);
            if (status === 'idle') {
              handlePlay();
            }
          }}
          data-testid="article-audio-toggle-btn"
          aria-expanded={false}
          aria-label="Dengarkan Artikel"
          title="Buka pemutar audio artikel dan aktifkan pembacaan teks bersuara"
          className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-md bg-[#FAF7F0] dark:bg-[#16263D] hover:bg-[#D6AD52] dark:hover:bg-[#D6AD52] text-[#123D32] dark:text-[#F1F4F8] hover:text-[#123D32] dark:hover:text-[#123D32] border-2 border-[#292D2B] dark:border-[#34465D] shadow-[3px_3px_0px_#292D2B] dark:shadow-[3px_3px_0px_#101B2D] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all duration-150 font-extrabold text-xs sm:text-sm cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-sm bg-[#123D32] dark:bg-[#D6AD52] text-[#D6AD52] dark:text-[#123D32] group-hover:bg-[#292D2B] group-hover:text-[#D6AD52] flex items-center justify-center transition-colors shadow-xs">
            <Headphones className="w-4 h-4" />
          </div>
          <span className="font-serif tracking-wide font-bold">Dengarkan Artikel</span>
          {status === 'playing' ? (
            <span className="text-[10px] px-2 py-0.5 rounded-xs bg-[#237A70] text-white dark:bg-[#243A56] dark:text-[#D6AD52] font-extrabold uppercase animate-pulse border border-[#292D2B]/30">
              Sedang Diputar & Mengikuti
            </span>
          ) : status === 'paused' ? (
            <span className="text-[10px] px-2 py-0.5 rounded-xs bg-[#D6AD52] text-[#123D32] font-extrabold uppercase border border-[#292D2B]">
              Dijeda
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-xs bg-[#D6AD52]/20 dark:bg-[#D6AD52]/15 text-[#123D32] dark:text-[#D6AD52] font-extrabold uppercase border border-[#292D2B]/20 dark:border-[#D6AD52]/30 flex items-center gap-1">
              <ScrollText className="w-3 h-3" />
              <span>Auto-Scroll</span>
            </span>
          )}
        </button>
      ) : (
        <div className="space-y-2.5 animate-fade-in">
          {/* Dynamic Player Header Bar with Active Toggle and Close Button */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsPlayerOpen(false)}
              data-testid="article-audio-toggle-btn"
              aria-expanded={true}
              aria-label="Tutup pemutar audio artikel"
              title="Sembunyikan pemutar audio"
              className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-md bg-[#D6AD52] text-[#123D32] border-2 border-[#292D2B] shadow-[2px_2px_0px_#292D2B] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all duration-150 font-extrabold text-xs sm:text-sm cursor-pointer group"
            >
              <div className="w-6 h-6 rounded-sm bg-[#123D32] text-[#D6AD52] flex items-center justify-center">
                <Headphones className="w-3.5 h-3.5" />
              </div>
              <span className="font-serif tracking-wide font-bold">Dengarkan Artikel</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-[#123D32] text-[#D6AD52] font-extrabold uppercase">
                Terbuka
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsPlayerOpen(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border-2 border-[#292D2B] dark:border-[#34465D] bg-[#FAF7F0] dark:bg-[#243A56] text-[#292D2B] dark:text-[#F1F4F8] hover:bg-[#F04438] hover:text-white dark:hover:bg-[#F04438] dark:hover:text-white transition text-xs font-bold cursor-pointer shadow-[2px_2px_0px_#292D2B]"
              title="Sembunyikan pemutar audio"
              aria-label="Sembunyikan pemutar audio"
            >
              <X className="w-3.5 h-3.5" />
              <span>Tutup Pemutar</span>
            </button>
          </div>

          <div
            data-testid="article-audio-player"
            className="bg-[#FAF7F0] dark:bg-[#16263D] border-2 border-[#292D2B] dark:border-[#34465D] rounded-md p-4 sm:p-5 shadow-[4px_4px_0px_#292D2B] dark:shadow-[4px_4px_0px_#101B2D] transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#292D2B]/15 dark:border-[#34465D]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-[#123D32] dark:bg-[#243A56] border-2 border-[#292D2B] dark:border-[#34465D] text-[#D6AD52] flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-[#292D2B] dark:text-white text-xs sm:text-sm font-serif">
                  {isCustomMode ? 'Rekaman Audio Artikel' : 'Audio Reading & Auto-Scroll'}
                </h4>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border ${
                    audioError
                      ? 'bg-[#F04438] text-white border-[#292D2B]'
                      : 'bg-[#D6AD52] text-[#123D32] border-[#292D2B]'
                  }`}
                >
                  {audioError
                    ? 'Gangguan Audio'
                    : isLoadingAudio && isCustomMode
                    ? 'Memuat Audio...'
                    : status === 'playing'
                    ? 'Sedang Membaca'
                    : status === 'paused'
                    ? 'Dijeda'
                    : status === 'ended'
                    ? 'Selesai'
                    : isCustomMode
                    ? 'Rekaman Resmi'
                    : 'Suara Otomatis'}
                </span>
              </div>
              <p className="text-[11px] text-[#626A66] dark:text-[#B4C0D0] mt-0.5">
                {isCustomMode
                  ? 'Dengarkan rekaman audio kajian; layar bergulir otomatis mengikuti alur pembacaan.'
                  : activeVoiceName
                  ? `Pembacaan otomatis (${activeVoiceName}) dengan pengguliran layar otomatis.`
                  : 'Pembacaan suara alami dengan pengguliran layar otomatis (auto-scroll).'}
              </p>
            </div>
          </div>

          {/* Playback Rate Selector (Audio Voice Tempo) */}
          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
            <span className="text-[11px] text-[#626A66] dark:text-[#B4C0D0] font-bold mr-1">
              Audio:
            </span>
            {[0.75, 1.0, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => handleRateChange(rate)}
                className={`px-2 py-1 rounded text-xs font-extrabold border transition cursor-pointer ${
                  playbackRate === rate
                    ? 'bg-[#123D32] text-[#D6AD52] border-[#292D2B] dark:bg-[#D6AD52] dark:text-[#123D32]'
                    : 'bg-white dark:bg-[#243A56] text-[#292D2B] dark:text-[#F1F4F8] border-[#292D2B]/50 dark:border-[#34465D]'
                }`}
                title={`Tempo suara bacaan ${rate}×`}
              >
                {rate}×
              </button>
            ))}
          </div>
        </div>

        {/* Dedicated Auto-Scroll Controls & Speed Tuning Panel */}
        <div className="mt-3 p-3 rounded-lg bg-[#FAF7F0] dark:bg-[#1E293B] border border-[#292D2B]/20 dark:border-[#334155] space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-[#123D32] dark:text-[#D6AD52] shrink-0" />
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-[#292D2B] dark:text-[#F1F4F8]">
                  Auto-Scroll Naskah:
                </span>
                <span
                  data-testid="autoscroll-speed-label"
                  className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#123D32]/10 dark:bg-[#D6AD52]/20 text-[#123D32] dark:text-[#D6AD52] border border-[#123D32]/20 dark:border-[#D6AD52]/30"
                >
                  {getAutoScrollSpeedLabel(autoScrollSpeed)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAutoScrollPausedByUser && (
                <button
                  type="button"
                  onClick={handleResumeAutoScroll}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#D6AD52] text-[#123D32] hover:bg-[#E5BE68] text-[11px] font-extrabold cursor-pointer transition shadow-xs"
                  title="Lanjutkan pengguliran otomatis dan pusatkan layar ke alur pembacaan saat ini"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Lanjutkan Auto-Scroll</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleAutoScroll}
                className={`text-[10px] px-2.5 py-1 rounded font-extrabold border transition cursor-pointer ${
                  isAutoScrollEnabled
                    ? 'bg-[#123D32] text-[#D6AD52] border-[#292D2B] dark:bg-[#D6AD52] dark:text-[#123D32]'
                    : 'bg-white dark:bg-[#16263D] text-[#626A66] dark:text-[#B4C0D0] border-[#292D2B]/30'
                }`}
                title={isAutoScrollEnabled ? 'Nonaktifkan auto-scroll' : 'Aktifkan auto-scroll'}
              >
                Auto-Scroll: {isAutoScrollEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Speed Presets & Fine Tuning Slider */}
          {isAutoScrollEnabled && (
            <div className="space-y-2 pt-1 border-t border-[#292D2B]/10 dark:border-white/10">
              <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                <span className="font-semibold text-[#626A66] dark:text-[#94A3B8]">
                  Kecepatan Gulir (Independen dari Suara):
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((preset) => {
                    const isSelected = Math.abs(autoScrollSpeed - preset) < 0.04;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleAutoScrollSpeedChange(preset)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#123D32] text-[#D6AD52] border-[#123D32] dark:bg-[#D6AD52] dark:text-[#123D32] dark:border-[#D6AD52]'
                            : 'bg-white dark:bg-[#0F172A] text-[#292D2B] dark:text-[#E2E8F0] border-[#292D2B]/20 dark:border-[#334155] hover:border-[#123D32]'
                        }`}
                        title={`Atur kecepatan scroll ke ${preset}×`}
                      >
                        {preset}×
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slider for smooth real-time adjustment */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-[#626A66] dark:text-[#94A3B8] shrink-0 font-medium">
                  0.5× (Lambat)
                </span>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={autoScrollSpeed}
                  onChange={(e) => handleAutoScrollSpeedChange(parseFloat(e.target.value) || 1.0)}
                  className="w-full h-1.5 bg-[#E5E7EB] dark:bg-[#334155] rounded-lg appearance-none cursor-pointer accent-[#123D32] dark:accent-[#D6AD52]"
                  aria-label="Pengatur kecepatan auto-scroll artikel"
                />
                <span className="text-[10px] text-[#626A66] dark:text-[#94A3B8] shrink-0 font-medium">
                  2.0× (Cepat)
                </span>
              </div>

              {/* Status indicator during active reading or manual pause */}
              {status === 'playing' && (
                <div className="flex items-center gap-2 pt-1 text-[11px] text-[#626A66] dark:text-[#94A3B8]">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isAutoScrollPausedByUser ? 'bg-[#D6AD52]' : 'bg-[#10B981] animate-pulse'
                    }`}
                  />
                  <span>
                    {isAutoScrollPausedByUser
                      ? 'Pengguliran manual terdeteksi. Auto-scroll dijeda sementara agar Anda leluasa membaca.'
                      : 'Auto-scroll aktif meluncur mulus mengikuti naskah artikel.'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Diagnostic Error Alert if Custom / Google Drive Audio fails */}
        {isCustomMode && audioError && (
          <div
            role="alert"
            data-testid="article-audio-error"
            className="mt-3 p-3.5 rounded-md bg-[#F04438]/10 dark:bg-[#F04438]/15 border-2 border-[#F04438] text-[#292D2B] dark:text-white text-xs space-y-2.5"
          >
            <div className="flex items-start justify-between gap-2.5 flex-wrap">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#F04438] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-extrabold text-[#F04438] dark:text-[#FF8D85] text-xs">
                    {parsedWavInfoRef.current && !parsedWavInfoRef.current.isSupportedByBrowser
                      ? 'Ketidakcocokan Codec Audio WAV'
                      : 'Kendala Pemutaran Audio'}
                  </div>
                  <p className="leading-relaxed font-medium text-[11px] sm:text-xs text-[#292D2B] dark:text-[#F1F4F8]">
                    {audioError}
                  </p>
                </div>
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

            {parsedWavInfoRef.current && (
              <div className="p-2.5 rounded bg-white/70 dark:bg-[#16263D]/70 border border-[#292D2B]/15 dark:border-[#34465D] text-[10px] space-y-1 font-mono text-[#292D2B] dark:text-[#B4C0D0]">
                <div className="font-sans font-bold text-[11px] text-[#123D32] dark:text-[#D6AD52]">
                  Audit Header Berkas WAV (RIFF):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
                  <div>
                    <span className="opacity-70">Codec:</span>{' '}
                    <span className="font-bold text-[#292D2B] dark:text-white">{parsedWavInfoRef.current.formatName}</span>
                  </div>
                  <div>
                    <span className="opacity-70">Sample Rate:</span>{' '}
                    <span className="font-bold text-[#292D2B] dark:text-white">{parsedWavInfoRef.current.sampleRate.toLocaleString()} Hz</span>
                  </div>
                  <div>
                    <span className="opacity-70">Bit Depth:</span>{' '}
                    <span className="font-bold text-[#292D2B] dark:text-white">{parsedWavInfoRef.current.bitsPerSample}-bit</span>
                  </div>
                  <div>
                    <span className="opacity-70">Saluran:</span>{' '}
                    <span className="font-bold text-[#292D2B] dark:text-white">{parsedWavInfoRef.current.channelLayout} ({parsedWavInfoRef.current.numChannels} ch)</span>
                  </div>
                </div>
              </div>
            )}
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
                  title="Jeda pembacaan audio"
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
                  title="Mulai membaca naskah artikel"
                >
                  {isCustomMode && isLoadingAudio && pendingAutoPlayRef.current ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current text-[#D6AD52]" />
                  )}
                  <span>
                    {status === 'paused'
                      ? 'Lanjutkan Baca'
                      : status === 'ended'
                      ? 'Baca Ulang'
                      : isCustomMode
                      ? 'Putar Audio Rekaman'
                      : 'Baca Artikel'}
                  </span>
                </button>
              )}

              {(status === 'playing' || status === 'paused' || status === 'ended') && (
                <button
                  type="button"
                  onClick={handleStop}
                  className="nb-btn nb-btn-secondary px-3 py-2 text-xs"
                  title="Hentikan pemutaran audio dan kembalikan posisi ke awal"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}
            </div>

            {/* Right side: Volume Control + Duration Display */}
            <div className="flex items-center gap-3 ml-auto">
              {isCustomMode && (
                <div className="flex items-center gap-1.5 bg-white dark:bg-[#243A56] px-2.5 py-1.5 rounded border-2 border-[#292D2B] dark:border-[#34465D]">
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    aria-label={isMuted ? 'Aktifkan suara audio' : 'Bisukan suara audio'}
                    title={isMuted ? 'Aktifkan suara' : 'Bisukan suara'}
                    className="text-[#292D2B] dark:text-[#D6AD52] cursor-pointer"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-[#F04438]" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-[#123D32] dark:text-[#D6AD52]" />
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
                    className="w-16 sm:w-20 h-1.5 accent-[#123D32] dark:accent-[#D6AD52] cursor-pointer"
                  />
                </div>
              )}

              <div className="text-right">
                <span
                  data-testid="article-audio-time"
                  className="font-mono text-xs font-bold text-[#292D2B] dark:text-[#F1F4F8]"
                >
                  {formatSpeechTime(elapsedSeconds)} / {formatSpeechTime(totalEstimatedSeconds)}
                </span>
                <span className="text-[10px] font-bold text-[#123D32] dark:text-[#D6AD52] block">
                  {progressPercent}% selesai {sentences.length > 0 && !isCustomMode && `(kalimat ${Math.min(sentences.length, currentSentenceIndex + 1)}/${sentences.length})`}
                </span>
              </div>
            </div>
          </div>

          {/* Visual Progress Bar & Seek Control */}
          <div className="relative flex items-center">
            <div
              onClick={handleSeek}
              className={`w-full bg-white dark:bg-[#243A56] h-3 rounded-sm overflow-hidden border-2 border-[#292D2B] dark:border-[#34465D] ${
                isCustomMode && totalEstimatedSeconds > 0 ? 'cursor-pointer' : ''
              }`}
              title={isCustomMode ? 'Klik atau geser untuk melompat ke detik tertentu' : undefined}
            >
              <div
                className="bg-[#D6AD52] h-full transition-all duration-200 ease-out"
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
  )}
</div>
  );
};

