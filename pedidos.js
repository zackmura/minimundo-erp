// ==========================================
// 🧾 PEDIDOS DOS CLIENTES (feitos no site ou anotados por você)
// ==========================================
// Cada pedido anda pelas etapas: Novo → Confirmado → Em produção → Pronto → Entregue (ou Cancelado).
// Os produtos aparecem com a foto, o nome e o texto que o cliente viu no site. Cada mudança de etapa, recado
// ou pagamento fica no histórico: o cliente vê tudo no link de acompanhar e, se ativou, recebe aviso no celular.
// Quando quiser, o pedido vira venda (aparece em Vendas, entra no financeiro e pode sair do estoque do Ateliê).
// Pedidos que chegam pelo WhatsApp, Instagram ou feira também podem ser anotados aqui, para controlar tudo junto.
(() => {
const $ = window.$;
const esc = s => window.esc(s);
const val = v => window.limparValorPlanilha(v);
window.PC = { lista: [], filtro: 'abertos', novos: 0, form: null, avisar: null };
const ETAPAS = { novo: ['Novo', 'laranja', '🛎️'], confirmado: ['Confirmado', 'azul', '✅'], producao: ['Em produção', 'roxo', '🖨️'], pronto: ['Pronto', 'verde', '🎁'], entregue: ['Entregue', 'cinza', '💛'], cancelado: ['Cancelado', 'vermelho', '🚫'] };
const PASSOS = ['novo', 'confirmado', 'producao', 'pronto', 'entregue'];
const PROXIMA = { novo: ['confirmado', 'Confirmar'], confirmado: ['producao', 'Começar produção'], producao: ['pronto', 'Marcar pronto'], pronto: ['entregue', 'Marcar entregue'] };
const ABERTOS = ['novo', 'confirmado', 'producao', 'pronto'];
const ROT_HIST = { novo: 'Pedido recebido', confirmado: 'Confirmado', producao: 'Em produção', pronto: 'Pronto', entregue: 'Entregue', cancelado: 'Cancelado', pago: 'Pagamento confirmado', recado: 'Recado para o cliente' };
const ORIGENS = ['WhatsApp', 'Instagram', 'Feira', 'Indicação', 'Loja física'];
const PAGAMENTOS = ['Pix', 'Cartão', 'Dinheiro', 'A combinar'];
const FORMAS_VENDA = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Outro'];
const REDES = { whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', qrcode: 'QR code', outro: 'outro link' };
// Entregou (ou vai entregar) e o cliente ainda não pagou
const aReceber = p => !p.pago && p.status !== 'cancelado' && p.total > 0;
const viaRede = p => p.veio_de ? ` · via ${REDES[p.veio_de] || esc(p.veio_de)}` : '';
const produtoPorId = id => (window.arrayBancoCustos || []).find(p => p.linha === id);
const pedidoPorId = id => PC.lista.find(p => p.id === id);
const paginas = () => (window.PG && window.PG.lista) || [];
const fotoDe = p => ((p && window.fotosDe(p)) || [])[0] || (p && p.tipo === 'kit' ? (p.itens || []).map(i => (window.fotosDe(produtoPorId(i.produto_id)) || [])[0]).find(Boolean) || '' : '');
// Fotos do item como o cliente viu no site (pedido antigo sem foto guardada usa a do cadastro)
const fotosItem = i => (i.fotos && i.fotos.length) ? i.fotos : [fotoDe(i.produto_id && produtoPorId(i.produto_id))].filter(Boolean);
const servidorAntigo = e => e.message === 'Ação não reconhecida.' ? 'O servidor ainda está na versão antiga. Atualize o server.js na alwaysdata.' : e.message;
const partes = s => String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?/);
const dataHora = s => { const m = partes(s); return m ? `${m[3]}/${m[2]}${m[4] ? ` ${m[4]}:${m[5]}` : ''}` : ''; };
const diasAte = s => { const m = partes(s); if (!m) return null; const h = new Date(); h.setHours(0, 0, 0, 0); return Math.round((new Date(+m[1], m[2] - 1, +m[3]) - h) / 864e5); };
const haQuanto = s => { const m = partes(s); if (!m) return ''; const min = Math.round((Date.now() - new Date(+m[1], m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0))) / 60000);
    return min < 1 ? 'agora' : min < 60 ? `há ${min} min` : min < 1440 ? `há ${Math.round(min / 60)} h` : min < 2880 ? 'ontem' : dataHora(s).slice(0, 5); };
const fone = t => { const d = String(t || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, ''); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : t || ''; };
const linkAcompanhar = codigo => new URL(`loja?pedido=${encodeURIComponent(codigo)}`, location.href).href;
const chip = st => `<span class="pc-st ${ETAPAS[st] ? ETAPAS[st][1] : ''}">${ETAPAS[st] ? ETAPAS[st][0] : esc(st)}</span>`;
const cadastro = i => { const x = i.produto_id && produtoPorId(i.produto_id); return x && window.normMM(x.modelo) !== window.normMM(i.nome) ? x.modelo : ''; };
// "Entrega amanhã", "Retirada hoje", "atrasado 2 dias"
function prazo(p) {
    const rot = p.entrega === 'entrega' ? 'Entrega' : 'Retirada', d = diasAte(p.data_entrega);
    if (d === null) return `<span class="pc-prazo">${rot}</span>`;
    if (!ABERTOS.includes(p.status)) return `<span class="pc-prazo">${rot} ${dataHora(p.data_entrega)}</span>`;
    return `<span class="pc-prazo ${d < 0 ? 'atrasado' : d <= 1 ? 'perto' : ''}">${rot} ${d < 0 ? `atrasada ${-d} dia${d < -1 ? 's' : ''}` : d === 0 ? 'hoje' : d === 1 ? 'amanhã' : dataHora(p.data_entrega)}</span>`;
}
const barra = st => `<div class="pc-progresso" aria-hidden="true">${PASSOS.map((s, i) => { const a = PASSOS.indexOf(st); return `<i class="${st === 'cancelado' ? '' : i < a || st === 'entregue' ? 'on' : i === a ? 'agora' : ''}"></i>`; }).join('')}</div>`;
function mosaico(p) {
    const f = [...new Set(p.itens.flatMap(i => fotosItem(i).slice(0, 1)))].slice(0, 4), extra = p.itens.length - f.length;
    if (!f.length) return '<div class="pc-fotos vazio"><img src="logo.png" alt=""></div>';
    return `<div class="pc-fotos n${f.length}">${f.map(u => `<img src="${esc(u)}" alt="" loading="lazy" onerror="this.src='logo.png'">`).join('')}${extra > 0 && f.length >= 4 ? `<span>+${extra}</span>` : ''}</div>`;
}

// ---------- Aviso de pedido novo (menu e notificação) ----------
function pintarAviso() {
    document.querySelectorAll('[data-aviso-pedidos]').forEach(el => { el.textContent = PC.novos || ''; el.hidden = !PC.novos; });
}
window.pintarAvisoPedidos = pintarAviso;
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
        const [r] = await Promise.all([window.apiAcao('listar_pedidos_clientes'), (window.arrayBancoCustos || []).length ? null : window.carregarBancoDeCustos(),
            !paginas().length && window.carregarListaPaginas ? window.carregarListaPaginas() : null,
            PC.cfg ? null : window.apiAcao('obter_config').then(c => { PC.cfg = c.config || {}; }).catch(() => {})]);
        PC.lista = (r.pedidos || []).map(p => ({ ...p, historico: p.historico || [], avisos: p.avisos || 0 })); PC.erro = '';
    } catch (e) { PC.erro = servidorAntigo(e); }
    PC.novos = PC.lista.filter(p => p.status === 'novo').length; pintarAviso();
    window.renderizarPedidos();
};
window.filtroPedidos = function(f) { PC.filtro = f; window.renderizarPedidos(); };
window.renderizarPedidos = function() {
    const box = $('lista-pedidos'); if (!box) return;
    if (PC.erro) { box.innerHTML = `<div class="mm-alerta">${window.ic('alerta')} <span>${esc(PC.erro)}</span></div>`; return; }
    const t = $('pc-busca').value, todos = PC.lista, conta = { abertos: 0, todos: todos.length }, valor = {};
    Object.keys(ETAPAS).forEach(s => { const l = todos.filter(p => p.status === s); conta[s] = l.length; valor[s] = l.reduce((v, p) => v + p.total, 0); });
    conta.abertos = ABERTOS.reduce((n, s) => n + conta[s], 0); conta.receber = todos.filter(aReceber).length;
    // Quadros das etapas em aberto (tocar filtra; tocar de novo volta para todos em aberto)
    $('pc-painel').innerHTML = ABERTOS.map(s => `<button type="button" class="pc-tile ${ETAPAS[s][1]} ${PC.filtro === s ? 'on' : ''}" onclick="filtroPedidos('${PC.filtro === s ? 'abertos' : s}')">
        <span class="pc-tile-ic">${ETAPAS[s][2]}</span><b>${conta[s]}</b><small>${ETAPAS[s][0]}</small><em>${conta[s] ? window.fmt(valor[s]) : '—'}</em></button>`).join('');
    $('pc-filtros').innerHTML = [['abertos', 'Em aberto'], ['receber', '💸 A receber'], ['entregue', 'Entregues'], ['cancelado', 'Cancelados'], ['todos', 'Todos']]
        .map(([f, r]) => `<button class="chip-op ${PC.filtro === f ? 'active' : ''}" onclick="filtroPedidos('${f}')">${r} <em>${conta[f] || ''}</em></button>`).join('');
    const abertos = todos.filter(p => ABERTOS.includes(p.status)), receber = todos.filter(aReceber).reduce((s, p) => s + p.total, 0);
    const semana = abertos.filter(p => { const d = diasAte(p.data_entrega); return d !== null && d <= 7; }).length, atrasados = abertos.filter(p => (diasAte(p.data_entrega) ?? 0) < 0).length;
    $('pc-resumo').innerHTML = [receber ? `<b>${window.fmt(receber)}</b> a receber` : '', semana ? `${semana} para entregar em 7 dias` : '', atrasados ? `<b class="pc-atraso">${atrasados} atrasado${atrasados > 1 ? 's' : ''}</b>` : ''].filter(Boolean).join(' · ');
    const lista = todos.filter(p => (PC.filtro === 'todos' || (PC.filtro === 'abertos' ? ABERTOS.includes(p.status) : PC.filtro === 'receber' ? aReceber(p) : p.status === PC.filtro))
        && window.buscaBate(t, '#' + p.id, p.cliente, p.telefone, p.origem, p.pagina_titulo, p.itens.map(i => i.nome).join(' ')));
    if (!lista.length) {
        box.innerHTML = `<div class="vazio-box">${window.ic('recibo')}<b>${!todos.length ? 'Nenhum pedido ainda' : t.trim() ? `Nada encontrado para "${esc(t)}"` : PC.filtro === 'receber' ? 'Ninguém está devendo 🎉' : 'Nenhum pedido nessa etapa'}</b>
            <span>${!todos.length ? 'Os pedidos feitos nas páginas de venda aparecem aqui. Você também pode anotar pedidos do WhatsApp ou do Instagram.' : ''}</span></div>`;
        return;
    }
    box.innerHTML = lista.map(p => {
        const prox = PROXIMA[p.status], semPreco = p.itens.some(i => !(i.preco > 0));
        return `<div class="pc-card st-${p.status}" onclick="abrirPedido(${p.id})" role="button" tabindex="0">
            <div class="pc-corpo">${mosaico(p)}
                <div class="pc-meio">
                    <div class="pc-topo"><b>#${p.id}</b>${chip(p.status)}<small>${haQuanto(p.criado_em)}</small></div>
                    <div class="pc-cliente">${esc(p.cliente)}</div>
                    <div class="pc-itens">${p.itens.map(i => `<span>${i.qtd}× ${esc(i.nome)}</span>`).join('')}</div>
                    <div class="pc-origem">${p.origem === 'Site' ? `${window.ic('sacola')} ${esc(p.pagina_titulo || 'Site')}${viaRede(p)}` : `${esc(p.origem)}${p.pagina_titulo ? ` · ${esc(p.pagina_titulo)}` : ''}`}</div>
                </div></div>
            ${barra(p.status)}
            <div class="pc-rodape"><b>${window.fmt(p.total)}${semPreco ? ' +' : ''}</b>${p.pago ? '<span class="mm-chip verde">pago</span>' : aReceber(p) && !ABERTOS.includes(p.status) ? '<span class="mm-chip amarelo">falta receber</span>' : ''}${prazo(p)}${p.avisos ? '<span class="pc-sino" title="O cliente recebe aviso no celular">🔔</span>' : ''}${p.venda_pedido_id ? `<span class="mm-chip">venda #${p.venda_pedido_id}</span>` : ''}</div>
            ${prox ? `<div class="pc-botoes" onclick="event.stopPropagation()"><button class="btn-magic btn-pequeno" onclick="mudarEtapa(${p.id}, '${prox[0]}')">${window.ic('check')} ${prox[1]}</button>${p.telefone ? `<a class="btn-limpar" href="${esc(window.linkZap(p.telefone, mensagemEtapa(p, p.status)))}" target="_blank" rel="noopener">${window.ic('zap')} WhatsApp</a>` : ''}</div>` : ''}
        </div>`;
    }).join('');
};

// Mensagem pronta para o cliente, de acordo com a etapa (com o recado, se tiver)
function mensagemEtapa(p, st, recado) {
    const nome = (p.cliente || '').split(' ')[0], link = linkAcompanhar(p.codigo), itens = p.itens.map(i => `• ${i.qtd}× ${i.nome}`).join('\n');
    const m = {
        novo: `Olá, ${nome}! Recebemos o seu pedido *#${p.id}*:\n${itens}\nTotal: ${window.fmt(p.total)}\n\nPodemos confirmar?`,
        confirmado: `Olá, ${nome}! Seu pedido *#${p.id}* está confirmado. 🎉${p.data_entrega ? `\nPrevisão: ${dataHora(p.data_entrega)}.` : ''}\nTotal: ${window.fmt(p.total)}${p.pagamento && p.pagamento !== 'A combinar' && !p.pago ? ` (${p.pagamento})` : ''}`,
        producao: `Olá, ${nome}! Seu pedido *#${p.id}* já está em produção. 🖨️`,
        pronto: `Olá, ${nome}! Seu pedido *#${p.id}* está pronto! 🎁 ${p.entrega === 'entrega' ? 'Vamos combinar a entrega?' : 'Quando fica bom para você retirar?'}`,
        entregue: `Olá, ${nome}! Obrigado pela compra! Esperamos que goste. 💛`,
        cancelado: `Olá, ${nome}! Seu pedido *#${p.id}* foi cancelado. Qualquer dúvida, é só falar.`,
        recado: `Olá, ${nome}! Sobre o seu pedido *#${p.id}*:`
    }[st] || '';
    return `${m}${recado ? `\n\n${recado}` : ''}\n\nAcompanhe aqui: ${link}`;
}

// Lembrete de pagamento (com a chave Pix dos Ajustes das páginas, se tiver)
function mensagemCobranca(p) {
    const nome = (p.cliente || '').split(' ')[0], pix = String((PC.cfg || {}).pagina_pix || '').trim();
    return `Olá, ${nome}! Tudo bem? Passando para lembrar do pagamento do pedido *#${p.id}*: ${window.fmt(p.total)}.${pix ? `\nChave Pix: ${pix}` : ''}\n\nQualquer dúvida, é só falar. Obrigado! 💛`;
}

// ---------- Detalhe ----------
window.abrirPedido = function(id) {
    const p = pedidoPorId(id); if (!p) return;
    const semPreco = p.itens.some(i => !(i.preco > 0)), subtotal = p.itens.reduce((s, i) => s + (i.preco || 0) * i.qtd, 0), prox = PROXIMA[p.status];
    const quando = {}; p.historico.forEach(h => { if (PASSOS.includes(h.status)) quando[h.status] = h.quando; });
    const atual = PASSOS.indexOf(p.status), avisar = PC.avisar && PC.avisar.id === id ? PC.avisar : null; PC.avisar = null;
    const zapLink = (st, recado) => p.telefone ? window.linkZap(p.telefone, mensagemEtapa(p, st, recado)) : '';
    window.abrirModalMM(`<div class="pd-cab"><div><h3 class="modal-title">Pedido #${p.id} ${chip(p.status)}</h3>
            <p>${p.origem === 'Site' ? `Feito no site · ${esc(p.pagina_titulo)}${viaRede(p)}` : `Anotado por ${esc(p.criado_por || '—')} · ${esc(p.origem)}${p.pagina_titulo ? ` · ${esc(p.pagina_titulo)}` : ''}`} · ${dataHora(p.criado_em)}</p></div></div>
        <div class="pd-passos">${PASSOS.map((s, i) => `<button type="button" class="${p.status === 'cancelado' ? '' : i < atual || p.status === 'entregue' ? 'feito' : i === atual ? 'agora' : ''}" onclick="mudarEtapa(${p.id}, '${s}', true)">
            <i>${i < atual || p.status === 'entregue' ? '✓' : ETAPAS[s][2]}</i><b>${ETAPAS[s][0]}</b><small>${quando[s] ? dataHora(quando[s]) : ''}</small></button>`).join('')}</div>
        ${avisar ? `<div class="pd-avisar">${window.ic('check')}<div><b>${avisar.recado ? 'Recado enviado.' : `Agora está "${ETAPAS[avisar.status] ? ETAPAS[avisar.status][0] : ''}".`}</b>
            <span>O cliente já vê no link de acompanhar${p.avisos ? ' e recebe um aviso no celular 🔔' : ''}.${p.telefone ? ' Se quiser, mande também no WhatsApp:' : ''}</span>
            ${p.telefone ? `<a class="btn-zap" href="${esc(zapLink(avisar.recado ? 'recado' : p.status, avisar.recado))}" target="_blank" rel="noopener">${window.ic('zap')} Avisar no WhatsApp</a>` : ''}</div></div>` : ''}
        ${prox ? `<button class="btn-magic btn-global" onclick="mudarEtapa(${p.id}, '${prox[0]}', true)">${window.ic('check')} ${prox[1]}</button>` : ''}
        ${p.status !== 'cancelado' && p.status !== 'entregue' ? `<div class="pd-recado"><label for="pd-recado">Recado para o cliente <small class="rot-dica">aparece no acompanhar${p.avisos ? ' e chega no celular dele' : ''}</small></label>
            <div><textarea id="pd-recado" rows="2" maxlength="600" placeholder="Ex.: Seu kit sai para entrega amanhã à tarde."></textarea><button class="btn-limpar" id="btn-recado" onclick="enviarRecado(${p.id})">${window.ic('check')} Enviar</button></div></div>` : ''}
        <h4 class="pd-tit">Produtos <small>como o cliente viu no site</small></h4>
        <div class="pc-bloco pd-itens">${p.itens.map((i, n) => { const f = fotosItem(i), cad = cadastro(i);
            return `<div class="pd-item"><button type="button" class="pd-foto" ${f.length ? `onclick="fotosDoItem(${p.id}, ${n})"` : 'disabled'}><img src="${esc(f[0] || 'logo.png')}" alt="" loading="lazy" onerror="this.src='logo.png'">${f.length > 1 ? `<span>${f.length}</span>` : ''}</button>
                <div class="pd-info"><b>${i.qtd}× ${esc(i.nome)}</b>${cad ? `<small class="pd-cad">No cadastro: ${esc(cad)}</small>` : ''}
                    ${i.descricao ? `<p class="pd-desc" onclick="this.classList.toggle('aberta')">${esc(i.descricao)}</p>` : ''}
                    ${(i.pecas || []).length ? `<div class="pd-pecas">${i.pecas.map(x => `<span>${x.foto ? `<img src="${esc(x.foto)}" alt="" loading="lazy" onerror="this.remove()">` : ''}${x.qtd}× ${esc(x.nome)}</span>`).join('')}</div>` : ''}</div>
                <div class="pd-preco"><b>${i.preco > 0 ? window.fmt(i.preco * i.qtd) : '<i>a combinar</i>'}</b>${i.preco > 0 && i.qtd > 1 ? `<small>${i.qtd} × ${window.fmt(i.preco)}</small>` : ''}</div></div>`; }).join('')}
            ${p.desconto || p.taxa_entrega ? `<div class="pc-linha"><span>Produtos</span><b>${window.fmt(subtotal)}</b></div>` : ''}
            ${p.desconto ? `<div class="pc-linha"><span>Desconto</span><b>− ${window.fmt(p.desconto)}</b></div>` : ''}${p.taxa_entrega ? `<div class="pc-linha"><span>Entrega</span><b>${window.fmt(p.taxa_entrega)}</b></div>` : ''}
            <div class="pc-total"><span>Total${semPreco ? ' <small>(+ itens a combinar)</small>' : ''}</span><b>${window.fmt(p.total)}</b></div>
            ${p.pago ? `<div class="pd-pgto ok"><span>✅ <b>Pago</b>${p.pagamento && p.pagamento !== 'A combinar' ? ` · ${esc(p.pagamento)}` : ''}</span><a onclick="marcarPago(${p.id}, false)">desfazer</a></div>`
                : p.status === 'cancelado' ? '' : `<div class="pd-pgto"><span>⏳ <b>Falta receber ${window.fmt(p.total)}</b>${p.pagamento ? ` · ${esc(p.pagamento)}` : ''}</span>
                <div><button class="btn-magic btn-pequeno" onclick="marcarPago(${p.id}, true)">${window.ic('check')} Recebi o pagamento</button>${p.telefone ? `<a class="btn-limpar" href="${esc(window.linkZap(p.telefone, mensagemCobranca(p)))}" target="_blank" rel="noopener">${window.ic('zap')} Cobrar no WhatsApp</a>` : ''}</div></div>`}
        </div>
        <h4 class="pd-tit">Cliente</h4>
        <div class="pc-bloco">
            <div class="pc-linha"><span>Nome</span><b>${esc(p.cliente)}</b></div>
            ${p.telefone ? `<div class="pc-linha"><span>WhatsApp</span><b><a href="${esc(window.linkZap(p.telefone, `Olá, ${(p.cliente || '').split(' ')[0]}!`))}" target="_blank" rel="noopener">${esc(fone(p.telefone))}</a></b></div>` : ''}
            <div class="pc-linha"><span>Recebimento</span><b>${prazo(p)}${p.data_entrega && /hoje|amanhã|atrasada/.test(prazo(p)) ? ` <small class="rot-dica">${dataHora(p.data_entrega)}</small>` : ''}</b></div>
            ${p.entrega === 'entrega' && p.endereco ? `<div class="pc-linha col"><span>Endereço</span><b><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.endereco)}" target="_blank" rel="noopener">${esc(p.endereco)}</a></b></div>` : ''}
            ${p.obs ? `<div class="pc-linha col"><span>Recado do cliente</span><b>${esc(p.obs)}</b></div>` : ''}
            ${p.obs_interna ? `<div class="pc-linha col"><span>Anotação interna</span><b>${esc(p.obs_interna)}</b></div>` : ''}
            <div class="pc-linha"><span>Avisos no celular</span><b>${p.avisos ? '🔔 Ligados' : '<small class="rot-dica">o cliente não ativou</small>'}</b></div>
        </div>
        <h4 class="pd-tit">Histórico <small>o cliente vê as etapas e os recados</small></h4>
        <ol class="pd-hist">${p.historico.slice().reverse().map(h => `<li class="${h.status === 'pago' ? 'verde' : ETAPAS[h.status] ? ETAPAS[h.status][1] : ''}"><span><b>${ROT_HIST[h.status] || esc(h.status)}</b><small>${dataHora(h.quando)}${h.por ? ` · ${h.por === 'site' ? 'pelo site' : esc(h.por)}` : ''}</small>
            ${h.recado ? `<em>💬 ${esc(h.recado)} <a onclick="apagarRecado(${h.id}, ${p.id})">apagar</a></em>` : ''}</span></li>`).join('') || '<li><span><small>Sem histórico.</small></span></li>'}</ol>
        ${p.venda_pedido_id ? `<p class="pc-venda ok">${window.ic('check')} Lançado nas Vendas: <a onclick="fecharModalMM(); verVenda(${p.venda_pedido_id})">venda #${p.venda_pedido_id}</a>${p.pago ? '' : ' (a receber)'}</p>`
            : `<button class="btn-magic btn-global" onclick="lancarVenda(${p.id})">${window.ic('carrinho')} Lançar como venda</button><p class="texto-ajuda" style="margin:-4px 0 12px;">Aparece em Vendas e no financeiro. Pode lançar ao entregar, mesmo que o cliente vá pagar depois.</p>`}
        <div class="pc-acoes">
            ${p.telefone ? `<a class="btn-limpar" href="${esc(zapLink(p.status))}" target="_blank" rel="noopener">${window.ic('zap')} Mensagem: ${ETAPAS[p.status][0].toLowerCase()}</a>` : ''}
            <button class="btn-limpar" onclick="copiarTexto('${esc(linkAcompanhar(p.codigo))}', 'Link para o cliente acompanhar copiado!')">${window.ic('copiar')} Copiar link de acompanhar</button>
            <a class="btn-limpar" href="${esc(linkAcompanhar(p.codigo))}" target="_blank" rel="noopener">${window.ic('olho')} Ver como o cliente vê</a>
            <button class="btn-limpar" onclick="editarPedido(${p.id})">${window.ic('lapis')} Editar</button>
            ${p.status !== 'cancelado' ? `<button class="btn-limpar perigo" onclick="mudarEtapa(${p.id}, 'cancelado', true)">${window.ic('x')} Cancelar pedido</button>` : ''}
            ${p.venda_pedido_id ? '' : `<button class="btn-limpar perigo" onclick="excluirPedido(${p.id})">${window.ic('lixo')} Excluir</button>`}
        </div>`);
};
window.fotosDoItem = function(id, n) { const p = pedidoPorId(id), i = p && p.itens[n]; if (i && window.abrirGaleria) window.abrirGaleria({ fotos: fotosItem(i), indice: 0, titulo: i.nome }); };
// Recarrega a lista (para vir o histórico novo) e reabre o pedido
async function atualizarEAbrir(id) { await window.carregarPedidos(); window.abrirPedido(id); }
window.mudarEtapa = async function(id, status, reabrir) {
    const p = pedidoPorId(id); if (!p || p.status === status) return;
    if (status === 'cancelado' && !await window.confirmarMM({ tipo: 'perigo', icone: '🚫', titulo: `Cancelar o pedido #${id}?`, texto: 'Ele continua na lista, em "Cancelados". O cliente vê que foi cancelado.', ok: 'Cancelar pedido', cancelar: 'Voltar' })) { if (reabrir) window.abrirPedido(id); return; }
    try {
        await window.apiAcao('status_pedido_cliente', { id, status });
        p.status = status; PC.novos = PC.lista.filter(x => x.status === 'novo').length; pintarAviso();
        PC.avisar = { id, status };
        if (reabrir) await atualizarEAbrir(id); else { window.renderizarPedidos(); window.carregarPedidos(); }
        window.toastMM(`Pedido #${id}: ${ETAPAS[status][0]}${p.avisos ? ' · cliente avisado no celular' : ''}`);
        // Entregue e ainda não lançado: oferece lançar a venda
        if (status === 'entregue' && !p.venda_pedido_id && await window.confirmarMM({ icone: '🛒', titulo: 'Lançar a venda agora?', texto: `O pedido #${id} foi entregue. Lançar nas Vendas (entra no financeiro)?`, ok: 'Lançar venda', cancelar: 'Depois' })) window.lancarVenda(id);
    } catch (e) { window.mostrarAlerta('Não deu para mudar', servidorAntigo(e), 'error'); }
};
window.enviarRecado = async function(id) {
    const recado = $('pd-recado').value.trim();
    if (recado.length < 2) { $('pd-recado').focus(); return window.toastMM('Escreva o recado para o cliente'); }
    const b = $('btn-recado'); b.disabled = true;
    try {
        await window.apiAcao('status_pedido_cliente', { id, recado });
        PC.avisar = { id, recado }; await atualizarEAbrir(id); window.toastMM('Recado enviado');
    } catch (e) { window.mostrarAlerta('Não deu para enviar', servidorAntigo(e), 'error'); b.disabled = false; }
};
window.apagarRecado = async function(hid, id) {
    if (!await window.confirmarMM({ tipo: 'perigo', icone: '💬', titulo: 'Apagar este recado?', texto: 'Ele some do acompanhar do cliente. (Se já chegou no celular dele, lá continua.)', ok: 'Apagar' })) return window.abrirPedido(id);
    try { await window.apiAcao('apagar_recado_pedido', { id: hid }); await window.carregarPedidos(); window.abrirPedido(id); window.toastMM('Recado apagado'); }
    catch (e) { window.mostrarAlerta('Não deu para apagar', servidorAntigo(e), 'error'); }
};
window.marcarPago = async function(id, pago) {
    const p = pedidoPorId(id); if (!p) return;
    try { await window.apiAcao('status_pedido_cliente', { id, pago }); p.pago = pago; window.toastMM(pago ? 'Marcado como pago' : 'Marcado como não pago'); await atualizarEAbrir(id); }
    catch (e) { window.mostrarAlerta('Não deu para salvar', servidorAntigo(e), 'error'); }
};
window.excluirPedido = async function(id) {
    if (!await window.confirmarMM({ tipo: 'perigo', icone: '🗑️', titulo: `Excluir o pedido #${id}?`, texto: 'Some da lista de vez (e o link de acompanhar para de abrir). Se o cliente desistiu, prefira "Cancelar pedido".', ok: 'Excluir' })) return;
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
        <div class="lv-opcoes" role="radiogroup" aria-label="O cliente já pagou?">
            <label class="lv-op"><input type="radio" name="lv-pago" value="0" ${p.pago ? '' : 'checked'}><span><i>⏳</i><b>Vai pagar depois</b><small>Fica "Pendente" em Vendas e em "A receber" até você marcar que recebeu</small></span></label>
            <label class="lv-op"><input type="radio" name="lv-pago" value="1" ${p.pago ? 'checked' : ''}><span><i>✅</i><b>Já pagou</b><small>Entra como recebido</small></span></label>
        </div>
        <div class="input-group"><label for="lv-forma">Forma de pagamento <small class="rot-dica">a combinada, se ainda não pagou</small></label><select id="lv-forma">${FORMAS_VENDA.map(f => `<option ${f === forma ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
        <div class="input-group"><label for="lv-canal">Canal</label><input type="text" id="lv-canal" value="${esc(p.origem === 'Site' ? 'Site' : p.origem)}" maxlength="100"></div>
        <label class="chave" style="margin:0 0 6px;"><input type="checkbox" id="lv-estoque" ${daParaTirar ? 'checked' : ''}> Tirar as peças do estoque do Ateliê</label>
        <p class="texto-ajuda" style="margin:0 0 14px;">${daParaTirar ? 'Tem tudo no Ateliê.' : 'Falta peça no Ateliê para tirar tudo. Monte os kits ou registre a produção antes, ou lance sem tirar do estoque.'}</p>
        <button class="btn-magic btn-global" id="btn-lv" onclick="confirmarLancarVenda(${p.id})">${window.ic('check')} Lançar venda</button>`);
};
window.confirmarLancarVenda = async function(id) {
    const b = $('btn-lv'); b.disabled = true;
    try {
        const pago = (document.querySelector('input[name="lv-pago"]:checked') || {}).value === '1';
        const r = await window.apiAcao('lancar_venda_pedido', { id, forma_pgto: $('lv-forma').value, plataforma: $('lv-canal').value.trim(), pago, baixar_estoque: $('lv-estoque').checked });
        window.fecharModalMM(); window.carregarPedidos(); window.carregarBancoDeCustos();
        window.mostrarAlerta('Venda lançada!', pago ? `O pedido #${id} agora está em Vendas (pedido #${r.venda}), já pago.`
            : `O pedido #${id} está em Vendas (pedido #${r.venda}) como pendente. Quando o cliente pagar, abra o pedido e toque em "Recebi o pagamento" (ou marque como pago em Vendas: os dois ficam iguais).`, 'success');
    } catch (e) { window.mostrarAlerta('Não deu para lançar', servidorAntigo(e), 'error'); b.disabled = false; }
};

// ---------- Anotar ou editar pedido ----------
// Escolhendo uma página, os produtos entram com o nome, o preço e as fotos de lá (igual ao que o cliente vê no site)
window.novoPedido = () => abrirFormPedido(null);
window.editarPedido = id => abrirFormPedido(pedidoPorId(id));
const itemDaPagina = (pg, pid) => pg && (pg.itens || []).find(i => i.produto_id === pid);
const nomeNaPagina = (it, x) => (it && it.nome) || (x ? x.modelo : 'Produto');
const precoNaPagina = (it, x) => it && it.preco > 0 ? it.preco : (x && x.preco_venda) || null;
function abrirFormPedido(p) {
    const doSite = !!(p && p.origem === 'Site');
    PC.form = { id: p ? p.id : 0, travado: !!(p && p.venda_pedido_id), doSite, entrega: p ? p.entrega : 'retirar', origem: p ? p.origem : 'WhatsApp',
        pagina: p ? p.pagina_id || 0 : (paginas().find(g => g.ativa && (g.itens || []).length) || {}).id || 0, itens: p ? p.itens.map(i => ({ ...i })) : [] };
    const f = PC.form, origens = f.origem && !ORIGENS.includes(f.origem) ? [f.origem, ...ORIGENS] : ORIGENS;
    const pgs = paginas().filter(g => g.ativa || g.id === f.pagina);
    window.abrirModalMM(`<h3 class="modal-title">${window.ic(p ? 'lapis' : 'mais')} ${p ? `Editar o pedido #${p.id}` : 'Anotar pedido'}</h3>
        ${p ? '' : '<p class="texto-ajuda" style="margin-top:0;">Para pedidos que chegaram pelo WhatsApp, Instagram, feira… e ficarem junto com os do site.</p>'}
        <div class="row"><div class="col"><div class="input-group"><label for="fp-cliente">Cliente *</label><input type="text" id="fp-cliente" value="${esc(p ? p.cliente : '')}" maxlength="120" autocomplete="off"></div></div>
            <div class="col"><div class="input-group"><label for="fp-tel">WhatsApp</label><input type="tel" id="fp-tel" value="${esc(p ? fone(p.telefone) : '')}" maxlength="20" placeholder="(11) 98888-7777"></div></div></div>
        ${doSite ? '' : `<div class="input-group"><label>Veio por</label><div class="chips-op" id="fp-origem">${origens.map(o => `<button type="button" class="chip-op ${o === f.origem ? 'active' : ''}" data-o="${esc(o)}" onclick="fpOrigem(this, this.dataset.o)">${esc(o)}</button>`).join('')}</div></div>`}
        ${doSite ? `<p class="texto-ajuda" style="margin:-4px 0 12px;">Pedido feito no site, na página <b>${esc(p.pagina_titulo)}</b>.</p>` : pgs.length ? `<div class="input-group"><label>Produtos de qual página? <small class="rot-dica">entram com o nome, o texto e as fotos de lá</small></label>
            <div class="chips-op" id="fp-pagina"><button type="button" class="chip-op ${!f.pagina ? 'active' : ''}" data-p="0" onclick="fpPagina(0)">Do cadastro</button>${pgs.map(g => `<button type="button" class="chip-op ${g.id === f.pagina ? 'active' : ''}" data-p="${g.id}" onclick="fpPagina(${g.id})">${esc(g.titulo)}</button>`).join('')}</div></div>` : ''}
        <div class="input-group"><label>Produtos ${f.travado ? '<small class="rot-dica">já lançado nas Vendas: produtos e valores travados</small>' : ''}</label>
            ${f.travado ? '' : `<div class="busca-ic"><svg class="ic"><use href="#i-busca"/></svg><input type="search" id="fp-busca" placeholder="Buscar produto para pôr no pedido…" autocomplete="off" oninput="fpBuscar()"></div><div id="fp-achados" class="fp-achados"></div>`}
            <div id="fp-itens"></div>
            ${f.travado ? '' : `<button type="button" class="btn-limpar" style="margin-top:8px;" onclick="fpItemAvulso()">${window.ic('mais')} Item fora do cadastro</button>`}</div>
        <div class="row"><div class="col"><div class="input-group"><label for="fp-desc">Desconto</label><input type="text" id="fp-desc" class="mask-money" inputmode="numeric" value="${p && p.desconto ? window.fmt(p.desconto) : ''}" placeholder="R$ 0,00" oninput="setTimeout(fpTotal)" ${f.travado ? 'disabled' : ''}></div></div>
            <div class="col"><div class="input-group"><label for="fp-taxa">Taxa de entrega</label><input type="text" id="fp-taxa" class="mask-money" inputmode="numeric" value="${p && p.taxa_entrega ? window.fmt(p.taxa_entrega) : ''}" placeholder="R$ 0,00" oninput="setTimeout(fpTotal)" ${f.travado ? 'disabled' : ''}></div></div></div>
        <p class="fp-total" id="fp-total"></p>
        <div class="input-group"><label>Recebimento</label><div class="seg-mini largo" id="fp-entrega"><button type="button" data-v="retirar" class="${f.entrega === 'retirar' ? 'active' : ''}" onclick="fpEntrega('retirar')">Retirada</button><button type="button" data-v="entrega" class="${f.entrega === 'entrega' ? 'active' : ''}" onclick="fpEntrega('entrega')">Entrega</button></div></div>
        <div class="input-group" id="fp-end-box" ${f.entrega === 'entrega' ? '' : 'hidden'}><label for="fp-end">Endereço</label><textarea id="fp-end" rows="2" maxlength="500">${esc(p ? p.endereco : '')}</textarea></div>
        <div class="row"><div class="col"><div class="input-group"><label for="fp-data">Data de entrega <small class="rot-dica">o cliente vê como previsão</small></label><input type="date" id="fp-data" value="${esc(p ? p.data_entrega : '')}"></div></div>
            <div class="col"><div class="input-group"><label for="fp-pgto">Pagamento</label><select id="fp-pgto">${[...new Set([...(p && p.pagamento ? [p.pagamento] : []), ...PAGAMENTOS])].map(x => `<option ${p && p.pagamento === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div></div></div>
        <div class="row"><div class="col"><div class="input-group"><label for="fp-status">Etapa</label><select id="fp-status">${Object.entries(ETAPAS).map(([k, v]) => `<option value="${k}" ${(p ? p.status : 'confirmado') === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div></div>
            <div class="col" style="display:flex;align-items:center;"><label class="chave" style="margin:10px 0 0;"><input type="checkbox" id="fp-pago" ${p && p.pago ? 'checked' : ''}> Já foi pago</label></div></div>
        <div class="input-group"><label for="fp-obs">Recado do cliente</label><textarea id="fp-obs" rows="2" maxlength="1000" placeholder="Nome para personalizar, cores…">${esc(p ? p.obs : '')}</textarea></div>
        <div class="input-group"><label for="fp-interna">Anotação interna <small class="rot-dica">o cliente não vê</small></label><textarea id="fp-interna" rows="2" maxlength="1000">${esc(p ? p.obs_interna : '')}</textarea></div>
        <button class="btn-magic btn-global" id="btn-fp" onclick="salvarPedidoForm()">${window.ic('check')} ${p ? 'Salvar' : 'Anotar pedido'}</button>`);
    fpItens(); fpBuscar();
}
window.fpOrigem = function(b, o) { PC.form.origem = o; document.querySelectorAll('#fp-origem button').forEach(x => x.classList.toggle('active', x === b)); };
window.fpPagina = function(id) { PC.form.pagina = id; document.querySelectorAll('#fp-pagina button').forEach(x => x.classList.toggle('active', +x.dataset.p === id)); fpBuscar(); };
window.fpEntrega = function(v) { PC.form.entrega = v; document.querySelectorAll('#fp-entrega button').forEach(x => x.classList.toggle('active', x.dataset.v === v)); $('fp-end-box').hidden = v !== 'entrega'; };
// Com página escolhida e busca vazia, mostra os produtos da página; buscando, os da página vêm primeiro
window.fpBuscar = function() {
    const box = $('fp-achados'); if (!box) return;
    const t = $('fp-busca').value, pg = paginas().find(g => g.id === PC.form.pagina), naPagina = pg ? (pg.itens || []).map(i => ({ it: i, x: produtoPorId(i.produto_id) })).filter(o => o.x) : [];
    const daPagina = naPagina.filter(o => !t.trim() || window.produtoBate(o.x, t) || window.buscaBate(t, o.it.nome));
    const fora = t.trim() ? (window.arrayBancoCustos || []).filter(x => x.ativo !== false && !naPagina.some(o => o.x === x) && window.produtoBate(x, t)).slice(0, 8) : [];
    if (!t.trim() && !pg) { box.innerHTML = ''; return; }
    const linha = (x, it) => `<button type="button" class="fp-achado" onclick="fpAdicionar(${x.linha})"><img src="${esc(fotoDe(x) || 'logo.png')}" alt="" onerror="this.src='logo.png'">
        <span><b>${x.tipo === 'kit' ? '<span class="tag-kit">Kit</span> ' : ''}${esc(nomeNaPagina(it, x))}</b><small>${precoNaPagina(it, x) ? window.fmt(precoNaPagina(it, x)) : 'sem preço'} · ${x.est_atelie || 0} no Ateliê${it && it.nome && it.nome !== x.modelo ? ` · ${esc(x.modelo)}` : ''}</small></span>${window.ic('mais')}</button>`;
    box.innerHTML = (daPagina.length ? `${pg ? `<small class="fp-grupo">Na página ${esc(pg.titulo)}</small>` : ''}<div class="fp-rolagem">${daPagina.map(o => linha(o.x, o.it)).join('')}</div>` : '')
        + (fora.length ? `${pg ? '<small class="fp-grupo">Fora da página (nome do cadastro)</small>' : ''}${fora.map(x => linha(x, null)).join('')}` : '')
        || `<p class="texto-ajuda" style="margin:6px 0;">${t.trim() ? 'Nada encontrado. Use "Item fora do cadastro".' : 'Esta página ainda não tem produtos.'}</p>`;
};
window.fpAdicionar = function(pid) {
    const x = produtoPorId(pid), ja = PC.form.itens.find(i => i.produto_id === pid), it = itemDaPagina(paginas().find(g => g.id === PC.form.pagina), pid);
    if (ja) ja.qtd++; else PC.form.itens.push({ produto_id: pid, nome: nomeNaPagina(it, x), qtd: 1, preco: precoNaPagina(it, x), fotos: [] });
    $('fp-busca').value = ''; fpBuscar(); fpItens();
};
window.fpItemAvulso = async function() {
    const nome = await window.pedirValorMM({ icone: '📝', titulo: 'Item fora do cadastro', texto: 'Ex.: Topo de bolo personalizado', campo: 'text', valor: '', ok: 'Adicionar', validar: v => v.trim().length >= 2 ? null : 'Escreva o nome do item.' });
    if (!nome) return;
    PC.form.itens.push({ produto_id: null, nome: nome.trim().slice(0, 160), qtd: 1, preco: null, fotos: [] }); fpItens();
};
function fpItens() {
    const f = PC.form, box = $('fp-itens'); if (!box) return;
    box.innerHTML = f.itens.length ? f.itens.map((i, n) => `<div class="fp-item"><img src="${esc(fotosItem(i)[0] || 'logo.png')}" alt="" onerror="this.src='logo.png'"><span class="fp-nome">${esc(i.nome)}</span>
            ${f.travado ? `<b>${i.qtd}× ${i.preco > 0 ? window.fmt(i.preco) : 'a combinar'}</b>` : `<div class="pi-qtd"><button type="button" onclick="fpQtd(${n}, -1)">−</button><span>${i.qtd}</span><button type="button" onclick="fpQtd(${n}, 1)">+</button></div>
            <input type="text" class="mask-money fp-preco" inputmode="numeric" value="${i.preco > 0 ? window.fmt(i.preco) : ''}" placeholder="a combinar" aria-label="Preço de ${esc(i.nome)}" oninput="setTimeout(() => fpPreco(${n}, this.value))">`}</div>`).join('')
        : '<p class="texto-ajuda" style="margin:8px 0 0;">Toque nos produtos acima para pôr no pedido.</p>';
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
    if (!f.doSite) dados.pagina_id = f.pagina || 0;
    const b = $('btn-fp'); b.disabled = true;
    try {
        const r = await window.apiAcao('salvar_pedido_cliente', dados);
        window.fecharModalMM(); await window.carregarPedidos();
        window.toastMM(f.id ? 'Pedido salvo' : `Pedido #${r.id} anotado`);
        window.abrirPedido(f.id || r.id);
    } catch (e) { window.mostrarAlerta('Não deu para salvar', servidorAntigo(e), 'error'); b.disabled = false; }
};
})();
