// ==========================================
// 🎵 MÚSICA DAS PÁGINAS (caixinha de música feita no próprio navegador)
// ==========================================
// As músicas são de domínio público e estão escritas aqui como notas; o som é sintetizado na hora
// (Web Audio), então não baixa arquivo nenhum. Caixinha de música + baixo suave + acordes,
// e guizos de trenó no "Bate o sino". Usado na loja.html e no painel (para ouvir antes de escolher).
// O navegador só deixa tocar depois que a pessoa toca na página: quem chama tocar() precisa estar num toque.
(() => {
const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const freq = (n, oit = 0) => {
    const m = /^([A-G])([#b]?)(\d)$/.exec(n); if (!m) return 0;
    const midi = 12 * (+m[3] + 1 + oit) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, (midi - 69) / 12);
};
// "E5:1 E5:1 R:2" → [[nota, tempos]]
const notas = s => s.trim().split(/\s+/).filter(x => x !== '|').map(t => { const [n, d] = t.split(':'); return [n, parseFloat(d)]; });
const ACORDES = {
    C: ['C3', 'C4', 'E4', 'G4'], F: ['F2', 'F3', 'A3', 'C4'], G: ['G2', 'G3', 'B3', 'D4'], G7: ['G2', 'F3', 'B3', 'D4'], D7: ['D3', 'F#3', 'A3', 'C4'],
    Dm: ['D3', 'D4', 'F4', 'A4'], Am: ['A2', 'A3', 'C4', 'E4'], Em: ['E3', 'E4', 'G4', 'B4'], D: ['D3', 'D4', 'F#4', 'A4'], A7: ['A2', 'G3', 'C#4', 'E4'], B7: ['B2', 'A3', 'D#4', 'F#4']
};
// Cada música: andamento (segundos por tempo), tempos por compasso, melodia, um acorde por compasso, oitava da melodia e jeito do acompanhamento
const MUSICAS = {
    sino: { nome: 'Bate o sino (Jingle Bells)', tempo: 0.34, compasso: 4, oitava: 0, guizo: true, jeito: 'marcha',
        melodia: notas(`E5:1 E5:1 E5:2 | E5:1 E5:1 E5:2 | E5:1 G5:1 C5:1.5 D5:.5 | E5:4 |
            F5:1 F5:1 F5:1.5 F5:.5 | F5:1 E5:1 E5:1 E5:.5 E5:.5 | E5:1 D5:1 D5:1 E5:1 | D5:2 G5:2 |
            E5:1 E5:1 E5:2 | E5:1 E5:1 E5:2 | E5:1 G5:1 C5:1.5 D5:.5 | E5:4 |
            F5:1 F5:1 F5:1.5 F5:.5 | F5:1 E5:1 E5:1 E5:.5 E5:.5 | G5:1 G5:1 F5:1 D5:1 | C5:4 |
            G4:1 E5:1 D5:1 C5:1 | G4:3 G4:.5 G4:.5 | G4:1 E5:1 D5:1 C5:1 | A4:4 |
            A4:1 F5:1 E5:1 D5:1 | B4:4 | G5:1 G5:1 F5:1 D5:1 | E5:4 |
            G4:1 E5:1 D5:1 C5:1 | G4:4 | G4:1 E5:1 D5:1 C5:1 | A4:3 A4:1 |
            A4:1 F5:1 E5:1 D5:1 | G5:1 G5:1 G5:1 G5:1 | A5:1 G5:1 F5:1 D5:1 | C5:2 R:2`),
        acordes: 'C C C C F C D7 G C C C C F C G7 C C C C F Dm G G7 C C C C F F G G7 C'.split(' ') },
    noitefeliz: { nome: 'Noite Feliz', tempo: 0.3, compasso: 6, oitava: 1, jeito: 'ninar',
        melodia: notas(`G4:3 A4:1 G4:2 | E4:6 | G4:3 A4:1 G4:2 | E4:6 |
            D5:4 D5:2 | B4:6 | C5:4 C5:2 | G4:6 |
            A4:4 A4:2 | C5:3 B4:1 A4:2 | G4:3 A4:1 G4:2 | E4:6 |
            A4:4 A4:2 | C5:3 B4:1 A4:2 | G4:3 A4:1 G4:2 | E4:6 |
            D5:4 D5:2 | F5:3 D5:1 B4:2 | C5:6 | E5:6 |
            C5:3 G4:1 E4:2 | G4:3 F4:1 D4:2 | C4:6 | R:6`),
        acordes: 'C C C C G7 G7 C C F F C C F F C C G7 G7 C C C G7 C C'.split(' ') },
    feliznatal: { nome: 'We Wish You a Merry Christmas', tempo: 0.36, compasso: 3, oitava: 1, jeito: 'valsa',
        melodia: notas(`R:2 D4:1 | G4:1 G4:.5 A4:.5 G4:.5 F#4:.5 | E4:1 E4:1 E4:1 | A4:1 A4:.5 B4:.5 A4:.5 G4:.5 | F#4:1 D4:1 D4:1 |
            B4:1 B4:.5 C5:.5 B4:.5 A4:.5 | G4:1 E4:1 D4:.5 D4:.5 | E4:1 A4:1 F#4:1 | G4:2 D4:1 |
            G4:1 G4:1 G4:1 | F#4:2 F#4:1 | G4:1 F#4:1 E4:1 | D4:2 A4:1 |
            B4:1 A4:1 G4:1 | D5:1 D4:1 D4:.5 D4:.5 | E4:1 A4:1 F#4:1 | G4:3`),
        acordes: 'G G C A7 D B7 C D7 G G D Em D G D7 D7 G'.split(' ') }
};
let ctx = null, mestre = null, eco = null, ruido = null, atual = null, timer = null, proximo = 0, fila = [], volume = 0.3;
const NOME = { sino: MUSICAS.sino.nome, noitefeliz: MUSICAS.noitefeliz.nome, feliznatal: MUSICAS.feliznatal.nome };

function montar() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.connect(ctx.destination);
    mestre = ctx.createGain(); mestre.gain.value = 0; mestre.connect(comp);
    // Um eco curto dá o "ar" de caixinha de música numa sala
    eco = ctx.createDelay(1); eco.delayTime.value = 0.23; const volta = ctx.createGain(); volta.gain.value = 0.28; const molhado = ctx.createGain(); molhado.gain.value = 0.22;
    const filtro = ctx.createBiquadFilter(); filtro.type = 'lowpass'; filtro.frequency.value = 3200;
    eco.connect(filtro); filtro.connect(volta); volta.connect(eco); filtro.connect(molhado); molhado.connect(mestre);
    // Ruído para os guizos
    ruido = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate); const d = ruido.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
}
function saida(g) { g.connect(mestre); g.connect(eco); }
// Nota de caixinha de música: fundamental + parciais de sino, ataque rápido e som que vai sumindo
function sino(t, f, dur, forca = 1) {
    const g = ctx.createGain(), fim = t + Math.max(1.2, dur * 2.2);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32 * forca, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, fim); saida(g);
    [[1, 1], [2, 0.32], [3, 0.1], [4.07, 0.05]].forEach(([m, a]) => {
        const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * m; og.gain.value = a;
        if (m > 1) { og.gain.setValueAtTime(a, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.5 / m + 0.15); }
        o.connect(og); og.connect(g); o.start(t); o.stop(fim + 0.05);
    });
}
function baixo(t, f, dur) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.5, dur));
    o.connect(g); g.connect(mestre); o.start(t); o.stop(t + Math.max(0.5, dur) + 0.05);
}
function acorde(t, fs, dur, forca = 1) {
    fs.forEach(f => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.045 * forca, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); saida(g); o.start(t); o.stop(t + dur + 0.05);
    });
}
function guizo(t, forca = 1) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = ruido;
    f.type = 'highpass'; f.frequency.value = 7000; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 * forca, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    s.connect(f); f.connect(g); g.connect(mestre); s.start(t); s.stop(t + 0.2);
}
// A música vira uma lista de acontecimentos (tempo em segundos desde o começo)
function partitura(m) {
    const ev = [], T = m.tempo; let t = 0;
    m.melodia.forEach(([n, d]) => { if (n !== 'R') ev.push({ t, tipo: 'm', nota: freq(n, m.oitava), dur: d * T }); t += d * T; });
    const fimMelodia = t;
    m.acordes.forEach((nome, i) => {
        const c = (ACORDES[nome] || ACORDES.C), t0 = i * m.compasso * T, fb = freq(c[0]), fa = c.slice(1).map(n => freq(n));
        if (t0 >= fimMelodia) return;
        if (m.jeito === 'marcha') { ev.push({ t: t0, tipo: 'b', nota: fb, dur: T * 1.6 }); ev.push({ t: t0 + 2 * T, tipo: 'b', nota: fb * 1.5, dur: T * 1.6 }); [1, 3].forEach(k => ev.push({ t: t0 + k * T, tipo: 'a', notas: fa, dur: T * 0.9 })); }
        else if (m.jeito === 'valsa') { ev.push({ t: t0, tipo: 'b', nota: fb, dur: T * 1.5 }); [1, 2].forEach(k => ev.push({ t: t0 + k * T, tipo: 'a', notas: fa, dur: T * 0.8, forca: 0.8 })); }
        else { ev.push({ t: t0, tipo: 'b', nota: fb, dur: T * 5 }); [0, 1, 2, 3, 4, 5].forEach(k => ev.push({ t: t0 + k * T, tipo: 'm2', nota: fa[[0, 1, 2, 1, 2, 1][k]], dur: T, forca: 0.2 })); }
    });
    if (m.guizo) for (let k = 0; k * T < fimMelodia; k++) { ev.push({ t: k * T, tipo: 'g', forca: k % 2 ? 0.6 : 1 }); ev.push({ t: (k + 0.5) * T, tipo: 'g', forca: 0.35 }); }
    ev.sort((a, b) => a.t - b.t);
    return { ev, duracao: fimMelodia + m.compasso * T };
}
let P = null, comeco = 0, indice = 0;
function agendar() {
    if (!ctx || !P) return;
    const ate = ctx.currentTime + 0.35;
    while (true) {
        if (indice >= P.ev.length) { comeco += P.duracao; indice = 0; }
        const e = P.ev[indice], t = comeco + e.t;
        if (t > ate) break;
        if (t >= ctx.currentTime - 0.02) {
            if (e.tipo === 'm') sino(t, e.nota, e.dur);
            else if (e.tipo === 'm2') sino(t, e.nota, e.dur, e.forca);
            else if (e.tipo === 'b') baixo(t, e.nota, e.dur);
            else if (e.tipo === 'a') acorde(t, e.notas, e.dur, e.forca || 1);
            else if (e.tipo === 'g') guizo(t, e.forca);
        }
        indice++;
    }
}
window.MusicaMM = {
    nomes: NOME,
    existe: id => !!MUSICAS[id],
    tocando: () => !!atual && !!ctx && ctx.state === 'running',
    atual: () => atual,
    // Precisa ser chamado dentro de um toque/clique (regra dos navegadores)
    tocar(id, vol) {
        if (!MUSICAS[id] || !montar()) return false;
        if (vol !== undefined) volume = vol;
        if (ctx.state === 'suspended') ctx.resume();
        if (atual !== id) { P = partitura(MUSICAS[id]); atual = id; comeco = ctx.currentTime + 0.12; indice = 0; }
        mestre.gain.cancelScheduledValues(ctx.currentTime); mestre.gain.setValueAtTime(Math.max(0.0001, mestre.gain.value), ctx.currentTime); mestre.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.2);
        clearInterval(timer); timer = setInterval(agendar, 60); agendar();
        return true;
    },
    parar() {
        if (!ctx || !atual) return;
        clearInterval(timer); timer = null;
        mestre.gain.cancelScheduledValues(ctx.currentTime); mestre.gain.setValueAtTime(mestre.gain.value, ctx.currentTime); mestre.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        const c = ctx; setTimeout(() => { if (!timer) c.suspend(); }, 450);
        atual = null; P = null;
    },
    // Aba escondida: pausa sem perder o ponto; voltou: continua
    pausar() { if (ctx && atual && ctx.state === 'running') { clearInterval(timer); timer = null; ctx.suspend(); } },
    continuar() { if (ctx && atual && ctx.state === 'suspended') { ctx.resume().then(() => { clearInterval(timer); timer = setInterval(agendar, 60); agendar(); }); } }
};
})();
