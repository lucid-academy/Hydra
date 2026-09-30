import { describe, expect, it } from 'vitest';
import { parseUrlParams } from '../src/urlParams';

describe('parseUrlParams', () => {
  it('reads seed, scene and debug', () => {
    expect(parseUrlParams('?seed=123&scene=battle&debug=1&group=patrol')).toEqual({ seed: 123, scene: 'battle', debug: true, group: 'patrol' });
  });

  it('returns defaults when nothing is given', () => {
    expect(parseUrlParams('')).toEqual({ seed: null, scene: null, debug: false, group: null });
  });

  it('ignores an empty seed', () => {
    expect(parseUrlParams('?seed=').seed).toBeNull();
  });
});
