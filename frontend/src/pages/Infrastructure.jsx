import CapabilityStub from '../components/CapabilityStub'

export default function Infrastructure() {
  return (
    <CapabilityStub
      icon="🖥️"
      title="Infrastructure"
      tagline="Deploy · Scale · Resource Manager · Cluster awareness"
      color="var(--cap-infra)"
      phase="Phase 3"
      description="Manage where and how Enlora runs — from a single laptop to a multi-node Kubernetes
        cluster. The Resource Manager abstracts Postgres, MinIO, DuckDB, and compute nodes behind
        a unified interface. Switch from Docker Compose to K8s without changing capability configs."
      features={[
        'Resource Manager: configure storage, compute, network from one UI',
        'Deployment targets: Laptop → NAS → Remote Server → Cloud → K8s',
        'Horizontal scaling for DuckDB compute nodes',
        'MinIO ↔ S3 ↔ GCS ↔ ADLS storage backend swap',
        'Postgres ↔ CockroachDB catalog backend swap',
        'Infrastructure-as-code export (Terraform, Helm chart)',
      ]}
      technologies={['Docker', 'Kubernetes', 'Helm', 'Terraform', 'MinIO', 'AWS S3', 'GCS']}
      exampleCode={`# Future ResourceManager interface
ResourceManager.configure(
  compute={"engine": "duckdb", "replicas": 3},
  storage={"backend": "s3", "bucket": "enlora-lake"},
  catalog={"backend": "postgres", "host": "rds.aws.com"},
  deploy_target="kubernetes",
)`}
    />
  )
}
