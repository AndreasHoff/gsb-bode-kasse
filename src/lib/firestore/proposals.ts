import { getDocs, getDoc, doc, setDoc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { proposalsCol, proposalDoc } from "./refs";
import { auth } from "../firebase";
import { getUserProfile } from "./users";
import type { FeatureProposal, ProposalStatus } from "../../types/domain";
import { callApproveProposal, callUpdateProposalStatus } from "../functions";

const LOCKED_STATUSES: ProposalStatus[] = ["done", "implemented", "abandoned"];

export async function getProposals(): Promise<FeatureProposal[]> {
  const q = query(proposalsCol(), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function getProposal(id: string): Promise<FeatureProposal | null> {
  const snap = await getDoc(proposalDoc(id));
  return snap.exists() ? snap.data() : null;
}

export type CreateProposalInput = Pick<
  FeatureProposal,
  "title" | "problem" | "desiredOutcome"
> &
  Partial<Pick<FeatureProposal, "whereInApp" | "priority">>;

export async function createProposal(
  input: CreateProposalInput,
): Promise<FeatureProposal> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Du skal være logget ind for at oprette et forslag");
  }

  const profile = await getUserProfile(currentUser.uid);
  const creatorName =
    profile?.name ||
    currentUser.displayName ||
    currentUser.email ||
    "Ukendt bruger";

  const colRef = proposalsCol();
  const ref = doc(colRef);
  const now = new Date().toISOString();
  const proposal: FeatureProposal = {
    id: ref.id,
    title: input.title,
    problem: input.problem,
    desiredOutcome: input.desiredOutcome,
    creatorId: currentUser.uid,
    creatorName,
    ...(input.whereInApp !== undefined && { whereInApp: input.whereInApp }),
    ...(input.priority !== undefined && { priority: input.priority }),
    status: "new",
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, proposal);
  return proposal;
}

export type UpdateProposalInput = Partial<
  Pick<FeatureProposal, "title" | "problem" | "desiredOutcome" | "whereInApp" | "priority">
>;

export async function updateProposal(
  id: string,
  input: UpdateProposalInput,
): Promise<FeatureProposal> {
  const existing = await getProposal(id);
  if (!existing) throw new Error("Forslaget blev ikke fundet");
  if (LOCKED_STATUSES.includes(existing.status)) {
    throw new Error("Forslaget er låst og kan ikke redigeres");
  }
  const updated: FeatureProposal = {
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(proposalDoc(id), updated);
  return updated;
}

export async function updateProposalStatus(
  id: string,
  status: ProposalStatus,
): Promise<FeatureProposal> {
  return callUpdateProposalStatus(id, status);
}

export async function approveProposal(id: string): Promise<FeatureProposal> {
  return callApproveProposal(id);
}
