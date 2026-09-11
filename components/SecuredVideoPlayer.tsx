'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Bookmark,
  BookmarkPlus,
  Sparkles,
  CheckCircle,
  Trash2,
  Settings2,
  Clock,
  Tag,
  Share2,
  Layers,
  HelpCircle,
  EyeOff,
  Keyboard,
  ChevronDown,
  ShieldCheck,
  User,
  Phone,
  Smartphone,
  Info,
  ExternalLink,
  BookOpen,
  HelpCircle as QuestionIcon,
  Flame,
  Check,
  X,
  Compass,
  ArrowRight,
  Pin,
  Volume,
  Minus,
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Volume2 as SpeakerIcon
} from 'lucide-react';
import {
  deobfuscateVideoIdentifier,
  formatVideoTime,
  getStudentVideoNotes,
  saveStudentVideoNote,
  deleteStudentVideoNote,
  autoFetchVideoDetails,
  VideoTimestampNote
} from '@/lib/videoService';

interface SecuredVideoPlayerProps {
  videoIdOrUrl: string;
  itemId?: string;
  courseId?: string;
  sourceType?: 'internal_secured' | 'direct_youtube';
  studentPhone?: string;
  studentId?: string;
  studentName?: string;
  title?: string;
  durationMinutes?: number;
  onCompleted?: () => void;
}

export default function SecuredVideoPlayer({
  videoIdOrUrl,
  itemId = 'item_default',
  courseId = 'course_default',
  sourceType = 'internal_secured',
  studentPhone: initialPhone = '01552191172',
  studentId: initialId = 'MR-DEV-8829',
  studentName: initialName = 'طالب المنصة',
  title = 'محاضرة تعليمية',
  durationMinutes: initialDurationMinutes = 0,
  onCompleted,
}: SecuredVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic user data from platform storage if available (fallback to valid instructor/student defaults)
  const [actualStudentPhone, setActualStudentPhone] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedAuth = localStorage.getItem('mr_radwan_current_user');
        if (storedAuth) {
          const user = JSON.parse(storedAuth);
          if (user.phone) return user.phone;
        }
      } catch {}
    }
    return initialPhone;
  });

  const [actualStudentId, setActualStudentId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedAuth = localStorage.getItem('mr_radwan_current_user');
        if (storedAuth) {
          const user = JSON.parse(storedAuth);
          if (user.id) return user.id.slice(0, 10).toUpperCase();
        }
      } catch {}
    }
    return initialId;
  });

  const [actualStudentName, setActualStudentName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedAuth = localStorage.getItem('mr_radwan_current_user');
        if (storedAuth) {
          const user = JSON.parse(storedAuth);
          if (user.fullName) return user.fullName;
        }
      } catch {}
    }
    return initialName;
  });

  // Video Duration & Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(() => {
    if (initialDurationMinutes && initialDurationMinutes > 0) {
      return initialDurationMinutes * 60;
    }
    return 0;
  });
  const [detectedDurationLabel, setDetectedDurationLabel] = useState<string>(() => {
    if (initialDurationMinutes && initialDurationMinutes > 0) {
      return formatVideoTime(initialDurationMinutes * 60);
    }
    return '';
  });
  const [volume, setVolume] = useState<number>(100);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isWindowBlurred, setIsWindowBlurred] = useState<boolean>(false);
  const [showKeyboardHints, setShowKeyboardHints] = useState<boolean>(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);

  // Timeline Hover Scrubber Preview State
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  // Dynamic Anti-Leak Floating Watermark Coordinates (Multi-point shifting)
  const [watermarkPos, setWatermarkPos] = useState({ top: '25%', left: '35%' });
  const [watermarkSubPos, setWatermarkSubPos] = useState({ top: '65%', left: '70%' });
  const [watermarkThirdPos, setWatermarkThirdPos] = useState({ top: '15%', left: '80%' });

  // Notes & Bookmarks State
  const [notes, setNotes] = useState<VideoTimestampNote[]>(() => (itemId ? getStudentVideoNotes(itemId) : []));
  const [isNoteModalOpen, setIsNoteModalOpen] = useState<boolean>(false);
  const [noteTimestamp, setNoteTimestamp] = useState<number>(0);
  const [noteTitle, setNoteTitle] = useState<string>('');
  const [noteContent, setNoteContent] = useState<string>('');
  const [noteTag, setNoteTag] = useState<'important' | 'exam_tip' | 'grammar_rule' | 'review_later' | 'general'>('important');
  const [selectedColor, setSelectedColor] = useState<string>('amber');
  const [noteSuccessToast, setNoteSuccessToast] = useState<boolean>(false);

  // Note Enlargement & Zoom State
  const [enlargedNote, setEnlargedNote] = useState<VideoTimestampNote | null>(null);
  const [noteZoomScale, setNoteZoomScale] = useState<number>(1);
  const [copyToast, setCopyToast] = useState<boolean>(false);

  // Note Jump Confirmation Modal
  const [jumpNotePrompt, setJumpNotePrompt] = useState<VideoTimestampNote | null>(null);

  // Decrypt / extract clean video ID safely
  const cleanVideoId = deobfuscateVideoIdentifier(videoIdOrUrl);

  // Auto-Detect exact video duration & metadata dynamically on mount from Server API
  useEffect(() => {
    if (!cleanVideoId) return;

    let isMounted = true;
    const fetchExactDetails = async () => {
      try {
        const details = await autoFetchVideoDetails(cleanVideoId);
        if (!isMounted) return;

        if (details.durationSeconds && details.durationSeconds > 0) {
          setTotalDuration(details.durationSeconds);
          setDetectedDurationLabel(formatVideoTime(details.durationSeconds));
        } else if (details.durationMinutes && details.durationMinutes > 0) {
          const secs = details.durationMinutes * 60;
          setTotalDuration(secs);
          setDetectedDurationLabel(formatVideoTime(secs));
        }
      } catch (e) {
        console.warn('Could not auto-fetch video details:', e);
      }
    };

    fetchExactDetails();

    return () => {
      isMounted = false;
    };
  }, [cleanVideoId]);

  // Real-time Live YouTube Player Event & Duration Synchronization via Iframe PostMessage
  useEffect(() => {
    const handleYouTubeMessage = (event: MessageEvent) => {
      try {
        if (!event.data) return;
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        // Process infoDelivery or direct duration reports from YouTube Player API
        if (data && data.info) {
          if (typeof data.info.duration === 'number' && data.info.duration > 0) {
            const exactSec = Math.round(data.info.duration);
            setTotalDuration(exactSec);
            setDetectedDurationLabel(formatVideoTime(exactSec));
          }
          if (typeof data.info.currentTime === 'number') {
            setCurrentTime(Math.floor(data.info.currentTime));
          }
          if (typeof data.info.playerState === 'number') {
            // 1: playing, 2: paused, 0: ended
            if (data.info.playerState === 1) setIsPlaying(true);
            else if (data.info.playerState === 2 || data.info.playerState === 0) setIsPlaying(false);
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleYouTubeMessage);

    // Actively handshake and poll duration from the YouTube Iframe
    const pollInterval = setInterval(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'getDuration', args: [] }),
            '*'
          );
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'getCurrentTime', args: [] }),
            '*'
          );
        } catch {}
      }
    }, 1200);

    return () => {
      window.removeEventListener('message', handleYouTubeMessage);
      clearInterval(pollInterval);
    };
  }, []);

  // Anti-Recording & Blur Protection on Window Blur / Screen Recording
  useEffect(() => {
    const handleBlur = () => {
      if (sourceType === 'internal_secured') {
        setIsWindowBlurred(true);
      }
    };
    const handleFocus = () => {
      setIsWindowBlurred(false);
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [sourceType]);

  // Handle auto-hiding controls after 3.5s of inactivity while playing
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  };

  // Playback control handlers via Iframe PostMessage
  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: next ? 'playVideo' : 'pauseVideo',
            args: [],
          }),
          '*'
        );
      }
      return next;
    });
  }, []);

  const seekDelta = useCallback((seconds: number) => {
    setCurrentTime((prev) => {
      const nextTime = Math.max(0, Math.min(totalDuration, prev + seconds));
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'seekTo',
            args: [nextTime, true],
          }),
          '*'
        );
      }
      return nextTime;
    });
  }, [totalDuration]);

  const seekToExact = useCallback((seconds: number) => {
    setCurrentTime(seconds);
    setIsPlaying(true);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [seconds, true],
        }),
        '*'
      );
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'playVideo',
          args: [],
        }),
        '*'
      );
    }
  }, []);

  const seekToPercentage = useCallback((pct: number) => {
    const target = Math.floor(totalDuration * pct);
    seekToExact(target);
  }, [totalDuration, seekToExact]);

  const changeVolume = useCallback((val: number) => {
    setVolume(val);
    if (val === 0) setIsMuted(true);
    else setIsMuted(false);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'setVolume',
          args: [val],
        }),
        '*'
      );
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const nextMuted = !prev;
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: nextMuted ? 'mute' : 'unMute',
            args: [],
          }),
          '*'
        );
      }
      return nextMuted;
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    const doc = document as any;
    const el = containerRef.current as any;
    const isFs = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;

    if (!isFs) {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  }, []);

  // Sync fullscreen change events across devices & mobile browsers
  useEffect(() => {
    const handleFsChange = () => {
      const doc = document as any;
      const isFs = Boolean(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
      setIsFullscreen(isFs);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
    };
  }, []);

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'setPlaybackRate',
          args: [speed],
        }),
        '*'
      );
    }
  };

  const handleOpenAddNote = useCallback((timeOverride?: number) => {
    const target = timeOverride !== undefined ? timeOverride : currentTime;
    setNoteTimestamp(target);
    setNoteTitle('');
    setNoteContent('');
    setSelectedColor('amber');
    setIsNoteModalOpen(true);
  }, [currentTime]);

  // Anti-DevTools & Anti-Inspect Key Interceptions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.key === 'S' || e.key === 's'))
      ) {
        e.preventDefault();
        return false;
      }

      // If active inside an input or textarea, don't trigger player shortcuts
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      // Player Shortcuts
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          seekDelta(10);
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          seekDelta(-10);
          break;
        case 'arrowup':
          e.preventDefault();
          changeVolume(Math.min(100, volume + 5));
          break;
        case 'arrowdown':
          e.preventDefault();
          changeVolume(Math.max(0, volume - 5));
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'b':
          e.preventDefault();
          handleOpenAddNote();
          break;
        case '?':
          setShowKeyboardHints((prev) => !prev);
          break;
        default:
          if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            const pct = parseInt(e.key) / 10;
            seekToPercentage(pct);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    volume,
    isMuted,
    isFullscreen,
    currentTime,
    totalDuration,
    isPlaying,
    togglePlayPause,
    seekDelta,
    seekToPercentage,
    changeVolume,
    toggleMute,
    toggleFullscreen,
    handleOpenAddNote,
  ]);

  // Floating Watermark coordinates dynamic shifting (every 8s)
  useEffect(() => {
    if (sourceType !== 'internal_secured') return;
    const interval = setInterval(() => {
      const t1 = Math.floor(Math.random() * 60 + 15) + '%';
      const l1 = Math.floor(Math.random() * 60 + 15) + '%';
      const t2 = Math.floor(Math.random() * 60 + 15) + '%';
      const l2 = Math.floor(Math.random() * 60 + 15) + '%';
      const t3 = Math.floor(Math.random() * 60 + 15) + '%';
      const l3 = Math.floor(Math.random() * 60 + 15) + '%';
      setWatermarkPos({ top: t1, left: l1 });
      setWatermarkSubPos({ top: t2, left: l2 });
      setWatermarkThirdPos({ top: t3, left: l3 });
    }, 8000);

    return () => clearInterval(interval);
  }, [sourceType]);

  // Time progression tracker
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            if (onCompleted) onCompleted();
            return totalDuration;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, totalDuration, onCompleted]);

  // Note Submission Handler
  const handleSaveNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    saveStudentVideoNote({
      itemId,
      courseId,
      timestampSeconds: noteTimestamp,
      timestampFormatted: formatVideoTime(noteTimestamp),
      title: noteTitle.trim(),
      content: noteContent.trim(),
      tag: noteTag,
      color: selectedColor,
    });

    setNotes(getStudentVideoNotes(itemId));
    setIsNoteModalOpen(false);
    setNoteSuccessToast(true);
    setTimeout(() => setNoteSuccessToast(false), 3000);
  };

  const handleDeleteNote = (id: string) => {
    deleteStudentVideoNote(id);
    setNotes(getStudentVideoNotes(itemId));
  };

  // Note card click: triggers friendly interactive confirmation prompt
  const handleNoteCardClick = (note: VideoTimestampNote) => {
    setJumpNotePrompt(note);
  };

  const handleConfirmJump = () => {
    if (jumpNotePrompt) {
      seekToExact(jumpNotePrompt.timestampSeconds);
      setJumpNotePrompt(null);
      // Smooth scroll back to player
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // High-Security Pure Player Embed URL with strict parameters (Static URL to prevent iframe reloading on pause/resume)
  const embedUrl = `https://www.youtube-nocookie.com/embed/${cleanVideoId}?enablejsapi=1&rel=0&modestbranding=1&controls=0&showinfo=0&disablekb=1&fs=0&iv_load_policy=3&playsinline=1&origin=${
    typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : ''
  }`;

  return (
    <div className="space-y-5 select-none font-sans" id="mradwan_secured_video_root">
      {/* Top Security Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            مشغل فيديو داخلي
          </span>
          <span className="hidden sm:inline text-slate-500 dark:text-slate-400 text-[11px] font-bold">
            مدة المحاضرة الفعلية: {detectedDurationLabel || (totalDuration > 0 ? formatVideoTime(totalDuration) : 'جاري التحديد التلقائي...')}
          </span>
        </div>
      </div>

      {/* Video Container Shell with Smooth Visual Finish */}
      <div
        ref={containerRef}
        onContextMenu={(e) => e.preventDefault()}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setShowControls(true)}
        className="relative w-full rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl group flex flex-col justify-between aspect-video"
      >
        {/* Dynamic Watermark 1 (Primary Floating Name, Phone & Student ID - Subtle & Non-Intrusive) */}
        {sourceType === 'internal_secured' && (
          <div
            className="absolute pointer-events-none transition-all duration-1000 ease-in-out opacity-12 hover:opacity-20 text-white font-mono text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-lg bg-black/20 backdrop-blur-[0.5px] border border-white/5 z-30 flex flex-col items-center select-none text-center"
            style={{ top: watermarkPos.top, left: watermarkPos.left }}
          >
            <span className="tracking-wider">{actualStudentName}</span>
            <span className="tracking-wider text-[9px] sm:text-[10px]">{actualStudentPhone}</span>
            <span className="text-[8px] sm:text-[9px] opacity-75">ID: {actualStudentId}</span>
          </div>
        )}

        {/* Dynamic Watermark 2 (Subtle floating secondary watermark) */}
        {sourceType === 'internal_secured' && (
          <div
            className="absolute pointer-events-none transition-all duration-1000 ease-in-out opacity-10 text-emerald-200 font-mono text-[9px] sm:text-[10px] font-medium px-2 py-0.5 rounded bg-black/15 z-30 select-none flex flex-col items-center"
            style={{ top: watermarkSubPos.top, left: watermarkSubPos.left }}
          >
            <span>{actualStudentName}</span>
            <span>{actualStudentPhone}</span>
          </div>
        )}

        {/* Dynamic Watermark 3 (Micro Student Code) */}
        {sourceType === 'internal_secured' && (
          <div
            className="absolute pointer-events-none transition-all duration-1000 ease-in-out opacity-10 text-slate-300 font-mono text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded bg-black/10 z-30 select-none"
            style={{ top: watermarkThirdPos.top, left: watermarkThirdPos.left }}
          >
            <span>ID: {actualStudentId}</span>
          </div>
        )}

        {/* Main Video Iframe with Whitewash / Anti-YouTube Overlay Masks */}
        <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full border-0 pointer-events-none scale-[1.03] origin-center"
          />

          {/* Whitewash & Click Capture Transparent Mask (Prevents clicking YouTube suggested videos or header links) */}
          <div 
            onClick={togglePlayPause}
            className="absolute inset-0 z-10 cursor-pointer bg-transparent"
            title="انقر للتشغيل / الإيقاف المؤقت"
          />

          {/* Top Edge Whitewash Strip (Blocks YouTube Share / Watch Later headers completely) */}
          <div className="absolute top-0 inset-x-0 h-14 bg-gradient-to-b from-slate-950 via-slate-950/60 to-transparent z-15 pointer-events-none" />

          {/* Bottom Edge Whitewash Strip (Blocks YouTube default controls & logos completely) */}
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent z-15 pointer-events-none" />
        </div>

        {/* Top Fast Action Bar (Custom Glassmorphism) */}
        <div
          className={`absolute top-0 inset-x-0 p-2.5 sm:p-4 z-20 flex items-center justify-between transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-lg sm:rounded-xl text-white">
              <h3 className="font-black text-[11px] sm:text-xs md:text-sm drop-shadow truncate max-w-[130px] xs:max-w-[200px] sm:max-w-xs md:max-w-md">
                {title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Add Bookmark / Note at Current Minute */}
            <button
              onClick={() => handleOpenAddNote()}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3.5 sm:py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-lg sm:rounded-xl font-bold sm:font-black text-[10px] sm:text-xs backdrop-blur-md shadow-lg transition-all hover:scale-105 active:scale-95 shrink-0"
              title="تدوين ملاحظة وعلامة مراجعة عند هذه الدقيقة"
            >
              <BookmarkPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">ملاحظة {formatVideoTime(currentTime)}</span>
              <span className="xs:hidden">ملاحظة</span>
            </button>

            {/* Keyboard Shortcuts Helper Toggle */}
            <button
              onClick={() => setShowKeyboardHints((prev) => !prev)}
              className="p-1.5 sm:p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-lg sm:rounded-xl backdrop-blur-md border border-slate-700/60 transition-colors shrink-0"
              title="اختصارات لوحة المفاتيح"
            >
              <Keyboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Center Play/Pause Large Splash on Hover (Clean UI) */}
        {!isPlaying && (
          <div 
            onClick={togglePlayPause}
            className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer pointer-events-auto"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white flex items-center justify-center shadow-2xl backdrop-blur-md transition-transform hover:scale-110 active:scale-95 border-2 border-white/20">
              <Play className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 fill-white ml-0.5" />
            </div>
          </div>
        )}

        {/* Bottom Custom Bar & Interactive Timeline */}
        <div
          className={`absolute bottom-0 inset-x-0 p-2 sm:p-3 md:p-4 z-20 space-y-1.5 sm:space-y-2 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Custom Sleek LTR Progress Track with Gradient Spectrum and Note Markers */}
          <div
            dir="ltr"
            className="relative w-full group/track cursor-pointer py-1.5 sm:py-2 select-none"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const pct = Math.max(0, Math.min(1, clickX / rect.width));
              setHoverPct(pct);
              if (totalDuration > 0) {
                setHoverTime(Math.floor(pct * totalDuration));
              }
            }}
            onMouseLeave={() => {
              setHoverPct(null);
              setHoverTime(null);
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const pct = Math.max(0, Math.min(1, clickX / rect.width));
              seekToPercentage(pct);
            }}
          >
            {/* Hover Timestamp Floating Tooltip */}
            {hoverPct !== null && hoverTime !== null && (
              <div
                className="absolute -top-8 -translate-x-1/2 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-slate-900/95 text-white font-mono text-[10px] sm:text-[11px] font-black rounded-lg border border-slate-700 shadow-2xl pointer-events-none z-40 whitespace-nowrap flex items-center gap-1 backdrop-blur-md"
                style={{ left: `${hoverPct * 100}%` }}
              >
                <span>{formatVideoTime(hoverTime)}</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900" />
              </div>
            )}

            {/* Hover Guide Line */}
            {hoverPct !== null && (
              <div
                className="absolute top-1 bottom-1 w-0.5 bg-white/40 pointer-events-none z-20 rounded-full"
                style={{ left: `${hoverPct * 100}%` }}
              />
            )}

            {/* Background Track with Inner Glow */}
            <div className="w-full h-1.5 sm:h-2 group-hover/track:h-2.5 sm:group-hover/track:h-3.5 bg-slate-900/90 rounded-full overflow-hidden relative transition-all shadow-inner border border-slate-700/60">
              {/* Active Progress with Multi-Layer Rich Gradient Spectrum (Red -> Orange -> Green -> Blue) */}
              <div
                className="h-full bg-gradient-to-r from-red-500 via-amber-400 via-emerald-400 to-sky-400 transition-all rounded-full relative shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                style={{ width: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%` }}
              >
                {/* Subtle Moving Shimmer Wave */}
                <div className="absolute inset-0 bg-white/15 animate-pulse rounded-full" />
              </div>
            </div>

            {/* Glowing Scrubber Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white shadow-[0_0_12px_rgba(56,189,248,0.9)] border-2 border-slate-950 opacity-0 group-hover/track:opacity-100 transition-opacity -ml-2 pointer-events-none z-30"
              style={{ left: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%` }}
            />

            {/* Note Marker Dots Along The Progress Bar (Pinned Timestamps) */}
            {notes.map((n) => {
              const markerPct = totalDuration > 0 ? Math.min(100, Math.max(0, (n.timestampSeconds / totalDuration) * 100)) : 0;
              return (
                <div
                  key={n.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNoteCardClick(n);
                  }}
                  className="absolute top-1/2 -translate-y-1/2 -ml-1.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-amber-400 border-2 border-slate-950 rounded-full hover:scale-150 transition-transform cursor-pointer z-30 shadow-lg flex items-center justify-center ring-2 ring-amber-400/40"
                  style={{ left: `${markerPct}%` }}
                  title={`[${n.timestampFormatted}] ${n.title}`}
                >
                  <div className="w-1 h-1 bg-slate-950 rounded-full" />
                </div>
              );
            })}
          </div>

          {/* Controls Bar Row */}
          <div className="flex items-center justify-between text-white text-xs font-bold bg-slate-950/90 backdrop-blur-md px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl border border-slate-800/80 shadow-2xl gap-1 sm:gap-2">
            {/* Left Controls & Volume */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <button
                onClick={togglePlayPause}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 shrink-0"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" /> : <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white ml-0.5" />}
              </button>

              <button
                onClick={() => seekDelta(-10)}
                className="p-1 sm:p-1.5 text-slate-300 hover:text-emerald-400 transition-colors shrink-0"
                title="تراجع 10 ثوانٍ (Arrow Left / J)"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <button
                onClick={() => seekDelta(10)}
                className="p-1 sm:p-1.5 text-slate-300 hover:text-emerald-400 transition-colors shrink-0"
                title="تقديم 10 ثوانٍ (Arrow Right / L)"
              >
                <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Mobile Single Mute Toggle Button */}
              <button 
                onClick={toggleMute} 
                className="sm:hidden p-1 text-slate-300 hover:text-emerald-400 transition-colors shrink-0 rounded-lg hover:bg-slate-900" 
                title="كتم / تشغيل الصوت"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : volume < 50 ? (
                  <Volume1 className="w-4 h-4 text-amber-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                )}
              </button>

              {/* Desktop Volume Slider with Gradient Bar and Up/Down Step Controls */}
              <div dir="ltr" className="hidden sm:flex items-center gap-1.5 bg-slate-900/90 px-2 py-1 rounded-xl border border-slate-800">
                <button onClick={toggleMute} className="p-1 hover:text-emerald-400 transition-colors" title="كتم / تشغيل الصوت">
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  ) : volume < 50 ? (
                    <Volume1 className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </button>

                {/* Quick Volume Down (-) */}
                <button
                  onClick={() => changeVolume(Math.max(0, volume - 10))}
                  className="p-0.5 text-slate-400 hover:text-rose-400 transition-colors rounded"
                  title="خفض الصوت 10%"
                >
                  <Minus className="w-2.5 h-2.5" />
                </button>

                {/* Custom Gradient Volume Track */}
                <div className="relative w-16 sm:w-20 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 via-amber-400 via-emerald-400 to-sky-400 rounded-full transition-all shadow-sm"
                    style={{ width: `${isMuted ? 0 : volume}%` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => changeVolume(Number(e.target.value))}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title={`مستوى الصوت: ${isMuted ? 0 : volume}%`}
                  />
                </div>

                {/* Quick Volume Up (+) */}
                <button
                  onClick={() => changeVolume(Math.min(100, volume + 10))}
                  className="p-0.5 text-slate-400 hover:text-emerald-400 transition-colors rounded"
                  title="رفع الصوت 10%"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>

                {/* Volume Percentage Badge */}
                <span className="font-mono text-[10px] text-slate-300 font-bold w-6 text-center">
                  {isMuted ? '0%' : `${volume}%`}
                </span>
              </div>

              {/* Time Display (Responsive) */}
              <span className="font-mono text-slate-300 text-[10px] sm:text-[11px] tracking-wider whitespace-nowrap">
                {formatVideoTime(currentTime)} <span className="text-slate-500">/</span> {totalDuration > 0 ? formatVideoTime(totalDuration) : (detectedDurationLabel || '--:--')}
              </span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 relative shrink-0">
              {/* Playback Speed Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu((prev) => !prev)}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700/60 rounded-lg text-[10px] sm:text-[11px] font-mono text-slate-200 flex items-center gap-0.5 sm:gap-1"
                >
                  <span>{playbackSpeed}x</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showSpeedMenu && (
                  <div className="absolute bottom-full mb-2 right-0 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-1 shadow-2xl flex flex-col gap-0.5 z-40 min-w-[70px]">
                    {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => handleSpeedChange(spd)}
                        className={`px-3 py-1 text-[11px] font-mono rounded-lg text-right transition-colors ${
                          playbackSpeed === spd
                            ? 'bg-emerald-600 text-white font-black'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* High-Visibility Fullscreen Toggle Button */}
              <button
                onClick={toggleFullscreen}
                className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-slate-900/90 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-300 border border-slate-700/60 hover:border-emerald-500/50 transition-all active:scale-95 shadow-sm flex items-center justify-center"
                title="ملء الشاشة (F)"
              >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Hint Overlay */}
      {showKeyboardHints && (
        <div className="p-4 bg-slate-900/95 border border-slate-800 rounded-2xl text-xs text-slate-300 space-y-2 animate-fadeIn shadow-xl">
          <div className="flex items-center justify-between font-black text-white">
            <span className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-emerald-400" />
              اختصارات لوحة المفاتيح للتحكم السلس في المحاضرة:
            </span>
            <button onClick={() => setShowKeyboardHints(false)} className="text-slate-500 hover:text-white">
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
            <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-emerald-400 font-bold">Space / K:</span> تشغيل / إيقاف
            </div>
            <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-emerald-400 font-bold">Right / Left:</span> تقديم / ترجيع 10ث
            </div>
            <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-emerald-400 font-bold">Up / Down:</span> رفع وخفض الصوت
            </div>
            <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-emerald-400 font-bold">M / F:</span> كتم الصوت / ملء الشاشة
            </div>
            <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-emerald-400 font-bold">0 .. 9:</span> القفز إلى 0% حتى 90%
            </div>
            <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-emerald-400 font-bold">B:</span> إضافة ملاحظة عند الدقيقة
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {noteSuccessToast && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-2xl flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>تم حفظ الملاحظة وعلامة المراجعة بنجاح! يمكنك مراجعتها والقفز إليها في أي وقت.</span>
        </div>
      )}

      {/* Interactive Timestamp Notes & Student Study Cards Section (Pinned Wall Sketches) */}
      <div className="bg-slate-50/70 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-7 space-y-6 shadow-sm relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center border border-amber-500/30 shadow-sm">
              <Pin className="w-6 h-6 rotate-45" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                لوحة الاسكتشات والملاحظات الحائطية 📌 ({notes.length})
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                أوراق واسكتشات مثبتة بدبابيس ذكية — انقر على أي ورقة لتخييرك بين القراءة أو العودة لنقطة الشرح بدقة.
              </p>
            </div>
          </div>

          <button
            onClick={() => handleOpenAddNote()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-2xl shadow-lg transition-all self-start sm:self-auto hover:scale-105 active:scale-95 border border-emerald-400/30"
          >
            <BookmarkPlus className="w-4 h-4" />
            + تثبيت ورقة جديدة عند {formatVideoTime(currentTime)}
          </button>
        </div>

        {/* Pinned Wall Sketches Grid */}
        {notes.length === 0 ? (
          <div className="py-12 text-center bg-white/60 dark:bg-slate-950/60 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-bold space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Pin className="w-6 h-6 rotate-45" />
            </div>
            <p className="text-sm font-black text-slate-700 dark:text-slate-300">لوحة الملاحظات فارغة حالياً</p>
            <p className="text-xs text-slate-500">أثناء سماع المستر، اضغط على زر &quot;تثبيت ورقة جديدة&quot; لتدوين تريكة أو قاعدة مهمة 📌</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-3">
            {notes.map((n, index) => {
              // Rotation class for natural pinned look
              const rotationClass = index % 4 === 0 ? '-rotate-1' : index % 4 === 1 ? 'rotate-1' : index % 4 === 2 ? '-rotate-1.5' : 'rotate-1.5';

              // Paper & Pin Color Themes
              const paperThemes: Record<string, {
                paperBg: string;
                paperBorder: string;
                pinColor: string;
                pinShadow: string;
                badgeBg: string;
                badgeText: string;
                contentBg: string;
              }> = {
                amber: {
                  paperBg: 'bg-[#fffdf5] dark:bg-[#201910]',
                  paperBorder: 'border-amber-300 dark:border-amber-700/60',
                  pinColor: 'bg-amber-500 ring-amber-300',
                  pinShadow: 'shadow-amber-500/50',
                  badgeBg: 'bg-amber-500 text-white',
                  badgeText: 'text-amber-800 dark:text-amber-300',
                  contentBg: 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-900/40',
                },
                emerald: {
                  paperBg: 'bg-[#f6fbf8] dark:bg-[#0e1f18]',
                  paperBorder: 'border-emerald-300 dark:border-emerald-700/60',
                  pinColor: 'bg-emerald-500 ring-emerald-300',
                  pinShadow: 'shadow-emerald-500/50',
                  badgeBg: 'bg-emerald-600 text-white',
                  badgeText: 'text-emerald-800 dark:text-emerald-300',
                  contentBg: 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-900/40',
                },
                rose: {
                  paperBg: 'bg-[#fff7f8] dark:bg-[#241016]',
                  paperBorder: 'border-rose-300 dark:border-rose-700/60',
                  pinColor: 'bg-rose-500 ring-rose-300',
                  pinShadow: 'shadow-rose-500/50',
                  badgeBg: 'bg-rose-600 text-white',
                  badgeText: 'text-rose-800 dark:text-rose-300',
                  contentBg: 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-900/40',
                },
                blue: {
                  paperBg: 'bg-[#f6faff] dark:bg-[#0f1b29]',
                  paperBorder: 'border-sky-300 dark:border-sky-700/60',
                  pinColor: 'bg-sky-500 ring-sky-300',
                  pinShadow: 'shadow-sky-500/50',
                  badgeBg: 'bg-sky-600 text-white',
                  badgeText: 'text-sky-800 dark:text-sky-300',
                  contentBg: 'bg-sky-50/60 dark:bg-sky-950/40 border-sky-200/60 dark:border-sky-900/40',
                },
                purple: {
                  paperBg: 'bg-[#faf6ff] dark:bg-[#1d1026]',
                  paperBorder: 'border-purple-300 dark:border-purple-700/60',
                  pinColor: 'bg-purple-500 ring-purple-300',
                  pinShadow: 'shadow-purple-500/50',
                  badgeBg: 'bg-purple-600 text-white',
                  badgeText: 'text-purple-800 dark:text-purple-300',
                  contentBg: 'bg-purple-50/60 dark:bg-purple-950/40 border-purple-200/60 dark:border-purple-900/40',
                },
              };

              const theme = paperThemes[n.color] || paperThemes.amber;

              const tagLabels: Record<string, string> = {
                important: 'قاعدة هامة 💡',
                exam_tip: 'سؤال متوقع 🎯',
                grammar_rule: 'شرح جرامر 📝',
                review_later: 'مراجعة لاحقة ⏳',
                general: 'ملاحظة عامة 📌',
              };

              return (
                <div
                  key={n.id}
                  onClick={() => handleNoteCardClick(n)}
                  className={`relative p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer group flex flex-col justify-between space-y-3.5 shadow-lg hover:shadow-2xl hover:rotate-0 hover:scale-[1.03] hover:z-20 ${rotationClass} ${theme.paperBg} ${theme.paperBorder}`}
                >
                  {/* 3D Realistic Pushpin At Top Center */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                    <div className={`w-6 h-6 rounded-full ${theme.pinColor} ring-2 shadow-lg ${theme.pinShadow} flex items-center justify-center border-2 border-white dark:border-slate-900 relative`}>
                      {/* Pushpin Metallic Highlight */}
                      <div className="w-1.5 h-1.5 rounded-full bg-white/90 absolute top-1 left-1" />
                    </div>
                  </div>

                  {/* Tape / Timestamp Header */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2.5 py-0.5 rounded-md font-mono font-black text-xs shadow-sm flex items-center gap-1 ${theme.badgeBg}`}>
                          <span>📌</span>
                          <span>{n.timestampFormatted}</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                          {tagLabels[n.tag] || 'ملاحظة'}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(n.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-500/10"
                        title="إزالة الورقة من الحائط"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h5 className="font-black text-sm text-slate-900 dark:text-white leading-snug">
                      {n.title}
                    </h5>

                    {n.content && (
                      <div className={`text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed p-3 rounded-xl border ${theme.contentBg} shadow-inner`}>
                        {n.content}
                      </div>
                    )}
                  </div>

                  {/* Paper Footer with Interactive Quick Actions */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEnlargedNote(n);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/90 dark:bg-slate-900/90 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all shadow-xs"
                      title="تكبير الملاحظة وقراءتها بحجم شاشة كامل"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>تكبير الورقة</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        seekToExact(n.timestampSeconds);
                        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 transition-all shadow-xs"
                      title={`انتقال للشرح عند ${n.timestampFormatted}`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>انتقال ({n.timestampFormatted})</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Enlarged Note Fullscreen / Zoom Modal */}
      {enlargedNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div 
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border-2 rounded-3xl shadow-2xl overflow-hidden my-auto space-y-5 p-6 sm:p-8"
            style={{
              borderColor: enlargedNote.color === 'emerald' ? '#10b981' :
                           enlargedNote.color === 'rose' ? '#f43f5e' :
                           enlargedNote.color === 'blue' ? '#0ea5e9' :
                           enlargedNote.color === 'purple' ? '#a855f7' : '#f59e0b'
            }}
          >
            {/* 3D Pushpin Graphic */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="w-8 h-8 rounded-full bg-emerald-500 ring-4 ring-emerald-200 dark:ring-emerald-900 shadow-xl flex items-center justify-center border-2 border-white relative">
                <div className="w-2 h-2 rounded-full bg-white absolute top-1.5 left-1.5" />
              </div>
            </div>

            {/* Modal Header Bar with Zoom & Action Controls */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 pt-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-black text-sm rounded-xl border border-emerald-500/20 flex items-center gap-1.5">
                  <Bookmark className="w-4 h-4" />
                  <span>{enlargedNote.timestampFormatted}</span>
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {enlargedNote.tag === 'important' ? 'قاعدة هامة 💡' :
                   enlargedNote.tag === 'exam_tip' ? 'سؤال متوقع 🎯' :
                   enlargedNote.tag === 'grammar_rule' ? 'شرح جرامر 📝' :
                   enlargedNote.tag === 'review_later' ? 'مراجعة لاحقة ⏳' : 'ملاحظة عامة 📌'}
                </span>
              </div>

              {/* Controls: Zoom In, Zoom Out, Copy, Audio Read, Close */}
              <div className="flex items-center gap-1.5">
                {/* Zoom Out Button */}
                <button
                  type="button"
                  onClick={() => setNoteZoomScale((prev) => Math.max(0.85, prev - 0.15))}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="تصغير حجم الخط"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                {/* Zoom Indicator */}
                <span className="text-xs font-mono font-bold px-2 text-slate-500">
                  {Math.round(noteZoomScale * 100)}%
                </span>

                {/* Zoom In Button */}
                <button
                  type="button"
                  onClick={() => setNoteZoomScale((prev) => Math.min(2.0, prev + 0.15))}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="تكبير حجم الخط"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                {/* Copy Text Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== 'undefined') {
                      navigator.clipboard.writeText(`${enlargedNote.title}\n\n${enlargedNote.content || ''}`);
                      setCopyToast(true);
                      setTimeout(() => setCopyToast(false), 2500);
                    }
                  }}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="نسخ نص الملاحظة"
                >
                  <Copy className="w-4 h-4" />
                </button>

                {/* Read Aloud TTS */}
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                      window.speechSynthesis.cancel();
                      const textToRead = `${enlargedNote.title}. ${enlargedNote.content || ''}`;
                      const utterance = new SpeechSynthesisUtterance(textToRead);
                      utterance.lang = 'ar-EG';
                      window.speechSynthesis.speak(utterance);
                    }
                  }}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="قراءة الملاحظة صوتياً"
                >
                  <SpeakerIcon className="w-4 h-4 text-emerald-500" />
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => {
                    setEnlargedNote(null);
                    setNoteZoomScale(1);
                    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                      window.speechSynthesis.cancel();
                    }
                  }}
                  className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors ml-1"
                  title="إغلاق نافذة التكبير"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Copy Notification Toast */}
            {copyToast && (
              <div className="p-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs text-center flex items-center justify-center gap-2 animate-fadeIn">
                <Check className="w-4 h-4" />
                <span>تم نسخ نص الملاحظة إلى الحافظة بنجاح!</span>
              </div>
            )}

            {/* Enlarged Note Paper Content Body */}
            <div 
              className="space-y-4 p-6 rounded-2xl bg-amber-50/40 dark:bg-slate-950/60 border border-amber-200/60 dark:border-slate-800 transition-transform origin-top"
              style={{ fontSize: `${16 * noteZoomScale}px` }}
            >
              <h3 className="font-black text-slate-900 dark:text-white leading-snug border-b border-slate-200 dark:border-slate-800 pb-3">
                {enlargedNote.title}
              </h3>

              {enlargedNote.content ? (
                <p className="font-medium text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {enlargedNote.content}
                </p>
              ) : (
                <p className="italic text-slate-400 text-sm">
                  لا توجد تفاصيل إضافية مكتوبة في هذه الملاحظة.
                </p>
              )}
            </div>

            {/* Enlarged Modal Action Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-400 font-mono">
                تاريخ التدوين: {new Date(enlargedNote.createdAt).toLocaleString('ar-EG')}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEnlargedNote(null);
                    setNoteZoomScale(1);
                  }}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                >
                  إغلاق
                </button>

                <button
                  type="button"
                  onClick={() => {
                    seekToExact(enlargedNote.timestampSeconds);
                    setEnlargedNote(null);
                    setNoteZoomScale(1);
                    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>تشغيل الفيديو عند [{enlargedNote.timestampFormatted}]</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Note Action / Jump Prompt Modal */}
      {jumpNotePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-mono font-bold text-xs">
                  {jumpNotePrompt.timestampFormatted}
                </span>
                <h4 className="text-base font-black text-slate-900 dark:text-white truncate">
                  {jumpNotePrompt.title}
                </h4>
              </div>
              <button onClick={() => setJumpNotePrompt(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {jumpNotePrompt.content && (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                {jumpNotePrompt.content}
              </div>
            )}

            <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl text-xs text-amber-700 dark:text-amber-400 font-bold flex items-center gap-2">
              <Compass className="w-4 h-4 shrink-0" />
              <span>هل تريد القفز بالفيديو فوراً لنقطة الشرح عند الدقيقة [{jumpNotePrompt.timestampFormatted}]؟</span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setJumpNotePrompt(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors"
              >
                قراءة فقط (البقاء هنا)
              </button>
              <button
                type="button"
                onClick={handleConfirmJump}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>نعم، انتقل للشرح الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Timestamp Note */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BookmarkPlus className="w-5 h-5 text-emerald-600" />
                تدوين بطاقة عند الدقيقة [{formatVideoTime(noteTimestamp)}]
              </h4>
              <button onClick={() => setIsNoteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNoteSubmit} className="space-y-3.5">
              {/* Note Tag Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  نوع البطاقة والتصنيف
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'important', label: 'قاعدة هامة' },
                    { id: 'exam_tip', label: 'سؤال متوقع' },
                    { id: 'grammar_rule', label: 'شرح جرامر' },
                    { id: 'review_later', label: 'مراجعة لاحقة' },
                    { id: 'general', label: 'ملاحظة عامة' },
                  ].map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setNoteTag(t.id as any)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                        noteTag === t.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Theme Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  لون البطاقة المميز
                </label>
                <div className="flex items-center gap-2">
                  {[
                    { id: 'amber', bg: 'bg-amber-500', name: 'أصفر كهرماني' },
                    { id: 'emerald', bg: 'bg-emerald-500', name: 'أخضر زمردي' },
                    { id: 'rose', bg: 'bg-rose-500', name: 'وردي ياقوتي' },
                    { id: 'blue', bg: 'bg-blue-500', name: 'أزرق سماوي' },
                    { id: 'purple', bg: 'bg-purple-500', name: 'بنفسجي ملكي' },
                  ].map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setSelectedColor(c.id)}
                      className={`w-7 h-7 rounded-xl ${c.bg} transition-transform flex items-center justify-center ${
                        selectedColor === c.id ? 'scale-125 ring-2 ring-slate-900 dark:ring-white shadow-md' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={c.name}
                    >
                      {selectedColor === c.id && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان الفكرة / الملاحظة <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الفرق بين Since و For"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تفاصيل الشرح (اختياري)
                </label>
                <textarea
                  rows={3}
                  placeholder="اكتب التوضيح أو ملخص القاعدة لتتذكره دائماً..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md"
                >
                  حفظ البطاقة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
