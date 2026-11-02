// ==========================================
// 🧩 KITS: VITRINE DOS KITS, PÁGINA PARA CLIENTES E COMPARTILHAR
// ==========================================
// Mostra todos os kits (montados ou não) com fotos, preço e peças. Daqui dá para compartilhar o kit
// (link da página kits.html), montar, e ajustar como ele aparece para o cliente: nome comercial,
// texto e o nome de cada peça. Esses nomes são só da página: o cadastro, o estoque e as vendas não mudam.
(() => {
const $ = window.$;
const esc = s => window.esc(s);
const val = v => window.limparValorPlanilha(v);
window.KT = { filtro: 'todos', cfg: null };
const produtoPorId = id => (window.arrayBancoCustos || []).find(p => p.linha === id);
const est = p => Math.max(0, parseInt(p && p.est_atelie) || 0);
const montaveis = k => (k.itens || []).length ? Math.min(...k.itens.map(i => Math.floor(est(produtoPorId(i.produto_id)) / (i.qtd || 1)))) : 0;
const nomePagina = k => k.nome_vitrine || k.modelo;
const nomeItem = i => { const p = produtoPorId(i.produto_id); return i.nome_vitrine || (p ? p.modelo : '(peça removida)'); };
const fotoPrincipal = p => (window.fotosDe(p) || [])[0] || '';
// Soma das peças vendidas separadas (só quando todas têm preço de venda)
const separadas = k => { const its = k.itens || []; return its.length && its.every(i => (produtoPorId(i.produto_id) || {}).preco_venda > 0) ? its.reduce((s, i) => s + produtoPorId(i.produto_id).preco_venda * i.qtd, 0) : 0; };
const prontaEntrega = k => est(k) > 0 || montaveis(k) > 0;
const servidorAntigo = e => e.message === 'Ação não reconhecida.' ? 'O servidor ainda está na versão antiga. Atualize o server.js na alwaysdata.' : e.message;

window.linkKits = id => new URL('kits.html' + (id ? '?k=' + id : ''), location.href).href;

window.carregarKits = async function() {
    if (!(window.arrayBancoCustos || []).length && $('lista-kits')) $('lista-kits').innerHTML = '<p class="mm-vazio">Carregando os kits…</p>';
    await Promise.all([
        window.carregarBancoDeCustos(),
        window.apiAcao('obter_config').then(r => { KT.cfg = r.config; }).catch(() => {})
    ]);
    window.renderizarKits();
};
window.filtroKits = function(f) { KT.filtro = f; document.querySelectorAll('#kt-filtros button').forEach(b => b.classList.toggle('active', b.dataset.f === f)); window.renderizarKits(); };

// Faixa de cima: o link da página para clientes
function renderizarBanner(naPagina) {
    const box = $('kt-pagina'); if (!box) return;
    const c = KT.cfg || {}, link = window.linkKits();
    box.innerHTML = `<div class="kt-banner">
        <span class="kt-banner-ic">${window.ic('sacola')}</span>
        <div class="kt-banner-txt"><b>Página de kits para clientes</b><span>${naPagina} kit${naPagina === 1 ? '' : 's'} aparecendo · <a href="${esc(link)}" target="_blank" rel="noopener">${esc(link.replace(/^https?:\/\//, ''))}</a></span>
            ${KT.cfg && !c.pagina_whatsapp ? `<span class="kt-falta">${window.ic('alerta')} Falta o WhatsApp para os clientes pedirem. <a onclick="abrirAjustesPagina()">Colocar agora</a></span>` : ''}</div>
        <div class="kt-banner-bt">
            <button class="btn-magic btn-pequeno" onclick="compartilharPagina()">${window.ic('zap')} Compartilhar</button>
            <a class="btn-limpar" href="${esc(link)}" target="_blank" rel="noopener">${window.ic('olho')} Ver</a>
            <button class="btn-limpar" onclick="abrirAjustesPagina()">${window.ic('ajustes')} Ajustes</button>
        </div></div>`;
}

window.renderizarKits = function() {
    const box = $('lista-kits'); if (!box) return;
    const todos = (window.arrayBancoCustos || []).filter(p => p.tipo === 'kit'), ativos = todos.filter(k => k.ativo !== false);
    const t = $('kt-busca').value;
    window.montarFiltroCategoria('kt-categoria', ativos); const cat = $('kt-categoria').value;
    const conta = { todos: ativos.length, pagina: ativos.filter(k => k.na_pagina !== false).length, fora: ativos.filter(k => k.na_pagina === false).length, pronta: ativos.filter(prontaEntrega).length, inativos: todos.length - ativos.length };
    document.querySelectorAll('#kt-filtros button').forEach(b => { b.querySelector('em').innerText = conta[b.dataset.f] || ''; });
    renderizarBanner(conta.pagina);
    const lista = (KT.filtro === 'inativos' ? todos.filter(k => k.ativo === false) : ativos).filter(k =>
        (KT.filtro !== 'pagina' || k.na_pagina !== false) && (KT.filtro !== 'fora' || k.na_pagina === false) && (KT.filtro !== 'pronta' || prontaEntrega(k))
        && window.categoriaBate(k, cat) && window.buscaBate(t, k.modelo, k.nome_vitrine, k.categoria, (k.itens || []).map(nomeItem).join(' '), (k.itens || []).map(i => (produtoPorId(i.produto_id) || {}).modelo).join(' ')));
    if (!lista.length) {
        box.innerHTML = `<div class="vazio-box">${window.ic('camadas')}<b>${!todos.length ? 'Nenhum kit cadastrado ainda' : t.trim() ? `Nada encontrado para "${esc(t)}"` : 'Nenhum kit nesse filtro'}</b>
            <span>${!todos.length ? 'Junte peças que combinam e venda como presente. <a onclick="novoProduto(\'kit\')">Criar o primeiro kit</a>' : ''}</span></div>`;
        return;
    }
    box.innerHTML = lista.map(k => {
        const fotos = window.fotosDe(k), its = k.itens || [], preco = k.preco_venda || 0, sep = separadas(k), da = montaveis(k), prontos = est(k);
        const naPag = k.ativo !== false && k.na_pagina !== false;
        // Kit sem foto própria: mostrinho com as fotos das peças
        const mosaico = [...new Set(its.map(i => fotoPrincipal(produtoPorId(i.produto_id))).filter(Boolean))].slice(0, 4);
        const capa = fotos.length ? `<img src="${esc(fotos[0])}" alt="" loading="lazy" onerror="this.src='logo.png'">`
            : mosaico.length ? `<span class="kt-mosaico n${mosaico.length}">${mosaico.map(f => `<img src="${esc(f)}" alt="" loading="lazy" onerror="this.src='logo.png'">`).join('')}</span><span class="kt-semfoto">${window.ic('camera')} Sem foto do kit</span>`
            : `<span class="kt-semfoto so">${window.ic('camera')} Adicionar foto</span>`;
        return `<div class="kt-card ${naPag ? '' : 'fora'}">
            <button type="button" class="kt-foto" onclick="tocarFotoProduto(${k.linha})" title="${fotos.length ? 'Ver as fotos' : 'Adicionar fotos'}">${capa}
                <span class="kt-selo ${naPag ? 'on' : ''}">${k.ativo === false ? 'Inativo' : naPag ? 'Na página' : 'Fora da página'}</span>
                ${fotos.length > 1 ? `<em class="kt-nfotos">${window.ic('imagem')}${fotos.length}</em>` : ''}</button>
            <div class="kt-corpo">
                <b class="kt-nome">${esc(nomePagina(k))}</b>
                ${k.nome_vitrine && k.nome_vitrine !== k.modelo ? `<small class="kt-cad">No cadastro: ${esc(k.modelo)}</small>` : ''}
                <div class="kt-preco">${preco ? window.fmt(preco) : '<i>sem preço de venda</i>'}${sep > preco && preco ? ` <s>${window.fmt(sep)}</s>` : ''}</div>
                <div class="kt-itens">${its.map(i => { const p = produtoPorId(i.produto_id); return `<span class="kt-item"><img src="${esc(fotoPrincipal(p) || 'logo.png')}" alt="" loading="lazy" onerror="this.src='logo.png'"><b>${i.qtd}×</b> ${esc(nomeItem(i))}</span>`; }).join('')}</div>
                <div class="kt-estado ${prontos || da ? 'ok' : ''}">${prontos ? `<b>${prontos} pronto${prontos > 1 ? 's' : ''}</b> no Ateliê` : ''}${prontos && da ? ' · ' : ''}${da ? `dá para montar ${da}` : prontos ? '' : 'Sob encomenda: faltam peças no Ateliê'}</div>
            </div>
            <div class="kt-botoes">
                <button class="btn-magic btn-pequeno" onclick="compartilharKit(${k.linha})">${window.ic('zap')} Compartilhar</button>
                <button class="btn-limpar" onclick="abrirPaginaKit(${k.linha})">${window.ic('lapis')} Página</button>
                <button class="btn-limpar" onclick="montarKitAqui(${k.linha})" ${k.ativo === false ? 'disabled' : ''}>${window.ic('camadas')} Montar</button>
                <button class="btn-limpar" onclick="editarProduto(${k.linha})" title="Mudar as peças, o custo e os preços">${window.ic('calculadora')} Editar</button>
            </div></div>`;
    }).join('');
};

window.montarKitAqui = async function(id) {
    await window.carregarPainelEstoque();
    if (window.painelEstoque) window.abrirMontarKit(id);
};

// ---------- COMPARTILHAR ----------
// No celular abre o "Compartilhar" do aparelho (WhatsApp, Instagram…); no computador mostra as opções
window.compartilharMM = async function(titulo, texto) {
    if (navigator.share && matchMedia('(pointer:coarse)').matches) {
        try { await navigator.share({ title: titulo, text: texto }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    window.abrirModalMM(`<h3 class="modal-title">${window.ic('zap')} Compartilhar</h3>
        <p class="texto-ajuda" style="margin-top:0;">É isso que o cliente vai receber:</p>
        <div class="kt-previa">${esc(texto)}</div>
        <a class="btn-magic btn-global kt-zap" href="${esc(window.linkZap('', texto))}" target="_blank" rel="noopener">${window.ic('zap')} Mandar no WhatsApp</a>
        <button type="button" class="btn-limpar ep-link" onclick="copiarTexto(this.dataset.t, 'Texto com o link copiado!')" data-t="${esc(texto)}">${window.ic('copiar')} Copiar texto com o link</button>`);
};
window.compartilharKit = async function(id) {
    const k = produtoPorId(id); if (!k) return;
    if (k.ativo === false) return window.mostrarAlerta('Kit inativo', 'Ligue "Produto ativo" na edição do kit para ele aparecer para os clientes.', 'warning');
    if (k.na_pagina === false) {
        if (!await window.confirmarMM({ icone: '🛍️', titulo: 'Esse kit está fora da página', texto: 'Para o cliente abrir pelo link, o kit precisa aparecer na página de kits.\nColocar na página agora?', ok: 'Colocar na página' })) return;
        try { await window.apiAcao('pagina_kit', { linha: id, nome_vitrine: k.nome_vitrine, descricao_vitrine: k.descricao_vitrine, na_pagina: true }); k.na_pagina = true; window.renderizarKits(); }
        catch (e) { return window.mostrarAlerta('Não deu para colocar na página', servidorAntigo(e), 'error'); }
    }
    const preco = k.preco_venda || 0;
    const texto = `✨ *${nomePagina(k)}*${preco ? ` por ${window.fmt(preco)}` : ''}\n${(k.itens || []).map(i => `• ${i.qtd}× ${nomeItem(i)}`).join('\n')}\n\nVeja as fotos: ${window.linkKits(id)}`;
    window.compartilharMM(nomePagina(k), texto);
};
window.compartilharPagina = function() {
    const c = KT.cfg || {};
    window.compartilharMM('Kits Mini Mundo', `✨ ${c.pagina_titulo || 'Kits Mini Mundo'}\nPresentes e festas com peças impressas em 3D. Veja as fotos e os preços:\n${window.linkKits()}`);
};

// ---------- COMO O KIT APARECE NA PÁGINA ----------
window.abrirPaginaKit = function(id) {
    const k = produtoPorId(id); if (!k) return;
    const preco = k.preco_venda || 0;
    window.abrirModalMM(`<h3 class="modal-title">${window.ic('lapis')} Página do kit</h3>
        <p class="texto-ajuda" style="margin-top:0;">É assim que o kit aparece para os clientes. Os nomes daqui são só da página: o cadastro, o estoque e as vendas continuam com o nome de sempre.</p>
        <div class="input-group"><label>Fotos <small class="rot-dica">a primeira é a capa</small></label>${window.fotosFaixa(id)}</div>
        <label class="chave" style="margin:0 0 14px;"><input type="checkbox" id="kp-na" ${k.na_pagina !== false ? 'checked' : ''}> Aparece na página de kits</label>
        <div class="input-group"><label for="kp-nome">Nome na página</label><input type="text" id="kp-nome" value="${esc(k.nome_vitrine || '')}" placeholder="${esc(k.modelo)}" maxlength="120" autocomplete="off"></div>
        <div class="input-group"><label for="kp-texto">Texto de apresentação</label><textarea id="kp-texto" rows="3" maxlength="2000" placeholder="Ex.: Tudo para a festa do torcedor: topo de bolo, bandeirinhas e lembrancinhas, prontos para encantar.">${esc(k.descricao_vitrine || '')}</textarea></div>
        <div class="input-group"><label>Como cada peça aparece</label><div class="kp-itens">${(k.itens || []).map(i => { const p = produtoPorId(i.produto_id); return `<div class="kp-item"><img src="${esc(fotoPrincipal(p) || 'logo.png')}" alt="" onerror="this.src='logo.png'"><span class="kp-q">${i.qtd}×</span><input type="text" data-pid="${i.produto_id}" value="${esc(i.nome_vitrine || '')}" placeholder="${esc(p ? p.modelo : '')}" maxlength="120" autocomplete="off" aria-label="Nome na página de ${esc(p ? p.modelo : 'peça')}"></div>`; }).join('')}</div></div>
        <button type="button" class="btn-limpar ep-link" id="kp-ia" onclick="sugerirPaginaIA(${id})">✨ Sugerir nomes e texto com IA</button>
        <p class="texto-ajuda kp-preco">${preco ? `Preço na página: <b>${window.fmt(preco)}</b>` : `${window.ic('alerta')} Sem preço de venda: na página vai aparecer "Sob consulta".`} <a onclick="fecharModalMM(); abrirEdicaoProduto(${id})">Mudar o preço</a></p>
        <button class="btn-magic btn-global" id="btn-kp" onclick="salvarPaginaKit(${id})">${window.ic('check')} Salvar</button>
        <a class="btn-limpar ep-link" href="${esc(window.linkKits(id))}" target="_blank" rel="noopener">${window.ic('olho')} Ver na página</a>`);
};
window.salvarPaginaKit = async function(id) {
    const k = produtoPorId(id); if (!k) return;
    // Igual ao cadastro = vazio (assim, se o cadastro mudar de nome, a página acompanha)
    const limpo = (v, padrao) => { v = String(v || '').trim(); return v === String(padrao || '').trim() ? '' : v; };
    const dados = { linha: id, na_pagina: $('kp-na').checked, nome_vitrine: limpo($('kp-nome').value, k.modelo), descricao_vitrine: $('kp-texto').value.trim(),
        itens: [...document.querySelectorAll('.kp-item input')].map(inp => { const pid = parseInt(inp.dataset.pid), p = produtoPorId(pid); return { produto_id: pid, nome_vitrine: limpo(inp.value, p && p.modelo) }; }) };
    const b = $('btn-kp'), txt = b.innerHTML; b.disabled = true; b.innerText = '⏳ Salvando…';
    try {
        await window.apiAcao('pagina_kit', dados);
        Object.assign(k, { na_pagina: dados.na_pagina, nome_vitrine: dados.nome_vitrine, descricao_vitrine: dados.descricao_vitrine });
        dados.itens.forEach(d => { const it = (k.itens || []).find(i => i.produto_id === d.produto_id); if (it) it.nome_vitrine = d.nome_vitrine; });
        window.fecharModalMM(); window.renderizarKits(); window.toastMM('Página do kit salva');
    } catch (e) { window.mostrarAlerta('Não deu para salvar', servidorAntigo(e), 'error'); b.disabled = false; b.innerHTML = txt; }
};
// A IA sugere nome comercial, texto e nomes das peças; nada é salvo antes de você conferir
window.sugerirPaginaIA = async function(id) {
    const k = produtoPorId(id); if (!k) return;
    const b = $('kp-ia'), txt = b.innerHTML; b.disabled = true; b.innerText = '⏳ A IA está escrevendo…';
    const pecas = (k.itens || []).map(i => `- ${i.qtd}x ${(produtoPorId(i.produto_id) || {}).modelo || 'peça'}`).join('\n');
    const prompt = `Você escreve textos de venda para a Mini Mundo, um ateliê de peças impressas em 3D (presentes, festas e decoração).
Crie textos curtos, elegantes e acolhedores, em português do Brasil, para mostrar este kit a clientes.
Kit (nome no cadastro): ${k.modelo}${k.categoria ? `\nCategoria: ${k.categoria}` : ''}
Peças do kit (quantidade x nome no cadastro):
${pecas}
Regras: não invente peças, quantidades nem preços; não use as palavras "barato" ou "promoção"; nada de emojis.
Responda SOMENTE com JSON, sem markdown, neste formato:
{"nome": "nome comercial do kit, até 40 caracteres", "texto": "2 ou 3 frases, até 280 caracteres", "pecas": ["nome comercial de cada peça, sem a quantidade, na mesma ordem da lista"]}`;
    try {
        const r = (await window.apiAcao('ia_gerar', { prompt })).texto || '';
        const json = JSON.parse(r.slice(r.indexOf('{'), r.lastIndexOf('}') + 1));
        if (json.nome) $('kp-nome').value = String(json.nome).slice(0, 120);
        if (json.texto) $('kp-texto').value = String(json.texto).slice(0, 2000);
        const campos = [...document.querySelectorAll('.kp-item input')];
        (Array.isArray(json.pecas) ? json.pecas : []).forEach((n, i) => { if (campos[i] && n) campos[i].value = String(n).slice(0, 120); });
        window.toastMM('Sugestão pronta: confira e mude o que quiser antes de salvar');
    } catch (e) {
        window.mostrarAlerta('A IA não conseguiu sugerir', e instanceof SyntaxError ? 'A resposta veio num formato estranho. Tente de novo.' : e.message, 'warning');
    } finally { b.disabled = false; b.innerHTML = txt; }
};

// ---------- AJUSTES DA PÁGINA (título, texto, WhatsApp e Instagram) ----------
window.abrirAjustesPagina = async function() {
    if (!KT.cfg) { try { KT.cfg = (await window.apiAcao('obter_config')).config; } catch (e) { return window.mostrarAlerta('Erro', e.message, 'error'); } }
    const c = KT.cfg;
    window.abrirModalMM(`<h3 class="modal-title">${window.ic('ajustes')} Ajustes da página de kits</h3>
        <p class="texto-ajuda" style="margin-top:0;">Vale para a página inteira. Deixe em branco para usar o texto padrão.</p>
        <div class="input-group"><label for="ap-titulo">Título</label><input type="text" id="ap-titulo" value="${esc(c.pagina_titulo || '')}" placeholder="Kits para presentear" maxlength="80"></div>
        <div class="input-group"><label for="ap-texto">Texto de boas-vindas</label><textarea id="ap-texto" rows="2" maxlength="300" placeholder="Peças impressas em 3D, montadas à mão e prontas para encantar.">${esc(c.pagina_texto || '')}</textarea></div>
        <div class="input-group"><label for="ap-zap">WhatsApp para pedidos</label><input type="tel" id="ap-zap" value="${esc(c.pagina_whatsapp || c.telefone_admin || '')}" placeholder="(11) 98888-7777" maxlength="30">
            <small class="texto-ajuda">Aparece no botão "Quero este kit". Sem número, o botão não aparece.</small></div>
        <div class="input-group"><label for="ap-insta">Instagram (opcional)</label><input type="text" id="ap-insta" value="${esc(c.pagina_instagram || '')}" placeholder="@minimundo3d" maxlength="80" autocomplete="off"></div>
        <button class="btn-magic btn-global" id="btn-ap" onclick="salvarAjustesPagina()">${window.ic('check')} Salvar</button>`);
};
window.salvarAjustesPagina = async function() {
    const zap = $('ap-zap').value.trim();
    if (zap && zap.replace(/\D/g, '').length < 10) return window.mostrarAlerta('WhatsApp incompleto', 'Coloque o número com DDD, por exemplo (11) 98888-7777.', 'warning');
    const valores = { pagina_titulo: $('ap-titulo').value.trim(), pagina_texto: $('ap-texto').value.trim(), pagina_whatsapp: zap, pagina_instagram: $('ap-insta').value.trim() };
    const b = $('btn-ap'); b.disabled = true;
    try {
        const cfg = (await window.apiAcao('salvar_config', { valores })).config;
        if (cfg.pagina_whatsapp === undefined) throw new Error('Ação não reconhecida.');
        KT.cfg = cfg; window.configMM = Object.assign(window.configMM || {}, cfg);
        window.fecharModalMM(); window.renderizarKits(); window.toastMM('Página de kits atualizada');
    } catch (e) { window.mostrarAlerta('Não deu para salvar', servidorAntigo(e), 'error'); b.disabled = false; }
};
})();
