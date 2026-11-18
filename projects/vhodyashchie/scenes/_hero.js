// _hero.js — «Следователь»: детально нарисованный взрослый персонаж (Bezier-контуры, градиенты, складки, щетина, очки, руки).
// Профиль вправо, сидит за столом. Начало координат: пол под тазом, y вверх отрицательный. Рост сидя ≈ 440 px.
import { E, clamp, lerp, ease, rr, seg, circle, glow, alpha, shade, mix, linGrad, radGrad, rng } from '/engine/core.js';

const CY = '#7fe8ff', AM = '#ffb25a';
const SKIN = '#b98a6e', SKIN_D = '#5d403d', HAIR = '#15121b', HOOD = '#2c3548', HOOD_D = '#171c2a', PANTS = '#1c2232', SHOE = '#262b3a';

function smooth(g, pts, closed = true) {
  const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; g.beginPath();
  if (closed) { const m0 = mid(pts[n - 1], pts[0]); g.moveTo(m0[0], m0[1]); for (let i = 0; i < n; i++) { const p = pts[i], m = mid(p, pts[(i + 1) % n]); g.quadraticCurveTo(p[0], p[1], m[0], m[1]); } g.closePath(); }
  else { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n - 1; i++) { const m = mid(pts[i], pts[i + 1]); g.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); } g.lineTo(pts[n - 1][0], pts[n - 1][1]); }
}
function ik(a, b, L1, L2, dir) { const dx = b[0] - a[0], dy = b[1] - a[1]; let d = Math.min(Math.hypot(dx, dy), L1 + L2 - 0.01); const ang = Math.atan2(dy, dx) - dir * Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)); return [a[0] + Math.cos(ang) * L1, a[1] + Math.sin(ang) * L1]; }
const lite = (g, fn) => { g.save(); g.globalCompositeOperation = 'lighter'; fn(); g.restore(); };

// ---------- кресло ----------
export function drawChair(g, x, y, t) {
  g.save(); g.translate(x, y);
  // колёсная звезда + газлифт
  g.strokeStyle = '#0a0d14'; g.lineWidth = 9; g.lineCap = 'round'; for (const dx of [-66, -30, 30, 66]) { g.beginPath(); g.moveTo(0, -30); g.lineTo(dx, -12); g.stroke(); circle(g, dx, -6, 8, '#06080d'); }
  g.fillStyle = '#0c1019'; g.fillRect(-8, -150, 16, 124);
  // сиденье и спинка
  rr(g, -62, -166, 134, 30, 14); g.fillStyle = linGrad(g, 0, -166, 0, -136, ['#252f44', '#121724']); g.fill();
  g.save(); g.translate(-58, -150); g.rotate(-0.09); rr(g, -22, -190, 34, 210, 16); g.fillStyle = linGrad(g, -22, 0, 12, 0, ['#10151f', '#222c40']); g.fill(); g.strokeStyle = 'rgba(127,232,255,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(11, -170); g.lineTo(11, 10); g.stroke(); g.restore();
  g.restore();
}

// ---------- сам герой ----------
// o: lean 0..1 (наклон к экрану), look [x,y], talk 0..1, brow -1..1, blink bool, hand: целевая точка клавиатуры (в локальных координатах)
export function drawDetective(g, x, y, t, o = {}) {
  const lean = o.lean || 0, talk = o.talk || 0, brow = o.brow || 0, look = o.look || [0.9, -0.1];
  const br = Math.sin(t * 2.1) * 1.6, sw = Math.sin(t * 0.9) * 1.2;      // дыхание
  const H = [0, -150], rotA = lean * 0.11 + 0.01;                          // таз и наклон корпуса
  const rot = (p) => { const dx = p[0] - H[0], dy = p[1] - H[1], c = Math.cos(rotA), s = Math.sin(rotA); return [H[0] + dx * c - dy * s, H[1] + dx * s + dy * c]; };
  g.save(); g.translate(x, y);
  // мягкая контактная тень на полу
  g.save(); g.translate(60, 4); g.scale(1, 0.1); g.fillStyle = radGrad(g, 0, 0, 0, 190, ['rgba(0,0,0,.7)', 'rgba(0,0,0,0)']); g.beginPath(); g.arc(0, 0, 190, 0, 7); g.fill(); g.restore();

  const typing = o.typing ?? 1, tp = t * 9.5;
  const handN = [118 + Math.sin(tp * 0.5) * 6, -187 + Math.max(0, Math.sin(tp)) * 2.5 * typing];
  const handF = [88 + Math.sin(tp * 0.5 + 2) * 5, -185 + Math.max(0, Math.sin(tp * 1.3 + 1)) * 2.5 * typing];
  const S1 = rot([4, -292 + br]), S2 = rot([-12, -290 + br]);
  const E1 = ik(S1, handN, 92, 92, -1), E2 = ik(S2, handF, 90, 90, -1);

  // дальняя нога
  limb(g, [[14, -152], [128, -160]], 40, shade(PANTS, -0.3)); limb(g, [[128, -160], [134, -24]], 30, shade(PANTS, -0.35)); shoe(g, 134, -22, shade(SHOE, -0.35));
  // дальняя рука (за корпусом)
  limb(g, [S2, E2], 24, shade(HOOD, -0.4)); limb(g, [E2, handF], 21, shade(HOOD, -0.42)); hand(g, handF, tp + 2, true);

  // КОРПУС: толстовка с капюшоном, складки
  g.save(); g.translate(H[0], H[1]); g.rotate(rotA); g.translate(-H[0], -H[1]);
  const T = [[-38, -132], [-46, -200], [-40, -258], [-26, -300 + br], [8, -322 + br], [38, -312 + br], [56, -278 + br * 0.6], [60, -232], [56, -192], [42, -160], [8, -140]];
  smooth(g, T); g.fillStyle = linGrad(g, -46, 0, 60, 0, [shade(HOOD, -0.45), HOOD, shade(HOOD, 0.1)]); g.fill();
  g.save(); smooth(g, T); g.clip();
  // тёмный низ, складки ткани
  g.fillStyle = linGrad(g, 0, -190, 0, -130, ['rgba(0,0,0,0)', 'rgba(0,0,0,.45)']); g.fillRect(-60, -200, 130, 80);
  g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 3; g.lineCap = 'round'; for (const [a, b, c, d2] of [[-20, -250, 10, -236], [-30, -218, 18, -204], [-24, -186, 28, -176], [18, -270, 34, -246], [30, -224, 50, -214]]) { g.beginPath(); g.moveTo(a, b); g.quadraticCurveTo((a + c) / 2, (b + d2) / 2 + 9, c, d2); g.stroke(); }
  g.strokeStyle = 'rgba(180,200,255,.14)'; g.lineWidth = 2; for (const [a, b, c, d2] of [[-18, -255, 12, -241], [-26, -223, 20, -209], [22, -266, 38, -243]]) { g.beginPath(); g.moveTo(a, b + 4); g.quadraticCurveTo((a + c) / 2, (b + d2) / 2 + 13, c, d2 + 4); g.stroke(); }
  // карман-кенгуру и шнурки
  g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(8, -186); g.quadraticCurveTo(40, -196, 54, -178); g.stroke();
  seg(g, [[32, -308], [38, -262]], 2.5, '#9aa6bd'); seg(g, [[22, -310], [24, -268]], 2.5, '#9aa6bd'); circle(g, 38, -260, 3, '#cfd6e6'); circle(g, 24, -266, 3, '#cfd6e6');
  g.restore();
  // капюшон, лежащий за шеей
  g.save(); g.translate(-26, -312 + br); g.rotate(-0.4); g.beginPath(); g.ellipse(0, 0, 32, 20, 0, 0, 7); g.fillStyle = linGrad(g, -30, 0, 30, 0, [shade(HOOD, -0.6), HOOD_D]); g.fill(); g.restore();
  // контровой тёплый свет по спине, холодный по груди
  lite(g, () => { g.lineCap = 'round'; smooth(g, [[-26, -300], [-40, -258], [-46, -200]], false); g.strokeStyle = alpha(AM, 0.55); g.lineWidth = 3; g.stroke(); smooth(g, [[38, -312], [56, -278], [60, -232], [56, -192]], false); g.strokeStyle = alpha(CY, 0.7); g.lineWidth = 3; g.stroke(); });
  // наушники на шее
  g.strokeStyle = '#aab6cb'; g.lineWidth = 5; g.beginPath(); g.ellipse(8, -318 + br, 30, 13, 0.05, 0.12, Math.PI - 0.1); g.stroke();
  circle(g, -2, -300 + br, 15, '#9aa7bd'); circle(g, -2, -300 + br, 9, '#222a3a'); lite(g, () => { g.strokeStyle = alpha(CY, 0.5); g.lineWidth = 2; g.beginPath(); g.arc(-2, -300 + br, 15, -1.2, 0.6); g.stroke(); });
  g.restore();

  // ближняя нога: брюки со складками, колено, ботинок
  limb(g, [[14, -152], [122, -160]], 46, PANTS); limb(g, [[122, -160], [128, -26]], 34, PANTS); shoe(g, 128, -22, SHOE);
  g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 2.5; g.lineCap = 'round'; for (const [a, b, c, d2] of [[40, -168, 62, -156], [70, -170, 94, -160], [112, -140, 124, -118], [114, -96, 128, -84]]) { g.beginPath(); g.moveTo(a, b); g.quadraticCurveTo((a + c) / 2, (b + d2) / 2 + 6, c, d2); g.stroke(); }
  lite(g, () => { g.strokeStyle = alpha(CY, 0.55); g.lineWidth = 2.5; g.beginPath(); g.moveTo(30, -176); g.quadraticCurveTo(100, -184, 140, -178); g.lineTo(146, -120); g.stroke(); });

  // ближняя рука: рукав, манжета, кисть
  limb(g, [S1, E1], 28, HOOD); limb(g, [E1, handN], 24, mix(HOOD, '#000', 0.08));
  lite(g, () => { g.strokeStyle = alpha(CY, 0.35); g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(S1[0] + 2, S1[1] - 12); g.lineTo(E1[0] + 2, E1[1] - 12); g.lineTo(handN[0] - 8, handN[1] - 12); g.stroke(); });
  const fa = Math.atan2(handN[1] - E1[1], handN[0] - E1[0]); g.save(); g.translate(handN[0] - Math.cos(fa) * 14, handN[1] - Math.sin(fa) * 14); g.rotate(fa); rr(g, -6, -13, 14, 26, 5); g.fillStyle = '#141a28'; g.fill(); g.restore();
  hand(g, handN, tp, false);

  // ГОЛОВА (наклон вперёд вместе с корпусом) — отдельная иерархия
  const hp = rot([30, -372 + br * 0.8]); g.save(); g.translate(hp[0], hp[1]); g.rotate(rotA * 1.1 + Math.sin(t * 0.7) * 0.012 + (o.tilt || 0)); head(g, t, { look, talk, brow, blink: o.blink }); g.restore();
  g.restore();
}

function limb(g, pts, w, col) { g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); g.restore(); }
function shoe(g, x, y, col) {
  g.save(); g.translate(x, y); smooth(g, [[-20, -14], [14, -16], [40, -8], [62, 0], [64, 14], [-22, 16]]); g.fillStyle = linGrad(g, 0, -16, 0, 16, [shade(col, 0.12), col]); g.fill();
  g.fillStyle = '#cfd3dc'; g.globalAlpha = 0.55; g.fillRect(-22, 11, 86, 4); g.globalAlpha = 1; for (let k = 0; k < 3; k++) seg(g, [[6 + k * 9, -11 + k * 2], [10 + k * 9, -6 + k * 2]], 1.8, 'rgba(210,220,240,.5)');
  lite(g, () => { g.strokeStyle = alpha(CY, 0.5); g.lineWidth = 2; g.beginPath(); g.moveTo(-6, -15); g.quadraticCurveTo(34, -16, 58, -2); g.stroke(); }); g.restore();
}
function hand(g, h, tp, far) {
  g.save(); g.translate(h[0] + 2, h[1] + 2); const base = far ? shade(SKIN, -0.45) : SKIN;
  g.beginPath(); g.ellipse(6, 0, 17, 10, 0.1, 0, 7); g.fillStyle = base; g.fill();
  for (let k = 0; k < 4; k++) { const bob = Math.max(0, Math.sin(tp * 1.7 + k * 1.9)) * 4; seg(g, [[14 + k * 2.5, -5 + k * 3.2], [26 + k * 2.5, 2 + k * 3 + bob * 0.35]], 6, base); }
  lite(g, () => { g.strokeStyle = alpha(CY, far ? 0.25 : 0.5); g.lineWidth = 1.8; g.beginPath(); g.moveTo(-8, -8); g.quadraticCurveTo(8, -12, 22, -5); g.stroke(); }); g.restore();
}

// ---------- голова в профиль ----------
function head(g, t, o) {
  const look = o.look, talk = o.talk, brow = o.brow;
  // шея (тёмная под челюстью)
  smooth(g, [[-22, 38], [16, 44], [26, 84], [-28, 86]]); g.fillStyle = linGrad(g, 0, 40, 0, 86, [shade(SKIN, -0.5), SKIN_D]); g.fill();
  // череп/лицо
  const P = [[-30, 36], [-44, 12], [-47, -18], [-34, -46], [-6, -58], [26, -52], [42, -30], [46, -10], [47, 0], [58, 18], [48, 26], [50, 33], [45, 38], [49, 45], [44, 62], [22, 68], [-6, 64], [-24, 50]];
  smooth(g, P); g.fillStyle = linGrad(g, -44, 0, 56, 0, [SKIN_D, '#8a6657', SKIN]); g.fill();
  g.save(); smooth(g, P); g.clip();
  // тень от скулы и под глазом, щетина
  g.fillStyle = radGrad(g, 8, 28, 4, 60, ['rgba(20,12,20,.0)', 'rgba(20,12,20,.34)']); g.fillRect(-60, -20, 140, 100);
  g.fillStyle = linGrad(g, 0, 22, 0, 70, ['rgba(12,10,16,0)', 'rgba(12,10,16,.5)']); g.fillRect(-20, 22, 80, 50);
  const r = rng(7); g.fillStyle = 'rgba(10,8,14,.55)'; for (let i = 0; i < 110; i++) { const px = -18 + r() * 66, py = 24 + r() * 44; if (py > 30 + (px - 40) * 0.2) g.fillRect(px, py, 1.6, 1.6); }
  // холодный свет экрана спереди
  lite(g, () => { g.fillStyle = linGrad(g, 8, 0, 60, 0, ['rgba(127,232,255,0)', 'rgba(127,232,255,.42)']); g.fillRect(-10, -60, 80, 140); g.fillStyle = radGrad(g, 50, -4, 0, 48, ['rgba(127,232,255,.28)', 'rgba(127,232,255,0)']); g.fillRect(0, -50, 80, 80); });
  g.restore();
  // ухо
  g.beginPath(); g.ellipse(-14, 12, 8, 14, 0.12, 0, 7); g.fillStyle = shade(SKIN, -0.28); g.fill(); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 2; g.beginPath(); g.arc(-13, 12, 4.2, -1.2, 2.4); g.stroke();
  // глаз за очками
  const blink = o.blink; const ex = 30, ey = -6; g.save(); g.translate(ex, ey);
  if (blink) { seg(g, [[-8, 0], [8, 0]], 3, '#241a22'); }
  else { g.beginPath(); g.ellipse(0, 0, 9, 6.5, 0, 0, 7); g.fillStyle = '#d9dee8'; g.fill(); circle(g, look[0] * 3.5 + 1, look[1] * 2.2, 4.1, '#2a3550'); circle(g, look[0] * 3.5 + 1.3, look[1] * 2.2, 2, '#07080d'); circle(g, look[0] * 3.5 + 2.6, look[1] * 2.2 - 1.4, 1.2, 'rgba(255,255,255,.95)'); g.strokeStyle = 'rgba(20,12,22,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 9, Math.PI * 1.06, Math.PI * 1.94); g.stroke(); }
  g.restore();
  // брови: поднимаются при brow>0, хмурятся при <0
  g.strokeStyle = HAIR; g.lineWidth = 4.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(16, -24 - brow * 4); g.quadraticCurveTo(30, -31 - brow * 7, 45, -25 + brow * 3 + (brow < 0 ? -brow * 4 : 0)); g.stroke();
  // нос-тень и рот
  g.strokeStyle = 'rgba(30,14,22,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(46, 12); g.quadraticCurveTo(54, 22, 47, 26); g.stroke();
  const mo = talk * 7; g.beginPath(); g.moveTo(47, 39); g.quadraticCurveTo(43, 40 + mo, 35, 40.5 + mo * 0.4); g.strokeStyle = '#4a2630'; g.lineWidth = 3; g.lineCap = 'round'; g.stroke(); if (mo > 1) { g.beginPath(); g.moveTo(47, 40); g.quadraticCurveTo(44, 40 + mo * 1.6, 36, 41); g.closePath(); g.fillStyle = '#2a1018'; g.fill(); }
  // очки: оправа, линза с бликом экрана, дужка
  g.save(); g.translate(30, -6); g.beginPath(); g.ellipse(0, 0, 16, 13.5, 0, 0, 7); g.fillStyle = 'rgba(127,232,255,.10)'; g.fill(); g.strokeStyle = '#0a0b12'; g.lineWidth = 3.4; g.stroke(); g.strokeStyle = 'rgba(190,210,255,.55)'; g.lineWidth = 1.2; g.stroke();
  g.save(); g.beginPath(); g.ellipse(0, 0, 14.5, 12, 0, 0, 7); g.clip(); lite(g, () => { g.fillStyle = linGrad(g, -14, -12, 10, 12, ['rgba(160,240,255,.0)', 'rgba(160,240,255,.55)', 'rgba(160,240,255,.0)']); g.fillRect(-16, -14, 32, 28); g.fillStyle = 'rgba(180,255,220,.35)'; for (let k = 0; k < 4; k++) g.fillRect(-9, -7 + k * 4.2, 8 + (k % 2) * 6, 1.4); }); g.restore(); g.restore();
  seg(g, [[14, -8], [-24, -2], [-30, 4]], 2.6, '#0a0b12'); seg(g, [[16, -10], [44, -12]], 2.4, '#0a0b12');
  // волосы: объёмная шапка с кудрями, контровой янтарный свет
  smooth(g, [[-46, -2], [-50, -30], [-38, -56], [-10, -68], [22, -64], [44, -46], [40, -30], [28, -40], [14, -34], [2, -42], [-12, -32], [-24, -38], [-34, -18]]); g.fillStyle = linGrad(g, -48, -64, 44, -30, ['#0b0910', HAIR, '#1f1a28']); g.fill();
  const rc = rng(31); for (let i = 0; i < 12; i++) { const a = Math.PI * (1.02 + i * 0.075), cx = Math.cos(a) * 44 - 2, cy = Math.sin(a) * 40 - 22; circle(g, cx, cy, 8 + rc() * 5 + Math.sin(t * 0.8 + i) * 0.5, i % 3 ? HAIR : '#1d1826'); }
  lite(g, () => { g.strokeStyle = alpha(AM, 0.75); g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(-40, -42); g.quadraticCurveTo(-18, -70, 22, -66); g.stroke(); g.strokeStyle = alpha(AM, 0.35); g.beginPath(); g.moveTo(-46, -10); g.quadraticCurveTo(-52, -34, -40, -50); g.stroke(); });
  // холодный контур профиля (лицо, нос, подбородок)
  lite(g, () => { smooth(g, [[40, -34], [46, -10], [47, 0], [58, 18], [48, 26], [50, 33], [45, 38], [49, 45], [44, 62], [28, 68]], false); g.strokeStyle = alpha(CY, 0.85); g.lineWidth = 2.6; g.stroke(); });
}
