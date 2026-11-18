// bunker.js — «Входящие»: бункер детектива. s001 общий план (3 плана глубины), s002 крупно лицо у мониторов.
import { E, clamp, lerp, ease, prog, rr, seg, poly, circle, ring, glow, alpha, shade, mix, linGrad, radGrad, rng, noise, layer, backdrop, registerShot, text } from '/engine/core.js';
import { drift, fg } from '/engine/motion.js';
import { drawFigure, POSES, breathe, bigFace } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';
import { drawChair } from '../_hero.js';
import { drawFox } from '../_fox.js';

const GY = 905;                       // линия пола
const MONO = 'Menlo, "DejaVu Sans Mono", monospace';
const CY = '#7fe8ff', GR = '#7dffd0', AM = '#ffb25a', MG = '#ff4fa3';
// герой «Следователь»: тёмная толстовка, наушники на шее, взъерошенные волосы, очки
const HERO = { top: 'suit', color: '#3b4258', color2: '#b3322a', legs: '#1c2232', shoes: '#2a2f3e', cuffs: '#161b28', head: 'fedora', headColor: '#1b1f2e', face: 'glasses', neckPhones: '#c9d3e4' };

const blink = (t, p = 0, per = 3.1) => ((t + p) % per) > per - 0.13;
const flick = (t, s, rate = 6) => { const v = Math.sin(Math.floor(t * rate) * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };

// ---------- ЗАДНИЙ ПЛАН: бетонная стена, трубы, окно с дождём, серверная стойка ----------
function backWall(g, t) {
  g.fillStyle = linGrad(g, 0, 0, 0, GY, ['#0a0e17', '#121a27', '#0d131e']); g.fillRect(-300, -200, E.W + 600, GY + 200);
  // бетонные панели, швы, заклёпки
  for (let x = -240; x < E.W + 300; x += 260) { seg(g, [[x, 130], [x, GY]], 3, 'rgba(0,0,0,.55)'); seg(g, [[x + 3, 130], [x + 3, GY]], 1.5, 'rgba(120,150,200,.07)'); for (let y = 190; y < GY; y += 120) { circle(g, x + 14, y, 3, '#06090f'); circle(g, x + 13, y - 1, 1.2, 'rgba(160,190,240,.25)'); } }
  seg(g, [[-300, 420], [E.W + 300, 420]], 3, 'rgba(0,0,0,.5)'); seg(g, [[-300, 640], [E.W + 300, 640]], 3, 'rgba(0,0,0,.5)');
  // пятна влаги и трещины
  const r = rng(21); for (let i = 0; i < 26; i++) { const x = r() * E.W, y = 140 + r() * 700, w = 60 + r() * 220; g.fillStyle = radGrad(g, x, y, 0, w, [`rgba(0,0,0,${0.18 + r() * 0.18})`, 'rgba(0,0,0,0)']); g.beginPath(); g.ellipse(x, y, w, w * 0.6, 0, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(1330, 150); g.lineTo(1345, 210); g.lineTo(1322, 262); g.lineTo(1350, 330); g.stroke();
  // потолок и трубы
  g.fillStyle = '#070a11'; g.fillRect(-300, -200, E.W + 600, 330);
  for (const [y, w, c] of [[52, 26, '#19212f'], [98, 20, '#141b27']]) { g.fillStyle = linGrad(g, 0, y - w / 2, 0, y + w / 2, [shade(c, 0.12), c, shade(c, -0.4)]); g.fillRect(-300, y - w / 2, E.W + 600, w); for (let x = 60; x < E.W; x += 310) { g.fillStyle = '#0a0e16'; g.fillRect(x, y - w / 2 - 4, 12, w + 8); } }
  // вентиль + пар
  const vx = 330, vy = 98; circle(g, vx, vy, 26, '#0b0f18'); ring(g, vx, vy, 22, 5, '#7a3a2a'); seg(g, [[vx - 22, vy], [vx + 22, vy]], 4, '#7a3a2a'); seg(g, [[vx, vy - 22], [vx, vy + 22]], 4, '#7a3a2a');
  for (let i = 0; i < 6; i++) { const u = ((t * 0.28 + i / 6) % 1); const x = 560 + Math.sin(u * 6 + i) * 18 + u * 30, y = 108 + u * 120; glow(g, x, y, 28 + u * 56, '#9fb8d8', 0.1 * (1 - u)); }
  // жёлто-чёрная полоса у потолка
  g.save(); g.beginPath(); g.rect(-300, 128, E.W + 600, 10); g.clip(); g.fillStyle = '#c9a227'; g.fillRect(-300, 128, E.W + 600, 10); g.fillStyle = '#0c0f16'; for (let x = -300; x < E.W + 300; x += 36) { g.beginPath(); g.moveTo(x, 138); g.lineTo(x + 14, 128); g.lineTo(x + 28, 128); g.lineTo(x + 14, 138); g.fill(); } g.restore();
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(-300, 138, E.W + 600, 16);
  // ОКНО-ЩЕЛЬ: ночной город под дождём, неоновая вывеска
  const wx = 150, wy = 175, ww = 430, wh = 120; g.save(); g.beginPath(); g.rect(wx, wy, ww, wh); g.clip();
  g.fillStyle = linGrad(g, 0, wy, 0, wy + wh, ['#0b1030', '#26204d', '#4a2a5a']); g.fillRect(wx, wy, ww, wh);
  const rb = rng(8); for (let x = wx - 20; x < wx + ww; x += 28 + rb() * 40) { const h = 30 + rb() * 80, w = 24 + rb() * 40; g.fillStyle = '#06081a'; g.fillRect(x, wy + wh - h, w, h); for (let k = 0; k < 6; k++) if (rb() < 0.55) { g.fillStyle = alpha(rb() > 0.5 ? '#ffc66e' : '#9fd8ff', 0.5 + rb() * 0.4); g.fillRect(x + 4 + rb() * (w - 10), wy + wh - h + 6 + rb() * (h - 14), 4, 5); } }
  glow(g, wx + 330, wy + 40, 110, MG, 0.55); g.fillStyle = MG; g.fillRect(wx + 305, wy + 34, 50, 6); g.fillStyle = '#fff'; g.fillRect(wx + 308, wy + 36, 44, 2);
  FX.rain(g, t, { seed: 4, count: 90, area: [wx - 10, wy, ww + 20, wh], speed: 900, len: 20, a: 0.5, color: '#cfe0ff', w: 1.4 });
  for (let i = 0; i < 9; i++) { const rr2 = rng(i * 7 + 2), dx = wx + rr2() * ww, dy = wy + ((rr2() * wh + t * (14 + rr2() * 22)) % wh); circle(g, dx, dy, 2.2, 'rgba(200,220,255,.5)'); seg(g, [[dx, dy - 10], [dx, dy]], 1.2, 'rgba(200,220,255,.25)'); }
  g.restore(); g.strokeStyle = '#04060b'; g.lineWidth = 14; g.strokeRect(wx, wy, ww, wh); for (const x of [wx + 143, wx + 286]) seg(g, [[x, wy], [x, wy + wh]], 8, '#04060b'); g.strokeStyle = 'rgba(160,190,240,.18)'; g.lineWidth = 2; g.strokeRect(wx - 7, wy - 7, ww + 14, wh + 14);
  // неоновый отсвет окна: конус на стену и пол
  FX.lightCone(g, wx + 330, wy + 120, { angle: Math.PI * 0.62, spread: 0.9, len: 620, color: MG, a: 0.1 });
  // СЕРВЕРНАЯ СТОЙКА слева, мигающие индикаторы
  const rx = 110, ry = 360, rw = 250, rh = GY - ry; rr(g, rx, ry, rw, rh, 6); g.fillStyle = '#080c14'; g.fill(); g.strokeStyle = '#1b2434'; g.lineWidth = 3; g.stroke();
  for (let i = 0; i < 9; i++) { const y = ry + 18 + i * 56; rr(g, rx + 14, y, rw - 28, 46, 3); g.fillStyle = '#0e1521'; g.fill(); g.strokeStyle = 'rgba(120,150,200,.15)'; g.lineWidth = 1; g.stroke();
    for (let k = 0; k < 6; k++) seg(g, [[rx + 30 + k * 6, y + 12], [rx + 30 + k * 6, y + 34]], 2, 'rgba(0,0,0,.6)');
    for (let k = 0; k < 7; k++) { const on = flick(t, i * 9 + k, 3 + (k % 3)) > 0.45; const c = k % 4 === 0 ? '#ff6a4a' : k % 3 === 0 ? AM : GR; circle(g, rx + 120 + k * 15, y + 14, 3.2, on ? c : '#1a2230'); if (on) glow(g, rx + 120 + k * 15, y + 14, 16, c, 0.5); }
    g.fillStyle = '#05080f'; g.fillRect(rx + 120, y + 28, 90, 6); }
  // кабели из стойки к столу
  for (const [dy, c] of [[0, '#0b0f17'], [10, '#13283a'], [20, '#2a1620']]) { g.strokeStyle = c; g.lineWidth = 7; g.beginPath(); g.moveTo(rx + rw, ry + 120 + dy); g.bezierCurveTo(rx + rw + 140, ry + 130 + dy, rx + rw + 160, GY - 170 + dy, rx + rw + 330, GY - 170 + dy * 1.6); g.stroke(); }
  // пробковая доска с заметками и красной нитью
  const bx = 620, by = 200, bw = 330, bh = 220; rr(g, bx, by, bw, bh, 4); g.fillStyle = '#2a2018'; g.fill(); g.strokeStyle = '#05070c'; g.lineWidth = 6; g.stroke();
  const rn = rng(44); for (let i = 0; i < 7; i++) { const nx = bx + 20 + (i % 4) * 78 + rn() * 10, ny = by + 20 + Math.floor(i / 4) * 92 + rn() * 12; g.save(); g.translate(nx, ny); g.rotate((rn() - 0.5) * 0.22); g.fillStyle = i % 3 === 0 ? '#c9b873' : '#bfc7cf'; g.fillRect(0, 0, 62, 70); g.fillStyle = 'rgba(0,0,0,.35)'; for (let k = 0; k < 4; k++) g.fillRect(6, 12 + k * 12, 40 + rn() * 12, 2.5); circle(g, 31, 5, 3.5, '#b3322a'); g.restore(); }
  g.strokeStyle = 'rgba(210,50,50,.75)'; g.lineWidth = 2; g.beginPath(); g.moveTo(bx + 50, by + 25); g.lineTo(bx + 130, by + 120); g.lineTo(bx + 205, by + 40); g.lineTo(bx + 280, by + 130); g.stroke();
  // лампочка в клетке (янтарный практический свет)
  const lx = 1080, ly = 170; seg(g, [[lx, 140], [lx, ly - 12]], 3, '#05070c'); circle(g, lx, ly, 13, '#ffd9a0'); glow(g, lx, ly, 200, AM, 0.2 + 0.03 * Math.sin(t * 9)); g.strokeStyle = '#05070c'; g.lineWidth = 2; g.beginPath(); g.arc(lx, ly, 17, 0, 7); g.stroke(); for (let a = 0; a < 3; a++) { g.beginPath(); g.ellipse(lx, ly, 17, 7 + a * 4, a * 0.5, 0, 7); g.stroke(); }
  // вентиляционная решётка справа
  rr(g, 1620, 190, 220, 130, 6); g.fillStyle = '#080b12'; g.fill(); for (let i = 0; i < 7; i++) seg(g, [[1636, 206 + i * 17], [1824, 206 + i * 17]], 6, '#161e2c');
  // пол
  g.fillStyle = linGrad(g, 0, GY, 0, E.H + 60, ['#101722', '#05070c']); g.fillRect(-300, GY, E.W + 600, E.H - GY + 200); g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(-300, GY - 6, E.W + 600, 10);
  FX.floorLines(g, GY + 10, E.H + 40, 'rgba(120,150,200,.05)');
  FX.fog(g, 560, 340, '#3a4a78', 0.18);   // дымка — задний план приглушён
}

// ---------- мониторы ----------
function termContent(g, x, y, w, h, t) {
  g.fillStyle = '#031210'; g.fillRect(x, y, w, h);
  const lines = ['> ВХОДЯЩЕЕ  №0417', '> источник: НЕ ОПРЕДЕЛЁН', '> мир: 9-Б  «дожди идут вверх»', '> жителей: ~40 000   людей: 0', '> метка: ПОДОЗРИТЕЛЬНО ТИХО', '> принять? [Д/н] '];
  let n = Math.floor(Math.max(0, t - 0.3) * 42); g.save(); g.font = `600 ${Math.round(h * 0.07)}px ${MONO}`; g.textBaseline = 'top'; g.shadowColor = GR; g.shadowBlur = 10;
  lines.forEach((l, i) => { const k = clamp(n, 0, l.length); n -= l.length + 4; if (k <= 0) return; g.fillStyle = i === 0 ? '#eafff6' : i === 4 ? AM : GR; g.fillText(l.slice(0, k), x + w * 0.05, y + h * 0.09 + i * h * 0.12); });
  if (n > 0 && Math.floor(t * 2.2) % 2 === 0) { g.fillStyle = GR; g.fillRect(x + w * 0.05 + g.measureText(lines[5]).width + 4, y + h * 0.09 + 5 * h * 0.12, h * 0.045, h * 0.07); }
  g.restore();
}
function mapContent(g, x, y, w, h, t) {
  g.fillStyle = '#04141f'; g.fillRect(x, y, w, h); const cx = x + w / 2, cy = y + h / 2;
  g.strokeStyle = 'rgba(127,232,255,.18)'; g.lineWidth = 1; for (let i = 1; i < 5; i++) { g.beginPath(); g.arc(cx, cy, i * h * 0.1, 0, 7); g.stroke(); } seg(g, [[x, cy], [x + w, cy]], 1, 'rgba(127,232,255,.18)'); seg(g, [[cx, y], [cx, y + h]], 1, 'rgba(127,232,255,.18)');
  const a = t * 1.6; g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = radGrad(g, cx, cy, 0, h * 0.48, ['rgba(127,232,255,.35)', 'rgba(127,232,255,0)']); g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, h * 0.48, a - 0.5, a); g.closePath(); g.fill(); g.restore();
  const r = rng(6); for (let i = 0; i < 7; i++) { const bx = cx + (r() - 0.5) * w * 0.8, by = cy + (r() - 0.5) * h * 0.8; circle(g, bx, by, 3 + (i === 2 ? 2 * Math.sin(t * 5) : 0), i === 2 ? AM : CY); }
}
function listContent(g, x, y, w, h, t) {
  g.fillStyle = '#0a0f1d'; g.fillRect(x, y, w, h); for (let i = 0; i < 6; i++) { const yy = y + 14 + i * (h / 6.4), hot = i === 1, a = hot ? 0.9 : 0.35 + 0.15 * Math.sin(t + i); g.fillStyle = alpha(hot ? AM : '#6f84a6', 0.18); g.fillRect(x + 10, yy, w - 20, h / 8); g.fillStyle = alpha(hot ? AM : CY, a); g.fillRect(x + 18, yy + 8, (w - 40) * (0.4 + 0.5 * ((i * 37) % 10) / 10), 5); g.fillRect(x + 18, yy + 20, (w - 40) * 0.3, 4); if (hot && Math.floor(t * 2) % 2 === 0) circle(g, x + w - 24, yy + h / 16, 5, '#ff5a4a'); }
}
function monitor(g, x, y, w, h, content, t, col, bright = 1) {
  rr(g, x - 12, y - 12, w + 24, h + 24, 8); g.fillStyle = '#05070c'; g.fill(); g.strokeStyle = 'rgba(160,190,240,.14)'; g.lineWidth = 2; g.stroke();
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); content(g, x, y, w, h, t);
  g.fillStyle = 'rgba(0,0,0,.14)'; for (let yy = y; yy < y + h; yy += 3) g.fillRect(x, yy, w, 1);     // строки развёртки
  g.fillStyle = linGrad(g, x, y, x + w * 0.6, y + h, ['rgba(255,255,255,.07)', 'rgba(255,255,255,0)']); g.fillRect(x, y, w, h);   // блик стекла
  g.restore(); glow(g, x + w / 2, y + h / 2, w * 0.95, col, 0.16 * bright);
  seg(g, [[x + w / 2, y + h + 12], [x + w / 2, y + h + 44]], 12, '#0a0d15'); rr(g, x + w / 2 - 54, y + h + 40, 108, 10, 4); g.fillStyle = '#0a0d15'; g.fill();
  circle(g, x + w - 14, y + h + 4, 2.5, flick(t, x, 1.5) > 0.3 ? GR : '#124'); // индикатор питания
}

// ---------- СРЕДНИЙ ПЛАН: стол, мониторы, герой ----------
function midLayer(g, t, hero) {
  const DT = 735;
  // тень и отражение на полу
  g.fillStyle = radGrad(g, 1150, GY + 8, 0, 760, ['rgba(0,0,0,.55)', 'rgba(0,0,0,0)']); g.save(); g.translate(1150, GY + 8); g.scale(1, 0.12); g.translate(-1150, -(GY + 8)); g.beginPath(); g.arc(1150, GY + 8, 760, 0, 7); g.fill(); g.restore();
  FX.pool(g, 1380, GY + 46, 620, 70, CY, 0.2); FX.pool(g, 830, GY + 40, 280, 44, CY, 0.18);
  // стул и герой
  drawChair(g, hero.x - 6, GY, t);
  drawFox(g, hero.x, GY, t, { lean: hero.lean || 0, look: hero.look ?? [0.8, -0.1], talk: hero.talk || 0, blink: blink(t, 0.4) });
  // стол: столешница, ножки, ящик
  const dx0 = 640, dw = E.W + 100; g.fillStyle = linGrad(g, 0, DT, 0, DT + 26, ['#2a3446', '#161c28', '#0b0f17']); g.fillRect(dx0, DT, dw, 26);
  g.fillStyle = 'rgba(160,200,255,.22)'; g.fillRect(dx0, DT, dw, 2.5);
  for (const x of [dx0 + 40, 1760]) { g.fillStyle = '#0a0d14'; g.fillRect(x, DT + 26, 22, GY - DT - 26); } rr(g, 1230, DT + 26, 330, 120, 4); g.fillStyle = '#0c1019'; g.fill(); g.strokeStyle = 'rgba(120,150,200,.15)'; g.lineWidth = 2; g.stroke(); rr(g, 1380, DT + 78, 30, 8, 3); g.fillStyle = '#2a3446'; g.fill();
  // мониторы
  monitor(g, 985, 405, 235, 175, mapContent, t, CY, 0.8);
  monitor(g, 1280, 300, 400, 270, termContent, t, GR, 1.1);
  monitor(g, 1730, 380, 190, 190, listContent, t, AM, 0.7);
  // клавиатура с подсветкой, мышь
  rr(g, 905, DT - 12, 290, 16, 4); g.fillStyle = '#0a0d15'; g.fill(); for (let k = 0; k < 14; k++) { const lit = flick(t, k, 12) > 0.8; g.fillStyle = lit ? 'rgba(127,232,255,.7)' : 'rgba(127,232,255,.18)'; g.fillRect(912 + k * 20, DT - 9, 14, 3); }
  rr(g, 1240, DT - 10, 40, 12, 6); g.fillStyle = '#0a0d15'; g.fill();
  // голографический проектор с головой лиса (оранжевое кольцо, как на пульте из референса)
  { const hx0 = 1640, hy0 = DT - 6; g.save(); for (let i = 0; i < 3; i++) { g.strokeStyle = alpha(AM, 0.85 - i * 0.2); g.lineWidth = 3 - i * 0.6; g.beginPath(); g.ellipse(hx0, hy0 - i * 3, 70 - i * 12, 14 - i * 2.4, 0, 0, 7); g.stroke(); }
    glow(g, hx0, hy0, 140, AM, 0.4); const fl = 0.75 + 0.25 * Math.sin(t * 7) * Math.sin(t * 2.3);
    g.globalCompositeOperation = 'lighter'; g.fillStyle = linGrad(g, 0, hy0, 0, hy0 - 190, [alpha(AM, 0.22 * fl), alpha(AM, 0)]); g.beginPath(); g.moveTo(hx0 - 66, hy0); g.lineTo(hx0 + 66, hy0); g.lineTo(hx0 + 40, hy0 - 190); g.lineTo(hx0 - 40, hy0 - 190); g.closePath(); g.fill();
    g.translate(hx0, hy0 - 120 + Math.sin(t * 1.6) * 5); g.strokeStyle = alpha('#ffc27a', 0.8 * fl); g.lineWidth = 1.8; const hr = t * 0.8; const X = (px) => px * Math.cos(hr);
    g.beginPath(); g.moveTo(X(-34), -6); g.lineTo(X(-26), -64); g.lineTo(X(-6), -26); g.lineTo(X(8), -26); g.lineTo(X(28), -64); g.lineTo(X(34), -6); g.lineTo(X(14), 34); g.lineTo(X(0), 44); g.lineTo(X(-14), 34); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(X(-34), -6); g.lineTo(X(14), 34); g.moveTo(X(34), -6); g.lineTo(X(-14), 34); g.moveTo(X(-6), -26); g.lineTo(X(0), 44); g.moveTo(X(8), -26); g.lineTo(X(0), 44); g.stroke(); circle(g, X(-14), -2, 3, '#ff6a3a'); circle(g, X(14), -2, 3, '#ff6a3a'); g.restore(); }
  // роутер с индикаторами и провода по столу
  rr(g, 1500, DT - 26, 96, 26, 4); g.fillStyle = '#0b0f17'; g.fill(); for (let k = 0; k < 5; k++) circle(g, 1512 + k * 15, DT - 14, 2.6, flick(t, 30 + k, 4 + k) > 0.35 ? (k === 2 ? AM : GR) : '#10202a'); seg(g, [[1596, DT - 20], [1624, DT - 70], [1646, DT - 130]], 3, '#0b0f17');
  g.strokeStyle = '#0b0f17'; g.lineWidth = 4; g.beginPath(); g.moveTo(1300, DT); g.bezierCurveTo(1300, DT + 70, 1100, DT + 60, 1010, DT + 120); g.stroke();
  // кружка с паром и лампа слева на столе
  rr(g, 1212, DT - 44, 42, 46, 6); g.fillStyle = '#d8d2c6'; g.fill(); g.strokeStyle = '#d8d2c6'; g.lineWidth = 6; g.beginPath(); g.arc(1256, DT - 22, 11, -1.4, 1.4); g.stroke(); g.fillStyle = '#2a1a10'; g.fillRect(1215, DT - 42, 36, 7); g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(1212, DT - 20, 42, 22);
  for (let i = 0; i < 5; i++) { const u = (t * 0.45 + i / 5) % 1; glow(g, 1233 + Math.sin(u * 7 + i) * 10, DT - 56 - u * 90, 14 + u * 26, '#cfd8e8', 0.17 * (1 - u)); }
  // настольная лампа: тёплый контрсвет на волосы, плечо и стол
  seg(g, [[665, DT], [690, 560], [742, 430]], 7, '#0a0d14'); circle(g, 690, 560, 7, '#161c28'); rr(g, 716, 416, 66, 26, 10); g.fillStyle = '#10151f'; g.fill(); glow(g, 760, 446, 90, AM, 0.5);
  FX.lightCone(g, 758, 440, { angle: 1.18, spread: 0.55, len: 560, color: AM, a: 0.12 }); FX.pool(g, 840, DT + 6, 220, 22, AM, 0.3);
  // свет мониторов на лицо и корпус героя (экранный объёмный свет)
  const hx = hero.x + 5 * 2.1 + 40, hy = GY - 180 * 2.1;
  FX.lightCone(g, 985, 490, { angle: Math.PI * 0.98, spread: 0.5, len: 420, color: CY, a: 0.1 }); glow(g, hx + 25, hy, 190, CY, 0.2 + 0.04 * Math.sin(t * 3.1)); glow(g, hx + 30, hy + 90, 250, GR, 0.07);
  // объёмный луч от центрального монитора в пыли
  FX.godRays(g, 1480, 436, { count: 5, angle: Math.PI * 0.9, spread: 0.7, len: 700, color: GR, a: 0.055, t });
  FX.dust(g, t, { count: 60, color: '#bfeaff', area: [640, 250, 1100, 600], size: 1.8, a: 0.6, speed: 9 });
}

// ---------- ПЕРЕДНИЙ ПЛАН (размытый): провода и кружка у края ----------
function foreground(g, t) {
  g.strokeStyle = '#04060a'; g.lineWidth = 16; for (const [x0, c] of [[1500, 0], [1640, 40]]) { g.beginPath(); g.moveTo(x0, -40); g.bezierCurveTo(x0 + c, 160, x0 - 120 + c, 300, x0 - 40 + Math.sin(t * 0.8) * 8, 460); g.stroke(); }
  rr(g, -30, 880, 210, 230, 18); g.fillStyle = '#0a0d14'; g.fill(); glow(g, 120, 900, 220, CY, 0.12);
  circle(g, 1840, 1010, 60, '#060810');
}

function scene(g, t, info, cam, hero) {
  backdrop(g, ['#05070c', '#0a0e17']);
  layer(g, cam, 0.78, (g) => backWall(g, t));
  layer(g, cam, 1, (g) => midLayer(g, t, hero));
  fg(g, cam, (g) => foreground(g, t), { blur: 12, depth: 1.55 });
  g.save(); g.fillStyle = radGrad(g, E.W * 0.62, E.H * 0.5, E.H * 0.25, E.H * 1.05, ['rgba(0,0,0,0)', 'rgba(0,0,0,.6)']); g.fillRect(0, 0, E.W, E.H); g.restore();
}
// s001: общий план — медленный наезд; на 2.6 с приходит сообщение, герой наклоняется к экрану
registerShot('s001', { draw(g, t, info) {
  const k = ease.inOut(prog(t, 0, info.dur)), d = drift(t, 5, 3);
  const cam = { z: 1 + 0.08 * k, x: lerp(0, 150, k) + d.x, y: lerp(0, -30, k) + d.y, r: d.r };
  scene(g, t, info, cam, { x: 830, lean: ease.inOut(prog(t, 2.6, 3.6)), look: [0.9, -0.1] });
} });
// s002: тот же бункер, камера вплотную к лицу и экранам (профиль в свете монитора)
registerShot('s002', { draw(g, t, info) {
  const k = ease.out(prog(t, 0, info.dur)), d = drift(t, 4, 7);
  const cam = { z: lerp(1.9, 2.15, k), x: lerp(130, 175, k) + d.x, y: lerp(-35, -48, k) + d.y, r: d.r };
  scene(g, t + 5, info, cam, { x: 830, lean: 1, look: [1, -0.12], expr: t < 1.4 ? 'neutral' : 'thinking', talk: t > 1.8 ? Math.max(0, 0.5 + 0.5 * Math.sin(t * 15) * Math.sin(t * 4.1)) : 0 });
} });
