import { getDocs, getDoc, doc, writeBatch, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { seasonsCol, seasonDoc, activityLogCol } from "./refs";
import type { Season, ActivityLog } from "../../types/domain";

export async function getSeasons(teamId: string): Promise<Season[]> {
  const snap = await getDocs(seasonsCol(teamId));
  return snap.docs.map((d) => d.data());
}

export async function getActiveSeason(teamId: string): Promise<Season | null> {
  const q = query(seasonsCol(teamId), where("isActive", "==", true));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data();
}

export async function getSeason(
  teamId: string,
  seasonId: string,
): Promise<Season | null> {
  const snap = await getDoc(seasonDoc(teamId, seasonId));
  return snap.exists() ? snap.data() : null;
}

/**
 * Creates a new season and writes an ActivityLog entry atomically.
 * Only one season can be active per team — callers must close the current
 * active season before creating a new one.
 * Initializes balance fields to 0 per F024.
 */
export async function createSeason(
  data: Omit<Season, "id">,
  actorId: string,
): Promise<Season> {
  const batch = writeBatch(db);

  const colRef = seasonsCol(data.teamId);
  const docRef = doc(colRef);
  const season: Season = {
    id: docRef.id,
    ...data,
    totalApprovedBalance: 0,
    totalPendingBalance: 0,
    totalOutstanding: 0,
  };
  batch.set(docRef, season);

  const logColRef = activityLogCol(data.teamId);
  const logRef = doc(logColRef);
  const logEntry: ActivityLog = {
    id: logRef.id,
    teamId: data.teamId,
    actorId,
    action: "season.created",
    entityType: "season",
    entityId: docRef.id,
    metadata: { name: data.name },
    createdAt: new Date().toISOString(),
  };
  batch.set(logRef, logEntry);

  await batch.commit();
  return season;
}

/**
 * Closes a season by setting isActive=false and endDate=today,
 * and writes an ActivityLog entry atomically.
 */
export async function closeSeason(
  teamId: string,
  seasonId: string,
  actorId: string,
): Promise<void> {
  const existing = await getSeason(teamId, seasonId);
  if (!existing) throw new Error(`Season ${seasonId} not found in team ${teamId}`);

  const batch = writeBatch(db);

  const sRef = seasonDoc(teamId, seasonId);
  const updated: Season = {
    ...existing,
    isActive: false,
    endDate: new Date().toISOString(),
  };
  batch.set(sRef, updated);

  const logColRef = activityLogCol(teamId);
  const logRef = doc(logColRef);
  const logEntry: ActivityLog = {
    id: logRef.id,
    teamId,
    actorId,
    action: "season.closed",
    entityType: "season",
    entityId: seasonId,
    metadata: { name: existing.name },
    createdAt: new Date().toISOString(),
  };
  batch.set(logRef, logEntry);

  await batch.commit();
}
