import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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

  const field =
    'flex items-center gap-3 rounded-2xl border border-white/10 bg-[#121426] px-4 transition focus-within:border-[#B57BFF]';
  const input =
    'row-input w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-white/30';

  return (
    <div className="msm-dark relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[#7B2FFF]/25 blur-[140px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-10%] bottom-[-20%] h-[420px] w-[420px] rounded-full bg-[#B724EA]/15 blur-[140px]"
      />

      <div className="relative z-10 w-full max-w-md rounded-[28px] border border-white/10 bg-[#121426]/80 p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <div className="mb-8 text-center">
          <img
            src="/brand/logo-horizontal-white.png"
            alt="MySlotMate"
            className="mx-auto h-10 w-auto"
          />
          <h1 className="font-outfit mt-7 text-2xl font-bold text-white">Admin console</h1>
          <p className="mt-2 text-sm text-white/50">
            Sign in to manage experiences, hosts, bookings and payouts.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm text-white/60" htmlFor="email">
              Email
            </label>
            <div className={field}>
              <Mail className="h-4 w-4 shrink-0 text-white/40" />
              <input
                id="email"
                type="email"
                autoComplete="username"
                className={input}
                placeholder="admin@myslotmate.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/60" htmlFor="password">
              Password
            </label>
            <div className={field}>
              <KeyRound className="h-4 w-4 shrink-0 text-white/40" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className={input}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <Button
            variant="primary"
            type="submit"
            className="mt-2 w-full justify-center py-3.5"
            isLoading={loading}
          >
            Sign in
          </Button>
        </form>

        <p className="mt-6 border-t border-white/[0.06] pt-5 text-center text-xs text-white/35">
          Restricted to MySlotMate staff. Sign-in attempts are logged.
        </p>
      </div>
    </div>
  );
};
