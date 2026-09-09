// =========================================================================
// MR. MOHAMED RADWAN EDUCATION PLATFORM - VIDEO SECURITY & ENCRYPTION ENGINE
// Built with Developer & Designer: NOUR M. EL-SAIED 💚 💚
// =========================================================================

export interface VideoTimestampNote {
  id: string;
  itemId: string;
  courseId?: string;
  timestampSeconds: number;
  timestampFormatted: string;
  title: string;
  content: string;
  tag: 'important' | 'exam_tip' | 'grammar_rule' | 'review_later' | 'general';
  color: string;
  createdAt: string;
}

const STORAGE_NOTES_KEY = 'mradwan_student_video_notes_v1';

/**
 * Extracts a clean YouTube Video ID from any URL format
 */
export function extractCleanVideoId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  
  // Standard ID format (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // URLs (youtube.com, youtu.be, shorts, embeds)
  const patterns = [
    /(?:youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=)([^#&?]*)/,
    /[?&]v=([^&#]*)/,
    /embed\/([^/?#]+)/,
  ];

  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match && match[1] && match[1].length === 11) {
      return match[1];
    }
  }

  return trimmed;
}

/**
 * Multi-layer reversible obfuscation for Video IDs
 * Prevents plain-text discovery in DOM, Network inspection, and DOM scrapers.
 */
export function obfuscateVideoIdentifier(rawId: string, salt: string = 'MR_RADWAN_SECURE_2030'): string {
  if (!rawId) return '';
  try {
    const cleanId = extractCleanVideoId(rawId);
    const combined = `${salt}:${cleanId}:${Date.now() % 1000000}`;
    // Base64 + custom char substitution
    const b64 = btoa(unescape(encodeURIComponent(combined)));
    return 'mrv_' + b64.split('').reverse().join('').replace(/=/g, '_');
  } catch (err) {
    console.error('Obfuscation error:', err);
    return rawId;
  }
}

/**
 * Decrypts / restores obfuscated video ID on the fly in memory
 */
export function deobfuscateVideoIdentifier(obfuscated: string, salt: string = 'MR_RADWAN_SECURE_2030'): string {
  if (!obfuscated) return '';
  if (!obfuscated.startsWith('mrv_')) {
    return extractCleanVideoId(obfuscated);
  }

  try {
    const reversed = obfuscated.replace('mrv_', '').split('').reverse().join('').replace(/_/g, '=');
    const decoded = decodeURIComponent(escape(atob(reversed)));
    const parts = decoded.split(':');
    if (parts.length >= 2 && parts[0] === salt) {
      return parts[1];
    }
    return parts[1] || '';
  } catch (err) {
    console.error('Deobfuscation error:', err);
    return extractCleanVideoId(obfuscated);
  }
}

/**
 * Client-Side YouTube Duration Probe using IFrame API
 * Extracts exact video length in seconds directly from the YouTube Player Engine
 */
export function probeYouTubeDurationClientSide(videoId: string, timeoutMs: number = 6000): Promise<number | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  const cleanId = extractCleanVideoId(videoId);
  if (!cleanId) return Promise.resolve(null);

  return new Promise((resolve) => {
    let resolved = false;
    const probeDivId = `yt_probe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const container = document.createElement('div');
    container.id = probeDivId;
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '1px';
    container.style.height = '1px';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);

    let probePlayer: any = null;

    const cleanup = () => {
      try {
        if (probePlayer && typeof probePlayer.destroy === 'function') {
          probePlayer.destroy();
        }
      } catch {}
      try {
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
        }
      } catch {}
    };

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(null);
      }
    }, timeoutMs);

    const initPlayer = () => {
      try {
        probePlayer = new (window as any).YT.Player(probeDivId, {
          videoId: cleanId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            modestbranding: 1,
          },
          events: {
            onReady: (event: any) => {
              try {
                const dur = event.target.getDuration();
                if (dur && dur > 0 && !resolved) {
                  resolved = true;
                  clearTimeout(timer);
                  const exactSec = Math.round(dur);
                  cleanup();
                  resolve(exactSec);
                }
              } catch {}
            },
            onStateChange: (event: any) => {
              try {
                const dur = event.target.getDuration();
                if (dur && dur > 0 && !resolved) {
                  resolved = true;
                  clearTimeout(timer);
                  const exactSec = Math.round(dur);
                  cleanup();
                  resolve(exactSec);
                }
              } catch {}
            },
            onError: () => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timer);
                cleanup();
                resolve(null);
              }
            }
          }
        });
      } catch (err) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          cleanup();
          resolve(null);
        }
      }
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    } else {
      // Ensure YT script is attached
      if (!document.getElementById('yt-iframe-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const prevOnReady = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (typeof prevOnReady === 'function') prevOnReady();
        initPlayer();
      };
    }
  });
}

/**
 * Automatically fetch YouTube Video details (Title, Duration in Minutes & Seconds) via server endpoint, oEmbed & Client probe
 */
export async function autoFetchVideoDetails(urlOrId: string): Promise<{ title?: string; durationMinutes?: number; durationSeconds?: number; videoId: string; authorName?: string }> {
  const videoId = extractCleanVideoId(urlOrId);
  if (!videoId || videoId.length < 5) {
    return { videoId: urlOrId };
  }

  let title = '';
  let authorName = 'مستر محمد رضوان';
  let durationSeconds: number | undefined = undefined;

  // 1. YouTube Official oEmbed for clean Arabic Title & Author
  try {
    const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (oembedRes.ok) {
      const oembedData = await oembedRes.json();
      if (oembedData.title) title = oembedData.title;
      if (oembedData.author_name) authorName = oembedData.author_name;
    }
  } catch {}

  // 2. Server-side internal API resolver
  try {
    const apiRes = await fetch(`/api/video-info?videoId=${encodeURIComponent(videoId)}`);
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.success) {
        if (data.title && !title) title = data.title;
        if (data.authorName) authorName = data.authorName;
        if (data.durationSeconds && data.durationSeconds > 0) {
          durationSeconds = data.durationSeconds;
        } else if (data.durationMinutes && data.durationMinutes > 0) {
          durationSeconds = data.durationMinutes * 60;
        }
      }
    }
  } catch (err) {
    console.warn('API fetch video info failed, checking probe:', err);
  }

  // 3. Client-Side YouTube Player Probe if duration not resolved yet
  if (!durationSeconds && typeof window !== 'undefined') {
    try {
      const probeSec = await probeYouTubeDurationClientSide(videoId, 4000);
      if (probeSec && probeSec > 0) {
        durationSeconds = probeSec;
      }
    } catch {}
  }

  // 4. Fallback noembed if title still missing
  if (!title) {
    try {
      const oembedUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`;
      const res = await fetch(oembedUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.title) title = data.title;
      }
    } catch {}
  }

  const durationMinutes = durationSeconds ? Math.max(1, Math.round(durationSeconds / 60)) : undefined;

  return {
    videoId,
    title: title || undefined,
    authorName,
    durationSeconds,
    durationMinutes,
  };
}

/**
 * Format seconds into mm:ss or hh:mm:ss
 */
export function formatVideoTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse formatted time string (e.g. "12:35" or "01:12:35") to total seconds
 */
export function parseFormattedTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 2) {
    return (parts[0] * 60) + parts[1];
  }
  if (parts.length === 3) {
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  }
  return 0;
}

// ==========================================
// VIDEO TIMESTAMP NOTES MANAGEMENT
// ==========================================

export function getStudentVideoNotes(itemId: string): VideoTimestampNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_NOTES_KEY);
    if (!raw) return [];
    const allNotes: VideoTimestampNote[] = JSON.parse(raw);
    return allNotes.filter(n => n.itemId === itemId).sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  } catch {
    return [];
  }
}

export function saveStudentVideoNote(note: Omit<VideoTimestampNote, 'id' | 'createdAt'> & { id?: string }): VideoTimestampNote {
  const current = typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem(STORAGE_NOTES_KEY) || '[]') as VideoTimestampNote[]) : [];
  const newNote: VideoTimestampNote = {
    ...note,
    id: note.id || 'vnote_' + Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
  };

  const filtered = current.filter(n => n.id !== newNote.id);
  filtered.push(newNote);

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_NOTES_KEY, JSON.stringify(filtered));
  }
  return newNote;
}

export function deleteStudentVideoNote(noteId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_NOTES_KEY);
    if (!raw) return;
    const allNotes: VideoTimestampNote[] = JSON.parse(raw);
    const filtered = allNotes.filter(n => n.id !== noteId);
    localStorage.setItem(STORAGE_NOTES_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Delete note error:', err);
  }
}
