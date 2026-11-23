// Pose authoring kit (plan M-ART MA-25): `frame({...})` fills a PoseFrame from shorthand (arms/legs/hem at the top
// level, defaults = standing rest pose, neutral face), `o(dx, dy)` is a joint offset.
import type { ExpressionId } from '../face.ts';
import type { ArmVariant, DrawOrder, HemPose, Joint, LegVariant, Offset, PoseFrame, Squash } from '../types.ts';

export const o = (dx: number, dy: number): Offset => ({ dx, dy });

export interface FrameInput {
  readonly root?: Offset;
  readonly joints?: Partial<Readonly<Record<Joint, Offset>>>;
  /** Both arms (armL / armR override). */
  readonly arms?: ArmVariant;
  readonly armL?: ArmVariant;
  readonly armR?: ArmVariant;
  readonly legs?: LegVariant;
  readonly hem?: HemPose;
  readonly face?: ExpressionId;
  readonly squash?: Squash;
  readonly breath?: 0 | 1;
  readonly order?: DrawOrder;
  readonly impulse?: { readonly x: number; readonly y: number };
}

export function frame(p: FrameInput): PoseFrame {
  return {
    root: p.root ?? o(0, 0),
    ...(p.joints ? { joints: p.joints } : {}),
    parts: {
      armL: p.armL ?? p.arms ?? 'down',
      armR: p.armR ?? p.arms ?? 'down',
      legs: p.legs ?? 'stand',
      ...(p.hem ? { hem: p.hem } : {}),
    },
    face: p.face ?? 'neutral',
    squash: p.squash ?? 0,
    breath: p.breath ?? 0,
    ...(p.order ? { order: p.order } : {}),
    ...(p.impulse ? { impulse: p.impulse } : {}),
  };
}
