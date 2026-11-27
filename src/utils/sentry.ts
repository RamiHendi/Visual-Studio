import type { ErrorInfo } from 'react';
import * as Sentry from '@sentry/react';

let sentryInitialized = false;

function isValidHttpsDsn(dsn: string): boolean {
  try {
    const parsed = new URL(dsn);
    return parsed.protocol === 'https:' && Boolean(parsed.username);
  } catch {
    return false;
  }
}

function parseSampleRate(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

function scrubSensitiveQueryParams(rawUrl?: string): string | undefined {
  if (!rawUrl) return rawUrl;
  try {
    const parsed = new URL(rawUrl, window.location.origin);
    parsed.searchParams.delete('ip');
    parsed.searchParams.delete('visitor');
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

export function isSentryEnabled(): boolean {
  return sentryInitialized;
}

export function initSentry(): boolean {
  if (sentryInitialized) return true;

  const dsn = String(import.meta.env.VITE_SENTRY_DSN || '').trim();
  const allowInDev = String(import.meta.env.VITE_SENTRY_ENABLE_DEV || '').trim().toLowerCase() === 'true';

  if (!dsn || !isValidHttpsDsn(dsn)) {
    return false;
  }

  if (!import.meta.env.PROD && !allowInDev) {
    return false;
  }

  const environment =
    String(import.meta.env.VITE_SENTRY_ENVIRONMENT || '').trim() ||
    (import.meta.env.PROD ? 'production' : import.meta.env.MODE);
  const release =
    String(import.meta.env.VITE_SENTRY_RELEASE || '').trim() ||
    'rami-hendi-visual-studio@1.0.0';
  const tracesSampleRate = parseSampleRate(
    import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE,
    0.1
  );

  Sentry.init({
    dsn,
    environment,
    release,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate,
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications.',
      'Non-Error promise rejection captured',
      /^AbortError\b/i,
      /The operation was aborted/i,
    ],
    denyUrls: [
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
      /^safari-extension:\/\//i,
      /^safari-web-extension:\/\//i,
    ],
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data && typeof breadcrumb.data.url === 'string') {
        return {
          ...breadcrumb,
          data: {
            ...breadcrumb.data,
            url: scrubSensitiveQueryParams(breadcrumb.data.url),
          },
        };
      }
      return breadcrumb;
    },
    beforeSend(event) {
      if (event.request?.url) {
        event.request.url = scrubSensitiveQueryParams(event.request.url);
      }
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });

  sentryInitialized = true;
  return true;
}

export function captureRuntimeError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (!sentryInitialized) return;
  if (context) {
    Sentry.withScope((scope) => {
      scope.setContext('studio', context);
      Sentry.captureException(error);
    });
    return;
  }
  Sentry.captureException(error);
}

export function captureComponentError(
  error: Error,
  errorInfo: ErrorInfo
): void {
  if (!sentryInitialized) return;
  Sentry.captureReactException(error, errorInfo);
}

export function getReactRootErrorCallbacks(): {
  onUncaughtError?: (error: unknown, errorInfo: ErrorInfo) => void;
  onCaughtError?: (error: unknown, errorInfo: ErrorInfo) => void;
  onRecoverableError?: (error: unknown, errorInfo: ErrorInfo) => void;
} {
  if (!sentryInitialized) return {};
  return {
    onUncaughtError: Sentry.reactErrorHandler(),
    onCaughtError: Sentry.reactErrorHandler(),
    onRecoverableError: Sentry.reactErrorHandler(),
  };
}
