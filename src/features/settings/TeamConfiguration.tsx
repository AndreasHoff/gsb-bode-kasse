import { useEffect, useState } from "react";
import { getTeam } from "../../lib/firestore/teams";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { Team } from "../../types/domain";

interface Props {
  teamId: string;
}

export default function TeamConfiguration({ teamId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [mobilePayBoxUrl, setMobilePayBoxUrl] = useState("");

  useEffect(() => {
    void load();

    async function load() {
      if (!teamId) return;

      setLoading(true);
      setError(null);
      try {
        const t = await getTeam(teamId);
        if (t) {
          setTeam(t);
          setMobilePayBoxUrl(t.mobilePayBoxUrl ?? "");
        }
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
