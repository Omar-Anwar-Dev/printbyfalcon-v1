/**
 * Sprint 13 — blog post data.
 *
 * Static content, bilingual. Each post lives in this file as a TypeScript
 * object so the routes stay type-safe and the build doesn't depend on an
 * MDX pipeline. When the catalog of posts grows past ~20, switch to MDX
 * files under `content/blog/` + a build-time loader.
 *
 * Editorial guidance: each post should target ONE primary keyword query
 * (e.g. "ما الفرق بين تونر متوافق وأصلي"). Use H2/H3 structure, include
 * 2-3 internal links to product/category pages, and aim for 600-1200 words.
 */

export type BlogPost = {
  slug: string;
  publishedAt: string; // ISO date
  updatedAt: string; // ISO date
  /** When true, the post is excluded from sitemap + listing (placeholder/scaffold). */
  draft?: boolean;
  ar: BlogPostLocaleContent;
  en: BlogPostLocaleContent;
};

export type BlogPostLocaleContent = {
  title: string;
  description: string; // ~150 chars meta description
  /** Optional excerpt shown on the list page; falls back to description. */
  excerpt?: string;
  /** Markdown-flavored body. Renders via the simple `BlogPostBody` component. */
  body: string;
  tags: string[];
};

export const POSTS: BlogPost[] = [
  {
    slug: 'oem-vs-compatible-toner-egypt-2026',
    publishedAt: '2026-05-03',
    updatedAt: '2026-05-03',
    ar: {
      title: 'تونر أصلي ولا متوافق؟ الدليل الكامل لاختيار التونر في 2026',
      description:
        'مقارنة عملية بين تونر الطابعات الأصلي والمتوافق: السعر، الجودة، الضمان، تأثيرها على الطابعة. إزاي تختار اللي يناسبك من Print By Falcon.',
      excerpt:
        'فرق السعر بين الأصلي والمتوافق ممكن يوصل لـ 70%. لكن الفرق ده مش دايمًا في صالحك. هنا شرح متى يكون الأصلي ضروري ومتى المتوافق هو الأذكى.',
      tags: ['أحبار', 'تونر', 'دليل', 'مقارنة', 'HP', 'Canon'],
      body: `## الفرق الجوهري في سطرين

**التونر الأصلي (OEM)** بيجي من نفس الشركة المصنّعة للطابعة (HP, Canon, Epson...). **المتوافق (Compatible)** بيجي من مصنّع تاني، بيقلّد المواصفات بسعر أقل بكتير.

كل اللي بيتغير غير ده هو: السعر، الضمان الشامل، وأحيانًا — مش دايمًا — جودة الطباعة وعمر الخرطوشة.

## فرق السعر: كام بالظبط؟

في السوق المصري حاليًا، الفرق بيتراوح بين 60-75%. مثال:

- **تونر HP 85A أصلي**: ~1,200 ج.م
- **تونر HP 85A متوافق**: ~260 ج.م

يعني للمكتب اللي بيستهلك 5 خراطيش في الشهر، الفرق السنوي ممكن يوصل **60,000 ج.م**.

## الجودة الفعلية: متى يفرق ومتى لأ؟

**المتوافق بيشتغل بكفاءة عالية على:**

- الطباعة العادية للنصوص + الجداول
- الطابعات الـ Laser المكتبية (HP LaserJet, Canon LBP, Samsung ML)
- الكميات اليومية حتى 3,000 صفحة

**الأصلي بيفرق فعلاً في:**

- الطباعة التصويرية بألوان دقيقة (للتصميم والمطبوعات الفنية)
- الطابعات الأحدث جدًا (آخر سنة) لأن الـ chip فيها بيكون أصعب على المتوافق
- لو لسه الطابعة تحت ضمان الشركة المصنعة — استخدام متوافق ممكن يلغي الضمان

## الضمان: نقطة محتاج تعرفها

غالبية مصنّعي الطابعات (خصوصًا HP و Brother) **بيلغوا ضمان الطابعة** لو اتأكدوا إنك بتستخدم تونر مش أصلي. لو الطابعة لسه في ضمان الشركة (عادة سنة من تاريخ الشراء) → فضّل الأصلي.

بعد انتهاء الضمان → المتوافق غالبًا الاختيار الأذكى اقتصاديًا.

## التوصية بالمختصر

| موقفك | اختر |
|---|---|
| طابعة تحت ضمان الشركة | **أصلي** |
| استخدام تصميم/تصوير محترف | **أصلي** |
| استخدام مكتبي (نصوص، جداول، فواتير) | **متوافق** |
| ميزانية محدودة + استخدام يومي عالي | **متوافق** |
| طابعة قديمة (5+ سنين) | **متوافق** بدون قلق |

## كيف تختار متوافق آمن؟

1. **اشتري من تاجر معروف**: من Print By Falcon لأن كل المتوافقات بنختبرها قبل ما نطرحها.
2. **اطلب الـ part number**: تأكد إن المتوافق مكتوب عليه نفس الـ part number بتاع الأصلي (مثلًا CE285A).
3. **شوف عدد الصفحات المتوقعة (page yield)**: لازم يكون قريب من الأصلي. أي اختلاف كبير = جودة أقل.

## كل التونرات المتوافقة في Print By Falcon

[تصفّح كل التونرات المتوافقة](/ar/categories/toner-cartridges) — من HP, Canon, Samsung, Brother, Epson — بأسعار جملة للشركات + ضمان جودة 100%.

محتاج مساعدة في اختيار التونر المناسب لطابعتك؟ [تواصل معنا على واتساب](https://wa.me/201116527773) — هنرشح لك الأنسب في دقائق.`,
    },
    en: {
      title: 'OEM vs Compatible Toner: The Complete 2026 Buying Guide',
      description:
        'Practical comparison of OEM and compatible printer toner: price, quality, warranty, and impact on your printer. Choose the right one with Print By Falcon.',
      excerpt:
        "The price gap between genuine and compatible toner can hit 70%. But that gap isn't always in your favor. Here's when OEM is essential and when compatible is the smarter pick.",
      tags: ['ink', 'toner', 'guide', 'comparison', 'HP', 'Canon'],
      body: `## The core difference in two sentences

**OEM (Original Equipment Manufacturer) toner** comes from the company that built your printer (HP, Canon, Epson...). **Compatible toner** comes from a third-party manufacturer that mimics the specs at a much lower price.

Everything else — price, warranty implications, and sometimes (not always) print quality and cartridge lifespan — flows from that one fact.

## Price gap: by how much?

In the Egyptian market right now, the gap runs 60–75%. Example:

- **HP 85A genuine toner**: ~1,200 EGP
- **HP 85A compatible toner**: ~260 EGP

For an office burning through 5 cartridges a month, the annual delta can hit **60,000 EGP**.

## Real-world quality: when it matters and when it doesn't

**Compatible works at high efficiency for:**

- Standard text + spreadsheet printing
- Office laser printers (HP LaserJet, Canon LBP, Samsung ML)
- Daily volumes up to ~3,000 pages

**OEM actually makes a difference for:**

- Color photography or design work where exact tone matters
- Very recent printer models (last 12 months) — chip authentication is harder for compatibles
- Printers still under manufacturer warranty — using compatible toner can void it

## Warranty: a critical detail

Most printer manufacturers (especially HP and Brother) **void your printer warranty** if they detect non-OEM toner. If the printer is still under warranty (typically 1 year from purchase), go OEM.

Once the warranty expires, compatible is usually the smart economic move.

## Quick recommendation

| Your situation | Pick |
|---|---|
| Printer under manufacturer warranty | **OEM** |
| Professional design/photo printing | **OEM** |
| Office work (text, tables, invoices) | **Compatible** |
| Tight budget + high daily volume | **Compatible** |
| Older printer (5+ years) | **Compatible** without hesitation |

## How to pick a safe compatible

1. **Buy from a trusted retailer**: at Print By Falcon, every compatible we list is tested before we sell it.
2. **Match the part number**: confirm the compatible has the same part number as the OEM (e.g. CE285A).
3. **Check expected page yield**: it should be close to OEM. A big gap signals lower quality.

## All compatible toners at Print By Falcon

[Browse all compatible toners](/en/categories/toner-cartridges) — HP, Canon, Samsung, Brother, Epson — wholesale pricing for businesses, 100% quality guarantee.

Need help picking the right toner for your printer? [Reach us on WhatsApp](https://wa.me/201116527773) — we'll recommend the best fit in minutes.`,
    },
  },
];

/**
 * Public listing — drafts excluded.
 */
export function listPublishedPosts(): BlogPost[] {
  return POSTS.filter((p) => !p.draft).sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  const post = POSTS.find((p) => p.slug === slug);
  if (!post || post.draft) return undefined;
  return post;
}
