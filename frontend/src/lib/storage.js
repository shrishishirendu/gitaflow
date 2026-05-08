// Reflection storage with the "backend AND local cache" pattern.
//
// Pattern:
//   - SAVE:  write to backend, also update local cache. If backend fails,
//            keep local copy so the user doesn't lose their work.
//   - LOAD:  try backend first; on failure, fall back to local cache.
//   - MIGRATE: on first run after this upgrade, push any old local-only
//              reflections up to the backend so they aren't lost.
//
// The local cache uses a single key (`gitaflow:reflections_cache`) holding
// an array. This is simpler and faster than the per-key approach we had
// before. The old per-key entries are migrated then cleaned up.

import {
  saveReflectionToBackend,
  listReflectionsFromBackend,
  deleteReflectionFromBackend,
} from '../api/client';

const CACHE_KEY = 'gitaflow:reflections_cache';
const OLD_PREFIX = 'gitaflow:reflection:';
const MIGRATION_KEY = 'gitaflow:migration_done_v1';

// ─────────────────────────────────────────────────────────────────────────
// Local cache primitives
// ─────────────────────────────────────────────────────────────────────────
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCache(items) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(items));
  } catch {
    /* full storage / private mode — accept the loss */
  }
}

// ─────────────────────────────────────────────────────────────────────────
// One-time migration: upgrade from per-key entries to the unified cache.
// Also push any local-only items up to the backend so they survive.
// ─────────────────────────────────────────────────────────────────────────
export async function migrateLegacyReflections() {
  try {
    if (localStorage.getItem(MIGRATION_KEY)) return; // already done

    // Find old per-key entries.
    const legacy = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(OLD_PREFIX)) continue;
      try {
        const raw = localStorage.getItem(key);
        if (raw) legacy.push({ key, item: JSON.parse(raw) });
      } catch {
        /* skip malformed */
      }
    }

    if (legacy.length === 0) {
      localStorage.setItem(MIGRATION_KEY, '1');
      return;
    }

    // Push each to backend if we can. If the analysis_id doesn't exist there
    // (it's a brand-new backend), we silently keep them in the cache only.
    const cache = [];
    for (const { key, item } of legacy) {
      const analysisId = item.result?.analysis_id;
      let backendId = null;
      if (analysisId) {
        try {
          const res = await saveReflectionToBackend(analysisId, null);
          backendId = res?.id || null;
        } catch {
          /* backend doesn't have it — keep local-only entry */
        }
      }
      cache.push({
        id: backendId || key, // use backend id when we have it
        analysis_id: analysisId,
        user_note: null,
        saved_at: new Date(item.savedAt || Date.now()).toISOString(),
        input_text: item.userText || '',
        response: item.result || {},
        // Old-format flag so UI can still read either shape gracefully
        _legacy: true,
      });
      // Clean up the old key
      try { localStorage.removeItem(key); } catch { /* ignore */ }
    }
    writeCache(cache);
    localStorage.setItem(MIGRATION_KEY, '1');
  } catch (e) {
    console.warn('Reflection migration failed (non-fatal)', e);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────

/**
 * Load reflections. Tries backend first; on failure, returns local cache.
 * Always updates the local cache after a successful backend fetch.
 */
export async function loadReflections() {
  try {
    const data = await listReflectionsFromBackend();
    const items = data?.reflections || [];
    writeCache(items);
    return items;
  } catch (e) {
    console.warn('Backend unavailable; reading from local cache', e);
    return readCache();
  }
}

/**
 * Save a reflection. Writes to backend; updates the local cache afterwards.
 * Returns the saved item shape (matching the backend's list response shape).
 */
export async function saveReflection({ analysisId, userText, result, userNote = null }) {
  let backendId = null;
  try {
    const res = await saveReflectionToBackend(analysisId, userNote);
    backendId = res?.id || null;
  } catch (e) {
    console.warn('Backend save failed; keeping local copy', e);
  }

  const item = {
    id: backendId || `local:${Date.now()}`,
    analysis_id: analysisId,
    user_note: userNote,
    saved_at: new Date().toISOString(),
    input_text: userText,
    response: result,
    _localOnly: !backendId,
  };

  const cache = readCache();
  cache.unshift(item); // newest first
  writeCache(cache);
  return item;
}

export async function deleteReflection(reflectionId) {
  try {
    if (!reflectionId.startsWith('local:')) {
      await deleteReflectionFromBackend(reflectionId);
    }
  } catch (e) {
    console.warn('Backend delete failed; removing locally anyway', e);
  }
  const cache = readCache().filter((r) => r.id !== reflectionId);
  writeCache(cache);
}
