// _fox.js — «Кибер-Лис» (канон CineTales): антрацитово-чёрный мех, рваный рыже-коричневый тренч, двойной респиратор с красно-оранжевыми линзами,
// голубое нагрудное ядро, пушистый хвост. Профиль вправо, сидит за пультом. Начало координат: пол под тазом, y вверх отрицательный.
import { E, clamp, lerp, rr, seg, circle, glow, alpha, shade, mix, linGrad, radGrad, rng } from '/engine/core.js';

const CY = '#7fe8ff', AM = '#ffb25a', ICE = '#4fc3ff', RED = '#ff4a2e';
const FUR = '#171b26', FUR2 = '#2a3141', COAT = '#7a3d22', COAT_D = '#3f2217', COAT_L = '#b4602f', GLOVE = '#0b0d12', PANTS = '#0f1218', BOOT = '#191c25';

function smooth(g, pts, closed = true) {
  const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; g.beginPath();
  if (closed) { const m0 = mid(pts[n - 1], pts[0]); g.moveTo(m0[0], m0[1]); for (let i = 0; i < n; i++) { const p = pts[i], m = mid(p, pts[(i + 1) % n]); g.quadraticCurveTo(p[0], p[1], m[0], m[1]); } g.closePath(); }
  else { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n - 1; i++) { const m = mid(pts[i], pts[i + 1]); g.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); } g.lineTo(pts[n - 1][0], pts[n - 1][1]); }
}
function ik(a, b, L1, L2, dir) { const dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.min(Math.hypot(dx, dy), L1 + L2 - 0.01); const ang = Math.atan2(dy, dx) - dir * Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)); return [a[0] + Math.cos(ang) * L1, a[1] + Math.sin(ang) * L1]; }
const lite = (g, fn) => { g.save(); g.globalCompositeOperation = 'lighter'; fn(); g.restore(); };
function limb(g, pts, w, col) { g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); g.restore(); }
// рваная кромка: зигзаг между точками a→b, глубина d
function ragged(a, b, n, d, seed) { const r = rng(seed), out = []; for (let i = 0; i <= n; i++) { const u = i / n; out.push([lerp(a[0], b[0], u) + (i % 2 ? 0 : (r() - 0.3) * d * 0.4), lerp(a[1], b[1], u) + (i % 2 ? d * (0.5 + r()) : -d * 0.2 * r())]); } return out; }

export function drawFox(g, x, y, t, o = {}) {
  const lean = o.lean || 0, talk = o.talk || 0, look = o.look || [0.8, -0.1];
  const br = Math.sin(t * 2.1) * 1.6, sway = Math.sin(t * 1.3), H = [0, -150], rotA = lean * 0.1 + 0.01;
  const rot = (p) => { const dx = p[0] - H[0], dy = p[1] - H[1], c = Math.cos(rotA), s = Math.sin(rotA); return [H[0] + dx * c - dy * s, H[1] + dx * s + dy * c]; };
  g.save(); g.translate(x, y);
  // контактная тень
  g.save(); g.translate(40, 4); g.scale(1, 0.1); g.fillStyle = radGrad(g, 0, 0, 0, 230, ['rgba(0,0,0,.75)', 'rgba(0,0,0,0)']); g.beginPath(); g.arc(0, 0, 230, 0, 7); g.fill(); g.restore();
  const tp = t * 9.5, typing = o.typing ?? 1;
  const handN = [118 + Math.sin(tp * 0.5) * 6, -187 + Math.max(0, Math.sin(tp)) * 2.5 * typing], handF = [90 + Math.sin(tp * 0.5 + 2) * 5, -185 + Math.max(0, Math.sin(tp * 1.3 + 1)) * 2.5 * typing];
  const S1 = rot([6, -290 + br]), S2 = rot([-12, -288 + br]), E1 = ik(S1, handN, 94, 94, -1), E2 = ik(S2, handF, 92, 92, -1);

  // ХВОСТ: пушистый, тёмный, кончик светлее, красный контровой свет, покачивается
  const sw = sway * 12; g.save();
  const tailTop = [[-26, -166], [-100, -170], [-182, -126 + sw * 0.3], [-226, -50 + sw * 0.6], [-214, 6 + sw * 0.3]], tailBot = [[-168, 8 + sw * 0.2], [-168, -56 + sw * 0.4], [-124, -102], [-44, -112]];
  smooth(g, [...tailTop, ...tailBot]); g.fillStyle = linGrad(g, -40, -150, -220, 10, [FUR2, '#10131b', '#4a5470']); g.fill();
  g.save(); smooth(g, [...tailTop, ...tailBot]); g.clip(); g.strokeStyle = 'rgba(120,140,190,.18)'; g.lineWidth = 2; for (let i = 0; i < 16; i++) { const u = i / 16; g.beginPath(); g.moveTo(-40 - u * 80, -165 + u * 45); g.quadraticCurveTo(-120 - u * 90, -150 + u * 40 + sw * 0.2, -200 - u * 14, -60 + u * 55 + sw * 0.4); g.stroke(); } g.restore();
  lite(g, () => { smooth(g, tailTop, false); g.strokeStyle = alpha(RED, 0.55); g.lineWidth = 3; g.stroke(); }); g.restore();

  // дальняя нога и рука
  limb(g, [[14, -152], [128, -160]], 34, shade(PANTS, -0.2)); limb(g, [[128, -160], [134, -24]], 26, shade(PANTS, -0.25)); boot(g, 134, -22, shade(BOOT, -0.3));
  limb(g, [S2, E2], 22, shade(COAT_D, -0.1)); limb(g, [E2, handF], 19, shade(COAT_D, -0.15)); glove(g, handF, tp + 2, true);

  // КОРПУС (наклон вперёд): чёрный жилет, голубое ядро, тренч с рваным подолом
  g.save(); g.translate(H[0], H[1]); g.rotate(rotA); g.translate(-H[0], -H[1]);
  const T = [[-34, -134], [-42, -200], [-36, -262], [-22, -300 + br], [6, -320 + br], [34, -308 + br], [50, -276 + br * 0.6], [54, -232], [50, -192], [38, -162], [6, -140]];
  smooth(g, T); g.fillStyle = linGrad(g, -40, 0, 56, 0, ['#07080c', '#11141c', '#1b2030']); g.fill();
  // панели жилета и ремни
  g.save(); smooth(g, T); g.clip(); g.strokeStyle = 'rgba(120,150,210,.18)'; g.lineWidth = 2; for (const yy of [-270, -236, -204]) { g.beginPath(); g.moveTo(-40, yy); g.lineTo(56, yy + 6); g.stroke(); } seg(g, [[28, -310], [34, -170]], 5, '#0a0c11'); g.restore();
  // ядро-реактор на груди: голубое, с кольцами и свечением
  const cx = 38, cy = -262 + br * 0.6, pulse = 0.85 + 0.15 * Math.sin(t * 3.2);
  circle(g, cx, cy, 17, '#06080d'); circle(g, cx, cy, 13, alpha(ICE, 0.35 * pulse)); circle(g, cx, cy, 9, '#bfeaff'); g.strokeStyle = alpha(ICE, 0.8); g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 15, 0, 7); g.stroke();
  glow(g, cx, cy, 120, ICE, 0.45 * pulse); glow(g, cx + 30, cy, 160, ICE, 0.14);
  // ТРЕНЧ: рыже-коричневый, лежит на спине и на коленях, рваный подол, заплатки, потёртости
  const coatBack = [[-26, -306 + br], [-44, -262], [-52, -190], [-62, -120], ...ragged([-62, -120], [-96, -20], 7, 22, 4).slice(1), [-30, -40], [-18, -110], [-14, -190], [-6, -260], [4, -308 + br]];
  smooth(g, coatBack); g.fillStyle = linGrad(g, -90, -300, 10, -40, [COAT_L, COAT, COAT_D]); g.fill();
  g.save(); smooth(g, coatBack); g.clip(); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 2.5; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(-70 + i * 9, -250 + i * 8); g.quadraticCurveTo(-60 + i * 10, -150, -76 + i * 11, -50); g.stroke(); }
  g.fillStyle = '#2a2f3a'; g.fillRect(-58, -170, 26, 30); g.strokeStyle = 'rgba(255,255,255,.3)'; g.setLineDash([4, 3]); g.strokeRect(-58, -170, 26, 30); g.setLineDash([]); g.restore();
  lite(g, () => { smooth(g, [[-26, -306], [-44, -262], [-52, -190], [-62, -120]], false); g.strokeStyle = alpha(AM, 0.65); g.lineWidth = 3; g.stroke(); });
  // воротник тренча, поднятый
  smooth(g, [[-30, -306 + br], [-8, -334 + br], [14, -326 + br], [6, -300 + br], [-18, -288]]); g.fillStyle = linGrad(g, -30, -330, 14, -290, [COAT_L, COAT_D]); g.fill();
  g.restore();

  // ближняя нога: чёрные штаны, ботинок
  limb(g, [[14, -152], [122, -160]], 40, PANTS); limb(g, [[122, -160], [128, -26]], 30, PANTS); boot(g, 128, -22, BOOT);
  g.strokeStyle = 'rgba(120,150,210,.16)'; g.lineWidth = 2.5; for (const [a, b, c, d2] of [[40, -168, 64, -156], [74, -170, 98, -160], [112, -140, 124, -118]]) { g.beginPath(); g.moveTo(a, b); g.quadraticCurveTo((a + c) / 2, (b + d2) / 2 + 6, c, d2); g.stroke(); }
  lite(g, () => { g.strokeStyle = alpha(CY, 0.5); g.lineWidth = 2.5; g.beginPath(); g.moveTo(30, -176); g.quadraticCurveTo(100, -184, 140, -178); g.lineTo(146, -120); g.stroke(); });
  // подол тренча на коленях (рваная кромка), заплатка
  const lap = [[10, -176], [60, -190], [118, -196], [140, -150], ...ragged([140, -150], [88, -112], 6, 16, 9).slice(1), [40, -136], [14, -150]];
  smooth(g, lap); g.fillStyle = linGrad(g, 10, -196, 140, -110, [COAT_L, COAT, COAT_D]); g.fill();
  g.save(); smooth(g, lap); g.clip(); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2.2; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(24 + i * 20, -196); g.quadraticCurveTo(30 + i * 20, -160, 20 + i * 22, -118); g.stroke(); } g.restore();
  lite(g, () => { g.strokeStyle = alpha(CY, 0.5); g.lineWidth = 2.4; g.beginPath(); g.moveTo(14, -176); g.quadraticCurveTo(70, -192, 120, -197); g.stroke(); });

  // ближняя рука: рукав тренча, наручный наруч, перчатка
  limb(g, [S1, E1], 27, COAT); limb(g, [E1, handN], 23, mix(COAT, '#000', 0.12));
  lite(g, () => { g.strokeStyle = alpha(CY, 0.4); g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(S1[0] + 2, S1[1] - 12); g.lineTo(E1[0] + 2, E1[1] - 12); g.lineTo(handN[0] - 8, handN[1] - 12); g.stroke(); });
  const fa = Math.atan2(handN[1] - E1[1], handN[0] - E1[0]); g.save(); g.translate(handN[0] - Math.cos(fa) * 16, handN[1] - Math.sin(fa) * 16); g.rotate(fa); rr(g, -7, -13, 16, 26, 5); g.fillStyle = '#1b2030'; g.fill(); g.strokeStyle = alpha(ICE, 0.6); g.lineWidth = 1.5; g.beginPath(); g.moveTo(-6, -4); g.lineTo(8, -4); g.stroke(); g.restore();
  glove(g, handN, tp, false);

  // ГОЛОВА
  const hp = rot([30, -366 + br * 0.8]); g.save(); g.translate(hp[0], hp[1]); g.rotate(rotA * 1.1 + Math.sin(t * 0.7) * 0.014 + (o.tilt || 0)); g.scale(1.3, 1.3); head(g, t, { look, talk, blink: o.blink }); g.restore();
  g.restore();
}

function boot(g, x, y, col) {
  g.save(); g.translate(x, y); smooth(g, [[-20, -26], [16, -28], [38, -10], [64, 0], [66, 16], [-22, 18]]); g.fillStyle = linGrad(g, 0, -28, 0, 18, [shade(col, 0.18), col]); g.fill();
  g.fillStyle = '#6a3a24'; g.fillRect(-22, 12, 88, 5); seg(g, [[-6, -22], [24, -22]], 4, '#0a0c11'); for (let k = 0; k < 3; k++) seg(g, [[2 + k * 8, -16 + k * 3], [8 + k * 8, -10 + k * 3]], 1.8, 'rgba(210,220,240,.4)');
  lite(g, () => { g.strokeStyle = alpha(CY, 0.5); g.lineWidth = 2; g.beginPath(); g.moveTo(-6, -27); g.quadraticCurveTo(34, -28, 60, -2); g.stroke(); }); g.restore();
}
function glove(g, h, tp, far) {
  g.save(); g.translate(h[0] + 2, h[1] + 2); const base = far ? '#07080b' : GLOVE;
  g.beginPath(); g.ellipse(6, 0, 18, 11, 0.1, 0, 7); g.fillStyle = base; g.fill();
  for (let k = 0; k < 4; k++) { const bob = Math.max(0, Math.sin(tp * 1.7 + k * 1.9)) * 4; seg(g, [[14 + k * 2.5, -5 + k * 3.2], [27 + k * 2.5, 2 + k * 3 + bob * 0.35]], 6.5, base); }
  lite(g, () => { g.strokeStyle = alpha(CY, far ? 0.25 : 0.55); g.lineWidth = 1.8; g.beginPath(); g.moveTo(-8, -9); g.quadraticCurveTo(8, -13, 24, -5); g.stroke(); }); g.restore();
}

// ---------- голова лиса в профиль: уши, морда, респиратор с красной линзой ----------
function head(g, t, o) {
  const look = o.look, talk = o.talk;
  // шея, мех
  smooth(g, [[-24, 30], [14, 40], [26, 80], [-30, 84]]); g.fillStyle = linGrad(g, 0, 30, 0, 84, [FUR2, FUR]); g.fill();
  // дальнее ухо
  g.beginPath(); g.moveTo(2, -46); g.quadraticCurveTo(6, -100, 36, -128); g.quadraticCurveTo(48, -92, 44, -46); g.closePath(); g.fillStyle = shade(FUR2, -0.35); g.fill();
  // ближнее ухо: широкое, тёмно-красная внутренность, тёплый контровой свет
  g.beginPath(); g.moveTo(-34, -40); g.quadraticCurveTo(-56, -96, -30, -134); g.quadraticCurveTo(2, -104, 14, -48); g.closePath(); g.fillStyle = linGrad(g, -40, -134, 14, -48, [FUR2, FUR]); g.fill();
  g.beginPath(); g.moveTo(-28, -46); g.quadraticCurveTo(-44, -92, -28, -118); g.quadraticCurveTo(-6, -96, 2, -52); g.closePath(); g.fillStyle = '#4a1c18'; g.fill();
  lite(g, () => { g.strokeStyle = alpha(AM, 0.85); g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(-36, -42); g.quadraticCurveTo(-58, -94, -31, -134); g.stroke(); g.strokeStyle = alpha(CY, 0.7); g.beginPath(); g.moveTo(-30, -134); g.quadraticCurveTo(2, -104, 14, -48); g.stroke(); });
  // череп и вытянутая морда
  const P = [[-32, 30], [-46, 8], [-46, -20], [-32, -42], [-6, -50], [22, -44], [42, -26], [66, -10], [100, 8], [106, 20], [96, 34], [66, 44], [40, 52], [10, 60], [-18, 52]];
  smooth(g, P); g.fillStyle = linGrad(g, -46, 0, 100, 0, [FUR, FUR2, '#222736']); g.fill();
  g.save(); smooth(g, P); g.clip();
  const r = rng(5); g.strokeStyle = 'rgba(150,170,220,.18)'; g.lineWidth = 1.4; for (let i = 0; i < 40; i++) { const px = -40 + r() * 140, py = -40 + r() * 90; g.beginPath(); g.moveTo(px, py); g.lineTo(px + 8, py + 5 + r() * 4); g.stroke(); }
  lite(g, () => { g.fillStyle = linGrad(g, 20, 0, 110, 0, ['rgba(127,232,255,0)', 'rgba(127,232,255,.3)']); g.fillRect(0, -60, 120, 130); });
  g.restore();
  // клочья меха на щеке
  for (let i = 0; i < 5; i++) { const bx = -20 + i * 11; smooth(g, [[bx, 52 - i], [bx + 8, 66 + (i % 2) * 6], [bx + 16, 54 - i]]); g.fillStyle = FUR2; g.fill(); }
  // глаз: янтарный, щель зрачка, блик, тяжёлое веко
  const ex = 40, ey = -12; if (o.blink) seg(g, [[ex - 10, ey], [ex + 10, ey]], 3.5, '#07080b'); else { g.beginPath(); g.ellipse(ex, ey, 11, 7, -0.15, 0, 7); g.fillStyle = '#ffb25a'; g.fill(); g.fillStyle = '#e0701a'; g.beginPath(); g.ellipse(ex + look[0] * 2, ey + 1, 8, 5.5, -0.15, 0, 7); g.fill(); g.fillStyle = '#05060a'; g.beginPath(); g.ellipse(ex + look[0] * 3, ey + look[1] * 1.5, 2.6, 6, 0, 0, 7); g.fill(); circle(g, ex + 4 + look[0] * 3, ey - 3, 1.8, 'rgba(255,255,255,.95)'); glow(g, ex, ey, 34, AM, 0.3); g.strokeStyle = '#07080b'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(ex - 12, ey - 3); g.quadraticCurveTo(ex, ey - 12, ex + 13, ey - 4); g.stroke(); }
  g.strokeStyle = FUR; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(24, -24); g.quadraticCurveTo(40, -32, 58, -20); g.stroke();
  // РЕСПИРАТОР: чёрный корпус на морде, фильтры, красно-оранжевая линза, шланг, ремни
  const M = [[46, 2], [70, -4], [100, 8], [108, 22], [98, 38], [70, 50], [42, 48], [38, 28]];
  smooth(g, M); g.fillStyle = linGrad(g, 40, 0, 108, 50, ['#2a2f3c', '#12151c', '#0a0c11']); g.fill(); g.strokeStyle = 'rgba(160,190,255,.35)'; g.lineWidth = 1.6; smooth(g, M); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(76 + k * 7, 12); g.lineTo(78 + k * 7, 38); g.stroke(); }
  // фильтр-канистра с красной линзой
  const fx = 62, fy = 34; circle(g, fx, fy, 22, '#0b0d13'); g.strokeStyle = '#3a4150'; g.lineWidth = 3; g.beginPath(); g.arc(fx, fy, 22, 0, 7); g.stroke();
  const lp = 0.8 + 0.2 * Math.sin(t * 2.6); circle(g, fx, fy, 14, alpha(RED, 0.9)); circle(g, fx, fy, 9, '#ffb08a'); glow(g, fx, fy, 130, RED, 0.5 * lp); glow(g, fx, fy, 60, '#ff8a4a', 0.5 * lp);
  g.strokeStyle = 'rgba(80,10,6,.8)'; g.lineWidth = 1.5; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(fx - 12, fy + k * 4); g.lineTo(fx + 12, fy + k * 4); g.stroke(); }
  // шланг к шее и ремень за ухо
  g.strokeStyle = '#161922'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(48, 52); g.bezierCurveTo(30, 90, 10, 100, 6, 130); g.stroke(); g.strokeStyle = 'rgba(160,190,255,.3)'; g.lineWidth = 1.5; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(40 - k * 6, 62 + k * 10, 4, 0, 3); g.stroke(); }
  seg(g, [[40, 12], [-4, -12], [-30, -6]], 4, '#0a0c11');
  // говорит: шланг и маска чуть дрожат, линза вспыхивает
  if (talk > 0.1) glow(g, fx, fy, 90, RED, 0.25 * talk);
  // контур профиля холодным светом экрана, тёплый контровой на лбу
  lite(g, () => { smooth(g, [[22, -44], [42, -26], [66, -10], [100, 8], [108, 22]], false); g.strokeStyle = alpha(CY, 1); g.lineWidth = 3.4; g.stroke(); smooth(g, [[-32, -40], [-6, -50], [22, -44]], false); g.strokeStyle = alpha(AM, 0.65); g.lineWidth = 2.6; g.stroke(); });
}
