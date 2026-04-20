import { describe, expect, it } from 'vitest';
import {
  constantTimeEq,
  normalizeWhats360Event,
  pickWhats360String,
} from './whats360-webhook';

describe('normalizeWhats360Event', () => {
  it.each([
    ['send failure', 'send_failure'],
    ['send_failure', 'send_failure'],
    ['SendFailure', 'send_failure'],
    ['failed', 'send_failure'],
  ])('categorizes %s as send_failure', (input, expected) => {
    expect(normalizeWhats360Event(input)).toBe(expected);
  });

  it.each([
    ['subscription expiry', 'subscription_expiry'],
    ['subscription_ended', 'subscription_expiry'],
    ['expired', 'subscription_expiry'],
  ])('categorizes %s as subscription_expiry', (input, expected) => {
    expect(normalizeWhats360Event(input)).toBe(expected);
  });

  it.each([
    ['outgoing message', 'outgoing_message'],
    ['sent', 'outgoing_message'],
  ])('categorizes %s as outgoing_message', (input, expected) => {
    expect(normalizeWhats360Event(input)).toBe(expected);
  });

  it.each([
    ['incoming message', 'incoming_message'],
    ['received', 'incoming_message'],
    ['message', 'incoming_message'],
  ])('categorizes %s as incoming_message', (input, expected) => {
    expect(normalizeWhats360Event(input)).toBe(expected);
  });

  it('returns null for empty / nullish input', () => {
    expect(normalizeWhats360Event(null)).toBeNull();
    expect(normalizeWhats360Event(undefined)).toBeNull();
    expect(normalizeWhats360Event('')).toBeNull();
  });

  it('passes unknown events through lowercased + underscore-normalized', () => {
    expect(normalizeWhats360Event('Some-New-Event')).toBe('some_new_event');
  });
});

describe('pickWhats360String', () => {
  it('returns first matching non-empty string in order', () => {
    expect(
      pickWhats360String({ a: '', b: 'hello', c: 'other' }, ['a', 'b', 'c']),
    ).toBe('hello');
  });

  it('returns null if no match', () => {
    expect(pickWhats360String({ foo: 123 }, ['a', 'b'])).toBeNull();
  });

  it('skips non-string values', () => {
    expect(
      pickWhats360String(
        { a: 42, b: null, c: 'real' } as Record<string, unknown>,
        ['a', 'b', 'c'],
      ),
    ).toBe('real');
  });
});

describe('constantTimeEq', () => {
  it('returns true for equal strings', () => {
    expect(constantTimeEq('abc123', 'abc123')).toBe(true);
  });

  it('returns false for different strings of equal length', () => {
    expect(constantTimeEq('abc123', 'abc124')).toBe(false);
  });

  it('returns false for different lengths', () => {
    expect(constantTimeEq('abc', 'abcd')).toBe(false);
  });

  it('handles empty strings', () => {
    expect(constantTimeEq('', '')).toBe(true);
  });
});
