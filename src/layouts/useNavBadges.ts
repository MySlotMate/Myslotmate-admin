import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchBoosts } from '../api/boosts';
import { fetchPendingApplications } from '../api/hosts';
import { listJoinRequests } from '../api/joinRequests';

/**
 * Sidebar counts: how many things need the team's attention on a tab since it
 * was last opened. Opening the tab clears its count. "Last opened" is kept per
 * browser in localStorage; with nothing stored yet, every waiting item counts.
 *
 *   Boosts             new requests, and proposals the host just accepted (ready to go live)
 *   Host applications  pending applications submitted since
 *   Join requests      pending requests made since
 *
 * Read from the same admin endpoints the tabs use; refreshed every minute.
 */

export type BadgePath = '/boosts' | '/host-applications' | '/join-requests';
export type NavBadges = Partial<Record<BadgePath, number>>;

const PATHS: BadgePath[] = ['/boosts', '/host-applications', '/join-requests'];
const REFRESH_MS = 60_000;
const seenKey = (path: BadgePath) => `msm_admin_seen:${path}`;

function readSeen(path: BadgePath): number {
  try {
    return Number(localStorage.getItem(seenKey(path))) || 0;
  } catch {
    return 0;
  }
}

function markSeen(path: BadgePath) {
  try {
    localStorage.setItem(seenKey(path), String(Date.now()));
  } catch {
    /* private mode: the count just won't stick */
  }
}

const openTab = (path: string) => PATHS.find((p) => path === p || path.startsWith(`${p}/`));

const after = (iso: string | null | undefined, seen: number) => Boolean(iso) && Date.parse(iso as string) > seen;

async function countNew(): Promise<NavBadges> {
  const [boosts, apps, joins] = await Promise.allSettled([
    fetchBoosts(''),
    fetchPendingApplications(),
    listJoinRequests({ status: 'pending', limit: 200 }),
  ]);
  const out: NavBadges = {};
  if (boosts.status === 'fulfilled') {
    const seen = readSeen('/boosts');
    out['/boosts'] = (boosts.value.items ?? []).filter(
      (b) =>
        (b.status === 'under_review' && after(b.requested_at, seen)) ||
        (b.status === 'quote_ready' && after(b.accepted_at, seen)),
    ).length;
  }
  if (apps.status === 'fulfilled') {
    const seen = readSeen('/host-applications');
    out['/host-applications'] = apps.value.filter((h) => after(h.submitted_at, seen)).length;
  }
  if (joins.status === 'fulfilled') {
    const seen = readSeen('/join-requests');
    out['/join-requests'] = (joins.value ?? []).filter((j) => after(j.created_at, seen)).length;
  }
  return out;
}

export function useNavBadges(enabled: boolean): NavBadges {
  // The router's path (the admin uses a HashRouter, so not window.location.pathname).
  const { pathname } = useLocation();
  const current = useRef(pathname);
  const [badges, setBadges] = useState<NavBadges>({});

  const refresh = useCallback(() => {
    if (!enabled) return;
    countNew()
      .then(setBadges)
      .catch(() => undefined);
  }, [enabled]);

  // Opening a tab marks it seen (and keeps it seen while you're on it).
  useEffect(() => {
    current.current = pathname;
    const open = openTab(pathname);
    if (open) markSeen(open);
    refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      const open = openTab(current.current);
      if (open) markSeen(open);
      refresh();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [enabled, refresh]);

  return badges;
}
