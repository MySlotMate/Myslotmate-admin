import { useEffect, useState } from 'react';
import { apiFetch } from './client';
import type { BoostDetail } from './boosts';

// Boost with a paid ad budget, and Premium Hosts (PRD: Premium Hosts and paid
// Boost marketing). Money in paise, rates in basis points.
//
// The backend serves every route (myslotmate-backend docs/premium-and-paid-
// boost.md). VITE_BOOST_PLAN_MOCK=true swaps in a stand-in kept in this
// browser for trying the screens without it.

const DEV = import.meta.env.DEV;
const flag = (v: string | undefined) => v === 'true' || (v === undefined && DEV);
export const BOOST_PLAN_ENABLED = flag(import.meta.env.VITE_ENABLE_BOOST_PLAN as string | undefined);
/** Test mode, only when asked for: the backend serves every route now. */
export const BOOST_PLAN_MOCK = (import.meta.env.VITE_BOOST_PLAN_MOCK as string | undefined) === 'true';

// ─── Types ──────────────────────────────────────────────────────────────────

export type BudgetStatus = 'unpaid' | 'paid' | 'not_required';

export interface PlanFields {
  pricing_model: 'no_upfront' | 'budget';
  daily_budget_cents: number | null;
  budget_from: string | null; // YYYY-MM-DD
  budget_until: string | null;
  budget_total_cents: number;
  budget_gst_cents: number;
  budget_status: BudgetStatus;
  payment_due_by: string | null;
  spent_cents: number;
  closed_at: string | null;
}

export interface PaymentRow {
  id: string;
  kind: 'budget' | 'top_up';
  amount_cents: number;
  gst_cents: number;
  days_added: number | null;
  method: 'checkout' | 'payment_link' | 'offline';
  status: 'created' | 'paid' | 'failed' | 'expired' | 'reversed';
  reference: string | null;
  link_url: string | null;
  recorded_by: string | null;
  paid_at: string | null;
  created_at: string;
}

export type Channel = 'instagram' | 'facebook' | 'google' | 'whatsapp' | 'influencers';

export interface SpendEntry {
  day: string;
  channel: Channel;
  spend_cents: number;
  impressions: number;
  reach: number;
  clicks: number;
  note?: string | null;
}

export type CreativeType = 'reel' | 'post' | 'story' | 'brand';
export type CreativeStatus =
  | 'submitted'
  | 'in_use'
  | 'needs_changes'
  | 'not_used'
  | 'awaiting_approval'
  | 'approved'
  | 'changes_requested';

export interface StoredFile {
  key: string;
  url: string;
  /** Saves the file instead of showing it (signed, one hour). */
  download_url?: string;
  name: string;
  mime_type: string;
  size: number;
}

export interface Creative {
  id: string;
  type: CreativeType;
  files: StoredFile[];
  caption: string | null;
  uploaded_by_kind: 'host' | 'admin';
  status: CreativeStatus;
  status_note: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  kind: 'update' | 'final';
  title: string;
  covers_from: string | null;
  covers_until: string | null;
  note: string | null;
  file: StoredFile;
  uploaded_by: string | null;
  created_at: string;
}

export interface PlanState extends PlanFields {
  payments: PaymentRow[];
  spend: SpendEntry[];
  reports: Report[];
  creatives: Creative[];
}

export interface BudgetPlanInput {
  daily_budget_cents: number;
  budget_from: string;
  budget_until: string;
}

export type PremiumStatus = 'applied' | 'active' | 'declined' | 'removed';

export interface PremiumMember {
  host_id: string;
  host_name: string;
  host_email: string | null;
  status: PremiumStatus;
  application_note: string | null;
  applied_at: string | null;
  decided_at: string | null;
  decided_by: string | null;
  granted: boolean;
  manager_name: string | null;
  manager_contact: string | null;
  decline_reason: string | null;
  remove_reason: string | null;
}

export interface BoostSettings {
  min_daily_budget_cents: number;
  budget_step_cents: number;
  min_days: number;
  payment_window_days: number;
  budget_gst_bps: number;
  /** The launch switch: new Boosts need a paid ad budget. */
  budget_required: boolean;
  creative_image_max_mb: number;
  creative_video_max_mb: number;
  creative_other_max_mb: number;
  report_max_mb: number;
  updated_at?: string;
}

export interface Band {
  min_price_cents: number;
  max_price_cents: number | null;
  guide_rate_bps: number;
  min_rate_bps: number;
  max_rate_bps: number;
}

export interface BandVersion {
  version: number;
  published_at: string | null;
  bands: Band[];
}

export const GST_BPS = 1800;
export const gstOn = (c: number, bps = GST_BPS) => Math.round((c * bps) / 10_000);

/** The admin's budget rules, read once per page; null until they load. */
export function useBoostSettings(): BoostSettings | null {
  const [s, setS] = useState<BoostSettings | null>(null);
  useEffect(() => {
    if (!BOOST_PLAN_ENABLED) return;
    let live = true;
    boostPlanApi
      .getSettings()
      .then((x) => live && setS(x))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return s;
}
export const daysBetween = (from: string, until: string) =>
  Math.floor((new Date(`${until}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000) + 1;

export const CHANNEL_LABEL: Record<Channel, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  google: 'Google',
  whatsapp: 'WhatsApp',
  influencers: 'Influencers',
};

export const CREATIVE_TYPE_LABEL: Record<CreativeType, string> = {
  reel: 'Reel',
  post: 'Post',
  story: 'Story',
  brand: 'Brand material',
};

export const CREATIVE_STATUS_LABEL: Record<CreativeStatus, string> = {
  submitted: 'Submitted',
  in_use: 'In use',
  needs_changes: 'Needs changes',
  not_used: 'Not used',
  awaiting_approval: 'Waiting for host',
  approved: 'Approved by host',
  changes_requested: 'Host asked for changes',
};

export const PREMIUM_STATUS_LABEL: Record<PremiumStatus, string> = {
  applied: 'Applied',
  active: 'Active',
  declined: 'Declined',
  removed: 'Removed',
};

// ─── Real API (PRD: Backend APIs, admin) ────────────────────────────────────

async function putSigned(path: string, file: File): Promise<StoredFile> {
  const signed = await apiFetch<{ upload_url: string; key: string; url: string }>(path, {
    method: 'POST',
    body: { name: file.name, mime_type: file.type, size: file.size },
  });
  const res = await fetch(signed.upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
  if (!res.ok) throw new Error(`Upload failed (${res.status}).`);
  return { key: signed.key, url: signed.url, name: file.name, mime_type: file.type, size: file.size };
}

/** A payment as the backend sends it (offline_reference, new_daily_budget_cents). */
interface ApiPayment extends Omit<PaymentRow, 'reference' | 'days_added'> {
  days_added: number;
  offline_reference: string | null;
  offline_paid_on: string | null;
  reverse_reason: string | null;
  new_daily_budget_cents: number | null;
}

const toPaymentRow = (p: ApiPayment): PaymentRow => ({
  ...p,
  days_added: p.days_added || null,
  reference: p.offline_reference,
  paid_at: p.paid_at ?? (p.offline_paid_on ? `${p.offline_paid_on}T12:00:00+05:30` : null),
});

/** GET /admin/boosts/{id} already carries the plan fields, payments and spend. */
type PlanDetail = BoostDetail & Partial<PlanFields> & { payments?: ApiPayment[] | null; spend?: SpendEntry[] | null };

/** Bands come as one flat list, each row with its version; group them, newest first. */
const groupBands = (rows: (Band & { version: number })[]): BandVersion[] => {
  const by = new Map<number, Band[]>();
  rows.forEach(({ version, ...b }) => by.set(version, [...(by.get(version) ?? []), b]));
  const versions = [...by.keys()].sort((a, b) => b - a);
  return versions.map((v, i) => ({
    version: v,
    // The newest version is the one proposals use.
    published_at: i === 0 ? 'current' : 'earlier',
    bands: (by.get(v) ?? []).sort((a, b) => a.min_price_cents - b.min_price_cents),
  }));
};

const real = {
  getPlan: async (d: BoostDetail): Promise<PlanState> => {
    const x = d as PlanDetail;
    const [creatives, reports] = await Promise.all([
      apiFetch<Creative[]>(`/admin/boosts/${d.id}/creatives`),
      apiFetch<Report[]>(`/admin/boosts/${d.id}/reports`),
    ]);
    return {
      pricing_model: x.pricing_model ?? 'no_upfront',
      daily_budget_cents: x.daily_budget_cents ?? null,
      budget_from: x.budget_from ?? null,
      budget_until: x.budget_until ?? null,
      budget_total_cents: x.budget_total_cents ?? 0,
      budget_gst_cents: x.budget_gst_cents ?? 0,
      budget_status: x.budget_status ?? 'not_required',
      payment_due_by: x.payment_due_by ?? null,
      spent_cents: x.spent_cents ?? 0,
      closed_at: x.closed_at ?? null,
      payments: (x.payments ?? []).map(toPaymentRow),
      spend: x.spend ?? [],
      // A replaced report stays in the history; show the current ones.
      reports: (reports ?? []).filter((r) => !(r as Report & { replaced_at?: string | null }).replaced_at),
      creatives: creatives ?? [],
    };
  },
  /** The real backend takes the plan with the proposal or start; nothing extra to save. */
  savePlan: (boostId: string, plan: BudgetPlanInput): Promise<void> => {
    void boostId;
    void plan;
    return Promise.resolve();
  },
  sendPaymentLink: (boostId: string, kind: 'budget' | 'top_up', daysAdded?: number) =>
    apiFetch<{ url: string }>(`/admin/boosts/${boostId}/payment-link`, {
      method: 'POST',
      body: { kind, days_added: daysAdded },
    }),
  recordOffline: async (boostId: string, p: { amount_cents: number; paid_on: string; reference: string; kind: 'budget' | 'top_up'; days_added?: number }) =>
    toPaymentRow(await apiFetch<ApiPayment>(`/admin/boosts/${boostId}/payments/offline`, { method: 'POST', body: p })),
  reversePayment: async (boostId: string, paymentId: string, reason: string) =>
    toPaymentRow(await apiFetch<ApiPayment>(`/admin/boosts/${boostId}/payments/${paymentId}/reverse`, { method: 'POST', body: { reason } })),
  saveSpend: (boostId: string, entries: SpendEntry[]) =>
    apiFetch<PlanState>(`/admin/boosts/${boostId}/spend`, { method: 'PUT', body: { entries } }),
  uploadCreative: async (boostId: string, files: File[], body: { type: CreativeType; caption?: string }) => {
    const stored: StoredFile[] = [];
    for (const f of files) stored.push(await putSigned(`/admin/boosts/${boostId}/creatives/upload-url`, f));
    return apiFetch<Creative>(`/admin/boosts/${boostId}/creatives`, {
      method: 'POST',
      body: { ...body, file_keys: stored.map((s) => s.key) },
    });
  },
  setCreativeStatus: (boostId: string, id: string, status: CreativeStatus, note?: string) =>
    apiFetch<Creative>(`/admin/boosts/${boostId}/creatives/${id}/status`, { method: 'POST', body: { status, note } }),
  addReport: async (
    boostId: string,
    file: File,
    body: { kind: 'update' | 'final'; title: string; covers_from?: string; covers_until?: string; note?: string },
  ) => {
    const stored = await putSigned(`/admin/boosts/${boostId}/reports/upload-url`, file);
    return apiFetch<Report>(`/admin/boosts/${boostId}/reports`, { method: 'POST', body: { ...body, file_key: stored.key } });
  },
  close: (boostId: string) => apiFetch<PlanState>(`/admin/boosts/${boostId}/close`, { method: 'POST', body: {} }),

  listPremium: (status: PremiumStatus | '' = '') =>
    apiFetch<{ items: PremiumMember[]; counts: Partial<Record<PremiumStatus, number>> }>(
      `/admin/premium${status ? `?status=${status}` : ''}`,
    ),
  getPremium: async (hostId: string): Promise<PremiumMember | null> => {
    const r = await apiFetch<{ membership: (Omit<PremiumMember, 'status'> & { status: PremiumStatus | 'none' }) | null }>(
      `/admin/premium/${hostId}`,
    );
    const m = r.membership;
    return m && m.status !== 'none' ? (m as PremiumMember) : null;
  },
  approvePremium: (hostId: string, m: { manager_name: string; manager_contact: string }) =>
    apiFetch<PremiumMember>(`/admin/premium/${hostId}/approve`, { method: 'POST', body: m }),
  declinePremium: (hostId: string, reason: string) =>
    apiFetch<PremiumMember>(`/admin/premium/${hostId}/decline`, { method: 'POST', body: { reason } }),
  removePremium: (hostId: string, reason: string) =>
    apiFetch<PremiumMember>(`/admin/premium/${hostId}/remove`, { method: 'POST', body: { reason } }),
  grantPremium: (hostId: string, _hostName: string, m: { manager_name: string; manager_contact: string }) =>
    apiFetch<PremiumMember>(`/admin/premium/${hostId}/grant`, { method: 'POST', body: m }),

  getSettings: () => apiFetch<BoostSettings>('/admin/boost-settings'),
  saveSettings: (s: BoostSettings) => apiFetch<BoostSettings>('/admin/boost-settings', { method: 'PUT', body: s }),
  getBands: async () => groupBands((await apiFetch<(Band & { version: number })[]>('/admin/boost-bands')) ?? []),
  publishBands: async (bands: Band[]): Promise<BandVersion> => {
    const r = await apiFetch<{ version?: number } | number>('/admin/boost-bands', { method: 'POST', body: { bands } });
    const version = typeof r === 'number' ? r : (r?.version ?? 0);
    return { version, published_at: 'current', bands };
  },
};

export type BoostPlanAdminApi = typeof real;

// ─── Stand-in ───────────────────────────────────────────────────────────────

const KEY = 'msm_admin_boost_plan_mock_v1';

interface Overlay {
  plans: Record<string, PlanFields & { payments: PaymentRow[]; spend: SpendEntry[]; reports: Report[]; creatives: Creative[] }>;
  premium: Record<string, PremiumMember>;
  settings: BoostSettings;
  bands: BandVersion[];
}

const DEFAULT_SETTINGS: BoostSettings = {
  min_daily_budget_cents: 50_000,
  budget_step_cents: 10_000,
  min_days: 3,
  payment_window_days: 7,
  budget_gst_bps: 1800,
  budget_required: false,
  creative_image_max_mb: 20,
  creative_video_max_mb: 200,
  creative_other_max_mb: 50,
  report_max_mb: 50,
};

const V2_BANDS: Band[] = [
  { min_price_cents: 0, max_price_cents: 49_999, guide_rate_bps: 1000, min_rate_bps: 800, max_rate_bps: 1200 },
  { min_price_cents: 50_000, max_price_cents: 99_999, guide_rate_bps: 800, min_rate_bps: 600, max_rate_bps: 1000 },
  { min_price_cents: 100_000, max_price_cents: 199_999, guide_rate_bps: 700, min_rate_bps: 500, max_rate_bps: 1000 },
  { min_price_cents: 200_000, max_price_cents: 499_999, guide_rate_bps: 600, min_rate_bps: 500, max_rate_bps: 800 },
  { min_price_cents: 500_000, max_price_cents: null, guide_rate_bps: 500, min_rate_bps: 400, max_rate_bps: 800 },
];

const V1_BANDS: Band[] = [
  { min_price_cents: 0, max_price_cents: 49_999, guide_rate_bps: 2000, min_rate_bps: 2000, max_rate_bps: 2000 },
  { min_price_cents: 50_000, max_price_cents: 99_999, guide_rate_bps: 2000, min_rate_bps: 2000, max_rate_bps: 2000 },
  { min_price_cents: 100_000, max_price_cents: 199_999, guide_rate_bps: 1500, min_rate_bps: 1200, max_rate_bps: 2000 },
  { min_price_cents: 200_000, max_price_cents: 499_999, guide_rate_bps: 1200, min_rate_bps: 1200, max_rate_bps: 2000 },
  { min_price_cents: 500_000, max_price_cents: null, guide_rate_bps: 1200, min_rate_bps: 1200, max_rate_bps: 2000 },
];

const load = (): Overlay => {
  const base: Overlay = {
    plans: {},
    premium: {},
    settings: DEFAULT_SETTINGS,
    bands: [
      { version: 1, published_at: '2026-11-24T00:00:00Z', bands: V1_BANDS },
      { version: 2, published_at: null, bands: V2_BANDS },
    ],
  };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...base, ...(JSON.parse(raw) as Overlay) } : base;
  } catch {
    return base;
  }
};
const save = (o: Overlay) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(o));
  } catch {
    /* storage blocked: the stand-in forgets */
  }
};
const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
const wait = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 200));
const fail = (msg: string) => new Error(msg);
const urls = new Map<string, string>();

function planOf(o: Overlay, d: BoostDetail) {
  if (!o.plans[d.id]) {
    const from = (d.planned_from ?? d.requested_at).slice(0, 10);
    const until = (d.planned_until ?? d.event.time).slice(0, 10);
    const daily = 100_000;
    const total = daily * Math.max(1, daysBetween(from, until));
    o.plans[d.id] = {
      pricing_model: 'budget',
      daily_budget_cents: daily,
      budget_from: from,
      budget_until: until,
      budget_total_cents: total,
      budget_gst_cents: gstOn(total),
      budget_status: 'unpaid',
      payment_due_by: d.accepted_at ? new Date(new Date(d.accepted_at).getTime() + 7 * 86_400_000).toISOString() : null,
      spent_cents: 0,
      closed_at: null,
      payments: [],
      spend: [],
      reports: [],
      creatives: [],
    };
  }
  return o.plans[d.id];
}

function plainFile(f: File): StoredFile {
  const url = URL.createObjectURL(f);
  const key = `mock/${uid()}`;
  urls.set(key, url);
  return { key, url, name: f.name, mime_type: f.type, size: f.size };
}

/** Plans are keyed by Boost id; the stand-in keeps the Boost's own detail out of reach, so it asks for it. */
let lastDetail: BoostDetail | null = null;

const mock: BoostPlanAdminApi = {
  getPlan: async (d) => {
    lastDetail = d;
    const o = load();
    const p = planOf(o, d);
    save(o);
    return wait({ ...p });
  },
  savePlan: async (boostId, plan) => {
    const o = load();
    let p = lastDetail && lastDetail.id === boostId ? planOf(o, lastDetail) : o.plans[boostId];
    if (!p) {
      // Started from "Boost an event": no detail loaded yet.
      p = o.plans[boostId] = {
        pricing_model: 'budget',
        daily_budget_cents: plan.daily_budget_cents,
        budget_from: plan.budget_from,
        budget_until: plan.budget_until,
        budget_total_cents: 0,
        budget_gst_cents: 0,
        budget_status: 'unpaid',
        payment_due_by: null,
        spent_cents: 0,
        closed_at: null,
        payments: [],
        spend: [],
        reports: [],
        creatives: [],
      };
    }
    const total = plan.daily_budget_cents * daysBetween(plan.budget_from, plan.budget_until);
    Object.assign(p, plan, { budget_total_cents: total, budget_gst_cents: gstOn(total) });
    save(o);
  },
  sendPaymentLink: async (boostId, kind, daysAdded) => {
    const o = load();
    const p = o.plans[boostId];
    if (!p) throw fail('Load the Boost first.');
    const base = kind === 'budget' ? p.budget_total_cents : (p.daily_budget_cents ?? 0) * (daysAdded ?? 0);
    const row: PaymentRow = {
      id: uid(),
      kind,
      amount_cents: base + gstOn(base),
      gst_cents: gstOn(base),
      days_added: daysAdded ?? null,
      method: 'payment_link',
      status: 'created',
      reference: null,
      link_url: `https://rzp.io/l/mock${uid().slice(0, 6)}`,
      recorded_by: 'you',
      paid_at: null,
      created_at: now(),
    };
    p.payments.push(row);
    save(o);
    return wait({ url: row.link_url! });
  },
  recordOffline: async (boostId, body) => {
    const o = load();
    const p = o.plans[boostId];
    if (!p) throw fail('Load the Boost first.');
    const row: PaymentRow = {
      id: uid(),
      kind: body.kind,
      amount_cents: body.amount_cents,
      gst_cents: Math.round((body.amount_cents * GST_BPS) / (10_000 + GST_BPS)),
      days_added: body.days_added ?? null,
      method: 'offline',
      status: 'paid',
      reference: body.reference,
      link_url: null,
      recorded_by: 'you',
      paid_at: `${body.paid_on}T12:00:00+05:30`,
      created_at: now(),
    };
    p.payments.push(row);
    if (body.kind === 'budget') p.budget_status = 'paid';
    else if (body.days_added && p.budget_until) {
      const base = (p.daily_budget_cents ?? 0) * body.days_added;
      const u = new Date(`${p.budget_until}T00:00:00Z`);
      u.setUTCDate(u.getUTCDate() + body.days_added);
      p.budget_until = u.toISOString().slice(0, 10);
      p.budget_total_cents += base;
      p.budget_gst_cents += gstOn(base);
    }
    save(o);
    return wait(row);
  },
  reversePayment: async (boostId, paymentId, reason) => {
    const o = load();
    const p = o.plans[boostId];
    const row = p?.payments.find((x) => x.id === paymentId);
    if (!p || !row) throw fail('Payment not found.');
    row.status = 'reversed';
    row.reference = `${row.reference ?? ''} · reversed: ${reason}`;
    if (row.kind === 'budget') p.budget_status = 'unpaid';
    save(o);
    return wait(row);
  },
  saveSpend: async (boostId, entries) => {
    const o = load();
    const p = o.plans[boostId];
    if (!p) throw fail('Load the Boost first.');
    if (p.closed_at) throw fail('This Boost is closed; spend is locked.');
    const merged = new Map(p.spend.map((e) => [`${e.day}|${e.channel}`, e]));
    entries.forEach((e) => merged.set(`${e.day}|${e.channel}`, e));
    const list = [...merged.values()].filter((e) => e.spend_cents || e.reach || e.clicks || e.impressions);
    const total = list.reduce((s, e) => s + e.spend_cents, 0);
    if (total > p.budget_total_cents)
      throw fail(`That takes spend to ₹${total / 100}, over the paid ₹${p.budget_total_cents / 100}.`);
    p.spend = list.sort((a, b) => a.day.localeCompare(b.day));
    p.spent_cents = total;
    save(o);
    return wait({ ...p });
  },
  uploadCreative: async (boostId, files, body) => {
    const o = load();
    const p = o.plans[boostId];
    if (!p) throw fail('Load the Boost first.');
    const c: Creative = {
      id: uid(),
      type: body.type,
      files: files.map(plainFile),
      caption: body.caption ?? null,
      uploaded_by_kind: 'admin',
      status: 'awaiting_approval',
      status_note: null,
      created_at: now(),
    };
    p.creatives.push(c);
    save(o);
    return wait(c);
  },
  setCreativeStatus: async (boostId, id, status, note) => {
    const o = load();
    const c = o.plans[boostId]?.creatives.find((x) => x.id === id);
    if (!c) throw fail('Creative not found.');
    c.status = status;
    c.status_note = note ?? null;
    save(o);
    return wait(c);
  },
  addReport: async (boostId, file, body) => {
    const o = load();
    const p = o.plans[boostId];
    if (!p) throw fail('Load the Boost first.');
    const r: Report = {
      id: uid(),
      kind: body.kind,
      title: body.title,
      covers_from: body.covers_from ?? null,
      covers_until: body.covers_until ?? null,
      note: body.note ?? null,
      file: plainFile(file),
      uploaded_by: 'you',
      created_at: now(),
    };
    p.reports.push(r);
    save(o);
    return wait(r);
  },
  close: async (boostId) => {
    const o = load();
    const p = o.plans[boostId];
    if (!p) throw fail('Load the Boost first.');
    if (!p.reports.some((r) => r.kind === 'final')) throw fail('Attach a final report before closing.');
    p.closed_at = now();
    save(o);
    return wait({ ...p });
  },

  listPremium: async (status = '') => {
    const o = load();
    const all = Object.values(o.premium);
    const counts: Partial<Record<PremiumStatus, number>> = {};
    all.forEach((m) => (counts[m.status] = (counts[m.status] ?? 0) + 1));
    return wait({ items: status ? all.filter((m) => m.status === status) : all, counts });
  },
  getPremium: async (hostId) => wait(load().premium[hostId] ?? null),
  approvePremium: async (hostId, m) => {
    const o = load();
    const x = o.premium[hostId];
    if (!x) throw fail('No application from this host.');
    Object.assign(x, { status: 'active', decided_at: now(), decided_by: 'you', ...m, decline_reason: null });
    save(o);
    return wait(x);
  },
  declinePremium: async (hostId, reason) => {
    const o = load();
    const x = o.premium[hostId];
    if (!x) throw fail('No application from this host.');
    Object.assign(x, { status: 'declined', decided_at: now(), decided_by: 'you', decline_reason: reason });
    save(o);
    return wait(x);
  },
  removePremium: async (hostId, reason) => {
    const o = load();
    const x = o.premium[hostId];
    if (!x) throw fail('This host isn’t Premium.');
    Object.assign(x, { status: 'removed', decided_at: now(), decided_by: 'you', remove_reason: reason });
    save(o);
    return wait(x);
  },
  grantPremium: async (hostId, hostName, m) => {
    const o = load();
    const x: PremiumMember = {
      host_id: hostId,
      host_name: hostName,
      host_email: null,
      status: 'active',
      application_note: null,
      applied_at: null,
      decided_at: now(),
      decided_by: 'you',
      granted: true,
      manager_name: m.manager_name,
      manager_contact: m.manager_contact,
      decline_reason: null,
      remove_reason: null,
      ...(o.premium[hostId] ? { applied_at: o.premium[hostId].applied_at, application_note: o.premium[hostId].application_note } : {}),
    };
    o.premium[hostId] = x;
    save(o);
    return wait(x);
  },

  getSettings: async () => wait(load().settings),
  saveSettings: async (s) => {
    const o = load();
    o.settings = s;
    save(o);
    return wait(s);
  },
  getBands: async () => wait(load().bands),
  publishBands: async (bands) => {
    const o = load();
    const v: BandVersion = { version: Math.max(...o.bands.map((b) => b.version)) + 1, published_at: now(), bands };
    o.bands.push(v);
    save(o);
    return wait(v);
  },
};

/** Test mode: a sample Premium application from a real host, so the Premium page has one to act on. */
export function mockSampleApplication(hostId: string, hostName: string) {
  const o = load();
  o.premium[hostId] = {
    host_id: hostId,
    host_name: hostName,
    host_email: null,
    status: 'applied',
    application_note: 'We run weekend workshops and want to fill them faster.',
    applied_at: now(),
    decided_at: null,
    decided_by: null,
    granted: false,
    manager_name: null,
    manager_contact: null,
    decline_reason: null,
    remove_reason: null,
  };
  save(o);
}

/** Test mode: the host accepts and pays from the website. */
export function mockHostPays(boostId: string) {
  const o = load();
  const p = o.plans[boostId];
  if (!p) return;
  const amount = p.budget_total_cents + p.budget_gst_cents;
  p.payments.push({
    id: uid(),
    kind: 'budget',
    amount_cents: amount,
    gst_cents: p.budget_gst_cents,
    days_added: null,
    method: 'checkout',
    status: 'paid',
    reference: 'pay_mock_checkout',
    link_url: null,
    recorded_by: null,
    paid_at: now(),
    created_at: now(),
  });
  p.budget_status = 'paid';
  save(o);
}

/** Test mode: the host uploads a reel from the website. */
export function mockHostCreative(boostId: string) {
  const o = load();
  const p = o.plans[boostId];
  if (!p) return;
  const svg =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' width='360' height='640'><rect width='360' height='640' fill='#16304c'/><text x='180' y='330' font-family='sans-serif' font-size='26' fill='white' text-anchor='middle'>Host reel</text></svg>",
    );
  p.creatives.push({
    id: uid(),
    type: 'reel',
    files: [{ key: `mock/${uid()}`, url: svg, name: 'host-reel.mp4', mime_type: 'image/svg+xml', size: 1000 }],
    caption: 'Our weekend promo',
    uploaded_by_kind: 'host',
    status: 'submitted',
    status_note: null,
    created_at: now(),
  });
  save(o);
}

export const boostPlanApi: BoostPlanAdminApi = BOOST_PLAN_MOCK ? mock : real;

/** Why go-live is blocked on a paid-budget Boost, or null. */
export function goLiveBlocker(plan: PlanState | null): string | null {
  if (!plan || plan.pricing_model !== 'budget') return null;
  if (plan.budget_status !== 'paid') return 'The ad budget isn’t paid yet.';
  if (!plan.creatives.some((c) => c.status === 'in_use')) return 'Mark at least one creative In use first.';
  return null;
}
