export class Input {
  constructor(canvas, game) {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.fire = false;
    this.aim = false;
    this.canvas = canvas;
    this.game = game;
    document.addEventListener("keydown", (e) => {
      if (document.querySelector("dialog[open]")) return;
      if (
        game.state === "upgrade" &&
        ["Digit1", "Digit2", "Digit3"].includes(e.code)
      ) {
        game.choosePerk(Number(e.code.slice(-1)) - 1);
        return;
      }
      if (e.code === "Escape") {
        if (game.state === "playing") {
          game.pause();
          this.unlock();
        }
        return;
      }
      if (e.code === "KeyM" && !e.repeat) {
        game.settings.muted = !game.settings.muted;
        game.audio.setVolume();
        game.ui.saveSettings();
      }
      if (game.state !== "playing") return;
      if (
        [
          "Space",
          "ControlLeft",
          "ControlRight",
          "ShiftLeft",
          "ShiftRight",
          "Tab",
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "KeyE",
          "KeyR",
          "KeyG",
          "KeyV",
          "KeyM",
          "Digit1",
          "Digit2",
          "Digit3",
        ].includes(e.code)
      )
        e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    document.addEventListener("keyup", (e) => this.keys.delete(e.code));
    document.addEventListener("mousemove", (e) => {
      if (game.state === "playing" && this.locked) {
        this.mouseX += e.movementX;
        this.mouseY += e.movementY;
      }
    });
    canvas.addEventListener("mousedown", (e) => {
      if (game.state !== "playing") return;
      if (!this.locked) {
        this.lock();
        return;
      }
      if (e.button === 0) this.fire = true;
      if (e.button === 2) this.aim = true;
    });
    document.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.fire = false;
      if (e.button === 2) this.aim = false;
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener(
      "wheel",
      (e) => {
        if (game.state === "playing" && this.locked) {
          e.preventDefault();
          game.switchWeapon((game.weaponIndex + (e.deltaY > 0 ? 1 : 2)) % 3);
        }
      },
      { passive: false },
    );
    document.addEventListener("pointerlockchange", () => {
      if (!this.locked && game.state === "playing") game.pause();
      game.ui.lockHint(game.state === "playing" && !this.locked);
    });
    document.addEventListener("pointerlockerror", () => {
      this.lockFailed();
    });
    window.addEventListener("blur", () => {
      this.clear();
      if (game.state === "playing") {
        game.pause();
        this.unlock();
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && game.state === "playing") {
        game.pause();
        this.unlock();
      }
    });
  }
  get locked() {
    return document.pointerLockElement === this.canvas;
  }
  lock() {
    try {
      const result = this.canvas.requestPointerLock();
      result?.catch(() => this.lockFailed());
    } catch {
      this.lockFailed();
    }
  }
  lockFailed() {
    if (this.game.state !== "playing") return;
    this.game.pause();
    this.game.ui.text(
      "pause-description",
      "Der Browser hat den Mausfang blockiert. Klicke auf WEITERSPIELEN und erlaube die Maussteuerung. Nutze localhost oder HTTPS.",
    );
  }
  unlock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }
  take(key) {
    const found = this.pressed.has(key);
    this.pressed.delete(key);
    return found;
  }
  down(...keys) {
    return keys.some((k) => this.keys.has(k));
  }
  clear() {
    this.keys.clear();
    this.pressed.clear();
    this.fire = false;
    this.aim = false;
    this.mouseX = 0;
    this.mouseY = 0;
  }
}
