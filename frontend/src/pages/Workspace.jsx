import CapabilityStub from '../components/CapabilityStub'

export default function Workspace() {
  return (
    <CapabilityStub
      icon="👥"
      title="Workspace"
      tagline="Projects · Users · Roles · Resource quotas · Config"
      color="var(--cap-workspace)"
      phase="Phase 2"
      description="Organize your data work into Workspaces — isolated environments with their own
        users, resource quotas, and configurations. Think of a Workspace as a 'project' that
        maps to a team, department, or use case, each with its own slice of the platform."
      features={[
        'Multi-workspace isolation (per team / project)',
        'Role-based access control (admin, editor, viewer)',
        'Resource quotas: storage limits, compute hours',
        'Per-workspace connection and pipeline configs',
        'Invite members by email with configurable roles',
        'Audit log per workspace',
      ]}
      technologies={['PostgreSQL', 'JWT', 'OAuth2', 'RBAC', 'Keycloak']}
      exampleCode={`# Future WorkspaceService interface
ws = WorkspaceService.create(
  name="data-engineering",
  quota={"storage_gb": 100, "compute_hours": 500},
)
ws.invite("alice@company.com", role="editor")
ws.invite("bob@company.com",   role="viewer")`}
    />
  )
}
