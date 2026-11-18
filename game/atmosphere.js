import { ellipse, TAU } from './math.js';

// These fractures are light sources, not damage zones. Collision and telegraphs
// stay readable above them; danger is still communicated by boss attack shapes.
export const FURNACE_FRACTURES = [
  [[639, 231], [661, 278], [639, 307], [684, 341], [660, 388], [701, 423], [680, 465], [721, 503], [706, 548], [747, 597], [739, 657], [771, 714]],
  [[683, 341], [745, 325], [790, 349], [832, 322], [901, 343], [947, 310], [1039, 330], [1095, 309]],
  [[701, 423], [754, 443], [804, 430], [854, 461], [914, 440], [946, 472], [1022, 468], [1096, 497]],
  [[721, 503], [773, 528], [814, 508], [859, 544], [909, 531], [966, 571], [1013, 554], [1093, 590]],
  [[747, 597], [793, 621], [839, 603], [876, 645], [933, 639], [963, 684]],
];

function strokePath(ctx, points, color, width) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = color; ctx.stroke();
}

export function paintThermalDivide(ctx, realm) {
  ctx.save();
  const warm = ctx.createLinearGradient(500, 0, 1110, 0);
  warm.addColorStop(0, '#ae471500'); warm.addColorStop(.5, '#ad571b25'); warm.addColorStop(1, '#d36a1c45');
  ctx.fillStyle = warm; ctx.fillRect(500, 230, 600, 475);
  const cold = ctx.createLinearGradient(185, 0, 615, 0);
  cold.addColorStop(0, '#2db8e13a'); cold.addColorStop(.65, '#2db8e113'); cold.addColorStop(1, '#2db8e100');
  ctx.fillStyle = cold; ctx.fillRect(184, 230, 430, 475);
  for (const points of FURNACE_FRACTURES) {
    strokePath(ctx, points, '#080f15e0', 16);
    strokePath(ctx, points.map(([x, y]) => [x - 3, y - 2]), '#ba9b684b', 2);
    strokePath(ctx, points, '#7b351dd9', 9);
    strokePath(ctx, points, '#d66e30', 4.5);
    strokePath(ctx, points, '#ffd58b', 1.35);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = 17; ctx.shadowColor = '#ff932f';
    strokePath(ctx, points, '#ef791f65', 8);
    ctx.restore();
    // Branches break the engineered grid without hiding the dressed stone.
    for (let i = 1; i < points.length - 1; i += 2) {
      const [x, y] = points[i];
      strokePath(ctx, [[x, y], [x + 19, y - 11], [x + 25, y - 27]], '#f0ad595f', 1.4);
    }
  }
  for (let i = 0; i < 18; i++) {
    const x = 214 + (i * 67) % 340, y = 270 + (i * 91) % 395;
    strokePath(ctx, [[x, y], [x + 21, y - 5], [x + 33, y + 3], [x + 59, y - 4]], '#81ecf94c', .8);
  }
  ctx.restore();
}

export function thermalAir(ctx, time, realm) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // Low transparent ice breath stays below the characters and their labels.
  for (let i = 0; i < 7; i++) {
    const x = 250 + i * 43 + Math.sin(time * .27 + i) * 37;
    const y = 299 + (i * 73) % 370;
    const mist = ctx.createRadialGradient(x, y, 1, x, y, 94);
    mist.addColorStop(0, '#71ddf212'); mist.addColorStop(.55, '#71ddf209'); mist.addColorStop(1, '#71ddf200');
    ctx.fillStyle = mist; ctx.fillRect(x - 94, y - 50, 188, 100);
  }
  for (let i = 0; i < 42; i++) {
    const t = (time * (.09 + i % 4 * .013) + i * .149) % 1;
    const x = 655 + (i * 77) % 397 + Math.sin(t * 4 + i) * 9;
    const y = 698 - t * 405;
    const alpha = Math.sin(t * Math.PI) * .62;
    ctx.globalAlpha = alpha;
    ellipse(ctx, x, y, i % 5 === 0 ? 1.5 : .8, i % 5 === 0 ? 2.8 : 1.5, '#ffb363');
    if (i % 6 === 0) { ctx.globalAlpha = alpha * .22; ellipse(ctx, x, y, 5, 7, '#ff8b3d'); }
  }
  ctx.restore();
}

export function moltenThread(ctx, from, to, color, time) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const dx = to.x - from.x, dy = to.y - from.y;
  const points = Array.from({ length: 15 }, (_, i) => {
    const t = i / 14, flutter = Math.sin(t * 11 - time * 13) * Math.sin(t * Math.PI) * 3;
    return [from.x + dx * t + flutter * .4, from.y + dy * t + flutter];
  });
  strokePath(ctx, points, color + '22', 13);
  strokePath(ctx, points, '#ffc77b90', 5);
  strokePath(ctx, points, '#d7ffff', 1.5);
  for (let i = 0; i < 6; i++) {
    const t = (time * 1.8 + i / 6) % 1;
    ellipse(ctx, from.x + dx * t, from.y + dy * t, 1.7, 1.7, i % 2 ? '#f3e0a0' : color);
  }
  ctx.restore();
}
