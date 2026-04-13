'use client'

import { useState, useEffect, useCallback } from 'react'
import { Store, LogOut, AlertCircle, Loader2, Check, X, Pencil } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

// ─── constants ────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  'SaaS / Software', 'E-commerce / Retail', 'Professional Services',
  'Healthcare', 'Manufacturing', 'Food & Beverage', 'Real Estate',
  'Construction', 'Marketing / Advertising', 'Education', 'Consulting', 'Other',
]

const BUSINESS_TYPES: Record<string, string> = {
  sole_proprietor: 'Sole Proprietor',
  llc: 'LLC',
  s_corp: 'S-Corporation',
  corporation: 'C-Corporation',
  partnership: 'Partnership',
  other: 'Not sure / Other / None',
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]

function maskEIN(v: string) {
  const d = v.replace(/\D/g, '')
  return d.length <= 4 ? v : '•'.repeat(d.length - 4) + d.slice(-4)
}

function fmtAddr(street: string, city: string, state: string, zip: string) {
  const l2 = [city, state, zip].filter(Boolean).join(', ')
  if (!street && !l2) return ''
  if (!street) return l2
  if (!l2) return street
  return `${street}\n${l2}`
}

// ─── shared input style (adapts to dark/light) ────────────────────────────────
const INP = 'w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all'
const INP_S: React.CSSProperties = {
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Card({
  title, subtitle, topEdit, children,
}: {
  title: string
  subtitle: string
  topEdit?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="panel">
      {/* header */}
      <div className="flex items-start justify-between px-6 py-5">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
        </div>
        {topEdit}
      </div>
      {/* rows */}
      <div style={{ borderTop: '1px solid var(--border-color)' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Display/edit row ─────────────────────────────────────────────────────────
function Row({
  label, value, field, active, onEdit, onSave, onCancel, saving, children,
}: {
  label: string
  value?: string
  field: string
  active: string | null
  onEdit: (f: string) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  children: React.ReactNode
}) {
  const editing = active === field

  return (
    <div className="flex items-start gap-4 px-6 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
      {/* label */}
      <div className="w-44 shrink-0 pt-0.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        {label}
      </div>

      {/* value or edit form */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-3">
            {children}
            <div className="flex gap-2">
              <button
                onClick={onSave}
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Save
              </button>
              <button
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition"
                style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)' }}
              >
                <X className="w-3 h-3" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <span className="text-sm whitespace-pre-line" style={{ color: value ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
            {value || 'None listed'}
          </span>
        )}
      </div>

      {/* edit button */}
      {!editing && (
        <button
          onClick={() => onEdit(field)}
          className="shrink-0 text-sm font-semibold transition hover:opacity-70"
          style={{ color: 'var(--neon-cyan)' }}
        >
          Edit
        </button>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, supabaseUser, company, signOut, refreshUser, loading: authLoading } = useAuth()
  const router = useRouter()
  const co = company as any

  const [active,     setActive]     = useState<string | null>(null)
  const [legalOpen,  setLegalOpen]  = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [buf,        setBuf]        = useState<Record<string, string>>({})
  const [toast,      setToast]      = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    if (!authLoading && !supabaseUser) router.push('/login')
  }, [authLoading, supabaseUser, router])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const startEdit = useCallback((field: string, init: Record<string, string>) => {
    setActive(field)
    setBuf(init)
    setLegalOpen(false)
  }, [])

  const cancelEdit = useCallback(() => { setActive(null); setBuf({}) }, [])

  const openLegal = () => {
    setLegalOpen(true)
    setActive(null)
    setBuf({
      legal_business_name: co?.legal_business_name || '',
      tax_id:              co?.tax_id              || '',
      business_type:       co?.business_type       || '',
      legal_address:       co?.legal_address       || '',
    })
  }

  const patch = async (data: Record<string, any>) => {
    if (!co?.id) return
    setSaving(true)
    try {
      await api.patch(`/companies/${co.id}`, data)
      await refreshUser()
      setToast({ ok: true, msg: 'Saved.' })
    } catch (e: any) {
      setToast({ ok: false, msg: e?.response?.data?.detail || 'Failed to save.' })
    } finally { setSaving(false) }
  }

  const saveRow = async () => { await patch(buf); setActive(null); setBuf({}) }
  const saveLegal = async () => { await patch(buf); setLegalOpen(false); setBuf({}) }

  if (authLoading) return (
    <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--neon-cyan)' }} />
    </div>
  )

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Top bar ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Account</p>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Company Settings</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Manage your profile and company preferences.</p>
          </div>
          <button onClick={() => signOut()} className="btn btn-secondary btn-sm">
            <LogOut className="w-3.5 h-3.5" /> Log out
          </button>
        </div>

        {/* ── Toast ── */}
        {toast && (
          <div className={`px-4 py-3 rounded-lg text-sm font-medium ${toast.ok ? 'badge badge-success' : 'badge badge-danger'}`} style={{ display: 'block' }}>
            {toast.msg}
          </div>
        )}

        {/* ── Store icon ── */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <Store className="w-10 h-10" style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <Pencil className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            COMPANY INFO
        ══════════════════════════════════════════════ */}
        <Card
          title="Company info"
          subtitle="This info may be connected to the Business Network or used for billing purposes."
        >
          <Row label="Name" value={co?.name} field="name" active={active}
            onEdit={f => startEdit(f, { name: co?.name || '' })}
            onSave={saveRow} onCancel={cancelEdit} saving={saving}>
            <input className={INP} style={INP_S} placeholder="Acme Inc."
              value={buf.name ?? ''} onChange={e => setBuf(b => ({ ...b, name: e.target.value }))} />
          </Row>

          <Row
            label="Address"
            value={fmtAddr(co?.address || '', co?.city || '', co?.state || '', co?.zip_code || '')}
            field="address" active={active}
            onEdit={f => startEdit(f, { address: co?.address || '', city: co?.city || '', state: co?.state || '', zip_code: co?.zip_code || '' })}
            onSave={saveRow} onCancel={cancelEdit} saving={saving}
          >
            <input className={INP} style={INP_S} placeholder="Street address"
              value={buf.address ?? ''} onChange={e => setBuf(b => ({ ...b, address: e.target.value }))} />
            <div className="grid grid-cols-3 gap-2">
              <input className={INP} style={INP_S} placeholder="City"
                value={buf.city ?? ''} onChange={e => setBuf(b => ({ ...b, city: e.target.value }))} />
              <select className={INP} style={INP_S}
                value={buf.state ?? ''} onChange={e => setBuf(b => ({ ...b, state: e.target.value }))}>
                <option value="">State</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input className={INP} style={INP_S} placeholder="ZIP"
                value={buf.zip_code ?? ''} onChange={e => setBuf(b => ({ ...b, zip_code: e.target.value }))} />
            </div>
          </Row>

          <Row label="Email" value={co?.email} field="co_email" active={active}
            onEdit={f => startEdit(f, { email: co?.email || '' })}
            onSave={saveRow} onCancel={cancelEdit} saving={saving}>
            <input className={INP} style={INP_S} type="email" placeholder="hello@acme.com"
              value={buf.email ?? ''} onChange={e => setBuf(b => ({ ...b, email: e.target.value }))} />
          </Row>

          <Row label="Phone" value={co?.phone} field="phone" active={active}
            onEdit={f => startEdit(f, { phone: co?.phone || '' })}
            onSave={saveRow} onCancel={cancelEdit} saving={saving}>
            <input className={INP} style={INP_S} type="tel" placeholder="6505550100"
              value={buf.phone ?? ''} onChange={e => setBuf(b => ({ ...b, phone: e.target.value }))} />
          </Row>

          <Row label="Website" value={co?.website} field="website" active={active}
            onEdit={f => startEdit(f, { website: co?.website || '' })}
            onSave={saveRow} onCancel={cancelEdit} saving={saving}>
            <input className={INP} style={INP_S} type="url" placeholder="https://acme.com"
              value={buf.website ?? ''} onChange={e => setBuf(b => ({ ...b, website: e.target.value }))} />
          </Row>

          {/* Industry — last row, no bottom border */}
          <div className="flex items-start gap-4 px-6 py-4">
            <div className="w-44 shrink-0 pt-0.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Industry</div>
            <div className="flex-1 min-w-0">
              {active === 'industry' ? (
                <div className="space-y-3">
                  <select className={INP} style={INP_S}
                    value={buf.industry ?? ''} onChange={e => setBuf(b => ({ ...b, industry: e.target.value }))}>
                    <option value="">Select industry</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={saveRow} disabled={saving}
                      className="btn btn-primary">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                    </button>
                    <button onClick={cancelEdit}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                      style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)' }}>
                      <X className="w-3 h-3" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <span className="text-sm" style={{ color: co?.industry ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                  {co?.industry || 'None listed'}
                </span>
              )}
            </div>
            {active !== 'industry' && (
              <button onClick={() => startEdit('industry', { industry: co?.industry || '' })}
                className="shrink-0 text-sm font-semibold transition hover:opacity-70"
                style={{ color: 'var(--neon-cyan)' }}>
                Edit
              </button>
            )}
          </div>
        </Card>

        {/* ══════════════════════════════════════════════
            LEGAL INFO  (single Edit for whole section)
        ══════════════════════════════════════════════ */}
        <Card
          title="Legal info"
          subtitle="This is the info your business uses for tax purposes."
          topEdit={
            !legalOpen ? (
              <button onClick={openLegal}
                className="text-sm font-semibold mt-1 transition hover:opacity-70"
                style={{ color: 'var(--neon-cyan)' }}>
                Edit
              </button>
            ) : undefined
          }
        >
          {legalOpen ? (
            /* edit form */
            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Legal business name</p>
                <input className={INP} style={INP_S} placeholder="Acme Inc. (as registered)"
                  value={buf.legal_business_name ?? ''}
                  onChange={e => setBuf(b => ({ ...b, legal_business_name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>EIN / SSN</p>
                  <input className={INP} style={INP_S} placeholder="XX-XXXXXXX"
                    value={buf.tax_id ?? ''}
                    onChange={e => setBuf(b => ({ ...b, tax_id: e.target.value }))} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Business type</p>
                  <select className={INP} style={INP_S}
                    value={buf.business_type ?? ''}
                    onChange={e => setBuf(b => ({ ...b, business_type: e.target.value }))}>
                    <option value="">Select type</option>
                    {Object.entries(BUSINESS_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Legal address</p>
                <textarea className={INP} style={{ ...INP_S, resize: 'none' } as any} rows={3}
                  placeholder={"123 MAIN ST STE 100\nCOLUMBUS, OH 43207"}
                  value={buf.legal_address ?? ''}
                  onChange={e => setBuf(b => ({ ...b, legal_address: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <button onClick={saveLegal} disabled={saving}
                  className="btn btn-primary">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                </button>
                <button onClick={() => { setLegalOpen(false); setBuf({}) }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                  style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)' }}>
                  <X className="w-3 h-3" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            /* display rows */
            <>
              {[
                { label: 'Legal business name', value: co?.legal_business_name },
                { label: 'EIN / SSN',            value: co?.tax_id ? maskEIN(co.tax_id) : undefined },
                { label: 'Business type',         value: BUSINESS_TYPES[co?.business_type] || co?.business_type },
                { label: 'Legal address',         value: co?.legal_address },
              ].map((r, i, arr) => (
                <div key={r.label} className="flex items-start gap-4 px-6 py-4"
                  style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border-color)' : undefined }}>
                  <div className="w-44 shrink-0 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{r.label}</div>
                  <div className="flex-1 text-sm whitespace-pre-line" style={{ color: r.value ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                    {r.value || 'None listed'}
                  </div>
                </div>
              ))}
            </>
          )}
        </Card>

        {/* ══════════════════════════════════════════════
            CUSTOMER CONTACT INFO
        ══════════════════════════════════════════════ */}
        <Card
          title="Customer contact info"
          subtitle="This is how customers get in touch with you."
        >
          <Row label="Customer email" value={co?.customer_email} field="customer_email" active={active}
            onEdit={f => startEdit(f, { customer_email: co?.customer_email || '' })}
            onSave={saveRow} onCancel={cancelEdit} saving={saving}>
            <input className={INP} style={INP_S} type="email" placeholder="billing@acme.com"
              value={buf.customer_email ?? ''}
              onChange={e => setBuf(b => ({ ...b, customer_email: e.target.value }))} />
          </Row>

          {/* last row — no bottom border */}
          <div className="flex items-start gap-4 px-6 py-4">
            <div className="w-44 shrink-0 pt-0.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Customer address</div>
            <div className="flex-1 min-w-0">
              {active === 'customer_address' ? (
                <div className="space-y-3">
                  <textarea className={INP} style={{ ...INP_S, resize: 'none' } as any} rows={3}
                    placeholder={"123 Main St Ste 100\nColumbus, OH 43207"}
                    value={buf.customer_address ?? ''}
                    onChange={e => setBuf(b => ({ ...b, customer_address: e.target.value }))} />
                  <div className="flex gap-2">
                    <button onClick={saveRow} disabled={saving}
                      className="btn btn-primary">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                    </button>
                    <button onClick={cancelEdit}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                      style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)' }}>
                      <X className="w-3 h-3" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <span className="text-sm whitespace-pre-line" style={{ color: co?.customer_address ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                  {co?.customer_address || 'None listed'}
                </span>
              )}
            </div>
            {active !== 'customer_address' && (
              <button onClick={() => startEdit('customer_address', { customer_address: co?.customer_address || '' })}
                className="shrink-0 text-sm font-semibold transition hover:opacity-70"
                style={{ color: 'var(--neon-cyan)' }}>
                Edit
              </button>
            )}
          </div>
        </Card>

        {/* ── Footer ── */}
        <div className="flex items-center justify-center gap-3 py-2 text-sm">
          {['Privacy', 'Security', 'Terms of Service'].map((l, i, a) => (
            <span key={l} className="flex items-center gap-3">
              <a href="#" className="transition hover:opacity-70" style={{ color: 'var(--neon-cyan)' }}>{l}</a>
              {i < a.length - 1 && <span style={{ color: 'var(--border-color)' }}>|</span>}
            </span>
          ))}
        </div>

        {/* ── Danger zone ── */}
        <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-400" />
            <div>
              <p className="text-sm font-bold text-red-400">Danger zone</p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Permanently delete your account and all company data. This cannot be undone.
              </p>
            </div>
          </div>
          <button className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition">
            Delete account
          </button>
        </div>

      </div>
    </div>
  )
}
