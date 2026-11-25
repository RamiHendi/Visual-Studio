const VISITOR_ID_STORAGE_KEY = 'rami_hendi_visual_studio_visitor_id_v2';
const VISITOR_REPORTED_AT_KEY = 'rami_hendi_visual_studio_visit_reported_v2';
const LEGACY_VISITOR_SESSION_KEY = 'rami_hendi_visual_studio_visitor_hash_v1';
const VISIT_REPORT_COOLDOWN_MS = 12 * 60 * 60 * 1000;

function generateRandomVisitorToken(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(12);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    void 0;
  }

  let token = '';
  for (let i = 0; i < 24; i++) {
    token += Math.floor(Math.random() * 16).toString(16);
  }
  return token;
}

function getOrCreateVisitorToken(): string {
  try {
    sessionStorage.removeItem(LEGACY_VISITOR_SESSION_KEY);
  } catch {
    void 0;
  }

  try {
    const existing = localStorage.getItem(VISITOR_ID_STORAGE_KEY);
    if (existing && /^[a-f0-9]{16,32}$/i.test(existing)) {
      return existing.toLowerCase();
    }
  } catch {
    void 0;
  }

  const created = generateRandomVisitorToken();
  try {
    localStorage.setItem(VISITOR_ID_STORAGE_KEY, created);
  } catch {
    void 0;
  }
  return created;
}

export function getAnonymousVisitorPing(): { token: string; shouldReport: boolean } {
  const token = getOrCreateVisitorToken();

  try {
    const lastRaw = localStorage.getItem(VISITOR_REPORTED_AT_KEY);
    if (lastRaw) {
      const lastTs = Number(lastRaw);
      if (Number.isFinite(lastTs) && Date.now() - lastTs < VISIT_REPORT_COOLDOWN_MS) {
        return { token, shouldReport: false };
      }
    }
  } catch {
    void 0;
  }

  return { token, shouldReport: true };
}

export function markAnonymousVisitReported(): void {
  try {
    localStorage.setItem(VISITOR_REPORTED_AT_KEY, String(Date.now()));
  } catch {
    void 0;
  }
}
