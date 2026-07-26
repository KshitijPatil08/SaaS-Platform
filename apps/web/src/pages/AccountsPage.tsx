import React from 'react'
import AccountsTable from '../components/AccountsTable'

const AccountsPage: React.FC = () => {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Accounts & Customers</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Explore and filter all customer accounts, MRR metrics, billing cycles, and health statuses.
        </p>
      </div>

      <AccountsTable />
    </div>
  )
}

export default AccountsPage
