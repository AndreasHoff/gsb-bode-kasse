import { useEffect, useMemo, useRef, useState } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import TeamOverview from "./features/overview/TeamOverview";
import PersonalOverview from "./features/personal/PersonalOverview";
import AssignFine from "./features/fines/AssignFine";
import ActivityLog from "./features/activity/ActivityLog";
import WelcomeAuth from "./features/auth/WelcomeAuth";
import Proposals from "./features/proposals/Proposals";
import {
  onAuthChange,
  registerWithEmail,
  signInWithEmail,
  signOut,
} from "./lib/auth";
import {
  ensureUserProfile,
  getActiveMembershipsForUser,
  getTeam,
} from "./lib/firestore";
import "./index.css";

type Tab = "overview" | "personal" | "assign" | "activity" | "proposals";
type AppStatus = "checking" | "signed-out" | "ready" | "no-membership";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [status, setStatus] = useState<AppStatus>("checking");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  // Holds the name entered during registration so syncUserSession can use it
  // before Firebase Auth's onAuthStateChanged fires (before updateProfile runs).
  const pendingNameRef = useRef<string | null>(null);

  const isAuthLoading = status === "checking" || isSubmittingAuth;

  useEffect(() => {
    let isAlive = true;

    const unsubscribe = onAuthChange((user) => {
      void syncUserSession(user);
    });

    async function syncUserSession(user: FirebaseUser | null): Promise<void> {
      if (!isAlive) {
        return;
      }

      setAuthError(null);

      if (!user) {
        setStatus("signed-out");
        setDisplayName("");
        setTeamName("");
        setIsSuperAdmin(false);
        return;
      }

      setStatus("checking");

      try {
        const resolvedName =
          pendingNameRef.current ||
          user.displayName?.trim() ||
          user.email ||
          "Spiller";
        const userProfile = await ensureUserProfile({
          id: user.uid,
          name: resolvedName,
          email: user.email || "ukendt@bruger.local",
          avatarUrl: user.photoURL || undefined,
        });
        const superAdmin = userProfile.isSuperAdmin === true;
        setIsSuperAdmin(superAdmin);

        const memberships = await getActiveMembershipsForUser(user.uid);

        if (memberships.length === 0) {
          setDisplayName(userProfile.name);
          setTeamName("");
          // Super-admins can access the app (proposals) without a team membership
          setStatus(superAdmin ? "ready" : "no-membership");
          return;
        }

        const primaryMembership = memberships[0];
        const team = await getTeam(primaryMembership.teamId);

        setDisplayName(userProfile.name);
        setTeamName(team?.name || "Mit hold");
        setStatus("ready");
      } catch (error) {
        setAuthError(toFriendlyErrorMessage(error));
        setStatus("signed-out");
      }
    }

    return () => {
      isAlive = false;
      unsubscribe();
    };
  }, []);

  const headerTitle = useMemo(() => {
    if (teamName.trim().length > 0) {
      return teamName;
    }

    return "GSB Bødekasse";
  }, [teamName]);

  async function handleLoginWithEmail(
    email: string,
    password: string,
  ): Promise<void> {
    setIsSubmittingAuth(true);
    setAuthError(null);

    try {
      await signInWithEmail(email, password);
    } catch (error) {
      setAuthError(toFriendlyErrorMessage(error));
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  async function handleRegisterWithEmail(
    name: string,
    email: string,
    password: string,
  ): Promise<void> {
    setIsSubmittingAuth(true);
    setAuthError(null);

    pendingNameRef.current = name.trim();
    try {
      await registerWithEmail(name, email, password);
    } catch (error) {
      setAuthError(toFriendlyErrorMessage(error));
    } finally {
      pendingNameRef.current = null;
      setIsSubmittingAuth(false);
    }
  }

  async function handleSignOut(): Promise<void> {
    await signOut();
  }

  if (status === "signed-out") {
    return (
      <WelcomeAuth
        isLoading={isAuthLoading}
        errorMessage={authError}
        onLogin={handleLoginWithEmail}
        onRegister={handleRegisterWithEmail}
      />
    );
  }

  if (status === "checking") {
    return (
      <div className="app-screen app-screen--center">
        <p className="status-note">Henter konto...</p>
      </div>
    );
  }

  if (status === "no-membership") {
    return (
      <div className="app-screen">
        <h1 className="app-title">Hej {displayName}</h1>
        <p className="app-subtitle mt-3">
          Din konto er oprettet, men du har endnu ikke et aktivt holdmedlemskab.
        </p>
        <p className="app-subtitle mt-2">
          Kontakt en admin i dit hold for at blive tilføjet.
        </p>
        <button
          type="button"
          onClick={() => {
            void handleSignOut();
          }}
          className="btn-primary mt-6 w-full"
        >
          Log ud
        </button>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="flex items-center justify-between">
          <div>
            <p className="app-title app-title--compact">{headerTitle}</p>
            <p className="app-subtitle text-xs">{displayName}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              void handleSignOut();
            }}
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            Log ud
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === "overview" && <TeamOverview />}
        {activeTab === "personal" && <PersonalOverview />}
        {activeTab === "assign" && <AssignFine />}
        {activeTab === "activity" && <ActivityLog />}
        {activeTab === "proposals" && <Proposals />}
      </main>

      {/* Bottom navigation */}
      <nav className="app-nav">
        <NavButton label="Hold" emoji="🏆" active={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
        <NavButton label="Mine" emoji="👤" active={activeTab === "personal"} onClick={() => setActiveTab("personal")} />
        <NavButton label="Giv bøde" emoji="🎯" active={activeTab === "assign"} onClick={() => setActiveTab("assign")} />
        <NavButton label="Aktivitet" emoji="📋" active={activeTab === "activity"} onClick={() => setActiveTab("activity")} />
        {isSuperAdmin && (
          <NavButton label="Idéforslag" emoji="💡" active={activeTab === "proposals"} onClick={() => setActiveTab("proposals")} />
        )}
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
      className={`app-nav__button ${
        active ? "app-nav__button--active" : ""
      }`}
    >
      <span className="text-xl">{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

export default App;

function toFriendlyErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Der opstod en ukendt fejl. Prøv igen.";
  }

  if (error.message.includes("auth/invalid-credential")) {
    return "Forkert e-mail eller adgangskode.";
  }

  if (error.message.includes("auth/email-already-in-use")) {
    return "E-mailen er allerede i brug.";
  }

  if (error.message.includes("auth/weak-password")) {
    return "Adgangskoden er for svag. Brug mindst 6 tegn.";
  }

  if (error.message.includes("auth/popup-closed-by-user")) {
    return "Loginvinduet blev lukket før login blev gennemført.";
  }

  return "Noget gik galt under login. Prøv igen.";
}
