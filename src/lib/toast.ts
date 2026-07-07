// Minimal toast store for pages ported from the customer frontend (which uses
// sonner). `toast.success/error` pushes into a module-level stack; the
// <ToastHost/> component (src/components/Toast.tsx) renders it.

export interface ToastItem {
  id: number;
  kind: 'success' | 'error';
  message: string;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
let listeners: Listener[] = [];
let nextId = 1;

function emit() {
  for (const l of listeners) l(toasts);
}

function push(kind: ToastItem['kind'], message: string) {
  const id = nextId++;
  toasts = [...toasts, { id, kind, message }];
  emit();
  setTimeout(() => dismissToast(id), 5000);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function subscribeToToasts(listener: Listener): () => void {
  listeners.push(listener);
  listener(toasts);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
};
