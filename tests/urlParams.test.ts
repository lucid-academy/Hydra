import { describe, expect, it } from 'vitest';
import { parseUrlParams } from '../src/urlParams';

describe('parseUrlParams', () => {
  it('reads seed, scene and debug', () => {
    expect(parseUrlParams('?seed=123&scene=battle&debug=1')).toEqual({ seed: 123, scene: 'battle', debug: true });
  });

  it('returns defaults when nothing is given', () => {
    expect(parseUrlParams('')).toEqual({ seed: null, scene: null, debug: false });
  });

  it('ignores an empty seed', () => {
    expect(parseUrlParams('?seed=').seed).toBeNull();
  });
});
