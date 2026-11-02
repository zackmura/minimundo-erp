// ==========================================
// 🛍️ PÁGINAS DE VENDA (Natal, Dia das Mães, Black Friday…)
// ==========================================
// Uma página por tema, com os kits e as peças escolhidos. Cada produto pode ter, só naquela página, nome,
// texto e preço promocional. O cliente monta a sacola e manda o pedido pelo WhatsApp (loja.html?p=link).
// Daqui também saem o link para as redes (com foto na prévia) e a arte pronta para Story e Feed.
(() => {
const $ = window.$;
const esc = s => window.esc(s);
const val = v => window.limparValorPlanilha(v);
window.PG = { lista: [], cfg: null, editando: null, escolha: { filtro: 'todos' }, fila: Promise.resolve() };
const API_BASE = (typeof API_PRECIFICACAO !== 'undefined' ? API_PRECIFICACAO : '').replace(/\/api$/, '');
const produtoPorId = id => (window.arrayBancoCustos || []).find(p => p.linha === id);
const paginaPorId = id => PG.lista.find(p => p.id === id);
// Kit sem foto própria usa a foto da primeira peça (igual à página do cliente)
const fotoPrincipal = p => ((p && window.fotosDe(p)) || [])[0] || (p && p.tipo === 'kit' ? (p.itens || []).map(i => ((window.fotosDe(produtoPorId(i.produto_id)) || [])[0])).find(Boolean) || '' : '');
const est = p => Math.max(0, parseInt(p && p.est_atelie) || 0);
const montaveis = k => (k.itens || []).length ? Math.min(...k.itens.map(i => Math.floor(est(produtoPorId(i.produto_id)) / (i.qtd || 1)))) : 0;
const prontaEntrega = p => est(p) > 0 || (p.tipo === 'kit' && montaveis(p) > 0);
const servidorAntigo = e => e.message === 'Ação não reconhecida.' ? 'O servidor ainda está na versão antiga. Atualize o server.js na alwaysdata.' : e.message;
const dataBR = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}` : ''; };
const slugDe = s => window.normMM(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const SLUG_TEMA = { natal: 'natal', blackfriday: 'black-friday', maes: 'dia-das-maes', namorados: 'dia-dos-namorados', pascoa: 'pascoa', pais: 'dia-dos-pais', criancas: 'dia-das-criancas' };

window.linkSocialPg = (slug, item) => `${API_BASE}/p/${encodeURIComponent(slug)}${item ? '/' + item : ''}`;
window.linkSitePg = (slug, item) => new URL(`loja.html?p=${encodeURIComponent(slug)}${item ? '&i=' + item : ''}`, location.href).href;
const nomeNaPagina = (it, p) => it.nome || (p ? p.modelo : '(produto removido)');
const precoNaPagina = (it, p) => it.preco > 0 ? it.preco : (p && p.preco_venda) || 0;

// ---------- Carregar ----------
window.carregarListaPaginas = async function() {
    try { PG.lista = (await window.apiAcao('listar_paginas')).paginas || []; }
    catch (e) { PG.lista = []; PG.erro = servidorAntigo(e); return; }
    PG.erro = '';
};
window.carregarPaginas = async function() {
    if ($('pg-lista') && !PG.lista.length) $('pg-lista').innerHTML = '<p class="mm-vazio">Carregando as páginas…</p>';
    await Promise.all([window.carregarListaPaginas(), (window.arrayBancoCustos || []).length ? null : window.carregarBancoDeCustos(),
        window.apiAcao('obter_config').then(r => { PG.cfg = r.config; }).catch(() => {})]);
    if (PG.editando && paginaPorId(PG.editando)) window.abrirEditorPagina(PG.editando); else window.renderizarPaginas();
};

// ---------- Lista de páginas ----------
window.renderizarPaginas = function() {
    const box = $('pg-lista'); if (!box) return;
    PG.editando = null; $('pg-editor').hidden = true; $('pg-lista-box').hidden = false;
    const c = PG.cfg || {};
    $('pg-aviso').innerHTML = PG.erro ? `<div class="mm-alerta">${window.ic('alerta')} <span>${esc(PG.erro)}</span></div>`
        : PG.cfg && !c.pagina_whatsapp ? `<div class="mm-alerta">${window.ic('alerta')} <span>Falta o WhatsApp que recebe os pedidos. Sem ele os clientes não conseguem mandar a sacola. <a onclick="abrirAjustesPaginas()">Colocar agora</a></span></div>` : '';
    if (!PG.lista.length) {
        box.innerHTML = `<div class="pg-vazio"><span class="pg-vazio-emoji">🎄</span><b>Crie a sua primeira página de venda</b>
            <span>Uma página por data especial, com os kits e as peças que você escolher, fotos, preços e pedido pelo WhatsApp.</span>
            <button class="btn-magic" onclick="novaPagina('natal')">${window.ic('mais')} Criar a página de Natal</button>
            <button class="btn-limpar" onclick="novaPagina()">Escolher outro tema</button></div>`;
        return;
    }
    box.innerHTML = PG.lista.map(p => {
        const t = window.temaMM(p.tema), capa = p.capa || (p.itens.map(i => fotoPrincipal(produtoPorId(i.produto_id))).find(Boolean) || '');
        const fundo = t.hero ? t.hero.fundo : t.cores.ouro3;
        return `<div class="pg-card ${p.ativa ? '' : 'pausada'}">
            <button type="button" class="pg-capa" onclick="abrirEditorPagina(${p.id})" style="background-color:${fundo};${capa ? `background-image:url('${esc(capa).replace(/'/g, '%27')}')` : ''}">
                <span class="pg-emoji">${t.emoji}</span><span class="pg-status ${p.ativa ? 'on' : ''}">${p.ativa ? 'No ar' : 'Pausada'}</span></button>
            <div class="pg-corpo">
                <b>${esc(p.titulo)}</b>
                <small>${esc(t.nome)} · ${p.itens.length} produto${p.itens.length === 1 ? '' : 's'}${p.pedidos_ate ? ` · encomendas até ${dataBR(p.pedidos_ate)}` : ''}</small>
                <div class="pg-numeros"><span title="Vezes que a página foi aberta">${window.ic('olho')} ${p.visitas} visita${p.visitas === 1 ? '' : 's'}</span><span title="Sacolas enviadas pelo WhatsApp">${window.ic('zap')} ${p.pedidos} pedido${p.pedidos === 1 ? '' : 's'}</span></div>
            </div>
            <div class="pg-botoes">
                <button class="btn-magic btn-pequeno" onclick="compartilharPaginaPg(${p.id})">${window.ic('zap')} Divulgar</button>
                <button class="btn-limpar" onclick="abrirEditorPagina(${p.id})">${window.ic('lapis')} Editar</button>
                <a class="btn-limpar" href="${esc(window.linkSitePg(p.slug))}" target="_blank" rel="noopener">${window.ic('olho')} Ver</a>
                <button class="btn-limpar" onclick="abrirArte(${p.id})">${window.ic('imagem')} Arte</button>
            </div></div>`;
    }).join('');
};

// ---------- Nova página (escolher o tema) ----------
const cardsTema = (atual, acao) => Object.entries(window.TEMAS_MM).map(([id, t]) => {
    const c = t.cores, f = t.hero ? t.hero.fundo : c.fundo;
    return `<button type="button" class="tema-op ${id === atual ? 'on' : ''}" data-tema="${id}" onclick="${acao}('${id}')">
        <span class="tema-amostra" style="background:${f}"><i style="background:${c.ouro}"></i><i style="background:${c.botao}"></i><i style="background:${c.papel}"></i><em>${t.emoji}</em></span><b>${esc(t.nome)}</b></button>`;
}).join('');
window.novaPagina = function(tema) {
    window.abrirModalMM(`<h3 class="modal-title">${window.ic('mais')} Nova página de venda</h3>
        <p class="texto-ajuda" style="margin-top:0;">Escolha o tema. Ele muda as cores, o enfeite do topo e o jeito que a IA escreve. Dá para trocar depois.</p>
        <div class="temas-grade" id="np-temas">${cardsTema(tema || 'natal', 'npTema')}</div>
        <div class="input-group" style="margin-top:14px;"><label for="np-titulo">Título da página</label><input type="text" id="np-titulo" maxlength="120" autocomplete="off"></div>
        <button class="btn-magic btn-global" id="btn-np" onclick="criarPagina()">${window.ic('check')} Criar e escolher os produtos</button>`);
    window.npTema(tema || 'natal');
};
window.npTema = function(id) {
    document.querySelectorAll('#np-temas .tema-op').forEach(b => b.classList.toggle('on', b.dataset.tema === id));
    $('np-temas').dataset.tema = id;
    const tit = $('np-titulo'), t = window.temaMM(id);
    if (!tit.value.trim() || Object.values(window.TEMAS_MM).some(x => x.titulo === tit.value)) tit.value = t.titulo;
};
window.criarPagina = async function() {
    const tema = $('np-temas').dataset.tema || 'padrao', titulo = $('np-titulo').value.trim(), t = window.temaMM(tema);
    if (!titulo) return $('np-titulo').focus();
    let base = SLUG_TEMA[tema] || slugDe(titulo) || 'colecao', slug = base, n = 2;
    while (PG.lista.some(p => p.slug === slug)) slug = `${base}-${n++}`;
    const b = $('btn-np'); b.disabled = true;
    try {
        const r = await window.apiAcao('salvar_pagina', { titulo, slug, tema, texto: t.texto, ativa: true });
        await window.carregarListaPaginas(); window.fecharModalMM();
        window.abrirEditorPagina(r.id);
        window.escolherProdutosPg();
    } catch (e) { window.mostrarAlerta('Não deu para criar', servidorAntigo(e), 'error'); b.disabled = false; }
};

// ---------- Editor ----------
window.abrirEditorPagina = function(id) {
    const p = paginaPorId(id); if (!p) return window.renderizarPaginas();
    PG.editando = id; PG.temaEditor = p.tema; PG.capaEditor = p.capa;
    $('pg-lista-box').hidden = true; $('pg-editor').hidden = false;
    const social = window.linkSocialPg(p.slug);
    $('pg-editor').innerHTML = `
        <div class="pg-ed-topo"><button class="btn-limpar" onclick="renderizarPaginas(); window.scrollTo(0, 0)">${window.ic('voltar')} Páginas</button>
            <a class="btn-limpar" href="${esc(window.linkSitePg(p.slug))}" target="_blank" rel="noopener">${window.ic('olho')} Ver página</a></div>
        <div class="pg-ed-grade">
        <div class="card">
            <div class="card-titulo">Tema e textos</div><p class="card-desc">O que o cliente vê no topo da página.</p>
            <div class="temas-grade mini" id="pe-temas">${cardsTema(p.tema, 'peTema')}</div>
            <div class="input-group" style="margin-top:14px;"><label for="pe-titulo">Título</label><input type="text" id="pe-titulo" value="${esc(p.titulo)}" maxlength="120"></div>
            <div class="input-group"><label for="pe-texto">Texto de boas-vindas</label><textarea id="pe-texto" rows="3" maxlength="1500">${esc(p.texto)}</textarea></div>
            <button type="button" class="btn-limpar ep-link" id="pe-ia" onclick="iaTextoPagina()" style="margin:-4px 0 14px;">✨ Escrever título e texto com IA</button>
            <div class="row">
                <div class="col"><div class="input-group"><label for="pe-ate">Encomendas até</label><input type="date" id="pe-ate" value="${esc(p.pedidos_ate)}"><small class="texto-ajuda">Aparece com contagem regressiva. Pode deixar vazio.</small></div></div>
                <div class="col"><div class="input-group"><label for="pe-slug">Link da página</label><div class="pe-slug"><span>…/p/</span><input type="text" id="pe-slug" value="${esc(p.slug)}" maxlength="60" autocomplete="off" autocapitalize="off" spellcheck="false"></div></div></div>
            </div>
            <div class="input-group"><label>Foto de capa <small class="rot-dica">opcional, larga, aparece embaixo do título</small></label><div class="pe-capa" id="pe-capa"></div></div>
            <label class="chave" style="margin:4px 0 16px;"><input type="checkbox" id="pe-ativa" ${p.ativa ? 'checked' : ''}> Página no ar (clientes conseguem abrir)</label>
            <button class="btn-magic btn-global" id="btn-pe" onclick="salvarPaginaPg()">${window.ic('check')} Salvar tema e textos</button>
        </div>
        <div>
            <div class="card">
                <div class="card-cabeca"><div class="card-titulo">Divulgar</div></div>
                <p class="card-desc" style="margin-top:-8px;">Link para WhatsApp, Instagram e Facebook. Ele mostra a foto, o título e o preço na prévia.</p>
                <div class="pe-link"><code>${esc(social.replace(/^https?:\/\//, ''))}</code><button class="btn-limpar" onclick="copiarTexto('${esc(social)}', 'Link da página copiado!')">${window.ic('copiar')} Copiar</button></div>
                <div class="pe-divulgar"><button class="btn-magic btn-pequeno" onclick="compartilharPaginaPg(${p.id})">${window.ic('zap')} Compartilhar</button><button class="btn-limpar" onclick="abrirArte(${p.id})">${window.ic('imagem')} Arte para Instagram</button></div>
                <div class="pg-numeros grande"><span>${window.ic('olho')} <b>${p.visitas}</b> visita${p.visitas === 1 ? '' : 's'}</span><span>${window.ic('zap')} <b>${p.pedidos}</b> pedido${p.pedidos === 1 ? '' : 's'} pelo WhatsApp</span></div>
            </div>
            <div class="card">
                <div class="card-cabeca"><div class="card-titulo">Produtos <span class="kit-conta" id="pe-conta"></span></div></div>
                <p class="card-desc" style="margin-top:-8px;">Kits e peças avulsas. Toque num produto para mudar nome, texto e preço só nesta página. Fica salvo na hora.</p>
                <div class="pe-acoes"><button class="btn-magic btn-pequeno" onclick="escolherProdutosPg()">${window.ic('mais')} Adicionar produtos</button><button class="btn-limpar" id="pe-ia-itens" onclick="iaTextosItens()">✨ Textos com IA</button></div>
                <div id="pe-itens"></div>
            </div>
            <button class="btn-limpar perigo ep-link" onclick="excluirPaginaPg(${p.id})">${window.ic('lixo')} Excluir esta página</button>
        </div></div>`;
    pintarCapa(); window.renderizarItensPg(); window.scrollTo(0, 0);
};
window.peTema = function(id) {
    PG.temaEditor = id;
    document.querySelectorAll('#pe-temas .tema-op').forEach(b => b.classList.toggle('on', b.dataset.tema === id));
    const tit = $('pe-titulo'), txt = $('pe-texto'), t = window.temaMM(id), padrao = Object.values(window.TEMAS_MM);
    if (padrao.some(x => x.titulo === tit.value)) tit.value = t.titulo;
    if (!txt.value.trim() || padrao.some(x => x.texto === txt.value)) txt.value = t.texto;
};
function pintarCapa() {
    const box = $('pe-capa'); if (!box) return;
    box.innerHTML = PG.capaEditor ? `<img src="${esc(PG.capaEditor)}" alt="" onerror="this.src='logo.png'"><button type="button" class="btn-limpar" onclick="trocarCapaPg()">${window.ic('camera')} Trocar</button><button type="button" class="btn-limpar perigo" onclick="PG.capaEditor=''; pintarCapaPg()">${window.ic('x')} Tirar</button>`
        : `<button type="button" class="btn-limpar" onclick="trocarCapaPg()">${window.ic('camera')} Escolher foto de capa</button>`;
}
window.pintarCapaPg = pintarCapa;
window.trocarCapaPg = function() {
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
    inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return;
        $('pe-capa').innerHTML = '<p class="texto-ajuda">⏳ Enviando a foto…</p>';
        try { PG.capaEditor = await window.fazerUploadInteligente(await window.comprimirImagem(f, 2000, 2000, 0.82)); window.toastMM('Foto pronta. Toque em "Salvar tema e textos".'); }
        catch (e) { window.mostrarAlerta('A foto não subiu', e.message, 'error'); }
        pintarCapa();
    };
    inp.click();
};
window.salvarPaginaPg = async function() {
    const p = paginaPorId(PG.editando); if (!p) return;
    const slug = slugDe($('pe-slug').value) || p.slug; $('pe-slug').value = slug;
    const dados = { id: p.id, titulo: $('pe-titulo').value.trim(), texto: $('pe-texto').value.trim(), tema: PG.temaEditor, slug, pedidos_ate: $('pe-ate').value, capa: PG.capaEditor || '', ativa: $('pe-ativa').checked };
    if (!dados.titulo) { $('pe-titulo').focus(); return window.mostrarAlerta('Falta o título', 'Dê um título para a página.', 'warning'); }
    if (slug !== p.slug && !await window.confirmarMM({ icone: '🔗', titulo: 'Mudar o link?', texto: `O link vai ficar …/p/${slug}.\nQuem tiver o link antigo (…/p/${p.slug}) não vai mais encontrar a página.`, ok: 'Mudar o link' })) return;
    const b = $('btn-pe'), txt = b.innerHTML; b.disabled = true; b.innerText = '⏳ Salvando…';
    try {
        await window.apiAcao('salvar_pagina', dados);
        Object.assign(p, dados); window.toastMM('Página salva');
        window.abrirEditorPagina(p.id);
    } catch (e) { window.mostrarAlerta('Não deu para salvar', servidorAntigo(e), 'error'); b.disabled = false; b.innerHTML = txt; }
};
window.excluirPaginaPg = async function(id) {
    const p = paginaPorId(id); if (!p) return;
    if (!await window.confirmarMM({ tipo: 'perigo', icone: '🗑️', titulo: `Excluir "${p.titulo}"?`, texto: 'A página sai do ar e o link para de funcionar. Os produtos continuam cadastrados.\nSe for usar de novo no ano que vem, prefira só desligar "Página no ar".', ok: 'Excluir página' })) return;
    try { await window.apiAcao('excluir_pagina', { id }); PG.lista = PG.lista.filter(x => x.id !== id); window.renderizarPaginas(); window.toastMM('Página excluída'); }
    catch (e) { window.mostrarAlerta('Não deu para excluir', servidorAntigo(e), 'error'); }
};

// ---------- Produtos da página ----------
// Toda mudança manda a lista inteira (em fila, para não atropelar quando você toca rápido)
function salvarItens(p) {
    const itens = p.itens.map(i => ({ produto_id: i.produto_id, nome: i.nome, descricao: i.descricao, preco: i.preco > 0 ? window.fmtPlanilha(i.preco) : '', destaque: !!i.destaque }));
    PG.fila = PG.fila.then(() => window.apiAcao('itens_pagina', { pagina_id: p.id, itens })).catch(e => window.mostrarAlerta('Não deu para salvar os produtos', servidorAntigo(e), 'error'));
    return PG.fila;
}
window.renderizarItensPg = function() {
    const p = paginaPorId(PG.editando), box = $('pe-itens'); if (!p || !box) return;
    $('pe-conta').innerText = p.itens.length || '';
    if (!p.itens.length) { box.innerHTML = `<div class="vazio-box pequeno">${window.ic('sacola')}<b>Nenhum produto ainda</b><span>Toque em "Adicionar produtos" e escolha kits e peças.</span></div>`; return; }
    box.innerHTML = p.itens.map((it, n) => {
        const prod = produtoPorId(it.produto_id), preco = precoNaPagina(it, prod), normal = (prod && prod.preco_venda) || 0;
        return `<div class="pi-linha ${prod && prod.ativo !== false ? '' : 'inativo'}">
            <button type="button" class="pi-abrir" onclick="editarItemPg(${it.produto_id})">
                <img src="${esc(fotoPrincipal(prod) || 'logo.png')}" alt="" loading="lazy" onerror="this.src='logo.png'">
                <span class="pi-info"><b>${it.destaque ? '<span class="pi-estrela" title="Destaque">★</span> ' : ''}${esc(nomeNaPagina(it, prod))}</b>
                    <small>${prod && prod.tipo === 'kit' ? '<span class="tag-kit">Kit</span> ' : ''}${preco ? `${it.preco > 0 && normal > it.preco ? `<s>${window.fmt(normal)}</s> ` : ''}${window.fmt(preco)}` : '<span class="neg">sem preço</span>'} · ${!prod ? 'removido' : prod.ativo === false ? 'inativo (não aparece)' : prontaEntrega(prod) ? 'pronta entrega' : 'sob encomenda'}${it.descricao ? '' : ' · <i>sem texto</i>'}</small></span></button>
            <span class="pi-ordem"><button type="button" onclick="moverItemPg(${n}, -1)" ${n ? '' : 'disabled'} aria-label="Subir">▲</button><button type="button" onclick="moverItemPg(${n}, 1)" ${n < p.itens.length - 1 ? '' : 'disabled'} aria-label="Descer">▼</button></span>
            <button type="button" class="pi-x" onclick="tirarItemPg(${it.produto_id})" title="Tirar da página">${window.ic('x')}</button></div>`;
    }).join('');
};
window.moverItemPg = function(n, d) {
    const p = paginaPorId(PG.editando), m = n + d; if (!p || m < 0 || m >= p.itens.length) return;
    [p.itens[n], p.itens[m]] = [p.itens[m], p.itens[n]];
    window.renderizarItensPg(); salvarItens(p);
};
window.tirarItemPg = function(pid) {
    const p = paginaPorId(PG.editando); if (!p) return;
    p.itens = p.itens.filter(i => i.produto_id !== pid);
    window.renderizarItensPg(); salvarItens(p); window.toastMM('Saiu da página');
};

// Escolher produtos: lista com foto (kits e peças), quem tem estoque primeiro; tocar põe ou tira da página
window.escolherProdutosPg = function() {
    const p = paginaPorId(PG.editando); if (!p) return;
    window.abrirModalMM(`<h3 class="modal-title">${window.ic('mais')} Produtos da página</h3>
        <p class="texto-ajuda" style="margin-top:0;">Toque para pôr ou tirar. Os que têm estoque no Ateliê aparecem primeiro.</p>
        <div class="busca-linha"><div class="busca-ic"><svg class="ic"><use href="#i-busca"/></svg><input type="search" id="ep-busca-pg" placeholder="Buscar produto…" autocomplete="off" oninput="renderizarEscolhaPg()"></div><select id="ep-cat-pg" class="filtro-cat" aria-label="Categoria" onchange="renderizarEscolhaPg()" hidden></select></div>
        <div class="chips-rolagem" id="ep-filtros-pg">${[['todos', 'Todos'], ['kit', 'Kits'], ['peca', 'Peças'], ['estoque', 'Com estoque'], ['pagina', 'Na página']].map(([f, r]) => `<button type="button" class="chip-op ${PG.escolha.filtro === f ? 'active' : ''}" data-f="${f}" onclick="filtroEscolhaPg('${f}')">${r} <em></em></button>`).join('')}</div>
        <div id="ep-lista-pg" class="pdv-lista kit-escolha"></div>
        <button class="btn-magic btn-global" style="margin-top:14px;" onclick="fecharModalMM()">${window.ic('check')} Pronto</button>`);
    window.renderizarEscolhaPg();
};
window.filtroEscolhaPg = function(f) { PG.escolha.filtro = f; document.querySelectorAll('#ep-filtros-pg button').forEach(b => b.classList.toggle('active', b.dataset.f === f)); window.renderizarEscolhaPg(); };
window.renderizarEscolhaPg = function() {
    const p = paginaPorId(PG.editando), box = $('ep-lista-pg'); if (!p || !box) return;
    const todos = (window.arrayBancoCustos || []).filter(x => x.ativo !== false), t = $('ep-busca-pg').value, na = new Set(p.itens.map(i => i.produto_id));
    window.montarFiltroCategoria('ep-cat-pg', todos); const cat = $('ep-cat-pg').value, f = PG.escolha.filtro;
    const conta = { todos: todos.length, kit: todos.filter(x => x.tipo === 'kit').length, peca: todos.filter(x => x.tipo !== 'kit').length, estoque: todos.filter(prontaEntrega).length, pagina: na.size };
    document.querySelectorAll('#ep-filtros-pg button').forEach(b => { b.querySelector('em').innerText = conta[b.dataset.f] || ''; });
    const lista = todos.filter(x => (f === 'todos' || (f === 'kit' ? x.tipo === 'kit' : f === 'peca' ? x.tipo !== 'kit' : f === 'estoque' ? prontaEntrega(x) : na.has(x.linha)))
        && window.categoriaBate(x, cat) && window.produtoBate(x, t))
        .sort((a, b) => prontaEntrega(b) - prontaEntrega(a) || String(a.modelo).localeCompare(String(b.modelo), 'pt-BR'));
    if (!lista.length) { box.innerHTML = `<div class="vazio-box pequeno">${window.ic('busca')}<b>${t.trim() ? `Nada encontrado para "${esc(t)}"` : 'Nada nesse filtro'}</b></div>`; return; }
    box.innerHTML = lista.map(x => {
        const dentro = na.has(x.linha), pronta = prontaEntrega(x), nf = window.fotosDe(x).length;
        return `<div class="pdv-lin ${dentro ? 'no-carrinho' : ''} ${pronta ? '' : 'sem'}" onclick="alternarProdutoPg(${x.linha})" role="button" tabindex="0">
            ${nf ? `<span class="pl-foto" data-n="${nf > 1 ? nf : ''}" onclick="event.stopPropagation(); tocarFotoProduto(${x.linha})" title="Ver as fotos">` : ''}<img src="${esc(fotoPrincipal(x) || 'logo.png')}" onerror="this.src='logo.png'" alt="" loading="lazy">${nf ? '</span>' : ''}
            <div class="pl-info"><b>${x.tipo === 'kit' ? '<span class="tag-kit">Kit</span> ' : ''}${esc(x.modelo)}</b><small><span class="pl-preco">${x.preco_venda ? window.fmt(x.preco_venda) : '<i>sem preço</i>'}</span> · <span class="pp-est ${pronta ? '' : 'zero'}">${pronta ? (est(x) ? `${est(x)} no Ateliê` : 'dá para montar') : 'sob encomenda'}</span>${x.categoria ? ` · ${esc(x.categoria)}` : ''}</small></div>
            ${dentro ? `<span class="pl-add ok">${window.ic('check')}</span>` : `<span class="pl-add">${window.ic('mais')}</span>`}</div>`;
    }).join('');
};
window.alternarProdutoPg = function(pid) {
    const p = paginaPorId(PG.editando); if (!p) return;
    if (p.itens.some(i => i.produto_id === pid)) p.itens = p.itens.filter(i => i.produto_id !== pid);
    else p.itens.push({ produto_id: pid, nome: '', descricao: '', preco: null, destaque: false });
    window.renderizarEscolhaPg(); window.renderizarItensPg(); salvarItens(p);
};

// Produto nesta página: nome, texto, preço promocional, destaque e (kit) o nome das peças
window.editarItemPg = function(pid) {
    const p = paginaPorId(PG.editando), it = p && p.itens.find(i => i.produto_id === pid), prod = produtoPorId(pid); if (!it || !prod) return;
    const kit = prod.tipo === 'kit', normal = prod.preco_venda || 0;
    window.abrirModalMM(`<h3 class="modal-title">${window.ic('lapis')} Produto nesta página</h3>
        <div class="ep-topo"><div><b>${kit ? 'Kit' : 'Peça'} · ${esc(prod.modelo)}</b><small>Preço normal: ${normal ? window.fmt(normal) : 'sem preço'} · ${prontaEntrega(prod) ? 'pronta entrega' : 'sob encomenda'}</small></div></div>
        <div class="input-group"><label>Fotos <small class="rot-dica">valem para todas as páginas</small></label>${window.fotosFaixa(pid)}</div>
        <div class="input-group"><label for="ip-nome">Nome nesta página</label><input type="text" id="ip-nome" value="${esc(it.nome)}" placeholder="${esc(prod.modelo)}" maxlength="120" autocomplete="off"></div>
        <div class="input-group"><label for="ip-desc">Texto</label><textarea id="ip-desc" rows="3" maxlength="1500" placeholder="Conte o que torna esse ${kit ? 'kit' : 'produto'} especial.">${esc(it.descricao)}</textarea></div>
        <button type="button" class="btn-limpar ep-link" id="ip-ia" onclick="iaTextoItem(${pid})" style="margin:-4px 0 14px;">✨ Escrever nome e texto com IA</button>
        <div class="input-group"><label for="ip-preco">Preço nesta página <small class="rot-dica">opcional</small></label><input type="text" id="ip-preco" class="mask-money" inputmode="numeric" value="${it.preco > 0 ? window.fmt(it.preco) : ''}" placeholder="${normal ? `${window.fmt(normal)} (preço normal)` : 'R$ 0,00'}">
            <small class="texto-ajuda">Mais barato que o normal = aparece "de ${normal ? window.fmt(normal) : 'R$ X'} por…" com a % de desconto.</small></div>
        <label class="chave" style="margin:0 0 14px;"><input type="checkbox" id="ip-destaque" ${it.destaque ? 'checked' : ''}> Destaque (aparece primeiro, no topo)</label>
        ${kit ? `<div class="input-group"><label>Nome das peças para o cliente <small class="rot-dica">vale em todas as páginas</small></label><div class="kp-itens">${(prod.itens || []).map(i => { const x = produtoPorId(i.produto_id); return `<div class="kp-item"><img src="${esc(fotoPrincipal(x) || 'logo.png')}" alt="" onerror="this.src='logo.png'"><span class="kp-q">${i.qtd}×</span><input type="text" data-pid="${i.produto_id}" value="${esc(i.nome_vitrine || '')}" placeholder="${esc(x ? x.modelo : '')}" maxlength="120" autocomplete="off"></div>`; }).join('')}</div></div>` : ''}
        <button class="btn-magic btn-global" id="btn-ip" onclick="salvarItemPg(${pid})">${window.ic('check')} Salvar</button>
        <div class="ip-mais"><button type="button" class="btn-limpar" onclick="compartilharItemPg(${pid})">${window.ic('zap')} Compartilhar</button><button type="button" class="btn-limpar" onclick="fecharModalMM(); abrirArte(${p.id}, ${pid})">${window.ic('imagem')} Arte</button><button type="button" class="btn-limpar perigo" onclick="fecharModalMM(); tirarItemPg(${pid})">${window.ic('x')} Tirar</button></div>`);
};
window.salvarItemPg = async function(pid) {
    const p = paginaPorId(PG.editando), it = p && p.itens.find(i => i.produto_id === pid), prod = produtoPorId(pid); if (!it || !prod) return;
    const igual = (v, padrao) => { v = String(v || '').trim(); return v === String(padrao || '').trim() ? '' : v; };
    Object.assign(it, { nome: igual($('ip-nome').value, prod.modelo), descricao: $('ip-desc').value.trim(), preco: $('ip-preco').value ? val($('ip-preco').value) : null, destaque: $('ip-destaque').checked });
    const b = $('btn-ip'); b.disabled = true;
    try {
        const nomes = [...document.querySelectorAll('.kp-item input')].map(inp => { const x = produtoPorId(+inp.dataset.pid); return { produto_id: +inp.dataset.pid, nome_vitrine: igual(inp.value, x && x.modelo) }; });
        const mudou = nomes.some(n => { const k = (prod.itens || []).find(i => i.produto_id === n.produto_id); return k && (k.nome_vitrine || '') !== n.nome_vitrine; });
        if (prod.tipo === 'kit' && mudou) { await window.apiAcao('nomes_kit', { kit_id: pid, itens: nomes }); nomes.forEach(n => { const k = prod.itens.find(i => i.produto_id === n.produto_id); if (k) k.nome_vitrine = n.nome_vitrine; }); }
        await salvarItens(p);
        window.fecharModalMM(); window.renderizarItensPg(); window.toastMM('Produto salvo nesta página');
    } catch (e) { window.mostrarAlerta('Não deu para salvar', servidorAntigo(e), 'error'); b.disabled = false; }
};

// ---------- Divulgar ----------
window.compartilharPaginaPg = function(id) {
    const p = paginaPorId(id); if (!p) return;
    if (!p.ativa) return window.mostrarAlerta('Página pausada', 'Ligue "Página no ar" no editor para os clientes conseguirem abrir o link.', 'warning');
    const t = window.temaMM(p.tema);
    window.compartilharMM(p.titulo, `${t.emoji} *${p.titulo}*\n${p.texto || t.texto}${p.pedidos_ate ? `\n🎁 Encomendas até ${dataBR(p.pedidos_ate)}` : ''}\n\nVeja as fotos e faça seu pedido: ${window.linkSocialPg(p.slug)}`);
};
window.compartilharItemPg = function(pid, pagId) {
    const p = paginaPorId(pagId || PG.editando), it = p && p.itens.find(i => i.produto_id === pid), prod = produtoPorId(pid); if (!it || !prod) return;
    if (!p.ativa) return window.mostrarAlerta('Página pausada', `A página "${p.titulo}" está fora do ar. Ligue "Página no ar" para o link funcionar.`, 'warning');
    const preco = precoNaPagina(it, prod), t = window.temaMM(p.tema);
    window.compartilharMM(nomeNaPagina(it, prod), `${t.emoji} *${nomeNaPagina(it, prod)}*${preco ? ` por ${window.fmt(preco)}` : ''}\n${it.descricao || ''}${prod.tipo === 'kit' ? `\n${(prod.itens || []).map(i => `• ${i.qtd}× ${i.nome_vitrine || (produtoPorId(i.produto_id) || {}).modelo || ''}`).join('\n')}` : ''}\n\nVeja as fotos: ${window.linkSocialPg(p.slug, pid)}`.replace(/\n{3,}/g, '\n\n'));
};
// Em quais páginas o produto aparece (atalho no Kits e na edição rápida)
window.paginasDoProduto = async function(pid) {
    const prod = produtoPorId(pid); if (!prod) return;
    if (!PG.lista.length) await window.carregarListaPaginas();
    if (PG.erro) return window.mostrarAlerta('Páginas de venda', PG.erro, 'warning');
    window.abrirModalMM(`<h3 class="modal-title">${window.ic('sacola')} Páginas de venda</h3>
        <p class="texto-ajuda" style="margin-top:0;">Em quais páginas <b>${esc(prod.modelo)}</b> aparece para os clientes.</p>
        ${PG.lista.length ? `<div class="pp-lista">${PG.lista.map(p => { const t = window.temaMM(p.tema), dentro = p.itens.some(i => i.produto_id === pid);
            return `<label class="pp-op"><input type="checkbox" ${dentro ? 'checked' : ''} onchange="alternarEmPagina(${p.id}, ${pid}, this.checked)"><span class="pp-emoji">${t.emoji}</span><span><b>${esc(p.titulo)}</b><small>${p.ativa ? 'No ar' : 'Pausada'} · ${p.itens.length} produtos</small></span>
                ${dentro && p.ativa ? `<button type="button" class="btn-limpar" onclick="event.preventDefault(); compartilharItemPg(${pid}, ${p.id})">${window.ic('zap')}</button>` : ''}</label>`; }).join('')}</div>` : '<p class="mm-vazio">Nenhuma página criada ainda.</p>'}
        <button class="btn-limpar ep-link" onclick="fecharModalMM(); switchTab('paginas'); novaPagina()">${window.ic('mais')} Criar uma página nova</button>`);
};
window.alternarEmPagina = async function(pagId, pid, dentro) {
    const p = paginaPorId(pagId); if (!p) return;
    if (dentro && !p.itens.some(i => i.produto_id === pid)) p.itens.push({ produto_id: pid, nome: '', descricao: '', preco: null, destaque: false });
    if (!dentro) p.itens = p.itens.filter(i => i.produto_id !== pid);
    await salvarItens(p); window.toastMM(dentro ? `Entrou em "${p.titulo}"` : `Saiu de "${p.titulo}"`);
    window.paginasDoProduto(pid); if (window.renderizarKits) window.renderizarKits();
};

// ---------- Ajustes gerais ----------
window.abrirAjustesPaginas = async function() {
    if (!PG.cfg) { try { PG.cfg = (await window.apiAcao('obter_config')).config; } catch (e) { return window.mostrarAlerta('Erro', e.message, 'error'); } }
    const c = PG.cfg;
    window.abrirModalMM(`<h3 class="modal-title">${window.ic('ajustes')} Ajustes das páginas</h3>
        <p class="texto-ajuda" style="margin-top:0;">Valem para todas as páginas de venda.</p>
        <div class="input-group"><label for="ap-zap">WhatsApp que recebe os pedidos</label><input type="tel" id="ap-zap" value="${esc(c.pagina_whatsapp || c.telefone_admin || '')}" placeholder="(11) 98888-7777" maxlength="30">
            <small class="texto-ajuda">A sacola do cliente chega neste número. Sem ele, a sacola não aparece.</small></div>
        <div class="input-group"><label for="ap-insta">Instagram (opcional)</label><input type="text" id="ap-insta" value="${esc(c.pagina_instagram || '')}" placeholder="@minimundo3d" maxlength="80" autocomplete="off"></div>
        <div class="input-group"><label for="ap-site">Endereço do site</label><input type="url" id="ap-site" value="${esc(c.site_url || 'https://minimundo.vivainteligente.net')}" maxlength="120" autocomplete="off">
            <small class="texto-ajuda">Para onde o link das redes leva. Só mude se o site mudar de endereço.</small></div>
        <button class="btn-magic btn-global" id="btn-ap" onclick="salvarAjustesPaginas()">${window.ic('check')} Salvar</button>`);
};
window.salvarAjustesPaginas = async function() {
    const zap = $('ap-zap').value.trim(), site = $('ap-site').value.trim().replace(/\/+$/, '');
    if (zap && zap.replace(/\D/g, '').length < 10) return window.mostrarAlerta('WhatsApp incompleto', 'Coloque o número com DDD, por exemplo (11) 98888-7777.', 'warning');
    if (!/^https?:\/\/[^\s]+$/i.test(site)) return window.mostrarAlerta('Endereço do site', 'O endereço precisa começar com https://', 'warning');
    const b = $('btn-ap'); b.disabled = true;
    try {
        const cfg = (await window.apiAcao('salvar_config', { valores: { pagina_whatsapp: zap, pagina_instagram: $('ap-insta').value.trim(), site_url: site } })).config;
        if (cfg.site_url === undefined) throw new Error('Ação não reconhecida.');
        PG.cfg = cfg; window.configMM = Object.assign(window.configMM || {}, cfg);
        window.fecharModalMM(); window.renderizarPaginas(); window.toastMM('Ajustes das páginas salvos');
    } catch (e) { window.mostrarAlerta('Não deu para salvar', servidorAntigo(e), 'error'); b.disabled = false; }
};

// ---------- IA com o clima do tema ----------
async function perguntarIA(prompt) {
    const r = (await window.apiAcao('ia_gerar', { prompt })).texto || '';
    return JSON.parse(r.slice(r.indexOf('{'), r.lastIndexOf('}') + 1));
}
const REGRAS_IA = 'Escreva em português do Brasil, com elegância e carinho, frases curtas. Não invente peças, quantidades, materiais nem preços. Não use as palavras "barato" ou "promoção". Sem emojis e sem hashtags.';
const descreverProduto = (prod, it) => `id ${prod.linha} | ${prod.tipo === 'kit' ? 'KIT' : 'peça'} | nome no cadastro: ${prod.modelo}${prod.categoria ? ` | categoria: ${prod.categoria}` : ''}${prod.tipo === 'kit' ? ` | vem no kit: ${(prod.itens || []).map(i => `${i.qtd}x ${(produtoPorId(i.produto_id) || {}).modelo || 'peça'}`).join(', ')}` : ''}${it && it.nome ? ` | nome atual na página: ${it.nome}` : ''}`;
window.iaTextoPagina = async function() {
    const p = paginaPorId(PG.editando); if (!p) return;
    const t = window.temaMM(PG.temaEditor), b = $('pe-ia'), txt = b.innerHTML; b.disabled = true; b.innerText = '⏳ A IA está escrevendo…';
    try {
        const j = await perguntarIA(`Você escreve para a Mini Mundo, ateliê de peças impressas em 3D feitas à mão.
Crie o título e o texto de boas-vindas de uma página de vendas com o tema ${t.nome} (${t.ia}).
Produtos da página: ${p.itens.map(i => (produtoPorId(i.produto_id) || {}).modelo).filter(Boolean).slice(0, 30).join(', ') || 'ainda não escolhidos'}.
${REGRAS_IA}
Responda SOMENTE com JSON, sem markdown: {"titulo": "até 45 caracteres", "texto": "1 ou 2 frases, até 200 caracteres"}`);
        if (j.titulo) $('pe-titulo').value = String(j.titulo).slice(0, 120);
        if (j.texto) $('pe-texto').value = String(j.texto).slice(0, 1500);
        window.toastMM('Sugestão pronta: confira e toque em Salvar');
    } catch (e) { window.mostrarAlerta('A IA não conseguiu escrever', e instanceof SyntaxError ? 'A resposta veio num formato estranho. Tente de novo.' : e.message, 'warning'); }
    finally { b.disabled = false; b.innerHTML = txt; }
};
window.iaTextoItem = async function(pid) {
    const p = paginaPorId(PG.editando), prod = produtoPorId(pid); if (!p || !prod) return;
    const t = window.temaMM(p.tema), b = $('ip-ia'), txt = b.innerHTML; b.disabled = true; b.innerText = '⏳ A IA está escrevendo…';
    try {
        const j = await perguntarIA(`Você escreve para a Mini Mundo, ateliê de peças impressas em 3D feitas à mão.
Página de vendas "${p.titulo}", tema ${t.nome} (${t.ia}).
Crie um nome comercial e um texto de venda para este produto, combinando com o tema:
${descreverProduto(prod)}
${REGRAS_IA}
Responda SOMENTE com JSON, sem markdown: {"nome": "até 45 caracteres", "texto": "2 ou 3 frases, até 260 caracteres"${prod.tipo === 'kit' ? ', "pecas": [{"cadastro": "nome da peça no cadastro, igual à lista", "nome": "nome comercial, sem a quantidade"}]' : ''}}`);
        if (j.nome) $('ip-nome').value = String(j.nome).slice(0, 120);
        if (j.texto) $('ip-desc').value = String(j.texto).slice(0, 1500);
        // Cada nome vai para a peça certa pelo nome do cadastro (a IA às vezes muda a ordem)
        const campos = [...document.querySelectorAll('.kp-item input')];
        (Array.isArray(j.pecas) ? j.pecas : []).forEach((x, i) => {
            const nome = typeof x === 'string' ? x : x && x.nome, alvo = x && x.cadastro ? campos.find(c => window.normMM(c.placeholder) === window.normMM(x.cadastro)) : campos[i];
            if (alvo && nome) alvo.value = String(nome).slice(0, 120);
        });
        window.toastMM('Sugestão pronta: confira e toque em Salvar');
    } catch (e) { window.mostrarAlerta('A IA não conseguiu escrever', e instanceof SyntaxError ? 'A resposta veio num formato estranho. Tente de novo.' : e.message, 'warning'); }
    finally { b.disabled = false; b.innerHTML = txt; }
};
// Todos de uma vez: escreve para quem está sem texto (ou reescreve todos, se você pedir)
window.iaTextosItens = async function() {
    const p = paginaPorId(PG.editando); if (!p || !p.itens.length) return window.mostrarAlerta('Sem produtos', 'Adicione produtos na página primeiro.', 'warning');
    const sem = p.itens.filter(i => !i.descricao);
    let alvo = sem;
    if (!sem.length) {
        if (!await window.confirmarMM({ icone: '✨', titulo: 'Reescrever todos?', texto: 'Todos os produtos já têm texto. A IA vai escrever nome e texto novos para todos.', ok: 'Reescrever todos' })) return;
        alvo = p.itens;
    } else if (!await window.confirmarMM({ icone: '✨', titulo: `Escrever ${sem.length} texto${sem.length > 1 ? 's' : ''}?`, texto: `A IA vai criar nome e texto, com o clima de ${window.temaMM(p.tema).nome}, para os produtos que estão sem texto.\nOs que você já escreveu ficam como estão.`, ok: 'Escrever' })) return;
    alvo = alvo.slice(0, 40);
    const t = window.temaMM(p.tema), b = $('pe-ia-itens'), txt = b.innerHTML; b.disabled = true; b.innerText = '⏳ Escrevendo…';
    try {
        const j = await perguntarIA(`Você escreve para a Mini Mundo, ateliê de peças impressas em 3D feitas à mão.
Página de vendas "${p.titulo}", tema ${t.nome} (${t.ia}).
Para cada produto abaixo, crie um nome comercial e um texto de venda curto, combinando com o tema e variando o começo das frases:
${alvo.map(i => descreverProduto(produtoPorId(i.produto_id) || { linha: i.produto_id, modelo: '' }, i)).join('\n')}
${REGRAS_IA}
Responda SOMENTE com JSON, sem markdown: {"itens": [{"id": número do id, "nome": "até 45 caracteres", "texto": "2 frases, até 220 caracteres"}]}`);
        let n = 0;
        (Array.isArray(j.itens) ? j.itens : []).forEach(x => { const it = alvo.find(i => i.produto_id === parseInt(x.id)); if (it && x.texto) { it.nome = String(x.nome || it.nome).slice(0, 120); it.descricao = String(x.texto).slice(0, 1500); n++; } });
        if (!n) throw new SyntaxError('vazio');
        await salvarItens(p); window.renderizarItensPg();
        window.mostrarAlerta('Textos prontos!', `${n} produto${n > 1 ? 's' : ''} com nome e texto novos. Toque em cada um para conferir ou mudar.`, 'success');
    } catch (e) { window.mostrarAlerta('A IA não conseguiu escrever', e instanceof SyntaxError ? 'A resposta veio num formato estranho. Tente de novo.' : e.message, 'warning'); }
    finally { b.disabled = false; b.innerHTML = txt; }
};

// ---------- Arte para as redes (Story, Feed) ----------
const FORMATOS = { story: [1080, 1920, 'Story'], post: [1080, 1350, 'Feed'], quadrado: [1080, 1080, 'Quadrado'] };
let fontesProntas = null;
function carregarFontes() {
    if (fontesProntas) return fontesProntas;
    if (!document.getElementById('fonte-arte')) document.head.insertAdjacentHTML('beforeend', '<link id="fonte-arte" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@500;600;700&display=swap">');
    fontesProntas = Promise.race([Promise.all(['500 80px Fraunces', '600 80px Fraunces', '600 30px Inter', '700 30px Inter'].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 4000))]);
    return fontesProntas;
}
// Fotos de outro site passam pelo servidor para o navegador deixar desenhar
function carregarImagem(url) {
    return new Promise(res => {
        if (!url) return res(null);
        const img = new Image(), mesmo = url.startsWith(location.origin) || !/^https?:/i.test(url);
        img.crossOrigin = 'anonymous'; img.onload = () => res(img); img.onerror = () => res(null);
        img.src = mesmo ? url : `${API_BASE}/foto?u=${encodeURIComponent(url)}`;
        setTimeout(() => res(null), 15000);
    });
}
function quebrarTexto(ctx, texto, larg, maxLinhas) {
    const palavras = String(texto || '').split(/\s+/).filter(Boolean), linhas = [];
    let atual = '';
    palavras.forEach(w => { const t = atual ? atual + ' ' + w : w; if (ctx.measureText(t).width > larg && atual) { linhas.push(atual); atual = w; } else atual = t; });
    if (atual) linhas.push(atual);
    if (linhas.length > maxLinhas) { linhas.length = maxLinhas; let u = linhas[maxLinhas - 1]; while (ctx.measureText(u + '…').width > larg && u.length) u = u.slice(0, -1); linhas[maxLinhas - 1] = u.trimEnd() + '…'; }
    return linhas;
}
function retanguloRedondo(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function cobrir(ctx, img, x, y, w, h) { const e = Math.max(w / img.width, h / img.height), sw = w / e, sh = h / e; ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h); }
function textoEspacado(ctx, txt, x, y, esp) { const largura = [...txt].reduce((s, ch) => s + ctx.measureText(ch).width + esp, -esp); let cx = x - largura / 2; [...txt].forEach(ch => { ctx.fillText(ch, cx + ctx.measureText(ch).width / 2, y); cx += ctx.measureText(ch).width + esp; }); }
async function desenharArte(canvas, o) {
    await carregarFontes();
    const [W, H] = FORMATOS[o.formato], ctx = canvas.getContext('2d'), t = window.temaMM(o.pagina.tema), c = t.cores, h = t.hero;
    canvas.width = W; canvas.height = H;
    const cor = { fundo: h ? h.fundo : c.papel, fundo2: h ? h.fundo2 : c.fundo, tinta: h ? h.tinta : c.tinta, suave: h ? h.suave : c.suave, ouro: h ? h.ouro : c.ouro };
    const g = ctx.createRadialGradient(W / 2, H * 0.12, 40, W / 2, H * 0.45, H * 0.95); g.addColorStop(0, cor.fundo); g.addColorStop(1, cor.fundo2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    window.desenharEnfeiteMM(ctx, o.pagina.tema, W, H, true);
    const story = o.formato === 'story', quad = o.formato === 'quadrado', pad = W * 0.08;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    let y = story ? 130 : quad ? 56 : 70;
    // Logo num círculo
    const L = story ? 150 : quad ? 104 : 120, logo = await carregarImagem(new URL('logo.png', location.href).href);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(W / 2, y + L / 2, L / 2 + 6, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(W / 2, y + L / 2, L / 2 + 14, 0, Math.PI * 2); ctx.strokeStyle = cor.ouro; ctx.lineWidth = 2.5; ctx.stroke();
    if (logo) { ctx.save(); ctx.beginPath(); ctx.arc(W / 2, y + L / 2, L / 2, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(logo, W / 2 - L / 2 + 6, y + 6, L - 12, L - 12); ctx.restore(); }
    y += L + (story ? 74 : 56);
    ctx.fillStyle = cor.ouro; ctx.font = `600 ${story ? 26 : 22}px Inter`; textoEspacado(ctx, t.selo.toUpperCase(), W / 2, y, story ? 6 : 5);
    y += story ? 40 : 30;
    // Título
    const item = o.item, titulo = item ? item.nome : o.pagina.titulo, tam = story ? 84 : quad ? 58 : 68;
    ctx.fillStyle = cor.tinta; ctx.font = `500 ${tam}px Fraunces`;
    const linhas = quebrarTexto(ctx, titulo, W - pad * 2, 2);
    linhas.forEach(l => { y += tam * 1.08; ctx.fillText(l, W / 2, y); });
    y += story ? 56 : quad ? 30 : 40;
    // Foto (produto) ou mosaico (página): ocupa o que sobra entre o título e o bloco de preço + faixa de baixo
    const fsDe = story ? 34 : 28, fsPreco = story ? 92 : quad ? 62 : 74, fsTxt = story ? 34 : 28, vao = story ? 64 : quad ? 40 : 50;
    const linhasTxt = item && item.preco ? [] : (ctx.font = `500 ${fsTxt}px Inter`, quebrarTexto(ctx, o.pagina.texto || t.texto, W - pad * 2.4, quad ? 1 : 2));
    const blocoPreco = item && item.preco ? (item.de ? fsDe + 14 : 0) + fsPreco * 0.82 : linhasTxt.length * fsTxt * 1.4;
    const topoFaixa = story ? H - 250 : H - (quad ? 134 : 150);
    const lado = Math.min(W - pad * 2, topoFaixa - (story ? 60 : 40) - blocoPreco - vao - y), x0 = (W - lado) / 2, raio = story ? 44 : 34;
    const fotos = item ? [item.foto] : o.fotos.slice(0, 4), imgs = (await Promise.all(fotos.map(carregarImagem))).filter(Boolean);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18; retanguloRedondo(ctx, x0 - 10, y - 10, lado + 20, lado + 20, raio + 8); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
    ctx.save(); retanguloRedondo(ctx, x0, y, lado, lado, raio); ctx.clip(); ctx.fillStyle = c.ouro3; ctx.fillRect(x0, y, lado, lado);
    if (imgs.length <= 1) { if (imgs[0]) cobrir(ctx, imgs[0], x0, y, lado, lado); else if (logo) ctx.drawImage(logo, x0 + lado * .25, y + lado * .25, lado * .5, lado * .5); }
    else { const m = lado / 2, pos = imgs.length === 2 ? [[0, 0, m, lado], [m, 0, m, lado]] : imgs.length === 3 ? [[0, 0, m, lado], [m, 0, m, m], [m, m, m, m]] : [[0, 0, m, m], [m, 0, m, m], [0, m, m, m], [m, m, m, m]];
        imgs.forEach((im, i) => { const [a, b, w2, h2] = pos[i]; cobrir(ctx, im, x0 + a + 3, y + b + 3, w2 - 6, h2 - 6); }); }
    ctx.restore();
    y += lado + 10 + vao;
    // Preço (produto: "de" riscado em cima) ou texto (página)
    if (item && item.preco) {
        if (item.de) { ctx.font = `500 ${fsDe}px Inter`; ctx.fillStyle = cor.suave; const d = `de ${window.fmt(item.de)}`; y += fsDe * 0.8; ctx.fillText(d, W / 2, y); const lw = ctx.measureText(d).width; ctx.fillRect(W / 2 - lw / 2, y - fsDe * 0.32, lw, 2); y += 14; }
        ctx.font = `500 ${fsPreco}px Fraunces`; ctx.fillStyle = cor.tinta; y += fsPreco * 0.78; ctx.fillText(window.fmt(item.preco), W / 2, y);
    } else {
        ctx.font = `500 ${fsTxt}px Inter`; ctx.fillStyle = cor.suave;
        linhasTxt.forEach(l => { y += fsTxt * 1.1; ctx.fillText(l, W / 2, y); y += fsTxt * 0.3; });
    }
    // Faixa de chamada e endereço
    const chamada = o.pagina.pedidos_ate ? `Encomendas até ${dataBR(o.pagina.pedidos_ate)}` : 'Peça pelo WhatsApp';
    ctx.font = `700 ${story ? 32 : 26}px Inter`; const cw = ctx.measureText(chamada).width + (story ? 90 : 70), ch = story ? 84 : 66, cy = topoFaixa;
    retanguloRedondo(ctx, (W - cw) / 2, cy, cw, ch, ch / 2); ctx.fillStyle = cor.ouro; ctx.fill();
    ctx.fillStyle = h ? h.fundo2 : '#fff'; ctx.fillText(chamada, W / 2, cy + ch / 2 + (story ? 11 : 9));
    ctx.font = `600 ${story ? 28 : 22}px Inter`; ctx.fillStyle = cor.suave;
    ctx.fillText(story ? 'Link nos stories · ' + o.dominio : o.dominio, W / 2, H - (story ? 110 : quad ? 34 : 56));
}
window.abrirArte = async function(pagId, pid) {
    const p = paginaPorId(pagId); if (!p) return;
    if (!p.itens.length) return window.mostrarAlerta('Sem produtos', 'Adicione produtos na página para montar a arte.', 'warning');
    PG.arte = { pagina: p, formato: (PG.arte && PG.arte.formato) || 'story', pid: pid || 0 };
    window.abrirModalMM(`<h3 class="modal-title">${window.ic('imagem')} Arte para as redes</h3>
        <div class="seg-mini largo" id="ar-formatos">${Object.entries(FORMATOS).map(([k, f]) => `<button type="button" data-f="${k}" class="${k === PG.arte.formato ? 'active' : ''}" onclick="arteFormato('${k}')">${f[2]}</button>`).join('')}</div>
        <div class="input-group" style="margin:12px 0 10px;"><select id="ar-item" onchange="PG.arte.pid = +this.value; desenharArtePg()"><option value="0">A página toda (${p.itens.length} produtos)</option>${p.itens.map(i => { const x = produtoPorId(i.produto_id); return x ? `<option value="${i.produto_id}" ${i.produto_id === pid ? 'selected' : ''}>${esc(nomeNaPagina(i, x))}</option>` : ''; }).join('')}</select></div>
        <div class="ar-previa"><canvas id="ar-canvas"></canvas><span id="ar-carregando">⏳ Montando a arte…</span></div>
        <div class="ar-botoes"><button class="btn-magic" id="ar-compartilhar" onclick="compartilharArte()">${window.ic('zap')} Compartilhar</button><button class="btn-limpar" onclick="baixarArte()">${window.ic('cima')} Baixar imagem</button></div>
        <div class="input-group" style="margin-top:14px;"><label for="ar-legenda">Legenda <small class="rot-dica">para colar no post</small></label><textarea id="ar-legenda" rows="5"></textarea>
            <button type="button" class="btn-limpar ep-link" onclick="copiarTexto($('ar-legenda').value, 'Legenda copiada!')">${window.ic('copiar')} Copiar legenda</button></div>`);
    window.desenharArtePg();
};
window.arteFormato = function(f) { PG.arte.formato = f; document.querySelectorAll('#ar-formatos button').forEach(b => b.classList.toggle('active', b.dataset.f === f)); window.desenharArtePg(); };
window.desenharArtePg = async function() {
    const a = PG.arte, p = a.pagina, cv = $('ar-canvas'); if (!cv) return;
    const vez = (a.vez = (a.vez || 0) + 1);
    $('ar-carregando').hidden = false;
    const it = a.pid ? p.itens.find(i => i.produto_id === a.pid) : null, prod = it && produtoPorId(it.produto_id);
    const item = prod ? { nome: nomeNaPagina(it, prod), preco: precoNaPagina(it, prod), de: it.preco > 0 && prod.preco_venda > it.preco ? prod.preco_venda : 0, foto: fotoPrincipal(prod) } : null;
    const fotos = p.itens.map(i => fotoPrincipal(produtoPorId(i.produto_id))).filter(Boolean);
    const dominio = String((PG.cfg && PG.cfg.site_url) || location.origin).replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const tela = document.createElement('canvas');
    await desenharArte(tela, { pagina: p, formato: a.formato, item, fotos: p.capa ? [p.capa, ...fotos] : fotos, dominio });
    if (vez !== a.vez || !$('ar-canvas')) return; // trocou de opção no meio
    cv.width = tela.width; cv.height = tela.height; cv.getContext('2d').drawImage(tela, 0, 0);
    $('ar-carregando').hidden = true;
    const t = window.temaMM(p.tema), link = window.linkSocialPg(p.slug, item ? a.pid : 0);
    $('ar-legenda').value = item
        ? `${t.emoji} ${item.nome}${item.preco ? ` · ${window.fmt(item.preco)}` : ''}\n${it.descricao || ''}\n\n🛍️ Peça pelo link: ${link}\n\n${t.hashtags}`.replace(/\n{3,}/g, '\n\n')
        : `${t.emoji} ${p.titulo}\n${p.texto || t.texto}${p.pedidos_ate ? `\n🎁 Encomendas até ${dataBR(p.pedidos_ate)}` : ''}\n\n🛍️ Veja tudo e peça pelo link: ${link}\n\n${t.hashtags}`;
};
const arquivoArte = () => new Promise(res => $('ar-canvas').toBlob(b => res(new File([b], `minimundo-${PG.arte.pagina.slug}-${PG.arte.formato}.png`, { type: 'image/png' })), 'image/png'));
window.baixarArte = async function() {
    try { const f = await arquivoArte(), a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(f), download: f.name }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
    catch (e) { window.mostrarAlerta('Não deu para baixar', 'Alguma foto não deixou montar a imagem. Tente outra opção.', 'warning'); }
};
window.compartilharArte = async function() {
    try {
        const f = await arquivoArte();
        if (navigator.canShare && navigator.canShare({ files: [f] })) {
            try { await window.copiarTextoSilencioso($('ar-legenda').value); } catch (e) { /* sem área de transferência */ }
            await navigator.share({ files: [f], text: $('ar-legenda').value }); return;
        }
        window.baixarArte(); window.toastMM('Imagem baixada. Agora é só postar.');
    } catch (e) { if (e.name !== 'AbortError') window.mostrarAlerta('Não deu para compartilhar', 'Tente "Baixar imagem".', 'warning'); }
};
window.copiarTextoSilencioso = txt => navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(txt) : Promise.reject();
})();
