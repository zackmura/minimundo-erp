// ==========================================
// CONFIGURAÇÕES GERAIS E ESTADO (MIGRAÇÃO TOTAL PARA MYSQL)
// ==========================================
window.$ = id => document.getElementById(id); 
const VERSAO_APP = "v3.0.0 (MySQL Turbo)";

// A NOSSA NOVA API MYSQL SUPER RÁPIDA (FAZ TUDO AGORA!)
const API_PRECIFICACAO = "https://bdfernando.alwaysdata.net/minimundo/api.php"; 

const API_ONIONSYS = "https://api.onionsys.com.br/api/minimundo/registrar/catalogo";
const API_ONIONSYS_ADS = "https://api.onionsys.com.br/api/minimundo/registrar/anuncios";
const TOKEN_ONIONSYS = "M1N1_MUND0_@!!2!3#1@2!";

const TIMES_INFO = { 
    "corinthians":{cor:"#000",logo:"https://a.espncdn.com/i/teamlogos/soccer/500/874.png",classText:"txt-corinthians"},
    "palmeiras":{cor:"#006400",logo:"https://a.espncdn.com/i/teamlogos/soccer/500/2029.png",classText:"txt-palmeiras"},
    "santos":{cor:"#555",logo:"https://a.espncdn.com/i/teamlogos/soccer/500/2674.png",classText:"txt-santos"},
    "são paulo":{cor:"#cc0000",logo:"https://a.espncdn.com/i/teamlogos/soccer/500/2026.png",classText:"txt-saopaulo"},
    "flamengo":{cor:"#c90000",logo:"https://a.espncdn.com/i/teamlogos/soccer/500/819.png",classText:"txt-flamengo"} 
};

window.dadosTotaisAcessos = []; window.graficoInstancia = null; window.catalogoAdminArray = []; window.anunciosAdminArray = []; window.quantidadeAnunciosPendentes = -1; 
window.custoTotalGlobal = 0; window.despesaTotalCalculada = 0; window.arrayBancoCustos = []; window.arrayDespesas = []; window.arrayVendas = []; window.vendasFiltradasAtuais = []; window.dashVendas = []; window.dashDespesas = []; window.linhaVendaPagamento = null; window.linhaVendaExclusao = null; window.chartProd = null; window.chartPlat = null; window.chartCli = null;
window.arrayImas = []; 
window.loteAtualTipo = 'Pendente';

// ==========================================
// FUNÇÕES ÚTEIS
// ==========================================
window.fmt = val => "R$ " + val.toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 });
window.fmtPlanilha = val => "R$ " + val.toFixed(2).replace('.', ',');
window.limparValorPlanilha = val => { 
    if(!val) return 0; 
    if(typeof val==='number') return val; 
    let str=String(val).trim().replace(/R\$\s?/gi,'').trim(); 
    if(str.includes(',')&&str.includes('.')){str=str.replace(/\./g,'').replace(',','.');}
    else if(str.includes(',')){str=str.replace(',','.');} 
    let num=parseFloat(str); return isNaN(num)?0:num; 
};
window.formatarDoBanco = val => window.fmt(window.limparValorPlanilha(val));
window.formatarPreco = function(val){ 
    if(!val) return ""; 
    let v=String(val).trim(); 
    if(v.toUpperCase().includes("R$")) return v; 
    if(!isNaN(v.replace(',','.'))) return "R$ " + parseFloat(v.replace(',','.')).toFixed(2).replace('.',','); 
    return "R$ "+v; 
};
window.delay = ms => new Promise(r=>setTimeout(r,ms));

document.addEventListener('input', e => {
    if(e.target && e.target.classList.contains('mask-money')){ 
        let val=e.target.value.replace(/\D/g,''); 
        if(val===""){e.target.value="";return;} 
        val=(parseInt(val)/100).toFixed(2)+''; 
        val=val.replace(".",","); 
        val=val.replace(/(\d)(\d{3})(\d{3}),/g,"$1.$2.$3,"); 
        val=val.replace(/(\d)(\d{3}),/g,"$1.$2,"); 
        e.target.value="R$ "+val; 
    }
    if(e.target.id==="d-valor-uni"||e.target.id==="d-qtd") window.calcularDespesaTotal();
});

// ==========================================
// INICIALIZAÇÃO E NAVEGAÇÃO
// ==========================================
window.onload = () => { 
    if(window.$('versao-login')) window.$('versao-login').innerText = VERSAO_APP;
    if(window.$('versao-header')) window.$('versao-header').innerText = VERSAO_APP;
    window.renderizarPlataformas();
    if(localStorage.getItem("admin_auth")==="true") window.iniciarApp(); 
};

window.tentarLogin = async function() {
    const usr = window.$('input-usuario').value.trim();
    const pwd = window.$('input-senha').value.trim();
    if (!usr || !pwd) return alert("Preencha usuário e senha!");
    const btn = window.$('btn-login'); const textoOriginal = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = "⏳ Validando...";

    try {
        const payload = { acao: "login", usuario: usr, senha: pwd };
        const req = await fetch(API_PRECIFICACAO, { method: "POST", body: JSON.stringify(payload) });
        const res = await req.json();

        if (res.sucesso) {
            localStorage.setItem("admin_auth", "true");
            localStorage.setItem("admin_user", res.usuario); 
            window.iniciarApp();
        } else { 
            alert(res.erro || "Usuário ou senha incorretos."); 
            window.$('input-senha').value = ""; 
        }
    } catch (e) { 
        alert("Erro ao conectar com o servidor MYSQL: " + e.message);
    } finally { 
        btn.disabled = false; btn.innerHTML = textoOriginal; 
    }
};

window.verificarEnter = function(e){ if(e.key==="Enter") window.tentarLogin(); };
window.fazerLogout = function(){ localStorage.removeItem("admin_auth"); localStorage.removeItem("admin_user"); location.reload(); };

window.iniciarApp = function(){
    window.$('login-screen').style.display="none"; 
    window.$('app-core').style.display="block";
    if(localStorage.getItem("gemini_api_key")) window.$('api-key').value=localStorage.getItem("gemini_api_key");
    if(localStorage.getItem("imgbb_api_key")) window.$('imgbb-key').value=localStorage.getItem("imgbb_api_key");
    
    const userLogado = localStorage.getItem("admin_user");
    if(userLogado && window.$('nome-usuario-logado')) window.$('nome-usuario-logado').innerText = userLogado;
    
    const h = new Date(), mStr = String(h.getMonth()+1).padStart(2,'0'), aStr = String(h.getFullYear()), dIso = h.toISOString().split('T')[0];
    window.$('filtro-mes').value=mStr; window.$('filtro-ano').value=aStr; window.$('d-data').value=dIso; window.$('venda-data').value=dIso; 
    window.$('filtro-d-mes').value=mStr; window.$('filtro-d-ano').value=aStr; window.$('filtro-v-mes').value=mStr; window.$('filtro-v-ano').value=aStr; window.$('filtro-dash-mes').value=mStr; window.$('filtro-dash-ano').value=aStr;

    window.carregarAnalytics(); window.carregarCatalogoAdmin(); window.carregarAnunciosAdmin(true); window.atualizarBadgeUltimo(); window.carregarBancoDeCustos(); window.calcular();
    if("Notification" in window && Notification.permission!=="granted" && Notification.permission!=="denied") window.$('btn-notifica').style.display="inline-flex";
    setInterval(()=>window.carregarAnunciosAdmin(true), 120000); 
};

window.switchTab = function(tabName, tituloAba = null) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); 
    document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    if(window.$('btn-'+tabName)) window.$('btn-'+tabName).classList.add('active');
    window.$('tab-'+tabName).classList.add('active');
    if(window.$('nav-'+tabName)) window.$('nav-'+tabName).classList.add('active');
    if(tituloAba) window.$('titulo-modulo-ativo').innerText = tituloAba;

    const abasERP = ['precificar','vendas','modelos','custos','dashboard_erp'];
    window.$('terminal').style.display = abasERP.includes(tabName) ? 'none' : 'block';

    if(tabName==='modelos') window.carregarBancoDeCustos(); 
    if(tabName==='custos') window.carregarDespesas(); 
    if(tabName==='vendas'){ window.carregarOpcoesVenda(); window.carregarVendas(); }
    if(tabName==='dashboard_erp') window.carregarDashboardERP();
    if(tabName==='imas') window.carregarImas(); 
};

// ==========================================
// COMPONENTES REUTILIZÁVEIS E MODAIS GERAIS
// ==========================================
window.addLog = function(msg, tipo='info'){ 
    window.$('terminal').innerHTML+=`<div class="log-line"><span class="log-time">[${new Date().toLocaleTimeString('pt-BR')}]</span><span class="log-${tipo}">${msg}</span></div>`; 
    window.$('terminal').scrollTop=window.$('terminal').scrollHeight; 
};
window.mostrarAlerta = function(tit, txt, tipo){ 
    window.$('modal-titulo-alert').innerText=tit; window.$('modal-texto-alert').innerText=txt; 
    const ic=window.$('modal-icone-alert'), b=window.$('btn-modal-ok'); 
    if(tipo==="success"){ic.innerText="✅";b.style.background="#10b981";b.style.boxShadow="0 6px 0 #059669";}
    else if(tipo==="warning"){ic.innerText="⚠️";b.style.background="#f59e0b";b.style.boxShadow="0 6px 0 #d97706";}
    else{ic.innerText="❌";b.style.background="#ef4444";b.style.boxShadow="0 6px 0 #b91c1c";} 
    window.$('custom-modal').style.display="flex"; 
    if("vibrate" in navigator) navigator.vibrate(50); 
};
window.fecharAlerta = function(){ window.$('custom-modal').style.display="none"; };

// FUNÇÃO INTELIGENTE DE EXCLUSÃO: TOTALMENTE MYSQL AGORA
window.excluirRegistroLocal = async function(aba, l, idBtn, fnFechar, fnRecarregar){ 
    const b=window.$(idBtn); b.disabled=true; b.innerText="⏳ Excluindo..."; 
    try { 
        const r=await fetch(API_PRECIFICACAO,{method:"POST",body:JSON.stringify({acao:"excluir_registro",aba:aba,linha:l})}); 
        const res=await r.json(); 
        if(res.sucesso){
            window.addLog(`🗑️ Registro excluído.`, "success"); 
            if(fnFechar)fnFechar(); 
            if(fnRecarregar)fnRecarregar();
        } else { throw new Error("Erro exclusão."); } 
    }catch(e){ 
        window.mostrarAlerta("Erro","Falha: "+e.message,"error"); 
    }finally{
        b.disabled=false; b.innerText="🗑️ Excluir";
    } 
};

// ==========================================
// AS FUNÇÕES DE MODAIS QUE EU HAVIA ESQUECIDO
// ==========================================
window.abrirConfirmacaoPagamento = function(l){ window.linhaVendaPagamento = l; window.$('custom-confirm-modal').style.display = "flex"; };
window.fecharConfirmacao = function(){ window.$('custom-confirm-modal').style.display = "none"; window.linhaVendaPagamento = null; };
window.abrirConfirmacaoExclusao = function(l){ window.linhaVendaExclusao = l; window.$('custom-delete-modal').style.display = "flex"; };
window.fecharExclusao = function(){ window.$('custom-delete-modal').style.display = "none"; window.linhaVendaExclusao = null; };
window.fecharEditarVenda = function(){ window.$('custom-edit-venda-modal').style.display = "none"; };
window.abrirModalEditarVenda = function(l){ 
    const v = window.arrayVendas.find(x => x.linha === l); if(!v) return; 
    window.$('edit-venda-linha').value = v.linha; 
    window.$('edit-venda-data').value = v.data.includes('/') ? `${v.data.split('/')[2].substring(0,4)}-${v.data.split('/')[1].padStart(2,'0')}-${v.data.split('/')[0].padStart(2,'0')}` : ""; 
    window.$('edit-venda-status').value = v.status; window.$('edit-venda-cliente').value = v.cliente; 
    window.$('edit-venda-produto').value = v.produto; window.$('edit-venda-plataforma').value = v.plataforma; 
    window.$('edit-venda-qtd').value = v.qtd; window.$('edit-venda-valor').value = window.formatarDoBanco(v.valor_venda); 
    window.$('custom-edit-venda-modal').style.display = "flex"; 
};

// ==========================================
// MÓDULO DE PLATAFORMAS (CONFIGURAÇÕES)
// ==========================================
window.renderizarPlataformas = function() {
    const list = window.$('lista-plataformas'); if(!list) return; const selectP = window.$('venda-plataforma');
    let plats = JSON.parse(localStorage.getItem('minimundo_plataformas') || '[]');
    if(plats.length === 0) { plats = [ {nome: 'Venda Direta', pct: 0, fixa: 0}, {nome: 'Shopee', pct: 20, fixa: 4} ]; localStorage.setItem('minimundo_plataformas', JSON.stringify(plats)); }
    let h = ""; let opt = "<option value=''>-- Selecione --</option>";
    plats.forEach((p, idx) => {
        h += `<div class="plat-item"><div class="plat-info"><strong>${p.nome}</strong><span>Taxa: ${p.pct}% + R$ ${p.fixa.toFixed(2).replace('.',',')} fixa</span></div><button class="btn-editar" style="background:#fef2f2; border-color:#fecaca; color:#b91c1c;" onclick="window.excluirPlataforma(${idx})">🗑️</button></div>`;
        opt += `<option value="${p.nome}">${p.nome}</option>`;
    });
    list.innerHTML = h; if(selectP) selectP.innerHTML = opt;
};
window.salvarPlataforma = function() {
    const nome = window.$('config-plat-nome').value.trim(); const pct = parseFloat(window.$('config-plat-pct').value) || 0; const fixa = parseFloat(window.$('config-plat-fixa').value) || 0;
    if(!nome) return alert("Digite o nome da plataforma.");
    let plats = JSON.parse(localStorage.getItem('minimundo_plataformas') || '[]'); plats.push({nome: nome, pct: pct, fixa: fixa}); localStorage.setItem('minimundo_plataformas', JSON.stringify(plats));
    window.$('config-plat-nome').value = ""; window.$('config-plat-pct').value = ""; window.$('config-plat-fixa').value = ""; window.renderizarPlataformas();
};
window.excluirPlataforma = function(idx) {
    let plats = JSON.parse(localStorage.getItem('minimundo_plataformas') || '[]'); plats.splice(idx, 1); localStorage.setItem('minimundo_plataformas', JSON.stringify(plats)); window.renderizarPlataformas();
};

// ==========================================
// MÓDULO ÍMAS NFC (MYSQL)
// ==========================================
window.carregarImas = async function() { 
    window.$('loading-imas').style.display = 'block'; window.$('lista-imas-admin').innerHTML = ''; 
    try { 
        const r = await fetch(API_PRECIFICACAO + "?acao=listar_imas"); const res = await r.json(); 
        if (res.sucesso) { window.arrayImas = res.imas; window.renderListaImas(window.arrayImas); } else { throw new Error("Erro ao buscar imas."); } 
    } catch (e) { window.addLog(`Erro Ímãs: ${e.message}`, "error"); } finally { window.$('loading-imas').style.display = 'none'; } 
};

window.renderListaImas = function(arr) { 
    const lE = window.$('lista-imas-admin'); 
    if (arr.length === 0) { lE.innerHTML = "<p style='text-align:center;color:#999;padding:20px;'>Nenhum ímã cadastrado.</p>"; return; } 
    let h = ""; 
    arr.forEach(i => { 
        const statusVisual = i.linkVideoYoutube ? `<span class="tag-ativo">🎬 Vídeo Ativo</span>` : `<span class="tag-pendente">⏳ Teaser</span>`; 
        let dataFormatada = "Sem data alvo"; 
        if(i.dataLiberacao) { let d = new Date(i.dataLiberacao); if(!isNaN(d)) dataFormatada = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} às ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; } 
        const fotoUrl = i.foto ? i.foto.split(',')[0].trim() : 'logo.png'; const linkNfc = `https://diario.vivainteligente.net/ima-nfc/?id=${i.id}`; 
        h += `<div class="list-item"><img src="${fotoUrl}" class="list-img" onerror="this.src='logo.png'"><div class="list-info"><h4 class="list-nome">ID: ${i.id} - ${i.nomes}</h4><div class="list-detalhes">🗓️ Liberação: ${dataFormatada}</div><div style="margin-top:8px;">${statusVisual}</div></div><div style="display:flex; gap:8px;"><button class="btn-novera" style="background:#e0f2fe; border-color:#bae6fd; color:#0369a1; width:auto; padding:0 12px; font-weight:bold; font-size:0.8rem;" onclick="window.copiarLinkNfc('${linkNfc}')" title="Copiar Link">🔗 Link</button><button class="btn-novera btn-n-editar" onclick="window.abrirModalEditarIma(${i.linha})" title="Editar Ímã">✏️</button></div></div>`; 
    }); 
    lE.innerHTML = h; 
};
window.copiarLinkNfc = function(link) {
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(link).then(() => { window.mostrarAlerta("Copiado!", "O link do ímã foi copiado!", "success"); }).catch(() => fallbackCopyTextToClipboard(link)); } else { fallbackCopyTextToClipboard(link); }
};
function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea"); textArea.value = text; textArea.style.top = "0"; textArea.style.left = "0"; textArea.style.position = "fixed"; document.body.appendChild(textArea); textArea.focus(); textArea.select();
    try { var successful = document.execCommand('copy'); if(successful) { window.mostrarAlerta("Copiado!", "O link foi copiado para a área de transferência!", "success"); } else { alert("Copie manualmente: " + text); } } catch (err) { alert("Copie manualmente: " + text); } document.body.removeChild(textArea);
}
window.filtrarImas = function() { const t = window.$('busca-imas').value.toLowerCase(); window.renderListaImas(window.arrayImas.filter(i => String(i.id).toLowerCase().includes(t) || i.nomes.toLowerCase().includes(t))); };

window.fazerUploadRedundante = async function(fC, ik) { 
    let urlOnion = ""; let urlImgBB = ""; 
    try { const fd = new FormData(); fd.append("imagem", fC); const rp = await fetch(API_ONIONSYS, {method:"POST", headers:{"Authorization":`Bearer ${TOKEN_ONIONSYS}`, "x-tenant-id":"MiniMundo"}, body:fd}); const tx = await rp.text(); if (rp.ok) { const rs = JSON.parse(tx); urlOnion = (rs.arquivos && rs.arquivos.length > 0) ? rs.arquivos[0].url : (rs.url || rs.link || rs.URL || (rs.filename ? `https://api.onionsys.com.br/arquivos/catalogo/${rs.filename}` : "")); window.addLog("✅ Imagem salva no servidor Primário.", "success"); } } catch (e) { window.addLog("⚠️ Servidor primário falhou.", "warn"); } 
    if (ik) { try { const fd2 = new FormData(); fd2.append("image", fC); const r2 = await fetch(`https://api.imgbb.com/1/upload?key=${ik}`, {method:"POST", body:fd2}); const d2 = await r2.json(); if (d2.success) { urlImgBB = d2.data.url; window.addLog("✅ Imagem salva no Backup (ImgBB).", "success"); } } catch (e) { window.addLog("⚠️ Servidor de backup falhou.", "warn"); } } 
    if (!urlOnion && !urlImgBB) throw new Error("Ambos os servidores falharam."); let urlsFinais = []; if (urlOnion) urlsFinais.push(urlOnion); if (urlImgBB) urlsFinais.push(urlImgBB); return urlsFinais.join(","); 
};

window.cadastrarIma = async function() { 
    const id = window.$('ima-id').value.trim(); const nomes = window.$('ima-nomes').value.trim(); const fFoto = window.$('ima-foto').files; const video = window.$('ima-video').value.trim(); const dataOriginal = window.$('ima-data').value; const ik = window.$('imgbb-key').value.trim(); const inputProd = document.getElementById("ima-foto-produto"); 
    if(!id || !nomes || fFoto.length === 0 || !inputProd.files[0]) return window.mostrarAlerta("Atenção", "Preencha ID, Nomes e as DUAS fotos (Cliente e Produto).", "warning"); 
    const b = window.$('btn-salvar-ima'); b.disabled = true; b.innerText = "⏳ Gerando..."; 
    try { 
        window.addLog(`Subindo foto do cliente...`, "info"); const urlsCliente = await window.fazerUploadRedundante(await window.comprimirImagem(fFoto[0], 600, 600, 0.8), ik); 
        window.addLog(`Subindo foto do produto físico...`, "info"); const urlsProduto = await window.fazerUploadRedundante(await window.comprimirImagem(inputProd.files[0], 600, 600, 0.8), ik); 
        const p = { acao: "salvar_ima", id: id, nomes: nomes, foto: urlsCliente, linkVideoYoutube: video, dataLiberacao: dataOriginal ? dataOriginal + ":00" : "", fotoProduto: urlsProduto }; 
        const r = await fetch(API_PRECIFICACAO, { method: "POST", body: JSON.stringify(p) }); const res = await r.json(); 
        if(res.sucesso) { window.mostrarAlerta("Sucesso!", "Ímã cadastrado com fotos personalizadas!", "success"); window.carregarImas(); } else { throw new Error(res.erro); }
    } catch (e) { window.addLog(`❌ ERRO: ${e.message}`, "error"); } finally { b.disabled = false; b.innerText = "✨ Gerar Ímã"; } 
};
window.abrirModalEditarIma = function(l) { 
    const i = window.arrayImas.find(x => x.linha === l); if(!i) return; 
    window.$('edit-ima-linha').value = i.linha; window.$('edit-ima-nomes').value = i.nomes; window.$('edit-ima-video').value = i.linkVideoYoutube; window.$('edit-ima-foto-antiga').value = i.foto; window.$('edit-ima-img-preview').src = i.foto ? i.foto.split(',')[0].trim() : "logo.png"; window.$('edit-ima-foto').value = ""; window.$('edit-ima-foto-prod-antiga').value = i.fotoProduto || ""; 
    if(i.fotoProduto) { window.$('edit-ima-prod-preview').src = i.fotoProduto.split(',')[0].trim(); window.$('edit-ima-prod-preview').style.display = "block"; } else { window.$('edit-ima-prod-preview').style.display = "none"; } 
    window.$('edit-ima-foto-prod').value = ""; 
    if(i.dataLiberacao) { window.$('edit-ima-data').value = String(i.dataLiberacao).substring(0, 16); } else { window.$('edit-ima-data').value = ""; } 
    window.$('modal-editar-ima').style.display = 'flex'; 
};
window.salvarEdicaoIma = async function() { 
    const b = window.$('btn-salvar-edicao-ima'); b.disabled = true; b.innerText = "⏳ Atualizando..."; 
    try { 
        const ik = window.$('imgbb-key').value.trim(); const idAtual = window.arrayImas.find(x => x.linha == window.$('edit-ima-linha').value).id; 
        let fotoFinal = window.$('edit-ima-foto-antiga').value; const novaFoto = window.$('edit-ima-foto').files; let fotoProdFinal = window.$('edit-ima-foto-prod-antiga').value; const novaFotoProd = window.$('edit-ima-foto-prod').files; 
        if(novaFoto.length > 0) { window.addLog(`Atualizando foto do cliente...`, "info"); fotoFinal = await window.fazerUploadRedundante(await window.comprimirImagem(novaFoto[0], 600, 600, 0.8), ik); } 
        if(novaFotoProd.length > 0) { window.addLog(`Atualizando foto do produto...`, "info"); fotoProdFinal = await window.fazerUploadRedundante(await window.comprimirImagem(novaFotoProd[0], 600, 600, 0.8), ik); } 
        let dataLiberacaoStr = ""; if(window.$('edit-ima-data').value) { dataLiberacaoStr = window.$('edit-ima-data').value + ":00"; } 
        const p = { acao: "atualizar_ima", id: idAtual, nomes: window.$('edit-ima-nomes').value, foto: fotoFinal, linkVideoYoutube: window.$('edit-ima-video').value, dataLiberacao: dataLiberacaoStr, fotoProduto: fotoProdFinal }; 
        const r = await fetch(API_PRECIFICACAO, { method: "POST", body: JSON.stringify(p) }); const res = await r.json(); 
        if(res.sucesso) { window.addLog(`✅ Mágica Atualizada!`, "success"); window.$('modal-editar-ima').style.display = 'none'; window.carregarImas(); } else { throw new Error("Erro API."); }
    } catch (e) { window.addLog(`❌ Erro Update: ${e.message}`, "error"); } finally { b.disabled = false; b.innerText = "💾 Atualizar Mágica"; } 
};
window.confirmarExclusaoIma = function() { 
    const idBusca = window.$('edit-ima-linha').value; const i = window.arrayImas.find(x => x.linha == idBusca); if(!i) return; 
    window.$('nome-ima-excluir').innerText = i.nomes; window.$('modal-confirmar-exclusao-ima').style.display = 'flex'; 
    window.$('btn-executar-exclusao-ima').onclick = async function() { 
        window.$('modal-confirmar-exclusao-ima').style.display = 'none'; 
        try { const r = await fetch(API_PRECIFICACAO, { method: "POST", body: JSON.stringify({acao: "excluir_ima", id: i.id})}); const res = await r.json(); if(res.sucesso){ window.addLog("🗑️ Ímã excluído.", "success"); window.$('modal-editar-ima').style.display='none'; window.carregarImas(); } } catch(e) { window.mostrarAlerta("Erro", "Falha: " + e.message, "error"); }
    }; 
};

// ==========================================
// ADMIN: ANALYTICS E ANÚNCIOS (MYSQL)
// ==========================================
window.limparDatasManuais = function(){ window.$('data-inicio').value=""; window.$('data-fim').value=""; }; 
window.limparFiltrosRapidos = function(){ window.$('filtro-mes').value="todos"; window.$('filtro-ano').value="todos"; };

window.carregarAnalytics = async function(forcar=false){ 
    if(window.dadosTotaisAcessos.length>0&&!forcar)return; 
    window.$('loading-analytics').style.display='block'; window.$('painel-dashboard').style.display='none'; 
    try{ 
        // 🔥 AGORA PUXA DO MYSQL! 🔥
        const r=await fetch(API_PRECIFICACAO+"?acao=analytics"); 
        const res=await r.json(); 
        if(res.sucesso){window.dadosTotaisAcessos=res.dados; window.aplicarFiltros();}else throw new Error(res.erro); 
    }catch(e){ window.$('loading-analytics').style.display='none'; window.addLog(`❌ Erro Analytics: ${e.message}`,"error"); } 
};

window.aplicarFiltros = function(){ 
    window.$('loading-analytics').style.display='none'; 
    const mS=window.$('filtro-mes').value, aS=window.$('filtro-ano').value, tS=window.$('filtro-time').value.toLowerCase(), dI=window.$('data-inicio').value, dF=window.$('data-fim').value; 
    const filtrados=window.dadosTotaisAcessos.filter(i=>{ 
        if(!i.data||!i.time)return false; 
        if(tS!=="todos"){let tr=i.time.toLowerCase(); if(tS==="são paulo"&&(tr==="sao paulo"||tr==="são paulo")){}else if(tr!==tS)return false;} 
        const dT=new Date(i.data); 
        if(dI===""&&dF===""){if(aS!=="todos"&&String(dT.getFullYear())!==aS)return false; if(mS!=="todos"&&String(dT.getMonth()+1).padStart(2,'0')!==mS)return false; return true;} 
        if(dI!==""&&dF!==""){const di=new Date(dI),df=new Date(dF); df.setHours(23,59,59); return dT>=di&&dT<=df;} 
        return true; 
    }); 
    window.processarDashboard(filtrados); 
    window.$('painel-dashboard').style.display='block'; 
};

window.processarDashboard = function(arr){ 
    window.$('dash-total').innerText=arr.length; 
    if(arr.length===0){ 
        window.$('dash-media').innerText=`Média: 0/dia`; window.$('lista-ranking').innerHTML="<p style='text-align:center;color:#999;padding:20px;'>Nenhum acesso.</p>"; window.$('nome-campeao').innerText="-"; window.$('img-campeao').style.display="none"; window.$('dash-campeao').className="valor"; window.$('dash-pico').innerText=`Pico: Nenhum`; if(window.graficoInstancia)window.graficoInstancia.destroy(); return; 
    } 
    const cT={}, cD={}; arr.forEach(l=>{let t=String(l.time).trim(), d=l.data; if(t)cT[t]=(cT[t]||0)+1; if(d)cD[d]=(cD[d]||0)+1; }); 
    const td=Object.keys(cD).length; 
    window.$('dash-media').innerText=`Média: ${td>0?(arr.length/td).toFixed(1):0} acessos/dia`; 
    let mD="", mAd=0; for(const d in cD){if(cD[d]>mAd){mAd=cD[d];mD=d;}} 
    let dL=""; if(mD){const a=mD.split('-'); if(a.length===3)dL=`${a[2]}/${a[1]}`;} 
    window.$('dash-pico').innerText=`Pico: ${mAd} toques (${dL})`; 
    const aR=Object.keys(cT).map(t=>({nome:t,acessos:cT[t]})).sort((a,b)=>b.acessos-a.acessos); 
    const c=aR[0], iC=TIMES_INFO[c.nome.toLowerCase()]||{cor:"var(--brand-dark)",logo:""}; 
    window.$('nome-campeao').innerText=c.nome; const img=window.$('img-campeao'); if(iC.logo){img.src=iC.logo;img.style.display="block";}else img.style.display="none"; 
    window.$('dash-campeao').className="valor "+(iC.classText||""); 
    let hR="", lg=[], dg=[], cg=[]; const maxA=aR[0].acessos; 
    aR.forEach((i)=>{
        lg.push(i.nome);dg.push(i.acessos);let iT=TIMES_INFO[i.nome.toLowerCase()]||{cor:"var(--primary)",logo:""}; cg.push(iT.cor); 
        let p=Math.round((i.acessos/maxA)*100); 
        hR+=`<div class="ranking-item"><div class="ranking-nome"><img src="${iT.logo}" onerror="this.style.display='none'"><span class="${iT.classText||''}">${i.nome}</span></div><div class="progresso-bg"><div class="progresso-bar" style="width:${p}%; background-color:${iT.cor};"></div></div><div class="ranking-valor" style="color:${iT.cor};">${i.acessos}</div></div>`;
    }); 
    window.$('lista-ranking').innerHTML=hR; 
    window.renderizarGrafico(lg,dg,cg); 
};
window.renderizarGrafico = function(l,d,c){ const ctx=window.$('graficoAcessos').getContext('2d'); if(window.graficoInstancia)window.graficoInstancia.destroy(); window.graficoInstancia=new Chart(ctx,{type:'bar',data:{labels:l,datasets:[{data:d,backgroundColor:c,borderRadius:8,borderWidth:0,barPercentage:0.6}]},options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{display:false},tooltip:{backgroundColor:'#4E342E',titleFont:{size:14,family:'Inter'},bodyFont:{size:16,weight:'bold',family:'Inter'},padding:12,displayColors:false,callbacks:{label:ctx=>ctx.parsed.y+' toques'}}},scales:{y:{beginAtZero:true,ticks:{stepSize:1,precision:0}},x:{grid:{display:false}}},animation:{duration:800,easing:'easeOutQuart'}}}); };

window.ativarNotificacoesBrowser = function(){ if("Notification" in window){Notification.requestPermission().then(p=>{if(p==="granted"){window.$('btn-notifica').style.display="none";try{new Notification("Mini Mundo",{body:"Alertas ativados!",icon:"logo.png"});}catch(e){}}});} };
window.dispararAlertaSeHouverNovos = function(nA){ let pA=nA.filter(a=>a.status==="PENDENTE").length; if(window.quantidadeAnunciosPendentes===-1){window.quantidadeAnunciosPendentes=pA;return;} if(pA>window.quantidadeAnunciosPendentes){let eN=nA[nA.length-1].empresa; window.addLog(`🔔 ALERTA: Solicitação de ${eN}`,"warn"); try{if("Notification" in window&&Notification.permission==="granted"){new Notification("🚀 Novo Anunciante!",{body:`Empresa ${eN} solicitou anúncio.`,icon:"logo.png"});}}catch(e){} try{if("vibrate" in navigator)navigator.vibrate([200,100,200]);}catch(e){}} window.quantidadeAnunciosPendentes=pA; };

window.carregarAnunciosAdmin = async function(s=false){ 
    if(!s){window.$('loading-anuncios').style.display='block';window.$('lista-anuncios-admin').innerHTML='';} 
    try{
        // 🔥 AGORA PUXA DO MYSQL! 🔥
        const r=await fetch(API_PRECIFICACAO+"?acao=anuncios_admin");
        const res=await r.json(); 
        if(res.sucesso){window.anunciosAdminArray=res.anuncios.slice().reverse(); window.dispararAlertaSeHouverNovos(res.anuncios); if(!s||window.$('lista-anuncios-admin').innerHTML==="")window.renderListaAnuncios(window.anunciosAdminArray);}
    }catch(e){if(!s)window.addLog(`Erro anúncios: ${e.message}`,"error");}finally{window.$('loading-anuncios').style.display='none';} 
};

window.renderListaAnuncios = function(aA){ 
    const lE=window.$('lista-anuncios-admin'); 
    if(aA.length===0){lE.innerHTML="<p style='text-align:center;color:#999;padding:20px;'>Nenhum anúncio.</p>";return;} 
    let h=""; 
    aA.forEach((a)=>{
        let sB=""; if(a.status==="ATIVO")sB=`<span class="tag-ativo">Ativo</span>`;else if(a.status==="CANCELADO")sB=`<span class="tag-inativo">Cancelado</span>`;else sB=`<span class="tag-pendente">Pendente</span>`; 
        let vT=a.vencimento?`Vence em: ${a.vencimento.split('-').reverse().join('/')}`:"Sem vencimento"; 
        h+=`
        <div class="list-item">
            <div class="list-info">
                <h4 class="list-nome">${a.empresa}</h4>
                <div class="list-detalhes"><span style="color:var(--primary);font-weight:800;">${window.formatarPreco(a.valor_negociado)||"R$ 0,00"}</span> • ${vT} </div>
                <div style="margin-top:8px;">${sB}</div>
            </div>
            <a href="${a.zap_link}" target="_blank" class="btn-zap-lista">💬</a>
            <button class="btn-editar" onclick="window.abrirModalEditarAnuncio(${a.linha})">✏️</button>
        </div>`;
    }); 
    lE.innerHTML=h; 
};

window.filtrarAnuncios = function(){ const t=window.$('busca-anuncios').value.toLowerCase(); window.renderListaAnuncios(window.anunciosAdminArray.filter(a=>a.empresa.toLowerCase().includes(t)||a.status.toLowerCase().includes(t)||(a.cupom&&a.cupom.toLowerCase().includes(t)))); };
window.abrirModalEditarAnuncio = function(l){ const a=window.anunciosAdminArray.find(x=>x.linha===l); if(!a)return; window.$('edit-ad-linha').value=a.linha; window.$('edit-ad-empresa').value=a.empresa; window.$('edit-ad-status').value=a.status; window.$('edit-ad-vencimento').value=a.vencimento; window.$('edit-ad-valor').value=window.formatarPreco(a.valor_negociado); window.$('edit-ad-desc').value=a.descricao||""; window.$('edit-ad-cupom').value=a.cupom||""; window.$('edit-ad-foto-antiga').value=a.foto||""; window.$('edit-ad-logo-antiga').value=a.logo||""; window.$('edit-ad-logo-preview').src=a.logo||"logo.png"; window.$('edit-ad-banner-preview').src=a.foto||"logo.png"; window.$('edit-ad-logo-nova').value=""; window.$('edit-ad-banner-novo').value=""; window.$('modal-editar-anuncio').style.display='flex'; };

window.confirmarExclusaoAnuncio = function(){ 
    const l=parseInt(window.$('edit-ad-linha').value); const a=window.anunciosAdminArray.find(x=>x.linha===l); if(!a)return; 
    if(a.vencimento){const hj=new Date();hj.setHours(0,0,0,0);const p=a.vencimento.split('-');const vc=new Date(p[0],p[1]-1,p[2]);vc.setHours(23,59,59,999);if(vc>=hj){alert("❌ BLOQUEADO: Anúncio vigente.");return;}} 
    if(confirm(`EXCLUIR anúncio da ${a.empresa}?`)) window.excluirRegistroLocal("Anuncios",l,"btn-excluir-ad",()=>window.$('modal-editar-anuncio').style.display='none',window.carregarAnunciosAdmin); 
};

window.salvarEdicaoAnuncio = async function(){ 
    const btn=window.$('btn-salvar-edicao-ad'); btn.disabled=true; btn.innerText="⏳ Salvando..."; 
    try{ 
        const ik=window.$('imgbb-key').value.trim(); let lL=window.$('edit-ad-logo-antiga').value, lB=window.$('edit-ad-foto-antiga').value; const iL=window.$('edit-ad-logo-nova'); if(iL.files.length>0){window.addLog("Enviando logo...","info"); lL=await window.fazerUploadInteligente(await window.comprimirImagem(iL.files[0],400,400,0.8),ik,true);} const iB=window.$('edit-ad-banner-novo'); if(iB.files.length>0){window.addLog("Enviando banner...","info"); lB=await window.fazerUploadInteligente(await window.comprimirImagem(iB.files[0],800,800,0.8),ik,true);} 
        const p={acao:"atualizar_anuncio",linha:window.$('edit-ad-linha').value,status:window.$('edit-ad-status').value,vencimento:window.$('edit-ad-vencimento').value,valor_negociado:window.$('edit-ad-valor').value,descricao:window.$('edit-ad-desc').value,cupom:window.$('edit-ad-cupom').value,logo:lL,foto:lB}; 
        // 🔥 AGORA SALVA NO MYSQL! 🔥
        const r=await fetch(API_PRECIFICACAO,{method:"POST",body:JSON.stringify(p)}); 
        const res=await r.json(); 
        if(res.sucesso){window.addLog(`✅ Anúncio OK!`,"success");window.$('modal-editar-anuncio').style.display='none';window.carregarAnunciosAdmin();}else throw new Error("Erro banco de dados."); 
    }catch(e){alert("Erro: "+e.message);window.addLog(`❌ Erro: ${e.message}`,"error");}finally{btn.disabled=false;btn.innerText="💾 Salvar";} 
};

// ==========================================
// ADMIN: CATÁLOGO LOJA (MYSQL)
// ==========================================
window.carregarCatalogoAdmin = async function(){ 
    window.$('loading-catalogo').style.display='block'; window.$('lista-produtos-admin').innerHTML=''; 
    try{ 
        // 🔥 AGORA PUXA DO MYSQL! 🔥
        const r=await fetch(API_PRECIFICACAO+"?acao=catalogo_admin"); 
        const res=await r.json(); 
        if(res.sucesso){window.catalogoAdminArray=res.produtos.slice().reverse();window.renderListaCatalogo(window.catalogoAdminArray);} 
    }catch(e){window.addLog(`Erro catálogo: ${e.message}`,"error");}finally{window.$('loading-catalogo').style.display='none';} 
};

window.renderListaCatalogo = function(aP){ 
    const lE=window.$('lista-produtos-admin'); 
    if(aP.length===0){lE.innerHTML="<p style='text-align:center;color:#999;padding:20px;'>Nenhum produto.</p>";return;} 
    let h=""; 
    aP.forEach(p=>{
        const fP=p.foto.split(',')[0].trim()||'logo.png'; 
        const sB=p.ativo?`<span class="tag-ativo">Ativo</span>`:`<span class="tag-inativo">Inativo</span>`; 
        h+=`
        <div class="list-item">
            <img src="${fP}" class="list-img" onerror="this.src='logo.png'">
            <div class="list-info">
                <h4 class="list-nome">${p.nome}</h4>
                <div class="list-detalhes"><span style="color:var(--primary);font-weight:800;">${window.formatarPreco(p.preco)}</span> • ${p.categoria} </div>
                <div style="margin-top:8px;">${sB}</div>
            </div>
            <div style="display:flex; gap:6px; flex-shrink:0;">
                <button class="btn-novera btn-n-editar" onclick="window.abrirModalEditarProduto(${p.linha})" title="Editar Produto">✏️</button>
            </div>
        </div>`;
    }); 
    lE.innerHTML=h; 
};

window.filtrarCatalogo = function(){ const t=window.$('busca-catalogo').value.toLowerCase(); window.renderListaCatalogo(window.catalogoAdminArray.filter(p=>p.nome.toLowerCase().includes(t)||p.categoria.toLowerCase().includes(t)||String(p.preco).toLowerCase().includes(t))); };
window.abrirModalEditarProduto = function(l){ const p=window.catalogoAdminArray.find(x=>x.linha===l); if(!p)return; window.$('edit-prod-linha').value=p.linha; window.$('edit-prod-nome').value=p.nome; window.$('edit-prod-preco').value=window.formatarPreco(p.preco); window.$('edit-prod-categoria').value=p.categoria; window.$('edit-prod-desc').value=p.descricao; window.$('edit-prod-status').value=p.ativo?"true":"false"; window.$('edit-prod-foto-antiga').value=p.foto||""; window.$('edit-prod-img-preview').src=(p.foto&&p.foto.split(',')[0])?p.foto.split(',')[0]:"logo.png"; window.$('edit-prod-fotos-novas').value=""; window.$('modal-editar-produto').style.display='flex'; };

window.confirmarExclusaoProduto = function(){ 
    const l=parseInt(window.$('edit-prod-linha').value); const p=window.catalogoAdminArray.find(x=>x.linha===l); if(!p)return; 
    if(confirm(`EXCLUIR produto "${p.nome}"?`)) window.excluirRegistroLocal("Catalogo",l,"btn-excluir-prod",()=>window.$('modal-editar-produto').style.display='none',window.carregarCatalogoAdmin); 
};

window.salvarEdicaoProduto = async function(){ 
    const b=window.$('btn-salvar-edicao-prod'); b.disabled=true; b.innerText="⏳ Salvando..."; 
    try{ 
        const ik=window.$('imgbb-key').value.trim(); let lF=window.$('edit-prod-foto-antiga').value; const iF=window.$('edit-prod-fotos-novas'); if(iF.files.length>0){let nL=[]; for(let i=0;i<iF.files.length;i++){window.addLog(`Enviando foto ${i+1}...`,"info"); nL.push(await window.fazerUploadInteligente(await window.comprimirImagem(iF.files[i],1000,1000,0.8),ik,false));} lF=nL.join(",");} 
        const p={acao:"atualizar_produto",linha:window.$('edit-prod-linha').value,nome:window.$('edit-prod-nome').value,preco:window.$('edit-prod-preco').value,categoria:window.$('edit-prod-categoria').value,descricao:window.$('edit-prod-desc').value,ativo:window.$('edit-prod-status').value==="true",foto:lF}; 
        // 🔥 AGORA SALVA NO MYSQL! 🔥
        const r=await fetch(API_PRECIFICACAO,{method:"POST",body:JSON.stringify(p)}); 
        const res=await r.json(); 
        if(res.sucesso){window.addLog(`✅ Produto OK!`,"success");window.$('modal-editar-produto').style.display='none';window.carregarCatalogoAdmin();window.$('busca-catalogo').value="";}else throw new Error("Erro db."); 
    }catch(e){alert("Erro: "+e.message);window.addLog(`❌ Erro produto: ${e.message}`,"error");}finally{b.disabled=false;b.innerText="💾 Salvar";} 
};

window.fileToBase64 = f=>new Promise((r,j)=>{const rd=new FileReader();rd.readAsDataURL(f);rd.onload=()=>r(rd.result.split(',')[1]);rd.onerror=e=>j(e);});
window.comprimirImagem = function(f,mW,mH,q){ return new Promise((r,j)=>{ if(!f.type.match(/image.*/))return j(new Error(`Formato inválido.`)); const rd=new FileReader();rd.readAsDataURL(f); rd.onload=e=>{ const i=new Image();i.src=e.target.result; i.onload=()=>{ let w=i.width,h=i.height; if(w>h){if(w>mW){h=Math.round(h*mW/w);w=mW;}}else{if(h>mH){w=Math.round(w*mH/h);h=mH;}} const cv=document.createElement('canvas');cv.width=w;cv.height=h; const cx=cv.getContext('2d');cx.drawImage(i,0,0,w,h); const nU=Date.now()+"_"+f.name.replace(/[^a-zA-Z0-9.]/g,'_').toLowerCase(); cv.toBlob(b=>b?r(new File([b],nU,{type:'image/jpeg'})):j(new Error("Compressão.")),'image/jpeg',q); };};}); };

window.cadastrarProdutoIA = async function(){ 
    const ak=window.$('api-key').value.trim(), ik=window.$('imgbb-key').value.trim(), n=window.$('prod-nome').value.trim(), p=window.$('prod-preco').value.trim(), f=window.$('prod-fotos').files, b=window.$('btn-salvar-produto'); 
    if(!ak){window.switchTab('config');return window.addLog("❌ ERRO: Coloque a chave da IA (Gemini)!","error");} 
    if(!n||!p||f.length===0)return window.addLog("⚠️ Preencha Nome, Preço e escolha Foto.","warn"); 
    b.disabled=true; b.innerText="⏳ Analisando..."; 
    try{ 
        window.addLog(`Cadastrando: ${n}...`,"warn"); const b6=await window.fileToBase64(f[0]); let ls=[]; for(let i=0;i<f.length;i++){window.addLog(`⏳ Foto ${i+1}...`,"info"); const urlF=await window.fazerUploadInteligente(await window.comprimirImagem(f[i],1000,1000,0.8),ik,false); ls.push(urlF); window.addLog(`✅ Foto ${i+1} online.`,"success");} window.addLog(`🤖 IA criando copy...`,"info"); 
        const pr=`Atue como Copywriter Sênior da 'Mini Mundo 3D', marca de impressão 3D.\nTítulo: ${n}\nPreço: ${p}\nResponda EXATAMENTE neste formato (sem asteriscos ou negrito):\nDescricao: [Sua copy em até 3 frases vendendo o produto]\nCategoria: [1 ou 2 palavras definindo a categoria]`; 
        const rI=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${ak}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:pr},{inlineData:{mimeType:f[0].type,data:b6}}]}]})}); 
        if(!rI.ok)throw new Error("IA não respondeu."); const dI=await rI.json(); const resIA=dI.candidates[0].content.parts[0].text; let ds="Exclusivo Mini Mundo 3D.", ct="Geral"; let mD=resIA.match(/descri[cç][aã]o:\s*(.*)/i); if(mD)ds=mD[1].replace(/\*/g,'').trim(); let mC=resIA.match(/categoria:\s*(.*)/i); if(mC)ct=mC[1].replace(/\*/g,'').trim(); window.addLog(`💾 Salvando na Base de Dados...`,"info"); 
        // 🔥 AGORA SALVA NO MYSQL! 🔥
        const rS=await fetch(API_PRECIFICACAO,{method:"POST",body:JSON.stringify({acao:"salvar_produto",nome:n,descricao:ds,preco:p,foto:ls.join(","),categoria:ct})}); 
        const resS=await rS.json(); 
        if(resS.sucesso){window.addLog(`🎉 PRODUTO CADASTRADO!`,"success");window.$('prod-nome').value="";window.$('prod-preco').value="";window.$('prod-fotos').value="";window.carregarCatalogoAdmin();}else throw new Error("API falhou."); 
    }catch(e){window.addLog(`❌ ERRO: ${e.message}`,"error");}finally{b.disabled=false;b.innerText="✨ Enviar e Cadastrar";} 
};

// ==========================================
// ADMIN: QUIZ (MANTIDO NO GOOGLE SHEETS)
// ==========================================
window.salvarChaves = function(){ localStorage.setItem("gemini_api_key",window.$('api-key').value); localStorage.setItem("imgbb_api_key",window.$('imgbb-key').value); };
window.atualizarBadgeUltimo = function(){ const uT=localStorage.getItem("ultimo_time_gerado"), uH=localStorage.getItem("ultimo_horario_gerado"); if(uT&&uH)window.$('badge-ultimo').innerHTML=`🕒 Último: <b>${uT}</b> (${uH})`; };
window.carregarInfoBanco = async function(){ const s=window.$('time'), bT=window.$('badge-total'); bT.innerHTML=`⏳ Contando...`; try{const r=await fetch(s.value);const d=await r.json();bT.innerHTML=`📊 Total: <b>${(d.quiz&&Array.isArray(d.quiz))?d.quiz.length:0} perguntas</b>`;}catch(e){bT.innerHTML=`⚠️ Erro.`;} };
window.processarTimeUnico = async function(tN,tU,q,aK,t,d,mR){ window.addLog(`>> GERANDO: ${tN.toUpperCase()}`,"warn"); const pr=`Gere ${q} perguntas sobre história do ${tN} (Dificuldade: ${d}). ${t?`Tema OBRIGATÓRIO: "${t}".`:`Varie temas.`}\nREGRAS: Fatos históricos, max 15 palavras/perg, max 4 palavras/opc.\nFormato ESTRITO:\nPergunta: [Texto]\nA) [Opc 1]\nB) [Opc 2]\nC) [Opc 3]\nD) [Opc 4]\nCorreta: [1 a 4]\nAPENAS o texto puro.`; let tx=null; for(let i=1;i<=3;i++){const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${aK}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:pr}]}]})}); if(r.ok){const ds=await r.json();tx=ds.candidates[0].content.parts[0].text;window.addLog(`IA respondeu!`,"success");break;} if(r.status===429&&i<3){window.addLog(`⚠️ Limite IA. Tentando em 5s...`,"warn");await window.delay(5000);continue;} throw new Error(`IA recusou (${r.status}).`);} const pg=[]; tx.split(/(?:Pergunta|Q):/i).filter(b=>b.trim().length>0).forEach(b=>{const l=b.trim().split('\n').map(x=>x.trim()).filter(x=>x!==''); if(l.length>=5){let c=1,lC=l.find(x=>/Correta/i.test(x));if(lC){let m=lC.match(/\d+/);if(m)c=parseInt(m[0]);} pg.push({pergunta:l[0],opcoes:[l[1].replace(/^[A-D1-4][\)\.-]?\s*/i,''),l[2].replace(/^[A-D1-4][\)\.-]?\s*/i,''),l[3].replace(/^[A-D1-4][\)\.-]?\s*/i,''),l[4].replace(/^[A-D1-4][\)\.-]?\s*/i,'')],correta:c});} }); if(pg.length===0)throw new Error("IA gerou texto inválido."); window.addLog(`Geradas ${pg.length} perguntas.`,"info"); if(mR)window.addLog(`⚠️ Reciclagem!`,"error"); const rP=await fetch(tU,{method:"POST",body:JSON.stringify({acao:"salvar_quiz",perguntas:pg,substituir:mR})}); const rS=await rP.json(); if(rS.sucesso){window.addLog(`✅ SUCESSO!`,"success");localStorage.setItem("ultimo_time_gerado",tN);localStorage.setItem("ultimo_horario_gerado",new Date().toLocaleString('pt-BR'));}else throw new Error(rS.erro); };
window.iniciarAutomacao = async function(mG){ const aK=window.$('api-key').value.trim(); if(!aK){window.switchTab('config');return window.addLog("ERRO: Chave Gemini!","error");} const q=window.$('qtd').value,t=window.$('tema').value.trim(),d=window.$('dificuldade').value,mR=window.$('substituir').checked,bU=window.$('btn-iniciar'),bG=window.$('btn-global'); bU.disabled=true;bG.disabled=true; try{ if(mG){window.addLog(`--- LOTE GLOBAL ---`,"warn"); const o=Array.from(window.$('time').options); for(let i=0;i<o.length;i++){try{await window.processarTimeUnico(o[i].getAttribute("data-nome"),o[i].value,q,aK,t,d,mR);}catch(e){window.addLog(`❌ ERRO ${o[i].getAttribute("data-nome")}: ${e.message}`,"error");} if(i<o.length-1){window.addLog("Aguardando 5s...","info");await window.delay(5000);}} window.addLog(`--- FINALIZADO ---`,"success");}else{const s=window.$('time');await window.processarTimeUnico(s.options[s.selectedIndex].getAttribute("data-nome"),s.value,q,aK,t,d,mR);} window.atualizarBadgeUltimo();window.carregarInfoBanco(); }catch(er){window.addLog(`FALHA: ${er.message}`,"error");}finally{bU.disabled=false;bG.disabled=false;} };

// ==========================================
// ERP: CALCULADORA E MODELOS (AGORA NO MYSQL)
// ==========================================
window.toggleConfig = function(){ const a=window.$('area-config'); a.style.display=a.style.display==="block"?"none":"block"; };
window.calcular = function(){ const vW=parseFloat(window.$('v-watts').value)||0, vK=parseFloat(window.$('v-kwh').value)||0, vM=parseFloat(window.$('v-maq').value)||0, vH=parseFloat(window.$('v-hora').value)||0, f=parseFloat(window.$('v-filamento').value)||0, p=parseFloat(window.$('v-peso').value)||0, tI=parseFloat(window.$('v-tempo-imp').value)||0, tM=parseFloat(window.$('v-tempo-mao').value)||0, ins=parseFloat(window.$('v-insumos').value)||0; const cMat=(f/1000)*p, cEne=(vW/1000)*tI*vK, cDep=tI*vM, cHum=tM*vH, cFa=(cMat+cEne+cDep+cHum)*0.10, cTot=cMat+cEne+cDep+cHum+cFa+ins; window.custoTotalGlobal=cTot; window.$('r-material').innerText=window.fmt(cMat); window.$('r-energia').innerText=window.fmt(cEne); window.$('r-deprec').innerText=window.fmt(cDep); window.$('r-humano').innerText=window.fmt(cHum); window.$('r-falha').innerText=window.fmt(cFa); window.$('r-insumos').innerText=window.fmt(ins); window.$('r-total').innerText=window.fmt(cTot); const psMi=(cTot*2)+cHum, psMa=(cTot*3)+cHum, pdMi=(cTot*4)+cHum, pdMa=(cTot*6)+cHum; window.$('m-simples-preco').innerText=`${window.fmt(psMi)} ou ${window.fmt(psMa)}`; window.$('m-simples-lucro').innerText=`Lucro: ${window.fmt(psMi-cTot)} a ${window.fmt(psMa-cTot)}`; window.$('m-decor-preco').innerText=`${window.fmt(pdMi)} ou ${window.fmt(pdMa)}`; window.$('m-decor-lucro').innerText=`Lucro: ${window.fmt(pdMi-cTot)} a ${window.fmt(pdMa-cTot)}`; };
window.salvarBancoModelos = async function(){ const m=window.$('v-modelo').value.trim(); if(!m)return window.mostrarAlerta("Atenção","Digite o Nome do Modelo.","warning"); const btn=window.$('btn-salvar-custo'); btn.disabled=true; btn.innerText="⏳ Salvando..."; try{ const p={acao:"salvar_custo",modelo:m,peso:window.$('v-peso').value,tempo:window.$('v-tempo-imp').value,insumos:window.fmtPlanilha(parseFloat(window.$('v-insumos').value)||0),custo_total:window.fmtPlanilha(window.custoTotalGlobal)}; const r=await fetch(API_PRECIFICACAO,{method:"POST",body:JSON.stringify(p)}); const res=await r.json(); if(res.sucesso){window.mostrarAlerta("Sucesso!","Produto salvo!","success");window.$('v-modelo').value="";}else if(res.erro==="DUPLICADO"){window.mostrarAlerta("Duplicado","Já existe no banco.","warning");}else throw new Error(res.erro); }catch(e){window.mostrarAlerta("Erro",e.message,"error");}finally{btn.disabled=false;btn.innerText="💾 Salvar Modelo no Banco";} };
window.carregarBancoDeCustos = async function(){ window.$('loading-banco').style.display="block"; window.$('lista-banco').innerHTML=""; try{ const r=await fetch(API_PRECIFICACAO+"?acao=listar_custos"); const res=await r.json(); if(res.sucesso){window.arrayBancoCustos=res.produtos;window.renderizarListaBanco(window.arrayBancoCustos);}else throw new Error(res.erro); }catch(e){window.$('loading-banco').innerHTML="❌ Erro na Planilha.";}finally{window.$('loading-banco').style.display="none";} };
window.renderizarListaBanco = function(aP){ const lD=window.$('lista-banco'); lD.innerHTML=""; if(aP.length===0){lD.innerHTML="<p style='text-align:center;color:#999;padding:20px;font-weight:600;'>Nenhum modelo.</p>";return;} let h=""; aP.forEach(p=>{h+=`<div class="produto-banco-card"><div class="pb-info"><h4 class="pb-nome">${p.modelo}</h4><div class="pb-detalhes"><span class="pb-tag">⚖️ ${p.peso||"0"}g</span><span class="pb-tag">⏱️ ${p.tempo||"0"}h</span><span class="pb-tag">📦 ${window.formatarDoBanco(p.insumos)}</span></div></div><div class="pb-custo">${window.formatarDoBanco(p.custo_total)}</div></div>`;}); lD.innerHTML=h; };
window.filtrarBanco = function(){ const t=window.$('busca-banco').value.toLowerCase(); window.renderizarListaBanco(window.arrayBancoCustos.filter(p=>p.modelo.toLowerCase().includes(t))); };

// ==========================================
// ERP: DESPESAS (AGORA NO MYSQL)
// ==========================================
window.calcularDespesaTotal = function(){ const q=parseFloat(window.$('d-qtd').value.replace(',','.'))||1, vU=window.limparValorPlanilha(window.$('d-valor-uni').value); window.despesaTotalCalculada=q*vU; window.$('d-total-calc').innerText=window.fmt(window.despesaTotalCalculada); };
window.carregarDespesas = async function(){ window.$('loading-despesas').style.display="block"; window.$('lista-despesas').innerHTML=""; try{ const r=await fetch(API_PRECIFICACAO+"?acao=listar_despesas"); const res=await r.json(); if(res.sucesso){window.arrayDespesas=res.despesas;window.alimentarDatalistE_Filtro(window.arrayDespesas);window.filtrarDespesas();}else throw new Error(res.erro); }catch(e){window.$('loading-despesas').innerHTML="❌ Erro.";}finally{window.$('loading-despesas').style.display="none";} };
window.alimentarDatalistE_Filtro = function(aD){ const dI=window.$('lista-itens-sugestao'), dL=window.$('lista-locais-sugestao'), fL=window.$('filtro-d-local'); const iU=[...new Set(aD.map(d=>d.item.trim()))].filter(i=>i), lU=[...new Set(aD.map(d=>d.local.trim()))].filter(i=>i); dI.innerHTML=iU.map(n=>`<option value="${n}">`).join(''); dL.innerHTML=lU.map(n=>`<option value="${n}">`).join(''); fL.innerHTML='<option value="todos">Todos os Locais</option>'+lU.map(n=>`<option value="${n}">${n}</option>`).join(''); };
window.limparFiltrosDespesas = function(){ window.$('filtro-d-mes').value="todos"; window.$('filtro-d-ano').value="todos"; window.$('filtro-d-local').value="todos"; window.$('busca-despesa').value=""; window.filtrarDespesas(); };
window.filtrarDespesas = function(){ const mS=window.$('filtro-d-mes').value, aS=window.$('filtro-d-ano').value, lS=window.$('filtro-d-local').value.toLowerCase(), tB=window.$('busca-despesa').value.toLowerCase(); const flt=window.arrayDespesas.filter(d=>{ if(tB&&!d.item.toLowerCase().includes(tB))return false; if(lS!=="todos"&&d.local.toLowerCase()!==lS)return false; if(mS!=="todos"||aS!=="todos"){let pt=[]; if(d.data.includes('/'))pt=d.data.split('/'); else if(d.data.includes('-')){let p=d.data.split('-');pt=[p[2],p[1],p[0]];} else if(d.data.includes(' ')){let td=new Date(d.data);if(!isNaN(td))pt=[td.getDate(),String(td.getMonth()+1).padStart(2,'0'),td.getFullYear()];} if(pt.length>=3){let m=String(pt[1]).padStart(2,'0'), a=String(pt[2]).substring(0,4); if(mS!=="todos"&&m!==mS)return false; if(aS!=="todos"&&a!==aS)return false;}else return false;} return true; }); window.renderizarListaDespesas(flt); };
window.renderizarListaDespesas = function(aD){ const lD=window.$('lista-despesas'); lD.innerHTML=""; let sT=0; if(aD.length===0){lD.innerHTML="<p style='text-align:center;color:#999;padding:20px;font-weight:600;'>Nenhuma despesa.</p>";window.$('total-despesas-valor').innerText="R$ 0,00";return;} let h=""; aD.forEach(d=>{let nG=window.limparValorPlanilha(d.valor); sT+=nG; let dH=`<div class="pb-detalhes" style="flex-direction:column;gap:8px;align-items:flex-start;margin-top:5px;"><div style="display:flex;gap:10px;flex-wrap:wrap;"><span style="color:#64748b;">📅 ${d.data}</span><span style="color:#64748b;">🏢 ${d.local}</span></div>`; if(d.quantidade&&d.preco_uni&&d.preco_uni!=="R$ 0,00"){dH+=`<div style="display:flex;gap:10px;flex-wrap:wrap;"><span style="color:#64748b;">📦 Qtd: ${d.quantidade}</span><span style="color:#64748b;">💲 ${window.formatarDoBanco(d.preco_uni)} /un</span></div>`;} dH+=`</div>`; h+=`<div class="produto-banco-card"><div class="pb-info"><h4 class="pb-nome" style="color:#334155;">${d.item}</h4>${dH}</div><div class="pb-custo" style="background:transparent;border:none;color:#ef4444;font-size:1.1rem;padding-right:0;">- ${window.fmt(nG)}</div></div>`;}); lD.innerHTML=h; window.$('total-despesas-valor').innerText=window.fmt(sT); };
window.salvarDespesa = async function(){ const dC=window.$('d-data').value, lC=window.$('d-local').value.trim(), iC=window.$('d-item').value.trim(), qC=window.$('d-qtd').value, vU=window.$('d-valor-uni').value; if(!dC||!iC||!vU||!lC)return window.mostrarAlerta("Atenção","Preencha tudo.","warning"); const btn=window.$('btn-salvar-despesa'); btn.disabled=true; btn.innerText="⏳ Lançando..."; try{ const p={acao:"salvar_despesa",item:iC,local:lC,data:dC.split('-').reverse().join('/'),quantidade:qC,preco_uni:window.fmtPlanilha(window.limparValorPlanilha(vU)),preco_total:window.fmtPlanilha(window.despesaTotalCalculada)}; const r=await fetch(API_PRECIFICACAO,{method:"POST",body:JSON.stringify(p)}); const res=await r.json(); if(res.sucesso){window.mostrarAlerta("Lançado!","Registrado.","success");window.$('d-item').value="";window.$('d-valor-uni').value="";window.$('d-qtd').value="1";window.calcularDespesaTotal();window.carregarDespesas();}else throw new Error(res.erro); }catch(e){window.mostrarAlerta("Erro",e.message,"error");}finally{btn.disabled=false;btn.innerText="💳 Lançar Despesa";} };

// ==========================================
// ERP: VENDAS, RELATÓRIOS E AÇÕES EM LOTE (AGORA NO MYSQL)
// ==========================================
window.formatarTextoZap = function(texto) { return encodeURIComponent(texto); };

window.enviarZapCobranca = function(linha) {
    const v = window.arrayVendas.find(x => x.linha === linha);
    if(!v) return;
    let inputEl = document.getElementById('lote-nome-personalizado');
    let nome = (inputEl && inputEl.value.trim()) ? inputEl.value.trim() : v.cliente;
    let texto = `Olá, *${nome}*! Aqui é do *Mini Mundo 3D* 🌍🖨️.\n\nPassando para lembrar sobre o pagamento do seu pedido:\n\n🏷️ *Item:* ${v.produto} (x${v.qtd})\n💰 *Valor:* ${window.fmt(window.limparValorPlanilha(v.valor_venda))}\n📅 *Data:* ${v.data}\n\nAssim que puder, nos envie o comprovante para darmos andamento à produção! Qualquer dúvida, estamos à disposição. 🚀`;
    window.open(`https://api.whatsapp.com/send?text=${window.formatarTextoZap(texto)}`, '_blank');
};

window.enviarZapRecibo = function(linha) {
    const v = window.arrayVendas.find(x => x.linha === linha);
    if(!v) return;
    let inputEl = document.getElementById('lote-nome-personalizado');
    let nome = (inputEl && inputEl.value.trim()) ? inputEl.value.trim() : v.cliente;
    let dataPgto = v.data_pgt ? v.data_pgt : v.data;
    let texto = `Olá, *${nome}*! Aqui é do *Mini Mundo 3D* 🌍🖨️.\n\nPassando para confirmar o recebimento do seu pagamento!\n\n✅ *Status:* PAGO\n🏷️ *Item:* ${v.produto} (x${v.qtd})\n💰 *Valor Pago:* ${window.fmt(window.limparValorPlanilha(v.valor_venda))}\n💳 *Pago em:* ${dataPgto}\n\nMuito obrigado pela confiança! Seu pedido está sendo preparado com muito carinho nas nossas impressoras. 🖨️✨`;
    window.open(`https://api.whatsapp.com/send?text=${window.formatarTextoZap(texto)}`, '_blank');
};

window.solicitarNomeDocumento = function(linha, tipo) {
    const v = window.arrayVendas.find(x => x.linha === linha);
    if(!v) return;
    window.$('recibo-linha-atual').value = linha;
    window.$('recibo-tipo-atual').value = tipo;
    window.$('input-nome-recibo').value = v.cliente; 
    window.$('modal-nome-recibo').style.display = 'flex';
};

window.executarDocumentoUnico = function() {
    const linha = parseInt(window.$('recibo-linha-atual').value);
    const tipo = window.$('recibo-tipo-atual').value;
    const nome = window.$('input-nome-recibo').value.trim() || "Cliente";
    const v = window.arrayVendas.find(x => x.linha === linha);
    
    if(!v) return;
    window.$('modal-nome-recibo').style.display = 'none';

    const grupos = {};
    grupos[nome] = [v];
    window.gerarHTMLImpressao(grupos, tipo);
};

window.abrirModalAcoesLote = function() {
    window.$('modal-acoes-lote').style.display = 'flex';
    window.carregarLote('Pendente'); 
};

window.carregarLote = function(tipo) {
    window.loteAtualTipo = tipo;
    window.$('btn-lote-pendentes').classList.remove('active');
    window.$('btn-lote-pagos').classList.remove('active');
    window.$('btn-lote-' + (tipo === 'Pendente' ? 'pendentes' : 'pagos')).classList.add('active');

    const select = window.$('lote-select-cliente');
    const filtradosGlobais = window.arrayVendas.filter(v => v.status.toLowerCase() === tipo.toLowerCase());

    if(filtradosGlobais.length === 0) {
        select.innerHTML = '<option value="">Nenhuma venda encontrada</option>';
        select.disabled = true;
        window.$('lista-acoes-lote').innerHTML = '';
        window.$('lote-nome-personalizado').value = '';
        return;
    }

    select.disabled = false;
    const clientesSet = new Set(filtradosGlobais.map(v => v.cliente.trim()));
    const clientesArr = [...clientesSet].sort();

    select.innerHTML = '<option value="">-- Escolha um cliente --</option>' + 
                       clientesArr.map(c => `<option value="${c}">${c}</option>`).join('');
    
    window.$('lista-acoes-lote').innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:10px; font-size:0.8rem;">Selecione um cliente acima para ver os pedidos.</p>';
    window.$('lote-nome-personalizado').value = '';
};

window.selecionarClienteLote = function() {
    const clienteSel = window.$('lote-select-cliente').value;
    const lista = window.$('lista-acoes-lote');
    
    if(!clienteSel) {
        lista.innerHTML = '';
        window.$('lote-nome-personalizado').value = '';
        return;
    }

    window.$('lote-nome-personalizado').value = clienteSel;

    const filtradosDoCliente = window.arrayVendas.filter(v => v.status.toLowerCase() === window.loteAtualTipo.toLowerCase() && v.cliente.trim() === clienteSel);
    
    let h = "";
    filtradosDoCliente.forEach(v => {
        let onClickFn = window.loteAtualTipo === 'Pendente' ? `window.enviarZapCobranca(${v.linha})` : `window.enviarZapRecibo(${v.linha})`;
        h += `
        <div class="lote-item">
            <input type="checkbox" class="lote-check" value="${v.linha}" checked>
            <div style="flex-grow:1; overflow:hidden;">
                <div style="font-size:0.8rem; color:var(--brand-dark); font-weight:800; line-height:1.2; margin-bottom:3px;">
                    ${v.qtd}x ${v.produto}
                </div>
                <div style="font-size:0.7rem; color:var(--text-muted);">
                    Data: ${v.data} | <b style="color:var(--primary);">${window.fmt(window.limparValorPlanilha(v.valor_venda))}</b>
                </div>
            </div>
            <button class="btn-editar" style="background:#25D366; color:#fff; border:none; padding:8px; font-size:1rem; border-radius:8px; box-shadow:0 4px 6px rgba(37,211,102,0.3);" title="Enviar WhatsApp Individual" onclick="${onClickFn}">💬</button>
        </div>`;
    });
    lista.innerHTML = h;
};

window.gerarPDFLote = function(tipo) {
    const checks = document.querySelectorAll('.lote-check:checked');
    if (checks.length === 0) return window.mostrarAlerta("Atenção", "Selecione pelo menos um pedido do cliente.", "warning");

    const nomeEditado = window.$('lote-nome-personalizado').value.trim() || "Cliente";
    const grupos = {};
    grupos[nomeEditado] = [];

    checks.forEach(chk => {
        const l = parseInt(chk.value);
        const v = window.arrayVendas.find(x => x.linha === l);
        if(v) grupos[nomeEditado].push(v);
    });

    window.gerarHTMLImpressao(grupos, tipo);
};

window.gerarHTMLImpressao = function(grupos, tipo) {
    let titulo = tipo === 'Pendente' ? 'LEMBRETE DE COBRANÇA' : 'RECIBO DE PAGAMENTO';
    let corDestaque = tipo === 'Pendente' ? '#d97706' : '#10b981'; 
    let corTextoDestaque = tipo === 'Pendente' ? '#b45309' : '#059669';
    let iconeTopo = tipo === 'Pendente' ? '🔔' : '🧾';

    let html = `
    <html><head><title>${titulo} - Mini Mundo 3D</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
        body { font-family: 'Inter', sans-serif; background: #efebe9; margin: 0; padding: 20px; display:flex; flex-direction:column; align-items:center; }
        .page { width: 100%; max-width: 600px; background: white; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); padding: 40px; margin-bottom: 30px; page-break-after: always; box-sizing: border-box; position: relative; border-top: 8px solid ${corDestaque}; }
        @media print { body { background: white; padding:0; } .page { box-shadow: none; margin: 0; page-break-after: always; width: 100%; max-width: 100%; border-radius:0; border-top:none; } }
        .header { text-align: center; margin-bottom: 20px; }
        .header img { width: 100px; margin-bottom: 15px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));}
        .header h1 { color: #4E342E; margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 1px;}
        .divider { border-top: 2px dashed #e7e5e4; margin: 20px 0; }
        .greeting { color: #292524; font-size: 16px; margin-bottom: 20px; }
        .greeting b { color: #4E342E; font-weight: 900;}
        .items-box { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
        .item-row { display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e7e5e4; align-items:center; }
        .item-row:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
        .item-title { font-weight: 800; color: #292524; font-size: 15px; margin-bottom: 5px; }
        .item-meta { font-size: 12px; color: #78716c; }
        .item-price { font-weight: 900; color: #4E342E; font-size: 16px; text-align:right;}
        .total-row { display: flex; justify-content: space-between; align-items: center; padding-top: 10px; }
        .total-label { font-size: 16px; font-weight: 900; color: #292524; text-transform: uppercase; }
        .total-value { font-size: 26px; font-weight: 900; color: ${corTextoDestaque}; }
        .footer { text-align: center; color: #8D6E63; font-size: 13px; margin-top: 30px; font-weight: 600; }
    </style>
    </head><body>
    `;

    for (const nome in grupos) {
        const vendas = grupos[nome];
        let total = 0;
        let itensHtml = "";

        vendas.forEach(v => {
            let val = window.limparValorPlanilha(v.valor_venda);
            total += val;
            let dataPagamento = v.data_pgt ? v.data_pgt : v.data; 
            let metaExtra = tipo === 'Pago' ? `| Pago em: ${dataPagamento}` : ``; 
            
            itensHtml += `
            <div class="item-row">
                <div>
                    <div class="item-title">${v.qtd}x ${v.produto}</div>
                    <div class="item-meta">Data: ${v.data} ${metaExtra}</div>
                </div>
                <div class="item-price">${window.fmt(val)}</div>
            </div>`;
        });

        let msg = tipo === 'Pendente' 
            ? `Aqui é do Mini Mundo 3D 🌍✨ Esse é um resumo dos seus pedidos que estão em aberto com a gente:`
            : `Confirmamos o recebimento do seu pagamento. Seu pedido está em nossos registros com muito carinho! 🖨️`;

        html += `
        <div class="page">
            <div class="header">
                <img src="${window.location.href.split('index.html')[0]}logo.png" onerror="this.style.display='none'">
                <h1 style="color:${corTextoDestaque}">${iconeTopo} ${titulo}</h1>
            </div>
            <div class="divider"></div>
            <div class="greeting">
                Olá, <b>${nome}</b>!<br><br>
                <span style="color: #78716c; font-size:14px;">${msg}</span>
            </div>
            
            <div class="items-box">
                ${itensHtml}
            </div>

            <div class="divider"></div>
            
            <div class="total-row">
                <div class="total-label">${tipo === 'Pendente' ? 'TOTAL EM ABERTO:' : 'TOTAL PAGO:'}</div>
                <div class="total-value">${window.fmt(total)}</div>
            </div>
            
            <div class="footer">
                ${tipo === 'Pendente' ? 'Qualquer dúvida, é só nos chamar.' : 'Obrigado pela preferência!<br>Mini Mundo 3D - Impressão & Criatividade.'}
            </div>
        </div>`;
    }

    html += `<script>setTimeout(() => { window.print(); }, 1000);</script></body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
};

window.calcularSugestao = function() {
    const prodName = window.$('venda-produto').value.trim().toLowerCase();
    const platName = window.$('venda-plataforma').value.trim().toLowerCase();
    const markup = parseFloat(window.$('venda-markup').value) || 100;
    const qtd = parseFloat(window.$('venda-qtd').value) || 1;

    if (!prodName) { window.$('box-sugestao-preco').style.display = 'none'; return; }

    const produto = window.arrayBancoCustos.find(p => p.modelo.toLowerCase() === prodName);
    if (!produto) { window.$('box-sugestao-preco').style.display = 'none'; return; }
    
    let custoUnitario = window.limparValorPlanilha(produto.custo_total);
    let custoTotalBase = custoUnitario * qtd;

    let plataformas = JSON.parse(localStorage.getItem('minimundo_plataformas') || '[]');
    const plat = plataformas.find(p => p.nome.toLowerCase() === platName) || { pct: 0, fixa: 0 };
    
    let lucroDesejado = custoTotalBase * (markup / 100);
    let valorBaseReceber = custoTotalBase + lucroDesejado; 

    let taxaPct = parseFloat(plat.pct) / 100;
    let taxaFixaTotal = parseFloat(plat.fixa) * qtd; 

    if (taxaPct >= 1) taxaPct = 0.99; 

    let precoSugerido = (valorBaseReceber + taxaFixaTotal) / (1 - taxaPct);
    
    window.$('venda-sugestao-valor').innerText = window.fmt(precoSugerido);
    window.$('venda-sugestao-lucro').innerText = window.fmt(lucroDesejado);
    window.$('box-sugestao-preco').style.display = 'block';
    window.$('box-sugestao-preco').dataset.valor = precoSugerido.toFixed(2);
};

window.aplicarPrecoSugerido = function() {
    let val = parseFloat(window.$('box-sugestao-preco').dataset.valor);
    if (!isNaN(val)) { window.$('venda-valor').value = window.fmt(val); }
};

window.carregarOpcoesVenda = async function(){ window.$('loading-opcoes-venda').style.display="block"; try{ const r=await fetch(API_PRECIFICACAO+"?acao=listar_opcoes_venda"); const res=await r.json(); if(res.sucesso){ window.$('lista-clientes-venda').innerHTML=res.clientes.map(n=>`<option value="${n}">`).join(''); window.$('lista-clientes-busca').innerHTML=res.clientes.map(n=>`<option value="${n}">`).join(''); window.$('lista-produtos-venda').innerHTML=res.produtos.map(n=>`<option value="${n}">`).join(''); window.$('lista-plataformas-venda').innerHTML=res.plataformas.map(n=>`<option value="${n}">`).join('');} }catch(e){}finally{window.$('loading-opcoes-venda').style.display="none";} };

window.salvarVenda = async function(){ const dV=window.$('venda-data').value, c=window.$('venda-cliente').value.trim(), p=window.$('venda-produto').value.trim(), pl=window.$('venda-plataforma').value.trim(), q=window.$('venda-qtd').value, vS=window.$('venda-valor').value, s=window.$('venda-status').value; if(!dV||!c||!p||!pl||!vS)return window.mostrarAlerta("Atenção","Preencha tudo.","warning"); const btn=window.$('btn-salvar-venda'); btn.disabled=true; btn.innerText="⏳ Lançando..."; try{ const py={acao:"salvar_venda",data_venda:dV.split('-').reverse().join('/'),cliente:c,produto:p,plataforma:pl,qtd:q,valor_venda:window.fmtPlanilha(window.limparValorPlanilha(vS)),status:s}; const r=await fetch(API_PRECIFICACAO,{method:"POST",body:JSON.stringify(py)}); const res=await r.json(); if(res.sucesso){window.mostrarAlerta("Venda Feita! 🎉","Registrado!","success");window.$('venda-cliente').value="";window.$('venda-produto').value="";window.$('venda-plataforma').value="";window.$('venda-qtd').value="1";window.$('venda-valor').value="";window.$('venda-status').value="Pago"; window.$('box-sugestao-preco').style.display="none"; window.carregarVendas();}else throw new Error(res.erro); }catch(e){window.mostrarAlerta("Erro",e.message,"error");}finally{btn.disabled=false;btn.innerText="✅ Lançar Venda";} };

window.salvarEdicaoVenda = async function(){ const l=window.$('edit-venda-linha').value, dV=window.$('edit-venda-data').value, s=window.$('edit-venda-status').value, c=window.$('edit-venda-cliente').value.trim(), p=window.$('edit-venda-produto').value.trim(), pl=window.$('edit-venda-plataforma').value.trim(), q=window.$('edit-venda-qtd').value, vS=window.$('edit-venda-valor').value; if(!dV||!c||!p||!pl||!vS)return window.mostrarAlerta("Atenção","Preencha tudo.","warning"); const btn=window.$('btn-salvar-edicao-venda'); btn.disabled=true; btn.innerText="⏳ Salvando..."; try{ const py={acao:"atualizar_venda",linha:l,data_venda:dV.split('-').reverse().join('/'),cliente:c,produto:p,plataforma:pl,qtd:q,valor_venda:window.fmtPlanilha(window.limparValorPlanilha(vS)),status:s}; const r=await fetch(API_PRECIFICACAO,{method:"POST",body:JSON.stringify(py)}); const res=await r.json(); if(res.sucesso){window.fecharEditarVenda();window.mostrarAlerta("Atualizado!","Editada.","success");window.carregarVendas();}else throw new Error(res.erro); }catch(e){window.mostrarAlerta("Erro",e.message,"error");}finally{btn.disabled=false;btn.innerText="💾 Salvar Alterações";} };

window.carregarVendas = async function(){ window.$('loading-vendas').style.display="block"; window.$('lista-vendas').innerHTML=""; try{ const r=await fetch(API_PRECIFICACAO+"?acao=listar_vendas"); const res=await r.json(); if(res.sucesso){window.arrayVendas=res.vendas; window.filtrarVendas();}else throw new Error(res.erro); }catch(e){window.$('loading-vendas').innerHTML="❌ Erro Vendas.";}finally{window.$('loading-vendas').style.display="none";} };

window.limparFiltrosVendas = function(){ window.$('filtro-v-mes').value="todos"; window.$('filtro-v-ano').value="todos"; window.$('filtro-v-status').value="todos"; window.$('busca-venda').value=""; window.filtrarVendas(); };

window.gerarRelatorioCliente = function() { const busca = window.$('busca-venda').value.trim().toLowerCase(); if(!busca) return window.mostrarAlerta("Atenção", "Para gerar o extrato, digite o nome do cliente na barra de busca primeiro!", "warning"); const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); const tB = norm(busca); const mS = window.$('filtro-v-mes').value, aS = window.$('filtro-v-ano').value, stS = window.$('filtro-v-status').value.toLowerCase(); const filtrados = window.arrayVendas.filter(v => { if (!norm(v.cliente).includes(tB)) return false; if (stS !== "todos" && v.status.toLowerCase() !== stS) return false; if (mS !== "todos" || aS !== "todos") { let pt = v.data.includes('/') ? v.data.split('/') : (v.data.includes('-') ? v.data.split('-').reverse() : []); if (pt.length >= 3) { let m = String(pt[1]).padStart(2,'0'), a = String(pt[2]).substring(0,4); if (mS !== "todos" && m !== mS) return false; if (aS !== "todos" && a !== aS) return false; } else return false; } return true; }); if(filtrados.length === 0) return window.mostrarAlerta("Ops", "Nenhuma venda encontrada para este cliente nos filtros atuais.", "warning"); let total = 0; let texto = `*🧾 EXTRATO DE PEDIDOS | MINI MUNDO 3D*\n*Cliente:* ${filtrados[0].cliente}\n\n`; filtrados.forEach(v => { let val = window.limparValorPlanilha(v.valor_venda); total += val; let icone = v.status.toLowerCase() === 'pago' ? '🟢' : '🟡'; texto += `📅 *${v.data}* - ${v.produto} (x${v.qtd})\n💰 Valor: ${window.fmt(val)} | Status: ${icone} ${v.status}\n\n`; }); texto += `*TOTAL DA FATURA: ${window.fmt(total)}*`; navigator.clipboard.writeText(texto).then(() => { window.mostrarAlerta("Copiado!", "O relatório do cliente foi copiado. É só colar no WhatsApp!", "success"); }).catch(() => { alert("Erro ao copiar. Segue o texto:\n\n" + texto); }); };

window.filtrarVendas = function(){ const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); const mS=window.$('filtro-v-mes').value, aS=window.$('filtro-v-ano').value, stS=window.$('filtro-v-status').value.toLowerCase(), tB=norm(window.$('busca-venda').value); const flt=window.arrayVendas.filter(v=>{ if(tB&&!(norm(v.cliente).includes(tB)||norm(v.produto).includes(tB)))return false; if(stS!=="todos"&&v.status.toLowerCase()!==stS)return false; if(mS!=="todos"||aS!=="todos"){ let pt=[]; if(v.data.includes('/'))pt=v.data.split('/'); else if(v.data.includes('-')){let p=v.data.split('-');pt=[p[2],p[1],p[0]];} else if(v.data.includes(' ')){let td=new Date(v.data);if(!isNaN(td))pt=[td.getDate(),String(td.getMonth()+1).padStart(2,'0'),td.getFullYear()];} if(pt.length>=3){let m=String(pt[1]).padStart(2,'0'), a=String(pt[2]).substring(0,4); if(mS!=="todos"&&m!==mS)return false; if(aS!=="todos"&&a!==aS)return false;}else return false; } return true; }); window.vendasFiltradasAtuais = flt; window.renderizarListaVendas(flt); };

window.renderizarListaVendas = function(aV){ 
    const lD = window.$('lista-vendas'); lD.innerHTML = ""; 
    let sP = 0, sPa = 0, sL = 0, sQ = 0; 
    
    if (aV.length === 0) { 
        lD.innerHTML = "<p style='text-align:center;color:#999;padding:20px;'>Nenhuma venda.</p>"; 
        window.$('vendas-total-valor').innerText = "R$ 0,00"; window.$('vendas-pendentes-valor').innerText = "R$ 0,00"; 
        window.$('vendas-pagas-valor').innerText = "R$ 0,00"; window.$('vendas-lucro-valor').innerText = "R$ 0,00"; 
        window.$('vendas-qtd-valor').innerText = "0 un"; 
        return; 
    } 

    let h = ""; 
    aV.forEach(v => { 
        let nV = window.limparValorPlanilha(v.valor_venda), nL = window.limparValorPlanilha(v.lucro), nQ = parseFloat(v.qtd) || 0, isP = v.status.toLowerCase() === "pendente"; 
        sQ += nQ; if (isP) sP += nV; else sPa += nV; sL += nL; 
        let cs = isP ? "card-pendente" : "", em = isP ? "🟡" : "🟢", lS = v.lucro && nL > 0 ? `💰 Lucro: ${window.formatarDoBanco(v.lucro)}` : ""; 
        
        let bB = isP 
            ? `<button class="btn-novera btn-n-cobranca" onclick="window.solicitarNomeDocumento(${v.linha}, 'Pendente')" title="Gerar Lembrete">🔔</button>
               <button class="btn-novera btn-n-baixa" onclick="window.abrirConfirmacaoPagamento(${v.linha})" title="Marcar como Pago">💸</button>` 
            : `<button class="btn-novera btn-n-recibo" onclick="window.solicitarNomeDocumento(${v.linha}, 'Pago')" title="Gerar Recibo">🧾</button>`;

        h += `
        <div class="produto-banco-card ${cs}" style="padding:15px; margin-bottom:12px;">
            <div class="card-row-top">
                <div class="pb-info">
                    <h4 class="pb-nome" style="margin:0 0 6px 0; font-size:1rem;">${v.cliente}</h4>
                    <div class="pb-detalhes" style="flex-direction:column; gap:4px; align-items:flex-start;">
                        <div style="display:flex; gap:8px; flex-wrap:wrap;">
                            <span style="color:#64748b;">📅 ${v.data}</span>
                            <span style="color:#64748b; font-weight:800;">🏷️ ${v.produto} (x${v.qtd})</span>
                        </div>
                        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:2px;">
                            <span style="color:#64748b;">📱 ${v.plataforma}</span>
                            <span style="color:#10b981; font-weight:900;">${lS}</span>
                        </div>
                        <div style="margin-top:2px;">
                            <span style="font-weight:900; font-size:0.75rem; color:${isP ? '#b45309' : '#059669'};">${em} ${v.status.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
                <div class="pb-custo" style="background:transparent; border:none; color:var(--brand-dark); font-size:1.2rem; padding:0; text-align:right;">
                    ${window.fmt(nV)}
                </div>
            </div>
            
            <div class="acoes-venda-box" style="margin-top: 15px; border-top: 1px dashed var(--border-color); padding-top: 12px; display: flex; justify-content: flex-end; gap: 8px;">
                ${bB}
                <button class="btn-novera btn-n-editar" onclick="window.abrirModalEditarVenda(${v.linha})" title="Editar Venda">✏️</button>
                <button class="btn-novera btn-n-apagar" onclick="window.abrirConfirmacaoExclusao(${v.linha})" title="Excluir Venda">🗑️</button>
            </div>
        </div>`; 
    }); 
    lD.innerHTML = h; 
    window.$('vendas-total-valor').innerText = window.fmt(sP + sPa); 
    window.$('vendas-pendentes-valor').innerText = window.fmt(sP); 
    window.$('vendas-pagas-valor').innerText = window.fmt(sPa); 
    window.$('vendas-lucro-valor').innerText = window.fmt(sL); 
    window.$('vendas-qtd-valor').innerText = sQ + " un"; 
};

window.executarPagamentoVenda = async function(){ 
    if(!window.linhaVendaPagamento) return; 
    const l = window.linhaVendaPagamento; 
    window.fecharConfirmacao(); 
    try { 
        const p={acao:"atualizar_status_venda",linha:l,novo_status:"Pago"}; 
        const r=await fetch(API_PRECIFICACAO,{method:"POST",body:JSON.stringify(p)}); 
        const res=await r.json(); 
        if(res.sucesso){window.mostrarAlerta("Sucesso!","Pagamento registrado!","success");window.carregarVendas();}
        else throw new Error(res.erro); 
    }catch(e){window.mostrarAlerta("Erro",e.message,"error");} 
};

window.executarExclusaoVenda = async function(){ 
    if(!window.linhaVendaExclusao) return; 
    const l = window.linhaVendaExclusao; 
    window.fecharExclusao(); 
    try { 
        const p={acao:"excluir_registro",aba:"Vendas",linha:l}; 
        const r=await fetch(API_PRECIFICACAO,{method:"POST",body:JSON.stringify(p)}); 
        const res=await r.json(); 
        if(res.sucesso){window.mostrarAlerta("Excluído!","Venda apagada.","success");window.carregarVendas();}
        else throw new Error(res.erro); 
    }catch(e){window.mostrarAlerta("Erro",e.message,"error");} 
};

// ERP: DASHBOARD
window.carregarDashboardERP = async function(){ window.$('loading-dashboard').style.display='block'; window.$('conteudo-dashboard').style.display='none'; try{ if(window.dashVendas.length===0||window.dashDespesas.length===0){const rV=await fetch(API_PRECIFICACAO+"?acao=listar_vendas");const jV=await rV.json(); const rD=await fetch(API_PRECIFICACAO+"?acao=listar_despesas");const jD=await rD.json(); if(jV.sucesso&&jD.sucesso){window.dashVendas=jV.vendas;window.dashDespesas=jD.despesas;}else throw new Error("Erro na API.");} window.aplicarFiltrosDashboardERP(); }catch(e){window.mostrarAlerta("Erro Dashboard",e.message,"error");}finally{window.$('loading-dashboard').style.display='none';window.$('conteudo-dashboard').style.display='block';} };
window.limparFiltrosDashboardERP = function(){ window.$('filtro-dash-mes').value="todos"; window.$('filtro-dash-ano').value="todos"; window.aplicarFiltrosDashboardERP(); };
window.aplicarFiltrosDashboardERP = function(){ const m=window.$('filtro-dash-mes').value, a=window.$('filtro-dash-ano').value; const fD=(i)=>{ if(m==="todos"&&a==="todos")return true; let pt=[]; if(i.data.includes('/'))pt=i.data.split('/'); else if(i.data.includes('-')){let p=i.data.split('-');pt=[p[2],p[1],p[0]];} else if(i.data.includes(' ')){let td=new Date(i.data);if(!isNaN(td))pt=[td.getDate(),String(td.getMonth()+1).padStart(2,'0'),td.getFullYear()];} if(pt.length>=3){let mD=String(pt[1]).padStart(2,'0'),aD=String(pt[2]).substring(0,4); if(m!=="todos"&&mD!==m)return false; if(a!=="todos"&&aD!==a)return false; return true;} return false; }; window.gerarGraficosERP(window.dashVendas.filter(fD),window.dashDespesas.filter(fD)); };
window.gerarGraficosERP = function(v,d){ let tR=0, tG=0; v.forEach(x=>{if(x.status.toLowerCase()==='pago')tR+=window.limparValorPlanilha(x.valor_venda);}); d.forEach(x=>{tG+=window.limparValorPlanilha(x.valor);}); let bl=tR-tG; window.$('dash-receita-valor').innerText=window.fmt(tR); window.$('dash-despesa-valor').innerText=window.fmt(tG); window.$('dash-balanco-valor').innerText=window.fmt(bl); window.$('dash-balanco-valor').style.color=bl<0?"#ef4444":"#10b981"; const cP={}; v.forEach(x=>{let p=x.produto||"Não Especificado", q=parseFloat(x.qtd)||1; cP[p]=(cP[p]||0)+q;}); let aP=Object.keys(cP).map(k=>({nome:k,qtd:cP[k]})).sort((a,b)=>b.qtd-a.qtd); let t5P=aP.slice(0,5); const cPl={}; v.forEach(x=>{let p=x.plataforma||"Outros", vL=window.limparValorPlanilha(x.valor_venda); cPl[p]=(cPl[p]||0)+vL;}); const cC={}; v.forEach(x=>{let c=x.cliente||"Avulso", vL=window.limparValorPlanilha(x.valor_venda); cC[c]=(cC[c]||0)+vL;}); let aC=Object.keys(cC).map(k=>({nome:k,val:cC[k]})).sort((a,b)=>b.val-a.val); let t10C=aC.slice(0,10); if(window.chartProd)window.chartProd.destroy(); if(window.chartPlat)window.chartPlat.destroy(); if(window.chartCli)window.chartCli.destroy(); Chart.defaults.color='#78716c'; Chart.defaults.font.family='Inter'; window.chartCli=new Chart(window.$('chartClientes').getContext('2d'),{type:'bar',data:{labels:t10C.map(c=>c.nome),datasets:[{label:'Receita (R$)',data:t10C.map(c=>c.val),backgroundColor:'#10b981',borderRadius:6}]},options:{indexAxis:'y',responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+window.fmt(c.parsed.x)}}},scales:{x:{beginAtZero:true}}}}); window.chartProd=new Chart(window.$('chartProdutos').getContext('2d'),{type:'doughnut',data:{labels:t5P.map(p=>p.nome),datasets:[{data:t5P.map(p=>p.qtd),backgroundColor:['#d97706','#b45309','#f59e0b','#fde68a','#78716c'],borderWidth:2,borderColor:'#ffffff'}]},options:{responsive:true,plugins:{legend:{position:'bottom'}},cutout:'65%'}}); window.chartPlat=new Chart(window.$('chartPlataformas').getContext('2d'),{type:'pie',data:{labels:Object.keys(cPl),datasets:[{data:Object.values(cPl),backgroundColor:['#1e3a8a','#3b82f6','#8b5cf6','#a7f3d0','#cbd5e1'],borderWidth:2,borderColor:'#ffffff'}]},options:{responsive:true,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>' '+window.fmt(c.parsed)}}}}}); };
