import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { IstirahaCard, IstirahaDetails, SearchResponse } from "../api/types";
import { useFormat } from "../lib/format";
import { addDays, parseDate, today } from "../lib/dates";
import { Reveal } from "../components/Reveal";
import styles from "./HomePage.module.css";

const unsplash = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&q=78&auto=format&fit=crop`;

// Three evenings in the same light: the pool lit at night, a tent glowing in
// the desert, the cushions of an outdoor majlis. They crossfade slowly.
const HERO = ["1416331108676-a22ccb276e35", "1682688759157-57988e10ffa8", "1760304979421-49e6f667774c"];

// The places the showcase walks through, one full screen each.
const SHOWCASE_IDS = [3, 6, 15];

const CITY_ORDER = ["riyadh", "alahsa", "jeddah", "dammam", "khobar", "abha", "taif"];

export function HomePage() {
  return (
    <>
      <Hero />
      <RateSheet />
      <Showcase />
      <OneFamily />
    </>
  );
}

/* ---------- First screen: the place, and the name along the bottom ---------- */
function Hero() {
  const { t } = useTranslation();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setShown((i) => (i + 1) % HERO.length);
    }, 6500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className={styles.hero}>
      {HERO.map((id, i) => (
        <img
          key={id}
          className={styles.heroImage}
          data-shown={i === shown}
          src={unsplash(id, 2400, 1500)}
          width={2400}
          height={1500}
          alt={i === 0 ? t("home.heroAlt") : ""}
          aria-hidden={i !== 0}
          loading={i === 0 ? "eager" : "lazy"}
        />
      ))}
      <div className={styles.heroText}>
        <div className={styles.heroFacts}>
          <p className={styles.sentence}>{t("home.sentence")}</p>
          <HeroFact />
        </div>
        <h1 className={styles.name}>
          <span lang="en">Raha</span>
          <span lang="ar">راحة</span>
        </h1>
      </div>
    </section>
  );
}

// The fact over the right end of the name, computed from the listings themselves.
function HeroFact() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const all = useQuery({
    queryKey: ["istirahas", "sheet"],
    queryFn: () => api<SearchResponse>("/istirahas?pageSize=50"),
  });
  if (!all.data?.results.length) return null;
  const cheapest = Math.min(...all.data.results.map((r) => r.price_per_night));
  const cities = new Set(all.data.results.map((r) => r.city)).size;
  return <p className={styles.fact}>{t("home.fact", { price: fmt.money(cheapest), cities })}</p>;
}

/* ---------- The rate sheet: every place, one night, like a printed card ---------- */
function nextNights(count: number) {
  const start = today();
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

// The coming Thursday night (today, if it is Thursday): the night istirahas are booked for.
function comingThursday(nights: string[]) {
  return nights.find((d) => parseDate(d).getUTCDay() === 4) ?? nights[0];
}

function RateSheet() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const nights = useMemo(() => nextNights(7), []);
  const [night, setNight] = useState(() => comingThursday(nights));
  const morning = addDays(night, 1);

  const all = useQuery({
    queryKey: ["istirahas", "sheet"],
    queryFn: () => api<SearchResponse>("/istirahas?pageSize=50"),
  });
  // The same search with the night filled in returns only the places still free.
  const free = useQuery({
    queryKey: ["istirahas", "sheet", night],
    queryFn: () => api<SearchResponse>(`/istirahas?pageSize=50&checkIn=${night}&checkOut=${morning}`),
  });

  const freeIds = new Set(free.data?.results.map((r) => r.id));
  const groups = CITY_ORDER.map((city) => ({
    city,
    items: (all.data?.results ?? []).filter((r) => r.city === city),
  })).filter((g) => g.items.length);
  const freeCount = free.data?.total ?? 0;
  const total = all.data?.total ?? 0;

  return (
    <section className={styles.rates} id="rates" aria-labelledby="rates-title">
      <img className={styles.ratesPhoto} src="/photos/fort-al-ahsa.jpg" width={1920} height={1280} alt={t("home.fortAlt")} loading="lazy" decoding="async" />
      <Reveal className={styles.sheet}>
        <h2 id="rates-title" className={styles.sheetTitle}>
          {t("home.ratesTitle")}
        </h2>
        <p className={styles.sheetNote}>
          {free.data ? t("home.ratesNote", { date: fmt.longDate(night), free: freeCount, total }) : " "}
        </p>

        {/* The live thing: pick the night and the sheet strikes out what is taken. */}
        <div className={styles.nights} role="radiogroup" aria-label={t("home.pickNight")}>
          {nights.map((d, i) => (
            <button key={d} role="radio" aria-checked={d === night} className={styles.night} onClick={() => setNight(d)}>
              <span>{i === 0 ? t("home.tonight") : fmt.weekdayShort(d)}</span>
              <span className="num">{Number(d.slice(8))}</span>
            </button>
          ))}
        </div>

        {groups.map((g) => (
          <Reveal key={g.city} className={styles.group}>
            <h3 className={styles.groupName}>{t(`cities.${g.city}`)}</h3>
            <ul className={styles.items}>
              {g.items.map((item) => (
                <SheetItem key={item.id} item={item} booked={free.data ? !freeIds.has(item.id) : false} night={night} morning={morning} />
              ))}
            </ul>
          </Reveal>
        ))}

        <p className={styles.sheetEnd}>
          {t("home.checkIn")}
          <br />
          {t("home.checkOut")}
        </p>
      </Reveal>
    </section>
  );
}

function SheetItem({ item, booked, night, morning }: { item: IstirahaCard; booked: boolean; night: string; morning: string }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  return (
    <li className={styles.item} data-booked={booked}>
      <Link to={`/istirahas/${item.id}?checkIn=${night}&checkOut=${morning}&guests=10`} className={styles.itemLine}>
        <span className={styles.itemName}>{fmt.pick(item, "name")}</span>
        <span className={`num ${styles.itemPrice}`}>{booked ? t("home.booked") : fmt.money(item.price_per_night)}</span>
      </Link>
      <p className={styles.itemNote}>
        {fmt.pick(item, "district")} · {t("search.upToGuests", { count: item.capacity })}
      </p>
    </li>
  );
}

/* ---------- Showcase: one place per screen, the card stepping right ---------- */
function Showcase() {
  const { t } = useTranslation();
  const places = useQuery({
    queryKey: ["istirahas", "showcase"],
    queryFn: () => Promise.all(SHOWCASE_IDS.map((id) => api<{ istiraha: IstirahaDetails }>(`/istirahas/${id}`).then((r) => r.istiraha))),
  });

  return (
    <section className={styles.showcase} aria-label={t("home.showcaseLabel")}>
      {(places.data ?? []).map((place, i) => (
        <ShowcaseFrame key={place.id} place={place} step={i} first={i === 0} />
      ))}
    </section>
  );
}

function ShowcaseFrame({ place, step, first }: { place: IstirahaDetails; step: number; first: boolean }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const name = fmt.pick(place, "name");
  const Heading = first ? "h2" : "h3";
  return (
    <div className={styles.frame} data-step={step} style={{ "--step": step } as CSSProperties}>
      <img className={styles.frameImage} src={place.photos[0].replace("w=1200", "w=2400")} width={2400} height={1600} alt={name} loading="lazy" decoding="async" />
      <div className={styles.frameCard}>
        <Reveal order={0}>
          <Heading className={styles.frameName}>{name}</Heading>
        </Reveal>
        <Reveal order={1}>
          <p>{fmt.place(place)}</p>
          <p className="num">
            {fmt.money(place.price_per_night)} {t("home.aNight")} · {t("search.upToGuests", { count: place.capacity })}
          </p>
        </Reveal>
        <Reveal order={2} className={styles.frameWholeWrap}>
          <img className={styles.frameWhole} src={place.photos[1]} width={1200} height={800} alt="" loading="lazy" decoding="async" />
        </Reveal>
        <Reveal order={3} className={styles.frameActionWrap}>
          <Link to={`/istirahas/${place.id}`} className="btn btn-primary btn-block">
            {t("home.seePlace")}
          </Link>
        </Reveal>
      </div>
    </div>
  );
}

/* ---------- Proof: one family a night, said with the names of every place ---------- */
function OneFamily() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const all = useQuery({
    queryKey: ["istirahas", "sheet"],
    queryFn: () => api<SearchResponse>("/istirahas?pageSize=50"),
  });
  const names = (all.data?.results ?? []).map((r) => fmt.pick(r, "name"));
  const [lit, setLit] = useState(0);

  useEffect(() => {
    if (!names.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setLit((i) => (i + 1) % names.length), 2000);
    return () => window.clearInterval(id);
  }, [names.length]);

  return (
    <section className={styles.family} aria-labelledby="family-title">
      <div className={styles.familyText}>
      <Reveal order={0}>
        <h2 id="family-title" className={styles.familyTitle}>
          {t("home.familyTitle")}
        </h2>
      </Reveal>
      <Reveal order={1}>
        <p className={styles.familyNames}>
          {names.map((n, i) => (
            <span key={n} data-lit={i === lit}>
              {n}
              {i < names.length - 1 ? t("home.comma") : "."}{" "}
            </span>
          ))}
        </p>
      </Reveal>
      <Reveal order={2}>
        <p className={styles.familyFact}>{t("home.familyFact")}</p>
      </Reveal>
      </div>
      <Firepit />
    </section>
  );
}

// One moving picture: a fire, the شبة النار of winter nights. It loops muted
// and stays on its first frame for people who ask for reduced motion.
function Firepit() {
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <Reveal order={1} className={styles.fire}>
      <video autoPlay={!reduced} muted loop playsInline preload="metadata" poster="/photos/firepit-poster.jpg" width={854} height={480} aria-hidden="true">
        <source src="/photos/firepit.webm" type="video/webm" />
      </video>
    </Reveal>
  );
}
