import { useState } from "react";
import ProposalList from "./ProposalList";
import ProposalForm from "./ProposalForm";
import ProposalDetail from "./ProposalDetail";

type View =
  | { screen: "list" }
  | { screen: "detail"; proposalId: string }
  | { screen: "form"; proposalId?: string };

export default function Proposals() {
  const [view, setView] = useState<View>({ screen: "list" });

  if (view.screen === "form") {
    return (
      <ProposalForm
        proposalId={view.proposalId}
        onSave={(id) => setView({ screen: "detail", proposalId: id })}
        onCancel={() =>
          setView(
            view.proposalId !== undefined
              ? { screen: "detail", proposalId: view.proposalId }
              : { screen: "list" },
          )
        }
      />
    );
  }

  if (view.screen === "detail") {
    return (
      <ProposalDetail
        proposalId={view.proposalId}
        onEdit={(id) => setView({ screen: "form", proposalId: id })}
        onBack={() => setView({ screen: "list" })}
      />
    );
  }

  return (
    <ProposalList
      onNew={() => setView({ screen: "form" })}
      onSelect={(id) => setView({ screen: "detail", proposalId: id })}
    />
  );
}
