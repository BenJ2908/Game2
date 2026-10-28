import { clamp } from "./rules.js";
const defaults = {
  sensitivity: 1,
  fov: 84,
  volume: 0.65,
  muted: false,
  shake: true,
  quality: "medium",
  difficulty: "standard",
};
export function loadSettings() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem("velocity-settings-v2")) || {};
  } catch {}
  return {
    ...defaults,
    sensitivity: clamp(Number(saved.sensitivity) || 1, 0.25, 2.5),
    fov: clamp(Number(saved.fov) || 84, 70, 105),
    volume: typeof saved.volume === "number" ? clamp(saved.volume, 0, 1) : 0.65,
    muted: saved.muted === true,
    shake: saved.shake !== false,
    quality: ["low", "medium", "high"].includes(saved.quality)
      ? saved.quality
      : "medium",
    difficulty: ["relaxed", "standard", "veteran"].includes(saved.difficulty)
      ? saved.difficulty
      : "standard",
  };
}
export function saveSettings(settings) {
  try {
    localStorage.setItem("velocity-settings-v2", JSON.stringify(settings));
  } catch {}
}
export function loadRecord(difficulty) {
  try {
    return Number(localStorage.getItem(`velocity-score-v2-${difficulty}`)) || 0;
  } catch {
    return 0;
  }
}
export function saveRecord(difficulty, score) {
  const record = Math.max(loadRecord(difficulty), score);
  try {
    localStorage.setItem(`velocity-score-v2-${difficulty}`, String(record));
  } catch {}
  return record;
}
