import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getActivityLogEntries, getUsers } from "../../lib/firestore";
import { formatAmount, formatRelativeTime } from "../../lib/utils";
import type { ActivityLogCursor } from "../../lib/firestore";
import type { ActivityLog as ActivityLogEntry, User } from "../../types/domain";
import "./ActivityLog.css";

type HistoryFilter = "all" | "fines" | "payments";

interface ActivityLogProps {
  teamId: string;
}

export default function ActivityLog({ teamId }: ActivityLogProps) {
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>("all");
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [usersById, setUsersById] = useState<Map<string, User>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cursor, setCursor] = useState<ActivityLogCursor | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const loadInitialEntries = useCallback(async () => {
    if (!teamId) {
      setEntries([]);
      setCursor(null);
      setHasMore(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [page, users] = await Promise.all([
        getActivityLogEntries(teamId, 20),
        getUsers(),
      ]);

      const map = new Map<string, User>();
      for (const user of users) {
        map.set(user.id, user);
      }

      setUsersById(map);
      setEntries(page.entries);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ukendt fejl";
      setErrorMessage(`Kunne ikke hente historik (${message}).`);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  const loadMoreEntries = useCallback(async () => {
    if (!teamId || !cursor) {
      return;
    }

    setIsLoadingMore(true);
    setErrorMessage(null);

    try {
      const page = await getActivityLogEntries(teamId, 20, cursor);
      setEntries((current) => [...current, ...page.entries]);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ukendt fejl";
      setErrorMessage(`Kunne ikke hente mere historik (${message}).`);
    } finally {
      setIsLoadingMore(false);
    }
  }, [cursor, teamId]);

  useEffect(() => {
    void loadInitialEntries();
  }, [loadInitialEntries]);

  useEffect(() => {
    function refreshOnVisible(): void {
      if (document.visibilityState === "visible") {
        void loadInitialEntries();
      }
    }

    function refreshOnFocus(): void {
      void loadInitialEntries();
    }

    document.addEventListener("visibilitychange", refreshOnVisible);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      document.removeEventListener("visibilitychange", refreshOnVisible);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [loadInitialEntries]);

  const tabs: Array<{ id: HistoryFilter; label: string }> = [
    { id: "all", label: "Alle" },
    { id: "fines", label: "Bøder" },
    { id: "payments", label: "Betalinger" },
  ];

  const filteredEntries = useMemo(() => {
    if (activeFilter === "all") {
      return entries;
    }

    if (activeFilter === "fines") {
      return entries.filter((entry) => entry.action.startsWith("fine."));
    }

    return entries.filter((entry) => entry.action.startsWith("payment."));
  }, [activeFilter, entries]);

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
    <div className="activity-log">
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

      {tabs.map((tab) => {
        const isVisible = activeFilter === tab.id;
        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={`history-panel-${tab.id}`}
            aria-labelledby={`history-tab-${tab.id}`}
            hidden={!isVisible}
          >
            {isVisible && (
              <>
                {isLoading && <p className="status-note mt-4">Henter historik...</p>}
                {errorMessage && <p className="status-error mt-4">{errorMessage}</p>}

                {!isLoading && !errorMessage && filteredEntries.length === 0 && (
                  <div className="empty-state mt-4">
                    <p className="text-4xl mb-3">📋</p>
                    <p className="text-sm">Ingen historik endnu.</p>
                  </div>
                )}

                {!isLoading && !errorMessage && filteredEntries.length > 0 && (
                  <div className="space-y-3 mt-4">
                    {filteredEntries.map((entry) => (
                      <ActivityRow
                        key={entry.id}
                        entry={entry}
                        actor={usersById.get(entry.actorId) ?? null}
                        usersById={usersById}
                      />
                    ))}
                  </div>
                )}

                {!isLoading && !errorMessage && hasMore && (
                  <button
                    type="button"
                    className="btn-secondary w-full mt-4"
                    disabled={isLoadingMore}
                    onClick={() => {
                      void loadMoreEntries();
                    }}
                  >
                    {isLoadingMore ? "Indlæser..." : "Indlæs flere"}
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ActivityRow({
  entry,
  actor,
  usersById,
}: {
  entry: ActivityLogEntry;
  actor: User | null;
  usersById: Map<string, User>;
}) {
  const icon = getActionIcon(entry.action);
  const text = getActionText(entry, actor, usersById);

  return (
    <article className="app-card p-3">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)] flex items-center justify-center text-sm">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm text-[var(--color-text)]">{text}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {formatActivityTime(entry.createdAt)}
          </p>
        </div>
      </div>
    </article>
  );
}

function formatActivityTime(createdAt: string): string {
  const created = new Date(createdAt);
  const diffMs = Date.now() - created.getTime();
  if (diffMs < 3_600_000) {
    return formatRelativeTime(createdAt);
  }

  return created.toLocaleString("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActionIcon(action: string): string {
  if (action === "fine.assigned") return "🎯";
  if (action === "fine.deleted") return "🗑️";
  if (action === "fine.restored") return "↩️";
  if (action === "payment.created") return "🧾";
  if (action === "payment.initiated") return "💸";
  if (action === "payment.approved") return "✅";
  if (action === "payment.disputed") return "⚠️";
  if (action === "season.created") return "📅";
  if (action === "season.closed") return "🏁";
  if (action === "member.added") return "➕";
  if (action === "member.roleChanged") return "🛡️";
  if (action === "rule.created") return "📋";
  if (action === "rule.updated") return "✏️";
  if (action === "rule.deactivated") return "⏸️";
  return "📌";
}

function getActionText(
  entry: ActivityLogEntry,
  actor: User | null,
  usersById: Map<string, User>,
): string {
  const actorName = actor?.name ?? "En bruger";
  const metadata = entry.metadata ?? {};
  const title = toStringValue(metadata.title) ?? "en bøde";
  const amount = toNumberValue(metadata.amount);
  const fmt = amount !== null ? ` (${formatAmount(amount)})` : "";

  function resolveUserId(v: unknown): string | null {
    return typeof v === "string" ? (usersById.get(v)?.name ?? null) : null;
  }

  if (entry.action === "fine.assigned") {
    const assignedTo = metadata.assignedTo;
    const recipientIds = Array.isArray(assignedTo) ? (assignedTo as string[]) : [];
    const recipientNames = recipientIds
      .map((id) => usersById.get(id)?.name ?? "en spiller")
      .join(", ");
    const toText = recipientIds.length > 0 ? ` til ${recipientNames}` : "";
    return `${actorName} tildelte ${title}${toText}${fmt}.`;
  }

  if (entry.action === "fine.deleted") {
    return `${actorName} slettede ${title}${fmt}.`;
  }

  if (entry.action === "fine.restored") {
    return `${actorName} gendannede ${title}${fmt}.`;
  }

  if (entry.action === "payment.created") {
    return `${actorName} oprettede en betalingslinje${amount !== null ? ` på ${formatAmount(amount)}` : ""}.`;
  }

  if (entry.action === "payment.initiated") {
    return `${actorName} har sendt en betaling${amount !== null ? ` på ${formatAmount(amount)}` : ""}.`;
  }

  if (entry.action === "payment.approved") {
    const payerName = resolveUserId(metadata.userId);
    const payerText = payerName ? `${payerName}s betaling` : "en betaling";
    return `${actorName} godkendte ${payerText}${amount !== null ? ` – ${formatAmount(amount)}` : ""}.`;
  }

  if (entry.action === "payment.disputed") {
    const payerName = resolveUserId(metadata.userId);
    const payerText = payerName ? `${payerName}s betaling` : "en betaling";
    return `${actorName} markerede ${payerText} som omtvistet.`;
  }

  if (entry.action === "season.created") {
    return `${actorName} oprettede en ny sæson.`;
  }

  if (entry.action === "season.closed") {
    return `${actorName} lukkede den aktive sæson.`;
  }

  if (entry.action === "member.added") {
    return `${actorName} tilføjede et medlem til holdet.`;
  }

  if (entry.action === "member.roleChanged") {
    return `${actorName} ændrede en medlemsrolle.`;
  }

  if (entry.action === "rule.created") {
    return `${actorName} oprettede bødetypen ${title}.`;
  }

  if (entry.action === "rule.updated") {
    return `${actorName} opdaterede bødetypen ${title}.`;
  }

  if (entry.action === "rule.deactivated") {
    return `${actorName} deaktiverede bødetypen ${title}.`;
  }

  return `${actorName} udførte handlingen ${entry.action}.`;
}

function toStringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function toNumberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
