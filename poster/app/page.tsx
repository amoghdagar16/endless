export default function Poster() {
  return (
    <div className="w-[1920px] h-[2700px] bg-white mx-auto relative overflow-hidden print:m-0">
      {/* Header with Title and Team ID */}
      <div className="pt-12 px-16">
        <div className="flex justify-between items-start mb-8">
          <div className="flex-1">
            <h1 className="text-6xl font-bold text-gray-900 mb-3">
              AI Financial Companion
            </h1>
            <p className="text-3xl text-gray-600 font-medium">MiniBooks</p>
          </div>
          <div className="border-4 border-gray-900 px-8 py-4 bg-gray-50">
            <p className="text-xl font-semibold text-gray-700 mb-1">Team ID</p>
            <p className="text-4xl font-bold text-gray-900">ENDLESS</p>
          </div>
        </div>
      </div>

      {/* Team Members & Sponsor Section */}
      <div className="px-16 mb-10">
        <div className="grid grid-cols-2 gap-8">
          {/* Team Members */}
          <div className="bg-blue-50 p-8 rounded-2xl border-2 border-blue-200">
            <h2 className="text-3xl font-bold text-blue-900 mb-6 flex items-center gap-3">
              <span>👥</span> Team Members
            </h2>
            <div className="space-y-4">
              <TeamMember name="Amogh Dagar" role="Frontend Lead" />
              <TeamMember name="Satya Neriyanuru" role="Backend Lead" />
              <TeamMember name="Atiman Rohtagi" role="ML/OCR Engineer" />
              <TeamMember name="Ashish Kumar" role="Frontend Developer" />
              <TeamMember name="Dhruv Bhatt" role="Full Stack Developer" />
            </div>
          </div>

          {/* Sponsor & Logo */}
          <div className="space-y-6">
            <div className="bg-yellow-50 p-8 rounded-2xl border-2 border-yellow-200">
              <h2 className="text-3xl font-bold text-yellow-900 mb-4 flex items-center gap-3">
                <span>🏢</span> Sponsor
              </h2>
              <p className="text-2xl font-semibold text-gray-800">Endless Moments LLC</p>
              <p className="text-lg text-gray-600 mt-2">Innovation in Financial Technology</p>
            </div>

            <div className="bg-maroon-50 p-8 rounded-2xl border-2 border-maroon-200 flex items-center justify-center h-[180px]">
              <div className="text-center">
                <p className="text-5xl font-bold text-maroon-800">ASU</p>
                <p className="text-xl text-gray-600 mt-2">Arizona State University</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Overview */}
      <div className="px-16 mb-10">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-8 rounded-2xl border-2 border-purple-200">
          <h2 className="text-4xl font-bold text-purple-900 mb-6 flex items-center gap-3">
            <span>🎯</span> Project Overview
          </h2>
          <div className="grid grid-cols-3 gap-6">
            <OverviewCard
              icon="❗"
              title="Problem"
              content="Small businesses struggle with complex accounting software that requires extensive training and lacks intelligent automation"
            />
            <OverviewCard
              icon="💡"
              title="Solution"
              content="AI-powered financial platform combining QuickBooks-style functionality with intelligent OCR, automated categorization, and natural language queries"
            />
            <OverviewCard
              icon="🎯"
              title="Target Users"
              content="Small business owners, freelancers, and accountants seeking simplified financial management with AI assistance"
            />
          </div>
        </div>
      </div>

      {/* Customer Archetypes */}
      <div className="px-16 mb-10">
        <div className="bg-green-50 p-8 rounded-2xl border-2 border-green-200">
          <h2 className="text-4xl font-bold text-green-900 mb-6 flex items-center gap-3">
            <span>👤</span> Customer Archetypes
          </h2>
          <div className="grid grid-cols-3 gap-6">
            <PersonaCard
              emoji="👔"
              name="Small Business Owner"
              traits={["Needs quick expense tracking", "Limited accounting knowledge", "Values automation"]}
            />
            <PersonaCard
              emoji="💼"
              name="Freelance Consultant"
              traits={["Multiple clients/projects", "Receipt management pain", "Tax preparation focus"]}
            />
            <PersonaCard
              emoji="📊"
              name="Startup Accountant"
              traits={["Manages multiple entities", "Needs AI validation", "Real-time insights required"]}
            />
          </div>
        </div>
      </div>

      {/* EPICs & Backlog */}
      <div className="px-16 mb-10">
        <div className="bg-orange-50 p-8 rounded-2xl border-2 border-orange-200">
          <h2 className="text-4xl font-bold text-orange-900 mb-6 flex items-center gap-3">
            <span>📋</span> EPICs & Backlog <span className="text-2xl text-orange-700">(60% Complete)</span>
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <EpicCard
              icon="✅"
              title="Core Accounting System"
              status="100%"
              items={["Double-entry bookkeeping", "Vendor management", "Bill tracking", "Journal entries"]}
            />
            <EpicCard
              icon="✅"
              title="AI-Powered OCR Parser"
              status="100%"
              items={["Receipt image parsing", "PDF document support", "Field extraction", "Multi-format support"]}
            />
            <EpicCard
              icon="✅"
              title="AI Expense Validation"
              status="90%"
              items={["OpenAI integration", "Category suggestions", "Vendor normalization", "Anomaly detection"]}
            />
            <EpicCard
              icon="⏳"
              title="Advanced Analytics"
              status="40%"
              items={["Spending insights", "Category breakdowns", "Vendor analysis", "Trend forecasting"]}
            />
          </div>
        </div>
      </div>

      {/* Design & Architecture */}
      <div className="px-16 mb-10">
        <div className="bg-indigo-50 p-8 rounded-2xl border-2 border-indigo-200">
          <h2 className="text-4xl font-bold text-indigo-900 mb-6 flex items-center gap-3">
            <span>🏗️</span> System Architecture
          </h2>
          <div className="flex justify-center items-center gap-8 py-6">
            <ArchitectureLayer
              title="Presentation Layer"
              tech="Next.js 14 + TypeScript + Tailwind CSS"
              color="bg-blue-100 border-blue-400"
            />
            <div className="text-4xl text-gray-400">→</div>
            <ArchitectureLayer
              title="Business Logic Layer"
              tech="FastAPI + Python + AI Services"
              color="bg-green-100 border-green-400"
            />
            <div className="text-4xl text-gray-400">→</div>
            <ArchitectureLayer
              title="Data Layer"
              tech="Supabase (PostgreSQL) + Storage"
              color="bg-purple-100 border-purple-400"
            />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div className="bg-white p-4 rounded-lg border border-gray-300">
              <p className="font-semibold text-gray-800">🤖 EasyOCR</p>
              <p className="text-sm text-gray-600">Receipt Parsing</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-300">
              <p className="font-semibold text-gray-800">🧠 OpenAI GPT-4</p>
              <p className="text-sm text-gray-600">Expense Validation</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-300">
              <p className="font-semibold text-gray-800">📊 Recharts</p>
              <p className="text-sm text-gray-600">Data Visualization</p>
            </div>
          </div>
        </div>
      </div>

      {/* Preliminary Results */}
      <div className="px-16 mb-10">
        <div className="bg-teal-50 p-8 rounded-2xl border-2 border-teal-200">
          <h2 className="text-4xl font-bold text-teal-900 mb-6 flex items-center gap-3">
            <span>📈</span> Preliminary Results & Key Metrics
          </h2>
          <div className="grid grid-cols-4 gap-6">
            <MetricCard
              value="95%"
              label="OCR Accuracy"
              trend="↑"
              color="text-green-600"
            />
            <MetricCard
              value="87%"
              label="AI Categorization Accuracy"
              trend="↑"
              color="text-blue-600"
            />
            <MetricCard
              value="3.2s"
              label="Avg Processing Time"
              trend="↓"
              color="text-purple-600"
            />
            <MetricCard
              value="100%"
              label="Double-Entry Validation"
              trend="✓"
              color="text-teal-600"
            />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg border border-gray-300">
              <h3 className="font-bold text-lg mb-2">📄 Test Dataset</h3>
              <p className="text-gray-700">200+ receipts processed across various formats (PNG, PDF, JPG)</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-300">
              <h3 className="font-bold text-lg mb-2">🎯 User Testing</h3>
              <p className="text-gray-700">5 beta users, 300+ expenses tracked, positive feedback on AI suggestions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Future Work */}
      <div className="px-16 mb-12">
        <div className="bg-rose-50 p-8 rounded-2xl border-2 border-rose-200">
          <h2 className="text-4xl font-bold text-rose-900 mb-6 flex items-center gap-3">
            <span>🚀</span> Future Work & Roadmap
          </h2>
          <div className="grid grid-cols-3 gap-6">
            <PhaseCard
              phase="Sprint 4-5"
              title="Advanced Analytics"
              items={["Predictive spending models", "Budget recommendations", "Cash flow forecasting", "Custom report builder"]}
            />
            <PhaseCard
              phase="Sprint 6-7"
              title="Multi-tenant & Auth"
              items={["User authentication", "Role-based access", "Multi-company support", "Audit logging"]}
            />
            <PhaseCard
              phase="Sprint 8+"
              title="Enterprise Features"
              items={["Bank integrations", "Tax form generation", "Mobile app (React Native)", "API marketplace"]}
            />
          </div>
        </div>
      </div>

      {/* Footer with Video Link */}
      <div className="px-16 pb-10">
        <div className="bg-gray-800 text-white p-6 rounded-2xl text-center">
          <p className="text-2xl font-bold mb-2">🎥 Project Demo Video</p>
          <p className="text-xl text-gray-300">https://youtu.be/[VIDEO-ID-PLACEHOLDER]</p>
          <p className="text-sm text-gray-400 mt-3">Scan QR code or visit link for full demonstration</p>
        </div>
      </div>
    </div>
  )
}

// Component definitions
function TeamMember({ name, role }: { name: string; role: string }) {
  return (
    <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-blue-200">
      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
      <div>
        <p className="font-bold text-gray-900 text-lg">{name}</p>
        <p className="text-gray-600 text-sm">{role}</p>
      </div>
    </div>
  )
}

function OverviewCard({ icon, title, content }: { icon: string; title: string; content: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border-2 border-purple-200">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-xl font-bold text-purple-900 mb-2">{title}</h3>
      <p className="text-gray-700 text-base leading-relaxed">{content}</p>
    </div>
  )
}

function PersonaCard({ emoji, name, traits }: { emoji: string; name: string; traits: string[] }) {
  return (
    <div className="bg-white p-6 rounded-xl border-2 border-green-200">
      <div className="text-5xl mb-3 text-center">{emoji}</div>
      <h3 className="text-xl font-bold text-green-900 mb-3 text-center">{name}</h3>
      <ul className="space-y-2">
        {traits.map((trait, idx) => (
          <li key={idx} className="text-gray-700 text-sm flex items-start gap-2">
            <span className="text-green-600 mt-1">•</span>
            <span>{trait}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function EpicCard({ icon, title, status, items }: { icon: string; title: string; status: string; items: string[] }) {
  return (
    <div className="bg-white p-6 rounded-xl border-2 border-orange-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold text-orange-900 flex items-center gap-2">
          <span>{icon}</span> {title}
        </h3>
        <span className="text-lg font-bold text-orange-600">{status}</span>
      </div>
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li key={idx} className="text-gray-700 text-sm flex items-start gap-2">
            <span className="text-orange-500 mt-1">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ArchitectureLayer({ title, tech, color }: { title: string; tech: string; color: string }) {
  return (
    <div className={`${color} border-2 p-6 rounded-xl w-64 text-center`}>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-sm text-gray-700">{tech}</p>
    </div>
  )
}

function MetricCard({ value, label, trend, color }: { value: string; label: string; trend: string; color: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border-2 border-teal-200 text-center">
      <div className={`text-4xl font-bold ${color} mb-2`}>{value}</div>
      <p className="text-gray-700 font-semibold text-sm mb-1">{label}</p>
      <span className="text-2xl">{trend}</span>
    </div>
  )
}

function PhaseCard({ phase, title, items }: { phase: string; title: string; items: string[] }) {
  return (
    <div className="bg-white p-6 rounded-xl border-2 border-rose-200">
      <div className="text-sm font-bold text-rose-600 mb-2">{phase}</div>
      <h3 className="text-xl font-bold text-rose-900 mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li key={idx} className="text-gray-700 text-sm flex items-start gap-2">
            <span className="text-rose-500 mt-1">→</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
