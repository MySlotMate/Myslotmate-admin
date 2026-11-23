import React, { useEffect, useRef, useState } from 'react';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { RichTextEditor, RichTextView } from '../../components/RichTextEditor';
import { ImageCropModal } from '../../components/ImageCropModal';
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

export const LandingPagesDirectory: React.FC = () => {
  const [pages, setPages] = useState<LandingPageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Editor state
  const [editing, setEditing] = useState<LandingPageDTO | null>(null);
  const [form, setForm] = useState<LandingPageUpdatePayload | null>(null);
  // Which text on the page canvas is being edited (double-click to start).
  const [activeField, setActiveField] = useState<'title' | 'hook' | 'content' | 'cta' | null>(null);
  const [pendingCoverCrop, setPendingCoverCrop] = useState<File | null>(null);
  const inlineInputRef = useRef<HTMLInputElement | null>(null);
  const inlineResolverRef = useRef<((url: string | null) => void) | null>(null);

  // New-page event picker
  const [picking, setPicking] = useState(false);
  const [eventQuery, setEventQuery] = useState('');
  const [eventResults, setEventResults] = useState<MarketingEventOption[]>([]);

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
      setEditing(saved);
      setForm(toForm(saved));
      await load();
      alert(publish ? `Published at ${SITE_URL}/${saved.slug}` : 'Saved.');
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
    setPendingCoverCrop(file);
  };

  const handleCoverCropConfirm = async (blob: Blob, originalName: string) => {
    const ext = blob.type === 'image/png' ? 'png' : 'jpg';
    const file = new File([blob], `${originalName.replace(/\.[^.]+$/, '') || 'cover'}-cropped.${ext}`, {
      type: blob.type,
    });
    try {
      setLoading(true);
      const url = await uploadLandingImage(file);
      if (url) set('cover_image_url', url);
    } catch (err) {
      alert(errMsg(err, 'Cover upload failed.'));
    } finally {
      setLoading(false);
      setPendingCoverCrop(null);
    }
  };

  const handleGalleryPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    const bad = files.map(checkImage).find(Boolean);
    if (bad) return alert(bad);
    try {
      setLoading(true);
      const urls = (await Promise.all(files.map(uploadLandingImage))).filter(Boolean);
      setForm((f) => (f ? { ...f, gallery_urls: [...f.gallery_urls, ...urls] } : f));
    } catch (err) {
      alert(errMsg(err, 'Gallery upload failed.'));
    } finally {
      setLoading(false);
    }
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
  // Book pill as the event page shows it; the button word is editable in place.
  // The price after it comes live from the linked event on the website.
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

  // Book pill as the event page shows it. The price after the word comes live
  // from the linked event on the website.
  const ctaBlock = form && (
    <div className="flex w-full max-w-xl items-center justify-center gap-1 rounded-full bg-white px-6 py-4 text-lg font-semibold text-[#080914] shadow-lg">
      {editableText('cta', 'cta_text', 'Book tickets', 'w-auto min-w-[8rem] text-right', true)}
      <span className="text-[#080914]/50">· from ₹price</span>
    </div>
  );

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
              (MySlotmate-Frontend/src/app/experience/[slug]/ExperienceDetailClient.tsx).
              Greyed parts (chips, dates, location, host, price) come live from the event.
              It reads like the live page; double-click text to edit, hover images for photo controls. */}
          <div className="lp-canvas overflow-hidden rounded-3xl bg-[#080914] px-5 py-8 text-white md:px-8">
            {/* Back circle + breadcrumb, as on the live page; the circle returns to the list. */}
            <div className="mb-6 flex items-center gap-4 text-sm text-white/45">
              <button
                type="button"
                onClick={leaveEditor}
                disabled={loading}
                aria-label="Back to all pages"
                title="Back to all pages"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-white transition hover:bg-white/10"
              >
                ‹
              </button>
              <p>
                Home › Explore › <span className="text-white">{form.title || 'Untitled'}</span>
              </p>
            </div>
            <div className="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-12">
              {/* Left: poster + more photos + host */}
              <div className="flex flex-col gap-6">
                <div className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04]">
                  {form.cover_image_url ? (
                    <>
                      <img
                        src={form.cover_image_url}
                        alt=""
                        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl"
                      />
                      <img src={form.cover_image_url} alt="" className="relative aspect-[4/5] w-full object-contain" />
                    </>
                  ) : (
                    <div className="flex aspect-[4/5] items-center justify-center text-sm text-white/40">No poster</div>
                  )}
                  {
                    <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 opacity-0 transition group-hover:opacity-100">
                      <label className="cursor-pointer rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold backdrop-blur hover:bg-black/80">
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
                          className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold backdrop-blur hover:bg-rose-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  }
                </div>

                {
                  <div>
                    <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-white/45 uppercase">More photos</p>
                    <div className="grid grid-cols-4 gap-2">
                      {form.gallery_urls.map((u) => (
                        <div key={u} className="group relative">
                          <img src={u} alt="" className="aspect-square w-full rounded-xl object-cover" />
                          {
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
                          }
                        </div>
                      ))}
                      {
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
                      }
                    </div>
                  </div>
                }

                <div className="lp-live">
                  <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-white/45 uppercase">Hosted by</p>
                  <p className="text-sm text-white/60">Host of “{editing.event_title}”</p>
                </div>
              </div>

              {/* Right: chips, title, when/where, about */}
              <div className="flex min-w-0 flex-col gap-8">
                <header>
                  <div className="lp-live flex flex-wrap gap-2">
                    {['Category', 'Public event', 'Rating'].map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white/60"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5">
                    {editableText(
                      'title',
                      'title',
                      'Page title',
                      'text-[34px] leading-[1.1] font-medium tracking-[-0.02em]',
                    )}
                  </div>
                  <p className="lp-live mt-5 text-[15px] text-white/60">📅 Next date · 🕒 Time · 📍 Location</p>
                  <div className="lp-live mt-5 flex gap-2.5">
                    {['Date', 'Date', 'Date'].map((d, i) => (
                      <span key={i} className="rounded-2xl bg-white/[0.07] px-5 py-3 text-sm text-white/60">
                        {d}
                      </span>
                    ))}
                  </div>
                </header>

                <section className="lp-live">
                  <h2 className="mb-3 text-xl font-medium">Location</h2>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/60">
                    📍 Event location &amp; Google Maps link
                  </div>
                </section>

                <section>
                  <h2 className="mb-4 text-xl font-medium">About the event</h2>
                  <div className="mb-4">
                    {editableText('hook', 'hook_line', 'One line that sells it (optional)', 'text-xl leading-snug')}
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
                        className="mt-3 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#080914]"
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
                        <RichTextView html={form.content} className="text-[15px] leading-7" />
                      ) : (
                        <p className="text-[15px] text-white/40">Double-click to write about the experience…</p>
                      )}
                    </div>
                  )}
                </section>
              </div>
            </div>

            <div className="mt-10 flex justify-center">{ctaBlock}</div>
            <p className="mt-6 text-center text-xs text-white/40">
              Dimmed parts come live from “{editing.event_title}” on the website — they can’t be edited here.
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
        file={pendingCoverCrop}
        aspect={16 / 9}
        onClose={() => setPendingCoverCrop(null)}
        onConfirm={handleCoverCropConfirm}
      />
    </div>
  );
};
