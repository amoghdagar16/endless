'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Shield, RefreshCw } from 'lucide-react'
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
      const membersRes = await api.get<{ data: CompanyMember[] }>('/users/manage/company-members')
      setActivity(activityRes.data || [])
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

  const purgeOldLogs = async () => {
    try {
      await adminFetch('/admin/activity/purge', { method: 'POST', body: JSON.stringify({}) })
      await loadData()
    } catch (err: any) {
      setError(err?.message || 'Failed to purge old logs')
    }
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
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Company Members & Roles</h2>
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-2 rounded"
              style={{ border: '1px solid var(--border-color)' }}
            >
              <div>
                <p style={{ color: 'var(--text-primary)' }}>{member.full_name || member.email || member.id}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{member.email}</p>
              </div>
              <select
                value={member.role}
                onChange={(e) => updateRole(member.id, e.target.value as CompanyMember['role'])}
                className="px-2 py-1 rounded"
                style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
