// Lazily loads the Razorpay Checkout SDK and exposes a minimal typed surface.

let loadPromise: Promise<boolean> | null = null;

export function loadRazorpay(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => {
      loadPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return loadPromise;
}

export interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number; // paise
  currency: string;
  order_id: string;
  name?: string;
  description?: string;
  prefill?: { name?: string; contact?: string; email?: string };
  handler: (response: RazorpayHandlerResponse) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (resp: unknown) => void) => void;
}

export function openRazorpayCheckout(options: RazorpayOptions): RazorpayInstance {
  const RazorpayCtor = (window as unknown as {
    Razorpay: new (opts: RazorpayOptions) => RazorpayInstance;
  }).Razorpay;
  const rzp = new RazorpayCtor(options);
  rzp.open();
  return rzp;
}
