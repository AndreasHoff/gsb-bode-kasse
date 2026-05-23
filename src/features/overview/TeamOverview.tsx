import { useEffect, useMemo, useState } from "react";
import { getUsers } from "../../lib/firestore";
import type { User } from "../../types/domain";

export default function TeamOverview() {
  const [members, setMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadMembers(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const users = await getUsers();

        if (!isActive) {
          return;
        }

        setMembers(users);
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message = error instanceof Error ? error.message : "Ukendt fejl";
        setErrorMessage(`Kunne ikke hente spillere (${message}).`);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadMembers();

    return () => {
      isActive = false;
    };
  }, []);

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) =>
        a.name.localeCompare(b.name, "da", { sensitivity: "base" }),
      ),
    [members],
  );

  return (
    <div className="app-page">
      <h1 className="app-title">Hold</h1>
      <p className="app-subtitle mb-6">Alle brugere i klubben</p>

      {isLoading && <p className="status-note">Henter spillere...</p>}

      {errorMessage && <p className="status-error">{errorMessage}</p>}

      {!isLoading && !errorMessage && sortedMembers.length === 0 && (
        <div className="empty-state py-8">
          <p className="text-4xl mb-3">🏸</p>
          <p className="text-sm">Der er endnu ingen medlemmer.</p>
        </div>
      )}

      {!isLoading && !errorMessage && sortedMembers.length > 0 && (
        <section className="space-y-3" aria-label="Medlemmer">
          <p className="app-subtitle">{sortedMembers.length} medlemmer</p>

          <ul className="space-y-2" aria-label="Liste over medlemmer">
            {sortedMembers.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-muted)_72%,transparent)] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                    {member.name}
                  </p>
                  <p className="truncate text-xs text-[var(--color-text-muted)]">
                    {member.email}
                  </p>
                </div>
                <span className="status-badge status-badge--implemented">Medlem</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
