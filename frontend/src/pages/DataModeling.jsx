import CapabilityStub from '../components/CapabilityStub'

export default function DataModeling() {
  return (
    <CapabilityStub
      icon="🗂️"
      title="Data Modeling"
      tagline="ERD · Schema designer · DDL · Data lineage"
      color="var(--cap-modeling)"
      phase="Phase 2"
      description="Design and visualize your data models with an interactive ERD editor.
        Generate DDL, track schema evolution, and see full data lineage from raw source to
        final table. Constraint handling accounts for DuckLake's no-PK architecture."
      features={[
        'Visual ERD editor with drag-and-drop tables',
        'DDL generation for DuckDB, Postgres, Snowflake',
        'Schema versioning and migration tracking',
        'Column-level data lineage visualization',
        'DuckLake-aware: no PK/UNIQUE — uniqueness via application-layer UUIDs',
        'Import schemas from existing databases automatically',
      ]}
      technologies={['DuckDB', 'SQLGlot', 'Apache Atlas', 'OpenMetadata']}
      exampleCode={`# Future ModelingService interface
model = ModelingService.define(
  name="orders",
  columns=[
    Column("id", "UUID"),           # no PK constraint (DuckLake)
    Column("customer_id", "UUID"),
    Column("total", "DECIMAL"),
    Column("created_at", "TIMESTAMPTZ"),
  ],
  engine="ducklake",
)`}
    />
  )
}
