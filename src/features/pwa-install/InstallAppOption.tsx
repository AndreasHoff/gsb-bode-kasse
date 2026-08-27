// Feature: PWA Install Prompt (F025)
// Install option for Profile screen

import { useState } from "react";
import { usePWAInstall } from "./usePWAInstall";
import "./pwa-install.css";

export default function InstallAppOption() {
  const { isInstalled, platform, canInstall, promptInstall } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // Don't show on desktop
  if (platform === "other") {
    return null;
  }

  async function handleInstallClick(): Promise<void> {
    if (canInstall) {
      await promptInstall();
      setShowModal(false);
    } else {
      setShowModal(true);
    }
  }

  function handleCloseModal(): void {
    setShowModal(false);
  }

  return (
    <>
      <div
        className="install-app-option"
        onClick={() => {
          void handleInstallClick();
        }}
      >
        <div className="install-app-option__header">
          <div className="install-app-option__icon">📱</div>
          <div className="install-app-option__text">
            <div className="install-app-option__title">Installer app</div>
            <div className="install-app-option__subtitle">
              Få hurtig adgang fra din hjemmeskærm
            </div>
          </div>
          <div className="install-app-option__chevron">›</div>
        </div>
      </div>

      {showModal && (
        <div
          className="install-modal-overlay"
          onClick={handleCloseModal}
        >
          <div
            className="install-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="install-modal__header">
              <h3 className="install-modal__title">Installer app</h3>
              <button
                type="button"
                className="install-modal__close"
                onClick={handleCloseModal}
                aria-label="Luk"
              >
                ×
              </button>
            </div>

            <div className="install-modal__content">
              <div className="install-modal__platform">
                {platform === "ios" ? "iOS Safari" : "Browser"}
              </div>

              <ol className="install-modal__steps">
                <li>Tryk på del-knappen (⬆️) nederst i browseren</li>
                <li>Scroll ned og vælg "Føj til hjemmeskærm"</li>
                <li>Tryk "Tilføj" øverst til højre</li>
              </ol>

              <div className="install-modal__actions">
                <button
                  type="button"
                  className="install-modal__button install-modal__button--secondary"
                  onClick={handleCloseModal}
                >
                  Luk
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
