// Shapes of the JSON the API returns (column names match the database).

export type Role = "guest" | "owner" | "admin";

export type User = { id: number; name: string; email: string; role: Role };

export type IstirahaCard = {
  id: number;
  name_en: string;
  name_ar: string;
  city: string;
  district: string;
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
