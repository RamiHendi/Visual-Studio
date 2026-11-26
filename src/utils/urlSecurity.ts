import { StudioData } from '../types';

const TRUSTED_EMBED_HOSTS = new Set([
  'drive.google.com',
  'docs.google.com',
  'www.youtube.com',
  'youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
  'player.vimeo.com',
]);

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function sanitizeHttpsUrl(raw?: string | null): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return '';
    if (parsed.username || parsed.password) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

export function sanitizeAppsScriptUrl(raw?: string | null): string {
  const safeUrl = sanitizeHttpsUrl(raw);
  if (!safeUrl) return '';
  try {
    const parsed = new URL(safeUrl);
    if (
      parsed.hostname.toLowerCase() === 'script.google.com' &&
      parsed.pathname.startsWith('/macros/s/')
    ) {
      return parsed.toString();
    }
    return '';
  } catch {
    return '';
  }
}

export function extractYouTubeVideoId(raw?: string | null): string | null {
  const safeUrl = sanitizeHttpsUrl(raw);
  if (!safeUrl) return null;
  try {
    const parsed = new URL(safeUrl);
    const host = parsed.hostname.toLowerCase();
    let candidate = '';

    if (host === 'youtu.be') {
      candidate = parsed.pathname.replace(/^\/+/, '').split('/')[0] || '';
    } else if (
      host === 'www.youtube.com' ||
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'www.youtube-nocookie.com' ||
      host === 'youtube-nocookie.com'
    ) {
      if (parsed.pathname === '/watch') {
        candidate = parsed.searchParams.get('v') || '';
      } else {
        const match = parsed.pathname.match(/^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})(?:\/|$)/);
        if (match) candidate = match[1];
      }
    }

    return YOUTUBE_ID_RE.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function getYouTubeFallbackThumbUrl(src?: string | null): string | null {
  const trimmed = (src || '').trim();
  const match = trimmed.match(
    /^https:\/\/(?:i|img)\.ytimg\.com\/vi\/([A-Za-z0-9_-]{11})\/maxresdefault\.jpg$/i
  );
  if (!match) return null;
  return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
}

export function sanitizeVideoEmbedUrl(raw?: string | null): string {
  const ytId = extractYouTubeVideoId(raw);
  if (ytId) {
    return `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1`;
  }

  const safeUrl = sanitizeHttpsUrl(raw);
  if (!safeUrl) return '';
  try {
    const parsed = new URL(safeUrl);
    if (TRUSTED_EMBED_HOSTS.has(parsed.hostname.toLowerCase())) {
      return parsed.toString();
    }
    return '';
  } catch {
    return '';
  }
}

export function sanitizeMediaImageUrl(raw?: string | null): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('./assets/') && !trimmed.includes('..')) {
    return trimmed;
  }
  return sanitizeHttpsUrl(trimmed);
}

export function sanitizeStudioData(data: StudioData): StudioData {
  return {
    ...data,
    cvPdfUrl: sanitizeHttpsUrl(data.cvPdfUrl),
    cv: Array.isArray(data.cv) ? data.cv : [],
    portfolio: Array.isArray(data.portfolio)
      ? data.portfolio.map((cat) => ({
          ...cat,
          items: Array.isArray(cat.items)
            ? cat.items.map((item) => ({
                ...item,
                thumbUrl: sanitizeMediaImageUrl(item.thumbUrl),
                fullUrl: item.fullUrl ? sanitizeMediaImageUrl(item.fullUrl) : undefined,
                embedUrl: item.embedUrl ? sanitizeVideoEmbedUrl(item.embedUrl) : undefined,
              }))
            : undefined,
          projects: Array.isArray(cat.projects)
            ? cat.projects.map((proj) => ({
                ...proj,
                coverUrl: sanitizeMediaImageUrl(proj.coverUrl),
                items: Array.isArray(proj.items)
                  ? proj.items.map((item) => ({
                      ...item,
                      thumbUrl: sanitizeMediaImageUrl(item.thumbUrl),
                      fullUrl: item.fullUrl ? sanitizeMediaImageUrl(item.fullUrl) : undefined,
                      embedUrl: item.embedUrl ? sanitizeVideoEmbedUrl(item.embedUrl) : undefined,
                    }))
                  : [],
              }))
            : undefined,
        }))
      : [],
  };
}
