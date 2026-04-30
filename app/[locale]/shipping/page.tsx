import { getLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/lib/i18n/routing';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'سياسة الشحن والتوصيل' : 'Shipping Policy',
    description: isAr
      ? 'سياسة الشحن لبرينت باي فالكون — مدد التوصيل، الرسوم، شروط الشحن المجاني، والمناطق المغطاة في جمهورية مصر العربية.'
      : 'Print By Falcon shipping policy — delivery times, fees, free-shipping thresholds, and coverage across the Arab Republic of Egypt.',
    robots: { index: true, follow: true },
  };
}

export default async function ShippingPage() {
  const locale = await getLocale();
  return locale === 'ar' ? <ShippingArabic /> : <ShippingEnglish />;
}

function ShippingArabic() {
  return (
    <main
      className="container-page prose prose-neutral max-w-none py-12 text-right"
      dir="rtl"
    >
      <h1>سياسة الشحن والتوصيل</h1>
      <p className="text-sm text-muted-foreground">آخر تحديث: 30 أبريل 2026</p>

      <h2>1. نطاق التغطية</h2>
      <p>
        نشحن داخل <strong>جمهورية مصر العربية</strong> فقط — جميع المحافظات الـ
        27 مغطاة. لا نقدم شحنًا دوليًا في الوقت الحالي.
      </p>

      <h2>2. مناطق الشحن والرسوم</h2>
      <p>
        قُسّمت المحافظات إلى 5 مناطق رئيسية، وكل منطقة لها سعر شحن وزمن توصيل
        خاص. الرسوم النهائية تظهر في صفحة إتمام الطلب بعد اختيار المحافظة:
      </p>
      <table>
        <thead>
          <tr>
            <th>المنطقة</th>
            <th>المحافظات</th>
            <th>الرسوم (تقريبية)</th>
            <th>المدة</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>القاهرة الكبرى</td>
            <td>القاهرة، الجيزة، القليوبية</td>
            <td className="num">40 ج.م</td>
            <td>1–2 يوم عمل</td>
          </tr>
          <tr>
            <td>الإسكندرية والدلتا</td>
            <td>
              الإسكندرية، البحيرة، الدقهلية، دمياط، الغربية، كفر الشيخ،
              المنوفية، الشرقية
            </td>
            <td className="num">65 ج.م</td>
            <td>2–3 أيام عمل</td>
          </tr>
          <tr>
            <td>القناة والسويس</td>
            <td>الإسماعيلية، بورسعيد، السويس</td>
            <td className="num">75 ج.م</td>
            <td>2–3 أيام عمل</td>
          </tr>
          <tr>
            <td>سيناء والبحر الأحمر</td>
            <td>شمال سيناء، جنوب سيناء، البحر الأحمر، مطروح، الوادي الجديد</td>
            <td className="num">120 ج.م</td>
            <td>4–5 أيام عمل</td>
          </tr>
          <tr>
            <td>الصعيد</td>
            <td>بني سويف، الفيوم، المنيا، أسيوط، سوهاج، قنا، الأقصر، أسوان</td>
            <td className="num">85 ج.م</td>
            <td>3–5 أيام عمل</td>
          </tr>
        </tbody>
      </table>
      <p className="text-sm text-muted-foreground">
        <em>
          الرسوم أعلاه استرشادية وقد تتغيّر بقرار من إدارة المتجر؛ السعر النهائي
          المعتمد هو اللي يظهر في صفحة إتمام الطلب.
        </em>
      </p>

      <h2>3. الشحن المجاني</h2>
      <ul>
        <li>
          <strong>عملاء الأفراد (B2C):</strong> الشحن مجاني للطلبات اللي تتجاوز{' '}
          <span className="num">1,500 ج.م</span> (قبل ضريبة القيمة المضافة).
        </li>
        <li>
          <strong>عملاء الشركات (B2B):</strong> الشحن مجاني للطلبات اللي تتجاوز{' '}
          <span className="num">5,000 ج.م</span> (قبل ضريبة القيمة المضافة).
        </li>
        <li>
          الحدود قد تختلف لبعض المناطق — تظهر القيمة الفعلية في ملخص الطلب.
        </li>
      </ul>

      <h2>4. الدفع عند الاستلام (COD)</h2>
      <ul>
        <li>متاح في معظم المحافظات بحد أقصى للطلب يحدّده فريق الإدارة.</li>
        <li>
          تنطبق رسوم خدمة إضافية على الدفع عند الاستلام (تظهر في ملخص الطلب قبل
          التأكيد).
        </li>
        <li>
          لا يتاح الدفع عند الاستلام في مناطق محددة (سيناء، الواحات، قرى الحدود)
          لأسباب لوجستية.
        </li>
      </ul>

      <h2>5. مواعيد التسليم وأيام العمل</h2>
      <ul>
        <li>
          أيام العمل: <strong>الأحد إلى الخميس</strong> (التقويم المصري).
        </li>
        <li>الجمعة والإجازات الرسمية ليست أيام شحن — العدّ يستثنيها.</li>
        <li>
          الطلبات المؤكَّدة قبل الساعة <span className="num">2:00 م</span>{' '}
          تُسلَّم لشركة الشحن في نفس يوم العمل عادة. الطلبات بعد ذلك تُسلَّم في
          يوم العمل التالي.
        </li>
        <li>
          تواريخ التسليم تقديرية وقد تتأخّر بسبب ظروف خارجة عن إرادتنا (الأعياد،
          الظروف الجوية، الإجراءات الأمنية، أخطاء العنوان).
        </li>
      </ul>

      <h2>6. تتبع الطلب</h2>
      <ul>
        <li>
          فور تأكيد الطلب، يصلك إشعار على واتساب أو إيميل برقم الطلب (
          <code>ORD-XX-XXXX-XXXXX</code>) ورابط صفحة المتابعة.
        </li>
        <li>
          عند تسليم الطلب لشركة الشحن، نخطرك بمندوب الشحن ورقم الإيصال (لو
          متاح). تابع التحديثات من صفحة الطلب أو حسابك.
        </li>
        <li>
          لو مرّت <span className="num">48</span> ساعة على الموعد المتوقع بدون
          استلام، راسلنا فورًا وهنتابع مع شركة الشحن.
        </li>
      </ul>

      <h2>7. شروط استلام الطلب</h2>
      <ul>
        <li>
          لازم يكون في شخص مسؤول في عنوان التسليم خلال ساعات النهار لاستلام
          الطلب وتوقيع إيصال التسليم.
        </li>
        <li>
          مندوب الشحن قد يطلب إثبات هوية شخصية للطلبات الكبيرة (أكثر من{' '}
          <span className="num">5,000 ج.م</span>) أو طلبات الدفع عند الاستلام.
        </li>
        <li>
          من حقك فحص المنتج (الكمية والمظهر الخارجي) قبل التوقيع. لو لاحظت مشكلة
          ظاهرة، ارفض الاستلام أو دوّنها على إيصال الشحن وراسلنا في نفس اليوم.
        </li>
        <li>
          لو تعذّر التسليم لـ 3 محاولات (عنوان خطأ، عدم توفّر المستلم، رفض
          الاستلام بدون سبب)، نُعيد الطلب للمستودع وقد نخصم رسوم الشحن من
          الاسترداد.
        </li>
      </ul>

      <h2>8. التغليف</h2>
      <p>
        نغلّف الطلبات بعناية لحماية المنتجات الحساسة (الطابعات، خراطيش الحبر،
        الورق). للطلبات الكبيرة نستخدم تغليف مزدوج وعلامات &laquo;هش&raquo;
        مرئية لشركة الشحن.
      </p>

      <h2>9. الأسعار بالجنيه المصري</h2>
      <p>
        جميع رسوم الشحن وقيم الطلبات معروضة بالجنيه المصري (ج.م) وشاملة ضريبة
        القيمة المضافة 14% إلا لو نصّ العكس على صفحة المنتج (مثل الكتب والمنتجات
        المعفاة قانونيًا).
      </p>

      <h2>10. التواصل</h2>
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
        راجع كذلك{' '}
        <Link href="/returns" className="underline">
          سياسة الاسترجاع
        </Link>{' '}
        و{' '}
        <Link href="/terms" className="underline">
          شروط الاستخدام
        </Link>
        .
      </p>
    </main>
  );
}

function ShippingEnglish() {
  return (
    <main className="container-page prose prose-neutral max-w-none py-12">
      <h1>Shipping Policy</h1>
      <p className="text-sm text-muted-foreground">
        Last updated: 30 April 2026
      </p>

      <h2>1. Coverage</h2>
      <p>
        We ship within the <strong>Arab Republic of Egypt</strong> only — all 27
        governorates are covered. International shipping is not available at
        this time.
      </p>

      <h2>2. Shipping Zones &amp; Fees</h2>
      <p>
        Governorates are grouped into 5 zones, each with its own fee and
        delivery window. The final cost is shown at checkout once the
        governorate is selected:
      </p>
      <table>
        <thead>
          <tr>
            <th>Zone</th>
            <th>Governorates</th>
            <th>Fee (approx.)</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Greater Cairo</td>
            <td>Cairo, Giza, Qalyubia</td>
            <td className="num">40 EGP</td>
            <td>1–2 business days</td>
          </tr>
          <tr>
            <td>Alexandria &amp; Delta</td>
            <td>
              Alexandria, Beheira, Dakahlia, Damietta, Gharbia, Kafr El-Sheikh,
              Menoufia, Sharqia
            </td>
            <td className="num">65 EGP</td>
            <td>2–3 business days</td>
          </tr>
          <tr>
            <td>Canal &amp; Suez</td>
            <td>Ismailia, Port Said, Suez</td>
            <td className="num">75 EGP</td>
            <td>2–3 business days</td>
          </tr>
          <tr>
            <td>Sinai &amp; Red Sea</td>
            <td>North Sinai, South Sinai, Red Sea, Matruh, New Valley</td>
            <td className="num">120 EGP</td>
            <td>4–5 business days</td>
          </tr>
          <tr>
            <td>Upper Egypt</td>
            <td>Beni Suef, Fayoum, Minya, Asyut, Sohag, Qena, Luxor, Aswan</td>
            <td className="num">85 EGP</td>
            <td>3–5 business days</td>
          </tr>
        </tbody>
      </table>
      <p className="text-sm text-muted-foreground">
        <em>
          Rates above are indicative and may change at admin discretion; the
          final authoritative price is the one shown at checkout.
        </em>
      </p>

      <h2>3. Free Shipping</h2>
      <ul>
        <li>
          <strong>Individual customers (B2C):</strong> free shipping on orders
          over <span className="num">1,500 EGP</span> (before VAT).
        </li>
        <li>
          <strong>Business customers (B2B):</strong> free shipping on orders
          over <span className="num">5,000 EGP</span> (before VAT).
        </li>
        <li>
          Thresholds may differ in some zones — the actual value is shown in the
          order summary.
        </li>
      </ul>

      <h2>4. Cash on Delivery (COD)</h2>
      <ul>
        <li>
          Available in most governorates with a per-order maximum set by our
          admin team.
        </li>
        <li>
          A small COD service fee applies (shown in the order summary before
          confirmation).
        </li>
        <li>
          COD is unavailable in select areas (Sinai, oases, border villages) for
          logistical reasons.
        </li>
      </ul>

      <h2>5. Delivery Schedule &amp; Working Days</h2>
      <ul>
        <li>
          Working days: <strong>Sunday – Thursday</strong> (Egyptian calendar).
        </li>
        <li>
          Friday and public holidays are not shipping days — they are excluded
          from delivery counts.
        </li>
        <li>
          Orders confirmed before <span className="num">2:00 PM</span> are
          typically handed over to the courier the same business day. Anything
          later ships the next business day.
        </li>
        <li>
          Delivery dates are estimates and may slip due to circumstances beyond
          our control (holidays, weather, security measures, address errors).
        </li>
      </ul>

      <h2>6. Tracking Your Order</h2>
      <ul>
        <li>
          Once your order is confirmed, you&rsquo;ll receive a WhatsApp or email
          notification with the order number (<code>ORD-XX-XXXX-XXXXX</code>)
          and a link to the tracking page.
        </li>
        <li>
          When the order is handed to the courier, we share the courier name and
          waybill number (when available). Track updates from the order page or
          your account.
        </li>
        <li>
          If <span className="num">48</span> hours pass after the expected
          window without delivery, message us and we&rsquo;ll follow up with the
          courier.
        </li>
      </ul>

      <h2>7. Receiving the Order</h2>
      <ul>
        <li>
          A responsible person must be at the delivery address during daytime
          hours to accept the package and sign the proof of delivery.
        </li>
        <li>
          The courier may request photo ID for large orders (over{' '}
          <span className="num">5,000 EGP</span>) or COD orders.
        </li>
        <li>
          You may inspect the package (quantity and external condition) before
          signing. If you spot an obvious problem, refuse delivery or note it on
          the waybill, and message us the same day.
        </li>
        <li>
          If delivery fails after 3 attempts (wrong address, recipient
          unavailable, refusal without reason), the order is returned to our
          warehouse and shipping fees may be deducted from the refund.
        </li>
      </ul>

      <h2>8. Packaging</h2>
      <p>
        Orders are packaged carefully to protect sensitive items (printers, ink
        cartridges, paper). Large orders use double-walled packaging and visible
        &ldquo;fragile&rdquo; markings for the courier.
      </p>

      <h2>9. Pricing in Egyptian Pounds</h2>
      <p>
        All shipping fees and order values are shown in Egyptian Pounds (EGP)
        and include 14% VAT unless stated otherwise on the product page (e.g.
        legally exempt items such as books).
      </p>

      <h2>10. Contact</h2>
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
        <Link href="/returns" className="underline">
          Return Policy
        </Link>{' '}
        and{' '}
        <Link href="/terms" className="underline">
          Terms of Service
        </Link>
        .
      </p>
    </main>
  );
}
