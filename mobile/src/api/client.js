// Mobile API client. Same endpoints as web; uses fetch + X-Device-Id header.
// API_BASE comes from EXPO_PUBLIC_API_BASE (LAN IP for Expo Go on a phone).

import Constants from 'expo-constants';
import { getDeviceId } from '../lib/device';

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ||
  Constants.expoConfig?.extra?.apiBase ||
  'http://localhost:8000';

async function buildHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Device-Id': await getDeviceId(),
  };
}

function networkError() {
  return new Error(
    `Could not reach backend at ${API_BASE}. ` +
      `Check that EXPO_PUBLIC_API_BASE in mobile/.env.local points to your ` +
      `laptop's LAN IP, the backend is running with --host 0.0.0.0, and ` +
      `your phone is on the same Wi-Fi.`,
  );
}

async function jsonOrThrow(response) {
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Backend error ${response.status}: ${detail.slice(0, 200)}`);
  }
  return response.json();
}

// ─────────────────────────────────────────────────────────────────────────
// Karma Lens
// ─────────────────────────────────────────────────────────────────────────
export async function analyseKarma(text, emotionHint) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/karma-lens/analyse`, {
      method: 'POST',
      headers: await buildHeaders(),
      body: JSON.stringify({ text, emotion_hint: emotionHint }),
    });
  } catch {
    throw networkError();
  }
  return jsonOrThrow(response);
}

export async function fetchDailyVerse() {
  try {
    const response = await fetch(`${API_BASE}/api/verses/daily`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Reflections
// ─────────────────────────────────────────────────────────────────────────
export async function saveReflectionToBackend(analysisId, userNote = null) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/reflections`, {
      method: 'POST',
      headers: await buildHeaders(),
      body: JSON.stringify({ analysis_id: analysisId, user_note: userNote }),
    });
  } catch {
    throw networkError();
  }
  return jsonOrThrow(response);
}

export async function listReflectionsFromBackend() {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/reflections`, {
      method: 'GET',
      headers: await buildHeaders(),
    });
  } catch {
    throw networkError();
  }
  return jsonOrThrow(response);
}

export async function fetchReflectionCount() {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/reflections/count`, {
      method: 'GET',
      headers: await buildHeaders(),
    });
  } catch {
    throw networkError();
  }
  return jsonOrThrow(response);
}

// ─────────────────────────────────────────────────────────────────────────
// Home screen — check-in chips + continuity insight
// ─────────────────────────────────────────────────────────────────────────
export async function saveCheckin(emotion) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/checkins`, {
      method: 'POST',
      headers: await buildHeaders(),
      body: JSON.stringify({ emotion }),
    });
  } catch {
    throw networkError();
  }
  return jsonOrThrow(response);
}

export async function fetchTodayCheckin() {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/checkins/today`, {
      method: 'GET',
      headers: await buildHeaders(),
    });
  } catch {
    throw networkError();
  }
  return jsonOrThrow(response);
}

export async function fetchHomeInsight() {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/home/insight`, {
      method: 'GET',
      headers: await buildHeaders(),
    });
  } catch {
    throw networkError();
  }
  return jsonOrThrow(response);
}

export async function fetchTodaysQuestion() {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/home/question`, {
      method: 'GET',
      headers: await buildHeaders(),
    });
  } catch {
    throw networkError();
  }
  return jsonOrThrow(response);
}

// ─────────────────────────────────────────────────────────────────────────
// User / onboarding
// ─────────────────────────────────────────────────────────────────────────
export const fetchMe = () => _get('/api/users/me');

export async function saveOnboarding({ intention, tonePreference, dailyReminderOptIn }) {
  return _post('/api/users/onboarding', {
    intention: intention,
    tone_preference: tonePreference,
    daily_reminder_opt_in: !!dailyReminderOptIn,
  });
}

export const fetchWelcomeVerse = () => _get('/api/welcome/verse');

export async function fetchHomeVerse() {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/home/verse`, {
      method: 'GET',
      headers: await buildHeaders(),
    });
  } catch {
    throw networkError();
  }
  return jsonOrThrow(response);
}

// ─────────────────────────────────────────────────────────────────────────
// Journeys
// ─────────────────────────────────────────────────────────────────────────
async function _get(path) {
  let r;
  try {
    r = await fetch(`${API_BASE}${path}`, { headers: await buildHeaders() });
  } catch { throw networkError(); }
  return jsonOrThrow(r);
}
async function _post(path, body) {
  let r;
  try {
    r = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: await buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch { throw networkError(); }
  return jsonOrThrow(r);
}

export const fetchJourneys        = ()                     => _get('/api/journeys');
export const fetchActiveJourney   = ()                     => _get('/api/journeys/active');
export const fetchJourney         = (slug)                 => _get(`/api/journeys/${slug}`);
export const startJourney         = (slug)                 => _post(`/api/journeys/${slug}/start`);
export const pauseActiveJourney   = ()                     => _post('/api/journeys/active/pause');
export const resumeJourney        = (progressId)           => _post(`/api/journeys/${progressId}/resume`);
export const fetchJourneyDay      = (progressId, day)      => _get(`/api/journeys/progress/${progressId}/day/${day}`);
export const completeJourneyDay   = (progressId, day, txt) =>
  _post(`/api/journeys/progress/${progressId}/day/${day}`, { user_response: txt });

export async function deleteReflectionFromBackend(reflectionId) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/reflections/${reflectionId}`, {
      method: 'DELETE',
      headers: await buildHeaders(),
    });
  } catch {
    throw networkError();
  }
  return jsonOrThrow(response);
}

export { API_BASE };
