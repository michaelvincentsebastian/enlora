import { useState, useRef, useEffect } from 'react'
import { CheckCircle, Circle, Loader2, ChevronRight, RefreshCw, AlertTriangle } from 'lucide-react'

// ── Step Definitions ────────────────────────────────────────────────────────
const STEPS = [
  { id: 'welcome',   label: 'Welcome',       subtitle: 'Prerequisites' },
  { id: 'infra',     label: 'Infrastructure', subtitle: 'Buckets & DBs' },
  { id: 'schema',    label: 'Schema',         subtitle: 'DuckLake' },
  { id: 'verify',    label: 'Verify',         subtitle: 'Health check' },
  { id: 'done',      label: 'Done',           subtitle: 'Launch' },
]

// ── Log Terminal ────────────────────────────────────────────────────────────
function LogLine({ msg }) {
  let cls = 'log-line'
  if (msg.startsWith('✅') || msg.startsWith('---')) cls += ' log-success'
  else if (msg.startsWith('❌')) cls += ' log-error'
  else if (msg.startsWith('💡')) cls += ' log-warn'
  else if (msg.startsWith('[*]')) cls += ' log-info'
  else cls += ' log-dim'
  return <span className={cls}>{msg}</span>
}

// ── Step Progress Header ────────────────────────────────────────────────────
function WizardHeader({ currentStep }) {
  const currentIdx = STEPS.findIndex(s => s.id === currentStep)
  return (
    <div className="wizard-steps">
      {STEPS.map((step, i) => {
        const completed = i < currentIdx
        const active = i === currentIdx
        return (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div className={`wizard-step${completed ? ' completed' : active ? ' active' : ''}`}
              style={{ flexDirection: 'column', alignItems: 'center', gap: 4, flex: 'none' }}>
              <div className="wizard-step-num">
                {completed ? <CheckCircle size={16} /> : i + 1}
              </div>
              <div className="wizard-step-label" style={{ fontSize: 'var(--text-xs)', textAlign: 'center' }}>
                {step.label}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`wizard-connector${completed ? ' done' : ''}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Step: Welcome ────────────────────────────────────────────────────────────
function WelcomeStep({ onNext }) {
  const prereqs = [
    { label: 'Docker running', detail: 'docker compose up (postgres + minio)' },
    { label: 'Python venv active', detail: 'pip install -r requirements.txt' },
    { label: 'Platform API running', detail: 'uvicorn platform.api.main:app --port 8001' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h2>Welcome to Enlora</h2>
        <p style={{ marginTop: 'var(--space-2)', lineHeight: 1.7 }}>
          This wizard will provision your data lakehouse in a few steps, replacing the manual
          interactive CLI (<code style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)',
          background: 'var(--color-bg-overlay)', padding: '2px 6px', borderRadius: 4 }}>lakehouse-setup.py</code>).
        </p>
      </div>

      <div className="card card-elevated">
        <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>
          Prerequisites
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {prereqs.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
              <CheckCircle size={16} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {p.label}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-mono)', marginTop: 2 }}>{p.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ background: 'rgba(59,158,255,0.04)', border: '1px solid rgba(59,158,255,0.15)' }}>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--color-accent-1)' }}>What this wizard does:</strong>
          <br />
          Creates 2 MinIO buckets (<code style={{ fontFamily: 'var(--font-mono)' }}>lake</code>,{' '}
          <code style={{ fontFamily: 'var(--font-mono)' }}>metadata</code>), 3 Postgres databases,
          attaches DuckLake catalogs, and creates the <code style={{ fontFamily: 'var(--font-mono)' }}>file_metadata</code> table.
          All operations are idempotent — safe to run multiple times.
        </div>
      </div>

      <button className="btn btn-primary btn-lg" onClick={onNext}>
        Let's go <ChevronRight size={18} />
      </button>
    </div>
  )
}

// ── Step: Infrastructure ────────────────────────────────────────────────────
function InfraStep({ onNext }) {
  const [logs, setLogs] = useState([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(false)
  const logRef = useRef(null)

  const appendLog = (msg) => setLogs(prev => [...prev, msg])

  const runSetup = async () => {
    setRunning(true)
    setLogs([])
    setDone(false)
    setError(false)
    try {
      const response = await fetch('/setup/full', { method: 'POST' })
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const payload = JSON.parse(line.replace('data:', '').trim())
              appendLog(payload.message)
            } catch {}
          }
          if (line.startsWith('event: done')) {
            setDone(true)
            setRunning(false)
          }
        }
      }
      if (!done) { setDone(true); setRunning(false) }
    } catch (e) {
      appendLog(`❌ Connection error: ${e.message}`)
      setError(true)
      setRunning(false)
    }
  }

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h2>Infrastructure Setup</h2>
        <p style={{ marginTop: 'var(--space-2)' }}>
          Create MinIO buckets and Postgres databases. All operations are idempotent.
        </p>
      </div>

      <div className="grid-2">
        {[
          { name: 'MinIO Buckets', items: ['lake', 'metadata'], icon: '🪣' },
          { name: 'Postgres Databases', items: ['metadata_db', 'sqlmesh_state_db', 'unstructure_metadata'], icon: '🐘' },
        ].map(group => (
          <div className="card card-elevated" key={group.name}>
            <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>
              {group.icon} {group.name}
            </div>
            {group.items.map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                marginBottom: 'var(--space-2)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%',
                  background: done ? 'var(--color-success)' : 'var(--color-border)' }} />
                <code style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)',
                  color: 'var(--color-text-secondary)' }}>{item}</code>
              </div>
            ))}
          </div>
        ))}
      </div>

      {logs.length > 0 && (
        <div className="log-terminal" ref={logRef}>
          {logs.map((l, i) => <LogLine key={i} msg={l} />)}
          {running && <span className="log-info">▋</span>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <button className="btn btn-primary" onClick={runSetup} disabled={running}>
          {running ? <><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> Running…</> : '⚡ Run Full Setup'}
        </button>
        {done && !error && (
          <button className="btn btn-secondary" onClick={onNext}>
            Continue <ChevronRight size={16} />
          </button>
        )}
        {error && (
          <button className="btn btn-ghost" onClick={runSetup}>
            <RefreshCw size={16} /> Retry
          </button>
        )}
      </div>

      {done && !error && (
        <div className="card" style={{ background: 'rgba(72,199,116,0.06)',
          border: '1px solid rgba(72,199,116,0.2)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <CheckCircle size={20} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--color-success)' }}>Infrastructure ready</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                All buckets and databases are provisioned.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Step: Schema ─────────────────────────────────────────────────────────────
function SchemaStep({ onNext }) {
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [detail, setDetail] = useState('')

  const run = async () => {
    setStatus('loading')
    try {
      const res = await fetch('/setup/schema', { method: 'POST' })
      const json = await res.json()
      if (json.status === 'ready' || json.status === 'exists') {
        setStatus('done')
        setDetail(json.status === 'exists' ? 'Table already existed — no changes.' : 'Table created successfully.')
      } else {
        setStatus('error')
        setDetail(json.detail || 'Unknown error')
      }
    } catch (e) {
      setStatus('error')
      setDetail(e.message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h2>DuckLake Schema</h2>
        <p style={{ marginTop: 'var(--space-2)' }}>
          Creates the <code style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)',
          background: 'var(--color-bg-overlay)', padding: '2px 6px', borderRadius: 4 }}>file_metadata</code> DuckLake table.
          Postgres stores the catalog; actual data is written as Parquet to MinIO.
        </p>
      </div>

      <div className="card card-elevated">
        <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Table: file_metadata</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
          {['id (UUID)', 'file_name', 'file_size', 'content_type', 'title', 'description',
            'source', 'tags (JSON)', 'bucket', 'object_key', 'minio_url', 'upload_status',
            'ingested_at'].map(col => (
            <div key={col} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-accent-1)', flexShrink: 0 }} />
              <code style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)',
                color: 'var(--color-text-secondary)' }}>{col}</code>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
          background: 'rgba(255,255,255,0.03)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-mono)' }}>
          Catalog: Postgres ({'"'}unstructure_metadata{'"'}) · Data: MinIO s3://metadata/
        </div>
      </div>

      {status === 'error' && (
        <div className="card" style={{ background: 'rgba(220,80,80,0.06)', border: '1px solid rgba(220,80,80,0.2)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <AlertTriangle size={18} style={{ color: 'var(--color-error)' }} />
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)' }}>{detail}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <button className="btn btn-primary" onClick={run}
          disabled={status === 'loading'}>
          {status === 'loading'
            ? <><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> Creating…</>
            : status === 'done' ? <><CheckCircle size={16} /> Done</> : '🦆 Create DuckLake Schema'}
        </button>
        {status === 'done' && (
          <button className="btn btn-secondary" onClick={onNext}>
            Continue <ChevronRight size={16} />
          </button>
        )}
      </div>

      {status === 'done' && (
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-success)' }}>
          ✅ {detail}
        </div>
      )}
    </div>
  )
}

// ── Step: Verify ─────────────────────────────────────────────────────────────
function VerifyStep({ onNext }) {
  const [checks, setChecks] = useState({})
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setLoading(true)
    try {
      const res = await fetch('/status')
      const data = await res.json()
      setChecks(data)
    } catch (e) {
      setChecks({ error: e.message })
    }
    setLoading(false)
  }

  const allGood = checks.provisioned === true

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h2>Verify Setup</h2>
        <p style={{ marginTop: 'var(--space-2)' }}>
          Run a final health check to confirm everything is provisioned correctly.
        </p>
      </div>

      {Object.keys(checks).length > 0 && (
        <div className="card card-elevated">
          {[
            { key: 'postgres', label: 'PostgreSQL' },
            { key: 'minio',    label: 'MinIO' },
          ].map(({ key, label }) => {
            const s = checks[key]?.status || 'offline'
            return (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-2)', background: 'var(--color-bg-overlay)' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{label}</span>
                <span className={`status-badge ${s}`}>
                  <span className={`status-dot ${s}`} />{s}
                </span>
              </div>
            )
          })}
          {checks.databases && Object.entries(checks.databases).map(([db, st]) => (
            <div key={db} style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-2)', background: 'var(--color-bg-overlay)' }}>
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)' }}>{db}</code>
              <span className={`status-badge ${st === 'exists' ? 'online' : 'offline'}`}>
                <span className={`status-dot ${st === 'exists' ? 'online' : 'offline'}`} />{st}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <button className="btn btn-primary" onClick={run} disabled={loading}>
          {loading ? <><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> Checking…</> : '🔍 Run Health Check'}
        </button>
        {allGood && (
          <button className="btn btn-secondary" onClick={onNext}>
            Finish <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Step: Done ───────────────────────────────────────────────────────────────
function DoneStep() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      textAlign: 'center', gap: 'var(--space-6)', padding: 'var(--space-8) 0' }}>
      <div style={{ fontSize: 64 }}>🎉</div>
      <div>
        <h2 className="gradient-text">Platform Ready!</h2>
        <p style={{ marginTop: 'var(--space-3)', maxWidth: 420, lineHeight: 1.7 }}>
          Your Enlora data lakehouse is fully provisioned. You can now upload files
          via Storage, explore the data lifecycle, and monitor your platform from the Dashboard.
        </p>
      </div>
      <div className="tech-tags">
        {['DuckDB ✓', 'DuckLake ✓', 'MinIO ✓', 'PostgreSQL ✓', 'SQLMesh ✓'].map(t => (
          <span className="tech-tag" key={t} style={{ color: 'var(--color-success)',
            borderColor: 'rgba(72,199,116,0.3)' }}>{t}</span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <a href="/dashboard" className="btn btn-primary btn-lg">Go to Dashboard</a>
        <a href="/storage" className="btn btn-secondary btn-lg">Upload Files</a>
      </div>
    </div>
  )
}

// ── Setup Page ───────────────────────────────────────────────────────────────
export default function Setup() {
  const [step, setStep] = useState('welcome')

  const stepOrder = STEPS.map(s => s.id)
  const next = () => {
    const idx = stepOrder.indexOf(step)
    if (idx < stepOrder.length - 1) setStep(stepOrder[idx + 1])
  }

  const STEP_COMPONENTS = {
    welcome: <WelcomeStep onNext={next} />,
    infra:   <InfraStep onNext={next} />,
    schema:  <SchemaStep onNext={next} />,
    verify:  <VerifyStep onNext={next} />,
    done:    <DoneStep />,
  }

  return (
    <div className="page-content">
      <div className="page-header fade-in">
        <h1>Setup <span className="gradient-text">Wizard</span></h1>
        <p>Provision your data lakehouse in a few guided steps — no terminal required.</p>
      </div>

      <div className="card fade-in" style={{ animationDelay: '0.05s', maxWidth: 760 }}>
        <WizardHeader currentStep={step} />
        <div className="divider" style={{ marginBottom: 'var(--space-8)' }} />
        {STEP_COMPONENTS[step]}
      </div>

      {/* Rebuild tools */}
      {step !== 'welcome' && step !== 'done' && (
        <details className="card fade-in" style={{ animationDelay: '0.1s', maxWidth: 760 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)', userSelect: 'none', padding: 'var(--space-2) 0' }}>
            🔧 Advanced: Rebuild individual components
          </summary>
          <div style={{ marginTop: 'var(--space-5)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            {[
              { label: 'Rebuild metadata_db', component: 'metadata_db' },
              { label: 'Rebuild sqlmesh_db', component: 'sqlmesh_db' },
              { label: 'Rebuild unstructure_metadata', component: 'unstructure_metadata_db' },
            ].map(({ label, component }) => (
              <button key={component} className="btn btn-danger btn-sm"
                onClick={async () => {
                  await fetch(`/setup/rebuild/${component}`, { method: 'POST' })
                  alert(`Rebuild of '${component}' started. Check server logs.`)
                }}>
                {label}
              </button>
            ))}
            <button className="btn btn-secondary btn-sm"
              onClick={async () => {
                await fetch('/setup/compact', { method: 'POST' })
                alert('Compaction started. Check server logs.')
              }}>
              🗜️ Compact Parquet Files
            </button>
          </div>
        </details>
      )}
    </div>
  )
}
