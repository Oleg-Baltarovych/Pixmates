// maid spike, 48-px rig — pixel-anime remake (D-13; ART-BIBLE §11). The head is authored as layered pixel masks:
// a chibi head 24 px wide (skull rows 3–25, ≈ 2 heads to the feet), imp hook horns (3-px base → 1-px tip curling
// inward, light upper-left edge, plum base with a lighter rim px), a crown with a broken «angel ring» shine band (rows 8–9, brighter on the lit left), four pointed fringe
// clumps with an off-centre parting, and pointed side locks framing a 20-px face (right 2 columns shaded). Face
// layers: the largest anime eye that reads at 48 — arched lash (4-px top, corner and inner end 1 row lower) with a
// 1-px flick going up-out, 4×5 iris c → i → I (cel: 2 tones), round 2×2 pupil, big upper highlight (1×2) and a small
// lower one (both top-left: not mirrored); soft blush (`cheeks`); calm symmetric 4-px smile (round-2 lesson).
// The forehead band comes from `withBand` (rows ≤ `band`). A face px never covers hair. Body
// geometry lives in ../maid.ts (48-px units). Legend: assets-src/lib/mask.ts.
import type { MaidRig } from '../maid.ts';

const FACE_FULL = '...Hj' + 'SSSS' + 'SSSSS' + 'S' + 'SSSSS' + 'SSSss' + 'jh...';

export const RIG_48: MaidRig = {
  size: 48,
  k: 1,
  head: {
    at: [9, 0],
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
    at: [14, 12],
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
  bow: { at: [21, 26], mask: ['Rr..rg', 'tRTTtG', 'r.gg.G'] },
  spade: ['l.b.m', 'lbbbm', '.lbm.', '..m..'],
  shoe: { mask: ['.LM.', 'mmlm', 'mMMm'], left: [19, 44], right: [25, 44] },
  ribbon: [0.5, 0.5],
  eyelets: false,
};
