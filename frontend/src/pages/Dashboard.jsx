import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import {
  Database, Server, HardDrive, Layers, ArrowRight,
  Plug, GitBranch, BarChart3, BookOpen, Users, Bot,
  Network, Wand2, Upload, RefreshCw
} from 'lucide-react'

// ── Pipeline Lifecycle Nodes ────────────────────────────────────────────────
const LIFECYCLE_NODES = [
  { id: 'connections', label: 'Connections', icon: Plug,      color: 'var(--cap-connections)', desc: 'Ingest',     path: '/connections' },
  { id: 'storage',     label: 'Storage',     icon: Database,  color: 'var(--cap-storage)',     desc: 'Land',       path: '/storage' },
  { id: 'pipeline',    label: 'Pipeline',    icon: GitBranch, color: 'var(--cap-pipeline)',    desc: 'Transform',  path: '/pipeline' },
  { id: 'modeling',    label: 'Modeling',    icon: Network,   color: 'var(--cap-modeling)',    desc: 'Model',      path: '/modeling' },
  { id: 'analytics',   label: 'Analytics',   icon: BarChart3, color: 'var(--cap-analytics)',   desc: 'Analyze',    path: '/analytics' },
  { id: 'catalog',     label: 'Catalog',     icon: BookOpen,  color: 'var(--cap-catalog)',     desc: 'Govern',     path: '/catalog' },
]

// ── Metrics Hook ───────────────────────────────────────────────────────────
function useStatus() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetch = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/status', { timeout: 5000 })
      setData(res.data)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch()
    const t = setInterval(fetch, 30000)
    return () => clearInterval(t)
  }, [])

  return { data, loading, refresh: fetch }
}

// ── Service Card ────────────────────────────────────────────────────────────
function ServiceHealthCard({ icon: Icon, name, detail, status, color }) {
  const s = status === 'online' ? 'online' : status === 'offline' ? 'offline' : 'pending'
  return (
    <div className="service-card">
      <div className="service-card-icon" style={{ background: `${color}18` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div className="service-card-info">
        <div className="service-card-name">{name}</div>
        <div className="service-card-detail">{detail}</div>
      </div>
      <span className={`status-badge ${s}`}>
        <span className={`status-dot ${s}`} />
        {s === 'pending' ? 'Checking…' : s}
      </span>
    </div>
  )
}

// ── DB Row ─────────────────────────────────────────────────────────────────
function DbRow({ name, status }) {
  const exists = status === 'exists'
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)',
      background: 'var(--color-bg-overlay)', gap: 'var(--space-3)' }}>
      <code style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)',
        fontFamily: 'var(--font-mono)' }}>{name}</code>
      <span className={`status-badge ${exists ? 'online' : 'offline'}`}>
        <span className={`status-dot ${exists ? 'online' : 'offline'}`} />
        {exists ? 'exists' : 'missing'}
      </span>
    </div>
  )
}

// ── Quick Actions ──────────────────────────────────────────────────────────
function QuickActions({ provisioned }) {
  return (
    <div className="card fade-in" style={{ animationDelay: '0.2s' }}>
      <div className="card-header">
        <div>
          <div className="card-title">Quick Actions</div>
          <div className="card-subtitle">Common tasks at a glance</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {!provisioned && (
          <Link to="/setup" className="btn btn-primary btn-lg" style={{ justifyContent: 'center' }}>
            <Wand2 size={18} /> Run Setup Wizard
          </Link>
        )}
        <Link to="/storage" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
          <Upload size={16} /> Upload Files
        </Link>
        <Link to="/storage" className="btn btn-ghost" style={{ justifyContent: 'center' }}>
          <Database size={16} /> Browse Artifacts
        </Link>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data, loading, refresh } = useStatus()

  const pg = data?.postgres || {}
  const minio = data?.minio || {}
  const databases = data?.databases || {}
  const buckets = data?.buckets || {}
  const provisioned = data?.provisioned || false

  const pgStatus   = loading ? 'pending' : pg.status   || 'offline'
  const minioStatus = loading ? 'pending' : minio.status || 'offline'

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header fade-in">
        <h1>
          <span className="gradient-text">Data Lifecycle</span> Overview
        </h1>
        <p>Monitor your platform health, services, and data pipeline status in real time.</p>
      </div>

      {/* Setup banner */}
      {!loading && !provisioned && (
        <div className="card fade-in" style={{
          background: 'linear-gradient(135deg, rgba(59,158,255,0.08), rgba(124,107,255,0.08))',
          border: '1px solid rgba(59,158,255,0.25)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--text-md)', color: 'var(--color-text-primary)' }}>
                🚀 Platform not fully provisioned
              </div>
              <p style={{ marginTop: 4, fontSize: 'var(--text-sm)' }}>
                Run the setup wizard to create your MinIO buckets, Postgres databases, and DuckLake schema.
              </p>
            </div>
            <Link to="/setup" className="btn btn-primary" style={{ flexShrink: 0 }}>
              <Wand2 size={16} /> Setup Wizard <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Lifecycle Pipeline */}
      <div className="card fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="card-header">
          <div>
            <div className="card-title">Data Lifecycle Pipeline</div>
            <div className="card-subtitle">9 capabilities · end-to-end data flow</div>
          </div>
        </div>
        <div className="pipeline-flow">
          {LIFECYCLE_NODES.map((node, i) => {
            const Icon = node.icon
            const isActive = node.id === 'storage'
            return (
              <>
                <Link to={node.path} className={`pipeline-node${isActive ? ' active' : ''}`} key={node.id}
                  style={{ textDecoration: 'none' }}>
                  <div className="pipeline-node-icon" style={{ background: `${node.color}18` }}>
                    <Icon size={16} style={{ color: node.color }} />
                  </div>
                  <div className="pipeline-node-label">{node.label}</div>
                  <div className="pipeline-node-status">{node.desc}</div>
                  {isActive && (
                    <div style={{ position: 'absolute', top: -6, right: -6 }}>
                      <span className="status-badge online" style={{ fontSize: 9, padding: '1px 5px' }}>
                        <span className="status-dot online" style={{ width: 5, height: 5 }} />
                        live
                      </span>
                    </div>
                  )}
                </Link>
                {i < LIFECYCLE_NODES.length - 1 && (
                  <div className="pipeline-arrow" key={`arrow-${i}`}>
                    <ArrowRight size={14} />
                  </div>
                )}
              </>
            )
          })}
          <div className="pipeline-arrow"><ArrowRight size={14} /></div>
          <Link to="/workspace" className="pipeline-node" style={{ textDecoration: 'none' }}>
            <div className="pipeline-node-icon" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <Users size={16} style={{ color: 'var(--cap-workspace)' }} />
            </div>
            <div className="pipeline-node-label">Workspace</div>
            <div className="pipeline-node-status">Collaborate</div>
          </Link>
        </div>
      </div>

      {/* Metrics + Services */}
      <div className="grid-2 fade-in" style={{ animationDelay: '0.1s' }}>
        {/* Services */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Service Health</div>
              <div className="card-subtitle">Live infrastructure status</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={refresh} disabled={loading}
              data-tooltip="Refresh status">
              <RefreshCw size={14} style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <ServiceHealthCard
              icon={Server}
              name="PostgreSQL 16"
              detail={`${pg.host || 'localhost'}:${pg.port || 5432}`}
              status={pgStatus}
              color="var(--color-accent-1)"
            />
            <ServiceHealthCard
              icon={HardDrive}
              name="MinIO"
              detail={minio.endpoint || 'http://localhost:9000'}
              status={minioStatus}
              color="var(--cap-connections)"
            />
            <ServiceHealthCard
              icon={Layers}
              name="DuckDB + DuckLake"
              detail="Embedded compute engine"
              status={provisioned ? 'online' : 'offline'}
              color="var(--cap-pipeline)"
            />
          </div>
        </div>

        {/* Databases + Buckets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Databases</div>
              <span className={`status-badge ${pgStatus}`}>
                <span className={`status-dot ${pgStatus}`} />PostgreSQL
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {Object.entries(databases).length > 0
                ? Object.entries(databases).map(([name, status]) => (
                    <DbRow key={name} name={name} status={status} />
                  ))
                : ['metadata_db', 'sqlmesh_state_db', 'unstructure_metadata'].map(n => (
                    <DbRow key={n} name={n} status="unknown" />
                  ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Buckets</div>
              <span className={`status-badge ${minioStatus}`}>
                <span className={`status-dot ${minioStatus}`} />MinIO
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {Object.entries(buckets).length > 0
                ? Object.entries(buckets).map(([name, status]) => (
                    <DbRow key={name} name={name} status={status} />
                  ))
                : ['lake', 'metadata'].map(n => (
                    <DbRow key={n} name={n} status="unknown" />
                  ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions + AI teaser */}
      <div className="grid-2 fade-in" style={{ animationDelay: '0.15s' }}>
        <QuickActions provisioned={provisioned} />

        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(72,199,116,0.04), rgba(0,0,0,0))',
          border: '1px solid rgba(72,199,116,0.12)',
        }}>
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bot size={18} style={{ color: 'var(--cap-ai)' }} /> AI Assistant
              </div>
              <div className="card-subtitle">Coming in Phase 3</div>
            </div>
            <span className="roadmap-phase">Phase 3</span>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
            Natural-language SQL generation, pipeline auto-builder, data quality explanations,
            and schema recommendations — powered by your own models or OpenAI.
          </p>
          <div className="tech-tags" style={{ marginTop: 'var(--space-4)' }}>
            {['LLM', 'SQL Gen', 'Pipeline AI', 'RAG', 'LangChain'].map(t => (
              <span className="tech-tag" key={t}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
