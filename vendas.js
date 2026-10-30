// ==========================================
// 🛒 VENDAS: NOVA VENDA (PDV) E HISTÓRICO DE PEDIDOS
// ==========================================
// Um pedido pode ter vários produtos. No servidor cada produto continua sendo uma linha da tabela
// "vendas" (ligadas pelo pedido_id), então relatórios, recibos em lote e vendas antigas seguem iguais.
(() => {
const $ = window.$;
const esc = s => window.esc(s);
const val = v => window.limparValorPlanilha(v);
const n2 = v => Math.round((parseFloat(v) || 0) * 100) / 100;
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const FORMAS = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Pela plataforma', 'Outro'];

// Datas: as vendas chegam como "29/10/2026"; o resto do sistema trabalha com "2026-10-29"
const isoDe = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
window.isoHojeMM = () => isoDe(new Date());
window.brParaIsoMM = s => { const t = String(s || ''); const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/); if (m) return `${m[3]}-${m[2]}-${m[1]}`; const m2 = t.match(/^\d{4}-\d{2}-\d{2}/); return m2 ? m2[0] : ''; };
window.isoParaBrMM = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : String(s || ''); };
const diaExtenso = iso => { const d = new Date(iso + 'T12:00:00'); if (isNaN(d)) return iso; const t = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }); return t.charAt(0).toUpperCase() + t.slice(1); };

window.PDV = { itens: [], canal: 'Venda direta', forma: 'Pix', status: 'Pago', tipo: 'todos', contatos: {}, canaisUsados: [] };
window.HV = { periodo: 'mes', limite: 30, pedidos: [], filtrados: [] };

const produtoPorId = id => (window.arrayBancoCustos || []).find(p => p.linha === id);
const fotoDe = p => String((p && (p.foto || p.foto_catalogo)) || '').split(',')[0].trim();
const custoDe = p => p ? val(p.custo_total) : 0;
// Preço que entra no carrinho: o preço de venda cadastrado; sem ele, custo × multiplicador dos Ajustes (arredondado pra cima)
window.precoVendaDe = function(p) {
    if (!p) return 0;
    if (p.preco_venda) return p.preco_venda;
    const mult = parseFloat(String((window.configMM || {}).multiplicador_venda || '3').replace(',', '.')) || 3;
    const c = custoDe(p); return c > 0 ? Math.ceil(c * mult) : 0;
};
const plataformaDe = nome => (window.arrayPlataformas || []).find(p => norm(p.nome) === norm(nome));
const taxaDe = (canal, total) => { const p = plataformaDe(canal); return p && total > 0 ? n2(total * (parseFloat(p.pct) || 0) / 100 + (parseFloat(p.fixa) || 0)) : 0; };

// ---------- SUB-ABAS ----------
window.abaVendas = function(qual) {
    document.querySelectorAll('#vendas-abas button').forEach(b => b.classList.toggle('active', b.dataset.aba === qual));
    $('vendas-nova').hidden = qual !== 'nova'; $('vendas-historico').hidden = qual !== 'historico';
    if (qual === 'historico') window.filtrarVendas();
    window.atualizarBarraPDV();
};

// ---------- LISTAS (clientes, canais) ----------
window.carregarOpcoesVenda = async function() {
    try {
        const r = await window.apiAcao('listar_opcoes_venda');
        PDV.contatos = r.contatos || {}; PDV.canaisUsados = r.plataformas || [];
        $('lista-clientes-venda').innerHTML = r.clientes.map(n => `<option value="${esc(n)}">`).join('');
        $('lista-produtos-todos').innerHTML = r.produtos.map(n => `<option value="${esc(n)}">`).join('');
        $('lista-plataformas-venda').innerHTML = r.plataformas.map(n => `<option value="${esc(n)}">`).join('');
    } catch (e) { /* sem as sugestões a venda continua funcionando */ }
    window.montarCanaisPDV();
};
window.montarListaProdutosVenda = () => window.renderizarCatalogoPDV(); // nome antigo, chamado por outras telas

window.montarCanaisPDV = function() {
    const vistos = new Set(), canais = [];
    ['Venda direta', ...(window.arrayPlataformas || []).map(p => p.nome), ...PDV.canaisUsados].forEach(c => { const k = norm(c).trim(); if (c && k && !vistos.has(k)) { vistos.add(k); canais.push(String(c).trim()); } });
    const lista = canais.slice(0, 8); if (!lista.some(c => norm(c) === norm(PDV.canal))) lista.push(PDV.canal);
    $('pdv-canais').innerHTML = lista.map(c => `<button type="button" class="chip-op ${norm(c) === norm(PDV.canal) ? 'active' : ''}" onclick="selecionarCanalPDV(this.dataset.c)" data-c="${esc(c)}">${esc(c)}${plataformaDe(c) && (plataformaDe(c).pct || plataformaDe(c).fixa) ? ' <small>taxa</small>' : ''}</button>`).join('')
        + `<button type="button" class="chip-op" onclick="outroCanalPDV()">+ Outro</button>`;
    $('pdv-formas').innerHTML = FORMAS.map(f => `<button type="button" class="chip-op ${f === PDV.forma ? 'active' : ''}" onclick="selecionarFormaPDV('${f}')">${f}</button>`).join('');
    document.querySelectorAll('#pdv-status button').forEach(b => b.classList.toggle('active', b.dataset.s === PDV.status));
};
window.selecionarCanalPDV = function(c) {
    PDV.canal = c; const p = plataformaDe(c), temTaxa = p && (p.pct || p.fixa);
    if (temTaxa && ['Pix', 'Dinheiro'].includes(PDV.forma)) PDV.forma = 'Pela plataforma';
    if (!temTaxa && PDV.forma === 'Pela plataforma') PDV.forma = 'Pix';
    window.montarCanaisPDV(); window.renderizarCarrinhoPDV();
};
window.outroCanalPDV = async function() {
    const c = await window.pedirValorMM({ icone: '📱', titulo: 'Qual foi o canal da venda?', texto: 'Ex.: Instagram, feira, indicação…', campo: 'text', valor: '', ok: 'Usar', validar: v => v.trim() ? null : 'Digite o nome do canal.' });
    if (c) window.selecionarCanalPDV(c.trim());
};
window.selecionarFormaPDV = function(f) { PDV.forma = f; window.montarCanaisPDV(); };
window.selecionarStatusPDV = function(s) { PDV.status = s; window.montarCanaisPDV(); window.renderizarCarrinhoPDV(); };
window.preencherTelefonePDV = function() {
    const c = $('pdv-cliente').value.trim(), tel = PDV.contatos[c];
    if (tel && !$('pdv-telefone').value.trim()) $('pdv-telefone').value = tel;
};

// ---------- CATÁLOGO (escolher produtos) ----------
window.filtroTipoPDV = function(t) { PDV.tipo = t; document.querySelectorAll('#pdv-tipos button').forEach(b => b.classList.toggle('active', b.dataset.t === t)); window.renderizarCatalogoPDV(); };
window.renderizarCatalogoPDV = function() {
    const grade = $('pdv-grade'); if (!grade) return;
    const t = norm($('pdv-busca').value), todos = $('pdv-sem-estoque').checked;
    const ativos = (window.arrayBancoCustos || []).filter(p => p.ativo !== false);
    const comEstoque = ativos.filter(p => (p.est_atelie || 0) > 0);
    const lista = (todos ? ativos : comEstoque).filter(p => (PDV.tipo === 'todos' || p.tipo === PDV.tipo) && (!t || norm(p.modelo).includes(t) || norm(p.categoria).includes(t)));
    $('pdv-info').innerText = ativos.length ? (todos ? `${ativos.length} produtos` : `${comEstoque.length} com estoque`) : '';
    if (!lista.length) {
        grade.innerHTML = `<div class="vazio-box">${window.ic('busca')}<b>${!ativos.length ? 'Nenhum produto cadastrado' : t ? `Nada encontrado para "${esc($('pdv-busca').value)}"` : 'Nenhum produto com estoque no Ateliê'}</b>
            <span>${!ativos.length ? 'Cadastre em <a onclick="switchTab(\'precificar\')">Precificar</a>.' : todos ? '' : 'Ligue <b>Mostrar também produtos sem estoque</b> para vender sob encomenda.'}</span></div>`;
        return;
    }
    grade.innerHTML = lista.map(p => {
        const noCar = PDV.itens.find(i => i.produto_id === p.linha), est = p.est_atelie || 0, preco = window.precoVendaDe(p);
        return `<button type="button" class="pdv-prod ${noCar ? 'no-carrinho' : ''} ${est > 0 ? '' : 'sem'}" onclick="addPDV(${p.linha})">
            ${noCar ? `<span class="pp-badge">${noCar.qtd}</span>` : ''}
            <img src="${esc(fotoDe(p) || 'logo.png')}" onerror="this.src='logo.png'" alt="">
            <b>${esc(p.modelo)}</b>
            <span class="pp-linha"><span class="pp-preco">${preco ? window.fmt(preco) : 'sem preço'}</span><span class="pp-est ${est > 0 ? '' : 'zero'}">${p.tipo === 'kit' ? 'Kit · ' : ''}${est > 0 ? `${est} no Ateliê` : 'sem estoque'}</span></span>
        </button>`;
    }).join('');
};

// ---------- CARRINHO ----------
window.addPDV = function(id) {
    const p = produtoPorId(id); if (!p) return;
    const ja = PDV.itens.find(i => i.produto_id === id);
    if (ja) ja.qtd++; else PDV.itens.push({ produto_id: id, nome: p.modelo, qtd: 1, unit: window.precoVendaDe(p), sugerido: !p.preco_venda });
    window.renderizarCarrinhoPDV(); window.renderizarCatalogoPDV();
    window.toastMM(`${p.modelo} no carrinho`);
};
window.qtdPDV = function(i, d) { const it = PDV.itens[i]; if (!it) return; it.qtd = Math.max(1, it.qtd + d); window.renderizarCarrinhoPDV(); window.renderizarCatalogoPDV(); };
window.qtdPDVSet = function(i, v) { const it = PDV.itens[i]; if (!it) return; it.qtd = Math.max(1, parseInt(v) || 1); window.renderizarCarrinhoPDV(); window.renderizarCatalogoPDV(); };
window.precoPDV = function(i, v) { const it = PDV.itens[i]; if (!it) return; it.unit = val(v); it.sugerido = false; window.renderizarTotaisPDV(); const el = document.querySelector(`[data-pi-total="${i}"]`); if (el) el.innerText = window.fmt(it.unit * it.qtd); };
window.tirarPDV = function(i) { PDV.itens.splice(i, 1); window.renderizarCarrinhoPDV(); window.renderizarCatalogoPDV(); };
window.limparPDV = async function() {
    if (PDV.itens.length && !await window.confirmarMM({ icone: '🧹', titulo: 'Esvaziar o carrinho?', texto: 'Os produtos escolhidos saem do carrinho.', ok: 'Esvaziar', tipo: 'perigo' })) return;
    PDV.itens = []; $('pdv-desconto').value = ''; window.renderizarCarrinhoPDV(); window.renderizarCatalogoPDV();
};
const baixaDoItem = it => { const p = produtoPorId(it.produto_id); const est = p ? (p.est_atelie || 0) : 0; return { est, baixar: est >= it.qtd }; };

window.renderizarCarrinhoPDV = function() {
    const box = $('pdv-itens'); if (!box) return;
    if (!PDV.itens.length) {
        box.innerHTML = `<div class="vazio-box pequeno">${window.ic('carrinho')}<b>Carrinho vazio</b><span>Toque nos produtos para adicionar.</span></div>`;
    } else box.innerHTML = PDV.itens.map((it, i) => {
        const p = produtoPorId(it.produto_id), b = baixaDoItem(it);
        const nota = b.baixar ? `<span class="pi-nota ok">Sai do Ateliê (tem ${b.est})</span>` : b.est > 0 ? `<span class="pi-nota aviso">Só ${b.est} no Ateliê — não dá baixa</span>` : `<span class="pi-nota aviso">Sem estoque — sob encomenda</span>`;
        return `<div class="pdv-item">
            <img src="${esc(fotoDe(p) || 'logo.png')}" onerror="this.src='logo.png'" alt="">
            <div class="pi-info"><b>${esc(it.nome)}</b>${nota}</div>
            <div class="pi-qtd"><button type="button" onclick="qtdPDV(${i},-1)" aria-label="Menos">−</button><input type="number" min="1" value="${it.qtd}" onchange="qtdPDVSet(${i},this.value)"><button type="button" onclick="qtdPDV(${i},1)" aria-label="Mais">+</button></div>
            <div class="pi-preco"><input type="text" class="mask-money" value="${window.fmt(it.unit)}" oninput="setTimeout(()=>precoPDV(${i},this.value))" aria-label="Preço unitário"><small>${it.sugerido ? 'sugerido · un.' : 'por unidade'}</small></div>
            <b class="pi-total" data-pi-total="${i}">${window.fmt(it.unit * it.qtd)}</b>
            <button type="button" class="pi-x" onclick="tirarPDV(${i})" title="Tirar do carrinho">${window.ic('x')}</button>
        </div>`;
    }).join('');
    window.renderizarTotaisPDV();
};
window.calcularPDV = function() {
    let sub = 0, custo = 0, pecas = 0;
    PDV.itens.forEach(it => { sub += it.unit * it.qtd; custo += custoDe(produtoPorId(it.produto_id)) * it.qtd; pecas += it.qtd; });
    sub = n2(sub); const desconto = Math.min(val($('pdv-desconto').value), sub), total = n2(sub - desconto);
    const taxa = taxaDe(PDV.canal, total), lucro = n2(total - custo - taxa);
    return { sub, desconto, total, taxa, custo: n2(custo), lucro, pecas, margem: total > 0 ? lucro / total * 100 : 0 };
};
window.renderizarTotaisPDV = function() {
    const c = window.calcularPDV();
    $('pdv-totais').innerHTML = `
        <div class="tot-linha"><span>Subtotal (${c.pecas} ${c.pecas === 1 ? 'peça' : 'peças'})</span><b>${window.fmt(c.sub)}</b></div>
        ${c.desconto > 0 ? `<div class="tot-linha desc"><span>Desconto</span><b>− ${window.fmt(c.desconto)}</b></div>` : ''}
        <div class="tot-grande"><span>Total a cobrar</span><b>${window.fmt(c.total)}</b></div>
        <div class="tot-lucro ${c.lucro < 0 ? 'neg' : ''}">
            <div><small>Custo de produção</small><b>${window.fmt(c.custo)}</b></div>
            <div><small>Taxa ${esc(PDV.canal)}</small><b>${c.taxa > 0 ? '− ' + window.fmt(c.taxa) : 'R$ 0,00'}</b></div>
            <div><small>Seu lucro</small><b>${window.fmt(c.lucro)} <em>${c.total > 0 ? Math.round(c.margem) + '%' : ''}</em></b></div>
        </div>`;
    $('pdv-finalizar').innerHTML = `${window.ic('check')} ${PDV.status === 'Pago' ? 'Finalizar venda' : 'Finalizar (a receber)'}${c.total > 0 ? ' · ' + window.fmt(c.total) : ''}`;
    window.atualizarBarraPDV();
};
// No celular, uma barrinha mostra o carrinho enquanto você escolhe os produtos
window.atualizarBarraPDV = function() {
    const barra = $('pdv-barra'); if (!barra) return;
    const aberta = PDV.itens.length && !PDV.carrinhoNaTela && !$('vendas-nova').hidden && $('tab-vendas').classList.contains('active');
    barra.classList.toggle('visivel', !!aberta);
    if (aberta) { const c = window.calcularPDV(); $('pdv-barra-txt').innerHTML = `<small>${c.pecas} ${c.pecas === 1 ? 'item' : 'itens'} no carrinho</small><b>${window.fmt(c.total)}</b>`; }
};
window.irParaCarrinhoPDV = () => $('pdv-carrinho').scrollIntoView({ behavior: 'smooth', block: 'start' });

window.finalizarPedido = async function() {
    if (!PDV.itens.length) return window.mostrarAlerta('Carrinho vazio', 'Escolha pelo menos um produto.', 'warning');
    const data = $('pdv-data').value; if (!data) return window.mostrarAlerta('Falta a data', 'Informe a data da venda.', 'warning');
    const c = window.calcularPDV(), cliente = $('pdv-cliente').value.trim() || 'Cliente avulso';
    if (PDV.itens.some(i => !(i.unit > 0)) && !await window.confirmarMM({ icone: '⚠️', titulo: 'Tem item com preço zero', texto: 'Continuar mesmo assim? (ex.: brinde)', ok: 'Continuar' })) return;
    const resumo = PDV.itens.map(i => `<div><span>${i.qtd}x ${esc(i.nome)}</span><b>${window.fmt(i.unit * i.qtd)}</b></div>`).join('')
        + (c.desconto > 0 ? `<div><span>Desconto</span><b>− ${window.fmt(c.desconto)}</b></div>` : '')
        + `<div class="rc-total"><span>Total</span><span>${window.fmt(c.total)}</span></div>`;
    const ok = await window.confirmarMM({ icone: '🛒', titulo: `Venda para ${cliente}`, html: `<div class="resumo-confirma">${resumo}</div><p style="margin:12px 0 0;">${esc(PDV.canal)} · ${esc(PDV.forma)} · <b>${PDV.status === 'Pago' ? '🟢 Pago' : '🟡 A receber'}</b></p>`, ok: 'Confirmar venda' });
    if (!ok) return;
    const btn = $('pdv-finalizar'); btn.disabled = true; btn.innerText = '⏳ Registrando…';
    const itensTexto = PDV.itens.map(i => ({ nome: i.nome, qtd: i.qtd, total: i.unit * i.qtd }));
    const telefone = $('pdv-telefone').value.trim();
    try {
        const r = await window.apiAcao('salvar_pedido', {
            data_venda: data, cliente, telefone, plataforma: PDV.canal, forma_pgto: PDV.forma, status: PDV.status, obs: $('pdv-obs').value.trim(), desconto: window.fmtPlanilha(c.desconto),
            itens: PDV.itens.map(i => ({ produto_id: i.produto_id, produto: i.nome, qtd: i.qtd, valor_unit: window.fmtPlanilha(i.unit), baixar_estoque: baixaDoItem(i).baixar }))
        });
        const pedido = { id: r.pedido_id, cliente, telefone, status: PDV.status, forma: PDV.forma, iso: data, total: r.total, desconto: c.desconto, itens: itensTexto };
        if (telefone) PDV.contatos[cliente] = telefone;
        PDV.itens = []; ['pdv-cliente', 'pdv-telefone', 'pdv-obs', 'pdv-desconto', 'pdv-busca'].forEach(id => { $(id).value = ''; });
        window.renderizarCarrinhoPDV();
        window.carregarVendas(); window.carregarBancoDeCustos(); window.carregarOpcoesVenda();
        if (window.painelEstoque) window.carregarPainelEstoque();
        window.abrirModalMM(`<div class="mm-sucesso"><span class="modal-icon-alert ok">${window.ICONES.ok}</span>
            <h3 class="modal-title-alert">Venda #${r.pedido_id} registrada!</h3>
            <p class="modal-text-alert">${esc(cliente)} · <b>${window.fmt(r.total)}</b> · ${PDV.status === 'Pago' ? 'pago' : 'a receber'}${r.taxa > 0 ? `<br><small>Taxa ${esc(PDV.canal)}: ${window.fmt(r.taxa)}</small>` : ''}</p>
            <div class="acoes-sucesso">
                <a class="btn-magic btn-zap" href="${window.linkZap(telefone, window.textoPedidoZap(pedido))}" target="_blank" rel="noopener">${window.ic('zap')} ${PDV.status === 'Pago' ? 'Mandar recibo no WhatsApp' : 'Mandar resumo no WhatsApp'}</a>
                <button class="btn-magic btn-secundario" onclick="fecharModalMM(); abaVendas('historico')">Ver no histórico</button>
                <button class="btn-magic btn-global" onclick="fecharModalMM()">${window.ic('mais')} Nova venda</button>
            </div></div>`);
    } catch (e) { window.mostrarAlerta('Não deu para registrar', e.message, 'error'); }
    finally { btn.disabled = false; window.renderizarTotaisPDV(); }
};

// Texto do WhatsApp (recibo quando pago, resumo/cobrança quando pendente)
window.textoPedidoZap = function(p) {
    const pago = String(p.status).toLowerCase() === 'pago';
    const linhas = p.itens.map(i => `• ${i.qtd}x ${i.nome} — ${window.fmt(i.total)}`).join('\n');
    return `Olá, *${p.cliente}*! Aqui é do *Mini Mundo 3D* 🌍🖨️\n\n${pago ? 'Confirmamos o pagamento do seu pedido' : 'Segue o resumo do seu pedido'} *#${p.id}* (${window.isoParaBrMM(p.iso)}):\n\n${linhas}\n${p.desconto > 0 ? `🏷️ Desconto: − ${window.fmt(p.desconto)}\n` : ''}\n💰 *Total: ${window.fmt(p.total)}*\n${pago ? `✅ Pago${p.forma ? ' via ' + p.forma : ''}` : `🟡 Pagamento pendente${p.forma && p.forma !== 'Outro' ? ' (' + p.forma + ')' : ''}`}\n\nMuito obrigado pela confiança! 🧡`;
};

// ==========================================
// 📊 HISTÓRICO
// ==========================================
window.carregarVendas = async function() {
    const ld = $('loading-vendas'); if (ld) ld.style.display = 'block';
    try { window.arrayVendas = (await window.apiAcao('listar_vendas')).vendas; window.filtrarVendas(); }
    catch (e) { if ($('lista-vendas')) $('lista-vendas').innerHTML = `<p class="mm-vazio">Não consegui carregar as vendas: ${esc(e.message)}</p>`; }
    finally { if (ld) ld.style.display = 'none'; }
};
window.agruparPedidos = function(linhas) {
    const mapa = new Map();
    (linhas || []).forEach(v => {
        const k = v.pedido_id || v.linha;
        if (!mapa.has(k)) mapa.set(k, { id: k, iso: window.brParaIsoMM(v.data), data: v.data, cliente: v.cliente || 'Cliente avulso', telefone: v.telefone || '', plataforma: v.plataforma || '', forma: v.forma_pgto || '', status: 'Pago', obs: v.obs || '', data_pgt: v.data_pgt || '', criado_por: v.criado_por || '', linhas: [], total: 0, lucro: 0, custo: 0, taxa: 0, desconto: 0, pecas: 0 });
        const p = mapa.get(k);
        p.linhas.push(v); p.total += val(v.valor_venda); p.lucro += val(v.lucro); p.custo += (v.custo_total || 0); p.taxa += (v.taxa || 0); p.desconto += (v.desconto || 0); p.pecas += parseFloat(v.qtd) || 0;
        if (String(v.status).toLowerCase() === 'pendente') p.status = 'Pendente';
        if (!p.telefone && v.telefone) p.telefone = v.telefone;
    });
    return [...mapa.values()].map(p => Object.assign(p, { total: n2(p.total), lucro: n2(p.lucro), itens: p.linhas.map(l => ({ nome: l.produto, qtd: parseFloat(l.qtd) || 0, total: val(l.valor_venda) })) }))
        .sort((a, b) => b.iso.localeCompare(a.iso) || b.id - a.id);
};
// Período em datas ISO [início, fim] — usado também pelo Dashboard
window.intervaloPeriodoMM = function(periodo, de, ate) {
    const h = new Date(), y = h.getFullYear(), m = h.getMonth(), hoje = isoDe(h);
    const diasAtras = n => { const d = new Date(h); d.setDate(d.getDate() - n); return isoDe(d); };
    switch (periodo) {
        case 'hoje': return [hoje, hoje];
        case '7d': return [diasAtras(6), hoje];
        case '30d': return [diasAtras(29), hoje];
        case 'mes': return [isoDe(new Date(y, m, 1)), isoDe(new Date(y, m + 1, 0))];
        case 'mesant': return [isoDe(new Date(y, m - 1, 1)), isoDe(new Date(y, m, 0))];
        case '3m': return [isoDe(new Date(y, m - 2, 1)), isoDe(new Date(y, m + 1, 0))];
        case 'ano': return [`${y}-01-01`, `${y}-12-31`];
        case '12m': return [isoDe(new Date(y, m - 11, 1)), isoDe(new Date(y, m + 1, 0))];
        case 'personalizado': return [de || '0000-01-01', ate || '9999-12-31'];
        default: return ['0000-01-01', '9999-12-31'];
    }
};
window.periodoHV = function(p) {
    HV.periodo = p; HV.limite = 30;
    document.querySelectorAll('#hv-chips button').forEach(b => b.classList.toggle('active', b.dataset.p === p));
    window.filtrarVendas();
};
window.toggleFiltrosHV = function() { const f = $('hv-filtros'); f.hidden = !f.hidden; };
window.limparFiltrosVendas = function() {
    ['hv-busca', 'hv-de', 'hv-ate'].forEach(id => { $(id).value = ''; });
    ['hv-canal', 'hv-forma', 'hv-status'].forEach(id => { $(id).value = ''; });
    window.periodoHV('mes');
};
window.filtrarVendas = function() {
    if (!$('lista-vendas')) return;
    const pedidos = HV.pedidos = window.agruparPedidos(window.arrayVendas);
    // Opções dos filtros avançados (canais e formas que existem nas vendas)
    const canais = [...new Set(pedidos.map(p => p.plataforma).filter(Boolean))].sort(), selC = $('hv-canal').value;
    $('hv-canal').innerHTML = '<option value="">Todos os canais</option>' + canais.map(c => `<option ${c === selC ? 'selected' : ''}>${esc(c)}</option>`).join('');
    const pendentes = pedidos.filter(p => p.status === 'Pendente');
    $('vendas-badge-pend').innerText = pendentes.length || '';
    document.querySelector('#hv-chips [data-p="areceber"]').innerHTML = `A receber${pendentes.length ? ` <em>${pendentes.length}</em>` : ''}`;

    const t = norm($('hv-busca').value).replace(/^#/, ''), canal = $('hv-canal').value, forma = $('hv-forma').value, status = $('hv-status').value;
    const [ini, fim] = HV.periodo === 'areceber' ? ['0000-01-01', '9999-12-31'] : window.intervaloPeriodoMM(HV.periodo, $('hv-de').value, $('hv-ate').value);
    const flt = HV.filtrados = pedidos.filter(p => {
        if (HV.periodo === 'areceber' && p.status !== 'Pendente') return false;
        if (p.iso && (p.iso < ini || p.iso > fim)) return false;
        if (canal && p.plataforma !== canal) return false;
        if (forma && p.forma !== forma) return false;
        if (status && p.status !== status) return false;
        if (t && !(norm(p.cliente).includes(t) || String(p.id) === t || p.linhas.some(l => norm(l.produto).includes(t)) || norm(p.obs).includes(t))) return false;
        return true;
    });
    const ativos = !!(canal || forma || status || HV.periodo === 'personalizado');
    $('hv-btn-filtros').classList.toggle('ativo', ativos);

    // Indicadores do filtro atual
    const soma = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
    const total = soma(flt, p => p.total), recebido = soma(flt.filter(p => p.status === 'Pago'), p => p.total), aReceber = total - recebido, lucro = soma(flt, p => p.lucro), pecas = soma(flt, p => p.pecas);
    $('hv-kpis').innerHTML = [
        ['carrinho', 'Vendido', window.fmt(total), `${flt.length} ${flt.length === 1 ? 'pedido' : 'pedidos'} · ${pecas} ${pecas === 1 ? 'peça' : 'peças'}`, ''],
        ['check', 'Recebido', window.fmt(recebido), total > 0 ? `${Math.round(recebido / total * 100)}% do vendido` : '—', 'verde'],
        ['relogio', 'A receber', window.fmt(aReceber), `${flt.filter(p => p.status === 'Pendente').length} pedido(s)`, 'laranja'],
        ['tendencia', 'Lucro', window.fmt(lucro), total > 0 ? `margem de ${Math.round(lucro / total * 100)}%` : '—', 'azul'],
        ['etiqueta', 'Ticket médio', window.fmt(flt.length ? total / flt.length : 0), 'por pedido', '']
    ].map(([i, r, v, s, cor]) => `<div class="kpi kpi-ic ${cor}"><span class="kpi-icone">${window.ic(i)}</span><span class="kpi-rotulo">${r}</span><span class="kpi-valor">${v}</span><span class="kpi-sub">${s}</span></div>`).join('');

    const nomes = [...new Set(flt.map(p => p.cliente))];
    $('hv-extrato').hidden = !(t && nomes.length === 1);
    if (nomes.length === 1) $('hv-extrato').innerHTML = `${window.ic('copiar')} Extrato de ${esc(nomes[0])}`;

    const lista = $('lista-vendas');
    if (!flt.length) { lista.innerHTML = `<div class="vazio-box">${window.ic('recibo')}<b>Nenhuma venda nesse filtro</b><span>${pedidos.length ? 'Tente outro período ou limpe os filtros.' : 'Lance a primeira em <a onclick="abaVendas(\'nova\')">Nova venda</a>.'}</span></div>`; return; }
    const mostrar = flt.slice(0, HV.limite), dias = new Map();
    mostrar.forEach(p => { const k = p.iso || 'sem-data'; if (!dias.has(k)) dias.set(k, []); dias.get(k).push(p); });
    let h = '';
    dias.forEach((ps, iso) => {
        const totDia = soma(ps, p => p.total);
        h += `<div class="dia-cab"><span>${iso === 'sem-data' ? 'Sem data' : diaExtenso(iso)}</span><b>${window.fmt(totDia)}</b></div>`;
        h += ps.map(p => `<div class="ped ${p.status === 'Pendente' ? 'pendente' : 'pago'}" onclick="abrirPedido(${p.id})" role="button" tabindex="0">
            <div class="ped-princ">
                <div class="ped-topo"><span class="ped-num">#${p.id}</span><b class="ped-cli">${esc(p.cliente)}</b><span class="badge-status ${p.status === 'Pendente' ? 'pend' : 'pago'}">${p.status === 'Pendente' ? 'A receber' : 'Pago'}</span></div>
                <div class="ped-itens">${p.itens.map(i => `${i.qtd}x ${esc(i.nome)}`).join(' · ')}</div>
                <div class="ped-meta">${p.plataforma ? `<span>${esc(p.plataforma)}</span>` : ''}${p.forma ? `<span>${esc(p.forma)}</span>` : ''}${p.obs ? `<span title="${esc(p.obs)}">📝 ${esc(p.obs.slice(0, 40))}</span>` : ''}</div>
            </div>
            <div class="ped-valores"><b>${window.fmt(p.total)}</b><small class="${p.lucro < 0 ? 'neg' : ''}">lucro ${window.fmt(p.lucro)}</small></div>
        </div>`).join('');
    });
    if (flt.length > HV.limite) h += `<button class="btn-mais" onclick="HV.limite += 30; filtrarVendas()">Mostrar mais ${Math.min(30, flt.length - HV.limite)} de ${flt.length - HV.limite}</button>`;
    lista.innerHTML = h;
};

// Extrato do cliente (texto pronto para colar no WhatsApp)
window.copiarExtratoCliente = function() {
    const ps = HV.filtrados; if (!ps.length) return;
    let total = 0, aberto = 0;
    let txt = `*🧾 EXTRATO | MINI MUNDO 3D*\n*Cliente:* ${ps[0].cliente}\n\n`;
    ps.slice().reverse().forEach(p => {
        total += p.total; if (p.status === 'Pendente') aberto += p.total;
        txt += `📅 *${window.isoParaBrMM(p.iso)}* · Pedido #${p.id}\n${p.itens.map(i => `   ${i.qtd}x ${i.nome}`).join('\n')}\n   💰 ${window.fmt(p.total)} · ${p.status === 'Pago' ? '🟢 Pago' : '🟡 Pendente'}\n\n`;
    });
    txt += `*Total: ${window.fmt(total)}*${aberto > 0 ? `\n*Em aberto: ${window.fmt(aberto)}*` : ''}`;
    window.copiarTexto(txt, 'Extrato copiado. É só colar no WhatsApp!');
};

// ---------- DETALHE DO PEDIDO ----------
const pedidoPorId = id => window.agruparPedidos(window.arrayVendas).find(p => p.id === id);
window.abrirPedido = function(id) {
    const p = pedidoPorId(id); if (!p) return;
    const pend = p.status === 'Pendente', varios = p.linhas.length > 1;
    const bruto = p.total + p.desconto;
    window.abrirModalMM(`<h3 class="modal-title">Pedido #${p.id}</h3>
        <div class="ped-det-topo"><div><b>${esc(p.cliente)}</b><small>${diaExtenso(p.iso)}${p.criado_por ? ` · lançado por ${esc(p.criado_por)}` : ''}</small></div><span class="badge-status ${pend ? 'pend' : 'pago'}">${pend ? 'A receber' : 'Pago' + (p.data_pgt && p.data_pgt !== p.data ? ' em ' + esc(p.data_pgt) : '')}</span></div>
        <div class="ped-det-info">
            <div><small>Canal</small><b>${esc(p.plataforma || '—')}</b></div>
            <div><small>Pagamento</small><b>${esc(p.forma || '—')}</b></div>
            <div><small>WhatsApp</small><b>${p.telefone ? esc(p.telefone) : '—'}</b></div>
        </div>
        ${p.obs ? `<div class="ped-det-obs">📝 ${esc(p.obs)}</div>` : ''}
        <div class="ped-det-itens">${p.linhas.map(l => `<div class="pdi">
            <span class="pdi-q">${esc(l.qtd)}x</span><div class="pdi-n"><b>${esc(l.produto)}</b><small>${l.baixa_estoque ? 'saiu do Ateliê' : 'sem baixa de estoque'} · custo ${window.fmt(l.custo_total || 0)}</small></div>
            <b class="pdi-v">${window.fmt(val(l.valor_venda))}</b>
            <span class="pdi-acoes"><button class="btn-ic" title="Editar item" onclick="fecharModalMM(); abrirModalEditarVenda(${l.linha})">${window.ic('lapis')}</button>${varios ? `<button class="btn-ic perigo" title="Tirar item do pedido" onclick="excluirItemPedido(${l.linha}, ${p.id})">${window.ic('lixo')}</button>` : ''}</span>
        </div>`).join('')}</div>
        <div class="ped-det-tot">
            ${p.desconto > 0 ? `<div><span>Subtotal</span><span>${window.fmt(bruto)}</span></div><div><span>Desconto</span><span>− ${window.fmt(p.desconto)}</span></div>` : ''}
            <div class="grande"><span>Total</span><b>${window.fmt(p.total)}</b></div>
            <div><span>Custo de produção</span><span>${window.fmt(p.custo)}</span></div>
            ${p.taxa > 0 ? `<div><span>Taxa da plataforma</span><span>− ${window.fmt(p.taxa)}</span></div>` : ''}
            <div class="lucro ${p.lucro < 0 ? 'neg' : ''}"><span>Lucro</span><b>${window.fmt(p.lucro)}</b></div>
        </div>
        <div class="ped-det-acoes">
            ${pend ? `<button class="btn-magic btn-global" onclick="statusPedido(${p.id}, 'Pago')">${window.ic('check')} Recebi o pagamento</button>` : `<button class="btn-magic btn-secundario" onclick="statusPedido(${p.id}, 'Pendente')">${window.ic('relogio')} Voltar para "a receber"</button>`}
            <a class="btn-magic btn-zap" href="${window.linkZap(p.telefone, window.textoPedidoZap(p))}" target="_blank" rel="noopener">${window.ic('zap')} ${pend ? 'Cobrar no WhatsApp' : 'Recibo no WhatsApp'}</a>
            <div class="ped-det-mini">
                <button class="btn-limpar" onclick="pdfPedido(${p.id})">${window.ic('recibo')} ${pend ? 'PDF de cobrança' : 'PDF do recibo'}</button>
                <button class="btn-limpar" onclick="editarDadosPedido(${p.id})">${window.ic('lapis')} Editar dados</button>
                <button class="btn-limpar perigo" onclick="excluirPedido(${p.id})">${window.ic('lixo')} Excluir</button>
            </div>
        </div>`);
};
window.statusPedido = async function(id, novo) {
    try { await window.apiAcao('status_pedido', { pedido_id: id, novo_status: novo }); await window.carregarVendas(); window.abrirPedido(id); window.toastMM(novo === 'Pago' ? 'Pagamento registrado' : 'Voltou para a receber'); }
    catch (e) { window.mostrarAlerta('Erro', e.message, 'error'); }
};
window.pdfPedido = function(id) {
    const p = pedidoPorId(id); if (!p) return;
    window.gerarHTMLImpressao({ [p.cliente]: p.linhas }, p.status === 'Pendente' ? 'Pendente' : 'Pago');
};
window.excluirPedido = async function(id) {
    const p = pedidoPorId(id); if (!p) return;
    const voltam = p.linhas.filter(l => l.baixa_estoque).reduce((s, l) => s + (parseFloat(l.qtd) || 0), 0);
    if (!await window.confirmarMM({ tipo: 'perigo', icone: '🗑️', titulo: `Excluir o pedido #${id}?`, texto: `${p.cliente} · ${window.fmt(p.total)}\nIsso não pode ser desfeito.${voltam ? `\n${voltam} peça(s) voltam para o Ateliê.` : ''}`, ok: 'Excluir pedido' })) return;
    try { await window.apiAcao('excluir_pedido', { pedido_id: id }); window.fecharModalMM(); window.toastMM('Pedido excluído'); window.carregarVendas(); window.carregarBancoDeCustos(); }
    catch (e) { window.mostrarAlerta('Erro', e.message, 'error'); }
};
window.excluirItemPedido = async function(linha, pedidoId) {
    const l = (window.arrayVendas || []).find(x => x.linha === linha); if (!l) return;
    if (!await window.confirmarMM({ tipo: 'perigo', icone: '🗑️', titulo: 'Tirar este item do pedido?', texto: `${l.qtd}x ${l.produto} · ${window.formatarDoBanco(l.valor_venda)}${l.baixa_estoque ? '\nA peça volta para o Ateliê.' : ''}`, ok: 'Tirar item' })) return;
    try { await window.apiAcao('excluir_registro', { aba: 'Vendas', linha }); await window.carregarVendas(); window.carregarBancoDeCustos(); if (pedidoPorId(pedidoId)) window.abrirPedido(pedidoId); else window.fecharModalMM(); }
    catch (e) { window.mostrarAlerta('Erro', e.message, 'error'); }
};
window.editarDadosPedido = function(id) {
    const p = pedidoPorId(id); if (!p) return;
    window.preencherModalMM(`<h3 class="modal-title">Editar pedido #${p.id}</h3>
        <div class="row"><div class="col"><div class="input-group"><label>Cliente</label><input type="text" id="pe-cliente" list="lista-clientes-venda" value="${esc(p.cliente)}"></div></div>
            <div class="col"><div class="input-group"><label>WhatsApp</label><input type="tel" id="pe-tel" value="${esc(p.telefone)}" placeholder="11999998888"></div></div></div>
        <div class="row"><div class="col"><div class="input-group"><label>Data da venda</label><input type="date" id="pe-data" value="${esc(p.iso)}"></div></div>
            <div class="col"><div class="input-group"><label>Canal</label><input type="text" id="pe-canal" list="lista-plataformas-venda" value="${esc(p.plataforma)}"></div></div></div>
        <div class="row"><div class="col"><div class="input-group"><label>Forma de pagamento</label><select id="pe-forma"><option value="">—</option>${FORMAS.map(f => `<option ${f === p.forma ? 'selected' : ''}>${f}</option>`).join('')}</select></div></div>
            <div class="col"><div class="input-group"><label>Situação</label><select id="pe-status"><option value="Pago" ${p.status === 'Pago' ? 'selected' : ''}>🟢 Pago</option><option value="Pendente" ${p.status === 'Pendente' ? 'selected' : ''}>🟡 A receber</option></select></div></div></div>
        <div class="input-group"><label>Observação</label><input type="text" id="pe-obs" value="${esc(p.obs)}" maxlength="255"></div>
        <p class="texto-ajuda">Para mudar produto, quantidade ou valor, use o ✏️ de cada item no pedido.</p>
        <div class="modal-botoes"><button class="btn-modal-cancel" onclick="abrirPedido(${p.id})">Voltar</button><button class="btn-modal-confirm" id="pe-salvar" onclick="salvarDadosPedido(${p.id})">Salvar</button></div>`);
};
window.salvarDadosPedido = async function(id) {
    const b = $('pe-salvar'); b.disabled = true;
    try {
        await window.apiAcao('atualizar_pedido', { pedido_id: id, cliente: $('pe-cliente').value, telefone: $('pe-tel').value, data_venda: $('pe-data').value, plataforma: $('pe-canal').value, forma_pgto: $('pe-forma').value, status: $('pe-status').value, obs: $('pe-obs').value });
        await window.carregarVendas(); window.abrirPedido(id); window.toastMM('Pedido atualizado');
    } catch (e) { window.mostrarAlerta('Erro', e.message, 'error'); b.disabled = false; }
};

// Primeira abertura: data de hoje e estado inicial
document.addEventListener('DOMContentLoaded', () => {
    if ($('pdv-data')) $('pdv-data').value = window.isoHojeMM();
    if ($('pdv-itens')) window.renderizarCarrinhoPDV();
    // A barrinha do celular some quando o próprio carrinho já está aparecendo na tela
    if ($('pdv-carrinho') && 'IntersectionObserver' in window) new IntersectionObserver(([e]) => { PDV.carrinhoNaTela = e.isIntersecting; window.atualizarBarraPDV(); }, { threshold: 0.12 }).observe($('pdv-carrinho'));
});
})();
