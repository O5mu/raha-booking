import {
  Baby, Beef, Car, ChefHat, Flame, Goal, Music, Snowflake, Sofa, Tent, ToyBrick, Trees, Volleyball, Waves, Wifi,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  pool: Waves,
  kids_pool: Baby,
  majlis: Sofa,
  football: Goal,
  volleyball: Volleyball,
  bbq: Beef,
  firepit: Flame,
  tent: Tent,
  garden: Trees,
  kids_area: ToyBrick,
  kitchen: ChefHat,
  ac: Snowflake,
  wifi: Wifi,
  sound_system: Music,
  parking: Car,
};

export function AmenityIcon({ name, size = "1.125rem" }: { name: string; size?: number | string }) {
  const Icon = ICONS[name] ?? Sofa;
  return <Icon size={size} aria-hidden="true" />;
}
