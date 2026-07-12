import React, { useState } from 'react';
import { UploadCloud, Loader2, X } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { ImageCropModal } from '../../components/ImageCropModal';
import { updateHostProfile, uploadHostAvatar, uploadHostGallery } from '../../api/hosts';
import type { HostProfileUpdate } from '../../api/hosts';
import type { HostRecord } from '../../api/directory';
import { toast } from '../../lib/toast';

interface Props {
  host: HostRecord;
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful save so the parent can refresh its data. */
  onSaved: () => void;
}

// Comma-separated <-> string[] helpers. Splitting an empty string yields [] so
// clearing the field sends [] to the backend (an explicit "clear all").
const toList = (s: string): string[] =>
  s.split(',').map((t) => t.trim()).filter(Boolean);
const fromList = (a?: string[]): string => (a ?? []).join(', ');

export const EditHostProfileModal: React.FC<Props> = ({ host, isOpen, onClose, onSaved }) => {
  // Seed the form from the host record. Text fields fall back to '' so the
  // inputs stay controlled.
  const [firstName, setFirstName] = useState(host.first_name ?? '');
  const [lastName, setLastName] = useState(host.last_name ?? '');
  const [city, setCity] = useState(host.city ?? '');
  const [phone, setPhone] = useState(host.phn_number ?? '');
  const [tagline, setTagline] = useState(host.tagline ?? '');
  const [bio, setBio] = useState(host.bio ?? '');
  const [description, setDescription] = useState(host.description ?? '');
  const [groupSize, setGroupSize] = useState(host.group_size != null ? String(host.group_size) : '');
  const [governmentIdUrl, setGovernmentIdUrl] = useState(host.government_id_url ?? '');
  const [moods, setMoods] = useState(fromList(host.moods));
  const [preferredDays, setPreferredDays] = useState(fromList(host.preferred_days));
  const [expertiseTags, setExpertiseTags] = useState(fromList(host.expertise_tags));
  const [instagram, setInstagram] = useState(host.social_instagram ?? '');
  const [linkedin, setLinkedin] = useState(host.social_linkedin ?? '');
  const [website, setWebsite] = useState(host.social_website ?? '');
  const [isIdentityVerified, setIsIdentityVerified] = useState(!!host.is_identity_verified);
  const [isSuperHost, setIsSuperHost] = useState(!!host.is_super_host);
  const [isCommunityChamp, setIsCommunityChamp] = useState(!!host.is_community_champ);
  const [isProfessional, setIsProfessional] = useState(!!host.is_professional);

  const [avatarUrl, setAvatarUrl] = useState(host.avatar_url ?? '');
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [gallery, setGallery] = useState<string[]>(host.gallery_urls ?? []);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [saving, setSaving] = useState(false);

  const MAX_GALLERY = 8;

  const handleAvatarCropped = async (blob: Blob, fileName: string) => {
    setCropFile(null);
    setUploadingAvatar(true);
    try {
      const file = new File([blob], fileName, { type: blob.type });
      const url = await uploadHostAvatar(file);
      if (!url) throw new Error('No URL returned');
      setAvatarUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Avatar upload failed.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleGalleryFiles = async (files: File[]) => {
    if (files.length === 0) return;
    const room = MAX_GALLERY - gallery.length;
    if (room <= 0) {
      toast.error(`Gallery is limited to ${MAX_GALLERY} photos.`);
      return;
    }
    const toUpload = files.slice(0, room);
    setUploadingGallery(true);
    try {
      const urls = await uploadHostGallery(toUpload);
      if (urls.length === 0) throw new Error('No URLs returned');
      setGallery((prev) => [...prev, ...urls].slice(0, MAX_GALLERY));
      if (files.length > room) {
        toast.error(`Only ${room} of ${files.length} added — gallery caps at ${MAX_GALLERY}.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gallery upload failed.');
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleSave = async () => {
    const trimmedSize = groupSize.trim();
    if (trimmedSize !== '' && (!Number.isInteger(Number(trimmedSize)) || Number(trimmedSize) < 0)) {
      toast.error('Group size must be a whole number.');
      return;
    }
    const patch: HostProfileUpdate = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      city: city.trim(),
      phn_number: phone.trim(),
      avatar_url: avatarUrl,
      gallery_urls: gallery,
      tagline: tagline,
      bio: bio,
      description: description,
      group_size: trimmedSize === '' ? null : Number(trimmedSize),
      government_id_url: governmentIdUrl.trim(),
      moods: toList(moods),
      preferred_days: toList(preferredDays),
      expertise_tags: toList(expertiseTags),
      social_instagram: instagram.trim(),
      social_linkedin: linkedin.trim(),
      social_website: website.trim(),
      is_identity_verified: isIdentityVerified,
      is_super_host: isSuperHost,
      is_community_champ: isCommunityChamp,
      is_professional: isProfessional,
    };
    setSaving(true);
    try {
      await updateHostProfile(host.id, patch);
      toast.success('Host profile updated.');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || uploadingAvatar || uploadingGallery;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Edit host profile">
        <div className="space-y-6">
          {/* Avatar */}
          <section>
            <SectionTitle>Profile photo</SectionTitle>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-brand-50 text-lg font-extrabold text-brand-700">
                {avatarUrl
                  ? <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  : `${firstName} ${lastName}`.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '—'}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-brand-100 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-brand-50">
                {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                {uploadingAvatar ? 'Uploading…' : 'Change photo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setCropFile(f);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </section>

          {/* Gallery */}
          <section>
            <SectionTitle>
              Gallery <span className="font-medium normal-case text-slate-400">({gallery.length}/{MAX_GALLERY})</span>
            </SectionTitle>
            <div className="flex flex-wrap gap-3">
              {gallery.map((url, i) => (
                <div key={url} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-brand-100">
                  <img src={url} alt={`Gallery ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setGallery((prev) => prev.filter((u) => u !== url))}
                    className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/60 text-white opacity-0 transition hover:bg-rose-600 group-hover:opacity-100 disabled:opacity-0"
                    aria-label="Remove photo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {gallery.length < MAX_GALLERY && (
                <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-brand-200 text-slate-400 transition hover:border-brand-400 hover:text-brand-600">
                  {uploadingGallery ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
                  <span className="text-[11px] font-bold">{uploadingGallery ? 'Uploading…' : 'Add photos'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      void handleGalleryFiles(files);
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>
          </section>

          {/* Basics */}
          <section>
            <SectionTitle>Basics</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="First name" value={firstName} onChange={setFirstName} disabled={busy} />
              <TextField label="Last name" value={lastName} onChange={setLastName} disabled={busy} />
              <TextField label="City" value={city} onChange={setCity} disabled={busy} />
              <TextField label="Phone" value={phone} onChange={setPhone} disabled={busy} />
              <TextField label="Tagline" value={tagline} onChange={setTagline} disabled={busy} className="sm:col-span-2" />
              <NumberField label="Approx group size" value={groupSize} onChange={setGroupSize} disabled={busy} />
            </div>
          </section>

          {/* About */}
          <section>
            <SectionTitle>About</SectionTitle>
            <div className="space-y-4">
              <TextAreaField label="Bio" value={bio} onChange={setBio} disabled={busy} />
              <TextAreaField label="Description" value={description} onChange={setDescription} disabled={busy} />
            </div>
          </section>

          {/* Tags */}
          <section>
            <SectionTitle>Tags <span className="font-medium normal-case text-slate-400">(comma-separated)</span></SectionTitle>
            <div className="space-y-4">
              <TextField label="Expertise tags" value={expertiseTags} onChange={setExpertiseTags} disabled={busy} />
              <TextField label="Moods" value={moods} onChange={setMoods} disabled={busy} />
              <TextField label="Preferred days" value={preferredDays} onChange={setPreferredDays} disabled={busy} />
            </div>
          </section>

          {/* Social */}
          <section>
            <SectionTitle>Social</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Instagram" value={instagram} onChange={setInstagram} disabled={busy} />
              <TextField label="LinkedIn" value={linkedin} onChange={setLinkedin} disabled={busy} />
              <TextField label="Website" value={website} onChange={setWebsite} disabled={busy} className="sm:col-span-2" />
            </div>
          </section>

          {/* Verification & badges */}
          <section>
            <SectionTitle>Verification &amp; badges</SectionTitle>
            <div className="space-y-3">
              <TextField label="Government ID document URL" value={governmentIdUrl} onChange={setGovernmentIdUrl} disabled={busy} />
              <div className="flex flex-wrap gap-4 pt-1">
                <CheckboxField label="Identity verified" checked={isIdentityVerified} onChange={setIsIdentityVerified} disabled={busy} />
                <CheckboxField label="Super Host" checked={isSuperHost} onChange={setIsSuperHost} disabled={busy} />
                <CheckboxField label="Community Champ" checked={isCommunityChamp} onChange={setIsCommunityChamp} disabled={busy} />
                <CheckboxField label="Professional" checked={isProfessional} onChange={setIsProfessional} disabled={busy} />
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
            <Button variant="primary" disabled={busy} onClick={() => void handleSave()}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </Modal>

      <ImageCropModal
        file={cropFile}
        aspect={1}
        maxDimension={800}
        onClose={() => setCropFile(null)}
        onConfirm={handleAvatarCropped}
      />
    </>
  );
};

// ── Small field primitives ────────────────────────────────────────────────────

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-brand-700">{children}</h4>
);

const inputClass =
  'w-full rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-400 disabled:opacity-50';

const TextField: React.FC<{ label: string; value: string; onChange: (v: string) => void; disabled?: boolean; className?: string }> = ({ label, value, onChange, disabled, className }) => (
  <label className={`flex flex-col gap-1 text-xs font-bold text-slate-500 ${className ?? ''}`}>
    {label}
    <input className={inputClass} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
  </label>
);

const NumberField: React.FC<{ label: string; value: string; onChange: (v: string) => void; disabled?: boolean }> = ({ label, value, onChange, disabled }) => (
  <label className="flex flex-col gap-1 text-xs font-bold text-slate-500">
    {label}
    <input type="number" min={0} step={1} className={inputClass} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
  </label>
);

const TextAreaField: React.FC<{ label: string; value: string; onChange: (v: string) => void; disabled?: boolean }> = ({ label, value, onChange, disabled }) => (
  <label className="flex flex-col gap-1 text-xs font-bold text-slate-500">
    {label}
    <textarea rows={3} className={inputClass} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
  </label>
);

const CheckboxField: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({ label, checked, onChange, disabled }) => (
  <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
    <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-brand-200 text-brand-600 focus:ring-brand-400" />
    {label}
  </label>
);
