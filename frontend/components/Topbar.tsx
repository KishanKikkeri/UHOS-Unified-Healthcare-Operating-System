"use client";

import { useRouter } from "next/navigation";
import { CircleUser, Globe, LogOut } from "lucide-react";
import PulseStatus from "./PulseStatus";
import {
  SUPPORTED_LANGUAGES,
  useLanguage,
  type SupportedLanguage,
} from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { ROLE_LABELS } from "@/lib/rbac";

interface TopbarProps {
  district: string;
  live: boolean;
  section?: string;
  showPulse?: boolean;
}

export default function Topbar({
  district,
  live,
  section,
  showPulse = true,
}: TopbarProps) {
  const { language, setLanguage, t } = useLanguage();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-panel-border bg-base/95 px-5 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="font-display text-sm font-bold tracking-[0.2em] text-ink">
          {t("common.appName")}
        </span>
        <span className="h-4 w-px bg-panel-border" aria-hidden />
        <span className="text-sm text-ink-muted">
          {section ?? t("common.districtCommandCenter")}
        </span>
      </div>

      <div className="flex items-center gap-5">
        {showPulse && <PulseStatus live={live} />}
        <span className="h-4 w-px bg-panel-border" aria-hidden />

        <label htmlFor="language-select" className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
          <Globe className="h-3.5 w-3.5 text-ink-faint" strokeWidth={1.75} aria-hidden />
          <span className="sr-only">{t("language.label")}</span>
          <select
            id="language-select"
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

        <span className="h-4 w-px bg-panel-border" aria-hidden />
        <span className="text-xs font-medium text-ink-muted">{district}</span>

        {user && (
          <>
            <span className="h-4 w-px bg-panel-border" aria-hidden />
            <div className="flex items-center gap-2">
              <CircleUser className="h-5 w-5 text-ink-faint" strokeWidth={1.5} />
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-medium text-ink">{user.full_name}</span>
                <span className="flex items-center gap-1 text-[10px] text-ink-faint">
                  <span className="rounded bg-accent-soft px-1.5 py-0.5 font-medium text-accent">
                    {ROLE_LABELS[user.role]}
                  </span>
                  {user.facility_name && <span>{user.facility_name}</span>}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                aria-label={t("topbar.logout")}
                title={t("topbar.logout")}
                className="ml-1 flex items-center gap-1 rounded-md px-2 py-1 text-xs text-ink-muted transition-colors hover:bg-panel-hover hover:text-status-critical"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
