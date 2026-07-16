import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Check, Search } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { createHost } from '../../api/hosts';
import { fetchUsers } from '../../api/directory';
import type { User } from '../../types';
import { toast } from '../../lib/toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a host is created so the parent can refresh its list. */
  onCreated: () => void;
}

// Mirrors the categories and days offered on the public "become a host" form.
const MOODS = [
  'Adventurous',
  'Social',
  'Wellness',
  'Educational',
  'Creative',
  'Relaxing',
  'Culinary',
  'Cultural',
] as const;

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

const USER_RESULTS = 8;

// The users directory renders an em dash for a missing city; don't seed the
// form with it.
const cityOf = (u: User): string => (u.city === '—' ? '' : u.city);

export const CreateHostModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  // Which user the host is being created for. Hosts hang off a user record, so
  // this is the one thing the public form doesn't ask for (it uses the
  // logged-in user).
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<User[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [experienceDesc, setExperienceDesc] = useState('');
  const [category, setCategory] = useState('');
  const [isProfessional, setIsProfessional] = useState(false);
  const [description, setDescription] = useState('');
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [website, setWebsite] = useState('');
  const [preferredDays, setPreferredDays] = useState<string[]>([]);
  const [groupSize, setGroupSize] = useState(5);
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setSelectedUser(null);
    setUserSearch('');
    setUserResults([]);
    setFullName('');
    setCity('');
    setExperienceDesc('');
    setCategory('');
    setIsProfessional(false);
    setDescription('');
    setInstagram('');
    setLinkedin('');
    setWebsite('');
    setPreferredDays([]);
    setGroupSize(5);
  }, []);

  // Search users as the admin types. Skipped once a user is picked. Results
  // already in state are hidden by `showResults` rather than cleared here, so
  // the effect never sets state outside the debounced callback.
  const query = userSearch.trim();
  const showResults = !selectedUser && query.length >= 2;

  useEffect(() => {
    if (!showResults) return;
    let cancelled = false;
    const t = setTimeout(() => {
      setSearchingUsers(true);
      fetchUsers({ page: 1, pageSize: USER_RESULTS, search: query })
        .then((res) => {
          if (!cancelled) setUserResults(res.items);
        })
        .catch(() => {
          if (!cancelled) setUserResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearchingUsers(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, showResults]);

  const pickUser = (user: User) => {
    setSelectedUser(user);
    setUserResults([]);
    // Seed name and city from the user record, as the public form does.
    setFullName(user.name ?? '');
    setCity(cityOf(user));
  };

  const toggleDay = (day: string) => {
    setPreferredDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleClose = () => {
    if (saving) return;
    resetForm();
    onClose();
  };

  // Same required fields, in the same order, as the public application form.
  const validate = (): string | null => {
    if (!selectedUser) return 'Select the user this host is for.';
    if (!fullName.trim()) return 'Enter a full name.';
    if (!city.trim()) return 'Enter a city.';
    if (!experienceDesc.trim()) return 'Describe the experiences this host will run.';
    if (!category) return 'Select a category.';
    if (preferredDays.length === 0) return 'Select at least one preferred day.';
    if (!instagram.trim() && !linkedin.trim() && !website.trim()) {
      return 'Provide at least one social link.';
    }
    if (!description.trim()) return 'Provide a description.';
    return null;
  };

  const handleSave = async () => {
    const problem = validate();
    if (problem) {
      toast.error(problem);
      return;
    }
    // The backend stores first and last name separately; the public form splits
    // a single "full name" on the first space, so match that.
    const nameParts = fullName.trim().split(' ');
    setSaving(true);
    try {
      await createHost({
        user_id: selectedUser!.id,
        first_name: nameParts[0] ?? '',
        last_name: nameParts.slice(1).join(' '),
        city: city.trim(),
        experience_desc: experienceDesc.trim(),
        moods: [category.toLowerCase()],
        description: description.trim(),
        preferred_days: preferredDays.map((d) => d.toLowerCase()),
        group_size: groupSize,
        social_instagram: instagram.trim() || null,
        social_linkedin: linkedin.trim() || null,
        social_website: website.trim() || null,
        is_professional: isProfessional,
      });
      toast.success(`${fullName.trim()} is now an approved host.`);
      resetForm();
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create host.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create host">
      <div className="space-y-6">
        {/* User */}
        <section>
          <SectionTitle>User</SectionTitle>
          {selectedUser ? (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-brand-100 bg-brand-50/50 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">{selectedUser.name}</p>
                <p className="truncate text-xs font-medium text-slate-500">{selectedUser.email}</p>
              </div>
              <Button variant="secondary" disabled={saving} onClick={() => setSelectedUser(null)}>
                Change
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3">
                {showResults && searchingUsers ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : (
                  <Search className="h-4 w-4 text-slate-400" />
                )}
                <input
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Search users by name or email…"
                  value={userSearch}
                  disabled={saving}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              {showResults && userResults.length > 0 && (
                <ul className="mt-2 max-h-52 overflow-y-auto rounded-2xl border border-brand-100">
                  {userResults.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => pickUser(u)}
                        className="flex w-full items-center justify-between gap-3 border-b border-slate-50 px-4 py-2.5 text-left transition last:border-b-0 hover:bg-brand-50/60"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-ink">{u.name}</span>
                          <span className="block truncate text-xs font-medium text-slate-500">{u.email}</span>
                        </span>
                        <Check className="h-4 w-4 shrink-0 text-brand-500 opacity-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs font-medium text-slate-400">
                Hosts are created for people who already have an account. If they're
                already a host, creating another will fail.
              </p>
            </>
          )}
        </section>

        {/* Personal information */}
        <section>
          <SectionTitle>Personal information</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Full name" value={fullName} onChange={setFullName} disabled={saving} placeholder="e.g. Alex Rivera" />
            <TextField label="City of residence" value={city} onChange={setCity} disabled={saving} placeholder="e.g. Bengaluru" />
          </div>
        </section>

        {/* Experience details */}
        <section>
          <SectionTitle>Experience details</SectionTitle>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="What experiences will they host?"
                value={experienceDesc}
                onChange={setExperienceDesc}
                disabled={saving}
                placeholder="Activities they plan to host"
              />
              <label className="flex flex-col gap-1 text-xs font-bold text-slate-500">
                Category
                <select
                  className={inputClass}
                  value={category}
                  disabled={saving}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Select a category</option>
                  {MOODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-brand-100 p-4 transition hover:border-brand-200">
              <input
                type="checkbox"
                checked={isProfessional}
                disabled={saving}
                onChange={(e) => setIsProfessional(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-brand-200 text-brand-600 focus:ring-brand-400"
              />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-700">Professional host</span>
                <span className="mt-0.5 block text-xs font-medium text-slate-500">
                  Certified trainer, licensed guide, studio, etc. Professional hosts are
                  highlighted in Explore.
                </span>
              </span>
            </label>

            <label className="flex flex-col gap-1 text-xs font-bold text-slate-500">
              <span className="flex items-center justify-between">
                Description
                <span className="font-medium text-slate-400">{description.length}/300</span>
              </span>
              <textarea
                rows={4}
                maxLength={300}
                className={inputClass}
                value={description}
                disabled={saving}
                placeholder="Describe the magic they're planning to create…"
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </div>
        </section>

        {/* Social links */}
        <section>
          <SectionTitle>
            Social links <span className="font-medium normal-case text-slate-400">(at least one)</span>
          </SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Instagram" value={instagram} onChange={setInstagram} disabled={saving} placeholder="https://instagram.com/profile" />
            <TextField label="LinkedIn" value={linkedin} onChange={setLinkedin} disabled={saving} placeholder="https://linkedin.com/in/profile" />
            <TextField label="Website" value={website} onChange={setWebsite} disabled={saving} placeholder="https://website.com" className="sm:col-span-2" />
          </div>
        </section>

        {/* Availability */}
        <section>
          <SectionTitle>Availability</SectionTitle>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-bold text-slate-500">Preferred days</p>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => {
                  const selected = preferredDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={saving}
                      onClick={() => toggleDay(day)}
                      className={`rounded-full border px-4 py-2 text-xs font-extrabold tracking-wide transition disabled:opacity-50 ${
                        selected
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-brand-100 bg-white text-slate-600 hover:border-brand-300'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex flex-col gap-1 text-xs font-bold text-slate-500">
              Approximate group size
              <input
                type="number"
                min={1}
                max={100}
                className={`${inputClass} w-32`}
                value={groupSize}
                disabled={saving}
                onChange={(e) => setGroupSize(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </label>
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs font-medium text-slate-400">
            Created hosts are approved immediately and go live.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" disabled={saving} onClick={handleClose}>Cancel</Button>
            <Button variant="primary" disabled={saving} onClick={() => void handleSave()}>
              {saving ? 'Creating…' : 'Create host'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ── Small field primitives ────────────────────────────────────────────────────

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-brand-700">{children}</h4>
);

const inputClass =
  'w-full rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-400 disabled:opacity-50';

const TextField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}> = ({ label, value, onChange, disabled, placeholder, className }) => (
  <label className={`flex flex-col gap-1 text-xs font-bold text-slate-500 ${className ?? ''}`}>
    {label}
    <input
      className={inputClass}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  </label>
);
