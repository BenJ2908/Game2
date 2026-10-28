import { test, expect } from "@playwright/test";

const snapshot = (page) => page.evaluate(() => window.__velocity.snapshot());
const step = (page, seconds) =>
  page.evaluate((t) => window.__velocity.step(t), seconds);
async function start(page, manual = true) {
  await page.addInitScript(() =>
    localStorage.setItem(
      "velocity-settings-v2",
      JSON.stringify({ quality: "low", volume: 0, shake: false }),
    ),
  );
  await page.goto(`/?test${manual ? "&manual" : ""}`);
  await page.getByRole("button", { name: "RUN STARTEN" }).click();
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement?.id))
    .toBe("game");
  if (manual) await page.evaluate(() => window.__velocity.arena());
}
async function key(page, code, time = 0.1) {
  await page.keyboard.down(code);
  await step(page, time);
  await page.keyboard.up(code);
}

test("movement accelerates, diagonal speed is bounded, dash and slide preserve collision", async ({
  page,
}) => {
  await start(page);
  let s = await snapshot(page);
  expect(s.position.z).toBe(24);
  await key(page, "KeyW", 0.7);
  s = await snapshot(page);
  expect(s.position.z).toBeLessThan(21);
  expect(s.velocity.z).toBeLessThan(-5);
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.down("KeyW");
  await step(page, 0.5);
  await page.keyboard.down("ControlLeft");
  await step(page, 0.08);
  s = await snapshot(page);
  expect(s.slide).toBeGreaterThan(0);
  await page.keyboard.up("ControlLeft");
  await key(page, "Space", 0.1);
  s = await snapshot(page);
  expect(s.position.y).toBeGreaterThan(0);
  expect(s.slide).toBe(0);
  await page.keyboard.up("ShiftLeft");
  await page.keyboard.up("KeyW");
  await step(page, 1);
  await page.evaluate(() =>
    window.__velocity.player({ position: [0, 0, -33], yaw: 0 }),
  );
  await key(page, "KeyE", 0.25);
  s = await snapshot(page);
  expect(s.position.z).toBeGreaterThan(-34.1);
  expect(s.dashCooldown).toBeGreaterThan(2);
});

test("real raycasts reward headshots and cover blocks weapon damage", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    window.__velocity.player({ position: [0, 0, 10], yaw: 0, pitch: 0 });
    window.__velocity.spawn("grunt", 0, 0);
    window.__velocity.fire();
  });
  let s = await snapshot(page);
  expect(s.enemies).toHaveLength(0);
  expect(s.kills).toBe(1);
  expect(s.headshots).toBe(1);
  await step(page, 0.12);
  await page.evaluate(() => {
    window.__velocity.spawn("grunt", 0, 0);
    window.__velocity.fire();
  });
  s = await snapshot(page);
  expect(s.kills).toBe(2);
  expect(s.headshots).toBe(2);
  expect(s.combo).toBe(2);
  expect(s.score).toBeGreaterThan(300);
  expect(s.hits).toBe(2);
  await page.evaluate(() => {
    window.__velocity.arena();
    window.__velocity.player({ position: [-12, 0, 4], yaw: 0, pitch: 0 });
    window.__velocity.spawn("grunt", -12, -17);
  });
  await step(page, 0.12);
  await page.evaluate(() => window.__velocity.fire());
  s = await snapshot(page);
  expect(s.enemies[0].hp).toBe(85);
});

test("weapons switch, reload can be cancelled, and the shotgun delivers a close burst", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => window.__velocity.fire());
  await key(page, "KeyR", 0.2);
  expect((await snapshot(page)).reload).toBeGreaterThan(1);
  await key(page, "Digit2");
  expect((await snapshot(page)).weapon).toBe("smg");
  expect((await snapshot(page)).reload).toBe(0);
  await key(page, "Digit1", 0.3);
  expect((await snapshot(page)).ammo[0]).toBe(29);
  await key(page, "KeyR", 1.6);
  expect((await snapshot(page)).ammo[0]).toBe(30);
  await key(page, "Digit3", 0.3);
  await page.evaluate(() => {
    window.__velocity.player({ position: [0, 0, 5], yaw: 0, pitch: -0.08 });
    window.__velocity.spawn("grunt", 0, 1);
    window.__velocity.fire();
  });
  const s = await snapshot(page);
  expect(s.weapon).toBe("shotgun");
  expect(s.kills).toBe(1);
  expect(s.ammo[2]).toBe(7);
});

test("projectiles damage on collision, miss moving players, and cannot pass cover", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    window.__velocity.player({ position: [0, 0, 10] });
    window.__velocity.spawn("grunt", 10, 10);
    window.__velocity.projectile([0, 1.3, 0], [0, 1.3, 10]);
  });
  await step(page, 0.65);
  expect((await snapshot(page)).health).toBeLessThan(100);
  await page.evaluate(() => {
    window.__velocity.player({
      health: 100,
      invulnerable: 0,
      position: [0, 0, 10],
    });
    window.__velocity.projectile([0, 1.3, 0], [0, 1.3, 10]);
  });
  await key(page, "KeyD", 0.8);
  expect((await snapshot(page)).health).toBe(100);
  await page.evaluate(() => {
    window.__velocity.player({
      health: 100,
      invulnerable: 0,
      position: [-12, 0, 4],
    });
    window.__velocity.projectile([-12, 1.3, -18], [-12, 1.3, 4]);
  });
  await step(page, 1.5);
  expect((await snapshot(page)).health).toBe(100);
});

test("grenades consume charges, explode, and hurt groups without self damage", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    window.__velocity.player({ position: [0, 0, 10], yaw: 0, pitch: -0.38 });
    window.__velocity.spawn("heavy", 0, -5);
  });
  await key(page, "KeyG", 0.1);
  expect((await snapshot(page)).grenades).toBe(1);
  await step(page, 1.4);
  const s = await snapshot(page);
  expect(s.health).toBe(100);
  expect(s.enemies.length === 0 || s.enemies[0].hp < 260).toBe(true);
});

test("wave completion offers distinct upgrades, refills resources, and persists selected perk", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    window.__velocity.player({ health: 40 });
    window.__velocity.fire();
    window.__velocity.finishWave();
  });
  await expect(page.locator("#upgrade")).toBeVisible();
  let s = await snapshot(page);
  expect(s.state).toBe("upgrade");
  expect(s.health).toBe(75);
  expect(s.ammo[0]).toBe(30);
  expect(new Set(s.perks).size).toBe(3);
  const perk = s.perks[0];
  await page.locator(".perk-card").first().click();
  s = await snapshot(page);
  expect(s.state).toBe("playing");
  expect(s.wave).toBe(2);
  expect(s.levels[perk]).toBe(1);
  expect(s.pending).toBeGreaterThan(0);
});

test("pause freezes simulation, settings persist, and restart resets the run", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => window.__velocity.fire());
  await page.keyboard.press("Escape");
  await expect(page.locator("#pause")).toBeVisible();
  const before = await snapshot(page);
  await step(page, 3);
  expect((await snapshot(page)).elapsed).toBe(before.elapsed);
  await page.locator("#pause-settings").click();
  await page.locator("#sensitivity").fill("1.5");
  await page.locator("#sensitivity").dispatchEvent("input");
  await page.locator("#settings-dialog .dialog-close").click();
  await page.getByRole("button", { name: "WEITERSPIELEN" }).click();
  expect((await snapshot(page)).ammo[0]).toBe(29);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "RUN BEENDEN & ZUM MENÜ" }).click();
  await page.getByRole("button", { name: "RUN STARTEN" }).click();
  expect((await snapshot(page)).ammo[0]).toBe(30);
  expect((await snapshot(page)).kills).toBe(0);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("velocity-settings-v2")).sensitivity,
    ),
  ).toBe(1.5);
});

test("boss wave, death and victory have complete end screens and a working retry", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => window.__velocity.wave(8));
  await step(page, 1.3);
  let s = await snapshot(page);
  expect(s.enemies.some((b) => b.type === "boss")).toBe(true);
  await expect(page.locator("#boss-hud")).toBeVisible();
  await page.evaluate(() => window.__velocity.finishWave());
  await expect(page.locator("#end")).toBeVisible();
  expect((await snapshot(page)).state).toBe("won");
  await expect(page.locator("#end-title")).toContainText("MISSION");
  await page.getByRole("button", { name: "NEUER RUN" }).click();
  await page.evaluate(() => {
    window.__velocity.arena();
    window.__velocity.player({
      health: 1,
      position: [0, 0, 10],
      invulnerable: 0,
    });
    window.__velocity.spawn("grunt", 8, 10);
    window.__velocity.projectile([0, 1.3, 9], [0, 1.3, 10]);
  });
  await step(page, 0.15);
  expect((await snapshot(page)).state).toBe("dead");
  await expect(page.locator("#final-score")).toBeVisible();
});

test("native pointer lock, automatic fire and live simulation run without browser errors", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page, false);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.up();
  await expect
    .poll(async () => Number(await page.locator("#ammo").textContent()))
    .toBeLessThan(30);
  await page.keyboard.press("Escape");
  await expect(page.locator("#pause")).toBeVisible();
  expect(await page.evaluate(() => document.pointerLockElement)).toBeNull();
  expect(errors).toEqual([]);
});

test("flankers actually navigate around cover rather than getting stuck", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    window.__velocity.player({ position: [-12, 0, 4], invulnerable: 60 });
    window.__velocity.spawn("runner", -12, -18);
  });
  await step(page, 8);
  const s = await snapshot(page),
    enemy = s.enemies[0];
  expect(Math.hypot(enemy.position.x + 12, enemy.position.z - 4)).toBeLessThan(
    4,
  );
});

test("boss enrages at half health and alternates projectiles with jumpable shockwaves", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    window.__velocity.player({ position: [0, 0, 15], invulnerable: 60 });
    const id = window.__velocity.spawn("boss", 0, 0);
    window.__velocity.enemy(id, { hp: 850, cooldown: 0 });
  });
  await step(page, 1.2);
  let s = await snapshot(page);
  expect(s.enemies[0].enraged).toBe(true);
  expect(s.enemies[0].attacks).toBeGreaterThan(0);
  expect(s.projectiles).toBeGreaterThan(0);
  await step(page, 2.8);
  s = await snapshot(page);
  expect(s.enemies[0].attacks).toBeGreaterThanOrEqual(2);
  expect(s.shockwaves).toBeGreaterThan(0);
});

test("menu and combat visual review", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() =>
    localStorage.setItem(
      "velocity-settings-v2",
      JSON.stringify({ quality: "medium", volume: 0 }),
    ),
  );
  await page.goto("/?test&manual");
  await page.screenshot({ path: "/tmp/velocity-overdrive-menu.png" });
  await page.getByRole("button", { name: "RUN STARTEN" }).click();
  await page.evaluate(() => {
    window.__velocity.arena();
    window.__velocity.player({ position: [0, 0, 17], yaw: 0, pitch: -0.015 });
    window.__velocity.spawn("grunt", -3, 3);
    window.__velocity.spawn("runner", 4, 7);
    window.__velocity.spawn("heavy", 8, -2);
    window.__velocity.spawn("sniper", -5, -8);
  });
  await step(page, 0.2);
  await page.screenshot({ path: "/tmp/velocity-overdrive-game.png" });
  expect(errors).toEqual([]);
});

test("complete eight-wave campaign through real weapon damage and chosen upgrades", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    window.__velocity.wave(1);
    window.__velocity.player({ invulnerable: 10000 });
  });
  for (let wave = 1; wave <= 8; wave++) {
    await page.evaluate(() => {
      const t = window.__velocity;
      t.step(4.5);
      let guard = 0;
      while (t.snapshot().state === "playing" && guard++ < 350) {
        const s = t.snapshot();
        if (!s.enemies.length) {
          t.step(1);
          continue;
        }
        const enemy = s.enemies[0],
          scale =
            enemy.type === "boss" ? 1.65 : enemy.type === "heavy" ? 1.2 : 1;
        t.enemy(enemy.id, { position: [0, 0, 0], cooldown: 999, windup: 0 });
        t.player({
          position: [0, 0, 7],
          yaw: 0,
          pitch: Math.atan2(1.73 * scale - 1.68, 7),
        });
        t.fire();
        t.step(s.ammo[0] === 0 ? 1.7 : 0.115);
      }
    });
    const s = await snapshot(page);
    expect(s.wave).toBe(wave);
    if (wave < 8) {
      expect(s.state).toBe("upgrade");
      await page.locator(".perk-card").first().click();
    } else {
      expect(s.state).toBe("won");
      expect(s.kills).toBe(54);
      expect(s.shots).toBeGreaterThan(50);
      expect(s.hits / s.shots).toBeGreaterThan(0.8);
    }
  }
});

test("denied pointer lock pauses fairly instead of allowing unplayable damage", async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLElement.prototype.requestPointerLock = () =>
      Promise.reject(
        new DOMException("User denied pointer lock", "NotAllowedError"),
      );
  });
  await page.goto("/?test&manual");
  await page.locator("#start").click();
  await expect(page.locator("#pause")).toBeVisible();
  await expect(page.locator("#pause-description")).toContainText(
    "Mausfang blockiert",
  );
  await step(page, 8);
  expect((await snapshot(page)).elapsed).toBe(0);
  expect((await snapshot(page)).health).toBe(100);
});
