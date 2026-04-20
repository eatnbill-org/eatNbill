import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  fetchOutlets,
  updateOutlet,
  fetchMyPreferences,
  updateMyPreferences,
} from '@/lib/enterprise-api';
import { backendLanguageToUi, languageOptions, persistLanguage, uiLanguageToBackend, type SupportedLanguage } from '@/i18n';
import type { RestaurantOutlet, TaxPricingMode } from '@/types/enterprise-billing';

const RECEIPT_TEMPLATE_STORAGE_KEY = 'billing_receipt_template';

function persistReceiptTemplate(template?: string | null) {
  if (!template) return;
  try {
    localStorage.setItem(RECEIPT_TEMPLATE_STORAGE_KEY, template);
  } catch {
    // ignore local storage errors
  }
}

const receiptOptions = [
  { value: 'MM80_STANDARD', key: 'settings.template80' },
  { value: 'MM58_COMPACT', key: 'settings.template58' },
  { value: 'A4_TAX_INVOICE', key: 'settings.templateA4' },
] as const;

export default function RegionalSettingsPanel({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation(['common', 'settings']);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [outlets, setOutlets] = useState<RestaurantOutlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<string>('');
  const [outletDraft, setOutletDraft] = useState<Partial<RestaurantOutlet>>({});

  const selectedOutlet = useMemo(
    () => outlets.find((outlet) => outlet.id === selectedOutletId) ?? null,
    [outlets, selectedOutletId]
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [prefs, outletList] = await Promise.all([fetchMyPreferences(), fetchOutlets()]);
        if (cancelled) return;

        const nextLanguage = backendLanguageToUi(prefs?.effective_language);
        setLanguage(nextLanguage);
        await i18n.changeLanguage(nextLanguage);
        persistLanguage(nextLanguage);

        setOutlets(outletList);
        const defaultOutlet = outletList.find((outlet) => outlet.id === prefs?.effective_outlet_id)
          ?? outletList.find((outlet) => outlet.is_default)
          ?? outletList[0]
          ?? null;

        if (defaultOutlet) {
          setSelectedOutletId(defaultOutlet.id);
          setOutletDraft(defaultOutlet);
          persistReceiptTemplate(defaultOutlet.receipt_template);
        }
      } catch {
        toast.error('Failed to load regional settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [i18n]);

  useEffect(() => {
    if (!selectedOutlet) return;
    setOutletDraft(selectedOutlet);
    persistReceiptTemplate(selectedOutlet.receipt_template);
  }, [selectedOutlet]);

  const updateLanguagePreference = async (next: SupportedLanguage) => {
    setSaving(true);
    try {
      await updateMyPreferences({
        preferred_language: uiLanguageToBackend(next),
        default_outlet_id: selectedOutletId || null,
      });
      setLanguage(next);
      await i18n.changeLanguage(next);
      persistLanguage(next);
      toast.success('Language updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update language');
    } finally {
      setSaving(false);
    }
  };

  const saveOutlet = async () => {
    if (!selectedOutletId) return;
    setSaving(true);
    try {
      const payload = {
        default_language: uiLanguageToBackend(
          backendLanguageToUi((outletDraft.default_language as string | undefined) ?? 'EN')
        ),
        receipt_template: outletDraft.receipt_template,
        timezone: outletDraft.timezone,
        gstin: outletDraft.gstin,
        state_code: outletDraft.state_code,
        tax_pricing_mode: outletDraft.tax_pricing_mode,
        is_einvoice_enabled: outletDraft.is_einvoice_enabled,
      };
      const updated = await updateOutlet(selectedOutletId, payload as Partial<RestaurantOutlet>);
      setOutlets((prev) => prev.map((outlet) => (outlet.id === updated.id ? updated : outlet)));
      setOutletDraft(updated);
      persistReceiptTemplate(updated.receipt_template);
      toast.success('Outlet settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save outlet settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-slate-900">{t('settings:title')}</h2>
        <p className="text-sm text-slate-500 mt-1">{t('settings:subtitle')}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">{t('settings:userLanguage')}</p>
            <p className="text-xs text-slate-500 mt-1">Language changes apply immediately for this user session.</p>
          </div>

          <div className="space-y-2">
            <Label>{t('common:labels.language')}</Label>
            <Select
              value={language}
              onValueChange={(nextValue) => void updateLanguagePreference(nextValue as SupportedLanguage)}
              disabled={loading || saving}
            >
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.nativeLabel} ({option.label})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('common:labels.outlet')}</Label>
            <Select
              value={selectedOutletId}
              onValueChange={(outletId) => {
                setSelectedOutletId(outletId);
                void updateMyPreferences({ default_outlet_id: outletId });
              }}
              disabled={loading || saving || outlets.length === 0}
            >
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Select outlet" />
              </SelectTrigger>
              <SelectContent>
                {outlets.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">{t('settings:outletDefaults')}</p>
            <p className="text-xs text-slate-500 mt-1">Receipt, GST, and invoice defaults for selected outlet.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('settings:receiptTemplate')}</Label>
              <Select
                value={(outletDraft.receipt_template as string) || 'MM80_STANDARD'}
                onValueChange={(value) => setOutletDraft((prev) => ({ ...prev, receipt_template: value as any }))}
                disabled={!selectedOutletId}
              >
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {receiptOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{t(option.key)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('settings:defaultLanguage')}</Label>
              <Select
                value={backendLanguageToUi((outletDraft.default_language as string | undefined) ?? 'EN')}
                onValueChange={(value) =>
                  setOutletDraft((prev) => ({ ...prev, default_language: uiLanguageToBackend(value as SupportedLanguage) as any }))
                }
                disabled={!selectedOutletId}
              >
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {languageOptions.map((option) => (
                    <SelectItem key={option.code} value={option.code}>{option.nativeLabel} ({option.label})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('settings:gstin')}</Label>
              <Input
                value={outletDraft.gstin ?? ''}
                onChange={(event) => setOutletDraft((prev) => ({ ...prev, gstin: event.target.value.toUpperCase() }))}
                className="h-10 rounded-xl"
                placeholder="27ABCDE1234F1Z5"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings:stateCode')}</Label>
              <Input
                value={outletDraft.state_code ?? ''}
                onChange={(event) => setOutletDraft((prev) => ({ ...prev, state_code: event.target.value }))}
                className="h-10 rounded-xl"
                placeholder="27"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('settings:timezone')}</Label>
              <Input
                value={outletDraft.timezone ?? 'Asia/Kolkata'}
                onChange={(event) => setOutletDraft((prev) => ({ ...prev, timezone: event.target.value }))}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings:taxMode')}</Label>
              <Select
                value={(outletDraft.tax_pricing_mode as TaxPricingMode) || 'TAX_INCLUSIVE'}
                onValueChange={(value) => setOutletDraft((prev) => ({ ...prev, tax_pricing_mode: value as TaxPricingMode }))}
                disabled={!selectedOutletId}
              >
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TAX_INCLUSIVE">{t('settings:taxInclusive')}</SelectItem>
                  <SelectItem value="TAX_EXCLUSIVE">{t('settings:taxExclusive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
            <div>
              <p className="text-sm font-medium text-slate-800">{t('settings:einvoice')}</p>
              <p className="text-xs text-slate-500">Enable IRN/QR generation flow for eligible businesses.</p>
            </div>
            <Switch
              checked={Boolean(outletDraft.is_einvoice_enabled)}
              onCheckedChange={(value) => setOutletDraft((prev) => ({ ...prev, is_einvoice_enabled: value }))}
            />
          </div>

          <Button onClick={() => void saveOutlet()} disabled={!selectedOutletId || saving} className="w-full h-10 rounded-xl">
            {saving ? t('common:actions.refresh') : t('common:actions.save')}
          </Button>
        </div>
      </div>

      {!compact && (
        <p className="text-xs text-slate-500 px-1">
          Bilingual bill printing will use selected language + English when language is not English.
        </p>
      )}
    </div>
  );
}
