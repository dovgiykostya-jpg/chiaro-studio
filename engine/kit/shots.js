// engine/kit/shots.js — общие шаблоны кадров Atlas Studio. Проект подключает их одной строкой:
//   scenes/kit.js:  import '/engine/kit/shots.js';
// Каждый кадр в story/shots.json: params.tpl = wide | face | insert | diagram | chapter | title (+ параметры ниже).
// Список допустимых значений (для авто-раскадровки) — engine/kit/schema.json.
import { E, V, registerShot, mood, S, layer, blurLayer, veil, ease, prog, lerp, clamp, text, measure, circle, ring, rr, glow, alpha, shade, seg, poly, linGrad, radGrad, rng } from '/engine/core.js';
import { drawFigure, POSES, posesAt, breathe, bigFace, walkPose } from '/engine/rig2d.js';
import { camPath, spring, fg, kText, impact } from '/engine/motion.js';
import * as FX from '/engine/fx2d.js';
import * as UI from '/engine/ui2d.js';
import { drawSet } from './sets.js';
import { icon } from './icons.js';

// ---------- актёры: взрослый герой («ты»), специалист, прохожий ----------
const OUT = {
  hero: () => ({ top: 'hoodie', color: '#c99a1e', color2: '#f2d27a', face: 'none', head: 'none', legs: '#2c3038', gloves: null, ...(E.cfg.kit?.hero || {}) }),
  pro: () => ({ top: 'labcoat', color: '#e9eef2', color2: '#9fd3e0', face: 'glasses', head: 'none', legs: '#2c3038', gloves: null, ...(E.cfg.kit?.pro || {}) }),
  person: () => ({ top: 'hoodie', color: '#3a4a66', color2: '#6a7a96', face: 'none', head: 'none', legs: '#22252e', gloves: null, ...(E.cfg.kit?.person || {}) }),
};
const CYAN = '#9fe8ff', RED = '#e8573f', GREEN = '#7bd88f', YEL = '#ffd47e';
const GOLD = () => S().ui.gold, CREAM = () => S().ui.cream, ACC = () => S().ui.accent;
const colOf = (c) => (c === 'accent' || c === 'red' ? ACC() : c === 'cream' ? CREAM() : c === 'cyan' ? CYAN : c === 'green' ? GREEN : GOLD());
const fit = (g, str, size, maxW) => Math.min(size, size * maxW / Math.max(1, measure(g, String(str), size)));
const rimOf = (M, dir) => ({ color: M.rim, dir, w: 4.5 });

function actor(g, t, a, M, GY) {
  const x = (a.x + (a.vx || 0) * t) * E.W, y = a.y == null ? GY : a.y * E.H, s = (a.s ?? 1.4) * V(1, 1.25), f = a.f ?? 1;
  if (a.t === 'obj') { icon(g, a.icon || 'box', x, y - 70 * s, 110 * s, { t }); return; }
  if (a.t === 'crowd') { FX.crowd(g, t, { seed: a.seed || 12, x: E.W * (a.x0 ?? 0.05), y: GY - 150, w: E.W * (a.w ?? 0.9), rows: 4, rowH: 34, size: 2.4, color: shade(M.dark, 0.2), cheer: 0.3 }); return; }
  const pose = a.walk ? walkPose(t * Math.PI * 2 * (a.run ? 1.6 : 0.9), { run: !!a.run }) : a.poses ? posesAt(t, a.poses) : breathe(POSES[a.pose] || POSES.stand, t, 1, a.ph || 0);
  const expr = a.exprs ? ([...a.exprs].reverse().find(([et]) => t >= et) || a.exprs[0])[1] : (a.expr || 'neutral');
  drawFigure(g, { x, y, s, facing: f, outfit: (OUT[a.t] || OUT.hero)(), pose, expr, look: a.look, rim: rimOf(M, [-f, -0.3]), blink: (t % 3.2) > 3.1, shadow: true });
  if (a.hold) icon(g, a.hold, x + f * 46 * s, y - 150 * s, 44 * s, { t });
}
function fgOf(g, t, cam, P) {                                    // размытый передний план: край предмета у камеры
  const GY = E.H * V(0.8, 0.7), r = rng(P.seed || 6), ink = shade(S().ink, 0.02);
  if (['kitchen', 'office', 'lab', 'room', 'store'].includes(P.set)) { g.fillStyle = ink; g.fillRect(r() < 0.5 ? -140 + r() * 60 : E.W - 60 - r() * 60, -100, 200, E.H + 200); return; }
  if (P.set === 'factory') { g.fillStyle = ink; g.fillRect(-200, GY - 60 + r() * 40, E.W * 0.35, 70); return; }
  for (let i = 0; i < 2; i++) { const x = r() < 0.5 ? -60 + r() * 200 : E.W - 160 + r() * 200; seg(g, [[x, E.H + 40], [x + (r() - 0.5) * 40, E.H - 300 - r() * 200]], 22, ink); }
}
function atmos(g, t, P, M) {
  const fx = P.fx || [];
  if (!fx.includes('nodust')) FX.dust(g, t, { count: 30, color: ['city', 'street', 'room', 'kitchen'].includes(P.set) ? '#ffe2bd' : '#cfe8ff', a: 0.24 });
  if (fx.includes('lens')) FX.lensStreak(g, E.W * 0.3, E.H * 0.3, E.W, M.key, 0.14);
  if (fx.includes('dark')) veil(g, '#07060f', 0.35);
  if (fx.includes('red')) veil(g, '#a01810', 0.12 + 0.05 * Math.sin(t * 5));
  if (fx.includes('rain')) FX.rain(g, t, { count: 160, a: 0.25 });
}
function texts(g, t, P) {
  const tx = P.text || [];
  if (tx.some((x) => (x.y ?? 0.2) < 0.35)) { g.fillStyle = linGrad(g, 0, 0, 0, E.H * 0.36, ['rgba(6,6,14,0.55)', 'rgba(6,6,14,0)']); g.fillRect(0, 0, E.W, E.H * 0.36); }
  for (const x of tx) { const size = fit(g, x.str, x.size || V(100, 96), E.W * 0.88); kText(g, t, x.str, (x.x ?? 0.5) * E.W, Math.min(0.7, x.y ?? 0.2) * E.H, { start: x.at ?? 0.2, mode: x.mode || 'slam', size, color: colOf(x.c), glow: 28, spacing: 2 }); }
}
function bgBlur(g, t, P) { blurLayer(g, 16, (g) => drawSet(g, t, { z: 1.25, x: P.bx ?? -80, y: -40 }, P.bg || { set: 'void' })); veil(g, '#07060f', P.dim ?? 0.5); }
function camOf(t, P, dur) { const k = E.cfg.kitCam ?? 1, z0 = P.z0 ?? 1.0, z1 = P.z1 ?? 1.1, x0 = (P.x0 ?? 20) * k, x1 = (P.x1 ?? -30) * k; const c = camPath(t, [[0, { z: z0, x: x0, y: 0 }], [dur, { z: z0 + (z1 - z0) * k, x: x1, y: 0 }]]); if (E.cfg.kitPunch) c.z *= 1 + (P.punch ?? E.cfg.kitPunch) * Math.exp(-t * 8); return c; }
const stag = (P, n, i, t0 = 0.3) => t0 + i * Math.min(0.7, Math.max(0.12, ((P.dur || 3) * 0.42 - t0) / Math.max(1, n)));   // всё появляется в первые ~45% кадра: успевают прочитать
const card = (g, x, y, w, h, line, lw = 2, fill = 'rgba(10,18,30,0.9)') => { rr(g, x, y, w, h, 14); g.fillStyle = fill; g.fill(); g.strokeStyle = line; g.lineWidth = lw; g.stroke(); };

// ---------- wide: декорация + герой(и) + надпись ----------
function tplWide(g, t, P) {
  const cam = camOf(t, P, P.dur);
  if (P.hit != null) { const sh = impact(t, P.hit, { amp: 14, decay: 7 }); cam.x += sh.x; cam.y += sh.y; }
  const { GY, M } = drawSet(g, t, cam, P);
  layer(g, cam, 1, (g) => { for (const a of P.actors || []) actor(g, t, a, M, GY); });
  if (P.fg !== false) fg(g, cam, (g) => fgOf(g, t, cam, P), { blur: 11 });
  atmos(g, t, P, M); texts(g, t, P);
}
// ---------- face: крупный план лица на размытой декорации ----------
function tplFace(g, t, P) {
  bgBlur(g, t, P);
  const set = P.bg?.set, M = mood(['city', 'void'].includes(set) ? 'night' : ['kitchen', 'room'].includes(set) ? 'interiorWarm' : set === 'street' ? 'dusk' : 'interiorCool');
  const r = V(330, 360) * (1 + (E.cfg.kitCam ? 0.07 : 0.04) * t) * (E.cfg.kitPunch ? 1 + E.cfg.kitPunch * Math.exp(-t * 8) : 1), sh = impact(t, 0.1, { amp: P.hit ? 6 : 0, decay: 8 }), fx = (P.fx0 ?? 0.3) * E.W;
  bigFace(g, fx + sh.x, E.H * V(0.6, 0.58), r, { outfit: (OUT[P.who] || OUT.hero)(), expr: P.exprs ? ([...P.exprs].reverse().find(([et]) => t >= et) || P.exprs[0])[1] : (P.expr || 'thinking'), blink: (t % 3.1) > 3.0, rimColor: M.rim, rimSide: P.side ?? 1, look: P.look || [0.4, -0.1], tilt: P.tilt ?? -0.05, talk: 0 });
  if (P.sweat) for (let i = 0; i < 2; i++) { const yy = E.H * 0.5 + ((t * 120 + i * 140) % 300); circle(g, fx + r * 0.7, yy, 12, alpha(CYAN, 0.7)); }
  if (P.pale) veil(g, '#9fb8c0', 0.12);
  if (P.icon) { const p = spring(t, 0.4, { freq: 3, damp: 0.5 }); if (p > 0) { glow(g, E.W * (1 - (P.fx0 ?? 0.3)) + 40, E.H * 0.5, 260, YEL, 0.15); icon(g, P.icon, E.W * (1 - (P.fx0 ?? 0.3)) + 40, E.H * 0.5, 220 * p, { t }); } }
  atmos(g, t, { ...P, set }, M); texts(g, t, P);
}

// ---------- insert: крупная вставка-предмет ----------
function phone(g, t, P) {
  const cx = E.W * 0.5, cy = E.H * V(0.5, 0.46), s = V(E.H * 0.88 / 820, 1.6), w = 420 * s, h = 820 * s, x = cx - w / 2, y = cy - h / 2 + (1 - ease.out(prog(t, 0, 0.5))) * 120;
  g.save(); g.translate(cx, cy); g.rotate(-0.04 + Math.sin(t * 0.7) * 0.01); g.translate(-cx, -cy);
  rr(g, x - 16, y - 16, w + 32, h + 32, 60 * s); g.fillStyle = '#0c0d12'; g.fill(); rr(g, x, y, w, h, 46 * s); g.fillStyle = '#121a26'; g.fill();
  rr(g, cx - 60 * s, y + 14, 120 * s, 26 * s, 13 * s); g.fillStyle = '#0c0d12'; g.fill();
  if (P.mode === 'call') {
    const name = P.from || 'НЕИЗВЕСТНЫЙ'; text(g, 'ВХОДЯЩИЙ ВЫЗОВ', cx, y + 150 * s, { size: 30 * s, color: alpha(CREAM(), 0.6), font: 'Nunito' });
    text(g, name, cx, y + 230 * s, { size: fit(g, name, 58 * s, w - 60), color: CREAM() }); circle(g, cx, y + 400 * s, 80 * s, '#2a3448'); icon(g, 'person', cx, y + 400 * s, 110 * s);
    const p = 0.5 + 0.5 * Math.sin(t * 6); for (const [dx, c] of [[-110, RED], [110, GREEN]]) { ring(g, cx + dx * s, y + h - 150 * s, (50 + p * 18) * s, 4, alpha(c, 0.5 * (1 - p))); circle(g, cx + dx * s, y + h - 150 * s, 50 * s, c); }
    icon(g, 'phone', cx + 110 * s, y + h - 150 * s, 50 * s, { color: '#0c0d12', accent: '#0c0d12' });
  } else {
    text(g, P.from || 'СООБЩЕНИЯ', cx, y + 90 * s, { size: fit(g, P.from || 'СООБЩЕНИЯ', 34 * s, w - 60), color: CREAM(), font: 'Nunito' }); seg(g, [[x + 20, y + 120 * s], [x + w - 20, y + 120 * s]], 2, alpha(CREAM(), 0.15));
    let yy = y + 160 * s; (P.msgs || ['...']).slice(0, 4).forEach((m, i) => {
      if (yy > y + h - 120 * s) return;
      const at = stag(P, (P.msgs || []).length, i, 0.4), a = ease.out(prog(t, at, at + 0.3)); if (a <= 0) return; const mine = i % 2 === 1, fs = 40 * s;
      const words = String(m).split(' '), lines = []; let cur = ''; for (const wd of words) { const nx = cur ? cur + ' ' + wd : wd; if (measure(g, nx, fs, 'Nunito', 800) > w * 0.62 && cur) { lines.push(cur); cur = wd; } else cur = nx; } lines.push(cur);
      const bw = Math.min(w * 0.78, Math.max(...lines.map((l) => measure(g, l, fs, 'Nunito', 800))) + 44), bh = lines.length * fs * 1.25 + 30, bx = mine ? x + w - bw - 22 : x + 22;
      g.save(); g.globalAlpha *= a; g.translate(0, (1 - a) * 30); rr(g, bx, yy, bw, bh, 22); g.fillStyle = mine ? '#2f6f5a' : '#2a3448'; g.fill();
      lines.forEach((l, k) => text(g, l, bx + 22, yy + 15 + fs * 0.62 + k * fs * 1.25, { size: fs, color: '#f4f6fa', font: 'Nunito', align: 'left', weight: 800 })); g.restore(); yy += bh + 18 * s; });
  }
  g.restore(); glow(g, cx, cy, 600, '#7fb0ff', 0.08);
}
function gauge(g, t, P) {
  const cx = E.W * 0.5, cy = E.H * V(0.55, 0.5), R = V(300, 330), max = P.max || 10, v = (P.val ?? max * 0.7) * ease.out(prog(t, 0.3, P.ramp ?? 1.8)), k = clamp(v / max), a0 = Math.PI * 0.8, a1 = Math.PI * 2.2;
  g.lineCap = 'round'; g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 40; g.beginPath(); g.arc(cx, cy, R, a0, a1); g.stroke();
  const gr = g.createLinearGradient(cx - R, 0, cx + R, 0); gr.addColorStop(0, GREEN); gr.addColorStop(0.5, YEL); gr.addColorStop(1, RED); g.strokeStyle = gr; g.beginPath(); g.arc(cx, cy, R, a0, a0 + (a1 - a0) * k); g.stroke();
  for (let i = 0; i <= 10; i++) { const an = a0 + (a1 - a0) * i / 10; seg(g, [[cx + Math.cos(an) * (R - 50), cy + Math.sin(an) * (R - 50)], [cx + Math.cos(an) * (R - 70), cy + Math.sin(an) * (R - 70)]], 4, alpha(CREAM(), 0.5)); }
  const an = a0 + (a1 - a0) * k; seg(g, [[cx, cy], [cx + Math.cos(an) * (R - 60), cy + Math.sin(an) * (R - 60)]], 10, CREAM()); circle(g, cx, cy, 22, CREAM());
  const str = P.str || (v < 10 ? v.toFixed(1).replace('.', ',') : String(Math.round(v))); text(g, str, cx, cy + R * 0.55, { size: 130, color: k > 0.66 ? RED : GOLD(), glow: 24, glowColor: alpha(RED, 0.4) });
  if (P.unit) text(g, P.unit, cx, cy + R * 0.55 + 90, { size: 48, color: CREAM(), weight: 600 });
}
function money(g, t, P) {
  const cx = E.W * 0.5, cy = E.H * V(0.46, 0.42), r = rng(4);
  for (let i = 0; i < 16; i++) { const x = r() * E.W, sp = 220 + r() * 200, y = ((t * sp + r() * E.H) % (E.H + 200)) - 100; icon(g, i % 3 ? 'coin' : 'money', x, y, 70 + r() * 40, { t }); }
  veil(g, '#07060f', 0.35);
  const p = spring(t, 0.2, { freq: 3, damp: 0.5 }); g.save(); g.translate(cx, cy); g.rotate(-0.05); g.scale(Math.max(0, p), Math.max(0, p));
  const big = P.big || '100 ₽', fs = fit(g, big, V(170, 150), V(820, 760)), w = measure(g, big, fs) + 200, h = fs + 160;
  poly(g, [[-w / 2 - 70, 0], [-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], '#ffd400'); circle(g, -w / 2 - 20, 0, 18, '#1a1622');
  text(g, big, 30, 8, { size: fs, color: '#1a1622' }); g.restore();
  if (P.old) { const a = ease.out(prog(t, 0.9, 1.3)); text(g, P.old, cx, cy - V(230, 260), { size: 80, color: alpha(CREAM(), 0.7 * a) }); seg(g, [[cx - measure(g, P.old, 80) / 2 - 10, cy - V(230, 260)], [cx + measure(g, P.old, 80) / 2 + 10, cy - V(230, 260)]], 8, alpha(RED, a)); }
  if (P.small) text(g, P.small, cx, cy + V(230, 250), { size: fit(g, P.small, 60, E.W * 0.86), color: CREAM(), weight: 600, spacing: 2, alpha: ease.out(prog(t, 0.6, 1.0)) });
}
function bigIcons(g, t, P) {
  const ics = (P.icons || ['question']).slice(0, 3), n = ics.length, sz = V(n > 1 ? 300 : 380, n > 1 ? 260 : 380);
  ics.forEach((nm, i) => { const x = E.W * (n === 1 ? 0.5 : V(0.5 + (i - (n - 1) / 2) * 0.3, 0.5)), y = E.H * (n === 1 || !E.vertical ? V(0.44, 0.42) : 0.26 + i * 0.2), p = spring(t, 0.2 + i * 0.4, { freq: 3, damp: 0.5 }); if (p <= 0) return;
    glow(g, x, y, sz * 1.1, YEL, 0.12); g.save(); g.translate(x, y); g.scale(p, p); g.rotate(Math.sin(t * 0.8 + i) * 0.04); icon(g, nm, 0, 0, sz, { t }); g.restore();
    if (P.labels?.[i]) text(g, P.labels[i], x, y + sz * 0.68, { size: fit(g, P.labels[i], 54, E.W * (n > 1 && !E.vertical ? 0.28 : 0.8)), color: CREAM(), weight: 600, spacing: 2, alpha: Math.min(1, p) }); });
}
function tplInsert(g, t, P) {
  const k = P.kind;
  if (k === 'phone') { bgBlur(g, t, { ...P, dim: 0.55 }); phone(g, t, P); }
  else if (k === 'gauge') { bgBlur(g, t, { ...P, dim: 0.62 }); gauge(g, t, P); }
  else if (k === 'money') { bgBlur(g, t, { ...P, dim: 0.5 }); money(g, t, P); }
  else if (k === 'zoom') { bgBlur(g, t, { ...P, dim: 0.72 }); zoomLens(g, t, P); }
  else if (k === 'q') { bgBlur(g, t, P); kText(g, t, '?', E.W / 2, E.H * 0.45, { start: 0.2, mode: 'slam', size: V(560, 520), color: GOLD(), glow: 50 }); }
  else if (k === 'sign') { bgBlur(g, t, P); const s = 1 + 0.05 * t; glow(g, E.W / 2, E.H * 0.4, 420, YEL, 0.18); icon(g, P.icon || 'warning', E.W / 2, E.H * 0.4, 380 * s, { t }); }
  else { bgBlur(g, t, { ...P, dim: 0.6 }); bigIcons(g, t, P); }
  texts(g, t, P); atmos(g, t, { ...P, set: P.bg?.set }, mood('night'));
}

// ---------- diagram: инфографика на тёмно-синем фоне ----------
function stat(g, t, P) { const p = ease.out(prog(t, 0.1, 0.5)), sz = fit(g, P.big || '', P.size || V(240, 220), E.W * 0.86), y = E.H * 0.44; g.save(); g.globalAlpha *= p; g.translate(E.W / 2, y); g.scale(1 + (1 - p) * 0.4, 1 + (1 - p) * 0.4); text(g, P.big || '', 0, 0, { size: sz, color: P.col === 'red' ? RED : GOLD(), glow: 30, glowColor: alpha(P.col === 'red' ? RED : GOLD(), 0.5) }); g.restore();
  if (P.small) text(g, P.small, E.W / 2, y + sz * 0.7, { size: fit(g, P.small, 58, E.W * 0.88), color: CREAM(), weight: 500, spacing: 3, alpha: ease.out(prog(t, 0.5, 0.9)) }); }
function scale(g, t, P) {
  const x0 = E.W * 0.1, x1 = E.W * 0.9, y = E.H * 0.52, max = P.max || 10, X = (v) => lerp(x0, x1, clamp(v / max));
  text(g, P.label || '', E.W / 2, E.H * 0.2, { size: fit(g, P.label || '', 56, E.W * 0.86), color: CREAM(), spacing: 4, weight: 600 });
  rr(g, x0, y - 22, x1 - x0, 44, 22); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fill();
  const to = (P.to ?? max) * ease.inOut(prog(t, 0.2, P.ramp ?? 1.6)); g.save(); rr(g, x0, y - 22, Math.max(44, X(to) - x0), 44, 22); g.clip(); g.fillStyle = linGrad(g, x0, 0, x1, 0, [GREEN, YEL, '#ff8a3a', RED]); g.fillRect(x0, y - 22, x1 - x0, 44); g.restore();
  const step = max <= 12 ? 1 : Math.pow(10, Math.floor(Math.log10(max))) / (max / Math.pow(10, Math.floor(Math.log10(max))) > 4 ? 1 : 2);
  for (let v = 0; v <= max + 1e-6; v += step) { seg(g, [[X(v), y + 34], [X(v), y + 54]], 3, alpha(CREAM(), 0.5)); text(g, String(+v.toFixed(2)).replace('.', ','), X(v), y + 84, { size: 32, color: alpha(CREAM(), 0.7), weight: 500 }); }
  (P.marks || []).forEach(([v, lab], i) => { const at = stag(P, (P.marks || []).length, i, 0.7), a = ease.out(prog(t, at, at + 0.4)); if (a <= 0) return; const up = i % 2 === 0; seg(g, [[X(v), y - 30], [X(v), up ? y - 150 : y - 100]], 4, alpha(GOLD(), a)); circle(g, X(v), y, 14, alpha(GOLD(), a)); text(g, lab, clamp(X(v), E.W * 0.2, E.W * 0.8), up ? y - 185 : y - 125, { size: fit(g, lab, 46, E.W * 0.55), color: alpha(i === P.hi ? ACC() : CREAM(), a), weight: 600 }); });
}
function graph(g, t, P) {
  const w = E.W * V(0.78, 0.84), h = E.H * V(0.5, 0.36), x = E.W / 2, y = E.H * 0.46, X = x - w / 2, Y = y + h / 2, p = prog(t, 0.2, Math.min(2.4, (P.dur || 3) - 0.4)), col = P.red ? RED : '#e8892b';
  g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 2; g.beginPath(); g.moveTo(X, y - h / 2); g.lineTo(X, Y); g.lineTo(X + w, Y); g.stroke();
  for (let i = 1; i < 4; i++) { g.strokeStyle = 'rgba(255,255,255,0.05)'; g.beginPath(); g.moveTo(X, Y - h * i / 4); g.lineTo(X + w, Y - h * i / 4); g.stroke(); }
  (P.ticks || []).forEach(([tx, lb]) => text(g, lb, X + tx * w, Y + 40, { size: 36, color: '#9aa6b8', weight: 500 }));
  const pts = P.pts || [[0, 0.2], [1, 0.8]], seg2 = []; for (let i = 0; i < pts.length - 1; i++) seg2.push(i); const tot = pts.length - 1, upto = p * tot;
  g.strokeStyle = col; g.lineWidth = 8; g.lineJoin = 'round'; g.beginPath(); let last = pts[0]; g.moveTo(X + pts[0][0] * w, Y - pts[0][1] * h);
  for (let i = 0; i < tot && i < upto; i++) { const k = Math.min(1, upto - i), a = pts[i], b = pts[i + 1]; last = [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; g.lineTo(X + last[0] * w, Y - last[1] * h); } g.stroke();
  g.lineTo(X + last[0] * w, Y); g.lineTo(X + pts[0][0] * w, Y); g.closePath(); g.fillStyle = alpha(col, 0.12); g.fill();
  circle(g, X + last[0] * w, Y - last[1] * h, 13, col); glow(g, X + last[0] * w, Y - last[1] * h, 60, col, 0.4);
  text(g, P.label || '', x, y - h / 2 - 50, { size: fit(g, P.label || '', 54, E.W * 0.86), color: CREAM(), weight: 600 });
}
function cardD(g, t, P) {
  const lines = P.lines || [], w = E.W * V(0.66, 0.86), h = 180 + lines.length * 92, x = E.W / 2, y = E.H * 0.46, p = ease.out(prog(t, 0, 0.35));
  g.save(); g.translate(0, (1 - p) * 40); g.globalAlpha *= p; card(g, x - w / 2, y - h / 2, w, h, alpha(P.accent || GREEN, 0.9), 3);
  if (P.title) text(g, P.title, x, y - h / 2 + 70, { size: fit(g, P.title, 80, w - 80), color: P.accent || GREEN, spacing: 2 });
  lines.forEach((ln, i) => { const at = stag(P, lines.length, i, 0.4), lp = ease.out(prog(t, at, at + 0.3)); g.save(); g.globalAlpha *= lp; g.translate((1 - lp) * -30, 0); circle(g, x - w / 2 + 70, y - h / 2 + 175 + i * 92, 12, GOLD()); text(g, ln, x - w / 2 + 104, y - h / 2 + 175 + i * 92, { size: fit(g, ln, 66, w - 160), color: CREAM(), weight: 500, align: 'left' }); g.restore(); });
  g.restore();
}
function people(g, t, P) {
  const n = Math.min(P.n || 10, 40), hi = P.hi ?? P.dead ?? 0, cols = Math.min(n, P.cols || (E.vertical ? 5 : 10)), rows = Math.ceil(n / cols), sz = Math.min(130, E.W * 0.8 / cols), x0 = E.W / 2 - (cols - 1) * sz / 2, y0 = E.H * 0.5 - (rows - 1) * sz * 0.75;
  for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols), x = x0 + c * sz, y = y0 + r * sz * 1.5, a = ease.out(prog(t, 0.1 + i * 0.02, 0.4 + i * 0.02)), on = i < hi && t > (P.at ?? 1.2) + i * 0.04;
    const col = on ? (P.good ? GREEN : RED) : CREAM(); g.save(); g.globalAlpha *= a; circle(g, x, y - sz * 0.35, sz * 0.2, col); rr(g, x - sz * 0.25, y - sz * 0.1, sz * 0.5, sz * 0.55, sz * 0.2); g.fillStyle = col; g.fill(); g.restore(); }
  if (P.label) text(g, P.label, E.W / 2, E.H * 0.18, { size: fit(g, P.label, 54, E.W * 0.88), color: CREAM(), weight: 600, spacing: 2 });
}
function rule(g, t, P) { const p = ease.out(prog(t, 0, 0.4)), x = E.W / 2, y = E.H * 0.46, w = E.W * V(0.9, 0.9), h = V(340, 420); g.save(); g.translate((1 - p) * -60, 0); g.globalAlpha *= p; card(g, x - w / 2, y - h / 2, w, h, GOLD(), 3);
  text(g, String(P.n || '1'), x - w / 2 + V(150, 110), y, { size: V(260, 220), color: GOLD(), glow: 20 }); const tx = x - w / 2 + V(330, 230), tw = w - V(380, 260);
  text(g, P.head || '', tx, y - V(66, 80), { size: fit(g, P.head || '', V(96, 84), tw), color: CREAM(), spacing: 3, align: 'left' }); text(g, P.sub || '', tx, y + V(56, 70), { size: fit(g, P.sub || '', 52, tw), color: alpha(CREAM(), 0.85), weight: 500, align: 'left' }); g.restore(); }
function compare(g, t, P) {
  const L2 = (P.items || [['А', 'ПЕРВОЕ', 'red'], ['Б', 'ВТОРОЕ', 'green']]).slice(0, 2), vert = E.vertical;
  L2.forEach(([big, small, c], i) => { const x = vert ? E.W / 2 : E.W * (0.28 + i * 0.44), y = vert ? E.H * (0.36 + i * 0.26) : E.H * 0.44, at = 0.2 + i * Math.min(0.9, (P.dur || 3) * 0.3), col = c === 'red' ? RED : c === 'green' ? GREEN : c === 'cyan' ? CYAN : GOLD();
    kText(g, t, big, x, y, { start: at, mode: 'slam', size: fit(g, big, V(150, 140), E.W * (vert ? 0.8 : 0.38)), color: col, glow: 30 }); text(g, small, x, y + V(110, 100), { size: fit(g, small, 48, E.W * (vert ? 0.8 : 0.4)), color: CREAM(), alpha: ease.out(prog(t, at + 0.2, at + 0.6)), weight: 600, spacing: 3 }); });
  if (!vert && L2.length === 2) text(g, P.arrow ? '→' : 'VS', E.W / 2, E.H * 0.44, { size: 90, color: alpha(CREAM(), 0.5 * ease.out(prog(t, 0.6, 1))) });
  if (P.head) text(g, P.head, E.W / 2, E.H * 0.18, { size: fit(g, P.head, 50, E.W * 0.88), color: alpha(CREAM(), 0.85), weight: 600, spacing: 4 });
}
function steps(g, t, P) {
  const its = (P.items || ['ШАГ 1', 'ШАГ 2', 'ШАГ 3']).slice(0, 5), n = its.length, vert = E.vertical;
  const w = vert ? E.W * 0.8 : Math.min(460, (E.W * 0.88 - (n - 1) * 70) / n), h = vert ? Math.min(220, E.H * 0.6 / n) : 320, gap = vert ? 40 : 70;
  const tot = vert ? n * h + (n - 1) * gap : n * w + (n - 1) * gap, sx = vert ? E.W / 2 - w / 2 : E.W / 2 - tot / 2, sy = vert ? E.H * 0.5 - tot / 2 : E.H * 0.5 - h / 2;
  if (P.head) text(g, P.head, E.W / 2, vert ? sy - 90 : E.H * 0.2, { size: fit(g, P.head, 64, E.W * 0.86), color: CREAM(), weight: 600, spacing: 3 });
  its.forEach((s, i) => { const at = stag(P, n, i, 0.3), a = ease.out(prog(t, at, at + 0.35)); if (a <= 0) return; const x = vert ? sx : sx + i * (w + gap), y = vert ? sy + i * (h + gap) : sy, act = i === Math.min(n - 1, Math.floor((t - 0.3) / Math.max(0.3, ((P.dur || 3) - 0.6) / n)));
    g.save(); g.globalAlpha *= a; g.translate(0, (1 - a) * 30); card(g, x, y, w, h, act ? GOLD() : alpha('#8fb8e8', 0.5), act ? 5 : 2);
    text(g, String(i + 1), vert ? x + 70 : x + w / 2, vert ? y + h / 2 : y + 80, { size: vert ? 100 : 110, color: GOLD(), glow: act ? 20 : 0 });
    const tx = vert ? x + 150 : x + w / 2, tw = vert ? w - 180 : w - 40, words = String(s).split(' '), wrap = !vert && words.length > 1 && measure(g, s, 56) > tw, half = Math.ceil(words.length / 2), l1 = wrap ? words.slice(0, half).join(' ') : s, l2 = wrap ? words.slice(half).join(' ') : '';
    text(g, l1, tx, vert ? y + h / 2 : y + (l2 ? 175 : 205), { size: fit(g, l1, 56, tw), color: CREAM(), weight: 700, align: vert ? 'left' : 'center' }); if (l2) text(g, l2, tx, y + 240, { size: fit(g, l2, 56, tw), color: CREAM(), weight: 700 });
    g.restore();
    if (i < n - 1 && a > 0.8) { if (vert) poly(g, [[E.W / 2 - 20, y + h + 8], [E.W / 2 + 20, y + h + 8], [E.W / 2, y + h + gap - 8]], alpha(GOLD(), 0.8)); else poly(g, [[x + w + 16, y + h / 2 - 22], [x + w + 16, y + h / 2 + 22], [x + w + gap - 14, y + h / 2]], alpha(GOLD(), 0.8)); } });
}
function ingredients(g, t, P) {
  const its = (P.items || []).slice(0, 6), n = Math.max(1, its.length), rowH = Math.min(V(150, 180), E.H * 0.64 / n), x0 = E.W * V(0.12, 0.08), bw = E.W * V(0.42, 0.5), y0 = E.H * 0.52 - (n - 1) * rowH / 2;
  if (P.head) text(g, P.head, E.W / 2, y0 - rowH * 0.5 - V(70, 110), { size: fit(g, P.head, 64, E.W * 0.86), color: CREAM(), weight: 600, spacing: 3 });
  its.forEach((it, i) => { const at = stag(P, n, i, 0.3), a = ease.out(prog(t, at, at + 0.35)); if (a <= 0) return; const y = y0 + i * rowH, sh = clamp((+it.share || 0) / 100), hi = i === (P.hi ?? -1);
    g.save(); g.globalAlpha *= a; g.translate((1 - a) * -40, 0); circle(g, x0 + 50, y, rowH * 0.42, 'rgba(10,18,30,0.9)'); ring(g, x0 + 50, y, rowH * 0.42, 3, hi ? ACC() : alpha('#8fb8e8', 0.5)); icon(g, it.icon || 'box', x0 + 50, y, rowH * 0.62, { t });
    const nx = x0 + 50 + rowH * 0.6; text(g, it.name || '', nx, y, { size: fit(g, it.name || '', V(60, 54), E.W * V(0.3, 0.36)), color: hi ? ACC() : CREAM(), weight: 700, align: 'left' });
    if (it.share != null) { const bx = E.W * V(0.5, 0.6), bww = E.W * V(0.3, 0.26), k = ease.out(prog(t, at + 0.2, at + 1.0)); rr(g, bx, y - 18, bww, 36, 18); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fill(); rr(g, bx, y - 18, Math.max(36, bww * sh * k), 36, 18); g.fillStyle = hi ? ACC() : GOLD(); g.fill(); text(g, `${Math.round((+it.share) * k)}%`, bx + bww + V(70, 60), y, { size: V(48, 44), color: CREAM() }); }
    g.restore(); });
  void bw;
}
function timeline(g, t, P) {
  const its = (P.items || [['1', '']]).slice(0, 6), n = its.length, vert = E.vertical, x0 = E.W * 0.1, x1 = E.W * 0.9, y = E.H * 0.5, top = E.H * 0.24, bot = E.H * 0.76;
  const pos = (i) => (n === 1 ? 0.5 : i / (n - 1)), p = ease.inOut(prog(t, 0.2, Math.min(2.2, (P.dur || 3) - 0.5)));
  if (P.head) text(g, P.head, E.W / 2, vert ? E.H * 0.14 : E.H * 0.2, { size: fit(g, P.head, 60, E.W * 0.86), color: CREAM(), weight: 600, spacing: 3 });
  if (vert) { seg(g, [[E.W * 0.22, top], [E.W * 0.22, bot]], 6, 'rgba(255,255,255,0.12)'); seg(g, [[E.W * 0.22, top], [E.W * 0.22, lerp(top, bot, p)]], 6, GOLD()); }
  else { seg(g, [[x0, y], [x1, y]], 6, 'rgba(255,255,255,0.12)'); seg(g, [[x0, y], [lerp(x0, x1, p), y]], 6, GOLD()); }
  its.forEach(([lab, sub], i) => { const u = pos(i), a = ease.out(prog(p, u - 0.05, u + 0.05)); if (a <= 0) return; const hi = i === P.at, px = vert ? E.W * 0.22 : lerp(x0, x1, u), py = vert ? lerp(top, bot, u) : y, up = i % 2 === 0;
    circle(g, px, py, hi ? 22 : 16, hi ? ACC() : GOLD()); if (hi) ring(g, px, py, 34 + 6 * Math.sin(t * 5), 3, alpha(ACC(), 0.6));
    const lx = vert ? E.W * 0.3 : px, ly = vert ? py - 26 : up ? py - 110 : py + 90, al = vert ? 'left' : 'center', mw = vert ? E.W * 0.64 : (x1 - x0) / Math.max(2, n - 0.5);
    text(g, lab, lx, ly, { size: fit(g, lab, 56, mw), color: hi ? ACC() : CREAM(), alpha: a, align: al }); if (sub) text(g, sub, lx, ly + 52, { size: fit(g, sub, 34, mw), color: alpha(CREAM(), 0.7), alpha: a, weight: 500, align: al }); });
}
function bars(g, t, P) {
  const rows = (P.rows || []).slice(0, 5), n = Math.max(1, rows.length), w = E.W * V(0.62, 0.7), x = E.W / 2 - w / 2, rh = Math.min(140, E.H * 0.56 / n), y0 = E.H * 0.52 - (n - 1) * rh / 2, mx = Math.max(...rows.map((r) => +r.v || 0), 1e-9);
  if (P.head) text(g, P.head, E.W / 2, y0 - rh * 0.5 - 80, { size: fit(g, P.head, 60, E.W * 0.86), color: CREAM(), weight: 600, spacing: 3 });
  rows.forEach((r, i) => { const yy = y0 + i * rh, at = stag(P, n, i, 0.3), p = ease.out(prog(t, at, at + 0.9)), k = (+r.v || 0) / mx;
    text(g, r.label || '', x, yy - 40, { size: fit(g, r.label || '', 42, w), color: CREAM(), align: 'left', weight: 500 }); rr(g, x, yy - 14, w, 40, 8); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fill();
    rr(g, x, yy - 14, Math.max(10, w * 0.85 * k * p), 40, 8); g.fillStyle = i === (P.hi ?? -1) ? ACC() : GOLD(); g.fill(); text(g, r.val ?? String(r.v), x + Math.max(10, w * 0.85 * k * p) + 16, yy + 6, { size: 46, color: CREAM(), align: 'left' }); });
}
function tplDiagram(g, t, P) {
  UI.blueprint(g, {}); glow(g, E.W * 0.5, E.H * 0.45, E.W * 0.6, '#5a7fb8', 0.22);
  const F = { stat, scale, graph, card: cardD, people, rule, compare, steps, ingredients, timeline, bars, flow, outline }[P.kind] || stat; F(g, t, P); texts(g, t, P);
}
// ---------- chapter: карточка главы ----------
function tplChapter(g, t, P) {
  blurLayer(g, 12, (g) => drawSet(g, t, { z: 1.2, x: 0 }, P.bg || { set: 'city' })); veil(g, '#06050c', 0.62);
  const sh = impact(t, 0.05, { amp: 8, decay: 8 }), head = P.head || '';
  if (P.n) text(g, String(P.n), E.W / 2, E.H * 0.24, { size: V(80, 90), color: alpha(CREAM(), 0.5 * ease.out(prog(t, 0, 0.4))), spacing: 8 });
  kText(g, t, head, E.W * 0.5 + sh.x, E.H * 0.42, { start: 0.1, mode: head.length > 11 ? 'rise' : 'slam', size: fit(g, head, V(200, 170), E.W * 0.9), color: P.c === 'cyan' ? CYAN : ACC(), glow: 40 });
  if (P.sub) kText(g, t, P.sub, E.W * 0.5, E.H * 0.6, { start: 0.5, mode: 'rise', size: fit(g, P.sub, V(76, 70), E.W * 0.86), color: CREAM(), glow: 20 });
  FX.dust(g, t, { count: 30, color: '#c8d4ff', a: 0.25 });
}
// ---------- title: заставка / финал ----------
function tplTitle(g, t, P) {
  const cam = camPath(t, [[0, { z: 1.08, x: 20 }], [P.dur, { z: 1.0, x: -20 }]]), { GY, M } = drawSet(g, t, cam, P);
  layer(g, cam, 1, (g) => { for (const a of P.actors || []) actor(g, t, a, M, GY); });
  atmos(g, t, P, M); veil(g, '#0a0812', 0.3);
  UI.titleCard(g, t, { lines: P.lines || ['ПРОДОЛЖЕНИЕ', 'СЛЕДУЕТ'], sub: P.sub, dur: P.dur, y: E.H * 0.42 });
}

// ================= v2: кадры как в образце — шлейф, предмет у лица, цепочка, контур, лупа =================
const RIB = { gold: ['#ffd47e', '#ffb04a', '#fff1c4'], green: ['#9dff7a', '#5fe0a0', '#e6ffb0'], pink: ['#ff8fd8', '#c78bff', '#ffd1f2'], cyan: ['#8fe8ff', '#6aa8ff', '#e0fbff'], red: ['#ff7a5a', '#ff4a6a', '#ffd0c0'] };
// светящийся шлейф (запах, вкус, энергия, «тянет»): 3 переплетённые ленты с искрами, проявляются от A к B
export function ribbon(g, t, x0, y0, x1, y1, o = {}) {
  const cols = RIB[o.c] || RIB.gold, rev = clamp(ease.out(prog(t, o.at ?? 0.15, (o.at ?? 0.15) + (o.grow ?? 0.9)))), N = 70, r = rng(o.seed || 3);
  if (rev <= 0) return;
  const cx = (x0 + x1) / 2 + (o.bend ?? 0) * E.W * 0.1, cy = Math.min(y0, y1) - (o.lift ?? 0.22) * E.H, amp = o.amp ?? 34, nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1;
  const P = (u) => { const a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; return [a * x0 + b * cx + c * x1, a * y0 + b * cy + c * y1]; };
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
  for (let s = 0; s < 3; s++) {
    const col = cols[s], ph = s * 2.1 + r() * 3, fr = 2.2 + s * 0.7;
    g.beginPath();
    for (let i = 0; i <= N; i++) { const u = (i / N) * rev, [px, py] = P(u), env = Math.sin(Math.PI * Math.min(1, u * 1.15)) + 0.15, w = Math.sin(u * fr * Math.PI * 2 - t * (3 + s) + ph) * amp * env;
      const X = px + (nx / nl) * w, Y = py + (ny / nl) * w; if (!i) g.moveTo(X, Y); else g.lineTo(X, Y); }
    g.shadowColor = col; g.shadowBlur = 26; g.strokeStyle = alpha(col, 0.55); g.lineWidth = 9 - s * 2; g.stroke();
    g.shadowBlur = 0; g.strokeStyle = alpha('#ffffff', 0.55); g.lineWidth = 2; g.stroke();
  }
  for (let i = 0; i < 26; i++) { const u = ((r() + t * (0.12 + r() * 0.2)) % 1) * rev, [px, py] = P(u), j = (r() - 0.5) * amp * 2.2; FX.sparkle(g, px + (nx / nl) * j, py + (ny / nl) * j, 8 + r() * 10, cols[2], 0.4 + 0.5 * Math.abs(Math.sin(t * 4 + i))); }
  const [hx, hy] = P(rev); glow(g, hx, hy, 70, cols[0], 0.5);
  g.restore();
}
const punch = (t, P) => 1 + (P.punch ?? 0.06) * Math.exp(-t * 8);      // резкий «удар» камеры на склейке, затем плавный дрейф

// ---------- prop: крупное лицо + большой предмет, от предмета к лицу тянется шлейф ----------
function tplProp(g, t, P) {
  bgBlur(g, t, { ...P, dim: P.dim ?? 0.42 });
  const set = P.bg?.set, M = mood(['city', 'void'].includes(set) ? 'night' : ['kitchen', 'room'].includes(set) ? 'interiorWarm' : 'interiorCool');
  const side = P.side ?? 1, fx = E.W * (side > 0 ? V(0.66, 0.5) : V(0.34, 0.5)), fy = E.H * V(0.6, 0.38), r = V(310, 330) * (1 + 0.05 * t);
  const px = E.W * (side > 0 ? V(0.22, 0.32) : V(0.78, 0.68)), py = E.H * V(0.62, 0.78), ps = V(330, 300) * Math.max(0, spring(t, 0.05, { freq: 2.6, damp: 0.55 }));
  const ex = P.exprs ? ([...P.exprs].reverse().find(([et]) => t >= et) || P.exprs[0])[1] : (P.expr || 'surprised');
  bigFace(g, fx, fy, r, { outfit: (OUT[P.who] || OUT.hero)(), expr: ex, blink: (t % 3.1) > 3.0, rimColor: M.rim, rimSide: -side, look: [-side * 0.6, 0.15], tilt: -side * 0.04, talk: 0 });
  glow(g, px, py - ps * 0.1, ps * 1.3, (RIB[P.c] || RIB.gold)[0], 0.16);
  if (ps > 0) { g.save(); g.translate(px, py); g.rotate(Math.sin(t * 0.9) * 0.04 - side * 0.06); icon(g, P.icon || 'cup', 0, 0, ps, { t }); g.restore(); }
  ribbon(g, t, px, py - ps * 0.45, fx - side * r * 0.15, fy + r * 0.05, { c: P.c || 'gold', seed: P.seed, bend: side * -0.6, lift: 0.18, at: 0.25 });
  atmos(g, t, { ...P, set }, M); texts(g, t, P);
}

// ---------- diagram flow: цепочка «что → во что → итог» с бегущими частицами ----------
function flow(g, t, P) {
  const its = (P.items || []).slice(0, 4), n = Math.max(2, its.length), vert = E.vertical, R = V(n > 3 ? 132 : 158, 140), cols = [GOLD(), RED, CYAN, GREEN];
  const pos = (i) => vert ? [E.W / 2, E.H * (0.24 + i * (0.58 / (n - 1)))] : [E.W * (0.5 + (i - (n - 1) / 2) * V(n > 3 ? 0.23 : 0.29, 0.3)), E.H * 0.5];
  if (P.head) text(g, P.head, E.W / 2, vert ? E.H * 0.11 : E.H * 0.17, { size: fit(g, P.head, 60, E.W * 0.86), color: CREAM(), weight: 600, spacing: 4 });
  const per = Math.min(0.6, Math.max(0.22, ((P.dur || 3) * 0.36) / n));
  its.forEach((it, i) => {
    const [x, y] = pos(i), at = 0.15 + i * per, p = spring(t, at, { freq: 3, damp: 0.55 }), col = it.c ? colOf(it.c) : cols[i % cols.length];
    if (i < its.length - 1) { const [x2, y2] = pos(i + 1), a = ease.out(prog(t, at + 0.15, at + per)); if (a > 0) {
      const sx = vert ? x : x + R + 14, sy = vert ? y + R + 14 : y, ex = vert ? x : x2 - R - 14, ey = vert ? y2 - R - 14 : y, L = Math.hypot(ex - sx, ey - sy);
      g.save(); g.setLineDash([4, 16]); seg(g, [[sx, sy], [lerp(sx, ex, a), lerp(sy, ey, a)]], 4, alpha(CREAM(), 0.35)); g.restore();
      const r2 = rng(30 + i); for (let k = 0; k < 18; k++) { const u = (r2() + (t - at) * (0.5 + r2() * 0.5)) % 1; if (u > a || t < at + 0.15) continue; const j = (r2() - 0.5) * 22, xx = lerp(sx, ex, u) + (vert ? j : 0), yy = lerp(sy, ey, u) + (vert ? 0 : j);
        circle(g, xx, yy, 4 + r2() * 5, alpha(k % 3 ? '#ffffff' : col, 0.9)); glow(g, xx, yy, 16, col, 0.25); }
      void L; } }
    if (p <= 0) return;
    g.save(); g.translate(x, y); g.scale(Math.min(1.15, p), Math.min(1.15, p));
    circle(g, 0, 0, R, 'rgba(8,14,26,0.92)'); ring(g, 0, 0, R, 6, col); glow(g, 0, 0, R * 1.5, col, 0.12 + 0.06 * Math.sin(t * 3 + i));
    icon(g, it.icon || 'box', 0, 0, R * 1.05, { t, color: '#fff1dc', accent: col }); g.restore();
    const la = Math.min(1, p);
    if (it.label) text(g, it.label, vert ? x + R + 30 : x, vert ? y : y + R + 58, { size: fit(g, it.label, V(46, 50), vert ? E.W * 0.5 : E.W * 0.22), color: col, weight: 700, spacing: 3, alpha: la, align: vert ? 'left' : 'center' });
    if (it.top) text(g, it.top, vert ? x - R - 30 : x, vert ? y : y - R - 48, { size: fit(g, it.top, V(62, 56), vert ? E.W * 0.3 : E.W * 0.22), color: col, glow: 18, alpha: la, align: vert ? 'right' : 'center' });
  });
}

// ---------- diagram outline: контурный рисунок (голова, тело, рыба) + выноска с цифрой ----------
const SHAPES = {
  head: { box: [0, 0, 1, 1], path: 'M0.30,0.96 C0.30,0.80 0.22,0.72 0.20,0.58 C0.17,0.38 0.25,0.14 0.48,0.08 C0.66,0.04 0.80,0.14 0.84,0.30 C0.86,0.38 0.84,0.42 0.87,0.47 L0.94,0.58 C0.95,0.61 0.92,0.62 0.89,0.63 C0.90,0.68 0.88,0.70 0.86,0.71 C0.88,0.75 0.86,0.80 0.80,0.81 C0.74,0.82 0.70,0.82 0.68,0.86 L0.66,0.96',
    spots: { nose: [0.9, 0.56], brain: [0.5, 0.3], eye: [0.74, 0.42], mouth: [0.83, 0.72], ear: [0.45, 0.52], throat: [0.55, 0.88] } },
  body: { box: [0.25, 0, 0.5, 1], path: 'M0.5,0.02 C0.58,0.02 0.62,0.08 0.62,0.13 C0.62,0.18 0.58,0.22 0.55,0.23 L0.55,0.25 C0.68,0.27 0.74,0.30 0.76,0.36 L0.84,0.58 C0.85,0.61 0.81,0.62 0.80,0.60 L0.71,0.40 L0.68,0.40 L0.66,0.58 L0.68,0.96 C0.68,0.99 0.62,0.99 0.61,0.96 L0.55,0.66 L0.5,0.66 L0.45,0.66 L0.39,0.96 C0.38,0.99 0.32,0.99 0.32,0.96 L0.34,0.58 L0.32,0.40 L0.29,0.40 L0.20,0.60 C0.19,0.62 0.15,0.61 0.16,0.58 L0.24,0.36 C0.26,0.30 0.32,0.27 0.45,0.25 L0.45,0.23 C0.42,0.22 0.38,0.18 0.38,0.13 C0.38,0.08 0.42,0.02 0.5,0.02 Z',
    spots: { brain: [0.5, 0.09], heart: [0.46, 0.33], lungs: [0.54, 0.32], stomach: [0.53, 0.44], liver: [0.44, 0.43], gut: [0.5, 0.52], blood: [0.73, 0.47], skin: [0.25, 0.44], bone: [0.37, 0.8], muscle: [0.64, 0.75], kidney: [0.56, 0.48] } },
  fish: { box: [0, 0.2, 1, 0.6], path: 'M0.92,0.50 C0.86,0.36 0.70,0.30 0.52,0.31 C0.36,0.32 0.24,0.40 0.16,0.46 L0.04,0.34 L0.08,0.50 L0.04,0.66 L0.16,0.54 C0.24,0.60 0.36,0.68 0.52,0.69 C0.70,0.70 0.86,0.64 0.92,0.50 Z M0.78,0.45 A0.02,0.02 0 1 0 0.781,0.45',
    spots: { head: [0.8, 0.48], belly: [0.5, 0.6], meat: [0.5, 0.5], tail: [0.1, 0.5], fin: [0.5, 0.33] } },
};
function outline(g, t, P) {
  const sh = SHAPES[P.shape] || SHAPES.head, vert = E.vertical, S = V(E.H * 0.74, E.W * 0.78), ox = vert ? E.W / 2 - S / 2 : E.W * 0.33 - S / 2, oy = vert ? E.H * 0.1 : E.H * 0.5 - S / 2;
  const path = new Path2D(); const m = new DOMMatrix([S, 0, 0, S, ox, oy]); path.addPath(new Path2D(sh.path), m);
  const d = ease.inOut(prog(t, 0.05, 1.1)); g.save(); g.setLineDash([6000]); g.lineDashOffset = 6000 * (1 - d); g.fillStyle = alpha('#6aa8ff', 0.07 * d); g.fill(path); g.strokeStyle = '#b8d6ff'; g.lineWidth = 7; g.shadowColor = '#6aa8ff'; g.shadowBlur = 22; g.stroke(path); g.restore();
  const sp = sh.spots[P.spot] || Object.values(sh.spots)[0], sx = ox + sp[0] * S, sy = oy + sp[1] * S, a = ease.out(prog(t, 0.8, 1.2));
  if (a > 0) {
    const pr = 46 + 8 * Math.sin(t * 4); circle(g, sx, sy, pr, alpha('#0b1424', 0.9 * a)); ring(g, sx, sy, pr, 3, alpha(GOLD(), a)); glow(g, sx, sy, 90, GOLD(), 0.35 * a);
    const r = rng(7); for (let i = 0; i < 9; i++) { const an = r() * 6.28 + t * (0.6 + r()), rr2 = r() * pr * 0.7; circle(g, sx + Math.cos(an) * rr2, sy + Math.sin(an) * rr2, 2.5 + r() * 3, alpha(i % 2 ? '#fff1c4' : GOLD(), a)); }
    const lx = vert ? E.W * 0.5 : E.W * 0.66, ly = vert ? E.H * 0.8 : E.H * 0.38, ke = ease.out(prog(t, 1.0, 1.4));
    if (ke > 0) { seg(g, [[sx + pr, sy], [lerp(sx + pr, lx - 20, ke), lerp(sy, ly, ke)]], 2, alpha(GOLD(), 0.8));
      if (P.label) text(g, P.label, lx, ly - 4, { size: fit(g, P.label, 40, E.W * 0.3), color: GOLD(), weight: 700, spacing: 4, align: vert ? 'center' : 'left', alpha: ke });
      if (P.small) text(g, P.small, lx, ly + 52, { size: fit(g, P.small, 34, E.W * 0.3), color: alpha(CREAM(), 0.8), weight: 600, spacing: 3, align: vert ? 'center' : 'left', alpha: ke }); }
    if (P.big) { const kb = ease.out(prog(t, 1.25, 1.7)); if (kb > 0) text(g, P.big, vert ? E.W * 0.5 : lx, (vert ? E.H * 0.88 : E.H * 0.56) , { size: fit(g, P.big, V(120, 110), vert ? E.W * 0.86 : E.W * 0.32), color: GOLD(), glow: 26, align: vert ? 'center' : 'left', alpha: kb }); }
  }
}

// ---------- insert zoom: «под микроскопом» — светлый круг-линза с живыми частицами ----------
const ZW = { germs: ['#9bd65b', '#6fc04a', 1], cells: ['#ff9db8', '#d96a8c', 0], fibers: ['#e8cfa0', '#b89a6a', 0], crystals: ['#ffffff', '#bcd6f0', 0], drops: ['#7ec8ff', '#3d8fd8', 0], fat: ['#ffd76a', '#e0a83a', 0], virus: ['#ff7a6a', '#c84a4a', 1] };
function zoomLens(g, t, P) {
  const cx = E.W / 2, cy = E.H * V(0.47, 0.42), R = Math.min(E.W, E.H) * V(0.37, 0.4) * (0.9 + 0.1 * ease.out(prog(t, 0, 0.5))), w = ZW[P.what] || ZW.germs, r = rng(P.seed || 11);
  glow(g, cx, cy, R * 1.6, '#fff4d8', 0.18);
  g.save(); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
  g.fillStyle = radGrad(g, cx - R * 0.2, cy - R * 0.25, R * 0.1, R * 1.1, ['#fffaf0', '#f3e8cc', '#c9b98e']); g.fillRect(cx - R, cy - R, R * 2, R * 2);
  if (P.word) text(g, P.word, cx, cy, { size: fit(g, P.word, R * 0.9, R * 1.8), color: 'rgba(120,100,70,0.22)' });
  const n = P.n || 14;
  for (let i = 0; i < n; i++) {
    const ga = i * 2.39996 + r() * 0.5, gr = R * 0.78 * Math.sqrt((i + 0.5) / n), bx = cx + Math.cos(ga) * gr + Math.sin(t * (0.6 + r()) + i) * 16, by = cy + Math.sin(ga) * gr + Math.cos(t * (0.5 + r()) + i * 2) * 12, s = (0.5 + r() * 0.7) * R * 0.16, rot = t * (r() - 0.5) + i;
    g.save(); g.translate(bx, by); g.rotate(rot);
    if (P.what === 'fibers') { g.strokeStyle = w[1]; g.lineWidth = s * 0.35; g.lineCap = 'round'; g.beginPath(); for (let k = 0; k <= 12; k++) { const u = k / 12; g.lineTo((u - 0.5) * s * 5, Math.sin(u * 7 + t * 2 + i) * s * 0.5); } g.stroke(); }
    else if (P.what === 'crystals') { poly(g, [[0, -s], [s * 0.8, -s * 0.2], [s * 0.5, s * 0.9], [-s * 0.6, s * 0.8], [-s * 0.9, -s * 0.1]], alpha(w[1], 0.85)); seg(g, [[0, -s], [s * 0.5, s * 0.9]], 2, alpha('#ffffff', 0.7)); }
    else {
      const wob = 1 + 0.08 * Math.sin(t * 5 + i); g.scale(wob, 2 - wob);
      g.beginPath(); for (let k = 0; k <= 16; k++) { const an = k / 16 * Math.PI * 2, rr2 = s * (1 + (P.what === 'germs' || P.what === 'virus' ? 0.18 * Math.sin(an * 5 + i) : 0)); g.lineTo(Math.cos(an) * rr2, Math.sin(an) * rr2); } g.closePath();
      g.fillStyle = w[0]; g.fill(); g.strokeStyle = w[1]; g.lineWidth = 3; g.stroke();
      if (P.what === 'cells') circle(g, s * 0.15, -s * 0.1, s * 0.38, alpha(w[1], 0.9));
      if (P.what === 'virus') for (let k = 0; k < 8; k++) { const an = k / 8 * Math.PI * 2; seg(g, [[Math.cos(an) * s, Math.sin(an) * s], [Math.cos(an) * s * 1.35, Math.sin(an) * s * 1.35]], 3, w[1]); circle(g, Math.cos(an) * s * 1.4, Math.sin(an) * s * 1.4, 4, w[1]); }
      if (w[2]) { const bl = (t * 0.7 + i * 0.37) % 3 > 2.9; for (const ex of [-0.32, 0.32]) { circle(g, ex * s, -s * 0.15, s * 0.22, '#ffffff'); if (!bl) circle(g, ex * s + s * 0.05, -s * 0.12, s * 0.1, '#1a1622'); } }
    }
    g.restore();
  }
  veil(g, '#000', 0); g.fillStyle = radGrad(g, cx, cy, R * 0.6, R, ['rgba(0,0,0,0)', 'rgba(60,40,20,0.45)']); g.fillRect(cx - R, cy - R, R * 2, R * 2);
  g.restore();
  ring(g, cx, cy, R + 10, 20, '#151821'); ring(g, cx, cy, R + 1, 3, alpha('#ffffff', 0.5));
  g.save(); g.globalAlpha *= 0.25; g.beginPath(); g.arc(cx - R * 0.35, cy - R * 0.4, R * 0.22, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill(); g.restore();
  text(g, P.mag || '×1000', cx + R * 0.82, cy - R * 0.92, { size: 40, color: alpha(CREAM(), 0.85), weight: 700, align: 'left' });
  if (P.label) kText(g, t, P.label, cx, cy + R + V(80, 110), { start: 0.4, mode: 'rise', size: fit(g, P.label, V(64, 70), E.W * 0.86), color: CREAM(), glow: 18 });
}

const TPL = { prop: tplProp, wide: tplWide, face: tplFace, insert: tplInsert, diagram: tplDiagram, chapter: tplChapter, title: tplTitle };
const STATIC = { diagram: 1, insert: 1, chapter: 1, prop: 1 };
for (let i = 1; i <= 600; i++) registerShot('s' + String(i).padStart(3, '0'), { draw(g, t, info) {
  const fn = TPL[info.tpl] || tplWide;
  if (!STATIC[info.tpl]) return fn(g, t, info);
  const u = clamp(t / Math.max(0.5, info.dur || 3)), k = (i % 2 ? 1 : -1), ck = E.cfg.kitCam ?? 1, z = ((info.z0 ?? 1.0) + ((info.z1 ?? 1.06) - (info.z0 ?? 1.0)) * ck * ease.inOut(u)) * (E.cfg.kitPunch ? 1 + E.cfg.kitPunch * Math.exp(-t * 8) : 1), dx = k * 24 * ck * (u - 0.5);   // медленный наезд + лёгкая панорама
  g.save(); g.translate(E.W / 2 + dx, E.H / 2); g.scale(z, z); g.translate(-E.W / 2, -E.H / 2); fn(g, t, info); g.restore();
} });
