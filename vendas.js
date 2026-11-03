// ==========================================
// 🛒 VENDAS: NOVA VENDA (PDV) E HISTÓRICO
// ==========================================
// Uma venda pode ter vários produtos. No servidor cada produto continua sendo uma linha da tabela
// "vendas" (ligadas pelo pedido_id), então relatórios, recibos em lote e vendas antigas seguem iguais.
// As funções daqui terminam em "Venda" (abrirVenda, excluirVenda…): "Pedido" é da tela Pedidos.
(() => {
const $ = window.$;
const esc = s => window.esc(s);
const val = v => window.limparValorPlanilha(v);
const n2 = v => Math.round((parseFloat(v) || 0) * 100) / 100;
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const FORMAS = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Pela plataforma', 'Outro'];
// Situação da venda: rótulo, classe de cor e ícone
const SITUACAO = { Pago: ['Pago', 'pago', 'check'], Pendente: ['A receber', 'pend', 'relogio'], Cancelado: ['Cancelada', 'canc', 'x'] };
const pilula = s => { const [r, c, i] = SITUACAO[s] || SITUACAO.Pago; return `<span class="pilula ${c}">${window.ic(i)}${r}</span>`; };

// Datas: as vendas chegam como "29/10/2026"; o resto do sistema trabalha com "2026-10-29"
const isoDe = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
window.isoHojeMM = () => isoDe(new Date());
window.brParaIsoMM = s => { const t = String(s || ''); const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/); if (m) return `${m[3]}-${m[2]}-${m[1]}`; const m2 = t.match(/^\d{4}-\d{2}-\d{2}/); return m2 ? m2[0] : ''; };
window.isoParaBrMM = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : String(s || ''); };
const diaExtenso = iso => { const d = new Date(iso + 'T12:00:00'); if (isNaN(d)) return iso; const t = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }); return t.charAt(0).toUpperCase() + t.slice(1); };

window.PDV = { itens: [], canal: 'Venda direta', forma: 'Pix', status: 'Pago', contatos: {}, canaisUsados: [], listaAberta: false };
window.HV = { periodo: 'mes', situacao: 'todas', limite: 30, pedidos: [], filtrados: [] };

const produtoPorId = id => (window.arrayBancoCustos || []).find(p => p.linha === id);
const fotoDe = p => String((p && (p.foto || p.foto_catalogo)) || '').split(',')[0].trim();
const custoDe = p => p ? val(p.custo_total) : 0;
const estoqueDe = p => (p && p.est_atelie) || 0;
// Preço que entra no carrinho: o preço de venda cadastrado; sem ele, custo × multiplicador dos Ajustes (arredondado pra cima)
window.precoVendaDe = function(p) {
    if (!p) return 0;
    if (p.preco_venda) return p.preco_venda;
    const mult = parseFloat(String((window.configMM || {}).multiplicador_venda || '3').replace(',', '.')) || 3;
    const c = custoDe(p); return c > 0 ? Math.ceil(c * mult) : 0;
};
const plataformaDe = nome => (window.arrayPlataformas || []).find(p => norm(p.nome) === norm(nome));
const taxaDe = (canal, total) => { const p = plataformaDe(canal); return p && total > 0 ? n2(total * (parseFloat(p.pct) || 0) / 100 + (parseFloat(p.fixa) || 0)) : 0; };
// Produtos para escolher: com estoque primeiro (por nome), depois os sem estoque
const produtosParaVender = () => (window.arrayBancoCustos || []).filter(p => p.ativo !== false)
    .sort((a, b) => ((estoqueDe(b) > 0) - (estoqueDe(a) > 0)) || String(a.modelo).localeCompare(String(b.modelo), 'pt-BR'));
const opcoesComFoto = () => produtosParaVender().map(p => ({ v: p.linha, t: p.modelo, f: fotoDe(p),
    s: `${window.precoVendaDe(p) ? window.fmt(window.precoVendaDe(p)) : 'sem preço'} · ${estoqueDe(p) > 0 ? `${estoqueDe(p)} no Ateliê` : 'sem estoque'}${p.tipo === 'kit' ? ' · Kit' : ''}${window.temMedidas(p.medidas) ? ' · ' + window.medidasTxt(p.medidas) : ''}` }));

// ---------- SUB-ABAS ----------
window.abaVendas = function(qual) {
    document.querySelectorAll('#vendas-abas button').forEach(b => b.classList.toggle('active', b.dataset.aba === qual));
    $('vendas-nova').hidden = qual !== 'nova'; $('vendas-historico').hidden = qual !== 'historico';
    if (qual === 'historico') window.filtrarVendas(); else window.fecharListaPDV();
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

// ---------- ESCOLHER PRODUTOS: busca com lista suspensa ----------
// A lista só aparece quando você toca na busca ou digita; tocar num produto põe 1 no carrinho e a lista continua
// aberta para escolher outros. "Ver todos" abre a lista com fotos em tela cheia.
window.abrirListaPDV = function() { PDV.listaAberta = true; window.renderizarCatalogoPDV(); };
window.fecharListaPDV = function() { PDV.listaAberta = false; const g = $('pdv-grade'); if (g) g.hidden = true; };
document.addEventListener('pointerdown', e => { if (PDV.listaAberta && !e.target.closest('#pdv-busca-box')) window.fecharListaPDV(); });
window.renderizarCatalogoPDV = function() {
    const grade = $('pdv-grade'); if (!grade) return;
    const t = $('pdv-busca').value, todos = produtosParaVender();
    const comEstoque = todos.filter(p => estoqueDe(p) > 0).length;
    $('pdv-info').innerText = todos.length ? `${comEstoque} com estoque` : '';
    if (!PDV.listaAberta && !t.trim()) { grade.hidden = true; return; }
    PDV.listaAberta = true; grade.hidden = false;
    const lista = todos.filter(p => window.produtoBate(p, t));
    if (!lista.length) {
        grade.innerHTML = `<div class="pdv-sug-vazio">${!todos.length ? 'Nenhum produto cadastrado. Cadastre em <a onclick="switchTab(\'precificar\')">Precificar</a>.' : `Nada encontrado para "<b>${esc(t)}</b>".`}</div>`;
        return;
    }
    grade.innerHTML = lista.slice(0, 80).map(p => {
        const noCar = PDV.itens.find(i => i.produto_id === p.linha), est = estoqueDe(p), preco = window.precoVendaDe(p);
        return `<button type="button" class="pdv-sug ${noCar ? 'no-carrinho' : ''} ${est > 0 ? '' : 'sem'}" onclick="addPDV(${p.linha})">
            <img src="${esc(fotoDe(p) || 'logo.png')}" onerror="this.src='logo.png'" alt="" loading="lazy">
            <span class="pdv-sug-info"><b>${p.tipo === 'kit' ? '<span class="tag-kit">Kit</span> ' : ''}${esc(p.modelo)}</b>
                <small><span class="pl-preco">${preco ? window.fmt(preco) : 'sem preço'}</span> · <span class="pp-est ${est > 0 ? '' : 'zero'}">${est > 0 ? `${est} no Ateliê` : 'sem estoque · sob encomenda'}</span></small>${window.temMedidas(p.medidas) ? `<small class="pdv-tam">${window.ic('regua')}${window.medidasTxt(p.medidas)}</small>` : ''}</span>
            ${noCar ? `<span class="pdv-sug-qtd">${noCar.qtd}</span>` : `<span class="pl-add" aria-hidden="true">${window.ic('mais')}</span>`}
        </button>`;
    }).join('') + `<div class="pdv-sug-rodape"><span>${lista.length > 80 ? `Mostrando 80 de ${lista.length}. Digite para achar mais rápido.` : `${lista.length} produto${lista.length > 1 ? 's' : ''}`}</span><button type="button" onclick="fecharListaPDV()">Fechar lista</button></div>`;
};
window.verTodosPDV = function() {
    window.fecharListaPDV();
    window.escolherComFotos({ titulo: 'Escolher produto', opcoes: opcoesComFoto(), aoEscolher: v => window.addPDV(parseInt(v)) });
};

// ---------- CARRINHO ----------
window.addPDV = function(id) {
    const p = produtoPorId(id); if (!p) return;
    const ja = PDV.itens.find(i => i.produto_id === id);
    if (ja) ja.qtd++; else PDV.itens.push({ produto_id: id, nome: p.modelo, qtd: 1, unit: window.precoVendaDe(p), sugerido: !p.preco_venda });
    window.renderizarCarrinhoPDV(); window.renderizarCatalogoPDV();
    if (!ja) window.toastMM(`${p.modelo} na venda`);
};
window.menosPDV = function(id) {
    const i = PDV.itens.findIndex(it => it.produto_id === id); if (i < 0) return;
    if (PDV.itens[i].qtd > 1) PDV.itens[i].qtd--; else PDV.itens.splice(i, 1);
    window.renderizarCarrinhoPDV(); window.renderizarCatalogoPDV();
};
window.qtdPDV = function(i, d) { const it = PDV.itens[i]; if (!it) return; it.qtd = Math.max(1, it.qtd + d); window.renderizarCarrinhoPDV(); window.renderizarCatalogoPDV(); };
window.qtdPDVSet = function(i, v) { const it = PDV.itens[i]; if (!it) return; it.qtd = Math.max(1, parseInt(v) || 1); window.renderizarCarrinhoPDV(); window.renderizarCatalogoPDV(); };
window.precoPDV = function(i, v) { const it = PDV.itens[i]; if (!it) return; it.unit = val(v); it.sugerido = false; window.renderizarTotaisPDV(); const el = document.querySelector(`[data-pi-total="${i}"]`); if (el) el.innerText = window.fmt(it.unit * it.qtd); };
window.tirarPDV = function(i) { PDV.itens.splice(i, 1); window.renderizarCarrinhoPDV(); window.renderizarCatalogoPDV(); };
window.limparPDV = async function() {
    if (PDV.itens.length && !await window.confirmarMM({ icone: '🧹', titulo: 'Tirar todos os produtos?', texto: 'Os produtos escolhidos saem desta venda.', ok: 'Tirar todos', tipo: 'perigo' })) return;
    PDV.itens = []; $('pdv-desconto').value = ''; window.renderizarCarrinhoPDV(); window.renderizarCatalogoPDV();
};
const baixaDoItem = it => { const est = estoqueDe(produtoPorId(it.produto_id)); return { est, baixar: est >= it.qtd }; };

window.renderizarCarrinhoPDV = function() {
    const box = $('pdv-itens'); if (!box) return;
    $('pdv-esvaziar').hidden = !PDV.itens.length;
    if (!PDV.itens.length) {
        box.innerHTML = `<div class="pdv-vazio">${window.ic('carrinho')}<span>Nenhum produto ainda. Busque acima ou toque em <b>Ver todos</b>.</span></div>`;
    } else box.innerHTML = PDV.itens.map((it, i) => {
        const p = produtoPorId(it.produto_id), b = baixaDoItem(it);
        const nota = b.baixar ? `<span class="pi-nota ok">Sai do Ateliê (tem ${b.est})</span>` : b.est > 0 ? `<span class="pi-nota aviso">Só ${b.est} no Ateliê — não dá baixa</span>` : `<span class="pi-nota aviso">Sem estoque — sob encomenda</span>`;
        return `<div class="pdv-item">
            <img src="${esc(fotoDe(p) || 'logo.png')}" onerror="this.src='logo.png'" alt="">
            <div class="pi-info"><b>${esc(it.nome)}</b>${nota}${p ? window.chipMedidas(p.linha, p.medidas) : ''}</div>
            <div class="pi-qtd"><button type="button" onclick="qtdPDV(${i},-1)" aria-label="Menos">−</button><input type="number" min="1" value="${it.qtd}" onchange="qtdPDVSet(${i},this.value)" aria-label="Quantidade"><button type="button" onclick="qtdPDV(${i},1)" aria-label="Mais">+</button></div>
            <div class="pi-preco"><input type="text" class="mask-money" value="${window.fmt(it.unit)}" oninput="setTimeout(()=>precoPDV(${i},this.value))" aria-label="Preço unitário"><small>${it.sugerido ? 'sugerido · un.' : 'por unidade'}</small></div>
            <b class="pi-total" data-pi-total="${i}">${window.fmt(it.unit * it.qtd)}</b>
            <button type="button" class="pi-x" onclick="tirarPDV(${i})" title="Tirar da venda" aria-label="Tirar ${esc(it.nome)}">${window.ic('x')}</button>
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
    const bt = $('pdv-finalizar');
    bt.className = `btn-magic btn-finalizar ${PDV.status === 'Pago' ? 'btn-global' : 'btn-amarelo'}`;
    bt.innerHTML = `${window.ic(PDV.status === 'Pago' ? 'check' : 'relogio')} ${PDV.status === 'Pago' ? 'Finalizar venda (paga)' : 'Finalizar (a receber)'}${c.total > 0 ? ' · ' + window.fmt(c.total) : ''}`;
    window.atualizarBarraPDV();
};
// No celular, uma barrinha mostra o total enquanto você preenche a venda
window.atualizarBarraPDV = function() {
    const barra = $('pdv-barra'); if (!barra) return;
    const aberta = PDV.itens.length && !PDV.carrinhoNaTela && !$('vendas-nova').hidden && $('tab-vendas').classList.contains('active');
    barra.classList.toggle('visivel', !!aberta);
    if (aberta) { const c = window.calcularPDV(); $('pdv-barra-txt').innerHTML = `<small>${c.pecas} ${c.pecas === 1 ? 'peça' : 'peças'} na venda</small><b>${window.fmt(c.total)}</b>`; }
};
window.irParaCarrinhoPDV = () => $('pdv-carrinho').scrollIntoView({ behavior: 'smooth', block: 'start' });

window.finalizarPedido = async function() {
    if (!PDV.itens.length) return window.mostrarAlerta('Nenhum produto', 'Escolha pelo menos um produto na busca do passo 1.', 'warning');
    const data = $('pdv-data').value; if (!data) return window.mostrarAlerta('Falta a data', 'Informe a data da venda.', 'warning');
    const c = window.calcularPDV(), cliente = $('pdv-cliente').value.trim() || 'Cliente avulso';
    if (PDV.itens.some(i => !(i.unit > 0)) && !await window.confirmarMM({ icone: '⚠️', titulo: 'Tem item com preço zero', texto: 'Continuar mesmo assim? (ex.: brinde)', ok: 'Continuar' })) return;
    const resumo = PDV.itens.map(i => `<div><span>${i.qtd}x ${esc(i.nome)}</span><b>${window.fmt(i.unit * i.qtd)}</b></div>`).join('')
        + (c.desconto > 0 ? `<div><span>Desconto</span><b>− ${window.fmt(c.desconto)}</b></div>` : '')
        + `<div class="rc-total"><span>Total</span><span>${window.fmt(c.total)}</span></div>`;
    const ok = await window.confirmarMM({ icone: '🛒', titulo: `Venda para ${cliente}`, html: `<div class="resumo-confirma">${resumo}</div><p style="margin:12px 0 0;">${esc(PDV.canal)} · ${esc(PDV.forma)} · ${pilula(PDV.status)}</p>`, ok: 'Confirmar venda' });
    if (!ok) return;
    const btn = $('pdv-finalizar'); btn.disabled = true; btn.innerText = 'Registrando…';
    const itensTexto = PDV.itens.map(i => ({ nome: i.nome, qtd: i.qtd, total: i.unit * i.qtd }));
    const telefone = $('pdv-telefone').value.trim();
    try {
        const r = await window.apiAcao('salvar_pedido', {
            data_venda: data, cliente, telefone, plataforma: PDV.canal, forma_pgto: PDV.forma, status: PDV.status, obs: $('pdv-obs').value.trim(), desconto: window.fmtPlanilha(c.desconto),
            itens: PDV.itens.map(i => ({ produto_id: i.produto_id, produto: i.nome, qtd: i.qtd, valor_unit: window.fmtPlanilha(i.unit), baixar_estoque: baixaDoItem(i).baixar }))
        });
        const venda = { id: r.pedido_id, cliente, telefone, status: PDV.status, forma: PDV.forma, iso: data, total: r.total, desconto: c.desconto, itens: itensTexto };
        if (telefone) PDV.contatos[cliente] = telefone;
        PDV.itens = []; ['pdv-cliente', 'pdv-telefone', 'pdv-obs', 'pdv-desconto', 'pdv-busca'].forEach(id => { $(id).value = ''; });
        window.renderizarCarrinhoPDV();
        window.carregarVendas(); window.carregarBancoDeCustos(); window.carregarOpcoesVenda();
        if (window.painelEstoque) window.carregarPainelEstoque();
        window.abrirModalMM(`<div class="mm-sucesso"><span class="modal-icon-alert ok">${window.ICONES.ok}</span>
            <h3 class="modal-title-alert">Venda #${r.pedido_id} registrada!</h3>
            <p class="modal-text-alert">${esc(cliente)} · <b>${window.fmt(r.total)}</b> · ${venda.status === 'Pago' ? 'paga' : 'a receber'}${r.taxa > 0 ? `<br><small>Taxa ${esc(PDV.canal)}: ${window.fmt(r.taxa)}</small>` : ''}</p>
            <div class="acoes-sucesso">
                <a class="btn-magic btn-zap" href="${window.linkZap(telefone, window.textoPedidoZap(venda))}" target="_blank" rel="noopener">${window.ic('zap')} ${venda.status === 'Pago' ? 'Mandar recibo no WhatsApp' : 'Mandar resumo no WhatsApp'}</a>
                <button class="btn-magic btn-secundario" onclick="fecharModalMM(); abaVendas('historico')">${window.ic('recibo')} Ver no histórico</button>
                <button class="btn-magic" onclick="fecharModalMM()">${window.ic('mais')} Nova venda</button>
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
        const p = mapa.get(k), st = String(v.status).toLowerCase();
        p.linhas.push(v); p.total += val(v.valor_venda); p.lucro += val(v.lucro); p.custo += (v.custo_total || 0); p.taxa += (v.taxa || 0); p.desconto += (v.desconto || 0); p.pecas += parseFloat(v.qtd) || 0;
        if (st === 'cancelado') p.status = 'Cancelado'; else if (st === 'pendente' && p.status !== 'Cancelado') p.status = 'Pendente';
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
    HV.periodo = p; HV.limite = 30; $('hv-periodo').value = p;
    if (p === 'personalizado') { $('hv-filtros').hidden = false; if (!$('hv-de').value) $('hv-de').value = window.intervaloPeriodoMM('mes')[0]; }
    window.filtrarVendas();
};
window.situacaoHV = function(s) { HV.situacao = s; HV.limite = 30; window.filtrarVendas(); };
window.toggleFiltrosHV = function() { const f = $('hv-filtros'); f.hidden = !f.hidden; };
window.limparFiltrosVendas = function() {
    ['hv-busca', 'hv-de', 'hv-ate'].forEach(id => { $(id).value = ''; });
    ['hv-canal', 'hv-forma'].forEach(id => { $(id).value = ''; });
    HV.situacao = 'todas'; window.periodoHV('mes');
};
window.filtrarVendas = function() {
    if (!$('lista-vendas')) return;
    const pedidos = HV.pedidos = window.agruparPedidos(window.arrayVendas);
    const canais = [...new Set(pedidos.map(p => p.plataforma).filter(Boolean))].sort(), selC = $('hv-canal').value;
    $('hv-canal').innerHTML = '<option value="">Todos os canais</option>' + canais.map(c => `<option ${c === selC ? 'selected' : ''}>${esc(c)}</option>`).join('');
    const aReceberTodas = pedidos.filter(p => p.status === 'Pendente');
    $('vendas-badge-pend').innerText = aReceberTodas.length || '';

    // Busca e filtros valem para tudo; o período vale para Todas, Pagas e Canceladas.
    // "A receber" mostra tudo o que está em aberto, de qualquer data (é a lista de cobrança).
    const t = norm($('hv-busca').value).replace(/^#/, ''), canal = $('hv-canal').value, forma = $('hv-forma').value;
    const [ini, fim] = window.intervaloPeriodoMM(HV.periodo, $('hv-de').value, $('hv-ate').value);
    const bate = p => (!canal || p.plataforma === canal) && (!forma || p.forma === forma) && (!t || String(p.id) === t || window.buscaBate(t, p.cliente, p.obs, p.plataforma, ...p.linhas.map(l => l.produto)));
    const base = pedidos.filter(p => bate(p) && (!p.iso || (p.iso >= ini && p.iso <= fim)));
    const abertas = pedidos.filter(p => bate(p) && p.status === 'Pendente');
    const conta = { todas: base.length, pendente: abertas.length, pago: base.filter(p => p.status === 'Pago').length, cancelado: base.filter(p => p.status === 'Cancelado').length };
    $('hv-situacao').innerHTML = [['todas', 'Todas', ''], ['pendente', 'A receber', 'pend'], ['pago', 'Pagas', 'pago'], ['cancelado', 'Canceladas', 'canc']]
        .map(([k, r, c]) => `<button type="button" class="${c} ${HV.situacao === k ? 'active' : ''}" onclick="situacaoHV('${k}')">${r}<em>${conta[k] || ''}</em></button>`).join('');
    const flt = HV.filtrados = HV.situacao === 'todas' ? base : HV.situacao === 'pendente' ? abertas : base.filter(p => p.status === (HV.situacao === 'pago' ? 'Pago' : 'Cancelado'));
    $('hv-btn-filtros').classList.toggle('ativo', !!(canal || forma || HV.periodo === 'personalizado'));

    // Resumo do que está na tela (venda cancelada não entra nas contas)
    const soma = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
    const validas = flt.filter(p => p.status !== 'Cancelado');
    const total = soma(validas, p => p.total), recebido = soma(validas.filter(p => p.status === 'Pago'), p => p.total), lucro = soma(validas, p => p.lucro), pecas = soma(validas, p => p.pecas);
    const canceladas = flt.filter(p => p.status === 'Cancelado');
    $('hv-kpis').innerHTML = `<div class="hv-resumo">
        <div class="hv-res-top"><span>${HV.situacao === 'pendente' ? 'Em aberto · todas as datas' : `Vendido · ${esc(($('hv-periodo').selectedOptions[0] || { text: '' }).text.toLowerCase())}`}</span><b>${window.fmt(total)}</b>
            <small>${validas.length} ${validas.length === 1 ? 'venda' : 'vendas'} · ${pecas} ${pecas === 1 ? 'peça' : 'peças'}${validas.length ? ` · ticket médio ${window.fmt(total / validas.length)}` : ''}</small></div>
        <div class="hv-res-mini">
            <div class="verde"><small>Recebido</small><b>${window.fmt(recebido)}</b></div>
            <div class="laranja"><small>A receber</small><b>${window.fmt(total - recebido)}</b></div>
            <div class="azul"><small>Lucro</small><b>${window.fmt(lucro)}</b></div>
        </div>
        ${canceladas.length ? `<p class="hv-res-canc">${canceladas.length} cancelada${canceladas.length > 1 ? 's' : ''} (${window.fmt(soma(canceladas, p => p.total))}) não ${canceladas.length > 1 ? 'entram' : 'entra'} nas contas.</p>` : ''}
    </div>`;

    const lista = $('lista-vendas');
    if (!flt.length) { lista.innerHTML = `<div class="vazio-box">${window.ic('recibo')}<b>Nenhuma venda aqui</b><span>${pedidos.length ? 'Tente outro período ou toque em <a onclick="limparFiltrosVendas()">limpar filtros</a>.' : 'Lance a primeira em <a onclick="abaVendas(\'nova\')">Nova venda</a>.'}</span></div>`; return; }
    const mostrar = flt.slice(0, HV.limite), dias = new Map();
    mostrar.forEach(p => { const k = p.iso || 'sem-data'; if (!dias.has(k)) dias.set(k, []); dias.get(k).push(p); });
    let h = '';
    dias.forEach((ps, iso) => {
        const totDia = soma(ps.filter(p => p.status !== 'Cancelado'), p => p.total);
        h += `<div class="dia-cab"><span>${iso === 'sem-data' ? 'Sem data' : diaExtenso(iso)}</span><b>${window.fmt(totDia)}</b></div>`;
        h += ps.map(p => {
            const c = (SITUACAO[p.status] || SITUACAO.Pago)[1];
            return `<div class="vd st-${c}" onclick="abrirVenda(${p.id})" role="button" tabindex="0">
                <div class="vd-topo"><span class="vd-num">#${p.id}</span><b class="vd-cli">${esc(p.cliente)}</b>${pilula(p.status)}</div>
                <div class="vd-itens">${p.itens.map(i => `${i.qtd}x ${esc(i.nome)}`).join(' · ')}</div>
                <div class="vd-rodape"><span class="vd-meta">${[p.plataforma, p.forma].filter(Boolean).map(esc).join(' · ')}${p.obs ? ` · <span title="${esc(p.obs)}">${esc(p.obs.slice(0, 32))}</span>` : ''}</span>
                    ${p.status === 'Pendente' ? `<button type="button" class="vd-rapido" onclick="event.stopPropagation(); statusVenda(${p.id}, 'Pago', true)">${window.ic('check')}Recebi</button>` : ''}
                    <b class="vd-valor">${window.fmt(p.total)}</b></div>
            </div>`;
        }).join('');
    });
    if (flt.length > HV.limite) h += `<button class="btn-mais" onclick="HV.limite += 30; filtrarVendas()">Mostrar mais ${Math.min(30, flt.length - HV.limite)} de ${flt.length - HV.limite}</button>`;
    lista.innerHTML = h;
};

// Mais opções do histórico (o que é usado de vez em quando)
window.maisAcoesHV = function() {
    const nomes = [...new Set(HV.filtrados.map(p => p.cliente))];
    window.abrirModalMM(`<h3 class="modal-title">${window.ic('grade')} Mais opções</h3>
        <div class="menu-acoes">
            <button onclick="fecharModalMM(); abrirModalAcoesLote()">${window.ic('recibo')}<span><b>Cobranças e recibos em lote</b><small>PDF com tudo o que um cliente deve ou já pagou</small></span></button>
            <button ${nomes.length === 1 ? '' : 'disabled'} onclick="fecharModalMM(); copiarExtratoCliente()">${window.ic('copiar')}<span><b>Extrato do cliente</b><small>${nomes.length === 1 ? `Copiar o extrato de ${esc(nomes[0])} para o WhatsApp` : 'Busque o nome de um cliente primeiro'}</small></span></button>
            <button onclick="fecharModalMM(); limparFiltrosVendas()">${window.ic('filtro')}<span><b>Limpar filtros</b><small>Volta para "Este mês", todas as situações</small></span></button>
        </div>`);
};

// Extrato do cliente (texto pronto para colar no WhatsApp)
window.copiarExtratoCliente = function() {
    const ps = HV.filtrados.filter(p => p.status !== 'Cancelado'); if (!ps.length) return;
    let total = 0, aberto = 0;
    let txt = `*🧾 EXTRATO | MINI MUNDO 3D*\n*Cliente:* ${ps[0].cliente}\n\n`;
    ps.slice().reverse().forEach(p => {
        total += p.total; if (p.status === 'Pendente') aberto += p.total;
        txt += `📅 *${window.isoParaBrMM(p.iso)}* · Pedido #${p.id}\n${p.itens.map(i => `   ${i.qtd}x ${i.nome}`).join('\n')}\n   💰 ${window.fmt(p.total)} · ${p.status === 'Pago' ? '🟢 Pago' : '🟡 Pendente'}\n\n`;
    });
    txt += `*Total: ${window.fmt(total)}*${aberto > 0 ? `\n*Em aberto: ${window.fmt(aberto)}*` : ''}`;
    window.copiarTexto(txt, 'Extrato copiado. É só colar no WhatsApp!');
};

// ---------- DETALHE DA VENDA ----------
// Abrir uma venda vindo de outra tela (ex.: pedido do site já lançado)
window.verVenda = async function(id) { window.switchTab('vendas'); window.abaVendas('historico'); await window.carregarVendas(); window.abrirVenda(id); };
const vendaPorId = id => window.agruparPedidos(window.arrayVendas).find(p => p.id === id);
const pecasQueSairam = p => p.linhas.filter(l => l.baixa_estoque).reduce((s, l) => s + (parseFloat(l.qtd) || 0), 0);
window.abrirVenda = function(id) {
    const p = vendaPorId(id); if (!p) return;
    const pend = p.status === 'Pendente', canc = p.status === 'Cancelado', bruto = p.total + p.desconto;
    const notaLinha = l => canc ? (l.estoque_devolvido ? 'voltou para o Ateliê' : 'não tinha saído do Ateliê') : (l.baixa_estoque ? 'saiu do Ateliê' : 'não saiu do Ateliê (sob encomenda)');
    window.abrirModalMM(`<h3 class="modal-title">Venda #${p.id}</h3>
        <div class="vdet-topo st-${(SITUACAO[p.status] || SITUACAO.Pago)[1]}"><div><b>${esc(p.cliente)}</b><small>${diaExtenso(p.iso)}${p.criado_por ? ` · lançada por ${esc(p.criado_por)}` : ''}</small></div>${pilula(p.status)}</div>
        ${canc ? `<div class="mm-alerta">${window.ic('alerta')}<span>Venda cancelada: não entra nas contas. ${pecasQueSairam(p) || p.linhas.some(l => l.estoque_devolvido) ? 'As peças voltaram para o Ateliê.' : ''}</span></div>` : ''}
        <div class="ped-det-info">
            <div><small>Canal</small><b>${esc(p.plataforma || '—')}</b></div>
            <div><small>Pagamento</small><b>${esc(p.forma || '—')}${p.status === 'Pago' && p.data_pgt && p.data_pgt !== p.data ? `<i> em ${esc(p.data_pgt)}</i>` : ''}</b></div>
            <div><small>WhatsApp</small><b>${p.telefone ? esc(p.telefone) : '—'}</b></div>
        </div>
        ${p.obs ? `<div class="ped-det-obs">${window.ic('recibo')} ${esc(p.obs)}</div>` : ''}
        <div class="vdet-itens">${p.linhas.map(l => `<div class="vdi">
            <img src="${esc(fotoDe(produtoPorId(l.produto_id)) || 'logo.png')}" onerror="this.src='logo.png'" alt="">
            <div class="vdi-n"><b>${esc(l.qtd)}x ${esc(l.produto)}</b><small>${notaLinha(l)} · custo ${window.fmt(l.custo_total || 0)}</small></div>
            <b class="vdi-v">${window.fmt(val(l.valor_venda))}</b></div>`).join('')}</div>
        <div class="ped-det-tot">
            ${p.desconto > 0 ? `<div><span>Subtotal</span><span>${window.fmt(bruto)}</span></div><div><span>Desconto</span><span>− ${window.fmt(p.desconto)}</span></div>` : ''}
            <div class="grande"><span>Total</span><b>${window.fmt(p.total)}</b></div>
            <div><span>Custo de produção</span><span>${window.fmt(p.custo)}</span></div>
            ${p.taxa > 0 ? `<div><span>Taxa da plataforma</span><span>− ${window.fmt(p.taxa)}</span></div>` : ''}
            <div class="lucro ${p.lucro < 0 ? 'neg' : ''}"><span>Lucro</span><b>${window.fmt(p.lucro)}</b></div>
        </div>
        <div class="vdet-acoes">
            ${canc ? `<button class="btn-magic btn-azul" onclick="reativarVenda(${p.id})">${window.ic('desfazer')} Reativar venda</button>`
                : pend ? `<button class="btn-magic btn-global" onclick="statusVenda(${p.id}, 'Pago')">${window.ic('check')} Marcar como paga</button>`
                : `<button class="btn-magic btn-amarelo-leve" onclick="statusVenda(${p.id}, 'Pendente')">${window.ic('relogio')} Voltar para "a receber"</button>`}
            ${canc ? '' : `<a class="btn-magic btn-zap" href="${window.linkZap(p.telefone, window.textoPedidoZap(p))}" target="_blank" rel="noopener">${window.ic('zap')} ${pend ? 'Cobrar no WhatsApp' : 'Recibo no WhatsApp'}</a>`}
            <div class="vdet-grade">
                ${canc ? '' : `<button class="ac azul" onclick="editarItensVenda(${p.id})">${window.ic('pacote')}<span>Editar produtos</span></button>`}
                <button class="ac azul" onclick="editarDadosVenda(${p.id})">${window.ic('lapis')}<span>Editar dados</span></button>
                ${canc ? '' : `<button class="ac" onclick="pdfVenda(${p.id})">${window.ic('recibo')}<span>${pend ? 'PDF de cobrança' : 'PDF do recibo'}</span></button>`}
                ${canc ? '' : `<button class="ac laranja" onclick="cancelarVenda(${p.id})">${window.ic('x')}<span>Cancelar venda</span></button>`}
                <button class="ac vermelho" onclick="excluirVenda(${p.id})">${window.ic('lixo')}<span>Excluir</span></button>
            </div>
        </div>`);
};
async function recarregarVendas(id, msg) {
    await window.carregarVendas(); window.carregarBancoDeCustos();
    if (window.painelEstoque) window.carregarPainelEstoque();
    if (id && vendaPorId(id)) window.abrirVenda(id); else window.fecharModalMM();
    if (msg) window.toastMM(msg);
}
window.statusVenda = async function(id, novo, daLista) {
    try {
        await window.apiAcao('status_pedido', { pedido_id: id, novo_status: novo });
        if (daLista) { await window.carregarVendas(); window.toastMM(`Venda #${id} marcada como paga`); }
        else await recarregarVendas(id, novo === 'Pago' ? 'Pagamento registrado' : 'Voltou para "a receber"');
    } catch (e) { window.mostrarAlerta('Não deu certo', e.message, 'error'); }
};
window.pdfVenda = function(id) {
    const p = vendaPorId(id); if (!p) return;
    window.gerarHTMLImpressao({ [p.cliente]: p.linhas }, p.status === 'Pendente' ? 'Pendente' : 'Pago');
};
window.cancelarVenda = async function(id) {
    const p = vendaPorId(id); if (!p) return;
    const voltam = pecasQueSairam(p);
    const motivo = await window.pedirValorMM({ tipo: 'perigo', icone: '🚫', titulo: `Cancelar a venda #${id}?`, campo: 'text', valor: '', placeholder: 'Motivo (opcional). Ex.: cliente desistiu',
        html: `${esc(p.cliente)} · <b>${window.fmt(p.total)}</b><br>${voltam ? `<b>${voltam} peça${voltam > 1 ? 's voltam' : ' volta'} para o Ateliê.</b><br>` : ''}A venda fica na lista como <b>Cancelada</b> e sai das contas. Dá para reativar depois.`,
        ok: 'Cancelar venda', cancelar: 'Voltar' });
    if (motivo === null) return window.abrirVenda(id);
    try { const r = await window.apiAcao('cancelar_pedido', { pedido_id: id, motivo: motivo.trim() }); await recarregarVendas(id, r.voltaram ? `Venda cancelada · ${r.voltaram} peça(s) voltaram` : 'Venda cancelada'); }
    catch (e) { window.mostrarAlerta('Não deu certo', e.message, 'error'); }
};
window.reativarVenda = function(id) {
    const p = vendaPorId(id); if (!p) return;
    const voltam = p.linhas.filter(l => l.estoque_devolvido).reduce((s, l) => s + (parseFloat(l.qtd) || 0), 0);
    window.preencherModalMM(`<h3 class="modal-title">Reativar a venda #${id}</h3>
        <p class="texto-ajuda" style="margin-top:0;">${esc(p.cliente)} · <b>${window.fmt(p.total)}</b>. A venda volta a contar no caixa.${voltam ? ` <b>${voltam} peça(s) saem do Ateliê de novo</b> (se ainda tiver).` : ''}</p>
        <p class="bb-tit" style="margin-top:14px;">Ela já foi paga?</p>
        <div class="vdet-escolha">
            <button class="btn-magic btn-amarelo" onclick="confirmarReativar(${id}, 'Pendente')">${window.ic('relogio')} Ainda não (a receber)</button>
            <button class="btn-magic btn-global" onclick="confirmarReativar(${id}, 'Pago')">${window.ic('check')} Sim, já pagou</button>
        </div>
        <button class="btn-modal-cancel" style="width:100%;margin-top:10px;" onclick="abrirVenda(${id})">Voltar</button>`);
};
window.confirmarReativar = async function(id, status) {
    try {
        const r = await window.apiAcao('reativar_pedido', { pedido_id: id, status });
        await recarregarVendas(id, 'Venda reativada');
        if (r.sem_estoque && r.sem_estoque.length) window.mostrarAlerta('Reativada, mas…', `Não tinha no Ateliê: ${r.sem_estoque.join(', ')}. Essas peças ficaram sem baixa de estoque (como encomenda).`, 'warning');
    } catch (e) { window.mostrarAlerta('Não deu certo', e.message, 'error'); }
};
window.excluirVenda = async function(id) {
    const p = vendaPorId(id); if (!p) return;
    const voltam = pecasQueSairam(p);
    if (!await window.confirmarMM({ tipo: 'perigo', icone: '🗑️', titulo: `Excluir a venda #${id}?`, html: `${esc(p.cliente)} · <b>${window.fmt(p.total)}</b><br>Ela some de vez da lista e dos relatórios. <b>Não dá para desfazer.</b>${voltam ? `<br>${voltam} peça(s) voltam para o Ateliê.` : ''}<br><small>Se a venda só não aconteceu, prefira <b>Cancelar</b>: ela fica registrada.</small>`, ok: 'Excluir de vez', cancelar: 'Voltar' })) return window.abrirVenda(id);
    try { await window.apiAcao('excluir_pedido', { pedido_id: id }); await recarregarVendas(null, 'Venda excluída'); }
    catch (e) { window.mostrarAlerta('Não deu certo', e.message, 'error'); }
};

// ---------- EDITAR DADOS (cliente, data, canal, forma, situação, observação) ----------
window.editarDadosVenda = function(id) {
    const p = vendaPorId(id); if (!p) return;
    const canc = p.status === 'Cancelado';
    window.preencherModalMM(`<h3 class="modal-title">Editar dados da venda #${p.id}</h3>
        <div class="row"><div class="col"><div class="input-group"><label for="pe-cliente">Cliente</label><input type="text" id="pe-cliente" list="lista-clientes-venda" value="${esc(p.cliente)}"></div></div>
            <div class="col"><div class="input-group"><label for="pe-tel">WhatsApp</label><input type="tel" id="pe-tel" value="${esc(p.telefone)}" placeholder="11999998888"></div></div></div>
        <div class="row"><div class="col"><div class="input-group"><label for="pe-data">Data da venda</label><input type="date" id="pe-data" value="${esc(p.iso)}"></div></div>
            <div class="col"><div class="input-group"><label for="pe-canal">Canal</label><input type="text" id="pe-canal" list="lista-plataformas-venda" value="${esc(p.plataforma)}"></div></div></div>
        <div class="row"><div class="col"><div class="input-group"><label for="pe-forma">Forma de pagamento</label><select id="pe-forma"><option value="">—</option>${FORMAS.map(f => `<option ${f === p.forma ? 'selected' : ''}>${f}</option>`).join('')}</select></div></div>
            ${canc ? '' : `<div class="col"><div class="input-group"><label for="pe-status">Situação</label><select id="pe-status"><option value="Pago" ${p.status === 'Pago' ? 'selected' : ''}>Paga</option><option value="Pendente" ${p.status === 'Pendente' ? 'selected' : ''}>A receber</option></select></div></div>`}</div>
        <div class="input-group"><label for="pe-obs">Observação</label><input type="text" id="pe-obs" value="${esc(p.obs)}" maxlength="255"></div>
        <p class="texto-ajuda">Para mudar produtos, quantidades ou preços, use <b>Editar produtos</b>.</p>
        <div class="modal-botoes"><button class="btn-modal-cancel" onclick="abrirVenda(${p.id})">Voltar</button><button class="btn-modal-confirm" id="pe-salvar" onclick="salvarDadosVenda(${p.id})">Salvar</button></div>`);
};
window.salvarDadosVenda = async function(id) {
    const b = $('pe-salvar'); b.disabled = true;
    try {
        await window.apiAcao('atualizar_pedido', { pedido_id: id, cliente: $('pe-cliente').value, telefone: $('pe-tel').value, data_venda: $('pe-data').value, plataforma: $('pe-canal').value, forma_pgto: $('pe-forma').value, status: $('pe-status') ? $('pe-status').value : 'Pago', obs: $('pe-obs').value });
        await recarregarVendas(id, 'Dados atualizados');
    } catch (e) { window.mostrarAlerta('Não deu certo', e.message, 'error'); b.disabled = false; }
};

// ---------- EDITAR PRODUTOS DA VENDA (o estoque acompanha) ----------
// Cada linha lembra como estava (qtd e se tinha saído do Ateliê) para mostrar o que vai acontecer com o estoque.
window.EV = null;
window.editarItensVenda = function(id) {
    const p = vendaPorId(id); if (!p) return;
    window.EV = { id, desconto: p.desconto, itens: p.linhas.map(l => {
        const q = parseFloat(l.qtd) || 1;
        return { linha: l.linha, produto_id: l.produto_id || 0, nome: l.produto, qtd: q, unit: n2((val(l.valor_venda) + (l.desconto || 0)) / q), baixar: !!l.baixa_estoque, antes: { qtd: q, baixar: !!l.baixa_estoque, produto_id: l.produto_id } };
    }) };
    window.preencherModalMM(`<h3 class="modal-title">Produtos da venda #${id}</h3>
        <p class="texto-ajuda" style="margin-top:0;">Mude a quantidade e o preço, tire ou ponha produtos. O estoque do Ateliê acompanha sozinho.</p>
        <div id="ev-itens"></div>
        <button class="btn-limpar ev-add" onclick="addItemEV()">${window.ic('mais')} Adicionar produto</button>
        <div class="pdv-desconto"><label for="ev-desconto">Desconto na venda</label><input type="text" id="ev-desconto" class="mask-money" value="${p.desconto > 0 ? window.fmt(p.desconto) : ''}" placeholder="R$ 0,00" oninput="setTimeout(desenharEV)"></div>
        <div id="ev-resumo"></div>
        <div class="modal-botoes"><button class="btn-modal-cancel" onclick="abrirVenda(${id})">Voltar</button><button class="btn-modal-confirm" id="ev-salvar" onclick="salvarItensVenda()">Salvar</button></div>`);
    window.desenharEV();
};
// Quanto dá para tirar do Ateliê para esta linha: o que tem agora + o que esta linha já tinha tirado antes
const disponivelEV = it => estoqueDe(produtoPorId(it.produto_id)) + (it.antes && it.antes.baixar && it.antes.produto_id === it.produto_id ? it.antes.qtd : 0);
window.desenharEV = function() {
    const E = window.EV; if (!E || !$('ev-itens')) return;
    $('ev-itens').innerHTML = E.itens.length ? E.itens.map((it, i) => {
        const p = produtoPorId(it.produto_id), disp = disponivelEV(it), falta = it.baixar && it.qtd > disp;
        return `<div class="ev-item ${falta ? 'erro' : ''}">
            <img src="${esc(fotoDe(p) || 'logo.png')}" onerror="this.src='logo.png'" alt="">
            <div class="ev-info"><b>${esc(it.nome)}</b>
                ${p ? `<label class="ev-baixa"><input type="checkbox" ${it.baixar ? 'checked' : ''} onchange="EV.itens[${i}].baixar = this.checked; desenharEV()"> Sai do Ateliê <small>(tem ${disp})</small></label>` : '<small>produto sem cadastro</small>'}
                ${falta ? `<small class="ev-falta">Só tem ${disp} no Ateliê. Diminua ou desmarque.</small>` : ''}</div>
            <div class="pi-qtd"><button type="button" onclick="qtdEV(${i},-1)" aria-label="Menos">−</button><input type="number" min="1" value="${it.qtd}" onchange="EV.itens[${i}].qtd = Math.max(1, parseInt(this.value) || 1); desenharEV()" aria-label="Quantidade"><button type="button" onclick="qtdEV(${i},1)" aria-label="Mais">+</button></div>
            <div class="pi-preco"><input type="text" class="mask-money" value="${window.fmt(it.unit)}" oninput="setTimeout(() => { EV.itens[${i}].unit = limparValorPlanilha(this.value); resumoEV(); })" aria-label="Preço unitário"><small>por unidade</small></div>
            <button type="button" class="pi-x" onclick="EV.itens.splice(${i}, 1); desenharEV()" title="Tirar da venda" aria-label="Tirar ${esc(it.nome)}">${window.ic('x')}</button>
        </div>`;
    }).join('') : `<div class="pdv-vazio">${window.ic('carrinho')}<span>Nenhum produto. Adicione pelo menos um (para apagar a venda, use Excluir).</span></div>`;
    window.resumoEV();
};
window.qtdEV = function(i, d) { const it = window.EV.itens[i]; if (!it) return; it.qtd = Math.max(1, it.qtd + d); window.desenharEV(); };
window.resumoEV = function() {
    const E = window.EV; if (!E || !$('ev-resumo')) return;
    const sub = n2(E.itens.reduce((s, it) => s + it.unit * it.qtd, 0)), desconto = Math.min(val($('ev-desconto').value), sub);
    // Estoque: o que volta (linhas antigas que tinham saído) e o que sai (linhas marcadas), por produto
    const efeito = new Map();
    const somar = (pid, n) => { if (pid) efeito.set(pid, (efeito.get(pid) || 0) + n); };
    E.itens.forEach(it => { if (it.antes && it.antes.baixar) somar(it.antes.produto_id, it.antes.qtd); if (it.baixar) somar(it.produto_id, -it.qtd); });
    (vendaPorId(E.id) || { linhas: [] }).linhas.filter(l => l.baixa_estoque && !E.itens.some(it => it.linha === l.linha)).forEach(l => somar(l.produto_id, parseFloat(l.qtd) || 0));
    const nomeDe = pid => (produtoPorId(pid) || {}).modelo || `#${pid}`;
    const voltam = [...efeito].filter(([, n]) => n > 0).map(([pid, n]) => `${n} ${nomeDe(pid)}`), saem = [...efeito].filter(([, n]) => n < 0).map(([pid, n]) => `${-n} ${nomeDe(pid)}`);
    $('ev-resumo').innerHTML = `<div class="tot-linha"><span>Subtotal</span><b>${window.fmt(sub)}</b></div>
        ${desconto > 0 ? `<div class="tot-linha desc"><span>Desconto</span><b>− ${window.fmt(desconto)}</b></div>` : ''}
        <div class="tot-grande"><span>Novo total</span><b>${window.fmt(sub - desconto)}</b></div>
        ${voltam.length || saem.length ? `<div class="ev-estoque">${window.ic('arquivo')}<span><b>No Ateliê, ao salvar:</b> ${voltam.length ? `voltam ${voltam.join(', ')}` : ''}${voltam.length && saem.length ? ' · ' : ''}${saem.length ? `saem ${saem.join(', ')}` : ''}</span></div>` : '<div class="ev-estoque neutro">O estoque do Ateliê não muda.</div>'}`;
};
window.addItemEV = function() {
    window.escolherComFotos({ titulo: 'Adicionar produto', opcoes: opcoesComFoto(), aoEscolher: v => {
        const p = produtoPorId(parseInt(v)); if (!p) return;
        const ja = window.EV.itens.find(it => it.produto_id === p.linha && !it.linha);
        if (ja) ja.qtd++; else window.EV.itens.push({ linha: 0, produto_id: p.linha, nome: p.modelo, qtd: 1, unit: window.precoVendaDe(p), baixar: estoqueDe(p) >= 1, antes: null });
        window.desenharEV();
    } });
};
window.salvarItensVenda = async function() {
    const E = window.EV; if (!E) return;
    if (!E.itens.length) return window.mostrarAlerta('Venda sem produto', 'Adicione pelo menos um produto. Para apagar a venda inteira, use Excluir.', 'warning');
    const falta = E.itens.find(it => it.baixar && it.qtd > disponivelEV(it));
    if (falta) return window.mostrarAlerta('Falta no Ateliê', `Só tem ${disponivelEV(falta)} de "${falta.nome}" no Ateliê. Diminua a quantidade ou desmarque "Sai do Ateliê".`, 'warning');
    const b = $('ev-salvar'); b.disabled = true;
    try {
        await window.apiAcao('editar_itens_pedido', { pedido_id: E.id, desconto: window.fmtPlanilha(Math.min(val($('ev-desconto').value), E.itens.reduce((s, it) => s + it.unit * it.qtd, 0))),
            itens: E.itens.map(it => ({ linha: it.linha, produto_id: it.produto_id, produto: it.nome, qtd: it.qtd, valor_unit: window.fmtPlanilha(it.unit), baixar_estoque: it.baixar })) });
        window.EV = null;
        await recarregarVendas(E.id, 'Produtos atualizados');
    } catch (e) { window.mostrarAlerta('Não deu certo', e.message, 'error'); b.disabled = false; }
};

// Primeira abertura: data de hoje e estado inicial
document.addEventListener('DOMContentLoaded', () => {
    if ($('pdv-data')) $('pdv-data').value = window.isoHojeMM();
    if ($('pdv-itens')) window.renderizarCarrinhoPDV();
    // A barrinha do celular some quando o próprio total já está aparecendo na tela
    if ($('pdv-carrinho') && 'IntersectionObserver' in window) new IntersectionObserver(([e]) => { PDV.carrinhoNaTela = e.isIntersecting; window.atualizarBarraPDV(); }, { threshold: 0.12 }).observe($('pdv-carrinho'));
});
})();
