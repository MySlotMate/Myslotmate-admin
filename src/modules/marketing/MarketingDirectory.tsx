import React, { useState, useEffect, useRef } from 'react';
import { useMockData } from '../../context/MockDataContext';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { fetchEvents, fetchBookings, fetchUsers, bulkNotifyEventGuests, promoteEventToAllUsers, type AdminEvent } from '../../api/directory';
import { fetchMarketingConfig, updateMarketingConfig, type HomepageMarketingConfig } from '../../api/marketing';
import {
  Search, Star, LayoutGrid, X, Save, Check, Loader2, GripVertical, ArrowUp, ArrowDown,
  ChevronDown, ChevronUp, MapPin, Sparkles
} from 'lucide-react';

export const MarketingDirectory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'homepage' | 'campaigns' | 'broadcasts'>('homepage');

  // Broadcast state
  const [selectedEventId, setSelectedEventId] = useState('');
  const [channel, setChannel] = useState<'both' | 'whatsapp' | 'email'>('both');
  // 'guests' = people who already booked this event; 'all' = every registered
  // user, optionally one city (a marketing blast, not a reminder).
  const [audience, setAudience] = useState<'guests' | 'all'>('guests');
  const [audienceCity, setAudienceCity] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [activeBookingsCount, setActiveBookingsCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [activePreviewTab, setActivePreviewTab] = useState<'whatsapp' | 'email'>('whatsapp');

  useEffect(() => {
    if (channel === 'whatsapp') {
      setActivePreviewTab('whatsapp');
    } else if (channel === 'email') {
      setActivePreviewTab('email');
    }
  }, [channel]);

  useEffect(() => {
    if (!selectedEventId) {
      setActiveBookingsCount(null);
      return;
    }
    let alive = true;
    setCountLoading(true);
    async function loadCount() {
      try {
        if (audience === 'all') {
          const usersRes = await fetchUsers({ page: 1, pageSize: 1, city: audienceCity.trim() || undefined });
          if (alive) {
            setActiveBookingsCount(usersRes.total);
          }
          return;
        }
        const [confirmedRes, pendingRes] = await Promise.all([
          fetchBookings({ page: 1, pageSize: 1, status: 'confirmed', eventId: selectedEventId }),
          fetchBookings({ page: 1, pageSize: 1, status: 'pending', eventId: selectedEventId }),
        ]);
        if (alive) {
          setActiveBookingsCount(confirmedRes.total + pendingRes.total);
        }
      } catch (err) {
        console.error('Failed to fetch bookings count for event', err);
        if (alive) {
          setActiveBookingsCount(null);
        }
      } finally {
        if (alive) {
          setCountLoading(false);
        }
      }
    }
    void loadCount();
    return () => {
      alive = false;
    };
  }, [selectedEventId, audience, audienceCity]);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      alert('Please select an experience.');
      return;
    }
    if (audience === 'all' && !broadcastMessage.trim()) {
      alert('A marketing blast needs a message — the reminder template is only for booked guests.');
      return;
    }
    setBroadcastSending(true);
    setBroadcastError(null);
    setBroadcastSuccess(null);
    try {
      const res = audience === 'all'
        ? await promoteEventToAllUsers(selectedEventId, {
            message: broadcastMessage,
            channel: channel,
            city: audienceCity.trim() || undefined,
          })
        : await bulkNotifyEventGuests(selectedEventId, {
            message: broadcastMessage,
            channel: channel,
          });
      setBroadcastSuccess(res.message || `Successfully queued notifications to ${res.notified_count} users.`);
      setBroadcastMessage('');
    } catch (err) {
      setBroadcastError(err instanceof Error ? err.message : 'Failed to send bulk notifications.');
    } finally {
      setBroadcastSending(false);
    }
  };

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

  // Drag and drop reordering state
  const [dragInfo, setDragInfo] = useState<{ listKey: 'featured_event_ids' | 'curated_event_ids'; index: number } | null>(null);

  const saveUpdatedConfig = async (newConfig: HomepageMarketingConfig) => {
    setConfigSaving(true);
    setSaveError(null);
    try {
      await updateMarketingConfig(newConfig);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save configuration.');
    } finally {
      setConfigSaving(false);
    }
  };

  const moveItem = (listKey: 'featured_event_ids' | 'curated_event_ids', fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0) return;
    const list = [...(config[listKey] ?? [])];
    if (toIdx < 0 || toIdx >= list.length) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    const newConfig = { ...config, [listKey]: list };
    setConfig(newConfig);
    void saveUpdatedConfig(newConfig);
  };

  const handleDragStart = (listKey: 'featured_event_ids' | 'curated_event_ids', index: number) => {
    setDragInfo({ listKey, index });
  };

  const handleDragOver = (e: React.DragEvent, listKey: 'featured_event_ids' | 'curated_event_ids', targetIndex: number) => {
    e.preventDefault();
    if (!dragInfo || dragInfo.listKey !== listKey || dragInfo.index === targetIndex) return;

    const fromIdx = dragInfo.index;
    const list = [...(config[listKey] ?? [])];
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const [moved] = list.splice(fromIdx, 1);
    list.splice(targetIndex, 0, moved);

    setConfig(prev => ({ ...prev, [listKey]: list }));
    setDragInfo({ listKey, index: targetIndex });
  };

  const handleDragEnd = () => {
    if (dragInfo) {
      setDragInfo(null);
      void saveUpdatedConfig(config);
    }
  };

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
    void saveUpdatedConfig(config);
  };

  const featuredIds = config.featured_event_ids ?? [];
  const curatedIds = config.curated_event_ids ?? [];
  const featuredLimit = config.featured_limit ?? 3;
  const curatedLimit = config.curated_limit ?? 8;

  const toggleFeatured = (id: string) => {
    const ids = config.featured_event_ids ?? [];
    const newIds = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
    const newConfig = { ...config, featured_event_ids: newIds };
    setConfig(newConfig);
    void saveUpdatedConfig(newConfig);
  };
  const toggleCurated = (id: string) => {
    const ids = config.curated_event_ids ?? [];
    const newIds = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
    const newConfig = { ...config, curated_event_ids: newIds };
    setConfig(newConfig);
    void saveUpdatedConfig(newConfig);
  };
  const removeFeatured = (id: string) => {
    const newConfig = { ...config, featured_event_ids: (config.featured_event_ids ?? []).filter(x => x !== id) };
    setConfig(newConfig);
    void saveUpdatedConfig(newConfig);
  };
  const removeCurated = (id: string) => {
    const newConfig = { ...config, curated_event_ids: (config.curated_event_ids ?? []).filter(x => x !== id) };
    setConfig(newConfig);
    void saveUpdatedConfig(newConfig);
  };

  const getEventDetails = (id: string) => allEvents.find(e => e.id === id);

  const filteredEvents = allEvents.filter(e =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.hostName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.city && e.city.toLowerCase().includes(searchQuery.toLowerCase())),
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

  // ── Compact pinned panel with drag-to-reorder ───────────────────────────────
  const renderPinnedPanel = (
    title: string,
    Icon: typeof Star,
    listKey: 'featured_event_ids' | 'curated_event_ids',
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
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 hidden sm:inline">Drag items to reorder</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${over ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
              {ids.length}/{limit}
            </span>
          </div>
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
              const isDragging = dragInfo?.listKey === listKey && dragInfo?.index === i;
              return (
                <div
                  key={id}
                  draggable
                  onDragStart={() => handleDragStart(listKey, i)}
                  onDragOver={(e) => handleDragOver(e, listKey, i)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 transition-all duration-200 ease-out select-none ${
                    isDragging
                      ? 'border-brand-500 bg-brand-50/90 shadow-md ring-2 ring-brand-500/30 scale-[1.02] z-20 cursor-grabbing'
                      : 'border-slate-200/80 bg-slate-50 hover:border-brand-300 hover:bg-white shadow-xs cursor-grab'
                  } ${hidden && !isDragging ? 'opacity-50' : ''}`}
                >
                  <GripVertical className={`h-4 w-4 shrink-0 transition-colors ${isDragging ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'}`} />
                  <span className="w-4 shrink-0 text-center text-[10px] font-black text-slate-400">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-ink">{d?.title ?? `Event ${id.slice(0, 8)}…`}</p>
                    <p className="truncate text-[10px] font-semibold text-slate-400">{d ? `${d.hostName} · ${d.city}` : 'Not live / not found'}</p>
                  </div>
                  {hidden && <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-amber-600">hidden</span>}
                  
                  {/* Up / Down reorder controls */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => moveItem(listKey, i, i - 1)}
                      title="Move up"
                      className="p-1 rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={i === ids.length - 1}
                      onClick={() => moveItem(listKey, i, i + 1)}
                      title="Move down"
                      className="p-1 rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemove(id)}
                    title="Unpin"
                    className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                  >
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
      {/* Tabs */}
      <div className="flex max-w-xl gap-1 rounded-2xl border border-slate-100 bg-white/40 p-1 backdrop-blur-sm">
        {(['homepage', 'campaigns', 'broadcasts'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 rounded-xl py-2.5 text-center text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === t ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            {t === 'homepage' ? 'Homepage Placement' : t === 'campaigns' ? 'Campaign Operations' : 'Bulk Announcements'}
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

            <div className="grid gap-4 lg:grid-cols-2 items-stretch">
              {/* Left: searchable live events */}
              <Card className="flex flex-col p-4 h-full">
                <div className="mb-3 flex items-center justify-between shrink-0">
                  <div>
                    <h4 className="text-sm font-bold text-ink">Live experiences</h4>
                    <p className="text-[11px] font-medium text-slate-400">Pin or unpin experiences for homepage sections</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">
                    {filteredEvents.length} / {allEvents.length}
                  </span>
                </div>
                <div className="relative mb-3 flex items-center gap-2 rounded-2xl border border-brand-100 bg-white px-3.5 py-2.5 shadow-sm transition-all focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10 shrink-0">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    type="text"
                    placeholder="Search experiences by title, host, or city…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      title="Clear search"
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {eventsLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
                    <p className="mt-2 text-xs text-slate-400">Loading live events…</p>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
                    <Search className="h-8 w-8 text-slate-300 stroke-[1.5]" />
                    <p className="text-sm font-medium">No live events match "{searchQuery}"</p>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-xs font-bold text-brand-600 hover:underline cursor-pointer"
                      >
                        Clear search filter
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 space-y-1.5 overflow-y-auto pr-1">
                    {filteredEvents.map((event) => {
                      const isF = featuredIds.includes(event.id);
                      const isC = curatedIds.includes(event.id);
                      return (
                        <div
                          key={event.id}
                          className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition ${
                            isF || isC ? 'border-brand-200 bg-brand-50/30' : 'border-slate-100 hover:border-brand-200'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-ink">{event.title}</p>
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mt-0.5">
                              <span className="truncate">{event.hostName}</span>
                              {event.city && (
                                <>
                                  <span>·</span>
                                  <span className="inline-flex items-center gap-0.5">
                                    <MapPin className="h-2.5 w-2.5" />
                                    {event.city}
                                  </span>
                                </>
                              )}
                            </div>
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
                {renderPinnedPanel('Featured slideshow', Star, 'featured_event_ids', featuredIds, featuredLimit, removeFeatured, 'text-amber-500')}
                {renderPinnedPanel('Discover grid', LayoutGrid, 'curated_event_ids', curatedIds, curatedLimit, removeCurated, 'text-brand-500')}
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
                  className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  type="text"
                  placeholder="e.g. Summer discounts Delhi"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="campChannel">Channel</label>
                  <div className="relative">
                    <select
                      id="campChannel"
                      className="w-full appearance-none rounded-2xl border border-brand-100 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 cursor-pointer"
                      value={newCampaignChannel}
                      onChange={(e) => setNewCampaignChannel(e.target.value)}
                    >
                      <option value="Meta ads">Meta ads</option>
                      <option value="Email + push">Email + push</option>
                      <option value="In-app banner">In-app banner</option>
                      <option value="Google search ads">Google search ads</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="campSpend">Budget Spend</label>
                  <input
                    id="campSpend"
                    className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
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

      {activeTab === 'broadcasts' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Left: Broadcast Form */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-ink">Send Bulk Announcement</h3>
            <p className="text-xs text-mist mt-1 mb-5">Send reminders to an experience's booked guests, or market it to every registered user.</p>

            <form onSubmit={handleSendBroadcast} className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-600">Audience</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { key: 'guests', label: 'Booked Guests', hint: 'Confirmed + pending bookings' },
                    { key: 'all', label: 'All Users', hint: 'Everyone registered — marketing' },
                  ] as const).map((a) => (
                    <label
                      key={a.key}
                      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border p-3.5 text-center transition hover:bg-slate-50 ${
                        audience === a.key
                          ? 'border-brand-600 bg-brand-50/20 text-brand-700 font-bold'
                          : 'border-slate-100 bg-white text-slate-500 font-medium'
                      }`}
                    >
                      <input
                        type="radio"
                        name="broadcastAudience"
                        value={a.key}
                        checked={audience === a.key}
                        onChange={() => {
                          setAudience(a.key);
                          setBroadcastSuccess(null);
                          setBroadcastError(null);
                        }}
                        className="sr-only"
                      />
                      <span className="text-xs uppercase tracking-wider">{a.label}</span>
                      <span className="mt-0.5 text-[10px] font-medium text-slate-400">{a.hint}</span>
                    </label>
                  ))}
                </div>

                {audience === 'all' && (
                  <div className="mt-3">
                    <input
                      className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                      placeholder="Limit to a city (optional, exact name e.g. Bengaluru)"
                      value={audienceCity}
                      onChange={(e) => setAudienceCity(e.target.value)}
                    />
                    <p className="mt-2 text-[10px] font-medium text-amber-600">
                      Goes to every registered user — there is no marketing opt-out flag on accounts yet.
                      WhatsApp is sent as the approved marketing template.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-600">Select Experience</label>
                <SearchableEventSelect
                  events={allEvents}
                  selectedEventId={selectedEventId}
                  onSelect={(id) => {
                    setSelectedEventId(id);
                    setBroadcastSuccess(null);
                    setBroadcastError(null);
                  }}
                  disabled={eventsLoading || broadcastSending}
                />

                {selectedEventId && (
                  <div className="mt-2.5 flex items-center gap-2">
                    {countLoading ? (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                        <Loader2 className="h-3 w-3 animate-spin text-brand-600" />
                        <span>{audience === 'all' ? 'Counting users...' : 'Calculating active bookings...'}</span>
                      </div>
                    ) : activeBookingsCount !== null ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 border border-brand-100 px-2.5 py-0.5 text-[11px] font-extrabold text-brand-700 shadow-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-600 animate-pulse" />
                        {activeBookingsCount}{' '}
                        {audience === 'all'
                          ? `user${activeBookingsCount !== 1 ? 's' : ''} targeted`
                          : `active booking${activeBookingsCount !== 1 ? 's' : ''} targeted`}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-rose-500">Error loading audience count</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-600">Notification Channel</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['both', 'whatsapp', 'email'] as const).map((ch) => (
                    <label
                      key={ch}
                      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border p-3.5 text-center transition hover:bg-slate-50 ${
                        channel === ch
                          ? 'border-brand-600 bg-brand-50/20 text-brand-700 font-bold'
                          : 'border-slate-100 bg-white text-slate-500 font-medium'
                      }`}
                    >
                      <input
                        type="radio"
                        name="broadcastChannel"
                        value={ch}
                        checked={channel === ch}
                        onChange={() => setChannel(ch)}
                        className="sr-only"
                      />
                      <span className="text-xs uppercase tracking-wider">
                        {ch === 'both' ? 'Both' : ch === 'whatsapp' ? 'WhatsApp' : 'Email'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-600" htmlFor="broadcastMsg">
                    Announcement Message{' '}
                    <span className="font-normal text-slate-400">{audience === 'all' ? '(Required)' : '(Optional)'}</span>
                  </label>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {audience === 'all' ? 'Marketing blasts need a message' : 'Leave blank to send standard reminder'}
                  </span>
                </div>
                <textarea
                  id="broadcastMsg"
                  rows={4}
                  className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 resize-none"
                  placeholder="e.g. Please bring comfortable shoes as we'll be walking outdoors..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                />
              </div>

              {broadcastError && (
                <div className="rounded-xl bg-rose-50 p-3.5 text-xs font-semibold text-rose-600">
                  {broadcastError}
                </div>
              )}

              {broadcastSuccess && (
                <div className="rounded-xl bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-700">
                  {broadcastSuccess}
                </div>
              )}

              <Button
                variant="primary"
                type="submit"
                className="w-full flex items-center justify-center gap-2 animate-none"
                disabled={broadcastSending || !selectedEventId || (activeBookingsCount === 0 && !countLoading)}
              >
                {broadcastSending && <Loader2 className="h-4 w-4 animate-spin" />}
                {broadcastSending ? 'Sending Announcement...' : 'Send Bulk Announcement'}
              </Button>
            </form>
          </Card>

          {/* Right: Live Preview Pane */}
          <Card className="p-6 flex flex-col h-full bg-slate-50/50">
            <h3 className="text-sm font-bold text-ink">Live Broadcast Preview</h3>
            <p className="text-xs text-mist mt-0.5 mb-5">See how notifications look before launching.</p>

            {!selectedEventId ? (
              <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400">
                <LayoutGrid className="h-8 w-8 mb-2 stroke-[1.5] text-slate-300" />
                <p className="text-xs font-medium">Select an experience to view notification previews</p>
              </div>
            ) : (
              <div className="space-y-5 flex-1 overflow-y-auto">
                {/* Channel Preview Selector */}
                <div className="flex gap-2 p-0.5 bg-slate-100 rounded-xl max-w-xs">
                  {['whatsapp', 'email'].map((tab) => {
                    const isAllowed = channel === 'both' || channel === tab;
                    const isActive = isAllowed && (channel === 'both' ? activePreviewTab === tab : channel === tab);
                    return (
                      <button
                        key={tab}
                        type="button"
                        disabled={!isAllowed}
                        onClick={() => setActivePreviewTab(tab as 'whatsapp' | 'email')}
                        className={`flex-1 rounded-lg py-1.5 text-center text-[11px] font-bold uppercase transition ${
                          isActive
                            ? 'bg-white text-brand-700 shadow-sm'
                            : isAllowed
                            ? 'text-slate-500 hover:text-slate-700'
                            : 'text-slate-300 cursor-not-allowed'
                        }`}
                      >
                        {tab === 'whatsapp' ? 'WhatsApp' : 'Email'}
                      </button>
                    );
                  })}
                </div>

                {/* Preview Content */}
                {((channel === 'both' && activePreviewTab === 'whatsapp') || channel === 'whatsapp') && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">WhatsApp Copy</span>
                    <div className="rounded-2xl bg-[#DCF8C6] border border-[#d3ecd2] p-4 text-xs text-slate-800 shadow-sm max-w-sm ml-0">
                      <p className="whitespace-pre-line leading-relaxed">
                        {audience === 'all' ? (
                          // Mirrors the approved `event_promo` template body. Keep in
                          // sync with Meta — this preview cannot read the real template.
                          `Hi [Name], something you might like is coming up on MySlotMate.\n\n*${
                            allEvents.find((e) => e.id === selectedEventId)?.title || 'Experience Title'
                          }* is open for booking right now — spots are limited.\n\nTap below to see the details and grab yours.`
                        ) : broadcastMessage.trim() ? (
                          broadcastMessage
                        ) : (
                          `Hey [Guest Name]! 🌟\n\nQuick reminder that you are booked for *${
                            allEvents.find((e) => e.id === selectedEventId)?.title || 'Experience Title'
                          }* by *${
                            allEvents.find((e) => e.id === selectedEventId)?.hostName || 'Host Name'
                          }* in *${
                            allEvents.find((e) => e.id === selectedEventId)?.city || 'City'
                          }*.\n\nGet ready for an amazing experience!`
                        )}
                      </p>
                      {audience === 'all' && (
                        <div className="mt-3 border-t border-[#c5e0c0] pt-2 text-center text-[11px] font-bold text-[#0a7cff]">
                          View experience
                        </div>
                      )}
                    </div>
                    {audience === 'all' && (
                      <p className="text-[10px] font-medium text-amber-600">
                        Fixed copy from the approved <code>event_promo</code> template — only the name,
                        event title and button link change. Your typed message goes out by email only.
                      </p>
                    )}
                  </div>
                )}

                {((channel === 'both' && activePreviewTab === 'email') || channel === 'email') && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-700">Email Copy</span>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-800 shadow-sm space-y-3">
                      <div>
                        <span className="font-bold text-slate-400">Subject:</span>{' '}
                        <span className="font-semibold text-ink">
                          {audience === 'all'
                            ? `Happening soon: ${allEvents.find((e) => e.id === selectedEventId)?.title || 'Experience'}`
                            : broadcastMessage.trim()
                            ? `Announcement: ${allEvents.find((e) => e.id === selectedEventId)?.title || 'Experience'}`
                            : `Reminder: ${allEvents.find((e) => e.id === selectedEventId)?.title || 'Experience'}`}
                        </span>
                      </div>
                      <div className="border-t border-slate-100 pt-3 leading-relaxed whitespace-pre-line text-slate-600">
                        {audience === 'all' && (
                          <p className="text-sm font-bold text-ink">
                            {allEvents.find((e) => e.id === selectedEventId)?.title || 'Experience Title'}
                          </p>
                        )}
                        <p className="font-bold text-ink">
                          Hi {audience === 'all' ? '[Name]' : '[Guest Name]'},
                        </p>
                        <p className="mt-2">
                          {broadcastMessage.trim() ? (
                            broadcastMessage
                          ) : audience === 'all' ? (
                            'Your marketing message appears here.'
                          ) : (
                            `This is a quick reminder that your upcoming experience *${
                              allEvents.find((e) => e.id === selectedEventId)?.title || 'Experience Title'
                            }* is scheduled soon.\n\nWe look forward to seeing you there!`
                          )}
                        </p>
                        {audience === 'all' && (
                          <p className="mt-3">
                            <span className="inline-block rounded-lg bg-[#6d28d9] px-3 py-2 text-[11px] font-bold text-white">
                              View experience
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

// ── Searchable Event Select Combobox ──────────────────────────────────────────

interface SearchableEventSelectProps {
  events: AdminEvent[];
  selectedEventId: string;
  onSelect: (eventId: string) => void;
  disabled?: boolean;
}

const SearchableEventSelect: React.FC<SearchableEventSelectProps> = ({
  events,
  selectedEventId,
  onSelect,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const filtered = events.filter((e) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      e.title.toLowerCase().includes(q) ||
      e.hostName.toLowerCase().includes(q) ||
      (e.city && e.city.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => searchInputRef.current?.focus(), 40);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
            setQuery('');
          }
        }}
        className={`w-full rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between p-3.5 ${
          isOpen
            ? 'border-brand-500 bg-white ring-4 ring-brand-500/10 shadow-sm'
            : selectedEvent
            ? 'border-brand-200 bg-brand-50/25 hover:border-brand-300 hover:bg-brand-50/40'
            : 'border-brand-100 bg-white hover:border-brand-300'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
              selectedEvent ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-400'
            }`}
          >
            <Sparkles className="h-4 w-4" />
          </div>
          {selectedEvent ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink leading-snug">{selectedEvent.title}</p>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5">
                <span className="truncate">{selectedEvent.hostName}</span>
                {selectedEvent.city && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="inline-flex items-center gap-0.5 text-slate-400 text-[11px]">
                      <MapPin className="h-3 w-3" />
                      {selectedEvent.city}
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-slate-400">Search and select an experience…</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {selectedEvent && !disabled && (
            <span
              role="button"
              tabIndex={0}
              title="Clear selection"
              onClick={(e) => {
                e.stopPropagation();
                onSelect('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onSelect('');
                }
              }}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/80 hover:text-slate-600 transition"
            >
              <X className="h-4 w-4" />
            </span>
          )}
          <div className="p-0.5 text-slate-400">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </button>

      {/* Floating Popover Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-brand-100 bg-white p-2.5 shadow-xl backdrop-blur animate-in fade-in zoom-in-95 duration-150">
          {/* Inner Search Box */}
          <div className="relative mb-2 flex items-center rounded-xl border border-brand-100 bg-slate-50/80 px-3 py-2 transition focus-within:border-brand-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/10">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              className="w-full bg-transparent px-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
              placeholder="Filter by title, host, or city…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="rounded-md p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* List count info */}
          <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-slate-400 border-b border-slate-100 pb-1.5 mb-1">
            <span>Experiences</span>
            <span>{filtered.length} of {events.length}</span>
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 overscroll-contain">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                <p>No experiences match "{query}"</p>
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="mt-1.5 text-xs font-bold text-brand-600 hover:underline cursor-pointer"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            ) : (
              filtered.map((ev) => {
                const isSelected = ev.id === selectedEventId;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => {
                      onSelect(ev.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-brand-50 text-brand-900 font-bold border border-brand-200'
                        : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{ev.title}</p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mt-0.5">
                        <span className="truncate">{ev.hostName}</span>
                        {ev.city && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5" />
                              {ev.city}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-xs">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
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
