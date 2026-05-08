// Mobile reflection storage with the "backend AND local cache" pattern.
// Mirrors frontend/src/lib/storage.js — see that file for the philosophy.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveReflectionToBackend,
  listReflectionsFromBackend,
  deleteReflectionFromBackend,
} from '../api/client';

const CACHE_KEY = 'gitaflow:reflections_cache';
const OLD_PREFIX = 'gitaflow:reflection:';
const MIGRATION_KEY = 'gitaflow:migration_done_v1';

async function readCache() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeCache(items) {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

// One-time migration from per-key entries to unified cache + push to backend.
export async function migrateLegacyReflections() {
  try {
    const done = await AsyncStorage.getItem(MIGRATION_KEY);
    if (done) return;

    const allKeys = await AsyncStorage.getAllKeys();
    const oldKeys = allKeys.filter((k) => k.startsWith(OLD_PREFIX));
    if (oldKeys.length === 0) {
      await AsyncStorage.setItem(MIGRATION_KEY, '1');
      return;
    }

    const pairs = await AsyncStorage.multiGet(oldKeys);
    const cache = [];
    for (const [key, raw] of pairs) {
      let item;
      try {
        item = raw ? JSON.parse(raw) : null;
      } catch {
        continue;
      }
      if (!item) continue;

      const analysisId = item.result?.analysis_id;
      let backendId = null;
      if (analysisId) {
        try {
          const res = await saveReflectionToBackend(analysisId, null);
          backendId = res?.id || null;
        } catch {
          /* keep local-only */
        }
      }
      cache.push({
        id: backendId || key,
        analysis_id: analysisId,
        user_note: null,
        saved_at: new Date(item.savedAt || Date.now()).toISOString(),
        input_text: item.userText || '',
        response: item.result || {},
        _legacy: true,
      });
      try { await AsyncStorage.removeItem(key); } catch { /* ignore */ }
    }
    await writeCache(cache);
    await AsyncStorage.setItem(MIGRATION_KEY, '1');
  } catch (e) {
    console.warn('Reflection migration failed (non-fatal)', e);
  }
}

export async function loadReflections() {
  try {
    const data = await listReflectionsFromBackend();
    const items = data?.reflections || [];
    await writeCache(items);
    return items;
  } catch (e) {
    console.warn('Backend unavailable; reading from local cache', e);
    return readCache();
  }
}

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

  const cache = await readCache();
  cache.unshift(item);
  await writeCache(cache);
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
  const cache = (await readCache()).filter((r) => r.id !== reflectionId);
  await writeCache(cache);
}
