"use client";

/**
 * Phase 11 — Authentication & RBAC.
 *
 * Wraps a protected page's content. Three states:
 *   1. Still resolving the session (`loading`) -> a blank/minimal loading
 *      screen, never a flash of protected content.
 *   2. No user -> redirect to /login (auto logout / not-logged-in case).
 *   3. Logged in but wrong role for this route -> redirect to that
 *      role's own home route, rather than a dead-end 403 page.
 *
 * Usage: wrap a page's returned JSX, e.g.
 *   export default function DashboardPage() {
 *     return <AuthGuard allowedRoles={["district_admin"]}>...</AuthGuard>;
 *   }
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { homeRouteFor, type Role } from "@/lib/rbac";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface AuthGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}

export default function AuthGuard({ allowedRoles, children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      router.replace(homeRouteFor(user.role));
    }
    // allowedRoles is a fresh array each render by design (inline literal
    // at each call site) -- depending on its contents would loop forever,
    // so intentionally depend on user/loading/router only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, router]);

  if (loading || !user || !allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-screen items-center justify-center bg-base">
        <p className="text-sm text-ink-muted">{t("common.loading")}</p>
      </div>
    );
  }

  return <>{children}</>;
}
