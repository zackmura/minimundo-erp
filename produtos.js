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

// fotoUrl: foto já enviada (fica no rascunho); fotoEnvio: envio em andamento; fotoSeq: descarta envio de foto trocada no meio
window.PF = { tipo: 'peca', editando: null, kit: [], custo: 0, fotoUrl: '', fotoEnvio: null, fotoSeq: 0 };
const apagarRascunho = () => window.rascunhoApagar && window.rascunhoApagar('precificar');
const guardarRascunho = () => window.rascunhoGuardar && window.rascunhoGuardar('precificar');

// ---------- CARREGAR PRODUTOS (usado por várias telas) ----------
window.carregarBancoDeCustos = async function() {
    const ld = $('loading-banco'); if (ld) ld.style.display = 'block';
    try {
        window.arrayBancoCustos = (await window.apiAcao('listar_custos')).produtos;
        window.renderizarProdutos(); window.pfMontarListas();
        if (window.renderizarCatalogoPDV) { window.renderizarCatalogoPDV(); window.renderizarCarrinhoPDV(); }
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
            const sub = p.tipo === 'kit' ? `<span class="tag-kit">Kit · ${p.itens.reduce((s, i) => s + i.qtd, 0)} peças</span>` : `${esc(p.peso || 0)}g · ${esc(p.tempo || 0)}h`;
            // No celular as colunas somem e o resumo (venda · repasse · margem) aparece embaixo do nome
            const resumo = `${venda ? 'Venda ' + window.fmt(venda) : 'sem preço'} · ${p.preco_repasse ? 'repasse ' + window.fmt(p.preco_repasse) : '<b class="neg">sem repasse</b>'}${margem !== null ? ` · <span class="${margem < 30 ? 'neg' : ''}">${margem}%</span>` : ''}`;
            return `<div class="tp-linha ${p.ativo === false ? 'inativo' : ''}" onclick="abrirEdicaoProduto(${p.linha})" role="button" tabindex="0" title="Editar">
                <div class="tp-prod">${window.fotoRapida(p.linha, fotoDe(p))}<div><b>${esc(p.modelo)}${p.ativo === false ? ' <span class="tag-inativo">Inativo</span>' : ''}</b><small>${p.categoria ? esc(p.categoria) + ' · ' : ''}${sub}</small><small class="tp-resumo">${resumo}</small></div></div>
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
    if ($('pf-kit-add')) {
        $('pf-kit-add').innerHTML = '<option value="">Escolha uma peça…</option>' + ps.filter(p => p.tipo !== 'kit' && p.ativo !== false && p.linha !== PF.editando).map(p => `<option value="${p.linha}">${esc(p.modelo)}${p.categoria ? ` (${esc(p.categoria)})` : ''} · ${window.fmt(val(p.custo_total))}</option>`).join('');
        window.filtrarSelect('pf-kit-add', $('pf-kit-busca').value, true);
    }
    if ($('pf-catalogo')) { const sel = $('pf-catalogo').value; $('pf-catalogo').innerHTML = '<option value="0">— não aparece na vitrine —</option>' + (window.catalogoAdminArray || []).map(k => `<option value="${k.linha}" ${String(k.linha) === sel ? 'selected' : ''}>${esc(k.nome)}</option>`).join(''); }
    if (window.PF.tipo === 'kit') window.pfRenderKit();
};
window.pfTipo = function(tipo) {
    if (PF.editando && tipo !== PF.tipo) return window.mostrarAlerta('Não dá para trocar', 'Um produto já salvo não muda de peça para kit (nem o contrário). Cadastre um novo.', 'warning');
    PF.tipo = tipo;
    document.querySelectorAll('#pf-tipo button').forEach(b => b.classList.toggle('active', b.dataset.t === tipo));
    $('pf-bloco-peca').hidden = tipo !== 'peca'; $('pf-bloco-kit').hidden = tipo !== 'kit';
    $('pf-nome').placeholder = tipo === 'kit' ? 'Ex: Kit festa Corinthians' : 'Ex: Placa profissões';
    window.pfCalcular();
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
    // Atalhos de preço (custo × N)
    $('pf-mults').innerHTML = [2, 2.5, 3, 4, 5].map(m => `<button type="button" class="chip-op" onclick="pfAplicarMult(${m})">×${String(m).replace('.', ',')} <small>${window.fmt(Math.ceil(custo * m))}</small></button>`).join('');
    const venda = dinheiroCampo('pf-venda');
    $('pf-venda-info').innerHTML = venda > 0 ? `Lucro na venda direta: <b class="${venda - custo < 0 ? 'neg' : ''}">${window.fmt(venda - custo)}</b> · margem ${Math.round((venda - custo) / venda * 100)}%` : `Sugestão: ${window.fmt(Math.ceil(custo * cfg('multiplicador_venda')))} (custo × ${String(cfg('multiplicador_venda')).replace('.', ',')})`;
    // Quanto sobra em cada canal (tira a taxa da plataforma)
    const canais = [{ nome: 'Venda direta', pct: 0, fixa: 0 }, ...(window.arrayPlataformas || [])];
    $('pf-canais').innerHTML = venda > 0 ? `<div class="pf-canal cab"><span>Canal</span><span>Taxa</span><span>Você recebe</span><span>Lucro</span></div>` + canais.map(c => {
        const taxa = venda * (parseFloat(c.pct) || 0) / 100 + (parseFloat(c.fixa) || 0), recebe = venda - taxa, lucro = recebe - custo;
        return `<div class="pf-canal"><span>${esc(c.nome)}</span><span>${taxa > 0 ? window.fmt(taxa) : '—'}</span><span>${window.fmt(recebe)}</span><b class="${lucro < 0 ? 'neg' : ''}">${window.fmt(lucro)}</b></div>`;
    }).join('') : '';
    // Repasse para vendedores
    const sugRep = Math.ceil(custo * (1 + cfg('markup_repasse') / 100)), rep = dinheiroCampo('pf-repasse');
    $('pf-repasse-sug').innerHTML = `Usar sugestão: ${window.fmt(sugRep)}`; $('pf-repasse-sug').dataset.v = sugRep;
    $('pf-repasse-info').innerHTML = rep > 0 ? `Você ganha <b class="${rep - custo < 0 ? 'neg' : ''}">${window.fmt(rep - custo)}</b> por peça vendida pelo vendedor.` : 'Sem repasse o produto não pode ir na mala dos vendedores.';
    $('pf-sugerido').placeholder = `Vazio = ${window.fmt((rep || sugRep) * (1 + cfg('margem_vendedor') / 100))} (margem dos Ajustes)`;
    $('pf-custo-topo').innerText = window.fmt(custo);
};
window.pfAplicarMult = function(m) { $('pf-venda').value = window.fmt(Math.ceil(PF.custo * m)); window.pfCalcular(); };
window.pfUsarRepasse = function() { $('pf-repasse').value = window.fmt(num($('pf-repasse-sug').dataset.v)); window.pfCalcular(); };
// A foto sobe assim que é escolhida (e o endereço vai para o rascunho): se o celular recarregar a página, ela não se perde
window.pfPreviaFoto = function() {
    const f = $('pf-foto').files[0]; if (!f) return;
    const seq = ++PF.fotoSeq, antes = PF.fotoUrl;
    $('pf-foto-img').src = URL.createObjectURL(f); pfFotoEstado('enviando');
    PF.fotoEnvio = (async () => {
        try {
            const url = await window.fazerUploadInteligente(await window.comprimirImagem(f, 800, 800, 0.8));
            if (seq === PF.fotoSeq) { PF.fotoUrl = url; pfFotoEstado('ok'); guardarRascunho(); }
            return url;
        } catch (e) {
            if (seq === PF.fotoSeq) { PF.fotoUrl = antes; $('pf-foto-img').src = antes || fotoDe(produtoPorId(PF.editando)) || 'logo.png'; pfFotoEstado(); window.mostrarAlerta('A foto não subiu', `${e.message}\nTente escolher de novo.`, 'error'); }
            return antes;
        } finally { if (seq === PF.fotoSeq) PF.fotoEnvio = null; }
    })();
};
function pfFotoEstado(estado) {
    $('pf-foto-box').classList.toggle('enviando', estado === 'enviando');
    $('pf-foto-rot').innerText = estado === 'enviando' ? 'Enviando…' : estado === 'ok' || PF.fotoUrl || fotoDe(produtoPorId(PF.editando)) ? 'Trocar foto' : 'Foto';
}
window.pfFotoEstado = pfFotoEstado;
window.pfSalvarImpressora = async function() {
    try {
        const valores = { imp_watts: $('pf-watts').value, imp_kwh: $('pf-kwh').value, imp_maq_hora: $('pf-maq').value, imp_hora: $('pf-hora').value, taxa_falha: $('pf-falha').value };
        window.configMM = (await window.apiAcao('salvar_config', { valores })).config;
        window.toastMM('Custos da impressora salvos para todos os produtos novos');
    } catch (e) { window.mostrarAlerta('Erro', e.message, 'error'); }
};

// ---------- KIT ----------
window.pfAddKit = function() {
    const id = parseInt($('pf-kit-add').value), q = Math.max(1, parseInt($('pf-kit-add-qtd').value) || 1); if (!id) return;
    const ja = PF.kit.find(i => i.produto_id === id); if (ja) ja.qtd += q; else PF.kit.push({ produto_id: id, qtd: q });
    $('pf-kit-busca').value = ''; window.filtrarSelect('pf-kit-add', ''); $('pf-kit-add').value = ''; $('pf-kit-add-qtd').value = 1; window.pfRenderKit();
};
window.pfKitQtd = function(i, d) { const it = PF.kit[i]; if (!it) return; it.qtd = Math.max(1, it.qtd + d); window.pfRenderKit(); };
window.pfKitTirar = function(i) { PF.kit.splice(i, 1); window.pfRenderKit(); };
window.pfRenderKit = function() {
    const box = $('pf-kit-lista'); if (!box) return;
    if (!PF.kit.length) { box.innerHTML = `<div class="vazio-box pequeno">${window.ic('camadas')}<b>Nenhuma peça no kit</b><span>Escolha acima as peças que vão juntas.</span></div>`; $('pf-kit-montaveis').innerText = ''; return window.pfCalcular(); }
    box.innerHTML = PF.kit.map((it, i) => {
        const p = produtoPorId(it.produto_id) || { modelo: '(peça removida)', custo_total: 0, est_atelie: 0 };
        return `<div class="kit-linha"><img src="${esc(fotoDe(p) || 'logo.png')}" onerror="this.src='logo.png'" alt="">
            <div class="kl-info"><b>${esc(p.modelo)}</b><small>${window.fmt(val(p.custo_total))} cada · ${p.est_atelie || 0} no Ateliê</small></div>
            <div class="pi-qtd"><button type="button" onclick="pfKitQtd(${i},-1)">−</button><span>${it.qtd}</span><button type="button" onclick="pfKitQtd(${i},1)">+</button></div>
            <button type="button" class="pi-x" onclick="pfKitTirar(${i})" title="Tirar do kit">${window.ic('x')}</button></div>`;
    }).join('');
    const da = Math.min(...PF.kit.map(it => { const p = produtoPorId(it.produto_id); return p ? Math.floor((p.est_atelie || 0) / it.qtd) : 0; }));
    $('pf-kit-montaveis').innerHTML = da > 0 ? `Com as peças do Ateliê dá para montar <b>${da}</b> kit${da > 1 ? 's' : ''} agora.` : 'Ainda não há peças suficientes no Ateliê para montar um kit.';
    window.pfCalcular();
};

// ---------- NOVO / EDITAR ----------
window.novoProduto = function(tipo) { window.switchTab('precificar'); apagarRascunho(); window.pfLimpar(true); if (tipo) window.pfTipo(tipo); };
// silencioso = limpeza feita pelo sistema; sem ele foi você que pediu um formulário novo (e o rascunho vai junto)
window.pfLimpar = function(silencioso) {
    if (!silencioso) apagarRascunho();
    PF.editando = null; PF.kit = []; $('pf-form').reset();
    PF.fotoUrl = ''; PF.fotoEnvio = null; PF.fotoSeq++;
    $('pf-foto-img').src = 'logo.png'; pfFotoEstado(); $('pf-filamento').dataset.mexeu = '';
    $('pf-editando').hidden = true; $('pf-excluir').hidden = true; $('pf-ativo-box').hidden = true;
    $('pf-titulo-form').innerText = 'Novo produto'; $('pf-salvar').innerHTML = `${window.ic('check')} Cadastrar produto`;
    window.pfCarregarImpressora(); window.pfMontarListas();
    window.pfTipo('peca'); window.pfRenderKit();
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
    $('pf-foto-img').src = fotoDe(p) || 'logo.png'; pfFotoEstado();
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
    window.pfRenderKit(); window.pfCalcular();
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
        let foto = PF.fotoUrl;
        if (PF.fotoEnvio) { b.innerText = '⏳ Terminando de enviar a foto…'; foto = await PF.fotoEnvio; b.innerText = '⏳ Salvando…'; }
        const dinheiro = v => v > 0 ? window.fmtPlanilha(v) : '';
        const comum = { modelo: nome, categoria: $('pf-categoria').value.trim(), preco_venda: dinheiro(venda), preco_repasse: dinheiro(repasse), preco_sugerido: dinheiro(sugerido), foto, catalogo_id: parseInt($('pf-catalogo').value) || 0, ativo: PF.editando ? $('pf-ativo').checked : true };
        let r;
        if (PF.tipo === 'kit') {
            r = await window.apiAcao('salvar_kit', Object.assign(comum, { linha: PF.editando || 0, itens: PF.kit, insumos: window.fmtPlanilha(dinheiroCampo('pf-kit-extras')), calculo: { extras: dinheiroCampo('pf-kit-extras') } }));
        } else {
            const fixo = $('pf-fixo-on').checked;
            const calculo = { filamento: num($('pf-filamento').value), peso: num($('pf-peso').value), tempo: num($('pf-tempo').value), mao: num($('pf-mao').value), extras: dinheiroCampo('pf-extras'), watts: num($('pf-watts').value), kwh: num($('pf-kwh').value), maq: num($('pf-maq').value), hora: num($('pf-hora').value), falha: num($('pf-falha').value), custo_fixo: fixo ? custo : null };
            const dados = Object.assign(comum, { peso: calculo.peso, tempo: calculo.tempo, insumos: window.fmtPlanilha(calculo.extras), custo_total: window.fmtPlanilha(custo), calculo });
            r = PF.editando ? await window.apiAcao('atualizar_custo', Object.assign(dados, { linha: PF.editando })) : await window.apiAcao('salvar_custo', dados);
        }
        const novo = !PF.editando;
        await window.carregarBancoDeCustos();
        if (window.painelEstoque) window.carregarPainelEstoque();
        apagarRascunho(); window.pfLimpar(true);
        window.mostrarAlerta(novo ? 'Produto cadastrado!' : 'Alterações salvas!', `${nome} · custo ${window.fmt(custo)}${repasse ? ` · repasse ${window.fmt(repasse)}` : ''}`, 'success');
        void r;
    } catch (e) {
        window.mostrarAlerta('Não deu para salvar', e.message === 'DUPLICADO' ? 'Já existe um produto com esse nome.' : e.message, 'error');
    } finally { b.disabled = false; b.innerHTML = txt; }
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
// 📷 FOTO RÁPIDA (lista de Produtos e Estoque)
// ==========================================
// Toque na foto do produto → escolha ou tire a foto → ela sobe e já fica salva, sem abrir o cadastro.
window.fotoRapida = (id, foto) => `<button type="button" class="foto-rapida${foto ? '' : ' sem'}" data-id="${id}" title="${foto ? 'Trocar a foto' : 'Adicionar foto'}" onclick="event.stopPropagation(); trocarFotoProduto(${id})">`
    + (foto ? `<img src="${esc(foto)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('sem'); this.remove()">` : '')
    + `<span class="fr-ic">${window.ic('camera')}</span><span class="fr-txt">Foto</span></button>`;
window.trocarFotoProduto = function(id) {
    let inp = $('foto-rapida-arq');
    if (!inp) {
        inp = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*', id: 'foto-rapida-arq', hidden: true });
        inp.onchange = () => { const f = inp.files[0], pid = parseInt(inp.dataset.id); inp.value = ''; if (f) enviarFotoRapida(pid, f); };
        document.body.appendChild(inp);
    }
    inp.dataset.id = id; inp.click();
};
async function enviarFotoRapida(id, arq) {
    const marcar = on => document.querySelectorAll(`.foto-rapida[data-id="${id}"]`).forEach(b => b.classList.toggle('enviando', on));
    marcar(true);
    try {
        const url = await window.fazerUploadInteligente(await window.comprimirImagem(arq, 800, 800, 0.8));
        await window.apiAcao('foto_produto', { linha: id, foto: url });
        // Atualiza as telas abertas sem buscar tudo de novo
        const p = produtoPorId(id); if (p) p.foto = url;
        const pe = window.painelEstoque && window.painelEstoque.produtos.find(x => x.id === id); if (pe) pe.foto = url;
        window.renderizarProdutos();
        if (window.painelEstoque && window.renderizarEstoque) window.renderizarEstoque();
        if (window.renderizarCatalogoPDV) window.renderizarCatalogoPDV();
        if (PF.editando === id && !PF.fotoUrl && !PF.fotoEnvio) { $('pf-foto-img').src = url; pfFotoEstado(); }
        document.querySelectorAll(`.foto-rapida[data-id="${id}"]`).forEach(b => { b.outerHTML = window.fotoRapida(id, url); }); // a janela de edição, se aberta
        window.toastMM(`Foto salva${p ? ': ' + p.modelo : ''}`);
    } catch (e) {
        window.mostrarAlerta('A foto não foi salva', e.message === 'Ação não reconhecida.' ? 'O servidor ainda está na versão antiga. Atualize o server.js na alwaysdata.' : e.message, 'error');
    } finally { marcar(false); }
}

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
        <div class="ep-topo">${window.fotoRapida(id, fotoDe(p))}<div><b>${kit ? 'Kit' : 'Peça'} · custo ${window.fmt(val(p.custo_total))}</b><small>${esc(pecas)}</small><small>${p.est_atelie || 0} no Ateliê${p.est_vendedores ? ` · ${p.est_vendedores} com vendedores` : ''}</small></div></div>
        <div class="input-group"><label for="ep-nome">Nome *</label><input type="text" id="ep-nome" value="${esc(p.modelo)}" autocomplete="off"></div>
        <div class="input-group"><label for="ep-categoria">Categoria</label><input type="text" id="ep-categoria" list="ep-categorias" value="${esc(p.categoria || '')}" placeholder="Ex: Decoração, Chaveiros…" autocomplete="off"><datalist id="ep-categorias">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist></div>
        <div class="row">
            <div class="col"><div class="input-group"><label for="ep-venda">Preço de venda</label><input type="text" id="ep-venda" class="mask-money" inputmode="numeric" value="${dm(p.preco_venda)}" placeholder="R$ 0,00" oninput="setTimeout(epInfo)"></div></div>
            <div class="col"><div class="input-group"><label for="ep-repasse">Repasse (vendedores)</label><input type="text" id="ep-repasse" class="mask-money" inputmode="numeric" value="${dm(p.preco_repasse)}" placeholder="R$ 0,00" oninput="setTimeout(epInfo)"></div></div>
        </div>
        <div class="row">
            <div class="col"><div class="input-group"><label for="ep-sugerido">Sugerido ao vendedor</label><input type="text" id="ep-sugerido" class="mask-money" inputmode="numeric" value="${dm(p.preco_sugerido)}" placeholder="Vazio = automático"></div></div>
            <div class="col"><div class="input-group"><label for="ep-catalogo">Item da vitrine</label><select id="ep-catalogo"><option value="0">— não aparece na vitrine —</option>${(window.catalogoAdminArray || []).map(k => `<option value="${k.linha}" ${String(k.linha) === String(p.catalogo_id) ? 'selected' : ''}>${esc(k.nome)}</option>`).join('')}</select></div></div>
        </div>
        <label class="chave" style="margin:0 0 12px;"><input type="checkbox" id="ep-ativo" ${p.ativo !== false ? 'checked' : ''}> Produto ativo (aparece para vender e para a mala)</label>
        <p class="texto-ajuda" id="ep-info" style="margin:0 0 14px;"></p>
        <button class="btn-magic btn-global" id="btn-ep" onclick="salvarEdicaoProduto()">${window.ic('check')} Salvar</button>
        <button type="button" class="btn-limpar ep-link" onclick="fecharModalMM(); editarProduto(${id})">${window.ic('calculadora')} ${kit ? 'Mudar as peças do kit' : 'Refazer a conta do custo'} no Precificar</button>`);
    window.epInfo();
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
        await window.apiAcao('editar_produto', { linha: id, modelo: nome, categoria: $('ep-categoria').value.trim(), preco_venda: dinheiro(venda), preco_repasse: dinheiro(repasse), preco_sugerido: dinheiro(sugerido), catalogo_id: parseInt($('ep-catalogo').value) || 0, ativo: $('ep-ativo').checked });
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
