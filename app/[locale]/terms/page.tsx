import { getLocale } from 'next-intl/server';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'شروط الاستخدام' : 'Terms of Service',
    description: isAr
      ? 'شروط وأحكام استخدام موقع برينت باي فالكون للبيع بالتجزئة والجملة للطابعات ومستلزماتها في جمهورية مصر العربية.'
      : 'Terms and conditions for using the Print By Falcon retail and wholesale platform for printers and supplies in the Arab Republic of Egypt.',
    robots: { index: true, follow: true },
  };
}

export default async function TermsPage() {
  const locale = await getLocale();
  return locale === 'ar' ? <TermsArabic /> : <TermsEnglish />;
}

function ReviewBanner({ locale }: { locale: 'ar' | 'en' }) {
  const isAr = locale === 'ar';
  return (
    <div className="mb-8 rounded-md border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
      <strong className="font-semibold">
        {isAr
          ? 'ملاحظة داخلية — لا تنشر قبل المراجعة القانونية:'
          : 'Internal note — DO NOT PUBLISH WITHOUT LEGAL REVIEW:'}
      </strong>{' '}
      {isAr
        ? 'هذا المحتوى المؤقت يحتاج مراجعة محامٍ متخصص في التجارة الإلكترونية قبل الإطلاق الرسمي (M1).'
        : 'This scaffold content requires review by an e-commerce lawyer before M1 public launch.'}
    </div>
  );
}

function TermsArabic() {
  return (
    <main
      className="container-page prose prose-neutral max-w-none py-12 text-right"
      dir="rtl"
    >
      <ReviewBanner locale="ar" />
      <h1>شروط الاستخدام</h1>
      <p className="text-sm text-muted-foreground">آخر تحديث: 23 أبريل 2026</p>

      <h2>1. قبول الشروط</h2>
      <p>
        باستخدام موقع <strong>برينت باي فالكون</strong> (printbyfalcon.com) أو
        إنشاء حساب أو إتمام طلب، فإنك توافق على هذه الشروط والأحكام. إذا لم
        توافق، يرجى عدم استخدام الموقع.
      </p>

      <h2>2. الخدمة</h2>
      <p>
        نحن نقدّم متجرًا إلكترونيًا لبيع الطابعات والحبر ومستلزمات الطباعة
        للأفراد والشركات داخل جمهورية مصر العربية. تشمل الخدمة: كتالوج المنتجات،
        الطلب الإلكتروني، الدفع الإلكتروني أو النقدي عند الاستلام، التوصيل،
        وخدمات ما بعد البيع.
      </p>

      <h2>3. الحسابات</h2>
      <ul>
        <li>
          <strong>حسابات الأفراد:</strong> تُنشأ بالتحقق من رقم الهاتف عبر رمز
          واتساب لمرة واحدة.
        </li>
        <li>
          <strong>حسابات الشركات:</strong> تتطلب تقديم مستندات (سجل تجاري، بطاقة
          ضريبية) ومراجعة الإدارة خلال 24 ساعة كحد أقصى.
        </li>
        <li>
          أنت مسؤول عن الحفاظ على سرية بيانات حسابك، وأي نشاط يحدث باستخدام
          بياناتك يُعتبر صادرًا عنك ما لم تبلغنا فور اكتشافه.
        </li>
      </ul>

      <h2>4. الطلبات والأسعار</h2>
      <ul>
        <li>
          جميع الأسعار بالجنيه المصري وشاملة ضريبة القيمة المضافة 14% إلا إذا
          نصّ العكس.
        </li>
        <li>
          قد تختلف أسعار العملاء من الشركات (B2B) عن أسعار الأفراد (B2C) حسب
          الاتفاقية التجارية المعتمدة من الإدارة.
        </li>
        <li>
          تأكيد الطلب لا يعني ضمان التوفّر — في حال نفاد المخزون بعد تقديم
          الطلب، نرد قيمة الطلب كاملة أو نعرض بديلاً مقبولاً.
        </li>
        <li>
          نحتفظ بحق تعديل الأسعار والعروض في أي وقت، ولكن لا يؤثر ذلك على
          الطلبات المؤكّدة.
        </li>
      </ul>

      <h2>5. الدفع</h2>
      <ul>
        <li>
          نقبل البطاقات المصرفية (فيزا، ماستركارد، ميزا) عبر بوابة Paymob
          المعتمدة.
        </li>
        <li>
          نقبل الدفع نقدًا عند الاستلام (COD) في المناطق المحددة، قد تُطبّق رسوم
          إضافية.
        </li>
        <li>
          نقبل الدفع في منافذ فوري / أمان عبر خدمة Paymob — يظهر رمز الدفع في
          صفحة تأكيد الطلب ويصلح لمدة 48 ساعة.
        </li>
        <li>
          لعملاء الشركات: قد نعتمد طلبات &laquo;قيد المراجعة&raquo; بأحكام
          ائتمانية حسب الاتفاقية.
        </li>
      </ul>

      <h2>6. الشحن والتوصيل</h2>
      <ul>
        <li>
          نشحن داخل جمهورية مصر العربية فقط، مقسّمة إلى 5 مناطق توصيل برسوم
          تحدّدها الإدارة.
        </li>
        <li>
          مدة التوصيل المقدّرة من 1 إلى 5 أيام عمل حسب المنطقة، وتُحدَّد في صفحة
          الطلب.
        </li>
        <li>
          لا نضمن مواعيد التسليم الدقيقة لظروف خارجة عن إرادتنا (الأعياد، الظروف
          الجوية، إجراءات أمنية).
        </li>
      </ul>

      <h2>7. الإلغاء والاسترجاع</h2>
      <ul>
        <li>
          يمكن طلب إلغاء الطلب قبل تسليمه لشركة الشحن — يخضع للموافقة الإدارية.
        </li>
        <li>
          يحق استرجاع المنتج خلال 14 يومًا من تاريخ الاستلام، شرط أن يكون بحالته
          الأصلية في عبوته الأصلية.
        </li>
        <li>
          لا يقبل استرجاع: الحبر المستخدم، المنتجات المخصّصة، الطابعات التي تمّ
          تشغيلها بعد انقضاء فترة الضمان.
        </li>
        <li>يُرد المبلغ خلال 14 يوم عمل من تاريخ استلامنا للمنتج المُستردّ.</li>
      </ul>

      <h2>8. الضمان</h2>
      <p>
        ينطبق ضمان الشركة المصنّعة على الطابعات ومستلزماتها الأصلية. لا نقدّم
        ضمانًا مستقلاً على المنتجات البديلة (Compatible) إلا إذا نصّت صفحة
        المنتج على عكس ذلك.
      </p>

      <h2>9. الحساب المعلّق أو المحظور</h2>
      <p>نحتفظ بحق تعليق أو إنهاء أي حساب في حالة:</p>
      <ul>
        <li>
          انتهاك أي من هذه الشروط أو القوانين المعمول بها في جمهورية مصر
          العربية.
        </li>
        <li>محاولات الاحتيال أو الدفع بوسائل غير مشروعة.</li>
        <li>سوء استخدام الخدمة أو إلحاق أضرار بالموقع أو بالعملاء الآخرين.</li>
      </ul>

      <h2>10. الملكية الفكرية</h2>
      <p>
        جميع محتويات الموقع (النصوص، الصور، الشعارات، الأكواد) مملوكة لبرينت باي
        فالكون أو مرخّصة لها، ولا يجوز نسخها أو استخدامها تجاريًا بدون إذن كتابي
        مسبق.
      </p>

      <h2>11. حدود المسؤولية</h2>
      <p>
        في حدود القانون المصري، لا تتحمّل برينت باي فالكون مسؤولية الأضرار غير
        المباشرة أو الخسائر التجارية التبعية الناشئة عن استخدام الموقع أو
        خدماته. تنحصر مسؤوليتنا في قيمة الطلب المتنازع عليه.
      </p>

      <h2>12. القانون المنطبق والاختصاص القضائي</h2>
      <p>
        تخضع هذه الشروط للقانون المصري. أي نزاع ينشأ عن استخدام الموقع يحال إلى
        محاكم مدينة القاهرة المختصّة دون سواها.
      </p>

      <h2>13. التواصل</h2>
      <p>
        لأي سؤال:{' '}
        <a href="mailto:support@printbyfalcon.com">support@printbyfalcon.com</a>{' '}
        — +20 111 652 7773
      </p>
    </main>
  );
}

function TermsEnglish() {
  return (
    <main className="container-page prose prose-neutral max-w-none py-12">
      <ReviewBanner locale="en" />
      <h1>Terms of Service</h1>
      <p className="text-sm text-muted-foreground">
        Last updated: 23 April 2026
      </p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By using the <strong>Print By Falcon</strong> website
        (printbyfalcon.com), creating an account, or completing an order, you
        agree to these terms and conditions. If you do not agree, please do not
        use the site.
      </p>

      <h2>2. The Service</h2>
      <p>
        We operate an online store selling printers, ink, and printing supplies
        to individuals and businesses within the Arab Republic of Egypt. The
        service includes: product catalog, online ordering, card or
        cash-on-delivery payment, shipping, and after-sale support.
      </p>

      <h2>3. Accounts</h2>
      <ul>
        <li>
          <strong>Individual accounts:</strong> created by verifying your phone
          number via a one-time WhatsApp code.
        </li>
        <li>
          <strong>Business accounts:</strong> require documents (commercial
          registry, tax card) and admin review within 24 hours.
        </li>
        <li>
          You are responsible for the confidentiality of your account
          credentials; any activity using your credentials is deemed your own
          unless you report compromise immediately.
        </li>
      </ul>

      <h2>4. Orders and Pricing</h2>
      <ul>
        <li>
          All prices are in Egyptian Pounds (EGP) and include 14% VAT unless
          stated otherwise.
        </li>
        <li>
          Business (B2B) prices may differ from individual (B2C) prices per the
          commercial agreement approved by our admin.
        </li>
        <li>
          Order confirmation does not guarantee availability — if stock is
          depleted after your order, we refund the full amount or offer an
          acceptable substitute.
        </li>
        <li>
          We reserve the right to change prices and promotions at any time, but
          this does not affect confirmed orders.
        </li>
      </ul>

      <h2>5. Payment</h2>
      <ul>
        <li>
          We accept credit/debit cards (Visa, Mastercard, Meeza) via the Paymob
          payment gateway.
        </li>
        <li>
          We accept cash on delivery (COD) in designated zones; additional fees
          may apply.
        </li>
        <li>
          We accept cash at Fawry/Aman outlets via Paymob — the payment code
          appears on your order confirmation page and is valid for 48 hours.
        </li>
        <li>
          For business customers: we may accept &ldquo;Pending
          Confirmation&rdquo; orders on credit terms per the commercial
          agreement.
        </li>
      </ul>

      <h2>6. Shipping and Delivery</h2>
      <ul>
        <li>
          We ship within the Arab Republic of Egypt only, across 5 delivery
          zones with rates set by our admin.
        </li>
        <li>
          Estimated delivery is 1–5 business days depending on the zone and is
          shown at checkout.
        </li>
        <li>
          We do not guarantee exact delivery times for circumstances beyond our
          control (holidays, weather, security measures).
        </li>
      </ul>

      <h2>7. Cancellation and Returns</h2>
      <ul>
        <li>
          Orders can be cancelled before handover to the courier, subject to
          admin approval.
        </li>
        <li>
          Returns are accepted within 14 days of receipt, provided the product
          is in original condition and packaging.
        </li>
        <li>
          Non-returnable: used ink, customised products, printers operated after
          warranty activation.
        </li>
        <li>
          Refunds are issued within 14 business days of us receiving the
          returned product.
        </li>
      </ul>

      <h2>8. Warranty</h2>
      <p>
        Manufacturer warranty applies to genuine (OEM) printers and supplies. We
        do not provide an independent warranty on compatible products unless
        explicitly stated on the product page.
      </p>

      <h2>9. Suspension and Termination</h2>
      <p>We reserve the right to suspend or terminate any account that:</p>
      <ul>
        <li>Violates these terms or applicable Egyptian law.</li>
        <li>Engages in fraud or unlawful payment methods.</li>
        <li>
          Misuses the service or harms the site, our team, or other customers.
        </li>
      </ul>

      <h2>10. Intellectual Property</h2>
      <p>
        All site content (text, images, logos, code) is owned by or licensed to
        Print By Falcon. It may not be copied or used commercially without prior
        written permission.
      </p>

      <h2>11. Limitation of Liability</h2>
      <p>
        To the extent permitted by Egyptian law, Print By Falcon is not liable
        for indirect damages or consequential commercial losses arising from use
        of the site. Our liability is limited to the value of the disputed
        order.
      </p>

      <h2>12. Governing Law and Jurisdiction</h2>
      <p>
        These terms are governed by Egyptian law. Any dispute arising from use
        of the site is referred exclusively to the competent courts of Cairo.
      </p>

      <h2>13. Contact</h2>
      <p>
        For any question:{' '}
        <a href="mailto:support@printbyfalcon.com">support@printbyfalcon.com</a>{' '}
        — +20 111 652 7773
      </p>
    </main>
  );
}
