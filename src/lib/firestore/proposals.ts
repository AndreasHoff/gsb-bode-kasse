import { getDocs, getDoc, doc, setDoc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { proposalsCol, proposalDoc } from "./refs";
import type { FeatureProposal, ProposalStatus } from "../../types/domain";

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
  const colRef = proposalsCol();
  const ref = doc(colRef);
  const now = new Date().toISOString();
  const proposal: FeatureProposal = {
    id: ref.id,
    title: input.title,
    problem: input.problem,
    desiredOutcome: input.desiredOutcome,
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
  const existing = await getProposal(id);
  if (!existing) throw new Error("Forslaget blev ikke fundet");
  const now = new Date().toISOString();

  const updated: FeatureProposal = {
    ...existing,
    status,
    statusUpdatedAt: now,
    updatedAt: now,
  };

  // Clear approval when rolling back away from "done"
  if (existing.status === "done" && status !== "done") {
    delete updated.approvedAt;
  }

  await setDoc(proposalDoc(id), updated);
  return updated;
}

export async function approveProposal(id: string): Promise<FeatureProposal> {
  const existing = await getProposal(id);
  if (!existing) throw new Error("Forslaget blev ikke fundet");
  if (existing.status !== "implemented") {
    throw new Error("Kan kun godkende forslag med status 'implemented'");
  }
  const now = new Date().toISOString();
  const updated: FeatureProposal = {
    ...existing,
    status: "done",
    approvedAt: now,
    updatedAt: now,
  };
  await setDoc(proposalDoc(id), updated);
  return updated;
}
