// ==========================================
// 🧾 PEDIDOS DOS CLIENTES (feitos no site ou anotados por você)
// ==========================================
// Cada pedido anda pelas etapas: Novo → Confirmado → Em produção → Pronto → Entregue (ou Cancelado).
// Quando quiser, o pedido vira venda (aparece em Vendas, entra no financeiro e pode sair do estoque do Ateliê).
// Pedidos que chegam pelo WhatsApp, Instagram ou feira também podem ser anotados aqui, para controlar tudo junto.
(() => {
const $ = window.$;
const esc = s => window.esc(s);
const val = v => window.limparValorPlanilha(v);
window.PC = { lista: [], filtro: 'abertos', novos: 0, form: null };
const ETAPAS = { novo: ['Novo', 'laranja'], confirmado: ['Confirmado', 'azul'], producao: ['Em produção', 'roxo'], pronto: ['Pronto', 'verde'], entregue: ['Entregue', 'cinza'], cancelado: ['Cancelado', 'vermelho'] };
const PROXIMA = { novo: ['confirmado', 'Confirmar'], confirmado: ['producao', 'Começar produção'], producao: ['pronto', 'Marcar pronto'], pronto: ['entregue', 'Marcar entregue'] };
const ABERTOS = ['novo', 'confirmado', 'producao', 'pronto'];
const ORIGENS = ['WhatsApp', 'Instagram', 'Feira', 'Indicação', 'Loja física'];
const PAGAMENTOS = ['Pix', 'Cartão', 'Dinheiro', 'A combinar'];
const FORMAS_VENDA = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Outro'];
const produtoPorId = id => (window.arrayBancoCustos || []).find(p => p.linha === id);
const pedidoPorId = id => PC.lista.find(p => p.id === id);
const fotoDe = p => ((p && window.fotosDe(p)) || [])[0] || (p && p.tipo === 'kit' ? (p.itens || []).map(i => (window.fotosDe(produtoPorId(i.produto_id)) || [])[0]).find(Boolean) || '' : '');
const servidorAntigo = e => e.message === 'Ação não reconhecida.' ? 'O servidor ainda está na versão antiga. Atualize o server.js na alwaysdata.' : e.message;
const dataHora = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?/); return m ? `${m[3]}/${m[2]}${m[4] ? ` ${m[4]}:${m[5]}` : ''}` : ''; };
const fone = t => { const d = String(t || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, ''); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : t || ''; };
const linkAcompanhar = codigo => new URL(`loja?pedido=${encodeURIComponent(codigo)}`, location.href).href;
const chip = st => `<span class="pc-st ${ETAPAS[st] ? ETAPAS[st][1] : ''}">${ETAPAS[st] ? ETAPAS[st][0] : esc(st)}</span>`;

// ---------- Aviso de pedido novo (menu e notificação) ----------
function pintarAviso() {
    document.querySelectorAll('[data-aviso-pedidos]').forEach(el => { el.textContent = PC.novos || ''; el.hidden = !PC.novos; });
}
window.vigiarPedidos = function() {
    const olhar = async () => {
        if (!document.body.classList.contains('logado') || document.body.classList.contains('modo-vendedor')) return;
        try {
            const n = (await window.apiAcao('pedidos_novos')).novos || 0;
            if (n > PC.novos && PC.vigiando) {
                window.toastMM(`🛍️ ${n - PC.novos > 1 ? `${n - PC.novos} pedidos novos` : 'Pedido novo'} pelo site!`);
                if ('Notification' in window && Notification.permission === 'granted') try { new Notification('Mini Mundo: pedido novo', { body: 'Chegou pedido pela página de vendas.', icon: 'logo.png' }); } catch (e) { /* aparelho sem notificação */ }
                if ($('tab-pedidos') && $('tab-pedidos').classList.contains('active')) window.carregarPedidos();
            }
            PC.novos = n; PC.vigiando = true; pintarAviso();
        } catch (e) { /* servidor antigo ou sem internet: tenta depois */ }
    };
    olhar(); clearInterval(PC.relogio); PC.relogio = setInterval(olhar, 120000);
};

// ---------- Lista ----------
window.carregarPedidos = async function() {
    if ($('lista-pedidos') && !PC.lista.length) $('lista-pedidos').innerHTML = '<p class="mm-vazio">Carregando os pedidos…</p>';
    try {
        const [r] = await Promise.all([window.apiAcao('listar_pedidos_clientes'), (window.arrayBancoCustos || []).length ? null : window.carregarBancoDeCustos()]);
        PC.lista = r.pedidos || []; PC.erro = '';
    } catch (e) { PC.erro = servidorAntigo(e); }
    PC.novos = PC.lista.filter(p => p.status === 'novo').length; pintarAviso();
    window.renderizarPedidos();
};
window.filtroPedidos = function(f) { PC.filtro = f; document.querySelectorAll('#pc-filtros button').forEach(b => b.classList.toggle('active', b.dataset.f === f)); window.renderizarPedidos(); };
window.renderizarPedidos = function() {
    const box = $('lista-pedidos'); if (!box) return;
    if (PC.erro) { box.innerHTML = `<div class="mm-alerta">${window.ic('alerta')} <span>${esc(PC.erro)}</span></div>`; return; }
    const t = $('pc-busca').value, todos = PC.lista;
    const conta = { abertos: todos.filter(p => ABERTOS.includes(p.status)).length, todos: todos.length };
    Object.keys(ETAPAS).forEach(s => { conta[s] = todos.filter(p => p.status === s).length; });
    document.querySelectorAll('#pc-filtros button').forEach(b => { b.querySelector('em').innerText = conta[b.dataset.f] || ''; });
    const abertos = todos.filter(p => ABERTOS.includes(p.status)), aReceber = abertos.filter(p => !p.pago).reduce((s, p) => s + p.total, 0);
    $('pc-resumo').innerHTML = `${conta.novo ? `<b class="pc-novos">${conta.novo} novo${conta.novo > 1 ? 's' : ''}</b> · ` : ''}${abertos.length} em aberto${aReceber ? ` · ${window.fmt(aReceber)} a receber` : ''}`;
    const lista = todos.filter(p => (PC.filtro === 'todos' || (PC.filtro === 'abertos' ? ABERTOS.includes(p.status) : p.status === PC.filtro))
        && window.buscaBate(t, '#' + p.id, p.cliente, p.telefone, p.origem, p.pagina_titulo, p.itens.map(i => i.nome).join(' ')));
    if (!lista.length) {
        box.innerHTML = `<div class="vazio-box">${window.ic('recibo')}<b>${!todos.length ? 'Nenhum pedido ainda' : t.trim() ? `Nada encontrado para "${esc(t)}"` : 'Nenhum pedido nessa etapa'}</b>
            <span>${!todos.length ? 'Os pedidos feitos nas páginas de venda aparecem aqui. Você também pode anotar pedidos do WhatsApp ou do Instagram.' : ''}</span></div>`;
        return;
    }
    box.innerHTML = lista.map(p => {
        const prox = PROXIMA[p.status], semPreco = p.itens.some(i => !(i.preco > 0));
        return `<div class="pc-card st-${p.status}" onclick="abrirPedido(${p.id})" role="button" tabindex="0">
            <div class="pc-topo"><b>#${p.id}</b>${chip(p.status)}<span class="pc-origem">${p.origem === 'Site' ? `${window.ic('sacola')} ${esc(p.pagina_titulo || 'Site')}` : esc(p.origem)}</span><small>${dataHora(p.criado_em)}</small></div>
            <div class="pc-cliente"><b>${esc(p.cliente)}</b>${p.telefone ? `<span>${esc(fone(p.telefone))}</span>` : ''}</div>
            <div class="pc-itens">${p.itens.map(i => `${i.qtd}× ${esc(i.nome)}`).join(' · ')}</div>
            <div class="pc-rodape"><b>${window.fmt(p.total)}${semPreco ? ' +' : ''}</b>${p.pago ? '<span class="mm-chip verde">pago</span>' : ''}<span>${esc(p.pagamento || '')}</span><span>${p.entrega === 'entrega' ? 'Entrega' : 'Retirada'}${p.data_entrega ? ` ${dataHora(p.data_entrega)}` : ''}</span>${p.venda_pedido_id ? `<span class="mm-chip">venda #${p.venda_pedido_id}</span>` : ''}</div>
            ${prox ? `<div class="pc-botoes" onclick="event.stopPropagation()"><button class="btn-magic btn-pequeno" onclick="mudarEtapa(${p.id}, '${prox[0]}')">${window.ic('check')} ${prox[1]}</button>${p.telefone ? `<a class="btn-limpar" href="${esc(window.linkZap(p.telefone, mensagemEtapa(p, p.status)))}" target="_blank" rel="noopener">${window.ic('zap')} WhatsApp</a>` : ''}</div>` : ''}
        </div>`;
    }).join('');
};

// Mensagem pronta para o cliente, de acordo com a etapa
function mensagemEtapa(p, st) {
    const nome = (p.cliente || '').split(' ')[0], link = linkAcompanhar(p.codigo), itens = p.itens.map(i => `• ${i.qtd}× ${i.nome}`).join('\n');
    const m = {
        novo: `Olá, ${nome}! Recebemos o seu pedido *#${p.id}*:\n${itens}\nTotal: ${window.fmt(p.total)}\n\nPodemos confirmar?`,
        confirmado: `Olá, ${nome}! Seu pedido *#${p.id}* está confirmado. 🎉${p.data_entrega ? `\nPrevisão: ${dataHora(p.data_entrega)}.` : ''}\nTotal: ${window.fmt(p.total)}${p.pagamento && p.pagamento !== 'A combinar' && !p.pago ? ` (${p.pagamento})` : ''}`,
        producao: `Olá, ${nome}! Seu pedido *#${p.id}* já está em produção. 🖨️`,
        pronto: `Olá, ${nome}! Seu pedido *#${p.id}* está pronto! ${p.entrega === 'entrega' ? 'Vamos combinar a entrega?' : 'Quando fica bom para você retirar?'}`,
        entregue: `Olá, ${nome}! Obrigado pela compra! Esperamos que goste. 💛`,
        cancelado: `Olá, ${nome}! Seu pedido *#${p.id}* foi cancelado. Qualquer dúvida, é só falar.`
    }[st] || '';
    return `${m}\n\nAcompanhe aqui: ${link}`;
}

// ---------- Detalhe ----------
window.abrirPedido = function(id) {
    const p = pedidoPorId(id); if (!p) return;
    const semPreco = p.itens.some(i => !(i.preco > 0)), subtotal = p.itens.reduce((s, i) => s + (i.preco || 0) * i.qtd, 0);
    window.abrirModalMM(`<h3 class="modal-title">${window.ic('recibo')} Pedido #${p.id} ${chip(p.status)}</h3>
        <p class="texto-ajuda" style="margin-top:0;">${p.origem === 'Site' ? `Feito no site · ${esc(p.pagina_titulo)}` : `Anotado por ${esc(p.criado_por || '—')} · ${esc(p.origem)}`} · ${dataHora(p.criado_em)}</p>
        <div class="pc-etapas">${Object.keys(ETAPAS).map(s => `<button type="button" class="${s === p.status ? 'on ' + ETAPAS[s][1] : ''}" onclick="mudarEtapa(${p.id}, '${s}', true)">${ETAPAS[s][0]}</button>`).join('')}</div>
        <div class="pc-bloco">
            <div class="pc-linha"><span>Cliente</span><b>${esc(p.cliente)}</b></div>
            ${p.telefone ? `<div class="pc-linha"><span>WhatsApp</span><b>${esc(fone(p.telefone))}</b></div>` : ''}
            <div class="pc-linha"><span>Recebimento</span><b>${p.entrega === 'entrega' ? 'Entrega' : 'Retirada'}${p.data_entrega ? ` · ${dataHora(p.data_entrega)}` : ''}</b></div>
            ${p.entrega === 'entrega' && p.endereco ? `<div class="pc-linha col"><span>Endereço</span><b>${esc(p.endereco)}</b></div>` : ''}
            <div class="pc-linha"><span>Pagamento</span><b>${esc(p.pagamento || '—')}</b></div>
            ${p.obs ? `<div class="pc-linha col"><span>Recado do cliente</span><b>${esc(p.obs)}</b></div>` : ''}
            ${p.obs_interna ? `<div class="pc-linha col"><span>Anotação interna</span><b>${esc(p.obs_interna)}</b></div>` : ''}
        </div>
        <div class="pc-bloco">${p.itens.map(i => { const x = i.produto_id && produtoPorId(i.produto_id); return `<div class="pc-item"><img src="${esc(fotoDe(x) || 'logo.png')}" alt="" onerror="this.src='logo.png'"><span>${i.qtd}× ${esc(i.nome)}</span><b>${i.preco > 0 ? window.fmt(i.preco * i.qtd) : '<i>a combinar</i>'}</b></div>`; }).join('')}
            ${p.desconto || p.taxa_entrega ? `<div class="pc-linha"><span>Produtos</span><b>${window.fmt(subtotal)}</b></div>` : ''}
            ${p.desconto ? `<div class="pc-linha"><span>Desconto</span><b>− ${window.fmt(p.desconto)}</b></div>` : ''}${p.taxa_entrega ? `<div class="pc-linha"><span>Entrega</span><b>${window.fmt(p.taxa_entrega)}</b></div>` : ''}
            <div class="pc-total"><span>Total${semPreco ? ' <small>(+ itens a combinar)</small>' : ''}</span><b>${window.fmt(p.total)}</b></div>
            <label class="chave" style="margin:12px 0 0;"><input type="checkbox" ${p.pago ? 'checked' : ''} onchange="marcarPago(${p.id}, this.checked)"> Já foi pago</label>
        </div>
        ${p.venda_pedido_id ? `<p class="pc-venda ok">${window.ic('check')} Lançado nas Vendas (pedido #${p.venda_pedido_id})</p>`
            : `<button class="btn-magic btn-global" onclick="lancarVenda(${p.id})">${window.ic('carrinho')} Lançar como venda</button><p class="texto-ajuda" style="margin:-4px 0 12px;">Aparece em Vendas e no financeiro. Faça quando o pedido for pago ou entregue.</p>`}
        <div class="pc-acoes">
            ${p.telefone ? `<a class="btn-limpar" href="${esc(window.linkZap(p.telefone, mensagemEtapa(p, p.status)))}" target="_blank" rel="noopener">${window.ic('zap')} Mensagem: ${ETAPAS[p.status][0].toLowerCase()}</a>` : ''}
            <button class="btn-limpar" onclick="copiarTexto('${esc(linkAcompanhar(p.codigo))}', 'Link para o cliente acompanhar copiado!')">${window.ic('copiar')} Link de acompanhar</button>
            <button class="btn-limpar" onclick="editarPedido(${p.id})">${window.ic('lapis')} Editar</button>
            ${p.venda_pedido_id ? '' : `<button class="btn-limpar perigo" onclick="excluirPedido(${p.id})">${window.ic('lixo')} Excluir</button>`}
        </div>`);
};
window.mudarEtapa = async function(id, status, reabrir) {
    const p = pedidoPorId(id); if (!p || p.status === status) return;
    if (status === 'cancelado' && !await window.confirmarMM({ tipo: 'perigo', icone: '🚫', titulo: `Cancelar o pedido #${id}?`, texto: 'Ele continua na lista, em "Cancelados".', ok: 'Cancelar pedido', cancelar: 'Voltar' })) return;
    try {
        await window.apiAcao('status_pedido_cliente', { id, status });
        p.status = status; PC.novos = PC.lista.filter(x => x.status === 'novo').length; pintarAviso();
        window.renderizarPedidos(); if (reabrir) window.abrirPedido(id);
        window.toastMM(`Pedido #${id}: ${ETAPAS[status][0]}`);
        // Entregue e ainda não lançado: oferece lançar a venda
        if (status === 'entregue' && !p.venda_pedido_id && await window.confirmarMM({ icone: '🛒', titulo: 'Lançar a venda agora?', texto: `O pedido #${id} foi entregue. Lançar nas Vendas (entra no financeiro)?`, ok: 'Lançar venda', cancelar: 'Depois' })) window.lancarVenda(id);
    } catch (e) { window.mostrarAlerta('Não deu para mudar', servidorAntigo(e), 'error'); }
};
window.marcarPago = async function(id, pago) {
    const p = pedidoPorId(id); if (!p) return;
    try { await window.apiAcao('status_pedido_cliente', { id, pago }); p.pago = pago; window.renderizarPedidos(); window.toastMM(pago ? 'Marcado como pago' : 'Marcado como não pago'); }
    catch (e) { window.mostrarAlerta('Não deu para salvar', servidorAntigo(e), 'error'); }
};
window.excluirPedido = async function(id) {
    if (!await window.confirmarMM({ tipo: 'perigo', icone: '🗑️', titulo: `Excluir o pedido #${id}?`, texto: 'Some da lista de vez. Se o cliente desistiu, prefira "Cancelado" (fica o histórico).', ok: 'Excluir' })) return;
    try { await window.apiAcao('excluir_pedido_cliente', { id }); PC.lista = PC.lista.filter(p => p.id !== id); window.fecharModalMM(); window.renderizarPedidos(); window.toastMM('Pedido excluído'); }
    catch (e) { window.mostrarAlerta('Não deu para excluir', servidorAntigo(e), 'error'); }
};

// ---------- Lançar como venda ----------
window.lancarVenda = function(id) {
    const p = pedidoPorId(id); if (!p) return;
    if (p.itens.some(i => !(i.preco > 0))) return window.mostrarAlerta('Falta preço', 'Tem produto com preço "a combinar". Toque em Editar e coloque o preço antes de lançar a venda.', 'warning');
    // Sai do Ateliê só se todos os produtos do cadastro tiverem a quantidade lá
    const daParaTirar = p.itens.every(i => !i.produto_id || ((produtoPorId(i.produto_id) || {}).est_atelie || 0) >= i.qtd);
    const forma = { Pix: 'Pix', Cartão: 'Cartão de crédito', Dinheiro: 'Dinheiro' }[p.pagamento] || 'Pix';
    window.abrirModalMM(`<h3 class="modal-title">${window.ic('carrinho')} Lançar o pedido #${p.id} nas Vendas</h3>
        <p class="texto-ajuda" style="margin-top:0;">${esc(p.cliente)} · ${window.fmt(p.total)}${p.taxa_entrega ? ' (com a entrega)' : ''}</p>
        <div class="input-group"><label for="lv-forma">Forma de pagamento</label><select id="lv-forma">${FORMAS_VENDA.map(f => `<option ${f === forma ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
        <div class="input-group"><label for="lv-canal">Canal</label><input type="text" id="lv-canal" value="${esc(p.origem === 'Site' ? 'Site' : p.origem)}" maxlength="100"></div>
        <label class="chave" style="margin:0 0 10px;"><input type="checkbox" id="lv-pago" ${p.pago ? 'checked' : ''}> Já foi pago</label>
        <label class="chave" style="margin:0 0 6px;"><input type="checkbox" id="lv-estoque" ${daParaTirar ? 'checked' : ''}> Tirar as peças do estoque do Ateliê</label>
        <p class="texto-ajuda" style="margin:0 0 14px;">${daParaTirar ? 'Tem tudo no Ateliê.' : 'Falta peça no Ateliê para tirar tudo. Monte os kits ou registre a produção antes, ou lance sem tirar do estoque.'}</p>
        <button class="btn-magic btn-global" id="btn-lv" onclick="confirmarLancarVenda(${p.id})">${window.ic('check')} Lançar venda</button>`);
};
window.confirmarLancarVenda = async function(id) {
    const b = $('btn-lv'); b.disabled = true;
    try {
        const pago = $('lv-pago').checked;
        const r = await window.apiAcao('lancar_venda_pedido', { id, forma_pgto: $('lv-forma').value, plataforma: $('lv-canal').value.trim(), pago, baixar_estoque: $('lv-estoque').checked });
        const p = pedidoPorId(id); if (p) { p.venda_pedido_id = r.venda; if (pago) p.pago = true; }
        window.fecharModalMM(); window.renderizarPedidos(); window.carregarBancoDeCustos();
        window.mostrarAlerta('Venda lançada!', `O pedido #${id} agora está em Vendas (pedido #${r.venda}).`, 'success');
    } catch (e) { window.mostrarAlerta('Não deu para lançar', servidorAntigo(e), 'error'); b.disabled = false; }
};

// ---------- Anotar ou editar pedido ----------
window.novoPedido = () => abrirFormPedido(null);
window.editarPedido = id => abrirFormPedido(pedidoPorId(id));
function abrirFormPedido(p) {
    PC.form = { id: p ? p.id : 0, travado: !!(p && p.venda_pedido_id), entrega: p ? p.entrega : 'retirar', origem: p ? p.origem : 'WhatsApp',
        itens: p ? p.itens.map(i => ({ ...i })) : [] };
    const f = PC.form, origens = f.origem && !ORIGENS.includes(f.origem) ? [f.origem, ...ORIGENS] : ORIGENS;
    window.abrirModalMM(`<h3 class="modal-title">${window.ic(p ? 'lapis' : 'mais')} ${p ? `Editar o pedido #${p.id}` : 'Anotar pedido'}</h3>
        ${p ? '' : '<p class="texto-ajuda" style="margin-top:0;">Para pedidos que chegaram pelo WhatsApp, Instagram, feira… e ficarem junto com os do site.</p>'}
        <div class="row"><div class="col"><div class="input-group"><label for="fp-cliente">Cliente *</label><input type="text" id="fp-cliente" value="${esc(p ? p.cliente : '')}" maxlength="120" autocomplete="off"></div></div>
            <div class="col"><div class="input-group"><label for="fp-tel">WhatsApp</label><input type="tel" id="fp-tel" value="${esc(p ? fone(p.telefone) : '')}" maxlength="20" placeholder="(11) 98888-7777"></div></div></div>
        <div class="input-group"><label>Veio por</label><div class="chips-op" id="fp-origem">${origens.map(o => `<button type="button" class="chip-op ${o === f.origem ? 'active' : ''}" data-o="${esc(o)}" onclick="fpOrigem(this, this.dataset.o)">${esc(o)}</button>`).join('')}</div></div>
        <div class="input-group"><label>Produtos ${f.travado ? '<small class="rot-dica">já lançado nas Vendas: produtos e valores travados</small>' : ''}</label>
            ${f.travado ? '' : `<div class="busca-ic"><svg class="ic"><use href="#i-busca"/></svg><input type="search" id="fp-busca" placeholder="Buscar produto para pôr no pedido…" autocomplete="off" oninput="fpBuscar()"></div><div id="fp-achados" class="fp-achados"></div>`}
            <div id="fp-itens"></div>
            ${f.travado ? '' : `<button type="button" class="btn-limpar" style="margin-top:8px;" onclick="fpItemAvulso()">${window.ic('mais')} Item fora do cadastro</button>`}</div>
        <div class="row"><div class="col"><div class="input-group"><label for="fp-desc">Desconto</label><input type="text" id="fp-desc" class="mask-money" inputmode="numeric" value="${p && p.desconto ? window.fmt(p.desconto) : ''}" placeholder="R$ 0,00" oninput="setTimeout(fpTotal)" ${f.travado ? 'disabled' : ''}></div></div>
            <div class="col"><div class="input-group"><label for="fp-taxa">Taxa de entrega</label><input type="text" id="fp-taxa" class="mask-money" inputmode="numeric" value="${p && p.taxa_entrega ? window.fmt(p.taxa_entrega) : ''}" placeholder="R$ 0,00" oninput="setTimeout(fpTotal)" ${f.travado ? 'disabled' : ''}></div></div></div>
        <p class="fp-total" id="fp-total"></p>
        <div class="input-group"><label>Recebimento</label><div class="seg-mini largo" id="fp-entrega"><button type="button" data-v="retirar" class="${f.entrega === 'retirar' ? 'active' : ''}" onclick="fpEntrega('retirar')">Retirada</button><button type="button" data-v="entrega" class="${f.entrega === 'entrega' ? 'active' : ''}" onclick="fpEntrega('entrega')">Entrega</button></div></div>
        <div class="input-group" id="fp-end-box" ${f.entrega === 'entrega' ? '' : 'hidden'}><label for="fp-end">Endereço</label><textarea id="fp-end" rows="2" maxlength="500">${esc(p ? p.endereco : '')}</textarea></div>
        <div class="row"><div class="col"><div class="input-group"><label for="fp-data">Data de entrega</label><input type="date" id="fp-data" value="${esc(p ? p.data_entrega : '')}"></div></div>
            <div class="col"><div class="input-group"><label for="fp-pgto">Pagamento</label><select id="fp-pgto">${[...new Set([...(p && p.pagamento ? [p.pagamento] : []), ...PAGAMENTOS])].map(x => `<option ${p && p.pagamento === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div></div></div>
        <div class="row"><div class="col"><div class="input-group"><label for="fp-status">Etapa</label><select id="fp-status">${Object.entries(ETAPAS).map(([k, v]) => `<option value="${k}" ${(p ? p.status : 'confirmado') === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div></div>
            <div class="col" style="display:flex;align-items:center;"><label class="chave" style="margin:10px 0 0;"><input type="checkbox" id="fp-pago" ${p && p.pago ? 'checked' : ''}> Já foi pago</label></div></div>
        <div class="input-group"><label for="fp-obs">Recado do cliente</label><textarea id="fp-obs" rows="2" maxlength="1000" placeholder="Nome para personalizar, cores…">${esc(p ? p.obs : '')}</textarea></div>
        <div class="input-group"><label for="fp-interna">Anotação interna <small class="rot-dica">o cliente não vê</small></label><textarea id="fp-interna" rows="2" maxlength="1000">${esc(p ? p.obs_interna : '')}</textarea></div>
        <button class="btn-magic btn-global" id="btn-fp" onclick="salvarPedidoForm()">${window.ic('check')} ${p ? 'Salvar' : 'Anotar pedido'}</button>`);
    fpItens();
}
window.fpOrigem = function(b, o) { PC.form.origem = o; document.querySelectorAll('#fp-origem button').forEach(x => x.classList.toggle('active', x === b)); };
window.fpEntrega = function(v) { PC.form.entrega = v; document.querySelectorAll('#fp-entrega button').forEach(x => x.classList.toggle('active', x.dataset.v === v)); $('fp-end-box').hidden = v !== 'entrega'; };
window.fpBuscar = function() {
    const t = $('fp-busca').value, box = $('fp-achados'); if (!t.trim()) { box.innerHTML = ''; return; }
    const achados = (window.arrayBancoCustos || []).filter(x => x.ativo !== false && window.produtoBate(x, t)).slice(0, 8);
    box.innerHTML = achados.length ? achados.map(x => `<button type="button" class="fp-achado" onclick="fpAdicionar(${x.linha})"><img src="${esc(fotoDe(x) || 'logo.png')}" alt="" onerror="this.src='logo.png'"><span><b>${x.tipo === 'kit' ? '<span class="tag-kit">Kit</span> ' : ''}${esc(x.modelo)}</b><small>${x.preco_venda ? window.fmt(x.preco_venda) : 'sem preço'} · ${x.est_atelie || 0} no Ateliê</small></span>${window.ic('mais')}</button>`).join('')
        : `<p class="texto-ajuda" style="margin:6px 0;">Nada encontrado. Use "Item fora do cadastro".</p>`;
};
window.fpAdicionar = function(pid) {
    const x = produtoPorId(pid), ja = PC.form.itens.find(i => i.produto_id === pid);
    if (ja) ja.qtd++; else PC.form.itens.push({ produto_id: pid, nome: x.modelo, qtd: 1, preco: x.preco_venda || null });
    $('fp-busca').value = ''; $('fp-achados').innerHTML = ''; fpItens();
};
window.fpItemAvulso = async function() {
    const nome = await window.pedirValorMM({ icone: '📝', titulo: 'Item fora do cadastro', texto: 'Ex.: Topo de bolo personalizado', campo: 'text', valor: '', ok: 'Adicionar', validar: v => v.trim().length >= 2 ? null : 'Escreva o nome do item.' });
    if (!nome) return;
    PC.form.itens.push({ produto_id: null, nome: nome.trim().slice(0, 160), qtd: 1, preco: null }); fpItens();
};
function fpItens() {
    const f = PC.form, box = $('fp-itens'); if (!box) return;
    box.innerHTML = f.itens.length ? f.itens.map((i, n) => { const x = i.produto_id && produtoPorId(i.produto_id);
        return `<div class="fp-item"><img src="${esc(fotoDe(x) || 'logo.png')}" alt="" onerror="this.src='logo.png'"><span class="fp-nome">${esc(i.nome)}</span>
            ${f.travado ? `<b>${i.qtd}× ${i.preco > 0 ? window.fmt(i.preco) : 'a combinar'}</b>` : `<div class="pi-qtd"><button type="button" onclick="fpQtd(${n}, -1)">−</button><span>${i.qtd}</span><button type="button" onclick="fpQtd(${n}, 1)">+</button></div>
            <input type="text" class="mask-money fp-preco" inputmode="numeric" value="${i.preco > 0 ? window.fmt(i.preco) : ''}" placeholder="a combinar" aria-label="Preço de ${esc(i.nome)}" oninput="setTimeout(() => fpPreco(${n}, this.value))">`}</div>`; }).join('')
        : '<p class="texto-ajuda" style="margin:8px 0 0;">Busque acima os produtos do pedido.</p>';
    fpTotal();
}
window.fpQtd = function(n, d) { const i = PC.form.itens[n]; if (!i) return; i.qtd += d; if (i.qtd < 1) PC.form.itens.splice(n, 1); fpItens(); };
window.fpPreco = function(n, v) { const i = PC.form.itens[n]; if (i) { i.preco = v ? val(v) : null; fpTotal(); } };
window.fpTotal = function() {
    const f = PC.form, el = $('fp-total'); if (!el) return;
    const sub = f.itens.reduce((s, i) => s + (i.preco || 0) * i.qtd, 0), desc = $('fp-desc').value ? val($('fp-desc').value) : 0, taxa = $('fp-taxa').value ? val($('fp-taxa').value) : 0;
    el.innerHTML = `Total: <b>${window.fmt(Math.max(0, sub - desc + taxa))}</b>${f.itens.some(i => !(i.preco > 0)) ? ' + itens a combinar' : ''}`;
};
window.salvarPedidoForm = async function() {
    const f = PC.form, cliente = $('fp-cliente').value.trim();
    if (!cliente) { $('fp-cliente').focus(); return window.mostrarAlerta('Falta o cliente', 'Escreva o nome do cliente.', 'warning'); }
    if (!f.itens.length) return window.mostrarAlerta('Pedido vazio', 'Coloque pelo menos um produto.', 'warning');
    const dados = { id: f.id, cliente, telefone: $('fp-tel').value.trim(), origem: f.origem, entrega: f.entrega, endereco: $('fp-end').value.trim(), data_entrega: $('fp-data').value,
        pagamento: $('fp-pgto').value, pago: $('fp-pago').checked, status: $('fp-status').value, obs: $('fp-obs').value.trim(), obs_interna: $('fp-interna').value.trim(),
        desconto: $('fp-desc').value ? window.fmtPlanilha(val($('fp-desc').value)) : '0', taxa_entrega: $('fp-taxa').value ? window.fmtPlanilha(val($('fp-taxa').value)) : '0',
        itens: f.itens.map(i => ({ produto_id: i.produto_id, nome: i.nome, qtd: i.qtd, preco: i.preco > 0 ? window.fmtPlanilha(i.preco) : '' })) };
    const b = $('btn-fp'); b.disabled = true;
    try {
        const r = await window.apiAcao('salvar_pedido_cliente', dados);
        window.fecharModalMM(); await window.carregarPedidos();
        window.toastMM(f.id ? 'Pedido salvo' : `Pedido #${r.id} anotado`);
        if (f.id) window.abrirPedido(f.id);
    } catch (e) { window.mostrarAlerta('Não deu para salvar', servidorAntigo(e), 'error'); b.disabled = false; }
};
})();
