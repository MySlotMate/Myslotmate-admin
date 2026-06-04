import React, { useState } from 'react';
import { useMockData } from '../../context/MockDataContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

export const SettingsManager: React.FC = () => {
  const {
    commission, setCommission,
    payoutSchedule, setPayoutSchedule,
    instantHostApprovals, setInstantHostApprovals,
    dynamicPricing, setDynamicPricing,
    waitlistMode, setWaitlistMode,
    adminRoles, setAdminRoles
  } = useMockData();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('City Ops Lead');
  const [inviteScope, setInviteScope] = useState('');

  const handleSaveSettings = () => {
    alert('Global commission fee margins and operational parameters saved successfully.');
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteScope) {
      alert('Please fill out name and scope fields.');
      return;
    }

    const newAdmin = {
      name: inviteName,
      role: inviteRole,
      scope: inviteScope,
      lastActive: 'Just invited',
      status: 'Active' as const
    };

    setAdminRoles(prev => [...prev, newAdmin]);
    setInviteName('');
    setInviteScope('');
    setIsInviteOpen(false);
    alert(`Invite sent to ${inviteName} successfully!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-700">Platform settings</p>
          <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            Control commissions, payout rhythm, feature flags, and admin access.
          </h3>
        </div>
        <Button variant="primary" onClick={handleSaveSettings}>
          Save changes
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        {/* Core settings */}
        <Card className="space-y-6 p-6 bg-white/95">
          <div>
            <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="commissionInput">
              Commission percentage (%)
            </label>
            <input 
              id="commissionInput"
              className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" 
              type="number" 
              step="0.1"
              value={commission}
              onChange={(e) => setCommission(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="payoutScheduleSelect">
              Host payout schedule
            </label>
            <select 
              id="payoutScheduleSelect"
              className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400"
              value={payoutSchedule}
              onChange={(e) => setPayoutSchedule(e.target.value)}
            >
              <option>Weekly on Friday</option>
              <option>Bi-weekly</option>
              <option>Monthly</option>
            </select>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold text-slate-600">Feature toggles</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <div>
                  <p className="font-bold text-sm text-ink">Instant host approvals</p>
                  <p className="text-xs text-slate-500">Auto-approve trusted returning creators</p>
                </div>
                <button
                  type="button"
                  onClick={() => setInstantHostApprovals(!instantHostApprovals)}
                  className={`relative h-7 w-12 rounded-full cursor-pointer transition after:content-[""] after:absolute after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition ${
                    instantHostApprovals ? 'bg-brand-600 after:left-6' : 'bg-brand-100 after:left-1'
                  }`}
                  aria-label="Instant host approvals toggle"
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <div>
                  <p className="font-bold text-sm text-ink">Dynamic city pricing</p>
                  <p className="text-xs text-slate-500">Allow market-based price guidance</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDynamicPricing(!dynamicPricing)}
                  className={`relative h-7 w-12 rounded-full cursor-pointer transition after:content-[""] after:absolute after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition ${
                    dynamicPricing ? 'bg-brand-600 after:left-6' : 'bg-brand-100 after:left-1'
                  }`}
                  aria-label="Dynamic city pricing toggle"
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <div>
                  <p className="font-bold text-sm text-ink">Waitlist mode for sold out sessions</p>
                  <p className="text-xs text-slate-500">Collect demand before extra slots are added</p>
                </div>
                <button
                  type="button"
                  onClick={() => setWaitlistMode(!waitlistMode)}
                  className={`relative h-7 w-12 rounded-full cursor-pointer transition after:content-[""] after:absolute after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition ${
                    waitlistMode ? 'bg-brand-600 after:left-6' : 'bg-brand-100 after:left-1'
                  }`}
                  aria-label="Waitlist mode toggle"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Roles Management */}
        <Card className="p-6 overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-lg font-bold text-ink">Admin roles</h3>
              <p className="text-xs text-mist mt-0.5">Manage permissions for trust, finance, and city teams.</p>
            </div>
            <Button variant="secondary" onClick={() => setIsInviteOpen(true)}>
              Invite admin
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50/80 text-[10px] uppercase tracking-[0.14em] text-slate-500 font-extrabold">
                <tr>
                  <th className="px-6 py-4 font-extrabold">Name</th>
                  <th className="px-6 py-4 font-extrabold">Role</th>
                  <th className="px-6 py-4 font-extrabold">Scope</th>
                  <th className="px-6 py-4 font-extrabold">Last Active</th>
                  <th className="px-6 py-4 font-extrabold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/90">
                {adminRoles.map((admin, idx) => (
                  <tr key={idx} className="hover:bg-brand-50/40 transition">
                    <td className="px-6 py-4 align-top font-bold text-ink">{admin.name}</td>
                    <td className="px-6 py-4 align-top text-slate-700 font-medium">{admin.role}</td>
                    <td className="px-6 py-4 align-top text-slate-600">{admin.scope}</td>
                    <td className="px-6 py-4 align-top text-slate-500">{admin.lastActive}</td>
                    <td className="px-6 py-4 align-top">
                      <Badge color={admin.status === 'Active' ? 'green' : 'blue'}>
                        {admin.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Invite Admin Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite New Administrator"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="inviteNameInput">Full Name</label>
            <input 
              id="inviteNameInput" 
              className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" 
              type="text" 
              placeholder="e.g. Harsh Vardhan"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="inviteRoleSelect">Role</label>
              <select 
                id="inviteRoleSelect" 
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option>Super Admin</option>
                <option>Finance Admin</option>
                <option>Trust & Safety</option>
                <option>City Ops Lead</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="inviteScopeInput">Operational Scope</label>
              <input 
                id="inviteScopeInput" 
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" 
                type="text" 
                placeholder="e.g. Mumbai + Pune, Finance settlements"
                value={inviteScope}
                onChange={(e) => setInviteScope(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
            <Button variant="secondary" type="button" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Send Invite
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
