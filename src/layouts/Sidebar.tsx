import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Compass,
  CalendarDays,
  CreditCard,
  MapPin,
  Star,
  AlertTriangle,
  FileText,
  Megaphone,
  Bell,
  Settings as SettingsIcon,
  X,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const SECTIONS = [
  {
    title: 'Overview',
    items: [{ name: 'Dashboard', path: '/', icon: LayoutDashboard }],
  },
  {
    title: 'Marketplace',
    items: [
      { name: 'Users', path: '/users', icon: Users },
      { name: 'Hosts', path: '/hosts', icon: UserCheck },
      { name: 'Experiences', path: '/experiences', icon: Compass },
      { name: 'Bookings', path: '/bookings', icon: CalendarDays },
      { name: 'Payments', path: '/payments', icon: CreditCard },
    ],
  },
  {
    title: 'Operations',
    items: [
      { name: 'Cities', path: '/cities', icon: MapPin },
      { name: 'Reviews', path: '/reviews', icon: Star },
      { name: 'Reports', path: '/reports', icon: AlertTriangle },
    ],
  },
  {
    title: 'Growth',
    items: [
      { name: 'Blogs', path: '/blogs', icon: FileText },
      { name: 'Marketing', path: '/marketing', icon: Megaphone },
      { name: 'Notifications', path: '/notifications', icon: Bell },
    ],
  },
  {
    title: 'System',
    items: [{ name: 'Settings', path: '/settings', icon: SettingsIcon }],
  },
];

const COLLAPSE_KEY = 'msm_sidebar_collapsed';

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(() => localStorage.getItem(COLLAPSE_KEY) === '1');

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) logout();
  };

  // Shared classes for a nav row, adapting to the collapsed (icon-only) rail.
  const rowBase = `group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${collapsed ? 'lg:justify-center lg:px-0' : ''}`;
  const labelCls = collapsed ? 'lg:hidden' : '';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden backdrop-blur-xs"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/60 bg-white/90 p-4 shadow-panel backdrop-blur transition-all duration-300 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 lg:self-start ${
          collapsed ? 'lg:w-20' : 'lg:w-72'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header: logo + collapse / close */}
        <div className={`flex items-center justify-between ${collapsed ? 'lg:justify-center' : ''}`}>
          <NavLink to="/" onClick={onClose} className={`flex items-center ${collapsed ? 'lg:hidden' : ''}`}>
            <img src="/Myslotmate-Logo.png" alt="MySlotMate" className="h-9 w-auto" />
          </NavLink>

          {/* Desktop collapse / expand toggle */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden h-9 w-9 items-center justify-center rounded-xl border border-brand-100 text-slate-500 transition hover:border-brand-300 hover:text-brand-700 lg:inline-flex cursor-pointer"
            type="button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>

          {/* Mobile close */}
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-brand-100 text-slate-500 lg:hidden cursor-pointer"
            type="button"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-5 flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-1">
          {SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className={`px-3 pt-3 pb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 ${labelCls}`}>
                {section.title}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={onClose}
                    title={collapsed ? item.name : undefined}
                    className={({ isActive }) =>
                      `${rowBase} ${
                        isActive
                          ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                          : 'text-slate-500 hover:bg-brand-50 hover:text-brand-700'
                      }`
                    }
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <span className={labelCls}>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer: log out */}
        <div className="mt-3 border-t border-slate-100 pt-3">
          <button
            onClick={handleLogout}
            title={collapsed ? 'Log out' : undefined}
            className={`${rowBase} w-full text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer`}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span className={labelCls}>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
