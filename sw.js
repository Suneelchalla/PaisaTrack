// PaisaTrack service worker — network-first for the app so updates apply immediately
var CACHE = 'paisatrack-v4';
var SHELL = ['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./favicon.ico'];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL).catch(function(){}); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  var isDoc = req.mode === 'navigate' || req.destination === 'document' || /\.html($|\?)/.test(req.url);
  if (isDoc) {
    // NETWORK-FIRST: always try to get the freshest index.html; fall back to cache offline
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){ return caches.match(req).then(function(m){ return m || caches.match('./index.html'); }); })
    );
  } else {
    // CACHE-FIRST for static assets (icons etc.), refresh in background
    e.respondWith(
      caches.match(req).then(function(cached){
        var net = fetch(req).then(function(res){ if(res&&res.status===200){var c=res.clone();caches.open(CACHE).then(function(cc){cc.put(req,c)})} return res; }).catch(function(){ return cached; });
        return cached || net;
      })
    );
  }
});
