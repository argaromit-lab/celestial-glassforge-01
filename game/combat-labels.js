import { clamp } from './math.js';

export const LABEL_SAFE_AREA = { left: 201, right: 1065, top: 249, bottom: 665 };

export function rectanglesOverlap(a, b, gap = 6) {
  return a.left < b.right + gap && a.right + gap > b.left && a.top < b.bottom + gap && a.bottom + gap > b.top;
}

// All world typography shares one layout pass, including trapped markers.
// If a busy frame has no safe slot, omit its lowest-priority transient label.
// Simulation positions stay untouched: only presentation is displaced.
export function arrangeCombatLabels(candidates, measure, safe = LABEL_SAFE_AREA) {
  const placed = [];
  const sorted = [...candidates].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  for (const label of sorted) {
    if (placed.some(other => other.text === label.text && Math.hypot(other.anchorX - label.x, other.anchorY - label.y) < 100)) continue;
    const width = Math.ceil(measure(label)) + 12;
    const height = Math.ceil(label.size * 1.3) + 6;
    if (width > safe.right - safe.left || height > safe.bottom - safe.top) continue;
    const x = clamp(label.x, safe.left + width / 2, safe.right - width / 2);
    let match = null;
    for (const offset of [0, -32, 32, -64, 64, -96, 96, -128, 128, -160, 160]) {
      const y = clamp(label.y + offset, safe.top + height / 2, safe.bottom - height / 2);
      for (const dx of [0, -80, 80, -160, 160]) {
        const cx = clamp(x + dx, safe.left + width / 2, safe.right - width / 2);
        const box = { left: cx - width / 2, right: cx + width / 2, top: y - height / 2, bottom: y + height / 2 };
        if (!placed.some(other => rectanglesOverlap(box, other.box))) { match = { ...label, x: cx, y, box, anchorX: label.x, anchorY: label.y }; break; }
      }
      if (match) break;
    }
    if (match) placed.push(match);
  }
  return placed;
}
