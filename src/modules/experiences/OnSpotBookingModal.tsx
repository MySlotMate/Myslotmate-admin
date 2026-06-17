import React, { useState, useEffect } from 'react';
import { IndianRupee, CheckCircle2, Download } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { ApiError } from '../../api/client';
import { initiateWalkIn, completeWalkIn, fetchEventOccurrences, lookupWalkInPhone } from '../../api/walkin';
import type { EventOccurrence } from '../../api/walkin';
import { loadRazorpay, openRazorpayCheckout } from '../../lib/razorpay';
import { downloadTicketPdf, sendTicketNotificationPdf } from '../../lib/ticket';
import type { AdminEvent } from '../../api/directory';

// Formats an RFC3339 instant in IST for display in the dropdown.
const istFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});
function formatOccurrence(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : istFormatter.format(d);
}

interface OnSpotBookingModalProps {
  event: AdminEvent;
  isOpen: boolean;
  onClose: () => void;
  onBooked?: () => void;
}

export const OnSpotBookingModal: React.FC<OnSpotBookingModalProps> = ({ event, isOpen, onClose, onBooked }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [existingUser, setExistingUser] = useState(false); // phone already linked → name auto-filled & locked
  const [quantity, setQuantity] = useState(1);
  const [occurrences, setOccurrences] = useState<EventOccurrence[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [occLoading, setOccLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [booking, setBooking] = useState<{ id: string; quantity?: number; amount_cents?: number; occurrence_date?: string } | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Load the next 3 upcoming occurrences when the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setOccLoading(true);
    setError(null);
    fetchEventOccurrences(event.id)
      .then((all) => {
        if (cancelled) return;
        const upcoming = (all || []).filter((o) => !o.is_paused).slice(0, 3);
        setOccurrences(upcoming);
        const firstOpen = upcoming.find((o) => !o.is_fully_booked) ?? upcoming[0];
        setSelectedDate(firstOpen ? firstOpen.date : '');
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load available dates.');
      })
      .finally(() => { if (!cancelled) setOccLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, event.id]);

  // When a full 10-digit phone is entered, look it up: if it already belongs to a
  // user, auto-fill + lock the name so the admin sees whose number it is.
  useEffect(() => {
    if (phone.length !== 10) { setExistingUser(false); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      lookupWalkInPhone(`+91${phone}`)
        .then((res) => {
          if (cancelled) return;
          if (res.exists) { setExistingUser(true); setName(res.name || ''); }
          else { setExistingUser(false); }
        })
        .catch(() => { if (!cancelled) setExistingUser(false); });
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [phone]);

  const reset = () => {
    setName(''); setPhone(''); setExistingUser(false); setQuantity(1);
    setOccurrences([]); setSelectedDate('');
    setLoading(false); setError(null); setDone(false);
    setBooking(null); setDownloading(false);
  };

  // Capacity gating for the chosen slot.
  const selectedOcc = occurrences.find((o) => o.date === selectedDate) ?? null;
  const noSlots = !occLoading && occurrences.length === 0;
  const allSlotsFull = occurrences.length > 0 && occurrences.every((o) => o.is_fully_booked);
  const notEnoughRoom = selectedOcc != null && !selectedOcc.is_fully_booked && selectedOcc.remaining < quantity;
  const slotBlocked = noSlots || allSlotsFull || (selectedOcc?.is_fully_booked ?? false) || notEnoughRoom;

  const handleClose = () => {
    if (loading) return; // don't close mid-payment
    reset();
    onClose();
  };

  const finish = (created?: any) => {
    if (created && typeof created === 'object') {
      setBooking(created);
      
      // Send ticket confirmation on WhatsApp in background
      const fullPhone = `+91${phone}`;
      sendTicketNotificationPdf(event.id, created, name.trim(), fullPhone)
        .then(() => console.log('[WhatsApp Notification] Sent successfully for walk-in'))
        .catch((err) => console.error('[WhatsApp Notification] Failed to send for walk-in:', err));
    }
    setLoading(false);
    setDone(true);
    onBooked?.();
  };

  const handleDownloadTicket = async () => {
    if (!booking) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadTicketPdf(event.id, booking, name);
    } catch {
      setError('Could not generate the ticket. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('Guest name is required.'); return; }
    if (phone.length !== 10) { setError('Enter a valid 10-digit phone number.'); return; }
    if (quantity < 1) { setError('Quantity must be at least 1.'); return; }
    if (!selectedDate) { setError('Please select a date for the booking.'); return; }
    if (allSlotsFull) { setError('All upcoming slots are fully booked — on-spot booking is unavailable.'); return; }
    if (selectedOcc?.is_fully_booked) { setError('This slot is fully booked. Pick another date.'); return; }
    if (notEnoughRoom) { setError(`Only ${selectedOcc?.remaining} spot(s) left for this slot. Reduce the quantity.`); return; }

    // The backend stores numbers with the country code; the field takes 10 digits.
    const fullPhone = `+91${phone}`;

    setLoading(true);
    try {
      const occurrence_date = selectedDate || undefined;
      const res = await initiateWalkIn({
        guest_name: name.trim(),
        guest_phone: fullPhone,
        event_id: event.id,
        quantity,
        occurrence_date,
      });

      // Free event → already booked + confirmed.
      if (!res.paid) {
        finish(res.booking);
        return;
      }

      // Paid event → open Razorpay checkout on this screen.
      const ok = await loadRazorpay();
      if (!ok) {
        setLoading(false);
        setError('Could not load the payment gateway. Check your connection and retry.');
        return;
      }

      openRazorpayCheckout({
        key: res.key_id || '',
        amount: res.amount_cents || 0,
        currency: res.currency || 'INR',
        order_id: res.order_id || '',
        name: 'MySlotMate',
        description: `On-spot booking — ${event.title}`,
        prefill: { name: name.trim(), contact: fullPhone },
        theme: { color: '#4f46e5' },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setError('Payment was cancelled.');
          },
        },
        handler: async (response) => {
          try {
            const created = await completeWalkIn({
              guest_user_id: res.guest_user_id,
              event_id: event.id,
              quantity,
              occurrence_date,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            finish(created);
          } catch (err) {
            setLoading(false);
            setError(
              err instanceof ApiError
                ? `Payment captured but booking failed: ${err.message}. The amount is in the guest's wallet — contact support.`
                : 'Payment captured but booking failed. Contact support.',
            );
          }
        },
      });
    } catch (err) {
      setLoading(false);
      setError(err instanceof ApiError ? err.message : 'Failed to start the booking.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`On-spot booking — ${event.title}`}>
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <p className="text-lg font-semibold text-ink">Booking confirmed</p>
          <p className="text-sm text-slate-500">The guest's booking has been created and confirmed.</p>
          {error && (
            <div className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">{error}</div>
          )}
          <div className="mt-2 flex items-center gap-3">
            <Button variant="secondary" onClick={() => void handleDownloadTicket()} disabled={downloading || !booking}>
              <Download className="mr-2 h-4 w-4" />
              {downloading ? 'Preparing…' : 'Download ticket'}
            </Button>
            <Button variant="primary" onClick={handleClose}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl border border-brand-100 bg-brand-50/40 px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-ink">{event.title}</span>
            <span className="mx-2 text-slate-300">•</span>
            {event.isFree ? (
              <span className="font-semibold text-emerald-600">Free</span>
            ) : (
              <span className="inline-flex items-center gap-0.5 font-semibold text-ink">
                <IndianRupee className="h-3.5 w-3.5 stroke-[2.5]" />
                {event.price.toLocaleString()} <span className="font-normal text-slate-500">/ guest</span>
              </span>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Phone number</label>
            <div className="flex items-center rounded-2xl border border-brand-100 bg-white transition focus-within:border-brand-400">
              <span className="select-none border-r border-brand-100 px-3 py-3 text-sm font-semibold text-slate-500">+91</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                className="w-full bg-transparent px-4 py-3 text-sm outline-none"
                placeholder="10-digit number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Guest name</label>
            <input
              type="text"
              className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm outline-none transition focus:border-brand-400 disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading || existingUser}
            />
            {existingUser && (
              <p className="mt-1 text-xs font-medium text-emerald-600">Existing customer — this booking will use their account.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Quantity</label>
              <input
                type="number"
                min={1}
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-400"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value || '1', 10)))}
                disabled={loading}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Date &amp; time</label>
              <select
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-400 disabled:opacity-60"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={loading || occLoading || occurrences.length === 0}
              >
                {occLoading && <option value="">Loading dates…</option>}
                {!occLoading && occurrences.length === 0 && <option value="">No upcoming dates</option>}
                {!occLoading && occurrences.map((o) => (
                  <option key={o.date} value={o.date} disabled={o.is_fully_booked}>
                    {formatOccurrence(o.date)}{o.is_fully_booked ? ' — Full' : ` — ${o.remaining} left`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Showing the next {occurrences.length || 3} upcoming slot{occurrences.length === 1 ? '' : 's'} for this experience (times in IST).
          </p>

          {!occLoading && slotBlocked && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {noSlots
                ? 'No upcoming slots available — on-spot booking is unavailable.'
                : allSlotsFull
                  ? 'All upcoming slots are fully booked — on-spot booking is unavailable.'
                  : selectedOcc?.is_fully_booked
                    ? 'This slot is fully booked. Pick another date.'
                    : `Only ${selectedOcc?.remaining} spot(s) left for this slot.`}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={loading || occLoading || slotBlocked}>
              {loading ? 'Processing…' : event.isFree ? 'Create booking' : 'Collect payment'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
