import { describe, expect, it } from 'vitest';
import { formatCents } from '../src/panels/inspector.ts';
import { isClick } from '../src/view/camera-input.ts';

describe('the inspector', () => {
  it('shows wallets as exact money, digits grouped without Intl', () => {
    expect(formatCents(100_000)).toBe('1,000.00');
    expect(formatCents(5)).toBe('0.05');
    expect(formatCents(-250)).toBe('-2.50');
    expect(formatCents(123_456_789)).toBe('1,234,567.89');
    expect(formatCents(0)).toBe('0.00');
  });

  it('takes a press and release under 4 CSS px apart as a click, and anything further as a drag', () => {
    expect(isClick(3, 0)).toBe(true);
    expect(isClick(2, -2)).toBe(true);
    expect(isClick(4, 0)).toBe(false);
    expect(isClick(0, 5)).toBe(false);
  });
});
