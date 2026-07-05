import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

/** Wraps a component under test with the same providers app/layout.tsx applies. */
export function renderWithProviders(ui: ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

/**
 * Installs a global.fetch mock that resolves based on which path substring
 * matches, so each test only has to declare the endpoints it actually
 * touches. Unmatched paths resolve to an empty array/object so unrelated
 * background polling in a component under test doesn't throw or hang.
 */
export function mockFetchRoutes(routes: Record<string, unknown>) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    const matches = Object.keys(routes).filter((path) => url.includes(path));
    // Prefer the most specific (longest) match so e.g. "/patients/1/history"
    // resolves against the "/history" route rather than the broader
    // "/patients" list route.
    const match = matches.sort((a, b) => b.length - a.length)[0];
    const body = match ? routes[match] : [];
    return {
      ok: true,
      status: 200,
      json: async () => body,
    } as Response;
  }) as unknown as typeof fetch;
}
