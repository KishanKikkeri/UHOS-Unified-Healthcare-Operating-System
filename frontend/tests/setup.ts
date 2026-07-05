import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

afterEach(() => {
  window.localStorage.clear();
});


// jsdom doesn't implement WebSocket or scrollIntoView; stub them so
// components that use lib/ws.ts or auto-scroll behavior don't throw
// during rendering in tests.
if (typeof window !== "undefined") {
  // @ts-expect-error -- minimal stub, tests don't assert on socket traffic
  window.WebSocket = class {
    onopen: (() => void) | null = null;
    onclose: (() => void) | null = null;
    onmessage: (() => void) | null = null;
    onerror: (() => void) | null = null;
    close() {}
    send() {}
  };

  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = () => {};
  }
}
