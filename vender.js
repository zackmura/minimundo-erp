// ==========================================
// 🛒 VENDER (painel do vendedor) e MINHAS VENDAS
// ==========================================
// Vender: as peças da mala em cartões com foto grande (tocar na foto abre em tela cheia).
// "Adicionar" põe no carrinho; no carrinho dá para mudar a quantidade, o preço de cada peça e tirar o que não vai.
// Ao fechar a venda: cliente (opcional), "já pagou" ou "vai pagar depois" e as contas: quanto o cliente paga,
// quanto vai para a Mini Mundo (repasse) e o lucro dele(a). O carrinho fica guardado no aparelho até lançar.
// Minhas vendas: quem comprou, quem ainda falta pagar (com botão de cobrar no WhatsApp), o lucro do mês e o acerto.
(() => {
const $ = window.$, esc = window.esc, ic = n => window.ic(n), fmt = v => window.fmt(v), val = v => window.limparValorPlanilha(v);
window.ACOES_DA_TELA_VENDEDOR.push('lancar_venda_vendedor', 'atualizar_venda_vendedor', 'cancelar_venda_vendedor');
const novosDados = () => ({ cliente: '', telefone: '', pago: false, forma: 'Pix', obs: '' });
window.VD = { carrinho: [], dono: null, cat: '', ops: [], dados: novosDados(), filtro: 'todas', aba: 'vendas' };
const FORMAS = ['Pix', 'Dinheiro', 'Cartão', 'Outro'];
const r2 = n => Math.round(n * 100) / 100;
const erroAmigavel = e => e.message === 'Ação não reconhecida.' ? 'O servidor ainda está na versão antiga. Peça para a Mini Mundo atualizar.' : e.message;
const dataMs = s => new Date(String(s || '').replace(' ', 'T') + '-03:00').getTime();
const mesAtual = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7);
const primeiroNome = s => String(s || '').trim().split(/\s+/)[0] || '';
const foto = (f, extra = '') => `<img src="${esc(f || 'logo.png')}" alt="" loading="lazy" onerror="this.src='logo.png'" ${extra}>`;

// ---------- Carrinho (guardado no aparelho, um por vendedor) ----------
const chave = () => 'mm_carrinho_' + (((window.painelVendedor || {}).vendedor || {}).id || 0);
const guardar = () => { try { localStorage.setItem(chave(), JSON.stringify({ itens: VD.carrinho, dados: VD.dados })); } catch (e) { /* aba anônima */ } };
window.vdGuardar = guardar;
function prepararCarrinho(d) {
    if (VD.dono !== d.vendedor.id) {
        VD.dono = d.vendedor.id; VD.carrinho = []; VD.dados = novosDados(); VD.cat = '';
        try { const s = JSON.parse(localStorage.getItem(chave()) || 'null'); if (s && Array.isArray(s.itens)) { VD.carrinho = s.itens; Object.assign(VD.dados, s.dados || {}); } } catch (e) { /* sem armazenamento */ }
    }
    // Só o que ainda está na mala, e no máximo o que tem
    VD.carrinho = VD.carrinho.map(c => { const e = d.estoque.find(x => x.produto_id === c.pid); return e ? { pid: c.pid, qtd: Math.min(c.qtd, e.qtd), preco: c.preco ?? null } : null; }).filter(c => c && c.qtd > 0);
}
const daMala = pid => ((window.painelVendedor || {}).estoque || []).find(x => x.produto_id === pid);
const noCarrinho = pid => VD.carrinho.find(c => c.pid === pid);
const precoDe = c => c.preco !== null && c.preco !== undefined ? c.preco : (daMala(c.pid) || {}).preco || 0;
function contas() {
    let total = 0, repasse = 0, pecas = 0;
    VD.carrinho.forEach(c => { const e = daMala(c.pid); if (!e) return; total += precoDe(c) * c.qtd; repasse += e.repasse * c.qtd; pecas += c.qtd; });
    return { total: r2(total), repasse: r2(repasse), lucro: r2(total - repasse), pecas };
}
const htmlContas = k => `<div class="total"><span>O cliente paga</span><b>${fmt(k.total)}</b></div>
    <div><span>Vai para a Mini Mundo (repasse)</span><b>${fmt(k.repasse)}</b></div>
    <div class="lucro ${k.lucro < 0 ? 'neg' : ''}"><span>Seu lucro</span><b>${fmt(k.lucro)}</b></div>`;
const aReceber = d => { const l = (d.vendas || []).filter(v => !v.pago); return { total: r2(l.reduce((s, v) => s + v.total, 0)), n: l.length }; };

// ---------- Tela Vender ----------
function cartaoVenda(e) {
    const c = noCarrinho(e.produto_id), q = c ? c.qtd : 0, n = (e.fotos || []).length;
    const img = e.foto ? `<button type="button" class="vd-foto" onclick="verFotosVendedor(${e.produto_id})" aria-label="Ver as fotos de ${esc(e.nome)}">${foto(e.foto)}<span class="vd-lupa">${ic('busca')}</span>${n > 1 ? `<span class="vd-nfotos">${ic('camera')}${n}</span>` : ''}`
        : `<div class="vd-foto sem">${foto('')}`;
    return `<div class="vd-card ${q ? 'no-carrinho' : ''}" id="vd-card-${e.produto_id}">
        ${img}${q ? `<span class="vd-selo">${ic('check')}${q} no carrinho</span>` : ''}${e.foto ? '</button>' : '</div>'}
        <div class="vd-info"><b class="vd-nome">${esc(e.nome)}</b>
            <div class="vd-meta"><span>Com você: <b>${e.qtd}</b></span>${window.chipMedidas(e.produto_id, e.medidas)}</div>
            <div class="vd-preco"><strong>${fmt(e.preco)}</strong><small>repasse ${fmt(e.repasse)}</small></div></div>
        ${q ? `<div class="vd-passo"><button type="button" aria-label="Tirar um" onclick="mudarCarrinho(${e.produto_id}, -1)">−</button><b>${q}</b><button type="button" aria-label="Mais um" onclick="mudarCarrinho(${e.produto_id}, 1)" ${q >= e.qtd ? 'disabled' : ''}>+</button></div>`
            : `<button type="button" class="vd-add" onclick="mudarCarrinho(${e.produto_id}, 1)">${ic('mais')} Adicionar</button>`}
    </div>`;
}
function resumoVenda(d) {
    const pecas = d.estoque.reduce((s, e) => s + e.qtd, 0), rec = aReceber(d);
    $('v-resumo').innerHTML = `<div class="resumo-faixa">
        <div class="rf roxo"><small>Peças</small><b>${pecas}</b><i>com você</i></div>
        <button type="button" class="rf laranja" onclick="abrirMinhasVendas('receber')"><small>A receber</small><b>${fmt(rec.total)}</b><i>${rec.n ? `${rec.n} venda(s)` : 'dos clientes'}</i></button>
        <button type="button" class="rf" onclick="abrirMinhasVendas('acerto')"><small>Você me deve</small><b>${fmt(d.pendente_total)}</b><i>ver o acerto</i></button></div>
        ${d.estoque.length ? `<p class="texto-ajuda v-dica">Toque em <b>Adicionar</b> nas peças que o cliente levou e depois em <b>Fechar a venda</b>. Toque na foto para ver maior.</p>` : ''}`;
}
function chipsVenda(d) {
    const cats = [...new Set(d.estoque.map(e => e.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const ops = [['', 'Todas', d.estoque.length]];
    if (VD.carrinho.length) ops.push(['carrinho:', 'No carrinho', VD.carrinho.length]);
    if (d.estoque.some(e => e.tipo === 'kit') && d.estoque.some(e => e.tipo !== 'kit')) ops.push(['kit:', 'Kits', d.estoque.filter(e => e.tipo === 'kit').length]);
    if (cats.length > 1) cats.forEach(c => ops.push([c, c, d.estoque.filter(e => e.categoria === c).length]));
    if (!ops.some(o => o[0] === VD.cat)) VD.cat = '';
    VD.ops = ops;
    $('vd-cats').innerHTML = ops.length > 1 ? ops.map(([k, r, n], i) => `<button type="button" class="chip-op ${VD.cat === k ? 'active' : ''} ${k === 'carrinho:' ? 'destaque' : ''}" onclick="vdCategoria(${i})">${esc(r)} <em>${n}</em></button>`).join('') : '';
}
window.vdCategoria = i => { VD.cat = (VD.ops[i] || [''])[0]; window.renderizarVendedorEstoque(); };
function gradeVenda(d) {
    const t = $('v-busca-estoque').value || '';
    const lista = d.estoque.filter(e => window.buscaBate(t, e.nome, e.categoria) && (VD.cat === '' || (VD.cat === 'kit:' ? e.tipo === 'kit' : VD.cat === 'carrinho:' ? noCarrinho(e.produto_id) : e.categoria === VD.cat)));
    $('v-lista-estoque').innerHTML = !d.estoque.length ? `<div class="vazio-box">${ic('mala')}<b>Você ainda não tem peças</b><span>Quando a Mini Mundo te enviar uma mala, elas aparecem aqui. 🧳</span></div>`
        : lista.length ? lista.map(cartaoVenda).join('') : `<div class="vazio-box pequeno">${ic('busca')}<b>Nenhuma peça encontrada</b><span>Tente outra palavra ou outra categoria.</span></div>`;
}
function barraCarrinho() {
    const b = $('vd-barra'); if (!b) return; const k = contas();
    b.hidden = !k.pecas; $('tab-v_estoque').classList.toggle('com-carrinho', !!k.pecas);
    if (k.pecas) b.innerHTML = `${ic('carrinho')}<span>${k.pecas} ${k.pecas === 1 ? 'peça' : 'peças'} no carrinho<b>${fmt(k.total)}</b></span><em>Fechar a venda</em>`;
}
window.renderizarVendedorEstoque = function() {
    const d = window.painelVendedor; if (!d) return;
    prepararCarrinho(d); resumoVenda(d); chipsVenda(d); gradeVenda(d); barraCarrinho();
    $('v-vitrine').innerHTML = d.vendedor.codigo_vitrine && d.estoque.length ? `<div class="filtros-box" style="margin-top:20px;text-align:center;">
        <div class="filtros-title" style="justify-content:center;">🛍️ Sua vitrine online</div>
        <p style="font-size:0.8rem;color:var(--text-muted);font-weight:600;margin-top:-8px;">Mande para os clientes: mostra só as peças que estão com você, com botão pro seu WhatsApp.</p>
        <div class="row"><div class="col"><button class="btn-limpar" style="width:100%;padding:12px;" onclick="window.copiarTexto('${window.linkVitrine(d.vendedor.codigo_vitrine)}', 'Link da sua vitrine copiado!')">🔗 Copiar link</button></div>
        <div class="col"><a class="btn-limpar" style="display:block;padding:12px;text-decoration:none;" target="_blank" href="${window.linkVitrine(d.vendedor.codigo_vitrine)}">👀 Ver vitrine</a></div></div></div>` : '';
};
window.mudarCarrinho = function(pid, d) {
    const e = daMala(pid); if (!e) return;
    let c = noCarrinho(pid);
    if (!c && d > 0) { c = { pid, qtd: 0, preco: null }; VD.carrinho.push(c); }
    if (!c) return;
    if (d > 0 && c.qtd >= e.qtd) return window.toastMM(`Você só tem ${e.qtd} com você`);
    c.qtd = Math.max(0, Math.min(e.qtd, c.qtd + d));
    if (!c.qtd) VD.carrinho = VD.carrinho.filter(x => x !== c);
    guardar();
    const dd = window.painelVendedor, card = $('vd-card-' + pid);
    if (VD.cat === 'carrinho:' && !c.qtd) { chipsVenda(dd); gradeVenda(dd); }
    else { if (card) card.outerHTML = cartaoVenda(e); chipsVenda(dd); }
    barraCarrinho();
    if ($('vd-sheet')) desenharCarrinho();
};
window.tirarDoCarrinho = function(pid) {
    const c = noCarrinho(pid); if (c) window.mudarCarrinho(pid, -c.qtd);
};

// ---------- Fechar a venda (carrinho) ----------
function itemCarrinho(c) {
    const e = daMala(c.pid), p = precoDe(c);
    return `<div class="vd-item" id="vd-it-${c.pid}">
        ${e.foto ? `<button type="button" class="vd-item-foto" onclick="verFotosVendedor(${c.pid})" aria-label="Ver as fotos de ${esc(e.nome)}">${foto(e.foto)}</button>` : `<span class="vd-item-foto">${foto('')}</span>`}
        <div class="vd-item-info"><b>${esc(e.nome)}</b><small>Com você: ${e.qtd} · repasse ${fmt(e.repasse)} cada</small></div>
        <button type="button" class="btn-ic perigo" title="Tirar do carrinho" aria-label="Tirar ${esc(e.nome)} do carrinho" onclick="tirarDoCarrinho(${c.pid})">${ic('lixo')}</button>
        <div class="vd-item-linha">
            <div class="vd-passo mini"><button type="button" aria-label="Tirar um" onclick="mudarCarrinho(${c.pid}, -1)">−</button><b>${c.qtd}</b><button type="button" aria-label="Mais um" onclick="mudarCarrinho(${c.pid}, 1)" ${c.qtd >= e.qtd ? 'disabled' : ''}>+</button></div>
            <span class="vd-x">×</span>
            <label class="vd-preco-campo" title="Preço de cada peça">R$<input type="text" inputmode="decimal" value="${p.toFixed(2).replace('.', ',')}" aria-label="Preço de cada ${esc(e.nome)}" oninput="vdPreco(${c.pid}, this.value)" onfocus="this.select()"></label>
            <span class="vd-sub" id="vd-sub-${c.pid}">${fmt(p * c.qtd)}</span></div>
        <div class="vd-aviso" id="vd-av-${c.pid}" ${p < e.repasse ? '' : 'hidden'}>Abaixo do repasse: você perde ${fmt(e.repasse - p)} em cada peça.</div></div>`;
}
window.abrirCarrinhoVendedor = function() {
    if (!VD.carrinho.length) return;
    window.abrirModalMM(`<h3 class="modal-title">${ic('carrinho')} Fechar a venda</h3><div id="vd-sheet"></div>`);
    desenharCarrinho();
};
function desenharCarrinho() {
    const box = $('vd-sheet'); if (!box) return;
    if (!VD.carrinho.length) { window.fecharModalMM(); return; }
    const D = VD.dados, k = contas();
    box.innerHTML = `<div class="vd-itens">${VD.carrinho.map(itemCarrinho).join('')}</div>
        <div class="vd-linha-bt"><button type="button" class="btn-limpar" onclick="fecharModalMM()">${ic('mais')} Pôr mais peças</button><button type="button" class="btn-limpar" onclick="esvaziarCarrinho()">${ic('lixo')} Esvaziar</button></div>
        <div class="vd-secao">Cliente <small>(opcional, ajuda a cobrar depois)</small></div>
        <div class="row"><div class="col"><div class="input-group"><label for="vd-cliente">Nome</label><input id="vd-cliente" type="text" maxlength="120" autocomplete="off" value="${esc(D.cliente)}" placeholder="Ex.: Maria" oninput="VD.dados.cliente = this.value; vdGuardar()"></div></div>
            <div class="col"><div class="input-group"><label for="vd-tel">WhatsApp</label><input id="vd-tel" type="tel" inputmode="tel" maxlength="20" autocomplete="off" value="${esc(D.telefone)}" placeholder="(11) 98888-7777" oninput="VD.dados.telefone = this.value; vdGuardar()"></div></div></div>
        <div class="vd-secao">O cliente já pagou?</div>
        <div class="seg-mini largo vd-pago" id="vd-pago"><button type="button" class="${D.pago ? '' : 'active'}" onclick="vdPago(false)">${ic('relogio')} Vai pagar depois</button><button type="button" class="${D.pago ? 'active' : ''}" onclick="vdPago(true)">${ic('check')} Já pagou</button></div>
        <div class="vd-formas" id="vd-formas" ${D.pago ? '' : 'hidden'}>${FORMAS.map(f => `<button type="button" class="chip-op ${D.forma === f ? 'active' : ''}" onclick="vdForma('${f}')">${f}</button>`).join('')}</div>
        <div class="input-group" style="margin-top:12px;"><label for="vd-obs">Observação <small style="font-weight:600;color:var(--text-muted);">(opcional)</small></label><input id="vd-obs" type="text" maxlength="255" autocomplete="off" value="${esc(D.obs)}" placeholder="Ex.: entregar no sábado" oninput="VD.dados.obs = this.value; vdGuardar()"></div>
        <div class="vd-contas" id="vd-contas">${htmlContas(k)}</div>
        <button class="btn-magic btn-global" id="btn-vd-lancar" onclick="lancarVendaVendedor()">${ic('check')} Lançar venda · ${fmt(k.total)}</button>
        <p class="texto-ajuda vd-nota">As peças saem da sua mala e o repasse entra no seu acerto com a Mini Mundo.</p>`;
}
function atualizarContas() {
    const k = contas(); if ($('vd-contas')) $('vd-contas').innerHTML = htmlContas(k);
    const b = $('btn-vd-lancar'); if (b && !b.disabled) b.innerHTML = `${ic('check')} Lançar venda · ${fmt(k.total)}`;
    barraCarrinho();
}
window.vdPreco = function(pid, v) {
    const c = noCarrinho(pid), e = daMala(pid); if (!c || !e) return;
    c.preco = String(v).trim() === '' ? null : r2(val(v)); guardar();
    const p = precoDe(c), av = $('vd-av-' + pid);
    $('vd-sub-' + pid).textContent = fmt(p * c.qtd);
    av.hidden = !(p < e.repasse); if (!av.hidden) av.textContent = `Abaixo do repasse: você perde ${fmt(e.repasse - p)} em cada peça.`;
    atualizarContas();
};
window.vdPago = function(p) {
    VD.dados.pago = p; guardar();
    document.querySelectorAll('#vd-pago button').forEach((b, i) => b.classList.toggle('active', (i === 1) === p));
    $('vd-formas').hidden = !p;
};
window.vdForma = function(f) { VD.dados.forma = f; guardar(); document.querySelectorAll('#vd-formas button').forEach(b => b.classList.toggle('active', b.textContent === f)); };
window.esvaziarCarrinho = async function() {
    if (!await window.confirmarMM({ tipo: 'perigo', icone: '🛒', titulo: 'Esvaziar o carrinho?', texto: 'As peças continuam na sua mala. Só sai do carrinho.', ok: 'Esvaziar', cancelar: 'Voltar' })) return window.abrirCarrinhoVendedor();
    VD.carrinho = []; VD.dados = novosDados(); guardar(); window.fecharModalMM(); window.renderizarVendedorEstoque();
};
const resumoZap = (itens, total, pago) => `Olá${pago.cliente ? `, ${primeiroNome(pago.cliente)}` : ''}! Aqui é ${window.painelVendedor.vendedor.nome}, da Mini Mundo 😊\n\nResumo da sua compra:\n${itens.map(i => `• ${i.qtd}x ${i.nome}: ${fmt(i.preco * i.qtd)}`).join('\n')}\n\n*Total: ${fmt(total)}*\n${pago.pago ? `Pagamento recebido${pago.forma ? ` (${pago.forma})` : ''}. Agradeço a preferência!` : 'Fica para pagar depois, combinado? Agradeço a preferência!'}`;
window.lancarVendaVendedor = async function() {
    const D = VD.dados, tel = String(D.telefone || '').replace(/\D/g, '');
    if (tel && tel.length < 10) return window.mostrarAlerta('WhatsApp incompleto', 'Coloque o WhatsApp com DDD, ou deixe em branco.', 'warning');
    const k = contas(), b = $('btn-vd-lancar'); b.disabled = true; b.innerHTML = '<span class="girando"></span> Lançando a venda…';
    const itens = VD.carrinho.map(c => { const e = daMala(c.pid); return { produto_id: c.pid, qtd: c.qtd, preco: precoDe(c), nome: e.nome }; });
    try {
        const r = await window.apiAcao('lancar_venda_vendedor', { itens: itens.map(({ produto_id, qtd, preco }) => ({ produto_id, qtd, preco })), cliente: D.cliente.trim(), telefone: tel, pago: D.pago, forma: D.pago ? D.forma : '', obs: D.obs.trim() });
        const cli = { ...D }; VD.carrinho = []; VD.dados = novosDados(); VD.cat = ''; guardar();
        const z = tel ? window.linkZap(tel, resumoZap(itens, r.total, cli)) : '';
        window.abrirModalMM(`<div class="mm-sucesso"><span class="modal-icon-alert ok">🎉</span><h3 class="modal-title-alert">Venda #${r.venda_id} lançada!</h3>
            <div class="vd-contas">${htmlContas(r)}</div>
            <p class="modal-text-alert">${cli.pago ? `Recebido${cli.forma ? ` no ${esc(cli.forma)}` : ''}. ✅` : `Ficou <b>a receber</b>${cli.cliente ? ` de ${esc(cli.cliente)}` : ''}. Quando pagar, toque em <b>Recebi</b> em Minhas vendas.`}<br>Agora você me deve <b>${fmt(r.pendente_total)}</b> no total.</p>
            ${z ? `<a class="btn-magic btn-zap" target="_blank" rel="noopener" href="${esc(z)}">${ic('zap')} Mandar o resumo para ${esc(primeiroNome(cli.cliente) || 'o cliente')}</a>` : ''}
            <button class="btn-modal-ok ok" onclick="fecharModalMM()">Nova venda</button>
            <button class="btn-limpar" style="width:100%;margin-top:8px;padding:11px;" onclick="fecharModalMM(); abrirMinhasVendas('todas')">${ic('recibo')} Ver minhas vendas</button></div>`);
        window.carregarPainelVendedor();
    } catch (e) { window.mostrarAlerta('Não deu para lançar', erroAmigavel(e), 'warning'); b.disabled = false; b.innerHTML = `${ic('check')} Lançar venda · ${fmt(k.total)}`; }
};

// ---------- Minhas vendas ----------
window.abrirMinhasVendas = function(o) {
    if (o === 'acerto') VD.aba = 'acerto'; else { VD.aba = 'vendas'; VD.filtro = o || 'todas'; }
    if (document.querySelector('#tab-v_vendas.active')) window.renderizarMinhasVendas(); else window.switchTab('v_vendas');
};
const vendaDe = id => ((window.painelVendedor || {}).vendas || []).find(v => v.id === id);
const cobranca = v => `Olá${v.cliente ? `, ${primeiroNome(v.cliente)}` : ''}! Tudo bem? Aqui é ${window.painelVendedor.vendedor.nome}, da Mini Mundo 😊\n\nPassando para lembrar do pagamento da sua compra de ${window.fmtDataHora(v.data_hora).slice(0, 8)}:\n${v.itens.map(i => `• ${i.qtd}x ${i.nome}`).join('\n')}\n\n*Total: ${fmt(v.total)}*\n\nAgradeço a preferência!`;
function cartaoVendaFeita(v) {
    const podeCancelar = !v.parte_acertada && (!!window.vendedorVisto || (Date.now() - dataMs(v.data_hora)) < 48 * 3600 * 1000);
    const z = v.telefone ? window.linkZap(v.telefone, v.pago ? `Olá${v.cliente ? `, ${primeiroNome(v.cliente)}` : ''}! Aqui é ${window.painelVendedor.vendedor.nome}, da Mini Mundo 😊` : cobranca(v)) : '';
    return `<div class="vv-card ${v.pago ? 'pago' : ''}">
        <div class="vv-topo"><div><b>${esc(v.cliente || 'Cliente sem nome')}</b><small>Venda #${v.id} · ${window.fmtDataHora(v.data_hora)}${v.pedido_site_id ? ' · 🌐 pelo seu site' : ''}</small></div>
            <span class="pc-st ${v.pago ? 'verde' : 'laranja'}">${v.pago ? `Recebido${v.forma ? ` · ${esc(v.forma)}` : ''}` : 'A receber'}</span></div>
        <div class="vv-itens">${v.itens.map(i => `<div class="vv-it">${foto(i.foto)}<span>${i.qtd}× ${esc(i.nome)}</span>${i.preco !== null ? `<em>${fmt(i.preco * i.qtd)}</em>` : ''}</div>`).join('')}</div>
        ${v.obs ? `<p class="vv-obs">💬 ${esc(v.obs)}</p>` : ''}
        <div class="vv-contas"><span>Cliente paga<b>${fmt(v.total)}</b></span><span>Repasse<b>${fmt(v.repasse)}</b></span><span>Seu lucro<b class="${v.lucro < 0 ? 'neg' : 'pos'}">${fmt(v.lucro)}</b></span></div>
        <div class="vv-acoes">
            ${v.pago ? '' : `<button type="button" class="btn-vendi" onclick="receberVenda(${v.id}, true)">${ic('check')} Recebi</button>`}
            ${z ? `<a class="vv-zap ${v.pago ? 'claro' : ''}" target="_blank" rel="noopener" href="${esc(z)}">${ic('zap')} ${v.pago ? 'WhatsApp' : 'Cobrar'}</a>` : ''}
            <span class="vv-espaco"></span>
            ${v.pago ? `<button type="button" class="btn-ic" onclick="receberVenda(${v.id}, false)" title="Marquei por engano: voltar para a receber" aria-label="Voltar a venda #${v.id} para a receber">${ic('relogio')}</button>` : ''}
            <button type="button" class="btn-ic" title="Editar cliente e observação" aria-label="Editar a venda #${v.id}" onclick="editarVendaVendedor(${v.id})">${ic('lapis')}</button>
            ${podeCancelar ? `<button type="button" class="btn-ic perigo" title="Errei: desfazer a venda (as peças voltam para a sua mala)" aria-label="Desfazer a venda #${v.id}" onclick="cancelarVendaVendedor(${v.id})">${ic('desfazer')}</button>` : ''}
        </div>
        <small class="vv-acerto ${v.acertado ? 'ok' : ''}">${v.acertado ? `${ic('check')} Repasse já acertado com a Mini Mundo` : v.parte_acertada ? 'Parte do repasse já foi acertada com a Mini Mundo' : 'Repasse ainda não acertado com a Mini Mundo'}</small>
    </div>`;
}
function listaVendas() {
    const d = window.painelVendedor, box = $('vv-lista'); if (!d || !box) return;
    const t = ($('vv-busca') || {}).value || '', vendas = d.vendas || [];
    const lista = vendas.filter(v => (VD.filtro === 'receber' ? !v.pago : VD.filtro === 'recebidas' ? v.pago : true) && window.buscaBate(t, v.cliente, ...v.itens.map(i => i.nome)));
    const antigas = d.baixas.filter(b => !b.venda_vendedor_id);
    box.innerHTML = (lista.length ? lista.map(cartaoVendaFeita).join('')
        : `<div class="vazio-box pequeno">${ic('recibo')}<b>${vendas.length ? 'Nenhuma venda aqui' : 'Nenhuma venda ainda'}</b><span>${vendas.length ? 'Tente outro filtro.' : 'Quando você lançar uma venda em Vender, ela aparece aqui.'}</span></div>`)
        + (antigas.length && VD.filtro === 'todas' && !t ? `<details class="vv-antigas"><summary>Vendas registradas antes do carrinho (${antigas.length})</summary>${antigas.map(b => `<div class="mm-linha"><span class="mm-nome">${b.qtd}x ${esc(b.produto_nome)} · repasse ${fmt(b.repasse_total)}<span class="mm-sub">${window.fmtDataHora(b.data_hora)} · ${b.status === 'Pago' ? 'acertado' : 'falta acertar'}</span></span></div>`).join('')}</details>` : '');
}
window.renderizarMinhasVendas = function() {
    const d = window.painelVendedor, box = $('v-vendas'); if (!d || !box) return;
    const vendas = d.vendas || [], rec = aReceber(d), mes = mesAtual(), doMes = vendas.filter(v => String(v.data_hora).slice(0, 7) === mes);
    const lucroMes = r2(doMes.reduce((s, v) => s + v.lucro, 0)), vendidoMes = r2(doMes.reduce((s, v) => s + v.total, 0));
    const nRec = vendas.filter(v => !v.pago).length, nPago = vendas.length - nRec;
    const topo = `<div class="resumo-faixa">
        <button type="button" class="rf laranja" onclick="abrirMinhasVendas('receber')"><small>A receber</small><b>${fmt(rec.total)}</b><i>${rec.n ? `de ${rec.n} venda(s)` : 'ninguém devendo'}</i></button>
        <button type="button" class="rf ${d.pendente_total > 0 ? 'roxo' : ''}" onclick="abrirMinhasVendas('acerto')"><small>Você me deve</small><b>${fmt(d.pendente_total)}</b><i>ver o acerto</i></button>
        <div class="rf verde"><small>Lucro no mês</small><b>${fmt(lucroMes)}</b><i>de ${fmt(vendidoMes)}</i></div></div>
        <div class="seg-mini largo vv-seg"><button type="button" class="${VD.aba === 'vendas' ? 'active' : ''}" onclick="VD.aba = 'vendas'; renderizarMinhasVendas()">${ic('recibo')} Vendas <em>${vendas.length || ''}</em></button><button type="button" class="${VD.aba === 'acerto' ? 'active' : ''}" onclick="VD.aba = 'acerto'; renderizarMinhasVendas()">${ic('dinheiro')} Acerto <em>${d.pendente_total > 0 ? fmt(d.pendente_total) : ''}</em></button></div>`;
    if (VD.aba === 'acerto') { box.innerHTML = topo + `<div id="vv-acerto">${htmlAcerto(d)}</div>`; return; }
    const busca = ($('vv-busca') || {}).value || '';
    box.innerHTML = topo + `<div class="chips-rolagem">${[['todas', 'Todas', vendas.length], ['receber', 'A receber', nRec], ['recebidas', 'Recebidas', nPago]]
            .map(([k, r, n]) => `<button type="button" class="chip-op ${VD.filtro === k ? 'active' : ''} ${k === 'receber' && n ? 'destaque' : ''}" onclick="VD.filtro = '${k}'; renderizarMinhasVendas()">${r} <em>${n || ''}</em></button>`).join('')}</div>
        ${vendas.length > 3 ? `<div class="busca-ic"><svg class="ic"><use href="#i-busca"/></svg><input type="search" id="vv-busca" placeholder="Buscar cliente ou peça…" autocomplete="off" enterkeyhint="search" value="${esc(busca)}" oninput="vvBuscar()"></div>` : ''}
        <div id="vv-lista"></div>`;
    listaVendas();
};
window.vvBuscar = () => listaVendas();
window.receberVenda = async function(id, pago) {
    const v = vendaDe(id); if (!v) return;
    if (!pago) {
        if (!await window.confirmarMM({ icone: '↩️', titulo: 'Voltar para "a receber"?', texto: 'Use se você marcou "recebi" por engano.', ok: 'Voltar para a receber', cancelar: 'Cancelar' })) return;
        return window.salvarVendaVendedor(id, { pago: false });
    }
    window.abrirModalMM(`<h3 class="modal-title">${ic('dinheiro')} Recebi${v.cliente ? ` de ${esc(primeiroNome(v.cliente))}` : ''}</h3>
        <p class="texto-ajuda" style="margin-top:0;">Venda #${v.id} · <b>${fmt(v.total)}</b>. Como o cliente pagou?</p>
        <div class="vd-formas grande">${FORMAS.map(f => `<button type="button" class="chip-op" onclick="salvarVendaVendedor(${id}, { pago: true, forma: '${f}' })">${f}</button>`).join('')}</div>`);
};
window.salvarVendaVendedor = async function(id, dados) {
    document.querySelectorAll('#modal-mm-conteudo button').forEach(b => { b.disabled = true; });
    try {
        await window.apiAcao('atualizar_venda_vendedor', { id, ...dados });
        window.fecharModalMM(); window.toastMM(dados.pago === true ? 'Recebido! 💰' : dados.pago === false ? 'Voltou para "a receber"' : 'Venda atualizada');
        await window.carregarPainelVendedor();
    } catch (e) { window.mostrarAlerta('Não deu', erroAmigavel(e), 'warning'); document.querySelectorAll('#modal-mm-conteudo button').forEach(b => { b.disabled = false; }); }
};
window.editarVendaVendedor = function(id) {
    const v = vendaDe(id); if (!v) return;
    window.abrirModalMM(`<h3 class="modal-title">${ic('lapis')} Venda #${v.id}</h3>
        <div class="input-group"><label for="ev-cliente">Nome do cliente</label><input id="ev-cliente" type="text" maxlength="120" value="${esc(v.cliente)}" placeholder="Ex.: Maria"></div>
        <div class="input-group"><label for="ev-tel">WhatsApp</label><input id="ev-tel" type="tel" inputmode="tel" maxlength="20" value="${esc(v.telefone)}" placeholder="(11) 98888-7777"></div>
        <div class="input-group"><label for="ev-obs">Observação</label><input id="ev-obs" type="text" maxlength="255" value="${esc(v.obs)}"></div>
        <button class="btn-magic btn-global" onclick="salvarEdicaoVenda(${v.id})">${ic('check')} Salvar</button>`);
};
window.salvarEdicaoVenda = function(id) {
    const tel = $('ev-tel').value.replace(/\D/g, '');
    if (tel && tel.length < 10) return window.mostrarAlerta('WhatsApp incompleto', 'Coloque o WhatsApp com DDD, ou deixe em branco.', 'warning');
    window.salvarVendaVendedor(id, { cliente: $('ev-cliente').value, telefone: tel, obs: $('ev-obs').value });
};
window.cancelarVendaVendedor = async function(id) {
    const v = vendaDe(id); if (!v) return;
    if (!await window.confirmarMM({ tipo: 'perigo', icone: '↩️', titulo: `Desfazer a venda #${v.id}?`, texto: `As peças voltam para a sua mala e o repasse de ${fmt(v.repasse)} sai do seu acerto.`, ok: 'Desfazer a venda', cancelar: 'Voltar' })) return;
    try { await window.apiAcao('cancelar_venda_vendedor', { id }); window.toastMM('Venda desfeita. As peças voltaram para a mala.'); await window.carregarPainelVendedor(); }
    catch (e) { window.mostrarAlerta('Não deu', erroAmigavel(e), 'warning'); }
};

// ---------- Acerto (o que vai para a Mini Mundo) ----------
// Igual ao "Meu acerto" de antes, agora com o nome do cliente em cada venda
function htmlAcerto(d) {
    const pend = d.baixas.filter(b => b.status === 'Pendente'), pagas = d.baixas.filter(b => b.status === 'Pago').slice(0, 30);
    const cliente = b => { const v = b.venda_vendedor_id && vendaDe(b.venda_vendedor_id); return v && v.cliente ? ` · ${esc(v.cliente)}` : ''; };
    const agora = Date.now(), podeCancelar = b => b.origem === 'VENDEDOR' && (agora - dataMs(b.data_hora)) < 48 * 3600 * 1000;
    const msgPago = `Olá! Aqui é ${d.vendedor.nome} 👋\n\nFiz o pagamento do repasse das minhas vendas:\n\n${pend.map(b => `• ${b.qtd}x ${b.produto_nome}: ${fmt(b.repasse_total)}`).join('\n')}\n\n💰 *Total: ${fmt(d.pendente_total)}*\n\n(segue o comprovante)`;
    return `<div class="kpis"><div class="kpi destaque" style="text-align:center;"><span class="kpi-rotulo">Você me deve</span>
            <span class="kpi-valor" style="color:${d.pendente_total > 0 ? '#fbbf24' : '#6ee7b7'};">${fmt(d.pendente_total)}</span>
            <span class="kpi-sub">${d.pendente_qtd} peça(s) vendida(s) aguardando acerto</span></div></div>
        ${d.pendente_total > 0 && d.telefone_admin ? `<a class="btn-magic btn-global" style="margin:0 0 16px;" target="_blank" href="${window.linkZap(d.telefone_admin, msgPago)}">📲 Avisar que paguei (WhatsApp)</a>` : ''}
        <div class="secao-tit">${ic('relogio')}Aguardando acerto</div>
        ${pend.length ? pend.map(b => `<div class="mm-linha"><span class="mm-nome">${b.qtd}x ${esc(b.produto_nome)} · <b style="color:#b45309;">${fmt(b.repasse_total)}</b><span class="mm-sub">${window.fmtDataHora(b.data_hora)}${cliente(b)}${b.origem === 'CONFERENCIA' ? ' · 📋 diferença encontrada na conferência' : ''}</span></span>
            ${podeCancelar(b) ? `<button class="btn-novera btn-n-apagar" title="Errei, cancelar" onclick="window.cancelarBaixa(${b.id}, false)">✖</button>` : ''}</div>`).join('') : '<p class="mm-vazio">Tudo em dia! ✅</p>'}
        <div class="secao-tit">${ic('check')}Acertos feitos</div>
        ${d.acertos.length ? d.acertos.map(a => `<div class="mm-linha"><span class="mm-nome">${fmt(a.valor)} · ${esc(a.forma || '')}<span class="mm-sub">${window.fmtDataHora(a.data_hora)} · ${a.qtd_baixas} venda(s)</span></span></div>`).join('') : '<p class="mm-vazio">Nenhum acerto ainda.</p>'}
        ${pagas.length ? `<details style="margin-top:10px;"><summary style="cursor:pointer;font-size:0.8rem;font-weight:800;color:var(--text-muted);">Últimas vendas já acertadas</summary>${pagas.map(b => `<div class="mm-linha"><span class="mm-nome">${b.qtd}x ${esc(b.produto_nome)} · ${fmt(b.repasse_total)}<span class="mm-sub">${window.fmtDataHora(b.data_hora)}${cliente(b)}</span></span></div>`).join('')}</details>` : ''}`;
}
// O carregarPainelVendedor chama esta depois de buscar os dados: atualiza "Meu acerto" e "Minhas vendas"
window.renderizarVendedorAcerto = function() {
    const d = window.painelVendedor; if (!d) return;
    if ($('v-acerto')) $('v-acerto').innerHTML = htmlAcerto(d);
    window.renderizarMinhasVendas();
};
})();
