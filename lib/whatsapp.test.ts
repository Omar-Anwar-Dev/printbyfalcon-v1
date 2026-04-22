import { describe, expect, it } from 'vitest';
import { normalizeJid } from './whatsapp';
import {
  ORDER_STATUS_LABELS,
  renderB2bOrderConfirmedByRep,
  renderB2bPendingReview,
  renderOrderConfirmed,
  renderOrderStatusChange,
  renderOtp,
  renderPaymentFailed,
  type OrderStatusKey,
} from './whatsapp-templates';

describe('normalizeJid', () => {
  it('accepts +20 prefix', () => {
    expect(normalizeJid('+201012345678')).toBe('201012345678@s.whatsapp.net');
  });

  it('accepts leading zero + country code stripped', () => {
    expect(normalizeJid('201012345678')).toBe('201012345678@s.whatsapp.net');
  });

  it('accepts national format with leading zero', () => {
    expect(normalizeJid('01012345678')).toBe('201012345678@s.whatsapp.net');
  });

  it('accepts bare 10-digit mobile', () => {
    expect(normalizeJid('1012345678')).toBe('201012345678@s.whatsapp.net');
  });

  it('strips dashes and spaces', () => {
    expect(normalizeJid('010-1234-5678')).toBe('201012345678@s.whatsapp.net');
    expect(normalizeJid(' 0101 2345678 ')).toBe('201012345678@s.whatsapp.net');
  });

  it('rejects empty / too-short / non-numeric', () => {
    expect(normalizeJid('')).toBeNull();
    expect(normalizeJid('abc')).toBeNull();
    expect(normalizeJid('123')).toBeNull();
  });
});

describe('renderOtp', () => {
  it('renders Arabic body with the code', () => {
    const body = renderOtp('123456', 'ar');
    expect(body).toContain('123456');
    expect(body).toContain('5 دقائق');
    expect(body).toContain('برنت باي فالكون');
  });

  it('renders English body with the code', () => {
    const body = renderOtp('987654', 'en');
    expect(body).toContain('987654');
    expect(body).toContain('5 minutes');
    expect(body).toContain('Print By Falcon');
  });
});

describe('renderOrderConfirmed', () => {
  const args = {
    orderNumber: 'ORD-26-2004-00001',
    totalEgp: 1450,
    paymentMethod: 'COD' as const,
  };

  it('Arabic body contains order number + total + COD label', () => {
    const body = renderOrderConfirmed(args, 'ar');
    expect(body).toContain('ORD-26-2004-00001');
    expect(body).toContain('1450');
    expect(body).toContain('الدفع عند الاستلام');
  });

  it('English body uses card label when paymentMethod is PAYMOB_CARD', () => {
    const body = renderOrderConfirmed(
      { ...args, paymentMethod: 'PAYMOB_CARD' },
      'en',
    );
    expect(body).toContain('Card (Paymob)');
    expect(body).toContain('EGP');
  });
});

describe('renderOrderStatusChange', () => {
  it('renders Arabic label for HANDED_TO_COURIER with courier details', () => {
    const body = renderOrderStatusChange(
      {
        orderNumber: 'ORD-26-2004-00002',
        newStatus: 'HANDED_TO_COURIER',
        courierName: 'Mylerz',
        courierPhone: '+201000000000',
      },
      'ar',
    );
    expect(body).toContain(ORDER_STATUS_LABELS.HANDED_TO_COURIER.ar);
    expect(body).toContain('Mylerz');
    expect(body).toContain('+201000000000');
  });

  it('renders English label for DELIVERED', () => {
    const body = renderOrderStatusChange(
      { orderNumber: 'ORD-X', newStatus: 'DELIVERED' },
      'en',
    );
    expect(body).toContain(ORDER_STATUS_LABELS.DELIVERED.en);
    expect(body).toContain('ORD-X');
  });

  it('includes optional note when provided', () => {
    const body = renderOrderStatusChange(
      {
        orderNumber: 'ORD-Y',
        newStatus: 'DELAYED_OR_ISSUE',
        note: 'Courier traffic in Cairo — new ETA tomorrow',
      },
      'en',
    );
    expect(body).toContain('Courier traffic in Cairo');
  });

  /**
   * Fixture-driven coverage for every OrderStatusKey in both locales (ADR-033
   * replaced Meta template pre-approvals with server-side renderers, so this
   * test suite is the canonical verification that every status produces a
   * bilingual message).
   */
  const allStatuses: OrderStatusKey[] = [
    'PENDING_CONFIRMATION',
    'CONFIRMED',
    'HANDED_TO_COURIER',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'RETURNED',
    'DELAYED_OR_ISSUE',
  ];

  for (const status of allStatuses) {
    it(`renders ${status} in Arabic with the brand signoff + orderNumber`, () => {
      const body = renderOrderStatusChange(
        { orderNumber: 'ORD-26-2004-00099', newStatus: status },
        'ar',
      );
      expect(body).toContain('ORD-26-2004-00099');
      expect(body).toContain(ORDER_STATUS_LABELS[status].ar);
      expect(body).toContain('برنت باي فالكون');
    });

    it(`renders ${status} in English with the brand signoff + orderNumber`, () => {
      const body = renderOrderStatusChange(
        { orderNumber: 'ORD-26-2004-00099', newStatus: status },
        'en',
      );
      expect(body).toContain('ORD-26-2004-00099');
      expect(body).toContain(ORDER_STATUS_LABELS[status].en);
      expect(body).toContain('Print By Falcon');
    });
  }
});

describe('renderPaymentFailed', () => {
  it('Arabic body includes the order number and brand signoff', () => {
    const body = renderPaymentFailed('ORD-26-2004-00010', 'ar');
    expect(body).toContain('ORD-26-2004-00010');
    expect(body).toContain('برنت باي فالكون');
    expect(body).toContain('لم يكتمل الدفع');
  });

  it("English body reassures the customer the order isn't cancelled", () => {
    const body = renderPaymentFailed('ORD-26-2004-00011', 'en');
    expect(body).toContain('ORD-26-2004-00011');
    expect(body).toContain("isn't cancelled");
    expect(body).toContain('Print By Falcon');
  });
});

describe('renderB2bPendingReview', () => {
  it('Arabic body names the SLA window', () => {
    const body = renderB2bPendingReview(
      { orderNumber: 'ORD-26-2004-00020', slaHours: 24 },
      'ar',
    );
    expect(body).toContain('ORD-26-2004-00020');
    expect(body).toContain('24 ساعة');
  });

  it('English body names the SLA window', () => {
    const body = renderB2bPendingReview(
      { orderNumber: 'ORD-26-2004-00021', slaHours: 12 },
      'en',
    );
    expect(body).toContain('ORD-26-2004-00021');
    expect(body).toContain('12 hours');
    expect(body).toContain('Print By Falcon');
  });
});

describe('renderB2bOrderConfirmedByRep', () => {
  it('Arabic body surfaces payment-method note + rep note', () => {
    const body = renderB2bOrderConfirmedByRep(
      {
        orderNumber: 'ORD-26-2704-00001',
        paymentMethodNote: 'PO #A12 — نت-15',
        repNote: 'سيتم التسليم الخميس',
      },
      'ar',
    );
    expect(body).toContain('ORD-26-2704-00001');
    expect(body).toContain('PO #A12');
    expect(body).toContain('نت-15');
    expect(body).toContain('سيتم التسليم الخميس');
    expect(body).toContain('برنت باي فالكون');
  });

  it('English body omits the note line when no repNote passed', () => {
    const body = renderB2bOrderConfirmedByRep(
      {
        orderNumber: 'ORD-26-2704-00002',
        paymentMethodNote: 'Bank transfer confirmed',
      },
      'en',
    );
    expect(body).toContain('ORD-26-2704-00002');
    expect(body).toContain('Bank transfer confirmed');
    expect(body).not.toContain('\n\nNote:');
    expect(body).toContain('Print By Falcon');
  });
});
