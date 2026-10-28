import { WEAPONS, DIFFICULTIES, FINAL_WAVE, ARENA, clamp } from "./rules.js";
import { loadRecord, saveSettings } from "./settings.js";
const $ = (id) => document.getElementById(id);
const show = (id, yes) => $(id).classList.toggle("hidden", !yes);
const formatTime = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export class UI {
  constructor(settings, world, audio) {
    this.settings = settings;
    this.world = world;
    this.audio = audio;
    this.numbers = [];
    this.pickupTime = 0;
    this.radarTime = 0;
    this.feedText = "";
    this.bindSettings();
    this.menuRecord();
  }
  text(id, value) {
    const node = $(id);
    const text = String(value);
    if (node.textContent !== text) node.textContent = text;
  }
  bind(game) {
    this.game = game;
    $("start").onclick = () => game.start();
    $("restart").onclick = () => game.start();
    $("resume").onclick = () => game.resume();
    $("back").onclick = () => game.menu();
    $("end-menu").onclick = () => game.menu();
    $("upgrade-menu").onclick = () => game.menu();
    for (const id of ["settings-open", "pause-settings"])
      $(id).onclick = () => this.openDialog("settings-dialog");
    for (const id of ["controls-open", "pause-controls"])
      $(id).onclick = () => this.openDialog("controls-dialog");
    document.querySelectorAll("[data-difficulty]").forEach(
      (button) =>
        (button.onclick = () => {
          this.settings.difficulty = button.dataset.difficulty;
          this.saveSettings();
          this.menuRecord();
        }),
    );
  }
  openDialog(id) {
    this.syncSettings();
    $(id).showModal();
  }
  bindSettings() {
    for (const id of ["sensitivity", "fov", "volume"])
      $(id).addEventListener("input", () => {
        this.settings[id] = Number($(id).value);
        this.syncOutputs();
        this.audio.setVolume();
        this.saveSettings();
      });
    $("sound").onchange = () => {
      this.settings.muted = !$("sound").checked;
      this.audio.unlock();
      this.audio.setVolume();
      this.saveSettings();
    };
    $("shake").onchange = () => {
      this.settings.shake = $("shake").checked;
      this.saveSettings();
    };
    $("quality").onchange = () => {
      this.settings.quality = $("quality").value;
      this.world.applyQuality();
      this.world.resize();
      this.saveSettings();
    };
    this.syncSettings();
  }
  saveSettings() {
    saveSettings(this.settings);
  }
  syncSettings() {
    for (const id of ["sensitivity", "fov", "volume"])
      $(id).value = this.settings[id];
    $("sound").checked = !this.settings.muted;
    $("shake").checked = this.settings.shake;
    $("quality").value = this.settings.quality;
    this.syncOutputs();
  }
  syncOutputs() {
    this.text("sensitivity-value", this.settings.sensitivity.toFixed(2));
    this.text("fov-value", `${this.settings.fov}°`);
    this.text("volume-value", `${Math.round(this.settings.volume * 100)} %`);
  }
  menuRecord() {
    this.text(
      "menu-best",
      loadRecord(this.settings.difficulty).toLocaleString("de-DE"),
    );
    this.text(
      "difficulty-description",
      DIFFICULTIES[this.settings.difficulty].label,
    );
    document.querySelectorAll("[data-difficulty]").forEach((button) => {
      const selected = button.dataset.difficulty === this.settings.difficulty;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }
  state(state) {
    if (state === "paused")
      this.text("pause-description", "Dein Run wartet auf dich.");
    const menu = state === "menu";
    document.body.classList.toggle("playing", !menu);
    show("menu", menu);
    show("menu-footer", menu);
    show("hud", !menu);
    show("pause", state === "paused");
    show("upgrade", state === "upgrade");
    show("end", state === "dead" || state === "won");
    if (state !== "playing") this.lockHint(false);
    if (menu) {
      $("damage").style.opacity = 0;
      document.body.classList.remove("aiming");
    }
    if (state === "playing") this.update(this.game, 0);
  }
  lockHint(yes) {
    show("lock-hint", yes);
  }
  announce(title, subtitle) {
    $("announcement").querySelector("strong").textContent = title;
    $("announcement").querySelector("span").textContent = subtitle;
  }
  pickup(text) {
    this.text("interaction", text);
    this.pickupTime = 1.7;
  }
  upgrades(game) {
    this.text(
      "wave-summary",
      `${game.waveKills} Eliminierungen · ${game.waveHeads} Kopftreffer · ${formatTime(game.elapsed - game.waveStart)} · Welle ${game.wave + 1} wartet.`,
    );
    $("upgrade-cards").replaceChildren();
    game.perkOptions.forEach((perk, index) => {
      const button = document.createElement("button");
      button.className = "perk-card";
      button.dataset.perk = perk.id;
      const top = document.createElement("span");
      top.textContent = `0${index + 1} / STUFE ${(game.levels[perk.id] || 0) + 1}`;
      const icon = document.createElement("b");
      icon.textContent = perk.icon;
      const title = document.createElement("h3");
      title.textContent = perk.name;
      const description = document.createElement("p");
      description.textContent = perk.text;
      button.append(top, icon, title, description);
      button.onclick = () => game.choosePerk(index);
      $("upgrade-cards").append(button);
    });
  }
  end(game, won, record) {
    this.text(
      "end-eyebrow",
      won ? "DER AUFSEHER IST GEFALLEN" : "RUN ABGESCHLOSSEN",
    );
    $("end-title").innerHTML = won
      ? "MISSION<br><em>COMPLETE.</em>"
      : "NOCH EIN<br><em>VERSUCH?</em>";
    this.text(
      "end-description",
      won
        ? "Acht Wellen. Dein Build. Dein Sieg."
        : "Nutze Deckung, wechsle die Waffe und halte deinen Dash für Feuerlinien bereit.",
    );
    this.text("final-score", game.score.toLocaleString("de-DE"));
    this.text("final-kills", game.kills);
    this.text(
      "final-accuracy",
      `${game.shots ? Math.round((game.hits / game.shots) * 100) : 0}%`,
    );
    this.text("final-wave", `${game.wave} / ${FINAL_WAVE}`);
    this.text("final-combo", `×${game.bestCombo}`);
    this.text("final-time", formatTime(game.elapsed));
    this.text(
      "record-text",
      record
        ? "NEUE BESTLEISTUNG"
        : `BESTLEISTUNG: ${game.best.toLocaleString("de-DE")} · ${DIFFICULTIES[game.settings.difficulty].name}`,
    );
  }
  clearNumbers() {
    for (const n of this.numbers) n.node.remove();
    this.numbers = [];
  }
  number(position, damage, head) {
    const node = document.createElement("span");
    node.className = `damage-number${head ? " head" : ""}`;
    node.textContent = head ? `${damage} !` : damage;
    $("damage-numbers").append(node);
    this.numbers.push({
      position: position.clone(),
      life: 0.65,
      max: 0.65,
      node,
      drift: (Math.random() - 0.5) * 30,
    });
    if (this.numbers.length > 28) {
      this.numbers.shift().node.remove();
    }
  }
  updateNumbers(dt) {
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i];
      n.life -= dt;
      if (n.life <= 0) {
        n.node.remove();
        this.numbers.splice(i, 1);
        continue;
      }
      const p = n.position.clone().project(this.world.camera);
      const age = 1 - n.life / n.max;
      n.node.style.display = p.z > 1 ? "none" : "block";
      n.node.style.transform = `translate(${(p.x * 0.5 + 0.5) * innerWidth + n.drift * age + 15}px,${(-p.y * 0.5 + 0.5) * innerHeight - age * 55 - 15}px)`;
      n.node.style.opacity = Math.min(1, n.life * 4);
    }
  }
  radar(game) {
    const canvas = $("radar"),
      ctx = canvas.getContext("2d"),
      p = game.player,
      scale = 2.4;
    ctx.clearRect(0, 0, 150, 150);
    ctx.save();
    ctx.translate(75, 75);
    ctx.strokeStyle = "#b8d38630";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.moveTo(-75, 0);
    ctx.lineTo(75, 0);
    ctx.moveTo(0, -75);
    ctx.lineTo(0, 75);
    ctx.stroke();
    ctx.save();
    ctx.rotate(p.yaw);
    ctx.fillStyle = "#b1c79238";
    for (const o of ARENA) {
      const x = (o.x - p.position.x) * scale,
        z = (o.z - p.position.z) * scale;
      ctx.fillRect(
        x - o.hw * scale,
        z - o.hd * scale,
        o.hw * 2 * scale,
        o.hd * 2 * scale,
      );
    }
    for (const b of game.enemies) {
      const x = (b.group.position.x - p.position.x) * scale,
        z = (b.group.position.z - p.position.z) * scale;
      if (Math.hypot(x, z) > 69) continue;
      ctx.fillStyle = b.config.color;
      ctx.beginPath();
      ctx.arc(x, z, b.type === "boss" ? 5 : 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = "#c6f77d";
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(4, 4);
    ctx.lineTo(0, 2);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  update(game, dt) {
    const p = game.player,
      ammo = game.ammunition[game.weaponIndex];
    this.text("health", Math.ceil(p.health));
    this.text("max-health", `/ ${p.maxHealth}`);
    $("healthbar").style.width =
      `${clamp((p.health / p.maxHealth) * 100, 0, 100)}%`;
    $("health")
      .closest(".vitals")
      .classList.toggle("low", p.health < 30);
    this.text(
      "regen-status",
      p.health < p.maxHealth && game.elapsed - p.lastHurt > 4 ? "REGEN +" : "",
    );
    this.text("score", String(game.score).padStart(6, "0"));
    this.text("wave", String(game.wave).padStart(2, "0"));
    this.text(
      "remaining",
      String(game.enemies.length + game.pending.length).padStart(2, "0"),
    );
    this.text("ammo", String(ammo).padStart(2, "0"));
    $("ammo").classList.toggle("empty", ammo === 0);
    this.text("ammo-max", `/ ${game.magazine()}`);
    this.text("weapon-name", game.weapon.name);
    this.text("weapon-label", game.weapon.label);
    this.text(
      "reload-hint",
      game.reloadTime
        ? "NACHLADEN …"
        : game.switchTime
          ? "WAFFENWECHSEL"
          : ammo === 0
            ? "LEER · R NACHLADEN"
            : "R · NACHLADEN",
    );
    $("reload-bar").style.width = game.reloadTime
      ? `${(1 - game.reloadTime / game.reloadTotal) * 100}%`
      : "0%";
    this.text(
      "dash-status",
      p.dashCooldown > 0 ? `${p.dashCooldown.toFixed(1)}s` : "BEREIT",
    );
    this.text("grenades", game.grenadeCount);
    $("dash-status").style.color = p.dashCooldown > 0 ? "#c1cdb4" : "#c6f77d";
    [...$("weapon-slots").children].forEach((slot, i) =>
      slot.classList.toggle("active", i === game.weaponIndex),
    );
    this.text(
      "movement-state",
      p.dash > 0
        ? "IMPULS"
        : p.slide > 0
          ? "SLIDE"
          : game.sprinting
            ? "SPRINT"
            : "",
    );
    const boss = game.enemies.find((b) => b.type === "boss");
    show("boss-hud", !!boss);
    if (boss) {
      $("boss-health").style.width = `${(boss.hp / boss.maxHp) * 100}%`;
      this.text("boss-phase", boss.enraged ? "PHASE II" : "PHASE I");
    }
    $("announcement").style.opacity =
      game.announcementTime > 0 ? Math.min(1, game.announcementTime * 3) : 0;
    $("hitmarker").style.opacity = game.hitTime > 0 ? 1 : 0;
    $("hitmarker").className = game.hitStyle;
    $("crosshair").style.setProperty(
      "--gap",
      `${(game.weaponIndex === 2 ? 16 : 7) + game.bloom * 6 - game.aimBlend * 4 + (p.grounded ? 0 : 7)}px`,
    );
    document.body.classList.toggle("aiming", game.aimBlend > 0.7);
    $("combo").style.opacity = game.comboTime > 0 ? 1 : 0;
    this.text("combo-value", `×${Math.max(1, game.combo)}`);
    this.text(
      "combo-label",
      game.combo >= 5
        ? "OVERDRIVE"
        : game.combo >= 3
          ? "IM FLOW"
          : "KILL CHAIN",
    );
    $("combo-bar").style.width = `${(game.comboTime / 5) * 100}%`;
    $("damage").style.opacity = game.damageFlash * 0.65;
    $("damage-direction").style.opacity = game.damageFlash > 0 ? 1 : 0;
    $("damage-direction").style.transform = `rotate(${game.damageAngle}rad)`;
    const feed = game.feed.map((f) => f.text).join("\n");
    if (feed !== this.feedText) {
      this.feedText = feed;
      $("killfeed").replaceChildren(
        ...game.feed.map((f) => {
          const row = document.createElement("div");
          row.textContent = f.text;
          return row;
        }),
      );
    }
    $("tutorial").style.opacity =
      game.elapsed < 12 ? clamp(12 - game.elapsed, 0, 1) : 0;
    if (this.pickupTime > 0) {
      this.pickupTime -= dt;
      if (this.pickupTime <= 0) this.text("interaction", "");
    }
    this.updateNumbers(dt);
    this.radarTime -= dt;
    if (this.radarTime <= 0) {
      this.radar(game);
      this.radarTime = 0.08;
    }
  }
}
