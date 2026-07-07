import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent, render, waitFor } from "@testing-library/react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { renderWithProviders, withProviders, mockFetchRoutes, TEST_USERS } from "./test-utils";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
}));

function Shell() {
  return (
    <>
      <Topbar district="Mysuru District" live={false} />
      <Sidebar />
    </>
  );
}

describe("Language switching", () => {
  it("updates the UI instantly when a new language is selected", async () => {
    mockFetchRoutes({}, TEST_USERS.district_admin);
    renderWithProviders(<Shell />);

    // Phase 11: Sidebar only renders its items once AuthProvider resolves
    // the (mocked) session, one tick after the initial render.
    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument());

    const select = screen.getByLabelText("Language") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "hi" } });

    // Sidebar's "Dashboard" label should now render in Hindi.
    expect(screen.getByText("डैशबोर्ड")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("preserves the selection across a re-render (state, not remount)", async () => {
    mockFetchRoutes({}, TEST_USERS.district_admin);
    const { rerender } = render(withProviders(<Shell />));

    await waitFor(() => expect(screen.getByLabelText("Language")).toBeInTheDocument());

    const select = screen.getByLabelText("Language") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "kn" } });
    await waitFor(() => expect(screen.getByText("ಡ್ಯಾಶ್‌ಬೋರ್ಡ್")).toBeInTheDocument());

    rerender(withProviders(<Shell />));
    expect(screen.getByText("ಡ್ಯಾಶ್‌ಬೋರ್ಡ್")).toBeInTheDocument();
  });
});
