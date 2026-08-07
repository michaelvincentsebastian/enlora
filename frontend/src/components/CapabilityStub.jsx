import { Link } from 'react-router-dom'

/**
 * Generic "coming soon" capability page used by all unbuilt capabilities.
 * Shows rich info — features, tech stack, roadmap phase, contribute CTA.
 */
export default function CapabilityStub({
  icon,
  title,
  tagline,
  description,
  features = [],
  technologies = [],
  phase = 'Phase 2',
  color = 'var(--color-accent-1)',
  exampleCode = null,
}) {
  return (
    <div className="page-content">
      <div className="page-header fade-in">
        <h1>{title}</h1>
        <p>{tagline}</p>
      </div>

      <div className="capability-stub fade-in" style={{ animationDelay: '0.05s' }}>
        {/* Top color bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${color}, transparent)`,
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0' }} />

        <div className="capability-stub-icon" style={{ background: `${color}15` }}>
          <span style={{ fontSize: 32 }}>{icon}</span>
        </div>

        <div>
          <h2 className="capability-stub-title">{title}</h2>
          <div className="roadmap-phase" style={{ margin: '8px auto 0', width: 'fit-content' }}>
            🗺 {phase}
          </div>
        </div>

        <p className="capability-stub-desc">{description}</p>

        {features.length > 0 && (
          <ul className="capability-feature-list">
            {features.map((f, i) => (
              <li key={i}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                {f}
              </li>
            ))}
          </ul>
        )}

        {technologies.length > 0 && (
          <div>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 8 }}>
              Planned technologies
            </div>
            <div className="tech-tags">
              {technologies.map(t => <span className="tech-tag" key={t}>{t}</span>)}
            </div>
          </div>
        )}

        {exampleCode && (
          <div style={{ width: '100%', maxWidth: 540, textAlign: 'left' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)',
              marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Future API preview
            </div>
            <pre style={{ background: 'hsl(222,28%,5%)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', padding: 'var(--space-5)', overflowX: 'auto',
              fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)',
              color: 'hsl(145,50%,70%)', lineHeight: 1.7, margin: 0 }}>
              {exampleCode}
            </pre>
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/dashboard" className="btn btn-secondary">
            ← Back to Dashboard
          </Link>
          <a
            href="https://github.com/michaelvincentsebastian/enlora"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
          >
            🤝 Contribute
          </a>
        </div>
      </div>
    </div>
  )
}
