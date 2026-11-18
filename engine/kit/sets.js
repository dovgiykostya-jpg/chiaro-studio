// engine/kit/sets.js — универсальные декорации Atlas Studio для объясняющих роликов на любую тему.
// Каждая декорация: fn(g, t, cam, o) -> { GY, CX, M }. Слои с параллаксом, тёмные силуэты, тёплый/холодный свет.
// Список SET_IDS получает авто-раскадровка как допустимые значения.
import { E, V, mood, layer, rr, circle, ring, glow, linGrad, alpha, shade, seg, poly, rng, noise, text } from '/engine/core.js';
import * as FX from '/engine/fx2d.js';
import { icon } from './icons.js';

export const GYf = () => E.H * V(0.8, 0.7);
const SETS = {};
export const registerSet = (id, fn) => { SETS[id] = fn; };
export const SET_IDS = () => Object.keys(SETS);
export function drawSet(g, t, cam, o = {}) { return (SETS[o.set] || SETS.city)(g, t, cam, o); }

function sky(g, M, GY, dark = 0) { g.fillStyle = linGrad(g, 0, -E.H * 0.6, 0, GY, M.sky.map((c, i) => [i / (M.sky.length - 1), dark ? shade(c, -dark) : c])); g.fillRect(-E.W, -E.H, E.W * 3, GY + E.H); }
function floor(g, GY, top, bot, lines = true) { g.fillStyle = linGrad(g, 0, GY - 20, 0, GY + 520, [top, bot]); g.fillRect(-E.W, GY - 20, E.W * 3, E.H * 2); if (lines) FX.floorLines(g, GY - 10, GY + 520, 'rgba(0,0,0,.22)', 0.07); }
function wall(g, GY, c1, c2) { g.fillStyle = linGrad(g, 0, -E.H, 0, GY, [c1, c2]); g.fillRect(-E.W, -E.H, E.W * 3, GY + E.H); }
function hangLamp(g, x, GY, t, col = '#ffd59a', a = 0.2) { const y = V(230, 380), fl = 0.92 + 0.08 * noise(t * 3, x); seg(g, [[x, -80], [x, y - 30]], 3, '#0c0b10'); poly(g, [[x - 50, y], [x + 50, y], [x + 24, y - 34], [x - 24, y - 34]], '#15131a'); circle(g, x, y + 4, 12, col); FX.lightCone(g, x, y + 6, { angle: Math.PI / 2, spread: 0.6, len: GY - y + 120, color: col, a: a * fl }); FX.pool(g, x, GY + 10, 380, 60, col, 0.18 * fl); }
function panelHouse(g, x, y, w, h, col, lit, seed, winC = '#ffcf8a') { FX.facade(g, { x, y, w, h, color: col, win: winC, dark: shade(col, -0.35), cols: Math.max(3, Math.round(w / 70)), rows: Math.max(3, Math.round(h / 80)), lit, seed }); }

// ---- город ночью: небо со звёздами, панельки и высотки, фонари, мокрая дорога ----
registerSet('city', (g, t, cam, o = {}) => {
  const M = mood('night'), GY = GYf(), CX = E.W / 2;
  layer(g, cam, 0.08, (g) => { sky(g, M, GY); FX.stars(g, t, { seed: 4, count: 110, area: [-200, 0, E.W + 400, GY * 0.55] }); FX.moon(g, E.W * 0.8, E.H * 0.16, 34); });
  layer(g, cam, 0.25, (g) => FX.skyline(g, { x: -400, y: GY - 120, w: E.W + 800, maxH: V(420, 700), color: shade(M.dark, 0.1), windowColor: alpha('#ffd59a', 0.5), seed: 7 }));
  layer(g, cam, 0.5, (g) => { const r = rng(21); for (let x = -300; x < E.W + 300; x += 360) panelHouse(g, x, GY - 30, 300, V(380, 620) + r() * 120, shade(M.wall, -0.35), 0.28, 30 + x, alpha('#ffb860', 0.55)); FX.fog(g, GY - 200, 220, M.fog, 0.22); });
  layer(g, cam, 0.85, (g) => { floor(g, GY, '#1d2236', '#07080f', false); for (let x = -400; x < E.W + 400; x += 160) { g.fillStyle = alpha('#ffd59a', 0.5); g.fillRect(x, GY + V(90, 160), 80, 8); } for (let x = -200; x < E.W + 300; x += 640) { FX.lampPost(g, x, GY + 4, V(330, 460), { color: '#0c0d16', light: '#ffb860', a: 0.24 }); FX.pool(g, x + 40, GY + 30, 260, 40, '#ffb860', 0.25); } });
  return { GY, CX, M };
});

// ---- улица днём: тёплое небо, солнце, дома, деревья, тротуар ----
registerSet('street', (g, t, cam, o = {}) => {
  const M = mood(o.mood || 'golden'), GY = GYf(), CX = E.W / 2;
  layer(g, cam, 0.08, (g) => { sky(g, M, GY); FX.sun(g, E.W * 0.74, GY - V(260, 520), 60, '#fff1d6', '#ffb070', 5); FX.clouds(g, { seed: 11, count: 6, y: E.H * 0.12, h: 200, color: '#ffe0c0', a: 0.16 }); });
  layer(g, cam, 0.3, (g) => FX.skyline(g, { x: -400, y: GY - 80, w: E.W + 800, maxH: V(300, 520), color: shade(M.dark, 0.25), windowColor: alpha('#ffe7b0', 0.0), seed: 3 }));
  layer(g, cam, 0.55, (g) => { const r = rng(5); for (let x = -260; x < E.W + 300; x += 420) panelHouse(g, x, GY - 26, 340, V(340, 560) + r() * 140, shade(M.wall, 0.05), 0.15, 40 + x, '#ffe7b0'); for (let x = -100; x < E.W + 200; x += 300) FX.tree(g, x + 150, GY - 20, 1.6, shade(M.dark, 0.05)); FX.fog(g, GY - 160, 200, M.fog, 0.12); });
  layer(g, cam, 0.85, (g) => { floor(g, GY, shade(M.road, 0.2), shade(M.dark, -0.4), false); g.fillStyle = alpha('#000', 0.25); g.fillRect(-E.W, GY - 6, E.W * 3, 14); for (let x = -400; x < E.W + 400; x += 220) { g.fillStyle = alpha('#f2e2c4', 0.35); g.fillRect(x, GY + V(110, 190), 110, 10); } });
  return { GY, CX, M };
});

// ---- кухня: плитка, окно с вечерним городом, гарнитур, плита с паром, лампа ----
registerSet('kitchen', (g, t, cam, o = {}) => {
  const M = mood('interiorWarm'), GY = GYf(), CX = E.W / 2;
  layer(g, cam, 0.45, (g) => {
    wall(g, GY, '#3a2a2e', '#5a4038');
    for (let x = -300; x < E.W + 300; x += 64) for (let y = GY - 330; y < GY - 120; y += 64) { g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; g.strokeRect(x, y, 64, 64); }
    const wx = CX - V(700, 420), wy = GY - V(760, 1000), ww = V(420, 380), wh = V(330, 360);
    FX.windowFrame(g, { x: wx, y: wy, w: ww, h: wh, cols: 2, frame: '#1c1418', bar: 10 }, (g, x, y, w, h) => { g.fillStyle = linGrad(g, 0, y, 0, y + h, ['#3d3360', '#e8956b']); g.fillRect(x, y, w, h); FX.skyline(g, { x, y: y + h, w, maxH: h * 0.45, color: '#2a1a26', windowColor: alpha('#ffd59a', 0.7), seed: 9 }); });
    for (let i = 0; i < 4; i++) { rr(g, CX + V(80, -60) + i * 150, GY - V(760, 900), 140, 220, 6); g.fillStyle = shade('#4a3436', -0.15); g.fill(); circle(g, CX + V(80, -60) + i * 150 + 120, GY - V(650, 790), 5, '#c8a070'); }
  });
  layer(g, cam, 0.8, (g) => {
    floor(g, GY, '#3a2a2e', '#140d10');
    FX.counter(g, { x: -200, y: GY, w: E.W + 400, h: V(230, 260), color: '#2a1e22', top: '#6a5048', doors: 12 });
    const sx = CX + V(360, 160), sy = GY - V(238, 268); rr(g, sx - 140, sy - 6, 280, 12, 4); g.fillStyle = '#1a1416'; g.fill();
    rr(g, sx - 90, sy - 110, 180, 104, 12); g.fillStyle = '#5a5e66'; g.fill(); rr(g, sx - 104, sy - 120, 208, 16, 6); g.fillStyle = '#6a6e76'; g.fill();
    for (let i = 0; i < 4; i++) { const ph = (t * 0.5 + i * 0.25) % 1; g.fillStyle = alpha('#ffffff', 0.12 * (1 - ph)); g.beginPath(); g.ellipse(sx - 30 + i * 20 + Math.sin(t + i) * 14, sy - 140 - ph * 260, 30 + ph * 50, 20 + ph * 30, 0, 0, 7); g.fill(); }
    glow(g, sx, sy + 4, 120, '#ff7a3a', 0.25);
  });
  layer(g, cam, 1, (g) => hangLamp(g, CX - V(120, 0), GY, t, '#ffd28a', 0.22));
  return { GY, CX, M };
});

// ---- цех / завод: окна-ленты со световыми столбами, конвейер с коробками, трубы, станок ----
registerSet('factory', (g, t, cam, o = {}) => {
  const M = mood('interiorCool'), GY = GYf(), CX = E.W / 2;
  layer(g, cam, 0.4, (g) => {
    wall(g, GY, '#1b2030', '#323a4c');
    for (let i = 0; i < 6; i++) FX.windowFrame(g, { x: -200 + i * 420, y: GY - V(820, 1100), w: 320, h: V(240, 300), cols: 4, rows: 2, frame: '#10131c', bar: 8 }, (g, x, y, w, h) => { g.fillStyle = linGrad(g, 0, y, 0, y + h, ['#8fa8d0', '#3a4a70']); g.fillRect(x, y, w, h); });
    for (let i = 0; i < 3; i++) FX.godRays(g, -40 + i * 760, GY - V(820, 1100), { count: 3, spread: 0.25, len: 900, color: '#cfe0ff', a: 0.07, angle: 1.2 });
    for (let k = 0; k < 2; k++) { const y = GY - V(520, 640) + k * 60; seg(g, [[-400, y], [E.W + 400, y]], 22, '#151a26'); for (let x = -300; x < E.W + 300; x += 300) { rr(g, x, y - 18, 24, 36, 4); g.fillStyle = '#0d1018'; g.fill(); } }
  });
  layer(g, cam, 0.75, (g) => {
    floor(g, GY, '#2a3040', '#0a0c12');
    const by = GY - V(150, 170); rr(g, -300, by, E.W + 600, 40, 8); g.fillStyle = '#20252f'; g.fill();
    for (let x = -300; x < E.W + 300; x += 120) { circle(g, x + ((t * 60) % 120), by + 20, 14, '#3a4150'); }
    for (let i = 0; i < 9; i++) { const x = ((i * 300 + t * 60) % (E.W + 600)) - 300; icon(g, 'box', x, by - 46, 110); }
    for (const lx of [-40, E.W + 40]) { rr(g, lx - 30, by + 40, 60, GY - by - 40, 4); g.fillStyle = '#151922'; g.fill(); }
  });
  layer(g, cam, 1, (g) => { hangLamp(g, CX - V(500, 260), GY, t, '#e0ecff', 0.16); hangLamp(g, CX + V(500, 260), GY, t + 1, '#e0ecff', 0.16); FX.dust(g, t, { count: 30, color: '#dfe8ff', a: 0.22 }); });
  return { GY, CX, M };
});

// ---- лаборатория: полки с колбами, стол, микроскоп, монитор с графиком, холодный свет ----
registerSet('lab', (g, t, cam, o = {}) => {
  const M = mood('interiorCool'), GY = GYf(), CX = E.W / 2;
  layer(g, cam, 0.45, (g) => {
    wall(g, GY, '#18222c', '#2e4250');
    for (let s = 0; s < 2; s++) { const y = GY - V(560, 760) + s * 150; rr(g, -200, y, E.W * 0.55 + 200, 12, 3); g.fillStyle = '#0e151c'; g.fill();
      const r = rng(3 + s); for (let x = 0; x < E.W * 0.52; x += 80) { const h = 50 + r() * 50, col = ['#5fd0e0', '#7bd88f', '#ffd47e', '#e8892b'][Math.floor(r() * 4)]; rr(g, x, y - h, 40, h, 8); g.fillStyle = alpha('#cfe8ff', 0.25); g.fill(); rr(g, x + 4, y - h * 0.5, 32, h * 0.5 - 2, 6); g.fillStyle = alpha(col, 0.7); g.fill(); } }
    FX.screen(g, { x: CX + V(300, 80), y: GY - V(640, 860), w: V(420, 380), h: V(240, 260), glowC: '#5fd0e0', a: 0.2 }, (g, x, y, w, h) => { g.strokeStyle = '#5fd0e0'; g.lineWidth = 4; g.beginPath(); for (let i = 0; i <= w; i += 6) { const v = Math.sin(i * 0.03 + t * 2) * 30 + Math.sin(i * 0.011) * 40; i ? g.lineTo(x + i, y + h / 2 + v) : g.moveTo(x, y + h / 2 + v); } g.stroke(); text(g, 'ANALYSIS', x + 80, y + 26, { size: 22, color: '#5fd0e0', font: 'Nunito' }); });
  });
  layer(g, cam, 0.8, (g) => {
    floor(g, GY, '#33485a', '#0b1218');
    const ty = GY - V(200, 230); rr(g, -200, ty, E.W + 400, 20, 4); g.fillStyle = '#c8d4dc'; g.fill(); g.fillStyle = '#151d24'; g.fillRect(-200, ty + 20, E.W + 400, GY - ty - 20);
    icon(g, 'microscope', CX - V(520, 300), ty - 70, 150, { accent: '#5fd0e0' }); icon(g, 'flask', CX - V(250, 60), ty - 60, 120, { accent: '#7bd88f', t });
    for (let i = 0; i < 5; i++) { rr(g, CX + V(80, 160) + i * 46, ty - 80, 26, 80, 10); g.fillStyle = alpha('#cfe8ff', 0.3); g.fill(); rr(g, CX + V(80, 160) + i * 46 + 3, ty - 40, 20, 38, 8); g.fillStyle = alpha(['#e8573f', '#ffd47e', '#5fd0e0', '#7bd88f', '#e7a1b0'][i], 0.75); g.fill(); }
  });
  layer(g, cam, 1, (g) => FX.lightCone(g, CX, -40, { angle: Math.PI / 2, spread: 0.8, len: 1200, color: '#dff4ff', a: 0.12 }));
  return { GY, CX, M };
});

// ---- офис: стол, монитор, доска с графиком, окно с ночным городом, лампа ----
registerSet('office', (g, t, cam, o = {}) => {
  const M = mood('interiorCool'), GY = GYf(), CX = E.W / 2;
  layer(g, cam, 0.45, (g) => {
    wall(g, GY, '#1a1c2c', '#33364e');
    const wx = CX + V(160, -380), wy = GY - V(800, 1050), ww = V(700, 760), wh = V(460, 400);
    FX.windowFrame(g, { x: wx, y: wy, w: ww, h: wh, cols: 3, frame: '#0e0f18', bar: 10, blinds: 0 }, (g, x, y, w, h) => { g.fillStyle = linGrad(g, 0, y, 0, y + h, ['#0b1028', '#2a3058']); g.fillRect(x, y, w, h); FX.skyline(g, { x, y: y + h, w, maxH: h * 0.65, color: '#0a0f1a', windowColor: alpha('#ffd59a', 0.75), seed: 12 }); });
    const bx = CX - V(780, 460), by = GY - V(720, 1300); rr(g, bx, by, V(460, 380), V(300, 260), 6); g.fillStyle = '#d8dde4'; g.fill(); g.strokeStyle = '#5a6070'; g.lineWidth = 8; g.stroke();
    seg(g, [[bx + 40, by + V(250, 220)], [bx + 140, by + 160], [bx + 240, by + 190], [bx + V(400, 330), by + 60]], 7, '#d9463b'); text(g, '↑', bx + V(410, 340), by + 50, { size: 50, color: '#d9463b' });
  });
  layer(g, cam, 0.8, (g) => {
    floor(g, GY, '#2a2c40', '#0a0b12');
    const dy = GY - V(190, 220); rr(g, CX - V(500, 380), dy, V(1000, 760), 22, 4); g.fillStyle = '#3a2e2a'; g.fill(); g.fillStyle = '#1a1416'; g.fillRect(CX - V(480, 360), dy + 22, 30, GY - dy - 22); g.fillRect(CX + V(450, 330), dy + 22, 30, GY - dy - 22);
    FX.screen(g, { x: CX - V(120, 120), y: dy - V(220, 200), w: V(300, 260), h: V(180, 160), glowC: '#9fb8ff', a: 0.22 }, (g, x, y, w, h) => { for (let i = 0; i < 5; i++) { g.fillStyle = alpha('#9fb8ff', 0.5); g.fillRect(x + 20, y + 24 + i * 28, (w - 60) * (0.4 + 0.5 * Math.abs(Math.sin(i * 1.7))), 10); } });
    rr(g, CX + 20, dy - 30, 30, 30, 4); g.fillStyle = '#1a1416'; g.fill(); icon(g, 'cup', CX + V(300, 220), dy - 34, 70);
  });
  layer(g, cam, 1, (g) => FX.lightCone(g, CX - V(300, 0), -40, { angle: Math.PI / 2, spread: 0.6, len: 1000, color: '#dfe6ff', a: 0.1 }));
  return { GY, CX, M };
});

// ---- комната: диван, торшер, окно с луной, рамка на стене, свет экрана ----
registerSet('room', (g, t, cam, o = {}) => {
  const M = mood('interiorWarm'), GY = GYf(), CX = E.W / 2;
  layer(g, cam, 0.45, (g) => {
    wall(g, GY, '#2a1e26', '#4a3438');
    for (let x = -300; x < E.W + 300; x += 90) { g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(x, -E.H, 40, GY + E.H); }
    const wx = CX + V(320, 60), wy = GY - V(760, 1060), ww = V(420, 360), wh = V(400, 420);
    FX.windowFrame(g, { x: wx, y: wy, w: ww, h: wh, cols: 2, rows: 2, frame: '#1a1218', bar: 10 }, (g, x, y, w, h) => { g.fillStyle = linGrad(g, 0, y, 0, y + h, ['#0b1028', '#25305a']); g.fillRect(x, y, w, h); FX.moon(g, x + w * 0.7, y + h * 0.3, 26); FX.stars(g, t, { seed: 2, count: 30, area: [x, y, w, h * 0.6] }); });
    rr(g, CX - V(560, 420), GY - V(700, 980), V(260, 220), V(190, 170), 4); g.fillStyle = '#1a1218'; g.fill(); rr(g, CX - V(545, 405), GY - V(685, 965), V(230, 190), V(160, 140), 2); g.fillStyle = '#6a5a7a'; g.fill(); g.save(); rr(g, CX - V(545, 405), GY - V(685, 965), V(230, 190), V(160, 140), 2); g.clip(); FX.hills(g, { seed: 1, y: GY - V(560, 860), amp: 20, color: '#3a3050', freq: 0.02 }); g.restore();   // холмы только внутри картины
  });
  layer(g, cam, 0.8, (g) => {
    floor(g, GY, '#3a2a2a', '#100a0c');
    const sx = CX - V(380, 300), sw = V(620, 520); rr(g, sx, GY - 190, sw, 120, 26); g.fillStyle = '#4a3a4a'; g.fill(); rr(g, sx - 30, GY - 150, 70, 150, 22); g.fill(); rr(g, sx + sw - 40, GY - 150, 70, 150, 22); g.fill(); rr(g, sx + 10, GY - 100, sw - 20, 90, 14); g.fillStyle = '#3a2c3a'; g.fill();
    const lx = CX + V(440, 300); seg(g, [[lx, GY], [lx, GY - 420]], 6, '#140e12'); poly(g, [[lx - 60, GY - 420], [lx + 60, GY - 420], [lx + 36, GY - 500], [lx - 36, GY - 500]], '#e8c48a'); glow(g, lx, GY - 440, 280, '#ffd28a', 0.3);
  });
  layer(g, cam, 1, (g) => { FX.pool(g, CX + V(440, 300), GY + 10, 360, 50, '#ffd28a', 0.2); glow(g, CX - V(100, 0), GY - 300, 500, '#7fb8ff', 0.05 + 0.02 * noise(t * 4, 2)); });
  return { GY, CX, M };
});

// ---- магазин: стеллажи с товарами и ценниками, холодный свет ламп ----
registerSet('store', (g, t, cam, o = {}) => {
  const M = mood('interiorCool'), GY = GYf(), CX = E.W / 2;
  layer(g, cam, 0.45, (g) => {
    wall(g, GY, '#1c2230', '#2e3648');
    for (let x = -300; x < E.W + 300; x += 260) { g.fillStyle = alpha('#e8f0ff', 0.75); g.fillRect(x, V(40, 120), 180, 14); glow(g, x + 90, V(48, 128), 160, '#e8f0ff', 0.12); }
    const r = rng(8), cols = ['#e8573f', '#ffd47e', '#5fd0e0', '#7bd88f', '#e7a1b0', '#f2e7d2', '#c8955a'];
    for (let s = 0; s < 4; s++) { const y = GY - V(140, 160) - s * V(170, 210); rr(g, -300, y, E.W + 600, 14, 2); g.fillStyle = '#10141c'; g.fill();
      for (let x = -280; x < E.W + 280; x += 64) { const h = 70 + r() * 60, c = cols[Math.floor(r() * cols.length)]; rr(g, x, y - h, 52, h, 6); g.fillStyle = shade(c, -0.5); g.fill(); g.fillStyle = alpha('#ffffff', 0.08); g.fillRect(x + 6, y - h + 8, 10, h - 16); }
      for (let x = -260; x < E.W + 260; x += 256) { rr(g, x, y + 14, 70, 30, 3); g.fillStyle = '#b89a20'; g.fill(); text(g, String(49 + ((x + s * 37) & 127)), x + 35, y + 30, { size: 22, color: '#1a1622' }); } }
  });
  layer(g, cam, 0.85, (g) => floor(g, GY, '#3a4256', '#0b0d14'));
  g.fillStyle = linGrad(g, 0, 0, 0, E.H, ['rgba(8,10,18,0.55)', 'rgba(8,10,18,0.15)', 'rgba(8,10,18,0.3)']); g.fillRect(0, 0, E.W, E.H);   // приглушаем пёстрые полки: фигура и надписи читаются
  return { GY, CX, M };
});

// ---- пустой градиент для схем: тёмно-синий фон, сетка, мягкое свечение ----
registerSet('void', (g, t, cam, o = {}) => {
  const M = mood('void'), GY = GYf(), CX = E.W / 2;
  g.fillStyle = linGrad(g, 0, 0, 0, E.H, ['#0b1324', '#101c34', '#0a1020']); g.fillRect(-E.W, -E.H, E.W * 3, E.H * 3);
  layer(g, cam, 0.3, (g) => { g.strokeStyle = alpha('#8fb8e8', 0.06); g.lineWidth = 1; for (let x = -E.W; x < E.W * 2; x += 60) { g.beginPath(); g.moveTo(x, -E.H); g.lineTo(x, E.H * 2); g.stroke(); } for (let y = -E.H; y < E.H * 2; y += 60) { g.beginPath(); g.moveTo(-E.W, y); g.lineTo(E.W * 2, y); g.stroke(); } });
  glow(g, E.W * 0.5 + Math.sin(t * 0.3) * 60, E.H * 0.45, E.W * 0.6, '#5a7fb8', 0.22);
  return { GY, CX, M };
});
