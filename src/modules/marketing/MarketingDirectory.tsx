import React, { useState, useEffect } from 'react';
import { useMockData } from '../../context/MockDataContext';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { fetchEvents, type AdminEvent } from '../../api/directory';
import { fetchMarketingConfig, updateMarketingConfig, type HomepageMarketingConfig } from '../../api/marketing';
import { Search, Star, LayoutGrid, X, Save, Check } from 'lucide-react';

export const MarketingDirectory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'homepage' | 'campaigns'>('homepage');

  // Campaigns state (from MockDataContext)
  const { campaigns, setCampaigns } = useMockData();
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignChannel, setNewCampaignChannel] = useState('Meta ads');
  const [newCampaignSpend, setNewCampaignSpend] = useState('');

  // Homepage settings state
  const [config, setConfig] = useState<HomepageMarketingConfig>({
    featured_limit: 3,
    curated_limit: 8,
    featured_event_ids: [],
    curated_event_ids: [],
  });
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  // Live events (for pinning)
  const [allEvents, setAllEvents] = useState<AdminEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      setConfigLoading(true);
      setEventsLoading(true);
      try {
        const [cfg, eventsRes] = await Promise.all([
          fetchMarketingConfig(),
          fetchEvents({ page: 1, pageSize: 100, status: 'live' }),
        ]);
        setConfig({
          featured_limit: cfg.featured_limit ?? 3,
          curated_limit: cfg.curated_limit ?? 8,
          featured_event_ids: cfg.featured_event_ids ?? [],
          curated_event_ids: cfg.curated_event_ids ?? [],
        });
        setAllEvents(eventsRes.items);
      } catch (err) {
        console.error('Failed to load marketing dashboard data', err);
      } finally {
        setConfigLoading(false);
        setEventsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    setSaveError(null);
    try {
      await updateMarketingConfig(config);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save configuration.');
    } finally {
      setConfigSaving(false);
    }
  };

  const featuredIds = config.featured_event_ids ?? [];
  const curatedIds = config.curated_event_ids ?? [];
  const featuredLimit = config.featured_limit ?? 3;
  const curatedLimit = config.curated_limit ?? 8;

  const toggleFeatured = (id: string) =>
    setConfig(prev => {
      const ids = prev.featured_event_ids ?? [];
      return { ...prev, featured_event_ids: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] };
    });
  const toggleCurated = (id: string) =>
    setConfig(prev => {
      const ids = prev.curated_event_ids ?? [];
      return { ...prev, curated_event_ids: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] };
    });
  const removeFeatured = (id: string) =>
    setConfig(prev => ({ ...prev, featured_event_ids: (prev.featured_event_ids ?? []).filter(x => x !== id) }));
  const removeCurated = (id: string) =>
    setConfig(prev => ({ ...prev, curated_event_ids: (prev.curated_event_ids ?? []).filter(x => x !== id) }));

  const getEventDetails = (id: string) => allEvents.find(e => e.id === id);

  const filteredEvents = allEvents.filter(e =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.hostName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleLaunchCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName || !newCampaignSpend) {
      alert('Please fill out all fields.');
      return;
    }
    const spendVal = parseFloat(newCampaignSpend);
    if (isNaN(spendVal)) {
      alert('Invalid spend amount.');
      return;
    }
    setCampaigns(prev => [
      ...prev,
      { name: newCampaignName, audience: 'New user segment', channel: newCampaignChannel, spend: spendVal, bookings: 0, roas: '0.0x', status: 'Running' },
    ]);
    setNewCampaignName('');
    setNewCampaignSpend('');
    alert(`Campaign "${newCampaignName}" launched successfully!`);
  };

  // ── Compact pinned panel ───────────────────────────────────────────────────
  const renderPinnedPanel = (
    title: string,
    Icon: typeof Star,
    ids: string[],
    limit: number,
    onRemove: (id: string) => void,
    accent: string,
  ) => {
    const over = ids.length > limit;
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-1.5 text-sm font-bold text-ink">
            <Icon className={`h-4 w-4 ${accent}`} /> {title}
          </h4>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${over ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
            {ids.length}/{limit}
          </span>
        </div>
        {over && (
          <p className="mt-1 text-[11px] font-semibold text-amber-600">Only the first {limit} will show on the homepage.</p>
        )}
        {ids.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-center text-[11px] text-slate-400">
            Nothing pinned — live events auto-fill this section by time.
          </div>
        ) : (
          <div className="mt-3 space-y-1.5">
            {ids.map((id, i) => {
              const d = getEventDetails(id);
              const hidden = i >= limit;
              return (
                <div key={id} className={`flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 ${hidden ? 'opacity-50' : ''}`}>
                  <span className="w-4 shrink-0 text-center text-[10px] font-black text-slate-400">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-ink">{d?.title ?? `Event ${id.slice(0, 8)}…`}</p>
                    <p className="truncate text-[10px] font-semibold text-slate-400">{d ? `${d.hostName} · ${d.city}` : 'Not live / not found'}</p>
                  </div>
                  {hidden && <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-amber-600">hidden</span>}
                  <button onClick={() => onRemove(id)} title="Unpin" className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-700">Marketing operations</p>
          <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            Monitor campaign performance, referral loops, and feature placement.
          </h3>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex max-w-md gap-1 rounded-2xl border border-slate-100 bg-white/40 p-1 backdrop-blur-sm">
        {(['homepage', 'campaigns'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 rounded-xl py-2.5 text-center text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === t ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            {t === 'homepage' ? 'Homepage Placement' : 'Campaign Operations'}
          </button>
        ))}
      </div>

      {activeTab === 'homepage' && (
        configLoading ? (
          <Card className="p-10 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
            <p className="mt-3 text-sm font-medium text-slate-400">Loading homepage configuration…</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Sticky control bar: limits + live counts + save */}
            <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-100/80 bg-white/95 px-4 py-3 shadow-soft backdrop-blur">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <Star className="h-3.5 w-3.5 text-amber-500" /> Featured limit
                  <input
                    type="number" min={1} max={10}
                    className="w-16 rounded-lg border border-brand-100 bg-white px-2 py-1.5 text-sm font-bold text-ink outline-none focus:border-brand-400"
                    value={featuredLimit}
                    onChange={(e) => setConfig(p => ({ ...p, featured_limit: parseInt(e.target.value) || 1 }))}
                  />
                  <CountPill count={featuredIds.length} limit={featuredLimit} />
                </label>
                <span className="hidden h-7 w-px bg-slate-200 sm:block" />
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <LayoutGrid className="h-3.5 w-3.5 text-brand-500" /> Discover limit
                  <input
                    type="number" min={1} max={20}
                    className="w-16 rounded-lg border border-brand-100 bg-white px-2 py-1.5 text-sm font-bold text-ink outline-none focus:border-brand-400"
                    value={curatedLimit}
                    onChange={(e) => setConfig(p => ({ ...p, curated_limit: parseInt(e.target.value) || 1 }))}
                  />
                  <CountPill count={curatedIds.length} limit={curatedLimit} />
                </label>
              </div>
              <div className="flex items-center gap-3">
                {saveError && <span className="text-xs font-semibold text-rose-600">{saveError}</span>}
                <Button
                  variant="primary"
                  className={`flex items-center gap-2 ${justSaved ? '!bg-emerald-600 hover:!bg-emerald-600' : ''}`}
                  onClick={handleSaveConfig}
                  disabled={configSaving}
                >
                  {justSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {configSaving ? 'Saving…' : justSaved ? 'Saved' : 'Save'}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Left: searchable live events */}
              <Card className="flex flex-col p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-ink">Live experiences</h4>
                  <span className="text-[11px] font-semibold text-slate-400">{filteredEvents.length} shown</span>
                </div>
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-brand-100 bg-white px-3 py-2 shadow-sm">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    className="w-full bg-transparent text-sm text-slate-700 outline-none"
                    type="search"
                    placeholder="Search by title or host…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {eventsLoading ? (
                  <div className="p-8 text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
                    <p className="mt-2 text-xs text-slate-400">Loading live events…</p>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400">No live events match your search.</div>
                ) : (
                  <div className="max-h-[62vh] space-y-1.5 overflow-y-auto pr-1">
                    {filteredEvents.map((event) => {
                      const isF = featuredIds.includes(event.id);
                      const isC = curatedIds.includes(event.id);
                      return (
                        <div
                          key={event.id}
                          className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 transition ${
                            isF || isC ? 'border-brand-200 bg-brand-50/30' : 'border-slate-100 hover:border-brand-200'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-ink">{event.title}</p>
                            <p className="truncate text-[11px] font-semibold text-slate-400">{event.hostName} · {event.city}</p>
                          </div>
                          <div className="flex shrink-0 gap-1.5">
                            <PinChip active={isF} onClick={() => toggleFeatured(event.id)} Icon={Star} label="Featured" activeClass="border-amber-200 bg-amber-50 text-amber-700" />
                            <PinChip active={isC} onClick={() => toggleCurated(event.id)} Icon={LayoutGrid} label="Discover" activeClass="border-brand-200 bg-brand-50 text-brand-700" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Right: what's on the homepage */}
              <div className="space-y-4">
                {renderPinnedPanel('Featured slideshow', Star, featuredIds, featuredLimit, removeFeatured, 'text-amber-500')}
                {renderPinnedPanel('Discover grid', LayoutGrid, curatedIds, curatedLimit, removeCurated, 'text-brand-500')}
              </div>
            </div>
          </div>
        )
      )}

      {activeTab === 'campaigns' && (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          {/* Campaign List */}
          <Table headers={['Campaign', 'Audience', 'Channel', 'Spend', 'Bookings', 'ROAS', 'Status']}>
            {campaigns.map((camp, idx) => (
              <tr key={idx} className="border-b border-slate-100 last:border-b-0 hover:bg-brand-50/40 transition">
                <td className="px-6 py-4 align-top font-bold text-ink">{camp.name}</td>
                <td className="px-6 py-4 align-top text-slate-600 font-medium">{camp.audience}</td>
                <td className="px-6 py-4 align-top text-slate-500 font-medium">{camp.channel}</td>
                <td className="px-6 py-4 align-top font-extrabold text-ink">${camp.spend.toLocaleString()}</td>
                <td className="px-6 py-4 align-top text-slate-600 font-medium">{camp.bookings}</td>
                <td className="px-6 py-4 align-top font-extrabold text-brand-700">{camp.roas}</td>
                <td className="px-6 py-4 align-top">
                  <Badge color={camp.status === 'Running' ? 'green' : 'blue'}>{camp.status}</Badge>
                </td>
              </tr>
            ))}
          </Table>

          {/* Campaign Creator Form */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-ink">Launch campaign</h3>
            <p className="text-xs text-mist mt-1 mb-5">Distribute codes or banners to target segments.</p>

            <form onSubmit={handleLaunchCampaign} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="campName">Campaign Name</label>
                <input
                  id="campName"
                  className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400"
                  type="text"
                  placeholder="e.g. Summer discounts Delhi"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="campChannel">Channel</label>
                  <select
                    id="campChannel"
                    className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400"
                    value={newCampaignChannel}
                    onChange={(e) => setNewCampaignChannel(e.target.value)}
                  >
                    <option>Meta ads</option>
                    <option>Email + push</option>
                    <option>In-app banner</option>
                    <option>Google search ads</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="campSpend">Budget Spend</label>
                  <input
                    id="campSpend"
                    className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400"
                    type="number"
                    placeholder="e.g. 5000"
                    value={newCampaignSpend}
                    onChange={(e) => setNewCampaignSpend(e.target.value)}
                  />
                </div>
              </div>

              <Button variant="primary" type="submit" className="w-full">
                Launch campaign
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

// ── Small UI helpers ──────────────────────────────────────────────────────────

const CountPill: React.FC<{ count: number; limit: number }> = ({ count, limit }) => {
  const over = count > limit;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${over ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
      {count} pinned
    </span>
  );
};

const PinChip: React.FC<{
  active: boolean;
  onClick: () => void;
  Icon: typeof Star;
  label: string;
  activeClass: string;
}> = ({ active, onClick, Icon, label, activeClass }) => (
  <button
    onClick={onClick}
    title={active ? `Unpin from ${label}` : `Pin to ${label}`}
    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-extrabold transition cursor-pointer ${
      active ? activeClass : 'border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-700'
    }`}
  >
    {active ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
    {label}
  </button>
);
