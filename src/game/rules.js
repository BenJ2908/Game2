// Gameplay data and deterministic geometry helpers shared by the game and tests.
export const WEAPONS = [
  {
    id: "rifle",
    name: "VX-7",
    label: "STURMGEWEHR",
    magazine: 30,
    interval: 0.105,
    reload: 1.55,
    damage: 31,
    head: 3,
    pellets: 1,
    spread: 0.009,
    adsSpread: 0.0015,
    kick: 0.022,
    range: 45,
    color: "#c6f77d",
    description: "Präzise Feuerstöße. Verlässlich auf mittlere Distanz.",
  },
  {
    id: "smg",
    name: "KITE-9",
    label: "MASCHINENPISTOLE",
    magazine: 40,
    interval: 0.064,
    reload: 1.25,
    damage: 23,
    head: 2,
    pellets: 1,
    spread: 0.015,
    adsSpread: 0.004,
    kick: 0.014,
    range: 21,
    color: "#75dce5",
    description: "Extrem schnell. Stark in Bewegung und auf kurze Distanz.",
  },
  {
    id: "shotgun",
    name: "BREACH",
    label: "SCHROTFLINTE",
    magazine: 8,
    interval: 0.72,
    reload: 2.15,
    damage: 19,
    head: 1.5,
    pellets: 9,
    spread: 0.065,
    adsSpread: 0.043,
    kick: 0.085,
    range: 13,
    color: "#ffbb7c",
    description: "Ein Schuss. Neun Pellets. Verheerend aus der Nähe.",
  },
];
export const DIFFICULTIES = {
  relaxed: {
    name: "ENTSPANNT",
    damage: 0.65,
    speed: 0.85,
    score: 0.8,
    label: "Mehr Zeit zum Reagieren. Für deinen ersten Run.",
  },
  standard: {
    name: "STANDARD",
    damage: 1,
    speed: 1,
    score: 1,
    label: "Schnell, fair, fordernd. Der empfohlene Einstieg.",
  },
  veteran: {
    name: "VETERAN",
    damage: 1.3,
    speed: 1.15,
    score: 1.4,
    label: "Weniger Spielraum. Höheres Score-Potenzial.",
  },
};
export const ENEMIES = {
  grunt: {
    name: "SOLDAT",
    hp: 85,
    speed: 3.1,
    damage: 12,
    interval: 2.5,
    windup: 0.65,
    projectile: 17,
    range: 18,
    color: "#ed9771",
    score: 100,
  },
  runner: {
    name: "JÄGER",
    hp: 60,
    speed: 6.8,
    damage: 18,
    interval: 1.35,
    windup: 0.45,
    projectile: 0,
    range: 1.8,
    color: "#ffcf66",
    score: 125,
  },
  sniper: {
    name: "SPÄHER",
    hp: 70,
    speed: 2.4,
    damage: 26,
    interval: 3.6,
    windup: 1.4,
    projectile: 28,
    range: 30,
    color: "#b5a1ff",
    score: 160,
  },
  heavy: {
    name: "BRECHER",
    hp: 260,
    speed: 2.1,
    damage: 15,
    interval: 3.5,
    windup: 1,
    projectile: 15,
    range: 19,
    color: "#f07267",
    score: 300,
  },
  boss: {
    name: "DER AUFSEHER",
    hp: 1800,
    speed: 2.8,
    damage: 18,
    interval: 2.4,
    windup: 1.1,
    projectile: 17,
    range: 24,
    color: "#ff715b",
    score: 2500,
  },
};
export const PERKS = [
  {
    id: "power",
    name: "ÜBERDRUCK",
    icon: "↗",
    text: "+18 % Waffenschaden.",
    max: 3,
  },
  {
    id: "reload",
    name: "FLINKE HÄNDE",
    icon: "»",
    text: "20 % schneller nachladen und Waffen wechseln.",
    max: 3,
  },
  {
    id: "vital",
    name: "ZWEITE LUNGE",
    icon: "+",
    text: "+25 maximale Gesundheit. Sofort vollständig heilen.",
    max: 3,
  },
  {
    id: "dash",
    name: "IMPULS",
    icon: "»",
    text: "25 % kürzerer Dash-Cooldown. +8 % Bewegungstempo.",
    max: 2,
  },
  {
    id: "leech",
    name: "ADRENALIN",
    icon: "+",
    text: "Jede Eliminierung heilt 6 Lebenspunkte.",
    max: 3,
  },
  {
    id: "focus",
    name: "RUHIGE HAND",
    icon: "◎",
    text: "25 % weniger Rückstoß und Streuung.",
    max: 2,
  },
  {
    id: "blast",
    name: "SPRENGMEISTER",
    icon: "✳",
    text: "+1 Granatenkapazität. +25 % Explosionsradius.",
    max: 2,
  },
  {
    id: "magazine",
    name: "RESERVE",
    icon: "▥",
    text: "+25 % Magazingröße für alle Waffen.",
    max: 2,
  },
];
export const FINAL_WAVE = 8;
export const ARENA = [
  { x: 0, z: -35, hw: 35, hd: 0.6, h: 7, kind: "wall" },
  { x: 0, z: 35, hw: 35, hd: 0.6, h: 7, kind: "wall" },
  { x: -35, z: 0, hw: 0.6, hd: 35, h: 7, kind: "wall" },
  { x: 35, z: 0, hw: 0.6, hd: 35, h: 7, kind: "wall" },
  { x: -12, z: -8, hw: 2.6, hd: 5, h: 3.6, kind: "container" },
  { x: 13, z: 9, hw: 2.6, hd: 5, h: 3.6, kind: "container" },
  { x: 12, z: -19, hw: 5, hd: 2.6, h: 3.6, kind: "container" },
  { x: -14, z: 21, hw: 5, hd: 2.6, h: 3.6, kind: "container" },
  ...[
    [-4, -17],
    [23, -6],
    [-24, 6],
    [4, 20],
    [25, 24],
    [-26, -24],
  ].map(([x, z]) => ({ x, z, hw: 1.5, hd: 1.5, h: 2.2, kind: "cover" })),
];
export const SPAWNS = [
  [-29, -29],
  [29, -29],
  [-29, 29],
  [29, 29],
  [0, -29],
  [-29, 0],
  [29, 0],
  [0, 29],
];
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const damp = (a, b, rate, dt) =>
  a + (b - a) * (1 - Math.exp(-rate * dt));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function blocked(x, z, r = 0.4, obstacles = ARENA) {
  return obstacles.some(
    (o) => Math.abs(x - o.x) < o.hw + r && Math.abs(z - o.z) < o.hd + r,
  );
}
// Swept axis steps prevent dashes tunnelling through even thin walls.
export function moveCircle(pos, dx, dz, r = 0.4, obstacles = ARENA) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.18));
  for (let i = 0; i < steps; i++) {
    if (!blocked(pos.x + dx / steps, pos.z, r, obstacles)) pos.x += dx / steps;
    if (!blocked(pos.x, pos.z + dz / steps, r, obstacles)) pos.z += dz / steps;
  }
}
export function segmentBox(a, b, o, padding = 0) {
  let lo = 0,
    hi = 1;
  for (const [axis, half] of [
    ["x", "hw"],
    ["y", "hy"],
    ["z", "hd"],
  ]) {
    if (axis === "y" && o.h === undefined) continue;
    const center = axis === "y" ? o.h / 2 : o[axis];
    const radius = axis === "y" ? o.h / 2 : o[half] + padding;
    const delta = b[axis] - a[axis];
    const min = center - radius,
      max = center + radius;
    if (Math.abs(delta) < 1e-9) {
      if (a[axis] < min || a[axis] > max) return false;
    } else {
      let t1 = (min - a[axis]) / delta,
        t2 = (max - a[axis]) / delta;
      if (t1 > t2) [t1, t2] = [t2, t1];
      lo = Math.max(lo, t1);
      hi = Math.min(hi, t2);
      if (lo > hi) return false;
    }
  }
  return true;
}
export function lineOfSight(a, b, obstacles = ARENA) {
  return !obstacles.some((o) => segmentBox(a, b, o));
}
export function segmentSphere(a, b, center, radius) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    dz = b.z - a.z;
  const len = dx * dx + dy * dy + dz * dz;
  const t = len
    ? clamp(
        ((center.x - a.x) * dx +
          (center.y - a.y) * dy +
          (center.z - a.z) * dz) /
          len,
        0,
        1,
      )
    : 0;
  return (
    Math.hypot(
      a.x + dx * t - center.x,
      a.y + dy * t - center.y,
      a.z + dz * t - center.z,
    ) <= radius
  );
}
export function weaponDamage(weapon, dist, headshot = false, power = 0) {
  const falloff = clamp(
    1 - Math.max(0, dist - weapon.range) / (weapon.range * 1.7),
    0.35,
    1,
  );
  return (
    weapon.damage * falloff * (headshot ? weapon.head : 1) * (1 + 0.18 * power)
  );
}
export function waveRoster(wave) {
  if (wave === FINAL_WAVE)
    return ["boss", "runner", "runner", "grunt", "sniper", "heavy"];
  const result = Array(Math.min(3 + wave, 9)).fill("grunt");
  for (let i = 0; i < result.length; i++) {
    if (wave >= 2 && i % 3 === 1) result[i] = "runner";
    if (wave >= 3 && i % 4 === 2) result[i] = "sniper";
    if (wave >= 4 && i === 0) result[i] = "heavy";
    if (wave >= 6 && i === result.length - 1) result[i] = "heavy";
  }
  return result;
}
export function perkChoices(levels, random = Math.random) {
  const available = PERKS.filter((p) => (levels[p.id] || 0) < p.max);
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  return available.slice(0, 3);
}
// Small A* grid. Diagonal steps require both adjacent cells to be free.
export class Navigation {
  constructor(obstacles = ARENA) {
    this.size = 35;
    this.cell = 2;
    this.offset = 34;
    this.obstacles = obstacles;
    this.open = new Uint8Array(this.size * this.size);
    for (let z = 0; z < this.size; z++)
      for (let x = 0; x < this.size; x++)
        this.open[z * this.size + x] = !blocked(
          x * 2 - 34,
          z * 2 - 34,
          0.72,
          obstacles,
        );
  }
  nearest(p) {
    const x = clamp(Math.round((p.x + 34) / 2), 0, 34),
      z = clamp(Math.round((p.z + 34) / 2), 0, 34);
    let best = -1,
      dist = Infinity;
    for (let dz = -3; dz <= 3; dz++)
      for (let dx = -3; dx <= 3; dx++) {
        const nx = x + dx,
          nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= 35 || nz >= 35) continue;
        const id = nz * 35 + nx,
          d = dx * dx + dz * dz;
        if (this.open[id] && d < dist) {
          best = id;
          dist = d;
        }
      }
    return best;
  }
  path(start, end) {
    const first = this.nearest(start),
      last = this.nearest(end);
    if (first < 0 || last < 0 || first === last) return [];
    const queue = [first],
      came = new Int32Array(1225).fill(-1),
      cost = new Float32Array(1225).fill(Infinity),
      closed = new Uint8Array(1225);
    const heuristic = (id) =>
      Math.hypot(
        (id % 35) - (last % 35),
        Math.floor(id / 35) - Math.floor(last / 35),
      );
    cost[first] = 0;
    while (queue.length) {
      let best = 0;
      for (let i = 1; i < queue.length; i++)
        if (
          cost[queue[i]] + heuristic(queue[i]) <
          cost[queue[best]] + heuristic(queue[best])
        )
          best = i;
      const current = queue.splice(best, 1)[0];
      if (current === last) {
        const path = [];
        for (let id = last; id !== first; id = came[id])
          path.push({ x: (id % 35) * 2 - 34, z: Math.floor(id / 35) * 2 - 34 });
        return path.reverse();
      }
      closed[current] = 1;
      const x = current % 35,
        z = Math.floor(current / 35);
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]) {
        const nx = x + dx,
          nz = z + dz,
          id = nz * 35 + nx;
        if (
          nx < 0 ||
          nz < 0 ||
          nx >= 35 ||
          nz >= 35 ||
          !this.open[id] ||
          closed[id]
        )
          continue;
        if (dx && dz && (!this.open[z * 35 + nx] || !this.open[nz * 35 + x]))
          continue;
        const next = cost[current] + Math.hypot(dx, dz);
        if (next < cost[id]) {
          came[id] = current;
          cost[id] = next;
          if (!queue.includes(id)) queue.push(id);
        }
      }
    }
    return [];
  }
}
