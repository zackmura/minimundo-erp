// ==========================================
// 🧩 KITS: TODOS OS KITS COM FOTO, PEÇAS, ESTOQUE E MONTAR
// ==========================================
// Mostra todos os kits (montados ou não) com fotos, preço, peças e quanto dá para montar.
// Para vender e divulgar, os kits entram nas Páginas de venda (paginas.js).
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

window.carregarKits = async function() {
    if (!(window.arrayBancoCustos || []).length && $('lista-kits')) $('lista-kits').innerHTML = '<p class="mm-vazio">Carregando os kits…</p>';
    await window.carregarBancoDeCustos();
    window.renderizarKits();
};
window.filtroKits = function(f) { KT.filtro = f; document.querySelectorAll('#kt-filtros button').forEach(b => b.classList.toggle('active', b.dataset.f === f)); window.renderizarKits(); };

window.renderizarKits = function() {
    const box = $('lista-kits'); if (!box) return;
    const todos = (window.arrayBancoCustos || []).filter(p => p.tipo === 'kit'), ativos = todos.filter(k => k.ativo !== false);
    const t = $('kt-busca').value;
    window.montarFiltroCategoria('kt-categoria', ativos); const cat = $('kt-categoria').value;
    const conta = { todos: ativos.length, pronta: ativos.filter(prontaEntrega).length, inativos: todos.length - ativos.length };
    document.querySelectorAll('#kt-filtros button').forEach(b => { b.querySelector('em').innerText = conta[b.dataset.f] || ''; });
    const lista = (KT.filtro === 'inativos' ? todos.filter(k => k.ativo === false) : ativos).filter(k => (KT.filtro !== 'pronta' || prontaEntrega(k))
        && window.categoriaBate(k, cat) && window.buscaBate(t, k.modelo, k.categoria, (k.itens || []).map(nomeItem).join(' '), (k.itens || []).map(i => (produtoPorId(i.produto_id) || {}).modelo).join(' ')));
    if (!lista.length) {
        box.innerHTML = `<div class="vazio-box">${window.ic('camadas')}<b>${!todos.length ? 'Nenhum kit cadastrado ainda' : t.trim() ? `Nada encontrado para "${esc(t)}"` : 'Nenhum kit nesse filtro'}</b>
            <span>${!todos.length ? 'Junte peças que combinam e venda como presente. <a onclick="novoProduto(\'kit\')">Criar o primeiro kit</a>' : ''}</span></div>`;
        return;
    }
    box.innerHTML = lista.map(k => {
        const fotos = window.fotosDe(k), its = k.itens || [], preco = k.preco_venda || 0, sep = separadas(k), da = montaveis(k), prontos = est(k);
        // Kit sem foto própria: mosaico com as fotos das peças
        const mosaico = [...new Set(its.map(i => fotoPrincipal(produtoPorId(i.produto_id))).filter(Boolean))].slice(0, 4);
        const capa = fotos.length ? `<img src="${esc(fotos[0])}" alt="" loading="lazy" onerror="this.src='logo.png'">`
            : mosaico.length ? `<span class="kt-mosaico n${mosaico.length}">${mosaico.map(f => `<img src="${esc(f)}" alt="" loading="lazy" onerror="this.src='logo.png'">`).join('')}</span><span class="kt-semfoto">${window.ic('camera')} Sem foto do kit</span>`
            : `<span class="kt-semfoto so">${window.ic('camera')} Adicionar foto</span>`;
        return `<div class="kt-card ${k.ativo !== false ? '' : 'fora'}">
            <button type="button" class="kt-foto" onclick="tocarFotoProduto(${k.linha})" title="${fotos.length ? 'Ver as fotos' : 'Adicionar fotos'}">${capa}
                ${k.ativo === false ? '<span class="kt-selo">Inativo</span>' : prontos ? `<span class="kt-selo on">${prontos} pronto${prontos > 1 ? 's' : ''}</span>` : ''}
                ${fotos.length > 1 ? `<em class="kt-nfotos">${window.ic('imagem')}${fotos.length}</em>` : ''}</button>
            <div class="kt-corpo">
                <b class="kt-nome">${esc(k.modelo)}</b>
                <div class="kt-preco">${preco ? window.fmt(preco) : '<i>sem preço de venda</i>'}${sep > preco && preco ? ` <s>${window.fmt(sep)}</s>` : ''}</div>
                <div class="kt-itens">${its.map(i => { const p = produtoPorId(i.produto_id); return `<span class="kt-item"><img src="${esc(fotoPrincipal(p) || 'logo.png')}" alt="" loading="lazy" onerror="this.src='logo.png'"><b>${i.qtd}×</b> ${esc(nomeItem(i))}</span>`; }).join('')}</div>
                <div class="kt-estado ${prontos || da ? 'ok' : ''}">${prontos ? `<b>${prontos} pronto${prontos > 1 ? 's' : ''}</b> no Ateliê` : ''}${prontos && da ? ' · ' : ''}${da ? `dá para montar ${da}` : prontos ? '' : 'Faltam peças no Ateliê para montar'}</div>
            </div>
            <div class="kt-botoes dois">
                <button class="btn-magic btn-pequeno" onclick="montarKitAqui(${k.linha})" ${k.ativo === false ? 'disabled' : ''}>${window.ic('camadas')} Montar</button>
                <button class="btn-limpar" onclick="editarProduto(${k.linha})" title="Mudar as peças, o custo e os preços">${window.ic('calculadora')} Editar</button>
            </div></div>`;
    }).join('');
};

window.montarKitAqui = async function(id) {
    await window.carregarPainelEstoque();
    if (window.painelEstoque) window.abrirMontarKit(id);
};

// No celular abre o "Compartilhar" do aparelho (WhatsApp, Instagram…); no computador mostra as opções.
// Usado pelas Páginas de venda.
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
})();
