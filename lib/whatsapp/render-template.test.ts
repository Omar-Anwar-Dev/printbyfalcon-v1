import { describe, it, expect } from 'vitest';
import { substituteVariables } from './render-template';

describe('substituteVariables', () => {
  it('replaces a single placeholder', () => {
    const out = substituteVariables('Hi {{name}}', { name: 'Omar' });
    expect(out).toBe('Hi Omar');
  });

  it('replaces multiple placeholders', () => {
    const out = substituteVariables(
      'Order {{orderNumber}} — total {{total}} EGP',
      { orderNumber: 'ORD-001', total: 1250 },
    );
    expect(out).toBe('Order ORD-001 — total 1250 EGP');
  });

  it('leaves unknown placeholders intact for admin to notice', () => {
    const out = substituteVariables('Hi {{name}}, code {{otp}}', {
      name: 'Omar',
    });
    expect(out).toBe('Hi Omar, code {{otp}}');
  });

  it('coerces numeric values to strings', () => {
    const out = substituteVariables('{{n}} units', { n: 42 });
    expect(out).toBe('42 units');
  });

  it('preserves Arabic content + emoji', () => {
    const out = substituteVariables('أهلاً {{name}} 👋', { name: 'أحمد' });
    expect(out).toBe('أهلاً أحمد 👋');
  });

  it('collapses 3+ consecutive newlines to 2 (empty optional lines)', () => {
    // Template authored with an optional {{poRefLine}} variable; caller
    // passes empty string when not applicable. Expect: clean output, no
    // triple-blank gap.
    const out = substituteVariables(
      'Order {{orderNumber}}\n{{poRefLine}}\n\nTotal: {{total}} EGP',
      { orderNumber: 'ORD-001', poRefLine: '', total: '1,250' },
    );
    // Two newlines max between Order line and Total line.
    expect(out).not.toMatch(/\n{3,}/);
    expect(out).toContain('Order ORD-001');
    expect(out).toContain('Total: 1,250 EGP');
  });

  it('trims surrounding whitespace from final output', () => {
    const out = substituteVariables('\n\n{{x}}\n\n', { x: 'hi' });
    expect(out).toBe('hi');
  });

  it('leaves a placeholder with no matching var alone (regex word-boundary)', () => {
    const out = substituteVariables(
      'See {{order_number}} or {{ orderNumber }}',
      { orderNumber: 'X' },
    );
    // {{order_number}} (snake_case) is its own variable — unknown, kept.
    // `{{ orderNumber }}` has spaces — our regex requires \w+ adjacent to {{ }},
    // so spaces break the match → kept literal too.
    expect(out).toContain('{{order_number}}');
    expect(out).toContain('{{ orderNumber }}');
  });

  it('substitutes the same placeholder multiple times', () => {
    const out = substituteVariables('{{x}} and {{x}} again', { x: 'hi' });
    expect(out).toBe('hi and hi again');
  });

  it('handles a body with only literal text (no placeholders)', () => {
    const out = substituteVariables('Just plain text.', {});
    expect(out).toBe('Just plain text.');
  });
});
