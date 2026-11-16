/* Randomness and time live at module level so components stay pure. */

export const rand = () => Math.random();
export const randRange = (a: number, b: number) => a + Math.random() * (b - a);
export const now = () => performance.now();
export const wallClock = () => Date.now();

/** Small deterministic generator, used to lay out windows, trees and stars the same way every time. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
