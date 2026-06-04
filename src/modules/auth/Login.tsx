import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ApiError } from '../../api/client';
import { KeyRound, Mail, ShieldAlert } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@myslotmate.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const username = email.trim();
    if (!username) {
      setError('Please enter your administrator email or username.');
      return;
    }
    if (!password) {
      setError('Please enter your access token / password.');
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        // 401 → wrong credentials; 0 → network; otherwise surface the server message.
        setError(err.status === 401 ? 'Invalid administrative credentials.' : err.message);
      } else {
        setError('An error occurred during verification.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-shell bg-halo relative overflow-hidden">
      {/* Background radial accent halos */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-brand-400/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-sky-400/15 blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md p-8 bg-white/90 shadow-panel border border-brand-100/50 backdrop-blur z-10">
        <div className="text-center mb-8">
          <img src="/Myslotmate-Logo.png" alt="MySlotMate Logo" className="h-12 w-auto mx-auto mb-4" />
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-700 mt-2">Control Console</p>
          <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink">
            Admin Authentication
          </h2>
          <p className="mt-2 text-xs text-mist leading-relaxed">
            Enter your internal credentials to manage hosts, reviews, payouts, and city marketplace operations.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-start gap-3 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-xs font-semibold text-rose-700">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="email">
              Admin Email
            </label>
            <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 shadow-sm">
              <Mail className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                id="email"
                type="email"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                placeholder="admin@myslotmate.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="password">
              Access Token / Password
            </label>
            <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 shadow-sm">
              <KeyRound className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                id="password"
                type="password"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <Button variant="primary" type="submit" className="w-full justify-center mt-3 py-3" disabled={loading}>
            {loading ? 'Authenticating Access...' : 'Verify & Enter'}
          </Button>
        </form>

        <div className="mt-6 text-center border-t border-slate-100 pt-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Secure administrative zone
          </p>
          <p className="mt-2 text-[10px] text-slate-400 leading-normal">
            Unauthorized access attempts are logged and reported to the system safety administrators.
          </p>
        </div>
      </Card>
    </div>
  );
};
