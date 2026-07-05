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

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutGrid, href: "/" },
  { label: "Doctor Workspace", icon: Stethoscope, href: "/doctor" },
  { label: "Citizen App", icon: HeartPulse, href: "/citizen" },
  { label: "Facilities", icon: Building2, href: null },
  { label: "Alerts", icon: AlertTriangle, href: null },
  { label: "Patients", icon: Users, href: null },
  { label: "Analytics", icon: BarChart3, href: null },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-panel-border bg-base px-3 py-4">
      {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
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
            <button key={label} type="button" disabled className={className}>
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {label}
            </button>
          );
        }

        return (
          <Link key={label} href={href} className={className}>
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
