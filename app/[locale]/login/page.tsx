import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ locale: 'ar' | 'en' }>;
};

/**
 * Legacy alias — Sprint 7 moved B2B login under `/b2b/login` to make the
 * namespace explicit (B2C is `/sign-in`, admin is `/admin/login`, B2B is
 * `/b2b/login`). Existing external links to `/login` still work via this
 * redirect so bookmarks / email templates don't break.
 */
export default async function LegacyLoginRedirect({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/b2b/login`);
}
