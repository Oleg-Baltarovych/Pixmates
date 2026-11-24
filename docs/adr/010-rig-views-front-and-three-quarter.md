# 010. Rig views: front + three-quarter (3/4) for travel

- Status: Accepted (owner, 2026-11-23: front walk retired, q34 faces neutral + blink, 2-frame turn, mirroring of one-sided details accepted)
- Date: 2026-11-23
- Revised by ADR 011 (2026-11-24, frame 56 × 72): mirror axis x = 24 → 28; the q34 stride and `WALK_TRAVEL` are
  re-derived from the longer leg in MA-45. Head-steady, the 2-frame turn and `facing` stay.

## Context
The M-ART rig (ADR 004, 009) draws every pose front-facing. In M1 the character travels horizontally along the
taskbar and window edges (SPEC §4.2–4.3). A front walk (feet spreading sideways, face to the viewer) sliding across
the screen reads as a glide. The owner found this on `maid` (MA-27) and decided (D-16) to add a three-quarter view
now, before `kitsune` and `goth` are authored, so no body is reworked later. The owner also requires a steady head:
no side-to-side rocking (walk sway was removed and a test forbids lateral head/root offset).

## Decision
- The rig has two views: `front` and `q34`. `q34` is authored facing screen-right only; facing left is the runtime
  mirror about the body axis (x = 24), with the light flip accepted (ART-BIBLE §8).
- A pose declares its view (`RigAnim.view`, per-frame `headView` for turns). A body supplies per-view authored masks
  (head, face library, accessories, shoe) and optional per-view tweaks; procedural parts take view parameters
  (foreshortened bodice, trailing hair/tail/hem, legs and arm swing fore/aft). Far arm and far leg draw behind the torso.
- In M-ART only `walk` (q34, replaces the front walk) and `turn` (front → q34, 2 frames) use q34. `run`/`climb` are
  authored in q34 in M1. Everything that acts or talks to the viewer stays front.
- The pack format stays flat: one strip per animation name plus an optional per-animation `facing`
  (`front | right | left`, default `front`). The runtime mirrors when `facing` is opposite to the travel direction.
  Views are a rig concept and do not appear in the pack.
- Every rig gate (headroom, seams, face validator, arm over torso, determinism) runs on q34 frames, plus a mirror test.
  The head-steady rule applies to every travel animation.

## Alternatives considered
- **Profile (side) view:** reads best for travel, but at 48 px the anime face loses an eye and most of the emotion
  carrier (ADR 009), and it needs a full second head per expression. Rejected.
- **Baked left and right facings:** fixes the light flip but doubles q34 frames and authored masks. Kept as an M1
  follow-up only if the mirrored sheet is rejected.
- **Keep the front walk and fix it in M1:** cheaper now, but means reworking three bodies and their reviews later.
- **A `view` field in the manifest:** pushes a rig concept into the runtime format and into imported packs. Rejected
  in favour of `facing`.

## Consequences
- Positive: travel reads as walking; kitsune and goth are designed once in both views; imported packs can declare a
  left-facing walk.
- Negative: per character ≈ +1 head mask, 2 face layers and 3–4 accessory masks; asymmetric details (clip, side mask)
  swap sides when mirrored; +2 frames per atlas (105 total, still one ≤ 1024² atlas).
- Follow-ups: M1 core decides facing and sequences `turn` → `walk` → reversed `turn`; q34 `happy`/`worried` faces if
  M1 travel needs them.
