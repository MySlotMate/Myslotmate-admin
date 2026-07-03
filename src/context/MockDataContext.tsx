import React, { createContext, useContext, useState } from 'react';
import type { 
  User, 
  Host, 
  Experience, 
  Booking, 
  CityData, 
  Review, 
  Report, 
  Campaign, 
  NotificationBroadcast, 
  AdminRole 
} from '../types';

interface MockDataContextType {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  hosts: Host[];
  setHosts: React.Dispatch<React.SetStateAction<Host[]>>;
  experiences: Experience[];
  setExperiences: React.Dispatch<React.SetStateAction<Experience[]>>;
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  cities: CityData[];
  setCities: React.Dispatch<React.SetStateAction<CityData[]>>;
  reviews: Review[];
  setReviews: React.Dispatch<React.SetStateAction<Review[]>>;
  reports: Report[];
  setReports: React.Dispatch<React.SetStateAction<Report[]>>;
  campaigns: Campaign[];
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
  notifications: NotificationBroadcast[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationBroadcast[]>>;
  adminRoles: AdminRole[];
  setAdminRoles: React.Dispatch<React.SetStateAction<AdminRole[]>>;
  commission: number;
  setCommission: (val: number) => void;
  payoutSchedule: string;
  setPayoutSchedule: (val: string) => void;
  instantHostApprovals: boolean;
  setInstantHostApprovals: (val: boolean) => void;
  dynamicPricing: boolean;
  setDynamicPricing: (val: boolean) => void;
  waitlistMode: boolean;
  setWaitlistMode: (val: boolean) => void;
}

const MockDataContext = createContext<MockDataContextType | undefined>(undefined);

export const MockDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Users state
  const [users, setUsers] = useState<User[]>([
    { id: 'USR-10012', name: 'Riya Mehra', email: 'riya.mehra@myslotmail.com', city: 'Jaipur', totalBookings: 14, totalSpent: 612, joinDate: '12 Jan 2025', status: 'Active' },
    { id: 'USR-10045', name: 'Marcus Lee', email: 'marcus.lee@myslotmail.com', city: 'Bengaluru', totalBookings: 9, totalSpent: 418, joinDate: '03 Mar 2025', status: 'Active' },
    { id: 'USR-10201', name: 'Fatima Khan', email: 'fatima.khan@myslotmail.com', city: 'Mumbai', totalBookings: 22, totalSpent: 1046, joinDate: '28 Nov 2024', status: 'VIP' },
    { id: 'USR-10319', name: 'Rahul Joshi', email: 'rahul.joshi@myslotmail.com', city: 'Delhi', totalBookings: 3, totalSpent: 91, joinDate: '17 Feb 2026', status: 'Watchlist' },
    { id: 'USR-10344', name: 'Anika Bose', email: 'anika.bose@myslotmail.com', city: 'Kolkata', totalBookings: 1, totalSpent: 28, joinDate: '03 Apr 2026', status: 'Active' },
    { id: 'USR-09872', name: 'Noah Carter', email: 'noah.carter@myslotmail.com', city: 'Goa', totalBookings: 6, totalSpent: 252, joinDate: '21 Oct 2025', status: 'Suspended' },
  ]);

  // 2. Hosts state
  const [hosts, setHosts] = useState<Host[]>([
    { name: 'Kabir Sethi', city: 'Jaipur', socialFollowers: '128k', experiencesCreated: 12, bookingsGenerated: 824, averageRating: 4.9, revenueGenerated: 48400, verificationStatus: 'Verified' },
    { name: 'Ananya Rao', city: 'Bengaluru', socialFollowers: '86k', experiencesCreated: 8, bookingsGenerated: 612, averageRating: 4.8, revenueGenerated: 34920, verificationStatus: 'Verified' },
    { name: 'Maya Fernandes', city: 'Mumbai', socialFollowers: '214k', experiencesCreated: 5, bookingsGenerated: 441, averageRating: 4.7, revenueGenerated: 29760, verificationStatus: 'Pending review' },
    { name: 'Zoya Ali', city: 'Delhi', socialFollowers: '59k', experiencesCreated: 9, bookingsGenerated: 558, averageRating: 4.8, revenueGenerated: 26310, verificationStatus: 'Verified' },
    { name: 'Dev Malhotra', city: 'Kolkata', socialFollowers: '44k', experiencesCreated: 4, bookingsGenerated: 176, averageRating: 4.5, revenueGenerated: 11280, verificationStatus: 'Re-verification' },
  ]);

  // 3. Experiences state
  const [experiences, setExperiences] = useState<Experience[]>([
    { id: 'EXP-501', title: 'Dawn Heritage Walk', hostName: 'Kabir Sethi', city: 'Jaipur', category: 'City Walk', price: 46, bookings: 194, rating: 4.9, status: 'Approved' },
    { id: 'EXP-502', title: 'Clay & Chai Studio Night', hostName: 'Ananya Rao', city: 'Bengaluru', category: 'Workshop', price: 58, bookings: 121, rating: 4.8, status: 'Approved' },
    { id: 'EXP-503', title: 'Sea Breeze Sound Bath', hostName: 'Maya Fernandes', city: 'Mumbai', category: 'Wellness', price: 72, bookings: 83, rating: 4.7, status: 'Pending approval' },
    { id: 'EXP-504', title: 'Old Delhi Food Stories', hostName: 'Zoya Ali', city: 'Delhi', category: 'Food & community', price: 39, bookings: 214, rating: 4.9, status: 'Featured' },
    { id: 'EXP-505', title: 'Monsoon Film Photography Walk', hostName: 'Dev Malhotra', city: 'Kolkata', category: 'Creative activities', price: 51, bookings: 56, rating: 4.5, status: 'Suspended' },
  ]);

  // 4. Bookings state
  const [bookings, setBookings] = useState<Booking[]>([
    { bookingId: 'BK-20491', user: 'Riya Mehra', experience: 'Dawn Heritage Walk', host: 'Kabir Sethi', city: 'Jaipur', date: '14 Apr 2026', amount: 46, paymentStatus: 'Paid', bookingStatus: 'Confirmed' },
    { bookingId: 'BK-20487', user: 'Marcus Lee', experience: 'Clay & Chai Studio Night', host: 'Ananya Rao', city: 'Bengaluru', date: '15 Apr 2026', amount: 58, paymentStatus: 'Paid', bookingStatus: 'Confirmed' },
    { bookingId: 'BK-20475', user: 'Fatima Khan', experience: 'Sea Breeze Sound Bath', host: 'Maya Fernandes', city: 'Mumbai', date: '17 Apr 2026', amount: 72, paymentStatus: 'Pending', bookingStatus: 'Awaiting confirmation' },
    { bookingId: 'BK-20458', user: 'Priya Anand', experience: 'Monsoon Film Photography Walk', host: 'Dev Malhotra', city: 'Kolkata', date: '11 Apr 2026', amount: 51, paymentStatus: 'Refunded', bookingStatus: 'Cancelled' },
    { bookingId: 'BK-20441', user: 'Anika Bose', experience: 'Sunset Weaving Circle', host: 'Nidhi Kapoor', city: 'Goa', date: '18 Apr 2026', amount: 64, paymentStatus: 'Paid', bookingStatus: 'Confirmed' },
  ]);

  // 5. Cities state
  const [cities, setCities] = useState<CityData[]>([
    { name: 'Delhi', users: 18420, hosts: 318, experiences: 844, bookings: 3492, revenue: 126200 },
    { name: 'Mumbai', users: 15106, hosts: 274, experiences: 692, bookings: 2986, revenue: 118480 },
    { name: 'Bengaluru', users: 13992, hosts: 241, experiences: 618, bookings: 2731, revenue: 102740 },
    { name: 'Jaipur', users: 8114, hosts: 172, experiences: 426, bookings: 1664, revenue: 61320 },
    { name: 'Goa', users: 6202, hosts: 119, experiences: 284, bookings: 1143, revenue: 52960 },
    { name: 'Kolkata', users: 5884, hosts: 101, experiences: 251, bookings: 936, revenue: 39860 },
  ]);

  // 6. Reviews state
  const [reviews, setReviews] = useState<Review[]>([
    { reviewId: 'RV-8002', user: 'Riya Mehra', experience: 'Dawn Heritage Walk', rating: 5.0, reviewText: 'Thoughtful pacing, beautiful local stories, and the host made the group feel instantly comfortable.', date: '12 Apr 2026', status: 'Published' },
    { reviewId: 'RV-8007', user: 'Rahul Joshi', experience: 'Sea Breeze Sound Bath', rating: 2.0, reviewText: 'Session started late and the venue details were unclear. Guest support followed up after the booking.', date: '11 Apr 2026', status: 'Needs review' },
    { reviewId: 'RV-8014', user: 'Marcus Lee', experience: 'Clay & Chai Studio Night', rating: 5.0, reviewText: 'Warm facilitation, well designed materials, and genuinely memorable. Already booked a second workshop.', date: '10 Apr 2026', status: 'Published' },
    { reviewId: 'RV-8018', user: 'Anonymous', experience: 'Monsoon Film Photography Walk', rating: 1.0, reviewText: 'Content appears duplicated from another profile and includes abusive phrasing toward the host.', date: '09 Apr 2026', status: 'Flagged' },
  ]);

  // 7. Reports state
  const [reports, setReports] = useState<Report[]>([
    { reportId: 'RP-341', reportedBy: 'Priya Anand', reporterType: 'User', experience: 'Monsoon Film Photography Walk', issueType: 'Misleading listing details', status: 'Investigating', date: '11 Apr 2026' },
    { reportId: 'RP-338', reportedBy: 'Host support team', reporterType: 'Host', experience: 'Sea Breeze Sound Bath', issueType: 'Late venue confirmation', status: 'In follow-up', date: '10 Apr 2026' },
    { reportId: 'RP-334', reportedBy: 'Marcus Lee', reporterType: 'User', experience: 'Clay & Chai Studio Night', issueType: 'Payment receipt issue', status: 'Resolved', date: '08 Apr 2026' },
    { reportId: 'RP-327', reportedBy: 'Trust & safety', reporterType: 'Host', experience: 'Old Delhi Food Stories', issueType: 'Background verification refresh', status: 'Open', date: '06 Apr 2026' },
  ]);

  // 9. Campaigns state
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    { name: 'Weekend wellness in Mumbai', audience: 'Lapsed users', channel: 'Email + push', spend: 4200, bookings: 284, roas: '4.1x', status: 'Running' },
    { name: 'Jaipur city walks launch', audience: 'New users', channel: 'Meta ads', spend: 6100, bookings: 342, roas: '3.7x', status: 'Running' },
    { name: 'Creative nights collection', audience: 'Repeat bookers', channel: 'In-app banner', spend: 1400, bookings: 118, roas: '5.2x', status: 'Scheduled' },
  ]);

  // 10. Notifications state
  const [notifications, setNotifications] = useState<NotificationBroadcast[]>([
    { id: 'NOTIF-001', title: 'Mumbai wellness weekend collection', message: 'A curated set of sound baths and workshops in Mumbai.', audience: 'Repeat bookers', city: 'Mumbai', scheduleTime: '14 Apr 2026, 10:30 AM', status: 'Scheduled' },
    { id: 'NOTIF-002', title: 'Host payout reminder', message: 'Please submit any pending tax documentation before Friday payout cycles.', audience: 'All verified hosts', city: 'All cities', scheduleTime: '15 Apr 2026, 08:00 AM', status: 'Queued' },
  ]);

  // 11. Admin roles state
  const [adminRoles, setAdminRoles] = useState<AdminRole[]>([
    { name: 'Aarav Sharma', role: 'Super Admin', scope: 'Global', lastActive: '13 Apr 2026, 11:42', status: 'Active' },
    { name: 'Naina Kapoor', role: 'Finance Admin', scope: 'Payments + settlements', lastActive: '13 Apr 2026, 09:18', status: 'Active' },
    { name: 'Harsh Vardhan', role: 'Trust & Safety', scope: 'Reports + reviews', lastActive: '12 Apr 2026, 18:04', status: 'Online earlier' },
    { name: 'Mira D\'Souza', role: 'City Ops Lead', scope: 'Mumbai + Goa', lastActive: '12 Apr 2026, 16:27', status: 'Active' },
  ]);

  // 12. Settings variables
  const [commission, setCommissionState] = useState(19.6);
  const [payoutSchedule, setPayoutScheduleState] = useState('Weekly on Friday');
  const [instantHostApprovals, setInstantHostApprovalsState] = useState(false);
  const [dynamicPricing, setDynamicPricingState] = useState(true);
  const [waitlistMode, setWaitlistModeState] = useState(true);

  const setCommission = (val: number) => setCommissionState(val);
  const setPayoutSchedule = (val: string) => setPayoutScheduleState(val);
  const setInstantHostApprovals = (val: boolean) => setInstantHostApprovalsState(val);
  const setDynamicPricing = (val: boolean) => setDynamicPricingState(val);
  const setWaitlistMode = (val: boolean) => setWaitlistModeState(val);

  return (
    <MockDataContext.Provider value={{
      users, setUsers,
      hosts, setHosts,
      experiences, setExperiences,
      bookings, setBookings,
      cities, setCities,
      reviews, setReviews,
      reports, setReports,
      campaigns, setCampaigns,
      notifications, setNotifications,
      adminRoles, setAdminRoles,
      commission, setCommission,
      payoutSchedule, setPayoutSchedule,
      instantHostApprovals, setInstantHostApprovals,
      dynamicPricing, setDynamicPricing,
      waitlistMode, setWaitlistMode
    }}>
      {children}
    </MockDataContext.Provider>
  );
};

export const useMockData = () => {
  const context = useContext(MockDataContext);
  if (!context) {
    throw new Error('useMockData must be used within a MockDataProvider');
  }
  return context;
};
