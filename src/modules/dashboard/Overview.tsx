import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarRange, Users, Ticket, IndianRupee, Wallet,
  ArrowUpRight, TrendingUp, ChevronRight, AlertCircle, Trophy, Flame,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { fetchDashboardStats, type DashboardStats } from '../../api/dashboard';

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatCount = (n: number) => n.toLocaleString('en-IN');

// Indian-style compact currency for big numbers (Lakh / Crore).
const formatINR = (n: number) => {
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(2)} L`;
  return n.toLocaleString('en-IN');
};

const statusColor = (status: string): 'green' | 'blue' | 'amber' | 'rose' => {
  switch (status) {
    case 'Confirmed': return 'green';
    case 'Paid': return 'blue';
    case 'Pending': return 'amber';
    case 'Cancelled':
    case 'Refunded': return 'rose';
    default: return 'blue';
  }
};

export const Overview: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await fetchDashboardStats());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-mist">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          <p className="text-xs font-bold uppercase tracking-[0.22em]">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className="p-10 text-center">
        <p className="font-semibold text-rose-600">{error ?? 'No dashboard data.'}</p>
        <Button variant="secondary" className="mt-4" onClick={() => void loadStats()}>Retry</Button>
      </Card>
    );
  }

  const kpis = [
    { label: 'Total Events', value: formatCount(stats.totalEvents), icon: CalendarRange, wrap: 'bg-brand-50', color: 'text-brand-600', to: '/experiences', hint: 'Live & draft experiences' },
    { label: 'Total Hosts', value: formatCount(stats.totalHosts), icon: Users, wrap: 'bg-sky-50', color: 'text-sky-600', to: '/hosts', hint: 'Approved & pending' },
    { label: 'Total Bookings', value: formatCount(stats.totalBookings), icon: Ticket, wrap: 'bg-violet-50', color: 'text-violet-600', to: '/bookings', hint: 'All-time reservations' },
    { label: 'Total Revenue', value: formatINR(stats.totalRevenue), icon: IndianRupee, wrap: 'bg-emerald-50', color: 'text-emerald-600', to: '/bookings', hint: 'Gross booking value', rupee: true },
    { label: 'Platform Income', value: formatINR(stats.platformIncome), icon: Wallet, wrap: 'bg-amber-50', color: 'text-amber-600', to: '/payments', hint: 'Our net service fees', rupee: true },
  ];

  const monthlyTotal = stats.monthlyBookings.reduce((s, m) => s + m.count, 0);
  const lastM = stats.monthlyBookings[stats.monthlyBookings.length - 1]?.count ?? 0;
  const prevM = stats.monthlyBookings[stats.monthlyBookings.length - 2]?.count ?? 0;
  const trendPct = prevM > 0 ? Math.round(((lastM - prevM) / prevM) * 100) : lastM > 0 ? 100 : 0;
  const trendUp = trendPct > 0;
  const trendDown = trendPct < 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-xl font-semibold tracking-tight text-ink md:text-2xl">Marketplace at a glance</h3>
        <p className="text-[11px] font-semibold text-slate-400">Updated just now</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <button
              key={k.label}
              onClick={() => navigate(k.to)}
              className="group rounded-2xl border border-brand-100/70 bg-white/95 p-3 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-panel cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${k.wrap} ${k.color}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:text-brand-500" />
              </div>
              <p className="mt-2 flex items-center gap-0.5 text-xl font-extrabold tracking-tight text-ink">
                {k.rupee && <IndianRupee className="h-4 w-4 stroke-[2.5]" />}
                {k.value}
              </p>
              <p className="text-[11px] font-bold text-slate-500">{k.label}</p>
            </button>
          );
        })}
      </div>

      {/* Monthly bookings + Recently booked */}
      <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
        {/* Monthly bookings chart */}
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
                <TrendingUp className="h-4 w-4 text-brand-500" /> Monthly bookings
              </h3>
              <p className="mt-1 text-xs text-mist">
                <span className="font-extrabold text-ink">{formatCount(monthlyTotal)}</span> in the last {stats.monthlyBookings.length} months
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${trendUp ? 'bg-emerald-50 text-emerald-600' : trendDown ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                {trendUp && <ArrowUpRight className="h-3 w-3" />}
                {trendDown && <ArrowUpRight className="h-3 w-3 rotate-90" />}
                {trendPct > 0 ? '+' : ''}{trendPct}%
              </span>
              <button
                onClick={() => navigate('/bookings')}
                className="inline-flex items-center gap-1 rounded-full border border-brand-100 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 transition hover:border-brand-300 hover:text-brand-700 cursor-pointer"
              >
                View <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          <MonthlyBookingsChart data={stats.monthlyBookings} onSelect={() => navigate('/bookings')} />
        </Card>

        {/* Recently booked */}
        <Card className="flex flex-col p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-ink">Recently booked</h3>
            <button
              onClick={() => navigate('/bookings')}
              className="inline-flex items-center gap-1 rounded-full border border-brand-100 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 transition hover:border-brand-300 hover:text-brand-700 cursor-pointer"
            >
              View all <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="mt-3 space-y-1">
            {stats.recentBookings.map((b) => (
              <button
                key={b.id}
                onClick={() => navigate('/bookings')}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left transition hover:bg-brand-50/50 cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-ink">{b.user}</p>
                  <p className="truncate text-[11px] font-semibold text-slate-400">{b.experience}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="inline-flex items-center gap-0.5 text-[13px] font-extrabold text-ink">
                    {b.amount > 0 ? <><IndianRupee className="h-3 w-3 stroke-[2.5]" />{formatCount(b.amount)}</> : <span className="text-emerald-600">Free</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-400">{b.date}</span>
                    <Badge color={statusColor(b.status)}>{b.status}</Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Ops queue + leaderboards */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Needs attention */}
        <Card className="p-4">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
            <AlertCircle className="h-4 w-4 text-amber-500" /> Needs attention
          </h3>
          <div className="mt-3 space-y-2">
            <AttentionRow label="Hosts pending approval" sub="Applications awaiting review" count={stats.attention.pendingHosts} onClick={() => navigate('/hosts')} />
            <AttentionRow label="Events to review" sub="Draft & paused experiences" count={stats.attention.reviewEvents} onClick={() => navigate('/experiences')} />
            <AttentionRow label="Refunds & cancellations" sub="Bookings to reconcile" count={stats.attention.refundsToReview} onClick={() => navigate('/bookings')} />
          </div>
        </Card>

        {/* Top hosts */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
              <Trophy className="h-4 w-4 text-amber-500" /> Top hosts
            </h3>
            <button onClick={() => navigate('/hosts')} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 transition hover:text-brand-700 cursor-pointer">
              All <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-3 space-y-1">
            {stats.topHosts.map((h, i) => (
              <button
                key={h.id}
                onClick={() => navigate(`/hosts/${h.id}`)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-brand-50/50 cursor-pointer"
              >
                <Rank i={i} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-ink">{h.name}</p>
                  <p className="truncate text-[11px] font-semibold text-slate-400">{h.city}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-0.5 text-[13px] font-extrabold text-ink">
                  <IndianRupee className="h-3 w-3 stroke-[2.5]" />{formatINR(h.revenue)}
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* Top experiences */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
              <Flame className="h-4 w-4 text-rose-500" /> Top experiences
            </h3>
            <button onClick={() => navigate('/experiences')} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 transition hover:text-brand-700 cursor-pointer">
              All <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-3 space-y-1">
            {stats.topExperiences.map((e, i) => (
              <button
                key={e.id}
                onClick={() => navigate('/experiences')}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-brand-50/50 cursor-pointer"
              >
                <Rank i={i} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-ink">{e.title}</p>
                  <p className="truncate text-[11px] font-semibold text-slate-400">{e.hostName}</p>
                </div>
                <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-extrabold text-brand-700">{formatCount(e.bookings)}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ── Monthly bookings area chart (responsive SVG) ──────────────────────────────

const MonthlyBookingsChart: React.FC<{ data: { month: string; count: number }[]; onSelect: () => void }> = ({ data, onSelect }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 200;
  const padL = 30, padR = 14, padT = 18, padB = 26;
  const w = Math.max(width, 1);
  const innerW = Math.max(w - padL - padR, 1);
  const innerH = H - padT - padB;
  const max = Math.max(...data.map((d) => d.count), 1);

  const xAt = (i: number) => (data.length <= 1 ? padL + innerW / 2 : padL + (i / (data.length - 1)) * innerW);
  const yAt = (v: number) => padT + innerH - (v / max) * innerH;

  const pts = data.map((d, i) => ({ x: xAt(i), y: yAt(d.count), month: d.month, count: d.count, i }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const base = (padT + innerH).toFixed(1);
  const area = pts.length ? `${line} L${pts[pts.length - 1].x.toFixed(1)} ${base} L${pts[0].x.toFixed(1)} ${base} Z` : '';
  const segW = innerW / Math.max(data.length, 1);

  return (
    <div ref={ref} className="relative mt-4 w-full select-none">
      <svg width={w} height={H}>
        <defs>
          <linearGradient id="mbFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-400)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-brand-400)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* gridlines + y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const gy = padT + innerH - f * innerH;
          return (
            <g key={f}>
              <line x1={padL} y1={gy} x2={w - padR} y2={gy} stroke="#eef2f7" strokeWidth="1" />
              <text x={padL - 6} y={gy + 3} textAnchor="end" fontSize="9" fontWeight="700" fill="#94a3b8">{Math.round(max * f)}</text>
            </g>
          );
        })}

        {area && <path d={area} fill="url(#mbFill)" />}
        {pts.length > 1 && <path d={line} fill="none" stroke="var(--color-brand-600)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}

        {hover !== null && (
          <line x1={pts[hover].x} y1={padT} x2={pts[hover].x} y2={padT + innerH} stroke="var(--color-brand-300)" strokeWidth="1" strokeDasharray="3 3" />
        )}

        {pts.map((p) => (
          <circle key={`d${p.i}`} cx={p.x} cy={p.y} r={hover === p.i ? 5 : 3.5} fill="#fff" stroke="var(--color-brand-600)" strokeWidth="2.5" />
        ))}

        {pts.map((p) => (
          <text key={`x${p.i}`} x={p.x} y={H - 8} textAnchor="middle" fontSize="10" fontWeight="700" fill="#94a3b8">{p.month}</text>
        ))}

        {/* hover / click hit areas */}
        {pts.map((p) => (
          <rect
            key={`h${p.i}`}
            x={p.x - segW / 2}
            y={padT}
            width={segW}
            height={innerH}
            fill="transparent"
            className="cursor-pointer"
            onMouseEnter={() => setHover(p.i)}
            onMouseLeave={() => setHover(null)}
            onClick={onSelect}
          />
        ))}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-ink px-2 py-1 text-[10px] font-bold text-white shadow"
          style={{ left: pts[hover].x, top: pts[hover].y - 8 }}
        >
          {formatCount(pts[hover].count)} bookings
        </div>
      )}
    </div>
  );
};

// ── Widget helpers ──────────────────────────────────────────────────────────

const AttentionRow: React.FC<{ label: string; sub: string; count: number; onClick: () => void }> = ({ label, sub, count, onClick }) => (
  <button
    onClick={onClick}
    className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-left transition hover:bg-brand-50 cursor-pointer"
  >
    <div className="min-w-0">
      <p className="truncate text-[13px] font-bold text-ink">{label}</p>
      <p className="truncate text-[11px] font-semibold text-slate-400">{sub}</p>
    </div>
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-extrabold ${count > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>
      {count}
    </span>
  </button>
);

const Rank: React.FC<{ i: number }> = ({ i }) => {
  const tone = i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400';
  return <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${tone}`}>{i + 1}</span>;
};
