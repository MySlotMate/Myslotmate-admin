import React, { useState, useEffect } from 'react';
import { useMockData } from '../../context/MockDataContext';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { fetchEvents, type AdminEvent } from '../../api/directory';
import { fetchMarketingConfig, updateMarketingConfig, type HomepageMarketingConfig } from '../../api/marketing';
import { Search, Pin, Trash2, Settings, Sparkles, Save, Check } from 'lucide-react';

export const MarketingDirectory: React.FC = () => {
  // Tabs: 'homepage' or 'campaigns'
  const [activeTab, setActiveTab] = useState<'homepage' | 'campaigns'>('homepage');

  // Campaigns state (from MockDataContext)
  const { campaigns, setCampaigns } = useMockData();
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignChannel, setNewCampaignChannel] = useState('Meta ads');
  const [newCampaignSpend, setNewCampaignSpend] = useState('');

  // Homepage Settings state
  const [config, setConfig] = useState<HomepageMarketingConfig>({
    featured_limit: 3,
    curated_limit: 8,
    featured_event_ids: [],
    curated_event_ids: []
  });
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);

  // Live Events state (for pinning)
  const [allEvents, setAllEvents] = useState<AdminEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Load configuration and live events
  useEffect(() => {
    async function loadData() {
      setConfigLoading(true);
      setEventsLoading(true);
      try {
        const [cfg, eventsRes] = await Promise.all([
          fetchMarketingConfig(),
          fetchEvents({ page: 1, pageSize: 100, status: 'live' })
        ]);

        setConfig({
          featured_limit: cfg.featured_limit ?? 3,
          curated_limit: cfg.curated_limit ?? 8,
          featured_event_ids: cfg.featured_event_ids ?? [],
          curated_event_ids: cfg.curated_event_ids ?? []
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

  // Save Config
  const handleSaveConfig = async () => {
    setConfigSaving(true);
    try {
      await updateMarketingConfig(config);
      alert('Homepage marketing configuration updated successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save configuration.');
    } finally {
      setConfigSaving(false);
    }
  };

  // Pin / Unpin handlers
  const pinFeatured = (eventId: string) => {
    if ((config.featured_event_ids ?? []).includes(eventId)) return;
    setConfig(prev => ({
      ...prev,
      featured_event_ids: [...(prev.featured_event_ids ?? []), eventId]
    }));
  };

  const unpinFeatured = (eventId: string) => {
    setConfig(prev => ({
      ...prev,
      featured_event_ids: (prev.featured_event_ids ?? []).filter(id => id !== eventId)
    }));
  };

  const pinCurated = (eventId: string) => {
    if ((config.curated_event_ids ?? []).includes(eventId)) return;
    setConfig(prev => ({
      ...prev,
      curated_event_ids: [...(prev.curated_event_ids ?? []), eventId]
    }));
  };

  const unpinCurated = (eventId: string) => {
    setConfig(prev => ({
      ...prev,
      curated_event_ids: (prev.curated_event_ids ?? []).filter(id => id !== eventId)
    }));
  };

  // Campaign launch handler
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
      {
        name: newCampaignName,
        audience: 'New user segment',
        channel: newCampaignChannel,
        spend: spendVal,
        bookings: 0,
        roas: '0.0x',
        status: 'Running'
      }
    ]);

    setNewCampaignName('');
    setNewCampaignSpend('');
    alert(`Campaign "${newCampaignName}" launched successfully!`);
  };

  // Helper to find event title/details for pinned IDs
  const getEventDetails = (id: string) => {
    return allEvents.find(e => e.id === id);
  };

  // Filter live events for selection list
  const filteredEvents = allEvents.filter(e =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.hostName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-100 bg-white/40 p-1 rounded-2xl backdrop-blur-sm max-w-md">
        <button
          onClick={() => setActiveTab('homepage')}
          className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider transition-all rounded-xl cursor-pointer ${
            activeTab === 'homepage'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Homepage Placement
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider transition-all rounded-xl cursor-pointer ${
            activeTab === 'campaigns'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Campaign Operations
        </button>
      </div>

      {activeTab === 'homepage' && (
        <div className="space-y-6">
          {configLoading ? (
            <Card className="p-10 text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
              <p className="mt-3 text-slate-400 font-medium">Loading homepage configuration…</p>
            </Card>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
              {/* Left Column: limits and Pinned Lists */}
              <div className="space-y-6">
                <Card className="p-6 relative overflow-hidden bg-gradient-to-br from-white via-white to-brand-50/20">
                  <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                    <Settings className="w-24 h-24 text-brand-600" />
                  </div>
                  <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand-500" />
                    Homepage Display Limits
                  </h3>
                  <p className="text-xs text-mist mt-1 mb-6">Specify the maximum number of experiences shown in each section.</p>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="featured_limit">
                        Featured Slideshow Limit
                      </label>
                      <input
                        id="featured_limit"
                        type="number"
                        min={1}
                        max={10}
                        className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-brand-400"
                        value={config.featured_limit ?? 3}
                        onChange={(e) => setConfig(prev => ({ ...prev, featured_limit: parseInt(e.target.value) || 3 }))}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="curated_limit">
                        Discover Experiences Limit
                      </label>
                      <input
                        id="curated_limit"
                        type="number"
                        min={1}
                        max={20}
                        className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-brand-400"
                        value={config.curated_limit ?? 8}
                        onChange={(e) => setConfig(prev => ({ ...prev, curated_limit: parseInt(e.target.value) || 8 }))}
                      />
                    </div>
                  </div>
                </Card>

                {/* Pinned Featured Card */}
                <Card className="p-6">
                  <h3 className="text-base font-bold text-ink flex items-center gap-2">
                    <Pin className="w-4 h-4 text-brand-500 rotate-45" />
                    Pinned Featured Slideshow
                  </h3>
                  <p className="text-xs text-mist mt-1 mb-4">Specific events selected to show in the slideshow carousel, in pinned order.</p>

                  {(config.featured_event_ids ?? []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                      No events pinned. Automatically displaying upcoming live events sorted by time.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {(config.featured_event_ids ?? []).map((id) => {
                        const details = getEventDetails(id);
                        return (
                          <div key={id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl transition border border-slate-100">
                            <div className="min-w-0 pr-3">
                              <p className="text-xs font-bold text-ink truncate">{details?.title ?? `Event (${id.slice(0, 8)}...)`}</p>
                              <p className="text-[10px] text-slate-400 font-semibold">{details ? `by ${details.hostName} · ${details.city}` : 'Not found / Not live'}</p>
                            </div>
                            <button
                              onClick={() => unpinFeatured(id)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition"
                              title="Unpin event"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                {/* Pinned Curated Card */}
                <Card className="p-6">
                  <h3 className="text-base font-bold text-ink flex items-center gap-2">
                    <Pin className="w-4 h-4 text-brand-500" />
                    Pinned Discover Experiences
                  </h3>
                  <p className="text-xs text-mist mt-1 mb-4">Specific events pinned to the main curated grid, in pinned order.</p>

                  {(config.curated_event_ids ?? []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                      No events pinned. Automatically displaying upcoming live events sorted by time.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {(config.curated_event_ids ?? []).map((id) => {
                        const details = getEventDetails(id);
                        return (
                          <div key={id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl transition border border-slate-100">
                            <div className="min-w-0 pr-3">
                              <p className="text-xs font-bold text-ink truncate">{details?.title ?? `Event (${id.slice(0, 8)}...)`}</p>
                              <p className="text-[10px] text-slate-400 font-semibold">{details ? `by ${details.hostName} · ${details.city}` : 'Not found / Not live'}</p>
                            </div>
                            <button
                              onClick={() => unpinCurated(id)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition"
                              title="Unpin event"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                <Button
                  variant="primary"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl"
                  onClick={handleSaveConfig}
                  disabled={configSaving}
                >
                  <Save className="w-4 h-4" />
                  {configSaving ? 'Saving Changes...' : 'Save Homepage Configuration'}
                </Button>
              </div>

              {/* Right Column: Search and select active events to pin */}
              <div className="space-y-4">
                <Card className="p-6">
                  <h3 className="text-lg font-bold text-ink">Search & Pin Experiences</h3>
                  <p className="text-xs text-mist mt-1 mb-5">Search all live experiences and pin them to either display section.</p>

                  <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 shadow-sm mb-5">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      className="w-full bg-transparent text-sm outline-none text-slate-700"
                      type="search"
                      placeholder="Search live events by title, host name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {eventsLoading ? (
                    <div className="p-10 text-center">
                      <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
                      <p className="mt-3 text-slate-400 text-xs">Loading live events…</p>
                    </div>
                  ) : filteredEvents.length === 0 ? (
                    <div className="p-10 text-center text-sm text-slate-400">
                      No live events match your search.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
                      {filteredEvents.map((event) => {
                        const isFeaturedPinned = (config.featured_event_ids ?? []).includes(event.id);
                        const isCuratedPinned = (config.curated_event_ids ?? []).includes(event.id);

                        return (
                          <div key={event.id} className="p-4 bg-white border border-slate-100 hover:border-brand-200 rounded-2xl transition hover:shadow-sm">
                            <div className="flex justify-between items-start gap-4">
                              <div className="min-w-0">
                                <Badge color="green" className="mb-2">Live</Badge>
                                <h4 className="text-sm font-bold text-ink line-clamp-1">{event.title}</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                  by <span className="font-semibold">{event.hostName}</span> · {event.city}
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-50">
                              <button
                                onClick={() => isFeaturedPinned ? unpinFeatured(event.id) : pinFeatured(event.id)}
                                className={`flex-1 py-2 px-3 text-xs font-extrabold rounded-xl border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                  isFeaturedPinned
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                    : 'bg-white border-brand-100 text-slate-700 hover:border-brand-300 hover:text-brand-700'
                                }`}
                              >
                                {isFeaturedPinned ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    Pinned Featured
                                  </>
                                ) : (
                                  <>
                                    <Pin className="w-3.5 h-3.5 rotate-45 text-slate-400" />
                                    Pin Featured
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => isCuratedPinned ? unpinCurated(event.id) : pinCurated(event.id)}
                                className={`flex-1 py-2 px-3 text-xs font-extrabold rounded-xl border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                  isCuratedPinned
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                    : 'bg-white border-brand-100 text-slate-700 hover:border-brand-300 hover:text-brand-700'
                                }`}
                              >
                                {isCuratedPinned ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    Pinned Curated
                                  </>
                                ) : (
                                  <>
                                    <Pin className="w-3.5 h-3.5 text-slate-400" />
                                    Pin Curated
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}
        </div>
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
