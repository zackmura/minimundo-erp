// ==========================================
// 🖨️ PRODUZIR: FILA DE IMPRESSÃO E FILAMENTO
// ==========================================
// Fila: a venda "fazer depois", o pedido do site confirmado e a encomenda do vendedor chegam sozinhos.
// Para imprimir → Imprimindo → Pronto. "Imprimi" marca pronto e desconta o filamento do carretel escolhido.
// "Já tinha pronta" fecha sem gastar filamento. "Imprimir para o estoque" põe as peças no Ateliê quando ficam prontas.
// Previsão: soma as horas de impressão na ordem da fila, dividida pelo número de impressoras (Ajustes).
// Filamento: os carretéis por cor, quanto sobra e o gasto dos últimos 30 dias.
(() => {
const $ = window.$, esc = s => window.esc(s), ic = n => window.ic(n), fmt = v => window.fmt(v);
window.FL = { aba: 'fila', dados: null, filamentos: null, ultimoFilamento: {} };
try { FL.ultimoFilamento = JSON.parse(localStorage.getItem('mm_fila_filamento') || '{}') || {}; } catch (e) { /* sem armazenamento */ }
const erroAmigavel = e => e.message === 'Ação não reconhecida.' ? 'O servidor ainda está na versão antiga. Atualize o server.js primeiro.' : e.message;
const dataBR = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}` : ''; };
const diasAte = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return null; const h = new Date(); h.setHours(0, 0, 0, 0); return Math.round((new Date(+m[1], m[2] - 1, +m[3]) - h) / 864e5); };
const ORIGEM = { venda: ['Venda', 'verde'], pedido: ['Pedido do site', 'azul'], encomenda: ['Encomenda', 'roxo'], estoque: ['Para o estoque', 'cinza'], manual: ['Avulsa', 'cinza'] };

window.carregarFila = async function() {
    const box = $('fila-conteudo'); if (!box) return;
    if (!FL.dados) box.innerHTML = '<div class="carregando-box"><span class="girando"></span>Abrindo a fila…</div>';
    try {
        if (FL.aba === 'filamento') FL.filamentos = (await window.apiAcao('listar_filamentos')).filamentos;
        FL.dados = await window.apiAcao('listar_fila');
        window.renderizarFila();
    } catch (e) { box.innerHTML = `<div class="vazio-box">${ic('alerta')}<b>Não consegui abrir a fila</b><span>${esc(erroAmigavel(e))}</span></div>`; }
};
window.abaFila = function(a) { FL.aba = a; window.carregarFila(); };
// Número de peças esperando na fila, no menu e na barra de baixo
window.avisoFila = function(d) {
    const n = d && d.itens ? d.itens.filter(i => i.status !== 'pronto').reduce((s, i) => s + i.qtd, 0) : 0;
    document.querySelectorAll('[data-aviso-fila]').forEach(el => { el.textContent = n > 99 ? '99+' : (n || ''); el.hidden = !n; });
};
window.renderizarFila = function() {
    const box = $('fila-conteudo'), d = FL.dados; if (!box || !d) return;
    const abertos = d.itens.filter(i => i.status !== 'pronto'), pecas = abertos.reduce((s, i) => s + i.qtd, 0);
    window.avisoFila(d);
    const abas = `<div class="seg-mini largo fl-abas"><button class="${FL.aba === 'fila' ? 'active' : ''}" onclick="abaFila('fila')">${ic('impressora')} Fila <em>${pecas || ''}</em></button><button class="${FL.aba === 'prontos' ? 'active' : ''}" onclick="abaFila('prontos')">${ic('check')} Prontos (7 dias)</button><button class="${FL.aba === 'filamento' ? 'active' : ''}" onclick="abaFila('filamento')">🧵 Filamento</button></div>`;
    if (FL.aba === 'filamento') { box.innerHTML = abas + htmlFilamento(); return; }
    if (FL.aba === 'prontos') {
        const p = d.itens.filter(i => i.status === 'pronto').sort((a, b) => String(b.concluido_em).localeCompare(String(a.concluido_em)));
        box.innerHTML = abas + (p.length ? p.map(i => cartao(i, null)).join('') : `<div class="vazio-box">${ic('check')}<b>Nada impresso nos últimos 7 dias</b></div>`);
        return;
    }
    // Previsão: horas acumuladas na ordem, divididas pelas impressoras, contando 12 h de impressão por dia
    let acum = 0; const prev = {};
    abertos.forEach(i => { acum += (i.tempo || 0) * i.qtd; prev[i.id] = acum / d.impressoras; });
    const horas = acum / d.impressoras;
    const resumo = `<div class="resumo-faixa">
        <div class="rf roxo"><small>Para imprimir</small><b>${pecas}</b><i>${abertos.length} ${abertos.length === 1 ? 'item' : 'itens'}</i></div>
        <div class="rf"><small>Tempo de impressora</small><b>${horas >= 1 ? Math.round(horas) + ' h' : Math.round(horas * 60) + ' min'}</b><i>${d.impressoras} impressora${d.impressoras > 1 ? 's' : ''} · <a onclick="impressorasFila()">mudar</a></i></div>
        <div class="rf ${abertos.some(i => i.prazo && diasAte(i.prazo) < 0) ? 'laranja' : 'verde'}"><small>Atrasados</small><b>${abertos.filter(i => i.prazo && diasAte(i.prazo) < 0).length}</b><i>pelo prazo de entrega</i></div></div>`;
    box.innerHTML = abas + resumo + `<div class="fl-bts"><button class="btn-magic btn-pequeno" onclick="adicionarFila()">${ic('mais')} Imprimir para o estoque</button><button class="btn-limpar" onclick="avulsaFila()">${ic('lapis')} Peça avulsa</button></div>`
        + (abertos.length ? abertos.map(i => cartao(i, prev[i.id])).join('') : `<div class="vazio-box ok">${ic('check')}<b>Fila vazia</b><span>Quando você lançar uma venda "para fazer depois", ou um pedido do site for confirmado, as peças aparecem aqui sozinhas.</span></div>`);
};
function cartao(i, horasAntes) {
    const [o, cor] = ORIGEM[i.origem] || [i.origem, 'cinza'], dias = diasAte(i.prazo), pronto = i.status === 'pronto';
    const previsao = horasAntes === null || horasAntes === undefined ? '' : (() => { const dd = Math.floor(horasAntes / 12); return dd === 0 ? 'fica pronto hoje' : dd === 1 ? 'fica pronto amanhã' : `fica pronto em ~${dd} dias`; })();
    const ref = i.origem === 'venda' ? `<a onclick="verVenda(${i.ref_id})">venda #${i.ref_id}</a>` : i.origem === 'pedido' ? `<a onclick="switchTab('pedidos')">pedido #${i.ref_id}</a>` : '';
    return `<div class="fl-card st-${i.status} ${dias !== null && dias < 0 && !pronto ? 'atrasado' : ''}">
        <button type="button" class="fl-foto" ${i.foto ? `onclick="abrirGaleria({ fotos: ['${esc(i.foto)}'], titulo: this.dataset.n })" data-n="${esc(i.nome)}"` : 'disabled'}><img src="${esc(i.foto || 'logo.png')}" alt="" loading="lazy" onerror="this.src='logo.png'"><b>${i.qtd}×</b></button>
        <div class="fl-info">
            <b class="fl-nome">${esc(i.nome)}</b>
            ${i.personalizacao ? `<span class="fl-pers">✏️ ${esc(i.personalizacao)}</span>` : ''}
            <span class="fl-meta"><span class="pc-st ${cor}">${o}</span>${i.status === 'imprimindo' ? '<span class="pc-st laranja">▶ Imprimindo</span>' : ''}${i.kit ? `<small>do ${esc(i.kit)}</small>` : ''}</span>
            <small class="fl-sub">${[i.cliente ? esc(i.cliente) : '', ref, i.prazo ? `entregar até <b class="${dias !== null && dias < 0 ? 'atraso' : ''}">${dataBR(i.prazo)}</b>` : '', i.tempo ? `${i.tempo * i.qtd >= 1 ? Math.round(i.tempo * i.qtd * 10) / 10 + ' h' : Math.round(i.tempo * i.qtd * 60) + ' min'}` : '', previsao].filter(Boolean).join(' · ')}</small>
            ${!pronto && i.est_atelie > 0 && i.origem !== 'estoque' ? `<small class="fl-dica">🏠 Tem ${i.est_atelie} no Ateliê: dá para usar e tocar em "Já tinha"</small>` : ''}
            ${pronto ? `<small class="fl-sub">✅ ${String(i.concluido_em).slice(8, 10)}/${String(i.concluido_em).slice(5, 7)} às ${String(i.concluido_em).slice(11, 16)}${i.obs ? ` · ${esc(i.obs)}` : ''}</small>` : ''}
        </div>
        ${pronto ? '' : `<div class="fl-acoes">
            <button type="button" class="btn-vendi" onclick="concluirFila(${i.id})">${ic('check')} Imprimi</button>
            <div class="fl-mini">${i.status === 'fila' ? `<button type="button" class="btn-ic" title="Começou a imprimir" aria-label="Imprimindo" onclick="statusFila(${i.id}, 'imprimindo')">${ic('play')}</button>` : `<button type="button" class="btn-ic" title="Voltar para a fila" aria-label="Voltar para a fila" onclick="statusFila(${i.id}, 'fila')">${ic('desfazer')}</button>`}
                <button type="button" class="btn-ic" title="Passar na frente" aria-label="Passar na frente" onclick="prioridadeFila(${i.id})">${ic('cima')}</button>
                <button type="button" class="btn-ic perigo" title="Tirar da fila" aria-label="Tirar da fila" onclick="tirarFila(${i.id})">${ic('x')}</button></div>
        </div>`}
    </div>`;
}
const item = id => (FL.dados.itens || []).find(i => i.id === id);
window.statusFila = async function(id, status) { try { await window.apiAcao('fila_status', { id, status }); await window.carregarFila(); } catch (e) { window.mostrarAlerta('Não deu', erroAmigavel(e), 'warning'); } };
window.prioridadeFila = async function(id) { try { await window.apiAcao('fila_prioridade', { id }); await window.carregarFila(); window.toastMM('Passou para a frente da fila'); } catch (e) { window.mostrarAlerta('Não deu', erroAmigavel(e), 'warning'); } };
window.tirarFila = async function(id) {
    const i = item(id); if (!i) return;
    if (!await window.confirmarMM({ tipo: 'perigo', icone: '🖨️', titulo: `Tirar ${i.qtd}× ${i.nome} da fila?`, texto: 'Use quando não vai mais precisar imprimir (a venda ou o pedido continuam).', ok: 'Tirar da fila' })) return;
    window.statusFila(id, 'cancelado');
};
// Imprimiu: escolhe o carretel (fica lembrado para o próximo do mesmo produto) ou "já tinha pronta"
window.concluirFila = function(id) {
    const i = item(id); if (!i) return;
    const fs = FL.dados.filamentos || [], ult = FL.ultimoFilamento[i.produto_id] || '', gasto = Math.round((i.peso || 0) * i.qtd);
    window.abrirModalMM(`<h3 class="modal-title">${ic('check')} ${i.qtd}× ${esc(i.nome)}</h3>
        ${i.personalizacao ? `<p class="fl-pers" style="margin-top:0;">✏️ ${esc(i.personalizacao)}</p>` : ''}
        <div class="input-group"><label for="fl-filamento">Qual filamento usou? ${gasto ? `<small style="font-weight:600;color:var(--text-muted);">(gasta ~${gasto} g)</small>` : ''}</label>
            <select id="fl-filamento"><option value="">Não descontar filamento</option>${fs.map(f => `<option value="${f.id}" ${String(f.id) === String(ult) ? 'selected' : ''}>${esc(f.material)} ${esc(f.cor)} · sobram ${f.restante} g</option>`).join('')}</select>
            ${fs.length ? '' : `<small class="texto-ajuda">Cadastre os carretéis na aba Filamento para saber quanto sobra de cada cor.</small>`}</div>
        <button class="btn-magic btn-global" onclick="confirmarConcluirFila(${id}, false)">${ic('check')} Imprimi${i.origem === 'estoque' ? ' (entra no Ateliê)' : ''}</button>
        ${i.origem === 'estoque' ? '' : `<button class="btn-limpar" style="width:100%;margin-top:8px;padding:11px;" onclick="confirmarConcluirFila(${id}, true)">Já tinha pronta (não imprimi agora)</button>`}`);
};
window.confirmarConcluirFila = async function(id, jaTinha) {
    const i = item(id), filamento = jaTinha ? '' : ($('fl-filamento') || {}).value || '';
    if (i && filamento) { FL.ultimoFilamento[i.produto_id] = filamento; try { localStorage.setItem('mm_fila_filamento', JSON.stringify(FL.ultimoFilamento)); } catch (e) { /* ok */ } }
    document.querySelectorAll('#modal-mm-conteudo button').forEach(b => { b.disabled = true; });
    try {
        const r = await window.apiAcao('fila_concluir', { id, filamento_id: filamento || null, ja_tinha: jaTinha });
        window.fecharModalMM(); window.toastMM(jaTinha ? 'Marcado como pronto' : `Impresso!${r.gastou ? ` ${r.gastou} g de filamento` : ''}`);
        await window.carregarFila();
        if (r.pedido_pronto) {
            if (await window.confirmarMM({ icone: '🎁', titulo: `Pedido #${r.pedido_pronto.id} todo impresso!`, texto: `Marcar o pedido de ${r.pedido_pronto.cliente} como PRONTO? O cliente vê no acompanhamento (e recebe o aviso no celular, se ativou).`, ok: 'Marcar pronto', cancelar: 'Depois' })) {
                try { await window.apiAcao('status_pedido_cliente', { id: r.pedido_pronto.id, status: 'pronto' }); window.toastMM('Pedido marcado como pronto'); } catch (e) { window.mostrarAlerta('Não deu', e.message, 'warning'); }
            }
        }
        if (r.venda_pronta) {
            const v = r.venda_pronta, txt = `Olá${v.cliente && !/avulso/i.test(v.cliente) ? `, ${String(v.cliente).split(' ')[0]}` : ''}! Sua encomenda da Mini Mundo está pronta! 🎁 Quando podemos entregar?`;
            window.abrirModalMM(`<div class="mm-sucesso"><span class="modal-icon-alert ok">🎁</span><h3 class="modal-title-alert">Venda #${v.id} toda impressa!</h3><p class="modal-text-alert">${esc(v.cliente || '')}: todas as peças estão prontas para entregar.</p>
                ${v.telefone ? `<a class="btn-magic btn-zap" target="_blank" rel="noopener" href="${window.linkZap(v.telefone, txt)}">${ic('zap')} Avisar o cliente no WhatsApp</a>` : ''}
                <button class="btn-modal-ok ok" onclick="fecharModalMM()">Ok</button></div>`);
        }
    } catch (e) { window.mostrarAlerta('Não deu', erroAmigavel(e), 'warning'); document.querySelectorAll('#modal-mm-conteudo button').forEach(b => { b.disabled = false; }); }
};
window.adicionarFila = async function() {
    if (!(window.arrayBancoCustos || []).length) await window.carregarBancoDeCustos();
    const prods = window.arrayBancoCustos.filter(p => p.ativo !== false);
    window.abrirModalMM(`<h3 class="modal-title">${ic('impressora')} Imprimir para o estoque</h3>
        <p class="texto-ajuda" style="margin-top:0;">Quando você tocar em "Imprimi", as peças entram no Ateliê. Kit vira as peças dele.</p>
        <div class="input-group"><label>Produto</label><select id="fl-produto" data-fotos>${prods.map(p => `<option value="${p.linha}" data-foto="${esc(String(p.foto || p.foto_catalogo || '').split(',')[0])}" data-sub="${p.est_atelie || 0} no Ateliê">${esc(p.modelo)}</option>`).join('')}</select></div>
        <div class="input-group"><label for="fl-qtd">Quantas</label><input type="number" id="fl-qtd" min="1" value="1" inputmode="numeric"></div>
        <button class="btn-magic btn-global" onclick="salvarAdicionarFila()">${ic('mais')} Pôr na fila</button>`);
    if (window.ligarListasComFoto) window.ligarListasComFoto();
};
window.salvarAdicionarFila = async function() {
    try { await window.apiAcao('fila_adicionar', { produto_id: $('fl-produto').value, qtd: $('fl-qtd').value }); window.fecharModalMM(); window.toastMM('Na fila'); window.carregarFila(); }
    catch (e) { window.mostrarAlerta('Não deu', erroAmigavel(e), 'warning'); }
};
window.avulsaFila = function() {
    window.abrirModalMM(`<h3 class="modal-title">${ic('lapis')} Peça avulsa</h3>
        <p class="texto-ajuda" style="margin-top:0;">Para algo que não está cadastrado (ex.: uma peça especial). Não mexe no estoque.</p>
        <div class="input-group"><label for="fl-nome">O que imprimir</label><input type="text" id="fl-nome" maxlength="160" placeholder="Ex.: Placa com o nome da Joana"></div>
        <div class="row"><div class="col"><div class="input-group"><label for="fl-qtd">Quantas</label><input type="number" id="fl-qtd" min="1" value="1"></div></div>
            <div class="col"><div class="input-group"><label for="fl-prazo">Entregar até</label><input type="date" id="fl-prazo"></div></div></div>
        <div class="input-group"><label for="fl-cliente">Para quem (opcional)</label><input type="text" id="fl-cliente" maxlength="120"></div>
        <button class="btn-magic btn-global" onclick="salvarAvulsaFila()">${ic('mais')} Pôr na fila</button>`);
};
window.salvarAvulsaFila = async function() {
    try { await window.apiAcao('fila_adicionar', { nome: $('fl-nome').value, qtd: $('fl-qtd').value, prazo: $('fl-prazo').value, cliente: $('fl-cliente').value }); window.fecharModalMM(); window.toastMM('Na fila'); window.carregarFila(); }
    catch (e) { window.mostrarAlerta('Não deu', erroAmigavel(e), 'warning'); }
};
window.impressorasFila = async function() {
    const n = await window.pedirValorMM({ icone: '🖨️', titulo: 'Quantas impressoras você usa?', texto: 'A previsão da fila divide o tempo entre elas.', campo: 'number', valor: String(FL.dados.impressoras), ok: 'Salvar', validar: v => parseInt(v) >= 1 && parseInt(v) <= 50 ? null : 'De 1 a 50.' });
    if (!n) return;
    try { window.configMM = (await window.apiAcao('salvar_config', { valores: { impressoras: String(parseInt(n)) } })).config; window.carregarFila(); } catch (e) { window.mostrarAlerta('Erro', e.message, 'error'); }
};

// ---------- Filamento ----------
function htmlFilamento() {
    const fs = FL.filamentos || [], ativos = fs.filter(f => f.ativo), acabados = fs.filter(f => !f.ativo);
    const card = f => { const pct = f.peso_total ? Math.max(0, Math.min(100, Math.round(f.restante / f.peso_total * 100))) : 0, baixo = f.restante < 150;
        return `<div class="fm-card ${f.ativo ? '' : 'acabou'} ${baixo && f.ativo ? 'baixo' : ''}">
            <span class="fm-cor" style="background:${esc(f.cor_hex || '#d6d3d1')}"></span>
            <div class="fm-info"><b>${esc(f.material)} ${esc(f.cor)}</b><small>${f.marca ? esc(f.marca) + ' · ' : ''}${f.uso30 ? `gastou ${f.uso30} g em 30 dias` : 'sem uso nos últimos 30 dias'}</small>
                <div class="fm-barra"><i style="width:${pct}%"></i></div><small><b>${f.restante} g</b> de ${f.peso_total} g${baixo && f.ativo ? ' · <b class="atraso">acabando</b>' : ''}</small></div>
            <div class="fm-acoes">${f.ativo ? `<button class="btn-limpar" onclick="pesarFilamento(${f.id})">Pesei</button><button class="btn-ic perigo" title="Acabou" aria-label="Acabou" onclick="acabouFilamento(${f.id})">${ic('x')}</button>` : `<button class="btn-limpar" onclick="pesarFilamento(${f.id})">Voltar a usar</button>`}</div>
        </div>`; };
    return `<p class="texto-ajuda">Cada "Imprimi" desconta o peso da peça do carretel escolhido. Quando sobra menos de 150 g, chega um aviso no Telegram.</p>
        <div class="fl-bts"><button class="btn-magic btn-pequeno" onclick="novoFilamento()">${ic('mais')} Cadastrar carretel</button></div>
        ${ativos.length ? ativos.map(card).join('') : `<div class="vazio-box">🧵<b>Nenhum carretel cadastrado</b><span>Cadastre os carretéis que você tem para saber quanto sobra de cada cor.</span></div>`}
        ${acabados.length ? `<details class="vv-antigas"><summary>Carretéis que acabaram (${acabados.length})</summary>${acabados.map(card).join('')}</details>` : ''}`;
}
window.novoFilamento = function() {
    window.abrirModalMM(`<h3 class="modal-title">🧵 Carretel novo</h3>
        <div class="row"><div class="col"><div class="input-group"><label for="fm-material">Material</label><select id="fm-material">${['PLA', 'PETG', 'ABS', 'TPU', 'Silk', 'Outro'].map(m => `<option>${m}</option>`).join('')}</select></div></div>
            <div class="col"><div class="input-group"><label for="fm-cor">Cor</label><input type="text" id="fm-cor" maxlength="40" placeholder="Ex.: Branco"></div></div>
            <div class="col" style="max-width:90px;"><div class="input-group"><label for="fm-hex">Tom</label><input type="color" id="fm-hex" value="#ffffff"></div></div></div>
        <div class="row"><div class="col"><div class="input-group"><label for="fm-peso">Peso (g)</label><input type="number" id="fm-peso" value="1000" min="1"></div></div>
            <div class="col"><div class="input-group"><label for="fm-qtd">Quantos carretéis</label><input type="number" id="fm-qtd" value="1" min="1" max="50"></div></div></div>
        <div class="row"><div class="col"><div class="input-group"><label for="fm-marca">Marca/loja</label><input type="text" id="fm-marca" maxlength="60" placeholder="Opcional"></div></div>
            <div class="col"><div class="input-group"><label for="fm-preco">Preço de cada (R$)</label><input type="text" id="fm-preco" class="mask-money" placeholder="R$ 0,00"></div></div></div>
        <label class="chave" style="margin:2px 0 14px;"><input type="checkbox" id="fm-despesa" checked> Lançar a compra em Custos e compras</label>
        <button class="btn-magic btn-global" onclick="salvarNovoFilamento()">${ic('check')} Salvar</button>`);
};
window.salvarNovoFilamento = async function() {
    try {
        FL.filamentos = (await window.apiAcao('salvar_filamento', { material: $('fm-material').value, cor: $('fm-cor').value, cor_hex: $('fm-hex').value, peso_total: $('fm-peso').value, quantidade: $('fm-qtd').value, marca: $('fm-marca').value, preco: $('fm-preco').value, lancar_despesa: $('fm-despesa').checked })).filamentos;
        window.fecharModalMM(); window.toastMM('Carretel cadastrado'); FL.dados = await window.apiAcao('listar_fila'); window.renderizarFila();
    } catch (e) { window.mostrarAlerta('Não deu', erroAmigavel(e), 'warning'); }
};
window.pesarFilamento = async function(id) {
    const f = (FL.filamentos || []).find(x => x.id === id); if (!f) return;
    const g = await window.pedirValorMM({ icone: '⚖️', titulo: `Quanto sobrou de ${f.material} ${f.cor}?`, texto: 'Pese o carretel e desconte o peso do carretel vazio (uns 200 g no de plástico). Em gramas.', campo: 'number', valor: String(f.restante), ok: 'Salvar', validar: v => v !== '' && parseInt(v) >= 0 ? null : 'Informe os gramas.' });
    if (g === null || g === undefined || g === false) return;
    try { FL.filamentos = (await window.apiAcao('ajustar_filamento', { id, restante: parseInt(g) })).filamentos; FL.dados = await window.apiAcao('listar_fila'); window.renderizarFila(); } catch (e) { window.mostrarAlerta('Não deu', erroAmigavel(e), 'warning'); }
};
window.acabouFilamento = async function(id) {
    if (!await window.confirmarMM({ icone: '🧵', titulo: 'Este carretel acabou?', texto: 'Ele sai da lista de filamentos em uso (fica no histórico).', ok: 'Acabou' })) return;
    try { FL.filamentos = (await window.apiAcao('ajustar_filamento', { id, acabou: true })).filamentos; FL.dados = await window.apiAcao('listar_fila'); window.renderizarFila(); } catch (e) { window.mostrarAlerta('Não deu', erroAmigavel(e), 'warning'); }
};
})();
