import { getDoc, getDocs, doc, setDoc } from "firebase/firestore";
import { teamDoc, teamsCol } from "./refs";
import type { Team } from "../../types/domain";

export async function getTeam(teamId: string): Promise<Team | null> {
  const snap = await getDoc(teamDoc(teamId));
  return snap.exists() ? snap.data() : null;
}

export async function createTeam(data: Omit<Team, "id">): Promise<Team> {
  const colRef = teamsCol();
  const docRef = doc(colRef);
  const team: Team = { id: docRef.id, ...data };
  await setDoc(docRef, team);
  return team;
}

export async function getTeams(): Promise<Team[]> {
  const snap = await getDocs(teamsCol());
  return snap.docs.map((d) => d.data());
}
