// maid spike, 64-px rig — pixel-anime remake (D-13; ART-BIBLE §11). Authored head masks: a chibi head 32 px wide
// (skull rows 4–31), imp hook horns (3 px at the base tapering to a 1-px tip that hooks inward, 1-px light edge on the
// upper-left, plum base with a lighter rim px for dark backdrops), a crown with a 2-row broken «angel ring» shine
// band (rows 9–10), four pointed fringe clumps reaching row 18 (the centre-left one longest, its tip between the
// eyes; off-centre parting) and pointed side locks framing a 26-px face (right 2 columns shaded). The forehead
// hair-shadow band is derived from the fringe (`withBand` in ../maid.ts). Face layers: full anime eye — up-out flick +
// 6-px lash line with a thick outer corner, cream sclera on both sides, 6×7 iris going dark (top) → light (bottom),
// round 2×3 pupil, big 2×2 upper highlight and a 1-px lower one (both top-left: not mirrored); 1-px nose; blush per
// style (cel block / soft AA); calm symmetric 4-px smile (round-2 lesson). Body geometry lives in ../maid.ts
// (48-px units × 4/3).
import type { MaidRig } from '../maid.ts';

/** One head row from its parts: side locks, clumps A–D with the parting, side locks (40 cols). */
const row = (a: string, b: string, part: string, c: string, d: string, sideL = 'jHj', sideR = 'jhJ'): string =>
  '....' + sideL + a + b + part + c + d + sideR + '....';
const FACE = row('SSSSS', 'SSSSSS', 'S', 'SSSSSSS', 'SSSSSss');
const dots = (n: number): string => '.'.repeat(n);
const NOSE = dots(12) + 'z' + dots(13);
const SMILE = [dots(11) + 'x..x' + dots(11), dots(12) + 'XX' + dots(12)];

export const RIG_64: MaidRig = {
  size: 64,
  k: 4 / 3,
  head: {
    at: [12, 0],
    mask: [
      '...U' + dots(32) + 'U...',
      '.UO' + dots(34) + 'Uo.',
      '.UO' + dots(34) + 'Uo.',
      '.UOn' + dots(32) + 'UOn.',
      '..UOn' + dots(9) + 'jHHHHHHHhhhj' + dots(9) + 'UOn..',
      '...UOb' + dots(5) + 'jHHyyHHHHHHHHhhhhj' + dots(5) + 'UOb...',
      '.....Lbm' + dots(1) + 'jHHyYYyHHHHHHHHHhhhhhj' + dots(1) + 'Lbm.....',
      '.......jHHyHHHHHHHHHHHHHHhhhhhhhj.......',
      '......jHHHHHHHHHHHHHHHHHHHhhhhhhhj......',
      '.....jHyYYyHHyYYYyHHyYYyhhyyyhhyyhj.....',
      '....jHHyyHHHHyyyHHHHhyyHhhhyyhhhyhhj....',
      row('HHHHj', 'HHHHHh', 'j', 'HHHHhhj', 'hhhhhhj', 'jHH', 'hhJ'),
      row('HHHHj', 'HHHHhh', 'h', 'HHHHhhj', 'hhhhhjj'),
      row('HHHhj', 'HHHHhh', 'S', 'HHHHhhj', 'hhhhhjj'),
      row('HHhjS', 'SHHHhh', 'S', 'HHHhhjS', 'hhhhhjs'),
      row('HhjSS', 'SSHHhh', 'S', 'HHhhjSS', 'Shhhjss'),
      row('ShSSS', 'SSSHhh', 'S', 'HhjSSSS', 'SShhjss'),
      row('SSSSS', 'SSSShh', 'S', 'ShSSSSS', 'SSShSss'),
      row('SSSSS', 'SSSSSh', 'S', 'SSSSSSS', 'SSSSSss'),
      FACE,
      FACE,
      FACE,
      FACE,
      FACE,
      FACE,
      FACE,
      row('SeSSS', 'SSSSSS', 'S', 'SSSSSSS', 'SSSSSss'),
      row('eEeSS', 'SSSSSS', 'S', 'SSSSSSS', 'SSSeess'),
      row('.SSSS', 'SSSSSS', 'S', 'SSSSSSS', 'SSSSss.'),
      row('..SSS', 'SSSSSS', 'S', 'SSSSSSS', 'SSSss..'),
      row('...SS', 'SSSSSS', 'S', 'SSSSSSS', 'SSss...', 'jH.', '.hJ'),
      row('.....', 'ssssss', 's', 'sssssss', 'ss.....', '.j.', '.h.'),
    ],
  },
  band: 19,
  face: {
    at: [19, 16],
    neutral: [
      '',
      '',
      dots(5) + 'XXX' + dots(10) + 'XXX' + dots(5),
      '.X.XXXXXX' + dots(8) + 'XXXXXX.X.',
      '..XcPPcccx' + dots(6) + 'xcPPcccX..',
      '..pcPPXXcp' + dots(6) + 'pcPPXXcp..',
      '..piiiXXip' + dots(6) + 'piiiXXip..',
      '...iiiXXi.' + dots(6) + '.iiiXXi...',
      '...IIIIpI.' + dots(6) + '.IIIIpI...',
      '...IIIIII.' + dots(6) + '.IIIIII...',
      '....IIII..' + '..z...' + '..IIII....',
      '',
      ...SMILE,
    ],
    blink: [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '..x' + dots(6) + 'x' + dots(6) + 'x' + dots(6) + 'x..',
      '...' + 'XXXXXX' + dots(8) + 'XXXXXX' + '...',
      '',
      NOSE,
      '',
      ...SMILE,
    ],
    happy: [
      '',
      '',
      '',
      '',
      '',
      '',
      dots(5) + 'XX' + dots(12) + 'XX' + dots(5),
      '....X..X' + dots(10) + 'X..X....',
      '...X....X' + dots(8) + 'X....X...',
      '',
      NOSE,
      '',
      dots(11) + 'XXXX' + dots(11),
      dots(12) + 'gT' + dots(12),
    ],
    cheeks: [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '..fFFf' + dots(14) + 'fFFf..',
      '...f.f' + dots(14) + 'f.f...',
    ],
  },
  bow: { at: [28, 33], mask: ['TT...tg', 'TRTgTtg', 'tt...gg', '..t.g..'] },
  spade: ['L.....m', 'lb.b.bm', 'lbbbbbm', '.lbbbm.', '..bbm..', '...m...'],
  shoe: { mask: ['.LMM.', 'lmmmm', 'mmlmM', 'MMMMM'], left: [26, 58], right: [33, 58] },
  ribbon: [0.9, 0.75],
  eyelets: true,
};
