import React from 'react';
import { useMockData } from '../../context/MockDataContext';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export const ReportsDirectory: React.FC = () => {
  const { reports, setReports } = useMockData();

  const handleUpdateStatus = (id: string, currentStatus: string) => {
    setReports(prev => prev.map(rep => {
      if (rep.reportId === id) {
        let nextStatus: 'Investigating' | 'In follow-up' | 'Resolved' | 'Open' = 'Investigating';
        if (currentStatus === 'Open') nextStatus = 'Investigating';
        else if (currentStatus === 'Investigating') nextStatus = 'In follow-up';
        else if (currentStatus === 'In follow-up') nextStatus = 'Resolved';
        else if (currentStatus === 'Resolved') nextStatus = 'Open';

        return { ...rep, status: nextStatus };
      }
      return rep;
    }));
  };

  const getStatusColor = (status: string): 'green' | 'blue' | 'amber' | 'rose' => {
    switch (status) {
      case 'Resolved': return 'green';
      case 'In follow-up': return 'blue';
      case 'Investigating': return 'amber';
      case 'Open': return 'rose';
      default: return 'blue';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-700">Safety & incident reports</p>
          <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            Track risk events, service issues, and resolution flow.
          </h3>
        </div>
        <Button variant="primary" onClick={() => alert('Launching trust safety triage editor...')}>
          Escalate critical case
        </Button>
      </div>

      {/* Reports Table */}
      {reports.length > 0 ? (
        <Table headers={['Report ID', 'Reported By', 'Role', 'Experience', 'Issue Type', 'Status', 'Date', 'Actions']}>
          {reports.map((rep) => (
            <tr key={rep.reportId} className="border-b border-slate-100 last:border-b-0 hover:bg-brand-50/40 transition">
              <td className="px-6 py-4 align-top font-extrabold text-ink">{rep.reportId}</td>
              <td className="px-6 py-4 align-top text-slate-700 font-semibold">{rep.reportedBy}</td>
              <td className="px-6 py-4 align-top text-slate-500 font-bold uppercase tracking-wider text-[10px]">{rep.reporterType}</td>
              <td className="px-6 py-4 align-top text-slate-700 font-medium max-w-[150px] truncate">{rep.experience}</td>
              <td className="px-6 py-4 align-top text-slate-600 max-w-xs break-words leading-relaxed">{rep.issueType}</td>
              <td className="px-6 py-4 align-top">
                <Badge color={getStatusColor(rep.status)}>{rep.status}</Badge>
              </td>
              <td className="px-6 py-4 align-top text-slate-500">{rep.date}</td>
              <td className="px-6 py-4 align-top">
                <Button variant="action" onClick={() => handleUpdateStatus(rep.reportId, rep.status)}>
                  {rep.status === 'Resolved' ? 'Re-open' : 'Progress Status'}
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Card className="p-10 text-center">
          <p className="text-slate-400 font-medium">All incident reports resolved.</p>
        </Card>
      )}
    </div>
  );
};
