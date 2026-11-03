// ==========================================
// 📏 RÉGUA DE MEDIDAS
// ==========================================
// Desenha o produto como uma caixa em 3D, proporcional às medidas, com uma fita métrica em cada lado
// (largura, comprimento e altura). Usada no painel (Precificar, Produtos, Estoque, vendedores) e na
// página de venda dos clientes (loja.html). Medidas em cm: { l, c, a } — vazio ou zero = não informado.
// Com só uma ou duas medidas, mostra fitas retas em vez da caixa.
(() => {
const NOMES = { l: 'Largura', c: 'Comprimento', a: 'Altura' };
const n1 = v => (Math.round(v * 10) / 10).toLocaleString('pt-BR');
const tem = m => !!(m && (m.l > 0 || m.c > 0 || m.a > 0));
window.temMedidas = tem;
// "12 × 8 × 5 cm" (só as que foram informadas, sempre na ordem largura × comprimento × altura)
window.medidasTxt = m => tem(m) ? ['l', 'c', 'a'].filter(k => m[k] > 0).map(k => n1(m[k])).join(' × ') + ' cm' : '';
// "12,5" ou "12.5" → 12.5 (vazio → 0)
window.numMedida = v => { const n = parseFloat(String(v ?? '').trim().replace(',', '.')); return n > 0 ? Math.min(Math.round(n * 10) / 10, 9999) : 0; };

// Algo conhecido do mesmo tamanho, para o cliente ter ideia
const REFERENCIAS = [[2.7, 'uma moeda de R$ 1 tem 2,7 cm'], [8.6, 'um cartão de crédito tem 8,6 cm de largura'], [15, 'um celular tem uns 15 cm de altura'],
    [30, 'uma régua escolar tem 30 cm'], [80, 'uma porta tem uns 80 cm de largura']];
const comparacao = maior => REFERENCIAS.reduce((a, b) => Math.abs(Math.log(b[0] / maior)) < Math.abs(Math.log(a[0] / maior)) ? b : a)[1];

// ---------- Geometria (pontos na tela) ----------
const P = (x, y) => ({ x, y });
const mais = (...ps) => P(ps.reduce((s, p) => s + p.x, 0), ps.reduce((s, p) => s + p.y, 0));
const vez = (p, k) => P(p.x * k, p.y * k);
const r1 = v => Math.round(v * 10) / 10;
const pts = (...ps) => ps.map(p => `${r1(p.x)},${r1(p.y)}`).join(' ');
const linha = (a, b, cls) => `<line class="${cls}" x1="${r1(a.x)}" y1="${r1(a.y)}" x2="${r1(b.x)}" y2="${r1(b.y)}"/>`;
const C30 = Math.cos(Math.PI / 6), S30 = 0.5;
const VAO = 7, LARG = 12; // distância da fita até a caixa e a largura da fita

// Fita métrica que começa em "A", vai na direção "u" por "len" px e fica do lado "n".
// pxCm = quantos px vale 1 cm (para os risquinhos). Devolve o desenho e o meio da fita (onde vai a etiqueta).
function fita(k, A, u, len, n, pxCm) {
    const a0 = mais(A, vez(n, VAO)), a1 = mais(a0, vez(u, len)), b1 = mais(a1, vez(n, LARG)), b0 = mais(a0, vez(n, LARG));
    // Um risco a cada "passo" cm; o passo cresce quando a fita é curta demais para tantos riscos
    const passo = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500].find(p => p * pxCm >= 4.5) || 1000;
    let riscos = '';
    for (let i = 1; i * passo * pxCm < len - 2; i++) {
        const t = mais(a0, vez(u, i * passo * pxCm)), tam = LARG * (i % 10 === 0 ? 0.78 : i % 5 === 0 ? 0.56 : 0.32);
        riscos += linha(t, mais(t, vez(n, tam)), 'rg-risco');
    }
    const g0 = a0, g1 = mais(a0, vez(u, Math.min(3, len))); // a pontinha de metal da fita, na cor da medida
    return {
        svg: `<g class="rg-fita-g"><polygon class="rg-fita" points="${pts(a0, a1, b1, b0)}"/>${riscos}<polygon class="rg-gancho rg-${k}" points="${pts(g0, g1, mais(g1, vez(n, LARG)), mais(g0, vez(n, LARG)))}"/></g>`,
        meio: mais(a0, vez(u, len / 2), vez(n, LARG)), pontos: [a0, a1, b1, b0]
    };
}
// Etiqueta "LARGURA / 12 cm" do lado de fora da fita, sem encostar nas outras
function etiquetas(lista) {
    const feitas = [];
    const bate = (a, b) => a.x < b.x + b.w + 4 && b.x < a.x + a.w + 4 && a.y < b.y + b.h + 4 && b.y < a.y + a.h + 4;
    lista.forEach(({ k, valor, meio, n }) => {
        const nome = NOMES[k].toUpperCase(), txt = `${n1(valor)} cm`;
        const w = Math.max(txt.length * 7.6, nome.length * 6.1) + 18, h = 34;
        let d = 6 + Math.abs(n.x) * w / 2 + Math.abs(n.y) * h / 2, c, ret;
        for (let i = 0; i < 40; i++, d += 4) {
            c = mais(meio, vez(n, d)); ret = { x: c.x - w / 2, y: c.y - h / 2, w, h };
            if (!feitas.some(f => bate(f, ret))) break;
        }
        feitas.push(Object.assign(ret, { k, nome, txt, c }));
    });
    return feitas;
}
const desenharEtiquetas = es => es.map(e => `<g class="rg-pil"><rect class="rg-${e.k}" x="${r1(e.x)}" y="${r1(e.y)}" width="${r1(e.w)}" height="${e.h}" rx="10"/>
    <text x="${r1(e.c.x)}" y="${r1(e.c.y - 4)}" class="rg-nome" text-anchor="middle">${e.nome}</text><text x="${r1(e.c.x)}" y="${r1(e.c.y + 11)}" class="rg-valor" text-anchor="middle">${e.txt}</text></g>`).join('');
// Caixa que envolve tudo, para o desenho caber certinho
function moldura(pontos, es, folga = 8) {
    const xs = [...pontos.map(p => p.x), ...es.flatMap(e => [e.x, e.x + e.w])], ys = [...pontos.map(p => p.y), ...es.flatMap(e => [e.y, e.y + e.h])];
    const x0 = Math.min(...xs) - folga, y0 = Math.min(...ys) - folga;
    return { vb: `${r1(x0)} ${r1(y0)} ${r1(Math.max(...xs) + folga - x0)} ${r1(Math.max(...ys) + folga - y0)}`, w: Math.max(...xs) + folga - x0 };
}
const rotulo = m => ['l', 'c', 'a'].filter(k => m[k] > 0).map(k => `${NOMES[k]} ${n1(m[k])} cm`).join(', ');

// ---------- As três medidas: caixa em 3D ----------
function caixa3d(m) {
    const maior = Math.max(m.l, m.c, m.a);
    // Medida muito fina (ex.: chaveiro de 0,3 cm) ganha um mínimo para a face continuar visível
    const w = Math.max(m.l, maior * 0.04), d = Math.max(m.c, maior * 0.04), h = Math.max(m.a, maior * 0.04);
    const s = 190 / Math.max((w + d) * C30, (w + d) * S30 + h); // px por cm
    const ux = P(C30, -S30), uz = P(-C30, -S30), uy = P(0, -1);
    const B0 = P(0, 0), B1 = vez(ux, w * s), B2 = vez(uz, d * s), B3 = mais(B1, vez(uz, d * s)), alto = vez(uy, h * s);
    const T0 = alto, T1 = mais(B1, alto), T2 = mais(B2, alto), T3 = mais(B3, alto);
    const nL = P(C30, S30), nC = P(-C30, S30); // para fora da caixa, no chão
    const fL = fita('l', B0, ux, w * s, nL, s), fC = fita('c', B0, uz, d * s, nC, s), fA = fita('a', B1, uy, h * s, ux, s);
    const es = etiquetas([{ k: 'a', valor: m.a, meio: fA.meio, n: ux }, { k: 'l', valor: m.l, meio: fL.meio, n: nL }, { k: 'c', valor: m.c, meio: fC.meio, n: nC }]);
    // Sombra no chão: o próprio "piso" da caixa, um pouco maior e borrado nas bordas
    const centro = vez(B3, 0.5), piso = k => [B0, B1, B3, B2].map(p => mais(centro, vez(mais(p, vez(centro, -1)), k), P(0, 3)));
    const guias = [[B0, nL], [B1, nL], [B0, nC], [B2, nC], [T1, ux]].map(([p, n]) => linha(p, mais(p, vez(n, VAO + LARG)), 'rg-guia')).join('');
    const mo = moldura([B2, B1, T3, T2, T1, ...fL.pontos, ...fC.pontos, ...fA.pontos], es);
    return `<svg viewBox="${mo.vb}" role="img" aria-label="${rotulo(m)}" style="max-width:${Math.round(mo.w * 1.5)}px">
        <polygon class="rg-sombra" points="${pts(...piso(1.1))}"/><polygon class="rg-sombra" points="${pts(...piso(1.04))}"/>
        <g class="rg-caixa"><polygon class="rg-lado2" points="${pts(B0, B2, T2, T0)}"/><polygon class="rg-lado1" points="${pts(B0, B1, T1, T0)}"/><polygon class="rg-topo" points="${pts(T0, T1, T3, T2)}"/></g>
        ${linha(B0, B1, 'rg-aresta rg-l')}${linha(B0, B2, 'rg-aresta rg-c')}${linha(B1, T1, 'rg-aresta rg-a')}
        ${guias}<g class="rg-fitas">${fL.svg}${fC.svg}${fA.svg}</g>${desenharEtiquetas(es)}</svg>`;
}

// ---------- Uma ou duas medidas: fitas retas, uma embaixo da outra ----------
function fitasRetas(m) {
    const ks = ['l', 'c', 'a'].filter(k => m[k] > 0), maior = Math.max(...ks.map(k => m[k])), L = 210, pxCm = L / maior;
    let svg = '', pontos = [], es = [];
    ks.forEach((k, i) => {
        const y = i * 48, f = fita(k, P(0, y - VAO), P(1, 0), Math.max(m[k] * pxCm, 6), P(0, 1), pxCm);
        svg += f.svg; pontos.push(...f.pontos);
        es.push(...etiquetas([{ k, valor: m[k], meio: P(Math.max(m[k] * pxCm, 6), y + LARG / 2), n: P(1, 0) }]));
    });
    const mo = moldura(pontos, es);
    return `<svg viewBox="${mo.vb}" role="img" aria-label="${rotulo(m)}" style="max-width:${Math.round(mo.w * 1.5)}px"><g class="rg-fitas">${svg}</g>${desenharEtiquetas(es)}</svg>`;
}

// Desenho completo. o.comparar = frase "para ter uma ideia" (página do cliente)
window.reguaMM = function(m, o = {}) {
    if (!tem(m)) return '';
    m = { l: +m.l || 0, c: +m.c || 0, a: +m.a || 0 };
    const maior = Math.max(m.l, m.c, m.a);
    return `<figure class="regua ${o.classe || ''}">${m.l && m.c && m.a ? caixa3d(m) : fitasRetas(m)}${o.comparar ? `<figcaption>Para ter uma ideia: ${comparacao(maior)}.</figcaption>` : ''}</figure>`;
};

// Estilo da régua (o mesmo no painel e na página de venda; cada um pode trocar as cores pelas variáveis --rg-*)
if (!document.getElementById('regua-css')) {
    const css = document.createElement('style'); css.id = 'regua-css';
    css.textContent = `
.regua{margin:0;--rg-caixa:#8b7cf6;--rg-borda:#5b4bc4;--rg-l:#2f7de1;--rg-c:#139a62;--rg-a:#d23f87;--rg-fita:#f8cd4f;--rg-fita-borda:#d9a21b;--rg-risco:#5b3f00;--rg-pil-txt:#fff}
.regua svg{display:block;width:100%;height:auto;max-height:var(--rg-max,280px);margin:0 auto;overflow:visible;font-family:inherit}
.regua .rg-lado2{fill:var(--rg-caixa)}
.regua .rg-lado1{fill:#b3a9fa;fill:color-mix(in srgb,var(--rg-caixa) 68%,#fff)}
.regua .rg-topo{fill:#dcd7fd;fill:color-mix(in srgb,var(--rg-caixa) 32%,#fff)}
.regua .rg-caixa polygon{stroke:var(--rg-borda);stroke-width:1.1;stroke-linejoin:round}
.regua .rg-aresta{stroke-width:2.6;stroke-linecap:round}
.regua .rg-sombra{fill:#000;opacity:.07}
.regua .rg-guia{stroke:currentColor;stroke-opacity:.35;stroke-width:1;stroke-dasharray:2.5 2.5}
.regua .rg-fita{fill:var(--rg-fita);stroke:var(--rg-fita-borda);stroke-width:1;stroke-linejoin:round}
.regua .rg-risco{stroke:var(--rg-risco);stroke-width:.9;stroke-linecap:round}
.regua line.rg-l{stroke:var(--rg-l)} .regua line.rg-c{stroke:var(--rg-c)} .regua line.rg-a{stroke:var(--rg-a)}
.regua .rg-l:not(line){fill:var(--rg-l)} .regua .rg-c:not(line){fill:var(--rg-c)} .regua .rg-a:not(line){fill:var(--rg-a)}
.regua .rg-pil rect{filter:drop-shadow(0 2px 3px rgba(0,0,0,.18))}
.regua .rg-pil text{fill:var(--rg-pil-txt)}
.regua .rg-nome{font-size:8.2px;font-weight:700;letter-spacing:.07em;opacity:.88}
.regua .rg-valor{font-size:13px;font-weight:800}
.regua figcaption{margin-top:8px;text-align:center;font-size:.82rem;opacity:.75}
@media (prefers-reduced-motion:no-preference){
 .regua .rg-fita-g{animation:rg-entra .45s ease-out both}
 .regua .rg-fita-g:nth-child(2){animation-delay:.1s} .regua .rg-fita-g:nth-child(3){animation-delay:.2s}
 .regua .rg-pil{transform-box:fill-box;transform-origin:center;animation:rg-pop .35s .3s cubic-bezier(.2,.9,.3,1.3) both}
 @keyframes rg-entra{from{opacity:0}} @keyframes rg-pop{from{opacity:0;transform:scale(.7)}}
}`;
    document.head.appendChild(css);
}
})();
