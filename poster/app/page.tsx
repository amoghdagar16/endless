export default function Poster() {
  return (
    <div className="w-[1920px] h-[2700px] bg-white mx-auto relative print:m-0" style={{ fontFamily: 'Arial, sans-serif' }}>

      {/* TOP SECTION - Team ID, Title, Team Members, Sponsor */}
      <div className="px-12 pt-10 pb-8">
        <div className="flex items-start justify-between mb-8">
          {/* TOP LEFT: Team ID Box */}
          <div className="border-4 border-black px-8 py-6 bg-gray-100">
            <p className="text-lg font-bold mb-1">Team:</p>
            <p className="font-black" style={{ fontSize: '100px', lineHeight: '1' }}>CSE XXX</p>
          </div>

          {/* TOP CENTER: Title Area */}
          <div className="flex-1 px-12 text-center">
            <h1 className="font-black mb-4" style={{ fontSize: '44px', lineHeight: '1.1' }}>
              ENDLESS MOMENTS LLC -<br />
              AI ACCOUNTING COMPANION APP
            </h1>
            <p className="text-2xl mb-2">
              <strong>Team:</strong> Amogh Dagar, Ashish Kumar, Satya Neriyanuru, Atiman Rohatgi, Dhruv Bhatt
            </p>
            <p className="text-2xl">
              <strong>Sponsor:</strong> Jay Manwani, Endless Moments LLC
            </p>
          </div>

          {/* Placeholder for balance */}
          <div className="w-64"></div>
        </div>
      </div>

      {/* MAIN CONTENT - 3 COLUMNS */}
      <div className="px-12 grid grid-cols-3 gap-8">

        {/* ==================== LEFT COLUMN ==================== */}
        <div className="space-y-8">

          {/* 1️⃣ Project Overview */}
          <div>
            <h2 className="font-bold text-4xl mb-6" style={{ color: '#4A90E2' }}>Project Overview</h2>

            <div className="space-y-5">
              <div className="bg-blue-50 p-5 rounded-lg border-2 border-blue-200">
                <h3 className="font-bold text-xl mb-2" style={{ color: '#4A90E2' }}>🎯 THE PROBLEM</h3>
                <p className="text-base leading-relaxed" style={{ color: '#2C3E50' }}>
                  Small businesses waste 5+ hours/week on manual bookkeeping with 30% error rates and pay $3,000+/year for accounting software.
                </p>
              </div>

              <div className="bg-blue-50 p-5 rounded-lg border-2 border-blue-200">
                <h3 className="font-bold text-xl mb-2" style={{ color: '#4A90E2' }}>💡 OUR SOLUTION</h3>
                <p className="text-base leading-relaxed" style={{ color: '#2C3E50' }}>
                  AI-powered accounting platform that automates financial workflows using smart receipt parsing (90% accuracy) and AI categorization (92% accuracy), reducing manual work by 80%.
                </p>
              </div>

              <div className="bg-blue-50 p-5 rounded-lg border-2 border-blue-200">
                <h3 className="font-bold text-xl mb-2" style={{ color: '#4A90E2' }}>👥 TARGET USERS</h3>
                <ul className="text-base leading-relaxed space-y-1" style={{ color: '#2C3E50' }}>
                  <li>• Small business owners (1-10 employees)</li>
                  <li>• Freelancers & independent contractors</li>
                  <li>• Startup founders needing pro accounting</li>
                </ul>
              </div>

              <div className="bg-green-50 p-5 rounded-lg border-2 border-green-300">
                <h3 className="font-bold text-xl mb-2" style={{ color: '#7ED321' }}>📊 KEY IMPACT</h3>
                <ul className="text-base leading-relaxed space-y-1" style={{ color: '#2C3E50' }}>
                  <li>• 80% time savings (5 hours → 1 hour/week)</li>
                  <li>• 95% error reduction through AI validation</li>
                  <li>• $2,400/year cost savings vs QuickBooks</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 2️⃣ Customer Archetypes */}
          <div>
            <h2 className="font-bold text-3xl mb-5" style={{ color: '#50E3C2' }}>Customer Archetypes</h2>

            <div className="space-y-4">
              <div className="bg-cyan-50 p-5 rounded-lg border-2 border-cyan-300 text-center">
                <div className="text-5xl mb-2">👔</div>
                <h3 className="font-bold text-lg mb-2">BUSY SAM</h3>
                <p className="text-sm font-semibold mb-1">Small Biz Owner</p>
                <p className="text-sm" style={{ color: '#2C3E50' }}><strong>Pain:</strong> 5+ hrs/week</p>
                <p className="text-sm" style={{ color: '#7ED321' }}><strong>Fix:</strong> AI auto-entry</p>
              </div>

              <div className="bg-cyan-50 p-5 rounded-lg border-2 border-cyan-300 text-center">
                <div className="text-5xl mb-2">🎨</div>
                <h3 className="font-bold text-lg mb-2">FRAN</h3>
                <p className="text-sm font-semibold mb-1">Freelancer</p>
                <p className="text-sm" style={{ color: '#2C3E50' }}><strong>Pain:</strong> Receipt chaos</p>
                <p className="text-sm" style={{ color: '#7ED321' }}><strong>Fix:</strong> Mobile capture</p>
              </div>

              <div className="bg-cyan-50 p-5 rounded-lg border-2 border-cyan-300 text-center">
                <div className="text-5xl mb-2">🚀</div>
                <h3 className="font-bold text-lg mb-2">GARY</h3>
                <p className="text-sm font-semibold mb-1">Startup Founder</p>
                <p className="text-sm" style={{ color: '#2C3E50' }}><strong>Pain:</strong> Need reports</p>
                <p className="text-sm" style={{ color: '#7ED321' }}><strong>Fix:</strong> Pro dashboards</p>
              </div>
            </div>
          </div>

          {/* 3️⃣ Sprint Progress */}
          <div>
            <h2 className="font-bold text-2xl mb-4" style={{ color: '#9013FE' }}>Development Progress</h2>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 bg-gray-200 h-8 rounded-lg overflow-hidden">
                  <div className="bg-purple-600 h-full" style={{ width: '60%' }}></div>
                </div>
                <span className="font-black text-2xl" style={{ color: '#9013FE' }}>60%</span>
              </div>
              <p className="text-sm font-semibold" style={{ color: '#2C3E50' }}>
                Sprint 4 of 10 | 18 Story Points/Sprint
              </p>
            </div>

            {/* Checklist */}
            <div className="space-y-2 text-base">
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✅</span>
                <span style={{ color: '#2C3E50' }}>Authentication & Multi-Tenant System</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✅</span>
                <span style={{ color: '#2C3E50' }}>Smart Receipt Parser (OCR)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✅</span>
                <span style={{ color: '#2C3E50' }}>AI Expense Validation</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✅</span>
                <span style={{ color: '#2C3E50' }}>Financial Dashboard with Charts</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✅</span>
                <span style={{ color: '#2C3E50' }}>Category Management</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-orange-500 font-bold">⏳</span>
                <span style={{ color: '#2C3E50' }}>AR/AP Modules (In Progress)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gray-400 font-bold">○</span>
                <span className="text-gray-500">Financial Reports (Planned)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gray-400 font-bold">○</span>
                <span className="text-gray-500">Bank Reconciliation (Planned)</span>
              </div>
            </div>
          </div>

        </div>

        {/* ==================== MIDDLE COLUMN ==================== */}
        <div className="space-y-8">

          {/* 1️⃣ System Architecture */}
          <div>
            <h2 className="font-bold text-4xl mb-5" style={{ color: '#FF9800' }}>System Architecture</h2>

            {/* IMAGE PLACEHOLDER 2 - Architecture Diagram */}
            <div className="bg-gradient-to-br from-orange-100 to-orange-50 border-4 border-orange-400 rounded-xl p-8 flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-6xl mb-4">🏗️</p>
                <p className="font-bold text-2xl" style={{ color: '#FF9800' }}>IMAGE 2</p>
                <p className="text-lg mt-2" style={{ color: '#2C3E50' }}>Architecture Diagram</p>
                <p className="text-sm italic mt-2 text-gray-600">Replace with actual architecture screenshot</p>
              </div>
            </div>
            <p className="text-center text-sm italic mt-2" style={{ color: '#2C3E50' }}>
              5-Layer Microservices Architecture
            </p>
          </div>

          {/* 2️⃣ Application Screenshots */}
          <div>
            <h2 className="font-bold text-3xl mb-5" style={{ color: '#4A90E2' }}>Application Screenshots</h2>

            <div className="space-y-4">
              {/* IMAGE 3 - Login */}
              <div className="bg-gradient-to-br from-blue-100 to-blue-50 border-3 border-blue-400 rounded-lg p-6 h-48 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-4xl mb-2">🔐</p>
                  <p className="font-bold text-xl" style={{ color: '#4A90E2' }}>IMAGE 3 - Login</p>
                  <p className="text-sm italic mt-1">Secure Authentication</p>
                </div>
              </div>

              {/* IMAGE 4 - Onboarding */}
              <div className="bg-gradient-to-br from-purple-100 to-purple-50 border-3 border-purple-400 rounded-lg p-6 h-48 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-4xl mb-2">👋</p>
                  <p className="font-bold text-xl" style={{ color: '#9013FE' }}>IMAGE 4 - Onboarding</p>
                  <p className="text-sm italic mt-1">Company Onboarding</p>
                </div>
              </div>

              {/* IMAGE 5 - Dashboard */}
              <div className="bg-gradient-to-br from-green-100 to-green-50 border-3 border-green-400 rounded-lg p-6 h-48 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-4xl mb-2">📊</p>
                  <p className="font-bold text-xl" style={{ color: '#7ED321' }}>IMAGE 5 - Dashboard</p>
                  <p className="text-sm italic mt-1">Real-Time Dashboard</p>
                </div>
              </div>
            </div>
          </div>

          {/* 3️⃣ Features Grid */}
          <div>
            <h2 className="font-bold text-2xl mb-4" style={{ color: '#7ED321' }}>Key Features</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 p-3 rounded border-2 border-green-300">
                <p className="font-semibold text-sm">✅ Smart Receipt Parser</p>
              </div>
              <div className="bg-green-50 p-3 rounded border-2 border-green-300">
                <p className="font-semibold text-sm">✅ AI Expense Validation</p>
              </div>
              <div className="bg-green-50 p-3 rounded border-2 border-green-300">
                <p className="font-semibold text-sm">✅ Financial Dashboard</p>
              </div>
              <div className="bg-green-50 p-3 rounded border-2 border-green-300">
                <p className="font-semibold text-sm">✅ PWA Support</p>
              </div>
              <div className="bg-green-50 p-3 rounded border-2 border-green-300">
                <p className="font-semibold text-sm">✅ Mobile-First UI</p>
              </div>
              <div className="bg-orange-50 p-3 rounded border-2 border-orange-300">
                <p className="font-semibold text-sm">⏳ Chart of Accounts</p>
              </div>
              <div className="bg-orange-50 p-3 rounded border-2 border-orange-300">
                <p className="font-semibold text-sm">⏳ Supabase Auth</p>
              </div>
              <div className="bg-orange-50 p-3 rounded border-2 border-orange-300">
                <p className="font-semibold text-sm">⏳ Double-Entry System</p>
              </div>
            </div>
          </div>

        </div>

        {/* ==================== RIGHT COLUMN ==================== */}
        <div className="space-y-8">

          {/* 1️⃣ Preliminary Results */}
          <div>
            <h2 className="font-bold text-4xl mb-5" style={{ color: '#7ED321' }}>Preliminary Results</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Metric 1 */}
              <div className="bg-green-50 border-3 border-green-400 rounded-xl p-6 text-center">
                <p className="font-black mb-2" style={{ fontSize: '60px', lineHeight: '1', color: '#7ED321' }}>90%</p>
                <p className="font-bold text-lg mb-1" style={{ color: '#2C3E50' }}>OCR Accuracy</p>
                <p className="text-sm text-gray-600">100+ receipts</p>
              </div>

              {/* Metric 2 */}
              <div className="bg-blue-50 border-3 border-blue-400 rounded-xl p-6 text-center">
                <p className="font-black mb-2" style={{ fontSize: '60px', lineHeight: '1', color: '#4A90E2' }}>92%</p>
                <p className="font-bold text-lg mb-1" style={{ color: '#2C3E50' }}>AI Category</p>
                <p className="text-sm text-gray-600">50+ samples</p>
              </div>

              {/* Metric 3 */}
              <div className="bg-purple-50 border-3 border-purple-400 rounded-xl p-6 text-center">
                <p className="font-black mb-2" style={{ fontSize: '48px', lineHeight: '1', color: '#9013FE' }}>&lt;200ms</p>
                <p className="font-bold text-lg mb-1" style={{ color: '#2C3E50' }}>API Response</p>
                <p className="text-sm text-gray-600">P95: 450ms</p>
              </div>

              {/* Metric 4 */}
              <div className="bg-cyan-50 border-3 border-cyan-400 rounded-xl p-6 text-center">
                <p className="font-black mb-2" style={{ fontSize: '60px', lineHeight: '1', color: '#50E3C2' }}>80%</p>
                <p className="font-bold text-lg mb-1" style={{ color: '#2C3E50' }}>Time Savings</p>
                <p className="text-sm text-gray-600">5h → 1h/week</p>
              </div>
            </div>
          </div>

          {/* 2️⃣ Technical Stack */}
          <div>
            <h2 className="font-bold text-3xl mb-4" style={{ color: '#9013FE' }}>Technology Stack</h2>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-3">
                  <p className="font-bold text-sm mb-1" style={{ color: '#4A90E2' }}>FRONTEND</p>
                  <p className="text-xs leading-relaxed">Next.js 14<br/>React 18<br/>TypeScript 5.3</p>
                </div>
                <div className="bg-green-100 border-2 border-green-400 rounded-lg p-3">
                  <p className="font-bold text-sm mb-1" style={{ color: '#7ED321' }}>BACKEND</p>
                  <p className="text-xs leading-relaxed">FastAPI<br/>Python 3.11<br/>Uvicorn</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-100 border-2 border-purple-400 rounded-lg p-3">
                  <p className="font-bold text-sm mb-1" style={{ color: '#9013FE' }}>DATABASE</p>
                  <p className="text-xs leading-relaxed">PostgreSQL<br/>Supabase<br/>Row-Level Security</p>
                </div>
                <div className="bg-orange-100 border-2 border-orange-400 rounded-lg p-3">
                  <p className="font-bold text-sm mb-1" style={{ color: '#FF9800' }}>AI/ML</p>
                  <p className="text-xs leading-relaxed">OpenAI GPT-4<br/>EasyOCR 1.7<br/>Pillow</p>
                </div>
              </div>

              <div className="bg-gray-100 border-2 border-gray-400 rounded-lg p-3 text-center">
                <p className="font-bold text-sm" style={{ color: '#2C3E50' }}>DEVOPS</p>
                <p className="text-xs">Docker • Git • Taiga • CI/CD</p>
              </div>
            </div>
          </div>

          {/* 3️⃣ Design Decisions */}
          <div>
            <h2 className="font-bold text-2xl mb-4" style={{ color: '#FF9800' }}>Key Design Decisions</h2>

            <div className="space-y-3 text-sm">
              <div className="bg-orange-50 p-3 rounded border-l-4 border-orange-500">
                <p className="font-bold mb-1">⚡ FastAPI over Flask</p>
                <p className="text-xs text-gray-700">→ 40% faster, superior async</p>
              </div>
              <div className="bg-orange-50 p-3 rounded border-l-4 border-orange-500">
                <p className="font-bold mb-1">⚡ EasyOCR over Tesseract</p>
                <p className="text-xs text-gray-700">→ 60% simpler deployment</p>
              </div>
              <div className="bg-orange-50 p-3 rounded border-l-4 border-orange-500">
                <p className="font-bold mb-1">⚡ Supabase over Self-Hosted</p>
                <p className="text-xs text-gray-700">→ Built-in RLS, auth, storage</p>
              </div>
              <div className="bg-orange-50 p-3 rounded border-l-4 border-orange-500">
                <p className="font-bold mb-1">⚡ Next.js App Router</p>
                <p className="text-xs text-gray-700">→ Server components, better perf</p>
              </div>
            </div>
          </div>

          {/* 4️⃣ Future Work */}
          <div>
            <h2 className="font-bold text-2xl mb-4" style={{ color: '#4A90E2' }}>Next Steps & Roadmap</h2>

            <div className="space-y-3">
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-300">
                <p className="font-bold text-xs mb-2" style={{ color: '#4A90E2' }}>📅 SPRINT 5-6 (Next Month)</p>
                <ul className="text-xs space-y-1">
                  <li>• Financial charts & visualizations</li>
                  <li>• Receipt image storage</li>
                  <li>• Enhanced categories</li>
                </ul>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-300">
                <p className="font-bold text-xs mb-2" style={{ color: '#9013FE' }}>📅 SPRINT 7-8 (Months 2-3)</p>
                <ul className="text-xs space-y-1">
                  <li>• Accounts Receivable/Payable</li>
                  <li>• Journal entry posting</li>
                  <li>• Trial balance calculations</li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
                <p className="font-bold text-xs mb-2" style={{ color: '#7ED321' }}>📅 SPRINT 9-10 (Final)</p>
                <ul className="text-xs space-y-1">
                  <li>• P&L & Balance Sheet reports</li>
                  <li>• Bank reconciliation</li>
                  <li>• Budget tracking</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 5️⃣ Security Metrics */}
          <div>
            <h2 className="font-bold text-xl mb-3" style={{ color: '#2C3E50' }}>🔒 SECURITY & QUALITY</h2>

            <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-300">
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Zero vulnerabilities found</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>JWT + Row-Level Security</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>OWASP compliance verified</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>100% test coverage on auth</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* BOTTOM FOOTER */}
      <div className="absolute bottom-8 left-12 right-12">
        <div className="bg-gray-900 text-white p-6 rounded-xl flex justify-between items-center">
          <div className="text-left">
            <p className="text-lg font-semibold mb-1">📧 Contact: adagar@asu.edu</p>
            <p className="text-sm">🔗 GitHub: github.com/azythromycin/Endless-Moments-AI-Financial-Companion</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold mb-1">🎥 VIDEO PRESENTATION:</p>
            <p className="text-lg text-yellow-300">[Add your Zoom link here after recording]</p>
            <p className="text-xs text-gray-400 mt-1">⬆️ CLICKABLE LINK - NO PASSWORD ⬆️</p>
          </div>
        </div>
      </div>

    </div>
  )
}
