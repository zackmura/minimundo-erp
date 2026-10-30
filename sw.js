// Service Worker do Mini Mundo: deixa o painel instalável no celular e abre mesmo com internet ruim.
// Estratégia "rede primeiro": sempre tenta a versão nova; o cache só é usado se estiver offline.
// Por isso nunca prende você numa versão velha. Chamadas para a API (outro domínio) passam direto.
const CACHE_NAME = 'minimundo-v4.0.0';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(nomes => Promise.all(nomes.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
    event.respondWith(
        fetch(req)
            .then(resp => {
                if (resp && resp.status === 200) { const copia = resp.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copia)); }
                return resp;
            })
            .catch(() => caches.match(req))
    );
});
