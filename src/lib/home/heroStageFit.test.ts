// Hero stage fit: explicit JS scale (WebKit miscomputes the CSS atan2 trick). HEBREW-SAFETY: zero Hebrew bytes.
import assert from "node:assert/strict";
import test from "node:test";
import { fitHeroStage, heroStageScale } from "./heroStageFit";

function fakeScene(width: number, sceneW = "1040px") {
  const stage = { style: { scale: "" } };
  const attrs = new Map<string, string>();
  const scene = {
    clientWidth: width,
    querySelector: (sel: string) => (sel === ".hero-stage" ? stage : null),
    setAttribute: (n: string, v: string) => void attrs.set(n, v),
    getAttribute: (n: string) => attrs.get(n) ?? null,
    style: { getPropertyValue: (n: string) => (n === "--scene-w" ? sceneW : "") },
  };
  return { scene, stage, attrs };
}

test("heroStageScale is the box/photo width ratio", () => {
  assert.equal(heroStageScale(382, 1040), 0.367308);
  assert.equal(heroStageScale(0, 1040), 0);
  assert.equal(heroStageScale(382, 0), 0);
});

test("fitHeroStage sets the scale, marks the scene, and refits on resize", () => {
  const { scene, stage, attrs } = fakeScene(382);
  let cb: (() => void) | undefined;
  let disconnected = false;
  class RO { constructor(fn: () => void) { cb = fn; } observe() {} disconnect() { disconnected = true; } }
  const win = { ResizeObserver: RO, addEventListener() {}, removeEventListener() {} };
  const dispose = fitHeroStage(scene, win);
  assert.equal(stage.style.scale, "0.367308");
  assert.equal(attrs.get("data-hm-fit"), "");
  scene.clientWidth = 520;
  cb!();
  assert.equal(stage.style.scale, "0.5");
  dispose();
  assert.ok(disconnected);
});

test("fitHeroStage falls back to window resize and skips a zero-width box", () => {
  const { scene, stage, attrs } = fakeScene(0);
  const added: string[] = [];
  const win = { addEventListener: (t: string) => void added.push(t), removeEventListener() {} };
  fitHeroStage(scene, win);
  assert.equal(stage.style.scale, "");
  assert.equal(attrs.has("data-hm-fit"), false);
  assert.deepEqual(added, ["resize"]);
});

test("fitHeroStage is a no-op without --scene-w", () => {
  const { scene, stage } = fakeScene(382, "");
  fitHeroStage(scene, { addEventListener() {}, removeEventListener() {} });
  assert.equal(stage.style.scale, "");
});
