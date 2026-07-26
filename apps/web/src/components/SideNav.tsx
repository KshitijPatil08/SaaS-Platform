import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Filter, Activity, Settings as SettingsIcon, LogOut, BarChart3 } from 'lucide-react'
import { api } from '../lib/api'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  badge?: number
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',  path: '/',         icon: <LayoutDashboard className="h-4.5 w-4.5" /> },
  { label: 'Accounts',   path: '/accounts', icon: <Users className="h-4.5 w-4.5" /> },
  { label: 'Funnel',     path: '/funnel',   icon: <Filter className="h-4.5 w-4.5" /> },
  { label: 'Health',     path: '/health',   icon: <Activity className="h-4.5 w-4.5" /> },
  { label: 'Settings',   path: '/settings', icon: <SettingsIcon className="h-4.5 w-4.5" /> },
]

const SideNav: React.FC = () => {
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout')
    } catch { /* ignore */ }
    navigate('/login')
  }

  return (
    <nav className="fixed left-0 top-0 w-64 h-full bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-100 z-20 shadow-2xl flex flex-col">
      {/* Brand */}
      <div className="px-6 py-7 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent leading-none">
              Pulse
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5 tracking-wide uppercase">Analytics Suite</p>
          </div>
        </div>
      </div>

      {/* Navigation items */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-purple-600/20 text-purple-300 ring-1 ring-purple-500/30'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`
            }
          >
            <span className="opacity-80 group-hover:opacity-100">{item.icon}</span>
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-300">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>

      {/* Logout */}
      <div className="px-3 pb-4 pt-2 border-t border-slate-800/60">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150 group"
        >
          <LogOut className="h-4.5 w-4.5 opacity-80 group-hover:opacity-100" />
          <span>Sign Out</span>
        </button>
      </div>
    </nav>
  )
}

export default SideNav
