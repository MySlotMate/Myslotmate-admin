import React, { useState } from 'react';
import { useMockData } from '../../context/MockDataContext';
import { Table } from '../../components/ui/Table';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const CitiesDirectory: React.FC = () => {
  const { cities, setCities } = useMockData();
  const [newCityName, setNewCityName] = useState('');
  const [targetUsers, setTargetUsers] = useState('');
  const [targetHosts, setTargetHosts] = useState('');

  const handleAddCity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCityName || !targetUsers || !targetHosts) {
      alert('Please fill out all fields.');
      return;
    }
    const parsedUsers = parseInt(targetUsers, 10);
    const parsedHosts = parseInt(targetHosts, 10);
    
    setCities((prev) => [
      ...prev,
      {
        name: newCityName,
        users: parsedUsers,
        hosts: parsedHosts,
        experiences: 1,
        bookings: 0,
        revenue: 0,
      },
    ]);

    setNewCityName('');
    setTargetUsers('');
    setTargetHosts('');
    alert(`City ${newCityName} added successfully to active lists!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-700">City analytics</p>
          <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            Compare regional demand, supply, and revenue density.
          </h3>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        {/* Heatmap Section */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-ink">Active Market Heatmap</h3>
              <p className="text-xs text-mist mt-0.5">Heatmap density of reservation transactions.</p>
            </div>
            <span className="inline-flex items-center rounded-full border border-brand-100 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 cursor-pointer transition hover:border-brand-300 hover:text-brand-700">India focus</span>
          </div>

          <div className="mt-6 flex h-[420px] items-center justify-center rounded-[28px] border border-dashed border-brand-200 bg-brand-50/60 p-6">
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-brand-800">Simulated Geographic Hub</p>
              <p className="mt-3 max-w-sm text-xs text-slate-500 mx-auto">
                Displays active spots in real time based on coordinate pins. Shows densest bookings in Delhi, Mumbai, and Bengaluru.
              </p>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {cities.map((city, idx) => (
                  <div key={idx} className="bg-white border border-brand-100/50 rounded-2xl p-3 shadow-xs">
                    <p className="text-xs font-bold text-ink">{city.name}</p>
                    <p className="text-[10px] text-brand-600 mt-1 font-bold">{(city.users / 1000).toFixed(1)}k users</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Cities Table and Rollout Form */}
        <div className="space-y-6">
          <Table headers={['City', 'Users', 'Hosts', 'Experiences', 'Bookings', 'Revenue']}>
            {cities.map((city, idx) => (
              <tr key={idx} className="border-b border-slate-100 last:border-b-0 hover:bg-brand-50/40 transition">
                <td className="px-6 py-4 align-top font-bold text-ink">{city.name}</td>
                <td className="px-6 py-4 align-top text-slate-600 font-semibold">{city.users.toLocaleString()}</td>
                <td className="px-6 py-4 align-top text-slate-600 font-medium">{city.hosts}</td>
                <td className="px-6 py-4 align-top text-slate-600 font-medium">{city.experiences}</td>
                <td className="px-6 py-4 align-top text-slate-600 font-medium">{city.bookings.toLocaleString()}</td>
                <td className="px-6 py-4 align-top font-extrabold text-ink">${city.revenue.toLocaleString()}</td>
              </tr>
            ))}
          </Table>

          {/* New Rollout Form */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-ink">Plan new city rollout</h3>
            <p className="text-xs text-mist mt-1 mb-5">Configure initial parameters to prepare launcher checklist.</p>
            
            <form onSubmit={handleAddCity} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="cityName">City Name</label>
                <input 
                  id="cityName" 
                  className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" 
                  type="text" 
                  placeholder="e.g. Guwahati, Pune"
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="targetUsers">Initial target users</label>
                  <input 
                    id="targetUsers" 
                    className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" 
                    type="number" 
                    placeholder="e.g. 5000"
                    value={targetUsers}
                    onChange={(e) => setTargetUsers(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="targetHosts">Initial target hosts</label>
                  <input 
                    id="targetHosts" 
                    className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" 
                    type="number" 
                    placeholder="e.g. 150"
                    value={targetHosts}
                    onChange={(e) => setTargetHosts(e.target.value)}
                  />
                </div>
              </div>

              <Button variant="primary" type="submit" className="w-full">
                Plan rollout
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
