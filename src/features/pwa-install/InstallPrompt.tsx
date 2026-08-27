// Feature: PWA Install Prompt (F025)
// Installation banner for first-time visitors

import { useState } from "react";
import { usePWAInstall } from "./usePWAInstall";
import "./pwa-install.css";

export default function InstallPrompt() {
  const { isInstalled, platform, canInstall, promptInstall, isDismissed, dismissPrompt } =
    usePWAInstall();
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show if already installed or dismissed
  if (isInstalled || isDismissed) {
    return null;
  }

  // Don't show on desktop (app is mobile-first)
  if (platform === "other") {
    return null;
  }

  async function handleInstallClick(): Promise<void> {
    await promptInstall();
  }

  function handleDismiss(): void {
    dismissPrompt();
  }

  return (
    <div className="install-prompt">
      <div className="install-prompt__content">
        <p className="install-prompt__title">Installer appen for bedre oplevelse</p>

        {canInstall ? (
          // Android: native install button
          <div className="install-prompt__actions">
            <button
              type="button"
              onClick={() => {
                void handleInstallClick();
              }}
              className="install-prompt__button install-prompt__button--primary"
            >
              Installer
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="install-prompt__button install-prompt__button--secondary"
            >
              Senere
            </button>
          </div>
        ) : (
          // iOS/other: manual instructions
          <div className="install-prompt__manual">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="install-prompt__accordion"
              aria-expanded={isExpanded}
            >
              <span>Sådan installerer du</span>
              <span className="install-prompt__accordion-icon">
                {isExpanded ? "−" : "+"}
              </span>
            </button>

            {isExpanded && (
              <div className="install-prompt__instructions">
                <ol className="install-prompt__steps">
                  <li>Tryk på de 3 små prikker ...  nederst i browseren</li>
                  <li>Tryk på "Del"</li>
                  <li>Scroll ned og vælg "Føj til hjemmeskærm"</li>
                  <li>Tryk "Tilføj" øverst til højre</li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className="install-prompt__button install-prompt__button--secondary mt-3"
            >
              Luk
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
