import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onOpenSidebar: () => void;
  isSidebarOpen?: boolean;
  globalSearch: string;
  onSearchChange: (val: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenSidebar, 
  isSidebarOpen = false,
  globalSearch, 
  onSearchChange 
}) => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const pageTitles: { [key: string]: string } = {
    '/': 'Dashboard',
    '/users': 'Users',
    '/hosts': 'Hosts',
    '/experiences': 'Experiences',
    '/bookings': 'Bookings',
    '/payments': 'Payments',
    '/cities': 'Cities',
    '/reviews': 'Reviews',
    '/reports': 'Reports',
    '/blogs': 'Blogs',
    '/marketing': 'Marketing',
    '/notifications': 'Notifications',
    '/settings': 'Settings',
  };

  const currentTitle = pageTitles[location.pathname] || 'Dashboard';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-xs lg:hidden cursor-pointer hover:bg-slate-50 hover:border-brand-300 transition-all"
            type="button"
            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">MySlotMate Portal</p>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink">{currentTitle}</h2>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-3 min-w-[280px]">
          {/* Global search input with shortcut hint */}
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-2 shadow-xs transition-all focus-within:border-brand-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/20 min-w-[240px] max-w-md flex-1">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400"
              type="search"
              placeholder="Search users, experiences, bookings..."
              value={globalSearch}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <kbd className="hidden sm:inline-flex items-center rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-extrabold text-slate-400 shadow-xs select-none">
              ⌘K
            </kbd>
          </div>

          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => alert('Exporting directory data as CSV...')}
          >
            Export CSV
          </Button>
          
          <Button 
            variant="primary" 
            size="sm"
            onClick={() => navigate('/notifications')}
          >
            Compose
          </Button>

          {/* User profile menu */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-1.5 shadow-xs relative group cursor-pointer hover:border-brand-200">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-slate-400">Signed in as</p>
              <p className="text-xs font-extrabold text-ink">{user?.name || 'Aarav Sharma'}</p>
            </div>
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 font-extrabold text-white text-xs select-none shadow-xs">
                {user?.name ? user.name.split(' ').map(n => n[0]).join('') : 'AS'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />
            </div>

            {/* Premium hover action menu */}
            <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-panel opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="px-3 py-2 border-b border-slate-100 text-left">
                <p className="text-[10px] font-bold text-slate-400">Scope</p>
                <p className="text-xs font-extrabold text-ink">{user?.scope || 'Global Admin'}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to log out?')) {
                    logout();
                  }
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 mt-1 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                Log out session
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
