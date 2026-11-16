// ==========================================
// 👥 CLIENTES (montado sozinho pelas vendas e pelos pedidos do site)
// ==========================================
// Quem compra mais, quem está devendo, quem sumiu (para chamar de volta) e os aniversariantes.
// Abrir o cliente mostra as compras com foto, o que deve e os pedidos. Dá para guardar aniversário e observação.
(() => {
const $ = window.$, esc = s => window.esc(s), ic = n => window.ic(n), fmt = v => window.fmt(v);
window.CL = { lista: [], filtro: 'todos', busca: '' };
const erroAmigavel = e => e.message === 'Ação não reconhecida.' ? 'O servidor ainda está na versão antiga. Atualize o server.js primeiro.' : e.message;
const dataBR = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1].slice(2)}` : ''; };
const hojeMMDD = () => { const d = new Date(); return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const anivBR = s => s ? `${s.slice(3, 5)}/${s.slice(0, 2)}` : '';
const proximoAniv = s => { if (!s) return 999; const d = new Date(); d.setHours(0, 0, 0, 0); let a = new Date(d.getFullYear(), +s.slice(0, 2) - 1, +s.slice(3, 5)); if (a < d) a = new Date(d.getFullYear() + 1, +s.slice(0, 2) - 1, +s.slice(3, 5)); return Math.round((a - d) / 864e5); };

window.carregarClientes = async function() {
    const box = $('cl-lista'); if (!box) return;
    if (!CL.lista.length) box.innerHTML = '<div class="carregando-box"><span class="girando"></span>Juntando os clientes…</div>';
    try { CL.lista = (await window.apiAcao('listar_clientes')).clientes; window.renderizarClientes(); }
    catch (e) { box.innerHTML = `<div class="vazio-box">${ic('alerta')}<b>Não consegui abrir os clientes</b><span>${esc(erroAmigavel(e))}</span></div>`; }
};
window.filtroClientes = function(f) { CL.filtro = f; window.renderizarClientes(); };
window.renderizarClientes = function() {
    const l = CL.lista, t = ($('cl-busca') || {}).value || '';
    const devendo = l.filter(c => c.deve > 0), sumidos = l.filter(c => c.dias !== null && c.dias >= 60 && c.compras > 0), anivs = l.filter(c => c.aniversario && proximoAniv(c.aniversario) <= 30);
    $('cl-resumo').innerHTML = `<div class="resumo-faixa">
        <div class="rf"><small>Clientes</small><b>${l.length}</b><i>com compra ou pedido</i></div>
        <button type="button" class="rf laranja" onclick="filtroClientes('devendo')"><small>Devendo</small><b>${fmt(devendo.reduce((s, c) => s + c.deve, 0))}</b><i>${devendo.length} cliente(s)</i></button>
        <button type="button" class="rf roxo" onclick="filtroClientes('sumidos')"><small>Sumidos (60+ dias)</small><b>${sumidos.length}</b><i>para chamar de volta</i></button></div>`;
    $('cl-filtros').innerHTML = [['todos', 'Todos', l.length], ['devendo', 'Devendo', devendo.length], ['sumidos', 'Sumidos', sumidos.length], ['aniversario', '🎂 Aniversário (30 dias)', anivs.length]]
        .map(([k, r, n]) => `<button type="button" class="chip-op ${CL.filtro === k ? 'active' : ''}" onclick="filtroClientes('${k}')">${r} <em>${n || ''}</em></button>`).join('');
    let lista = CL.filtro === 'devendo' ? devendo : CL.filtro === 'sumidos' ? sumidos.sort((a, b) => b.total - a.total) : CL.filtro === 'aniversario' ? anivs.sort((a, b) => proximoAniv(a.aniversario) - proximoAniv(b.aniversario)) : l;
    lista = lista.filter(c => window.buscaBate(t, c.nome, c.telefone));
    $('cl-lista').innerHTML = lista.length ? lista.slice(0, 200).map(c => {
        const pa = c.aniversario ? proximoAniv(c.aniversario) : 999;
        return `<div class="cl-card" role="button" tabindex="0" onclick="abrirCliente(this.dataset.n)" data-n="${esc(c.nome)}">
            <span class="cl-av">${esc(c.nome.trim().charAt(0).toUpperCase())}</span>
            <div class="cl-info"><b>${esc(c.nome)}${pa === 0 ? ' 🎂' : ''}</b>
                <small>${c.compras} compra${c.compras === 1 ? '' : 's'}${c.pedidos ? ` · ${c.pedidos} pedido${c.pedidos === 1 ? '' : 's'} no site` : ''} · última ${c.dias === 0 ? 'hoje' : c.dias === 1 ? 'ontem' : c.dias !== null ? `há ${c.dias} dias` : '—'}${c.aniversario ? ` · 🎂 ${anivBR(c.aniversario)}` : ''}</small>
                ${c.deve > 0 ? `<span class="pc-st laranja">deve ${fmt(c.deve)}</span>` : ''}</div>
            <b class="cl-total">${fmt(c.total)}</b>
            ${c.telefone ? `<a class="btn-zap-lista" href="${window.linkZap(c.telefone, `Olá, ${c.nome.split(' ')[0]}! Aqui é da Mini Mundo 😊`)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" aria-label="WhatsApp de ${esc(c.nome)}">${ic('zap')}</a>` : ''}
        </div>`;
    }).join('') : `<div class="vazio-box">${ic('usuarios')}<b>${CL.lista.length ? 'Ninguém aqui' : 'Nenhum cliente ainda'}</b><span>${CL.lista.length ? 'Tente outro filtro ou outra busca.' : 'Os clientes aparecem sozinhos quando você lança vendas com o nome deles.'}</span></div>`;
};
window.abrirCliente = async function(nome) {
    window.abrirModalMM(`<h3 class="modal-title">${ic('usuarios')} ${esc(nome)}</h3><div class="carregando-box"><span class="girando"></span>Abrindo…</div>`);
    try {
        const r = await window.apiAcao('cliente_detalhe', { nome }), c = r.cliente, info = r.info || {};
        const peds = new Map(); r.vendas.forEach(v => { if (!peds.has(v.ped)) peds.set(v.ped, []); peds.get(v.ped).push(v); });
        const cobrar = c.deve > 0 ? `Olá, ${c.nome.split(' ')[0]}! Tudo bem? Passando para lembrar do pagamento de ${fmt(c.deve)} das suas compras na Mini Mundo. Agradeço a preferência! 😊` : '';
        window.preencherModalMM(`<h3 class="modal-title">${ic('usuarios')} ${esc(c.nome)}</h3>
            <div class="resumo-faixa"><div class="rf verde"><small>Comprou</small><b>${fmt(c.total || 0)}</b><i>${c.compras || 0} compra(s)</i></div>
                <div class="rf ${c.deve > 0 ? 'laranja' : ''}"><small>Deve</small><b>${fmt(c.deve || 0)}</b><i>${c.deve > 0 ? 'a receber' : 'nada'}</i></div>
                <div class="rf"><small>Cliente desde</small><b>${dataBR(c.primeira) || '—'}</b><i>última ${dataBR(c.ultima) || '—'}</i></div></div>
            ${c.telefone ? `<div class="cl-bts"><a class="btn-magic btn-zap" target="_blank" rel="noopener" href="${window.linkZap(c.telefone, `Olá, ${c.nome.split(' ')[0]}! Aqui é da Mini Mundo 😊`)}">${ic('zap')} WhatsApp</a>${cobrar ? `<a class="btn-magic btn-amarelo" target="_blank" rel="noopener" href="${window.linkZap(c.telefone, cobrar)}">${ic('dinheiro')} Cobrar ${fmt(c.deve)}</a>` : ''}</div>` : ''}
            <div class="secao-tit">${ic('recibo')}Compras</div>
            ${[...peds].map(([ped, ls]) => `<div class="cl-venda" onclick="fecharModalMM(); verVenda(${ped})" role="button" tabindex="0">
                <span class="vd-fotos n${Math.min(4, Math.max(1, new Set(ls.map(l => l.foto).filter(Boolean)).size))}">${([...new Set(ls.map(l => l.foto).filter(Boolean))].slice(0, 4).length ? [...new Set(ls.map(l => l.foto).filter(Boolean))].slice(0, 4) : ['logo.png']).map(f => `<img src="${esc(f)}" alt="" loading="lazy" onerror="this.src='logo.png'">`).join('')}</span>
                <div><b>Venda #${ped} · ${dataBR(ls[0].data)}</b><small>${ls.map(l => `${l.qtd}x ${esc(l.produto)}${l.personalizacao ? ` (${esc(l.personalizacao)})` : ''}`).join(' · ')}</small></div>
                <span class="cl-v ${ls.some(l => String(l.status).toLowerCase() === 'pendente') ? 'pend' : ''}">${fmt(ls.reduce((s, l) => s + l.valor, 0))}</span></div>`).join('') || '<p class="mm-vazio">Nenhuma compra lançada.</p>'}
            ${r.pedidos.length ? `<div class="secao-tit">${ic('presente')}Pedidos do site</div>${r.pedidos.map(p => `<div class="mm-linha"><span class="mm-nome">Pedido #${p.id} · ${esc(p.status)}<span class="mm-sub">${dataBR(p.criado_em)} · ${fmt(p.total)}${p.pago ? ' · pago' : ''}</span></span></div>`).join('')}` : ''}
            <div class="secao-tit">${ic('lapis')}Anotações</div>
            <div class="row"><div class="col"><div class="input-group"><label for="cl-aniv">Aniversário (dia/mês)</label><input type="text" id="cl-aniv" inputmode="numeric" maxlength="5" placeholder="25/12" value="${esc(anivBR(info.aniversario || c.aniversario || ''))}"></div></div>
                <div class="col"><div class="input-group"><label for="cl-tel">WhatsApp</label><input type="tel" id="cl-tel" value="${esc(info.telefone || c.telefone || '')}"></div></div></div>
            <div class="input-group"><label for="cl-obs">Observação</label><textarea id="cl-obs" rows="2" maxlength="500" placeholder="Ex.: gosta de azul, compra para os netos…">${esc(info.obs || c.obs || '')}</textarea></div>
            <button class="btn-magic btn-global" onclick="salvarCliente(this.dataset.n)" data-n="${esc(c.nome)}">${ic('check')} Salvar anotações</button>
            <p class="texto-ajuda" style="text-align:center;">No dia do aniversário, o bom dia do Telegram avisa.</p>`);
    } catch (e) { window.preencherModalMM(`<h3 class="modal-title">${esc(nome)}</h3><p class="mm-vazio">${esc(erroAmigavel(e))}</p>`); }
};
window.salvarCliente = async function(nome) {
    try { await window.apiAcao('salvar_cliente', { nome, aniversario: $('cl-aniv').value, telefone: $('cl-tel').value, obs: $('cl-obs').value }); window.fecharModalMM(); window.toastMM('Anotações salvas'); window.carregarClientes(); }
    catch (e) { window.mostrarAlerta('Não deu', erroAmigavel(e), 'warning'); }
};
})();
