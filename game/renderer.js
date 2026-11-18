import { W, H, TAU, ellipse, polygon, random, clamp } from './math.js';
import { makeArena, crystalCluster, furnace, heroArt, foeArt, bossArt, crateArt, glow, text, line, groundShadow } from './art.js';
import { ELEMENTS, FOES } from './content.js';
import { COVER } from './simulation.js';
import { arrangeCombatLabels } from './combat-labels.js';
import { thermalAir, moltenThread, FURNACE_FRACTURES } from './atmosphere.js';

export class FoundryRenderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    this.arenas = new Map(); this.frameMs = []; this.renderCount = 0; this.lastRealm = -1;
    this.glassStamp = new Map(); this.drawMs = 0;
    this.bloomBuffer = document.createElement('canvas');
    this.bloomBuffer.width = 320; this.bloomBuffer.height = 200;
    this.bloom = this.bloomBuffer.getContext('2d');
    this.worldLabels = []; this.labelLayout = []; this.labelsVisible = false;
  }
  arena(realm) { if (!this.arenas.has(realm)) this.arenas.set(realm, makeArena(realm)); return this.arenas.get(realm); }
  bubble(ctx, b, run) {
    const color = ELEMENTS[b.element].color;
    const x = b.x, y = b.y - 23 - Math.sin(b.age * 2.2) * 3, r = b.r;
    groundShadow(ctx, b.x, b.y + 15, r * .8, 18, .25);
    glow(ctx, x, y, r * 1.55, color, .22);
    const fill = ctx.createRadialGradient(x - r * .3, y - r * .45, 1, x, y, r);
    fill.addColorStop(0, '#e4fcff10'); fill.addColorStop(.55, color + '0d'); fill.addColorStop(.8, color + '23'); fill.addColorStop(.94, color + '4a'); fill.addColorStop(1, color + '8a');
    ellipse(ctx, x, y, r, r, fill, color + 'c9', 1.8);
    // An emissive interior remains translucent so trapped silhouettes are readable.
    const ember = ctx.createRadialGradient(x + r * .15, y + r * .28, 0, x, y + r * .1, r * .78);
    ember.addColorStop(0, color + '62'); ember.addColorStop(.23, color + '29'); ember.addColorStop(1, color + '00');
    ellipse(ctx, x, y, r * .92, r * .92, ember);
    const spectrum = ['#a8ffff', '#94b6ff', '#e1a9ff', '#ffc0cf', '#ffe3a8', '#aaf5db'];
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < spectrum.length; i++) {
      const a = i / spectrum.length * TAU + b.age * .055;
      ctx.beginPath(); ctx.arc(x, y, r * .98, a, a + TAU / spectrum.length + .02);
      ctx.strokeStyle = spectrum[(i + b.element * 2) % spectrum.length]; ctx.lineWidth = 2.2; ctx.stroke();
    }
    ctx.restore();
    ellipse(ctx, x, y, Math.max(1, r - 4), Math.max(1, r - 4), null, '#e2faff46', .8);
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r * .93, -2.8, -1.12); ctx.strokeStyle = '#f0ffff'; ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r * .96, .35, 1.3); ctx.strokeStyle = '#ffd7a8c0'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r * .88, 1.5, 2.6); ctx.strokeStyle = '#dabaffb0'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x - r * .32, y - r * .48, r * .23, r * .09, -.65, 0, TAU); ctx.fillStyle = '#e9ffff9c'; ctx.fill();
    ellipse(ctx, x - r * .38, y - r * .59, r * .065, r * .065, '#fbffff');
    const caustic = ctx.createLinearGradient(x - r, y, x + r, y);
    caustic.addColorStop(0, '#8cddff00'); caustic.addColorStop(.35, '#c0faff90'); caustic.addColorStop(.6, '#fff1cdb0'); caustic.addColorStop(1, '#e8a8ff00');
    ctx.beginPath(); ctx.ellipse(x, y + r * .55, r * .66, r * .15, -.17, 0, Math.PI);
    ctx.strokeStyle = caustic; ctx.lineWidth = 3; ctx.stroke();
    ellipse(ctx, x + r * .42, y + r * .38, r * .08, r * .13, '#ffedbe60');
    // Thin caustic arc crossing the glass surface.
    ctx.beginPath(); ctx.ellipse(x, y, r * .97, r * .26, -.32, .05, 3.05); ctx.strokeStyle = '#cbf7ff3a'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    if (b.trappedIds.length && this.labelsVisible) {
      this.worldLabels.push({ text: 'TRAPPED!', x, y: y - r - 15, size: 15, color: '#d7fbff', life: 1, maxLife: 1, priority: 60 });
      ellipse(ctx, x, y + r + 9, 17, 8, '#122b37b0', color + '80');
      text(ctx, `${b.trappedIds.length}`, x, y + r + 9, 10, color);
    }
    if (!b.active && r > 18) {
      ctx.save(); ctx.setLineDash([3, 5]); ellipse(ctx, x, y, r + 7, r + 7, null, color + '80'); ctx.restore();
    }
  }
  render(run, time, input) {
    const start = performance.now(), ctx = this.ctx;
    const title = run.state === 'title', realm = title ? 2 : run.realm;
    this.labelsVisible = run.state === 'playing'; this.worldLabels = []; this.labelLayout = [];
    ctx.drawImage(this.arena(realm), 0, 0);
    ctx.save();
    if (run.shake > 0 && !run.reducedMotion) ctx.translate(Math.sin(time * 99) * run.shake * 4, Math.sin(time * 121) * run.shake * 2.5);
    this.drawAmbient(ctx, time, realm);
    if (title) this.drawTitleWorld(ctx, time);
    else { this.drawCombat(ctx, run, time, input); this.drawBloom(ctx, run); }
    // World typography is drawn after light post-processing: it never blooms.
    if (this.labelsVisible) this.drawLabels(ctx, run);
    ctx.restore();
    // Natural falloff keeps readable HUD edges without a frame around the world.
    const vignette = ctx.createRadialGradient(640, 420, 250, 640, 400, 810);
    vignette.addColorStop(0, '#040d1600'); vignette.addColorStop(.75, '#0713241c'); vignette.addColorStop(1, '#040d1860');
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
    if (run.flash > 0) { ctx.fillStyle = `rgba(205,76,48,${run.flash * .55})`; ctx.fillRect(0, 0, W, H); }
    this.renderCount++; this.drawMs = performance.now() - start;
  }
  drawBloom(ctx, run) {
    const light = this.bloom;
    light.clearRect(0, 0, 320, 200);
    light.save(); light.scale(.25, .25);
    for (const bubble of run.bubbles.concat(run.charge || [])) {
      const color = ELEMENTS[bubble.element].color;
      ellipse(light, bubble.x, bubble.y - 24, bubble.r, bubble.r, null, color + '90', 3);
    }
    if (run.boss) {
      const b = run.boss;
      ellipse(light, b.x, b.y - 68, b.r * .57, b.r * .57, b.type === 'solar' ? '#ffd77f80' : '#8de5ff80');
    }
    for (const ring of run.rings) {
      const radius = ring.radius * (1 - ring.life / ring.maxLife);
      ellipse(light, ring.x, ring.y - 12, Math.max(1, radius), Math.max(1, radius * .62), null, ring.color + '68', 4);
    }
    for (let i = 0; i < run.particles.length; i += 3) {
      const p = run.particles[i];
      ellipse(light, p.x, p.y - p.z, 2.5, 2.5, p.color + 'a0');
    }
    for (const points of FURNACE_FRACTURES) {
      light.beginPath(); points.forEach(([x, y], i) => i ? light.lineTo(x, y) : light.moveTo(x, y));
      light.strokeStyle = '#ff9e4750'; light.lineWidth = 5; light.stroke();
    }
    light.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = .18; ctx.filter = 'blur(13px)'; ctx.drawImage(this.bloomBuffer, 0, 0, 1280, 800);
    ctx.globalAlpha = .12; ctx.filter = 'blur(4px)'; ctx.drawImage(this.bloomBuffer, 0, 0, 1280, 800);
    ctx.restore();
  }
  drawAmbient(ctx, time, realm) {
    thermalAir(ctx, time, realm);
    for (let i = 0; i < 42; i++) {
      const x = (i * 283.73 + Math.sin(time * .15 + i) * 12) % W, y = (i * 97.37 - time * (5 + i % 7) + H * 100) % H;
      ctx.globalAlpha = .13 + (Math.sin(time + i) + 1) * .12;
      ellipse(ctx, x, y, i % 5 === 0 ? 1.5 : .7, i % 5 === 0 ? 1.5 : .7, i % 3 ? '#b8e6f7' : '#ffc38b');
    }
    ctx.globalAlpha = 1;
    for (const cover of COVER) if (cover.kind === 'furnace') glow(ctx, cover.x, cover.y - 30, 118, '#ffb05e', .12);
  }
  drawTitleWorld(ctx, time) {
    const decor = [
      { x: 223, y: 448, r: 68, element: 0, age: time, active: true, trappedIds: [] },
      { x: 1082, y: 419, r: 73, element: 1, age: time + 1, active: true, trappedIds: [] },
      { x: 1136, y: 582, r: 35, element: 2, age: time + 2, active: true, trappedIds: [] },
    ];
    for (const cover of COVER) {
      if (cover.kind === 'ice') crystalCluster(ctx, cover.x, cover.y, 75, cover.seed);
      else furnace(ctx, cover.x, cover.y, 27, time);
    }
    for (const b of decor) this.bubble(ctx, b);
    heroArt(ctx, { x: 1010, y: 645, angle: -1.9, walk: 0, invuln: 0 }, time, '#a0e8ff', 1.4);
    ctx.fillStyle = '#07121de5'; ctx.fillRect(275, 0, 730, 800);
    const edge = ctx.createLinearGradient(180, 0, 1110, 0);
    edge.addColorStop(0, '#06132100'); edge.addColorStop(.12, '#07121dc0'); edge.addColorStop(.88, '#07121dc0'); edge.addColorStop(1, '#06132100');
    ctx.fillStyle = edge; ctx.fillRect(180, 0, 930, 800);
  }
  drawCombat(ctx, run, time, input) {
    this.drawTelegraphs(ctx, run, time);
    for (const b of run.bubbles) {
      for (const o of run.bubbles) if (o.id > b.id && Math.hypot(o.x - b.x, o.y - b.y) < b.r + o.r + run.stats.chainRange) {
        ctx.save(); ctx.setLineDash([3, 7]); line(ctx, [[b.x, b.y - 24], [o.x, o.y - 24]], '#d1f6ff70', 1); ctx.restore();
      }
    }
    for (const pickup of run.pickups) this.drawPickup(ctx, pickup, time);
    // Stable painter order is also used by curated captures, never a separate screenshot renderer.
    const objects = [
      ...COVER.map(c => ({ y: c.y, type: 'cover', value: c })),
      ...run.crates.filter(c => c.hp > 0).map(c => ({ y: c.y, type: 'crate', value: c })),
      ...run.enemies.map(e => ({ y: e.y, type: 'foe', value: e })),
      { y: run.player.y, type: 'hero', value: run.player },
    ];
    if (run.boss) objects.push({ y: run.boss.y, type: 'boss', value: run.boss });
    objects.sort((a, b) => a.y - b.y);
    for (const object of objects) {
      if (object.type === 'cover') { const c = object.value; if (c.kind === 'ice') crystalCluster(ctx, c.x, c.y, c.r * 2.4, c.seed); else furnace(ctx, c.x, c.y, c.r, time); }
      if (object.type === 'crate') crateArt(ctx, object.value);
      if (object.type === 'foe') foeArt(ctx, object.value, time, FOES[object.value.kind]);
      if (object.type === 'hero') heroArt(ctx, object.value, time, ELEMENTS[run.element].color, 1.12);
      if (object.type === 'boss') bossArt(ctx, object.value, time);
    }
    for (const b of run.bubbles) this.bubble(ctx, b, run);
    if (run.charge) {
      const b = run.charge;
      moltenThread(ctx, { x: run.player.x + Math.cos(run.player.angle) * 57, y: run.player.y - 30 + Math.sin(run.player.angle) * 57 }, { x: b.x, y: b.y - 23 }, ELEMENTS[b.element].color, time);
      this.bubble(ctx, b, run);
    }
    this.drawBossLaser(ctx, run.boss, time);
    for (const b of run.bullets) {
      if (b.tail?.length) line(ctx, [...b.tail].reverse().map(p => [p.x, p.y - 17]).concat([[b.x, b.y - 17]]), b.color + '60', 3);
      glow(ctx, b.x, b.y - 17, 19, b.color, .7);
      polygon(ctx, [[b.x - 7, b.y - 17], [b.x, b.y - 23], [b.x + 7, b.y - 17], [b.x, b.y - 11]], b.color, '#fff0c5', 1);
    }
    for (const ring of run.rings) this.drawShockwave(ctx, ring);
    for (const p of run.particles) this.drawShard(ctx, p);
    // Cursor with a hollow center so it never covers a target.
    if (run.state === 'playing' && input && !run.curated) {
      const x = input.x, y = input.y;
      ellipse(ctx, x, y, 9, 9, null, '#e2f6eacc', 1);
      for (let i = 0; i < 4; i++) { const a = i * TAU / 4; line(ctx, [[x + Math.cos(a) * 12, y + Math.sin(a) * 12], [x + Math.cos(a) * 17, y + Math.sin(a) * 17]], ELEMENTS[run.element].color, 1); }
    }
    if (run.bannerTime > 0 && run.banner && this.labelsVisible) {
      ctx.save(); ctx.globalAlpha = Math.min(1, run.bannerTime * 2);
      const bg = ctx.createLinearGradient(270, 0, 1000, 0); bg.addColorStop(0, '#0b1d2b00'); bg.addColorStop(.3, '#10202dda'); bg.addColorStop(.7, '#10202dda'); bg.addColorStop(1, '#0b1d2b00');
      ctx.fillStyle = bg; ctx.fillRect(260, 249, 740, 48); text(ctx, run.banner, 630, 272, 19, '#f3d5a1', 'Georgia, serif', 600); ctx.restore();
    }
  }
  drawLabels(ctx, run) {
    const candidates = this.worldLabels.concat(run.labels.map(label => ({ ...label, priority: label.text.startsWith('CHAIN') ? 100 : label.text === 'AETHER GLASSBLOWER' ? 90 : label.text.startsWith('+') ? 70 : 50 })));
    this.labelLayout = arrangeCombatLabels(candidates, label => {
      ctx.font = `800 ${label.size}px ${label.size > 27 ? 'Georgia, serif' : 'sans-serif'}`;
      return ctx.measureText(label.text).width;
    });
    for (const label of this.labelLayout) {
      ctx.save(); ctx.globalAlpha = clamp(label.life / Math.min(.3, label.maxLife), 0, 1);
      text(ctx, label.text, label.x, label.y, label.size, label.color, label.size > 27 ? 'Georgia, serif' : 'sans-serif', 800);
      ctx.restore();
    }
  }
  drawPickup(ctx, p, time) {
    const bob = Math.sin(time * 3 + p.x) * 3, color = p.kind === 'health' ? '#f0adad' : p.kind === 'breath' ? '#a5ecea' : '#ebca81';
    glow(ctx, p.x, p.y - 7 + bob, 22, color, .3);
    polygon(ctx, [[p.x, p.y - 17 + bob], [p.x + 7, p.y - 7 + bob], [p.x, p.y + 2 + bob], [p.x - 7, p.y - 7 + bob]], color, '#fff3c5', .8);
    polygon(ctx, [[p.x, p.y - 17 + bob], [p.x, p.y + 2 + bob], [p.x - 7, p.y - 7 + bob]], '#16394670');
    if (p.kind === 'health') { line(ctx, [[p.x - 3, p.y - 7 + bob], [p.x + 3, p.y - 7 + bob]], '#862f42', 2); line(ctx, [[p.x, p.y - 10 + bob], [p.x, p.y - 4 + bob]], '#862f42', 2); }
  }
  drawTelegraphs(ctx, run, time) {
    const b = run.boss;
    if (b) {
      ellipse(ctx, b.x, b.y - 1, b.r * 1.6, b.r * .68, null, '#edb16d70', 1);
      ctx.save(); ctx.setLineDash([4, 8]); ellipse(ctx, b.x, b.y - 1, b.r * 1.7, b.r * .73, null, '#f3c58a70', 1); ctx.restore();
    }
    for (const e of run.enemies) if (e.charge > 0) {
      ctx.save(); ctx.globalAlpha = .5;
      line(ctx, [[e.x, e.y], [e.x + e.ax * 190, e.y + e.ay * 190]], '#ffc494', 21);
      ctx.setLineDash([5, 8]); line(ctx, [[e.x, e.y], [e.x + e.ax * 190, e.y + e.ay * 190]], '#ffe7ad', 1); ctx.restore();
    }
  }
  drawBossLaser(ctx, b, time) {
    if (!b?.laser) return;
    const laser = b.laser, x = b.x, y = b.y - 24;
    const endX = x + Math.cos(laser.angle) * (laser.length || 800), endY = y + Math.sin(laser.angle) * (laser.length || 800);
    ctx.save(); ctx.lineCap = 'round';
    if (laser.time <= laser.tell) {
      ctx.setLineDash([9, 7]); line(ctx, [[x, y], [endX, endY]], '#ffb570b0', 2);
    } else {
      ctx.globalCompositeOperation = 'lighter'; line(ctx, [[x, y], [endX, endY]], '#ed713730', 27);
      line(ctx, [[x, y], [endX, endY]], '#ffb64d70', 12); line(ctx, [[x, y], [endX, endY]], '#fff0b6', 3);
      // Offset wavering contours suggest heat shimmer without moving its hitbox.
      for (const side of [-1, 1]) {
        const contour = [];
        for (let i = 0; i <= 24; i++) {
          const t = i / 24, offset = side * (13 + Math.sin(t * 33 - time * 15) * 3);
          contour.push([x + (endX - x) * t - Math.sin(laser.angle) * offset, y + (endY - y) * t + Math.cos(laser.angle) * offset]);
        }
        line(ctx, contour, '#ffc78725', 1.1);
      }
      glow(ctx, endX, endY, 26, '#ffbf77', .8);
    }
    ctx.restore();
  }
  drawShockwave(ctx, r) {
    const progress = 1 - r.life / r.maxLife, radius = Math.max(2, r.radius * (.18 + .82 * progress));
    ctx.save(); ctx.globalAlpha = (1 - progress) * .85; ctx.globalCompositeOperation = 'lighter';
    ellipse(ctx, r.x, r.y - 12, radius, radius * .62, null, r.color + '2a', 22 * (1 - progress) + 2);
    ellipse(ctx, r.x, r.y - 12, radius, radius * .62, null, r.color, 2.2);
    ellipse(ctx, r.x, r.y - 12, radius * .86, radius * .53, null, '#edfaff8c', .8);
    const rng = random(Math.floor(r.x));
    for (let i = 0; i < 22; i++) {
      const a = i / 22 * TAU, len = 8 + rng() * 21;
      line(ctx, [[r.x + Math.cos(a) * radius * .92, r.y - 12 + Math.sin(a) * radius * .57], [r.x + Math.cos(a) * (radius + len), r.y - 12 + Math.sin(a) * (radius + len) * .62]], r.color + 'b0', 1.4);
    }
    ctx.restore();
  }
  drawShard(ctx, p) {
    ctx.save(); ctx.globalAlpha = clamp(p.life / .3, 0, 1); ctx.translate(p.x, p.y - p.z); ctx.rotate(p.angle);
    const s = p.size;
    polygon(ctx, [[-s * .4, -s], [s * .8, -s * .2], [s * .1, s], [-s * .6, s * .2]], p.color + '9c', p.color, .7);
    polygon(ctx, [[-s * .4, -s], [s * .1, s], [-s * .6, s * .2]], '#effcffb0');
    ctx.restore();
  }
}
