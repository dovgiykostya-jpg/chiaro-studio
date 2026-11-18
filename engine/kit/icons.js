// engine/kit/icons.js — библиотека простых взрослых иконок (линия + плоская заливка) для любых тем.
// icon(g, name, x, y, size, {color, accent, t}) — рисует иконку в квадрате size×size с центром (x, y).
// Список имён ICONS — его же получает авто-раскадровка как допустимые значения.
import { rr, seg, poly, circle, ring, alpha, shade, text } from '/engine/core.js';

export const ICONS = ['fish', 'crab', 'factory', 'flask', 'coin', 'money', 'clock', 'phone', 'warning', 'heart', 'brain', 'drop',
  'salt', 'sugar', 'egg', 'wheat', 'oil', 'fire', 'snow', 'box', 'truck', 'cart', 'person', 'people', 'house', 'chart', 'check',
  'cross', 'star', 'bolt', 'leaf', 'pill', 'eye', 'shield', 'globe', 'calendar', 'question', 'chip', 'car', 'bottle', 'knife',
  'scale', 'microscope', 'dna', 'cell', 'bone', 'sun', 'moon', 'battery', 'lock', 'gear', 'doc', 'mail', 'cup', 'bread', 'meat',
  'milk', 'apple', 'radiation', 'virus', 'water', 'plane', 'ship', 'tree', 'trash', 'bag', 'percent', 'sound', 'crabstick'];

const L = (g, pts, w, c) => seg(g, pts, w, c);
export function icon(g, name, x, y, size = 160, o = {}) {
  const c = o.color || '#fff1dc', a = o.accent || '#ffd47e', t = o.t || 0, k = size / 100, w = Math.max(2, 6 * k);
  g.save(); g.translate(x, y); g.scale(k, k);
  const S = (pts, ww = 6, col = c) => L(g, pts, ww, col), C = (cx, cy, r, col = c) => circle(g, cx, cy, r, col), R = (cx, cy, r, ww = 6, col = c) => ring(g, cx, cy, r, ww, col);
  const box = (x0, y0, ww, hh, rad, col, stroke) => { rr(g, x0, y0, ww, hh, rad); if (col) { g.fillStyle = col; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 6; g.stroke(); } };
  switch (name) {
    case 'fish': g.fillStyle = a; g.beginPath(); g.ellipse(-6, 0, 36, 20, 0, 0, 7); g.fill(); poly(g, [[26, 0], [46, -20], [46, 20]], a); C(-24, -5, 4, '#1a1622'); break;
    case 'crab': { g.fillStyle = '#e8573f'; g.beginPath(); g.ellipse(0, 8, 30, 20, 0, 0, 7); g.fill(); for (const s of [-1, 1]) { S([[s * 22, 20], [s * 40, 36]], 6, '#e8573f'); S([[s * 26, 12], [s * 46, 22]], 6, '#e8573f'); S([[s * 18, -6], [s * 30, -30]], 7, '#e8573f'); C(s * 32, -36, 11, '#e8573f'); C(s * 8, -16, 4, c); } break; }
    case 'factory': box(-44, -6, 88, 46, 4, c); poly(g, [[-44, -6], [-44, -26], [-16, -6]], c); poly(g, [[-16, -6], [-16, -26], [12, -6]], c); box(20, -44, 14, 40, 2, c); for (let i = 0; i < 3; i++) box(-34 + i * 24, 10, 12, 12, 2, a); C(27 + Math.sin(t * 2) * 3, -54 - (t * 10 % 12), 7, alpha(c, 0.5)); break;
    case 'flask': S([[-10, -44], [-10, -10], [-36, 36], [36, 36], [10, -10], [10, -44]], 6); S([[-16, -44], [16, -44]], 6); poly(g, [[-24, 14], [24, 14], [33, 32], [-33, 32]], a); C(-6, 22, 4, c); C(8, 18, 3, c); break;
    case 'coin': C(0, 0, 40, a); R(0, 0, 32, 5, shade(a, -0.3)); text(g, '₽', 0, 2, { size: 44, color: shade(a, -0.45) }); break;
    case 'money': box(-46, -26, 92, 52, 6, '#7bd88f'); box(-38, -18, 76, 36, 4, null, shade('#7bd88f', -0.35)); C(0, 0, 12, shade('#7bd88f', -0.35)); break;
    case 'clock': R(0, 0, 40, 7); S([[0, 0], [0, -26]], 6); S([[0, 0], [Math.cos(t) * 20, Math.sin(t) * 20]], 5, a); C(0, 0, 5, c); break;
    case 'phone': box(-24, -44, 48, 88, 10, null, c); box(-17, -34, 34, 60, 3, alpha(a, 0.7)); C(0, 34, 4, c); break;
    case 'warning': poly(g, [[0, -44], [46, 38], [-46, 38]], a); S([[0, -14], [0, 12]], 9, '#1a1622'); C(0, 26, 5, '#1a1622'); break;
    case 'heart': g.fillStyle = '#e8573f'; g.beginPath(); g.moveTo(0, 38); g.bezierCurveTo(-60, -6, -24, -50, 0, -18); g.bezierCurveTo(24, -50, 60, -6, 0, 38); g.fill(); break;
    case 'brain': g.fillStyle = '#e7a1b0'; for (const [dx, dy, r] of [[-18, -10, 20], [2, -18, 20], [20, -6, 20], [-12, 12, 18], [14, 14, 18]]) { g.beginPath(); g.arc(dx, dy, r, 0, 7); g.fill(); } S([[0, -30], [0, 28]], 4, shade('#e7a1b0', -0.35)); break;
    case 'drop': case 'water': g.fillStyle = '#5fc0e8'; g.beginPath(); g.moveTo(0, -44); g.bezierCurveTo(30, -6, 34, 10, 34, 16); g.arc(0, 16, 34, 0, Math.PI); g.bezierCurveTo(-34, 10, -30, -6, 0, -44); g.fill(); C(-12, 16, 6, alpha('#ffffff', 0.6)); break;
    case 'salt': case 'sugar': box(-26, -30, 52, 70, 10, name === 'salt' ? '#dfe7ee' : '#f2e2c4'); box(-28, -44, 56, 16, 5, shade(c, -0.3)); for (let i = 0; i < 3; i++) C(-12 + i * 12, -36, 2.5, '#1a1622'); text(g, name === 'salt' ? 'NaCl' : 'C₁₂', 0, 8, { size: 20, color: '#1a1622' }); break;
    case 'egg': g.fillStyle = '#f2e7d2'; g.beginPath(); g.ellipse(0, 4, 30, 40, 0, 0, 7); g.fill(); C(-10, -8, 6, alpha('#ffffff', 0.6)); break;
    case 'wheat': S([[0, 44], [0, -40]], 5, a); for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { g.fillStyle = a; g.beginPath(); g.ellipse(s * 12, -30 + i * 16, 8, 13, s * 0.5, 0, 7); g.fill(); } break;
    case 'oil': case 'bottle': box(-20, -18, 40, 62, 10, name === 'oil' ? '#e8c45a' : '#9fc6d0'); box(-9, -40, 18, 24, 3, shade(c, -0.2)); box(-20, 2, 40, 18, 2, alpha('#ffffff', 0.35)); break;
    case 'fire': g.fillStyle = '#ff8a3a'; g.beginPath(); g.moveTo(0, -46 + Math.sin(t * 9) * 3); g.bezierCurveTo(34, -8, 34, 40, 0, 40); g.bezierCurveTo(-34, 40, -34, -8, 0, -46); g.fill(); g.fillStyle = '#ffd47e'; g.beginPath(); g.moveTo(0, -6); g.bezierCurveTo(16, 12, 16, 38, 0, 38); g.bezierCurveTo(-16, 38, -16, 12, 0, -6); g.fill(); break;
    case 'snow': for (let i = 0; i < 3; i++) { const an = i * Math.PI / 3; S([[Math.cos(an) * -40, Math.sin(an) * -40], [Math.cos(an) * 40, Math.sin(an) * 40]], 6, '#9fe8ff'); } break;
    case 'box': poly(g, [[-40, -18], [0, -38], [40, -18], [0, 2]], shade('#c8955a', 0.2)); poly(g, [[-40, -18], [0, 2], [0, 44], [-40, 24]], '#c8955a'); poly(g, [[40, -18], [0, 2], [0, 44], [40, 24]], shade('#c8955a', -0.25)); break;
    case 'truck': box(-46, -24, 56, 40, 4, c); box(12, -10, 34, 26, 4, a); C(-28, 22, 10, '#1a1622'); R(-28, 22, 10, 4); C(28, 22, 10, '#1a1622'); R(28, 22, 10, 4); break;
    case 'cart': S([[-46, -30], [-32, -30], [-20, 16], [30, 16], [40, -14], [-26, -14]], 6); C(-14, 30, 7, c); C(24, 30, 7, c); break;
    case 'person': C(0, -26, 14, c); rr(g, -20, -8, 40, 50, 16); g.fillStyle = c; g.fill(); break;
    case 'people': for (const [dx, s2, col] of [[-26, 0.8, alpha(c, 0.6)], [26, 0.8, alpha(c, 0.6)], [0, 1, c]]) { g.save(); g.translate(dx, 6 * (1 - s2) * 4); g.scale(s2, s2); C(0, -26, 14, col); rr(g, -20, -8, 40, 50, 16); g.fillStyle = col; g.fill(); g.restore(); } break;
    case 'house': poly(g, [[-44, -2], [0, -42], [44, -2]], a); box(-34, -4, 68, 46, 2, c); box(-10, 14, 20, 28, 2, '#1a1622'); break;
    case 'chart': S([[-44, -40], [-44, 40], [44, 40]], 6); for (let i = 0; i < 3; i++) box(-30 + i * 24, 30 - (i + 1) * 20, 16, (i + 1) * 20, 2, i === 2 ? a : c); break;
    case 'check': R(0, 0, 42, 6, '#7bd88f'); S([[-20, 0], [-6, 16], [22, -16]], 9, '#7bd88f'); break;
    case 'cross': R(0, 0, 42, 6, '#e8573f'); S([[-18, -18], [18, 18]], 9, '#e8573f'); S([[18, -18], [-18, 18]], 9, '#e8573f'); break;
    case 'star': { const P = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 18 : 44, an = -Math.PI / 2 + i * Math.PI / 5; P.push([Math.cos(an) * r, Math.sin(an) * r]); } poly(g, P, a); break; }
    case 'bolt': poly(g, [[8, -46], [-28, 6], [-2, 6], [-10, 46], [28, -8], [2, -8]], a); break;
    case 'leaf': g.fillStyle = '#7bd88f'; g.beginPath(); g.moveTo(-36, 36); g.bezierCurveTo(-40, -30, 20, -44, 40, -40); g.bezierCurveTo(36, 10, 0, 40, -36, 36); g.fill(); S([[-36, 36], [20, -20]], 4, shade('#7bd88f', -0.4)); break;
    case 'pill': g.save(); g.rotate(-0.6); box(-42, -16, 84, 32, 16, c); box(0, -16, 42, 32, 16, a); g.fillStyle = a; g.fillRect(0, -16, 16, 32); g.restore(); break;
    case 'eye': g.fillStyle = c; g.beginPath(); g.moveTo(-46, 0); g.quadraticCurveTo(0, -40, 46, 0); g.quadraticCurveTo(0, 40, -46, 0); g.fill(); C(0, 0, 16, a); C(0, 0, 7, '#1a1622'); break;
    case 'shield': g.fillStyle = a; g.beginPath(); g.moveTo(0, -44); g.lineTo(36, -30); g.quadraticCurveTo(36, 24, 0, 44); g.quadraticCurveTo(-36, 24, -36, -30); g.closePath(); g.fill(); S([[-14, 0], [-2, 12], [16, -10]], 7, '#1a1622'); break;
    case 'globe': R(0, 0, 40, 6); g.strokeStyle = c; g.lineWidth = 4; g.beginPath(); g.ellipse(0, 0, 16, 40, 0, 0, 7); g.stroke(); S([[-40, 0], [40, 0]], 4); S([[-34, -18], [34, -18]], 3); S([[-34, 18], [34, 18]], 3); break;
    case 'calendar': box(-40, -32, 80, 74, 6, c); box(-40, -32, 80, 20, 6, a); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) box(-28 + i * 22, -2 + j * 20, 12, 12, 2, '#1a1622'); S([[-22, -42], [-22, -26]], 6); S([[22, -42], [22, -26]], 6); break;
    case 'question': text(g, '?', 0, 4, { size: 110, color: a, glow: 20 }); break;
    case 'percent': text(g, '%', 0, 4, { size: 100, color: a, glow: 16 }); break;
    case 'chip': box(-28, -28, 56, 56, 6, '#3a4a5a', c); for (let i = 0; i < 4; i++) { S([[-20 + i * 13, -28], [-20 + i * 13, -42]], 4); S([[-20 + i * 13, 28], [-20 + i * 13, 42]], 4); } box(-12, -12, 24, 24, 3, a); break;
    case 'car': g.fillStyle = a; g.beginPath(); g.moveTo(-46, 16); g.lineTo(-40, -4); g.lineTo(-20, -8); g.lineTo(-8, -26); g.lineTo(22, -26); g.lineTo(34, -6); g.lineTo(46, 0); g.lineTo(46, 16); g.closePath(); g.fill(); C(-24, 18, 10, '#1a1622'); C(26, 18, 10, '#1a1622'); break;
    case 'knife': poly(g, [[-44, 4], [24, -14], [30, 4]], '#c8d0d8'); box(24, -6, 24, 14, 4, '#5a3a2a'); break;
    case 'scale': S([[0, -40], [0, 36]], 6); S([[-40, -26], [40, -26]], 6); S([[-30, 36], [30, 36]], 8); for (const s of [-1, 1]) { S([[s * 40, -26], [s * 52, 4]], 3); S([[s * 40, -26], [s * 28, 4]], 3); g.fillStyle = a; g.beginPath(); g.arc(s * 40, 4, 14, 0, Math.PI); g.fill(); } break;
    case 'microscope': S([[-30, 40], [30, 40]], 8); S([[10, 40], [10, 10], [-6, -6]], 8); box(-24, -46, 18, 44, 4, c); box(-34, 2, 40, 8, 2, a); break;
    case 'dna': for (let i = 0; i < 8; i++) { const yy = -42 + i * 12, ph = i * 0.8 + t * 2, x1 = Math.sin(ph) * 22; S([[x1, yy], [-x1, yy]], 3, alpha(c, 0.6)); C(x1, yy, 5, '#5fd0e0'); C(-x1, yy, 5, a); } break;
    case 'cell': g.fillStyle = alpha('#9fc6d0', 0.4); g.beginPath(); g.ellipse(0, 0, 42, 34, 0.2, 0, 7); g.fill(); g.strokeStyle = '#cfe8ff'; g.lineWidth = 4; g.stroke(); C(6, -4, 13, '#5a7a9a'); break;
    case 'bone': box(-34, -8, 68, 16, 8, c); for (const s of [-1, 1]) for (const d of [-1, 1]) C(s * 36, d * 10, 11, c); break;
    case 'sun': C(0, 0, 22, a); for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4 + t * 0.3; S([[Math.cos(an) * 32, Math.sin(an) * 32], [Math.cos(an) * 44, Math.sin(an) * 44]], 6, a); } break;
    case 'moon': C(0, 0, 36, '#e8ecff'); C(16, -10, 32, '#1a2440'); break;
    case 'battery': box(-40, -22, 74, 44, 6, null, c); box(34, -8, 8, 16, 2, c); box(-32, -14, 58 * (o.v ?? 0.3), 28, 3, (o.v ?? 0.3) < 0.35 ? '#e8573f' : '#7bd88f'); break;
    case 'lock': box(-30, -6, 60, 48, 6, a); g.strokeStyle = c; g.lineWidth = 8; g.beginPath(); g.arc(0, -8, 20, Math.PI, 0); g.stroke(); C(0, 16, 6, '#1a1622'); break;
    case 'gear': { g.save(); g.rotate(t * 0.8); for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); box(-8, -46, 16, 18, 3, c); } g.restore(); C(0, 0, 32, c); C(0, 0, 12, '#1a1622'); break; }
    case 'doc': box(-30, -42, 60, 84, 4, c); for (let i = 0; i < 4; i++) S([[-18, -24 + i * 14], [i === 3 ? 4 : 18, -24 + i * 14]], 4, '#5a6a80'); box(-18, 22, 18, 10, 2, a); break;
    case 'mail': box(-44, -28, 88, 56, 4, c); S([[-44, -28], [0, 6], [44, -28]], 5, '#5a6a80'); break;
    case 'cup': box(-28, -24, 46, 56, 8, c); g.strokeStyle = c; g.lineWidth = 7; g.beginPath(); g.arc(20, 2, 14, -1.4, 1.4); g.stroke(); for (let i = 0; i < 2; i++) S([[-14 + i * 16, -34], [-10 + i * 16 + Math.sin(t * 3 + i) * 4, -48]], 4, alpha(c, 0.5)); break;
    case 'bread': g.fillStyle = '#d4a05a'; g.beginPath(); g.ellipse(0, 6, 46, 26, 0, 0, 7); g.fill(); for (let i = 0; i < 3; i++) S([[-24 + i * 20, -6], [-14 + i * 20, 10]], 4, shade('#d4a05a', -0.35)); break;
    case 'meat': g.fillStyle = '#c8564a'; g.beginPath(); g.ellipse(-6, 0, 36, 26, -0.3, 0, 7); g.fill(); g.fillStyle = '#f2d8c8'; g.beginPath(); g.ellipse(-6, 0, 14, 9, -0.3, 0, 7); g.fill(); box(26, -6, 22, 10, 4, c); break;
    case 'milk': poly(g, [[-24, -20], [0, -44], [24, -20]], c); box(-24, -20, 48, 64, 3, c); box(-24, 0, 48, 20, 2, '#5fa0e0'); break;
    case 'apple': C(-10, 6, 26, '#d94a3b'); C(10, 6, 26, '#d94a3b'); S([[0, -18], [4, -36]], 5, '#5a3a2a'); g.fillStyle = '#7bd88f'; g.beginPath(); g.ellipse(14, -32, 10, 5, -0.5, 0, 7); g.fill(); break;
    case 'radiation': C(0, 0, 44, a); g.fillStyle = '#1a1622'; for (let i = 0; i < 3; i++) { const a0 = -Math.PI / 2 + i * 2.094 - 0.52, a1 = a0 + 1.047; g.beginPath(); g.moveTo(Math.cos(a0) * 11, Math.sin(a0) * 11); g.arc(0, 0, 38, a0, a1); g.arc(0, 0, 11, a1, a0, true); g.fill(); } C(0, 0, 7, '#1a1622'); break;
    case 'virus': C(0, 0, 26, '#7bd88f'); for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4; S([[Math.cos(an) * 26, Math.sin(an) * 26], [Math.cos(an) * 40, Math.sin(an) * 40]], 5, '#7bd88f'); C(Math.cos(an) * 42, Math.sin(an) * 42, 6, '#7bd88f'); } break;
    case 'plane': poly(g, [[-46, 6], [40, -6], [46, 0], [40, 6]], c); poly(g, [[-4, 0], [-24, -36], [-12, -36], [14, 0]], c); poly(g, [[-4, 2], [-24, 36], [-12, 36], [14, 2]], c); break;
    case 'ship': poly(g, [[-46, 6], [46, 6], [32, 30], [-34, 30]], c); box(-20, -22, 34, 28, 3, a); S([[0, -22], [0, -44]], 5); break;
    case 'tree': S([[0, 44], [0, 0]], 9, '#6a4a32'); C(0, -16, 30, '#4f8a55'); C(-18, 0, 20, '#4f8a55'); C(18, 0, 20, '#4f8a55'); break;
    case 'trash': box(-28, -26, 56, 70, 6, c); box(-36, -36, 72, 10, 3, c); for (let i = 0; i < 3; i++) S([[-14 + i * 14, -14], [-14 + i * 14, 32]], 4, '#5a6a80'); break;
    case 'bag': box(-34, -18, 68, 62, 8, a); g.strokeStyle = c; g.lineWidth = 6; g.beginPath(); g.arc(0, -18, 18, Math.PI, 0); g.stroke(); break;
    case 'sound': poly(g, [[-40, -14], [-20, -14], [4, -36], [4, 36], [-20, 14], [-40, 14]], c); for (let i = 0; i < 2; i++) { g.strokeStyle = a; g.lineWidth = 5; g.beginPath(); g.arc(4, 0, 18 + i * 16, -0.8, 0.8); g.stroke(); } break;
    case 'crabstick': for (const [dx, dy, rot] of [[-6, -22, -0.32], [2, 2, -0.22], [10, 26, -0.12]]) { g.save(); g.translate(dx, dy); g.rotate(rot); box(-46, -12, 92, 24, 12, '#f6efe6'); g.save(); rr(g, -46, -12, 92, 24, 12); g.clip(); g.fillStyle = '#e04a32'; g.fillRect(-46, -12, 92, 11); for (let i = 0; i < 4; i++) { g.fillStyle = alpha('#e04a32', 0.55); g.fillRect(-40 + i * 24, -1, 12, 3); } g.restore(); g.restore(); } break;
    default: R(0, 0, 40, 6, a); text(g, '•', 0, 0, { size: 60, color: a });
  }
  g.restore();
}
