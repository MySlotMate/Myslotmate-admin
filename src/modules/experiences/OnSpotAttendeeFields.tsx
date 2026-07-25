import React, { useState } from 'react';
import { toast } from '../../lib/toast';
import { uploadFiles } from '../../api/events';
import { ATTENDEE_FIELDS } from '../../lib/attendeeFields';

// The on-spot booking form holds every answer as a plain string, mirroring the
// customer booking form: govt_id_url = uploaded URL, travel = "yes"|"no",
// age = numeric string. All shown fields are required.
export type AttendeeValues = Record<string, string>;

// Typed upsert payload sent to the backend (walk-in initiate). Only the required
// fields are populated; string values are coerced to their real types.
export interface AttendeeDetailsPayload {
  name?: string;
  age?: number;
  gender?: string;
  qualification?: string;
  occupation?: string;
  marital_status?: string;
  contact_number?: string;
  whatsapp_number?: string;
  registration_type?: string;
  govt_id_url?: string;
  travel?: boolean;
  social_link?: string;
}

/**
 * Renders the attendee-details fields an event requires, inside the on-spot
 * booking modal. Styled to match the admin design system (rounded-2xl,
 * brand-100 borders, uppercase labels).
 */
export const OnSpotAttendeeFields: React.FC<{
  fields: string[];
  values: AttendeeValues;
  onChange: (key: string, value: string) => void;
  showErrors: boolean;
  disabled?: boolean;
}> = ({ fields, values, onChange, showErrors, disabled }) => {
  const [uploadingId, setUploadingId] = useState(false);

  const enabled = ATTENDEE_FIELDS.filter((f) => fields.includes(f.key));
  if (enabled.length === 0) return null;

  const inputClass = (key: string) =>
    `w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-brand-400 disabled:bg-slate-50 disabled:text-slate-500 ${
      showErrors && !values[key] ? 'border-rose-300 bg-rose-50' : 'border-brand-100'
    }`;

  const handleIdUpload = async (file: File) => {
    setUploadingId(true);
    try {
      const res = await uploadFiles([file], 'attendees/id-proofs');
      const url = res?.[0]?.url;
      if (url) onChange('govt_id_url', url);
      else toast.error('Upload failed. Please try again.');
    } catch {
      toast.error('Could not upload the ID. Please try again.');
    } finally {
      setUploadingId(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-brand-100 bg-brand-50/30 p-4">
      <div>
        <p className="text-sm font-semibold text-ink">Attendee details</p>
        <p className="text-xs text-slate-500">This experience requires a few extra details from the guest.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {enabled.map((f) => (
          <div key={f.key} className={f.type === 'file' ? 'sm:col-span-2' : undefined}>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
              {f.label} <span className="text-rose-500">*</span>
            </label>

            {f.type === 'select' && (
              <select
                value={values[f.key] ?? ''}
                onChange={(e) => onChange(f.key, e.target.value)}
                className={inputClass(f.key)}
                disabled={disabled}
              >
                <option value="" disabled>
                  Select {f.label.toLowerCase()}
                </option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}

            {f.type === 'bool' && (
              <select
                value={values[f.key] ?? ''}
                onChange={(e) => onChange(f.key, e.target.value)}
                className={inputClass(f.key)}
                disabled={disabled}
              >
                <option value="" disabled>
                  Select
                </option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            )}

            {f.type === 'file' && (
              <>
                <input
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleIdUpload(file);
                  }}
                  disabled={disabled || uploadingId}
                  className="w-full rounded-2xl border border-brand-100 px-4 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-700"
                />
                {uploadingId && <p className="mt-1 text-xs text-brand-600">Uploading…</p>}
                {values[f.key] && !uploadingId && (
                  <p className="mt-1 text-xs font-medium text-emerald-600">ID uploaded ✓</p>
                )}
                {showErrors && !values[f.key] && !uploadingId && (
                  <p className="mt-1 text-xs text-rose-500">Please upload the ID proof.</p>
                )}
              </>
            )}

            {(f.type === 'text' || f.type === 'tel' || f.type === 'number') && (
              <input
                type={f.type === 'number' ? 'number' : f.type}
                inputMode={f.type === 'tel' ? 'tel' : f.type === 'number' ? 'numeric' : undefined}
                value={values[f.key] ?? ''}
                onChange={(e) => onChange(f.key, e.target.value)}
                placeholder={f.label}
                className={inputClass(f.key)}
                disabled={disabled}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/** True when every required field has a value. `age` must be a positive number. */
export function attendeeFormValid(fields: string[], values: AttendeeValues): boolean {
  return fields.every((key) => {
    const v = values[key];
    if (!v) return false;
    if (key === 'age') return Number(v) > 0;
    return true;
  });
}

/** Builds the typed upsert payload from the string form values, including only
 *  the fields the event requires (mirrors the customer booking page). */
export function buildAttendeePayload(fields: string[], values: AttendeeValues): AttendeeDetailsPayload {
  const p: AttendeeDetailsPayload = {};
  if (fields.includes('name')) p.name = values.name;
  if (fields.includes('age')) p.age = Number(values.age);
  if (fields.includes('gender')) p.gender = values.gender;
  if (fields.includes('qualification')) p.qualification = values.qualification;
  if (fields.includes('occupation')) p.occupation = values.occupation;
  if (fields.includes('marital_status')) p.marital_status = values.marital_status;
  if (fields.includes('contact_number')) p.contact_number = values.contact_number;
  if (fields.includes('whatsapp_number')) p.whatsapp_number = values.whatsapp_number;
  if (fields.includes('registration_type')) p.registration_type = values.registration_type;
  if (fields.includes('govt_id_url')) p.govt_id_url = values.govt_id_url;
  if (fields.includes('travel')) p.travel = values.travel === 'yes';
  if (fields.includes('social_link')) p.social_link = values.social_link;
  return p;
}
