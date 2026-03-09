/**
 * Sound Notification System
 * Manages different notification sounds for different order sources
 */

export type OrderSource = 'QR' | 'TAKEAWAY' | 'ZOMATO' | 'SWIGGY' | 'MANUAL' | 'WEB' | 'RESERVATION';

export interface SoundSettings {
  qr: { enabled: boolean };
  takeaway: { enabled: boolean };
  zomato: { enabled: boolean };
  swiggy: { enabled: boolean };
  reservation: { enabled: boolean };
}

const SOUND_FILES: Record<string, string> = {
  qr: '/sounds/qr-order.mp3',
  takeaway: '/sounds/takeaway-order.mp3',
  zomato: '/sounds/zomato-order.mp3',
  swiggy: '/sounds/swiggy-order.mp3',
  reservation: '/sounds/notification.mp3',
};

const STORAGE_KEY = 'eatnbill_sound_settings';

const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  qr: { enabled: true },
  takeaway: { enabled: true },
  zomato: { enabled: true },
  swiggy: { enabled: true },
  reservation: { enabled: true },
};

// Get sound settings from localStorage
export function getSoundSettings(): SoundSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<SoundSettings>;
      return {
        ...DEFAULT_SOUND_SETTINGS,
        ...parsed,
      };
    }
  } catch (error) {
    console.error('[SoundNotification] Failed to load settings:', error);
  }

  // Default: all enabled
  return DEFAULT_SOUND_SETTINGS;
}

// Save sound settings to localStorage
export function saveSoundSettings(settings: SoundSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('[SoundNotification] Failed to save settings:', error);
  }
}

// Update a single sound setting
export function updateSoundSetting(key: keyof SoundSettings, enabled: boolean): void {
  const settings = getSoundSettings();
  settings[key] = { enabled };
  saveSoundSettings(settings);
}

// Enable/disable all sounds
export function setAllSoundsEnabled(enabled: boolean): void {
  const settings: SoundSettings = {
    qr: { enabled },
    takeaway: { enabled },
    zomato: { enabled },
    swiggy: { enabled },
    reservation: { enabled },
  };
  saveSoundSettings(settings);
}

// Check if all sounds are enabled
export function areAllSoundsEnabled(): boolean {
  const settings = getSoundSettings();
  return Object.values(settings).every((s) => s.enabled);
}

// Play notification sound based on order source
export function playOrderSound(source: OrderSource): void {
  const settings = getSoundSettings();
  
  // Map order source to sound key
  let soundKey: keyof SoundSettings;
  
  switch (source) {
    case 'QR':
      soundKey = 'qr';
      break;
    case 'TAKEAWAY':
    case 'WEB':
    case 'MANUAL':
      soundKey = 'takeaway';
      break;
    case 'ZOMATO':
      soundKey = 'zomato';
      break;
    case 'SWIGGY':
      soundKey = 'swiggy';
      break;
    case 'RESERVATION':
      soundKey = 'reservation';
      break;
    default:
      soundKey = 'takeaway';
  }

  // Check if sound is enabled
  if (!settings[soundKey]?.enabled) {
    console.log(`[SoundNotification] Sound disabled for ${soundKey}`);
    return;
  }

  // Play the sound
  try {
    const audio = new Audio(SOUND_FILES[soundKey]);
    audio.volume = 0.6;
    audio.play().catch((error) => {
      console.error(`[SoundNotification] Failed to play ${soundKey} sound:`, error);
    });
  } catch (error) {
    console.error(`[SoundNotification] Error creating audio for ${soundKey}:`, error);
  }
}

// Test/preview a specific sound
export function testSound(key: keyof SoundSettings): void {
  try {
    const audio = new Audio(SOUND_FILES[key]);
    audio.volume = 0.6;
    audio.play().catch((error) => {
      console.error(`[SoundNotification] Failed to test ${key} sound:`, error);
    });
  } catch (error) {
    console.error(`[SoundNotification] Error testing ${key} sound:`, error);
  }
}

export function playReservationSound(): void {
  const settings = getSoundSettings();
  if (!settings.reservation.enabled) {
    console.log('[SoundNotification] Reservation sound disabled');
    return;
  }

  try {
    const audio = new Audio(SOUND_FILES.reservation);
    audio.volume = 0.6;
    audio.play().catch((error) => {
      console.error('[SoundNotification] Failed to play reservation sound:', error);
    });
  } catch (error) {
    console.error('[SoundNotification] Error creating reservation audio:', error);
  }
}

// Get sound file path (for display purposes)
export function getSoundPath(key: keyof SoundSettings): string {
  return SOUND_FILES[key];
}
