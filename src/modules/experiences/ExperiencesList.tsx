import React, { useState } from 'react';
import { useMockData } from '../../context/MockDataContext';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

interface ExperiencesListProps {
  searchQuery: string;
}

export const ExperiencesList: React.FC<ExperiencesListProps> = ({ searchQuery }) => {
  const { experiences, setExperiences } = useMockData();
  const [localSearch, setLocalSearch] = useState('');

  const filteredExperiences = experiences.filter(exp => {
    const query = (searchQuery || localSearch).toLowerCase();
    return (
      exp.title.toLowerCase().includes(query) ||
      exp.hostName.toLowerCase().includes(query) ||
      exp.city.toLowerCase().includes(query) ||
      exp.category.toLowerCase().includes(query)
    );
  });

  const handleUpdateStatus = (id: string, newStatus: 'Approved' | 'Featured' | 'Suspended') => {
    setExperiences(prev => prev.map(exp => {
      if (exp.id === id) {
        return { ...exp, status: newStatus };
      }
      return exp;
    }));
  };

  const getStatusColor = (status: string): 'green' | 'blue' | 'amber' | 'rose' => {
    switch (status) {
      case 'Approved': return 'green';
      case 'Featured': return 'blue';
      case 'Pending approval': return 'amber';
      case 'Suspended': return 'rose';
      default: return 'blue';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-700">Experiences management</p>
          <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            Review listings, feature standout sessions, and suspend risky inventory.
          </h3>
        </div>
        <Button variant="primary" onClick={() => alert('Creating featured category landing page...')}>
          Create featured collection
        </Button>
      </div>

      {/* Filter panel */}
      <div className="rounded-3xl border border-brand-100/80 bg-white/95 shadow-soft backdrop-blur-md p-5">
        <div className="max-w-md">
          <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 shadow-sm">
            <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="M20 20l-3.5-3.5" stroke-linecap="round"></path>
            </svg>
            <input 
              className="w-full bg-transparent text-sm outline-none" 
              type="search" 
              placeholder="Search experiences, hosts, or categories..." 
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {filteredExperiences.length > 0 ? (
        <Table headers={['Title', 'Host Name', 'City', 'Category', 'Price', 'Bookings', 'Rating', 'Status', 'Actions']}>
          {filteredExperiences.map((exp) => (
            <tr key={exp.id} className="border-b border-slate-100 last:border-b-0 hover:bg-brand-50/40 transition">
              <td className="px-6 py-4 align-top font-bold text-ink max-w-[200px]">{exp.title}</td>
              <td className="px-6 py-4 align-top text-slate-700 font-medium">{exp.hostName}</td>
              <td className="px-6 py-4 align-top text-slate-600">{exp.city}</td>
              <td className="px-6 py-4 align-top text-slate-600">{exp.category}</td>
              <td className="px-6 py-4 align-top font-extrabold text-ink">${exp.price}</td>
              <td className="px-6 py-4 align-top text-slate-600 font-medium">{exp.bookings}</td>
              <td className="px-6 py-4 align-top font-extrabold text-brand-600">{exp.rating} ★</td>
              <td className="px-6 py-4 align-top">
                <Badge color={getStatusColor(exp.status)}>{exp.status}</Badge>
              </td>
              <td className="px-6 py-4 align-top">
                <div className="flex flex-wrap gap-2">
                  {exp.status !== 'Approved' && (
                    <Button variant="action" onClick={() => handleUpdateStatus(exp.id, 'Approved')} className="hover:text-emerald-600 hover:border-emerald-300">
                      Approve
                    </Button>
                  )}
                  {exp.status !== 'Featured' && exp.status !== 'Suspended' && (
                    <Button variant="action" onClick={() => handleUpdateStatus(exp.id, 'Featured')} className="hover:text-sky-600 hover:border-sky-300">
                      Feature
                    </Button>
                  )}
                  {exp.status !== 'Suspended' && (
                    <Button variant="action" onClick={() => handleUpdateStatus(exp.id, 'Suspended')} className="hover:text-rose-600 hover:border-rose-300">
                      Suspend
                    </Button>
                  )}
                  <Button variant="action" onClick={() => alert(`Editing fields for ${exp.title}...`)}>
                    Edit
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Card className="p-10 text-center">
          <p className="text-slate-400 font-medium">No experience listings found.</p>
        </Card>
      )}
    </div>
  );
};
