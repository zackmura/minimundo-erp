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
window.imgProduto = (foto, estilo = '') => `<img src="${window.esc(foto || 'logo.png')}" class="mm-foto" style="${estilo}" onerror="this.src='logo.png'">`;

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
    const optsCat = '<option value="0">— nenhum —</option>' + (window.catalogoAdminArray || []).map(k => `<option value="${k.linha}" ${p.catalogo_id === k.linha ? 'selected' : ''}>${window.esc(k.nome)}</option>`).join('');
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
        <div class="row"><div class="col"><div class="input-group"><label>Item da vitrine (Catálogo)</label><select id="em-catalogo">${optsCat}</select></div></div>
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

window.renderizarEstoque = function() {
    const P = window.painelEstoque; if (!P || !window.$('lista-estoque')) return;
    const minimo = parseInt(P.config.estoque_minimo) || 0;
    let noAtelie = 0, comVend = 0, valorComVend = 0;
    P.estoque.forEach(e => { const p = P.produtos.find(x => x.id === e.produto_id); if (e.vendedor_id === 0) noAtelie += e.qtd; else { comVend += e.qtd; if (p) valorComVend += e.qtd * window.repasseParaVendedor(e.vendedor_id, p); } });
    const aReceber = P.pendentes.reduce((s, x) => s + x.total, 0);
    const semRepasse = P.produtos.filter(p => p.ativo && !p.repasse).length;
    const baixos = P.produtos.filter(p => p.ativo && minimo > 0 && window.qtdEm(p.id, 0) > 0 && window.qtdEm(p.id, 0) <= minimo).length;
    window.$('estoque-resumo').innerHTML = `
        <div class="mm-resumo">
            <div class="mm-kpi"><h3>🏠 Peças no Ateliê</h3><span>${noAtelie}</span></div>
            <div class="mm-kpi"><h3>👥 Com vendedores</h3><span>${comVend}</span></div>
            <div class="mm-kpi"><h3>💼 Em repasse na rua</h3><span class="v-roxo">${window.fmt(valorComVend)}</span></div>
            <div class="mm-kpi"><h3>⏳ A receber</h3><span class="v-laranja">${window.fmt(aReceber)}</span></div>
        </div>
        ${semRepasse ? `<div class="mm-alerta">⚠️ ${semRepasse} modelo(s) ativo(s) sem preço de repasse — não dá pra enviar pra vendedor. Defina em <b>Modelos</b> (✏️).</div>` : ''}
        ${baixos ? `<div class="mm-alerta">🔔 ${baixos} produto(s) com estoque baixo no Ateliê (≤ ${minimo}).</div>` : ''}`;
    // Por padrão só aparece o que tem peça (no Ateliê ou com vendedor); a chave mostra o resto
    const t = (window.$('busca-estoque').value || '').toLowerCase(), mostrarSem = window.$('estoque-mostrar-sem').checked;
    const totalDe = pid => P.estoque.filter(e => e.produto_id === pid).reduce((s, e) => s + e.qtd, 0);
    const visiveis = P.produtos.filter(p => p.ativo || totalDe(p.id) > 0), comPecas = visiveis.filter(p => totalDe(p.id) > 0);
    const lista = (mostrarSem ? visiveis : comPecas).filter(p => !t || p.nome.toLowerCase().includes(t));
    window.$('estoque-info-lista').innerText = mostrarSem ? `${visiveis.length} produtos` : `${comPecas.length} de ${visiveis.length} com peças`;
    if (!lista.length) {
        window.$('lista-estoque').innerHTML = !visiveis.length ? `<p class="mm-vazio">Nenhum produto. Cadastre modelos em <b>Precificar</b>.</p>`
            : t ? `<p class="mm-vazio">Nada encontrado para "${window.esc(t)}".${mostrarSem ? '' : ' Ligue <b>Mostrar também produtos sem estoque</b> para procurar em todos.'}</p>`
            : `<p class="mm-vazio">Nenhuma peça em estoque agora. Use <b>🖨️ Registrar produção</b> ou ligue <b>Mostrar também produtos sem estoque</b>.</p>`;
        return;
    }
    window.$('lista-estoque').innerHTML = lista.map(p => {
        const at = window.qtdEm(p.id, 0);
        const comEles = P.estoque.filter(e => e.produto_id === p.id && e.vendedor_id > 0 && e.qtd > 0);
        const totalVend = comEles.reduce((s, e) => s + e.qtd, 0);
        const corAt = at <= 0 ? '' : (minimo > 0 && at <= minimo ? 'amarelo' : 'verde');
        const detalhe = comEles.map(e => `${window.nomeDoLocal(e.vendedor_id)}: ${e.qtd}`).join(' · ');
        return `<div class="mm-card" style="${p.ativo ? '' : 'opacity:0.6;'}">${window.imgProduto(p.foto)}
            <div class="mm-info"><h4>${window.esc(p.nome)} ${p.ativo ? '' : '<span class="tag-inativo">Inativo</span>'}</h4>
                <div class="mm-chips"><span class="mm-chip ${corAt}">🏠 Ateliê: ${at}</span><span class="mm-chip azul">👥 Vendedores: ${totalVend}</span>
                ${p.repasse ? `<span class="mm-chip">🤝 ${window.fmt(p.repasse)}</span>` : '<span class="mm-chip vermelho">⚠️ sem repasse</span>'}<span class="mm-chip">💲 custo ${window.fmt(p.custo)}</span></div>
                ${detalhe ? `<span class="mm-sub">${detalhe}</span>` : ''}</div>
            <div class="mm-acoes"><button class="btn-novera btn-n-baixa" title="Registrar produção" onclick="window.abrirProducao(${p.id})">➕</button><button class="btn-novera btn-n-editar" title="Ajustar quantidade do Ateliê" onclick="window.abrirAjusteAtelie(${p.id})">✏️</button><button class="btn-novera" title="Histórico" onclick="window.abrirMovimentos({produto_id:${p.id}})">📜</button></div></div>`;
    }).join('');
};

window.abrirProducao = function(pid) {
    const P = window.painelEstoque; if (!P) return;
    const opts = P.produtos.filter(p => p.ativo).map(p => `<option value="${p.id}" ${p.id === pid ? 'selected' : ''}>${window.esc(p.nome)} (Ateliê: ${window.qtdEm(p.id, 0)})</option>`).join('');
    if (!opts) return window.mostrarAlerta("Atenção", "Cadastre um modelo em Precificar primeiro.", "warning");
    window.abrirModalMM(`<h3 class="modal-title">🖨️ Registrar Produção</h3>
        <p style="font-size:0.8rem;color:var(--text-muted);font-weight:600;margin-top:-8px;">Peças prontas que saíram da impressora entram no estoque do Ateliê.</p>
        <div class="input-group"><label>Produto</label><select id="pr-produto">${opts}</select></div>
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
            <div class="mm-linha${at > 0 ? '' : ' sem-estoque'}" data-nome="${window.esc(p.nome.toLowerCase())}" data-atelie="${at}">${window.imgProduto(p.foto)}<span class="mm-nome">${window.esc(p.nome)}<span class="mm-sub">${at > 0 ? `🏠 Ateliê: ${at}` : '🏠 Sem peças no Ateliê'} · <span id="mala-rep-${p.id}"></span></span></span>
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
    const t = window.$('mala-busca').value.toLowerCase(), todos = window.$('mala-mostrar-sem').checked; let n = 0;
    document.querySelectorAll('#mala-lista .mm-linha').forEach(l => {
        const temQtd = (parseInt(l.querySelector('.mala-qtd').value) || 0) > 0; // o que já foi marcado nunca some
        const ver = temQtd || (l.dataset.nome.includes(t) && (todos || parseInt(l.dataset.atelie) > 0));
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
    const ativos = P.vendedores.filter(v => v.ativo);
    window.$('vendedores-resumo').innerHTML = `<div class="mm-resumo">
        <div class="mm-kpi"><h3>🤝 Vendedores ativos</h3><span>${ativos.length}</span></div>
        <div class="mm-kpi"><h3>⏳ A receber</h3><span class="v-laranja">${window.fmt(P.pendentes.reduce((s, x) => s + x.total, 0))}</span></div></div>`;
    window.$('lista-vendedores').innerHTML = P.vendedores.length ? P.vendedores.map(v => {
        const pd = pend(v.id), pc = pecasDe(v.id);
        return `<div class="mm-card" style="${v.ativo ? '' : 'opacity:0.6;'}"><div class="mm-info"><h4>👤 ${window.esc(v.nome)} ${v.ativo ? '' : '<span class="tag-inativo">Desativado</span>'}</h4>
            <div class="mm-chips"><span class="mm-chip azul">📦 ${pc} peça(s) · ${window.fmt(valorDe(v.id))}</span>
            <span class="mm-chip ${pd.total > 0 ? 'amarelo' : 'verde'}">💰 ${pd.total > 0 ? `deve ${window.fmt(pd.total)} (${pd.n} baixa${pd.n > 1 ? 's' : ''})` : 'em dia'}</span>
            ${pd.mais_antiga ? `<span class="mm-chip">⏳ desde ${window.fmtDataHora(pd.mais_antiga).slice(0, 8)}</span>` : ''}</div>
            ${v.telefone ? `<span class="mm-sub">📱 ${window.esc(v.telefone)}</span>` : ''}</div>
            <div class="mm-acoes"><button class="btn-novera btn-n-editar" style="width:auto;padding:0 12px;font-weight:800;font-size:0.8rem;" onclick="window.abrirVendedor(${v.id})">📋 Abrir</button>
            <button class="btn-novera" title="Ver o sistema como ele(a) vê" onclick="window.verComoVendedor(${v.id})">👀</button>
            ${v.ativo ? `<button class="btn-novera" title="Enviar mala" onclick="window.abrirMala(${v.id})">🧳</button>` : ''}
            ${v.telefone ? `<a class="btn-novera" style="text-decoration:none;" title="WhatsApp" href="${window.linkZap(v.telefone, `Olá, ${v.nome}!`)}" target="_blank">💬</a>` : ''}</div></div>`;
    }).join('') : '<p class="mm-vazio">Nenhum vendedor ainda. Cadastre no botão acima ☝️</p>';
    window.renderizarEncomendasAdmin();
};

window.salvarNovoVendedor = async function() {
    const usuario = window.$('nv-usuario').value.trim(), senha = window.$('nv-senha').value, telefone = window.$('nv-telefone').value.trim();
    try {
        await window.apiAcao("salvar_vendedor", { usuario, senha, telefone });
        window.$('nv-usuario').value = ''; window.$('nv-senha').value = ''; window.$('nv-telefone').value = '';
        const txt = `Olá, *${usuario}*! Bem-vindo(a) à equipe *Mini Mundo 3D* 🌍🖨️\n\nSeu acesso ao sistema:\n🔗 ${window.linkSistema()}\n👤 Usuário: ${usuario}\n🔑 Senha: ${senha}\n\nLá você vê as peças que estão com você, dá baixa quando vender e acompanha seu acerto. Troque a senha no primeiro acesso!`;
        window.abrirModalMM(`<div class="mm-sucesso"><span class="modal-icon-alert ok">🤝</span><h3 class="modal-title-alert">Vendedor cadastrado!</h3>
            <p class="modal-text-alert"><b>${window.esc(usuario)}</b> já pode entrar no sistema.</p>
            <a class="btn-magic btn-global" style="text-decoration:none;" href="${window.linkZap(telefone, txt)}" target="_blank">📲 Enviar acesso pelo WhatsApp</a>
            <button class="btn-modal-cancel" style="width:100%;margin-top:10px;" onclick="window.fecharModalMM()">Fechar</button></div>`);
        window.carregarPainelEstoque();
    } catch (e) { window.mostrarAlerta("Atenção", e.message, "warning"); }
};

// Ficha completa de um vendedor: o que ele deve, o que está com ele, acertos e dados
window.abrirVendedor = async function(vid) {
    window.abrirModalMM('<p class="mm-vazio">⏳ Carregando vendedor...</p>');
    try { window.vendAberto = await window.apiAcao("meu_painel", { vendedor_id: vid }); window.renderizarFichaVendedor(); }
    catch (e) { window.preencherModalMM(`<p class="mm-vazio">❌ ${window.esc(e.message)}</p>`); }
};
window.renderizarFichaVendedor = function() {
    const d = window.vendAberto, v = d.vendedor, info = window.painelEstoque.vendedores.find(x => x.id === v.id) || { ativo: true };
    const pend = d.baixas.filter(b => b.status === 'Pendente'), pagas = d.baixas.filter(b => b.status === 'Pago').slice(0, 15);
    const banner = window.ultimoAcerto && window.ultimoAcerto.vid === v.id ? `<div class="mm-alerta ok">✅ Acerto de ${window.fmt(window.ultimoAcerto.total)} registrado. <a href="${window.linkZap(v.telefone, `Olá, *${v.nome}*! Recebi ${window.fmt(window.ultimoAcerto.total)} referente às suas vendas. Obrigado! 🙏 — Mini Mundo 3D`)}" target="_blank">📲 Mandar recibo</a></div>` : '';
    window.preencherModalMM(`
        <h3 class="modal-title">👤 ${window.esc(v.nome)}</h3>${banner}
        <button class="btn-ver-como" onclick="window.verComoVendedor(${v.id})"><span>👀</span><span><b>Ver o sistema como ${window.esc(v.nome)} vê</b><small>Abre o painel dele(a): peças, acerto e pedidos</small></span></button>
        <div class="mm-secao">💰 A receber — ${window.fmt(d.pendente_total)}</div>
        ${pend.length ? pend.map(b => `<label class="mm-linha"><input type="checkbox" class="chk-baixa" value="${b.id}" data-valor="${b.repasse_total}" checked onchange="window.somarSelecaoAcerto()">
            <span class="mm-nome">${b.qtd}x ${window.esc(b.produto_nome)} <b style="color:#b45309;">${window.fmt(b.repasse_total)}</b><span class="mm-sub">${window.fmtDataHora(b.data_hora)}${b.origem === 'CONFERENCIA' ? ' · 📋 diferença da conferência' : b.origem === 'ADMIN' ? ' · lançada por você' : ''}</span></span>
            <button class="btn-novera btn-n-apagar" title="Cancelar baixa (volta a peça pro estoque dele)" onclick="event.preventDefault(); window.cancelarBaixa(${b.id}, true)">✖</button></label>`).join('') + `
            <div class="mm-total" id="acerto-selecao">Selecionado: ${window.fmt(d.pendente_total)}</div>
            <div class="row"><div class="col"><div class="input-group"><label>Forma</label><select id="acerto-forma"><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Outro</option></select></div></div><div class="col"><div class="input-group"><label>Obs.</label><input type="text" id="acerto-obs"></div></div></div>
            <button class="btn-magic btn-global" style="margin-top:0;" id="btn-acerto" onclick="window.receberSelecionadas(${v.id})">✅ Recebi o valor selecionado</button>
            <a class="btn-limpar" style="display:block;text-align:center;margin-top:8px;padding:10px;text-decoration:none;" target="_blank" href="${window.textoCobrancaVendedor(d)}">📲 Mandar extrato / cobrar no WhatsApp</a>`
        : '<p class="mm-vazio">Nada pendente. ✅</p>'}

        <div class="mm-secao">📦 Peças com ${window.esc(v.nome)}</div>
        ${d.estoque.length ? d.estoque.map(e => `<div class="mm-linha"><span class="mm-nome">${e.qtd}x ${window.esc(e.nome)}<span class="mm-sub">🤝 ${window.fmt(e.repasse)}/un${e.especial ? ' (especial)' : ''}</span></span>
            <button class="btn-novera btn-n-baixa" title="Registrar venda por ele(a)" onclick="window.baixaPeloAdmin(${v.id}, ${e.produto_id}, ${e.qtd})">✅</button>
            <button class="btn-novera" title="Recolher peças (voltam pro Ateliê)" onclick="window.recolherPecas(${v.id}, ${e.produto_id}, ${e.qtd})">↩️</button>
            <button class="btn-novera" title="Repasse especial pra esse vendedor" onclick="window.definirRepasseEspecial(${v.id}, ${e.produto_id})">💲</button></div>`).join('') : '<p class="mm-vazio">Nenhuma peça com ele(a).</p>'}
        <div class="row" style="margin-top:8px;"><div class="col"><button class="btn-limpar" style="width:100%;padding:10px;" onclick="window.abrirConferencia(${v.id})">📋 Conferir estoque</button></div>
            <div class="col"><button class="btn-limpar" style="width:100%;padding:10px;" onclick="window.abrirMala(${v.id})">🧳 Enviar mais</button></div></div>
        <button class="btn-limpar" style="width:100%;padding:10px;margin-top:8px;" onclick="window.abrirMovimentos({local:${v.id}})">📜 Movimentações dele(a)</button>

        <div class="mm-secao">🧾 Acertos</div>
        ${d.acertos.length ? d.acertos.map(a => `<div class="mm-linha"><span class="mm-nome">${window.fmt(a.valor)} · ${window.esc(a.forma || '—')}<span class="mm-sub">${window.fmtDataHora(a.data_hora)} · ${a.qtd_baixas} baixa(s)${a.obs ? ' · ' + window.esc(a.obs) : ''}</span></span>
            <button class="btn-novera btn-n-apagar" title="Desfazer acerto (as baixas voltam a pendentes)" onclick="window.desfazerAcerto(${v.id}, ${a.id})">↩️</button></div>`).join('') : '<p class="mm-vazio">Nenhum acerto ainda.</p>'}
        ${pagas.length ? `<details style="margin-top:6px;"><summary style="cursor:pointer;font-size:0.8rem;font-weight:800;color:var(--text-muted);">Últimas baixas pagas</summary>${pagas.map(b => `<div class="mm-linha"><span class="mm-nome">${b.qtd}x ${window.esc(b.produto_nome)} · ${window.fmt(b.repasse_total)}<span class="mm-sub">vendido ${window.fmtDataHora(b.data_hora)} · pago ${window.fmtDataHora(b.data_pgto)}</span></span></div>`).join('')}</details>` : ''}

        <div class="mm-secao">⚙️ Dados e acesso</div>
        <div class="row"><div class="col"><div class="input-group"><label>Usuário</label><input type="text" id="fv-usuario" value="${window.esc(v.nome)}"></div></div><div class="col"><div class="input-group"><label>WhatsApp</label><input type="text" id="fv-telefone" value="${window.esc(v.telefone)}"></div></div></div>
        <div class="input-group"><label>Situação</label><select id="fv-ativo"><option value="true" ${info.ativo ? 'selected' : ''}>🟢 Ativo</option><option value="false" ${info.ativo ? '' : 'selected'}>🔴 Desativado (não consegue mais entrar)</option></select></div>
        <div class="row"><div class="col"><button class="btn-magic btn-global" style="margin-top:0;padding:10px;" onclick="window.salvarDadosVendedor(${v.id})">💾 Salvar</button></div><div class="col"><button class="btn-limpar" style="width:100%;padding:12px;" onclick="window.resetarSenhaVendedor(${v.id})">🔑 Nova senha</button></div></div>
        ${v.codigo_vitrine ? `<button class="btn-limpar" style="width:100%;padding:10px;margin-top:8px;" onclick="window.copiarTexto('${window.linkVitrine(v.codigo_vitrine)}', 'Link da vitrine copiado!')">🔗 Copiar link da vitrine dele(a)</button>` : ''}`);
};
window.somarSelecaoAcerto = function() { const t = [...document.querySelectorAll('.chk-baixa:checked')].reduce((s, c) => s + (parseFloat(c.dataset.valor) || 0), 0); window.$('acerto-selecao').innerText = `Selecionado: ${window.fmt(t)}`; };
window.textoCobrancaVendedor = function(d) {
    const pend = d.baixas.filter(b => b.status === 'Pendente');
    const linhas = pend.map(b => `• ${window.fmtDataHora(b.data_hora).slice(0, 8)} — ${b.qtd}x ${b.produto_nome}: ${window.fmt(b.repasse_total)}`).join('\n');
    return window.linkZap(d.vendedor.telefone, `Olá, *${d.vendedor.nome}*! Aqui é do *Mini Mundo 3D* 🌍🖨️\n\nSegue o extrato das suas vendas em aberto:\n\n${linhas}\n\n💰 *Total a repassar: ${window.fmt(d.pendente_total)}*\n\nAssim que fizer o pagamento me manda o comprovante. Obrigado! 🙏`);
};
window.receberSelecionadas = async function(vid) {
    const ids = [...document.querySelectorAll('.chk-baixa:checked')].map(c => parseInt(c.value));
    if (!ids.length) return window.mostrarAlerta("Atenção", "Marque as baixas que você recebeu.", "warning");
    const total = [...document.querySelectorAll('.chk-baixa:checked')].reduce((s, c) => s + (parseFloat(c.dataset.valor) || 0), 0);
    if (!await window.confirmarMM({ icone: '💰', titulo: 'Confirmar recebimento?', html: `Você recebeu <b>${window.fmt(total)}</b> de <b>${window.esc(window.vendAberto.vendedor.nome)}</b> (${ids.length} baixa${ids.length > 1 ? 's' : ''}) via <b>${window.esc(window.$('acerto-forma').value)}</b>?`, ok: '✅ Sim, recebi' })) return;
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
        ${outros.length ? `<div class="input-group" style="margin-top:10px;"><label>➕ Achou peça que não está na lista?</label><select onchange="window.adicionarLinhaConferencia(this)"><option value="">— escolher produto —</option>${outros.map(p => `<option value="${p.id}">${window.esc(p.nome)}</option>`).join('')}</select></div>` : ''}
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
    try { await window.apiAcao("alterar_senha", { senha_atual: window.$('ts-atual').value, senha_nova: nova }); window.fecharModalMM(); window.mostrarAlerta("Pronto!", "Senha alterada.", "success"); }
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
    window.switchTab('v_estoque', '📦 Meu Estoque');
};

// 👀 VER COMO O VENDEDOR: o Admin abre as mesmas telas que o vendedor vê, com os dados dele
window.vendedorVisto = null;
window.verComoVendedor = function(vid) {
    const v = window.painelEstoque && window.painelEstoque.vendedores.find(x => x.id === vid); if (!v) return;
    window.vendedorVisto = { id: v.id, nome: v.nome }; window.painelVendedor = null;
    ['v-resumo', 'v-lista-estoque', 'v-vitrine', 'v-acerto', 'v-lista-encomendas'].forEach(id => { window.$(id).innerHTML = ''; });
    window.fecharModalMM();
    document.body.classList.add('modo-vendedor', 'vendo-como');
    window.$('ver-como-nome').innerText = v.nome;
    window.$('subtitulo-app').innerText = `Visão de ${v.nome}`;
    window.switchTab('v_estoque', '📦 Meu Estoque');
};
window.sairVisaoVendedor = function() {
    const vid = window.vendedorVisto && window.vendedorVisto.id;
    window.vendedorVisto = null; window.painelVendedor = null;
    document.body.classList.remove('modo-vendedor', 'vendo-como');
    window.$('subtitulo-app').innerText = "Central & ERP";
    window.switchTab('vendedores', '🤝 Vendedores');
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
    window.$('v-resumo').innerHTML = `<div class="mm-resumo">
        <div class="mm-kpi"><h3>📦 Peças com você</h3><span>${pecas}</span></div>
        <div class="mm-kpi" style="cursor:pointer;" onclick="window.switchTab('v_acerto','💸 Meu Acerto')"><h3>💰 Você me deve</h3><span class="v-laranja">${window.fmt(d.pendente_total)}</span></div></div>
        <p style="font-size:0.8rem;color:var(--text-muted);font-weight:600;text-align:center;margin:-5px 0 15px;">Vendeu? Toque em <b>✅ Vendi</b> na peça. Repasse total se vender tudo: <b>${window.fmt(valor)}</b></p>`;
    const t = (window.$('v-busca-estoque').value || '').toLowerCase();
    const lista = d.estoque.filter(e => !t || e.nome.toLowerCase().includes(t));
    window.$('v-lista-estoque').innerHTML = d.estoque.length ? lista.map(e => `<div class="mm-card">${window.imgProduto(e.foto)}
        <div class="mm-info"><h4>${window.esc(e.nome)}</h4><div class="mm-chips"><span class="mm-chip azul">📦 Com você: ${e.qtd}</span><span class="mm-chip amarelo">🤝 Repasse ${window.fmt(e.repasse)}</span><span class="mm-chip verde">💡 Sugerido ${window.fmt(e.preco_sugerido)}</span></div></div>
        <div class="mm-acoes"><button class="btn-vendi" onclick="window.abrirBaixa(${e.produto_id})">✅ Vendi</button></div></div>`).join('')
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
    window.abrirModalMM(`<h3 class="modal-title">✅ Registrar venda</h3><div style="text-align:center;">${window.imgProduto(e.foto, 'width:96px;height:96px;border-radius:16px;object-fit:cover;')}
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
        <div class="section-title">⏳ Aguardando acerto</div>
        ${pend.length ? pend.map(b => `<div class="mm-linha"><span class="mm-nome">${b.qtd}x ${window.esc(b.produto_nome)} · <b style="color:#b45309;">${window.fmt(b.repasse_total)}</b><span class="mm-sub">${window.fmtDataHora(b.data_hora)}${b.origem === 'CONFERENCIA' ? ' · 📋 diferença encontrada na conferência' : ''}</span></span>
            ${podeCancelar(b) ? `<button class="btn-novera btn-n-apagar" title="Errei, cancelar" onclick="window.cancelarBaixa(${b.id}, false)">✖</button>` : ''}</div>`).join('') : '<p class="mm-vazio">Tudo em dia! ✅</p>'}
        <div class="section-title">🧾 Acertos feitos</div>
        ${d.acertos.length ? d.acertos.map(a => `<div class="mm-linha"><span class="mm-nome">${window.fmt(a.valor)} · ${window.esc(a.forma || '')}<span class="mm-sub">${window.fmtDataHora(a.data_hora)} · ${a.qtd_baixas} venda(s)</span></span></div>`).join('') : '<p class="mm-vazio">Nenhum acerto ainda.</p>'}
        ${pagas.length ? `<details style="margin-top:10px;"><summary style="cursor:pointer;font-size:0.8rem;font-weight:800;color:var(--text-muted);">Últimas vendas já acertadas</summary>${pagas.map(b => `<div class="mm-linha"><span class="mm-nome">${b.qtd}x ${window.esc(b.produto_nome)} · ${window.fmt(b.repasse_total)}<span class="mm-sub">${window.fmtDataHora(b.data_hora)}</span></span></div>`).join('')}</details>` : ''}`;
};

window.renderizarVendedorEncomendas = function() {
    const d = window.painelVendedor; if (!d) return;
    const sel = window.$('ve-produto'), atual = sel.value;
    sel.innerHTML = '<option value="">✏️ Peça personalizada / outra</option>' + d.produtos.map(p => `<option value="${p.id}">${window.esc(p.nome)}</option>`).join(''); sel.value = atual;
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
