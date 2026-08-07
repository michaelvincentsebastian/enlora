import CapabilityStub from '../components/CapabilityStub'

export default function Connections() {
  return (
    <CapabilityStub
      icon="🔌"
      title="Connections"
      tagline="Databases · APIs · Files · ERP · CRM · Cloud · Object Storage"
      color="var(--cap-connections)"
      phase="Phase 2"
      description="Connect any data source to Enlora through a unified connector abstraction.
        Users configure a 'Connection' — Enlora handles the protocol, auth, and streaming
        semantics. The underlying connector library (Airbyte, Singer, custom) is invisible."
      features={[
        'Relational databases: Postgres, MySQL, Snowflake, BigQuery',
        'REST & GraphQL APIs with auth (OAuth2, API key, Bearer)',
        'Files: CSV, Parquet, JSON, Avro from local, S3, GCS, ADLS',
        'ERP/CRM: Salesforce, HubSpot, SAP (via connector library)',
        'Event streams: Kafka, Kinesis, Pub/Sub',
        'Connector library abstraction — swap Airbyte ↔ Singer ↔ custom',
      ]}
      technologies={['Airbyte', 'Singer', 'boto3', 'pandas', 'httpx', 'OAuth2']}
      exampleCode={`# Future ConnectionService interface
conn = ConnectionService.create(
  name="salesforce_crm",
  type="crm",
  connector="airbyte-salesforce",  # swappable
  auth={"client_id": "...", "client_secret": "..."},
  sync_mode="incremental",
)`}
    />
  )
}
