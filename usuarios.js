// ==========================================
// 👥 USUÁRIOS E ACESSOS (Admins e vendedores)
// ==========================================
// Criar, editar, trocar o tipo de acesso, ativar/desativar, definir senha, desconectar aparelhos e excluir.
// O servidor guarda as regras (sempre fica um Admin ativo, ninguém tira o próprio acesso, vendedor com
// peças ou repasse a receber não sai); aqui só mostramos e explicamos.
(() => {
const $ = window.$;
const esc = s => window.esc(s);
window.US = { lista: [], filtro: 'todos' };
const porId = id => US.lista.find(u => u.id === id);
const CARGO = {
    Admin: { nome: 'Admin', desc: 'Acesso completo: vendas, estoque, custos, ajustes e usuários.' },
    Vendedor: { nome: 'Vendedor', desc: 'Vê só as peças que estão com ele, dá baixa nas vendas e acompanha o acerto.' }
};
const minimo = cargo => cargo === 'Admin' ? 6 : 4;

// Senha fácil de ditar: sem letras parecidas (0/O, 1/l)
window.gerarSenhaMM = function(tam = 6) {
    const letras = 'abcdefghjkmnpqrstuvwxyz23456789', v = new Uint32Array(tam);
    (window.crypto || window.msCrypto).getRandomValues(v);
    return [...v].map(n => letras[n % letras.length]).join('');
};
// "hoje 14:32", "ontem 09:10", "há 5 dias", "12/10/26"
const quando = s => {
    const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/); if (!m) return '';
    const d = new Date(+m[1], m[2] - 1, +m[3]), hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const dias = Math.round((hoje - d) / 864e5), hora = `${m[4]}:${m[5]}`;
    return dias <= 0 ? `hoje ${hora}` : dias === 1 ? `ontem ${hora}` : dias < 7 ? `há ${dias} dias` : `${m[3]}/${m[2]}/${m[1].slice(2)}`;
};
const avatar = u => `<span class="us-avatar ${u.cargo === 'Admin' ? 'admin' : ''}">${esc((u.usuario.trim()[0] || '?').toUpperCase())}</span>`;
const erroAmigavel = e => e.message === 'Ação não reconhecida.' ? 'O servidor ainda está na versão antiga. Atualize o server.js na alwaysdata.' : e.message;

// ---------- LISTA ----------
window.carregarUsuarios = async function() {
    const box = $('lista-usuarios'); if (!box) return;
    if (!US.lista.length) box.innerHTML = '<div class="loading-mm" style="display:block;">⏳ Carregando…</div>';
    try { US.lista = (await window.apiAcao('listar_usuarios')).usuarios; window.renderizarUsuarios(); }
    catch (e) { box.innerHTML = `<p class="mm-vazio">Não consegui carregar os usuários: ${esc(erroAmigavel(e))}</p>`; }
};
window.filtroUsuarios = function(f) { US.filtro = f; document.querySelectorAll('#us-filtros button').forEach(b => b.classList.toggle('active', b.dataset.f === f)); window.renderizarUsuarios(); };
window.renderizarUsuarios = function() {
    const box = $('lista-usuarios'); if (!box) return;
    const eu = US.lista.find(u => u.eu);
    $('us-minha-conta').innerHTML = eu ? `${avatar(eu)}<div class="us-info"><b>${esc(eu.usuario)}</b><small>${CARGO[eu.cargo] ? CARGO[eu.cargo].nome : esc(eu.cargo)} · esta é a sua conta</small></div>
        <div class="us-conta-acoes"><button class="btn-limpar" onclick="abrirTrocarSenha()">${window.ic('chave')} Trocar minha senha</button><button class="btn-limpar" onclick="desconectarAparelhos(${eu.id})">${window.ic('sair')} Sair dos outros aparelhos</button></div>` : '';
    const conta = { todos: US.lista.length, Admin: US.lista.filter(u => u.cargo === 'Admin').length, Vendedor: US.lista.filter(u => u.cargo === 'Vendedor').length, inativos: US.lista.filter(u => !u.ativo).length };
    document.querySelectorAll('#us-filtros button').forEach(b => { b.querySelector('em').innerText = conta[b.dataset.f] || ''; });
    const t = $('us-busca').value;
    const lista = US.lista.filter(u => (US.filtro === 'todos' || (US.filtro === 'inativos' ? !u.ativo : u.cargo === US.filtro)) && window.buscaBate(t, u.usuario, u.telefone, u.cargo));
    if (!lista.length) { box.innerHTML = `<div class="vazio-box">${window.ic('usuarios')}<b>${US.lista.length ? 'Ninguém nesse filtro' : 'Nenhum usuário'}</b></div>`; return; }
    const grupo = (titulo, us) => us.length ? `<div class="us-grupo">${titulo} <em>${us.length}</em></div><div class="us-lista">${us.map(linha).join('')}</div>` : '';
    box.innerHTML = grupo('Administradores', lista.filter(u => u.cargo === 'Admin')) + grupo('Vendedores', lista.filter(u => u.cargo !== 'Admin'));
};
function linha(u) {
    const extra = [u.ultimo_acesso ? `entrou ${quando(u.ultimo_acesso)}` : 'nunca entrou', u.cargo === 'Vendedor' && u.pecas ? `${u.pecas} peça${u.pecas > 1 ? 's' : ''} com ele` : '', u.a_receber > 0 ? `${window.fmt(u.a_receber)} a receber` : ''].filter(Boolean).join(' · ');
    return `<div class="us-linha ${u.ativo ? '' : 'inativo'}" onclick="abrirUsuario(${u.id})" role="button" tabindex="0">
        ${avatar(u)}<div class="us-info"><b>${esc(u.usuario)}${u.eu ? ' <span class="us-voce">você</span>' : ''}</b><small>${esc(extra)}${u.telefone ? ` · ${esc(u.telefone)}` : ''}</small></div>
        ${u.ativo ? '' : '<span class="mm-chip vermelho">Desativado</span>'}<span class="us-cargo ${u.cargo === 'Admin' ? 'admin' : ''}">${esc(u.cargo)}</span>${window.ic('seta-dir', 'us-seta')}</div>`;
}

// ---------- NOVO USUÁRIO ----------
const escolhaCargo = (atual, travado) => `<div class="us-cargos" id="us-cargos">${Object.entries(CARGO).map(([k, c]) => `<button type="button" class="us-cargo-op ${k === atual ? 'active' : ''}" data-c="${k}" ${travado ? 'disabled' : ''} onclick="escolherCargoUsuario('${k}')"><b>${k === 'Admin' ? window.ic('escudo') : window.ic('usuarios')}${c.nome}</b><small>${c.desc}</small></button>`).join('')}</div>`;
window.escolherCargoUsuario = function(c) {
    document.querySelectorAll('#us-cargos button').forEach(b => b.classList.toggle('active', b.dataset.c === c));
    const s = $('nu-senha'); if (s) s.placeholder = `Pelo menos ${minimo(c)} caracteres`;
};
const cargoEscolhido = () => (document.querySelector('#us-cargos .active') || {}).dataset?.c || 'Vendedor';
const campoSenha = (id, valor = '') => `<div class="us-senha"><input type="text" id="${id}" value="${esc(valor)}" autocomplete="new-password" autocapitalize="off" spellcheck="false">
    <button type="button" class="btn-ic" title="Gerar uma senha" onclick="$('${id}').value = gerarSenhaMM()">${window.ic('desfazer')}</button></div>`;
window.abrirNovoUsuario = function(cargo = 'Vendedor') {
    window.abrirModalMM(`<h3 class="modal-title">${window.ic('mais')} Novo usuário</h3>
        <div class="input-group"><label>Tipo de acesso</label>${escolhaCargo(cargo)}</div>
        <div class="input-group"><label for="nu-nome">Nome de usuário <small class="rot-dica">é o que a pessoa digita para entrar</small></label><input type="text" id="nu-nome" placeholder="Ex: Kamila" autocomplete="off" autocapitalize="words"></div>
        <div class="input-group"><label for="nu-senha">Senha <small class="rot-dica">o botão ao lado cria uma</small></label>${campoSenha('nu-senha', window.gerarSenhaMM())}</div>
        <div class="input-group"><label for="nu-tel">WhatsApp (opcional)</label><input type="tel" id="nu-tel" placeholder="11999998888" autocomplete="off"></div>
        <button class="btn-magic btn-global" id="btn-nu" onclick="criarUsuario()">${window.ic('check')} Criar acesso</button>`);
    window.escolherCargoUsuario(cargo);
    setTimeout(() => $('nu-nome') && $('nu-nome').focus(), 250);
};
window.criarUsuario = async function() {
    const nome = $('nu-nome').value.trim(), senha = $('nu-senha').value.trim(), telefone = $('nu-tel').value.trim(), cargo = cargoEscolhido();
    if (nome.length < 2) { $('nu-nome').focus(); return window.mostrarAlerta('Falta o nome', 'Digite o nome de usuário (pelo menos 2 letras).', 'warning'); }
    if (senha.length < minimo(cargo)) return window.mostrarAlerta('Senha curta', `A senha precisa ter pelo menos ${minimo(cargo)} caracteres.`, 'warning');
    const b = $('btn-nu'); b.disabled = true;
    try {
        await window.apiAcao('salvar_usuario', { usuario: nome, senha, telefone, cargo });
        window.carregarUsuarios(); if (window.painelEstoque) window.carregarPainelEstoque();
        mostrarAcesso({ titulo: 'Acesso criado', nome, senha, telefone, cargo });
    } catch (e) { window.mostrarAlerta('Não deu para criar', erroAmigavel(e), 'error'); }
    finally { b.disabled = false; }
};
// Resumo para passar o acesso à pessoa (WhatsApp ou copiar)
function mostrarAcesso({ titulo, nome, senha, telefone, cargo, novaSenha }) {
    const texto = `Olá, ${nome}! ${novaSenha ? 'Sua senha nova do Mini Mundo 3D' : 'Seu acesso ao Mini Mundo 3D'}:\n\n🔗 ${window.linkSistema()}\n👤 Usuário: ${nome}\n🔑 Senha: ${senha}\n\nDepois de entrar, você pode trocar a senha em "Trocar minha senha".`;
    window.US.textoAcesso = texto;
    window.abrirModalMM(`<h3 class="modal-title">${window.ic('check')} ${esc(titulo)}</h3>
        <div class="us-acesso"><div><span>Tipo</span><b>${esc(cargo)}</b></div><div><span>Usuário</span><b>${esc(nome)}</b></div><div><span>Senha</span><b class="us-senha-ver">${esc(senha)}</b></div><div><span>Link</span><b>${esc(window.linkSistema())}</b></div></div>
        <p class="texto-ajuda">Passe esses dados para ${esc(nome)}. Por segurança, a senha não fica visível depois que esta janela fechar.</p>
        <a class="btn-magic btn-global btn-zap" href="${esc(window.linkZap(telefone, texto))}" target="_blank" rel="noopener">${window.ic('zap')} Enviar no WhatsApp</a>
        <button class="btn-limpar us-largo" onclick="copiarTexto(US.textoAcesso, 'Dados de acesso copiados!')">${window.ic('copiar')} Copiar os dados</button>`);
}

// ---------- EDITAR ----------
window.abrirUsuario = function(id) {
    const u = porId(id); if (!u) return;
    const info = [`Criado ${u.criado_em ? 'em ' + window.fmtDataHora(u.criado_em) : 'antes do sistema novo'}`, u.ultimo_acesso ? `último acesso ${quando(u.ultimo_acesso)}` : 'ainda não entrou',
        u.cargo === 'Vendedor' ? `${u.pecas} peça${u.pecas === 1 ? '' : 's'} com ele · ${window.fmt(u.a_receber)} a receber` : ''].filter(Boolean);
    window.abrirModalMM(`<h3 class="modal-title">${window.ic('lapis')} ${esc(u.usuario)}</h3>
        <div class="us-topo">${avatar(u)}<div><b>${esc(u.cargo)}${u.eu ? ' · você' : ''}</b>${info.map(i => `<small>${esc(i)}</small>`).join('')}</div></div>
        <div class="input-group"><label for="eu-nome">Nome de usuário</label><input type="text" id="eu-nome" value="${esc(u.usuario)}" autocomplete="off"></div>
        <div class="input-group"><label for="eu-tel">WhatsApp</label><input type="tel" id="eu-tel" value="${esc(u.telefone)}" placeholder="11999998888" autocomplete="off"></div>
        <div class="input-group"><label>Tipo de acesso${u.eu ? ' <small class="rot-dica">o seu não dá para mudar</small>' : ''}</label>${escolhaCargo(u.cargo, u.eu)}</div>
        <label class="chave" style="margin:0 0 14px;"><input type="checkbox" id="eu-ativo" ${u.ativo ? 'checked' : ''} ${u.eu ? 'disabled' : ''}> Acesso ativo (pode entrar no sistema)</label>
        <button class="btn-magic btn-global" id="btn-eu" onclick="salvarUsuario(${u.id})">${window.ic('check')} Salvar</button>
        <div class="us-secao">Senha e aparelhos</div>
        <div class="us-botoes">
            ${u.eu ? `<button class="btn-limpar" onclick="abrirTrocarSenha()">${window.ic('chave')} Trocar minha senha</button>`
                   : `<button class="btn-limpar" onclick="definirSenhaUsuario(${u.id})">${window.ic('chave')} Definir senha nova</button>`}
            <button class="btn-limpar" onclick="desconectarAparelhos(${u.id})">${window.ic('sair')} ${u.eu ? 'Sair dos outros aparelhos' : 'Desconectar aparelhos'}</button>
            ${u.cargo === 'Vendedor' ? `<button class="btn-limpar" onclick="fecharModalMM(); switchTab('vendedores'); abrirVendedor(${u.id})">${window.ic('mala')} Painel do vendedor</button>` : ''}
        </div>
        ${u.eu ? '' : `<button class="btn-limpar us-excluir" onclick="excluirUsuario(${u.id})">${window.ic('lixo')} Excluir usuário</button>`}`);
};
window.salvarUsuario = async function(id) {
    const u = porId(id); if (!u) return;
    const nome = $('eu-nome').value.trim(), cargo = cargoEscolhido(), ativo = $('eu-ativo').checked;
    if (nome.length < 2) { $('eu-nome').focus(); return window.mostrarAlerta('Falta o nome', 'O nome de usuário precisa ter pelo menos 2 letras.', 'warning'); }
    // Avisos antes de tirar acesso
    if (!u.eu && cargo !== u.cargo && !await window.confirmarMM({ icone: '🔁', titulo: `${u.usuario} vai virar ${cargo}`, texto: cargo === 'Admin' ? 'Vai poder ver e mudar tudo no sistema, inclusive custos, vendas e usuários.' : 'Vai deixar de ver o painel completo e só verá as peças dele.\nEle sai dos aparelhos e entra de novo já com o acesso novo.', ok: 'Mudar' })) return;
    if (!u.eu && u.ativo && !ativo && !await window.confirmarMM({ tipo: 'perigo', icone: '⛔', titulo: `Desativar ${u.usuario}?`, texto: 'Ele sai na hora de todos os aparelhos e não consegue mais entrar. Dá para reativar depois.' + (u.pecas ? `\nAs ${u.pecas} peças continuam com ele no estoque.` : ''), ok: 'Desativar' })) return;
    const b = $('btn-eu'); b.disabled = true;
    try {
        await window.apiAcao('editar_usuario', { id, usuario: nome, telefone: $('eu-tel').value.trim(), cargo, ativo });
        if (u.eu && nome !== u.usuario) { localStorage.setItem('mm_usuario', nome); window.mostrarUsuarioNoMenu('Diretoria'); }
        window.fecharModalMM(); window.toastMM(`${nome} salvo`);
        window.carregarUsuarios(); if (window.painelEstoque) window.carregarPainelEstoque();
    } catch (e) { window.mostrarAlerta('Não deu para salvar', erroAmigavel(e), 'error'); }
    finally { b.disabled = false; }
};
window.definirSenhaUsuario = async function(id) {
    const u = porId(id); if (!u) return;
    const senha = await window.pedirValorMM({ icone: '🔑', titulo: `Senha nova para ${u.usuario}`, texto: `Ele sai dos aparelhos e entra de novo com esta senha. Mínimo de ${minimo(u.cargo)} caracteres.`, campo: 'text', valor: window.gerarSenhaMM(), ok: 'Definir senha',
        validar: v => v.trim().length >= minimo(u.cargo) ? null : `Use pelo menos ${minimo(u.cargo)} caracteres.` });
    if (!senha) return;
    try {
        await window.apiAcao('definir_senha', { id, senha: senha.trim() });
        mostrarAcesso({ titulo: 'Senha nova definida', nome: u.usuario, senha: senha.trim(), telefone: u.telefone, cargo: u.cargo, novaSenha: true });
    } catch (e) { window.mostrarAlerta('Não deu para trocar a senha', erroAmigavel(e), 'error'); }
};
window.desconectarAparelhos = async function(id) {
    const u = porId(id); if (!u) return;
    if (!await window.confirmarMM({ icone: '🚪', titulo: u.eu ? 'Sair dos outros aparelhos?' : `Desconectar ${u.usuario}?`, texto: u.eu ? 'Todos os outros celulares e computadores onde você entrou vão pedir a senha de novo. Este aqui continua conectado.' : 'Todos os aparelhos dele vão pedir a senha de novo. Útil se ele perdeu o celular.', ok: u.eu ? 'Sair dos outros' : 'Desconectar' })) return;
    try {
        const r = await window.apiAcao('encerrar_sessoes', { id });
        if (r.token) localStorage.setItem('mm_token', r.token);
        window.toastMM(u.eu ? 'Os outros aparelhos foram desconectados' : `${u.usuario} foi desconectado`);
    } catch (e) { window.mostrarAlerta('Não deu certo', erroAmigavel(e), 'error'); }
};
window.excluirUsuario = async function(id) {
    const u = porId(id); if (!u) return;
    if (u.pecas) return window.mostrarAlerta('Ainda tem peças com ele', `${u.usuario} está com ${u.pecas} peça(s). Recolha as peças no painel do vendedor antes de excluir.`, 'warning');
    if (u.a_receber > 0) return window.mostrarAlerta('Ainda tem acerto para fazer', `${u.usuario} deve ${window.fmt(u.a_receber)} de repasse. Faça o acerto antes de excluir.`, 'warning');
    if (!await window.confirmarMM({ tipo: 'perigo', icone: '🗑️', titulo: `Excluir ${u.usuario}?`, texto: 'Ele não consegue mais entrar e some das listas.\nSe ele já teve vendas, acertos ou peças, esse histórico continua guardado nos relatórios.\nSe só quer bloquear por um tempo, prefira desligar "Acesso ativo".', ok: 'Excluir usuário' })) return;
    try {
        await window.apiAcao('excluir_usuario', { id });
        window.fecharModalMM(); window.toastMM(`${u.usuario} excluído`);
        window.carregarUsuarios(); if (window.painelEstoque) window.carregarPainelEstoque();
    } catch (e) { window.mostrarAlerta('Não deu para excluir', erroAmigavel(e), 'error'); }
};
})();
