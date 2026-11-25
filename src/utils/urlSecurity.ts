import { StudioData } from '../types';

const TRUSTED_EMBED_HOSTS = new Set([
  'drive.google.com',
  'docs.google.com',
  'www.youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
]);

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

export function sanitizeVideoEmbedUrl(raw?: string | null): string {
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
