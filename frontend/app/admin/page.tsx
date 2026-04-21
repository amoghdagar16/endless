'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Shield, RefreshCw, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api, API_BASE } from '@/lib/api'
import { supabase } from '@/lib/supabase'

type ActivityItem = {
  id: string
  direction: 'inbound' | 'outbound'
  method?: string
  path?: string
  status_code?: number
  duration_ms?: number
  actor_email?: string
  actor_role?: string
  created_at: string
}

type CompanyMember = {
  id: string
  full_name?: string
  email?: string
  created_at?: string
  role: 'owner' | 'admin' | 'accountant' | 'user' | 'viewer'
}

const ROLE_OPTIONS: CompanyMember['role'][] = ['owner', 'admin', 'accountant', 'user', 'viewer']

export default function AdminPanelPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [members, setMembers] = useState<CompanyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterDirection, setFilterDirection] = useState<'all' | 'inbound' | 'outbound'>('all')
  const [allowDefaultPasscode, setAllowDefaultPasscode] = useState(true)
  const [policyLoading, setPolicyLoading] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)

  const canAccessAdmin = useMemo(
    () => ['owner', 'admin'].includes((user?.role || '').toLowerCase()),
    [user?.role]
  )

  const getAdminToken = () => localStorage.getItem('admin_session_token') || ''

  const adminFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data } = await supabase.auth.getSession()
      const accessToken = data.session?.access_token
      const adminToken = getAdminToken()
      if (!accessToken || !adminToken) {
        throw new Error('Missing admin session. Please login again.')
      }

      const response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
          ...(init?.headers || {}),
          Authorization: `Bearer ${accessToken}`,
          'X-Admin-Session': adminToken,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.detail || `Request failed: ${response.status}`)
      }
      return response.json()
    },
    []
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const currentAdminToken = getAdminToken()
      if (!currentAdminToken) {
        router.push('/admin/login')
        return
      }

      // validate admin token first
      await api.post('/admin/session/validate', { token: currentAdminToken })

      const directionQuery = filterDirection === 'all' ? '' : `&direction=${filterDirection}`
      const activityRes = await adminFetch(`/admin/activity?limit=100&offset=0${directionQuery}`)
      const policyRes = await adminFetch('/admin/passcode-policy')
      const membersRes = await api.get<{ data: CompanyMember[] }>('/users/manage/company-members')
      setActivity(activityRes.data || [])
      setAllowDefaultPasscode(Boolean(policyRes?.allow_default_admin_passcode))
      setMembers(membersRes.data || [])
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      const message = detail || err?.message || 'Failed to load admin data'
      setError(message)
      if (message.toLowerCase().includes('admin session') || message.toLowerCase().includes('invalid')) {
        router.push('/admin/login')
      }
    } finally {
      setLoading(false)
    }
  }, [adminFetch, filterDirection, router])

  useEffect(() => {
    if (authLoading) return
    if (!canAccessAdmin) return
    loadData()
  }, [authLoading, canAccessAdmin, loadData])

  const updateRole = async (memberId: string, nextRole: CompanyMember['role']) => {
    try {
      await api.patch(`/users/manage/company-members/${memberId}/role`, { role: nextRole })
      await loadData()
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Role update failed')
    }
  }

  const removeMember = async (member: CompanyMember) => {
    const name = member.full_name || member.email || member.id
    const confirmed = window.confirm(`Remove ${name} from your organization?`)
    if (!confirmed) return
    try {
      await api.delete(`/users/manage/company-members/${member.id}`)
      await loadData()
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to remove member')
    }
  }

  const purgeOldLogs = async () => {
    try {
      await adminFetch('/admin/activity/purge', { method: 'POST', body: JSON.stringify({}) })
      await loadData()
    } catch (err: any) {
      setError(err?.message || 'Failed to purge old logs')
    }
  }

  const toggleDefaultPasscode = async () => {
    try {
      const nextValue = !allowDefaultPasscode
      if (!nextValue) {
        const confirmed = window.confirm(
          'Disable temporary default admin passcode for everyone in this company? Users will no longer be able to login with "admin".'
        )
        if (!confirmed) return
      }
      setPolicyLoading(true)
      const updated = await adminFetch('/admin/passcode-policy', {
        method: 'PATCH',
        body: JSON.stringify({ allow_default_admin_passcode: nextValue }),
      })
      setAllowDefaultPasscode(Boolean(updated?.allow_default_admin_passcode))
    } catch (err: any) {
      setError(err?.message || 'Failed to update passcode policy')
    } finally {
      setPolicyLoading(false)
    }
  }

  const ROLE_COLORS: Record<CompanyMember['role'], { bg: string; text: string; border: string; label: string }> = {
    owner: {
      bg: 'rgba(17,24,39,0.12)',
      text: '#111827',
      border: 'rgba(17,24,39,0.3)',
      label: 'Owner',
    },
    admin: {
      bg: 'rgba(59,130,246,0.14)',
      text: '#2563eb',
      border: 'rgba(59,130,246,0.35)',
      label: 'Admin',
    },
    accountant: {
      bg: 'rgba(34,197,94,0.14)',
      text: '#16a34a',
      border: 'rgba(34,197,94,0.35)',
      label: 'Accountant',
    },
    user: {
      bg: 'rgba(249,115,22,0.14)',
      text: '#ea580c',
      border: 'rgba(249,115,22,0.35)',
      label: 'Employee',
    },
    viewer: {
      bg: 'rgba(250,204,21,0.14)',
      text: '#ca8a04',
      border: 'rgba(250,204,21,0.35)',
      label: 'Viewer',
    },
  }

  if (!authLoading && !canAccessAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <Shield className="w-14 h-14 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Admin Access Restricted</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Only owner and admin roles can access this panel.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Administration</p>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Admin Panel</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Company-scoped administration, role controls, and activity logs.
          </p>
        </div>
        <button onClick={loadData} className="btn btn-secondary btn-sm">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', backgroundColor: 'rgba(239,68,68,0.08)' }}>
          {error}
        </div>
      )}

      <section
        className="rounded-xl p-4 space-y-3"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Shield className="w-4 h-4" />
          Admin Passcode Policy
        </h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Allow temporary default admin passcode (`admin`)
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Disable this after all admins set their own passcodes.
            </p>
          </div>
          <button
            onClick={toggleDefaultPasscode}
            disabled={policyLoading}
            className="btn btn-secondary btn-sm"
          >
            {policyLoading ? 'Saving...' : allowDefaultPasscode ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </section>

      <section
        className="rounded-xl p-4 space-y-3"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Activity className="w-4 h-4" />
            Activity Logs
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value as 'all' | 'inbound' | 'outbound')}
              className="px-2 py-1 rounded"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            >
              <option value="all">All</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>
            <button
              onClick={purgeOldLogs}
              className="px-3 py-1 rounded text-sm"
              style={{ border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            >
              Purge 30d+
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="text-left py-2">Time</th>
                <th className="text-left py-2">Direction</th>
                <th className="text-left py-2">Method</th>
                <th className="text-left py-2">Path</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Actor</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((item) => (
                <tr key={item.id} style={{ borderTop: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <td className="py-2">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="py-2">{item.direction}</td>
                  <td className="py-2">{item.method || '-'}</td>
                  <td className="py-2">{item.path || '-'}</td>
                  <td className="py-2">{item.status_code ?? '-'}</td>
                  <td className="py-2">{item.actor_email || item.actor_role || '-'}</td>
                </tr>
              ))}
              {!loading && activity.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-3 text-center" style={{ color: 'var(--text-muted)' }}>
                    No activity logs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="rounded-xl p-4 space-y-3"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>View People In Your Organization</h2>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Click a person to change their role.
        </p>
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="group flex items-center justify-between p-3 rounded cursor-pointer transition-colors"
              style={{ border: '1px solid var(--border-color)' }}
              onClick={() => setEditingMemberId(member.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
                e.currentTarget.style.borderColor = 'var(--accent)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.borderColor = 'var(--border-color)'
              }}
            >
              <div>
                <p style={{ color: 'var(--text-primary)' }}>{member.full_name || member.email || member.id}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{member.email}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Joined {member.created_at ? new Date(member.created_at).toLocaleDateString() : '—'}
                </p>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {editingMemberId === member.id ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      onChange={async (e) => {
                        await updateRole(member.id, e.target.value as CompanyMember['role'])
                        setEditingMemberId(null)
                      }}
                      className="px-2 py-1 rounded"
                      style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>{ROLE_COLORS[role].label}</option>
                      ))}
                    </select>
                    <button
                      className="px-2 py-1 rounded text-xs"
                      style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                      onClick={() => setEditingMemberId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: ROLE_COLORS[member.role].bg,
                        color: ROLE_COLORS[member.role].text,
                        border: `1px solid ${ROLE_COLORS[member.role].border}`,
                      }}
                    >
                      {ROLE_COLORS[member.role].label}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </span>
                    {!['owner', 'admin'].includes(member.role) && (
                      <button
                        className="inline-flex items-center gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: '#ef4444' }}
                        onClick={() => removeMember(member)}
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
