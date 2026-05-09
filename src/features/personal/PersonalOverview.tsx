// Feature: Personal Debt Overview (F005)
// Placeholder – full implementation driven by F005 spec

export default function PersonalOverview() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-1">Mine bøder</h1>
      <p className="text-gray-500 text-sm mb-6">Aktiv sæson</p>

      {/* Total debt summary */}
      <div className="rounded-2xl bg-green-50 border border-green-200 p-5 text-center mb-6">
        <p className="text-sm text-green-700 font-medium">Udestående</p>
        <p className="text-4xl font-bold text-green-800 mt-1">0 kr.</p>
      </div>

      {/* TODO: Load user's fine + payment records */}
      <div className="text-center py-8 text-gray-400">
        <p className="text-4xl mb-3">✅</p>
        <p className="text-sm">Ingen udestående bøder.</p>
      </div>
    </div>
  );
}
