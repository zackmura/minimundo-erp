// ==========================================
// 📊 DASHBOARD
// ==========================================
// Junta vendas da loja, repasses dos vendedores, despesas e estoque num período.
// Faturamento = vendas diretas + repasses gerados pelos vendedores (a parte que é sua).
// Caixa = o que entrou de fato (vendas pagas + acertos recebidos) − despesas.
(() => {
const $ = window.$;
const esc = s => window.esc(s);
const val = v => window.limparValorPlanilha(v);
const brIso = s => window.brParaIsoMM(s);
const soma = (arr, f) => arr.reduce((s, x) => s + (f(x) || 0), 0);
const noIntervalo = (iso, a, b) => !!iso && iso >= a && iso <= b;
const isoDe = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

window.DASH = { periodo: 'mes', vendas: [], despesas: [], baixas: [], painel: null, grafico: null };

window.carregarDashboardERP = async function() {
    $('dash-carregando').hidden = false;
    try {
        const [v, d, b, p] = await Promise.all(['listar_vendas', 'listar_despesas', 'listar_baixas', 'painel_estoque'].map(a => window.apiAcao(a)));
        Object.assign(DASH, { vendas: v.vendas, despesas: d.despesas, baixas: b.baixas, painel: p });
        window.arrayVendas = v.vendas; window.painelEstoque = p; window.configMM = p.config;
        window.renderizarDashboard();
    } catch (e) { $('dash-conteudo').innerHTML = `<div class="vazio-box">${window.ic('alerta')}<b>Não consegui carregar o painel</b><span>${esc(e.message)}</span></div>`; }
    finally { $('dash-carregando').hidden = true; }
};
window.periodoDash = function(p) {
    DASH.periodo = p;
    document.querySelectorAll('#dash-chips button').forEach(b => b.classList.toggle('active', b.dataset.p === p));
    $('dash-datas').hidden = p !== 'personalizado';
    if (p === 'personalizado' && !$('dash-de').value) { const h = new Date(); $('dash-de').value = isoDe(new Date(h.getFullYear(), h.getMonth(), 1)); $('dash-ate').value = isoDe(h); }
    window.renderizarDashboard();
};

// Período atual e o período de comparação (mesmo pedaço do mês/ano anterior, pra comparação justa)
function periodos() {
    const h = new Date(), hoje = isoDe(h), y = h.getFullYear(), m = h.getMonth(), d = h.getDate();
    const ultimoDia = (yy, mm) => new Date(yy, mm + 1, 0).getDate();
    switch (DASH.periodo) {
        case 'mes': return { atual: [isoDe(new Date(y, m, 1)), hoje], ant: [isoDe(new Date(y, m - 1, 1)), isoDe(new Date(y, m - 1, Math.min(d, ultimoDia(y, m - 1))))], rot: 'mesmos dias do mês passado' };
        case 'mesant': return { atual: [isoDe(new Date(y, m - 1, 1)), isoDe(new Date(y, m, 0))], ant: [isoDe(new Date(y, m - 2, 1)), isoDe(new Date(y, m - 1, 0))], rot: 'mês anterior' };
        case '3m': return { atual: [isoDe(new Date(y, m - 2, 1)), hoje], ant: [isoDe(new Date(y, m - 5, 1)), isoDe(new Date(y, m - 3, Math.min(d, ultimoDia(y, m - 3))))], rot: '3 meses anteriores' };
        case 'ano': return { atual: [`${y}-01-01`, hoje], ant: [`${y - 1}-01-01`, isoDe(new Date(y - 1, m, Math.min(d, ultimoDia(y - 1, m))))], rot: 'mesmo período do ano passado' };
        case '12m': return { atual: [isoDe(new Date(y, m - 11, 1)), hoje], ant: [isoDe(new Date(y, m - 23, 1)), isoDe(new Date(y - 1, m, Math.min(d, ultimoDia(y - 1, m))))], rot: '12 meses anteriores' };
        case 'personalizado': {
            const a = $('dash-de').value || '0000-01-01', b = $('dash-ate').value || '9999-12-31';
            if (a.startsWith('0000') || b.startsWith('9999')) return { atual: [a, b], ant: null };
            const dias = Math.round((new Date(b) - new Date(a)) / 864e5) + 1, fimAnt = new Date(a + 'T12:00:00'); fimAnt.setDate(fimAnt.getDate() - 1);
            const iniAnt = new Date(fimAnt); iniAnt.setDate(iniAnt.getDate() - dias + 1);
            return { atual: [a, b], ant: [isoDe(iniAnt), isoDe(fimAnt)], rot: `${dias} dias anteriores` };
        }
        default: return { atual: ['0000-01-01', '9999-12-31'], ant: null };
    }
}

function metricas(ini, fim) {
    const vs = DASH.vendas.filter(v => noIntervalo(brIso(v.data), ini, fim));
    const bs = DASH.baixas.filter(b => noIntervalo(String(b.data_hora || '').slice(0, 10), ini, fim));
    const loja = soma(vs, v => val(v.valor_venda)), vend = soma(bs, b => b.repasse_total);
    const lucro = soma(vs, v => val(v.lucro)) + soma(bs, b => b.repasse_total - b.custo_unit * b.qtd);
    const recLoja = soma(DASH.vendas.filter(v => String(v.status).toLowerCase() === 'pago' && noIntervalo(brIso(v.data_pgt) || brIso(v.data), ini, fim)), v => val(v.valor_venda));
    const recVend = soma(DASH.baixas.filter(b => b.status === 'Pago' && noIntervalo(String(b.data_pgto || '').slice(0, 10), ini, fim)), b => b.repasse_total);
    const desp = soma(DASH.despesas.filter(x => noIntervalo(brIso(x.data), ini, fim)), x => val(x.valor));
    const pedidos = new Set(vs.map(v => v.pedido_id || v.linha)).size;
    return { vs, bs, loja, vend, fat: loja + vend, lucro, recebido: recLoja + recVend, recLoja, recVend, desp, saldo: recLoja + recVend - desp, pedidos, ticket: pedidos ? loja / pedidos : 0, pecas: soma(vs, v => parseFloat(v.qtd)) + soma(bs, b => b.qtd) };
}
const variacao = (atual, ant, inverter) => {
    if (ant === null || ant === undefined) return '';
    if (!ant) return atual > 0 ? '<span class="delta neutro">novo</span>' : '';
    const pct = Math.round((atual - ant) / Math.abs(ant) * 100); if (!pct) return '<span class="delta neutro">= igual</span>';
    const bom = inverter ? pct < 0 : pct > 0;
    return `<span class="delta ${bom ? 'bom' : 'ruim'}">${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}%</span>`;
};
const barrasHtml = (itens, fmtV, cor) => {
    if (!itens.length) return '<p class="mm-vazio">Nada no período.</p>';
    const max = Math.max(...itens.map(i => i.v)) || 1;
    return `<div class="barras">${itens.map((i, k) => `<div class="barra-item"><div class="bi-topo"><span class="bi-nome">${k < 3 && i.medalha !== false ? ['🥇', '🥈', '🥉'][k] + ' ' : ''}${esc(i.nome)}</span><b>${fmtV(i)}</b></div><div class="bi-trilho"><span style="width:${Math.max(3, i.v / max * 100)}%;background:${i.cor || cor}"></span></div>${i.sub ? `<small>${i.sub}</small>` : ''}</div>`).join('')}</div>`;
};
const agrupar = (arr, chave, valor) => { const m = new Map(); arr.forEach(x => { const k = chave(x); if (!k) return; m.set(k, (m.get(k) || 0) + valor(x)); }); return m; };

window.renderizarDashboard = function() {
    if (!DASH.painel) return;
    const P = periodos(), A = metricas(...P.atual), B = P.ant ? metricas(...P.ant) : null, cmp = k => B ? variacao(A[k], B[k], k === 'desp') : '';
    const rotCmp = B ? `<span class="dash-cmp">Comparando com ${P.rot}</span>` : '';
    // "A receber" é sempre o total em aberto hoje (não depende do período)
    const pendVendas = DASH.vendas.filter(v => String(v.status).toLowerCase() === 'pendente'), pendLoja = soma(pendVendas, v => val(v.valor_venda));
    const pendVend = soma(DASH.painel.pendentes, p => p.total);
    const margem = A.fat > 0 ? Math.round(A.lucro / A.fat * 100) : 0;

    const kpi = (ic, rot, valor, sub, delta, cor = '') => `<div class="kpi kpi-ic ${cor}"><span class="kpi-icone">${window.ic(ic)}</span><span class="kpi-rotulo">${rot}</span><span class="kpi-valor">${valor}</span><span class="kpi-sub">${delta || ''} ${sub}</span></div>`;
    let h = `<div class="dash-kpis">
        <div class="kpi-heroi">
            <span class="kh-rot">Saldo do caixa no período</span>
            <span class="kh-valor ${A.saldo < 0 ? 'kh-neg' : ''}">${window.fmt(A.saldo)}</span>
            <div class="kh-linhas"><span>Entrou <b>${window.fmt(A.recebido)}</b></span><span>Saiu <b>${window.fmt(A.desp)}</b></span></div>
            ${rotCmp}
        </div>
        ${kpi('tendencia', 'Faturamento', window.fmt(A.fat), `Loja ${window.fmt(A.loja)} · Vendedores ${window.fmt(A.vend)}`, cmp('fat'))}
        ${kpi('dinheiro', 'Lucro', window.fmt(A.lucro), `margem de ${margem}%`, cmp('lucro'), 'verde')}
        ${kpi('check', 'Recebido', window.fmt(A.recebido), `loja ${window.fmt(A.recLoja)} · acertos ${window.fmt(A.recVend)}`, cmp('recebido'), 'azul')}
        ${kpi('carteira', 'Despesas', window.fmt(A.desp), 'compras e custos', cmp('desp'), 'vermelho')}
        ${kpi('relogio', 'A receber hoje', window.fmt(pendLoja + pendVend), `clientes ${window.fmt(pendLoja)} · vendedores ${window.fmt(pendVend)}`, '', 'laranja')}
        ${kpi('etiqueta', 'Ticket médio', window.fmt(A.ticket), `${A.pedidos} pedido(s) · ${A.pecas} peça(s)`, cmp('ticket'))}
    </div>`;

    // Gráfico mês a mês (12 meses até o fim do período)
    h += `<div class="card"><div class="card-cabeca"><div><div class="card-titulo">Faturamento e lucro por mês</div><p class="card-desc" style="margin:0;">Loja e vendedores empilhados; a linha é o lucro.</p></div></div><div class="grafico-caixa"><canvas id="dash-grafico"></canvas></div></div>`;

    // Canais, produtos, clientes, vendedores
    // "Venda direta" e "Venda Direta" são o mesmo canal: agrupa ignorando maiúsculas e mostra o nome mais usado
    const nomeCanal = new Map(); A.vs.forEach(v => { const k = String(v.plataforma || 'Sem canal').trim().toLowerCase(); if (!nomeCanal.has(k)) nomeCanal.set(k, String(v.plataforma || 'Sem canal').trim()); });
    const canais = new Map([...agrupar(A.vs, v => String(v.plataforma || 'Sem canal').trim().toLowerCase(), v => val(v.valor_venda))].map(([k, v]) => [nomeCanal.get(k), v]));
    if (A.vend > 0) canais.set('Vendedores (repasse)', A.vend);
    const totCanais = [...canais.values()].reduce((s, v) => s + v, 0) || 1;
    const coresCanal = ['#d97706', '#7c3aed', '#2563eb', '#059669', '#db2777', '#0891b2', '#78716c'];
    const listaCanais = [...canais].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([nome, v], i) => ({ nome, v, medalha: false, cor: nome.startsWith('Vendedores') ? '#7c3aed' : coresCanal[i % coresCanal.length], sub: `${Math.round(v / totCanais * 100)}% do faturamento` }));
    const qtdProd = agrupar(A.vs, v => v.produto, v => parseFloat(v.qtd) || 0), valProd = agrupar(A.vs, v => v.produto, v => val(v.valor_venda));
    A.bs.forEach(b => { qtdProd.set(b.produto_nome, (qtdProd.get(b.produto_nome) || 0) + b.qtd); valProd.set(b.produto_nome, (valProd.get(b.produto_nome) || 0) + b.repasse_total); });
    const listaProd = [...qtdProd].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([nome, v]) => ({ nome, v, sub: window.fmt(valProd.get(nome) || 0) }));
    const pedCli = new Map(); A.vs.forEach(v => { const c = v.cliente || 'Cliente avulso'; if (!pedCli.has(c)) pedCli.set(c, new Set()); pedCli.get(c).add(v.pedido_id || v.linha); });
    const listaCli = [...agrupar(A.vs, v => v.cliente || 'Cliente avulso', v => val(v.valor_venda))].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([nome, v]) => ({ nome, v, sub: `${pedCli.get(nome).size} pedido(s)` }));
    const vendNome = id => { const x = DASH.painel.vendedores.find(v => v.id === id); return x ? x.nome : `#${id}`; };
    const pecasVend = agrupar(A.bs, b => b.vendedor_id, b => b.qtd);
    const listaVend = [...agrupar(A.bs, b => b.vendedor_id, b => b.repasse_total)].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, v]) => ({ nome: vendNome(id), v, sub: `${pecasVend.get(id)} peça(s) vendidas` }));

    h += `<div class="dash-grade">
        <div class="card"><div class="card-titulo">Por canal</div><p class="card-desc">De onde vem o faturamento.</p>${barrasHtml(listaCanais, i => window.fmt(i.v), '#d97706')}</div>
        <div class="card"><div class="card-titulo">Produtos mais vendidos</div><p class="card-desc">Peças vendidas (loja + vendedores).</p>${barrasHtml(listaProd, i => `${i.v} un`, '#d97706')}</div>
        <div class="card"><div class="card-titulo">Melhores clientes</div><p class="card-desc">Quem mais comprou direto com você.</p>${barrasHtml(listaCli, i => window.fmt(i.v), '#2563eb')}</div>
        <div class="card"><div class="card-titulo">Vendedores</div><p class="card-desc">Repasse gerado no período.</p>${barrasHtml(listaVend, i => window.fmt(i.v), '#7c3aed')}</div>
    </div>`;

    // Estoque e atenção
    const Pn = DASH.painel, minimo = parseInt(Pn.config.estoque_minimo) || 0;
    const prod = id => Pn.produtos.find(p => p.id === id);
    let pecasAt = 0, custoAt = 0, pecasVd = 0, repVd = 0;
    Pn.estoque.forEach(e => { const p = prod(e.produto_id); if (!p || e.qtd <= 0) return; if (e.vendedor_id === 0) { pecasAt += e.qtd; custoAt += e.qtd * p.custo; } else { pecasVd += e.qtd; repVd += e.qtd * (p.repasse || 0); } });
    const qtdAt = id => { const e = Pn.estoque.find(x => x.produto_id === id && x.vendedor_id === 0); return e ? e.qtd : 0; };
    const baixos = Pn.produtos.filter(p => p.ativo && minimo > 0 && qtdAt(p.id) > 0 && qtdAt(p.id) <= minimo);
    const semRepasse = Pn.produtos.filter(p => p.ativo && !p.repasse).length;
    const hojeIso = window.isoHojeMM(), diasDesde = iso => iso ? Math.max(0, Math.round((new Date(hojeIso) - new Date(iso)) / 864e5)) : 0;
    const pedidosPend = new Map(); pendVendas.forEach(v => { const k = v.pedido_id || v.linha; const iso = brIso(v.data); if (!pedidosPend.has(k) || iso < pedidosPend.get(k)) pedidosPend.set(k, iso); });
    const atrasados = [...pedidosPend.values()].filter(iso => diasDesde(iso) > 7).length;
    const encPend = (Pn.encomendas || []).filter(e => ['Pendente', 'Produzindo'].includes(e.status)).length;
    const atencao = [];
    if (pedidosPend.size) atencao.push(['relogio', `${pedidosPend.size} venda(s) a receber · ${window.fmt(pendLoja)}`, atrasados ? `${atrasados} há mais de 7 dias` : 'todas recentes', "switchTab('vendas'); abaVendas('historico'); periodoHV('areceber')", atrasados ? 'ruim' : '']);
    Pn.pendentes.filter(p => p.total > 0).sort((a, b) => b.total - a.total).forEach(p => atencao.push(['usuarios', `${esc(vendNome(p.vendedor_id))} te deve ${window.fmt(p.total)}`, `${p.n} venda(s) sem acerto${p.mais_antiga ? ` · desde ${window.fmtDataHora(p.mais_antiga).slice(0, 8)}` : ''}`, `switchTab('vendedores'); abrirVendedor(${p.vendedor_id})`, diasDesde(String(p.mais_antiga || '').slice(0, 10)) > 30 ? 'ruim' : '']));
    if (encPend) atencao.push(['presente', `${encPend} encomenda(s) de vendedores`, 'pendentes ou em produção', "switchTab('vendedores')", '']);
    if (baixos.length) atencao.push(['alerta', `${baixos.length} produto(s) acabando no Ateliê`, baixos.slice(0, 3).map(p => esc(p.nome)).join(', ') + (baixos.length > 3 ? '…' : ''), "switchTab('estoque')", '']);
    if (semRepasse) atencao.push(['etiqueta', `${semRepasse} produto(s) sem preço de repasse`, 'não podem ir na mala dos vendedores', "switchTab('modelos'); filtroProdutos('semrepasse')", '']);

    h += `<div class="dash-grade">
        <div class="card"><div class="card-titulo">Precisa de atenção</div><p class="card-desc">Toque para resolver.</p>
            ${atencao.length ? `<div class="atencao">${atencao.map(([ic, t, s, acao, cls]) => `<button class="at-item ${cls}" onclick="${acao}"><span class="at-ic">${window.ic(ic)}</span><span class="at-txt"><b>${t}</b><small>${s}</small></span>${window.ic('seta-dir', 'at-seta')}</button>`).join('')}</div>`
            : `<div class="vazio-box pequeno ok">${window.ic('check')}<b>Tudo em dia</b><span>Nenhuma pendência agora.</span></div>`}</div>
        <div class="card"><div class="card-titulo">Estoque agora</div><p class="card-desc">Peças prontas e quanto valem.</p>
            <div class="mini-kpis">
                <div><small>No Ateliê</small><b>${pecasAt} peças</b><span>custo ${window.fmt(custoAt)}</span></div>
                <div><small>Com vendedores</small><b>${pecasVd} peças</b><span>repasse ${window.fmt(repVd)}</span></div>
            </div>
            <button class="btn-limpar" style="width:100%;margin-top:12px;" onclick="switchTab('estoque')">Abrir o estoque</button></div>
    </div>`;
    $('dash-conteudo').innerHTML = h;
    desenharGrafico(P.atual[1].startsWith('9999') ? hojeIso : (P.atual[1] > hojeIso ? hojeIso : P.atual[1]));
};

function desenharGrafico(fimIso) {
    const cv = $('dash-grafico'); if (!cv || typeof Chart === 'undefined') return;
    const fim = new Date(fimIso + 'T12:00:00'), meses = [];
    for (let i = 11; i >= 0; i--) { const d = new Date(fim.getFullYear(), fim.getMonth() - i, 1); meses.push({ chave: isoDe(d).slice(0, 7), rot: `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, loja: 0, vend: 0, lucro: 0 }); }
    const doMes = k => meses.find(m => m.chave === k);
    DASH.vendas.forEach(v => { const m = doMes(brIso(v.data).slice(0, 7)); if (m) { m.loja += val(v.valor_venda); m.lucro += val(v.lucro); } });
    DASH.baixas.forEach(b => { const m = doMes(String(b.data_hora || '').slice(0, 7)); if (m) { m.vend += b.repasse_total; m.lucro += b.repasse_total - b.custo_unit * b.qtd; } });
    if (DASH.grafico) DASH.grafico.destroy();
    Chart.defaults.font.family = 'Inter'; Chart.defaults.color = '#78716c';
    DASH.grafico = new Chart(cv.getContext('2d'), {
        type: 'bar',
        data: { labels: meses.map(m => m.rot), datasets: [
            { type: 'line', label: 'Lucro', data: meses.map(m => Math.round(m.lucro * 100) / 100), borderColor: '#059669', backgroundColor: '#059669', tension: .35, pointRadius: 3, borderWidth: 2.5, order: 0 },
            { type: 'bar', label: 'Loja', data: meses.map(m => Math.round(m.loja * 100) / 100), backgroundColor: '#f59e0b', borderRadius: 6, stack: 'f', order: 1, maxBarThickness: 38 },
            { type: 'bar', label: 'Vendedores', data: meses.map(m => Math.round(m.vend * 100) / 100), backgroundColor: '#8b5cf6', borderRadius: 6, stack: 'f', order: 1, maxBarThickness: 38 }
        ] },
        options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 16 } }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${window.fmt(c.parsed.y)}` } } },
            scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, grid: { color: '#f0ece8' }, ticks: { callback: v => 'R$ ' + Number(v).toLocaleString('pt-BR') } } } }
    });
}
})();
