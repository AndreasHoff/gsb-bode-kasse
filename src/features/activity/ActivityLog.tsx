import { useState } from "react";
import "./ActivityLog.css";

type HistoryFilter = "all" | "fines" | "payments";

export default function ActivityLog() {
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>("all");

  const tabs: Array<{ id: HistoryFilter; label: string }> = [
    { id: "all", label: "Alle" },
    { id: "fines", label: "Bøder" },
    { id: "payments", label: "Betalinger" },
  ];

  const emptyStateByFilter: Record<HistoryFilter, string> = {
    all: "Ingen historik endnu.",
    fines: "Ingen bødehændelser endnu.",
    payments: "Ingen betalingshændelser endnu.",
  };

  return (
    <div className="app-page">
      <h1 className="app-title">Historik</h1>
      <p className="app-subtitle mb-4">Følg bøder og betalinger for aktiv sæson</p>

      <div className="activity-log__tabs" role="tablist" aria-label="Historik filtre">
        {tabs.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`activity-log__tab ${isActive ? "activity-log__tab--active" : ""}`}
              onClick={() => setActiveFilter(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="empty-state">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-sm">{emptyStateByFilter[activeFilter]}</p>
      </div>
    </div>
  );
}
