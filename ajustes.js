// ==========================================
// ⚙️ AJUSTES: PARÂMETROS, CHAVES DE ACESSO E SOBRE
// ==========================================
// As chaves (Gemini, ImgBB, OnionSys) ficam guardadas no servidor. O painel nunca recebe a chave
// inteira de volta: só fica sabendo se existe e os 4 últimos caracteres.
(() => {
const $ = window.$;
const esc = s => window.esc(s);
const CAMPOS = {
    'cfg-markup-repasse': 'markup_repasse', 'cfg-margem-vendedor': 'margem_vendedor', 'cfg-estoque-minimo': 'estoque_minimo', 'cfg-telefone-admin': 'telefone_admin',
    'cfg-multiplicador': 'multiplicador_venda', 'cfg-filamento': 'filamento_kg', 'cfg-watts': 'imp_watts', 'cfg-kwh': 'imp_kwh', 'cfg-maq': 'imp_maq_hora', 'cfg-hora': 'imp_hora', 'cfg-falha': 'taxa_falha'
};
const DESCRICAO = {
    gemini: 'Escreve as descrições do Catálogo e gera o Quiz. Crie grátis em aistudio.google.com → "Get API key".',
    imgbb: 'Guarda uma cópia de cada foto (backup). Crie grátis em api.imgbb.com.',
    onionsys_token: 'Servidor principal das fotos. Só troque se a OnionSys te passar um token novo.',
    onionsys_url: 'Endereço para onde as fotos são enviadas na OnionSys.'
};

window.carregarConfigMM = async function() {
    try {
        window.configMM = (await window.apiAcao('obter_config')).config;
        Object.entries(CAMPOS).forEach(([id, k]) => { if ($(id)) $(id).value = window.configMM[k] ?? ''; });
        if (window.pfCarregarImpressora && !(window.PF && window.PF.editando)) window.pfCarregarImpressora();
        if (window.pfCalcular) window.pfCalcular();
    } catch (e) { window.addLog(`Erro parâmetros: ${e.message}`, 'error'); }
};
window.salvarConfigMM = async function(btn) {
    const valores = {};
    Object.entries(CAMPOS).forEach(([id, k]) => { if ($(id)) valores[k] = $(id).value.trim(); });
    if (btn) btn.disabled = true;
    try {
        window.configMM = (await window.apiAcao('salvar_config', { valores })).config;
        if (window.pfCarregarImpressora && !(window.PF && window.PF.editando)) window.pfCarregarImpressora();
        if (window.pfCalcular) window.pfCalcular();
        window.toastMM('Parâmetros salvos');
    } catch (e) { window.mostrarAlerta('Erro', e.message, 'error'); }
    finally { if (btn) btn.disabled = false; }
};

// ---------- CHAVES ----------
window.carregarChaves = async function() {
    const box = $('lista-chaves'); if (!box) return;
    box.innerHTML = '<p class="mm-vazio">⏳ Conferindo as chaves…</p>';
    try { window.renderizarChaves((await window.apiAcao('status_chaves')).chaves); }
    catch (e) { box.innerHTML = `<p class="mm-vazio">Não consegui ler as chaves: ${esc(e.message)}${/não reconhecida/i.test(e.message) ? '<br>O servidor ainda está na versão antiga — atualize o server.js.' : ''}</p>`; }
};
window.renderizarChaves = function(chaves) {
    const antiga = (() => { try { return localStorage.getItem('gemini_api_key') || ''; } catch (e) { return ''; } })();
    const gem = chaves.find(c => c.id === 'gemini');
    const aviso = antiga && gem && !gem.origem ? `<div class="mm-alerta">Este aparelho tem uma chave do Gemini da versão antiga. <button class="btn-limpar" onclick="moverChaveAntiga()">Guardar no servidor</button></div>` : '';
    $('lista-chaves').innerHTML = aviso + chaves.map(c => `<div class="chave-item">
        <div class="ck-topo"><span class="ck-ic">${window.ic('chave')}</span><div class="ck-nome"><b>${esc(c.nome)}</b><small>${esc(DESCRICAO[c.id] || '')}</small></div>
            <span class="badge-status ${c.origem ? 'pago' : 'pend'}">${c.origem === 'painel' ? 'Cadastrada aqui' : c.origem === 'servidor' ? 'No servidor' : 'Não cadastrada'}</span></div>
        ${c.final ? `<div class="ck-atual">Atual: <code>${esc(c.final)}</code>${c.origem === 'servidor' ? ' <small>(do arquivo .env)</small>' : ''}</div>` : ''}
        <div class="ck-form"><input type="${c.id === 'onionsys_url' ? 'text' : 'password'}" id="ck-${c.id}" placeholder="${c.origem ? 'Cole aqui para trocar' : 'Cole a chave aqui'}" autocomplete="off" spellcheck="false">
            <button class="btn-magic btn-pequeno" onclick="salvarChave('${c.id}')">Salvar</button></div>
        <div class="ck-extra">${c.id === 'gemini' && c.origem ? `<button class="btn-limpar" onclick="testarChave('${c.id}')">Testar</button>` : ''}${c.origem === 'painel' ? `<button class="btn-limpar perigo" onclick="removerChave('${c.id}')">Remover daqui</button>` : ''}</div>
    </div>`).join('');
};
window.salvarChave = async function(id, valorDireto) {
    const valor = valorDireto !== undefined ? valorDireto : $('ck-' + id).value.trim();
    if (!valor) return window.mostrarAlerta('Campo vazio', 'Cole a chave no campo antes de salvar.', 'warning');
    try { window.renderizarChaves((await window.apiAcao('salvar_chave', { id, valor })).chaves); window.toastMM('Chave guardada no servidor'); }
    catch (e) { window.mostrarAlerta('Erro', e.message, 'error'); }
};
window.removerChave = async function(id) {
    if (!await window.confirmarMM({ tipo: 'perigo', icone: '🔑', titulo: 'Remover esta chave?', texto: 'Se o servidor tiver uma chave no arquivo .env, volta a valer aquela.', ok: 'Remover' })) return;
    try { window.renderizarChaves((await window.apiAcao('salvar_chave', { id, valor: '' })).chaves); window.toastMM('Chave removida'); }
    catch (e) { window.mostrarAlerta('Erro', e.message, 'error'); }
};
window.testarChave = async function(id) {
    try { await window.apiAcao('testar_chave', { id }); window.mostrarAlerta('Chave funcionando', 'O Google aceitou a chave do Gemini.', 'success'); }
    catch (e) { window.mostrarAlerta('Chave com problema', e.message, 'error'); }
};
window.moverChaveAntiga = async function() {
    let k = ''; try { k = localStorage.getItem('gemini_api_key') || ''; } catch (e) { /* sem acesso ao armazenamento */ }
    if (!k) return;
    await window.salvarChave('gemini', k);
    try { localStorage.removeItem('gemini_api_key'); } catch (e) { /* ok */ }
};

// ---------- SOBRE ----------
window.carregarSobre = async function() {
    const box = $('sobre-versoes'); if (!box) return;
    let api = '—', banco = '';
    try { const r = await (await fetch(API_PRECIFICACAO.replace(/\/api$/, '/'))).json(); api = r.versao || '—'; banco = r.banco === 'ok' ? 'conectado' : (r.banco || ''); } catch (e) { api = 'sem resposta'; }
    box.innerHTML = `<div><small>Painel</small><b>${esc(VERSAO_APP)}</b></div><div><small>Servidor</small><b>${esc(api)}</b></div><div><small>Banco de dados</small><b>${esc(banco || '—')}</b></div>`;
};
window.abrirAjustes = function() { window.carregarChaves(); window.carregarSobre(); window.renderizarPlataformas && window.renderizarPlataformas(); };
})();
