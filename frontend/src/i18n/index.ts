import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { languageOptions, resources, type SupportedLanguage } from './resources';
export type { SupportedLanguage } from './resources';
export { languageOptions } from './resources';

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

const LANGUAGE_STORAGE_KEY = 'ui_language';

function normalizeLanguage(input?: string | null): SupportedLanguage {
  if (!input) return DEFAULT_LANGUAGE;
  const normalized = input.toLowerCase();
  return (languageOptions.find((option) => option.code === normalized)?.code ?? DEFAULT_LANGUAGE) as SupportedLanguage;
}

export function backendLanguageToUi(input?: string | null): SupportedLanguage {
  return normalizeLanguage(input);
}

export function uiLanguageToBackend(input: SupportedLanguage) {
  return input.toUpperCase();
}

export function getStoredLanguage(): SupportedLanguage {
  try {
    return normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function persistLanguage(code: SupportedLanguage) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  } catch {
    // ignore storage errors
  }
}

const initialLanguage = getStoredLanguage();

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
  ns: ['common', 'settings', 'day_end', 'exports', 'billing'],
  defaultNS: 'common',
});

export default i18n;
