import React, { useState } from 'react';
import { useMockData } from '../../context/MockDataContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const NotificationsComposer: React.FC = () => {
  const { notifications, setNotifications } = useMockData();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('All users');
  const [city, setCity] = useState('All cities');
  const [scheduleTime, setScheduleTime] = useState('');

  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      alert('Notification Title and Message Body are required.');
      return;
    }

    const newNotif = {
      id: `NOTIF-${String(notifications.length + 1).padStart(3, '0')}`,
      title,
      message,
      audience,
      city,
      scheduleTime: scheduleTime ? new Date(scheduleTime).toLocaleString() : 'Immediate send queue',
      status: scheduleTime ? 'Scheduled' as const : 'Queued' as const
    };

    setNotifications(prev => [newNotif, ...prev]);
    setTitle('');
    setMessage('');
    setScheduleTime('');
    alert(`Notification scheduled for ${newNotif.audience}!`);
  };

  const handleSendTest = () => {
    if (!title || !message) {
      alert('Please fill out title and message to trigger a test send.');
      return;
    }
    alert(`Test push announcement dispatched to Super Admin Aarav Sharma's device:\n\nTitle: ${title}\nBody: ${message}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-700">Notifications</p>
          <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            Send targeted announcements to users, hosts, or specific city segments.
          </h3>
        </div>
        <Button variant="secondary" onClick={() => alert('Opening push transmission analytics logs...')}>
          View notification history
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Form Composer */}
        <form onSubmit={handleSchedule} className="rounded-3xl border border-brand-100/80 bg-white/95 shadow-soft backdrop-blur-md space-y-4 p-6">
          <div>
            <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="notifTitle">Title</label>
            <input 
              id="notifTitle" 
              className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" 
              type="text" 
              placeholder="e.g. Weekend launch: creative sessions in Delhi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          
          <div>
            <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="notifMsg">Message</label>
            <textarea 
              id="notifMsg" 
              className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400 min-h-[160px]" 
              placeholder="Share the announcement details you want to broadcast..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="notifAudience">Audience</label>
              <select 
                id="notifAudience" 
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              >
                <option>All users</option>
                <option>Repeat bookers</option>
                <option>New users</option>
                <option>Hosts</option>
                <option>Suspended hosts</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="notifCity">City targeting</label>
              <select 
                id="notifCity" 
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option>All cities</option>
                <option>Delhi</option>
                <option>Mumbai</option>
                <option>Bengaluru</option>
                <option>Jaipur</option>
                <option>Goa</option>
                <option>Kolkata</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="notifTime">Schedule time</label>
            <input 
              id="notifTime" 
              className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" 
              type="datetime-local" 
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="primary" type="submit">
              Schedule notification
            </Button>
            <Button variant="secondary" type="button" onClick={handleSendTest}>
              Send test
            </Button>
          </div>
        </form>

        {/* Upcoming Sends queue */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-ink">Upcoming sends</h3>
          <p className="text-xs text-mist mt-1 mb-5">Broadcast campaigns awaiting scheduler deployment.</p>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {notifications.map((notif) => (
              <div key={notif.id} className="rounded-2xl border border-brand-100 bg-slate-50 p-4 transition hover:bg-slate-100/50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-sm text-ink">{notif.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Audience: {notif.audience} ({notif.city})
                    </p>
                  </div>
                  <Badge color={notif.status === 'Scheduled' ? 'blue' : 'green'}>
                    {notif.status}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-slate-600 line-clamp-2">{notif.message}</p>
                <p className="mt-3 text-[11px] font-bold text-brand-600 uppercase tracking-wider">
                  ⏱ {notif.scheduleTime}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
