/*
 * Cross-origin isolation for static hosts that cannot set response headers,
 * such as GitHub Pages.
 *
 * The app's in-browser SQLite database needs SharedArrayBuffer, which browsers
 * only allow on cross-origin isolated pages (the COOP and COEP headers). The dev
 * server sets those headers itself (metro.config.js); a static host cannot.
 *
 * This one file does both jobs. Loaded with a <script> tag, it registers itself
 * as a service worker and reloads the page once. Running as the service worker,
 * it adds the two headers to every response. Everything the app loads is
 * same-origin, so `require-corp` blocks nothing.
 */
if (typeof window === 'undefined') {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
  self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return;
    event.respondWith(
      fetch(request).then((response) => {
        if (response.status === 0) return response; // opaque: headers cannot be read or set
        const headers = new Headers(response.headers);
        headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
        headers.set('Cross-Origin-Opener-Policy', 'same-origin');
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }),
    );
  });
} else if (!window.crossOriginIsolated && window.isSecureContext && 'serviceWorker' in navigator) {
  // Reload at most once per tab, so a browser that cannot isolate never loops.
  const KEY = 'coi-reloaded';
  const reloadOnce = () => {
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, '1');
    } catch {
      return;
    }
    window.location.reload();
  };
  navigator.serviceWorker.register(document.currentScript.src).then((registration) => {
    if (registration.active && !navigator.serviceWorker.controller) reloadOnce();
    navigator.serviceWorker.addEventListener('controllerchange', reloadOnce);
  });
}
