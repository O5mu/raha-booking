// Shapes of the JSON the API returns (column names match the database).

export type Role = "guest" | "owner" | "admin";

export type User = { id: number; name: string; email: string; role: Role };

export type IstirahaCard = {
  id: number;
  name_en: string;
  name_ar: string;
  city: string;
  district_en: string;
  district_ar: string;
  price_per_night: number;
  capacity: number;
  amenities: string[];
  cover_photo: string;
};

export type IstirahaDetails = Omit<IstirahaCard, "cover_photo"> & {
  description_en: string;
  description_ar: string;
  photos: string[];
  owner_name: string;
};

export type DateRange = { check_in: string; check_out: string };

export type SearchResponse = { total: number; page: number; pageSize: number; results: IstirahaCard[] };

export type Booking = {
  id: number;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  status: "confirmed" | "cancelled";
  created_at: string;
  istiraha_id: number;
  name_en: string;
  name_ar: string;
  city: string;
  cover_photo: string;
};

export type ListingStatus = "pending" | "approved" | "rejected" | "hidden";

export type OwnerIstiraha = IstirahaDetails & {
  owner_id: number;
  status: ListingStatus;
  upcoming_bookings: number;
};

export type OwnerBooking = {
  id: number;
  kind: "booking" | "block";
  check_in: string;
  check_out: string;
  guests: number | null;
  total_price: number;
  status: "confirmed" | "cancelled";
  istiraha_id: number;
  name_en: string;
  name_ar: string;
  guest_name: string;
};

export type CalendarEntry = {
  id: number;
  kind: "booking" | "block";
  check_in: string;
  check_out: string;
  guests: number | null;
  guest_name: string;
};

export type AdminStats = {
  users: number;
  live_listings: number;
  pending_listings: number;
  confirmed_bookings: number;
  total_value: number;
};

export type AdminIstiraha = IstirahaCard & { status: ListingStatus; created_at: string; owner_name: string };

export type AdminUser = User & { created_at: string };

export type AdminBooking = {
  id: number;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  status: "confirmed" | "cancelled";
  created_at: string;
  name_en: string;
  name_ar: string;
  guest_name: string;
};
