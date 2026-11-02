// ==========================================
// 🖼️ GALERIA DE FOTOS (tela cheia, com zoom)
// ==========================================
// Usada no painel e na vitrine dos vendedores, por isso não depende de nada do resto do sistema.
// Celular: arraste para o lado para trocar de foto, pinça ou dois toques para dar zoom, arraste para mover.
// Computador: setas do teclado, rodinha do mouse ou dois cliques para o zoom, Esc fecha.
// O botão "voltar" do Android fecha a galeria em vez de sair do app.
//
//   abrirGaleria({ fotos: [url, ...], indice: 0, titulo: 'Nome', nota: 'texto pequeno',
//                  botoes: [{ rotulo, icone, classe, mostrar(i, fotos), acao(i, fotos) }] })
//   galeriaAtualizar(fotos, indice)  → depois de adicionar/tirar fotos com a galeria aberta
//   fecharGaleria()
(() => {
const CSS = `
.gal { position:fixed; inset:0; z-index:20000; background:#0c0a09; color:#fff; display:flex; flex-direction:column; font-family:inherit; animation:galEntra .18s ease; -webkit-user-select:none; user-select:none; }
.gal[hidden] { display:none; }
@keyframes galEntra { from { opacity:0; } to { opacity:1; } }
.gal-topo { display:flex; align-items:center; gap:10px; padding:calc(10px + env(safe-area-inset-top)) 12px 8px 16px; }
.gal-tit { flex:1; min-width:0; }
.gal-tit b { display:block; font-size:.95rem; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.gal-tit span { display:block; font-size:.76rem; color:#a8a29e; font-weight:600; margin-top:1px; }
.gal-x { width:42px; height:42px; border-radius:50%; border:none; background:rgba(255,255,255,.12); color:#fff; font-size:1.7rem; line-height:1; cursor:pointer; flex-shrink:0; font-family:inherit; }
.gal-palco { position:relative; flex:1; min-height:0; overflow:hidden; touch-action:none; display:flex; align-items:center; justify-content:center; cursor:zoom-in; }
.gal-palco.ampliada { cursor:grab; }
.gal-img { max-width:100%; max-height:100%; object-fit:contain; transform-origin:center center; transition:transform .18s ease-out, opacity .15s; -webkit-user-drag:none; pointer-events:none; }
.gal-img.livre { transition:none; }
.gal-img.trocando { opacity:.25; }
.gal-seta { position:absolute; top:50%; transform:translateY(-50%); width:46px; height:46px; border-radius:50%; border:none; background:rgba(255,255,255,.14); color:#fff; font-size:1.9rem; line-height:1; cursor:pointer; font-family:inherit; }
.gal-seta:hover { background:rgba(255,255,255,.26); }
.gal-seta.ant { left:12px; } .gal-seta.prox { right:12px; }
@media (hover:none) { .gal-seta { display:none; } }
.gal-dica { position:absolute; bottom:12px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,.6); padding:7px 13px; border-radius:20px; font-size:.76rem; font-weight:600; color:#e7e5e4; pointer-events:none; white-space:nowrap; opacity:0; transition:opacity .4s; }
.gal-dica.ver { opacity:1; }
.gal-mini { display:flex; gap:8px; overflow-x:auto; padding:10px 12px 6px; scrollbar-width:none; }
.gal-mini::-webkit-scrollbar { display:none; }
.gal-mini:empty { display:none; }
.gal-mini > :first-child { margin-left:auto; } .gal-mini > :last-child { margin-right:auto; }
.gal-mini button { position:relative; width:56px; height:56px; border-radius:10px; overflow:hidden; border:2px solid transparent; padding:0; background:#292524; flex-shrink:0; opacity:.55; cursor:pointer; }
.gal-mini button.ativa { border-color:#f59e0b; opacity:1; }
.gal-mini img { width:100%; height:100%; object-fit:cover; display:block; }
.gal-mini em { position:absolute; left:0; right:0; bottom:0; background:rgba(217,119,6,.92); color:#fff; font-size:.5rem; font-weight:800; font-style:normal; text-transform:uppercase; text-align:center; padding:1px 0; overflow:hidden; }
.gal-acoes { display:flex; gap:8px; justify-content:center; flex-wrap:wrap; padding:6px 12px calc(14px + env(safe-area-inset-bottom)); }
.gal-acoes:empty { padding:0 0 calc(10px + env(safe-area-inset-bottom)); }
.gal-acoes button { display:inline-flex; align-items:center; gap:7px; border:1px solid rgba(255,255,255,.2); background:rgba(255,255,255,.08); color:#fff; padding:11px 15px; border-radius:12px; font:inherit; font-size:.86rem; font-weight:700; cursor:pointer; }
.gal-acoes button:hover { background:rgba(255,255,255,.16); }
.gal-acoes button.destaque { background:#d97706; border-color:#d97706; }
.gal-acoes button.perigo { color:#fca5a5; }
.gal-acoes svg { width:17px; height:17px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
`;
let el = null, img, palco, G = { fotos: [], i: 0, titulo: '', nota: '', botoes: [] }, aberta = false, naHistoria = false, overflowAntes = '';
const Z = { s: 1, x: 0, y: 0 }, toques = new Map();
let pinca = null, arrasto = null, ultimoToque = { t: 0, x: 0, y: 0 };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const limitarEscala = s => Math.min(5, Math.max(1, s));

function montar() {
    if (el) return;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    el = document.createElement('div'); el.className = 'gal'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<div class="gal-topo"><div class="gal-tit"><b></b><span></span></div><button type="button" class="gal-x" aria-label="Fechar">×</button></div>
        <div class="gal-palco"><img class="gal-img" alt="" draggable="false"><button type="button" class="gal-seta ant" aria-label="Foto anterior">‹</button><button type="button" class="gal-seta prox" aria-label="Próxima foto">›</button><div class="gal-dica">Dois toques ou pinça para dar zoom</div></div>
        <div class="gal-mini"></div><div class="gal-acoes"></div>`;
    document.body.appendChild(el);
    img = el.querySelector('.gal-img'); palco = el.querySelector('.gal-palco');
    el.querySelector('.gal-x').onclick = () => window.fecharGaleria();
    el.querySelector('.gal-seta.ant').onclick = e => { e.stopPropagation(); ir(G.i - 1); };
    el.querySelector('.gal-seta.prox').onclick = e => { e.stopPropagation(); ir(G.i + 1); };
    img.onload = () => img.classList.remove('trocando');
    img.onerror = () => { img.classList.remove('trocando'); if (!/logo\.png$/.test(img.src)) img.src = 'logo.png'; };
    palco.addEventListener('pointerdown', aoTocar);
    palco.addEventListener('pointermove', aoMover);
    palco.addEventListener('pointerup', aoSoltar);
    palco.addEventListener('pointercancel', aoSoltar);
    palco.addEventListener('wheel', e => { e.preventDefault(); const c = centro(e.clientX, e.clientY); zoomEm(Z.s * (e.deltaY < 0 ? 1.25 : 0.8), c.x, c.y, true); }, { passive: false });
    document.addEventListener('keydown', e => {
        if (!aberta) return;
        if (e.key === 'Escape') window.fecharGaleria();
        else if (e.key === 'ArrowLeft') ir(G.i - 1);
        else if (e.key === 'ArrowRight') ir(G.i + 1);
    });
    window.addEventListener('popstate', () => { if (aberta) fechar(); });
    window.addEventListener('resize', () => { if (aberta) { limitar(); aplicar(false); } });
}

// ---------- ZOOM E ARRASTO ----------
// (x, y) = deslocamento da foto a partir do centro do palco; o ponto tocado continua embaixo do dedo
const centro = (cx, cy) => { const r = palco.getBoundingClientRect(); return { x: cx - (r.left + r.width / 2), y: cy - (r.top + r.height / 2) }; };
function aplicar(animar) {
    img.classList.toggle('livre', !animar);
    img.style.transform = `translate(${Z.x}px, ${Z.y}px) scale(${Z.s})`;
    palco.classList.toggle('ampliada', Z.s > 1.01);
}
function limitar() {
    const r = palco.getBoundingClientRect();
    const mx = Math.max(0, (img.offsetWidth * Z.s - r.width) / 2), my = Math.max(0, (img.offsetHeight * Z.s - r.height) / 2);
    Z.x = Math.min(mx, Math.max(-mx, Z.x)); Z.y = Math.min(my, Math.max(-my, Z.y));
}
function zoomEm(s, cx, cy, animar) {
    s = limitarEscala(s); const k = s / Z.s;
    Z.x = cx - (cx - Z.x) * k; Z.y = cy - (cy - Z.y) * k; Z.s = s;
    if (s <= 1.01) { Z.s = 1; Z.x = 0; Z.y = 0; }
    limitar(); aplicar(animar);
}
const zerarZoom = () => { Z.s = 1; Z.x = 0; Z.y = 0; aplicar(false); };
const distancia = () => { const [a, b] = [...toques.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
const meio = () => { const [a, b] = [...toques.values()]; return centro((a.x + b.x) / 2, (a.y + b.y) / 2); };

function aoTocar(e) {
    if (e.target.closest('.gal-seta')) return;
    try { palco.setPointerCapture(e.pointerId); } catch (erro) { /* dedo já saiu da tela */ }
    toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (toques.size === 2) { pinca = { d: distancia(), s: Z.s, x: Z.x, y: Z.y, c: meio() }; arrasto = null; }
    else if (toques.size === 1) arrasto = { x: e.clientX, y: e.clientY, zx: Z.x, zy: Z.y, t: Date.now(), moveu: false };
}
function aoMover(e) {
    if (!toques.has(e.pointerId)) return;
    toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinca && toques.size >= 2) {
        const s = limitarEscala(pinca.s * distancia() / pinca.d), c = meio(), k = s / pinca.s;
        Z.s = s; Z.x = c.x - (pinca.c.x - pinca.x) * k; Z.y = c.y - (pinca.c.y - pinca.y) * k;
        limitar(); aplicar(false); return;
    }
    if (!arrasto) return;
    const dx = e.clientX - arrasto.x, dy = e.clientY - arrasto.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) arrasto.moveu = true;
    if (Z.s > 1.01) { Z.x = arrasto.zx + dx; Z.y = arrasto.zy + dy; limitar(); aplicar(false); }
    else if (G.fotos.length > 1) { Z.x = dx * 0.7; aplicar(false); } // prévia do arrastar para o lado
}
function aoSoltar(e) {
    if (!toques.has(e.pointerId)) return;
    toques.delete(e.pointerId);
    if (pinca) {
        if (toques.size < 2) { pinca = null; if (Z.s <= 1.05) { Z.s = 1; Z.x = 0; Z.y = 0; aplicar(true); } }
        // continua arrastando com o dedo que ficou
        if (toques.size === 1) { const [t] = toques.values(); arrasto = { x: t.x, y: t.y, zx: Z.x, zy: Z.y, t: Date.now(), moveu: true }; }
        return;
    }
    const a = arrasto; arrasto = null; if (!a) return;
    const dx = e.clientX - a.x, dy = e.clientY - a.y;
    if (Z.s <= 1.01) {
        if (G.fotos.length > 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) return ir(G.i + (dx < 0 ? 1 : -1));
        Z.x = 0; aplicar(true);
    }
    // Dois toques rápidos no mesmo lugar: aproxima ali (ou volta ao normal)
    if (!a.moveu && Date.now() - a.t < 300) {
        const agora = Date.now();
        if (agora - ultimoToque.t < 320 && Math.hypot(e.clientX - ultimoToque.x, e.clientY - ultimoToque.y) < 30) {
            ultimoToque.t = 0;
            if (Z.s > 1.01) { Z.s = 1; Z.x = 0; Z.y = 0; aplicar(true); } else { const c = centro(e.clientX, e.clientY); zoomEm(2.5, c.x, c.y, true); }
        } else ultimoToque = { t: agora, x: e.clientX, y: e.clientY };
    }
}

// ---------- TELA ----------
function ir(i) {
    const n = G.fotos.length; if (!n) return;
    G.i = ((i % n) + n) % n;
    zerarZoom();
    if (img.getAttribute('src') !== G.fotos[G.i]) { img.classList.add('trocando'); img.src = G.fotos[G.i]; }
    [G.i + 1, G.i - 1].forEach(j => { const u = G.fotos[((j % n) + n) % n]; if (u) new Image().src = u; }); // já baixa as vizinhas
    desenhar();
}
function desenhar() {
    const n = G.fotos.length;
    el.querySelector('.gal-tit b').textContent = G.titulo || 'Fotos';
    el.querySelector('.gal-tit span').textContent = [n > 1 ? `Foto ${G.i + 1} de ${n}` : '', G.nota].filter(Boolean).join(' · ');
    el.querySelectorAll('.gal-seta').forEach(b => { b.hidden = n < 2; });
    const mini = el.querySelector('.gal-mini');
    mini.innerHTML = n > 1 ? G.fotos.map((f, j) => `<button type="button" class="${j === G.i ? 'ativa' : ''}" data-j="${j}" aria-label="Foto ${j + 1}"><img src="${esc(f)}" alt="" loading="lazy">${j === 0 && G.marcarPrincipal ? '<em>principal</em>' : ''}</button>`).join('') : '';
    mini.querySelectorAll('button').forEach(b => { b.onclick = () => ir(+b.dataset.j); });
    const ativa = mini.querySelector('.ativa'); if (ativa) ativa.scrollIntoView({ block: 'nearest', inline: 'center' });
    const acoes = el.querySelector('.gal-acoes');
    const visiveis = (G.botoes || []).filter(b => !b.mostrar || b.mostrar(G.i, G.fotos));
    acoes.innerHTML = visiveis.map((b, j) => `<button type="button" class="${esc(b.classe || '')}" data-j="${j}">${b.icone || ''}${esc(b.rotulo)}</button>`).join('');
    acoes.querySelectorAll('button').forEach(bt => { bt.onclick = () => visiveis[+bt.dataset.j].acao(G.i, G.fotos.slice()); });
}

window.abrirGaleria = function(op) {
    montar();
    G = { fotos: (op.fotos || []).filter(Boolean), i: 0, titulo: op.titulo || '', nota: op.nota || '', botoes: op.botoes || [], marcarPrincipal: !!op.marcarPrincipal };
    if (!G.fotos.length) return;
    if (!aberta) {
        aberta = true; el.hidden = false;
        overflowAntes = document.body.style.overflow; document.body.style.overflow = 'hidden';
        try { history.pushState({ galeriaMM: 1 }, ''); naHistoria = true; } catch (e) { naHistoria = false; }
        // Dica de zoom só nas primeiras vezes
        let vezes = 0; try { vezes = +localStorage.getItem('mm_galeria_dica') || 0; localStorage.setItem('mm_galeria_dica', vezes + 1); } catch (e) { /* sem armazenamento */ }
        const dica = el.querySelector('.gal-dica'); dica.classList.toggle('ver', vezes < 3); setTimeout(() => dica.classList.remove('ver'), 2600);
    }
    img.removeAttribute('src');
    ir(op.indice || 0);
};
window.galeriaAtualizar = function(fotos, indice) {
    if (!aberta) return;
    G.fotos = (fotos || []).filter(Boolean);
    if (!G.fotos.length) return window.fecharGaleria();
    ir(indice === undefined ? Math.min(G.i, G.fotos.length - 1) : indice);
};
window.galeriaAberta = () => aberta;
function fechar() {
    if (!aberta) return;
    aberta = false; naHistoria = false; el.hidden = true; toques.clear(); pinca = null; arrasto = null;
    document.body.style.overflow = overflowAntes;
}
// Fechar pelo X/Esc volta uma posição no histórico (a que a galeria criou); o "voltar" do celular cai no mesmo lugar
window.fecharGaleria = function() {
    if (!aberta) return;
    if (naHistoria && history.state && history.state.galeriaMM) history.back(); else fechar();
};
})();
