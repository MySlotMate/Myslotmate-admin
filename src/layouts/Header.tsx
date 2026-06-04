import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onOpenSidebar: () => void;
  globalSearch: string;
  onSearchChange: (val: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenSidebar, 
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
    <header className="sticky top-0 z-30 border-b border-white/60 bg-shell/85 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-100 bg-white text-slate-600 shadow-sm lg:hidden cursor-pointer"
            type="button"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">MySlotMate Admin</p>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">{currentTitle}</h2>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-3 min-w-[280px]">
          <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 shadow-sm min-w-[260px] max-w-md flex-1">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              type="search"
              placeholder="Search directory..."
              value={globalSearch}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          <Button 
            variant="secondary" 
            onClick={() => alert('Exporting all data tables as CSV...')}
          >
            Export CSV
          </Button>
          
          <Button 
            variant="primary" 
            onClick={() => navigate('/notifications')}
          >
            Create report
          </Button>

          <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white px-3 py-2 shadow-sm relative group">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-slate-400">Signed in as</p>
              <p className="text-xs font-extrabold text-ink">{user?.name || 'Aarav Sharma'}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 font-extrabold text-brand-800 text-sm select-none">
              {user?.name ? user.name.split(' ').map(n => n[0]).join('') : 'AS'}
            </div>

            {/* Premium hover action menu */}
            <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-brand-100 bg-white p-2 shadow-panel opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="px-3 py-2 border-b border-slate-100 text-left">
                <p className="text-[10px] font-bold text-slate-400">Scope</p>
                <p className="text-xs font-extrabold text-ink">{user?.scope || 'Global'}</p>
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
