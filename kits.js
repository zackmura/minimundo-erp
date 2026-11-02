// ==========================================
// 🧩 KITS: TODOS OS KITS COM FOTO, MONTAR E DIVULGAR
// ==========================================
// Mostra todos os kits (montados ou não) com fotos, preço e peças. Para vender, o kit entra numa
// página de venda (paginas.js); daqui dá para ver em quais páginas ele está e compartilhar o link dele.
(() => {
const $ = window.$;
const esc = s => window.esc(s);
window.KT = { filtro: 'todos' };
const produtoPorId = id => (window.arrayBancoCustos || []).find(p => p.linha === id);
const est = p => Math.max(0, parseInt(p && p.est_atelie) || 0);
const montaveis = k => (k.itens || []).length ? Math.min(...k.itens.map(i => Math.floor(est(produtoPorId(i.produto_id)) / (i.qtd || 1)))) : 0;
const nomeItem = i => { const p = produtoPorId(i.produto_id); return i.nome_vitrine || (p ? p.modelo : '(peça removida)'); };
const fotoPrincipal = p => (window.fotosDe(p) || [])[0] || '';
// Soma das peças vendidas separadas (só quando todas têm preço de venda)
const separadas = k => { const its = k.itens || []; return its.length && its.every(i => (produtoPorId(i.produto_id) || {}).preco_venda > 0) ? its.reduce((s, i) => s + produtoPorId(i.produto_id).preco_venda * i.qtd, 0) : 0; };
const prontaEntrega = k => est(k) > 0 || montaveis(k) > 0;
const paginasDe = id => ((window.PG && PG.lista) || []).filter(p => p.itens.some(i => i.produto_id === id));

window.carregarKits = async function() {
    if (!(window.arrayBancoCustos || []).length && $('lista-kits')) $('lista-kits').innerHTML = '<p class="mm-vazio">Carregando os kits…</p>';
    await Promise.all([window.carregarBancoDeCustos(), window.carregarListaPaginas ? window.carregarListaPaginas() : null]);
    window.renderizarKits();
};
window.filtroKits = function(f) { KT.filtro = f; document.querySelectorAll('#kt-filtros button').forEach(b => b.classList.toggle('active', b.dataset.f === f)); window.renderizarKits(); };

window.renderizarKits = function() {
    const box = $('lista-kits'); if (!box) return;
    const todos = (window.arrayBancoCustos || []).filter(p => p.tipo === 'kit'), ativos = todos.filter(k => k.ativo !== false);
    const t = $('kt-busca').value, noAr = k => paginasDe(k.linha).some(p => p.ativa);
    window.montarFiltroCategoria('kt-categoria', ativos); const cat = $('kt-categoria').value;
    const conta = { todos: ativos.length, pagina: ativos.filter(noAr).length, fora: ativos.filter(k => !noAr(k)).length, pronta: ativos.filter(prontaEntrega).length, inativos: todos.length - ativos.length };
    document.querySelectorAll('#kt-filtros button').forEach(b => { b.querySelector('em').innerText = conta[b.dataset.f] || ''; });
    $('kt-pagina').innerHTML = `<div class="kt-banner"><span class="kt-banner-ic">${window.ic('sacola')}</span>
        <div class="kt-banner-txt"><b>Para vender, coloque o kit numa página de venda</b><span>${conta.pagina} de ${conta.todos} kit${conta.todos === 1 ? '' : 's'} em página${conta.pagina === 1 ? '' : 's'} no ar</span></div>
        <div class="kt-banner-bt"><button class="btn-magic btn-pequeno" onclick="switchTab('paginas')">${window.ic('sacola')} Páginas de venda</button></div></div>`;
    const lista = (KT.filtro === 'inativos' ? todos.filter(k => k.ativo === false) : ativos).filter(k =>
        (KT.filtro !== 'pagina' || noAr(k)) && (KT.filtro !== 'fora' || !noAr(k)) && (KT.filtro !== 'pronta' || prontaEntrega(k))
        && window.categoriaBate(k, cat) && window.buscaBate(t, k.modelo, k.categoria, (k.itens || []).map(nomeItem).join(' '), (k.itens || []).map(i => (produtoPorId(i.produto_id) || {}).modelo).join(' ')));
    if (!lista.length) {
        box.innerHTML = `<div class="vazio-box">${window.ic('camadas')}<b>${!todos.length ? 'Nenhum kit cadastrado ainda' : t.trim() ? `Nada encontrado para "${esc(t)}"` : 'Nenhum kit nesse filtro'}</b>
            <span>${!todos.length ? 'Junte peças que combinam e venda como presente. <a onclick="novoProduto(\'kit\')">Criar o primeiro kit</a>' : ''}</span></div>`;
        return;
    }
    box.innerHTML = lista.map(k => {
        const fotos = window.fotosDe(k), its = k.itens || [], preco = k.preco_venda || 0, sep = separadas(k), da = montaveis(k), prontos = est(k);
        const pgs = paginasDe(k.linha), noArK = pgs.some(p => p.ativa);
        // Kit sem foto própria: mosaico com as fotos das peças
        const mosaico = [...new Set(its.map(i => fotoPrincipal(produtoPorId(i.produto_id))).filter(Boolean))].slice(0, 4);
        const capa = fotos.length ? `<img src="${esc(fotos[0])}" alt="" loading="lazy" onerror="this.src='logo.png'">`
            : mosaico.length ? `<span class="kt-mosaico n${mosaico.length}">${mosaico.map(f => `<img src="${esc(f)}" alt="" loading="lazy" onerror="this.src='logo.png'">`).join('')}</span><span class="kt-semfoto">${window.ic('camera')} Sem foto do kit</span>`
            : `<span class="kt-semfoto so">${window.ic('camera')} Adicionar foto</span>`;
        return `<div class="kt-card ${k.ativo !== false && noArK ? '' : 'fora'}">
            <button type="button" class="kt-foto" onclick="tocarFotoProduto(${k.linha})" title="${fotos.length ? 'Ver as fotos' : 'Adicionar fotos'}">${capa}
                <span class="kt-selo ${noArK && k.ativo !== false ? 'on' : ''}">${k.ativo === false ? 'Inativo' : pgs.length ? pgs.map(p => window.temaMM(p.tema).emoji).join(' ') + (noArK ? ' À venda' : ' Página pausada') : 'Fora das páginas'}</span>
                ${fotos.length > 1 ? `<em class="kt-nfotos">${window.ic('imagem')}${fotos.length}</em>` : ''}</button>
            <div class="kt-corpo">
                <b class="kt-nome">${esc(k.modelo)}</b>
                <div class="kt-preco">${preco ? window.fmt(preco) : '<i>sem preço de venda</i>'}${sep > preco && preco ? ` <s>${window.fmt(sep)}</s>` : ''}</div>
                <div class="kt-itens">${its.map(i => { const p = produtoPorId(i.produto_id); return `<span class="kt-item"><img src="${esc(fotoPrincipal(p) || 'logo.png')}" alt="" loading="lazy" onerror="this.src='logo.png'"><b>${i.qtd}×</b> ${esc(nomeItem(i))}</span>`; }).join('')}</div>
                <div class="kt-estado ${prontos || da ? 'ok' : ''}">${prontos ? `<b>${prontos} pronto${prontos > 1 ? 's' : ''}</b> no Ateliê` : ''}${prontos && da ? ' · ' : ''}${da ? `dá para montar ${da}` : prontos ? '' : 'Sob encomenda: faltam peças no Ateliê'}</div>
            </div>
            <div class="kt-botoes">
                <button class="btn-magic btn-pequeno" onclick="compartilharKit(${k.linha})">${window.ic('zap')} Compartilhar</button>
                <button class="btn-limpar" onclick="paginasDoProduto(${k.linha})">${window.ic('sacola')} Páginas</button>
                <button class="btn-limpar" onclick="montarKitAqui(${k.linha})" ${k.ativo === false ? 'disabled' : ''}>${window.ic('camadas')} Montar</button>
                <button class="btn-limpar" onclick="editarProduto(${k.linha})" title="Mudar as peças, o custo e os preços">${window.ic('calculadora')} Editar</button>
            </div></div>`;
    }).join('');
};

window.montarKitAqui = async function(id) {
    await window.carregarPainelEstoque();
    if (window.painelEstoque) window.abrirMontarKit(id);
};

// ---------- COMPARTILHAR ----------
// No celular abre o "Compartilhar" do aparelho (WhatsApp, Instagram…); no computador mostra as opções
window.compartilharMM = async function(titulo, texto) {
    if (navigator.share && matchMedia('(pointer:coarse)').matches) {
        try { await navigator.share({ title: titulo, text: texto }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    window.abrirModalMM(`<h3 class="modal-title">${window.ic('zap')} Compartilhar</h3>
        <p class="texto-ajuda" style="margin-top:0;">É isso que a pessoa vai receber:</p>
        <div class="kt-previa">${esc(texto)}</div>
        <a class="btn-magic btn-global kt-zap" href="${esc(window.linkZap('', texto))}" target="_blank" rel="noopener">${window.ic('zap')} Mandar no WhatsApp</a>
        <button type="button" class="btn-limpar ep-link" onclick="copiarTexto(this.dataset.t, 'Texto com o link copiado!')" data-t="${esc(texto)}">${window.ic('copiar')} Copiar texto com o link</button>`);
};
// O link do kit é o da página de venda em que ele está (com foto e preço na prévia)
window.compartilharKit = function(id) {
    const k = produtoPorId(id); if (!k) return;
    if (k.ativo === false) return window.mostrarAlerta('Kit inativo', 'Ligue "Produto ativo" na edição do kit para ele aparecer para os clientes.', 'warning');
    const noAr = paginasDe(id).filter(p => p.ativa);
    if (noAr.length === 1) return window.compartilharItemPg(id, noAr[0].id);
    window.paginasDoProduto(id);
    if (!noAr.length) window.toastMM('Escolha uma página para o kit aparecer');
};
})();
