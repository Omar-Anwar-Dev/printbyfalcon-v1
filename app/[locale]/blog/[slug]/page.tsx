import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { JsonLd } from '@/components/seo/json-ld';
import { buildBreadcrumbList } from '@/lib/seo/structured-data';
import { BlogPostBody } from '@/components/blog/post-body';
import { getPostBySlug, listPublishedPosts } from '@/lib/blog/posts';

export const dynamic = 'force-dynamic';

const BASE_URL =
  process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://printbyfalcon.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  const content = post[locale as 'ar' | 'en'];
  return {
    title: content.title,
    description: content.description,
    keywords: content.tags,
    alternates: {
      canonical: `${BASE_URL}/${locale}/blog/${post.slug}`,
      languages: {
        ar: `${BASE_URL}/ar/blog/${post.slug}`,
        en: `${BASE_URL}/en/blog/${post.slug}`,
      },
    },
    openGraph: {
      title: content.title,
      description: content.description,
      type: 'article',
      url: `${BASE_URL}/${locale}/blog/${post.slug}`,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
    },
    twitter: { card: 'summary_large_image' },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug } = await params;
  const locale = (await getLocale()) as 'ar' | 'en';
  const isAr = locale === 'ar';
  const post = getPostBySlug(slug);
  if (!post) notFound();
  const content = post[locale];

  // Article schema for Google News + richer SERP card.
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: content.title,
    description: content.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    inLanguage: locale,
    author: { '@type': 'Organization', name: 'Print By Falcon' },
    publisher: {
      '@type': 'Organization',
      name: 'Print By Falcon',
      url: BASE_URL,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/${locale}/blog/${post.slug}`,
    },
    keywords: content.tags.join(', '),
  };
  const breadcrumbSchema = buildBreadcrumbList([
    { name: isAr ? 'الرئيسية' : 'Home', path: `/${locale}` },
    { name: isAr ? 'المدونة' : 'Blog', path: `/${locale}/blog` },
    { name: content.title, path: `/${locale}/blog/${post.slug}` },
  ]);

  // Recent posts for further reading (excluding the current one).
  const others = listPublishedPosts()
    .filter((p) => p.slug !== post.slug)
    .slice(0, 3);

  return (
    <main className="container-page max-w-3xl py-12" dir={isAr ? 'rtl' : 'ltr'}>
      <JsonLd data={[articleSchema, breadcrumbSchema]} id="blog-post-schema" />

      <nav
        aria-label={isAr ? 'المسار' : 'Breadcrumbs'}
        className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Link href="/" className="hover:text-foreground">
          {isAr ? 'الرئيسية' : 'Home'}
        </Link>
        <span className="text-border">/</span>
        <Link href="/blog" className="hover:text-foreground">
          {isAr ? 'المدونة' : 'Blog'}
        </Link>
        <span className="text-border">/</span>
        <span className="truncate text-foreground">{content.title}</span>
      </nav>

      <article>
        <header className="mb-8">
          <p className="text-xs text-muted-foreground">
            <time dateTime={post.publishedAt}>
              {new Date(post.publishedAt).toLocaleDateString(
                isAr ? 'ar-EG' : 'en-US',
                { year: 'numeric', month: 'long', day: 'numeric' },
              )}
            </time>
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {content.title}
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            {content.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {content.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-paper px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </header>

        <BlogPostBody body={content.body} isAr={isAr} />
      </article>

      {others.length > 0 ? (
        <aside className="mt-16 border-t border-border pt-8">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            {isAr ? 'مقالات أخرى' : 'More articles'}
          </h2>
          <ul className="space-y-3">
            {others.map((other) => (
              <li key={other.slug}>
                <Link
                  href={`/blog/${other.slug}`}
                  className="group block rounded-md border border-border bg-paper p-4 transition-colors hover:border-accent/40"
                >
                  <p className="text-sm font-medium text-foreground transition-colors group-hover:text-accent-strong">
                    {other[locale].title}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </main>
  );
}
