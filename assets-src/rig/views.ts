// View helpers (ADR 010, RIG.md «Views»): per-frame body/head view, manifest facing, view use per pose set.
import type { Facing } from '../lib/types.ts';
import type { RigAnim, View, Visor } from './types.ts';

/** Body view of a frame (the frame is the single source of truth; default front). */
export const bodyViewOf = (anim: RigAnim, frame: number): View => anim.frames[frame]?.view ?? 'front';
/**
 * Manifest facing of an animation (ADR 010): `right` when any frame's body is q34 (authored facing screen-right),
 * else `front`. A leading q34 head alone (no q34 body) stays front.
 */
export const animFacing = (anim: RigAnim): Facing =>
  anim.frames.some((_, i) => bodyViewOf(anim, i) === 'q34') ? 'right' : 'front';
/** Head view of a frame: a leading `headView`, else the body view. */
export const headViewOf = (anim: RigAnim, frame: number): View =>
  anim.frames[frame]?.headView ?? bodyViewOf(anim, frame);
/** Does any frame of these animations use the view (body or head)? */
export const usesView = (anims: readonly RigAnim[], view: View): boolean =>
  anims.some((a) => a.frames.some((_, i) => bodyViewOf(a, i) === view || headViewOf(a, i) === view));
/** Is the visor (`Body.visor`, D-22) lowered on this frame of the named animation? */
export const visorIsDown = (visor: Visor, anim: string, frame: number): boolean => {
  const d = visor.downIn[anim];
  return d === 'all' || (d !== undefined && d.includes(frame));
};
