import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Filter, Activity,
  Settings as SettingsIcon, LogOut, BarChart3, CreditCard,
  Zap, TrendingUp, Sparkles, Crown, X, Sun, Moon
} from 'lucide-react'
import { api } from '../lib/api'
import { useBillingStatus } from '../hooks/useKpis'
import { useTheme } from '../hooks/useTheme'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  badge?: number
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',  path: '/',         icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Accounts',   path: '/accounts', icon: <Users className="h-4 w-4" /> },
  { label: 'Funnel',     path: '/funnel',   icon: <Filter className="h-4 w-4" /> },
  { label: 'Health',     path: '/health',   icon: <Activity className="h-4 w-4" /> },
  { label: 'Billing',    path: '/billing',  icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Settings',   path: '/settings', icon: <SettingsIcon className="h-4 w-4" /> },
]

type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise'

const PLAN_CONFIG: Record<PlanTier, {
  icon: React.ReactNode
  label: string
  classes: string
  dotColor: string
}> = {
  free: {
    icon: <Zap className="h-3 w-3" />,
    label: 'Free',
    classes: 'bg-slate-700/60 text-slate-300 ring-slate-600/40',
    dotColor: 'bg-slate-400',
  },
  starter: {
    icon: <TrendingUp className="h-3 w-3" />,
    label: 'Starter',
    classes: 'bg-blue-900/40 text-blue-300 ring-blue-700/30',
    dotColor: 'bg-blue-400',
  },
  pro: {
    icon: <Sparkles className="h-3 w-3" />,
    label: 'Pro',
    classes: 'bg-purple-900/40 text-purple-300 ring-purple-700/30',
    dotColor: 'bg-purple-400',
  },
  enterprise: {
    icon: <Crown className="h-3 w-3" />,
    label: 'Enterprise',
    classes: 'bg-amber-900/40 text-amber-300 ring-amber-700/30',
    dotColor: 'bg-amber-400',
  },
}

interface SideNavProps {
  open?: boolean
  onClose?: () => void
}

const SideNav: React.FC<SideNavProps> = ({ open = false, onClose }) => {
  const navigate = useNavigate()
  const { data: billing } = useBillingStatus()
  const { theme, toggleTheme } = useTheme()
  const plan = (billing?.plan as PlanTier) ?? null
  const usagePct = billing?.usagePct ?? 0

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout')
    } catch { /* ignore */ }
    navigate('/login')
  }

  const planMeta = plan ? PLAN_CONFIG[plan] : null

  return (
    <nav
      className={`fixed left-0 top-0 w-64 h-full bg-slate-900 dark:bg-slate-950 text-slate-100 border-r border-slate-800/80 z-40 shadow-2xl flex flex-col transition-transform duration-300 md:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      {/* Brand */}
      <div className="px-6 py-6 border-b border-slate-800/60 flex items-center justify-between">
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
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation items */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={() => onClose?.()}
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

      {/* Plan Badge */}
      {planMeta && (
        <div className="px-3 pb-3">
          <NavLink
            to="/billing"
            onClick={() => onClose?.()}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl ring-1 ${planMeta.classes} transition-all hover:opacity-90`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${planMeta.dotColor} shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider">{planMeta.label}</span>
                {planMeta.icon}
              </div>
              {plan !== 'enterprise' && (
                <div className="mt-1 h-1 rounded-full bg-slate-700/60 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      usagePct >= 90 ? 'bg-rose-500' : usagePct >= 70 ? 'bg-amber-400' : planMeta.dotColor
                    }`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              )}
              {plan === 'free' && (
                <p className="text-[10px] mt-0.5 opacity-70">Upgrade for more →</p>
              )}
            </div>
          </NavLink>
        </div>
      )}

      {/* Theme Toggle & Logout */}
      <div className="px-3 pb-4 pt-1 border-t border-slate-800/60 space-y-1">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all duration-150 group"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <div className="flex items-center gap-3">
            {theme === 'dark' ? (
              <Moon className="h-4 w-4 text-purple-400 group-hover:scale-110 transition-transform" />
            ) : (
              <Sun className="h-4 w-4 text-amber-400 group-hover:scale-110 transition-transform" />
            )}
            <span className="text-xs font-semibold">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
          </div>
          <div
            className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
              theme === 'dark' ? 'bg-purple-600 justify-end' : 'bg-slate-700 justify-start'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
          </div>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150 group"
        >
          <LogOut className="h-4 w-4 opacity-80 group-hover:opacity-100" />
          <span className="text-xs font-semibold">Sign Out</span>
        </button>
      </div>
    </nav>
  )
}

export default SideNav
