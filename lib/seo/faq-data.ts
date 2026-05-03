/**
 * Sprint 13 — bilingual FAQ data, mirrored from `docs/faq.md`.
 *
 * Both the rendered `/faq` page AND the FAQPage schema markup read from this
 * single source so the schema can't drift from the page content (which would
 * trigger a Google Search Console warning).
 *
 * Each item has parallel `ar` / `en` strings — the page renders both side-by-side
 * for cross-locale users, and the schema emits the locale-matching version.
 */

export type FaqCategoryKey =
  | 'orderingPayment'
  | 'accountSignup'
  | 'deliveryTracking'
  | 'cancellationReturns'
  | 'business';

export type FaqEntry = {
  category: FaqCategoryKey;
  question: { ar: string; en: string };
  answer: { ar: string; en: string };
};

export const FAQ_CATEGORIES: Record<
  FaqCategoryKey,
  { ar: string; en: string }
> = {
  orderingPayment: {
    ar: 'الطلب والدفع',
    en: 'Ordering and Payment',
  },
  accountSignup: {
    ar: 'التسجيل والحسابات',
    en: 'Account and Sign-up',
  },
  deliveryTracking: {
    ar: 'التوصيل والتتبّع',
    en: 'Delivery and Tracking',
  },
  cancellationReturns: {
    ar: 'الإلغاء والاسترجاع',
    en: 'Cancellation and Returns',
  },
  business: {
    ar: 'حسابات الشركات (B2B)',
    en: 'Business Accounts (B2B)',
  },
};

export const FAQ_ITEMS: FaqEntry[] = [
  // Ordering + Payment
  {
    category: 'orderingPayment',
    question: {
      ar: 'كيف أعرف إذا كان المنتج متوفرًا؟',
      en: 'How do I know a product is in stock?',
    },
    answer: {
      ar: 'كل صفحة منتج تعرض الحالة الفعلية: "متوفر"، "الكمية محدودة"، أو "غير متوفر". نُحدّث المخزون لحظة بلحظة.',
      en: 'Every product page shows a real-time status: In Stock / Low Stock / Out of Stock. Inventory is updated instantly.',
    },
  },
  {
    category: 'orderingPayment',
    question: {
      ar: 'ما طرق الدفع المتاحة؟',
      en: 'What payment methods do you accept?',
    },
    answer: {
      ar: 'الدفع نقدًا عند الاستلام (حسب منطقة التوصيل). بطاقات الدفع وفوري/أمان عبر Paymob ستتاح قريبًا فور انتهاء اعتماد التاجر.',
      en: 'Cash on delivery (depends on your delivery zone). Card and Fawry/Aman payments via Paymob will be available shortly once merchant approval lands.',
    },
  },
  {
    category: 'orderingPayment',
    question: {
      ar: 'كم رسوم الشحن؟',
      en: 'How much is shipping?',
    },
    answer: {
      ar: 'الرسوم تعتمد على منطقة التوصيل — القاهرة الكبرى، الإسكندرية والدلتا، القناة والسويس، صعيد مصر، سيناء والأماكن النائية. تظهر التكلفة الإجمالية قبل تأكيد الطلب.',
      en: 'Rates depend on your delivery zone — Greater Cairo, Alexandria+Delta, Canal+Suez, Upper Egypt, Sinai+Remote. The total cost appears before you confirm your order.',
    },
  },
  {
    category: 'orderingPayment',
    question: {
      ar: 'هل هناك شحن مجاني؟',
      en: 'Is there free shipping?',
    },
    answer: {
      ar: 'نعم — تعرض صفحة السلة والدفع الحد الأدنى للطلب الذي يؤهلك للشحن المجاني في منطقتك.',
      en: 'Yes — the cart and checkout page show the minimum order amount that qualifies for free shipping in your zone.',
    },
  },

  // Account + Sign-up
  {
    category: 'accountSignup',
    question: {
      ar: 'كيف أسجّل حسابًا؟',
      en: 'How do I create an account?',
    },
    answer: {
      ar: 'أدخل رقم هاتفك، نرسل لك رمزًا عبر واتساب — أدخل الرمز وينشأ حسابك. لا حاجة لكلمة مرور.',
      en: 'Enter your phone number, we send you a code via WhatsApp — enter the code, and your account is created. No password needed.',
    },
  },
  {
    category: 'accountSignup',
    question: {
      ar: 'ماذا لو لم يصلني الرمز؟',
      en: "What if I don't receive the code?",
    },
    answer: {
      ar: 'تحقق أن الرقم صحيح. إذا استمرت المشكلة، راسلنا عبر واتساب (زر "تواصل معنا" في أسفل الصفحة).',
      en: 'Double-check your phone number. If the issue persists, contact us via WhatsApp (the "Chat with us" button at the bottom of any page).',
    },
  },
  {
    category: 'accountSignup',
    question: {
      ar: 'هل يمكنني الشراء دون تسجيل؟',
      en: 'Can I order without signing up?',
    },
    answer: {
      ar: 'نعم — يمكنك إتمام الطلب كضيف. بعد الطلب سنعرض عليك حفظ طلبك وإنشاء حساب باستخدام رقم الهاتف الذي أدخلته.',
      en: "Yes — guest checkout works. After placing an order, we'll offer to save it and create an account for you using the phone you entered.",
    },
  },

  // Delivery + Tracking
  {
    category: 'deliveryTracking',
    question: {
      ar: 'كم يستغرق التوصيل؟',
      en: 'How long does delivery take?',
    },
    answer: {
      ar: 'عادة بين يوم و5 أيام عمل حسب منطقتك. الوقت المتوقّع يظهر على صفحة تأكيد الطلب.',
      en: 'Usually 1–5 business days depending on your zone. The expected date appears on your order confirmation page.',
    },
  },
  {
    category: 'deliveryTracking',
    question: {
      ar: 'كيف أتابع طلبي؟',
      en: 'How do I track my order?',
    },
    answer: {
      ar: 'من صفحة "حسابي" ← "طلباتي"، ستجد حالة الطلب مع خط الزمن. كما نرسل تحديثات واتساب عند كل تغيير.',
      en: "From your Account → My Orders, you'll see the status timeline. We also send WhatsApp updates at every status change.",
    },
  },
  {
    category: 'deliveryTracking',
    question: {
      ar: 'كيف أتواصل مع مندوب الشحن؟',
      en: 'How do I reach the courier?',
    },
    answer: {
      ar: 'بمجرد تسليم طلبك لشركة الشحن، تظهر بيانات المندوب ورقمه على صفحة تفاصيل الطلب.',
      en: 'Once your order is handed to the courier, their name and phone number appear on the order detail page.',
    },
  },

  // Cancellation + Returns
  {
    category: 'cancellationReturns',
    question: {
      ar: 'هل يمكنني إلغاء طلبي؟',
      en: 'Can I cancel my order?',
    },
    answer: {
      ar: 'نعم، قبل تسليمه لشركة الشحن. من صفحة تفاصيل الطلب اضغط "طلب إلغاء" مع ذكر السبب. سنردّ خلال ساعات قليلة.',
      en: 'Yes, before it\'s handed to the courier. From the order detail page, click "Request cancellation" and note a reason. We respond within a few hours.',
    },
  },
  {
    category: 'cancellationReturns',
    question: {
      ar: 'هل يمكنني إرجاع المنتج؟',
      en: 'Can I return a product?',
    },
    answer: {
      ar: 'نعم خلال 14 يومًا من الاستلام، بشرط أن يكون المنتج بحالته الأصلية في عبوته الأصلية. راسلنا عبر واتساب لبدء الإجراء.',
      en: "Yes, within 14 days of receipt, provided it's in original condition and packaging. Message us on WhatsApp to start the process.",
    },
  },
  {
    category: 'cancellationReturns',
    question: {
      ar: 'متى يُرد المبلغ؟',
      en: 'When do I get my refund?',
    },
    answer: {
      ar: 'خلال 14 يوم عمل من استلامنا للمنتج المرتجع، يُرد المبلغ بنفس طريقة الدفع الأصلية.',
      en: 'Within 14 business days of us receiving the returned product, refunded via the original payment method.',
    },
  },

  // Business (B2B)
  {
    category: 'business',
    question: {
      ar: 'كيف أسجّل حساب شركة؟',
      en: 'How do I open a business account?',
    },
    answer: {
      ar: 'من صفحة "تسجيل حساب شركة" أدخل: اسم الشركة، رقم السجل التجاري، رقم البطاقة الضريبية، بيانات التواصل. نراجع الطلب خلال 24 ساعة ونفعّل الحساب بأسعار التاجر.',
      en: 'From "Register a Business", enter: company name, commercial registry number, tax card number, contact info. We review within 24 hours and activate your account with wholesale pricing.',
    },
  },
  {
    category: 'business',
    question: {
      ar: 'كيف أرى الأسعار الخاصة بي؟',
      en: 'How do I see my negotiated prices?',
    },
    answer: {
      ar: 'بعد تسجيل الدخول، تظهر أسعارك التفاوضية في كل الكتالوج + سلة التسوّق + الفاتورة.',
      en: 'After signing in, your negotiated prices show throughout the catalog, cart, and invoice.',
    },
  },
  {
    category: 'business',
    question: {
      ar: 'هل يمكنني طلب كميات كبيرة بطريقة أسرع؟',
      en: 'Can I bulk-order faster?',
    },
    answer: {
      ar: 'نعم — صفحة "طلب جماعي" تسمح بإدخال عدة SKUs والكميات دفعة واحدة، مع تحقّق لحظي من المخزون والسعر.',
      en: 'Yes — the Bulk Order page lets you enter multiple SKUs and quantities at once, with live stock + price lookup per row.',
    },
  },
  {
    category: 'business',
    question: {
      ar: 'ما خيارات الدفع لشركتي؟',
      en: 'What payment options do business accounts have?',
    },
    answer: {
      ar: 'خياران: "الدفع الآن" بالبطاقة أو عند الاستلام، أو "تقديم الطلب للمراجعة" حيث يتواصل معك مندوب المبيعات لتحديد أحكام الدفع.',
      en: 'Two: "Pay Now" (card or COD), or "Submit for Review" where our sales rep contacts you to agree on payment terms.',
    },
  },
  {
    category: 'business',
    question: {
      ar: 'كيف أطلب الطلب الماضي مرة أخرى؟',
      en: 'How do I reorder a previous order?',
    },
    answer: {
      ar: 'من "طلباتي" ← الطلب السابق ← "إعادة الطلب". يُنشأ في السلة مباشرة بأسعارك الحالية.',
      en: 'From My Orders → past order → "Reorder". It populates your cart at current prices.',
    },
  },
];
