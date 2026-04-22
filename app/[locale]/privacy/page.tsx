import { getLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/lib/i18n/routing';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'سياسة الخصوصية' : 'Privacy Policy',
    description: isAr
      ? 'سياسة خصوصية برينت باي فالكون — كيف نجمع ونستخدم ونحمي بياناتك الشخصية وفقًا للقانون المصري رقم 151 لسنة 2020.'
      : 'Print By Falcon privacy policy — how we collect, use, and protect your personal data in line with Egyptian Personal Data Protection Law 151 of 2020.',
    robots: { index: true, follow: true },
  };
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  return locale === 'ar' ? <PrivacyArabic /> : <PrivacyEnglish />;
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
        ? 'هذا المحتوى المؤقت يتبع متطلبات القانون المصري رقم 151 لسنة 2020 لحماية البيانات الشخصية، لكنه يحتاج مراجعة محامي متخصص قبل الإطلاق الرسمي (M1).'
        : 'This scaffold content follows Egyptian Personal Data Protection Law 151 of 2020 but requires review by a qualified lawyer before M1 public launch.'}
    </div>
  );
}

function PrivacyArabic() {
  return (
    <main
      className="container-page prose prose-neutral max-w-none py-12 text-right"
      dir="rtl"
    >
      <ReviewBanner locale="ar" />
      <h1>سياسة الخصوصية</h1>
      <p className="text-sm text-muted-foreground">آخر تحديث: 23 أبريل 2026</p>

      <h2>1. تمهيد</h2>
      <p>
        نحن في <strong>برينت باي فالكون</strong> نحترم خصوصيتك ونلتزم بحماية
        بياناتك الشخصية وفقًا للقانون المصري رقم 151 لسنة 2020 بشأن حماية
        البيانات الشخصية ولوائحه التنفيذية. تشرح هذه السياسة نوع البيانات التي
        نجمعها، وكيف نستخدمها، ومع من نشاركها، وحقوقك كمستخدم.
      </p>

      <h2>2. المعالج المسؤول عن البيانات</h2>
      <ul>
        <li>
          <strong>الاسم التجاري:</strong> برينت باي فالكون
        </li>
        <li>
          <strong>المقر:</strong> القاهرة، جمهورية مصر العربية
        </li>
        <li>
          <strong>البريد الإلكتروني:</strong>{' '}
          <a href="mailto:privacy@printbyfalcon.com">
            privacy@printbyfalcon.com
          </a>
        </li>
        <li>
          <strong>الهاتف:</strong> +20 111 652 7773
        </li>
      </ul>

      <h2>3. البيانات التي نجمعها</h2>
      <p>نجمع الحد الأدنى من البيانات اللازمة لتقديم خدماتنا:</p>
      <ul>
        <li>
          <strong>بيانات الحساب (أفراد):</strong> الاسم، رقم الهاتف، البريد
          الإلكتروني (اختياري)، تفضيل اللغة.
        </li>
        <li>
          <strong>بيانات الحساب (شركات):</strong> اسم الشركة، رقم السجل التجاري،
          رقم البطاقة الضريبية، بيانات التواصل، عنوان التوصيل، المدينة، تقدير
          الحجم الشهري.
        </li>
        <li>
          <strong>بيانات الطلب:</strong> المنتجات المطلوبة، عنوان الشحن، طريقة
          الدفع، مبلغ الطلب، تاريخ الطلب، حالة التوصيل، ملاحظات العميل.
        </li>
        <li>
          <strong>بيانات التقنية:</strong> عنوان IP، نوع المتصفح، الصفحات
          المزارة، سجلات الأخطاء لأغراض الأمن وتحسين الخدمة.
        </li>
      </ul>
      <p>
        <strong>لا نخزن بيانات بطاقتك المصرفية.</strong> جميع مدفوعات البطاقات
        تتم عبر بوابة <em>Paymob</em> المعتمدة والمتوافقة مع معيار PCI DSS.
      </p>

      <h2>4. الأساس القانوني للمعالجة</h2>
      <ul>
        <li>
          <strong>تنفيذ العقد:</strong> معالجة الطلبات والتوصيل والفوترة.
        </li>
        <li>
          <strong>المصلحة المشروعة:</strong> الأمن ومنع الاحتيال وتحسين الخدمة.
        </li>
        <li>
          <strong>الموافقة الصريحة:</strong> عند إرسال رسائل تسويقية (تبدأ في
          مرحلة ما بعد الإطلاق الأولي — v1.1).
        </li>
        <li>
          <strong>الالتزام القانوني:</strong> الاحتفاظ بالفواتير لأغراض الضرائب
          (5 سنوات كحد أدنى).
        </li>
      </ul>

      <h2>5. كيف نستخدم بياناتك</h2>
      <ul>
        <li>تأكيد الطلبات وتجهيزها وتسليمها للعميل.</li>
        <li>
          إرسال تحديثات حالة الطلب عبر واتساب و/أو البريد الإلكتروني (حسب نوع
          الحساب).
        </li>
        <li>التواصل بشأن استفسارات الدعم أو إشعارات الحساب.</li>
        <li>تحسين الموقع والخدمة (تحليلات داخلية مجمعة — بدون تتبع خارجي).</li>
        <li>حماية الموقع من الاحتيال والتطفل (سجلات الوصول وأحداث الأمن).</li>
      </ul>

      <h2>6. المشاركة مع أطراف ثالثة</h2>
      <p>نشارك بياناتك فقط عند الضرورة التشغيلية:</p>
      <ul>
        <li>
          <strong>شركات الشحن:</strong> اسم العميل ورقم الهاتف وعنوان التوصيل
          (لتسليم الطلب).
        </li>
        <li>
          <strong>Paymob:</strong> بيانات الفاتورة ومبلغ الطلب (لتنفيذ الدفع).
        </li>
        <li>
          <strong>Whats360:</strong> رقم الهاتف ومحتوى الإشعار (لإرسال رسائل
          واتساب).
        </li>
        <li>
          <strong>Hostinger SMTP:</strong> البريد الإلكتروني ومحتوى الرسالة
          (لإرسال رسائل البريد الإلكتروني).
        </li>
        <li>
          <strong>السلطات الحكومية:</strong> عند طلب قانوني صريح أو التزام
          ضريبي.
        </li>
      </ul>
      <p>
        <strong>لا نبيع بياناتك لأي طرف ثالث.</strong>
      </p>

      <h2>7. الاحتفاظ بالبيانات</h2>
      <ul>
        <li>بيانات الحسابات النشطة: تحتفظ بها طوال فترة النشاط.</li>
        <li>
          الفواتير والسجلات المالية: 5 سنوات من تاريخ المعاملة (التزام ضريبي).
        </li>
        <li>
          عند طلب حذف الحساب: نخفي بياناتك الشخصية بعد انتهاء فترة الاحتفاظ
          القانونية مع الإبقاء على أرقام الفواتير لأغراض التدقيق.
        </li>
      </ul>

      <h2>8. حقوقك كصاحب بيانات</h2>
      <p>وفقًا للقانون رقم 151 لسنة 2020، لك الحق في:</p>
      <ul>
        <li>الوصول إلى بياناتك الشخصية وطلب نسخة منها.</li>
        <li>تصحيح أي بيانات غير دقيقة.</li>
        <li>طلب حذف بياناتك (مع مراعاة الاحتفاظات القانونية).</li>
        <li>
          الاعتراض على معالجة معينة أو إلغاء الاشتراك في الإشعارات التسويقية.
        </li>
        <li>نقل بياناتك إلى مزود خدمة آخر.</li>
        <li>تقديم شكوى إلى المركز الوطني لحماية البيانات الشخصية.</li>
      </ul>
      <p>
        لممارسة أي حق من هذه الحقوق، راسلنا على{' '}
        <a href="mailto:privacy@printbyfalcon.com">privacy@printbyfalcon.com</a>
        . سنرد خلال 30 يومًا كحد أقصى.
      </p>

      <h2>9. أمن البيانات</h2>
      <p>نطبق إجراءات تقنية وتنظيمية معقولة لحماية بياناتك، منها:</p>
      <ul>
        <li>تشفير الاتصالات بالموقع باستخدام HTTPS.</li>
        <li>تشفير كلمات المرور باستخدام bcrypt.</li>
        <li>تقييد الوصول الإداري للبيانات (صلاحيات الأدوار).</li>
        <li>سجلات تدقيق لكل تغيير على بياناتك.</li>
        <li>نسخ احتياطية منتظمة مع تشفير.</li>
      </ul>

      <h2>10. ملفات تعريف الارتباط (Cookies)</h2>
      <p>
        نستخدم ملفات تعريف الارتباط الضرورية فقط لتشغيل الموقع: جلسة تسجيل
        الدخول، تفضيل اللغة، حماية من الاحتيال (CSRF). لا نستخدم ملفات تتبع
        تسويقية أو إعلانية في مرحلة الإطلاق الأولي. للمزيد:{' '}
        <Link href="/cookies" className="underline">
          سياسة ملفات تعريف الارتباط
        </Link>
        .
      </p>

      <h2>11. تحديثات السياسة</h2>
      <p>
        قد نحدّث هذه السياسة من وقت لآخر. نشرح أي تغيير جوهري على هذه الصفحة مع
        تاريخ التحديث، ونرسل إشعارًا عبر البريد الإلكتروني للحسابات المسجّلة إذا
        كان التغيير يمس حقوقك بشكل مباشر.
      </p>

      <h2>12. كيفية التواصل معنا</h2>
      <p>لأي سؤال بشأن هذه السياسة أو بياناتك الشخصية:</p>
      <ul>
        <li>
          البريد الإلكتروني:{' '}
          <a href="mailto:privacy@printbyfalcon.com">
            privacy@printbyfalcon.com
          </a>
        </li>
        <li>الهاتف / واتساب: +20 111 652 7773</li>
      </ul>
    </main>
  );
}

function PrivacyEnglish() {
  return (
    <main className="container-page prose prose-neutral max-w-none py-12">
      <ReviewBanner locale="en" />
      <h1>Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">
        Last updated: 23 April 2026
      </p>

      <h2>1. Introduction</h2>
      <p>
        <strong>Print By Falcon</strong> respects your privacy and is committed
        to protecting your personal data in accordance with Egyptian Personal
        Data Protection Law 151 of 2020 and its implementing regulations. This
        policy explains what data we collect, how we use it, who we share it
        with, and your rights as a user.
      </p>

      <h2>2. Data Controller</h2>
      <ul>
        <li>
          <strong>Trading name:</strong> Print By Falcon
        </li>
        <li>
          <strong>Address:</strong> Cairo, Arab Republic of Egypt
        </li>
        <li>
          <strong>Email:</strong>{' '}
          <a href="mailto:privacy@printbyfalcon.com">
            privacy@printbyfalcon.com
          </a>
        </li>
        <li>
          <strong>Phone:</strong> +20 111 652 7773
        </li>
      </ul>

      <h2>3. Data We Collect</h2>
      <p>We collect the minimum data necessary to provide our services:</p>
      <ul>
        <li>
          <strong>Individual account data:</strong> name, phone number, email
          (optional), language preference.
        </li>
        <li>
          <strong>Business account data:</strong> company name, commercial
          registry number, tax card number, contact details, delivery address,
          city, estimated monthly volume.
        </li>
        <li>
          <strong>Order data:</strong> items ordered, shipping address, payment
          method, order amount, date, delivery status, customer notes.
        </li>
        <li>
          <strong>Technical data:</strong> IP address, browser type, pages
          visited, error logs for security and service improvement.
        </li>
      </ul>
      <p>
        <strong>We do not store your card details.</strong> All card payments
        are processed via <em>Paymob</em>, a PCI DSS-compliant payment gateway.
      </p>

      <h2>4. Legal Basis for Processing</h2>
      <ul>
        <li>
          <strong>Performance of contract:</strong> processing orders, delivery,
          and invoicing.
        </li>
        <li>
          <strong>Legitimate interests:</strong> security, fraud prevention, and
          service improvement.
        </li>
        <li>
          <strong>Explicit consent:</strong> for marketing messages (introduced
          post-launch in v1.1 only).
        </li>
        <li>
          <strong>Legal obligation:</strong> retaining invoices for tax purposes
          (minimum 5 years).
        </li>
      </ul>

      <h2>5. How We Use Your Data</h2>
      <ul>
        <li>Confirm, prepare, and deliver your orders.</li>
        <li>
          Send order status updates via WhatsApp and/or email (depending on
          account type).
        </li>
        <li>Respond to support enquiries and account notifications.</li>
        <li>
          Improve the site and service (aggregated internal analytics — no
          external tracking).
        </li>
        <li>
          Protect the site from fraud and abuse (access logs and security
          events).
        </li>
      </ul>

      <h2>6. Sharing with Third Parties</h2>
      <p>We share your data only where operationally necessary:</p>
      <ul>
        <li>
          <strong>Courier partners:</strong> customer name, phone, and delivery
          address (to deliver the order).
        </li>
        <li>
          <strong>Paymob:</strong> billing data and order amount (to process
          card payments).
        </li>
        <li>
          <strong>Whats360:</strong> phone number and notification content (to
          send WhatsApp messages).
        </li>
        <li>
          <strong>Hostinger SMTP:</strong> email address and message body (to
          send transactional email).
        </li>
        <li>
          <strong>Government authorities:</strong> upon explicit legal request
          or tax obligation.
        </li>
      </ul>
      <p>
        <strong>We do not sell your data to any third party.</strong>
      </p>

      <h2>7. Data Retention</h2>
      <ul>
        <li>
          Active account data: retained for the duration of your account
          activity.
        </li>
        <li>
          Invoices and financial records: 5 years from the transaction date (tax
          obligation).
        </li>
        <li>
          On account deletion request: we anonymise personal data after the
          legal retention period expires, while preserving invoice numbers for
          audit.
        </li>
      </ul>

      <h2>8. Your Rights as a Data Subject</h2>
      <p>Under Law 151 of 2020, you have the right to:</p>
      <ul>
        <li>Access your personal data and request a copy.</li>
        <li>Correct inaccurate data.</li>
        <li>Request deletion of your data (subject to legal retention).</li>
        <li>
          Object to specific processing or unsubscribe from marketing
          notifications.
        </li>
        <li>Port your data to another service provider.</li>
        <li>
          Lodge a complaint with the Egyptian National Center for Personal Data
          Protection.
        </li>
      </ul>
      <p>
        To exercise any of these rights, email{' '}
        <a href="mailto:privacy@printbyfalcon.com">privacy@printbyfalcon.com</a>
        . We respond within 30 days.
      </p>

      <h2>9. Data Security</h2>
      <p>
        We apply reasonable technical and organisational measures to protect
        your data:
      </p>
      <ul>
        <li>HTTPS encryption for all traffic.</li>
        <li>bcrypt hashing for passwords.</li>
        <li>Role-based access control for admin operations.</li>
        <li>Audit logs for every change to your data.</li>
        <li>Regular encrypted backups.</li>
      </ul>

      <h2>10. Cookies</h2>
      <p>
        We use essential cookies only — login session, language preference, and
        CSRF protection. We do not use marketing or advertising trackers at
        launch. See our{' '}
        <Link href="/cookies" className="underline">
          cookie policy
        </Link>{' '}
        for details.
      </p>

      <h2>11. Policy Updates</h2>
      <p>
        We may update this policy from time to time. We note any material change
        at the top of this page with the revision date, and we email registered
        account holders if the change materially affects your rights.
      </p>

      <h2>12. Contact</h2>
      <p>For any question about this policy or your personal data:</p>
      <ul>
        <li>
          Email:{' '}
          <a href="mailto:privacy@printbyfalcon.com">
            privacy@printbyfalcon.com
          </a>
        </li>
        <li>Phone / WhatsApp: +20 111 652 7773</li>
      </ul>
    </main>
  );
}
