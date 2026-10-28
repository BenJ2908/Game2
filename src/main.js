import { World } from "./game/world.js";
import { Game } from "./game/game.js";
import { AudioEngine } from "./game/audio.js";
import { UI } from "./game/ui.js";
import { loadSettings } from "./game/settings.js";
import "./style.css";

const settings = loadSettings();
let world;
try {
  world = new World(document.getElementById("game"), settings);
} catch (error) {
  const message = document.getElementById("error");
  message.textContent =
    "Die 3D-Arena konnte nicht gestartet werden. Bitte nutze einen aktuellen Desktop-Browser mit aktivierter Hardwarebeschleunigung (WebGL).";
  message.classList.remove("hidden");
  document.getElementById("start").disabled = true;
  throw error;
}
const audio = new AudioEngine(settings),
  ui = new UI(settings, world, audio),
  game = new Game(world, audio, ui, settings);
ui.bind(game);
const manual =
  import.meta.env.DEV &&
  new URLSearchParams(location.search).has("test") &&
  new URLSearchParams(location.search).has("manual");
let last = performance.now(),
  accumulator = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const delta = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (game.state === "playing" && !manual) {
    accumulator += delta;
    while (accumulator >= 1 / 120 && game.state === "playing") {
      game.update(1 / 120);
      accumulator -= 1 / 120;
    }
    ui.update(game, delta);
  } else {
    accumulator = 0;
    if (game.state === "menu") {
      const t = now * 0.000025;
      world.camera.position.set(23 + Math.sin(t) * 3, 10, 27);
      world.camera.lookAt(-3, 1, -9);
    }
  }
  world.render();
}
requestAnimationFrame(frame);
window.addEventListener("resize", () => world.resize());
// Development-only test driver. Excluded from the production build by Vite.
// Tests still exercise actual game systems, Three.js raycasts and DOM input.
if (import.meta.env.DEV && new URLSearchParams(location.search).has("test")) {
  window.__velocity = {
    snapshot: () => game.snapshot(),
    step: (seconds) => {
      for (let t = 0; t < seconds; t += 1 / 120) {
        game.update(Math.min(1 / 120, seconds - t));
      }
      ui.update(game, seconds);
    },
    arena: () => {
      game.cleanup();
      game.waveClearTime = -1000;
      game.input.clear();
      game.world.scene.updateMatrixWorld(true);
    },
    spawn: (type, x, z) => {
      const b = game.spawnEnemy(type, x, z);
      b.cooldown = 999;
      game.world.scene.updateMatrixWorld(true);
      return b.id;
    },
    player: (values) => {
      if (values.position) game.player.position.set(...values.position);
      for (const key of [
        "health",
        "dashCooldown",
        "invulnerable",
        "yaw",
        "pitch",
      ])
        if (values[key] !== undefined) game.player[key] = values[key];
      game.updateView(0);
      ui.update(game, 0);
    },
    enemy: (id, values) => {
      const b = game.enemies.find((b) => b.id === id);
      if (!b) return;
      if (values.position) b.group.position.set(...values.position);
      for (const key of ["hp", "cooldown", "windup"])
        if (values[key] !== undefined) b[key] = values[key];
    },
    fire: () => game.fire(),
    projectile: (origin, target, type = "grunt") => {
      const b = {
        type,
        config: (game.enemies.find((b) => b.type === type) || game.enemies[0])
          ?.config,
      };
      if (b.config)
        game.projectile(
          new world.camera.position.constructor(...origin),
          new world.camera.position.constructor(...target),
          b,
        );
    },
    finishWave: () => {
      for (const b of [...game.enemies])
        game.damageEnemy(b, 1e6, false, b.group.position, "test");
      for (const p of game.pending) {
        world.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
      }
      game.pending = [];
      game.completeWave();
    },
    wave: (value) => {
      game.cleanup();
      game.wave = value - 1;
      game.nextWave();
    },
  };
}
