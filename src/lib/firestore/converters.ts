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
  PaymentStatus,
  Role,
} from "../../types/domain";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toIso(ts: Timestamp): string {
  return ts.toDate().toISOString();
}

function toIsoOpt(ts: Timestamp | undefined): string | undefined {
  return ts ? ts.toDate().toISOString() : undefined;
}

// ---------------------------------------------------------------------------
// Firestore document shapes (Timestamps in place of ISO strings, no `id`)
// ---------------------------------------------------------------------------

interface UserDoc extends DocumentData {
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: Timestamp;
}

interface TeamDoc extends DocumentData {
  name: string;
  slug: string;
  logoUrl?: string;
  mobilePayRecipient?: string;
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
  fineId: string;
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
      ...(team.mobilePayRecipient !== undefined && {
        mobilePayRecipient: team.mobilePayRecipient,
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
      mobilePayRecipient: d.mobilePayRecipient,
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
      fineId: p.fineId,
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
