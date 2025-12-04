'use client'

import { useState } from 'react'
import {
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Settings,
  LogOut,
  Save,
  Upload
} from 'lucide-react'

export default function Profile() {
  const [activeTab, setActiveTab] = useState<'personal' | 'company'>('personal')
  const [personalInfo, setPersonalInfo] = useState({
    fullName: 'John Doe',
    email: 'john@example.com',
    phone: '+1 (555) 123-4567',
    role: 'Admin',
    avatar: ''
  })

  const [companyInfo, setCompanyInfo] = useState({
    name: 'Acme Corporation',
    industry: 'Technology',
    email: 'contact@acme.com',
    phone: '+1 (555) 987-6543',
    address: '123 Business St',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94105',
    country: 'USA',
    taxId: '12-3456789',
    fiscalYearEnd: '12-31'
  })

  const handlePersonalSave = () => {
    alert('Personal information saved!')
  }

  const handleCompanySave = () => {
    alert('Company information saved!')
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your profile and company settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('personal')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'personal'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <User className="w-4 h-4 inline mr-2" />
          Personal Info
        </button>
        <button
          onClick={() => setActiveTab('company')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'company'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Building2 className="w-4 h-4 inline mr-2" />
          Company Settings
        </button>
      </div>

      {/* Personal Info Tab */}
      {activeTab === 'personal' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              JD
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Profile Photo</h3>
              <p className="text-sm text-gray-600 mb-3">Update your profile picture</p>
              <button className="btn btn-secondary text-sm flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Photo
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                value={personalInfo.fullName}
                onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={personalInfo.email}
                onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Phone</label>
              <input
                type="tel"
                value={personalInfo.phone}
                onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Role</label>
              <select
                value={personalInfo.role}
                onChange={(e) => setPersonalInfo({ ...personalInfo, role: e.target.value })}
                className="input"
              >
                <option value="Admin">Admin</option>
                <option value="Accountant">Accountant</option>
                <option value="User">User</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button className="btn btn-secondary">Cancel</button>
            <button onClick={handlePersonalSave} className="btn btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Company Settings Tab */}
      {activeTab === 'company' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6">
          {/* Company Logo */}
          <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
            <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-12 h-12 text-gray-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Company Logo</h3>
              <p className="text-sm text-gray-600 mb-3">Upload your company logo</p>
              <button className="btn btn-secondary text-sm flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Logo
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="label">Company Name</label>
              <input
                type="text"
                value={companyInfo.name}
                onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Industry</label>
              <select
                value={companyInfo.industry}
                onChange={(e) => setCompanyInfo({ ...companyInfo, industry: e.target.value })}
                className="input"
              >
                <option value="Technology">Technology</option>
                <option value="Retail">Retail</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Services">Services</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Finance">Finance</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="label">Tax ID (EIN)</label>
              <input
                type="text"
                value={companyInfo.taxId}
                onChange={(e) => setCompanyInfo({ ...companyInfo, taxId: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={companyInfo.email}
                onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Phone</label>
              <input
                type="tel"
                value={companyInfo.phone}
                onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                className="input"
              />
            </div>

            <div className="col-span-2">
              <label className="label">Address</label>
              <input
                type="text"
                value={companyInfo.address}
                onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">City</label>
              <input
                type="text"
                value={companyInfo.city}
                onChange={(e) => setCompanyInfo({ ...companyInfo, city: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">State</label>
              <input
                type="text"
                value={companyInfo.state}
                onChange={(e) => setCompanyInfo({ ...companyInfo, state: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">ZIP Code</label>
              <input
                type="text"
                value={companyInfo.zipCode}
                onChange={(e) => setCompanyInfo({ ...companyInfo, zipCode: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Country</label>
              <input
                type="text"
                value={companyInfo.country}
                onChange={(e) => setCompanyInfo({ ...companyInfo, country: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Fiscal Year End</label>
              <input
                type="text"
                value={companyInfo.fiscalYearEnd}
                onChange={(e) => setCompanyInfo({ ...companyInfo, fiscalYearEnd: e.target.value })}
                placeholder="MM-DD"
                className="input"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button className="btn btn-secondary">Cancel</button>
            <button onClick={handleCompanySave} className="btn btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl border border-red-200 p-8 space-y-4">
        <h3 className="text-lg font-semibold text-red-900">Danger Zone</h3>
        <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
          <div>
            <p className="font-medium text-red-900">Delete Account</p>
            <p className="text-sm text-red-700">Permanently delete your account and all data</p>
          </div>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  )
}
