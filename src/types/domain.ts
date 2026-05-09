// Domain entity types for the GSB Bødekasse platform

export type Role = "player" | "captain" | "treasurer" | "admin";

export type PaymentStatus = "unpaid" | "pending" | "approved" | "disputed";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  mobilePayRecipient?: string;
  createdAt: string;
}

export interface Membership {
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
  fineId: string;
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
