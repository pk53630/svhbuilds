/**
 * Small dependency-free bar chart. data: [{ label, value }, ...]
 * Kept as plain SVG so it never breaks the build on free hosting.
 */
export default function BarChart({ data, height = 200, color = '#2563eb', valueSuffix = '' }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barWidth = 100 / data.length;

  return (
    <div className="bar-chart">
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="bar-chart-svg">
        {data.map((d, i) => {
          const barHeight = (d.value / max) * (height - 30);
          const x = i * barWidth + barWidth * 0.15;
          const w = barWidth * 0.7;
          const y = height - 20 - barHeight;
          return (
            <g key={d.label}>
              <rect x={x} y={y} width={w} height={barHeight} fill={color} rx="1" />
              <text x={x + w / 2} y={y - 3} textAnchor="middle" fontSize="5" fill="#334155">
                {d.value}
                {valueSuffix}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="bar-chart-labels">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}
