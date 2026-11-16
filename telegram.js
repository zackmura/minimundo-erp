// ==========================================
// 📲 TELEGRAM (Ajustes): ligar o bot, o grupo de avisos e quem pode consultar
// ==========================================
// Igual à Novera: um grupo onde caem os avisos (vendas, pagamentos, pedidos, fechamento do dia…)
// e o chat particular com o bot para consultar sem abrir o app. Tudo se liga por aqui:
// 1) cola o token do bot criado no @BotFather; 2) toca em "Ligar num grupo"; 3) toca em "Ligar meu Telegram".
// O token fica guardado no servidor e nunca volta para o painel (só os 4 últimos caracteres).
(() => {
const $ = window.$, esc = s => window.esc(s), ic = n => window.ic(n);
let TGS = null, vigia = null;
const servidorAntigo = e => e.message === 'Ação não reconhecida.' ? 'O servidor ainda está na versão antiga. Atualize o server.js primeiro.' : e.message;
const dataBR = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}` : ''; };

window.carregarTelegram = async function() {
    const box = $('tg-card'); if (!box) return;
    if (!TGS) box.innerHTML = '<div class="card-titulo">📲 Telegram</div><p class="mm-vazio">⏳ Conferindo o Telegram…</p>';
    try { TGS = await window.apiAcao('telegram_status'); window.renderizarTelegram(); }
    catch (e) { box.innerHTML = `<div class="card-titulo">📲 Telegram</div><p class="mm-vazio">${esc(servidorAntigo(e))}</p>`; }
};
const passo = (n, feito, titulo, corpo) => `<div class="tg-passo ${feito ? 'feito' : ''}"><span class="tg-num">${feito ? ic('check') : n}</span><div class="tg-passo-corpo"><b>${titulo}</b>${corpo}</div></div>`;
window.renderizarTelegram = function() {
    const s = TGS, box = $('tg-card'); if (!s || !box) return;
    const cabeca = `<div class="card-titulo tg-titulo">📲 Telegram <span class="badge-status ${s.ligado && s.grupo ? 'pago' : 'pend'}">${!s.ligado ? 'Desligado' : s.grupo ? 'Ligado' : 'Falta o grupo'}</span></div>
        <p class="card-desc">Igual à Novera: os avisos (vendas, pagamentos, pedidos do site, vendedores, despesas, bom dia e fechamento do dia) caem num grupo, e no chat com o bot você consulta tudo sem abrir o app.</p>`;
    if (!s.ligado) {
        box.innerHTML = cabeca + passo(1, false, 'Crie o bot do Mini Mundo (uma vez só)', `
            <ol class="tg-lista"><li>No Telegram, abra o <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a> e mande <code>/newbot</code>.</li>
                <li>Escolha um nome (ex.: <i>Mini Mundo</i>) e um usuário que termine em <b>bot</b> (ex.: <i>MiniMundo3DBot</i>).</li>
                <li>Ele responde com um <b>token</b>, parecido com <code>123456789:AAH…</code>. Copie e cole aqui:</li></ol>
            <div class="tg-alerta">${ic('alerta')}<span>Crie um bot <b>novo</b>. O bot da Novera não serve aqui: cada bot só funciona em um sistema.</span></div>
            <div class="ck-form"><input type="password" id="tg-token" placeholder="Cole o token aqui" autocomplete="off" spellcheck="false"><button class="btn-magic btn-pequeno" id="btn-tg-token" onclick="salvarTokenTg()">Ligar</button></div>`);
        return;
    }
    const bot = s.bot ? `@${esc(s.bot.username)}` : 'o bot', situacao = s.erro ? `<span class="tg-sit erro">${ic('alerta')}${esc(s.erro)}</span>` : s.ouvindo ? `<span class="tg-sit ok">${ic('check')}Funcionando</span>` : '<span class="tg-sit">Conectando…</span>';
    const linkGrupo = s.links ? `<a class="btn-magic btn-pequeno tg-link" href="${esc(s.links.grupo)}" target="_blank" rel="noopener" onclick="esperarTelegram()">${ic('link')} Ligar num grupo</a>` : '';
    const linkPessoa = s.links ? `<a class="btn-magic btn-pequeno tg-link" href="${esc(s.links.pessoa)}" target="_blank" rel="noopener" onclick="esperarTelegram()">${ic('link')} Ligar meu Telegram</a>` : '';
    const manual = `<small class="tg-manual">Não abriu? Mande <code>/conectar ${esc(s.codigo)}</code> ${'para ' + bot}.</small>`;
    box.innerHTML = cabeca + `<div class="tg-bot">${ic('chave')}<span>Bot <b>${bot}</b>${s.bot && s.bot.nome ? ` · ${esc(s.bot.nome)}` : ''}</span>${situacao}</div>`
        + passo(1, true, 'Bot ligado', `<small>Token ${esc(s.final)}${s.origem === 'servidor' ? ' (do arquivo .env)' : ''}</small>`)
        + passo(2, !!s.grupo, s.grupo ? `Grupo de avisos: ${esc(s.grupo.nome || s.grupo.id)}` : 'Ligue o grupo de avisos', s.grupo
            ? `<small>${s.grupo.ligado_em ? `Ligado em ${dataBR(s.grupo.ligado_em)}${s.grupo.por ? ` por ${esc(s.grupo.por)}` : ''}. ` : ''}Os avisos chegam lá.</small>
               <div class="tg-bts"><button class="btn-limpar" onclick="testarTelegram(this)">${ic('play')} Mandar um teste</button><button class="btn-limpar" onclick="trocarGrupoTg()">Trocar de grupo</button><button class="btn-limpar perigo" onclick="removerTg('grupo')">${ic('x')} Desligar</button></div>
               <div id="tg-trocar" hidden><p class="tg-texto">Escolha o outro grupo no Telegram:</p>${linkGrupo}${manual}</div>`
            : `<p class="tg-texto">Crie um grupo no Telegram (pode ser só com você e quem trabalha junto). Depois toque no botão, escolha o grupo e confirme: o bot entra e avisa que ligou.</p>${linkGrupo}${manual}`)
        + passo(3, s.pessoas.length > 0, 'Quem pode consultar pelo chat com o bot', `
            ${s.pessoas.length ? `<div class="tg-pessoas">${s.pessoas.map(p => `<div class="tg-pessoa">${ic('usuarios')}<span><b>${esc(p.nome)}</b>${p.usuario ? ` <small>@${esc(p.usuario)}</small>` : ''}${p.ligado_em ? `<small> · desde ${dataBR(p.ligado_em)}</small>` : ''}</span><button class="btn-ic perigo" title="Tirar o acesso" aria-label="Tirar o acesso de ${esc(p.nome)}" onclick="removerTg('${esc(p.id)}')">${ic('x')}</button></div>`).join('')}</div>` : ''}
            <p class="tg-texto">Abra no celular onde você usa o Telegram e toque em <b>Começar</b>. Aparecem botões para ver hoje, o mês, o que falta receber, os pedidos e mais. Cada pessoa liga o próprio Telegram.</p>${linkPessoa}${manual}`)
        + (s.grupo ? `<div class="tg-secao">O que avisar no grupo</div>
            <div class="tg-tipos">${s.tipos.map(t => `<label class="chave"><input type="checkbox" class="tg-tipo" value="${t.id}" ${s.prefs.off.includes(t.id) ? '' : 'checked'}> ${t.ic} ${esc(t.nome)}</label>`).join('')}</div>
            <div class="row tg-horas"><div class="col"><div class="input-group"><label for="tg-bomdia">☀️ Bom dia às</label><input type="time" id="tg-bomdia" value="${esc(s.prefs.bomdia)}"></div></div>
                <div class="col"><div class="input-group"><label for="tg-fechamento">🌙 Fechamento às</label><input type="time" id="tg-fechamento" value="${esc(s.prefs.fechamento)}"></div></div></div>
            <div class="tg-bts"><button class="btn-magic btn-pequeno" onclick="salvarAvisosTg(this)">${ic('check')} Salvar avisos</button><button class="btn-limpar" onclick="previaTg('bomdia')">👀 Ver o bom dia</button><button class="btn-limpar" onclick="previaTg('fechamento')">👀 Ver o fechamento</button></div>` : '')
        + `<details class="tg-cmds"><summary>Comandos do bot</summary>${s.comandos.map(c => `<div><code>/${esc(c.c)}</code> ${esc(c.d)}</div>`).join('')}<div><b>Ou escreva qualquer coisa</b> no chat com o bot: nome de produto, de cliente, de vendedor ou o número do pedido (#12).</div></details>`
        + `<div class="tg-bts tg-rodape"><button class="btn-limpar" onclick="trocarTokenTg()">Trocar o bot</button><button class="btn-limpar" onclick="novoCodigoTg()">Gerar código novo</button><button class="btn-limpar perigo" onclick="desligarTelegram()">Desligar o Telegram</button></div>
           <div id="tg-novo-token" hidden><div class="ck-form"><input type="password" id="tg-token" placeholder="Cole o token do outro bot" autocomplete="off" spellcheck="false"><button class="btn-magic btn-pequeno" id="btn-tg-token" onclick="salvarTokenTg()">Trocar</button></div><small class="tg-manual">Trocando de bot, o grupo e as pessoas precisam ser ligados de novo.</small></div>`;
};
window.salvarTokenTg = async function() {
    const token = ($('tg-token') || {}).value ? $('tg-token').value.trim() : '';
    if (!token) return window.mostrarAlerta('Falta o token', 'Cole o token que o @BotFather mandou.', 'warning');
    const b = $('btn-tg-token'); b.disabled = true; b.textContent = 'Conferindo…';
    try { TGS = await window.apiAcao('telegram_salvar', { token }); window.renderizarTelegram(); window.toastMM('Bot ligado! Agora ligue o grupo.'); }
    catch (e) { window.mostrarAlerta('Não deu', servidorAntigo(e), 'warning'); b.disabled = false; b.textContent = 'Ligar'; }
};
// Depois de tocar num link, confere sozinho até o grupo ou a pessoa aparecer (por 3 minutos)
window.esperarTelegram = function() {
    clearInterval(vigia);
    let antes = TGS ? `${(TGS.grupo || {}).id}|${TGS.pessoas.map(p => p.id).join(',')}` : '';
    const fim = Date.now() + 180000;
    vigia = setInterval(async () => {
        if (Date.now() > fim || !document.querySelector('#tab-config.active')) return clearInterval(vigia);
        try {
            const s = await window.apiAcao('telegram_status'), agora = `${(s.grupo || {}).id}|${s.pessoas.map(p => p.id).join(',')}`;
            if (agora !== antes) { antes = agora; TGS = s; window.renderizarTelegram(); window.toastMM('Telegram ligado! ✅'); if (s.grupo && s.pessoas.length) clearInterval(vigia); }
        } catch (e) { /* tenta de novo */ }
    }, 4000);
};
window.testarTelegram = async function(b) {
    b.disabled = true;
    try { await window.apiAcao('telegram_testar'); window.toastMM('Teste enviado. Olhe o grupo no Telegram.'); }
    catch (e) { window.mostrarAlerta('Não chegou', servidorAntigo(e), 'warning'); }
    finally { b.disabled = false; }
};
window.trocarGrupoTg = () => { const d = $('tg-trocar'); if (d) d.hidden = !d.hidden; };
window.trocarTokenTg = () => { const d = $('tg-novo-token'); if (d) { d.hidden = !d.hidden; if (!d.hidden) $('tg-token').focus(); } };
window.removerTg = async function(alvo) {
    const grupo = alvo === 'grupo', p = !grupo && TGS.pessoas.find(x => String(x.id) === String(alvo));
    if (!await window.confirmarMM({ tipo: 'perigo', icone: '📲', titulo: grupo ? 'Desligar o grupo de avisos?' : `Tirar o acesso de ${p ? p.nome : 'esta pessoa'}?`, texto: grupo ? 'Os avisos param de chegar no grupo até você ligar de novo.' : 'Essa pessoa não consegue mais consultar pelo chat com o bot.', ok: grupo ? 'Desligar' : 'Tirar o acesso' })) return;
    try { TGS = await window.apiAcao('telegram_remover', { alvo }); window.renderizarTelegram(); }
    catch (e) { window.mostrarAlerta('Erro', servidorAntigo(e), 'error'); }
};
window.salvarAvisosTg = async function(b) {
    const off = [...document.querySelectorAll('.tg-tipo')].filter(c => !c.checked).map(c => c.value);
    b.disabled = true;
    try { TGS = await window.apiAcao('telegram_prefs', { prefs: { off, bomdia: $('tg-bomdia').value, fechamento: $('tg-fechamento').value } }); window.renderizarTelegram(); window.toastMM('Avisos salvos'); }
    catch (e) { window.mostrarAlerta('Erro', servidorAntigo(e), 'error'); b.disabled = false; }
};
window.novoCodigoTg = async function() {
    if (!await window.confirmarMM({ icone: '🔑', titulo: 'Gerar um código novo?', texto: 'Os links antigos param de funcionar. Quem já está ligado continua.', ok: 'Gerar' })) return;
    try { TGS = await window.apiAcao('telegram_codigo'); window.renderizarTelegram(); window.toastMM('Código novo gerado'); }
    catch (e) { window.mostrarAlerta('Erro', servidorAntigo(e), 'error'); }
};
window.desligarTelegram = async function() {
    if (!await window.confirmarMM({ tipo: 'perigo', icone: '📲', titulo: 'Desligar o Telegram?', texto: 'Os avisos e as consultas param. Para voltar, cole o token de novo e ligue o grupo e as pessoas.', ok: 'Desligar' })) return;
    try { TGS = await window.apiAcao('telegram_desligar'); window.renderizarTelegram(); }
    catch (e) { window.mostrarAlerta('Erro', servidorAntigo(e), 'error'); }
};
// Mostra a mensagem como vai chegar (só negrito, itálico e código; o resto vira texto)
const textoSeguro = html => {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html'), raiz = doc.body.firstChild;
    raiz.querySelectorAll('*').forEach(el => { if (!['B', 'I', 'CODE'].includes(el.tagName)) el.replaceWith(doc.createTextNode(el.textContent)); });
    return raiz.innerHTML;
};
window.previaTg = async function(tipo) {
    try {
        const r = await window.apiAcao('telegram_previa', { tipo });
        window.abrirModalMM(`<h3 class="modal-title">📲 ${tipo === 'bomdia' ? 'Bom dia' : 'Fechamento do dia'}</h3><p class="texto-ajuda" style="margin-top:0;">Assim chega no grupo, com os números de agora.</p><div class="tg-balao">${textoSeguro(r.texto)}</div>`);
    } catch (e) { window.mostrarAlerta('Erro', servidorAntigo(e), 'error'); }
};
// Abre junto com a tela Ajustes
const abrirAntes = window.abrirAjustes;
window.abrirAjustes = function() { if (abrirAntes) abrirAntes(); window.carregarTelegram(); };
})();
