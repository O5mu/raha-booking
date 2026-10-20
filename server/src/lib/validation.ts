import { z } from "zod";
import { isValidDate } from "./dates.js";

export const CITIES = ["riyadh", "jeddah", "dammam", "khobar", "alahsa", "abha", "taif"] as const;

export const AMENITIES = [
  "pool", "kids_pool", "majlis", "football", "volleyball", "bbq", "firepit", "tent",
  "garden", "kids_area", "kitchen", "ac", "wifi", "sound_system", "parking",
] as const;

export const dateString = z.string().refine(isValidDate, "Use a real date in YYYY-MM-DD format");

// Route params like /istirahas/:id arrive as strings.
export const idParam = z.coerce.number().int().positive();
