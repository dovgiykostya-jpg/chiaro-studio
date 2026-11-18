// titles.js — титр серии
import { E, clamp, ease, prog, glow, alpha, radGrad, linGrad, rng, backdrop, registerShot, text, FONTS } from '/engine/core.js';
import * as FX from '/engine/fx2d.js';
const TEAL = '#2fd6c8', WARM = '#ffb25a';
registerShot('tt', { draw(g, t, info) {
  backdrop(g, ['#02040a', '#070d1c']); glow(g, E.W / 2, E.H / 2, 800, TEAL, 0.12);
  const k = ease.out(prog(t, 0.2, 1.4)), k2 = ease.out(prog(t, 1.2, 2.0));
  // нить через кадр
  g.save(); g.globalCompositeOperation = 'lighter'; for (const [w, al] of [[16, 0.08], [7, 0.2], [3, 0.95]]) { g.strokeStyle = `rgba(47,214,200,${al * k})`; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); for (let i = 0; i <= 60; i++) { const u = i / 60, x = 200 + u * 1520, y = 640 + Math.sin(u * 6 + t * 1.2) * 20 - Math.sin(u * Math.PI) * 120; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } g.restore();
  text(g, 'ВХОДЯЩИЕ', E.W / 2, E.H / 2 - 40, { size: 150, font: FONTS.ui, weight: 700, color: '#e6edff', spacing: 30, alpha: k, glow: 30, glowColor: TEAL });
  text(g, 'ДЕЛО №1  ·  ГАСНУЩИЙ ФОНАРЬ', E.W / 2, E.H / 2 + 110, { size: 38, font: FONTS.ui, weight: 700, color: WARM, spacing: 14, alpha: k2 });
  FX.dust(g, t, { count: 50, color: '#bfeaff', size: 1.8, a: 0.5, speed: 6 });
  g.save(); g.fillStyle = radGrad(g, E.W / 2, E.H / 2, E.H * 0.3, E.H * 1.05, ['rgba(0,0,0,0)', 'rgba(0,0,0,.6)']); g.fillRect(0, 0, E.W, E.H); g.restore();
} });
