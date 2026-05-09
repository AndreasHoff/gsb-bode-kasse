// Feature: Team Overview (F004)
// Placeholder – full implementation driven by F004 spec

export default function TeamOverview() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-1">Holdoversigt</h1>
      <p className="text-gray-500 text-sm mb-6">Aktiv sæson</p>

      {/* TODO: Load active season + member debt aggregation */}
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">🏸</p>
        <p className="text-sm">Ingen bøder endnu denne sæson.</p>
        <p className="text-xs mt-1">Fortsæt den gode stil!</p>
      </div>
    </div>
  );
}
