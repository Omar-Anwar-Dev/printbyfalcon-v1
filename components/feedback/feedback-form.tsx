'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FeedbackCategory } from '@prisma/client';
import { submitFeedbackAction } from '@/app/actions/feedback';

type Props = {
  locale: 'ar' | 'en';
  prefill: {
    contactName: string | null;
    contactValue: string | null;
  };
};

const LABELS = {
  ar: {
    title: 'شاركنا رأيك',
    subtitle:
      'كل ملاحظة بتساعدنا نحسّن الخدمة قبل الإطلاق العام. شكرًا إنك جربت معانا!',
    category: 'نوع الملاحظة',
    categoryOptions: {
      BUG: 'مشكلة فنية / Bug',
      UX: 'صعوبة في الاستخدام',
      FEATURE_REQUEST: 'اقتراح ميزة',
      PRAISE: 'إعجاب / شكر',
      OTHER: 'أخرى',
    },
    contactName: 'الاسم (اختياري)',
    contactValue: 'وسيلة تواصل (اختياري)',
    contactValueHelp: 'موبايل أو بريد إلكتروني — لو حابب نرد عليك.',
    message: 'تفاصيل الملاحظة',
    messageHelp:
      'كل ما كانت التفاصيل أكتر، كل ما هنفهم المشكلة بشكل أحسن. لو فيه bug، اكتبلنا الخطوات اللي عملتها.',
    submit: 'إرسال الملاحظة',
    submitting: 'جارٍ الإرسال…',
    errors: {
      'feedback.validation_invalid':
        'يرجى ملء النموذج بشكل صحيح. الرسالة لازم تكون من 10 إلى 2000 حرف.',
      'feedback.rate_limited': 'وصلت للحد الأقصى للإرسال. حاول تاني بعد ساعة.',
      generic: 'حدث خطأ. حاول مرة أخرى.',
    },
  },
  en: {
    title: 'Share your feedback',
    subtitle:
      'Every note helps us improve before the public launch. Thanks for testing with us!',
    category: 'Feedback type',
    categoryOptions: {
      BUG: 'Bug / technical issue',
      UX: 'Usability problem',
      FEATURE_REQUEST: 'Feature request',
      PRAISE: 'Compliment / thanks',
      OTHER: 'Other',
    },
    contactName: 'Name (optional)',
    contactValue: 'Contact (optional)',
    contactValueHelp: 'Phone or email — only if you want us to follow up.',
    message: 'Details',
    messageHelp:
      'The more detail, the better we can help. For bugs, please share the steps you took.',
    submit: 'Send feedback',
    submitting: 'Sending…',
    errors: {
      'feedback.validation_invalid':
        'Please fix the form. Message must be 10–2000 characters.',
      'feedback.rate_limited':
        "You've sent a few in a short window — please try again in an hour.",
      generic: 'Something went wrong — please try again.',
    },
  },
};

export function FeedbackForm({ locale, prefill }: Props) {
  const isAr = locale === 'ar';
  const labels = LABELS[locale];
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [category, setCategory] = useState<FeedbackCategory>(
    FeedbackCategory.BUG,
  );
  const [contactName, setContactName] = useState(prefill.contactName ?? '');
  const [contactValue, setContactValue] = useState(prefill.contactValue ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await submitFeedbackAction({
        category,
        message,
        contactName,
        contactValue,
        pathname: typeof window !== 'undefined' ? window.location.pathname : '',
        locale,
      });
      if (!res.ok) {
        const key = res.errorKey as keyof typeof labels.errors;
        setError(labels.errors[key] ?? labels.errors.generic);
        return;
      }
      router.push(`/${locale}/feedback/thanks`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="space-y-3">
        <p className="text-sm font-medium">{labels.category}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(labels.categoryOptions) as FeedbackCategory[]).map(
            (cat) => (
              <label
                key={cat}
                className="flex cursor-pointer items-center gap-2.5 rounded-md border bg-background p-3 text-sm hover:border-accent/40"
              >
                <input
                  type="radio"
                  name="category"
                  value={cat}
                  checked={category === cat}
                  onChange={() => setCategory(cat)}
                  className="text-accent"
                />
                <span>{labels.categoryOptions[cat]}</span>
              </label>
            ),
          )}
        </div>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">{labels.message}</span>
        <textarea
          required
          rows={6}
          minLength={10}
          maxLength={2000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2"
        />
        <span className="block text-xs text-muted-foreground">
          {labels.messageHelp}
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">{labels.contactName}</span>
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            maxLength={80}
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">{labels.contactValue}</span>
          <input
            value={contactValue}
            onChange={(e) => setContactValue(e.target.value)}
            maxLength={120}
            className="w-full rounded-md border bg-background px-3 py-2"
          />
          <span className="block text-xs text-muted-foreground">
            {labels.contactValueHelp}
          </span>
        </label>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending || message.trim().length < 10}
        className="w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60 sm:w-auto"
      >
        {pending ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
