import PocketBase from "pocketbase";

export const pb = new PocketBase("http://192.168.100.232:8090");

// Disable auto-cancellation to avoid issues with rapid navigation
pb.autoCancellation(false);

// Install a global fetch wrapper to add ngrok bypass header for ngrok URLs.
// This ensures the browser skips ngrok's warning page and fetches JSON directly.
if (!(globalThis as any).__ngrok_header_installed) {
  const _origFetch = (globalThis as any).fetch;
  if (_origFetch) {
    (globalThis as any).fetch = async (
      input: RequestInfo,
      init?: RequestInit,
    ) => {
      try {
        let url = typeof input === "string" ? input : (input as Request).url;
        if (typeof url === "string" && url.includes("ngrok")) {
          init = init || {};
          const existing = new Headers((init.headers as HeadersInit) || {});
          existing.set("ngrok-skip-browser-warning", "true");
          init.headers = existing;
        }
      } catch (e) {
        // ignore and continue with original fetch
      }
      return _origFetch(input, init);
    };
    (globalThis as any).__ngrok_header_installed = true;
  }
}

export default pb;
