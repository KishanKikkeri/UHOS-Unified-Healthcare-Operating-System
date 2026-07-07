"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, HeartPulse, Globe, LogIn } from "lucide-react";

import { useAuth } from "@/lib/auth/AuthContext";
import { useLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/i18n/LanguageContext";
import { homeRouteFor } from "@/lib/rbac";
import { ApiError } from "@/lib/api";

const REMEMBER_KEY = "uhos.auth.rememberUsername";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already logged in? Skip the form and go straight to their home route.
  useEffect(() => {
    if (!loading && user) {
      router.replace(homeRouteFor(user.role));
    }
  }, [loading, user, router]);

  // Restore a remembered username (never the password) on mount.
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(REMEMBER_KEY) : null;
    if (saved) {
      setUsername(saved);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedInUser = await login(username.trim(), password);
      if (rememberMe) {
        window.localStorage.setItem(REMEMBER_KEY, username.trim());
      } else {
        window.localStorage.removeItem(REMEMBER_KEY);
      }
      router.replace(homeRouteFor(loggedInUser.role));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(t("login.invalidCredentials"));
      } else {
        setError(t("common.error.generic"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left — branding / illustration side */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-panel-border bg-panel px-12 py-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background: "radial-gradient(500px circle at 15% 20%, rgba(45,212,240,0.12), transparent 60%)",
          }}
          aria-hidden
        />
        <div className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/30 bg-accent-soft">
            <HeartPulse className="h-5 w-5 text-accent" strokeWidth={2} />
          </span>
          <span className="font-display text-lg font-bold tracking-[0.25em] text-ink">UHOS</span>
        </div>

        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight text-ink">
            Every district,
            <br />
            one unified pulse.
          </h2>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-ink-muted">
            "The best care happens when every facility, doctor, and citizen can see
            the same truth at the same time."
          </p>
        </div>

        <p className="relative text-xs text-ink-faint">
          Unified Healthcare Operating System — District Command Center
        </p>
      </div>

      {/* Right — login form */}
      <div className="flex flex-col items-center justify-center bg-base px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/30 bg-accent-soft">
              <HeartPulse className="h-5 w-5 text-accent" strokeWidth={2} />
            </span>
            <span className="font-display text-lg font-bold tracking-[0.25em] text-ink">UHOS</span>
          </div>

          <h1 className="text-xl font-semibold text-ink">{t("login.title")}</h1>
          <p className="mt-1.5 text-sm text-ink-muted">{t("login.subtitle")}</p>

          <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="mb-1.5 block text-xs font-medium text-ink-muted">
                {t("login.username")}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md border border-panel-border bg-panel px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent/60"
                placeholder="e.g. doctor01"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-ink-muted">
                {t("login.password")}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-panel-border bg-panel px-3 py-2.5 pr-10 text-sm text-ink outline-none transition-colors focus:border-accent/60"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={t("login.showPassword")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.75} /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-ink-muted">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-panel-border bg-panel accent-accent"
                />
                {t("login.rememberMe")}
              </label>
              <span
                aria-disabled
                title={t("login.forgotPasswordDisabledHint")}
                className="cursor-not-allowed text-ink-faint"
              >
                {t("login.forgotPassword")}
              </span>
            </div>

            {error && (
              <p role="alert" className="rounded-md border border-status-critical/30 bg-status-critical-soft px-3 py-2 text-xs text-status-critical">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-base transition-transform hover:scale-[1.01] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" strokeWidth={2} />
              {submitting ? t("login.loggingIn") : t("login.loginButton")}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between">
            <label htmlFor="login-language" className="flex items-center gap-1.5 text-xs text-ink-muted">
              <Globe className="h-3.5 w-3.5 text-ink-faint" strokeWidth={1.75} aria-hidden />
              <select
                id="login-language"
                aria-label={t("language.label")}
                value={language}
                onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                className="cursor-pointer rounded-md border border-panel-border bg-transparent px-1.5 py-1 text-xs text-ink-muted outline-none hover:border-accent/50"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {t(`language.${lang}`)}
                  </option>
                ))}
              </select>
            </label>
            <Link href="/" className="text-xs text-ink-faint hover:text-ink-muted">
              {t("login.backToHome")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
