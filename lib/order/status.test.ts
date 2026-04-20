import { describe, expect, it } from 'vitest';
import {
  canTransitionOrderStatus,
  isTerminalOrderStatus,
  statusReleasesInventory,
} from './status';

describe('canTransitionOrderStatus', () => {
  it('allows the happy-path B2C pipeline', () => {
    expect(canTransitionOrderStatus('CONFIRMED', 'HANDED_TO_COURIER')).toBe(
      true,
    );
    expect(
      canTransitionOrderStatus('HANDED_TO_COURIER', 'OUT_FOR_DELIVERY'),
    ).toBe(true);
    expect(canTransitionOrderStatus('OUT_FOR_DELIVERY', 'DELIVERED')).toBe(
      true,
    );
  });

  it('allows the B2B Submit-for-Review step', () => {
    expect(canTransitionOrderStatus('PENDING_CONFIRMATION', 'CONFIRMED')).toBe(
      true,
    );
  });

  it('forbids backward moves from DELIVERED except RETURNED', () => {
    expect(canTransitionOrderStatus('DELIVERED', 'OUT_FOR_DELIVERY')).toBe(
      false,
    );
    expect(canTransitionOrderStatus('DELIVERED', 'CONFIRMED')).toBe(false);
    expect(canTransitionOrderStatus('DELIVERED', 'RETURNED')).toBe(true);
  });

  it('forbids exits from terminal states', () => {
    expect(canTransitionOrderStatus('CANCELLED', 'CONFIRMED')).toBe(false);
    expect(canTransitionOrderStatus('RETURNED', 'CONFIRMED')).toBe(false);
  });

  it('allows DELAYED_OR_ISSUE recovery back into the pipeline', () => {
    expect(canTransitionOrderStatus('DELAYED_OR_ISSUE', 'CONFIRMED')).toBe(
      true,
    );
    expect(
      canTransitionOrderStatus('DELAYED_OR_ISSUE', 'HANDED_TO_COURIER'),
    ).toBe(true);
    expect(
      canTransitionOrderStatus('DELAYED_OR_ISSUE', 'OUT_FOR_DELIVERY'),
    ).toBe(true);
    expect(canTransitionOrderStatus('DELAYED_OR_ISSUE', 'CANCELLED')).toBe(
      true,
    );
  });

  it('allows CANCEL from every non-terminal state', () => {
    expect(canTransitionOrderStatus('PENDING_CONFIRMATION', 'CANCELLED')).toBe(
      true,
    );
    expect(canTransitionOrderStatus('CONFIRMED', 'CANCELLED')).toBe(true);
    expect(canTransitionOrderStatus('HANDED_TO_COURIER', 'CANCELLED')).toBe(
      true,
    );
  });
});

describe('isTerminalOrderStatus', () => {
  it('marks CANCELLED + RETURNED as terminal', () => {
    expect(isTerminalOrderStatus('CANCELLED')).toBe(true);
    expect(isTerminalOrderStatus('RETURNED')).toBe(true);
  });

  it('leaves DELIVERED non-terminal so customer-initiated returns can land', () => {
    expect(isTerminalOrderStatus('DELIVERED')).toBe(false);
  });
});

describe('statusReleasesInventory', () => {
  it('only CANCELLED triggers reservation release', () => {
    expect(statusReleasesInventory('CANCELLED')).toBe(true);
    expect(statusReleasesInventory('RETURNED')).toBe(false);
    expect(statusReleasesInventory('DELIVERED')).toBe(false);
  });
});
