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
import { createExportJob, downloadExportJob, fetchOutlets, listExportJobs } from '@/lib/enterprise-api';
import type { ExportDataset, ExportFormat, ExportJob, RestaurantOutlet } from '@/types/enterprise-billing';

const datasets: ExportDataset[] = [
  'ORDERS',
  'SALES',
  'USERS',
  'CUSTOMERS',
  'PRODUCTS',
  'RESERVATIONS',
  'DAY_END',
  'GST_INVOICES',
  'TAX_SUMMARY',
];

const formats: ExportFormat[] = ['CSV', 'XLSX'];

export default function ExportCenterPage() {
  const { t } = useTranslation(['exports', 'common']);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [outlets, setOutlets] = useState<RestaurantOutlet[]>([]);
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [dataset, setDataset] = useState<ExportDataset>('ORDERS');
  const [format, setFormat] = useState<ExportFormat>('CSV');
  const [outletId, setOutletId] = useState<string>('all');
  const [filtersText, setFiltersText] = useState('{"from":"","to":""}');
  const [columnsText, setColumnsText] = useState('');

  const hasRunningJob = useMemo(
    () => jobs.some((job) => job.status === 'QUEUED' || job.status === 'RUNNING'),
    [jobs]
  );

  const load = async () => {
    setLoading(true);
    try {
      const [outletList, jobList] = await Promise.all([fetchOutlets(), listExportJobs()]);
      setOutlets(outletList);
      setJobs(jobList);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load export center');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!hasRunningJob) return;
    const timer = setInterval(() => {
      void load();
    }, 5000);
    return () => clearInterval(timer);
  }, [hasRunningJob]);

  const createJob = async () => {
    setCreating(true);
    try {
      const filters = filtersText.trim() ? JSON.parse(filtersText) as Record<string, unknown> : {};
      const selectedColumns = columnsText
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

      await createExportJob({
        dataset,
        format,
        outlet_id: outletId === 'all' ? null : outletId,
        filters,
        selected_columns: selectedColumns,
      });

      toast.success('Export job queued');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create export job');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">{t('exports:title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('exports:subtitle')}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>{t('exports:dataset')}</Label>
            <Select value={dataset} onValueChange={(value) => setDataset(value as ExportDataset)}>
              <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {datasets.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('exports:format')}</Label>
            <Select value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {formats.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('common:labels.outlet')}</Label>
            <Select value={outletId} onValueChange={setOutletId}>
              <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outlets</SelectItem>
                {outlets.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id}>{outlet.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button className="w-full h-10 rounded-xl" onClick={() => void createJob()} disabled={creating}>
              {creating ? t('common:actions.refresh') : t('exports:createJob')}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('exports:filters')}</Label>
            <Input
              value={filtersText}
              onChange={(event) => setFiltersText(event.target.value)}
              className="h-10 rounded-xl"
              placeholder='{"from":"2026-03-01T00:00:00.000Z","to":"2026-03-31T23:59:59.999Z"}'
            />
          </div>

          <div className="space-y-2">
            <Label>{t('exports:columns')}</Label>
            <Input
              value={columnsText}
              onChange={(event) => setColumnsText(event.target.value)}
              className="h-10 rounded-xl"
              placeholder='id,order_number,total_amount,payment_status'
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="text-left px-4 py-3 font-medium">Dataset</th>
                <th className="text-left px-4 py-3 font-medium">Format</th>
                <th className="text-left px-4 py-3 font-medium">{t('exports:status')}</th>
                <th className="text-left px-4 py-3 font-medium">Message</th>
                <th className="text-right px-4 py-3 font-medium">{t('exports:download')}</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{new Date(job.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium">{job.dataset}</td>
                  <td className="px-4 py-3">{job.format}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        job.status === 'DONE'
                          ? 'bg-emerald-50 text-emerald-700'
                          : job.status === 'FAILED'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{job.error_message || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    {job.status === 'DONE' && job.files?.[0] ? (
                      <Button
                        variant="outline"
                        className="h-8 rounded-lg"
                        onClick={() => void downloadExportJob(job.id, job.files?.[0]?.file_name || undefined)}
                      >
                        {t('exports:download')}
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    {loading ? t('common:labels.loading') : 'No export jobs yet'}
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
