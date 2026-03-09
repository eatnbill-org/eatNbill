import { useCallback, useEffect, useState } from 'react';
import i18n, {
  backendLanguageToUi,
  persistLanguage,
  uiLanguageToBackend,
  type SupportedLanguage,
} from '@/i18n';
import { fetchMyPreferences, updateMyPreferences } from '@/lib/enterprise-api';

export function useLanguagePreference() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [language, setLanguage] = useState<SupportedLanguage>(backendLanguageToUi(i18n.language));

  const loadPreference = useCallback(async () => {
    setLoading(true);
    try {
      const prefs = await fetchMyPreferences();
      const nextLanguage = backendLanguageToUi(prefs?.effective_language);
      setLanguage(nextLanguage);
      await i18n.changeLanguage(nextLanguage);
      persistLanguage(nextLanguage);
    } catch {
      // keep existing language if request fails
    } finally {
      setLoading(false);
    }
  }, []);

  const updateLanguage = useCallback(async (next: SupportedLanguage) => {
    setSaving(true);
    try {
      await updateMyPreferences({ preferred_language: uiLanguageToBackend(next) });
      setLanguage(next);
      await i18n.changeLanguage(next);
      persistLanguage(next);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    void loadPreference();
  }, [loadPreference]);

  return {
    loading,
    saving,
    language,
    loadPreference,
    updateLanguage,
  };
}
