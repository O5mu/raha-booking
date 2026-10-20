// Demo data for Raha. Photos are free Unsplash images (see README credits).

const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`;

const POOLS = [
  "1613977257365-aaae5a9817ff", "1613490493576-7fde63acd811", "1596178067639-5c6e68aea6dc",
  "1582610116397-edb318620f90", "1416331108676-a22ccb276e35", "1721989519334-40923a0ee1c0",
  "1675657144361-98ae33e6b6f9", "1692736933760-8a8a9b8c1b6f", "1721989518229-3e84837fc398",
  "1720161263981-84281892ee4b", "1651108066220-f61c22fc281f", "1692736933732-ad902fc34626",
  "1668957065301-bc8cc8691c5f", "1694967832949-09984640b143", "1782203601219-c772fac676dc",
  "1710046385385-a37df445b619", "1711110065992-6d6aff9ae35c", "1770306924890-cee53fab5871",
  "1711110066231-cb235d6e117e", "1789593847377-a0452ab3f3c9", "1763479142280-675629f6db27",
  "1786175087770-57c9e7866e4b", "1711110065954-1c79c1dec505",
];
const SEATING = [
  "1762608675427-09ac2dbd1540", "1760304979421-49e6f667774c", "1783474845801-6f57286c9f66",
  "1783474845801-6f57286c9f66", "1781285909142-b335421c2fdb", "1720161130694-18337559ab7b",
  "1759143201153-948b3d535c49",
];
const CAMPS = ["1734942439222-6452df2fd480", "1682688759157-57988e10ffa8", "1734942388846-e2fed793a9ad"];

// Picks a hero photo plus two more, rotating through the lists so listings look different.
function photosFor(i: number, camp = false): string[] {
  const hero = camp ? CAMPS[i % CAMPS.length] : POOLS[i % POOLS.length];
  return [hero, POOLS[(i + 7) % POOLS.length], SEATING[i % SEATING.length]].map(img);
}

export const DEMO_PASSWORD = "demo1234";

export const users = [
  { key: "guest", name: "Demo Guest", email: "guest@raha.demo", role: "guest" },
  { key: "owner", name: "Demo Owner", email: "owner@raha.demo", role: "owner" },
  { key: "admin", name: "Demo Admin", email: "admin@raha.demo", role: "admin" },
  { key: "owner2", name: "Khalid Al-Harbi", email: "khalid@raha.demo", role: "owner" },
  { key: "owner3", name: "Noura Al-Qahtani", email: "noura@raha.demo", role: "owner" },
  { key: "g1", name: "Abdullah Al-Shehri", email: "abdullah@raha.demo", role: "guest" },
  { key: "g2", name: "Sara Al-Dosari", email: "sara@raha.demo", role: "guest" },
  { key: "g3", name: "Faisal Al-Mutairi", email: "faisal@raha.demo", role: "guest" },
  { key: "g4", name: "Reem Al-Zahrani", email: "reem@raha.demo", role: "guest" },
  { key: "g5", name: "Turki Al-Anazi", email: "turki@raha.demo", role: "guest" },
] as const;

export type UserKey = (typeof users)[number]["key"];

type Listing = {
  owner: UserKey;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  city: string;
  district_en: string;
  district_ar: string;
  price: number;
  capacity: number;
  amenities: string[];
  status?: "approved" | "pending";
  camp?: boolean;
};

const listings: Listing[] = [
  // Riyadh
  {
    owner: "owner", city: "riyadh", district_en: "Al Ammariyah", district_ar: "العمارية", price: 1200, capacity: 40,
    name_en: "Al Nakheel Istiraha", name_ar: "استراحة النخيل",
    description_en: "A family istiraha among palm trees with a heated pool, a large majlis and a football pitch.",
    description_ar: "استراحة عائلية بين النخيل فيها مسبح مدفأ ومجلس كبير وملعب كورة.",
    amenities: ["pool", "majlis", "football", "bbq", "kitchen", "parking", "wifi"],
  },
  {
    owner: "owner", city: "riyadh", district_en: "Al Thumamah", district_ar: "الثمامة", price: 2200, capacity: 60,
    name_en: "Thumamah Desert Camp", name_ar: "مخيم الثمامة",
    description_en: "Traditional tents on the red sand dunes, a firepit for winter nights and space for big gatherings.",
    description_ar: "خيام تراثية على الرمل الأحمر، وشبة نار لليالي الشتاء، ومساحة للجمعات الكبيرة.",
    amenities: ["tent", "firepit", "majlis", "bbq", "parking", "sound_system"], camp: true,
  },
  {
    owner: "owner2", city: "riyadh", district_en: "Al Malqa", district_ar: "الملقا", price: 1800, capacity: 30,
    name_en: "Malqa Modern Chalet", name_ar: "شاليه الملقا الحديث",
    description_en: "A modern chalet in north Riyadh with an infinity pool, a kids' pool and a smart sound system.",
    description_ar: "شاليه حديث شمال الرياض فيه مسبح إنفينتي ومسبح أطفال ونظام صوت ذكي.",
    amenities: ["pool", "kids_pool", "sound_system", "ac", "wifi", "kitchen", "parking"],
  },
  {
    owner: "owner3", city: "riyadh", district_en: "Diriyah", district_ar: "الدرعية", price: 950, capacity: 25,
    name_en: "Diriyah Garden Rest", name_ar: "استراحة حدائق الدرعية",
    description_en: "A quiet garden istiraha near historic Diriyah, ideal for small family weekends.",
    description_ar: "استراحة هادية بحديقة قريبة من الدرعية التاريخية، مناسبة لويكند العايلة.",
    amenities: ["garden", "majlis", "bbq", "kids_area", "parking"],
  },
  {
    owner: "owner2", city: "riyadh", district_en: "Al Arid", district_ar: "العارض", price: 1500, capacity: 50,
    name_en: "Al Arid Sports Istiraha", name_ar: "استراحة العارض الرياضية",
    description_en: "Built for friends' nights: football and volleyball courts, a pool and a big outdoor majlis.",
    description_ar: "مصممة لطلعات الشباب: ملعب كورة وطايرة ومسبح ومجلس خارجي كبير.",
    amenities: ["pool", "football", "volleyball", "majlis", "bbq", "sound_system", "parking"],
  },
  // Al Ahsa
  {
    owner: "owner", city: "alahsa", district_en: "Al Mubarraz", district_ar: "المبرز", price: 700, capacity: 30,
    name_en: "Oasis Farm Istiraha", name_ar: "استراحة مزرعة الواحة",
    description_en: "A farm istiraha in the heart of the Al Ahsa oasis, surrounded by date palms.",
    description_ar: "استراحة مزرعة في قلب واحة الأحساء، محاطة بنخيل التمر.",
    amenities: ["pool", "garden", "majlis", "bbq", "kids_area", "parking"],
  },
  {
    owner: "owner3", city: "alahsa", district_en: "Al Hofuf", district_ar: "الهفوف", price: 850, capacity: 35,
    name_en: "Hofuf Family Chalet", name_ar: "شاليه الهفوف العائلي",
    description_en: "A private family chalet with a covered pool, so it is usable all year round.",
    description_ar: "شاليه عائلي خاص بمسبح مغطى، ينفع طول السنة.",
    amenities: ["pool", "kids_pool", "ac", "kitchen", "wifi", "parking"],
  },
  {
    owner: "owner2", city: "alahsa", district_en: "Al Uyun", district_ar: "العيون", price: 550, capacity: 20,
    name_en: "Al Uyun Spring Rest", name_ar: "استراحة العيون",
    description_en: "A simple, affordable istiraha with a garden and a traditional majlis.",
    description_ar: "استراحة بسيطة وسعرها مناسب، فيها حديقة ومجلس شعبي.",
    amenities: ["garden", "majlis", "bbq", "parking"],
  },
  {
    owner: "owner", city: "alahsa", district_en: "Al Qarah", district_ar: "القارة", price: 1100, capacity: 45,
    name_en: "Al Qarah Mountain View", name_ar: "استراحة إطلالة القارة",
    description_en: "Views of Al Qarah mountain, a large pool, a firepit and a kids' play area.",
    description_ar: "إطلالة على جبل القارة، مسبح كبير، شبة نار، وألعاب للأطفال.",
    amenities: ["pool", "firepit", "kids_area", "majlis", "bbq", "parking", "wifi"],
  },
  // Jeddah
  {
    owner: "owner2", city: "jeddah", district_en: "Obhur", district_ar: "أبحر", price: 2800, capacity: 40,
    name_en: "Obhur Sea Chalet", name_ar: "شاليه أبحر البحري",
    description_en: "A chalet minutes from the Obhur corniche with a large pool and a rooftop lounge.",
    description_ar: "شاليه على بعد دقايق من كورنيش أبحر، فيه مسبح كبير وجلسة على السطح.",
    amenities: ["pool", "ac", "wifi", "kitchen", "sound_system", "parking"],
  },
  {
    owner: "owner3", city: "jeddah", district_en: "Al Shati", district_ar: "الشاطئ", price: 1900, capacity: 25,
    name_en: "Shati Breeze Villa", name_ar: "فيلا نسيم الشاطئ",
    description_en: "A bright villa with sea breeze, a private pool and a modern kitchen.",
    description_ar: "فيلا مشمسة مع نسيم البحر، مسبح خاص ومطبخ حديث.",
    amenities: ["pool", "ac", "kitchen", "wifi", "parking"],
  },
  {
    owner: "owner", city: "jeddah", district_en: "Al Hamdaniyah", district_ar: "الحمدانية", price: 900, capacity: 35,
    name_en: "Hamdaniyah Family Rest", name_ar: "استراحة الحمدانية",
    description_en: "Spacious and affordable, with separate majlis areas and a kids' pool.",
    description_ar: "واسعة وسعرها حلو، فيها مجالس منفصلة ومسبح أطفال.",
    amenities: ["pool", "kids_pool", "majlis", "kids_area", "bbq", "parking"],
  },
  // Dammam
  {
    owner: "owner3", city: "dammam", district_en: "Al Shati Al Sharqi", district_ar: "الشاطئ الشرقي", price: 1300, capacity: 30,
    name_en: "Gulf Corniche Chalet", name_ar: "شاليه كورنيش الخليج",
    description_en: "Close to the Dammam corniche, with a pool, BBQ area and a large screen.",
    description_ar: "قريب من كورنيش الدمام، فيه مسبح وجلسة شوي وشاشة كبيرة.",
    amenities: ["pool", "bbq", "sound_system", "ac", "wifi", "parking"],
  },
  {
    owner: "owner", city: "dammam", district_en: "Al Faisaliyah", district_ar: "الفيصلية", price: 750, capacity: 25,
    name_en: "Faisaliyah Garden Istiraha", name_ar: "استراحة حديقة الفيصلية",
    description_en: "Green lawns, a volleyball court and a cosy majlis for family evenings.",
    description_ar: "مسطحات خضراء وملعب طايرة ومجلس مريح لسهرات العايلة.",
    amenities: ["garden", "volleyball", "majlis", "bbq", "kids_area", "parking"],
  },
  // Khobar
  {
    owner: "owner2", city: "khobar", district_en: "Half Moon Bay", district_ar: "نصف القمر", price: 3200, capacity: 50,
    name_en: "Half Moon Bay Resort Chalet", name_ar: "شاليه نصف القمر",
    description_en: "A premium chalet at Half Moon Bay with two pools and a private beach path.",
    description_ar: "شاليه فاخر في نصف القمر، فيه مسبحين وممر خاص للبحر.",
    amenities: ["pool", "kids_pool", "ac", "wifi", "kitchen", "sound_system", "parking"],
  },
  {
    owner: "owner3", city: "khobar", district_en: "Al Aziziyah", district_ar: "العزيزية", price: 1400, capacity: 30,
    name_en: "Aziziyah Palm Chalet", name_ar: "شاليه نخيل العزيزية",
    description_en: "Palm-shaded pool deck, a family majlis and a play area for children.",
    description_ar: "مسبح مظلل بالنخيل، مجلس عائلي، ومنطقة ألعاب للأطفال.",
    amenities: ["pool", "majlis", "kids_area", "bbq", "ac", "parking"],
  },
  // Abha
  {
    owner: "owner", city: "abha", district_en: "Al Soudah", district_ar: "السودة", price: 1600, capacity: 20,
    name_en: "Soudah Mountain Lodge", name_ar: "نُزل جبال السودة",
    description_en: "Cool mountain air above the clouds, a firepit and a heated indoor majlis.",
    description_ar: "جو جبلي بارد فوق السحاب، شبة نار، ومجلس داخلي مدفأ.",
    amenities: ["firepit", "majlis", "garden", "kitchen", "wifi", "parking"],
  },
  {
    owner: "owner2", city: "abha", district_en: "Al Muftaha", district_ar: "المفتاحة", price: 1000, capacity: 25,
    name_en: "Asir Garden Rest", name_ar: "استراحة حدائق عسير",
    description_en: "A garden istiraha with a covered pool and views of the Asir mountains.",
    description_ar: "استراحة بحديقة ومسبح مغطى وإطلالة على جبال عسير.",
    amenities: ["pool", "garden", "majlis", "bbq", "parking"],
  },
  // Taif
  {
    owner: "owner3", city: "taif", district_en: "Al Hada", district_ar: "الهدا", price: 1250, capacity: 30,
    name_en: "Al Hada Rose Farm", name_ar: "مزرعة ورد الهدا",
    description_en: "A farm stay among Taif rose fields, with a pool and outdoor seating.",
    description_ar: "إقامة في مزرعة بين حقول الورد الطائفي، فيها مسبح وجلسات خارجية.",
    amenities: ["pool", "garden", "majlis", "bbq", "kids_area", "parking"],
  },
  {
    owner: "owner", city: "taif", district_en: "Al Shafa", district_ar: "الشفا", price: 800, capacity: 20,
    name_en: "Shafa Highland Istiraha", name_ar: "استراحة مرتفعات الشفا",
    description_en: "A cosy highland istiraha with a firepit and a small family pool.",
    description_ar: "استراحة دافية في المرتفعات، فيها شبة نار ومسبح عائلي صغير.",
    amenities: ["pool", "firepit", "majlis", "bbq", "parking"],
  },
  // Waiting for admin approval
  {
    owner: "owner", city: "riyadh", district_en: "Al Rimal", district_ar: "الرمال", price: 1350, capacity: 35, status: "pending",
    name_en: "Al Rimal New Chalet", name_ar: "شاليه الرمال الجديد",
    description_en: "A newly built chalet with a pool and a padel court.",
    description_ar: "شاليه جديد فيه مسبح وملعب بادل.",
    amenities: ["pool", "majlis", "bbq", "parking", "wifi"],
  },
  {
    owner: "owner3", city: "alahsa", district_en: "Al Jafr", district_ar: "الجفر", price: 600, capacity: 20, status: "pending",
    name_en: "Al Jafr Farm Rest", name_ar: "استراحة مزرعة الجفر",
    description_en: "A small farm istiraha, good for quiet weekends.",
    description_ar: "استراحة مزرعة صغيرة، حلوة للويكند الهادي.",
    amenities: ["garden", "majlis", "bbq", "parking"],
  },
];

export const istirahas = listings.map((l, i) => ({
  ...l,
  status: l.status ?? "approved",
  photos: photosFor(i, l.camp),
}));
