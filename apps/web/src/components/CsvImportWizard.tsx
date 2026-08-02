import React, { useState } from 'react'
import { api } from '../lib/api'
import { Upload, Check, AlertCircle, FileSpreadsheet, Play } from 'lucide-react'

export const CsvImportWizard: React.FC = () => {
  const [csvText, setCsvText] = useState(
    'name,email,plan,mrr_cents,status\nAcme Corp,contact@acme.io,pro,19900,active\nCyberdyne Systems,billing@cyberdyne.com,enterprise,49900,active\nWayne Enterprises,bruce@wayne.com,starter,4900,trialing'
  )
  const [importing, setImporting] = useState(false)
  const [resultMsg, setResultMsg] = useState<string | null>(null)

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setImporting(true)
    setResultMsg(null)

    try {
      const lines = csvText.trim().split('\n')
      if (lines.length <= 1) {
        setResultMsg('CSV text must contain a header row and at least one data row.')
        setImporting(false)
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const nameIdx = headers.indexOf('name')
      const emailIdx = headers.indexOf('email')
      const planIdx = headers.indexOf('plan')
      const mrrIdx = headers.indexOf('mrr_cents')
      const statusIdx = headers.indexOf('status')

      if (nameIdx === -1 || emailIdx === -1) {
        setResultMsg('CSV must include "name" and "email" columns.')
        setImporting(false)
        return
      }

      const rows = lines.slice(1).map(line => {
        const parts = line.split(',').map(p => p.trim())
        return {
          name: parts[nameIdx] || 'Customer',
          email: parts[emailIdx] || '',
          plan: planIdx !== -1 ? parts[planIdx] : 'starter',
          mrr_cents: mrrIdx !== -1 ? Number(parts[mrrIdx]) || 4900 : 4900,
          status: statusIdx !== -1 ? parts[statusIdx] : 'active',
        }
      }).filter(r => r.email.includes('@'))

      const res = await api.post('/api/export/import-csv', { rows })
      setResultMsg(res.data.message)
    } catch (err: any) {
      setResultMsg(err?.response?.data?.error || 'Failed to import CSV dataset')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 space-y-4">
      <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-700">
        <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
          <FileSpreadsheet className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Historical CSV Data Migration Wizard</h2>
          <p className="text-xs text-slate-400">Import historical customer & subscription data from Baremetrics, ProfitWell, or custom spreadsheets</p>
        </div>
      </div>

      {resultMsg && (
        <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 p-2.5 rounded-lg border border-purple-200 dark:border-purple-800">
          {resultMsg}
        </p>
      )}

      <form onSubmit={handleImport} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">CSV Content (Header: name,email,plan,mrr_cents,status)</label>
          <textarea
            rows={5}
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
            required
            className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={importing}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors shadow-md shadow-purple-500/20 disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {importing ? 'Importing Rows…' : 'Execute CSV Migration'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CsvImportWizard
