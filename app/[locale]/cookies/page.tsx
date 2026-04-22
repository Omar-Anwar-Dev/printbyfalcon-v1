import { getLocale } from 'next-intl/server';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'سياسة ملفات تعريف الارتباط' : 'Cookie Policy',
    description: isAr
      ? 'شرح لملفات تعريف الارتباط الضرورية التي يستخدمها موقع برينت باي فالكون.'
      : 'Explanation of the essential cookies used by the Print By Falcon site.',
    robots: { index: true, follow: true },
  };
}

export default async function CookiesPage() {
  const locale = await getLocale();
  return locale === 'ar' ? <CookiesArabic /> : <CookiesEnglish />;
}

function CookiesArabic() {
  return (
    <main
      className="container-page prose prose-neutral max-w-none py-12 text-right"
      dir="rtl"
    >
      <h1>سياسة ملفات تعريف الارتباط (Cookies)</h1>
      <p className="text-sm text-muted-foreground">آخر تحديث: 23 أبريل 2026</p>

      <h2>ما هي ملفات تعريف الارتباط؟</h2>
      <p>
        ملفات صغيرة يحفظها المتصفح على جهازك تتيح للموقع تذكّر بعض المعلومات عن
        زيارتك (مثل تسجيل الدخول ولغة العرض). نستخدم ملفات{' '}
        <strong>ضرورية فقط</strong> لتشغيل الموقع — بدون تتبع إعلاني أو تسويقي.
      </p>

      <h2>ما الذي نستخدمه</h2>
      <table>
        <thead>
          <tr>
            <th>الاسم</th>
            <th>الغرض</th>
            <th>العمر</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>pbf_session</code>
            </td>
            <td>الإبقاء على جلسة تسجيل الدخول بعد التحقّق من الهوية.</td>
            <td>30 يومًا (متجدّدة)</td>
          </tr>
          <tr>
            <td>
              <code>NEXT_LOCALE</code>
            </td>
            <td>حفظ تفضيل اللغة (عربي / إنجليزي).</td>
            <td>عام واحد</td>
          </tr>
          <tr>
            <td>
              <code>pbf_cart_sid</code>
            </td>
            <td>ربط سلة التسوّق بالجهاز قبل تسجيل الدخول.</td>
            <td>جلسة المتصفح</td>
          </tr>
          <tr>
            <td>
              <code>pbf_cookie_consent</code>
            </td>
            <td>تذكّر إغلاقك للشريط التعريفي بملفات الارتباط.</td>
            <td>عام واحد</td>
          </tr>
        </tbody>
      </table>

      <h2>ملفات أطراف ثالثة</h2>
      <p>
        خلال تدفّق الدفع، يقوم موقع Paymob بوضع ملفات ارتباط خاصّة به داخل إطاره
        المضمّن (iframe) لحماية المعاملة. تخضع هذه الملفات لسياسة Paymob وليست
        تحت سيطرتنا.
      </p>

      <h2>كيف أرفض ملفات تعريف الارتباط؟</h2>
      <p>
        بما أن الملفات التي نستخدمها ضرورية لتشغيل الموقع (تسجيل الدخول، السلة،
        اللغة)، فإن تعطيلها من إعدادات المتصفح سيعطّل هذه الميزات. لا توجد ملفات
        تتبّعية اختيارية في الوقت الحالي.
      </p>

      <h2>التواصل</h2>
      <p>
        <a href="mailto:privacy@printbyfalcon.com">privacy@printbyfalcon.com</a>
      </p>
    </main>
  );
}

function CookiesEnglish() {
  return (
    <main className="container-page prose prose-neutral max-w-none py-12">
      <h1>Cookie Policy</h1>
      <p className="text-sm text-muted-foreground">
        Last updated: 23 April 2026
      </p>

      <h2>What are cookies?</h2>
      <p>
        Small files your browser stores on your device so the site can remember
        things about your visit (like your login and language). We use{' '}
        <strong>essential cookies only</strong> — no advertising or marketing
        trackers.
      </p>

      <h2>What we use</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Purpose</th>
            <th>Lifetime</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>pbf_session</code>
            </td>
            <td>Keep you logged in after authentication.</td>
            <td>30 days (rolling)</td>
          </tr>
          <tr>
            <td>
              <code>NEXT_LOCALE</code>
            </td>
            <td>Remember your language preference (Arabic / English).</td>
            <td>1 year</td>
          </tr>
          <tr>
            <td>
              <code>pbf_cart_sid</code>
            </td>
            <td>Bind your cart to this device before sign-in.</td>
            <td>Browser session</td>
          </tr>
          <tr>
            <td>
              <code>pbf_cookie_consent</code>
            </td>
            <td>Remember that you&apos;ve dismissed the cookie notice.</td>
            <td>1 year</td>
          </tr>
        </tbody>
      </table>

      <h2>Third-party cookies</h2>
      <p>
        During checkout, Paymob sets its own cookies inside its embedded iframe
        to secure the transaction. Those cookies are governed by Paymob&apos;s
        policy and are not under our control.
      </p>

      <h2>How do I refuse cookies?</h2>
      <p>
        Because the cookies we use are essential for the site to function
        (login, cart, language), disabling them from your browser settings will
        disable those features. There are no optional tracking cookies at this
        time.
      </p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:privacy@printbyfalcon.com">privacy@printbyfalcon.com</a>
      </p>
    </main>
  );
}
