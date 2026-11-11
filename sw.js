// Cornice dell'app installata: tiene in memoria i propri file per aprirsi anche
// con rete lenta e mostrare l'avviso "nessuna connessione". I dati del club
// arrivano sempre da Apps Script e non passano da qui.
const VERSIONE = "ld-pwa-12";
const FILE = ["./", "./index.html", "./manifest.webmanifest", "./icona-192-v4.png", "./icona-512-v4.png", "./icona-maskable-512-v5.png", "./apple-touch-icon.png", "./favicon.png", "./badge-96.png"];

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

// ---------- notifiche sul telefono ----------
// Il server manda messaggi "dati" (titolo, testo, link): qui diventano la notifica.
self.addEventListener("push", function (e) {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (err) { p = { data: { testo: e.data ? e.data.text() : "" } }; }
  const d = p.data || p;
  const n = p.notification || {};
  const titolo = String(d.titolo || n.title || "Club");
  const opzioni = {
    body: String(d.testo || n.body || ""),
    icon: "icona-192-v4.png",
    badge: "badge-96.png",
    tag: String(d.tag || ""),
    renotify: !!d.tag,
    data: { link: String(d.link || "") }
  };
  if (!opzioni.tag) delete opzioni.tag;
  e.waitUntil(self.registration.showNotification(titolo, opzioni));
});

// Tocco sulla notifica: apre l'app (o la porta in primo piano) sulla pagina giusta
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  const link = String((e.notification.data && e.notification.data.link) || "");
  const url = new URL("./" + (/^[?][A-Za-z0-9=&:_-]*$/.test(link) ? link : ""), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (finestre) {
    for (const f of finestre) {
      if (f.url.indexOf(self.registration.scope) === 0 && "focus" in f) {
        return f.focus().then(function (ff) { return link && ff && ff.navigate ? ff.navigate(url) : ff; }).catch(function () { return self.clients.openWindow(url); });
      }
    }
    return self.clients.openWindow(url);
  }));
});
