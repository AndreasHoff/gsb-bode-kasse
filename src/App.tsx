import { useEffect, useMemo, useRef, useState } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import patchNotesMarkdown from "../docs/PATCH_NOTES.md?raw";
import TeamOverview from "./features/overview/TeamOverview";
import PersonalOverview from "./features/personal/PersonalOverview";
import FineRulesCatalog from "./features/fine-rules/FineRulesCatalog";
import ActivityLog from "./features/activity/ActivityLog";
import WelcomeAuth from "./features/auth/WelcomeAuth";
import Proposals from "./features/proposals/Proposals";
import BottomNavbar from "./components/BottomNavbar";
import {
  ensurePersistentAuth,
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
import type { Role } from "./types/domain";
import "./index.css";

type Tab =
  | "overview"
  | "personal"
  | "fine-rules"
  | "activity"
  | "proposals"
  | "settings";
type AppStatus = "checking" | "signed-out" | "ready" | "no-membership";
type ColorTheme = "green" | "violet";

const THEME_STORAGE_KEY = "gsb-color-theme";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [status, setStatus] = useState<AppStatus>("checking");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [userId, setUserId] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => getInitialTheme());
  // Holds the name entered during registration so syncUserSession can use it
  // before Firebase Auth's onAuthStateChanged fires (before updateProfile runs).
  const pendingNameRef = useRef<string | null>(null);

  const isAuthLoading = status === "checking" || isSubmittingAuth;

  useEffect(() => {
    let isAlive = true;
    let unsubscribe: (() => void) | null = null;

    void setupAuthListener();

    async function setupAuthListener(): Promise<void> {
      try {
        await ensurePersistentAuth();
      } catch {
        // Continue with default persistence if local persistence is unavailable.
      }

      if (!isAlive) {
        return;
      }

      unsubscribe = onAuthChange((user) => {
        void syncUserSession(user);
      });
    }

    async function syncUserSession(user: FirebaseUser | null): Promise<void> {
      if (!isAlive) {
        return;
      }

      setAuthError(null);

      if (!user) {
        setStatus("signed-out");
        setDisplayName("");
        setTeamName("");
        setTeamId("");
        setUserRole(null);
        setUserId("");
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
          setTeamId("");
          setUserRole(null);
          setUserId(user.uid);
          // Super-admins can access the app (proposals) without a team membership
          setStatus(superAdmin ? "ready" : "no-membership");
          return;
        }

        const primaryMembership = memberships[0];
        const team = await getTeam(primaryMembership.teamId);

        setUserId(user.uid);
        setTeamId(primaryMembership.teamId);
        setUserRole(primaryMembership.role);
        setDisplayName(userProfile.name);
        setTeamName(team?.name || "Mit hold");
        setStatus("ready");
      } catch (error) {
        console.error("[auth] Session sync failed", error);
        setAuthError(toFriendlyErrorMessage(error));
        setStatus("signed-out");
      }
    }

    return () => {
      isAlive = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", colorTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, colorTheme);
  }, [colorTheme]);

  const headerTitle = useMemo(() => {
    if (teamName.trim().length > 0) {
      return teamName;
    }

    return "GSB Bødekasse";
  }, [teamName]);
  const appVersion = getCurrentVersionFromPatchNotes(patchNotesMarkdown);

  async function handleLoginWithEmail(
    email: string,
    password: string,
  ): Promise<void> {
    setIsSubmittingAuth(true);
    setAuthError(null);

    try {
      await signInWithEmail(email, password);
    } catch (error) {
      console.error("[auth] Login failed", error);
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
      console.error("[auth] Registration failed", error);
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

  const primaryMenuItems: Array<{ tab: Tab; label: string; emoji: string }> = [
    { tab: "overview", label: "Hold", emoji: "🏆" },
    { tab: "personal", label: "Mine", emoji: "👤" },
    { tab: "fine-rules", label: "Bøder", emoji: "📋" },
    { tab: "activity", label: "Aktivitet", emoji: "📊" },
  ];
  const menuItems = [...primaryMenuItems];

  if (isSuperAdmin) {
    menuItems.push(
      { tab: "proposals", label: "Idéforslag", emoji: "💡" },
      { tab: "settings", label: "Indstillinger", emoji: "⚙️" },
    );
  }

  return (
    <div className="app-shell">
      {isSideMenuOpen && (
        <button
          type="button"
          className="app-menu-backdrop"
          aria-label="Luk sidemenu"
          onClick={() => setIsSideMenuOpen(false)}
        />
      )}
      {isSideMenuOpen && (
        <aside id="app-side-menu" className="app-side-menu app-side-menu--open">
          <div className="app-side-menu__header">
            <p className="app-title app-title--compact">Menu</p>
            <p className="app-subtitle text-xs">{headerTitle}</p>
          </div>
          <nav className="app-side-menu__nav">
            {menuItems.map((item) => (
              <button
                key={item.tab}
                type="button"
                onClick={() => {
                  setActiveTab(item.tab);
                  setIsSideMenuOpen(false);
                }}
                className={`app-side-menu__button ${
                  activeTab === item.tab ? "app-side-menu__button--active" : ""
                }`}
              >
                <span>{item.emoji}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>
      )}
      <header className="app-header">
        <div className="app-navbar">
          <button
            type="button"
            onClick={() => setIsSideMenuOpen((open) => !open)}
            className="app-navbar__burger"
            aria-controls="app-side-menu"
            aria-expanded={isSideMenuOpen}
            aria-label={isSideMenuOpen ? "Luk menu" : "Åbn menu"}
          >
            ☰
          </button>
          <div className="app-navbar__brand">
            <p className="app-title app-title--compact">GSB Bødekasse</p>
            <p className="app-subtitle text-xs">{appVersion}</p>
          </div>
          <div className="app-navbar__user">
            <button
              type="button"
              onClick={() =>
                setColorTheme((current) =>
                  current === "green" ? "violet" : "green",
                )
              }
              className="app-navbar__theme-toggle"
              aria-label={
                colorTheme === "green"
                  ? "Skift til violet tema"
                  : "Skift til grønt tema"
              }
              title={
                colorTheme === "green"
                  ? "Skift til violet tema"
                  : "Skift til grønt tema"
              }
            >
              🎨
            </button>
            <p className="app-subtitle app-navbar__user-name">{displayName}</p>
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
        </div>
      </header>

      {/* Page content */}
      <main className="app-main">
        {activeTab === "overview" && <TeamOverview />}
        {activeTab === "personal" && <PersonalOverview />}
        {activeTab === "fine-rules" && (
          <FineRulesCatalog teamId={teamId} userRole={userRole} userId={userId} />
        )}
        {activeTab === "activity" && <ActivityLog />}
        {activeTab === "proposals" && <Proposals />}
        {activeTab === "settings" && <SettingsPlaceholder />}
      </main>
      <BottomNavbar
        items={primaryMenuItems}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}

function SettingsPlaceholder() {
  return (
    <div className="app-page">
      <h1 className="app-title">Indstillinger</h1>
      <p className="app-subtitle mb-6">Flere admin-funktioner kommer snart.</p>
      <div className="empty-state">
        <p className="text-4xl mb-3">⚙️</p>
        <p className="text-sm">Denne sektion udbygges løbende.</p>
      </div>
    </div>
  );
}

export default App;

function getCurrentVersionFromPatchNotes(patchNotes: string): string {
  const latestVersionMatch = patchNotes.match(/^##\s+(v\d+\.\d+\.\d+)/m);
  if (!latestVersionMatch) {
    return "v0.0.0";
  }

  return latestVersionMatch[1];
}

function getInitialTheme(): ColorTheme {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === "violet" ? "violet" : "green";
}

function toFriendlyErrorMessage(error: unknown): string {
  const errorCode = getErrorCode(error);
  const errorMessage = error instanceof Error ? error.message : "Ukendt fejl";

  if (errorCode === "auth/invalid-credential") {
    return "Forkert e-mail eller adgangskode.";
  }

  if (errorCode === "auth/email-already-in-use") {
    return "E-mailen er allerede i brug.";
  }

  if (errorCode === "auth/weak-password") {
    return "Adgangskoden er for svag. Brug mindst 6 tegn.";
  }

  if (errorCode === "auth/popup-closed-by-user") {
    return "Loginvinduet blev lukket før login blev gennemført.";
  }

  if (errorCode === "auth/too-many-requests") {
    return "For mange loginforsøg. Prøv igen om lidt.";
  }

  if (errorCode === "auth/network-request-failed") {
    return "Netværksfejl under login. Tjek forbindelse og prøv igen.";
  }

  if (errorCode === "auth/invalid-email") {
    return "E-mailadressen er ugyldig.";
  }

  if (errorCode === "permission-denied") {
    return "Adgang nægtet af Firestore-regler (permission-denied).";
  }

  if (errorCode === "failed-precondition") {
    return "Mangler backend-konfiguration (failed-precondition), fx Firestore index.";
  }

  if (errorCode) {
    return `Loginfejl (${errorCode}): ${errorMessage}`;
  }

  return `Loginfejl: ${errorMessage}`;
}

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === "string" ? maybeCode : null;
}
