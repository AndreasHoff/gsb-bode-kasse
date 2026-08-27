// Feature: Admin Settings (F021, F022, F015, F023)
// Tabbed admin panel: payment approval, refunds/reconciliation, season management, member management, team configuration.

import { useState } from "react";
import type { Role } from "../../types/domain";
import { canApprovePayments, canManageSeasons, canManageMembers } from "../../lib/permissions";
import AdminApproval from "../payments/AdminApproval";
import SeasonManagement from "./SeasonManagement";
import MemberManagement from "./MemberManagement";
import RefundReconcile from "./RefundReconcile";
import ImportFineRules from "./ImportFineRules";
import TeamConfiguration from "./TeamConfiguration";
import "./admin-settings.css";

type AdminTab = "payments" | "refunds" | "fines" | "season" | "members" | "config";

interface Props {
  teamId: string;
  actorId: string;
  userRole: Role | null;
}

export default function AdminSettings({ teamId, actorId, userRole }: Props) {
  const [activeTab, setActiveTab] = useState<AdminTab>("payments");

  const showPayments = canApprovePayments(userRole);
  const showSeason = canManageSeasons(userRole);
  const showMembers = canManageMembers(userRole);

  return (
    <div className="admin-settings">
      <nav className="admin-settings__tabs" aria-label="Admin-sektioner">
        {showPayments && (
          <button
            type="button"
            className={`admin-settings__tab${activeTab === "payments" ? " admin-settings__tab--active" : ""}`}
            onClick={() => setActiveTab("payments")}
          >
            Betalinger
          </button>
        )}
        {showPayments && (
          <button
            type="button"
            className={`admin-settings__tab${activeTab === "refunds" ? " admin-settings__tab--active" : ""}`}
            onClick={() => setActiveTab("refunds")}
          >
            Refunder
          </button>
        )}
        {/* {showSeason && (
          <button
            type="button"
            className={`admin-settings__tab${activeTab === "fines" ? " admin-settings__tab--active" : ""}`}
            onClick={() => setActiveTab("fines")}
          >
            Bøder
          </button>
        )} */}
        {showSeason && (
          <button
            type="button"
            className={`admin-settings__tab${activeTab === "season" ? " admin-settings__tab--active" : ""}`}
            onClick={() => setActiveTab("season")}
          >
            Sæson
          </button>
        )}
        {showMembers && (
          <button
            type="button"
            className={`admin-settings__tab${activeTab === "members" ? " admin-settings__tab--active" : ""}`}
            onClick={() => setActiveTab("members")}
          >
            Medlemmer
          </button>
        )}
        {showSeason && (
          <button
            type="button"
            className={`admin-settings__tab${activeTab === "config" ? " admin-settings__tab--active" : ""}`}
            onClick={() => setActiveTab("config")}
          >
            Indstillinger
          </button>
        )}
      </nav>

      <div className="admin-settings__content">
        {activeTab === "payments" && showPayments && (
          <AdminApproval
            teamId={teamId}
            actorId={actorId}
            userRole={userRole}
          />
        )}
        {activeTab === "refunds" && showPayments && (
          <RefundReconcile teamId={teamId} actorId={actorId} />
        )}
        {/* {activeTab === "fines" && showSeason && (
          <ImportFineRules teamId={teamId} actorId={actorId} />
        )} */}
        {activeTab === "season" && showSeason && (
          <SeasonManagement teamId={teamId} actorId={actorId} />
        )}
        {activeTab === "members" && showMembers && (
          <MemberManagement teamId={teamId} actorId={actorId} />
        )}
        {activeTab === "config" && showSeason && (
          <TeamConfiguration teamId={teamId} />
        )}
      </div>
    </div>
  );
}
