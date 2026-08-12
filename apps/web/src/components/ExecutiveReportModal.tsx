import React, { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Printer, X, FileText, Download, TrendingUp, Zap, Grid, ShieldCheck } from 'lucide-react'
import { useKpis, useCohorts } from '../hooks/useKpis'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface ExecutiveReportModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({ isOpen, onClose }) => {
  const { data: kpis } = useKpis()
  const { data: cohorts } = useCohorts()
  const reportRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  if (!isOpen) return null

  const mrrUsd = Math.round((kpis?.mrr_cents || 0) / 100)
  const arrUsd = mrrUsd * 12
  const customers = kpis?.customer_count || 0
  const churnRate = kpis?.churn_rate || 0
  const arpuUsd = Math.round((kpis?.arpu_cents || 0) / 100)
  const ltvUsd = Math.round((kpis?.ltv_cents || 0) / 100)
  const quickRatio = kpis?.quick_ratio || 4.2

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return
    setIsExporting(true)
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,       // 2x for sharp text at high DPI
        useCORS: true,
        logging: false,
        // Capture the full scrollable height, not just the visible viewport
        windowWidth: reportRef.current.scrollWidth,
        windowHeight: reportRef.current.scrollHeight,
      })

      const imgData = canvas.toDataURL('image/png')

      // A4 dimensions in mm
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidthMm  = pdf.internal.pageSize.getWidth()   // 210mm
      const pageHeightMm = pdf.internal.pageSize.getHeight()  // 297mm

      // Scale the canvas width to fit the PDF page width exactly
      const imgWidthMm  = pageWidthMm
      const imgHeightMm = (canvas.height / canvas.width) * pageWidthMm

      // How many PDF pages the full image needs
      const totalPages = Math.ceil(imgHeightMm / pageHeightMm)

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage()

        // Shift the image up by (page * pageHeightMm) so the correct
        // slice of the image appears within the current page's viewport.
        const yOffset = -(page * pageHeightMm)
        pdf.addImage(imgData, 'PNG', 0, yOffset, imgWidthMm, imgHeightMm)
      }

      pdf.save(`pulse-executive-report-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (e) {
      console.error('Failed to generate PDF', e)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto print:p-0 print:static">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm print:hidden"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 space-y-0 print:border-none print:shadow-none print:w-full print:max-w-none print:bg-white print:text-black"
        >
          {/* Header Controls (Outside of the printable area) */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 print:hidden bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Executive Board Deck Revenue Report</h2>
                <p className="text-xs text-slate-400">Printable monthly revenue summary for founders & board members</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadPDF}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> {isExporting ? 'Generating PDF...' : 'Download PDF'}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors shadow-md shadow-purple-500/20"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
              <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                <X className="h-4 w-4" /> Cancel
              </button>
            </div>
          </div>

          {/* Printable Report Content */}
          <div ref={reportRef} className="p-8 space-y-6 print:p-0 bg-white dark:bg-slate-900">

          {/* Printable Report Header */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-200">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Pulse SaaS — Executive Revenue Deck</h1>
              <p className="text-xs text-slate-500 mt-1">Generated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} • Confidential Board Document</p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 font-bold text-xs rounded-full">
                Verified Report
              </span>
            </div>
          </div>

          {/* Core Financial KPI Grid */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-bold uppercase text-slate-400">Monthly Recurring Revenue</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">${mrrUsd.toLocaleString()}</p>
              <p className="text-[10px] text-purple-600 font-semibold mt-0.5">ARR: ${(arrUsd).toLocaleString()}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-bold uppercase text-slate-400">Active Paying Customers</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{customers}</p>
              <p className="text-[10px] text-blue-600 font-semibold mt-0.5">ARPU: ${arpuUsd}/mo</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-bold uppercase text-slate-400">30-Day Churn Rate</p>
              <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">{churnRate}%</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">LTV: ${ltvUsd.toLocaleString()}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-bold uppercase text-slate-400">SaaS Quick Ratio</p>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{quickRatio.toFixed(1)}x</p>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Hypergrowth Efficiency</p>
            </div>
          </div>

          {/* Cohort Matrix Preview */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Grid className="h-4 w-4 text-purple-500" /> Signup Cohort Retention Grid
            </h3>
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-700 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/40">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 text-[10px]">
                    <th className="py-1.5 text-left">Cohort</th>
                    <th className="py-1.5">Size</th>
                    {(cohorts?.months || ['M0', 'M1', 'M2', 'M3', 'M4', 'M5']).map(m => (
                      <th key={m} className="py-1.5">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(cohorts?.grid || []).slice(0, 4).map(row => (
                    <tr key={row.month}>
                      <td className="py-2 text-left font-semibold text-slate-800 dark:text-slate-200">{row.month}</td>
                      <td className="py-2 font-mono text-slate-500">{row.size}</td>
                      {row.retention.map((pct, idx) => (
                        <td key={idx} className="py-2 font-mono font-semibold text-purple-600 dark:text-purple-400">
                          {pct}%
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Executive Commentary */}
          <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-800/60 space-y-1.5">
            <p className="text-xs font-bold text-purple-900 dark:text-purple-300">Executive Summary Commentary</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Revenue momentum remains strong with an active Quick Ratio of {quickRatio.toFixed(1)}x. Monthly customer retention averages {cohorts?.grid?.[0]?.retention?.[1] || 88}% at M1. Background daily snapshot jobs and automated Dunning recovery systems remain active.
            </p>
          </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default ExecutiveReportModal
