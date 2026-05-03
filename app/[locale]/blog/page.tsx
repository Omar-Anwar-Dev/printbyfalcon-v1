import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { listPublishedPosts } from '@/lib/blog/posts';

export const dynamic = 'force-dynamic';

const BASE_URL =
  process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://printbyfalcon.com';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isAr = locale === 'ar';
  const title = isAr
    ? 'مدونة الطباعة | برينت باي فالكون'
    : 'Printing Blog | Print By Falcon';
  const description = isAr
    ? 'نصائح، أدلة، ومقارنات حول أحبار الطابعات والتونرات والطابعات في مصر. اختر الأنسب لطابعتك ومكتبك.'
    : 'Tips, guides, and comparisons covering printer ink, toner, and printers in Egypt. Pick the right fit for your printer and office.';
  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/${locale}/blog`,
      languages: {
        ar: `${BASE_URL}/ar/blog`,
        en: `${BASE_URL}/en/blog`,
      },
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${BASE_URL}/${locale}/blog`,
    },
  };
}

export default async function BlogIndexPage() {
  const locale = (await getLocale()) as 'ar' | 'en';
  const isAr = locale === 'ar';
  const posts = listPublishedPosts();

  return (
    <main className="container-page max-w-3xl py-12" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-strong">
          {isAr ? 'المدونة' : 'Blog'}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {isAr
            ? 'دليلك الكامل لعالم الطباعة'
            : 'Your Complete Guide to Printing'}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          {isAr
            ? 'مقالات، أدلة، ومقارنات تساعدك تختار الطابعة والتونر والحبر المناسب لشغلك.'
            : 'Articles, guides, and comparisons to help you pick the right printer, toner, and ink for your work.'}
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-paper p-8 text-center text-sm text-muted-foreground">
          {isAr
            ? 'قريبًا — أول مقال في الطريق.'
            : 'Coming soon — first article on the way.'}
        </p>
      ) : (
        <ul className="space-y-6">
          {posts.map((post) => {
            const content = post[locale];
            return (
              <li
                key={post.slug}
                className="group rounded-xl border border-border bg-paper p-6 transition-colors hover:border-accent/40"
              >
                <Link href={`/blog/${post.slug}`} className="block">
                  <p className="text-xs text-muted-foreground">
                    <time dateTime={post.publishedAt}>
                      {new Date(post.publishedAt).toLocaleDateString(
                        isAr ? 'ar-EG' : 'en-US',
                        { year: 'numeric', month: 'long', day: 'numeric' },
                      )}
                    </time>
                  </p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-accent-strong sm:text-2xl">
                    {content.title}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {content.excerpt ?? content.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {content.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-border bg-canvas px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
