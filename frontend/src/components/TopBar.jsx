import { useLocation } from 'react-router-dom'
import StatusBadge from './StatusBadge'

const PAGE_META = {
  '/dashboard':      { title: 'Dashboard',       subtitle: 'Data lifecycle overview' },
  '/setup':          { title: 'Setup Wizard',     subtitle: 'Provision your lakehouse' },
  '/storage':        { title: 'Storage',          subtitle: 'Files · Artifacts · Lakehouse' },
  '/connections':    { title: 'Connections',      subtitle: 'DB · API · Files · Cloud' },
  '/pipeline':       { title: 'Pipeline',         subtitle: 'Transform · Schedule · Monitor' },
  '/modeling':       { title: 'Data Modeling',    subtitle: 'ERD · Schema · Lineage' },
  '/analytics':      { title: 'Analytics',        subtitle: 'BI · Dashboards · Notebooks' },
  '/catalog':        { title: 'Catalog',          subtitle: 'Metadata · Governance · Quality' },
  '/workspace':      { title: 'Workspace',        subtitle: 'Projects · Users · Resources' },
  '/infrastructure': { title: 'Infrastructure',   subtitle: 'Deploy · Scale · Resource Manager' },
  '/ai':             { title: 'AI Assistant',     subtitle: 'SQL · Pipeline · Explanation' },
}

export default function TopBar() {
  const { pathname } = useLocation()
  const meta = PAGE_META[pathname] || { title: 'Enlora', subtitle: '' }

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span className="topbar-title">{meta.title}</span>
        {meta.subtitle && (
          <span className="topbar-subtitle">{meta.subtitle}</span>
        )}
      </div>
      <div className="topbar-right">
        <StatusBadge />
      </div>
    </header>
  )
}
