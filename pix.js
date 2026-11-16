// ==========================================
// 💠 PIX COM QR CODE (sem banco e sem maquininha)
// ==========================================
// Monta o "Pix copia e cola" (BR Code do Banco Central) com a sua chave e o valor da venda,
// e desenha o QR Code. O cliente aponta a câmera do banco e paga o valor certo.
// Também desenha QR Codes de qualquer texto/link (usado nas etiquetas). Usa a biblioteca qrcode-lib.js (MIT).
(() => {
const esc = s => window.esc(s), ic = n => window.ic(n);
const campo = (id, v) => { v = String(v); return id + String(v.length).padStart(2, '0') + v; };
function crc16(s) {
    let crc = 0xFFFF;
    for (let i = 0; i < s.length; i++) { crc ^= s.charCodeAt(i) << 8; for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF; }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}
const semAcento = (s, max) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 .\-]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const cpfValido = d => { if (!/^\d{11}$/.test(d) || /^(\d)\1+$/.test(d)) return false; const dv = n => { let s = 0; for (let i = 0; i < n; i++) s += +d[i] * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; }; return dv(9) === +d[9] && dv(10) === +d[10]; };
// A chave como o Banco Central pede: celular com +55, CPF/CNPJ só números, e-mail e chave aleatória como estão
window.chavePixNormal = function(chave, tipo) {
    const k = String(chave || '').trim(), d = k.replace(/\D/g, '');
    if (!k) return '';
    if (tipo === 'email' || (!tipo && k.includes('@'))) return k.toLowerCase();
    if (tipo === 'aleatoria' || (!tipo && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k))) return k.toLowerCase();
    if (tipo === 'celular') return '+' + (d.length <= 11 ? '55' + d : d);
    if (tipo === 'cpf' || tipo === 'cnpj') return d;
    if (k.startsWith('+')) return '+' + d;
    if (/^\(?\d{2}\)?[\s-]/.test(k)) return '+55' + d;
    if (d.length === 14) return d;
    if (d.length === 11) return cpfValido(d) ? d : '+55' + d;
    if (d.length === 10) return '+55' + d;
    return k;
};
// "Pix copia e cola" com o valor (txid *** = cobrança simples, sem banco)
window.pixPayload = function({ chave, tipo, nome, cidade, valor, mensagem }) {
    const k = window.chavePixNormal(chave, tipo); if (!k) return '';
    const gui = campo('00', 'br.gov.bcb.pix') + campo('01', k) + (mensagem ? campo('02', semAcento(mensagem, 40)) : '');
    const p = campo('00', '01') + campo('26', gui) + campo('52', '0000') + campo('53', '986') + (valor > 0 ? campo('54', (Math.round(valor * 100) / 100).toFixed(2)) : '')
        + campo('58', 'BR') + campo('59', semAcento(nome, 25) || 'MINI MUNDO') + campo('60', semAcento(cidade, 15) || 'BRASIL') + campo('62', campo('05', '***')) + '6304';
    return p + crc16(p);
};
// QR Code em SVG (nítido em qualquer tamanho, também na impressão)
window.qrSVG = function(texto, o = {}) {
    if (!window.qrcode) return '';
    const qr = window.qrcode(0, o.ecc || 'M'); qr.addData(String(texto || '')); qr.make();
    const n = qr.getModuleCount(), m = o.margem === undefined ? 2 : o.margem, t = n + m * 2; let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + m},${r + m}h1v1h-1z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" shape-rendering="crispEdges" class="${o.classe || ''}"><rect width="${t}" height="${t}" fill="${o.fundo || '#fff'}"/><path d="${d}" fill="${o.cor || '#000'}"/></svg>`;
};
// De quem é o Pix: o seu (Ajustes) ou o do vendedor (a chave do site dele)
window.dadosPix = function() {
    const vend = document.body.classList.contains('modo-vendedor'), c = window.configMM || {};
    if (vend) { const v = (window.painelVendedor || {}).vendedor || {}; return { chave: v.pix || '', nome: v.nome || '', cidade: c.pix_cidade || '', tipo: '' }; }
    return { chave: c.pagina_pix || '', tipo: c.pix_tipo || '', nome: c.pix_nome || 'Mini Mundo', cidade: c.pix_cidade || '' };
};
// Janela com o QR do Pix para o cliente pagar na hora
window.abrirPixQR = function(valor, descricao, o = {}) {
    const d = window.dadosPix(), payload = window.pixPayload({ ...d, valor, mensagem: descricao });
    if (!payload) {
        const vend = document.body.classList.contains('modo-vendedor');
        return window.mostrarAlerta('Falta a chave Pix', vend ? 'Coloque a sua chave Pix em Meu site → Divulgar.' : 'Coloque a sua chave Pix em Ajustes → Pix.', 'warning');
    }
    window.ULTIMO_PIX = payload;
    window.abrirModalMM(`<h3 class="modal-title">💠 Pix de ${window.fmt(valor)}</h3>
        <div class="pix-qr">${window.qrSVG(payload, { margem: 3 })}</div>
        <p class="pix-valor">${window.fmt(valor)}</p>
        <p class="texto-ajuda" style="text-align:center;margin:0 0 12px;">O cliente abre o app do banco, escolhe <b>Pix → Ler QR Code</b> e paga. O valor já vem preenchido.<br>Para: <b>${esc(d.nome || '')}</b> · chave ${esc(d.chave)}</p>
        <button class="btn-magic btn-global" onclick="copiarPixCopiaCola()">${ic('copiar')} Copiar o Pix copia e cola</button>
        <a class="btn-magic btn-zap" target="_blank" rel="noopener" href="${esc(window.linkZap(o.telefone || '', `Segue o Pix de ${window.fmt(valor)}${descricao ? ` (${descricao})` : ''}. É só copiar e colar no app do banco:\n\n${payload}`))}">${ic('zap')} Mandar o Pix no WhatsApp</a>
        ${o.voltar ? `<button class="btn-limpar" style="width:100%;margin-top:8px;padding:11px;" onclick="${o.voltar}">← ${esc(o.rotuloVoltar || 'Voltar')}</button>` : ''}`);
};
window.copiarPixCopiaCola = () => window.copiarTexto(window.ULTIMO_PIX || '', 'Pix copia e cola copiado');
})();
