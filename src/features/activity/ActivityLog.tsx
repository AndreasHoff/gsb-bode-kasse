// Feature: Activity Log (F007)
// Placeholder – full implementation driven by F007 spec

export default function ActivityLog() {
  return (
    <div className="app-page">
      <h1 className="app-title">Aktivitet</h1>
      <p className="app-subtitle mb-6">Historik for aktiv sæson</p>

      {/* TODO: Load ActivityLog entries (paginated) */}
      {/* TODO: Filter by action type / member */}

      <div className="empty-state">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-sm">Ingen aktivitet endnu.</p>
      </div>
    </div>
  );
}
