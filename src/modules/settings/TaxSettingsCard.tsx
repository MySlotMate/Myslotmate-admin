import React, { useEffect, useState } from 'react';
import { Check, Download } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  addTaxDeposit,
  fetchPlatformBalance,
  fetchTaxReportCSV,
  fetchTaxSettings,
  updateTaxSettings,
  type PlatformTaxBalance,
  type TaxSettings,
} from '../../api/settings';

// Statutory tax on host payouts (Marketing Boost v2, Phase 1). Two switches,
// flipped in order at rollout: start stamping TCS/TDS on new bookings, then
// require a PAN before withdrawals. Plus the finance month-end tools: the tax
// report and the challan log that releases held tax from platform withdrawals.

const rupees = (cents: number) =>
  `₹${(cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const lastMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const INPUT =
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-brand-400';

function Switch({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-3">
      <span>
        <span className="block text-sm font-bold text-ink">{label}</span>
        <span className="block text-xs text-mist mt-0.5">{hint}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        className="mt-1 h-5 w-5 accent-brand-600"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export const TaxSettingsCard: React.FC = () => {
  const [cfg, setCfg] = useState<TaxSettings | null>(null);
  const [balance, setBalance] = useState<PlatformTaxBalance | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [month, setMonth] = useState(lastMonth());
  const [downloading, setDownloading] = useState(false);

  const [dep, setDep] = useState({ kind: 'tcs' as 'tcs' | 'tds', period: lastMonth(), amount: '', challan: '' });
  const [depSaving, setDepSaving] = useState(false);
  const [depMsg, setDepMsg] = useState<string | null>(null);

  const loadBalance = () =>
    fetchPlatformBalance()
      .then(setBalance)
      .catch(() => setBalance(null));

  useEffect(() => {
    fetchTaxSettings()
      .then(setCfg)
      .catch(() => setError('Could not load the tax settings.'));
    void loadBalance();
  }, []);

  const save = async (next: TaxSettings) => {
    setSaving(true);
    setError(null);
    try {
      await updateTaxSettings(next);
      setCfg(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save the tax settings.');
    } finally {
      setSaving(false);
    }
  };

  const download = async () => {
    setDownloading(true);
    setError(null);
    try {
      const csv = await fetchTaxReportCSV(month);
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `tax-report-${month}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download the tax report.');
    } finally {
      setDownloading(false);
    }
  };

  const logDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(dep.amount);
    if (!Number.isFinite(n) || n <= 0) {
      setDepMsg('Enter the challan amount in rupees.');
      return;
    }
    setDepSaving(true);
    setDepMsg(null);
    try {
      await addTaxDeposit({
        kind: dep.kind,
        period: dep.period,
        amount_cents: Math.round(n * 100),
        challan_ref: dep.challan.trim() || undefined,
        deposited_at: new Date().toISOString(),
      });
      setDep({ ...dep, amount: '', challan: '' });
      setDepMsg('Deposit logged.');
      void loadBalance();
    } catch (err) {
      setDepMsg(err instanceof Error ? err.message : 'Failed to log the deposit.');
    } finally {
      setDepSaving(false);
    }
  };

  return (
    <Card className="p-6 col-span-full">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h3 className="text-lg font-bold text-ink">Statutory tax on host payouts</h3>
          <p className="text-xs text-mist mt-0.5">
            GST TCS (Section 52 CGST Act) on GST-registered hosts and income-tax TDS (Section 194-O) on companies
            and on individuals past {cfg ? rupees(cfg.tds_threshold_cents) : '₹5,00,000'} a year. Deducted from the
            host&apos;s share on each new booking and credited to their GSTIN / PAN. Turn on stamping first, give
            hosts time to add a PAN, then require it.
          </p>
        </div>
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>

      {cfg && (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <Switch
            label="Deduct TCS/TDS on new bookings"
            hint={`TCS ${cfg.tcs_bps / 100}% · TDS ${cfg.tds_bps / 100}% · Existing bookings are not changed.`}
            checked={cfg.enabled}
            disabled={saving}
            onChange={(v) => void save({ ...cfg, enabled: v })}
          />
          <Switch
            label="Require a PAN before withdrawals"
            hint="Hosts without a tax profile are asked for their PAN; Tuesday auto payouts skip them."
            checked={cfg.require_pan_for_withdrawal}
            disabled={saving}
            onChange={(v) => void save({ ...cfg, require_pan_for_withdrawal: v })}
          />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Monthly tax report</h4>
          <p className="text-xs text-mist mt-1">
            Per host: PAN, GSTIN, gross, refunds, net, TCS (CGST / SGST / IGST) and TDS. File GSTR-8 by the 10th.
          </p>
          <div className="mt-3 flex items-end gap-3">
            <input type="month" className={INPUT} value={month} onChange={(e) => setMonth(e.target.value)} />
            <Button variant="primary" size="sm" type="button" disabled={downloading || !month} onClick={() => void download()}>
              <Download className="h-4 w-4" /> {downloading ? 'Preparing…' : 'Download CSV'}
            </Button>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Tax held for the government</h4>
          {balance ? (
            <p className="text-sm text-ink mt-1">
              Owed <span className="font-bold">{rupees(balance.tax_liability_cents)}</span> · Platform can withdraw{' '}
              <span className="font-bold">{rupees(balance.withdrawable_cents)}</span>
            </p>
          ) : (
            <p className="text-xs text-mist mt-1">Balance unavailable.</p>
          )}
          <form onSubmit={(e) => void logDeposit(e)} className="mt-3 flex flex-wrap items-end gap-2">
            <select
              className={INPUT}
              value={dep.kind}
              onChange={(e) => setDep({ ...dep, kind: e.target.value as 'tcs' | 'tds' })}
            >
              <option value="tcs">TCS</option>
              <option value="tds">TDS</option>
            </select>
            <input
              type="month"
              className={INPUT}
              value={dep.period}
              onChange={(e) => setDep({ ...dep, period: e.target.value })}
            />
            <input
              className={`${INPUT} w-28`}
              type="number"
              min={0}
              step={0.01}
              placeholder="₹ amount"
              value={dep.amount}
              onChange={(e) => setDep({ ...dep, amount: e.target.value })}
            />
            <input
              className={`${INPUT} w-36`}
              placeholder="Challan ref"
              value={dep.challan}
              onChange={(e) => setDep({ ...dep, challan: e.target.value })}
            />
            <Button variant="secondary" size="sm" type="submit" disabled={depSaving}>
              {depSaving ? 'Saving…' : 'Log deposit'}
            </Button>
          </form>
          {depMsg && <p className="mt-2 text-xs font-semibold text-slate-600">{depMsg}</p>}
        </div>
      </div>

      {error && <p className="mt-3 text-xs font-semibold text-rose-600">{error}</p>}
    </Card>
  );
};
