import { getFunctions, httpsCallable } from "firebase/functions";

interface ExportResult {
  issueNumber: number;
  issueUrl: string;
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
