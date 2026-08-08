import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import {
  fetchAdminNotificationSettings,
  updateAdminNotificationSettings,
  type AdminWhatsAppNumber,
} from '../api/settings';
import { Plus, Trash2, Check, Phone, ShieldAlert, Loader2 } from 'lucide-react';

interface AdminNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminNotificationModal: React.FC<AdminNotificationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [numbers, setNumbers] = useState<AdminWhatsAppNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  // New number form state
  const [newLabel, setNewLabel] = useState('');
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    setLoading(true);
    setError(null);
    async function loadConfig() {
      const res = await fetchAdminNotificationSettings();
      if (alive) {
        setNumbers(res.admin_whatsapp_numbers || []);
        setLoading(false);
      }
    }
    void loadConfig();
    return () => {
      alive = false;
    };
  }, [isOpen]);

  const handleSave = async (updatedList: AdminWhatsAppNumber[]) => {
    setSaving(true);
    setError(null);
    try {
      await updateAdminNotificationSettings({ admin_whatsapp_numbers: updatedList });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save notification numbers.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = (index: number) => {
    const next = numbers.map((item, i) =>
      i === index ? { ...item, active: !item.active } : item
    );
    setNumbers(next);
    void handleSave(next);
  };

  const handleDelete = (index: number) => {
    const next = numbers.filter((_, i) => i !== index);
    setNumbers(next);
    void handleSave(next);
  };

  const handleAddNumber = (e: React.FormEvent) => {
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
    void handleSave(next);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="WhatsApp Approval Alerts">
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
          <ShieldAlert className="h-5 w-5 shrink-0 text-brand-600 mt-0.5" />
          <div className="text-xs text-slate-600">
            <p className="font-bold text-ink mb-0.5">Pending Host Application Alerts</p>
            <p>
              When a user submits a new host application request, Kapso WhatsApp alerts will automatically be dispatched to all active admin numbers configured below.
            </p>
          </div>
        </div>

        {/* Existing numbers list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Configured Admin Recipients ({numbers.length})
            </h4>
            {justSaved && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 animate-fadeIn">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-6 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-600" />
              <p className="mt-2 text-xs font-medium text-slate-400">Loading settings…</p>
            </div>
          ) : numbers.length === 0 ? (
            <Card className="p-6 text-center text-xs text-slate-400 border-dashed">
              No WhatsApp alert recipients added yet. Add a phone number below to receive instant alerts.
            </Card>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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
                      onClick={() => handleToggleActive(idx)}
                      className="cursor-pointer focus:outline-none"
                      title={item.active ? 'Disable alerts' : 'Enable alerts'}
                    >
                      <Badge color={item.active ? 'green' : 'slate'}>
                        {item.active ? 'Active' : 'Disabled'}
                      </Badge>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(idx)}
                      title="Remove number"
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

        {/* Add new number form */}
        <form onSubmit={handleAddNumber} className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5 text-brand-600" /> Add Admin WhatsApp Recipient
          </h4>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1" htmlFor="numLabel">
                Recipient Label / Role
              </label>
              <input
                id="numLabel"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-ink outline-none transition focus:border-brand-400"
                type="text"
                placeholder="e.g. Operations Manager"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1" htmlFor="numPhone">
                WhatsApp Phone Number
              </label>
              <input
                id="numPhone"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-ink outline-none transition focus:border-brand-400"
                type="tel"
                placeholder="e.g. +919876543210"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}

          <Button variant="primary" type="submit" size="sm" className="w-full flex items-center justify-center gap-1.5" disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {saving ? 'Saving changes…' : 'Add Recipient Number'}
          </Button>
        </form>

        <div className="flex justify-end pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
