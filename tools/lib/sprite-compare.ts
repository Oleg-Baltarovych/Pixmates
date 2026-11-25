// Logic behind `pnpm sprites:compare`: the command line, the frame columns ("shots") and the before/after sheet.
// The sheet has four rows (old and new on white, then old and new on dark) and one column per shot, drawn with
// nearest-neighbour scaling. The git and file wiring lives in tools/sprites-compare.ts.
import type { PackDef, RenderContext } from '../../assets-src/lib/types.ts';
import { Canvas, DARK, WHITE, type Rgb } from './canvas.ts';
import { parseCli, UsageError, wantsHelp } from './cli.ts';
import type { RgbaImage } from './png.ts';

/** One column of the sheet: an animation and the frame to show (clamped to the animation's last frame). */
export interface Shot {
  readonly anim: string;
  readonly frame: number;
}

/** Front idle, talk, think, happy, worried, startle, petted, then the q34 walk and turn. */
export const DEFAULT_SHOTS: readonly Shot[] = [
  { anim: 'idle_a', frame: 0 },
  { anim: 'talk', frame: 1 },
  { anim: 'think', frame: 2 },
  { anim: 'happy', frame: 2 },
  { anim: 'worried', frame: 1 },
  { anim: 'startle', frame: 1 },
  { anim: 'petted', frame: 2 },
  { anim: 'walk', frame: 0 },
  { anim: 'turn', frame: 1 },
];

/** Output scales: 1× (real pixels), 4× (review), 10× (pixel detail). */
export const COMPARE_SCALES: readonly number[] = [1, 4, 10];

export const BACKDROPS: readonly Rgb[] = [WHITE, DARK];

/** Gap around and between cells, in output pixels. */
const GAP = 8;

export const COMPARE_USAGE = `Usage: pnpm sprites:compare <pack-id> [--base <git-ref>] [--frames <anim[:frame]>,…]

Renders the pack at <git-ref> (default HEAD) and in the working tree side by side and writes
reports/sprites/<pack-id>-compare-x1.png, -x4.png and -x10.png
(rows: old and new on white, then old and new on dark). The working tree and index are not touched.

Options:
  --base <git-ref>     revision to compare against (default: HEAD)
  --frames <list>      columns as anim[:frame], comma-separated (frame defaults to 0)
                       default: ${DEFAULT_SHOTS.map((s) => `${s.anim}:${String(s.frame)}`).join(',')}
  -h, --help           show this help

Example: pnpm sprites:compare pixmates.ronin --base HEAD~3 --frames idle_a,walk:2`;

export interface CompareOptions {
  readonly id: string;
  readonly base: string;
  readonly shots: readonly Shot[];
}

/** Parses `idle_a,walk:2` into shots; throws a UsageError for an empty list or a malformed entry. */
export function parseShots(spec: string): Shot[] {
  return spec.split(',').map((entry) => {
    const m = /^([a-z][a-z0-9_]*)(?::(\d{1,3}))?$/.exec(entry.trim());
    if (!m?.[1]) throw new UsageError(`bad --frames entry '${entry}' (expected anim or anim:frame, e.g. walk:2)`);
    return { anim: m[1], frame: Number(m[2] ?? 0) };
  });
}

/** The command line of `pnpm sprites:compare`, or `'help'` for `--help`. */
export function parseCompareArgs(argv: readonly string[]): CompareOptions | 'help' {
  const args = parseCli(
    { usage: COMPARE_USAGE, options: { base: { type: 'string' }, frames: { type: 'string' } }, positionals: true },
    argv,
  );
  if (wantsHelp(args)) return 'help';
  const [id, ...rest] = args.positionals;
  if (id === undefined) throw new UsageError('missing <pack-id>');
  if (rest.length > 0) throw new UsageError(`expected one <pack-id>, got '${args.positionals.join(' ')}'`);
  const { base = 'HEAD', frames } = args.values;
  if (base.length === 0) throw new UsageError('--base needs a git ref');
  return { id, base, shots: frames === undefined ? DEFAULT_SHOTS : parseShots(frames) };
}

/** Renders each shot of `def` (frame clamped to the animation length); null where the pack lacks the animation. */
export function renderShots(def: PackDef, shots: readonly Shot[], ctx: RenderContext): (RgbaImage | null)[] {
  return shots.map(({ anim, frame }) => {
    const a = def.animations[anim];
    return a ? def.render(anim, Math.min(frame, a.frames - 1), ctx) : null;
  });
}

/** The before/after sheet at `scale`: rows old, new per backdrop; cells sized to the largest frame. */
export function compareSheet(
  old: readonly (RgbaImage | null)[],
  next: readonly (RgbaImage | null)[],
  scale: number,
): RgbaImage {
  const rows = [old, next];
  const frames = rows.flat().filter((f): f is RgbaImage => f !== null);
  const cellW = Math.max(1, ...frames.map((f) => f.width)) * scale + GAP;
  const cellH = Math.max(1, ...frames.map((f) => f.height)) * scale + GAP;
  const cols = Math.max(old.length, next.length);
  const bandH = rows.length * cellH;
  const canvas = new Canvas(cols * cellW + GAP, BACKDROPS.length * bandH + GAP);
  BACKDROPS.forEach((bg, b) => {
    const last = b === BACKDROPS.length - 1;
    canvas.fill(0, b * bandH, canvas.width, bandH + (last ? GAP : 0), bg);
    rows.forEach((row, r) => {
      row.forEach((img, c) => {
        if (img) canvas.blit(img, GAP + c * cellW, GAP + b * bandH + r * cellH, scale);
      });
    });
  });
  return canvas.image();
}
