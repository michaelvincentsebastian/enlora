import CapabilityStub from '../components/CapabilityStub'

export default function Pipeline() {
  return (
    <CapabilityStub
      icon="⚡"
      title="Pipeline"
      tagline="Visual pipeline builder · Scheduling · Transformation · Monitoring"
      color="var(--cap-pipeline)"
      phase="Phase 2"
      description="Build, schedule, and monitor data transformation pipelines through a visual interface.
        Enlora abstracts the underlying engine (SQLMesh, dbt, Airflow, Dagster) behind a unified
        'Pipeline' capability — swap engines without touching your business logic."
      features={[
        'Drag-and-drop visual pipeline builder',
        'SQLMesh model editor with lineage visualization',
        'Scheduler: cron, event-based, dependency-triggered',
        'Real-time execution monitoring & alerting',
        'Engine abstraction: SQLMesh ↔ dbt ↔ Dagster (no lock-in)',
        'Git-backed version control for all pipeline definitions',
      ]}
      technologies={['SQLMesh', 'dbt', 'Airflow', 'Dagster', 'Apache Spark', 'DuckDB']}
      exampleCode={`# Future PipelineService interface
pipeline = PipelineService.create(
  name="daily_sales_transform",
  engine="sqlmesh",          # swappable
  schedule="0 6 * * *",
  source="storage.file_metadata",
  output="analytics.sales_daily",
)`}
    />
  )
}
