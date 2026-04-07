import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { closeDay, fetchOutlets, listDayEnd, unlockDay } from '@/lib/enterprise-api';
import type { DayEndClosure, RestaurantOutlet } from '@/types/enterprise-billing';

function toFixed(value: string | number | null | undefined) {
  const next = Number(value ?? 0);
  return Number.isFinite(next) ? next.toFixed(2) : '0.00';
}

function todayBusinessDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function DayEndPage() {
  const { t } = useTranslation(['day_end', 'common']);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [outlets, setOutlets] = useState<RestaurantOutlet[]>([]);
  const [records, setRecords] = useState<DayEndClosure[]>([]);
  const [outletId, setOutletId] = useState('');
  const [businessDate, setBusinessDate] = useState(todayBusinessDate());
  const [actualCash, setActualCash] = useState('0');
  const [actualCard, setActualCard] = useState('0');
  const [actualUpi, setActualUpi] = useState('0');
  const [actualAggregator, setActualAggregator] = useState('0');

  const selectedOutlet = useMemo(
    () => outlets.find((outlet) => outlet.id === outletId) ?? null,
    [outlets, outletId]
  );

  const load = async () => {
    setLoading(true);
    try {
      const [outletList, dayEndList] = await Promise.all([fetchOutlets(), listDayEnd()]);
      setOutlets(outletList);
      const fallbackOutlet = outletList.find((outlet) => outlet.is_default) ?? outletList[0];
      if (!outletId && fallbackOutlet) {
        setOutletId(fallbackOutlet.id);
      }
      setRecords(dayEndList);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load day-end data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submitClose = async () => {
    if (!outletId) {
      toast.error('Select an outlet first');
      return;
    }

    setSaving(true);
    try {
      await closeDay({
        outlet_id: outletId,
        business_date: businessDate,
        actual_cash: Number(actualCash || 0),
        actual_card: Number(actualCard || 0),
        actual_upi: Number(actualUpi || 0),
        actual_aggregator: Number(actualAggregator || 0),
      });
      toast.success('Day-end closed');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to close day-end');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlock = async (row: DayEndClosure) => {
    const reason = window.prompt('Enter unlock reason (required):');
    if (!reason) return;

    try {
      await unlockDay(row.id, reason);
      toast.success('Day-end unlocked');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unlock day-end');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">{t('day_end:title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('day_end:subtitle')}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>{t('common:labels.outlet')}</Label>
            <Select value={outletId} onValueChange={setOutletId} disabled={loading || outlets.length === 0}>
              <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select outlet" /></SelectTrigger>
              <SelectContent>
                {outlets.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id}>{outlet.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('day_end:businessDate')}</Label>
            <Input type="date" value={businessDate} onChange={(event) => setBusinessDate(event.target.value)} className="h-10 rounded-xl" />
          </div>

          <div className="flex items-end">
            <Button className="w-full h-10 rounded-xl" onClick={() => void submitClose()} disabled={saving || !selectedOutlet}>
              {saving ? t('common:actions.refresh') : t('day_end:closeNow')}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 mt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Cash</Label>
            <Input value={actualCash} onChange={(event) => setActualCash(event.target.value)} type="number" min={0} step="0.01" className="h-10 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Card</Label>
            <Input value={actualCard} onChange={(event) => setActualCard(event.target.value)} type="number" min={0} step="0.01" className="h-10 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>UPI</Label>
            <Input value={actualUpi} onChange={(event) => setActualUpi(event.target.value)} type="number" min={0} step="0.01" className="h-10 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Aggregator</Label>
            <Input
              value={actualAggregator}
              onChange={(event) => setActualAggregator(event.target.value)}
              type="number"
              min={0}
              step="0.01"
              className="h-10 rounded-xl"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Outlet</th>
                <th className="text-right px-4 py-3 font-medium">Expected</th>
                <th className="text-right px-4 py-3 font-medium">Actual</th>
                <th className="text-right px-4 py-3 font-medium">Variance</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((row) => {
                const isLocked = row.status === 'LOCKED';
                return (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{row.business_date.slice(0, 10)}</td>
                    <td className="px-4 py-3">{row.outlet?.name || '-'}</td>
                    <td className="px-4 py-3 text-right">{toFixed(row.expected_total)}</td>
                    <td className="px-4 py-3 text-right">{toFixed(row.actual_total)}</td>
                    <td className={`px-4 py-3 text-right ${Number(row.variance_total) === 0 ? 'text-slate-600' : 'text-rose-600'}`}>
                      {toFixed(row.variance_total)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          row.status === 'CLOSED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : row.status === 'LOCKED'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {t(`day_end:status.${row.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isLocked ? (
                        <Button variant="outline" className="h-8 rounded-lg" onClick={() => void handleUnlock(row)}>
                          {t('day_end:unlock')}
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {records.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    {loading ? t('common:labels.loading') : 'No day-end records yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
