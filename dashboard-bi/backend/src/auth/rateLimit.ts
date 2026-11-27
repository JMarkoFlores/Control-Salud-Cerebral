import { env } from '../config/env';

interface AttemptWindow {
  timestamps: number[];
}

const attempts = new Map<string, AttemptWindow>();

function prune(window: AttemptWindow, now: number): void {
  window.timestamps = window.timestamps.filter(
    (timestamp) => now - timestamp < env.LOGIN_WINDOW_MS
  );
}

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const window = attempts.get(key);
  if (!window) return false;
  prune(window, now);
  if (window.timestamps.length === 0) {
    attempts.delete(key);
    return false;
  }
  return window.timestamps.length >= env.LOGIN_MAX_ATTEMPTS;
}

export function registerFailedAttempt(key: string): void {
  const now = Date.now();
  const window = attempts.get(key) ?? { timestamps: [] };
  prune(window, now);
  window.timestamps.push(now);
  attempts.set(key, window);
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}

export function retryAfterSeconds(key: string): number {
  const window = attempts.get(key);
  if (!window || window.timestamps.length === 0) return 0;
  const oldest = Math.min(...window.timestamps);
  const remaining = env.LOGIN_WINDOW_MS - (Date.now() - oldest);
  return Math.max(0, Math.ceil(remaining / 1000));
}
