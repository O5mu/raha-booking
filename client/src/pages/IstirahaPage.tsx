import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, MapPin, Minus, Plus, Users } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { DateRange, IstirahaDetails } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useFormat } from "../lib/format";
import { bookedNights, nightsBetween } from "../lib/dates";
import { PhotoGallery } from "../components/PhotoGallery";
import { DateRangeCalendar, type Range } from "../components/DateRangeCalendar";
import { AmenityIcon } from "../components/AmenityIcon";
import { ErrorState, PageLoader } from "../components/States";
import styles from "./IstirahaPage.module.css";

type DetailsResponse = { istiraha: IstirahaDetails; bookedRanges: DateRange[] };
type BookingResponse = { booking: { id: number } };

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
    return <ErrorState message={notFound ? t("details.notFound") : undefined} />;
  }

  const { istiraha } = details.data;
  const name = fmt.pick(istiraha, "name");
  const nights = range.checkIn && range.checkOut ? nightsBetween(range.checkIn, range.checkOut) : 0;
  const tooMany = guests > istiraha.capacity;

  function onBook() {
    if (!user) {
      const next = encodeURIComponent(`/istirahas/${id}?${new URLSearchParams({ ...Object.fromEntries(params), guests: String(guests) })}`);
      navigate(`/login?next=${next}`);
      return;
    }
    book.mutate();
  }

  return (
    <div className="container page">
      <button className={`btn btn-ghost ${styles.back}`} onClick={() => navigate(-1)}>
        <ArrowLeft size={18} className={styles.flip} />
        {t("details.back")}
      </button>

      <header className={styles.header}>
        <h1>{name}</h1>
        <p className="muted">
          <MapPin size={16} /> {fmt.place(istiraha)}
          <span aria-hidden="true"> · </span>
          <Users size={16} /> {t("search.upToGuests", { count: istiraha.capacity })}
        </p>
      </header>

      <PhotoGallery photos={istiraha.photos} alt={name} />

      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={styles.section}>
            <p className="muted">{t("details.hostedBy", { name: istiraha.owner_name })}</p>
            <h2>{t("details.about")}</h2>
            <p>{fmt.pick(istiraha, "description")}</p>
          </section>

          <section className={styles.section}>
            <h2>{t("details.amenities")}</h2>
            <ul className={styles.amenities}>
              {istiraha.amenities.map((a) => (
                <li key={a}>
                  <AmenityIcon name={a} size={20} />
                  {t(`amenities.${a}`)}
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.section} id="availability">
            <h2>{t("details.availability")}</h2>
            <p className="muted">{range.checkIn && !range.checkOut ? t("details.pickCheckOut") : t("details.pickCheckIn")}</p>
            <div className={styles.calendar}>
              <DateRangeCalendar value={range} onChange={setRange} booked={booked} months={2} />
            </div>
            <div className={styles.legend}>
              <span className={styles.legendBooked}>12</span> {t("details.booked")}
              {range.checkIn && (
                <button className="btn btn-ghost" onClick={() => setRange({})}>
                  {t("details.clearDates")}
                </button>
              )}
            </div>
          </section>
        </div>

        <aside className={styles.aside}>
          <div className={`card ${styles.bookingCard}`}>
            <p className={styles.price}>
              <strong>{fmt.money(istiraha.price_per_night)}</strong> <span className="muted">{t("search.perNight")}</span>
            </p>

            <a href="#availability" className={styles.dates}>
              <span>
                <small>{t("details.checkIn")}</small>
                {range.checkIn ? fmt.shortDate(range.checkIn) : "–"}
              </span>
              <span>
                <small>{t("details.checkOut")}</small>
                {range.checkOut ? fmt.shortDate(range.checkOut) : "–"}
              </span>
            </a>

            <div className={styles.guests}>
              <span>{t("search.guests")}</span>
              <span className={styles.stepper}>
                <button onClick={() => setGuests((g) => Math.max(1, g - 1))} aria-label="−1">
                  <Minus size={14} />
                </button>
                <output>{guests}</output>
                <button onClick={() => setGuests((g) => g + 1)} aria-label="+1">
                  <Plus size={14} />
                </button>
              </span>
            </div>
            {tooMany && <p className="form-error">{t("details.maxGuests", { count: istiraha.capacity })}</p>}

            {nights > 0 && (
              <dl className={styles.breakdown}>
                <div>
                  <dt>{t("details.priceLine", { price: fmt.money(istiraha.price_per_night), nights: t("details.nights", { count: nights }) })}</dt>
                  <dd>{fmt.money(nights * istiraha.price_per_night)}</dd>
                </div>
                <div className={styles.total}>
                  <dt>{t("details.total")}</dt>
                  <dd>{fmt.money(nights * istiraha.price_per_night)}</dd>
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
            <p className={`muted ${styles.note}`}>{t("details.notCharged")}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
