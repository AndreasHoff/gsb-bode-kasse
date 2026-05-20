import type { ReactNode } from "react";
import type { FeatureProposal, ProposalStatus } from "../../types/domain";
import { formatRelativeTime } from "../../lib/utils";
import { PriorityBadge, StatusBadge } from "./proposal-utils";

interface ProposalPageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function ProposalPageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: ProposalPageHeaderProps) {
  return (
    <div className="proposal-page-header">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="app-title">{title}</h1>
        {subtitle && <p className="app-subtitle mt-2">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

interface ProposalFilterPillProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

export function ProposalFilterPill({
  label,
  count,
  active,
  onClick,
}: ProposalFilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`proposal-filter ${active ? "proposal-filter--active" : "proposal-filter--idle"}`}
    >
      <span>{label}</span>
      <span className="proposal-filter__count">{count}</span>
    </button>
  );
}

interface ProposalFieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function ProposalField({ label, hint, children }: ProposalFieldProps) {
  return (
    <label className="proposal-field">
      <span className="proposal-field__label">{label}</span>
      {hint && <p className="proposal-field__hint">{hint}</p>}
      {children}
    </label>
  );
}

interface ProposalSectionProps {
  title: string;
  children: ReactNode;
}

export function ProposalSection({ title, children }: ProposalSectionProps) {
  return (
    <section className="proposal-section">
      <p className="proposal-section__title">{title}</p>
      {children}
    </section>
  );
}

interface ProposalDetailSectionProps {
  title: string;
  children: ReactNode;
}

export function ProposalDetailSection({
  title,
  children,
}: ProposalDetailSectionProps) {
  return (
    <section className="proposal-detail-section app-card app-card--muted">
      <p className="proposal-detail-section__title">{title}</p>
      <div className="proposal-detail-section__body">{children}</div>
    </section>
  );
}

interface ProposalCardProps {
  proposal: FeatureProposal;
  onClick: (id: string) => void;
}

export function ProposalCard({ proposal, onClick }: ProposalCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(proposal.id)}
      className={`proposal-card proposal-card--${proposal.status}`}
    >
      <div className="proposal-card__rail" aria-hidden="true" />
      <div className="proposal-card__header">
        <StatusBadge status={proposal.status as ProposalStatus} />
        <span className="proposal-card__chevron" aria-hidden="true">
          ⌄
        </span>
      </div>
      <div className="proposal-card__body">
        <p className="proposal-card__title">{proposal.title}</p>
        <div className="proposal-card__meta">
          {proposal.priority !== undefined && (
            <PriorityBadge priority={proposal.priority} />
          )}
          {proposal.githubIssueNumber !== undefined && (
            <span className="proposal-card__tag">GitHub #{proposal.githubIssueNumber}</span>
          )}
          <span className="proposal-card__time">
            {formatRelativeTime(proposal.createdAt)}
          </span>
        </div>
      </div>
    </button>
  );
}

interface ProposalCardStackProps {
  children: ReactNode;
}

export function ProposalCardStack({ children }: ProposalCardStackProps) {
  return <div className="proposal-card-stack">{children}</div>;
}
