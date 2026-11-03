// ==========================================
// 🧭 AJUDA, TUTORIAIS, REGISTROS E NOVIDADES
// ==========================================
// Tutoriais: cada tarefa tem o passo a passo escrito e o botão "Mostrar na tela", que vai até a tela certa,
// escurece o resto e destaca onde tocar, um passo de cada vez.
// Registros: tudo o que foi feito no sistema (o servidor grava em "logs"), com busca e filtros.
// Novidades: o que mudou em cada versão; quando o site atualiza, aparece uma vez sozinho.
(() => {
const $ = window.$;
const esc = s => window.esc(s);
const ic = (n, c) => window.ic(n, c);
const vendedor = () => document.body.classList.contains('modo-vendedor');
const espera = ms => new Promise(r => setTimeout(r, ms));
const primeiro = () => (window.HV && window.HV.filtrados && window.HV.filtrados[0]) ? window.HV.filtrados[0].id : null;

// ==========================================
// 📘 GUIAS (o texto é o mesmo que aparece no tour)
// ==========================================
// Cada passo do tour: alvo (seletor ou lista de seletores; o primeiro visível vale), titulo, texto e antes() para
// ir até a tela certa. Sem alvo, o balão aparece no meio da tela.
const GUIAS = [
    { id: 'boasvindas', grupo: 'Comece aqui', icone: 'play', titulo: 'Tour rápido pelo sistema', desc: 'Um minuto para conhecer onde fica cada coisa.', tour: [
        { titulo: 'Bem-vindo ao Mini Mundo 3D!', texto: 'Vou te mostrar onde fica cada coisa. Toque em Próximo para seguir, ou em × para sair quando quiser.', antes: () => window.switchTab('dashboard_erp') },
        { alvo: ['#bottom-nav-admin', '#menu-abas'], titulo: 'Atalhos', texto: 'Aqui ficam as telas que você mais usa. No celular dá para escolher quais aparecem: Menu → Personalizar a barra de baixo.' },
        { alvo: ['#nav-menu_mobile', '#menu-abas .sb-grupo'], titulo: 'Menu', texto: 'No Menu estão todas as telas, separadas por assunto: Vender, Produção e estoque, Equipe e dinheiro, Site e extras e Sistema.' },
        { alvo: '#dash-chips', titulo: 'Início', texto: 'O Início mostra como está o negócio: quanto entrou, o lucro e o que precisa de atenção. Escolha o período aqui.' },
        { alvo: '#vendas-abas', titulo: 'Vendas', texto: 'Em Vendas você lança uma venda nova e vê o histórico, com o que falta receber.', antes: () => { window.switchTab('vendas'); window.abaVendas('nova'); } },
        { alvo: ['#nav-v-ajuda', '#btn-ajuda'], titulo: 'Sempre que tiver dúvida', texto: 'Volte em Ajuda e tutoriais. Cada tarefa tem o passo a passo e o botão "Mostrar na tela".', antes: () => window.switchTab('ajuda') }
    ] },
    // ---------- Vender ----------
    { id: 'venda', grupo: 'Vender', icone: 'carrinho', titulo: 'Lançar uma venda', desc: 'Escolher produtos, cliente, se já pagou e finalizar.', tour: [
        { alvo: '#pdv-busca-box', titulo: '1. Escolha o produto', texto: 'Toque na busca: abre a lista de produtos. Digite parte do nome para achar mais rápido, ou toque em "Ver todos" para ver com fotos. Cada toque põe 1 na venda.', antes: () => { window.switchTab('vendas'); window.abaVendas('nova'); } },
        { alvo: '#pdv-itens', titulo: 'Produtos escolhidos', texto: 'Eles aparecem aqui. Mude a quantidade no − e +, e o preço se der desconto em um item. O × tira o produto.' },
        { alvo: '#pdv-cliente', titulo: '2. Cliente', texto: 'Nome do cliente (se deixar vazio vira "Cliente avulso") e o WhatsApp, para mandar o recibo depois.' },
        { alvo: '#pdv-status', titulo: 'Já pagou?', texto: 'Pago, ou "Vai pagar depois". Se for depois, a venda fica em "A receber" até você marcar como paga.' },
        { alvo: '#pdv-canais', titulo: 'Onde vendeu e como pagou', texto: 'Escolha o canal (venda direta, Shopee, feira…) e a forma de pagamento. Canal com taxa já desconta do lucro.' },
        { alvo: '#pdv-finalizar', titulo: '3. Finalizar', texto: 'Confira o total e toque em Finalizar. As peças saem do Ateliê sozinhas e você pode mandar o recibo no WhatsApp na hora.' }
    ] },
    { id: 'receber', grupo: 'Vender', icone: 'check', titulo: 'Marcar venda como paga e cobrar', desc: 'Ver quem está devendo, cobrar e dar baixa no pagamento.', tour: [
        { alvo: '#hv-situacao', titulo: 'A receber', texto: 'No Histórico, toque em "A receber": aparecem todas as vendas que ainda não foram pagas, de qualquer data.', antes: () => { window.switchTab('vendas'); window.abaVendas('historico'); window.situacaoHV('pendente'); } },
        { alvo: ['#lista-vendas .vd-rapido', '#lista-vendas .vd'], titulo: 'Recebi', texto: 'O botão verde "Recebi" marca a venda como paga na hora.' },
        { alvo: '#lista-vendas .vd', titulo: 'Abrir a venda', texto: 'Tocando no cartão, a venda abre com tudo: cobrar no WhatsApp, PDF de cobrança, editar, cancelar e excluir.' }
    ] },
    { id: 'editarvenda', grupo: 'Vender', icone: 'lapis', titulo: 'Editar, cancelar ou excluir uma venda', desc: 'Mudar quantidade e produtos (o estoque acompanha), cancelar ou apagar.', tour: [
        { alvo: '#lista-vendas .vd', titulo: 'Abra a venda', texto: 'No Histórico, toque na venda que quer mudar.', antes: () => { window.switchTab('vendas'); window.abaVendas('historico'); window.situacaoHV('todas'); } },
        { alvo: '.vdet-acoes > .btn-magic', titulo: 'Paga ou a receber', texto: 'O botão grande muda a situação: marcar como paga, ou voltar para "a receber".', antes: () => { const id = primeiro(); if (id) window.abrirVenda(id); } },
        { alvo: '.vdet-grade .ac.azul', titulo: 'Editar produtos', texto: 'Muda a quantidade e o preço, tira ou põe produto. O estoque do Ateliê acompanha sozinho: se aumentar, sai mais peça; se tirar, a peça volta.' },
        { alvo: '.vdet-grade .ac.laranja', titulo: 'Cancelar venda', texto: 'A venda fica na lista como "Cancelada", sai das contas e as peças voltam para o Ateliê. Dá para reativar depois.' },
        { alvo: '.vdet-grade .ac.vermelho', titulo: 'Excluir', texto: 'Apaga de vez, sem volta. Use só para venda lançada por engano.', depois: () => window.fecharModalMM() }
    ] },
    { id: 'pedidosite', grupo: 'Vender', icone: 'recibo', titulo: 'Atender um pedido do site', desc: 'Do pedido novo até lançar como venda.', tour: [
        { alvo: '#pc-filtros', titulo: 'Pedidos', texto: 'Pedido feito na sua página de venda chega aqui, com um número vermelho no menu. Os filtros separam por etapa.', antes: () => window.switchTab('pedidos') },
        { alvo: ['#lista-pedidos .pc-card', '#lista-pedidos'], titulo: 'Abrir o pedido', texto: 'Toque no pedido para mudar a etapa (confirmado, em produção, pronto, entregue). O cliente acompanha pelo link e recebe aviso no celular.' },
        { titulo: 'Lançar como venda', texto: 'Quando entregar, abra o pedido e toque em "Lançar como venda". Escolha "Vai pagar depois" se o cliente ainda não pagou: ele aparece em "A receber".' }
    ] },
    // ---------- Produção e estoque ----------
    { id: 'produto', grupo: 'Produção e estoque', icone: 'calculadora', titulo: 'Cadastrar um produto e calcular o preço', desc: 'Custo da impressão, preço de venda e de repasse.', tour: [
        { alvo: '#pf-nome', titulo: 'Nome e foto', texto: 'Em Precificar, comece pelo nome e pela foto do produto.', antes: () => window.switchTab('precificar') },
        { alvo: '#pf-peso', titulo: 'Peso e tempo', texto: 'Coloque o peso (g) e o tempo de impressão. O sistema calcula o custo com a energia, a máquina e a sua hora.' },
        { alvo: '#pf-salvar', titulo: 'Cadastrar', texto: 'Confira os preços sugeridos (venda e repasse para vendedor) e toque em Cadastrar. O produto passa a aparecer em Vendas e Estoque.' }
    ] },
    { id: 'tamanho', grupo: 'Produção e estoque', icone: 'regua', titulo: 'Colocar o tamanho do produto (régua)', desc: 'Largura, comprimento e altura numa régua, no painel e no site.', tour: [
        { alvo: '#pf-largura', titulo: 'Medidas em centímetros', texto: 'No Precificar, no cartão Tamanho, coloque a largura, o comprimento e a altura em cm. Pode usar vírgula: 12,5.', antes: () => window.switchTab('precificar') },
        { alvo: '#pf-regua', titulo: 'A régua', texto: 'A régua aparece na hora, proporcional ao produto. Depois de salvar, o cliente vê a mesma régua na página de venda, no botão "ver tamanho".' },
        { alvo: ['.med-chip', '#lista-produtos'], titulo: 'Nas listas', texto: 'Em Produtos e no Estoque o tamanho aparece ao lado do produto: toque nele para ver a régua grande. Para mudar as medidas de um produto já cadastrado, toque no produto e use os campos de Tamanho.', antes: () => window.switchTab('modelos') }
    ] },
    { id: 'producao', grupo: 'Produção e estoque', icone: 'impressora', titulo: 'Registrar o que foi impresso', desc: 'Peças prontas entram no estoque do Ateliê.', tour: [
        { alvo: '.barra-acoes-v7 .btn-global', titulo: 'Registrar produção', texto: 'Saiu da impressora? Toque aqui, escolha o produto e a quantidade. As peças entram no Ateliê.', antes: () => window.switchTab('estoque') },
        { alvo: '.est-card .btn-ic.verde', titulo: 'Atalho no produto', texto: 'O + verde em cada produto faz a mesma coisa, já com o produto escolhido.' }
    ] },
    { id: 'ondeesta', grupo: 'Produção e estoque', icone: 'arquivo', titulo: 'Ver onde está cada peça', desc: 'Quantas no Ateliê e com cada vendedor.', tour: [
        { alvo: '.est-onde', titulo: 'Onde está', texto: 'Cada produto mostra quantas estão no Ateliê e com cada vendedor (a bolinha com a inicial). Toque no nome do vendedor para abrir o controle dele.', antes: () => { window.switchTab('estoque'); window.estoqueVisao('produto'); } },
        { alvo: '#estoque-visao', titulo: 'Por produto ou por vendedor', texto: '"Por vendedor" lista o que está com cada um, com o valor em repasse e o que falta acertar.' },
        { alvo: '#estoque-onde', titulo: 'Filtrar por lugar', texto: 'Mostra só o que está no Ateliê, só com vendedores, ou com uma pessoa.' }
    ] },
    { id: 'kit', grupo: 'Produção e estoque', icone: 'camadas', titulo: 'Montar um kit', desc: 'Juntar as peças do Ateliê num kit pronto.', tour: [
        { alvo: '.acoes-sec button:nth-child(2)', titulo: 'Montar kit', texto: 'Escolha o kit e quantos montar. As peças saem do Ateliê e o kit pronto entra. Para criar um kit novo, use Precificar → Kit.', antes: () => window.switchTab('estoque') }
    ] },
    // ---------- Vendedores ----------
    { id: 'vendedor', grupo: 'Vendedores', icone: 'usuarios', titulo: 'Cadastrar um vendedor', desc: 'Criar o acesso e mandar pelo WhatsApp.', tour: [
        { alvo: '#vd-lista-box .pl-topo .btn-magic', titulo: 'Novo vendedor', texto: 'Toque aqui, coloque o nome de usuário, uma senha e o WhatsApp. Depois o sistema monta a mensagem com o acesso.', antes: () => window.switchTab('vendedores') }
    ] },
    { id: 'mala', grupo: 'Vendedores', icone: 'mala', titulo: 'Enviar peças para o vendedor', desc: 'Consignado: as peças passam do Ateliê para ele(a).', tour: [
        { alvo: ['.vc-acoes .btn-limpar', '#vd-lista-box .pl-topo'], titulo: 'Enviar peças', texto: 'No cartão do vendedor, toque em Enviar peças. Marque as quantidades de cada produto e confirme. Dá para mandar a lista no WhatsApp.', antes: () => window.switchTab('vendedores') }
    ] },
    { id: 'acerto', grupo: 'Vendedores', icone: 'dinheiro', titulo: 'Ver as vendas do vendedor e receber o acerto', desc: 'Controle item a item do que falta acertar.', tour: [
        { alvo: ['.vend-card', '#lista-vendedores'], titulo: 'Abrir o controle', texto: 'Toque no vendedor. Abre o controle completo dele(a).', antes: () => window.switchTab('vendedores') },
        { alvo: '.cv-nums', titulo: 'Resumo', texto: 'Quanto recebeu, vendeu, devolveu e quantas peças estão com ele(a) agora.', antes: async () => { const v = (window.painelEstoque && window.painelEstoque.vendedores || [])[0]; if (v) { await window.abrirVendedor(v.id, 'vendas'); } } },
        { alvo: '.cv-acerto', titulo: 'Falta acertar', texto: 'Quanto ele(a) te deve das vendas que fez. Fica verde quando está tudo acertado.' },
        { alvo: '#cv-abas', titulo: 'As abas', texto: 'Vendas (item a item, acertado ou não), Com ele(a) (as peças), Por produto, Acertos e Dados.' },
        { alvo: ['#cv-receber', '#cv-corpo'], titulo: 'Receber', texto: 'Em Vendas → Falta acertar, marque o que recebeu, escolha como pagou e toque em "Recebi o valor selecionado".' }
    ] },
    // ---------- Divulgar ----------
    { id: 'pagina', grupo: 'Divulgar', icone: 'megafone', titulo: 'Criar uma página de venda', desc: 'Uma loja para cada data, com pedido pelo site.', tour: [
        { alvo: '.pg-topo-bt .btn-magic', titulo: 'Nova página', texto: 'Escolha o tema (Natal, Dia das Mães…) e o título. Depois adicione os produtos.', antes: () => window.switchTab('paginas') },
        { alvo: ['.pg-card .pg-botoes .btn-magic', '#pg-lista'], titulo: 'Divulgar', texto: 'Cria os posts prontos (story, feed, carrossel, enquete e vídeo) com a legenda e o link.' },
        { alvo: ['.pg-botoes-sec', '#pg-lista'], titulo: 'Editar e mais', texto: 'Editar abre as abas Produtos, Aparência e Divulgar. Em Mais: mandar mensagem, copiar link, pausar e excluir.' }
    ] },
    // ---------- Sistema ----------
    { id: 'registros', grupo: 'Sistema', icone: 'historico', titulo: 'Ver tudo o que foi feito (Registros)', desc: 'Quem fez o quê e quando.', tour: [
        { alvo: '#rg-filtros', titulo: 'Registros', texto: 'Tudo o que é feito no sistema fica anotado: vendas, estoque, acertos, acessos. Filtre por assunto aqui.', antes: () => window.switchTab('registros') },
        { alvo: '#rg-busca', titulo: 'Buscar', texto: 'Procure por cliente, produto, vendedor ou número da venda.' }
    ] },
    { id: 'barra', grupo: 'Sistema', icone: 'grade', titulo: 'Personalizar a barra de baixo', desc: 'Escolher os atalhos do celular.', tour: [
        { alvo: '.menu-personalizar', titulo: 'Personalizar', texto: 'Toque aqui para escolher até 5 atalhos e a ordem deles. Fica guardado neste celular.', antes: () => window.switchTab('menu_mobile') }
    ] },
    { id: 'instalar', grupo: 'Sistema', icone: 'imagem', titulo: 'Instalar o app no celular', desc: 'Ícone na tela inicial, como um aplicativo.', passos: [
        'Android (Chrome): abra o site, toque nos três pontinhos ⋮ e em "Instalar app" (ou "Adicionar à tela inicial").',
        'iPhone (Safari): toque no botão de compartilhar (quadrado com seta) e em "Adicionar à Tela de Início".',
        'Depois de uma atualização grande, se algo ficar estranho, feche o app e abra de novo.'
    ] },
    { id: 'voltar', grupo: 'Sistema', icone: 'voltar', titulo: 'Botão voltar do celular', desc: 'Agora ele volta de tela, não fecha o app.', passos: [
        'Com uma janela aberta, o voltar fecha a janela.',
        'Dentro do controle de um vendedor ou do editor de uma página, o voltar volta para a lista.',
        'Nas outras telas, volta para a anterior e depois para o Início. No Início, ele avisa "Toque de novo para sair".'
    ] }
];
const GUIAS_VENDEDOR = [
    { id: 'v-tour', grupo: 'Comece aqui', icone: 'play', titulo: 'Tour rápido do seu painel', desc: 'Onde ver suas peças, registrar venda e o acerto.', tour: [
        { alvo: '#v-lista-estoque', titulo: 'Suas peças', texto: 'Estas são as peças que estão com você agora.', antes: () => window.switchTab('v_estoque') },
        { alvo: ['.btn-vendi', '#v-lista-estoque'], titulo: 'Vendi', texto: 'Vendeu? Toque em "Vendi" na peça e diga quantas. O valor do repasse entra no seu acerto.' },
        { alvo: '#v-acerto', titulo: 'Meu acerto', texto: 'Aqui está quanto você deve repassar e o que já foi pago.', antes: () => window.switchTab('v_acerto') },
        { alvo: '#tab-v_encomendas .card', titulo: 'Encomendas', texto: 'Cliente quer uma peça que você não tem? Peça aqui para a fábrica.', antes: () => window.switchTab('v_encomendas') }
    ] },
    { id: 'v-vendi', grupo: 'No dia a dia', icone: 'check', titulo: 'Registrar uma venda', desc: 'Dar baixa na peça vendida.', passos: ['Em Meu estoque, ache a peça (pode buscar pelo nome).', 'Toque em "Vendi", escolha quantas e confirme.', 'Errou? Em Meu acerto dá para cancelar em até 48 horas.'] },
    { id: 'v-acerto', grupo: 'No dia a dia', icone: 'dinheiro', titulo: 'Pagar o acerto', desc: 'Repassar o valor das vendas.', passos: ['Em Meu acerto você vê o total e cada venda.', 'Faça o pagamento e toque em "Avisar que paguei" para mandar a lista no WhatsApp.', 'Quando a Mini Mundo confirmar, as vendas passam para "Acertos feitos".'] },
    { id: 'v-vitrine', grupo: 'No dia a dia', icone: 'link', titulo: 'Mandar sua vitrine para clientes', desc: 'Link com as peças que estão com você.', passos: ['Em Meu estoque, no fim da página, toque em "Copiar link" da sua vitrine.', 'Mande para os clientes: eles veem as fotos e falam com você no WhatsApp.'] }
];
const guias = () => vendedor() ? GUIAS_VENDEDOR : GUIAS;

// ---------- Tela de ajuda ----------
window.AJ = { busca: '', aberto: null };
window.renderizarAjuda = function() {
    const box = $('aj-conteudo'); if (!box) return;
    box.innerHTML = `
        <div class="aj-hero">
            <span class="aj-hero-ic">${ic('ajuda')}</span>
            <div><b>Primeira vez por aqui?</b><small>O tour mostra, na tela, onde fica cada coisa. Leva um minuto.</small></div>
            <button class="btn-magic" onclick="iniciarTour('${vendedor() ? 'v-tour' : 'boasvindas'}')">${ic('play')} Começar o tour</button>
        </div>
        <div class="busca-ic aj-busca">${ic('busca')}<input type="search" id="aj-busca" placeholder="O que você quer fazer? Ex.: cancelar venda" value="${esc(window.AJ.busca)}" oninput="AJ.busca = this.value; renderizarAjudaLista()" autocomplete="off"></div>
        <div id="aj-lista"></div>
        ${vendedor() ? '' : `<button class="btn-limpar aj-novidades" onclick="switchTab('novidades')">${ic('presente')} Ver as novidades da versão ${esc(window.VERSAO_APP_MM)}</button>`}`;
    window.renderizarAjudaLista();
};
window.renderizarAjudaLista = function() {
    const box = $('aj-lista'); if (!box) return;
    const lista = guias().filter(g => window.buscaBate(window.AJ.busca, g.titulo, g.desc, g.grupo, ...(g.tour || []).map(s => s.titulo + ' ' + s.texto), ...(g.passos || [])));
    if (!lista.length) { box.innerHTML = `<div class="vazio-box">${ic('busca')}<b>Nada encontrado</b><span>Tente outras palavras, como "venda", "estoque" ou "acerto".</span></div>`; return; }
    const grupos = [...new Set(lista.map(g => g.grupo))];
    box.innerHTML = grupos.map(gr => `<div class="secao-tit">${esc(gr)}</div><div class="aj-grade">${lista.filter(g => g.grupo === gr).map(g => {
        const aberto = window.AJ.aberto === g.id, passos = g.passos || (g.tour || []).map(s => `<b>${esc(s.titulo)}:</b> ${esc(s.texto)}`);
        return `<div class="aj-card ${aberto ? 'aberto' : ''}">
            <button type="button" class="aj-cab" onclick="AJ.aberto = AJ.aberto === '${g.id}' ? null : '${g.id}'; renderizarAjudaLista()" aria-expanded="${aberto}">
                <span class="aj-ic">${ic(g.icone)}</span><span class="aj-txt"><b>${esc(g.titulo)}</b><small>${esc(g.desc)}</small></span>${ic('seta-dir', 'aj-seta')}</button>
            ${aberto ? `<div class="aj-corpo"><ol>${passos.map(p => `<li>${g.passos ? esc(p) : p}</li>`).join('')}</ol>
                ${g.tour ? `<button class="btn-magic btn-azul" onclick="iniciarTour('${g.id}')">${ic('play')} Mostrar na tela</button>` : ''}</div>` : ''}
        </div>`; }).join('')}</div>`).join('');
};

// ---------- Tour (destaca na tela) ----------
let TOUR = null;
const visivel = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
const acharAlvo = alvo => { for (const s of [].concat(alvo || [])) { const el = [...document.querySelectorAll(s)].find(visivel); if (el) return el; } return null; };
window.iniciarTour = function(id) {
    const g = [...GUIAS, ...GUIAS_VENDEDOR].find(x => x.id === id); if (!g || !g.tour) return;
    window.fecharTour(true);
    if (window.$('modal-mm').style.display === 'flex') window.fecharModalMM();
    TOUR = { g, i: 0 };
    const fundo = document.createElement('div'); fundo.className = 'tour-fundo';
    fundo.innerHTML = `<i class="tour-dim"></i><i class="tour-dim"></i><i class="tour-dim"></i><i class="tour-dim"></i><div class="tour-spot"></div><div class="tour-card" role="dialog" aria-modal="true" aria-live="polite"></div>`;
    document.body.appendChild(fundo); TOUR.el = fundo;
    window.addEventListener('resize', posicionar);
    mostrarPasso();
};
window.fecharTour = function(silencioso) {
    if (!TOUR) return;
    const s = TOUR.g.tour[TOUR.i];
    if (TOUR.el) TOUR.el.remove();
    window.removeEventListener('resize', posicionar);
    const fim = TOUR.i >= TOUR.g.tour.length - 1;
    TOUR = null;
    if (s && s.depois) s.depois();
    try { localStorage.setItem('mm_tour_visto', '1'); } catch (e) { /* sem armazenamento */ }
    if (!silencioso && fim) window.toastMM('Tour concluído');
};
async function mostrarPasso() {
    const T = TOUR; if (!T) return;
    const s = T.g.tour[T.i], card = T.el.querySelector('.tour-card');
    card.innerHTML = '<p class="tour-carregando">…</p>';
    T.el.classList.add('trocando');
    if (s.antes) { try { await s.antes(); } catch (e) { /* segue mesmo assim */ } }
    await espera(s.antes ? 380 : 60);
    if (TOUR !== T) return;
    T.alvo = acharAlvo(s.alvo);
    if (T.alvo) { T.alvo.scrollIntoView({ block: 'center' }); await espera(80); }
    const n = T.g.tour.length, falta = s.alvo && !T.alvo;
    card.innerHTML = `<div class="tour-topo"><span class="tour-passo">${T.g.titulo} · ${T.i + 1} de ${n}</span><button type="button" class="tour-x" onclick="fecharTour()" aria-label="Sair do tour">${ic('x')}</button></div>
        <h4>${esc(s.titulo)}</h4><p>${esc(s.texto)}${falta ? '<br><small class="tour-falta">(Esta parte aparece quando já tiver algo cadastrado aqui.)</small>' : ''}</p>
        <div class="tour-bts">${T.i ? `<button type="button" class="btn-limpar" onclick="passoTour(-1)">${ic('voltar')} Voltar</button>` : '<span></span>'}
            <button type="button" class="btn-magic" onclick="passoTour(1)">${T.i === n - 1 ? `${ic('check')} Concluir` : `Próximo ${ic('seta-dir')}`}</button></div>`;
    T.el.classList.remove('trocando');
    posicionar();
    card.querySelector('.btn-magic').focus({ preventScroll: true });
}
function posicionar() {
    const T = TOUR; if (!T) return;
    const spot = T.el.querySelector('.tour-spot'), card = T.el.querySelector('.tour-card');
    // Quatro painéis escuros em volta do que está em destaque (funciona em qualquer celular)
    const dims = [...T.el.querySelectorAll('.tour-dim')], w = window.innerWidth, h = window.innerHeight;
    const caixa = (el, t, l, lg, al) => Object.assign(el.style, { top: `${t}px`, left: `${l}px`, width: `${Math.max(0, lg)}px`, height: `${Math.max(0, al)}px` });
    if (!T.alvo || !visivel(T.alvo)) { spot.classList.add('sem'); card.classList.add('meio'); card.style.top = ''; card.style.bottom = ''; caixa(dims[0], 0, 0, w, h); dims.slice(1).forEach(d => caixa(d, 0, 0, 0, 0)); return; }
    const r = T.alvo.getBoundingClientRect(), m = 6;
    const t = Math.max(0, r.top - m), b = Math.min(h, r.bottom + m), l = Math.max(0, r.left - m), d = Math.min(w, r.right + m);
    caixa(dims[0], 0, 0, w, t); caixa(dims[1], b, 0, w, h - b); caixa(dims[2], t, 0, l, b - t); caixa(dims[3], t, d, w - d, b - t);
    spot.classList.remove('sem'); card.classList.remove('meio');
    Object.assign(spot.style, { top: `${t}px`, left: `${l}px`, width: `${d - l}px`, height: `${b - t}px` });
    // Balão do lado que tem mais espaço (em cima ou embaixo do destaque)
    const embaixo = h - r.bottom > r.top;
    card.style.top = embaixo ? `${Math.min(h - card.offsetHeight - 10, r.bottom + 14)}px` : '';
    card.style.bottom = embaixo ? '' : `${Math.min(h - card.offsetHeight - 10, h - r.top + 14)}px`;
}
window.passoTour = function(d) {
    const T = TOUR; if (!T) return;
    const s = T.g.tour[T.i];
    if (d > 0 && T.i === T.g.tour.length - 1) return window.fecharTour();
    if (s.depois && d > 0) s.depois();
    T.i = Math.max(0, Math.min(T.g.tour.length - 1, T.i + d));
    mostrarPasso();
};
document.addEventListener('keydown', e => {
    if (!TOUR) return;
    if (e.key === 'Escape') { e.stopPropagation(); window.fecharTour(); }
    else if (e.key === 'ArrowRight') window.passoTour(1);
    else if (e.key === 'ArrowLeft') window.passoTour(-1);
}, true);

// ==========================================
// 📜 REGISTROS (tudo o que foi feito no sistema)
// ==========================================
// Assunto de cada registro pelo código da ação gravada no servidor
const ASSUNTOS = {
    vendas: ['carrinho', 'Vendas', ['NOVA_VENDA', 'EDITOU_VENDA', 'STATUS_VENDA', 'EDITOU_PEDIDO', 'CANCELOU_VENDA', 'REATIVOU_VENDA']],
    pedidos: ['recibo', 'Pedidos', ['PEDIDO_SITE', 'NOVO_PEDIDO_CLIENTE', 'EDITOU_PEDIDO_CLIENTE', 'STATUS_PEDIDO_CLIENTE', 'APAGOU_RECADO', 'EXCLUIU_PEDIDO_CLIENTE']],
    estoque: ['arquivo', 'Estoque', ['PRODUCAO', 'CONFERENCIA', 'MONTOU_KIT', 'DESMONTOU_KIT', 'ENVIOU_MALA', 'RECOLHEU']],
    vendedores: ['usuarios', 'Vendedores', ['BAIXA', 'CANCELOU_BAIXA', 'ACERTO', 'DESFEZ_ACERTO', 'NOVO_VENDEDOR', 'EDITOU_VENDEDOR', 'REPASSE_ESPECIAL', 'ENCOMENDA', 'NOVA_ENCOMENDA']],
    produtos: ['pacote', 'Produtos', ['NOVO_MODELO', 'EDITOU_MODELO', 'FOTO_MODELO', 'NOVO_KIT', 'EDITOU_KIT', 'NOMES_KIT', 'NOVO_PRODUTO_LOJA', 'EDITOU_PRODUTO_LOJA', 'NOVA_DESPESA']],
    paginas: ['megafone', 'Páginas', ['NOVA_PAGINA', 'EDITOU_PAGINA', 'EXCLUIU_PAGINA']],
    acessos: ['escudo', 'Acessos e ajustes', ['ENTROU', 'LOGIN_FALHOU', 'ALTEROU_SENHA', 'RESETOU_SENHA', 'NOVO_USUARIO', 'EDITOU_USUARIO', 'EXCLUIU_USUARIO', 'ENCERROU_SESSOES', 'CONFIG', 'CHAVE']]
};
const assuntoDe = l => {
    const a = String(l.acao || '');
    for (const [k, [, , acoes]] of Object.entries(ASSUNTOS)) if (acoes.includes(a)) return k;
    if (a === 'EXCLUIU') return /venda|pedido|Vendas/i.test(l.detalhe || '') ? 'vendas' : 'produtos';
    return 'outros';
};
const COR = { vendas: 'verde', pedidos: 'azul', estoque: 'laranja', vendedores: 'roxo', produtos: '', paginas: 'rosa', acessos: 'cinza', outros: 'cinza' };
const semEmoji = s => String(s || '').replace(/^[^\p{L}\p{N}#(]+/u, '');
window.RG = { logs: [], mais: false, filtro: 'todos', carregando: false };
window.carregarRegistros = async function(mais) {
    const R = window.RG; if (R.carregando) return;
    R.carregando = true;
    if (!mais) $('rg-lista').innerHTML = '<div class="carregando-box"><span class="girando"></span>Carregando os registros…</div>';
    try {
        const r = await window.apiAcao('listar_logs', { limite: 400, antes_de: mais && R.logs.length ? R.logs[R.logs.length - 1].id : 0 });
        R.logs = mais ? R.logs.concat(r.logs) : r.logs; R.mais = r.mais !== false && r.logs.length >= 400;
        window.renderizarRegistros();
    } catch (e) { $('rg-lista').innerHTML = `<div class="vazio-box">${ic('alerta')}<b>Não consegui carregar</b><span>${esc(e.message)}</span></div>`; }
    finally { R.carregando = false; }
};
window.filtroRegistros = function(f) { window.RG.filtro = f; window.renderizarRegistros(); };
window.renderizarRegistros = function() {
    const R = window.RG; if (!$('rg-lista')) return;
    const sel = $('rg-usuario'), atual = sel.value, usuarios = [...new Set(R.logs.map(l => l.usuario).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    sel.innerHTML = '<option value="">Todas as pessoas</option>' + usuarios.map(u => `<option ${u === atual ? 'selected' : ''}>${esc(u)}</option>`).join('');
    const t = $('rg-busca').value, quem = sel.value;
    const base = R.logs.filter(l => (!quem || l.usuario === quem) && window.buscaBate(t, l.detalhe, l.usuario, l.acao));
    const conta = {}; base.forEach(l => { const k = assuntoDe(l); conta[k] = (conta[k] || 0) + 1; });
    $('rg-filtros').innerHTML = [['todos', 'Tudo', base.length], ...Object.entries(ASSUNTOS).map(([k, [, r]]) => [k, r, conta[k] || 0]), ['outros', 'Outros', conta.outros || 0]]
        .filter(([k, , n]) => k === 'todos' || n || R.filtro === k)
        .map(([k, r, n]) => `<button class="chip-op ${R.filtro === k ? 'active' : ''}" onclick="filtroRegistros('${k}')">${r} <em>${n || ''}</em></button>`).join('');
    const lista = base.filter(l => R.filtro === 'todos' || assuntoDe(l) === R.filtro);
    if (!lista.length) { $('rg-lista').innerHTML = `<div class="vazio-box">${ic('historico')}<b>Nenhum registro aqui</b><span>${R.logs.length ? 'Tente outra busca ou outro assunto.' : 'Quando alguém fizer algo no sistema, aparece aqui.'}</span></div>`; return; }
    const hoje = window.isoHojeMM(), ontem = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
    const nomeDia = iso => iso === hoje ? 'Hoje' : iso === ontem ? 'Ontem' : (() => { const d = new Date(iso + 'T12:00:00'); const s = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined }); return s.charAt(0).toUpperCase() + s.slice(1); })();
    let h = '', dia = '';
    lista.forEach(l => {
        const iso = String(l.data_hora || '').slice(0, 10), k = assuntoDe(l), [icone, rotulo] = ASSUNTOS[k] || ['historico', 'Outros'];
        if (iso !== dia) { dia = iso; h += `<div class="dia-cab"><span>${esc(nomeDia(iso))}</span></div>`; }
        const ruim = l.acao === 'LOGIN_FALHOU' || /^EXCLU|CANCELOU|DESFEZ/.test(l.acao);
        h += `<div class="rg-linha ${ruim ? 'ruim' : ''}"><span class="rg-ic ${COR[k]}">${ic(icone)}</span>
            <div class="rg-txt"><b>${esc(semEmoji(l.detalhe) || l.acao)}</b><small>${esc(String(l.data_hora || '').slice(11, 16))} · ${esc(l.usuario || '—')} · ${esc(rotulo)}</small></div></div>`;
    });
    if (R.mais) h += `<button class="btn-mais" onclick="carregarRegistros(true)">Carregar registros mais antigos</button>`;
    $('rg-lista').innerHTML = h;
};

// ==========================================
// 🎁 NOVIDADES (o que mudou em cada versão)
// ==========================================
const NOVIDADES = [
    { v: 'v7.1', data: '03/11/2026', titulo: 'Tamanho dos produtos na régua', itens: [
        'Novo cartão "Tamanho" no Precificar e na edição do produto: largura, comprimento e altura em centímetros (opcional).',
        'Com as medidas, aparece uma régua: o produto desenhado em 3D, do tamanho proporcional, com uma fita métrica em cada lado.',
        'Em Produtos, no Estoque e no painel dos vendedores o tamanho aparece ao lado do produto. Toque nele para ver a régua grande.',
        'Na página de venda o cliente vê o botão "ver tamanho", com a régua e uma comparação para ter ideia (ex.: um cartão de crédito tem 8,6 cm). Nos kits, cada peça mostra o seu tamanho.'
    ] },
    { v: 'v7.0', data: '03/11/2026', titulo: 'Visual novo e mais controle', itens: [
        'Visual do sistema todo reorganizado: botões com cores que dizem o que fazem (verde = pagar/confirmar, laranja = a receber, vermelho = excluir, azul = editar) e menos coisa repetida.',
        'Vendas: os produtos agora ficam numa lista que abre ao tocar na busca, e o Histórico separa Todas, A receber, Pagas e Canceladas.',
        'Na venda: marcar como paga ou a receber, editar produtos e quantidades, cancelar (as peças voltam para o Ateliê), reativar e excluir. O estoque acompanha em tudo.',
        'Vendedores: controle completo de cada um, com as vendas item a item (acertado ou não), as peças com ele(a), o resumo por produto e os acertos.',
        'Estoque: cada produto mostra com qual vendedor está, e tem a visão "Por vendedor".',
        'Páginas de venda: cartões mais limpos e o editor em abas (Produtos, Aparência, Divulgar).',
        'Botão voltar do celular: agora volta de tela em vez de fechar o app.',
        'Telas novas: Registros (tudo o que foi feito, por quem e quando), Novidades e Ajuda com tutoriais que mostram na tela onde tocar.',
        'Corrigido: no Histórico de Vendas, tocar numa venda ou em Excluir podia abrir ou apagar o pedido do site com o mesmo número.'
    ] },
    { v: 'v6.0', data: '03/11/2026', titulo: 'Divulgar nas redes', itens: [
        'Barra de baixo do celular personalizável.', 'Listas de escolha com foto e busca.', '"Lançar como venda" com a opção "Vai pagar depois" e o filtro "A receber" em Pedidos.',
        'Posts prontos para Story, Feed, Carrossel, Enquete e Vídeo, com legenda e link.', '"De onde vieram": quantos clientes chegaram pelo Instagram, WhatsApp ou Facebook.'
    ] },
    { v: 'v5.9', data: '02/11/2026', titulo: 'Pedidos com fotos', itens: ['Pedidos com fotos e os mesmos nomes do site.', 'O cliente acompanha o pedido e recebe aviso no celular quando a etapa muda.', 'Chave Pix no acompanhamento do pedido.'] },
    { v: 'v5.8', data: '02/11/2026', titulo: 'Pedidos pelo site', itens: ['O cliente faz o pedido direto na página de venda.', 'Tela Pedidos, onde também dá para anotar pedidos à mão.', 'Link da página no seu domínio, sem perder os links antigos.'] },
    { v: 'v5.7', data: '02/11/2026', titulo: 'Páginas de venda', itens: ['Uma página por tema (Natal, Dia das Mães…) com kits e peças, nome e preço próprios.', 'Tela Kits com fotos.'] },
    { v: 'v5.5', data: '02/11/2026', titulo: 'Kits mais práticos', itens: ['Montar kit com lista de fotos, busca e filtros.', 'Preço do kit comparado com as peças separadas.'] },
    { v: 'v5.4', data: '02/11/2026', titulo: 'Usuários e acessos', itens: ['Tela Usuários: criar Admins e vendedores, trocar senha, desconectar aparelhos.'] },
    { v: 'v5.3', data: '01/11/2026', titulo: 'Várias fotos por produto', itens: ['Até 12 fotos por produto, com galeria em tela cheia.', 'App no celular sem zoom e ocupando a tela toda.'] },
    { v: 'v5.2', data: '01/11/2026', titulo: 'Edição rápida', itens: ['Editar nome, categoria e preços sem refazer o cálculo.', 'Busca de produto igual em todas as telas.'] },
    { v: 'v5.1', data: '01/11/2026', titulo: 'Fotos sem perder o que digitou', itens: ['Trocar só a foto de um produto.', 'O que você digita no Precificar fica guardado se a câmera recarregar a página.'] },
    { v: 'v5.0', data: '30/10/2026', titulo: 'Sistema novo', itens: ['Kits, venda com vários produtos, chaves guardadas no servidor e IA pelo servidor.'] }
];
const versaoCurta = () => String(window.VERSAO_APP_MM || '').replace(/^(v\d+\.\d+).*/, '$1');
window.renderizarNovidades = function() {
    const box = $('nv-lista'); if (!box) return;
    box.innerHTML = NOVIDADES.map((n, i) => `<div class="card nv-card ${i === 0 ? 'atual' : ''}">
        <div class="nv-cab"><span class="nv-versao">${esc(n.v)}</span><div><b>${esc(n.titulo)}</b><small>${esc(n.data)}${n.v === versaoCurta() ? ' · versão em uso' : ''}</small></div></div>
        <ul>${n.itens.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`).join('');
    try { localStorage.setItem('mm_versao_vista', versaoCurta()); } catch (e) { /* sem armazenamento */ }
    document.querySelectorAll('[data-aviso-novidades]').forEach(b => { b.hidden = true; });
};
// Depois de entrar: na primeira vez oferece o tour; quando a versão muda, mostra as novidades uma vez
window.boasVindasMM = function() {
    if (vendedor() && document.body.classList.contains('vendo-como')) return;
    let viuTour = '1', viuVersao = versaoCurta();
    try { viuTour = localStorage.getItem('mm_tour_visto'); viuVersao = localStorage.getItem('mm_versao_vista'); } catch (e) { return; }
    const nova = viuVersao !== versaoCurta();
    document.querySelectorAll('[data-aviso-novidades]').forEach(b => { b.hidden = !nova; });
    setTimeout(() => {
        if (document.querySelector('.modal-overlay[style*="flex"], .modal-overlay-alert[style*="flex"], .tour-fundo')) return;
        if (!viuTour) {
            window.abrirModalMM(`<div class="mm-sucesso"><span class="modal-icon-alert ok">${ic('ajuda')}</span>
                <h3 class="modal-title-alert">Bem-vindo${vendedor() ? '(a)' : ''}!</h3>
                <p class="modal-text-alert">Quer que eu mostre, na tela, onde fica cada coisa? Leva um minuto.</p>
                <button class="btn-magic" onclick="fecharModalMM(); iniciarTour('${vendedor() ? 'v-tour' : 'boasvindas'}')">${ic('play')} Começar o tour</button>
                <button class="btn-modal-cancel" style="width:100%;margin-top:10px;" onclick="fecharModalMM(); try { localStorage.setItem('mm_tour_visto', '1'); localStorage.setItem('mm_versao_vista', '${versaoCurta()}'); } catch (e) {}">Agora não</button></div>`);
        } else if (nova && !vendedor()) {
            const n = NOVIDADES[0];
            window.abrirModalMM(`<h3 class="modal-title">${ic('presente')} Novidades da ${esc(n.v)}</h3>
                <p class="texto-ajuda" style="margin-top:0;"><b>${esc(n.titulo)}</b></p>
                <ul class="nv-lista-modal">${n.itens.slice(0, 6).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
                <button class="btn-magic" onclick="fecharModalMM(); switchTab('novidades')">${ic('presente')} Ver tudo o que mudou</button>
                <button class="btn-modal-cancel" style="width:100%;margin-top:10px;" onclick="fecharModalMM(); renderizarNovidades()">Entendi</button>`);
        }
    }, 900);
};
})();
