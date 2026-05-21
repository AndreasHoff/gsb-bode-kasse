import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();

const GITHUB_PAT = defineSecret("GITHUB_PAT");
const GITHUB_REPO = defineSecret("GITHUB_REPO");
const PROPOSAL_OWNER_EMAIL = "mchoffn@hotmail.com";

type ProposalStatus =
  | "new"
  | "triaged"
  | "planned"
  | "implemented"
  | "done"
  | "abandoned";

const ALLOWED_PROPOSAL_STATUSES: ProposalStatus[] = [
  "new",
  "triaged",
  "planned",
  "implemented",
  "done",
  "abandoned",
];

interface ExportInput {
  proposalId: string;
}

interface ExportResult {
  issueNumber: number;
  issueUrl: string;
}

interface UpdateProposalStatusInput {
  proposalId: string;
  status: ProposalStatus;
}

interface ApproveProposalInput {
  proposalId: string;
}

interface ProposalResponse {
  proposal: Record<string, unknown>;
}

function toIsoIfDateLike(value: unknown): unknown {
  if (value && typeof value === "object" && "toDate" in value) {
    const dateLike = value as { toDate: () => Date };
    return dateLike.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

function serializeProposal(
  id: string,
  proposal: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const source = proposal ?? {};
  const normalized: Record<string, unknown> = {
    id,
    ...source,
  };

  const timestampKeys = [
    "createdAt",
    "updatedAt",
    "statusUpdatedAt",
    "exportedToGithubAt",
    "approvedAt",
  ];

  for (const key of timestampKeys) {
    normalized[key] = toIsoIfDateLike(normalized[key]);
  }

  return normalized;
}

function requireProposalOwnerEmail(request: { auth?: { token?: { email?: unknown } } }): void {
  const email =
    typeof request.auth?.token?.email === "string"
      ? request.auth.token.email.trim().toLowerCase()
      : "";

  if (email !== PROPOSAL_OWNER_EMAIL) {
    throw new HttpsError("permission-denied", "Ingen adgang");
  }
}

export const exportProposalToGithub = onCall<ExportInput, Promise<ExportResult>>(
  { region: "europe-west1", secrets: [GITHUB_PAT, GITHUB_REPO] },
  async (request) => {
    // 1. Require authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Du skal være logget ind");
    }

    // 2. Require designated owner email
    requireProposalOwnerEmail(request);

    const db = getFirestore();

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

    const issue = (await response.json()) as { id: number; number: number; html_url: string };

    // 5. Persist GitHub metadata back to Firestore
    await db.collection("featureProposals").doc(proposalId).update({
      githubIssueId: String(issue.id),
      githubIssueNumber: issue.number,
      githubIssueUrl: issue.html_url,
      githubIssueRepo: repo,
      exportedToGithubAt: new Date(),
      updatedAt: new Date(),
    });

    return { issueNumber: issue.number, issueUrl: issue.html_url };
  },
);

export const updateProposalStatus = onCall<
  UpdateProposalStatusInput,
  Promise<ProposalResponse>
>({ region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Du skal være logget ind");
  }

  requireProposalOwnerEmail(request);

  const { proposalId, status } = request.data;
  if (!proposalId || typeof proposalId !== "string") {
    throw new HttpsError("invalid-argument", "proposalId mangler");
  }
  if (!ALLOWED_PROPOSAL_STATUSES.includes(status)) {
    throw new HttpsError("invalid-argument", "Ugyldig status");
  }

  const db = getFirestore();
  const ref = db.collection("featureProposals").doc(proposalId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Forslaget blev ikke fundet");
  }

  const existing = snap.data() as Record<string, unknown>;
  const now = new Date();
  const updates: Record<string, unknown> = {
    status,
    statusUpdatedAt: now,
    updatedAt: now,
  };

  // Clear approval when rolling back away from "done"
  if (existing.status === "done" && status !== "done") {
    updates.approvedAt = null;
  }

  await ref.update(updates);
  const updated = await ref.get();
  return { proposal: serializeProposal(updated.id, updated.data()) };
});

export const approveProposal = onCall<ApproveProposalInput, Promise<ProposalResponse>>(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Du skal være logget ind");
    }

    requireProposalOwnerEmail(request);

    const { proposalId } = request.data;
    if (!proposalId || typeof proposalId !== "string") {
      throw new HttpsError("invalid-argument", "proposalId mangler");
    }

    const db = getFirestore();
    const ref = db.collection("featureProposals").doc(proposalId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Forslaget blev ikke fundet");
    }

    const existing = snap.data() as Record<string, unknown>;
    if (existing.status !== "implemented") {
      throw new HttpsError(
        "failed-precondition",
        "Kan kun godkende forslag med status 'implemented'",
      );
    }

    const now = new Date();
    await ref.update({
      status: "done",
      approvedAt: now,
      statusUpdatedAt: now,
      updatedAt: now,
    });

    const updated = await ref.get();
    return { proposal: serializeProposal(updated.id, updated.data()) };
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
