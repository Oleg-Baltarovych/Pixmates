// Core data shapes (ADR 002, plan M1 Design → Core, SPEC §4). Plain, serialisable data: no classes, no functions,
// no platform types, so a replay log is byte-identical. Every state, event and effect is a discriminated union.
// Units: overlay DIP (the overlay is the work area, origin at its top-left), `x` = foot pivot, `y` = surface top,
// time = ms (`now` as given by main).
import type { Direction, Motion, PathSegment } from '../shared/motion.ts';
import type { Facing } from '../shared/pack.ts';

export type { Direction, Motion, PathSegment };

/** Seeded RNG state (uint32). Lives in CoreState so a replay with the same seed is identical. */
export type RngState = number;

/** Pack id (`pixmates.maid`). */
export type CharacterId = string;
/** Animation name from the pack manifest (`idle_a`, `walk`, `react:wave`). */
export type AnimName = string;
export type ActivityId = string;
/** Opaque window id minted by main; HWNDs never reach the core (ADR 014). */
export type WindowId = string;

export interface Size {
  readonly width: number;
  readonly height: number;
}
export interface Rect extends Size {
  readonly x: number;
  readonly y: number;
}

/** A visible top-level window, in overlay DIP (may extend past the overlay). */
export interface DesktopWindow {
  readonly id: WindowId;
  readonly rect: Rect;
}

/** D-9: «поверх усіх вікон» or «лише на робочому столі» (floor only). */
export type Layer = 'on-top' | 'desktop';

/** What main senses about the desktop, as one snapshot (`world` event). */
export interface World {
  readonly workArea: Size;
  /** Front to back (z-order). */
  readonly windows: readonly DesktopWindow[];
  /** Integer sprite scale: device px per art px (D-10). */
  readonly scale: number;
  /** Display scale factor (1, 1.25, …). */
  readonly scaleFactor: number;
  readonly layer: Layer;
  /** Local time = UTC + this, for time-of-day activity conditions. */
  readonly tzOffsetMin: number;
}

/** A character as main hands it over: its id and the animations its pack has. */
export interface CharacterSpec {
  readonly id: CharacterId;
  readonly anims: readonly AnimName[];
}

/** The active character as the core sees it: a checked spec plus its base idle, derived once (`toCharacterRef`). */
export interface CharacterRef extends CharacterSpec {
  readonly idle: AnimName;
}

/** Where the character stands. M1b adds `window_side` and `screen_edge` (SPEC §4.2). */
export type Surface =
  | { readonly kind: 'floor' }
  | {
      readonly kind: 'window_top';
      readonly id: WindowId;
      readonly left: number;
      readonly right: number;
      readonly y: number;
    };

/**
 * The last settled spot. While dragged or falling, the live point comes from the input or the fall path.
 * Engine invariant (M1-06/08/14): when the window under `surface` vanishes (a `world` without its id, a drag
 * included), the engine clears or re-homes `surface` before using it; a stale `window_top` is never kept.
 */
export interface Placement {
  readonly surface: Surface;
  readonly x: number;
  readonly y: number;
}

/** SPEC §4.5: 0–100 each, per character; drifts back to neutral analytically from `updatedAt`. */
export interface MoodState {
  readonly mood: number;
  readonly affinity: number;
  readonly updatedAt: number;
}

/** User-initiated, silent cursor reactions (SPEC §4.1/4.3, D-27: second-scale cooldowns). */
export type CursorReaction = 'startle' | 'petted' | 'poked';
/** Reactions the throttle tracks; M3/M4 add system and dev reactions. */
export type ReactionKey = CursorReaction;

/** Anti-spam memory (SPEC §4.1): per-reaction last fire, the last unsolicited line, the dedup queue. */
export interface ThrottleState {
  readonly firedAt: Readonly<Partial<Record<ReactionKey, number>>>;
  readonly lastLineAt: number | null;
  /** Dedup queue: when each reaction kind was last queued; the newest replaces an older one. */
  readonly pending: Readonly<Partial<Record<ReactionKey, number>>>;
}

/**
 * A daily quiet-hours window in local minutes after midnight, `[fromMin, toMin)`; `fromMin > toMin` runs over
 * midnight, `fromMin === toMin` is empty. Bounds (0…1439) are validated by the zod
 * settings contract where the setting enters (M5); core does not re-check them.
 */
export interface QuietHours {
  readonly fromMin: number;
  readonly toMin: number;
}

/** A pointer sample, stamped with main's receipt time. */
export interface CursorSample {
  readonly x: number;
  readonly y: number;
  readonly at: number;
}

/** Cursor memory for startle speed and petting circles (M1-10); the trail is bounded by `CURSOR_TRAIL.samples`. */
export interface CursorMemory {
  readonly last: CursorSample | null;
  /** Oldest first. */
  readonly trail: readonly CursorSample[];
}

/** A state that ends on its own at `until`. */
interface Timed {
  readonly since: number;
  readonly until: number;
}

/** A state an event ends; `until` is an optional cap (an activity's max duration), null = open-ended. */
interface Open {
  readonly since: number;
  readonly until: number | null;
}

/** States a reaction returns to when it ends. */
export type RestingBehavior =
  | (Open & { readonly kind: 'idle'; readonly anim: AnimName })
  | (Open & { readonly kind: 'sit_edge' })
  | (Open & { readonly kind: 'activity'; readonly id: ActivityId; readonly anim: AnimName });

/** Omit over each member of a union (plain `Omit` would collapse it). */
type Untimed<T> = T extends unknown ? Omit<T, 'since' | 'until'> : never;

/**
 * What a reaction resumes: a resting state's kind and payload; its times are stamped when it resumes
 * (`resumeBehavior`). Walk and turn are not resumable: an interrupted walk is re-planned from where it stopped.
 */
export type Resume = Untimed<RestingBehavior>;

export type SwitchMode = 'walk' | 'poof';

/**
 * SPEC §4.1 states as built in M1 (run/climb/hang/peek wait for the M1b art pass; talk/think/focus for M2/M3).
 * `turn` plays forward before a walk and reversed after it (`then: front`); a walk lasts `since` → `until` (arrival).
 */
export type Behavior =
  | RestingBehavior
  | (Timed & {
      readonly kind: 'turn';
      readonly dir: Direction;
      readonly then: { readonly kind: 'walk'; readonly x1: number } | { readonly kind: 'front' };
    })
  /** `x1 = x0 + dirSign(dir) · steps · stepDip`; the shown walk and `travelX` sample the stored strides. */
  | (Timed & {
      readonly kind: 'walk';
      readonly dir: Direction;
      readonly x0: number;
      readonly x1: number;
      readonly steps: number;
      readonly stepDip: number;
    })
  | (Timed & {
      readonly kind: 'react';
      readonly reaction: CursorReaction;
      readonly anim: AnimName;
      readonly resume: Resume;
    })
  | (Open & { readonly kind: 'drag' })
  | (Timed & { readonly kind: 'fall'; readonly path: readonly PathSegment[] })
  | (Timed & { readonly kind: 'land' })
  | (Open & { readonly kind: 'sleep' })
  /** Radial menu open: attending, front-facing (SPEC §4.1, priority 60). */
  | (Open & { readonly kind: 'menu' })
  /** `until` = the load timeout (`SWITCH_LOAD_TIMEOUT_MS`) or the walk-off arrival. */
  | (Timed & { readonly kind: 'switch_out'; readonly mode: SwitchMode; readonly to: CharacterId })
  | (Timed & { readonly kind: 'switch_in'; readonly mode: SwitchMode })
  | (Open & { readonly kind: 'hidden' });

export type BehaviorKind = Behavior['kind'];

/**
 * Rows of the SPEC §4.1 priority table M1 uses (numbers in `content/behavior.ts` `PRIORITY`). `activity` is the
 * baseline row («нічого»): every resting or travelling state runs at it. M3/M4 add system and dev reaction rows.
 */
export type Interrupt = 'drag' | 'hidden' | 'switch' | 'menu' | 'cursor' | 'sleep' | 'activity';

export interface CoreState {
  readonly rng: RngState;
  readonly character: CharacterRef;
  readonly world: World;
  readonly pos: Placement;
  /** Last travel direction; front-facing states ignore it. */
  readonly facing: Direction;
  readonly behavior: Behavior;
  readonly mood: MoodState;
  readonly throttle: ThrottleState;
  readonly cursor: CursorMemory;
  /** Recently picked activities, newest first (recency penalty). */
  readonly recent: readonly ActivityId[];
  /** Whether the stage window currently lets clicks through (main mirrors it with setIgnoreMouseEvents). */
  readonly hitThrough: boolean;
  /** Deadline scheduling (D-27, F2): when main must wake the core next; null = nothing due. */
  readonly wakeAt: number | null;
}

/** Stage input. Pointer samples are stamped with main's receipt time (`now`). */
export type PointerInput =
  /** Alpha hit-test result (`stage:hit`): is the cursor over an opaque pixel of the character? */
  | { readonly kind: 'hover'; readonly overOpaque: boolean }
  | { readonly kind: 'pointer'; readonly x: number; readonly y: number }
  | { readonly kind: 'pointer-leave' }
  | { readonly kind: 'click' }
  | { readonly kind: 'drag-start' }
  /** Release point and fling velocity (DIP/s); physics clamps the speed (M1-08). */
  | {
      readonly kind: 'drag-end';
      readonly x: number;
      readonly y: number;
      readonly vx: number;
      readonly vy: number;
    }
  /** Right-click at the cursor point; the menu opens there (M1-25 `OpenMenu`). */
  | { readonly kind: 'context-menu'; readonly x: number; readonly y: number };

export type PowerState = 'lock' | 'unlock' | 'suspend' | 'resume';

export type CoreEvent =
  /** The `wakeAt` deadline came due. */
  | { readonly type: 'tick' }
  | { readonly type: 'world'; readonly world: World }
  | { readonly type: 'input'; readonly input: PointerInput }
  | { readonly type: 'user-idle'; readonly idleMs: number }
  | { readonly type: 'power'; readonly state: PowerState }
  | { readonly type: 'visibility'; readonly shown: boolean }
  /** Switch to `to`, which arrives with its stored mood. */
  | { readonly type: 'switch'; readonly to: CharacterId; readonly mood: MoodState }
  | {
      readonly type: 'character-loaded';
      readonly id: CharacterId;
      readonly ok: true;
      readonly anims: readonly AnimName[];
    }
  | { readonly type: 'character-loaded'; readonly id: CharacterId; readonly ok: false }
  | { readonly type: 'menu-closed' };

export type CoreEventType = CoreEvent['type'];

/** FX marks M1 uses (plan check (h)); names match `assets-src/fx/marks.ts`. */
export type FxMark = 'zzz' | 'heart' | 'sweat' | 'exclaim' | 'question' | 'smoke';

export type SensingRate = 'off' | 'slow' | 'fast';

/** Why the core refused an event or an init (rules/core.md: invalid input → unchanged state + this). */
export type RejectReason = 'non-finite' | 'out-of-range' | 'too-many' | 'duplicate' | 'no-idle';

export type Effect =
  | {
      readonly type: 'Show';
      readonly anim: AnimName;
      readonly facing: Facing;
      readonly playback: 'fwd' | 'rev';
      readonly motion: Motion;
    }
  | { readonly type: 'Fx'; readonly mark: FxMark; readonly untilMs: number }
  | { readonly type: 'SetHitThrough'; readonly ignore: boolean }
  | { readonly type: 'OpenMenu'; readonly x: number; readonly y: number }
  | { readonly type: 'LoadCharacter'; readonly id: CharacterId }
  | { readonly type: 'CommitSwitch'; readonly id: CharacterId }
  | { readonly type: 'PersistMood'; readonly id: CharacterId; readonly mood: MoodState }
  | { readonly type: 'PersistActive'; readonly id: CharacterId }
  | { readonly type: 'SetSensing'; readonly desktop: SensingRate; readonly idle: Exclude<SensingRate, 'off'> }
  | { readonly type: 'Rejected'; readonly event: CoreEventType; readonly reason: RejectReason };

export interface StepResult {
  readonly state: CoreState;
  readonly effects: readonly Effect[];
}
