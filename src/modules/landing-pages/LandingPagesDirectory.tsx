import React, { useEffect, useRef, useState } from 'react';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { RichTextEditor, RichTextView } from '../../components/RichTextEditor';
import { ImageCropModal } from '../../components/ImageCropModal';
import {
  ArrowLeft,
  BadgeCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Lock,
  MapPin,
  Navigation,
  Share,
  ShieldAlert,
  Star,
  Users,
  Video,
} from 'lucide-react';
import {
  SITE_URL,
  createLandingPage,
  deleteLandingPage,
  fetchLandingPages,
  setLandingPagePublished,
  updateLandingPage,
  uploadLandingImage,
  searchMarketingEvents,
  type MarketingEventOption,
  type LandingPageDTO,
  type LandingPageUpdatePayload,
  fetchLiveEvent,
  type LiveEventData,
} from '../../api/landingPages';

const inputCls =
  'w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400';

function toForm(p: LandingPageDTO): LandingPageUpdatePayload {
  return {
    slug: p.slug,
    title: p.title,
    hook_line: p.hook_line ?? '',
    cover_image_url: p.cover_image_url ?? '',
    gallery_urls: p.gallery_urls ?? [],
    content: p.content ?? '',
    cta_text: p.cta_text ?? '',
    seo_description: p.seo_description ?? '',
  };
}

const errMsg = (err: unknown, fallback: string) => (err instanceof Error && err.message) || fallback;

const Label: React.FC<{ children: React.ReactNode; hint?: string }> = ({ children, hint }) => (
  <label className="mb-2 block text-xs font-bold text-slate-600">
    {children}
    {hint && <span className="ml-2 font-normal text-slate-400">{hint}</span>}
  </label>
);

// ── Live-page mirror helpers ─────────────────────────────────────────────
// Copied from the website's event page (ExperienceDetailClient.tsx, lib/moods.ts,
// lib/hostTier.ts, lib/datetime.ts) so the preview shows what visitors see.

const ist = (d: string | Date, opts: Intl.DateTimeFormatOptions, locale = 'en-GB') =>
  new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Kolkata', ...opts }).format(new Date(d));
const istDay = (d: string) => ist(d, { year: 'numeric', month: '2-digit', day: '2-digit' }, 'en-CA');
const istWeekday = (d: string) => ist(d, { weekday: 'short' });
const istDayMonth = (d: string) => ist(d, { day: 'numeric', month: 'short' });
const istTime = (d: string | Date) => ist(d, { hour: 'numeric', minute: '2-digit', hour12: true }, 'en-US');

// ponytail: only the moods whose label differs from the title-cased value;
// the full alias list is in the website's lib/moods.ts.
const MOOD_LABELS: Record<string, string> = {
  chill: 'Relaxing',
  relaxing: 'Relaxing',
  adventurous: 'Adventure',
  education: 'Educational',
  culture: 'Cultural',
  food: 'Foodie',
  style: 'Fashion',
  kids: 'Family',
  mentorship: 'Career',
  language: 'Languages',
  coding: 'Tech',
  finance: 'Business',
};
const moodLabel = (m: string) => {
  const k = m.trim().toLowerCase();
  return MOOD_LABELS[k] ?? k.replace(/\b\w/g, (c) => c.toUpperCase());
};

function livePreview(live: LiveEventData | null, pickedDate: string | null, allDates: boolean) {
  if (!live) return null;
  const { event, availability, host, rating } = live;
  const now = new Date();
  const baseDate = event.next_available_date ?? event.time;
  const upcoming = (availability ?? []).filter((a) => new Date(a.date) >= now);
  const openDays: string[] = [];
  const seen = new Set<string>();
  for (const a of upcoming) {
    if (a.is_fully_booked) continue;
    const day = istDay(a.date);
    if (seen.has(day)) continue;
    seen.add(day);
    openDays.push(a.date);
  }
  const dateChips = allDates ? openDays : openDays.slice(0, 4);
  const shownDate = pickedDate ?? openDays[0] ?? baseDate;
  const endDate =
    shownDate && event.duration_minutes
      ? new Date(new Date(shownDate).getTime() + event.duration_minutes * 60_000)
      : null;
  const tiers = event.price_tiers ?? [];
  const fromCents = tiers.length ? Math.min(...tiers.map((t) => t.price_cents)) : (event.price_cents ?? 0);
  const hasPassed = availability ? upcoming.length === 0 && !!baseDate && new Date(baseDate) < now : false;
  const soldOut = availability
    ? upcoming.length > 0 && upcoming.every((a) => a.is_fully_booked)
    : event.capacity - event.total_bookings <= 0;
  const unverifiedHost = host
    ? host.host_tier
      ? host.host_tier === 'unverified'
      : Boolean(host.application_status && host.application_status !== 'approved')
    : false;
  return {
    event,
    host,
    unverifiedHost,
    rating: rating?.average_rating ?? null,
    totalReviews: rating?.total_reviews ?? 0,
    place: event.is_online ? 'Online' : (event.location ?? 'Location shared after booking'),
    manyDates: event.is_recurring || event.schedule_type === 'custom_dates' || (event.custom_dates?.length ?? 0) > 0,
    openDays,
    dateChips,
    shownDate,
    endDate,
    price: `₹${(fromCents / 100).toFixed(0)}`,
    status: hasPassed ? 'Event has passed' : soldOut ? 'Fully booked' : null,
    directions:
      event.google_maps_url ??
      (event.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}` : null),
  };
}

export const LandingPagesDirectory: React.FC = () => {
  const [pages, setPages] = useState<LandingPageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Editor state
  const [editing, setEditing] = useState<LandingPageDTO | null>(null);
  const [form, setForm] = useState<LandingPageUpdatePayload | null>(null);
  // Which text on the page canvas is being edited (double-click to start).
  const [activeField, setActiveField] = useState<'title' | 'hook' | 'content' | 'cta' | null>(null);
  // Images waiting for the crop step: 4:5, as the website's event form crops them.
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [cropTarget, setCropTarget] = useState<'cover' | 'gallery'>('cover');
  const inlineInputRef = useRef<HTMLInputElement | null>(null);
  const inlineResolverRef = useRef<((url: string | null) => void) | null>(null);

  // New-page event picker
  const [picking, setPicking] = useState(false);
  const [eventQuery, setEventQuery] = useState('');
  const [eventResults, setEventResults] = useState<MarketingEventOption[]>([]);

  // The linked event as the website shows it (dates, location, host, price).
  const [live, setLive] = useState<{ slug: string; data: LiveEventData | null } | null>(null);
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [allDates, setAllDates] = useState(false);
  const eventSlug = editing?.event_slug;
  useEffect(() => {
    if (!eventSlug) return;
    let stale = false;
    fetchLiveEvent(eventSlug)
      .then((data) => !stale && setLive({ slug: eventSlug, data }))
      .catch(() => !stale && setLive({ slug: eventSlug, data: null }));
    return () => {
      stale = true;
    };
  }, [eventSlug]);
  const lp = livePreview(live && live.slug === eventSlug ? live.data : null, pickedDate, allDates);

  const chip =
    'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur';
  const hostedBy = lp?.host && (
    <div>
      <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-white/45 uppercase">Hosted by</p>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <img
            src={lp.host.avatar_url || `${SITE_URL}/assets/home/profile1.png`}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-white/15"
          />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
              <span className="truncate">
                {lp.host.first_name} {lp.host.last_name}
              </span>
              {lp.host.is_identity_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-[#B57BFF]" />}
            </p>
            <p className="truncate text-xs text-white/55">
              {lp.host.tagline ?? (lp.host.city ? `Host in ${lp.host.city}` : 'Host')}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white">
            View Profile
          </span>
        </div>
        {lp.unverifiedHost && (
          <p className="flex items-start gap-2 rounded-2xl border border-amber-400/25 bg-amber-400/[0.08] px-3.5 py-2.5 text-xs leading-5 text-amber-100/80">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <span>
              <span className="font-semibold text-amber-200">Community event.</span> This host isn&apos;t verified by
              MySlotMate. Never pay outside the app, and report anything that feels off.
            </span>
          </p>
        )}
      </div>
    </div>
  );

  const load = async () => {
    try {
      setLoading(true);
      setPages(await fetchLandingPages());
      setError('');
    } catch (err) {
      setError(errMsg(err, 'Failed to load landing pages.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLandingPages()
      .then(setPages)
      .catch((err) => setError(errMsg(err, 'Failed to load landing pages.')))
      .finally(() => setLoading(false));
  }, []);

  // Event picker for "Create new": lists events right away, search narrows it.
  useEffect(() => {
    if (!picking) return;
    const t = setTimeout(() => {
      searchMarketingEvents(eventQuery.trim() || undefined)
        .then((res) => setEventResults(res.items))
        .catch(() => setEventResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [picking, eventQuery]);

  const openEditor = (p: LandingPageDTO) => {
    setEditing(p);
    setForm(toForm(p));
    setActiveField(null);
    setPickedDate(null);
    setAllDates(false);
  };

  const closeEditor = () => {
    setEditing(null);
    setForm(null);
  };

  // Back buttons: warn before throwing away unsaved edits.
  const leaveEditor = () => {
    const dirty = editing && form && JSON.stringify(form) !== JSON.stringify(toForm(editing));
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
    closeEditor();
  };

  const set = <K extends keyof LandingPageUpdatePayload>(key: K, value: LandingPageUpdatePayload[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const handleCreate = async (evt: MarketingEventOption) => {
    try {
      setLoading(true);
      const page = await createLandingPage(evt.id);
      setPicking(false);
      setEventQuery('');
      await load();
      openEditor(page);
    } catch (err) {
      alert(errMsg(err, 'Could not create landing page.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (publish?: boolean) => {
    if (!editing || !form) return;
    if (!form.title.trim()) {
      alert('Title is required.');
      return;
    }
    try {
      setLoading(true);
      let saved = await updateLandingPage(editing.id, form);
      if (publish !== undefined && publish !== !!saved.published_at) {
        saved = await setLandingPagePublished(saved.id, publish);
      }
      await load();
      if (publish) {
        // Save & publish finishes the page: back to the list.
        closeEditor();
        alert(`Published at ${SITE_URL}/${saved.slug}`);
        return;
      }
      setEditing(saved);
      setForm(toForm(saved));
      alert('Saved.');
    } catch (err) {
      alert(errMsg(err, 'Could not save landing page.'));
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async (p: LandingPageDTO) => {
    try {
      setLoading(true);
      await setLandingPagePublished(p.id, !p.published_at);
      await load();
    } catch (err) {
      alert(errMsg(err, 'Could not update status.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (p: LandingPageDTO) => {
    if (!window.confirm(`Delete the landing page /${p.slug}? The event itself is not affected.`)) return;
    try {
      setLoading(true);
      await deleteLandingPage(p.id);
      if (editing?.id === p.id) closeEditor();
      await load();
    } catch (err) {
      alert(errMsg(err, 'Could not delete landing page.'));
    } finally {
      setLoading(false);
    }
  };

  // ── Images ─────────────────────────────────────────────────────────────
  const checkImage = (file: File) => {
    if (!file.type.startsWith('image/')) return 'Please choose an image file.';
    if (file.size > 10 * 1024 * 1024) return 'Image must be under 10 MB.';
    return null;
  };

  const handleCoverPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const problem = checkImage(file);
    if (problem) return alert(problem);
    setCropTarget('cover');
    setCropQueue([file]);
  };

  // Poster and gallery photos are cropped one by one, like the website's
  // event form, then uploaded.
  const handleCropConfirm = async (blob: Blob, originalName: string) => {
    const ext = blob.type === 'image/png' ? 'png' : 'jpg';
    const file = new File([blob], `${originalName.replace(/\.[^.]+$/, '') || 'image'}-cropped.${ext}`, {
      type: blob.type,
    });
    try {
      setLoading(true);
      const url = await uploadLandingImage(file);
      if (url && cropTarget === 'cover') set('cover_image_url', url);
      else if (url) setForm((f) => (f ? { ...f, gallery_urls: [...f.gallery_urls, url] } : f));
    } catch (err) {
      alert(errMsg(err, 'Image upload failed.'));
    } finally {
      setLoading(false);
      setCropQueue((q) => q.slice(1));
    }
  };

  const handleGalleryPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    const bad = files.map(checkImage).find(Boolean);
    if (bad) return alert(bad);
    if (files.length === 0) return;
    setCropTarget('gallery');
    setCropQueue(files);
  };

  const requestInlineImage = (): Promise<string | null> =>
    new Promise((resolve) => {
      inlineResolverRef.current = resolve;
      inlineInputRef.current?.click();
    });

  const handleInlinePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const resolve = inlineResolverRef.current;
    inlineResolverRef.current = null;
    if (!file) return resolve?.(null);
    const problem = checkImage(file);
    if (problem) {
      alert(problem);
      return resolve?.(null);
    }
    try {
      setLoading(true);
      resolve?.((await uploadLandingImage(file)) || null);
    } catch (err) {
      alert(errMsg(err, 'Image upload failed.'));
      resolve?.(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Views ──────────────────────────────────────────────────────────────
  // Text on the canvas reads like the live page; double-click turns it into an
  // input, and Enter / Esc / clicking away turns it back.
  const editableText = (
    field: 'title' | 'hook' | 'cta',
    key: 'title' | 'hook_line' | 'cta_text',
    placeholder: string,
    className: string,
    dark = false,
  ) =>
    form && activeField === field ? (
      <input
        autoFocus
        aria-label={placeholder}
        className={`lp-inline ${dark ? 'lp-inline-dark' : ''} w-full ${className}`}
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        onBlur={() => setActiveField(null)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') setActiveField(null);
        }}
      />
    ) : (
      <div
        title="Double-click to edit"
        onDoubleClick={() => setActiveField(field)}
        className={`lp-editable ${dark ? 'lp-editable-dark' : ''} ${className} ${form?.[key] ? '' : 'opacity-40'}`}
      >
        {form?.[key] || placeholder}
      </div>
    );

  // Book pill as the event page shows it (bg-[#fff]: the admin dark theme
  // repaints plain bg-white). The word is editable; the price is live.
  const pill =
    'font-outfit mx-auto flex h-14 w-full max-w-[720px] items-center justify-center gap-1.5 rounded-full text-[17px] font-semibold shadow-[0_20px_60px_-10px_rgb(0_0_0/0.8)] md:h-[58px] md:text-lg';
  const ctaBlock =
    form &&
    (lp?.status ? (
      <p className={`${pill} border border-white/10 bg-[#1B1D33]/95 text-white/60 backdrop-blur-xl`}>{lp.status}</p>
    ) : (
      <div className={`${pill} bg-[#fff] px-6 text-[#080914]`}>
        {editableText('cta', 'cta_text', 'Book slots', 'w-auto min-w-[8rem] text-right', true)}
        <span>{lp?.event.is_free ? '· Free' : `from ${lp?.price ?? '₹…'}`}</span>
      </div>
    ));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-700">
            Growth
          </p>
          <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            Event Marketing
          </h3>
          <p className="mt-2 text-xs text-mist">
            Campaign pages at {SITE_URL}/your-slug. Each page links to one experience for live price and booking, but
            its content is separate — editing it never changes the host's experience.
          </p>
        </div>
        {editing ? (
          <Button variant="secondary" onClick={leaveEditor} disabled={loading}>
            Back to all pages
          </Button>
        ) : (
          <Button variant={picking ? 'secondary' : 'primary'} onClick={() => setPicking((v) => !v)} disabled={loading}>
            {picking ? 'Cancel' : 'Create new'}
          </Button>
        )}
      </div>

      {!editing && (
        <>
          {picking && (
            <Card className="p-5 bg-white/95">
              <Label hint="The new page starts with a copy of the event's content; you edit it from there.">
                Select an event
              </Label>
              <input
                className={inputCls}
                type="search"
                placeholder="Search experiences by title..."
                value={eventQuery}
                onChange={(e) => setEventQuery(e.target.value)}
              />
              {eventResults.length === 0 && <p className="mt-3 text-sm text-slate-400">No events found.</p>}
              {eventResults.length > 0 && (
                <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-brand-100">
                  {eventResults.map((evt) => (
                    <li key={evt.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink">{evt.title}</p>
                        <p className="text-xs text-slate-500">
                          {evt.hostName} · {evt.city || 'Online'} · {evt.status}
                        </p>
                      </div>
                      <Button variant="primary" onClick={() => handleCreate(evt)} disabled={loading}>
                        Select
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>}

          {loading && pages.length === 0 ? (
            <Card className="p-10 text-center text-slate-400">Loading landing pages...</Card>
          ) : pages.length === 0 ? (
            <Card className="p-10 text-center text-slate-400">
              No marketing pages yet. Click “Create new” and select an event.
            </Card>
          ) : (
            <Table headers={['URL', 'Title', 'Linked experience', 'Status', 'Updated', 'Actions']}>
              {pages.map((p) => {
                const isPub = !!p.published_at;
                return (
                  <tr key={p.id} className="border-b border-slate-100 last:border-b-0 hover:bg-brand-50/40 transition">
                    <td className="px-6 py-4 align-top text-xs font-bold text-brand-700">/{p.slug}</td>
                    <td className="px-6 py-4 align-top font-bold text-ink max-w-[220px]">{p.title}</td>
                    <td className="px-6 py-4 align-top text-slate-600 max-w-[220px]">{p.event_title}</td>
                    <td className="px-6 py-4 align-top">
                      <Badge color={isPub ? 'green' : 'amber'}>{isPub ? 'Published' : 'Draft'}</Badge>
                    </td>
                    <td className="px-6 py-4 align-top text-slate-500">
                      {new Date(p.updated_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="action" onClick={() => openEditor(p)} disabled={loading}>
                          Edit
                        </Button>
                        {isPub && (
                          <a href={`${SITE_URL}/${p.slug}`} target="_blank" rel="noreferrer">
                            <Button variant="action">View live</Button>
                          </a>
                        )}
                        <Button variant="action" onClick={() => handleTogglePublish(p)} disabled={loading}>
                          {isPub ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button
                          variant="action"
                          onClick={() => handleDelete(p)}
                          className="hover:text-rose-600 hover:border-rose-300"
                          disabled={loading}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}
        </>
      )}

      {editing && form && (
        <Card className="p-6 bg-white/95">
          <div className="mb-6 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <Button variant="secondary" onClick={leaveEditor} disabled={loading}>
              ← Back
            </Button>
            <Badge color={editing.published_at ? 'green' : 'amber'}>
              {editing.published_at ? 'Published' : 'Draft'}
            </Badge>
            <span>
              Linked experience: <strong className="text-ink">{editing.event_title}</strong> (price, dates and booking
              come live from it)
            </span>
            <span className="ml-auto font-bold text-brand-700">Double-click any text on the page to edit it</span>
          </div>

          {
            <div className="mb-6 grid gap-5 xl:grid-cols-2">
              <div>
                <Label hint="lowercase-with-dashes">Page URL</Label>
                <div className="flex items-center rounded-2xl border border-brand-100 bg-white pl-4 text-sm">
                  <span className="text-slate-400">{SITE_URL.replace('https://', '')}/</span>
                  <input
                    className="w-full bg-transparent px-1 py-3 text-slate-700 outline-none"
                    value={form.slug}
                    onChange={(e) => set('slug', e.target.value.toLowerCase())}
                  />
                </div>
              </div>
              <div>
                <Label hint="Google results and link previews, ~155 characters">SEO description</Label>
                <input
                  className={inputCls}
                  maxLength={300}
                  value={form.seo_description}
                  onChange={(e) => set('seo_description', e.target.value)}
                />
              </div>
            </div>
          }

          {/* The page itself — mirrors the event page the website renders for it
              (MySlotmate-Frontend/src/app/experience/[slug]/ExperienceDetailClient.tsx):
              same layout, classes and live data, so keep the two in step.
              Title, hook, About, photos and the Book word are this page's own
              (double-click to edit); everything else comes live from the event.
              Colours use bg-[#fff] where the page has bg-white, because the admin
              dark theme repaints plain bg-white. */}
          <div className="lp-canvas relative isolate overflow-clip rounded-3xl bg-[#080914] text-white">
            {/* Ambient glow taken from the poster, as on the live page. */}
            {form.cover_image_url && (
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] overflow-hidden">
                <img
                  src={form.cover_image_url}
                  alt=""
                  className="h-full w-full scale-125 object-cover opacity-40 blur-[100px] saturate-150"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#080914]/20 via-[#080914]/70 to-[#080914]" />
              </div>
            )}

            <div className="mx-auto w-full max-w-[1080px] px-5 pt-4 pb-10 md:px-8 md:pt-8">
              {/* Back circle + breadcrumb, as on the live page; the circle returns to the list. */}
              <div className="mb-4 flex min-w-0 items-center gap-2.5 text-[13px] md:mb-5">
                <button
                  type="button"
                  onClick={leaveEditor}
                  disabled={loading}
                  aria-label="Back to all pages"
                  title="Back to all pages"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="flex min-w-0 items-center gap-1.5 text-white/45">
                  Home
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/25" />
                  <span className="truncate font-medium text-white/85">{form.title || 'Untitled'}</span>
                </p>
              </div>

              <div className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-14">
                {/* Left: poster + host */}
                <div className="flex flex-col gap-7">
                  <div className="group relative aspect-[4/5] w-full overflow-hidden rounded-[24px] bg-[#131328] shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)] ring-1 ring-white/10">
                    {form.cover_image_url ? (
                      <>
                        <img
                          src={form.cover_image_url}
                          alt=""
                          className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
                        />
                        <img src={form.cover_image_url} alt="" className="relative block h-full w-full object-contain" />
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-white/40">No photos available</div>
                    )}
                    <span className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-md">
                      <Heart className="h-4 w-4" />
                    </span>
                    <span className="absolute right-4 bottom-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-md">
                      <Share className="h-4 w-4" />
                    </span>
                    {(form.cover_image_url ? 1 : 0) + form.gallery_urls.length > 1 && (
                      <>
                        <span className="absolute top-1/2 left-4 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 opacity-0 backdrop-blur-md transition group-hover:opacity-100">
                          <ArrowLeft className="h-4 w-4" />
                        </span>
                        <span className="absolute top-1/2 right-4 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 opacity-0 backdrop-blur-md transition group-hover:opacity-100">
                          <ArrowLeft className="h-4 w-4 rotate-180" />
                        </span>
                        <span className="absolute bottom-4 left-4 flex h-9 items-center gap-2 rounded-full bg-black/40 px-3.5 text-xs font-semibold backdrop-blur-md">
                          1 / {(form.cover_image_url ? 1 : 0) + form.gallery_urls.length}
                        </span>
                      </>
                    )}
                    {/* Editor-only photo controls, on hover. */}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/30 opacity-0 transition group-hover:opacity-100">
                      <label className="cursor-pointer rounded-full bg-black/70 px-3 py-1.5 text-xs font-bold backdrop-blur hover:bg-black/90">
                        {form.cover_image_url ? 'Change poster' : '+ Add poster'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleCoverPicked}
                          disabled={loading}
                        />
                      </label>
                      {form.cover_image_url && (
                        <button
                          type="button"
                          onClick={() => set('cover_image_url', '')}
                          className="rounded-full bg-black/70 px-3 py-1.5 text-xs font-bold backdrop-blur hover:bg-rose-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Editor-only: on the live page these are in the poster slider. */}
                  <div className="rounded-2xl border border-dashed border-white/15 p-3">
                    <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-white/45 uppercase">
                      More photos{' '}
                      <span className="normal-case tracking-normal text-white/30">· editor only, shown in the poster slider</span>
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {form.gallery_urls.map((u) => (
                        <div key={u} className="group relative">
                          <img src={u} alt="" className="aspect-square w-full rounded-xl object-cover" />
                          <button
                            type="button"
                            aria-label="Remove photo"
                            onClick={() =>
                              set(
                                'gallery_urls',
                                form.gallery_urls.filter((x) => x !== u),
                              )
                            }
                            className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-black/70 text-xs font-bold opacity-0 transition group-hover:opacity-100 hover:bg-rose-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <label className="flex aspect-square cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/25 text-lg text-white/60 hover:border-white/50">
                        +
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleGalleryPicked}
                          disabled={loading}
                        />
                      </label>
                    </div>
                  </div>

                  {lp?.host && <div className="hidden lg:block">{hostedBy}</div>}
                </div>

                {/* Right: what, when, where, about */}
                <div className="flex min-w-0 flex-col gap-9">
                  <header>
                    <div className="flex flex-wrap items-center gap-2">
                      {lp?.event.mood && (
                        <span className={chip}>
                          <i className="h-1.5 w-1.5 rounded-full bg-[#D8B4FE]" />
                          {moodLabel(lp.event.mood)}
                        </span>
                      )}
                      {lp && (
                        <span className={chip}>
                          {lp.event.is_private ? (
                            <>
                              <Lock className="h-3.5 w-3.5" /> Private event
                            </>
                          ) : (
                            <>
                              <Users className="h-3.5 w-3.5" /> Public event
                            </>
                          )}
                        </span>
                      )}
                      {lp &&
                        (lp.rating && lp.totalReviews > 0 ? (
                          <span className={chip}>
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {lp.rating.toFixed(1)}
                            <span className="text-white/50">({lp.totalReviews})</span>
                          </span>
                        ) : (
                          <span className={`${chip} text-[#D8B4FE]`}>New</span>
                        ))}
                    </div>
                    <div className="mt-5">
                      {editableText(
                        'title',
                        'title',
                        'Page title',
                        'font-outfit text-[clamp(28px,3.4vw,42px)] leading-[1.1] font-medium tracking-[-0.02em] text-balance',
                      )}
                    </div>
                    {lp ? (
                      <ul className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] text-white/75">
                        {lp.shownDate && (
                          <li className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-white/50" />
                            {istWeekday(lp.shownDate)}, {istDayMonth(lp.shownDate)}
                            {lp.manyDates && lp.dateChips.length <= 1 && (
                              <span className="text-white/45">+ more dates</span>
                            )}
                          </li>
                        )}
                        {lp.shownDate && (
                          <li className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-white/50" />
                            {istTime(lp.shownDate)}
                            {lp.endDate && ` – ${istTime(lp.endDate)}`}
                          </li>
                        )}
                        <li className="flex min-w-0 items-center gap-2">
                          {lp.event.is_online ? (
                            <Video className="h-4 w-4 shrink-0 text-white/50" />
                          ) : (
                            <MapPin className="h-4 w-4 shrink-0 text-white/50" />
                          )}
                          <span className="truncate">{lp.place}</span>
                        </li>
                      </ul>
                    ) : (
                      <p className="mt-5 text-[15px] text-white/45">
                        {live?.slug === eventSlug ? 'Could not load the linked event.' : 'Loading the linked event…'}
                      </p>
                    )}
                    {lp && lp.dateChips.length > 1 && (
                      <div className="mt-6 flex flex-wrap gap-2.5">
                        {lp.dateChips.map((d) => {
                          const on = d === lp.shownDate;
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setPickedDate(d)}
                              aria-pressed={on}
                              className={`flex min-w-[84px] shrink-0 flex-col items-center rounded-2xl px-4 py-2.5 text-[15px] leading-snug font-medium transition ${
                                on ? 'bg-[#fff] text-[#080914]' : 'bg-white/[0.07] text-white hover:bg-white/[0.12]'
                              }`}
                            >
                              <span className={on ? 'text-[#080914]/60' : 'text-white/60'}>{istWeekday(d)}</span>
                              {istDayMonth(d)}
                            </button>
                          );
                        })}
                        {lp.openDays.length > 4 && (
                          <button
                            type="button"
                            onClick={() => setAllDates((v) => !v)}
                            className="flex min-w-[84px] shrink-0 flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 px-4 py-2.5 text-[13px] leading-snug font-medium text-white/70 transition hover:border-white/40 hover:text-white"
                          >
                            {allDates ? (
                              'Show less'
                            ) : (
                              <>
                                +{lp.openDays.length - 4}
                                <span>more</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </header>

                  {lp?.host && <div className="border-t border-white/[0.08] pt-7 lg:hidden">{hostedBy}</div>}

                  {lp && (
                    <section>
                      <h2 className="font-outfit mb-4 text-lg font-medium text-white">Location</h2>
                      {lp.event.is_online ? (
                        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                            <Video className="h-5 w-5 text-[#D8B4FE]" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-semibold text-white">Online experience</p>
                            <p className="text-sm text-white/55">Join from anywhere on a video call.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                            <MapPin className="h-5 w-5 text-[#D8B4FE]" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] leading-snug font-semibold text-white">
                              {lp.event.location ?? 'Exact meeting point shared after booking'}
                            </span>
                            {lp.directions && (
                              <span className="mt-0.5 block text-xs text-[#D8B4FE]">Open in Google Maps</span>
                            )}
                          </span>
                          {lp.directions && (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                              <Navigation className="h-4 w-4" />
                            </span>
                          )}
                        </div>
                      )}
                    </section>
                  )}

                  <section>
                    <h2 className="font-outfit mb-4 text-lg font-medium text-white">About the event</h2>
                    <div className="mb-4">
                      {editableText(
                        'hook',
                        'hook_line',
                        'One line that sells it (optional)',
                        'font-outfit text-xl leading-snug font-normal',
                      )}
                    </div>
                    {activeField === 'content' ? (
                      <>
                        <RichTextEditor
                          value={form.content}
                          onChange={(html) => set('content', html)}
                          placeholder="Everything about the experience: what you'll do, itinerary, what's included, FAQs..."
                          className="lp-editor min-h-[280px]"
                          disabled={loading}
                          onRequestImage={requestInlineImage}
                        />
                        <button
                          type="button"
                          onClick={() => setActiveField(null)}
                          className="mt-3 rounded-full bg-[#fff] px-4 py-1.5 text-xs font-bold text-[#080914]"
                        >
                          Done
                        </button>
                      </>
                    ) : (
                      <div
                        title="Double-click to edit"
                        onDoubleClick={() => setActiveField('content')}
                        className="lp-editable min-h-[60px]"
                      >
                        {form.content ? (
                          <RichTextView html={form.content} />
                        ) : (
                          <p className="text-sm text-white/55">No description available.</p>
                        )}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </div>

            {/* The live page pins this pill to the bottom of the screen. */}
            <div className="sticky bottom-0 z-10 px-5 pb-5">{ctaBlock}</div>
            <p className="pb-6 text-center text-xs text-white/40">
              Dates, location, host and price come live from “{editing.event_title}” — edit them on the event itself.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-100 pt-6">
            <Button variant="secondary" onClick={() => handleSave()} disabled={loading}>
              Save
            </Button>
            {editing.published_at ? (
              <Button variant="secondary" onClick={() => handleSave(false)} disabled={loading}>
                Save &amp; unpublish
              </Button>
            ) : (
              <Button variant="primary" onClick={() => handleSave(true)} disabled={loading}>
                Save &amp; publish
              </Button>
            )}
          </div>
        </Card>
      )}

      <input ref={inlineInputRef} type="file" accept="image/*" className="hidden" onChange={handleInlinePicked} />
      <ImageCropModal
        file={cropQueue[0] ?? null}
        aspect={4 / 5}
        onClose={() => setCropQueue([])}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
};
