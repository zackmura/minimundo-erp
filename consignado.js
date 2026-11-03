// ==========================================
// CONSIGNADO: ESTOQUE DO ATELIÊ, VENDEDORES, BAIXAS E ACERTOS
// ==========================================
// Como funciona: você produz (entra no Ateliê) → envia uma mala pro vendedor (sai do Ateliê, entra
// no estoque dele) → ele vende pelo preço que quiser e dá baixa (te deve o repasse) → você recebe
// e marca o acerto. Peça parada pode voltar pro Ateliê (recolher) e a conferência acerta diferenças.

window.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
window.painelEstoque = null; window.painelVendedor = null; window.vendAberto = null; window.configMM = {};

// POST com o crachá; dá erro amigável se o servidor recusar.
// No modo "ver como o vendedor", as telas do vendedor vão com o id dele (o servidor só aceita isso do Admin).
window.ACOES_DA_TELA_VENDEDOR = ['meu_painel', 'dar_baixa', 'salvar_encomenda'];
window.apiAcao = async function(acao, dados = {}) {
    if (window.vendedorVisto && window.ACOES_DA_TELA_VENDEDOR.includes(acao) && !dados.vendedor_id) dados = Object.assign({ vendedor_id: window.vendedorVisto.id }, dados);
    const r = await window.apiFetch(API_PRECIFICACAO, { method: "POST", body: JSON.stringify(Object.assign({ acao }, dados)) });
    const res = await r.json();
    if (!res.sucesso) throw new Error(res.erro || "Falha na operação.");
    return res;
};

// O primeiro <h3 class="modal-title"> do conteúdo vira o cabeçalho fixo da janela (junto do ×)
window.preencherModalMM = function(html) {
    const corpo = window.$('modal-mm-conteudo'); corpo.innerHTML = html;
    const t = corpo.querySelector(':scope > .modal-title');
    window.$('modal-mm-titulo').innerHTML = t ? t.innerHTML : '';
    if (t) t.remove();
    window.$('modal-mm-cabeca').classList.toggle('sem-titulo', !t);
};
window.abrirModalMM = function(html) { window.preencherModalMM(html); window.$('modal-mm').style.display = 'flex'; window.$('modal-mm-conteudo').scrollTop = 0; };
window.fecharModalMM = function() { window.$('modal-mm').style.display = 'none'; window.$('modal-mm-conteudo').innerHTML = ''; };

window.fmtDataHora = function(s) { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/); if (!m) return String(s || ''); return `${m[3]}/${m[2]}/${m[1].slice(2)}${m[4] ? ` ${m[4]}:${m[5]}` : ''}`; };
window.linkZap = function(tel, texto) {
    let n = String(tel || '').replace(/\D/g, ''); if (n && n.length <= 11) n = '55' + n;
    return n ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
};
window.linkVitrine = codigo => new URL('vitrine.html?v=' + encodeURIComponent(codigo), location.href).href;
window.linkSistema = () => location.href.split('#')[0].split('?')[0];
window.copiarTexto = function(txt, msg) {
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(() => window.mostrarAlerta("Copiado!", msg || "Copiado!", "success")).catch(() => window.mostrarParaCopiar(txt));
    else window.mostrarParaCopiar(txt);
};
// Foto para as listas de escolha: kit sem foto própria usa a da primeira peça que tiver
window.fotoNaLista = p => p.foto || (p.tipo === 'kit' ? (p.itens || []).map(i => ((window.painelEstoque || { produtos: [] }).produtos.find(x => x.id === i.produto_id) || {}).foto).find(Boolean) || '' : '');
window.imgProduto = (foto, estilo = '') => `<img src="${window.esc(foto || 'logo.png')}" class="mm-foto" style="${estilo}" onerror="this.src='logo.png'">`;
// Vendedor: tocar na foto abre as fotos da peça em tela cheia, com zoom (bom para mostrar ao cliente)
window.fotoVendedor = (e, estilo = '') => { const n = (e.fotos || []).length; return n ? `<button type="button" class="foto-ver" data-n="${n > 1 ? n : ''}" onclick="verFotosVendedor(${e.produto_id})" title="Ver as fotos">${window.imgProduto(e.foto, estilo)}</button>` : window.imgProduto(e.foto, estilo); };
window.verFotosVendedor = pid => { const e = ((window.painelVendedor || {}).estoque || []).find(x => x.produto_id === pid); if (e) window.abrirGaleria({ fotos: e.fotos && e.fotos.length ? e.fotos : [e.foto], titulo: e.nome }); };

// ==========================================
// ⚙️ PARÂMETROS (Ajustes)
// ==========================================
window.carregarConfigMM = async function() {
    try {
        window.configMM = (await window.apiAcao("obter_config")).config;
        const c = window.configMM;
        window.$('cfg-markup-repasse').value = c.markup_repasse; window.$('cfg-margem-vendedor').value = c.margem_vendedor;
        window.$('cfg-estoque-minimo').value = c.estoque_minimo; window.$('cfg-telefone-admin').value = c.telefone_admin;
        window.sugerirRepasseCalculadora();
    } catch (e) { window.addLog(`Erro parâmetros: ${e.message}`, "error"); }
};
window.salvarConfigMM = async function() {
    try {
        const valores = { markup_repasse: window.$('cfg-markup-repasse').value || '100', margem_vendedor: window.$('cfg-margem-vendedor').value || '0', estoque_minimo: window.$('cfg-estoque-minimo').value || '0', telefone_admin: window.$('cfg-telefone-admin').value.trim() };
        window.configMM = (await window.apiAcao("salvar_config", { valores })).config;
        window.sugerirRepasseCalculadora();
        window.mostrarAlerta("Salvo!", "Parâmetros do consignado atualizados.", "success");
    } catch (e) { window.mostrarAlerta("Erro", e.message, "error"); }
};

// ==========================================
// 📋 EDITAR MODELO (repasse, preço sugerido, foto, vínculo com a vitrine)
// ==========================================
window.abrirModalEditarModelo = function(linha) {
    const p = window.arrayBancoCustos.find(x => x.linha === linha); if (!p) return;
    const custo = window.limparValorPlanilha(p.custo_total), c = window.configMM || {};
    const mk = parseFloat(c.markup_repasse), mg = parseFloat(c.margem_vendedor);
    const sugRep = custo * (1 + (isNaN(mk) ? 100 : mk) / 100), baseSug = p.preco_repasse || sugRep, sugVenda = baseSug * (1 + (isNaN(mg) ? 50 : mg) / 100);
    const optsCat = '<option value="0">— nenhum —</option>' + (window.catalogoAdminArray || []).map(k => `<option value="${k.linha}" data-foto="${window.esc(window.primeiraFotoMM(k.foto))}" ${p.catalogo_id === k.linha ? 'selected' : ''}>${window.esc(k.nome)}</option>`).join('');
    window.abrirModalMM(`
        <h3 class="modal-title">✏️ Editar Modelo</h3>
        <div class="foto-atual-box" style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">${window.imgProduto(p.foto)}<span style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">🏠 Ateliê: <b>${p.est_atelie}</b> · 👥 Com vendedores: <b>${p.est_vendedores}</b></span></div>
        <div class="input-group"><label>Nome do modelo</label><input type="text" id="em-nome" value="${window.esc(p.modelo)}"></div>
        <div class="row"><div class="col"><div class="input-group"><label>Peso (g)</label><input type="text" id="em-peso" value="${window.esc(p.peso || '')}"></div></div><div class="col"><div class="input-group"><label>Tempo (h)</label><input type="text" id="em-tempo" value="${window.esc(p.tempo || '')}"></div></div></div>
        <div class="row"><div class="col"><div class="input-group"><label>Insumos</label><input type="text" id="em-insumos" class="mask-money" value="${window.fmt(window.limparValorPlanilha(p.insumos))}"></div></div><div class="col"><div class="input-group"><label>Custo total</label><input type="text" id="em-custo" class="mask-money" value="${window.fmt(custo)}"></div></div></div>
        <div class="input-group"><label style="color:#1d4ed8;">🤝 Preço de repasse (o que o vendedor te paga)</label><input type="text" id="em-repasse" class="mask-money" value="${p.preco_repasse ? window.fmt(p.preco_repasse) : ''}" placeholder="R$ 0,00" style="border-color:#bfdbfe;background:#eff6ff;font-weight:900;">
            <button class="btn-limpar" style="margin-top:6px;" onclick="window.$('em-repasse').value='${window.fmt(sugRep)}'">💡 Usar sugestão: ${window.fmt(sugRep)}</button></div>
        <div class="input-group"><label>💡 Preço sugerido ao vendedor (opcional)</label><input type="text" id="em-sugerido" class="mask-money" value="${p.preco_sugerido ? window.fmt(p.preco_sugerido) : ''}" placeholder="Vazio = ${window.fmt(sugVenda)} (margem dos Ajustes)"></div>
        <div class="input-group"><label>Foto do produto (vazio = mantém)</label><input type="file" id="em-foto" accept="image/*"></div>
        <div class="row"><div class="col"><div class="input-group"><label>Item da vitrine (Catálogo)</label><select id="em-catalogo" data-fotos>${optsCat}</select></div></div>
            <div class="col"><div class="input-group"><label>Status</label><select id="em-ativo"><option value="true" ${p.ativo !== false ? 'selected' : ''}>🟢 Ativo</option><option value="false" ${p.ativo === false ? 'selected' : ''}>🔴 Inativo</option></select></div></div></div>
        <div style="display:flex; gap:10px; margin-top:10px;">
            <button class="btn-magic btn-excluir" style="margin-top:0; flex:1;" onclick="window.excluirModelo(${p.linha})">🗑️ Excluir</button>
            <button class="btn-magic btn-global" id="btn-em-salvar" style="margin-top:0; flex:2;" onclick="window.salvarEdicaoModelo(${p.linha})">💾 Salvar</button>
        </div>`);
};
window.salvarEdicaoModelo = async function(linha) {
    const nome = window.$('em-nome').value.trim(); if (!nome) return window.mostrarAlerta("Atenção", "Digite o nome.", "warning");
    const b = window.$('btn-em-salvar'); b.disabled = true; b.innerText = "⏳ Salvando...";
    try {
        let foto = "";
        const f = window.$('em-foto').files; if (f.length) foto = await window.fazerUploadInteligente(await window.comprimirImagem(f[0], 800, 800, 0.8));
        const val = id => window.$(id).value ? window.fmtPlanilha(window.limparValorPlanilha(window.$(id).value)) : "";
        await window.apiAcao("atualizar_custo", { linha, modelo: nome, peso: window.$('em-peso').value, tempo: window.$('em-tempo').value, insumos: val('em-insumos') || "R$ 0,00", custo_total: val('em-custo') || "R$ 0,00", preco_repasse: val('em-repasse'), preco_sugerido: val('em-sugerido'), foto, ativo: window.$('em-ativo').value === "true", catalogo_id: parseInt(window.$('em-catalogo').value) || 0 });
        window.fecharModalMM(); window.mostrarAlerta("Salvo!", "Modelo atualizado.", "success"); window.carregarBancoDeCustos();
        if (window.painelEstoque) window.carregarPainelEstoque();
    } catch (e) { window.mostrarAlerta("Erro", e.message, "error"); b.disabled = false; b.innerText = "💾 Salvar"; }
};
window.excluirModelo = async function(linha) {
    const p = window.arrayBancoCustos.find(x => x.linha === linha); if (!p) return;
    if (!await window.confirmarMM({ tipo: 'perigo', icone: '🗑️', titulo: `Excluir "${p.modelo}"?`, texto: "As vendas antigas continuam no histórico.\nSe só não quer mais vender, prefira marcar como Inativo.", ok: 'Excluir modelo' })) return;
    try { await window.apiAcao("excluir_registro", { aba: "CustosProdutos", linha }); window.fecharModalMM(); window.mostrarAlerta("Excluído", "Modelo removido.", "success"); window.carregarBancoDeCustos(); }
    catch (e) { window.mostrarAlerta("Não deu", e.message, "warning"); }
};

// ==========================================
// 📦 PAINEL DE ESTOQUE (ADMIN)
// ==========================================
window.carregarPainelEstoque = async function() {
    ['loading-estoque', 'loading-vendedores'].forEach(id => { if (window.$(id)) window.$(id).style.display = 'block'; });
    try { window.painelEstoque = await window.apiAcao("painel_estoque"); window.configMM = window.painelEstoque.config; window.renderizarEstoque(); window.renderizarVendedores(); }
    catch (e) { window.mostrarAlerta("Erro", e.message, "error"); }
    finally { ['loading-estoque', 'loading-vendedores'].forEach(id => { if (window.$(id)) window.$(id).style.display = 'none'; }); }
};
window.qtdEm = (pid, local) => { const e = window.painelEstoque.estoque.find(x => x.produto_id === pid && x.vendedor_id === local); return e ? e.qtd : 0; };
window.repasseParaVendedor = (vid, produto) => { const esp = window.painelEstoque.especiais.find(x => x.vendedor_id === vid && x.produto_id === produto.id); return esp ? esp.preco : (produto.repasse || 0); };
window.nomeDoLocal = id => { if (id === 0) return '🏠 Ateliê'; if (id === null || id === undefined) return '—'; const v = window.painelEstoque && window.painelEstoque.vendedores.find(x => x.id === id); return v ? `👤 ${window.esc(v.nome)}` : `#${id}`; };

// Onde está cada peça: "Por produto" mostra o Ateliê e cada vendedor que tem aquele produto;
// "Por vendedor" mostra o que está com cada um. O filtro "Onde está" mostra só um lugar.
window.EST = { visao: 'produto', onde: '' };
const inicialMM = nome => (String(nome || '?').trim()[0] || '?').toUpperCase();
window.estoqueVisao = function(v) { window.EST.visao = v; window.renderizarEstoque(); };
window.estoqueOnde = function(o) { window.EST.onde = o; if (o !== '' && window.EST.visao === 'vendedor' && o === '0') window.EST.visao = 'produto'; window.renderizarEstoque(); };
window.estoqueBaixo = function() { window.EST.onde = '0'; window.EST.visao = 'produto'; window.EST.baixo = true; window.renderizarEstoque(); };
window.renderizarEstoque = function() {
    const P = window.painelEstoque, E = window.EST; if (!P || !window.$('lista-estoque')) return;
    const minimo = parseInt(P.config.estoque_minimo) || 0;
    const produto = id => P.produtos.find(x => x.id === id);
    let noAtelie = 0, comVend = 0, valorComVend = 0;
    P.estoque.forEach(e => { const p = produto(e.produto_id); if (e.vendedor_id === 0) noAtelie += e.qtd; else { comVend += e.qtd; if (p) valorComVend += e.qtd * window.repasseParaVendedor(e.vendedor_id, p); } });
    const aReceber = P.pendentes.reduce((s, x) => s + x.total, 0);
    const semRepasse = P.produtos.filter(p => p.ativo && !p.repasse).length;
    const ehBaixo = p => p.ativo && minimo > 0 && window.qtdEm(p.id, 0) > 0 && window.qtdEm(p.id, 0) <= minimo;
    const baixos = P.produtos.filter(ehBaixo).length;
    window.$('estoque-resumo').innerHTML = `<div class="resumo-faixa">
            <button type="button" class="rf" onclick="estoqueOnde('0')"><small>No Ateliê</small><b>${noAtelie}</b><i>peças prontas</i></button>
            <button type="button" class="rf roxo" onclick="estoqueVisao('vendedor')"><small>Com vendedores</small><b>${comVend}</b><i>${window.fmt(valorComVend)} em repasse</i></button>
            <button type="button" class="rf laranja" onclick="switchTab('vendedores')"><small>Falta acertar</small><b>${window.fmt(aReceber)}</b><i>vendas dos vendedores</i></button>
        </div>
        ${semRepasse || baixos ? `<div class="avisos-linha">
            ${semRepasse ? `<button type="button" class="aviso-chip" onclick="switchTab('modelos'); filtroProdutos('semrepasse')">${window.ic('alerta')}${semRepasse} sem preço de repasse</button>` : ''}
            ${baixos ? `<button type="button" class="aviso-chip" onclick="estoqueBaixo()">${window.ic('alerta')}${baixos} com estoque baixo no Ateliê</button>` : ''}</div>` : ''}`;
    // Filtro "Onde está": Ateliê, qualquer vendedor ou um vendedor
    const pecasDe = vid => P.estoque.filter(e => e.vendedor_id === vid).reduce((s, e) => s + e.qtd, 0);
    const sel = window.$('estoque-onde');
    sel.innerHTML = `<option value="">Todos os lugares</option><option value="0">Só no Ateliê</option><option value="v">Com vendedores</option>`
        + P.vendedores.filter(v => pecasDe(v.id) > 0).map(v => `<option value="${v.id}">Com ${window.esc(v.nome)} (${pecasDe(v.id)})</option>`).join('');
    if (![...sel.options].some(o => o.value === E.onde)) E.onde = '';
    sel.value = E.onde;
    document.querySelectorAll('#estoque-visao button').forEach(b => b.classList.toggle('active', b.dataset.v === E.visao));
    const t = window.$('busca-estoque').value || '', mostrarSem = window.$('estoque-mostrar-sem').checked;
    const totalDe = pid => P.estoque.filter(e => e.produto_id === pid).reduce((s, e) => s + e.qtd, 0);
    const visiveis = P.produtos.filter(p => p.ativo || totalDe(p.id) > 0);
    window.montarFiltroCategoria('estoque-categoria', visiveis); const cat = window.$('estoque-categoria').value;
    window.$('estoque-mostrar-sem').closest('label').hidden = E.visao === 'vendedor' || E.onde !== '';
    if (E.visao === 'vendedor') return window.renderizarEstoquePorVendedor(t, cat);

    const noLugar = p => E.onde === '' ? (mostrarSem || totalDe(p.id) > 0) : E.onde === '0' ? window.qtdEm(p.id, 0) > 0 : E.onde === 'v' ? P.estoque.some(e => e.produto_id === p.id && e.vendedor_id > 0 && e.qtd > 0) : window.qtdEm(p.id, parseInt(E.onde)) > 0;
    const lista = visiveis.filter(p => noLugar(p) && (!E.baixo || ehBaixo(p)) && window.categoriaBate(p, cat) && window.produtoBate(p, t));
    window.$('estoque-info-lista').innerHTML = `${lista.length} produto${lista.length === 1 ? '' : 's'}${E.baixo ? ` · <a onclick="EST.baixo = false; EST.onde = ''; renderizarEstoque()">ver todos</a>` : ''}`;
    if (!lista.length) {
        window.$('lista-estoque').innerHTML = !visiveis.length ? `<div class="vazio-box">${window.ic('pacote')}<b>Nenhum produto ainda</b><span>Cadastre em <a onclick="switchTab('precificar')">Precificar</a>.</span></div>`
            : `<div class="vazio-box">${window.ic('busca')}<b>Nada aqui</b><span>${t || cat ? 'Tente outra busca ou categoria.' : E.onde === '' ? 'Nenhuma peça em estoque. Use <b>Registrar produção</b> ou ligue <b>Mostrar sem estoque</b>.' : 'Nenhuma peça nesse lugar.'}</span></div>`;
        return;
    }
    window.$('lista-estoque').innerHTML = lista.map(p => {
        const at = window.qtdEm(p.id, 0), total = totalDe(p.id);
        const comEles = P.estoque.filter(e => e.produto_id === p.id && e.vendedor_id > 0 && e.qtd > 0).sort((a, b) => b.qtd - a.qtd);
        const corAt = at <= 0 ? 'zero' : (minimo > 0 && at <= minimo ? 'baixo' : '');
        const kit = p.tipo === 'kit', da = kit ? window.kitsMontaveis(p) : 0;
        const nomeV = vid => (P.vendedores.find(v => v.id === vid) || { nome: `#${vid}` }).nome;
        return `<div class="est-card ${p.ativo ? '' : 'inativo'}">${window.fotoRapida(p.id, p.foto)}
            <div class="est-info">
                <h4>${window.esc(p.nome)}${kit ? ` <span class="tag-kit">Kit · ${p.itens.reduce((s, i) => s + i.qtd, 0)} peças</span>` : ''}${p.ativo ? '' : ' <span class="tag-inativo">Inativo</span>'}</h4>
                <div class="est-onde">
                    <span class="onde atelie ${corAt}" title="No Ateliê">${window.ic('arquivo')}Ateliê <b>${at}</b></span>
                    ${comEles.map(e => `<button type="button" class="onde vend" onclick="abrirVendedor(${e.vendedor_id}, 'pecas')" title="Abrir o controle de ${window.esc(nomeV(e.vendedor_id))}"><i>${window.esc(inicialMM(nomeV(e.vendedor_id)))}</i>${window.esc(nomeV(e.vendedor_id))} <b>${e.qtd}</b></button>`).join('')}
                </div>
                <small class="est-precos">${total} no total · ${p.repasse ? `repasse ${window.fmt(p.repasse)}` : '<b class="txt-vermelho">sem repasse</b>'} · custo ${window.fmt(p.custo)}${kit ? ` · <b class="${da > 0 ? 'txt-verde' : ''}">dá para montar ${da}</b>` : ''}</small>${window.chipMedidas(p.id, p.medidas)}
            </div>
            <div class="mm-acoes">${kit
                ? `<button class="btn-ic verde" title="Montar kit" onclick="abrirMontarKit(${p.id})">${window.ic('camadas')}</button>${at > 0 ? `<button class="btn-ic" title="Desmontar kit (peças voltam soltas)" onclick="desmontarKit(${p.id})">${window.ic('desfazer')}</button>` : ''}`
                : `<button class="btn-ic verde" title="Registrar produção" onclick="abrirProducao(${p.id})">${window.ic('mais')}</button>`}
                <button class="btn-ic" title="Editar nome, categoria e preços" onclick="abrirEdicaoProduto(${p.id})">${window.ic('etiqueta')}</button><button class="btn-ic" title="Corrigir a quantidade do Ateliê" onclick="abrirAjusteAtelie(${p.id})">${window.ic('lapis')}</button><button class="btn-ic" title="Histórico deste produto" onclick="abrirMovimentos({produto_id:${p.id}})">${window.ic('historico')}</button></div></div>`;
    }).join('');
};
window.renderizarEstoquePorVendedor = function(t, cat) {
    const P = window.painelEstoque, E = window.EST, produto = id => P.produtos.find(x => x.id === id);
    const bate = e => { const p = produto(e.produto_id); return p && e.qtd > 0 && window.categoriaBate(p, cat) && window.produtoBate(p, t); };
    const pend = vid => (P.pendentes.find(x => x.vendedor_id === vid) || { total: 0 }).total;
    const grupos = [{ id: 0, nome: 'Ateliê' }, ...P.vendedores].filter(v => E.onde === '' || (E.onde === 'v' ? v.id > 0 : String(v.id) === E.onde))
        .map(v => ({ v, itens: P.estoque.filter(e => e.vendedor_id === v.id && bate(e)).sort((a, b) => b.qtd - a.qtd) }))
        .filter(g => g.itens.length || (g.v.id > 0 && pend(g.v.id) > 0 && !t && !cat));
    window.$('estoque-info-lista').innerText = `${grupos.filter(g => g.v.id > 0).length} vendedor(es) com peças`;
    if (!grupos.length) { window.$('lista-estoque').innerHTML = `<div class="vazio-box">${window.ic('usuarios')}<b>Nenhuma peça nesse filtro</b><span>Envie peças em <b>Enviar peças</b>.</span></div>`; return; }
    window.$('lista-estoque').innerHTML = grupos.map(({ v, itens }) => {
        const pecas = itens.reduce((s, e) => s + e.qtd, 0), valor = itens.reduce((s, e) => s + e.qtd * (v.id ? window.repasseParaVendedor(v.id, produto(e.produto_id)) : 0), 0);
        return `<div class="estv ${v.id ? '' : 'atelie'}">
            <div class="estv-cab" ${v.id ? `onclick="abrirVendedor(${v.id}, 'pecas')" role="button" tabindex="0"` : ''}>
                <span class="avatar-v ${v.id ? '' : 'casa'}">${v.id ? window.esc(inicialMM(v.nome)) : window.ic('arquivo')}</span>
                <div><b>${window.esc(v.nome)}</b><small>${pecas} peça${pecas === 1 ? '' : 's'}${v.id ? ` · ${window.fmt(valor)} em repasse${pend(v.id) > 0 ? ` · <span class="txt-laranja">falta acertar ${window.fmt(pend(v.id))}</span>` : ''}` : ''}</small></div>
                ${v.id ? `<span class="estv-abrir">Controle${window.ic('seta-dir')}</span>` : ''}
            </div>
            ${itens.map(e => { const p = produto(e.produto_id); return `<div class="estv-item"><img src="${window.esc(window.fotoNaLista(p) || 'logo.png')}" onerror="this.src='logo.png'" alt="" loading="lazy"><span>${window.esc(p.nome)}</span><b>${e.qtd}</b></div>`; }).join('') || '<p class="estv-vazio">Nenhuma peça agora.</p>'}
        </div>`;
    }).join('');
};

// ==========================================
// 🧩 KITS: MONTAR (peças → kit) E DESMONTAR (kit → peças)
// ==========================================
window.kitsMontaveis = function(kit) {
    if (!kit.itens || !kit.itens.length) return 0;
    return Math.min(...kit.itens.map(i => Math.floor(Math.max(0, window.qtdEm(i.produto_id, 0)) / (i.qtd || 1))));
};
window.abrirMontarKit = function(kitId) {
    const P = window.painelEstoque; if (!P) return;
    const kits = P.produtos.filter(p => p.tipo === 'kit' && p.ativo);
    if (!kits.length) return window.confirmarMM({ icone: '🧩', titulo: 'Nenhum kit cadastrado', texto: 'Primeiro cadastre o kit em Precificar → Kit, escolhendo as peças que vão nele.', ok: 'Cadastrar kit', cancelar: 'Agora não' }).then(s => { if (s) window.novoProduto('kit'); });
    const sel = kitId || kits[0].id;
    window.abrirModalMM(`<h3 class="modal-title">${window.ic('camadas')} Montar kit</h3>
        <p class="texto-ajuda" style="margin-top:0;">As peças saem do Ateliê e o kit pronto entra no Ateliê.</p>
        <div class="row"><div class="col"><div class="input-group"><label>Kit</label><select id="mk-kit" data-fotos onchange="atualizarMontarKit()">${kits.map(k => `<option value="${k.id}" data-foto="${window.esc(window.fotoNaLista(k))}" ${k.id === sel ? 'selected' : ''}>${window.esc(k.nome)}</option>`).join('')}</select></div></div>
            <div class="col" style="max-width:150px;"><div class="input-group"><label>Quantos kits?</label><input type="number" id="mk-qtd" value="1" min="1" oninput="atualizarMontarKit()"></div></div></div>
        <div id="mk-tabela"></div>
        <label class="chave" style="margin:14px 0 4px;"><input type="checkbox" id="mk-imprimir" onchange="atualizarMontarKit()"> Imprimir o que faltar (lança as peças que faltam como produção)</label>
        <div class="input-group" style="margin-top:12px;"><label>Observação (opcional)</label><input type="text" id="mk-obs" placeholder="Ex: kits para a feira"></div>
        <button class="btn-magic btn-global" id="btn-mk" onclick="confirmarMontarKit()">${window.ic('check')} Montar</button>`);
    window.atualizarMontarKit();
};
window.atualizarMontarKit = function() {
    const P = window.painelEstoque, kit = P.produtos.find(p => p.id === parseInt(window.$('mk-kit').value)); if (!kit) return;
    const qtd = Math.max(1, parseInt(window.$('mk-qtd').value) || 1), imprimir = window.$('mk-imprimir').checked;
    let falta = 0;
    const linhas = (kit.itens || []).map(i => {
        const p = P.produtos.find(x => x.id === i.produto_id) || { nome: '(peça removida)' }, precisa = i.qtd * qtd, tem = Math.max(0, window.qtdEm(i.produto_id, 0)), f = Math.max(0, precisa - tem);
        falta += f;
        return `<div class="mk-linha ${f ? 'falta' : ''}"><span class="mk-nome"><img src="${window.esc(p.foto || 'logo.png')}" onerror="this.src='logo.png'" alt="" loading="lazy"><span>${window.esc(p.nome)}<small>${i.qtd} por kit</small></span></span><span>${precisa}</span><span>${tem}</span><b>${f ? (imprimir ? `imprime ${f}` : `falta ${f}`) : 'ok'}</b></div>`;
    }).join('');
    window.$('mk-tabela').innerHTML = kit.itens && kit.itens.length
        ? `<div class="mk-tabela"><div class="mk-linha cab"><span>Peça</span><span>Precisa</span><span>No Ateliê</span><span></span></div>${linhas}</div>
           <p class="mk-resumo ${falta && !imprimir ? 'ruim' : ''}">${falta ? (imprimir ? `As ${falta} peça(s) que faltam entram como produção e já vão para o kit.` : `Faltam ${falta} peça(s). Ligue "Imprimir o que faltar" ou produza antes.`) : `Tudo certo: dá para montar ${qtd} kit(s) com o que tem no Ateliê.`}</p>`
        : '<p class="mm-vazio">Esse kit não tem peças cadastradas. Edite em Produtos.</p>';
    const b = window.$('btn-mk'); b.disabled = !kit.itens || !kit.itens.length || (falta > 0 && !imprimir);
    b.innerHTML = `${window.ic('check')} Montar ${qtd} kit${qtd > 1 ? 's' : ''}`;
};
window.confirmarMontarKit = async function() {
    const b = window.$('btn-mk'); b.disabled = true;
    try {
        const r = await window.apiAcao('montar_kit', { kit_id: parseInt(window.$('mk-kit').value), qtd: parseInt(window.$('mk-qtd').value), imprimir_faltas: window.$('mk-imprimir').checked, obs: window.$('mk-obs').value });
        window.fecharModalMM(); window.toastMM(`Kit montado: ${r.kit}`);
        window.carregarPainelEstoque(); window.carregarBancoDeCustos();
    } catch (e) { window.mostrarAlerta('Não deu para montar', e.message, 'error'); b.disabled = false; }
};
window.desmontarKit = async function(kitId) {
    const kit = window.painelEstoque.produtos.find(p => p.id === kitId); if (!kit) return;
    const max = window.qtdEm(kitId, 0); if (max <= 0) return;
    const n = await window.pedirQtd({ icone: '🧩', titulo: 'Desmontar kit', html: `Quantos <b>${window.esc(kit.nome)}</b> vão virar peças soltas de novo?<br><small>No Ateliê: ${max}</small>`, valor: '1', ok: 'Desmontar' }, max);
    if (!n) return;
    try { await window.apiAcao('desmontar_kit', { kit_id: kitId, qtd: n }); window.toastMM('Kit desmontado: as peças voltaram para o Ateliê'); window.carregarPainelEstoque(); window.carregarBancoDeCustos(); }
    catch (e) { window.mostrarAlerta('Erro', e.message, 'error'); }
};

window.abrirProducao = function(pid) {
    const P = window.painelEstoque; if (!P) return;
    const opts = P.produtos.filter(p => p.ativo).map(p => `<option value="${p.id}" data-foto="${window.esc(window.fotoNaLista(p))}" data-sub="${p.tipo === 'kit' ? 'Kit · ' : ''}No Ateliê: ${window.qtdEm(p.id, 0)}" ${p.id === pid ? 'selected' : ''}>${window.esc(p.nome)}</option>`).join('');
    if (!opts) return window.mostrarAlerta("Atenção", "Cadastre um modelo em Precificar primeiro.", "warning");
    window.abrirModalMM(`<h3 class="modal-title">🖨️ Registrar Produção</h3>
        <p style="font-size:0.8rem;color:var(--text-muted);font-weight:600;margin-top:-8px;">Peças prontas que saíram da impressora entram no estoque do Ateliê.</p>
        <div class="input-group"><label>Produto</label><input type="search" class="busca-select" placeholder="Buscar produto…" autocomplete="off" oninput="filtrarSelect('pr-produto', this.value)"><select data-fotos id="pr-produto">${opts}</select></div>
        <div class="row"><div class="col"><div class="input-group"><label>Quantidade</label><input type="number" id="pr-qtd" value="1" min="1"></div></div><div class="col"><div class="input-group"><label>Observação</label><input type="text" id="pr-obs" placeholder="Ex: lote azul"></div></div></div>
        <button class="btn-magic btn-global" id="btn-pr" onclick="window.confirmarProducao()">✅ Entrar no Ateliê</button>`);
};
window.confirmarProducao = async function() {
    const b = window.$('btn-pr'); b.disabled = true;
    try { await window.apiAcao("produzir", { produto_id: parseInt(window.$('pr-produto').value), qtd: parseInt(window.$('pr-qtd').value), obs: window.$('pr-obs').value }); window.fecharModalMM(); window.mostrarAlerta("Produzido!", "Peças lançadas no Ateliê.", "success"); window.carregarPainelEstoque(); window.carregarBancoDeCustos(); }
    catch (e) { window.mostrarAlerta("Erro", e.message, "error"); b.disabled = false; }
};

window.abrirAjusteAtelie = function(pid) {
    const p = window.painelEstoque.produtos.find(x => x.id === pid); if (!p) return; const at = window.qtdEm(pid, 0);
    window.abrirModalMM(`<h3 class="modal-title">✏️ Ajustar Ateliê</h3><p style="font-weight:800;color:var(--brand-dark);">${window.esc(p.nome)}</p>
        <p style="font-size:0.8rem;color:var(--text-muted);font-weight:600;">O sistema diz <b>${at}</b>. Conte as peças de verdade e informe abaixo. Diferença pra menos vira <b>perda</b>; pra mais vira <b>ajuste de entrada</b>.</p>
        <div class="row"><div class="col"><div class="input-group"><label>Quantidade real</label><input type="number" id="aj-qtd" value="${at}" min="0"></div></div><div class="col"><div class="input-group"><label>Motivo</label><input type="text" id="aj-motivo" placeholder="Ex: peça quebrou"></div></div></div>
        <button class="btn-magic btn-global" id="btn-aj" onclick="window.confirmarAjusteAtelie(${pid})">💾 Salvar Ajuste</button>`);
};
window.confirmarAjusteAtelie = async function(pid) {
    const b = window.$('btn-aj'); b.disabled = true;
    try { await window.apiAcao("conferir_estoque", { vendedor_id: 0, itens: [{ produto_id: pid, contado: parseInt(window.$('aj-qtd').value) }], tratamento: "perda", motivo: window.$('aj-motivo').value }); window.fecharModalMM(); window.mostrarAlerta("Ajustado!", "Estoque do Ateliê corrigido.", "success"); window.carregarPainelEstoque(); window.carregarBancoDeCustos(); }
    catch (e) { window.mostrarAlerta("Erro", e.message, "error"); b.disabled = false; }
};

// 🧳 MALA: escolhe o vendedor uma vez e marca as quantidades de vários produtos.
// Por padrão lista só o que tem peça no Ateliê. Ligando "sem estoque", dá pra mandar peça que ainda
// não foi lançada: a diferença entra como produção logo antes do envio (fica no histórico).
window.abrirMala = function(vidPre) {
    const P = window.painelEstoque; if (!P) return;
    const vends = P.vendedores.filter(v => v.ativo);
    if (!vends.length) return window.mostrarAlerta("Atenção", "Cadastre um vendedor primeiro (aba Vendedores).", "warning");
    const prods = P.produtos.filter(p => p.ativo);
    if (!prods.length) return window.mostrarAlerta("Atenção", "Cadastre um modelo em Precificar primeiro.", "warning");
    const atelieVazio = !prods.some(p => window.qtdEm(p.id, 0) > 0);
    window.abrirModalMM(`<h3 class="modal-title">🧳 Enviar mala</h3>
        <div class="input-group"><label>Para qual vendedor?</label><select id="mala-vendedor" onchange="window.atualizarMala()">${vends.map(v => `<option value="${v.id}" ${v.id === vidPre ? 'selected' : ''}>${window.esc(v.nome)}</option>`).join('')}</select></div>
        ${atelieVazio ? '<div class="mm-alerta">🏠 O Ateliê está sem peças, então estou mostrando todos os produtos. O que você mandar entra como produção na hora do envio.</div>' : ''}
        <input type="text" id="mala-busca" class="search-bar" placeholder="🔍 Filtrar produtos..." onkeyup="window.filtrarMala()" style="margin-bottom:10px;">
        <div class="linha-opcao"><label class="chave"><input type="checkbox" id="mala-mostrar-sem" onchange="window.filtrarMala()" ${atelieVazio ? 'checked' : ''}> Mostrar também sem estoque</label><span id="mala-info" class="info-lista"></span></div>
        <div id="mala-lista" class="lista-escolha">${prods.map(p => { const at = window.qtdEm(p.id, 0); return `
            <div class="mm-linha${at > 0 ? '' : ' sem-estoque'}" data-nome="${window.esc(p.nome + ' ' + (p.categoria || '') + (p.tipo === 'kit' ? ' kit' : ''))}" data-atelie="${at}">${window.imgProduto(p.foto)}<span class="mm-nome">${window.esc(p.nome)}<span class="mm-sub">${at > 0 ? `🏠 Ateliê: ${at}` : '🏠 Sem peças no Ateliê'} · <span id="mala-rep-${p.id}"></span></span></span>
            <input type="number" class="mala-qtd" data-pid="${p.id}" min="0" value="0" inputmode="numeric" oninput="window.atualizarMalaTotal()"></div>`; }).join('')}
            <p class="mm-vazio" id="mala-vazio" style="display:none;">Nenhum produto aqui.</p></div>
        <div class="mm-total" id="mala-total">0 peças</div>
        <div class="input-group"><label>Observação (opcional)</label><input type="text" id="mala-obs" placeholder="Ex: feira de sábado"></div>
        <button class="btn-magic btn-global" id="btn-mala" onclick="window.confirmarMala()">🧳 Enviar mala</button>`);
    window.atualizarMala(); window.filtrarMala();
};
window.atualizarMala = function() {
    const vid = parseInt(window.$('mala-vendedor').value);
    window.painelEstoque.produtos.forEach(p => { const el = window.$('mala-rep-' + p.id); if (!el) return; const r = window.repasseParaVendedor(vid, p); el.innerHTML = r ? `🤝 ${window.fmt(r)}/un` : '<b style="color:#b91c1c;">⚠️ sem repasse</b>'; });
    window.atualizarMalaTotal();
};
window.filtrarMala = function() {
    const t = window.$('mala-busca').value, todos = window.$('mala-mostrar-sem').checked; let n = 0;
    document.querySelectorAll('#mala-lista .mm-linha').forEach(l => {
        const temQtd = (parseInt(l.querySelector('.mala-qtd').value) || 0) > 0; // o que já foi marcado nunca some
        const ver = temQtd || (window.buscaBate(t, l.dataset.nome) && (todos || parseInt(l.dataset.atelie) > 0));
        l.style.display = ver ? '' : 'none'; if (ver) n++;
    });
    window.$('mala-vazio').style.display = n ? 'none' : 'block';
    window.$('mala-vazio').innerHTML = todos ? 'Nenhum produto encontrado.' : 'Nenhum produto com peça no Ateliê. Ligue <b>Mostrar também sem estoque</b>.';
    const comPeca = document.querySelectorAll('#mala-lista .mm-linha:not(.sem-estoque)').length;
    window.$('mala-info').innerText = todos ? `${document.querySelectorAll('#mala-lista .mm-linha').length} produtos` : `${comPeca} com peças`;
};
window.itensMala = () => [...document.querySelectorAll('.mala-qtd')].map(i => ({ produto_id: parseInt(i.dataset.pid), qtd: parseInt(i.value) || 0 })).filter(i => i.qtd > 0);
// Peças pedidas além do que existe no Ateliê (vão entrar como produção)
window.faltasMala = itens => itens.map(i => ({ ...i, falta: Math.max(0, i.qtd - window.qtdEm(i.produto_id, 0)) })).filter(i => i.falta > 0);
window.atualizarMalaTotal = function() {
    const vid = parseInt(window.$('mala-vendedor').value), itens = window.itensMala(); let pecas = 0, valor = 0;
    itens.forEach(i => { const p = window.painelEstoque.produtos.find(x => x.id === i.produto_id); pecas += i.qtd; valor += i.qtd * window.repasseParaVendedor(vid, p); });
    const falta = window.faltasMala(itens).reduce((s, i) => s + i.falta, 0);
    window.$('mala-total').innerHTML = `${pecas} peça(s) · ${window.fmt(valor)} em repasse se vender tudo${falta ? `<span class="mm-sub" style="color:#92400e;">🖨️ ${falta} peça(s) ainda não estão no Ateliê e vão entrar como produção</span>` : ''}`;
};
window.confirmarMala = async function() {
    const itens = window.itensMala(); if (!itens.length) return window.mostrarAlerta("Atenção", "Coloque a quantidade em pelo menos um produto.", "warning");
    const vid = parseInt(window.$('mala-vendedor').value), nomeV = window.$('mala-vendedor').selectedOptions[0].text;
    const nomeDe = pid => (window.painelEstoque.produtos.find(x => x.id === pid) || {}).nome || '';
    const semRepasse = itens.filter(i => !window.repasseParaVendedor(vid, window.painelEstoque.produtos.find(x => x.id === i.produto_id)));
    if (semRepasse.length) return window.mostrarAlerta("Falta o preço de repasse", `Defina o repasse em Modelos (✏️) antes de enviar: ${semRepasse.map(i => nomeDe(i.produto_id)).join(', ')}.`, "warning");
    const faltas = window.faltasMala(itens), pecas = itens.reduce((s, i) => s + i.qtd, 0);
    const valor = itens.reduce((s, i) => s + i.qtd * window.repasseParaVendedor(vid, window.painelEstoque.produtos.find(x => x.id === i.produto_id)), 0);
    const ok = await window.confirmarMM({ icone: '🧳', titulo: `Enviar mala para ${nomeV}?`, ok: '🧳 Enviar',
        html: `<div class="resumo-confirma">${itens.map(i => `<div><span>${i.qtd}x ${window.esc(nomeDe(i.produto_id))}</span></div>`).join('')}
            <div class="rc-total"><span>${pecas} peça(s)</span><b>${window.fmt(valor)}</b></div></div>
            ${faltas.length ? `<div class="mm-alerta" style="margin:12px 0 0;text-align:left;">🖨️ ${faltas.map(f => `${f.falta}x ${window.esc(nomeDe(f.produto_id))}`).join(', ')} ainda não ${faltas.reduce((s, f) => s + f.falta, 0) > 1 ? 'estão' : 'está'} no Ateliê e vai entrar como <b>produção</b> antes do envio.</div>` : ''}` });
    if (!ok) return;
    const b = window.$('btn-mala'); b.disabled = true; b.innerText = "⏳ Enviando...";
    try {
        for (const f of faltas) await window.apiAcao("produzir", { produto_id: f.produto_id, qtd: f.falta, obs: `Produzido para a mala de ${nomeV}` });
        const res = await window.apiAcao("enviar_mala", { vendedor_id: vid, itens, obs: window.$('mala-obs').value });
        window.ultimoRomaneio = res;
        window.abrirModalMM(`<div class="mm-sucesso"><span class="modal-icon-alert ok">🧳</span><h3 class="modal-title-alert">Mala enviada!</h3>
            <p class="modal-text-alert">${res.romaneio.reduce((s, x) => s + x.qtd, 0)} peça(s) agora estão com <b>${window.esc(res.vendedor.nome)}</b>.</p>
            <a class="btn-magic btn-global" style="text-decoration:none;" href="${window.textoRomaneio(res)}" target="_blank">📲 Mandar romaneio no WhatsApp</a>
            <button class="btn-modal-cancel" style="width:100%;margin-top:10px;" onclick="window.fecharModalMM()">Fechar</button></div>`);
        window.carregarPainelEstoque(); window.carregarBancoDeCustos();
    } catch (e) {
        window.mostrarAlerta("Não deu", e.message, "warning"); b.disabled = false; b.innerText = "🧳 Enviar mala";
        if (faltas.length) window.carregarPainelEstoque(); // a produção pode ter entrado mesmo se o envio falhou
    }
};
window.textoRomaneio = function(res) {
    const total = res.romaneio.reduce((s, x) => s + x.qtd * x.repasse, 0);
    const linhas = res.romaneio.map(x => `• ${x.qtd}x ${x.nome} — repasse ${window.fmt(x.repasse)}/un`).join('\n');
    const txt = `Olá, *${res.vendedor.nome}*! Aqui é do *Mini Mundo 3D* 🌍🖨️\n\nSegue a lista das peças que estou te enviando (consignado):\n\n${linhas}\n\n📦 Total: ${res.romaneio.reduce((s, x) => s + x.qtd, 0)} peça(s)\n💰 Repasse se vender tudo: ${window.fmt(total)}\n\nConfere na chegada e qualquer diferença me avisa! Quando vender, dá baixa no sistema: ${window.linkSistema()}`;
    return window.linkZap(res.vendedor.telefone, txt);
};

window.abrirMovimentos = async function(filtro = {}) {
    window.abrirModalMM('<h3 class="modal-title">📜 Movimentações</h3><p class="mm-vazio">⏳ Carregando...</p>');
    try {
        const res = await window.apiAcao("listar_movimentos", Object.assign({ limite: 300 }, filtro));
        const tipos = { PRODUCAO: '🖨️ Produção', ENVIO: '🧳 Envio', DEVOLUCAO: '↩️ Recolhido', VENDA: '✅ Venda (vendedor)', VENDA_DIRETA: '🛒 Venda direta', AJUSTE: '📋 Ajuste (+)', PERDA: '⚠️ Perda / ajuste (−)', ESTORNO: '↩️ Estorno' };
        const html = res.movimentos.length ? res.movimentos.map(m => `<div class="mm-linha"><span class="mm-nome">${tipos[m.tipo] || window.esc(m.tipo)} · <b>${m.qtd}x</b> ${window.esc(m.produto_nome)}
            <span class="mm-sub">${window.fmtDataHora(m.data_hora)} · ${m.origem_id === null ? 'entrada' : window.nomeDoLocal(m.origem_id)} → ${m.destino_id === null ? 'saída' : window.nomeDoLocal(m.destino_id)} · por ${window.esc(m.usuario)}${m.obs ? ' · ' + window.esc(m.obs) : ''}</span></span></div>`).join('') : '<p class="mm-vazio">Nenhuma movimentação ainda.</p>';
        window.preencherModalMM(`<h3 class="modal-title">📜 Movimentações</h3>${html}`);
    } catch (e) { window.preencherModalMM(`<p class="mm-vazio">❌ ${window.esc(e.message)}</p>`); }
};

// ==========================================
// 🤝 VENDEDORES (ADMIN)
// ==========================================
window.renderizarVendedores = function() {
    const P = window.painelEstoque; if (!P || !window.$('lista-vendedores')) return;
    const pend = vid => P.pendentes.find(x => x.vendedor_id === vid) || { total: 0, n: 0 };
    const pecasDe = vid => P.estoque.filter(e => e.vendedor_id === vid).reduce((s, e) => s + e.qtd, 0);
    const valorDe = vid => P.estoque.filter(e => e.vendedor_id === vid).reduce((s, e) => { const p = P.produtos.find(x => x.id === e.produto_id); return s + (p ? e.qtd * window.repasseParaVendedor(vid, p) : 0); }, 0);
    const ativos = P.vendedores.filter(v => v.ativo), totalPend = P.pendentes.reduce((s, x) => s + x.total, 0);
    const naRua = P.vendedores.reduce((s, v) => s + pecasDe(v.id), 0), valorRua = P.vendedores.reduce((s, v) => s + valorDe(v.id), 0);
    window.$('vendedores-resumo').innerHTML = `<div class="resumo-faixa">
        <div class="rf"><small>Vendedores ativos</small><b>${ativos.length}</b><i>${P.vendedores.length - ativos.length ? `${P.vendedores.length - ativos.length} desativado(s)` : 'na equipe'}</i></div>
        <div class="rf roxo"><small>Peças com eles</small><b>${naRua}</b><i>${window.fmt(valorRua)} em repasse</i></div>
        <div class="rf laranja"><small>Falta acertar</small><b>${window.fmt(totalPend)}</b><i>${P.pendentes.reduce((s, x) => s + x.n, 0)} venda(s)</i></div></div>`;
    const t = window.$('vd-busca') ? window.$('vd-busca').value : '';
    const lista = P.vendedores.filter(v => window.buscaBate(t, v.nome, v.telefone))
        .sort((a, b) => (b.ativo - a.ativo) || (pend(b.id).total - pend(a.id).total) || a.nome.localeCompare(b.nome, 'pt-BR'));
    window.$('lista-vendedores').innerHTML = lista.length ? lista.map(v => {
        const pd = pend(v.id), pc = pecasDe(v.id);
        return `<div class="vend-card ${v.ativo ? '' : 'inativo'}" onclick="abrirVendedor(${v.id})" role="button" tabindex="0">
            <div class="vc-topo"><span class="avatar-v">${window.esc(inicialMM(v.nome))}</span>
                <div class="vc-nome"><b>${window.esc(v.nome)}</b><small>${v.telefone ? window.esc(v.telefone) : 'sem WhatsApp'}${v.criado_em ? ` · desde ${window.fmtDataHora(v.criado_em).slice(0, 8)}` : ''}</small></div>
                ${!v.ativo ? '<span class="pilula canc">Desativado</span>' : pd.total > 0 ? '<span class="pilula pend">Deve acerto</span>' : '<span class="pilula pago">Em dia</span>'}</div>
            <div class="vc-nums">
                <div><small>Com ${window.esc(v.nome)}</small><b>${pc} peça${pc === 1 ? '' : 's'}</b><i>${window.fmt(valorDe(v.id))} em repasse</i></div>
                <div class="${pd.total > 0 ? 'laranja' : 'verde'}"><small>Falta acertar</small><b>${window.fmt(pd.total)}</b><i>${pd.total > 0 ? `${pd.n} venda${pd.n > 1 ? 's' : ''} · desde ${window.fmtDataHora(pd.mais_antiga).slice(0, 8)}` : 'nada pendente'}</i></div>
            </div>
            <div class="vc-acoes" onclick="event.stopPropagation()">
                ${v.ativo ? `<button class="btn-limpar" onclick="abrirMala(${v.id})">${window.ic('mala')}Enviar peças</button>` : ''}
                ${v.telefone ? `<a class="btn-limpar zap" href="${window.linkZap(v.telefone, `Olá, ${v.nome}!`)}" target="_blank" rel="noopener">${window.ic('zap')}WhatsApp</a>` : ''}
                <button class="btn-limpar azul" onclick="abrirVendedor(${v.id})">${window.ic('recibo')}Controle${window.ic('seta-dir')}</button>
            </div></div>`;
    }).join('') : `<div class="vazio-box">${window.ic('usuarios')}<b>${P.vendedores.length ? 'Ninguém com esse nome' : 'Nenhum vendedor ainda'}</b><span>${P.vendedores.length ? '' : 'Toque em <b>Novo vendedor</b> para cadastrar.'}</span></div>`;
    window.renderizarEncomendasAdmin();
};
window.novoVendedor = function() {
    window.abrirModalMM(`<h3 class="modal-title">${window.ic('usuarios')} Novo vendedor</h3>
        <p class="texto-ajuda" style="margin-top:0;">A pessoa entra no sistema com este usuário e senha e vê só as peças dela e o acerto.</p>
        <div class="input-group"><label for="nv-usuario">Nome de usuário (login)</label><input type="text" id="nv-usuario" placeholder="Ex: Kamila" autocomplete="off"></div>
        <div class="row"><div class="col"><div class="input-group"><label for="nv-senha">Senha inicial</label><input type="text" id="nv-senha" placeholder="Mínimo 4 caracteres" autocomplete="off"></div></div>
            <div class="col"><div class="input-group"><label for="nv-telefone">WhatsApp</label><input type="tel" id="nv-telefone" placeholder="11999998888"></div></div></div>
        <button class="btn-magic btn-global" onclick="salvarNovoVendedor()">${window.ic('check')} Cadastrar vendedor</button>`);
    setTimeout(() => window.$('nv-usuario') && window.$('nv-usuario').focus(), 80);
};
window.salvarNovoVendedor = async function() {
    const usuario = window.$('nv-usuario').value.trim(), senha = window.$('nv-senha').value, telefone = window.$('nv-telefone').value.trim();
    try {
        await window.apiAcao("salvar_vendedor", { usuario, senha, telefone });
        const txt = `Olá, *${usuario}*! Bem-vindo(a) à equipe *Mini Mundo 3D* 🌍🖨️\n\nSeu acesso ao sistema:\n🔗 ${window.linkSistema()}\n👤 Usuário: ${usuario}\n🔑 Senha: ${senha}\n\nLá você vê as peças que estão com você, dá baixa quando vender e acompanha seu acerto. Troque a senha no primeiro acesso!`;
        window.abrirModalMM(`<div class="mm-sucesso"><span class="modal-icon-alert ok">${window.ICONES.ok}</span><h3 class="modal-title-alert">Vendedor cadastrado!</h3>
            <p class="modal-text-alert"><b>${window.esc(usuario)}</b> já pode entrar no sistema.</p>
            <a class="btn-magic btn-zap" href="${window.linkZap(telefone, txt)}" target="_blank" rel="noopener">${window.ic('zap')} Enviar o acesso pelo WhatsApp</a>
            <button class="btn-modal-cancel" style="width:100%;margin-top:10px;" onclick="window.fecharModalMM()">Fechar</button></div>`);
        window.carregarPainelEstoque();
    } catch (e) { window.mostrarAlerta("Atenção", e.message, "warning"); }
};

// 📋 CONTROLE DO VENDEDOR: tela própria (o voltar do celular volta para a lista).
// Vendas item a item com o que falta acertar, peças com ele(a), resumo por produto, acertos e dados.
window.CV = { aba: 'vendas', filtro: null };
window.abrirVendedor = async function(vid, aba) {
    if (window.telaAtualMM() !== 'vendedores') window.switchTab('vendedores');
    if (window.$('modal-mm').style.display === 'flex') window.fecharModalMM();
    const box = window.$('vd-controle'), mesmo = window.vendAberto && window.vendAberto.vendedor.id === vid;
    if (!mesmo) { window.CV = { aba: aba || 'vendas', filtro: null }; box.innerHTML = '<div class="carregando-box"><span class="girando"></span>Abrindo o controle…</div>'; window.ultimoAcerto = window.ultimoAcerto && window.ultimoAcerto.vid === vid ? window.ultimoAcerto : null; }
    else if (aba) window.CV.aba = aba;
    window.$('vd-lista-box').hidden = true; box.hidden = false;
    if (!window.NAV.sub) window.navSubTela(window.fecharControleVendedor);
    if (!mesmo) window.scrollTo(0, 0);
    try {
        const r = await window.apiAcao('controle_vendedor', { vendedor_id: vid });
        window.vendAberto = Object.assign(r, { pendente_total: r.resumo.a_acertar });
        if (window.CV.filtro === null) window.CV.filtro = r.resumo.baixas_pendentes ? 'pendente' : 'todas';
        window.renderizarFichaVendedor();
    } catch (e) { box.innerHTML = `<button class="btn-limpar" onclick="fecharControleVendedor()">${window.ic('voltar')} Vendedores</button><div class="vazio-box">${window.ic('alerta')}<b>Não consegui abrir</b><span>${window.esc(e.message)}</span></div>`; }
};
window.fecharControleVendedor = function() {
    window.$('vd-controle').hidden = true; window.$('vd-lista-box').hidden = false;
    window.vendAberto = null; window.ultimoAcerto = null; window.navSaiuSubTela();
};
window.aoSairDaTela = window.aoSairDaTela || {};
window.aoSairDaTela.vendedores = () => { if (window.$('vd-controle') && !window.$('vd-controle').hidden) window.fecharControleVendedor(); };
window.cvAba = function(aba, filtro) { window.CV.aba = aba; if (filtro) window.CV.filtro = filtro; window.renderizarCorpoVendedor(); };
window.renderizarFichaVendedor = function() {
    const d = window.vendAberto, v = d.vendedor, r = d.resumo, nome = window.esc(v.nome);
    const banner = window.ultimoAcerto && window.ultimoAcerto.vid === v.id ? `<div class="mm-alerta ok">${window.ic('check')}<span>Acerto de <b>${window.fmt(window.ultimoAcerto.total)}</b> registrado. <a href="${window.linkZap(v.telefone, `Olá, *${v.nome}*! Recebi ${window.fmt(window.ultimoAcerto.total)} referente às suas vendas. Obrigado! 🙏 — Mini Mundo 3D`)}" target="_blank" rel="noopener">Mandar recibo no WhatsApp</a></span></div>` : '';
    window.$('vd-controle').innerHTML = `
        <div class="cv-barra">
            <button class="btn-limpar" onclick="fecharControleVendedor()">${window.ic('voltar')} Vendedores</button>
            <div class="cv-barra-acoes">
                ${v.telefone ? `<a class="btn-ic zap" title="WhatsApp" aria-label="WhatsApp de ${nome}" href="${window.linkZap(v.telefone, `Olá, ${v.nome}!`)}" target="_blank" rel="noopener">${window.ic('zap')}</a>` : ''}
                <button class="btn-ic" title="Ver o sistema como ${nome} vê" aria-label="Ver como ${nome}" onclick="verComoVendedor(${v.id})">${window.ic('olho')}</button>
                ${v.ativo ? `<button class="btn-limpar" onclick="abrirMala(${v.id})">${window.ic('mala')}Enviar peças</button>` : ''}
            </div>
        </div>
        <div class="cv-perfil"><span class="avatar-v grande">${window.esc(inicialMM(v.nome))}</span>
            <div><h2>${nome}</h2><small>${v.telefone ? window.esc(v.telefone) : 'sem WhatsApp'}${v.criado_em ? ` · na equipe desde ${window.fmtDataHora(v.criado_em).slice(0, 8)}` : ''}${v.ultimo_acesso ? ` · último acesso ${window.fmtDataHora(v.ultimo_acesso)}` : ''}</small></div>
            ${v.ativo ? '' : '<span class="pilula canc">Desativado</span>'}</div>
        ${banner}
        <div class="cv-nums">
            <div><small>Recebeu</small><b>${r.recebeu}</b><i>peças enviadas</i></div>
            <div><small>Vendeu</small><b>${r.vendeu}</b><i>${window.fmt(r.vendido_valor)} em repasse</i></div>
            <div><small>Devolveu</small><b>${r.devolveu}</b><i>${r.perdeu ? `+ ${r.perdeu} perdida(s)` : 'recolhidas'}</i></div>
            <div class="roxo"><small>Está com ${nome}</small><b>${r.com_ele}</b><i>${window.fmt(r.valor_com_ele)} se vender tudo</i></div>
        </div>
        <div class="cv-acerto ${r.a_acertar > 0 ? 'deve' : 'ok'}">
            <div><small>Falta acertar</small><b>${window.fmt(r.a_acertar)}</b><i>${r.a_acertar > 0 ? `${r.baixas_pendentes} venda${r.baixas_pendentes > 1 ? 's' : ''}${r.mais_antiga ? ` · a mais antiga em ${window.fmtDataHora(r.mais_antiga).slice(0, 8)}` : ''} · ` : ''}já acertou ${window.fmt(r.acertado)}</i></div>
            ${r.a_acertar > 0 ? `<button class="btn-magic btn-global" onclick="cvAba('vendas', 'pendente'); document.getElementById('cv-receber').scrollIntoView({ behavior: 'smooth', block: 'center' })">${window.ic('dinheiro')} Receber</button>` : `<span class="pilula pago">${window.ic('check')}Tudo acertado</span>`}
        </div>
        <div class="sub-abas cv-abas" id="cv-abas"></div>
        <div id="cv-corpo"></div>`;
    window.renderizarCorpoVendedor();
};
window.renderizarCorpoVendedor = function() {
    const d = window.vendAberto; if (!d) return;
    const v = d.vendedor, C = window.CV, nome = window.esc(v.nome), vid = v.id;
    const pend = d.baixas.filter(b => b.status === 'Pendente'), pagas = d.baixas.filter(b => b.status === 'Pago');
    const abas = [['vendas', 'recibo', 'Vendas', d.baixas.length], ['pecas', 'pacote', `Com ${nome}`, d.estoque.reduce((s, e) => s + e.qtd, 0)], ['produtos', 'barras', 'Por produto', 0], ['acertos', 'dinheiro', 'Acertos', d.acertos.length], ['dados', 'ajustes', 'Dados', 0]];
    window.$('cv-abas').innerHTML = abas.map(([k, i, r, n]) => `<button class="${C.aba === k ? 'active' : ''}" onclick="cvAba('${k}')">${window.ic(i)}${r}${n ? `<em class="badge-num">${n}</em>` : ''}</button>`).join('');
    const foto = f => `<img src="${window.esc(f || 'logo.png')}" onerror="this.src='logo.png'" alt="" loading="lazy">`;
    let h = '';
    if (C.aba === 'vendas') {
        const lista = C.filtro === 'pendente' ? pend : C.filtro === 'pago' ? pagas : d.baixas;
        h = `<div class="chips-rolagem cv-filtros">${[['pendente', 'Falta acertar', pend.length, 'pend'], ['pago', 'Acertadas', pagas.length, 'pago'], ['todas', 'Todas', d.baixas.length, '']]
            .map(([k, r, n, c]) => `<button class="chip-op ${c} ${C.filtro === k ? 'active' : ''}" onclick="cvAba('vendas', '${k}')">${r} <em>${n || ''}</em></button>`).join('')}</div>
            <p class="texto-ajuda cv-dica">Cada linha é uma venda que ${nome} fez (baixa). ${C.filtro === 'pendente' && pend.length ? 'Marque as que você recebeu e toque em <b>Recebi o valor selecionado</b>.' : ''}</p>
            ${C.filtro === 'pendente' && pend.length > 1 ? `<label class="cv-marcar"><input type="checkbox" checked onchange="document.querySelectorAll('.chk-baixa').forEach(c => { c.checked = this.checked; }); somarSelecaoAcerto()"> Marcar todas</label>` : ''}
            <div class="cv-lista">${lista.map(b => {
                const p = b.status === 'Pendente';
                const chk = p && C.filtro === 'pendente', tag = chk ? 'label' : 'div';
                return `<${tag} class="cvb ${p ? 'pend' : 'pago'}">
                    ${chk ? `<input type="checkbox" class="chk-baixa" value="${b.id}" data-valor="${b.repasse_total}" checked onchange="somarSelecaoAcerto()">` : ''}
                    ${foto(b.foto)}
                    <span class="cvb-info"><b>${b.qtd}x ${window.esc(b.produto_nome)}</b>
                        <small>vendeu em ${window.fmtDataHora(b.data_hora).slice(0, 8)}${b.origem === 'CONFERENCIA' ? ' · achado na conferência' : b.origem === 'ADMIN' ? ` · lançada por ${window.esc(b.criado_por || 'você')}` : ''} · ${window.fmt(b.repasse_unit)}/un</small>
                        ${p ? '<span class="pilula pend">Falta acertar</span>' : `<span class="pilula pago">${window.ic('check')}Acertado em ${window.fmtDataHora(b.acerto_data || b.data_pgto).slice(0, 8)}${b.acerto_forma ? ` · ${window.esc(b.acerto_forma)}` : ''}</span>`}</span>
                    <b class="cvb-v">${window.fmt(b.repasse_total)}</b>
                    ${p ? `<button class="btn-ic perigo" title="Desfazer esta venda (a peça volta para ${nome})" aria-label="Desfazer venda" onclick="event.preventDefault(); cancelarBaixa(${b.id}, true)">${window.ic('desfazer')}</button>` : ''}
                </${tag}>`; }).join('') || `<div class="vazio-box pequeno">${window.ic('recibo')}<b>${C.filtro === 'pendente' ? 'Nada para acertar' : 'Nenhuma venda aqui'}</b><span>${C.filtro === 'pendente' ? `${nome} está em dia.` : `Quando ${nome} vender, a venda aparece aqui.`}</span></div>`}</div>
            ${C.filtro === 'pendente' && pend.length ? `<div class="cv-receber" id="cv-receber">
                <div class="mm-total" id="acerto-selecao">Selecionado: ${window.fmt(d.pendente_total)}</div>
                <div class="row"><div class="col"><div class="input-group"><label for="acerto-forma">Como pagou?</label><select id="acerto-forma"><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Outro</option></select></div></div>
                    <div class="col"><div class="input-group"><label for="acerto-obs">Observação</label><input type="text" id="acerto-obs" placeholder="Opcional"></div></div></div>
                <button class="btn-magic btn-global" id="btn-acerto" onclick="receberSelecionadas(${vid})">${window.ic('check')} Recebi o valor selecionado</button>
                <a class="btn-magic btn-zap" target="_blank" rel="noopener" href="${window.textoCobrancaVendedor(d)}">${window.ic('zap')} Mandar extrato / cobrar no WhatsApp</a>
            </div>` : ''}`;
    } else if (C.aba === 'pecas') {
        h = `<div class="cv-lista">${d.estoque.map(e => `<div class="cvp-linha">${foto(e.foto)}
                <span class="cvb-info"><b>${window.esc(e.nome)}</b><small>${e.qtd} peça${e.qtd > 1 ? 's' : ''} · repasse ${window.fmt(e.repasse)}/un${e.especial ? ' (especial)' : ''}</small></span>
                <div class="cvp-bts">
                    <button class="btn-limpar verde" onclick="baixaPeloAdmin(${vid}, ${e.produto_id}, ${e.qtd})">${window.ic('check')}Vendeu</button>
                    <button class="btn-limpar" onclick="recolherPecas(${vid}, ${e.produto_id}, ${e.qtd})">${window.ic('devolver')}Recolher</button>
                    <button class="btn-ic" title="Repasse especial para ${nome}" aria-label="Repasse especial" onclick="definirRepasseEspecial(${vid}, ${e.produto_id})">${window.ic('etiqueta')}</button>
                </div></div>`).join('') || `<div class="vazio-box pequeno">${window.ic('pacote')}<b>Nenhuma peça com ${nome}</b><span>Toque em <b>Enviar peças</b> para mandar.</span></div>`}</div>
            <div class="cv-bts-rodape">
                ${d.estoque.length ? `<button class="btn-limpar" onclick="abrirConferencia(${vid})">${window.ic('check')}Conferir (contar as peças)</button>` : ''}
                ${v.ativo ? `<button class="btn-limpar" onclick="abrirMala(${vid})">${window.ic('mala')}Enviar mais peças</button>` : ''}
                <button class="btn-limpar" onclick="abrirMovimentos({local:${vid}})">${window.ic('historico')}Entradas e saídas</button>
            </div>`;
    } else if (C.aba === 'produtos') {
        h = `<p class="texto-ajuda cv-dica">Tudo o que passou pela mão de ${nome}, produto por produto.</p>
            <div class="cv-lista">${d.produtos.map(p => `<div class="cvp">${foto(p.foto)}
                <div class="cvp-info"><b>${window.esc(p.nome)}</b>
                    <div class="cvp-nums"><span>Recebeu <b>${p.recebeu}</b></span><span>Vendeu <b>${p.vendeu}</b></span><span>Devolveu <b>${p.devolveu}</b></span>${p.perdeu ? `<span>Perdeu <b>${p.perdeu}</b></span>` : ''}<span class="roxo">Com ${nome} <b>${p.com_ele}</b></span></div>
                    ${p.vendeu ? `<small>${p.acertado > 0 ? `acertado ${window.fmt(p.acertado)}` : ''}${p.acertado > 0 && p.a_acertar > 0 ? ' · ' : ''}${p.a_acertar > 0 ? `<b class="txt-laranja">falta ${window.fmt(p.a_acertar)}</b>` : ''}</small>` : ''}
                </div></div>`).join('') || `<div class="vazio-box pequeno">${window.ic('barras')}<b>Nada ainda</b><span>Quando você enviar peças, o resumo aparece aqui.</span></div>`}</div>`;
    } else if (C.aba === 'acertos') {
        h = `<div class="cv-lista">${d.acertos.map(a => `<div class="cvp-linha">
                <span class="avatar-v verde">${window.ic('dinheiro')}</span>
                <span class="cvb-info"><b>${window.fmt(a.valor)} · ${window.esc(a.forma || 'sem forma')}</b><small>${window.fmtDataHora(a.data_hora)} · ${a.qtd_baixas} venda(s)${a.usuario ? ` · recebido por ${window.esc(a.usuario)}` : ''}${a.obs ? ` · ${window.esc(a.obs)}` : ''}</small></span>
                <button class="btn-ic perigo" title="Desfazer este acerto (as vendas voltam a 'falta acertar')" aria-label="Desfazer acerto" onclick="desfazerAcerto(${vid}, ${a.id})">${window.ic('desfazer')}</button>
            </div>`).join('') || `<div class="vazio-box pequeno">${window.ic('dinheiro')}<b>Nenhum acerto ainda</b><span>Quando ${nome} te pagar, registre na aba <b>Vendas</b>.</span></div>`}</div>`;
    } else {
        const info = (window.painelEstoque && window.painelEstoque.vendedores.find(x => x.id === vid)) || v;
        h = `<div class="card cv-dados">
            <div class="row"><div class="col"><div class="input-group"><label for="fv-usuario">Usuário (login)</label><input type="text" id="fv-usuario" value="${nome}"></div></div><div class="col"><div class="input-group"><label for="fv-telefone">WhatsApp</label><input type="tel" id="fv-telefone" value="${window.esc(v.telefone)}"></div></div></div>
            <div class="input-group"><label for="fv-ativo">Situação</label><select id="fv-ativo"><option value="true" ${info.ativo ? 'selected' : ''}>Ativo</option><option value="false" ${info.ativo ? '' : 'selected'}>Desativado (não consegue mais entrar)</option></select></div>
            <button class="btn-magic btn-global" onclick="salvarDadosVendedor(${vid})">${window.ic('check')} Salvar</button>
            <div class="cv-bts-rodape">
                <button class="btn-limpar" onclick="resetarSenhaVendedor(${vid})">${window.ic('chave')}Nova senha</button>
                ${v.codigo_vitrine ? `<button class="btn-limpar" onclick="copiarTexto('${window.linkVitrine(v.codigo_vitrine)}', 'Link da vitrine copiado!')">${window.ic('link')}Copiar link da vitrine</button>` : ''}
                <button class="btn-limpar" onclick="verComoVendedor(${vid})">${window.ic('olho')}Ver como ${nome} vê</button>
            </div></div>`;
    }
    window.$('cv-corpo').innerHTML = h;
};
window.somarSelecaoAcerto = function() { const t = [...document.querySelectorAll('.chk-baixa:checked')].reduce((s, c) => s + (parseFloat(c.dataset.valor) || 0), 0); if (window.$('acerto-selecao')) window.$('acerto-selecao').innerText = `Selecionado: ${window.fmt(t)}`; };
window.textoCobrancaVendedor = function(d) {
    const pend = d.baixas.filter(b => b.status === 'Pendente');
    const linhas = pend.map(b => `• ${window.fmtDataHora(b.data_hora).slice(0, 8)} — ${b.qtd}x ${b.produto_nome}: ${window.fmt(b.repasse_total)}`).join('\n');
    return window.linkZap(d.vendedor.telefone, `Olá, *${d.vendedor.nome}*! Aqui é do *Mini Mundo 3D* 🌍🖨️\n\nSegue o extrato das suas vendas em aberto:\n\n${linhas}\n\n💰 *Total a repassar: ${window.fmt(d.pendente_total)}*\n\nAssim que fizer o pagamento me manda o comprovante. Obrigado! 🙏`);
};
window.receberSelecionadas = async function(vid) {
    const ids = [...document.querySelectorAll('.chk-baixa:checked')].map(c => parseInt(c.value));
    if (!ids.length) return window.mostrarAlerta("Atenção", "Marque as vendas que você recebeu.", "warning");
    const total = [...document.querySelectorAll('.chk-baixa:checked')].reduce((s, c) => s + (parseFloat(c.dataset.valor) || 0), 0);
    if (!await window.confirmarMM({ icone: '💰', titulo: 'Confirmar recebimento?', html: `Você recebeu <b>${window.fmt(total)}</b> de <b>${window.esc(window.vendAberto.vendedor.nome)}</b> (${ids.length} venda${ids.length > 1 ? "s" : ""}) via <b>${window.esc(window.$('acerto-forma').value)}</b>?`, ok: '✅ Sim, recebi' })) return;
    const b = window.$('btn-acerto'); b.disabled = true;
    try {
        const r = await window.apiAcao("acertar_baixas", { vendedor_id: vid, ids, forma: window.$('acerto-forma').value, obs: window.$('acerto-obs').value });
        window.ultimoAcerto = { vid, total: r.total };
        await window.abrirVendedor(vid); window.carregarPainelEstoque();
    } catch (e) { window.mostrarAlerta("Erro", e.message, "error"); b.disabled = false; }
};
window.desfazerAcerto = async function(vid, aid) {
    if (!await window.confirmarMM({ tipo: 'perigo', icone: '↩️', titulo: 'Desfazer esse acerto?', texto: 'As baixas desse pagamento voltam a ficar pendentes (a receber).', ok: 'Desfazer' })) return;
    try { await window.apiAcao("desfazer_acerto", { acerto_id: aid }); window.ultimoAcerto = null; await window.abrirVendedor(vid); window.carregarPainelEstoque(); }
    catch (e) { window.mostrarAlerta("Erro", e.message, "error"); }
};
// Pergunta uma quantidade de 1 a max (devolve 0 se cancelar)
window.pedirQtd = async function(o, max) {
    const v = await window.pedirValorMM(Object.assign({ campo: 'number', valor: String(max), min: 1, max, ok: 'Confirmar',
        validar: x => { const n = parseInt(x); return (n > 0 && n <= max) ? null : `Digite um número de 1 a ${max}.`; } }, o));
    return v === null ? 0 : parseInt(v);
};
window.nomeProdutoAberto = pid => ((window.vendAberto.estoque.find(e => e.produto_id === pid) || {}).nome || '');
window.baixaPeloAdmin = async function(vid, pid, max) {
    const nomeV = window.esc(window.vendAberto.vendedor.nome);
    const qtd = await window.pedirQtd({ icone: '✅', titulo: 'Registrar venda', valor: '1', ok: '✅ Registrar',
        html: `${nomeV} vendeu quantas peças de <b>${window.esc(window.nomeProdutoAberto(pid))}</b>?<br><small>Com ${nomeV} agora: ${max}</small>` }, max); if (!qtd) return;
    try { await window.apiAcao("dar_baixa", { vendedor_id: vid, produto_id: pid, qtd }); await window.abrirVendedor(vid); window.carregarPainelEstoque(); }
    catch (e) { window.mostrarAlerta("Erro", e.message, "error"); }
};
window.recolherPecas = async function(vid, pid, max) {
    const nomeV = window.esc(window.vendAberto.vendedor.nome);
    const qtd = await window.pedirQtd({ icone: '↩️', titulo: 'Recolher peças', ok: '↩️ Recolher',
        html: `Quantas peças de <b>${window.esc(window.nomeProdutoAberto(pid))}</b> voltam para o Ateliê?<br><small>Com ${nomeV} agora: ${max}</small>` }, max); if (!qtd) return;
    try { await window.apiAcao("recolher", { vendedor_id: vid, itens: [{ produto_id: pid, qtd }] }); await window.abrirVendedor(vid); window.carregarPainelEstoque(); window.carregarBancoDeCustos(); }
    catch (e) { window.mostrarAlerta("Erro", e.message, "error"); }
};
window.definirRepasseEspecial = async function(vid, pid) {
    const p = window.painelEstoque.produtos.find(x => x.id === pid) || {}; const atual = window.vendAberto.estoque.find(e => e.produto_id === pid);
    const v = await window.pedirValorMM({ icone: '💲', titulo: 'Repasse especial', campo: 'dinheiro', placeholder: 'R$ 0,00', ok: '💾 Salvar',
        html: `Quanto <b>${window.esc(window.vendAberto.vendedor.nome)}</b> te paga por <b>${window.esc(p.nome)}</b>?<br><small>Padrão: ${window.fmt(p.repasse || 0)}. Deixe vazio para voltar ao padrão.</small>`,
        valor: atual && atual.especial ? window.fmt(atual.repasse) : '' });
    if (v === null) return;
    try { await window.apiAcao("salvar_repasse_especial", { vendedor_id: vid, produto_id: pid, preco: v.trim() }); await window.abrirVendedor(vid); window.carregarPainelEstoque(); }
    catch (e) { window.mostrarAlerta("Erro", e.message, "error"); }
};
window.salvarDadosVendedor = async function(vid) {
    try { await window.apiAcao("atualizar_vendedor", { id: vid, usuario: window.$('fv-usuario').value.trim(), telefone: window.$('fv-telefone').value.trim(), ativo: window.$('fv-ativo').value === "true" }); await window.carregarPainelEstoque(); await window.abrirVendedor(vid); window.mostrarAlerta("Salvo!", "Dados do vendedor atualizados.", "success"); }
    catch (e) { window.mostrarAlerta("Erro", e.message, "error"); }
};
window.resetarSenhaVendedor = async function(vid) {
    const s = await window.pedirValorMM({ icone: '🔑', titulo: 'Nova senha', texto: `Digite a nova senha de ${window.vendAberto.vendedor.nome}. Depois passe pra ele(a).`, placeholder: 'Mínimo 4 caracteres', ok: '🔑 Redefinir',
        validar: x => x.trim().length >= 4 ? null : 'A senha precisa ter pelo menos 4 caracteres.' }); if (!s) return;
    try { await window.apiAcao("resetar_senha_vendedor", { id: vid, senha: s }); window.mostrarAlerta("Pronto!", `Senha redefinida. Passe a nova senha para ${window.vendAberto.vendedor.nome}.`, "success"); }
    catch (e) { window.mostrarAlerta("Erro", e.message, "error"); }
};

// 📋 CONFERÊNCIA: você conta o que está com o vendedor; diferença pra menos vira baixa (ou perda)
window.abrirConferencia = function(vid) {
    const d = window.vendAberto, P = window.painelEstoque;
    const outros = P.produtos.filter(p => p.ativo && !d.estoque.some(e => e.produto_id === p.id));
    window.abrirModalMM(`<h3 class="modal-title">📋 Conferir estoque de ${window.esc(d.vendedor.nome)}</h3>
        <p style="font-size:0.8rem;color:var(--text-muted);font-weight:600;margin-top:-8px;">Conte as peças que estão com ele(a) e corrija os números. Só as diferenças são lançadas.</p>
        <div id="conf-lista">${d.estoque.map(e => window.linhaConferencia(e.produto_id, e.nome, e.qtd)).join('')}</div>
        ${outros.length ? `<div class="input-group" style="margin-top:10px;"><label>➕ Achou peça que não está na lista?</label><select data-fotos onchange="window.adicionarLinhaConferencia(this)"><option value="">— escolher produto —</option>${outros.map(p => `<option value="${p.id}" data-foto="${window.esc(window.fotoNaLista(p))}">${window.esc(p.nome)}</option>`).join('')}</select></div>` : ''}
        <div class="input-group"><label>Se faltar peça, ela foi...</label><select id="conf-tratamento"><option value="venda">✅ Vendida (gera baixa e cobra o repasse)</option><option value="perda">⚠️ Perdida/quebrada (não cobra)</option></select></div>
        <div class="input-group"><label>Observação</label><input type="text" id="conf-motivo" placeholder="Ex: conferência mensal"></div>
        <div class="mm-total" id="conf-resumo">Nenhuma diferença.</div>
        <div style="display:flex;gap:10px;"><button class="btn-modal-cancel" onclick="window.abrirVendedor(${vid})">⬅️ Voltar</button><button class="btn-modal-confirm" id="btn-conf" onclick="window.confirmarConferencia(${vid})">💾 Salvar</button></div>`);
};
window.linhaConferencia = (pid, nome, sistema) => `<div class="mm-linha"><span class="mm-nome">${window.esc(nome)}<span class="mm-sub">Sistema: ${sistema}</span></span><input type="number" class="conf-qtd" data-pid="${pid}" data-sistema="${sistema}" min="0" value="${sistema}" oninput="window.resumoConferencia()"></div>`;
window.adicionarLinhaConferencia = function(sel) { const pid = parseInt(sel.value); if (!pid) return; const p = window.painelEstoque.produtos.find(x => x.id === pid); window.$('conf-lista').insertAdjacentHTML('beforeend', window.linhaConferencia(pid, p.nome, 0)); sel.querySelector(`option[value="${pid}"]`).remove(); sel.value = ''; };
window.resumoConferencia = function() {
    let menos = 0, mais = 0; document.querySelectorAll('.conf-qtd').forEach(i => { const d = (parseInt(i.value) || 0) - parseInt(i.dataset.sistema); if (d < 0) menos -= d; else mais += d; });
    window.$('conf-resumo').innerHTML = (menos || mais) ? `${menos ? `Faltando: <b>${menos}</b> peça(s)` : ''}${menos && mais ? ' · ' : ''}${mais ? `Sobrando: <b>${mais}</b> peça(s)` : ''}` : 'Nenhuma diferença.';
};
window.confirmarConferencia = async function(vid) {
    const itens = [...document.querySelectorAll('.conf-qtd')].map(i => ({ produto_id: parseInt(i.dataset.pid), contado: Math.max(0, parseInt(i.value) || 0), sistema: parseInt(i.dataset.sistema) })).filter(i => i.contado !== i.sistema);
    if (!itens.length) return window.abrirVendedor(vid);
    const b = window.$('btn-conf'); b.disabled = true;
    try {
        const r = await window.apiAcao("conferir_estoque", { vendedor_id: vid, itens, tratamento: window.$('conf-tratamento').value, motivo: window.$('conf-motivo').value });
        await window.abrirVendedor(vid); window.carregarPainelEstoque();
        window.mostrarAlerta("Conferido!", `${r.ajustes.length} produto(s) ajustado(s).${r.baixas ? ` ${r.baixas} baixa(s) gerada(s): ${window.fmt(r.valor_baixas)} a receber.` : ''}`, "success");
    } catch (e) { window.mostrarAlerta("Erro", e.message, "error"); b.disabled = false; }
};

// 🎁 ENCOMENDAS (visão do Admin)
window.renderizarEncomendasAdmin = function() {
    const el = window.$('lista-encomendas-admin'); if (!el) return;
    const status = ['Pendente', 'Produzindo', 'Pronta', 'Entregue', 'Cancelada'];
    const abertas = window.painelEstoque.encomendas.filter(e => !['Entregue', 'Cancelada'].includes(e.status));
    const fechadas = window.painelEstoque.encomendas.filter(e => ['Entregue', 'Cancelada'].includes(e.status)).slice(0, 15);
    const card = e => `<div class="mm-card"><div class="mm-info"><h4>${e.qtd}x ${window.esc(e.descricao)}</h4>
        <div class="mm-chips"><span class="mm-chip azul">👤 ${window.esc(e.vendedor || '—')}</span><span class="mm-chip">📅 ${window.fmtDataHora(e.data_hora)}</span>${e.prazo ? `<span class="mm-chip amarelo">⏰ até ${window.fmtDataHora(e.prazo)}</span>` : ''}</div></div>
        <div class="mm-acoes"><select style="width:auto;padding:8px;font-size:0.8rem;" onchange="window.atualizarStatusEncomenda(${e.id}, this.value)">${status.map(s => `<option ${s === e.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div></div>`;
    el.innerHTML = (abertas.length ? abertas.map(card).join('') : '<p class="mm-vazio">Nenhuma encomenda em aberto.</p>') +
        (fechadas.length ? `<details><summary style="cursor:pointer;font-size:0.8rem;font-weight:800;color:var(--text-muted);margin:8px 0;">Finalizadas recentes</summary>${fechadas.map(card).join('')}</details>` : '');
};
window.atualizarStatusEncomenda = async function(id, status) {
    try { await window.apiAcao("atualizar_encomenda", { id, status }); window.addLog(`🎁 Encomenda #${id} → ${status}`, "success"); window.carregarPainelEstoque(); }
    catch (e) { window.mostrarAlerta("Erro", e.message, "error"); }
};

// ==========================================
// 🔒 SENHA E REGISTRO DE ATIVIDADES
// ==========================================
window.abrirTrocarSenha = function() {
    window.abrirModalMM(`<h3 class="modal-title">🔑 Trocar minha senha</h3>
        <div class="input-group"><label>Senha atual</label><input type="password" id="ts-atual"></div>
        <div class="input-group"><label>Nova senha</label><input type="password" id="ts-nova"></div>
        <div class="input-group"><label>Repita a nova senha</label><input type="password" id="ts-nova2"></div>
        <button class="btn-magic btn-global" onclick="window.confirmarTrocaSenha()">💾 Trocar</button>`);
};
window.confirmarTrocaSenha = async function() {
    const nova = window.$('ts-nova').value; if (nova !== window.$('ts-nova2').value) return window.mostrarAlerta("Atenção", "As senhas novas não são iguais.", "warning");
    try {
        const r = await window.apiAcao("alterar_senha", { senha_atual: window.$('ts-atual').value, senha_nova: nova });
        if (r.token) localStorage.setItem('mm_token', r.token); // os outros aparelhos saem; este continua conectado
        window.fecharModalMM(); window.mostrarAlerta("Pronto!", "Senha alterada. Se você estava conectado em outro aparelho, lá vai pedir a senha nova.", "success");
    }
    catch (e) { window.mostrarAlerta("Erro", e.message, "error"); }
};
window.abrirLogs = async function() {
    window.abrirModalMM('<h3 class="modal-title">📜 Registro de atividades</h3><p class="mm-vazio">⏳ Carregando...</p>');
    try {
        const r = await window.apiAcao("listar_logs", { limite: 300 });
        window.preencherModalMM(`<h3 class="modal-title">📜 Registro de atividades</h3>` + (r.logs.length ? r.logs.map(l => `<div class="mm-linha"><span class="mm-nome">${window.esc(l.detalhe || l.acao)}<span class="mm-sub">${window.fmtDataHora(l.data_hora)} · ${window.esc(l.usuario)} · ${window.esc(l.acao)}</span></span></div>`).join('') : '<p class="mm-vazio">Nada registrado ainda.</p>'));
    } catch (e) { window.preencherModalMM(`<p class="mm-vazio">❌ ${window.esc(e.message)}</p>`); }
};

// ==========================================
// 🧑‍💼 APP DO VENDEDOR
// ==========================================
window.iniciarAppVendedor = function() {
    document.body.classList.add('modo-vendedor');
    window.$('login-screen').style.display = "none"; window.$('app-core').style.display = "block";
    window.$('subtitulo-app').innerText = "Painel do Vendedor";
    window.mostrarUsuarioNoMenu("Vendedor(a)");
    window.navComecar(); window.switchTab('v_estoque', '📦 Meu Estoque', true);
    if (window.boasVindasMM) window.boasVindasMM();
};

// 👀 VER COMO O VENDEDOR: o Admin abre as mesmas telas que o vendedor vê, com os dados dele
window.vendedorVisto = null;
window.verComoVendedor = function(vid) {
    const v = window.painelEstoque && window.painelEstoque.vendedores.find(x => x.id === vid); if (!v) return;
    window.vendedorVisto = { id: v.id, nome: v.nome }; window.painelVendedor = null;
    ['v-resumo', 'v-lista-estoque', 'v-vitrine', 'v-acerto', 'v-lista-encomendas'].forEach(id => { window.$(id).innerHTML = ''; });
    window.fecharModalMM();
    document.body.classList.add('modo-vendedor', 'vendo-como');
    document.querySelectorAll('.faixa-ver-como, .btn-voltar').forEach(el => { el.hidden = false; });
    window.$('ver-como-nome').innerText = v.nome;
    window.$('subtitulo-app').innerText = `Visão de ${v.nome}`;
    window.switchTab('v_estoque', '📦 Meu Estoque');
};
window.sairVisaoVendedor = function(semHistorico) {
    const vid = window.vendedorVisto && window.vendedorVisto.id;
    window.vendedorVisto = null; window.painelVendedor = null;
    document.body.classList.remove('modo-vendedor', 'vendo-como');
    document.querySelectorAll('.faixa-ver-como, .btn-voltar').forEach(el => { el.hidden = true; });
    window.$('subtitulo-app').innerText = "Central & ERP";
    window.switchTab('vendedores', '🤝 Vendedores', semHistorico === true);
    if (vid) window.abrirVendedor(vid);
};

window.carregarPainelVendedor = async function() {
    if (window.$('loading-v')) window.$('loading-v').style.display = 'block';
    try { window.painelVendedor = await window.apiAcao("meu_painel"); window.renderizarVendedorEstoque(); window.renderizarVendedorAcerto(); window.renderizarVendedorEncomendas(); }
    catch (e) { window.mostrarAlerta("Erro", e.message, "error"); }
    finally { if (window.$('loading-v')) window.$('loading-v').style.display = 'none'; }
};
window.renderizarVendedorEstoque = function() {
    const d = window.painelVendedor; if (!d) return;
    const pecas = d.estoque.reduce((s, e) => s + e.qtd, 0), valor = d.estoque.reduce((s, e) => s + e.qtd * e.repasse, 0);
    window.$('v-resumo').innerHTML = `<div class="resumo-faixa dois">
        <div class="rf roxo"><small>Peças com você</small><b>${pecas}</b><i>${window.fmt(valor)} de repasse se vender tudo</i></div>
        <button type="button" class="rf laranja" onclick="window.switchTab('v_acerto')"><small>Você me deve</small><b>${window.fmt(d.pendente_total)}</b><i>toque para ver o acerto</i></button></div>
        <p class="texto-ajuda v-dica">Vendeu? Toque em <b>Vendi</b> na peça e diga quantas.</p>`;
    const t = window.$('v-busca-estoque').value || '';
    const lista = d.estoque.filter(e => window.buscaBate(t, e.nome));
    window.$('v-lista-estoque').innerHTML = d.estoque.length ? lista.map(e => `<div class="mm-card">${window.fotoVendedor(e)}
        <div class="mm-info"><h4>${window.esc(e.nome)}</h4><div class="mm-chips"><span class="mm-chip azul">Com você: ${e.qtd}</span><span class="mm-chip amarelo">Repasse ${window.fmt(e.repasse)}</span><span class="mm-chip verde">Sugerido ${window.fmt(e.preco_sugerido)}</span>${window.chipMedidas(e.produto_id, e.medidas)}</div></div>
        <div class="mm-acoes"><button class="btn-vendi" onclick="window.abrirBaixa(${e.produto_id})">${window.ic('check')} Vendi</button></div></div>`).join('')
        : '<p class="mm-vazio">Você ainda não tem peças. Quando a Mini Mundo te enviar uma mala, elas aparecem aqui. 🧳</p>';
    window.$('v-vitrine').innerHTML = d.vendedor.codigo_vitrine && d.estoque.length ? `<div class="filtros-box" style="margin-top:20px;text-align:center;">
        <div class="filtros-title" style="justify-content:center;">🛍️ Sua vitrine online</div>
        <p style="font-size:0.8rem;color:var(--text-muted);font-weight:600;margin-top:-8px;">Mande para os clientes: mostra só as peças que estão com você, com botão pro seu WhatsApp.</p>
        <div class="row"><div class="col"><button class="btn-limpar" style="width:100%;padding:12px;" onclick="window.copiarTexto('${window.linkVitrine(d.vendedor.codigo_vitrine)}', 'Link da sua vitrine copiado!')">🔗 Copiar link</button></div>
        <div class="col"><a class="btn-limpar" style="display:block;padding:12px;text-decoration:none;" target="_blank" href="${window.linkVitrine(d.vendedor.codigo_vitrine)}">👀 Ver vitrine</a></div></div></div>` : '';
};

window.abrirBaixa = function(pid) {
    const e = window.painelVendedor.estoque.find(x => x.produto_id === pid); if (!e) return;
    window.baixaAtual = { pid, qtd: 1, max: e.qtd, repasse: e.repasse };
    window.abrirModalMM(`<h3 class="modal-title">✅ Registrar venda</h3><div style="text-align:center;">${window.fotoVendedor(e, 'width:96px;height:96px;border-radius:16px;object-fit:cover;')}
        <h4 class="baixa-nome">${window.esc(e.nome)}</h4>
        <p style="font-size:0.8rem;color:var(--text-muted);font-weight:700;margin:0;">Quantas você vendeu? (tem ${e.qtd})</p>
        <div class="stepper"><button onclick="window.stepBaixa(-1)">−</button><span id="baixa-qtd">1</span><button onclick="window.stepBaixa(1)">+</button></div>
        <div class="mm-total">Você me repassa: <span class="mm-grande" id="baixa-total">${window.fmt(e.repasse)}</span><span style="font-size:0.75rem;color:var(--text-muted);">${window.fmt(e.repasse)} por peça · o preço de venda é com você 😉</span></div>
        <button class="btn-magic btn-global" id="btn-baixa" onclick="window.confirmarBaixa()">✅ Confirmar Venda</button></div>`);
};
window.stepBaixa = function(d) {
    const b = window.baixaAtual; b.qtd = Math.min(b.max, Math.max(1, b.qtd + d));
    window.$('baixa-qtd').innerText = b.qtd; window.$('baixa-total').innerText = window.fmt(b.qtd * b.repasse);
};
window.confirmarBaixa = async function() {
    const b = window.baixaAtual, btn = window.$('btn-baixa'); btn.disabled = true; btn.innerText = "⏳ Registrando...";
    try {
        const r = await window.apiAcao("dar_baixa", { produto_id: b.pid, qtd: b.qtd });
        window.abrirModalMM(`<div class="mm-sucesso"><span class="modal-icon-alert ok">🎉</span><h3 class="modal-title-alert">Venda registrada!</h3>
            <p class="modal-text-alert">Repasse dessa venda: <b>${window.fmt(r.repasse_total)}</b><br>Total que você me deve agora: <b>${window.fmt(r.pendente_total)}</b></p>
            <button class="btn-modal-ok ok" onclick="window.fecharModalMM()">Boa! 🚀</button></div>`);
        window.carregarPainelVendedor();
    } catch (e) { window.mostrarAlerta("Não deu", e.message, "warning"); btn.disabled = false; btn.innerText = "✅ Confirmar Venda"; }
};
window.cancelarBaixa = async function(id, peloAdmin) {
    if (!await window.confirmarMM({ tipo: 'perigo', icone: '✖️', titulo: 'Cancelar essa baixa?', texto: 'A venda é desfeita e a peça volta para o estoque do vendedor.', ok: 'Cancelar baixa', cancelar: 'Voltar' })) return;
    try {
        await window.apiAcao("cancelar_baixa", { id });
        if (peloAdmin) { await window.abrirVendedor(window.vendAberto.vendedor.id); window.carregarPainelEstoque(); } else window.carregarPainelVendedor();
    } catch (e) { window.mostrarAlerta("Não deu", e.message, "warning"); }
};

window.renderizarVendedorAcerto = function() {
    const d = window.painelVendedor; if (!d) return;
    const pend = d.baixas.filter(b => b.status === 'Pendente'), pagas = d.baixas.filter(b => b.status === 'Pago').slice(0, 30);
    const agora = Date.now(), podeCancelar = b => b.origem === 'VENDEDOR' && (agora - new Date(String(b.data_hora).replace(' ', 'T') + '-03:00').getTime()) < 48 * 3600 * 1000;
    const msgPago = `Olá! Aqui é ${d.vendedor.nome} 👋\n\nFiz o pagamento do repasse das minhas vendas:\n\n${pend.map(b => `• ${b.qtd}x ${b.produto_nome}: ${window.fmt(b.repasse_total)}`).join('\n')}\n\n💰 *Total: ${window.fmt(d.pendente_total)}*\n\n(segue o comprovante)`;
    window.$('v-acerto').innerHTML = `
        <div class="kpis"><div class="kpi destaque" style="text-align:center;"><span class="kpi-rotulo">Você me deve</span>
            <span class="kpi-valor" style="color:${d.pendente_total > 0 ? '#fbbf24' : '#6ee7b7'};">${window.fmt(d.pendente_total)}</span>
            <span class="kpi-sub">${d.pendente_qtd} venda(s) aguardando acerto</span></div></div>
        ${d.pendente_total > 0 && d.telefone_admin ? `<a class="btn-magic btn-global" style="margin:0 0 16px;" target="_blank" href="${window.linkZap(d.telefone_admin, msgPago)}">📲 Avisar que paguei (WhatsApp)</a>` : ''}
        <div class="secao-tit">${window.ic('relogio')}Aguardando acerto</div>
        ${pend.length ? pend.map(b => `<div class="mm-linha"><span class="mm-nome">${b.qtd}x ${window.esc(b.produto_nome)} · <b style="color:#b45309;">${window.fmt(b.repasse_total)}</b><span class="mm-sub">${window.fmtDataHora(b.data_hora)}${b.origem === 'CONFERENCIA' ? ' · 📋 diferença encontrada na conferência' : ''}</span></span>
            ${podeCancelar(b) ? `<button class="btn-novera btn-n-apagar" title="Errei, cancelar" onclick="window.cancelarBaixa(${b.id}, false)">✖</button>` : ''}</div>`).join('') : '<p class="mm-vazio">Tudo em dia! ✅</p>'}
        <div class="secao-tit">${window.ic('check')}Acertos feitos</div>
        ${d.acertos.length ? d.acertos.map(a => `<div class="mm-linha"><span class="mm-nome">${window.fmt(a.valor)} · ${window.esc(a.forma || '')}<span class="mm-sub">${window.fmtDataHora(a.data_hora)} · ${a.qtd_baixas} venda(s)</span></span></div>`).join('') : '<p class="mm-vazio">Nenhum acerto ainda.</p>'}
        ${pagas.length ? `<details style="margin-top:10px;"><summary style="cursor:pointer;font-size:0.8rem;font-weight:800;color:var(--text-muted);">Últimas vendas já acertadas</summary>${pagas.map(b => `<div class="mm-linha"><span class="mm-nome">${b.qtd}x ${window.esc(b.produto_nome)} · ${window.fmt(b.repasse_total)}<span class="mm-sub">${window.fmtDataHora(b.data_hora)}</span></span></div>`).join('')}</details>` : ''}`;
};

window.renderizarVendedorEncomendas = function() {
    const d = window.painelVendedor; if (!d) return;
    const sel = window.$('ve-produto'), atual = sel.value;
    sel.innerHTML = '<option value="">✏️ Peça personalizada / outra</option>' + d.produtos.map(p => `<option value="${p.id}" data-foto="${window.esc(p.foto || '')}">${window.esc(p.nome)}</option>`).join(''); sel.value = atual;
    window.filtrarSelect('ve-produto', window.$('ve-busca') ? window.$('ve-busca').value : '', true);
    const cor = { Pendente: 'amarelo', Produzindo: 'azul', Pronta: 'verde', Entregue: 'verde', Cancelada: 'vermelho' };
    window.$('v-lista-encomendas').innerHTML = d.encomendas.length ? d.encomendas.map(e => `<div class="mm-card"><div class="mm-info"><h4>${e.qtd}x ${window.esc(e.descricao)}</h4>
        <div class="mm-chips"><span class="mm-chip ${cor[e.status] || ''}">${window.esc(e.status)}</span><span class="mm-chip">📅 ${window.fmtDataHora(e.data_hora)}</span>${e.prazo ? `<span class="mm-chip">⏰ até ${window.fmtDataHora(e.prazo)}</span>` : ''}</div>
        ${e.obs_admin ? `<span class="mm-sub">💬 ${window.esc(e.obs_admin)}</span>` : ''}</div>
        ${e.status === 'Pendente' ? `<div class="mm-acoes"><button class="btn-novera btn-n-apagar" title="Cancelar pedido" onclick="window.cancelarEncomendaVendedor(${e.id})">✖</button></div>` : ''}</div>`).join('') : '<p class="mm-vazio">Nenhum pedido ainda.</p>';
};
window.salvarEncomendaVendedor = async function() {
    const produto_id = parseInt(window.$('ve-produto').value) || null, descricao = window.$('ve-descricao').value.trim();
    if (!produto_id && !descricao) return window.mostrarAlerta("Atenção", "Escolha um produto ou descreva a peça.", "warning");
    const b = window.$('btn-ve-salvar'); b.disabled = true;
    try {
        await window.apiAcao("salvar_encomenda", { produto_id, descricao, qtd: parseInt(window.$('ve-qtd').value) || 1, prazo: window.$('ve-prazo').value });
        window.$('ve-descricao').value = ''; window.$('ve-qtd').value = '1'; window.$('ve-prazo').value = ''; window.$('ve-produto').value = '';
        window.mostrarAlerta("Pedido enviado!", "A Mini Mundo já recebeu seu pedido.", "success"); window.carregarPainelVendedor();
    } catch (e) { window.mostrarAlerta("Erro", e.message, "error"); } finally { b.disabled = false; }
};
window.cancelarEncomendaVendedor = async function(id) {
    if (!await window.confirmarMM({ tipo: 'perigo', icone: '🎁', titulo: 'Cancelar esse pedido?', texto: 'A Mini Mundo deixa de produzir essa encomenda.', ok: 'Cancelar pedido', cancelar: 'Voltar' })) return;
    try { await window.apiAcao("cancelar_encomenda", { id }); window.carregarPainelVendedor(); }
    catch (e) { window.mostrarAlerta("Erro", e.message, "error"); }
};
