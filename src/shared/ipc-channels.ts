// Channel names only, without zod, so the sandboxed preload bundles stay a few hundred bytes instead of ~160 kB
// (zod would be inlined into each). The contracts for these names live in ./ipc.ts, keyed by these constants.
export const CHANNEL = {
  ping: 'app:ping',
  stageHit: 'stage:hit',
  stageInput: 'stage:input',
  stageCharacters: 'stage:characters',
} as const;
