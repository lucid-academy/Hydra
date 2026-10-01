import { describe, expect, it } from 'vitest';
import { parseUrlParams } from '../src/urlParams';

describe('parseUrlParams', () => {
  it('reads seed, scene and debug', () => {
    expect(parseUrlParams('?seed=123&scene=battle&debug=1&group=patrol&hp=5&speed=4')).toEqual({
      seed: 123,
      scene: 'battle',
      debug: true,
      group: 'patrol',
      hp: 5,
      speed: 4,
      near: null,
    });
  });

  it('returns defaults when nothing is given', () => {
    expect(parseUrlParams('')).toEqual({ seed: null, scene: null, debug: false, group: null, hp: null, speed: null, near: null });
    expect(parseUrlParams('?near=shrine').near).toBe('shrine');
  });

  it('ignores an empty seed', () => {
    expect(parseUrlParams('?seed=').seed).toBeNull();
  });

  it('ignores body HP and speed that are not positive numbers', () => {
    expect(parseUrlParams('?hp=abc').hp).toBeNull();
    expect(parseUrlParams('?hp=0').hp).toBeNull();
    expect(parseUrlParams('?hp=-3').hp).toBeNull();
    expect(parseUrlParams('?speed=fast').speed).toBeNull();
  });
});
