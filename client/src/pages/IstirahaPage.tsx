import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Minus, Plus } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { DateRange, IstirahaDetails } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useFormat } from "../lib/format";
import { bookedNights, nightsBetween } from "../lib/dates";
import { DateRangeCalendar, type Range } from "../components/DateRangeCalendar";
import { AmenityIcon } from "../components/AmenityIcon";
import { Reveal } from "../components/Reveal";
import { ErrorState, PageLoader } from "../components/States";
import styles from "./IstirahaPage.module.css";

type DetailsResponse = { istiraha: IstirahaDetails; bookedRanges: DateRange[] };
type BookingResponse = { booking: { id: number } };

const large = (url: string) => url.replace("w=1200", "w=2400");

export function IstirahaPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const fmt = useFormat();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Dates and guests live in the URL, so they survive the login redirect.
  const [params, setParams] = useSearchParams();
  const range: Range = { checkIn: params.get("checkIn") ?? undefined, checkOut: params.get("checkOut") ?? undefined };
  const [guests, setGuests] = useState(Number(params.get("guests")) || 10);

  const details = useQuery({
    queryKey: ["istiraha", id],
    queryFn: () => api<DetailsResponse>(`/istirahas/${id}`),
  });

  const booked = useMemo(() => bookedNights(details.data?.bookedRanges ?? []), [details.data]);

  const book = useMutation({
    mutationFn: () =>
      api<BookingResponse>("/bookings", {
        method: "POST",
        body: { istirahaId: Number(id), checkIn: range.checkIn, checkOut: range.checkOut, guests },
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["istiraha", id] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["istirahas"] });
      navigate(`/bookings/${res.booking.id}/confirmed`, { replace: true });
    },
    onError: (err) => {
      // 409: someone else just took these dates. Reload the calendar so they show as booked.
      if (err instanceof ApiError && err.status === 409) {
        queryClient.invalidateQueries({ queryKey: ["istiraha", id] });
        setRange({});
      }
    },
  });

  function setRange(r: Range) {
    const next = new URLSearchParams(params);
    for (const key of ["checkIn", "checkOut"] as const) {
      if (r[key]) next.set(key, r[key]!);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  }

  if (details.isPending) return <PageLoader />;
  if (details.isError) {
    const notFound = details.error instanceof ApiError && details.error.status === 404;
    return (
      <div className="wrap page">
        <ErrorState message={notFound ? t("details.notFound") : undefined} />
      </div>
    );
  }

  const { istiraha } = details.data;
  const name = fmt.pick(istiraha, "name");
  const nights = range.checkIn && range.checkOut ? nightsBetween(range.checkIn, range.checkOut) : 0;
  const tooMany = guests > istiraha.capacity;
  const total = nights * istiraha.price_per_night;

  function onBook() {
    if (!user) {
      const next = encodeURIComponent(`/istirahas/${id}?${new URLSearchParams({ ...Object.fromEntries(params), guests: String(guests) })}`);
      navigate(`/login?next=${next}`);
      return;
    }
    book.mutate();
  }

  return (
    <article>
      {/* The place, full screen, with its name along the bottom. */}
      <section className={styles.hero}>
        <img className={styles.heroImage} src={large(istiraha.photos[0])} width={2400} height={1600} alt={name} />
        <div className={styles.heroText}>
          <div className={styles.facts}>
            <p className={styles.what}>{t("details.what", { place: fmt.place(istiraha), count: istiraha.capacity })}</p>
            <p className={styles.factEnd}>
              <span className="num">{fmt.money(istiraha.price_per_night)}</span> {t("home.aNight")}
            </p>
          </div>
          <h1 className={styles.name}>{name}</h1>
        </div>
      </section>

      {/* What it is: the words on one side, the pictures on the other. */}
      <section className={styles.about} aria-labelledby="about-title">
        <div className={styles.aboutText}>
          <Reveal order={0}>
            <h2 id="about-title" className={styles.heading}>
              {t("details.about")}
            </h2>
          </Reveal>
          <Reveal order={1}>
            <p className={styles.lead}>{fmt.pick(istiraha, "description")}</p>
            <p className={styles.host}>{t("details.hostedBy", { name: istiraha.owner_name })}</p>
          </Reveal>
          <Reveal order={2}>
            <h3 className={styles.subheading}>{t("details.amenities")}</h3>
            <ul className={styles.amenities}>
              {istiraha.amenities.map((a) => (
                <li key={a}>
                  <AmenityIcon name={a} size="1.25rem" />
                  {t(`amenities.${a}`)}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
        <div className={styles.pictures}>
          {istiraha.photos.slice(1, 3).map((src, i) => (
            <Reveal key={src} order={i + 1} className={i === 0 ? styles.pictureLarge : styles.pictureSmall}>
              <img src={src} width={1200} height={800} alt={t("details.photo", { n: i + 2, total: istiraha.photos.length })} loading="lazy" decoding="async" />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Choosing the night: the calendar and the booking card are working parts of the app. */}
      <section className={styles.booking} id="availability" aria-labelledby="availability-title">
        <div className={styles.calendarSide}>
          <Reveal order={0}>
            <h2 id="availability-title" className={styles.heading}>
              {t("details.availability")}
            </h2>
          </Reveal>
          <Reveal order={1}>
            <p className={styles.hint}>{range.checkIn && range.checkOut
                ? `${fmt.range(range.checkIn, range.checkOut)}, ${t("details.nights", { count: nightsBetween(range.checkIn, range.checkOut) })}`
                : range.checkIn
                  ? t("details.pickCheckOut")
                  : t("details.pickCheckIn")}</p>
          </Reveal>
          <Reveal order={2} className={styles.calendar}>
            <div data-ui>
              <DateRangeCalendar value={range} onChange={setRange} booked={booked} months={2} />
            </div>
          </Reveal>
          <div className={styles.legend}>
            <span className={styles.legendBooked} aria-hidden="true">
              12
            </span>
            {t("details.booked")}
            {range.checkIn && (
              <button className="btn btn-ghost" onClick={() => setRange({})}>
                {t("details.clearDates")}
              </button>
            )}
          </div>
        </div>

        <aside className={styles.card} data-ui aria-label={t("details.book")}>
          <Reveal order={1} className={styles.cardInner}>
          <dl className={styles.dates}>
            <div>
              <dt>{t("details.checkIn")}</dt>
              <dd>{range.checkIn ? fmt.longDate(range.checkIn) : t("details.notChosen")}</dd>
            </div>
            <div>
              <dt>{t("details.checkOut")}</dt>
              <dd>{range.checkOut ? fmt.longDate(range.checkOut) : t("details.notChosen")}</dd>
            </div>
          </dl>

          <div className={styles.guests}>
            <span>{t("search.guests")}</span>
            <span className={styles.stepper}>
              <button onClick={() => setGuests((g) => Math.max(1, g - 1))} aria-label={t("details.fewerGuests")}>
                <Minus size="1rem" />
              </button>
              <output className="num">{guests}</output>
              <button onClick={() => setGuests((g) => g + 1)} aria-label={t("details.moreGuests")}>
                <Plus size="1rem" />
              </button>
            </span>
          </div>
          {tooMany && <p className="form-error">{t("details.maxGuests", { count: istiraha.capacity })}</p>}

          {nights > 0 && (
            <dl className={styles.breakdown}>
              <div>
                <dt>{t("details.priceLine", { price: fmt.money(istiraha.price_per_night), nights: t("details.nights", { count: nights }) })}</dt>
                <dd className="num">{fmt.money(total)}</dd>
              </div>
              <div className={styles.total}>
                <dt>{t("details.total")}</dt>
                <dd className="num">{fmt.money(total)}</dd>
              </div>
            </dl>
          )}

          {book.isError && <p className="form-error">{(book.error as Error).message}</p>}
          {user && user.role !== "guest" && <p className="form-error">{t("details.onlyGuests")}</p>}

          <button
            className="btn btn-primary btn-block btn-lg"
            onClick={onBook}
            disabled={!nights || tooMany || book.isPending || (user !== null && user.role !== "guest")}
          >
            {user ? t("details.book") : t("details.loginToBook")}
          </button>
          <p className={styles.note}>{t("details.notCharged")}</p>
          </Reveal>
        </aside>
      </section>

      <p className={`wrap ${styles.backRow}`}>
        <Link to="/search">{t("details.back")}</Link>
      </p>
    </article>
  );
}
