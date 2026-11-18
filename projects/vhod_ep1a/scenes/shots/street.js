// street.js — «Входящие»: Конфлюэнс, квартал Три Моста, вечер. Версия А: Бим жив и обходит фонари. Кадры: общий, фонарь №9.
import { E, clamp, lerp, ease, prog, rr, seg, poly, circle, ring, glow, alpha, shade, mix, linGrad, radGrad, rng, noise, layer, backdrop, registerShot, text, FONTS, blurLayer } from '/engine/core.js';
import { drift, fg } from '/engine/motion.js';
import { drawFigure, POSES, breathe } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';

const TEAL = '#2fd6c8', ICE = '#7fe8ff', BRASS = '#d9a441', WARM = '#ffb25a', NEON = '#ff4fa3';
const T = (g, s, x, y, o = {}) => text(g, s, x, y, { font: FONTS.ui, weight: 700, color: '#e6edff', ...o });
const flick = (t, s, rate = 8) => { const v = Math.sin(Math.floor(t * rate) * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };
const lite = (g, fn) => { g.save(); g.globalCompositeOperation = 'lighter'; fn(); g.restore(); };
const vig = (g, a = 0.6) => { g.save(); g.fillStyle = radGrad(g, E.W / 2, E.H / 2, E.H * 0.32, E.H * 1.05, ['rgba(0,0,0,0)', `rgba(0,0,0,${a})`]); g.fillRect(0, 0, E.W, E.H); g.restore(); };
const cam = (t, dur, o = {}) => { const k = ease.inOut(clamp(t / dur)), d = drift(t, o.d ?? 4, o.seed ?? 2); return { z: lerp(o.z0 ?? 1, o.z1 ?? 1.06, k), x: lerp(o.x0 ?? 0, o.x1 ?? 0, k) + d.x, y: lerp(o.y0 ?? 0, o.y1 ?? 0, k) + d.y, r: d.r }; };
const GY = 870;
let _rc = null;
function reflect(g, fn, yFloor, alphaR = 0.3) {
  const m = g.getTransform(), W = g.canvas.width, H = g.canvas.height;
  if (!_rc || _rc.width !== W || _rc.height !== H) { _rc = document.createElement('canvas'); _rc.width = W; _rc.height = H; }
  const r = _rc.getContext('2d'); r.setTransform(1, 0, 0, 1, 0, 0); r.clearRect(0, 0, W, H); r.setTransform(m); r.globalAlpha = 1; fn(r);
  const yS = m.f + m.d * yFloor;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.beginPath(); g.rect(0, yS, W, H - yS); g.clip(); g.globalAlpha = alphaR; g.filter = 'blur(2px)'; g.translate(0, 2 * yS); g.scale(1, -1); g.drawImage(_rc, 0, 0); g.restore();
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); const gr = g.createLinearGradient(0, yS, 0, yS + m.d * 300); gr.addColorStop(0, 'rgba(6,9,20,0)'); gr.addColorStop(1, 'rgba(4,6,14,.94)'); g.fillStyle = gr; g.fillRect(0, yS, W, H - yS); g.restore();
}
function grunge(g, x, y, w, h, seed, n = 200, light = 0.06) {
  const r = rng(seed); g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.lineCap = 'round';
  for (let i = 0; i < n; i++) { const px = x + r() * w, py = y + r() * h, L = 6 + r() * 50, a = r() * Math.PI; g.strokeStyle = r() < 0.5 ? `rgba(0,0,0,${0.05 + r() * 0.12})` : `rgba(190,215,255,${light * (0.4 + r())})`; g.lineWidth = 0.6 + r() * 1.2; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L); g.stroke(); }
  for (let i = 0; i < n * 2; i++) { const px = x + r() * w, py = y + r() * h; g.fillStyle = r() < 0.55 ? `rgba(0,0,0,${0.06 + r() * 0.1})` : `rgba(200,220,255,${0.03 + r() * 0.05})`; g.fillRect(px, py, 1 + r() * 2.2, 1 + r() * 2.2); }
  g.restore();
}


function moths(g, x, y, t, n = 6, col = '#fff1c8') { for (let i = 0; i < n; i++) { const a = t * (1.2 + i * 0.27) + i * 2.1, r = 22 + (i % 3) * 14; const mx = x + Math.cos(a) * r, my = y + Math.sin(a * 1.3) * r * 0.7; circle(g, mx, my, 1.8, alpha(col, 0.9)); glow(g, mx, my, 10, col, 0.5); } }
function brick(g, x, y, w, h, base, seed) {
  g.fillStyle = linGrad(g, 0, y, 0, y + h, [shade(base, 0.1), base, shade(base, -0.32)]); g.fillRect(x, y, w, h); const r = rng(seed); g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  for (let yy = y, row = 0; yy < y + h; yy += 22, row++) { for (let xx = x - (row % 2) * 30; xx < x + w; xx += 60) { g.fillStyle = `rgba(${r() < 0.5 ? '255,200,160' : '0,0,0'},${0.03 + r() * 0.07})`; g.fillRect(xx + 2, yy + 2, 56, 18); } seg(g, [[x, yy], [x + w, yy]], 1.5, 'rgba(0,0,0,.28)'); }
  for (let i = 0; i < 10; i++) { const sx = x + r() * w; g.fillStyle = linGrad(g, 0, y, 0, y + h, ['rgba(20,80,70,0)', 'rgba(20,130,110,.28)', 'rgba(0,0,0,0)']); g.fillRect(sx, y + r() * h * 0.4, 6 + r() * 14, 80 + r() * 220); } g.restore(); }
function winLit(g, x, y, w, h, col, t, seed) { rr(g, x, y, w, h, 5); g.fillStyle = '#05070c'; g.fill(); const f = 0.78 + 0.22 * flick(t, seed, 1.4); g.fillStyle = linGrad(g, 0, y, 0, y + h, [alpha(col, 0.9 * f), alpha(shade(col, -0.4), 0.85 * f)]); g.fillRect(x + 4, y + 4, w - 8, h - 8); seg(g, [[x + w / 2, y + 4], [x + w / 2, y + h - 4]], 3, 'rgba(0,0,0,.6)'); seg(g, [[x + 4, y + h * 0.5], [x + w - 4, y + h * 0.5]], 3, 'rgba(0,0,0,.6)'); glow(g, x + w / 2, y + h / 2, w * 1.3, col, 0.38 * f); rr(g, x - 8, y + h, w + 16, 8, 3); g.fillStyle = '#0a0d14'; g.fill(); }
function streetLamp(g, x, y, h, t, col, seed, num) { seg(g, [[x, y], [x, y - h]], 9, '#0a0d14'); seg(g, [[x - 16, y], [x + 16, y]], 9, '#0a0d14'); rr(g, x - 10, y - 90, 20, 70, 4); g.fillStyle = '#0d1018'; g.fill(); seg(g, [[x, y - h], [x + 22, y - h - 14]], 6, '#0a0d14'); const lx = x + 30, ly = y - h - 10; rr(g, lx - 17, ly - 10, 34, 26, 9); g.fillStyle = alpha(col, 0.95); g.fill(); g.strokeStyle = '#0a0d14'; g.lineWidth = 3; g.stroke(); glow(g, lx, ly, 200, col, 0.55 + 0.05 * Math.sin(t * 7 + seed)); FX.lightCone(g, lx, ly + 8, { angle: Math.PI / 2, spread: 0.7, len: h * 1.15, color: col, a: 0.2 }); moths(g, lx, ly, t + seed, 8);
  if (num) { rr(g, x - 16, y - h * 0.55, 32, 30, 5); g.fillStyle = '#0a0d14'; g.fill(); g.strokeStyle = BRASS; g.lineWidth = 2; g.stroke(); T(g, num, x, y - h * 0.55 + 15, { size: 22, color: BRASS }); } }
function echoRibbon(g, x, y, t, col = '#d8f4ff', h = 140, a = 1) { g.save(); g.globalCompositeOperation = 'lighter'; for (let k = 0; k < 4; k++) { g.strokeStyle = alpha(col, (0.5 - k * 0.1) * a); g.lineWidth = 5 - k; g.beginPath(); for (let i = 0; i <= 24; i++) { const u = i / 24, yy = y - u * h, xx = x + Math.sin(t * 2 + u * 6 + k * 1.3) * (10 + u * 22) * (1 - u * 0.3) + (k - 1.5) * 6; i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); } g.restore(); glow(g, x, y - h * 0.5, 120, col, 0.3 * a); for (let i = 0; i < 14; i++) { const u = ((t * 0.5 + i * 0.07) % 1), px = x + Math.sin(i * 2.1 + t) * 40, py = y - u * (h + 70); circle(g, px, py, 1.6, alpha(col, (1 - u) * 0.9 * a)); } }

// ---------- Бим: живой Железный-фонарщик (рост ≈ 300·s) ----------
function bim(g, x, y, s, t, o = {}) {
  g.save(); g.translate(x, y); g.scale(s, s); const br = Math.sin(t * 2) * 1.5, steel = '#3a3f4e', steel2 = '#252a36', brass = '#a67c2e', f = o.facing ?? 1; g.scale(f, 1);
  g.save(); g.translate(0, 4); g.scale(1, 0.1); g.fillStyle = radGrad(g, 0, 0, 0, 90, ['rgba(0,0,0,.7)', 'rgba(0,0,0,0)']); g.beginPath(); g.arc(0, 0, 90, 0, 7); g.fill(); g.restore();
  // ноги, ботинки
  for (const k of [-1, 1]) { g.fillStyle = k > 0 ? steel : steel2; rr(g, k * 14 - 8, -130, 16, 112, 7); g.fill(); circle(g, k * 14, -80, 9, brass); g.fillStyle = '#16181f'; rr(g, k * 14 - 12 + (k > 0 ? 4 : 0), -22, 34, 20, 7); g.fill(); }
  // торс с грудным люком и тёплым светозерном
  g.fillStyle = linGrad(g, 0, -226, 0, -128, [shade(steel, 0.1), steel, steel2]); rr(g, -30, -230 + br, 60, 108, 12); g.fill(); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 2; g.stroke(); for (const px of [-22, 22]) for (const py of [-222, -134]) circle(g, px, py + br, 2.6, '#12141a');
  circle(g, 0, -176 + br, 20, '#07080c'); g.strokeStyle = brass; g.lineWidth = 3.4; g.beginPath(); g.arc(0, -176 + br, 20, 0, 7); g.stroke(); const pl = 0.8 + 0.2 * Math.sin(t * 2.4); circle(g, 0, -176 + br, 12, alpha(WARM, 0.95)); circle(g, 0, -176 + br, 6, '#fff3d0'); glow(g, 0, -176 + br, 130, WARM, 0.6 * pl);
  // плечи, руки: левая вниз, правая с шестом-зажигалкой вверх
  circle(g, -34, -214 + br, 12, steel2); circle(g, 34, -214 + br, 12, steel); g.fillStyle = steel2; rr(g, -42, -214 + br, 16, 84, 7); g.fill(); circle(g, -34, -126 + br, 9, '#16181f');
  const pa = o.poleAngle ?? -0.9; g.save(); g.translate(34, -214 + br); g.fillStyle = steel; rr(g, -8, 0, 16, 62, 7); g.fill(); g.translate(0, 62); g.rotate(pa + 1.0); g.fillStyle = steel; rr(g, -7, 0, 14, 54, 6); g.fill(); circle(g, 0, 56, 9, '#16181f'); seg(g, [[0, 56], [0, 56 - 330]], 5, '#6a5530'); seg(g, [[0, 56 - 330], [0, 56 - 346]], 8, '#2a2a30'); lite(g, () => { circle(g, 0, 56 - 350, 6, alpha('#fff1c8', 0.95)); glow(g, 0, 56 - 350, 40, WARM, 0.8); }); g.restore();
  // шея и голова-лампа с нитью
  g.fillStyle = steel2; rr(g, -9, -246 + br, 18, 22, 5); g.fill(); circle(g, 0, -278 + br, 30, 'rgba(160,200,225,.16)'); g.strokeStyle = 'rgba(200,230,245,.7)'; g.lineWidth = 3; g.beginPath(); g.arc(0, -278 + br, 30, 0, 7); g.stroke(); const fl = 0.8 + 0.2 * flick(t, 5, 6); g.strokeStyle = alpha(WARM, 0.95 * fl); g.lineWidth = 2.4; g.beginPath(); g.moveTo(-14, -262 + br); g.bezierCurveTo(-10, -296 + br, 0, -262 + br, 6, -292 + br); g.bezierCurveTo(10, -270 + br, 14, -290 + br, 16, -268 + br); g.stroke(); glow(g, 0, -278 + br, 90, WARM, 0.55 * fl); for (const k of [-1, 1]) circle(g, k * 8, -278 + br, 3, '#fff3d0');
  g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.ellipse(-12, -292 + br, 9, 4, -0.7, 0, 7); g.fill(); rr(g, -14, -250 + br, 28, 8, 3); g.fillStyle = brass; g.fill();
  // пучок запасных ламп на плече
  for (let i = 0; i < 3; i++) { circle(g, -30 + i * 14, -236 - (i % 2) * 6 + br, 8, alpha(['#9fd8ff', '#ffd59a', '#ff9ab0'][i], 0.55)); }
  g.restore();
}
function ironMan(g, x, y, s, t) { g.save(); g.translate(x, y); g.scale(s, s); g.save(); g.translate(0, 4); g.scale(1, 0.1); g.fillStyle = radGrad(g, 0, 0, 0, 110, ['rgba(0,0,0,.7)', 'rgba(0,0,0,0)']); g.beginPath(); g.arc(0, 0, 110, 0, 7); g.fill(); g.restore(); const br = Math.sin(t * 2.2) * 1;
  g.fillStyle = '#e8b82a'; rr(g, -22, -56, 20, 54, 6); g.fill(); rr(g, 2, -56, 20, 54, 6); g.fill(); g.fillStyle = '#c99a1a'; g.fillRect(-22, -56, 20, 6); g.fillRect(2, -56, 20, 6);
  g.fillStyle = '#242836'; rr(g, -28, -138 + br, 56, 86, 10); g.fill(); g.fillStyle = '#2f3446'; rr(g, -22, -128 + br, 44, 40, 6); g.fill(); circle(g, 0, -100 + br, 9, alpha(WARM, 0.9)); glow(g, 0, -100 + br, 50, WARM, 0.5); rr(g, -30, -126 + br, 8, 40, 3); g.fillStyle = '#1b1f2c'; g.fill();
  g.fillStyle = '#161a24'; rr(g, -20, -178 + br, 40, 36, 8); g.fill(); circle(g, -8, -162 + br, 5, '#9fffd0'); circle(g, 8, -162 + br, 5, '#9fffd0'); glow(g, 0, -162 + br, 40, '#7dffd0', 0.5); seg(g, [[0, -178 + br], [0, -194 + br]], 3, '#1b1f2c'); circle(g, 0, -196 + br, 4, NEON);
  seg(g, [[26, -116 + br], [74, -84]], 9, '#242836'); g.fillStyle = '#3a2a22'; rr(g, 64, -108, 92, 56, 8); g.fill(); g.strokeStyle = BRASS; g.lineWidth = 2; g.strokeRect(68, -104, 84, 48); circle(g, 84, -46, 11, '#0a0c12'); circle(g, 140, -46, 11, '#0a0c12'); for (let i = 0; i < 3; i++) { circle(g, 90 + i * 22, -90, 6, alpha([TEAL, WARM, NEON][i], 0.8)); glow(g, 90 + i * 22, -90, 26, [TEAL, WARM, NEON][i], 0.4); } g.restore(); }
function walker(g, x, y, s, t, col, hat, umbrella, face = -1) {
  drawFigure(g, { x, y, s, facing: face, outfit: { top: 'trench', color: col, legs: '#1a1f2c', head: hat ? 'fedora' : 'none', headColor: '#171a24' }, pose: breathe(POSES.stand, t), rim: { color: NEON, dir: [-face, -0.3], w: 3.5 }, shadow: true });
  if (umbrella) { const ux = x - face * 30 * s * 0.3, uy = y - 262 * s; g.save(); g.translate(ux, uy); g.fillStyle = '#1e2a3e'; g.beginPath(); g.arc(0, 0, 92, Math.PI, 0); g.closePath(); g.fill(); for (let k = 1; k < 4; k++) seg(g, [[0, -92], [-92 + k * 46, 0]], 1.5, 'rgba(0,0,0,.4)'); g.strokeStyle = alpha(TEAL, 0.6); g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 92, Math.PI, 0); g.stroke(); seg(g, [[0, 0], [0, 80]], 3, '#0a0d14'); g.restore(); }
}

function street(g, t, c) {
  backdrop(g, ['#060a1c', '#13224a', '#3a3a6a', '#b0708a']);
  blurLayer(g, 3.4, (g) => { const rs = rng(3); for (let i = 0; i < 70; i++) circle(g, rs() * E.W, rs() * 360, 1 + rs() * 1.2, `rgba(210,220,255,${0.2 + rs() * 0.4})`);
    for (let L = 0; L < 3; L++) { const r = rng(10 + L * 7), colr = mix('#070b1e', '#232a56', 0.25 + L * 0.28), h0 = 230 + L * 70; for (let x = -200; x < E.W + 300; x += 70 + r() * 90) { const w = 90 + r() * 120, h = h0 + r() * 280; g.fillStyle = colr; g.fillRect(x, GY - 150 - h, w, h + 400); if (r() < 0.4) { g.beginPath(); g.arc(x + w / 2, GY - 150 - h, w / 2, Math.PI, 0); g.fill(); } const rw = rng(Math.floor(x) + L); for (let wy = GY - 150 - h + 24; wy < GY - 170; wy += 30) for (let wx = x + 12; wx < x + w - 14; wx += 22) if (rw() < 0.3 + L * 0.08) { g.fillStyle = alpha([WARM, TEAL, '#ffd9a0', NEON][Math.floor(rw() * 4)], 0.3 + rw() * 0.5); g.fillRect(wx, wy, 8, 13); } } }
    for (let i = 0; i < 3; i++) { const x = ((t * (60 + i * 40) + i * 700) % (E.W + 400)) - 200; lite(g, () => { g.fillStyle = linGrad(g, x - 120, 0, x, 0, [alpha(i % 2 ? NEON : ICE, 0), alpha(i % 2 ? NEON : ICE, 0.7)]); g.fillRect(x - 120, 160 + i * 60, 120, 3); }); glow(g, x, 161 + i * 60, 40, i % 2 ? NEON : ICE, 0.5); }
    for (const [bx, bw] of [[160, 520], [1220, 540]]) { g.strokeStyle = '#0b1026'; g.lineWidth = 26; g.beginPath(); g.arc(bx + bw / 2, GY - 140, bw / 2, Math.PI, 0); g.stroke(); g.strokeStyle = alpha(BRASS, 0.3); g.lineWidth = 3; g.beginPath(); g.arc(bx + bw / 2, GY - 140, bw / 2 - 16, Math.PI, 0); g.stroke(); }
    FX.fog(g, GY - 380, 420, '#6a4a8a', 0.25); }, c, 0.55);
  layer(g, c, 1, (g) => {
    g.fillStyle = linGrad(g, 0, GY - 40, 0, E.H, ['#0d1a36', '#05080f']); g.fillRect(-300, GY - 40, E.W + 600, 300); const rs = rng(9);
    for (let i = 0; i < 18; i++) { const x = rs() * E.W, cc = [WARM, TEAL, NEON][i % 3]; lite(g, () => { for (let k = 0; k < 6; k++) { g.fillStyle = alpha(cc, 0.15 - k * 0.02); g.fillRect(x - 4 + Math.sin(t * 2 + k + i) * 6, GY - 30 + k * 28, 8 + k * 2, 18); } }); }
    brick(g, -120, 170, 540, GY - 40 - 170, '#4a3a3a', 3); brick(g, 1480, 110, 560, GY - 40 - 110, '#3e3c4a', 8); grunge(g, -120, 170, 540, GY - 210, 21, 140); grunge(g, 1480, 110, 560, GY - 150, 22, 140);
    for (const [wx, wy, col, sd] of [[40, 300, WARM, 1], [190, 300, TEAL, 2], [40, 480, WARM, 3], [190, 480, '#ffd9a0', 4], [1560, 250, WARM, 5], [1720, 250, TEAL, 6], [1560, 430, '#ffd9a0', 7], [1720, 430, WARM, 8]]) winLit(g, wx, wy, 90, 110, col, t, sd);
    rr(g, 250, 160, 230, 74, 10); g.fillStyle = '#0a0d14'; g.fill(); g.strokeStyle = alpha(BRASS, 0.5); g.lineWidth = 2; g.stroke(); ring(g, 280, 197, 15, 3, BRASS); seg(g, [[280, 197], [280, 187]], 3, BRASS); seg(g, [[280, 197], [288, 197]], 3, BRASS); T(g, 'ТИК-ТАК', 385, 197, { size: 40, color: BRASS, glow: 18, glowColor: BRASS, spacing: 6, alpha: 0.8 + 0.2 * flick(t, 3, 5) });
    T(g, 'ЛАВКА СВЕТА', 1690, 80, { size: 38, color: NEON, glow: 22, glowColor: NEON, spacing: 5, alpha: 0.88 });
    g.strokeStyle = '#0c1022'; g.lineWidth = 30; g.beginPath(); g.moveTo(420, GY - 40); g.bezierCurveTo(520, GY - 360, 1380, GY - 360, 1480, GY - 40); g.stroke(); g.strokeStyle = alpha(BRASS, 0.45); g.lineWidth = 4; g.beginPath(); g.moveTo(420, GY - 56); g.bezierCurveTo(520, GY - 376, 1380, GY - 376, 1480, GY - 56); g.stroke(); for (let i = 1; i < 12; i++) { const u = i / 12, bx = lerp(430, 1470, u), by = GY - 60 - Math.sin(u * Math.PI) * 300; seg(g, [[bx, by + 14], [bx, GY - 40]], 3, 'rgba(10,14,30,.85)'); circle(g, bx, by, 4, alpha(BRASS, 0.8)); }
    for (let i = 0; i < 4; i++) { const u = 0.25 + i * 0.16 + Math.sin(t * 0.4 + i) * 0.01, bx = lerp(430, 1470, u), by = GY - 56 - Math.sin(u * Math.PI) * 300; g.fillStyle = '#05070c'; rr(g, bx - 6, by - 36, 12, 30, 5); g.fill(); circle(g, bx, by - 40, 6, '#05070c'); }
    // набережная, брусчатка, отражения
    g.fillStyle = linGrad(g, 0, GY - 30, 0, E.H, ['#1a1e30', '#0a0c16']); g.fillRect(-300, GY + 20, E.W + 600, 280); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(-300, GY + 16, E.W + 600, 8); const rr2 = rng(20); for (let i = 0; i < 130; i++) { const bx = rr2() * E.W, by = GY + 36 + rr2() * 200, bw = 16 + rr2() * 34; g.fillStyle = `rgba(${rr2() < 0.5 ? '255,220,180' : '0,0,0'},${0.04 + rr2() * 0.07})`; rr(g, bx, by, bw, bw * 0.55, 4); g.fill(); }
    for (const [x, cc] of [[300, WARM], [820, TEAL], [1480, NEON]]) lite(g, () => { g.fillStyle = linGrad(g, 0, GY + 20, 0, E.H, [alpha(cc, 0.3), alpha(cc, 0)]); g.fillRect(x - 16, GY + 20, 42, 270); });
    for (let i = 0; i < 6; i++) { const px = [260, 700, 1100, 1500, 1760, 940][i], py = GY + 110 + (i % 3) * 40; g.fillStyle = 'rgba(40,70,110,.35)'; g.beginPath(); g.ellipse(px, py, 80 + (i % 2) * 40, 12, 0, 0, 7); g.fill(); lite(g, () => { g.fillStyle = alpha([WARM, TEAL, NEON][i % 3], 0.25); g.beginPath(); g.ellipse(px, py, 40, 5, 0, 0, 7); g.fill(); }); for (let k = 0; k < 2; k++) { const u = (t * 0.7 + i * 0.3 + k * 0.5) % 1; ring(g, px + (k - 0.5) * 50, py, u * 30, 1.4, `rgba(190,225,255,${0.5 * (1 - u)})`); } }
    // фонари: слева горит, №9 справа с Эхо
    const above = (g) => {
    streetLamp(g, 600, GY + 20, 340, t, '#ffd59a', 1, null); streetLamp(g, 1330, GY + 20, 370, t, '#d8f4ff', 2, '9'); echoRibbon(g, 1362, GY - 360, t, '#d8f4ff', 130);
    // персонажи
    ironMan(g, 380, GY + 190, 1.45, t); walker(g, 900, GY + 205, 1.9, t, '#4a2f3a', false, true, -1); bim(g, 1230, GY + 178, 1.22, t, { poleAngle: -1.2 });
    walker(g, 1060, GY - 20, 0.8, t, '#2a2f40', true, false, 1);
    };
    reflect(g, above, GY + 22, 0.32);
    above(g);
    for (let i = 0; i < 7; i++) { const u = (t * 0.3 + i / 7) % 1; glow(g, 1120 + Math.sin(u * 5 + i) * 20, GY + 120 - u * 170, 24 + u * 52, '#aab8d0', 0.16 * (1 - u)); }
    FX.rain(g, t, { seed: 6, count: 130, a: 0.18, len: 40, speed: 1500 }); FX.dust(g, t, { count: 40, color: '#ffe9c0', size: 1.6, a: 0.5 }); });
  fg(g, c, (g) => { seg(g, [[-20, 1010], [E.W + 20, 970]], 12, '#04060b'); for (let i = 0; i < 10; i++) seg(g, [[40 + i * 200, 970], [40 + i * 200, E.H + 40]], 10, '#04060b'); circle(g, 1500, 300, 26, alpha(WARM, 0.9)); rr(g, 1493, 60, 14, 220, 6); g.fillStyle = '#05070c'; g.fill(); glow(g, 1500, 300, 170, WARM, 0.5); }, { blur: 14, depth: 1.6 });
  vig(g, 0.6);
}
registerShot('u1', { draw(g, t, info) { street(g, t, cam(t, info.dur, { z0: 1.02, z1: 1.1, x0: -60, x1: 60, seed: 5 })); } });
registerShot('u2', { draw(g, t, info) { const k = ease.inOut(clamp(t / info.dur)); street(g, t, { z: lerp(1.75, 1.95, k), x: lerp(330, 300, k) + drift(t, 3, 9).x, y: lerp(150, 120, k) + drift(t, 3, 9).y, r: 0 }); } });
