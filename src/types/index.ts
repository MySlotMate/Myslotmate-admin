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
  blogId: string;
  title: string;
  slug: string;
  author: string;
  category: string;
  status: 'Draft' | 'Published';
  publishedDate: string;
  views: number;
  description: string;
  content: string;
  tags: string;
  seoTitle: string;
  seoDescription: string;
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
