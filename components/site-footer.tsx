import { getTranslations } from 'next-intl/server';

export async function SiteFooter() {
  const t = await getTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/40">
      <div className="container flex flex-col items-center justify-between gap-2 py-6 text-sm text-muted-foreground md:flex-row">
        <span>© {year} {t('brand.name')}</span>
        <span>{t('brand.tagline')}</span>
      </div>
    </footer>
  );
}
