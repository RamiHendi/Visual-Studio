import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxVzW2yRCNDbPAlNW95B0MTbD2mD6ZXaGGBnMyVIPyj1n9Jgf_ho7RLWI_H5Badu4g/exec';

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
const FETCH_TIMEOUT_MS = 55000;

function sanitizeHttpsUrl(raw) {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function extractYouTubeVideoId(raw) {
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

function sanitizeVideoEmbedUrl(raw) {
  const ytId = extractYouTubeVideoId(raw);
  if (ytId) {
    return `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1`;
  }
  const safeUrl = sanitizeHttpsUrl(raw);
  if (!safeUrl) return '';
  try {
    const parsed = new URL(safeUrl);
    return TRUSTED_EMBED_HOSTS.has(parsed.hostname.toLowerCase()) ? parsed.toString() : '';
  } catch {
    return '';
  }
}

function sanitizeMediaImageUrl(raw) {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) return '';
  if (trimmed.startsWith('./assets/') && !trimmed.includes('..')) return trimmed;
  return sanitizeHttpsUrl(trimmed);
}

function isValidLivePayload(data) {
  if (!data || typeof data !== 'object') return false;
  if (!Array.isArray(data.portfolio) || data.portfolio.length === 0) return false;
  const hasDemoItems = data.portfolio.some((cat) =>
    (cat.items || []).some((item) => typeof item.id === 'string' && item.id.startsWith('demo-'))
  );
  return !hasDemoItems;
}

function redactCvContactPii(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '__PROTECTED_EMAIL__')
    .replace(/\+?\d[\d\s\-()]{8,}\d/g, '__PROTECTED_PHONE__');
}

function sanitizeVersionToken(raw) {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 128) return undefined;
  return /^[A-Za-z0-9._:-]+$/.test(trimmed) ? trimmed : undefined;
}

function compactItem(item) {
  const type = item?.type === 'video' ? 'video' : 'image';
  const thumbUrl = sanitizeMediaImageUrl(item?.thumbUrl);
  const fullUrl = item?.fullUrl ? sanitizeMediaImageUrl(item.fullUrl) : '';
  const embedUrl = item?.embedUrl ? sanitizeVideoEmbedUrl(item.embedUrl) : '';
  const description = typeof item?.description === 'string' ? item.description.trim() : '';

  const out = {
    id: item?.id || '',
    title: item?.title || '',
    type,
    thumbUrl,
  };
  if (description) out.description = description;
  if (item?.featured === true) out.featured = true;
  if (fullUrl && fullUrl !== thumbUrl) out.fullUrl = fullUrl;
  if (embedUrl) out.embedUrl = embedUrl;
  if (item?.projectId) out.projectId = item.projectId;
  if (item?.projectName) out.projectName = item.projectName;
  return out;
}

function compactProject(proj) {
  const items = Array.isArray(proj?.items)
    ? proj.items.map((item) => compactItem(item))
    : [];
  const coverUrl = sanitizeMediaImageUrl(proj?.coverUrl);
  const firstThumb =
    items.find((i) => i.type === 'image' && i.thumbUrl)?.thumbUrl ||
    items.find((i) => i.thumbUrl)?.thumbUrl ||
    '';
  const description = typeof proj?.description === 'string' ? proj.description.trim() : '';
  const out = {
    id: proj?.id || '',
    name: proj?.name || '',
    items,
  };
  if (proj?.rawOrder) out.rawOrder = proj.rawOrder;
  if (description) out.description = description;
  if (proj?.featured === true) out.featured = true;
  if (coverUrl && coverUrl !== firstThumb) out.coverUrl = coverUrl;
  return out;
}

function sanitizePayload(data) {
  const clean = {
    studioName: typeof data.studioName === 'string' ? data.studioName : "Rami Hendi's Visual Studio",
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
    cvPdfUrl: sanitizeHttpsUrl(data.cvPdfUrl),
    cv: Array.isArray(data.cv)
      ? data.cv.map((el) => ({
          kind: el?.kind === 'bullet' ? 'bullet' : 'paragraph',
          heading: el?.heading || 'NORMAL',
          text: redactCvContactPii(el?.text),
        }))
      : [],
    portfolio: data.portfolio.map((cat) => {
      const entry = {
        rawOrder: cat.rawOrder || cat.category,
        category: cat.category,
      };
      if (Array.isArray(cat.projects) && cat.projects.length > 0) {
        entry.projects = cat.projects.map((proj) => compactProject(proj));
      }
      if (Array.isArray(cat.items) && cat.items.length > 0) {
        entry.items = cat.items.map((item) => compactItem(item));
      }
      return entry;
    }),
  };
  const version = sanitizeVersionToken(data.version);
  if (version) clean.version = version;
  if (typeof data.visitorCount === 'number' && Number.isFinite(data.visitorCount)) {
    clean.visitorCount = data.visitorCount;
  }
  return clean;
}

async function run() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outPath = path.resolve(__dirname, '../public/studio-snapshot.json');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const target = new URL(APPS_SCRIPT_URL);
    target.searchParams.set('_ts', String(Date.now()));
    const response = await fetch(target.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const raw = await response.json();
    if (!isValidLivePayload(raw)) {
      throw new Error('Invalid or empty live portfolio payload');
    }

    const clean = sanitizePayload(raw);
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, JSON.stringify(clean), 'utf8');
    console.log(`Snapshot updated (${clean.portfolio.length} categories).`);
  } catch (err) {
    try {
      await access(outPath);
      console.warn(`Snapshot refresh skipped (${err?.message || 'error'}); keeping existing snapshot.`);
    } catch {
      console.warn(`Snapshot refresh skipped (${err?.message || 'error'}); no prior snapshot present.`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

run();
