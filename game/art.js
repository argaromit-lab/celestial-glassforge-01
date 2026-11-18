import { TAU, random, ellipse, polygon, clamp } from './math.js';

export const PALETTE = { ink: '#101a21', steel: '#304957', brass: '#b99b66', ice: '#9ce9f7', orange: '#ffc17b', parchment: '#ece7d8' };

export function line(ctx, points, color, width = 1) {
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
export function glow(ctx, x, y, radius, color, strength = .4) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, radius));
  g.addColorStop(0, color); g.addColorStop(.22, color + '90'); g.addColorStop(1, color + '00');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = strength; ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2); ctx.restore();
}
export function text(ctx, value, x, y, size, color, font = 'sans-serif', weight = 700, align = 'center') {
  ctx.font = `${weight} ${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineWidth = 4; ctx.strokeStyle = '#0b1725c9'; ctx.lineJoin = 'round'; ctx.strokeText(value, x, y);
  ctx.fillStyle = color; ctx.fillText(value, x, y);
}
export function groundShadow(ctx, x, y, radius, height = 35, opacity = .5) {
  ctx.save(); ctx.globalAlpha = opacity;
  const g = ctx.createLinearGradient(x, y, x - height, y + height * .6);
  g.addColorStop(0, '#030b12dd'); g.addColorStop(1, '#030b1200');
  polygon(ctx, [[x - radius, y], [x + radius, y], [x + radius - height, y + height * .6], [x - radius - height * 1.5, y + height * .8]], g);
  ellipse(ctx, x, y + 3, radius, radius * .38, '#020a11b0'); ctx.restore();
}
export function crystal(ctx, x, y, size = 50, angle = 0, hue = 'ice', seed = 1) {
  const rng = random(seed), width = size * (.21 + rng() * .1);
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  const blue = hue === 'ice';
  const tip = [size * .12, -size], left = [-width, -size * .61], right = [width * .8, -size * .65], baseL = [-width * .64, 0], baseR = [width * .7, -3], ridge = [width * .15, -size * .5];
  polygon(ctx, [tip, left, baseL, [0, -4], ridge], blue ? '#307893' : '#b76c38', blue ? '#6eb4c8' : '#f3ba73');
  polygon(ctx, [tip, right, baseR, [0, -4], ridge], blue ? '#163f5d' : '#633b2d', blue ? '#5c9fb3' : '#ca8a4d');
  polygon(ctx, [tip, right, ridge], blue ? '#a1e8ed' : '#ffe0a2');
  polygon(ctx, [left, ridge, [0, -4]], blue ? '#54b5ce65' : '#ef9e4b70');
  line(ctx, [tip, ridge, [0, -4]], blue ? '#c0f6ff' : '#ffdfab', 1.15);
  line(ctx, [[-width * .7, -size * .41], [width * .6, -size * .55]], blue ? '#9ce3ed80' : '#ffbf8170', .8);
  for (let i = 0; i < 4; i++) {
    const yy = -.1 * size - rng() * size * .6;
    line(ctx, [[-width * .45, yy], [width * .45, yy - size * .13]], blue ? '#9edce32d' : '#ffcc8830', .8);
  }
  ctx.restore();
}
export function crystalCluster(ctx, x, y, size = 60, seed = 1, hue = 'ice') {
  const rng = random(seed);
  groundShadow(ctx, x, y, size * .4, size * .9, .7);
  ellipse(ctx, x, y + 3, size * .48, size * .17, hue === 'ice' ? '#30667b' : '#71452c', '#86b4bc58');
  crystal(ctx, x - size * .2, y - 2, size * .7, -.35, hue, seed + 1);
  crystal(ctx, x + size * .21, y + 3, size * .6, .4, hue, seed + 2);
  crystal(ctx, x + size * .03, y - size * .05, size, .06, hue, seed + 3);
  for (let i = 0; i < 5; i++) crystal(ctx, x + (rng() - .5) * size * .7, y + rng() * 8, size * (.18 + rng() * .15), (rng() - .5), hue, seed + i + 10);
  glow(ctx, x, y - size * .45, size * .8, hue === 'ice' ? '#54d5ff' : '#ff9447', .23);
}
export function furnace(ctx, x, y, r = 27, age = 0) {
  groundShadow(ctx, x, y, r, 64);
  const side = ctx.createLinearGradient(x - r, y - 35, x + r, y);
  side.addColorStop(0, '#26333b'); side.addColorStop(.5, '#5a5140'); side.addColorStop(1, '#181e25');
  polygon(ctx, [[x - r, y - 28], [x + r, y - 28], [x + r - 3, y + 5], [x - r + 4, y + 5]], side, '#8d805f');
  ellipse(ctx, x, y - 29, r, r * .46, '#776b50', '#c3b07b', 2);
  ellipse(ctx, x, y - 30, r - 5, r * .36, '#3e221c', '#d38347', 2);
  const lava = ctx.createRadialGradient(x, y - 30, 2, x, y - 30, r);
  lava.addColorStop(0, '#fff2b7'); lava.addColorStop(.4, '#ffb65b'); lava.addColorStop(.8, '#bf542e'); lava.addColorStop(1, '#5d2821');
  ellipse(ctx, x, y - 31, r - 8, r * .29, lava);
  for (let i = 0; i < 5; i++) { const dx = (i - 2) * 8; line(ctx, [[x + dx - 4, y - 25], [x + dx - 3, y + 1]], '#a08b62', 2); }
  line(ctx, [[x - r + 3, y - 14], [x + r - 2, y - 14]], '#ac9c7150', 2);
  glow(ctx, x, y - 33, r * 2.5, '#ff9e45', .45);
  for (let i = 0; i < 6; i++) {
    const t = (age * .5 + i * .19) % 1;
    ellipse(ctx, x + Math.sin(i * 4 + t * 4) * r * .7, y - 30 - t * 53, 1, 2, `rgba(255,206,127,${1 - t})`);
  }
}
export function crateArt(ctx, crate) {
  const { x, y } = crate;
  groundShadow(ctx, x, y, 22, 38);
  polygon(ctx, [[x - 22, y - 25], [x + 16, y - 31], [x + 23, y - 19], [x - 15, y - 13]], '#7c6c50', '#b6a16d');
  polygon(ctx, [[x - 22, y - 25], [x - 15, y - 13], [x - 15, y + 13], [x - 22, y + 2]], '#342b26', '#766148');
  polygon(ctx, [[x - 15, y - 13], [x + 23, y - 19], [x + 22, y + 7], [x - 15, y + 13]], '#514b3c', '#9d865c');
  for (let i = 0; i < 3; i++) line(ctx, [[x - 13 + i * 12, y - 14 - i], [x - 13 + i * 12, y + 10 - i]], '#242e32', 2);
  line(ctx, [[x - 12, y - 5], [x + 18, y - 10]], '#d9ba74', 3);
  polygon(ctx, [[x - 5, y - 9], [x + 4, y - 15], [x + 12, y - 7], [x + 3, y + 3]], '#f0cc7b', '#f9e9ac');
  line(ctx, [[x + 3, y - 11], [x + 3, y - 1]], '#665b3b', 2);
}

export function makeArena(realm = 2) {
  const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 800;
  const ctx = canvas.getContext('2d'), rng = random(76884 + realm * 42);
  ctx.fillStyle = '#1b2b36'; ctx.fillRect(0, 0, 1280, 800);
  // Individually beveled dressed stone, offset rows and hairline mineral seams.
  for (let row = -1; row < 13; row++) for (let col = -1; col < 19; col++) {
    const x = col * 77 + (row % 2) * 38, y = row * 70, v = rng();
    const inset = 2 + rng() * 2;
    const tint = realm === 0 ? [46, 49, 48] : realm === 1 ? [42, 57, 64] : [44, 62, 76];
    const shade = Math.floor(v * 13);
    polygon(ctx, [[x + inset, y + 3], [x + 72, y + 1], [x + 75, y + 62], [x + 5, y + 66]], `rgb(${tint[0] + shade},${tint[1] + shade},${tint[2] + shade})`, '#101e29', 3);
    line(ctx, [[x + 5, y + 64], [x + 7, y + 6], [x + 70, y + 4]], '#a9c8d329', 1);
    line(ctx, [[x + 8, y + 63], [x + 71, y + 60], [x + 71, y + 9]], '#060d1688', 2);
    for (let i = 0; i < 11; i++) {
      const sx = x + 8 + rng() * 60, sy = y + 8 + rng() * 47;
      ctx.fillStyle = i % 2 ? '#b6d8e813' : '#07142340'; ctx.fillRect(sx, sy, 1 + rng() * 5, 1);
    }
    if (v > .55) {
      const ax = x + 12 + rng() * 45, ay = y + 11;
      line(ctx, [[ax, ay], [ax + 8, ay + 15], [ax - 3, ay + 24], [ax + 4, ay + 39]], '#111c27a0', 1);
      line(ctx, [[ax + 8, ay + 15], [ax + 19, ay + 18]], '#bac8c315', 1);
    }
  }
  // Embedded brass channels and the cracked lava conduits.
  for (const x of [166, 1102]) {
    ctx.fillStyle = '#0a1520'; ctx.fillRect(x - 10, 0, 20, 800);
    ctx.fillStyle = '#6d654f'; ctx.fillRect(x - 10, 0, 3, 800); ctx.fillRect(x + 8, 0, 2, 800);
    const grad = ctx.createLinearGradient(x - 7, 0, x + 8, 0);
    grad.addColorStop(0, '#552e27'); grad.addColorStop(.5, '#ef9b52'); grad.addColorStop(.65, '#ffe7a0'); grad.addColorStop(1, '#5f3226');
    ctx.fillStyle = grad; ctx.fillRect(x - 6, 0, 12, 800);
    for (let y = 0; y < 800; y += 32) line(ctx, [[x - 10, y], [x + 10, y + 2]], '#20323b', 5);
    for (let y = 10; y < 800; y += 90) glow(ctx, x, y, 75, '#ff9e52', .14);
  }
  [214, 712].forEach(y => {
    line(ctx, [[168, y - 4], [1105, y - 4]], '#0b1720', 12);
    line(ctx, [[170, y - 4], [1104, y - 4]], '#a38d5b', 1);
    line(ctx, [[170, y + 3], [1104, y + 3]], '#4d6b78', 1);
    for (let x = 180; x < 1100; x += 24) polygon(ctx, [[x, y - 7], [x + 5, y - 3], [x, y + 1], [x - 5, y - 3]], '#847650', '#c0a87940');
  });
  // Foundry sigil: a large inlaid astrolabe, not a boundary wall.
  ctx.save(); ctx.translate(664, 447); ctx.scale(1, .71);
  for (const radius of [117, 130, 227, 235, 253]) ellipse(ctx, 0, 0, radius, radius, null, radius > 200 ? '#a6986f55' : '#86a8b655', radius === 235 ? 4 : 1);
  for (let i = 0; i < 64; i++) {
    const a = i / 64 * TAU;
    line(ctx, [[Math.cos(a) * 236, Math.sin(a) * 236], [Math.cos(a) * (i % 4 ? 244 : 251), Math.sin(a) * (i % 4 ? 244 : 251)]], '#b4a17265', i % 4 ? 1 : 2);
  }
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU;
    line(ctx, [[Math.cos(a) * 137, Math.sin(a) * 137], [Math.cos(a) * 218, Math.sin(a) * 218]], '#9aacaf36', 1);
    const x = Math.cos(a) * 185, y = Math.sin(a) * 185;
    polygon(ctx, [[x, y - 11], [x + 7, y], [x, y + 11], [x - 7, y]], null, '#9db1b250');
  }
  ctx.restore();
  // Edge masonry and glacial growths form a continuous world beyond the play lanes.
  for (let i = 0; i < 17; i++) {
    const x = i * 84 - 20;
    polygon(ctx, [[x, 150], [x + 70, 145], [x + 78, 185], [x + 8, 196]], '#263b49', '#5f7a87');
    polygon(ctx, [[x + 8, 196], [x + 78, 185], [x + 77, 209], [x + 8, 218]], '#142733', '#385665');
    for (let j = 0; j < 3; j++) line(ctx, [[x + 15, 160 + j * 9], [x + 62, 155 + j * 9]], '#92c1cc20');
  }
  for (let i = 0; i < 14; i++) {
    const x = i % 2 ? 1170 + rng() * 60 : 20 + rng() * 100, y = 245 + Math.floor(i / 2) * 83;
    crystalCluster(ctx, x, y, 58 + rng() * 58, i * 8 + 31, realm === 0 && i % 3 === 0 ? 'amber' : 'ice');
  }
  for (let i = 0; i < 10; i++) {
    crystalCluster(ctx, 190 + i * 111, 205 + rng() * 13, 35 + rng() * 40, i * 31 + 9);
    crystalCluster(ctx, 175 + i * 114, 802 + rng() * 20, 45 + rng() * 37, i * 11 + 55);
  }
  for (let i = 0; i < 48; i++) {
    const x = 180 + rng() * 914, y = 225 + rng() * 485;
    if (i % 3) polygon(ctx, [[x - 4, y], [x + 6, y - 4], [x + 3, y + 3]], '#8ba9b955', '#b8e1eb30');
    else { ellipse(ctx, x, y, 7, 3, '#172a34'); line(ctx, [[x - 6, y - 2], [x, y - 4], [x + 7, y]], '#6e84904d'); }
  }
  const light = ctx.createRadialGradient(650, 410, 50, 650, 410, 740);
  light.addColorStop(0, '#a5ccdc0c'); light.addColorStop(.65, '#06162500'); light.addColorStop(1, '#020b1e9c');
  ctx.fillStyle = light; ctx.fillRect(0, 0, 1280, 800);
  return canvas;
}

export function heroArt(ctx, p, time, element, scale = 1) {
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(scale, scale);
  groundShadow(ctx, 0, 0, 20, 55);
  const s = Math.sin(p.walk || time * 3);
  const aim = p.angle || -.5;
  // Boots and split coat tails establish a grounded artisan silhouette.
  polygon(ctx, [[-13, -7], [-1, -5], [-4 + s * 3, 11], [-15 + s * 3, 10]], '#1b252c', '#7e735d', 1.5);
  polygon(ctx, [[2, -5], [12, -9], [18 - s * 3, 8], [7 - s * 3, 13]], '#202b32', '#7e735d', 1.5);
  polygon(ctx, [[-16, -42], [11, -43], [22, -10], [5, 3], [0, -7], [-15, 3], [-23, -10]], '#173c4c', '#b6aa79', 1.5);
  polygon(ctx, [[-15, -37], [-3, -35], [-4, -6], [-17, -1]], '#24586b');
  polygon(ctx, [[2, -35], [12, -37], [18, -7], [5, -4]], '#122c3a');
  for (let i = 0; i < 4; i++) line(ctx, [[-14 + i * 4, -24], [-17 + i * 5, -4]], '#5f9caf40', .8);
  // Ceramic heat canister and copper harness.
  ellipse(ctx, -17, -31, 8, 13, '#645b46', '#e0bc7c', 1.5);
  ellipse(ctx, -18, -34, 5, 9, '#e1c18b', '#f0dbad');
  line(ctx, [[-13, -45], [11, -15], [15, -15]], '#be9560', 4);
  line(ctx, [[-20, -15], [13, -17]], '#b7a079', 5);
  polygon(ctx, [[-3, -20], [3, -20], [4, -14], [-2, -13]], '#dfc88d', '#fff0bd');
  // Fireproof collar, brass mask and glass visor.
  ellipse(ctx, -1, -42, 13, 7, '#d1c1a1', '#4b574e', 2);
  polygon(ctx, [[-12, -59], [-4, -66], [8, -62], [13, -50], [6, -41], [-7, -43], [-14, -51]], '#8a7653', '#e3c28b', 1.5);
  polygon(ctx, [[-6, -57], [8, -58], [10, -51], [-3, -48]], '#193b4c', '#d9d9b4');
  line(ctx, [[-4, -54], [6, -55]], '#b3f2ff', 2);
  ellipse(ctx, -12, -50, 4, 5, '#bba079', '#f1d8a1');
  // A long crafted blowpipe, aimed in world space.
  const handX = Math.cos(aim) * 19, handY = Math.sin(aim) * 12 - 29;
  line(ctx, [[6, -36], [handX, handY]], '#e3c28b', 8);
  line(ctx, [[6, -36], [handX, handY]], '#345568', 5);
  line(ctx, [[handX - Math.cos(aim) * 5, handY - Math.sin(aim) * 5], [handX + Math.cos(aim) * 47, handY + Math.sin(aim) * 47]], '#0e1820', 7);
  line(ctx, [[handX - Math.cos(aim) * 5, handY - Math.sin(aim) * 5], [handX + Math.cos(aim) * 47, handY + Math.sin(aim) * 47]], '#cbb98b', 4);
  line(ctx, [[handX, handY - 1], [handX + Math.cos(aim) * 47, handY + Math.sin(aim) * 47 - 1]], '#f3ead3', 1);
  for (let i = 0; i < 3; i++) ellipse(ctx, handX + Math.cos(aim) * (14 + i * 4), handY + Math.sin(aim) * (14 + i * 4), 2, 3, '#8d6c46');
  glow(ctx, handX + Math.cos(aim) * 48, handY + Math.sin(aim) * 48, 15, element, .65);
  if (p.invuln > 0) { ctx.globalAlpha = .45 + Math.sin(time * 25) * .2; ellipse(ctx, 0, -26, 27, 43, null, '#c1f3ff', 2); }
  ctx.restore();
}

export function foeArt(ctx, e, time, def) {
  ctx.save(); ctx.translate(e.x, e.y);
  const r = e.r, bob = e.trapped ? Math.sin(time * 3 + e.id) * 4 : Math.sin(e.age * 5) * 2;
  groundShadow(ctx, 0, 0, r * .9, 33, e.trapped ? .2 : .6);
  if (e.spawn > 0) { ctx.globalAlpha = clamp(1 - e.spawn * 1.5, .1, 1); ellipse(ctx, 0, 0, r * 1.4, r * .65, null, '#f0b76d', 2); }
  ctx.translate(0, -bob);
  if (e.kind === 'rime') {
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7 + .3, x = Math.cos(a) * r * .65;
      line(ctx, [[x * .6, -r * .7], [x * 1.4, -r * .25], [x * 1.9, r * .2 + Math.sin(e.age * 8 + i) * 2]], '#6d9dab', 4);
    }
    polygon(ctx, [[-r, -r * .7], [-r * .65, -r * 1.65], [0, -r * 2.05], [r * .7, -r * 1.4], [r, -r * .5], [0, -r * .1]], '#43718a', '#a9e3ed', 1.4);
    polygon(ctx, [[0, -r * 2.05], [-r * .3, -r * .9], [-r, -r * .7], [-r * .65, -r * 1.65]], '#8ac3d0');
    polygon(ctx, [[0, -r * 2.05], [r * .7, -r * 1.4], [-r * .3, -r * .9]], '#c1e9ed');
    line(ctx, [[-8, -15], [-3, -17]], '#071822', 4); line(ctx, [[3, -17], [8, -15]], '#071822', 4);
    line(ctx, [[-7, -16], [-3, -16]], '#d0faff', 1.5); line(ctx, [[3, -16], [7, -16]], '#d0faff', 1.5);
    crystal(ctx, -6, -29, 17, -.4, 'ice', 17);
  } else if (e.kind === 'cinder') {
    const flap = Math.sin(e.age * 16) * .25;
    polygon(ctx, [[-2, -14], [-35, -29 - flap * 20], [-27, -5], [-9, -1], [-4, 7]], '#925d3d', '#f0b36e');
    polygon(ctx, [[2, -14], [35, -29 + flap * 20], [27, -5], [9, -1], [4, 7]], '#a16844', '#f4b26b');
    line(ctx, [[-5, -10], [-28, -21]], '#ffc883'); line(ctx, [[5, -10], [28, -21]], '#ffc883');
    ellipse(ctx, 0, -9, 7, 16, '#64412f', '#dbb27a');
    ellipse(ctx, 0, -14, 3, 7, '#ffe3a1');
    line(ctx, [[-2, -24], [-9, -33]], '#ceb08a', 1.5); line(ctx, [[2, -24], [9, -33]], '#ceb08a', 1.5);
    glow(ctx, 0, -10, 25, '#ffad57', .35);
  } else if (e.kind === 'spitter') {
    for (let i = 0; i < 5; i++) line(ctx, [[-15 + i * 7, -8], [-23 + i * 11, 3 + Math.sin(e.age * 3 + i) * 3]], '#6c8b9b', 4);
    ellipse(ctx, 0, -20, 22, 17, '#263b53', '#b0c6dd', 1.5);
    polygon(ctx, [[-19, -28], [-9, -43], [11, -41], [23, -25], [2, -18]], '#738fac', '#b5d8e5');
    crystal(ctx, 0, -26, 27, .1, 'ice', 45);
    ellipse(ctx, 0, -15, 9, 9, '#0b1729', '#91b4db', 2);
    ellipse(ctx, 0, -15, 4, 5, '#d7c0ff');
  } else {
    const knight = e.kind === 'charger';
    line(ctx, [[-10, -7], [-16, 7]], '#3c505b', 9); line(ctx, [[10, -7], [17, 7]], '#3c505b', 9);
    line(ctx, [[-18, 7], [-8, 7]], '#b4bdaf', 3); line(ctx, [[10, 7], [22, 7]], '#b4bdaf', 3);
    polygon(ctx, [[-r, -41], [r * .7, -46], [r, -13], [0, -1], [-r, -13]], knight ? '#345d70' : '#706348', '#b8bb9b', 1.5);
    polygon(ctx, [[-r, -41], [-4, -30], [0, -1], [-r, -13]], knight ? '#528094' : '#9b885d');
    polygon(ctx, [[0, -47], [-11, -55], [-4, -68], [12, -64], [16, -49]], '#425766', '#c8c6a2', 1.5);
    line(ctx, [[0, -54], [12, -53]], knight ? '#92eeff' : '#ffd597', 3);
    crystal(ctx, -18, -41, 28, -.45, knight ? 'ice' : 'amber', 34);
    crystal(ctx, 18, -37, 25, .4, knight ? 'ice' : 'amber', 51);
    if (!knight) {
      polygon(ctx, [[-29, -34], [-9, -39], [-3, -16], [-14, -1], [-32, -12]], '#3a443e', '#cfbc7c', 2);
      polygon(ctx, [[-21, -30], [-14, -21], [-20, -10], [-27, -19]], '#e2bd78');
    } else { line(ctx, [[22, -29], [35, -58]], '#e1e4c2', 4); polygon(ctx, [[30, -54], [39, -76], [42, -52]], '#9dd9e9', '#d8f5f6'); }
  }
  if (e.hit > 0) { ctx.globalCompositeOperation = 'lighter'; ellipse(ctx, 0, -22, r, r * 1.3, '#d9f6ff7f'); }
  ctx.restore();
  if (e.hp < e.maxHp && !e.trapped) {
    ctx.fillStyle = '#101a22'; ctx.fillRect(e.x - 17, e.y - e.r * 2 - 15, 34, 4);
    ctx.fillStyle = '#c9c198'; ctx.fillRect(e.x - 16, e.y - e.r * 2 - 14, 32 * Math.max(0, e.hp / e.maxHp), 2);
  }
}

export function bossArt(ctx, b, time) {
  const x = b.x, y = b.y, r = b.r, solar = b.type === 'solar';
  const gold = solar ? '#efc58c' : '#a1dded';
  groundShadow(ctx, x, y, r * 1.3, 145, .85);
  ellipse(ctx, x, y + 1, r * 1.3, r * .49, '#182b36', '#a48e60', 3);
  ellipse(ctx, x, y - 7, r * 1.19, r * .43, '#3f4b4b', '#c7ad74', 2);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU + time * .12;
    const px = x + Math.cos(a) * r * 1.25, py = y - 14 + Math.sin(a) * r * .48;
    polygon(ctx, [[px - 6, py], [px + 4, py - 5], [px + 9, py + 5], [px - 2, py + 9]], '#647478', '#ccba85');
  }
  ctx.save(); ctx.translate(x, y - 68);
  // Rotating metal corona, each tooth attached to an articulated arm.
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU + time * .12;
    const inn = r * .88, out = r * (i % 2 ? 1.47 : 1.7);
    const cs = Math.cos(a), sn = Math.sin(a), tx = -sn * 7, ty = cs * 7;
    line(ctx, [[cs * inn, sn * inn], [cs * out, sn * out]], '#172b36', 9);
    polygon(ctx, [[cs * inn + tx, sn * inn + ty], [cs * out + tx * .4, sn * out + ty * .4], [cs * (out + 10), sn * (out + 10)], [cs * out - tx * .4, sn * out - ty * .4], [cs * inn - tx, sn * inn - ty]], '#8b744c', gold, 1.3);
    ellipse(ctx, cs * r * 1.17, sn * r * 1.17, 4, 4, '#c6b381', '#ffe5a3');
  }
  ellipse(ctx, 0, 0, r * 1.01, r * 1.01, '#182c38', '#c6b88b', 4);
  ellipse(ctx, 0, 0, r * .87, r * .87, '#6f4129', '#e5ba73', 4);
  ellipse(ctx, 0, 0, r * .78, r * .78, '#3d2720', gold, 1);
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * TAU - time * .2;
    line(ctx, [[Math.cos(a) * r * .81, Math.sin(a) * r * .81], [Math.cos(a) * r * .92, Math.sin(a) * r * .92]], '#fff1bf', 2);
  }
  const core = ctx.createRadialGradient(-r * .2, -r * .2, 1, 0, 0, r * .74);
  core.addColorStop(0, '#fffce0'); core.addColorStop(.3, solar ? '#fff5be' : '#edfcff'); core.addColorStop(.55, solar ? '#ffc65b' : '#88e3fc'); core.addColorStop(.85, solar ? '#db6730' : '#3078b3'); core.addColorStop(1, solar ? '#783324' : '#1b3759');
  ellipse(ctx, 0, 0, r * .71, r * .71, core, solar ? '#ffe3a2' : '#b6f2ff', 2);
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.arc(0, 0, r * (.34 + i * .095), time * .4 + i * 1.9, time * .4 + i * 1.9 + 3.5);
    ctx.strokeStyle = i % 2 ? '#fff9d195' : '#e8884b80'; ctx.lineWidth = 2 + i % 2; ctx.stroke();
  }
  ellipse(ctx, 0, 0, r * .26, r * .26, '#fff5c8', '#fffadd', 2);
  polygon(ctx, [[0, -r * .38], [r * .15, 0], [0, r * .38], [-r * .15, 0]], '#fffbe6', '#fffef1', 1);
  glow(ctx, 0, 0, r * 2.2, solar ? '#ffac4e' : '#51bfff', b.hit > 0 ? .8 : .4);
  ctx.restore();
  // Gimbal legs, articulated steel feet, glass feed lines.
  for (const side of [-1, 1]) {
    line(ctx, [[x + side * 45, y - 38], [x + side * 73, y - 12], [x + side * 82, y + 15]], '#101c24', 13);
    line(ctx, [[x + side * 45, y - 38], [x + side * 73, y - 12], [x + side * 82, y + 15]], '#8c8566', 8);
    ellipse(ctx, x + side * 73, y - 12, 7, 7, '#394a50', gold, 2);
    polygon(ctx, [[x + side * 70, y + 11], [x + side * 94, y + 9], [x + side * 101, y + 20], [x + side * 73, y + 23]], '#3b4d51', '#b6a377');
  }
}
