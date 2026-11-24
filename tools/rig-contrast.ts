// Prints the arm-over-torso check (assets-src/rig/checks.ts) per pose and frame for the review bodies:
//   node tools/rig-contrast.ts [<body id>]
import { armTorsoContrast, armTorsoProblems } from '../assets-src/rig/checks.ts';
import { bodyViewOf, createRigRenderer } from '../assets-src/rig/compose.ts';
import { animsFor } from '../assets-src/rig/anims/adult.ts';
import { DUMMY_A, DUMMY_B, MAID_PREVIEW } from '../assets-src/rig/dummies.ts';
import { GOTH } from '../assets-src/characters/goth/body.ts';
import { KITSUNE } from '../assets-src/characters/kitsune/body.ts';
import { MAID } from '../assets-src/characters/maid/body.ts';
import { RONIN } from '../assets-src/characters/ronin/body.ts';
import { WITCH } from '../assets-src/characters/witch/body.ts';
import { deepestTones, loadMasterPalette, renderContext } from './lib/sprites.ts';

const palette = loadMasterPalette();
const ctx = renderContext(palette);
const deepest = deepestTones(palette);
const only = process.argv[2];
for (const body of [MAID, KITSUNE, GOTH, WITCH, RONIN, DUMMY_A, DUMMY_B, MAID_PREVIEW]) {
  if (only && body.id !== only) continue;
  const r = createRigRenderer(body);
  for (const anim of animsFor(body)) {
    const rows = anim.frames.map((_, f) => {
      const { image, labels } = r.renderLabeled(anim, f, ctx);
      // q34 frames: the far (screen-right) arm sits behind the torso (ADR 010 far-arm rule).
      return {
        ...armTorsoContrast(image, labels, deepest),
        far: bodyViewOf(anim, f) === 'q34' ? ('R' as const) : undefined,
      };
    });
    const touched = rows.filter((x) => x.edge > 0);
    if (touched.length === 0) {
      console.log(`${body.id}/${anim.name}: no arm over torso`);
      continue;
    }
    const p10 = Math.min(...touched.map((x) => x.p10));
    const sep = Math.min(...touched.map((x) => x.separator));
    const tip = Math.min(...touched.flatMap((x) => [x.tipL ?? 99, x.tipR ?? 99]));
    const trim = touched.filter((x) => x.trimSamples > 0);
    const shoulder = trim.length ? Math.min(...trim.map((x) => x.trimP10)).toFixed(3) : 'n/a';
    const bad = touched.flatMap((x) => armTorsoProblems(x, x.far ? { far: x.far } : {}));
    console.log(
      `${body.id}/${anim.name}: frames ${String(touched.length)}/${String(rows.length)} min p10 ΔL ${p10.toFixed(3)}, ` +
        `shoulder/trim p10 ΔL ${shoulder} (${String(trim.length)} fr), ` +
        `min separator ${(sep * 100).toFixed(0)} %, min tip ${String(tip)} px${bad.length ? ` FAIL ${bad[0] ?? ''}` : ''}`,
    );
  }
}
