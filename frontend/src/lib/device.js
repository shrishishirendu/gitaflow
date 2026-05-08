// Stable per-browser anonymous identifier.
//
// On first launch, generates a UUID and saves it to localStorage. On every
// subsequent launch, returns the same UUID. This is what the backend sees
// to find-or-create the user record.
//
// Note: this is per-browser, not per-user. Clearing browser data resets it.
// When Google Sign-In is added later, signing in will link this device_id
// to a real user account, so reflections survive the reset.

const KEY = 'gitaflow:device_id';

function uuidv4() {
  // crypto.randomUUID is widely supported, but fall back if not.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: RFC 4122 v4-ish from Math.random
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cachedId = null;

export function getDeviceId() {
  if (cachedId) return cachedId;
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = uuidv4();
      localStorage.setItem(KEY, id);
    }
    cachedId = id;
    return id;
  } catch {
    // Private mode / disabled storage — return a memory-only id.
    if (!cachedId) cachedId = uuidv4();
    return cachedId;
  }
}
