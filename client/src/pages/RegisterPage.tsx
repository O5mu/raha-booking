import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { Logo } from "../components/Logo";
import { homeFor } from "./LoginPage";
import styles from "./AuthPages.module.css";

export function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "guest" as "guest" | "owner" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const next = params.get("next");
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await register(form);
      navigate(safeNext ?? homeFor(user), { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className={`container page ${styles.page}`}>
      <div className={`card ${styles.panel}`}>
        <Logo size={44} />
        <h1 className={styles.title}>{t("auth.registerTitle")}</h1>

        <form className={styles.form} onSubmit={onSubmit}>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <fieldset className={styles.roles}>
            <legend>{t("auth.accountType")}</legend>
            {(["guest", "owner"] as const).map((role) => (
              <label key={role} className={form.role === role ? styles.roleActive : ""}>
                <input type="radio" name="role" value={role} checked={form.role === role} onChange={set("role")} />
                {t(role === "guest" ? "auth.typeGuest" : "auth.typeOwner")}
              </label>
            ))}
          </fieldset>
          <div className="field">
            <label htmlFor="name">{t("auth.name")}</label>
            <input id="name" className="input" autoComplete="name" required minLength={2} value={form.name} onChange={set("name")} />
          </div>
          <div className="field">
            <label htmlFor="email">{t("auth.email")}</label>
            <input id="email" className="input" type="email" autoComplete="email" required value={form.email} onChange={set("email")} dir="ltr" />
          </div>
          <div className="field">
            <label htmlFor="password">{t("auth.password")}</label>
            <input id="password" className="input" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={set("password")} dir="ltr" />
            <small className="muted">{t("auth.passwordHint")}</small>
          </div>
          <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
            {t("auth.submitRegister")}
          </button>
        </form>

        <p className={styles.switch}>
          {t("auth.haveAccount")} <Link to="/login">{t("nav.login")}</Link>
        </p>
      </div>
    </div>
  );
}
