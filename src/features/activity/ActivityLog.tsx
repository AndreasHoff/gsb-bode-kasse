// Feature: Activity Log (F007)
// Placeholder – full implementation driven by F007 spec

export default function ActivityLog() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-1">Aktivitet</h1>
      <p className="text-gray-500 text-sm mb-6">Historik for aktiv sæson</p>

      {/* TODO: Load ActivityLog entries (paginated) */}
      {/* TODO: Filter by action type / member */}

      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-sm">Ingen aktivitet endnu.</p>
      </div>
    </div>
  );
}
