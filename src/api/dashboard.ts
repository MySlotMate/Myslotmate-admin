// Dashboard summary counts. This is the shape the dedicated count API will
// return. The endpoint itself is wired after UI approval.

import { apiFetch } from './client';

export interface MonthlyBookingPoint {
  month: string; // e.g. "Jan" or "2026-01"
  count: number;
}

export interface RecentBooking {
  id: string;
  user: string;
  experience: string;
  amount: number; // ₹
  date: string;   // display string (e.g. "2h ago" / "05 Jun 2026")
  status: string; // Confirmed | Pending | Cancelled | Refunded
}

// Counts of items needing admin action (each links to its tab).
export interface DashboardAttention {
  pendingHosts: number;     // host applications awaiting review
  reviewEvents: number;     // draft + paused events
  refundsToReview: number;  // refunded / cancelled bookings to reconcile
}

export interface TopHost {
  id: string;
  name: string;
  city: string;
  revenue: number; // net revenue (₹)
}

export interface TopExperience {
  id: string;
  title: string;
  hostName: string;
  bookings: number;
}

export interface DashboardStats {
  totalEvents: number;
  totalHosts: number;
  totalBookings: number;
  totalRevenue: number;    // gross booking value collected (₹)
  platformIncome: number;  // platform's net income / service fees (₹)
  monthlyBookings: MonthlyBookingPoint[];
  recentBookings: RecentBooking[];
  attention: DashboardAttention;
  topHosts: TopHost[];
  topExperiences: TopExperience[];
}

// Planned dedicated count endpoint — enabled after the UI is approved.
export function fetchDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>('/admin/dashboard/stats');
}
