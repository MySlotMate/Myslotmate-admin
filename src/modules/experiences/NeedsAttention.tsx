import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiChevronRight } from 'react-icons/fi';
import { fetchEventAttention, type AttentionItem } from '../../api/events';

// NeedsAttention: the same list the host sees on their edit page — join
// requests waiting, shared codes nearly or fully used up or ending soon, and
// monthly passes ending this week. Renders nothing when the list is empty.
export default function NeedsAttention({ eventId }: { eventId: string }) {
  const [items, setItems] = useState<AttentionItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchEventAttention(eventId)
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (items.length === 0) return null;

  return (
    <section
      aria-label="Needs attention"
      className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-4"
    >
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-200">
        <FiAlertCircle className="h-4 w-4" /> Needs attention
      </h2>
      <ul className="divide-y divide-white/[0.06]">
        {items.map((it, i) => (
          <li key={`${it.kind}-${it.code ?? i}`} className="py-2">
            {it.kind === 'join_requests' ? (
              <Link
                to="/join-requests"
                className="flex items-center justify-between gap-3 text-sm text-white hover:text-[#D8B4FE]"
              >
                {it.title}
                <FiChevronRight className="h-4 w-4 shrink-0 text-white/50" />
              </Link>
            ) : (
              <p className="text-sm text-white/85">{it.title}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
