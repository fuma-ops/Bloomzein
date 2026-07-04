// ============================================================================
// Bloomzein — cloud sync engine
// ----------------------------------------------------------------------------
// Mirrors every `bloom:*` localStorage key to the Supabase `user_data` table so
// a signed-in user's data follows them across devices. Tools keep using
// localStorage exactly as before — this layer transparently intercepts writes
// and pushes them, and pulls cloud data down on login.
//
// Strategy: last-write-wins per key, resolved by timestamp. A small local
// "sync meta" map records when each key last changed locally so we can compare
// against the cloud row's `updated_at` on pull.
// ============================================================================

import { supabase } from "./supabase";

const PREFIX = "bloom:";
const META_KEY = "bloom:__sync_meta"; // { [key]: isoTimestamp } — local change times
const FLUSH_DELAY = 1500;

// Keys that are transient / device-local and should NOT travel to the cloud.
const SKIP = new Set<string>([
  META_KEY,
  "bloom:notes-permission-dismissed",
  "bloom:notes-pwa-dismissed",
  "bloom:today-water-acks-seen",
]);

let currentUserId: string | null = null;
let installed = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const dirty = new Set<string>();

// ── sync-meta helpers ────────────────────────────────────────────────────────
function readMeta(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(META_KEY) || "{}"); } catch { return {}; }
}
function writeMeta(meta: Record<string, string>) {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch {}
}
function touchMeta(key: string, iso: string) {
  const meta = readMeta();
  meta[key] = iso;
  writeMeta(meta);
}

function shouldSync(key: string): boolean {
  return key.startsWith(PREFIX) && !SKIP.has(key);
}

// ── write interception ───────────────────────────────────────────────────────
// Wrap setItem/removeItem once so every tool's writes are captured centrally,
// with zero changes to the tools themselves.
function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const origSet = localStorage.setItem.bind(localStorage);
  const origRemove = localStorage.removeItem.bind(localStorage);

  localStorage.setItem = (key: string, value: string) => {
    origSet(key, value);
    if (shouldSync(key)) {
      touchMeta(key, new Date().toISOString());
      if (currentUserId) { dirty.add(key); scheduleFlush(); }
    }
  };

  localStorage.removeItem = (key: string) => {
    origRemove(key);
    if (shouldSync(key)) {
      touchMeta(key, new Date().toISOString());
      if (currentUserId) { dirty.add(key); scheduleFlush(); }
    }
  };

  // Flush pending changes when the tab is backgrounded or closed.
  document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });
  window.addEventListener("pagehide", () => { void flush(); });
}

// ── push (local → cloud) ─────────────────────────────────────────────────────
function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => { flushTimer = null; void flush(); }, FLUSH_DELAY);
}

async function flush() {
  if (!currentUserId || dirty.size === 0) return;
  const keys = [...dirty];
  dirty.clear();

  const meta = readMeta();
  const rows = keys.map((key) => ({
    user_id: currentUserId!,
    key,
    value: localStorage.getItem(key), // null when the key was removed
    updated_at: meta[key] ?? new Date().toISOString(),
  }));

  try {
    const { error } = await supabase
      .from("user_data")
      .upsert(rows, { onConflict: "user_id,key" });
    if (error) {
      // Re-queue on failure so we retry on the next change.
      keys.forEach((k) => dirty.add(k));
    }
  } catch {
    keys.forEach((k) => dirty.add(k));
  }
}

// ── pull (cloud → local) ─────────────────────────────────────────────────────
// Merge cloud rows into localStorage. For each key, the newer of (local change
// time, cloud updated_at) wins. Keys that are newer locally get queued for push.
async function pullAndMerge() {
  if (!currentUserId) return;

  let rows: { key: string; value: string | null; updated_at: string }[] = [];
  try {
    const { data, error } = await supabase
      .from("user_data")
      .select("key, value, updated_at")
      .eq("user_id", currentUserId);
    if (error || !data) return;
    rows = data;
  } catch {
    return;
  }

  const meta = readMeta();
  const cloud = new Map(rows.map((r) => [r.key, r]));

  // 1. Cloud → local where cloud is newer (or local missing).
  for (const r of rows) {
    if (!shouldSync(r.key)) continue;
    const localTime = meta[r.key];
    const cloudWins = !localTime || r.updated_at > localTime;
    if (cloudWins) {
      applyRemote(r.key, r.value);
      meta[r.key] = r.updated_at;
    }
  }

  // 2. Local → cloud where local exists and is newer (or cloud missing).
  const localKeys = Object.keys(localStorage).filter(shouldSync);
  for (const key of localKeys) {
    const cloudRow = cloud.get(key);
    const localTime = meta[key];
    const localWins = !cloudRow || (localTime && localTime > cloudRow.updated_at);
    if (localWins) {
      if (!localTime) meta[key] = new Date().toISOString();
      dirty.add(key);
    }
  }

  writeMeta(meta);
  if (dirty.size > 0) void flush();
}

// Apply a remote value to localStorage WITHOUT re-triggering our interceptor
// (we don't want a pulled value to immediately bounce back as a push).
function applyRemote(key: string, value: string | null) {
  // Temporarily detach the current user so the wrapped setItem skips the push.
  const saved = currentUserId;
  currentUserId = null;
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } finally {
    currentUserId = saved;
  }
  // Let any open tool refresh from the new value.
  try { window.dispatchEvent(new StorageEvent("storage", { key })); } catch {}
}

// ── public API ───────────────────────────────────────────────────────────────

/** Call once on app start (idempotent). Installs the localStorage interceptor. */
export function initCloudSync() {
  install();
}

/** Call when a user signs in. Pulls their cloud data and starts syncing writes. */
export async function startCloudSync(userId: string) {
  install();
  currentUserId = userId;
  await pullAndMerge();
}

/** Call on sign-out. Flushes anything pending, then stops syncing. */
export async function stopCloudSync() {
  await flush();
  currentUserId = null;
}

/** Force-push pending local changes to the cloud right now (awaitable).
 *  Used before a hard reload (e.g. tool reset) so deletions actually land
 *  and aren't restored by the next pull. No-op when signed out. */
export async function flushCloudSync() {
  await flush();
}
