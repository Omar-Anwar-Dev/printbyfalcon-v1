import { getTranslations } from 'next-intl/server';

export default async function UnauthorizedPage() {
  const t = await getTranslations();
  return (
    <div className="container flex min-h-[50vh] items-center justify-center py-12 text-center">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">403</h1>
        <p className="text-muted-foreground">{t('admin.unauthorized')}</p>
      </div>
    </div>
  );
}
