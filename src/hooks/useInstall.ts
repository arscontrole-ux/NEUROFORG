import { useCallback, useEffect, useRef, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface InstallInfo {
  /** le navigateur expose beforeinstallprompt (Chromium) */
  supported: boolean;
  /** prompt natif capturé et pas encore installé */
  canInstall: boolean;
  /** tourne déjà en mode application (standalone) */
  installed: boolean;
  /** prompt() en cours */
  prompting: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isMac: boolean;
  /** lance l'installation native ; "unavailable" si le navigateur ne le permet pas */
  install: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

function detectPlatforms() {
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return {
    isIOS,
    isAndroid: /Android/i.test(ua),
    isMac: /Mac/i.test(ua) && !isIOS,
  };
}

export function useInstall(): InstallInfo {
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [supported, setSupported] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [prompting, setPrompting] = useState(false);
  const [installed, setInstalled] = useState(
    () => window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
  );
  const platforms = useRef(detectPlatforms());

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as BeforeInstallPromptEvent;
      setSupported(true);
      setCanInstall(true);
    };
    const onInstalled = () => {
      promptRef.current = null;
      setCanInstall(false);
      setInstalled(true);
    };
    const mq = window.matchMedia("(display-mode: standalone)");
    const onModeChange = (e: MediaQueryListEvent) => setInstalled(e.matches);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    mq.addEventListener("change", onModeChange);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      mq.removeEventListener("change", onModeChange);
    };
  }, []);

  const install = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    const evt = promptRef.current;
    if (!evt) return "unavailable";
    setPrompting(true);
    try {
      await evt.prompt();
      const choice = await evt.userChoice;
      if (choice.outcome === "accepted") {
        promptRef.current = null;
        setCanInstall(false);
        setInstalled(true);
      }
      return choice.outcome;
    } catch {
      return "unavailable";
    } finally {
      setPrompting(false);
    }
  }, []);

  return {
    supported,
    canInstall,
    installed,
    prompting,
    isIOS: platforms.current.isIOS,
    isAndroid: platforms.current.isAndroid,
    isMac: platforms.current.isMac,
    install,
  };
}
