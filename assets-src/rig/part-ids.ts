// Rig part ids (`Part.partId`, written per px by compose and `stampMask`) and the labels the arm-over-torso check
// reads. Every pass that filters by part goes through these names; no bare part numbers elsewhere.

/** All part ids the rig composer writes (0 = none / unlabelled, e.g. the fist-to-jaw break). */
export const PART_ID = {
  none: 0,
  /** Back hair mass, side locks. */
  hair: 1,
  /** Fox tail and spade tail tube. */
  tail: 2,
  /** Legs (both legs in front; the near leg in q34, and the far leg unless `BodyView.farLegShade`). */
  legs: 3,
  /** Hem: skirt + petticoat lace + apron panel, or shorts. */
  hem: 4,
  /** Bodice + neck (and the apron bib). */
  torso: 7,
  /** Waist band, sash knot, collar accessory. */
  trim: 8,
  /** Near (L) arm: shoulder + upper arm, forearm, end (cuff + hand + chin fist). */
  armUpperL: 9,
  armForeL: 10,
  armEndL: 11,
  /**
   * Scarf ends: not torso/trim, so the arm-over-torso separator never treats a loose end the arm passes over as the
   * bodice (the end and the sleeve already differ in hue).
   */
  scarf: 12,
  /** q34 far leg when `BodyView.farLegShade` is set. */
  farLeg: 13,
  /** Far (R) arm, as the near one. */
  armUpperR: 19,
  armForeR: 20,
  armEndR: 21,
} as const;

/** Part ids per arm: shoulder + upper arm, forearm, end (cuff + hand + chin fist). */
export const ARM_IDS_L = { upper: PART_ID.armUpperL, fore: PART_ID.armForeL, end: PART_ID.armEndL } as const;
export const ARM_IDS_R = { upper: PART_ID.armUpperR, fore: PART_ID.armForeR, end: PART_ID.armEndR } as const;

/** Sleeve part ids (both sides; the ends are hand + cuff). */
export const SLEEVE_PARTS: ReadonlySet<number> = new Set([
  ARM_IDS_L.upper,
  ARM_IDS_L.fore,
  ARM_IDS_R.upper,
  ARM_IDS_R.fore,
]);
/** Near (L) sleeve part ids. */
export const NEAR_SLEEVE: ReadonlySet<number> = new Set([ARM_IDS_L.upper, ARM_IDS_L.fore]);
/** Left-arm part ids (a bare sleeve px is labelled as its side's end). */
export const LEFT_ARM: ReadonlySet<number> = new Set(Object.values(ARM_IDS_L));
/** Torso ids (bodice/neck, waist band/trim). */
export const TORSO_PARTS: ReadonlySet<number> = new Set([PART_ID.torso, PART_ID.trim]);
export const ARM_PARTS: ReadonlySet<number> = new Set([...Object.values(ARM_IDS_L), ...Object.values(ARM_IDS_R)]);
/** Leg ids (near/front legs and the q34 far leg). */
export const LEG_PARTS: ReadonlySet<number> = new Set([PART_ID.legs, PART_ID.farLeg]);

/** Part labels exported for the arm-over-torso check (`assets-src/rig/checks.ts`). */
export const ARM_LABEL = { none: 0, sleeveL: 1, sleeveR: 2, endL: 3, endR: 4, torso: 5, trim: 6 } as const;
/** Label per part id; every other id (hair, tail, legs, hem, scarf, far leg) is `none`. */
export const LABEL_OF: Readonly<Partial<Record<number, number>>> = {
  [ARM_IDS_L.upper]: ARM_LABEL.sleeveL,
  [ARM_IDS_L.fore]: ARM_LABEL.sleeveL,
  [ARM_IDS_L.end]: ARM_LABEL.endL,
  [ARM_IDS_R.upper]: ARM_LABEL.sleeveR,
  [ARM_IDS_R.fore]: ARM_LABEL.sleeveR,
  [ARM_IDS_R.end]: ARM_LABEL.endR,
  [PART_ID.torso]: ARM_LABEL.torso,
  [PART_ID.trim]: ARM_LABEL.trim,
};

/** Part filter for masks that sit behind both arms. */
export const NOT_ARM = (id: number): boolean => !ARM_PARTS.has(id);
/** Parts a tucked spade may cover: legs and empty px, never the skirt/lace or the torso. */
export const UNDER_HEM = (id: number): boolean => id !== PART_ID.hem && !TORSO_PARTS.has(id);
