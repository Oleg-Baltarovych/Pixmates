// The one built-in shading preset (ADR 009: «anime soft»; the cel preset, `celSnap` and mask tone remaps were
// deleted in plan M-ART MA-22). Full 6–7-tone ramps, gentle light, texture dither on cloth only, soft AO, manual
// AA and a 2-step rim on the side away from the light (dark wallpapers).
export interface StylePreset {
  readonly name: string;
  /** Light pass strength (shade steps). */
  readonly light: number;
  /** Bayer spread: dithering only as texture near ½ steps. */
  readonly dither: number;
  /** Outline: steps below the neighbour. */
  readonly drop: number;
  readonly aa: boolean;
  /** Rim light strength (0 = off). */
  readonly rim: number;
  readonly occlusion: number;
}

export const SOFT: StylePreset = {
  name: 'Anime soft',
  light: 2,
  dither: 0.35,
  drop: 2,
  aa: true,
  rim: 2,
  occlusion: 1,
};
