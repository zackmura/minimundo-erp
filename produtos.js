// ==========================================
// 🧮 PRECIFICAR (cadastro de peça e kit) + 📋 PRODUTOS
// ==========================================
// Peça: custo = filamento + energia + máquina + mão de obra + taxa de falha + extras.
// Kit: custo = soma das peças que vão nele + extras do kit (embalagem, fita...).
// Os custos da impressora ficam nos Ajustes do servidor (valem para todos os aparelhos).
(() => {
const $ = window.$;
const esc = s => window.esc(s);
const val = v => window.limparValorPlanilha(v);
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? 0 : n; };
const n2 = v => Math.round((parseFloat(v) || 0) * 100) / 100;
const PADRAO = { imp_watts: 175, imp_kwh: 0.70, imp_maq_hora: 0.75, imp_hora: 10, filamento_kg: 100, taxa_falha: 10, multiplicador_venda: 3, markup_repasse: 100, margem_vendedor: 50 };
const cfg = k => { const v = (window.configMM || {})[k]; return v === undefined || v === '' ? PADRAO[k] : num(v); };
const fotoDe = p => String((p && (p.foto || p.foto_catalogo)) || '').split(',')[0].trim();
const produtoPorId = id => (window.arrayBancoCustos || []).find(p => p.linha === id);
const dinheiroCampo = id => $(id) && $(id).value ? val($(id).value) : 0;

// fotos: fotos já enviadas de um produto novo (ficam no rascunho); fotoEnvio: envio em andamento;
// fotoSeq: descarta envio que terminou depois de o formulário ser limpo. Produto já salvo guarda as fotos na hora.
window.PF = { tipo: 'peca', editando: null, kit: [], custo: 0, fotos: [], fotoEnvio: null, fotoSeq: 0 };
const apagarRascunho = () => window.rascunhoApagar && window.rascunhoApagar('precificar');
const guardarRascunho = () => window.rascunhoGuardar && window.rascunhoGuardar('precificar');

// ---------- CARREGAR PRODUTOS (usado por várias telas) ----------
window.carregarBancoDeCustos = async function() {
    const ld = $('loading-banco'); if (ld) ld.style.display = 'block';
    try {
        window.arrayBancoCustos = (await window.apiAcao('listar_custos')).produtos;
        window.renderizarProdutos(); window.pfMontarListas();
        if (window.renderizarCatalogoPDV) { window.renderizarCatalogoPDV(); window.renderizarCarrinhoPDV(); }
        if (window.renderizarKits) window.renderizarKits();
    } catch (e) { if ($('lista-produtos')) $('lista-produtos').innerHTML = `<p class="mm-vazio">Não consegui carregar os produtos: ${esc(e.message)}</p>`; }
    finally { if (ld) ld.style.display = 'none'; }
};

// ==========================================
// 📋 LISTA DE PRODUTOS
// ==========================================
window.PL = { filtro: 'todos' };
window.filtroProdutos = function(f) { PL.filtro = f; document.querySelectorAll('#pl-filtros button').forEach(b => b.classList.toggle('active', b.dataset.f === f)); window.renderizarProdutos(); };
window.filtrarBanco = () => window.renderizarProdutos(); // nome antigo
window.renderizarProdutos = function() {
    const box = $('lista-produtos'); if (!box) return;
    const todos = window.arrayBancoCustos || [], t = $('busca-banco').value;
    window.montarFiltroCategoria('pl-categoria', todos); const cat = $('pl-categoria').value;
    const conta ={ todos: todos.filter(p => p.ativo !== false).length, peca: todos.filter(p => p.ativo !== false && p.tipo !== 'kit').length, kit: todos.filter(p => p.ativo !== false && p.tipo === 'kit').length, semrepasse: todos.filter(p => p.ativo !== false && !p.preco_repasse).length, inativos: todos.filter(p => p.ativo === false).length };
    document.querySelectorAll('#pl-filtros button').forEach(b => { const n = conta[b.dataset.f]; b.querySelector('em').innerText = n || ''; });
    const lista = todos.filter(p => {
        if (PL.filtro === 'inativos' ? p.ativo !== false : p.ativo === false) return false;
        if (PL.filtro === 'peca' && p.tipo === 'kit') return false;
        if (PL.filtro === 'kit' && p.tipo !== 'kit') return false;
        if (PL.filtro === 'semrepasse' && p.preco_repasse) return false;
        return window.categoriaBate(p, cat) && window.produtoBate(p, t);
    });
    if (!lista.length) { box.innerHTML = `<div class="vazio-box">${window.ic('pacote')}<b>${todos.length ? 'Nenhum produto nesse filtro' : 'Nenhum produto ainda'}</b><span>${todos.length ? '' : 'Cadastre o primeiro em <a onclick="novoProduto()">Precificar</a>.'}</span></div>`; return; }
    box.innerHTML = `<div class="tabela-prod"><div class="tp-cab"><span>Produto</span><span>Custo</span><span>Venda</span><span>Repasse</span><span>Margem</span><span>Estoque</span></div>`
        + lista.map(p => {
            const custo = val(p.custo_total), venda = p.preco_venda || 0, margem = venda > 0 ? Math.round((venda - custo) / venda * 100) : null;
            const sub = (p.tipo === 'kit' ? `<span class="tag-kit">Kit · ${p.itens.reduce((s, i) => s + i.qtd, 0)} peças</span>` : `${esc(p.peso || 0)}g · ${esc(p.tempo || 0)}h`);
            // No celular as colunas somem e o resumo (venda · repasse · margem) aparece embaixo do nome
            const resumo = `${venda ? 'Venda ' + window.fmt(venda) : 'sem preço'} · ${p.preco_repasse ? 'repasse ' + window.fmt(p.preco_repasse) : '<b class="neg">sem repasse</b>'}${margem !== null ? ` · <span class="${margem < 30 ? 'neg' : ''}">${margem}%</span>` : ''}`;
            return `<div class="tp-linha ${p.ativo === false ? 'inativo' : ''}" onclick="abrirEdicaoProduto(${p.linha})" role="button" tabindex="0" title="Editar">
                <div class="tp-prod">${window.fotoRapida(p.linha, fotoDe(p))}<div><b>${esc(p.modelo)}${p.ativo === false ? ' <span class="tag-inativo">Inativo</span>' : ''}</b><small>${p.categoria ? esc(p.categoria) + ' · ' : ''}${sub}</small><small class="tp-resumo">${resumo}</small>${window.chipMedidas(p.linha, p.medidas)}</div></div>
                <span class="tp-num" data-rot="Custo">${window.fmt(custo)}</span>
                <span class="tp-num" data-rot="Venda">${venda ? window.fmt(venda) : '<i>—</i>'}</span>
                <span class="tp-num" data-rot="Repasse">${p.preco_repasse ? window.fmt(p.preco_repasse) : '<span class="mm-chip vermelho">sem repasse</span>'}</span>
                <span class="tp-num ${margem !== null && margem < 30 ? 'baixa' : ''}" data-rot="Margem">${margem === null ? '<i>—</i>' : margem + '%'}</span>
                <span class="tp-est" data-rot="Estoque"><b>${p.est_atelie || 0}</b> no Ateliê${p.est_vendedores ? ` · ${p.est_vendedores} c/ vend.` : ''}</span>
            </div>`;
        }).join('') + '</div>';
};

// ==========================================
// 🧮 FORMULÁRIO DE PRECIFICAÇÃO
// ==========================================
window.pfMontarListas = function() {
    const ps = window.arrayBancoCustos || [];
    if ($('pf-categorias')) $('pf-categorias').innerHTML = [...new Set(ps.map(p => p.categoria).filter(Boolean))].sort().map(c => `<option value="${esc(c)}">`).join('');
    if ($('pf-catalogo')) { const sel = $('pf-catalogo').value; $('pf-catalogo').innerHTML = '<option value="0">— não aparece na vitrine —</option>' + (window.catalogoAdminArray || []).map(k => `<option value="${k.linha}" data-foto="${esc(window.primeiraFotoMM(k.foto))}" ${String(k.linha) === sel ? 'selected' : ''}>${esc(k.nome)}</option>`).join(''); }
    if (window.PF.tipo === 'kit') window.pfRenderKit();
};
window.pfTipo = function(tipo) {
    if (PF.editando && tipo !== PF.tipo) return window.mostrarAlerta('Não dá para trocar', 'Um produto já salvo não muda de peça para kit (nem o contrário). Cadastre um novo.', 'warning');
    PF.tipo = tipo;
    document.querySelectorAll('#pf-tipo button').forEach(b => b.classList.toggle('active', b.dataset.t === tipo));
    $('pf-bloco-peca').hidden = tipo !== 'peca'; $('pf-bloco-kit').hidden = tipo !== 'kit';
    $('pf-nome').placeholder = tipo === 'kit' ? 'Ex: Kit festa Corinthians' : 'Ex: Placa profissões';
    if (tipo === 'kit') window.pfRenderKit(); else window.pfCalcular();
    window.pfMedidas();
};
window.pfCarregarImpressora = function() {
    $('pf-watts').value = cfg('imp_watts'); $('pf-kwh').value = cfg('imp_kwh'); $('pf-maq').value = cfg('imp_maq_hora'); $('pf-hora').value = cfg('imp_hora'); $('pf-falha').value = cfg('taxa_falha');
    if (!PF.editando && !$('pf-filamento').dataset.mexeu) $('pf-filamento').value = cfg('filamento_kg');
};
window.sugerirRepasseCalculadora = () => window.pfCalcular(); // chamado quando os Ajustes mudam

// Calcula tudo e redesenha o resumo (custo, preços e lucro por canal)
window.pfCalcular = function() {
    if (!$('pf-resumo')) return;
    let linhas = [], custo = 0;
    if (PF.tipo === 'peca') {
        const f = num($('pf-filamento').value), peso = num($('pf-peso').value), tI = num($('pf-tempo').value), tM = num($('pf-mao').value), extras = dinheiroCampo('pf-extras');
        const W = num($('pf-watts').value), kwh = num($('pf-kwh').value), maq = num($('pf-maq').value), hora = num($('pf-hora').value), falha = num($('pf-falha').value);
        const mat = f / 1000 * peso, ene = W / 1000 * tI * kwh, dep = tI * maq, hum = tM * hora, fa = (mat + ene + dep + hum) * falha / 100;
        custo = mat + ene + dep + hum + fa + extras;
        linhas = [['Filamento', mat, '#d97706'], ['Energia', ene, '#f59e0b'], ['Máquina', dep, '#78716c'], ['Mão de obra', hum, '#2563eb'], [`Falhas (${falha}%)`, fa, '#dc2626'], ['Extras', extras, '#7c3aed']];
        const fixo = $('pf-fixo-on').checked; $('pf-fixo-box').hidden = !fixo;
        if (fixo) { const cf = dinheiroCampo('pf-fixo'); $('pf-fixo-info').innerText = `O cálculo daria ${window.fmt(custo)}.`; custo = cf; }
    } else {
        PF.kit.forEach(i => { const p = produtoPorId(i.produto_id); if (p) linhas.push([`${i.qtd}x ${p.modelo}`, val(p.custo_total) * i.qtd, null]); });
        const extras = dinheiroCampo('pf-kit-extras'); if (extras) linhas.push(['Extras do kit', extras, '#7c3aed']);
        custo = linhas.reduce((s, l) => s + l[1], 0);
    }
    PF.custo = custo = n2(custo);
    const fixo = PF.tipo === 'peca' && $('pf-fixo-on').checked;
    const cores = ['#d97706', '#2563eb', '#059669', '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#78716c'];
    const soma = linhas.reduce((s, l) => s + l[1], 0) || 1;
    $('pf-resumo').innerHTML = `
        ${fixo ? '' : `<div class="barra-custo">${linhas.filter(l => l[1] > 0).map((l, i) => `<span style="width:${l[1] / soma * 100}%;background:${l[2] || cores[i % cores.length]}" title="${esc(l[0])}"></span>`).join('')}</div>`}
        ${fixo ? `<div class="custo-linha"><span>Custo informado manualmente</span><span>${window.fmt(custo)}</span></div>` : linhas.map((l, i) => `<div class="custo-linha"><span><i class="ponto" style="background:${l[2] || cores[i % cores.length]}"></i>${esc(l[0])}</span><span>${window.fmt(l[1])}</span></div>`).join('') || '<p class="texto-ajuda">Escolha as peças do kit.</p>'}
        <div class="custo-total"><span>Custo de produção</span><span>${window.fmt(custo)}</span></div>`;
    // Atalhos de preço (custo × N). No kit vêm antes: o preço das peças separadas e com desconto
    const sep = PF.tipo === 'kit' ? somaSeparadas('preco_venda') : { soma: 0, sem: 0 };
    $('pf-mults').innerHTML = (sep.soma > 0 ? [[0, 'Separadas'], [10, '−10%'], [15, '−15%']].map(([d, r]) => `<button type="button" class="chip-op ${d ? '' : 'kit-sep'}" onclick="pfAplicarValor('pf-venda', ${Math.ceil(sep.soma * (1 - d / 100))})">${r} <small>${window.fmt(Math.ceil(sep.soma * (1 - d / 100)))}</small></button>`).join('') : '')
        + (PF.tipo === 'kit' && sep.soma > 0 ? [2, 3] : [2, 2.5, 3, 4, 5]).map(m => `<button type="button" class="chip-op" onclick="pfAplicarMult(${m})">×${String(m).replace('.', ',')} <small>${window.fmt(Math.ceil(custo * m))}</small></button>`).join('');
    const venda = dinheiroCampo('pf-venda');
    const notaSep = sep.soma > 0 ? `<br>Peças vendidas separadas: ${window.fmt(sep.soma)}${sep.sem ? ` (${sep.sem} sem preço de venda)` : ''}${venda > 0 && venda < sep.soma ? ` · o kit sai <b>${window.fmt(sep.soma - venda)}</b> mais barato` : ''}.` : '';
    $('pf-venda-info').innerHTML = (venda > 0 ? `Lucro na venda direta: <b class="${venda - custo < 0 ? 'neg' : ''}">${window.fmt(venda - custo)}</b> · margem ${Math.round((venda - custo) / venda * 100)}%` : `Sugestão: ${window.fmt(Math.ceil(custo * cfg('multiplicador_venda')))} (custo × ${String(cfg('multiplicador_venda')).replace('.', ',')})`) + notaSep;
    // Quanto sobra em cada canal (tira a taxa da plataforma)
    const canais = [{ nome: 'Venda direta', pct: 0, fixa: 0 }, ...(window.arrayPlataformas || [])];
    $('pf-canais').innerHTML = venda > 0 ? `<div class="pf-canal cab"><span>Canal</span><span>Taxa</span><span>Você recebe</span><span>Lucro</span></div>` + canais.map(c => {
        const taxa = venda * (parseFloat(c.pct) || 0) / 100 + (parseFloat(c.fixa) || 0), recebe = venda - taxa, lucro = recebe - custo;
        return `<div class="pf-canal"><span>${esc(c.nome)}</span><span>${taxa > 0 ? window.fmt(taxa) : '—'}</span><span>${window.fmt(recebe)}</span><b class="${lucro < 0 ? 'neg' : ''}">${window.fmt(lucro)}</b></div>`;
    }).join('') : '';
    // Repasse para vendedores
    const sugRep = Math.ceil(custo * (1 + cfg('markup_repasse') / 100)), rep = dinheiroCampo('pf-repasse');
    $('pf-repasse-sug').innerHTML = `Usar sugestão: ${window.fmt(sugRep)}`; $('pf-repasse-sug').dataset.v = sugRep;
    const sepRep = PF.tipo === 'kit' ? somaSeparadas('preco_repasse') : { soma: 0, sem: 0 };
    $('pf-repasse-soma').hidden = !(sepRep.soma > 0); $('pf-repasse-soma').dataset.v = sepRep.soma;
    $('pf-repasse-soma').innerHTML = `Somar os repasses das peças: ${window.fmt(sepRep.soma)}${sepRep.sem ? ` <small>(${sepRep.sem} sem repasse)</small>` : ''}`;
    $('pf-repasse-info').innerHTML = rep > 0 ? `Você ganha <b class="${rep - custo < 0 ? 'neg' : ''}">${window.fmt(rep - custo)}</b> por peça vendida pelo vendedor.` : 'Sem repasse o produto não pode ir na mala dos vendedores.';
    $('pf-sugerido').placeholder = `Vazio = ${window.fmt((rep || sugRep) * (1 + cfg('margem_vendedor') / 100))} (margem dos Ajustes)`;
    $('pf-custo-topo').innerText = window.fmt(custo);
};
window.pfAplicarMult = function(m) { $('pf-venda').value = window.fmt(Math.ceil(PF.custo * m)); window.pfCalcular(); };
window.pfUsarRepasse = function() { $('pf-repasse').value = window.fmt(num($('pf-repasse-sug').dataset.v)); window.pfCalcular(); };
// Fotos: dá para escolher várias de uma vez. Elas sobem assim que são escolhidas:
// produto novo → ficam no rascunho até cadastrar; produto já salvo → já ficam guardadas nele.
window.pfPreviaFoto = function() {
    const arqs = [...$('pf-foto').files]; $('pf-foto').value = ''; if (!arqs.length) return;
    if (PF.editando) return window.enviarFotosProduto(PF.editando, arqs);
    const seq = ++PF.fotoSeq, livres = MAX_FOTOS - PF.fotos.length;
    if (livres <= 0) return window.mostrarAlerta('Limite de fotos', `Cada produto pode ter até ${MAX_FOTOS} fotos.`, 'warning');
    const anterior = PF.fotoEnvio || Promise.resolve();
    PF.fotoEnvio = (async () => {
        await anterior;
        for (const [n, f] of arqs.slice(0, livres).entries()) {
            if (seq !== PF.fotoSeq) return;
            pfFotoEstado(arqs.length > 1 ? `Enviando ${n + 1} de ${Math.min(arqs.length, livres)}…` : 'Enviando…');
            try {
                const url = await subirFoto(f);
                if (seq !== PF.fotoSeq) return;
                PF.fotos.push(url); guardarRascunho();
            } catch (e) { if (seq === PF.fotoSeq) window.mostrarAlerta('Uma foto não subiu', `${e.message}\nTente escolher de novo.`, 'error'); }
        }
        if (arqs.length > livres) window.toastMM(`Só cabem ${MAX_FOTOS} fotos por produto`);
    })().finally(() => { if (seq === PF.fotoSeq) { PF.fotoEnvio = null; pfFotoEstado(); window.galeriaAtualizar(PF.fotos); } });
};
// Caixa da foto: principal + quantas são; "enviando" enquanto sobe
function pfFotoEstado(enviando) {
    const fotos = PF.editando ? window.fotosDe(produtoPorId(PF.editando)) : PF.fotos;
    $('pf-foto-box').classList.toggle('enviando', !!enviando);
    $('pf-foto-img').src = fotos[0] || 'logo.png';
    $('pf-foto-rot').innerText = enviando || (fotos.length ? 'Mais fotos' : 'Foto');
    $('pf-foto-n').innerText = fotos.length > 1 ? fotos.length : ''; $('pf-foto-n').hidden = fotos.length < 2;
    $('pf-ver-fotos').hidden = !fotos.length;
    $('pf-ver-fotos').innerHTML = `${window.ic('imagem')} Ver ${fotos.length > 1 ? `as ${fotos.length} fotos` : 'a foto'}`;
    pfKitFotosBotao();
}
window.pfFotoEstado = pfFotoEstado;
// Galeria do formulário: produto salvo usa as fotos guardadas; produto novo mexe só no rascunho
window.pfVerFotos = function() {
    if (PF.editando) return window.tocarFotoProduto(PF.editando);
    const mudar = (lista, i) => { PF.fotos = lista; guardarRascunho(); pfFotoEstado(); window.galeriaAtualizar(lista, i); };
    window.abrirGaleria({ fotos: PF.fotos, titulo: $('pf-nome').value.trim() || 'Novo produto', marcarPrincipal: true, botoes: botoesFotos({
        lista: () => PF.fotos, adicionar: () => $('pf-foto').click(), salvar: mudar }) });
};
window.pfSalvarImpressora = async function() {
    try {
        const valores = { imp_watts: $('pf-watts').value, imp_kwh: $('pf-kwh').value, imp_maq_hora: $('pf-maq').value, imp_hora: $('pf-hora').value, taxa_falha: $('pf-falha').value };
        window.configMM = (await window.apiAcao('salvar_config', { valores })).config;
        window.toastMM('Custos da impressora salvos para todos os produtos novos');
    } catch (e) { window.mostrarAlerta('Erro', e.message, 'error'); }
};

// ---------- KIT ----------
// Escolher as peças: lista com foto, busca e categoria; as que têm peça no Ateliê vêm primeiro.
// Tocar na linha põe 1 no kit, − e + ajustam e tocar no número deixa digitar a quantidade.
window.PK = { filtro: 'todas' };
const pecasParaKit = () => (window.arrayBancoCustos || []).filter(p => p.tipo !== 'kit' && p.ativo !== false && p.linha !== PF.editando);
const noKit = id => PF.kit.find(i => i.produto_id === id);
const estAtelie = p => Math.max(0, parseInt(p && p.est_atelie) || 0);
const mudouKit = () => { window.pfRenderKit(); window.pfMedidas(); guardarRascunho(); };
window.pfKitMais = function(id) { const it = noKit(id); if (it) it.qtd++; else PF.kit.push({ produto_id: id, qtd: 1 }); mudouKit(); };
window.pfKitMenos = function(id) { const it = noKit(id); if (!it) return; if (--it.qtd < 1) PF.kit = PF.kit.filter(i => i !== it); mudouKit(); };
window.pfKitTirar = function(id) { PF.kit = PF.kit.filter(i => i.produto_id !== id); mudouKit(); };
window.pfKitDigitar = async function(id) {
    const it = noKit(id), p = produtoPorId(id); if (!it) return;
    const v = await window.pedirValorMM({ icone: '🧩', titulo: 'Quantas vão no kit?', texto: p ? p.modelo : '', campo: 'number', valor: String(it.qtd), min: 0, ok: 'Usar',
        validar: x => { const n = parseInt(x); return n >= 0 && n <= 999 ? null : 'Digite um número de 0 a 999 (0 tira do kit).'; } });
    if (v === null) return;
    it.qtd = parseInt(v); if (it.qtd < 1) PF.kit = PF.kit.filter(i => i !== it); mudouKit();
};
window.pfKitFiltro = function(f) { PK.filtro = f; document.querySelectorAll('#pf-kit-filtros button').forEach(b => b.classList.toggle('active', b.dataset.f === f)); window.pfRenderEscolha(); };
window.pfRenderEscolha = function() {
    const box = $('pf-kit-escolha'); if (!box) return;
    const todas = pecasParaKit(), t = $('pf-kit-busca').value;
    window.montarFiltroCategoria('pf-kit-categoria', todas); const cat = $('pf-kit-categoria').value;
    const conta = { todas: todas.length, estoque: todas.filter(p => estAtelie(p) > 0).length, nokit: PF.kit.length };
    document.querySelectorAll('#pf-kit-filtros button').forEach(b => { b.querySelector('em').innerText = conta[b.dataset.f] || ''; });
    const lista = todas.filter(p => (PK.filtro !== 'estoque' || estAtelie(p) > 0) && (PK.filtro !== 'nokit' || noKit(p.linha)) && window.categoriaBate(p, cat) && window.produtoBate(p, t))
        .sort((a, b) => (estAtelie(b) > 0) - (estAtelie(a) > 0) || String(a.modelo).localeCompare(String(b.modelo), 'pt-BR'));
    if (!lista.length) {
        box.innerHTML = `<div class="vazio-box pequeno">${window.ic('busca')}<b>${!todas.length ? 'Nenhuma peça cadastrada' : t.trim() ? `Nada encontrado para "${esc(t)}"` : PK.filtro === 'nokit' ? 'Nenhuma peça no kit ainda' : PK.filtro === 'estoque' ? 'Nenhuma peça com estoque no Ateliê' : 'Nada nessa categoria'}</b>
            <span>${!todas.length ? 'Cadastre as peças primeiro (Precificar → Peça).' : PK.filtro !== 'todas' ? '<a onclick="pfKitFiltro(\'todas\')">Ver todas as peças</a>' : ''}</span></div>`;
        return;
    }
    // Quem não tem peça no Ateliê vem depois de um aviso (ainda dá para escolher: na hora de montar dá para imprimir)
    const primeiraSem = estAtelie(lista[0]) > 0 ? lista.findIndex(p => !estAtelie(p)) : -1;
    box.innerHTML = lista.map((p, i) => {
        const est = estAtelie(p), it = noKit(p.linha), nf = window.fotosDe(p).length;
        return (i === primeiraSem ? '<div class="ke-divisor">Sem peça no Ateliê agora</div>' : '')
            + `<div class="pdv-lin ${it ? 'no-carrinho' : ''} ${est ? '' : 'sem'}" onclick="pfKitMais(${p.linha})" role="button" tabindex="0">
            ${nf ? `<span class="pl-foto" data-n="${nf > 1 ? nf : ''}" onclick="event.stopPropagation(); tocarFotoProduto(${p.linha})" title="Ver as fotos">` : ''}<img src="${esc(fotoDe(p) || 'logo.png')}" onerror="this.src='logo.png'" alt="" loading="lazy">${nf ? '</span>' : ''}
            <div class="pl-info"><b>${esc(p.modelo)}</b><small><span class="pp-est ${est ? '' : 'zero'}">${est ? `${est} no Ateliê` : 'sem estoque'}</span> · custo ${window.fmt(val(p.custo_total))}${p.categoria ? ` · ${esc(p.categoria)}` : ''}</small></div>
            ${it ? `<span class="pl-qtd" onclick="event.stopPropagation()"><button type="button" onclick="pfKitMenos(${p.linha})" aria-label="Tirar uma">−</button><b onclick="pfKitDigitar(${p.linha})" title="Digitar a quantidade">${it.qtd}</b><button type="button" onclick="pfKitMais(${p.linha})" aria-label="Mais uma">+</button></span>`
                : `<span class="pl-add">${window.ic('mais')}</span>`}
        </div>`;
    }).join('');
};
// O que já está no kit: quantidades, custo e quantos kits dá para montar com o Ateliê (e o que falta)
window.pfRenderKit = function() {
    const box = $('pf-kit-lista'); if (!box) return;
    window.pfRenderEscolha();
    const pecas = PF.kit.reduce((s, i) => s + i.qtd, 0), custo = PF.kit.reduce((s, i) => s + val((produtoPorId(i.produto_id) || {}).custo_total) * i.qtd, 0);
    $('pf-kit-conta').innerHTML = pecas ? `${pecas} peça${pecas > 1 ? 's' : ''} · ${window.fmt(custo)}` : '';
    pfKitFotosBotao();
    if (!PF.kit.length) { box.innerHTML = `<div class="vazio-box pequeno">${window.ic('camadas')}<b>Nenhuma peça no kit</b><span>Toque nas peças da lista acima para pôr no kit.</span></div>`; $('pf-kit-montaveis').innerHTML = ''; return window.pfCalcular(); }
    box.innerHTML = `<div class="ks-cab">No kit</div>` + PF.kit.map(it => {
        const p = produtoPorId(it.produto_id) || { modelo: '(peça removida)', custo_total: 0, est_atelie: 0 }, c = val(p.custo_total);
        return `<div class="kit-linha"><img src="${esc(fotoDe(p) || 'logo.png')}" onerror="this.src='logo.png'" alt="">
            <div class="kl-info"><b>${esc(p.modelo)}</b><small>${it.qtd > 1 ? `${it.qtd} × ${window.fmt(c)} = ${window.fmt(c * it.qtd)}` : window.fmt(c)} · ${estAtelie(p)} no Ateliê</small></div>
            <div class="pi-qtd"><button type="button" onclick="pfKitMenos(${it.produto_id})" aria-label="Tirar uma">−</button><span onclick="pfKitDigitar(${it.produto_id})" title="Digitar a quantidade">${it.qtd}</span><button type="button" onclick="pfKitMais(${it.produto_id})" aria-label="Mais uma">+</button></div>
            <button type="button" class="pi-x" onclick="pfKitTirar(${it.produto_id})" title="Tirar do kit">${window.ic('x')}</button></div>`;
    }).join('');
    const conta = PF.kit.map(it => { const p = produtoPorId(it.produto_id); return { p, it, da: p ? Math.floor(estAtelie(p) / it.qtd) : 0 }; });
    const da = Math.min(...conta.map(c => c.da));
    if (da > 0) {
        const limita = conta.filter(c => c.da === da);
        $('pf-kit-montaveis').className = 'ks-montar ok';
        $('pf-kit-montaveis').innerHTML = `${window.ic('check')}<span>Com as peças do Ateliê dá para montar <b>${da}</b> kit${da > 1 ? 's' : ''} agora.`
            + (conta.length > 1 && limita.length < conta.length ? `<small>Quem limita: ${limita.map(c => `${esc(c.p.modelo)} (${estAtelie(c.p)} no Ateliê, vão ${c.it.qtd} por kit)`).join(', ')}.</small>` : '') + '</span>';
    } else {
        const faltam = conta.filter(c => !c.da).map(c => c.p ? `${c.it.qtd - estAtelie(c.p)} ${esc(c.p.modelo)}` : 'uma peça que foi removida');
        $('pf-kit-montaveis').className = 'ks-montar';
        $('pf-kit-montaveis').innerHTML = `${window.ic('alerta')}<span>Para montar 1 kit falta: ${faltam.join(', ')}.<small>Dá para cadastrar assim mesmo. Na hora de montar (Estoque) dá para imprimir o que faltar.</small></span>`;
    }
    window.pfCalcular();
};
// Kit sem foto própria: dá para usar as fotos das peças até tirar a foto do kit pronto
function pfKitFotosBotao() {
    const b = $('pf-kit-usar-fotos'); if (!b) return;
    const temFoto = PF.editando ? fotosProprias(produtoPorId(PF.editando)).length > 0 : PF.fotos.length > 0;
    b.hidden = temFoto || !!PF.fotoEnvio || !PF.kit.some(i => window.fotosDe(produtoPorId(i.produto_id)).length);
}
window.pfKitUsarFotos = async function() {
    const fotos = [...new Set(PF.kit.map(i => window.fotosDe(produtoPorId(i.produto_id))[0]).filter(Boolean))].slice(0, MAX_FOTOS);
    if (!fotos.length) return;
    if (PF.editando) await salvarFotosProduto(PF.editando, fotos, 0, 'O kit agora mostra as fotos das peças');
    else { PF.fotos = fotos; guardarRascunho(); pfFotoEstado(); window.toastMM('O kit agora mostra as fotos das peças'); }
    pfKitFotosBotao();
};
// Preço do kit comparado com as peças vendidas separadas (venda e repasse)
const somaSeparadas = campo => {
    let soma = 0, sem = 0;
    PF.kit.forEach(i => { const v = parseFloat((produtoPorId(i.produto_id) || {})[campo]) || 0; if (v > 0) soma += v * i.qtd; else sem++; });
    return { soma: n2(soma), sem };
};
// ---------- TAMANHO (régua) ----------
const MEDIDAS = [['largura', 'l', 'Largura'], ['comprimento', 'c', 'Comprimento'], ['altura', 'a', 'Altura']];
const medidasDos = pre => Object.fromEntries(MEDIDAS.map(([k, m]) => [m, window.numMedida($(pre + '-' + k).value)]));
const preencherMedidas = (pre, m) => MEDIDAS.forEach(([k, x]) => { $(pre + '-' + k).value = m && m[x] ? String(m[x]).replace('.', ',') : ''; });
// O que vai para o servidor (vazio = apaga a medida)
const paraSalvar = m => Object.fromEntries(MEDIDAS.map(([k, x]) => [k, m[x] || '']));
const camposMedidasHTML = (pre, m, aoMudar) => `<div class="med-campos">${MEDIDAS.map(([k, x, nome]) => `<label class="med-campo ${x}"><span>${nome}</span><input type="text" id="${pre}-${k}" inputmode="decimal" placeholder="0" value="${m && m[x] ? String(m[x]).replace('.', ',') : ''}" oninput="${aoMudar}()"><em>cm</em></label>`).join('')}</div>`;
const previa = (id, m) => { const box = $(id); if (box) box.innerHTML = window.reguaMM(m) || '<p class="med-vazio">Preencha as medidas para ver a régua.</p>'; };
// Kit montado: a maior largura, o maior comprimento e a maior altura das peças (certo quando elas ficam em cima de uma base, como uma bandeja)
const sugestaoDoKit = itens => {
    const ms = (itens || []).map(i => (produtoPorId(i.produto_id) || {}).medidas).filter(window.temMedidas);
    return ms.length ? { l: Math.max(...ms.map(m => m.l || 0)), c: Math.max(...ms.map(m => m.c || 0)), a: Math.max(...ms.map(m => m.a || 0)) } : null;
};
window.pfMedidas = () => {
    previa('pf-regua', medidasDos('pf'));
    const kit = PF.tipo === 'kit', caixa = $('pf-med-kit'); if (!caixa) return;
    caixa.hidden = !kit;
    $('pf-med-sugerir').hidden = !kit || !sugestaoDoKit(PF.kit);
};
window.pfSugerirMedidas = () => {
    const m = sugestaoDoKit(PF.kit); if (!m) return;
    preencherMedidas('pf', m); window.pfMedidas(); guardarRascunho();
    window.toastMM('Confira se é o tamanho com tudo montado');
};
window.epMedidas = () => previa('ep-regua', medidasDos('ep'));
window.epSugerirMedidas = id => { const p = produtoPorId(id), m = p && sugestaoDoKit(p.itens); if (m) { preencherMedidas('ep', m); window.epMedidas(); } };
// "12 × 8 × 5 cm" pequeno nas listas; o toque abre a régua
window.chipMedidas = (id, m) => window.temMedidas(m) ? ` <button type="button" class="med-chip" onclick="event.stopPropagation(); verRegua(${id})" aria-label="Tamanho ${window.medidasTxt(m)}: ver na régua">${window.ic('regua')}${window.medidasTxt(m)}</button>` : '';
window.verRegua = function(id) {
    const p = produtoPorId(id), e = window.painelEstoque && window.painelEstoque.produtos.find(x => x.id === id),
        v = window.painelVendedor && (window.painelVendedor.estoque || []).find(x => x.produto_id === id), x = p || e || v;
    if (!x || !window.temMedidas(x.medidas)) return;
    window.abrirModalMM(`<h3 class="modal-title">${window.ic('regua')} Tamanho</h3>
        <p class="regua-nome"><b>${esc(p ? p.modelo : x.nome)}</b><span>${window.medidasTxt(x.medidas)} · largura × comprimento × altura</span></p>
        ${window.reguaMM(x.medidas, { comparar: true, classe: 'grande' })}
        ${p || e ? `<button type="button" class="btn-limpar ep-link" onclick="fecharModalMM(); abrirEdicaoProduto(${id})">${window.ic('lapis')} Mudar as medidas</button>` : ''}`);
};

window.pfAplicarValor = function(campo, v) { $(campo).value = window.fmt(v); window.pfCalcular(); };

// ---------- NOVO / EDITAR ----------
window.novoProduto = function(tipo) { window.switchTab('precificar'); apagarRascunho(); window.pfLimpar(true); if (tipo) window.pfTipo(tipo); };
// silencioso = limpeza feita pelo sistema; sem ele foi você que pediu um formulário novo (e o rascunho vai junto)
window.pfLimpar = function(silencioso) {
    if (!silencioso) apagarRascunho();
    PF.editando = null; PF.kit = []; $('pf-form').reset();
    PK.filtro = 'todas'; document.querySelectorAll('#pf-kit-filtros button').forEach(b => b.classList.toggle('active', b.dataset.f === 'todas'));
    PF.fotos = []; PF.fotoEnvio = null; PF.fotoSeq++;
    pfFotoEstado(); $('pf-filamento').dataset.mexeu = '';
    $('pf-editando').hidden = true; $('pf-excluir').hidden = true; $('pf-ativo-box').hidden = true;
    $('pf-titulo-form').innerText = 'Novo produto'; $('pf-salvar').innerHTML = `${window.ic('check')} Cadastrar produto`;
    window.pfCarregarImpressora(); window.pfMontarListas();
    window.pfTipo('peca'); window.pfRenderKit(); window.pfMedidas();
    if (!silencioso) window.scrollTo(0, 0);
};
window.editarProduto = function(id) {
    const p = produtoPorId(id); if (!p) return;
    window.switchTab('precificar'); apagarRascunho();
    window.pfCarregarProduto(p); window.scrollTo(0, 0);
};
// Preenche o formulário com um produto salvo (também usado para recuperar o rascunho de uma edição)
window.pfCarregarProduto = function(p) {
    const id = p.linha; window.pfLimpar(true);
    PF.editando = id; PF.tipo = p.tipo === 'kit' ? 'kit' : 'peca';
    document.querySelectorAll('#pf-tipo button').forEach(b => b.classList.toggle('active', b.dataset.t === PF.tipo));
    $('pf-bloco-peca').hidden = PF.tipo !== 'peca'; $('pf-bloco-kit').hidden = PF.tipo !== 'kit';
    $('pf-nome').value = p.modelo; $('pf-categoria').value = p.categoria || '';
    preencherMedidas('pf', p.medidas); window.pfMedidas();
    pfFotoEstado();
    window.pfMontarListas(); $('pf-catalogo').value = String(p.catalogo_id || 0);
    $('pf-ativo-box').hidden = false; $('pf-ativo').checked = p.ativo !== false;
    $('pf-venda').value = p.preco_venda ? window.fmt(p.preco_venda) : '';
    $('pf-repasse').value = p.preco_repasse ? window.fmt(p.preco_repasse) : '';
    $('pf-sugerido').value = p.preco_sugerido ? window.fmt(p.preco_sugerido) : '';
    const c = p.calculo || {};
    if (PF.tipo === 'kit') {
        PF.kit = (p.itens || []).map(i => ({ produto_id: i.produto_id, qtd: i.qtd }));
        $('pf-kit-extras').value = window.fmt(val(p.insumos));
    } else {
        $('pf-peso').value = c.peso ?? (num(p.peso) || ''); $('pf-tempo').value = c.tempo ?? (num(p.tempo) || '');
        $('pf-mao').value = c.mao ?? 0; $('pf-filamento').value = c.filamento ?? cfg('filamento_kg');
        $('pf-extras').value = window.fmt(c.extras ?? val(p.insumos));
        ['watts', 'kwh', 'maq', 'hora', 'falha'].forEach(k => { if (c[k] !== undefined) $('pf-' + k).value = c[k]; });
        // Produto antigo (sem a conta guardada) ou com custo manual: mantém o custo salvo até você decidir mudar
        const fixo = !p.calculo || c.custo_fixo !== undefined && c.custo_fixo !== null;
        $('pf-fixo-on').checked = fixo; $('pf-fixo').value = window.fmt(fixo ? (c.custo_fixo ?? val(p.custo_total)) : 0);
    }
    $('pf-editando').hidden = false; $('pf-editando-nome').innerText = p.modelo;
    $('pf-excluir').hidden = false; $('pf-titulo-form').innerText = PF.tipo === 'kit' ? 'Editar kit' : 'Editar peça';
    $('pf-salvar').innerHTML = `${window.ic('check')} Salvar alterações`;
    window.pfRenderKit(); window.pfCalcular(); window.pfMedidas();
};

window.pfSalvar = async function() {
    const nome = $('pf-nome').value.trim();
    if (!nome) { $('pf-nome').focus(); return window.mostrarAlerta('Falta o nome', `Dê um nome para ${PF.tipo === 'kit' ? 'o kit' : 'a peça'}.`, 'warning'); }
    if (PF.tipo === 'kit' && !PF.kit.length) return window.mostrarAlerta('Kit vazio', 'Escolha as peças que vão no kit.', 'warning');
    window.pfCalcular();
    const custo = PF.custo, venda = dinheiroCampo('pf-venda'), repasse = dinheiroCampo('pf-repasse'), sugerido = dinheiroCampo('pf-sugerido');
    const abaixo = [venda > 0 && venda < custo ? 'o preço de venda' : '', repasse > 0 && repasse < custo ? 'o repasse' : ''].filter(Boolean);
    if (abaixo.length && !await window.confirmarMM({ icone: '⚠️', titulo: 'Preço abaixo do custo', texto: `${abaixo.join(' e ')} ${abaixo.length > 1 ? 'estão' : 'está'} menor que o custo (${window.fmt(custo)}). Você teria prejuízo.\nSalvar mesmo assim?`, ok: 'Salvar assim' })) return;
    const b = $('pf-salvar'), txt = b.innerHTML; b.disabled = true; b.innerText = '⏳ Salvando…';
    try {
        // Produto novo leva as fotos do rascunho; o já salvo guarda as fotos na hora (vazio = não mexe)
        if (PF.fotoEnvio) { b.innerText = '⏳ Terminando de enviar as fotos…'; await PF.fotoEnvio; b.innerText = '⏳ Salvando…'; }
        const foto = PF.editando ? '' : PF.fotos.join(',');
        const dinheiro = v => v > 0 ? window.fmtPlanilha(v) : '';
        const comum = { modelo: nome, categoria: $('pf-categoria').value.trim(), preco_venda: dinheiro(venda), preco_repasse: dinheiro(repasse), preco_sugerido: dinheiro(sugerido), foto, catalogo_id: parseInt($('pf-catalogo').value) || 0, ativo: PF.editando ? $('pf-ativo').checked : true, ...paraSalvar(medidasDos('pf')) };
        let r;
        if (PF.tipo === 'kit') {
            r = await window.apiAcao('salvar_kit', Object.assign(comum, { linha: PF.editando || 0, itens: PF.kit, insumos: window.fmtPlanilha(dinheiroCampo('pf-kit-extras')), calculo: { extras: dinheiroCampo('pf-kit-extras') } }));
        } else {
            const fixo = $('pf-fixo-on').checked;
            const calculo = { filamento: num($('pf-filamento').value), peso: num($('pf-peso').value), tempo: num($('pf-tempo').value), mao: num($('pf-mao').value), extras: dinheiroCampo('pf-extras'), watts: num($('pf-watts').value), kwh: num($('pf-kwh').value), maq: num($('pf-maq').value), hora: num($('pf-hora').value), falha: num($('pf-falha').value), custo_fixo: fixo ? custo : null };
            const dados = Object.assign(comum, { peso: calculo.peso, tempo: calculo.tempo, insumos: window.fmtPlanilha(calculo.extras), custo_total: window.fmtPlanilha(custo), calculo });
            r = PF.editando ? await window.apiAcao('atualizar_custo', Object.assign(dados, { linha: PF.editando })) : await window.apiAcao('salvar_custo', dados);
        }
        const novo = !PF.editando, eraKit = PF.tipo === 'kit';
        await window.carregarBancoDeCustos();
        if (window.painelEstoque) window.carregarPainelEstoque();
        apagarRascunho(); window.pfLimpar(true);
        const resumo = `${nome} · custo ${window.fmt(custo)}${repasse ? ` · repasse ${window.fmt(repasse)}` : ''}`;
        // Kit com peças no Ateliê: já oferece montar (as peças saem do Ateliê e o kit pronto entra)
        const kit = eraKit && r && r.id ? produtoPorId(r.id) : null;
        const da = kit && kit.itens && kit.itens.length ? Math.min(...kit.itens.map(i => Math.floor(estAtelie(produtoPorId(i.produto_id)) / (i.qtd || 1)))) : 0;
        if (da > 0) {
            if (await window.confirmarMM({ icone: '🧩', titulo: novo ? 'Kit cadastrado!' : 'Kit salvo!', texto: `${resumo}\n\nCom as peças do Ateliê dá para montar ${da} kit${da > 1 ? 's' : ''} agora. Quer montar?`, ok: 'Montar agora', cancelar: 'Depois' })) window.pfMontarAgora(r.id);
        } else window.mostrarAlerta(novo ? (eraKit ? 'Kit cadastrado!' : 'Produto cadastrado!') : 'Alterações salvas!', resumo, 'success');
    } catch (e) {
        window.mostrarAlerta('Não deu para salvar', e.message === 'DUPLICADO' ? 'Já existe um produto com esse nome.' : e.message, 'error');
    } finally { b.disabled = false; b.innerHTML = txt; }
};
window.pfMontarAgora = async function(id) {
    await window.carregarPainelEstoque();
    window.switchTab('estoque');
    if (window.painelEstoque) window.abrirMontarKit(id);
};
// Criar outro parecido: mesmas peças (ou a mesma conta), categoria e preços; nome e fotos novos
window.duplicarProduto = function(id) {
    const p = produtoPorId(id); if (!p) return;
    window.switchTab('precificar'); apagarRascunho();
    window.pfCarregarProduto(p);
    PF.editando = null; PF.fotos = [];
    $('pf-nome').value = `${p.modelo} (cópia)`; $('pf-catalogo').value = '0';
    $('pf-editando').hidden = true; $('pf-excluir').hidden = true; $('pf-ativo-box').hidden = true;
    $('pf-titulo-form').innerText = PF.tipo === 'kit' ? 'Novo kit (cópia)' : 'Nova peça (cópia)';
    $('pf-salvar').innerHTML = `${window.ic('check')} Cadastrar produto`;
    pfFotoEstado(); window.pfRenderKit(); guardarRascunho();
    window.scrollTo(0, 0); $('pf-nome').focus(); $('pf-nome').select();
    window.toastMM('Cópia pronta: troque o nome e o que mudar');
};
window.pfExcluir = async function() {
    if (!PF.editando) return;
    const id = PF.editando, p = produtoPorId(id); if (!p) return;
    if (!await window.confirmarMM({ tipo: 'perigo', icone: '🗑️', titulo: `Excluir "${p.modelo}"?`, texto: 'As vendas antigas continuam no histórico.\nSe só não quer mais vender, prefira desligar "Produto ativo".', ok: 'Excluir produto' })) return;
    try { await window.apiAcao('excluir_registro', { aba: 'CustosProdutos', linha: id }); window.pfLimpar(); window.toastMM('Produto excluído'); window.carregarBancoDeCustos(); window.switchTab('modelos'); }
    catch (e) { window.mostrarAlerta('Não deu para excluir', e.message, 'warning'); }
};
// O ✏️ antigo (vendedores) agora abre a edição rápida
window.abrirModalEditarModelo = id => window.abrirEdicaoProduto(id);

// ==========================================
// 📷 FOTOS DO PRODUTO (várias por produto; a primeira é a principal, a que aparece nas listas)
// ==========================================
// Tocar na foto abre a galeria (tela cheia, com zoom). Lá dá para adicionar, escolher a principal e excluir.
// Produto sem foto: tocar já pede para adicionar. Tudo fica salvo na hora, sem abrir o cadastro.
const MAX_FOTOS = 12;
const fotosProprias = p => !p ? [] : Array.isArray(p.fotos) ? p.fotos.slice() : String(p.foto || '').split(',').map(s => s.trim()).filter(Boolean);
// Sem foto própria, mostra as do item da vitrine (Catálogo) ligado ao produto
window.fotosDe = p => { const f = fotosProprias(p); if (f.length || !p) return f; return p.fotos_catalogo && p.fotos_catalogo.length ? p.fotos_catalogo.slice() : (p.foto_catalogo ? [p.foto_catalogo] : []); };
// Foto maior que antes (1400 px) para o zoom mostrar os detalhes da peça
const subirFoto = async arq => window.fazerUploadInteligente(await window.comprimirImagem(arq, 1400, 1400, 0.82));
const erroDeFoto = e => window.mostrarAlerta('As fotos não foram salvas', e.message === 'Ação não reconhecida.' ? 'O servidor ainda está na versão antiga. Atualize o server.js na alwaysdata.' : e.message, 'error');

window.fotoRapida = (id, foto) => {
    const n = window.fotosDe(produtoPorId(id)).length;
    return `<button type="button" class="foto-rapida${foto ? '' : ' sem'}" data-id="${id}" title="${foto ? 'Ver as fotos' : 'Adicionar fotos'}" onclick="event.stopPropagation(); tocarFotoProduto(${id})">`
        + (foto ? `<img src="${esc(foto)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('sem'); this.remove()">` : '')
        + (n > 1 ? `<span class="fr-n">${window.ic('imagem')}${n}</span>` : '')
        + `<span class="fr-ic">${window.ic('camera')}</span><span class="fr-txt">Foto</span></button>`;
};
window.tocarFotoProduto = function(id, indice = 0) {
    const p = produtoPorId(id); if (!p) return;
    const fotos = window.fotosDe(p); if (!fotos.length) return window.adicionarFotosProduto(id);
    const proprias = fotosProprias(p).length > 0;
    window.abrirGaleria({ fotos, indice, titulo: p.modelo, marcarPrincipal: proprias, nota: proprias ? '' : 'Fotos do item da vitrine', botoes: botoesFotos({
        lista: () => fotosProprias(produtoPorId(id)), adicionar: () => window.adicionarFotosProduto(id), salvar: (lista, i) => salvarFotosProduto(id, lista, i) }) });
};
// Botões da galeria para quem pode mexer nas fotos (só aparecem no painel do Admin)
function botoesFotos(o) {
    return [
        { rotulo: 'Principal', icone: window.ic('estrela'), mostrar: i => o.lista().length > 1 && i > 0 && i < o.lista().length, acao: i => { const l = o.lista(); l.unshift(l.splice(i, 1)[0]); o.salvar(l, 0); window.toastMM('Essa agora é a foto principal'); } },
        { rotulo: 'Adicionar fotos', icone: window.ic('camera'), classe: 'destaque', acao: () => o.adicionar() },
        { rotulo: 'Excluir', icone: window.ic('lixo'), classe: 'perigo', mostrar: i => i < o.lista().length, acao: async i => {
            if (!await window.confirmarMM({ tipo: 'perigo', icone: '🗑️', titulo: 'Excluir esta foto?', texto: 'Ela sai deste produto. As outras fotos continuam.', ok: 'Excluir foto' })) return;
            o.salvar(o.lista().filter((_, j) => j !== i), Math.max(0, i - 1));
        } }
    ];
}
window.adicionarFotosProduto = function(id) {
    let inp = $('foto-rapida-arq');
    if (!inp) {
        inp = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*', multiple: true, id: 'foto-rapida-arq', hidden: true });
        inp.onchange = () => { const arqs = [...inp.files], pid = parseInt(inp.dataset.id); inp.value = ''; if (arqs.length) window.enviarFotosProduto(pid, arqs); };
        document.body.appendChild(inp);
    }
    inp.dataset.id = id; inp.click();
};
window.enviarFotosProduto = async function(id, arqs) {
    const atuais = fotosProprias(produtoPorId(id)), livres = MAX_FOTOS - atuais.length;
    if (livres <= 0) return window.mostrarAlerta('Limite de fotos', `Cada produto pode ter até ${MAX_FOTOS} fotos. Exclua alguma para pôr outra.`, 'warning');
    const lote = arqs.slice(0, livres), novas = [];
    const marcar = txt => { document.querySelectorAll(`.foto-rapida[data-id="${id}"]`).forEach(b => b.classList.toggle('enviando', !!txt)); if (PF.editando === id) pfFotoEstado(txt); };
    try {
        for (const [n, f] of lote.entries()) {
            marcar(lote.length > 1 ? `Enviando ${n + 1} de ${lote.length}…` : 'Enviando…');
            if (lote.length > 1) window.toastMM(`Enviando foto ${n + 1} de ${lote.length}…`);
            try { novas.push(await subirFoto(f)); } catch (e) { window.mostrarAlerta('Uma foto não subiu', `${e.message}\nAs outras continuam sendo enviadas.`, 'error'); }
        }
        if (novas.length) await salvarFotosProduto(id, [...fotosProprias(produtoPorId(id)), ...novas], atuais.length, `${novas.length > 1 ? novas.length + ' fotos salvas' : 'Foto salva'}`);
        if (arqs.length > livres) window.toastMM(`Só cabem ${MAX_FOTOS} fotos por produto`);
    } finally { marcar(''); }
};
async function salvarFotosProduto(id, lista, indice, aviso) {
    try {
        const fotos = (await window.apiAcao('fotos_produto', { linha: id, fotos: lista })).fotos || lista;
        // Atualiza as telas abertas sem buscar tudo de novo
        const p = produtoPorId(id); if (p) { p.fotos = fotos; p.foto = fotos.join(','); }
        const todas = p ? window.fotosDe(p) : fotos;
        const pe = window.painelEstoque && window.painelEstoque.produtos.find(x => x.id === id); if (pe) { pe.fotos = todas; pe.foto = todas[0] || ''; }
        window.renderizarProdutos();
        if (window.painelEstoque && window.renderizarEstoque) window.renderizarEstoque();
        if (window.renderizarCatalogoPDV) window.renderizarCatalogoPDV();
        if (window.renderizarKits) window.renderizarKits();
        if (PF.editando === id) pfFotoEstado();
        document.querySelectorAll(`[data-fotos-de="${id}"]`).forEach(el => { el.outerHTML = fotosFaixa(id); }); // janela de edição, se aberta
        window.galeriaAtualizar(todas, indice);
        if (aviso) window.toastMM(aviso);
    } catch (e) { erroDeFoto(e); }
}
// Faixa de miniaturas da janela de edição
const fotosFaixa = id => {
    const fotos = window.fotosDe(produtoPorId(id)), proprias = fotosProprias(produtoPorId(id)).length > 0;
    return `<div class="ep-fotos" data-fotos-de="${id}">${fotos.map((f, i) => `<button type="button" class="ep-foto" onclick="tocarFotoProduto(${id}, ${i})" aria-label="Ver foto ${i + 1}"><img src="${esc(f)}" alt="" loading="lazy" onerror="this.src='logo.png'">${i === 0 && proprias && fotos.length > 1 ? '<em>principal</em>' : ''}</button>`).join('')}`
        + `<button type="button" class="ep-foto mais" onclick="adicionarFotosProduto(${id})">${window.ic('camera')}<span>${fotos.length ? 'Mais fotos' : 'Adicionar fotos'}</span></button></div>`;
};
window.fotosFaixa = fotosFaixa;

// ==========================================
// ✏️ EDIÇÃO RÁPIDA (lista de Produtos e Estoque)
// ==========================================
// Nome, categoria, preços, vitrine e ativo a qualquer momento, sem refazer a conta do custo.
// O custo da peça e as peças do kit continuam sendo mudados no Precificar (botão no fim da janela).
let epId = null;
window.abrirEdicaoProduto = function(id) {
    const p = produtoPorId(id);
    if (!p) return window.mostrarAlerta('Produto não encontrado', 'Atualize a página e tente de novo.', 'warning');
    epId = id;
    const kit = p.tipo === 'kit', dm = v => v ? window.fmt(v) : '';
    const cats = [...new Set((window.arrayBancoCustos || []).map(x => x.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const pecas = kit ? (p.itens || []).map(i => { const x = produtoPorId(i.produto_id); return `${i.qtd}x ${x ? x.modelo : '(peça removida)'}`; }).join(', ') : `${p.peso || 0}g · ${p.tempo || 0}h de impressão`;
    window.abrirModalMM(`<h3 class="modal-title">${window.ic('lapis')} Editar produto</h3>
        <div class="ep-topo"><div><b>${kit ? 'Kit' : 'Peça'} · custo ${window.fmt(val(p.custo_total))}</b><small>${esc(pecas)}</small><small>${p.est_atelie || 0} no Ateliê${p.est_vendedores ? ` · ${p.est_vendedores} com vendedores` : ''}</small></div></div>
        <div class="input-group"><label>Fotos <small class="rot-dica">toque para ver de perto</small></label>${fotosFaixa(id)}</div>
        <div class="input-group"><label for="ep-nome">Nome *</label><input type="text" id="ep-nome" value="${esc(p.modelo)}" autocomplete="off"></div>
        <div class="input-group"><label for="ep-categoria">Categoria</label><input type="text" id="ep-categoria" list="ep-categorias" value="${esc(p.categoria || '')}" placeholder="Ex: Decoração, Chaveiros…" autocomplete="off"><datalist id="ep-categorias">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist></div>
        <div class="input-group"><label>Tamanho <small class="rot-dica">em cm, opcional · aparece no site</small></label>${camposMedidasHTML('ep', p.medidas, 'epMedidas')}<div class="med-previa mini" id="ep-regua"></div>${kit ? `<p class="texto-ajuda med-kit-txt">Kit: meça montado (base × altura da peça mais alta). Vazio = o site mostra o tamanho de cada peça.${sugestaoDoKit(p.itens) ? ` <a onclick="epSugerirMedidas(${id})">Sugerir pelas peças</a>` : ''}</p>` : ''}</div>
        <div class="row">
            <div class="col"><div class="input-group"><label for="ep-venda">Preço de venda</label><input type="text" id="ep-venda" class="mask-money" inputmode="numeric" value="${dm(p.preco_venda)}" placeholder="R$ 0,00" oninput="setTimeout(epInfo)"></div></div>
            <div class="col"><div class="input-group"><label for="ep-repasse">Repasse (vendedores)</label><input type="text" id="ep-repasse" class="mask-money" inputmode="numeric" value="${dm(p.preco_repasse)}" placeholder="R$ 0,00" oninput="setTimeout(epInfo)"></div></div>
        </div>
        <div class="row">
            <div class="col"><div class="input-group"><label for="ep-sugerido">Sugerido ao vendedor</label><input type="text" id="ep-sugerido" class="mask-money" inputmode="numeric" value="${dm(p.preco_sugerido)}" placeholder="Vazio = automático"></div></div>
            <div class="col"><div class="input-group"><label for="ep-catalogo">Item da vitrine</label><select id="ep-catalogo" data-fotos><option value="0">— não aparece na vitrine —</option>${(window.catalogoAdminArray || []).map(k => `<option value="${k.linha}" data-foto="${esc(window.primeiraFotoMM(k.foto))}" ${String(k.linha) === String(p.catalogo_id) ? 'selected' : ''}>${esc(k.nome)}</option>`).join('')}</select></div></div>
        </div>
        <label class="chave" style="margin:0 0 12px;"><input type="checkbox" id="ep-ativo" ${p.ativo !== false ? 'checked' : ''}> Produto ativo (aparece para vender e para a mala)</label>
        <p class="texto-ajuda" id="ep-info" style="margin:0 0 14px;"></p>
        <button class="btn-magic btn-global" id="btn-ep" onclick="salvarEdicaoProduto()">${window.ic('check')} Salvar</button>
        <button type="button" class="btn-limpar ep-link" onclick="fecharModalMM(); editarProduto(${id})">${window.ic('calculadora')} ${kit ? 'Mudar as peças do kit' : 'Refazer a conta do custo'} no Precificar</button>
        <button type="button" class="btn-limpar ep-link" onclick="fecharModalMM(); duplicarProduto(${id})">${window.ic('copiar')} Criar ${kit ? 'outro kit parecido' : 'outra peça parecida'}</button>
        <button type="button" class="btn-limpar ep-link" onclick="paginasDoProduto(${id})">${window.ic('sacola')} Páginas de venda (onde aparece para os clientes)</button>`);
    window.epInfo(); window.epMedidas();
};
window.epInfo = function() {
    const p = produtoPorId(epId), box = $('ep-info'); if (!p || !box) return;
    const custo = val(p.custo_total), venda = dinheiroCampo('ep-venda'), rep = dinheiroCampo('ep-repasse');
    box.innerHTML = [venda > 0 ? `Na venda direta sobra <b class="${venda < custo ? 'neg' : ''}">${window.fmt(venda - custo)}</b> (${Math.round((venda - custo) / venda * 100)}%).` : '',
        rep > 0 ? `Cada peça vendida pelo vendedor te dá <b class="${rep < custo ? 'neg' : ''}">${window.fmt(rep - custo)}</b>.` : 'Sem repasse o produto não vai na mala dos vendedores.'].filter(Boolean).join(' ');
};
window.salvarEdicaoProduto = async function() {
    const id = epId, p = produtoPorId(id); if (!p) return;
    const nome = $('ep-nome').value.trim();
    if (!nome) { $('ep-nome').focus(); return window.mostrarAlerta('Falta o nome', 'Dê um nome para o produto.', 'warning'); }
    const custo = val(p.custo_total), venda = dinheiroCampo('ep-venda'), repasse = dinheiroCampo('ep-repasse'), sugerido = dinheiroCampo('ep-sugerido');
    const abaixo = [venda > 0 && venda < custo ? 'o preço de venda' : '', repasse > 0 && repasse < custo ? 'o repasse' : ''].filter(Boolean);
    if (abaixo.length && !await window.confirmarMM({ icone: '⚠️', titulo: 'Preço abaixo do custo', texto: `${abaixo.join(' e ')} ${abaixo.length > 1 ? 'estão' : 'está'} menor que o custo (${window.fmt(custo)}). Você teria prejuízo.\nSalvar mesmo assim?`, ok: 'Salvar assim' })) return;
    const b = $('btn-ep'), txt = b.innerHTML; b.disabled = true; b.innerText = '⏳ Salvando…';
    const dinheiro = v => v > 0 ? window.fmtPlanilha(v) : '';
    try {
        await window.apiAcao('editar_produto', { linha: id, modelo: nome, categoria: $('ep-categoria').value.trim(), preco_venda: dinheiro(venda), preco_repasse: dinheiro(repasse), preco_sugerido: dinheiro(sugerido), catalogo_id: parseInt($('ep-catalogo').value) || 0, ativo: $('ep-ativo').checked, ...paraSalvar(medidasDos('ep')) });
        window.fecharModalMM();
        await window.carregarBancoDeCustos();
        if (window.painelEstoque) window.carregarPainelEstoque();
        // Se o mesmo produto está aberto no Precificar, mostra lá os dados novos (senão um "Salvar" lá desfaria esta edição)
        if (PF.editando === id && produtoPorId(id)) { apagarRascunho(); window.pfCarregarProduto(produtoPorId(id)); }
        window.toastMM(`${nome} salvo`);
    } catch (e) {
        window.mostrarAlerta('Não deu para salvar', e.message === 'Ação não reconhecida.' ? 'O servidor ainda está na versão antiga. Atualize o server.js na alwaysdata.' : e.message, 'error');
    } finally { b.disabled = false; b.innerHTML = txt; }
};

document.addEventListener('DOMContentLoaded', () => { if ($('pf-form')) window.pfLimpar(true); });
})();
