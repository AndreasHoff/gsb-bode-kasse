import { useMemo, useState } from "react";
import "./auth.css";

type AuthMode = "login" | "register";

interface WelcomeAuthProps {
  isLoading: boolean;
  errorMessage: string | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
}

function WelcomeAuth({
  isLoading,
  errorMessage,
  onLogin,
  onRegister,
}: WelcomeAuthProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const submitLabel = useMemo(() => {
    return mode === "login" ? "Log ind" : "Opret konto";
  }, [mode]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (mode === "register") {
      if (name.trim().length < 2) {
        setLocalError("Navn skal være mindst 2 tegn.");
        return;
      }

      if (password.length < 6) {
        setLocalError("Adgangskode skal være mindst 6 tegn.");
        return;
      }

      if (password !== confirmPassword) {
        setLocalError("Adgangskoderne matcher ikke.");
        return;
      }

      await onRegister(name.trim(), email.trim(), password);
      return;
    }

    await onLogin(email.trim(), password);
  }

  return (
    <section className="auth-shell">
      <div className="auth-shell__orb auth-shell__orb--left" />
      <div className="auth-shell__orb auth-shell__orb--right" />

      <div className="auth-shell__content">
        <header className="mb-8">
          <h1 className="app-title auth-title mt-3">Velkommen til holdets bødekasse</h1>
        </header>

        <div className="segment mb-4 text-sm">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`segment__button ${
              mode === "login" ? "segment__button--active" : ""
            }`}
          >
            Log ind
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`segment__button ${
              mode === "register" ? "segment__button--active" : ""
            }`}
          >
            Opret konto
          </button>
        </div>

        <form
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
          className="auth-panel"
        >
          <div className="space-y-3">
            {mode === "register" && (
              <label className="field">
                <span className="field__label">Navn</span>
                <input
                  className="field__input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  required
                />
              </label>
            )}

            <label className="field">
              <span className="field__label">E-mail</span>
              <input
                type="email"
                className="field__input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className="field">
              <span className="field__label">Adgangskode</span>
              <input
                type="password"
                className="field__input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
            </label>

            {mode === "register" && (
              <label className="field">
                <span className="field__label">Gentag adgangskode</span>
                <input
                  type="password"
                  className="field__input"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </label>
            )}
          </div>

          {(localError || errorMessage) && (
            <p className="status-error mt-3">{localError ?? errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary mt-4 w-full text-sm disabled:opacity-50"
          >
            {isLoading ? "Vent..." : submitLabel}
          </button>
        </form>
      </div>
    </section>
  );
}

export default WelcomeAuth;