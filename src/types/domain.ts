// Domain entity types for the GSB Bødekasse platform

export type Role = "member" | "admin";

export type PaymentStatus = "unpaid" | "pending" | "approved" | "disputed";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
  outstandingFineBalance?: number; // New field for outstanding balance
  totalPaidAmount?: number;     // New field for total paid amount
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  mobilePayBoxUrl?: string;
  createdAt: string;
}

export interface Membership {
  name: string;
  id: string;
  userId: string;
  teamId: string;
  role: Role;
  joinedAt: string;
  isActive: boolean;
}

export interface Season {
  id: string;
  teamId: string;
  name: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
}

export interface FineRule {
  id: string;
  teamId: string;
  title: string;
  description?: string;
  amount: number;
  emoji?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface Fine {
  id: string;
  teamId: string;
  seasonId: string;
  fineRuleId?: string;
  title: string;
  amount: number;
  assignedTo: string[];
  assignedBy: string;
  note?: string;
  isShared: boolean;
  createdAt: string;
  deletedAt?: string;
}

export interface Payment {
  id: string;
  fineId?: string; // Legacy: single fine (deprecated, kept for backward compatibility)
  fineIds?: string[]; // V2: supports combined payments
  userId: string;
  amount: number;
  status: PaymentStatus;
  initiatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface ActivityLog {
  id: string;
  teamId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type ProposalStatus =
  | "new"
  | "triaged"
  | "planned"
  | "implemented"
  | "done"
  | "abandoned";

export interface FeatureProposal {
  id: string;
  title: string;
  problem: string;
  desiredOutcome: string;
  creatorId: string;
  creatorName: string;
  whereInApp?: string;
  priority?: 1 | 2 | 3 | 4;
  status: ProposalStatus;
  statusUpdatedAt?: string;
  githubIssueId?: string;
  githubIssueNumber?: number;
  githubIssueUrl?: string;
  githubIssueRepo?: string;
  exportedToGithubAt?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}
