"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Building2,
  AlertTriangle,
  Stethoscope,
  Users,
  BarChart3,
  HeartPulse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const NAV_ITEMS = [
  { key: "dashboard", icon: LayoutGrid, href: "/" },
  { key: "doctorWorkspace", icon: Stethoscope, href: "/doctor" },
  { key: "citizenApp", icon: HeartPulse, href: "/citizen" },
  { key: "facilities", icon: Building2, href: null },
  { key: "alerts", icon: AlertTriangle, href: null },
  { key: "patients", icon: Users, href: null },
  { key: "analytics", icon: BarChart3, href: null },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-panel-border bg-base px-3 py-4">
      {NAV_ITEMS.map(({ key, icon: Icon, href }) => {
        const label = t(`nav.${key}`);
        const active = href != null && pathname === href;
        const className = cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
          active
            ? "bg-panel text-ink"
            : href
              ? "text-ink-muted hover:bg-panel-hover hover:text-ink"
              : "cursor-not-allowed text-ink-faint"
        );

        if (!href) {
          return (
            <button key={key} type="button" disabled className={className}>
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {label}
            </button>
          );
        }

        return (
          <Link key={key} href={href} className={className}>
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
