// ==========================================
// 🌐 SITE DO VENDEDOR
// ==========================================
// Cada vendedor(a) pode ter as mesmas páginas de venda da Mini Mundo num link só dele(a)
// (loja?p=natal&v=kamila). Fotos, textos e tema são os da Mini Mundo; ele(a) só escolhe o preço
// de cada produto (nunca abaixo do repasse; sem escolha, vale o sugerido). O cliente fala com o
// WhatsApp dele(a) e os pedidos desse site chegam aqui, não na tela Pedidos do Admin. Ao entregar,
// "Dar baixa nas peças" tira da mala e cria o repasse para acertar. O Admin vê tudo na aba "Site"
// do controle do vendedor e pode pausar o site.
(() => {
const $ = window.$, esc = window.esc, ic = n => window.ic(n), fmt = v => window.fmt(v), val = v => window.limparValorPlanilha(v);
window.ACOES_DA_TELA_VENDEDOR.push('minha_loja', 'salvar_minha_loja', 'salvar_meus_precos', 'status_meu_pedido_site', 'baixa_pedido_site');
window.MS = { aba: null, dados: null, busca: '', mudou: {} };

const ETAPAS = { novo: ['Novo', 'laranja'], confirmado: ['Confirmado', 'azul'], producao: ['Em produção', 'roxo'], pronto: ['Pronto', 'verde'], entregue: ['Entregue', 'cinza'], cancelado: ['Cancelado', 'vermelho'] };
const PROXIMA = { novo: ['confirmado', 'Confirmar'], confirmado: ['pronto', 'Marcar pronto'], producao: ['pronto', 'Marcar pronto'], pronto: ['entregue', 'Marcar entregue'] };
const etapa = st => `<span class="pc-st ${(ETAPAS[st] || [])[1] || ''}">${esc((ETAPAS[st] || [st])[0])}</span>`;
const foto = f => `<img src="${esc(f || 'logo.png')}" onerror="this.src='logo.png'" alt="" loading="lazy">`;
// Link do site do vendedor no mesmo endereço do painel (o domínio da Mini Mundo)
window.linkSiteVendedor = (apelido, slug) => new URL(`loja?${slug ? `p=${encodeURIComponent(slug)}&` : ''}v=${encodeURIComponent(apelido)}`, location.href).href;
const erroAmigavel = e => e.message === 'Ação não reconhecida.' ? 'O servidor ainda está na versão antiga. Peça para a Mini Mundo atualizar.' : e.message;

// ---------- Carregar ----------
window.carregarMeuSite = async function() {
    const box = $('v-site'); if (!box) return;
    if (!MS.dados) box.innerHTML = '<div class="carregando-box"><span class="girando"></span>Abrindo o seu site…</div>';
    try { MS.dados = await window.apiAcao('minha_loja'); MS.mudou = {}; window.renderizarMeuSite(); }
    catch (e) { box.innerHTML = `<div class="vazio-box">${ic('alerta')}<b>Não consegui abrir o seu site</b><span>${esc(erroAmigavel(e))}</span></div>`; }
};
// Bolinha com os pedidos novos do site (vem no meu_painel)
window.avisoSiteVendedor = function() {
    const s = window.painelVendedor && window.painelVendedor.site, n = s ? s.novos : 0;
    document.querySelectorAll('[data-aviso-site]').forEach(b => { b.hidden = !n; b.innerText = n; });
};

window.renderizarMeuSite = function() {
    const d = MS.dados, box = $('v-site'); if (!d || !box) return;
    const L = d.loja;
    if (!L.ativa) { box.innerHTML = L.bloqueada ? `<div class="vazio-box">${ic('alerta')}<b>Seu site está pausado</b><span>A Mini Mundo pausou o seu site por enquanto. Quem abrir o seu link vê a página normal da Mini Mundo. Fale com ela para ligar de novo.</span></div>` : htmlCriar(L); return; }
    const novos = d.pedidos.filter(p => p.status === 'novo').length, abertos = d.pedidos.filter(p => !['entregue', 'cancelado'].includes(p.status)).length;
    if (!MS.aba) MS.aba = abertos ? 'pedidos' : 'divulgar';
    const abas = [['pedidos', 'recibo', 'Pedidos', novos], ['precos', 'etiqueta', 'Preços', 0], ['divulgar', 'link', 'Divulgar', 0]];
    box.innerHTML = `<div class="resumo-faixa">
            <div class="rf"><small>Visitas</small><b>${L.visitas}</b><i>no seu site</i></div>
            <button type="button" class="rf laranja" onclick="abaMeuSite('pedidos')"><small>Pedidos</small><b>${abertos}</b><i>${novos ? `${novos} novo${novos > 1 ? 's' : ''}` : 'em andamento'}</i></button>
            <button type="button" class="rf roxo" onclick="abaMeuSite('precos')"><small>Produtos</small><b>${d.produtos.length}</b><i>${d.produtos.filter(p => p.meu_preco).length} com o seu preço</i></button>
        </div>
        <div class="sub-abas ms-abas">${abas.map(([k, i, r, n]) => `<button class="${MS.aba === k ? 'active' : ''}" onclick="abaMeuSite('${k}')">${ic(i)}${r}${n ? `<em class="badge-num">${n}</em>` : ''}</button>`).join('')}</div>
        <div id="ms-corpo"></div>`;
    window.renderizarCorpoMeuSite();
};
window.abaMeuSite = function(aba) {
    if (MS.aba === 'precos' && aba !== 'precos' && Object.keys(MS.mudou).length && !confirm('Você mudou preços e não salvou. Sair assim mesmo?')) return;
    if (aba !== 'precos') MS.mudou = {};
    MS.aba = aba; window.renderizarMeuSite();
};

// ---------- Criar o site ----------
function htmlCriar(L) {
    return `<div class="card ms-criar">
        <span class="ms-criar-ic">${ic('sacola')}</span>
        <h3>Tenha o seu próprio site de vendas</h3>
        <ul class="ms-lista-ok">
            <li>${ic('check')}As mesmas páginas da Mini Mundo, com as fotos e os textos de cada coleção.</li>
            <li>${ic('check')}Você escolhe o preço de cada produto. O cliente vê o <b>seu</b> preço.</li>
            <li>${ic('check')}Os pedidos chegam para você, e o cliente fala com o <b>seu</b> WhatsApp.</li>
        </ul>
        <div class="input-group"><label for="ms-zap">Seu WhatsApp (com DDD)</label><input type="tel" id="ms-zap" inputmode="tel" value="${esc(L.whatsapp)}" placeholder="(11) 98888-7777"></div>
        <button class="btn-magic btn-global" id="btn-ms-criar" onclick="criarMeuSite()">${ic('check')} Criar meu site</button>
        <p class="texto-ajuda">Depois você ajusta os preços e já pode mandar o link para os clientes.</p>
    </div>`;
}
window.criarMeuSite = async function() {
    const b = $('btn-ms-criar'), txt = b.innerHTML; b.disabled = true; b.innerText = 'Criando…';
    try {
        await window.apiAcao('salvar_minha_loja', { ativa: true, whatsapp: $('ms-zap').value });
        MS.aba = 'precos'; await window.carregarMeuSite();
        window.mostrarAlerta('Seu site está pronto!', 'Agora confira os seus preços. Sem mexer, vale o preço sugerido. Depois é só divulgar o link.', 'success');
    } catch (e) { window.mostrarAlerta('Não deu para criar', erroAmigavel(e), 'warning'); b.disabled = false; b.innerHTML = txt; }
};

window.renderizarCorpoMeuSite = function() {
    const d = MS.dados, box = $('ms-corpo'); if (!d || !box) return;
    if (MS.aba === 'precos') box.innerHTML = htmlPrecos(d);
    else if (MS.aba === 'divulgar') box.innerHTML = htmlDivulgar(d);
    else box.innerHTML = htmlPedidos(d);
};

// ---------- Meus preços ----------
const precoDigitado = id => { const el = document.querySelector(`[data-ms-preco="${id}"]`); return el ? val(el.value) : 0; };
function linhaPreco(p) {
    const vale = MS.mudou[p.id] !== undefined ? (MS.mudou[p.id] || p.sugerido) : p.preco, ganho = vale - p.repasse;
    return `<div class="ms-preco" data-ms-linha="${p.id}">${foto(p.foto)}
        <div class="ms-preco-info"><b>${p.tipo === 'kit' ? '<span class="tag-kit">Kit</span> ' : ''}${esc(p.nome)}</b>
            <small>Você paga ${fmt(p.repasse)} de repasse · sugerido ${fmt(p.sugerido)}</small>
            <small class="ms-ganho ${ganho < 0 ? 'neg' : ''}" data-ms-ganho="${p.id}">${p.repasse > 0 ? `Você ganha ${fmt(ganho)} por peça` : ''}</small></div>
        <input type="text" class="mask-money ms-preco-in" inputmode="numeric" data-ms-preco="${p.id}" value="${MS.mudou[p.id] !== undefined ? (MS.mudou[p.id] ? fmt(MS.mudou[p.id]) : '') : (p.meu_preco ? fmt(p.meu_preco) : '')}" placeholder="${fmt(p.sugerido || p.preco)}" aria-label="Seu preço para ${esc(p.nome)}" oninput="setTimeout(() => mudouPrecoSite(${p.id}))">
    </div>`;
}
function htmlPrecos(d) {
    const t = MS.busca, lista = d.produtos.filter(p => window.buscaBate(t, p.nome)), n = Object.keys(MS.mudou).length;
    return `<p class="texto-ajuda ms-dica">O cliente vê o preço que você colocar. Campo vazio = vale o preço sugerido. O preço não pode ser menor que o repasse que você paga para a Mini Mundo.</p>
        <div class="busca-ic"><svg class="ic"><use href="#i-busca"/></svg><input type="search" id="ms-busca" placeholder="Buscar produto…" autocomplete="off" enterkeyhint="search" value="${esc(t)}" oninput="MS.busca = this.value; filtrarPrecosSite()"></div>
        <div class="ms-precos" id="ms-precos">${lista.map(linhaPreco).join('') || `<div class="vazio-box pequeno">${ic('busca')}<b>Nenhum produto</b><span>${d.produtos.length ? 'Tente outra busca.' : 'A Mini Mundo ainda não tem páginas de venda no ar.'}</span></div>`}</div>
        <div class="ms-salvar ${n ? 'on' : ''}" id="ms-salvar"><span id="ms-salvar-txt">${n ? `${n} preço${n > 1 ? 's' : ''} mudado${n > 1 ? 's' : ''}` : 'Nenhuma mudança'}</span>
            <button class="btn-magic" id="btn-ms-precos" onclick="salvarPrecosSite()" ${n ? '' : 'disabled'}>${ic('check')} Salvar preços</button></div>`;
}
window.filtrarPrecosSite = function() {
    const d = MS.dados, lista = d.produtos.filter(p => window.buscaBate(MS.busca, p.nome));
    $('ms-precos').innerHTML = lista.map(linhaPreco).join('') || `<div class="vazio-box pequeno">${ic('busca')}<b>Nenhum produto</b><span>Tente outra busca.</span></div>`;
};
window.mudouPrecoSite = function(id) {
    const p = MS.dados.produtos.find(x => x.id === id); if (!p) return;
    const v = precoDigitado(id), antes = p.meu_preco || 0;
    if (Math.abs(v - antes) < 0.005) delete MS.mudou[id]; else MS.mudou[id] = v;
    const g = document.querySelector(`[data-ms-ganho="${id}"]`), ganho = (v || p.sugerido) - p.repasse;
    if (g && p.repasse > 0) { g.innerText = v > 0 && v < p.repasse ? `Abaixo do repasse (${fmt(p.repasse)})` : `Você ganha ${fmt(ganho)} por peça`; g.classList.toggle('neg', v > 0 && v < p.repasse); }
    const n = Object.keys(MS.mudou).length;
    $('ms-salvar').classList.toggle('on', !!n); $('btn-ms-precos').disabled = !n;
    $('ms-salvar-txt').innerText = n ? `${n} preço${n > 1 ? 's' : ''} mudado${n > 1 ? 's' : ''}` : 'Nenhuma mudança';
};
window.salvarPrecosSite = async function() {
    const itens = Object.entries(MS.mudou).map(([id, v]) => ({ produto_id: +id, preco: v > 0 ? window.fmtPlanilha(v) : '' }));
    if (!itens.length) return;
    const abaixo = itens.map(i => MS.dados.produtos.find(p => p.id === i.produto_id)).filter(p => p && MS.mudou[p.id] > 0 && MS.mudou[p.id] < p.repasse);
    if (abaixo.length) return window.mostrarAlerta('Preço abaixo do repasse', `${abaixo.map(p => `${p.nome}: o repasse é ${fmt(p.repasse)}`).join('\n')}\n\nCom esse preço você pagaria para vender. Aumente o preço.`, 'warning');
    const b = $('btn-ms-precos'), txt = b.innerHTML; b.disabled = true; b.innerText = 'Salvando…';
    try {
        await window.apiAcao('salvar_meus_precos', { itens });
        await window.carregarMeuSite(); window.toastMM('Preços salvos: o site já mostra os novos');
    } catch (e) { window.mostrarAlerta('Não deu para salvar', erroAmigavel(e), 'warning'); b.disabled = false; b.innerHTML = txt; }
};

// ---------- Divulgar ----------
function htmlDivulgar(d) {
    const L = d.loja, todas = window.linkSiteVendedor(L.apelido);
    const bts = (link, titulo) => `<div class="ms-link-bts">
        <button class="btn-limpar" onclick="copiarTexto('${esc(link)}', 'Link copiado!')">${ic('copiar')}Copiar</button>
        <a class="btn-limpar zap" target="_blank" rel="noopener" href="${esc(window.linkZap('', `${titulo}\nVeja e faça o seu pedido: ${link}`))}">${ic('zap')}WhatsApp</a>
        <a class="btn-limpar" target="_blank" rel="noopener" href="${esc(link)}">${ic('olho')}Abrir</a></div>`;
    return `<p class="texto-ajuda ms-dica">Mande estes links para os seus clientes. Eles veem as páginas da Mini Mundo com os <b>seus</b> preços e falam com você.</p>
        <div class="ms-links">${d.paginas.map(p => { const link = window.linkSiteVendedor(L.apelido, p.slug); return `<div class="ms-link">
            ${p.capa ? foto(p.capa) : `<span class="ms-link-ic">${ic('sacola')}</span>`}
            <div class="ms-link-info"><b>${esc(p.titulo)}</b><small>${p.qtd} produto${p.qtd === 1 ? '' : 's'}</small><code>${esc(link.replace(/^https?:\/\//, ''))}</code></div>
            ${bts(link, `🛍️ ${p.titulo}`)}</div>`; }).join('') || `<div class="vazio-box pequeno">${ic('sacola')}<b>Nenhuma página no ar</b><span>Quando a Mini Mundo publicar uma coleção, o seu link aparece aqui.</span></div>`}
            ${d.paginas.length > 1 ? `<div class="ms-link"><span class="ms-link-ic">${ic('grade')}</span><div class="ms-link-info"><b>Todas as coleções</b><small>uma página com todas</small><code>${esc(todas.replace(/^https?:\/\//, ''))}</code></div>${bts(todas, '🛍️ Coleções Mini Mundo')}</div>` : ''}
        </div>
        <div class="card ms-dados">
            <div class="card-titulo">Seus dados no site</div>
            <div class="row"><div class="col"><div class="input-group"><label for="ms-zap">WhatsApp (os clientes falam com você)</label><input type="tel" id="ms-zap" inputmode="tel" value="${esc(L.whatsapp)}"></div></div>
                <div class="col"><div class="input-group"><label for="ms-pix">Chave Pix (opcional)</label><input type="text" id="ms-pix" value="${esc(L.pix)}" placeholder="Aparece para quem escolher Pix" maxlength="140" autocomplete="off"></div></div></div>
            <button class="btn-magic btn-global" id="btn-ms-dados" onclick="salvarDadosSite()">${ic('check')} Salvar</button>
            <button type="button" class="btn-limpar ep-link esconde-vendo-como" onclick="desligarMeuSite()">${ic('x')} Desligar meu site</button>
        </div>`;
}
window.salvarDadosSite = async function() {
    const b = $('btn-ms-dados'), txt = b.innerHTML; b.disabled = true; b.innerText = 'Salvando…';
    try { await window.apiAcao('salvar_minha_loja', { whatsapp: $('ms-zap').value, pix: $('ms-pix').value }); await window.carregarMeuSite(); window.toastMM('Dados do site salvos'); }
    catch (e) { window.mostrarAlerta('Não deu para salvar', erroAmigavel(e), 'warning'); b.disabled = false; b.innerHTML = txt; }
};
window.desligarMeuSite = async function() {
    if (!await window.confirmarMM({ tipo: 'perigo', icone: '🌐', titulo: 'Desligar o seu site?', texto: 'Quem abrir o seu link vai ver a página normal da Mini Mundo. Seus preços ficam guardados para quando você ligar de novo.', ok: 'Desligar' })) return;
    try { await window.apiAcao('salvar_minha_loja', { ativa: false }); MS.aba = null; await window.carregarMeuSite(); }
    catch (e) { window.mostrarAlerta('Não deu para desligar', erroAmigavel(e), 'warning'); }
};

// ---------- Pedidos do site ----------
function cartaoPedido(p, admin) {
    const prox = PROXIMA[p.status], fim = ['entregue', 'cancelado'].includes(p.status);
    const zapCli = window.linkZap(p.telefone, `Olá, ${p.cliente.split(' ')[0]}! Aqui é sobre o seu pedido *#${p.id}* (${p.pagina_titulo || 'Mini Mundo'}).`);
    return `<div class="ms-ped ${fim ? 'fim' : ''}">
        <div class="ms-ped-topo"><b>#${p.id} · ${esc(p.cliente)}</b>${etapa(p.status)}</div>
        <small class="ms-ped-sub">${window.fmtDataHora(p.criado_em)}${p.pagina_titulo ? ` · ${esc(p.pagina_titulo)}` : ''} · ${p.entrega === 'entrega' ? 'entregar' : 'vai retirar'} · ${esc(p.pagamento || 'a combinar')}${p.pago ? ' · <b class="txt-verde">pago</b>' : ''}</small>
        <ul class="ms-ped-itens">${p.itens.map(i => `<li>${foto((i.fotos || [])[0])}<span><b>${i.qtd}×</b> ${esc(i.nome)}</span><em>${i.preco ? fmt(i.preco * i.qtd) : 'a combinar'}</em></li>`).join('')}</ul>
        ${p.entrega === 'entrega' && p.endereco ? `<p class="ms-ped-obs">${ic('pacote')} ${esc(p.endereco)}</p>` : ''}${p.obs ? `<p class="ms-ped-obs">${ic('recibo')} ${esc(p.obs)}</p>` : ''}
        <div class="ms-ped-total"><span>Total</span><b>${fmt(p.total)}</b></div>
        ${p.baixa_feita ? `<p class="ms-ped-baixa">${ic('check')} Peças registradas como vendidas (repasse para acertar)</p>` : ''}
        ${admin ? '' : `<div class="ms-ped-bts">
            ${p.telefone ? `<a class="btn-limpar zap" target="_blank" rel="noopener" href="${esc(zapCli)}">${ic('zap')}Cliente</a>` : ''}
            ${prox ? `<button class="btn-limpar azul" onclick="etapaPedidoSite(${p.id}, '${prox[0]}')">${prox[1]}</button>` : ''}
            ${!p.pago && p.status !== 'cancelado' ? `<button class="btn-limpar verde" onclick="pagoPedidoSite(${p.id})">${ic('dinheiro')}Recebi</button>` : ''}
            ${!p.baixa_feita && p.status !== 'cancelado' ? `<button class="btn-limpar" onclick="baixaPedidoSite(${p.id})">${ic('check')}Dar baixa nas peças</button>` : ''}
            <button class="btn-limpar" onclick="recadoPedidoSite(${p.id})">${ic('lapis')}Recado</button>
            ${!fim ? `<button class="btn-ic perigo" title="Cancelar o pedido" aria-label="Cancelar o pedido" onclick="etapaPedidoSite(${p.id}, 'cancelado')">${ic('x')}</button>` : ''}
        </div>`}
    </div>`;
}
window.cartaoPedidoSite = cartaoPedido;
function htmlPedidos(d) {
    const abertos = d.pedidos.filter(p => !['entregue', 'cancelado'].includes(p.status)), outros = d.pedidos.filter(p => ['entregue', 'cancelado'].includes(p.status));
    if (!d.pedidos.length) return `<div class="vazio-box">${ic('recibo')}<b>Nenhum pedido ainda</b><span>Quando um cliente pedir pelo seu link, o pedido aparece aqui. Divulgue o seu site na aba <a onclick="abaMeuSite('divulgar')">Divulgar</a>.</span></div>`;
    return `<p class="texto-ajuda ms-dica">Entregou? Toque em <b>Dar baixa nas peças</b>: elas saem da sua mala e o repasse entra no seu acerto. Não tem a peça? Peça em <a onclick="switchTab('v_encomendas')">Encomendas</a>.</p>
        ${abertos.length ? `<h4 class="ms-tit">Em andamento</h4>${abertos.map(p => cartaoPedido(p)).join('')}` : ''}
        ${outros.length ? `<h4 class="ms-tit">Entregues e cancelados</h4>${outros.slice(0, 30).map(p => cartaoPedido(p)).join('')}` : ''}`;
}
async function mudarPedido(id, dados, aviso) {
    try { await window.apiAcao('status_meu_pedido_site', Object.assign({ id }, dados)); await window.carregarMeuSite(); if (window.carregarPainelVendedor) window.carregarPainelVendedor(); if (aviso) window.toastMM(aviso); return true; }
    catch (e) { window.mostrarAlerta('Não deu para mudar', erroAmigavel(e), 'warning'); return false; }
}
window.etapaPedidoSite = async function(id, status) {
    const p = MS.dados.pedidos.find(x => x.id === id); if (!p) return;
    if (status === 'cancelado' && !await window.confirmarMM({ tipo: 'perigo', icone: '🚫', titulo: `Cancelar o pedido #${id}?`, texto: 'O cliente vê que o pedido foi cancelado.', ok: 'Cancelar pedido', cancelar: 'Voltar' })) return;
    if (!await mudarPedido(id, { status }, `Pedido #${id}: ${ETAPAS[status][0]}`)) return;
    // Entregou e ainda não deu baixa: já oferece
    if (status === 'entregue' && !p.baixa_feita && await window.confirmarMM({ icone: '✅', titulo: 'Dar baixa nas peças?', texto: 'As peças deste pedido saem da sua mala e o repasse entra no seu acerto com a Mini Mundo.', ok: 'Dar baixa', cancelar: 'Depois' })) window.baixaPedidoSite(id, true);
};
window.pagoPedidoSite = id => mudarPedido(id, { pago: true }, `Pedido #${id}: pago`);
window.recadoPedidoSite = async function(id) {
    const recado = await window.pedirValorMM({ icone: '💬', titulo: 'Recado para o cliente', texto: 'Ele vê no acompanhamento do pedido (e recebe aviso no celular, se ativou).', placeholder: 'Ex: Seu pedido sai amanhã à tarde!', ok: 'Enviar recado', validar: v => String(v || '').trim() ? '' : 'Escreva o recado.' });
    if (recado) mudarPedido(id, { recado }, 'Recado enviado');
};
window.baixaPedidoSite = async function(id, jaPerguntou) {
    const p = MS.dados.pedidos.find(x => x.id === id); if (!p) return;
    if (!jaPerguntou && !await window.confirmarMM({ icone: '✅', titulo: 'Dar baixa nas peças?', texto: `${p.itens.map(i => `${i.qtd}× ${i.nome}`).join('\n')}\n\nAs peças saem da sua mala e o repasse entra no seu acerto com a Mini Mundo.`, ok: 'Dar baixa' })) return;
    try {
        const r = await window.apiAcao('baixa_pedido_site', { id });
        await window.carregarMeuSite(); if (window.carregarPainelVendedor) window.carregarPainelVendedor();
        window.mostrarAlerta('Baixa feita!', `${r.pecas} peça${r.pecas > 1 ? 's' : ''} vendida${r.pecas > 1 ? 's' : ''}. Repasse para acertar: ${fmt(r.total)}.`, 'success');
    } catch (e) { window.mostrarAlerta('Não deu para dar baixa', erroAmigavel(e), 'warning'); }
};

// ---------- No controle do vendedor (Admin) ----------
window.htmlSiteNoControle = function(d) {
    const s = d.site, v = d.vendedor, nome = esc(v.nome);
    if (!s) return `<div class="vazio-box pequeno">${ic('alerta')}<b>O servidor ainda não tem o site dos vendedores</b><span>Atualize o server.js.</span></div>`;
    const L = s.loja, link = L.apelido ? window.linkSiteVendedor(L.apelido) : '';
    const situacao = L.ativa ? `<div class="ms-sit ok">${ic('check')}<div><b>Site no ar</b><small>${L.visitas} visita${L.visitas === 1 ? '' : 's'} · ${s.produtos} produtos · <a href="${esc(link)}" target="_blank" rel="noopener">${esc(link.replace(/^https?:\/\//, ''))}</a></small></div>
            <button class="btn-limpar" onclick="pausarSiteVendedor(${v.id}, true)">Pausar</button></div>`
        : L.bloqueada ? `<div class="ms-sit pausa">${ic('alerta')}<div><b>Pausado por você</b><small>O link de ${nome} mostra a sua página normal.</small></div><button class="btn-limpar verde" onclick="pausarSiteVendedor(${v.id}, false)">Liberar</button></div>`
        : `<div class="ms-sit">${ic('sacola')}<div><b>${nome} ainda não criou o site</b><small>${nome} cria em "Meu site", no próprio painel. Ou crie agora.</small></div><button class="btn-limpar verde" onclick="criarSiteParaVendedor(${v.id})">Criar o site</button></div>`;
    return `<p class="texto-ajuda cv-dica">${nome} vende com as suas páginas, mas com o preço que escolher. Os pedidos desse site ficam aqui (não na sua tela Pedidos). Quando ${nome} entrega e dá baixa, o repasse entra em <b>Vendas</b> para acertar.</p>
        ${situacao}
        <h4 class="ms-tit">Preços de ${nome} <small>(os outros produtos usam o sugerido)</small></h4>
        <div class="cv-lista">${s.precos.map(p => `<div class="cvp-linha">${foto(p.foto)}<span class="cvb-info"><b>${esc(p.nome)}</b><small>repasse ${fmt(p.repasse)} · sugerido ${fmt(p.sugerido)}</small></span><b class="cvb-v">${fmt(p.meu_preco)}</b></div>`).join('')
            || `<div class="vazio-box pequeno">${ic('etiqueta')}<b>Nenhum preço próprio</b><span>O site de ${nome} mostra o preço sugerido.</span></div>`}</div>
        <h4 class="ms-tit">Pedidos do site de ${nome}</h4>
        ${s.pedidos.map(p => cartaoPedido(p, true)).join('') || `<div class="vazio-box pequeno">${ic('recibo')}<b>Nenhum pedido ainda</b><span>Quando um cliente pedir pelo link de ${nome}, aparece aqui.</span></div>`}
        <div class="cv-bts-rodape"><button class="btn-limpar" onclick="verComoVendedor(${v.id}); switchTab('v_site')">${ic('olho')}Ver o "Meu site" de ${nome}</button></div>`;
};
window.pausarSiteVendedor = async function(vid, pausar) {
    if (pausar && !await window.confirmarMM({ tipo: 'perigo', icone: '🌐', titulo: 'Pausar o site?', texto: 'O link desse site passa a mostrar a sua página normal, com os seus preços. Os preços escolhidos ficam guardados.', ok: 'Pausar' })) return;
    try { await window.apiAcao('site_vendedor', { vendedor_id: vid, pausar }); window.toastMM(pausar ? 'Site pausado' : 'Site liberado'); window.abrirVendedor(vid, 'site'); }
    catch (e) { window.mostrarAlerta('Não deu para mudar', erroAmigavel(e), 'warning'); }
};
window.criarSiteParaVendedor = async function(vid) {
    try { await window.apiAcao('salvar_minha_loja', { vendedor_id: vid, ativa: true }); window.toastMM('Site criado'); window.abrirVendedor(vid, 'site'); }
    catch (e) { window.mostrarAlerta('Não deu para criar', erroAmigavel(e), 'warning'); }
};
})();
