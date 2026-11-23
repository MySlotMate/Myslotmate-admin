import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  ClipboardCheck,
  Compass,
  CalendarDays,
  Inbox,
  CreditCard,
  Receipt,
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
      { name: 'Host applications', path: '/host-applications', icon: ClipboardCheck },
      { name: 'Experiences', path: '/experiences', icon: Compass },
      { name: 'Bookings', path: '/bookings', icon: CalendarDays },
      { name: 'Join requests', path: '/join-requests', icon: Inbox },
      { name: 'Payments', path: '/payments', icon: CreditCard },
      { name: 'Billing', path: '/billing', icon: Receipt },
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
  const rowBase = `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
    collapsed ? 'lg:justify-center lg:px-0 lg:w-11 lg:mx-auto' : ''
  }`;
  const labelCls = collapsed ? 'lg:hidden' : '';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/[0.06] bg-[#0b0c1a]/95 p-3 backdrop-blur-xl transition-all duration-300 lg:sticky lg:top-0 lg:z-50 lg:h-screen lg:translate-x-0 lg:self-start ${
          collapsed ? 'lg:w-20' : 'lg:w-68'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header: logo + collapse / close */}
        <div className={`flex items-center justify-between border-b border-white/[0.06] pb-3 ${collapsed ? 'lg:flex-col lg:gap-3' : ''}`}>
          <NavLink to="/" onClick={onClose} className="flex items-center gap-2 px-1">
            <img
              src="/brand/logo-horizontal-white.png"
              alt="MySlotMate"
              className={`h-8 w-auto object-contain ${collapsed ? 'lg:hidden' : ''}`}
            />
            <img
              src="/brand/admin-mark.png"
              alt="MySlotMate"
              className={`hidden h-9 w-9 rounded-xl object-contain ${collapsed ? 'lg:block' : ''}`}
            />
          </NavLink>

          {/* Desktop collapse / expand toggle */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/50 transition-all hover:bg-white/[0.06] hover:text-white lg:inline-flex cursor-pointer relative group"
            type="button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {collapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex items-center px-3 py-1.5 rounded-xl border border-white/10 bg-[#14152a] text-white text-xs font-semibold whitespace-nowrap shadow-panel z-50 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#14152a]" />
                Expand sidebar
              </div>
            )}
          </button>

          {/* Mobile close */}
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/60 lg:hidden cursor-pointer"
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
              <p className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30 ${labelCls}`}>
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
                          ? 'bg-gradient-to-r from-[#7038F5] to-[#B724EA] text-white shadow-[0_8px_24px_-8px_rgba(183,36,234,0.6)]'
                          : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className={labelCls}>{item.name}</span>

                    {/* Floating Tooltip when Collapsed */}
                    {collapsed && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex items-center px-3 py-1.5 rounded-xl border border-white/10 bg-[#14152a] text-white text-xs font-semibold whitespace-nowrap shadow-panel z-50 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#14152a]" />
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
        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <button
            onClick={handleLogout}
            className={`${rowBase} w-full text-rose-300/80 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={labelCls}>Log out</span>

            {/* Floating Tooltip when Collapsed */}
            {collapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex items-center px-3 py-1.5 rounded-xl border border-white/10 bg-[#14152a] text-white text-xs font-semibold whitespace-nowrap shadow-panel z-50 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#14152a]" />
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
