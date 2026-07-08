"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { homeRouteFor, type Role } from "@/lib/rbac";
import { DEMO_ROLES } from "@/lib/demoMode";
import { ApiError } from "@/lib/api";

/**
 * Phase 12 — Demo Mode. One-click role login for hackathon judges: no
 * username, no password. Calls the same AuthContext.demoLogin() that
 * hits POST /auth/demo-login, then redirects exactly the way a normal
 * login does -- AuthGuard and the sidebar/topbar don't know or care that
 * this session didn't come from the /login form.
 */
export default function RoleSelectionSection() {
  const { demoLogin } = useAuth();
  const router = useRouter();
  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (role: Role) => {
    setError(null);
    setPendingRole(role);
    try {
      const user = await demoLogin(role);
      router.replace(homeRouteFor(user.role));
    } catch (err) {
      setPendingRole(null);
      if (err instanceof ApiError && err.status === 403) {
        setError("Demo Mode is disabled on the backend. Set DEMO_MODE=true there too.");
      } else if (err instanceof ApiError && err.status === 404) {
        setError("That role's demo account isn't seeded yet. Run seed.demo_seed.");
      } else {
        setError("Something went wrong starting the demo session. Please try again.");
      }
    }
  };

  return (
    <section id="select-role" className="border-b border-panel-border px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-xl font-bold text-ink">Select Your Role</h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm text-ink-muted">
          One click, no credentials — jump straight into any workspace to explore UHOS.
        </p>

        {error && (
          <p role="alert" className="mx-auto mt-4 max-w-lg rounded-md border border-status-critical/30 bg-status-critical-soft px-3 py-2 text-center text-xs text-status-critical">
            {error}
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_ROLES.map(({ role, emoji, title, description }) => {
            const isPending = pendingRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => handleSelect(role)}
                disabled={pendingRole !== null}
                className="group flex flex-col items-start rounded-xl border border-panel-border bg-panel p-5 text-left shadow-panel transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="text-2xl" aria-hidden>
                  {emoji}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{description}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                      Entering…
                    </>
                  ) : (
                    <>
                      Enter Workspace
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
