// Everything a host sent with their two-path application (community or
// professional), as the backend stores it on the host record. Shared by the
// Host applications review page and the host profile.

import React, { useState } from 'react';
import { ExternalLink, FileText, Users, Briefcase } from 'lucide-react';
import type { HostRecord } from '../../api/directory';

const has = (v?: string | null) => !!v && v.trim() !== '';

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-white/45">{label}</p>
      <div className="mt-0.5 text-sm break-words text-white">{children}</div>
    </div>
  );
}

function Doc({ label, url }: { label: string; url?: string }) {
  if (!has(url)) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-dashed border-white/10 px-3.5 py-3 text-sm text-white/35">
        <FileText className="h-4 w-4 shrink-0" /> {label} · not provided
      </div>
    );
  }
  return <DocLink label={label} url={url!} />;
}

function DocLink({ label, url }: { label: string; url: string }) {
  // Some older documents sit in a bucket the browser can't read; show a file
  // icon instead of a broken image when the preview fails to load.
  const [broken, setBroken] = useState(false);
  const isImage = !broken && /\.(png|jpe?g|webp|gif|heic)(\?|$)/i.test(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2 pr-3.5 text-sm text-white transition hover:border-white/25"
    >
      {isImage ? (
        <img
          src={url}
          alt=""
          onError={() => setBroken(true)}
          className="h-12 w-12 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
          <FileText className="h-5 w-5 text-[#D8B4FE]" />
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ExternalLink className="h-4 w-4 shrink-0 text-white/40 group-hover:text-white" />
    </a>
  );
}

const linkOrText = (v: string) =>
  /^https?:\/\//i.test(v) ? (
    <a href={v} target="_blank" rel="noopener noreferrer" className="text-[#D8B4FE] underline underline-offset-2">
      {v}
    </a>
  ) : (
    v
  );

/** Community / Professional pill for a host. */
export function HostTypePill({ host }: { host: HostRecord }) {
  const pro = (host.host_type ?? (host.is_professional ? 'professional' : 'community')) === 'professional';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        pro ? 'bg-sky-400/15 text-sky-300' : 'bg-[#7B2FFF]/20 text-[#D8B4FE]'
      }`}
    >
      {pro ? <Briefcase className="h-3 w-3" /> : <Users className="h-3 w-3" />}
      {pro ? 'Professional' : 'Community'}
    </span>
  );
}

export function ApplicationAnswers({
  host,
  showBasics = true,
}: {
  host: HostRecord;
  /** The older free-text answers; the host profile shows these in "About". */
  showBasics?: boolean;
}) {
  const pro = (host.host_type ?? (host.is_professional ? 'professional' : 'community')) === 'professional';
  const photos = host.portfolio_photo_urls ?? [];

  const community: [string, string | undefined][] = [
    ['Community name', host.community_name],
    ['Category', host.community_category],
    ['Years of experience', host.years_experience],
    ['Events hosted', host.events_hosted],
    ['Portfolio link', host.portfolio_url],
  ];
  const professional: [string, string | undefined][] = [
    ['Profession', host.profession],
    ['Specialisation', host.specialization],
    ['Licence number', host.license_number],
    ['Professional body', host.professional_body],
    ['Work history', host.work_history],
    ['Achievements', host.achievements],
    ['Testimonial', host.testimonial_url],
  ];
  const rows = (pro ? professional : community).filter(([, v]) => has(v));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <HostTypePill host={host} />
        {(host.languages ?? []).map((l) => (
          <span key={l} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-white/70">
            {l}
          </span>
        ))}
      </div>

      {rows.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map(([label, v]) => (
            <Item key={label} label={label}>
              {linkOrText(v!)}
            </Item>
          ))}
        </div>
      ) : (
        <p className="text-sm text-white/45">
          No {pro ? 'professional' : 'community'} details on file. Hosts who applied before the
          two-path form only sent the basics.
        </p>
      )}

      {showBasics && (has(host.description) || has(host.experience_desc)) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {has(host.experience_desc) && <Item label="What they'd host">{host.experience_desc}</Item>}
          {has(host.description) && <Item label="About">{host.description}</Item>}
        </div>
      )}

      <div>
        <p className="mb-2 text-xs text-white/45">Documents (private)</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Doc label="Government ID" url={host.government_id_url} />
          <Doc label="Selfie" url={host.selfie_url} />
          {pro && <Doc label="Certificate" url={host.certificate_url} />}
          {pro && <Doc label="Degree" url={host.degree_url} />}
        </div>
      </div>

      {photos.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-white/45">Portfolio photos</p>
          <div className="flex flex-wrap gap-2">
            {photos.map((u) => (
              <a key={u} href={u} target="_blank" rel="noopener noreferrer">
                <img src={u} alt="" className="h-24 w-20 rounded-xl object-cover transition hover:opacity-80" />
              </a>
            ))}
          </div>
        </div>
      )}

      {host.application_status === 'rejected' && has(host.rejection_reason) && (
        <Item label="Rejection reason">{host.rejection_reason}</Item>
      )}
    </div>
  );
}
