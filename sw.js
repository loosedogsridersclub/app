// Cornice dell'app installata: tiene in memoria i propri file per aprirsi anche
// con rete lenta e mostrare l'avviso "nessuna connessione". I dati del club
// arrivano sempre da Apps Script e non passano da qui.
const VERSIONE = "ld-pwa-6";
const FILE = ["./", "./index.html", "./manifest.webmanifest", "./icona-192-v4.png", "./icona-512-v4.png", "./icona-maskable-512-v5.png", "./apple-touch-icon.png", "./favicon.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSIONE).then(function (c) { return c.addAll(FILE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (nomi) {
    return Promise.all(nomi.filter(function (n) { return n !== VERSIONE; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

// Prima la rete (così le modifiche arrivano subito), se manca si usa la copia
self.addEventListener("fetch", function (e) {
  const req = e.request;
  const url = new URL(req.url);
  // "?rete=" è il controllo della connessione fatto dalla pagina: va sempre in rete
  if (req.method !== "GET" || url.origin !== self.location.origin || url.searchParams.has("rete")) return;
  e.respondWith(fetch(req).then(function (r) {
    const copia = r.clone();
    caches.open(VERSIONE).then(function (c) { c.put(req, copia); });
    return r;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || caches.match("./index.html"); });
  }));
});
