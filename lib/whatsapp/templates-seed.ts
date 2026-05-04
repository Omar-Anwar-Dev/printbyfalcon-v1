/**
 * Sprint 15 — default WhatsApp message templates.
 *
 * Seeded into the `WhatsappTemplate` table on every boot via post-push.ts
 * (idempotent upsert by key — owner edits aren't overwritten because we use
 * `update: {}` to skip existing rows entirely on re-seed).
 *
 * **Authoring guide:**
 * - Tone: friendly + respectful (Egyptian colloquial AR; clear professional EN).
 * - Substitution syntax: `{{variableName}}` (Mustache-like).
 * - Optional variables: design lines so an empty value still reads naturally
 *   (the renderer collapses 3+ consecutive newlines to 2 for clean output).
 * - Light emoji use OK — Egyptian customers respond well; don't overdo it.
 *
 * **Owner-editing posture (per ADR-067):**
 * - These are the *defaults* shipped with the build.
 * - Owner edits via /admin/settings/whatsapp-templates → DB row updated.
 * - On every boot, post-push.ts skips already-seeded keys (idempotent).
 * - "Reset to default" admin action overwrites the DB row from this seed.
 *
 * **Excluded by design (auth-critical):**
 * - OTP templates → stay in `lib/whatsapp-templates.ts::renderOtp` (hardcoded).
 *   Owner cannot break login by misediting OTP wording.
 * - STOP/UNSUBSCRIBE detection → in `lib/notifications/opt-out.ts` (regex; not
 *   a template).
 */

import type { WhatsappTemplateCategory } from '@prisma/client';

export type TemplateVariable = {
  /** Placeholder name as it appears in the body, e.g. "orderNumber" → `{{orderNumber}}`. */
  name: string;
  descriptionAr: string;
  descriptionEn: string;
  example: string;
};

export type DefaultTemplate = {
  key: string;
  category: WhatsappTemplateCategory;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  bodyAr: string;
  bodyEn: string;
  variables: TemplateVariable[];
};

export const DEFAULT_WHATSAPP_TEMPLATES: DefaultTemplate[] = [
  // ─────────────────────────────────────────────────────────────────────
  // 1. Order confirmed (B2C)
  // ─────────────────────────────────────────────────────────────────────
  {
    key: 'order.confirmed.b2c',
    category: 'ORDER',
    nameAr: 'تأكيد طلب أفراد',
    nameEn: 'Order confirmed (individual)',
    descriptionAr: 'يتم إرساله للعميل فور تأكيد طلبه (B2C).',
    descriptionEn: 'Sent to the customer when their B2C order is confirmed.',
    bodyAr: `أهلاً {{customerName}} 👋

تم استلام طلبك بنجاح وجاري تجهيزه.

📋 رقم الطلب: {{orderNumber}}
💳 طريقة الدفع: {{paymentMethod}}
💰 الإجمالي: {{total}} ج.م

هنبعتلك تحديث لما الطلب يتسلّم لشركة الشحن. لو محتاج تواصل سريع، رد على الرسالة دي 💙

برينت باي فالكون`,
    bodyEn: `Hi {{customerName}} 👋

Your order has been received and is now being prepared.

📋 Order: {{orderNumber}}
💳 Payment: {{paymentMethod}}
💰 Total: {{total}} EGP

We'll send you an update once it's handed to the courier. Need to reach us? Just reply 💙

Print By Falcon`,
    variables: [
      {
        name: 'customerName',
        descriptionAr: 'اسم العميل',
        descriptionEn: 'Customer name',
        example: 'أحمد',
      },
      {
        name: 'orderNumber',
        descriptionAr: 'رقم الطلب',
        descriptionEn: 'Order number',
        example: 'ORD-26-0503-00012',
      },
      {
        name: 'paymentMethod',
        descriptionAr: 'طريقة الدفع (نص قابل للقراءة)',
        descriptionEn: 'Payment method (human-readable)',
        example: 'الدفع عند الاستلام',
      },
      {
        name: 'total',
        descriptionAr: 'الإجمالي بالجنيه',
        descriptionEn: 'Total in EGP',
        example: '1,250',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 2. Order confirmed (B2B)
  // ─────────────────────────────────────────────────────────────────────
  {
    key: 'order.confirmed.b2b',
    category: 'B2B',
    nameAr: 'تأكيد طلب شركات',
    nameEn: 'Order confirmed (business)',
    descriptionAr:
      'يتم إرساله لجهة الاتصال في الشركة فور تأكيد الطلب (B2B Pay Now).',
    descriptionEn:
      'Sent to the company contact when a B2B Pay Now order is confirmed.',
    bodyAr: `أهلاً فريق {{companyName}} 🏢

استلمنا طلبكم وجاري التجهيز.

📋 رقم الطلب: {{orderNumber}}
👤 مقدم الطلب: {{placedByName}}
{{poReferenceLine}}💰 الإجمالي: {{total}} ج.م

هنتواصل معاكم على كل تحديث. لأي استفسار، فريق المبيعات متاح على {{salesPhone}}

برينت باي فالكون`,
    bodyEn: `Hello {{companyName}} team 🏢

We've received your order and are preparing it now.

📋 Order: {{orderNumber}}
👤 Placed by: {{placedByName}}
{{poReferenceLine}}💰 Total: {{total}} EGP

We'll keep you posted on every update. Sales is available on {{salesPhone}} for any question.

Print By Falcon`,
    variables: [
      {
        name: 'companyName',
        descriptionAr: 'اسم الشركة',
        descriptionEn: 'Company name',
        example: 'شركة المثال للطباعة',
      },
      {
        name: 'orderNumber',
        descriptionAr: 'رقم الطلب',
        descriptionEn: 'Order number',
        example: 'ORD-26-0503-00045',
      },
      {
        name: 'placedByName',
        descriptionAr: 'اسم اللي قدّم الطلب',
        descriptionEn: 'Name of person who placed the order',
        example: 'محمد عبد الله',
      },
      {
        name: 'poReferenceLine',
        descriptionAr: 'سطر مرجع PO (يُحذف لو مش موجود)',
        descriptionEn: 'PO reference line (omit if missing)',
        example: '🧾 المرجع: PO-2026-A12\n',
      },
      {
        name: 'total',
        descriptionAr: 'الإجمالي بالجنيه',
        descriptionEn: 'Total in EGP',
        example: '15,750',
      },
      {
        name: 'salesPhone',
        descriptionAr: 'رقم فريق المبيعات',
        descriptionEn: 'Sales team phone',
        example: '+20 111 652 7773',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 3. Order handed to courier
  // ─────────────────────────────────────────────────────────────────────
  {
    key: 'order.handed_to_courier',
    category: 'ORDER',
    nameAr: 'تم تسليم الطلب لشركة الشحن',
    nameEn: 'Order handed to courier',
    descriptionAr:
      'يتم إرساله لما الـ ops يضغط "تم التسليم لشركة الشحن" على لوحة الإدارة.',
    descriptionEn: 'Sent when ops hits "Mark handed to courier" in admin.',
    bodyAr: `طلبك في طريقه إليك 🚚

📋 رقم الطلب: {{orderNumber}}
🏢 شركة الشحن: {{courierName}}
{{courierPhoneLine}}{{etaLine}}

ممكن تتابع المندوب على رقمه فوق، أو ترد علينا هنا لو محتاج حاجة 💙

برينت باي فالكون`,
    bodyEn: `Your order is on its way 🚚

📋 Order: {{orderNumber}}
🏢 Courier: {{courierName}}
{{courierPhoneLine}}{{etaLine}}

You can reach the driver on the number above, or reply here if you need anything 💙

Print By Falcon`,
    variables: [
      {
        name: 'orderNumber',
        descriptionAr: 'رقم الطلب',
        descriptionEn: 'Order number',
        example: 'ORD-26-0503-00012',
      },
      {
        name: 'courierName',
        descriptionAr: 'اسم شركة الشحن',
        descriptionEn: 'Courier name',
        example: 'بوسطة',
      },
      {
        name: 'courierPhoneLine',
        descriptionAr: 'سطر هاتف المندوب (يُحذف لو مش موجود)',
        descriptionEn: 'Driver phone line (omit if missing)',
        example: '📞 موبايل المندوب: +20 100 123 4567\n',
      },
      {
        name: 'etaLine',
        descriptionAr: 'سطر الوصول المتوقع (يُحذف لو مش موجود)',
        descriptionEn: 'ETA line (omit if missing)',
        example: '📅 الوصول المتوقع: خلال 2-3 أيام',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 4. Order delivered
  // ─────────────────────────────────────────────────────────────────────
  {
    key: 'order.delivered',
    category: 'ORDER',
    nameAr: 'تم تسليم الطلب',
    nameEn: 'Order delivered',
    descriptionAr: 'يتم إرساله بعد ما المندوب يأكد التسليم.',
    descriptionEn: 'Sent after the courier confirms delivery.',
    bodyAr: `تم التسليم بنجاح ✅

شكرًا لشرائك من برينت باي فالكون!

📋 رقم الطلب: {{orderNumber}}

لو فيه أي ملاحظة على المنتج أو الخدمة، رد علينا هنا — رأيك بيهمنا فعلاً.

ولو حابب تطلب تاني، الكتالوج كامل على printbyfalcon.com 💙`,
    bodyEn: `Delivered successfully ✅

Thanks for choosing Print By Falcon!

📋 Order: {{orderNumber}}

Any feedback on the product or service? Just reply — we genuinely care.

Want to order again? printbyfalcon.com 💙`,
    variables: [
      {
        name: 'orderNumber',
        descriptionAr: 'رقم الطلب',
        descriptionEn: 'Order number',
        example: 'ORD-26-0503-00012',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 5. Order cancelled
  // ─────────────────────────────────────────────────────────────────────
  {
    key: 'order.cancelled',
    category: 'ORDER',
    nameAr: 'تم إلغاء الطلب',
    nameEn: 'Order cancelled',
    descriptionAr:
      'يتم إرساله لما طلب يتلغي (سواء قبل التسليم أو بقرار الـ ops).',
    descriptionEn:
      'Sent when an order is cancelled (pre-delivery or by ops decision).',
    bodyAr: `تم إلغاء طلبك ❌

📋 رقم الطلب: {{orderNumber}}
{{reasonLine}}{{refundNoteLine}}

نعتذر عن أي إزعاج. لو احتجت توضيح أو ساعدناك بحاجة تانية، رد علينا هنا.

برينت باي فالكون`,
    bodyEn: `Your order has been cancelled ❌

📋 Order: {{orderNumber}}
{{reasonLine}}{{refundNoteLine}}

We apologise for any inconvenience. If you need clarification or help with something else, just reply.

Print By Falcon`,
    variables: [
      {
        name: 'orderNumber',
        descriptionAr: 'رقم الطلب',
        descriptionEn: 'Order number',
        example: 'ORD-26-0503-00012',
      },
      {
        name: 'reasonLine',
        descriptionAr: 'سطر السبب (يُحذف لو مش موجود)',
        descriptionEn: 'Reason line (omit if missing)',
        example: '📝 السبب: نفاد المخزون من أحد المنتجات\n',
      },
      {
        name: 'refundNoteLine',
        descriptionAr: 'سطر ملاحظة الاسترداد (يُحذف لو مش موجود)',
        descriptionEn: 'Refund note line (omit if missing)',
        example: '💳 تم إصدار استرداد كامل خلال 14 يوم عمل.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 6. B2B pending review
  // ─────────────────────────────────────────────────────────────────────
  {
    key: 'b2b.pending_review',
    category: 'B2B',
    nameAr: 'طلب B2B بانتظار المراجعة',
    nameEn: 'B2B order pending review',
    descriptionAr:
      'يتم إرساله لجهة اتصال الشركة فور تقديم طلب "إرسال للمراجعة".',
    descriptionEn:
      'Sent to the company contact after they submit a "Submit for Review" order.',
    bodyAr: `استلمنا طلب المراجعة 📋

🏢 العميل: {{companyName}}
📋 رقم الطلب: {{orderNumber}}
💰 الإجمالي: {{total}} ج.م

فريق المبيعات هيراجع التفاصيل ويتواصل معكم خلال {{slaHours}} ساعة لتأكيد الطلب وتحديد طريقة الدفع.

برينت باي فالكون`,
    bodyEn: `Review request received 📋

🏢 Company: {{companyName}}
📋 Order: {{orderNumber}}
💰 Total: {{total}} EGP

Our sales team will review the details and reach out within {{slaHours}} hours to confirm the order and payment terms.

Print By Falcon`,
    variables: [
      {
        name: 'companyName',
        descriptionAr: 'اسم الشركة',
        descriptionEn: 'Company name',
        example: 'شركة المثال للطباعة',
      },
      {
        name: 'orderNumber',
        descriptionAr: 'رقم الطلب',
        descriptionEn: 'Order number',
        example: 'ORD-26-0503-00045',
      },
      {
        name: 'total',
        descriptionAr: 'الإجمالي بالجنيه',
        descriptionEn: 'Total in EGP',
        example: '15,750',
      },
      {
        name: 'slaHours',
        descriptionAr: 'وقت الرد المتعهَّد به (ساعات)',
        descriptionEn: 'Promised response time (hours)',
        example: '24',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 7. B2B order confirmed by sales rep
  // ─────────────────────────────────────────────────────────────────────
  {
    key: 'b2b.confirmed',
    category: 'B2B',
    nameAr: 'تأكيد طلب B2B من المبيعات',
    nameEn: 'B2B order confirmed by sales',
    descriptionAr: 'يتم إرساله لما الـ sales rep يؤكد طلب "Submit for Review".',
    descriptionEn:
      'Sent when the sales rep confirms a Submit-for-Review order.',
    bodyAr: `تم تأكيد طلبكم ✅

📋 رقم الطلب: {{orderNumber}}
💳 الدفع / الشروط: {{paymentTerms}}
{{repNoteLine}}

هنتواصل معاكم على كل تحديث للحالة. شكرًا لثقتكم في برينت باي فالكون 💙`,
    bodyEn: `Your order is confirmed ✅

📋 Order: {{orderNumber}}
💳 Payment / terms: {{paymentTerms}}
{{repNoteLine}}

We'll keep you updated at every status change. Thank you for trusting Print By Falcon 💙`,
    variables: [
      {
        name: 'orderNumber',
        descriptionAr: 'رقم الطلب',
        descriptionEn: 'Order number',
        example: 'ORD-26-0503-00045',
      },
      {
        name: 'paymentTerms',
        descriptionAr: 'طريقة الدفع / الشروط (نص حر)',
        descriptionEn: 'Payment / terms (free text)',
        example: 'تحويل بنكي — Net 15',
      },
      {
        name: 'repNoteLine',
        descriptionAr: 'سطر ملاحظة المندوب (يُحذف لو مش موجود)',
        descriptionEn: 'Rep note line (omit if missing)',
        example: '\n📝 ملاحظة: تم تطبيق خصم 5% للكمية',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 8. Return received
  // ─────────────────────────────────────────────────────────────────────
  {
    key: 'return.received',
    category: 'RETURN',
    nameAr: 'استلام طلب الإرجاع',
    nameEn: 'Return received',
    descriptionAr: 'يتم إرساله للعميل لما الـ ops يسجل إرجاع.',
    descriptionEn: 'Sent to the customer when ops logs a return.',
    bodyAr: `استلمنا طلب الإرجاع 📦

📋 رقم الطلب الأصلي: {{orderNumber}}
📦 رقم الإرجاع: {{returnNumber}}

هنراجع المنتج خلال 1-3 أيام عمل ونرد عليك بقرار الاسترداد. الاسترداد بيتم خلال 14 يوم عمل بعد الموافقة بنفس طريقة الدفع الأصلية.

برينت باي فالكون`,
    bodyEn: `Return request received 📦

📋 Original order: {{orderNumber}}
📦 Return ID: {{returnNumber}}

We'll inspect the product within 1-3 business days and respond with our refund decision. Approved refunds are processed within 14 business days via the original payment method.

Print By Falcon`,
    variables: [
      {
        name: 'orderNumber',
        descriptionAr: 'رقم الطلب الأصلي',
        descriptionEn: 'Original order number',
        example: 'ORD-26-0503-00012',
      },
      {
        name: 'returnNumber',
        descriptionAr: 'رقم الإرجاع',
        descriptionEn: 'Return number',
        example: 'RET-26-0510-00003',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 9. Promo code (manual / campaign)
  // ─────────────────────────────────────────────────────────────────────
  {
    key: 'promo.applied',
    category: 'PROMO',
    nameAr: 'كود خصم خاص',
    nameEn: 'Special promo code',
    descriptionAr:
      'تيمبلت يدوي للحملات — يُستخدم بإرسال جماعي أو فردي للعملاء المختارين.',
    descriptionEn:
      'Manual campaign template — sent in bulk or individually to selected customers.',
    bodyAr: `🎉 خصم خاص ليك!

استخدم الكود: {{promoCode}}
💰 الخصم: {{discountValue}}
📅 صالح لحد: {{expiryDate}}

تسوّق دلوقتي على printbyfalcon.com وادخل الكود في خانة "كود الخصم" عند الدفع.

برينت باي فالكون`,
    bodyEn: `🎉 Special discount for you!

Use code: {{promoCode}}
💰 Save: {{discountValue}}
📅 Valid until: {{expiryDate}}

Shop now at printbyfalcon.com and enter the code in the "Promo Code" field at checkout.

Print By Falcon`,
    variables: [
      {
        name: 'promoCode',
        descriptionAr: 'كود الخصم',
        descriptionEn: 'Promo code',
        example: 'WELCOME10',
      },
      {
        name: 'discountValue',
        descriptionAr: 'قيمة الخصم (نص حر)',
        descriptionEn: 'Discount value (free text)',
        example: '10% خصم',
      },
      {
        name: 'expiryDate',
        descriptionAr: 'تاريخ انتهاء الصلاحية',
        descriptionEn: 'Expiry date',
        example: '31 ديسمبر 2026',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 10. Support greeting (auto-reply / saved)
  // ─────────────────────────────────────────────────────────────────────
  {
    key: 'support.greeting',
    category: 'SUPPORT',
    nameAr: 'ترحيب بالدعم',
    nameEn: 'Support greeting',
    descriptionAr: 'تيمبلت ترحيبي — يُستخدم كرد سريع لما عميل يبعت رسالة دعم.',
    descriptionEn:
      'Greeting template — used as a quick reply when a customer messages support.',
    bodyAr: `أهلاً وسهلاً 👋

شكرًا إنك تواصلت مع برينت باي فالكون. فريقنا هيرد عليك خلال أقل من ساعة في أوقات العمل (السبت-الخميس، 9 ص - 9 م).

لو السؤال عن طلب موجود، احفظ رقم الطلب جاهز عشان نقدر نساعدك أسرع 💙`,
    bodyEn: `Welcome 👋

Thanks for reaching out to Print By Falcon. Our team will respond within an hour during business hours (Sat-Thu, 9 AM - 9 PM).

If your question is about an existing order, please have the order number ready so we can help faster 💙`,
    variables: [],
  },
];
