import { getLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import {
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Clock,
  Building2,
} from 'lucide-react';
import { getStoreInfo } from '@/lib/settings/store-info';

export const dynamic = 'force-dynamic';

const STORE_ADDRESS_AR =
  '12 محمد صدقي باشا، باب اللوق، القاهرة، جمهورية مصر العربية';
const STORE_ADDRESS_EN =
  '12 Mohamed Sedky Pasha, Bab Al-Louk, Cairo, Arab Republic of Egypt';
const STORE_MAPS_URL = 'https://maps.app.goo.gl/6gNmycfpDtsWkGgs8';
const SUPPORT_EMAIL = 'support@printbyfalcon.com';
const SALES_EMAIL = 'sales@printbyfalcon.com';
const WHATSAPP_DISPLAY = '+20 111 652 7773';
const WHATSAPP_DIGITS = '201116527773';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'تواصل معنا' : 'Contact Us',
    description: isAr
      ? 'تواصل مع برينت باي فالكون عبر واتساب أو البريد الإلكتروني — رقم الهاتف، البريد، العنوان، ومواعيد العمل في القاهرة، جمهورية مصر العربية.'
      : 'Get in touch with Print By Falcon via WhatsApp or email — phone, email, address, and business hours in Cairo, Arab Republic of Egypt.',
    robots: { index: true, follow: true },
  };
}

export default async function ContactPage() {
  const locale = await getLocale();
  const store = await getStoreInfo();
  const isAr = locale === 'ar';

  const supportMessageAr = encodeURIComponent(
    'مرحبًا، عندي استفسار من موقع برينت باي فالكون.',
  );
  const supportMessageEn = encodeURIComponent(
    'Hi, I have a question from the Print By Falcon site.',
  );
  const whatsappHref = `https://wa.me/${WHATSAPP_DIGITS}?text=${isAr ? supportMessageAr : supportMessageEn}`;

  return (
    <main className="container-page py-12 sm:py-16" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-strong">
          {isAr ? 'تواصل معنا' : 'Get in touch'}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {isAr ? 'إحنا في خدمتك' : "We're here to help"}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          {isAr
            ? 'فريق المبيعات والدعم متاح للرد على استفساراتك واستلام طلبات الجملة. اختر الطريقة المناسبة ليك من تحت.'
            : 'Our sales and support team is ready to answer your questions and handle wholesale enquiries. Pick the channel that suits you.'}
        </p>
      </header>

      <section className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-4 rounded-xl border border-border bg-paper p-5 shadow-card transition-colors hover:border-accent/40 hover:bg-accent-soft/40"
        >
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
            <MessageCircle className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">
              {isAr ? 'واتساب (الأسرع)' : 'WhatsApp (fastest)'}
            </p>
            <p className="num mt-1 text-sm text-muted-foreground">
              {WHATSAPP_DISPLAY}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isAr
                ? 'عادةً نرد خلال أقل من 30 دقيقة في ساعات العمل.'
                : 'Typical reply time: under 30 minutes during business hours.'}
            </p>
          </div>
        </a>

        <a
          href={`tel:+${WHATSAPP_DIGITS}`}
          className="group flex items-start gap-4 rounded-xl border border-border bg-paper p-5 shadow-card transition-colors hover:border-accent/40 hover:bg-accent-soft/40"
        >
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
            <Phone className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">
              {isAr ? 'مكالمة هاتفية' : 'Phone call'}
            </p>
            <p className="num mt-1 text-sm text-muted-foreground">
              {WHATSAPP_DISPLAY}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isAr
                ? 'متاح في ساعات العمل (الأحد–الخميس).'
                : 'Available during business hours (Sun–Thu).'}
            </p>
          </div>
        </a>

        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="group flex items-start gap-4 rounded-xl border border-border bg-paper p-5 shadow-card transition-colors hover:border-accent/40 hover:bg-accent-soft/40"
        >
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
            <Mail className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">
              {isAr ? 'دعم العملاء' : 'Customer support'}
            </p>
            <p className="mt-1 break-all text-sm text-muted-foreground">
              {SUPPORT_EMAIL}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isAr
                ? 'استفسارات الطلبات، الإرجاع، والمشاكل التقنية.'
                : 'Order, return, and technical questions.'}
            </p>
          </div>
        </a>

        <a
          href={`mailto:${SALES_EMAIL}`}
          className="group flex items-start gap-4 rounded-xl border border-border bg-paper p-5 shadow-card transition-colors hover:border-accent/40 hover:bg-accent-soft/40"
        >
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
            <Building2 className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">
              {isAr ? 'مبيعات الشركات (B2B)' : 'Business sales (B2B)'}
            </p>
            <p className="mt-1 break-all text-sm text-muted-foreground">
              {SALES_EMAIL}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isAr
                ? 'حسابات الشركات، الأسعار المخصصة، طلبات الكميات.'
                : 'Company accounts, custom pricing, bulk orders.'}
            </p>
          </div>
        </a>
      </section>

      <section className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-4 rounded-xl border border-border bg-background p-5 shadow-card">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
            <MapPin className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">
              {isAr ? 'العنوان' : 'Address'}
            </p>
            <a
              href={STORE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              {isAr ? STORE_ADDRESS_AR : STORE_ADDRESS_EN}
            </a>
            <p className="mt-1 text-xs text-muted-foreground">
              {isAr ? 'افتح في خرائط جوجل ↗' : 'Open in Google Maps ↗'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-xl border border-border bg-background p-5 shadow-card">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
            <Clock className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">
              {isAr ? 'مواعيد العمل' : 'Business hours'}
            </p>
            <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
              <li>
                {isAr
                  ? 'الأحد – الخميس: 10:00 ص – 6:00 م'
                  : 'Sun – Thu: 10:00 AM – 6:00 PM'}
              </li>
              <li>{isAr ? 'الجمعة: مغلق' : 'Friday: Closed'}</li>
              <li>
                {isAr
                  ? 'السبت: 11:00 ص – 4:00 م'
                  : 'Saturday: 11:00 AM – 4:00 PM'}
              </li>
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              {isAr
                ? 'بتوقيت القاهرة (GMT+2). الإجازات الرسمية المصرية تتبع التقويم الحكومي.'
                : 'Cairo time (GMT+2). Egyptian public holidays observed.'}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-3xl rounded-xl border border-border bg-paper p-6 text-center shadow-card">
        <p className="text-sm font-semibold text-foreground">
          {isAr ? 'بيانات الشركة' : 'Company details'}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {isAr ? store.nameAr : store.nameEn}
        </p>
        {store.commercialRegistryNumber &&
        store.commercialRegistryNumber !== 'TBD' ? (
          <p className="num mt-1 text-xs text-muted-foreground">
            {isAr ? 'سجل تجاري: ' : 'Commercial Registry: '}
            {store.commercialRegistryNumber}
          </p>
        ) : null}
        {store.taxCardNumber && store.taxCardNumber !== 'TBD' ? (
          <p className="num mt-1 text-xs text-muted-foreground">
            {isAr ? 'بطاقة ضريبية: ' : 'Tax Card: '}
            {store.taxCardNumber}
          </p>
        ) : null}
      </section>
    </main>
  );
}
