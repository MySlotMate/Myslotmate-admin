import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Search, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onOpenSidebar: () => void;
  isSidebarOpen?: boolean;
  globalSearch: string;
  onSearchChange: (val: string) => void;
}

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/users': 'Users',
  '/hosts': 'Hosts',
  '/host-applications': 'Host applications',
  '/experiences': 'Experiences',
  '/bookings': 'Bookings',
  '/join-requests': 'Join requests',
  '/payments': 'Payments',
  '/cities': 'Cities',
  '/reviews': 'Reviews',
  '/reports': 'Reports',
  '/blogs': 'Blogs',
  '/marketing': 'Marketing',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
};

const titleFor = (path: string) =>
  PAGE_TITLES[path] ??
  PAGE_TITLES[`/${path.split('/')[1] ?? ''}`] ??
  'Dashboard';

const initials = (name?: string) =>
  (name ?? 'Admin')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]!.toUpperCase())
    .join('');

export const Header: React.FC<HeaderProps> = ({
  onOpenSidebar,
  isSidebarOpen = false,
  globalSearch,
  onSearchChange,
}) => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#080914]/75 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/10 lg:hidden"
            type="button"
            aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
          >
            <Menu className="h-5 w-5" />
          </button>
          <h2 className="font-outfit text-xl font-semibold text-white">
            {titleFor(location.pathname)}
          </h2>
        </div>

        <div className="flex min-w-[260px] flex-1 items-center justify-end gap-2">
          <label className="flex max-w-md min-w-0 flex-1 items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 transition focus-within:border-[#B57BFF] focus-within:bg-white/[0.08]">
            <Search className="h-4 w-4 shrink-0 text-white/40" />
            <input
              className="row-input w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              type="search"
              placeholder="Search users, experiences, bookings"
              value={globalSearch}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </label>

          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className="hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7038F5] to-[#B724EA] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 sm:inline-flex"
          >
            <Send className="h-3.5 w-3.5" /> Compose
          </button>

          {/* Account menu */}
          <div className="group relative">
            <button
              type="button"
              aria-label="Account"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#7038F5] to-[#B724EA] text-xs font-semibold text-white"
            >
              {initials(user?.name)}
              <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-[#080914] bg-emerald-400" />
            </button>
            <div className="invisible absolute top-full right-0 z-50 mt-2 w-56 rounded-2xl border border-white/10 bg-[#14152a] p-2 opacity-0 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)] transition-all duration-200 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div className="border-b border-white/[0.06] px-3 py-2">
                <p className="truncate text-sm font-semibold text-white">{user?.name || 'Administrator'}</p>
                <p className="truncate text-xs text-white/45">{user?.scope || 'Global admin'}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Log out of the admin console?')) logout();
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-300 transition hover:bg-rose-500/10"
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
