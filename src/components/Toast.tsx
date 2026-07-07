// Renders the toast stack pushed via src/lib/toast.ts. A page renders this
// once (typically at the end of its tree).

import { useEffect, useState } from 'react';
import { FiCheckCircle, FiAlertCircle, FiX } from 'react-icons/fi';
import { subscribeToToasts, dismissToast } from '../lib/toast';
import type { ToastItem } from '../lib/toast';

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToToasts(setItems), []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex w-full max-w-sm flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg ${
            t.kind === 'success' ? 'border-emerald-200' : 'border-rose-200'
          }`}
        >
          {t.kind === 'success' ? (
            <FiCheckCircle className="mt-0.5 shrink-0 text-emerald-500" size={18} />
          ) : (
            <FiAlertCircle className="mt-0.5 shrink-0 text-rose-500" size={18} />
          )}
          <p className="flex-1 whitespace-pre-line text-sm font-medium text-gray-800">
            {t.message}
          </p>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            className="shrink-0 rounded p-0.5 text-gray-400 transition hover:text-gray-600"
          >
            <FiX size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
