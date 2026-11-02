// Avisos do pedido no celular do cliente (página loja). Só mostra a notificação: não guarda nada do site.
// O aviso chega vazio; aqui o celular pergunta ao servidor o que mudou e mostra "Pedido #12: está pronto!".
const API = new URL(self.location.href).searchParams.get('api') || 'https://bdfernando.alwaysdata.net/mmapi/api';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => event.waitUntil((async () => {
    let aviso = null;
    try {
        const sub = await self.registration.pushManager.getSubscription();
        const r = await (await fetch(API, { method: 'POST', body: JSON.stringify({ acao: 'avisos_novidades', endpoint: sub ? sub.endpoint : '' }) })).json();
        aviso = r && r.aviso;
    } catch (e) { /* sem internet: mostra o aviso genérico */ }
    const url = new URL(aviso && aviso.codigo ? `loja?pedido=${encodeURIComponent(aviso.codigo)}` : 'loja', self.registration.scope).href;
    await self.registration.showNotification(aviso ? aviso.titulo : 'Mini Mundo', {
        body: aviso ? aviso.texto : 'Seu pedido foi atualizado. Toque para ver.',
        icon: 'icone-192.png', badge: 'icone-192.png', tag: 'pedido-' + (aviso ? aviso.codigo : ''), renotify: true, data: { url }
    });
})()));

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const url = (event.notification.data || {}).url || new URL('loja', self.registration.scope).href;
    event.waitUntil((async () => {
        const abas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const aba = abas.find(c => c.url === url);
        if (aba) { await aba.focus(); aba.postMessage('atualizar'); return; }
        await self.clients.openWindow(url);
    })());
});
