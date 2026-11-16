// ==========================================
// 🔎 CONSULTA RÁPIDA DE PREÇO (lupa no topo de todas as telas) + ATALHOS DO INÍCIO
// ==========================================
// Na frente do cliente: digita "placa" e aparece a foto grande, o preço, o tamanho e onde está.
// "Modo cliente" esconde custo, repasse e estoque para virar o celular para a pessoa.
// Lê a etiqueta com QR Code pela câmera (Android/Chrome) e já mostra o produto.
// Para o vendedor: as peças da mala e os produtos do site dele, com o preço dele.
(() => {
const $ = window.$, esc = s => window.esc(s), ic = n => window.ic(n), fmt = v => window.fmt(v), val = v => window.limparValorPlanilha(v);
const vendedor = () => document.body.classList.contains('modo-vendedor');
const lerLocal = (k, p) => { try { const v = localStorage.getItem(k); return v === null ? p : JSON.parse(v); } catch (e) { return p; } };
const gravarLocal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };
window.CQ = { cliente: lerLocal('mm_cq_cliente', false), termo: '', lista: [], camera: null };
const fotosDe = p => (p.fotos && p.fotos.length ? p.fotos : String(p.foto || p.foto_catalogo || '').split(',')).map(s => String(s).trim()).filter(Boolean);
// Produtos para consultar, num formato só
async function produtosCQ() {
    if (vendedor()) {
        if (!window.painelVendedor) window.painelVendedor = await window.apiAcao('meu_painel');
        const d = window.painelVendedor, mala = d.estoque.map(e => ({ id: e.produto_id, nome: e.nome, fotos: e.fotos || [e.foto], preco: e.preco, repasse: e.repasse, medidas: e.medidas, categoria: e.categoria, comigo: e.qtd }));
        try {
            if (!window.MS || !window.MS.dados) { window.MS = window.MS || {}; window.MS.dados = await window.apiAcao('minha_loja'); }
            window.MS.dados.produtos.forEach(p => { if (!mala.some(m => m.id === p.id)) mala.push({ id: p.id, nome: p.nome, fotos: [p.foto].filter(Boolean), preco: p.preco, repasse: p.repasse, categoria: p.categoria, comigo: 0 }); });
        } catch (e) { /* sem site: só a mala */ }
        return mala;
    }
    if (!(window.arrayBancoCustos || []).length) await window.carregarBancoDeCustos();
    return (window.arrayBancoCustos || []).filter(p => p.ativo !== false).map(p => {
        const custo = val(p.custo_total), preco = window.precoVendaDe ? window.precoVendaDe(p) : val(p.preco_venda), horas = parseFloat(String(p.tempo || '').replace(',', '.')) || 0;
        return { id: p.linha, nome: p.modelo, fotos: fotosDe(p), preco, custo, repasse: p.preco_repasse, medidas: p.medidas, categoria: p.categoria, tipo: p.tipo, atelie: p.est_atelie || 0, vendedores: p.est_vendedores || 0, horas, porHora: horas > 0 && preco > 0 ? (preco - custo) / horas : 0, semPrecoProprio: !p.preco_venda };
    });
}
window.abrirConsulta = async function(id) {
    let box = $('cq');
    if (!box) {
        document.body.insertAdjacentHTML('beforeend', `<div class="cq" id="cq" role="dialog" aria-modal="true" aria-label="Consultar preço">
            <div class="cq-topo"><div class="busca-ic cq-busca">${ic('busca')}<input type="search" id="cq-busca" placeholder="Nome do produto…" autocomplete="off" enterkeyhint="search" oninput="buscarConsulta(this.value)"></div>
                <button type="button" class="cq-bt" id="cq-cam" title="Ler a etiqueta com a câmera" aria-label="Ler etiqueta" onclick="lerEtiquetaCQ()">${ic('camera')}</button>
                <button type="button" class="cq-bt" id="cq-modo" onclick="modoClienteCQ()"></button>
                <button type="button" class="cq-bt cq-x" aria-label="Fechar" onclick="fecharConsulta()">${ic('x')}</button></div>
            <div class="cq-video" id="cq-video" hidden><video id="cq-v" playsinline muted></video><p>Aponte para o QR Code da etiqueta</p><button type="button" class="btn-limpar" onclick="pararCameraCQ()">Fechar a câmera</button></div>
            <div class="cq-lista" id="cq-lista"><div class="carregando-box"><span class="girando"></span>Abrindo os produtos…</div></div></div>`);
        box = $('cq');
    }
    box.hidden = false; document.documentElement.classList.add('cq-aberta');
    if (window.navAbriuJanela) window.navAbriuJanela();
    pintarModo();
    try { CQ.lista = await produtosCQ(); } catch (e) { $('cq-lista').innerHTML = `<p class="mm-vazio">Não consegui abrir os produtos: ${esc(e.message)}</p>`; return; }
    if (id) { CQ.termo = ''; $('cq-busca').value = ''; desenhar(CQ.lista.filter(p => p.id === id)); }
    else { $('cq-busca').value = CQ.termo; desenhar(); setTimeout(() => { if (!matchMedia('(pointer:coarse)').matches || !CQ.termo) $('cq-busca').focus(); }, 60); }
};
window.fecharConsulta = function() { window.pararCameraCQ(); const b = $('cq'); if (b) b.hidden = true; document.documentElement.classList.remove('cq-aberta'); };
function pintarModo() {
    const b = $('cq-modo'); if (!b) return;
    b.innerHTML = `${ic('olho')}<span>${CQ.cliente ? 'Modo cliente' : 'Ver tudo'}</span>`; b.classList.toggle('on', CQ.cliente);
    b.title = CQ.cliente ? 'Só foto, preço e tamanho (para mostrar ao cliente). Toque para ver custo e estoque.' : 'Toque para esconder custo e estoque e mostrar ao cliente';
    $('cq').classList.toggle('modo-cliente', CQ.cliente);
}
window.modoClienteCQ = function() { CQ.cliente = !CQ.cliente; gravarLocal('mm_cq_cliente', CQ.cliente); pintarModo(); desenhar(); };
window.buscarConsulta = function(t) { CQ.termo = t; desenhar(); };
function desenhar(lista) {
    const box = $('cq-lista'); if (!box) return;
    const t = CQ.termo.trim(), achados = lista || (t ? CQ.lista.filter(p => window.buscaBate(t, p.nome, p.categoria)) : CQ.lista);
    if (!achados.length) { box.innerHTML = `<div class="vazio-box">${ic('busca')}<b>Nada com "${esc(t)}"</b><span>Tente outra palavra.</span></div>`; return; }
    const v = vendedor();
    box.innerHTML = (t || lista ? '' : `<p class="cq-dica">${achados.length} produtos · digite para achar mais rápido</p>`) + achados.slice(0, 60).map(p => {
        const fotos = p.fotos || [], tam = window.temMedidas(p.medidas);
        return `<article class="cq-card">
            <button type="button" class="cq-foto" ${fotos.length ? `onclick="fotosCQ(${p.id})"` : 'disabled'} aria-label="Ver as fotos de ${esc(p.nome)}"><img src="${esc(fotos[0] || 'logo.png')}" alt="" loading="lazy" onerror="this.src='logo.png'">${fotos.length > 1 ? `<span>${ic('camera')}${fotos.length}</span>` : ''}</button>
            <div class="cq-info">
                ${p.categoria ? `<small class="cq-cat">${esc(p.categoria)}${p.tipo === 'kit' ? ' · kit' : ''}</small>` : ''}
                <b class="cq-nome">${esc(p.nome)}</b>
                <div class="cq-preco">${p.preco ? fmt(p.preco) : '<i>sem preço</i>'}</div>
                ${tam ? `<div class="cq-tam">${window.chipMedidas(p.id, p.medidas)}</div>` : ''}
                <div class="cq-interno">
                    ${v ? `<span>${p.comigo ? `🧳 Com você: <b>${p.comigo}</b>` : '🧳 Não está na sua mala'}</span><span>Repasse ${fmt(p.repasse || 0)}</span>`
                        : `<span>🏠 Ateliê: <b>${p.atelie}</b>${p.vendedores ? ` · 👥 vendedores: ${p.vendedores}` : ''}</span><span>Custo ${fmt(p.custo)}${p.repasse ? ` · repasse ${fmt(p.repasse)}` : ''}${p.preco ? ` · lucro ${fmt(p.preco - p.custo)}` : ''}</span>${p.porHora ? `<span>⏱️ ${fmt(p.porHora)} por hora de impressora</span>` : ''}${p.semPrecoProprio ? '<span class="cq-aviso">Sem preço de venda: mostrando o sugerido (custo × multiplicador)</span>' : ''}`}
                </div>
                <div class="cq-acoes">
                    ${v ? (p.comigo ? `<button type="button" class="btn-vendi" onclick="venderCQ(${p.id})">${ic('carrinho')} Vender</button>` : `<button type="button" class="btn-limpar" onclick="pedirCQ(${p.id})">${ic('presente')} Pedir</button>`)
                        : `<button type="button" class="btn-vendi" onclick="venderCQ(${p.id})">${ic('carrinho')} Vender</button>`}
                    <button type="button" class="btn-limpar" onclick="zapCQ(${p.id})">${ic('zap')} Mandar</button>
                    <button type="button" class="btn-limpar" onclick="etiquetaCQ(${p.id})">${ic('etiqueta')} Etiqueta</button>
                </div>
            </div></article>`;
    }).join('');
}
const prod = id => CQ.lista.find(p => p.id === id);
window.fotosCQ = id => { const p = prod(id); if (p) window.abrirGaleria({ fotos: p.fotos, titulo: p.nome }); };
window.venderCQ = function(id) {
    window.fecharConsulta();
    if (vendedor()) { window.switchTab('v_estoque'); setTimeout(() => window.mudarCarrinho(id, 1), 300); return; }
    window.switchTab('vendas'); window.abaVendas('nova'); setTimeout(() => window.addPDV(id), 200);
};
window.pedirCQ = function(id) { const p = prod(id); window.fecharConsulta(); window.switchTab('v_encomendas'); setTimeout(() => { const s = $('ve-produto'); if (s && p) { s.value = String(id); s.dispatchEvent(new Event('change')); } }, 400); };
window.linkProdutoQR = function(id) {
    const c = window.configMM || {}, base = /^https?:\/\//.test(c.site_url || '') ? String(c.site_url).replace(/\/+$/, '') : location.origin + location.pathname.replace(/[^/]*$/, '').replace(/\/$/, '');
    const apelido = vendedor() && window.MS && window.MS.dados && window.MS.dados.loja && window.MS.dados.loja.ativa ? window.MS.dados.loja.apelido : '';
    return `${base}/loja?produto=${id}${apelido ? `&v=${encodeURIComponent(apelido)}` : ''}`;
};
window.zapCQ = function(id) {
    const p = prod(id); if (!p) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(`${p.nome}${p.preco ? `: ${fmt(p.preco)}` : ''}${window.temMedidas(p.medidas) ? `\n📏 ${window.medidasTxt(p.medidas)}` : ''}\n\nVeja as fotos: ${window.linkProdutoQR(id)}`)}`, '_blank', 'noopener');
};
window.etiquetaCQ = function(id) { window.fecharConsulta(); if (window.etiquetaDoProduto) window.etiquetaDoProduto(id); };
// Ler a etiqueta: a câmera procura o QR (só onde o navegador tem o leitor; no iPhone use a câmera do próprio celular)
window.lerEtiquetaCQ = async function() {
    if (!('BarcodeDetector' in window)) return window.mostrarAlerta('Leitor não disponível aqui', 'Neste celular, abra a câmera normal e aponte para o QR Code da etiqueta: abre a página do produto com o preço.', 'info');
    const box = $('cq-video'), v = $('cq-v');
    try {
        CQ.camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        v.srcObject = CQ.camera; await v.play(); box.hidden = false;
        const leitor = new window.BarcodeDetector({ formats: ['qr_code'] });
        const olhar = async () => {
            if (!CQ.camera) return;
            try {
                const achou = (await leitor.detect(v))[0];
                const m = achou && String(achou.rawValue).match(/[?&]produto=(\d+)/);
                if (m) { window.pararCameraCQ(); if (navigator.vibrate) navigator.vibrate(60); const id = parseInt(m[1]); if (!prod(id)) return window.mostrarAlerta('Produto não encontrado', 'Esta etiqueta é de um produto que não está mais ativo.', 'warning'); return desenhar([prod(id)]); }
            } catch (e) { /* tenta de novo */ }
            requestAnimationFrame(olhar);
        };
        olhar();
    } catch (e) { window.pararCameraCQ(); window.mostrarAlerta('Câmera bloqueada', 'Libere a câmera para este site nas configurações do navegador.', 'warning'); }
};
window.pararCameraCQ = function() { if (CQ.camera) CQ.camera.getTracks().forEach(t => t.stop()); CQ.camera = null; const b = $('cq-video'); if (b) b.hidden = true; };
document.addEventListener('keydown', e => {
    const cq = $('cq'), aberto = cq && !cq.hidden;
    if (e.key === 'Escape' && aberto) { e.preventDefault(); window.fecharConsulta(); }
    else if (!aberto && document.body.classList.contains('logado') && ((e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName)) || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey)))) { e.preventDefault(); window.abrirConsulta(); }
});
if (window.aoVoltarFechar) window.aoVoltarFechar.push(() => { const b = $('cq'); if (b && !b.hidden) { window.fecharConsulta(); return true; } return false; });

// ---------- Atalhos do Início ----------
window.renderizarAtalhos = async function(f) {
    const box = $('dash-atalhos'); if (!box) return;
    let fila = 0;
    try { f = f || await window.apiAcao('listar_fila'); fila = f.itens.filter(i => i.status !== 'pronto').reduce((s, i) => s + i.qtd, 0); window.FILA_CACHE = f; if (window.avisoFila) window.avisoFila(f); } catch (e) { /* servidor antigo */ }
    const pend = ((window.DASH && window.DASH.vendas && window.DASH.vendas.length ? window.DASH.vendas : window.arrayVendas) || []).filter(v => String(v.status).toLowerCase() === 'pendente').reduce((s, v) => s + val(v.valor_venda), 0);
    const at = (id, icone, rot, sub, acao, cor, badge) => `<button type="button" class="atalho ${cor}" onclick="${acao}">${badge ? `<em>${badge}</em>` : ''}<span class="at-ic">${ic(icone)}</span><b>${rot}</b><small>${sub}</small></button>`;
    box.innerHTML = at('cq', 'busca', 'Consultar preço', 'na frente do cliente', 'abrirConsulta()', 'azul')
        + at('vender', 'carrinho', 'Vender', 'balcão com fotos', "switchTab('vendas'); abaVendas('nova')", 'verde')
        + at('fila', 'impressora', 'Imprimir', fila ? `${fila} peça${fila === 1 ? '' : 's'} na fila` : 'fila vazia', "switchTab('fila')", 'roxo', fila || '')
        + at('receber', 'dinheiro', 'A receber', pend ? fmt(pend) : 'tudo em dia', "switchTab('vendas'); abaVendas('historico'); situacaoHV('pendente')", 'laranja')
        + at('etq', 'etiqueta', 'Etiquetas', 'QR para imprimir', "switchTab('etiquetas')", 'cinza')
        + at('cli', 'usuarios', 'Clientes', 'quem compra mais', "switchTab('clientes')", 'cinza');
};
})();
