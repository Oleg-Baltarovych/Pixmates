// Arm-over-torso readability check (docs/art/RIG.md «Arm over torso», ART-BIBLE §6): measured on the final frame
// with the composer's part label map (`renderLabeled`). Used by tests/unit/art/rig.test.ts for every pose of every
// review body; the art-director review numbers come from the same function.
import type { RgbaImage } from '../../tools/lib/png.ts';
import { toOklab } from '../lib/palette.ts';
import { ARM_LABEL } from './compose.ts';

/** Thresholds (OKLab L in 0..1). */
export const ARM_TORSO_RULE = {
  /** (i) value step: the 10th-percentile |ΔL| between the arm fill and the bodice across the shared edge. */
  minDeltaL: 0.05,
  /** (ii) share of shared-edge arm px that are the separator (shade 0 of a ramp = the deepest outline tone). */
  minSeparator: 0.95,
  /** (iii) visible arm-end px (hand skin or cuff, not separator) on every arm that crosses the torso. */
  minTip: 2,
} as const;

export interface ArmTorsoReport {
  /** Sleeve px 4-adjacent to a torso px (the shared edge; hands and cuffs are the contrasting end, rule iii). */
  readonly edge: number;
  /** Share of edge px painted in a ramp's deepest tone. */
  readonly separator: number;
  /** |ΔL| samples: arm fill px one step inside the separator vs the torso px across it. */
  readonly samples: number;
  /** 10th percentile and mean of the samples (1 when there is no edge). */
  readonly p10: number;
  readonly mean: number;
  /** Visible arm-end px per arm that touches the torso (null = that arm does not cross it). */
  readonly tipL: number | null;
  readonly tipR: number | null;
}

const N4 = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

/** `deepest` = the 0xRRGGBB of index 0 of every ramp (the outline floor). */
export function armTorsoContrast(img: RgbaImage, labels: RgbaImage, deepest: ReadonlySet<number>): ArmTorsoReport {
  const { width: w, height: h } = img;
  const rgb = (x: number, y: number): number => {
    const i = (y * w + x) * 4;
    return ((img.data[i] ?? 0) << 16) | ((img.data[i + 1] ?? 0) << 8) | (img.data[i + 2] ?? 0);
  };
  const solid = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < w && y < h && (img.data[(y * w + x) * 4 + 3] ?? 0) > 0;
  const label = (x: number, y: number): number => (solid(x, y) ? (labels.data[(y * w + x) * 4] ?? 0) : 0);
  const isArm = (l: number): boolean => l >= ARM_LABEL.sleeveL && l <= ARM_LABEL.endR;
  const isSleeve = (l: number): boolean => l === ARM_LABEL.sleeveL || l === ARM_LABEL.sleeveR;
  const sideOf = (l: number): 'L' | 'R' => (l === ARM_LABEL.sleeveL || l === ARM_LABEL.endL ? 'L' : 'R');
  const L = (x: number, y: number): number => toOklab(rgb(x, y))[0];
  const touchesTorso = (x: number, y: number): boolean =>
    N4.some(([dx, dy]) => label(x + dx, y + dy) === ARM_LABEL.torso);

  let edge = 0;
  let sep = 0;
  const dl: number[] = [];
  const crosses = { L: false, R: false };
  const tips = { L: 0, R: 0 };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const l = label(x, y);
      if (!isArm(l)) continue;
      const side = sideOf(l);
      const sepPx = deepest.has(rgb(x, y));
      const isEnd = l === ARM_LABEL.endL || l === ARM_LABEL.endR;
      if (isEnd) {
        if (!sepPx) tips[side]++;
        if (touchesTorso(x, y)) crosses[side] = true;
        continue;
      }
      if (!touchesTorso(x, y)) continue;
      edge++;
      crosses[side] = true;
      if (sepPx) sep++;
      for (const [dx, dy] of N4) {
        if (label(x + dx, y + dy) !== ARM_LABEL.torso) continue;
        const ix = x - dx;
        const iy = y - dy;
        if (!isSleeve(label(ix, iy)) || touchesTorso(ix, iy) || deepest.has(rgb(ix, iy))) continue;
        dl.push(Math.abs(L(ix, iy) - L(x + dx, y + dy)));
      }
    }
  }
  const sorted = [...dl].sort((a, b) => a - b);
  return {
    edge,
    separator: edge === 0 ? 1 : sep / edge,
    samples: dl.length,
    p10: sorted.length === 0 ? 1 : (sorted[Math.floor(sorted.length * 0.1)] ?? 1),
    mean: sorted.length === 0 ? 1 : sorted.reduce((a, b) => a + b, 0) / sorted.length,
    tipL: crosses.L ? tips.L : null,
    tipR: crosses.R ? tips.R : null,
  };
}

/** Rule violations of one report (empty = pass). */
export function armTorsoProblems(r: ArmTorsoReport): string[] {
  const out: string[] = [];
  if (r.edge === 0) return out;
  if (r.samples > 0 && r.p10 < ARM_TORSO_RULE.minDeltaL) out.push(`value step p10 ΔL ${r.p10.toFixed(3)}`);
  if (r.separator < ARM_TORSO_RULE.minSeparator) out.push(`separator ${(r.separator * 100).toFixed(0)} %`);
  for (const [side, tip] of [
    ['L', r.tipL],
    ['R', r.tipR],
  ] as const) {
    if (tip !== null && tip < ARM_TORSO_RULE.minTip) out.push(`arm ${side} end ${String(tip)} px`);
  }
  return out;
}
