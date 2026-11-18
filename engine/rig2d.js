// engine/rig2d.js — the stick-figure character rig (2D canvas).
// Local space: feet on y=0, up is -y, the figure faces +x. Base height ≈ 240 units (s = 1).
// Points: head, sh (neck/shoulder), hip, eF/hF = near elbow/hand, eB/hB = far elbow/hand,
//         kF/fF = near knee/foot, kB/fB = far knee/foot.
import { E, S, clamp, lerp, mixVal, seg, circle, ring, alpha, shade, mix, rr, poly, ease, text, FONTS } from './core.js';

const P = (o) => o;
export const POSES = {
  stand:      P({ head: [3, -208], sh: [0, -174], hip: [0, -100], eF: [9, -137], hF: [13, -101], eB: [-7, -136], hB: [-9, -100], kF: [6, -50], fF: [3, 0], kB: [-6, -50], fB: [-11, 0] }),
  relaxed:    P({ head: [4, -207], sh: [1, -173], hip: [0, -100], eF: [12, -138], hF: [20, -106], eB: [-8, -137], hB: [-14, -104], kF: [8, -50], fF: [10, 0], kB: [-4, -50], fB: [-12, 0] }),
  talk:       P({ head: [5, -208], sh: [1, -174], hip: [0, -100], eF: [22, -132], hF: [42, -146], eB: [-7, -136], hB: [-9, -100], kF: [6, -50], fF: [3, 0], kB: [-6, -50], fB: [-11, 0] }),
  explain:    P({ head: [5, -208], sh: [1, -174], hip: [0, -100], eF: [24, -136], hF: [46, -156], eB: [16, -134], hB: [34, -148], kF: [6, -50], fF: [3, 0], kB: [-6, -50], fB: [-11, 0] }),
  point:      P({ head: [5, -208], sh: [1, -174], hip: [0, -100], eF: [34, -170], hF: [68, -172], eB: [-7, -136], hB: [-9, -100], kF: [6, -50], fF: [6, 0], kB: [-6, -50], fB: [-12, 0] }),
  pointUp:    P({ head: [4, -209], sh: [1, -174], hip: [0, -100], eF: [18, -206], hF: [22, -246], eB: [-7, -136], hB: [-9, -100], kF: [6, -50], fF: [3, 0], kB: [-6, -50], fB: [-11, 0] }),
  wave:       P({ head: [4, -209], sh: [1, -174], hip: [0, -100], eF: [28, -196], hF: [36, -236], eB: [-7, -136], hB: [-9, -100], kF: [6, -50], fF: [3, 0], kB: [-6, -50], fB: [-11, 0] }),
  cheer:      P({ head: [3, -212], sh: [0, -176], hip: [0, -100], eF: [22, -206], hF: [36, -246], eB: [-20, -206], hB: [-32, -246], kF: [10, -50], fF: [16, 0], kB: [-10, -50], fB: [-16, 0] }),
  handsOnHead:P({ head: [3, -208], sh: [0, -174], hip: [0, -100], eF: [32, -196], hF: [12, -230], eB: [-28, -196], hB: [-8, -232], kF: [6, -50], fF: [3, 0], kB: [-6, -50], fB: [-11, 0] }),
  crossArms:  P({ head: [2, -208], sh: [0, -174], hip: [0, -100], eF: [16, -142], hF: [-8, -150], eB: [10, -144], hB: [14, -152], kF: [6, -50], fF: [6, 0], kB: [-6, -50], fB: [-12, 0] }),
  think:      P({ head: [6, -206], sh: [1, -173], hip: [0, -100], eF: [24, -148], hF: [16, -192], eB: [16, -134], hB: [6, -140], kF: [6, -50], fF: [3, 0], kB: [-6, -50], fB: [-11, 0] }),
  shrug:      P({ head: [3, -206], sh: [0, -172], hip: [0, -100], eF: [26, -156], hF: [40, -176], eB: [-24, -156], hB: [-38, -176], kF: [6, -50], fF: [3, 0], kB: [-6, -50], fB: [-11, 0] }),
  holdFront:  P({ head: [5, -207], sh: [1, -173], hip: [0, -100], eF: [22, -140], hF: [36, -152], eB: [16, -142], hB: [30, -154], kF: [6, -50], fF: [3, 0], kB: [-6, -50], fB: [-11, 0] }),
  phone:      P({ head: [6, -204], sh: [1, -172], hip: [0, -100], eF: [20, -138], hF: [28, -166], eB: [-7, -136], hB: [-9, -100], kF: [6, -50], fF: [3, 0], kB: [-6, -50], fB: [-11, 0] }),
  reach:      P({ head: [8, -206], sh: [4, -172], hip: [0, -100], eF: [34, -186], hF: [62, -204], eB: [-6, -136], hB: [-10, -102], kF: [10, -50], fF: [12, 0], kB: [-6, -50], fB: [-18, 0] }),
  sad:        P({ head: [12, -192], sh: [6, -166], hip: [0, -100], eF: [10, -132], hF: [12, -98], eB: [-2, -132], hB: [-2, -98], kF: [6, -50], fF: [3, 0], kB: [-6, -50], fB: [-11, 0] }),
  facepalm:   P({ head: [8, -200], sh: [2, -170], hip: [0, -100], eF: [28, -160], hF: [26, -200], eB: [-7, -136], hB: [-9, -100], kF: [6, -50], fF: [3, 0], kB: [-6, -50], fB: [-11, 0] }),
  ready:      P({ head: [12, -182], sh: [6, -148], hip: [0, -80], eF: [34, -132], hF: [56, -146], eB: [-26, -132], hB: [-46, -146], kF: [26, -44], fF: [22, 0], kB: [-24, -44], fB: [-24, 0] }),
  crouch:     P({ head: [16, -150], sh: [8, -118], hip: [0, -58], eF: [28, -88], hF: [38, -60], eB: [18, -86], hB: [26, -58], kF: [34, -54], fF: [20, 0], kB: [20, -50], fB: [-8, 0] }),
  sit:        P({ head: [4, -180], sh: [1, -146], hip: [0, -72], eF: [16, -110], hF: [38, -84], eB: [10, -110], hB: [30, -84], kF: [44, -74], fF: [46, 0], kB: [40, -72], fB: [38, 0] }),
  sitBack:    P({ head: [-8, -176], sh: [-6, -144], hip: [0, -72], eF: [2, -108], hF: [26, -86], eB: [-14, -110], hB: [-24, -80], kF: [44, -78], fF: [54, -2], kB: [40, -76], fB: [44, 0] }),
  kneel:      P({ head: [10, -168], sh: [5, -134], hip: [0, -62], eF: [24, -100], hF: [38, -76], eB: [-4, -100], hB: [-6, -66], kF: [36, -46], fF: [36, 0], kB: [-6, -4], fB: [-48, 0] }),
  lie:        P({ head: [3, -208], sh: [0, -174], hip: [0, -100], eF: [14, -136], hF: [18, -100], eB: [-12, -138], hB: [-20, -104], kF: [4, -50], fF: [2, 0], kB: [-4, -50], fB: [-6, 0] }), // use with rot: ±Math.PI/2
  dive:       P({ head: [4, -212], sh: [0, -176], hip: [0, -100], eF: [8, -218], hF: [12, -256], eB: [-6, -218], hB: [-4, -254], kF: [8, -52], fF: [10, -2], kB: [-6, -54], fB: [-14, -8] }), // with rot
  kick:       P({ head: [-4, -206], sh: [-6, -172], hip: [0, -100], eF: [8, -140], hF: [24, -124], eB: [-24, -140], hB: [-42, -128], kF: [36, -78], fF: [66, -70], kB: [-4, -50], fB: [-8, 0] }),
  jump:       P({ head: [4, -232], sh: [1, -198], hip: [0, -124], eF: [24, -226], hF: [32, -266], eB: [-18, -226], hB: [-26, -266], kF: [16, -82], fF: [6, -48], kB: [-12, -84], fB: [-22, -50] }),
  catCheer:   P({ head: [3, -212], sh: [0, -176], hip: [0, -100], eF: [40, -190], hF: [66, -240], eB: [-40, -190], hB: [-66, -240], kF: [10, -50], fF: [16, 0], kB: [-10, -50], fB: [-16, 0] }),
  fall:       P({ head: [-10, -196], sh: [-8, -164], hip: [0, -100], eF: [24, -196], hF: [44, -222], eB: [-34, -186], hB: [-58, -204], kF: [24, -58], fF: [44, -28], kB: [-10, -54], fB: [-6, -8] }),
};

// ---------- pose helpers ----------
export const pose = (name) => POSES[name] || POSES.stand;
export const blendPose = (a, b, k) => mixVal(typeof a === 'string' ? pose(a) : a, typeof b === 'string' ? pose(b) : b, ease.inOut(k));
// posesAt(t, [[0,'stand'],[1.2,'talk'],[3,'point']], 0.35) -> holds each pose, blends over `blend` s
export function posesAt(t, keys, blend = 0.35) {
  let cur = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [ti, pi] = keys[i];
    if (t < ti) break;
    const k = clamp((t - ti) / blend); cur = k >= 1 ? pi : blendPose(cur, pi, k);
    if (k < 1) return cur;
  }
  return typeof cur === 'string' ? pose(cur) : cur;
}
// small idle life: breathing + sway, applied on top of any pose
export function breathe(p, t, amt = 1, seed = 0) {
  const b = Math.sin(t * 2.1 + seed) * 1.6 * amt, s = Math.sin(t * 0.9 + seed * 2) * 1.2 * amt;
  const q = { ...p }; for (const k of ['head', 'sh', 'eF', 'hF', 'eB', 'hB']) q[k] = [p[k][0] + s * (k === 'head' ? 1.2 : 0.6), p[k][1] + b]; return q;
}
function ik(a, b, L1, L2, dir = 1) {
  const dx = b[0] - a[0], dy = b[1] - a[1]; let d = Math.hypot(dx, dy); d = Math.min(d, L1 + L2 - 0.01);
  const ang = Math.atan2(dy, dx) - dir * Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  return [a[0] + Math.cos(ang) * L1, a[1] + Math.sin(ang) * L1];
}
// walk / run cycles. phase advances ~ 2π per step pair: phase = t * speed * 2π
export function walkPose(phase, o = {}) {
  const { stride = 26, lift = 12, bob = 3, arm = 16, lean = 2, run = false } = o;
  const st = run ? 46 : stride, li = run ? 34 : lift, bb = run ? 7 : bob, ar = run ? 30 : arm, le = run ? 14 : lean;
  const hipY = -100 + (run ? 6 : 0) - bb * (1 - Math.abs(Math.sin(phase))) + bb * 0.5;
  const hip = [0, hipY], sh = [le, hipY - 74], head = [le + 4, hipY - 108];
  const foot = (ph) => [st * Math.sin(ph), -li * Math.max(0, Math.cos(ph))];
  const fF = foot(phase), fB = foot(phase + Math.PI);
  const kF = ik(hip, fF, 52, 52, 1), kB = ik(hip, fB, 52, 52, 1);
  const hand = (ph) => run ? [le + ar * Math.sin(ph) * 0.9 + 6, hipY - 46 - Math.cos(ph) * 10] : [le * 0.5 - ar * Math.sin(ph) + 4, hipY - 2];
  const hF = hand(phase + Math.PI), hB = hand(phase);
  const elbow = (h) => run ? [lerp(sh[0], h[0], 0.5) - 14, lerp(sh[1], h[1], 0.5) + 6] : [lerp(sh[0], h[0], 0.5) - 3, sh[1] + 38];
  return { head, sh, hip, eF: elbow(hF), hF, eB: elbow(hB), hB, kF, fF, kB, fB };
}

// ---------- faces ----------
export const EXPR = {
  neutral: { eyes: 'dot', brows: null, mouth: 'smallSmile' }, happy: { eyes: 'happy', brows: null, mouth: 'grin' }, joy: { eyes: 'happy', brows: 'raised', mouth: 'grin' },
  smile: { eyes: 'dot', brows: null, mouth: 'smile' }, surprised: { eyes: 'ring', brows: 'raised', mouth: 'o' }, shocked: { eyes: 'wide', brows: 'raised', mouth: 'oBig' },
  scared: { eyes: 'ring', brows: 'worried', mouth: 'wavy' }, worried: { eyes: 'dot', brows: 'worried', mouth: 'wavy' }, nervous: { eyes: 'dot', brows: 'worried', mouth: 'flat', sweat: true },
  angry: { eyes: 'dot', brows: 'angry', mouth: 'flat' }, determined: { eyes: 'dot', brows: 'angry', mouth: 'smallFlat' }, sad: { eyes: 'dot', brows: 'worried', mouth: 'frown' },
  cry: { eyes: 'closed', brows: 'worried', mouth: 'frown', tears: true }, smirk: { eyes: 'dot', brows: null, mouth: 'smirk' }, sleepy: { eyes: 'closed', brows: null, mouth: 'flat' },
  thinking: { eyes: 'dot', brows: 'raised', mouth: 'smallFlat', look: [0.5, -0.6] }, confused: { eyes: 'dot', brows: 'confused', mouth: 'wavy' }, awe: { eyes: 'wide', brows: 'raised', mouth: 'o' },
};
// face(g, headX, headY, r, {expr, talk, blink, look:[x,y], front, color, facing})  — also used for giant close-ups
export function face(g, hx, hy, r, o = {}) {
  const ex = { ...(EXPR[o.expr] || EXPR.neutral), ...(o.override || {}) };
  const col = o.color || S().feature, ink = S().ink;
  const fx = hx + (o.front ? 0 : r * 0.34), fy = hy - r * 0.08;
  const look = o.look || ex.look || [0, 0];
  const eyeX = o.front ? [fx - r * 0.34, fx + r * 0.34] : [fx - r * 0.26, fx + r * 0.32];
  const ey = fy - r * 0.08;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  eyeX.forEach((x, i) => {
    const s = o.front ? 1 : i === 0 ? 0.88 : 1;
    if (o.blink || ex.eyes === 'closed') { seg(g, [[x - r * 0.12 * s, ey], [x + r * 0.12 * s, ey]], r * 0.08, col); return; }
    switch (ex.eyes) {
      case 'happy': g.strokeStyle = col; g.lineWidth = r * 0.09; g.beginPath(); g.arc(x, ey + r * 0.05, r * 0.13 * s, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); break;
      case 'ring': ring(g, x, ey, r * 0.2 * s, r * 0.085, col); circle(g, x + look[0] * r * 0.06, ey + look[1] * r * 0.06, r * 0.075 * s, col); break;
      case 'wide': circle(g, x, ey, r * 0.2 * s, col); circle(g, x + look[0] * r * 0.08, ey + look[1] * r * 0.08, r * 0.085 * s, ink); break;
      default: circle(g, x + look[0] * r * 0.05, ey + look[1] * r * 0.05, r * 0.125 * s, col);
    }
  });
  const by = ey - r * 0.3, bw = r * 0.15;
  const brow = (x, a) => seg(g, [[x - bw, by + a], [x + bw, by - a]], r * 0.075, col);
  if (ex.brows === 'worried') { brow(eyeX[0], -r * 0.06); brow(eyeX[1], r * 0.06); }
  if (ex.brows === 'angry') { brow(eyeX[0], r * 0.08); brow(eyeX[1], -r * 0.08); }
  if (ex.brows === 'raised') eyeX.forEach(x => { g.strokeStyle = col; g.lineWidth = r * 0.07; g.beginPath(); g.arc(x, by + r * 0.12, r * 0.15, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); });
  if (ex.brows === 'confused') { brow(eyeX[0], r * 0.07); g.strokeStyle = col; g.lineWidth = r * 0.07; g.beginPath(); g.arc(eyeX[1], by + r * 0.08, r * 0.15, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); }
  const mx = fx + (o.front ? 0 : r * 0.04), my = fy + r * 0.42;
  const talk = o.talk || 0;
  if (talk > 0.05) { g.fillStyle = col; g.beginPath(); g.ellipse(mx, my, r * 0.16, r * (0.05 + 0.2 * talk), 0, 0, Math.PI * 2); g.fill(); }
  else switch (ex.mouth) {
    case 'grin': g.fillStyle = col; g.beginPath(); g.moveTo(mx - r * 0.3, my - r * 0.06); g.quadraticCurveTo(mx, my + r * 0.42, mx + r * 0.3, my - r * 0.06); g.closePath(); g.fill(); break;
    case 'smile': g.strokeStyle = col; g.lineWidth = r * 0.09; g.beginPath(); g.arc(mx, my - r * 0.2, r * 0.27, 0.35, Math.PI - 0.35); g.stroke(); break;
    case 'smallSmile': g.strokeStyle = col; g.lineWidth = r * 0.085; g.beginPath(); g.arc(mx, my - r * 0.14, r * 0.18, 0.4, Math.PI - 0.4); g.stroke(); break;
    case 'o': g.fillStyle = col; g.beginPath(); g.ellipse(mx, my, r * 0.11, r * 0.15, 0, 0, Math.PI * 2); g.fill(); break;
    case 'oBig': ring(g, mx, my + r * 0.04, r * 0.15, r * 0.08, col); break;
    case 'flat': seg(g, [[mx - r * 0.2, my], [mx + r * 0.2, my]], r * 0.085, col); break;
    case 'smallFlat': seg(g, [[mx - r * 0.12, my], [mx + r * 0.12, my]], r * 0.085, col); break;
    case 'frown': g.strokeStyle = col; g.lineWidth = r * 0.085; g.beginPath(); g.arc(mx, my + r * 0.2, r * 0.2, Math.PI + 0.5, Math.PI * 2 - 0.5); g.stroke(); break;
    case 'smirk': g.strokeStyle = col; g.lineWidth = r * 0.085; g.beginPath(); g.moveTo(mx - r * 0.16, my); g.quadraticCurveTo(mx + r * 0.05, my + r * 0.06, mx + r * 0.22, my - r * 0.1); g.stroke(); break;
    case 'wavy': { g.strokeStyle = col; g.lineWidth = r * 0.085; g.beginPath(); for (let i = 0; i <= 16; i++) { const u = i / 16; const x = mx - r * 0.24 + u * r * 0.48, y = my + Math.sin(u * Math.PI * 2) * r * 0.06; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); break; }
  }
  if (ex.tears) { g.fillStyle = '#8fd0ff'; for (const x of eyeX) { g.beginPath(); g.ellipse(x, ey + r * 0.3, r * 0.05, r * 0.1, 0, 0, Math.PI * 2); g.fill(); } }
  if (ex.sweat) { g.fillStyle = '#9fd8ff'; g.beginPath(); g.ellipse(hx - r * 0.6, hy - r * 0.45, r * 0.08, r * 0.13, 0, 0, Math.PI * 2); g.fill(); }
  g.restore();
}

// ---------- outfits ----------
// outfit = { top: 'hoodie'|'labcoat'|'trench'|'jersey'|'tshirt'|'suit'|'dress'|'tracksuit'|'none', color, color2,
//            legs: colour (trousers) | null, head: 'cap'|'capBack'|'beanie'|'fedora'|'headband'|'visor'|'hood'|'ponytail'|'bun'|'curly'|'spiky'|'none',
//            headColor, face: 'glasses'|'sunglasses'|null, gloves: colour|null, number: '1', kid: bool }
function drawHeadwear(g, o, hx, hy, r, pass) {
  const c = o.headColor || '#f2c21a', dark = shade(c, -0.25), hi = shade(c, 0.35);
  const sil = pass === 'sil';
  const fill = (col) => (sil ? o._sil : col);
  switch (o.head) {
    case 'cap': case 'capBack': {
      const back = o.head === 'capBack' ? -1 : 1;
      g.fillStyle = fill(c); g.beginPath(); g.ellipse(hx - 1, hy - r * 0.32, r * 1.04, r * 0.82, 0, Math.PI, Math.PI * 2); g.fill();
      seg(g, [[hx + back * r * 0.25, hy - r * 0.34], [hx + back * r * 1.55, hy - r * 0.26]], r * 0.26, fill(dark));
      if (!sil) { g.strokeStyle = alpha(hi, 0.8); g.lineWidth = r * 0.08; g.beginPath(); g.ellipse(hx - r * 0.1, hy - r * 0.5, r * 0.6, r * 0.42, 0, Math.PI * 1.15, Math.PI * 1.55); g.stroke(); }
      break; }
    case 'visor': seg(g, [[hx - r * 0.95, hy - r * 0.42], [hx + r * 0.9, hy - r * 0.42]], r * 0.22, fill(c)); seg(g, [[hx + r * 0.3, hy - r * 0.4], [hx + r * 1.5, hy - r * 0.3]], r * 0.22, fill(dark)); break;
    case 'beanie': {
      g.fillStyle = fill(c); g.beginPath(); g.ellipse(hx - 1, hy - r * 0.18, r * 1.06, r * 1.0, 0, Math.PI, Math.PI * 2); g.fill();
      rr(g, hx - r * 1.08, hy - r * 0.34, r * 2.16, r * 0.34, r * 0.14); g.fillStyle = fill(dark); g.fill();
      circle(g, hx - r * 0.1, hy - r * 1.2, r * 0.3, fill(hi)); break; }
    case 'fedora': {
      g.fillStyle = fill(c); g.beginPath(); g.ellipse(hx, hy - r * 0.55, r * 1.8, r * 0.3, 0, 0, Math.PI * 2); g.fill();
      rr(g, hx - r * 0.78, hy - r * 1.45, r * 1.56, r * 0.95, r * 0.25); g.fill();
      if (!sil) { g.fillStyle = dark; g.fillRect(hx - r * 0.78, hy - r * 0.78, r * 1.56, r * 0.2); g.strokeStyle = alpha(hi, 0.6); g.lineWidth = r * 0.06; g.beginPath(); g.ellipse(hx, hy - r * 0.55, r * 1.8, r * 0.3, 0, Math.PI * 1.05, Math.PI * 1.6); g.stroke(); }
      break; }
    case 'headband': {
      g.save(); g.beginPath(); g.arc(hx, hy, r * 1.04, 0, Math.PI * 2); g.clip(); g.fillStyle = fill(c); g.fillRect(hx - r * 1.2, hy - r * 0.62, r * 2.4, r * 0.3); g.restore();
      seg(g, [[hx - r * 0.95, hy - r * 0.48], [hx - r * 1.5, hy - r * 0.2], [hx - r * 1.7, hy + r * 0.1]], r * 0.16, fill(c)); break; }
    case 'ponytail': { g.strokeStyle = fill(o._ink); g.lineWidth = r * 0.42; g.lineCap = 'round'; g.beginPath(); g.moveTo(hx - r * 0.7, hy - r * 0.55); g.quadraticCurveTo(hx - r * 1.7, hy - r * 0.4, hx - r * 1.45, hy + r * 0.75); g.stroke();
      if (o.headColor && !sil) seg(g, [[hx - r * 0.9, hy - r * 0.75], [hx - r * 0.8, hy - r * 0.35]], r * 0.22, o.headColor); break; }
    case 'bun': circle(g, hx - r * 0.55, hy - r * 0.95, r * 0.45, fill(o._ink)); break;
    case 'curly': for (let i = 0; i < 7; i++) { const a = Math.PI * (1.05 + i * 0.13); circle(g, hx + Math.cos(a) * r * 0.92, hy + Math.sin(a) * r * 0.92, r * 0.34, fill(o._ink)); } break;
    case 'spiky': g.fillStyle = fill(o._ink); g.beginPath(); for (let i = 0; i <= 6; i++) { const a = Math.PI * (1.05 + i * 0.15); const rr2 = i % 2 ? r * 1.45 : r * 0.95; g.lineTo(hx + Math.cos(a) * rr2, hy + Math.sin(a) * rr2); } g.closePath(); g.fill(); break;
  }
}
function torsoWear(g, o, p, pass) {
  const sil = pass === 'sil', c = sil ? o._sil : o.color || '#d64a33', d = sil ? o._sil : shade(o.color || '#d64a33', -0.22);
  const [sx, sy] = p.sh, [hx, hy] = p.hip;
  switch (o.top) {
    case 'hoodie': case 'tracksuit': case 'jersey': case 'tshirt': case 'suit': case 'dress': {
      const col = o.top === 'suit' ? (sil ? o._sil : o.color || '#2a2833') : c;
      const top = sy - 7, bot = hy + (o.top === 'jersey' || o.top === 'tshirt' ? 4 : 12);
      g.fillStyle = col; g.beginPath(); g.moveTo(sx - 15, top + 6); g.quadraticCurveTo(sx, top - 4, sx + 15, top + 6); g.lineTo(hx + 15, bot); g.lineTo(hx - 15, bot); g.closePath(); g.fill();
      if (o.top === 'dress') poly(g, [[hx - 14, hy - 8], [hx + 14, hy - 8], [hx + 34, hy + 50], [hx - 34, hy + 50]], col);
      if (!sil && o.label) {}
      if (!sil && o.top === 'hoodie') { g.fillStyle = d; g.fillRect(hx - 15, bot - 7, 30, 7); seg(g, [[sx + 6, sy - 2], [sx + 7, sy + 18]], 2, shade(c, 0.4)); }
      if (!sil && o.label) { g.save(); g.translate((sx + hx) / 2 + 2, (sy + hy) / 2 - 4); g.scale(o._f || 1, 1); text(g, o.label, 0, 0, { size: 10, color: '#fff', font: FONTS.ui, weight: 900 }); g.restore(); }
      if (!sil && o.top === 'suit') { poly(g, [[sx - 1, sy - 4], [sx + 4, sy - 4], [sx + 5, sy + 40], [sx + 1, sy + 46]], o.color2 || '#c0392b'); }
      if (!sil && o.top === 'jersey' && o.number) { g.fillStyle = o.color2 || '#fff'; g.font = '700 24px Nunito'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.number, (sx + hx) / 2 + 2, (sy + hy) / 2); }
      if (!sil && o.top === 'tracksuit') seg(g, [[sx + 12, sy + 2], [hx + 12, hy]], 3, o.color2 || '#ffffff');
      break; }
    case 'bomber': {
      const top = sy - 7, bot = hy + 10, cr = o.color2 || '#f1e6cf', dk = sil ? o._sil : shade(o.color || '#19b6a6', -0.25);
      g.fillStyle = c; g.beginPath(); g.moveTo(sx - 17, top + 7); g.quadraticCurveTo(sx, top - 5, sx + 17, top + 7); g.lineTo(hx + 18, bot); g.lineTo(hx - 18, bot); g.closePath(); g.fill();
      if (!sil) {
        g.fillStyle = dk; g.beginPath(); g.moveTo(sx - 15, top + 16); g.lineTo(sx - 7, bot - 4); g.lineTo(hx - 17, bot - 2); g.lineTo(hx - 18, bot - 14); g.closePath(); g.fill();
        g.fillStyle = cr; g.fillRect(hx - 18, bot - 7, 36, 8); for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(hx - 15 + i * 6, bot - 7, 1.4, 8); }
        seg(g, [[sx + 5, sy - 3], [hx + 4, bot - 7]], 2, cr); circle(g, sx + 5, sy + 4, 2.4, '#ffb347');
        g.fillStyle = cr; g.beginPath(); g.ellipse(sx, sy - 5, 12, 6, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(sx, sy - 4, 8, 3.5, 0, 0, Math.PI * 2); g.fill();
        circle(g, sx - 6, sy + 16, 6.5, '#ff7a2e'); g.save(); g.translate(sx - 6, sy + 16.4); g.scale(o._f || 1, 1); text(g, '24', 0, 0, { size: 7.4, color: '#10161e', font: FONTS.ui, weight: 900 }); g.restore();
      }
      break; }
    case 'labcoat': case 'trench': {
      const col = sil ? o._sil : o.top === 'labcoat' ? '#ebe7f0' : o.color || '#2c2833';
      g.fillStyle = col; g.beginPath(); g.moveTo(sx - 15, sy - 5); g.lineTo(sx + 15, sy - 5); g.lineTo(hx + 25, hy + 44); g.lineTo(hx - 23, hy + 44); g.closePath(); g.fill();
      if (!sil) { seg(g, [[sx + 3, sy], [hx + 4, hy + 42]], 2, o.top === 'labcoat' ? '#a9a2b5' : shade(col, 0.25)); seg(g, [[sx - 6, sy - 3], [sx + 2, sy + 22], [sx + 10, sy - 3]], 2.2, o.top === 'labcoat' ? '#c9c2d4' : shade(col, 0.3));
        if (o.top === 'trench') g.fillStyle = shade(col, -0.3), g.fillRect(hx - 18, hy - 6, 38, 6); }
      break; }
  }
}

function garbWear(g, o, p) {
  const [sx, sy] = p.sh, [hx, hy] = p.hip, k = o.garb, ln = '#4a2410';
  const body = (c, hem = 18, w = 17) => { g.fillStyle = c; g.beginPath(); g.moveTo(sx - w + 1, sy - 3); g.quadraticCurveTo(sx, sy - 10, sx + w - 1, sy - 3); g.lineTo(hx + w, hy + hem); g.lineTo(hx - w, hy + hem); g.closePath(); g.fill(); };
  if (k === 'fur') { g.fillStyle = '#8a5a2b'; g.beginPath(); g.moveTo(sx - 16, sy - 4); g.lineTo(sx + 16, sy - 4); g.lineTo(hx + 19, hy + 22); for (let i = 0; i < 6; i++) g.lineTo(hx + 19 - i * 7.6 - 3.8, hy + 34 - (i % 2 ? 0 : 0)), g.lineTo(hx + 19 - i * 7.6 - 7.6, hy + 20); g.lineTo(hx - 19, hy + 22); g.closePath(); g.fill(); g.strokeStyle = ln; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#5e3a18'; for (const [dx, dy] of [[-8, 6], [6, 18], [-4, 28], [9, 2]]) { g.beginPath(); g.ellipse(sx + dx, sy + dy, 3.5, 2.4, 0.4, 0, 7); g.fill(); }
    g.fillStyle = '#f2ead2'; for (let i = 0; i < 3; i++) circle(g, sx - 9 + i * 9, sy + 1 + (i % 2) * 3, 3.2, '#f2ead2'); }
  if (k === 'egypt') { g.fillStyle = '#f4efe2'; g.beginPath(); g.moveTo(hx - 17, hy - 8); g.lineTo(hx + 17, hy - 8); g.lineTo(hx + 25, hy + 34); g.lineTo(hx - 23, hy + 34); g.closePath(); g.fill(); g.strokeStyle = ln; g.lineWidth = 1.8; g.stroke(); seg(g, [[hx - 17, hy - 6], [hx + 17, hy - 6]], 5, '#e6b830');
    g.fillStyle = '#e6b830'; g.beginPath(); g.ellipse(sx, sy + 2, 20, 12, 0, 0, Math.PI); g.fill(); g.strokeStyle = ln; g.lineWidth = 1.8; g.stroke(); g.fillStyle = '#2b9bb5'; for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(sx + i * 7, sy + 7 - Math.abs(i) * 1.2, 2.6, 0, 7); g.fill(); } }
  if (k === 'toga') { body('#f6f1e4', 26, 16); g.strokeStyle = ln; g.lineWidth = 1.8; g.stroke(); g.fillStyle = '#e8dfc8'; g.beginPath(); g.moveTo(sx - 16, sy - 3); g.lineTo(sx + 16, sy + 10); g.lineTo(sx + 16, sy + 22); g.lineTo(sx - 16, sy + 8); g.closePath(); g.fill(); seg(g, [[sx - 16, sy - 3], [hx + 16, hy + 8]], 3.5, '#c9a43a'); seg(g, [[hx - 16, hy + 24], [hx + 16, hy + 24]], 3, '#c9a43a'); }
  if (k === 'tabard') { body('#2f5aa8', 26, 17); g.strokeStyle = ln; g.lineWidth = 1.8; g.stroke(); g.fillStyle = '#f2c21a'; g.beginPath(); g.moveTo(sx - 2, sy + 4); g.lineTo(sx + 9, sy + 4); g.lineTo(sx + 9, sy + 18); g.lineTo(sx + 3, sy + 26); g.lineTo(sx - 2, sy + 18); g.closePath(); g.fill(); seg(g, [[hx - 17, hy - 4], [hx + 17, hy - 4]], 5, '#3a2a1a'); }
  if (k === 'doublet') { body('#7a1f35', 14, 16); g.strokeStyle = ln; g.lineWidth = 1.8; g.stroke(); for (let i = 0; i < 4; i++) circle(g, sx + 3, sy + 8 + i * 11, 2.2, '#e6b830'); seg(g, [[sx - 14, sy - 3], [sx - 6, sy + 5], [sx + 4, sy - 4], [sx + 14, sy + 5], [sx + 16, sy - 3]], 4.5, '#fff4dc'); seg(g, [[hx - 17, hy + 4], [hx + 17, hy + 4]], 4, '#e6b830'); }
  if (k === 'apron') { g.fillStyle = '#f4efe2'; g.beginPath(); g.moveTo(sx - 16, sy - 4); g.lineTo(sx + 16, sy - 4); g.lineTo(hx + 17, hy + 6); g.lineTo(hx - 17, hy + 6); g.closePath(); g.fill(); g.fillStyle = '#7b5a3a'; g.beginPath(); g.moveTo(sx - 11, sy + 4); g.lineTo(sx + 11, sy + 4); g.lineTo(hx + 17, hy + 36); g.lineTo(hx - 17, hy + 36); g.closePath(); g.fill(); g.strokeStyle = ln; g.lineWidth = 1.8; g.stroke(); seg(g, [[sx - 8, sy - 2], [sx - 4, sy + 6]], 3, '#5a3f26'); seg(g, [[sx + 8, sy - 2], [sx + 4, sy + 6]], 3, '#5a3f26'); g.strokeStyle = '#c9a24a'; g.lineWidth = 2.2; g.beginPath(); g.arc(sx, sy + 26, 5, 0, 7); g.stroke(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; seg(g, [[sx + Math.cos(a) * 5, sy + 26 + Math.sin(a) * 5], [sx + Math.cos(a) * 8, sy + 26 + Math.sin(a) * 8]], 2.4, '#c9a24a'); } }
  if (k === 'cyber') { seg(g, [[sx - 10, sy + 6], [hx - 10, hy - 4]], 2.2, '#3fd0f0'); seg(g, [[sx + 12, sy + 6], [hx + 10, hy - 4]], 2.2, '#3fd0f0'); circle(g, sx + 6, sy + 12, 3, '#3fd0f0'); }
}
function sleeve(o) { if (['hoodie', 'tracksuit', 'labcoat', 'trench', 'suit', 'bomber'].includes(o.top)) return 'long'; if (['jersey', 'tshirt'].includes(o.top)) return 'short'; return null; }
function sleeveColor(o, far) { const c = o.top === 'labcoat' ? '#f3f0f6' : o.top === 'trench' ? o.color || '#2c2833' : o.top === 'suit' ? o.color || '#2a2833' : o.color || '#d64a33'; return far ? shade(c, -0.3) : c; }


// ---------- CAT head (Orin) ----------
// outfit.cat = { fur, stripe, muzzle, eye, whisker, beard } ; headwear via outfit.head: 'hardhat' | 'headphones'; outfit.glasses, outfit.goggles
const CAT_EXPR = {
  neutral: { e: 'open', m: 'smile' }, happy: { e: 'arc', m: 'grin' }, joy: { e: 'arc', m: 'grin', b: 'up' }, smile: { e: 'open', m: 'smile' },
  surprised: { e: 'wide', m: 'o', b: 'up' }, shocked: { e: 'wide', m: 'o', b: 'up' }, awe: { e: 'wide', m: 'o', b: 'up' }, scared: { e: 'wide', m: 'wavy', b: 'worried' },
  worried: { e: 'open', m: 'wavy', b: 'worried' }, nervous: { e: 'open', m: 'flat', b: 'worried' }, sad: { e: 'open', m: 'frown', b: 'worried' }, cry: { e: 'closed', m: 'frown', b: 'worried' },
  angry: { e: 'open', m: 'flat', b: 'angry' }, determined: { e: 'open', m: 'smile', b: 'angry' }, smirk: { e: 'half', m: 'smirk' }, sleepy: { e: 'closed', m: 'flat' },
  thinking: { e: 'open', m: 'flat', b: 'up' }, confused: { e: 'open', m: 'wavy', b: 'up' },
};
function catHead(g, o, of, hx, hy, R, sil, silCol) {
  const C = of.cat || {}, fur = C.fur || '#ee8a2c', dk = shade(fur, -0.42), mid = shade(fur, -0.18), pale = C.muzzle || '#fff3df', pink = '#f3a1a8';
  const line = '#4a2410', Wx = R * 1.16, Wy = R * 1.0;
  const F = (c) => (sil ? silCol : c);
  const hat = of.head === 'hardhat';
  // ears
  if (!hat) for (const sd of [-1, 1]) {
    const tip = [hx + sd * R * 0.9, hy - R * 1.62], b1 = [hx + sd * R * 1.12, hy - R * 0.28], b2 = [hx + sd * R * 0.18, hy - R * 0.92];
    g.fillStyle = F(fur); g.beginPath(); g.moveTo(...b1); g.lineTo(...tip); g.lineTo(...b2); g.closePath(); g.fill();
    if (!sil) { g.lineJoin = 'round'; g.strokeStyle = line; g.lineWidth = 2.4; g.stroke(); g.fillStyle = pink; g.beginPath(); g.moveTo(hx + sd * R * 1.0, hy - R * 0.5); g.lineTo(hx + sd * R * 0.88, hy - R * 1.32); g.lineTo(hx + sd * R * 0.4, hy - R * 0.86); g.closePath(); g.fill(); }
  }
  // head + cheek tufts
  g.fillStyle = F(fur); g.beginPath(); g.ellipse(hx, hy, Wx, Wy, 0, 0, Math.PI * 2); g.fill();
  for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(hx + sd * Wx * 0.88, hy + R * 0.05); g.lineTo(hx + sd * (Wx + R * 0.26), hy + R * 0.28); g.lineTo(hx + sd * Wx * 0.82, hy + R * 0.42); g.lineTo(hx + sd * (Wx + R * 0.1), hy + R * 0.58); g.lineTo(hx + sd * Wx * 0.55, hy + R * 0.82); g.closePath(); g.fill(); }
  if (sil) return;
  g.strokeStyle = line; g.lineWidth = 2.6; g.lineJoin = 'round'; g.beginPath(); g.ellipse(hx, hy, Wx, Wy, 0, 0, Math.PI * 2); g.stroke();
  // lower shading + stripes
  g.save(); g.beginPath(); g.ellipse(hx, hy, Wx, Wy, 0, 0, Math.PI * 2); g.clip();
  g.fillStyle = alpha(mid, 0.5); g.beginPath(); g.ellipse(hx, hy + R * 1.0, Wx * 1.1, R * 0.45, 0, 0, Math.PI * 2); g.fill();
  g.restore();
  for (const dx of [-0.32, 0, 0.32]) seg(g, [[hx + dx * R, hy - R * 0.98], [hx + dx * R * 0.9, hy - R * (dx === 0 ? 0.42 : 0.55)]], R * 0.1, dk);
  for (const sd of [-1, 1]) for (const k of [0, 1]) seg(g, [[hx + sd * Wx * 0.98, hy + R * (0.0 + k * 0.28)], [hx + sd * Wx * 0.7, hy + R * (0.06 + k * 0.28)]], R * 0.09, dk);
  // muzzle
  g.fillStyle = pale; g.beginPath(); g.ellipse(hx - R * 0.17, hy + R * 0.42, R * 0.36, R * 0.3, 0, 0, Math.PI * 2); g.ellipse(hx + R * 0.17, hy + R * 0.42, R * 0.36, R * 0.3, 0, 0, Math.PI * 2); g.fill();
  const ex = CAT_EXPR[o.expr] || CAT_EXPR.neutral, look = o.look || [0, 0];
  // eyes
  const eyeY = hy - R * 0.08, eyeX = [hx - R * 0.42, hx + R * 0.42], er = R * 0.27, eyeCol = C.eye || '#1a1008';
  eyeX.forEach((x0) => {
    const x = x0 + look[0] * R * 0.05, y = eyeY + look[1] * R * 0.05;
    if (o.blink || ex.e === 'closed') { g.strokeStyle = line; g.lineWidth = R * 0.08; g.lineCap = 'round'; g.beginPath(); g.arc(x0, eyeY, er * 0.6, 0.15, Math.PI - 0.15); g.stroke(); return; }
    if (ex.e === 'arc') { g.strokeStyle = line; g.lineWidth = R * 0.1; g.lineCap = 'round'; g.beginPath(); g.arc(x0, eyeY + er * 0.35, er * 0.7, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); return; }
    const k = ex.e === 'wide' ? 1.2 : 1;
    g.fillStyle = '#fff8e8'; g.beginPath(); g.ellipse(x0, eyeY, er * 0.95 * k, er * 1.1 * k, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = line; g.lineWidth = 2.2; g.stroke();
    g.fillStyle = C.iris || '#d9a21b'; g.beginPath(); g.ellipse(x, y, er * 0.62 * k, er * 0.82 * k, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = eyeCol; g.beginPath(); g.ellipse(x, y, er * 0.34 * k, er * 0.62 * k, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x - er * 0.18, y - er * 0.28, er * 0.17, 0, Math.PI * 2); g.fill();
    if (ex.e === 'half') { g.fillStyle = fur; g.fillRect(x0 - er * 1.2, eyeY - er * 1.3, er * 2.4, er * 1.3); g.strokeStyle = line; g.lineWidth = 2.6; g.beginPath(); g.moveTo(x0 - er, eyeY - er * 0.02); g.lineTo(x0 + er, eyeY - er * 0.02); g.stroke(); }
  });
  // brows
  if (ex.b) {
    const by = eyeY - er * 1.45;
    eyeX.forEach((x, i) => { const sd = i ? 1 : -1; let a = 0, up = 0;
      if (ex.b === 'worried') a = -sd * R * 0.12; else if (ex.b === 'angry') { a = sd * R * 0.14; } else up = -R * 0.1;
      seg(g, [[x - er * 0.8, by + up + a], [x + er * 0.8, by + up - a]], R * 0.09, dk); });
  }
  // nose + mouth
  const nx = hx, ny = hy + R * 0.3;
  poly(g, [[nx - R * 0.13, ny - R * 0.07], [nx + R * 0.13, ny - R * 0.07], [nx, ny + R * 0.08]], pink);
  g.strokeStyle = line; g.lineWidth = 2; g.lineJoin = 'round'; g.beginPath(); g.moveTo(nx - R * 0.13, ny - R * 0.07); g.lineTo(nx + R * 0.13, ny - R * 0.07); g.lineTo(nx, ny + R * 0.08); g.closePath(); g.stroke();
  const my = ny + R * 0.12, talk = o.talk || 0;
  g.strokeStyle = line; g.lineWidth = R * 0.07; g.lineCap = 'round';
  seg(g, [[nx, ny + R * 0.08], [nx, my]], R * 0.06, line);
  if (talk > 0.05) { const h = R * (0.08 + 0.32 * talk); g.fillStyle = '#5a1c1c'; g.beginPath(); g.ellipse(nx, my + h * 0.55, R * 0.24, h, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = line; g.lineWidth = 2; g.stroke(); g.fillStyle = pink; g.beginPath(); g.ellipse(nx, my + h * 1.25, R * 0.13, h * 0.4, 0, Math.PI, Math.PI * 2); g.fill(); }
  else switch (ex.m) {
    case 'grin': g.fillStyle = '#5a1c1c'; g.beginPath(); g.moveTo(nx - R * 0.34, my - R * 0.02); g.quadraticCurveTo(nx, my + R * 0.5, nx + R * 0.34, my - R * 0.02); g.closePath(); g.fill(); g.strokeStyle = line; g.lineWidth = 2; g.stroke(); g.fillStyle = pink; g.beginPath(); g.ellipse(nx, my + R * 0.27, R * 0.14, R * 0.08, 0, 0, Math.PI * 2); g.fill(); break;
    case 'o': g.fillStyle = '#5a1c1c'; g.beginPath(); g.ellipse(nx, my + R * 0.12, R * 0.12, R * 0.17, 0, 0, Math.PI * 2); g.fill(); break;
    case 'flat': seg(g, [[nx - R * 0.2, my + R * 0.04], [nx + R * 0.2, my + R * 0.04]], R * 0.07, line); break;
    case 'frown': g.beginPath(); g.arc(nx - R * 0.16, my + R * 0.2, R * 0.16, Math.PI * 1.15, Math.PI * 1.9); g.arc(nx + R * 0.16, my + R * 0.2, R * 0.16, Math.PI * 1.1, Math.PI * 1.85); g.stroke(); break;
    case 'smirk': g.beginPath(); g.moveTo(nx - R * 0.2, my + R * 0.08); g.quadraticCurveTo(nx + R * 0.05, my + R * 0.16, nx + R * 0.3, my - R * 0.06); g.stroke(); break;
    case 'wavy': g.beginPath(); for (let i = 0; i <= 12; i++) { const u = i / 12; const x = nx - R * 0.26 + u * R * 0.52, y = my + R * 0.06 + Math.sin(u * Math.PI * 2) * R * 0.05; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); break;
    default: g.beginPath(); g.arc(nx - R * 0.15, my, R * 0.15, 0.1, Math.PI * 0.85); g.arc(nx + R * 0.15, my, R * 0.15, Math.PI * 0.15, Math.PI * 0.9); g.stroke();
  }
  if (C.beard) { g.fillStyle = C.beard; g.beginPath(); g.moveTo(nx - R * 0.5, my - R * 0.02); g.quadraticCurveTo(nx, my + R * 0.3, nx + R * 0.5, my - R * 0.02); g.quadraticCurveTo(nx + R * 0.35, my + R * 0.75, nx, my + R * 0.95); g.quadraticCurveTo(nx - R * 0.35, my + R * 0.75, nx - R * 0.5, my - R * 0.02); g.fill(); }
  // whiskers
  g.strokeStyle = C.whisker || '#fff6e6'; g.lineWidth = 1.8; g.lineCap = 'round';
  for (const sd of [-1, 1]) for (const k of [-1, 0, 1]) { g.beginPath(); g.moveTo(hx + sd * R * 0.5, hy + R * (0.38 + k * 0.06)); g.quadraticCurveTo(hx + sd * R * 1.1, hy + R * (0.3 + k * 0.17), hx + sd * R * 1.55, hy + R * (0.34 + k * 0.3)); g.stroke(); }
  // accessories
  if (of.glasses) { g.strokeStyle = '#3a2a1a'; g.lineWidth = R * 0.07; for (const x of eyeX) { g.beginPath(); g.arc(x, eyeY, er * 1.45, 0, Math.PI * 2); g.stroke(); g.fillStyle = 'rgba(200,230,255,.18)'; g.fill(); } seg(g, [[eyeX[0] + er * 1.4, eyeY - er * 0.2], [eyeX[1] - er * 1.4, eyeY - er * 0.2]], R * 0.06, '#3a2a1a'); }
  if (of.goggles) { g.fillStyle = '#2a323a'; rr(g, hx - R * 1.12, eyeY - er * 1.5, R * 2.24, er * 3.0, er); g.globalAlpha *= 0.0; g.fill(); g.globalAlpha = 1; for (const x of eyeX) { g.fillStyle = 'rgba(150,215,240,.5)'; g.beginPath(); g.arc(x, eyeY, er * 1.55, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#2f3b44'; g.lineWidth = R * 0.12; g.stroke(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(x - er * 0.5, eyeY - er * 0.6, er * 0.35, er * 0.2, -0.6, 0, Math.PI * 2); g.fill(); } seg(g, [[eyeX[0] + er * 1.5, eyeY], [eyeX[1] - er * 1.5, eyeY]], R * 0.1, '#2f3b44'); seg(g, [[eyeX[0] - er * 1.5, eyeY], [hx - R * 1.14, eyeY - R * 0.05]], R * 0.1, '#2f3b44'); seg(g, [[eyeX[1] + er * 1.5, eyeY], [hx + R * 1.14, eyeY - R * 0.05]], R * 0.1, '#2f3b44'); }
  if (of.head === 'nemes') { const bl = '#2b5fb5', go = '#e6b830';
    for (const sd of [-1, 1]) { g.fillStyle = bl; g.beginPath(); g.moveTo(hx + sd * R * 0.95, hy - R * 0.35); g.lineTo(hx + sd * R * 1.5, hy - R * 0.1); g.lineTo(hx + sd * R * 1.35, hy + R * 1.55); g.lineTo(hx + sd * R * 0.9, hy + R * 1.35); g.closePath(); g.fill(); g.strokeStyle = line; g.lineWidth = 2.2; g.stroke();
      g.strokeStyle = go; g.lineWidth = R * 0.07; for (let k = 0; k < 4; k++) { const yy = hy + R * (0.1 + k * 0.32); g.beginPath(); g.moveTo(hx + sd * R * 0.96, yy); g.lineTo(hx + sd * R * 1.42, yy + R * 0.04); g.stroke(); } }
    g.fillStyle = bl; g.beginPath(); g.moveTo(hx - R * 1.2, hy - R * 0.3); g.quadraticCurveTo(hx - R * 1.35, hy - R * 1.55, hx, hy - R * 1.5); g.quadraticCurveTo(hx + R * 1.35, hy - R * 1.55, hx + R * 1.2, hy - R * 0.3); g.quadraticCurveTo(hx, hy - R * 0.62, hx - R * 1.2, hy - R * 0.3); g.fill(); g.strokeStyle = line; g.lineWidth = 2.4; g.stroke();
    g.strokeStyle = go; g.lineWidth = R * 0.07; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(hx + k * R * 0.28, hy - R * 1.48); g.lineTo(hx + k * R * 0.34, hy - R * 0.55); g.stroke(); }
    seg(g, [[hx - R * 1.18, hy - R * 0.36], [hx, hy - R * 0.62], [hx + R * 1.18, hy - R * 0.36]], R * 0.14, go); circle(g, hx, hy - R * 0.74, R * 0.12, '#d64a33'); }
  if (of.head === 'laurel') { for (let i = 0; i < 9; i++) { const a = Math.PI * (1.12 + i * 0.095); for (const sd of [0]) { g.save(); g.translate(hx + Math.cos(a) * R * 1.08, hy - R * 0.12 + Math.sin(a) * R * 0.98); g.rotate(a + Math.PI / 2 + 0.3); g.fillStyle = i % 2 ? '#4f9a3a' : '#3f8530'; g.beginPath(); g.ellipse(0, 0, R * 0.13, R * 0.3, 0, 0, Math.PI * 2); g.fill(); g.restore(); } } }
  if (of.head === 'helm') { const st = '#9aa3ad', sd2 = '#6f7882';
    g.strokeStyle = st; g.lineWidth = R * 0.2; g.beginPath(); g.ellipse(hx, hy + R * 0.05, Wx * 0.98, Wy * 0.97, 0, Math.PI * 0.62, Math.PI * 2.38); g.stroke();
    g.fillStyle = st; g.beginPath(); g.moveTo(hx - R * 1.22, hy - R * 0.28); g.quadraticCurveTo(hx - R * 1.2, hy - R * 1.28, hx, hy - R * 1.3); g.quadraticCurveTo(hx + R * 1.2, hy - R * 1.28, hx + R * 1.22, hy - R * 0.28); g.lineTo(hx + R * 1.0, hy - R * 0.5); g.lineTo(hx - R * 1.0, hy - R * 0.5); g.closePath(); g.fill(); g.strokeStyle = line; g.lineWidth = 2.4; g.stroke();
    g.fillStyle = sd2; rr(g, hx - R * 0.09, hy - R * 1.3, R * 0.18, R * 1.0, 3); g.fill(); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = R * 0.06; g.beginPath(); g.arc(hx - R * 0.45, hy - R * 0.7, R * 0.55, Math.PI * 1.1, Math.PI * 1.45); g.stroke(); }
  if (of.head === 'beret') { const bc = '#7a1f35';
    g.fillStyle = bc; g.beginPath(); g.ellipse(hx + R * 0.12, hy - R * 0.98, R * 1.12, R * 0.42, -0.14, 0, Math.PI * 2); g.fill(); g.strokeStyle = line; g.lineWidth = 2.4; g.stroke();
    g.fillStyle = shade(bc, -0.2); g.beginPath(); g.ellipse(hx + R * 0.1, hy - R * 0.7, R * 1.0, R * 0.16, -0.1, 0, Math.PI); g.fill();
    g.strokeStyle = '#fff4dc'; g.lineWidth = R * 0.1; g.lineCap = 'round'; g.beginPath(); g.moveTo(hx + R * 0.7, hy - R * 1.0); g.bezierCurveTo(hx + R * 1.6, hy - R * 1.6, hx + R * 1.9, hy - R * 1.1, hx + R * 1.5, hy - R * 0.5); g.stroke(); }
  if (of.head === 'flatcap') { const bc = '#7b5a3a';
    g.fillStyle = bc; g.beginPath(); g.ellipse(hx, hy - R * 0.85, R * 1.1, R * 0.5, 0, Math.PI, Math.PI * 2); g.fill(); g.fillRect(hx - R * 1.1, hy - R * 0.86, R * 2.2, R * 0.16); g.strokeStyle = line; g.lineWidth = 2.4; g.beginPath(); g.ellipse(hx, hy - R * 0.85, R * 1.1, R * 0.5, 0, Math.PI, Math.PI * 2); g.stroke();
    seg(g, [[hx + R * 0.3, hy - R * 0.76], [hx + R * 1.3, hy - R * 0.7]], R * 0.17, shade(bc, -0.25));
    for (const x of [hx - R * 0.35, hx + R * 0.25]) { g.fillStyle = 'rgba(160,215,235,.7)'; g.beginPath(); g.arc(x, hy - R * 1.08, R * 0.26, 0, 7); g.fill(); g.strokeStyle = '#6b4a2a'; g.lineWidth = R * 0.1; g.stroke(); } }
  if (of.head === 'techvisor') { g.fillStyle = 'rgba(110,225,255,.38)'; rr(g, hx - R * 1.12, eyeY - er * 1.2, R * 2.24, er * 2.4, er * 0.9); g.fill(); g.strokeStyle = '#3fd0f0'; g.lineWidth = R * 0.08; g.stroke(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(hx - R * 0.5, eyeY - er * 0.7, er * 0.9, er * 0.12, -0.1, 0, 7); g.fill(); seg(g, [[hx - R * 1.12, eyeY], [hx - R * 1.3, eyeY + R * 0.1]], R * 0.1, '#2a2f38'); seg(g, [[hx + R * 1.12, eyeY], [hx + R * 1.3, eyeY + R * 0.1]], R * 0.1, '#2a2f38'); }
  if (of.head === 'hardhat') { const hc = of.headColor || '#f08a24', hd = shade(hc, -0.25);
    g.fillStyle = hc; g.beginPath(); g.moveTo(hx - R * 1.22, hy - R * 0.5); g.quadraticCurveTo(hx - R * 1.2, hy - R * 1.6, hx, hy - R * 1.62); g.quadraticCurveTo(hx + R * 1.2, hy - R * 1.6, hx + R * 1.22, hy - R * 0.5); g.closePath(); g.fill();
    g.strokeStyle = line; g.lineWidth = 2.4; g.stroke(); g.fillStyle = hd; rr(g, hx - R * 1.4, hy - R * 0.62, R * 2.8, R * 0.2, R * 0.1); g.fill(); g.stroke();
    seg(g, [[hx, hy - R * 1.6], [hx, hy - R * 0.62]], R * 0.14, hd); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = R * 0.07; g.beginPath(); g.arc(hx - R * 0.3, hy - R * 0.9, R * 0.62, Math.PI * 1.15, Math.PI * 1.45); g.stroke(); }
  if (of.head === 'headphones') { g.strokeStyle = '#17151c'; g.lineWidth = R * 0.2; g.lineCap = 'round'; g.beginPath(); g.arc(hx, hy - R * 0.2, R * 1.24, Math.PI * 1.02, Math.PI * 1.98); g.stroke(); g.strokeStyle = '#ff7a1a'; g.lineWidth = R * 0.05; g.beginPath(); g.arc(hx, hy - R * 0.2, R * 1.24, Math.PI * 1.2, Math.PI * 1.8); g.stroke();
    for (const sd of [-1, 1]) { g.fillStyle = '#17151c'; rr(g, hx + sd * R * 1.24 - R * 0.26, hy - R * 0.5, R * 0.52, R * 0.95, R * 0.2); g.fill(); g.fillStyle = '#ff7a1a'; g.beginPath(); g.arc(hx + sd * R * 1.24, hy - R * 0.02, R * 0.1, 0, Math.PI * 2); g.fill(); } }
}
function catTail(g, of, p, sil, silCol, t = 0) {
  const C = of.cat || {}, fur = C.fur || '#ee8a2c', dk = shade(fur, -0.4), sway = of._tail || 0;
  const h = p.hip, pts = [[h[0] - 6, h[1] + 6], [h[0] - 44, h[1] + 10 - sway * 4], [h[0] - 74, h[1] - 30 + sway * 8], [h[0] - 58, h[1] - 78 + sway * 10]];
  const path = () => { g.beginPath(); g.moveTo(...pts[0]); g.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]); };
  g.save(); g.lineCap = 'round';
  if (sil) { g.strokeStyle = silCol; g.lineWidth = 16; path(); g.stroke(); g.restore(); return; }
  g.strokeStyle = '#4a2410'; g.lineWidth = 17; path(); g.stroke();
  g.strokeStyle = fur; g.lineWidth = 12.5; path(); g.stroke();
  g.setLineDash([4, 11]); g.strokeStyle = dk; g.lineWidth = 12.5; g.lineCap = 'butt'; path(); g.stroke(); g.setLineDash([]);
  circle(g, pts[3][0], pts[3][1], 6.4, dk);
  g.restore();
}
function catBackpack(g, of, p, sil, silCol) {
  const c = of.pack || '#ee7a1c', [sx, sy] = p.sh, [hx, hy] = p.hip, x = Math.min(sx, hx) - 34;
  g.fillStyle = sil ? silCol : c; rr(g, x, sy - 6, 26, (hy - sy) * 0.95 + 8, 9); g.fill();
  if (sil) return;
  g.strokeStyle = '#4a2410'; g.lineWidth = 2.2; g.stroke();
  g.fillStyle = shade(c, -0.2); rr(g, x + 4, sy + 24, 18, 22, 5); g.fill(); g.strokeStyle = '#4a2410'; g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 13, sy + 12, 5, 0, 7); g.fill();
}
function catStrap(g, of, p) { const c = shade(of.pack || '#ee7a1c', -0.2); seg(g, [[p.sh[0] - 8, p.sh[1] - 4], [p.hip[0] + 4, p.hip[1] - 20]], 5, c); }

// ---------- main draw ----------
// drawFigure(g, { x, y, s, facing, pose, rot, outfit, expr, talk, blink, look, rim:{dir:[x,y], color, w}, dim, alpha, prop, shadow })
export function drawFigure(g, o) {
  const st = S(), ink = o.ink || st.ink, far = o.inkFar || st.inkFar;
  const p = o.pose || POSES.stand, s = (o.s ?? 1) * (o.outfit?.kid ? 0.72 : 1), f = o.facing ?? 1;
  const of = { ...(o.outfit || {}), _ink: ink, _f: f };
  const rim = o.rim === false ? null : { dir: [-0.8, -0.5], w: st.rimWidth, color: '#ffc68a', ...(o.rim || {}) };
  g.save(); if (o.alpha != null) g.globalAlpha *= o.alpha;
  if (o.shadow !== false && !o.rot) { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(o.x, o.y + 2, 34 * s, 6 * s, 0, 0, Math.PI * 2); g.fill(); }
  if (o.trail) { const { count = 4, dx = -40, dy = 0, a = 0.22 } = o.trail; for (let i = count; i >= 1; i--) { g.save(); g.globalAlpha *= a * (1 - i / (count + 1)); body(g, { ...o, x: o.x + dx * i, y: o.y + dy * i, trail: null }, p, s, f, of, ink, far, null, alpha(rim?.color || '#fff', 1)); g.restore(); } }
  body(g, o, p, s, f, of, ink, far, rim);
  g.restore();
}
function body(g, o, p, s, f, of, ink, far, rim, flat) {
  const tf = (dx = 0, dy = 0) => { g.translate(o.x + dx, o.y + dy); g.scale(f * s, s); if (o.rot) { g.translate(p.hip[0], p.hip[1]); g.rotate(o.rot); g.translate(-p.hip[0], -p.hip[1]); } };
  if (flat) { g.save(); tf(); parts(g, o, p, { ...of, _sil: flat }, flat, flat, 'sil'); g.restore(); return; }
  if (rim) { g.save(); tf(rim.dir[0] * rim.w, rim.dir[1] * rim.w); parts(g, o, p, { ...of, _sil: rim.color }, rim.color, rim.color, 'sil', 1.6); g.restore(); }
  g.save(); tf(); parts(g, o, p, of, o.dim ? mix(ink, far, 0.6) : ink, far, 'main'); g.restore();
}
function parts(g, o, p, of, ink, far, pass, grow = 0) {
  const sil = pass === 'sil', L = 12.5 + grow, A = 11 + grow, T = 15 + grow, HR = 26 + grow * 0.6;
  const sl = sleeve(of);
  if (of.cat) catTail(g, of, p, sil, ink);
  if (of.cat && of.backpack) catBackpack(g, of, p, sil, ink);
  // far leg + far arm
  seg(g, [p.hip, p.kB, p.fB, [p.fB[0] + 12, p.fB[1]]], L - 1, sil ? ink : of.legs ? shade(of.legs, -0.35) : far);
  seg(g, [p.sh, p.eB, p.hB], A - 1, sil ? ink : far);
  if (!sil && sl) seg(g, sl === 'long' ? [p.sh, p.eB, [lerp(p.eB[0], p.hB[0], 0.7), lerp(p.eB[1], p.hB[1], 0.7)]] : [p.sh, [lerp(p.sh[0], p.eB[0], 0.75), lerp(p.sh[1], p.eB[1], 0.75)]], 16, sleeveColor(of, true));
  if (of.gloves) circle(g, p.hB[0], p.hB[1], 8.5 + grow, sil ? ink : shade(of.gloves, -0.2));
  // hair / hood behind head
  if (of.top === 'hoodie' && of.head !== 'hood') { g.fillStyle = sil ? ink : shade(of.color || '#d64a33', -0.28); g.beginPath(); g.ellipse(p.sh[0] - 9, p.sh[1] - 6, 15 + grow, 11 + grow, -0.3, 0, Math.PI * 2); g.fill(); }
  if (of.head === 'hood') { const c = of.headColor || of.color || '#d64a33'; circle(g, p.head[0] - 6, p.head[1] + 2, HR * 1.22, sil ? ink : shade(c, -0.12)); }
  if (['ponytail', 'bun'].includes(of.head)) drawHeadwear(g, of, p.head[0], p.head[1], HR, pass);
  // torso
  seg(g, [p.sh, p.hip], T, ink);
  if (of.top && of.top !== 'none') torsoWear(g, of, p, pass);
  if (of.neckPhones && !sil) { const c = of.neckPhones; g.strokeStyle = shade(c, -0.35); g.lineWidth = 3.2; g.beginPath(); g.ellipse(p.sh[0] + 1, p.sh[1] - 8, 13, 9, 0, 0.15, Math.PI - 0.15); g.stroke(); circle(g, p.sh[0] - 11, p.sh[1] - 2, 6.5, c); circle(g, p.sh[0] - 11, p.sh[1] - 2, 3, shade(c, -0.4)); circle(g, p.sh[0] + 13, p.sh[1] - 2, 6.5, c); circle(g, p.sh[0] + 13, p.sh[1] - 2, 3, shade(c, -0.4)); }
  if (of.garb && !sil) garbWear(g, of, p);
  // near leg
  seg(g, [p.hip, p.kF, p.fF, [p.fF[0] + 13, p.fF[1]]], L, sil ? ink : of.legs || ink);
  if (!sil && ['labcoat', 'trench'].includes(of.top)) { const c = of.top === 'labcoat' ? '#ebe7f0' : of.color || '#2c2833'; poly(g, [[p.sh[0] - 4, p.sh[1] + 40], [p.hip[0] + 25, p.hip[1] + 44], [p.hip[0] - 23, p.hip[1] + 44]], c); }
  if (of.shoes) { const sh = (pt, col) => { if (sil) { seg(g, [pt, [pt[0] + 15, pt[1]]], 11 + grow, ink); return; } seg(g, [[pt[0] - 2, pt[1] - 1], [pt[0] + 15, pt[1] - 1]], 11, col); seg(g, [[pt[0] - 3, pt[1] + 4.5], [pt[0] + 16, pt[1] + 4.5]], 3.4, '#f4efe6'); circle(g, pt[0] + 11, pt[1] - 3, 2, of.shoeAccent || '#ff7a2e'); }; sh(p.fB, shade(of.shoes, -0.35)); sh(p.fF, of.shoes); }
  if (of.legs && of.cuffs && !sil) { for (const [pt, d] of [[p.fB, -0.35], [p.fF, 0]]) seg(g, [[pt[0] - 1, pt[1] - 9], [pt[0] + 1, pt[1] - 4]], L + 2, shade(of.cuffs, d)); }
  // near arm
  seg(g, [p.sh, p.eF, p.hF], A, ink);
  if (!sil && sl) seg(g, sl === 'long' ? [p.sh, p.eF, [lerp(p.eF[0], p.hF[0], 0.72), lerp(p.eF[1], p.hF[1], 0.72)]] : [p.sh, [lerp(p.sh[0], p.eF[0], 0.75), lerp(p.sh[1], p.eF[1], 0.75)]], 16.5, sleeveColor(of, false));
  if (!sil && of.top === 'bomber') { const cc = of.color2 || '#f1e6cf'; seg(g, [[lerp(p.eF[0], p.hF[0], 0.62), lerp(p.eF[1], p.hF[1], 0.62)], [lerp(p.eF[0], p.hF[0], 0.74), lerp(p.eF[1], p.hF[1], 0.74)]], 17.5, cc); }
  if (of.gloves) circle(g, p.hF[0], p.hF[1], 9 + grow, sil ? ink : of.gloves);
  // head
  if (of.cat) { if (of.backpack && !sil) catStrap(g, of, p); catHead(g, o, of, p.head[0] + 4, p.head[1] - 14, HR * 1.5, sil, ink); if (sil) return; if (of.head === 'headphones' || of.head === 'hardhat') {} if (o.prop) drawProp(g, o.prop, p, ink); return; }
  circle(g, p.head[0], p.head[1], HR, ink);
  if (!['ponytail', 'bun', 'hood', 'none', undefined].includes(of.head)) drawHeadwear(g, of, p.head[0], p.head[1], HR, pass);
  if (sil) return;
  face(g, p.head[0], p.head[1], HR, { expr: o.expr, talk: o.talk, blink: o.blink, look: o.look, override: o.face });
  if (of.face === 'glasses') { const c = S().feature; g.strokeStyle = c; g.lineWidth = 2.4; for (const dx of [-6.5, 10]) { g.beginPath(); g.arc(p.head[0] + 9 + dx, p.head[1] - 4, 7, 0, Math.PI * 2); g.stroke(); } seg(g, [[p.head[0] + 9.5, p.head[1] - 4], [p.head[0] + 12.5, p.head[1] - 4]], 2, c); }
  if (of.face === 'sunglasses') { g.fillStyle = '#05060a'; rr(g, p.head[0] - 1, p.head[1] - 10, 16, 11, 4); g.fill(); rr(g, p.head[0] + 17, p.head[1] - 10, 15, 11, 4); g.fill(); seg(g, [[p.head[0] - 4, p.head[1] - 7], [p.head[0] + 33, p.head[1] - 7]], 2.5, '#05060a'); g.fillStyle = '#9fe8ff'; g.fillRect(p.head[0] + 2, p.head[1] - 8, 4, 2); g.fillRect(p.head[0] + 20, p.head[1] - 8, 4, 2); }
  if (of.head === 'hood') { g.strokeStyle = shade(of.headColor || of.color || '#d64a33', 0.15); g.lineWidth = 5; g.beginPath(); g.arc(p.head[0] - 6, p.head[1] + 2, HR * 1.18, Math.PI * 0.9, Math.PI * 1.75); g.stroke(); }
  if (o.prop) drawProp(g, o.prop, p, ink);
}
export function soccerBall(g, x, y, r, rot = 0, light = '#f2efe8') {
  g.save(); g.translate(x, y); g.rotate(rot); circle(g, 0, 0, r, light);
  g.fillStyle = '#16131c'; const pent = (cx, cy, rr2) => { g.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; g.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); } g.closePath(); g.fill(); };
  pent(0, 0, r * 0.32); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5 + Math.PI / 5; g.save(); g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.clip(); pent(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, r * 0.28); g.restore(); }
  g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(r * 0.15, r * 0.15, r, 0, Math.PI * 2); g.arc(0, 0, r, 0, Math.PI * 2, true); g.fill(); g.restore();
}
function drawProp(g, prop, p, ink) {
  const t = typeof prop === 'string' ? { type: prop } : prop; const h = t.hand === 'B' ? p.hB : p.hF;
  switch (t.type) {
    case 'phone': rr(g, h[0] - 2, h[1] - 22, 14, 24, 3); g.fillStyle = ink; g.fill(); g.fillStyle = t.glow || '#9fd8ff'; g.fillRect(h[0], h[1] - 20, 10, 18); break;
    case 'ball': soccerBall(g, h[0] + 10, h[1] - 6, 14, t.rot || 0); break;
    case 'paper': g.fillStyle = '#f2e6c8'; g.fillRect(h[0] - 4, h[1] - 30, 30, 36); g.strokeStyle = '#b8a888'; g.lineWidth = 1.5; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(h[0], h[1] - 22 + i * 7); g.lineTo(h[0] + 20, h[1] - 22 + i * 7); g.stroke(); } break;
    case 'cup': g.fillStyle = '#f2efe8'; g.fillRect(h[0] - 2, h[1] - 18, 14, 18); seg(g, [[h[0] + 12, h[1] - 14], [h[0] + 17, h[1] - 9], [h[0] + 12, h[1] - 4]], 2.5, '#f2efe8'); break;
    case 'paddle': circle(g, h[0] + 12, h[1] - 6, 11, t.color || '#b2382a'); break;
    case 'pointer': seg(g, [h, [h[0] + 70, h[1] - 50]], 2.5, '#d8d0c0'); break;
    case 'tablet': rr(g, h[0] - 6, h[1] - 34, 40, 30, 4); g.fillStyle = ink; g.fill(); g.fillStyle = t.glow || '#7fd0d6'; g.fillRect(h[0] - 2, h[1] - 30, 32, 22); break;
    case 'book': { const x = h[0] + 4, y = h[1] - 20; g.fillStyle = '#7a3b12'; rr(g, x - 10, y - 22, 52, 44, 4); g.fill(); g.fillStyle = '#f6e7c2'; rr(g, x - 6, y - 18, 22, 36, 2); g.fill(); rr(g, x + 18, y - 18, 20, 36, 2); g.fill(); g.strokeStyle = '#b79a62'; g.lineWidth = 1.5; for (let i = 0; i < 4; i++) { seg(g, [[x - 2, y - 10 + i * 8], [x + 12, y - 10 + i * 8]], 1.5, '#b79a62'); seg(g, [[x + 22, y - 10 + i * 8], [x + 34, y - 10 + i * 8]], 1.5, '#b79a62'); } break; }
    case 'flask': { const x = h[0] + 6, y = h[1] - 6; g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(x - 5, y - 30); g.lineTo(x + 5, y - 30); g.lineTo(x + 5, y - 16); g.lineTo(x + 18, y + 6); g.lineTo(x - 18, y + 6); g.lineTo(x - 5, y - 16); g.closePath(); g.fill(); g.strokeStyle = '#d8eef5'; g.lineWidth = 2.2; g.stroke(); g.fillStyle = '#ff9a2a'; g.beginPath(); g.moveTo(x - 12, y - 6); g.lineTo(x + 12, y - 6); g.lineTo(x + 18, y + 6); g.lineTo(x - 18, y + 6); g.closePath(); g.fill(); break; }
    case 'magnifier': { const x = h[0] + 16, y = h[1] - 22; seg(g, [h, [x - 8, y + 8]], 4, '#6b3a16'); g.strokeStyle = '#c9a24a'; g.lineWidth = 5; g.beginPath(); g.arc(x, y, 14, 0, 7); g.stroke(); g.fillStyle = 'rgba(190,230,255,.3)'; g.fill(); break; }
    case 'controller': { const x = h[0] + 2, y = h[1] - 8; rr(g, x - 20, y - 8, 40, 18, 8); g.fillStyle = '#1b1a22'; g.fill(); seg(g, [[x - 11, y - 1], [x - 5, y - 1]], 2, '#ccc'); seg(g, [[x - 8, y - 4], [x - 8, y + 2]], 2, '#ccc'); circle(g, x + 9, y - 3, 2.2, '#ff7a1a'); circle(g, x + 14, y + 1, 2.2, '#5fd6ff'); break; }
    case 'spear': { seg(g, [[h[0] - 4, h[1] + 40], [h[0] + 6, h[1] - 156]], 5, '#7a4a22'); poly(g, [[h[0] + 1, h[1] - 150], [h[0] + 11, h[1] - 150], [h[0] + 7, h[1] - 192]], '#aeb3b8'); break; }
    case 'scroll': { const x = h[0] + 4, y = h[1] - 18; g.fillStyle = '#efdcaa'; rr(g, x - 4, y - 24, 30, 44, 3); g.fill(); g.strokeStyle = '#a8894a'; g.lineWidth = 2; g.stroke(); for (let i = 0; i < 4; i++) { seg(g, [[x, y - 14 + i * 9], [x + 8, y - 14 + i * 9]], 2, '#2b7a8c'); seg(g, [[x + 12, y - 14 + i * 9], [x + 20, y - 14 + i * 9]], 2, '#a83a2a'); } rr(g, x - 7, y - 27, 36, 7, 3); g.fillStyle = '#b8864a'; g.fill(); rr(g, x - 7, y + 17, 36, 7, 3); g.fill(); break; }
    case 'lyre': { const x = h[0] + 8, y = h[1] - 20; g.strokeStyle = '#d9a82a'; g.lineWidth = 5; g.beginPath(); g.moveTo(x - 14, y - 28); g.bezierCurveTo(x - 26, y - 4, x - 18, y + 22, x, y + 22); g.bezierCurveTo(x + 18, y + 22, x + 26, y - 4, x + 14, y - 28); g.stroke(); seg(g, [[x - 14, y - 28], [x + 14, y - 28]], 5, '#d9a82a'); for (let i = -2; i <= 2; i++) seg(g, [[x + i * 5.5, y - 28], [x + i * 4, y + 18]], 1.4, '#fff2c0'); break; }
    case 'map': { const x = h[0] + 4, y = h[1] - 16; g.fillStyle = '#ecd9aa'; rr(g, x - 6, y - 22, 46, 38, 3); g.fill(); g.strokeStyle = '#a8894a'; g.lineWidth = 2; g.stroke(); circle(g, x + 10, y - 3, 11, '#3d78b8'); circle(g, x + 28, y + 1, 8, '#4f9a5a'); g.fillStyle = '#4f9a5a'; g.beginPath(); g.arc(x + 8, y - 5, 5, 0, 7); g.fill(); break; }
    case 'train': { const x = h[0] + 8, y = h[1] - 18; g.fillStyle = '#2a2f38'; rr(g, x - 4, y - 6, 34, 16, 3); g.fill(); rr(g, x + 20, y - 16, 14, 14, 2); g.fill(); rr(g, x + 2, y - 14, 8, 10, 2); g.fill(); circle(g, x + 3, y + 12, 5, '#c9a24a'); circle(g, x + 17, y + 12, 5, '#c9a24a'); circle(g, x + 28, y + 12, 5, '#c9a24a'); circle(g, x + 5, y - 22, 5, 'rgba(230,230,230,.8)'); circle(g, x + 12, y - 30, 7, 'rgba(230,230,230,.6)'); break; }
    case 'flashlight': seg(g, [h, [h[0] + 14, h[1] - 4]], 6, '#3a3a44'); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,240,200,.14)'; g.beginPath(); g.moveTo(h[0] + 14, h[1] - 4); g.lineTo(h[0] + 260, h[1] - 70); g.lineTo(h[0] + 260, h[1] + 60); g.closePath(); g.fill(); g.restore(); break;
  }
}
// world position of the head centre (for rings, labels, speech bubbles)
export function headPos(o) { const p = o.pose || POSES.stand, s = (o.s ?? 1) * (o.outfit?.kid ? 0.72 : 1), f = o.facing ?? 1; let [x, y] = p.head; if (o.rot) { const [hx, hy] = p.hip; const c = Math.cos(o.rot), sn = Math.sin(o.rot); [x, y] = [hx + (x - hx) * c - (y - hy) * sn, hy + (x - hx) * sn + (y - hy) * c]; } return [o.x + x * f * s, o.y + y * s, 26 * s]; }

// ---------- giant close-up head (fills the frame) ----------
// bigFace(g, cx, cy, r, { outfit, expr, talk, blink, look, rimColor, rimSide:-1|1, tilt })
export function bigFace(g, cx, cy, r, o = {}) {
  const st = S(), ink = st.ink, of = o.outfit || {}, rc = o.rimColor || '#ffc68a', side = o.rimSide ?? -1;
  g.save(); g.translate(cx, cy); if (o.tilt) g.rotate(o.tilt);
  // shoulders / clothing at the bottom
  const top = of.top || 'none', cc = top === 'labcoat' ? '#ebe7f0' : of.color || ink;
  g.fillStyle = top === 'none' ? ink : cc; g.beginPath(); g.ellipse(0, r * 1.65, r * 1.25, r * 0.85, 0, Math.PI, Math.PI * 2); g.fill();
  if (of.head === 'hood') { const hc = of.headColor || of.color || '#d64a33'; circle(g, side * -r * 0.04, r * 0.06, r * 1.2, shade(hc, -0.15)); g.strokeStyle = alpha(shade(hc, 0.4), 0.7); g.lineWidth = r * 0.05; g.beginPath(); g.arc(-r * 0.05, 0, r * 1.12, Math.PI * 1.1, Math.PI * 1.5); g.stroke(); }
  // rim crescent on the lit side
  g.save(); g.beginPath(); g.arc(0, 0, r + r * 0.06, 0, Math.PI * 2); g.arc(side * r * 0.07, r * 0.02, r, 0, Math.PI * 2, true); g.fillStyle = rc; g.fill('evenodd'); g.restore();
  circle(g, 0, 0, r, ink);
  if (of.head && !['hood', 'none'].includes(of.head)) drawHeadwear(g, { ...of, _ink: ink }, 0, 0, r, 'main');
  face(g, 0, 0, r, { expr: o.expr, talk: o.talk, blink: o.blink, look: o.look, front: true, override: o.face });
  if (of.face === 'glasses') { g.strokeStyle = st.feature; g.lineWidth = r * 0.06; for (const dx of [-0.34, 0.34]) { g.beginPath(); g.arc(dx * r, -r * 0.16, r * 0.26, 0, Math.PI * 2); g.stroke(); } }
  if (of.face === 'sunglasses') { g.fillStyle = '#05060a'; rr(g, -r * 0.66, -r * 0.34, r * 0.6, r * 0.4, r * 0.12); g.fill(); rr(g, r * 0.06, -r * 0.34, r * 0.6, r * 0.4, r * 0.12); g.fill(); g.fillStyle = 'rgba(160,230,255,.6)'; g.fillRect(-r * 0.55, -r * 0.28, r * 0.12, r * 0.05); }
  g.restore();
}
