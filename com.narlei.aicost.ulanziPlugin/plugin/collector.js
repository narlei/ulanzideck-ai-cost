import { run } from './codeburn-runner.js';

const POLL_INTERVAL_MS = 15 * 60 * 1000;
const JITTER_MAX_MS = 10_000;

// caches: Map<period, { current, generated, fetchedAt, error, errorKind }>
const caches = new Map();
// periodRefs: Map<period, number> — how many instances use this period
const periodRefs = new Map();
// subscribers: Set<fn(period, cacheEntry)>
const subscribers = new Set();
// timers: Map<period, { interval, timeout }>
const timers = new Map();
// inflight: Set<period>
const inflight = new Set();

function log(...args) {
  console.log('[collector]', ...args);
}

async function fetch(period) {
  if (inflight.has(period)) return;
  inflight.add(period);
  log('fetching', period);
  try {
    const result = await run(period);
    if (result.ok) {
      const json = result.data;
      caches.set(period, {
        current: json.current,
        generated: json.generated,
        fetchedAt: Date.now(),
        error: null,
        errorKind: null,
      });
    } else {
      const prev = caches.get(period);
      caches.set(period, {
        current: prev?.current || null,
        generated: prev?.generated || null,
        fetchedAt: prev?.fetchedAt || null,
        error: result.message,
        errorKind: result.kind,
      });
    }
    notify(period);
  } catch (e) {
    log('unexpected error', e?.message);
    const prev = caches.get(period);
    caches.set(period, {
      current: prev?.current || null,
      generated: prev?.generated || null,
      fetchedAt: prev?.fetchedAt || null,
      error: e?.message || 'unknown',
      errorKind: 'CODEBURN_FAILED',
    });
    notify(period);
  } finally {
    inflight.delete(period);
  }
}

function notify(period) {
  const entry = caches.get(period);
  for (const fn of subscribers) {
    try { fn(period, entry); } catch {}
  }
}

function startTimer(period) {
  if (timers.has(period)) return;
  const jitter = Math.floor(Math.random() * JITTER_MAX_MS);
  const timeout = setTimeout(() => {
    fetch(period);
    const interval = setInterval(() => fetch(period), POLL_INTERVAL_MS);
    const t = timers.get(period) || {};
    t.interval = interval;
    t.timeout = null;
    timers.set(period, t);
  }, jitter);
  timers.set(period, { timeout, interval: null });
}

function stopTimer(period) {
  const t = timers.get(period);
  if (!t) return;
  if (t.timeout) clearTimeout(t.timeout);
  if (t.interval) clearInterval(t.interval);
  timers.delete(period);
}

export function register(period) {
  const refs = (periodRefs.get(period) || 0) + 1;
  periodRefs.set(period, refs);
  if (refs === 1) startTimer(period);
}

export function unregister(period) {
  const refs = Math.max(0, (periodRefs.get(period) || 0) - 1);
  periodRefs.set(period, refs);
  if (refs === 0) {
    stopTimer(period);
    periodRefs.delete(period);
  }
}

export function subscribe(fn) {
  subscribers.add(fn);
}

export function unsubscribe(fn) {
  subscribers.delete(fn);
}

export function getCache(period) {
  return caches.get(period) || null;
}

export function refreshNow(period) {
  fetch(period);
}
