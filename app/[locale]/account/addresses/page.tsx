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
  if (!user || user.type !== 'B2C') redirect(`/${locale}/sign-in`);

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="mb-6 text-2xl font-semibold">
        {locale === 'ar' ? 'عناويني' : 'My addresses'}
      </h1>
      <AddressManager
        locale={locale === 'ar' ? 'ar' : 'en'}
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
    </div>
  );
}
