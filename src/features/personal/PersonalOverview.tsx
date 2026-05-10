// Feature: Personal Debt Overview (F005)
// Placeholder – full implementation driven by F005 spec

export default function PersonalOverview() {
  return (
    <div className="app-page">
      <h1 className="app-title">Mine bøder</h1>
      <p className="app-subtitle mb-6">Aktiv sæson</p>

      {/* Total debt summary */}
      <div className="app-card app-card--muted mb-6 p-5 text-center">
        <p className="text-sm font-medium text-[var(--color-text-muted)]">Udestående</p>
        <p className="mt-1 text-4xl font-bold text-[var(--color-primary)]">0 kr.</p>
      </div>

      {/* TODO: Load user's fine + payment records */}
      <div className="empty-state py-8">
        <p className="text-4xl mb-3">✅</p>
        <p className="text-sm">Ingen udestående bøder.</p>
      </div>
    </div>
  );
}
