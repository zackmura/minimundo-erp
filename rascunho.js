// ==========================================
// 📝 RASCUNHO DOS CADASTROS
// ==========================================
// No celular, abrir a câmera ou a galeria pode fazer o navegador fechar a página para liberar memória.
// Ela voltava do zero e tudo o que estava digitado sumia. Agora cada cadastro guarda neste aparelho
// o que você digita e, quando a página reabre, tudo volta (direto na mesma tela, se foi agora há pouco).
(() => {
const $ = window.$;
const CHAVE = 'mm_rascunho_';
const VALIDADE_H = 72;  // rascunho mais velho que isso é descartado
const VOLTA_MIN = 30;   // a página saiu de um cadastro há menos tempo que isso: reabre direto nele
const cheio = id => { const el = $(id); return !!(el && String(el.value || '').trim()); };

const FORMS = {
    precificar: {
        raiz: 'pf-form', aba: 'precificar', titulo: 'o cadastro do produto',
        extra: () => ({ tipo: PF.tipo, editando: PF.editando, kit: PF.kit, fotoUrl: PF.fotoUrl }),
        temAlgo: () => PF.editando || PF.kit.length || PF.fotoUrl || ['pf-nome', 'pf-categoria', 'pf-peso', 'pf-tempo', 'pf-venda', 'pf-repasse'].some(cheio),
        antes: (x, carregou) => {
            if (x.editando) {
                const p = (window.arrayBancoCustos || []).find(p => p.linha === x.editando);
                // Produto excluído: o rascunho não serve mais. Lista que não chegou (internet ruim): guarda para a próxima vez
                if (!p) return carregou ? false : 'depois';
                window.pfCarregarProduto(p);
            } else { window.pfLimpar(true); window.pfTipo(x.tipo === 'kit' ? 'kit' : 'peca'); }
        },
        depois: x => {
            if (PF.tipo === 'kit') PF.kit = (x.kit || []).filter(i => i && i.produto_id).map(i => ({ produto_id: +i.produto_id, qtd: Math.max(1, +i.qtd || 1) }));
            if (x.fotoUrl) { PF.fotoUrl = x.fotoUrl; $('pf-foto-img').src = x.fotoUrl; }
            window.pfFotoEstado(); $('pf-filamento').dataset.mexeu = '1';
            window.pfRenderKit(); window.pfCalcular();
        },
        limpar: () => window.pfLimpar()
    },
    loja: { raiz: 'form-vitrine', aba: 'loja', titulo: 'o produto da vitrine', temAlgo: () => ['prod-nome', 'prod-preco'].some(cheio) },
    imas: { raiz: 'form-ima', aba: 'imas', titulo: 'o ímã', temAlgo: () => ['ima-id', 'ima-nomes', 'ima-video', 'ima-data'].some(cheio) }
};

const campos = raiz => [...raiz.querySelectorAll('input[id], select[id], textarea[id]')].filter(el => !['file', 'button', 'submit', 'hidden', 'password'].includes(el.type));
const ler = nome => { try { return JSON.parse(localStorage.getItem(CHAVE + nome) || 'null'); } catch (e) { return null; } };
const timers = {}, mexeu = {};
let restaurado = false;

window.rascunhoGuardar = function(nome) {
    const F = FORMS[nome], raiz = F && $(F.raiz); if (!raiz) return;
    clearTimeout(timers[nome]); timers[nome] = null;
    if (!F.temAlgo()) return window.rascunhoApagar(nome);
    const valores = {};
    campos(raiz).forEach(el => { valores[el.id] = el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value; });
    try { localStorage.setItem(CHAVE + nome, JSON.stringify({ ts: Date.now(), campos: valores, extra: F.extra ? F.extra() : null })); }
    catch (e) { /* aparelho sem espaço: segue sem rascunho */ }
};
window.rascunhoApagar = function(nome) {
    clearTimeout(timers[nome]); timers[nome] = null;
    try { localStorage.removeItem(CHAVE + nome); } catch (e) { /* sem acesso ao armazenamento */ }
    const aviso = $('rasc-aviso-' + nome); if (aviso) aviso.remove();
};
window.rascunhoApagarTodos = () => Object.keys(FORMS).forEach(window.rascunhoApagar);

// Guarda um pouquinho depois de cada digitação ou toque dentro de um cadastro
const formDe = el => { for (const [nome, F] of Object.entries(FORMS)) { const r = $(F.raiz); if (r && r.contains(el)) return nome; } return null; };
['input', 'change', 'click'].forEach(tipo => document.addEventListener(tipo, e => {
    const nome = e.target && e.target.nodeType === 1 ? formDe(e.target) : null; if (!nome) return;
    if (!restaurado) { if (tipo === 'click') return; mexeu[nome] = true; } // digitou antes de recuperar: vale o que está digitando agora
    clearTimeout(timers[nome]); timers[nome] = setTimeout(() => window.rascunhoGuardar(nome), 400);
}, true));
// A página vai para o fundo (abriu a câmera, a galeria ou outro app): guarda na hora o que faltava e em qual tela estava
const abaAtiva = () => { const t = document.querySelector('.tab-content.active'); return t ? t.id.replace('tab-', '') : ''; };
function aoSair() {
    Object.keys(timers).forEach(nome => { if (timers[nome]) { window.rascunhoGuardar(nome); timers[nome] = null; } });
    if (restaurado) try { localStorage.setItem(CHAVE + 'aba', JSON.stringify({ aba: abaAtiva(), ts: Date.now() })); } catch (e) { /* sem espaço */ }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') aoSair(); });
window.addEventListener('pagehide', aoSair);

// ---------- RECUPERAR ----------
function aplicar(raiz, valores) {
    Object.entries(valores || {}).forEach(([id, v]) => {
        const el = $(id); if (!el || !raiz.contains(el)) return;
        if (el.type === 'checkbox' || el.type === 'radio') { el.checked = !!v; return; }
        // Lista que ainda não carregou: põe a opção provisória para não perder a escolha (a lista completa a mantém)
        if (el.tagName === 'SELECT' && v !== '' && ![...el.options].some(o => o.value === String(v))) el.add(new Option(String(v), String(v)));
        el.value = v;
    });
}
function zerar(raiz) {
    raiz.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.type === 'checkbox' || el.type === 'radio') el.checked = el.defaultChecked;
        else if (el.tagName === 'SELECT') el.selectedIndex = 0;
        else if (el.type !== 'button' && el.type !== 'submit') el.value = el.type === 'file' ? '' : el.defaultValue;
    });
}
function avisar(nome, F) {
    const raiz = $(F.raiz); if (!raiz || $('rasc-aviso-' + nome)) return;
    const d = document.createElement('div'); d.className = 'rascunho-aviso'; d.id = 'rasc-aviso-' + nome;
    d.innerHTML = `${window.ic('desfazer')}<span>Recuperei o que você tinha digitado aqui.</span><button type="button">Começar do zero</button>`;
    d.querySelector('button').onclick = () => { if (F.limpar) F.limpar(); else zerar(raiz); window.rascunhoApagar(nome); };
    raiz.prepend(d);
}
function restaurar(carregou) {
    restaurado = true;
    const saiu = ler('aba'); let volta = null;
    Object.entries(FORMS).forEach(([nome, F]) => {
        const r = ler(nome), raiz = $(F.raiz); if (!r || !raiz || mexeu[nome]) return;
        if (!r.ts || Date.now() - r.ts > VALIDADE_H * 3600e3) return window.rascunhoApagar(nome);
        try {
            const ok = F.antes ? F.antes(r.extra || {}, carregou) : true;
            if (ok === false) return window.rascunhoApagar(nome);
            if (ok === 'depois') return;
            aplicar(raiz, r.campos);
            if (F.depois) F.depois(r.extra || {});
        } catch (e) { console.warn('Rascunho não recuperado:', nome, e); return; }
        avisar(nome, F);
        // Só reabre direto nesta tela se foi nela que a página saiu, agora há pouco
        if (saiu && saiu.aba === F.aba && Date.now() - saiu.ts < VOLTA_MIN * 60e3) volta = { aba: F.aba, titulo: F.titulo };
    });
    if (volta) { window.switchTab(volta.aba); window.toastMM(`Recuperei ${volta.titulo} que você estava digitando`); }
}

// Recupera depois que o painel do Admin carregou produtos, ajustes e vitrine (ou após 15 s, o que vier antes)
// As listas começam vazias e são trocadas por novas quando chegam do servidor: é assim que se sabe que chegaram
const listas = () => [window.arrayBancoCustos, window.configMM, window.catalogoAdminArray];
const iniciar = window.iniciarApp;
window.iniciarApp = function() {
    const vazias = listas();
    iniciar.apply(this, arguments);
    const t0 = Date.now();
    (function esperar() {
        const carregou = listas().every((v, i) => v && v !== vazias[i]);
        if (carregou || Date.now() - t0 > 15000) restaurar(carregou); else setTimeout(esperar, 250);
    })();
};
})();
