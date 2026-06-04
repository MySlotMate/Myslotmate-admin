import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const PaymentsDirectory: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-700">Payments & finance</p>
          <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            Watch cash flow, payouts, refunds, and platform margin.
          </h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => alert('Launching payout batch settlement process...')}>
            Reconcile payout batch
          </Button>
          <Button variant="primary" onClick={() => alert('Downloading settlement report pdf...')}>
            Download settlement report
          </Button>
        </div>
      </div>

      {/* Financial stats cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="p-5">
          <p className="text-sm text-slate-500 font-medium">Gross Transaction Value</p>
          <p className="mt-3 text-3xl font-extrabold text-ink">$3.12M</p>
          <p className="mt-2 text-xs font-bold text-emerald-600">+16.2% MOM</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500 font-medium">Platform Commission</p>
          <p className="mt-3 text-3xl font-extrabold text-ink">$612.5k</p>
          <p className="mt-2 text-xs font-bold text-emerald-600">19.6% blended rate</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500 font-medium">Host Payouts</p>
          <p className="mt-3 text-3xl font-extrabold text-ink">$2.31M</p>
          <p className="mt-2 text-xs font-bold text-slate-500">Scheduled next Friday</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500 font-medium">Refunds</p>
          <p className="mt-3 text-3xl font-extrabold text-ink">$48.2k</p>
          <p className="mt-2 text-xs font-bold text-rose-600">1.5% of GTV</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500 font-medium">Net Revenue</p>
          <p className="mt-3 text-3xl font-extrabold text-ink">$564.3k</p>
          <p className="mt-2 text-xs font-bold text-emerald-600">Margin stable</p>
        </Card>
      </div>

      {/* SVG Charts section */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-ink">Revenue trend</h3>
              <p className="text-xs text-mist mt-0.5">Gross volume and commission trends.</p>
            </div>
            <span className="inline-flex items-center rounded-full border border-brand-100 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 cursor-pointer transition hover:border-brand-300 hover:text-brand-700 select-none">Monthly</span>
          </div>

          <div className="mt-6 rounded-3xl bg-slate-50/80 p-5">
            <div className="flex h-56 items-end gap-3 w-full">
              {[26, 35, 43, 50, 63, 67, 74, 86].map((height, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div 
                    className="w-full rounded-t-xl bg-gradient-to-b from-brand-300 to-brand-600 transition-all duration-300"
                    style={{ height: `${height}%` }}
                  />
                  <span className="mt-2 text-[10px] font-bold text-slate-400">M{idx + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-ink">Payout readiness</h3>
              <p className="text-xs text-mist mt-0.5">Payout queues and reserve holds.</p>
            </div>
            <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[11px] font-bold text-brand-700 cursor-pointer transition hover:border-brand-300 hover:text-brand-700 select-none">Weekly</span>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">Ready for payout</span>
                <span className="text-ink">$742k</span>
              </div>
              <div className="h-3 w-full rounded-full bg-brand-100">
                <div className="h-3 w-[78%] rounded-full bg-emerald-500" />
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">Under review</span>
                <span className="text-ink">$81k</span>
              </div>
              <div className="h-3 w-full rounded-full bg-brand-100">
                <div className="h-3 w-[22%] rounded-full bg-amber-400" />
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">Refund reserve</span>
                <span className="text-ink">$19k</span>
              </div>
              <div className="h-3 w-full rounded-full bg-brand-100">
                <div className="h-3 w-[10%] rounded-full bg-rose-400" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
