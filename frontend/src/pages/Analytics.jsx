import CapabilityStub from '../components/CapabilityStub'

export default function Analytics() {
  return (
    <CapabilityStub
      icon="📊"
      title="Analytics"
      tagline="BI dashboards · Reports · Notebooks · Ad-hoc SQL"
      color="var(--cap-analytics)"
      phase="Phase 3"
      description="Explore, visualize, and share insights from your data lake without leaving Enlora.
        The Analytics capability wraps your choice of BI engine (Metabase, Superset, Evidence)
        behind a unified interface — or use the built-in notebook for ad-hoc DuckDB queries."
      features={[
        'Embedded BI dashboards (Metabase, Superset, Evidence)',
        'Built-in SQL notebook powered by DuckDB',
        'Drag-and-drop chart builder over DuckLake tables',
        'Scheduled reports with email/Slack delivery',
        'Parameterized dashboards for self-service analytics',
        'Export to CSV, Excel, Parquet',
      ]}
      technologies={['DuckDB', 'Metabase', 'Apache Superset', 'Evidence', 'Vega-Lite', 'Plotly']}
      exampleCode={`# Future AnalyticsService interface
dashboard = AnalyticsService.create_dashboard(
  name="Q4 Revenue",
  engine="superset",          # swappable
  query="""
    SELECT source, COUNT(*) as files,
           SUM(file_size) as total_bytes
    FROM metadata_catalog.file_metadata
    GROUP BY source
  """,
)`}
    />
  )
}
