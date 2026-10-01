"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.chargeOutstandingFineInterest = exports.migrateMembershipRoles = exports.approveProposal = exports.updateProposalStatus = exports.exportProposalToGithub = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
(0, app_1.initializeApp)();
const GITHUB_PAT = (0, params_1.defineSecret)("GITHUB_PAT");
const GITHUB_REPO = (0, params_1.defineSecret)("GITHUB_REPO");
const PROPOSAL_OWNER_EMAIL = ((_a = process.env.PROPOSAL_OWNER_EMAIL) !== null && _a !== void 0 ? _a : "mchoffn@hotmail.com").trim().toLowerCase();
const GITHUB_PROJECT_OWNER = "AndreasHoff";
const GITHUB_PROJECT_NUMBER = 5;
const GITHUB_PROJECT_STATUS_FIELD = "Status";
const GITHUB_PROJECT_TODO_OPTION = "Todo";
const ALLOWED_PROPOSAL_STATUSES = [
    "new",
    "triaged",
    "planned",
    "implemented",
    "done",
    "abandoned",
];
const LEGACY_ROLE_MAP = {
    member: "member",
    admin: "admin",
    player: "member",
    captain: "member",
    treasurer: "member",
};
function toIsoIfDateLike(value) {
    if (value && typeof value === "object" && "toDate" in value) {
        const dateLike = value;
        return dateLike.toDate().toISOString();
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    return value;
}
function serializeProposal(id, proposal) {
    const source = proposal !== null && proposal !== void 0 ? proposal : {};
    const normalized = Object.assign({ id }, source);
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
function requireProposalOwnerEmail(request) {
    var _a, _b;
    const email = typeof ((_b = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.email) === "string"
        ? request.auth.token.email.trim().toLowerCase()
        : "";
    if (email !== PROPOSAL_OWNER_EMAIL) {
        throw new https_1.HttpsError("permission-denied", "Ingen adgang");
    }
}
exports.exportProposalToGithub = (0, https_1.onCall)({ region: "europe-west1", secrets: [GITHUB_PAT, GITHUB_REPO] }, async (request) => {
    // 1. Require authentication
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Du skal være logget ind");
    }
    // 2. Require designated owner email
    requireProposalOwnerEmail(request);
    const db = (0, firestore_1.getFirestore)();
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
    // 5. Add issue to GitHub Project and set status to Todo
    await addIssueToProjectTodo({
        pat,
        issueNodeId: issue.node_id,
        projectOwner: GITHUB_PROJECT_OWNER,
        projectNumber: GITHUB_PROJECT_NUMBER,
    });
    // 6. Persist GitHub metadata back to Firestore
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
exports.updateProposalStatus = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Du skal være logget ind");
    }
    requireProposalOwnerEmail(request);
    const { proposalId, status } = request.data;
    if (!proposalId || typeof proposalId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "proposalId mangler");
    }
    if (!ALLOWED_PROPOSAL_STATUSES.includes(status)) {
        throw new https_1.HttpsError("invalid-argument", "Ugyldig status");
    }
    const db = (0, firestore_1.getFirestore)();
    const ref = db.collection("featureProposals").doc(proposalId);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new https_1.HttpsError("not-found", "Forslaget blev ikke fundet");
    }
    const existing = snap.data();
    const now = new Date();
    const updates = {
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
exports.approveProposal = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Du skal være logget ind");
    }
    requireProposalOwnerEmail(request);
    const { proposalId } = request.data;
    if (!proposalId || typeof proposalId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "proposalId mangler");
    }
    const db = (0, firestore_1.getFirestore)();
    const ref = db.collection("featureProposals").doc(proposalId);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new https_1.HttpsError("not-found", "Forslaget blev ikke fundet");
    }
    const existing = snap.data();
    if (existing.status !== "implemented") {
        throw new https_1.HttpsError("failed-precondition", "Kan kun godkende forslag med status 'implemented'");
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
});
exports.migrateMembershipRoles = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    var _a, _b;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Du skal være logget ind");
    }
    requireProposalOwnerEmail(request);
    const dryRun = ((_a = request.data) === null || _a === void 0 ? void 0 : _a.dryRun) === true;
    const db = (0, firestore_1.getFirestore)();
    const teamsSnap = await db.collection("teams").get();
    const summary = {
        dryRun,
        teamsScanned: 0,
        membersScanned: 0,
        membersUpdated: 0,
        rolesNormalized: 0,
        idsRekeyed: 0,
        skippedMissingUserId: 0,
        skippedUnknownRole: 0,
        writeCommits: 0,
    };
    let batch = db.batch();
    let pendingOps = 0;
    const queueSet = async (ref, data) => {
        if (!dryRun) {
            batch.set(ref, data);
        }
        pendingOps += 1;
        if (pendingOps >= 450) {
            if (!dryRun) {
                await batch.commit();
                summary.writeCommits += 1;
            }
            batch = db.batch();
            pendingOps = 0;
        }
    };
    const queueDelete = async (ref) => {
        if (!dryRun) {
            batch.delete(ref);
        }
        pendingOps += 1;
        if (pendingOps >= 450) {
            if (!dryRun) {
                await batch.commit();
                summary.writeCommits += 1;
            }
            batch = db.batch();
            pendingOps = 0;
        }
    };
    for (const teamDoc of teamsSnap.docs) {
        summary.teamsScanned += 1;
        const membersSnap = await teamDoc.ref.collection("members").get();
        for (const memberDoc of membersSnap.docs) {
            summary.membersScanned += 1;
            const raw = memberDoc.data();
            const userId = typeof raw.userId === "string" ? raw.userId.trim() : "";
            if (!userId) {
                summary.skippedMissingUserId += 1;
                continue;
            }
            const role = normalizeMembershipRole(raw.role);
            if (!role) {
                summary.skippedUnknownRole += 1;
                continue;
            }
            const normalized = {
                userId,
                role,
                joinedAt: (_b = raw.joinedAt) !== null && _b !== void 0 ? _b : new Date(),
                isActive: typeof raw.isActive === "boolean" ? raw.isActive : true,
            };
            const needsRekey = memberDoc.id !== userId;
            const needsRoleNormalize = raw.role !== role;
            const needsTeamIdCleanup = Object.prototype.hasOwnProperty.call(raw, "teamId");
            const needsActiveNormalize = typeof raw.isActive !== "boolean";
            if (!needsRekey && !needsRoleNormalize && !needsTeamIdCleanup && !needsActiveNormalize) {
                continue;
            }
            summary.membersUpdated += 1;
            if (needsRoleNormalize) {
                summary.rolesNormalized += 1;
            }
            if (needsRekey) {
                summary.idsRekeyed += 1;
            }
            const targetRef = teamDoc.ref.collection("members").doc(userId);
            await queueSet(targetRef, normalized);
            if (needsRekey) {
                await queueDelete(memberDoc.ref);
            }
        }
    }
    if (!dryRun && pendingOps > 0) {
        await batch.commit();
        summary.writeCommits += 1;
    }
    return { summary };
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
async function addIssueToProjectTodo(input) {
    var _a, _b;
    const { projectId, statusField } = await getProjectConfig(input);
    const addItemResponse = await runGitHubGraphQL({
        pat: input.pat,
        query: `
      mutation AddIssueToProject($projectId: ID!, $contentId: ID!) {
        addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
          item {
            id
          }
        }
      }
    `,
        variables: {
            projectId,
            contentId: input.issueNodeId,
        },
    });
    const itemId = (_b = (_a = addItemResponse.addProjectV2ItemById) === null || _a === void 0 ? void 0 : _a.item) === null || _b === void 0 ? void 0 : _b.id;
    if (!itemId) {
        throw new https_1.HttpsError("internal", "GitHub Project fejl: kunne ikke tilfoeje issue til project");
    }
    await runGitHubGraphQL({
        pat: input.pat,
        query: `
      mutation SetProjectStatus(
        $projectId: ID!
        $itemId: ID!
        $fieldId: ID!
        $optionId: String!
      ) {
        updateProjectV2ItemFieldValue(
          input: {
            projectId: $projectId
            itemId: $itemId
            fieldId: $fieldId
            value: { singleSelectOptionId: $optionId }
          }
        ) {
          projectV2Item {
            id
          }
        }
      }
    `,
        variables: {
            projectId,
            itemId,
            fieldId: statusField.id,
            optionId: statusField.todoOptionId,
        },
    });
}
async function getProjectConfig(input) {
    var _a, _b, _c, _d, _e, _f;
    const projectQueryResponse = await runGitHubGraphQL({
        pat: input.pat,
        query: `
      query ProjectConfig($owner: String!, $number: Int!) {
        user(login: $owner) {
          projectV2(number: $number) {
            id
            fields(first: 50) {
              nodes {
                __typename
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  options {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }
    `,
        variables: {
            owner: input.projectOwner,
            number: input.projectNumber,
        },
    });
    const project = (_a = projectQueryResponse.user) === null || _a === void 0 ? void 0 : _a.projectV2;
    const projectId = project === null || project === void 0 ? void 0 : project.id;
    if (!projectId) {
        throw new https_1.HttpsError("internal", `GitHub Project fejl: kunne ikke finde project ${input.projectOwner}/${input.projectNumber}`);
    }
    const statusFieldNode = (_d = (_c = (_b = project.fields) === null || _b === void 0 ? void 0 : _b.nodes) === null || _c === void 0 ? void 0 : _c.find((field) => {
        var _a;
        return field.__typename === "ProjectV2SingleSelectField" &&
            ((_a = field.name) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) === GITHUB_PROJECT_STATUS_FIELD.toLowerCase();
    })) !== null && _d !== void 0 ? _d : null;
    if (!(statusFieldNode === null || statusFieldNode === void 0 ? void 0 : statusFieldNode.id)) {
        throw new https_1.HttpsError("internal", `GitHub Project fejl: feltet '${GITHUB_PROJECT_STATUS_FIELD}' blev ikke fundet`);
    }
    const todoOption = (_f = (_e = statusFieldNode.options) === null || _e === void 0 ? void 0 : _e.find((option) => { var _a; return ((_a = option.name) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) === GITHUB_PROJECT_TODO_OPTION.toLowerCase(); })) !== null && _f !== void 0 ? _f : null;
    if (!(todoOption === null || todoOption === void 0 ? void 0 : todoOption.id)) {
        throw new https_1.HttpsError("internal", `GitHub Project fejl: option '${GITHUB_PROJECT_TODO_OPTION}' blev ikke fundet i feltet '${GITHUB_PROJECT_STATUS_FIELD}'`);
    }
    return {
        projectId,
        statusField: {
            id: statusFieldNode.id,
            todoOptionId: todoOption.id,
        },
    };
}
async function runGitHubGraphQL(input) {
    const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${input.pat}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            query: input.query,
            variables: input.variables,
        }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new https_1.HttpsError("internal", `GitHub GraphQL fejl: ${response.status} — ${errorText}`);
    }
    const payload = (await response.json());
    if (payload.errors && payload.errors.length > 0) {
        const messages = payload.errors
            .map((error) => { var _a; return (_a = error.message) !== null && _a !== void 0 ? _a : "Ukendt GraphQL fejl"; })
            .join(" | ");
        throw new https_1.HttpsError("internal", `GitHub GraphQL fejl: ${messages}`);
    }
    if (!payload.data) {
        throw new https_1.HttpsError("internal", "GitHub GraphQL fejl: tomt svar");
    }
    return payload.data;
}
function normalizeMembershipRole(role) {
    if (typeof role !== "string") {
        return null;
    }
    const normalized = LEGACY_ROLE_MAP[role.trim().toLowerCase()];
    return normalized !== null && normalized !== void 0 ? normalized : null;
}
/**
 * Daily scheduled function that charges 5 DKK interest to members with unpaid fines
 * from the previous calendar month.
 * Runs at 00:01 Denmark local time every day (handles daylight saving automatically).
 */
exports.chargeOutstandingFineInterest = (0, scheduler_1.onSchedule)({
    schedule: "1 0 * * *", // 00:01 Denmark local time every day
    region: "europe-west1",
    timeZone: "Europe/Copenhagen",
}, async (context) => {
    const db = (0, firestore_1.getFirestore)();
    console.log("[chargeOutstandingFineInterest] Starting daily interest processing", {
        timestamp: new Date().toISOString(),
    });
    const today = new Date();
    const todayIso = today.toISOString().split("T")[0]; // YYYY-MM-DD
    const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const previousMonthStr = previousMonth.toISOString().substring(0, 7); // YYYY-MM
    let membersChargedCount = 0;
    let chargesCreatedCount = 0;
    const errors = [];
    try {
        // 1. Get all teams
        const teamsSnap = await db.collection("teams").get();
        const teams = teamsSnap.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        console.log(`[chargeOutstandingFineInterest] Processing ${teams.length} teams`);
        for (const team of teams) {
            const teamId = team.id;
            try {
                // Get active season for this team
                const seasonSnap = await db
                    .collection("teams")
                    .doc(teamId)
                    .collection("seasons")
                    .where("isActive", "==", true)
                    .get();
                if (seasonSnap.empty) {
                    console.log(`[chargeOutstandingFineInterest] No active season for team ${teamId}`);
                    continue;
                }
                const seasonId = seasonSnap.docs[0].id;
                // OPTIMIZATION: Fetch all payments for this team once, reuse for all members
                const allPaymentsSnap = await db
                    .collection("teams")
                    .doc(teamId)
                    .collection("payments")
                    .get();
                const allPayments = allPaymentsSnap.docs.map((doc) => doc.data());
                // Get all members in the team
                const membersSnap = await db
                    .collection("teams")
                    .doc(teamId)
                    .collection("members")
                    .where("isActive", "==", true)
                    .get();
                const members = membersSnap.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
                console.log(`[chargeOutstandingFineInterest] Processing ${members.length} members in team ${teamId}`);
                // 2. For each member, check for unpaid fines from previous month
                for (const member of members) {
                    const userId = member.userId;
                    try {
                        // Get all unpaid fines for this user from the previous month
                        const finesSnap = await db
                            .collection("teams")
                            .doc(teamId)
                            .collection("fines")
                            .where("assignedTo", "array-contains", userId)
                            .where("seasonId", "==", seasonId)
                            .get();
                        const finesFromPreviousMonth = finesSnap.docs.filter((doc) => {
                            const fine = doc.data();
                            // Check if fine is from previous month
                            const createdAt = fine.createdAt;
                            const fineCreatedMonth = createdAt.toDate().toISOString().substring(0, 7);
                            return fineCreatedMonth === previousMonthStr && !fine.deletedAt;
                        });
                        if (finesFromPreviousMonth.length === 0) {
                            continue;
                        }
                        // Check if any of these fines have unpaid payments
                        let hasUnpaidFines = false;
                        for (const fineDoc of finesFromPreviousMonth) {
                            const fineId = fineDoc.id;
                            // Filter allPayments for this fine (no additional fetch)
                            const finePayments = allPayments.filter((payment) => {
                                const fineIds = payment.fineIds || [];
                                const legacyFineId = payment.fineId || "";
                                return fineIds.includes(fineId) || legacyFineId === fineId;
                            });
                            // Check if any payment is in a state that blocks interest
                            // Interest is blocked if: pending OR approved
                            // Interest is NOT blocked if: unpaid OR disputed
                            const blockedPayment = finePayments.find((payment) => {
                                const status = payment.status || "";
                                return status === "pending" || status === "approved";
                            });
                            if (!blockedPayment) {
                                hasUnpaidFines = true;
                                break;
                            }
                        }
                        if (!hasUnpaidFines) {
                            continue;
                        }
                        // 3. Check if interest charge already exists for this user, team, month, and date
                        const existingChargesSnap = await db
                            .collection("teams")
                            .doc(teamId)
                            .collection("interestCharges")
                            .where("userId", "==", userId)
                            .where("month", "==", previousMonthStr)
                            .where("chargedOn", "==", todayIso)
                            .get();
                        if (!existingChargesSnap.empty) {
                            console.log(`[chargeOutstandingFineInterest] Interest already charged for user ${userId}, month ${previousMonthStr}, team ${teamId}`);
                            continue;
                        }
                        // 4. Create InterestCharge atomically with ActivityLog
                        const batch = db.batch();
                        const chargeRef = db
                            .collection("teams")
                            .doc(teamId)
                            .collection("interestCharges")
                            .doc();
                        const chargeId = chargeRef.id;
                        const charge = {
                            userId,
                            teamId,
                            seasonId,
                            amount: 5,
                            chargedOn: todayIso,
                            month: previousMonthStr,
                            reason: "daily_outstanding_fine_interest",
                            createdAt: new Date(),
                        };
                        batch.set(chargeRef, charge);
                        // Add ActivityLog entry
                        const logRef = db
                            .collection("teams")
                            .doc(teamId)
                            .collection("activityLog")
                            .doc();
                        const logEntry = {
                            teamId,
                            actorId: "system",
                            action: "interest.charged",
                            entityType: "interestCharge",
                            entityId: chargeId,
                            metadata: {
                                userId,
                                amount: 5,
                                month: previousMonthStr,
                                chargedOn: todayIso,
                            },
                            createdAt: new Date(),
                        };
                        batch.set(logRef, logEntry);
                        await batch.commit();
                        chargesCreatedCount++;
                        membersChargedCount++;
                        console.log(`[chargeOutstandingFineInterest] Created interest charge for user ${userId}, team ${teamId}`);
                    }
                    catch (memberError) {
                        const errorMsg = `Error processing member ${member.id} in team ${teamId}: ${memberError instanceof Error ? memberError.message : String(memberError)}`;
                        console.error(errorMsg);
                        errors.push(errorMsg);
                    }
                }
            }
            catch (teamError) {
                const errorMsg = `Error processing team ${teamId}: ${teamError instanceof Error ? teamError.message : String(teamError)}`;
                console.error(errorMsg);
                errors.push(errorMsg);
            }
        }
        console.log("[chargeOutstandingFineInterest] Completed", {
            membersChargedCount,
            chargesCreatedCount,
            errorsCount: errors.length,
            timestamp: new Date().toISOString(),
        });
        if (errors.length > 0) {
            console.warn("[chargeOutstandingFineInterest] Errors occurred:", errors);
        }
    }
    catch (error) {
        console.error("[chargeOutstandingFineInterest] Fatal error:", error);
        throw error;
    }
});
//# sourceMappingURL=index.js.map