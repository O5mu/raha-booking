import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../../api/client";
import type { OwnerIstiraha } from "../../api/types";
import { useFormat } from "../../lib/format";
import { CITIES } from "../../components/SearchBar";
import { AmenityIcon } from "../../components/AmenityIcon";
import { ErrorState, PageLoader } from "../../components/States";
import styles from "./ListingFormPage.module.css";

const AMENITIES = [
  "pool", "kids_pool", "majlis", "football", "volleyball", "bbq", "firepit", "tent",
  "garden", "kids_area", "kitchen", "ac", "wifi", "sound_system", "parking",
];

type FormState = {
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  city: string;
  district_en: string;
  district_ar: string;
  price_per_night: string;
  capacity: string;
  amenities: string[];
  photos: string;
};

const EMPTY: FormState = {
  name_en: "", name_ar: "", description_en: "", description_ar: "", city: "riyadh",
  district_en: "", district_ar: "", price_per_night: "", capacity: "", amenities: [], photos: "",
};

function toForm(i: OwnerIstiraha): FormState {
  return {
    ...i,
    price_per_night: String(i.price_per_night),
    capacity: String(i.capacity),
    photos: i.photos.join("\n"),
  };
}

export function ListingFormPage() {
  const { id } = useParams();
  const isEdit = id !== undefined;
  const { t } = useTranslation();
  const listings = useQuery({
    queryKey: ["owner", "istirahas"],
    queryFn: () => api<{ istirahas: OwnerIstiraha[] }>("/owner/istirahas"),
    enabled: isEdit,
  });

  if (!isEdit) return <ListingForm initial={EMPTY} />;
  if (listings.isPending) return <PageLoader />;
  const existing = listings.data?.istirahas.find((i) => i.id === Number(id));
  if (!existing) return <ErrorState message={t("details.notFound")} />;
  return <ListingForm initial={toForm(existing)} existing={existing} />;
}

function ListingForm({ initial, existing }: { initial: FormState; existing?: OwnerIstiraha }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initial);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...form,
        price_per_night: Number(form.price_per_night),
        capacity: Number(form.capacity),
        photos: form.photos.split("\n").map((p) => p.trim()).filter(Boolean),
      };
      return existing
        ? api(`/owner/istirahas/${existing.id}`, { method: "PUT", body })
        : api("/owner/istirahas", { method: "POST", body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner"] });
      if (existing) queryClient.invalidateQueries({ queryKey: ["istiraha", String(existing.id)] });
      navigate("/owner");
    },
  });

  const errors = save.error instanceof ApiError ? (save.error.details ?? {}) : {};
  const set = (key: keyof FormState) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  function toggleAmenity(a: string) {
    setForm({ ...form, amenities: form.amenities.includes(a) ? form.amenities.filter((x) => x !== a) : [...form.amenities, a] });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  const photoList = form.photos.split("\n").map((p) => p.trim()).filter((p) => p.startsWith("http"));

  return (
    <div className="container page">
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <header className={styles.head}>
          <h1>{existing ? t("owner.formEdit", { name: fmt.pick(existing, "name") }) : t("owner.formNew")}</h1>
          {!existing && <p>{t("owner.formHint")}</p>}
        </header>

        {save.isError && !Object.keys(errors).length && <p className="form-error">{(save.error as Error).message}</p>}

        <Section title={t("owner.sectionBasics")} note={t("owner.basicsNote")}>
          <div className={styles.row}>
            <Field name="name_en" error={errors.name_en?.[0]} label={t("owner.nameEn")}>
              <input id="name_en" className="input" dir="ltr" value={form.name_en} onChange={set("name_en")} />
            </Field>
            <Field name="name_ar" error={errors.name_ar?.[0]} label={t("owner.nameAr")}>
              <input id="name_ar" className="input" dir="rtl" lang="ar" value={form.name_ar} onChange={set("name_ar")} />
            </Field>
          </div>
        </Section>

        <Section title={t("owner.sectionDescription")} note={t("owner.descriptionNote")}>
          <div className={styles.row}>
            <Field name="description_en" error={errors.description_en?.[0]} label={t("owner.descriptionEn")}>
              <textarea id="description_en" className="input" rows={4} dir="ltr" value={form.description_en} onChange={set("description_en")} />
            </Field>
            <Field name="description_ar" error={errors.description_ar?.[0]} label={t("owner.descriptionAr")}>
              <textarea id="description_ar" className="input" rows={4} dir="rtl" lang="ar" value={form.description_ar} onChange={set("description_ar")} />
            </Field>
          </div>
        </Section>

        <Section title={t("owner.sectionDetails")} note={t("owner.detailsNote")}>
          <div className={styles.row}>
            <Field name="city" error={errors.city?.[0]} label={t("owner.city")}>
              <select id="city" className="input" value={form.city} onChange={set("city")}>
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`cities.${c}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field name="district_en" error={errors.district_en?.[0]} label={t("owner.districtEn")}>
              <input id="district_en" className="input" dir="ltr" value={form.district_en} onChange={set("district_en")} />
            </Field>
            <Field name="district_ar" error={errors.district_ar?.[0]} label={t("owner.districtAr")}>
              <input id="district_ar" className="input" dir="rtl" lang="ar" value={form.district_ar} onChange={set("district_ar")} />
            </Field>
          </div>
          <div className={styles.row}>
            <Field name="price_per_night" error={errors.price_per_night?.[0]} label={t("owner.price")}>
              <input id="price_per_night" className="input" type="number" inputMode="numeric" min={100} value={form.price_per_night} onChange={set("price_per_night")} />
            </Field>
            <Field name="capacity" error={errors.capacity?.[0]} label={t("owner.capacity")}>
              <input id="capacity" className="input" type="number" inputMode="numeric" min={1} value={form.capacity} onChange={set("capacity")} />
            </Field>
          </div>
        </Section>

        <Section title={t("owner.sectionAmenities")} note={t("owner.amenitiesNote")}>
          <div className={styles.chips}>
            {AMENITIES.map((a) => (
              <button type="button" key={a} className="chip" aria-pressed={form.amenities.includes(a)} onClick={() => toggleAmenity(a)}>
                <AmenityIcon name={a} size="0.9375rem" />
                {t(`amenities.${a}`)}
              </button>
            ))}
          </div>
        </Section>

        <Section title={t("owner.sectionPhotos")} note={t("owner.photosNote")} aside={<Preview form={form} />}>
          <Field name="photos" error={errors.photos?.[0]} label={t("owner.photosLabel")} hint={t("owner.photosHint")}>
            <textarea id="photos" className="input" rows={4} dir="ltr" value={form.photos} onChange={set("photos")} placeholder="https://images.unsplash.com/..." />
          </Field>
          {photoList.length > 0 && (
            <div className={styles.previews}>
              {photoList.map((src, i) => (
                <img key={src + i} src={src} alt="" loading="lazy" />
              ))}
            </div>
          )}
        </Section>

        <div className={styles.footer}>
          <Link to="/owner" className="btn btn-ghost">
            {t("owner.cancel")}
          </Link>
          <button className="btn btn-primary btn-lg" disabled={save.isPending}>
            {existing ? t("owner.save") : t("owner.create")}
          </button>
        </div>
      </form>
    </div>
  );
}

// One settings row: the section's name and a line about it on the start
// side, its fields in a panel beside it. `aside` goes under the note.
function Section({ title, note, aside, children }: { title: string; note: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <div className={styles.label}>
        <h2>{title}</h2>
        <p>{note}</p>
        {aside}
      </div>
      <fieldset className={styles.panel}>
        <legend className="visually-hidden">{title}</legend>
        {children}
      </fieldset>
    </section>
  );
}

// What the setting produces: the listing as a card in search, live as you type.
function Preview({ form }: { form: FormState }) {
  const { t, i18n } = useTranslation();
  const fmt = useFormat();
  const cover = form.photos.split("\n").map((p) => p.trim()).find((p) => p.startsWith("http"));
  const name = (i18n.language === "ar" ? form.name_ar : form.name_en) || form.name_en || t("owner.previewName");
  return (
    <figure className={styles.preview}>
      <figcaption>{t("owner.preview")}</figcaption>
      <div className={styles.previewCard}>
        {cover ? <img src={cover} alt="" /> : <div className={styles.previewEmpty} />}
        <strong>{name}</strong>
        <span>
          {t(`cities.${form.city}`)} · {form.price_per_night ? `${fmt.money(Number(form.price_per_night))} ${t("search.perNight")}` : "-"}
        </span>
      </div>
    </figure>
  );
}

// Label + input + hint + server error. Defined outside ListingForm on purpose:
// a component declared inside another one is a new type on every render, so
// React would remount the input and it would lose focus after each keystroke.
function Field({ name, label, children, hint, error }: { name: string; label: string; children: ReactNode; hint?: string; error?: string }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {children}
      {hint && <small className={styles.hint}>{hint}</small>}
      {error && <small className={styles.error}>{error}</small>}
    </div>
  );
}
