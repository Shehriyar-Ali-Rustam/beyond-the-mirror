/* -----------------------------------------------------------------------------
   Shared scene geometry (in scene units; the scene is 1600 x 1000).
----------------------------------------------------------------------------- */

export const SCENE_W = 1600;
export const SCENE_H = 1000;

/** The arched window glass. The arch is a half circle on top of a rectangle. */
export const GLASS = { x: 480, y: 92, w: 640, h: 520 } as const;
export const ARCH_R = GLASS.w / 2;
export const ARCH_CX = GLASS.x + ARCH_R;
export const ARCH_CY = GLASS.y + ARCH_R;

/** The outside view is drawn a little larger than the glass so it can drift for parallax. */
export const VIEW_W = 720;
export const VIEW_H = 570;
export const VIEW_PAD_X = (VIEW_W - GLASS.w) / 2;
export const VIEW_PAD_Y = (VIEW_H - GLASS.h) / 2;

export const FLOOR_Y = 780;

/** Where the character sits (bottom centre of the seated pose). */
export const SITTER = { x: 872, y: 650, scale: 1 } as const;
/** The character layer is a separate SVG covering this box (scene units). */
export const SITTER_BOX = { x: SITTER.x - 150, y: SITTER.y - 310, w: 300, h: 330 } as const;

/** Helpers for positioning HTML layers over the scene with percentages. */
export const pctX = (x: number) => `${(x / SCENE_W) * 100}%`;
export const pctY = (y: number) => `${(y / SCENE_H) * 100}%`;

/** Path of the arch outline, offset outward by `pad` units. */
export function archPath(pad = 0, bottomExtra = 0) {
  const r = ARCH_R + pad;
  const left = ARCH_CX - r;
  const right = ARCH_CX + r;
  const bottom = GLASS.y + GLASS.h + bottomExtra;
  return `M${left},${bottom} L${left},${ARCH_CY} A${r},${r} 0 0 1 ${right},${ARCH_CY} L${right},${bottom} Z`;
}
