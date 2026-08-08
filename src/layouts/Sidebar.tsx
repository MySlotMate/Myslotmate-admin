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
  const rowBase = `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-200 ${
    collapsed ? 'lg:justify-center lg:px-0 lg:w-11 lg:mx-auto' : ''
  }`;
  const labelCls = collapsed ? 'lg:hidden' : '';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200/80 bg-white/95 p-2 shadow-panel backdrop-blur-md transition-all duration-300 lg:sticky lg:top-0 lg:z-50 lg:h-screen lg:translate-x-0 lg:self-start ${
          collapsed ? 'lg:w-20' : 'lg:w-68'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header: logo + collapse / close */}
        <div className={`flex items-center justify-between pb-2 border-b border-slate-100 ${collapsed ? 'lg:justify-center' : ''}`}>
          <NavLink to="/" onClick={onClose} className={`flex items-center gap-2 ${collapsed ? 'lg:hidden' : ''}`}>
            <img src="/Myslotmate-Logo.png" alt="MySlotMate" className="h-9 w-auto object-contain" />
          </NavLink>

          {/* Desktop collapse / expand toggle */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 lg:inline-flex cursor-pointer relative group"
            type="button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {collapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex items-center px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-extrabold whitespace-nowrap shadow-panel z-50 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                Expand sidebar
              </div>
            )}
          </button>

          {/* Mobile close */}
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 lg:hidden cursor-pointer"
            type="button"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className={`mt-4 flex-1 space-y-4 pr-0.5 ${collapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'}`}>
          {SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 ${labelCls}`}>
                {section.title}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `${rowBase} ${
                        isActive
                          ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md shadow-brand-500/20'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className={labelCls}>{item.name}</span>

                    {/* Floating Tooltip when Collapsed */}
                    {collapsed && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex items-center px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-extrabold whitespace-nowrap shadow-panel z-50 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                        {item.name}
                      </div>
                    )}
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
            className={`${rowBase} w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={labelCls}>Log out</span>

            {/* Floating Tooltip when Collapsed */}
            {collapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex items-center px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-extrabold whitespace-nowrap shadow-panel z-50 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                Log out
              </div>
            )}
          </button>
        </div>

        {/* Right edge border click region - click border to collapse/expand sidebar */}
        <div
          onClick={() => {
            if (window.innerWidth < 1024) {
              onClose();
            } else {
              setCollapsed((c) => !c);
            }
          }}
          className="absolute -right-1 top-0 bottom-0 w-3 cursor-pointer z-30"
          title={collapsed ? "Expand side menu" : "Collapse side menu"}
          aria-label={collapsed ? "Expand side menu" : "Collapse side menu"}
        />
      </aside>
    </>
  );
};
