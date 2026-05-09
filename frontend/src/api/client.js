// All Anthropic calls happen on the backend. This client just hits the
// FastAPI endpoints. Vite proxies /api/* to localhost:8000 in dev.
//
// Every request carries an X-Device-Id header that uniquely identifies
// this browser. The backend uses it to find-or-create a user record.

import { getDeviceId } from '../lib/device';

const API_BASE = import.meta.env.VITE_API_BASE || '';

function headers() {
  return {
    'Content-Type': 'application/json',
    'X-Device-Id': getDeviceId(),
  };
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
  const response = await fetch(`${API_BASE}/api/karma-lens/analyse`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ text, emotion_hint: emotionHint }),
  });
  return jsonOrThrow(response);
}

// ─────────────────────────────────────────────────────────────────────────
// Reflections
// ─────────────────────────────────────────────────────────────────────────
export async function saveReflectionToBackend(analysisId, userNote = null) {
  const response = await fetch(`${API_BASE}/api/reflections`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ analysis_id: analysisId, user_note: userNote }),
  });
  return jsonOrThrow(response);
}

export async function listReflectionsFromBackend() {
  const response = await fetch(`${API_BASE}/api/reflections`, {
    method: 'GET',
    headers: headers(),
  });
  return jsonOrThrow(response);
}

export async function fetchReflectionCount() {
  const response = await fetch(`${API_BASE}/api/reflections/count`, {
    method: 'GET',
    headers: headers(),
  });
  return jsonOrThrow(response);
}

// ─────────────────────────────────────────────────────────────────────────
// Home screen — check-in chips + continuity insight
// ─────────────────────────────────────────────────────────────────────────
export async function saveCheckin(emotion) {
  const response = await fetch(`${API_BASE}/api/checkins`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ emotion }),
  });
  return jsonOrThrow(response);
}

export async function fetchTodayCheckin() {
  const response = await fetch(`${API_BASE}/api/checkins/today`, {
    method: 'GET',
    headers: headers(),
  });
  return jsonOrThrow(response);
}

export async function fetchHomeInsight() {
  const response = await fetch(`${API_BASE}/api/home/insight`, {
    method: 'GET',
    headers: headers(),
  });
  return jsonOrThrow(response);
}

export async function fetchTodaysQuestion() {
  const response = await fetch(`${API_BASE}/api/home/question`, {
    method: 'GET',
    headers: headers(),
  });
  return jsonOrThrow(response);
}

// ─────────────────────────────────────────────────────────────────────────
// User / onboarding
// ─────────────────────────────────────────────────────────────────────────
export async function fetchMe() {
  const r = await fetch(`${API_BASE}/api/users/me`, { headers: headers() });
  return jsonOrThrow(r);
}

export async function saveOnboarding({ intention, tonePreference, dailyReminderOptIn }) {
  const r = await fetch(`${API_BASE}/api/users/onboarding`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      intention: intention,
      tone_preference: tonePreference,
      daily_reminder_opt_in: !!dailyReminderOptIn,
    }),
  });
  return jsonOrThrow(r);
}

export async function fetchWelcomeVerse() {
  // Public endpoint — no auth headers required, but they don't hurt.
  const r = await fetch(`${API_BASE}/api/welcome/verse`, { headers: headers() });
  return jsonOrThrow(r);
}

export async function fetchHomeVerse() {
  const response = await fetch(`${API_BASE}/api/home/verse`, {
    method: 'GET',
    headers: headers(),
  });
  return jsonOrThrow(response);
}

// ─────────────────────────────────────────────────────────────────────────
// Journeys
// ─────────────────────────────────────────────────────────────────────────
export async function fetchJourneys() {
  const r = await fetch(`${API_BASE}/api/journeys`, { headers: headers() });
  return jsonOrThrow(r);
}

export async function fetchActiveJourney() {
  const r = await fetch(`${API_BASE}/api/journeys/active`, { headers: headers() });
  return jsonOrThrow(r);
}

export async function fetchJourney(slug) {
  const r = await fetch(`${API_BASE}/api/journeys/${slug}`, { headers: headers() });
  return jsonOrThrow(r);
}

export async function startJourney(slug) {
  const r = await fetch(`${API_BASE}/api/journeys/${slug}/start`, {
    method: 'POST', headers: headers(),
  });
  return jsonOrThrow(r);
}

export async function pauseActiveJourney() {
  const r = await fetch(`${API_BASE}/api/journeys/active/pause`, {
    method: 'POST', headers: headers(),
  });
  return jsonOrThrow(r);
}

export async function resumeJourney(progressId) {
  const r = await fetch(`${API_BASE}/api/journeys/${progressId}/resume`, {
    method: 'POST', headers: headers(),
  });
  return jsonOrThrow(r);
}

export async function fetchJourneyDay(progressId, dayNumber) {
  const r = await fetch(
    `${API_BASE}/api/journeys/progress/${progressId}/day/${dayNumber}`,
    { headers: headers() }
  );
  return jsonOrThrow(r);
}

export async function completeJourneyDay(progressId, dayNumber, userResponse) {
  const r = await fetch(
    `${API_BASE}/api/journeys/progress/${progressId}/day/${dayNumber}`,
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ user_response: userResponse }),
    }
  );
  return jsonOrThrow(r);
}

export async function deleteReflectionFromBackend(reflectionId) {
  const response = await fetch(`${API_BASE}/api/reflections/${reflectionId}`, {
    method: 'DELETE',
    headers: headers(),
  });
  return jsonOrThrow(response);
}
