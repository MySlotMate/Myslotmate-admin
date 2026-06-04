import React, { useState } from 'react';
import { useMockData } from '../../context/MockDataContext';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export const MarketingDirectory: React.FC = () => {
  const { campaigns, setCampaigns } = useMockData();
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignChannel, setNewCampaignChannel] = useState('Meta ads');
  const [newCampaignSpend, setNewCampaignSpend] = useState('');

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

      {/* Top marketing stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-slate-500 font-medium">Referral conversions</p>
          <p className="mt-3 text-3xl font-extrabold text-ink">1,284</p>
          <p className="mt-2 text-xs font-bold text-emerald-600">+14% this month</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500 font-medium">Paid CAC</p>
          <p className="mt-3 text-3xl font-extrabold text-ink">$18.20</p>
          <p className="mt-2 text-xs font-bold text-emerald-600">Down 6% from March</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500 font-medium">Feature placement CTR</p>
          <p className="mt-3 text-3xl font-extrabold text-ink">7.8%</p>
          <p className="mt-2 text-xs font-bold text-slate-500">Homepage & Explore banner</p>
        </Card>
      </div>

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
    </div>
  );
};
