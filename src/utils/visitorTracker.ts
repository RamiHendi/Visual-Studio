const VISITOR_HASH_SESSION_KEY = 'rami_hendi_visual_studio_visitor_hash_v1';

const PUBLIC_IP_ENDPOINTS = [
  'https://api.ipify.org?format=json',
  'https://api64.ipify.org?format=json',
  'https://api.seeip.org/jsonip',
];

async function fetchPublicIpWithTimeout(url: string, timeoutMs = 4000): Promise<string | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ip?: unknown };
    if (typeof data?.ip === 'string' && data.ip.trim().length > 0) {
      return data.ip.trim();
    }
    return null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

async function resolvePublicIp(): Promise<string | null> {
  for (const endpoint of PUBLIC_IP_ENDPOINTS) {
    const ip = await fetchPublicIpWithTimeout(endpoint);
    if (ip) return ip;
  }
  return null;
}

function fallbackHashHex(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + i;
    h2 = Math.imul(h2, 0x01000193);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

async function hashPublicIp(ip: string): Promise<string> {
  const normalized = `rhvs-ip::${ip.toLowerCase().trim()}`;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoded = new TextEncoder().encode(normalized);
      const digest = await crypto.subtle.digest('SHA-256', encoded);
      const bytes = Array.from(new Uint8Array(digest));
      return bytes
        .slice(0, 8)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    return fallbackHashHex(normalized);
  }
  return fallbackHashHex(normalized);
}

export async function getUniqueVisitorIpHash(): Promise<string | null> {
  try {
    const cached = sessionStorage.getItem(VISITOR_HASH_SESSION_KEY);
    if (cached && /^[a-f0-9]{16}$/i.test(cached)) {
      return cached;
    }
  } catch {
    void 0;
  }

  const publicIp = await resolvePublicIp();
  if (!publicIp) return null;

  const hash = await hashPublicIp(publicIp);
  try {
    sessionStorage.setItem(VISITOR_HASH_SESSION_KEY, hash);
  } catch {
    void 0;
  }
  return hash;
}
