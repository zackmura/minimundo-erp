// ==========================================
// 🎨 TEMAS DAS PÁGINAS DE VENDA (Natal, Dia das Mães, Black Friday…)
// ==========================================
// Usado pela página do cliente (loja.html) e pelo painel (escolha do tema e arte para as redes).
// Cada tema tem cores, textos de exemplo, o "clima" que a IA usa para escrever, hashtags e o enfeite do topo.
(() => {
const T = {
    padrao: { nome: 'Mini Mundo', emoji: '✨', enfeite: 'nenhum', selo: 'Mini Mundo · Impressão 3D & Design',
        titulo: 'Presentes feitos à mão', texto: 'Peças impressas em 3D, montadas com carinho e prontas para encantar.',
        ia: 'sem data especial: presentes criativos, decoração e lembranças feitas à mão',
        hashtags: '#minimundo #impressao3d #feitoamao #presentecriativo #decoracao',
        cores: { fundo: '#f7f1e8', papel: '#fffdf9', tinta: '#2b1d18', tinta2: '#4a3329', texto: '#3d2e27', suave: '#857065', ouro: '#a8762f', ouro2: '#dcbd88', ouro3: '#f3e6cf', linha: '#ebe0cf', botao: '#2b1d18', botaoTxt: '#f7f1e8', ok: '#2e6b4c', okBg: '#e4f1e9', enfeite: ['#dcbd88', '#a8762f'] } },
    natal: { nome: 'Natal', emoji: '🎄', enfeite: 'neve', selo: 'Natal Mini Mundo',
        titulo: 'Um Natal feito à mão', texto: 'Presentes e enfeites impressos em 3D para deixar a árvore, a ceia e o amigo secreto ainda mais especiais.',
        ia: 'Natal: clima acolhedor de fim de ano, árvore enfeitada, ceia em família, amigo secreto, presentes embaixo da árvore, magia e carinho',
        hashtags: '#natal #presentedenatal #decoracaodenatal #amigosecreto #natalfeitoamao #impressao3d #minimundo',
        cores: { fundo: '#f5efe3', papel: '#fffcf6', tinta: '#1d3a2b', tinta2: '#2d5240', texto: '#2f3a31', suave: '#6c7869', ouro: '#b3262f', ouro2: '#d9b874', ouro3: '#efe3c8', linha: '#e4d9c1', botao: '#1d3a2b', botaoTxt: '#fbf6ea', ok: '#2e6b4c', okBg: '#e2efe6', enfeite: ['#ffffff', '#ffffff', '#f3e3b5', '#e2bf63'] },
        hero: { fundo: '#1d3a2b', fundo2: '#122719', tinta: '#fbf6ea', suave: '#cad6c6', ouro: '#e3c47e' } },
    blackfriday: { nome: 'Black Friday', emoji: '🖤', enfeite: 'brilho', selo: 'Black Friday Mini Mundo', escuro: true,
        titulo: 'Black Friday Mini Mundo', texto: 'Preços especiais por poucos dias em kits e peças impressos em 3D.',
        ia: 'Black Friday: ofertas por tempo limitado, urgência elegante, chance de garantir presentes de Natal antes, sem parecer barato',
        hashtags: '#blackfriday #ofertas #presentes #impressao3d #minimundo',
        cores: { fundo: '#121110', papel: '#1d1b19', tinta: '#f6efe3', tinta2: '#e7dccb', texto: '#e9e1d4', suave: '#a99d8c', ouro: '#d9b25f', ouro2: '#8a6d33', ouro3: '#2a2620', linha: '#2f2b26', botao: '#d9b25f', botaoTxt: '#121110', ok: '#7fd1a3', okBg: '#1f3529', enfeite: ['#d9b25f', '#f6efe3'] } },
    maes: { nome: 'Dia das Mães', emoji: '💐', enfeite: 'flores', selo: 'Dia das Mães Mini Mundo',
        titulo: 'Para a mãe que é o nosso mundo', texto: 'Presentes delicados, impressos em 3D e montados à mão para dizer o quanto ela é especial.',
        ia: 'Dia das Mães: gratidão, carinho, delicadeza, flores, lembranças afetivas, presente que emociona',
        hashtags: '#diadasmaes #presenteparamae #amordemae #feitoamao #impressao3d #minimundo',
        cores: { fundo: '#fbf1ee', papel: '#fffaf8', tinta: '#5a2734', tinta2: '#7a3c4a', texto: '#4a3036', suave: '#94737a', ouro: '#c0627a', ouro2: '#e6b8a8', ouro3: '#f7e2db', linha: '#f0dcd5', botao: '#5a2734', botaoTxt: '#fff6f3', ok: '#3d7258', okBg: '#e5f1ea', enfeite: ['#e8a5b4', '#f3c6c0', '#c0627a'] } },
    namorados: { nome: 'Dia dos Namorados', emoji: '❤️', enfeite: 'coracoes', selo: 'Namorados Mini Mundo',
        titulo: 'Presentes para quem tem o seu coração', texto: 'Lembranças impressas em 3D, cheias de significado, para celebrar o amor.',
        ia: 'Dia dos Namorados: romance, cumplicidade, declaração de amor, presentes com significado',
        hashtags: '#diadosnamorados #presenteromantico #amor #feitoamao #impressao3d #minimundo',
        cores: { fundo: '#fbefef', papel: '#fffafa', tinta: '#5c1725', tinta2: '#7d2434', texto: '#4b2a30', suave: '#987278', ouro: '#c0283d', ouro2: '#eab0b6', ouro3: '#f8dfe1', linha: '#f1d8da', botao: '#5c1725', botaoTxt: '#fff5f5', ok: '#3d7258', okBg: '#e5f1ea', enfeite: ['#e0475d', '#f2a1ad', '#c0283d'] } },
    pascoa: { nome: 'Páscoa', emoji: '🐣', enfeite: 'ovos', selo: 'Páscoa Mini Mundo',
        titulo: 'Uma Páscoa cheia de cor', texto: 'Mimos impressos em 3D para acompanhar os chocolates e alegrar a família.',
        ia: 'Páscoa: renovação, família reunida, coelhinho, ovos coloridos, doçura e alegria',
        hashtags: '#pascoa #presentedepascoa #coelhinho #feitoamao #impressao3d #minimundo',
        cores: { fundo: '#f6f2fb', papel: '#fffdff', tinta: '#3c3160', tinta2: '#554883', texto: '#3c3650', suave: '#857d9a', ouro: '#c98a1c', ouro2: '#d8c7ef', ouro3: '#ece3f8', linha: '#e6def2', botao: '#3c3160', botaoTxt: '#fbf9ff', ok: '#3d7258', okBg: '#e5f1ea', enfeite: ['#f7c873', '#a8d8c4', '#c9b4ef', '#f5a8b8'] } },
    pais: { nome: 'Dia dos Pais', emoji: '👔', enfeite: 'estrelas', selo: 'Dia dos Pais Mini Mundo',
        titulo: 'Para o melhor pai do mundo', texto: 'Presentes impressos em 3D com personalidade, para o pai, o avô e o padrinho.',
        ia: 'Dia dos Pais: admiração, parceria, hobbies, futebol, escritório, presente com personalidade e bom gosto',
        hashtags: '#diadospais #presenteparapai #paiheroi #feitoamao #impressao3d #minimundo',
        cores: { fundo: '#eff2f5', papel: '#fbfcfd', tinta: '#1b2a3d', tinta2: '#2c4160', texto: '#2a3443', suave: '#6f7c8c', ouro: '#9a6b3d', ouro2: '#c9b394', ouro3: '#e6e0d6', linha: '#dfe4ea', botao: '#1b2a3d', botaoTxt: '#f4f6f9', ok: '#2e6b4c', okBg: '#e2efe6', enfeite: ['#c9b394', '#9a6b3d'] } },
    criancas: { nome: 'Dia das Crianças', emoji: '🧸', enfeite: 'confete', selo: 'Dia das Crianças Mini Mundo',
        titulo: 'Diversão impressa em 3D', texto: 'Brinquedos e lembrancinhas coloridas, feitos à mão para fazer a criançada sorrir.',
        ia: 'Dia das Crianças: brincadeira, imaginação, cores, alegria, personagens, diversão em família',
        hashtags: '#diadascriancas #brinquedos #presenteinfantil #feitoamao #impressao3d #minimundo',
        cores: { fundo: '#f1f7fc', papel: '#fdfeff', tinta: '#1d3557', tinta2: '#2e4d7a', texto: '#2a3a52', suave: '#6f8199', ouro: '#e07a1f', ouro2: '#a9d3f0', ouro3: '#dceefa', linha: '#d9e8f3', botao: '#1d3557', botaoTxt: '#f5faff', ok: '#2e6b4c', okBg: '#e2efe6', enfeite: ['#f2a03d', '#4fb3e8', '#f26b6b', '#7bc96f', '#b78be8'] } }
};
window.TEMAS_MM = T;
window.temaMM = id => T[id] || T.padrao;
// Variáveis de cor para o CSS (--fundo, --papel, --tinta…)
window.aplicarTemaMM = function(el, id) {
    const t = window.temaMM(id);
    Object.entries(t.cores).forEach(([k, v]) => { if (typeof v === 'string') el.style.setProperty('--' + k, v); });
    // Topo escuro (Natal): fundo verde com letras claras; os outros temas usam as cores da página
    ['fundo', 'fundo2', 'tinta', 'suave', 'ouro'].forEach(k => { if (t.hero) el.style.setProperty('--hero-' + k, t.hero[k]); else el.style.removeProperty('--hero-' + k); });
    el.classList.toggle('hero-escuro', !!t.hero);
    el.dataset.tema = T[id] ? id : 'padrao';
    el.classList.toggle('escuro', !!t.escuro);
};
// Número "aleatório" que se repete (o enfeite fica igual toda vez que a página abre)
const semente = s => () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
// Símbolo do tema (títulos das seções) e as três cores da fitinha dos cartões
const GLIFO = { neve: '❄', brilho: '✦', flores: '❀', coracoes: '♥', ovos: '✿', estrelas: '★', confete: '✦', nenhum: '✦' };
window.glifoMM = id => GLIFO[window.temaMM(id).enfeite] || '✦';
window.fitaMM = id => { const t = window.temaMM(id), c = t.cores; return id === 'natal' ? ['#1d3a2b', '#b3262f', '#c9a24a'] : [c.tinta, c.ouro, c.ouro2]; };
// Fundo da página inteira: desenhinhos do tema bem clarinhos, repetidos (SVG embutido, não baixa nada)
window.padraoMM = function(id) {
    const t = window.temaMM(id), cor = t.cores.ouro2, e = t.enfeite;
    const forma = {
        neve: '<path d="M0-7V7M-6-3.5L6 3.5M-6 3.5L6-3.5" stroke="C" stroke-width="1.3" stroke-linecap="round" fill="none"/>',
        coracoes: '<path d="M0 6C-6 1-7-2-5-5C-3-7 0-6 0-3C0-6 3-7 5-5C7-2 6 1 0 6Z" fill="C"/>',
        flores: '<g fill="C"><circle cx="0" cy="-4" r="2.6"/><circle cx="3.8" cy="-1.2" r="2.6"/><circle cx="2.4" cy="3.3" r="2.6"/><circle cx="-2.4" cy="3.3" r="2.6"/><circle cx="-3.8" cy="-1.2" r="2.6"/></g>',
        ovos: '<ellipse rx="4" ry="5.5" fill="C"/>',
        confete: '<rect x="-4" y="-2" width="8" height="4" rx="1" fill="C"/>'
    }[e] || '<path d="M0-7L1.6-1.6L7 0L1.6 1.6L0 7L-1.6 1.6L-7 0L-1.6-1.6Z" fill="C"/>';
    const pos = [[26, 30, 0, 1], [98, 22, 25, .7], [62, 88, 50, .85], [124, 116, 15, .6], [18, 128, 70, .7]];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="148" height="148"><g opacity="${t.escuro ? .5 : .55}">${pos.map(([x, y, r, s]) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">${forma.replace(/C/g, cor)}</g>`).join('')}</g></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};
// Enfeite animado: neve caindo, corações subindo, confete… (só CSS, para no "reduzir movimento").
// classe "fixo" = camada leve que acompanha a página inteira enquanto rola
window.enfeiteMM = function(id, n = 26, classe = '') {
    const t = window.temaMM(id), r = semente(classe ? 13 : 7), cores = t.cores.enfeite;
    if (t.enfeite === 'nenhum') return '';
    const forma = { neve: '❄', brilho: '✦', flores: '❀', coracoes: '♥', ovos: '', estrelas: '★', confete: '' }[t.enfeite];
    let h = '';
    for (let i = 0; i < n; i++) {
        const cor = cores[Math.floor(r() * cores.length)], x = (r() * 100).toFixed(1), y = (r() * 92).toFixed(1), dur = (9 + r() * 10).toFixed(1), atraso = (-r() * 18).toFixed(1), tam = (0.55 + r() * 0.9).toFixed(2), gira = Math.round(r() * 360);
        h += `<i style="--x:${x}%;--y:${y}%;--d:${dur}s;--t:${atraso}s;--s:${tam};--r:${gira}deg;color:${cor}">${forma}</i>`;
    }
    return `<div class="enfeite enfeite-${t.enfeite}${classe ? ' ' + classe : ''}" aria-hidden="true">${h}</div>`;
};
// Mesmo enfeite desenhado na arte das redes (canvas)
// bordas = só nas laterais e no alto, para não passar por cima de texto e foto
window.desenharEnfeiteMM = function(ctx, id, W, H, bordas) {
    const t = window.temaMM(id), r = semente(11), cores = t.cores.enfeite;
    if (t.enfeite === 'nenhum') return;
    const n = t.enfeite === 'confete' ? 70 : 46, faixa = W * 0.11;
    ctx.save();
    for (let i = 0; i < n; i++) {
        const lado = r(), x = !bordas ? r() * W : lado < 0.42 ? r() * faixa : lado < 0.84 ? W - r() * faixa : r() * W, y = !bordas || lado < 0.84 ? r() * H : r() * H * 0.06, s = (0.5 + r() * 1.1) * W / 1080, cor = cores[Math.floor(r() * cores.length)], gira = r() * Math.PI * 2;
        ctx.save(); ctx.translate(x, y); ctx.rotate(gira); ctx.fillStyle = cor; ctx.strokeStyle = cor; ctx.globalAlpha = t.enfeite === 'neve' ? 0.55 + r() * 0.4 : 0.35 + r() * 0.45;
        if (t.enfeite === 'neve') { ctx.lineWidth = 3 * s; ctx.lineCap = 'round'; for (let k = 0; k < 6; k++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 16 * s); ctx.moveTo(0, 9 * s); ctx.lineTo(5 * s, 13 * s); ctx.moveTo(0, 9 * s); ctx.lineTo(-5 * s, 13 * s); ctx.stroke(); } }
        else if (t.enfeite === 'coracoes') { const k = 14 * s; ctx.beginPath(); ctx.moveTo(0, k * .35); ctx.bezierCurveTo(0, 0, -k, 0, -k, k * .35); ctx.bezierCurveTo(-k, k * .8, 0, k * 1.1, 0, k * 1.4); ctx.bezierCurveTo(0, k * 1.1, k, k * .8, k, k * .35); ctx.bezierCurveTo(k, 0, 0, 0, 0, k * .35); ctx.fill(); }
        else if (t.enfeite === 'flores') { for (let k = 0; k < 5; k++) { ctx.rotate(Math.PI * 2 / 5); ctx.beginPath(); ctx.ellipse(0, 9 * s, 5 * s, 9 * s, 0, 0, Math.PI * 2); ctx.fill(); } }
        else if (t.enfeite === 'ovos') { ctx.beginPath(); ctx.ellipse(0, 0, 11 * s, 15 * s, 0, 0, Math.PI * 2); ctx.fill(); }
        else if (t.enfeite === 'confete') { ctx.fillRect(-6 * s, -3 * s, 12 * s, 6 * s); }
        else { const k = (t.enfeite === 'estrelas' ? 12 : 16) * s; ctx.beginPath(); for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4, rr = j % 2 ? k * .28 : k; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
        ctx.restore();
    }
    ctx.restore();
};
})();
