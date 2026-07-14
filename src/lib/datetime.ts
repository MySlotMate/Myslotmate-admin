// MySlotMate is a single-market (India) product, so every event scheduling time
// is read and written in India Standard Time regardless of the admin's device
// timezone. The DB stores each time as a UTC instant (TIMESTAMPTZ); anchoring
// form input to the fixed +05:30 offset keeps the stored instant from drifting
// with the browser timezone. Mirrors MySlotmate-Frontend/src/lib/datetime.ts.

const IST_OFFSET = '+05:30';

// Combine an entered date ("YYYY-MM-DD") and time ("HH:mm"), interpreted as
// IST, into a UTC ISO string for storage.
export function istInputToUTCISO(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00${IST_OFFSET}`).toISOString();
}

// Reverse of istInputToUTCISO: turn a stored UTC ISO instant into the IST-local
// date ("YYYY-MM-DD") and time ("HH:mm") strings for prefilling form inputs.
export function utcToISTInputs(iso: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${hour}:${get('minute')}`,
  };
}
