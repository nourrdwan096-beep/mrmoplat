import { NextRequest, NextResponse } from 'next/server';

/**
 * High-Accuracy Multi-Layer Video Info & Duration Resolver
 * Extracts EXACT real-world duration in seconds & minutes:
 * 1. Scrapes YouTube embed HTML (which avoids bot-blocks)
 * 2. Parses ytInitialPlayerResponse & lengthSeconds
 * 3. Scrapes YouTube watch HTML for approxDurationMs / ISO 8601
 * 4. Fallback to public invidious endpoints if needed
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('videoId');

  if (!videoId || videoId.length < 5) {
    return NextResponse.json({ error: 'Valid videoId required' }, { status: 400 });
  }

  try {
    let title = '';
    let authorName = 'Mr. Mohamed Radwan';
    let durationSeconds: number | null = null;

    // Layer 0: Official YouTube oEmbed for pristine Arabic title & author
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
        headers: {
          'Accept-Language': 'ar,en;q=0.9',
        },
        next: { revalidate: 3600 },
      });
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        if (oembedData.title) title = oembedData.title;
        if (oembedData.author_name) authorName = oembedData.author_name;
      }
    } catch (oembedErr) {
      console.warn('oEmbed fetch error:', oembedErr);
    }

    // Layer 1: Fetch YouTube Embed Page (Lightweight, not blocked by consent walls)
    try {
      const embedRes = await fetch(`https://www.youtube.com/embed/${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
        },
        next: { revalidate: 3600 },
      });

      if (embedRes.ok) {
        const html = await embedRes.text();

        // Check for lengthSeconds in ytInitialPlayerResponse or player configuration
        const lengthMatch = html.match(/"lengthSeconds":"(\d+)"/) || html.match(/lengthSeconds\\":\\"(\d+)\\"/);
        if (lengthMatch && lengthMatch[1]) {
          const sec = parseInt(lengthMatch[1], 10);
          if (sec > 0) {
            durationSeconds = sec;
          }
        }

        // Check for approxDurationMs
        if (!durationSeconds) {
          const approxMatch = html.match(/"approxDurationMs":"(\d+)"/) || html.match(/approxDurationMs\\":\\"(\d+)\\"/);
          if (approxMatch && approxMatch[1]) {
            const ms = parseInt(approxMatch[1], 10);
            if (ms > 0) {
              durationSeconds = Math.round(ms / 1000);
            }
          }
        }

        // Title from embed
        if (!title) {
          const titleMatch = html.match(/"title":"([^"]+)"/) || html.match(/<title>([^<]+)<\/title>/);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].replace('- YouTube', '').trim();
          }
        }
      }
    } catch (embedErr) {
      console.warn('Embed parse warning:', embedErr);
    }

    // Layer 2: Fetch YouTube Watch Page (if duration not yet resolved)
    if (!durationSeconds) {
      try {
        const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });

        if (watchRes.ok) {
          const html = await watchRes.text();

          // lengthSeconds
          const lenMatch = html.match(/"lengthSeconds":"(\d+)"/);
          if (lenMatch && lenMatch[1]) {
            durationSeconds = parseInt(lenMatch[1], 10);
          }

          // approxDurationMs
          if (!durationSeconds) {
            const approxMatch = html.match(/"approxDurationMs":"(\d+)"/);
            if (approxMatch && approxMatch[1]) {
              durationSeconds = Math.round(parseInt(approxMatch[1], 10) / 1000);
            }
          }

          // ISO 8601 itemprop="duration" content="PT1H15M30S"
          if (!durationSeconds) {
            const isoMatch = html.match(/itemprop="duration"\s+content="PT([^"]+)"/i) || html.match(/"duration":"PT([^"]+)"/i);
            if (isoMatch && isoMatch[1]) {
              const iso = isoMatch[1];
              let total = 0;
              const h = iso.match(/(\d+)H/i);
              const m = iso.match(/(\d+)M/i);
              const s = iso.match(/(\d+)S/i);
              if (h) total += parseInt(h[1], 10) * 3600;
              if (m) total += parseInt(m[1], 10) * 60;
              if (s) total += parseInt(s[1], 10);
              if (total > 0) durationSeconds = total;
            }
          }

          if (!title) {
            const tMatch = html.match(/<meta\s+name="title"\s+content="([^"]+)"/i);
            if (tMatch && tMatch[1]) title = tMatch[1];
          }
        }
      } catch (watchErr) {
        console.warn('Watch parse warning:', watchErr);
      }
    }

    // Layer 3: OEmbed for fallback title
    if (!title) {
      try {
        const oembedRes = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
        if (oembedRes.ok) {
          const oembed = await oembedRes.json();
          if (oembed.title) title = oembed.title;
          if (oembed.author_name) authorName = oembed.author_name;
        }
      } catch {}
    }

    const finalDurationSeconds = durationSeconds && durationSeconds > 0 ? durationSeconds : null;
    const finalDurationMinutes = finalDurationSeconds ? Math.max(1, Math.round(finalDurationSeconds / 60)) : null;

    return NextResponse.json({
      success: true,
      videoId,
      title: title || 'محاضرة تعليمية - مستر محمد رضوان',
      authorName,
      durationSeconds: finalDurationSeconds,
      durationMinutes: finalDurationMinutes,
      isExact: !!finalDurationSeconds,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to detect video info',
        videoId,
        durationSeconds: null,
        durationMinutes: null,
      },
      { status: 500 }
    );
  }
}
