import React from 'react'
import { Link } from 'react-router-dom'
import '@pulse/web/styles/global.css'

interface INavItem {
  label: string
  path: string
  icon: string
  active?: boolean
}

const NAV_ITEMS: INavItem[] = [
  { label: 'Dashboard', path: '/', icon: 'dashboard', active: true },
  { label: 'Funnel', path: '/funnel', icon: 'funnel', active: false },
  { label: 'Health Ring', path: '/health', icon: 'ring', active: false },
  { label: 'Recent Accounts', path: '/accounts', icon: 'users', active: false },
  { label: 'Churn Risk', path: '/churn', icon: 'warning', active: false },
]

const SideNav: React.FC = () => {
  return (
    <nav className="fixed w-64 h-full bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 text-white">
      <div className="p-4 space-y-2">
        {NAV_ITEMS.map(item => (
          <div key={item.path} className="flex items-center px-3 hover:bg-opacity-10 transition-opacity group">
            <div className="group-hover:bg-opacity-20">
              <svg className="h-5 w-5 text-white group:after:absolute group:after:rounded-lg group:after:ml-2\/4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 3h-4v17h4zm-9.59 3.37l-2.38 2.38A2.4 2.4 0 0 1 8 15.6a2.4 2.4 0 0 1-3.41-2.06Z"/>
              </svg>
              <span className="text-xl font-semibold">{item.label}</span>
            </div>
            {item.active && <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 14 12">
              <line x1="1" y1="1" x2="13" y2="11"/>
            </svg>}
          </div>
        )}
      </div>
    </nav>
  )
}

export default SideNav