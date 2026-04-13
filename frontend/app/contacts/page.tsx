'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Users, Loader2, Plus, X, Search, MoreHorizontal,
  ArrowUp, ArrowDown, ArrowUpDown, Mail, Phone,
  Building2, User, Edit2, Trash2,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

const INP = 'w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all'
const INP_S: React.CSSProperties = { backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, React.CSSProperties> = {
    customer: { backgroundColor: 'rgba(59,130,246,0.1)',   color: 'var(--accent)',    border: '1px solid rgba(59,130,246,0.25)'  },
    vendor:   { backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.25)'  },
    both:     { backgroundColor: 'rgba(52,211,153,0.1)',   color: 'var(--neon-emerald)', border: '1px solid rgba(52,211,153,0.25)'  },
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize" style={styles[type] || styles.customer}>
      {type}
    </span>
  )
}

export default function ContactsPage() {
  const { company } = useAuth()
  const companyId = company?.id || null

  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null)

  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortField, setSortField] = useState('display_name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const [showModal, setShowModal] = useState(false)
  const [editContact, setEditContact] = useState<any>(null)
  const [form, setForm] = useState({ display_name: '', contact_type: 'customer', email: '', phone: '', address: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    if (!companyId) { setLoading(false); return }
    fetchContacts()
  }, [companyId])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const close = () => setMenuOpen(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const fetchContacts = async () => {
    setLoading(true)
    const data = await api.get('/contacts/').catch(() => [])
    setContacts(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const openCreate = () => {
    setEditContact(null)
    setForm({ display_name: '', contact_type: 'customer', email: '', phone: '', address: '', notes: '' })
    setShowModal(true)
  }

  const openEdit = (c: any) => {
    setEditContact(c)
    setForm({ display_name: c.display_name || '', contact_type: c.contact_type || 'customer', email: c.email || '', phone: c.phone || '', address: c.address || '', notes: c.notes || '' })
    setShowModal(true)
    setMenuOpen(null)
  }

  const handleSave = async () => {
    if (!form.display_name.trim()) { setToast({ ok: false, msg: 'Name is required.' }); return }
    setSaving(true)
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''))
      if (editContact) {
        await api.patch(`/contacts/${editContact.id}`, payload)
        setToast({ ok: true, msg: 'Contact updated.' })
      } else {
        await api.post('/contacts/', payload)
        setToast({ ok: true, msg: 'Contact created.' })
      }
      setShowModal(false)
      await fetchContacts()
    } catch (e: any) {
      setToast({ ok: false, msg: e?.response?.data?.detail || 'Failed to save contact.' })
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/contacts/${id}`)
      setToast({ ok: true, msg: `"${name}" deleted.` })
      await fetchContacts()
    } catch {
      setToast({ ok: false, msg: 'Cannot delete — contact may have linked invoices or bills.' })
    }
    setMenuOpen(null)
  }

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { all: contacts.length, customer: 0, vendor: 0, both: 0 }
    contacts.forEach(ct => { c[ct.contact_type] = (c[ct.contact_type] || 0) + 1 })
    return c
  }, [contacts])

  const filtered = useMemo(() => {
    let r = [...contacts]
    if (typeFilter !== 'all') r = r.filter(c => c.contact_type === typeFilter)
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      r = r.filter(c =>
        (c.display_name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
      )
    }
    r.sort((a, b) => {
      const av = (a[sortField] || '').toLowerCase()
      const bv = (b[sortField] || '').toLowerCase()
      if (av === bv) return 0
      return (av < bv ? -1 : 1) * (sortDir === 'asc' ? 1 : -1)
    })
    return r
  }, [contacts, typeFilter, debouncedSearch, sortField, sortDir])

  const sortToggle = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
  }

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--accent)' }} />
    </div>
  )

  if (!companyId) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <Users className="h-16 w-16 mb-4" style={{ color: 'var(--text-muted)' }} />
      <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No company set up</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Complete onboarding to manage contacts.</p>
      <a href="/onboarding" className="btn btn-primary">
        Complete onboarding
      </a>
    </div>
  )

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>CRM</p>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Contacts</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Manage your customers and vendors</p>
        </div>
        <button onClick={openCreate}
          className="btn btn-primary">
          <Plus className="w-4 h-4" /> New Contact
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${toast.ok ? 'badge badge-success' : 'badge badge-danger'}`} style={{ display: 'block' }}>
          {toast.msg}
        </div>
      )}

      {/* Contact List */}
      <div className="panel">

        {/* Type tabs */}
        <div className="flex items-center gap-1 px-4 pt-4 overflow-x-auto" style={{ borderBottom: '1px solid var(--border-color)' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'customer', label: 'Customers' },
            { key: 'vendor', label: 'Vendors' },
            { key: 'both', label: 'Both' },
          ].map(tab => {
            const active = typeFilter === tab.key
            const count = typeCounts[tab.key] || 0
            return (
              <button key={tab.key} onClick={() => setTypeFilter(tab.key)}
                className="relative shrink-0 px-4 py-2.5 text-sm font-medium transition-all"
                style={{ color: active ? 'var(--accent)' : 'var(--text-muted)', borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: '-1px' }}>
                {tab.label}
                {count > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: active ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.06)', color: active ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              className="w-full pl-9 pr-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              placeholder="Search by name, email, phone…" value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          {(search || typeFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setTypeFilter('all') }}
              className="px-3 py-2 rounded-xl text-xs font-medium transition hover:opacity-70"
              style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)' }}>
              Clear
            </button>
          )}
          <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} {filtered.length === 1 ? 'contact' : 'contacts'}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            {contacts.length === 0 ? (
              <>
                <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No contacts yet</p>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Add your first customer or vendor to get started.</p>
                <button onClick={openCreate}
                  className="btn btn-primary">
                  <Plus className="w-4 h-4" /> New Contact
                </button>
              </>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No contacts match your search.</p>
            )}
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid items-center px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
              style={{ gridTemplateColumns: '1.5fr 1fr 1fr 120px 80px 48px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
              <button className="flex items-center gap-1 text-left hover:opacity-80 transition" onClick={() => sortToggle('display_name')}>
                Name <SortIcon field="display_name" />
              </button>
              <button className="flex items-center gap-1 text-left hover:opacity-80 transition" onClick={() => sortToggle('email')}>
                Email <SortIcon field="email" />
              </button>
              <div>Phone</div>
              <div>Type</div>
              <div>Actions</div>
              <div />
            </div>

            {filtered.map(contact => (
              <div key={contact.id} className="grid items-center px-4 py-3.5 transition hover:bg-[rgba(59,130,246,0.04)]"
                style={{ gridTemplateColumns: '1.5fr 1fr 1fr 120px 80px 48px', borderBottom: '1px solid var(--border-color)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                    {contact.display_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{contact.display_name}</p>
                    {contact.address && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{contact.address}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {contact.email ? (
                    <>
                      <Mail className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
                      <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{contact.email}</span>
                    </>
                  ) : <span className="text-sm" style={{ color: 'var(--text-muted)' }}>—</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  {contact.phone ? (
                    <>
                      <Phone className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{contact.phone}</span>
                    </>
                  ) : <span className="text-sm" style={{ color: 'var(--text-muted)' }}>—</span>}
                </div>
                <TypeBadge type={contact.contact_type} />
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(contact)}
                    className="p-1.5 rounded-lg transition hover:opacity-70"
                    style={{ color: 'var(--text-muted)' }} title="Edit">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(contact.id, contact.display_name)}
                    className="p-1.5 rounded-lg transition hover:opacity-70"
                    style={{ color: 'var(--text-muted)' }} title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div />
              </div>
            ))}
          </>
        )}
      </div>

      {/* ══ CREATE / EDIT MODAL ══ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="w-full max-w-lg panel">
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {editContact ? 'Edit Contact' : 'New Contact'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--text-muted)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Type selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Type</label>
                <div className="flex gap-2">
                  {['customer', 'vendor', 'both'].map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, contact_type: t }))}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition"
                      style={{
                        backgroundColor: form.contact_type === t ? 'rgba(59,130,246,0.12)' : 'var(--bg-primary)',
                        color: form.contact_type === t ? 'var(--accent)' : 'var(--text-secondary)',
                        border: form.contact_type === t ? '1px solid rgba(59,130,246,0.35)' : '1px solid var(--border-color)',
                      }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Display Name *</label>
                <input className={INP} style={INP_S} placeholder="Company or person name" value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Email</label>
                  <input className={INP} style={INP_S} type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Phone</label>
                  <input className={INP} style={INP_S} placeholder="+1 (555) 000-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Address</label>
                <input className={INP} style={INP_S} placeholder="Street, City, State, ZIP" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Notes</label>
                <textarea rows={2} className={INP} style={{ ...INP_S, resize: 'none' } as any}
                  placeholder="Internal notes (not visible to contact)"
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !form.display_name.trim()}
                className="btn btn-primary">
                {saving ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving…</span> : (editContact ? 'Save Changes' : 'Create Contact')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
