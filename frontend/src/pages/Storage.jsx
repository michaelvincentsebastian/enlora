import { useState, useCallback } from 'react'
import { Upload, FileText, Image, Film, Archive, X, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react'

const STORAGE_API = ''

function fileIcon(ext) {
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return <Image size={14} />
  if (['mp4','mov','avi','mkv'].includes(ext)) return <Film size={14} />
  if (['zip','tar','gz','rar'].includes(ext)) return <Archive size={14} />
  return <FileText size={14} />
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

// ── Drop Zone ────────────────────────────────────────────────────────────────
function DropZone({ onFiles }) {
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback(e => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) onFiles(files)
  }, [onFiles])

  const handleChange = useCallback(e => {
    const files = Array.from(e.target.files)
    if (files.length) onFiles(files)
  }, [onFiles])

  return (
    <label
      className={`dropzone${dragging ? ' drag-over' : ''}`}
      htmlFor="file-input"
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{ cursor: 'pointer' }}
    >
      <div className="dropzone-icon">
        {dragging ? '📂' : '☁️'}
      </div>
      <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
        Drop files here to upload
      </div>
      <p style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
        or click to browse — any file type supported
      </p>
      <input id="file-input" type="file" multiple hidden onChange={handleChange} />
    </label>
  )
}

// ── Upload Queue Item ─────────────────────────────────────────────────────────
function UploadItem({ item, onRemove }) {
  const ext = item.file.name.split('.').pop()?.toLowerCase()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
      padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)',
      background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
      <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)',
        background: 'rgba(59,158,255,0.1)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: 'var(--color-accent-1)', flexShrink: 0 }}>
        {fileIcon(ext)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.file.name}
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          {formatSize(item.file.size)}
        </div>
      </div>
      {item.status === 'pending' && (
        <button className="btn btn-ghost btn-sm" onClick={() => onRemove(item.id)}>
          <X size={14} />
        </button>
      )}
      {item.status === 'uploading' && <Loader2 size={16} style={{ color: 'var(--color-accent-1)', animation: 'spin 0.7s linear infinite' }} />}
      {item.status === 'done' && <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />}
      {item.status === 'error' && <AlertCircle size={16} style={{ color: 'var(--color-error)' }} title={item.error} />}
    </div>
  )
}

// ── Artifact Table ────────────────────────────────────────────────────────────
function ArtifactTable({ artifacts }) {
  if (!artifacts) return null
  if (artifacts.length === 0) return (
    <div className="empty-state">
      <div className="empty-state-icon">📭</div>
      <div className="empty-state-title">No artifacts yet</div>
      <div className="empty-state-desc">Upload your first file to see it here.</div>
    </div>
  )

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table">
        <thead>
          <tr>
            <th>File</th>
            <th>Title</th>
            <th>Source</th>
            <th>Size</th>
            <th>Uploaded</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {artifacts.map(a => {
            const ext = a.file_name?.split('.').pop()?.toLowerCase()
            return (
              <tr key={a.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ color: 'var(--color-accent-1)' }}>{fileIcon(ext)}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                      {a.file_name}
                    </span>
                  </div>
                </td>
                <td>{a.title || '—'}</td>
                <td><span className="chip">{a.source || '—'}</span></td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatSize(a.file_size)}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                  {formatDate(a.ingested_at)}
                </td>
                <td>
                  <span className={`status-badge ${a.upload_status === 'completed' ? 'online' : 'offline'}`}>
                    <span className={`status-dot ${a.upload_status === 'completed' ? 'online' : 'offline'}`} />
                    {a.upload_status}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Storage Page ─────────────────────────────────────────────────────────────
export default function Storage() {
  const [queue, setQueue] = useState([])
  const [uploading, setUploading] = useState(false)
  const [artifacts, setArtifacts] = useState(null)
  const [loadingArtifacts, setLoadingArtifacts] = useState(false)
  const [meta, setMeta] = useState({ title: '', source: '', uploaded_by: '' })

  const addFiles = useCallback(files => {
    const items = files.map(f => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      status: 'pending',
      error: null,
    }))
    setQueue(prev => [...prev, ...items])
  }, [])

  const removeItem = useCallback(id => {
    setQueue(prev => prev.filter(item => item.id !== id))
  }, [])

  const uploadAll = async () => {
    const pending = queue.filter(i => i.status === 'pending')
    if (!pending.length) return
    setUploading(true)

    for (const item of pending) {
      setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'uploading' } : i))
      const form = new FormData()
      form.append('file', item.file)
      if (meta.title)       form.append('title', meta.title)
      if (meta.source)      form.append('source', meta.source)
      if (meta.uploaded_by) form.append('uploaded_by', meta.uploaded_by)

      try {
        await fetch(`${STORAGE_API}/upload`, { method: 'POST', body: form })
        setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'done' } : i))
      } catch (e) {
        setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', error: e.message } : i))
      }
    }
    setUploading(false)
    loadArtifacts()
  }

  const loadArtifacts = async () => {
    setLoadingArtifacts(true)
    try {
      const res = await fetch(`${STORAGE_API}/artifacts`)
      const data = await res.json()
      setArtifacts(data.artifacts || data || [])
    } catch {
      setArtifacts([])
    }
    setLoadingArtifacts(false)
  }

  const pendingCount = queue.filter(i => i.status === 'pending').length

  return (
    <div className="page-content">
      <div className="page-header fade-in">
        <h1>Storage <span className="gradient-text">Layer</span></h1>
        <p>Upload unstructured files to MinIO. Metadata is tracked via DuckLake (Parquet + Postgres catalog).</p>
      </div>

      {/* Upload */}
      <div className="card fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="card-header">
          <div>
            <div className="card-title">Upload Files</div>
            <div className="card-subtitle">MinIO → lake bucket · DuckLake → metadata catalog</div>
          </div>
        </div>

        <DropZone onFiles={addFiles} />

        {queue.length > 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)',
              marginTop: 'var(--space-5)' }}>
              {[
                { key: 'title',       label: 'Title',     placeholder: 'Optional title…' },
                { key: 'source',      label: 'Source',    placeholder: 'e.g. "Finance Q4"' },
                { key: 'uploaded_by', label: 'Uploaded By', placeholder: 'Name or email…' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600,
                    color: 'var(--color-text-muted)', display: 'block', marginBottom: 'var(--space-2)' }}>
                    {label}
                  </label>
                  <input
                    className="input"
                    placeholder={placeholder}
                    value={meta[key]}
                    onChange={e => setMeta(prev => ({ ...prev, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
              marginTop: 'var(--space-4)' }}>
              {queue.map(item => (
                <UploadItem key={item.id} item={item} onRemove={removeItem} />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)',
              alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={uploadAll}
                disabled={uploading || pendingCount === 0}>
                {uploading
                  ? <><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> Uploading…</>
                  : <><Upload size={16} /> Upload {pendingCount} File{pendingCount !== 1 ? 's' : ''}</>}
              </button>
              <button className="btn btn-ghost btn-sm"
                onClick={() => setQueue([])}>
                <X size={14} /> Clear queue
              </button>
            </div>
          </>
        )}
      </div>

      {/* Artifacts */}
      <div className="card fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="card-header">
          <div>
            <div className="card-title">Artifact Library</div>
            <div className="card-subtitle">
              {artifacts ? `${artifacts.length} file${artifacts.length !== 1 ? 's' : ''} stored` : 'Query via DuckDB'}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadArtifacts} disabled={loadingArtifacts}>
            {loadingArtifacts
              ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
              : <><RefreshCw size={14} /> Refresh</>}
          </button>
        </div>

        {artifacts === null ? (
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <div className="empty-state-title">Click Refresh to load artifacts</div>
            <div className="empty-state-desc">
              Queries the DuckLake-backed <code style={{ fontFamily: 'var(--font-mono)' }}>file_metadata</code> table
              via the Storage API on port 8000.
            </div>
            <button className="btn btn-secondary" onClick={loadArtifacts} style={{ marginTop: 'var(--space-4)' }}>
              <RefreshCw size={14} /> Load Artifacts
            </button>
          </div>
        ) : (
          <ArtifactTable artifacts={artifacts} />
        )}
      </div>

      {/* Architecture note */}
      <div className="card fade-in" style={{ animationDelay: '0.15s',
        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border-subtle)' }}>
        <div className="card-title" style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
          📐 Architecture Note
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-5)',
          fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          {[
            { icon: '🪣', title: 'MinIO (lake)', desc: 'Raw files stored as objects. Bucket: lake/' },
            { icon: '🦆', title: 'DuckLake', desc: 'Parquet rows written to metadata/ bucket per upload. No PK/UNIQUE — uniqueness via UUID.' },
            { icon: '🐘', title: 'PostgreSQL', desc: 'Acts as DuckLake CATALOG only (not row store). Tracks Parquet file manifests.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{title}</div>
                <div>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
