import { useState } from "react";
import TeamOverview from "./features/overview/TeamOverview";
import PersonalOverview from "./features/personal/PersonalOverview";
import AssignFine from "./features/fines/AssignFine";
import ActivityLog from "./features/activity/ActivityLog";
import "./index.css";

type Tab = "overview" | "personal" | "assign" | "activity";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === "overview" && <TeamOverview />}
        {activeTab === "personal" && <PersonalOverview />}
        {activeTab === "assign" && <AssignFine />}
        {activeTab === "activity" && <ActivityLog />}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 flex">
        <NavButton label="Hold" emoji="🏆" active={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
        <NavButton label="Mine" emoji="👤" active={activeTab === "personal"} onClick={() => setActiveTab("personal")} />
        <NavButton label="Giv bøde" emoji="🎯" active={activeTab === "assign"} onClick={() => setActiveTab("assign")} />
        <NavButton label="Aktivitet" emoji="📋" active={activeTab === "activity"} onClick={() => setActiveTab("activity")} />
      </nav>
    </div>
  );
}

function NavButton({
  label,
  emoji,
  active,
  onClick,
}: {
  label: string;
  emoji: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center py-2 text-xs gap-0.5 transition-colors ${
        active ? "text-indigo-600 font-semibold" : "text-gray-400"
      }`}
    >
      <span className="text-xl">{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

export default App;
