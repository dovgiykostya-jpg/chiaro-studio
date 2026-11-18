// hero.js — «Часовщик» (Куратор «Входящих»): человек с механическим глазом-линзой. Лист героя: портрет, выражения, полный рост.
import { E, clamp, lerp, ease, prog, rr, seg, poly, circle, ring, glow, alpha, shade, mix, linGrad, radGrad, rng, layer, backdrop, registerShot, text, FONTS } from '/engine/core.js';
import { drift, fg } from '/engine/motion.js';
import * as FX from '/engine/fx2d.js';
const TEAL = '#2fd6c8', ICE = '#7fe8ff', WARM = '#ffb25a', NEON = '#ff4fa3', BRASS = '#c79a3c', BRASS_D = '#7a5c1e', SKIN = '#a47c64';
const lite = (g, fn) => { g.save(); g.globalCompositeOperation = 'lighter'; fn(); g.restore(); };
const T = (g, s, x, y, o = {}) => text(g, s, x, y, { font: FONTS.ui, weight: 700, color: '#e6edff', ...o });
function smooth(g, pts, closed = true) { const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; g.beginPath(); if (closed) { const m0 = mid(pts[n - 1], pts[0]); g.moveTo(m0[0], m0[1]); for (let i = 0; i < n; i++) { const p = pts[i], m = mid(p, pts[(i + 1) % n]); g.quadraticCurveTo(p[0], p[1], m[0], m[1]); } g.closePath(); } else { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n - 1; i++) { const m = mid(pts[i], pts[i + 1]); g.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); } g.lineTo(pts[n - 1][0], pts[n - 1][1]); } }

// ---------- ГОЛОВА (центр в 0,0, радиус ≈ 60) ----------
// expr: neutral | curious | doubt | insight | tired
function head(g, t, o = {}) {
  const ex = o.expr || 'neutral', ins = ex === 'insight', P = { neutral: [0, 0, 0, 0.5], curious: [-6, 4, 0, 0.9], doubt: [4, -5, -1, 0.3], insight: [-8, -8, 1, 1.0], tired: [6, 6, 0, 0.0] }[ex];
  const [brL, brR, mouth, aper] = P; const face = [[-50, -10], [-48, -40], [-30, -58], [0, -62], [30, -58], [48, -40], [50, -10], [46, 22], [32, 50], [0, 64], [-32, 50], [-46, 22]];
  // шея и уши
  g.fillStyle = shade(SKIN, -0.3); smooth(g, [[-18, 40], [18, 40], [24, 90], [-24, 90]]); g.fill(); for (const k of [-1, 1]) { g.fillStyle = shade(SKIN, -0.2); g.beginPath(); g.ellipse(k * 51, 8, 9, 15, 0, 0, 7); g.fill(); g.fillStyle = shade(SKIN, -0.45); g.beginPath(); g.ellipse(k * 51, 8, 4, 8, 0, 0, 7); g.fill(); }
  // лицо
  smooth(g, face); g.fillStyle = linGrad(g, -50, 0, 50, 0, [shade(SKIN, -0.42), SKIN, shade(SKIN, 0.12), shade(SKIN, -0.25)]); g.fill();
  g.save(); smooth(g, face); g.clip();
  g.fillStyle = linGrad(g, 0, 20, 0, 66, ['rgba(20,14,16,0)', 'rgba(20,14,16,.5)']); g.fillRect(-60, 20, 120, 50); const rs = rng(3); g.fillStyle = 'rgba(15,10,12,.5)'; for (let i = 0; i < 90; i++) g.fillRect(-34 + rs() * 68, 22 + rs() * 40, 1.6, 1.6);
  g.fillStyle = 'rgba(60,30,40,.28)'; for (const k of [-1, 1]) { g.beginPath(); g.ellipse(k * 24, 10, 17, 5, 0, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(40,20,20,.28)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-40, -34); g.quadraticCurveTo(0, -42, 40, -34); g.stroke(); g.beginPath(); g.moveTo(-28, -38); g.quadraticCurveTo(0, -46, 28, -38); g.stroke();   // морщины на лбу
  lite(g, () => { g.fillStyle = linGrad(g, -60, 0, -20, 0, ['rgba(255,178,90,.3)', 'rgba(255,178,90,0)']); g.fillRect(-60, -70, 40, 140); const lg = ex === 'insight' ? 0.5 : 0.28; g.fillStyle = radGrad(g, 24, -4, 4, 80, [`rgba(47,214,200,${lg})`, 'rgba(47,214,200,0)']); g.fillRect(-10, -70, 80, 140); });
  g.restore();
  // волосы + седая прядь
  smooth(g, [[-54, -14], [-56, -52], [-34, -76], [0, -82], [34, -76], [56, -52], [52, -22], [38, -40], [10, -34], [-14, -46], [-36, -36]]); g.fillStyle = '#14121a'; g.fill(); for (let i = 0; i < 8; i++) { const a = Math.PI * (1.1 + i * 0.11); circle(g, Math.cos(a) * 52, -36 + Math.sin(a) * 40, 9 + (i % 3) * 2, '#1d1a24'); }
  g.strokeStyle = '#dfe3ee'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(-10, -80); g.quadraticCurveTo(-24, -60, -18, -38); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-8, -80); g.quadraticCurveTo(-20, -60, -15, -40); g.stroke();
  lite(g, () => { g.strokeStyle = alpha(WARM, 0.7); g.lineWidth = 2.6; g.beginPath(); g.moveTo(-54, -40); g.quadraticCurveTo(-36, -80, 0, -84); g.stroke(); });
  // брови, нос, рот, щетина
  g.strokeStyle = '#14121a'; g.lineWidth = 5.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(-40, -18 + brL); g.lineTo(-12, -24 + brL * 1.4 - (ex === 'doubt' ? -6 : 0)); g.moveTo(12, -24 + brR); g.lineTo(40, -18 + brR * 0.6); g.stroke();
  g.strokeStyle = 'rgba(60,36,34,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 2); g.quadraticCurveTo(-6, 22, 3, 24); g.stroke(); g.strokeStyle = 'rgba(60,36,34,.35)'; g.beginPath(); g.moveTo(-18, 16); g.quadraticCurveTo(-24, 30, -14, 42); g.stroke();
  g.strokeStyle = '#5a2e2e'; g.lineWidth = 3; g.beginPath(); g.moveTo(-13, 40 + (mouth < 0 ? 2 : 0)); g.quadraticCurveTo(0, 43 - mouth * 6, 13, 38 - mouth * 3); g.stroke();
  // ЛЕВЫЙ глаз: обычный, веко тяжелее при усталости
  { const exx = -24, eyy = -4, lid = ex === 'tired' ? 0.5 : ex === 'insight' ? -0.1 : 0.15; g.save(); g.beginPath(); g.ellipse(exx, eyy, 14, 8, 0, 0, 7); g.clip(); g.fillStyle = '#e4e8f0'; g.fillRect(exx - 16, eyy - 10, 32, 20); const lx = (o.look ?? 0) * 3; circle(g, exx + 2 + lx, eyy, 6.4, '#2a3a5a'); circle(g, exx + 2 + lx, eyy, 3.2, '#07080d'); circle(g, exx + 5 + lx, eyy - 2, 1.9, '#fff'); g.fillStyle = shade(SKIN, -0.28); g.fillRect(exx - 16, eyy - 10, 32, 8 + lid * 16); g.restore(); g.strokeStyle = '#14121a'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(exx - 14, eyy - 1 + lid * 6); g.quadraticCurveTo(exx, eyy - 10 + lid * 12, exx + 14, eyy - 1 + lid * 6); g.stroke(); }
  // ПРАВЫЙ глаз: механическая линза
  { const cx = 24, cy = -4, R = 19, sp = ins ? 3 : 1; g.fillStyle = BRASS_D; g.beginPath(); g.ellipse(cx, cy, R + 7, R + 6, 0, 0, 7); g.fill(); g.strokeStyle = BRASS; g.lineWidth = 4; g.beginPath(); g.ellipse(cx, cy, R + 7, R + 6, 0, 0, 7); g.stroke(); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.78; circle(g, cx + Math.cos(a) * (R + 3), cy + Math.sin(a) * (R + 3), 2, '#3a2a0a'); }
    circle(g, cx, cy, R, '#03060a'); const gear = (r0, r1, n, rot, col) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, rr3 = i % 2 ? r0 : r1; const x = cx + Math.cos(a) * rr3, y = cy + Math.sin(a) * rr3; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.fill(); };
    gear(13, 16, 14, t * 0.6 * sp, '#8a6a22'); gear(8, 11, 10, -t * 0.9 * sp, '#a88230'); circle(g, cx, cy, 8.5, '#02050a');
    // лепестки диафрагмы
    const ap = 2.5 + aper * 5; lite(g, () => { for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + t * 0.3 * sp; g.fillStyle = alpha(TEAL, 0.55); g.beginPath(); g.moveTo(cx + Math.cos(a) * ap, cy + Math.sin(a) * ap); g.lineTo(cx + Math.cos(a + 0.9) * 8, cy + Math.sin(a + 0.9) * 8); g.lineTo(cx + Math.cos(a + 0.35) * 8.6, cy + Math.sin(a + 0.35) * 8.6); g.closePath(); g.fill(); } g.fillStyle = alpha('#eafcff', 0.95); g.beginPath(); g.arc(cx, cy, ap * 0.6, 0, 7); g.fill(); }); glow(g, cx, cy, 70 + (ins ? 40 : 0), TEAL, ins ? 0.95 : 0.6); circle(g, cx - 6, cy - 7, 2.4, 'rgba(255,255,255,.8)');
    // крепления: пластина на виске и проводок вниз к шее
    g.fillStyle = BRASS_D; rr(g, 38, -18, 20, 26, 5); g.fill(); g.strokeStyle = BRASS; g.lineWidth = 2; g.stroke(); circle(g, 44, -12, 1.8, '#3a2a0a'); circle(g, 52, 2, 1.8, '#3a2a0a'); seg(g, [[30, 12], [34, 36], [26, 58], [24, 90]], 2.6, '#c79a3c'); seg(g, [[cx, cy - R - 6], [12, -38], [4, -52]], 2.6, '#c79a3c'); }
  // «верхнее веко» над линзой (кожа), живое моргание
  if (o.blink) { g.fillStyle = SKIN; g.beginPath(); g.ellipse(24, -10, 26, 16, 0, 0, 7); g.fill(); }
}

// ---------- ТЕЛО (полный рост): пальто, жилет, цепочка с часами разных миров ----------
function body(g, t) {
  const sway = Math.sin(t * 1.6) * 3, br = Math.sin(t * 2.1) * 2, coat = '#2a2f3a', coat2 = '#10141c';
  g.save(); g.translate(0, 8); g.scale(1, 0.1); g.fillStyle = radGrad(g, 0, 0, 0, 230, ['rgba(0,0,0,.75)', 'rgba(0,0,0,0)']); g.beginPath(); g.arc(0, 0, 230, 0, 7); g.fill(); g.restore();
  for (const k of [-1, 1]) { g.fillStyle = '#080a11'; rr(g, k * 28 - 16, -245, 32, 225, 12); g.fill(); g.fillStyle = '#171b26'; smooth(g, [[k * 28 - 24, -22], [k * 28 + 22, -22], [k * 28 + (k > 0 ? 50 : -50), 0], [k * 28 - 26, 2]]); g.fill(); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(k * 28 - 12, -20, 18, 4); }
  const hem = []; for (let i = 0; i <= 8; i++) hem.push([lerp(-104, 104, i / 8) + sway * (i / 8), -232 + (i % 2 ? 26 : 0) + Math.sin(i * 1.7) * 6]);
  const P = [[-70, -592 + br], [-104, -566 + br], [-112, -430], [-108, -300], ...hem, [108, -300], [112, -430], [104, -566 + br], [70, -592 + br], [0, -604 + br]];
  smooth(g, P); g.fillStyle = linGrad(g, -112, 0, 112, 0, [coat2, coat, shade(coat, 0.14), coat, coat2]); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2; g.stroke();
  g.save(); smooth(g, P); g.clip(); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 3; g.lineCap = 'round'; for (let i = 0; i < 7; i++) { const x = -90 + i * 30; g.beginPath(); g.moveTo(x, -420); g.quadraticCurveTo(x + (i - 3) * 6 + sway, -330, x + (i - 3) * 14 + sway, -230); g.stroke(); } g.fillStyle = linGrad(g, 0, -330, 0, -210, ['rgba(0,0,0,0)', 'rgba(0,0,0,.45)']); g.fillRect(-130, -330, 260, 130);
  // жилет в вырезе пальто
  poly(g, [[-30, -596], [0, -440], [30, -596], [0, -566]], '#3a2a24'); g.strokeStyle = BRASS; g.lineWidth = 1.6; for (const y of [-540, -500, -462]) { circle(g, 0, y, 4, BRASS_D); circle(g, 0, y, 2, BRASS); }
  seg(g, [[0, -440], [0, -240]], 3, 'rgba(0,0,0,.55)'); g.fillStyle = '#0a0c12'; g.fillRect(-112, -402, 224, 22); g.fillStyle = BRASS_D; rr(g, -14, -406, 28, 30, 4); g.fill(); g.fillStyle = '#0a0c12'; rr(g, -8, -400, 16, 18, 3); g.fill(); g.restore();
  for (const k of [-1, 1]) poly(g, [[k * 12, -600 + br], [k * 66, -640 + br], [k * 78, -580 + br], [k * 30, -560 + br]], shade(coat2, 0.05));
  // цепочка с карманными часами разных миров
  g.strokeStyle = BRASS; g.lineWidth = 2.6; g.beginPath(); g.moveTo(-6, -404); g.quadraticCurveTo(-34, -380, -42, -352); g.stroke(); const ws = [[-42, -340, TEAL], [-16, -330, WARM], [10, -338, NEON]];
  ws.forEach(([x, y, c], i) => { seg(g, [[x, y - 12], [x, y - 4]], 2, BRASS); circle(g, x, y + 6, 13, BRASS_D); circle(g, x, y + 6, 11, '#e8e2cf'); const a = t * (0.8 + i * 0.5) + i; seg(g, [[x, y + 6], [x + Math.cos(a) * 8, y + 6 + Math.sin(a) * 8]], 1.8, '#2a2418'); seg(g, [[x, y + 6], [x + Math.cos(-a * 2.2) * 5, y + 6 + Math.sin(-a * 2.2) * 5]], 1.8, '#7a2418'); glow(g, x, y + 6, 26, c, 0.35); });
  // руки, манжеты, пальцы в масле, часы
  lite(g, () => { g.lineCap = 'round'; g.strokeStyle = alpha(WARM, 0.5); g.lineWidth = 3; g.beginPath(); g.moveTo(-104, -566); g.lineTo(-112, -430); g.lineTo(-108, -300); g.stroke(); g.strokeStyle = alpha(ICE, 0.75); g.beginPath(); g.moveTo(104, -566); g.lineTo(112, -430); g.lineTo(108, -300); g.stroke(); });
}
function thread(g, t, sx, sy, sx2, sy2, col = TEAL) { const P = (u) => [lerp(sx, sx2, u) + Math.sin(u * 5 + t * 1.4) * 8 * u, lerp(sy, sy2, u) - Math.sin(u * Math.PI * 0.9) * 150]; lite(g, () => { for (const [w, al] of [[14, 0.07], [6, 0.18], [3, 0.95]]) { g.strokeStyle = alpha(col, al); g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); for (let i = 0; i <= 40; i++) { const q = P(i / 40); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.stroke(); } }); for (let i = 0; i < 5; i++) { const u = (t * 0.4 + i / 5) % 1, q = P(u); circle(g, q[0], q[1], 3.2, '#eafcff'); glow(g, q[0], q[1], 26, col, 0.8); } }

export { head, body, thread, smooth, lite, T };
