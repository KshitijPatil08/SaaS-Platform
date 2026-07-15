import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Filter, Activity, Users, AlertTriangle } from 'lucide-react'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  badge?: number
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Funnel', path: '/funnel', icon: <Filter className="h-5 w-5" /> },
  { label: 'Health Ring', path: '/health', icon: <Activity className="h-5 w-5" /> },
  { label: 'Recent Accounts', path: '/accounts', icon: <Users className="h-5 w-5" />, badge: 12 },
  { label: 'Churn Risk', path: '/churn', icon: <AlertTriangle className="h-5 w-5" />, badge: 3 },
]

const SideNav: React.FC = () => {
  return (
    <nav className="fixed left-0 top-0 w-64 h-full bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-100 z-20 shadow-2xl">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-glow bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
          Pulse
        </h2>
        <p className="text-xs text-slate-400 mt-1">Analytics Suite</p>
      </div>
      <div className="px-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-purple-600/20 text-purple-300 border-l-4 border-purple-500'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`
            }
          >
            {item.icon}
            <span className="text-sm font-medium">{item.label}</span>
            {item.badge && (
              <span className="ml-auto px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default SideNav
