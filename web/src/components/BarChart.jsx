/**
 * Small dependency-free bar chart, built from plain HTML/CSS (not SVG) so
 * text never gets stretched or distorted when the card resizes.
 * data: [{ label, value }, ...]
 */
const DEFAULT_PALETTE = ['#2563eb', '#f97316', '#16a34a', '#e11d48', '#7c3aed', '#0891b2', '#ca8a04'];

export default function BarChart({ data, height = 200, colors, valueSuffix = '' }) {
  const palette = colors || DEFAULT_PALETTE;
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="bar-chart">
      <div className="bar-chart-bars" style={{ height }}>
        {data.map((d, i) => {
          const color = palette[i % palette.length];
          const barHeightPct = Math.max((d.value / max) * 100, d.value > 0 ? 4 : 1);
          return (
            <div className="bar-chart-col" key={d.label}>
              <span className="bar-chart-value" style={{ color }}>
                {d.value}
                {valueSuffix}
              </span>
              <div className="bar-chart-bar" style={{ height: `${barHeightPct}%`, background: color }} />
            </div>
          );
        })}
      </div>
      <div className="bar-chart-labels">
        {data.map((d, i) => (
          <span key={d.label} style={{ color: palette[i % palette.length] }}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
