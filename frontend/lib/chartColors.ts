export function getCSSVar(name: string, fallback = '#00ffff'): string {
  if (typeof window === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

export function getChartColors() {
  return {
    revenue: getCSSVar('--neon-emerald', '#34d399'),
    expenses: getCSSVar('--neon-fuchsia', '#e879f9'),
    accent: getCSSVar('--neon-cyan', '#00ffff'),
    grid: getCSSVar('--border-color', '#334155'),
    text: getCSSVar('--text-muted', '#94a3b8'),
    warning: '#fbbf24',
    danger: '#f87171',
    orange: '#f97316',
  }
}
