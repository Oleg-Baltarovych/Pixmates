// ronin (pixmates.ronin) authored masks — adult redesign MA-46 (D-19, ADR 011; docs/art/ronin.md «D-19» + adult
// lookalike hard rules). A stylized archetype, not a portrait: a stern ~25-year-old with shaggy, angular, swept-back
// `hair_umber` hair (3 sharp strands over the forehead, sides to the jaw, never past the collar), a short 2 × 2 crown
// tuft tied with an oxblood cord (a sprout: never a bun, a folded chonmage or a ponytail), a clean-shaven square jaw;
// a katana through the obi on his LEFT hip (screen-right) — front: a foreshortened hilt stub (`Prop.hilt`) and the
// black lacquer saya dropping behind the thigh; q34: ≈ 35 px at 25° trailing — 3 × 3 tsuba, brass kashira, an ink
// hilt wrap with cream diamond px under an ash-4 rim, the paper charm on the sageo; straw zori with a lit toe.
// Legend: assets-src/lib/mask.ts (shoe letters → cloth_ochre: straw + brass; trim → gem_garnet: oxblood).
import type { Mask } from '../../lib/mask.ts';

/**
 * Front head, 16 × 16 from the head joint − (8, 8) (frame rows 5…20): row 0 = the tuft (2 px, centred), row 1 the
 * oxblood cord binding it, then a 14-px adult skull (spike C+ width): angel ring on row 3, a centre strand and the
 * side locks over a 10-px face (cols 3–12), forehead light top-left, a cheek/jaw shade on the shadow side (cols 11–12),
 * the jaw stepping 10 → 8 → 6 to a 3-px chin. Face anchor at mask (2, 5): brows rows 5–6, lids row 8.
 */
export const HEAD: Mask = [
  '.......yh.......',
  '.......TT.......',
  '....JjjhhjjJ....',
  '..JjhHyyHhhhjJ..',
  '.JhhHhhyhhhHhhJ.',
  '.JheEEejheeeshJ.',
  '.JheEeeeeeeeshJ.',
  '.JheEEeeeeeesjJ.',
  '.JjeeeeeeeeesjJ.',
  '..zeeeeeeeeeSz..',
  '..seEeeeeeeesz..',
  '...eEeeeeeess...',
  '...eeeeeeesss...',
  '....eeeeeess....',
  '.....seeess.....',
  '......sSz.......',
];
/**
 * Front back hair (`Body.masks.hairBack`, from the head joint − (8, 2)): only two swept-back flicks past the skull
 * outline beside the temples (head mask rows 6–8); the rest of the short hair is the head mask itself (no bob).
 */
export const HAIR_BACK: Mask = ['J..............J', 'jJ............Jj', '.J............J.'];
/** q34 back hair (from the head joint − (9, 4)): one swept-back spike behind the crown, never a bob or nape mass. */
export const HAIR_BACK_Q34: Mask = ['J.', 'jJ'];
/** Last head row the forehead hair-shadow band (`withBand`) may use. */
export const BAND = 4;

/**
 * q34 head (facing screen-right), same 16 × 16 placement: the tuft 1 px toward the back, short swept-back hair cut
 * above and behind the ear (the ear at cols 5–6 and the temple show, no bob over them), the facing contour tapering
 * ≤ 1 px per row from the lash row to a 1-px chin point, a jaw corner at col 7–8 with a 1-px skin-1 under-jaw shade
 * (`z`, never ink: no stubble read).
 */
export const HEAD_Q34: Mask = [
  '......yh........',
  '......TT........',
  '...JjjhhjjJJ....',
  '.JjhhHyyHhhhjJ..',
  'JjhhHhhhhhhhhhJ.',
  '.JjhhhjeEEehhJ..',
  'JjhhhhjeEEEEEe..',
  '.JjhhhjeEEEEEEe.',
  '..JjhhjeEEEEEEEe',
  '...Jjszeeeeeeeee',
  '...Jjszeeeeeeeee',
  '....J.zeeeeeeeee',
  '.......zeeeeeeee',
  '........zseeees.',
  '.........zseeS..',
  '............S...',
];

/**
 * Kosode collar (front, 10 × 4 from neck + (−5, 1)): the open haori lapels (mist `u`/`O`) frame the charcoal kosode
 * crossover (left over right, ash `w` / `D`) and a skin V at the throat.
 */
export const COLLAR: Mask = ['uOwseesDOu', '.uOwsseDO.', '..uOwDOu..', '...uOOu...'];
/** q34 collar (the V 1 px toward the facing; only the near lapel shows, the far one is behind the torso). */
export const COLLAR_Q34: Mask = ['uOwseeesDD', '.uOwsseDD.', '..uOwDD...', '...uOD....'];

/** Front zori (5 × 3): warm toes, a cream thong strap, the straw sole with a lit toe px (top-left light). */
export const SHOE: Mask = ['.sps.', 'sepes', 'LBBbm'];
/** q34 zori (6 × 3), toe forward (screen-right), the lit px on the toe. */
export const SHOE_Q34: Mask = ['..sp..', 'seppee', 'mbBBBL'];

/**
 * Front katana (projected, RIG.md hip-prop rule): from hip + (5, −1) a 3-px ash tsuba row, then the black lacquer saya
 * (ink, 1 lit ash px) dropping 17 rows behind the screen-right thigh to row 56. Hilt (`Prop.hilt`, 5 × 3 from the prop
 * origin + (−2, −3), rows 36–38): brass kashira toward the axis, ink wrap with cream diamonds, ash-4 rim on top.
 */
export const SWORD: Mask = ['bLb', '.Xw', ...Array.from({ length: 14 }, () => '.Xx'), '.XX', '.xX'];
export const HILT: Mask = ['BX...', '.pXw.', '..XpX'];

/**
 * Front katana worn over the haori (`Prop.over: 'all'`, art round 2 F1): the black lacquer saya leaves the right
 * third of the obi and runs ≈ 20° down to a tip ≈ 7 px past the silhouette at hip height — ink-1 lit top edge over
 * an ink-0 body, ink-0 tip (the rig outline gives the dark-plum edge). From hip + (8, −5).
 */
export function swordFront(length = 14, angleDeg = 20): Mask {
  const tan = Math.tan((angleDeg * Math.PI) / 180);
  const h = Math.round((length - 1) * tan) + 2;
  const rows = Array.from({ length: h }, () => Array.from({ length }, () => '.'));
  for (let k = 0; k < length; k++) {
    const y = Math.round(k * tan);
    const top = rows[y];
    const bottom = rows[y + 1];
    if (top) top[k] = k === length - 1 ? 'X' : 'x';
    if (bottom) bottom[k] = 'X';
  }
  return rows.map((r) => r.join(''));
}
export const SWORD_FRONT: Mask = swordFront();
/**
 * Front hilt (from hip + (3, −10)): a 3 × 3 brass tsuba straddling the top edge of the obi (lit top-left px), a
 * 4-px grip rising ≈ 27° toward the axis — ink underside, ash-4 rim with 2 cream diamonds — and a brass kashira;
 * stays ≥ 3 px off the axis so its outline clears the axis on a ±1 hip sway.
 */
export const HILT_FRONT: Mask = ['B......', 'Xpw....', '.XXpLBb', '...XbBb', '....mBm'];

/** Paper charm on the sageo (front dangle): 1-px oxblood cord, a 2 × 3 cream slip with 1 ink stroke. */
export const CHARM: Mask = ['t.', 't.', 'Pq', 'Xq', 'pq'];
/** q34 charm (same slip, hung from the saya under the tsuba). */
export const CHARM_Q34: Mask = CHARM;

/**
 * q34 katana: `length` px along an `angleDeg` diagonal trailing down-back (the hilt at the top right): brass kashira,
 * an 8-px hilt (ash-4 rim over an ink wrap with cream diamond px every 2 px), a 3 × 3 tsuba (ash, 1 lit px), then the
 * black lacquer saya (ink 1 top edge, ink 0 underside, 1 lit ash px) to an ink tip.
 */
export function swordQ34(length = 35, angleDeg = 25, hilt = 8): Mask {
  const rad = (angleDeg * Math.PI) / 180;
  const w = Math.round(length * Math.cos(rad));
  const h = Math.round(length * Math.sin(rad)) + 3;
  const rows = Array.from({ length: h }, () => Array.from({ length: w }, () => '.'));
  const put = (x: number, y: number, ch: string): void => {
    const r = rows[y];
    if (r && x >= 0 && x < w) r[x] = ch;
  };
  for (let x = w - 1; x >= 0; x--) {
    const k = w - 1 - x;
    const along = k / Math.cos(rad);
    const y = Math.round(k * Math.tan(rad));
    if (k === 0) {
      put(x, y, 'B');
      put(x, y + 1, 'B');
    } else if (along < hilt) {
      put(x, y, 'w');
      put(x, y + 1, k % 2 === 0 ? 'p' : 'X');
    } else if (along < hilt + 3) {
      put(x, y, 'b');
      put(x, y + 1, 'b');
      put(x, y + 2, 'm');
    } else if (x === 0) {
      put(x, y, 'X');
      put(x, y + 1, 'X');
    } else {
      // Ash-4 rim along the lit top edge (reads on dark wallpapers), the tip ink.
      put(x, y, x <= 1 ? 'x' : 'w');
      put(x, y + 1, 'X');
    }
  }
  // Tsuba: 3 × 3 block with one lit px (top-left).
  const tk = Math.ceil(hilt * Math.cos(rad));
  const tx = w - 1 - tk - 1;
  const ty = Math.round(tk * Math.tan(rad)) - 1;
  for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) put(tx + dx, ty + dy, 'b');
  put(tx, ty, 'L');
  return rows.map((r) => r.join(''));
}
export const SWORD_Q34: Mask = swordQ34();
