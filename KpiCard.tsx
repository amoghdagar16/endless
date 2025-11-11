interface KpiCardProps {
  title: string;
  value: string | number;
  delta?: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export default function KpiCard({ title, value, delta, subtitle, icon }: KpiCardProps) {
  return (
    <div className="kpi group">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {title}
        </div>
        {icon && <div className="text-brand-400 opacity-70 group-hover:opacity-100 transition-opacity">{icon}</div>}
      </div>
      <div className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
        {value}
      </div>
      {(delta || subtitle) && (
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {delta || subtitle}
        </div>
      )}
    </div>
  );
}
