import { useRef, useState } from "react";
import "./ActivityLog.css";

type HistoryFilter = "all" | "fines" | "payments";

export default function ActivityLog() {
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>("all");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

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

  function handleKeyDown(e: React.KeyboardEvent, currentIndex: number) {
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = tabs.length - 1;
    }
    if (nextIndex !== null) {
      e.preventDefault();
      setActiveFilter(tabs[nextIndex].id);
      tabRefs.current[nextIndex]?.focus();
    }
  }

  return (
    <div className="app-page">
      <h1 className="app-title">Historik</h1>
      <p className="app-subtitle mb-4">Følg bøder og betalinger for aktiv sæson</p>

      <div className="activity-log__tabs" role="tablist" aria-label="Historik filtre">
        {tabs.map((tab, index) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[index] = el; }}
              type="button"
              role="tab"
              id={`history-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`history-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              className={`activity-log__tab ${isActive ? "activity-log__tab--active" : ""}`}
              onClick={() => setActiveFilter(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`history-panel-${tab.id}`}
          aria-labelledby={`history-tab-${tab.id}`}
          hidden={activeFilter !== tab.id}
        >
          {activeFilter === tab.id && (
            <div className="empty-state">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-sm">{emptyStateByFilter[tab.id]}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
