interface KpiCardProps {
  title: string;
  value: string | number;
  delta?: string;
  subtitle?: string;
}

export default function KpiCard({ title, value, delta, subtitle }: KpiCardProps) {
  return (
    <div className="card">
      <div className="text-sm font-medium text-gray-600 mb-2">{title}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {delta && (
        <div className="text-xs text-gray-500 mt-1">{delta}</div>
      )}
      {subtitle && (
        <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
      )}
    </div>
  );
}
