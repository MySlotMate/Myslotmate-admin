import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { BOOST_PLAN_ENABLED, boostPlanApi as api, type Band, type BandVersion, type BoostSettings as Settings } from '../../api/boostPlan';
import { pct, rupees } from './format';

// Boost settings (PRD: Boost settings): the marketing fee bands by version and
// the ad budget rules. A new band version applies to proposals sent after it is
// published; Boosts already proposed keep their version.

const INPUT =
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-brand-400';

const priceLabel = (b: Band) =>
  b.max_price_cents === null ? `${rupees(b.min_price_cents)} and over` : `${rupees(b.min_price_cents)}–${rupees(b.max_price_cents)}`;

export const BoostSettings: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [versions, setVersions] = useState<BandVersion[]>([]);
  const [draft, setDraft] = useState<Band[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    Promise.all([api.getSettings(), api.getBands()])
      .then(([s, v]) => {
        setSettings(s);
        setVersions([...v].sort((a, b) => b.version - a.version));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load the settings.'));

  useEffect(() => {
    void load();
  }, []);

  const run = async (what: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(what);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  if (!BOOST_PLAN_ENABLED) return <Card className="p-6 text-sm text-mist">The paid-budget Boost isn&apos;t switched on yet.</Card>;

  if (!settings && !error) return <Card className="p-6 text-sm text-mist">Loading…</Card>;

  const latest = versions[0];
  // The newest version is the one proposals use.
  const live = versions[0];
  const editBand = (i: number, k: 'guide_rate_bps' | 'min_rate_bps' | 'max_rate_bps', pctValue: string) =>
    setDraft((d) => (d ? d.map((b, j) => (j === i ? { ...b, [k]: Math.round(Number(pctValue) * 100) } : b)) : d));
  const bandProblem = draft?.find((b) => b.min_rate_bps > b.guide_rate_bps || b.guide_rate_bps > b.max_rate_bps)
    ? 'In each band the guide must sit between the lowest and highest rate.'
    : null;

  type NumKey = Exclude<keyof Settings, 'budget_required' | 'updated_at'>;
  const num = (k: NumKey, scale = 1) => (
    <input
      className={`${INPUT} w-28`}
      type="number"
      min={0}
      value={settings ? (settings[k] ?? 0) / scale : ''}
      onChange={(e) => settings && setSettings({ ...settings, [k]: Math.round(Number(e.target.value) * scale) })}
    />
  );

  return (
    <div className="space-y-6">
      <Link to="/boosts" className="inline-flex items-center gap-1 text-xs font-bold text-mist hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All Boosts
      </Link>
      <div>
        <h2 className="text-xl font-black text-ink">Boost settings</h2>
        <p className="text-sm text-mist">The marketing fee bands and the ad budget rules hosts see when they plan a Boost.</p>
      </div>
      {notice && (
        <p className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
          <Check className="h-4 w-4" /> {notice}
        </p>
      )}
      {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}

      {settings && (
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-ink">Paid ad budget</h3>
              <p className="mt-0.5 max-w-2xl text-xs text-mist">
                {settings.budget_required
                  ? 'On: every new Boost needs an ad budget the host pays upfront. Boosts started before keep their old terms.'
                  : 'Off: new Boosts still use the old terms (no budget, commission only). Turn on to launch the paid ad budget.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge color={settings.budget_required ? 'green' : 'slate'} withDot>
                {settings.budget_required ? 'On' : 'Off'}
              </Badge>
              <Button
                variant={settings.budget_required ? 'outline' : 'primary'}
                size="sm"
                type="button"
                disabled={busy}
                onClick={() => {
                  const next = !settings.budget_required;
                  if (
                    window.confirm(
                      next
                        ? 'Turn on the paid ad budget? From now on, every new Boost needs a budget the host pays upfront.'
                        : 'Turn off the paid ad budget? New Boosts go back to the old terms.',
                    )
                  )
                    void run(next ? 'Paid ad budget is on.' : 'Paid ad budget is off.', () =>
                      api.saveSettings({ ...settings, budget_required: next }),
                    );
                }}
              >
                {settings.budget_required ? 'Turn off' : 'Turn on'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-ink">Marketing fee bands</h3>
            <p className="mt-0.5 text-xs text-mist">
              The fee on each ticket sold while a Boost is live: the higher the ticket price, the lower the fee. Proposals
              use the latest published version.
            </p>
          </div>
          {!draft && latest && (
            <Button variant="outline" size="sm" type="button" disabled={busy} onClick={() => setDraft(latest.bands.map((b) => ({ ...b })))}>
              New version
            </Button>
          )}
        </div>

        {(draft ? [{ version: (latest?.version ?? 0) + 1, published_at: null, bands: draft } as BandVersion] : versions.slice(0, 2)).map((v) => (
          <div key={v.version} className="mt-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
              Version {v.version}
              {draft ? (
                <Badge color="amber">Draft</Badge>
              ) : v === live ? (
                <Badge color="green">In use</Badge>
              ) : (
                <Badge color="slate">Earlier</Badge>
              )}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-2 pr-3">Ticket price</th>
                    <th className="py-2 pr-3 text-right">Guide</th>
                    <th className="py-2 pr-3 text-right">Lowest</th>
                    <th className="py-2 text-right">Highest</th>
                  </tr>
                </thead>
                <tbody>
                  {v.bands.map((b, i) => (
                    <tr key={b.min_price_cents} className="border-b border-slate-100">
                      <td className="py-2 pr-3 font-semibold text-ink">{priceLabel(b)}</td>
                      {(['guide_rate_bps', 'min_rate_bps', 'max_rate_bps'] as const).map((k) => (
                        <td key={k} className="py-2 pr-3 text-right tabular-nums">
                          {draft ? (
                            <input
                              className={`${INPUT} w-20 text-right`}
                              type="number"
                              step={0.5}
                              min={0}
                              max={30}
                              aria-label={`${priceLabel(b)} ${k.replace('_rate_bps', '')} %`}
                              value={b[k] / 100}
                              onChange={(e) => editBand(i, k, e.target.value)}
                            />
                          ) : (
                            pct(b[k])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {draft && (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            {bandProblem && <p className="mr-auto text-xs font-semibold text-rose-600">{bandProblem}</p>}
            <Button variant="secondary" size="sm" type="button" disabled={busy} onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="button"
              disabled={busy || !!bandProblem}
              onClick={() => {
                if (window.confirm('Publish these bands? New proposals use them from now on; Boosts already proposed keep theirs.'))
                  void run('New bands published.', async () => {
                    await api.publishBands(draft);
                    setDraft(null);
                  });
              }}
            >
              Publish version
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-bold text-ink">Ad budget rules</h3>
        <p className="mt-0.5 text-xs text-mist">What a host must plan, how long they have to pay, and upload limits for creatives.</p>
        {settings && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
              Minimum daily budget (₹)
              {num('min_daily_budget_cents', 100)}
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
              Daily budget steps (₹)
              {num('budget_step_cents', 100)}
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
              Minimum days
              {num('min_days')}
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
              Days to pay after accepting
              {num('payment_window_days')}
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
              GST on the budget (%)
              {num('budget_gst_bps', 100)}
            </label>
            <span className="hidden sm:block" />
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
              Largest image (MB)
              {num('creative_image_max_mb')}
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
              Largest video (MB)
              {num('creative_video_max_mb')}
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
              Largest brand file (MB)
              {num('creative_other_max_mb')}
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
              Largest report (MB)
              {num('report_max_mb')}
            </label>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button variant="primary" size="sm" type="button" disabled={busy || !settings} onClick={() => settings && void run('Settings saved.', () => api.saveSettings(settings))}>
            Save rules
          </Button>
        </div>
      </Card>
    </div>
  );
};
