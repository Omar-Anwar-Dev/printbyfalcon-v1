/**
 * Lightweight hand-rolled SVG sparkline for the admin sales-trend widget.
 * No chart library — avoids pulling D3 / Recharts into the admin bundle.
 * Renders 30 daily totals as a smooth line over a max-value baseline.
 */
type Point = { day: string; totalEgp: number };

export function SalesTrendChart({
  points,
  isAr,
}: {
  points: Point[];
  isAr: boolean;
}) {
  if (points.length === 0) return null;

  const width = 700;
  const height = 180;
  const padding = { top: 10, right: 16, bottom: 28, left: 48 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const max = Math.max(1, ...points.map((p) => p.totalEgp));
  const step = plotWidth / Math.max(1, points.length - 1);
  const y = (v: number) => padding.top + plotHeight - (v / max) * plotHeight;
  const x = (i: number) => padding.left + i * step;

  const linePath = points
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.totalEgp).toFixed(1)}`,
    )
    .join(' ');
  const areaPath =
    linePath +
    ` L ${x(points.length - 1).toFixed(1)} ${padding.top + plotHeight}` +
    ` L ${x(0).toFixed(1)} ${padding.top + plotHeight} Z`;

  const fmt = new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', {
    maximumFractionDigits: 0,
  });
  const first = points[0]?.day ?? '';
  const last = points[points.length - 1]?.day ?? '';
  const total = points.reduce((a, b) => a + b.totalEgp, 0);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {isAr ? 'اتجاه المبيعات (30 يوم)' : 'Sales trend (30 days)'}
          </p>
          <p className="text-2xl font-bold tabular-nums">
            {fmt.format(total)} {isAr ? 'ج.م' : 'EGP'}
          </p>
        </div>
        <p className="text-xs text-muted-foreground" dir="ltr">
          {first} → {last}
        </p>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-48 w-full"
        role="img"
        aria-label={isAr ? 'رسم بياني للمبيعات' : 'Sales trend line chart'}
      >
        {/* Horizontal gridlines — quartiles. */}
        {[0.25, 0.5, 0.75, 1].map((pct) => (
          <line
            key={pct}
            x1={padding.left}
            x2={padding.left + plotWidth}
            y1={padding.top + plotHeight - pct * plotHeight}
            y2={padding.top + plotHeight - pct * plotHeight}
            stroke="currentColor"
            className="text-muted-foreground/20"
            strokeWidth={1}
          />
        ))}
        {/* Axis labels — max + zero. */}
        <text
          x={padding.left - 6}
          y={padding.top + 4}
          fontSize="10"
          textAnchor="end"
          className="fill-muted-foreground"
        >
          {fmt.format(max)}
        </text>
        <text
          x={padding.left - 6}
          y={padding.top + plotHeight}
          fontSize="10"
          textAnchor="end"
          className="fill-muted-foreground"
        >
          0
        </text>
        {/* Area fill. */}
        <path
          d={areaPath}
          fill="currentColor"
          className="text-primary/10"
          strokeWidth={0}
        />
        {/* Line. */}
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          className="text-primary"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dots on the last 5 points for legibility. */}
        {points.slice(-5).map((p, i) => {
          const pointIdx = points.length - 5 + i;
          return (
            <circle
              key={p.day}
              cx={x(pointIdx)}
              cy={y(p.totalEgp)}
              r={2.5}
              fill="currentColor"
              className="text-primary"
            />
          );
        })}
      </svg>
    </div>
  );
}
