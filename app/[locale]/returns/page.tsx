import { getLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/lib/i18n/routing';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'سياسة الاسترجاع والاستبدال' : 'Return & Refund Policy',
    description: isAr
      ? 'سياسة استرجاع واسترداد المنتجات في برينت باي فالكون — نافذة 14 يومًا، شروط القبول، طريقة استرداد المبلغ، والحالات غير المقبولة.'
      : 'Print By Falcon return and refund policy — 14-day return window, eligibility, refund methods, and non-returnable items.',
    robots: { index: true, follow: true },
  };
}

export default async function ReturnsPage() {
  const locale = await getLocale();
  return locale === 'ar' ? <ReturnsArabic /> : <ReturnsEnglish />;
}

function ReturnsArabic() {
  return (
    <main
      className="container-page prose prose-neutral max-w-none py-12 text-right"
      dir="rtl"
    >
      <h1>سياسة الاسترجاع والاستبدال</h1>
      <p className="text-sm text-muted-foreground">آخر تحديث: 30 أبريل 2026</p>

      <h2>1. نظرة عامة</h2>
      <p>
        نحن في <strong>برينت باي فالكون</strong> نضمن جودة كل منتج نبيعه. لو
        وصلك منتج ما يطابقش وصفه أو فيه عيب، أو غيّرت رأيك خلال 14 يوم من
        الاستلام، يحق لك إرجاعه واسترداد المبلغ بالكامل وفقًا للشروط الموضحة
        أدناه. هذه السياسة تتوافق مع قانون حماية المستهلك المصري رقم 181 لسنة
        2018.
      </p>

      <h2>2. نافذة الاسترجاع</h2>
      <ul>
        <li>
          <strong>14 يوم تقويمي</strong> من تاريخ استلامك للطلب — تبدأ من اليوم
          التالي للتسليم.
        </li>
        <li>
          الطلب نفسه لازم يتقدّم خلال هذه المدة. لو وصلنا الطلب بعد انقضاء المدة
          لن نقدر نقبله.
        </li>
        <li>
          لو طلبت إلغاء الطلب <em>قبل</em> تسليمه لشركة الشحن، نلغيه فورًا بدون
          أي رسوم.
        </li>
      </ul>

      <h2>3. شروط قبول الإرجاع</h2>
      <p>للقبول، لازم المنتج يكون:</p>
      <ul>
        <li>في عبوته الأصلية مع كل الملصقات والإكسسوارات.</li>
        <li>غير مستخدم وفي نفس الحالة اللي وصلك فيها.</li>
        <li>
          متضمنًا فاتورة الشراء أو رقم الطلب (<code>ORD-XX-XXXX-XXXXX</code>).
        </li>
      </ul>

      <h2>4. منتجات غير قابلة للاسترجاع</h2>
      <p>لأسباب صحية أو تشغيلية، لا نقبل إرجاع:</p>
      <ul>
        <li>
          <strong>خراطيش الحبر والتونر بعد فتح العبوة</strong> أو تركيبها في
          الطابعة.
        </li>
        <li>
          <strong>الطابعات اللي تمّ تشغيلها</strong> وانقضت عليها فترة الضمان
          الأولى من المصنع (إلا في حالة العيب الصناعي).
        </li>
        <li>
          المنتجات المخصّصة (Custom-printed) أو المطلوبة بمواصفات خاصة على طلبك.
        </li>
        <li>الورق المُفتوح أو التالف بعد الاستلام.</li>
        <li>الإكسسوارات الاستهلاكية اللي ظهر عليها أثر استخدام.</li>
      </ul>

      <h2>5. الحالات اللي نتحمّل فيها رسوم الإرجاع</h2>
      <ul>
        <li>
          <strong>وصل المنتج معطوبًا أو مختلفًا عن المطلوب:</strong> نتحمّل نحن
          مصاريف الشحن المرتجع بالكامل.
        </li>
        <li>
          <strong>غيّرت رأيك (لا يوجد عيب):</strong> تتحمّل أنت مصاريف الشحن
          المرتجع، وتُخصم من قيمة الاسترداد.
        </li>
      </ul>

      <h2>6. خطوات تقديم طلب الإرجاع</h2>
      <ol>
        <li>
          راسلنا على واتساب{' '}
          <a href="https://wa.me/201116527773" className="num">
            +20 111 652 7773
          </a>{' '}
          أو على{' '}
          <a href="mailto:support@printbyfalcon.com">
            support@printbyfalcon.com
          </a>{' '}
          مع رقم الطلب وسبب الإرجاع وصورة للمنتج (لو فيه عيب ظاهر).
        </li>
        <li>
          فريق الدعم هيراجع الطلب خلال يوم عمل واحد ويبعتلك تأكيد القبول مع
          تعليمات الشحن.
        </li>
        <li>
          غلِّف المنتج في عبوته الأصلية، وأرسله مع شركة الشحن المتفق عليها.
        </li>
        <li>
          فور استلامنا للمنتج وفحصه (خلال 3 أيام عمل)، نُصدر قرار قبول أو رفض
          الإرجاع، ونرسلك إخطارًا.
        </li>
      </ol>

      <h2>7. طريقة استرداد المبلغ</h2>
      <ul>
        <li>
          <strong>طلبات البطاقة (Paymob):</strong> يُرد المبلغ على نفس البطاقة
          خلال 7–14 يوم عمل من تاريخ القبول. المدة تتحدد حسب البنك المُصدِر.
        </li>
        <li>
          <strong>طلبات فوري/أمان (Paymob):</strong> يُرد المبلغ على محفظة
          إلكترونية أو بحوالة بنكية على رقم حساب تزوّدنا به. المدة 7–10 أيام
          عمل.
        </li>
        <li>
          <strong>طلبات الدفع عند الاستلام (COD):</strong> يُرد المبلغ نقدًا عبر
          مندوب الشحن أو بحوالة بنكية حسب اختيارك. المدة 5–7 أيام عمل.
        </li>
        <li>
          رسوم الشحن الأصلية لا تُسترَد إلا في حالة عيب صناعي أو خطأ منّا.
        </li>
      </ul>

      <h2>8. الاستبدال</h2>
      <p>
        لو طلبت استبدال منتج بدلاً من الإرجاع (مثلاً مقاس مختلف أو موديل بديل)،
        نُجريه بنفس الشروط، مع تسوية فرق السعر (دفع أو رد) قبل إرسال المنتج
        البديل.
      </p>

      <h2>9. الضمان (مستقل عن الإرجاع)</h2>
      <p>
        ضمان الشركة المصنّعة ينطبق على الطابعات والمنتجات الأصلية حتى بعد انقضاء
        نافذة الاسترجاع 14 يوم. لو ظهرت مشكلة تخصّ ضمان المصنّع، راسلنا وهنوصّلك
        بالخدمة المعتمدة للماركة. تفاصيل الضمان مذكورة على صفحة كل منتج.
      </p>

      <h2>10. التواصل</h2>
      <p>لأي استفسار بشأن الإرجاع أو الاسترداد:</p>
      <ul>
        <li>
          واتساب:{' '}
          <a href="https://wa.me/201116527773" className="num">
            +20 111 652 7773
          </a>
        </li>
        <li>
          بريد إلكتروني:{' '}
          <a href="mailto:support@printbyfalcon.com">
            support@printbyfalcon.com
          </a>
        </li>
        <li>
          العنوان: 12 محمد صدقي باشا، باب اللوق، القاهرة، جمهورية مصر العربية
        </li>
      </ul>
      <p>
        للاطلاع على{' '}
        <Link href="/shipping" className="underline">
          سياسة الشحن
        </Link>
        ،{' '}
        <Link href="/terms" className="underline">
          شروط الاستخدام
        </Link>
        ، أو{' '}
        <Link href="/privacy" className="underline">
          سياسة الخصوصية
        </Link>
        .
      </p>
    </main>
  );
}

function ReturnsEnglish() {
  return (
    <main className="container-page prose prose-neutral max-w-none py-12">
      <h1>Return & Refund Policy</h1>
      <p className="text-sm text-muted-foreground">
        Last updated: 30 April 2026
      </p>

      <h2>1. Overview</h2>
      <p>
        At <strong>Print By Falcon</strong>, we stand behind every product we
        sell. If your order arrives faulty or differs from the listing, or if
        you simply change your mind within 14 days of receipt, you can return it
        for a full refund per the terms below. This policy is aligned with
        Egyptian Consumer Protection Law 181 of 2018.
      </p>

      <h2>2. Return Window</h2>
      <ul>
        <li>
          <strong>14 calendar days</strong> from the date you received the order
          — counted from the day after delivery.
        </li>
        <li>
          The return request must be submitted within that window. Items
          received past the window cannot be accepted.
        </li>
        <li>
          If you cancel <em>before</em> the order is handed to the courier, we
          cancel it immediately at no charge.
        </li>
      </ul>

      <h2>3. Eligibility</h2>
      <p>To qualify for a return, the item must be:</p>
      <ul>
        <li>In its original packaging with all labels and accessories.</li>
        <li>Unused and in the same condition you received it.</li>
        <li>
          Accompanied by the original invoice or order number (
          <code>ORD-XX-XXXX-XXXXX</code>).
        </li>
      </ul>

      <h2>4. Non-returnable Items</h2>
      <p>For health and operational reasons, we cannot accept returns of:</p>
      <ul>
        <li>
          <strong>Ink and toner cartridges after the seal is broken</strong> or
          installed in a printer.
        </li>
        <li>
          <strong>Printers that have been operated</strong> past the
          manufacturer&rsquo;s first warranty period (except for manufacturing
          defects).
        </li>
        <li>
          Custom-printed items or products made to your specific specifications.
        </li>
        <li>Paper that has been opened or damaged after delivery.</li>
        <li>Consumable accessories that show signs of use.</li>
      </ul>

      <h2>5. Who Pays Return Shipping</h2>
      <ul>
        <li>
          <strong>Damaged on arrival or wrong item shipped:</strong> we cover
          return shipping in full.
        </li>
        <li>
          <strong>Change of mind (no defect):</strong> you cover return
          shipping, and the cost is deducted from the refund.
        </li>
      </ul>

      <h2>6. How to Request a Return</h2>
      <ol>
        <li>
          Message us on WhatsApp{' '}
          <a href="https://wa.me/201116527773" className="num">
            +20 111 652 7773
          </a>{' '}
          or email{' '}
          <a href="mailto:support@printbyfalcon.com">
            support@printbyfalcon.com
          </a>{' '}
          with the order number, reason, and a photo of the item (if a defect is
          visible).
        </li>
        <li>
          Our support team reviews within one business day and replies with
          confirmation and shipping instructions.
        </li>
        <li>
          Pack the item in its original packaging and send it via the agreed
          courier.
        </li>
        <li>
          Once we receive and inspect the item (within 3 business days), we
          issue an accept/reject decision and notify you.
        </li>
      </ol>

      <h2>7. Refund Method</h2>
      <ul>
        <li>
          <strong>Card orders (Paymob):</strong> refund issued back to the
          original card within 7–14 business days of acceptance. Bank-side
          processing time varies.
        </li>
        <li>
          <strong>Fawry / Aman orders (Paymob):</strong> refunded to a digital
          wallet or via bank transfer to an account you provide. Processing
          time: 7–10 business days.
        </li>
        <li>
          <strong>Cash on Delivery (COD) orders:</strong> refunded in cash via
          the courier or by bank transfer per your preference. Processing time:
          5–7 business days.
        </li>
        <li>
          Original shipping fees are non-refundable except for manufacturing
          defects or our own error.
        </li>
      </ul>

      <h2>8. Exchanges</h2>
      <p>
        If you want to exchange an item rather than return it (e.g. a different
        size or alternative model), we process it under the same terms, with any
        price difference settled (paid or refunded) before the replacement is
        shipped.
      </p>

      <h2>9. Manufacturer Warranty (independent of returns)</h2>
      <p>
        The manufacturer&rsquo;s warranty applies to genuine printers and
        supplies even after the 14-day return window closes. If a manufacturer
        warranty issue arises, message us and we&rsquo;ll route you to the
        brand&rsquo;s authorised service. Warranty details are listed on each
        product page.
      </p>

      <h2>10. Contact</h2>
      <p>For any return or refund question:</p>
      <ul>
        <li>
          WhatsApp:{' '}
          <a href="https://wa.me/201116527773" className="num">
            +20 111 652 7773
          </a>
        </li>
        <li>
          Email:{' '}
          <a href="mailto:support@printbyfalcon.com">
            support@printbyfalcon.com
          </a>
        </li>
        <li>
          Address: 12 Mohamed Sedky Pasha, Bab Al-Louk, Cairo, Arab Republic of
          Egypt
        </li>
      </ul>
      <p>
        See also our{' '}
        <Link href="/shipping" className="underline">
          Shipping Policy
        </Link>
        ,{' '}
        <Link href="/terms" className="underline">
          Terms of Service
        </Link>
        , and{' '}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}
