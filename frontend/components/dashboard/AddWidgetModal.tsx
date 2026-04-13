'use client'
import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { WIDGET_CATALOG, type WidgetCatalogEntry } from './widgets'

interface WidgetPref {
  widget_id: string
  position: number
  is_visible: boolean
}

interface Props {
  open: boolean
  currentPrefs: WidgetPref[]
  onClose: () => void
  onSave: (prefs: WidgetPref[]) => void
  saving?: boolean
}

export function AddWidgetModal({ open, currentPrefs, onClose, onSave, saving }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) {
      const visible = new Set(currentPrefs.filter(p => p.is_visible).map(p => p.widget_id))
      setSelected(visible)
    }
  }, [open, currentPrefs])

  if (!open) return null

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSave() {
    const allIds = WIDGET_CATALOG.map(w => w.widget_id)
    const prefs: WidgetPref[] = allIds.map((id, i) => ({
      widget_id: id,
      position: i,
      is_visible: selected.has(id),
    }))
    onSave(prefs)
  }

  const defaultWidgets = WIDGET_CATALOG.filter(w => w.defaultVisible)
  const extraWidgets = WIDGET_CATALOG.filter(w => !w.defaultVisible)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Add Widgets</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Choose which widgets appear on your dashboard</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md transition-colors" style={{ color: 'var(--text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Default Widgets</p>
            <div className="grid grid-cols-2 gap-2">
              {defaultWidgets.map(w => <WidgetCard key={w.widget_id} widget={w} checked={selected.has(w.widget_id)} onToggle={() => toggle(w.widget_id)} />)}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Additional Widgets</p>
            <div className="grid grid-cols-2 gap-2">
              {extraWidgets.map(w => <WidgetCard key={w.widget_id} widget={w} checked={selected.has(w.widget_id)} onToggle={() => toggle(w.widget_id)} />)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5" style={{ borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg transition-colors"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-60"
            style={{ background: 'var(--neon-cyan)', color: '#000' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function WidgetCard({
  widget, checked, onToggle,
}: { widget: WidgetCatalogEntry; checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-start gap-3 p-3 rounded-lg text-left transition-all"
      style={{
        background: checked ? 'rgba(0,255,255,0.05)' : 'var(--bg-secondary)',
        border: `1px solid ${checked ? 'var(--neon-cyan)' : 'var(--border-color)'}`,
      }}
    >
      <div
        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
        style={{
          background: checked ? 'var(--neon-cyan)' : 'var(--border-color)',
          border: `1px solid ${checked ? 'var(--neon-cyan)' : 'transparent'}`,
        }}
      >
        {checked && <Check className="w-3 h-3" style={{ color: '#000' }} />}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{widget.icon}</span>
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{widget.name}</p>
        </div>
        <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>{widget.description}</p>
        <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--border-color)', color: 'var(--text-muted)' }}>{widget.chartType}</span>
      </div>
    </button>
  )
}
