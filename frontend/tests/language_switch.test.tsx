import { describe, it, expect } from "vitest";
import { screen, fireEvent, render } from "@testing-library/react";
import { vi } from "vitest";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { renderWithProviders } from "./test-utils";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
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
  it("updates the UI instantly when a new language is selected", () => {
    renderWithProviders(<Shell />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();

    const select = screen.getByLabelText("Language") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "hi" } });

    // Sidebar's "Dashboard" label should now render in Hindi.
    expect(screen.getByText("डैशबोर्ड")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("preserves the selection across a re-render (state, not remount)", () => {
    const { rerender } = render(
      <LanguageProvider>
        <Shell />
      </LanguageProvider>
    );

    const select = screen.getByLabelText("Language") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "kn" } });
    expect(screen.getByText("ಡ್ಯಾಶ್‌ಬೋರ್ಡ್")).toBeInTheDocument();

    rerender(
      <LanguageProvider>
        <Shell />
      </LanguageProvider>
    );
    expect(screen.getByText("ಡ್ಯಾಶ್‌ಬೋರ್ಡ್")).toBeInTheDocument();
  });
});
