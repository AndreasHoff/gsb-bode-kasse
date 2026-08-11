import {
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type DocumentData,
  type WithFieldValue,
  Timestamp,
} from "firebase/firestore";
import type {
  User,
  Team,
  Membership,
  Season,
  FineRule,
  Fine,
  Payment,
  ActivityLog,
  FeatureProposal,
  PaymentStatus,
  ProposalStatus,
  Role,
} from "../../types/domain";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TimestampLike = Timestamp | Date | string | { toDate: () => Date };

function toIso(value: TimestampLike): string {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  return value.toDate().toISOString();
}

function toIsoOpt(value: TimestampLike | undefined): string | undefined {
  return value ? toIso(value) : undefined;
}

// ---------------------------------------------------------------------------
// Firestore document shapes (Timestamps in place of ISO strings, no `id`)
// ---------------------------------------------------------------------------

interface UserDoc extends DocumentData {
  name: string;
  email: string;
  avatarUrl?: string;
  isSuperAdmin?: boolean;
  createdAt: Timestamp;
}

interface TeamDoc extends DocumentData {
  name: string;
  slug: string;
  logoUrl?: string;
  mobilePayRecipient?: string; // Legacy field, deprecated
  mobilePayBoxUrl?: string;
  createdAt: Timestamp;
}

interface MembershipDoc extends DocumentData {
  userId: string;
  teamId: string;
  role: Role;
  joinedAt: Timestamp;
  isActive: boolean;
}

interface SeasonDoc extends DocumentData {
  teamId: string;
  name: string;
  startDate: Timestamp;
  endDate?: Timestamp;
  isActive: boolean;
}

interface FineRuleDoc extends DocumentData {
  teamId: string;
  title: string;
  description?: string;
  amount: number;
  emoji?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Timestamp;
}

interface FineDoc extends DocumentData {
  teamId: string;
  seasonId: string;
  fineRuleId?: string;
  title: string;
  amount: number;
  assignedTo: string[];
  assignedBy: string;
  note?: string;
  isShared: boolean;
  createdAt: Timestamp;
  deletedAt?: Timestamp;
}

interface PaymentDoc extends DocumentData {
  fineId?: string; // Legacy: single fine (deprecated)
  fineIds?: string[]; // V2: supports combined payments
  userId: string;
  amount: number;
  status: PaymentStatus;
  initiatedAt?: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
}

interface ActivityLogDoc extends DocumentData {
  teamId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Converters
// toFirestore accepts WithFieldValue<T> per FirestoreDataConverter interface.
// We immediately cast to the concrete domain type since we only ever call
// setDoc/addDoc with plain domain objects (never with FieldValue sentinels in
// these field positions).
// ---------------------------------------------------------------------------

export const userConverter: FirestoreDataConverter<User, UserDoc> = {
  toFirestore(modelObject: WithFieldValue<User>): UserDoc {
    const user = modelObject as User;
    return {
      name: user.name,
      email: user.email,
      ...(user.avatarUrl !== undefined && { avatarUrl: user.avatarUrl }),
      ...(user.isSuperAdmin !== undefined && { isSuperAdmin: user.isSuperAdmin }),
      createdAt: Timestamp.fromDate(new Date(user.createdAt)),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot<UserDoc>): User {
    const d = snapshot.data();
    return {
      id: snapshot.id,
      name: d.name,
      email: d.email,
      avatarUrl: d.avatarUrl,
      isSuperAdmin: d.isSuperAdmin,
      createdAt: toIso(d.createdAt),
    };
  },
};

export const teamConverter: FirestoreDataConverter<Team, TeamDoc> = {
  toFirestore(modelObject: WithFieldValue<Team>): TeamDoc {
    const team = modelObject as Team;
    return {
      name: team.name,
      slug: team.slug,
      ...(team.logoUrl !== undefined && { logoUrl: team.logoUrl }),
      ...(team.mobilePayBoxUrl !== undefined && {
        mobilePayBoxUrl: team.mobilePayBoxUrl,
      }),
      createdAt: Timestamp.fromDate(new Date(team.createdAt)),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot<TeamDoc>): Team {
    const d = snapshot.data();
    return {
      id: snapshot.id,
      name: d.name,
      slug: d.slug,
      logoUrl: d.logoUrl,
      mobilePayBoxUrl: d.mobilePayBoxUrl ?? d.mobilePayRecipient, // Fallback for backward compatibility
      createdAt: toIso(d.createdAt),
    };
  },
};

export const membershipConverter: FirestoreDataConverter<Membership, MembershipDoc> = {
  toFirestore(modelObject: WithFieldValue<Membership>): MembershipDoc {
    const m = modelObject as Membership;
    return {
      userId: m.userId,
      teamId: m.teamId,
      role: m.role,
      joinedAt: Timestamp.fromDate(new Date(m.joinedAt)),
      isActive: m.isActive,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot<MembershipDoc>): Membership {
    const d = snapshot.data();
    return {
      id: snapshot.id,
      userId: d.userId,
      teamId: d.teamId,
      role: d.role,
      joinedAt: toIso(d.joinedAt),
      isActive: d.isActive,
    };
  },
};

export const seasonConverter: FirestoreDataConverter<Season, SeasonDoc> = {
  toFirestore(modelObject: WithFieldValue<Season>): SeasonDoc {
    const s = modelObject as Season;
    return {
      teamId: s.teamId,
      name: s.name,
      startDate: Timestamp.fromDate(new Date(s.startDate)),
      ...(s.endDate !== undefined && {
        endDate: Timestamp.fromDate(new Date(s.endDate)),
      }),
      isActive: s.isActive,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot<SeasonDoc>): Season {
    const d = snapshot.data();
    return {
      id: snapshot.id,
      teamId: d.teamId,
      name: d.name,
      startDate: toIso(d.startDate),
      endDate: toIsoOpt(d.endDate),
      isActive: d.isActive,
    };
  },
};

export const fineRuleConverter: FirestoreDataConverter<FineRule, FineRuleDoc> = {
  toFirestore(modelObject: WithFieldValue<FineRule>): FineRuleDoc {
    const r = modelObject as FineRule;
    return {
      teamId: r.teamId,
      title: r.title,
      ...(r.description !== undefined && { description: r.description }),
      amount: r.amount,
      ...(r.emoji !== undefined && { emoji: r.emoji }),
      isActive: r.isActive,
      createdBy: r.createdBy,
      createdAt: Timestamp.fromDate(new Date(r.createdAt)),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot<FineRuleDoc>): FineRule {
    const d = snapshot.data();
    return {
      id: snapshot.id,
      teamId: d.teamId,
      title: d.title,
      description: d.description,
      amount: d.amount,
      emoji: d.emoji,
      isActive: d.isActive,
      createdBy: d.createdBy,
      createdAt: toIso(d.createdAt),
    };
  },
};

export const fineConverter: FirestoreDataConverter<Fine, FineDoc> = {
  toFirestore(modelObject: WithFieldValue<Fine>): FineDoc {
    const f = modelObject as Fine;
    return {
      teamId: f.teamId,
      seasonId: f.seasonId,
      ...(f.fineRuleId !== undefined && { fineRuleId: f.fineRuleId }),
      title: f.title,
      amount: f.amount,
      assignedTo: f.assignedTo,
      assignedBy: f.assignedBy,
      ...(f.note !== undefined && { note: f.note }),
      isShared: f.isShared,
      createdAt: Timestamp.fromDate(new Date(f.createdAt)),
      ...(f.deletedAt !== undefined && {
        deletedAt: Timestamp.fromDate(new Date(f.deletedAt)),
      }),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot<FineDoc>): Fine {
    const d = snapshot.data();
    return {
      id: snapshot.id,
      teamId: d.teamId,
      seasonId: d.seasonId,
      fineRuleId: d.fineRuleId,
      title: d.title,
      amount: d.amount,
      assignedTo: d.assignedTo,
      assignedBy: d.assignedBy,
      note: d.note,
      isShared: d.isShared,
      createdAt: toIso(d.createdAt),
      deletedAt: toIsoOpt(d.deletedAt),
    };
  },
};

export const paymentConverter: FirestoreDataConverter<Payment, PaymentDoc> = {
  toFirestore(modelObject: WithFieldValue<Payment>): PaymentDoc {
    const p = modelObject as Payment;
    return {
      ...(p.fineId !== undefined && { fineId: p.fineId }),
      ...(p.fineIds !== undefined && { fineIds: p.fineIds }),
      userId: p.userId,
      amount: p.amount,
      status: p.status,
      ...(p.initiatedAt !== undefined && {
        initiatedAt: Timestamp.fromDate(new Date(p.initiatedAt)),
      }),
      ...(p.approvedAt !== undefined && {
        approvedAt: Timestamp.fromDate(new Date(p.approvedAt)),
      }),
      ...(p.approvedBy !== undefined && { approvedBy: p.approvedBy }),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot<PaymentDoc>): Payment {
    const d = snapshot.data();
    return {
      id: snapshot.id,
      fineId: d.fineId,
      fineIds: d.fineIds,
      userId: d.userId,
      amount: d.amount,
      status: d.status,
      initiatedAt: toIsoOpt(d.initiatedAt),
      approvedAt: toIsoOpt(d.approvedAt),
      approvedBy: d.approvedBy,
    };
  },
};

export const activityLogConverter: FirestoreDataConverter<ActivityLog, ActivityLogDoc> = {
  toFirestore(modelObject: WithFieldValue<ActivityLog>): ActivityLogDoc {
    const log = modelObject as ActivityLog;
    return {
      teamId: log.teamId,
      actorId: log.actorId,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      ...(log.metadata !== undefined && { metadata: log.metadata }),
      createdAt: Timestamp.fromDate(new Date(log.createdAt)),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot<ActivityLogDoc>): ActivityLog {
    const d = snapshot.data();
    return {
      id: snapshot.id,
      teamId: d.teamId,
      actorId: d.actorId,
      action: d.action,
      entityType: d.entityType,
      entityId: d.entityId,
      metadata: d.metadata,
      createdAt: toIso(d.createdAt),
    };
  },
};

// ---------------------------------------------------------------------------
// FeatureProposal
// ---------------------------------------------------------------------------

interface FeatureProposalDoc extends DocumentData {
  title: string;
  problem: string;
  desiredOutcome: string;
  creatorId: string;
  creatorName: string;
  whereInApp?: string;
  priority?: 1 | 2 | 3 | 4;
  status: ProposalStatus;
  statusUpdatedAt?: Timestamp;
  githubIssueId?: string;
  githubIssueNumber?: number;
  githubIssueUrl?: string;
  githubIssueRepo?: string;
  exportedToGithubAt?: Timestamp;
  approvedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const featureProposalConverter: FirestoreDataConverter<FeatureProposal, FeatureProposalDoc> = {
  toFirestore(modelObject: WithFieldValue<FeatureProposal>): FeatureProposalDoc {
    const p = modelObject as FeatureProposal;
    return {
      title: p.title,
      problem: p.problem,
      desiredOutcome: p.desiredOutcome,
      creatorId: p.creatorId,
      creatorName: p.creatorName,
      ...(p.whereInApp !== undefined && { whereInApp: p.whereInApp }),
      ...(p.priority !== undefined && { priority: p.priority }),
      status: p.status,
      ...(p.statusUpdatedAt !== undefined && {
        statusUpdatedAt: Timestamp.fromDate(new Date(p.statusUpdatedAt)),
      }),
      ...(p.githubIssueId !== undefined && { githubIssueId: p.githubIssueId }),
      ...(p.githubIssueNumber !== undefined && { githubIssueNumber: p.githubIssueNumber }),
      ...(p.githubIssueUrl !== undefined && { githubIssueUrl: p.githubIssueUrl }),
      ...(p.githubIssueRepo !== undefined && { githubIssueRepo: p.githubIssueRepo }),
      ...(p.exportedToGithubAt !== undefined && {
        exportedToGithubAt: Timestamp.fromDate(new Date(p.exportedToGithubAt)),
      }),
      ...(p.approvedAt !== undefined && {
        approvedAt: Timestamp.fromDate(new Date(p.approvedAt)),
      }),
      createdAt: Timestamp.fromDate(new Date(p.createdAt)),
      updatedAt: Timestamp.fromDate(new Date(p.updatedAt)),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot<FeatureProposalDoc>): FeatureProposal {
    const d = snapshot.data();
    return {
      id: snapshot.id,
      title: d.title,
      problem: d.problem,
      desiredOutcome: d.desiredOutcome,
      creatorId: d.creatorId ?? "",
      creatorName: d.creatorName ?? "Ukendt bruger",
      whereInApp: d.whereInApp,
      priority: d.priority,
      status: d.status,
      statusUpdatedAt: toIsoOpt(d.statusUpdatedAt),
      githubIssueId: d.githubIssueId,
      githubIssueNumber: d.githubIssueNumber,
      githubIssueUrl: d.githubIssueUrl,
      githubIssueRepo: d.githubIssueRepo,
      exportedToGithubAt: toIsoOpt(d.exportedToGithubAt),
      approvedAt: toIsoOpt(d.approvedAt),
      createdAt: toIso(d.createdAt),
      updatedAt: toIso(d.updatedAt),
    };
  },
};
