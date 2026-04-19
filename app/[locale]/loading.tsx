/**
 * Default loading skeleton for /[locale]/* routes. Shown while Server Components
 * suspend — kept deliberately generic so it works for homepage, listing pages,
 * detail pages, etc. Screen-specific skeletons (e.g. ProductCardSkeleton) live
 * closer to their data boundaries.
 */
export default function LocaleLoading() {
  return (
    <div className="container-page animate-fade-in py-12">
      <div className="shimmer h-4 w-24 rounded" />
      <div className="shimmer mt-4 h-10 w-2/3 max-w-xl rounded-md" />
      <div className="shimmer mt-3 h-5 w-1/2 max-w-md rounded" />

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-lg border border-border bg-paper"
          >
            <div className="shimmer aspect-square" />
            <div className="space-y-2.5 p-4">
              <div className="shimmer h-3 w-16 rounded" />
              <div className="shimmer h-4 w-full rounded" />
              <div className="shimmer h-4 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
