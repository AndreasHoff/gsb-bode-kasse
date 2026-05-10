// Feature: Team Overview (F004)
// Placeholder – full implementation driven by F004 spec

export default function TeamOverview() {
  return (
    <div className="app-page">
      <h1 className="app-title">Holdoversigt</h1>
      <p className="app-subtitle mb-6">Aktiv sæson</p>

      {/* TODO: Load active season + member debt aggregation */}
      <div className="empty-state">
        <p className="text-4xl mb-3">🏸</p>
        <p className="text-sm">Ingen bøder endnu denne sæson.</p>
        <p className="text-xs mt-1">Fortsæt den gode stil!</p>
      </div>
    </div>
  );
}
