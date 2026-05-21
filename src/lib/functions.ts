import { getFunctions, httpsCallable } from "firebase/functions";
import type { FeatureProposal, ProposalStatus } from "../types/domain";

interface ExportResult {
  issueNumber: number;
  issueUrl: string;
}

interface UpdateProposalStatusResult {
  proposal: FeatureProposal;
}

interface ApproveProposalResult {
  proposal: FeatureProposal;
}

export async function callExportProposalToGithub(
  proposalId: string,
): Promise<ExportResult> {
  const functions = getFunctions(undefined, "europe-west1");
  const fn = httpsCallable<{ proposalId: string }, ExportResult>(
    functions,
    "exportProposalToGithub",
  );
  const result = await fn({ proposalId });
  return result.data;
}

export async function callUpdateProposalStatus(
  proposalId: string,
  status: ProposalStatus,
): Promise<FeatureProposal> {
  const functions = getFunctions(undefined, "europe-west1");
  const fn = httpsCallable<
    { proposalId: string; status: ProposalStatus },
    UpdateProposalStatusResult
  >(functions, "updateProposalStatus");
  const result = await fn({ proposalId, status });
  return result.data.proposal;
}

export async function callApproveProposal(
  proposalId: string,
): Promise<FeatureProposal> {
  const functions = getFunctions(undefined, "europe-west1");
  const fn = httpsCallable<{ proposalId: string }, ApproveProposalResult>(
    functions,
    "approveProposal",
  );
  const result = await fn({ proposalId });
  return result.data.proposal;
}
