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
      <p className="text-sm text-muted-foreground">آخر تحديث: 10 مايو 2026</p>

      <h2>ما هي ملفات تعريف الارتباط؟</h2>
      <p>
        ملفات صغيرة يحفظها المتصفح على جهازك تتيح للموقع تذكّر بعض المعلومات عن
        زيارتك (مثل تسجيل الدخول ولغة العرض). نستخدم نوعين: ملفات{' '}
        <strong>ضرورية</strong> لتشغيل الموقع، وملفات{' '}
        <strong>تحليل وإعلانات</strong> لقياس فعالية حملاتنا التسويقية على
        فيسبوك / إنستغرام (Meta).
      </p>

      <h2>الملفات الضرورية</h2>
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

      <h2>ملفات التحليل والإعلانات</h2>
      <p>
        نستخدم <strong>Meta Pixel</strong> + <strong>Conversions API</strong> من
        فيسبوك لقياس فعالية إعلاناتنا (هل وصلك إعلان وأكملت الطلب؟). نرسل لـ
        Meta أحداثًا مجمّعة ومجزّأة مثل: زيارة منتج، إضافة للسلة، إتمام الطلب —
        مع قيمة الطلب والعملة. البريد الإلكتروني ورقم الموبايل (إن توفّرا)
        يُرسلان <em>مشفّرين</em> (SHA-256) لزيادة دقة المطابقة دون الكشف عن
        البيانات الخام.
      </p>
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
              <code>_fbp</code>
            </td>
            <td>
              معرّف زائر فريد يستخدمه Meta Pixel لربط زيارتك بالنشاط على إعلانات
              Meta.
            </td>
            <td>3 أشهر</td>
          </tr>
          <tr>
            <td>
              <code>_fbc</code>
            </td>
            <td>يحفظ آخر إعلان وصلت منه إلى الموقع لربط الشراء بالحملة.</td>
            <td>3 أشهر</td>
          </tr>
        </tbody>
      </table>
      <p>
        نستخدم أيضًا <strong>Cloudflare Web Analytics</strong> لإحصاء عدد
        الزيارات وزمن البقاء — لا يستخدم ملفات ارتباط ولا يجمع بيانات شخصية.
      </p>

      <h2>ملفات أطراف ثالثة</h2>
      <p>
        خلال تدفّق الدفع، يقوم موقع Paymob بوضع ملفات ارتباط خاصّة به داخل إطاره
        المضمّن (iframe) لحماية المعاملة. تخضع هذه الملفات لسياسة Paymob وليست
        تحت سيطرتنا.
      </p>

      <h2>كيف أرفض ملفات تعريف الارتباط؟</h2>
      <p>
        ملفات الموقع الضرورية لازمة لتسجيل الدخول والسلة، وتعطيلها من إعدادات
        المتصفح سيعطّل هذه الميزات. أمّا ملفات التحليل والإعلانات (Meta Pixel)
        فيمكنك إيقافها عبر:
      </p>
      <ul>
        <li>
          <strong>إعدادات إعلانات Meta:</strong>{' '}
          <a
            href="https://www.facebook.com/adpreferences"
            target="_blank"
            rel="noopener noreferrer"
          >
            facebook.com/adpreferences
          </a>{' '}
          ← &ldquo;إعدادات الإعلانات&rdquo; ← &ldquo;البيانات حول نشاطك من
          شركاء&rdquo; ← إيقاف.
        </li>
        <li>
          <strong>وضع التصفّح المتخفّي</strong> في المتصفح — يمنع حفظ ملفات
          الارتباط بعد إغلاق النافذة.
        </li>
        <li>
          <strong>ملحقات حجب التتبّع</strong> مثل uBlock Origin أو Privacy
          Badger.
        </li>
        <li>إعدادات المتصفح: حجب ملفات ارتباط الأطراف الثالثة.</li>
      </ul>

      <h2>التواصل</h2>
      <p>
        لأي استفسار عن البيانات أو طلب حذفها:{' '}
        <a href="mailto:privacy@printbyfalcon.com">privacy@printbyfalcon.com</a>
      </p>
    </main>
  );
}

function CookiesEnglish() {
  return (
    <main className="container-page prose prose-neutral max-w-none py-12">
      <h1>Cookie Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: 10 May 2026</p>

      <h2>What are cookies?</h2>
      <p>
        Small files your browser stores on your device so the site can remember
        things about your visit (like your login and language). We use two
        types: <strong>essential cookies</strong> to run the site, and{' '}
        <strong>analytics &amp; advertising cookies</strong> to measure the
        performance of our Meta (Facebook / Instagram) ad campaigns.
      </p>

      <h2>Essential cookies</h2>
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

      <h2>Analytics &amp; advertising cookies</h2>
      <p>
        We use <strong>Meta Pixel</strong> + <strong>Conversions API</strong>{' '}
        from Facebook to measure the effectiveness of our ads (did an ad lead to
        a purchase?). We send Meta aggregated, hashed events such as: page view,
        product view, add to cart, purchase — including order value and
        currency. Email and phone (when available) are sent <em>hashed</em>{' '}
        (SHA-256) to improve match accuracy without exposing the raw values.
      </p>
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
              <code>_fbp</code>
            </td>
            <td>
              Unique visitor ID set by Meta Pixel to associate this visit with
              activity on Meta&apos;s ad network.
            </td>
            <td>3 months</td>
          </tr>
          <tr>
            <td>
              <code>_fbc</code>
            </td>
            <td>
              Records the last ad click that brought you to the site so the
              purchase can be attributed to the campaign.
            </td>
            <td>3 months</td>
          </tr>
        </tbody>
      </table>
      <p>
        We also use <strong>Cloudflare Web Analytics</strong> for visitor counts
        and time-on-site — it does not use cookies and does not collect personal
        data.
      </p>

      <h2>Third-party cookies</h2>
      <p>
        During checkout, Paymob sets its own cookies inside its embedded iframe
        to secure the transaction. Those cookies are governed by Paymob&apos;s
        policy and are not under our control.
      </p>

      <h2>How do I refuse cookies?</h2>
      <p>
        The site&apos;s essential cookies are required for login and cart
        functionality, and disabling them from your browser settings will
        disable those features. Analytics and advertising cookies (Meta Pixel)
        can be opted out via:
      </p>
      <ul>
        <li>
          <strong>Meta ad preferences:</strong>{' '}
          <a
            href="https://www.facebook.com/adpreferences"
            target="_blank"
            rel="noopener noreferrer"
          >
            facebook.com/adpreferences
          </a>{' '}
          → &ldquo;Ad Settings&rdquo; → &ldquo;Data about your activity from
          partners&rdquo; → turn off.
        </li>
        <li>
          <strong>Private / incognito browsing</strong> — prevents cookies from
          persisting after you close the window.
        </li>
        <li>
          <strong>Tracker-blocker extensions</strong> like uBlock Origin or
          Privacy Badger.
        </li>
        <li>Browser settings: block third-party cookies.</li>
      </ul>

      <h2>Contact</h2>
      <p>
        For data inquiries or deletion requests:{' '}
        <a href="mailto:privacy@printbyfalcon.com">privacy@printbyfalcon.com</a>
      </p>
    </main>
  );
}
