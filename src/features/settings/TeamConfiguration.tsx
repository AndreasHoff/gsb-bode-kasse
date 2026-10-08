import { useEffect, useState } from "react";
import { getTeam } from "../../lib/firestore/teams";
import { getActiveSeason, closeSeason } from "../../lib/firestore";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { Team, Season } from "../../types/domain";
import { formatRelativeTime } from "../../lib/utils";

interface Props {
  teamId: string;
  actorId: string;
}

export default function TeamConfiguration({ teamId, actorId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [mobilePayBoxUrl, setMobilePayBoxUrl] = useState("");
  const [season, setSeason] = useState<Season | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [closingSubmitting, setClosingSubmitting] = useState(false);

  useEffect(() => {
    void load();

    async function load() {
      if (!teamId) return;

      setLoading(true);
      setError(null);
      try {
        const [t, activeSeason] = await Promise.all([
          getTeam(teamId),
          getActiveSeason(teamId),
        ]);
        if (t) {
          setTeam(t);
          setMobilePayBoxUrl(t.mobilePayBoxUrl ?? "");
        }
        setSeason(activeSeason);
      } catch (err) {
        console.error("[team-config] load failed", err);
        setError("Kunne ikke hente holdindstillinger.");
      } finally {
        setLoading(false);
      }
    }
  }, [teamId]);

  async function handleSave() {
    if (!teamId || !team) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const teamRef = doc(db, "teams", teamId);
      await updateDoc(teamRef, {
        mobilePayBoxUrl: mobilePayBoxUrl.trim() || null,
      });

      setTeam({ ...team, mobilePayBoxUrl: mobilePayBoxUrl.trim() || undefined });
      setSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("[team-config] save failed", err);
      setError("Kunne ikke gemme indstillinger. Prøv igen.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseSeason() {
    if (!season || closingSubmitting) return;
    setClosingSubmitting(true);
    setError(null);
    try {
      await closeSeason(teamId, season.id, actorId);
      setSeason(null);
      setShowConfirmClose(false);
    } catch {
      setError("Afslutning af sæson mislykkedes.");
    } finally {
      setClosingSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="team-config">
        <h1 className="app-title">Holdindstillinger</h1>
        <p className="status-note">Indlæser...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="team-config">
        <h1 className="app-title">Holdindstillinger</h1>
        <p className="status-error">Holdet kunne ikke findes.</p>
      </div>
    );
  }

  return (
    <div className="team-config">
      <h1 className="app-title">Holdindstillinger</h1>
      <p className="app-subtitle mb-4">Konfigurer holdets indstillinger</p>

      {/* End Season Section */}
      {season && (
        <section className="team-config-section mb-6">
          <h2 className="team-config-section__title">Afslut sæson</h2>
          <div className="season-management__card">
            <p className="season-management__label">Aktiv sæson</p>
            <p className="season-management__name">{season.name}</p>
            <p className="season-management__meta">
              Startet {formatRelativeTime(season.startDate)}
            </p>

            {!showConfirmClose ? (
              <button
                type="button"
                className="btn-secondary mt-4 w-full"
                onClick={() => setShowConfirmClose(true)}
                disabled={saving}
              >
                Afslut sæson
              </button>
            ) : (
              <div className="season-management__confirm-box">
                <p className="season-management__confirm-text">
                  Er du sikker? Sæsonen kan ikke genåbnes bagefter.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-danger flex-1"
                    disabled={closingSubmitting}
                    onClick={() => void handleCloseSeason()}
                  >
                    {closingSubmitting ? "Afslutter…" : "Ja, afslut sæson"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary flex-1"
                    disabled={closingSubmitting}
                    onClick={() => setShowConfirmClose(false)}
                  >
                    Annuller
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="team-config-section">
        <h2 className="team-config-section__title">MobilePay Box</h2>
        <p className="team-config-section__description">
          URL til klubbens MobilePay Box. Medlemmer skal bruge denne til at betale bøder.
        </p>

        <div className="form-field">
          <label htmlFor="mobilePayBoxUrl" className="form-label">
            MobilePay Box URL
          </label>
          <input
            id="mobilePayBoxUrl"
            type="url"
            className="form-input"
            placeholder="https://qr.mobilepay.dk/box/..."
            value={mobilePayBoxUrl}
            onChange={(e) => setMobilePayBoxUrl(e.target.value)}
            disabled={saving}
          />
          <p className="form-help-text">
            Eksempel: https://qr.mobilepay.dk/box/2d320bea-781b-4442-9fc2-879e9ec36e8a/pay-in
          </p>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? "Gemmer..." : "Gem indstillinger"}
        </button>

        {success && <p className="status-success mt-3">Indstillinger gemt!</p>}
        {error && <p className="status-error mt-3">{error}</p>}
      </section>
    </div>
  );
}
