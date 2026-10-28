import * as THREE from "three";
import {
  WEAPONS,
  ENEMIES,
  DIFFICULTIES,
  FINAL_WAVE,
  SPAWNS,
  Navigation,
  clamp,
  damp,
  distance,
  moveCircle,
  blocked,
  lineOfSight,
  segmentSphere,
  weaponDamage,
  waveRoster,
  perkChoices,
} from "./rules.js";
import { Input } from "./input.js";
import { saveRecord, loadRecord } from "./settings.js";

export class Game {
  constructor(world, audio, ui, settings) {
    this.world = world;
    this.audio = audio;
    this.ui = ui;
    this.settings = settings;
    this.state = "menu";
    this.nav = new Navigation();
    this.input = new Input(world.renderer.domElement, this);
    this.ray = new THREE.Raycaster();
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.grenades = [];
    this.shockwaves = [];
    this.pending = [];
    this.bulletGeometry = new THREE.SphereGeometry(0.11, 8, 6);
    this.grenadeGeometry = new THREE.SphereGeometry(0.15, 10, 8);
    this.bulletMaterials = new Map();
    this.pickupGeometry = new THREE.OctahedronGeometry(0.3);
    this.reset();
  }
  reset() {
    this.player = {
      position: new THREE.Vector3(0, 0, 24),
      velocity: new THREE.Vector3(),
      yaw: 0,
      pitch: 0,
      eye: 1.68,
      health: 100,
      maxHealth: 100,
      grounded: true,
      coyote: 0.1,
      jumpBuffer: 0,
      slide: 0,
      slideCooldown: 0,
      dash: 0,
      dashCooldown: 0,
      dashDirection: new THREE.Vector3(),
      invulnerable: 0,
      lastHurt: -10,
    };
    this.levels = {};
    this.weaponIndex = 0;
    this.ammunition = WEAPONS.map((w) => w.magazine);
    this.cooldowns = [0, 0, 0];
    this.reloadTime = 0;
    this.reloadTotal = 1;
    this.switchTime = 0;
    this.grenadeCount = 2;
    this.grenadeCooldown = 0;
    this.meleeCooldown = 0;
    this.meleeTime = 0;
    this.kickPitch = 0;
    this.kickYaw = 0;
    this.weaponKick = 0;
    this.bloom = 0;
    this.shotSequence = 0;
    this.aimBlend = 0;
    this.sprinting = false;
    this.shake = 0;
    this.landing = 0;
    this.elapsed = 0;
    this.wave = 0;
    this.score = 0;
    this.kills = 0;
    this.headshots = 0;
    this.shots = 0;
    this.hits = 0;
    this.combo = 0;
    this.bestCombo = 1;
    this.comboTime = 0;
    this.waveStart = 0;
    this.waveKills = 0;
    this.waveHeads = 0;
    this.waveClearTime = 0;
    this.announcementTime = 0;
    this.hitTime = 0;
    this.damageFlash = 0;
    this.damageAngle = 0;
    this.stepTime = 0;
    this.perkOptions = [];
    this.best = loadRecord(this.settings.difficulty);
    this.feed = [];
    this.hitStyle = "";
    this.lastEnemyId = 0;
    this.startWeaponVisible();
  }
  get weapon() {
    return WEAPONS[this.weaponIndex];
  }
  get difficulty() {
    return DIFFICULTIES[this.settings.difficulty];
  }
  get maxGrenades() {
    return 2 + (this.levels.blast || 0);
  }
  magazine(index = this.weaponIndex) {
    return Math.round(
      WEAPONS[index].magazine * (1 + 0.25 * (this.levels.magazine || 0)),
    );
  }
  startWeaponVisible() {
    this.world.weapons.forEach(
      (mesh, i) =>
        (mesh.visible = this.state !== "menu" && i === this.weaponIndex),
    );
  }
  start() {
    this.cleanup();
    this.reset();
    this.state = "playing";
    this.startWeaponVisible();
    this.input.clear();
    this.audio.unlock();
    this.ui.state(this.state);
    this.nextWave();
    this.input.lock();
    this.ui.update(this, 0);
  }
  resume() {
    if (this.state !== "paused") return;
    this.state = "playing";
    this.input.clear();
    this.audio.unlock();
    this.ui.state(this.state);
    this.input.lock();
  }
  pause() {
    if (this.state !== "playing") return;
    this.state = "paused";
    this.input.clear();
    this.ui.state(this.state);
  }
  menu() {
    this.state = "menu";
    this.input.clear();
    this.input.unlock();
    this.cleanup();
    this.world.weapons.forEach((g) => (g.visible = false));
    this.world.flash.visible = false;
    this.world.flashLight.intensity = 0;
    this.ui.state(this.state);
    this.ui.menuRecord();
  }
  finish(won = false) {
    if (this.state !== "playing") return;
    this.state = won ? "won" : "dead";
    this.input.clear();
    this.input.unlock();
    const oldBest = loadRecord(this.settings.difficulty);
    this.best = saveRecord(this.settings.difficulty, this.score);
    this.audio.play(won ? "win" : "death");
    this.ui.end(this, won, this.score > oldBest);
    this.ui.state(this.state);
  }
  cleanup() {
    for (const b of this.enemies) this.removeEnemy(b);
    this.enemies = [];
    for (const list of [
      this.projectiles,
      this.grenades,
      this.pickups,
      this.shockwaves,
    ]) {
      for (const item of list) {
        this.world.scene.remove(item.mesh);
        if (list === this.shockwaves) {
          item.mesh.geometry.dispose();
          item.mesh.material.dispose();
        }
      }
      list.length = 0;
    }
    for (const mark of this.pending) {
      this.world.scene.remove(mark.mesh);
      mark.mesh.geometry.dispose();
    }
    this.pending = [];
    this.world.clearEffects();
    this.ui.clearNumbers();
  }
  nextWave() {
    this.wave++;
    this.waveStart = this.elapsed;
    this.waveKills = 0;
    this.waveHeads = 0;
    this.waveClearTime = 0;
    this.comboTime = 0;
    this.combo = 0;
    const roster = waveRoster(this.wave);
    const spawns = [...SPAWNS].sort(
      (a, b) =>
        Math.hypot(
          b[0] - this.player.position.x,
          b[1] - this.player.position.z,
        ) -
        Math.hypot(
          a[0] - this.player.position.x,
          a[1] - this.player.position.z,
        ),
    );
    roster.forEach((type, i) => {
      const spawn = spawns[i % spawns.length];
      const x = spawn[0] + (i >= 8 ? 2 : 0),
        z = spawn[1];
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(0.85, 1.05, 32),
        this.warningMaterial(),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, 0.04, z);
      this.world.scene.add(mesh);
      this.pending.push({ type, x, z, delay: 1.2 + i * 0.38, mesh });
    });
    this.announce(
      this.wave === FINAL_WAVE
        ? "DER AUFSEHER"
        : `WELLE ${String(this.wave).padStart(2, "0")}`,
      this.wave === FINAL_WAVE
        ? "Spring über Schockwellen. Bleib in Bewegung."
        : `${roster.length} Gegner · ${this.wave === 1 ? "Bring deinen Flow ins Rollen." : "Neue Formation. Neues Tempo."}`,
      3.2,
    );
    this.audio.play("wave");
  }
  warningMaterial() {
    this.spawnMaterial ??= new THREE.MeshBasicMaterial({
      color: "#ffa678",
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
    return this.spawnMaterial;
  }
  spawnEnemy(type, x, z) {
    const visual = this.world.enemy(type),
      config = ENEMIES[type];
    visual.group.position.set(x, 0, z);
    const enemy = {
      ...visual,
      id: ++this.lastEnemyId,
      type,
      config,
      hp: config.hp,
      maxHp: config.hp,
      cooldown: 1 + Math.random(),
      windup: 0,
      path: [],
      pathTime: 0,
      phase: Math.random() * 6.28,
      stagger: 0,
      flash: 0,
      attackCount: 0,
      enraged: false,
      aim: new THREE.Vector3(),
      lastSeen: this.player.position.clone(),
    };
    for (const mesh of enemy.hitMeshes) mesh.userData.enemy = enemy;
    enemy.laser = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]),
      new THREE.LineBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: 0.75,
      }),
    );
    enemy.laser.visible = false;
    enemy.laser.frustumCulled = false;
    this.world.scene.add(enemy.laser);
    this.enemies.push(enemy);
    this.world.ring(enemy.group.position, config.color, 1, 0.7);
    return enemy;
  }
  removeEnemy(b) {
    this.world.removeEnemy(b);
    this.world.scene.remove(b.laser);
    b.laser.geometry.dispose();
    b.laser.material.dispose();
  }
  announce(title, subtitle = "", time = 2.2) {
    this.announcementTime = time;
    this.ui.announce(title, subtitle);
  }
  choosePerk(index) {
    if (
      this.state !== "upgrade" ||
      !this.perkOptions[index] ||
      document.querySelector("dialog[open]")
    )
      return;
    const perk = this.perkOptions[index];
    this.levels[perk.id] = (this.levels[perk.id] || 0) + 1;
    if (perk.id === "vital") {
      this.player.maxHealth = 100 + 25 * this.levels.vital;
      this.player.health = this.player.maxHealth;
    }
    if (perk.id === "magazine")
      this.ammunition = WEAPONS.map((_, i) => this.magazine(i));
    if (perk.id === "blast") this.grenadeCount = this.maxGrenades;
    this.input.clear();
    this.state = "playing";
    this.ui.state(this.state);
    this.audio.unlock();
    this.audio.play("upgrade");
    this.nextWave();
    this.input.lock();
  }
  completeWave() {
    // All hostile hazards disappear before the upgrade screen, never between frames of live combat.
    if (this.wave === FINAL_WAVE) {
      this.finish(true);
      return;
    }
    this.state = "upgrade";
    this.input.clear();
    this.input.unlock();
    for (const p of this.projectiles) this.world.scene.remove(p.mesh);
    this.projectiles = [];
    for (const p of this.shockwaves) {
      this.world.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    }
    this.shockwaves = [];
    for (const g of this.grenades) this.world.scene.remove(g.mesh);
    this.grenades = [];
    this.reloadTime = 0;
    this.ammunition = WEAPONS.map((_, i) => this.magazine(i));
    this.grenadeCount = this.maxGrenades;
    this.player.health = Math.min(
      this.player.maxHealth,
      this.player.health + 35,
    );
    this.player.dashCooldown = 0;
    this.player.velocity.set(0, 0, 0);
    this.player.dash = 0;
    this.player.slide = 0;
    this.perkOptions = perkChoices(this.levels);
    this.ui.upgrades(this);
    this.ui.state(this.state);
    this.audio.play("upgrade");
  }
  switchWeapon(index) {
    if (
      this.state !== "playing" ||
      index === this.weaponIndex ||
      index < 0 ||
      index >= 3
    )
      return;
    this.weaponIndex = index;
    this.reloadTime = 0;
    this.switchTime = 0.22 * Math.pow(0.8, this.levels.reload || 0);
    this.shotSequence = 0;
    this.bloom = 0;
    this.startWeaponVisible();
    this.audio.play("rack");
  }
  reload() {
    if (
      this.reloadTime ||
      this.switchTime ||
      this.ammunition[this.weaponIndex] >= this.magazine()
    )
      return;
    this.reloadTotal =
      this.weapon.reload * Math.pow(0.8, this.levels.reload || 0);
    this.reloadTime = this.reloadTotal;
    this.audio.play("reload");
  }
  dash() {
    const p = this.player;
    if (p.dashCooldown > 0) return;
    const f =
        (this.input.down("KeyW") ? 1 : 0) - (this.input.down("KeyS") ? 1 : 0),
      s = (this.input.down("KeyD") ? 1 : 0) - (this.input.down("KeyA") ? 1 : 0);
    p.dashDirection.set(
      s * Math.cos(p.yaw) - f * Math.sin(p.yaw),
      0,
      -f * Math.cos(p.yaw) - s * Math.sin(p.yaw),
    );
    if (!p.dashDirection.lengthSq())
      p.dashDirection.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    p.dashDirection.normalize();
    p.dash = 0.17;
    p.dashCooldown = 2.6 * Math.pow(0.75, this.levels.dash || 0);
    p.invulnerable = 0.15;
    p.slide = 0;
    this.audio.play("dash");
  }
  grenade() {
    if (this.grenadeCount <= 0 || this.grenadeCooldown > 0) return;
    this.reloadTime = 0;
    this.grenadeCount--;
    this.grenadeCooldown = 0.55;
    const mesh = new THREE.Mesh(
      this.grenadeGeometry,
      this.world.mat("#89e5db", 0.5),
    );
    const origin = this.eyePosition();
    mesh.position.copy(origin);
    const velocity = this.lookDirection()
      .multiplyScalar(18)
      .add(
        new THREE.Vector3(
          this.player.velocity.x * 0.3,
          5,
          this.player.velocity.z * 0.3,
        ),
      );
    this.grenades.push({ mesh, velocity, life: 1.25 });
    this.world.scene.add(mesh);
    this.audio.play("grenade");
  }
  melee() {
    if (this.meleeCooldown > 0 || this.switchTime) return;
    this.reloadTime = 0;
    this.meleeCooldown = 0.65;
    this.meleeTime = 0.25;
    this.audio.play("melee");
    const dir = this.lookDirection();
    for (const b of [...this.enemies]) {
      const delta = b.group.position.clone().sub(this.player.position),
        dist = delta.length();
      delta.y = 0;
      if (
        dist < 2.8 &&
        delta.normalize().dot(dir) > 0.5 &&
        lineOfSight(
          this.eyePosition(),
          b.group.position.clone().add(new THREE.Vector3(0, 1, 0)),
        )
      ) {
        this.damageEnemy(
          b,
          95,
          false,
          b.group.position.clone().add(new THREE.Vector3(0, 1, 0)),
          "melee",
        );
        b.stagger = 0.6;
        moveCircle(b.group.position, dir.x * 0.6, dir.z * 0.6, 0.6);
      }
    }
  }
  eyePosition() {
    return this.player.position
      .clone()
      .add(new THREE.Vector3(0, this.player.eye, 0));
  }
  lookDirection() {
    return new THREE.Vector3(0, 0, -1).applyEuler(
      new THREE.Euler(
        this.player.pitch + this.kickPitch,
        this.player.yaw + this.kickYaw,
        0,
        "YXZ",
      ),
    );
  }
  fire() {
    if (this.state !== "playing") return;
    const index = this.weaponIndex,
      w = this.weapon;
    if (
      this.cooldowns[index] > 0 ||
      this.reloadTime ||
      this.switchTime ||
      this.player.dash > 0 ||
      this.meleeTime > 0
    )
      return;
    if (this.ammunition[index] <= 0) {
      this.audio.play("empty");
      this.reload();
      return;
    }
    this.ammunition[index]--;
    this.cooldowns[index] = w.interval;
    this.shots++;
    this.shotSequence++;
    const focus = Math.pow(0.75, this.levels.focus || 0),
      moving = Math.hypot(this.player.velocity.x, this.player.velocity.z) > 2;
    const spread =
      (this.aimBlend > 0.7 ? w.adsSpread : w.spread) *
      (1 + this.bloom) *
      (moving && w.id !== "smg" ? 1.35 : 1) *
      (this.player.grounded ? 1 : 1.7) *
      focus;
    const origin = this.eyePosition(),
      dir = this.lookDirection();
    const up = new THREE.Vector3(0, 1, 0),
      right = dir.clone().cross(up).normalize(),
      vertical = right.clone().cross(dir).normalize();
    const targets = [
      ...this.world.staticTargets,
      ...this.enemies.flatMap((b) => b.hitMeshes),
    ];
    const damage = new Map();
    this.world.scene.updateMatrixWorld(true);
    for (let i = 0; i < w.pellets; i++) {
      const angle =
        w.pellets === 1
          ? Math.random() * Math.PI * 2
          : (i / w.pellets) * Math.PI * 2 + this.shotSequence * 0.37;
      const radius =
        w.pellets === 1
          ? Math.sqrt(Math.random()) * spread
          : i === 0
            ? 0
            : spread * (0.55 + 0.45 * (i % 2));
      const shot = dir
        .clone()
        .addScaledVector(right, Math.cos(angle) * radius)
        .addScaledVector(vertical, Math.sin(angle) * radius)
        .normalize();
      this.ray.set(origin, shot);
      const hit = this.ray.intersectObjects(targets, false)[0],
        end = hit ? hit.point : origin.clone().addScaledVector(shot, 85);
      const muzzle = origin
        .clone()
        .addScaledVector(dir, 0.8)
        .addScaledVector(right, 0.16)
        .addScaledVector(vertical, -0.18);
      if (i < 3) this.world.tracer(muzzle, end);
      if (hit) {
        const enemy = hit.object.userData.enemy;
        if (enemy) {
          const previous = damage.get(enemy) || {
            amount: 0,
            head: false,
            point: hit.point,
          };
          const head = hit.object.userData.head === true;
          previous.amount += weaponDamage(
            w,
            hit.distance,
            head,
            this.levels.power || 0,
          );
          previous.head ||= head;
          damage.set(enemy, previous);
        } else if (i < 2) this.world.sparks(hit.point, "#c6c6a8", 3);
      }
    }
    if (damage.size) this.hits++;
    for (const [enemy, hit] of damage)
      this.damageEnemy(enemy, hit.amount, hit.head, hit.point, w.id);
    this.kickPitch = Math.min(0.16, this.kickPitch + w.kick * focus);
    this.kickYaw += Math.sin(this.shotSequence * 1.7) * w.kick * 0.2 * focus;
    this.weaponKick = Math.min(
      0.16,
      this.weaponKick + (w.id === "shotgun" ? 0.14 : 0.045),
    );
    this.bloom = Math.min(1.5, this.bloom + 0.2);
    this.shake = Math.max(this.shake, w.id === "shotgun" ? 0.18 : 0.045);
    this.world.flashLight.intensity = 3;
    this.world.flash.visible = true;
    this.world.flash.position.set(
      this.aimBlend > 0.5 ? 0 : 0.29,
      -0.31 + 0.105 * this.aimBlend,
      -1.35,
    );
    this.world.flashLight.position.copy(this.world.flash.position);
    this.world.flash.rotation.z = Math.random() * 6.28;
    this.audio.play(w.id);
    this.world.sparks(
      origin.clone().addScaledVector(right, 0.3).addScaledVector(dir, 0.3),
      "#c5a366",
      1,
    );
  }
  damageEnemy(b, amount, headshot, position, source) {
    if (b.hp <= 0 || !this.enemies.includes(b)) return;
    const actual = Math.min(b.hp, amount);
    b.hp -= amount;
    b.flash = 0.12;
    b.stagger = b.type === "boss" ? 0.04 : 0.16;
    this.hitTime = 0.13;
    this.hitStyle = headshot ? "head" : "";
    this.audio.play(headshot ? "head" : "hit");
    this.world.sparks(position, headshot ? "#ffcc75" : "#c6f77d", 5);
    this.ui.number(position, Math.round(actual), headshot);
    if (b.hp <= 0) {
      const pos = b.group.position.clone();
      this.world.breakup(b, this.player.position);
      this.removeEnemy(b);
      this.enemies.splice(this.enemies.indexOf(b), 1);
      this.kills++;
      this.waveKills++;
      if (headshot) {
        this.headshots++;
        this.waveHeads++;
      }
      this.combo = this.comboTime > 0 ? Math.min(5, this.combo + 1) : 1;
      this.comboTime = 5;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      const points = Math.round(
        b.config.score *
          this.combo *
          (headshot ? 1.5 : 1) *
          this.difficulty.score,
      );
      this.score += points;
      this.hitStyle = "kill";
      this.hitTime = 0.23;
      this.audio.play("kill");
      this.world.ring(pos, "#c6f77d", 0.8, 0.3);
      this.feed.unshift({
        text: `${headshot ? "KOPFTREFFER" : source === "grenade" ? "EXPLOSION" : "ELIMINIERT"} / ${b.config.name}  +${points}`,
        life: 3,
      });
      this.feed.length = Math.min(4, this.feed.length);
      if (this.levels.leech)
        this.player.health = Math.min(
          this.player.maxHealth,
          this.player.health + 6 * this.levels.leech,
        );
      if (this.kills % 3 === 0)
        this.dropPickup(pos, this.kills % 6 === 0 ? "grenade" : "health");
      if (this.combo === 3)
        this.announce("IM FLOW", "×3 SCORE · Bleib dran.", 1.2);
      if (this.combo === 5)
        this.announce("OVERDRIVE", "×5 SCORE · Nicht nachlassen.", 1.2);
      this.shake = Math.max(this.shake, 0.12);
    }
  }
  hurt(amount, origin) {
    const p = this.player;
    if (this.state !== "playing" || p.invulnerable > 0) return;
    p.health = Math.max(0, p.health - amount * this.difficulty.damage);
    p.lastHurt = this.elapsed;
    p.invulnerable = 0.18;
    this.damageFlash = 0.6;
    this.shake = 0.3;
    const dx = origin.x - p.position.x,
      dz = origin.z - p.position.z;
    this.damageAngle = Math.atan2(dx, -dz) + p.yaw;
    this.audio.play("hurt", clamp(Math.sin(this.damageAngle), -1, 1));
    if (p.health <= 0) this.finish();
  }
  dropPickup(position, type) {
    const material = this.world.mat(
      type === "health" ? "#a9f279" : "#80dbeb",
      0.3,
    );
    const mesh = new THREE.Mesh(this.pickupGeometry, material);
    mesh.position.copy(position).y = 0.7;
    this.world.scene.add(mesh);
    this.pickups.push({ mesh, type, life: 22, phase: Math.random() * 6 });
  }
  projectile(origin, target, b, angle = 0) {
    const direction = target
      .clone()
      .sub(origin)
      .normalize()
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    let material = this.bulletMaterials.get(b.type);
    if (!material) {
      material = new THREE.MeshBasicMaterial({ color: b.config.color });
      this.bulletMaterials.set(b.type, material);
    }
    const mesh = new THREE.Mesh(this.bulletGeometry, material);
    mesh.position.copy(origin);
    mesh.scale.set(1.15, 1.15, b.type === "sniper" ? 6 : 4);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    this.world.scene.add(mesh);
    this.projectiles.push({
      mesh,
      velocity: direction.multiplyScalar(
        b.config.projectile * this.difficulty.speed,
      ),
      life: 5,
      damage: b.config.damage,
      origin: origin.clone(),
      near: false,
    });
  }
  attack(b) {
    const origin = b.group.position
      .clone()
      .add(new THREE.Vector3(0, 1.3 * b.scale, 0));
    b.attackCount++;
    if (b.type === "runner") {
      if (
        distance(b.group.position, this.player.position) < 2.4 &&
        lineOfSight(origin, this.eyePosition())
      )
        this.hurt(b.config.damage, origin);
    } else if (b.type === "boss") {
      for (let i = -3; i <= 3; i++)
        this.projectile(origin, b.aim, b, i * 0.115);
      if (b.attackCount % 2 === 0) {
        const mesh = new THREE.Mesh(
          new THREE.RingGeometry(0.94, 1, 64),
          new THREE.MeshBasicMaterial({
            color: "#ffad78",
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
          }),
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.copy(b.group.position).y = 0.09;
        this.world.scene.add(mesh);
        this.shockwaves.push({ mesh, radius: 0.5, hit: false });
        this.announce("SCHOCKWELLE", "Springen oder durchdashen!", 1.5);
      }
    } else if (b.type === "heavy")
      for (let i = -1; i <= 1; i++) this.projectile(origin, b.aim, b, i * 0.11);
    else this.projectile(origin, b.aim, b);
    this.audio.play(b.type === "runner" ? "melee" : "enemy", this.pan(origin));
  }
  pan(position) {
    const delta = position.clone().sub(this.player.position);
    return clamp(
      (delta.x * Math.cos(this.player.yaw) -
        delta.z * Math.sin(this.player.yaw)) /
        20,
      -1,
      1,
    );
  }
  updatePlayer(dt) {
    const p = this.player,
      input = this.input;
    const sensitivity =
      0.002 * this.settings.sensitivity * (this.aimBlend > 0.5 ? 0.65 : 1);
    p.yaw -= input.mouseX * sensitivity;
    p.pitch = clamp(p.pitch - input.mouseY * sensitivity, -1.4, 1.4);
    input.mouseX = 0;
    input.mouseY = 0;
    for (let i = 0; i < 3; i++)
      if (input.take(`Digit${i + 1}`)) this.switchWeapon(i);
    if (input.take("KeyR")) this.reload();
    if (input.take("KeyG")) this.grenade();
    if (input.take("KeyV")) this.melee();
    if (input.take("KeyE")) this.dash();
    if (input.take("Space")) p.jumpBuffer = 0.13;
    const forward = (input.down("KeyW") ? 1 : 0) - (input.down("KeyS") ? 1 : 0),
      side = (input.down("KeyD") ? 1 : 0) - (input.down("KeyA") ? 1 : 0);
    const moving = forward !== 0 || side !== 0;
    this.sprinting =
      input.down("ShiftLeft", "ShiftRight") &&
      forward > 0 &&
      !input.aim &&
      !input.fire &&
      !this.reloadTime;
    const slidingKey = input.take("ControlLeft") || input.take("ControlRight");
    if (
      slidingKey &&
      p.grounded &&
      p.slideCooldown <= 0 &&
      Math.hypot(p.velocity.x, p.velocity.z) > 5.5
    ) {
      p.slide = 0.75;
      p.slideCooldown = 1.1;
      const v = new THREE.Vector3(p.velocity.x, 0, p.velocity.z)
        .normalize()
        .multiplyScalar(12);
      p.velocity.x = v.x;
      p.velocity.z = v.z;
      this.audio.play("slide");
    }
    const boost = 1 + 0.08 * (this.levels.dash || 0),
      speed =
        (this.sprinting
          ? 9.5
          : input.aim
            ? 3.8
            : this.weaponIndex === 1
              ? 6.5
              : 6) * boost;
    const wish = new THREE.Vector3(
      side * Math.cos(p.yaw) - forward * Math.sin(p.yaw),
      0,
      -forward * Math.cos(p.yaw) - side * Math.sin(p.yaw),
    );
    if (moving) wish.normalize();
    if (p.dash > 0) {
      p.velocity.x = p.dashDirection.x * 25;
      p.velocity.z = p.dashDirection.z * 25;
    } else if (p.slide > 0) {
      p.velocity.x *= Math.exp(-1.5 * dt);
      p.velocity.z *= Math.exp(-1.5 * dt);
      p.velocity.addScaledVector(wish, dt * 3);
    } else {
      const rate = p.grounded ? (moving ? 18 : 14) : 3.5;
      p.velocity.x = damp(p.velocity.x, wish.x * speed, rate, dt);
      p.velocity.z = damp(p.velocity.z, wish.z * speed, rate, dt);
    }
    if (p.grounded) p.coyote = 0.1;
    else p.coyote = Math.max(0, p.coyote - dt);
    if (p.jumpBuffer > 0 && p.coyote > 0) {
      p.velocity.y = 7.3;
      p.grounded = false;
      p.coyote = 0;
      p.jumpBuffer = 0;
      if (p.slide > 0) {
        p.slide = 0;
        p.velocity.x *= 1.08;
        p.velocity.z *= 1.08;
      }
      this.audio.play("step");
    }
    p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    p.velocity.y -= 22 * dt;
    const before = p.position.clone();
    moveCircle(p.position, p.velocity.x * dt, p.velocity.z * dt, 0.36);
    if (Math.abs(p.position.x - before.x) < 1e-6) p.velocity.x = 0;
    if (Math.abs(p.position.z - before.z) < 1e-6) p.velocity.z = 0;
    p.position.y += p.velocity.y * dt;
    if (p.position.y <= 0) {
      if (!p.grounded && p.velocity.y < -3) {
        this.audio.play("land");
        this.landing = 0.12;
      }
      p.position.y = 0;
      p.velocity.y = 0;
      p.grounded = true;
    } else p.grounded = false;
    p.eye = damp(p.eye, p.slide > 0 ? 1.02 : 1.68, 18, dt);
    for (const key of [
      "dash",
      "dashCooldown",
      "slide",
      "slideCooldown",
      "invulnerable",
    ])
      p[key] = Math.max(0, p[key] - dt);
    const actualSpeed = Math.hypot(p.velocity.x, p.velocity.z);
    if (actualSpeed > 1.8 && p.grounded && p.slide <= 0 && p.dash <= 0) {
      this.stepTime -= dt;
      if (this.stepTime <= 0) {
        this.audio.play("step", Math.sin(this.elapsed * 12) * 0.25);
        this.stepTime = this.sprinting ? 0.28 : 0.4;
      }
    } else this.stepTime = 0;
    if (p.health < p.maxHealth && this.elapsed - p.lastHurt > 4)
      p.health = Math.min(p.maxHealth, p.health + dt * 9);
    this.aimBlend = damp(
      this.aimBlend,
      input.aim && p.dash <= 0 && !this.sprinting && !this.reloadTime ? 1 : 0,
      14,
      dt,
    );
  }
  updateEnemies(dt) {
    const eye = this.eyePosition(),
      p = this.player;
    for (const b of this.enemies) {
      const pos = b.group.position,
        dist = distance(pos, p.position),
        origin = pos.clone().add(new THREE.Vector3(0, 1.3 * b.scale, 0));
      const sight = lineOfSight(origin, eye);
      b.cooldown = Math.max(0, b.cooldown - dt);
      b.stagger = Math.max(0, b.stagger - dt);
      b.flash = Math.max(0, b.flash - dt);
      b.pathTime -= dt;
      b.bar.scale.x = clamp(b.hp / b.maxHp, 0.001, 1);
      b.bar.quaternion.copy(this.world.camera.quaternion);
      b.bar.rotation.y -= b.group.rotation.y;
      b.bar.visible = b.hp < b.maxHp || b.windup > 0;
      b.body.material = this.world.mat(
        b.flash > 0
          ? "#e6ffc4"
          : b.windup > 0
            ? b.config.color
            : b.type === "runner"
              ? "#695a32"
              : "#35413c",
      );
      b.ring.material.opacity = b.windup > 0 ? 0.95 : 0.35;
      b.ring.scale.setScalar(
        b.windup > 0 ? 1.1 + Math.sin(this.elapsed * 22) * 0.15 : 1,
      );
      if (b.type === "boss" && b.hp < b.maxHp * 0.5 && !b.enraged) {
        b.enraged = true;
        this.announce("PHASE II", "Der Aufseher wird schneller.", 2);
        this.audio.play("warn");
      }
      if (b.windup > 0) {
        b.windup -= dt;
        b.group.rotation.y = Math.atan2(b.aim.x - pos.x, b.aim.z - pos.z);
        b.laser.visible = b.type === "sniper" || b.type === "boss";
        if (b.laser.visible) {
          const data = b.laser.geometry.attributes.position;
          data.setXYZ(0, origin.x, origin.y, origin.z);
          data.setXYZ(1, b.aim.x, b.aim.y, b.aim.z);
          data.needsUpdate = true;
        }
        if (b.windup <= 0) {
          b.laser.visible = false;
          this.attack(b);
          b.cooldown = b.config.interval / (b.enraged ? 1.45 : 1);
        }
        continue;
      }
      b.laser.visible = false;
      const range = b.config.range;
      if (sight && dist < range && b.cooldown <= 0 && b.stagger <= 0) {
        b.windup =
          b.config.windup / (this.difficulty.speed * (b.enraged ? 1.2 : 1));
        b.aim.copy(eye);
        b.aim.x += p.velocity.x * 0.13;
        b.aim.z += p.velocity.z * 0.13;
        if (b.type === "sniper" || b.type === "boss")
          this.audio.play("warn", this.pan(origin));
        continue;
      }
      if (b.stagger > 0) continue;
      // Flankers follow an offset route while shooters seek their preferred range.
      const chasing =
        !sight ||
        dist > (b.type === "runner" ? 1.65 : b.type === "sniper" ? 22 : 13);
      let vx = 0,
        vz = 0;
      if (chasing) {
        if (b.pathTime <= 0) {
          let goal = p.position.clone();
          if (b.type === "runner" && dist > 8) {
            goal.x += Math.sin(b.phase) * 4;
            goal.z += Math.cos(b.phase) * 4;
            if (blocked(goal.x, goal.z, 0.75)) goal.copy(p.position);
          }
          b.path = this.nav.path(pos, goal);
          b.pathTime = 0.65 + Math.random() * 0.2;
        }
        while (b.path.length && distance(pos, b.path[0]) < 0.65) b.path.shift();
        let target = b.path[0];
        if (sight && dist < 9) target = p.position;
        if (target) {
          const len = Math.hypot(target.x - pos.x, target.z - pos.z) || 1;
          vx = (target.x - pos.x) / len;
          vz = (target.z - pos.z) / len;
        }
      } else if (b.type !== "runner") {
        const dx = (p.position.x - pos.x) / Math.max(dist, 0.1),
          dz = (p.position.z - pos.z) / Math.max(dist, 0.1);
        const strafe = Math.sin(this.elapsed * 0.7 + b.phase) > 0.0 ? 1 : -1;
        const retreat = dist < (b.type === "sniper" ? 14 : 6) ? -1 : 0;
        vx = dx * retreat - dz * strafe * 0.55;
        vz = dz * retreat + dx * strafe * 0.55;
      }
      // Local separation prevents stacked enemies and keeps the firing lanes legible.
      for (const other of this.enemies) {
        if (other === b) continue;
        const d = distance(pos, other.group.position);
        if (d < 1.25 && d > 0.01) {
          vx += ((pos.x - other.group.position.x) / d) * (1.25 - d) * 1.5;
          vz += ((pos.z - other.group.position.z) / d) * (1.25 - d) * 1.5;
        }
      }
      const len = Math.hypot(vx, vz);
      if (len > 1) {
        vx /= len;
        vz /= len;
      }
      const speed =
        b.config.speed * this.difficulty.speed * (b.enraged ? 1.35 : 1);
      const before = pos.clone();
      moveCircle(
        pos,
        vx * speed * dt,
        vz * speed * dt,
        b.type === "boss" ? 0.8 : 0.52,
      );
      // Enemies cannot silently phase through the player.
      const toPlayer = distance(pos, p.position);
      if (toPlayer < 0.9 && toPlayer > 0.001)
        moveCircle(
          pos,
          ((pos.x - p.position.x) / toPlayer) * (0.9 - toPlayer),
          ((pos.z - p.position.z) / toPlayer) * (0.9 - toPlayer),
          0.52,
        );
      b.group.rotation.y = Math.atan2(
        p.position.x - pos.x,
        p.position.z - pos.z,
      );
      const moving = before.distanceToSquared(pos) > 0.000001;
      b.legs[0].rotation.x = moving
        ? Math.sin(this.elapsed * (b.type === "runner" ? 15 : 9) + b.phase) *
          0.55
        : 0;
      b.legs[1].rotation.x = -b.legs[0].rotation.x;
      b.group.position.y = moving
        ? Math.abs(Math.sin(this.elapsed * 9 + b.phase)) * 0.025
        : 0;
    }
  }
  updateProjectiles(dt) {
    const center = this.eyePosition().add(new THREE.Vector3(0, -0.4, 0));
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const b = this.projectiles[i],
        from = b.mesh.position.clone(),
        to = from.clone().addScaledVector(b.velocity, dt);
      b.life -= dt;
      const wall = !lineOfSight(from, to),
        hit = !wall && segmentSphere(from, to, center, 0.46);
      if (hit) this.hurt(b.damage, b.origin);
      if (
        wall ||
        hit ||
        b.life <= 0 ||
        to.y < 0 ||
        Math.abs(to.x) > 36 ||
        Math.abs(to.z) > 36
      ) {
        if (wall) this.world.sparks(to, b.mesh.material.color, 2);
        this.world.scene.remove(b.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }
      if (!b.near && to.distanceTo(center) < 2.5) {
        b.near = true;
        this.audio.play("near", this.pan(to));
      }
      b.mesh.position.copy(to);
    }
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += dt * 9;
      s.mesh.scale.setScalar(s.radius);
      const d = distance(s.mesh.position, this.player.position);
      if (
        !s.hit &&
        Math.abs(d - s.radius) < 0.7 &&
        this.player.position.y < 0.65 &&
        lineOfSight(
          s.mesh.position.clone().setY(0.3),
          this.player.position.clone().setY(0.3),
        )
      ) {
        this.hurt(22, s.mesh.position);
        s.hit = true;
      }
      if (s.radius > 42) {
        this.world.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        s.mesh.material.dispose();
        this.shockwaves.splice(i, 1);
      }
    }
  }
  explode(position) {
    const radius = 5.5 * (1 + 0.25 * (this.levels.blast || 0));
    this.world.explosion(position, radius);
    this.audio.play("explosion", this.pan(position));
    for (const b of [...this.enemies]) {
      const target = b.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)),
        d = position.distanceTo(target);
      if (d < radius && lineOfSight(position, target)) {
        this.damageEnemy(
          b,
          280 * (1 - (d / radius) * 0.7),
          false,
          target,
          "grenade",
        );
        b.stagger = 0.8;
      }
    }
    // Grenades are intentionally player-safe: they reward aggressive pushes.
    if (position.distanceTo(this.player.position) < 12) this.shake = 0.35;
  }
  updateGrenades(dt) {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.life -= dt;
      g.velocity.y -= 14 * dt;
      const from = g.mesh.position.clone();
      const nextX = from
        .clone()
        .add(new THREE.Vector3(g.velocity.x * dt, 0, 0));
      if (!lineOfSight(from, nextX)) {
        g.velocity.x *= -0.55;
      } else g.mesh.position.x = nextX.x;
      const nextZ = g.mesh.position
        .clone()
        .add(new THREE.Vector3(0, 0, g.velocity.z * dt));
      if (!lineOfSight(g.mesh.position, nextZ)) {
        g.velocity.z *= -0.55;
      } else g.mesh.position.z = nextZ.z;
      const nextY = g.mesh.position
        .clone()
        .add(new THREE.Vector3(0, g.velocity.y * dt, 0));
      if (!lineOfSight(g.mesh.position, nextY)) {
        g.velocity.y *= -0.35;
      } else g.mesh.position.y = nextY.y;
      if (g.mesh.position.y < 0.18) {
        g.mesh.position.y = 0.18;
        g.velocity.y = Math.abs(g.velocity.y) * 0.35;
        g.velocity.x *= 0.85;
        g.velocity.z *= 0.85;
      }
      g.mesh.rotation.x += dt * 7;
      g.mesh.rotation.z += dt * 5;
      g.mesh.scale.setScalar(1 + Math.sin(this.elapsed * 28) * 0.12);
      if (g.life <= 0) {
        this.explode(g.mesh.position.clone());
        this.world.scene.remove(g.mesh);
        this.grenades.splice(i, 1);
      }
    }
  }
  updatePickups(dt) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.life -= dt;
      p.mesh.rotation.y += dt * 2;
      p.mesh.position.y = 0.65 + Math.sin(this.elapsed * 3 + p.phase) * 0.1;
      const canCollect =
        p.type === "health"
          ? this.player.health < this.player.maxHealth
          : this.grenadeCount < this.maxGrenades;
      if (
        canCollect &&
        distance(p.mesh.position, this.player.position) < 1.6 &&
        this.player.position.y < 1.8
      ) {
        if (p.type === "health")
          this.player.health = Math.min(
            this.player.maxHealth,
            this.player.health + 25,
          );
        else
          this.grenadeCount = Math.min(this.maxGrenades, this.grenadeCount + 1);
        this.audio.play("pickup");
        this.ui.pickup(p.type === "health" ? "+25 GESUNDHEIT" : "+1 GRANATE");
        p.life = 0;
      }
      if (p.life <= 0) {
        this.world.scene.remove(p.mesh);
        this.pickups.splice(i, 1);
      }
    }
  }
  updateView(dt) {
    const p = this.player,
      camera = this.world.camera;
    this.kickPitch = damp(this.kickPitch, 0, 10, dt);
    this.kickYaw = damp(this.kickYaw, 0, 10, dt);
    this.weaponKick = damp(this.weaponKick, 0, 17, dt);
    this.shake = damp(this.shake, 0, 14, dt);
    this.landing = damp(this.landing, 0, 14, dt);
    this.bloom = damp(this.bloom, 0, 6, dt);
    const moving = Math.hypot(p.velocity.x, p.velocity.z) > 1,
      bob =
        this.settings.shake && moving && p.grounded && p.slide <= 0
          ? Math.sin(this.elapsed * (this.sprinting ? 18 : 13)) * 0.025
          : 0;
    const shake = this.settings.shake ? this.shake : 0;
    camera.position.copy(this.eyePosition());
    camera.position.y += bob - (this.settings.shake ? this.landing : 0);
    camera.rotation.set(
      p.pitch + this.kickPitch + Math.sin(this.elapsed * 76) * shake * 0.025,
      p.yaw + this.kickYaw,
      Math.sin(this.elapsed * 55) * shake * 0.018 +
        (this.settings.shake && p.slide > 0 ? -0.035 : 0),
      "YXZ",
    );
    const fov =
      this.settings.fov -
      this.aimBlend * (this.weaponIndex === 1 ? 21 : 29) +
      (p.dash > 0 ? 10 : this.sprinting ? 5 : 0);
    camera.fov = damp(camera.fov, fov, 12, dt);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const gun = this.world.weapons[this.weaponIndex];
    gun.position.set(
      0.05 * (1 - this.aimBlend) -
        0.24 * this.aimBlend +
        Math.sin(this.elapsed * 6) * bob * 0.5,
      -0.09 + 0.105 * this.aimBlend + Math.cos(this.elapsed * 13) * bob * 0.25,
      -0.25 - this.weaponKick * 0.1,
    );
    gun.position.z += this.weaponKick * 0.8;
    const reload = this.reloadTime
      ? Math.sin((this.reloadTime / this.reloadTotal) * Math.PI)
      : 0;
    gun.rotation.set(
      -reload * 0.7 +
        this.weaponKick -
        (this.meleeTime > 0
          ? Math.sin((this.meleeTime / 0.25) * Math.PI) * 0.6
          : 0),
      this.meleeTime > 0 ? -0.35 : 0,
      -reload * 0.35,
    );
    gun.position.y -= this.switchTime * 1.2;
    this.world.flashLight.intensity = Math.max(
      0,
      this.world.flashLight.intensity - dt * 60,
    );
    this.world.flash.visible = this.world.flashLight.intensity > 0;
  }
  update(dt) {
    if (this.state !== "playing") return;
    this.elapsed += dt;
    this.cooldowns = this.cooldowns.map((t) => Math.max(0, t - dt));
    for (const key of [
      "switchTime",
      "grenadeCooldown",
      "meleeCooldown",
      "meleeTime",
      "hitTime",
      "damageFlash",
      "announcementTime",
    ])
      this[key] = Math.max(0, this[key] - dt);
    this.feed = this.feed.filter((f) => {
      f.life -= dt;
      return f.life > 0;
    });
    this.comboTime = Math.max(0, this.comboTime - dt);
    if (!this.comboTime) this.combo = 0;
    if (this.reloadTime > 0) {
      this.reloadTime = Math.max(0, this.reloadTime - dt);
      if (!this.reloadTime) {
        this.ammunition[this.weaponIndex] = this.magazine();
        this.audio.play("rack");
      }
    }
    this.updatePlayer(dt);
    this.updateView(dt);
    if (this.input.fire && !this.sprinting) this.fire();
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const s = this.pending[i];
      s.delay -= dt;
      s.mesh.scale.setScalar(1 + Math.sin(s.delay * 12) * 0.12);
      if (s.delay <= 0) {
        this.world.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        this.spawnEnemy(s.type, s.x, s.z);
        this.pending.splice(i, 1);
      }
    }
    this.updateEnemies(dt);
    if (this.state !== "playing") return;
    this.updateProjectiles(dt);
    if (this.state !== "playing") return;
    this.updateGrenades(dt);
    this.updatePickups(dt);
    this.world.updateEffects(dt);
    if (!this.enemies.length && !this.pending.length) {
      this.waveClearTime += dt;
      if (this.waveClearTime > 0.9) this.completeWave();
    } else this.waveClearTime = 0;
  }
  snapshot() {
    const p = this.player;
    return {
      state: this.state,
      wave: this.wave,
      health: p.health,
      maxHealth: p.maxHealth,
      position: { x: p.position.x, y: p.position.y, z: p.position.z },
      velocity: { x: p.velocity.x, y: p.velocity.y, z: p.velocity.z },
      slide: p.slide,
      dash: p.dash,
      dashCooldown: p.dashCooldown,
      weapon: this.weapon.id,
      weaponIndex: this.weaponIndex,
      ammo: [...this.ammunition],
      magazine: this.magazine(),
      reload: this.reloadTime,
      grenades: this.grenadeCount,
      kills: this.kills,
      headshots: this.headshots,
      score: this.score,
      combo: this.combo,
      bestCombo: this.bestCombo,
      elapsed: this.elapsed,
      shots: this.shots,
      hits: this.hits,
      levels: { ...this.levels },
      enemies: this.enemies.map((b) => ({
        id: b.id,
        type: b.type,
        hp: b.hp,
        enraged: b.enraged,
        attacks: b.attackCount,
        position: {
          x: b.group.position.x,
          y: b.group.position.y,
          z: b.group.position.z,
        },
        windup: b.windup,
      })),
      pending: this.pending.length,
      projectiles: this.projectiles.length,
      shockwaves: this.shockwaves.length,
      perks: this.perkOptions.map((p) => p.id),
    };
  }
}
