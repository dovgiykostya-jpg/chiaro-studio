// ref.js — «Входящие»: референс-кадры (обсерватория Куратора, Конфлюэнс, Лавка Света). Уровень +1: детальная стилизованная графика кодом.
import { E, clamp, lerp, ease, prog, rr, seg, poly, circle, ring, glow, alpha, shade, mix, linGrad, radGrad, rng, noise, layer, backdrop, registerShot, text, FONTS } from '/engine/core.js';
import { drift, fg } from '/engine/motion.js';
import { drawFigure, POSES, breathe } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';

const TEAL = '#2fd6c8', ICE = '#7fe8ff', BRASS = '#d9a441', WARM = '#ffb25a', NEON = '#ff4fa3', GREEN = '#7dffd0', MONO = 'Menlo, "DejaVu Sans Mono", monospace';
const T = (g, s, x, y, o = {}) => text(g, s, x, y, { font: FONTS.ui, weight: 700, color: '#e6edff', ...o });
const mono = (g, s, x, y, size, col, o = {}) => { g.save(); g.font = `600 ${size}px ${MONO}`; g.textAlign = o.align || 'left'; g.textBaseline = 'middle'; g.globalAlpha *= o.a ?? 1; g.shadowColor = col; g.shadowBlur = o.glow ?? 10; g.fillStyle = col; g.fillText(s, x, y); g.restore(); };
const flick = (t, s, rate = 8) => { const v = Math.sin(Math.floor(t * rate) * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };
const lite = (g, fn) => { g.save(); g.globalCompositeOperation = 'lighter'; fn(); g.restore(); };
const vig = (g, a = 0.62) => { g.save(); g.fillStyle = radGrad(g, E.W / 2, E.H / 2, E.H * 0.32, E.H * 1.05, ['rgba(0,0,0,0)', `rgba(0,0,0,${a})`]); g.fillRect(0, 0, E.W, E.H); g.restore(); };
const camf = (t, dur, o = {}) => { const k = ease.inOut(clamp(t / dur)), d = drift(t, o.d ?? 4, o.seed ?? 2); return { z: lerp(o.z0 ?? 1, o.z1 ?? 1.06, k), x: lerp(o.x0 ?? 0, o.x1 ?? 0, k) + d.x, y: lerp(o.y0 ?? 0, o.y1 ?? 0, k) + d.y, r: d.r }; };

// ---------- ОБЩИЕ ДЕТАЛИ ----------
function moths(g, x, y, t, n = 6, col = '#fff1c8') { for (let i = 0; i < n; i++) { const a = t * (1.2 + i * 0.27) + i * 2.1, r = 22 + (i % 3) * 14; const mx = x + Math.cos(a) * r, my = y + Math.sin(a * 1.3) * r * 0.7; circle(g, mx, my, 1.8, alpha(col, 0.9)); glow(g, mx, my, 10, col, 0.5); } }
function brick(g, x, y, w, h, base, seed, tint = '#000') {
  g.fillStyle = linGrad(g, 0, y, 0, y + h, [shade(base, 0.08), base, shade(base, -0.3)]); g.fillRect(x, y, w, h); const r = rng(seed); g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  for (let yy = y, row = 0; yy < y + h; yy += 22, row++) { for (let xx = x - (row % 2) * 30; xx < x + w; xx += 60) { g.fillStyle = `rgba(${r() < 0.5 ? '255,200,160' : '0,0,0'},${0.03 + r() * 0.06})`; g.fillRect(xx + 2, yy + 2, 56, 18); } seg(g, [[x, yy], [x + w, yy]], 1.5, 'rgba(0,0,0,.28)'); }
  for (let i = 0; i < 9; i++) { const sx = x + r() * w; g.fillStyle = linGrad(g, 0, y, 0, y + h, ['rgba(20,80,70,0)', 'rgba(20,120,100,.25)', 'rgba(0,0,0,0)']); g.fillRect(sx, y + r() * h * 0.4, 6 + r() * 14, 80 + r() * 200); }
  g.restore();
}
function winLit(g, x, y, w, h, col, t, seed) { rr(g, x, y, w, h, 5); g.fillStyle = '#05070c'; g.fill(); const f = 0.75 + 0.25 * flick(t, seed, 1.5); g.fillStyle = linGrad(g, 0, y, 0, y + h, [alpha(col, 0.85 * f), alpha(shade(col, -0.35), 0.8 * f)]); g.fillRect(x + 4, y + 4, w - 8, h - 8); seg(g, [[x + w / 2, y + 4], [x + w / 2, y + h - 4]], 3, 'rgba(0,0,0,.6)'); seg(g, [[x + 4, y + h * 0.5], [x + w - 4, y + h * 0.5]], 3, 'rgba(0,0,0,.6)'); glow(g, x + w / 2, y + h / 2, w * 1.2, col, 0.35 * f); }
function streetLamp(g, x, y, h, t, col = '#ffd59a', seed = 1, out = false) { seg(g, [[x, y], [x, y - h]], 9, '#0a0d14'); seg(g, [[x - 14, y], [x + 14, y]], 9, '#0a0d14'); seg(g, [[x, y - h], [x + 22, y - h - 14]], 6, '#0a0d14'); const lx = x + 30, ly = y - h - 10; rr(g, lx - 16, ly - 10, 32, 24, 8); g.fillStyle = out ? '#1a1d26' : alpha(col, 0.95); g.fill(); g.strokeStyle = '#0a0d14'; g.lineWidth = 3; g.stroke();
  if (!out) { glow(g, lx, ly, 180, col, 0.55 + 0.05 * Math.sin(t * 7 + seed)); FX.lightCone(g, lx, ly + 8, { angle: Math.PI / 2, spread: 0.7, len: h * 1.15, color: col, a: 0.2 }); moths(g, lx, ly, t + seed, 7); } }
function echoRibbon(g, x, y, t, col = '#cfeeff', h = 140, a = 1) { g.save(); g.globalCompositeOperation = 'lighter'; for (let k = 0; k < 4; k++) { g.strokeStyle = alpha(col, (0.5 - k * 0.1) * a); g.lineWidth = 5 - k; g.beginPath(); for (let i = 0; i <= 24; i++) { const u = i / 24, yy = y - u * h, xx = x + Math.sin(t * 2 + u * 6 + k * 1.3) * (10 + u * 22) * (1 - u * 0.3) + (k - 1.5) * 6; i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); } g.restore(); glow(g, x, y - h * 0.5, 120, col, 0.3 * a); for (let i = 0; i < 12; i++) { const u = ((t * 0.5 + i * 0.083) % 1), px = x + Math.sin(i * 2.1 + t) * 40, py = y - u * (h + 60); circle(g, px, py, 1.6, alpha(col, (1 - u) * 0.9 * a)); } }

// ---------- КУРАТОР: силуэт, светящиеся щели вместо глаз, живая нить от затылка ----------
function curator(g, o) {
  const p = o.pose || POSES.stand, s = o.s ?? 2, f = o.facing ?? 1, t = o.t || 0, col = o.col || TEAL;
  const W = (pt) => [o.x + f * s * pt[0], o.y + s * pt[1]];
  drawFigure(g, { ...o, outfit: { top: 'trench', color: '#161a26', legs: '#0b0e16', shoes: '#171b26', cuffs: '#0f131d', head: 'none' }, rim: o.rim ?? { color: col, dir: [1, -0.4], w: 4 }, expr: 'neutral', shadow: o.shadow });
  const hp = W(p.head), r = 26 * s, sh = W(p.sh);
  // поднятый воротник
  g.save(); g.fillStyle = '#10141f'; g.beginPath(); g.moveTo(sh[0] - f * 4 * s, sh[1] + 10 * s); g.lineTo(sh[0] - f * 20 * s, sh[1] - 30 * s); g.lineTo(sh[0] + f * 2 * s, sh[1] - 6 * s); g.closePath(); g.fill(); g.beginPath(); g.moveTo(sh[0] + f * 8 * s, sh[1] + 10 * s); g.lineTo(sh[0] + f * 22 * s, sh[1] - 22 * s); g.lineTo(sh[0] - f * 2 * s, sh[1] - 4 * s); g.closePath(); g.fill(); g.restore();
  // голова: гладкая, тёмная, с щелями-глазами
  circle(g, hp[0], hp[1], r * 1.04, '#0a0c13'); lite(g, () => { g.strokeStyle = alpha(col, 0.9); g.lineWidth = 3; g.beginPath(); g.arc(hp[0], hp[1], r * 1.04, f > 0 ? -1.2 : Math.PI + 0.1, f > 0 ? 0.9 : Math.PI + 1.3); g.stroke(); });
  const ex = hp[0] + f * r * 0.42, ey = hp[1] - r * 0.1, sq = o.squint ?? 0; for (const dy of [0, 7 * s / 2]) { rr(g, ex - r * 0.28, ey + dy - 2.2 * s / 2, r * 0.56, (3.6 - sq) * s / 2, 2); g.fillStyle = '#eafcff'; g.fill(); } glow(g, ex, ey, r * 1.6, col, 0.45);
  // часы на запястье
  const wp = W(p.hF); circle(g, wp[0], wp[1] - 4 * s / 2, 5 * s / 2, '#0a0c13'); circle(g, wp[0], wp[1] - 4 * s / 2, 3 * s / 2, WARM); glow(g, wp[0], wp[1], 30 * s / 2, WARM, 0.5);
  // НИТЬ: тонкая, живая, цвет по миру; по ней бегут световые импульсы
  if (o.port) { const a = [hp[0] - f * r * 0.85, hp[1] + r * 0.25], b = o.port, sag = o.sag ?? 160, sw = Math.sin(t * 1.4) * 14;
    const P = (u) => { const x = lerp(a[0], b[0], u) + Math.sin(u * Math.PI) * -f * 40 * s / 2 + sw * Math.sin(u * 6); const y = lerp(a[1], b[1], u) + Math.sin(u * Math.PI) * sag; return [x, y]; };
    lite(g, () => { for (const [w, al] of [[14, 0.08], [7, 0.18], [3, 0.9]]) { g.strokeStyle = alpha(col, al); g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); for (let i = 0; i <= 40; i++) { const q = P(i / 40); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.stroke(); } });
    for (let i = 0; i < 5; i++) { const u = ((t * 0.45 + i / 5) % 1), q = P(u); circle(g, q[0], q[1], 3.4, '#eafcff'); glow(g, q[0], q[1], 26, col, 0.8); }
    circle(g, b[0], b[1], 7, '#071014'); ring(g, b[0], b[1], 7, 2, col); glow(g, b[0], b[1], 60, col, 0.6); }
}

// ---------- БИМ: Железный-фонарщик (лежит) ----------
function bimLying(g, x, y, s, t) {
  g.save(); g.translate(x, y);
  // контактная тень
  g.save(); g.translate(40 * s, 6 * s); g.scale(1, 0.12); g.fillStyle = radGrad(g, 0, 0, 0, 260 * s, ['rgba(0,0,0,.7)', 'rgba(0,0,0,0)']); g.beginPath(); g.arc(0, 0, 260 * s, 0, 7); g.fill(); g.restore();
  const body = '#3a3f4e', body2 = '#262a36', brass = '#a67c2e';
  // ноги (в сторону +x), ботинки
  for (const [dy, c] of [[-2, body2], [16, body]]) { g.fillStyle = c; rr(g, 120 * s, (dy - 9) * s, 95 * s, 20 * s, 8 * s); g.fill(); rr(g, 205 * s, (dy - 12) * s, 70 * s, 22 * s, 8 * s); g.fill(); g.fillStyle = '#16181f'; rr(g, 268 * s, (dy - 13) * s, 36 * s, 26 * s, 7 * s); g.fill(); circle(g, 215 * s, dy * s, 9 * s, brass); }
  // торс
  g.fillStyle = linGrad(g, 0, -36 * s, 0, 36 * s, [shade(body, 0.1), body, body2]); rr(g, 30 * s, -34 * s, 100 * s, 68 * s, 14 * s); g.fill(); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 2; g.stroke();
  for (const px of [40, 120]) for (const py of [-24, 24]) circle(g, px * s, py * s, 3 * s, '#12141a');
  // грудной люк: открыт, внутри пустое гнездо с остаточным свечением
  g.save(); g.translate(50 * s, -22 * s); g.rotate(-0.5); rr(g, 0, -4 * s, 46 * s, 8 * s, 4 * s); g.fillStyle = body2; g.fill(); g.restore();
  circle(g, 80 * s, 0, 24 * s, '#07080c'); g.strokeStyle = brass; g.lineWidth = 4; g.beginPath(); g.arc(80 * s, 0, 24 * s, 0, 7); g.stroke(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; seg(g, [[80 * s + Math.cos(a) * 14 * s, Math.sin(a) * 14 * s], [80 * s + Math.cos(a) * 24 * s, Math.sin(a) * 24 * s]], 3, brass); }
  glow(g, 80 * s, 0, 70 * s, WARM, 0.08 + 0.05 * Math.sin(t * 2)); lite(g, () => { g.fillStyle = alpha(WARM, 0.14); g.beginPath(); g.arc(80 * s, 0, 12 * s, 0, 7); g.fill(); });
  // шея, голова-лампа
  g.fillStyle = body2; rr(g, 6 * s, -10 * s, 28 * s, 20 * s, 6 * s); g.fill(); circle(g, -30 * s, 0, 40 * s, 'rgba(120,160,180,.14)'); g.strokeStyle = 'rgba(190,225,240,.6)'; g.lineWidth = 3; g.beginPath(); g.arc(-30 * s, 0, 40 * s, 0, 7); g.stroke();
  g.strokeStyle = 'rgba(255,190,100,.28)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-50 * s, 14 * s); g.bezierCurveTo(-40 * s, -16 * s, -20 * s, 16 * s, -8 * s, -12 * s); g.stroke(); g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(-44 * s, -18 * s, 10 * s, 5 * s, -0.6, 0, 7); g.fill();
  // руки: одна вдоль тела, вторая с шестом-зажигалкой
  g.fillStyle = body; rr(g, 40 * s, -52 * s, 90 * s, 16 * s, 8 * s); g.fill(); circle(g, 134 * s, -44 * s, 11 * s, '#16181f'); seg(g, [[140 * s, -44 * s], [330 * s, -50 * s]], 5 * s, '#5a4a2a'); circle(g, 336 * s, -50 * s, 8 * s, '#15171d');
  // пучок запасных ламп на плече
  for (let i = 0; i < 3; i++) { const bx = 62 * s + i * 14 * s, by = -62 * s - (i % 2) * 6 * s; circle(g, bx, by, 8 * s, alpha(['#9fd8ff', '#ffd59a', '#ff9ab0'][i], 0.5)); }
  g.restore();
}

// ============ КАДР 1: ОБСЕРВАТОРИЯ ============
registerShot('r1', { draw(g, t, info) {
  const c = camf(t, info.dur, { z0: 1.0, z1: 1.07, x0: -20, x1: 40, seed: 3 }); backdrop(g, ['#04060f', '#0a1020']);
  // ПЛАН 3: круглое окно в «пустоту» со снегом помех, рёбра обсерватории
  layer(g, c, 0.7, (g) => {
    g.fillStyle = linGrad(g, 0, 0, 0, E.H, ['#0a1226', '#0d1a30', '#08101e']); g.fillRect(-300, -200, E.W + 600, E.H + 400);
    for (let i = -2; i < 14; i++) { const x = i * 190; g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, -100, 26, E.H + 200); seg(g, [[x + 26, -100], [x + 26, E.H + 100]], 2, 'rgba(127,232,255,.12)'); }
    const cx = 960, cy = 330, R = 250; g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.clip(); g.fillStyle = radGrad(g, cx, cy, 10, R, ['#0b1c3a', '#050b1a']); g.fillRect(cx - R, cy - R, R * 2, R * 2);
    const rs = rng(4); for (let i = 0; i < 160; i++) { const px = cx - R + rs() * R * 2, py = cy - R + rs() * R * 2, tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (1 + rs() * 3) + i)); circle(g, px, py, 0.8 + rs() * 1.4, `rgba(200,230,255,${tw * 0.7})`); }
    for (let k = 0; k < 4; k++) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = alpha(TEAL, 0.1); g.lineWidth = 3; g.beginPath(); g.arc(cx + Math.sin(t * 0.3 + k) * 30, cy + Math.cos(t * 0.2 + k) * 20, 60 + k * 50, 0, 7); g.stroke(); g.restore(); }
    // «снег» помех
    for (let i = 0; i < 70; i++) { const px = cx - R + rs() * R * 2, py = cy - R + ((rs() * R * 2 + t * 60) % (R * 2)); g.fillStyle = `rgba(190,230,255,${0.1 + rs() * 0.25})`; g.fillRect(px, py, 2 + rs() * 3, 1.5); } g.restore();
    g.strokeStyle = '#05080f'; g.lineWidth = 22; g.beginPath(); g.arc(cx, cy, R + 8, 0, 7); g.stroke(); g.strokeStyle = 'rgba(127,232,255,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R + 20, 0, 7); g.stroke(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + 0.2; circle(g, cx + Math.cos(a) * (R + 8), cy + Math.sin(a) * (R + 8), 7, '#0d1422'); }
    glow(g, cx, cy, 700, TEAL, 0.12);
    // стеллаж с банками-сигналами (светящиеся шарики)
    for (const [x0, w] of [[60, 420], [1450, 420]]) { rr(g, x0, 440, w, 330, 6); g.fillStyle = '#080c16'; g.fill(); for (let r = 0; r < 3; r++) { seg(g, [[x0 + 8, 520 + r * 100], [x0 + w - 8, 520 + r * 100]], 6, '#141c2c'); for (let k = 0; k < 5; k++) { const jx = x0 + 40 + k * 76, jy = 490 + r * 100, cc = [TEAL, WARM, NEON, GREEN, ICE][(k + r * 2) % 5]; rr(g, jx - 20, jy - 24, 40, 50, 8); g.fillStyle = 'rgba(160,200,240,.12)'; g.fill(); circle(g, jx, jy + 2, 11, alpha(cc, 0.9 * (0.7 + 0.3 * Math.sin(t * 2 + k + r)))); glow(g, jx, jy + 2, 46, cc, 0.4); } } }
    // стенные часы, идущие «не в такт»
    circle(g, 330, 250, 52, '#0a0d14'); ring(g, 330, 250, 52, 5, '#3a3f4e'); for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; seg(g, [[330 + Math.cos(a) * 42, 250 + Math.sin(a) * 42], [330 + Math.cos(a) * 48, 250 + Math.sin(a) * 48]], 2, '#8a93a8'); } const ha = t * 0.5; seg(g, [[330, 250], [330 + Math.cos(ha) * 30, 250 + Math.sin(ha) * 30]], 4, '#d8dde8'); seg(g, [[330, 250], [330 + Math.cos(-ha * 5.3 + 1) * 42, 250 + Math.sin(-ha * 5.3 + 1) * 42]], 2.5, WARM);
    FX.fog(g, 560, 300, '#2a4a7a', 0.16); });
  // ПЛАН 2: консоль, мониторы, Эфир, Куратор
  layer(g, c, 1, (g) => {
    g.fillStyle = linGrad(g, 0, 800, 0, E.H, ['#0f1626', '#04060c']); g.fillRect(-300, 800, E.W + 600, 400); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(-300, 796, E.W + 600, 10);
    // отражения на полу
    FX.pool(g, 1160, 930, 700, 60, TEAL, 0.22); FX.pool(g, 520, 930, 260, 40, WARM, 0.2);
    // консоль
    g.beginPath(); g.moveTo(560, 800); g.lineTo(560, 700); g.quadraticCurveTo(1170, 660, 1780, 700); g.lineTo(1780, 800); g.closePath(); g.fillStyle = linGrad(g, 0, 660, 0, 800, ['#1a2338', '#0c111d']); g.fill(); g.strokeStyle = 'rgba(127,232,255,.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(560, 700); g.quadraticCurveTo(1170, 660, 1780, 700); g.stroke();
    for (let i = 0; i < 22; i++) { const kx = 640 + i * 52, on = flick(t, i, 3 + (i % 4)) > 0.4; rr(g, kx, 740, 36, 16, 4); g.fillStyle = on ? alpha(TEAL, 0.55) : '#141b2c'; g.fill(); }
    // три монитора
    const mon = (x, y, w, h, draw, col, label) => { rr(g, x - 14, y - 14, w + 28, h + 28, 10); g.fillStyle = '#05070c'; g.fill(); g.strokeStyle = 'rgba(160,190,240,.18)'; g.lineWidth = 2; g.stroke(); g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); draw(x, y, w, h); g.fillStyle = 'rgba(0,0,0,.12)'; for (let yy = y; yy < y + h; yy += 3) g.fillRect(x, yy, w, 1); g.fillStyle = linGrad(g, x, y, x + w * 0.6, y + h, ['rgba(255,255,255,.07)', 'rgba(255,255,255,0)']); g.fillRect(x, y, w, h); g.restore(); glow(g, x + w / 2, y + h / 2, w * 0.95, col, 0.18); if (label) mono(g, label, x + 14, y + 22, 20, col, { glow: 6 }); seg(g, [[x + w / 2, y + h + 14], [x + w / 2, y + h + 44]], 14, '#0a0d15'); };
    const street = (dark) => (x, y, w, h) => { g.fillStyle = linGrad(g, 0, y, 0, y + h, ['#0a1830', '#1b2c4a', '#3a2a50']); g.fillRect(x, y, w, h); const r = rng(7); for (let i = 0; i < 9; i++) { const bx = x + i * w / 9, bh = 60 + r() * 120; g.fillStyle = '#060a16'; g.fillRect(bx, y + h - bh, w / 9 - 4, bh); for (let k = 0; k < 6; k++) if (r() < 0.5) { g.fillStyle = alpha(r() > 0.5 ? WARM : ICE, 0.6); g.fillRect(bx + 6 + r() * 30, y + h - bh + 8 + r() * (bh - 16), 4, 5); } } seg(g, [[x + w * 0.55, y + h], [x + w * 0.55, y + h - 90]], 4, '#0a0d14'); circle(g, x + w * 0.55 + 6, y + h - 96, 7, dark ? '#242830' : '#ffe0a0'); if (!dark) glow(g, x + w * 0.55, y + h - 96, 50, '#ffd59a', 0.7); };
    mon(640, 360, 330, 220, street(false), TEAL, 'ВЕРСИЯ А'); mon(1390, 360, 330, 220, street(true), NEON, 'ВЕРСИЯ Б');
    mon(1010, 300, 340, 250, (x, y, w, h) => { g.fillStyle = '#031210'; g.fillRect(x, y, w, h); const L = ['> СИГНАЛ №0001', '> МИР: КОНФЛЮЭНС', '> РАСХОЖДЕНИЕ: ?', '> ФОНАРЬ №9 ......']; let n = Math.floor(t * 30); g.font = `600 22px ${MONO}`; g.textBaseline = 'top'; g.shadowColor = GREEN; g.shadowBlur = 8; L.forEach((l, i) => { const k = clamp(n, 0, l.length); n -= l.length + 3; if (k > 0) { g.fillStyle = i === 2 ? WARM : GREEN; g.fillText(l.slice(0, k), x + 18, y + 22 + i * 44); } }); }, GREEN, null);
    // ЭФИР: парящий символ-«глаз-волна»
    const ex = 1180, ey = 190, ep = 0.8 + 0.2 * Math.sin(t * 2); lite(g, () => { g.strokeStyle = alpha(ICE, 0.9); g.lineWidth = 2.4; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(ex, ey, 58 + k * 16, 26 + k * 7, 0, 0, 7); g.globalAlpha = 0.9 - k * 0.25; g.stroke(); } g.globalAlpha = 1; g.beginPath(); for (let i = 0; i <= 40; i++) { const u = i / 40, xx = ex - 56 + u * 112, yy = ey + Math.sin(u * 12 + t * 4) * 8 * Math.sin(u * Math.PI); i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); }); circle(g, ex, ey, 8 * ep, '#eafcff'); glow(g, ex, ey, 110, ICE, 0.5 * ep);
    // КУРАТОР у консоли (слева), нить к порту консоли
    curator(g, { x: 430, y: 930, s: 2.1, facing: 1, pose: breathe(POSES.holdFront, t, 1.1), t, port: [700, 700], col: TEAL, sag: 120, squint: 0.6, shadow: false });
    // настольная лампа (янтарь) и кружка
    seg(g, [[1750, 700], [1790, 560], [1700, 470]], 7, '#0a0d14'); rr(g, 1660, 452, 90, 30, 12); g.fillStyle = '#10151f'; g.fill(); glow(g, 1700, 486, 130, WARM, 0.5); FX.lightCone(g, 1700, 484, { angle: 1.7, spread: 0.7, len: 420, color: WARM, a: 0.16 });
    rr(g, 1560, 650, 44, 48, 8); g.fillStyle = '#cfc8bc'; g.fill(); g.strokeStyle = '#cfc8bc'; g.lineWidth = 7; g.beginPath(); g.arc(1606, 675, 12, -1.4, 1.4); g.stroke(); for (let i = 0; i < 4; i++) { const u = (t * 0.4 + i / 4) % 1; glow(g, 1582 + Math.sin(u * 7 + i) * 8, 640 - u * 70, 12 + u * 22, '#cfd8e8', 0.16 * (1 - u)); }
    FX.godRays(g, 1180, 330, { count: 5, angle: Math.PI * 0.5, spread: 0.9, len: 600, color: TEAL, a: 0.045, t }); FX.dust(g, t, { count: 70, color: '#bfeaff', area: [300, 200, 1500, 700], size: 1.8, a: 0.55, speed: 7 }); });
  fg(g, c, (g) => { seg(g, [[1500, -20], [1560, 300], [1480, 520]], 14, '#04060b'); seg(g, [[1620, -20], [1700, 220]], 10, '#04060b'); rr(g, -40, 880, 260, 260, 18); g.fillStyle = '#05070c'; g.fill(); glow(g, 120, 900, 220, WARM, 0.12); }, { blur: 12, depth: 1.55 });
  vig(g, 0.62);
} });

// ============ КАДР 2: КОНФЛЮЭНС ============
registerShot('r2', { draw(g, t, info) {
  const c = camf(t, info.dur, { z0: 1.02, z1: 1.1, x0: -60, x1: 60, seed: 5 }); const gy = 880;
  // ПЛАН 3: дальний город, башни, арки мостов в дымке
  layer(g, c, 0.55, (g) => { backdrop(g, ['#060a1c', '#13224a', '#3a3a6a', '#b0708a']); const rs = rng(3); for (let i = 0; i < 70; i++) circle(g, rs() * E.W, rs() * 360, 1 + rs() * 1.2, `rgba(210,220,255,${0.2 + rs() * 0.4})`);
    for (let L = 0; L < 3; L++) { const r = rng(10 + L * 7), colr = mix('#070b1e', '#232a56', 0.25 + L * 0.28), h0 = 220 + L * 70; for (let x = -200; x < E.W + 300; x += 70 + r() * 90) { const w = 90 + r() * 120, h = h0 + r() * 280; g.fillStyle = colr; g.fillRect(x, gy - 160 - h, w, h + 400); if (r() < 0.4) { g.beginPath(); g.arc(x + w / 2, gy - 160 - h, w / 2, Math.PI, 0); g.fill(); } const rw = rng(Math.floor(x) + L); for (let wy = gy - 160 - h + 24; wy < gy - 180; wy += 30) for (let wx = x + 12; wx < x + w - 14; wx += 22) if (rw() < 0.3 + L * 0.08) { g.fillStyle = alpha([WARM, TEAL, '#ffd9a0', NEON][Math.floor(rw() * 4)], 0.3 + rw() * 0.5); g.fillRect(wx, wy, 8, 13); } } }
    // арки мостов
    for (const [bx, bw] of [[200, 460], [1180, 540]]) { g.strokeStyle = '#0b1026'; g.lineWidth = 26; g.beginPath(); g.arc(bx + bw / 2, gy - 150, bw / 2, Math.PI, 0); g.stroke(); g.strokeStyle = alpha(BRASS, 0.3); g.lineWidth = 3; g.beginPath(); g.arc(bx + bw / 2, gy - 150, bw / 2 - 16, Math.PI, 0); g.stroke(); }
    FX.fog(g, gy - 380, 420, '#6a4a8a', 0.25); });
  // ПЛАН 2: набережная, дома, мост, герои
  layer(g, c, 1, (g) => {
    // канал: вода с отражениями
    g.fillStyle = linGrad(g, 0, gy - 40, 0, E.H, ['#0d1a36', '#05080f']); g.fillRect(-300, gy - 40, E.W + 600, 300);
    const rs = rng(9); for (let i = 0; i < 16; i++) { const x = rs() * E.W, cc = [WARM, TEAL, NEON][i % 3]; lite(g, () => { for (let k = 0; k < 6; k++) { g.fillStyle = alpha(cc, 0.14 - k * 0.018); g.fillRect(x - 4 + Math.sin(t * 2 + k + i) * 6, gy - 30 + k * 28, 8 + k * 2, 18); } }); }
    // здания слева и справа (кирпич + окна + вывески)
    brick(g, -120, 180, 520, gy - 40 - 180, '#4a3a3a', 3); brick(g, 1500, 120, 520, gy - 40 - 120, '#3e3c4a', 8);
    for (const [wx, wy, col, sd] of [[40, 300, WARM, 1], [180, 300, TEAL, 2], [40, 480, WARM, 3], [180, 480, '#ffd9a0', 4], [1580, 260, WARM, 5], [1720, 260, TEAL, 6], [1580, 440, '#ffd9a0', 7], [1720, 440, WARM, 8]]) winLit(g, wx, wy, 90, 110, col, t, sd);
    // вывеска «ТИК-ТАК»
    rr(g, 250, 170, 220, 70, 10); g.fillStyle = '#0a0d14'; g.fill(); T(g, 'ТИК-ТАК', 360, 205, { size: 40, color: BRASS, glow: 18, glowColor: BRASS, spacing: 6, a: 0.8 + 0.2 * flick(t, 3, 5) }); circle(g, 280, 205, 14, 'rgba(217,164,65,.0)'); ring(g, 270, 205, 14, 3, BRASS); seg(g, [[270, 205], [270, 196]], 3, BRASS); seg(g, [[270, 205], [277, 205]], 3, BRASS);
    T(g, 'ЛАВКА СВЕТА', 1700, 90, { size: 38, color: NEON, glow: 20, glowColor: NEON, spacing: 5, a: 0.85 });
    // мост-арка (сухой мост Железных) на среднем плане
    g.strokeStyle = '#0c1022'; g.lineWidth = 30; g.beginPath(); g.moveTo(420, gy - 40); g.bezierCurveTo(520, gy - 360, 1380, gy - 360, 1480, gy - 40); g.stroke(); g.strokeStyle = alpha(BRASS, 0.45); g.lineWidth = 4; g.beginPath(); g.moveTo(420, gy - 56); g.bezierCurveTo(520, gy - 376, 1380, gy - 376, 1480, gy - 56); g.stroke(); for (let i = 1; i < 12; i++) { const u = i / 12, bx = lerp(430, 1470, u), by = gy - 60 - Math.sin(u * Math.PI) * 300; seg(g, [[bx, by + 14], [bx, gy - 40]], 3, 'rgba(10,14,30,.85)'); circle(g, bx, by, 4, alpha(BRASS, 0.8)); }
    // набережная (брусчатка)
    g.fillStyle = linGrad(g, 0, gy - 40, 0, E.H, ['#1a1e30', '#0a0c16']); g.fillRect(-300, gy + 20, E.W + 600, 260); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(-300, gy + 16, E.W + 600, 8); const rr2 = rng(20); for (let i = 0; i < 110; i++) { const bx = rr2() * E.W, by = gy + 40 + rr2() * 200, bw = 16 + rr2() * 30; g.fillStyle = `rgba(${rr2() < 0.5 ? '255,220,180' : '0,0,0'},${0.04 + rr2() * 0.06})`; rr(g, bx, by, bw, bw * 0.55, 4); g.fill(); }
    // отражения неона на мокрой брусчатке
    for (const [x, cc] of [[300, WARM], [860, TEAL], [1500, NEON]]) lite(g, () => { g.fillStyle = linGrad(g, 0, gy + 20, 0, E.H, [alpha(cc, 0.28), alpha(cc, 0)]); g.fillRect(x - 14, gy + 20, 28 + 12, 260); });
    // фонари: №9 погас, с ленточкой Эхо внутри
    streetLamp(g, 560, gy + 20, 330, t, '#ffd59a', 1); streetLamp(g, 1290, gy + 20, 360, t, '#cfeeff', 2, false); echoRibbon(g, 1322, gy - 360, t, '#d8f4ff', 120);
    // ПЕРСОНАЖИ: Железный с тележкой, человек с зонтом, Куратор (как наблюдатель на мосту нет)
    const ironMan = (x, y, s) => { g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = '#1b1f2c'; rr(g, -22, -150, 44, 90, 8); g.fill(); g.fillStyle = '#2a2f40'; rr(g, -26, -118, 52, 54, 8); g.fill(); g.fillStyle = '#12141c'; rr(g, -18, -184, 36, 34, 6); g.fill(); circle(g, -7, -168, 5, WARM); circle(g, 8, -168, 5, WARM); glow(g, 0, -168, 36, WARM, 0.5); g.fillStyle = '#e8b82a'; rr(g, -22, -60, 20, 58, 6); g.fill(); rr(g, 2, -60, 20, 58, 6); g.fill(); circle(g, 0, -92, 8, alpha(WARM, 0.8)); glow(g, 0, -92, 40, WARM, 0.5); seg(g, [[26, -110], [70, -90]], 8, '#1b1f2c'); rr(g, 60, -100, 80, 50, 8); g.fillStyle = '#2a1f1a'; g.fill(); circle(g, 80, -48, 10, '#0a0c12'); circle(g, 124, -48, 10, '#0a0c12'); g.restore(); lite(g, () => { g.strokeStyle = alpha(CY2(), 0.4); g.lineWidth = 2; g.beginPath(); g.moveTo(x - 22 * s, y - 150 * s); g.lineTo(x - 22 * s, y - 60 * s); g.stroke(); }); };
    function CY2() { return ICE; }
    ironMan(700, gy + 150, 1.5);
    drawFigure(g, { x: 1000, y: gy + 170, s: 2.0, facing: -1, outfit: { top: 'trench', color: '#4a2f3a', legs: '#1a1f2c', head: 'none' }, pose: breathe(POSES.stand, t), rim: { color: NEON, dir: [-1, -0.3], w: 4 } });
    g.save(); g.translate(1000 - 20, gy + 170 - 380); g.fillStyle = '#1e2a3e'; g.beginPath(); g.arc(0, 0, 110, Math.PI, 0); g.closePath(); g.fill(); g.strokeStyle = alpha(TEAL, 0.5); g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 110, Math.PI, 0); g.stroke(); g.restore();
    // пар из люка и камешки
    for (let i = 0; i < 7; i++) { const u = (t * 0.3 + i / 7) % 1; glow(g, 1180 + Math.sin(u * 5 + i) * 20, gy + 120 - u * 160, 24 + u * 50, '#aab8d0', 0.16 * (1 - u)); }
    FX.rain(g, t, { seed: 6, count: 120, a: 0.18, len: 40, speed: 1500 }); FX.dust(g, t, { count: 40, color: '#ffe9c0', size: 1.6, a: 0.5 }); });
  fg(g, c, (g) => { seg(g, [[-20, 1000], [E.W + 20, 960]], 12, '#04060b'); for (let i = 0; i < 10; i++) seg(g, [[40 + i * 200, 960], [40 + i * 200, E.H + 40]], 10, '#04060b'); rr(g, 1500, 60, 14, 220, 6); g.fillStyle = '#05070c'; g.fill(); circle(g, 1507, 290, 26, alpha(WARM, 0.9)); glow(g, 1507, 290, 160, WARM, 0.5); }, { blur: 14, depth: 1.6 });
  vig(g, 0.6);
} });

// ============ КАДР 3: ЛАВКА СВЕТА ============
registerShot('r3', { draw(g, t, info) {
  const c = camf(t, info.dur, { z0: 1.0, z1: 1.08, x0: 40, x1: -40, seed: 7 }); const gy = 850;
  // ПЛАН 3: задняя стена, стеллажи с цветными лампами
  layer(g, c, 0.8, (g) => { backdrop(g, ['#08090f', '#120e14']); brick(g, -200, 0, E.W + 400, gy, '#2c2430', 4);
    for (const [x0, w] of [[120, 520], [1320, 520]]) { rr(g, x0, 150, w, 560, 6); g.fillStyle = '#0a0b12'; g.fill(); for (let r = 0; r < 4; r++) { seg(g, [[x0 + 8, 250 + r * 140], [x0 + w - 8, 250 + r * 140]], 8, '#1c1a24'); for (let k = 0; k < 6; k++) { const lx = x0 + 50 + k * 80, ly = 210 + r * 140, cc = [WARM, TEAL, NEON, GREEN, '#ffd9a0', '#9fb8ff'][(k + r) % 6], f = 0.6 + 0.4 * flick(t, k * 7 + r, 1.4); circle(g, lx, ly, 22, alpha(cc, 0.8 * f)); circle(g, lx, ly - 30, 5, '#0a0b12'); seg(g, [[lx, ly - 22], [lx, ly - 30]], 4, '#0a0b12'); glow(g, lx, ly, 70, cc, 0.32 * f); } } }
    // окно на канал с каплей на подоконнике
    rr(g, 800, 170, 320, 360, 8); g.fillStyle = linGrad(g, 0, 170, 0, 530, ['#0c1830', '#1d2a50', '#3a2a50']); g.fill(); g.save(); g.beginPath(); g.rect(800, 170, 320, 360); g.clip(); for (let i = 0; i < 6; i++) { const bx = 800 + i * 55; g.fillStyle = '#070a16'; g.fillRect(bx, 330 + (i % 3) * 30, 45, 200); g.fillStyle = alpha(WARM, 0.6); g.fillRect(bx + 10, 350 + (i % 3) * 30 + (i * 17) % 50, 6, 8); } glow(g, 1000, 300, 140, NEON, 0.25); g.restore(); g.strokeStyle = '#05070c'; g.lineWidth = 16; g.strokeRect(800, 170, 320, 360); seg(g, [[960, 170], [960, 530]], 10, '#05070c'); seg(g, [[800, 350], [1120, 350]], 10, '#05070c'); rr(g, 780, 532, 360, 22, 6); g.fillStyle = '#1a1620'; g.fill();
    circle(g, 1010, 540, 5, 'rgba(190,225,255,.9)'); glow(g, 1010, 540, 24, ICE, 0.6); circle(g, 1007, 538, 1.6, '#fff');
    FX.lightCone(g, 960, 300, { angle: Math.PI / 2, spread: 0.9, len: 600, color: NEON, a: 0.12 });
    // потолочная лампа (дверь Эхо)
    seg(g, [[960, 0], [960, 70]], 5, '#05070c'); rr(g, 925, 70, 70, 36, 14); g.fillStyle = alpha('#ffe8b0', 0.95); g.fill(); g.strokeStyle = '#05070c'; g.lineWidth = 4; g.stroke(); glow(g, 960, 94, 230, WARM, 0.55 + 0.05 * Math.sin(t * 6)); moths(g, 960, 94, t, 6);
    FX.fog(g, 520, 320, '#3a2a44', 0.16); });
  // ПЛАН 2: верстак, колпак, щипцы, Бим на полу, цепочка искр
  layer(g, c, 1, (g) => {
    g.fillStyle = linGrad(g, 0, gy, 0, E.H, ['#1c1722', '#07060a']); g.fillRect(-300, gy, E.W + 600, 300); g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(-300, gy - 4, E.W + 600, 8); const rf = rng(14); for (let i = 0; i < 12; i++) seg(g, [[i * 180 - 40, gy], [i * 180 - 140 - (i % 3) * 20, E.H + 80]], 2, 'rgba(0,0,0,.35)'); for (let i = 0; i < 40; i++) { const px = rf() * E.W, py = gy + 20 + rf() * 180; circle(g, px, py, 1.5 + rf() * 2.5, `rgba(${rf() < 0.5 ? '255,220,180' : '60,50,60'},${0.2 + rf() * 0.3})`); }
    FX.pool(g, 960, gy + 110, 520, 60, WARM, 0.28);
    // дверь с железным засовом (К1) справа
    rr(g, 1560, 250, 300, 600, 8); g.fillStyle = linGrad(g, 1560, 0, 1860, 0, ['#2a2530', '#3a3440', '#2a2530']); g.fill(); g.strokeStyle = '#05070c'; g.lineWidth = 8; g.stroke(); for (let y = 320; y < 840; y += 90) seg(g, [[1576, y], [1844, y]], 2, 'rgba(0,0,0,.4)'); rr(g, 1590, 520, 240, 22, 6); g.fillStyle = '#6a6e7a'; g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(1592, 523, 236, 3); circle(g, 1600, 531, 9, '#3a3e48'); circle(g, 1820, 531, 9, '#3a3e48');
    // верстак слева
    rr(g, 120, 640, 640, 40, 6); g.fillStyle = '#3a2a24'; g.fill(); g.fillStyle = 'rgba(255,200,140,.2)'; g.fillRect(120, 640, 640, 3); for (const x of [150, 710]) { g.fillStyle = '#16121a'; g.fillRect(x, 680, 26, 170); } rr(g, 140, 730, 600, 20, 4); g.fillStyle = '#1e1822'; g.fill();
    // щипцы (К2), пустой колпак (К3), смятая бумага (К5)
    seg(g, [[220, 636], [330, 600]], 6, '#9aa6b8'); seg(g, [[220, 630], [340, 612]], 6, '#7a8698'); circle(g, 214, 634, 9, '#4a3a2a');
    g.beginPath(); g.arc(520, 636, 60, Math.PI, 0); g.closePath(); g.fillStyle = 'rgba(170,210,235,.16)'; g.fill(); g.strokeStyle = 'rgba(210,235,250,.6)'; g.lineWidth = 3; g.beginPath(); g.arc(520, 636, 60, Math.PI, 0); g.stroke(); g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.ellipse(496, 596, 12, 6, -0.6, 0, 7); g.fill(); rr(g, 470, 628, 100, 14, 4); g.fillStyle = '#2a2420'; g.fill();
    g.save(); g.translate(640, 630); g.rotate(0.15); g.fillStyle = '#d8cdb0'; g.beginPath(); g.moveTo(-26, 0); g.lineTo(-18, -22); g.lineTo(4, -28); g.lineTo(22, -14); g.lineTo(28, 4); g.lineTo(0, 8); g.closePath(); g.fill(); g.strokeStyle = 'rgba(90,70,50,.6)'; g.lineWidth = 1.4; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-18 + k * 6, -16 + k * 4); g.lineTo(10 + k * 3, -18 + k * 5); g.stroke(); } circle(g, 8, -8, 6, 'rgba(180,40,40,.7)'); g.restore();
    // БИМ на полу
    bimLying(g, 700, gy + 120, 2.0, t);
    // цепочка искр от груди Бима вверх к потолочной лампе
    lite(g, () => { for (let i = 0; i < 18; i++) { const u = ((t * 0.28 + i / 18) % 1), px = lerp(860, 960, u) + Math.sin(u * 9 + i) * 14 * (1 - u), py = lerp(gy + 120, 110, u) - Math.sin(u * Math.PI) * 40; circle(g, px, py, 2.4 * (1 - u * 0.5), alpha('#fff3d0', 0.9 * (1 - u * 0.4))); glow(g, px, py, 18, WARM, 0.5 * (1 - u)); } });
    FX.godRays(g, 960, 100, { count: 6, angle: Math.PI * 0.5, spread: 0.8, len: 780, color: WARM, a: 0.06, t }); FX.dust(g, t, { count: 90, color: '#ffe9c0', area: [200, 100, 1500, 800], size: 1.9, a: 0.6, speed: 6 }); });
  fg(g, c, (g) => { rr(g, -30, 780, 300, 420, 20); g.fillStyle = '#05050a'; g.fill(); circle(g, 110, 800, 30, alpha(TEAL, 0.5)); glow(g, 110, 800, 160, TEAL, 0.3); seg(g, [[1750, -20], [1780, 260], [1700, 420]], 12, '#04050a'); }, { blur: 13, depth: 1.55 });
  vig(g, 0.6);
} });
