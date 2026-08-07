import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Wand2, Database, GitBranch, Plug, BarChart3,
  BookOpen, Users, Server, Bot, Network, Settings
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', badge: null },
  { to: '/setup', icon: Wand2, label: 'Setup Wizard', badge: null },
]

const CAPABILITY_ITEMS = [
  { to: '/connections', icon: Plug,          label: 'Connections',    color: 'var(--cap-connections)', coming: true },
  { to: '/storage',     icon: Database,       label: 'Storage',        color: 'var(--cap-storage)',     coming: false },
  { to: '/pipeline',    icon: GitBranch,      label: 'Pipeline',       color: 'var(--cap-pipeline)',    coming: true },
  { to: '/modeling',    icon: Network,        label: 'Data Modeling',  color: 'var(--cap-modeling)',    coming: true },
  { to: '/analytics',   icon: BarChart3,      label: 'Analytics',      color: 'var(--cap-analytics)',   coming: true },
  { to: '/catalog',     icon: BookOpen,       label: 'Catalog',        color: 'var(--cap-catalog)',     coming: true },
  { to: '/workspace',   icon: Users,          label: 'Workspace',      color: 'var(--cap-workspace)',   coming: true },
  { to: '/infrastructure', icon: Server,      label: 'Infrastructure', color: 'var(--cap-infra)',       coming: true },
  { to: '/ai',          icon: Bot,            label: 'AI Assistant',   color: 'var(--cap-ai)',          coming: true },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">E</div>
        <div>
          <div className="sidebar-brand">Enlora</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 1 }}>Data Platform</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon className="nav-icon" size={16} />
            {label}
          </NavLink>
        ))}

        <div className="sidebar-section-label">Capabilities</div>

        {CAPABILITY_ITEMS.map(({ to, icon: Icon, label, color, coming }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon className="nav-icon" size={16} style={{ color }} />
            {label}
            {coming && <span className="nav-badge coming">Soon</span>}
          </NavLink>
        ))}

        <div className="sidebar-section-label" style={{ marginTop: 'auto' }}>System</div>
        <div className="nav-item" style={{ cursor: 'not-allowed', opacity: 0.5 }}>
          <Settings className="nav-icon" size={16} />
          Settings
        </div>
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div className="status-dot online" />
          <span>v0.1.0 — Phase 1</span>
        </div>
      </div>
    </aside>
  )
}
