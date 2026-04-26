import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { getOptionalUser } from '@/lib/auth';
import { AddressManager } from '@/components/account/address-manager';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ar' ? 'عناويني' : 'My addresses',
    robots: { index: false, follow: false },
  };
}

export default async function AccountAddressesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getOptionalUser();
  if (!user) redirect(`/${locale}/sign-in`);
  // B2B has no personal address book — company shipping is in the
  // company profile + per-order at checkout. Send them to their portal
  // home instead of bouncing to /sign-in (which would log them out
  // mentally even though the session is still valid).
  if (user.type === 'B2B') redirect(`/${locale}/b2b/profile`);
  if (user.type !== 'B2C') redirect(`/${locale}`);

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  const isAr = locale === 'ar';
  return (
    <main className="container-page max-w-2xl py-10 md:py-14">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-strong">
          {isAr ? 'حسابي' : 'Account'}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {isAr ? 'عناويني' : 'My addresses'}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {isAr
            ? 'حدّ أقصى 5 عناوين. العنوان الافتراضي يُستخدم تلقائيًا في الدفع.'
            : 'Up to 5 addresses. The default address is used automatically at checkout.'}
        </p>
      </header>
      <AddressManager
        locale={isAr ? 'ar' : 'en'}
        addresses={addresses.map((a) => ({
          id: a.id,
          recipientName: a.recipientName,
          phone: a.phone,
          governorate: a.governorate,
          city: a.city,
          area: a.area,
          street: a.street,
          building: a.building,
          apartment: a.apartment,
          notes: a.notes,
          isDefault: a.isDefault,
        }))}
      />
    </main>
  );
}
