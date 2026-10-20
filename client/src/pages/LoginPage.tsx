import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import type { Role, User } from "../api/types";
import styles from "./AuthPages.module.css";

// Where each role lands after logging in (unless a "next" page was requested).
export function homeFor(user: User) {
  return { guest: "/", owner: "/owner", admin: "/admin" }[user.role];
}

export function LoginPage() {
  const { t } = useTranslation();
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  // Only follow "next" if it's a path on this site (prevents open redirects).
  const next = params.get("next");
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : null;

  async function run(key: string, action: () => Promise<User>) {
    setBusy(key);
    setError("");
    try {
      const user = await action();
      navigate(safeNext ?? homeFor(user), { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    run("form", () => login(email, password));
  }

  const demos: { role: Role; label: string; icon: typeof UserRound }[] = [
    { role: "guest", label: t("auth.demoGuest"), icon: UserRound },
    { role: "owner", label: t("auth.demoOwner"), icon: Building2 },
    { role: "admin", label: t("auth.demoAdmin"), icon: ShieldCheck },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.photo}>
        <img src="/photos/palms-diriyah.jpg" width={1920} height={1920} alt={t("auth.photoAlt")} />
      </div>
      <div className={styles.panel}>
        <h1 className={styles.title}>{t("auth.loginTitle")}</h1>
        <p>{t("auth.loginSubtitle")}</p>

        <div className={styles.demo}>
          <p className={styles.demoTitle}>{t("auth.orTryDemo")}</p>
          <div className={styles.demoButtons}>
            {demos.map(({ role, label, icon: Icon }) => (
              <button key={role} className="btn btn-secondary" disabled={busy !== null} onClick={() => run(role, () => demoLogin(role))}>
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
          <p className="muted">{t("auth.demoHint")}</p>
        </div>

        <form className={styles.form} onSubmit={onSubmit}>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="field">
            <label htmlFor="email">{t("auth.email")}</label>
            <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
          </div>
          <div className="field">
            <label htmlFor="password">{t("auth.password")}</label>
            <input id="password" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
          </div>
          <button className="btn btn-primary btn-block btn-lg" disabled={busy !== null}>
            {t("auth.submitLogin")}
          </button>
        </form>

        <p className={styles.switch}>
          {t("auth.noAccount")} <Link to={`/register${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""}`}>{t("auth.createOne")}</Link>
        </p>
      </div>
    </div>
  );
}
