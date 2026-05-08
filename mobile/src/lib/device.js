// Stable per-device anonymous identifier for the mobile app.
//
// Generated on first launch, persisted to AsyncStorage. The backend uses
// it to find-or-create the user record. When Google Sign-In is added later,
// signing in will link this device_id to a real user account.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gitaflow:device_id';

function uuidv4() {
  // Avoid relying on Node crypto in RN; use the standard JS implementation.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cachedId = null;

export async function getDeviceId() {
  if (cachedId) return cachedId;
  try {
    let id = await AsyncStorage.getItem(KEY);
    if (!id) {
      id = uuidv4();
      await AsyncStorage.setItem(KEY, id);
    }
    cachedId = id;
    return id;
  } catch (e) {
    // Fallback memory-only id (very unlikely path)
    if (!cachedId) cachedId = uuidv4();
    return cachedId;
  }
}
