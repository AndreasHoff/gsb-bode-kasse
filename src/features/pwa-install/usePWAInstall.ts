// Feature: PWA Install Prompt (F025)
// Hook for PWA installation detection and platform-specific handling

import { useEffect, useState } from "react";

type Platform = "android" | "ios" | "other";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface PWAInstallState {
  isInstalled: boolean;
  platform: Platform;
  canInstall: boolean;
  promptInstall: () => Promise<void>;
  isDismissed: boolean;
  dismissPrompt: () => void;
}

const DISMISSAL_KEY = "gsb:pwa-install-dismissed";

/**
 * Detects if the app is running as an installed PWA.
 */
function detectInstalled(): boolean {
  // Check display-mode media query
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }

  // iOS Safari standalone mode
  if ((window.navigator as { standalone?: boolean }).standalone === true) {
    return true;
  }

  return false;
}

/**
 * Detects the user's platform.
 */
function detectPlatform(): Platform {
  const ua = window.navigator.userAgent.toLowerCase();

  if (/android/.test(ua)) {
    return "android";
  }

  if (/iphone|ipad|ipod/.test(ua)) {
    return "ios";
  }

  return "other";
}

/**
 * Hook for managing PWA installation state and prompts.
 */
export function usePWAInstall(): PWAInstallState {
  const [isInstalled] = useState(() => detectInstalled());
  const [platform] = useState(() => detectPlatform());
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(() => {
    const stored = window.localStorage.getItem(DISMISSAL_KEY);
    return stored === "true";
  });

  useEffect(() => {
    // Listen for the beforeinstallprompt event (Android/Chrome)
    function handleBeforeInstallPrompt(event: Event): void {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  async function promptInstall(): Promise<void> {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }

  function dismissPrompt(): void {
    window.localStorage.setItem(DISMISSAL_KEY, "true");
    setIsDismissed(true);
  }

  const canInstall = platform === "android" && deferredPrompt !== null;

  return {
    isInstalled,
    platform,
    canInstall,
    promptInstall,
    isDismissed,
    dismissPrompt,
  };
}
