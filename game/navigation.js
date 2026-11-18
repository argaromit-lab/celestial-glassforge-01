import { clamp } from './math.js';

// A compact A* grid for navigating the six solid arena props. The gameplay
// collider remains authoritative; this only supplies a useful steering target.
// Diagonal movement cannot cut through the corner of two blocked cells.
export class ArenaNavigation {
  constructor(obstacles, radius = 18) {
    this.left = 210;
    this.top = 260;
    this.step = 22;
    this.columns = 38;
    this.rows = 19;
    this.size = this.columns * this.rows;
    this.blocked = new Uint8Array(this.size);
    this.g = new Float64Array(this.size);
    this.f = new Float64Array(this.size);
    this.parent = new Int32Array(this.size);
    this.closed = new Uint8Array(this.size);
    this.openFlag = new Uint8Array(this.size);
    this.obstacles = obstacles;
    this.radius = radius;
    this.bake();
  }

  index(x, y) {
    return y * this.columns + x;
  }

  cell(point) {
    return {
      x: clamp(Math.round((point.x - this.left) / this.step), 0, this.columns - 1),
      y: clamp(Math.round((point.y - this.top) / this.step), 0, this.rows - 1),
    };
  }

  point(index) {
    return {
      x: this.left + index % this.columns * this.step,
      y: this.top + Math.floor(index / this.columns) * this.step,
    };
  }

  bake() {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.columns; x++) {
        const point = this.point(this.index(x, y));
        this.blocked[this.index(x, y)] = this.obstacles.some(obstacle => {
          const distance = Math.hypot(point.x - obstacle.x, point.y - obstacle.y);
          return distance < obstacle.r + this.radius + 4;
        }) ? 1 : 0;
      }
    }
  }

  nearestOpen(index) {
    if (!this.blocked[index]) return index;
    const x = index % this.columns;
    const y = Math.floor(index / this.columns);
    for (let radius = 1; radius < 7; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= this.columns || ny >= this.rows) continue;
          const neighbor = this.index(nx, ny);
          if (!this.blocked[neighbor]) return neighbor;
        }
      }
    }
    return index;
  }

  clearLine(start, end, extra = 0) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length < 1) return true;
    for (const obstacle of this.obstacles) {
      const projection = clamp(((obstacle.x - start.x) * dx + (obstacle.y - start.y) * dy) / (length * length), 0, 1);
      const x = start.x + projection * dx;
      const y = start.y + projection * dy;
      if (Math.hypot(x - obstacle.x, y - obstacle.y) < obstacle.r + this.radius + extra) return false;
    }
    return true;
  }

  findPath(start, goal) {
    if (this.clearLine(start, goal)) return [{ x: goal.x, y: goal.y }];
    const first = this.cell(start);
    const last = this.cell(goal);
    const startIndex = this.nearestOpen(this.index(first.x, first.y));
    const goalIndex = this.nearestOpen(this.index(last.x, last.y));
    this.g.fill(Infinity);
    this.f.fill(Infinity);
    this.parent.fill(-1);
    this.closed.fill(0);
    this.openFlag.fill(0);
    const open = [startIndex];
    this.openFlag[startIndex] = 1;
    this.g[startIndex] = 0;
    this.f[startIndex] = this.heuristic(startIndex, goalIndex);

    while (open.length) {
      let best = 0;
      for (let i = 1; i < open.length; i++) {
        if (this.f[open[i]] < this.f[open[best]]) best = i;
      }
      const current = open.splice(best, 1)[0];
      this.openFlag[current] = 0;
      if (current === goalIndex) return this.reconstruct(startIndex, goalIndex, goal);
      this.closed[current] = 1;
      const x = current % this.columns;
      const y = Math.floor(current / this.columns);

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= this.columns || ny >= this.rows) continue;
          const neighbor = this.index(nx, ny);
          if (this.blocked[neighbor] || this.closed[neighbor]) continue;
          if (dx && dy && (this.blocked[this.index(x + dx, y)] || this.blocked[this.index(x, y + dy)])) continue;
          const score = this.g[current] + (dx && dy ? 1.41421356 : 1);
          if (score >= this.g[neighbor]) continue;
          this.parent[neighbor] = current;
          this.g[neighbor] = score;
          this.f[neighbor] = score + this.heuristic(neighbor, goalIndex);
          if (!this.openFlag[neighbor]) {
            open.push(neighbor);
            this.openFlag[neighbor] = 1;
          }
        }
      }
    }
    return [{ x: goal.x, y: goal.y }];
  }

  heuristic(a, b) {
    const dx = Math.abs(a % this.columns - b % this.columns);
    const dy = Math.abs(Math.floor(a / this.columns) - Math.floor(b / this.columns));
    return Math.max(dx, dy) + .41421356 * Math.min(dx, dy);
  }

  reconstruct(start, goal, exactGoal) {
    const reversed = [];
    let cursor = goal;
    let guard = 0;
    while (cursor !== start && cursor >= 0 && guard++ < this.size) {
      reversed.push(this.point(cursor));
      cursor = this.parent[cursor];
    }
    reversed.reverse();
    if (!reversed.length) return [{ x: exactGoal.x, y: exactGoal.y }];
    // Preserve the exact target only if the final segment is navigable.
    if (this.clearLine(reversed.at(-1), exactGoal, -5)) reversed.push({ x: exactGoal.x, y: exactGoal.y });
    return reversed;
  }

  nextTarget(entity, goal, dt) {
    entity.pathTimer = (entity.pathTimer || 0) - dt;
    const moved = !entity.pathGoal || Math.hypot(goal.x - entity.pathGoal.x, goal.y - entity.pathGoal.y) > 55;
    if (!entity.path || entity.pathTimer <= 0 || moved) {
      entity.path = this.findPath(entity, goal);
      entity.pathGoal = { x: goal.x, y: goal.y };
      entity.pathTimer = .45 + (entity.id % 5) * .05;
    }
    while (entity.path.length > 1 && Math.hypot(entity.x - entity.path[0].x, entity.y - entity.path[0].y) < 23) entity.path.shift();
    return entity.path[0] || goal;
  }
}
