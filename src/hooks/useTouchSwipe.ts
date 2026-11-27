import React, { useCallback, useEffect, useRef } from 'react';

interface UseTouchSwipeOptions {
  enabled: boolean;
  targetRef: React.RefObject<HTMLElement | null>;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

interface SwipeSession {
  startX: number;
  startY: number;
  startTime: number;
  lastDx: number;
  axis: 'undecided' | 'horizontal' | 'vertical';
}

const AXIS_LOCK_THRESHOLD_PX = 10;
const AXIS_HORIZONTAL_BIAS = 1.15;
const MIN_COMMIT_DISTANCE_PX = 42;
const MAX_COMMIT_DISTANCE_PX = 64;
const FLICK_MIN_DISTANCE_PX = 24;
const FLICK_VELOCITY_PX_PER_MS = 0.35;
const MAX_VISUAL_DRAG_PX = 160;
const SNAP_BACK_MS = 260;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function useTouchSwipe({
  enabled,
  targetRef,
  onSwipeLeft,
  onSwipeRight,
}: UseTouchSwipeOptions) {
  const sessionRef = useRef<SwipeSession | null>(null);
  const didSwipeRef = useRef<boolean>(false);
  const clickGuardTimerRef = useRef<number | null>(null);
  const snapBackTimerRef = useRef<number | null>(null);

  const clearInlineStyles = useCallback(() => {
    const el = targetRef.current;
    if (!el) return;
    el.style.transition = '';
    el.style.transform = '';
    el.style.opacity = '';
    el.style.willChange = '';
  }, [targetRef]);

  const snapBack = useCallback(() => {
    const el = targetRef.current;
    if (!el) return;

    if (snapBackTimerRef.current !== null) {
      window.clearTimeout(snapBackTimerRef.current);
      snapBackTimerRef.current = null;
    }

    if (prefersReducedMotion()) {
      clearInlineStyles();
      return;
    }

    el.style.transition = `transform ${SNAP_BACK_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${SNAP_BACK_MS}ms ease`;
    el.style.transform = 'translate3d(0, 0, 0)';
    el.style.opacity = '1';

    snapBackTimerRef.current = window.setTimeout(() => {
      snapBackTimerRef.current = null;
      clearInlineStyles();
    }, SNAP_BACK_MS + 20);
  }, [clearInlineStyles, targetRef]);

  const armClickGuard = useCallback(() => {
    didSwipeRef.current = true;
    if (clickGuardTimerRef.current !== null) {
      window.clearTimeout(clickGuardTimerRef.current);
    }
    clickGuardTimerRef.current = window.setTimeout(() => {
      didSwipeRef.current = false;
      clickGuardTimerRef.current = null;
    }, 280);
  }, []);

  const resetSwipe = useCallback(() => {
    sessionRef.current = null;
    if (snapBackTimerRef.current !== null) {
      window.clearTimeout(snapBackTimerRef.current);
      snapBackTimerRef.current = null;
    }
    clearInlineStyles();
  }, [clearInlineStyles]);

  useEffect(() => {
    if (!enabled) {
      resetSwipe();
    }
  }, [enabled, resetSwipe]);

  useEffect(() => {
    return () => {
      if (clickGuardTimerRef.current !== null) {
        window.clearTimeout(clickGuardTimerRef.current);
      }
      if (snapBackTimerRef.current !== null) {
        window.clearTimeout(snapBackTimerRef.current);
      }
    };
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (!enabled) return;

      if (e.touches.length !== 1) {
        if (sessionRef.current?.axis === 'horizontal') {
          snapBack();
        }
        sessionRef.current = null;
        return;
      }

      if (snapBackTimerRef.current !== null) {
        window.clearTimeout(snapBackTimerRef.current);
        snapBackTimerRef.current = null;
      }
      clearInlineStyles();

      const touch = e.touches[0];
      sessionRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: performance.now(),
        lastDx: 0,
        axis: 'undecided',
      };
    },
    [enabled, clearInlineStyles, snapBack]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      const session = sessionRef.current;
      if (!enabled || !session) return;

      if (e.touches.length !== 1) {
        if (session.axis === 'horizontal') {
          snapBack();
        }
        sessionRef.current = null;
        return;
      }

      const touch = e.touches[0];
      const dx = touch.clientX - session.startX;
      const dy = touch.clientY - session.startY;
      session.lastDx = dx;

      if (session.axis === 'undecided') {
        if (
          Math.abs(dx) < AXIS_LOCK_THRESHOLD_PX &&
          Math.abs(dy) < AXIS_LOCK_THRESHOLD_PX
        ) {
          return;
        }
        if (Math.abs(dx) >= Math.abs(dy) * AXIS_HORIZONTAL_BIAS) {
          session.axis = 'horizontal';
          didSwipeRef.current = true;
        } else {
          session.axis = 'vertical';
          return;
        }
      }

      if (session.axis !== 'horizontal') return;

      const el = targetRef.current;
      if (!el) return;

      const dampedX =
        Math.sign(dx) * Math.min(MAX_VISUAL_DRAG_PX, Math.abs(dx) * 0.82);
      const opacity = Math.max(0.62, 1 - Math.abs(dampedX) / 420);

      el.style.willChange = 'transform, opacity';
      el.style.transition = 'none';
      el.style.transform = `translate3d(${dampedX}px, 0, 0)`;
      el.style.opacity = String(opacity);
    },
    [enabled, snapBack, targetRef]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      const session = sessionRef.current;
      sessionRef.current = null;
      if (!enabled || !session || session.axis !== 'horizontal') {
        return;
      }

      const endTouch = e.changedTouches[0];
      const dx = endTouch ? endTouch.clientX - session.startX : session.lastDx;
      const elapsedMs = Math.max(1, performance.now() - session.startTime);
      const velocity = Math.abs(dx) / elapsedMs;

      const stageWidth = targetRef.current?.clientWidth || window.innerWidth || 360;
      const commitThreshold = Math.max(
        MIN_COMMIT_DISTANCE_PX,
        Math.min(MAX_COMMIT_DISTANCE_PX, stageWidth * 0.16)
      );

      const shouldCommit =
        Math.abs(dx) >= commitThreshold ||
        (velocity >= FLICK_VELOCITY_PX_PER_MS && Math.abs(dx) >= FLICK_MIN_DISTANCE_PX);

      armClickGuard();

      if (shouldCommit) {
        clearInlineStyles();
        if (dx < 0) {
          onSwipeLeft();
        } else {
          onSwipeRight();
        }
        return;
      }

      snapBack();
    },
    [enabled, targetRef, armClickGuard, clearInlineStyles, onSwipeLeft, onSwipeRight, snapBack]
  );

  const onTouchCancel = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session?.axis === 'horizontal') {
      armClickGuard();
      snapBack();
    }
  }, [armClickGuard, snapBack]);

  return {
    didSwipeRef,
    resetSwipe,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel,
    },
  };
}
