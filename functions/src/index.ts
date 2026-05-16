import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();

const GITHUB_PAT = defineSecret("GITHUB_PAT");
const GITHUB_REPO = defineSecret("GITHUB_REPO");

interface ExportInput {
  proposalId: string;
}

interface ExportResult {
  issueNumber: number;
  issueUrl: string;
}

export const exportProposalToGithub = onCall<ExportInput, Promise<ExportResult>>(
  { secrets: [GITHUB_PAT, GITHUB_REPO] },
  async (request) => {
    // 1. Require authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Du skal være logget ind");
    }

    // 2. Require super-admin
    const db = getFirestore();
    const userSnap = await db.collection("users").doc(request.auth.uid).get();
    if (!userSnap.exists || userSnap.data()?.isSuperAdmin !== true) {
      throw new HttpsError("permission-denied", "Ingen adgang");
    }

    // 3. Load proposal
    const { proposalId } = request.data;
    if (!proposalId) {
      throw new HttpsError("invalid-argument", "proposalId mangler");
    }

    const proposalSnap = await db.collection("featureProposals").doc(proposalId).get();
    if (!proposalSnap.exists) {
      throw new HttpsError("not-found", "Forslaget blev ikke fundet");
    }

    const proposal = proposalSnap.data() as Record<string, unknown>;

    if (proposal.githubIssueUrl) {
      throw new HttpsError("already-exists", "Forslaget er allerede eksporteret til GitHub");
    }

    // 4. Create GitHub issue
    const pat = GITHUB_PAT.value();
    const repo = GITHUB_REPO.value();

    const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: proposal.title as string,
        body: buildIssueBody(proposal),
        labels: buildLabels(proposal),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new HttpsError("internal", `GitHub API fejl: ${response.status} — ${errorText}`);
    }

    const issue = (await response.json()) as { number: number; html_url: string };

    // 5. Persist GitHub metadata back to Firestore
    await db.collection("featureProposals").doc(proposalId).update({
      githubIssueNumber: issue.number,
      githubIssueUrl: issue.html_url,
      exportedToGithubAt: new Date(),
      updatedAt: new Date(),
    });

    return { issueNumber: issue.number, issueUrl: issue.html_url };
  },
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PRIORITY_LABELS: Record<number, string> = {
  1: "priority: low",
  2: "priority: moderate",
  3: "priority: high",
  4: "priority: critical",
};

const PRIORITY_NAMES: Record<number, string> = {
  1: "Lav",
  2: "Moderat",
  3: "Høj",
  4: "Kritisk",
};

function buildLabels(proposal: Record<string, unknown>): string[] {
  const labels = ["enhancement"];
  if (typeof proposal.priority === "number") {
    const label = PRIORITY_LABELS[proposal.priority];
    if (label) labels.push(label);
  }
  return labels;
}

function buildIssueBody(proposal: Record<string, unknown>): string {
  const lines: string[] = [];

  lines.push("## Hvad er problemet?", "", String(proposal.problem ?? ""), "");
  lines.push("## Hvad bør ske i stedet?", "", String(proposal.desiredOutcome ?? ""), "");

  if (proposal.whereInApp) {
    lines.push("## Hvor i appen?", "", String(proposal.whereInApp), "");
  }

  if (typeof proposal.priority === "number") {
    lines.push(`**Prioritet:** ${PRIORITY_NAMES[proposal.priority] ?? proposal.priority}`, "");
  }

  lines.push(
    "---",
    `*Eksporteret fra GSB Bødekasse app den ${new Date().toLocaleDateString("da-DK")}*`,
  );

  return lines.join("\n");
}
