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

// Convert an external image URL to Base64 via Canvas to preserve it permanently offline
export async function downloadImageAsBase64(url: string): Promise<string | undefined> {
  try {
    return await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas context no disponible'));
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('No se pudo cargar la imagen remota'));
      img.src = url;
    });
  } catch (err) {
    console.warn('No se pudo convertir la miniatura a Base64 directamente (CORS):', err);
    return undefined;
  }
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

      // Fetch public oEmbed data for title and author (YouTube supports oEmbed without API key)
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const res = await fetch(oembedUrl);
        if (res.ok) {
          const data = await res.json();
          result.title = data.title;
          result.author = data.author_name;
        }
      } catch (err) {
        console.warn('oEmbed de YouTube no disponible directamente en navegador:', err);
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
