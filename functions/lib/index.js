"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportProposalToGithub = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
(0, app_1.initializeApp)();
const GITHUB_PAT = (0, params_1.defineSecret)("GITHUB_PAT");
const GITHUB_REPO = (0, params_1.defineSecret)("GITHUB_REPO");
exports.exportProposalToGithub = (0, https_1.onCall)({ region: "europe-west1", secrets: [GITHUB_PAT, GITHUB_REPO] }, async (request) => {
    var _a;
    // 1. Require authentication
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Du skal være logget ind");
    }
    // 2. Require super-admin
    const db = (0, firestore_1.getFirestore)();
    const userSnap = await db.collection("users").doc(request.auth.uid).get();
    if (!userSnap.exists || ((_a = userSnap.data()) === null || _a === void 0 ? void 0 : _a.isSuperAdmin) !== true) {
        throw new https_1.HttpsError("permission-denied", "Ingen adgang");
    }
    // 3. Load proposal
    const { proposalId } = request.data;
    if (!proposalId) {
        throw new https_1.HttpsError("invalid-argument", "proposalId mangler");
    }
    const proposalSnap = await db.collection("featureProposals").doc(proposalId).get();
    if (!proposalSnap.exists) {
        throw new https_1.HttpsError("not-found", "Forslaget blev ikke fundet");
    }
    const proposal = proposalSnap.data();
    if (proposal.githubIssueUrl) {
        throw new https_1.HttpsError("already-exists", "Forslaget er allerede eksporteret til GitHub");
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
            title: proposal.title,
            body: buildIssueBody(proposal),
            labels: buildLabels(proposal),
        }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new https_1.HttpsError("internal", `GitHub API fejl: ${response.status} — ${errorText}`);
    }
    const issue = (await response.json());
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
});
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const PRIORITY_LABELS = {
    1: "priority: low",
    2: "priority: moderate",
    3: "priority: high",
    4: "priority: critical",
};
const PRIORITY_NAMES = {
    1: "Lav",
    2: "Moderat",
    3: "Høj",
    4: "Kritisk",
};
function buildLabels(proposal) {
    const labels = ["enhancement"];
    if (typeof proposal.priority === "number") {
        const label = PRIORITY_LABELS[proposal.priority];
        if (label)
            labels.push(label);
    }
    return labels;
}
function buildIssueBody(proposal) {
    var _a, _b, _c;
    const lines = [];
    lines.push("## Hvad er problemet?", "", String((_a = proposal.problem) !== null && _a !== void 0 ? _a : ""), "");
    lines.push("## Hvad bør ske i stedet?", "", String((_b = proposal.desiredOutcome) !== null && _b !== void 0 ? _b : ""), "");
    if (proposal.whereInApp) {
        lines.push("## Hvor i appen?", "", String(proposal.whereInApp), "");
    }
    if (typeof proposal.priority === "number") {
        lines.push(`**Prioritet:** ${(_c = PRIORITY_NAMES[proposal.priority]) !== null && _c !== void 0 ? _c : proposal.priority}`, "");
    }
    lines.push("---", `*Eksporteret fra GSB Bødekasse app den ${new Date().toLocaleDateString("da-DK")}*`);
    return lines.join("\n");
}
//# sourceMappingURL=index.js.map