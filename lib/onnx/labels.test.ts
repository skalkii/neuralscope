import { describe, it, expect } from 'vitest';
import { labelLookupFor } from './labels';

describe('labelLookupFor', () => {
  const labels = ['cat', 'dog', 'bird'];

  it('returns null when no labels supplied', () => {
    expect(labelLookupFor(3, null)).toBeNull();
  });

  it('maps direct index match (1:1)', () => {
    const fn = labelLookupFor(3, labels);
    expect(fn).not.toBeNull();
    expect(fn!(0)).toBe('cat');
    expect(fn!(2)).toBe('bird');
  });

  it('maps with background class prefix when output is len+1', () => {
    const fn = labelLookupFor(4, labels);
    expect(fn).not.toBeNull();
    expect(fn!(0)).toBe('background');
    expect(fn!(1)).toBe('cat');
    expect(fn!(3)).toBe('bird');
  });

  it('returns null for mismatched lengths', () => {
    expect(labelLookupFor(2, labels)).toBeNull();
    expect(labelLookupFor(5, labels)).toBeNull();
  });

  it('falls back to index.toString for out-of-range', () => {
    const fn = labelLookupFor(3, labels);
    expect(fn!(99)).toBe('99');
  });
});
