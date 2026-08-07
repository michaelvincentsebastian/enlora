import CapabilityStub from '../components/CapabilityStub'

export default function Catalog() {
  return (
    <CapabilityStub
      icon="📚"
      title="Catalog"
      tagline="Metadata · Ownership · Data quality · Audit · Permissions"
      color="var(--cap-catalog)"
      phase="Phase 2"
      description="Discover, document, and govern all data assets in your platform. Every table,
        file, and pipeline run is cataloged automatically — with ownership, quality scores,
        and full audit trail. The governance layer sits above DuckLake's Postgres catalog."
      features={[
        'Auto-discovery of tables, columns, and pipelines',
        'Data ownership assignment and stewardship workflows',
        'Column-level data quality rules & monitoring',
        'Full audit trail: who read/wrote what and when',
        'Tag-based access policies (field-level security)',
        'Integrates with OpenMetadata or DataHub as backend',
      ]}
      technologies={['OpenMetadata', 'DataHub', 'Apache Ranger', 'Great Expectations', 'dbt tests']}
      exampleCode={`# Future CatalogService interface
asset = CatalogService.get("metadata_catalog.file_metadata")
asset.set_owner("data-team@company.com")
asset.add_quality_rule(
  column="file_size",
  rule="not_null and > 0"
)
asset.tag("pii:false", "domain:files")`}
    />
  )
}
