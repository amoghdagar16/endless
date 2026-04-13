import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#111',
    paddingTop: 40,
    paddingBottom: 36,
    paddingHorizontal: 48,
    backgroundColor: '#fff',
  },

  // ── Letterhead ──
  letterhead: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#111',
    borderBottomStyle: 'solid',
    marginBottom: 18,
    paddingBottom: 10,
    alignItems: 'center',
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  reportTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  reportDate: {
    fontSize: 9,
    color: '#555',
  },

  // ── Section L1 (Assets / Liabilities / Revenue…) ──
  sectionL1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.75,
    borderBottomColor: '#555',
    borderBottomStyle: 'solid',
    marginTop: 14,
    marginBottom: 3,
    paddingBottom: 2,
  },
  sectionL1Text: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // ── Section L2 (Current Assets / Fixed Assets…) ──
  sectionL2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 1,
    paddingLeft: 12,
  },
  sectionL2Text: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },

  // ── Account row ──
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 24,
    paddingVertical: 1.2,
  },
  accountName: {
    flex: 1,
    fontSize: 9,
    color: '#333',
  },
  accountAmount: {
    fontSize: 9,
    color: '#333',
    textAlign: 'right',
    minWidth: 70,
  },

  // ── Subtotal (Total Current Assets) ──
  totalCat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 12,
    paddingVertical: 2,
    borderTopWidth: 0.5,
    borderTopColor: '#888',
    borderTopStyle: 'solid',
    marginTop: 2,
  },
  totalCatText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },

  // ── Section total (Total Assets) ──
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderTopWidth: 1,
    borderTopColor: '#111',
    borderTopStyle: 'solid',
    marginTop: 4,
  },
  totalSectionText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
  },

  // ── Grand total (Total Liabilities & Equity / Net Income) ──
  totalGrand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTopWidth: 2,
    borderTopColor: '#111',
    borderTopStyle: 'solid',
    marginTop: 10,
  },
  totalGrandText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10.5,
  },

  // ── Italic note ──
  note: {
    paddingLeft: 24,
    fontSize: 8,
    color: '#666',
    fontFamily: 'Helvetica-Oblique',
    marginTop: 1,
  },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#ccc',
    borderTopStyle: 'solid',
    paddingTop: 5,
    fontSize: 7.5,
    color: '#777',
  },

  // ── Trial Balance table ──
  tbHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: '#111',
    borderBottomStyle: 'solid',
    paddingBottom: 3,
    marginBottom: 2,
  },
  tbRow: {
    flexDirection: 'row',
    paddingVertical: 1.5,
    borderBottomWidth: 0.25,
    borderBottomColor: '#ddd',
    borderBottomStyle: 'solid',
  },
  tbTotals: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: '#111',
    borderTopStyle: 'solid',
    marginTop: 3,
    paddingTop: 3,
  },
  tbCode:   { width: 60,  fontSize: 9, fontFamily: 'Helvetica-Bold' },
  tbName:   { flex: 1,   fontSize: 9 },
  tbDebit:  { width: 80,  fontSize: 9, textAlign: 'right' },
  tbCredit: { width: 80,  fontSize: 9, textAlign: 'right' },
  tbCodeH:  { width: 60,  fontSize: 9, fontFamily: 'Helvetica-Bold' },
  tbNameH:  { flex: 1,   fontSize: 9, fontFamily: 'Helvetica-Bold' },
  tbDebitH: { width: 80,  fontSize: 9, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  tbCreditH:{ width: 80,  fontSize: 9, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  if (n < 0) return `($${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDateDisplay(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionBlock({ title, data }: { title: string; data: any }) {
  if (!data || Object.keys(data.categories || {}).length === 0) return null
  return (
    <View>
      <View style={S.sectionL1}>
        <Text style={S.sectionL1Text}>{title}</Text>
      </View>
      {Object.entries<any>(data.categories).map(([catName, cat]) => (
        <View key={catName}>
          <View style={S.sectionL2}>
            <Text style={S.sectionL2Text}>{catName}</Text>
          </View>
          {cat.accounts.map((a: any, i: number) => (
            <View key={i} style={S.accountRow}>
              <Text style={S.accountName}>{a.account_code ? `${a.account_code} – ${a.account_name}` : a.account_name}</Text>
              <Text style={S.accountAmount}>{fmt(a.net_balance)}</Text>
            </View>
          ))}
          <View style={S.totalCat}>
            <Text style={S.totalCatText}>Total {catName}</Text>
            <Text style={S.totalCatText}>{fmt(cat.total)}</Text>
          </View>
        </View>
      ))}
      <View style={S.totalSection}>
        <Text style={S.totalSectionText}>Total {title}</Text>
        <Text style={S.totalSectionText}>{fmt(data.total)}</Text>
      </View>
    </View>
  )
}

function Footer({ companyName }: { companyName: string }) {
  return (
    <View style={S.footer} fixed>
      <Text>Accrual Basis · {companyName}</Text>
      <Text>Generated {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
    </View>
  )
}

function Letterhead({ company, title, subtitle }: { company: string; title: string; subtitle: string }) {
  return (
    <View style={S.letterhead}>
      <Text style={S.companyName}>{company}</Text>
      <Text style={S.reportTitle}>{title}</Text>
      <Text style={S.reportDate}>{subtitle}</Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Balance Sheet PDF
// ---------------------------------------------------------------------------

export function BalanceSheetPDF({ data, company, asOfDate }: { data: any; company: string; asOfDate: string }) {
  const s = data?.sections
  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Letterhead
          company={company}
          title="Balance Sheet"
          subtitle={`As of ${formatDateDisplay(asOfDate)}`}
        />
        {s && (
          <>
            <SectionBlock title="Assets" data={s.assets} />
            <SectionBlock title="Liabilities" data={s.liabilities} />
            <SectionBlock title="Equity" data={s.equity} />
            <View style={S.totalGrand}>
              <Text style={S.totalGrandText}>Total Liabilities & Equity</Text>
              <Text style={S.totalGrandText}>{fmt(s.liabilities_and_equity_total || 0)}</Text>
            </View>
          </>
        )}
        <Footer companyName={company} />
      </Page>
    </Document>
  )
}

// ---------------------------------------------------------------------------
// Profit & Loss PDF
// ---------------------------------------------------------------------------

export function ProfitLossPDF({ data, company, startDate, endDate }: {
  data: any; company: string; startDate: string; endDate: string
}) {
  const s = data?.sections
  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Letterhead
          company={company}
          title="Profit & Loss Statement"
          subtitle={`For the Period ${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)}`}
        />
        {s && (
          <>
            <SectionBlock title="Revenue" data={s.revenue} />
            {s.cost_of_goods_sold?.total !== 0 && s.cost_of_goods_sold?.total != null && (
              <SectionBlock title="Cost of Goods Sold" data={s.cost_of_goods_sold} />
            )}
            <View style={S.totalSection}>
              <Text style={S.totalSectionText}>Gross Profit</Text>
              <Text style={S.totalSectionText}>{fmt(s.gross_profit || 0)}</Text>
            </View>
            <SectionBlock title="Operating Expenses" data={s.operating_expenses} />
            {s.other_expenses?.total !== 0 && s.other_expenses?.total != null && (
              <SectionBlock title="Other Expenses" data={s.other_expenses} />
            )}
            <View style={S.totalSection}>
              <Text style={S.totalSectionText}>Total Expenses</Text>
              <Text style={S.totalSectionText}>{fmt(s.total_expenses || 0)}</Text>
            </View>
            <View style={S.totalGrand}>
              <Text style={S.totalGrandText}>Net Income</Text>
              <Text style={S.totalGrandText}>{fmt(s.net_income || 0)}</Text>
            </View>
          </>
        )}
        <Footer companyName={company} />
      </Page>
    </Document>
  )
}

// ---------------------------------------------------------------------------
// Cash Flow PDF
// ---------------------------------------------------------------------------

export function CashFlowPDF({ data, company, startDate, endDate }: {
  data: any; company: string; startDate: string; endDate: string
}) {
  const s = data?.sections
  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Letterhead
          company={company}
          title="Statement of Cash Flows"
          subtitle={`For the Period ${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)}`}
        />
        {s && (
          <>
            {/* Operating */}
            <View style={S.sectionL1}><Text style={S.sectionL1Text}>Operating Activities</Text></View>
            <View style={S.accountRow}>
              <Text style={S.accountName}>Net Income</Text>
              <Text style={S.accountAmount}>{fmt(s.operating?.net_income || 0)}</Text>
            </View>
            {s.operating?.adjustments?.length > 0 && (
              <>
                <Text style={S.note}>Adjustments for changes in working capital:</Text>
                {s.operating.adjustments.map((a: any, i: number) => (
                  <View key={i} style={S.accountRow}>
                    <Text style={S.accountName}>{a.account_code ? `${a.account_code} – ${a.account_name}` : a.account_name}</Text>
                    <Text style={S.accountAmount}>{fmt(a.amount)}</Text>
                  </View>
                ))}
              </>
            )}
            <View style={S.totalSection}>
              <Text style={S.totalSectionText}>Net Cash from Operating Activities</Text>
              <Text style={S.totalSectionText}>{fmt(s.operating?.total || 0)}</Text>
            </View>

            {/* Investing */}
            <View style={S.sectionL1}><Text style={S.sectionL1Text}>Investing Activities</Text></View>
            {s.investing?.items?.length > 0
              ? s.investing.items.map((a: any, i: number) => (
                  <View key={i} style={S.accountRow}>
                    <Text style={S.accountName}>{a.account_code ? `${a.account_code} – ${a.account_name}` : a.account_name}</Text>
                    <Text style={S.accountAmount}>{fmt(a.amount)}</Text>
                  </View>
                ))
              : <Text style={S.note}>No investing activity</Text>
            }
            <View style={S.totalSection}>
              <Text style={S.totalSectionText}>Net Cash from Investing Activities</Text>
              <Text style={S.totalSectionText}>{fmt(s.investing?.total || 0)}</Text>
            </View>

            {/* Financing */}
            <View style={S.sectionL1}><Text style={S.sectionL1Text}>Financing Activities</Text></View>
            {s.financing?.items?.length > 0
              ? s.financing.items.map((a: any, i: number) => (
                  <View key={i} style={S.accountRow}>
                    <Text style={S.accountName}>{a.account_code ? `${a.account_code} – ${a.account_name}` : a.account_name}</Text>
                    <Text style={S.accountAmount}>{fmt(a.amount)}</Text>
                  </View>
                ))
              : <Text style={S.note}>No financing activity</Text>
            }
            <View style={S.totalSection}>
              <Text style={S.totalSectionText}>Net Cash from Financing Activities</Text>
              <Text style={S.totalSectionText}>{fmt(s.financing?.total || 0)}</Text>
            </View>

            {/* Summary */}
            <View style={S.totalSection}>
              <Text style={S.totalSectionText}>Net Change in Cash</Text>
              <Text style={S.totalSectionText}>{fmt(s.net_change_in_cash || 0)}</Text>
            </View>
            <View style={S.accountRow}>
              <Text style={S.accountName}>Beginning Cash</Text>
              <Text style={S.accountAmount}>{fmt(s.beginning_cash || 0)}</Text>
            </View>
            <View style={S.totalGrand}>
              <Text style={S.totalGrandText}>Ending Cash</Text>
              <Text style={S.totalGrandText}>{fmt(s.ending_cash || 0)}</Text>
            </View>
          </>
        )}
        <Footer companyName={company} />
      </Page>
    </Document>
  )
}

// ---------------------------------------------------------------------------
// Trial Balance PDF
// ---------------------------------------------------------------------------

export function TrialBalancePDF({ data, company, asOfDate }: { data: any; company: string; asOfDate: string }) {
  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Letterhead
          company={company}
          title="Trial Balance"
          subtitle={`As of ${formatDateDisplay(asOfDate)}`}
        />
        {data?.accounts && (
          <>
            <View style={S.tbHeader}>
              <Text style={S.tbCodeH}>Code</Text>
              <Text style={S.tbNameH}>Account Name</Text>
              <Text style={S.tbDebitH}>Debit</Text>
              <Text style={S.tbCreditH}>Credit</Text>
            </View>
            {data.accounts.map((a: any, i: number) => (
              <View key={i} style={S.tbRow}>
                <Text style={S.tbCode}>{a.account_code}</Text>
                <Text style={S.tbName}>{a.account_name}</Text>
                <Text style={S.tbDebit}>{a.debit_total > 0 ? fmt(a.debit_total) : ''}</Text>
                <Text style={S.tbCredit}>{a.credit_total > 0 ? fmt(a.credit_total) : ''}</Text>
              </View>
            ))}
            <View style={S.tbTotals}>
              <Text style={S.tbCode}></Text>
              <Text style={{ ...S.tbName, fontFamily: 'Helvetica-Bold' }}>Totals</Text>
              <Text style={{ ...S.tbDebit, fontFamily: 'Helvetica-Bold' }}>{fmt(data.total_debits)}</Text>
              <Text style={{ ...S.tbCredit, fontFamily: 'Helvetica-Bold' }}>{fmt(data.total_credits)}</Text>
            </View>
          </>
        )}
        <Footer companyName={company} />
      </Page>
    </Document>
  )
}
