// Surfaces the character can stand on (SPEC §4.2, plan M1-06). M1 = the floor + visible window top edges; M1b adds
// side edges and screen edges. Pure: the world snapshot and the sprite size come in as numbers.
import { SURFACE_MIN_WIDTH_ART } from '../content/desktop.ts';
import type { DesktopWindow, Size, Surface } from './types.ts';

export type WindowTop = Extract<Surface, { readonly kind: 'window_top' }>;

/** How much room the sprite needs, in overlay DIP. */
export interface SpriteRoom {
  /** Frame box height (headroom rows included): an edge needs this much clear work area above it. */
  readonly heightDip: number;
  /** DIP per art px (`scale / scaleFactor`): scales `SURFACE_MIN_WIDTH_ART`. */
  readonly artPxDip: number;
}

/** Half-open horizontal span `[left, right)`. */
interface Span {
  readonly left: number;
  readonly right: number;
}

/** `spans` (sorted, disjoint) minus `cut`. */
function subtract(spans: readonly Span[], cut: Span): Span[] {
  return spans.flatMap((span) => {
    if (cut.right <= span.left || cut.left >= span.right) return [span];
    const parts: Span[] = [];
    if (cut.left > span.left) parts.push({ left: span.left, right: cut.left });
    if (cut.right < span.right) parts.push({ left: cut.right, right: span.right });
    return parts;
  });
}

/** Does `window` cover the horizontal line at `y`? Its top row covers, its bottom edge does not. */
const coversRow = ({ rect }: DesktopWindow, y: number): boolean => rect.y <= y && y < rect.y + rect.height;

/**
 * Top edges of `windows` (front to back, overlay DIP) a character can stand on: the parts of each edge not hidden
 * by a window in front, clipped to the work area, below the sprite's height from the work-area top (so a maximised
 * window never qualifies) and above the floor, each at least `SURFACE_MIN_WIDTH_ART` art px wide. Ordered front to
 * back, then left to right; one window may give several segments, all with its id. A front window that only overlaps
 * the space above an edge does not block it: the stage draws above every window.
 */
export function visibleTops(
  windows: readonly DesktopWindow[],
  workArea: Size,
  sprite: SpriteRoom,
): readonly WindowTop[] {
  const minWidth = SURFACE_MIN_WIDTH_ART * sprite.artPxDip;
  return windows.flatMap((window, index) => {
    const { id, rect } = window;
    const y = rect.y;
    if (y < sprite.heightDip || y >= workArea.height) return [];
    const edge: Span = { left: Math.max(0, rect.x), right: Math.min(workArea.width, rect.x + rect.width) };
    const visible = windows
      .slice(0, index)
      .filter((front) => coversRow(front, y))
      .reduce<Span[]>(
        (spans, front) => subtract(spans, { left: front.rect.x, right: front.rect.x + front.rect.width }),
        edge.right > edge.left ? [edge] : [],
      );
    return visible
      .filter((span) => span.right - span.left >= minWidth)
      .map((span): WindowTop => ({ kind: 'window_top', id, left: span.left, right: span.right, y }));
  });
}
