// Review masks for the rig test bodies (assets-src/rig/dummies.ts): the 48-px head, face layers, bow, spade and shoe
// of the M-ART art-spike maid (MA-07, ADR 009 «48 soft»), copied here verbatim when MA-31 deleted the spike so the
// dummies keep rendering byte-identical frames. Characters never use these: each ships its own authored masks.
// Legend: assets-src/lib/mask.ts.
import type { Mask } from '../lib/mask.ts';

export interface PreviewMasks {
  /** Head (skin, fringe clumps, crown highlight, horns), 30 wide; face anchor at col 5, row 12. */
  readonly head: { readonly mask: Mask };
  /** Last head-mask row the forehead hair-shadow band may take (keeps it off the lash line). */
  readonly band: number;
  readonly face: { readonly neutral: Mask; readonly blink: Mask; readonly happy: Mask; readonly cheeks: Mask };
  readonly bow: { readonly mask: Mask };
  /** Pointed spade (tip down), hung from the tail end by its top-centre px. */
  readonly spade: Mask;
  readonly shoe: { readonly mask: Mask };
}

const FACE_FULL = '...Hj' + 'SSSS' + 'SSSSS' + 'S' + 'SSSSS' + 'SSSss' + 'jh...';

export const PREVIEW_MASKS: PreviewMasks = {
  head: {
    mask: [
      '...U......................U...',
      '.UO........................Uo.',
      '.UOn......................UOn.',
      '..UOn.....jHHHHHHhhj.....UOn..',
      '....Lbm.jHHyyHHHHHhhhj.Lbm....',
      '......jHHYYyHHHHHHHHhhhj......',
      '.....jHHyHHHHHHHHHHHhhhhj.....',
      '....jHHHHHHHHHHHHHHHHhhhhj....',
      '....jHyYYyHyYYyhHyyyhhyhhj....',
      '...jHHyyHHHyyHHHhyyhhhyhhjj...',
      '...jHHHHHjHHHHHHjHHHhhjhhjJ...',
      '...Hj' + 'HHHj' + 'HHHHh' + 'h' + 'HHHhj' + 'hhhhj' + 'jh...',
      '...Hj' + 'SHHj' + 'HHHHh' + 'S' + 'hHHhj' + 'hhhjj' + 'jh...',
      '...Hj' + 'SShS' + 'SHHhS' + 'S' + 'SShhS' + 'Shjss' + 'jh...',
      '...Hj' + 'SSSS' + 'SSShS' + 'S' + 'SSSSS' + 'SSSss' + 'jh...',
      FACE_FULL,
      FACE_FULL,
      FACE_FULL,
      FACE_FULL,
      FACE_FULL,
      '...Hj' + 'eESS' + 'SSSSS' + 'S' + 'SSSSS' + 'SSess' + 'jh...',
      FACE_FULL,
      FACE_FULL,
      '...Hj' + '.SSS' + 'SSSSS' + 'S' + 'SSSSS' + 'SSss.' + 'jh...',
      '...h.' + '..SS' + 'SSSSS' + 'S' + 'SSSSS' + 'Sss..' + '.h...',
      '.....' + '....' + '.ssss' + 's' + 'sssss' + '.....' + '.....',
    ],
  },
  band: 14,
  face: {
    neutral: [
      '',
      '',
      '',
      '.X.XXXX......XXXX.X.',
      '..XPcccx....xPcccX..',
      '..pPXXc......PXXcp..',
      '..piXXi......iXXip..',
      '...IIpI......IIpI...',
      '....II........II....',
      '',
      '........x..x........',
      '.........XX.........',
      '',
    ],
    blink: [
      '',
      '',
      '',
      '',
      '',
      '',
      '..x....x....x....x..',
      '...XXXX......XXXX...',
      '',
      '',
      '........x..x........',
      '.........XX.........',
      '',
    ],
    happy: [
      '',
      '',
      '',
      '',
      '....X..........X....',
      '...X.X........X.X...',
      '..X...X......X...X..',
      '',
      '',
      '',
      '',
      '........XXXX........',
      '.........gT.........',
    ],
    cheeks: ['', '', '', '', '', '', '', '', '', '..fFFf........fFFf..', '...f.f........f.f...'],
  },
  bow: { mask: ['Rr..rg', 'tRTTtG', 'r.gg.G'] },
  spade: ['l.b.m', 'lbbbm', '.lbm.', '..m..'],
  shoe: { mask: ['.LM.', 'mmlm', 'mMMm'] },
};
