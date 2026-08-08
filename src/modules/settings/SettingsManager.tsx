import React, { useState, useEffect } from 'react';
import { useMockData } from '../../context/MockDataContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import {
  fetchAdminNotificationSettings,
  updateAdminNotificationSettings,
  type AdminWhatsAppNumber,
} from '../../api/settings';
import { Phone, Plus, Trash2, Check, ShieldAlert, Loader2 } from 'lucide-react';

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

  // WhatsApp Alert Numbers State
  const [numbers, setNumbers] = useState<AdminWhatsAppNumber[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [justSavedNotif, setJustSavedNotif] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    let alive = true;
    setNotifLoading(true);
    async function loadConfig() {
      const res = await fetchAdminNotificationSettings();
      if (alive) {
        setNumbers(res.admin_whatsapp_numbers || []);
        setNotifLoading(false);
      }
    }
    void loadConfig();
    return () => {
      alive = false;
    };
  }, []);

  const handleSaveNotif = async (updatedList: AdminWhatsAppNumber[]) => {
    setNotifSaving(true);
    setNotifError(null);
    try {
      await updateAdminNotificationSettings({ admin_whatsapp_numbers: updatedList });
      setJustSavedNotif(true);
      setTimeout(() => setJustSavedNotif(false), 2000);
    } catch (err) {
      setNotifError(err instanceof Error ? err.message : 'Failed to save WhatsApp alert settings.');
    } finally {
      setNotifSaving(false);
    }
  };

  const handleToggleActiveNotif = (index: number) => {
    const next = numbers.map((item, i) =>
      i === index ? { ...item, active: !item.active } : item
    );
    setNumbers(next);
    void handleSaveNotif(next);
  };

  const handleDeleteNotif = (index: number) => {
    const next = numbers.filter((_, i) => i !== index);
    setNumbers(next);
    void handleSaveNotif(next);
  };

  const handleAddNotifNumber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) {
      alert('Please enter a valid phone number.');
      return;
    }
    let formattedPhone = newPhone.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone.replace(/^0+/, '');
    }
    const newItem: AdminWhatsAppNumber = {
      label: newLabel.trim() || 'Admin Operations',
      phone: formattedPhone,
      active: true,
    };
    const next = [...numbers, newItem];
    setNumbers(next);
    setNewLabel('');
    setNewPhone('');
    void handleSaveNotif(next);
  };

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

        {/* Admin WhatsApp Alert Recipients */}
        <Card className="p-6 col-span-full">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-brand-600" /> WhatsApp Host Approval Alert Recipients
              </h3>
              <p className="text-xs text-mist mt-0.5">
                Configure admin phone numbers that receive automated Kapso WhatsApp alerts whenever a host submits a pending application request.
              </p>
            </div>
            {justSavedNotif && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 animate-fadeIn">
                <Check className="h-4 w-4" /> Changes saved
              </span>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Existing numbers list */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Active Admin Recipients ({numbers.length})
              </h4>
              {notifLoading ? (
                <div className="p-6 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-600" />
                  <p className="mt-2 text-xs text-slate-400 font-medium">Loading WhatsApp alert recipients…</p>
                </div>
              ) : numbers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                  No WhatsApp alert recipients configured yet. Add a recipient number below.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {numbers.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition ${
                        item.active ? 'border-slate-200 bg-white shadow-xs' : 'border-slate-100 bg-slate-50/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg ${item.active ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-400'}`}>
                          <Phone className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-ink">{item.label}</p>
                          <p className="truncate text-[11px] font-mono font-medium text-slate-500">{item.phone}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleActiveNotif(idx)}
                          className="cursor-pointer focus:outline-none"
                          title={item.active ? 'Disable alerts' : 'Enable alerts'}
                        >
                          <Badge color={item.active ? 'green' : 'slate'}>
                            {item.active ? 'Active' : 'Disabled'}
                          </Badge>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteNotif(idx)}
                          title="Remove recipient"
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add recipient form */}
            <form onSubmit={handleAddNotifNumber} className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 text-brand-600" /> Add Recipient Number
              </h4>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1" htmlFor="settingsNumLabel">
                    Recipient Role / Name
                  </label>
                  <input
                    id="settingsNumLabel"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-ink outline-none transition focus:border-brand-400"
                    type="text"
                    placeholder="e.g. Operations Lead"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1" htmlFor="settingsNumPhone">
                    WhatsApp Phone Number
                  </label>
                  <input
                    id="settingsNumPhone"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-ink outline-none transition focus:border-brand-400"
                    type="tel"
                    placeholder="e.g. +919876543210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                </div>
              </div>

              {notifError && <p className="text-xs font-semibold text-rose-600">{notifError}</p>}

              <Button variant="primary" type="submit" size="sm" className="w-full flex items-center justify-center gap-1.5" disabled={notifSaving}>
                {notifSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {notifSaving ? 'Saving changes…' : 'Add Recipient Number'}
              </Button>
            </form>
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
