import React from 'react';
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
  LogOut 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { logout } = useAuth();
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Users', path: '/users', icon: Users },
    { name: 'Hosts', path: '/hosts', icon: UserCheck },
    { name: 'Experiences', path: '/experiences', icon: Compass },
    { name: 'Bookings', path: '/bookings', icon: CalendarDays },
    { name: 'Payments', path: '/payments', icon: CreditCard },
    { name: 'Cities', path: '/cities', icon: MapPin },
    { name: 'Reviews', path: '/reviews', icon: Star },
    { name: 'Reports', path: '/reports', icon: AlertTriangle },
    { name: 'Blogs', path: '/blogs', icon: FileText },
    { name: 'Marketing', path: '/marketing', icon: Megaphone },
    { name: 'Notifications', path: '/notifications', icon: Bell },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden backdrop-blur-xs"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-80 flex-col border-r border-white/60 bg-white/90 p-6 shadow-panel backdrop-blur transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-72 lg:translate-x-0 lg:self-start ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between">
          <NavLink to="/" onClick={onClose} className="flex items-center gap-2">
            <img src="/Myslotmate-Logo.png" alt="MySlotMate" className="h-10 w-auto" />
          </NavLink>
          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-100 text-slate-500 lg:hidden cursor-pointer"
            type="button"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>


        <nav className="mt-6 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => 
                  `flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${
                    isActive 
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25 hover:bg-brand-600 hover:text-white' 
                      : 'text-slate-500 hover:bg-brand-50 hover:text-brand-700'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to log out?')) {
                logout();
              }
            }}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer mt-4"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Log out</span>
          </button>
        </nav>
      </aside>
    </>
  );
};
