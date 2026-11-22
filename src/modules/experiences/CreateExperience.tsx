// Admin "create / edit an experience on behalf of a host" page.
//
// Laid out exactly like the host dashboard's edit page
// (MySlotmate-Frontend/src/app/host-dashboard/experiences/[id]/page.tsx): a
// 4:5 poster on the left, the event typed into directly on the right, optional
// settings folded under "More options", and one floating save pill. Admin-only
// additions sit in the same visual language: the host picker under "Hosted by",
// the URL slug, languages & level, terms on the ticket, and coupons.

import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCheck,
  FiCrop,
  FiExternalLink,
  FiMapPin,
  FiSearch,
  FiShare2,
  FiTrash2,
  FiUpload,
  FiVideo,
  FiX,
} from 'react-icons/fi';
import { LuGlobe, LuLock } from 'react-icons/lu';
import { RichTextEditor } from '../../components/RichTextEditor';
import SessionWindowsEditor from '../../components/SessionWindowsEditor';
import {
  generateSessionSlots,
  generateWeeklySessions,
  nextWeeklySession,
  slotsToCustomDates,
  type SessionWindow,
} from '../../lib/sessionSlots';
import { ImageCropModal } from '../../components/ImageCropModal';
import { LocationSearchInput } from '../../components/LocationSearchInput';
import { toast } from '../../lib/toast';
import { useDragDrop } from '../../hooks/useDragDrop';
import { istInputToUTCISO, utcToISTInputs } from '../../lib/datetime';
import {
  createEvent,
  updateEvent,
  deleteEvent,
  fetchEventDetail,
  publishEvent,
  uploadFiles,
  listExperienceTemplates,
  checkEventSlugAvailability,
} from '../../api/events';
import type { ExperienceTemplate } from '../../api/events';
import { ATTENDEE_FIELDS } from '../../lib/attendeeFields';
import CouponsManager from './CouponsManager';
import { fetchHosts, fetchHostDetail } from '../../api/directory';
import type { Host } from '../../types';
import {
  AddPill,
  Chip,
  CoverPoster,
  FIELD,
  GRADIENT,
  INLINE_FIELD,
  INLINE_PICKER,
  MoodSelector,
  MoreOptions,
  ROW_INPUT,
  Row,
  Rows,
  Section,
  Segmented,
  ToggleRow,
} from '../../components/event-form/EventFormKit';
import { DatePill, TimePill } from '../../components/event-form/DateTimePills';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface FormData {
  title: string;
  slug: string; // public URL slug; editable in edit mode
  hookLine: string;
  mood: string;
  description: string;
  coverImage: File | null;
  coverImagePreview: string | null;
  galleryImages: File[];
  galleryPreviews: string[];
  // Edit mode: already-hosted image URLs to preserve when no new file replaces them.
  existingCoverUrl: string | null;
  existingGalleryUrls: string[];
  isOnline: boolean;
  location: string;
  meetingLink: string;
  googleMapsUrl: string;
  durationMinutes: number;
  minGroupSize: number;
  maxGroupSize: number;
  languages: string[];
  level: string;
  isFree: boolean;
  priceCents: number;
  useTiers: boolean;
  priceTiers: { name: string; priceStr: string }[];
  // Monthly pass: one payment covers a month of sessions. Recurring, paid
  // experiences only — nothing repeats on a one-time event, nothing is saved
  // on a free one.
  monthlyPassEnabled: boolean;
  monthlyPassPriceStr: string;
  monthlyPassSessionsStr: string; // '' = every session
  monthlyPassCapacityStr: string; // '' = unlimited passes
  eventDate: string;
  eventTime: string;
  endTime: string;
  isRecurring: boolean;
  recurrenceRule: string;
  scheduleType: 'one_time' | 'recurring' | 'custom_dates';
  customDatesList: { date: string; time: string }[];
  // One-on-one: availability windows expanded into single-seat sessions.
  // Weekly windows repeat and are generated server-side; dated ones are
  // expanded here into custom_dates.
  sessionType: 'group' | 'one_on_one';
  sessionWindows: SessionWindow[];
  breakMinutes: number;
  sessionIsWeekly: boolean;
  cancellationPolicy: string;
  termsAndConditions: string;
  requiresAttendeeDetails: boolean;
  attendeeFields: string[];
  isPrivate: boolean;
  privateAccessMode: 'passkey' | 'rsvp';
  accessMode: 'shared' | 'unique';
  accessPasskey: string;
  passkeyGrantsFree: boolean;
}

const DURATION_OPTIONS = [30, 60, 90, 120, 180, 240];

// Preset languages an experience can be conducted in. A custom one can also be
// added via the "Other" input. Selection is multi-select.
const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Bengali', 'Assamese'];

const LEVEL_OPTIONS = ['Beginner Friendly', 'Intermediate', 'Advanced'];

const CANCELLATION_POLICIES = [
  { value: 'flexible', label: 'Flexible', description: 'Full refund up to 24 hours before' },
  { value: 'moderate', label: 'Moderate', description: 'Full refund up to 5 days before' },
  { value: 'strict', label: 'Strict', description: '50% refund up to 1 week before' },
  { value: 'no_refund', label: 'No Refund', description: 'Non-refundable once booked' },
];

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Public customer site — used for share/view links.
const SITE_URL = 'https://myslotmate.com';
// The website's image proxy (adds CORS headers) — used to load hosted images
// back into the cropper, since S3 won't serve them to the admin origin.
const SITE_PROXY = 'https://www.myslotmate.com/api/proxy-image';

// Same 4:5 frame as the poster on the website and the host dashboard.
const POSTER_ASPECT = 4 / 5;

const minsLabel = (mins: number) =>
  mins >= 60 ? `${mins / 60}h` : `${mins}m`;

/* ------------------------------------------------------------------ */
/*  Number field that can be cleared while typing                      */
/* ------------------------------------------------------------------ */
function NumberInput({
  value,
  onChange,
  min = 0,
  decimal = false,
  placeholder,
  className = ROW_INPUT,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  decimal?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  // While typing, show exactly what was typed (so the field can be cleared);
  // otherwise show the form's value, which also follows the form loading.
  const [draft, setDraft] = useState<string | null>(null);
  const parse = (s: string) => (decimal ? parseFloat(s) : parseInt(s, 10));
  return (
    <input
      type="number"
      inputMode={decimal ? 'decimal' : 'numeric'}
      min={min}
      value={draft ?? String(value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = parse(e.target.value);
        if (!Number.isNaN(n)) onChange(Math.max(min, n));
      }}
      onBlur={() => {
        const n = parse(draft ?? String(value));
        setDraft(null);
        onChange(Number.isNaN(n) ? min : Math.max(min, n));
      }}
      className={className}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Host picker — admin-specific: who the experience belongs to        */
/* ------------------------------------------------------------------ */
function HostPicker({
  selectedHost,
  locked,
  onSelect,
  hasError,
}: {
  selectedHost: (Host & { avatarUrl?: string }) | null;
  /** Edit mode: the owner can't change. */
  locked: boolean;
  onSelect: (host: Host | null) => void;
  hasError?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Host[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const res = await fetchHosts({ page: 1, pageSize: 20, search: q || undefined });
          setResults(res.items);
        } catch (err) {
          console.error('Host search failed:', err);
        } finally {
          setLoading(false);
        }
      })();
    }, 350);
  }, []);

  useEffect(
    () => () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    },
    [],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (selectedHost) {
    return (
      <div className="flex items-center gap-3">
        {selectedHost.avatarUrl ? (
          <img
            src={selectedHost.avatarUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white ${GRADIENT}`}
          >
            {(selectedHost.name?.[0] ?? 'H').toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{selectedHost.name}</p>
          {selectedHost.city && (
            <p className="truncate text-xs text-white/40">{selectedHost.city}</p>
          )}
        </div>
        {!locked && (
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setQuery('');
              setResults([]);
            }}
            className="rounded-full px-3 py-1.5 text-[13px] font-medium text-white/50 transition hover:bg-white/[0.06] hover:text-white"
          >
            Change
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex items-center gap-2 rounded-2xl border bg-[#121426] px-4 transition focus-within:border-[#B57BFF] ${
          hasError ? 'border-red-500' : 'border-white/10'
        }`}
      >
        <FiSearch className="shrink-0 text-white/40" size={16} />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            search(e.target.value);
          }}
          onFocus={() => {
            setIsOpen(true);
            if (results.length === 0) search(query);
          }}
          placeholder="Pick the host — search by name, city or phone"
          aria-label="Search hosts"
          className="row-input w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-white/30"
        />
      </div>
      {isOpen && (
        <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#14152a] p-1 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)]">
          {loading && <p className="px-3 py-3 text-sm text-white/50">Searching hosts…</p>}
          {!loading && results.length === 0 && (
            <p className="px-3 py-3 text-sm text-white/50">No hosts found.</p>
          )}
          {!loading &&
            results.map((host) => (
              <button
                key={host.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(host);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                  {host.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">{host.name}</span>
                  <span className="block truncate text-xs text-white/45">{host.city}</span>
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  More photos — 4:5, the same frame as the poster                    */
/* ------------------------------------------------------------------ */
function GalleryUpload({
  previews,
  onUpload,
  onRemove,
  onRecrop,
  recropping,
}: {
  previews: string[];
  onUpload: (files: File[]) => void;
  onRemove: (index: number) => void;
  /** Load a photo back into the 4:5 cropper. */
  onRecrop: (index: number) => void;
  /** Index of the photo being loaded for re-crop, if any. */
  recropping: number | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(0);
  const index = Math.min(current, Math.max(0, previews.length - 1));

  const processFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const ok = files.filter((f) => f.size <= MAX_FILE_SIZE_BYTES);
      const tooBig = files.filter((f) => f.size > MAX_FILE_SIZE_BYTES);
      if (tooBig.length > 0) {
        toast.error(
          `Too large: ${tooBig.map((f) => f.name).join(', ')}. Max size is ${MAX_FILE_SIZE_MB}MB per file.`,
        );
      }
      if (ok.length > 0) onUpload(ok);
    },
    [onUpload],
  );

  const { isDragging, handleDragEnter, handleDragLeave, handleDragOver, handleDrop } =
    useDragDrop({ onDrop: processFiles, accept: 'image/*' });

  return (
    <div className="space-y-4">
      {previews.length > 0 && (
        <>
          {/* Older photos in other shapes are shown whole over a blurred fill
              rather than cropped, so admins can see what needs re-cropping. */}
          <div className="group relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-[22px] bg-white/[0.06]">
            <img
              src={previews[index]}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-xl"
            />
            <img
              src={previews[index]}
              alt={`Photo ${index + 1}`}
              className="relative block h-full w-full object-contain"
            />
            {previews.length > 1 && (
              <span className="absolute top-3 left-3 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">
                {index + 1} / {previews.length}
              </span>
            )}
            <button
              type="button"
              onClick={() => onRecrop(index)}
              disabled={recropping !== null}
              className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-[#fff] px-3.5 py-2 text-[13px] font-semibold text-[#5a1fc4] shadow-lg transition hover:scale-[1.03] disabled:opacity-60"
            >
              <FiCrop size={14} />
              {recropping === index ? 'Loading…' : 'Re-crop to 4:5'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {previews.map((p, i) => (
              <div
                key={`${p}-${i}`}
                className={`relative overflow-hidden rounded-xl border-2 transition ${
                  index === i ? 'border-[#B724EA]' : 'border-transparent'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setCurrent(i)}
                  aria-label={`Show photo ${i + 1}`}
                  className="block"
                >
                  <img src={p} alt="" className="h-20 w-16 object-cover" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-red-500"
                >
                  <FiX size={11} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${
          isDragging
            ? 'border-[#A020F0] bg-[#A020F0]/10'
            : 'border-white/15 hover:border-[#A020F0] hover:bg-white/[0.04]'
        }`}
      >
        <FiUpload className={`mx-auto mb-2 ${isDragging ? 'text-[#D8B4FE]' : 'text-white/40'}`} size={22} />
        <p className={`text-sm ${isDragging ? 'font-semibold text-[#D8B4FE]' : 'text-white/60'}`}>
          {isDragging ? 'Drop photos here' : 'Click to upload or drag photos'}
        </p>
        <p className="mt-1 text-xs text-white/35">
          PNG or JPG up to 5MB · cropped to 4:5
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          processFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
        className="hidden"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Title — typed straight onto the page, with template suggestions    */
/* ------------------------------------------------------------------ */
function TitleField({
  mood,
  value,
  onChange,
  onSelectTemplate,
  hasError,
}: {
  mood: string;
  value: string;
  onChange: (v: string) => void;
  onSelectTemplate: (title: string, hookLine: string) => void;
  hasError?: boolean;
}) {
  const [templates, setTemplates] = useState<ExperienceTemplate[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!mood) return;
    let cancelled = false;
    listExperienceTemplates(mood)
      .then((data) => {
        if (!cancelled) setTemplates(data ?? []);
      })
      .catch((err) => console.error('Template fetch failed:', err));
    return () => {
      cancelled = true;
    };
  }, [mood]);

  const q = value.trim().toLowerCase();
  const filtered = (mood ? templates : []).filter(
    (t) => q === '' || t.title.toLowerCase().includes(q),
  );

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          setShowDropdown(true);
        }}
        onBlur={() => {
          // Delay close so a suggestion's mousedown registers first.
          blurTimer.current = setTimeout(() => setShowDropdown(false), 120);
        }}
        placeholder="Event name"
        aria-label="Event name"
        maxLength={100}
        className={`font-outfit w-full rounded-2xl border bg-transparent px-2 py-2 text-[28px] leading-tight font-bold text-white transition outline-none placeholder:text-white/30 hover:bg-white/[0.03] focus:border-white/10 focus:bg-white/[0.05] md:text-[32px] ${
          hasError ? 'border-red-500/70' : 'border-transparent'
        }`}
        style={{ backgroundColor: 'transparent' }}
      />
      {showDropdown && filtered.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#14152a] p-1 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)]">
          <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-white/40 uppercase">
            Suggestions
          </p>
          {filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelectTemplate(t.title, t.hook_line);
                setShowDropdown(false);
              }}
              className="block w-full rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
            >
              <span className="block text-sm font-semibold text-white">{t.title}</span>
              <span className="mt-0.5 block text-xs text-white/50">{t.hook_line}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Done sheet                                                         */
/* ------------------------------------------------------------------ */
function SuccessModal({
  isOpen,
  slugOrId,
  isDraft,
  hostName,
  isEdit,
}: {
  isOpen: boolean;
  slugOrId: string;
  isDraft: boolean;
  hostName: string;
  isEdit: boolean;
}) {
  const navigate = useNavigate();
  if (!isOpen) return null;
  const url = `${SITE_URL}/experience/${slugOrId}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#121426] p-8 text-center shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]">
        <div
          className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${
            isDraft ? 'bg-white/10' : `${GRADIENT} shadow-[0_0_30px_rgba(183,36,234,0.45)]`
          }`}
        >
          <FiCheck className="text-white" size={30} />
        </div>
        <h2 className="font-outfit mb-2 text-2xl font-bold text-white">
          {isDraft ? 'Draft saved' : isEdit ? 'Changes saved' : 'Experience is live'}
        </h2>
        <p className="mb-6 text-sm leading-6 text-white/55">
          {isDraft
            ? `Saved under ${hostName}'s profile. The host can finish it from their drafts.`
            : `Published on behalf of ${hostName} and visible to guests.`}
        </p>
        <div className="flex flex-col gap-2.5">
          {!isDraft && (
            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(url);
                  toast.success('Link copied');
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.06] py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <FiShare2 size={16} /> Copy link
              </button>
              <button
                onClick={() => window.open(url, '_blank', 'noopener')}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.06] py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <FiExternalLink size={16} /> View live
              </button>
            </div>
          )}
          <button
            onClick={() => navigate('/experiences')}
            className={`w-full rounded-full py-3 text-sm font-semibold text-white transition hover:opacity-90 ${GRADIENT}`}
          >
            Back to experiences
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */
export const CreateExperience: React.FC = () => {
  const navigate = useNavigate();
  const { id: editEventId } = useParams<{ id: string }>();
  const isEdit = !!editEventId;
  const [loadingEvent, setLoadingEvent] = useState(isEdit);
  // Edit mode: the event's stored status (draft / live / paused …).
  const [eventStatus, setEventStatus] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitType, setSubmitType] = useState<'draft' | 'publish' | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedAsDraft, setSavedAsDraft] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string>('');
  // Live duplicate check for the editable slug (edit mode only).
  const [slugStatus, setSlugStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');

  const [showErrors, setShowErrors] = useState(false);

  // Admin-specific: the host the event is created on behalf of.
  const [selectedHost, setSelectedHost] = useState<
    (Host & { avatarUrl?: string }) | null
  >(null);

  // Image Crop states
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [cropTarget, setCropTarget] = useState<'profile' | 'cover'>('profile');

  const [form, setForm] = useState<FormData>({
    title: '',
    slug: '',
    hookLine: '',
    mood: '',
    description: '',
    coverImage: null,
    coverImagePreview: null,
    galleryImages: [],
    galleryPreviews: [],
    existingCoverUrl: null,
    existingGalleryUrls: [],
    isOnline: false,
    location: '',
    meetingLink: '',
    googleMapsUrl: '',
    durationMinutes: 60,
    minGroupSize: 1,
    maxGroupSize: 10,
    languages: ['English'],
    level: 'Beginner Friendly',
    isFree: false,
    priceCents: 50000,
    useTiers: false,
    priceTiers: [{ name: '', priceStr: '' }],
    monthlyPassEnabled: false,
    monthlyPassPriceStr: '',
    monthlyPassSessionsStr: '',
    monthlyPassCapacityStr: '',
    eventDate: '',
    eventTime: '',
    endTime: '',
    isRecurring: false,
    recurrenceRule: '',
    scheduleType: 'one_time',
    customDatesList: [{ date: '', time: '' }],
    sessionType: 'group',
    sessionWindows: [{ date: '', start: '', end: '' }],
    breakMinutes: 0,
    sessionIsWeekly: true,
    cancellationPolicy: 'flexible',
    termsAndConditions: '',
    requiresAttendeeDetails: false,
    attendeeFields: [],
    isPrivate: false,
    privateAccessMode: 'passkey',
    accessMode: 'shared',
    accessPasskey: '',
    passkeyGrantsFree: false,
  });

  const addCustomSlot = () => {
    setForm((prev) => ({
      ...prev,
      customDatesList: [...prev.customDatesList, { date: '', time: '' }],
    }));
  };

  const removeCustomSlot = (index: number) => {
    setForm((prev) => ({
      ...prev,
      customDatesList: prev.customDatesList.filter((_, i) => i !== index),
    }));
  };

  const updateCustomSlot = (index: number, field: 'date' | 'time', val: string) => {
    setForm((prev) => {
      const list = [...prev.customDatesList];
      const current = list[index] ?? { date: '', time: '' };
      list[index] = { ...current, [field]: val };
      return { ...prev, customDatesList: list };
    });
  };

  // Plain-text length of the rich-text description, for the char counter.
  const [descriptionTextLength, setDescriptionTextLength] = useState(0);

  const updateForm = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Edit mode: load the event once and prefill the whole form.
  useEffect(() => {
    if (!editEventId) return;
    let cancelled = false;
    void (async () => {
      try {
        const ev = await fetchEventDetail(editEventId);
        if (cancelled) return;
        // The passkey is stripped unless the owning host_id is supplied, so for a
        // private event refetch with the owner id to prefill it for re-sharing.
        let accessPasskey = ev.access_passkey ?? '';
        if (ev.is_private && !ev.access_passkey && ev.host_id) {
          try {
            const withKey = await fetchEventDetail(editEventId, ev.host_id);
            if (cancelled) return;
            accessPasskey = withKey.access_passkey ?? '';
          } catch {
            // Non-fatal: leave blank; host can set a new passkey.
          }
        }
        const dt = utcToISTInputs(ev.time);
        const endDt = ev.end_time ? utcToISTInputs(ev.end_time) : null;
        const hasTiers = (ev.price_tiers?.length ?? 0) > 0;

        const parsedCustomSlots =
          ev.schedule_type === 'custom_dates' || (ev.custom_dates && ev.custom_dates.length > 0)
            ? (ev.custom_dates ?? []).map((d) => utcToISTInputs(d))
            : [{ date: dt.date, time: dt.time }];

        const computedScheduleType: 'one_time' | 'recurring' | 'custom_dates' =
          ev.schedule_type === 'custom_dates' || (ev.custom_dates && ev.custom_dates.length > 0)
            ? 'custom_dates'
            : ev.is_recurring
            ? 'recurring'
            : 'one_time';

        setForm((prev) => ({
          ...prev,
          title: ev.title ?? '',
          slug: ev.slug ?? '',
          hookLine: ev.hook_line ?? '',
          mood: ev.mood ?? '',
          description: ev.description ?? '',
          coverImagePreview: ev.cover_image_url ?? null,
          existingCoverUrl: ev.cover_image_url ?? null,
          galleryPreviews: ev.gallery_urls ?? [],
          existingGalleryUrls: ev.gallery_urls ?? [],
          isOnline: ev.is_online,
          location: ev.location ?? '',
          meetingLink: ev.meeting_link ?? '',
          googleMapsUrl: ev.google_maps_url ?? '',
          durationMinutes: ev.duration_minutes ?? 60,
          minGroupSize: ev.min_group_size ?? 1,
          maxGroupSize: ev.max_group_size ?? ev.capacity ?? 10,
          languages: ev.languages ?? [],
          level: ev.level ?? '',
          isFree: ev.is_free,
          priceCents: ev.price_cents ?? 0,
          useTiers: hasTiers,
          priceTiers: hasTiers
            ? ev.price_tiers!.map((t) => ({
                name: t.name,
                priceStr: (t.price_cents / 100).toString(),
              }))
            : [{ name: '', priceStr: '' }],
          monthlyPassEnabled: !!ev.monthly_pass_price_cents,
          monthlyPassPriceStr: ev.monthly_pass_price_cents
            ? (ev.monthly_pass_price_cents / 100).toString()
            : '',
          monthlyPassSessionsStr: ev.monthly_pass_session_limit?.toString() ?? '',
          monthlyPassCapacityStr: ev.monthly_pass_capacity?.toString() ?? '',
          eventDate: dt.date,
          eventTime: dt.time,
          endTime: endDt?.time ?? '',
          isRecurring: ev.is_recurring,
          recurrenceRule: ev.recurrence_rule ?? '',
          scheduleType: computedScheduleType,
          customDatesList: parsedCustomSlots.length > 0 ? parsedCustomSlots : [{ date: dt.date, time: dt.time }],
          sessionType: ev.session_type === 'one_on_one' ? 'one_on_one' : 'group',
          // The stored windows decide the mode — weekly ones carry a weekday.
          sessionWindows:
            ev.session_windows && ev.session_windows.length > 0
              ? ev.session_windows.map((w) => ({
                  date: w.date,
                  start: w.start,
                  end: w.end,
                  weekday: w.weekday ?? undefined,
                }))
              : [{ date: '', start: '', end: '' }],
          breakMinutes: ev.break_minutes ?? 0,
          sessionIsWeekly: (ev.session_windows ?? []).some(
            (w) => w.weekday !== undefined && w.weekday !== null,
          ),
          cancellationPolicy: ev.cancellation_policy ?? 'flexible',
          termsAndConditions: ev.terms_and_conditions ?? '',
          requiresAttendeeDetails: ev.requires_attendee_details,
          attendeeFields: ev.attendee_fields ?? [],
          isPrivate: ev.is_private,
          privateAccessMode: ev.private_access_mode === 'rsvp' ? 'rsvp' : 'passkey',
          accessMode: accessPasskey ? 'shared' : ev.is_private ? 'unique' : 'shared',
          accessPasskey,
          passkeyGrantsFree: ev.passkey_grants_free,
        }));
        setEventStatus(ev.status ?? '');
        // The editor only reports its length on change, so seed the counter.
        setDescriptionTextLength(
          new DOMParser().parseFromString(ev.description ?? '', 'text/html').body
            .textContent?.length ?? 0,
        );
        // Lock the host to the event's owner (host can't change on edit), then
        // fill in their real name and photo for the "Hosted by" card.
        setSelectedHost({ id: ev.host_id, name: 'Host', city: '' } as Host);
        if (ev.host_id) {
          fetchHostDetail(ev.host_id)
            .then((d) => {
              if (cancelled) return;
              const name =
                `${d.host.first_name ?? ''} ${d.host.last_name ?? ''}`.trim() ||
                d.user?.name ||
                'Host';
              setSelectedHost({
                id: ev.host_id,
                name,
                city: d.host.city ?? d.user?.city ?? '',
                avatarUrl: d.host.avatar_url,
              } as Host & { avatarUrl?: string });
            })
            .catch(() => {
              // Non-fatal: the card keeps the placeholder name.
            });
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to load experience.',
        );
      } finally {
        if (!cancelled) setLoadingEvent(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editEventId]);

  // Debounced duplicate check for the editable slug. Only runs in edit mode;
  // the endpoint excludes the current event, so keeping the original slug
  // always reads as available.
  useEffect(() => {
    if (!isEdit || !editEventId) return;
    const raw = form.slug.trim();
    // All status updates run inside the debounce callback (never synchronously
    // in the effect body) so a keystroke doesn't cascade an extra render.
    const handle = setTimeout(() => {
      void (async () => {
        if (!raw) {
          setSlugStatus('invalid');
          return;
        }
        setSlugStatus('checking');
        try {
          const res = await checkEventSlugAvailability(raw, editEventId);
          setSlugStatus(res.available ? 'available' : 'taken');
        } catch {
          setSlugStatus('idle');
        }
      })();
    }, 400);
    return () => clearTimeout(handle);
  }, [form.slug, isEdit, editEventId]);

  // Ticket-tier row helpers (dynamic pricing).
  const addPriceTier = () =>
    updateForm('priceTiers', [...form.priceTiers, { name: '', priceStr: '' }]);
  const removePriceTier = (index: number) =>
    updateForm(
      'priceTiers',
      form.priceTiers.filter((_, i) => i !== index),
    );
  const updatePriceTier = (
    index: number,
    field: 'name' | 'priceStr',
    value: string,
  ) =>
    updateForm(
      'priceTiers',
      form.priceTiers.map((t, i) =>
        i === index ? { ...t, [field]: value } : t,
      ),
    );

  // Toggle a language in/out of the multi-select list.
  const toggleLanguage = (lang: string) => {
    setForm((prev) => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter((l) => l !== lang)
        : [...prev.languages, lang],
    }));
  };

  // Free-text language input for the "Other" option.
  const [customLanguage, setCustomLanguage] = useState('');
  const addCustomLanguage = () => {
    const value = customLanguage.trim();
    if (!value) return;
    if (!form.languages.some((l) => l.toLowerCase() === value.toLowerCase())) {
      updateForm('languages', [...form.languages, value]);
    }
    setCustomLanguage('');
  };

  /* ---------------------------------------------------------------- */
  /*  Image Handlers                                                   */
  /* ---------------------------------------------------------------- */
  const handleCoverUpload = (files: File[]) => {
    const file = files[0];
    if (file) {
      setCropTarget('profile');
      setCropQueue([file]);
    }
  };

  const handleGalleryUpload = (files: File[]) => {
    if (files.length > 0) {
      setRecropIndex(null);
      setCropTarget('cover');
      setCropQueue(files);
    }
  };

  const handleCropConfirm = (blob: Blob, originalName: string) => {
    const ext = blob.type === 'image/png' ? 'png' : 'jpg';
    const baseName = originalName.replace(/\.[^.]+$/, '') || 'image';
    const croppedFile = new File([blob], `${baseName}-cropped.${ext}`, {
      type: blob.type,
    });

    if (cropTarget === 'profile') {
      if (form.coverImagePreview?.startsWith('blob:'))
        URL.revokeObjectURL(form.coverImagePreview);
      updateForm('coverImage', croppedFile);
      updateForm('coverImagePreview', URL.createObjectURL(croppedFile));
    } else {
      const newPreview = URL.createObjectURL(croppedFile);
      const at = recropIndex;
      setForm((prev) => {
        const previews = [...prev.galleryPreviews];
        if (at !== null && at < previews.length) {
          // Re-crop: the new photo takes the old one's place.
          const old = previews[at];
          if (old?.startsWith('blob:')) URL.revokeObjectURL(old);
          previews[at] = newPreview;
        } else {
          previews.push(newPreview);
        }
        return withGallery(prev, previews, { [newPreview]: croppedFile });
      });
      setRecropIndex(null);
    }

    // Move to next image in queue
    setCropQueue((prev) => prev.slice(1));
  };

  // galleryPreviews is the gallery in display order: hosted https URLs mixed
  // with blob: previews of new files. galleryImages holds those files in the
  // same order as their blob previews, so save can upload them and put each
  // URL back where its preview sat.
  const withGallery = (
    prev: FormData,
    previews: string[],
    added: Record<string, File> = {},
  ): FormData => {
    const fileByBlob: Record<string, File> = { ...added };
    prev.galleryPreviews
      .filter((p) => p.startsWith('blob:'))
      .forEach((p, i) => {
        const f = prev.galleryImages[i];
        if (f && !fileByBlob[p]) fileByBlob[p] = f;
      });
    return {
      ...prev,
      galleryPreviews: previews,
      galleryImages: previews
        .filter((p) => p.startsWith('blob:'))
        .map((p) => fileByBlob[p])
        .filter((f): f is File => !!f),
      existingGalleryUrls: previews.filter((p) => !p.startsWith('blob:')),
    };
  };

  const removeGalleryImage = (index: number) => {
    const preview = form.galleryPreviews[index];
    // Only blob: previews (freshly added files) own an object URL to revoke;
    // existing https URLs must not be revoked.
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    setForm((prev) =>
      withGallery(
        prev,
        prev.galleryPreviews.filter((_, i) => i !== index),
      ),
    );
  };

  // Re-crop an image that's already on the event: load it back into the 4:5
  // cropper. S3 doesn't allow the admin origin to read images, so this goes
  // through the website's image proxy when a direct fetch is blocked.
  const [recropIndex, setRecropIndex] = useState<number | null>(null);
  const [loadingRecrop, setLoadingRecrop] = useState<string | null>(null);
  const loadForRecrop = async (url: string): Promise<File | null> => {
    const name = decodeURIComponent(url.split('?')[0]?.split('/').pop() || 'image.jpg');
    const proxied = `${SITE_PROXY}?url=${encodeURIComponent(url)}`;
    // Local previews load directly; S3 never allows this origin, so go
    // straight to the proxy; anything else tries directly first.
    const attempts = url.startsWith('blob:')
      ? [url]
      : url.includes('.amazonaws.com/')
        ? [proxied]
        : [url, proxied];
    for (const src of attempts) {
      try {
        const res = await fetch(src);
        if (!res.ok) continue;
        const blob = await res.blob();
        if (!blob.type.startsWith('image/')) continue;
        return new File([blob], name, { type: blob.type });
      } catch {
        // Blocked by CORS — try the proxy next.
      }
    }
    return null;
  };
  const recropPoster = async () => {
    const url = form.coverImagePreview;
    if (!url) return;
    setLoadingRecrop('poster');
    const file = await loadForRecrop(url);
    setLoadingRecrop(null);
    if (!file) {
      toast.error("Couldn't load this image to re-crop. Upload the original instead.");
      return;
    }
    setCropTarget('profile');
    setCropQueue([file]);
  };
  const recropGallery = async (index: number) => {
    const url = form.galleryPreviews[index];
    if (!url) return;
    setLoadingRecrop(`gallery-${index}`);
    const file = await loadForRecrop(url);
    setLoadingRecrop(null);
    if (!file) {
      toast.error("Couldn't load this photo to re-crop. Upload the original instead.");
      return;
    }
    setCropTarget('cover');
    setRecropIndex(index);
    setCropQueue([file]);
  };

  /* ---------------------------------------------------------------- */
  /*  Validation                                                       */
  /* ---------------------------------------------------------------- */
  const validateStep1 = (): boolean => {
    if (!selectedHost?.id) {
      setShowErrors(true);
      toast.error('Please select the host to create this experience for');
      return false;
    }
    if (!form.title.trim()) {
      setShowErrors(true);
      toast.error('Please enter an experience title');
      return false;
    }
    if (!form.hookLine.trim()) {
      setShowErrors(true);
      toast.error('Please enter a hook line');
      return false;
    }
    if (!form.mood) {
      setShowErrors(true);
      toast.error('Please select a mood');
      return false;
    }
    if (!form.description.trim()) {
      setShowErrors(true);
      toast.error('Please add a description');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (form.sessionType === 'one_on_one') {
      const { errors, count } = form.sessionIsWeekly
        ? (() => {
            const r = generateWeeklySessions(
              form.sessionWindows,
              form.durationMinutes,
              form.breakMinutes,
            );
            return { errors: r.errors, count: r.perWeek };
          })()
        : (() => {
            const r = generateSessionSlots(
              form.sessionWindows,
              form.durationMinutes,
              form.breakMinutes,
            );
            return { errors: r.errors, count: r.slots.length };
          })();
      if (errors.length > 0) {
        setShowErrors(true);
        toast.error(errors[0]);
        return false;
      }
      if (count === 0) {
        setShowErrors(true);
        toast.error("Your availability windows don't fit a single session");
        return false;
      }
    } else if (form.scheduleType === 'custom_dates') {
      const valid = form.customDatesList.filter((s) => s.date && s.time);
      if (valid.length === 0) {
        setShowErrors(true);
        toast.error('Please add at least one custom date and time slot');
        return false;
      }
    } else {
      if (!form.eventDate) {
        setShowErrors(true);
        toast.error('Please select an event date');
        return false;
      }
      if (!form.eventTime) {
        setShowErrors(true);
        toast.error('Please select a start time');
        return false;
      }
    }
    if (
      form.monthlyPassEnabled &&
      form.scheduleType !== 'one_time' &&
      !form.isFree &&
      Number(form.monthlyPassPriceStr) <= 0
    ) {
      setShowErrors(true);
      toast.error('Please set a monthly pass price, or switch the pass off');
      return false;
    }
    if (!form.isFree && !form.useTiers && form.priceCents <= 0) {
      setShowErrors(true);
      toast.error('Please set a valid price');
      return false;
    }
    if (
      !form.isFree &&
      form.useTiers &&
      form.priceTiers.filter((t) => t.name.trim() && Number(t.priceStr) > 0)
        .length === 0
    ) {
      setShowErrors(true);
      toast.error('Add at least one ticket type with a name and price');
      return false;
    }
    if (
      form.isPrivate &&
      form.privateAccessMode === 'passkey' &&
      form.accessMode === 'shared' &&
      !form.accessPasskey.trim()
    ) {
      setShowErrors(true);
      toast.error('A private experience needs a passkey');
      return false;
    }
    // An RSVP host approves people on the strength of what they submit, so the
    // request form can't be empty — without required fields every request would
    // arrive as a bare name and there'd be nothing to judge.
    if (
      form.isPrivate &&
      form.privateAccessMode === 'rsvp' &&
      (!form.requiresAttendeeDetails || form.attendeeFields.length === 0)
    ) {
      setShowErrors(true);
      toast.error(
        'Request-to-join needs attendee details — turn them on and pick at least one field',
      );
      return false;
    }
    return true;
  };

  /* ---------------------------------------------------------------- */
  /*  Form Submission                                                  */
  /* ---------------------------------------------------------------- */
  const handleSubmit = async (asDraft = false) => {
    // Drafts skip the strict validation so work-in-progress can be saved.
    // A draft still needs at least a title so the host can find it later.
    if (asDraft) {
      if (!form.title.trim()) {
        toast.error('Add a title before saving as draft');
        return;
      }
    } else if (!validateStep1() || !validateStep2()) {
      return;
    }
    const hostId = selectedHost?.id;
    if (!hostId) {
      toast.error('Please select the host to create this experience for');
      return;
    }
    // Guard the editable slug: never submit an empty or already-taken slug.
    if (isEdit) {
      if (!form.slug.trim()) {
        toast.error('The URL slug cannot be empty');
        return;
      }
      if (slugStatus === 'taken') {
        toast.error('That URL slug is already in use — pick another');
        return;
      }
    }
    setSubmitType(asDraft ? 'draft' : 'publish');
    setIsSubmitting(true);

    try {
      // Upload images
      // Start from existing (already-hosted) URLs so an edit that doesn't touch
      // images preserves them; newly picked files are uploaded and merged in.
      let coverImageUrl: string | undefined = form.existingCoverUrl ?? undefined;
      let galleryUrls: string[] = [...form.existingGalleryUrls];

      if (form.coverImage) {
        try {
          const uploadRes = await uploadFiles([form.coverImage], 'events/covers');
          if (uploadRes[0]?.url) coverImageUrl = uploadRes[0].url;
        } catch (uploadErr) {
          console.warn('Cover image upload failed:', uploadErr);
        }
      }

      if (form.galleryImages.length > 0) {
        try {
          const uploadRes = await uploadFiles(form.galleryImages, 'events/gallery');
          // Put each uploaded URL back where its preview sat, so a re-cropped
          // photo keeps its place in the gallery.
          let k = 0;
          galleryUrls = form.galleryPreviews
            .map((p) => (p.startsWith('blob:') ? uploadRes[k++]?.url : p))
            .filter((u): u is string => !!u);
        } catch (uploadErr) {
          console.warn('Gallery upload failed:', uploadErr);
        }
      }

      // Construct datetime — drafts may be missing date/time, so fall back to now.
      // Entered date/time are India-local (IST); anchor them to +05:30 so the
      // stored UTC instant doesn't drift with the admin's browser timezone.
      // Dated one-on-one: expand the windows into the sessions that become
      // custom_dates. Weekly one-on-one sends no dates — the server regenerates
      // them from the windows on read — but still needs a real upcoming session
      // as the event's anchor time.
      const isWeeklyOneOnOne =
        form.sessionType === 'one_on_one' && form.sessionIsWeekly;
      const oneOnOneSlots =
        form.sessionType === 'one_on_one' && !form.sessionIsWeekly
          ? generateSessionSlots(
              form.sessionWindows,
              form.durationMinutes,
              form.breakMinutes,
            ).slots
          : [];
      const weeklyAnchor = isWeeklyOneOnOne
        ? nextWeeklySession(
            form.sessionWindows,
            form.durationMinutes,
            form.breakMinutes,
          )
        : null;

      const firstSlot = form.sessionType === 'one_on_one'
        ? {
            date: (isWeeklyOneOnOne ? weeklyAnchor?.date : oneOnOneSlots[0]?.date) ?? '',
            time: (isWeeklyOneOnOne ? weeklyAnchor?.time : oneOnOneSlots[0]?.time) ?? '',
          }
        : form.scheduleType === 'custom_dates' && form.customDatesList[0]?.date && form.customDatesList[0]?.time
        ? form.customDatesList[0]
        : { date: form.eventDate, time: form.eventTime };

      const hasDateTime = !!(firstSlot.date && firstSlot.time);
      const eventDateTime = hasDateTime
        ? new Date(istInputToUTCISO(firstSlot.date, firstSlot.time))
        : new Date();
      let endDateTime: Date;
      if (form.sessionType === 'one_on_one') {
        // Spans ONE session: consumers derive a per-slot duration from
        // (end_time - time), so stretching it across the day would make every
        // slot look hours long.
        endDateTime = new Date(
          eventDateTime.getTime() + (form.durationMinutes || 60) * 60 * 1000
        );
      } else if (form.endTime && firstSlot.date) {
        endDateTime = new Date(istInputToUTCISO(firstSlot.date, form.endTime));
      } else {
        endDateTime = new Date(
          eventDateTime.getTime() + (form.durationMinutes || 60) * 60 * 1000
        );
      }

      // Fields shared by create + update (everything except status).
      const payload = {
        host_id: hostId,
        title: form.title.trim(),
        hook_line: form.hookLine.trim(),
        mood: form.mood,
        description: form.description.trim(),
        cover_image_url: coverImageUrl,
        gallery_urls: galleryUrls.length > 0 ? galleryUrls : undefined,
        time: eventDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        is_online: form.isOnline,
        location: form.isOnline ? undefined : form.location || undefined,
        meeting_link: form.isOnline ? form.meetingLink || undefined : undefined,
        google_maps_url: !form.isOnline ? form.googleMapsUrl || undefined : undefined,
        duration_minutes: form.durationMinutes,
        // A one-on-one slot seats exactly one guest — that single seat is what
        // stops a second booking landing on the same session.
        capacity: form.sessionType === 'one_on_one' ? 1 : form.maxGroupSize,
        min_group_size: form.sessionType === 'one_on_one' ? 1 : form.minGroupSize,
        max_group_size: form.sessionType === 'one_on_one' ? 1 : form.maxGroupSize,
        languages: form.languages,
        level: form.level || undefined,
        price_cents: form.isFree || form.useTiers ? 0 : form.priceCents,
        is_free: form.isFree,
        price_tiers:
          !form.isFree && form.useTiers
            ? form.priceTiers
                .filter((t) => t.name.trim() && Number(t.priceStr) > 0)
                .map((t) => ({
                  name: t.name.trim(),
                  price_cents: Math.round(Number(t.priceStr) * 100),
                }))
            : undefined,
        monthly_pass: {
          price_cents:
            form.monthlyPassEnabled && !form.isFree && form.scheduleType !== 'one_time'
              ? Math.round(Number(form.monthlyPassPriceStr) * 100)
              : 0,
          session_limit: form.monthlyPassSessionsStr
            ? Number(form.monthlyPassSessionsStr)
            : undefined,
          capacity: form.monthlyPassCapacityStr
            ? Number(form.monthlyPassCapacityStr)
            : undefined,
        },
        schedule_type: isWeeklyOneOnOne ? ('recurring' as const) : form.scheduleType,
        custom_dates: isWeeklyOneOnOne
          ? []
          : form.sessionType === 'one_on_one'
          ? slotsToCustomDates(oneOnOneSlots)
          : form.scheduleType === 'custom_dates'
          ? form.customDatesList
              .filter((s) => s.date && s.time)
              .map((s) => istInputToUTCISO(s.date, s.time))
          : undefined,
        session_type: form.sessionType,
        break_minutes: form.sessionType === 'one_on_one' ? form.breakMinutes : undefined,
        session_windows:
          form.sessionType === 'one_on_one' ? form.sessionWindows : undefined,
        is_recurring: isWeeklyOneOnOne || form.scheduleType === 'recurring',
        // The weekdays live in the windows, so the rule only says "weekly".
        recurrence_rule: isWeeklyOneOnOne
          ? 'FREQ=WEEKLY'
          : form.scheduleType === 'recurring'
          ? form.recurrenceRule
          : undefined,
        cancellation_policy: form.cancellationPolicy,
        terms_and_conditions: form.termsAndConditions.trim() || undefined,
        requires_attendee_details: form.requiresAttendeeDetails,
        attendee_fields: form.requiresAttendeeDetails ? form.attendeeFields : [],
        is_private: form.isPrivate,
        private_access_mode: form.privateAccessMode,
        // Shared mode sends the one passkey; unique mode clears it (access comes
        // from the per-guest access codes). A public event clears it server-side.
        access_passkey:
          form.isPrivate && form.accessMode === 'shared'
            ? form.accessPasskey.trim()
            : '',
      };

      if (isEdit && editEventId) {
        // Edit: update in place, then publish unless "Save draft" was clicked.
        // publishEvent is a no-op server-side for events that aren't drafts, so
        // this promotes a draft to live without disturbing an already-live,
        // paused, or cancelled event.
        await updateEvent(editEventId, {
          ...payload,
          slug: form.slug.trim() || undefined,
          // On edit, send explicit values so removals actually persist: the
          // backend keeps the existing image(s) when these fields are omitted, so
          // an empty gallery must be sent as [] and a removed cover as "".
          gallery_urls: galleryUrls,
          cover_image_url: coverImageUrl ?? '',
        });
        let publishFailed = false;
        if (!asDraft) {
          try {
            await publishEvent(editEventId, hostId);
            if (eventStatus === 'draft') setEventStatus('live');
          } catch (publishErr) {
            publishFailed = true;
            console.warn('Publish failed:', publishErr);
          }
        }
        setCreatedEventId(editEventId);
        setSavedAsDraft(asDraft || publishFailed);
        setShowSuccess(true);
        if (publishFailed) {
          toast.error('Saved, but publishing failed. The experience is still a draft — please try again.');
        } else {
          toast.success(asDraft ? 'Draft saved' : 'Experience updated');
        }
      } else {
        const created = await createEvent({
          ...payload,
          status: asDraft ? 'draft' : 'live',
        });
        // Auto-publish only when "Publish Experience" was clicked.
        if (!asDraft) {
          try {
            await publishEvent(created.id, hostId);
          } catch (publishErr) {
            console.warn('Auto-publish failed, event saved as draft:', publishErr);
          }
        }
        setCreatedEventId(created.id);
        setSavedAsDraft(asDraft);
        setShowSuccess(true);
        toast.success(
          asDraft
            ? `Draft saved under ${selectedHost?.name ?? 'the host'}'s experiences.`
            : 'Experience created successfully!',
        );
      }
    } catch (err) {
      console.error('Failed to save experience:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to save experience. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
      setSubmitType(null);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Delete (edit mode)                                               */
  /* ---------------------------------------------------------------- */
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => {
    if (!editEventId || !selectedHost?.id) return;
    setDeleting(true);
    try {
      await deleteEvent(editEventId, selectedHost.id);
      toast.success('Experience deleted');
      navigate('/experiences');
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to delete. Cancel active bookings first, then try again.',
      );
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // With an end time, a group session's length is just end minus start, so
  // setting either time also sets the duration.
  const setGroupTime = (key: 'eventTime' | 'endTime', value: string) =>
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (next.sessionType !== 'group' || !next.eventTime || !next.endTime) return next;
      const [sh = 0, sm = 0] = next.eventTime.split(':').map(Number);
      const [eh = 0, em = 0] = next.endTime.split(':').map(Number);
      let mins = eh * 60 + em - (sh * 60 + sm);
      if (mins <= 0) mins += 24 * 60; // ends after midnight
      return mins >= 15 ? { ...next, durationMinutes: mins } : next;
    });

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  if (loadingEvent) {
    return (
      <div className="msm-dark flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A020F0] border-t-transparent" />
      </div>
    );
  }

  const err = (cond: boolean) => showErrors && cond;
  const isOneOnOne = form.sessionType === 'one_on_one';
  const isDraftEvent = isEdit && eventStatus === 'draft';
  const publicUrl = `${SITE_URL}/experience/${form.slug || editEventId}`;
  const hostName = selectedHost?.name ?? 'the host';

  return (
    <div className="msm-dark relative min-h-screen overflow-x-clip pb-24">
      {/* Soft colour from the poster behind everything, like the event page */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        {form.coverImagePreview ? (
          <img
            src={form.coverImagePreview}
            alt=""
            className="h-full w-full scale-125 object-cover opacity-40 blur-[90px]"
          />
        ) : (
          <div className="absolute -top-40 left-1/3 h-[560px] w-[560px] rounded-full bg-[#7B2FFF]/20 blur-[140px]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#080914]/30 via-[#080914]/70 to-[#080914]" />
      </div>

      <div className="relative mx-auto max-w-[1120px] px-5 py-8 md:px-10">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <button
            onClick={() => navigate('/experiences')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/10"
            aria-label="Back to experiences"
          >
            <FiArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-outfit text-2xl font-bold text-white">
              {isEdit ? 'Edit experience' : 'New experience'}
            </h1>
            <p className="truncate text-sm text-white/50">
              {selectedHost
                ? `On behalf of ${hostName}${isEdit && !isDraftEvent ? ' · changes go live as soon as you save' : ''}`
                : 'Pick the host this experience belongs to'}
            </p>
          </div>
          {isEdit && eventStatus && (
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                eventStatus === 'live'
                  ? 'bg-emerald-400/15 text-emerald-300'
                  : eventStatus === 'paused'
                    ? 'bg-amber-400/15 text-amber-300'
                    : 'bg-white/10 text-white/70'
              }`}
            >
              {eventStatus}
            </span>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[420px_minmax(0,1fr)] lg:gap-12">
          {/* Left — poster and host */}
          <aside className="min-w-0 space-y-5 lg:sticky lg:top-6 lg:self-start">
            <CoverPoster
              preview={form.coverImagePreview}
              title={form.title}
              mood={form.mood}
              isPrivate={form.isPrivate}
              onUpload={handleCoverUpload}
              onRemove={() => {
                if (form.coverImagePreview?.startsWith('blob:'))
                  URL.revokeObjectURL(form.coverImagePreview);
                updateForm('coverImage', null);
                updateForm('coverImagePreview', null);
                // Clear the persisted URL too, otherwise save re-sends the old image.
                updateForm('existingCoverUrl', null);
              }}
            />
            <div className="flex items-start gap-3 px-1">
              <p className="flex-1 text-xs leading-5 text-white/40">
                Posters are cropped to 4:5, the frame guests see on the website.
              </p>
              {form.coverImagePreview && (
                <button
                  type="button"
                  onClick={() => void recropPoster()}
                  disabled={loadingRecrop !== null}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-[13px] font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                >
                  <FiCrop size={14} />
                  {loadingRecrop === 'poster' ? 'Loading…' : 'Re-crop to 4:5'}
                </button>
              )}
            </div>
            <div className="space-y-3">
              <div className="border-b border-white/[0.08] pb-2">
                <h2 className="font-outfit text-base font-semibold text-white">Hosted by</h2>
              </div>
              <HostPicker
                selectedHost={selectedHost}
                locked={isEdit}
                onSelect={setSelectedHost}
                hasError={err(!selectedHost?.id)}
              />
            </div>
          </aside>

          {/* Right — the event, editable */}
          <div className="min-w-0 space-y-7">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => updateForm('isPrivate', !form.isPrivate)}
                title="Tap to switch"
                className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[13px] font-medium text-white transition hover:border-white/30"
              >
                {form.isPrivate ? (
                  <LuLock className="h-3.5 w-3.5 text-[#D8B4FE]" />
                ) : (
                  <LuGlobe className="h-3.5 w-3.5 text-[#D8B4FE]" />
                )}
                {form.isPrivate ? 'Private event' : 'Public event'}
              </button>
              <div className="ml-auto w-full sm:w-auto">
                <Segmented<'group' | 'one_on_one'>
                  value={form.sessionType}
                  onChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      sessionType: v,
                      // One-on-one slots come from availability windows; a
                      // group event starts as a single date again.
                      scheduleType: v === 'one_on_one' ? 'custom_dates' : 'one_time',
                      isRecurring: false,
                    }))
                  }
                  options={[
                    { value: 'group', label: 'Group' },
                    { value: 'one_on_one', label: '1:1' },
                  ]}
                />
              </div>
            </div>

            {/* What */}
            <section className="space-y-4">
              <MoodSelector
                kind={isOneOnOne ? 'session' : 'experience'}
                value={form.mood}
                onChange={(v) => updateForm('mood', v)}
                hasError={err(!form.mood)}
              />
              <TitleField
                mood={form.mood}
                value={form.title}
                onChange={(v) => updateForm('title', v)}
                onSelectTemplate={(title, hookLine) => {
                  updateForm('title', title);
                  updateForm('hookLine', hookLine);
                }}
                hasError={err(!form.title.trim())}
              />
              <input
                type="text"
                value={form.hookLine}
                onChange={(e) => updateForm('hookLine', e.target.value)}
                placeholder="A short tagline guests see under the name"
                aria-label="Short tagline"
                maxLength={150}
                className={`${INLINE_FIELD} ${err(!form.hookLine.trim()) ? '!border-red-500/70' : ''}`}
                style={{ backgroundColor: 'transparent' }}
              />
            </section>

            {/* When */}
            <section className="space-y-3">
              {!isOneOnOne &&
                (form.scheduleType === 'one_time' || form.scheduleType === 'recurring') && (
                  <div className="flex flex-wrap items-center gap-2">
                    <DatePill
                      value={form.eventDate}
                      onChange={(v) => updateForm('eventDate', v)}
                      error={err(!form.eventDate)}
                    />
                    <TimePill
                      value={form.eventTime}
                      onChange={(v) => setGroupTime('eventTime', v)}
                      placeholder="Start time"
                      ariaLabel="Start time"
                      error={err(!form.eventTime)}
                    />
                    <span className="text-white/35">to</span>
                    <TimePill
                      value={form.endTime}
                      onChange={(v) => setGroupTime('endTime', v)}
                      placeholder="End time"
                      start={form.eventTime || undefined}
                      ariaLabel="End time"
                    />
                  </div>
                )}

              {!isOneOnOne && (
                <div className="flex flex-wrap items-center gap-2">
                  {(
                    [
                      ['one_time', 'Just once'],
                      ['recurring', 'Repeats'],
                      ['custom_dates', 'Several dates'],
                    ] as const
                  ).map(([key, label]) => (
                    <Chip
                      key={key}
                      active={form.scheduleType === key}
                      onClick={() => {
                        updateForm('scheduleType', key);
                        updateForm('isRecurring', key === 'recurring');
                      }}
                    >
                      {label}
                    </Chip>
                  ))}
                  {form.scheduleType === 'recurring' && (
                    <select
                      value={form.recurrenceRule}
                      onChange={(e) => updateForm('recurrenceRule', e.target.value)}
                      className={INLINE_PICKER}
                      style={{ backgroundColor: 'transparent' }}
                      aria-label="How often it repeats"
                    >
                      <option value="">How often?</option>
                      <option value="FREQ=DAILY">Daily</option>
                      <option value="FREQ=WEEKLY">Weekly</option>
                      <option value="FREQ=WEEKLY;INTERVAL=2">Every 2 weeks</option>
                      <option value="FREQ=MONTHLY">Monthly</option>
                      {form.recurrenceRule &&
                        ![
                          'FREQ=DAILY',
                          'FREQ=WEEKLY',
                          'FREQ=WEEKLY;INTERVAL=2',
                          'FREQ=MONTHLY',
                        ].includes(form.recurrenceRule) && (
                          <option value={form.recurrenceRule}>
                            Custom ({form.recurrenceRule})
                          </option>
                        )}
                    </select>
                  )}
                </div>
              )}

              {!isOneOnOne && form.scheduleType === 'custom_dates' && (
                <div className="space-y-2">
                  {form.customDatesList.map((slot, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-2">
                      <DatePill
                        value={slot.date}
                        onChange={(v) => updateCustomSlot(idx, 'date', v)}
                        placeholder={`Date ${idx + 1}`}
                      />
                      <TimePill
                        value={slot.time}
                        onChange={(v) => updateCustomSlot(idx, 'time', v)}
                        placeholder="Start time"
                        ariaLabel={`Start time ${idx + 1}`}
                      />
                      {form.customDatesList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCustomSlot(idx)}
                          className="p-1.5 text-white/40 transition hover:text-red-400"
                          aria-label="Remove this date"
                        >
                          <FiX size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addCustomSlot}
                    className="px-2 text-sm font-medium text-[#D8B4FE] transition hover:text-white"
                  >
                    + Add another date
                  </button>
                </div>
              )}

              {isOneOnOne && (
                <SessionWindowsEditor
                  windows={form.sessionWindows}
                  onWindowsChange={(windows) => updateForm('sessionWindows', windows)}
                  breakMinutes={form.breakMinutes}
                  onBreakMinutesChange={(minutes) => updateForm('breakMinutes', minutes)}
                  durationMinutes={form.durationMinutes}
                  isWeekly={form.sessionIsWeekly}
                  onIsWeeklyChange={(weekly) => updateForm('sessionIsWeekly', weekly)}
                  showErrors={showErrors}
                />
              )}

              {(isOneOnOne || form.scheduleType === 'custom_dates') && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-sm text-white/55">
                    {isOneOnOne ? 'Each session' : 'Each date lasts'}
                  </span>
                  {DURATION_OPTIONS.map((mins) => (
                    <Chip
                      key={mins}
                      active={form.durationMinutes === mins}
                      onClick={() => updateForm('durationMinutes', mins)}
                    >
                      {minsLabel(mins)}
                    </Chip>
                  ))}
                  <label className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm text-white/60">
                    <NumberInput
                      value={form.durationMinutes}
                      min={15}
                      onChange={(v) => updateForm('durationMinutes', v)}
                      ariaLabel="Custom length in minutes"
                      className="row-input w-12 bg-transparent text-right text-sm text-white outline-none"
                    />
                    min
                  </label>
                </div>
              )}
            </section>

            {/* Location */}
            <Section title="Location">
              {form.isOnline ? (
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.07]">
                    <FiVideo className="h-5 w-5 text-[#D8B4FE]" />
                  </span>
                  <input
                    type="url"
                    value={form.meetingLink}
                    onChange={(e) => updateForm('meetingLink', e.target.value)}
                    placeholder="Meeting link (Zoom, Google Meet…)"
                    aria-label="Meeting link"
                    className={INLINE_FIELD}
                    style={{ backgroundColor: 'transparent' }}
                  />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.07]">
                      <FiMapPin className="h-5 w-5 text-[#D8B4FE]" />
                    </span>
                    <LocationSearchInput
                      value={form.location}
                      onChange={(val) => updateForm('location', val)}
                      onSelect={(addr, lat, lng) => {
                        updateForm('location', addr);
                        updateForm(
                          'googleMapsUrl',
                          `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
                        );
                      }}
                      placeholder="Search a place or area"
                      className="!rounded-xl !border-transparent !bg-transparent !px-2 !text-[15px] !ring-0 hover:!bg-white/[0.04] focus:!bg-white/[0.06]"
                    />
                  </div>
                  <input
                    type="url"
                    value={form.googleMapsUrl}
                    onChange={(e) => updateForm('googleMapsUrl', e.target.value)}
                    placeholder="Google Maps link (fills in when you pick a place)"
                    aria-label="Google Maps link"
                    className={`${INLINE_FIELD} !text-sm !text-white/60`}
                    style={{ backgroundColor: 'transparent' }}
                  />
                </>
              )}
              <button
                type="button"
                onClick={() => updateForm('isOnline', !form.isOnline)}
                className="px-2 text-sm font-medium text-white/50 transition hover:text-white"
              >
                {form.isOnline ? 'Meeting in person instead?' : 'Hosting it online instead?'}
              </button>
            </Section>

            {/* About */}
            <Section title="About the event">
              <RichTextEditor
                value={form.description}
                onChange={(html) => updateForm('description', html)}
                onLengthChange={setDescriptionTextLength}
                placeholder="Describe what guests will experience..."
                maxLength={2000}
                error={err(!form.description.trim())}
              />
              <p className="px-1 text-right text-xs text-white/35">
                {descriptionTextLength}/2000
              </p>
            </Section>

            {/* Tickets */}
            <Section title={isOneOnOne ? 'Price' : 'Tickets'}>
              {!isOneOnOne && (
                <Rows>
                  <Row label="Slots">
                    <NumberInput
                      value={form.maxGroupSize}
                      min={1}
                      onChange={(v) => updateForm('maxGroupSize', v)}
                      ariaLabel="Slots"
                    />
                  </Row>
                </Rows>
              )}
              <Segmented<'paid' | 'free'>
                value={form.isFree ? 'free' : 'paid'}
                onChange={(v) => updateForm('isFree', v === 'free')}
                options={[
                  { value: 'paid', label: 'Paid' },
                  { value: 'free', label: 'Free' },
                ]}
              />
              {!form.isFree && !form.useTiers && (
                <Rows>
                  <Row label="Price per person (₹)" error={err(form.priceCents <= 0)}>
                    <NumberInput
                      value={form.priceCents / 100}
                      decimal
                      onChange={(v) => updateForm('priceCents', Math.round(v * 100))}
                      ariaLabel="Price per person"
                    />
                  </Row>
                </Rows>
              )}
            </Section>

            {/* Everything optional, folded away */}
            <Section title="More options" hint="All optional. Open one to change it.">
              <div>
                <MoreOptions
                  title="Who can see it"
                  summary={
                    form.isPrivate
                      ? form.privateAccessMode === 'rsvp'
                        ? 'Private · request to join'
                        : 'Private · passkey'
                      : 'Public'
                  }
                  defaultOpen={form.isPrivate}
                >
                  <Segmented<'public' | 'private'>
                    value={form.isPrivate ? 'private' : 'public'}
                    onChange={(v) => updateForm('isPrivate', v === 'private')}
                    options={[
                      { value: 'public', label: 'Public' },
                      { value: 'private', label: 'Private' },
                    ]}
                  />
                  {form.isPrivate && (
                    <div className="space-y-4">
                      <p className="px-1 text-xs leading-5 text-white/45">
                        Still shown in discovery with a lock. Guests need a way in to book.
                      </p>
                      <Segmented<'passkey' | 'rsvp'>
                        value={form.privateAccessMode}
                        onChange={(v) => updateForm('privateAccessMode', v)}
                        options={[
                          { value: 'passkey', label: 'Unlock with a code' },
                          { value: 'rsvp', label: 'Request to join' },
                        ]}
                      />
                      {form.privateAccessMode === 'rsvp' ? (
                        <div className="space-y-1.5 rounded-2xl border border-white/[0.06] bg-[#131328] px-4 py-3.5 text-sm text-white/70">
                          <p>
                            Guests apply with their details and the host approves. Requests
                            show in the host dashboard and in Join requests here.
                          </p>
                          <p className="text-xs text-amber-300/90">
                            Needs guest details: turn them on below and pick at least one field.
                          </p>
                        </div>
                      ) : (
                        <>
                          <Segmented<'shared' | 'unique'>
                            value={form.accessMode}
                            onChange={(v) => updateForm('accessMode', v)}
                            options={[
                              { value: 'shared', label: 'One passkey' },
                              { value: 'unique', label: 'Code per guest' },
                            ]}
                          />
                          {form.accessMode === 'shared' ? (
                            <Rows>
                              <Row
                                label="Passkey"
                                error={err(!form.accessPasskey.trim())}
                              >
                                <input
                                  type="text"
                                  value={form.accessPasskey}
                                  onChange={(e) => updateForm('accessPasskey', e.target.value)}
                                  placeholder="e.g. SUMMER24"
                                  className={ROW_INPUT}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateForm(
                                      'accessPasskey',
                                      Math.random().toString(36).slice(2, 8).toUpperCase(),
                                    )
                                  }
                                  className="shrink-0 rounded-full bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15"
                                >
                                  Generate
                                </button>
                              </Row>
                            </Rows>
                          ) : (
                            <p className="px-1 text-sm text-white/60">
                              Each guest gets a single-use code that unlocks booking.{' '}
                              {isEdit
                                ? 'Generate them below.'
                                : 'Save the experience first, then generate them here.'}
                            </p>
                          )}
                        </>
                      )}
                      {isEdit && editEventId && selectedHost?.id && (
                        <CouponsManager
                          eventId={editEventId}
                          hostId={selectedHost.id}
                          kind="access"
                        />
                      )}
                    </div>
                  )}
                </MoreOptions>

                <MoreOptions
                  title="Refunds"
                  summary={
                    CANCELLATION_POLICIES.find((p) => p.value === form.cancellationPolicy)
                      ?.label ?? ''
                  }
                >
                  <Rows>
                    {CANCELLATION_POLICIES.map((p) => {
                      const on = form.cancellationPolicy === p.value;
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => updateForm('cancellationPolicy', p.value)}
                          className="flex min-h-[56px] w-full items-center gap-3 py-2.5 text-left"
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                              on ? 'border-[#B57BFF]' : 'border-white/25'
                            }`}
                          >
                            {on && <span className={`h-2.5 w-2.5 rounded-full ${GRADIENT}`} />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-white">
                              {p.label}
                            </span>
                            <span className="block text-xs text-white/45">{p.description}</span>
                          </span>
                        </button>
                      );
                    })}
                  </Rows>
                </MoreOptions>

                {!form.isFree && (
                  <MoreOptions
                    title="Ticket types & monthly pass"
                    summary={
                      form.useTiers
                        ? `${form.priceTiers.length} ticket types`
                        : form.monthlyPassEnabled
                          ? 'One price · pass on'
                          : 'One price'
                    }
                  >
                    <Segmented<'single' | 'tiers'>
                      value={form.useTiers ? 'tiers' : 'single'}
                      onChange={(v) => updateForm('useTiers', v === 'tiers')}
                      options={[
                        { value: 'single', label: 'Single price' },
                        { value: 'tiers', label: 'Multiple ticket types' },
                      ]}
                    />
                    {form.useTiers && (
                      <div className="space-y-2">
                        {form.priceTiers.map((tier, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={tier.name}
                              onChange={(e) => updatePriceTier(index, 'name', e.target.value)}
                              placeholder="Ticket name, e.g. VIP"
                              className={`${FIELD} !py-2.5`}
                            />
                            <input
                              type="number"
                              min={0}
                              value={tier.priceStr}
                              onChange={(e) =>
                                updatePriceTier(index, 'priceStr', e.target.value)
                              }
                              placeholder="₹ Price"
                              className={`${FIELD} !w-32 !py-2.5`}
                            />
                            {form.priceTiers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removePriceTier(index)}
                                className="p-1.5 text-white/40 transition hover:text-red-400"
                                aria-label="Remove ticket type"
                              >
                                <FiX className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        ))}
                        <AddPill onClick={addPriceTier}>Add another ticket type</AddPill>
                      </div>
                    )}
                    <ToggleRow
                      label="Monthly pass"
                      hint={
                        form.scheduleType === 'one_time'
                          ? 'Repeating or several-dates events only.'
                          : 'Guests pay once and attend for 30 days.'
                      }
                      checked={form.monthlyPassEnabled}
                      disabled={form.scheduleType === 'one_time'}
                      onChange={(next) => updateForm('monthlyPassEnabled', next)}
                    />
                    {form.monthlyPassEnabled && form.scheduleType !== 'one_time' && (
                      <Rows>
                        <Row
                          label="Pass price (₹)"
                          error={err(Number(form.monthlyPassPriceStr) <= 0)}
                        >
                          <input
                            type="number"
                            min={1}
                            value={form.monthlyPassPriceStr}
                            onChange={(e) => updateForm('monthlyPassPriceStr', e.target.value)}
                            placeholder="2500"
                            className={ROW_INPUT}
                          />
                        </Row>
                        <Row label="Sessions included">
                          <input
                            type="number"
                            min={1}
                            value={form.monthlyPassSessionsStr}
                            onChange={(e) =>
                              updateForm('monthlyPassSessionsStr', e.target.value)
                            }
                            placeholder="All"
                            className={ROW_INPUT}
                          />
                        </Row>
                        <Row label="Passes available">
                          <input
                            type="number"
                            min={1}
                            value={form.monthlyPassCapacityStr}
                            onChange={(e) =>
                              updateForm('monthlyPassCapacityStr', e.target.value)
                            }
                            placeholder="Unlimited"
                            className={ROW_INPUT}
                          />
                        </Row>
                      </Rows>
                    )}
                  </MoreOptions>
                )}

                {isEdit && editEventId && selectedHost?.id && !form.isFree && (
                  <MoreOptions title="Coupons & free codes" summary="Discounts and comps">
                    <CouponsManager
                      eventId={editEventId}
                      hostId={selectedHost.id}
                      kind="discount"
                    />
                    <CouponsManager eventId={editEventId} hostId={selectedHost.id} kind="free" />
                  </MoreOptions>
                )}

                <MoreOptions
                  title="More photos"
                  summary={
                    form.galleryPreviews.length ? `${form.galleryPreviews.length} added` : 'None'
                  }
                >
                  <GalleryUpload
                    previews={form.galleryPreviews}
                    onUpload={handleGalleryUpload}
                    onRemove={removeGalleryImage}
                    onRecrop={(i) => void recropGallery(i)}
                    recropping={
                      loadingRecrop?.startsWith('gallery-')
                        ? Number(loadingRecrop.slice(8))
                        : null
                    }
                  />
                </MoreOptions>

                {!isOneOnOne && (
                  <MoreOptions
                    title="Group size"
                    summary={`${form.minGroupSize}–${form.maxGroupSize} guests`}
                  >
                    <Rows>
                      <Row label="Minimum to run">
                        <NumberInput
                          value={form.minGroupSize}
                          min={1}
                          onChange={(v) => updateForm('minGroupSize', v)}
                          ariaLabel="Minimum guests"
                        />
                      </Row>
                      <Row label="Maximum (slots)">
                        <NumberInput
                          value={form.maxGroupSize}
                          min={Math.max(1, form.minGroupSize)}
                          onChange={(v) => updateForm('maxGroupSize', v)}
                          ariaLabel="Maximum guests"
                        />
                      </Row>
                    </Rows>
                    {(isOneOnOne || form.scheduleType !== 'custom_dates') &&
                      !(form.eventTime && form.endTime) && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="mr-1 text-sm text-white/55">Lasts</span>
                          {DURATION_OPTIONS.map((mins) => (
                            <Chip
                              key={mins}
                              active={form.durationMinutes === mins}
                              onClick={() => updateForm('durationMinutes', mins)}
                            >
                              {minsLabel(mins)}
                            </Chip>
                          ))}
                        </div>
                      )}
                  </MoreOptions>
                )}

                <MoreOptions
                  title="Languages & level"
                  summary={[form.languages.join(', '), form.level].filter(Boolean).join(' · ')}
                >
                  <div className="flex flex-wrap gap-2">
                    {[
                      ...LANGUAGE_OPTIONS,
                      ...form.languages.filter((l) => !LANGUAGE_OPTIONS.includes(l)),
                    ].map((lang) => (
                      <Chip
                        key={lang}
                        active={form.languages.includes(lang)}
                        onClick={() => toggleLanguage(lang)}
                      >
                        {lang}
                      </Chip>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customLanguage}
                      onChange={(e) => setCustomLanguage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomLanguage();
                        }
                      }}
                      placeholder="Another language"
                      className={`${FIELD} !py-2.5`}
                    />
                    <button
                      type="button"
                      onClick={addCustomLanguage}
                      className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {LEVEL_OPTIONS.map((lvl) => (
                      <Chip
                        key={lvl}
                        active={form.level === lvl}
                        onClick={() => updateForm('level', form.level === lvl ? '' : lvl)}
                      >
                        {lvl}
                      </Chip>
                    ))}
                  </div>
                </MoreOptions>

                <MoreOptions
                  title="Guest details at booking"
                  summary={
                    form.requiresAttendeeDetails
                      ? `${form.attendeeFields.length} field${form.attendeeFields.length === 1 ? '' : 's'} required`
                      : 'Off'
                  }
                  defaultOpen={
                    showErrors &&
                    form.isPrivate &&
                    form.privateAccessMode === 'rsvp' &&
                    form.attendeeFields.length === 0
                  }
                >
                  <ToggleRow
                    label="Ask each guest for details"
                    hint="Selected fields are required at booking."
                    checked={form.requiresAttendeeDetails}
                    onChange={(next) => updateForm('requiresAttendeeDetails', next)}
                  />
                  {form.requiresAttendeeDetails && (
                    <div className="flex flex-wrap gap-2">
                      {ATTENDEE_FIELDS.map((f) => {
                        const on = form.attendeeFields.includes(f.key);
                        return (
                          <Chip
                            key={f.key}
                            active={on}
                            onClick={() =>
                              updateForm(
                                'attendeeFields',
                                on
                                  ? form.attendeeFields.filter((k) => k !== f.key)
                                  : [...form.attendeeFields, f.key],
                              )
                            }
                          >
                            {f.label}
                          </Chip>
                        );
                      })}
                    </div>
                  )}
                </MoreOptions>

                <MoreOptions
                  title="Terms on the ticket"
                  summary={form.termsAndConditions.trim() ? 'Added' : 'None'}
                >
                  <textarea
                    value={form.termsAndConditions}
                    onChange={(e) => {
                      if (e.target.value.length <= 2000)
                        updateForm('termsAndConditions', e.target.value);
                    }}
                    maxLength={2000}
                    rows={5}
                    placeholder={
                      'Printed on the guest’s ticket PDF, e.g.\n• Carry a valid photo ID.\n• Arrive 15 minutes early.'
                    }
                    className={`${FIELD} resize-y`}
                  />
                  <p className="px-1 text-right text-xs text-white/35">
                    {form.termsAndConditions.length}/2000
                  </p>
                </MoreOptions>

                {isEdit && (
                  <MoreOptions
                    title="Page link"
                    summary={`/experience/${form.slug}`}
                    defaultOpen={slugStatus === 'taken' || slugStatus === 'invalid'}
                  >
                    <Rows>
                      <Row
                        label="myslotmate.com/experience/"
                        error={slugStatus === 'taken' || slugStatus === 'invalid'}
                      >
                        <input
                          type="text"
                          value={form.slug}
                          onChange={(e) =>
                            updateForm(
                              'slug',
                              // Lenient while typing (keep a trailing hyphen so
                              // word boundaries work); the server slugifies again.
                              e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, '-')
                                .replace(/^-+/, ''),
                            )
                          }
                          placeholder="sunset-yoga"
                          aria-label="URL slug"
                          className={ROW_INPUT}
                        />
                      </Row>
                    </Rows>
                    <p
                      className={`px-1 text-xs ${
                        slugStatus === 'taken' || slugStatus === 'invalid'
                          ? 'text-red-400'
                          : slugStatus === 'available'
                            ? 'text-emerald-300'
                            : 'text-white/45'
                      }`}
                    >
                      {slugStatus === 'checking'
                        ? 'Checking…'
                        : slugStatus === 'available'
                          ? 'Available.'
                          : slugStatus === 'taken'
                            ? 'Already in use — pick another.'
                            : slugStatus === 'invalid'
                              ? 'A link is required.'
                              : ''}{' '}
                      <span className="text-white/40">
                        Changing it changes the public URL; the old id link keeps working.
                      </span>
                    </p>
                  </MoreOptions>
                )}

                {isEdit && (
                  <MoreOptions title="Delete experience" summary="">
                    <p className="text-sm text-white/55">
                      Removes this experience for good. Blocked while it still has active
                      bookings — cancel or pause it first.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-2 rounded-full border border-rose-400/25 bg-rose-500/[0.08] px-5 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/[0.14]"
                    >
                      <FiTrash2 size={16} /> Delete experience
                    </button>
                  </MoreOptions>
                )}
              </div>
            </Section>

            {/* Save: one floating pill under the form */}
            <div className="sticky bottom-[max(16px,env(safe-area-inset-bottom))] z-30 mt-10">
              <div className="flex w-full gap-2 rounded-[28px] border border-white/10 bg-[#121426]/90 p-2 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                {!isEdit || isDraftEvent ? (
                  <button
                    onClick={() => void handleSubmit(true)}
                    disabled={isSubmitting}
                    className="shrink-0 rounded-full px-4 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                  >
                    {submitType === 'draft' ? 'Saving…' : 'Save draft'}
                  </button>
                ) : (
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex shrink-0 items-center gap-1.5 rounded-full px-4 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    View event <FiExternalLink size={14} />
                  </a>
                )}
                <button
                  onClick={() => void handleSubmit(false)}
                  disabled={isSubmitting}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 ${GRADIENT}`}
                >
                  <FiCheck size={18} />
                  {submitType === 'publish'
                    ? 'Saving…'
                    : isEdit && !isDraftEvent
                      ? 'Save changes'
                      : 'Publish event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#121426] p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
              <FiTrash2 className="text-red-300" size={22} />
            </div>
            <h2 className="font-outfit mb-2 text-xl font-bold text-white">Delete this experience?</h2>
            <p className="mb-6 text-sm leading-6 text-white/55">
              “{form.title || 'Untitled'}” is removed for good. This can’t be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-full bg-white/[0.06] py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="flex-1 rounded-full bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SuccessModal
        isOpen={showSuccess}
        slugOrId={form.slug || createdEventId}
        isDraft={savedAsDraft}
        hostName={hostName}
        isEdit={isEdit}
      />

      <ImageCropModal
        file={cropQueue.length > 0 ? cropQueue[0]! : null}
        aspect={POSTER_ASPECT}
        onClose={() => {
          setCropQueue([]);
          setRecropIndex(null);
        }}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
};
