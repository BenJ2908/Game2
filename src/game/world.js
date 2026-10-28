import * as THREE from "three";
import { ARENA, ENEMIES, WEAPONS } from "./rules.js";

export class World {
  constructor(canvas, settings) {
    this.settings = settings;
    this.geometries = new Map();
    this.materials = new Map();
    this.effects = [];
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#7e969b");
    this.scene.fog = new THREE.Fog("#7e969b", 38, 105);
    this.camera = new THREE.PerspectiveCamera(
      settings.fov,
      innerWidth / innerHeight,
      0.06,
      150,
    );
    this.camera.rotation.order = "YXZ";
    this.scene.add(this.camera);
    this.scene.add(new THREE.HemisphereLight("#e1f2ed", "#464d3e", 2.5));
    this.sun = new THREE.DirectionalLight("#ffe7bf", 3.4);
    this.sun.position.set(-18, 32, 14);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, {
      left: -40,
      right: 40,
      top: 40,
      bottom: -40,
      near: 0.5,
      far: 110,
    });
    this.sun.shadow.bias = -0.001;
    this.scene.add(this.sun);
    this.staticTargets = [];
    this.arena();
    this.weapons = WEAPONS.map((w, i) => this.weapon(w, i));
    this.flashLight = new THREE.PointLight("#ffd696", 0, 5);
    this.camera.add(this.flashLight);
    this.flash = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.24, 6),
      new THREE.MeshBasicMaterial({
        color: "#ffdc89",
        transparent: true,
        opacity: 0.9,
        depthTest: false,
      }),
    );
    this.flash.rotation.x = -Math.PI / 2;
    this.flash.visible = false;
    this.camera.add(this.flash);
    this.applyQuality();
    this.resize();
  }
  mat(color, metalness = 0, roughness = 0.8) {
    const key = `${color}/${metalness}/${roughness}`;
    if (!this.materials.has(key))
      this.materials.set(
        key,
        new THREE.MeshStandardMaterial({ color, metalness, roughness }),
      );
    return this.materials.get(key);
  }
  geometry(w, h, d) {
    const key = `${w}/${h}/${d}`;
    if (!this.geometries.has(key))
      this.geometries.set(key, new THREE.BoxGeometry(w, h, d));
    return this.geometries.get(key);
  }
  box(w, h, d, color, x, y, z, parent = this.scene, metal = 0.1) {
    const mesh = new THREE.Mesh(this.geometry(w, h, d), this.mat(color, metal));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  arena() {
    const floor = this.box(72, 0.4, 72, "#737c6b", 0, -0.2, 0);
    this.staticTargets.push(floor);
    for (let i = -32; i <= 32; i += 8) {
      this.box(0.025, 0.008, 68, "#536351", i, 0.006, 0);
      this.box(68, 0.008, 0.025, "#536351", 0, 0.006, i);
    }
    for (let i = -30; i <= 30; i += 4) {
      this.box(1.6, 0.012, 0.13, "#c4dd82", i, 0.015, 7);
      this.box(1.6, 0.012, 0.13, "#c4dd82", i, 0.015, -7);
    }
    for (const o of ARENA) {
      const color =
        o.kind === "wall"
          ? "#98a497"
          : o.kind === "cover"
            ? "#a7ae97"
            : o.x < 0
              ? "#355952"
              : "#805f46";
      const mesh = this.box(o.hw * 2, o.h, o.hd * 2, color, o.x, o.h / 2, o.z);
      this.staticTargets.push(mesh);
      if (o.kind === "container") {
        this.box(
          o.hw * 2 + 0.1,
          0.1,
          o.hd * 2 + 0.1,
          "#293c36",
          o.x,
          o.h + 0.03,
          o.z,
        );
        if (o.hd > o.hw)
          for (let z = -o.hd + 0.25; z < o.hd; z += 0.65)
            for (const sign of [-1, 1])
              this.box(
                0.08,
                o.h - 0.2,
                0.07,
                "#567566",
                o.x + sign * (o.hw + 0.025),
                o.h / 2,
                o.z + z,
              );
        else
          for (let x = -o.hw + 0.25; x < o.hw; x += 0.65)
            for (const sign of [-1, 1])
              this.box(
                0.07,
                o.h - 0.2,
                0.08,
                "#567566",
                o.x + x,
                o.h / 2,
                o.z + sign * (o.hd + 0.025),
              );
        this.box(
          o.hw * 2 + 0.15,
          0.16,
          0.14,
          "#cee78a",
          o.x,
          o.h - 0.35,
          o.z + o.hd + 0.05,
        );
      }
      if (o.kind === "cover") {
        this.box(
          o.hw * 2 + 0.08,
          0.12,
          o.hd * 2 + 0.08,
          "#39483e",
          o.x,
          o.h,
          o.z,
        );
        this.box(0.65, 0.018, o.hd * 2 + 0.1, "#c3dd87", o.x, o.h + 0.07, o.z);
      }
    }
    for (let i = -32; i <= 32; i += 8)
      for (const z of [-34.3, 34.3])
        this.box(0.5, 9, 0.9, "#394d44", i, 4.5, z);
    for (const x of [-30, 30])
      for (const z of [-26, 0, 26]) {
        this.box(0.6, 12, 0.6, "#344c43", x, 6, z);
        this.box(1.8, 0.16, 1.8, "#647967", x, 12, z);
      }
    for (const z of [-26, 26]) {
      this.box(60, 0.55, 0.65, "#354c43", 0, 12, z);
      for (let x = -28; x < 29; x += 4) {
        const b = this.box(0.16, 2.8, 0.18, "#68856f", x, 10.6, z);
        b.rotation.z = 0.65;
      }
    }
    this.sign("THE FOUNDRY", 0, 5.5, -34.35);
    this.sign("02 / VELOCITY", 34.35, 5.2, 8, -Math.PI / 2);
    for (const [x, z] of [
      [-29, -29],
      [29, -29],
      [-29, 29],
      [29, 29],
      [0, -29],
      [-29, 0],
      [29, 0],
      [0, 29],
    ]) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.3, 1.36, 32),
        new THREE.MeshBasicMaterial({
          color: "#d4ac7b",
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.4,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0.025, z);
      this.scene.add(ring);
    }
    this.scene.updateMatrixWorld(true);
  }
  sign(text, x, y, z, rotation = 0) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#203d34";
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = "#d1ee95";
    ctx.font = "bold 100px Arial";
    ctx.textAlign = "center";
    ctx.fillText(text, 512, 165);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 3),
      new THREE.MeshStandardMaterial({ map: tex }),
    );
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotation;
    this.scene.add(mesh);
  }
  weapon(config, index) {
    const g = new THREE.Group();
    g.visible = false;
    this.camera.add(g);
    const length = index === 1 ? 0.48 : index === 2 ? 0.85 : 0.7;
    this.box(0.15, 0.17, length, "#1f2928", 0.24, -0.24, -0.48, g, 0.6);
    this.box(0.17, 0.07, length * 0.7, "#596b65", 0.24, -0.15, -0.5, g, 0.7);
    this.box(
      index === 2 ? 0.1 : 0.052,
      0.06,
      index === 1 ? 0.22 : 0.4,
      "#172625",
      0.24,
      -0.22,
      -0.48 - length * 0.65,
      g,
      0.8,
    );
    this.box(0.17, 0.11, 0.2, "#314a43", 0.24, -0.25, -0.2, g, 0.4);
    const grip = this.box(0.075, 0.22, 0.1, "#182724", 0.24, -0.39, -0.34, g);
    grip.rotation.x = -0.2;
    const mag = this.box(
      index === 2 ? 0.05 : 0.07,
      index === 2 ? 0.1 : 0.23,
      0.15,
      "#354641",
      0.24,
      -0.37,
      -0.54,
      g,
    );
    mag.rotation.x = 0.14;
    this.box(0.14, 0.045, 0.18, "#172d27", 0.24, -0.09, -0.56, g);
    this.box(0.022, 0.035, 0.024, config.color, 0.24, -0.055, -0.59, g);
    for (const x of [-0.063, 0.063])
      this.box(0.015, 0.08, 0.02, "#253931", 0.24 + x, -0.07, -0.55, g);
    this.box(0.22, 0.075, 0.18, "#42544a", 0.23, -0.34, -0.18, g);
    this.box(0.09, 0.11, 0.27, "#53604e", 0.11, -0.34, -0.63, g);
    for (let i = 0; i < 4; i++)
      this.box(
        0.16,
        0.018,
        0.022,
        config.color,
        0.24,
        -0.17,
        -0.72 + i * 0.06,
        g,
        0.3,
      );
    // Weapon meshes never cast world shadows or write depth over nearby walls.
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
        o.renderOrder = 3;
        o.material = o.material.clone();
        o.material.depthTest = false;
      }
    });
    return g;
  }
  enemy(type) {
    const config = ENEMIES[type],
      g = new THREE.Group(),
      scale = type === "boss" ? 1.65 : type === "heavy" ? 1.2 : 1;
    const body = this.box(
      0.68,
      0.8,
      0.4,
      type === "runner" ? "#695a32" : "#35413c",
      0,
      1.08,
      0,
      g,
    );
    const chest = this.box(0.72, 0.16, 0.44, config.color, 0, 1.24, 0, g);
    const head = this.box(0.38, 0.36, 0.35, "#253333", 0, 1.73, 0, g);
    const visor = this.box(0.4, 0.09, 0.38, config.color, 0, 1.76, 0.015, g);
    const legs = [
      this.box(0.23, 0.65, 0.27, "#263d35", -0.2, 0.35, 0, g),
      this.box(0.23, 0.65, 0.27, "#263d35", 0.2, 0.35, 0, g),
    ];
    const arms = [
      this.box(0.18, 0.58, 0.22, "#49574c", -0.45, 1.04, 0, g),
      this.box(0.18, 0.58, 0.22, "#49574c", 0.45, 1.04, 0, g),
    ];
    this.box(0.14, 0.15, 0.65, "#1a2a26", 0.43, 1.18, 0.27, g);
    if (type === "heavy" || type === "boss")
      for (const x of [-0.46, 0.46])
        this.box(0.28, 0.28, 0.5, config.color, x, 1.43, 0, g);
    const health = new THREE.Mesh(
      new THREE.PlaneGeometry(0.95, 0.055),
      new THREE.MeshBasicMaterial({ color: config.color, depthTest: false }),
    );
    health.position.y = 2.12;
    g.add(health);
    const base = new THREE.Mesh(
      new THREE.RingGeometry(0.48, 0.57, 24),
      new THREE.MeshBasicMaterial({
        color: config.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
      }),
    );
    base.rotation.x = -Math.PI / 2;
    base.position.y = 0.025;
    g.add(base);
    g.scale.setScalar(scale);
    g.traverse((o) => {
      if (o.isMesh) o.castShadow = false;
    });
    const hitMeshes = [body, chest, head, visor, ...legs, ...arms];
    for (const mesh of hitMeshes)
      mesh.userData.head = mesh === head || mesh === visor;
    this.scene.add(g);
    return {
      group: g,
      body,
      head,
      legs,
      arms,
      bar: health,
      ring: base,
      hitMeshes,
      scale,
    };
  }
  removeEnemy(enemy) {
    this.scene.remove(enemy.group);
    enemy.bar.geometry.dispose();
    enemy.bar.material.dispose();
    enemy.ring.geometry.dispose();
    enemy.ring.material.dispose();
  }
  effect(mesh, life, velocity = null) {
    mesh.userData.effect = true;
    this.scene.add(mesh);
    this.effects.push({ mesh, life, max: life, velocity });
    if (this.effects.length > 140) this.removeEffect(0);
    return mesh;
  }
  removeEffect(i) {
    const [e] = this.effects.splice(i, 1);
    if (!e) return;
    this.scene.remove(e.mesh);
    e.mesh.geometry.dispose();
    e.mesh.material.dispose();
  }
  tracer(a, b, color = "#f5d99b", life = 0.045) {
    this.effect(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([a, b]),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 }),
      ),
      life,
    );
  }
  sparks(position, color = "#d4ec9a", count = 5) {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.045, 0.045),
        new THREE.MeshBasicMaterial({ color, transparent: true }),
      );
      mesh.position.copy(position);
      this.effect(
        mesh,
        0.2 + Math.random() * 0.2,
        new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          Math.random() * 4,
          (Math.random() - 0.5) * 5,
        ),
      );
    }
  }
  ring(position, color, radius = 2, life = 0.5) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.88, radius, 40),
      new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(position);
    mesh.position.y = 0.04;
    this.effect(mesh, life);
  }
  explosion(position, radius) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 10),
      new THREE.MeshBasicMaterial({
        color: "#ffc285",
        transparent: true,
        opacity: 0.6,
        wireframe: true,
      }),
    );
    mesh.position.copy(position);
    const effect = this.effect(mesh, 0.35);
    effect.userData.expand = radius;
    this.sparks(position, "#ffb176", 22);
    this.ring(position, "#ffb176", radius, 0.6);
  }
  breakup(enemy, source) {
    const origin = enemy.group.position;
    const away = origin.clone().sub(source).setY(0).normalize();
    for (let i = 0; i < 7; i++) {
      const size = i === 0 ? 0.32 : 0.16;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(size, size * 1.5, size),
        new THREE.MeshStandardMaterial({
          color: i < 2 ? enemy.config.color : "#34483b",
          transparent: true,
        }),
      );
      mesh.position
        .copy(origin)
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.6,
            0.4 + Math.random() * 1.3,
            (Math.random() - 0.5) * 0.4,
          ),
        );
      const velocity = away
        .clone()
        .multiplyScalar(2 + Math.random() * 3)
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 3,
            2 + Math.random() * 3,
            (Math.random() - 0.5) * 3,
          ),
        );
      this.effect(mesh, 0.6 + Math.random() * 0.25, velocity);
      mesh.userData.debris = true;
    }
  }
  updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.life -= dt;
      if (e.life <= 0) {
        this.removeEffect(i);
        continue;
      }
      e.mesh.material.opacity = e.life / e.max;
      if (e.velocity) {
        e.mesh.position.addScaledVector(e.velocity, dt);
        e.velocity.y -= dt * 9;
        if (e.mesh.userData.debris) {
          e.mesh.rotation.x += dt * 6;
          e.mesh.rotation.z += dt * 4;
          if (e.mesh.position.y < 0.08) {
            e.mesh.position.y = 0.08;
            e.velocity.y = Math.abs(e.velocity.y) * 0.25;
            e.velocity.x *= 0.9;
            e.velocity.z *= 0.9;
          }
        }
      }
      if (e.mesh.userData.expand)
        e.mesh.scale.setScalar((1 - e.life / e.max) * e.mesh.userData.expand);
    }
  }
  clearEffects() {
    while (this.effects.length) this.removeEffect(0);
  }
  applyQuality() {
    const quality = this.settings.quality;
    this.renderer.setPixelRatio(
      Math.min(
        devicePixelRatio,
        quality === "high" ? 2 : quality === "medium" ? 1.5 : 1,
      ),
    );
    this.renderer.shadowMap.enabled = quality !== "low";
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
  }
  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }
  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
