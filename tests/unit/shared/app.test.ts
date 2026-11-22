import { describe, expect, it } from 'vitest';
import { APP_ID, PRODUCT_NAME } from '../../../src/shared/app.ts';

describe('app identity', () => {
  it('uses the reverse-DNS appId and exe name fixed by the owner (D-9)', () => {
    expect(APP_ID).toBe('io.github.oleg-baltarovych.pixmates');
    expect(PRODUCT_NAME).toBe('Pixmates');
  });
});
