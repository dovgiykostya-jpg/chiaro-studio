// room.js — «Входящие»: обсерватория Часовщика. Герой утверждён (hero.js). 4 кадра: общий, средний, крупный, верстак.
import { E, clamp, lerp, ease, prog, rr, seg, poly, circle, ring, glow, alpha, shade, mix, linGrad, radGrad, rng, noise, layer, backdrop, registerShot, text, FONTS, blurLayer } from '/engine/core.js';
import { drift, fg } from '/engine/motion.js';
import * as FX from '/engine/fx2d.js';
import { head, body, thread, smooth, lite, T } from '../_core.js';

const TEAL = '#2fd6c8', ICE = '#7fe8ff', WARM = '#ffb25a', NEON = '#ff4fa3', GREEN = '#7dffd0', BRASS = '#c79a3c', BRASS_D = '#7a5c1e', SKIN = '#a47c64', MONO = 'Menlo, "DejaVu Sans Mono", monospace';
const mono = (g, s, x, y, size, col, o = {}) => { g.save(); g.font = `600 ${size}px ${MONO}`; g.textAlign = o.align || 'left'; g.textBaseline = 'middle'; g.globalAlpha *= o.a ?? 1; g.shadowColor = col; g.shadowBlur = o.glow ?? 10; g.fillStyle = col; g.fillText(s, x, y); g.restore(); };
const flick = (t, s, rate = 8) => { const v = Math.sin(Math.floor(t * rate) * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };
const vig = (g, a = 0.62) => { g.save(); g.fillStyle = radGrad(g, E.W / 2, E.H / 2, E.H * 0.32, E.H * 1.05, ['rgba(0,0,0,0)', `rgba(0,0,0,${a})`]); g.fillRect(0, 0, E.W, E.H); g.restore(); };
const cam = (t, dur, o = {}) => { const k = ease.inOut(clamp(t / dur)), d = drift(t, o.d ?? 3.5, o.seed ?? 2); return { z: lerp(o.z0 ?? 1, o.z1 ?? 1.06, k), x: lerp(o.x0 ?? 0, o.x1 ?? 0, k) + d.x, y: lerp(o.y0 ?? 0, o.y1 ?? 0, k) + d.y, r: d.r }; };
const FLOOR = 930, HX = 560, S = 1.0;


// ---- качество: отражение на полу, фактура ----
let _rc = null;
function reflect(g, fn) {
  const m = g.getTransform(), W = g.canvas.width, H = g.canvas.height;
  if (!_rc || _rc.width !== W || _rc.height !== H) { _rc = document.createElement('canvas'); _rc.width = W; _rc.height = H; }
  const r = _rc.getContext('2d'); r.setTransform(1, 0, 0, 1, 0, 0); r.clearRect(0, 0, W, H); r.setTransform(m); r.globalAlpha = 1; fn(r);
  const yS = m.f + m.d * FLOOR;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.beginPath(); g.rect(0, yS, W, H - yS); g.clip(); g.globalAlpha = 0.24; g.translate(0, 2 * yS); g.scale(1, -1); g.drawImage(_rc, 0, 0); g.restore();
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); const gr = g.createLinearGradient(0, yS, 0, yS + m.d * 260); gr.addColorStop(0, 'rgba(8,12,22,0)'); gr.addColorStop(1, 'rgba(5,8,15,.97)'); g.fillStyle = gr; g.fillRect(0, yS, W, H - yS); g.restore();
}
function grunge(g, x, y, w, h, seed, n = 200, light = 0.06) {
  const r = rng(seed); g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.lineCap = 'round';
  for (let i = 0; i < n; i++) { const px = x + r() * w, py = y + r() * h, L = 6 + r() * 60, a = r() * Math.PI; g.strokeStyle = r() < 0.5 ? `rgba(0,0,0,${0.05 + r() * 0.12})` : `rgba(190,215,255,${light * (0.4 + r())})`; g.lineWidth = 0.6 + r() * 1.2; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L); g.stroke(); }
  for (let i = 0; i < n * 2; i++) { const px = x + r() * w, py = y + r() * h; g.fillStyle = r() < 0.55 ? `rgba(0,0,0,${0.06 + r() * 0.1})` : `rgba(200,220,255,${0.03 + r() * 0.05})`; g.fillRect(px, py, 1 + r() * 2.2, 1 + r() * 2.2); }
  g.restore();
}

// ---------- часы на стене (мотив героя): у каждых свой мир и своё время ----------
function clockFace(g, x, y, r, t, seed, col) {
  circle(g, x, y, r + 6, '#06080e'); ring(g, x, y, r + 5, 5, BRASS_D); ring(g, x, y, r + 2, 2, BRASS); circle(g, x, y, r, linGrad(g, 0, y - r, 0, y + r, ['#e8e2cf', '#b9b199']));
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; seg(g, [[x + Math.sin(a) * (r - 4), y - Math.cos(a) * (r - 4)], [x + Math.sin(a) * (r - (k % 3 ? 9 : 14)), y - Math.cos(a) * (r - (k % 3 ? 9 : 14))]], k % 3 ? 1.6 : 2.6, '#2a2418'); }
  const sp = 0.05 + (seed % 5) * 0.12, h = seed * 1.7 + t * sp * 0.2, m = seed * 2.3 + t * sp * 2.4; seg(g, [[x, y], [x + Math.sin(h) * r * 0.5, y - Math.cos(h) * r * 0.5]], 3.4, '#2a2418'); seg(g, [[x, y], [x + Math.sin(m) * r * 0.78, y - Math.cos(m) * r * 0.78]], 2.2, '#2a2418'); seg(g, [[x, y], [x + Math.sin(t * (seed % 2 ? 6 : -4) + seed) * r * 0.82, y - Math.cos(t * (seed % 2 ? 6 : -4) + seed) * r * 0.82]], 1.2, '#a82a1a'); circle(g, x, y, 3, '#2a2418');
  g.fillStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.45, r * 0.5, r * 0.16, -0.6, 0, 7); g.fill(); glow(g, x, y, r * 2.2, col, 0.16);
}
// ---------- рука с локтем (2-костный IK) ----------
function arm(g, sx, sy, hx, hy, side, t, o = {}) {
  const L1 = 152, L2 = 146, dx = hx - sx, dy = hy - sy; let d = Math.min(Math.hypot(dx, dy), L1 + L2 - 0.5); const ang = Math.atan2(dy, dx) - side * Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)); const ex = sx + Math.cos(ang) * L1, ey = sy + Math.sin(ang) * L1;
  const coat = '#2a2f3a', coat2 = '#10141c', limb = (a, b, w) => { g.save(); g.lineCap = 'round'; g.strokeStyle = coat2; g.lineWidth = w + 3; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.strokeStyle = coat; g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.restore(); };
  limb([sx, sy], [ex, ey], 34); limb([ex, ey], [hx, hy], 30);
  lite(g, () => { g.lineCap = 'round'; g.strokeStyle = alpha(side > 0 ? ICE : WARM, 0.55); g.lineWidth = 2.6; g.beginPath(); g.moveTo(sx + (side > 0 ? 18 : -18), sy); g.lineTo(ex + (side > 0 ? 16 : -16), ey); g.lineTo(hx + (side > 0 ? 10 : -10), hy - 4); g.stroke(); });
  const fa = Math.atan2(hy - ey, hx - ex); g.save(); g.translate(hx, hy); g.rotate(fa); g.fillStyle = '#10141c'; rr(g, -18, -21, 22, 42, 6); g.fill(); g.fillStyle = SKIN; rr(g, 2, -14, 38, 28, 10); g.fill(); g.fillStyle = 'rgba(10,8,8,.45)'; g.fillRect(14, 4, 10, 6); for (let k = 0; k < 3; k++) { const bob = o.type ? Math.max(0, Math.sin(t * 9 + k * 1.9)) * 4 : 0; rr(g, 34, -12 + k * 9, 14 + bob, 7, 3); g.fillStyle = SKIN; g.fill(); } g.restore();
  return [hx, hy];
}
// ---------- ГЕРОЙ в сцене ----------
function hero(g, t, o = {}) {
  const br = Math.sin(t * 2.1) * 2; g.save(); g.translate(HX, FLOOR); g.scale(S, S);
  g.save(); g.scale(0.72, 1); body(g, t); g.restore();
  // руки: правая на консоли (печатает), левая держит карманные часы у груди
  const R = arm(g, 76, -560 + br, 205, -300 + Math.sin(t * 9) * 1.2, 1, t, { type: true }); const Lh = o.watch ?? [-34, -400]; arm(g, -76, -560 + br, Lh[0], Lh[1], -1, t);
  // карманные часы в левой руке: поднятая крышка, свет по миру
  const wx = Lh[0] + 12, wy = Lh[1] + 6; circle(g, wx, wy, 22, BRASS_D); circle(g, wx, wy, 19, '#e8e2cf'); const wa = t * 1.4; seg(g, [[wx, wy], [wx + Math.cos(wa) * 13, wy + Math.sin(wa) * 13]], 2.2, '#2a2418'); seg(g, [[wx, wy], [wx + Math.cos(-wa * 3) * 9, wy + Math.sin(-wa * 3) * 9]], 2, '#a82a1a'); glow(g, wx, wy, 60, TEAL, 0.45);
  // голова: повёрнута вправо к экранам
  g.save(); g.translate(6, -694 + br * 0.6); g.rotate(-0.07); g.scale(1.18, 1.26); head(g, t, { expr: o.expr || 'curious', blink: (t % 3.6) > 3.5, look: 1.3 }); g.restore();
  // нить от затылка к порту консоли (мировые координаты → локальные)
  thread(g, t, 56, -650, 250, -296, TEAL);
  g.restore();
}

// ---------- КОМНАТА ----------
function backWall(g, t) {
  g.fillStyle = linGrad(g, 0, 0, 0, FLOOR, ['#08101e', '#0e1a30', '#0a1424']); g.fillRect(-300, -200, E.W + 600, FLOOR + 200);
  // панели с рёбрами и заклёпками
  for (let i = -2; i < 14; i++) { const x = i * 190; g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x, -100, 24, E.H + 200); seg(g, [[x + 24, -100], [x + 24, E.H + 100]], 2, 'rgba(127,232,255,.12)'); for (let y = 160; y < FLOOR; y += 130) { circle(g, x + 12, y, 3, '#05080f'); circle(g, x + 11, y - 1, 1.2, 'rgba(160,190,240,.3)'); } }
  const rs = rng(9); for (let i = 0; i < 22; i++) { const x = rs() * E.W, y = 100 + rs() * 760, w = 80 + rs() * 200; g.fillStyle = radGrad(g, x, y, 0, w, ['rgba(0,0,0,.2)', 'rgba(0,0,0,0)']); g.beginPath(); g.ellipse(x, y, w, w * 0.6, 0, 0, 7); g.fill(); }
  // трубы и кабели под потолком
  for (const [y, w, c] of [[40, 24, '#162238'], [86, 18, '#101a2c']]) { g.fillStyle = linGrad(g, 0, y - w / 2, 0, y + w / 2, [shade(c, 0.14), c, shade(c, -0.4)]); g.fillRect(-300, y - w / 2, E.W + 600, w); for (let x = 80; x < E.W; x += 330) { g.fillStyle = '#080e1a'; g.fillRect(x, y - w / 2 - 4, 12, w + 8); } }
  // иллюминатор с туманностью
  const cx = 960, cy = 330, R = 250; g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.clip(); g.fillStyle = radGrad(g, cx, cy, 10, R, ['#0b2244', '#050b1a']); g.fillRect(cx - R, cy - R, R * 2, R * 2);
  lite(g, () => { for (let k = 0; k < 4; k++) { g.fillStyle = radGrad(g, cx + Math.sin(t * 0.15 + k * 2) * 60 + (k - 1.5) * 50, cy + Math.cos(t * 0.12 + k) * 40, 0, 190, [alpha([TEAL, NEON, ICE, WARM][k], 0.22), 'rgba(0,0,0,0)']); g.fillRect(cx - R, cy - R, R * 2, R * 2); } });
  const rt = rng(4); for (let i = 0; i < 170; i++) { const a = rt() * 6.283, rr2 = rt() * R, tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (1 + rt() * 3) + i)); circle(g, cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2, 0.8 + rt() * 1.5, `rgba(210,235,255,${tw * 0.8})`); }
  g.restore(); g.strokeStyle = '#05080f'; g.lineWidth = 24; g.beginPath(); g.arc(cx, cy, R + 8, 0, 7); g.stroke(); g.strokeStyle = alpha(BRASS, 0.5); g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, R + 22, 0, 7); g.stroke(); for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; circle(g, cx + Math.cos(a) * (R + 8), cy + Math.sin(a) * (R + 8), 7, '#0d1422'); circle(g, cx + Math.cos(a) * (R + 8) - 1, cy + Math.sin(a) * (R + 8) - 1, 2, 'rgba(180,200,255,.4)'); }
  glow(g, cx, cy, 760, TEAL, 0.14);
  grunge(g, -300, 100, E.W + 600, FLOOR - 100, 11, 260);
  // СТЕНА ЧАСОВ слева: каждые в своём мире
  rr(g, 40, 150, 520, 400, 10); g.fillStyle = '#0a111e'; g.fill(); g.strokeStyle = 'rgba(199,154,60,.3)'; g.lineWidth = 3; g.stroke(); const cl = [[130, 230, 52, 1, TEAL], [270, 220, 40, 2, WARM], [400, 240, 56, 3, NEON], [180, 380, 44, 4, ICE], [320, 390, 58, 5, GREEN], [470, 380, 38, 6, WARM], [110, 480, 30, 7, TEAL], [250, 500, 28, 8, NEON]];
  cl.forEach(([x, y, r, s, c]) => clockFace(g, x, y, r, t, s, c));
  // стеллаж с банками-сигналами справа
  rr(g, 1380, 170, 500, 480, 8); g.fillStyle = '#080e18'; g.fill(); for (let r = 0; r < 4; r++) { seg(g, [[1392, 270 + r * 118], [1868, 270 + r * 118]], 7, '#16223a'); for (let k = 0; k < 6; k++) { const jx = 1430 + k * 74, jy = 230 + r * 118, cc = [TEAL, WARM, NEON, GREEN, ICE, '#d8cdb0'][(k + r * 2) % 6], f = 0.65 + 0.35 * Math.sin(t * 2 + k + r); rr(g, jx - 21, jy - 28, 42, 54, 9); g.fillStyle = 'rgba(160,200,240,.12)'; g.fill(); g.strokeStyle = 'rgba(190,215,245,.28)'; g.lineWidth = 1.6; g.stroke(); circle(g, jx, jy, 11, alpha(cc, 0.95 * f)); glow(g, jx, jy, 46, cc, 0.4 * f); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(jx - 15, jy - 22, 4, 36); } }
  FX.fog(g, 560, 300, '#2a4a7a', 0.16);
}
function monitors(g, t) {
  const mon = (x, y, w, h, draw, col, label) => { rr(g, x - 14, y - 14, w + 28, h + 28, 10); g.fillStyle = '#05070c'; g.fill(); g.strokeStyle = 'rgba(160,190,240,.18)'; g.lineWidth = 2; g.stroke(); g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); draw(x, y, w, h); g.fillStyle = 'rgba(0,0,0,.12)'; for (let yy = y; yy < y + h; yy += 3) g.fillRect(x, yy, w, 1); g.fillStyle = linGrad(g, x, y, x + w * 0.6, y + h, ['rgba(255,255,255,.08)', 'rgba(255,255,255,0)']); g.fillRect(x, y, w, h); g.restore(); glow(g, x + w / 2, y + h / 2, w * 0.95, col, 0.2); if (label) mono(g, label, x + 14, y + 22, 20, col, { glow: 6 }); seg(g, [[x + w / 2, y + h + 14], [x + w / 2, y + h + 44]], 14, '#0a0d15'); };
  const street = (dark) => (x, y, w, h) => { g.fillStyle = linGrad(g, 0, y, 0, y + h, ['#0a1830', '#1b2c4a', '#3a2a50']); g.fillRect(x, y, w, h); const r = rng(7); for (let i = 0; i < 9; i++) { const bx = x + i * w / 9, bh = 60 + r() * 120; g.fillStyle = '#060a16'; g.fillRect(bx, y + h - bh, w / 9 - 4, bh); for (let k = 0; k < 6; k++) if (r() < 0.5) { g.fillStyle = alpha(r() > 0.5 ? WARM : ICE, 0.6); g.fillRect(bx + 6 + r() * 30, y + h - bh + 8 + r() * (bh - 16), 4, 5); } } seg(g, [[x + w * 0.55, y + h], [x + w * 0.55, y + h - 90]], 4, '#0a0d14'); circle(g, x + w * 0.55 + 6, y + h - 96, 7, dark ? '#242830' : '#ffe0a0'); if (!dark) glow(g, x + w * 0.55, y + h - 96, 50, '#ffd59a', 0.7); };
  mon(780, 350, 300, 200, street(false), TEAL, 'ВЕРСИЯ А'); mon(1230, 350, 300, 200, street(true), NEON, 'ВЕРСИЯ Б');
  mon(1100, 280, 330, 240, (x, y, w, h) => { g.fillStyle = '#031210'; g.fillRect(x, y, w, h); const L = ['> СИГНАЛ №0001', '> МИР: КОНФЛЮЭНС', '> РАСХОЖДЕНИЕ: ?', '> ФОНАРЬ №9 .... ']; let n = Math.floor((t + 1.2) * 30); g.font = `600 21px ${MONO}`; g.textBaseline = 'top'; g.shadowColor = GREEN; g.shadowBlur = 8; L.forEach((l, i) => { const k = clamp(n, 0, l.length); n -= l.length + 3; if (k > 0) { g.fillStyle = i === 2 ? WARM : GREEN; g.fillText(l.slice(0, k), x + 18, y + 22 + i * 42); } }); }, GREEN, null);
}
function room(g, t, c, o = {}) {
  backdrop(g, ['#04060f', '#0a1020']);
  blurLayer(g, 3.6, (g) => backWall(g, t), c, 0.72);
  layer(g, c, 1, (g) => {
    // пол с отражениями
    g.fillStyle = linGrad(g, 0, FLOOR - 4, 0, E.H + 100, ['#101a2c', '#04060c']); g.fillRect(-300, FLOOR - 4, E.W + 600, 320); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(-300, FLOOR - 6, E.W + 600, 8);
    for (let i = 0; i < 18; i++) seg(g, [[i * 130 - 100, FLOOR], [i * 130 - 260 - (i % 4) * 16, E.H + 120]], 2, 'rgba(120,160,220,.07)'); seg(g, [[-100, FLOOR + 70], [E.W + 100, FLOOR + 70]], 2, 'rgba(120,160,220,.06)');
    FX.pool(g, 1140, FLOOR + 40, 700, 56, TEAL, 0.26); FX.pool(g, 560, FLOOR + 34, 280, 38, WARM, 0.22); FX.pool(g, 220, FLOOR + 40, 260, 30, WARM, 0.2);
    grunge(g, -300, FLOOR, E.W + 600, E.H - FLOOR, 13, 120, 0.05);
    const above = (g, refl) => {
    // ВЕРСТАК часовщика слева (лампа, детали механизмов)
    rr(g, 40, 700, 440, 36, 6); g.fillStyle = '#3a2a24'; g.fill(); g.fillStyle = 'rgba(255,200,140,.22)'; g.fillRect(40, 700, 440, 3); for (const x of [70, 440]) { g.fillStyle = '#16121a'; g.fillRect(x, 736, 22, 194); }
    for (let i = 0; i < 6; i++) { const gx = 90 + i * 62, gr = 14 + (i % 3) * 7; g.save(); g.translate(gx, 690); g.rotate(t * (i % 2 ? 0.6 : -0.5) + i); g.fillStyle = i % 2 ? BRASS : BRASS_D; g.beginPath(); for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, r2 = k % 2 ? gr - 4 : gr; k ? g.lineTo(Math.cos(a) * r2, Math.sin(a) * r2) : g.moveTo(Math.cos(a) * r2, Math.sin(a) * r2); } g.closePath(); g.fill(); circle(g, 0, 0, 4, '#0a0c12'); g.restore(); }
    seg(g, [[130, 700], [160, 560], [230, 500]], 6, '#0a0d14'); rr(g, 200, 484, 76, 28, 12); g.fillStyle = '#10151f'; g.fill(); glow(g, 238, 516, 150, WARM, 0.55); FX.lightCone(g, 238, 514, { angle: 1.75, spread: 0.7, len: 360, color: WARM, a: 0.2 });
    // КОНСОЛЬ
    g.beginPath(); g.moveTo(560, FLOOR); g.lineTo(560, 740); g.quadraticCurveTo(1180, 690, 1800, 740); g.lineTo(1800, FLOOR); g.closePath(); g.fillStyle = linGrad(g, 0, 690, 0, FLOOR, ['#1a2338', '#0a0f1a']); g.fill(); g.strokeStyle = alpha(ICE, 0.4); g.lineWidth = 3; g.beginPath(); g.moveTo(560, 740); g.quadraticCurveTo(1180, 690, 1800, 740); g.stroke();
    for (let i = 0; i < 24; i++) { const kx = 640 + i * 48, on = flick(t, i, 3 + (i % 4)) > 0.4; rr(g, kx, 770, 34, 16, 4); g.fillStyle = on ? alpha(TEAL, 0.6) : '#141b2c'; g.fill(); }
    // пульт Часовщика: подставка на удобной высоте, рядом с героем
    g.beginPath(); g.moveTo(690, FLOOR - 10); g.lineTo(700, 650); g.lineTo(930, 650); g.lineTo(940, FLOOR - 10); g.closePath(); g.fillStyle = linGrad(g, 0, 650, 0, FLOOR, ['#202c44', '#0b101c']); g.fill(); g.strokeStyle = alpha(ICE, 0.45); g.lineWidth = 3; g.beginPath(); g.moveTo(700, 650); g.lineTo(930, 650); g.stroke();
    rr(g, 712, 636, 206, 18, 6); g.fillStyle = '#0a0d15'; g.fill(); for (let i = 0; i < 9; i++) { const on = flick(t, i + 40, 4) > 0.35; rr(g, 724 + i * 21, 640, 14, 10, 3); g.fillStyle = on ? alpha(TEAL, 0.8) : '#1a2236'; g.fill(); } FX.pool(g, 815, 660, 180, 20, TEAL, 0.25);
    monitors(g, t);
    // Эфир
    const ex = 1250, ey = 175, ep = 0.8 + 0.2 * Math.sin(t * 2); lite(g, () => { g.strokeStyle = alpha(ICE, 0.9); g.lineWidth = 2.4; for (let k = 0; k < 3; k++) { g.globalAlpha = 0.9 - k * 0.25; g.beginPath(); g.ellipse(ex, ey, 56 + k * 16, 24 + k * 7, 0, 0, 7); g.stroke(); } g.globalAlpha = 1; g.beginPath(); for (let i = 0; i <= 40; i++) { const u = i / 40, xx = ex - 54 + u * 108, yy = ey + Math.sin(u * 12 + t * 4) * 8 * Math.sin(u * Math.PI); i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); }); circle(g, ex, ey, 8 * ep, '#eafcff'); glow(g, ex, ey, 110, ICE, 0.5 * ep);
    // порт нити на консоли
    circle(g, 812, 640, 9, '#071014'); ring(g, 812, 640, 9, 2.4, TEAL); glow(g, 812, 640, 70, TEAL, 0.7);
    // кружка, лампа, бумаги
    rr(g, 1620, 690, 46, 50, 8); g.fillStyle = '#cfc8bc'; g.fill(); g.strokeStyle = '#cfc8bc'; g.lineWidth = 7; g.beginPath(); g.arc(1668, 716, 13, -1.4, 1.4); g.stroke(); for (let i = 0; i < 4; i++) { const u = (t * 0.4 + i / 4) % 1; glow(g, 1642 + Math.sin(u * 7 + i) * 8, 680 - u * 70, 12 + u * 22, '#cfd8e8', 0.16 * (1 - u)); }
    for (let i = 0; i < 3; i++) { g.save(); g.translate(1500 + i * 12, 736 - i * 4); g.rotate(-0.06 + i * 0.05); g.fillStyle = ['#d8cdb0', '#cdd3de', '#e0d6bc'][i]; g.fillRect(-48, -4, 96, 4); g.restore(); }
    seg(g, [[1790, 740], [1830, 600], [1740, 510]], 7, '#0a0d14'); rr(g, 1700, 492, 90, 30, 12); g.fillStyle = '#10151f'; g.fill(); glow(g, 1745, 526, 140, WARM, 0.5); FX.lightCone(g, 1745, 524, { angle: 1.75, spread: 0.7, len: 420, color: WARM, a: 0.14 });
    if (o.hero !== false) hero(g, t, o);
    };
    reflect(g, (gg) => above(gg, true));
    FX.pool(g, 1140, FLOOR + 40, 700, 56, TEAL, 0.3); FX.pool(g, 560, FLOOR + 34, 280, 38, WARM, 0.25); FX.pool(g, 220, FLOOR + 40, 260, 30, WARM, 0.22);
    above(g, false);
    FX.godRays(g, 960, 330, { count: 6, angle: Math.PI * 0.5, spread: 1.0, len: 700, color: TEAL, a: 0.04, t }); FX.dust(g, t, { count: 90, color: '#bfeaff', area: [200, 150, 1600, 780], size: 1.9, a: 0.55, speed: 7 });
  });
  fg(g, c, (g) => { seg(g, [[1560, -20], [1620, 280], [1540, 480]], 14, '#04060b'); seg(g, [[1700, -20], [1780, 200]], 10, '#04060b'); rr(g, -60, 860, 300, 300, 22); g.fillStyle = '#05070c'; g.fill(); glow(g, 100, 880, 240, WARM, 0.13); circle(g, 1860, 1000, 70, '#05070b'); }, { blur: 12, depth: 1.55 });
  vig(g, 0.62);
}

registerShot('w1', { draw(g, t, info) { room(g, t, cam(t, info.dur, { z0: 1.0, z1: 1.07, x0: -30, x1: 50, seed: 3 })); } });
// средний: на герое и консоли
registerShot('w2', { draw(g, t, info) { const k = ease.inOut(clamp(t / info.dur)); room(g, t, { z: lerp(1.75, 1.95, k), x: lerp(-250, -230, k) + drift(t, 3, 5).x, y: lerp(-60, -90, k) + drift(t, 3, 5).y, r: 0 }, { expr: 'curious' }); } });
// крупный: лицо и линза, озарение на 2 с
registerShot('w3', { draw(g, t, info) { const k = ease.inOut(clamp(t / info.dur)); const ins = t > 1.8; room(g, t, { z: lerp(3.2, 3.6, k), x: lerp(-400, -380, k) + drift(t, 2.5, 6).x, y: lerp(-280, -300, k) + drift(t, 2.5, 6).y, r: 0 }, { expr: ins ? 'insight' : 'curious' }); } });
// верстак: механизмы под лампой
registerShot('w4', { draw(g, t, info) { const k = ease.inOut(clamp(t / info.dur)); room(g, t, { z: lerp(2.2, 2.4, k), x: lerp(-720, -680, k) + drift(t, 3, 7).x, y: lerp(110, 90, k) + drift(t, 3, 7).y, r: 0 }, { hero: false }); } });
