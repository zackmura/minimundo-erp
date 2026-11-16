// ==========================================
// 🏷️ ETIQUETAS COM QR CODE (imprimir várias por folha, no papel que você usar)
// ==========================================
// 1) Escolha os produtos e quantas etiquetas de cada (ou "todos com estoque", "todos da página").
// 2) Escolha o papel: modelos prontos (A4 com 21, 24, 40, 65 por folha; térmica 50×30, 40×25…) ou o seu tamanho,
//    colunas × linhas, margens e espaço entre etiquetas. "Começar na etiqueta nº" reaproveita a folha já usada.
// 3) Veja a prévia e imprima. Tudo fica guardado (o seu modelo vale para a próxima vez).
// O QR leva à página do produto no site (o cliente vê fotos e preço e pode pedir). Na etiqueta do vendedor,
// o QR leva ao site dele, com o preço dele. A câmera do app (Consultar preço) também lê o QR.
(() => {
const $ = window.$, esc = s => window.esc(s), ic = n => window.ic(n), fmt = v => window.fmt(v), val = v => window.limparValorPlanilha(v);
const vendedor = () => document.body.classList.contains('modo-vendedor');
const MODELOS = [
    ['a4-21', 'A4 · 21 por folha (3×7) · 63,5 × 38,1 mm', { larg: 210, alt: 297, cols: 3, linhas: 7, mTopo: 15.1, mLado: 7.2, gapH: 2.5, gapV: 0 }],
    ['a4-24', 'A4 · 24 por folha (3×8) · 70 × 37 mm', { larg: 210, alt: 297, cols: 3, linhas: 8, mTopo: 0.5, mLado: 0, gapH: 0, gapV: 0 }],
    ['a4-14', 'A4 · 14 por folha (2×7) · 99,1 × 38,1 mm', { larg: 210, alt: 297, cols: 2, linhas: 7, mTopo: 15.1, mLado: 4.6, gapH: 2.6, gapV: 0 }],
    ['a4-8', 'A4 · 8 por folha (2×4) · 99,1 × 67,7 mm', { larg: 210, alt: 297, cols: 2, linhas: 4, mTopo: 13, mLado: 4.6, gapH: 2.6, gapV: 0 }],
    ['a4-40', 'A4 · 40 por folha (4×10) · 48,5 × 25,4 mm', { larg: 210, alt: 297, cols: 4, linhas: 10, mTopo: 21.5, mLado: 8, gapH: 0, gapV: 0 }],
    ['a4-65', 'A4 · 65 por folha (5×13) · 38,1 × 21,2 mm', { larg: 210, alt: 297, cols: 5, linhas: 13, mTopo: 10.7, mLado: 4.7, gapH: 2.5, gapV: 0 }],
    ['carta-30', 'Carta · 30 por folha (3×10) · 66,7 × 25,4 mm', { larg: 215.9, alt: 279.4, cols: 3, linhas: 10, mTopo: 12.7, mLado: 4.8, gapH: 3.1, gapV: 0 }],
    ['a4-comum', 'Papel comum A4 · 12 por folha, com linhas de corte', { larg: 210, alt: 297, cols: 3, linhas: 4, mTopo: 10, mLado: 10, gapH: 4, gapV: 4, cortes: true }],
    ['t-50x30', 'Térmica (rolo) · 50 × 30 mm', { larg: 50, alt: 30, cols: 1, linhas: 1, mTopo: 0, mLado: 0, gapH: 0, gapV: 0 }],
    ['t-40x25', 'Térmica (rolo) · 40 × 25 mm', { larg: 40, alt: 25, cols: 1, linhas: 1, mTopo: 0, mLado: 0, gapH: 0, gapV: 0 }],
    ['t-60x40', 'Térmica (rolo) · 60 × 40 mm', { larg: 60, alt: 40, cols: 1, linhas: 1, mTopo: 0, mLado: 0, gapH: 0, gapV: 0 }],
    ['t-100x50', 'Térmica (rolo) · 100 × 50 mm', { larg: 100, alt: 50, cols: 1, linhas: 1, mTopo: 0, mLado: 0, gapH: 0, gapV: 0 }],
    ['pers', 'Meu tamanho (personalizado)', null]
];
const PADRAO = { modelo: 'a4-21', larg: 210, alt: 297, cols: 3, linhas: 7, mTopo: 15.1, mLado: 7.2, gapH: 2.5, gapV: 0, inicio: 1, qr: true, nome: true, preco: true, tamanho: true, marca: true, dica: true, cortes: false, bordas: false };
const lerLocal = (k, p) => { try { const v = localStorage.getItem(k); return v === null ? p : JSON.parse(v); } catch (e) { return p; } };
const gravarLocal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };
window.ET = { itens: [], chave: '', cfg: null, prods: [], busca: '', paginas: [] };
// Cada pessoa tem a sua lista (no mesmo aparelho, a do admin não aparece para o vendedor e vice-versa)
const chaveItens = () => vendedor() ? 'mm_etq_itens_v' + ((window.vendedorVisto || (window.painelVendedor || {}).vendedor || {}).id || '') : 'mm_etq_itens';
const sincronizarLista = () => { const k = chaveItens(); if (ET.chave !== k) { ET.chave = k; ET.itens = lerLocal(k, []); } };
function cfgInicial() {
    if (ET.cfg) return;
    let salvo = lerLocal('mm_etq_cfg', null);
    if (!salvo && !vendedor()) try { salvo = JSON.parse((window.configMM || {}).etiquetas_padrao || 'null'); } catch (e) { salvo = null; }
    ET.cfg = Object.assign({}, PADRAO, salvo || {});
}
const num = (v, min, max) => Math.max(min, Math.min(max, parseFloat(String(v).replace(',', '.')) || 0));
// Tamanho de cada etiqueta (o que sobra do papel, tirando margens e espaços)
const tamanho = c => ({ w: (c.larg - 2 * c.mLado - (c.cols - 1) * c.gapH) / c.cols, h: (c.alt - 2 * c.mTopo - (c.linhas - 1) * c.gapV) / c.linhas });

async function carregarProdutos() {
    if (vendedor()) {
        if (!window.painelVendedor) window.painelVendedor = await window.apiAcao('meu_painel');
        const d = window.painelVendedor, l = d.estoque.map(e => ({ id: e.produto_id, nome: e.nome, foto: e.foto, preco: e.preco, medidas: e.medidas, estoque: e.qtd, categoria: e.categoria }));
        try {
            if (!window.MS || !window.MS.dados) { window.MS = window.MS || {}; window.MS.dados = await window.apiAcao('minha_loja'); }
            window.MS.dados.produtos.forEach(p => { if (!l.some(x => x.id === p.id)) l.push({ id: p.id, nome: p.nome, foto: p.foto, preco: p.preco, estoque: 0, categoria: p.categoria }); });
        } catch (e) { /* só a mala */ }
        return l;
    }
    if (!(window.arrayBancoCustos || []).length) await window.carregarBancoDeCustos();
    if (!ET.paginas.length) try { ET.paginas = (await window.apiAcao('listar_paginas')).paginas.filter(p => p.ativa); } catch (e) { ET.paginas = []; }
    return window.arrayBancoCustos.filter(p => p.ativo !== false).map(p => ({ id: p.linha, nome: p.modelo, foto: String(p.foto || p.foto_catalogo || '').split(',')[0].trim(), preco: window.precoVendaDe ? window.precoVendaDe(p) : val(p.preco_venda), medidas: p.medidas, estoque: p.est_atelie || 0, categoria: p.categoria }));
}
window.carregarEtiquetas = async function() {
    const box = caixaEtq(); if (!box) return;
    sincronizarLista(); cfgInicial();
    if (!ET.prods.length) box.innerHTML = '<div class="carregando-box"><span class="girando"></span>Abrindo os produtos…</div>';
    try { ET.prods = await carregarProdutos(); } catch (e) { box.innerHTML = `<p class="mm-vazio">Não consegui abrir os produtos: ${esc(e.message)}</p>`; return; }
    ET.itens = ET.itens.filter(i => i.id === 'pix' || i.id === 'site' || ET.prods.some(p => p.id === i.id));
    desenharTela();
};
// Vindo da Consulta de preço ou de Produtos: põe o produto na lista e abre a tela
window.etiquetaDoProduto = function(id) {
    sincronizarLista();
    const ja = ET.itens.find(i => i.id === id); if (ja) ja.qtd++; else ET.itens.push({ id, qtd: 1 });
    gravarLocal(chaveItens(), ET.itens);
    window.switchTab(vendedor() ? 'v_etiquetas' : 'etiquetas');
    window.toastMM('Na lista de etiquetas');
};
// A tela do vendedor e a sua usam caixas diferentes (ver como o vendedor): só uma fica preenchida
function caixaEtq() { const v = vendedor(), box = $(v ? 'etq-conteudo-v' : 'etq-conteudo'), outra = $(v ? 'etq-conteudo' : 'etq-conteudo-v'); if (outra) outra.innerHTML = ''; return box; }
const qtdDe = id => (ET.itens.find(i => i.id === id) || {}).qtd || 0;
function desenharTela() {
    const box = caixaEtq(), c = ET.cfg;
    const modelos = MODELOS.map(([k, r]) => `<option value="${k}" ${c.modelo === k ? 'selected' : ''}>${esc(r)}</option>`).join('');
    const campo = (id, rot, v, passo = 0.1) => `<div class="input-group"><label for="etq-${id}">${rot}</label><input type="number" id="etq-${id}" step="${passo}" value="${v}" oninput="mudarCfgEtq()"></div>`;
    const chave = (k, rot) => `<label class="chave"><input type="checkbox" data-k="${k}" ${c[k] ? 'checked' : ''} onchange="mudarCfgEtq()"> ${rot}</label>`;
    box.innerHTML = `<div class="etq-grade">
        <div class="etq-col">
            <div class="card"><div class="card-titulo">${ic('pacote')} 1. Produtos e quantas de cada</div>
                <div class="etq-rapidos">${vendedor() ? `<button class="btn-limpar" onclick="rapidoEtq('estoque')">Todas da minha mala</button>` : `<button class="btn-limpar" onclick="rapidoEtq('estoque')">Todos com estoque no Ateliê</button>${ET.paginas.map(p => `<button class="btn-limpar" onclick="rapidoEtq('pagina', ${p.id})">Página ${esc(p.titulo)}</button>`).join('')}`}
                    <button class="btn-limpar" onclick="rapidoEtq('pix')">💠 Plaquinha do Pix</button><button class="btn-limpar" onclick="rapidoEtq('site')">🔗 QR do site</button>${ET.itens.length ? `<button class="btn-limpar perigo" onclick="rapidoEtq('limpar')">Limpar</button>` : ''}</div>
                <div class="busca-ic">${ic('busca')}<input type="search" id="etq-busca" placeholder="Buscar produto…" value="${esc(ET.busca)}" oninput="ET.busca = this.value; listaEtq()" autocomplete="off"></div>
                <div class="etq-lista" id="etq-lista"></div></div>
            <div class="card"><div class="card-titulo">${ic('imagem')} 2. Papel e tamanho</div>
                <div class="input-group"><label for="etq-modelo">Modelo de etiqueta</label><select id="etq-modelo" onchange="modeloEtq(this.value)">${modelos}</select></div>
                <div class="row">${campo('larg', 'Largura do papel (mm)', c.larg)}${campo('alt', 'Altura do papel (mm)', c.alt)}</div>
                <div class="row">${campo('cols', 'Colunas', c.cols, 1)}${campo('linhas', 'Linhas', c.linhas, 1)}${campo('inicio', 'Começar na nº', c.inicio, 1)}</div>
                <div class="row">${campo('mTopo', 'Margem de cima (mm)', c.mTopo)}${campo('mLado', 'Margem do lado (mm)', c.mLado)}</div>
                <div class="row">${campo('gapH', 'Espaço entre colunas', c.gapH)}${campo('gapV', 'Espaço entre linhas', c.gapV)}</div>
                <p class="texto-ajuda" id="etq-medida"></p></div>
            <div class="card"><div class="card-titulo">${ic('etiqueta')} 3. O que vai na etiqueta</div>
                <div class="etq-chaves">${chave('qr', 'QR Code (abre o produto no site)')}${chave('nome', 'Nome')}${chave('preco', 'Preço')}${chave('tamanho', 'Tamanho (cm)')}${chave('marca', 'Mini Mundo')}${chave('dica', '"Aponte a câmera"')}${chave('cortes', 'Linhas de corte')}${chave('bordas', 'Borda em volta')}</div>
                ${vendedor() ? '' : `<button class="btn-limpar" style="margin-top:10px;" onclick="salvarPadraoEtq()">${ic('check')} Guardar este modelo como padrão</button>`}</div>
        </div>
        <div class="etq-col etq-direita">
            <div class="card etq-previa-card"><div class="card-titulo">${ic('olho')} Prévia <small id="etq-conta"></small></div>
                <div class="etq-previa" id="etq-previa"></div>
                <button class="btn-magic btn-global" onclick="imprimirEtq(false)">${ic('recibo')} Imprimir as etiquetas</button>
                <button class="btn-limpar" style="width:100%;margin-top:8px;padding:10px;" onclick="imprimirEtq(true)">Imprimir um teste de alinhamento (só as bordas)</button>
                <p class="texto-ajuda etq-dica-imp">Na janela de impressão, escolha <b>Escala 100%</b> (ou "Tamanho real") e <b>Margens: nenhuma</b>. Na impressora térmica, escolha o papel com o mesmo tamanho da etiqueta.</p></div>
        </div></div>`;
    listaEtq(); window.atualizarPreviaEtq();
}
window.listaEtq = function() {
    const box = $('etq-lista'); if (!box) return;
    const t = ET.busca, extras = ET.itens.filter(i => i.id === 'pix' || i.id === 'site');
    const lista = ET.prods.filter(p => window.buscaBate(t, p.nome, p.categoria)).sort((a, b) => (qtdDe(b.id) > 0) - (qtdDe(a.id) > 0) || a.nome.localeCompare(b.nome, 'pt-BR'));
    box.innerHTML = extras.map(i => `<div class="etq-item on"><span class="etq-ext">${i.id === 'pix' ? '💠' : '🔗'}</span><span class="etq-nome"><b>${i.id === 'pix' ? 'Plaquinha do Pix' : 'QR do site'}</b><small>${i.id === 'pix' ? 'para o balcão ou a feira' : 'leva às suas páginas de venda'}</small></span>${passo(i.id)}</div>`).join('')
        + lista.slice(0, 150).map(p => `<div class="etq-item ${qtdDe(p.id) ? 'on' : ''}"><img src="${esc(p.foto || 'logo.png')}" alt="" loading="lazy" onerror="this.src='logo.png'"><span class="etq-nome"><b>${esc(p.nome)}</b><small>${p.preco ? fmt(p.preco) : 'sem preço'}${p.estoque ? ` · ${p.estoque} ${vendedor() ? 'com você' : 'no Ateliê'}` : ''}</small></span>${passo(p.id)}</div>`).join('')
        || '<p class="mm-vazio">Nenhum produto.</p>';
};
const passo = id => { const q = qtdDe(id), a = typeof id === 'string' ? `'${id}'` : id; return q ? `<span class="etq-passo"><button type="button" onclick="qtdEtq(${a}, -1)" aria-label="Menos">−</button><input type="number" min="0" value="${q}" onchange="qtdEtq(${a}, 0, this.value)" aria-label="Quantas etiquetas"><button type="button" onclick="qtdEtq(${a}, 1)" aria-label="Mais">+</button></span>` : `<button type="button" class="btn-limpar etq-add" onclick="qtdEtq(${a}, 1)">${ic('mais')}</button>`; };
window.qtdEtq = function(id, d, abs) {
    let it = ET.itens.find(i => i.id === id);
    if (!it) { it = { id, qtd: 0 }; ET.itens.push(it); }
    it.qtd = Math.max(0, Math.min(999, abs !== undefined ? parseInt(abs) || 0 : it.qtd + d));
    ET.itens = ET.itens.filter(i => i.qtd > 0); gravarLocal(chaveItens(), ET.itens);
    window.listaEtq(); window.atualizarPreviaEtq();
};
window.rapidoEtq = async function(tipo, pagina) {
    if (tipo === 'limpar') ET.itens = [];
    else if (tipo === 'pix' || tipo === 'site') window.qtdEtq(tipo, 1);
    else if (tipo === 'estoque') ET.prods.filter(p => p.estoque > 0).forEach(p => { const it = ET.itens.find(i => i.id === p.id); if (it) it.qtd = p.estoque; else ET.itens.push({ id: p.id, qtd: p.estoque }); });
    else if (tipo === 'pagina') { const pg = ET.paginas.find(p => p.id === pagina); (pg ? pg.itens : []).forEach(i => { if (!ET.itens.some(x => x.id === i.produto_id) && ET.prods.some(p => p.id === i.produto_id)) ET.itens.push({ id: i.produto_id, qtd: 1 }); }); }
    gravarLocal(chaveItens(), ET.itens); window.listaEtq(); window.atualizarPreviaEtq();
};
window.modeloEtq = function(k) {
    const m = (MODELOS.find(x => x[0] === k) || [])[2]; ET.cfg.modelo = k;
    if (m) Object.assign(ET.cfg, { cortes: false }, m);
    gravarLocal('mm_etq_cfg', ET.cfg); desenharTela();
};
window.mudarCfgEtq = function() {
    const c = ET.cfg, g = id => ($('etq-' + id) || {}).value;
    Object.assign(c, { larg: num(g('larg'), 10, 1000), alt: num(g('alt'), 10, 2000), cols: Math.round(num(g('cols'), 1, 20)), linhas: Math.round(num(g('linhas'), 1, 40)),
        mTopo: num(g('mTopo'), 0, 200), mLado: num(g('mLado'), 0, 200), gapH: num(g('gapH'), 0, 100), gapV: num(g('gapV'), 0, 100), inicio: Math.round(num(g('inicio'), 1, 800)) });
    document.querySelectorAll('.etq-chaves input[data-k]').forEach(i => { c[i.dataset.k] = i.checked; });
    if (c.modelo !== 'pers') { const m = (MODELOS.find(x => x[0] === c.modelo) || [])[2]; if (m && ['larg', 'alt', 'cols', 'linhas', 'mTopo', 'mLado', 'gapH', 'gapV'].some(k => m[k] !== c[k])) { c.modelo = 'pers'; if ($('etq-modelo')) $('etq-modelo').value = 'pers'; } }
    gravarLocal('mm_etq_cfg', c); window.atualizarPreviaEtq();
};
window.salvarPadraoEtq = async function() {
    try { window.configMM = (await window.apiAcao('salvar_config', { valores: { etiquetas_padrao: JSON.stringify(ET.cfg) } })).config; window.toastMM('Modelo guardado: vale em todos os aparelhos'); }
    catch (e) { window.mostrarAlerta('Não deu', e.message, 'error'); }
};

// ---------- Desenho das etiquetas (o mesmo na prévia e na impressão) ----------
function etiquetasDaLista() {
    const l = [];
    ET.itens.forEach(i => {
        let e;
        if (i.id === 'pix') { const d = window.dadosPix(), pl = window.pixPayload({ ...d }); if (!pl) return; e = { qr: pl, nome: 'Pague com Pix', linha2: d.nome || '', linha3: `Chave: ${d.chave}`, preco: '', pix: true }; }
        else if (i.id === 'site') { const lk = window.linkProdutoQR(0).replace(/\?produto=0.*$/, '') + (vendedor() && window.MS && window.MS.dados && window.MS.dados.loja.ativa ? `?v=${window.MS.dados.loja.apelido}` : ''); e = { qr: lk, nome: 'Veja todos os produtos', linha2: 'e faça seu pedido', preco: '' }; }
        else { const p = ET.prods.find(x => x.id === i.id); if (!p) return; e = { qr: window.linkProdutoQR(p.id), nome: p.nome, preco: p.preco ? fmt(p.preco) : '', linha2: window.temMedidas(p.medidas) ? window.medidasTxt(p.medidas) : '' }; }
        for (let k = 0; k < i.qtd; k++) l.push(e);
    });
    return l;
}
function etiquetaHTML(e, w, h, c, teste, n) {
    if (teste) return `<div class="etq-e teste"><b>${n}</b></div>`;
    const pad = Math.max(1, Math.min(3, Math.min(w, h) * 0.06)), deitada = w >= h * 1.25;
    const qrTam = c.qr ? (deitada ? h - 2 * pad : Math.min(w - 2 * pad, h * (c.nome || c.preco ? 0.56 : 0.8))) : 0;
    const base = deitada ? Math.min(h, (w - qrTam) * 1.1) : Math.min(w, h - qrTam);
    const f = k => `${Math.max(1.6, base * k).toFixed(2)}mm`, largTxt = deitada ? w - qrTam - 3 * pad : w - 2 * pad;
    // O preço fica numa linha só: diminui a letra até caber na largura que sobra
    const fPreco = `${Math.max(1.6, Math.min(base * 0.17, largTxt / (String(e.preco || '').length * 0.62 || 1))).toFixed(2)}mm`;
    // O nome quebra só entre palavras: a letra diminui até a palavra mais comprida caber
    const maiorPalavra = Math.max(4, ...String(e.nome || '').split(/s+/).map(p => p.length));
    const fNome = `${Math.max(1.6, Math.min(base * (e.pix ? 0.13 : 0.105), largTxt / (maiorPalavra * 0.6))).toFixed(2)}mm`;
    const qr = c.qr ? `<div class="etq-qr" style="width:${qrTam}mm;height:${qrTam}mm">${window.qrSVG(e.qr, { margem: 0, ecc: 'M' })}</div>` : '';
    const txt = `<div class="etq-txt">${c.marca ? `<small style="font-size:${f(0.075)}">MINI MUNDO</small>` : ''}${c.nome ? `<b style="font-size:${fNome}">${esc(e.nome)}</b>` : ''}${c.preco && e.preco ? `<strong style="font-size:${fPreco}">${esc(e.preco)}</strong>` : ''}${(c.tamanho || e.pix) && e.linha2 ? `<span style="font-size:${f(0.08)}">${e.pix ? '' : '📏 '}${esc(e.linha2)}</span>` : ''}${e.linha3 ? `<span style="font-size:${f(0.07)}">${esc(e.linha3)}</span>` : ''}${c.dica && c.qr ? `<em style="font-size:${f(0.065)}">📷 Aponte a câmera</em>` : ''}</div>`;
    return `<div class="etq-e ${deitada ? 'deitada' : 'em-pe'} ${c.bordas ? 'borda' : ''}" style="padding:${pad}mm;gap:${pad}mm">${qr}${c.nome || c.preco || c.marca || c.tamanho ? txt : ''}</div>`;
}
function folhasHTML(teste) {
    const c = ET.cfg, { w, h } = tamanho(c), porFolha = c.cols * c.linhas, pular = Math.min(porFolha - 1, Math.max(0, c.inicio - 1));
    const lista = teste ? Array.from({ length: porFolha - pular }, () => ({})) : etiquetasDaLista();
    if (!(w > 3 && h > 3)) return { html: '', folhas: 0, total: lista.length, w, h };
    const folhas = []; let pos = pular, folha = [];
    lista.forEach((e, k) => {
        if (pos >= porFolha) { folhas.push(folha); folha = []; pos = 0; }
        const col = pos % c.cols, lin = Math.floor(pos / c.cols);
        folha.push(`<div class="etq-pos" style="left:${c.mLado + col * (w + c.gapH)}mm;top:${c.mTopo + lin * (h + c.gapV)}mm;width:${w}mm;height:${h}mm">${etiquetaHTML(e, w, h, c, teste, pos + 1)}</div>`);
        pos++;
    });
    if (folha.length) folhas.push(folha);
    const cortes = c.cortes && !teste ? Array.from({ length: c.cols + 1 }, (_, i) => `<i class="etq-corte v" style="left:${c.mLado + i * (w + c.gapH) - (i ? c.gapH / 2 : 0)}mm"></i>`).join('') + Array.from({ length: c.linhas + 1 }, (_, i) => `<i class="etq-corte h" style="top:${c.mTopo + i * (h + c.gapV) - (i ? c.gapV / 2 : 0)}mm"></i>`).join('') : '';
    return { html: folhas.map(f => `<div class="etq-folha" style="width:${c.larg}mm;height:${c.alt}mm">${cortes}${f.join('')}</div>`).join(''), folhas: folhas.length, total: lista.length, w, h };
}
window.atualizarPreviaEtq = function() {
    const box = $('etq-previa'); if (!box) return;
    const c = ET.cfg, r = folhasHTML(false), t = tamanho(c);
    if ($('etq-medida')) $('etq-medida').innerHTML = t.w > 3 && t.h > 3 ? `Cada etiqueta: <b>${t.w.toFixed(1).replace('.', ',')} × ${t.h.toFixed(1).replace('.', ',')} mm</b> · ${c.cols * c.linhas} por folha` : '<b style="color:var(--vermelho)">Não cabe: diminua as margens, os espaços ou as colunas/linhas.</b>';
    if ($('etq-conta')) $('etq-conta').textContent = r.total ? c.cols * c.linhas === 1 ? `${r.total} etiqueta${r.total === 1 ? '' : 's'} no rolo` : `${r.total} etiqueta${r.total === 1 ? '' : 's'} · ${r.folhas} folha${r.folhas === 1 ? '' : 's'}` : '';
    if (!r.total) { box.innerHTML = `<div class="vazio-box pequeno">${ic('etiqueta')}<b>Escolha os produtos</b><span>Toque em + nos produtos da lista.</span></div>`; return; }
    // Mostra a 1ª folha encolhida para caber na tela
    const primeira = r.html.split('<div class="etq-folha"')[1], largPx = box.clientWidth || 320, escala = Math.min(1, largPx / (c.larg * 3.7795));
    box.innerHTML = `<div class="etq-zoom" style="width:${c.larg * 3.7795 * escala}px;height:${c.alt * 3.7795 * escala}px"><div style="transform:scale(${escala});transform-origin:0 0;width:${c.larg}mm">${primeira ? '<div class="etq-folha"' + primeira : ''}</div></div>${r.folhas > 1 ? `<p class="texto-ajuda" style="text-align:center;">+ ${r.folhas - 1} ${c.cols * c.linhas === 1 ? `etiqueta${r.folhas > 2 ? 's' : ''}` : `folha${r.folhas > 2 ? 's' : ''}`}</p>` : ''}`;
};
// Imprime só as folhas (o resto da tela some na impressão) no tamanho exato do papel
window.imprimirEtq = function(teste) {
    const r = folhasHTML(teste);
    if (!r.total && !teste) return window.mostrarAlerta('Nenhuma etiqueta', 'Escolha os produtos e quantas etiquetas de cada.', 'warning');
    if (!r.html) return window.mostrarAlerta('Não cabe', 'As etiquetas não cabem no papel. Diminua as margens ou as colunas/linhas.', 'warning');
    let area = $('etq-impressao'); if (!area) { area = document.createElement('div'); area.id = 'etq-impressao'; document.body.appendChild(area); }
    area.innerHTML = r.html;
    let pg = $('etq-pagina'); if (!pg) { pg = document.createElement('style'); pg.id = 'etq-pagina'; document.head.appendChild(pg); }
    pg.textContent = `@page { size: ${ET.cfg.larg}mm ${ET.cfg.alt}mm; margin: 0; }`;
    document.documentElement.classList.add('imprimindo-etq');
    const fim = () => { document.documentElement.classList.remove('imprimindo-etq'); window.removeEventListener('afterprint', fim); };
    window.addEventListener('afterprint', fim);
    setTimeout(() => window.print(), 120);
};
window.aoSairDaTela = window.aoSairDaTela || {};
window.aoSairDaTela.etiquetas = window.aoSairDaTela.v_etiquetas = () => document.documentElement.classList.remove('imprimindo-etq');
})();
