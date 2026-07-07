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
  ClipboardList,
  Pill,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { NAV_ACCESS } from "@/lib/rbac";

const NAV_ITEMS = [
  { key: "dashboard", icon: LayoutGrid, href: "/dashboard" },
  { key: "doctorWorkspace", icon: Stethoscope, href: "/doctor" },
  { key: "citizenApp", icon: HeartPulse, href: "/citizen" },
  { key: "facilities", icon: Building2, href: "/facilities" },
  { key: "alerts", icon: AlertTriangle, href: "/alerts" },
  { key: "patients", icon: Users, href: "/patients" },
  { key: "analytics", icon: BarChart3, href: "/analytics" },
  { key: "operations", icon: ClipboardList, href: "/operations" },
  { key: "inventory", icon: Pill, href: "/inventory" },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user } = useAuth();

  // Phase 11 — RBAC: only render nav entries the current role is allowed
  // to open. Per the handover doc, inaccessible routes are hidden
  // entirely, not shown-but-disabled.
  const visibleItems = NAV_ITEMS.filter(({ href }) => {
    const allowed = NAV_ACCESS[href];
    if (!allowed) return true;
    return user ? allowed.includes(user.role) : false;
  });

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-panel-border bg-base px-3 py-4">
      {visibleItems.map(({ key, icon: Icon, href }) => {
        const label = t(`nav.${key}`);
        const active = pathname === href;
        const className = cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
          active
            ? "bg-panel text-ink"
            : "text-ink-muted hover:bg-panel-hover hover:text-ink"
        );

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
