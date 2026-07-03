export interface User {
  id: string;
  name: string;
  email: string;
  city: string;
  totalBookings: number;
  totalSpent: number;
  joinDate: string;
  status: 'Active' | 'Watchlist' | 'Suspended' | 'VIP';
}

export type HostApplicationStatus = 'draft' | 'pending' | 'under_review' | 'approved' | 'rejected';

export interface Host {
  id?: string;
  name: string;
  city: string;
  socialFollowers: string;
  experiencesCreated: number;
  bookingsGenerated: number;
  averageRating: number;
  revenueGenerated: number;
  verificationStatus: 'Verified' | 'Pending review' | 'Re-verification' | 'Suspended';
  applicationStatus?: HostApplicationStatus;
}

export interface Experience {
  id: string;
  title: string;
  hostName: string;
  city: string;
  category: string;
  price: number;
  bookings: number;
  rating: number;
  status: 'Approved' | 'Pending approval' | 'Featured' | 'Suspended';
}

export interface Booking {
  bookingId: string;
  user: string;
  experience: string;
  host: string;
  city: string;
  date: string;
  amount: number;
  paymentStatus: 'Paid' | 'Pending' | 'Refunded';
  bookingStatus: 'Confirmed' | 'Awaiting confirmation' | 'Cancelled';
}

export interface CityData {
  name: string;
  users: number;
  hosts: number;
  experiences: number;
  bookings: number;
  revenue: number;
}

export interface Review {
  reviewId: string;
  user: string;
  experience: string;
  rating: number;
  reviewText: string;
  date: string;
  status: 'Published' | 'Needs review' | 'Flagged';
}

export interface Report {
  reportId: string;
  reportedBy: string;
  reporterType: 'User' | 'Host' | 'Trust & safety';
  experience: string;
  issueType: string;
  status: 'Investigating' | 'In follow-up' | 'Resolved' | 'Open';
  date: string;
}

export interface Blog {
  id: string;
  title: string;
  description: string | null;
  category: string;
  content: string;
  cover_image_url: string | null;
  author_id: string;
  author_name: string;
  read_time_minutes: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  name: string;
  audience: string;
  channel: string;
  spend: number;
  bookings: number;
  roas: string;
  status: 'Running' | 'Scheduled' | 'Completed';
}

export interface NotificationBroadcast {
  id: string;
  title: string;
  message: string;
  audience: string;
  city: string;
  scheduleTime: string;
  status: 'Scheduled' | 'Queued' | 'Sent';
}

export interface AdminRole {
  name: string;
  role: string;
  scope: string;
  lastActive: string;
  status: 'Active' | 'Online earlier';
}
