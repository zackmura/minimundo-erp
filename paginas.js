// ==========================================
// 🛍️ PÁGINAS DE VENDA (Natal, Dia das Mães, Black Friday…)
// ==========================================
// Uma página por tema, com os kits e as peças escolhidos. Cada produto pode ter, só naquela página, nome,
// texto e preço promocional. O cliente monta a sacola e faz o pedido no site (minimundo.vivainteligente.net/loja?p=link),
// que chega na tela Pedidos. Mudar o link de uma página não quebra o antigo (o servidor guarda e leva para o novo).
// Daqui também saem o link para divulgar e a arte pronta para Story e Feed.
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

// Link no seu domínio, o mesmo do painel: minimundo.vivainteligente.net/loja?p=natal
window.linkSitePg = (slug, item) => new URL(`loja?p=${encodeURIComponent(slug)}${item ? '&i=' + item : ''}`, location.href).href;
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
    if (PG.editando) window.navSaiuSubTela();
    PG.editando = null; $('pg-editor').hidden = true; $('pg-lista-box').hidden = false;
    const c = PG.cfg || {};
    $('pg-aviso').innerHTML = PG.erro ? `<div class="mm-alerta">${window.ic('alerta')} <span>${esc(PG.erro)}</span></div>`
        : PG.cfg && !c.pagina_whatsapp ? `<div class="mm-alerta">${window.ic('alerta')} <span>Falta o WhatsApp que recebe os pedidos. Sem ele os clientes não conseguem mandar a sacola. <a onclick="abrirAjustesPaginas()">Colocar agora</a></span></div>` : '';
    if (!PG.lista.length) {
        box.innerHTML = `<div class="pg-vazio"><span class="pg-vazio-emoji">🎄</span><b>Crie a sua primeira página de venda</b>
            <span>Uma página por data especial (Natal, Dia das Mães…), com os kits e as peças que você escolher. O cliente monta a sacola e faz o pedido pelo site.</span>
            <button class="btn-magic" onclick="novaPagina('natal')">${window.ic('mais')} Criar a página de Natal</button>
            <button class="btn-limpar" onclick="novaPagina()">Escolher outro tema</button></div>`;
        return;
    }
    box.innerHTML = PG.lista.map(p => {
        const t = window.temaMM(p.tema), capa = p.capa || (p.itens.map(i => fotoPrincipal(produtoPorId(i.produto_id))).find(Boolean) || '');
        const fundo = t.hero ? t.hero.fundo : t.cores.ouro3, conv = p.visitas ? Math.round(p.pedidos / p.visitas * 100) : 0;
        return `<div class="pg-card ${p.ativa ? '' : 'pausada'}">
            <button type="button" class="pg-capa" onclick="abrirEditorPagina(${p.id})" style="background-color:${fundo};${capa ? `background-image:url('${esc(capa).replace(/'/g, '%27')}')` : ''}" aria-label="Editar ${esc(p.titulo)}">
                <span class="pg-emoji">${t.emoji}</span><span class="pg-status ${p.ativa ? 'on' : ''}">${p.ativa ? 'No ar' : 'Pausada'}</span></button>
            <div class="pg-corpo">
                <b>${esc(p.titulo)}</b>
                <small>${esc(t.nome)} · ${p.itens.length} produto${p.itens.length === 1 ? '' : 's'}${p.pedidos_ate ? ` · encomendas até ${dataBR(p.pedidos_ate)}` : ''}</small>
                <div class="pg-stats"><div><b>${p.visitas}</b><small>visita${p.visitas === 1 ? '' : 's'}</small></div><div><b>${p.pedidos}</b><small>pedido${p.pedidos === 1 ? '' : 's'}</small></div><div><b>${conv}%</b><small>viraram pedido</small></div></div>
                ${window.origensPg(p) ? `<small class="pg-origens">${window.ic('link')} ${window.origensPg(p)}</small>` : ''}
            </div>
            <div class="pg-botoes">
                <button class="btn-magic" onclick="abrirArte(${p.id})">${window.ic('megafone')} Divulgar</button>
                <div class="pg-botoes-sec">
                    <button class="btn-limpar" onclick="abrirEditorPagina(${p.id})">${window.ic('lapis')} Editar</button>
                    <a class="btn-limpar" href="${esc(window.linkSitePg(p.slug))}" target="_blank" rel="noopener">${window.ic('olho')} Ver</a>
                    <button class="btn-limpar" onclick="maisPaginaPg(${p.id})" aria-label="Mais opções">${window.ic('pontos')} Mais</button>
                </div>
            </div></div>`;
    }).join('');
};
window.maisPaginaPg = function(id) {
    const p = paginaPorId(id); if (!p) return;
    window.abrirModalMM(`<h3 class="modal-title">${esc(p.titulo)}</h3>
        <div class="menu-acoes">
            <button onclick="fecharModalMM(); compartilharPaginaPg(${p.id})">${window.ic('zap')}<span><b>Mandar mensagem</b><small>Texto pronto com o link para WhatsApp ou Facebook</small></span></button>
            <button onclick="fecharModalMM(); copiarTexto(window.linkSitePg('${esc(p.slug)}'), 'Link da página copiado!')">${window.ic('copiar')}<span><b>Copiar o link</b><small>${esc(window.linkSitePg(p.slug).replace(/^https?:\/\//, ''))}</small></span></button>
            ${['instagram', 'whatsapp', 'facebook'].map(r => `<button onclick="fecharModalMM(); copiarTexto(window.linkRedePg('${esc(p.slug)}', 0, '${r}'), 'Link copiado! Ele conta as visitas que vierem dessa rede.')">${window.ic('link')}<span><b>Link para o ${r === 'whatsapp' ? 'WhatsApp' : r === 'instagram' ? 'Instagram' : 'Facebook'}</b><small>Mostra em "De onde vieram" quantos clientes vieram de lá</small></span></button>`).join('')}
            <button onclick="ligarPaginaPg(${p.id})">${window.ic(p.ativa ? 'x' : 'check')}<span><b>${p.ativa ? 'Pausar a página' : 'Colocar no ar'}</b><small>${p.ativa ? 'Os clientes deixam de conseguir abrir (o link continua guardado)' : 'Os clientes voltam a conseguir abrir e pedir'}</small></span></button>
            <button class="perigo" onclick="fecharModalMM(); excluirPaginaPg(${p.id})">${window.ic('lixo')}<span><b>Excluir a página</b><small>Os produtos continuam cadastrados</small></span></button>
        </div>`);
};
window.ligarPaginaPg = async function(id) {
    const p = paginaPorId(id); if (!p) return;
    try {
        await window.apiAcao('salvar_pagina', { id: p.id, titulo: p.titulo, texto: p.texto, tema: p.tema, slug: p.slug, pedidos_ate: p.pedidos_ate, capa: p.capa || '', ativa: !p.ativa });
        p.ativa = !p.ativa; window.fecharModalMM(); window.renderizarPaginas(); window.toastMM(p.ativa ? 'Página no ar' : 'Página pausada');
    } catch (e) { window.mostrarAlerta('Não deu certo', servidorAntigo(e), 'error'); }
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
// Três abas: Produtos (o que mais se mexe), Aparência (tema, textos, link, capa) e Divulgar.
// É uma tela "de dentro": o voltar do celular volta para a lista de páginas.
window.abrirEditorPagina = function(id) {
    const p = paginaPorId(id); if (!p) return window.renderizarPaginas();
    const outra = PG.editando !== id;
    PG.editando = id; PG.temaEditor = p.tema; PG.capaEditor = p.capa;
    if (outra) PG.abaEditor = p.itens.length ? 'produtos' : 'produtos';
    $('pg-lista-box').hidden = true; $('pg-editor').hidden = false;
    if (!window.NAV.sub) window.navSubTela(() => { window.renderizarPaginas(); window.scrollTo(0, 0); });
    const social = window.linkSitePg(p.slug), conv = p.visitas ? Math.round(p.pedidos / p.visitas * 100) : 0;
    $('pg-editor').innerHTML = `
        <div class="pg-ed-topo"><button class="btn-limpar" onclick="renderizarPaginas(); window.scrollTo(0, 0)">${window.ic('voltar')} Páginas</button>
            <div class="pg-ed-tit"><b>${esc(p.titulo)}</b><span class="pilula ${p.ativa ? 'pago' : 'canc'}">${p.ativa ? 'No ar' : 'Pausada'}</span></div>
            <a class="btn-limpar" href="${esc(social)}" target="_blank" rel="noopener">${window.ic('olho')} Ver</a></div>
        <div class="sub-abas pg-ed-abas" id="pg-ed-abas">
            <button data-a="produtos" onclick="abaEditorPg('produtos')">${window.ic('pacote')}Produtos<em class="badge-num" id="pe-conta"></em></button>
            <button data-a="aparencia" onclick="abaEditorPg('aparencia')">${window.ic('imagem')}Aparência</button>
            <button data-a="divulgar" onclick="abaEditorPg('divulgar')">${window.ic('megafone')}Divulgar</button>
        </div>
        <section class="card" data-aba="produtos">
            <div class="card-titulo">Produtos da página</div>
            <p class="card-desc">Kits e peças avulsas. O <b>lápis</b> muda nome, texto e preço só nesta página; as setas mudam a ordem. Fica salvo na hora.</p>
            <div class="pe-acoes"><button class="btn-magic btn-pequeno" onclick="escolherProdutosPg()">${window.ic('mais')} Adicionar produtos</button><button class="btn-limpar" id="pe-ia-itens" onclick="iaTextosItens()">✨ Textos com IA</button></div>
            <div id="pe-itens"></div>
        </section>
        <section class="card" data-aba="aparencia">
            <div class="card-titulo">Tema e textos</div><p class="card-desc">O que o cliente vê no topo da página.</p>
            <div class="temas-grade mini" id="pe-temas">${cardsTema(p.tema, 'peTema')}</div>
            <div class="input-group" style="margin-top:14px;"><label for="pe-titulo">Título</label><input type="text" id="pe-titulo" value="${esc(p.titulo)}" maxlength="120"></div>
            <div class="input-group"><label for="pe-texto">Texto de boas-vindas</label><textarea id="pe-texto" rows="3" maxlength="1500">${esc(p.texto)}</textarea></div>
            <button type="button" class="btn-limpar ep-link" id="pe-ia" onclick="iaTextoPagina()" style="margin:-4px 0 14px;">✨ Escrever título e texto com IA</button>
            <div class="row">
                <div class="col"><div class="input-group"><label for="pe-ate">Encomendas até</label><input type="date" id="pe-ate" value="${esc(p.pedidos_ate)}"><small class="texto-ajuda">Aparece com contagem regressiva. Pode deixar vazio.</small></div></div>
                <div class="col"><div class="input-group"><label for="pe-slug">Link da página</label><div class="pe-slug"><span>…/loja?p=</span><input type="text" id="pe-slug" value="${esc(p.slug)}" maxlength="60" autocomplete="off" autocapitalize="off" spellcheck="false"></div></div></div>
            </div>
            <div class="input-group"><label for="pe-musica">Música no site</label>
                <div class="pe-musica"><select id="pe-musica">
                    <option value="" ${!p.musica ? 'selected' : ''}>Automática pelo tema</option>
                    ${Object.entries(window.MusicaMM ? window.MusicaMM.nomes : {}).map(([k, n]) => `<option value="${k}" ${p.musica === k ? 'selected' : ''}>🎵 ${esc(n)}</option>`).join('')}
                    <option value="nenhuma" ${p.musica === 'nenhuma' ? 'selected' : ''}>🔇 Sem música</option>
                </select><button type="button" class="btn-limpar" id="pe-ouvir" onclick="ouvirMusicaPg()">▶ Ouvir</button></div>
                <small class="texto-ajuda">Automática: nas páginas de Natal toca "Bate o sino". Toca baixinho depois que o cliente toca na página (os celulares não deixam tocar sozinha). O cliente pode desligar no botão do topo.</small></div>
            <div class="input-group"><label>Foto de capa <small class="rot-dica">opcional; aparece ao lado do título, no lugar das fotos dos produtos</small></label><div class="pe-capa" id="pe-capa"></div></div>
            <label class="chave" style="margin:4px 0 16px;"><input type="checkbox" id="pe-ativa" ${p.ativa ? 'checked' : ''}> Página no ar (clientes conseguem abrir)</label>
            <button class="btn-magic btn-global" id="btn-pe" onclick="salvarPaginaPg()">${window.ic('check')} Salvar aparência</button>
            <button class="btn-limpar perigo ep-link" style="margin-top:18px;" onclick="excluirPaginaPg(${p.id})">${window.ic('lixo')} Excluir esta página</button>
        </section>
        <section class="card" data-aba="divulgar">
            <div class="pg-div-hero">
                <button class="btn-magic" onclick="abrirArte(${p.id})">${window.ic('imagem')}<span><b>Criar posts para as redes</b><small>Story, feed, carrossel, enquete e vídeo</small></span></button>
                <button class="btn-magic btn-zap" onclick="compartilharPaginaPg(${p.id})">${window.ic('zap')}<span><b>Mandar mensagem</b><small>Texto pronto com o link</small></span></button>
            </div>
            <label>Link da página</label>
            <div class="pe-link"><code>${esc(social.replace(/^https?:\/\//, ''))}</code><button class="btn-limpar" onclick="copiarTexto(this.dataset.l, 'Link da página copiado!')" data-l="${esc(social)}">${window.ic('copiar')} Copiar</button></div>
            <div class="pe-redes"><span>Link que conta de onde veio o cliente:</span>${['instagram', 'whatsapp', 'facebook'].map(r => `<button class="chip-op" onclick="copiarTexto(window.linkRedePg('${esc(p.slug)}', 0, '${r}'), 'Link copiado! Ele conta as visitas que vierem dessa rede.')">${window.ic('link')}${r === 'whatsapp' ? 'WhatsApp' : r === 'instagram' ? 'Instagram' : 'Facebook'}</button>`).join('')}</div>
            ${p.links_antigos && p.links_antigos.length ? `<p class="texto-ajuda pe-antigos">${window.ic('check')} Links antigos que continuam funcionando: ${p.links_antigos.map(s => `<code>${esc(s)}</code>`).join(' ')}</p>` : ''}
            <div class="card-titulo" style="margin-top:18px;">Resultados</div>
            <div class="pg-stats grande"><div><b>${p.visitas}</b><small>visita${p.visitas === 1 ? '' : 's'}</small></div><div><b>${p.pedidos}</b><small>pedido${p.pedidos === 1 ? '' : 's'}</small></div><div><b>${conv}%</b><small>viraram pedido</small></div></div>
            ${window.origensPg(p) ? `<p class="pg-origens">${window.ic('link')} De onde vieram: ${window.origensPg(p)}</p>` : ''}
            <button class="btn-limpar" style="width:100%;margin-top:12px;" onclick="switchTab('pedidos')">${window.ic('recibo')} Ver os pedidos</button>
        </section>`;
    pintarCapa(); window.renderizarItensPg(); window.abaEditorPg(PG.abaEditor || 'produtos');
    if (outra) window.scrollTo(0, 0);
};
window.abaEditorPg = function(a) {
    PG.abaEditor = a;
    document.querySelectorAll('#pg-ed-abas button').forEach(b => b.classList.toggle('active', b.dataset.a === a));
    document.querySelectorAll('#pg-editor section[data-aba]').forEach(s => { s.hidden = s.dataset.aba !== a; });
};
window.aoSairDaTela = window.aoSairDaTela || {};
window.aoSairDaTela.paginas = () => { if (PG.editando) window.renderizarPaginas(); };
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
// Ouvir a música escolhida antes de salvar (Automática = a do tema)
window.ouvirMusicaPg = function() {
    const M = window.MusicaMM, b = $('pe-ouvir'); if (!M || !b) return;
    if (M.tocando()) { M.parar(); b.textContent = '▶ Ouvir'; return; }
    const v = $('pe-musica').value, id = v === 'nenhuma' ? '' : v || (PG.temaEditor === 'natal' ? 'sino' : '');
    if (!id) return window.toastMM(v === 'nenhuma' ? 'Sem música nesta página' : 'Neste tema, o automático é sem música');
    M.tocar(id, 0.35); b.textContent = '⏸ Parar';
};
window.aoSairDaTela = window.aoSairDaTela || {};
const sairPaginasAntes = window.aoSairDaTela.paginas;
window.aoSairDaTela.paginas = function() { if (window.MusicaMM) window.MusicaMM.parar(); if (sairPaginasAntes) sairPaginasAntes(); };
window.salvarPaginaPg = async function() {
    const p = paginaPorId(PG.editando); if (!p) return;
    const slug = slugDe($('pe-slug').value) || p.slug; $('pe-slug').value = slug;
    const dados = { id: p.id, titulo: $('pe-titulo').value.trim(), texto: $('pe-texto').value.trim(), tema: PG.temaEditor, slug, pedidos_ate: $('pe-ate').value, capa: PG.capaEditor || '', ativa: $('pe-ativa').checked, musica: $('pe-musica') ? $('pe-musica').value : (p.musica || '') };
    if (window.MusicaMM) window.MusicaMM.parar();
    if (!dados.titulo) { $('pe-titulo').focus(); return window.mostrarAlerta('Falta o título', 'Dê um título para a página.', 'warning'); }
    if (slug !== p.slug && !await window.confirmarMM({ icone: '🔗', titulo: 'Mudar o link?', texto: `O link vai ficar …/p/${slug}.\nQuem tiver o link antigo (…/p/${p.slug}) não vai mais encontrar a página.`, ok: 'Mudar o link' })) return;
    const b = $('btn-pe'), txt = b.innerHTML; b.disabled = true; b.innerText = 'Salvando…';
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
                    <small>${prod && prod.tipo === 'kit' ? '<span class="tag-kit">Kit</span> ' : ''}${preco ? `${it.preco > 0 && normal > it.preco ? `<s>${window.fmt(normal)}</s> ` : ''}${window.fmt(preco)}` : '<span class="neg">sem preço</span>'} · ${!prod ? 'removido' : prod.ativo === false ? 'inativo (não aparece)' : prontaEntrega(prod) ? 'pronta entrega' : 'sob encomenda'}</small>
                    <small class="pi-texto">${it.descricao ? esc(it.descricao) : '<i>Sem texto: toque no lápis para escrever</i>'}</small></span></button>
            <button type="button" class="pi-editar" onclick="editarItemPg(${it.produto_id})" title="Mudar nome, texto e preço nesta página" aria-label="Editar ${esc(nomeNaPagina(it, prod))}">${window.ic('lapis')}</button>
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
    window.compartilharMM(p.titulo, `${t.emoji} *${p.titulo}*\n${p.texto || t.texto}${p.pedidos_ate ? `\n🎁 Encomendas até ${dataBR(p.pedidos_ate)}` : ''}\n\nVeja as fotos e faça seu pedido: ${window.linkSitePg(p.slug)}`);
};
window.compartilharItemPg = function(pid, pagId) {
    const p = paginaPorId(pagId || PG.editando), it = p && p.itens.find(i => i.produto_id === pid), prod = produtoPorId(pid); if (!it || !prod) return;
    if (!p.ativa) return window.mostrarAlerta('Página pausada', `A página "${p.titulo}" está fora do ar. Ligue "Página no ar" para o link funcionar.`, 'warning');
    const preco = precoNaPagina(it, prod), t = window.temaMM(p.tema);
    window.compartilharMM(nomeNaPagina(it, prod), `${t.emoji} *${nomeNaPagina(it, prod)}*${preco ? ` por ${window.fmt(preco)}` : ''}\n${it.descricao || ''}${prod.tipo === 'kit' ? `\n${(prod.itens || []).map(i => `• ${i.qtd}× ${i.nome_vitrine || (produtoPorId(i.produto_id) || {}).modelo || ''}`).join('\n')}` : ''}\n\nVeja as fotos: ${window.linkSitePg(p.slug, pid)}`.replace(/\n{3,}/g, '\n\n'));
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
            <small class="texto-ajuda">O botão de WhatsApp da página e os avisos de pedido usam este número.</small></div>
        <div class="input-group"><label for="ap-pix">Chave Pix (opcional)</label><input type="text" id="ap-pix" value="${esc(c.pagina_pix || '')}" placeholder="CNPJ, e-mail, celular ou chave aleatória" maxlength="120" autocomplete="off">
            <small class="texto-ajuda">Aparece no acompanhar do pedido, com botão de copiar, quando o cliente escolhe Pix e ainda não pagou.</small></div>
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
        const cfg = (await window.apiAcao('salvar_config', { valores: { pagina_whatsapp: zap, pagina_instagram: $('ap-insta').value.trim(), pagina_pix: $('ap-pix').value.trim(), site_url: site } })).config;
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

// ---------- Divulgar: arte para as redes (Story, Feed, Carrossel, Enquete e Vídeo) ----------
// Tudo é desenhado aqui no aparelho, com as cores do tema. "Compartilhar" abre o menu do celular (Instagram,
// WhatsApp, Facebook…) com as imagens; no computador, baixa os arquivos. Textos, cores e fotos dá para trocar.
// O link leva ?de=instagram (ou whatsapp, facebook): a página conta de onde vieram as visitas e os pedidos.
const FORMATOS = { story: [1080, 1920, 'Story'], post: [1080, 1350, 'Feed'], quadrado: [1080, 1080, 'Quadrado'] };
const TIPOS_ARTE = {
    story: ['📱', 'Story', 'Story ou status'],
    post: ['🖼️', 'Feed', 'Post no feed'],
    quadrado: ['⬛', 'Quadrado', 'Post quadrado'],
    carrossel: ['🎠', 'Carrossel', 'Várias imagens'],
    enquete: ['📊', 'Enquete', 'Este ou esse?'],
    video: ['🎬', 'Vídeo', 'Reels ou status']
};
const REDES_ARTE = { instagram: 'Instagram', whatsapp: 'WhatsApp', facebook: 'Facebook' };
const NOMES_ORIGEM = { ...REDES_ARTE, tiktok: 'TikTok', qrcode: 'QR code', outro: 'Outros' };
const MAX_CARROSSEL = 8, MAX_VIDEO = 6, SEG_SLIDE = 2.6;
// "Instagram 12 · WhatsApp 30 (2 pedidos)": de onde vieram as visitas da página
window.origensPg = p => (p.origens || []).filter(o => o.visitas || o.pedidos).map(o => `${NOMES_ORIGEM[o.origem] || esc(o.origem)} ${o.visitas}${o.pedidos ? ` (${o.pedidos} pedido${o.pedidos > 1 ? 's' : ''})` : ''}`).join(' · ');
window.linkRedePg = (slug, pid, rede) => window.linkSitePg(slug, pid) + (rede ? `&de=${rede}` : '');

let fontesProntas = null;
function carregarFontes() {
    if (fontesProntas) return fontesProntas;
    if (!document.getElementById('fonte-arte')) document.head.insertAdjacentHTML('beforeend', '<link id="fonte-arte" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@500;600;700&display=swap">');
    fontesProntas = Promise.race([Promise.all(['500 80px Fraunces', '600 80px Fraunces', '600 30px Inter', '700 30px Inter'].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 4000))]);
    return fontesProntas;
}
// Fotos de outro site passam pelo servidor para o navegador deixar desenhar (foto do celular já é daqui)
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
const corDaArte = t => { const c = t.cores, h = t.hero; return { fundo: h ? h.fundo : c.papel, fundo2: h ? h.fundo2 : c.fundo, tinta: h ? h.tinta : c.tinta, suave: h ? h.suave : c.suave, ouro: h ? h.ouro : c.ouro, sobreOuro: h ? h.fundo2 : '#fff', moldura: c.ouro3 }; };
function fundoDaArte(ctx, W, H, cor, tema) {
    const g = ctx.createRadialGradient(W / 2, H * 0.12, 40, W / 2, H * 0.45, H * 0.95); g.addColorStop(0, cor.fundo); g.addColorStop(1, cor.fundo2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    window.desenharEnfeiteMM(ctx, tema, W, H, true);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
}
const logoDaArte = () => carregarImagem(new URL('logo.png', location.href).href);
// Logo num círculo com aro dourado; devolve onde ele termina
function desenharLogo(ctx, cx, y, L, cor, logo) {
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(cx, y + L / 2, L / 2 + 6, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(cx, y + L / 2, L / 2 + 14, 0, Math.PI * 2); ctx.strokeStyle = cor.ouro; ctx.lineWidth = 2.5; ctx.stroke();
    if (logo) { ctx.save(); ctx.beginPath(); ctx.arc(cx, y + L / 2, L / 2, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(logo, cx - L / 2 + 6, y + 6, L - 12, L - 12); ctx.restore(); }
    return y + L;
}
// Faixa dourada de chamada ("Encomendas até 20/12")
function faixa(ctx, W, y, txt, fs, cor) {
    ctx.font = `700 ${fs}px Inter`; const cw = ctx.measureText(txt).width + fs * 2.8, ch = Math.round(fs * 2.6);
    retanguloRedondo(ctx, (W - cw) / 2, y, cw, ch, ch / 2); ctx.fillStyle = cor.ouro; ctx.fill();
    ctx.fillStyle = cor.sobreOuro; ctx.fillText(txt, W / 2, y + ch / 2 + fs * 0.34);
}
// Plaquinha no canto: "2/6" do carrossel ou "Arraste →"
function plaquinha(ctx, txt, x, y, fs, cor, direita) {
    ctx.save(); ctx.font = `700 ${fs}px Inter`; ctx.textAlign = 'left';
    const w = ctx.measureText(txt).width + fs * 1.6, h = fs * 2, x0 = direita ? x - w : x;
    retanguloRedondo(ctx, x0, y, w, h, h / 2); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(txt, x0 + fs * 0.8, y + h / 2 + fs * 0.36); ctx.restore();
}
// Story / Feed / Quadrado: da página toda (mosaico) ou de um produto (foto e preço)
// o: { pagina, formato, item, fotos, tema, titulo, frase, chamada, preco, rodape, contador, seta }
async function desenharArte(canvas, o) {
    await carregarFontes();
    const [W, H] = FORMATOS[o.formato], ctx = canvas.getContext('2d'), tema = o.tema || o.pagina.tema, t = window.temaMM(tema), c = t.cores, cor = corDaArte(t);
    canvas.width = W; canvas.height = H;
    fundoDaArte(ctx, W, H, cor, tema);
    const story = o.formato === 'story', quad = o.formato === 'quadrado', pad = W * 0.08;
    let y = story ? 130 : quad ? 56 : 70;
    const L = story ? 150 : quad ? 104 : 120, logo = await logoDaArte();
    y = desenharLogo(ctx, W / 2, y, L, cor, logo) + (story ? 74 : 56);
    ctx.fillStyle = cor.ouro; ctx.font = `600 ${story ? 26 : 22}px Inter`; textoEspacado(ctx, t.selo.toUpperCase(), W / 2, y, story ? 6 : 5);
    y += story ? 40 : 30;
    // Título
    const item = o.item, titulo = o.titulo || (item ? item.nome : o.pagina.titulo), tam = story ? 84 : quad ? 58 : 68;
    ctx.fillStyle = cor.tinta; ctx.font = `500 ${tam}px Fraunces`;
    quebrarTexto(ctx, titulo, W - pad * 2, 2).forEach(l => { y += tam * 1.08; ctx.fillText(l, W / 2, y); });
    y += story ? 56 : quad ? 30 : 40;
    // Foto (produto) ou mosaico (página): ocupa o que sobra entre o título e o bloco de preço + faixa de baixo
    const fsDe = story ? 34 : 28, fsPreco = story ? 92 : quad ? 62 : 74, fsTxt = story ? 34 : 28, vao = story ? 64 : quad ? 40 : 50;
    const comPreco = !!(item && item.preco && o.preco !== false);
    ctx.font = `500 ${fsTxt}px Inter`;
    const frase = o.frase || (comPreco ? '' : item ? item.descricao || o.pagina.texto || t.texto : o.pagina.texto || t.texto);
    const linhasTxt = frase ? quebrarTexto(ctx, frase, W - pad * 2.4, comPreco || quad ? 1 : 2) : [];
    const blocoPreco = (comPreco ? (item.de ? fsDe + 14 : 0) + fsPreco * 0.82 : 0) + linhasTxt.length * fsTxt * 1.4 + (comPreco && linhasTxt.length ? 16 : 0);
    const topoFaixa = story ? H - 250 : H - (quad ? 134 : 150);
    const lado = Math.min(W - pad * 2, topoFaixa - (story ? 60 : 40) - blocoPreco - vao - y), x0 = (W - lado) / 2, raio = story ? 44 : 34;
    const fotos = item ? [item.foto] : o.fotos.slice(0, 4), imgs = (await Promise.all(fotos.map(carregarImagem))).filter(Boolean);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18; retanguloRedondo(ctx, x0 - 10, y - 10, lado + 20, lado + 20, raio + 8); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
    ctx.save(); retanguloRedondo(ctx, x0, y, lado, lado, raio); ctx.clip(); ctx.fillStyle = c.ouro3; ctx.fillRect(x0, y, lado, lado);
    if (imgs.length <= 1) { if (imgs[0]) cobrir(ctx, imgs[0], x0, y, lado, lado); else if (logo) ctx.drawImage(logo, x0 + lado * .25, y + lado * .25, lado * .5, lado * .5); }
    else { const m = lado / 2, pos = imgs.length === 2 ? [[0, 0, m, lado], [m, 0, m, lado]] : imgs.length === 3 ? [[0, 0, m, lado], [m, 0, m, m], [m, m, m, m]] : [[0, 0, m, m], [m, 0, m, m], [0, m, m, m], [m, m, m, m]];
        imgs.forEach((im, i) => { const [a, b, w2, h2] = pos[i]; cobrir(ctx, im, x0 + a + 3, y + b + 3, w2 - 6, h2 - 6); }); }
    ctx.restore();
    if (o.contador) plaquinha(ctx, o.contador, x0 + lado - 20, y + 20, story ? 28 : 24, cor, true);
    y += lado + 10 + vao;
    // Frase e preço (produto: "de" riscado em cima)
    ctx.font = `500 ${fsTxt}px Inter`; ctx.fillStyle = cor.suave;
    linhasTxt.forEach(l => { y += fsTxt * 1.1; ctx.fillText(l, W / 2, y); y += fsTxt * 0.3; });
    if (comPreco) {
        if (linhasTxt.length) y += 16;
        if (item.de) { ctx.font = `500 ${fsDe}px Inter`; ctx.fillStyle = cor.suave; const d = `de ${window.fmt(item.de)}`; y += fsDe * 0.8; ctx.fillText(d, W / 2, y); const lw = ctx.measureText(d).width; ctx.fillRect(W / 2 - lw / 2, y - fsDe * 0.32, lw, 2); y += 14; }
        ctx.font = `500 ${fsPreco}px Fraunces`; ctx.fillStyle = cor.tinta; y += fsPreco * 0.78; ctx.fillText(window.fmt(item.preco), W / 2, y);
    }
    // Faixa de chamada e endereço
    faixa(ctx, W, topoFaixa, o.chamada, story ? 32 : 26, cor);
    ctx.font = `600 ${story ? 28 : 22}px Inter`; ctx.fillStyle = cor.suave;
    ctx.fillText(o.rodape, W / 2, H - (story ? 110 : quad ? 34 : 56));
    if (o.seta) plaquinha(ctx, 'Arraste →', W - 40, story ? 60 : 40, story ? 28 : 24, cor, true);
}
// Última imagem do carrossel e do vídeo: como pedir
async function desenharFinal(canvas, o) {
    await carregarFontes();
    const [W, H] = FORMATOS[o.formato], ctx = canvas.getContext('2d'), tema = o.tema || o.pagina.tema, t = window.temaMM(tema), cor = corDaArte(t);
    canvas.width = W; canvas.height = H;
    fundoDaArte(ctx, W, H, cor, tema);
    const story = o.formato === 'story', pad = W * 0.1, fs = story ? 40 : 34, r = story ? 40 : 34;
    // Começa mais para baixo para o conteúdo ficar no meio da imagem
    let y = desenharLogo(ctx, W / 2, story ? 390 : 230, story ? 170 : 130, cor, await logoDaArte()) + (story ? 90 : 64);
    ctx.fillStyle = cor.ouro; ctx.font = `600 ${story ? 26 : 22}px Inter`; textoEspacado(ctx, t.selo.toUpperCase(), W / 2, y, 6);
    const tam = story ? 96 : 82; y += (story ? 30 : 22) + tam;
    ctx.fillStyle = cor.tinta; ctx.font = `500 ${tam}px Fraunces`; ctx.fillText('Como pedir', W / 2, y);
    y += story ? 90 : 64;
    const passos = [o.rede === 'instagram' ? `Toque no link ${story ? 'do story' : 'da bio'}` : `Abra o link ${o.dominio}`, 'Escolha os produtos e monte a sua sacola', 'Finalize o pedido: a gente confirma pelo WhatsApp'];
    passos.forEach((txt, i) => {
        const cx = pad + r;
        ctx.beginPath(); ctx.arc(cx, y + r, r, 0, Math.PI * 2); ctx.fillStyle = cor.ouro; ctx.fill();
        ctx.fillStyle = cor.sobreOuro; ctx.font = `700 ${r}px Inter`; ctx.fillText(String(i + 1), cx, y + r + r * 0.36);
        ctx.textAlign = 'left'; ctx.fillStyle = cor.tinta; ctx.font = `600 ${fs}px Inter`;
        const ls = quebrarTexto(ctx, txt, W - pad * 2 - r * 2 - 30, 2), lh = fs * 1.25;
        let ty = y + r - (ls.length - 1) * lh / 2 + fs * 0.36;
        ls.forEach(l => { ctx.fillText(l, cx + r + 30, ty); ty += lh; });
        ctx.textAlign = 'center'; y += r * 2 + (story ? 60 : 44);
    });
    faixa(ctx, W, y + (story ? 40 : 20), o.chamada, story ? 32 : 28, cor);
    ctx.font = `600 ${story ? 28 : 22}px Inter`; ctx.fillStyle = cor.suave; ctx.fillText(o.rodape, W / 2, H - (story ? 110 : 56));
    if (o.contador) plaquinha(ctx, o.contador, W - 40, story ? 60 : 40, story ? 28 : 24, cor, true);
}
// Enquete "este ou esse": dois produtos lado a lado e um espaço livre para a figurinha de enquete
async function desenharEnquete(canvas, o) {
    await carregarFontes();
    const [W, H] = FORMATOS.story, ctx = canvas.getContext('2d'), tema = o.tema || o.pagina.tema, t = window.temaMM(tema), c = t.cores, cor = corDaArte(t);
    canvas.width = W; canvas.height = H;
    fundoDaArte(ctx, W, H, cor, tema);
    const logo = await logoDaArte();
    let y = desenharLogo(ctx, W / 2, 110, 120, cor, logo) + 62;
    ctx.fillStyle = cor.ouro; ctx.font = '600 26px Inter'; textoEspacado(ctx, t.selo.toUpperCase(), W / 2, y, 6);
    y += 24; ctx.fillStyle = cor.tinta; ctx.font = '500 86px Fraunces';
    quebrarTexto(ctx, o.pergunta, W - 140, 2).forEach(l => { y += 94; ctx.fillText(l, W / 2, y); });
    y += 64;
    const gap = 40, lado = (W - 120 - gap) / 2, imgs = await Promise.all([o.a, o.b].map(i => carregarImagem(i && i.foto)));
    [o.a, o.b].forEach((it, i) => {
        const x = 60 + i * (lado + gap);
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14; retanguloRedondo(ctx, x - 8, y - 8, lado + 16, lado + 16, 38); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
        ctx.save(); retanguloRedondo(ctx, x, y, lado, lado, 30); ctx.clip(); ctx.fillStyle = c.ouro3; ctx.fillRect(x, y, lado, lado);
        if (imgs[i]) cobrir(ctx, imgs[i], x, y, lado, lado); else if (logo) ctx.drawImage(logo, x + lado * .25, y + lado * .25, lado * .5, lado * .5);
        ctx.restore();
        ctx.beginPath(); ctx.arc(x + 30, y + 30, 46, 0, Math.PI * 2); ctx.fillStyle = cor.ouro; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.fillStyle = cor.sobreOuro; ctx.font = '600 54px Fraunces'; ctx.fillText(i ? 'B' : 'A', x + 30, y + 48);
        ctx.fillStyle = cor.tinta; ctx.font = '600 34px Inter';
        let ty = y + lado + 62; quebrarTexto(ctx, it ? it.nome : '', lado - 10, 2).forEach(l => { ctx.fillText(l, x + lado / 2, ty); ty += 42; });
        if (o.preco !== false && it && it.preco) { ctx.font = '500 46px Fraunces'; ctx.fillText(window.fmt(it.preco), x + lado / 2, ty + 20); }
    });
    faixa(ctx, W, H - 250, o.chamada, 32, cor);
    ctx.font = '600 28px Inter'; ctx.fillStyle = cor.suave; ctx.fillText(o.rodape, W / 2, H - 110);
}
// Vídeo (Reels / status): as imagens passam com um zoom lento e se misturam na troca. Grava em tempo real.
async function gravarVideo(slides, aoAndar) {
    const tipo = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(x => MediaRecorder.isTypeSupported(x));
    if (!tipo) throw new Error('Este aparelho não grava vídeo.');
    const W = 720, H = 1280, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d'), POR = SEG_SLIDE * 1000, TROCA = 500, total = slides.length * POR;
    const desenha = (s, prog, alfa) => { const z = 1 + 0.07 * prog, w = W * z, h = H * z; ctx.globalAlpha = alfa; ctx.drawImage(s, (W - w) / 2, (H - h) / 2, w, h); };
    const quadro = t => {
        const i = Math.min(slides.length - 1, Math.floor(t / POR)), dentro = t - i * POR;
        ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        desenha(slides[i], dentro / POR, 1);
        if (dentro > POR - TROCA && i < slides.length - 1) desenha(slides[i + 1], 0, (dentro - (POR - TROCA)) / TROCA);
        ctx.globalAlpha = 1;
    };
    quadro(0);
    const fluxo = cv.captureStream(30), rec = new MediaRecorder(fluxo, { mimeType: tipo, videoBitsPerSecond: 6000000 }), partes = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) partes.push(e.data); };
    const parou = new Promise(r => { rec.onstop = r; });
    rec.start(250);
    const inicio = performance.now();
    await new Promise(fim => { const passo = () => { const t = performance.now() - inicio; if (t >= total) return fim(); quadro(t); aoAndar(t / total); requestAnimationFrame(passo); }; requestAnimationFrame(passo); });
    quadro(total - 1); rec.stop(); await parou; fluxo.getTracks().forEach(x => x.stop());
    const mime = tipo.split(';')[0];
    return { blob: new Blob(partes, { type: mime }), ext: mime === 'video/mp4' ? 'mp4' : 'webm' };
}

// ---------- A janela "Divulgar" ----------
const lerPrefsArte = () => { try { return JSON.parse(localStorage.getItem('mm_divulgar') || '{}') || {}; } catch (e) { return {}; } };
const guardarPrefsArte = a => { try { localStorage.setItem('mm_divulgar', JSON.stringify({ tipo: a.tipo, rede: a.rede })); } catch (e) { /* aparelho sem armazenamento */ } };
const dominioSite = () => String((PG.cfg && PG.cfg.site_url) || location.origin).replace(/^https?:\/\//, '').replace(/\/+$/, '') + '/loja';
const idsDaPagina = p => p.itens.filter(i => produtoPorId(i.produto_id)).sort((a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0)).map(i => i.produto_id);
// Produto como o cliente vê na página: nome, preço, "de", fotos e texto
function itemArte(p, pid) {
    const it = p.itens.find(i => i.produto_id === pid), prod = it && produtoPorId(pid); if (!prod) return null;
    const fotos = window.fotosDe(prod);
    return { pid, nome: nomeNaPagina(it, prod), preco: precoNaPagina(it, prod), de: it.preco > 0 && prod.preco_venda > it.preco ? prod.preco_venda : 0,
        fotos: fotos.length ? fotos : [fotoPrincipal(prod)].filter(Boolean), descricao: it.descricao || '' };
}
const campoArte = id => ($(id) && $(id).value.trim()) || '';
const unico = a => ['story', 'post', 'quadrado'].includes(a.tipo);
const chamadaAuto = p => p.pedidos_ate ? `Encomendas até ${dataBR(p.pedidos_ate)}` : 'Peça pelo link';
const perguntaArte = a => campoArte('ar-pergunta') || 'Qual você prefere?';
const rodapeArte = (a, formato) => a.rede === 'instagram' ? `${formato === 'story' ? 'Link nos stories' : 'Link na bio'} · ${dominioSite()}` : dominioSite();
const linkArte = a => window.linkRedePg(a.pagina.slug, unico(a) ? a.pid : 0, a.rede);
function fotosDaCapa(a) {
    if (a.fotoPropria) return [a.fotoPropria];
    const p = a.pagina, fotos = idsDaPagina(p).map(pid => fotoPrincipal(produtoPorId(pid))).filter(Boolean);
    return p.capa ? [p.capa, ...fotos] : fotos;
}

window.abrirArte = function(pagId, pid) {
    const p = paginaPorId(pagId); if (!p) return;
    const ids = idsDaPagina(p);
    if (!ids.length) return window.mostrarAlerta('Sem produtos', 'Adicione produtos na página para montar a arte.', 'warning');
    const pref = lerPrefsArte();
    PG.arte = { pagina: p, tipo: TIPOS_ARTE[pref.tipo] ? pref.tipo : 'story', rede: REDES_ARTE[pref.rede] ? pref.rede : 'instagram', pid: ids.includes(pid) ? pid : 0, fotoIdx: 0, fotoPropria: '',
        lista: ids.slice(0, MAX_CARROSSEL), enqA: ids[0], enqB: ids[1] || ids[0], tema: p.tema, preco: true, legendaEditada: false, slides: [], arquivos: [], video: null };
    if (PG.arte.pid && !unico(PG.arte)) PG.arte.tipo = 'story';
    window.abrirModalMM(`<h3 class="modal-title">${window.ic('imagem')} Divulgar: ${esc(p.titulo)}</h3>
        ${p.ativa ? '' : `<div class="mm-alerta">${window.ic('alerta')} <span>A página está pausada: quem tocar no link não vai conseguir pedir. Ligue "Página no ar" no editor antes de postar.</span></div>`}
        <div class="ar-rot">O que vai postar?</div>
        <div class="ar-tipos" id="ar-tipos">${Object.entries(TIPOS_ARTE).map(([k, [e, n, d]]) => `<button type="button" data-t="${k}" onclick="arteTipo('${k}')"><i>${e}</i><b>${n}</b><small>${d}</small></button>`).join('')}</div>
        <div class="ar-rot">Onde vai postar?</div>
        <div class="seg-mini largo" id="ar-redes">${Object.entries(REDES_ARTE).map(([k, n]) => `<button type="button" data-r="${k}" onclick="arteRede('${k}')">${n}</button>`).join('')}</div>
        <div id="ar-opcoes"></div>
        <details class="ar-pers" id="ar-pers"><summary>${window.ic('lapis')} Personalizar textos, cores e foto</summary>
            <div class="input-group" id="ar-titulo-box"><label for="ar-titulo">Título</label><input type="text" id="ar-titulo" maxlength="80" oninput="arteTexto()"></div>
            <div class="input-group" id="ar-frase-box"><label for="ar-frase">Frase</label><input type="text" id="ar-frase" maxlength="140" oninput="arteTexto()"></div>
            <div class="input-group"><label for="ar-chamada">Chamada <small class="rot-dica">a faixa dourada</small></label><input type="text" id="ar-chamada" maxlength="40" oninput="arteTexto()"></div>
            <label class="chave" style="margin:0 0 12px;"><input type="checkbox" id="ar-preco" checked onchange="PG.arte.preco = this.checked; desenharArtePg()"> Mostrar o preço</label>
            <div class="ar-rot">Cores</div><div class="ar-temas" id="ar-temas"></div>
            <div id="ar-foto-box"></div>
            <p class="texto-ajuda" style="margin:10px 0 0;">Campo em branco usa o texto automático (o que aparece clarinho).</p>
        </details>
        <div class="ar-previa" id="ar-previa"><span id="ar-carregando">⏳ Montando a arte…</span></div>
        <div class="ar-botoes" id="ar-botoes"></div>
        <div class="ar-dica" id="ar-dica"></div>
        <div class="input-group" style="margin-top:14px;"><label for="ar-legenda">Legenda <small class="rot-dica">vai copiada para colar no post</small></label><textarea id="ar-legenda" rows="6" oninput="PG.arte.legendaEditada = true"></textarea>
            <div class="ar-leg-botoes"><button type="button" class="btn-limpar" onclick="copiarTexto($('ar-legenda').value, 'Legenda copiada!')">${window.ic('copiar')} Copiar legenda</button>
                <button type="button" class="btn-limpar" id="ar-ia" onclick="legendaIA()">✨ Escrever com a IA</button>
                <button type="button" class="btn-limpar" onclick="PG.arte.legendaEditada = false; legendaArte()">${window.ic('desfazer')} Automática</button></div></div>
        <div class="ar-link"><span>Link para <b id="ar-link-rede"></b> <small>conta de onde vêm as visitas</small></span><code id="ar-link"></code><button type="button" class="btn-limpar" onclick="copiarTexto($('ar-link').textContent, 'Link copiado!')">${window.ic('copiar')} Copiar link</button></div>`);
    $('ar-temas').innerHTML = Object.entries(window.TEMAS_MM).map(([id, t]) => `<button type="button" data-tema="${id}" title="${esc(t.nome)}" onclick="arteTema('${id}')" style="background:${t.hero ? t.hero.fundo : t.cores.fundo};color:${t.hero ? t.hero.tinta : t.cores.tinta}">${t.emoji}</button>`).join('');
    montarOpcoesArte(); window.desenharArtePg();
};
// Escolhas que mudam com o tipo: produto e foto, produtos do carrossel, as duas opções da enquete
function montarOpcoesArte() {
    const a = PG.arte, p = a.pagina, ids = idsDaPagina(p);
    document.querySelectorAll('#ar-tipos button').forEach(b => b.classList.toggle('active', b.dataset.t === a.tipo));
    document.querySelectorAll('#ar-redes button').forEach(b => b.classList.toggle('active', b.dataset.r === a.rede));
    document.querySelectorAll('#ar-temas button').forEach(b => b.classList.toggle('on', b.dataset.tema === a.tema));
    const opc = (sel, vazio) => (vazio ? `<option value="0" data-foto="${esc(fotosDaCapa({ pagina: p })[0] || '')}" data-sub="${ids.length} produtos">A página toda</option>` : '')
        + ids.map(pid => { const it = itemArte(p, pid); return `<option value="${pid}" data-foto="${esc(it.fotos[0] || '')}" data-sub="${it.preco ? window.fmt(it.preco) : 'a combinar'}" ${pid === sel ? 'selected' : ''}>${esc(it.nome)}</option>`; }).join('');
    let h = '';
    if (unico(a)) h = `<div class="input-group"><label for="ar-item">O que mostrar</label><select id="ar-item" data-fotos onchange="arteItem(+this.value)">${opc(a.pid, true)}</select></div>`;
    else if (a.tipo === 'enquete') h = `<div class="input-group"><label for="ar-pergunta">Pergunta</label><input type="text" id="ar-pergunta" maxlength="60" placeholder="Qual você prefere?" oninput="arteTexto()"></div>
        <div class="ar-enq"><div class="input-group"><label for="ar-enq-a">Opção A</label><select id="ar-enq-a" data-fotos onchange="PG.arte.enqA = +this.value; desenharArtePg()">${opc(a.enqA)}</select></div>
        <div class="input-group"><label for="ar-enq-b">Opção B</label><select id="ar-enq-b" data-fotos onchange="PG.arte.enqB = +this.value; desenharArtePg()">${opc(a.enqB)}</select></div></div>`;
    else {
        const max = a.tipo === 'video' ? MAX_VIDEO : MAX_CARROSSEL; a.lista = a.lista.slice(0, max);
        h = `<div class="ar-rot">Produtos <small>${a.lista.length} de até ${max} · toque para tirar ou pôr</small></div>
        <div class="ar-escolha">${ids.map(pid => { const it = itemArte(p, pid), n = a.lista.indexOf(pid);
            return `<button type="button" class="${n >= 0 ? 'on' : ''}" onclick="arteAlternar(${pid})"><img src="${esc(it.fotos[0] || 'logo.png')}" alt="" loading="lazy" onerror="this.src='logo.png'"><span>${esc(it.nome)}</span><i>${n >= 0 ? n + 2 : '+'}</i></button>`; }).join('')}</div>
        <p class="texto-ajuda" style="margin:6px 0 0;">${a.tipo === 'video' ? `Vídeo de uns ${Math.round((a.lista.length + 2) * SEG_SLIDE)} segundos: capa, ${a.lista.length} produto${a.lista.length === 1 ? '' : 's'} e "como pedir".` : `${a.lista.length + 2} imagens: capa, ${a.lista.length} produto${a.lista.length === 1 ? '' : 's'} e "como pedir". O número é a ordem.`}</p>`;
    }
    $('ar-opcoes').innerHTML = h;
    // Título e frase valem para a imagem única e para a capa do carrossel/vídeo; a enquete tem a pergunta
    $('ar-titulo-box').hidden = $('ar-frase-box').hidden = a.tipo === 'enquete';
    const it = unico(a) && a.pid ? itemArte(p, a.pid) : null, t = window.temaMM(a.tema);
    $('ar-titulo').placeholder = it ? it.nome : p.titulo;
    $('ar-frase').placeholder = it ? (it.descricao || 'Sem frase (só o preço)').slice(0, 90) : (p.texto || t.texto).slice(0, 90);
    $('ar-chamada').placeholder = chamadaAuto(p);
    // Foto: do produto (qual delas) ou uma do celular, só para esta arte
    const fotos = it ? it.fotos : [];
    $('ar-foto-box').innerHTML = a.tipo === 'enquete' ? '' : `<div class="ar-rot">Foto</div><div class="ar-fotos">
        ${fotos.length > 1 ? fotos.map((f, k) => `<button type="button" class="${!a.fotoPropria && k === a.fotoIdx ? 'on' : ''}" onclick="arteFoto(${k})"><img src="${esc(f)}" alt="Foto ${k + 1}" loading="lazy" onerror="this.src='logo.png'"></button>`).join('') : ''}
        ${a.fotoPropria ? `<button type="button" class="on"><img src="${esc(a.fotoPropria)}" alt="Foto do celular"></button>` : ''}
        <label class="ar-foto-cel">${window.ic('camera')}<span>${a.fotoPropria ? 'Trocar' : 'Usar foto do celular'}</span><input type="file" accept="image/*" onchange="arteFotoCelular(this)"></label>
        ${a.fotoPropria ? `<button type="button" class="btn-limpar" onclick="arteFoto(0)">Voltar à foto do produto</button>` : ''}</div>
        ${unico(a) ? '' : '<p class="texto-ajuda" style="margin:4px 0 0;">A foto do celular entra na capa.</p>'}`;
    const rede = REDES_ARTE[a.rede];
    $('ar-link-rede').textContent = rede; $('ar-link').textContent = linkArte(a);
}
window.arteTipo = function(t) { const a = PG.arte; if (a.tipo === t) return; a.tipo = t; a.legendaEditada = false; guardarPrefsArte(a); montarOpcoesArte(); window.desenharArtePg(); };
window.arteRede = function(r) { const a = PG.arte; a.rede = r; a.legendaEditada = false; guardarPrefsArte(a); montarOpcoesArte(); window.desenharArtePg(); };
window.arteTema = function(id) { PG.arte.tema = id; montarOpcoesArte(); window.desenharArtePg(); };
window.arteItem = function(pid) { const a = PG.arte; a.pid = pid; a.fotoIdx = 0; a.legendaEditada = false; $('ar-titulo').value = $('ar-frase').value = ''; montarOpcoesArte(); window.desenharArtePg(); };
window.arteFoto = function(k) { const a = PG.arte; a.fotoIdx = k; if (a.fotoPropria) { URL.revokeObjectURL(a.fotoPropria); a.fotoPropria = ''; } montarOpcoesArte(); window.desenharArtePg(); };
window.arteFotoCelular = function(inp) {
    const f = inp.files && inp.files[0]; if (!f) return;
    const a = PG.arte; if (a.fotoPropria) URL.revokeObjectURL(a.fotoPropria);
    a.fotoPropria = URL.createObjectURL(f); montarOpcoesArte(); window.desenharArtePg();
};
window.arteAlternar = function(pid) {
    const a = PG.arte, max = a.tipo === 'video' ? MAX_VIDEO : MAX_CARROSSEL, n = a.lista.indexOf(pid);
    if (n >= 0) { if (a.lista.length === 1) return window.toastMM('Deixe pelo menos um produto'); a.lista.splice(n, 1); }
    else { if (a.lista.length >= max) return window.toastMM(`No máximo ${max} produtos`); a.lista.push(pid); }
    montarOpcoesArte(); window.desenharArtePg();
};
window.arteTexto = function() { clearTimeout(PG.arte.relogio); PG.arte.relogio = setTimeout(window.desenharArtePg, 400); };

// Monta as imagens do tipo escolhido
async function montarSlides(a) {
    const p = a.pagina, novo = () => document.createElement('canvas'), chamada = campoArte('ar-chamada') || chamadaAuto(p);
    const base = { pagina: p, tema: a.tema, chamada, preco: a.preco };
    if (a.tipo === 'enquete') {
        const c = novo(), A = itemArte(p, a.enqA), B = itemArte(p, a.enqB);
        await desenharEnquete(c, { ...base, a: A && { ...A, foto: A.fotos[0] }, b: B && { ...B, foto: B.fotos[0] }, pergunta: perguntaArte(a), rodape: rodapeArte(a, 'story') });
        return [c];
    }
    if (unico(a)) {
        const it = a.pid ? itemArte(p, a.pid) : null, c = novo();
        await desenharArte(c, { ...base, formato: a.tipo, item: it && { ...it, foto: a.fotoPropria || it.fotos[a.fotoIdx] || it.fotos[0] }, fotos: fotosDaCapa(a),
            titulo: campoArte('ar-titulo'), frase: campoArte('ar-frase'), rodape: rodapeArte(a, a.tipo) });
        return [c];
    }
    // Carrossel (Feed) e vídeo (Story): capa, um por produto e "como pedir"
    const formato = a.tipo === 'video' ? 'story' : 'post', carrossel = a.tipo === 'carrossel', its = a.lista.map(pid => itemArte(p, pid)).filter(Boolean);
    const total = its.length + 2, n = k => carrossel ? `${k}/${total}` : '', rodape = rodapeArte(a, formato), out = [novo()];
    await desenharArte(out[0], { ...base, formato, fotos: fotosDaCapa(a), titulo: campoArte('ar-titulo'), frase: campoArte('ar-frase'), rodape, seta: carrossel });
    for (const [k, it] of its.entries()) { const c = novo(); await desenharArte(c, { ...base, formato, item: { ...it, foto: it.fotos[0] }, rodape, contador: n(k + 2) }); out.push(c); }
    const fim = novo(); await desenharFinal(fim, { ...base, formato, rede: a.rede, dominio: dominioSite(), rodape, contador: n(total) }); out.push(fim);
    return out;
}
window.desenharArtePg = async function() {
    const a = PG.arte; if (!a || !$('ar-previa')) return;
    const vez = (a.vez = (a.vez || 0) + 1);
    $('ar-carregando').hidden = false; a.arquivos = [];
    if (a.video) { URL.revokeObjectURL(a.video.url); a.video = null; }
    const slides = await montarSlides(a);
    if (vez !== a.vez || !$('ar-previa')) return; // trocou de opção no meio
    a.slides = slides;
    const box = $('ar-previa');
    box.classList.toggle('varias', slides.length > 1); box.classList.toggle('alta', a.tipo === 'story' || a.tipo === 'enquete');
    box.querySelectorAll('canvas, .ar-slide, video').forEach(n => n.remove());
    if (slides.length === 1) { slides[0].id = 'ar-canvas'; box.prepend(slides[0]); }
    else slides.forEach((s, i) => { const d = document.createElement('div'); d.className = 'ar-slide'; d.appendChild(s); d.insertAdjacentHTML('beforeend', `<b>${i + 1}</b>`); box.insertBefore(d, $('ar-carregando')); });
    $('ar-carregando').hidden = true;
    window.legendaArte(); montarBotoesArte(); montarDicaArte();
    // As imagens já ficam prontas para o "Compartilhar" (no iPhone ele precisa abrir logo depois do toque)
    if (a.tipo !== 'video') arquivosDosSlides(a).then(fs => { if (vez === a.vez) a.arquivos = fs; }).catch(() => {});
};
const nomeArquivo = (a, i, ext) => `minimundo-${a.pagina.slug}-${a.tipo}${a.slides.length > 1 ? '-' + (i + 1) : ''}.${ext}`;
const arquivosDosSlides = a => Promise.all(a.slides.map((c, i) => new Promise((res, rej) => c.toBlob(b => b ? res(new File([b], nomeArquivo(a, i, 'png'), { type: 'image/png' })) : rej(new Error('imagem')), 'image/png'))));
function montarBotoesArte() {
    const a = PG.arte, b = $('ar-botoes'); if (!b) return;
    const n = a.slides.length, extra = a.rede === 'whatsapp' ? `<button type="button" class="btn-limpar" onclick="arteSoMensagem()">${window.ic('zap')} Só a mensagem com o link</button>`
        : a.rede === 'facebook' ? `<button type="button" class="btn-limpar" onclick="arteSoMensagem()">${window.ic('zap')} Postar só o link no Facebook</button>` : '';
    if (a.tipo === 'video' && !a.video) b.innerHTML = `<button type="button" class="btn-magic" id="ar-video-bt" onclick="criarVideoArte()">🎬 Criar o vídeo (${Math.round(n * SEG_SLIDE)} s)</button>${extra}<div class="ar-progresso" hidden><i id="ar-progresso"></i></div>`;
    else b.innerHTML = `<button type="button" class="btn-magic" onclick="compartilharArte()">${window.ic('zap')} Compartilhar${a.tipo === 'video' ? ' o vídeo' : n > 1 ? ` as ${n} imagens` : ''}</button>
        <button type="button" class="btn-limpar" onclick="baixarArte()">${window.ic('cima', 'baixar')} Baixar${a.tipo === 'video' ? ' o vídeo' : n > 1 ? ' tudo' : ''}</button>${a.tipo === 'video' ? `<button type="button" class="btn-limpar" onclick="desenharArtePg()">${window.ic('desfazer')} Refazer</button>` : ''}${extra}`;
}
const DICAS_ARTE = {
    instagram: {
        story: 'Toque em <b>Compartilhar</b> → Instagram → <b>Story</b>. O link já fica copiado: no story, toque na figurinha <b>🔗 Link</b> e cole.',
        post: 'Toque em <b>Compartilhar</b> → Instagram → <b>Feed</b> e cole a legenda (já copiada). No post o link não é clicável: deixe o link da página na sua <b>bio</b>.',
        carrossel: 'Toque em <b>Compartilhar</b> → Instagram → <b>Feed</b>: as imagens entram juntas, na ordem. Cole a legenda (já copiada). Se baixou, no Instagram toque em "selecionar várias" e escolha na ordem 1, 2, 3…',
        enquete: 'Poste no <b>Story</b>. Depois toque na figurinha <b>Enquete</b>, escreva "A" e "B" (ou os nomes) e coloque no espaço vazio embaixo das fotos. Ponha também a figurinha <b>🔗 Link</b> (o link já fica copiado).',
        video: 'Toque em <b>Compartilhar</b> → Instagram → <b>Reels</b>, escolha uma música e cole a legenda (já copiada).'
    },
    whatsapp: {
        story: 'Toque em <b>Compartilhar</b> → WhatsApp → <b>Meu status</b>. A legenda vai junto e, no WhatsApp, o link é clicável.',
        post: 'Mande em grupos, conversas ou no <b>status</b>. A legenda vai junto com a imagem.',
        carrossel: 'As imagens vão todas juntas para a conversa, o grupo ou o <b>status</b>.',
        enquete: 'Poste no <b>status</b>: quem responder "A" ou "B" fala direto com você. Num grupo, dá para fazer uma enquete de verdade: 📎 → <b>Enquete</b>.',
        video: 'Poste no <b>status</b> ou mande nos grupos, com a legenda.'
    },
    facebook: {
        story: 'Toque em <b>Compartilhar</b> → Facebook → <b>Story</b>. Lá tem a figurinha de link (o link já fica copiado).',
        post: 'Toque em <b>Compartilhar</b> → Facebook e cole a legenda (já copiada). No Facebook o link é clicável.',
        carrossel: 'Toque em <b>Compartilhar</b> → Facebook: as imagens viram um álbum. Cole a legenda (já copiada).',
        enquete: 'Poste no <b>Story</b> do Facebook e use a figurinha <b>Enquete</b> no espaço vazio.',
        video: 'Toque em <b>Compartilhar</b> → Facebook → <b>Reels</b> e cole a legenda (já copiada).'
    }
};
const copiaLink = a => a.rede !== 'whatsapp' && (a.tipo === 'story' || a.tipo === 'enquete');
function montarDicaArte() {
    const a = PG.arte, d = DICAS_ARTE[a.rede], t = d[a.tipo] || d.post;
    const pc = !matchMedia('(pointer:coarse)').matches;
    $('ar-dica').innerHTML = `💡 ${t}${pc ? '<br><small>No computador, "Compartilhar" baixa os arquivos. Pelo celular é mais rápido.</small>' : ''}`;
}
window.legendaArte = function() {
    const a = PG.arte; if (!a || a.legendaEditada || !$('ar-legenda')) return;
    $('ar-legenda').value = legendaAuto(a);
};
// Chamada para pedir, conforme a rede (no Instagram o link do post não é clicável)
function linhaPedir(a) {
    if (a.rede === 'instagram') return a.tipo === 'story' || a.tipo === 'enquete' ? '🛍️ Toque no link para ver e pedir' : '🛍️ Peça pelo link na bio';
    return `🛍️ Veja e peça aqui: ${linkArte(a)}`;
}
const hashtagsArte = a => { const h = window.temaMM(a.tema).hashtags; return a.rede === 'instagram' ? h : a.rede === 'facebook' ? h.split(/\s+/).slice(0, 3).join(' ') : ''; };
function legendaAuto(a) {
    const p = a.pagina, t = window.temaMM(a.tema), neg = s => a.rede === 'whatsapp' ? `*${s}*` : s, preco = i => i.preco && a.preco ? ` · ${window.fmt(i.preco)}` : '';
    let corpo;
    if (a.tipo === 'enquete') { const A = itemArte(p, a.enqA), B = itemArte(p, a.enqB); corpo = `${t.emoji} ${neg(perguntaArte(a))}\n🅰️ ${A ? A.nome : ''}\n🅱️ ${B ? B.nome : ''}\n\n${a.rede === 'whatsapp' ? 'Me responde aqui: A ou B? 👇' : 'Vote na enquete! 👆'}`; }
    else if (unico(a) && a.pid) { const it = itemArte(p, a.pid); corpo = `${t.emoji} ${neg(campoArte('ar-titulo') || it.nome)}${preco(it)}\n${campoArte('ar-frase') || it.descricao}`; }
    else {
        corpo = `${t.emoji} ${neg(campoArte('ar-titulo') || p.titulo)}\n${campoArte('ar-frase') || p.texto || t.texto}`;
        if (!unico(a)) corpo += `\n\n${a.lista.map(pid => itemArte(p, pid)).filter(Boolean).map(i => `• ${i.nome}${preco(i)}`).join('\n')}${a.tipo === 'carrossel' ? '\n\nArraste para o lado para ver todos ➡️' : ''}`;
    }
    return [corpo, p.pedidos_ate ? `🎁 Encomendas até ${dataBR(p.pedidos_ate)}` : '', linhaPedir(a), hashtagsArte(a)].filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n');
}
window.legendaIA = async function() {
    const a = PG.arte, p = a.pagina, t = window.temaMM(a.tema), b = $('ar-ia'), txt = b.innerHTML;
    b.disabled = true; b.textContent = '⏳ A IA está escrevendo…';
    try {
        const ids = a.tipo === 'enquete' ? [a.enqA, a.enqB] : unico(a) ? (a.pid ? [a.pid] : idsDaPagina(p).slice(0, 8)) : a.lista;
        const its = ids.map(pid => itemArte(p, pid)).filter(Boolean);
        const prompt = `Você escreve legendas para as redes sociais da Mini Mundo 3D (presentes e decoração impressos em 3D, feitos à mão).
Escreva UMA legenda para ${REDES_ARTE[a.rede]} (${TIPOS_ARTE[a.tipo][2].toLowerCase()}), no clima de "${t.nome}", para a coleção "${p.titulo}".
Produtos: ${its.map(i => `${i.nome}${i.preco && a.preco ? ` (${window.fmt(i.preco)})` : ''}${i.descricao ? ` — ${i.descricao.slice(0, 120)}` : ''}`).join('; ')}.
${a.tipo === 'enquete' ? `É uma enquete "este ou esse": pergunta "${perguntaArte(a)}", opção A = ${its[0] ? its[0].nome : ''}, opção B = ${its[1] ? its[1].nome : ''}. Convide para votar${a.rede === 'whatsapp' ? ' respondendo A ou B' : ''}.` : ''}
${p.pedidos_ate ? `As encomendas vão até ${dataBR(p.pedidos_ate)}.` : ''}
Português do Brasil, tom carinhoso e animado, frases curtas, até 500 caracteres, alguns emojis.${a.rede === 'whatsapp' ? ' Pode usar *negrito* do WhatsApp.' : ''}
Não coloque link, hashtags nem chamada para pedir (eu acrescento depois). Não invente produtos, preços, materiais nem prazos. Responda só com a legenda, sem aspas.`;
        const r = String((await window.apiAcao('ia_gerar', { prompt })).texto || '').trim().replace(/^["“]|["”]$/g, '');
        if (!r) throw new Error('A IA não mandou o texto. Tente de novo.');
        $('ar-legenda').value = [r, linhaPedir(a), hashtagsArte(a)].filter(Boolean).join('\n\n');
        a.legendaEditada = true; window.toastMM('Legenda nova pronta');
    } catch (e) { window.mostrarAlerta('A IA não conseguiu escrever', servidorAntigo(e), 'warning'); }
    finally { b.disabled = false; b.innerHTML = txt; }
};
window.criarVideoArte = async function() {
    const a = PG.arte, b = $('ar-video-bt'); if (!a.slides.length || !b) return;
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return window.mostrarAlerta('Este aparelho não grava vídeo', 'Tente pelo celular, com o Chrome ou o Safari atualizados. Ou poste o Story em imagem.', 'warning');
    const vez = a.vez, barra = $('ar-progresso');
    b.disabled = true; barra.parentNode.hidden = false;
    try {
        const r = await gravarVideo(a.slides, f => { barra.style.width = `${Math.round(f * 100)}%`; b.textContent = `🎬 Gravando… ${Math.round(f * 100)}%`; });
        if (vez !== a.vez || !$('ar-previa')) return;
        a.video = { ...r, url: URL.createObjectURL(r.blob) };
        const box = $('ar-previa'); box.classList.remove('varias'); box.classList.add('alta');
        box.querySelectorAll('.ar-slide').forEach(n => n.remove());
        box.insertAdjacentHTML('afterbegin', `<video src="${a.video.url}" controls playsinline loop muted autoplay></video>`);
        montarBotoesArte();
        if (r.ext !== 'mp4') window.mostrarAlerta('Vídeo pronto', 'Este navegador grava em WebM. O WhatsApp e o Facebook costumam aceitar; se o Instagram recusar, crie o vídeo pelo celular (no iPhone ou no Chrome atualizado sai em MP4).', 'warning');
        else window.toastMM('Vídeo pronto!');
    } catch (e) { window.mostrarAlerta('Não deu para gravar o vídeo', e.message, 'warning'); if ($('ar-video-bt')) { b.disabled = false; b.textContent = '🎬 Tentar de novo'; barra.parentNode.hidden = true; } }
};
async function arquivosArte() {
    const a = PG.arte;
    if (a.tipo === 'video') return a.video ? [new File([a.video.blob], nomeArquivo(a, 0, a.video.ext), { type: a.video.blob.type })] : [];
    return a.arquivos.length === a.slides.length ? a.arquivos : (a.arquivos = await arquivosDosSlides(a));
}
async function baixarArquivos(fs) {
    for (const [i, f] of fs.entries()) {
        const el = Object.assign(document.createElement('a'), { href: URL.createObjectURL(f), download: f.name });
        document.body.appendChild(el); el.click(); el.remove(); setTimeout(() => URL.revokeObjectURL(el.href), 10000);
        if (i < fs.length - 1) await new Promise(r => setTimeout(r, 400));
    }
}
window.baixarArte = async function() {
    try { const fs = await arquivosArte(); if (!fs.length) return; await baixarArquivos(fs); if (fs.length > 1) window.toastMM(`${fs.length} imagens baixadas, na ordem`); }
    catch (e) { window.mostrarAlerta('Não deu para baixar', 'Alguma foto não deixou montar a imagem. Tente outra opção.', 'warning'); }
};
window.compartilharArte = async function() {
    const a = PG.arte, legenda = $('ar-legenda').value, link = linkArte(a);
    try {
        const fs = await arquivosArte(); if (!fs.length) return;
        // No story do Instagram/Facebook o que se cola é o link (figurinha); no resto, a legenda
        const copia = copiaLink(a) ? link : legenda;
        let copiou = false; try { await window.copiarTextoSilencioso(copia); copiou = true; } catch (e) { /* sem área de transferência */ }
        if (navigator.canShare && navigator.canShare({ files: fs })) {
            if (copiou) window.toastMM(copia === link ? 'Link copiado: cole na figurinha 🔗' : 'Legenda copiada: é só colar');
            await navigator.share(a.rede === 'instagram' ? { files: fs } : { files: fs, text: legenda }); return;
        }
        await baixarArquivos(fs); window.toastMM(`${fs.length > 1 ? `${fs.length} arquivos baixados` : 'Arquivo baixado'}${copiou ? (copia === link ? ' e link copiado' : ' e legenda copiada') : ''}`);
    } catch (e) { if (e.name !== 'AbortError') window.mostrarAlerta('Não deu para compartilhar', 'Tente "Baixar" e poste pelo aplicativo.', 'warning'); }
};
// Sem imagem: a mensagem com o link (WhatsApp) ou o link com a prévia da página (Facebook)
window.arteSoMensagem = function() {
    const a = PG.arte;
    if (a.rede === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(linkArte(a))}`, '_blank', 'noopener');
    else window.open(window.linkZap('', $('ar-legenda').value), '_blank', 'noopener');
};
window.copiarTextoSilencioso = txt => navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(txt) : Promise.reject();
})();
