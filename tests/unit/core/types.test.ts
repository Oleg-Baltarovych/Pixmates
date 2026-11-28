import { describe, expectTypeOf, it } from 'vitest';
import type { Behavior, BehaviorKind } from '../../../src/core/types.ts';

type UntilOf<K extends BehaviorKind> = Extract<Behavior, { kind: K }>['until'];

describe('Behavior timing (compile-time)', () => {
  it('states that end on their own always carry a deadline', () => {
    expectTypeOf<
      UntilOf<'walk' | 'turn' | 'react' | 'land' | 'fall' | 'switch_out' | 'switch_in'>
    >().toEqualTypeOf<number>();
  });

  it('states an event ends may be open-ended', () => {
    expectTypeOf<UntilOf<'idle' | 'sit_edge' | 'activity' | 'drag' | 'menu' | 'hidden' | 'sleep'>>().toEqualTypeOf<
      number | null
    >();
  });

  it('a reaction stores its resume state without times', () => {
    type Resume = Extract<Behavior, { kind: 'react' }>['resume'];
    expectTypeOf<Resume>().not.toHaveProperty('since');
    expectTypeOf<Resume>().not.toHaveProperty('until');
  });
});
