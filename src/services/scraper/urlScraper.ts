import type { OriginType } from '../../types/recipe';

export interface ScrapedUrlMetadata {
  platform: OriginType;
  canonicalUrl: string;
  title?: string;
  author?: string;
  thumbnailUrl?: string;
  thumbnailBase64?: string;
  videoId?: string;
}

// Convert an external image URL to Base64 via Canvas with a strict timeout to avoid blocking
export async function downloadImageAsBase64(url: string, timeoutMs = 2500): Promise<string | undefined> {
  return new Promise<string | undefined>((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(undefined);
      }
    }, timeoutMs);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(undefined);
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } catch {
          resolve(undefined);
        }
      };
      img.onerror = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        resolve(undefined);
      };
      img.src = url;
    } catch {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(undefined);
      }
    }
  });
}

export function detectPlatform(url: string): OriginType {
  const u = url.toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('tiktok.com')) return 'tiktok';
  return 'web';
}

export function extractYouTubeId(url: string): string | null {
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

export async function scrapeUrlMetadata(inputUrl: string): Promise<ScrapedUrlMetadata> {
  const cleanUrl = inputUrl.trim();
  const platform = detectPlatform(cleanUrl);

  const result: ScrapedUrlMetadata = {
    platform,
    canonicalUrl: cleanUrl,
  };

  if (platform === 'youtube') {
    const videoId = extractYouTubeId(cleanUrl);
    result.videoId = videoId || undefined;

    if (videoId) {
      // YouTube high-resolution thumbnail
      result.thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      
      // Attempt to download thumbnail as local Base64
      const b64 = await downloadImageAsBase64(result.thumbnailUrl);
      if (b64) {
        result.thumbnailBase64 = b64;
      }

      // Fetch public oEmbed data for title and author
      // 1. Try noembed.com first because it supports CORS (Access-Control-Allow-Origin: *) in all browsers
      try {
        const noembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`;
        const res = await fetch(noembedUrl, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const data = await res.json();
          if (data && data.title && !data.error) {
            result.title = data.title;
            result.author = data.author_name;
          }
        }
      } catch (e) {
        console.warn('noembed falló o agotó tiempo de espera, probando oembed directo:', e);
      }

      // 2. Fallback to direct YouTube oembed
      if (!result.title) {
        try {
          const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
          const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(3000) });
          if (res.ok) {
            const data = await res.json();
            result.title = data.title;
            result.author = data.author_name;
          }
        } catch (err) {
          console.warn('oEmbed directo de YouTube no disponible (CORS/timeout):', err);
        }
      }
    }
  } else if (platform === 'instagram') {
    // Basic handle / title extraction from Instagram URL if available
    const handleMatch = cleanUrl.match(/instagram\.com\/([^/?#&]+)/);
    if (handleMatch && !['p', 'reel', 'stories', 'explore'].includes(handleMatch[1])) {
      result.author = '@' + handleMatch[1];
    }
  } else if (platform === 'tiktok') {
    const handleMatch = cleanUrl.match(/tiktok\.com\/@([^/?#&]+)/);
    if (handleMatch) {
      result.author = '@' + handleMatch[1];
    }
  }

  return result;
}
