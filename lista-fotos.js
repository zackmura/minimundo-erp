// ==========================================
// 🖼️ LISTAS DE ESCOLHA COM FOTO
// ==========================================
// Todo <select data-fotos> vira um botão com a foto e o nome do que está escolhido; tocar abre a lista com
// foto, nome, detalhe (data-sub) e busca. Cada <option> traz a foto em data-foto.
// O <select> continua na página, escondido: o valor, o onchange e o resto do sistema funcionam igual.
(() => {
// Próprio daqui: este arquivo carrega antes dos outros e as listas da página já são montadas ao abrir
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
window.primeiraFotoMM = f => String(f || '').split(',')[0].trim();
const vazia = o => !o || o.value === '' || o.value === '0';
function miniatura(o) {
    const f = o && o.dataset.foto;
    return `<span class="lf-foto">${f ? `<img src="${esc(f)}" alt="" loading="lazy" onerror="this.src='logo.png'">` : `<i>${vazia(o) ? '—' : '📦'}</i>`}</span>`;
}
const textos = o => `<span class="lf-txt"><b>${esc(o ? o.text : 'Escolher…')}</b>${o && o.dataset.sub ? `<small>${esc(o.dataset.sub)}</small>` : ''}</span>`;
function rotuloDe(sel) {
    if (sel.dataset.titulo) return sel.dataset.titulo;
    const l =(sel.id && document.querySelector(`label[for="${sel.id}"]`)) || (sel.closest('.input-group') || {}).querySelector?.('label');
    if (!l) return 'Escolha';
    const c = l.cloneNode(true); c.querySelectorAll('small').forEach(x => x.remove());
    return c.textContent.trim() || 'Escolha';
}
function pintar(sel) {
    const bt = sel._lfBotao; if (!bt) return;
    const o = sel.options[sel.selectedIndex];
    bt.innerHTML = `${miniatura(o)}${textos(o)}${window.ic('seta-dir', 'lf-seta')}`;
    bt.disabled = sel.disabled;
}
function enfeitar(sel) {
    if (sel._lfBotao) return;
    const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'lf-botao';
    sel.after(bt); sel.classList.add('lf-nativo'); sel._lfBotao = bt; sel.tabIndex = -1;
    // A busca que ficava em cima da lista sai: a lista com foto tem busca própria
    const busca = sel.previousElementSibling;
    if (busca && busca.classList.contains('busca-select')) { busca.value = ''; busca.hidden = true; }
    bt.onclick = () => abrir(sel);
    // O valor também muda pelo código (sel.value = …): o botão acompanha
    const d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    Object.defineProperty(sel, 'value', { configurable: true, get() { return d.get.call(this); }, set(v) { d.set.call(this, v); pintar(this); } });
    sel.addEventListener('change', () => pintar(sel));
    new MutationObserver(() => pintar(sel)).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['selected', 'disabled'] });
    pintar(sel);
}

let aberta = null;
function fechar() {
    if (!aberta) return;
    const { fundo, sel } = aberta; aberta = null;
    fundo.remove(); document.removeEventListener('keydown', teclas, true);
    if (sel._lfBotao && document.body.contains(sel._lfBotao)) sel._lfBotao.focus({ preventScroll: true });
}
function teclas(e) { if (e.key === 'Escape') { e.stopPropagation(); fechar(); } }
function abrir(sel) {
    fechar();
    const opcoes = [...sel.options].filter(o => !(o.disabled && vazia(o)));
    const fundo = document.createElement('div'); fundo.className = 'lf-fundo';
    fundo.innerHTML = `<div class="lf-folha" role="dialog" aria-modal="true" aria-label="${esc(rotuloDe(sel))}">
        <div class="lf-cab"><b>${esc(rotuloDe(sel))}</b><button type="button" class="lf-fechar" aria-label="Fechar">${window.ic('x')}</button></div>
        ${opcoes.length > 7 ? `<div class="lf-busca">${window.ic('busca')}<input type="search" placeholder="Buscar…" autocomplete="off" aria-label="Buscar"></div>` : ''}
        <div class="lf-lista" role="listbox"></div></div>`;
    document.body.appendChild(fundo);
    aberta = { fundo, sel };
    const lista = fundo.querySelector('.lf-lista'), busca = fundo.querySelector('.lf-busca input');
    const desenhar = () => {
        const t = busca ? busca.value : '';
        const vis = opcoes.filter(o => vazia(o) ? !t.trim() : window.buscaBate(t, o.text, o.dataset.sub || ''));
        lista.innerHTML = vis.map(o => { const on = o.value === sel.value;
            return `<button type="button" role="option" aria-selected="${on}" class="lf-op ${on ? 'on' : ''}" data-v="${esc(o.value)}" ${o.disabled ? 'disabled' : ''}>${miniatura(o)}${textos(o)}${on ? window.ic('check', 'lf-ok') : ''}</button>`; }).join('')
            || `<p class="lf-vazio">Nada encontrado para "${esc(t)}"</p>`;
    };
    desenhar();
    lista.onclick = e => {
        const b = e.target.closest('.lf-op'); if (!b || b.disabled) return;
        const mudou = sel.value !== b.dataset.v;
        sel.value = b.dataset.v; fechar();
        if (mudou) { sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); }
    };
    if (busca) { busca.oninput = desenhar; if (!matchMedia('(pointer:coarse)').matches) busca.focus(); }
    fundo.querySelector('.lf-fechar').onclick = fechar;
    fundo.addEventListener('click', e => { if (e.target === fundo) fechar(); });
    document.addEventListener('keydown', teclas, true);
    const on = lista.querySelector('.lf-op.on'); if (on) on.scrollIntoView({ block: 'center' });
}

// Lista com foto sem <select> na página: escolherComFotos({ titulo, opcoes: [{ v, t, f, s }], aoEscolher(v) })
window.escolherComFotos = function(o) {
    const sel = document.createElement('select'); sel.dataset.titulo = o.titulo || 'Escolher';
    sel.innerHTML = (o.opcoes || []).map(x => `<option value="${esc(x.v)}"${x.f ? ` data-foto="${esc(x.f)}"` : ''}${x.s ? ` data-sub="${esc(x.s)}"` : ''}>${esc(x.t)}</option>`).join('');
    sel.value = '';
    sel.addEventListener('change', () => { if (sel.value) o.aoEscolher(sel.value); });
    abrir(sel);
};

// Procura listas novas (as janelas são montadas na hora)
let agendado = false;
const procurar = () => { agendado = false; document.querySelectorAll('select[data-fotos]').forEach(enfeitar); };
new MutationObserver(() => { if (!agendado) { agendado = true; requestAnimationFrame(procurar); } }).observe(document.body, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', procurar); else setTimeout(procurar);
})();
