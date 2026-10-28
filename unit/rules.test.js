import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ARENA,
  Navigation,
  blocked,
  moveCircle,
  lineOfSight,
  segmentSphere,
  weaponDamage,
  WEAPONS,
  waveRoster,
  perkChoices,
  PERKS,
  FINAL_WAVE,
} from "../src/game/rules.js";

test("dash movement cannot tunnel through a thin wall and slides along it", () => {
  const obstacles = [{ x: 0, z: 0, hw: 0.1, hd: 5, h: 4 }],
    p = { x: -2, z: 0 };
  moveCircle(p, 10, 3, 0.36, obstacles);
  assert.ok(p.x < -0.45);
  assert.ok(p.z > 2.9);
  assert.ok(!blocked(p.x, p.z, 0.36, obstacles));
});
test("movement normalizes collision behavior across frame subdivisions", () => {
  const a = { x: -4, z: -4 },
    b = { ...a };
  moveCircle(a, 2, 1);
  for (let i = 0; i < 120; i++) moveCircle(b, 2 / 120, 1 / 120);
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 1e-8);
});
test("cover blocks sight while a shot above it clears", () => {
  const obstacles = [{ x: 0, z: 0, hw: 1, hd: 1, h: 2 }];
  assert.equal(
    lineOfSight({ x: 0, y: 1, z: 4 }, { x: 0, y: 1, z: -4 }, obstacles),
    false,
  );
  assert.equal(
    lineOfSight({ x: 0, y: 3, z: 4 }, { x: 0, y: 3, z: -4 }, obstacles),
    true,
  );
  assert.equal(
    lineOfSight({ x: 3, y: 1, z: 4 }, { x: 3, y: 1, z: -4 }, obstacles),
    true,
  );
});
test("fast projectiles use swept collision so they cannot skip a player", () => {
  assert.equal(
    segmentSphere(
      { x: 0, y: 1, z: -5 },
      { x: 0, y: 1, z: 5 },
      { x: 0, y: 1, z: 0 },
      0.46,
    ),
    true,
  );
  assert.equal(
    segmentSphere(
      { x: 2, y: 1, z: -5 },
      { x: 2, y: 1, z: 5 },
      { x: 0, y: 1, z: 0 },
      0.46,
    ),
    false,
  );
});
test("headshots, damage upgrades and range falloff have separate effects", () => {
  const rifle = WEAPONS[0];
  assert.equal(weaponDamage(rifle, 10), 31);
  assert.ok(weaponDamage(rifle, 10, true) > 80);
  assert.ok(weaponDamage(rifle, 10, false, 1) > 31);
  assert.ok(weaponDamage(rifle, 100) < weaponDamage(rifle, 10));
  assert.ok(weaponDamage(rifle, 10000) > 0);
});
test("weapon roles differ in cadence, spread and near-range burst", () => {
  const [rifle, smg, shotgun] = WEAPONS;
  assert.ok(smg.interval < rifle.interval);
  assert.ok(rifle.adsSpread < smg.adsSpread);
  assert.ok(shotgun.damage * shotgun.pellets > 150);
  assert.ok(
    weaponDamage(shotgun, 40) * shotgun.pellets <
      weaponDamage(shotgun, 4) * shotgun.pellets,
  );
});
test("eight waves introduce specialists and culminate in exactly one boss", () => {
  assert.equal(waveRoster(1).length, 4);
  assert.ok(waveRoster(2).includes("runner"));
  assert.ok(waveRoster(3).includes("sniper"));
  assert.ok(waveRoster(4).includes("heavy"));
  assert.equal(waveRoster(FINAL_WAVE).filter((x) => x === "boss").length, 1);
});
test("upgrades are unique and capped upgrades never appear", () => {
  const levels = Object.fromEntries(PERKS.map((p) => [p.id, p.max]));
  levels.power = 0;
  levels.vital = 0;
  const choices = perkChoices(levels, () => 0.3);
  assert.equal(choices.length, 2);
  assert.equal(new Set(choices.map((p) => p.id)).size, 2);
  assert.deepEqual(choices.map((p) => p.id).sort(), ["power", "vital"]);
});
test("A* routes around a container and does not cut blocked corners", () => {
  const nav = new Navigation();
  const start = { x: -12, z: 3 },
    end = { x: -12, z: -19 };
  const route = nav.path(start, end);
  assert.ok(route.length > 10);
  for (const step of route) assert.equal(blocked(step.x, step.z, 0.72), false);
  let previous = start;
  for (const step of route) {
    assert.equal(lineOfSight({ ...previous, y: 1 }, { ...step, y: 1 }), true);
    previous = step;
  }
  assert.ok(Math.hypot(previous.x - end.x, previous.z - end.z) < 3);
});
test("all spawn positions and the player starting lane are collision free", () => {
  assert.equal(blocked(0, 24, 0.36), false);
  for (const [x, z] of [
    [-29, -29],
    [29, -29],
    [-29, 29],
    [29, 29],
    [0, -29],
    [-29, 0],
    [29, 0],
    [0, 29],
  ])
    assert.equal(blocked(x, z, 0.72), false);
});
